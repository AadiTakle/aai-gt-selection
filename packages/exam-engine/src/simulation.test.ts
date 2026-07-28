import { describe, expect, it } from 'vitest';

import {
  enforcedMetricsForArea,
  enforcedSessionMetrics,
  metricAdequateInArea,
  metricSamplesInSession,
} from './coverage';
import { runSyntheticSession, type TrueTheta } from './testing/synthetic-bank';
import { AREAS, type Area } from './types';

/** Distinct true abilities per area, spanning the scale and both sides of the '4-5' start (11). */
const TRUE_THETA: TrueTheta = {
  fluid_reasoning: 14, // start below -> must climb
  verbal: 8, // start above -> must fall
  quantitative: 11, // start at ability -> should hold
  spatial: 5, // start well above -> must fall a lot
};

describe('adaptive session simulation', () => {
  it('converges each area difficulty toward the simulated ability and stops via the stop rule', () => {
    // Lift the hard cap so completion is driven by adequate coverage/stability, not the safety cap.
    const { state, done, trace } = runSyntheticSession('4-5', TRUE_THETA, { hardItemCap: 200 });

    expect(done).toBe(true);
    expect(state.itemsServed).toBeLessThan(200); // finished on the stop rule, not the cap
    expect(trace.length).toBe(state.itemsServed);

    for (const area of AREAS) {
      const estimate = state.areas[area].difficulty;
      expect(Math.abs(estimate - TRUE_THETA[area])).toBeLessThanOrEqual(2.5);
    }

    // The recovered ordering matches the true-ability ordering (fluid > quant > verbal > spatial).
    const est = (a: Area) => state.areas[a].difficulty;
    expect(est('fluid_reasoning')).toBeGreaterThan(est('quantitative'));
    expect(est('quantitative')).toBeGreaterThan(est('verbal'));
    expect(est('verbal')).toBeGreaterThan(est('spatial'));
  });

  it('meets even coverage and per-area core-metric minimums at completion', () => {
    const { state } = runSyntheticSession('4-5', TRUE_THETA, { hardItemCap: 200 });

    const counts = AREAS.map((a) => state.areas[a].itemsSeen.size);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(state.config.minItemsPerArea);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(
      state.config.evenSpreadTolerance,
    );

    // Every enforced per-area core metric has adequate data (emissions for an observed metric,
    // derivation inputs for a derived one).
    for (const area of AREAS) {
      for (const metric of enforcedMetricsForArea(area, state.config)) {
        expect(
          metricAdequateInArea(metric, state.areas[area], state.config),
          `${area} lacks adequate data for ${metric.id}`,
        ).toBe(true);
      }
    }

    // Every enforced per-child metric met its session-wide minimum.
    for (const metric of enforcedSessionMetrics(state.config)) {
      expect(metricSamplesInSession(metric, state), metric.id).toBeGreaterThanOrEqual(
        metric.minSamples,
      );
    }
  });

  it('is fully deterministic across identical runs', () => {
    const a = runSyntheticSession('4-5', TRUE_THETA, { hardItemCap: 200 });
    const b = runSyntheticSession('4-5', TRUE_THETA, { hardItemCap: 200 });

    expect(a.state.itemsServed).toBe(b.state.itemsServed);
    expect(a.trace.map((s) => s.itemId)).toEqual(b.trace.map((s) => s.itemId));
    for (const area of AREAS) {
      expect(a.state.areas[area].difficulty).toBe(b.state.areas[area].difficulty);
      expect(a.state.areas[area].itemsSeen.size).toBe(b.state.areas[area].itemsSeen.size);
    }
  });

  it('always terminates via the hard safety cap', () => {
    // The cap (20) is below the minimum items the coverage rule could ever satisfy
    // (minItemsPerArea 6 × 4 areas = 24), so the session can only end on the safety cap.
    const atAbility: TrueTheta = { fluid_reasoning: 11, verbal: 11, quantitative: 11, spatial: 11 };
    const { state, done } = runSyntheticSession('4-5', atAbility, { hardItemCap: 20 });
    expect(done).toBe(true);
    expect(state.itemsServed).toBe(20);
  });
});
