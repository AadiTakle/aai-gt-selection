import { createHash } from 'node:crypto';

/** FNV-1a 32-bit hash of a string → unsigned int seed. */
export function hashStringToInt(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32). Same seed ⇒ same stream ⇒ reproducible items. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small seeded RNG helper bundle. */
export interface Rng {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
}

export function makeRng(seed: string): Rng {
  const rand = mulberry32(hashStringToInt(seed));
  const int = (lo: number, hi: number): number => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = <T>(arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[int(0, arr.length - 1)] as T;
  };
  const shuffle = <T>(arr: readonly T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      const a = out[i] as T;
      const b = out[j] as T;
      out[i] = b;
      out[j] = a;
    }
    return out;
  };
  return { next: rand, int, pick, shuffle };
}

/**
 * Deterministic UUID (v5-shaped) from a seed string, so an item's identity is
 * reproducible from its provenance seed. Passes z.uuid() (version 5, RFC variant).
 */
export function deterministicUuid(seed: string): string {
  const hex = createHash('sha1').update(seed).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  const variant = ['8', '9', 'a', 'b'];
  hex[16] = variant[parseInt(hex[16] ?? '0', 16) % 4] ?? '8';
  const u = hex.join('');
  return `${u.slice(0, 8)}-${u.slice(8, 12)}-${u.slice(12, 16)}-${u.slice(16, 20)}-${u.slice(20, 32)}`;
}
