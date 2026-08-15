/**
 * The learning rate as a RANGE that narrows with repetitions — and the states where it says nothing.
 *
 * WHERE THE NUMBERS BELOW COME FROM. Figures attributed to "the bank-recovery measurement" are in
 * `docs/product/STAGE2_BANK_RECOVERY_MEASUREMENT.md`. It deliberately mints no evidence ID: D-200 is
 * recorded as Proposed and the governance-recording step runs once and last, so minting one would
 * pre-empt the owner on both. Cite the document and its section, not an E number that does not exist.
 *
 * WHY A RANGE AND NOT A BAND. `learning-rate-readout.ts` answers "which band is this child in", and
 * on a 30-item block the honest answer is almost always `indeterminate` (D-200, E-200, and §6 of that
 * document). That is correct but it is also unwatchable: a screen that reads "not enough to tell" at
 * trial 8 and again at trial 30 shows nothing happening, when in fact something measurable IS
 * happening — the posterior is contracting the whole time. This module reports that contraction
 * directly. The product is the interval and its narrowing, not a name for where the interval sits.
 *
 * AND WHY NAMING A BAND IS NOT AVAILABLE AS AN ADD-ON LATER. §3 measured the thing that makes this
 * counter-intuitive: on the bank purpose-built for this measurement, tightening the posterior RAISED
 * the rate of false `above` verdicts (12.8% on `FLU-MATRIX-01` → 16.5% on
 * `FLU-OPCHAIN-01.consistent`), because a block whose posterior is too wide to name a band cannot
 * name a WRONG one. Precision converts refusals into verdicts, and while the contamination floor is
 * non-zero a share of those verdicts are wrong. So this module is structurally incapable of naming
 * a band: it never receives a reference `mean` or `sd`, so there is nothing for it to name one
 * against. That is the point, not an omission.
 *
 * WHAT THE INTERVAL IS. The posterior mode of `lambda` from {@link estimateLearningCurve}, plus and
 * minus a multiple of that fit's posterior SE. There is exactly one estimator of this quantity in
 * this repository and this module calls it; it does not re-derive `lambda`, `lambdaSe`, or the
 * guessing floor. Two divergent implementations of the same quantity is a failure this project has
 * already paid for twice.
 *
 * WHAT THE INTERVAL IS NOT. It is not a confidence interval in the frequentist sense, it is not a
 * rank, and above all it is NOT a claim that the child learned. The pipeline manufactures a
 * positive climb for a child who learned nothing at all — measured at λ̄ = 0.0097 ± 0.0011 at 30
 * trials on the purpose-built bank, 8.6 Monte-Carlo SEs from zero (§4). Until an interval clears that
 * floor entirely, the only supportable reading is "not distinguishable from no learning", and
 * {@link learningRateInterval} reports that as a state rather than leaving it to a caller to
 * rediscover. See {@link MEASURED_CONTAMINATION_FLOOR_30_TRIALS}.
 *
 * D-030 keeps the rate out of the scored decision. D-200 makes the contamination floor a required,
 * measured declaration. E-095, E-200 and the bank-recovery measurement carry the figures quoted here.
 */
import {
  estimateLearningCurve,
  type LearningCurveEstimate,
  type LearningCurveOptions,
  type LearningTrial,
} from './learning-curve';
import { MIN_TRIALS_FOR_RATE } from './learning-rate-readout';

/**
 * One measured cell of the precision ladder: how wide the posterior is after this many trials.
 *
 * `meanPosteriorSe` is a mean over simulated cohorts, so it is what a run should be expected to
 * land NEAR, not a bound any single run must respect.
 */
export interface PosteriorSeRung {
  readonly trials: number;
  readonly meanPosteriorSe: number;
}

/**
 * The narrowing curve, as measured on the bank the block would actually run on.
 *
 * `FLU-OPCHAIN-01`, mean over 8 seeds × 400 children per cell, five-option responder, the corrected
 * estimator in both the readout and the targeting role. Recorded in `STAGE2_BANK_RECOVERY_MEASUREMENT`
 * §4 and §5 of the bank-recovery measurement; reproduced by `pnpm exam:block-harness -- --gate-a --bank FLU-OPCHAIN-01
 * --guessing 0.2 --length {8,15,30,45,60}`.
 *
 * An idealised 0.5-point grid with no bank involved at all carries 0.144 / 0.118 / 0.063 / 0.037 /
 * 0.024 at the same lengths — statistically indistinguishable up to 30 trials. That is the bank-recovery measurement's
 * headline: the purpose-built bank has reached the bank-free lower bound, so this ladder is a
 * property of a 30-trial adaptive block, not of a bank anyone could improve on.
 *
 * `FLU-MATRIX-01`, the bank actually wired into the battery, carries 0.144 / 0.119 / 0.072 / 0.054 /
 * 0.047 — visibly worse from 30 trials on. A run whose contraction tracks that instead of this is
 * telling you which pool it drew from.
 */
