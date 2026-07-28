import { describe, expect, it } from 'vitest';

import { hashSeed, mulberry32 } from '../rng';

import {
  detectionPerformance,
  driftDeclineFlags,
  implausiblePatternFlags,
  interactionFlags,
  rapidGuessFlags,
  unionFlags,
  type DetectorTrial,
} from './engagement-detectors';
import { sampleInteractionScore } from './telemetry';

const trial = (over: Partial<DetectorTrial> = {}): DetectorTrial => ({
  rtMs: 9000,
  correct: true,
  expectedCorrect: 0.6,
  ...over,
});

describe('rapidGuessFlags', () => {
  it('flags responses at or below the floor and nothing else', () => {
    const trials = [trial({ rtMs: 400 }), trial({ rtMs: 1500 }), trial({ rtMs: 1501 })];
    expect(rapidGuessFlags(trials, 1500)).toEqual([true, true, false]);
  });

  it('cannot see a slow disengaged response', () => {
    expect(rapidGuessFlags([trial({ rtMs: 25000, correct: false })], 1500)).toEqual([false]);
  });
});

describe('driftDeclineFlags', () => {
  it('flags nothing before a full window has accumulated', () => {
    const trials = Array.from({ length: 5 }, () => trial({ correct: false, expectedCorrect: 0.9 }));
    expect(driftDeclineFlags(trials, { windowLength: 6 })).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('flags a sustained collapse in the residual', () => {
    const trials = Array.from({ length: 8 }, () => trial({ correct: false, expectedCorrect: 0.9 }));
    const flags = driftDeclineFlags(trials, { windowLength: 6 });
    expect(flags.slice(0, 5)).toEqual([false, false, false, false, false]);
    expect(flags.slice(5)).toEqual([true, true, true]);
  });

  it('leaves an on-model session alone', () => {
    const trials = Array.from({ length: 20 }, (_, i) =>
      trial({ correct: i % 3 !== 0, expectedCorrect: 0.66 }),
    );
    expect(driftDeclineFlags(trials).some(Boolean)).toBe(false);
  });

  it('latches by default and releases when latching is off', () => {
    const bad = Array.from({ length: 6 }, () => trial({ correct: false, expectedCorrect: 0.95 }));
    const good = Array.from({ length: 6 }, () => trial({ correct: true, expectedCorrect: 0.5 }));
    const trials = [...bad, ...good];
    expect(driftDeclineFlags(trials, { windowLength: 6 }).at(-1)).toBe(true);
    expect(driftDeclineFlags(trials, { windowLength: 6, latching: false }).at(-1)).toBe(false);
  });
});

describe('implausiblePatternFlags', () => {
  it('ignores an isolated miss on an easy item', () => {
    const trials = [trial(), trial({ correct: false, expectedCorrect: 0.9 }), trial()];
    expect(implausiblePatternFlags(trials)).toEqual([false, false, false]);
  });

  it('flags the whole run once the run length is reached', () => {
    const miss = trial({ correct: false, expectedCorrect: 0.9 });
    const flags = implausiblePatternFlags([trial(), miss, miss, miss, trial()]);
    expect(flags).toEqual([false, true, true, true, false]);
  });

  it('does not flag misses on items above the working ability estimate', () => {
    const hard = trial({ correct: false, expectedCorrect: 0.3 });
    expect(implausiblePatternFlags([hard, hard, hard]).some(Boolean)).toBe(false);
  });
});

describe('interactionFlags', () => {
  it('flags only trials whose signal falls below the threshold', () => {
    const trials = [trial({ interactionScore: 0.1 }), trial({ interactionScore: 0.9 }), trial()];
    expect(interactionFlags(trials, 0.5)).toEqual([true, false, false]);
  });
});

describe('unionFlags', () => {
  it('ORs the inputs and pads to the longest', () => {
    expect(unionFlags([true, false], [false, false, true])).toEqual([true, false, true]);
  });

  it('returns an all-false vector for no inputs', () => {
    expect(unionFlags()).toEqual([]);
  });
});

describe('detectionPerformance', () => {
  it('scores off-task as the positive class', () => {
    const perf = detectionPerformance([true, false, true, false], [false, false, true, true]);
    expect(perf.offTask).toBe(2);
    expect(perf.truePositive).toBe(1);
    expect(perf.falsePositive).toBe(1);
    expect(perf.sensitivity).toBeCloseTo(0.5, 9);
    expect(perf.specificity).toBeCloseTo(0.5, 9);
    expect(perf.precision).toBeCloseTo(0.5, 9);
  });

  it('reports a perfect detector as sensitivity and specificity 1', () => {
    const onTask = [true, false, true, false];
    const perf = detectionPerformance(
      onTask.map((t) => !t),
      onTask,
    );
    expect(perf.sensitivity).toBe(1);
    expect(perf.specificity).toBe(1);
  });
});

describe('sampleInteractionScore', () => {
  it('separates on-task from off-task at the default separation', () => {
    const rand = mulberry32(hashSeed('interaction-signal'));
    const on: number[] = [];
    const off: number[] = [];
    for (let i = 0; i < 500; i++) {
      on.push(sampleInteractionScore(rand, true));
      off.push(sampleInteractionScore(rand, false));
    }
    const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(meanOf(on) - meanOf(off)).toBeGreaterThan(0.3);
    expect(Math.min(...on, ...off)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...on, ...off)).toBeLessThanOrEqual(1);
  });

  it('carries no information at separation 0', () => {
    const rand = mulberry32(hashSeed('interaction-null'));
    const on: number[] = [];
    const off: number[] = [];
    for (let i = 0; i < 500; i++) {
      on.push(sampleInteractionScore(rand, true, { separation: 0 }));
      off.push(sampleInteractionScore(rand, false, { separation: 0 }));
    }
    const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(Math.abs(meanOf(on) - meanOf(off))).toBeLessThan(0.05);
  });
});
