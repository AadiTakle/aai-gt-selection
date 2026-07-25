import { ApplyWizard } from '@/components/family/apply-wizard';
import { requireRole } from '@/lib/auth';

export default async function FamilyApplyPage() {
  await requireRole(['family']);
  // The current-school picker searches the real NCES directory via /api/schools,
  // so no server-side directory prefetch is needed here. The wizard's autosave and
  // submit run against the synthetic onboarding backend (local loopback in dev, the
  // hosted synthetic Supabase project when GT_DEPLOY_MODE=hosted).
  return <ApplyWizard />;
}