export const MEASURED_POSTERIOR_SE_LADDER: readonly PosteriorSeRung[] = [
  { trials: 8, meanPosteriorSe: 0.144 },
  { trials: 15, meanPosteriorSe: 0.118 },
  { trials: 30, meanPosteriorSe: 0.063 },
  { trials: 45, meanPosteriorSe: 0.039 },
  { trials: 60, meanPosteriorSe: 0.028 },
];

/**
 * The ladder E-095 published, kept ONLY so a narrower one quoted from memory can be identified.
 *
 * Every cell here was measured against a simulated child with NO guessing floor — a child who, on
 * an item well above their level, scores zero. That describes a constructed-response item and
 * nothing in any bank is one. It is roughly twice as optimistic as reality from 30 trials on (0.047
 * against 0.063) and it is a ceiling, not a target. E-200 records the correction; PR #22 amended
 * E-095 in place. Do not plot this as the expectation.
 */
export const E095_FLOORLESS_POSTERIOR_SE_LADDER: readonly PosteriorSeRung[] = [
  { trials: 8, meanPosteriorSe: 0.138 },
  { trials: 15, meanPosteriorSe: 0.101 },
  { trials: 30, meanPosteriorSe: 0.047 },
  { trials: 45, meanPosteriorSe: 0.026 },
  { trials: 60, meanPosteriorSe: 0.017 },
];

/**
 * Largest climb the shipped administration path fits for a cohort that learned NOTHING, at 30
 * trials on the purpose-built bank: 0.0097, Monte-Carlo SE 0.0011, over 3,200 simulated children.
 *
 * Exported so a caller does not have to invent one, and DELIBERATELY NOT a default anywhere in this
 * module. D-200 requires the floor to be declared by whoever reports a rate, because it is a
 * property of a specific bank, block length and item format — supplying it is an assertion that
 * someone measured it. `pnpm exam:block-harness -- --fix-probe` is what measures it.
 *
 * It does not fall with block length: 0.0097 / 0.0093 / 0.0094 at 30 / 45 / 60 trials, all inside
 * each other's standard errors, while the posterior SE more than halves over the same range
 * (the bank-recovery measurement §4). Length buys down the random error and leaves the systematic one exactly where it is —
 * which is why a narrowing interval is not, on its own, progress toward a verdict.
 */
export const MEASURED_CONTAMINATION_FLOOR_30_TRIALS = 0.0097;

/**
 * What the interval is able to say.
 *
 * The first three carry no bounds at all. That is the load-bearing part of this type: a block that
 * cannot support an interval returns no numbers to render, rather than a very wide range that a
 * caller might draw as though its width were the finding.
 */
export type LearningRateIntervalState =
  /** No measured contamination floor was declared, so nothing can be said at any length (D-200). */
  | 'floor_undeclared'
  /** Fewer trials than the floor the synthetic evidence supports. */
  | 'insufficient_trials'
  /** The fit did not converge, or returned a non-finite estimate. */
  | 'fit_failed'
  /** The interval reaches down to or below the contamination floor. */
  | 'not_distinguishable_from_no_learning'
  /** The whole interval sits above the largest climb a non-learner produces on this path. */
  | 'separated_from_no_learning';

export interface LearningRateBounds {
  /** Lower end of the range, in scale points per trial. */
  readonly lower: number;
  /** Upper end of the range, same units. */
  readonly upper: number;
  /** `upper - lower`. The quantity that contracts as repetitions accumulate. */
  readonly width: number;
  /**
   * Posterior mode at the centre of the range. Diagnostic only — attenuated toward zero on a short
   * block and contaminated by the floor. Present so it can be logged and replayed; a caller that
   * renders this instead of the range has thrown away the only honest part.
   */
  readonly centre: number;
  /** Posterior SD of the climb from the fit. Half the width divided by {@link seMultiple}. */
  readonly posteriorSe: number;
  /** How many posterior SEs each side of the centre this range spans. */
  readonly seMultiple: number;
  /**
   * `lower - contaminationFloor`. Positive means the whole range clears the floor; zero or negative
   * is the overlap case. Exposed so the margin can be shown without recomputing the comparison.
   */
  readonly marginAboveFloor: number;
}

