import type { ExamItem } from '@gt-selection/contracts';

import { itemInformation } from './irt';
import { hashSeed, mulberry32 } from './rng';

/**
 * Item selection (AX-02): Maximum Fisher Information at the current theta with
 * randomesque exposure control (pick uniformly among the top-K by information),
 * seeded for reproducibility when recomputed from stored responses.
 */

export interface SelectOptions {
  topK: number;
  /** Deterministic seed, e.g. `${sessionId}:${domain}:${itemsAnswered}`. */
  seed: string;
}

export function selectByMaxInformation(
  theta: number,
  candidates: readonly ExamItem[],
  options: SelectOptions,
): ExamItem | null {
  if (candidates.length === 0) return null;
  const ranked = candidates
    .map((item) => ({ item, info: itemInformation(theta, item.irt) }))
    .sort((left, right) => right.info - left.info);
  const k = Math.max(1, Math.min(options.topK, ranked.length));
  const rng = mulberry32(hashSeed(options.seed));
  const index = Math.min(Math.floor(rng() * k), k - 1);
  return ranked[index]!.item;
}
