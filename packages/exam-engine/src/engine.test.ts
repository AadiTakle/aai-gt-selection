import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, GRADE_BAND_SEED } from './config';
import { isDone } from './done';
import { NoAvailableItemError, UnknownTypeError } from './errors';
import { nextItem, nextType } from './selection';
import { startState } from './state';
import { buildSyntheticBanks, respondSynthetically, type TrueTheta } from './testing/synthetic-bank';
import { difficultyDelta, directionReversals, stepSize, update } from './update';
import {
  AREAS,
  type AgeBand,
  type BankItem,
  type Banks,
  type ItemObservation,
  type ScoredItem,
  type ServedItem,
} from './types';

function scoredFrom(
  served: ServedItem,
  opts: { score: number; metrics?: Record<string, number> },
): ScoredItem {
  return {
    itemId: served.itemId,
    typeCode: served.typeCode,
    domain: served.domain,
    response: {},
    metrics: { 'M-ACC': opts.score, ...(opts.metrics ?? {}) },
    telemetry: [],
    correct: opts.score >= 0.5,
    score: opts.score,
    difficulty: served.difficulty,
  };
}

describe('startState', () => {
  it.each<[AgeBand, number]>([
    ['K-1', 3],
    ['2-3', 7],
    ['4-5', 11],
    ['6-8', 15],
    ['above-level', 18],
  ])('seeds every area difficulty from grade band %s', (band, seed) => {
    const state = startState(band);
    expect(GRADE_BAND_SEED[band]).toBe(seed);
    for (const area of AREAS) {
      expect(state.areas[area].difficulty).toBe(seed);
      expect(state.areas[area].itemsSeen.size).toBe(0);
      expect(state.areas[area].estWindow).toEqual([seed]);
    }
    expect(state.itemsServed).toBe(0);
    expect(isDone(state)).toBe(false);
  });

  it('applies config overrides deterministically', () => {
    const state = startState('4-5', { hardItemCap: 7, difficultyWindow: 1 });
    expect(state.config.hardItemCap).toBe(7);
    expect(state.config.difficultyWindow).toBe(1);
    expect(state.config.minUpdate).toBe(DEFAULT_CONFIG.minUpdate);
  });
});

/** An area whose trace produced `reversals` direction changes, for step-schedule assertions. */
function areaWith(difficulty: number, correctness: readonly boolean[]) {
  return {
    difficulty,
    trace: correctness.map<ItemObservation>((correct, i) => ({
      itemId: `I${i}`,
      typeCode: 'T',
      difficulty,
      score: correct ? 1 : 0,
      correct,
      rtMs: null,
      angularDisparityDeg: null,
    })),
  };
}

describe('stepSize', () => {
  const cfg = DEFAULT_CONFIG;

  it('starts at initialStep and decays monotonically toward minUpdate', () => {
    expect(stepSize(0, cfg)).toBeCloseTo(cfg.initialStep, 10);

    let previous = stepSize(0, cfg);
    for (let reversals = 1; reversals <= 40; reversals++) {
      const step = stepSize(reversals, cfg);
      expect(step).toBeLessThan(previous);
      expect(step).toBeGreaterThanOrEqual(cfg.minUpdate);
      previous = step;
    }
    expect(stepSize(1000, cfg)).toBeCloseTo(cfg.minUpdate, 2);
  });

  it('crosses the widest seed-to-ability gap the screener must handle inside a few items', () => {
    // A '4-5' child seeded at 11 whose true ability is 18: while responses stay one-sided there
    // are no reversals, so the estimate travels at initialStep and covers 7 points in 4 items.
    const perItem = stepSize(0, cfg);
    expect(Math.ceil(7 / perItem)).toBeLessThanOrEqual(4);
  });

  it('holds the full stride for stepBurnInReversals reversals before decaying', () => {
    const patient = { ...cfg, stepBurnInReversals: 2 };
    expect(stepSize(0, patient)).toBeCloseTo(cfg.initialStep, 10);
    expect(stepSize(2, patient)).toBeCloseTo(cfg.initialStep, 10);
    expect(stepSize(3, patient)).toBeLessThan(cfg.initialStep);
  });

  it('decays faster for a larger exponent', () => {
    const slow = stepSize(4, { ...cfg, stepDecayExponent: 0.5 });
    const fast = stepSize(4, { ...cfg, stepDecayExponent: 2 });
    expect(fast).toBeLessThan(slow);
  });
});

