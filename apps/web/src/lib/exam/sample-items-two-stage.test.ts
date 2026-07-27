import { describe, expect, it } from 'vitest';

import { bankItemSchema } from './item';
import {
  syntheticTwoStageBank,
  TWO_STAGE_EFFORT_ITEMS,
  TWO_STAGE_STANDING_ITEMS,
} from './sample-items-two-stage';

const bank = syntheticTwoStageBank();
const DOMAINS = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'] as const;

describe('two-stage synthetic bank — schema + provenance', () => {
  it('every item validates against the canonical bank item schema', () => {
    for (const item of bank) {
      expect(() => bankItemSchema.parse(item)).not.toThrow();
    }
  });

  it('is entirely born-synthetic and never validated', () => {
    for (const item of bank) {
      expect(item.syntheticOnly).toBe(true);
      expect(item.validated).toBe(false);
    }
  });

  it('has unique itemIds and unique typeCodes (required for UI reconstruction)', () => {
    expect(new Set(bank.map((i) => i.itemId)).size).toBe(bank.length);
    expect(new Set(bank.map((i) => i.typeCode)).size).toBe(bank.length);
  });
});

describe('two-stage synthetic bank — Phase-1 standing pool', () => {
  it('is all single-select accuracy items', () => {
    for (const item of TWO_STAGE_STANDING_ITEMS) expect(item.renderKind).toBe('single-select');
  });

  it('has exactly one keyed-correct option per item', () => {
    for (const item of TWO_STAGE_STANDING_ITEMS) {
      const key = item.answer.correctIndex;
      expect(typeof key).toBe('number');
      expect(item.content.options[key!]).toBeDefined();
    }
  });

  it('provides multiple distinct difficulty rungs per domain so the bracket can search', () => {
    for (const domain of DOMAINS) {
      const rungs = TWO_STAGE_STANDING_ITEMS.filter((i) => i.domain === domain).map(
        (i) => i.difficultyLevel,
      );
      expect(rungs.length).toBeGreaterThanOrEqual(3);
      expect(new Set(rungs).size).toBe(rungs.length);
    }
  });
});

describe('two-stage synthetic bank — Phase-2 effort pool', () => {
  it('is all embedded-demo interactive items', () => {
    for (const item of TWO_STAGE_EFFORT_ITEMS) expect(item.renderKind).toBe('embedded-demo');
  });

  it('offers a spread of rungs per domain so targeting is meaningful', () => {
    for (const domain of DOMAINS) {
      const rungs = TWO_STAGE_EFFORT_ITEMS.filter((i) => i.domain === domain).map(
        (i) => i.difficultyLevel,
      );
      expect(rungs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('points every effort item at a real /exam-demos runtime path', () => {
    for (const item of TWO_STAGE_EFFORT_ITEMS) {
      expect(item.renderKind).toBe('embedded-demo');
      if (item.renderKind === 'embedded-demo') {
        expect(item.demoPath).toMatch(/^\/exam-demos\/[A-Z0-9-]+\.html$/);
      }
    }
  });
});
