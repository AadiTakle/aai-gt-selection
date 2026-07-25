import { notFound } from 'next/navigation';

import { PreviewDashboard } from '@/components/family/preview-dashboard';

// Dev-only: the family dashboard, driven by the wizard state saved in
// localStorage so submitting the application actually advances the dashboard
// (draft → awaiting assessment) instead of showing a canned status.
export default function FamilyDashboardPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <PreviewDashboard
      applyHref="/dev/family-preview/apply"
      assessmentHref="/dev/family-preview/assessment"
    />
  );
}
