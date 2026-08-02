import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GUESSING,
  estimateLearningCurve,
  nextTargetTheta,
  type LearningTrial,
} from './learning-curve';
import {
  E095_FLOORLESS_POSTERIOR_SE_LADDER,
  MEASURED_CONTAMINATION_FLOOR_30_TRIALS,
  MEASURED_POSTERIOR_SE_LADDER,
  expectedPosteriorSe,
  learningRateInterval,
  learningRateIntervalSeries,
} from './learning-rate-interval';
import { MIN_TRIALS_FOR_RATE } from './learning-rate-readout';

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
const THETA0 = 11;

/**
 * A novel block administered the way `nextTargetTheta` intends, with a five-option responder.
 *
 * Same construction as `learning-rate-readout.test.ts` on purpose: these tests are about what the
 * INTERVAL says over a block, and a different block generator here would make a disagreement
 * between the two modules impossible to attribute.
 */
function adaptiveBlock(
  length: number,
  lambda: number,
  seed: number,
  responderFloor = DEFAULT_GUESSING,
): LearningTrial[] {
  const rand = mulberry32(seed);
  const trials: LearningTrial[] = [];
  for (let t = 0; t < length; t += 1) {
    const target = nextTargetTheta(trials, {
      standingEstimate: THETA0,
      targetOffset: 1,
      slope: SLOPE,
    });
    const difficulty = Math.round(target * 2) / 2;
    const theta = THETA0 + lambda * t;
    const star = 1 / (1 + Math.exp(-SLOPE * (theta - difficulty)));
    const p = responderFloor + (1 - responderFloor) * star;
    trials.push({ difficulty, score: rand() < p ? 1 : 0, trialIndex: t });
  }
  return trials;
}

/** The measured floor for the bank the block would run on (bank-recovery measurement §4). */
const floor = MEASURED_CONTAMINATION_FLOOR_30_TRIALS;

describe('learningRateInterval — the too-short block is a state, not a wide range', () => {
  it('returns no bounds at all below the trial floor', () => {
    const interval = learningRateInterval(adaptiveBlock(12, 0.1, 7), {
      contaminationFloor: floor,
    });

    expect(interval.state).toBe('insufficient_trials');
    // The whole point: nothing numeric to render. A very wide range here would get drawn, and its
    // width would be read as the finding.
    expect(interval.bounds).toBeNull();
    expect(interval.trialCount).toBe(12);
    expect(interval.minTrials).toBe(MIN_TRIALS_FOR_RATE);
    expect(interval.reason).toContain(`${String(MIN_TRIALS_FOR_RATE)}-trial floor`);
  });

  /**
   * The distinction this asserts is the one a renderer is most likely to collapse. "We could not
   * look" and "we looked and it overlaps the floor" both mean no claim is available, but only the
   * second is about this child's block, and a UI that shows the same words for both is lying about
   * which.
   */
  it('reports distinguishability as null, not false, when it could not look', () => {
    const short = learningRateInterval(adaptiveBlock(12, 0.1, 7), { contaminationFloor: floor });
    const looked = learningRateInterval(adaptiveBlock(MIN_TRIALS_FOR_RATE, 0, 22), {
      contaminationFloor: floor,
    });

    expect(short.distinguishableFromNoLearning).toBeNull();
    expect(looked.distinguishableFromNoLearning).toBe(false);
    expect(short.distinguishableFromNoLearning).not.toBe(looked.distinguishableFromNoLearning);
  });

  it('crosses into a real interval exactly at the floor, not one trial before', () => {
    const trials = adaptiveBlock(MIN_TRIALS_FOR_RATE, 0.06, 11);

    const below = learningRateInterval(trials.slice(0, MIN_TRIALS_FOR_RATE - 1), {
      contaminationFloor: floor,
    });
    const at = learningRateInterval(trials, { contaminationFloor: floor });

    expect(below.bounds).toBeNull();
    expect(at.bounds).not.toBeNull();
  });

  it('honours a caller-lowered floor, so the state is about the declared length', () => {
    const interval = learningRateInterval(adaptiveBlock(12, 0.1, 7), {
      contaminationFloor: floor,
      minTrials: 8,
    });

    expect(interval.state).not.toBe('insufficient_trials');
    expect(interval.bounds).not.toBeNull();
  });
});

