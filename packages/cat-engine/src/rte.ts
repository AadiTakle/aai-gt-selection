/**
 * Response-Time-Effort (RTE) rapid-guess filter (M-RAPIDGUESS).
 *
 * Operationalizes the framework SPOV that "speed is evidence only under active
 * engagement" (METRIC_FRAMEWORK.md §3): a response below a per-item
 * solution-behavior RT floor is a non-effortful rapid guess and must be
 * excluded from theta and from any speed credit (effort-moderated IRT; Wise &
 * Kong, 2005). Pure functions; no I/O.
 */

/** A response is a rapid guess when its RT is at or below the item's floor. */
export function isRapidGuess(rtMs: number, thresholdMs: number): boolean {
  return rtMs <= thresholdMs;
}

/** Effort-valid = engaged (on-task) AND not a rapid guess. Gates theta + speed. */
export function isEffortValid(rtMs: number, thresholdMs: number, onTask: boolean): boolean {
  return onTask && !isRapidGuess(rtMs, thresholdMs);
}

/**
 * Response-time-effort index (RTE): the proportion of effort-valid responses.
 * Returns `null` when there are no responses.
 */
export function responseTimeEffort(items: readonly { effortValid: boolean }[]): number | null {
  if (items.length === 0) return null;
  const valid = items.reduce((n, r) => n + (r.effortValid ? 1 : 0), 0);
  return valid / items.length;
}

/** Keep only effort-valid items (drop rapid guesses + off-task responses). */
export function filterEffortful<T extends { effortValid: boolean }>(items: readonly T[]): T[] {
  return items.filter((r) => r.effortValid);
}

/** Options for the normative-threshold estimator. */
export interface NormativeThresholdOptions {
  /** Fraction of the mean RT used as the floor (default 0.1 => "NT10"). */
  fraction?: number;
  /** Hard lower bound in ms (default 300). */
  floorMs?: number;
  /** Hard upper bound in ms (default 10000). */
  capMs?: number;
}

/**
 * Normative-threshold (NT) estimator: a fraction of the mean RT, clamped to
 * `[floorMs, capMs]`. Deterministic; use to derive a per-item
 * `rapidGuessThresholdMs` from a calibration RT sample when none is pinned.
 */
export function normativeThreshold(
  rts: readonly number[],
  options: NormativeThresholdOptions = {},
): number {
  const { fraction = 0.1, floorMs = 300, capMs = 10000 } = options;
  const clean = rts.filter((r) => r > 0);
  if (clean.length === 0) return floorMs;
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  return Math.max(floorMs, Math.min(capMs, mean * fraction));
}
