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

import { DEFAULT_CONFIG, DIFFICULTY_MAX, DIFFICULTY_MIN } from './config';
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
 * The ability matrix the battery has to converge on. Every profile starts from a grade-band seed
 * and must reach its planted ability: at the seed, far above it (the screener's target
 * population), far below it, and the two degenerate responders that pin at a scale bound.
 */
const CONVERGENCE_PROFILES: readonly { name: string; band: AgeBand; theta: TrueTheta }[] = [
  {
    name: 'at the grade-band seed',
    band: '4-5',
    theta: { fluid_reasoning: 11, verbal: 11, quantitative: 11, spatial: 11 },
  },
  {
    name: 'gifted, far above seed',
    band: '4-5',
    theta: { fluid_reasoning: 18, verbal: 16, quantitative: 17, spatial: 15 },
  },
  {
    name: 'struggling, far below seed',
    band: '4-5',
    theta: { fluid_reasoning: 5, verbal: 4, quantitative: 6, spatial: 3 },
  },
  // Off-scale abilities: the responder is correct on every item / wrong on every item, so the
  // estimate should travel to the relevant bound and stop there rather than oscillate.
  {
    name: 'all-correct responder',
    band: '4-5',
    theta: { fluid_reasoning: 99, verbal: 99, quantitative: 99, spatial: 99 },
  },
  {
    name: 'all-wrong responder',
    band: '4-5',
    theta: { fluid_reasoning: -99, verbal: -99, quantitative: -99, spatial: -99 },
  },
  { name: 'mixed spread', band: '4-5', theta: WIDE_SPREAD },
  // The mirror of the gifted case: an above-level seed of 18 with ability near the bottom third.
  {
    name: 'above-level seed, low ability',
    band: 'above-level',
    theta: { fluid_reasoning: 8, verbal: 7, quantitative: 9, spatial: 6 },
  },
];

/**
 * Largest battery any profile may need. Sits below `hardItemCap` (60) with headroom, so a
 * regression shows up as a failed budget rather than as a silent slide into the safety cap. The
 * product target is a battery inside ~45 minutes of child time; item count is the proxy the engine
 * controls.
 */
const CONVERGENCE_BUDGET = 48;

/**
 * How far a settled per-area estimate may sit from the planted ability. Roughly two `minUpdate`
 * steps: converging fast onto the wrong number is worse than converging slowly onto the right one,
 * so speed and accuracy are asserted together.
 */
const ESTIMATE_TOLERANCE = 1.5;

/**
 * Every integer ability the sweep below plants, with the same value in all four areas. The named
 * profiles pick seven interesting points; this covers the scale so an accuracy hole cannot hide in
 * the gaps between them (D-025). The bounds are the first and last integers strictly inside the
 * 1..20 scale, since the two scale bounds are the degenerate responders already covered above.
 */
const ABILITY_SWEEP: readonly number[] = Array.from({ length: 18 }, (_, i) => i + 2);

/**
 * `ageBandBias` values either side of the default, used to show the sweep passes across a plateau
 * rather than at one lucky setting (D-025).
 *
 * The upper end used to be 1.0. Capping tracked-inert coverage gain (D-201) moved the plateau's
 * upper edge down to somewhere in (0.75, 1.0): at the default 0.5 the sweep's worst error IMPROVED
 * from 1.20 to 0.77, and at 1.0 — twice the operating value — one of the 72 ability × area cells
 * goes 1.84 off on the default seed. `EDGE_BIAS` below asserts that edge is soft rather than a
 * cliff, which is the property D-025 actually needs.
 */
const AGE_BAND_BIAS_PERTURBATIONS: readonly number[] = [0, 0.25, 0.75];

/**
 * The first `ageBandBias` outside the plateau, and how badly it is allowed to fail.
 *
 * D-025's claim is that the age-band fix decays smoothly outside its plateau rather than snapping
 * back to the 2-3 point bias it replaced. Asserting a BOUNDED failure at the edge tests that claim
 * where asserting no failure at all would merely have hidden where the edge is.
 */
const EDGE_BIAS = 1;
const EDGE_MAX_BREACHES = 1;
const EDGE_MAX_ERROR = 2.0;

function equalAbility(ability: number): TrueTheta {
  return {
    fluid_reasoning: ability,
    verbal: ability,
    quantitative: ability,
    spatial: ability,
  };
}

/**
 * First item count at which every enforced core metric has adequate data, ignoring the separate
 * estimate-stability arm of the stop rule. Recomputed by replaying the stored trace, which also
 * exercises the §5 requirement that adequacy is reproducible from the trace alone.
 */