describe('learningRateInterval — overlapping the contamination floor', () => {
  /**
   * Seed 22 with λ_true = 0 is chosen deliberately, not for convenience: its fit lands at 0.0570
   * with a posterior SE of 0.0565, so its lower end is 0.00054 — ABOVE zero and BELOW the measured
   * floor. It is the exact block on which the pre-D-200 behaviour and the shipped behaviour disagree,
   * so every assertion in this block is live rather than incidentally true.
   */
  const STRADDLING_NULL_SEED = 22;

  /**
   * A cohort that learned NOTHING is the case E-200 and the bank-recovery measurement exist for: the adaptive loop feeds the
   * fit's own output back into what gets served, so a null learner still fits a positive climb
   * (λ̄ = 0.0097 ± 0.0011 at 30 trials, 8.6 Monte-Carlo SEs from zero). An interval whose lower end
   * reaches that floor must not read as learning.
   */
  it('calls a null learner not distinguishable from no learning', () => {
    const interval = learningRateInterval(
      adaptiveBlock(MIN_TRIALS_FOR_RATE, 0, STRADDLING_NULL_SEED),
      { contaminationFloor: floor },
    );

    expect(interval.state).toBe('not_distinguishable_from_no_learning');
    expect(interval.distinguishableFromNoLearning).toBe(false);
    expect(interval.reason).toContain('learned nothing');
    expect(interval.bounds?.lower).toBeLessThanOrEqual(floor);
  });

  /**
   * The load-bearing half of the pair, deliberately in its own `it` so neither half can mask the
   * other. Declaring the floor at 0 — the pre-D-200 behaviour — flips this same block to
   * "separated", so the guard above cannot pass vacuously. This is the failure the interval exists
   * to prevent, reproduced on demand.
   */
  it('is not vacuous: the same block reads as separated when the floor is declared at 0', () => {
    const trials = adaptiveBlock(MIN_TRIALS_FOR_RATE, 0, STRADDLING_NULL_SEED);

    const declared = learningRateInterval(trials, { contaminationFloor: floor });
    const unfloored = learningRateInterval(trials, { contaminationFloor: 0 });

    expect(declared.state).toBe('not_distinguishable_from_no_learning');
    expect(unfloored.state).toBe('separated_from_no_learning');
    expect(unfloored.distinguishableFromNoLearning).toBe(true);
  });

  it('tests the lower end, not the centre', () => {
    const trials = adaptiveBlock(MIN_TRIALS_FOR_RATE, 0, STRADDLING_NULL_SEED);
    const interval = learningRateInterval(trials, { contaminationFloor: floor });

    expect(interval.bounds).not.toBeNull();
    const bounds = interval.bounds!;
    // A centre above the floor is not enough, and this block is the proof: it overlaps anyway.
    expect(bounds.centre).toBeGreaterThan(floor);
    expect(bounds.lower).toBeLessThanOrEqual(floor);
    expect(interval.distinguishableFromNoLearning).toBe(false);
  });

  /**
   * Not a single-seed accident. The bank-recovery measurement found 13.4% of 30-trial null blocks reading as false
   * `above` at this floor, so a large majority overlapping is the expected shape and a small
   * minority separating is the residual the floor cannot remove. A change that pushed either end of
   * this toward the other would be a change to what the interval means.
   */
  it('overlaps for the large majority of a null cohort, and not for all of it', () => {
    const overlapping = Array.from({ length: 40 }, (_, i) =>
      learningRateInterval(adaptiveBlock(MIN_TRIALS_FOR_RATE, 0, i + 1), {
        contaminationFloor: floor,
      }),
    ).filter((interval) => interval.state === 'not_distinguishable_from_no_learning').length;

    expect(overlapping).toBeGreaterThanOrEqual(32);
    expect(overlapping).toBeLessThan(40);
  });

  it('reports the margin above the floor without the caller recomputing it', () => {
    const interval = learningRateInterval(adaptiveBlock(MIN_TRIALS_FOR_RATE, 0.15, 5), {
      contaminationFloor: floor,
    });

    expect(interval.bounds).not.toBeNull();
    const bounds = interval.bounds!;
    expect(bounds.marginAboveFloor).toBeCloseTo(bounds.lower - floor, 12);
    expect(bounds.marginAboveFloor > 0).toBe(interval.distinguishableFromNoLearning);
  });

  it('separates a fast learner whose whole range clears the floor', () => {
    const interval = learningRateInterval(adaptiveBlock(60, 0.15, 5), {
      contaminationFloor: floor,
      minTrials: 60,
    });

    expect(interval.state).toBe('separated_from_no_learning');
    expect(interval.distinguishableFromNoLearning).toBe(true);
    expect(interval.bounds?.lower).toBeGreaterThan(floor);
    // Separated is NOT a band and NOT a rank; the reason has to say so out loud.
    expect(interval.reason).toContain('carries no comparison to other children');
  });

  it('widening the range can only make the overlap test more conservative', () => {
    const trials = adaptiveBlock(60, 0.15, 5);
    const options = { contaminationFloor: floor, minTrials: 60 };

    const oneSe = learningRateInterval(trials, options);
    const twoSe = learningRateInterval(trials, { ...options, seMultiple: 2 });

    expect(oneSe.bounds!.width * 2).toBeCloseTo(twoSe.bounds!.width, 12);
    expect(twoSe.bounds!.lower).toBeLessThan(oneSe.bounds!.lower);
    expect(twoSe.bounds!.centre).toBeCloseTo(oneSe.bounds!.centre, 12);
  });

  it('refuses at any length when no floor was declared', () => {
    for (const bad of [Number.NaN, -0.01, Number.POSITIVE_INFINITY]) {
      const interval = learningRateInterval(adaptiveBlock(60, 0.15, 5), {
        contaminationFloor: bad,
        minTrials: 60,
      });
      expect(interval.state).toBe('floor_undeclared');
      expect(interval.bounds).toBeNull();
      expect(interval.distinguishableFromNoLearning).toBeNull();
    }
  });

  it('rejects a non-positive range width rather than silently picking one', () => {
    const trials = adaptiveBlock(MIN_TRIALS_FOR_RATE, 0.06, 11);
    expect(() =>
      learningRateInterval(trials, { contaminationFloor: floor, seMultiple: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      learningRateInterval(trials, { contaminationFloor: floor, seMultiple: Number.NaN }),
    ).toThrow(RangeError);
  });
});

describe('learningRateInterval — one estimator, and no band', () => {
  /**
   * This repository has twice been bitten by a second, divergent implementation of the same
   * quantity. The interval's centre and width must come from `estimateLearningCurve` and nowhere
   * else, so this asserts identity rather than closeness.
   */
  it('takes its centre and its SE from the shipped estimator exactly', () => {
    const trials = adaptiveBlock(MIN_TRIALS_FOR_RATE, 0.06, 11);
    const fit = estimateLearningCurve(trials);
    const interval = learningRateInterval(trials, { contaminationFloor: floor });

    expect(interval.bounds!.centre).toBe(fit.lambda);
    expect(interval.bounds!.posteriorSe).toBe(fit.lambdaSe);
    expect(interval.bounds!.lower).toBe(fit.lambda - fit.lambdaSe);
    expect(interval.bounds!.upper).toBe(fit.lambda + fit.lambdaSe);
  });

  it('forwards fit options rather than fitting under its own assumptions', () => {
    const trials = adaptiveBlock(MIN_TRIALS_FOR_RATE, 0.06, 11);
    const fitOptions = { guessing: 0, slope: SLOPE };

    const interval = learningRateInterval(trials, { contaminationFloor: floor, fit: fitOptions });

    expect(interval.bounds!.centre).toBe(estimateLearningCurve(trials, fitOptions).lambda);
    expect(interval.bounds!.centre).not.toBe(estimateLearningCurve(trials).lambda);
  });

  it('carries no band name and no rank on any state', () => {
    const cases = [
      learningRateInterval(adaptiveBlock(12, 0.1, 7), { contaminationFloor: floor }),
      learningRateInterval(adaptiveBlock(MIN_TRIALS_FOR_RATE, 0, 22), {
        contaminationFloor: floor,
      }),
      learningRateInterval(adaptiveBlock(60, 0.15, 5), {
        contaminationFloor: floor,
        minTrials: 60,
      }),
    ];

    for (const interval of cases) {
      const keys = Object.keys(interval);
      expect(keys).not.toContain('band');
      expect(keys).not.toContain('percentile');
      expect(keys).not.toContain('rank');
      // The state vocabulary is about the floor, never about where the child sits among children.
      expect(interval.state).not.toMatch(/above|below|typical/);
      expect(interval.hypothesis).toBe(true);
    }
  });
});

describe('learningRateIntervalSeries — watching the range contract', () => {
  const trials = adaptiveBlock(60, 0.08, 21);

  it('reports one step per repetition, in order', () => {
    const steps = learningRateIntervalSeries(trials, { contaminationFloor: floor });

    expect(steps).toHaveLength(60);
    expect(steps.map((step) => step.trialCount)).toEqual(
      Array.from({ length: 60 }, (_, i) => i + 1),
    );
  });

  /**
   * Precision is a property of the BLOCK and is observable from the first trials; a range is a
   * statement about the CHILD and is not. A width with no centre cannot be misread as a verdict, so
   * the pre-floor steps carry `posteriorSe` and no bounds.
   */
  it('tracks precision before the floor and bounds only after it', () => {
    const steps = learningRateIntervalSeries(trials, { contaminationFloor: floor });

    const early = steps[7]!;
    expect(early.trialCount).toBe(8);
    expect(early.posteriorSe).toBeGreaterThan(0);
    expect(early.interval.bounds).toBeNull();
    expect(early.interval.state).toBe('insufficient_trials');

    const atFloor = steps[MIN_TRIALS_FOR_RATE - 1]!;
    expect(atFloor.trialCount).toBe(MIN_TRIALS_FOR_RATE);
    expect(atFloor.interval.bounds).not.toBeNull();
  });

  it('narrows: the posterior SE at 60 trials is a fraction of the SE at 8', () => {
    const steps = learningRateIntervalSeries(trials, { contaminationFloor: floor });
    const at = (n: number) => steps[n - 1]!.posteriorSe!;

    expect(at(8)).toBeGreaterThan(at(15));
    expect(at(15)).toBeGreaterThan(at(30));
    expect(at(30)).toBeGreaterThan(at(45));
    expect(at(45)).toBeGreaterThan(at(60));
    expect(at(60)).toBeLessThan(at(8) / 3);
  });

  it('lands within reach of the measured ladder at every measured rung', () => {
    const steps = learningRateIntervalSeries(trials, { contaminationFloor: floor });

    for (const rung of MEASURED_POSTERIOR_SE_LADDER) {
      const step = steps[rung.trials - 1]!;
      expect(step.expectedPosteriorSe).toBe(rung.meanPosteriorSe);
      // One run against a cohort mean, so this is a sanity band rather than a tight check: a run
      // outside it is telling you the pool or the responder is not the one the ladder was measured on.
      expect(step.posteriorSe!).toBeGreaterThan(rung.meanPosteriorSe * 0.5);
      expect(step.posteriorSe!).toBeLessThan(rung.meanPosteriorSe * 2);
    }
  });

  it('agrees with the single-shot interval at the same prefix', () => {
    const steps = learningRateIntervalSeries(trials, { contaminationFloor: floor });

    for (const count of [5, MIN_TRIALS_FOR_RATE, 42, 60]) {
      const direct = learningRateInterval(trials.slice(0, count), { contaminationFloor: floor });
      expect(steps[count - 1]!.interval).toEqual(direct);
    }
  });

  it('carries the refusal all the way through when no floor was declared', () => {
    const steps = learningRateIntervalSeries(trials, { contaminationFloor: Number.NaN });

    expect(steps.every((step) => step.interval.state === 'floor_undeclared')).toBe(true);
    expect(steps.every((step) => step.interval.bounds === null)).toBe(true);
  });
});

describe('expectedPosteriorSe', () => {
  it('returns the measured value at a measured rung', () => {
    for (const rung of MEASURED_POSTERIOR_SE_LADDER) {
      expect(expectedPosteriorSe(rung.trials)).toBe(rung.meanPosteriorSe);
    }
  });

  it('interpolates between rungs and stays inside them', () => {
    const between = expectedPosteriorSe(22)!;
    expect(between).toBeLessThan(0.118);
    expect(between).toBeGreaterThan(0.063);
  });

  it('refuses to extrapolate past where the ladder was measured', () => {
    expect(expectedPosteriorSe(7)).toBeNull();
    expect(expectedPosteriorSe(61)).toBeNull();
    expect(expectedPosteriorSe(Number.NaN)).toBeNull();
  });

  /**
   * The floorless ladder is roughly twice as optimistic from 30 trials on, and it is the one most
   * likely to be quoted from memory because it is what E-095 published. Pinning the gap means a
   * view that plots the wrong one is a failing test rather than a plausible-looking chart.
   */
  it('is not the floorless ladder E-095 published', () => {
    expect(expectedPosteriorSe(30)).toBe(0.063);
    expect(expectedPosteriorSe(30, E095_FLOORLESS_POSTERIOR_SE_LADDER)).toBe(0.047);
    expect(expectedPosteriorSe(60, E095_FLOORLESS_POSTERIOR_SE_LADDER)).toBeLessThan(
      expectedPosteriorSe(60)! / 1.5,
    );
  });
});
