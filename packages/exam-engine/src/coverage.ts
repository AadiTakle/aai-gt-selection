import { ENFORCED_METRIC_WEIGHT, TRACKED_METRIC_WEIGHT } from './config';
import { DERIVED_METRIC_IDS, derivedInputCount, derivedMetricAdequate } from './derived';
import {
  AREAS,
  type Area,
  type AreaState,
  type Banks,
  type CoreMetricSpec,
  type EngineConfig,
  type ItemObservation,
  type MetricScope,
  type QuestionType,
  type SessionState,
} from './types';

/** Whether a metric with the given scope is collectable in (and therefore relevant to) an area. */
export function scopeAppliesToArea(scope: MetricScope, area: Area): boolean {
  if (scope === 'all') return true;
  if (scope === 'interactive' || scope === 'open_ended') return true; // type-shaped, allow any area
  return scope === area;
}

/** How a metric's samples arrive; defaults to per-item `observed`. */
export function metricKind(metric: CoreMetricSpec): 'observed' | 'derived' {
  return metric.kind ?? (DERIVED_METRIC_IDS.has(metric.id) ? 'derived' : 'observed');
}

/** The population a metric's `minSamples` counts over; defaults to `per_area`. */
export function metricAdequacyScope(metric: CoreMetricSpec): 'per_area' | 'session' {
  return metric.adequacy ?? 'per_area';
}

/**
 * Enforced core metrics that gate a given AREA. Session-adequacy metrics are excluded: they are
 * person-level and are checked once for the whole session by `sessionMetricsCovered`.
 */
export function enforcedMetricsForArea(area: Area, config: EngineConfig): CoreMetricSpec[] {
  return config.coreMetrics.filter(
    (m) =>
      m.enforced &&
      metricAdequacyScope(m) === 'per_area' &&
      (m.scope === 'all' || m.scope === area),
  );
}

/** Enforced core metrics whose minimum is counted across the whole session, not per area. */
export function enforcedSessionMetrics(config: EngineConfig): CoreMetricSpec[] {
  return config.coreMetrics.filter((m) => m.enforced && metricAdequacyScope(m) === 'session');
}

/** Sample count for a metric in an area (0 when never collected). */
export function metricCount(areaState: AreaState, metricId: string): number {
  return areaState.metricCounts[metricId] ?? 0;
}

/** Every observation in the session, in area order (deterministic). */
export function sessionTrace(state: SessionState): ItemObservation[] {
  return AREAS.flatMap((area) => state.areas[area].trace);
}

/**
 * Samples a metric has in one area, in whatever unit its `minSamples` counts: emissions for an
 * `observed` metric, derivation inputs for a `derived` one.
 */
export function metricSamplesInArea(
  metric: CoreMetricSpec,
  areaState: AreaState,
  config: EngineConfig,
): number {
  return metricKind(metric) === 'derived'
    ? derivedInputCount(metric, areaState.trace, config)
    : metricCount(areaState, metric.id);
}

/** The same count, taken across the whole session. */
export function metricSamplesInSession(metric: CoreMetricSpec, state: SessionState): number {
  if (metricKind(metric) === 'derived') {
    return derivedInputCount(metric, sessionTrace(state), state.config);
  }
  let total = 0;
  for (const area of AREAS) total += metricCount(state.areas[area], metric.id);
  return total;
}

/** Whether a metric has adequate data within one area. */
export function metricAdequateInArea(
  metric: CoreMetricSpec,
  areaState: AreaState,
  config: EngineConfig,
): boolean {
  return metricKind(metric) === 'derived'
    ? derivedMetricAdequate(metric, areaState.trace, config)
    : metricCount(areaState, metric.id) >= metric.minSamples;
}

/** Whether every enforced session-scope metric has reached its session-wide minimum. */
export function sessionMetricsCovered(state: SessionState): boolean {
  for (const metric of enforcedSessionMetrics(state.config)) {
    if (metricKind(metric) === 'derived') {
      if (!derivedMetricAdequate(metric, sessionTrace(state), state.config)) return false;
    } else if (metricSamplesInSession(metric, state) < metric.minSamples) {
      return false;
    }
  }
  return true;
}

