import type { StatusProjection, WorkflowStatus } from '@gt-selection/contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FamilyDashboard } from './family-dashboard';

const ALL_STATUSES: WorkflowStatus[] = [
  'application_draft',
  'awaiting_assessment',
  'assessment_needs_correction',
  'track_a_eligible',
  'track_b_snapshot_required',
  'snapshot_under_review',
  'review_pending_family_action',
  'review_pending_internal_action',
  'track_b_eligible',
  'track_b_does_not_currently_qualify',
  'no_current_pathway',
  'policy_configuration_pending',
];

function projection(workflowStatus: WorkflowStatus): StatusProjection {
  return {
    workflowStatus,
    displayLabelCode: 'STATUS_TEST',
    phase: workflowStatus === 'application_draft' ? 'application' : 'assessment',
    familyActionRequired: false,
    nextActionCode: null,
    deadline: null,
    pendingReason: null,
    claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
  };
}

describe('FamilyDashboard', () => {
  it('shows the student name and an eligibility boundary line', () => {
    render(
      <FamilyDashboard studentName="Synthetic Rivera" status={projection('awaiting_assessment')} />,
    );
    expect(screen.getByRole('heading', { name: 'Synthetic Rivera' })).toBeInTheDocument();
    expect(screen.getByText(/eligibility status only/i)).toBeInTheDocument();
  });

  it('renders every workflow status without ever implying admission', () => {
    for (const status of ALL_STATUSES) {
      const { container, unmount } = render(
        <FamilyDashboard studentName="Synthetic Rivera" status={projection(status)} />,
      );
      expect(container.textContent ?? '').not.toMatch(/admitted/i);
      unmount();
    }
  });

  it('locks the assessment until the application is submitted', () => {
    render(
      <FamilyDashboard studentName="Synthetic Rivera" status={projection('application_draft')} />,
    );
    expect(screen.getByText(/submit your application first/i)).toBeInTheDocument();
  });
});
