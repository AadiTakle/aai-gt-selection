import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GUESSING,
  MIN_TRIALS_FOR_PROJECTION,
  estimateBlockLevel,
  estimateLearningCurve,
  nextTargetTheta,
  type LearningTrial,
} from './learning-curve';
import { SCALE_MAX, SCALE_MIN } from './types';

/** Deterministic RNG so every assertion below is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SLOPE = 1;

/**
 * A block worked by a child whose ability is `theta0 + lambda * t`, served at difficulty that
 * tracks that climb. Mirrors what an administering caller does with `nextTargetTheta`.
 *
 * The simulated child has NO guessing floor, which is deliberate here and only here: the assertions
 * below encode E-095's published recovery ladder, and that ladder was measured against exactly this
 * responder. Reproducing it needs the same responder, not a better one. The five-option case — the
 * one a real block actually administers — is the `the guessing floor is not misspecified` block at
 * the bottom of this file, and `--fix-probe` in the harness reports it at cohort scale.
 */
function simulateBlock(
  theta0: number,
  lambda: number,
  length: number,
  seed: number,
  targetOffset = 1,
): LearningTrial[] {
  const rand = mulberry32(seed);
  const trials: LearningTrial[] = [];
  for (let t = 0; t < length; t += 1) {
    const target = nextTargetTheta(trials, {
      standingEstimate: theta0,
      targetOffset,
      slope: SLOPE,
      // The responder below has no floor, so the targeting rule is told the same thing. Leaving it
      // at `DEFAULT_GUESSING` would have the accuracy correction discount a fifth of the responses
      // as chance when none of them are, and aim about 1.4 points low throughout.
      guessing: 0,
    });
    const difficulty = Math.round(target * 2) / 2;
    const theta = theta0 + lambda * t;
    const p = 1 / (1 + Math.exp(-SLOPE * (theta - difficulty)));
    trials.push({ difficulty, score: rand() < p ? 1 : 0, trialIndex: t });
  }
  return trials;
}

/** A block at a FIXED difficulty, which is what the estimator sees when nothing is adapting. */
function fixedDifficultyBlock(
  theta0: number,
  lambda: number,
  difficulty: number,
  length: number,
  seed: number,
): LearningTrial[] {
  const rand = mulberry32(seed);
  const trials: LearningTrial[] = [];
  for (let t = 0; t < length; t += 1) {
    const theta = theta0 + lambda * t;
    const p = 1 / (1 + Math.exp(-SLOPE * (theta - difficulty)));
    trials.push({ difficulty, score: rand() < p ? 1 : 0, trialIndex: t });
  }
  return trials;
}

