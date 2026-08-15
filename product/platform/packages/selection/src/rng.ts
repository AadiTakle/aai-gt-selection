/**
 * Deterministic randomness, derived from the session seed and the item ordinal.
 *
 * Every stochastic choice in selection goes through this. Two sessions with different seeds diverge;
 * one session replays exactly. That combination is what makes a varied engine debuggable: when a
 * sequence looks wrong, it can be reproduced from the seed stored on the session record.
 *
 * mulberry32 over an FNV-1a hash. Neither is cryptographic and neither needs to be — this decides
 * which of several near-equivalent questions to ask, not anything an adversary gains from
 * predicting. The signing of served-item tokens is the place that needs real cryptography, and it
 * uses HMAC.
 */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(xs: readonly T[]): T;
  /** Sample proportional to weight. Non-positive weights are treated as zero. */
  weighted<T>(xs: readonly T[], weights: readonly number[]): T;
  shuffled<T>(xs: readonly T[]): readonly T[];
}

function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFor(seed: string, ordinal: number): Rng {
  const next = mulberry32(hashString(`${seed}:${ordinal}`));

  const rng: Rng = {
    next,
    int(maxExclusive) {
      if (maxExclusive <= 0) return 0;
      return Math.min(maxExclusive - 1, Math.floor(next() * maxExclusive));
    },
    pick(xs) {
      if (xs.length === 0) throw new Error('pick from an empty list');
      return xs[rng.int(xs.length)] as (typeof xs)[number];
    },
    weighted(xs, weights) {
      if (xs.length === 0) throw new Error('weighted pick from an empty list');
      if (xs.length !== weights.length) throw new Error('weights must match items');
      const clamped = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
      const total = clamped.reduce((s, w) => s + w, 0);
      // Every candidate scored zero, which happens when information vanishes across the whole
      // pool. Falling back to uniform is better than refusing to serve a question.
      if (total <= 0) return rng.pick(xs);
      let target = next() * total;
      for (let i = 0; i < xs.length; i++) {
        target -= clamped[i] as number;
        if (target <= 0) return xs[i] as (typeof xs)[number];
      }
      return xs[xs.length - 1] as (typeof xs)[number];
    },
    shuffled(xs) {
      const out = [...xs];
      for (let i = out.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [out[i], out[j]] = [out[j] as (typeof out)[number], out[i] as (typeof out)[number]];
      }
      return out;
    },
  };

  return rng;
}
