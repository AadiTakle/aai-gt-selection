import { describe, expect, it } from 'vitest';
import type { AnswerKeyRecord } from '@platform/domain';
import { markAgainstKey } from './mark.js';

function key(
  correctKey: string | number,
  typeCode = 'FLU-MATRIX-01',
  scoringMode: AnswerKeyRecord['scoringMode'] = 'deterministic_key',
): AnswerKeyRecord {
  return { itemId: 'i-1', typeCode, revision: 1, correctKey, scoringMode, extra: {} };
}

describe('letter keys', () => {
  it('marks the key a renderer hands back, however it addresses it', () => {
    for (const response of ['B', { key: 'B' }, { selectedKey: 'B' }, { value: 'B' }]) {
      expect(markAgainstKey(key('B'), response)).toBe(true);
    }
  });

  it('is case and whitespace insensitive', () => {
    expect(markAgainstKey(key('B'), { key: ' b ' })).toBe(true);
  });

  it('marks a different letter wrong', () => {
    expect(markAgainstKey(key('B'), { key: 'C' })).toBe(false);
  });

  it('refuses an index against a letter key rather than marking it wrong', () => {
    // The whole care in scoreResponse: comparing a position with a letter would mark a type wrong on
    // every single item, confidently, and invisibly.
    expect(markAgainstKey(key('B'), { selectedIndex: 1 })).toBeNull();
  });
});

describe('numeric index keys', () => {
  it('marks against the index the renderer reports', () => {
    expect(markAgainstKey(key(2), { selectedIndex: 2 })).toBe(true);
    expect(markAgainstKey(key(2), { index: 2 })).toBe(true);
    expect(markAgainstKey(key(2), 2)).toBe(true);
  });

  it('marks a different index wrong', () => {
    expect(markAgainstKey(key(2), { selectedIndex: 3 })).toBe(false);
  });

  it('refuses a letter against an index key', () => {
    expect(markAgainstKey(key(2), { key: 'C' })).toBeNull();
  });

  it('refuses a fractional key, which belongs to a rule nobody has written', () => {
    // QUANT-GLYPHNUM-01 stores a placement ratio here. Truncating it to an index would mark the first
    // option correct on every item.
    expect(markAgainstKey(key(0.235294), { selectedIndex: 0 })).toBeNull();
  });

  it('refuses a negative key', () => {
    expect(markAgainstKey(key(-1), { selectedIndex: 0 })).toBeNull();
  });
});

describe("Bramblebrook's payload", () => {
  /**
   * The game sends all three addressings at once, because its options sometimes carry a letter and
   * sometimes only a position, and sending one loses a whole family of types. Both key shapes must mark
   * correctly against it.
   */
  const payload = { key: '2', selectedKey: '2', selectedIndex: 2 };

  it('marks correct against a numeric key', () => {
    expect(markAgainstKey(key(2), payload)).toBe(true);
  });

  it('marks correct against the equivalent string key', () => {
    expect(markAgainstKey(key('2'), payload)).toBe(true);
  });

  it('marks wrong, not unscorable, when the child picked another option', () => {
    expect(markAgainstKey(key(5), payload)).toBe(false);
  });
});

describe('cell-set keys', () => {
  /**
   * The regression this file exists for. Marking dispatches on the type code, so a marker handed only the
   * key sends these down the string path and compares '0,0|0,3' against a tap — every one of the 140
   * newly servable Paper Folding items marked wrong, with nothing raised.
   */
  const punch = (k: string) => key(k, 'SPA-PUNCH-01', 'computed_solver');

  it('marks the whole set correct regardless of the order it was tapped in', () => {
    expect(markAgainstKey(punch('0,0|0,3'), { cells: '0,3|0,0' })).toBe(true);
    expect(markAgainstKey(punch('0,0|0,3'), { markedCells: ['0,0', '0,3'] })).toBe(true);
  });

  it('marks a subset wrong, since finding one hole of two is not the answer', () => {
    expect(markAgainstKey(punch('0,0|0,3'), { cells: '0,0' })).toBe(false);
  });

  it('marks a superset wrong, since tapping everything is not the answer either', () => {
    expect(markAgainstKey(punch('0,0|0,3'), { cells: '0,0|0,3|1,1' })).toBe(false);
  });

  it('refuses a response it cannot read as a set', () => {
    expect(markAgainstKey(punch('0,0|0,3'), { key: 'B' })).toBeNull();
  });

  it('would have been marked wrong if the type code were dropped', () => {
    // Pins the bug rather than only the fix: the same key on a non-cell-set type takes the string path.
    expect(markAgainstKey(key('0,0|0,3'), { cells: '0,3|0,0' })).toBeNull();
  });
});

describe('unreadable responses', () => {
  it('refuses rather than guesses', () => {
    for (const response of [undefined, null, {}, { nothing: 1 }, []]) {
      expect(markAgainstKey(key('B'), response)).toBeNull();
    }
  });
});
