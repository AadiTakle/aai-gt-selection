import type { StatusProjection } from '@gt-selection/contracts';
import { notFound } from 'next/navigation';

import { FamilyDashboard } from '@/components/family/family-dashboard';

// Dev-only: the family dashboard with a canned "submitted" status so the
// status card + mock payment/assessment gate can be seen without a backend.
const PREVIEW_STATUS: StatusProjection = {
  workflowStatus: 'awaiting_assessment',
  displayLabelCode: 'STATUS_AWAITING_ASSESSMENT',
  phase: 'assessment',
  familyActionRequired: false,
  nextActionCode: 'AWAIT_ASSESSMENT',
  deadline: null,
  pendingReason: null,
  claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
};

export default function FamilyDashboardPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <FamilyDashboard
      studentName="Synthetic Rivera"
      status={PREVIEW_STATUS}
      applyHref="/dev/family-preview/apply"
      assessmentHref="/dev/family-preview/assessment"
    />
  );
}
