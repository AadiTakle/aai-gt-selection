import { DashboardLoader } from '@/components/family/dashboard-loader';
import { requireRole } from '@/lib/auth';

export default async function FamilyDashboardPage() {
  await requireRole(['family']);
  // Status + student name are fetched client-side because the application id
  // lives in the browser (no "list applications" RPC in the synthetic backend).
  // Runs against the synthetic onboarding backend in both local dev and hosted mode.
  return <DashboardLoader />;
}
