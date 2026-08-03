import { describe, expect, it } from 'vitest';

import {
  RECOMMENDED_NOVEL_BLOCK_LENGTH,
  blockReadiness,
  novelItems,
  poolSupportsBlock,
  selectNextNovelItem,
} from './learning-block';
import { startState } from './state';
import {
  buildSyntheticBanks,
  respondSynthetically,
  runSyntheticSession,
} from './testing/synthetic-bank';
import type { TrueTheta } from './testing/synthetic-bank';
import type { Area, BankItem, SessionState } from './types';
import { update } from './update';

const FLAT: TrueTheta = {
  fluid_reasoning: 15,
  verbal: 15,
  quantitative: 15,
  spatial: 15,
};

function seenState(area: Area, itemIds: readonly string[]): SessionState {
  const state = startState('4-5');
  for (const id of itemIds) state.areas[area].itemsSeen.add(id);
  return state;
}

describe('novelItems', () => {
  const banks = buildSyntheticBanks();

  it('returns only items in the area, and only ones not already served', () => {
    const all = banks.items.filter((i) => i.domain === 'spatial');
    const withheld = all.slice(0, 5).map((i) => i.itemId);
    const state = seenState('spatial', withheld);

    const novel = novelItems(banks.items, 'spatial', state);

    expect(novel.length).toBe(all.length - withheld.length);
    expect(novel.every((i) => i.domain === 'spatial')).toBe(true);
    for (const id of withheld) expect(novel.some((i) => i.itemId === id)).toBe(false);
  });

  it('treats every area independently', () => {
    const spatial = banks.items.filter((i) => i.domain === 'spatial');
    const state = seenState(
      'spatial',
      spatial.map((i) => i.itemId),
    );

    expect(novelItems(banks.items, 'spatial', state)).toHaveLength(0);
    expect(novelItems(banks.items, 'verbal', state).length).toBeGreaterThan(0);
  });
});

describe('poolSupportsBlock', () => {
  function item(id: string, difficulty: number): BankItem {
    return {
      itemId: id,
      typeCode: 'T',
      domain: 'verbal',
      difficulty,
      ageBands: ['4-5'],
      content: {},
      answer: { correctKey: 'A' },
      scoring: { mode: 'deterministic_key' },
      provenance: { generator: 'grammar' },
      syntheticOnly: true,
      validated: false,
    };
  }

  it('requires enough DISTINCT items, so a duplicated id cannot pad a block', () => {
    const padded = Array.from({ length: 40 }, () => item('same', 10));
    expect(poolSupportsBlock(padded, 30)).toBe(false);

    const real = Array.from({ length: 30 }, (_, i) => item(`I${i}`, 10));
    expect(poolSupportsBlock(real, 30)).toBe(true);
    expect(poolSupportsBlock(real.slice(0, 29), 30)).toBe(false);
  });

  it('defaults to the recommended block length', () => {
    const pool = Array.from({ length: RECOMMENDED_NOVEL_BLOCK_LENGTH }, (_, i) =>
      item(`I${i}`, 10),
    );
    expect(poolSupportsBlock(pool)).toBe(true);
    expect(poolSupportsBlock(pool.slice(0, -1))).toBe(false);
  });
});

describe('blockReadiness', () => {
  const banks = buildSyntheticBanks();

  it('will not start a block while the estimate is still searching', () => {
    // A fresh session has no estimate history at all, so the search has not settled.
    const readiness = blockReadiness(banks.items, 'verbal', startState('4-5'));

    expect(readiness.ready).toBe(false);
    expect(readiness.reason).toBe('estimate-not-settled');
  });

  it('starts once the area has settled and the pool is deep enough', () => {
    const { state } = runSyntheticSession('4-5', FLAT);
    const settled = (['fluid_reasoning', 'verbal', 'quantitative', 'spatial'] as Area[]).filter(
      (area) => blockReadiness(banks.items, area, state).reason !== 'estimate-not-settled',
    );

    // A completed session should have settled at least one area, else the premise of a Phase 2 that
    // follows Phase 1 does not hold.
    expect(settled.length).toBeGreaterThan(0);

    for (const area of settled) {
      const readiness = blockReadiness(banks.items, area, state);
      expect(readiness.ready).toBe(true);
      expect(readiness.novelCount).toBeGreaterThanOrEqual(RECOMMENDED_NOVEL_BLOCK_LENGTH);
    }
  });

  it('reports a shallow pool separately from an unsettled estimate', () => {
    const { state } = runSyntheticSession('4-5', FLAT);
    const area: Area = 'verbal';
    const pool = banks.items.filter((i) => i.domain === area);
    // Withhold all but a handful, simulating a bank too thin to support the block.
    for (const item of pool.slice(0, pool.length - 3)) state.areas[area].itemsSeen.add(item.itemId);

    const readiness = blockReadiness(banks.items, area, state);
    expect(readiness.ready).toBe(false);
    expect(readiness.reason).toBe('insufficient-novel-items');
    expect(readiness.novelCount).toBe(3);
  });
});

