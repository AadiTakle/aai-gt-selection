import {
  isDone,
  nextItem,
  nextType,
  startState,
  update,
  type ScoredItem as EngineScoredItem,
  type ServedItem,
} from '@gt-selection/exam-engine';
import { DEFAULT_EXAM_POLICY, scoreExam, type ScoredItem } from '@gt-selection/exam-scoring';
import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

import { POST as examResults } from '@/app/api/exam-results/route';
import { POST as examSession } from '@/app/api/exam-session/route';
import { POST as examSubmit } from '@/app/api/exam-submit/route';
import { EXAM_ENGINE_OVERRIDES, buildBanks } from '@/lib/exam/adaptive';
import { findBankItem, getServedIndex } from '@/lib/exam/bank-loader';
import { resetExamPersistenceForTests } from '@/lib/exam/persistence';
import { verify } from '@/lib/exam/verifiers';

import type { NextRequest } from 'next/server';

/**
 * END-TO-END TRACE PERSISTENCE against the running local Supabase.
 *
 * Drives the real route handlers (`/api/exam-session`, `/api/exam-submit`,
 * `/api/exam-results`) with the real engine, the real banks, and the real
 * per-type verifiers — the same code path a browser battery takes, minus the
 * iframe — then reads the session back out of the database through
 * `api.exam_get_session_state` / `api.exam_get_outcome` and checks that the whole
 * trace survived the round trip.
 *
 * Requires `supabase start` and `pnpm db:users`, plus GT_EXAM_PERSISTENCE_ENABLED
 * and the proctor credentials. Born-synthetic throughout.
 */

const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!apiUrl || !publishableKey) {
  throw new Error('Exam persistence integration requires the local public Supabase values.');
}

