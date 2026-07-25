import type { AgeBand, CoreMetricSpec, EngineConfig } from './types';

/**
 * Start difficulty seeded from the requested grade band (BUILD_PLAN §0). Midpoints of the
 * design difficulty ramp: K-1 ≈ 1-4, 2-3 ≈ 4-8, 4-5 ≈ 8-12, 6-8 ≈ 12-16, above-level ≈ 16-20.
 */
export const GRADE_BAND_SEED: Record<AgeBand, number> = {
  'K-1': 3,
  '2-3': 7,
  '4-5': 11,
  '6-8': 15,
  'above-level': 18,
};

/** Full 1..20 difficulty scale bounds. */
export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 20;
/** Span of the scale, used to normalise "surprise" in the difficulty update. */
export const DIFFICULTY_RANGE = DIFFICULTY_MAX - DIFFICULTY_MIN;

/**
 * Basic-core metric set (BUILD_PLAN §4). Enforced metrics gate the stop rule; tracked-inert
 * metrics (enforced=false) only bias selection toward coverage variety. `minSamples` and the
 * enforced flags are design-provisional defaults (born-synthetic, validated=false).
 *
 * Each entry declares HOW its samples arrive (`kind`) and WHAT population `minSamples` counts
 * over (`adequacy`):
 *
 * - `observed` metrics are emitted per item by a renderer or by server verification, so a sample
 *   is one emission.
 * - `derived` metrics are session-level aggregates fitted from the trace; a renderer cannot emit
 *   them, so their `minSamples` counts the derivation's inputs (see `derived.ts`).
 * - `session` adequacy is used for the response-time family, whose "how much to collect" in
 *   `MEASUREMENTS.md` is stated per CHILD (a per-child RT distribution), not per construct.
 *
 * An enforced metric that no wired type can supply would make the stop rule unsatisfiable and
 * silently pin the battery to `hardItemCap`. `auditMetricSupply` (coverage.ts) re-derives supply
 * from the live banks and the real-bank tests fail if that ever becomes true again.
 */
export const CORE_METRICS: CoreMetricSpec[] = [
  // --- per-item observed, per-area ---
  { id: 'M-ACC', scope: 'all', minSamples: 5, enforced: true, kind: 'observed' },
  { id: 'M-ERRTYPE', scope: 'all', minSamples: 3, enforced: true, kind: 'observed' },
  {
    id: 'M-REV',
    scope: 'all',
    minSamples: 3,
    enforced: true,
    kind: 'observed',
    supplyNote: 'Sole source in quantitative (QUANT-EQUAL-01); a bank change there stalls the area.',
  },
  {
    id: 'M-RULEID',
    scope: 'fluid_reasoning',
    minSamples: 3,
    enforced: true,
    kind: 'observed',
    supplyNote: 'Five fluid types supply it; thin, so selection luck matters if banks shrink.',
  },
  { id: 'M-VOCABLVL', scope: 'verbal', minSamples: 3, enforced: true, kind: 'observed' },
  { id: 'M-LURETYPE', scope: 'verbal', minSamples: 3, enforced: true, kind: 'observed' },
  {
    id: 'M-PAE',
    scope: 'quantitative',
    minSamples: 3,
    enforced: true,
    kind: 'observed',
    supplyNote: 'Sole source (QUANT-NUMLINE-01); the only number-line placement type wired.',
  },

  // --- per-item observed, session-level adequacy (per-child RT distribution) ---
  {
    id: 'M-RT',
    scope: 'all',
    minSamples: 20,
    enforced: true,
    kind: 'observed',
    adequacy: 'session',
    supplyNote: 'Sole source in quantitative (QUANT-DOTS-01); session adequacy keeps that non-blocking.',
  },
  { id: 'M-RTFIRST', scope: 'all', minSamples: 15, enforced: true, kind: 'observed', adequacy: 'session' },

  // --- derived from the trace (see derived.ts) ---
  { id: 'M-DIFFREACH', scope: 'all', minSamples: 6, enforced: true, kind: 'derived' },
  { id: 'M-CONSIST', scope: 'all', minSamples: 3, enforced: true, kind: 'derived' },
  { id: 'M-LEARNRATE', scope: 'all', minSamples: 8, enforced: true, kind: 'derived' },
  { id: 'M-RTVAR', scope: 'all', minSamples: 20, enforced: true, kind: 'derived', adequacy: 'session' },
  /*
   * M-ROTSLOPE is DERIVED but NOT enforced. It is fittable — SPA-VIEW-01 and SPA-XSCAN-01 record
   * `answer.angularDisparityDeg` per item — but not adequately within a proportionate spatial
   * block: a stable Shepard-Metzler slope needs >=12 correct trials across >=3 disparities
   * (MEASUREMENTS.md), zero of the 66 catalog types declare it, SPA-XSCAN-01 supplies a disparity
   * on only 38 of 140 items and all of those sit at difficulty >=14.6, and forcing 12 trials from
   * one or two types would both crowd out spatial construct breadth and push the battery into the
   * safety cap. Enforcing it made the spatial area permanently uncoverable. The engine still
   * derives its value whenever the trace happens to contain enough disparity trials; re-enforce it
   * when a dedicated mental-rotation type is wired with disparity across the difficulty ramp.
   */
  { id: 'M-ROTSLOPE', scope: 'spatial', minSamples: 12, enforced: false, kind: 'derived' },

  // Tracked-inert now: bias selection but do not block completion.
  { id: 'M-PATH', scope: 'interactive', minSamples: 3, enforced: false, kind: 'observed' },
  { id: 'M-EFF', scope: 'interactive', minSamples: 3, enforced: false, kind: 'observed' },
  { id: 'M-PLANFUL', scope: 'interactive', minSamples: 3, enforced: false, kind: 'observed' },
  { id: 'M-ENGAGE', scope: 'all', minSamples: 3, enforced: false, kind: 'observed' },
  /* No catalog type declares M-RAPIDGUESS yet; it is a host-side effort flag, tracked only. */
  { id: 'M-RAPIDGUESS', scope: 'all', minSamples: 3, enforced: false, kind: 'observed' },
  { id: 'M-IDEAFLU', scope: 'open_ended', minSamples: 3, enforced: false, kind: 'observed' },
];

/** Default, tunable engine configuration. */
export const DEFAULT_CONFIG: EngineConfig = {
  seed: 0xc0ffee,
  difficultyWindow: 3,
  accWindowSize: 10,
  estWindowSize: 10,
  minUpdate: 0.4,
  maxUpdate: 1.0,
  nearMissSoften: 0.5,
  evenSpreadTolerance: 2,
  minItemsPerArea: 6,
  stabilityWindow: 6,
  stabilitySd: 1.2,
  stabilityDrift: 0.8,
  hardItemCap: 60,
  consistencyPairTolerance: 1.0,
  rotationMinDistinctDisparities: 3,
  coreMetrics: CORE_METRICS,
};

/** Bonus added to a type's selection score when its age bands include the current grade band. */
export const AGE_BAND_BONUS = 1.5;
/** Selection weight for an under-covered enforced core metric. */
export const ENFORCED_METRIC_WEIGHT = 2;
/** Selection weight for an under-covered tracked-inert metric. */
export const TRACKED_METRIC_WEIGHT = 1;
