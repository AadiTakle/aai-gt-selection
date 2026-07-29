import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { findBankItem } from '@/lib/exam/bank-loader';
import { persistItemResponse } from '@/lib/exam/persistence';
import { EXAM_TYPE_REGISTRY } from '@/lib/exam/registry.generated';

/**
 * DEVELOPMENT-ONLY item emulation, for walking a long battery without hand-answering every item.
 *
 * WHY THIS CANNOT LIVE IN THE BROWSER. Skipping an item scores it wrong (`/api/exam-submit` forces
 * `correct: false`), which drags the ability estimate down and makes a skipped-through session
 * useless for judging the flow. The obvious fix — let the client say "treat this as answered
 * correctly" — is not available, because the client deliberately never receives an answer key and
 * must not be able to assert correctness. So emulation samples the outcome HERE, where the key and
 * the item's difficulty already are.
 *
 * WHAT IT DOES. Given the caller's current ability estimate for the item's area, it draws
 * correctness from the same logistic response model the engine and scorer use — a child well above
 * an item usually gets it, one well below usually does not, and near their own level it is close to
 * a coin flip. It then synthesises the process metrics the demo would have emitted, scaled by how
 * far the item sits from the child: items near the ceiling take longer and get revisited more.
 *
 * WHY IT IS GATED SHUT. An endpoint that returns `correct: true` without an answer is a way to farm
 * verdicts. It requires BOTH a non-production build and an explicit opt-in
 * (`GT_EXAM_EMULATE_ENABLED=true`), and answers 404 otherwise so it does not advertise itself.
 *
 * Every emulated response is marked `emulated: true` in the stored trace, so a session that was
 * clicked through can never be mistaken for a child's.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Discrimination per scale point — matches the engine/scorer default so the model agrees. */
const SLOPE = 1.0;

const emulateSchema = z
  .object({
    itemId: z.string().min(1),
    /** Caller's current ability estimate for this item's area, on the 1–20 scale. */
    ability: z.number().finite(),
    examSessionId: z.uuid().optional(),
  })
  .strip();

function enabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.GT_EXAM_EMULATE_ENABLED === 'true';
}

/** Deterministic unit draw from the item id, so emulating the same item twice agrees. */
function seededUnit(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 8) / 0x01000000;
}

export async function POST(request: NextRequest) {
  if (!enabled()) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = emulateSchema.safeParse(body);
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

  const { ability } = parsed.data;
  const gap = ability - item.difficulty;
  const pCorrect = 1 / (1 + Math.exp(-SLOPE * gap));
  const draw = seededUnit(`${item.itemId}:${ability.toFixed(2)}`);
  const correct = draw < pCorrect;
  const score = correct ? 1 : 0;

  // Process metrics, scaled by how far the item sits from the child. Near or above their level
  // takes longer and gets reconsidered; well below is quick and settled. These are plausible
  // stand-ins for a real child's behaviour, not a model of one.
  const strain = 1 / (1 + Math.exp(SLOPE * gap)); // ~0 well below the child, ~1 well above
  const baseMs = 4000;
  const rt = Math.round(baseMs + strain * 11000 + draw * 1500);
  const metrics: Record<string, number> = {
    'M-ACC': score,
    'M-ERRTYPE': correct ? 1 : 0.4 + 0.2 * draw,
    'M-RT': rt,
    'M-RTFIRST': Math.round(rt * (0.25 + 0.25 * strain)),
    'M-REV': Math.round(strain * 3 + draw),
    'M-RTVAR': Number((0.15 + 0.3 * strain).toFixed(3)),
    'M-ENGAGE': 0,
    'M-RAPIDGUESS': 0,
  };
  if (correct) metrics['M-DIFFREACH'] = item.difficulty;

  let persisted = false;
  if (parsed.data.examSessionId) {
    const stored = await persistItemResponse({
      examSessionId: parsed.data.examSessionId,
      item,
      metricIds: EXAM_TYPE_REGISTRY.find((e) => e.typeCode === item.typeCode)?.metrics ?? [],
      rawAnswer: { emulated: true },
      metrics,
      telemetry: [
        {
          kind: 'app_verdict',
          seq: 0,
          tOffsetMs: 0,
          correct,
          score,
          difficulty: item.difficulty,
          metrics,
          // The load-bearing flag: this outcome was sampled, not answered.
          emulated: true,
          pCorrect: Number(pCorrect.toFixed(4)),
          ability,
          verifier: 'apps/web/src/app/api/exam-emulate',
        },
      ],
    });
    persisted = stored != null;
  }

  return NextResponse.json({
    ok: true,
    correct,
    score,
    difficulty: item.difficulty,
    domain: item.domain,
    typeCode: item.typeCode,
    metrics,
    persisted,
    emulated: true as const,
    pCorrect: Number(pCorrect.toFixed(4)),
    syntheticOnly: true as const,
    validated: false as const,
  });
}
