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
 * model fitted to the (difficulty, score) pairs in the trace, with a chance-success floor:
 *
 *     P(correct | difficulty b) = c + (1 - c) / (1 + exp(-slope * (theta - b)))
 *
 * `theta` is the difficulty at which the child's underlying SKILL component is even — the point
 * they would pass half the time if they could not guess. With `c > 0` their observed success rate
 * at that difficulty is higher than a half, because chance supplies part of it.
 *
 * THE FLOOR IS NOT OPTIONAL AND WAS THE LARGEST SINGLE ERROR IN THIS FIT. Every wired bank is
 * multiple choice, so a child well below an item still passes it sometimes. Fitting them with
 * `c = 0` reads those lucky passes as ability and returns a standing level ABOVE the child —
 * measured at +1.4 scale points on the real bank, and worse for a child seeded far above their
 * level. This is the same misspecification D-200 corrected in the Phase 2 learning-curve fit; the
 * standing fit kept assuming nobody guesses long after Phase 2 stopped, which also meant the
 * corrected Phase 2 fit was anchored on an uncorrected Phase 1 handover.
 *
 * `guessing` defaults to 0 when a caller omits it, so an existing caller's numbers do not move
 * without that caller opting in; `DEFAULT_ABILITY_BRACKETING` carries the corrected value, so the
 * policy path gets it.
 *
 * CLAIM BOUNDARY: `slope` and `guessing` are design assumptions, not calibrated parameters. No
 * bank item has a calibrated `a`, `b` or `c` — every difficulty is a design estimate on a
 * born-synthetic bank (`syntheticOnly = true`, `validated = false`), and the wired banks mix four-,
 * five- and six-option items so no single floor is right for all of them. Assuming a floor that is
 * not there is harmful too, and asymmetrically so: it attenuates a genuinely low-ability child.
 * This is a difficulty-referenced RECOVERY statistic, not a validated ability score, and nothing
 * here establishes predictive validity.
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
  /**
   * Chance-success floor `c`: the probability a child far below an item still answers it correctly.
   * `1 / options` for a multiple-choice item, so 0.2 for the five-option items most of the wired
   * bank is made of. Omitted ⇒ 0, the no-guessing model this fit used to assume unconditionally.
   */
  readonly guessing?: number;
}

/** Bisection steps. Fixed rather than tolerance-driven so the result is bit-for-bit repeatable. */
const BISECTION_STEPS = 60;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** The configured chance-success floor, clamped to a usable range. */
function floorOf(opts: AbilityFitOptions): number {
  const c = opts.guessing ?? 0;
  return Number.isFinite(c) ? clamp(c, 0, 0.95) : 0;
}

/**
 * Derivative of the log posterior with respect to `theta`.
 *
 * Each item contributes `(observed - P) * (dP/dtheta) / (P * (1 - P))`. With `c = 0` the factor
 * `dP/dtheta / (P (1 - P))` collapses to `slope` and this reduces to `slope * sum(observed - P)`,
 * which is exactly the expression this function used before the floor was added — so a zero floor
 * reproduces the previous fit term for term.
 *
 * With `c = 0` the derivative is strictly decreasing in `theta`, so the bisection below converges
 * on the unique maximum. With `c > 0` a three-parameter likelihood is not guaranteed unimodal in
 * general; the weakly-informative prior and the single shared slope make a second mode
 * vanishingly unlikely here, and bisection remains bit-for-bit reproducible either way, which is
 * what the audit trail requires of it.
 */
function scoreFunction(
  theta: number,
  items: readonly ScoredItem[],
  opts: AbilityFitOptions,
): number {
  const c = floorOf(opts);
  let gradient = 0;
  for (const item of items) {
    const observed = isFiniteNumber(item.score) ? clamp(item.score, 0, 1) : 0;
    const difficulty = clamp(item.difficulty, opts.min, opts.max);
    const skill = 1 / (1 + Math.exp(-opts.slope * (theta - difficulty)));
    const expected = c + (1 - c) * skill;
    const spread = expected * (1 - expected);
    if (!(spread > 0)) continue;
    // dP/dtheta = slope * (1 - c) * skill * (1 - skill).
    gradient += ((observed - expected) * (opts.slope * (1 - c) * skill * (1 - skill))) / spread;
  }

  const priorPull =
    Number.isFinite(opts.priorSd) && opts.priorSd > 0
      ? (theta - (opts.min + opts.max) / 2) / (opts.priorSd * opts.priorSd)
      : 0;

  return gradient - priorPull;
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
 * The precision of a fitted location is the curvature of the log posterior at the estimate: each
 * item contributes Fisher information `(dP/dtheta)^2 / (P (1 - P))`, and a finite prior adds
 * `1 / priorSd^2`. The SE is `1 / sqrt(total precision)`. With a floor that works out to
 * `slope^2 * (1 - P) * skill^2 / P`, which collapses to the familiar `slope^2 * P * (1 - P)` when
 * `c = 0`.
 *
 * WHERE THE MOST INFORMATIVE ITEM SITS depends on the floor, and this is the reason it matters to
 * selection and not only to reporting. With `c = 0` information peaks at `P = 0.5`, i.e. at an
 * item difficulty equal to the ability — the coin-flip item. With `c > 0` it peaks at
 * `P = (1 + sqrt(1 + 8c)) / 4`, about 0.65 for a five-option item, so the item that sharpens the
 * estimate most is somewhat EASIER than the child rather than level with them. A floor-blind SE
 * therefore scores a correctly-aimed battery as if it had been aimed badly.
 *
 * Either way the SE reflects WHICH items were served, not merely how many — a child who answered
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

  const c = floorOf(opts);
  let information = 0;
  for (const item of items) {
    const difficulty = clamp(item.difficulty, opts.min, opts.max);
    const skill = 1 / (1 + Math.exp(-opts.slope * (theta - difficulty)));
    const p = c + (1 - c) * skill;
    if (!(p > 0) || !(p < 1)) continue;
    const slopeAtTheta = opts.slope * (1 - c) * skill * (1 - skill);
    information += (slopeAtTheta * slopeAtTheta) / (p * (1 - p));
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
