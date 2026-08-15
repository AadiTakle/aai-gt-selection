/**
 * What `?debug=1` renders: the child's ability estimate CONVERGING, item by item.
 *
 * The whole thing is a pure function of the trace collected so far plus the engine config. Nothing
 * is accumulated in a live counter, which buys three properties that matter:
 *
 *  1. the panel and any offline replay of the same trace produce identical numbers;
 *  2. re-rendering after each answered item is enough to animate the convergence, with no effect
 *     writing state and no second source of truth to drift; and
 *  3. the running estimate it prints is the engine's OWN estimate, because it is recomputed with
 *     the engine's own `difficultyDelta` rather than re-derived by something that looks similar.
 *
 * There are deliberately TWO quantities on screen and they answer different questions:
 *
 *  - **the engine's running target** — where selection is currently aiming. This is the staircase
 *    position, and it is what makes the next item's difficulty predictable.
 *  - **the fitted ability and its interval** — `deriveAbilityFit` over the items answered so far,
 *    which is the estimator the scorer uses. The interval is the one the owner watches narrow.
 *
 * A second, divergent implementation of ability is the exact class of bug this repository has been
 * bitten by twice, so the interval here is `deriveAbilityFit` / `abilityStandardError` from
 * `@gt-selection/exam-scoring` and nothing else.
 *
 * CLAIM BOUNDARY, and it is not a small one. The interval is the conditional (Fisher-information)
 * SE of a one-parameter logistic fit that assumes NO guessing floor, while every wired bank item is
 * multiple choice. A child who succeeds by chance moves this estimate up, and the interval drawn
 * around it reflects only sampling error under that misspecified model — not the bias from it. So
 * the bracket narrowing is a real and faithful picture of the estimator gaining information, and it
 * is NOT a claim that the true ability lies inside the band with 95% probability. The related defect
 * in the Phase 2 learning-curve fit is under review separately.
 */
import {
  DIFFICULTY_MAX,
  DIFFICULTY_MIN,
  GRADE_BAND_SEED,
  AREAS,
  clamp,
  difficultyDelta,
  directionReversals,
  stepSize,
  toObservation,
  type AgeBand,
  type Area,
  type EngineConfig,
  type ItemObservation,
  type ScoredItem,
} from '@gt-selection/exam-engine';
import {
  DEFAULT_ABILITY_BRACKETING,
  abilityStandardError,
  deriveAbilityEstimate,
  type AbilityFitOptions,
  type ScoredItem as ScoringScoredItem,
} from '@gt-selection/exam-scoring';

/**
 * Fit options for the displayed interval: the same slope and prior the scorer uses under ability
 * bracketing, on the same 1..20 scale. Held here as one constant so the panel cannot drift from the
 * scorer by editing a number in a component.
 */
export const DEBUG_ABILITY_FIT: AbilityFitOptions = {
  slope: DEFAULT_ABILITY_BRACKETING.slope,
  priorSd: DEFAULT_ABILITY_BRACKETING.priorSd,
  min: DIFFICULTY_MIN,
  max: DIFFICULTY_MAX,
};

/** ~95% interval half-width in SE units. */
const Z95 = 1.96;

/** The subset of a trace row this view needs. Matches what the runner already records per item. */
export interface DebugTraceItem {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: Area;
  readonly difficulty: number;
  readonly score: number;
  readonly correct: boolean;
  readonly metrics: Record<string, number>;
  readonly skipped?: boolean;
  /** 1-based position within its burst, when the item was served as part of one. */
  readonly burstIndex?: number;
  /** Total length of that burst. */
  readonly burstLength?: number;
}

/** An estimate with the interval drawn around it, already clamped to the scale. */
export interface DebugInterval {
  readonly estimate: number;
  readonly se: number;
  readonly lower: number;
  readonly upper: number;
  /** `upper - lower`. The number that shrinks. */
  readonly width: number;
}

/** One answered item, and what it did to the estimate. */
export interface DebugItemRow {
  /** 1-based position in the whole session. */
  readonly sessionIndex: number;
  /** 1-based position within this area. */
  readonly areaIndex: number;
  readonly itemId: string;
  readonly typeCode: string;
  readonly area: Area;
  /** Where selection was aiming when it chose this item — the running target BEFORE the answer. */
  readonly targetDifficulty: number;
  /** What the bank actually had closest to that target. */
  readonly servedDifficulty: number;
  /** `served - target`: how far the bank forced the aim to miss. */
  readonly targetingMiss: number;
  readonly correct: boolean;
  readonly skipped: boolean;
  /** Scheduled staircase magnitude for this answer — the thing that shrinks at each reversal. */
  readonly step: number;
  /** Signed move actually applied, after surprise and near-miss softening. */
  readonly delta: number;
  /** The running target after the move. */
  readonly targetAfter: number;
  /** True when this answer flipped direction, i.e. the estimate is now straddling the child. */
  readonly reversal: boolean;
  /** The fitted interval using every item answered in this area up to and including this one. */
  readonly interval: DebugInterval | null;
  readonly burst: { readonly index: number; readonly length: number } | null;
}

/** Everything the panel shows for one reasoning area. */
export interface DebugAreaView {
  readonly area: Area;
  readonly itemsSeen: number;
  /** The engine's running target — where the next item in this area will be aimed. */
  readonly target: number;
  /** Fitted ability and its interval over this area's items. `null` before the first answer. */
  readonly interval: DebugInterval | null;
  /** Interval width after each answered item, oldest first: the narrowing, as a series. */
  readonly widths: readonly number[];
  readonly reversals: number;
  /** Current scheduled staircase step. */
  readonly step: number;
  readonly rows: readonly DebugItemRow[];
}

