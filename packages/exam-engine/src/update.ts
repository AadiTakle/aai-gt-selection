import { DIFFICULTY_MAX, DIFFICULTY_MIN, DIFFICULTY_RANGE } from './config';
import { DERIVED_METRIC_IDS } from './derived';
import { clamp, pushWindow } from './stats';
import type { Area, AreaState, ItemObservation, ScoredItem, SessionState } from './types';

/**
 * Direction reversals in an area's trace: positions where a correct answer follows a wrong one or
 * vice versa. Each update's direction is its correctness, so a reversal is the moment the estimate
 * stops travelling and starts straddling the child's ability — the evidence that the region has
 * been found. Derived from the stored trace rather than from a live counter, so replaying a trace
 * reproduces the schedule exactly. Exported for unit testing.
 */
export function directionReversals(trace: readonly ItemObservation[]): number {
  let reversals = 0;
  for (let i = 1; i < trace.length; i++) {
    const previous = trace[i - 1] as ItemObservation;
    const current = trace[i] as ItemObservation;
    if (current.correct !== previous.correct) reversals += 1;
  }
  return reversals;
}

/**
 * Step magnitude for an area that has accumulated `reversals` direction reversals.
 *
 * A fixed step cannot serve both jobs an adaptive estimate has: it must travel far enough to find
 * a child whose ability sits nowhere near their grade-band seed, and then move finely enough to
 * settle on it. Because item selection targets the CURRENT estimate, a child is always served
 * items matched to where the engine already believes they are, so no evidence term ("surprise")
 * can rescue a step that is too small — the estimate simply crawls at the floor.
 *
 * The schedule is therefore a decaying gain in the Robbins-Monro sense, indexed by reversals
 * rather than by item count (Kesten's accelerated variant; the same rule as a Levitt staircase,
 * which shortens its step at each reversal). While responses stay one-sided the estimate is still
 * travelling and keeps the full `initialStep`; once responses start alternating the region has
 * been bracketed and the step decays as `1 / m^stepDecayExponent` toward `minUpdate`. Keeping the
 * asymptote strictly positive preserves the ability to travel again later, and makes the tail of
 * the scale finer than a fixed floor would.
 *
 * Pure and deterministic: a function of the config and a count taken off the stored trace.
 */
export function stepSize(reversals: number, config: SessionState['config']): number {
  const { minUpdate, maxUpdate, initialStep, stepDecayExponent, stepBurnInReversals } = config;
  const decaying = Math.max(0, reversals - Math.max(0, stepBurnInReversals));
  const decay = 1 / Math.pow(1 + decaying, stepDecayExponent);
  return clamp(minUpdate + (initialStep - minUpdate) * decay, minUpdate, maxUpdate);
}

/** Whether this response flips the direction of the area's most recent update. */
function reversesDirection(trace: readonly ItemObservation[], correct: boolean): boolean {
  const last = trace[trace.length - 1];
  return last !== undefined && last.correct !== correct;
}

/**
 * Compute the signed difficulty delta for a scored item.
 *
 * Direction is correctness (right → up, wrong → down). Magnitude is the area's scheduled step
 * (see {@link stepSize}) amplified by "surprise": getting a harder-than-estimate item right, or an
 * easier-than-estimate item wrong, moves the estimate more. A `M-ERRTYPE` near-miss softens a
 * wrong step back toward the floor (a systematic near-miss is weaker evidence of inability than a
 * random miss). The result always lands in `[minUpdate, maxUpdate]`.
 *
 * The reversal count includes THIS response, so the step shrinks at the reversal that produces it
 * rather than one item later. Exported for unit testing.
 */
export function difficultyDelta(
  area: Pick<AreaState, 'difficulty' | 'trace'>,
  scored: Pick<ScoredItem, 'score' | 'difficulty' | 'metrics'>,
  config: SessionState['config'],
): number {
  const { minUpdate, maxUpdate, nearMissSoften, surpriseGain } = config;
  const correct = scored.score >= 0.5;
  const nearMiss = clamp(scored.metrics['M-ERRTYPE'] ?? 0, 0, 1);

  const reversals =
    directionReversals(area.trace) + (reversesDirection(area.trace, correct) ? 1 : 0);
  const step = stepSize(reversals, config);

  const surprise = correct
    ? clamp((scored.difficulty - area.difficulty) / DIFFICULTY_RANGE, 0, 1)
    : clamp((area.difficulty - scored.difficulty) / DIFFICULTY_RANGE, 0, 1);
  const raw = step * (1 + surpriseGain * surprise);

  if (correct) return +clamp(raw, minUpdate, maxUpdate);

  // Soften only the portion of the step above the floor, so magnitude stays in [minUpdate, maxUpdate].
  const softened = minUpdate + (raw - minUpdate) * (1 - nearMissSoften * nearMiss);
  return -clamp(softened, minUpdate, maxUpdate);
}

function finiteOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Reduce a scored item to the fields every derived aggregate needs. */
export function toObservation(scored: ScoredItem): ItemObservation {
  return {
    itemId: scored.itemId,
    typeCode: scored.typeCode,
    difficulty: scored.difficulty,
    score: clamp(scored.score, 0, 1),
    correct: scored.correct,
    rtMs: finiteOrNull(scored.metrics['M-RT']),
    angularDisparityDeg: finiteOrNull(scored.stimulus?.angularDisparityDeg),
    stage: scored.stage ?? 'standing',
  };
}

function nextAreaState(prev: AreaState, scored: ScoredItem, config: SessionState['config']): AreaState {
  const delta = difficultyDelta(prev, scored, config);
  const difficulty = clamp(prev.difficulty + delta, DIFFICULTY_MIN, DIFFICULTY_MAX);

  const metricCounts: Record<string, number> = { ...prev.metricCounts };
  for (const metricId of Object.keys(scored.metrics)) {
    // A derived metric's coverage comes from the trace, never from an emission. Counting a stray
    // emission would let one item stand in for a whole series and re-open the coverage gap.
    if (DERIVED_METRIC_IDS.has(metricId)) continue;
    metricCounts[metricId] = (metricCounts[metricId] ?? 0) + 1;
  }

  const itemsSeen = new Set(prev.itemsSeen);
  itemsSeen.add(scored.itemId);

  return {
    area: prev.area,
    difficulty,
    itemsSeen,
    accWindow: pushWindow(prev.accWindow, clamp(scored.score, 0, 1), config.accWindowSize),
    estWindow: pushWindow(prev.estWindow, difficulty, config.estWindowSize),
    metricCounts,
    trace: [...prev.trace, toObservation(scored)],
  };
}

/**
 * Apply a server-scored item to the session state: move the item's area difficulty by
 * `direction × magnitude` (clamped to 1..20), record the item as seen, and update the accuracy /
 * estimate windows and metric counts. Pure — returns a new `SessionState`.
 */
export function update(state: SessionState, scored: ScoredItem): SessionState {
  const area: Area = scored.domain;
  const updatedArea = nextAreaState(state.areas[area], scored, state.config);

  return {
    ...state,
    areas: { ...state.areas, [area]: updatedArea },
    itemsServed: state.itemsServed + 1,
    rngState: (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0,
  };
}
