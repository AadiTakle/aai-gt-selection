import { describe, expect, it } from 'vitest';

import { type Domain, type ScoredItem } from './../types';
import { handler, scorerInputFingerprint } from './handler';

let counter = 0;

function item(
  difficulty: number,
  correct: boolean,
  domain: Domain = 'fluid_reasoning',
): ScoredItem {
  return {
    itemId: `lambda-${(counter += 1)}`,
    typeCode: 'SYN-TYPE-01',
    domain,
    metrics: {},
    telemetry: [],
    correct,
    score: correct ? 1 : 0,
    difficulty,
  };
}

const TRACE = [item(8, true), item(10, true), item(12, false), item(14, false)];

describe('scoring lambda handler', () => {
  it('scores a session and reports how many items it read', () => {
    const response = handler({ sessionId: 'SESS-SYN-1', scoredItems: TRACE });
    expect(response.ok).toBe(true);
    expect(response.sessionId).toBe('SESS-SYN-1');
    expect(response.itemsScored).toBe(TRACE.length);
    expect(response.outcome).not.toBeNull();
  });

  it('is reproducible: the same trace gives the same score and the same fingerprint', () => {
    const first = handler({ sessionId: 'S', scoredItems: TRACE });
    const second = handler({ sessionId: 'S', scoredItems: TRACE });
    expect(second.inputHash).toBe(first.inputHash);
    expect(second.outcome).toEqual(first.outcome);
  });

  it('changes the fingerprint when a scored value changes', () => {
    const altered = [...TRACE.slice(0, 3), { ...TRACE[3]!, correct: true, score: 1 }];
    expect(scorerInputFingerprint(altered)).not.toBe(scorerInputFingerprint(TRACE));
  });

  it('ignores payload fields the database does not put in its canonical input', () => {
    // `telemetry` is on the event but not on `app.exam_scorer_input_json`, so it must not move the
    // fingerprint. `metrics` IS in the database's canonical input and therefore does move it —
    // see scorer-input-hash.test.ts.
    const withExtras = TRACE.map((i) => ({ ...i, telemetry: [{ t: 12, type: 'focus' }] }));
    expect(scorerInputFingerprint(withExtras)).toBe(scorerInputFingerprint(TRACE));
  });

  it('reports the fingerprint in the sha256 form the contract and the database require', () => {
    const response = handler({ sessionId: 'S', scoredItems: TRACE });
    expect(response.inputHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('refuses rather than return a fingerprint the database could not reproduce', () => {
    const response = handler({
      sessionId: 'S',
      scoredItems: [...TRACE, { ...TRACE[0]!, itemId: 'tiny', metrics: { 'M-RT': 1e-7 } }],
    });
    expect(response.ok).toBe(false);
    expect(response.error).toBe('UNCANONICAL_SCORER_INPUT');
    expect(response.inputHash).toBeNull();
  });

  describe('refuses rather than throwing, so the caller can always record something', () => {
    it('rejects a missing session id', () => {
      const response = handler({ sessionId: '', scoredItems: TRACE });
      expect(response.ok).toBe(false);
      expect(response.error).toBe('MISSING_SESSION_ID');
    });

    it('rejects an empty trace', () => {
      const response = handler({ sessionId: 'S', scoredItems: [] });
      expect(response.ok).toBe(false);
      expect(response.error).toBe('NO_SCORED_ITEMS');
      expect(response.outcome).toBeNull();
    });

    it('rejects a malformed item instead of scoring around it', () => {
      const response = handler({
        sessionId: 'S',
        scoredItems: [...TRACE, { itemId: 'bad' } as unknown as ScoredItem],
      });
      expect(response.ok).toBe(false);
      expect(response.error).toBe('MALFORMED_SCORED_ITEM');
    });
  });
});
