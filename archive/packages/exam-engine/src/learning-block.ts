/**
 * Administering a NOVEL BLOCK: a run of unfamiliar items in ONE area, served at a difficulty that
 * follows the child as they climb, so that a within-session learning rate can be fitted from it.
 *
 * WHY A SEPARATE BLOCK AT ALL. A growth statistic computed over the bracketing trace is not
 * interpretable, and `derive-metrics`' own claim boundary says why: while the estimate is still
 * homing in, the hardest difficulty a child has solved rises as the SEARCH converges, so "the
 * ceiling went up" is produced both by a child learning and by the estimate arriving at a child who
 * was seeded too low. Those two are indistinguishable inside one adaptive stream. The block
 * separates them by construction — it starts only once the area's estimate has settled, so the
 * search has already finished and what remains to move is the child.
 *
 * WHAT THIS MODULE OWNS, AND WHAT IT DOES NOT. Administration only: which unseen item to serve at a
 * requested difficulty, and whether a pool can support a block at all. The projection that decides
 * WHAT difficulty to request is measurement, and lives in `@gt-selection/exam-scoring`
 * (`nextTargetTheta`), as does the fit and the readout. The two packages are intentionally
 * independent (BUILD_PLAN §7), so the target arrives here as a plain number and no dependency is
 * created in either direction; a caller composes the two.
 *
 * Nothing here assumes a two-stage form, a phase ordering, or four areas. A novel block is a run of
 * unfamiliar items with a targeting rule; where it sits in a form is the caller's decision.
 *
 * Pure: no I/O, no framework, no node-only APIs.
 */
import { areaEstimateStable } from './done';
import { hashUnit } from './rng';
import { toServedItem } from './selection';
import type { Area, BankItem, ItemId, ServedItem, SessionState } from './types';

/**
 * Block length the learning-rate fit is sized against.
 *
 * Recovery of an injected climb collapses much faster than linearly as a block shortens — on this
 * scale, simulated recovery runs about r = 0.07 at 8 trials, 0.18 at 15 and 0.45 at 30, with the
 * estimate attenuated to roughly a fifth of its true size at 8 trials. 30 is where the posterior SE
 * stops falling steeply and attenuation disappears, which makes it a floor rather than a
 * comfortable length. See `learning-rate-readout.ts` in `@gt-selection/exam-scoring` for the full
 * table and for what a longer block would buy.
 *
 * ONE area, deeper, rather than four shallower: splitting the same item budget four ways gives four
 * blocks at a length where recovery has already collapsed, so their average is worse than a single
 * deep block bought with half the items.
 */
export const RECOMMENDED_NOVEL_BLOCK_LENGTH = 30;

/** Why a novel block cannot be administered, when it cannot. */
export type BlockUnavailableReason = 'estimate-not-settled' | 'insufficient-novel-items';

export interface BlockReadiness {
  readonly ready: boolean;
  readonly reason: BlockUnavailableReason | null;
  /** Distinct unseen items available in the area. */
  readonly novelCount: number;
}

/**
 * Items in `area` that the child has not already been served.
 *
 * Novelty is the point of the block, not a detail: a re-served item measures recall of that item,
 * and a child who meets a familiar item mid-block produces a jump in the climb that has nothing to
 * do with how fast they learn.
 */
export function novelItems(
  items: readonly BankItem[],
  area: Area,
  state: SessionState,
): BankItem[] {
  const seen = state.areas[area].itemsSeen;
  return items.filter((item) => item.domain === area && !seen.has(item.itemId));
}

/**
 * Whether a pool can support a block of the requested length.
 *
 * Worth checking before starting rather than discovering it at trial 24: a block that runs out of
 * items early yields a rate resting on fewer trials than the design assumed, and at these lengths
 * that difference is most of the signal.
 */
export function poolSupportsBlock(
  pool: readonly BankItem[],
  length: number = RECOMMENDED_NOVEL_BLOCK_LENGTH,
): boolean {
  return new Set(pool.map((item) => item.itemId)).size >= length;
}

