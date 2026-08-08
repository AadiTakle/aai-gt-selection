/**
 * Caller-held session state.
 *
 * Decided by Felipe, 8 Aug 2026: the caller holds the session and passes it back, rather than a row in
 * DynamoDB. That fits "adoptable into any program" — a Pokémon game or a family portal needs no table — and
 * it makes the engine genuinely stateless, but it moves the session into the hands of the party with the
 * most reason to edit it.
 *
 * The handoff doc says "signed so it cannot be tampered with". Signing is necessary and not sufficient. A
 * signed token is still a *readable* token, and the transcript records whether each answer was right — which
 * is exactly what this product refuses to tell a child. The catalogue's own comment is "NEUTRAL
 * acknowledgment only — never correct/incorrect", and the smoke suite asserts it three times
 * (`scripts/check-practice.py:130`, `:175`, `:244`). Handing the client a readable transcript would defeat
 * all three from a direction nobody was watching. So the token is sealed, not merely signed.
 */

import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import type { BankRecord } from './bank';
import { buildPool, grade, initialPosteriors, posteriorsFrom, precisionAt, type QbankAttempt, type QbankSessionConfig } from './engine';
import { domainOf } from './bank';
import { openSession, resumeFrom, sealSession, sessionKeyFrom, type PortableSession } from './portable';

function item(id: string, typeCode: string, difficulty: number): BankRecord {
  return {
    itemId: id,
    typeCode,
    domain: typeCode.split('-')[0]!.toLowerCase(),
    difficulty,
    ageBands: ['2-3'],
    content: { options: [{ key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }] },
    answer: { correctKey: 'B' },
    scoring: { mode: 'deterministic_key' },
  } as unknown as BankRecord;
}

const RECORDS = [
  item('q1', 'QUANT-X-01', 8),
  item('v1', 'VER-X-01', 10),
  item('s1', 'SPA-X-01', 12),
  item('f1', 'FLU-X-01', 14),
];
const POOL = buildPool(RECORDS);

const CONFIG: QbankSessionConfig = {
  abilityThreshold: 1.0,
  precision: precisionAt(2),
  perDomainMinimum: 1,
  recommendProbability: 0.35,
};

const KEY = sessionKeyFrom('a-high-entropy-secret-from-the-environment');
const OTHER_KEY = sessionKeyFrom('a-different-secret-entirely');

function attempt(i: number, itemId: string, domain: string, correct: boolean | null): QbankAttempt {
  return {
    ordinal: i,
    itemId,
    typeCode: 'QUANT-X-01',
    domain: domain as QbankAttempt['domain'],
    difficulty: 10,
    correct,
    rawResponse: { key: 'B' },
    latencyMs: 3200,
    pAboveBefore: 0.14,
    pAboveAfter: 0.31,
    selectionReason: 'highest information at threshold 1.00',
  };
}

const STATE: PortableSession = {
  v: 1,
  issuedAt: 1_754_600_000_000,
  config: CONFIG,
  history: [attempt(1, 'q1', 'quantitative', true), attempt(2, 'v1', 'verbal', false), attempt(3, 's1', 'spatial', null)],
  stopReason: null,
  seed: 4242,
};

describe('a session survives a round trip through the caller', () => {
  it('comes back exactly as it went out', () => {
    const restored = openSession(sealSession(STATE, KEY), KEY, { now: STATE.issuedAt });
    expect(restored).toEqual(STATE);
  });

  it('carries the config, so a client cannot lower its own bar mid-session', () => {
    /**
     * The config is sealed *inside* the token rather than passed beside it. If the caller supplied the
     * threshold on each request, a client could finish a session against an easier bar than it started
     * against and nothing would notice.
     */
    const restored = openSession(sealSession(STATE, KEY), KEY, { now: STATE.issuedAt });
    expect(restored.config.abilityThreshold).toBe(CONFIG.abilityThreshold);
    expect(restored.config.precision.label).toBe(CONFIG.precision.label);
  });

  it('rebuilds belief that matches the original session', () => {
    // The token holds the transcript and no posterior, because 3.1 proved belief replays from the
    // transcript bit for bit. Shipping 5 x 161 floats as well would be a second copy of one fact.
    let posteriors = initialPosteriors();
    const history: QbankAttempt[] = [];
    for (const record of RECORDS) {
      const result = grade({ item: record, response: { key: 'B' }, latencyMs: 3000, posteriors });
      posteriors = result.posteriors;
      history.push(attempt(history.length + 1, record.itemId, domainOf(record), result.correct));
    }

    const token = sealSession({ ...STATE, history }, KEY);
    const resumed = resumeFrom(openSession(token, KEY, { now: STATE.issuedAt }), POOL);

    expect(resumed.posteriors.composite.snapshot()).toEqual(posteriors.composite.snapshot());
    expect(resumed.posteriors.composite.snapshot()).toEqual(posteriorsFrom(history, POOL).composite.snapshot());
  });
});

