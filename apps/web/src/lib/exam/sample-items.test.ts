import { describe, expect, it } from 'vitest';

import { examDomainSchema } from './item';
import { SYNTHETIC_SAMPLE_ITEMS } from './sample-items';

const DOMAINS = examDomainSchema.options;

describe('synthetic sample bank', () => {
  it('covers all four domains, two items each', () => {
    for (const domain of DOMAINS) {
      const count = SYNTHETIC_SAMPLE_ITEMS.filter((i) => i.domain === domain).length;
      expect(count, `${domain} count`).toBe(2);
    }
  });

  it('has unique item ids', () => {
    const ids = new Set(SYNTHETIC_SAMPLE_ITEMS.map((i) => i.itemId));
    expect(ids.size).toBe(SYNTHETIC_SAMPLE_ITEMS.length);
  });

  it('is born-synthetic and unvalidated on every item (D-006, R9)', () => {
    for (const item of SYNTHETIC_SAMPLE_ITEMS) {
      expect(item.syntheticOnly, item.itemId).toBe(true);
      expect(item.validated, item.itemId).toBe(false);
    }
  });

  it('tags exactly one correct option and aligns the answer key + rationales', () => {
    for (const item of SYNTHETIC_SAMPLE_ITEMS) {
      const correctCount = item.content.options.filter((o) => o.lure === 'correct').length;
      expect(correctCount, `${item.itemId} correct-count`).toBe(1);

      const derivedKey = item.content.options.findIndex((o) => o.lure === 'correct');
      expect(item.answer.correctIndex, `${item.itemId} key`).toBe(derivedKey);

      // distractorRationales mirror the option lure tags in order.
      expect(item.answer.distractorRationales).toEqual(item.content.options.map((o) => o.lure));
    }
  });

  it('keeps ordinal difficulty within the 1..20 design-rung range', () => {
    for (const item of SYNTHETIC_SAMPLE_ITEMS) {
      expect(item.difficultyLevel).toBeGreaterThanOrEqual(1);
      expect(item.difficultyLevel).toBeLessThanOrEqual(20);
    }
  });
});
