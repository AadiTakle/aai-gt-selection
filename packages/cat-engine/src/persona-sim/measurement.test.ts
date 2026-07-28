import { describe, expect, it } from 'vitest';

import { probabilityCorrect } from '../irt';
import { hashSeed, mulberry32 } from '../rng';
import type { IrtParameters } from '../types';

import { dialToTheta } from './latent';
import {
  difficultyReachTheta,
  effectiveTheta,
  irtFromDial,
  lureClassForErrorType,
  randomErrorProbability,
  sampleCorrect,
  sampleDifficultyReachDial,
  sampleErrorType,
  sampleGuessCorrect,
  sampleOnTask,
  sampleRapidGuessRtMs,
  sampleResponseTimeMs,
  driftedEngagement,
} from './measurement';

const irt = (b: number, a = 1.2, c = 0.25): IrtParameters => ({ a, b, c, model: '3PL' });

describe('irtFromDial', () => {
  it('uses the design doc dial->theta mapping for difficulty', () => {
    expect(irtFromDial(15).b).toBeCloseTo(dialToTheta(15), 12);
    expect(irtFromDial(10.5).b).toBeCloseTo(0, 12);
  });

  it('defaults to a four-option guessing floor', () => {
    expect(irtFromDial(10).c).toBeCloseTo(0.25, 12);
  });
});

describe('sampleCorrect', () => {
  it('matches probabilityCorrect empirically across the theta range', () => {
    const item = irt(0.4);
    for (const theta of [-2, -1, -0.5, 0, 0.5, 1, 2]) {
      const rand = mulberry32(hashSeed(`hit-rate|${theta}`));
      const n = 20000;
      let hits = 0;
      for (let i = 0; i < n; i++) if (sampleCorrect(rand, theta, item)) hits += 1;
      expect(hits / n).toBeCloseTo(probabilityCorrect(theta, item), 1);
      expect(Math.abs(hits / n - probabilityCorrect(theta, item))).toBeLessThan(0.02);
    }
  });

  it('approaches the guessing floor far below the item difficulty', () => {
    const item = irt(3);
    const rand = mulberry32(hashSeed('floor'));
    let hits = 0;
    for (let i = 0; i < 20000; i++) if (sampleCorrect(rand, -3, item)) hits += 1;
    expect(hits / 20000).toBeCloseTo(item.c, 1);
  });
});

describe('difficultyReachTheta', () => {
  it('returns the difficulty at which success probability is exactly 0.5', () => {
    for (const theta of [-1.5, 0, 1.2]) {
      const item = irt(0);
      const b = difficultyReachTheta(theta, item);
      expect(probabilityCorrect(theta, { ...item, b })).toBeCloseTo(0.5, 10);
    }
  });

  it('sits ABOVE theta when there is a guessing floor (chance is the upper asymptote)', () => {
    expect(difficultyReachTheta(0, irt(0, 1.2, 0.25))).toBeGreaterThan(0);
    expect(difficultyReachTheta(0, irt(0, 1.2, 0))).toBeCloseTo(0, 10);
  });

  it('is infinite when the guessing floor is at or above 0.5', () => {
    expect(difficultyReachTheta(0, irt(0, 1.2, 0.5))).toBe(Number.POSITIVE_INFINITY);
  });

  it('increases one-for-one with theta', () => {
    const item = irt(0);
    expect(difficultyReachTheta(1, item) - difficultyReachTheta(0, item)).toBeCloseTo(1, 10);
  });
});

describe('sampleDifficultyReachDial', () => {
  it('tracks theta on the 1-20 dial with modest noise', () => {
    const item = irt(0);
    const rand = mulberry32(hashSeed('diffreach'));
    const draws: number[] = [];
    for (let i = 0; i < 4000; i++) draws.push(sampleDifficultyReachDial(rand, 1.5, item));
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    // theta 1.5 -> dial 15, plus the guessing-floor offset on the 0.5 crossing.
    expect(mean).toBeGreaterThan(15);
    expect(mean).toBeLessThan(17);
  });

  it('falls back to the plain dial when the curve never crosses 0.5', () => {
    const rand = mulberry32(hashSeed('diffreach-degenerate'));
    expect(sampleDifficultyReachDial(rand, 0, irt(0, 1.2, 0.6))).toBeCloseTo(10.5, 12);
  });
});

describe('error type', () => {
  it('shifts from near-miss to random as (b - theta) grows', () => {
    const atAbility = randomErrorProbability(0, irt(0));
    const wellAbove = randomErrorProbability(0, irt(2.5));
    const below = randomErrorProbability(0, irt(-1.5));
    expect(below).toBeLessThan(atAbility);
    expect(atAbility).toBeLessThan(wellAbove);
    expect(wellAbove).toBeGreaterThan(0.7);
    expect(below).toBeLessThan(0.15);
  });

  it('samples at the modelled rate', () => {
    const rand = mulberry32(hashSeed('errtype'));
    const item = irt(2.5);
    let random = 0;
    for (let i = 0; i < 8000; i++) {
      if (sampleErrorType(rand, 0, item) === 'random') random += 1;
    }
    expect(random / 8000).toBeCloseTo(randomErrorProbability(0, item), 1);
  });

  it('maps error types onto distinct lure classes', () => {
    expect(lureClassForErrorType('near_miss')).toBe('local_fit');
    expect(lureClassForErrorType('random')).toBe('global_mismatch');
  });
});

