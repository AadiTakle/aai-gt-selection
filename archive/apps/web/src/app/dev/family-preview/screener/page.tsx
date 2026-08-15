import { notFound } from 'next/navigation';

import { PreviewExam } from '@/components/exam/preview-exam';

/**
 * Dev-only preview of the public screener, alongside the battery's preview at
 * `/dev/family-preview/exam` so the two front doors can be compared side by side.
 *
 * `/screener` is already public, so this route exists for one reason the public one cannot serve:
 * it sits next to the battery preview under the same synthetic wizard state, which is what makes
 * "same engine, different door" checkable by opening two tabs.
 */
export default function ScreenerPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PreviewExam dashboardHref="/dev/family-preview/dashboard" surfaceId="screener" />;
}
