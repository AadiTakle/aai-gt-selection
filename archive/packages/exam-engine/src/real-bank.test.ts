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
  respondProbabilistically,
  runRealBankSession,
  type RealBanks,
  type RealSessionResult,
  type Responder,
  type TrueTheta,
} from './testing/real-bank';
import { AREAS, type AgeBand, type Area, type EngineConfig, type ScoredItem } from './types';

const real = loadRealBanks();

/**
 * Every session in this file, run against a child who by construction never guesses.
 *
 * `respondFromRealBank` answers correctly exactly when the item's difficulty is at or below the
 * planted ability. That is a child with a chance-success floor of ZERO, so the engine is told so.
 * Leaving the shipped floor of 0.2 in place here would not test the selection rule, it would test
 * what a deliberately mismatched response model does to it — measured at about +1.5 scale points
 * of upward bias, which is the same asymmetric harm `ability.test.ts` pins and exactly the thing a
 * recovery test must not silently absorb.
 *
 * The shipped floor is covered where it belongs, against children who actually guess: the
 * probabilistic matched pair at the end of this file, and `pnpm exam:selection-diversity`.
 */
const NO_GUESSING: Partial<EngineConfig> = { guessingFloor: 0 };

function runSession(
  band: AgeBand,
  theta: TrueTheta,
  overrides?: Partial<EngineConfig>,
  banks: RealBanks = real,
  responder?: Responder,
): RealSessionResult {
  return runRealBankSession(band, theta, { ...NO_GUESSING, ...overrides }, banks, responder);
}

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
 * How close to a scale end a degenerate responder's estimate must land to count as having reached
 * it.
 *
 * One scale point. The hardest wired item sits below 20 and the easiest above 1, so no evidence
 * exists that could place a child ON either bound; an estimator that reported one anyway would be
 * asserting something it cannot know. This asserts the estimate is unambiguously at the end of the
 * scale while leaving room for the honest gap between the bound and the last item.
 */
const SCALE_END_TOLERANCE = 1.0;

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
    const state = replaySession(gradeBand, trace.slice(0, n), { ...NO_GUESSING, hardItemCap: 400 });
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
    const { trace } = runSession('4-5', BAND_MATCHED, { hardItemCap: 400 }, real);
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
      const { trace } = runSession(band, theta, { hardItemCap: 400 }, real);
      const completeAt = metricCoverageCompleteAt(band, trace);
      expect(completeAt, `${band} ${JSON.stringify(theta)}`).not.toBeNull();
      expect(completeAt as number).toBeLessThan(DEFAULT_CONFIG.hardItemCap);
    }
  });
});

