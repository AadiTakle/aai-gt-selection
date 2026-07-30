import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, ENFORCED_METRIC_WEIGHT } from './config';
import { nextItem, nextType } from './selection';
import { startState } from './state';
import { loadRealBanks } from './testing/real-bank';
import type { Banks, CoreMetricSpec, SessionState, TypeCode } from './types';

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
 * An enforced-metric registry with the SAME profile in every area, which is the shape the app
 * configures: `/api/exam-submit` attaches `M-ACC` and `M-ERRTYPE` to every scored item regardless
 * of type, so both are enforced with scope `all`. Under it no area is neediest at item 0 and the
 * area choice reaches its seeded tie-break.
 */
const FLAT_ENFORCED_METRICS: CoreMetricSpec[] = [
  { id: 'M-ACC', scope: 'all', minSamples: 4, enforced: true, kind: 'observed' },
  { id: 'M-ERRTYPE', scope: 'all', minSamples: 3, enforced: true, kind: 'observed' },
  { id: 'M-DIFFREACH', scope: 'all', minSamples: 3, enforced: false, kind: 'observed' },
  { id: 'M-EXPLORE', scope: 'all', minSamples: 3, enforced: false, kind: 'observed' },
  { id: 'M-PATH', scope: 'all', minSamples: 3, enforced: false, kind: 'observed' },
];

/**
 * Serve `count` items and return the type order.
 *
 * Correctness alternates so the area reverses: the recency discount deliberately does not apply
 * while an area is still homing from its grade-band seed, so a run of identical answers would not
 * exercise it.
 */
function typeOrder(
  seed: number,
  count: number,
  overrides = {},
  correctAt: (index: number) => boolean = (i) => i % 3 !== 0,
): TypeCode[] {
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
      correct: correctAt(i),
      rtMs: null,
      angularDisparityDeg: null,
      stage: 'standing',
    });
    state = { ...state, itemsServed: state.itemsServed + 1 };
  }

  return order;
}