interface LearningRateIntervalBase {
  readonly trialCount: number;
  readonly minTrials: number;
  /** Echoed back so a rendered interval and the floor it was judged against cannot drift apart. */
  readonly contaminationFloor: number;
  /** Always true. A structural reminder that this is a labelled hypothesis, not a measure (D-030). */
  readonly hypothesis: true;
  /** Why this state, in enough detail to put in a diagnostic log. */
  readonly reason: string;
}

/**
 * A learning-rate range, or a first-class refusal to produce one.
 *
 * Discriminated on `state` so a caller cannot reach `bounds.lower` without having handled the cases
 * where there are no bounds, and cannot read `distinguishableFromNoLearning` as `false` on a block
 * that was merely too short — it is `null` there, because "we could not look" and "we looked and it
 * overlaps" are different findings and only one of them is about the child's block.
 */
export type LearningRateInterval =
  | (LearningRateIntervalBase & {
      readonly state: 'floor_undeclared' | 'insufficient_trials' | 'fit_failed';
      readonly bounds: null;
      readonly distinguishableFromNoLearning: null;
    })
  | (LearningRateIntervalBase & {
      readonly state: 'not_distinguishable_from_no_learning';
      readonly bounds: LearningRateBounds;
      readonly distinguishableFromNoLearning: false;
    })
  | (LearningRateIntervalBase & {
      readonly state: 'separated_from_no_learning';
      readonly bounds: LearningRateBounds;
      readonly distinguishableFromNoLearning: true;
    });

/**
 * NOTE what is absent: `mean` and `sd`, which `LearningRateReference` requires.
 *
 * That absence is the enforcement of "the interval is never a band name or a rank". With no
 * reference distribution in scope there is nothing to name a band against, so restoring band naming
 * would be a visible API change rather than a one-line default. The bank-recovery measurement is why that matters — better
 * precision on a contaminated estimate produces MORE false `above` verdicts, not fewer.
 */
export interface LearningRateIntervalOptions {
  /**
   * Largest climb this administration path fits for a child who learned nothing, in scale points
   * per trial. REQUIRED, with no default, for the reason D-200 gives: it is a property of a
   * specific bank, length and item format, and defaulting it would let a range that a non-learner
   * would also have produced be drawn as though it were a finding.
   * {@link MEASURED_CONTAMINATION_FLOOR_30_TRIALS} is the measured value for the purpose-built bank
   * at 30 trials.
   */
  readonly contaminationFloor: number;
  /** Trial-count floor. Defaults to {@link MIN_TRIALS_FOR_RATE}. */
  readonly minTrials?: number;
  /**
   * Half-width of the range in posterior SEs. Defaults to 1.
   *
   * 1 rather than 1.96 so the overlap test here uses the SAME error budget as
   * `learningRateReadout`'s separability test, which compares `lambdaSe + contaminationFloor`
   * against the band half-width. The two functions answer different questions and must not answer
   * them from different arithmetic. Widening this makes the overlap test strictly more
   * conservative, never less.
   */
  readonly seMultiple?: number;
  /** Passed straight through to the fit; use the same `slope`/`min`/`max` the standing estimate used. */
  readonly fit?: LearningCurveOptions;
}

function assertSeMultiple(seMultiple: number): void {
  if (!Number.isFinite(seMultiple) || seMultiple <= 0) {
    throw new RangeError(
      `seMultiple must be a finite positive number of posterior SEs; received ${String(seMultiple)}`,
    );
  }
}

