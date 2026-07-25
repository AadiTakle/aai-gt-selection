import { ApplyWizard } from '@/components/family/apply-wizard';
import { requireRole } from '@/lib/auth';
import { isHostedDeploy } from '@/lib/env';

export default async function FamilyApplyPage() {
  await requireRole(['family']);
  // On the hosted demo the local-synthetic onboarding backend is intentionally
  // unavailable — the adapter only runs against the loopback project (see
  // apps/web/src/lib/env.ts) so real applicant data can never reach a cloud DB.
  // Run the wizard in client-only preview mode there: identical UI, persisted to
  // localStorage, no server actions. Local dev keeps the real synthetic backend.
  if (isHostedDeploy()) {
    return <ApplyWizard preview basePath="/family" />;
  }
  // The current-school picker searches the real NCES directory via /api/schools,
  // so no server-side directory prefetch is needed here.
  return <ApplyWizard />;
}
