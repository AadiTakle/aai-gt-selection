import { describe, expect, it } from 'vitest';

import { bankItemSchema } from './bank-item';
import { MATERIALIZABLE_TYPE_CODES } from './content/registry';
import { buildBankItem } from './builder';
import {
  SOLVERS,
  solveAnalogy,
  solveFunc,
  solveMatrix,
  solveRoll,
  solveSeries,
} from './solvers';
import { ITEM_MODELS } from './type-registry';

const BAND = '6-8' as const;

describe('generators produce schema-valid, correctly-keyed items', () => {
  for (const typeCode of MATERIALIZABLE_TYPE_CODES) {
    it(`${typeCode}: builds valid items across levels`, () => {
      for (let level = 1; level <= 5; level++) {
        const item = buildBankItem(typeCode, level, BAND, 0);
        expect(bankItemSchema.safeParse(item).success).toBe(true);
        expect(item.syntheticOnly).toBe(true);
        expect(item.validated).toBe(false);
        expect(item.irt.provisional).toBe(true);
        expect(item.domain).toBe(ITEM_MODELS[typeCode].domain);
      }
    });
  }

  it('deterministic: same (type, level, band, index) ⇒ identical item', () => {
    const a = buildBankItem('QUANT-SERIES-01', 3, BAND, 0);
    const b = buildBankItem('QUANT-SERIES-01', 3, BAND, 0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('independent solvers reproduce the stored key', () => {
  it('QUANT-SERIES-01 solver index == key', () => {
    for (let level = 1; level <= 6; level++) {
      const item = buildBankItem('QUANT-SERIES-01', level, BAND, 1);
      const solved = solveSeries(item.content as never);
      expect(solved?.index).toBe(item.answer.correctIndex);
    }
  });

  it('QUANT-FUNC-01 solver index == key', () => {
    for (let level = 1; level <= 6; level++) {
      const item = buildBankItem('QUANT-FUNC-01', level, BAND, 1);
      const solved = solveFunc(item.content as never);
      expect(solved?.index).toBe(item.answer.correctIndex);
    }
  });

  it('FLU-MATRIX-01 solver index == key', () => {
    for (let level = 1; level <= 5; level++) {
      const item = buildBankItem('FLU-MATRIX-01', level, BAND, 1);
      const solved = solveMatrix(item.content as never);
      expect(solved?.index).toBe(item.answer.correctIndex);
    }
  });

  it('FLU-ANALOGY-01 solver index == key', () => {
    for (let level = 1; level <= 5; level++) {
      const item = buildBankItem('FLU-ANALOGY-01', level, BAND, 1);
      const solved = solveAnalogy(item.content as never);
      expect(solved?.index).toBe(item.answer.correctIndex);
    }
  });

  it('SPA-ROLL-01 solver index == key', () => {
    for (let level = 1; level <= 6; level++) {
      const item = buildBankItem('SPA-ROLL-01', level, BAND, 1);
      const solved = solveRoll(item.content as never);
      expect(solved?.index).toBe(item.answer.correctIndex);
    }
  });

  it('SPA-MAZE-01 canonical path scores full credit under its solver', () => {
    for (let level = 1; level <= 5; level++) {
      const item = buildBankItem('SPA-MAZE-01', level, BAND, 1);
      const canonical = item.answer.canonicalSolution as { path: [number, number][] };
      const score = SOLVERS['maze-shortest@1']!.score(item.content, canonical.path);
      expect(score).toBe(1);
    }
  });

  it('VER-SENSE-01 canonical order scores full credit; a scramble scores < 1', () => {
    const item = buildBankItem('VER-SENSE-01', 2, '2-3', 0);
    const canonical = item.answer.canonicalSolution as number[];
    expect(SOLVERS['order-plausibility@1']!.score(item.content, canonical)).toBe(1);
    const scrambled = [...canonical].reverse();
    expect(SOLVERS['order-plausibility@1']!.score(item.content, scrambled)).toBeLessThan(1);
  });
});
