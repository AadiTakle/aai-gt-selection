/**
 * Deterministic PRNG utilities for reproducible, seeded computation. Any
 * randomness in the engine (e.g. the seeded confidence bootstrap) is driven by
 * these so that a score recomputed from the same inputs is bit-for-bit stable
 * (deterministic replay, R7 / D-019). Recovered from commit 2b458cb.
 */

/** FNV-ish string hash -> 32-bit unsigned int seed. */
export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** mulberry32 PRNG -> function returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
