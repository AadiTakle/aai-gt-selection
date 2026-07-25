import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, GRADE_BAND_SEED } from './config';
import { isDone } from './done';
import { NoAvailableItemError, UnknownTypeError } from './errors';
import { nextItem, nextType } from './selection';
import { startState } from './state';
import { buildSyntheticBanks, respondSynthetically, type TrueTheta } from './testing/synthetic-bank';
import { difficultyDelta, update } from './update';
import {
  AREAS,
  type AgeBand,
  type BankItem,
  type Banks,
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

describe('difficultyDelta', () => {
  const cfg = DEFAULT_CONFIG;

  it('stays within the gradual ±0.4..1.0 band', () => {
    const samples: ScoredItem['metrics'][] = [{ 'M-ERRTYPE': 0 }, { 'M-ERRTYPE': 1 }];
    for (const metrics of samples) {
      for (const est of [1, 5, 10, 15, 20]) {
        for (const difficulty of [1, 5, 10, 15, 20]) {
          for (const score of [1, 0]) {
            const delta = difficultyDelta(est, { score, difficulty, metrics }, cfg);
            expect(Math.abs(delta)).toBeGreaterThanOrEqual(cfg.minUpdate - 1e-9);
            expect(Math.abs(delta)).toBeLessThanOrEqual(cfg.maxUpdate + 1e-9);
          }
        }
      }
    }
  });

  it('raises the estimate more for a hard item answered correctly than an easy one', () => {
    const hardRight = difficultyDelta(3, { score: 1, difficulty: 18, metrics: {} }, cfg);
    const easyRight = difficultyDelta(10, { score: 1, difficulty: 2, metrics: {} }, cfg);
    expect(hardRight).toBeGreaterThan(0);
    expect(easyRight).toBeGreaterThan(0);
    expect(hardRight).toBeGreaterThan(easyRight);
  });

  it('lowers the estimate more for an easy item answered wrong than a hard one', () => {
    const easyWrong = difficultyDelta(15, { score: 0, difficulty: 3, metrics: {} }, cfg);
    const hardWrong = difficultyDelta(3, { score: 0, difficulty: 18, metrics: {} }, cfg);
    expect(easyWrong).toBeLessThan(0);
    expect(hardWrong).toBeLessThan(0);
    expect(easyWrong).toBeLessThan(hardWrong); // more negative
  });

  it('softens the downward step for an M-ERRTYPE near-miss', () => {
    const randomMiss = difficultyDelta(15, { score: 0, difficulty: 3, metrics: { 'M-ERRTYPE': 0 } }, cfg);
    const nearMiss = difficultyDelta(15, { score: 0, difficulty: 3, metrics: { 'M-ERRTYPE': 1 } }, cfg);
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
