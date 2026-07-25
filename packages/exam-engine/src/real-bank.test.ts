/**
 * Stop-rule tests against the REAL type registry and item banks.
 *
 * `simulation.test.ts` runs against a bank the harness controls. This file drives the same rule
 * against what `research/exam-question-types/` actually declares and contains, which is the only
 * way to catch a stop rule that no real bank can satisfy (BUILD_PLAN §0/§3: "battery length is
 * variable — keep asking until there is adequate data"; the hard item cap is a safety net, not
 * the normal exit).
 *
 * Before the derived-metric split these tests failed: enforced metrics that zero wired types can
 * emit (`M-ROTSLOPE`) or that no single item can carry (`M-RTVAR`, `M-CONSIST`, `M-LEARNRATE`)
 * left `areaMetricsCovered` permanently false, so every session ran to `hardItemCap`.
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from './config';
import {
  auditMetricSupply,
  enforcedMetricsForArea,
  enforcedSessionMetrics,
  metricAdequateInArea,
  metricSamplesInSession,
} from './coverage';
import { coverageIsEven } from './done';
import { replaySession } from './replay';
import {
  loadRealBanks,
  runRealBankSession,
  type RealSessionResult,
  type TrueTheta,
} from './testing/real-bank';
import { AREAS, type AgeBand, type Area, type ScoredItem } from './types';

const real = loadRealBanks();

/** A child whose abilities sit near their grade-band seed — the case the cap is sized for. */
const BAND_MATCHED: TrueTheta = {
  fluid_reasoning: 12,
  verbal: 10,
  quantitative: 11,
  spatial: 9,
};

/** Deliberately far from the '4-5' seed of 11, to stress convergence. */
const WIDE_SPREAD: TrueTheta = {
  fluid_reasoning: 14,
  verbal: 8,
  quantitative: 11,
  spatial: 5,
};

/**
 * First item count at which every enforced core metric has adequate data, ignoring the separate
 * estimate-stability arm of the stop rule. Recomputed by replaying the stored trace, which also
 * exercises the §5 requirement that adequacy is reproducible from the trace alone.
 */
function metricCoverageCompleteAt(
  gradeBand: AgeBand,
  trace: readonly ScoredItem[],
): number | null {
  for (let n = 1; n <= trace.length; n++) {
    const state = replaySession(gradeBand, trace.slice(0, n), { hardItemCap: 400 });
    if (!coverageIsEven(state)) continue;
    const sessionOk = enforcedSessionMetrics(state.config).every(
      (m) => metricSamplesInSession(m, state) >= m.minSamples,
    );
    const areaOk = AREAS.every((area) =>
      enforcedMetricsForArea(area, state.config).every((m) =>
        metricAdequateInArea(m, state.areas[area], state.config),
      ),
    );
    if (sessionOk && areaOk) return n;
  }
  return null;
}

describe('real registry and banks', () => {
  it('wires enough types per area to run a meaningful session', () => {
    for (const area of AREAS) {
      const types = real.banks.types.filter((t) => t.domain === area);
      expect(
        types.length,
        `${area} has too few wired types to exercise the stop rule`,
      ).toBeGreaterThanOrEqual(3);
    }
    expect(real.banks.items.length).toBeGreaterThan(500);
  });
});

describe('core-metric coverage against the real banks', () => {
  it('every enforced core metric reaches adequate data, well before the safety cap', () => {
    const { trace } = runRealBankSession('4-5', BAND_MATCHED, { hardItemCap: 400 }, real);
    const completeAt = metricCoverageCompleteAt('4-5', trace);

    expect(
      completeAt,
      'no prefix of the session satisfied core-metric coverage: the stop rule is unsatisfiable ' +
        'against the real banks, so the battery is fixed-length at the hard cap',
    ).not.toBeNull();
    expect(completeAt as number).toBeLessThan(DEFAULT_CONFIG.hardItemCap);
  });

  it('reaches coverage for every ability profile, not just a lucky one', () => {
    const profiles: { band: AgeBand; theta: TrueTheta }[] = [
      { band: '4-5', theta: BAND_MATCHED },
      { band: '4-5', theta: WIDE_SPREAD },
      { band: '4-5', theta: { fluid_reasoning: 18, verbal: 16, quantitative: 17, spatial: 15 } },
      { band: '2-3', theta: { fluid_reasoning: 7, verbal: 7, quantitative: 7, spatial: 7 } },
      { band: '6-8', theta: { fluid_reasoning: 19, verbal: 18, quantitative: 19, spatial: 17 } },
    ];

    for (const { band, theta } of profiles) {
      const { trace } = runRealBankSession(band, theta, { hardItemCap: 400 }, real);
      const completeAt = metricCoverageCompleteAt(band, trace);
      expect(completeAt, `${band} ${JSON.stringify(theta)}`).not.toBeNull();
      expect(completeAt as number).toBeLessThan(DEFAULT_CONFIG.hardItemCap);
    }
  });
});

