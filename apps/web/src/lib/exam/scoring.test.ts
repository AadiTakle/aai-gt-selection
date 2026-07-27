import { describe, expect, it } from 'vitest';

import type { BankEmbeddedDemo } from './item';
import { SYNTHETIC_SAMPLE_ITEMS } from './sample-items';
import { scoreResponse } from './scoring';

const relpair = SYNTHETIC_SAMPLE_ITEMS.find((i) => i.itemId === 'SYN-VER-RELPAIR-01')!;

describe('scoreResponse (deterministic_key)', () => {
  it('reproduces the key: the correct index scores 1.0', () => {
    const result = scoreResponse(relpair, { selectedIndex: relpair.answer.correctIndex! });
    expect(result).toEqual({ accuracy: 1, correct: true });
  });

  it('scores a wrong index 0.0', () => {
    const wrong = (relpair.answer.correctIndex! + 1) % relpair.content.options.length;
    expect(scoreResponse(relpair, { selectedIndex: wrong })).toEqual({ accuracy: 0, correct: false });
  });

  it('returns not-scored for a null / index-less response', () => {
    expect(scoreResponse(relpair, null)).toEqual({ accuracy: null, correct: null });
    expect(scoreResponse(relpair, {})).toEqual({ accuracy: null, correct: null });
  });

  it('every sample item is reproduced by its own key', () => {
    for (const item of SYNTHETIC_SAMPLE_ITEMS) {
      const r = scoreResponse(item, { selectedIndex: item.answer.correctIndex! });
      expect(r.correct, item.itemId).toBe(true);
      expect(r.accuracy, item.itemId).toBe(1);
    }
  });

  it('does not score embedded-demo items (they self-score in-frame)', () => {
    const demo: BankEmbeddedDemo = {
      renderKind: 'embedded-demo',
      itemId: 'SPA-ROLL-01',
      typeCode: 'SPA-ROLL-01',
      domain: 'spatial',
      title: 'Rolling Cube',
      blurb: 'Track a cube as it tips along a path.',
      difficultyLevel: 1,
      demoPath: '/exam-demos/SPA-ROLL-01.html',
      syntheticOnly: true,
      validated: false,
    };
    expect(scoreResponse(demo, { selectedIndex: 0 })).toEqual({ accuracy: null, correct: null });
  });
});
