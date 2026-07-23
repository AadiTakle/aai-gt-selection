import { ApplyWizard } from '@/components/family/apply-wizard';
import { requireRole } from '@/lib/auth';

export default async function FamilyApplyPage() {
  await requireRole(['family']);
  // The current-school picker searches the real NCES directory via /api/schools,
  // so no server-side directory prefetch is needed here.
  return <ApplyWizard />;
}