const proctor = createClient(apiUrl, publishableKey, {
  db: { schema: 'api' },
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Build a route-handler request without spinning up an HTTP server. */
function post(url: string, body: unknown): NextRequest {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

/**
 * A simulated child of fixed true ability.
 *
 * Ability versus item difficulty decides whether this child is AIMING to solve
 * the item. The harness then has to produce a raw response in whatever shape the
 * type's renderer would emit, which it cannot know for 30 constructed-response
 * types, so it enumerates the candidate encodings the banks use and asks the real
 * server-side verifier which of them the item accepts. That is a property of the
 * HARNESS standing in for 63 renderers — the submitted value is still a raw
 * response, and `/api/exam-submit` and the database each verify it independently.
 * Where no candidate is accepted the child simply gets that item wrong, which is
 * what a child who cannot drive the widget would also do.
 */
const TRUE_ABILITY = 13;

function candidateResponses(
  answer: RawBankAnswer,
  content: Record<string, unknown>,
): Record<string, unknown>[] {
  const options = Array.isArray(content.options) ? (content.options as unknown[]) : [];
  const candidates: Record<string, unknown>[] = [];

  options.forEach((option, index) => {
    const key =
      option && typeof option === 'object' ? (option as { key?: unknown }).key : undefined;
    if (typeof key === 'string') candidates.push({ selectedKey: key });
    candidates.push({ selectedIndex: index });
  });
  if (typeof answer.correctKey === 'string') {
    candidates.push({ selectedKey: answer.correctKey }, { value: answer.correctKey });
  }
  if (typeof answer.correctKey === 'number') {
    candidates.push({ selectedIndex: answer.correctKey });
  }
  if (typeof answer.optimalValue === 'number') candidates.push({ value: answer.optimalValue });
  if (typeof answer.targetRatio === 'number') candidates.push({ placedRatio: answer.targetRatio });

  // Constructed-response types: the reference artefact the bank stores under one
  // name is what the renderer would submit under another. This table covers the
  // shapes several banks share; a type it does not cover is simply answered
  // wrong, which is also what a child who cannot drive the widget would do.
  const solution = (answer.canonicalSolution ?? {}) as Record<string, unknown>;
  const shapes: [unknown, Record<string, unknown>][] = [
    [answer.correctCounts, { counts: answer.correctCounts }],
    [answer.optimalPath, { path: answer.optimalPath }],
    [answer.tileSpec, { finalBoard: answer.tileSpec }],
    [answer.targets, { selectedCells: answer.targets }],
    [answer.trueBin, { finalPlacement: answer.trueBin }],
    [solution.program, { program: solution.program }],
    [solution.placements, { assembly: solution.placements }],
    [solution.targetSlots, { selectedSlots: solution.targetSlots }],
  ];
  for (const [present, shape] of shapes) if (present != null) candidates.push(shape);

  if (Array.isArray(answer.optimalPath)) {
    candidates.push({
      actions: answer.optimalPath.slice(1).map((to) => ({ kind: 'move', to })),
    });
  }
  if (Array.isArray(answer.validWords)) {
    const target =
      typeof answer.referenceTarget === 'number'
        ? answer.referenceTarget
        : answer.validWords.length;
    candidates.push({ submissions: answer.validWords.slice(0, target) });
  }
  return candidates;
}

type RawBankAnswer = {
  correctKey: string | number;
  optimalValue?: unknown;
  targetRatio?: unknown;
  correctCounts?: unknown;
  optimalPath?: unknown[];
  tileSpec?: unknown;
  targets?: unknown;
  trueBin?: unknown;
  validWords?: unknown[];
  referenceTarget?: unknown;
  canonicalSolution?: unknown;
};

function correctProbability(difficulty: number): number {
  return 1 / (1 + Math.exp((difficulty - TRUE_ABILITY) / 2));
}

/** Deterministic PRNG so a failure is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RunResult {
  examSessionId: string;
  scoredItems: ScoredItem[];
  telemetryCount: number;
  composite: number;
  persistedItems: number;
}

let run: RunResult;

async function runBattery(): Promise<RunResult> {
  const random = mulberry32(20260725);
  const gradeBand = '4-5' as const;
  const participantCode = `PART-SYN-${Math.floor(random() * 1e9)
    .toString(36)
    .toUpperCase()}`;

  const sessionResponse = await examSession(
    post('http://127.0.0.1:3000/api/exam-session', { participantCode, gradeBand }),
  );
  const sessionBody = (await sessionResponse.json()) as { examSessionId: string | null };
  if (!sessionBody.examSessionId) {
    throw new Error('The exam session was not persisted; is GT_EXAM_PERSISTENCE_ENABLED set?');
  }
  const examSessionId = sessionBody.examSessionId;

  const banks = buildBanks((await getServedIndex()) as unknown as ServedItem[]);
  let state = startState(gradeBand, EXAM_ENGINE_OVERRIDES);
  const scoredItems: ScoredItem[] = [];
  let telemetryCount = 0;
  let persistedItems = 0;

  while (!isDone(state)) {
    const typeCode = nextType(state, banks);
    if (!typeCode) break;
    let served: ServedItem;
    try {
      served = nextItem(state, typeCode, banks);
    } catch {
      break;
    }

    const bankItem = await findBankItem(served.itemId);
    if (!bankItem) break;

    // A child at TRUE_ABILITY solves harder items less often.
    const aiming = random() < correctProbability(served.difficulty);
    const candidates = candidateResponses(bankItem.answer as RawBankAnswer, bankItem.content);
    const solving = candidates.filter((candidate) => verify(bankItem, candidate).correct);
    const missing = candidates.filter((candidate) => !verify(bankItem, candidate).correct);
    const preferred = aiming && solving.length > 0 ? solving : missing;
    const pool = preferred.length > 0 ? preferred : candidates;
    const response = pool.length
      ? pool[Math.floor(random() * pool.length) % pool.length]!
      : { selectedKey: '__no_response__' };

    const responseTime = Math.round(3000 + random() * 9000);
    const clientMetrics = {
      'M-RT': responseTime,
      'M-RTFIRST': Math.round(responseTime * 0.35),
      'M-REV': Math.floor(random() * 3),
    };
    const telemetry = [
      { kind: 'item_shown', tOffsetMs: 0, seq: 0, itemId: served.itemId },
      { kind: 'option_focus', tOffsetMs: Math.round(responseTime * 0.4), seq: 1 },
      { kind: 'submit', tOffsetMs: responseTime, seq: 2 },
    ];
    // +1 for the `app_verdict` event the submit route appends per item.
    telemetryCount += telemetry.length + 1;

    const submitResponse = await examSubmit(
      post('http://127.0.0.1:3000/api/exam-submit', {
        itemId: served.itemId,
        response,
        skipped: false,
        examSessionId,
        clientMetrics,
        telemetry,
      }),
    );
    const verdict = (await submitResponse.json()) as {
      ok: boolean;
      correct: boolean;
      score: number;
      difficulty: number;
      metrics: Record<string, number>;
      persisted: boolean;
    };
    expect(verdict.ok).toBe(true);
    if (verdict.persisted) persistedItems += 1;

    const scored = {
      itemId: served.itemId,
      typeCode: served.typeCode,
      domain: served.domain,
      response,
      metrics: { ...clientMetrics, ...verdict.metrics },
      telemetry,
      correct: verdict.correct,
      score: verdict.score,
      difficulty: verdict.difficulty,
    } as unknown as ScoredItem;
    scoredItems.push(scored);
    state = update(state, scored as unknown as EngineScoredItem);
  }

  const outcome = scoreExam(scoredItems, DEFAULT_EXAM_POLICY);
  const resultsResponse = await examResults(
    post('http://127.0.0.1:3000/api/exam-results', {
      sessionId: `SESS-SYN-${participantCode.slice(-6)}`,
      examSessionId,
      participantCode,
      studentName: 'Synthetic Screener Child',
      gradeBand,
      startedAt: new Date(Date.now() - 600_000).toISOString(),
      finishedAt: new Date().toISOString(),
      itemsServed: scoredItems.map((item) => ({
        itemId: item.itemId,
        typeCode: item.typeCode,
        domain: item.domain,
        difficulty: item.difficulty,
        ageBands: ['4-5'],
        content: {},
        syntheticOnly: true,
        validated: false,
      })),
      scoredItems,
      telemetry: [],
      score: outcome,
      syntheticOnly: true,
      validated: false,
    }),
  );
  const resultsBody = (await resultsResponse.json()) as { ok: boolean; persisted: boolean };
  expect(resultsBody.ok).toBe(true);
  expect(resultsBody.persisted).toBe(true);

  return {
    examSessionId,
    scoredItems,
    telemetryCount,
    composite: outcome.composite,
    persistedItems,
  };
}

describe('adaptive exam trace round trip', () => {
  beforeAll(async () => {
    const login = await proctor.auth.signInWithPassword({
      email: process.env.GT_EXAM_PROCTOR_EMAIL ?? 'admissions@example.test',
      password: process.env.GT_EXAM_PROCTOR_PASSWORD ?? '',
    });
    if (login.error) throw login.error;
    run = await runBattery();
  }, 300_000);

  it('persists every answered item, with the raw answer and the metric map', async () => {
    const { data, error } = await proctor.rpc('exam_get_session_state', {
      p_session_id: run.examSessionId,
      p_correlation_id: crypto.randomUUID(),
    });
    expect(error).toBeNull();

    const state = data as {
      data: {
        session: { status: string; itemsAdministered: number; gradeBand: string };
        responses: {
          itemId: string;
          orderNo: number;
          rawAnswer: unknown;
          metrics: Record<string, number>;
          correct: boolean;
        }[];
        telemetryCount: number;
        scorerInputHash: string;
      };
    };

    expect(state.data.session.status).toBe('completed');
    expect(state.data.session.gradeBand).toBe('4-5');
    expect(state.data.responses).toHaveLength(run.scoredItems.length);
    expect(state.data.session.itemsAdministered).toBe(run.scoredItems.length);

    // Administration order, raw answers, and client metrics all survive.
    expect(state.data.responses.map((r) => r.orderNo)).toEqual(
      run.scoredItems.map((_, index) => index + 1),
    );
    expect(state.data.responses.map((r) => r.itemId)).toEqual(
      run.scoredItems.map((item) => item.itemId),
    );
    for (const [index, stored] of state.data.responses.entries()) {
      const local = run.scoredItems[index]!;
      expect(stored.rawAnswer).toEqual((local as unknown as { response: unknown }).response);
      expect(stored.metrics['M-RT']).toBe(local.metrics['M-RT']);
      expect(stored.metrics['M-ERRTYPE']).toBe(local.metrics['M-ERRTYPE']);
    }

    expect(state.data.telemetryCount).toBe(run.telemetryCount);
    expect(state.data.scorerInputHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('stores the packages/exam-scoring outcome verbatim, not a database-computed one', async () => {
    const { data, error } = await proctor.rpc('exam_get_outcome', {
      p_session_id: run.examSessionId,
      p_correlation_id: crypto.randomUUID(),
    });
    expect(error).toBeNull();

    const outcome = data as {
      data: {
        complete: boolean;
        outcome: {
          compositeScore: number;
          scoredBy: string;
          scoringPolicyId: string;
          scorerInputHash: string;
          scorerInputCount: number;
          scorerOutput: { composite: number; policyId: string; syntheticOnly: boolean };
        };
      };
    };

    expect(outcome.data.complete).toBe(true);
    // D-019: the demoted app.exam_compute_outcome must not be the source.
    expect(outcome.data.outcome.scoredBy).toBe('packages/exam-scoring');
    expect(outcome.data.outcome.scoringPolicyId).toBe(DEFAULT_EXAM_POLICY.id);
    expect(outcome.data.outcome.scorerOutput.composite).toBeCloseTo(run.composite, 6);
    expect(Number(outcome.data.outcome.compositeScore)).toBeCloseTo(run.composite, 6);
    expect(outcome.data.outcome.scorerInputCount).toBe(run.scoredItems.length);
    expect(outcome.data.outcome.scorerOutput.syntheticOnly).toBe(true);
  });

  it('keeps serving and verifying when Supabase is unreachable mid-battery', async () => {
    const liveUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const item = run.scoredItems[0]!;
    try {
      // Nothing listens on :1, so every RPC in this block fails to connect.
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:1';
      resetExamPersistenceForTests();

      const opened = await examSession(
        post('http://127.0.0.1:3000/api/exam-session', {
          participantCode: 'PART-SYN-OFFLINE',
          gradeBand: '4-5',
        }),
      );
      expect(opened.status).toBe(200);
      expect(await opened.json()).toMatchObject({ ok: true, examSessionId: null });

      // The verdict the child's battery depends on still comes back, unaffected.
      const submitted = await examSubmit(
        post('http://127.0.0.1:3000/api/exam-submit', {
          itemId: item.itemId,
          response: (item as unknown as { response: unknown }).response,
          skipped: false,
          examSessionId: run.examSessionId,
          clientMetrics: { 'M-RT': 4000 },
          telemetry: [],
        }),
      );
      expect(submitted.status).toBe(200);
      const body = (await submitted.json()) as { ok: boolean; persisted: boolean; score: number };
      expect(body.ok).toBe(true);
      expect(body.persisted).toBe(false);
      expect(typeof body.score).toBe('number');
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = liveUrl;
      resetExamPersistenceForTests();
    }
  });

  it('never lets the served side of the trace carry an answer key', async () => {
    const { data } = await proctor.rpc('exam_get_next_item', {
      p_session_id: run.examSessionId,
      p_correlation_id: crypto.randomUUID(),
    });
    const payload = JSON.stringify(data);
    expect(payload).not.toContain('answer_key');
    expect(payload).not.toContain('correctKey');
  });
});
