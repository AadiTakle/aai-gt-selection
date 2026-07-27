import { describe, expect, it } from 'vitest';

import { FORBIDDEN_CLIENT_KEYS, findAnswerLeak, toServedItem } from './bank-item';
import { MATERIALIZABLE_TYPE_CODES } from './content/registry';
import { buildBankItem } from './builder';

const ALLOWED_SERVED_KEYS = ['itemId', 'typeCode', 'domain', 'difficultyLevel', 'demoPath', 'content'];

describe('served projection excludes every answer-bearing field', () => {
  for (const typeCode of MATERIALIZABLE_TYPE_CODES) {
    it(`${typeCode}: toServedItem drops answer/scoring/irt and option lure tags`, () => {
      const item = buildBankItem(typeCode, 3, '6-8', 0);
      const served = toServedItem(item);

      // top-level keys are exactly the allowed set
      expect(Object.keys(served).sort()).toEqual([...ALLOWED_SERVED_KEYS].sort());

      // deep scan finds no forbidden key anywhere
      expect(findAnswerLeak(served)).toEqual([]);

      // the bank item DID carry a key; the served item does not
      expect('answer' in item).toBe(true);
      expect('answer' in served).toBe(false);
      expect('scoring' in served).toBe(false);
      expect('irt' in served).toBe(false);
      expect('provenance' in served).toBe(false);
    });
  }

  it('findAnswerLeak detects a planted leak (guard is not vacuous)', () => {
    const leaky = { content: { options: [{ label: 'x', lure: 'correct' }] } };
    expect(findAnswerLeak(leaky).length).toBeGreaterThan(0);
  });

  it('FORBIDDEN_CLIENT_KEYS covers the key answer fields', () => {
    for (const k of ['answer', 'scoring', 'irt', 'correctIndex', 'lure', 'canonicalSolution']) {
      expect((FORBIDDEN_CLIENT_KEYS as readonly string[]).includes(k)).toBe(true);
    }
  });
});
