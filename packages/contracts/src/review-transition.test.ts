import { describe, expect, it } from 'vitest';

import { submitReviewResponseSchema } from './index';

const uuid = '00000000-0000-4000-8000-000000000001';
const ratings = ['DE', 'LR', 'TA', 'IN', 'RE', 'SP'].map((dimensionCode) => ({
  dimensionCode,
  anchorCode: `${dimensionCode}-2`,
  ratingCode: '2',
  evidenceReference: 'fixture:artifact-qualifying',
}));
const reviewSubmission = {
  reviewSubmissionId: '00000000-0000-4000-8000-000000000801',
  assignmentId: '00000000-0000-4000-8000-000000000702',
  reviewCaseId: '00000000-0000-4000-8000-000000000601',
  classification: 'does_not_currently_qualify',
  ratings,
  version: 1,
  contentHash: `sha256:${'1'.repeat(64)}`,
  locked: true,
  syntheticOnly: true,
} as const;
const meta = {
  correlationId: '00000000-0000-4000-8000-000000000301',
  idempotencyKey: '00000000-0000-4000-8000-000000000302',
  idempotentReplay: false,
} as const;

describe('review transition contracts', () => {
  it('returns one blind third assignment after conflicting artifact votes', () => {
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        reviewSubmission,
        transition: {
          kind: 'additional_blind_review_required',
          reviewCaseId: reviewSubmission.reviewCaseId,
          route: 'artifact',
          workflowState: 'under_review',
          completedVoteCount: 2,
          requiredVoteCount: 3,
          pendingReason: 'pending_additional_blind_review',
          createdAssignment: {
            assignmentId: '00000000-0000-4000-8000-000000000703',
            slot: 3,
            reviewerRole: 'supervisor',
            status: 'assigned',
            blind: true,
            syntheticOnly: true,
          },
          decision: null,
          previousVotesExposed: false,
          syntheticOnly: true,
        },
        status: {
          workflowStatus: 'review_pending_internal_action',
          displayLabelCode: 'STATUS_REVIEW_PENDING_INTERNAL_ACTION',
          phase: 'review',
          familyActionRequired: false,
          nextActionCode: 'AWAIT_ADDITIONAL_BLIND_REVIEW',
          deadline: null,
          pendingReason: 'pending_additional_blind_review',
          claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
        },
      },
      meta,
    } as const;

    expect(submitReviewResponseSchema.parse(response)).toEqual(response);
    expect(
      submitReviewResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          transition: {
            ...response.data.transition,
            createdAssignment: {
              ...response.data.transition.createdAssignment,
              reviewerId: uuid,
            },
          },
        },
      }).success,
    ).toBe(false);
  });

  it('keeps a narrative case open after two completed votes', () => {
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        reviewSubmission,
        transition: {
          kind: 'awaiting_required_reviews',
          reviewCaseId: reviewSubmission.reviewCaseId,
          route: 'narrative',
          workflowState: 'under_review',
          completedVoteCount: 2,
          requiredVoteCount: 3,
          pendingReason: null,
          createdAssignment: null,
          decision: null,
          previousVotesExposed: false,
          syntheticOnly: true,
        },
        status: {
          workflowStatus: 'snapshot_under_review',
          displayLabelCode: 'STATUS_SNAPSHOT_UNDER_REVIEW',
          phase: 'review',
          familyActionRequired: false,
          nextActionCode: 'AWAIT_REVIEW',
          deadline: null,
          pendingReason: null,
          claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
        },
      },
      meta,
    } as const;

    expect(submitReviewResponseSchema.parse(response)).toEqual(response);
  });

  it('finalizes matching artifact votes after two and binds the case references', () => {
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        reviewSubmission: {
          ...reviewSubmission,
          classification: 'qualifies',
        },
        transition: {
          kind: 'finalized',
          reviewCaseId: reviewSubmission.reviewCaseId,
          route: 'artifact',
          workflowState: 'finalized',
          completedVoteCount: 2,
          requiredVoteCount: 2,
          pendingReason: null,
          createdAssignment: null,
          decision: {
            decisionId: '00000000-0000-4000-8000-000000000901',
            decisionKind: 'track_b_eligibility',
            outcome: 'qualifies',
            pendingReason: null,
            orderedReasonCodes: ['REVIEW_MAJORITY_QUALIFIES'],
            resultHash: `sha256:${'2'.repeat(64)}`,
            policyBundleId: 'PB-SYN-01',
            syntheticOnly: true,
          },
          previousVotesExposed: false,
          syntheticOnly: true,
        },
        status: {
          workflowStatus: 'track_b_eligible',
          displayLabelCode: 'STATUS_TRACK_B_ELIGIBLE',
          phase: 'decision',
          familyActionRequired: false,
          nextActionCode: null,
          deadline: null,
          pendingReason: null,
          claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
        },
      },
      meta,
    } as const;

    expect(submitReviewResponseSchema.parse(response)).toEqual(response);
    expect(
      submitReviewResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          reviewSubmission: {
            ...response.data.reviewSubmission,
            reviewCaseId: '00000000-0000-4000-8000-000000000699',
          },
        },
      }).success,
    ).toBe(false);
  });

  it('rejects narrative finalization before the third vote', () => {
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        reviewSubmission,
        transition: {
          kind: 'finalized',
          reviewCaseId: reviewSubmission.reviewCaseId,
          route: 'narrative',
          workflowState: 'finalized',
          completedVoteCount: 2,
          requiredVoteCount: 3,
          pendingReason: null,
          createdAssignment: null,
          decision: {
            decisionId: '00000000-0000-4000-8000-000000000901',
            decisionKind: 'track_b_eligibility',
            outcome: 'qualifies',
            pendingReason: null,
            orderedReasonCodes: ['REVIEW_MAJORITY_QUALIFIES'],
            resultHash: `sha256:${'2'.repeat(64)}`,
            policyBundleId: 'PB-SYN-01',
            syntheticOnly: true,
          },
          previousVotesExposed: false,
          syntheticOnly: true,
        },
        status: {
          workflowStatus: 'track_b_eligible',
          displayLabelCode: 'STATUS_TRACK_B_ELIGIBLE',
          phase: 'decision',
          familyActionRequired: false,
          nextActionCode: null,
          deadline: null,
          pendingReason: null,
          claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
        },
      },
      meta,
    } as const;

    expect(submitReviewResponseSchema.safeParse(response).success).toBe(false);
  });
});