describe('directionReversals', () => {
  it('counts every place the response direction flips', () => {
    expect(directionReversals(areaWith(11, []).trace)).toBe(0);
    expect(directionReversals(areaWith(11, [true, true, true]).trace)).toBe(0);
    expect(directionReversals(areaWith(11, [true, false, true, false]).trace)).toBe(3);
    expect(directionReversals(areaWith(11, [true, true, false, false, true]).trace)).toBe(2);
  });
});

describe('difficultyDelta', () => {
  const cfg = DEFAULT_CONFIG;

  it('stays within the [minUpdate, maxUpdate] band', () => {
    const samples: ScoredItem['metrics'][] = [{ 'M-ERRTYPE': 0 }, { 'M-ERRTYPE': 1 }];
    const histories = [[], [true, false, true, false], [true, true, true]] as boolean[][];
    for (const metrics of samples) {
      for (const history of histories) {
        for (const est of [1, 5, 10, 15, 20]) {
          for (const difficulty of [1, 5, 10, 15, 20]) {
            for (const score of [1, 0]) {
              const delta = difficultyDelta(
                areaWith(est, history),
                { score, difficulty, metrics },
                cfg,
              );
              expect(Math.abs(delta)).toBeGreaterThanOrEqual(cfg.minUpdate - 1e-9);
              expect(Math.abs(delta)).toBeLessThanOrEqual(cfg.maxUpdate + 1e-9);
            }
          }
        }
      }
    }
  });

  it('moves at the full stride while the estimate is still travelling one-sidedly', () => {
    const climbing = difficultyDelta(
      areaWith(11, [true, true, true]),
      { score: 1, difficulty: 11, metrics: {} },
      cfg,
    );
    expect(climbing).toBeCloseTo(cfg.initialStep, 10);
  });

  it('shrinks the step at the reversal that produces it, not one item later', () => {
    const history = [true, true, true];
    const reversing = difficultyDelta(
      areaWith(11, history),
      { score: 0, difficulty: 11, metrics: {} },
      cfg,
    );
    expect(Math.abs(reversing)).toBeCloseTo(stepSize(1, cfg), 10);
    expect(Math.abs(reversing)).toBeLessThan(cfg.initialStep);
  });

  it('keeps shrinking as reversals accumulate, so a settled area moves finely', () => {
    const alternating = (n: number) => Array.from({ length: n }, (_, i) => i % 2 === 0);
    const stepAfter = (n: number) =>
      Math.abs(
        difficultyDelta(areaWith(11, alternating(n)), { score: 1, difficulty: 11, metrics: {} }, cfg),
      );

    expect(stepAfter(8)).toBeLessThan(stepAfter(2));
    // Finer than the fixed 0.4 floor this schedule replaced: tail precision improves, not degrades.
    expect(stepAfter(16)).toBeLessThan(0.4);
  });

  it('raises the estimate more for a hard item answered correctly than an easy one', () => {
    const hardRight = difficultyDelta(areaWith(3, []), { score: 1, difficulty: 18, metrics: {} }, cfg);
    const easyRight = difficultyDelta(areaWith(10, []), { score: 1, difficulty: 2, metrics: {} }, cfg);
    expect(hardRight).toBeGreaterThan(0);
    expect(easyRight).toBeGreaterThan(0);
    expect(hardRight).toBeGreaterThan(easyRight);
  });

  it('lowers the estimate more for an easy item answered wrong than a hard one', () => {
    const easyWrong = difficultyDelta(areaWith(15, []), { score: 0, difficulty: 3, metrics: {} }, cfg);
    const hardWrong = difficultyDelta(areaWith(3, []), { score: 0, difficulty: 18, metrics: {} }, cfg);
    expect(easyWrong).toBeLessThan(0);
    expect(hardWrong).toBeLessThan(0);
    expect(easyWrong).toBeLessThan(hardWrong); // more negative
  });

  it('reduces to the pre-D-023 fixed-step rule when the schedule is flattened', () => {
    // Setting `initialStep` equal to `minUpdate` removes the decay, and a `surpriseGain` of 1.5
    // makes surprise span 0.4..1.0 — exactly `magnitude = 0.4 + 0.6 * surprise`. The schedule
    // therefore GENERALISES the old rule rather than replacing it, which is the reversal path
    // recorded in the decision log: no code needs to be reverted to restore the old behaviour.
    const legacy = { ...cfg, minUpdate: 0.4, maxUpdate: 1.0, initialStep: 0.4, surpriseGain: 1.5 };
    const history = [true, false, true, false, true];

    for (const est of [1, 5, 11, 15, 20]) {
      for (const difficulty of [1, 5, 11, 15, 20]) {
        for (const nearMiss of [0, 0.5, 1]) {
          for (const score of [1, 0]) {
            const surprise = Math.min(
              1,
              Math.max(0, (score >= 0.5 ? difficulty - est : est - difficulty) / 19),
            );
            const raw = 0.4 + 0.6 * surprise;
            const expected =
              score >= 0.5 ? raw : -(0.4 + (raw - 0.4) * (1 - cfg.nearMissSoften * nearMiss));

            const delta = difficultyDelta(
              areaWith(est, history),
              { score, difficulty, metrics: { 'M-ERRTYPE': nearMiss } },
              legacy,
            );
            expect(delta).toBeCloseTo(expected, 10);
          }
        }
      }
    }
  });

  it('softens the downward step for an M-ERRTYPE near-miss', () => {
    const randomMiss = difficultyDelta(
      areaWith(15, []),
      { score: 0, difficulty: 3, metrics: { 'M-ERRTYPE': 0 } },
      cfg,
    );
    const nearMiss = difficultyDelta(
      areaWith(15, []),
      { score: 0, difficulty: 3, metrics: { 'M-ERRTYPE': 1 } },
      cfg,
    );
    expect(nearMiss).toBeLessThan(0);
    expect(nearMiss).toBeGreaterThan(randomMiss); // less negative = softened
  });
});