describe('estimateLearningCurve', () => {
  it('recovers a climbing child as positive and a flat child as near zero', () => {
    const climbers: number[] = [];
    const flats: number[] = [];

    for (let seed = 0; seed < 40; seed += 1) {
      climbers.push(
        estimateLearningCurve(simulateBlock(10, 0.1, 30, seed), { slope: SLOPE }).lambda,
      );
      flats.push(
        estimateLearningCurve(simulateBlock(10, 0, 30, seed + 500), { slope: SLOPE }).lambda,
      );
    }

    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

    // Averaged over children the sign is right and the magnitudes separate. Per-child the estimate
    // is far too noisy to assert on, which is exactly why the readout reports a band.
    expect(mean(climbers)).toBeGreaterThan(0.05);
    expect(Math.abs(mean(flats))).toBeLessThan(0.02);
    expect(mean(climbers)).toBeGreaterThan(mean(flats));
  });

  it('reports a posterior SE that narrows as the block lengthens', () => {
    const ses = [8, 15, 30, 60].map(
      (length) =>
        estimateLearningCurve(simulateBlock(10, 0.1, length, 7), { slope: SLOPE }).lambdaSe,
    );

    for (let i = 1; i < ses.length; i += 1) {
      expect(ses[i]!).toBeLessThan(ses[i - 1]!);
    }
    for (const se of ses) expect(Number.isFinite(se)).toBe(true);
  });

  it('is attenuated at 8 trials and unattenuated by 30 — the reason for the trial floor', () => {
    const trueLambda = 0.1;
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

    const short = mean(
      Array.from(
        { length: 60 },
        (_, s) =>
          estimateLearningCurve(simulateBlock(10, trueLambda, 8, s), { slope: SLOPE }).lambda,
      ),
    );
    const long = mean(
      Array.from(
        { length: 60 },
        (_, s) =>
          estimateLearningCurve(simulateBlock(10, trueLambda, 30, s), { slope: SLOPE }).lambda,
      ),
    );

    // An 8-trial block does not merely measure imprecisely, it measures small: the prior dominates
    // and pulls the estimate most of the way to zero. A 30-trial block recovers the magnitude.
    expect(short).toBeLessThan(trueLambda * 0.6);
    expect(long).toBeGreaterThan(trueLambda * 0.6);
  });

  it('returns a null-ish climb for an empty block rather than throwing', () => {
    const fit = estimateLearningCurve([], { slope: SLOPE });
    expect(fit.lambda).toBe(0);
    expect(Number.isFinite(fit.lambdaSe)).toBe(true);
  });

  it('scores a stored block identically on every replay', () => {
    const trials = simulateBlock(10, 0.08, 30, 99);
    const a = estimateLearningCurve(trials, { slope: SLOPE });
    const b = estimateLearningCurve(trials, { slope: SLOPE });
    expect(a).toEqual(b);
    // Bit-for-bit, not merely close: a stored trace has to re-score exactly (BUILD_PLAN §5).
    expect(a.lambda).toBe(b.lambda);
    expect(a.theta0).toBe(b.theta0);
  });

  it('keeps theta0 on the reportable scale', () => {
    // A child correct on everything served: the likelihood alone is unbounded upward.
    const trials: LearningTrial[] = Array.from({ length: 30 }, (_, t) => ({
      difficulty: 19,
      score: 1,
      trialIndex: t,
    }));
    const fit = estimateLearningCurve(trials, { slope: SLOPE });
    expect(fit.theta0).toBeGreaterThanOrEqual(SCALE_MIN);
    expect(fit.theta0).toBeLessThanOrEqual(SCALE_MAX);
  });

  it('treats a guessing floor as ability when it is left at zero', () => {
    // A child well below the items who still scores on a quarter of them by chance.
    const rand = mulberry32(31);
    const difficulty = 15;
    const trials: LearningTrial[] = Array.from({ length: 30 }, (_, t) => ({
      difficulty,
      score: rand() < 0.25 ? 1 : 0,
      trialIndex: t,
    }));

    const ignoringGuessing = estimateLearningCurve(trials, { slope: SLOPE, guessing: 0 });
    const modellingGuessing = estimateLearningCurve(trials, { slope: SLOPE, guessing: 0.25 });

    // With c=0 those lucky successes can only be explained as ability, so theta0 is pulled up.
    // Modelling the floor attributes them to chance instead and places the child lower.
    expect(modellingGuessing.theta0).toBeLessThan(ignoringGuessing.theta0);
  });
});

/**
 * The guard on the two corrections that keep a static child from fitting a climb (E-200, E-205).
 *
 * This exists because the defect it catches was invisible to every other test in this file. Each of
 * those simulates a responder with NO guessing floor, so a fit that assumes no floor agrees with
 * them perfectly; the misspecification only shows up against a responder that has one. And it only
 * shows up at COHORT scale: for any single child the manufactured climb is inside the noise, which
 * is exactly why it reached `dev`.
 *
 * There are two corrections and they are independent, so the cohort is run as a 2 × 2 and the
 * assertions are a matched set. Reverting EITHER one on its own has to break the gate, or a test
 * that passes is not evidence that both are load-bearing.
 *
 * The pass condition is Gate A's own A1 (`STAGE2_QUESTION_DESIGN` §4.1.2): the fitted λ
 * distribution is centred on zero within Monte-Carlo error, `|λ̄| ≤ 2 SE`. It is used here in
 * preference to a fixed bound because the bound would be a number chosen to pass — and because
 * this file should assert the same condition the gate does, so a change that clears the test and
 * fails the gate is not possible.
 */
