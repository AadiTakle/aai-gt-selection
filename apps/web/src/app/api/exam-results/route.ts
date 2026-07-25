import { NextResponse, type NextRequest } from 'next/server';

import { scoreExam, type ExamScore, type ScoredItem } from '@gt-selection/exam-scoring';

import { persistOutcome } from '@/lib/exam/persistence';
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
 * Screening-result persistence (BUILD_PLAN §5/§6; D-019).
 *
 * The score is recomputed here with `@gt-selection/exam-scoring`, which D-019
 * makes the sole scoring authority. When the payload carries an `examSessionId`,
 * that output is then stored VERBATIM in Supabase through
 * `api.exam_record_outcome`, which also closes the session and records a
 * database-derived hash of the canonical scorer input so the score can be
 * recomputed from the stored trace and checked. The demoted in-database
 * `app.exam_compute_outcome` is never called, so no second score competes.
 *
 * The process-in-memory "table" is kept alongside it: it is what the preview
 * dashboard reads, it is the fallback whenever Supabase is absent, and it RESETS
 * whenever the server restarts.
 *
 * Accepts two shapes:
 *   - ADAPTIVE TRACE (current): items served + server-scored items → the server
 *     recomputes the score/profile authoritatively with `@gt-selection/exam-scoring`
 *     and returns { ok, count, outcome, summary, persisted }.
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

    // Best-effort: a failed write is logged in the persistence layer, and the
    // child still gets their result screen from the value computed above.
    const persisted = trace.data.examSessionId
      ? await persistOutcome({ examSessionId: trace.data.examSessionId, outcome })
      : false;

    return NextResponse.json({ ok: true, count: sessions.length, outcome, summary, persisted });
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