function metricCoverageCompleteAt(gradeBand: AgeBand, trace: readonly ScoredItem[]): number | null {
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
    const lengths = new Set(
      CONVERGENCE_PROFILES.map(
        ({ band, theta }) =>
          runRealBankSession(band, theta, { hardItemCap: 400 }, real).state.itemsServed,
      ),
    );
    expect(
      lengths.size,
      'every ability profile produced the same battery length, so it is fixed-length',
    ).toBeGreaterThan(1);
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
    // Supplied by exactly ONE wired type: satisfiable today, but if that bank is renamed,
    // retired, or drops the measurement, the area stalls at the hard cap. `M-RT` is
    // session-adequacy, so its thin quantitative supply is already non-blocking.
    //
    // `quantitative/M-PAE` and `quantitative/M-REV` used to sit on this list. The
    // question-type review retired their only quantitative suppliers (QUANT-NUMLINE-01 and
    // QUANT-EQUAL-01), which is the failure this test was written to predict — both are now
    // declared unenforced for quantitative in `CORE_METRICS`, so the audit no longer covers
    // them.
    const soleSource = supply.filter((s) => s.soleSource).map((s) => `${s.area}/${s.metricId}`);
    expect(soleSource.sort()).toEqual(['quantitative/M-RT']);
  });
});

describe('convergence from a distant seed (D-023)', () => {
  /*
   * Before the decaying step schedule, item selection targeted the current estimate, so the
   * "surprise" term in `difficultyDelta` stayed ~0 and the estimate only ever moved at its fixed
   * 0.4/item floor. Climbing the 7 points from a '4-5' seed of 11 to a true 18 took ~18 items of
   * pure climbing per area, and the gifted profile ran 83 items — past the 60-item safety cap —
   * without the estimate settling. These tests hold BOTH halves of the fix: every profile
   * concludes on the stop rule inside the cap, AND lands on the planted ability. A future change
   * cannot trade accuracy for speed without failing here.
   */

  it.each(CONVERGENCE_PROFILES)(
    'concludes on the stop rule, inside the safety cap: $name',
    ({ band, theta }) => {
      // The cap is lifted so an overrun can happen and BE SEEN; the assertion is that it does not.
      // Running at the real cap would silently convert an overrun into a pass, which is exactly
      // how the 83-item battery hid.
      const { state, done, exhausted } = runRealBankSession(
        band,
        theta,
        { hardItemCap: 400 },
        real,
      );

      expect(exhausted, 'ran out of servable items instead of concluding').toBe(false);
      expect(done).toBe(true);
      expect(
        state.itemsServed,
        'the battery would have reached the hard cap, so this child cannot be measured',
      ).toBeLessThan(DEFAULT_CONFIG.hardItemCap);
      expect(
        state.itemsServed,
        'battery length regressed past the convergence budget',
      ).toBeLessThanOrEqual(CONVERGENCE_BUDGET);
    },
  );

  it.each(CONVERGENCE_PROFILES)(
    'recovers the planted ability, not just a fast number: $name',
    ({ band, theta }) => {
      const { state } = runRealBankSession(band, theta, { hardItemCap: 400 }, real);

      for (const area of AREAS) {
        const estimate = state.areas[area].difficulty;
        const truth = theta[area];
        if (truth > DIFFICULTY_MAX) {
          // Ability beyond anything the bank can present: the estimate should pin at the ceiling.
          expect(estimate, `${area} did not reach the scale ceiling`).toBe(DIFFICULTY_MAX);
        } else if (truth < DIFFICULTY_MIN) {
          expect(estimate, `${area} did not reach the scale floor`).toBe(DIFFICULTY_MIN);
        } else {
          expect(
            Math.abs(estimate - truth),
            `${area} settled at ${estimate.toFixed(2)} for a planted ability of ${truth}`,
          ).toBeLessThanOrEqual(ESTIMATE_TOLERANCE);
        }
      }
    },
  );

  it('reaches identical estimates on a repeated run (deterministic and pure)', () => {
    for (const { name, band, theta } of CONVERGENCE_PROFILES) {
      const first = runRealBankSession(band, theta, { hardItemCap: 400 }, real);
      const second = runRealBankSession(band, theta, { hardItemCap: 400 }, real);

      expect(second.state.itemsServed, name).toBe(first.state.itemsServed);
      expect(
        second.trace.map((s) => s.itemId),
        name,
      ).toEqual(first.trace.map((s) => s.itemId));
      for (const area of AREAS) {
        expect(second.state.areas[area].difficulty, `${name}/${area}`).toBe(
          first.state.areas[area].difficulty,
        );
      }
    }
  });

  it('rebuilds identical estimates by replaying the stored trace', () => {
    // The schedule is indexed by direction reversals read off the per-area trace, so it has to
    // rebuild exactly from stored results: the score must be recomputable from the trace alone.
    for (const { name, band, theta } of CONVERGENCE_PROFILES) {
      const live = runRealBankSession(band, theta, { hardItemCap: 400 }, real);
      const replayed = replaySession(band, live.trace, { hardItemCap: 400 });
      for (const area of AREAS) {
        expect(replayed.areas[area].difficulty, `${name}/${area}`).toBe(
          live.state.areas[area].difficulty,
        );
      }
    }
  });

  it('still completes core-metric coverage for the gifted profile', () => {
    // Convergence got faster; the coverage bar did not move. Coverage, not the estimate, is now
    // what sets the floor on battery length.
    const gifted = CONVERGENCE_PROFILES[1] as (typeof CONVERGENCE_PROFILES)[number];
    const { trace } = runRealBankSession(gifted.band, gifted.theta, { hardItemCap: 400 }, real);
    const completeAt = metricCoverageCompleteAt(gifted.band, trace);
    expect(completeAt).not.toBeNull();
    expect(completeAt as number).toBeLessThan(DEFAULT_CONFIG.hardItemCap);
  });
});

