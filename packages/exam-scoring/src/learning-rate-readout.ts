/**
 * Turning a fitted climb into something reportable — or declining to.
 *
 * WHY A BAND AND NOT A NUMBER, and what a 30-trial block actually buys. Recovery of an injected
 * climb on this scale, measured over 400 simulated children per cell at `slope: 1.0` with
 * adaptively-targeted difficulty, a 0.5-point item grid, and a deliberately noisy standing
 * handover:
 *
 *     trials |    8   |   15   |   30   |   45   |   60
 *     r      | 0.066  | 0.183  | 0.448  | 0.746  | 0.862      (population lambda SD 0.03)
 *     mean SE| 0.138  | 0.101  | 0.047  | 0.026  | 0.017
 *     fit/true 0.22   | 0.57   | 0.98   | 1.02   | 0.97       (attenuation toward zero)
 *
 * READ THAT TABLE WITH ONE CORRECTION, which is load-bearing rather than pedantic. Every cell was
 * measured against a simulated child with NO guessing floor — a child who, on an item far above
 * their level, scores zero. That describes a constructed-response item. Every item the block is
 * actually administered from is five-option multiple choice, where the same child scores 0.2. Rerun
 * against a five-option responder with the floor correctly specified in the fit, the 30-trial cell
 * is r = 0.254 and mean SE = 0.062 on the same idealised grid — barely half the recovery, on a
 * quarter more uncertainty — and r = 0.249 / SE = 0.072 on `FLU-MATRIX-01`. Reaching the published
 * 30-trial recovery takes about 45 trials on an ideal grid, and on that bank 60 trials do not reach
 * it. E-200 records the reproduction; `pnpm exam:block-harness -- --calibrate --guessing 0.2` is the
 * command. The table above is kept because it is what E-095 published, not because it describes the
 * block as administered.
 *
 * Two things follow. First, a short block does not merely measure imprecisely, it measures almost
 * nothing: at 8 trials the estimate correlates with truth at r = 0.07 AND is attenuated to about a
 * fifth of its true size. Second, `r` is not a property of the estimator alone — it depends on how
 * much children actually differ, which nobody knows. At a wider spread (SD 0.10) the same 30-trial
 * block reaches r = 0.885. So 30 is justified by what IS invariant across those assumptions: it is
 * where the posterior SE stops falling steeply and where attenuation disappears. It is a floor,
 * not a comfortable length; 45 to 60 trials is where the statistic becomes genuinely sharp, and
 * that trade is a decision about a child's time rather than a statistical one.
 *
 * WHY `indeterminate` IS A FIRST-CLASS ANSWER: an estimate cannot be placed in a band narrower
 * than its own uncertainty. At 30 trials the SE is about 0.047, so bands only separate once the
 * reference SD exceeds roughly 0.10 — at the SD 0.03 that synthetic work explored, the half-width
 * is 0.015 and the SE is three times wider. Both things are true at once: the statistic can rank a
 * cohort it measured while being unable to place an individual on an absolute scale. So
 * `learningRateReadout` returns `indeterminate` at 30 trials for any honest small-spread
 * reference, and that is the correct answer rather than a bug to tune away.
 * `learningRateCohortRank` is the question that IS supported at that length.
 *
 * AND THERE WAS A SECOND, SYSTEMATIC REASON, added by E-200 and largely removed by E-205.
 * `lambdaSe` is random error. A closed adaptive loop also had a bias that no averaging removes: the
 * fit picked the next difficulty, so a fit that reads chance successes as ability walked the
 * difficulty up and read its own walk back as a climb. On a cohort that learned nothing at all,
 * that mechanism alone fitted λ̄ = 0.0398 with the guessing floor at 0 and still 0.0097 ± 0.0011
 * with it correct.
 *
 * D-206 opened the loop — the targeting rule aims at a fit with no climb term, so the estimate of
 * `lambda` no longer chooses the evidence for `lambda` — and the same cohort now fits −0.0007 ±
 * 0.0008 on `FLU-OPCHAIN-01`, which is the value a FROZEN difficulty returns. The floor a caller
 * has to declare on the four Stage 2 banks is therefore approximately zero rather than 0.01, and
 * the `indeterminate` rate against the wide SD-0.15 reference with the floor declared falls from
 * 32.8% to 5.8% at 30 trials.
 *
 * NONE OF THAT MAKES A RATE REPORTABLE, and the field below is still required. Against the SD-0.03
 * reference — the only one in this project with a stated provenance — every arm at every length
 * from 30 to 60 trials is still 100% `indeterminate`, before and after. What changed is that the
 * refusal is now honest random error rather than random error plus a manufactured floor.
 *
 * WHY THIS IS NOT IN THE SCORED DECISION: a within-session learning rate is a labelled hypothesis.
 * Nothing here has been shown to predict real learning, acceleration, or program benefit. Keeping
 * it out of the decision payload means adopting it later has to be someone's explicit choice
 * rather than something that already happened quietly.
 *
 * D-030 records the decision; E-095 records the measurements quoted above and the open assumption
 * that no reference distribution for lambda exists.
 */
