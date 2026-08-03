import { NextResponse, type NextRequest } from 'next/server';

import { getServedIndex, getServedItem, getServedItems } from '@/lib/exam/bank-loader';
import {
  MATERIALISED_TYPE_CODE,
  materialisationEnabled,
  materialisedIndexEntries,
  materialisedServedItem,
  materialisedServedItems,
} from '@/lib/exam/materialised-session';

/**
 * Served-item feed for the adaptive runner (BUILD_PLAN §2).
 *
 * Returns SERVED items only — `answer` / `scoring` / `provenance` are stripped in
 * the loader and NEVER reach the browser. The adaptive engine runs client-side
 * over this pool; correctness is decided later, server-side, by `/api/exam-submit`.
 *
 *   GET /api/exam-items?index=1
 *     → the selection index for every wired bank: itemId/typeCode/domain/
 *       difficulty/ageBands with NO `content`. This is what the runner fetches
 *       once per session; the full pool's stimulus JSON is several megabytes and
 *       grows with every new type, so content is fetched per item instead.
 *   GET /api/exam-items?itemId=<uuid>
 *     → one served item WITH its content, for the item about to be rendered.
 *   GET /api/exam-items?typeCode=FLU-MATRIX-01&difficulty=11&exclude=id1,id2&limit=1
 *     → the nearest-difficulty unseen served item(s) for one type.
 *   GET /api/exam-items
 *     → all served items with content (kept for tooling/tests; prefer `index=1`).
 *
 * Born-synthetic only (`syntheticOnly=true`, `validated=false`).
 *
 * ---------------------------------------------------------------------------
 * SERVE-TIME MATERIALISATION (D-211), off unless `EXAM_SERVE_TIME_MATERIALISATION` is set
 *
 * With the flag on AND a `sessionId`, `FLU-OPCHAIN-01` items come from a session materialised out of
 * `research/exam-question-types/templates/` instead of from the shipped bank: the server draws the
 * session's symbol->operator mapping, builds the options from the template's distractor rationales
 * under it, and prices the item on the four relabelling-invariant levers in STAGE2_REDESIGN_SPEC §3.
 * Nothing else changes and no other type is affected — with the flag off, or with no `sessionId`, every
 * response is byte-for-byte what it was.
 *
 * `sessionId` is the id the runner already generates for its own run. It is NOT the session seed: the
 * seed is `HMAC(server secret, sessionId)` and never leaves the server, because a browser holding it
 * could compute the key for every item it will be shown.
 *
 * TWO CONTRACT CHANGES A CALLER ON THIS PATH HAS TO HONOUR, both consequences of difficulty no longer
 * being a number in a file:
 *
 *   1. `index=1` MUST be re-fetched per trial. An item's price is a function of the child's evidence, so
 *      an index fetched at trial 1 is stale at trial 2 — the pool's mean price falls by about five
 *      points over a 30-trial block.
 *   2. `itemId=` RECORDS the item as served, because the difficulty that goes in the R7 ledger is the
 *      one computed when the screen was built. It is idempotent by item id, so a retry or a reload is
 *      not a second trial, but a caller must not fetch items it does not intend to show.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The materialised path is taken only when it is switched on AND the caller names its session. */
function materialisedSessionId(params: URLSearchParams): string | null {
  if (!materialisationEnabled()) return null;
  const sessionId = params.get('sessionId');
  return sessionId !== null && sessionId.length > 0 ? sessionId : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const sessionId = materialisedSessionId(params);

  if (params.get('index') != null) {
    const items = await getServedIndex();
    if (sessionId === null) {
      return NextResponse.json({ ok: true, index: true, count: items.length, items });
    }
    // The shipped rows for this one type are replaced rather than added to: a client holding both would
    // select bank item ids that name nothing in this session.
    const merged = [
      ...items.filter((item) => item.typeCode !== MATERIALISED_TYPE_CODE),
      ...(await materialisedIndexEntries(sessionId)),
    ];
    return NextResponse.json({
      ok: true,
      index: true,
      count: merged.length,
      items: merged,
      materialised: MATERIALISED_TYPE_CODE,
    });
  }

  const itemId = params.get('itemId');
  if (itemId) {
    const item =
      (sessionId === null ? null : await materialisedServedItem(sessionId, itemId)) ??
      (await getServedItem(itemId));
    if (!item) return NextResponse.json({ ok: false, error: 'UNKNOWN_ITEM' }, { status: 404 });
    return NextResponse.json({ ok: true, count: 1, items: [item], item });
  }

  const typeCode = params.get('typeCode');
  const difficultyRaw = params.get('difficulty');
  const limitRaw = params.get('limit');
  const excludeRaw = params.get('exclude');

  const difficulty = difficultyRaw != null && difficultyRaw !== '' ? Number(difficultyRaw) : null;
  const limit = limitRaw != null && limitRaw !== '' ? Number(limitRaw) : null;
  const exclude = excludeRaw
    ? new Set(
        excludeRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : undefined;

  if (sessionId !== null && typeCode === MATERIALISED_TYPE_CODE) {
    // The same nearest-difficulty filter, over the session's priced candidates rather than the bank.
    let pool = (await materialisedServedItems(sessionId)).filter(
      (item) => exclude === undefined || !exclude.has(item.itemId),
    );
    if (difficulty !== null && Number.isFinite(difficulty)) {
      pool = [...pool].sort(
        (a, b) =>
          Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty) ||
          a.itemId.localeCompare(b.itemId),
      );
    }
    if (limit !== null && limit > 0) pool = pool.slice(0, limit);
    return NextResponse.json({ ok: true, count: pool.length, items: pool });
  }

  const items = await getServedItems({ typeCode, difficulty, exclude, limit });
  return NextResponse.json({ ok: true, count: items.length, items });
}
