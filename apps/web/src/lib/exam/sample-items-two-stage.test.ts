import { describe, expect, it } from 'vitest';

import { bankItemSchema } from './item';
import {
  syntheticTwoStageBank,
  TWO_STAGE_EFFORT_ITEMS,
  TWO_STAGE_STANDING_ITEMS,
} from './sample-items-two-stage';

const bank = syntheticTwoStageBank();
const DOMAINS = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'] as const;
const DEMO_PATH = /^\/exam-demos\/[A-Za-z0-9-]+\.html$/;

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

  it('splits the regimes by the STAGE TAG, not by renderKind (every item is embedded-demo)', () => {
    for (const item of bank) {
      expect(item.renderKind).toBe('embedded-demo');
      expect(item.stage === 'standing' || item.stage === 'effort').toBe(true);
    }
    expect(TWO_STAGE_STANDING_ITEMS.every((i) => i.stage === 'standing')).toBe(true);
    expect(TWO_STAGE_EFFORT_ITEMS.every((i) => i.stage === 'effort')).toBe(true);
  });

  it('uses REAL catalog type codes whose demoPath is derived from the type code', () => {
    for (const item of bank) {
      // e.g. FLU-MATRIX-01, CX-figural-01, GB-WORDFORGE-01, QUANT-DOTS-01
      expect(item.typeCode).toMatch(/^[A-Z]+-[A-Za-z0-9]+-\d+$/);
      expect(item.demoPath).toBe(`/exam-demos/${item.typeCode}.html`);
    }
  });
});

describe('two-stage synthetic bank — Phase-1 standing pool', () => {
  it('is entirely tagged stage:"standing" and rendered as embedded-demo', () => {
    for (const item of TWO_STAGE_STANDING_ITEMS) {
      expect(item.stage).toBe('standing');
      expect(item.renderKind).toBe('embedded-demo');
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

  it('points every standing item at a real /exam-demos runtime path', () => {
    for (const item of TWO_STAGE_STANDING_ITEMS) {
      expect(item.demoPath).toMatch(DEMO_PATH);
    }
  });
});

describe('two-stage synthetic bank — Phase-2 effort pool', () => {
  it('is entirely tagged stage:"effort" and rendered as embedded-demo', () => {
    for (const item of TWO_STAGE_EFFORT_ITEMS) {
      expect(item.stage).toBe('effort');
      expect(item.renderKind).toBe('embedded-demo');
    }
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
      expect(item.demoPath).toMatch(DEMO_PATH);
    }
  });
});
