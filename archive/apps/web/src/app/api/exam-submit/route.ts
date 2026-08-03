import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { findBankItem } from '@/lib/exam/bank-loader';
import {
  commitMaterialisedTrial,
  materialisationEnabled,
  materialisedBankItem,
} from '@/lib/exam/materialised-session';
import { persistItemResponse } from '@/lib/exam/persistence';
import { EXAM_TYPE_REGISTRY } from '@/lib/exam/registry.generated';
import { revealFor } from '@/lib/exam/reveal';
import { verify } from '@/lib/exam/verifiers';

/**
 * Server-authoritative answer verification (BUILD_PLAN §2/§5) and per-item trace
 * persistence (BUILD_PLAN §6).
 *
 * The browser POSTs the child's RAW response for one served item. The answer key
 * lives only on the server (loaded here from the bank), so this route — never the
 * client — decides correctness. It returns the verdict plus the key-dependent
 * metrics (`M-ACC`, `M-ERRTYPE`, and `M-DIFFREACH` when correct) that the runner
 * merges into the `ScoredItem` for the engine + scorer.
 *
 * When the request carries an `examSessionId`, the same call also writes the item,
 * the raw answer, the merged metric map, and the item's telemetry to Supabase
 * through `api.exam_register_item` + `api.exam_submit_response`. That write is
 * best-effort and happens after the verdict is computed, so a database problem can
 * delay nothing and break nothing: the response shape is unchanged apart from an
 * informational `persisted` flag.
 *
 * The response carries `correct` because the adaptive engine runs client-side and
 * must update on it — but the answer KEY itself is never sent, and the UI never
 * shows correctness between items.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const submitSchema = z
  .object({
    itemId: z.string().min(1),
    /** Raw child choice (e.g. `{selectedKey:'B'}` or `{selectedIndex:2}`). */
    response: z.unknown(),
    /** True when the item was skipped / timed out (scored as incorrect). */
    skipped: z.boolean().optional(),
    /** Supabase session id from `/api/exam-session`; absent = do not persist. */
    examSessionId: z.uuid().optional(),
    /**
     * The runner's own session id, needed ONLY on the serve-time materialisation path (D-211): the
     * item being graded was made by that session and does not exist in any bank, so without it there
     * is nothing to grade against. Not a secret and not the session seed — see
     * `lib/exam/materialised-session.ts`.
     */
    sessionId: z.string().min(1).optional(),
    /** Metrics the demo emitted for this item (client-tracked, never correctness). */
    clientMetrics: z.record(z.string(), z.number()).optional(),
    /** This item's telemetry events, appended to the stored trace verbatim. */
    telemetry: z.array(z.unknown()).optional(),
  })
  .strip();

/** Metric ids the registry says this type emits, stored on the item's type row. */
function registryMetrics(typeCode: string): string[] {
  return EXAM_TYPE_REGISTRY.find((entry) => entry.typeCode === typeCode)?.metrics ?? [];
}

/**
 * Map a chosen-option lure class to a 0..1 error-quality signal (M-ERRTYPE,
 * higher = better): a correct answer is 1; a systematic near-miss beats a random
 * miss. Matches the scorer's `M-ERRTYPE` direction and the engine's near-miss
 * softening of a wrong-answer step.
 */
function errTypeQuality(correct: boolean, lure: string | null): number {
  if (correct) return 1;
  switch (lure) {
    case 'near_order':
    case 'surface_match':
    case 'associate':
    case 'local_fit':
    case 'reversed_relation':
    case 'face_shape_confusion':
      return 0.6;
    case 'global_mismatch':
    case 'rule_violation':
    case 'distractor_other':
      return 0.2;
    default:
      return 0.4;
  }
}

