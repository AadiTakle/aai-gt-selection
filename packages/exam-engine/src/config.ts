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
 */
export const CORE_METRICS: CoreMetricSpec[] = [
  { id: 'M-ACC', scope: 'all', minSamples: 5, enforced: true },
  { id: 'M-DIFFREACH', scope: 'all', minSamples: 4, enforced: true },
  { id: 'M-RT', scope: 'all', minSamples: 5, enforced: true },
  { id: 'M-RTFIRST', scope: 'all', minSamples: 5, enforced: true },
  { id: 'M-RTVAR', scope: 'all', minSamples: 5, enforced: true },
  { id: 'M-REV', scope: 'all', minSamples: 3, enforced: true },
  { id: 'M-ERRTYPE', scope: 'all', minSamples: 3, enforced: true },
  { id: 'M-CONSIST', scope: 'all', minSamples: 5, enforced: true },
  { id: 'M-LEARNRATE', scope: 'all', minSamples: 3, enforced: true },
  { id: 'M-RULEID', scope: 'fluid_reasoning', minSamples: 3, enforced: true },
  { id: 'M-VOCABLVL', scope: 'verbal', minSamples: 3, enforced: true },
  { id: 'M-LURETYPE', scope: 'verbal', minSamples: 3, enforced: true },
  { id: 'M-PAE', scope: 'quantitative', minSamples: 3, enforced: true },
  { id: 'M-ROTSLOPE', scope: 'spatial', minSamples: 3, enforced: true },
  // Tracked-inert now: bias selection but do not block completion.
  { id: 'M-PATH', scope: 'interactive', minSamples: 3, enforced: false },
  { id: 'M-EFF', scope: 'interactive', minSamples: 3, enforced: false },
  { id: 'M-PLANFUL', scope: 'interactive', minSamples: 3, enforced: false },
  { id: 'M-ENGAGE', scope: 'all', minSamples: 3, enforced: false },
  { id: 'M-RAPIDGUESS', scope: 'all', minSamples: 3, enforced: false },
  { id: 'M-IDEAFLU', scope: 'open_ended', minSamples: 3, enforced: false },
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
  coreMetrics: CORE_METRICS,
};

/** Bonus added to a type's selection score when its age bands include the current grade band. */
export const AGE_BAND_BONUS = 1.5;
/** Selection weight for an under-covered enforced core metric. */
export const ENFORCED_METRIC_WEIGHT = 2;
/** Selection weight for an under-covered tracked-inert metric. */
export const TRACKED_METRIC_WEIGHT = 1;
