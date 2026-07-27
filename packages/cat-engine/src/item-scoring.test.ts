import { describe, expect, it } from 'vitest';

import type { ItemParameters, RawResponse, ScoringPolicy } from './types';
import {
  normalizedScore,
  resolveCorrect,
  scoreDomain,
  scoreItem,
  scoreItems,
} from './item-scoring';

const policy: ScoringPolicy = {
  policyVersion: 'test-v1',
  fitWeights: { fluid_reasoning: 1 },
  learningRateWeight: 0,
  consistencyWeight: 0,
  admitCut: 1,
  retryCut: -1,
};

const item = (over: Partial<ItemParameters> & Pick<ItemParameters, 'itemId'>): ItemParameters => ({
  domain: 'fluid_reasoning',
  irt: { a: 1.5, b: 0, c: 0, model: '2PL' },
  difficultyLevel: 1,
  rapidGuessThresholdMs: 800,
  ...over,
});

describe('resolveCorrect', () => {
  it('resolves from an answer key when present', () => {
    const params = item({ itemId: 'i1', answerKey: 'B' });
    expect(resolveCorrect({ itemId: 'i1', order: 1, rtMs: 2000, answer: 'B' }, params)).toBe(true);
    expect(resolveCorrect({ itemId: 'i1', order: 1, rtMs: 2000, answer: 'C' }, params)).toBe(false);
  });

  it('falls back to explicit correctness, then to full-credit raw score', () => {
    const params = item({ itemId: 'i2', maxScore: 3 });
    expect(resolveCorrect({ itemId: 'i2', order: 1, rtMs: 2000, correct: true }, params)).toBe(true);
    expect(resolveCorrect({ itemId: 'i2', order: 1, rtMs: 2000, rawScore: 3 }, params)).toBe(true);
    expect(resolveCorrect({ itemId: 'i2', order: 1, rtMs: 2000, rawScore: 2 }, params)).toBe(false);
  });
});

describe('normalizedScore', () => {
  it('is a fraction of maxScore for polytomous items (M-POLY)', () => {
    const params = item({ itemId: 'p', maxScore: 4 });
    expect(normalizedScore({ itemId: 'p', order: 1, rtMs: 2000, rawScore: 3 }, params, false)).toBeCloseTo(
      0.75,
      9,
    );
  });

  it('is 1 / 0 for dichotomous items', () => {
    const params = item({ itemId: 'd' });
    expect(normalizedScore({ itemId: 'd', order: 1, rtMs: 2000 }, params, true)).toBe(1);
    expect(normalizedScore({ itemId: 'd', order: 1, rtMs: 2000 }, params, false)).toBe(0);
  });
});

describe('scoreItem', () => {
  it('marks rapid guesses effort-invalid and honors the on-task flag', () => {
    const params = item({ itemId: 'i', rapidGuessThresholdMs: 800 });
    const rapid = scoreItem({ itemId: 'i', order: 1, rtMs: 300, correct: true }, params);
    expect(rapid.rapidGuess).toBe(true);
    expect(rapid.effortValid).toBe(false);

    const offTask = scoreItem({ itemId: 'i', order: 1, rtMs: 5000, correct: true, onTask: false }, params);
    expect(offTask.rapidGuess).toBe(false);
    expect(offTask.effortValid).toBe(false);

    const good = scoreItem({ itemId: 'i', order: 1, rtMs: 5000, correct: true }, params);
    expect(good.effortValid).toBe(true);
    expect(good.onTask).toBe(true);
  });
});

describe('scoreItems', () => {
  it('drops responses for unknown items and sorts by administration order', () => {
    const paramsById = new Map<string, ItemParameters>([
      ['a', item({ itemId: 'a' })],
      ['b', item({ itemId: 'b' })],
    ]);
    const log: RawResponse[] = [
      { itemId: 'b', order: 2, rtMs: 2000, correct: true },
      { itemId: 'ghost', order: 1, rtMs: 2000, correct: true },
      { itemId: 'a', order: 1, rtMs: 2000, correct: true },
    ];
    const scored = scoreItems(log, paramsById);
    expect(scored.map((s) => s.itemId)).toEqual(['a', 'b']);
  });
});

describe('scoreDomain', () => {
  it('estimates theta from effort-valid responses only and reports ceiling', () => {
    const paramsById = new Map<string, ItemParameters>([
      ['easy', item({ itemId: 'easy', irt: { a: 1.5, b: -2, c: 0 }, difficultyLevel: 1 })],
      ['hard', item({ itemId: 'hard', irt: { a: 1.5, b: 1, c: 0 }, difficultyLevel: 5 })],
    ]);
    // The easy item is a WRONG rapid guess (effort-invalid) -> excluded from theta.
    const log: RawResponse[] = [
      { itemId: 'easy', order: 1, rtMs: 300, correct: false },
      { itemId: 'hard', order: 2, rtMs: 5000, correct: true },
    ];
    const scored = scoreItems(log, paramsById);
    const ds = scoreDomain(scored, 'fluid_reasoning', policy);
    expect(ds.itemsScored).toBe(2);
    expect(ds.itemsEffortValid).toBe(1);
    expect(ds.theta).toBeGreaterThan(0); // only the correct hard item counts
    expect(ds.maxDifficultyReached).toBe(5);
    expect(ds.percentile).not.toBeNull();
  });

  it('returns the prior and a null percentile for a domain with no effort-valid items', () => {
    const paramsById = new Map<string, ItemParameters>([['x', item({ itemId: 'x' })]]);
    const log: RawResponse[] = [{ itemId: 'x', order: 1, rtMs: 100, correct: true }]; // rapid guess
    const scored = scoreItems(log, paramsById);
    const ds = scoreDomain(scored, 'fluid_reasoning', policy);
    expect(ds.itemsEffortValid).toBe(0);
    expect(ds.percentile).toBeNull();
    expect(ds.maxDifficultyReached).toBe(0);
    expect(ds.theta).toBeCloseTo(0, 6);
  });
});