/**
 * Whether a novel block can start in `area`.
 *
 * Both conditions are structural. The estimate must have settled, because a block begun mid-search
 * reintroduces the very confound the block exists to remove. And the pool must be deep enough,
 * because a short block cannot be rescued after the fact.
 */
export function blockReadiness(
  items: readonly BankItem[],
  area: Area,
  state: SessionState,
  length: number = RECOMMENDED_NOVEL_BLOCK_LENGTH,
): BlockReadiness {
  const pool = novelItems(items, area, state);
  const novelCount = new Set(pool.map((item) => item.itemId)).size;

  if (!areaEstimateStable(area, state)) {
    return { ready: false, reason: 'estimate-not-settled', novelCount };
  }
  if (novelCount < length) {
    return { ready: false, reason: 'insufficient-novel-items', novelCount };
  }
  return { ready: true, reason: null, novelCount };
}

/**
 * Pick the unadministered item closest to `targetDifficulty`.
 *
 * Under this engine's response model every item shares one design `slope`, and the information a
 * logistic item carries is maximised where its difficulty meets the ability being targeted. With a
 * common slope, therefore, maximum-information selection and nearest-difficulty selection are the
 * SAME rule, and the nearest-difficulty form is the one that can be read off and checked by hand.
 * Once items carry per-item discriminations the two separate and this needs revisiting.
 *
 * Unlike `nextItem`, age band is deliberately NOT a tie-break here. The block is aimed above the
 * child's settled standing on purpose, so preferring grade-band items would pull it back toward the
 * level they have already demonstrated — which is where there is nothing left to learn.
 *
 * Returns `null` when the pool is exhausted. The caller must handle it: a block that ends early is
 * a reportable condition, not an error to swallow.
 */
export function selectNextNovelItem(
  pool: readonly BankItem[],
  administeredIds: readonly ItemId[],
  targetDifficulty: number,
  seed: number,
): ServedItem | null {
  const best = pickNearestNovel(pool, administeredIds, targetDifficulty, seed);
  return best === null ? null : toServedItem(best);
}

/**
 * The same selection rule over an ALREADY-SERVED pool.
 *
 * A browser never holds `BankItem` — it only ever receives `ServedItem` (no answer key), so it
 * cannot call {@link selectNextNovelItem}. Rather than restate the nearest-difficulty rule in the
 * app, where it would drift from the tested one, both entry points share `pickNearestNovel`. The
 * caller is responsible for having already restricted `pool` to the block's area.
 */
export function selectNextNovelServedItem(
  pool: readonly ServedItem[],
  administeredIds: readonly ItemId[],
  targetDifficulty: number,
  seed: number,
): ServedItem | null {
  return pickNearestNovel(pool, administeredIds, targetDifficulty, seed);
}

/** The minimum an item must expose to be ranked; both `BankItem` and `ServedItem` satisfy it. */
interface NovelCandidate {
  readonly itemId: ItemId;
  readonly difficulty: number;
}

function pickNearestNovel<T extends NovelCandidate>(
  pool: readonly T[],
  administeredIds: readonly ItemId[],
  targetDifficulty: number,
  seed: number,
): T | null {
  const seen = new Set(administeredIds);
  let best: T | null = null;

  for (const candidate of pool) {
    if (seen.has(candidate.itemId)) continue;
    if (best === null) {
      best = candidate;
      continue;
    }
    if (novelItemIsBetter(candidate, best, targetDifficulty, seed)) best = candidate;
  }

  return best;
}

/** Nearest difficulty, then the same seeded id tie-break `selection.ts` uses, for replayability. */
function novelItemIsBetter(
  a: NovelCandidate,
  b: NovelCandidate,
  target: number,
  seed: number,
): boolean {
  const aCost = Math.abs(a.difficulty - target);
  const bCost = Math.abs(b.difficulty - target);
  if (aCost !== bCost) return aCost < bCost;

  const aJit = hashUnit(seed, `item:${a.itemId}`);
  const bJit = hashUnit(seed, `item:${b.itemId}`);
  if (aJit !== bJit) return aJit < bJit;

  return a.itemId < b.itemId;
}
