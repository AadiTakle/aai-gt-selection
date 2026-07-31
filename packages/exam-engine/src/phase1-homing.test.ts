import { describe, expect, it } from 'vitest';

import { areaEstimateStable, directionReversals, toObservation } from './index';
import { runRealBankSession, type TrueTheta } from './testing/real-bank';
import { AREAS, type Area, type ScoredItem } from './types';

/**
 * Phase 1 guard — "find the child's standing level in each reasoning area."
 *
 * These lock in the three behaviours the product card requires, and that the 28 Jul consolidation
 * note warns are easy to lose when the working backend becomes the base:
 *
 *   1. TWO-SIDED homing-in — the estimate is bracketed from both sides (correct→up, wrong→down),
 *      so every area's trace contains direction reversals. A pure ramp (the database's fixed 1..20
 *      stepping) would produce a monotonic run with ZERO reversals until it fails; that is exactly
 *      the regression this asserts against.
 *   2. STOP-WHEN-CONFIDENT — each area ends with a settled estimate (`areaEstimateStable`) and the
 *      session finishes on the stop rule, NOT on the hard safety cap.
 *   3. A per-area STANDING LEVEL is produced, and it recovers the simulated ability.
 *
 * Run against the REAL banks so the guarantee is about the content actually shipped, not a
 * synthetic stand-in. Born-synthetic responder (`validated=false`): this proves routing behaviour,
 * not psychometric validity.
 */

// A different true level per area from a single '4-5' start (seeded at 11): forces a long climb,
// a fall, a hold, and a long fall — every homing-in shape in one run.
const TRUE_THETA: TrueTheta = {
  fluid_reasoning: 18,
  verbal: 8,
  quantitative: 11,
  spatial: 4,
};

// Same shape the live portal runs (the web app's EXAM_ENGINE_OVERRIDES in its exam
// adaptive config): variable length, stop when each area settles, bounded by a safety cap.
const CONFIG = {
  minItemsPerArea: 4,
  evenSpreadTolerance: 1,
  stabilityWindow: 4,
  stabilitySd: 1.5,
  stabilityDrift: 1.0,
  difficultyWindow: 4,
  accWindowSize: 8,
  estWindowSize: 8,
  hardItemCap: 40,
  /*
   * `respondFromRealBank` passes exactly the items at or below the planted ability and no others,
   * which is a child whose chance-success floor is zero. The engine is told so, because the
   * bracketing this file asserts is a property of aiming at where the response is genuinely
   * uncertain: told to expect guessing that cannot happen, selection correctly aims BELOW such a
   * child, they pass everything, and the trace never reverses — the shipped floor would make this
   * file fail for a reason that has nothing to do with whether the search brackets.
   */
  guessingFloor: 0,
};

function areaTrace(trace: readonly ScoredItem[], area: Area): ScoredItem[] {
  return trace.filter((s) => s.domain === area);
}

describe('Phase 1: two-sided homing-in to a per-area standing level', () => {
  const { state, trace, done } = runRealBankSession('4-5', TRUE_THETA, CONFIG);

  it('finishes on the stop rule, not the hard safety cap', () => {
    expect(done).toBe(true);
    expect(state.itemsServed).toBeLessThan(CONFIG.hardItemCap);
  });

  it('brackets from both sides in every area (the trace reverses direction, not a one-way ramp)', () => {
    for (const area of AREAS) {
      const observations = areaTrace(trace, area).map(toObservation);
      const reversals = directionReversals(observations);
      // At least one reversal means the estimate crossed the child's level and closed in from the
      // other side — the defining feature of bracketing vs ramping.
      expect(
        reversals,
        `${area} never reversed direction — it ramped instead of bracketing`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it('stops each area on a settled (confident) estimate', () => {
    for (const area of AREAS) {
      expect(areaEstimateStable(area, state), `${area} estimate had not settled at stop`).toBe(
        true,
      );
    }
  });

  it('produces a per-area standing level that recovers the simulated ability (±2.5)', () => {
    for (const area of AREAS) {
      const level = state.areas[area].difficulty;
      expect(level, `${area} produced no standing level`).toBeGreaterThan(0);
      expect(
        Math.abs(level - TRUE_THETA[area]),
        `${area} standing level ${level.toFixed(2)} is off from true ${TRUE_THETA[area]}`,
      ).toBeLessThanOrEqual(2.5);
    }
  });

  it('recovers the true across-area ORDERING (fluid > quant > verbal > spatial)', () => {
    const est = (a: Area) => state.areas[a].difficulty;
    expect(est('fluid_reasoning')).toBeGreaterThan(est('quantitative'));
    expect(est('quantitative')).toBeGreaterThan(est('verbal'));
    expect(est('verbal')).toBeGreaterThan(est('spatial'));
  });
});
