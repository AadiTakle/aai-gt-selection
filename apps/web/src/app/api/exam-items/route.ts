import { NextResponse, type NextRequest } from 'next/server';

import { getServedItems } from '@/lib/exam/bank-loader';

/**
 * Served-item feed for the adaptive runner (BUILD_PLAN §2).
 *
 * Returns SERVED items only — `answer` / `scoring` / `provenance` are stripped in
 * the loader and NEVER reach the browser. The adaptive engine runs client-side
 * over this pool; correctness is decided later, server-side, by `/api/exam-submit`.
 *
 *   GET /api/exam-items
 *     → all served items across the four structured banks (the engine's pool).
 *   GET /api/exam-items?typeCode=FLU-MATRIX-01&difficulty=11&exclude=id1,id2&limit=1
 *     → the nearest-difficulty unseen served item(s) for one type.
 *
 * Born-synthetic only (`syntheticOnly=true`, `validated=false`).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
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
