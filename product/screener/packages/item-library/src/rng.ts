/**
 * Deterministic seeded RNG. Every generator draws from this and nothing else, which is
 * what makes `render(seed)` reproducible and therefore what makes a session replayable.
 *
 * mulberry32. Small, fast, and good enough for choosing distractors. It is not
 * cryptographic and nothing here needs it to be.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Spread low-entropy seeds like 1, 2, 3 so consecutive seeds do not produce
    // near-identical item sequences.
    this.state = (seed ^ 0x9e3779b9) >>> 0;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) throw new Error(`Rng.int: max ${max} below min ${min}`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    return items[this.int(0, items.length - 1)] as T;
  }

  /** Fisher-Yates on a copy. Leaves the input untouched. */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const a = out[i] as T;
      const b = out[j] as T;
      out[i] = b;
      out[j] = a;
    }
    return out;
  }

  /** Distinct integers in [min, max], excluding anything in `avoid`. */
  distinctInts(count: number, min: number, max: number, avoid: readonly number[] = []): number[] {
    const span = max - min + 1;
    const blocked = new Set(avoid);
    if (span - blocked.size < count) {
      throw new Error(`Rng.distinctInts: cannot draw ${count} distinct values from [${min}, ${max}]`);
    }
    const out = new Set<number>();
    let guard = 0;
    while (out.size < count) {
      if (guard++ > 10_000) throw new Error('Rng.distinctInts: exceeded attempt budget');
      const v = this.int(min, max);
      if (!blocked.has(v)) out.add(v);
    }
    return [...out];
  }
}
