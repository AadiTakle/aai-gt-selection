import { describe, expect, it } from 'vitest';

import { deriveLearningRate } from './derived-metrics';
import {
  DEFAULT_GUESSING,
  estimateLearningCurve,
  nextTargetTheta,
  type LearningTrial,
} from './learning-curve';
import {
  MIN_TRIALS_FOR_RATE,
  learningRateCohortRank,
  learningRateReadout,
} from './learning-rate-readout';
import { SCALE_MAX, SCALE_MIN, type ScoredItem } from './types';

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
 * A novel block administered the way `nextTargetTheta` intends: difficulty follows the climb.
 *
 * The simulated child answers with the same five-option floor `DEFAULT_GUESSING` assumes, because
 * that is the item format the block is administered from. A floorless responder here would test the
 * readout against a response model no real trial follows, and the mismatch is not harmless in either
 * direction: a fit that assumes a floor the responder lacks attenuates a declining child from −0.35
 * to −0.17 and doubles its posterior SE (E-200).
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

describe('learningRateReadout', () => {
  /**
   * The narrow spread synthetic work explored. Half-width 0.015 against an SE around 0.047.
   *
   * `contaminationFloor: 0` throughout this block so each assertion isolates the behaviour it names.
   * A declared floor is tested on its own below; folding it into every case would mean a failure
   * could not be attributed to the thing the test is about.
   */
  const narrow = { mean: 0.06, sd: 0.03, contaminationFloor: 0 };
  /** Wide enough that the band half-width (0.1) exceeds the estimate's own uncertainty. */
  const wide = { mean: 0, sd: 0.2, contaminationFloor: 0 };

  it('refuses to answer below the trial floor, and says so', () => {
    const readout = learningRateReadout(adaptiveBlock(12, 0.1, 1), { reference: narrow });

    expect(readout.band).toBe('indeterminate');
    expect(readout.trialCount).toBe(12);
    expect(readout.reason).toContain(`${MIN_TRIALS_FOR_RATE}-trial floor`);
    // No number at all below the floor: a diagnostic value here would end up being quoted.
    expect(readout.lambdaDiagnostic).toBeNull();
    expect(readout.lambdaSe).toBeNull();
  });

  it('refuses when the reference has no spread to define band edges', () => {
    const readout = learningRateReadout(adaptiveBlock(30, 0.1, 2), {
      reference: { mean: 0.06, sd: 0, contaminationFloor: 0 },
    });
    expect(readout.band).toBe('indeterminate');
    expect(readout.reason).toContain('reference SD');
  });

  it('is indeterminate at the 30-trial floor against a realistic narrow reference', () => {
    // The load-bearing finding, encoded. At this length the posterior SE runs about 0.047, roughly
    // three times the 0.015 half-width of a band drawn on an SD-0.03 reference, so no band is
    // separable. If a change ever makes this report a band, the estimator has become overconfident
    // rather than better.
    const readout = learningRateReadout(adaptiveBlock(30, 0.1, 3), { reference: narrow });

    expect(readout.band).toBe('indeterminate');
    expect(readout.reason).toContain('not separable at this precision');
    // The number still rides along, for logging and later calibration.
    expect(readout.lambdaDiagnostic).not.toBeNull();
    expect(readout.lambdaSe).not.toBeNull();
    expect(readout.lambdaSe!).toBeGreaterThan(0.5 * narrow.sd);
  });

  it('names a band once the reference spread exceeds the estimate uncertainty', () => {
    const fast = learningRateReadout(adaptiveBlock(30, 0.35, 0), { reference: wide });
    const flat = learningRateReadout(adaptiveBlock(30, 0, 4), { reference: wide });
    const slow = learningRateReadout(adaptiveBlock(30, -0.35, 0), { reference: wide });

    expect(fast.band).toBe('above');
    expect(flat.band).toBe('typical');
    expect(slow.band).toBe('below');
    for (const r of [fast, flat, slow]) {
      expect(r.lambdaDiagnostic).not.toBeNull();
      expect(r.lambdaSe!).toBeLessThan(0.5 * wide.sd);
    }
  });

  it('always carries the hypothesis marker', () => {
    for (const trials of [adaptiveBlock(12, 0.1, 7), adaptiveBlock(30, 0.1, 8)]) {
      expect(learningRateReadout(trials, { reference: narrow }).hypothesis).toBe(true);
    }
  });

  // E-200. The bar tests separability against random error PLUS the systematic floor the adaptive
  // loop is measured to produce, because a band the pipeline would also have given a non-learner is
  // not a finding about the child.
  describe('the declared contamination floor', () => {
    const fast = adaptiveBlock(30, 0.35, 0);

    it('withdraws a band the reference can no longer separate', () => {
      const withoutFloor = learningRateReadout(fast, { reference: wide });
      const withFloor = learningRateReadout(fast, {
        reference: { ...wide, contaminationFloor: 0.09 },
      });

      // Same trials, same fit. The only thing that changed is what the caller declared it knows
      // about its own pipeline, and it is enough to take the verdict away.
      expect(withoutFloor.band).toBe('above');
      expect(withFloor.band).toBe('indeterminate');
      expect(withFloor.reason).toContain('contamination floor');
      expect(withFloor.lambdaDiagnostic).toBe(withoutFloor.lambdaDiagnostic);
    });

    it('leaves a band standing when the floor still fits inside the half-width', () => {
      const readout = learningRateReadout(fast, {
        reference: { ...wide, contaminationFloor: 0.005 },
      });
      expect(readout.band).toBe('above');
    });

    it('refuses outright when no floor has been measured', () => {
      const readout = learningRateReadout(fast, {
        // A caller reaching for `-1` or `NaN` has not measured it. Naming a band anyway would make
        // the required field decorative.
        reference: { ...wide, contaminationFloor: Number.NaN },
      });
      expect(readout.band).toBe('indeterminate');
      expect(readout.reason).toContain('measured contamination floor');
    });
  });
});

