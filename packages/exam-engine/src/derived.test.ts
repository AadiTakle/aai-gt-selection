import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from './config';
import { metricAdequateInArea, metricKind, sessionMetricsCovered } from './coverage';
import {
  DERIVED_METRIC_IDS,
  distinctDisparities,
  matchedPairCount,
  responseTimes,
  rotationTrials,
} from './derived';
import { startState } from './state';
import { update } from './update';
import type { CoreMetricSpec, ItemObservation, ScoredItem } from './types';

function observation(partial: Partial<ItemObservation> & { itemId: string }): ItemObservation {
  return {
    typeCode: 'T',
    difficulty: 10,
    score: 1,
    correct: true,
    rtMs: null,
    angularDisparityDeg: null,
    ...partial,
  };
}

function scored(partial: Partial<ScoredItem> & { itemId: string }): ScoredItem {
  return {
    typeCode: 'T',
    domain: 'fluid_reasoning',
    response: {},
    metrics: {},
    telemetry: [],
    correct: true,
    score: 1,
    difficulty: 11,
    ...partial,
  };
}

describe('derived-metric inputs', () => {
  it('counts only items that reported a response time', () => {
    const trace = [
      observation({ itemId: 'a', rtMs: 1200 }),
      observation({ itemId: 'b' }),
      observation({ itemId: 'c', rtMs: 900 }),
    ];
    expect(responseTimes(trace)).toEqual([1200, 900]);
  });

  it('pairs difficulty-matched items greedily and uses each item at most once', () => {
    const trace = [
      observation({ itemId: 'a', difficulty: 10.0 }),
      observation({ itemId: 'b', difficulty: 10.5 }),
      observation({ itemId: 'c', difficulty: 10.8 }),
      observation({ itemId: 'd', difficulty: 16.0 }),
    ];
    // a+b pair (0.5 apart); c is left over and 16.0 is 5.2 away, so no second pair.
    expect(matchedPairCount(trace, 1.0)).toBe(1);

    const converged = [10.0, 10.2, 10.4, 10.6, 10.8, 11.0].map((difficulty, i) =>
      observation({ itemId: `i${i}`, difficulty }),
    );
    expect(matchedPairCount(converged, 1.0)).toBe(3);
  });

  it('counts a rotation trial only when it is correct and carries both an RT and a disparity', () => {
    const trace = [
      observation({ itemId: 'a', rtMs: 1000, angularDisparityDeg: 0 }),
      observation({ itemId: 'b', rtMs: 1400, angularDisparityDeg: 90 }),
      observation({ itemId: 'c', rtMs: 1800, angularDisparityDeg: 180, correct: false }),
      observation({ itemId: 'd', angularDisparityDeg: 45 }), // no RT
      observation({ itemId: 'e', rtMs: 1100 }), // no disparity
    ];
    expect(rotationTrials(trace).map((o) => o.itemId)).toEqual(['a', 'b']);
    expect(distinctDisparities(trace)).toBe(2);
  });
});

describe('derived metrics are never satisfied by a per-item emission', () => {
  const config = DEFAULT_CONFIG;

  it('classifies the session-level aggregates as derived', () => {
    for (const id of ['M-RTVAR', 'M-CONSIST', 'M-LEARNRATE', 'M-ROTSLOPE', 'M-DIFFREACH']) {
      const spec = config.coreMetrics.find((m) => m.id === id) as CoreMetricSpec;
      expect(metricKind(spec), id).toBe('derived');
      expect(DERIVED_METRIC_IDS.has(id)).toBe(true);
    }
  });

  it('ignores a stray emission of a derived metric when counting coverage', () => {
    // A renderer cannot compute an RT variance from one item. If it emitted one anyway, letting
    // that count would allow a single item to stand in for a whole series.
    let state = startState('4-5');
    for (let i = 0; i < 10; i++) {
      state = update(
        state,
        scored({
          itemId: `x${i}`,
          metrics: { 'M-ACC': 1, 'M-RTVAR': 0.3, 'M-CONSIST': 1, 'M-LEARNRATE': 1 },
        }),
      );
    }

    const area = state.areas.fluid_reasoning;
    expect(area.metricCounts['M-RTVAR']).toBeUndefined();
    expect(area.metricCounts['M-CONSIST']).toBeUndefined();
    expect(area.metricCounts['M-ACC']).toBe(10);

    // No item reported M-RT, so the session has no response times and M-RTVAR stays inadequate
    // despite ten emissions of it.
    expect(sessionMetricsCovered(state)).toBe(false);
  });

  it('satisfies M-RTVAR from the response-time series instead', () => {
    const spec = DEFAULT_CONFIG.coreMetrics.find((m) => m.id === 'M-RTVAR') as CoreMetricSpec;
    let state = startState('4-5');
    for (let i = 0; i < spec.minSamples; i++) {
      state = update(state, scored({ itemId: `r${i}`, metrics: { 'M-RT': 1000 + i * 25 } }));
    }
    expect(responseTimes(state.areas.fluid_reasoning.trace).length).toBe(spec.minSamples);
    expect(metricAdequateInArea(spec, state.areas.fluid_reasoning, state.config)).toBe(true);
  });
});
