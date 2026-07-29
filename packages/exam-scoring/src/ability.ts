/**
 * Difficulty-adjusted ability, fitted from the stored trace.
 *
 * The accuracy statistic in `scorer.ts` asks "what fraction of what they were given did they get
 * right". Under a converged adaptive battery that fraction is approximately constant by
 * construction — a well-targeted item is one the child has about an even chance on — so it
 * carries little ability signal. This module answers the other question: **where on the
 * difficulty scale does the child succeed**, which is what the trace of a converged battery
 * actually encodes.
 *
 * The estimate is the location parameter of a one-parameter (Rasch-style) logistic response
 * model fitted to the (difficulty, score) pairs in the trace:
 *
 *     P(correct | difficulty b) = 1 / (1 + exp(-slope * (theta - b)))
 *
 * `theta` is therefore the difficulty at which the child's fitted success probability is 50% —
 * the same quantity the adaptive engine targets when it selects an item. It is fitted here from
 * the trace alone; the engine's own running estimate is NOT an input, so the scorer keeps its
 * single input contract and a stored trace still reproduces the score exactly.
 *
 * CLAIM BOUNDARY: `slope` is a design assumption, not a calibrated discrimination. No bank item
 * has a calibrated `a` or `b` — every difficulty is a design estimate on a born-synthetic bank
 * (`syntheticOnly = true`, `validated = false`). This is a difficulty-referenced RECOVERY
 * statistic, not a validated ability score, and nothing here establishes predictive validity.
 */
import type { ScoredItem } from './types';

/** Tunable inputs to the fit. All of them live on `ExamPolicy.bracketing.ability`. */
export interface AbilityFitOptions {
  /**
   * Logistic discrimination per scale point. Larger = the model believes success flips sharply
   * around the child's ability; smaller = a gentler ramp that leans more on the whole trace.
   */
  readonly slope: number;
  /**
   * SD of a weakly-informative normal prior centred on the scale midpoint. It exists only to
   * keep a very short or fully one-sided trace off the scale bounds; at the ~8-12 items per area
   * a real battery serves it moves the estimate by well under a scale point. `Infinity` disables
   * it (pure maximum likelihood).
   */
  readonly priorSd: number;
  readonly min: number;
  readonly max: number;
}

/** Bisection steps. Fixed rather than tolerance-driven so the result is bit-for-bit repeatable. */
const BISECTION_STEPS = 60;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Derivative of the log posterior with respect to `theta`. Strictly decreasing in `theta`, so its
 * single root is the maximum and bisection cannot land on a spurious stationary point.
 */
function scoreFunction(
  theta: number,
  items: readonly ScoredItem[],
  opts: AbilityFitOptions,
): number {
  let residual = 0;
  for (const item of items) {
    const observed = isFiniteNumber(item.score) ? clamp(item.score, 0, 1) : 0;
    const difficulty = clamp(item.difficulty, opts.min, opts.max);
    const expected = 1 / (1 + Math.exp(-opts.slope * (theta - difficulty)));
    residual += observed - expected;
  }

  const priorPull =
    Number.isFinite(opts.priorSd) && opts.priorSd > 0
      ? (theta - (opts.min + opts.max) / 2) / (opts.priorSd * opts.priorSd)
      : 0;

  return opts.slope * residual - priorPull;
}

/**
 * Fit the child's difficulty-adjusted ability over one area's items.
 *
 * Returns `null` for an empty trace. For a one-sided trace the likelihood alone is unbounded —
 * a child correct on everything served is only known to be "at least the hardest item" — so the
 * estimate runs to the scale bound unless the prior stops it. With the default prior it settles
 * just beyond the hardest item solved (or just below the easiest item missed), which is as much
 * as the trace supports; with `priorSd: Infinity` it pins at the bound.
 */
export function deriveAbilityEstimate(
  items: readonly ScoredItem[],
  opts: AbilityFitOptions,
): number | null {
  if (items.length === 0) return null;
  if (!(opts.max > opts.min) || !(opts.slope > 0) || !Number.isFinite(opts.slope)) return null;

  let lo = opts.min;
  let hi = opts.max;
  if (scoreFunction(lo, items, opts) <= 0) return lo;
  if (scoreFunction(hi, items, opts) >= 0) return hi;

  for (let i = 0; i < BISECTION_STEPS; i += 1) {
    const mid = (lo + hi) / 2;
    if (scoreFunction(mid, items, opts) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Conditional standard error of the estimate at `theta`, from the observed items.
 *
 * The precision of a fitted 1PL location is the curvature of the log posterior at the estimate:
 * each item contributes Fisher information `slope^2 * p * (1 - p)` (with `p` the model's success
 * probability on that item), and a finite prior adds `1 / priorSd^2`. The SE is
 * `1 / sqrt(total precision)`.
 *
 * Because `p * (1 - p)` peaks at `p = 0.5`, an item pitched near the child's own level (what a
 * converged battery serves) sharpens the estimate most, while an item far above or below barely
 * moves it. So the SE reflects WHICH items were served, not merely how many — a child who answered
 * fewer or badly-targeted items gets a legitimately wider interval.
 *
 * Returns `null` for an empty trace. With a finite prior the SE is always finite (the prior alone
 * bounds it); with `priorSd: Infinity` and a fully one-sided trace the information can approach 0
 * and the SE diverges, which is the honest answer — a one-sided trace does not locate the ability.
 */
export function abilityStandardError(
  theta: number,
  items: readonly ScoredItem[],
  opts: AbilityFitOptions,
): number | null {
  if (items.length === 0) return null;
  if (!(opts.slope > 0) || !Number.isFinite(opts.slope)) return null;

  let information = 0;
  for (const item of items) {
    const difficulty = clamp(item.difficulty, opts.min, opts.max);
    const p = 1 / (1 + Math.exp(-opts.slope * (theta - difficulty)));
    information += opts.slope * opts.slope * p * (1 - p);
  }
  if (Number.isFinite(opts.priorSd) && opts.priorSd > 0) {
    information += 1 / (opts.priorSd * opts.priorSd);
  }

  if (!(information > 0)) return Number.POSITIVE_INFINITY;
  return 1 / Math.sqrt(information);
}

/** An ability estimate together with its conditional standard error. */
export interface AbilityFit {
  readonly estimate: number;
  readonly se: number;
}

/**
 * Convenience wrapper: the estimate and its conditional SE from one pass. `null` for an empty
 * trace, matching {@link deriveAbilityEstimate}. The SE is evaluated at the fitted estimate.
 */
export function deriveAbilityFit(
  items: readonly ScoredItem[],
  opts: AbilityFitOptions,
): AbilityFit | null {
  const estimate = deriveAbilityEstimate(items, opts);
  if (estimate === null) return null;
  const se = abilityStandardError(estimate, items, opts);
  return { estimate, se: se ?? Number.POSITIVE_INFINITY };
}
