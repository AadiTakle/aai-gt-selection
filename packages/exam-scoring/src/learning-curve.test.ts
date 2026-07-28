import { describe, expect, it } from 'vitest';

import {
  MIN_TRIALS_FOR_PROJECTION,
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
    const target = nextTargetTheta(trials, { standingEstimate: theta0, targetOffset, slope: SLOPE });
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
      climbers.push(estimateLearningCurve(simulateBlock(10, 0.1, 30, seed), { slope: SLOPE }).lambda);
      flats.push(estimateLearningCurve(simulateBlock(10, 0, 30, seed + 500), { slope: SLOPE }).lambda);
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
      (length) => estimateLearningCurve(simulateBlock(10, 0.1, length, 7), { slope: SLOPE }).lambdaSe,
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
        (_, s) => estimateLearningCurve(simulateBlock(10, trueLambda, 8, s), { slope: SLOPE }).lambda,
      ),
    );
    const long = mean(
      Array.from(
        { length: 60 },
        (_, s) => estimateLearningCurve(simulateBlock(10, trueLambda, 30, s), { slope: SLOPE }).lambda,
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

    const climbTarget = nextTargetTheta(climbing, { standingEstimate: 10, slope: SLOPE });
    const flatTarget = nextTargetTheta(flat, { standingEstimate: 10, slope: SLOPE });

    // The point of re-targeting: a fast child does not spend the back half of the block on items
    // they have outgrown, which is where the climb signal would be lost to a ceiling.
    expect(climbTarget).toBeGreaterThan(flatTarget);
    expect(climbTarget).toBeGreaterThan(10);
  });

  it('never asks for a difficulty off the scale', () => {
    const atCeiling = Array.from({ length: 30 }, (_, t) => ({
      difficulty: 20,
      score: 1,
      trialIndex: t,
    }));
    const target = nextTargetTheta(atCeiling, { standingEstimate: 20, targetOffset: 5, slope: SLOPE });
    expect(target).toBeLessThanOrEqual(SCALE_MAX);
    expect(target).toBeGreaterThanOrEqual(SCALE_MIN);
  });
});