describe('a cohort that learned nothing does not fit a climb', () => {
  const FIVE_OPTION_FLOOR = 1 / 5;
  const CHILDREN = 400;
  const LENGTH = 30;

  /** The rule this module shipped before D-206: aim at the ability PROJECTED for the next trial. */
  function projectingTarget(
    trials: readonly LearningTrial[],
    standing: number,
    guessing: number,
  ): number {
    if (trials.length < MIN_TRIALS_FOR_PROJECTION) {
      return Math.min(SCALE_MAX, Math.max(SCALE_MIN, standing + 1));
    }
    const fit = estimateLearningCurve(trials, {
      slope: SLOPE,
      priorTheta0Mean: standing,
      guessing,
    });
    const projected = fit.theta0 + fit.lambda * trials.length + 1;
    return Math.min(SCALE_MAX, Math.max(SCALE_MIN, projected));
  }

  interface NullCohort {
    mean: number;
    /** Monte-Carlo SE of that mean, which is what "centred on zero" has to be judged against. */
    se: number;
  }

  const cache = new Map<string, NullCohort>();

  /**
   * Fitted λ over a cohort of children who learn NOTHING, run through the real closed loop.
   *
   * The loop is the point: the difficulty of each trial is chosen from the fit so far, so the
   * estimator's own output decides what evidence it sees next. Serving a fixed difficulty instead
   * makes this metric ~0 under every combination below, which is why the simulation has to
   * re-target rather than walk a preset ladder.
   */
  function nullCohort(fitGuessing: number, projecting: boolean): NullCohort {
    const key = `${fitGuessing}|${projecting}`;
    const hit = cache.get(key);
    if (hit) return hit;

    const fitted: number[] = [];
    for (let c = 0; c < CHILDREN; c += 1) {
      const rand = mulberry32(9000 + c);
      // Spread the cohort over the scale so the result is not a property of one starting point,
      // and hand over a standing estimate that is close but not exact, as Phase 1 does.
      const theta0 = 7 + 7 * rand();
      const standing = theta0 + 1.5 * (rand() - 0.5) * 2;
      const trials: LearningTrial[] = [];

      for (let t = 0; t < LENGTH; t += 1) {
        const target = projecting
          ? projectingTarget(trials, standing, fitGuessing)
          : nextTargetTheta(trials, {
              standingEstimate: standing,
              targetOffset: 1,
              slope: SLOPE,
              guessing: fitGuessing,
            });
        const difficulty = Math.round(target * 2) / 2;
        // λ_true = 0: ability never moves. The five-option floor is the child's, not the fit's.
        const star = 1 / (1 + Math.exp(-SLOPE * (theta0 - difficulty)));
        const p = FIVE_OPTION_FLOOR + (1 - FIVE_OPTION_FLOOR) * star;
        trials.push({ difficulty, score: rand() < p ? 1 : 0, trialIndex: t });
      }

      fitted.push(
        estimateLearningCurve(trials, {
          slope: SLOPE,
          priorTheta0Mean: standing,
          guessing: fitGuessing,
        }).lambda,
      );
    }

    const mean = fitted.reduce((a, b) => a + b, 0) / fitted.length;
    const variance = fitted.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (fitted.length - 1);
    const result = { mean, se: Math.sqrt(variance / fitted.length) };
    cache.set(key, result);
    return result;
  }

  const centredOnZero = (c: NullCohort): boolean => Math.abs(c.mean) <= 2 * c.se;

  it('pins the default to the five-option chance rate', () => {
    expect(DEFAULT_GUESSING).toBeCloseTo(FIVE_OPTION_FLOOR, 10);
  });

  it('is centred on zero with both corrections in place', () => {
    expect(centredOnZero(nullCohort(DEFAULT_GUESSING, false))).toBe(true);
  });

  // The three teeth. Each reverts one correction and asserts the gate fails, so neither correction
  // can be removed on the grounds that the tests still pass.
  it('fails once the guessing floor is reverted to zero (D-200)', () => {
    const reverted = nullCohort(0, false);
    expect(centredOnZero(reverted)).toBe(false);
    expect(reverted.mean).toBeGreaterThan(0);
  });

  it('fails once the targeting rule extrapolates its own fitted climb (D-206)', () => {
    const reverted = nullCohort(DEFAULT_GUESSING, true);
    expect(centredOnZero(reverted)).toBe(false);
    expect(reverted.mean).toBeGreaterThan(0);
  });

  it('is worst with both reverted, and each correction removes part of it', () => {
    const both = nullCohort(0, true).mean;
    const floorOnly = nullCohort(DEFAULT_GUESSING, true).mean;
    const targetingOnly = nullCohort(0, false).mean;
    const corrected = Math.abs(nullCohort(DEFAULT_GUESSING, false).mean);

    expect(both).toBeGreaterThan(floorOnly);
    expect(both).toBeGreaterThan(targetingOnly);
    expect(floorOnly).toBeGreaterThan(corrected);
    expect(targetingOnly).toBeGreaterThan(corrected);
  });
});

