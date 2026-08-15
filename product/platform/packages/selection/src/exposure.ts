/**
 * Exposure control.
 *
 * Two reasons this exists, and the second is the one that compounds. The obvious one is item
 * security: an item that appears in most sessions leaks. The one that matters more over time is
 * calibration — an item served three times can never acquire enough responses to estimate its
 * parameters from data, so an engine that always picks the same few items guarantees its own
 * difficulties stay assumptions forever.
 */

export interface ExposureSnapshot {
  /** Sessions this app has started. The denominator. */
  readonly sessionCount: number;
  /** Times each item has been served, for this app. */
  readonly servedCounts: ReadonlyMap<string, number>;
}

export const EMPTY_EXPOSURE: ExposureSnapshot = {
  sessionCount: 0,
  servedCounts: new Map(),
};

export function exposureRate(itemId: string, exposure: ExposureSnapshot | null): number {
  if (!exposure || exposure.sessionCount <= 0) return 0;
  return (exposure.servedCounts.get(itemId) ?? 0) / exposure.sessionCount;
}

/**
 * A multiplier in (0, 1] that pulls over-exposed items back toward the target.
 *
 * Damping rather than banning: an over-exposed item still gets served when it is genuinely the most
 * informative thing available. A hard ban would let a thin bank run out of eligible items and end
 * sessions early, which is a worse failure than an item appearing slightly too often.
 *
 * The exponent is why this is not simply `target / observed`. Proportional damping halves the score
 * of an item running at twice its target, and measurement showed that is not nearly enough: because
 * information peaks sharply around the threshold, a handful of items stay the best choice even at
 * half weight, and observed maximum exposure settled at 0.425 against a 0.20 target. Raising the
 * ratio to a power turns a soft preference into an effective ceiling. The exponent is configurable
 * because it trades exposure spread against measurement efficiency, and the default was measured
 * rather than chosen.
 */
export function exposureDamping(
  itemId: string,
  exposure: ExposureSnapshot | null,
  target: number,
  exponent = 1,
): number {
  if (target <= 0) return 1;
  const observed = exposureRate(itemId, exposure);
  if (observed <= target) return 1;
  return Math.pow(target / observed, Math.max(1, exponent));
}
