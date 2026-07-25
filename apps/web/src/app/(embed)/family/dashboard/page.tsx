import { DashboardLoader } from '@/components/family/dashboard-loader';
import { PreviewDashboard } from '@/components/family/preview-dashboard';
import { requireRole } from '@/lib/auth';
import { isHostedDeploy } from '@/lib/env';

export default async function FamilyDashboardPage() {
  await requireRole(['family']);
  // Hosted demo: drive the dashboard from the wizard state saved in localStorage
  // (no backend), matching the client-only apply flow. Local dev loads status
  // from the synthetic backend via the onboarding adapter.
  if (isHostedDeploy()) {
    return <PreviewDashboard applyHref="/family/apply" assessmentHref="/family/assessment" />;
  }
  // Status + student name are fetched client-side because the application id
  // lives in the browser (no "list applications" RPC in the synthetic backend).
  return <DashboardLoader />;
}