describe('estimateBlockLevel', () => {
  it('locates a child between the hardest item passed and the easiest item missed', () => {
    const trials: LearningTrial[] = [
      ...Array.from({ length: 10 }, (_, t) => ({ difficulty: 8, score: 1, trialIndex: t })),
      ...Array.from({ length: 10 }, (_, t) => ({ difficulty: 14, score: 0, trialIndex: t + 10 })),
    ];
    const level = estimateBlockLevel(trials, { slope: SLOPE, priorTheta0Mean: 11 });
    expect(level).toBeGreaterThan(8);
    expect(level).toBeLessThan(14);
  });

  it('reads a climb as a level somewhere inside it, not as the endpoint', () => {
    // The lag that makes D-206's accuracy correction necessary, asserted rather than described: a
    // fit with no climb term over a climbing child lands inside the range they worked, so a target
    // taken from the level ALONE trails rather than leads.
    const climbing = simulateBlock(10, 0.15, 24, 5);
    const level = estimateBlockLevel(climbing, { slope: SLOPE, priorTheta0Mean: 10 });
    expect(level).toBeGreaterThan(10);
    expect(level).toBeLessThan(10 + 0.15 * 24);
  });

  it('stays on the reportable scale for a one-sided block', () => {
    const allCorrect: LearningTrial[] = Array.from({ length: 30 }, (_, t) => ({
      difficulty: 19,
      score: 1,
      trialIndex: t,
    }));
    const level = estimateBlockLevel(allCorrect, { slope: SLOPE, priorTheta0Mean: 19 });
    expect(level).toBeGreaterThanOrEqual(SCALE_MIN);
    expect(level).toBeLessThanOrEqual(SCALE_MAX);
  });

  it('places a child lower once their chance successes are modelled as chance', () => {
    const rand = mulberry32(31);
    const trials: LearningTrial[] = Array.from({ length: 30 }, (_, t) => ({
      difficulty: 15,
      score: rand() < 0.25 ? 1 : 0,
      trialIndex: t,
    }));
    const floorless = estimateBlockLevel(trials, { slope: SLOPE, guessing: 0 });
    const floored = estimateBlockLevel(trials, { slope: SLOPE, guessing: 0.25 });
    expect(floored).toBeLessThan(floorless);
  });

  it('re-fits a stored block bit-for-bit', () => {
    const trials = simulateBlock(10, 0.08, 30, 99);
    expect(estimateBlockLevel(trials, { slope: SLOPE })).toBe(
      estimateBlockLevel(trials, { slope: SLOPE }),
    );
  });
});

