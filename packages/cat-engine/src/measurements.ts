import rawMeasurements from './measurements.data.json';

/**
 * Typed measurement / metric registry.
 *
 * Canonical data is bundled from `research/exam-question-types/measurements.json`
 * (kept in sync as `measurements.data.json`) so the engine reads no filesystem
 * at runtime and stays a portable Lambda payload. The semantic groupings below
 * are derived from `research/exam-question-types/METRIC_FRAMEWORK.md` (§1-§3).
 */

/** One canonical measurement (mirrors the `measurements.json` field names). */
export interface Measurement {
  id: string;
  name: string;
  what: string;
  usefulness_tail: string;
  how_to_collect: string;
  how_much_to_collect: string;
}

/** All measurements, typed and frozen. */
export const MEASUREMENTS: readonly Measurement[] = Object.freeze(
  (rawMeasurements as Measurement[]).map((m) => Object.freeze({ ...m })),
);

const BY_ID: ReadonlyMap<string, Measurement> = new Map(MEASUREMENTS.map((m) => [m.id, m]));

/** Look up a measurement by id, or `undefined` when unknown. */
export function getMeasurement(id: string): Measurement | undefined {
  return BY_ID.get(id);
}

/** True when the registry contains a measurement with this id. */
export function hasMeasurement(id: string): boolean {
  return BY_ID.has(id);
}

/** All measurement ids, in registry order. */
export function measurementIds(): string[] {
  return MEASUREMENTS.map((m) => m.id);
}

/**
 * The four scored domains (`SCORED_DOMAINS`, framework §1) are exported from
 * `./types` and re-exported by the package barrel.
 *
 * Engagement-gate metrics (framework §3): a response's speed + accuracy only
 * count when these pass. `M-RAPIDGUESS` is enforced by this package's RTE
 * filter (`rte.ts`); `M-ENGAGE` / `M-DRIFT` are supplied by the caller.
 */
export const ENGAGEMENT_GATE_METRICS = ['M-ENGAGE', 'M-RAPIDGUESS', 'M-DRIFT'] as const;

/** Core ability / tail statistics (framework §2). */
export const ABILITY_CORE_METRICS = [
  'M-DIFFREACH',
  'M-LEARNRATE',
  'M-PLANFUL',
  'M-ACC',
  'M-POLY',
] as const;

/** Consistency-over-speed signals that always count (framework §3). */
export const CONSISTENCY_METRICS = ['M-RTVAR', 'M-LAPSE', 'M-CONSIST'] as const;

/**
 * Cross-cutting signal groups (framework §1) — reported as profile signals, not
 * as a fifth scored domain.
 */
export const CROSS_CUTTING_METRICS = {
  working_memory: ['M-SPAN', 'M-MANIPCOST', 'M-UPDATECOST', 'M-BETWEENERR', 'M-SEARCHSTRAT', 'M-PROCACC'],
  executive_control: ['M-COMM', 'M-SSRT', 'M-CONGEFF', 'M-SWITCHCOST', 'M-PERSEV', 'M-POSTERR'],
} as const;

/**
 * Assert that every measurement id referenced by the semantic groupings exists
 * in the registry (guards against drift between this file and the JSON data).
 * Returns the list of missing ids (empty when consistent).
 */
export function registryIntegrityIssues(): string[] {
  const referenced = [
    ...ENGAGEMENT_GATE_METRICS,
    ...ABILITY_CORE_METRICS,
    ...CONSISTENCY_METRICS,
    ...CROSS_CUTTING_METRICS.working_memory,
    ...CROSS_CUTTING_METRICS.executive_control,
  ];
  return referenced.filter((id) => !BY_ID.has(id));
}
