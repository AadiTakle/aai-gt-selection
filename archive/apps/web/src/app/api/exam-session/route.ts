import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { isExamPersistenceConfigured, startPersistedSession } from '@/lib/exam/persistence';

/**
 * Open a persisted exam session (BUILD_PLAN §6; D-029).
 *
 * The runner calls this once, before its first item. It creates the pseudonymous
 * participant and the session row through `api.exam_create_participant` and
 * `api.exam_start_session`, and hands back the database `sessionId` that the
 * per-item and outcome writes hang off.
 *
 * Persistence is OPTIONAL. When Supabase is not configured or is unreachable this
 * returns `{ ok: true, examSessionId: null }`, and the battery runs exactly as it
 * did before — in memory, unpersisted. Taking the exam never depends on a write.
 *
 * Born-synthetic: the participant is a `PART-SYN-*` pseudonym; no PII crosses
 * this boundary.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const startSchema = z
  .object({
    participantCode: z.string().regex(/^PART-SYN-[A-Z0-9-]+$/),
    gradeBand: z.enum(['K-1', '2-3', '4-5', '6-8']),
  })
  .strip();

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'VALIDATION_FAILED', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  if (!isExamPersistenceConfigured()) {
    return NextResponse.json({ ok: true, examSessionId: null, persistence: 'disabled' });
  }

  const session = await startPersistedSession({
    participantCode: parsed.data.participantCode,
    gradeBand: parsed.data.gradeBand,
  });

  // A failed open is logged in the persistence layer and degrades to no tracing.
  return NextResponse.json({
    ok: true,
    examSessionId: session?.examSessionId ?? null,
    persistence: session ? 'active' : 'unavailable',
  });
}
