import { describe, expect, it } from 'vitest';

import type { DomainScore, ScoringPolicy } from './types';
import {
  computeFitIndex,
  consistencyFromRts,
  decisionFromFit,
  learningRate,
  normalCdf,
  slope,
  thetaToPercentile,
} from './scoring';

const domainScore = (domain: string, over: Partial<DomainScore> = {}): DomainScore => ({
  domain,
  theta: 0,
  se: 1,
  percentile: 50,
  itemsScored: 5,
  itemsEffortValid: 5,
  maxDifficultyReached: 0,
  learningRate: null,
  consistency: null,
  ...over,
});

const policy = (over: Partial<ScoringPolicy> = {}): ScoringPolicy => ({
  policyVersion: 'test-v1',
  fitWeights: { a: 1, b: 1 },
  learningRateWeight: 0,
  consistencyWeight: 0,
  admitCut: 1,
  retryCut: -1,
  ...over,
});

describe('normalCdf', () => {
  it('is 0.5 at 0 and ~0.975 at 1.96', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
  });

  it('is symmetric: cdf(-x) = 1 - cdf(x)', () => {
    expect(normalCdf(-1.2)).toBeCloseTo(1 - normalCdf(1.2), 4);
  });
});

describe('thetaToPercentile', () => {
  it('maps theta 0 to the 50th percentile and clamps to [0,100]', () => {
    expect(thetaToPercentile(0)).toBeCloseTo(50, 3);
    expect(thetaToPercentile(50)).toBeLessThanOrEqual(100);
    expect(thetaToPercentile(-50)).toBeGreaterThanOrEqual(0);
  });
});

describe('slope / learningRate', () => {
  it('recovers a known slope', () => {
    expect(slope([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(2, 9);
  });

  it('is null with fewer than two points or no x variation', () => {
    expect(slope([1], [2])).toBeNull();
    expect(slope([3, 3, 3], [1, 2, 3])).toBeNull();
  });

  it('is positive when scores improve over order (within-session learning)', () => {
    const lr = learningRate([1, 2, 3, 4], [0, 0, 1, 1]);
    expect(lr).not.toBeNull();
    expect(lr!).toBeGreaterThan(0);
  });
});

describe('consistencyFromRts', () => {
  it('is 1 for perfectly steady RTs (CV = 0)', () => {
    expect(consistencyFromRts([1000, 1000, 1000])).toBeCloseTo(1, 9);
  });

  it('is lower for more variable RTs', () => {
    const steady = consistencyFromRts([1000, 1010, 990])!;
    const jittery = consistencyFromRts([200, 3000, 500, 2500])!;
    expect(jittery).toBeLessThan(steady);
  });

  it('is null with fewer than two positive RTs', () => {
    expect(consistencyFromRts([1000])).toBeNull();
    expect(consistencyFromRts([0, 0])).toBeNull();
  });
});

describe('computeFitIndex', () => {
  it('is the weighted-mean theta when modifier weights are zero', () => {
    const scores = [domainScore('a', { theta: 1 }), domainScore('b', { theta: 0 })];
    expect(computeFitIndex(scores, policy())).toBeCloseTo(0.5, 9);
  });

  it('adds the learning-rate and consistency modifiers', () => {
    const scores = [
      domainScore('a', { theta: 0, learningRate: 0.2, consistency: 0.8 }),
      domainScore('b', { theta: 0, learningRate: 0.2, consistency: 0.8 }),
    ];
    const withMods = computeFitIndex(scores, policy({ learningRateWeight: 1, consistencyWeight: 0.5 }));
    // meanTheta 0 + 1*0.2 + 0.5*0.8 = 0.6
    expect(withMods).toBeCloseTo(0.6, 9);
  });
});

describe('decisionFromFit', () => {
  it('bands the fit index into admit / defer / retry', () => {
    const p = policy({ admitCut: 1, retryCut: -1 });
    expect(decisionFromFit(1.5, p)).toBe('admit');
    expect(decisionFromFit(1, p)).toBe('admit'); // admitCut is inclusive
    expect(decisionFromFit(0, p)).toBe('defer');
    expect(decisionFromFit(-1, p)).toBe('defer'); // retryCut is exclusive (strictly below)
    expect(decisionFromFit(-1.5, p)).toBe('retry');
  });
});
