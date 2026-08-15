import { describe, expect, it } from 'vitest';
import type { AnswerKeyRecord } from '@platform/domain';
import { markAgainstKey, markResponse } from './mark.js';

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

describe('a response too fast to be an attempt', () => {
  const item = {
    difficulty: 11,
    content: { stem: 'which shape completes the pattern', options: [{ key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }] },
  };

  it('is unscorable rather than wrong, and says why', () => {
    const outcome = markResponse({
      key: key('B'),
      response: { key: 'B' },
      latencyMs: 10,
      ...item,
    });
    // Not `false`. A tap that fast is evidence about the interface, not about the child, and counting it
    // against them would let a bored moment lower an estimate.
    expect(outcome.correct).toBeNull();
    expect(outcome.flags).toContain('rapid-guess');
  });

  it('does not spare a wrong answer given real time', () => {
    const outcome = markResponse({ key: key('B'), response: { key: 'C' }, latencyMs: 6000, ...item });
    expect(outcome.correct).toBe(false);
    expect(outcome.flags).toEqual([]);
  });

  it('marks a correct answer given real time', () => {
    const outcome = markResponse({ key: key('B'), response: { key: 'B' }, latencyMs: 6000, ...item });
    expect(outcome.correct).toBe(true);
    expect(outcome.flags).toEqual([]);
  });

  it('scales its floor with how much there was to take in', () => {
    // More to read and more to weigh means more time before a response is credible.
    const heavy = {
      difficulty: 11,
      content: {
        stem: 'read the following passage carefully and decide which of the nine statements below follows from it without adding anything of your own',
        options: Array.from({ length: 9 }, (_u, i) => ({ key: String(i) })),
      },
    };
    const atNineHundred = markResponse({ key: key('0'), response: { key: '0' }, latencyMs: 900, ...heavy });
    const lightAtNineHundred = markResponse({ key: key('B'), response: { key: 'B' }, latencyMs: 900, ...item });
    expect(atNineHundred.flags).toContain('rapid-guess');
    expect(lightAtNineHundred.flags).toEqual([]);
  });

  it('does not flag a response with no timing at all', () => {
    // A caller that omits latency is not asserting the child was fast.
    const outcome = markResponse({ key: key('B'), response: { key: 'B' }, latencyMs: null, ...item });
    expect(outcome.flags).toEqual([]);
    expect(outcome.correct).toBe(true);
  });
});

describe('a question that was never really asked', () => {
  it('marks a no-audio response unscorable rather than wrong', () => {
    /**
     * `VER-RELPAIR-01` is spoken and draws empty bowls. On a machine with no speech synthesis the item contains
     * nothing, and the child is choosing between four indistinguishable cradles. Scoring that guess put noise
     * into the ability estimate as though it were evidence about the child.
     */
    const outcome = markResponse({
      key: key('A'),
      response: { key: 'A', selectedKey: 'A', selectedIndex: 0 },
      latencyMs: 8000,
      difficulty: 10,
      content: {},
      clientFlags: ['no-audio'],
    });
    expect(outcome.correct).toBeNull();
    expect(outcome.flags).toContain('no-audio');
  });

  it('does not let a made-up flag dodge marking', () => {
    // Only an allowlist is honoured, so a caller cannot decline to be scored by inventing a reason.
    const outcome = markResponse({
      key: key('A'),
      response: { key: 'A', selectedKey: 'A', selectedIndex: 0 },
      latencyMs: 8000,
      difficulty: 10,
      content: {},
      clientFlags: ['too-hard', 'i-was-not-ready'],
    });
    expect(outcome.correct).not.toBeNull();
  });

  it('still marks normally when no flags are sent', () => {
    const outcome = markResponse({
      key: key('A'),
      response: { key: 'A', selectedKey: 'A', selectedIndex: 0 },
      latencyMs: 8000,
      difficulty: 10,
      content: {},
    });
    expect(outcome.correct).not.toBeNull();
  });
});