import {
  estimateLearningCurve,
  type LearningCurveOptions,
  type LearningTrial,
} from './learning-curve';

/**
 * Trials below which no rate is reported. See the table above for what this length buys.
 *
 * The block is ONE domain deep rather than four shallow ones. Splitting the same item budget four
 * ways scored worse in synthetic work, and the table above says why: recovery collapses much faster
 * than linearly as a block shortens, so four 15-trial blocks (r = 0.18 each) average to less than
 * one 30-trial block, at twice the items.
 *
 * Restated here rather than imported from `@gt-selection/exam-engine` because the two packages are
 * intentionally independent (BUILD_PLAN §7), the same convention `derived-metrics.ts` follows.
 */
export const MIN_TRIALS_FOR_RATE = 30;

export type LearningRateBand = 'below' | 'typical' | 'above' | 'indeterminate';

export interface LearningRateReference {
  /**
   * Centre of the comparison distribution, in scale points per trial.
   *
   * REQUIRED, with no default, on purpose. No validated reference distribution for a
   * within-session learning rate exists to copy, and defaulting to a synthetic value would let a
   * made-up number reach a results screen without anyone choosing it. Supplying this is an
   * assertion that the caller knows where it came from.
   */
  readonly mean: number;
  /** Spread of the comparison distribution, same units. Required for the same reason as `mean`. */
  readonly sd: number;
  /**
   * Largest climb this administration path is known to fit for a child who learned NOTHING, in the
   * same units — the pipeline's own systematic floor, not a property of any child.
   *
   * REQUIRED, and required for a sharper reason than `mean` and `sd`. The fit's `lambdaSe` describes
   * random error only. An adaptive block can also carry a SYSTEMATIC error that no amount of
   * averaging removes, and this one did: while the targeting rule extrapolated the fitted climb, a
   * fit that reads chance successes as ability walked the served difficulty up and then read its
   * own walk as a climb. Measured on a cohort with λ_true = 0 for every child, 30 trials,
   * five-option responder, that floor was 0.0097 ± 0.0011 on `FLU-OPCHAIN-01` and 0.0183 ± 0.0035
   * on `FLU-MATRIX-01` even with the guessing floor correctly specified (E-200).
   *
   * WHAT IT IS NOW, AND WHY THE FIELD STAYS REQUIRED. Under D-206's targeting rule the same
   * measurement returns −0.0007 ± 0.0008 on `FLU-OPCHAIN-01`, −0.0010 on `SPA-XFORM-01`, −0.0034 on
   * `QUANT-GLYPHNUM-01` and −0.0027 on `VER-MORPHO-01` at its own four-option floor (E-205). Those
   * are measured zeros, not assumed ones, and the difference is the whole point of the field: a
   * caller on a different bank, length or item format has no basis for reading this paragraph and
   * passing 0. `FLU-MATRIX-01` is the standing counter-example — a mixed-format bank whose floor
   * was three times the purpose-built one's.
   *
   * Banding an estimate against a half-width narrower than the floor names a band that a
   * non-learner would also have been given, which is the failure E-200 exists to prevent. Supplying
   * this is an assertion that the caller has MEASURED it for their own bank, length and item format
   * — `pnpm exam:block-harness -- --fix-probe` is what measures it. Pass 0 only when the harness
   * has been run and measured no floor.
   */
  readonly contaminationFloor: number;
  /**
   * Band half-width in reference SDs. Default 0.5, so `typical` spans one SD centred on the mean
   * and the outer bands begin beyond it.
   */
  readonly bandHalfWidthSds?: number;
}

export interface LearningRateReadoutOptions {
  readonly reference: LearningRateReference;
  /** Trial-count floor. Lowering it below the default is not supported by the synthetic evidence. */
  readonly minTrials?: number;
  /** Passed through to the fit; use the same `slope`/`min`/`max` the standing estimate used. */
  readonly fit?: LearningCurveOptions;
}

export interface LearningRateReadout {
  readonly band: LearningRateBand;
  /**
   * Posterior-mode climb in scale points per trial. Diagnostic only — shrunk toward zero and too
   * noisy to display. Present so it can be logged, replayed, and calibrated against later; not so
   * it can be shown to a family.
   */
  readonly lambdaDiagnostic: number | null;
  readonly lambdaSe: number | null;
  readonly trialCount: number;
  /** Always true. A structural reminder at the call site that this is a hypothesis, not a measure. */
  readonly hypothesis: true;
  /** Why the band came out as it did — especially why it is `indeterminate`. */
  readonly reason: string;
}