/** Pull the chosen option's lure class from either an index-array or a key-object. */
function extractLure(
  rationales: unknown,
  selectedKey: string | null,
  selectedIndex: number | null,
): string | null {
  const readEntry = (entry: unknown): string | null => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object' && 'lure' in entry) {
      const lure = (entry as { lure?: unknown }).lure;
      return typeof lure === 'string' ? lure : null;
    }
    return null;
  };

  if (Array.isArray(rationales)) {
    return selectedIndex != null ? readEntry(rationales[selectedIndex]) : null;
  }
  if (rationales && typeof rationales === 'object' && selectedKey != null) {
    return readEntry((rationales as Record<string, unknown>)[selectedKey]);
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'VALIDATION_FAILED', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  // A materialised item is looked up FIRST and in the session that made it. It has no bank record, so
  // the fallback is the ordinary path rather than an error, which is what keeps the shipped block
  // working with the flag on and one type migrated.
  const materialisedSessionId =
    materialisationEnabled() && parsed.data.sessionId !== undefined ? parsed.data.sessionId : null;
  const item =
    (materialisedSessionId === null
      ? null
      : await materialisedBankItem(materialisedSessionId, parsed.data.itemId)) ??
    (await findBankItem(parsed.data.itemId));
  if (!item) {
    return NextResponse.json({ ok: false, error: 'UNKNOWN_ITEM' }, { status: 404 });
  }

  const response =
    parsed.data.response && typeof parsed.data.response === 'object'
      ? (parsed.data.response as Record<string, unknown>)
      : {};
  const selectedKey = typeof response.selectedKey === 'string' ? response.selectedKey : null;
  const selectedIndex = typeof response.selectedIndex === 'number' ? response.selectedIndex : null;

  const verdict = parsed.data.skipped ? { correct: false } : verify(item, response);
  const correct = verdict.correct;

  const score = correct ? 1 : 0;
  const lure = extractLure(item.answer.distractorRationales, selectedKey, selectedIndex);
  const metrics: Record<string, number> = {
    'M-ACC': score,
    'M-ERRTYPE': errTypeQuality(correct, lure),
    ...(parsed.data.skipped ? {} : (verdict.metrics ?? {})),
  };
  if (correct) metrics['M-DIFFREACH'] = item.difficulty;

  /**
   * Fold the reveal into the session's evidence, and pick up the R7 ledger row for the trace.
   *
   * ORDER MATTERS AND IS THE OPPOSITE OF THE OBVIOUS ONE. The commit happens AFTER the verdict, so the
   * difficulty this trial was served at was priced against the evidence the child actually had. Folding
   * first would let this trial's own reveal make this trial look easier than it was, which is the
   * ordering error the learnability oracle's own suite exists to catch.
   */
  const materialisation =
    materialisedSessionId === null || parsed.data.skipped === true || selectedKey === null
      ? null
      : await commitMaterialisedTrial(materialisedSessionId, parsed.data.itemId, selectedKey);

  let persisted = false;
  if (parsed.data.examSessionId) {
    const clientTelemetry = parsed.data.telemetry ?? [];
    const stored = await persistItemResponse({
      examSessionId: parsed.data.examSessionId,
      item,
      metricIds: registryMetrics(item.typeCode),
      rawAnswer: parsed.data.skipped ? { ...response, skipped: true } : response,
      metrics: { ...(parsed.data.clientMetrics ?? {}), ...metrics },
      // The verdict THIS route computed is appended to the append-only trace.
      // `api.exam_submit_response` re-verifies with its own key comparison and
      // writes that into `exam_item_response.correct/score`; for the 30 types
      // graded here by a per-type verifier the two can differ, so the verdict the
      // engine and scorer actually consumed is recorded explicitly rather than
      // being silently replaced. See docs/architecture/EXAM_PERSISTENCE_NOTES.md.
      telemetry: [
        ...clientTelemetry,
        {
          kind: 'app_verdict',
          seq: clientTelemetry.length,
          tOffsetMs: 0,
          correct,
          score,
          difficulty: item.difficulty,
          metrics,
          skipped: parsed.data.skipped === true,
          verifier: 'apps/web/src/lib/exam/verifiers',
        },
        /**
         * THE R7 RECORD for a materialised trial (D-211).
         *
         * Under the shipped bank, reconstructing what a child saw needs only the item ids, because the
         * item is a file. Under materialisation the item is a function of the session, so the record has
         * to name what was actually built: which template, where the key sat, which rationale produced
         * the option in every slot, and the difficulty the item was priced at. With those and the
         * session seed — which `materialised-session.ts` re-derives from this same `sessionId` and the
         * server secret — a rejected family's block is both reconstructible from the record and
         * re-derivable from the seed, and the two can be compared rather than assumed equal.
         *
         * It goes in the append-only trace, which is server-side. It names the key, so it must never be
         * read back toward a browser.
         */
        ...(materialisation === null
          ? []
          : [
              {
                kind: 'materialisation',
                seq: clientTelemetry.length + 1,
                tOffsetMs: 0,
                sessionId: parsed.data.sessionId,
                ...materialisation,
              },
            ]),
      ],
    });
    persisted = stored != null;
  }

  // Informational feedback for a learning-block type, and only after the trial has been graded and
  // recorded. A skipped item gets none: the child committed no retrieval attempt, and revealing the
  // outcome anyway would turn skipping into a free look at the system (see lib/exam/reveal.ts).
  const reveal = parsed.data.skipped ? null : revealFor(item);

  return NextResponse.json({
    ok: true,
    correct,
    score,
    difficulty: item.difficulty,
    domain: item.domain,
    typeCode: item.typeCode,
    metrics,
    ...(reveal ? { reveal } : {}),
    persisted,
    syntheticOnly: true as const,
    validated: false as const,
  });
}