describe('update', () => {
  it('moves difficulty up on correct, down on incorrect, and records the sample', () => {
    const state = startState('4-5'); // seed 11
    const banks = buildSyntheticBanks();
    const served = nextItem(state, 'FLU-MATRIX-01', banks);

    const up = update(state, scoredFrom(served, { score: 1, metrics: { 'M-RULEID': 1 } }));
    expect(up.areas.fluid_reasoning.difficulty).toBeGreaterThan(11);
    expect(up.areas.fluid_reasoning.itemsSeen.has(served.itemId)).toBe(true);
    expect(up.areas.fluid_reasoning.metricCounts['M-ACC']).toBe(1);
    expect(up.areas.fluid_reasoning.metricCounts['M-RULEID']).toBe(1);
    expect(up.areas.fluid_reasoning.accWindow).toEqual([1]);
    expect(up.itemsServed).toBe(1);

    const down = update(state, scoredFrom(served, { score: 0 }));
    expect(down.areas.fluid_reasoning.difficulty).toBeLessThan(11);
  });

  it('does not mutate the input state (pure)', () => {
    const state = startState('4-5');
    const banks = buildSyntheticBanks();
    const served = nextItem(state, 'FLU-MATRIX-01', banks);
    update(state, scoredFrom(served, { score: 1 }));
    expect(state.itemsServed).toBe(0);
    expect(state.areas.fluid_reasoning.difficulty).toBe(11);
    expect(state.areas.fluid_reasoning.itemsSeen.size).toBe(0);
  });

  it('clamps difficulty to the upper bound (20)', () => {
    const banks = buildSyntheticBanks();
    let state = startState('above-level'); // seed 18
    for (let i = 0; i < 25; i++) {
      const served = nextItem(state, 'SPA-FOLDNET-01', banks);
      // Always correct on the hardest available item: keep pushing the ceiling.
      const hard: ScoredItem = { ...scoredFrom(served, { score: 1 }), difficulty: 20 };
      state = update(state, hard);
    }
    expect(state.areas.spatial.difficulty).toBeLessThanOrEqual(20);
    expect(state.areas.spatial.difficulty).toBeGreaterThan(18);
  });

  it('clamps difficulty to the lower bound (1)', () => {
    const banks = buildSyntheticBanks();
    let state = startState('K-1'); // seed 3
    for (let i = 0; i < 25; i++) {
      const served = nextItem(state, 'VER-RELPAIR-01', banks);
      const easyWrong: ScoredItem = { ...scoredFrom(served, { score: 0 }), difficulty: 1 };
      state = update(state, easyWrong);
    }
    expect(state.areas.verbal.difficulty).toBeGreaterThanOrEqual(1);
    expect(state.areas.verbal.difficulty).toBeLessThan(3);
  });
});

