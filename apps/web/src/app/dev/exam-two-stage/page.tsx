import { notFound } from 'next/navigation';

import { TwoStageExam } from '@/components/exam/two-stage-exam';

// Dev-only: a runnable, born-SYNTHETIC demo of a PROPOSED (unapproved, pluggable)
// two-regime test structure. It reuses the same structure-agnostic session shell
// + player as /dev/exam-shell, swapping only the pluggable sequencer for the
// TwoStageSequencer (Phase 1 standing/accuracy → Phase 2 learning-rate/effort).
// No auth, no real data; every item is synthetic and validated=false. The fixed-
// order demo at /dev/exam-shell remains the reachable default structure.
export default function ExamTwoStageDemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <TwoStageExam />;
}
