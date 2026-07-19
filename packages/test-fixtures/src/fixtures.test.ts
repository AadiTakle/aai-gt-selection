import {
  applicationVersionSchema,
  assessmentVersionSchema,
  recordAssessmentVersionResponseSchema,
  snapshotFixtureReferenceSchema,
  statusProjectionSchema,
  submitReviewResponseSchema,
  submitSnapshotVersionResponseSchema,
} from '@gt-selection/contracts';
import { describe, expect, it } from 'vitest';

import {
  artifactDisagreementReviewResponseFixture,
  artifactSnapshotSubmissionResponseFixture,
  narrativeTwoVotesReviewResponseFixture,
  fictionalFixtures,
  narrativeSnapshotSubmissionResponseFixture,
  pendingAssessmentResponseFixture,
  submittedApplicationResponseFixture,
  syntheticArtifactFixture,
  syntheticNarrativeFixture,
  syntheticTrackAAssessment,
  syntheticTrackBAssessment,
  syntheticTrackBApplication,
  trackBInvitationResponseFixture,
  trackBSnapshotRequiredStatus,
} from './index';

describe('fictional fixture boundary', () => {
  it('provides a valid submitted application response for frontend integration', () => {
    expect(submittedApplicationResponseFixture.data.status.workflowStatus).toBe(
      'awaiting_assessment',
    );
    expect(submittedApplicationResponseFixture.syntheticOnly).toBe(true);
  });

  it('provides a domain-level pending assessment response', () => {
    expect(recordAssessmentVersionResponseSchema.parse(pendingAssessmentResponseFixture)).toEqual(
      pendingAssessmentResponseFixture,
    );
    expect(pendingAssessmentResponseFixture.data.routing.trackA.outcome).toBe('pending');
  });

  it('preserves canonical Track B invitation reason ordering', () => {
    expect(recordAssessmentVersionResponseSchema.parse(trackBInvitationResponseFixture)).toEqual(
      trackBInvitationResponseFixture,
    );
    expect(
      trackBInvitationResponseFixture.data.routing.trackBInvitation.orderedReasonCodes,
    ).toEqual(['TB_COMPOSITE_BAND', 'TB_BATTERY_PROFILE']);
  });

  it('provides route-correct blind assignment fixtures', () => {
    expect(
      submitSnapshotVersionResponseSchema.parse(artifactSnapshotSubmissionResponseFixture),
    ).toEqual(artifactSnapshotSubmissionResponseFixture);
    expect(
      submitSnapshotVersionResponseSchema.parse(narrativeSnapshotSubmissionResponseFixture),
    ).toEqual(narrativeSnapshotSubmissionResponseFixture);
    expect(
      artifactSnapshotSubmissionResponseFixture.data.reviewCase.initialAssignments,
    ).toHaveLength(2);
    expect(
      narrativeSnapshotSubmissionResponseFixture.data.reviewCase.initialAssignments,
    ).toHaveLength(3);
  });

  it('provides blind-third and narrative-awaiting review transitions', () => {
    expect(submitReviewResponseSchema.parse(artifactDisagreementReviewResponseFixture)).toEqual(
      artifactDisagreementReviewResponseFixture,
    );
    expect(submitReviewResponseSchema.parse(narrativeTwoVotesReviewResponseFixture)).toEqual(
      narrativeTwoVotesReviewResponseFixture,
    );
    expect(artifactDisagreementReviewResponseFixture.data.transition.createdAssignment.slot).toBe(
      3,
    );
    expect(narrativeTwoVotesReviewResponseFixture.data.transition.kind).toBe(
      'awaiting_required_reviews',
    );
  });

  it('keeps every fixture visibly synthetic', () => {
    expect(fictionalFixtures.every(({ syntheticOnly }) => syntheticOnly)).toBe(true);
  });

  it('validates the Track A and Track B boundary examples', () => {
    expect(applicationVersionSchema.parse(syntheticTrackBApplication)).toBeDefined();
    expect(assessmentVersionSchema.parse(syntheticTrackAAssessment).compositeScore).toBe(95);
    expect(assessmentVersionSchema.parse(syntheticTrackBAssessment).compositeScore).toBe(89.5);
  });

  it('validates both fixed Snapshot routes', () => {
    expect(snapshotFixtureReferenceSchema.parse(syntheticArtifactFixture).route).toBe('artifact');
    expect(snapshotFixtureReferenceSchema.parse(syntheticNarrativeFixture).route).toBe('narrative');
  });

  it('rejects a fixture that is not marked synthetic', () => {
    const result = snapshotFixtureReferenceSchema.safeParse({
      ...syntheticArtifactFixture,
      syntheticOnly: false,
    });

    expect(result.success).toBe(false);
  });

  it('keeps invitation separate from eligibility or admission', () => {
    const status = statusProjectionSchema.parse(trackBSnapshotRequiredStatus);
    expect(status.workflowStatus).toBe('track_b_snapshot_required');
    expect(JSON.stringify(status)).not.toMatch(/admitted|offered|waitlisted|funded/i);
  });
});