describe('nextItem', () => {
  const tinyBanks: Banks = {
    types: [
      { typeCode: 'T', domain: 'fluid_reasoning', ageBands: ['4-5'], metrics: ['M-ACC'] },
    ],
    items: ([5, 9, 12] as number[]).map<BankItem>((difficulty) => ({
      itemId: `T#${difficulty}`,
      typeCode: 'T',
      domain: 'fluid_reasoning',
      difficulty,
      ageBands: ['4-5'],
      content: {},
      answer: { correctKey: 'A' },
      scoring: { mode: 'deterministic_key' },
      provenance: { generator: 'grammar' },
      syntheticOnly: true,
      validated: false,
    })),
  };

  it('serves the unseen item whose difficulty is closest to the area estimate', () => {
    const state = startState('4-5'); // fluid difficulty 11
    const served = nextItem(state, 'T', tinyBanks);
    expect(served.itemId).toBe('T#12'); // |12-11| < |9-11| < |5-11|
    expect('answer' in served).toBe(false); // server-only fields stripped
  });

  it('never repeats a served item and picks the next closest', () => {
    let state = startState('4-5');
    const first = nextItem(state, 'T', tinyBanks);
    state = update(state, scoredFrom(first, { score: 1 }));
    const second = nextItem(state, 'T', tinyBanks);
    expect(second.itemId).not.toBe(first.itemId);
    expect(second.itemId).toBe('T#9');
  });

  it('throws when the type is unknown or exhausted', () => {
    let state = startState('4-5');
    expect(() => nextItem(state, 'NOPE', tinyBanks)).toThrow(UnknownTypeError);
    for (let i = 0; i < tinyBanks.items.length; i++) {
      const served = nextItem(state, 'T', tinyBanks);
      state = update(state, scoredFrom(served, { score: 1 }));
    }
    expect(() => nextItem(state, 'T', tinyBanks)).toThrow(NoAvailableItemError);
  });
});

describe('nextType', () => {
  it('keeps an even spread across the four areas', () => {
    const banks = buildSyntheticBanks();
    const trueTheta: TrueTheta = {
      fluid_reasoning: 20,
      verbal: 20,
      quantitative: 20,
      spatial: 20,
    }; // everything correct, so difficulty only climbs
    let state = startState('4-5');
    for (let i = 0; i < 12; i++) {
      const typeCode = nextType(state, banks);
      expect(typeCode).not.toBeNull();
      const served = nextItem(state, typeCode as string, banks);
      state = update(state, respondSynthetically(served, banks, trueTheta));
    }
    const counts = AREAS.map((a) => state.areas[a].itemsSeen.size);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(
      state.config.evenSpreadTolerance,
    );
    // 12 items across 4 areas, round-robin => 3 each.
    expect(counts).toEqual([3, 3, 3, 3]);
  });

  it('prefers a type whose declared metrics fill an under-covered core metric', () => {
    // Two fluid types in an otherwise-covered area: only FLU-RULE contributes the missing M-RULEID.
    const banks: Banks = {
      types: [
        { typeCode: 'FLU-PLAIN', domain: 'fluid_reasoning', ageBands: ['4-5'], metrics: ['M-ACC'] },
        {
          typeCode: 'FLU-RULE',
          domain: 'fluid_reasoning',
          ageBands: ['4-5'],
          metrics: ['M-ACC', 'M-RULEID'],
        },
      ],
      items: ['FLU-PLAIN', 'FLU-RULE'].flatMap((typeCode) =>
        [10, 11, 12].map<BankItem>((difficulty) => ({
          itemId: `${typeCode}#${difficulty}`,
          typeCode,
          domain: 'fluid_reasoning',
          difficulty,
          ageBands: ['4-5'],
          content: {},
          answer: { correctKey: 'A' },
          scoring: { mode: 'deterministic_key' },
          provenance: { generator: 'grammar' },
          syntheticOnly: true,
          validated: false,
        })),
      ),
    };
    const state = startState('4-5');
    expect(nextType(state, banks)).toBe('FLU-RULE');
  });

  it('returns null once the session is done', () => {
    const banks = buildSyntheticBanks();
    const done = startState('4-5', { hardItemCap: 0 });
    expect(isDone(done)).toBe(true);
    expect(nextType(done, banks)).toBeNull();
  });
});

describe('isDone', () => {
  it('is false at the start and true once the hard item cap is reached', () => {
    const state = startState('4-5');
    expect(isDone(state)).toBe(false);
    expect(isDone({ ...state, itemsServed: state.config.hardItemCap })).toBe(true);
  });
});