/**
 * Fit the climb over a novel block and place it in an ordinal band.
 *
 * Returns `indeterminate` whenever the block is too short, the fit did not converge, or the
 * posterior is too wide to separate the bands. That last case is the important one: an estimate
 * whose uncertainty exceeds the band width cannot tell `above` from `typical`, and reporting one
 * anyway is how a noisy number becomes a confident-sounding claim about a child.
 *
 * Only pass trials from the novel block. Feeding it a mixed trace reintroduces the confound the
 * block exists to remove: while the standing estimate is still bracketing, difficulty solved rises
 * as the search converges, which this fit would read as a climb.
 */
export function learningRateReadout(
  trials: readonly LearningTrial[],
  options: LearningRateReadoutOptions,
): LearningRateReadout {
  const { reference, minTrials = MIN_TRIALS_FOR_RATE, fit: fitOptions } = options;
  const { mean, sd, contaminationFloor, bandHalfWidthSds = 0.5 } = reference;

  const base = { trialCount: trials.length, hypothesis: true as const };

  if (trials.length < minTrials) {
    return {
      ...base,
      band: 'indeterminate',
      lambdaDiagnostic: null,
      lambdaSe: null,
      reason: `block of ${trials.length} trials is below the ${minTrials}-trial floor; no shorter block reached usable recovery in synthetic work`,
    };
  }

  if (!(sd > 0)) {
    return {
      ...base,
      band: 'indeterminate',
      lambdaDiagnostic: null,
      lambdaSe: null,
      reason: 'reference SD must be positive to define band edges',
    };
  }

  if (!Number.isFinite(contaminationFloor) || contaminationFloor < 0) {
    return {
      ...base,
      band: 'indeterminate',
      lambdaDiagnostic: null,
      lambdaSe: null,
      reason:
        'reference is missing a measured contamination floor; no band can be named without one',
    };
  }

  const fit = estimateLearningCurve(trials, fitOptions);

  if (!fit.converged || !Number.isFinite(fit.lambda)) {
    return {
      ...base,
      band: 'indeterminate',
      lambdaDiagnostic: null,
      lambdaSe: null,
      reason: 'learning-curve fit did not converge',
    };
  }

  const halfWidth = bandHalfWidthSds * sd;
  const common = { ...base, lambdaDiagnostic: fit.lambda, lambdaSe: fit.lambdaSe };

  // The separability test is against the TOTAL error budget, random plus systematic. Testing
  // `lambdaSe` alone treats a known, signed, non-averaging bias as if it were not there, and it is
  // the larger of the two problems on a short block: at 30 trials the contamination floor is a
  // quarter of the posterior SE, and unlike the SE it does not shrink toward the truth.
  const errorBudget = fit.lambdaSe + contaminationFloor;
  if (errorBudget >= halfWidth) {
    return {
      ...common,
      band: 'indeterminate',
      reason:
        `posterior SE ${fit.lambdaSe.toFixed(4)} plus the ${contaminationFloor.toFixed(4)} contamination floor ` +
        `is at or wider than the ${halfWidth.toFixed(4)} band half-width; bands are not separable at this precision`,
    };
  }

  if (fit.lambda > mean + halfWidth) {
    return { ...common, band: 'above', reason: 'climb above the reference band' };
  }

  if (fit.lambda < mean - halfWidth) {
    return { ...common, band: 'below', reason: 'climb below the reference band' };
  }

  return { ...common, band: 'typical', reason: 'climb within the reference band' };
}

export interface CohortRank {
  /** Fraction of the cohort this child's climb exceeded, in [0, 1]. */
  readonly percentile: number;
  readonly cohortSize: number;
  /** Always true: still a hypothesis, merely a supportable one. */
  readonly hypothesis: true;
}

/**
 * Rank one child's climb against a cohort of climbs measured the same way.
 *
 * This is the comparative question that survives at a realistic block length, where
 * `learningRateReadout` correctly refuses to answer the absolute one. The position is ordinal —
 * "toward the faster end of this group" — and carries no claim that the child would land in the
 * same place against a different group, a different form, or a different day.
 *
 * Returns `null` below a floor of 20, because ranking against a handful of peers is noise dressed
 * as a percentile.
 */
export function learningRateCohortRank(
  lambda: number,
  cohortLambdas: readonly number[],
): CohortRank | null {
  const cohort = cohortLambdas.filter((value) => Number.isFinite(value));

  const MIN_COHORT = 20;
  if (cohort.length < MIN_COHORT || !Number.isFinite(lambda)) return null;

  const below = cohort.filter((value) => value < lambda).length;
  const tied = cohort.filter((value) => value === lambda).length;

  return {
    percentile: (below + tied / 2) / cohort.length,
    cohortSize: cohort.length,
    hypothesis: true,
  };
}
