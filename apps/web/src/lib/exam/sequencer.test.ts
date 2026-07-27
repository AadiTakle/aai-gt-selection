import { describe, expect, it } from 'vitest';

import type { BankItem } from './item';
import { syntheticSampleBank } from './sample-items';
import { domainBalancedOrder, FixedSequencer, type Sequencer } from './sequencer';

const bank = syntheticSampleBank();

function domainOf(bankItems: readonly BankItem[], itemId: string): string {
  return bankItems.find((b) => b.itemId === itemId)!.domain;
}

describe('domainBalancedOrder', () => {
  it('returns a permutation of every item exactly once', () => {
    const order = domainBalancedOrder(bank);
    expect(order).toHaveLength(bank.length);
    expect(new Set(order).size).toBe(bank.length);
  });

  it('never places two items from the same domain back to back', () => {
    const order = domainBalancedOrder(bank);
    for (let i = 1; i < order.length; i++) {
      expect(domainOf(bank, order[i]!)).not.toBe(domainOf(bank, order[i - 1]!));
    }
  });

  it('is deterministic (same bank → same order)', () => {
    expect(domainBalancedOrder(bank)).toEqual(domainBalancedOrder(bank));
  });
});

describe('FixedSequencer', () => {
  it('yields every item once in the balanced order, then stops with null', () => {
    const sequencer = new FixedSequencer();
    const presented: string[] = [];
    for (;;) {
      const next = sequencer.next({ bank, presentedItemIds: presented, results: [] });
      if (next === null) break;
      presented.push(next.itemId);
      expect(presented.length).toBeLessThanOrEqual(bank.length + 1);
    }
    expect(presented).toEqual(domainBalancedOrder(bank));
  });

  it('ignores results (it is intentionally not adaptive)', () => {
    const sequencer = new FixedSequencer();
    const first = sequencer.next({ bank, presentedItemIds: [], results: [] });
    const firstAgain = sequencer.next({
      bank,
      presentedItemIds: [],
      // A fabricated result must not change the fixed choice.
      results: [
        {
          typeCode: 'X',
          domain: 'verbal',
          skipped: false,
          metrics: {},
          accuracy: 0,
          difficultyReached: null,
        },
      ],
    });
    expect(first?.itemId).toBe(firstAgain?.itemId);
  });

  it('conforms to the Sequencer interface (swappable)', () => {
    const sequencer: Sequencer = new FixedSequencer();
    expect(sequencer.id).toBe('fixed');
    expect(typeof sequencer.next).toBe('function');
  });
});
