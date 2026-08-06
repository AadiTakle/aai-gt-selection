/**
 * Marking an index key, and not marking it against the wrong thing.
 *
 * Five verbal types put a 0-based option index in `correctKey` because their options are positional.
 * Accepting that unlocked two whole families, and it also opened the door to the worst bug in this
 * codebase's history: comparing an index with a letter, which marks every attempt wrong while looking
 * completely healthy from the outside. These tests exist to hold that door shut.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { BANK_DIR, loadBanks, scoreResponse, type BankRecord } from './bank';

function firstItem(typeCode: string): BankRecord {
  const line = readFileSync(join(BANK_DIR, `${typeCode}.jsonl`), 'utf8').split('\n').find((l) => l.trim());
  if (!line) throw new Error(`no items in ${typeCode}`);
  return JSON.parse(line) as BankRecord;
}

const INDEX_KEYED = ['VER-RELPAIR-01', 'VER-CLOZE-01', 'VER-POLYSEME-01', 'VER-SORTBOT-01', 'VER-SEQUENCE-01'];

describe('an index key marks correctly', () => {
  for (const typeCode of INDEX_KEYED) {
    it(`${typeCode}: the key marks right, its neighbour marks wrong`, () => {
      const item = firstItem(typeCode);
      const key = item.answer.correctKey;
      expect(typeof key, `${typeCode} should carry a numeric key`).toBe('number');
      const correct = key as number;

      // The renderer reports selectedIndex, so that is what has to be marked.
      expect(scoreResponse(item, { selectedIndex: correct })).toBe(true);
      expect(scoreResponse(item, { selectedIndex: correct === 0 ? 1 : 0 })).toBe(false);
    });
  }

  it('accepts index under either name the renderers use', () => {
    const item = firstItem('VER-RELPAIR-01');
    const correct = item.answer.correctKey as number;
    expect(scoreResponse(item, { index: correct })).toBe(true);
    expect(scoreResponse(item, correct)).toBe(true);
  });

  it('returns unscorable, not wrong, when no index was reported', () => {
    // The distinction that matters: an attempt nobody can mark must not be counted as a failure.
    const item = firstItem('VER-RELPAIR-01');
    expect(scoreResponse(item, { key: 'A' })).toBeNull();
    expect(scoreResponse(item, {})).toBeNull();
  });
});

describe('the two key styles never cross', () => {
  it('does not mark a letter response against an index key', () => {
    const indexKeyed = firstItem('VER-RELPAIR-01');
    // 'C' is the third option and the key is often 2. Marking these equal would be the silent bug.
    expect(scoreResponse(indexKeyed, { key: 'C' })).toBeNull();
    expect(scoreResponse(indexKeyed, 'C')).toBeNull();
  });

  it('does not mark an index response against a letter key', () => {
    const letterKeyed = firstItem('FLU-MATRIX-01');
    expect(typeof letterKeyed.answer.correctKey).toBe('string');
    expect(scoreResponse(letterKeyed, { selectedIndex: 0 })).toBeNull();
  });

  it('still marks letter-keyed types exactly as before', () => {
    const item = firstItem('FLU-MATRIX-01');
    const key = item.answer.correctKey as string;
    expect(scoreResponse(item, { key })).toBe(true);
    expect(scoreResponse(item, key.toLowerCase())).toBe(true);
    expect(scoreResponse(item, { key: key === 'A' ? 'B' : 'A' })).toBe(false);
  });
});

describe('the five types are now in the pool', () => {
  const banks = loadBanks();

  for (const typeCode of INDEX_KEYED) {
    it(`${typeCode} has scorable items`, () => {
      const bank = banks.get(typeCode);
      expect(bank, `${typeCode} missing from the loaded banks`).toBeDefined();
      expect(bank!.scorable.length).toBeGreaterThan(0);
    });
  }

  it('marks every item of every index-keyed type, right and wrong', () => {
    // Over the whole bank rather than one sample, since a single type with a stray string key would
    // otherwise reintroduce unscorables into a family that is meant to be servable.
    for (const typeCode of INDEX_KEYED) {
      for (const item of banks.get(typeCode)!.scorable) {
        const key = item.answer.correctKey;
        expect(typeof key, `${typeCode} ${item.itemId}`).toBe('number');
        const correct = key as number;
        expect(scoreResponse(item, { selectedIndex: correct }), `${typeCode} ${item.itemId}`).toBe(true);
        expect(scoreResponse(item, { selectedIndex: correct + 1 }), `${typeCode} ${item.itemId}`).toBe(false);
      }
    }
  });
});
