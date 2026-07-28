import { describe, expect, it } from 'vitest';

import {
  bankItemSchema,
  singleSelectRenderableSchema,
  toServedItem,
  type BankEmbeddedDemo,
} from './item';
import { SYNTHETIC_SAMPLE_ITEMS } from './sample-items';

describe('toServedItem', () => {
  it('strips answer, scoring, provenance and per-option lure tags', () => {
    for (const item of SYNTHETIC_SAMPLE_ITEMS) {
      const served = toServedItem(item);
      expect(served.renderKind).toBe('single-select');
      if (served.renderKind !== 'single-select') continue;

      // No key/scoring surfaces on the served object at all.
      expect('answer' in served).toBe(false);
      expect('scoring' in served).toBe(false);
      expect('provenance' in served).toBe(false);

      // Options carry only a label — never a lure class.
      for (const opt of served.content.options) {
        expect(Object.keys(opt)).toEqual(['label']);
      }

      // The renderable subset validates against its schema.
      expect(() => singleSelectRenderableSchema.parse(served.content)).not.toThrow();

      // Belt-and-suspenders: the solution literally cannot be in the payload.
      const json = JSON.stringify(served);
      expect(json).not.toContain('lure');
      expect(json).not.toContain('correctIndex');
      expect(json).not.toContain('distractorRationales');
    }
  });

  it('projects an embedded-demo item to its renderable fields', () => {
    const demo: BankEmbeddedDemo = {
      renderKind: 'embedded-demo',
      itemId: 'FLU-MATRIX-01',
      typeCode: 'FLU-MATRIX-01',
      domain: 'fluid_reasoning',
      title: 'Machine Matrix',
      blurb: 'Tap the tile that completes the pattern.',
      difficultyLevel: 1,
      demoPath: '/exam-demos/FLU-MATRIX-01.html',
      syntheticOnly: true,
      validated: false,
    };
    const served = toServedItem(demo);
    expect(served).toMatchObject({ renderKind: 'embedded-demo', demoPath: '/exam-demos/FLU-MATRIX-01.html' });
  });
});

describe('bankItemSchema', () => {
  it('accepts every synthetic sample item', () => {
    for (const item of SYNTHETIC_SAMPLE_ITEMS) {
      expect(() => bankItemSchema.parse(item), item.itemId).not.toThrow();
    }
  });
});