describe('stop rule against the real banks', () => {
  // Deterministic and pure, so one shared run is safe to assert against from several tests.
  const session: RealSessionResult = runRealBankSession('4-5', BAND_MATCHED, undefined, real);

  it('concludes a band-matched session on the stop rule, not the safety cap', () => {
    expect(session.exhausted, 'ran out of servable items instead of concluding').toBe(false);
    expect(session.done).toBe(true);
    expect(
      session.state.itemsServed,
      'the battery reached the hard cap, so it is fixed-length rather than variable',
    ).toBeLessThan(DEFAULT_CONFIG.hardItemCap);
  });

  it('still produces a real battery: per-area minimum met and spread even', () => {
    const counts = AREAS.map((a) => session.state.areas[a].itemsSeen.size);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minItemsPerArea);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(
      DEFAULT_CONFIG.evenSpreadTolerance,
    );
  });

  it('varies its length with the child, rather than being a fixed number of questions', () => {
    const near = runRealBankSession('4-5', BAND_MATCHED, { hardItemCap: 400 }, real);
    const far = runRealBankSession('4-5', WIDE_SPREAD, { hardItemCap: 400 }, real);
    expect(far.state.itemsServed).toBeGreaterThan(near.state.itemsServed);
  });

  it('recovers the true ability ordering from real items', () => {
    const { state } = runRealBankSession('4-5', WIDE_SPREAD, { hardItemCap: 400 }, real);
    const est = (a: Area) => state.areas[a].difficulty;
    expect(est('fluid_reasoning')).toBeGreaterThan(est('quantitative'));
    expect(est('quantitative')).toBeGreaterThan(est('verbal'));
    expect(est('verbal')).toBeGreaterThan(est('spatial'));
  });

  it('is deterministic across identical runs', () => {
    const a = runRealBankSession('4-5', BAND_MATCHED, undefined, real);
    const b = runRealBankSession('4-5', BAND_MATCHED, undefined, real);
    expect(a.state.itemsServed).toBe(b.state.itemsServed);
    expect(a.trace.map((s) => s.itemId)).toEqual(b.trace.map((s) => s.itemId));
  });

  it('rebuilds identical derived-metric adequacy by replaying the stored trace', () => {
    const live = runRealBankSession('4-5', BAND_MATCHED, undefined, real);
    const replayed = replaySession('4-5', live.trace);

    for (const area of AREAS) {
      expect(replayed.areas[area].trace).toEqual(live.state.areas[area].trace);
      for (const metric of enforcedMetricsForArea(area, replayed.config)) {
        expect(metricAdequateInArea(metric, replayed.areas[area], replayed.config)).toBe(
          metricAdequateInArea(metric, live.state.areas[area], live.state.config),
        );
      }
    }
  });
});

describe('metric supply audit', () => {
  const supply = auditMetricSupply(real.banks, DEFAULT_CONFIG);

  it('no enforced per-item metric is unsatisfiable in any area', () => {
    const unsatisfiable = supply.filter((s) => s.unsatisfiable);
    expect(
      unsatisfiable.map((s) => `${s.area}/${s.metricId}`),
      'an enforced metric no wired type can emit makes the stop rule unsatisfiable in that area',
    ).toEqual([]);
  });

  it('pins the known sole-source fragilities so a bank change cannot silently stall the battery', () => {
    // Each of these is supplied by exactly ONE wired type. They are satisfiable today, but if
    // that bank is renamed, retired, or drops the measurement, the area stalls at the hard cap.
    // `M-RT` is session-adequacy, so its thin quantitative supply is already non-blocking.
    const soleSource = supply.filter((s) => s.soleSource).map((s) => `${s.area}/${s.metricId}`);
    expect(soleSource.sort()).toEqual([
      'quantitative/M-PAE',
      'quantitative/M-REV',
      'quantitative/M-RT',
    ]);
  });
});

describe('known limitation: convergence distance, not metric coverage, now sets the length', () => {
  it('a far-from-seed child still needs more items than the safety cap', () => {
    // Core-metric coverage completes early for every profile (asserted above). What remains is
    // the estimate-stability arm: item selection targets the current estimate, so the "surprise"
    // term in `difficultyDelta` stays ~0 and the estimate only ever moves at the `minUpdate`
    // floor of 0.4/item. A child seeded 6-7 points from their true ability therefore cannot
    // settle within 60 items. That is a separate defect in the difficulty-update/selection
    // interaction, NOT the coverage defect fixed here; changing it would alter every score, so
    // it is escalated rather than retuned. This test pins the behaviour so the escalation is
    // visible and cannot be mistaken for a coverage problem.
    const gifted: TrueTheta = {
      fluid_reasoning: 18,
      verbal: 16,
      quantitative: 17,
      spatial: 15,
    };
    const { state, trace } = runRealBankSession('4-5', gifted, { hardItemCap: 400 }, real);

    expect(metricCoverageCompleteAt('4-5', trace) as number).toBeLessThan(
      DEFAULT_CONFIG.hardItemCap,
    );
    expect(state.itemsServed).toBeGreaterThan(DEFAULT_CONFIG.hardItemCap);
  });
});
