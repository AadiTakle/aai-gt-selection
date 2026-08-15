/**
 * Adequacy conditions for DERIVED core metrics.
 *
 * `M-RTVAR` (response-time variance), `M-CONSIST` (cross-item consistency), `M-LEARNRATE`
 * (within-session growth) and `M-ROTSLOPE` (mental-rotation RT slope) are session-level
 * aggregates: each is a statistic OVER a series of items, so no single item can carry a value
 * for it and no correct renderer will ever emit one. `M-DIFFREACH` is the same shape — it is the
 * maximum difficulty solved, an extremum over the trace, and the server only attaches it on a
 * correct answer, so a struggling child would never accumulate emissions of it.
 *
 * Counting emissions of these metrics therefore cannot work. Instead the engine derives them
 * from the per-area trace, and "adequate data" means the derivation has enough INPUTS: enough
 * response times, enough matched pairs, enough trials, enough distinct angles.
 *
 * This module only answers "is there enough to fit?"; `@gt-selection/exam-scoring` fits the
 * values themselves. Everything here is a pure function of `ItemObservation[]`, which is
 * rebuilt by replaying stored `ScoredItem`s through `update` — so adequacy is reproducible from
 * a stored trace (BUILD_PLAN §5).
 */
import type { CoreMetricSpec, EngineConfig, ItemObservation, MetricId } from './types';

/** Core metrics the engine derives from the trace rather than counting as per-item emissions. */
export const DERIVED_METRIC_IDS: ReadonlySet<MetricId> = new Set([
  'M-DIFFREACH',
  'M-RTVAR',
  'M-CONSIST',
  'M-LEARNRATE',
  'M-ROTSLOPE',
]);

/** Response times available in a trace (items whose renderer reported `M-RT`). */
export function responseTimes(trace: readonly ItemObservation[]): number[] {
  const out: number[] = [];
  for (const o of trace) if (o.rtMs !== null) out.push(o.rtMs);
  return out;
}

/**
 * Number of matched parallel pairs in a trace: items sorted by difficulty and greedily paired
 * while within `tolerance` scale points of each other, each item used at most once. Adaptive
 * selection converges an area onto the child's ability, so near-equal-difficulty items — the
 * operational definition of a parallel form here — accumulate naturally.
 */
export function matchedPairCount(trace: readonly ItemObservation[], tolerance: number): number {
  const sorted = [...trace].sort((a, b) =>
    a.difficulty !== b.difficulty ? a.difficulty - b.difficulty : a.itemId < b.itemId ? -1 : 1,
  );
  let pairs = 0;
  for (let i = 0; i + 1 < sorted.length;) {
    const gap =
      (sorted[i + 1] as ItemObservation).difficulty - (sorted[i] as ItemObservation).difficulty;
    if (gap <= tolerance) {
      pairs += 1;
      i += 2;
    } else {
      i += 1;
    }
  }
  return pairs;
}

/** Correct trials that carry an angular disparity (the usable inputs to an `M-ROTSLOPE` fit). */
export function rotationTrials(trace: readonly ItemObservation[]): ItemObservation[] {
  return trace.filter((o) => o.correct && o.angularDisparityDeg !== null && o.rtMs !== null);
}

/** Distinct angular disparities among the usable rotation trials. */
export function distinctDisparities(trace: readonly ItemObservation[]): number {
  return new Set(rotationTrials(trace).map((o) => o.angularDisparityDeg)).size;
}

/**
 * Whether a derived metric has enough inputs in `trace` to be fitted.
 *
 * - `M-DIFFREACH`: the ceiling is read off the trace (hardest correct item), and its precision is
 *   set by how many escalation steps were taken, so adequacy is `minSamples` scored items.
 * - `M-RTVAR`: `minSamples` response times — a variance needs a series, not a sample count of
 *   the variance itself.
 * - `M-CONSIST`: `minSamples` matched parallel pairs.
 * - `M-LEARNRATE`: `minSamples` scored items, so a growth slope over the escalation sequence is
 *   estimable.
 * - `M-ROTSLOPE`: `minSamples` correct disparity-bearing trials spanning at least
 *   `rotationMinDistinctDisparities` distinct angles.
 *
 * Returns `false` for an unrecognised id: a metric marked `derived` with no rule here must never
 * be treated as satisfied by default.
 */
export function derivedMetricAdequate(
  spec: CoreMetricSpec,
  trace: readonly ItemObservation[],
  config: EngineConfig,
): boolean {
  switch (spec.id) {
    case 'M-DIFFREACH':
    case 'M-LEARNRATE':
      return trace.length >= spec.minSamples;
    case 'M-RTVAR':
      return responseTimes(trace).length >= spec.minSamples;
    case 'M-CONSIST':
      return matchedPairCount(trace, config.consistencyPairTolerance) >= spec.minSamples;
    case 'M-ROTSLOPE':
      return (
        rotationTrials(trace).length >= spec.minSamples &&
        distinctDisparities(trace) >= config.rotationMinDistinctDisparities
      );
    default:
      return false;
  }
}

/**
 * How many inputs a derived metric currently has, in the unit its `minSamples` counts. Used for
 * diagnostics and for the "area neediness" signal that biases selection.
 */
export function derivedInputCount(
  spec: CoreMetricSpec,
  trace: readonly ItemObservation[],
  config: EngineConfig,
): number {
  switch (spec.id) {
    case 'M-DIFFREACH':
    case 'M-LEARNRATE':
      return trace.length;
    case 'M-RTVAR':
      return responseTimes(trace).length;
    case 'M-CONSIST':
      return matchedPairCount(trace, config.consistencyPairTolerance);
    case 'M-ROTSLOPE':
      return rotationTrials(trace).length;
    default:
      return 0;
  }
}