describe('learningRateCohortRank', () => {
  it('declines to rank against a handful of peers', () => {
    expect(learningRateCohortRank(0.1, [0.01, 0.02, 0.03])).toBeNull();
    expect(
      learningRateCohortRank(
        0.1,
        Array.from({ length: 19 }, (_, i) => i / 100),
      ),
    ).toBeNull();
  });

  it('ranks within a cohort large enough to mean something', () => {
    const cohort = Array.from({ length: 40 }, (_, i) => i / 400);

    const top = learningRateCohortRank(1, cohort);
    const bottom = learningRateCohortRank(-1, cohort);
    const middle = learningRateCohortRank(cohort[20]!, cohort);

    expect(top?.percentile).toBe(1);
    expect(bottom?.percentile).toBe(0);
    expect(middle?.percentile).toBeCloseTo(0.5, 1);
    expect(top?.cohortSize).toBe(40);
    expect(top?.hypothesis).toBe(true);
  });

  it('ignores non-finite cohort entries rather than poisoning the percentile', () => {
    const cohort = [...Array.from({ length: 25 }, (_, i) => i / 100), NaN, Infinity];
    expect(learningRateCohortRank(0.12, cohort)?.cohortSize).toBe(25);
  });
});

/**
 * The confound this whole regime exists to remove.
 *
 * Every trace below is produced by a child whose ability NEVER CHANGES. Under bracketing the served
 * difficulty climbs as the search closes on them, so the hardest item they have solved rises across
 * the session. Any growth reported from these traces is an artifact of the search, not learning.
 */
