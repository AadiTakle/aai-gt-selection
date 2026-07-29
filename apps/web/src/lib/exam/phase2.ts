/**
 * Phase 2 — the novel learning block, as the app runs it.
 *
 * Phase 1 finds where the child is standing. Phase 2 asks a different question: given a run of
 * genuinely unfamiliar problems pitched just above that level, how quickly do they pick it up?
 *
 * Three properties of this module exist because of how the measurement can fail (BUILD_PLAN §5.5,
 * D-030):
 *
 * 1. **It is a separate, user-started activity.** Phase 1 ends with its own result. The family
 *    chooses when to begin the block, which may be a later sitting entirely — so everything the
 *    block needs to resume (the settled standing level and the set of items already served) is
 *    handed over explicitly rather than held in a live session.
 * 2. **The pool is restricted to items Phase 1 never served.** A repeat item measures recall of
 *    that item, and produces a jump in the climb that has nothing to do with learning.
 * 3. **It refuses to name a band it cannot support.** With no reference distribution for how much
 *    children actually differ in learning pace, the honest answer is "not enough to tell yet", and
 *    that is what this returns. Inventing a comparison would be worse than declining to make one.
 *
 * The selection rule itself is NOT restated here — it is `selectNextNovelServedItem` in
 * `@gt-selection/exam-engine`, so the browser and the engine cannot drift apart.
 */
import {
  RECOMMENDED_NOVEL_BLOCK_LENGTH,
  selectNextNovelServedItem,
  type Area,
  type ServedItem,
} from '@gt-selection/exam-engine';
import {
  estimateLearningCurve,
  learningRateReadout,
  nextTargetTheta,
  type LearningRateBand,
  type LearningRateReference,
  type LearningTrial,
} from '@gt-selection/exam-scoring';

/**
 * The block always runs in the SAME area for every child.
 *
 * Fluid reasoning both has the deepest unseen pool and leans least on taught content, but the
 * decisive reason is comparability: a rate measured in whichever area a given child happened to be
 * strongest in is not comparable to anyone else's.
 */
export const LEARNING_BLOCK_AREA: Area = 'fluid_reasoning';

/**
 * Trials in the block. Configurable so the length can be tuned against session time, but 30 is a
 * floor rather than a comfortable target — recovery collapses well before it (E-073), so shortening
 * this mostly buys a number that is always "not enough to tell".
 */
export const LEARNING_BLOCK_LENGTH = RECOMMENDED_NOVEL_BLOCK_LENGTH;

/**
 * How far above the settled standing level the block aims, in scale points.
 *
 * Aiming AT the standing level would sit the child where they already succeed, and a run with
 * nothing left to learn cannot show learning. One point up is the "hard but reachable" band.
 */
export const LEARNING_BLOCK_TARGET_OFFSET = 1;

const HANDOFF_KEY = 'gt-exam-learning-block';

/**
 * Everything Phase 2 needs to start, captured when Phase 1 finishes.
 *
 * This is what makes a later sitting possible: the block can be rebuilt from the standing level and
 * the served-item set alone, with no live engine session.
 */
export interface LearningBlockHandoff {
  readonly sessionId: string;
  /** Database session id when the run was persisted; null for an unpersisted preview run. */
  readonly examSessionId: string | null;
  readonly gradeBand: string;
  /** The settled standing level for {@link LEARNING_BLOCK_AREA}, on the 1–20 scale. */
  readonly standing: number;
  /** Every item served in Phase 1, so the block can exclude them. */
  readonly seenItemIds: readonly string[];
  readonly finishedAt: string;
  readonly blockLength: number;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function parseHandoff(raw: string | null): LearningBlockHandoff | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LearningBlockHandoff>;
    if (
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.standing !== 'number' ||
      !Number.isFinite(parsed.standing) ||
      !Array.isArray(parsed.seenItemIds)
    ) {
      return null;
    }
    return {
      sessionId: parsed.sessionId,
      examSessionId: typeof parsed.examSessionId === 'string' ? parsed.examSessionId : null,
      gradeBand: typeof parsed.gradeBand === 'string' ? parsed.gradeBand : '4-5',
      standing: parsed.standing,
      seenItemIds: parsed.seenItemIds.filter((id): id is string => typeof id === 'string'),
      finishedAt: typeof parsed.finishedAt === 'string' ? parsed.finishedAt : '',
      blockLength:
        typeof parsed.blockLength === 'number' && Number.isFinite(parsed.blockLength)
          ? parsed.blockLength
          : LEARNING_BLOCK_LENGTH,
    };
  } catch {
    return null;
  }
}

// The handoff is exposed as an external store so a component can read it with
// `useSyncExternalStore` — the server render and the first client render then agree (no hydration
// mismatch) and a write in this tab updates the UI without anyone setting state from an effect.
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedHandoff: LearningBlockHandoff | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToLearningBlockHandoff(onChange: () => void): () => void {
  listeners.add(onChange);
  if (typeof window !== 'undefined') window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onChange);
  };
}

