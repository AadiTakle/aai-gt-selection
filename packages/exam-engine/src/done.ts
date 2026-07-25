import { enforcedMetricsForArea, metricCount } from './coverage';
import { lastN, mean, sd } from './stats';
import { AREAS, type Area, type SessionState } from './types';

/** Every enforced core metric applicable to the area has met its `minSamples`. */
export function areaMetricsCovered(area: Area, state: SessionState): boolean {
  const areaState = state.areas[area];
  return enforcedMetricsForArea(area, state.config).every(
    (m) => metricCount(areaState, m.id) >= m.minSamples,
  );
}

/**
 * The area's difficulty estimate has settled: enough recent estimates, low window SD (no wild
 * swings), and low drift between the older and recent halves (not still trending toward ability).
 */
export function areaEstimateStable(area: Area, state: SessionState): boolean {
  const { stabilityWindow, stabilitySd, stabilityDrift } = state.config;
  const estWindow = state.areas[area].estWindow;
  if (estWindow.length < stabilityWindow) return false;

  const window = lastN(estWindow, stabilityWindow);
  if (sd(window) > stabilitySd) return false;

  const half = Math.floor(window.length / 2);
  const older = window.slice(0, half);
  const recent = window.slice(window.length - half);
  const drift = Math.abs(mean(recent) - mean(older));
  return drift <= stabilityDrift;
}

/** Items-seen counts are within tolerance across areas and every area has the minimum. */
export function coverageIsEven(state: SessionState): boolean {
  const counts = AREAS.map((a) => state.areas[a].itemsSeen.size);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return min >= state.config.minItemsPerArea && max - min <= state.config.evenSpreadTolerance;
}

/**
 * The stop rule (BUILD_PLAN §3). `true` when there is adequate data to conclude a score:
 * every enforced core metric has `≥ minSamples` in each applicable area, area coverage is even,
 * and each area's estimate is stable. A hard item cap is the safety stop.
 */
export function isDone(state: SessionState): boolean {
  if (state.itemsServed >= state.config.hardItemCap) return true;

  if (!coverageIsEven(state)) return false;
  for (const area of AREAS) {
    if (!areaMetricsCovered(area, state)) return false;
    if (!areaEstimateStable(area, state)) return false;
  }
  return true;
}
