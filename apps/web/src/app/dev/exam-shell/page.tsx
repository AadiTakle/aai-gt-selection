import { notFound } from 'next/navigation';

import { SyntheticExam } from '@/components/exam/synthetic-exam';

// Dev-only: a runnable, born-SYNTHETIC demo of the structure-agnostic session
// shell + pluggable FixedSequencer over native sample items across the four
// domains. No auth, no real data; results POST to the in-memory /api/exam-results
// table and are scored server-side. Labeled validated=false throughout.
export default function ExamShellDemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <SyntheticExam />;
}