/** Number of enforced metrics still short of `minSamples` in an area (area "neediness"). */
export function enforcedShortfallCount(area: Area, state: SessionState): number {
  const areaState = state.areas[area];
  let count = 0;
  for (const m of enforcedMetricsForArea(area, state.config)) {
    if (!metricAdequateInArea(m, areaState, state.config)) count += 1;
  }
  return count;
}

/**
 * Map of metric id -> selection weight for metrics still under `minSamples` in an area. Enforced
 * shortfalls are weighted higher than tracked-inert ones so selection fills the score-blocking
 * gaps first while still rewarding coverage variety.
 *
 * Derived metrics are omitted: no type declares them, so they cannot steer the type choice. They
 * still register as area neediness via `enforcedShortfallCount`, which biases which AREA is served.
 */
export function underCoveredWeights(area: Area, state: SessionState): Map<string, number> {
  const areaState = state.areas[area];
  const weights = new Map<string, number>();
  for (const m of state.config.coreMetrics) {
    if (metricKind(m) === 'derived') continue;
    if (!scopeAppliesToArea(m.scope, area)) continue;

    const covered =
      metricAdequacyScope(m) === 'session'
        ? metricSamplesInSession(m, state) >= m.minSamples
        : metricCount(areaState, m.id) >= m.minSamples;
    if (!covered) weights.set(m.id, m.enforced ? ENFORCED_METRIC_WEIGHT : TRACKED_METRIC_WEIGHT);
  }
  return weights;
}

/** Does this type still have at least one unseen item for the given area? */
export function typeHasUnseenItem(type: QuestionType, state: SessionState, banks: Banks): boolean {
  const seen = state.areas[type.domain].itemsSeen;
  return banks.items.some((it) => it.typeCode === type.typeCode && !seen.has(it.itemId));
}

/** Registered types (with unseen items) grouped by area. */
export function availableTypesByArea(
  state: SessionState,
  banks: Banks,
): Map<Area, QuestionType[]> {
  const byArea = new Map<Area, QuestionType[]>();
  for (const type of banks.types) {
    if (!typeHasUnseenItem(type, state, banks)) continue;
    const list = byArea.get(type.domain);
    if (list) list.push(type);
    else byArea.set(type.domain, [type]);
  }
  return byArea;
}

// ---------------------------------------------------------------------------
// supply audit
// ---------------------------------------------------------------------------

/** One enforced observed metric's supply position in one area. */
export interface MetricSupply {
  metricId: string;
  area: Area;
  /** Wired types in this area that declare the metric. */
  supplierCount: number;
  supplierTypeCodes: string[];
  /** No wired type declares it: the area can never satisfy the stop rule. */
  unsatisfiable: boolean;
  /** Exactly one wired type declares it: losing that bank stalls the battery. */
  soleSource: boolean;
}

/**
 * Audit which enforced core metrics the wired banks can actually supply.
 *
 * This is the check whose absence let an unsatisfiable stop rule ship: the registry declared
 * metrics as enforced without anything verifying that a real type emits them. Only `observed`
 * metrics appear here — a `derived` metric is computed from the trace and has no type supplier
 * by construction.
 */
export function auditMetricSupply(banks: Banks, config: EngineConfig): MetricSupply[] {
  const out: MetricSupply[] = [];
  for (const area of AREAS) {
    const areaTypes = banks.types.filter((t) => t.domain === area);
    const metrics = [...enforcedMetricsForArea(area, config), ...enforcedSessionMetrics(config)];
    for (const metric of metrics) {
      if (metricKind(metric) === 'derived') continue;
      const suppliers = areaTypes.filter((t) => t.metrics.includes(metric.id));
      out.push({
        metricId: metric.id,
        area,
        supplierCount: suppliers.length,
        supplierTypeCodes: suppliers.map((t) => t.typeCode).sort(),
        // A session-scope metric only needs suppliers SOMEWHERE, so a barren area is not fatal.
        unsatisfiable: suppliers.length === 0 && metricAdequacyScope(metric) === 'per_area',
        soleSource: suppliers.length === 1,
      });
    }
  }
  return out;
}
