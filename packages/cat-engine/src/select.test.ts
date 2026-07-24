import { describe, expect, it } from 'vitest';

import type { ExamItem } from '@gt-selection/contracts';

import { selectByMaxInformation } from './select';

function mkItem(id: string, a: number, b: number): ExamItem {
  return {
    itemId: id,
    typeCode: 'FLU-MATRIX-01',
    domain: 'fluid_reasoning',
    difficultyLevel: 1,
    ageBands: ['4-5'],
    irt: { a, b, c: 0, model: '2PL' },
    demoPath: 'demos/x.html',
    params: {},
    syntheticOnly: true,
  };
}

describe('selectByMaxInformation', () => {
  it('returns null for no candidates', () => {
    expect(selectByMaxInformation(0, [], { topK: 1, seed: 's' })).toBeNull();
  });

  it('picks the most informative item at the current theta (topK = 1)', () => {
    const near = mkItem('near', 1.5, 0);
    const far = mkItem('far', 1.5, 2.5);
    expect(selectByMaxInformation(0, [far, near], { topK: 1, seed: 's' })?.itemId).toBe('near');
  });

  it('is deterministic for a fixed seed', () => {
    const items = [mkItem('a', 1, 0), mkItem('b', 1, 0.1), mkItem('c', 1, -0.1)];
    const first = selectByMaxInformation(0, items, { topK: 3, seed: 'fixed' });
    const second = selectByMaxInformation(0, items, { topK: 3, seed: 'fixed' });
    expect(first?.itemId).toBe(second?.itemId);
  });
});
