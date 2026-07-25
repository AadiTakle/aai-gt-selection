import { NextResponse, type NextRequest } from 'next/server';

import { getServedIndex, getServedItem, getServedItems } from '@/lib/exam/bank-loader';

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
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (params.get('index') != null) {
    const items = await getServedIndex();
    return NextResponse.json({ ok: true, index: true, count: items.length, items });
  }

  const itemId = params.get('itemId');
  if (itemId) {
    const item = await getServedItem(itemId);
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

  const items = await getServedItems({ typeCode, difficulty, exclude, limit });
  return NextResponse.json({ ok: true, count: items.length, items });
}
