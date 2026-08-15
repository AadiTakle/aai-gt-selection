/**
 * The psychometrics the selection change rests on, pinned as arithmetic.
 *
 * Everything here is checked against a closed form or a known landmark rather than against a
 * previous output, so these tests fail when the model is wrong rather than merely when it moves.
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, DIFFICULTY_MAX, DIFFICULTY_MIN, GRADE_BAND_SEED } from './config';
import {
  BELIEF_GRID,
  beliefFromTrace,
  beliefMean,
  beliefSd,
  expectedPosteriorVariance,
  fisherInformation,
  priorBelief,
  responseProbability,
  updateBelief,
  type ResponseModel,
} from './posterior';
import type { ItemObservation } from './types';

const FLOORLESS: ResponseModel = { slope: 1.0, guessing: 0 };
const FIVE_OPTION: ResponseModel = { slope: 1.0, guessing: 0.2 };

/** The difficulty minimising a criterion, swept finely enough to resolve a tenth of a point. */
function argmin(criterion: (difficulty: number) => number): number {
  let best = DIFFICULTY_MIN;
  let bestValue = Number.POSITIVE_INFINITY;
  for (let d = DIFFICULTY_MIN; d <= DIFFICULTY_MAX; d += 0.05) {
    const value = criterion(d);
    if (value < bestValue) {
      bestValue = value;
      best = d;
    }
  }
  return best;
}

describe('the response model', () => {
  it('never drops below the floor, however far below the item the child is', () => {
    expect(responseProbability(1, 20, FIVE_OPTION)).toBeGreaterThanOrEqual(0.2);
    expect(responseProbability(1, 20, FIVE_OPTION)).toBeLessThan(0.21);
    expect(responseProbability(1, 20, FLOORLESS)).toBeLessThan(0.001);
  });

  it('puts a child level with an item at an even chance only when nobody guesses', () => {
    expect(responseProbability(10, 10, FLOORLESS)).toBeCloseTo(0.5, 10);
    expect(responseProbability(10, 10, FIVE_OPTION)).toBeCloseTo(0.6, 10);
  });
});

describe('where an item teaches the most', () => {
  /*
   * Birnbaum's result, restated in Lord (1980) and generalised by Magis (2013): with a lower
   * asymptote `c`, information peaks where the success probability is `(1 + sqrt(1 + 8c)) / 4`
   * rather than at an even chance. This is the fact the whole aim correction turns on, so it is
   * asserted against the closed form and not against a remembered number.
   */
  it.each([
    { c: 0, expected: 0.5 },
    { c: 0.2, expected: (1 + Math.sqrt(1 + 8 * 0.2)) / 4 },
    { c: 0.25, expected: (1 + Math.sqrt(1 + 8 * 0.25)) / 4 },
  ])('peaks at the analytic success rate for a floor of $c', ({ c, expected }) => {
    const model: ResponseModel = { slope: 1.0, guessing: c };
    const theta = 11;
    const peak = argmin((d) => -fisherInformation(theta, d, model));

    expect(responseProbability(theta, peak, model)).toBeCloseTo(expected, 2);
  });

  it('puts the five-option optimum about 0.27 scale points below the child', () => {
    const theta = 11;
    const peak = argmin((d) => -fisherInformation(theta, d, FIVE_OPTION));

    expect(theta - peak).toBeCloseTo(0.27, 1);
  });

  it('is not symmetric about the child once a floor is in the model', () => {
    // The up-down machinery built for floor-free banks assumes an item one step easier and one
    // step harder are interchangeable. They are not: at the same distance the easier item carries
    // more information, which is the whole reason the peak moves.
    const theta = 11;
    const easier = fisherInformation(theta, theta - 1, FIVE_OPTION);
    const harder = fisherInformation(theta, theta + 1, FIVE_OPTION);

    expect(easier).toBeGreaterThan(harder);
    expect(fisherInformation(theta, theta - 1, FLOORLESS)).toBeCloseTo(
      fisherInformation(theta, theta + 1, FLOORLESS),
      10,
    );
  });
});

