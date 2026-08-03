/**
 * How far through the battery a child is — for the progress bar, and nothing else.
 *
 * Phase 1 has no fixed length. It ends when the stop rule in `@gt-selection/exam-engine` is
 * satisfied (`done.ts`): coverage even across areas, every enforced metric adequate, every area's
 * estimate settled, and the evidence spanning more than one question type. So "question 12 of 40"
 * is not a fact anyone can state up front, and a bar drawn as a fixed number of segments is
 * quietly claiming one.
 *
 * What CAN be stated is the shortest run still consistent with the rules — how many more items
 * each unmet condition needs at minimum. That is what this projects, and why the bar moves
 * unevenly on purpose: as an area settles, its outstanding requirement disappears and the estimate
 * drops, so the bar takes a larger step. When a child's answers unsettle an estimate the
 * requirement comes back, the estimate grows, and the step is smaller. The motion is the
 * information.
 *
 * This is a floor, not a prediction. Stability also requires the recent estimates to stop moving,
 * which no amount of counting can foresee, so a real session usually runs longer than the
 * projection — the bar therefore eases toward the end rather than arriving at it early.
 */
import type { Area, SessionState } from '@gt-selection/exam-engine';

const AREA_LIST: readonly Area[] = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];

export interface BatteryProgress {
  /** Items answered so far. */
  readonly done: number;
  /** Shortest total still consistent with the stop rule, never below `done`. */
  readonly estimatedTotal: number;
  /** `done / estimatedTotal`, clamped to [0, 1]. */
  readonly fraction: number;
}

/**
 * Items this area must still see before it could possibly satisfy the stop rule.
 *
 * Each clause mirrors one condition in `done.ts`, and the area's requirement is the largest of
 * them, because they are checked together rather than in sequence.
 */
function outstandingInArea(area: Area, state: SessionState): number {
  const areaState = state.areas[area];
  const seen = areaState.itemsSeen.size;

  // coverageIsEven: every area needs `minItemsPerArea`.
  const forCoverage = Math.max(0, state.config.minItemsPerArea - seen);

  // areaEstimateStable: the stability window needs that many estimates before it can even be read.
  const forStability = Math.max(0, state.config.stabilityWindow - areaState.estWindow.length);

  // areaBreadthCovered: at best one further item per type still missing.
  const typesSeen = new Set(areaState.trace.map((observation) => observation.typeCode));
  const forBreadth = Math.max(0, state.config.minTypesPerArea - typesSeen.size);

  return Math.max(forCoverage, forStability, forBreadth);
}

/**
 * Progress through Phase 1.
 *
 * The projection is the current count plus the sum of what every area still owes, floored at the
 * coverage minimum and capped by the engine's own safety cap — a bar that promised a total beyond
 * `hardItemCap` would be promising a session that cannot happen.
 */
export function stage1Progress(state: SessionState | null, answered: number): BatteryProgress {
  if (!state) {
    const floor = Math.max(answered, 1);
    return { done: answered, estimatedTotal: floor, fraction: answered === 0 ? 0 : 1 };
  }

  const outstanding = AREA_LIST.reduce((sum, area) => sum + outstandingInArea(area, state), 0);
  const floor = state.config.minItemsPerArea * AREA_LIST.length;
  const estimatedTotal = Math.min(
    state.config.hardItemCap,
    Math.max(answered + outstanding, floor, answered + (outstanding === 0 ? 1 : 0)),
  );

  return {
    done: answered,
    estimatedTotal,
    fraction: estimatedTotal <= 0 ? 0 : Math.max(0, Math.min(1, answered / estimatedTotal)),
  };
}

/**
 * Progress through the WHOLE of Phase 2, not the activity on screen.
 *
 * Phase 2 is several fixed-length activities, so unlike Phase 1 its total is known exactly once
 * the queue is chosen. One continuous bar across all of them is the honest picture: four separate
 * bars would each fill and reset, reading as four finishes rather than one.
 */
export function stage2Progress(
  activityLengths: readonly number[],
  completedActivities: number,
  trialsInCurrent: number,
): BatteryProgress {
  const estimatedTotal = activityLengths.reduce((sum, n) => sum + n, 0);
  const done =
    activityLengths.slice(0, completedActivities).reduce((sum, n) => sum + n, 0) + trialsInCurrent;
  return {
    done,
    estimatedTotal,
    fraction: estimatedTotal <= 0 ? 0 : Math.max(0, Math.min(1, done / estimatedTotal)),
  };
}
