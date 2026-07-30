import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from './config';
import { nextItem, nextType } from './selection';
import { startState } from './state';
import { loadRealBanks } from './testing/real-bank';
import type { Banks, SessionState, TypeCode } from './types';

/**
 * Guards the fix for the deterministic question order.
 *
 * Selection used to be a strict argmax whose only variation was a +-0.1 jitter, which could never
 * outweigh a metric weight (1 or 2) or the age bonus (1.5). Combined with a hard-coded seed, every
 * child received the same types in the same order. These tests fail if either property regresses.
 */

// The REAL wired bank, not the synthetic one: the synthetic bank has too few types per area for
// variety to be observable, so it would pass these tests no matter what selection did.
const banks: Banks = loadRealBanks().banks;

/**
 * Serve `count` items and return the type order.
 *
 * Correctness alternates so the area reverses: the recency discount deliberately does not apply
 * while an area is still homing from its grade-band seed, so a run of identical answers would not
 * exercise it.
 */
function typeOrder(seed: number, count: number, overrides = {}): TypeCode[] {
  let state: SessionState = startState('4-5', { ...DEFAULT_CONFIG, seed, ...overrides });
  const order: TypeCode[] = [];

  for (let i = 0; i < count; i++) {
    const type = nextType(state, banks);
    if (type === null) break;
    const item = nextItem(state, type, banks);
    order.push(type);

    const areaState = state.areas[item.domain];
    areaState.itemsSeen.add(item.itemId);
    areaState.trace.push({
      itemId: item.itemId,
      typeCode: type,
      difficulty: item.difficulty,
      score: 1,
      correct: i % 3 !== 0,
      rtMs: null,
      angularDisparityDeg: null,
      stage: 'standing',
    });
    state = { ...state, itemsServed: state.itemsServed + 1 };
  }

  return order;
}

/** Distinct types appearing across `sessions` differently-seeded runs. */
function typeVariety(sessions: number, overrides = {}): number {
  const seen = new Set<TypeCode>();
  for (let seed = 1; seed <= sessions; seed++) {
    for (const type of typeOrder(seed, 20, overrides)) seen.add(type);
  }
  return seen.size;
}

describe('question order varies between sessions', () => {
  it('two sessions with different seeds do not receive the same type order', () => {
    const a = typeOrder(1, 24);
    const b = typeOrder(2, 24);

    expect(a.length).toBeGreaterThan(12);
    expect(a).not.toEqual(b);
  });

  it('a single seed still replays identically, so a session stays auditable', () => {
    expect(typeOrder(7, 24)).toEqual(typeOrder(7, 24));
  });

  it('a session draws on more than a handful of distinct types', () => {
    const distinct = new Set(typeOrder(3, 24));
    expect(distinct.size).toBeGreaterThan(4);
  });

  it('across many sessions the first item is not always the same type', () => {
    const firsts = new Set<TypeCode>();
    for (let seed = 1; seed <= 30; seed++) {
      const [first] = typeOrder(seed, 1);
      if (first) firsts.add(first);
    }
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('the tolerance and recency knobs are what widen the pool, not the seed alone', () => {
    // A per-session seed alone varies the ORDER but barely widens which types are ever reached,
    // because the strict argmax keeps picking the same coverage leader in each area.
    const seedOnly = typeVariety(20, { typeSelectionTolerance: 0, typeRecencyPenalty: 0 });
    const withKnobs = typeVariety(20);

    expect(withKnobs).toBeGreaterThan(seedOnly * 2);
  });

  it('a child does not meet the same type over and over inside one session', () => {
    const order = typeOrder(5, 20);
    const counts = new Map<TypeCode, number>();
    for (const type of order) counts.set(type, (counts.get(type) ?? 0) + 1);

    // The old fixed rotation served the same 4 types, hitting 5 repeats of each in 20 items.
    expect(Math.max(...counts.values())).toBeLessThan(5);
  });
});

describe('the age-band preference survives the item tolerance', () => {
  it('the item tolerance stays below ageBandBias, or the band stops deciding ties', () => {
    // A non-matching item is charged exactly `ageBandBias`. If the tolerance reached that, a
    // band-matching item and a non-matching one at the same difficulty become interchangeable.
    expect(DEFAULT_CONFIG.itemSelectionTolerance).toBeLessThan(DEFAULT_CONFIG.ageBandBias);
  });
});

describe('variety does not cost targeting accuracy', () => {
  it('every served item stays inside the configured difficulty window of the estimate', () => {
    let state: SessionState = startState('4-5', { ...DEFAULT_CONFIG, seed: 42 });

    for (let i = 0; i < 24; i++) {
      const type = nextType(state, banks);
      if (type === null) break;
      const item = nextItem(state, type, banks);
      const target = state.areas[item.domain].difficulty;

      expect(Math.abs(item.difficulty - target)).toBeLessThanOrEqual(
        state.config.difficultyWindow + state.config.itemSelectionTolerance,
      );

      state.areas[item.domain].itemsSeen.add(item.itemId);
      state = { ...state, itemsServed: state.itemsServed + 1 };
    }
  });
});
