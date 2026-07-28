import { describe, expect, it } from 'vitest';

import { saveExamSessionRequestSchema } from './types';

const validRequest = {
  applicationId: '00000000-0000-4000-8000-000000000001',
  session: {
    sessionId: 'SESS-SYN-ABC123',
    participantCode: 'PART-SYN-ABC123',
    studentName: 'Synthetic Learner',
    ageBand: '4-5',
    startedAt: '2026-07-25T16:00:00.000Z',
    finishedAt: '2026-07-25T16:12:00.000Z',
    items: [
      {
        typeCode: 'SYN_PATTERN',
        domain: 'reasoning',
        skipped: false,
        metrics: { 'M-ACC': '0.8' },
        accuracy: 0.8,
        difficultyReached: 4,
      },
    ],
    syntheticOnly: true as const,
  },
  idempotencyKey: '00000000-0000-4000-8000-000000000299',
  correlationId: '00000000-0000-4000-8000-000000000300',
};

describe('saveExamSessionRequestSchema', () => {
  it('accepts a well-formed synthetic request (nullable applicationId included)', () => {
    expect(saveExamSessionRequestSchema.safeParse(validRequest).success).toBe(true);
    expect(
      saveExamSessionRequestSchema.safeParse({ ...validRequest, applicationId: null }).success,
    ).toBe(true);
  });

  it('rejects a participant code outside the PART-SYN- namespace', () => {
    const bad = {
      ...validRequest,
      session: { ...validRequest.session, participantCode: 'REAL-1234' },
    };
    expect(saveExamSessionRequestSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a session that is not marked synthetic-only', () => {
    const bad = {
      ...validRequest,
      session: { ...validRequest.session, syntheticOnly: false },
    };
    expect(saveExamSessionRequestSchema.safeParse(bad).success).toBe(false);
  });
});
