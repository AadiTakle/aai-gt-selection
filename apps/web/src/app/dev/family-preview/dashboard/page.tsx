import type { StatusProjection } from '@gt-selection/contracts';
import { notFound } from 'next/navigation';

import { FamilyDashboard } from '@/components/family/family-dashboard';

// Dev-only: the family dashboard for a fresh applicant who hasn't started yet —
// draft status, phase 1 (application), so the preview begins at the very start.
const PREVIEW_STATUS: StatusProjection = {
  workflowStatus: 'application_draft',
  displayLabelCode: 'STATUS_APPLICATION_DRAFT',
  phase: 'application',
  familyActionRequired: true,
  nextActionCode: 'COMPLETE_APPLICATION',
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
