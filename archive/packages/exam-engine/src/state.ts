import { DEFAULT_CONFIG, GRADE_BAND_SEED } from './config';
import { DERIVED_METRIC_IDS } from './derived';
import { clamp } from './stats';
import {
  AREAS,
  type AgeBand,
  type Area,
  type AreaState,
  type EngineConfig,
  type SessionState,
} from './types';
import { DIFFICULTY_MAX, DIFFICULTY_MIN } from './config';

function emptyMetricCounts(config: EngineConfig): Record<string, number> {
  const counts: Record<string, number> = {};
  // Derived metrics are absent on purpose: their coverage lives in the trace, and a zero here
  // would read as "collected none" rather than "not counted this way".
  for (const m of config.coreMetrics) {
    if (!DERIVED_METRIC_IDS.has(m.id)) counts[m.id] = 0;
  }
  return counts;
}

function seedAreaState(area: Area, seedDifficulty: number, config: EngineConfig): AreaState {
  return {
    area,
    difficulty: clamp(seedDifficulty, DIFFICULTY_MIN, DIFFICULTY_MAX),
    itemsSeen: new Set<string>(),
    accWindow: [],
    estWindow: [seedDifficulty],
    metricCounts: emptyMetricCounts(config),
    trace: [],
  };
}

/**
 * Build the initial session state, seeding every area's difficulty from the requested grade band
 * (BUILD_PLAN §0: K-1≈3, 2-3≈7, 4-5≈11, 6-8≈15, above-level≈18). Pass `overrides` to tune the
 * (deterministic) engine configuration.
 */
export function startState(gradeBand: AgeBand, overrides?: Partial<EngineConfig>): SessionState {
  const config: EngineConfig = { ...DEFAULT_CONFIG, ...(overrides ?? {}) };
  const seed = GRADE_BAND_SEED[gradeBand];

  const areas = {} as Record<Area, AreaState>;
  for (const area of AREAS) {
    areas[area] = seedAreaState(area, seed, config);
  }

  return {
    gradeBand,
    areas,
    itemsServed: 0,
    rngState: config.seed >>> 0,
    config,
  };
}
