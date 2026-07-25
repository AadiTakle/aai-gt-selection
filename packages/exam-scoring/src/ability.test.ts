import { describe, expect, it } from 'vitest';

import { type AbilityFitOptions, deriveAbilityEstimate } from './ability';
import { DEFAULT_ABILITY_BRACKETING } from './policy';
import { type Domain, type ScoredItem } from './types';

const FIT: AbilityFitOptions = {
  slope: DEFAULT_ABILITY_BRACKETING.slope,
  priorSd: DEFAULT_ABILITY_BRACKETING.priorSd,
  min: 1,
  max: 20,
};

let counter = 0;

function item(difficulty: number, correct: boolean, score?: number): ScoredItem {
  return {
    itemId: `ability-${(counter += 1)}`,
    typeCode: 'SYN-TYPE-01',
    domain: 'fluid_reasoning' as Domain,
    metrics: {},
    telemetry: [],
    correct,
    score: score ?? (correct ? 1 : 0),
    difficulty,
  };
}

/** A threshold responder: correct on everything at or below `theta`, wrong above it. */
function thresholdTrace(theta: number, difficulties: readonly number[]): ScoredItem[] {
  return difficulties.map((d) => item(d, d <= theta));
}

const RAMP = [4, 6, 8, 10, 12, 14, 16, 18];

describe('deriveAbilityEstimate — recovers where the child succeeds', () => {
  it('lands between the hardest item solved and the easiest item missed', () => {
    const fitted = deriveAbilityEstimate(thresholdTrace(11, RAMP), FIT) as number;
    expect(fitted).toBeGreaterThan(10);
    expect(fitted).toBeLessThan(12);
  });

  it('is monotone in the child: a stronger responder never fits lower', () => {
    let previous = Number.NEGATIVE_INFINITY;
    for (const theta of [3, 5, 7, 9, 11, 13, 15, 17]) {
      const fitted = deriveAbilityEstimate(thresholdTrace(theta, RAMP), FIT) as number;
      expect(fitted, `true ability ${theta}`).toBeGreaterThan(previous);
      previous = fitted;
    }
  });

  it('separates two children with IDENTICAL accuracy but different difficulty reached', () => {
    // Both are correct on exactly half of what they saw; only the difficulty differs.
    const high = [
      ...thresholdTrace(16.5, [16, 16, 16, 16]),
      ...thresholdTrace(16.5, [18, 18, 18, 18]),
    ];
    const low = [...thresholdTrace(3.5, [3, 3, 3, 3]), ...thresholdTrace(3.5, [5, 5, 5, 5])];

    const accuracyOf = (items: readonly ScoredItem[]): number =>
      items.filter((i) => i.correct).length / items.length;
    expect(accuracyOf(high)).toBe(accuracyOf(low));

    const highFit = deriveAbilityEstimate(high, FIT) as number;
    const lowFit = deriveAbilityEstimate(low, FIT) as number;
    expect(highFit - lowFit).toBeGreaterThan(10);
  });

  it('uses partial credit rather than treating it as a miss', () => {
    const partial = [8, 10, 12].map((d) => item(d, false, 0.5));
    const missed = [8, 10, 12].map((d) => item(d, false, 0));
    expect(deriveAbilityEstimate(partial, FIT) as number).toBeGreaterThan(
      deriveAbilityEstimate(missed, FIT) as number,
    );
  });
});

describe('deriveAbilityEstimate — degenerate traces', () => {
  it('returns null for an empty trace rather than inventing a number', () => {
    expect(deriveAbilityEstimate([], FIT)).toBeNull();
  });

  it('puts a child correct on everything above the hardest item served', () => {
    const trace = RAMP.map((d) => item(d, true));
    const fitted = deriveAbilityEstimate(trace, FIT) as number;
    expect(fitted).toBeGreaterThan(Math.max(...RAMP));
    expect(fitted).toBeLessThanOrEqual(20);
    // Without the prior there is nothing to stop the likelihood, so it pins at the ceiling.
    expect(deriveAbilityEstimate(trace, { ...FIT, priorSd: Number.POSITIVE_INFINITY })).toBe(20);
  });

  it('puts a child correct on nothing below the easiest item served', () => {
    const trace = RAMP.map((d) => item(d, false));
    const fitted = deriveAbilityEstimate(trace, FIT) as number;
    expect(fitted).toBeLessThan(Math.min(...RAMP));
    expect(fitted).toBeGreaterThanOrEqual(1);
    expect(deriveAbilityEstimate(trace, { ...FIT, priorSd: Number.POSITIVE_INFINITY })).toBe(1);
  });

  it('keeps a single-item trace off the scale bound, and the prior is what does it', () => {
    const single = [item(10, true)];
    const withPrior = deriveAbilityEstimate(single, FIT) as number;
    const noPrior = deriveAbilityEstimate(single, { ...FIT, priorSd: Number.POSITIVE_INFINITY });

    expect(withPrior).toBeGreaterThan(10);
    expect(withPrior).toBeLessThan(20);
    expect(noPrior).toBe(20);
  });

  it('the prior is weak enough not to drag a real-length trace toward the midpoint', () => {
    const trace = thresholdTrace(17, [12, 14, 15, 16, 17, 18, 19, 20]);
    const withPrior = deriveAbilityEstimate(trace, FIT) as number;
    const noPrior = deriveAbilityEstimate(trace, {
      ...FIT,
      priorSd: Number.POSITIVE_INFINITY,
    }) as number;
    expect(Math.abs(withPrior - noPrior)).toBeLessThan(0.5);
  });
});

describe('deriveAbilityEstimate — determinism', () => {
  it('returns bit-identical values on repeated calls', () => {
    const trace = thresholdTrace(13, RAMP);
    expect(deriveAbilityEstimate(trace, FIT)).toBe(deriveAbilityEstimate(trace, FIT));
  });

  it('does not depend on item order', () => {
    const trace = thresholdTrace(9, RAMP);
    const reversed = [...trace].reverse();
    expect(deriveAbilityEstimate(reversed, FIT)).toBe(deriveAbilityEstimate(trace, FIT));
  });

  it('does not mutate its input', () => {
    const trace = thresholdTrace(9, RAMP);
    const snapshot = structuredClone(trace);
    deriveAbilityEstimate(trace, FIT);
    expect(trace).toEqual(snapshot);
  });
});
