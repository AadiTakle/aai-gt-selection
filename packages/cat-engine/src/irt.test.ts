import { describe, expect, it } from 'vitest';

import type { IrtParameters } from '@gt-selection/contracts';

import { itemInformation, probabilityCorrect, testInformation } from './irt';

const twoPl = (a: number, b: number): IrtParameters => ({ a, b, c: 0, model: '2PL' });
const threePl = (a: number, b: number, c: number): IrtParameters => ({ a, b, c, model: '3PL' });

describe('probabilityCorrect', () => {
  it('is 0.5 at theta = b for a 2PL item', () => {
    expect(probabilityCorrect(0, twoPl(1, 0))).toBeCloseTo(0.5, 6);
  });

  it('increases monotonically in theta', () => {
    const item = twoPl(1.2, 0);
    expect(probabilityCorrect(-1, item)).toBeLessThan(probabilityCorrect(0, item));
    expect(probabilityCorrect(0, item)).toBeLessThan(probabilityCorrect(1, item));
  });

  it('respects the 3PL guessing asymptote c', () => {
    expect(probabilityCorrect(-8, threePl(1, 0, 0.25))).toBeCloseTo(0.25, 2);
  });
});

describe('itemInformation', () => {
  it('peaks near b for a 2PL item', () => {
    const item = twoPl(1.5, 0.5);
    const atB = itemInformation(0.5, item);
    expect(atB).toBeGreaterThan(itemInformation(-1.5, item));
    expect(atB).toBeGreaterThan(itemInformation(2.5, item));
  });

  it('equals a^2 * p * q for a 2PL item', () => {
    const item = twoPl(1.3, 0.2);
    const p = probabilityCorrect(0.4, item);
    expect(itemInformation(0.4, item)).toBeCloseTo(1.3 * 1.3 * p * (1 - p), 6);
  });

  it('sums item information in testInformation', () => {
    const items = [twoPl(1, 0), twoPl(1, 0.5)];
    expect(testInformation(0.1, items)).toBeCloseTo(
      itemInformation(0.1, items[0]!) + itemInformation(0.1, items[1]!),
      9,
    );
  });
});
