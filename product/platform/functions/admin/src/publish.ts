import { createHash } from 'node:crypto';
import { compileCatalog, serializeSelectionIndex } from '@platform/catalog';
import type { SnapshotRecord } from '@platform/domain';
import type { Deps } from '@platform/shared';

/**
 * Publishing a catalog.
 *
 * Idempotent by construction rather than by checking: type records are write-once so a republish
 * skips them, and an item is only revised when its parameters actually differ. Running this twice on
 * unchanged banks produces no new revisions.
 *
 * The snapshot is written to S3 last. If anything above fails, the registry may hold new rows but no
 * snapshot references them, and no session can be pinned to a half-written catalog.
 */

export interface PublishResult {
  readonly snapshotId: string;
  readonly typesWritten: number;
  readonly typesSkipped: number;
  readonly itemsWritten: number;
  readonly itemsRevised: number;
  readonly answerKeysWritten: number;
  readonly selectionIndexBytes: number;
  readonly stats: Record<string, unknown>;
}

export interface PublishOptions {
  readonly publishedBy: string;
  readonly notes?: string;
  readonly bankDir?: string;
  readonly putObject: (key: string, body: Buffer) => Promise<void>;
  readonly now?: Date;
}

function snapshotIdFor(now: Date, sequence: number): string {
  const day = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `snap-${day}-${String(sequence).padStart(3, '0')}`;
}

/** Monotonic within a day, so `latestSnapshot` can order lexicographically. */
async function nextSnapshotId(d: Deps, now: Date): Promise<string> {
  for (let sequence = 1; sequence < 1000; sequence += 1) {
    const candidate = snapshotIdFor(now, sequence);
    if (!(await d.store.getSnapshot(candidate))) return candidate;
  }
  throw new Error('a thousand snapshots in one day is not a publish, it is a loop');
}

export async function publishCatalog(d: Deps, options: PublishOptions): Promise<PublishResult> {
  const now = options.now ?? new Date();
  const snapshotId = await nextSnapshotId(d, now);

  const compiled = compileCatalog({
    snapshotId,
    ...(options.bankDir ? { bankDir: options.bankDir } : {}),
    createdAt: now.toISOString(),
  });

  let typesWritten = 0;
  let typesSkipped = 0;
  for (const type of compiled.types) {
    if (await d.store.getType(type.typeCode)) {
      // Write-once. A change to a type is a new version, never an edit to this row.
      typesSkipped += 1;
      continue;
    }
    await d.store.putType(type);
    await d.store.appendLifecycle(type.typeCode, 'active', now.toISOString(), 'first publish');
    typesWritten += 1;
  }

  let itemsWritten = 0;
  let itemsRevised = 0;
  for (const item of compiled.items) {
    const existing = await d.store.getItem(item.typeCode, item.itemId);
    if (!existing) {
      await d.store.putItem(item);
      itemsWritten += 1;
      continue;
    }
    const changed =
      existing.difficulty !== item.difficulty ||
      existing.params.b !== item.params.b ||
      existing.params.a !== item.params.a ||
      existing.params.c !== item.params.c;
    if (changed) {
      await d.store.reviseItem(
        item.typeCode,
        item.itemId,
        { difficulty: item.difficulty, params: item.params },
        `republish ${snapshotId}`,
      );
      itemsRevised += 1;
    }
  }

  for (const key of compiled.answerKeys) {
    await d.answerKeys.put(key);
  }

  const body = await serializeSelectionIndex(compiled.selectionIndex, snapshotId);
  const s3Key = `snapshots/${snapshotId}.json.gz`;
  await options.putObject(s3Key, body);

  const snapshot: SnapshotRecord = {
    snapshotId,
    createdAt: now.toISOString(),
    itemCount: compiled.selectionIndex.length,
    typeCount: compiled.types.length,
    s3Key,
    checksum: createHash('sha256').update(body).digest('hex'),
    publishedBy: options.publishedBy,
    notes: options.notes ?? '',
  };
  await d.store.putSnapshot(snapshot);

  return {
    snapshotId,
    typesWritten,
    typesSkipped,
    itemsWritten,
    itemsRevised,
    answerKeysWritten: compiled.answerKeys.length,
    selectionIndexBytes: body.length,
    stats: { ...compiled.stats },
  };
}
