import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { findBankItem, type RawBankItem } from '@/lib/exam/bank-loader';

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
 * Verdict for one item: correctness plus any key-dependent metrics that only the
 * server can compute.
 */
interface Verdict {
  correct: boolean;
  metrics?: Record<string, number>;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Option-key verifier — the child picked one of the item's options.
 * `correctKey` is a string option key (`"B"`) or a numeric option index.
 */
function verifyKeyed(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const selectedKey = typeof response.selectedKey === 'string' ? response.selectedKey : null;
  const selectedIndex = num(response.selectedIndex);
  const correctKey = item.answer.correctKey;

  if (typeof correctKey === 'number') return { correct: selectedIndex === correctKey };
  if (typeof correctKey === 'string') {
    if (selectedKey !== null) return { correct: selectedKey === correctKey };
    // Some banks key by string while the demo reports an index (e.g. "3").
    if (selectedIndex !== null) return { correct: String(selectedIndex) === correctKey };
  }
  return { correct: false };
}

/**
 * Continuous-placement verifier (QUANT-NUMLINE-01, `scoring.rule =
 * 'placement_tolerance'`). Per the generator contract the child places a mark on
 * a bounded line and is correct iff the placement-absolute-error is within the
 * item's tolerance:
 *
 *     pae     = |placedRatio - answer.targetRatio|
 *     correct = pae <= answer.tolerance
 *
 * The tolerance band is server-only — the renderer never receives it, so it can
 * never show correctness. `M-PAE` is the continuous placement-error metric.
 */
function verifyPlacementTolerance(
  item: RawBankItem,
  response: Record<string, unknown>,
): Verdict {
  const answer = item.answer as { targetRatio?: unknown; tolerance?: unknown };
  const placedRatio = num(response.placedRatio);
  const targetRatio = num(answer.targetRatio);
  const tolerance = num(answer.tolerance);
  if (placedRatio === null || targetRatio === null || tolerance === null) {
    return { correct: false };
  }
  const pae = Math.abs(placedRatio - targetRatio);
  return { correct: pae <= tolerance, metrics: { 'M-PAE': pae } };
}

/**
 * Constructed-value verifier (QUANT-BUILD-01, `scoring.rule =
 * 'constructed_value_equals_optimum'`). The child arranges cards; the response
 * carries the numeric value of the final arrangement, which must equal the
 * unique constrained optimum held server-side.
 */
function verifyConstructedValue(
  item: RawBankItem,
  response: Record<string, unknown>,
): Verdict {
  const answer = item.answer as { optimalValue?: unknown };
  const value = num(response.value);
  const optimal = num(answer.optimalValue);
  if (value === null) return { correct: false };
  if (optimal !== null) return { correct: value === optimal };
  return { correct: String(value) === String(item.answer.correctKey) };
}

/**
 * Pick the verifier for an item from its server-only `scoring.rule`.
 *
 * `scripts/sync-exam-demos.mjs` refuses to wire a type whose response shape no
 * verifier here can grade, so an unverifiable type never reaches this route
 * (serving one would score every child 0 and drag the adaptive estimate down).
 * Keep the two in sync.
 */
function verify(item: RawBankItem, response: Record<string, unknown>): Verdict {
  switch (item.scoring?.rule) {
    case 'placement_tolerance':
      return verifyPlacementTolerance(item, response);
    case 'constructed_value_equals_optimum':
      return verifyConstructedValue(item, response);
    default:
      return verifyKeyed(item, response);
  }
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
