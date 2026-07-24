import { NextResponse, type NextRequest } from 'next/server';

import { examSessionInputSchema, summarize, type ExamSessionRecord } from '@/lib/exam/types';

/**
 * Screening-result persistence for the synthetic prototype.
 *
 * The ratified production target is Supabase/RDS (see D-012); that backend does
 * not run in this preview, so this route keeps a process-in-memory "table" so
 * the end-to-end flow (take the test → store the scores/metrics → read them
 * back) is real and demonstrable. It RESETS whenever the server restarts — it is
 * a stand-in, not durable storage.
 *
 *   POST /api/exam-results  → validate, compute summary, append, { ok, count }
 *   GET  /api/exam-results  → { sessions } (newest first)
 *
 * Born-synthetic: sessions carry a `PART-SYN-*` participant code and the
 * synthetic student name only. No real PII. Results are a screening signal
 * (validated=false), never an admission decision.
 */

// Module-level store. Persists for the life of the server process only.
const sessions: ExamSessionRecord[] = [];

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = examSessionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'VALIDATION_FAILED', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const summary = summarize(parsed.data.items);
  const record: ExamSessionRecord = { ...parsed.data, summary };
  sessions.unshift(record);

  return NextResponse.json({ ok: true, count: sessions.length, summary });
}

export async function GET() {
  return NextResponse.json({ ok: true, count: sessions.length, sessions });
}
