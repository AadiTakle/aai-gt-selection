/**
 * Deterministic, seedable randomness helpers.
 *
 * The engine's selection tie-breaks are resolved with `hashUnit` — a pure function of a seed and
 * a string key — so no mutable RNG state has to be threaded through the read-only selection
 * functions while staying fully reproducible. `mulberry32` is exported for callers that want a
 * conventional streaming PRNG.
 */

/** A classic 32-bit seedable PRNG. Returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pure hash of (seed, key) to a float in [0, 1). Stable across runs and platforms. */
export function hashUnit(seed: number, key: string): number {
  let h = (seed >>> 0) ^ 0x9e3779b9;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 2654435761);
    h ^= h >>> 15;
  }
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
