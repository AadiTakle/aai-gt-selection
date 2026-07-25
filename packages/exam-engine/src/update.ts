import { DIFFICULTY_MAX, DIFFICULTY_MIN, DIFFICULTY_RANGE } from './config';
import { clamp, pushWindow } from './stats';
import type { Area, AreaState, ScoredItem, SessionState } from './types';

/**
 * Compute the signed difficulty delta for a scored item.
 *
 * Direction is correctness (right → up, wrong → down). Magnitude is gradual and lives in
 * `[minUpdate, maxUpdate]`, scaled by "surprise": getting a harder-than-estimate item right, or an
 * easier-than-estimate item wrong, moves the estimate more. A `M-ERRTYPE` near-miss softens a wrong
 * step back toward the floor (a systematic near-miss is weaker evidence of inability than a random
 * miss). Exported for unit testing.
 */
export function difficultyDelta(
  estimate: number,
  scored: Pick<ScoredItem, 'score' | 'difficulty' | 'metrics'>,
  config: SessionState['config'],
): number {
  const { minUpdate, maxUpdate, nearMissSoften } = config;
  const span = maxUpdate - minUpdate;
  const correct = scored.score >= 0.5;
  const nearMiss = clamp(scored.metrics['M-ERRTYPE'] ?? 0, 0, 1);

  if (correct) {
    const surprise = clamp((scored.difficulty - estimate) / DIFFICULTY_RANGE, 0, 1);
    const magnitude = minUpdate + span * surprise;
    return +magnitude;
  }

  const surprise = clamp((estimate - scored.difficulty) / DIFFICULTY_RANGE, 0, 1);
  const raw = minUpdate + span * surprise;
  // Soften only the portion of the step above the gradual floor, so magnitude stays in [minUpdate, maxUpdate].
  const magnitude = minUpdate + (raw - minUpdate) * (1 - nearMissSoften * nearMiss);
  return -magnitude;
}

function nextAreaState(prev: AreaState, scored: ScoredItem, config: SessionState['config']): AreaState {
  const delta = difficultyDelta(prev.difficulty, scored, config);
  const difficulty = clamp(prev.difficulty + delta, DIFFICULTY_MIN, DIFFICULTY_MAX);

  const metricCounts: Record<string, number> = { ...prev.metricCounts };
  for (const metricId of Object.keys(scored.metrics)) {
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