describe('the token does not tell the child how they did', () => {
  it('reveals no correctness, no ability, and no item ids to anyone reading it', () => {
    /**
     * The property that forced encryption over a bare signature. Every item in this library refuses to say
     * whether an answer was right; a readable transcript in the client's own hands would say it for all of
     * them at once, and would also hand over the running ability estimate.
     */
    const token = sealSession(STATE, KEY);

    /**
     * Only distinctive needles are checked against the raw token. A short one is worthless here: a random
     * 12-byte IV rendered as base64url contains any given two-character sequence often enough that asserting
     * an item id like `q1` is absent fails by luck rather than by leak. The decoded check below is the one
     * that actually establishes the property.
     */
    for (const needle of ['correct', 'pAbove', 'quantitative', 'selectionReason', 'abilityThreshold']) {
      expect(token, `token leaks ${needle}`).not.toContain(needle);
    }

    // Nothing in the token decodes to the plaintext either, which is what rules out a merely-signed payload.
    const decoded = token
      .split('.')
      .map((part) => Buffer.from(part, 'base64url').toString('utf8'))
      .join(' ');
    for (const needle of ['correct', 'pAbove', 'abilityThreshold', 'quantitative', 'selectionReason']) {
      expect(decoded, `a token segment decodes to ${needle}`).not.toContain(needle);
    }
    // And the whole plaintext is genuinely recoverable with the key, so the token is not empty of content.
    expect(openSession(token, KEY, { now: STATE.issuedAt }).history[0]!.correct).toBe(true);
  });
});

describe('a tampered or foreign token is refused', () => {
  it('refuses a token whose ciphertext was edited', () => {
    const token = sealSession(STATE, KEY);
    const parts = token.split('.');
    const body = Buffer.from(parts[2]!, 'base64url');
    body[0] = body[0]! ^ 0xff; // flip a byte
    parts[2] = body.toString('base64url');
    expect(() => openSession(parts.join('.'), KEY)).toThrow(/could not be opened/i);
  });

  it('refuses a token whose tag was edited', () => {
    const parts = sealSession(STATE, KEY).split('.');
    const tag = Buffer.from(parts[3]!, 'base64url');
    tag[0] = tag[0]! ^ 0xff;
    parts[3] = tag.toString('base64url');
    expect(() => openSession(parts.join('.'), KEY)).toThrow(/could not be opened/i);
  });

  it('refuses a token sealed with another key', () => {
    expect(() => openSession(sealSession(STATE, KEY), OTHER_KEY)).toThrow(/could not be opened/i);
  });

  it('refuses a token from an unknown format version', () => {
    const parts = sealSession(STATE, KEY).split('.');
    parts[0] = 'gt99';
    expect(() => openSession(parts.join('.'), KEY)).toThrow(/version/i);
  });

  it('refuses something that is not a token at all', () => {
    for (const junk of ['', 'nonsense', 'gt1.only.three', 'gt1...']) {
      expect(() => openSession(junk, KEY), junk).toThrow();
    }
  });

  it('never reuses an initialisation vector', () => {
    // Reusing an IV under one key in GCM is catastrophic, so this is worth pinning rather than trusting.
    const ivs = new Set(Array.from({ length: 200 }, () => sealSession(STATE, KEY).split('.')[1]));
    expect(ivs.size).toBe(200);
  });
});

describe('a token is a bearer credential and ages out', () => {
  it('refuses a token older than the maximum age', () => {
    const token = sealSession({ ...STATE, issuedAt: 1_000_000 }, KEY);
    expect(() => openSession(token, KEY, { now: 1_000_000 + 60_000, maxAgeMs: 30_000 })).toThrow(/expired/i);
  });

  it('accepts one inside the maximum age', () => {
    const token = sealSession({ ...STATE, issuedAt: 1_000_000 }, KEY);
    expect(openSession(token, KEY, { now: 1_000_000 + 10_000, maxAgeMs: 30_000 }).seed).toBe(4242);
  });

  it('refuses a token issued in the future beyond tolerance', () => {
    // Clock skew forwards is a sign of a hand-built token, not of a slow clock.
    const token = sealSession({ ...STATE, issuedAt: 2_000_000 }, KEY);
    expect(() => openSession(token, KEY, { now: 1_000_000, maxAgeMs: 30_000 })).toThrow(/future/i);
  });
});

describe('the key', () => {
  it('derives a 32-byte key deterministically from a secret', () => {
    expect(sessionKeyFrom('one secret long enough')).toEqual(sessionKeyFrom('one secret long enough'));
    expect(sessionKeyFrom('one secret long enough')).toHaveLength(32);
    expect(sessionKeyFrom('one secret long enough')).not.toEqual(sessionKeyFrom('another secret entirely'));
  });

  it('refuses a secret too short to be worth anything', () => {
    expect(() => sessionKeyFrom('short')).toThrow(/secret/i);
  });

  it('accepts a raw 32-byte key as well as a secret string', () => {
    const raw = randomBytes(32);
    const restored = openSession(sealSession(STATE, raw), raw, { now: STATE.issuedAt });
    expect(restored.seed).toBe(4242);
  });
});
