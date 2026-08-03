import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET, POST } from './route';

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://127.0.0.1/api/exam-results', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validSession = {
  sessionId: 'SESS-SYN-ABC123',
  participantCode: 'PART-SYN-ABC123',
  studentName: 'Rivera',
  ageBand: '4-5',
  startedAt: '2026-07-24T10:00:00.000Z',
  finishedAt: '2026-07-24T10:11:00.000Z',
  syntheticOnly: true as const,
  items: [
    {
      typeCode: 'FLU-MATRIX-01',
      domain: 'fluid_reasoning',
      skipped: false,
      metrics: { 'M-ACC': '4/6  67%', 'M-DIFFREACH': 'L5 · 3 rules' },
      accuracy: 4 / 6,
      difficultyReached: 5,
    },
    {
      typeCode: 'VER-CLOZE-01',
      domain: 'verbal',
      skipped: false,
      metrics: { 'M-ACC': '6/6  100%' },
      accuracy: 1,
      difficultyReached: null,
    },
    {
      typeCode: 'SPA-ROLL-01',
      domain: 'spatial',
      skipped: true,
      metrics: {},
      accuracy: null,
      difficultyReached: null,
    },
  ],
};

describe('POST /api/exam-results', () => {
  it('stores a valid session and computes the summary server-side', async () => {
    const res = await POST(postRequest(validSession));
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      ok: boolean;
      summary: {
        overallAccuracy: number;
        perDomainAccuracy: Record<string, number>;
        meanDifficultyReached: number | null;
        itemsAnswered: number;
        itemsSkipped: number;
      };
    };
    expect(data.ok).toBe(true);
    // (0.6667 + 1) / 2 ≈ 0.833; only the two answered items count
    expect(data.summary.overallAccuracy).toBeCloseTo((4 / 6 + 1) / 2, 5);
    expect(data.summary.itemsAnswered).toBe(2);
    expect(data.summary.itemsSkipped).toBe(1);
    expect(data.summary.perDomainAccuracy.verbal).toBeCloseTo(1, 5);
    // only one answered item had a difficulty (L5)
    expect(data.summary.meanDifficultyReached).toBeCloseTo(5, 5);
  });

  it('reads stored sessions back via GET (newest first)', async () => {
    await POST(postRequest({ ...validSession, sessionId: 'SESS-SYN-NEWEST' }));
    const res = await GET();
    const data = (await res.json()) as { sessions: { sessionId: string }[] };
    expect(data.sessions.length).toBeGreaterThan(0);
    expect(data.sessions[0]!.sessionId).toBe('SESS-SYN-NEWEST');
  });

  it('rejects a malformed session', async () => {
    const res = await POST(postRequest({ sessionId: 'x', items: [] }));
    expect(res.status).toBe(422);
    const data = (await res.json()) as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toBe('VALIDATION_FAILED');
  });

  it('rejects a non-synthetic participant code', async () => {
    const res = await POST(postRequest({ ...validSession, participantCode: 'REAL-KID-01' }));
    expect(res.status).toBe(422);
  });
});
