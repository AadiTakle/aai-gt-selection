import { notFound } from 'next/navigation';

import { PreviewExam } from '@/components/exam/preview-exam';

// Dev-only: the adaptive screening portal, driven by the synthetic wizard state
// in localStorage (student name) with no backend auth. Results POST to the
// in-memory /api/exam-results table.
export default function FamilyExamPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PreviewExam dashboardHref="/dev/family-preview/dashboard" />;
}