describe('convergence across the whole ability scale (D-025)', () => {
  /*
   * `CONVERGENCE_PROFILES` above asserts accuracy at seven hand-picked abilities, and every one of
   * them passed while five integer abilities — 5, 7, 12, 13, 14 — sat outside the tolerance, the
   * worst by 2.67 points. The hole was in item selection: `nextItem` ranked an age-band match ahead
   * of closeness to the estimate, and almost every wired type's '4-5' items stop around difficulty
   * 12-13. An area whose estimate left that range was then served items 2-3 points off target for
   * the rest of the session, and `difficultyDelta` reads direction off correctness alone, so a
   * correct answer on an item well BELOW the estimate still raised it by a full step. That ratchets
   * upward in the 12-14 region and downward around 5-7, which is exactly where the breaches were.
   *
   * Sweeping every integer ability instead of a shortlist is what closes that class of gap, so this
   * block must keep sweeping even if the tolerance or the fix changes.
   */
  const sweep = new Map(
    ABILITY_SWEEP.map((ability) => [
      ability,
      runRealBankSession('4-5', equalAbility(ability), { hardItemCap: 400 }, real),
    ]),
  );

  const runFor = (ability: number): RealSessionResult => sweep.get(ability) as RealSessionResult;

  it.each(ABILITY_SWEEP)('recovers a planted ability of %i in every area', (ability) => {
    const { state } = runFor(ability);
    for (const area of AREAS) {
      expect(
        Math.abs(state.areas[area].difficulty - ability),
        `${area} settled at ${state.areas[area].difficulty.toFixed(2)} for a planted ability of ${ability}`,
      ).toBeLessThanOrEqual(ESTIMATE_TOLERANCE);
    }
  });

  it.each(ABILITY_SWEEP)(
    'concludes on the stop rule inside the budget at ability %i',
    (ability) => {
      const { state, done, exhausted } = runFor(ability);
      expect(exhausted, 'ran out of servable items instead of concluding').toBe(false);
      expect(done).toBe(true);
      expect(
        state.itemsServed,
        'battery length regressed past the convergence budget',
      ).toBeLessThanOrEqual(CONVERGENCE_BUDGET);
    },
  );

  it('rebuilds every swept estimate by replaying its stored trace', () => {
    for (const ability of ABILITY_SWEEP) {
      const live = runFor(ability);
      const replayed = replaySession('4-5', live.trace, { hardItemCap: 400 });
      for (const area of AREAS) {
        expect(replayed.areas[area].difficulty, `ability ${ability} / ${area}`).toBe(
          live.state.areas[area].difficulty,
        );
      }
    }
  });

  it.each(AGE_BAND_BIAS_PERTURBATIONS)(
    'is not on a knife edge: the sweep still lands with ageBandBias %s',
    (ageBandBias) => {
      // The default (0.5) sits inside a plateau, not on a lucky point. Outside it the fix decays
      // smoothly rather than snapping: 1.5 reopens one breach, and anything wider than the
      // selection window reopens all five.
      const breaches: string[] = [];
      for (const ability of ABILITY_SWEEP) {
        const { state } = runRealBankSession(
          '4-5',
          equalAbility(ability),
          { hardItemCap: 400, ageBandBias },
          real,
        );
        for (const area of AREAS) {
          const error = Math.abs(state.areas[area].difficulty - ability);
          if (error > ESTIMATE_TOLERANCE) {
            breaches.push(`ability ${ability} / ${area} off by ${error.toFixed(2)}`);
          }
        }
      }
      expect(breaches).toEqual([]);
    },
  );

  it('decays smoothly rather than snapping at the top of the plateau', () => {
    const errors: number[] = [];
    for (const ability of ABILITY_SWEEP) {
      const { state } = runRealBankSession(
        '4-5',
        equalAbility(ability),
        { hardItemCap: 400, ageBandBias: EDGE_BIAS },
        real,
      );
      for (const area of AREAS) {
        errors.push(Math.abs(state.areas[area].difficulty - ability));
      }
    }

    const breaches = errors.filter((e) => e > ESTIMATE_TOLERANCE);
    expect(breaches.length, 'the plateau edge has become a cliff').toBeLessThanOrEqual(
      EDGE_MAX_BREACHES,
    );
    expect(Math.max(...errors), 'the age-band bias has reopened').toBeLessThanOrEqual(
      EDGE_MAX_ERROR,
    );
  });
});
