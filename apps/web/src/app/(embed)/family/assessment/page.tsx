import { AssessmentPage } from '@/components/family/assessment-page';
import { requireRole } from '@/lib/auth';

export default async function FamilyAssessmentPage() {
  await requireRole(['family']);
  return <AssessmentPage dashboardHref="/family/dashboard" />;
}
