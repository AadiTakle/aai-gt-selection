import { describe, expect, it } from 'vitest';

import { accuracyFrom, difficultyFrom } from './harvest';

describe('metric parsers', () => {
  it('parses accuracy from an "n/m  pct%" M-ACC string', () => {
    expect(accuracyFrom({ 'M-ACC': '4/6  67%' })).toBeCloseTo(4 / 6, 5);
    expect(accuracyFrom({ 'M-ACC': '6/6  100%' })).toBe(1);
  });

  it('falls back to the percentage when no fraction is present', () => {
    expect(accuracyFrom({ 'M-ACC': '80%' })).toBeCloseTo(0.8, 5);
  });

  it('returns null when M-ACC is missing or unparseable', () => {
    expect(accuracyFrom({})).toBeNull();
    expect(accuracyFrom({ 'M-ACC': '—' })).toBeNull();
  });

  it('parses the level from an M-DIFFREACH string', () => {
    expect(difficultyFrom({ 'M-DIFFREACH': 'L5 · 3 rules' })).toBe(5);
    expect(difficultyFrom({ 'M-DIFFREACH': 'L1' })).toBe(1);
  });

  it('returns null when difficulty is missing', () => {
    expect(difficultyFrom({})).toBeNull();
    expect(difficultyFrom({ 'M-DIFFREACH': '—' })).toBeNull();
  });
});