function intervalFromFit(
  fit: LearningCurveEstimate,
  trialCount: number,
  minTrials: number,
  contaminationFloor: number,
  seMultiple: number,
): LearningRateInterval {
  const base = {
    trialCount,
    minTrials,
    contaminationFloor,
    hypothesis: true as const,
  };

  if (!fit.converged || !Number.isFinite(fit.lambda) || !Number.isFinite(fit.lambdaSe)) {
    return {
      ...base,
      state: 'fit_failed',
      bounds: null,
      distinguishableFromNoLearning: null,
      reason: 'learning-curve fit did not converge, so there is no range to report',
    };
  }

  const halfWidth = seMultiple * fit.lambdaSe;
  const lower = fit.lambda - halfWidth;
  const upper = fit.lambda + halfWidth;
  const bounds: LearningRateBounds = {
    lower,
    upper,
    width: upper - lower,
    centre: fit.lambda,
    posteriorSe: fit.lambdaSe,
    seMultiple,
    marginAboveFloor: lower - contaminationFloor,
  };

  // The comparison is against the LOWER end, not the centre. A centre above the floor with a lower
  // end below it describes a block whose evidence is entirely compatible with a child who learned
  // nothing, and the floor is systematic: unlike the SE it does not shrink toward the truth with
  // more trials, so waiting does not resolve an overlap on its own (the bank-recovery measurement §4).
  if (lower <= contaminationFloor) {
    return {
      ...base,
      state: 'not_distinguishable_from_no_learning',
      bounds,
      distinguishableFromNoLearning: false,
      reason:
        `range ${lower.toFixed(4)} to ${upper.toFixed(4)} reaches down to or below the ` +
        `${contaminationFloor.toFixed(4)} contamination floor, which is the climb this path fits ` +
        'for a child who learned nothing; not distinguishable from no learning',
    };
  }

  return {
    ...base,
    state: 'separated_from_no_learning',
    bounds,
    distinguishableFromNoLearning: true,
    reason:
      `range ${lower.toFixed(4)} to ${upper.toFixed(4)} sits entirely above the ` +
      `${contaminationFloor.toFixed(4)} contamination floor; separated from no learning, which is ` +
      'not a statement about how fast the climb is and carries no comparison to other children',
  };
}

/**
 * The learning rate as a range, with its own semantics attached.
 *
 * Only pass trials from the novel block. A mixed trace reintroduces the confound the block exists
 * to remove: while the standing estimate is still bracketing, difficulty solved rises as the search
 * converges, and this fit reads that as a climb.
 *
 * @throws RangeError if `seMultiple` is not a finite positive number.
 */
export function learningRateInterval(
  trials: readonly LearningTrial[],
  options: LearningRateIntervalOptions,
): LearningRateInterval {
  const {
    contaminationFloor,
    minTrials = MIN_TRIALS_FOR_RATE,
    seMultiple = 1,
    fit: fitOptions,
  } = options;
  assertSeMultiple(seMultiple);

  const base = {
    trialCount: trials.length,
    minTrials,
    contaminationFloor,
    hypothesis: true as const,
  };

  // Checked BEFORE the trial count on purpose. A missing floor is a caller defect that no number of
  // trials fixes, so reporting `insufficient_trials` first would hide it until trial 30 — by which
  // point a range is already being drawn somewhere.
  if (!Number.isFinite(contaminationFloor) || contaminationFloor < 0) {
    return {
      ...base,
      state: 'floor_undeclared',
      bounds: null,
      distinguishableFromNoLearning: null,
      reason:
        'no measured contamination floor was declared, so no range can be judged against the ' +
        'climb this path fits for a child who learned nothing (D-200)',
    };
  }

  if (trials.length < minTrials) {
    return {
      ...base,
      state: 'insufficient_trials',
      bounds: null,
      distinguishableFromNoLearning: null,
      reason:
        `block of ${String(trials.length)} trials is below the ${String(minTrials)}-trial floor; ` +
        'no shorter block reached usable recovery in synthetic work, so there is no range to draw',
    };
  }

  return intervalFromFit(
    estimateLearningCurve(trials, fitOptions),
    trials.length,
    minTrials,
    contaminationFloor,
    seMultiple,
  );
}

/**
 * One repetition's worth of the story: the interval so far, and how wide the posterior is.
 *
 * `posteriorSe` is populated from the first trials, while `interval.bounds` stays null until the
 * trial floor. That split is deliberate and it is the honest one. Precision is a property of the
 * BLOCK — how much the responses have pinned the climb down — and it is exactly what
 * {@link MEASURED_POSTERIOR_SE_LADDER} tabulates at 8 and 15 trials. A range is a statement about
 * the CHILD, and the evidence does not support one that early. A width with no centre cannot be
 * misread as a verdict; a centre with a width can.
 */