export interface DebugView {
  readonly areas: readonly DebugAreaView[];
  readonly itemsServed: number;
  /**
   * The fit pooled over ALL areas. Not a composite score — it is the same estimator run over the
   * whole trace, which is the single headline number that converges fastest on screen.
   */
  readonly overall: DebugInterval | null;
  /** Overall interval width after each answered item, oldest first. */
  readonly overallWidths: readonly number[];
  readonly scale: { readonly min: number; readonly max: number };
  /** Rows across every area in the order they were served — the per-item log. */
  readonly log: readonly DebugItemRow[];
}

function toScoringItems(items: readonly DebugTraceItem[]): ScoringScoredItem[] {
  return items as unknown as ScoringScoredItem[];
}

/**
 * Fit the interval over `items`. Returns `null` for an empty set, and clamps the band to the scale
 * so the panel never draws outside its own axis.
 */
export function fitInterval(items: readonly DebugTraceItem[]): DebugInterval | null {
  if (items.length === 0) return null;
  const scoring = toScoringItems(items);
  const estimate = deriveAbilityEstimate(scoring, DEBUG_ABILITY_FIT);
  if (estimate === null) return null;
  const se = abilityStandardError(estimate, scoring, DEBUG_ABILITY_FIT);
  if (se === null || !Number.isFinite(se)) {
    return { estimate, se: Number.POSITIVE_INFINITY, lower: DIFFICULTY_MIN, upper: DIFFICULTY_MAX, width: DIFFICULTY_MAX - DIFFICULTY_MIN };
  }
  const lower = clamp(estimate - Z95 * se, DIFFICULTY_MIN, DIFFICULTY_MAX);
  const upper = clamp(estimate + Z95 * se, DIFFICULTY_MIN, DIFFICULTY_MAX);
  return { estimate, se, lower, upper, width: upper - lower };
}

/**
 * Build the whole view from the trace.
 *
 * The per-area walk replays the engine's own update: `difficultyDelta` given the observations so
 * far returns exactly the signed move the engine applied, so `targetAfter` is the engine's estimate
 * and not an approximation of it.
 */
export function buildDebugView(input: {
  readonly trace: readonly DebugTraceItem[];
  readonly gradeBand: AgeBand;
  readonly config: EngineConfig;
}): DebugView {
  const { trace, gradeBand, config } = input;
  const seed = GRADE_BAND_SEED[gradeBand] ?? (DIFFICULTY_MIN + DIFFICULTY_MAX) / 2;

  // Session-order index per item, so an area row can report where it fell in the whole session.
  const sessionIndexOf = new Map<string, number>();
  trace.forEach((item, i) => sessionIndexOf.set(item.itemId, i + 1));

  const areas: DebugAreaView[] = [];
  const allRows: DebugItemRow[] = [];

  for (const area of AREAS) {
    const items = trace.filter((item) => item.domain === area);
    const observations: ItemObservation[] = [];
    const rows: DebugItemRow[] = [];
    const widths: number[] = [];
    let target = seed;

    items.forEach((item, index) => {
      const last = observations[observations.length - 1];
      const reversal = last !== undefined && last.correct !== item.correct;
      const reversalsIncl = directionReversals(observations) + (reversal ? 1 : 0);
      const step = stepSize(reversalsIncl, config);

      const targetBefore = target;
      const delta = difficultyDelta(
        { difficulty: target, trace: observations },
        item as unknown as ScoredItem,
        config,
      );
      target = clamp(target + delta, DIFFICULTY_MIN, DIFFICULTY_MAX);
      observations.push(toObservation(item as unknown as ScoredItem));

      const interval = fitInterval(items.slice(0, index + 1));
      if (interval) widths.push(interval.width);

      const row: DebugItemRow = {
        sessionIndex: sessionIndexOf.get(item.itemId) ?? index + 1,
        areaIndex: index + 1,
        itemId: item.itemId,
        typeCode: item.typeCode,
        area,
        targetDifficulty: targetBefore,
        servedDifficulty: item.difficulty,
        targetingMiss: item.difficulty - targetBefore,
        correct: item.correct,
        skipped: item.skipped === true,
        step,
        delta,
        targetAfter: target,
        reversal,
        interval,
        burst:
          item.burstIndex !== undefined && item.burstLength !== undefined && item.burstLength > 1
            ? { index: item.burstIndex, length: item.burstLength }
            : null,
      };
      rows.push(row);
      allRows.push(row);
    });

    areas.push({
      area,
      itemsSeen: items.length,
      target,
      interval: fitInterval(items),
      widths,
      reversals: directionReversals(observations),
      step: stepSize(directionReversals(observations), config),
      rows,
    });
  }

  const overallWidths: number[] = [];
  for (let i = 1; i <= trace.length; i += 1) {
    const interval = fitInterval(trace.slice(0, i));
    if (interval) overallWidths.push(interval.width);
  }

  return {
    areas,
    itemsServed: trace.length,
    overall: fitInterval(trace),
    overallWidths,
    scale: { min: DIFFICULTY_MIN, max: DIFFICULTY_MAX },
    log: allRows.sort((a, b) => a.sessionIndex - b.sessionIndex),
  };
}
