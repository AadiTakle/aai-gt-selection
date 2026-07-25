import { NextResponse, type NextRequest } from 'next/server';

import { scoreExam, type ExamScore, type ScoredItem } from '@gt-selection/exam-scoring';

import {
  examAdaptiveTracePayloadSchema,
  examSessionInputSchema,
  summarize,
  summarizeScored,
  type ExamAdaptiveTracePayload,
  type ExamSessionRecord,
  type ExamSummary,
} from '@/lib/exam/types';

/**
 * Screening-result persistence for the synthetic prototype.
 *
 * The ratified production target is Supabase/RDS (see D-012); that backend does
 * not run in this preview, so this route keeps a process-in-memory "table" so the
 * end-to-end flow (take the test → store the full trace → read it back) is real
 * and demonstrable. It RESETS whenever the server restarts.
 *
 * Accepts two shapes:
 *   - ADAPTIVE TRACE (current): items served + server-scored items → the server
 *     recomputes the score/profile authoritatively with `@gt-selection/exam-scoring`
 *     and returns { ok, count, outcome, summary }.
 *   - LEGACY: fixed battery of scraped per-item metrics → { ok, count, summary }.
 *
 *   GET /api/exam-results → { sessions } (newest first)
 *
 * Born-synthetic: sessions carry a `PART-SYN-*` participant code and a synthetic
 * student name only. No real PII. Results are a screening signal
 * (validated=false), never an admission decision.
 */

type AdaptiveTraceRecord = ExamAdaptiveTracePayload & {
  outcome: ExamScore;
  summary: ExamSummary;
};
type StoredSession = AdaptiveTraceRecord | ExamSessionRecord;

// Module-level store. Persists for the life of the server process only.
const sessions: StoredSession[] = [];

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  // Prefer the rich adaptive trace; fall back to the legacy battery shape.
  const trace = examAdaptiveTracePayloadSchema.safeParse(body);
  if (trace.success) {
    // Recompute the score server-side (authoritative, deterministic, reproducible).
    const outcome = scoreExam(trace.data.scoredItems as unknown as ScoredItem[]);
    const summary = summarizeScored(trace.data.scoredItems);
    const record: AdaptiveTraceRecord = { ...trace.data, outcome, summary };
    sessions.unshift(record);
    return NextResponse.json({ ok: true, count: sessions.length, outcome, summary });
  }

  const legacy = examSessionInputSchema.safeParse(body);
  if (legacy.success) {
    const summary = summarize(legacy.data.items);
    const record: ExamSessionRecord = { ...legacy.data, summary };
    sessions.unshift(record);
    return NextResponse.json({ ok: true, count: sessions.length, summary });
  }

  return NextResponse.json(
    { ok: false, error: 'VALIDATION_FAILED', issues: trace.error.issues },
    { status: 422 },
  );
}

export async function GET() {
  return NextResponse.json({ ok: true, count: sessions.length, sessions });
}
