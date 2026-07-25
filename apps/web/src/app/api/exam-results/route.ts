import { NextResponse, type NextRequest } from 'next/server';

import { scoreSession } from '@/lib/exam/scoring';
import {
  examSessionInputSchema,
  examTracePayloadSchema,
  summarize,
  summarizeResults,
  type ExamSessionRecord,
  type ExamTraceRecord,
} from '@/lib/exam/types';

/**
 * Screening-result persistence for the synthetic prototype.
 *
 * The ratified production target is Supabase/RDS (see D-012); that backend does
 * not run in this preview, so this route keeps a process-in-memory "table" so
 * the end-to-end flow (take the test → store the full trace → read it back) is
 * real and demonstrable. It RESETS whenever the server restarts.
 *
 * Accepts two shapes:
 *   - TRACE (current): full adaptive trace → server recomputes score/profile
 *     (authoritative + deterministic) and returns { ok, count, outcome, summary }.
 *   - LEGACY: fixed battery of scraped per-item metrics → { ok, count, summary }.
 *
 *   GET /api/exam-results → { sessions } (newest first)
 *
 * Born-synthetic: sessions carry a `PART-SYN-*` participant code and a synthetic
 * student name only. No real PII. Results are a screening signal
 * (validated=false), never an admission decision.
 */

type StoredSession = ExamTraceRecord | ExamSessionRecord;

// Module-level store. Persists for the life of the server process only.
const sessions: StoredSession[] = [];

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  // Prefer the rich trace shape; fall back to the legacy battery shape.
  const trace = examTracePayloadSchema.safeParse(body);
  if (trace.success) {
    const outcome = scoreSession({
      gradeBand: trace.data.gradeBand,
      results: trace.data.results,
      servedItems: trace.data.itemsServed,
    });
    const summary = summarizeResults(trace.data.results);
    const record: ExamTraceRecord = { ...trace.data, outcome, summary };
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
