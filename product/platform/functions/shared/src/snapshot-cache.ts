import { deserializeSelectionIndex } from '@platform/catalog';
import { buildIndex, type SelectionIndex } from '@platform/selection';

/**
 * The published snapshot, held in the execution environment.
 *
 * This cache is the reason selection costs no database reads. A snapshot is immutable by
 * construction, so caching it needs no invalidation strategy: a new publish produces a new snapshot
 * id, and a session pinned to the old one keeps reading the old one. That is what makes the whole
 * design safe to cache aggressively.
 *
 * The map is keyed by snapshot id rather than holding a single entry, because two apps can be pinned
 * to different snapshots and a warm environment serves both. In practice it holds one or two.
 */

const cache = new Map<string, SelectionIndex>();
const inFlight = new Map<string, Promise<SelectionIndex>>();

export type SnapshotFetcher = (bucket: string, key: string) => Promise<Buffer>;

let fetcher: SnapshotFetcher | null = null;

/** Tests and the simulation harness inject a local source rather than reaching for S3. */
export function configureSnapshotSource(source: SnapshotFetcher | null): void {
  fetcher = source;
}

export function clearSnapshotCache(): void {
  cache.clear();
  inFlight.clear();
}

export function cachedSnapshotIds(): readonly string[] {
  return [...cache.keys()];
}

async function fetchFromS3(bucket: string, key: string): Promise<Buffer> {
  // Imported lazily so that a handler which never reads a snapshot does not pay the S3 client's
  // load time at cold start, and so tests that inject a source need no AWS SDK at all.
  const { GetObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
  const client = new S3Client({});
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error(`snapshot ${key} has no body`);
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Load a snapshot, at most once per execution environment per id.
 *
 * Concurrent requests on a cold environment share one download through `inFlight`. Without that, a
 * burst of traffic against a new snapshot would have every concurrent invocation fetch and inflate
 * the same object.
 */
export async function loadSelectionIndex(
  snapshotId: string,
  bucket: string,
  key: string,
): Promise<SelectionIndex> {
  const hit = cache.get(snapshotId);
  if (hit) return hit;

  const pending = inFlight.get(snapshotId);
  if (pending) return pending;

  const load = (async () => {
    const buffer = await (fetcher ?? fetchFromS3)(bucket, key);
    const { snapshotId: found, items } = await deserializeSelectionIndex(buffer);
    if (found !== snapshotId) {
      throw new Error(`snapshot ${key} declares id ${found}, expected ${snapshotId}`);
    }
    const index = buildIndex(found, items);
    cache.set(snapshotId, index);
    return index;
  })().finally(() => {
    inFlight.delete(snapshotId);
  });

  inFlight.set(snapshotId, load);
  return load;
}
