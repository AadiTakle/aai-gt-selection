import { NextResponse, type NextRequest } from 'next/server';

import { scoreExam, type ExamScore, type ScoredItem } from '@gt-selection/exam-scoring';

import {
  fetchStoredScorerInput,
  isExamPersistenceConfigured,
  persistOutcome,
} from '@/lib/exam/persistence';
import {
  examAdaptiveTracePayloadSchema,
  examSessionInputSchema,
  summarize,
  summarizeScored,
  type ExamAdaptiveTracePayload,
  type ExamSessionRecord,
  type ExamSummary,
  type ScoredItemTrace,
} from '@/lib/exam/types';

/**
 * Screening-result persistence (BUILD_PLAN §5/§6; D-029, D-027).
 *
 * `@gt-selection/exam-scoring` is the sole scoring authority. WHICH ITEMS IT IS
 * HANDED is decided here, and there is only one safe answer for a persisted
 * session: the rows the database's own verifier wrote.
 *
 * When the payload carries an `examSessionId`, the scorer input is read back
 * from `app.exam_scorer_input_json` through `api.exam_get_scoring_inputs` and
 * that is what is scored, returned, and stored. The `scoredItems` array in the
 * request body is NOT scored. It used to be (E-084), which made the composite
 * client-forgeable and falsified the `claim_boundary` every outcome row carries
 * ("recomputable from the stored trace via app.exam_scorer_input_json").
 *
 * If the database input cannot be read, the request FAILS. Falling back to the
 * request body would reopen exactly the hole this closes, and a persisted score
 * is a claim the system cannot withdraw once it is written.
 *
 * The process-in-memory "table" is kept alongside it: it is what the preview
 * dashboard reads, it is the fallback whenever Supabase is absent, and it RESETS
 * whenever the server restarts.
 *
 * Accepts two shapes:
 *   - ADAPTIVE TRACE (current): items served + the trace the runner recorded →
 *     { ok, count, outcome, summary, persisted, scoreSource, scorerInputHash }.
 *   - LEGACY: fixed battery of scraped per-item metrics → { ok, count, summary }.
 *
 *   GET /api/exam-results → { sessions } (newest first)
 *
 * Born-synthetic: sessions carry a `PART-SYN-*` participant code and a synthetic
 * student name only. No real PII. Results are a screening signal
 * (validated=false), never an admission decision.
 */

/**
 * Where the items the score was computed from came from.
 *
 * `database-trace` is the only source a score may be PERSISTED from.
 * `client-trace-unverified` is a preview-only number for a battery that never
 * had a database session (persistence off, or `examSessionId` absent); nothing
 * is stored under it and nothing claims it is reproducible.
 */
type ScoreSource = 'database-trace' | 'client-trace-unverified';

type AdaptiveTraceRecord = ExamAdaptiveTracePayload & {
  outcome: ExamScore;
  summary: ExamSummary;
  scoreSource: ScoreSource;
  scorerInputHash?: string;
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
    const { examSessionId } = trace.data;

    // A battery with no database session behind it (persistence off, or the
    // session was never opened) has no verified trace to read. Score the posted
    // one for the preview screen, store nothing, and say so.
    if (!examSessionId || !isExamPersistenceConfigured()) {
      const outcome = scoreExam(trace.data.scoredItems as unknown as ScoredItem[]);
      const summary = summarizeScored(trace.data.scoredItems);
      sessions.unshift({
        ...trace.data,
        outcome,
        summary,
        scoreSource: 'client-trace-unverified',
      });
      return NextResponse.json({
        ok: true,
        count: sessions.length,
        outcome,
        summary,
        persisted: false,
        scoreSource: 'client-trace-unverified' satisfies ScoreSource,
      });
    }

    // E-084: score the trace the SERVER verified, never the one the client sent.
    const stored = await fetchStoredScorerInput(examSessionId);
    if (!stored) {
      // Deliberately fatal. The alternative is storing a score derived from the
      // request body, which is the defect, and the trace is safe in the database
      // either way — the session can be scored later from the rows it holds.
      return NextResponse.json(
        { ok: false, error: 'SCORER_INPUT_UNAVAILABLE', examSessionId },
        { status: 503 },
      );
    }

    const outcome = scoreExam(stored.items);
    const summary = summarizeScored(stored.items);
    // The preview record carries the database's items too, so the dashboard
    // cannot show a trace that disagrees with the score printed beside it.
    const record: AdaptiveTraceRecord = {
      ...trace.data,
      scoredItems: stored.items as unknown as ScoredItemTrace[],
      outcome,
      summary,
      scoreSource: 'database-trace',
      scorerInputHash: stored.inputHash,
    };
    sessions.unshift(record);

    // Best-effort: a failed write is logged in the persistence layer, and the
    // child still gets the database-derived result screen computed above.
    const persisted = await persistOutcome({ examSessionId, outcome });

    return NextResponse.json({
      ok: true,
      count: sessions.length,
      outcome,
      summary,
      persisted,
      scoreSource: 'database-trace' satisfies ScoreSource,
      scorerInputHash: stored.inputHash,
      itemsScored: stored.items.length,
    });
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
