import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { findBankItem } from '@/lib/exam/bank-loader';

/**
 * Server-authoritative answer verification (BUILD_PLAN §2/§5).
 *
 * The browser POSTs the child's RAW response for one served item. The answer key
 * lives only on the server (loaded here from the bank), so this route — never the
 * client — decides correctness. It returns the verdict plus the key-dependent
 * metrics (`M-ACC`, `M-ERRTYPE`, and `M-DIFFREACH` when correct) that the runner
 * merges into the `ScoredItem` for the engine + scorer.
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
  })
  .strip();

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

  const item = await findBankItem(parsed.data.itemId);
  if (!item) {
    return NextResponse.json({ ok: false, error: 'UNKNOWN_ITEM' }, { status: 404 });
  }

  const response =
    parsed.data.response && typeof parsed.data.response === 'object'
      ? (parsed.data.response as Record<string, unknown>)
      : {};
  const selectedKey = typeof response.selectedKey === 'string' ? response.selectedKey : null;
  const selectedIndex = typeof response.selectedIndex === 'number' ? response.selectedIndex : null;

  const correctKey = item.answer.correctKey;
  let correct = false;
  if (!parsed.data.skipped) {
    if (typeof correctKey === 'number') correct = selectedIndex != null && selectedIndex === correctKey;
    else if (typeof correctKey === 'string') correct = selectedKey != null && selectedKey === correctKey;
  }

  const score = correct ? 1 : 0;
  const lure = extractLure(item.answer.distractorRationales, selectedKey, selectedIndex);
  const metrics: Record<string, number> = {
    'M-ACC': score,
    'M-ERRTYPE': errTypeQuality(correct, lure),
  };
  if (correct) metrics['M-DIFFREACH'] = item.difficulty;

  return NextResponse.json({
    ok: true,
    correct,
    score,
    difficulty: item.difficulty,
    domain: item.domain,
    typeCode: item.typeCode,
    metrics,
    syntheticOnly: true as const,
    validated: false as const,
  });
}