describe('selectNextNovelItem', () => {
  const banks = buildSyntheticBanks();

  it('serves the item nearest the requested difficulty', () => {
    const pool = novelItems(banks.items, 'quantitative', startState('4-5'));
    const served = selectNextNovelItem(pool, [], 13.5, 42);

    expect(served).not.toBeNull();
    const bestDistance = Math.min(...pool.map((i) => Math.abs(i.difficulty - 13.5)));
    expect(Math.abs(served!.difficulty - 13.5)).toBeCloseTo(bestDistance, 10);
  });

  it('never repeats an administered item across a full block', () => {
    const pool = novelItems(banks.items, 'quantitative', startState('4-5'));
    const administered: string[] = [];

    for (let t = 0; t < RECOMMENDED_NOVEL_BLOCK_LENGTH; t += 1) {
      const served = selectNextNovelItem(pool, administered, 12 + t * 0.1, 42);
      expect(served).not.toBeNull();
      administered.push(served!.itemId);
    }

    expect(new Set(administered).size).toBe(RECOMMENDED_NOVEL_BLOCK_LENGTH);
  });

  it('returns null when the pool is exhausted rather than throwing', () => {
    const pool = novelItems(banks.items, 'verbal', startState('4-5')).slice(0, 3);
    const administered = pool.map((i) => i.itemId);

    expect(selectNextNovelItem(pool, administered, 10, 42)).toBeNull();
  });

  it('is deterministic for a given seed, and strips server-only fields', () => {
    const pool = novelItems(banks.items, 'spatial', startState('4-5'));

    const a = selectNextNovelItem(pool, [], 11, 7);
    const b = selectNextNovelItem(pool, [], 11, 7);
    expect(a).toEqual(b);

    // A served item must never carry the answer key.
    expect(a).not.toHaveProperty('answer');
    expect(a).not.toHaveProperty('scoring');
  });
});

/**
 * The structural half of the confound guard.
 *
 * `learning-rate-readout.test.ts` in `@gt-selection/exam-scoring` shows that a growth statistic
 * over a bracketing trace reports a climb for a child who never learned. This side shows the two
 * structural protections that stop such a trace from ever reaching the fit: the block does not
 * begin until the search has settled, and its items are ones the child has not seen.
 */
describe('confound guard: the block starts after the search, on unseen items', () => {
  const banks = buildSyntheticBanks();

  it('the standing phase really does climb for a child of constant ability', () => {
    // The confound is live in this engine, not a hypothetical. True ability is pinned at 15 in
    // every area and the 'K-1' seed starts near 3, so the trace walks 3, 5, 7, 9, 11, 13, 15 all
    // correct before it brackets. Every point of that rise is the search arriving at a child who
    // did not change. A growth statistic over this trace is reading the algorithm, not the child.
    /*
     * Pinned to the staircase, because the staircase is the rule whose walk this documents.
     *
     * The confound is real and this test's point stands, but its SIZE is a property of how the
     * search moves. Under the shipped `mepv` rule the belief reaches a K-1-seeded child of ability
     * 15 inside the first third of the trace, so the ceiling no longer climbs measurably ACROSS
     * thirds and this assertion no longer fires — not because the confound is gone, but because
     * most of the rise now happens before the first third ends. Phase 2 still must not read a
     * growth statistic over a standing trace; how much of a run-up remains under `mepv` is a Stage
     * 2 measurement, and this file is Stage 2's.
     */
    const { state } = runSyntheticSession('K-1', FLAT, { selectionRule: 'staircase' });
    const trace = state.areas.fluid_reasoning.trace;
    expect(trace.length).toBeGreaterThan(6);

    const ceiling = (xs: typeof trace) =>
      Math.max(...xs.filter((o) => o.correct).map((o) => o.difficulty), 0);
    const third = Math.floor(trace.length / 3);

    expect(ceiling(trace.slice(0, third))).toBeLessThan(ceiling(trace.slice(-third)));

    // And the rise is the search, so it is monotone until the first item the child misses.
    const firstMiss = trace.findIndex((o) => !o.correct);
    expect(firstMiss).toBeGreaterThan(2);
    for (let i = 1; i < firstMiss; i += 1) {
      expect(trace[i]!.difficulty).toBeGreaterThan(trace[i - 1]!.difficulty);
    }
  });

  it('every standing item is marked as such, so the fit can exclude them', () => {
    const { state } = runSyntheticSession('2-3', FLAT);
    for (const area of ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'] as Area[]) {
      for (const observation of state.areas[area].trace) {
        expect(observation.stage).toBe('standing');
      }
    }
  });

  it('carries a learning-stage marker through to the trace when one is served', () => {
    let state = startState('4-5');
    const served = selectNextNovelItem(novelItems(banks.items, 'verbal', state), [], 11, 42);
    const scored = respondSynthetically(served!, banks, FLAT);

    state = update(state, { ...scored, stage: 'learning' });

    const trace = state.areas.verbal.trace;
    expect(trace).toHaveLength(1);
    expect(trace[0]!.stage).toBe('learning');
  });

  it('block items are drawn from outside what the standing phase already served', () => {
    const { state } = runSyntheticSession('4-5', FLAT);
    const area: Area = 'fluid_reasoning';
    const alreadySeen = state.areas[area].itemsSeen;

    const pool = novelItems(banks.items, area, state);
    const administered: string[] = [];
    for (let t = 0; t < 10; t += 1) {
      const served = selectNextNovelItem(pool, administered, 14, 42);
      if (served === null) break;
      administered.push(served.itemId);
    }

    expect(administered.length).toBeGreaterThan(0);
    // Novelty is the point: a re-served item measures recall of that item, and a familiar item
    // mid-block produces a jump in the climb that has nothing to do with learning.
    for (const id of administered) expect(alreadySeen.has(id)).toBe(false);
  });
});
