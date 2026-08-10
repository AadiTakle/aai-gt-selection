/**
 * Marking an index key, and not marking it against the wrong thing.
 *
 * Five verbal types put a 0-based option index in `correctKey` because their options are positional.
 * Accepting that unlocked two whole families, and it also opened the door to the worst bug in this
 * codebase's history: comparing an index with a letter, which marks every attempt wrong while looking
 * completely healthy from the outside. These tests exist to hold that door shut.
 */

import { readdirSync, readFileSync } from 'node:fs';
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

describe('a numeric key that is not an option index is refused', () => {
  it('does not treat a placement ratio as an index', () => {
    // QUANT-GLYPHNUM-01 declares deterministic_key and stores a target ratio like 0.235294, to be
    // marked against a tolerance. Truncating that to an index marks option 0 correct on every item in
    // the bank and everything else wrong, scored and counted, with nothing on the surface to show it.
    const item = firstItem('QUANT-GLYPHNUM-01');
    expect(Number.isInteger(item.answer.correctKey)).toBe(false);
    expect(scoreResponse(item, { selectedIndex: 0 })).toBeNull();
    expect(scoreResponse(item, { selectedIndex: 1 })).toBeNull();
  });

  it('keeps such a type out of the servable pool entirely', () => {
    expect(loadBanks().get('QUANT-GLYPHNUM-01')?.scorable.length ?? 0).toBe(0);
  });

  it('refuses a fractional response against a whole key', () => {
    const item = firstItem('VER-RELPAIR-01');
    expect(scoreResponse(item, { selectedIndex: 1.5 })).toBeNull();
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

describe('the whole library, not just the type that broke', () => {
  /**
   * 1b.7 asked whether QUANT-GLYPHNUM-01 was the only type declaring `deterministic_key` over a key
   * that is not an option index. Answering it once in a terminal proves nothing about the next bank
   * import, and the lesson of that bug is that `scoring.mode` is a claim and not a fact. So the sweep
   * lives here.
   *
   * The invariant, not the count: a record whose numeric key is not a whole option index must never be
   * servable, whatever its type and whatever its mode says. Asserting the count instead would go red on
   * every legitimate bank change and teach everyone to update the number without reading why.
   */
  const banks = loadBanks();

  function nonIndexNumericKeyed(record: BankRecord): boolean {
    const key = record.answer?.correctKey;
    return typeof key === 'number' && (!Number.isInteger(key) || key < 0);
  }

  it('serves no item whose numeric key is not a whole option index', () => {
    const offenders: string[] = [];
    for (const bank of banks.values()) {
      for (const item of bank.scorable) {
        if (nonIndexNumericKeyed(item)) {
          offenders.push(`${bank.typeCode} ${item.itemId} key=${item.answer.correctKey}`);
        }
      }
    }
    expect(offenders, `these are in the pool and cannot be marked as an index`).toEqual([]);
  });

  it('cannot mark a non-index numeric key, whichever index is reported', () => {
    // Read the raw files rather than the pool, since the pool is the thing that excluded them.
    for (const file of readdirSync(BANK_DIR).filter((f) => f.endsWith('.jsonl'))) {
      for (const line of readFileSync(join(BANK_DIR, file), 'utf8').split('\n')) {
        if (!line.trim()) continue;
        const record = JSON.parse(line) as BankRecord;
        if (record.scoring?.mode !== 'deterministic_key' || !nonIndexNumericKeyed(record)) continue;
        const where = `${record.typeCode} ${record.itemId}`;
        const truncated = Math.trunc(record.answer.correctKey as number);
        expect(scoreResponse(record, { selectedIndex: 0 }), where).toBeNull();
        expect(scoreResponse(record, { selectedIndex: truncated }), where).toBeNull();
      }
    }
  });

  it('every servable item can actually be marked both ways', () => {
    // The other half of the guard: holding back the unmarkable is only correct if what remains marks.
    for (const bank of banks.values()) {
      for (const item of bank.scorable) {
        const key = item.answer.correctKey;
        const where = `${bank.typeCode} ${item.itemId}`;
        // Three key styles now, since 1b.6 made a cell-set type servable. Each is marked down its own path and
        // they never meet, which is the same care the two original styles get.
        if (typeof key === 'string' && key.includes(',')) {
          const cells = key.split('|');
          expect(scoreResponse(item, { cells }), where).toBe(true);
          expect(scoreResponse(item, { cells: cells.slice(0, -1) }), where).toBe(false);
        } else if (typeof key === 'number') {
          expect(scoreResponse(item, { selectedIndex: key }), where).toBe(true);
          expect(scoreResponse(item, { selectedIndex: key + 1 }), where).toBe(false);
        } else {
          expect(scoreResponse(item, { key }), where).toBe(true);
          expect(scoreResponse(item, { key: key === 'A' ? 'B' : 'A' }), where).toBe(false);
        }
      }
    }
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

describe('a cell-set answer is marked as a set', () => {
  /**
   * 1b.6, starting with the one true Paper Folding type. `scoring.mode` says `computed_solver`, which reads as
   * "a solver must work this out" — and is wrong for the second time in this file's history. All 1,774
   * `computed_solver` items across 15 types carry a fully-formed `correctKey`; the solving happened when the
   * bank was authored. The mode really means "the key is not a single option letter".
   */
  const punch = loadBanks().get('SPA-PUNCH-01')!;

  it('serves all 140 items, excluding none', () => {
    expect(punch.scorable).toHaveLength(140);
    expect(punch.excluded).toEqual({});
  });

  it('ignores the order cells were tapped in', () => {
    for (const item of punch.scorable.slice(0, 30)) {
      const cells = (item.answer.correctKey as string).split('|');
      expect(scoreResponse(item, { cells }), item.itemId).toBe(true);
      expect(scoreResponse(item, { cells: [...cells].reverse() }), item.itemId).toBe(true);
    }
  });

  it('refuses a subset and a superset, not just a wrong cell', () => {
    /**
     * The prompt is "tap every square that will have a hole", so all of it and only it. Accepting a subset would
     * reward finding one hole out of eight; accepting a superset would reward tapping the whole grid. Both are
     * the wrong answer, and a lenient comparison here would quietly inflate every estimate.
     */
    // A 4x4 grid can have all 16 cells punched, so the extra cell has to be one this answer actually lacks —
    // appending a cell the key already contains is a no-op and would pass for the wrong reason.
    const item = punch.scorable.find((i) => {
      const n = (i.answer.correctKey as string).split('|').length;
      return n >= 4 && n < 16;
    })!;
    const cells = (item.answer.correctKey as string).split('|');
    const grid = (item.content.grid as { n: number }).n;
    const extra = Array.from({ length: grid * grid }, (_, k) => `${k % grid},${Math.floor(k / grid)}`).find(
      (c) => !cells.includes(c),
    )!;
    expect(scoreResponse(item, { cells: cells.slice(0, 2) })).toBe(false);
    expect(scoreResponse(item, { cells: [...cells, extra] })).toBe(false);
  });

  it('returns unscorable, not wrong, for a response it cannot read', () => {
    expect(scoreResponse(punch.scorable[0]!, { nothing: true })).toBeNull();
    expect(scoreResponse(punch.scorable[0]!, { cells: ['bad'] })).toBeNull();
  });

  it('marks every servable item both right and wrong', () => {
    // Over the whole bank rather than a sample, the same way the index-keyed types are covered above.
    for (const item of punch.scorable) {
      const cells = (item.answer.correctKey as string).split('|');
      expect(scoreResponse(item, { cells }), item.itemId).toBe(true);
      expect(scoreResponse(item, { cells: cells.slice(0, -1) }), item.itemId).toBe(false);
    }
  });
});
