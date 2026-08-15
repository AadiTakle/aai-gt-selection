import type { SelectionCandidate } from '@platform/domain';

/**
 * A published snapshot, held in memory.
 *
 * The whole point of compiling a snapshot is that this fits in a Lambda execution environment: about
 * 550 KB for the 4,534 scorable items, loaded once at cold start and reused. Selection then costs no
 * database reads at all, and only the chosen item's content is fetched.
 */
export interface SelectionIndex {
  readonly snapshotId: string;
  readonly items: readonly SelectionCandidate[];
  readonly byType: ReadonlyMap<string, readonly SelectionCandidate[]>;
}

export function buildIndex(
  snapshotId: string,
  items: readonly SelectionCandidate[],
): SelectionIndex {
  const byType = new Map<string, SelectionCandidate[]>();
  for (const item of items) {
    const bucket = byType.get(item.typeCode);
    if (bucket) bucket.push(item);
    else byType.set(item.typeCode, [item]);
  }
  return { snapshotId, items, byType };
}
