import { describe, expect, it } from 'vitest';

import type { IrtParameters } from '@gt-selection/contracts';

import { estimateThetaEap, estimateThetaMle, type ScoredResponse } from './theta';

const item = (a: number, b: number): IrtParameters => ({ a, b, c: 0, model: '2PL' });

describe('estimateThetaEap', () => {
  it('returns the prior with no responses', () => {
    const estimate = estimateThetaEap([], { priorMean: 0, priorSd: 1 });
    expect(estimate.theta).toBeCloseTo(0, 6);
    // Grid-truncated posterior SD is ~0.9996, not exactly the prior SD.
    expect(estimate.se).toBeCloseTo(1, 2);
  });

  it('estimates high theta after correct answers on hard items', () => {
    const responses: ScoredResponse[] = [item(1.5, 1), item(1.5, 1.5), item(1.5, 2)].map((irt) => ({
      irt,
      correct: true,
    }));
    expect(estimateThetaEap(responses).theta).toBeGreaterThan(0.8);
  });

  it('estimates low theta after wrong answers on easy items', () => {
    const responses: ScoredResponse[] = [item(1.5, -1), item(1.5, -1.5)].map((irt) => ({
      irt,
      correct: false,
    }));
    expect(estimateThetaEap(responses).theta).toBeLessThan(-0.5);
  });

  it('reduces SE as more informative items arrive', () => {
    const few = estimateThetaEap([{ irt: item(1.5, 0), correct: true }]);
    const many = estimateThetaEap(
      Array.from({ length: 10 }, (_, i) => ({ irt: item(1.5, (i - 5) * 0.3), correct: i < 5 })),
    );
    expect(many.se).toBeLessThan(few.se);
  });
});

describe('estimateThetaMle', () => {
  it('stays finite (falls back to EAP) for an all-correct string', () => {
    const responses = [item(1, 0), item(1, 0.5)].map((irt) => ({ irt, correct: true }));
    expect(Number.isFinite(estimateThetaMle(responses).theta)).toBe(true);
  });

  it('recovers a moderate theta for a mixed string', () => {
    const responses: ScoredResponse[] = [
      { irt: item(1.5, -1), correct: true },
      { irt: item(1.5, 0), correct: true },
      { irt: item(1.5, 1), correct: false },
    ];
    const mle = estimateThetaMle(responses);
    expect(mle.theta).toBeGreaterThan(-1);
    expect(mle.theta).toBeLessThan(1.5);
  });
});
