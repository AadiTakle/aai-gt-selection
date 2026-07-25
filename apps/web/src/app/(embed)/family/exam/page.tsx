import { PreviewExam } from '@/components/exam/preview-exam';
import { requireRole } from '@/lib/auth';

export default async function FamilyExamPage() {
  await requireRole(['family']);
  // The adaptive screening portal is client-only: it reads the student name from
  // the wizard state in localStorage and POSTs results to the in-memory
  // /api/exam-results table, so it runs identically on the hosted demo and in
  // local dev. /family/assessment links here.
  return <PreviewExam dashboardHref="/family/dashboard" />;
}