describe('stop rule against the real banks', () => {
  // Deterministic and pure, so one shared run is safe to assert against from several tests.
  const session: RealSessionResult = runSession('4-5', BAND_MATCHED, undefined, real);

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
        ({ band, theta }) => runSession(band, theta, { hardItemCap: 400 }, real).state.itemsServed,
      ),
    );
    expect(
      lengths.size,
      'every ability profile produced the same battery length, so it is fixed-length',
    ).toBeGreaterThan(1);
  });

  it('recovers the true ability ordering from real items', () => {
    const { state } = runSession('4-5', WIDE_SPREAD, { hardItemCap: 400 }, real);
    const est = (a: Area) => state.areas[a].difficulty;
    expect(est('fluid_reasoning')).toBeGreaterThan(est('quantitative'));
    expect(est('quantitative')).toBeGreaterThan(est('verbal'));
    expect(est('verbal')).toBeGreaterThan(est('spatial'));
  });

  it('is deterministic across identical runs', () => {
    const a = runSession('4-5', BAND_MATCHED, undefined, real);
    const b = runSession('4-5', BAND_MATCHED, undefined, real);
    expect(a.state.itemsServed).toBe(b.state.itemsServed);
    expect(a.trace.map((s) => s.itemId)).toEqual(b.trace.map((s) => s.itemId));
  });

  it('rebuilds identical derived-metric adequacy by replaying the stored trace', () => {
    const live = runSession('4-5', BAND_MATCHED, undefined, real);
    const replayed = replaySession('4-5', live.trace, { ...NO_GUESSING, hardItemCap: 400 });

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
      const { state, done, exhausted } = runSession(band, theta, { hardItemCap: 400 }, real);

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
      const { state } = runSession(band, theta, { hardItemCap: 400 }, real);

      for (const area of AREAS) {
        const estimate = state.areas[area].difficulty;
        const truth = theta[area];
        if (truth > DIFFICULTY_MAX) {
          /*
           * Ability beyond anything the bank can present. The requirement is that the estimate
           * reaches the top of the scale, NOT that it lands exactly on 20.
           *
           * It used to say exactly 20, which was a property of the staircase rather than of a
           * defensible estimate: a rule that adds a step per correct answer eventually walks into
           * the clamp and stops there. A child who was correct on everything served is only known
           * to be at least as able as the hardest item they saw, and the bank runs out below 20, so
           * a belief with a proper prior settles just above that item instead of asserting a
           * number the evidence cannot reach. `abilityStandardError` already documented the same
           * behaviour for the reported score; this is the selection side agreeing with it.
           */
          expect(estimate, `${area} did not reach the top of the scale`).toBeGreaterThanOrEqual(
            DIFFICULTY_MAX - SCALE_END_TOLERANCE,
          );
        } else if (truth < DIFFICULTY_MIN) {
          expect(estimate, `${area} did not reach the bottom of the scale`).toBeLessThanOrEqual(
            DIFFICULTY_MIN + SCALE_END_TOLERANCE,
          );
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
      const first = runSession(band, theta, { hardItemCap: 400 }, real);
      const second = runSession(band, theta, { hardItemCap: 400 }, real);

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
      const live = runSession(band, theta, { hardItemCap: 400 }, real);
      const replayed = replaySession(band, live.trace, { ...NO_GUESSING, hardItemCap: 400 });
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
    const { trace } = runSession(gifted.band, gifted.theta, { hardItemCap: 400 }, real);
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
      runSession('4-5', equalAbility(ability), { hardItemCap: 400 }, real),
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
      const replayed = replaySession('4-5', live.trace, { ...NO_GUESSING, hardItemCap: 400 });
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
        const { state } = runSession(
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
      const { state } = runSession(
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

/*
 * The guessing floor, tested in BOTH directions.
 *
 * Every wired item is multiple choice, so a child below an item passes it sometimes and a model
 * that assumes otherwise reads luck as ability. The obvious guard — "the corrected floor recovers a
 * guessing child better" — passes just as happily if the floor were set to 0.9, so on its own it
 * would license any positive number. The second case is what makes the first mean something: the
 * same correction applied to a child who does NOT guess actively harms them.
 *
 * That asymmetry is the reason the shipped 0.2 is a five-option item rather than a safety margin,
 * and the reason it is a policy knob rather than a constant. It is an assumption about the bank,
 * and it is wrong in a measurable direction whichever way it is missed.
 */
describe('the chance-success floor, in both directions', () => {
  /**
   * Abilities spanning the scale, because the floor's effect is not uniform along it.
   *
   * A single child would not settle the question. A child seeded near their own level barely
   * guesses their way anywhere, while one seeded far above their level is served items they can
   * only guess at and is inflated hardest — so a low child alone overstates the correction and a
   * mid child alone understates it. Averaging across the scale is what makes the direction a
   * property of the model rather than of the child chosen to demonstrate it.
   */
  const PLANTED = [5, 7, 9, 11, 13, 15, 17] as const;

  /** Signed error of every reported standing level. Positive means the child was flattered. */
  function errors(floor: number, responder?: Responder): number[] {
    const out: number[] = [];
    for (const ability of PLANTED) {
      const { state } = runSession(
        '4-5',
        equalAbility(ability),
        { guessingFloor: floor, hardItemCap: 400 },
        real,
        responder,
      );
      for (const area of AREAS) out.push(state.areas[area].difficulty - ability);
    }
    return out;
  }

  const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
  const worst = (xs: number[]): number => Math.max(...xs.map(Math.abs));

  const guesses: Responder = (served, banks, theta) =>
    respondProbabilistically(served, banks, theta, {
      slope: 1.0,
      guessing: 'per-item',
      fallbackGuessing: 0.25,
      seed: 0x9e3779b9,
    });

  it('stops a child who guesses from being reported above their level', () => {
    const uncorrected = mean(errors(0, guesses));
    const corrected = mean(errors(0.2, guesses));

    expect(
      uncorrected,
      'assuming nobody guesses no longer flatters a guessing child',
    ).toBeGreaterThan(0.5);
    expect(
      Math.abs(corrected),
      `the floor did not remove the inflation: ${uncorrected.toFixed(2)} -> ${corrected.toFixed(2)}`,
    ).toBeLessThan(Math.abs(uncorrected));
  });

  it('overstates a child who does not guess, so the floor is a bank claim and not a free win', () => {
    /*
     * `respondFromRealBank` is a pure threshold child: they never pass an item above their level.
     * Asserted on the WORST area rather than the average because that is the shape of the harm —
     * it is not a uniform shift but a concentration in the mid scale, where a floor the child does
     * not have makes every miss weaker evidence than it really is and the estimate settles above
     * them. Averaged across the scale it is about a fifth of a point and easy to dismiss; at its
     * worst it is most of the recovery tolerance the rest of this file is held to. The abilities
     * are a systematic sweep of the usable scale rather than a chosen point, so what is asserted
     * is a property of the mid-scale and not of one lucky seed.
     */
    const matched = errors(0);
    const overCorrected = errors(0.2);

    expect(
      worst(matched),
      'a matched model should recover this child within the usual tolerance',
    ).toBeLessThanOrEqual(ESTIMATE_TOLERANCE);
    expect(
      mean(overCorrected),
      'assuming a floor that is not there should push the estimate UP, not down',
    ).toBeGreaterThan(mean(matched));
    expect(
      worst(overCorrected) - worst(matched),
      `the mismatch cost less than expected: ${worst(matched).toFixed(2)} -> ${worst(overCorrected).toFixed(2)}`,
    ).toBeGreaterThan(0.25);
  });
});
