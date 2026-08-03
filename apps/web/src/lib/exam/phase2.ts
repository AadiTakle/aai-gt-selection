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
  AREAS,
  RECOMMENDED_NOVEL_BLOCK_LENGTH,
  itemOptionCount,
  selectNextNovelServedItem,
  type Area,
  type ServedItem,
} from '@gt-selection/exam-engine';
import {
  DEFAULT_GUESSING,
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
 * The ONE question type the block administers, or `null` for "any type in the area".
 *
 * This is not a preference, it is what makes the block a learning block at all. The measurement
 * rests on a hidden generative system the child induces across trials that never repeat
 * (STAGE2_QUESTION_DESIGN §1.2): the item is new every time, so the only thing that can carry
 * forward is the system, and the system belongs to a type. A block that interleaves types has
 * nothing persisting across it, and the fitted climb is then a climb through a mixture.
 *
 * It is also what makes the scrambled-system control possible. Gate B randomises children between
 * a block whose system persists and one whose system is re-drawn every trial (§4.1.1); the two arms
 * are equated on item count, difficulty ladder, feedback form and position in the session, and
 * "which types were interleaved" is not a variable either arm could hold constant.
 *
 * Measured before it was set: on the wired fluid pool the type-agnostic block served
 * `FLU-OPCHAIN-01` on 4 to 10 of 30 trials depending on standing, mixed with ten other types. Six
 * scattered exposures cannot teach a six-badge vocabulary, so the block was reading as a general
 * fluid run with some machine-chain items in it.
 *
 * Setting it to `null` restores the previous behaviour, which is the right thing to do if the type
 * is ever withdrawn: an interleaved block measures something, just not this.
 */
export const LEARNING_BLOCK_TYPE: string | null = 'FLU-OPCHAIN-01';

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

/**
 * One activity in Phase 2: a single question type, run in one area, for a fixed number of trials.
 *
 * The single-type rule is the whole reason this is a list of blocks rather than one longer block.
 * A learning block measures a hidden system the child induces across trials that never repeat, and
 * the system belongs to a type — so a run that interleaves types has nothing persisting across it
 * (see {@link LEARNING_BLOCK_TYPE}). Four activities therefore means four separate single-type
 * blocks, each with its own climb, not one block of 120 mixed trials.
 *
 * Each block still runs in the SAME area and type for every child, for the comparability reason in
 * {@link LEARNING_BLOCK_AREA}: a rate measured in whichever area a given child happened to be
 * strongest in is not comparable to anyone else's.
 */
export interface LearningBlockSpec {
  /** Stable key for per-block state and storage. Never renumber; the handoff persists it. */
  readonly id: string;
  readonly area: Area;
  /** The one type this block administers. */
  readonly typeCode: string;
  /** Child-facing name for the activity. */
  readonly label: string;
  readonly length: number;
}

/**
 * The Phase 2 activities, in the order they are offered.
 *
 * Three of these four types are not on `dev` yet. That is deliberate rather than aspirational:
 * {@link availableBlocks} filters this list against the item pool the app actually has, so the run
 * is one activity today and becomes four the moment the remaining banks land, with no code change.
 * A block whose type has too few unseen items is skipped, not failed.
 */
export const LEARNING_BLOCKS: readonly LearningBlockSpec[] = [
  {
    id: 'fluid',
    area: 'fluid_reasoning',
    typeCode: 'FLU-OPCHAIN-01',
    label: 'Machine Chains',
    length: LEARNING_BLOCK_LENGTH,
  },
  {
    id: 'spatial',
    area: 'spatial',
    typeCode: 'SPA-XFORM-01',
    label: 'Transform Machine',
    length: LEARNING_BLOCK_LENGTH,
  },
  {
    id: 'quantitative',
    area: 'quantitative',
    typeCode: 'QUANT-GLYPHNUM-01',
    label: 'Alien Numbers',
    length: LEARNING_BLOCK_LENGTH,
  },
  {
    id: 'verbal',
    area: 'verbal',
    typeCode: 'VER-MORPHO-01',
    label: 'Word Machines',
    length: LEARNING_BLOCK_LENGTH,
  },
];

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
  /**
   * The settled standing level for {@link LEARNING_BLOCK_AREA}, on the 1–20 scale.
   *
   * Retained as the fluid-reasoning standing so a handoff written before Phase 2 had more than one
   * activity still resumes. {@link standings} is what a multi-block run reads.
   */
  readonly standing: number;
  /**
   * Settled standing per area, so each activity can be aimed at the level the child actually
   * reached in ITS area. Aiming a spatial block at a fluid standing would pitch the difficulty at
   * the wrong child.
   *
   * Partial because Phase 1 may not settle every area.
   */
  readonly standings: Partial<Record<Area, number>>;
  /** Every item served in Phase 1, so the block can exclude them. */
  readonly seenItemIds: readonly string[];
  readonly finishedAt: string;
  readonly blockLength: number;
  /** Ids of activities already completed, so a resumed run continues rather than restarts. */
  readonly completedBlockIds: readonly string[];
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
    // A handoff written before Phase 2 had per-area standings carries only the fluid one. Seed the
    // map from it so an in-flight run resumes instead of being discarded.
    const rawStandings = (parsed.standings ?? {}) as Record<string, unknown>;
    const standings: Partial<Record<Area, number>> = {};
    for (const area of AREAS) {
      const value = rawStandings[area];
      if (typeof value === 'number' && Number.isFinite(value)) standings[area] = value;
    }
    if (standings[LEARNING_BLOCK_AREA] === undefined) {
      standings[LEARNING_BLOCK_AREA] = parsed.standing;
    }

    return {
      sessionId: parsed.sessionId,
      examSessionId: typeof parsed.examSessionId === 'string' ? parsed.examSessionId : null,
      gradeBand: typeof parsed.gradeBand === 'string' ? parsed.gradeBand : '4-5',
      standing: parsed.standing,
      standings,
      seenItemIds: parsed.seenItemIds.filter((id): id is string => typeof id === 'string'),
      finishedAt: typeof parsed.finishedAt === 'string' ? parsed.finishedAt : '',
      blockLength:
        typeof parsed.blockLength === 'number' && Number.isFinite(parsed.blockLength)
          ? parsed.blockLength
          : LEARNING_BLOCK_LENGTH,
      completedBlockIds: Array.isArray(parsed.completedBlockIds)
        ? parsed.completedBlockIds.filter((id): id is string => typeof id === 'string')
        : [],
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

/** Items of one activity's type, in its area, that Phase 1 never served. */
export function blockPool(
  spec: LearningBlockSpec,
  pool: readonly ServedItem[],
  seenItemIds: readonly string[],
): ServedItem[] {
  const seen = new Set(seenItemIds);
  return pool.filter(
    (item) =>
      item.domain === spec.area && item.typeCode === spec.typeCode && !seen.has(item.itemId),
  );
}

/** Where a block's assumed guessing floor came from. Named so the fallback cannot pass unnoticed. */
export type BlockFloorBasis =
  | { readonly kind: 'option-count'; readonly optionCount: number }
  /**
   * The floor could not be read off the pool, so {@link DEFAULT_GUESSING} stands in.
   *
   * - `no-option-count`: no item declares an option list. Either the pool is not multiple choice at
   *   all, or it reached here stripped of the one field that would say.
   * - `mixed-option-counts`: the pool disagrees with itself. The fit takes ONE floor for the whole
   *   block, and averaging reciprocals across a pool would put a number nobody chose into the fit,
   *   so the declared default is used and the disagreement is reported instead.
   * - `degenerate-option-count`: an option list too short to guess from (0 or 1), whose reciprocal
   *   is not a probability.
   */
  | {
      readonly kind: 'default';
      readonly reason: 'no-option-count' | 'mixed-option-counts' | 'degenerate-option-count';
    };

export interface BlockGuessingFloor {
  /** Lower asymptote to fit and to target with, for every trial of this block. */
  readonly guessing: number;
  readonly basis: BlockFloorBasis;
}

/** Fewest options an item can offer and still leave something to guess between. */
const MIN_GUESSABLE_OPTIONS = 2;

/**
 * The chance-success floor for one activity, derived from its own items.
 *
 * WHY THIS EXISTS. `DEFAULT_GUESSING` is the FIVE-option floor, and the Phase 2 activities are not
 * all five-option: `VER-MORPHO-01` offers four, so the block it runs was fitted and aimed at 0.2
 * against a truth of 0.25. D-200 part 1 already provides for this — "callers administering a
 * different item format pass the reciprocal of their option count" — and this is the caller doing
 * it. E-212 measures what it is worth on the shipped targeting rule.
 *
 * DERIVED RATHER THAN TABULATED. The count comes off the bank record every time (`content.options`
 * on a full item, `content.optionCount` on the selection index the browser holds), so a bank that
 * changes format moves this with it. A per-type table would keep returning the old number and
 * nothing in the pipeline would notice.
 *
 * ONE FLOOR FOR THE WHOLE BLOCK, because the fit takes one. That is exact while an activity's bank
 * is uniform — all four wired Stage 2 banks are — and a pool that disagrees with itself falls back
 * to the declared default rather than to an invented average. E-200 costs mixed option counts as a
 * real second-order exposure, so the fallback is reported through {@link BlockFloorBasis} rather
 * than applied silently.
 *
 * CLAIM BOUNDARY. The reciprocal of the option count is a DESIGN assumption, not a calibrated `c`.
 * An estimated lower asymptote is typically below chance, since a plausible distractor set is not
 * chosen uniformly, and a child who disengages sits below it again. E-205 records that if a real
 * child's floor is not the reciprocal, this correction is itself misspecified.
 */
export function blockGuessingFloor(pool: readonly ServedItem[]): BlockGuessingFloor {
  let count: number | null = null;
  for (const item of pool) {
    const declared = itemOptionCount(item);
    if (declared === null) continue;
    if (count === null) count = declared;
    else if (count !== declared) {
      return {
        guessing: DEFAULT_GUESSING,
        basis: { kind: 'default', reason: 'mixed-option-counts' },
      };
    }
  }

  if (count === null) {
    return { guessing: DEFAULT_GUESSING, basis: { kind: 'default', reason: 'no-option-count' } };
  }
  if (count < MIN_GUESSABLE_OPTIONS) {
    return {
      guessing: DEFAULT_GUESSING,
      basis: { kind: 'default', reason: 'degenerate-option-count' },
    };
  }
  return { guessing: 1 / count, basis: { kind: 'option-count', optionCount: count } };
}

/**
 * The activities this child can actually be given, ordered weakest area first.
 *
 * An activity is dropped when its bank is not wired yet, when Phase 1 left too few unseen items of
 * its type, or when Phase 1 never settled a standing in its area — all three make the block
 * unaimable rather than merely short, and a block aimed at nothing measures nothing.
 *
 * Completed activities are dropped too, so a resumed run continues where it stopped.
 *
 * **Order is by the child's own standing, ascending.** Every activity is pitched above wherever
 * that child finished, so all four are hard; going weakest-area first means the run opens where
 * the ceiling is lowest and the material is least likely to be already familiar. It also puts the
 * areas most exposed to fatigue at the front, while effort is highest — Phase 2 is the part
 * children are told they are not expected to complete, so what lands late is what a tiring child
 * is most likely to abandon.
 *
 * The order is a property of the child, not of the list, so two children can meet these in
 * different sequences. That is fine for a within-block climb, which never compares across areas.
 */
export function availableBlocks(
  pool: readonly ServedItem[],
  seenItemIds: readonly string[],
  standings: Partial<Record<Area, number>>,
  completedBlockIds: readonly string[] = [],
): LearningBlockSpec[] {
  const done = new Set(completedBlockIds);
  return LEARNING_BLOCKS.filter(
    (spec) =>
      !done.has(spec.id) &&
      standings[spec.area] !== undefined &&
      blockPool(spec, pool, seenItemIds).length >= spec.length,
  ).sort((a, b) => {
    const byStanding = (standings[a.area] ?? 0) - (standings[b.area] ?? 0);
    // Ties keep the declaration order, so the sequence stays deterministic and replayable.
    return byStanding !== 0
      ? byStanding
      : LEARNING_BLOCKS.indexOf(a) - LEARNING_BLOCKS.indexOf(b);
  });
}

/** Items of the block's type, in the block's area, that Phase 1 never served. */
export function novelBlockPool(
  pool: readonly ServedItem[],
  seenItemIds: readonly string[],
): ServedItem[] {
  const seen = new Set(seenItemIds);
  return pool.filter(
    (item) =>
      item.domain === LEARNING_BLOCK_AREA &&
      (LEARNING_BLOCK_TYPE === null || item.typeCode === LEARNING_BLOCK_TYPE) &&
      !seen.has(item.itemId),
  );
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
 * early on, then re-fitted from the level reached so far.
 *
 * `guessing` is the block's own chance floor from {@link blockGuessingFloor}. It reaches the
 * TARGETING role here and the READOUT role in {@link summariseLearningBlock}, and both matter:
 * E-200 measured correcting the readout alone and found it barely helps, because the difficulty
 * walk is still driven by a misspecified fit.
 */
export function nextBlockTarget(
  trials: readonly LearningTrial[],
  standing: number,
  guessing: number = DEFAULT_GUESSING,
): number {
  return nextTargetTheta(trials, {
    standingEstimate: standing,
    targetOffset: LEARNING_BLOCK_TARGET_OFFSET,
    guessing,
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
  /**
   * DIAGNOSTIC ONLY, and never a reportable rate.
   *
   * The fit is kept so a cohort can be ranked once one exists, and so the figure is on the record
   * for the analysis that will run Gate B. It must not be rendered to a family, and D-206 does not
   * change that: the systematic floor a child who learned nothing used to carry is gone, but at 30
   * trials the posterior SE alone is about 0.060 against a reference half-width of 0.015, so a
   * single child's figure still cannot be placed on any scale anyone can defend. No child-facing
   * surface reads it, and a test asserts that.
   */
  readonly lambda: number | null;
  readonly lambdaSe: number | null;
  readonly trialCount: number;
}

/**
 * Why this no longer opens with "we can measure the pace".
 *
 * It used to, and that sentence is no longer true. `STAGE2_BANK_RECOVERY_MEASUREMENT.md` measured
 * what this pipeline fits for a cohort that learned NOTHING, against a responder with a real
 * five-option guessing floor, and found a positive climb on every bank tried. D-206 removed most of
 * that particular defect — the targeting rule no longer extrapolates the climb it is estimating —
 * and a null cohort now fits within a Monte-Carlo standard error of zero on all four Stage 2 banks
 * and on no bank at all. **It did not make the pace reportable**, and the wording below is
 * unchanged because the reason it was written is unchanged: at 30 trials one child's estimate is
 * still far less precise than children are believed to differ, so a rate for an individual would be
 * invented precision whatever the floor is.
 *
 * So the honest statement to a family has two parts, not one: there is no comparison group, AND
 * the figure itself is not yet reportable on its own. Both are limits of the instrument. Neither
 * is a statement about the child, and the last sentence says so in as many words.
 */
const NO_REFERENCE_REASON =
  'We are not able to report a learning pace for your child yet. Two things are missing: a ' +
  'comparison group of children who have taken this same practice block, and a version of the ' +
  'block long enough to tell a real climb apart from the ordinary warm-up any child shows. Those ' +
  'are limits of how new this test is, not a comment on your child.';

const SHORT_BLOCK_REASON =
  'The practice block was not finished, so there is not enough of it to read a pace from. Nothing ' +
  'here reflects on how your child did.';

/**
 * Turn a completed block into something reportable — or an honest refusal.
 *
 * Pass `reference` only once a real distribution of learning rates exists. Until then this
 * deliberately returns `indeterminate`: at this block length one child's estimate is less precise
 * than children are believed to differ, so naming a band would be inventing precision.
 *
 * `guessing` is the block's own chance floor from {@link blockGuessingFloor} — the READOUT half of
 * the pair {@link nextBlockTarget} completes. Leaving it at the default fits a four-option activity
 * as though it were five-option, which is the misspecification E-212 measures.
 */
export function summariseLearningBlock(
  trials: readonly LearningTrial[],
  reference?: LearningRateReference,
  length: number = LEARNING_BLOCK_LENGTH,
  guessing: number = DEFAULT_GUESSING,
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
    const fit = estimateLearningCurve(trials, { guessing });
    return {
      band: 'indeterminate',
      reason: NO_REFERENCE_REASON,
      lambda: fit.converged ? fit.lambda : null,
      lambdaSe: fit.converged ? fit.lambdaSe : null,
      trialCount: trials.length,
    };
  }

  const readout = learningRateReadout(trials, { reference, minTrials: length, fit: { guessing } });
  return {
    band: readout.band,
    reason: readout.band === 'indeterminate' ? NO_REFERENCE_REASON : readout.reason,
    lambda: readout.lambdaDiagnostic,
    lambdaSe: readout.lambdaSe,
    trialCount: readout.trialCount,
  };
}

/** One finished activity, kept so the run can be summarised and resumed. */
export interface CompletedBlock {
  readonly spec: LearningBlockSpec;
  readonly readout: LearningBlockReadout;
}

/**
 * What the whole of Phase 2 says, once every activity a child could take has been taken.
 *
 * There is deliberately no combined rate. Each activity fits its own climb in its own area, and
 * averaging four figures that are each individually indeterminate produces a fifth indeterminate
 * figure with a falsely tighter look — the block-length floor in {@link summariseLearningBlock}
 * does not average away. So this reports coverage and holds the per-activity fits for the cohort
 * analysis, and says plainly that the pace itself is not yet reportable.
 */
export interface Stage2Readout {
  readonly blocks: readonly CompletedBlock[];
  /** Activities finished out of the number offered to THIS child. */
  readonly completed: number;
  readonly offered: number;
  readonly band: LearningRateBand;
  readonly reason: string;
}

const PARTIAL_COVERAGE_REASON =
  'Your child completed part of the practice section. The activities they did finish are on the ' +
  'record, but a pace is not something we can report from them yet.';

export function summariseStage2(
  blocks: readonly CompletedBlock[],
  offered: number,
): Stage2Readout {
  const completed = blocks.length;
  return {
    blocks,
    completed,
    offered,
    band: 'indeterminate',
    reason: completed > 0 && completed < offered ? PARTIAL_COVERAGE_REASON : NO_REFERENCE_REASON,
  };
}
