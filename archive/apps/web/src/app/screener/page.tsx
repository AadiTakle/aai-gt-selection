import type { Metadata } from 'next';

import { PreviewExam } from '@/components/exam/preview-exam';

/**
 * The PUBLIC screener: the adaptive engine behind a low-stakes front door.
 *
 * Deliberately outside `(embed)/family` and deliberately unauthenticated. Everything under
 * `/family` belongs to somebody who has already started an application, and this page exists for
 * the opposite person — a child handed a laptop at a school event, whose parent has given GT
 * nothing and may not know GT exists. Requiring an account here would gate the one surface whose
 * entire job is to be ungated.
 *
 * It writes no child record of its own: it POSTs a session trace exactly as the battery does, and
 * `SCREENER_SURFACE` is what makes the session short, keeps Stage 2 out of it, and withholds the
 * composite figure. See `lib/exam/surfaces.ts` and `docs/proposals/public-screener.md`.
 */
export const metadata: Metadata = {
  title: 'Try some puzzles',
  description:
    'A short set of reasoning puzzles. Not a test, not an IQ score, and not an admission decision.',
};

export default function PublicScreener() {
  return <PreviewExam dashboardHref="/" surfaceId="screener" />;
}
