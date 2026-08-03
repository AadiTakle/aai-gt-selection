/** Small pure numeric helpers used by the engine. */

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

/** Population variance. */
export function variance(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  let sum = 0;
  for (const x of xs) sum += (x - m) ** 2;
  return sum / xs.length;
}

/** Population standard deviation. */
export function sd(xs: readonly number[]): number {
  return Math.sqrt(variance(xs));
}

/** Standard error of the mean. */
export function standardError(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return sd(xs) / Math.sqrt(xs.length);
}

/** Push a value onto a window, keeping only the last `size` entries. Returns a new array. */
export function pushWindow(window: readonly number[], value: number, size: number): number[] {
  const next = [...window, value];
  return next.length > size ? next.slice(next.length - size) : next;
}

/** Last `n` entries of an array (or all of them if shorter). */
export function lastN(xs: readonly number[], n: number): number[] {
  return n >= xs.length ? [...xs] : xs.slice(xs.length - n);
}