describe('nextTargetTheta', () => {
  it('holds at the standing estimate plus the offset until a projection is possible', () => {
    for (let n = 0; n < MIN_TRIALS_FOR_PROJECTION; n += 1) {
      const trials = fixedDifficultyBlock(10, 0.1, 11, n, 3);
      expect(nextTargetTheta(trials, { standingEstimate: 12, targetOffset: 1, slope: SLOPE })).toBe(
        13,
      );
    }
  });

  it('follows a climbing child upward, and does not drift for a flat one', () => {
    const climbing = simulateBlock(10, 0.15, 24, 11);
    const flat = simulateBlock(10, 0, 24, 11);

    // Same floor and offset the blocks were served under; the accuracy correction is relative to
    // the accuracy the offset is designed to hold, so asking with a different one asks a different
    // question.
    const options = { standingEstimate: 10, targetOffset: 1, slope: SLOPE, guessing: 0 };
    const climbTarget = nextTargetTheta(climbing, options);
    const flatTarget = nextTargetTheta(flat, options);

    // The point of re-targeting: a fast child does not spend the back half of the block on items
    // they have outgrown, which is where the climb signal would be lost to a ceiling.
    expect(climbTarget).toBeGreaterThan(flatTarget);
    expect(climbTarget).toBeGreaterThan(10);
  });

  it('aims off the fitted level and not off an extrapolation of the fitted climb (D-206)', () => {
    const climbing = simulateBlock(10, 0.15, 24, 11);
    const options = { standingEstimate: 10, targetOffset: 1, slope: SLOPE, guessing: 0 };
    const target = nextTargetTheta(climbing, options);
    const level = estimateBlockLevel(climbing, { slope: SLOPE, priorTheta0Mean: 10, guessing: 0 });
    const fit = estimateLearningCurve(climbing, {
      slope: SLOPE,
      priorTheta0Mean: 10,
      guessing: 0,
    });

    // The level fit plus the offset is the anchor; everything else is the accuracy correction,
    // which is bounded by the continuity-corrected inversion of an eight-trial window.
    expect(target - (level + 1)).toBeLessThan(3);
    expect(target - (level + 1)).toBeGreaterThan(-3);
    // And it is nowhere near the rule this replaced, so the block is not one where the projecting
    // rule and this one happen to coincide.
    expect(target).not.toBeCloseTo(fit.theta0 + fit.lambda * climbing.length + 1, 3);
  });

  it('is driven by observed accuracy and not by the fitted climb (D-206)', () => {
    // The discriminating test for the constraint the correction exists under. Permuting the trials
    // BEFORE the accuracy window leaves the level fit untouched — it sums over trials and never
    // reads `trialIndex` — and leaves the window itself untouched by construction, while moving
    // the fitted `lambda` a long way. A rule that reads the fitted climb has to move with it.
    const block = simulateBlock(10, 0.15, 24, 11);
    const head = block.slice(0, block.length - 8);
    const tail = block.slice(block.length - 8);
    const reindex = (trials: LearningTrial[]): LearningTrial[] =>
      trials.map((trial, index) => ({ ...trial, trialIndex: index }));

    const ascending = reindex([...[...head].sort((a, b) => a.score - b.score), ...tail]);
    const descending = reindex([...[...head].sort((a, b) => b.score - a.score), ...tail]);

    const options = { standingEstimate: 10, targetOffset: 1, slope: SLOPE, guessing: 0 };
    const fitted = (trials: LearningTrial[]): number =>
      estimateLearningCurve(trials, { slope: SLOPE, priorTheta0Mean: 10, guessing: 0 }).lambda;

    // Sorting the head by score is the largest swing in fitted slope the same responses can produce.
    expect(fitted(ascending) - fitted(descending)).toBeGreaterThan(0.1);
    expect(nextTargetTheta(ascending, options)).toBeCloseTo(
      nextTargetTheta(descending, options),
      10,
    );
  });

  it('corrects in both directions rather than only pushing forward (D-206)', () => {
    // A child answering at exactly the accuracy the offset is designed to produce gets no
    // correction; above it the aim rises, below it the aim falls. The downward half is what stops
    // response noise ratcheting a static child's difficulty upward, which is the failure the
    // rectified form of this correction was measured to have (E-206).
    const atTarget = DEFAULT_GUESSING + (1 - DEFAULT_GUESSING) * (1 / (1 + Math.exp(1)));
    // Partial credit rather than 0/1, so the window can hold the target accuracy exactly instead of
    // rounding to the nearest eighth.
    const held = (accuracy: number): LearningTrial[] =>
      Array.from({ length: 8 }, (_, t) => ({ difficulty: 11, score: accuracy, trialIndex: t }));
    const options = { standingEstimate: 10, targetOffset: 1, slope: SLOPE };
    const aimFor = (accuracy: number): number =>
      nextTargetTheta(held(accuracy), options) -
      estimateBlockLevel(held(accuracy), { slope: SLOPE, priorTheta0Mean: 10 });

    expect(aimFor(atTarget)).toBeCloseTo(1, 1);
    expect(aimFor(atTarget + 0.25)).toBeGreaterThan(aimFor(atTarget) + 0.5);
    expect(aimFor(atTarget - 0.25)).toBeLessThan(aimFor(atTarget) - 0.5);
  });

  it('stays on the scale when a window is answered perfectly or not at all', () => {
    // The inversion runs to infinity at either boundary; the continuity correction is what keeps
    // the aim finite, and the clamp is the backstop rather than the mechanism.
    for (const score of [0, 1]) {
      const degenerate = Array.from({ length: 12 }, (_, t) => ({
        difficulty: 11,
        score,
        trialIndex: t,
      }));
      const target = nextTargetTheta(degenerate, {
        standingEstimate: 11,
        targetOffset: 1,
        slope: SLOPE,
      });
      expect(Number.isFinite(target)).toBe(true);
      expect(target).toBeLessThanOrEqual(SCALE_MAX);
      expect(target).toBeGreaterThanOrEqual(SCALE_MIN);
    }
  });

  it('never asks for a difficulty off the scale', () => {
    const atCeiling = Array.from({ length: 30 }, (_, t) => ({
      difficulty: 20,
      score: 1,
      trialIndex: t,
    }));
    const target = nextTargetTheta(atCeiling, {
      standingEstimate: 20,
      targetOffset: 5,
      slope: SLOPE,
    });
    expect(target).toBeLessThanOrEqual(SCALE_MAX);
    expect(target).toBeGreaterThanOrEqual(SCALE_MIN);
  });
});
