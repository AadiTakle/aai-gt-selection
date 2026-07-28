import { describe, expect, it } from 'vitest';

import {
  deriveAggregateMetrics,
  deriveConsistency,
  deriveLearningRate,
  deriveRotationSlope,
  deriveRtVariability,
} from './derived-metrics';
import { BASIC_CORE_METRICS } from './metric-registry';
import { scoreExam } from './scorer';
import { SCALE_MAX, SCALE_MIN, type ScoredItem } from './types';

function item(partial: Partial<ScoredItem> & { itemId: string }): ScoredItem {
  return {
    typeCode: 'SPA-VIEW-01',
    domain: 'spatial',
    metrics: {},
    correct: true,
    score: 1,
    difficulty: 11,
    ...partial,
  };
}

describe('deriveRtVariability', () => {
  it('needs a real RT series, not a per-item emission of the variance', () => {
    const emitted = [item({ itemId: 'a', metrics: { 'M-RTVAR': 0.3 } })];
    expect(deriveRtVariability(emitted)).toBeNull();
  });

  it('is the coefficient of variation over correct trials', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      item({ itemId: `r${i}`, metrics: { 'M-RT': 1000 } }),
    );
    expect(deriveRtVariability(items)).toBe(0); // identical RTs → no variability

    const varied = Array.from({ length: 20 }, (_, i) =>
      item({ itemId: `v${i}`, metrics: { 'M-RT': i % 2 === 0 ? 800 : 1200 } }),
    );
    // mean 1000, population SD 200 → CV 0.2
    expect(deriveRtVariability(varied)).toBeCloseTo(0.2, 10);
  });

  it('ignores incorrect trials', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      item({ itemId: `m${i}`, correct: i < 19, metrics: { 'M-RT': i === 19 ? 99999 : 1000 } }),
    );
    expect(deriveRtVariability(items)).toBeNull(); // only 19 correct trials
  });
});

describe('deriveConsistency', () => {
  it('returns null below three matched pairs', () => {
    expect(deriveConsistency([item({ itemId: 'a' }), item({ itemId: 'b' })])).toBeNull();
  });

  it('is the agreement rate across difficulty-matched pairs', () => {
    // Three pairs at 10.0/10.4, 12.0/12.4, 14.0/14.4; the last pair disagrees.
    const items = [
      item({ itemId: 'a', difficulty: 10.0, correct: true }),
      item({ itemId: 'b', difficulty: 10.4, correct: true }),
      item({ itemId: 'c', difficulty: 12.0, correct: false }),
      item({ itemId: 'd', difficulty: 12.4, correct: false }),
      item({ itemId: 'e', difficulty: 14.0, correct: true }),
      item({ itemId: 'f', difficulty: 14.4, correct: false }),
    ];
    expect(deriveConsistency(items)).toBeCloseTo(2 / 3, 10);
  });
});

describe('deriveLearningRate', () => {
  it('reports 0.5 when the ceiling does not move', () => {
    const items = Array.from({ length: 10 }, (_, i) => item({ itemId: `f${i}`, difficulty: 10 }));
    expect(deriveLearningRate(items, SCALE_MIN, SCALE_MAX)).toBeCloseTo(0.5, 10);
  });

  it('rises above 0.5 when the ceiling climbs across the session', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      item({ itemId: `g${i}`, difficulty: 8 + i }),
    );
    const rate = deriveLearningRate(items, SCALE_MIN, SCALE_MAX) as number;
    expect(rate).toBeGreaterThan(0.5);
    expect(rate).toBeLessThanOrEqual(1);
  });
});

