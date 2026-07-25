import { ENFORCED_METRIC_WEIGHT, TRACKED_METRIC_WEIGHT } from './config';
import type {
  Area,
  AreaState,
  Banks,
  CoreMetricSpec,
  EngineConfig,
  MetricScope,
  QuestionType,
  SessionState,
} from './types';

/** Whether a metric with the given scope is collectable in (and therefore relevant to) an area. */
export function scopeAppliesToArea(scope: MetricScope, area: Area): boolean {
  if (scope === 'all') return true;
  if (scope === 'interactive' || scope === 'open_ended') return true; // type-shaped, allow any area
  return scope === area;
}

/** Enforced core metrics that apply to a given area (these gate the stop rule). */
export function enforcedMetricsForArea(area: Area, config: EngineConfig): CoreMetricSpec[] {
  return config.coreMetrics.filter(
    (m) => m.enforced && (m.scope === 'all' || m.scope === area),
  );
}

/** Sample count for a metric in an area (0 when never collected). */
export function metricCount(areaState: AreaState, metricId: string): number {
  return areaState.metricCounts[metricId] ?? 0;
}

/** Number of enforced metrics still short of `minSamples` in an area (area "neediness"). */
export function enforcedShortfallCount(area: Area, state: SessionState): number {
  const areaState = state.areas[area];
  let count = 0;
  for (const m of enforcedMetricsForArea(area, state.config)) {
    if (metricCount(areaState, m.id) < m.minSamples) count += 1;
  }
  return count;
}

/**
 * Map of metric id -> selection weight for metrics still under `minSamples` in an area. Enforced
 * shortfalls are weighted higher than tracked-inert ones so selection fills the score-blocking
 * gaps first while still rewarding coverage variety.
 */
export function underCoveredWeights(area: Area, state: SessionState): Map<string, number> {
  const areaState = state.areas[area];
  const weights = new Map<string, number>();
  for (const m of state.config.coreMetrics) {
    if (!scopeAppliesToArea(m.scope, area)) continue;
    if (metricCount(areaState, m.id) < m.minSamples) {
      weights.set(m.id, m.enforced ? ENFORCED_METRIC_WEIGHT : TRACKED_METRIC_WEIGHT);
    }
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