describe('sampleResponseTimeMs', () => {
  const base = { speed: 0, consistency: 0.7 };

  it('is monotonically increasing in (b - theta)', () => {
    const rts = [-2, -1, 0, 1, 2].map(
      (delta) =>
        sampleResponseTimeMs(mulberry32(hashSeed('rt-monotone')), {
          ...base,
          theta: 0,
          irt: irt(delta),
        }).rtMs,
    );
    for (let i = 1; i < rts.length; i++) expect(rts[i]!).toBeGreaterThan(rts[i - 1]!);
  });

  it('is faster for a faster processing speed', () => {
    const slow = sampleResponseTimeMs(mulberry32(hashSeed('rt-speed')), {
      ...base,
      theta: 0,
      irt: irt(0),
      speed: -1.5,
    }).rtMs;
    const fast = sampleResponseTimeMs(mulberry32(hashSeed('rt-speed')), {
      ...base,
      theta: 0,
      irt: irt(0),
      speed: 1.5,
    }).rtMs;
    expect(fast).toBeLessThan(slow);
  });

  it('spreads more for a less consistent persona', () => {
    const spread = (consistency: number) => {
      const rand = mulberry32(hashSeed(`rt-spread|${consistency}`));
      const logs: number[] = [];
      for (let i = 0; i < 4000; i++) {
        logs.push(
          Math.log(
            sampleResponseTimeMs(
              rand,
              { theta: 0, irt: irt(0), speed: 0, consistency },
              { lapseRate: 0 },
            ).rtMs,
          ),
        );
      }
      const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
      return Math.sqrt(logs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / logs.length);
    };
    expect(spread(0.2)).toBeGreaterThan(spread(0.9));
  });

  it('flags lapses at roughly the configured rate and stretches them', () => {
    const rand = mulberry32(hashSeed('rt-lapse'));
    let lapses = 0;
    for (let i = 0; i < 6000; i++) {
      if (
        sampleResponseTimeMs(rand, { ...base, theta: 0, irt: irt(0) }, { lapseRate: 0.1 }).lapse
      ) {
        lapses += 1;
      }
    }
    expect(lapses / 6000).toBeCloseTo(0.1, 1);
  });
});

describe('the engagement gate primitives', () => {
  it('declines the on-task probability with each off-task trial', () => {
    expect(driftedEngagement(0.9, 0)).toBeCloseTo(0.9, 12);
    expect(driftedEngagement(0.9, 1)).toBeCloseTo(0.84, 12);
    expect(driftedEngagement(0.9, 2)).toBeCloseTo(0.78, 12);
  });

  it('caps the total decline so a long form does not death-spiral', () => {
    expect(driftedEngagement(0.9, 100)).toBeCloseTo(0.75, 12);
    expect(driftedEngagement(0.9, 100, { maxTotalDrift: 5, driftFloor: 0.1 })).toBeCloseTo(0.1, 12);
  });

  it('never raises a fully disengaged persona above zero', () => {
    expect(driftedEngagement(0, 0)).toBe(0);
    expect(driftedEngagement(0, 5)).toBe(0);
  });

  it('samples on-task at the supplied probability', () => {
    const rand = mulberry32(hashSeed('ontask'));
    let onTask = 0;
    for (let i = 0; i < 10000; i++) if (sampleOnTask(rand, 0.65)) onTask += 1;
    expect(onTask / 10000).toBeCloseTo(0.65, 1);
  });

  it('draws rapid-guess RTs inside the non-effortful band', () => {
    const rand = mulberry32(hashSeed('rapidguess'));
    for (let i = 0; i < 2000; i++) {
      const rt = sampleRapidGuessRtMs(rand);
      expect(rt).toBeGreaterThanOrEqual(150);
      expect(rt).toBeLessThanOrEqual(1400);
    }
  });

  it('scores a non-effortful response at the guessing floor regardless of ability', () => {
    const item = irt(-3);
    const rand = mulberry32(hashSeed('guess-correct'));
    let hits = 0;
    for (let i = 0; i < 20000; i++) if (sampleGuessCorrect(rand, item)) hits += 1;
    expect(hits / 20000).toBeCloseTo(item.c, 1);
  });
});

describe('effectiveTheta', () => {
  it('climbs linearly with the trial index inside a novel block', () => {
    expect(effectiveTheta(0.5, 0.04, 0)).toBeCloseTo(0.5, 12);
    expect(effectiveTheta(0.5, 0.04, 5)).toBeCloseTo(0.7, 12);
  });
});