describe('minimum expected posterior variance', () => {
  it('aims at the middle of the belief, not at its edges', () => {
    /*
     * The measured refutation of endpoint targeting, as arithmetic. A wide belief aimed at its own
     * +-1.96 SD edges cannot shrink: an item that far out is one the child's answer is nearly
     * predetermined for, so it carries almost no information and the belief stays wide.
     */
    const belief = priorBelief(11, 6.0);
    const centre = beliefMean(belief);
    const edge = centre + 1.96 * beliefSd(belief);

    expect(expectedPosteriorVariance(belief, centre, FLOORLESS)).toBeLessThan(
      expectedPosteriorVariance(belief, edge, FLOORLESS),
    );
  });

  it('shrinks the belief fastest at the difficulty it nominates', () => {
    const belief = priorBelief(11, 6.0);
    const chosen = argmin((d) => expectedPosteriorVariance(belief, d, FIVE_OPTION));

    for (const other of [chosen - 3, chosen - 1, chosen + 1, chosen + 3]) {
      if (other < DIFFICULTY_MIN || other > DIFFICULTY_MAX) continue;
      expect(expectedPosteriorVariance(belief, chosen, FIVE_OPTION)).toBeLessThanOrEqual(
        expectedPosteriorVariance(belief, other, FIVE_OPTION),
      );
    }
  });

  it('never expects an answer to widen the belief', () => {
    // A response can only add information, so the expectation over both branches cannot exceed the
    // variance already held. An implementation that normalised a branch wrongly would breach this.
    const belief = updateBelief(priorBelief(11, 6.0), 12, true, FIVE_OPTION);
    const current = beliefSd(belief) ** 2;

    for (let d = DIFFICULTY_MIN; d <= DIFFICULTY_MAX; d += 0.5) {
      expect(expectedPosteriorVariance(belief, d, FIVE_OPTION)).toBeLessThanOrEqual(current + 1e-9);
    }
  });
});

describe('the belief itself', () => {
  const model = FIVE_OPTION;

  function observe(difficulty: number, correct: boolean): ItemObservation {
    return {
      itemId: `i${String(difficulty)}${String(correct)}`,
      typeCode: 'T',
      difficulty,
      score: correct ? 1 : 0,
      correct,
      rtMs: null,
      angularDisparityDeg: null,
      stage: 'standing',
    };
  }

  it('starts centred on the grade-band seed and weakly enough to be outweighed', () => {
    const belief = priorBelief(GRADE_BAND_SEED['4-5'], DEFAULT_CONFIG.posteriorPriorSd);

    expect(beliefMean(belief)).toBeCloseTo(10.8, 1);
    // Wide enough that a handful of well-aimed items dominate it: the prior carries 1/36 of a unit
    // of precision against roughly 0.25 from each item.
    expect(beliefSd(belief)).toBeGreaterThan(4);
  });

  it('narrows as evidence arrives and moves toward the level the child is straddling', () => {
    let belief = priorBelief(11, 6.0);
    const before = beliefSd(belief);

    for (const [difficulty, correct] of [
      [15, true],
      [16, false],
      [15, true],
      [16, false],
      [15, true],
      [16, false],
    ] as [number, boolean][]) {
      belief = updateBelief(belief, difficulty, correct, model);
    }

    expect(beliefSd(belief)).toBeLessThan(before);
    // Above where it started and below the item they kept failing. It settles nearer 13 than 15
    // because with a floor in the model a pass is weaker evidence than a failure is: some of the
    // passes on the easier item might have been luck, while none of the failures can have been.
    expect(beliefMean(belief)).toBeGreaterThan(12);
    expect(beliefMean(belief)).toBeLessThan(16);
  });

  it('will not claim a scale bound from a one-sided trace', () => {
    // Correct on everything says "at least as able as the hardest item seen", which is not the
    // same claim as "at the top of the scale" and must not be reported as one.
    let belief = priorBelief(11, 6.0);
    for (let i = 0; i < 12; i++) belief = updateBelief(belief, 16, true, model);

    expect(beliefMean(belief)).toBeGreaterThan(16);
    expect(beliefMean(belief)).toBeLessThan(DIFFICULTY_MAX);
  });

  it('rebuilds from the trace alone, so a replayed session reaches the same belief', () => {
    const trace = [observe(11, true), observe(13, false), observe(12, true), observe(14, false)];
    const config = { ...DEFAULT_CONFIG };

    const live = beliefFromTrace({ trace }, 11, config);
    const replayed = beliefFromTrace({ trace: [...trace] }, 11, config);

    expect(replayed.mass).toEqual(live.mass);
    expect(beliefMean(replayed)).toBe(beliefMean(live));
  });

  it('is a normalised distribution over the whole difficulty scale', () => {
    const belief = updateBelief(priorBelief(11, 6.0), 12, false, model);

    expect(BELIEF_GRID[0]).toBe(DIFFICULTY_MIN);
    expect(BELIEF_GRID[BELIEF_GRID.length - 1]).toBe(DIFFICULTY_MAX);
    expect(belief.mass.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(belief.mass.every((m) => m >= 0)).toBe(true);
  });
});