describe('confound guard: a rising ceiling is not evidence of learning', () => {
  const TRUE_ABILITY = 15;

  function scored(difficulty: number, i: number): ScoredItem {
    const correct = difficulty <= TRUE_ABILITY;
    return {
      itemId: `I${i}`,
      typeCode: 'T',
      domain: 'fluid_reasoning',
      metrics: {},
      correct,
      score: correct ? 1 : 0,
      difficulty,
    };
  }

  /**
   * A bracketing trace for a child of CONSTANT ability, seeded `start` points below it: difficulty
   * walks up in half-point steps, then oscillates once the search has arrived.
   */
  function convergingTrace(start: number, tail = 8): ScoredItem[] {
    const difficulties: number[] = [];
    for (let d = start; d <= TRUE_ABILITY; d += 0.5) difficulties.push(d);
    for (let k = 0; k < tail; k += 1) {
      difficulties.push(k % 2 === 0 ? TRUE_ABILITY + 0.5 : TRUE_ABILITY - 0.5);
    }
    return difficulties.map(scored);
  }

  function asTrials(items: readonly ScoredItem[]): LearningTrial[] {
    return items.map((item, t) => ({
      difficulty: item.difficulty,
      score: item.score,
      trialIndex: t,
    }));
  }

  it('the half-contrast growth index IS fooled by a converging search', () => {
    const growth = deriveLearningRate(convergingTrace(4), SCALE_MIN, SCALE_MAX);

    // 0.5 is the index's no-growth point. This child learned nothing and the index says they grew.
    expect(growth).not.toBeNull();
    expect(growth!).toBeGreaterThan(0.5);
  });

  it('and is fooled MORE the further the seed started from the child', () => {
    // Exactly what `deriveLearningRate`'s own claim boundary warns about: the apparent climb tracks
    // seed distance. A child started further from their level looks like a faster learner.
    const near = deriveLearningRate(convergingTrace(8), SCALE_MIN, SCALE_MAX)!;
    const far = deriveLearningRate(convergingTrace(2), SCALE_MIN, SCALE_MAX)!;

    expect(far).toBeGreaterThan(near);
  });

  it('the difficulty-conditioned fit is NOT fooled by the same search', () => {
    // This is the positive reason to prefer the fit. Because it conditions on each item's
    // difficulty, a rising difficulty ramp is explained by the ramp rather than mistaken for
    // rising ability, and the recovered climb stays at zero where the truth is zero.
    for (const start of [2, 4, 6, 8]) {
      const fit = estimateLearningCurve(asTrials(convergingTrace(start)), {
        slope: SLOPE,
        priorTheta0Mean: start,
      });
      expect(Math.abs(fit.lambda)).toBeLessThan(0.08);
    }
  });

  it('a genuine flat block reports no climb on average, and never a spurious band', () => {
    const flatBlocks = Array.from({ length: 40 }, (_, seed) => adaptiveBlock(30, 0, seed));
    const fits = flatBlocks.map(
      (trials) => estimateLearningCurve(trials, { slope: SLOPE, priorTheta0Mean: THETA0 }).lambda,
    );

    // Averaged over children the fit sits on zero, where the truth is.
    const mean = fits.reduce((a, b) => a + b, 0) / fits.length;
    expect(Math.abs(mean)).toBeLessThan(0.02);

    // But no INDIVIDUAL child's estimate can be asserted that tightly: with an SE around 0.06 a
    // single flat child routinely lands 0.05-0.1 away from zero. That is the whole reason the
    // reportable output is a band and not this number.
    expect(Math.max(...fits.map(Math.abs))).toBeGreaterThan(0.05);

    // The claim worth guarding is that a child who learned nothing is never CALLED a learner. It is
    // deliberately not "always `typical`": against a five-option responder some 30-trial blocks come
    // back with a posterior wider than even this SD 0.4 reference can separate, and `indeterminate`
    // is the right answer for those rather than a near miss (E-200).
    const bands = flatBlocks.map(
      (trials) =>
        learningRateReadout(trials, { reference: { mean: 0, sd: 0.4, contaminationFloor: 0 } })
          .band,
    );
    for (const band of bands) {
      expect(['typical', 'indeterminate']).toContain(band);
    }
    expect(bands.filter((b) => b === 'typical').length).toBeGreaterThan(flatBlocks.length / 2);
  });
});
