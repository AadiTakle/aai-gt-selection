import { describe, expect, it } from 'vitest';

import { hashSeed, mulberry32 } from './rng';

describe('hashSeed', () => {
  it('is deterministic for the same string', () => {
    expect(hashSeed('session-abc:0')).toBe(hashSeed('session-abc:0'));
  });

  it('differs for different strings', () => {
    expect(hashSeed('session-abc:0')).not.toBe(hashSeed('session-abc:1'));
  });

  it('returns a 32-bit unsigned integer', () => {
    const h = hashSeed('anything');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('mulberry32', () => {
  it('produces the identical sequence for the same seed (reproducible)', () => {
    const a = mulberry32(hashSeed('seed'));
    const b = mulberry32(hashSeed('seed'));
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(hashSeed('seed-1'));
    const b = mulberry32(hashSeed('seed-2'));
    expect(a()).not.toBe(b());
  });

  it('returns floats in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
