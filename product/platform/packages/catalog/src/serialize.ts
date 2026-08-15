import { promisify } from 'node:util';
import { gunzip, gzip } from 'node:zlib';

import type { SelectionCandidate } from '@platform/domain';

/**
 * The wire format of a published selection index.
 *
 * A serving function fetches this once per cold start and holds it in module scope, so the format
 * has two jobs: be small, and be byte-stable. Small because it is on the critical path of the first
 * request a container ever handles. Byte-stable because the snapshot record stores a checksum of
 * exactly these bytes, and a format that re-encoded the same items differently on two runs would
 * make that checksum meaningless and make "publishing unchanged input produces no new snapshot"
 * (spec §10) impossible to honour.
 *
 * Node's gzip writes a zero MTIME into the header, so at a fixed compression level the output is a
 * pure function of the input. That is what makes the checksum a statement about content.
 */

const compress = promisify(gzip);
const decompress = promisify(gunzip);

/**
 * Bumped when the envelope's shape changes, not when the item shape does.
 *
 * A reader that meets a version it does not know refuses the blob rather than guessing, because a
 * partially understood index would silently narrow which items a child can be served.
 */
export const SELECTION_INDEX_VERSION = 1;

/**
 * Maximum compression.
 *
 * Publishing happens once and is not latency-sensitive; every cold start afterwards pays for the
 * bytes. Fixed rather than left at the default so the level is part of the format and the checksum
 * cannot change because a zlib default moved.
 */
const GZIP_LEVEL = 9;

interface SelectionIndexEnvelope {
  readonly snapshotId: string;
  readonly version: number;
  readonly items: readonly SelectionCandidate[];
}

export async function serializeSelectionIndex(
  items: readonly SelectionCandidate[],
  snapshotId: string,
): Promise<Buffer> {
  const envelope: SelectionIndexEnvelope = {
    snapshotId,
    version: SELECTION_INDEX_VERSION,
    items,
  };
  return compress(Buffer.from(JSON.stringify(envelope), 'utf8'), { level: GZIP_LEVEL });
}

/**
 * Read a published index back.
 *
 * The envelope is checked and the items are not. Validating 4,534 records field by field on every
 * cold start would cost more than it buys against a blob that only the publish path can write into a
 * bucket that blocks public access — the trust here is in the write boundary, not in the parse. The
 * honest consequence is that a corrupt-but-parseable blob surfaces later, as a selection failure
 * rather than as a load failure.
 */
export async function deserializeSelectionIndex(
  buf: Buffer,
): Promise<{ snapshotId: string; items: readonly SelectionCandidate[] }> {
  const json = (await decompress(buf)).toString('utf8');
  const envelope = JSON.parse(json) as Partial<SelectionIndexEnvelope>;

  if (envelope.version !== SELECTION_INDEX_VERSION) {
    throw new Error(
      `selection index version ${String(envelope.version)} is not supported; expected ${SELECTION_INDEX_VERSION}`,
    );
  }
  if (typeof envelope.snapshotId !== 'string' || !Array.isArray(envelope.items)) {
    throw new Error('selection index envelope is missing snapshotId or items');
  }

  return { snapshotId: envelope.snapshotId, items: envelope.items };
}