/**
 * Snapshot for `useSyncExternalStore`. Identity is cached against the raw string so repeated reads
 * return the SAME object — returning a fresh one each call would loop the store forever.
 */
export function learningBlockHandoffSnapshot(): LearningBlockHandoff | null {
  const raw = storage()?.getItem(HANDOFF_KEY) ?? null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedHandoff = parseHandoff(raw);
  }
  return cachedHandoff;
}

/** There is no handoff during a server render; the client fills it in on mount. */
export function learningBlockHandoffServerSnapshot(): LearningBlockHandoff | null {
  return null;
}

export function saveLearningBlockHandoff(handoff: LearningBlockHandoff): void {
  try {
    storage()?.setItem(HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    // Best-effort: without it the child simply cannot resume in a later sitting.
  }
  emit();
}

export function loadLearningBlockHandoff(): LearningBlockHandoff | null {
  return parseHandoff(storage()?.getItem(HANDOFF_KEY) ?? null);
}

export function clearLearningBlockHandoff(): void {
  try {
    storage()?.removeItem(HANDOFF_KEY);
  } catch {
    // nothing to do
  }
  emit();
}

/** Items in the block's area that Phase 1 never served. */
export function novelBlockPool(
  pool: readonly ServedItem[],
  seenItemIds: readonly string[],
): ServedItem[] {
  const seen = new Set(seenItemIds);
  return pool.filter((item) => item.domain === LEARNING_BLOCK_AREA && !seen.has(item.itemId));
}

/** Whether a block can run at all: enough unseen items in the area to reach the configured length. */
export function blockCanRun(
  pool: readonly ServedItem[],
  seenItemIds: readonly string[],
  length: number = LEARNING_BLOCK_LENGTH,
): boolean {
  return novelBlockPool(pool, seenItemIds).length >= length;
}

/**
 * Difficulty to aim the next trial at: the standing level plus the desirable-difficulty offset
 * early on, then re-projected from the climb fitted so far.
 */
export function nextBlockTarget(trials: readonly LearningTrial[], standing: number): number {
  return nextTargetTheta(trials, {
    standingEstimate: standing,
    targetOffset: LEARNING_BLOCK_TARGET_OFFSET,
  });
}

/** Pick the next unfamiliar item, closest to `target`. `null` once the pool is exhausted. */
export function nextBlockItem(
  pool: readonly ServedItem[],
  administeredIds: readonly string[],
  target: number,
  seed: number,
): ServedItem | null {
  return selectNextNovelServedItem(pool, administeredIds, target, seed);
}

/** One completed block trial, in the order it was served. */
export function toLearningTrials(
  block: readonly { readonly difficulty: number; readonly score: number }[],
): LearningTrial[] {
  return block.map((item, index) => ({
    difficulty: item.difficulty,
    score: item.score,
    trialIndex: index,
  }));
}

export interface LearningBlockReadout {
  readonly band: LearningRateBand;
  /**
   * Plain-English explanation for a family. When the band is `indeterminate` this says what the
   * test cannot yet do — never anything about the child.
   */
  readonly reason: string;
  readonly lambda: number | null;
  readonly lambdaSe: number | null;
  readonly trialCount: number;
}

const NO_REFERENCE_REASON =
  'We can measure the pace, but we cannot yet say whether it is fast or slow. Doing that needs a ' +
  'comparison group of children who have taken this same block, and we do not have one yet. That ' +
  'is a limit of how new this test is, not a comment on your child.';

const SHORT_BLOCK_REASON =
  'The practice block was not finished, so there is not enough of it to read a pace from. Nothing ' +
  'here reflects on how your child did.';

/**
 * Turn a completed block into something reportable — or an honest refusal.
 *
 * Pass `reference` only once a real distribution of learning rates exists. Until then this
 * deliberately returns `indeterminate`: at this block length one child's estimate is less precise
 * than children are believed to differ, so naming a band would be inventing precision.
 */
export function summariseLearningBlock(
  trials: readonly LearningTrial[],
  reference?: LearningRateReference,
  length: number = LEARNING_BLOCK_LENGTH,
): LearningBlockReadout {
  if (trials.length < length) {
    return {
      band: 'indeterminate',
      reason: SHORT_BLOCK_REASON,
      lambda: null,
      lambdaSe: null,
      trialCount: trials.length,
    };
  }

  if (!reference) {
    // Still fit it, so the pace is on the record and a cohort can be ranked later; just do not
    // dress it up as a comparison we cannot make.
    const fit = estimateLearningCurve(trials);
    return {
      band: 'indeterminate',
      reason: NO_REFERENCE_REASON,
      lambda: fit.converged ? fit.lambda : null,
      lambdaSe: fit.converged ? fit.lambdaSe : null,
      trialCount: trials.length,
    };
  }

  const readout = learningRateReadout(trials, { reference, minTrials: length });
  return {
    band: readout.band,
    reason: readout.band === 'indeterminate' ? NO_REFERENCE_REASON : readout.reason,
    lambda: readout.lambdaDiagnostic,
    lambdaSe: readout.lambdaSe,
    trialCount: readout.trialCount,
  };
}
