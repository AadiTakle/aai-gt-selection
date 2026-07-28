import { PreviewExam } from '@/components/exam/preview-exam';
import { requireRole } from '@/lib/auth';

export default async function FamilyExamPage() {
  await requireRole(['family']);
  // The adaptive screening portal is client-only for taking the test (it reads
  // the student name from the wizard state in localStorage), but on the real
  // family portal it persists the completed session durably to Supabase against
  // the account (durable), unlike the dev preview which posts to the in-memory
  // /api/exam-results route. /family/assessment links here.
  return <PreviewExam dashboardHref="/family/dashboard" durable />;
}
