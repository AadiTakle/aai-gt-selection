/**
 * THE ANTI-REPEAT MACHINERY. Small, pure, and the only file in this directory with a unit test, because
 * it is the only one whose promise can be checked without a sound card.
 *
 * A squelch fires every time a slime is caught or lands, which in a five-minute sitting is dozens of
 * times. The single fastest way to make a pleasant sound irritating is to play the identical waveform
 * twice in a row: the ear stops hearing "a slime" and starts hearing "the sample". So every one-shot in
 * `voices.ts` is drawn from a handful of TIMBRE VARIANTS by `createChooser`, which cannot return the
 * same variant twice consecutively, and then jittered continuously on top by `jitter` so that even two
 * firings of the same variant differ.
 *
 * Randomness is injectable everywhere (`Rand`) rather than reaching for `Math.random` internally. That
 * is what lets `measure.ts` render the same sound twice and get the same numbers, which is the whole
 * basis of the offline verification: a measurement that moves on its own cannot catch a regression.
 */

/** A source of numbers in [0, 1). `Math.random` satisfies this; so does `seededRand`. */
export type Rand = () => number;

/**
 * mulberry32. Chosen because it is eight lines, has no state to manage, and is good enough for choosing
 * between three filter settings — this is dice for a slime noise, not a simulation.
 */
export function seededRand(seed: number): Rand {
  let a = (Math.floor(seed) | 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A draw from `count` variants that is NEVER the one drawn last.
 *
 * Done by construction rather than by rejection: the draw is over the `count - 1` variants that are not
 * the previous one, and the result is shifted past it. A retry loop would have been two lines shorter
 * and would have had a worst case, which is not a thing to put on the path of a mouse click.
 *
 * `count <= 1` degenerates to a constant 0. With one variant there is nothing to alternate between, so
 * the no-repeat promise is vacuous rather than broken — and it must not spin looking for another option.
 */
export function createChooser(count: number, rand: Rand = Math.random): () => number {
  // Anything that is not a whole number above one collapses to a single variant, NaN included —
  // `Math.max(1, Math.floor(NaN))` is NaN, which sails past every comparison below and produced an index
  // of 1 out of a set of one. Sanitised here, once, rather than defended against downstream.
  const floored = Math.floor(count);
  const n = Number.isFinite(floored) && floored > 1 ? floored : 1;
  let last = -1;
  return () => {
    if (n === 1) return 0;
    // The first draw may land anywhere; later draws pick among the others.
    const slots = last < 0 ? n : n - 1;
    let i = Math.floor(rand() * slots);
    // A `rand` that returns exactly 1, or NaN, must not produce an out-of-range variant. Cheap to
    // clamp, and the alternative is an `undefined` spec object reaching a filter frequency.
    if (!Number.isFinite(i) || i < 0) i = 0;
    if (i >= slots) i = slots - 1;
    if (last >= 0 && i >= last) i += 1;
    last = i;
    return i;
  };
}

/** A multiplier around 1, e.g. `jitter(rand, 0.04)` is 0.96..1.04. For nudging a frequency per firing. */
export function jitter(rand: Rand, spread: number): number {
  const s = Number.isFinite(spread) ? Math.abs(spread) : 0;
  return 1 + (rand() * 2 - 1) * s;
}

/** A number in [lo, hi). For gaps between pad notes and other "somewhere in this range" choices. */
export function between(rand: Rand, lo: number, hi: number): number {
  return lo + rand() * (hi - lo);
}

/** One of `items`. Never returns undefined for a non-empty array, which `noUncheckedIndexedAccess` cares about. */
export function pick<T>(items: readonly T[], rand: Rand): T {
  if (items.length === 0) throw new Error('pick from empty list');
  const i = Math.min(items.length - 1, Math.max(0, Math.floor(rand() * items.length)));
  return items[i] as T;
}
