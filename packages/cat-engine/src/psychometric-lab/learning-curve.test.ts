import { describe, expect, it } from 'vitest';

import { probabilityCorrect } from '../irt';
import { hashSeed, mulberry32 } from '../rng';
import type { IrtParameters } from '../types';

import {
  blockHalfContrast,
  estimateLearningCurve,
  threePlResiduals,
  trialsToCriterion,
  type LearningTrial,
} from './learning-curve';

const item = (b: number, a = 1.2, c = 0.25): IrtParameters => ({ a, b, c, model: '3PL' });

/** A block held at a constant difficulty, generated from a known climb. */
function simulateBlock(
  seed: string,
  theta0: number,
  lambda: number,
  length: number,
  difficulty: number,
): LearningTrial[] {
  const rand = mulberry32(hashSeed(seed));
  return Array.from({ length }, (_, t) => {
    const irt = item(difficulty);
    return {
      irt,
      trialIndex: t,
      correct: rand() < probabilityCorrect(theta0 + lambda * t, irt),
    };
  });
}

describe('estimateLearningCurve', () => {
  it('returns the prior when there are no trials', () => {
    const estimate = estimateLearningCurve([], { priorTheta0Mean: 0.4, priorLambdaMean: 0.02 });
    expect(estimate.theta0).toBeCloseTo(0.4, 6);
    expect(estimate.lambda).toBeCloseTo(0.02, 6);
  });

  it('recovers a large injected lambda from a long block at constant difficulty', () => {
    // 200 trials and lambda = 0.05 is far outside any proposed form length; the
    // point is that the estimator is correct where it has power, so a null on a
    // short block is a power statement and not a broken estimator.
    const trials = simulateBlock('learning-curve-recovery', -1.0, 0.05, 200, 0.5);
    const estimate = estimateLearningCurve(trials, { priorLambdaSd: 0.5 });
    expect(estimate.lambda).toBeGreaterThan(0.02);
    expect(estimate.lambda).toBeLessThan(0.09);
    expect(estimate.theta0).toBeGreaterThan(-2);
    expect(estimate.theta0).toBeLessThan(0);
  });

  it('does not invent a climb when the truth is flat', () => {
    const trials = simulateBlock('learning-curve-flat', 0.3, 0, 200, 0.3);
    const estimate = estimateLearningCurve(trials, { priorLambdaSd: 0.5 });
    expect(Math.abs(estimate.lambda)).toBeLessThan(0.015);
  });

  it('orders two blocks that differ only in when the successes arrive', () => {
    const irt = item(0.2);
    const late: LearningTrial[] = [false, false, false, true, true, true].map((correct, t) => ({
      irt,
      correct,
      trialIndex: t,
    }));
    const early: LearningTrial[] = [true, true, true, false, false, false].map((correct, t) => ({
      irt,
      correct,
      trialIndex: t,
    }));
    expect(estimateLearningCurve(late).lambda).toBeGreaterThan(estimateLearningCurve(early).lambda);
  });

  it('stays inside the prior when a block is uninformative (all correct)', () => {
    const irt = item(-2);
    const trials: LearningTrial[] = Array.from({ length: 6 }, (_, t) => ({
      irt,
      correct: true,
      trialIndex: t,
    }));
    const estimate = estimateLearningCurve(trials, { priorLambdaSd: 0.15 });
    expect(Number.isFinite(estimate.lambda)).toBe(true);
    expect(Math.abs(estimate.lambda)).toBeLessThan(0.15);
  });

  it('reports a smaller lambda SE for a longer block', () => {
    const short = estimateLearningCurve(simulateBlock('se-short', 0, 0.03, 6, 0), {
      priorLambdaSd: 0.5,
    });
    const long = estimateLearningCurve(simulateBlock('se-long', 0, 0.03, 40, 0), {
      priorLambdaSd: 0.5,
    });
    expect(long.lambdaSe).toBeLessThan(short.lambdaSe);
  });
});

describe('threePlResiduals', () => {
  it('subtracts the model expectation, removing an ascending difficulty ramp', () => {
    const trials: LearningTrial[] = [item(-1), item(0), item(1)].map((irt, t) => ({
      irt,
      correct: true,
      trialIndex: t,
    }));
    const residuals = threePlResiduals(trials, 0);
    // Harder items carry a larger positive residual for the same correct answer.
    expect(residuals[2]!).toBeGreaterThan(residuals[1]!);
    expect(residuals[1]!).toBeGreaterThan(residuals[0]!);
  });
});

describe('trialsToCriterion', () => {
  it('returns the 1-based trial where the run completes', () => {
    expect(trialsToCriterion([false, true, true, true], 3)).toBe(4);
  });

  it('resets the run on an incorrect response', () => {
    expect(trialsToCriterion([true, true, false, true, true, true], 3)).toBe(6);
  });

  it('returns null when the criterion is never met', () => {
    expect(trialsToCriterion([true, false, true, false], 3)).toBeNull();
  });

  it('rejects a run length below one', () => {
    expect(() => trialsToCriterion([true], 0)).toThrow(/runLength/);
  });
});

describe('blockHalfContrast', () => {
  it('is positive when the second half scores higher', () => {
    expect(blockHalfContrast([0, 0, 1, 1])).toBeCloseTo(1, 6);
  });

  it('drops the middle trial of an odd-length block', () => {
    expect(blockHalfContrast([0, 0, 99, 1, 1])).toBeCloseTo(1, 6);
  });

  it('returns null for fewer than two values', () => {
    expect(blockHalfContrast([1])).toBeNull();
  });
});