export interface LearningRateIntervalStep {
  readonly trialCount: number;
  /**
   * Posterior SD of the climb after this many trials, or null if the fit did not converge.
   * A precision figure, never a claim: there is no centre here.
   */
  readonly posteriorSe: number | null;
  /**
   * What {@link MEASURED_POSTERIOR_SE_LADDER} says to expect at this trial count, interpolated
   * between measured rungs. Null outside the ladder's range, because extrapolating a measured
   * curve past where it was measured is inventing a measurement.
   */
  readonly expectedPosteriorSe: number | null;
  readonly interval: LearningRateInterval;
}

/**
 * The interval's evolution, one step per repetition, so a consumer can watch the range contract.
 *
 * Refits from scratch at every prefix rather than updating incrementally: the fit is a joint MAP
 * over `(theta0, lambda)` whose mode moves with every response, so an incremental update would not
 * be the same estimator, and a second not-quite-identical estimator of this quantity is the exact
 * failure this module's header exists to prevent. Thirty refits of sixty iterations is nothing.
 *
 * @throws RangeError if `seMultiple` is not a finite positive number.
 */
export function learningRateIntervalSeries(
  trials: readonly LearningTrial[],
  options: LearningRateIntervalOptions,
): LearningRateIntervalStep[] {
  const {
    contaminationFloor,
    minTrials = MIN_TRIALS_FOR_RATE,
    seMultiple = 1,
    fit: fitOptions,
  } = options;
  assertSeMultiple(seMultiple);

  const steps: LearningRateIntervalStep[] = [];
  for (let count = 1; count <= trials.length; count += 1) {
    const prefix = trials.slice(0, count);
    const fit = estimateLearningCurve(prefix, fitOptions);
    const converged = fit.converged && Number.isFinite(fit.lambdaSe);

    const floorDeclared = Number.isFinite(contaminationFloor) && contaminationFloor >= 0;
    let interval: LearningRateInterval;
    if (!floorDeclared || count < minTrials) {
      // Re-derive the refusal through the public entry point so the two can never disagree about
      // which state a given prefix is in.
      interval = learningRateInterval(prefix, options);
    } else {
      interval = intervalFromFit(fit, count, minTrials, contaminationFloor, seMultiple);
    }

    steps.push({
      trialCount: count,
      posteriorSe: converged ? fit.lambdaSe : null,
      expectedPosteriorSe: expectedPosteriorSe(count),
      interval,
    });
  }
  return steps;
}

/**
 * The measured ladder read at an arbitrary trial count, by linear interpolation in log–log space.
 *
 * Log–log because the posterior SE of a slope falls roughly as a power of the trial count, so a
 * straight line between rungs in log space is a much better reader of the measured cells than one
 * in linear space. Returns null outside `[8, 60]`: the ladder was measured at five lengths and
 * extrapolating past them would be manufacturing a sixth.
 *
 * This is interpolation BETWEEN measurements, not itself a measurement. Plot the rungs as points if
 * the distinction matters, which it usually does.
 */
export function expectedPosteriorSe(
  trialCount: number,
  ladder: readonly PosteriorSeRung[] = MEASURED_POSTERIOR_SE_LADDER,
): number | null {
  if (!Number.isFinite(trialCount) || ladder.length === 0) return null;

  const first = ladder[0]!;
  const last = ladder[ladder.length - 1]!;
  if (trialCount < first.trials || trialCount > last.trials) return null;

  // Exact rungs are returned before any arithmetic runs. Interpolating to an endpoint would come
  // back off by a float epsilon, and a measured cell that does not compare equal to itself is how a
  // view ends up plotting a "measurement" nobody took.
  const exact = ladder.find((rung) => rung.trials === trialCount);
  if (exact !== undefined) return exact.meanPosteriorSe;

  for (let i = 0; i < ladder.length - 1; i += 1) {
    const rung = ladder[i]!;
    const next = ladder[i + 1]!;
    if (trialCount < rung.trials || trialCount > next.trials) continue;

    const t =
      (Math.log(trialCount) - Math.log(rung.trials)) /
      (Math.log(next.trials) - Math.log(rung.trials));
    const logSe =
      Math.log(rung.meanPosteriorSe) +
      t * (Math.log(next.meanPosteriorSe) - Math.log(rung.meanPosteriorSe));
    return Math.exp(logSe);
  }
  return null;
}
