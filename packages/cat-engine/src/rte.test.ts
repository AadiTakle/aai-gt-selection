import { describe, expect, it } from 'vitest';

import {
  filterEffortful,
  isEffortValid,
  isRapidGuess,
  normativeThreshold,
  responseTimeEffort,
} from './rte';

describe('isRapidGuess (M-RAPIDGUESS)', () => {
  it('flags responses at or below the item RT floor', () => {
    expect(isRapidGuess(400, 800)).toBe(true);
    expect(isRapidGuess(800, 800)).toBe(true);
  });

  it('passes responses above the floor', () => {
    expect(isRapidGuess(801, 800)).toBe(false);
    expect(isRapidGuess(5000, 800)).toBe(false);
  });
});

describe('isEffortValid', () => {
  it('is true only when on-task AND not a rapid guess', () => {
    expect(isEffortValid(5000, 800, true)).toBe(true);
    expect(isEffortValid(400, 800, true)).toBe(false); // rapid guess
    expect(isEffortValid(5000, 800, false)).toBe(false); // off-task
    expect(isEffortValid(400, 800, false)).toBe(false); // both
  });
});

describe('responseTimeEffort (RTE index)', () => {
  it('is the proportion of effort-valid responses', () => {
    const items = [
      { effortValid: true },
      { effortValid: true },
      { effortValid: false },
      { effortValid: true },
    ];
    expect(responseTimeEffort(items)).toBeCloseTo(0.75, 9);
  });

  it('is null with no responses', () => {
    expect(responseTimeEffort([])).toBeNull();
  });
});

describe('filterEffortful', () => {
  it('drops rapid-guess / off-task responses', () => {
    const items = [
      { id: 'a', effortValid: true },
      { id: 'b', effortValid: false },
      { id: 'c', effortValid: true },
    ];
    expect(filterEffortful(items).map((i) => i.id)).toEqual(['a', 'c']);
  });
});

describe('normativeThreshold (NT estimator)', () => {
  it('defaults to 10% of the mean RT (NT10)', () => {
    // mean = 5000 -> 10% = 500, within [300, 10000]
    expect(normativeThreshold([4000, 5000, 6000])).toBeCloseTo(500, 9);
  });

  it('clamps to the floor and cap', () => {
    expect(normativeThreshold([1000], { fraction: 0.1, floorMs: 300 })).toBe(300); // 100 -> 300
    expect(normativeThreshold([500000], { fraction: 0.1, capMs: 10000 })).toBe(10000); // 50000 -> cap
  });

  it('returns the floor when there are no positive RTs', () => {
    expect(normativeThreshold([], { floorMs: 250 })).toBe(250);
    expect(normativeThreshold([0, -5], { floorMs: 250 })).toBe(250);
  });

  it('respects a custom fraction', () => {
    expect(normativeThreshold([2000, 2000], { fraction: 0.25 })).toBeCloseTo(500, 9);
  });
});
