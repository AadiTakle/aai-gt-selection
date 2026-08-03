import {
  distinctTypesInArea,
  enforcedMetricsForArea,
  metricAdequateInArea,
  sessionMetricsCovered,
} from './coverage';
import { lastN, mean, sd } from './stats';
import { AREAS, type Area, type Banks, type SessionState } from './types';

/**
 * Every enforced core metric that gates this AREA has adequate data: enough emissions for an
 * `observed` metric, enough derivation inputs for a `derived` one. Session-scope metrics (the
 * per-child response-time family) are checked once by `sessionMetricsCovered`, not per area.
 */
export function areaMetricsCovered(area: Area, state: SessionState): boolean {
  const areaState = state.areas[area];
  return enforcedMetricsForArea(area, state.config).every((m) =>
    metricAdequateInArea(m, areaState, state.config),
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

/**
 * The area's estimate rests on at least `minTypesPerArea` different question types.
 *
 * Item counts and metric counts say how MUCH evidence an area has; this says how narrow it is. A
 * verbal estimate built from six Fill-the-Gap items is an estimate of sentence-completion, and
 * reporting it as verbal reasoning would overstate what was measured. Before bursting, selection
 * rotated types every item and this was true by accident; a burst can hand a whole area to one type,
 * so it is now stated.
 *
 * `auditTypeBreadth` re-derives satisfiability from the live banks, because an area with fewer wired
 * types than the minimum could never satisfy this and would pin the battery to the safety cap.
 */
export function areaBreadthCovered(area: Area, state: SessionState): boolean {
  return distinctTypesInArea(state.areas[area]) >= state.config.minTypesPerArea;
}

/** Areas whose wired type count cannot reach `minTypesPerArea`, and would therefore never finish. */
export function auditTypeBreadth(banks: Banks, minTypesPerArea: number): Area[] {
  return AREAS.filter(
    (area) => banks.types.filter((t) => t.domain === area).length < minTypesPerArea,
  );
}

/** Items-seen counts are within tolerance across areas and every area has the minimum. */
export function coverageIsEven(state: SessionState): boolean {
  const counts = AREAS.map((a) => state.areas[a].itemsSeen.size);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return min >= state.config.minItemsPerArea && max - min <= state.config.evenSpreadTolerance;
}

/**
 * The stop rule (BUILD_PLAN §3). `true` when there is adequate data to conclude a score: area
 * coverage is even, every enforced per-child metric has met its session-wide minimum, and in
 * every area each enforced core metric has adequate data, the estimate has settled, and the
 * evidence spans more than one question type.
 *
 * The hard item cap is a safety net for a runaway session, NOT the normal exit. If a session
 * routinely ends on the cap the battery has silently become fixed-length and the stop rule is
 * unsatisfiable — see `real-bank.test.ts`, which asserts against exactly that.
 */
export function isDone(state: SessionState): boolean {
  if (state.itemsServed >= state.config.hardItemCap) return true;

  if (!coverageIsEven(state)) return false;
  if (!sessionMetricsCovered(state)) return false;
  for (const area of AREAS) {
    if (!areaMetricsCovered(area, state)) return false;
    if (!areaEstimateStable(area, state)) return false;
    if (!areaBreadthCovered(area, state)) return false;
  }
  return true;
}
