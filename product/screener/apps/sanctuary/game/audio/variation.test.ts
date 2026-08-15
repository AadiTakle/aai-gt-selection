import { describe, expect, it } from 'vitest';

import { between, createChooser, jitter, pick, seededRand } from './variation';

/**
 * The one part of the audio directory that can be tested in Node.
 *
 * Everything else here is a Web Audio graph and there is no AudioContext in the vitest environment, so
 * the graphs are verified by rendering them in real Chrome — see `verify.mjs` and `measure.ts`. What IS
 * testable without a browser is the promise that stops the squelches becoming irritating, and that is
 * exactly what this file pins down.
 */

describe('createChooser', () => {
  it('never returns the same variant twice in a row', () => {
    for (const count of [2, 3, 4, 5, 6, 12]) {
      const next = createChooser(count, seededRand(count * 7919));
      let last = next();
      for (let i = 0; i < 20000; i += 1) {
        const v = next();
        expect(v).not.toBe(last);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(count);
        expect(Number.isInteger(v)).toBe(true);
        last = v;
      }
    }
  });

  it('reaches every variant', () => {
    const next = createChooser(4, seededRand(11));
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) seen.add(next());
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('degenerates safely to a constant when there is only one variant', () => {
    for (const count of [1, 0, -3, 0.4, Number.NaN]) {
      const next = createChooser(count, seededRand(3));
      for (let i = 0; i < 50; i += 1) expect(next()).toBe(0);
    }
  });

  it('stays in range for a pathological Rand', () => {
    for (const bad of [() => 1, () => 0.999999999999, () => Number.NaN, () => -1]) {
      const next = createChooser(3, bad);
      for (let i = 0; i < 50; i += 1) {
        const v = next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(3);
      }
    }
  });
});

describe('seededRand', () => {
  it('is deterministic, which is what makes the offline measurements comparable', () => {
    const a = seededRand(1234);
    const b = seededRand(1234);
    for (let i = 0; i < 1000; i += 1) expect(a()).toBe(b());
  });

  it('stays inside [0, 1)', () => {
    const r = seededRand(99);
    for (let i = 0; i < 100000; i += 1) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('does not collapse to a constant', () => {
    const r = seededRand(0);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i += 1) seen.add(r());
    expect(seen.size).toBeGreaterThan(900);
  });
});

describe('jitter, between and pick', () => {
  it('jitters symmetrically around one', () => {
    const r = seededRand(5);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < 20000; i += 1) {
      const v = jitter(r, 0.05);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    expect(lo).toBeGreaterThanOrEqual(0.95);
    expect(hi).toBeLessThanOrEqual(1.05);
    // Actually spreads, rather than sitting at 1.
    expect(hi - lo).toBeGreaterThan(0.09);
  });

  it('treats a nonsense spread as no spread', () => {
    const r = seededRand(6);
    expect(jitter(r, Number.NaN)).toBe(1);
  });

  it('stays inside the range', () => {
    const r = seededRand(7);
    for (let i = 0; i < 10000; i += 1) {
      const v = between(r, 7, 15);
      expect(v).toBeGreaterThanOrEqual(7);
      expect(v).toBeLessThan(15);
    }
  });

  it('picks a defined member', () => {
    const r = seededRand(8);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 1000; i += 1) expect(items).toContain(pick(items, r));
  });
});