describe('deriveRotationSlope', () => {
  const disparities = [0, 45, 90, 135, 180];

  it('recovers a planted ms-per-degree slope', () => {
    const items = Array.from({ length: 15 }, (_, i) => {
      const deg = disparities[i % disparities.length] as number;
      return item({
        itemId: `rot${i}`,
        metrics: { 'M-RT': 900 + 4.2 * deg },
        stimulus: { angularDisparityDeg: deg },
      });
    });
    expect(deriveRotationSlope(items)).toBeCloseTo(4.2, 6);
  });

  it('refuses to fit without enough trials or enough distinct angles', () => {
    const tooFew = Array.from({ length: 8 }, (_, i) =>
      item({
        itemId: `few${i}`,
        metrics: { 'M-RT': 1000 },
        stimulus: { angularDisparityDeg: disparities[i % disparities.length] as number },
      }),
    );
    expect(deriveRotationSlope(tooFew)).toBeNull();

    const tooFlat = Array.from({ length: 15 }, (_, i) =>
      item({ itemId: `flat${i}`, metrics: { 'M-RT': 1000 }, stimulus: { angularDisparityDeg: 90 } }),
    );
    expect(deriveRotationSlope(tooFlat)).toBeNull();
  });

  it('returns null when the server attached no angular disparity', () => {
    const items = Array.from({ length: 15 }, (_, i) =>
      item({ itemId: `nd${i}`, metrics: { 'M-RT': 1000 + i } }),
    );
    expect(deriveRotationSlope(items)).toBeNull();
  });
});

describe('deriveAggregateMetrics', () => {
  it('omits every aggregate the trace cannot support', () => {
    expect([...deriveAggregateMetrics([item({ itemId: 'only' })], SCALE_MIN, SCALE_MAX).keys()]).toEqual(
      [],
    );
  });

  it('reports exactly the aggregates the trace does support', () => {
    const items = Array.from({ length: 24 }, (_, i) =>
      item({
        itemId: `agg${i}`,
        difficulty: i < 12 ? 8 : 12,
        metrics: { 'M-RT': i % 2 === 0 ? 950 : 1050 },
      }),
    );
    const derived = deriveAggregateMetrics(items, SCALE_MIN, SCALE_MAX);
    // No angular disparity in the trace, so no rotation slope.
    expect([...derived.keys()].sort()).toEqual(['M-CONSIST', 'M-LEARNRATE', 'M-RTVAR']);
  });
});

describe('scorer integration', () => {
  it('produces a profile from a trace that emits no aggregate metric at all', () => {
    // Exactly the real-bank situation: renderers emit only per-item metrics.
    const items: ScoredItem[] = Array.from({ length: 30 }, (_, i) =>
      item({
        itemId: `s${i}`,
        difficulty: 9 + (i % 6) * 0.4,
        correct: i % 3 !== 0,
        score: i % 3 !== 0 ? 1 : 0,
        metrics: { 'M-ACC': i % 3 !== 0 ? 1 : 0, 'M-RT': 1000 + (i % 5) * 120 },
      }),
    );

    const score = scoreExam(items);
    // Without trace-derived aggregates both of these would be `unknown`/null forever.
    expect(score.profile.consistency.raw).not.toBeNull();
    expect(score.profile.consistency.label).not.toBe('unknown');

    const area = score.perArea.spatial;
    const ids = area?.contributions.map((c) => c.metricId) ?? [];
    expect(ids).toContain('M-RTVAR');
    expect(ids).toContain('M-CONSIST');
    expect(ids).toContain('M-LEARNRATE');
  });

  it('ignores a fabricated per-item emission of a derived metric', () => {
    const base = Array.from({ length: 24 }, (_, i) =>
      item({
        itemId: `b${i}`,
        difficulty: 9 + (i % 6) * 0.4,
        correct: i % 3 !== 0,
        score: i % 3 !== 0 ? 1 : 0,
        metrics: { 'M-ACC': i % 3 !== 0 ? 1 : 0, 'M-RT': 1000 + (i % 5) * 120 },
      }),
    );
    const spiked = base.map((it) => ({ ...it, metrics: { ...it.metrics, 'M-CONSIST': 1 } }));

    expect(scoreExam(spiked).composite).toBe(scoreExam(base).composite);
  });
});

describe('registry annotation', () => {
  it('marks every trace-derived metric as such', () => {
    const derived = BASIC_CORE_METRICS.filter((m) => m.derivedFromTrace).map((m) => m.id);
    expect(derived.sort()).toEqual([
      'M-CONSIST',
      'M-DIFFREACH',
      'M-LEARNRATE',
      'M-ROTSLOPE',
      'M-RTVAR',
    ]);
  });
});
