import { describe, expect, it } from 'vitest';

import { itemInformation } from '../irt';
import type { IrtParameters, ScoredResponse } from '../types';

import { maxInformationIndex, posteriorGrid, posteriorWeightedInformationIndex } from './selection';

const item = (b: number, a = 1.2, c = 0.25): IrtParameters => ({ a, b, c, model: '3PL' });
const pool = [item(-2), item(-1), item(0), item(1), item(2)].map((irt) => ({ irt }));

describe('maxInformationIndex', () => {
  it('returns null for an empty pool', () => {
    expect(maxInformationIndex([], 0)).toBeNull();
  });

  it('picks the item whose information is highest at theta', () => {
    const index = maxInformationIndex(pool, 1)!;
    const best = itemInformation(1, pool[index]!.irt);
    for (const candidate of pool) {
      expect(itemInformation(1, candidate.irt)).toBeLessThanOrEqual(best + 1e-12);
    }
  });

  it('tracks theta upward through the pool', () => {
    const low = maxInformationIndex(pool, -2)!;
    const high = maxInformationIndex(pool, 2)!;
    expect(pool[low]!.irt.b).toBeLessThan(pool[high]!.irt.b);
  });
});

describe('posteriorGrid', () => {
  it('returns the prior when there are no responses', () => {
    const { nodes, weights } = posteriorGrid([]);
    const mean = nodes.reduce((s, node, i) => s + node * weights[i]!, 0);
    expect(mean).toBeCloseTo(0, 6);
    expect(weights.reduce((s, w) => s + w, 0)).toBeCloseTo(1, 9);
  });

  it('shifts the posterior toward the ability implied by the responses', () => {
    const responses: ScoredResponse[] = [item(1), item(1.5), item(2)].map((irt) => ({
      irt,
      correct: true,
    }));
    const { nodes, weights } = posteriorGrid(responses);
    const mean = nodes.reduce((s, node, i) => s + node * weights[i]!, 0);
    expect(mean).toBeGreaterThan(0.5);
  });

  it('stays normalized for a long response string that would underflow', () => {
    const responses: ScoredResponse[] = Array.from({ length: 400 }, () => ({
      irt: item(0),
      correct: true,
    }));
    const { weights } = posteriorGrid(responses);
    expect(weights.reduce((s, w) => s + w, 0)).toBeCloseTo(1, 9);
  });
});

describe('posteriorWeightedInformationIndex', () => {
  it('returns null for an empty pool', () => {
    expect(posteriorWeightedInformationIndex([], posteriorGrid([]))).toBeNull();
  });

  it('matches MFI when the posterior is concentrated at a point', () => {
    const spike = { nodes: [1.5], weights: [1] };
    expect(posteriorWeightedInformationIndex(pool, spike)).toBe(maxInformationIndex(pool, 1.5));
  });

  it('differs from MFI at the posterior mean when the posterior is not unimodal', () => {
    // Two-point posterior at -1.5 / +1.5. MFI evaluated at the mean picks the
    // central item, which is informative at NEITHER mass point; averaging over the
    // posterior instead picks an item that is highly informative at one of them.
    const split = { nodes: [-1.5, 1.5], weights: [0.5, 0.5] };
    const candidates = [item(-1.5), item(0), item(1.5)].map((irt) => ({ irt }));
    expect(maxInformationIndex(candidates, 0)).toBe(1);
    expect(posteriorWeightedInformationIndex(candidates, split)).not.toBe(1);
  });
});