/** The most items of any single type in a served order. */
function maxRepeat(order: readonly TypeCode[]): number {
  const counts = new Map<TypeCode, number>();
  for (const type of order) counts.set(type, (counts.get(type) ?? 0) + 1);
  return counts.size === 0 ? 0 : Math.max(...counts.values());
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
    // Where every area starts with the same enforced-metric shortfall — which is the shape the app
    // configures, since the metrics the server attaches to every item are enforced for all four
    // areas — `pickArea` falls through to its seeded tie-break and the first type varies widely.
    const firsts = new Set<TypeCode>();
    for (let seed = 1; seed <= 30; seed++) {
      const [first] = typeOrder(seed, 1, { coreMetrics: FLAT_ENFORCED_METRICS });
      if (first) firsts.add(first);
    }
    expect(firsts.size).toBeGreaterThan(4);
  });

  it('under the ENGINE defaults the first type is pinned by the area profile, not by the seed', () => {
    /*
     * Stated rather than fixed, because it is a fact about the default metric registry and not
     * something selection should paper over. `CORE_METRICS` gives the four areas different enforced
     * shortfall counts, so `pickArea` finds a strict winner on its FIRST tie-break at item 0 and the
     * seeded jitter is never consulted; the winning area's coverage leader is then the same type for
     * every child.
     *
     * A `typeSelectionTolerance` of 1.0 did hide this, by admitting a rival exactly one selection
     * point behind — which is exactly the margin between closing an enforced shortfall and closing
     * none while holding the full capped tracked gain, i.e. the margin D-201's cap exists to keep
     * decisive. Buying first-item variety with it was buying it out of the coverage signal, so the
     * tolerance came down (D-203) and this is asserted as the limitation it is. The fix, when the
     * default registry is next revisited, belongs in `pickArea`.
     */
    const firsts = new Set<TypeCode>();
    for (let seed = 1; seed <= 30; seed++) {
      const [first] = typeOrder(seed, 1);
      if (first) firsts.add(first);
    }
    expect(firsts.size).toBe(1);
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

describe('coverage still decides the type, despite the type tolerance', () => {
  /*
   * The companion constraint to the one above, and the reason the tolerance moved from 1.0 to 0.5
   * when the coverage cap (D-201) landed beside it. Capping the tracked-inert total compressed the
   * score spread inside an area, so a tolerance calibrated against the uncapped sum became
   * proportionally far wider against the capped one. See D-203.
   */

  it('the type tolerance stays below trackedCoverageCap, or a tracked shortfall stops deciding', () => {
    // A type closing a tracked-inert gap can earn at most `trackedCoverageCap` over one that closes
    // none. If the tolerance reached that, the two would be interchangeable and the tilt the cap was
    // deliberately left in place to preserve would be gone.
    expect(DEFAULT_CONFIG.typeSelectionTolerance).toBeLessThan(DEFAULT_CONFIG.trackedCoverageCap);
  });

  it('an enforced shortfall still outranks the tolerance, so the stop rule keeps priority', () => {
    // An enforced gap is worth ENFORCED_METRIC_WEIGHT. The worst case is a rival that closes no
    // enforced gap but does hold the full capped tracked gain: it sits exactly
    // `ENFORCED_METRIC_WEIGHT - trackedCoverageCap` behind. The tolerance must not reach that, or
    // the type that unblocks the session is interchangeable with one that does not.
    const worstCaseGap = ENFORCED_METRIC_WEIGHT - DEFAULT_CONFIG.trackedCoverageCap;
    expect(DEFAULT_CONFIG.typeSelectionTolerance).toBeLessThan(worstCaseGap);
  });
});

describe('the recency discount waits for the area to bracket', () => {
  /*
   * Before the first reversal a child is walking monotonically from their grade-band seed toward
   * their real level, and an item spent on variety instead of targeting lengthens that walk. That
   * cost is what broke D-023's convergence budget when the discount was applied throughout, so the
   * discount waits for the area's estimate to straddle.
   *
   * Asserted DIRECTLY on the type order rather than through the battery-length budget, because the
   * budget stopped being a live pin for it once the coverage cap (D-201) landed: with the cap in
   * place the worst battery is 47 items against a budget of 48 whether the homing guard is present
   * or not, so the budget test passes either way and would no longer catch a removal. Whether the
   * discount is applied while homing is a property of selection, so it is pinned on selection.
   */

  const alwaysCorrect = () => true;
  // Every third item wrong. The period is coprime with the four-area rotation, so correctness
  // varies WITHIN each area and every area reverses — which `i % 2` would not do, since it would
  // hand each area a single constant answer.
  const alternating = (i: number) => i % 3 !== 0;

  it('does not discount a repeated type while the area is still homing', () => {
    // Every answer correct, so no area ever reverses and the discount must stay switched off. With
    // it off, the coverage leader in each area keeps winning and types repeat.
    const homing = typeOrder(11, 20, {}, alwaysCorrect);
    const bracketed = typeOrder(11, 20, {}, alternating);

    expect(maxRepeat(homing)).toBeGreaterThan(maxRepeat(bracketed));
  });

  it('is the homing guard, not the answers, that makes the difference', () => {
    // The same all-correct run with the discount disabled outright. If the guard is working, the
    // two are identical: during homing a discount of 1.0 and a discount of 0 are the same rule.
    const guarded = typeOrder(11, 20, {}, alwaysCorrect);
    const noDiscount = typeOrder(11, 20, { typeRecencyPenalty: 0 }, alwaysCorrect);

    expect(guarded).toEqual(noDiscount);
  });

  it('applies once the area has reversed, so the discount is not simply dead', () => {
    const bracketed = typeOrder(11, 20, {}, alternating);
    const noDiscount = typeOrder(11, 20, { typeRecencyPenalty: 0 }, alternating);

    expect(bracketed).not.toEqual(noDiscount);
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
