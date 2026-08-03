import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isExamPersistenceConfigured,
  persistItemResponse,
  persistOutcome,
  resetExamPersistenceForTests,
  startPersistedSession,
  toTelemetryRows,
} from './persistence';

import type { RawBankItem } from './bank-loader';

/**
 * Persistence must never be able to break a child's exam (BUILD_PLAN §6).
 * These cover the two failure shapes that matter: not configured at all, and
 * configured but unreachable. Both must return a falsy result quietly rather
 * than throw. The happy path needs a live database and lives in
 * `persistence.integration.test.ts`.
 */

const ORIGINAL_ENV = { ...process.env };

const item: RawBankItem = {
  itemId: '11111111-1111-4111-8111-111111111111',
  typeCode: 'FLU-MATRIX-01',
  domain: 'fluid_reasoning',
  difficulty: 10,
  ageBands: ['4-5'],
  content: { prompt: 'x' },
  answer: { correctKey: 'B' },
  syntheticOnly: true,
  validated: false,
};

beforeEach(() => {
  resetExamPersistenceForTests();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetExamPersistenceForTests();
  vi.restoreAllMocks();
});

describe('exam persistence configuration', () => {
  it('is off unless explicitly enabled', () => {
    delete process.env.GT_EXAM_PERSISTENCE_ENABLED;
    expect(isExamPersistenceConfigured()).toBe(false);
  });

  it('stays off when enabled without proctor credentials', () => {
    process.env.GT_EXAM_PERSISTENCE_ENABLED = 'true';
    delete process.env.GT_EXAM_PROCTOR_EMAIL;
    delete process.env.GT_EXAM_PROCTOR_PASSWORD;
    expect(isExamPersistenceConfigured()).toBe(false);
  });

  it('stays off when the Supabase environment is missing', () => {
    process.env.GT_EXAM_PERSISTENCE_ENABLED = 'true';
    process.env.GT_EXAM_PROCTOR_EMAIL = 'admissions@example.test';
    process.env.GT_EXAM_PROCTOR_PASSWORD = 'irrelevant';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(isExamPersistenceConfigured()).toBe(false);
  });
});

describe('exam persistence degrades instead of throwing', () => {
  it('returns null for every write when persistence is not configured', async () => {
    delete process.env.GT_EXAM_PERSISTENCE_ENABLED;

    await expect(
      startPersistedSession({ participantCode: 'PART-SYN-ABC', gradeBand: '4-5' }),
    ).resolves.toBeNull();
    await expect(
      persistItemResponse({
        examSessionId: '22222222-2222-4222-8222-222222222222',
        item,
        metricIds: ['M-ACC'],
        rawAnswer: { selectedKey: 'B' },
        metrics: { 'M-ACC': 1 },
        telemetry: [],
      }),
    ).resolves.toBeNull();
  });

  it('returns falsy when Supabase is configured but unreachable', async () => {
    process.env.GT_EXAM_PERSISTENCE_ENABLED = 'true';
    process.env.GT_EXAM_PROCTOR_EMAIL = 'admissions@example.test';
    process.env.GT_EXAM_PROCTOR_PASSWORD = 'Synthetic-Only-2026!';
    // Loopback so the app's own non-loopback guard passes; nothing listens here.
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:1';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_unreachable';

    expect(isExamPersistenceConfigured()).toBe(true);
    await expect(
      startPersistedSession({ participantCode: 'PART-SYN-ABC', gradeBand: '4-5' }),
    ).resolves.toBeNull();
    await expect(
      persistOutcome({
        examSessionId: '22222222-2222-4222-8222-222222222222',
        outcome: {
          perArea: {},
          composite: 7,
          profile: {
            strengths: [],
            relativeWeaknesses: [],
            rankedAreas: [],
            learningRate: { raw: null, normalized: null, label: 'unknown' },
            consistency: { raw: null, normalized: null, label: 'unknown' },
          },
          policyId: 'exam-scoring-default-v1',
          scaleMin: 1,
          scaleMax: 20,
          syntheticOnly: true,
        },
      }),
    ).resolves.toBe(false);
  });
});

describe('telemetry normalisation', () => {
  it('keeps the whole event as the payload and derives the indexed columns', () => {
    const rows = toTelemetryRows(
      [
        { type: 'pointer', tOffsetMs: 120, seq: 3, x: 4 },
        { kind: 'reveal', t: 250 },
        'not-an-object',
      ],
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );

    expect(rows[0]).toMatchObject({ kind: 'pointer', seq: 3, tOffsetMs: 120 });
    expect(rows[0]?.payload).toMatchObject({ x: 4 });
    expect(rows[1]).toMatchObject({ kind: 'reveal', tOffsetMs: 250, seq: 1 });
    // An unusable event still becomes a trace row rather than being dropped.
    expect(rows[2]).toMatchObject({ kind: 'event', tOffsetMs: 0, seq: 2 });
    expect(rows.every((row) => row.itemId === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toBe(true);
  });
});
