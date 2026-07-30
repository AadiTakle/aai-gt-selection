import { createHash, randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { type ScoredItem } from './../types';
import {
  UncanonicalScorerInputError,
  canonicalScorerInput,
  scorerInputFingerprint,
  sha256Hex,
} from './scorer-input-hash';
import { EXPECTED_CANONICAL, EXPECTED_HASH, VECTOR_TRACE } from './scorer-input-hash.vector';

/**
 * The divergence guard.
 *
 * There are two implementations of the scorer-input fingerprint: `app.exam_scorer_input_hash` in
 * the database and `scorerInputFingerprint` here. They are the two ends of the recompute-and-
 * compare gate R7 rests on, so a difference between them is not a cosmetic inconsistency — it is
 * an audit path that reports "verified" while comparing two values that can never be equal.
 *
 * These assertions are half of the guard. The other half is
 * `supabase/tests/140_exam_scorer_input_hash_parity.test.sql`, which asserts the SAME literals
 * against the real database over the same rows, and which CI runs (`ci.yml` -> `pnpm db:test`).
 * The literals live in `scorer-input-hash.vector.ts` and were computed by Postgres, so:
 *
 *   - move the TypeScript implementation  -> this file fails;
 *   - move the SQL implementation         -> the pgTAP file fails;
 *   - "fix" a red vector to match the code -> the other suite fails.
 *
 * Verified by breaking each side on purpose and watching the matching suite go red.
 */

const CONTRACT_SHAPE = /^sha256:[0-9a-f]{64}$/;

describe('scorer input fingerprint agrees with app.exam_scorer_input_hash', () => {
  it('reproduces the canonical text Postgres renders for the same trace', () => {
    expect(canonicalScorerInput(VECTOR_TRACE)).toBe(EXPECTED_CANONICAL);
  });

  it('reproduces the hash the database recorded for the same trace', () => {
    expect(scorerInputFingerprint(VECTOR_TRACE)).toBe(EXPECTED_HASH);
  });

  it('satisfies the shape packages/contracts and the outcome column require', () => {
    // application.ts: assessmentRoutingSchema.inputHash; and the CHECK on
    // app.exam_session_outcome.scorer_input_hash.
    expect(scorerInputFingerprint(VECTOR_TRACE)).toMatch(CONTRACT_SHAPE);
  });

  it('hashes the canonical text and nothing else', () => {
    // Pins the composition too: a future change that hashed some other string would still satisfy
    // the shape check above.
    const expected = createHash('sha256')
      .update(canonicalScorerInput(VECTOR_TRACE), 'utf8')
      .digest('hex');
    expect(scorerInputFingerprint(VECTOR_TRACE)).toBe(`sha256:${expected}`);
  });
});

describe('the jsonb rendering rules the database uses', () => {
  const base: ScoredItem = {
    itemId: 'i',
    typeCode: 't',
    domain: 'verbal',
    difficulty: 3,
    correct: true,
    score: 1,
    metrics: {},
  };

  it('orders object keys by byte length, then by byte value', () => {
    // Postgres 17: select jsonb_build_object('bb','x','b','y','aa','z','a','w','ba','v')::text;
    const rendered = canonicalScorerInput([
      { ...base, metrics: { bb: 5, b: 2, aa: 4, a: 1, ba: 3 } as ScoredItem['metrics'] },
    ]);
    expect(rendered).toContain('{"a": 1, "b": 2, "aa": 4, "ba": 3, "bb": 5}');
  });

  it('escapes strings the way Postgres does', () => {
    // Postgres 17: select jsonb_build_object('k', E'q" b\\ t\t n\n c\x1f del\x7f e\u00e9')::text;
    const rendered = canonicalScorerInput([
      { ...base, itemId: 'q" b\\ t\t n\n c\u001f del\u007f e\u00e9' },
    ]);
    expect(rendered).toContain('"itemId": "q\\" b\\\\ t\\t n\\n c\\u001f del\u007f e\u00e9"');
  });

  it("includes metrics, because the database's canonical input includes them", () => {
    // The previous implementation deliberately excluded metrics. That is exactly the kind of
    // "sensible on its own" choice that made the two fingerprints incomparable.
    const withMetric = canonicalScorerInput([{ ...base, metrics: { 'M-RT': 900 } }]);
    expect(withMetric).not.toBe(canonicalScorerInput([base]));
  });

  it('drops a key whose value is undefined, as a JSON round-trip would', () => {
    // A key that is present-but-undefined cannot be typed, but it reaches this function from
    // JSON payloads and object spreads, so the behaviour still has to be defined.
    const sparse = { ...base, metrics: { 'M-RT': undefined } as unknown as ScoredItem['metrics'] };
    expect(canonicalScorerInput([sparse])).toBe(canonicalScorerInput([base]));
  });

  it('refuses a number Postgres numeric would not render the same way', () => {
    const tiny = { ...base, metrics: { 'M-RT': 1e-7 } };
    expect(() => scorerInputFingerprint([tiny])).toThrow(UncanonicalScorerInputError);
    expect(() => scorerInputFingerprint([{ ...base, score: Number.NaN }])).toThrow(
      UncanonicalScorerInputError,
    );
  });
});

describe('the SHA-256 this module carries instead of node:crypto', () => {
  it('matches node:crypto across lengths that straddle the block and padding boundaries', () => {
    for (const length of [0, 1, 55, 56, 63, 64, 65, 119, 120, 127, 128, 1000]) {
      const bytes = randomBytes(length);
      expect(sha256Hex(new Uint8Array(bytes)), `length ${length}`).toBe(
        createHash('sha256').update(bytes).digest('hex'),
      );
    }
  });

  it('matches the FIPS 180-4 example digest', () => {
    expect(sha256Hex(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
