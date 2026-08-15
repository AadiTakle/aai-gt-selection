import { describe, expect, it } from 'vitest';

import { submitReviewActionRequestSchema, submitReviewActionResponseSchema } from './index';

const assignmentId = '00000000-0000-4000-8000-000000000705';
const reviewCaseId = '00000000-0000-4000-8000-000000000602';
const correlationId = '00000000-0000-4000-8000-000000000301';
const idempotencyKey = '00000000-0000-4000-8000-000000000302';
const dueAt = '2026-07-21T17:00:00.000-05:00';
const meta = {
  correlationId,
  idempotencyKey,
  idempotentReplay: false,
} as const;

describe('review abstention and pending contracts', () => {
  it('turns a competence abstention into replacement work, not a vote', () => {
    const request = {
      assignmentId,
      expectedVersion: 1,
      idempotencyKey,
      correlationId,
      abstentionReason: 'insufficient_route_competence',
    } as const;
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        abstention: {
          abstentionId: '00000000-0000-4000-8000-000000000811',
          assignmentId,
          reviewCaseId,
          reason: 'insufficient_route_competence',
          version: 1,
          locked: true,
          syntheticOnly: true,
        },
        transition: {
          kind: 'replacement_assignment_created',
          reviewCaseId,
          route: 'narrative',
          workflowState: 'under_review',
          completedVoteCount: 2,
          requiredVoteCount: 3,
          pendingReason: null,
          createdAssignment: {
            assignmentId: '00000000-0000-4000-8000-000000000706',
            replacesAssignmentId: assignmentId,
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

    expect(submitReviewActionRequestSchema.parse(request)).toEqual(request);
    expect(submitReviewActionResponseSchema.parse(response)).toEqual(response);
    expect(
      submitReviewActionRequestSchema.safeParse({
        ...request,
        classification: 'pending',
      }).success,
    ).toBe(false);
    expect(
      submitReviewActionResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          transition: {
            ...response.data.transition,
            createdAssignment: {
              ...response.data.transition.createdAssignment,
              reviewerRole: 'reviewer',
            },
          },
        },
      }).success,
    ).toBe(false);
  });

  it('routes decision-critical evidence defects to family correction before aggregation', () => {
    const issue = {
      kind: 'evidence_correction_required',
      reasonCode: 'missing_provenance',
      syntheticOnly: true,
    } as const;
    const request = {
      assignmentId,
      expectedVersion: 1,
      idempotencyKey,
      correlationId,
      issue,
    };
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        blockingIssue: {
          blockingIssueId: '00000000-0000-4000-8000-000000000821',
          assignmentId,
          reviewCaseId,
          issue,
          version: 1,
          locked: true,
          syntheticOnly: true,
        },
        transition: {
          kind: 'pending_review_blocker',
          reviewCaseId,
          route: 'artifact',
          workflowState: 'pending',
          completedVoteCount: 1,
          requiredVoteCount: 2,
          pendingReason: 'pending_evidence_correction',
          pendingItem: {
            pendingItemId: '00000000-0000-4000-8000-000000000831',
            reason: 'pending_evidence_correction',
            ownerRole: 'family',
            dueAt,
            routeCode: 'family_evidence_correction',
            state: 'open',
            syntheticOnly: true,
          },
          createdAssignment: null,
          decision: null,
          previousVotesExposed: false,
          syntheticOnly: true,
        },
        status: {
          workflowStatus: 'review_pending_family_action',
          displayLabelCode: 'STATUS_REVIEW_PENDING_FAMILY_ACTION',
          phase: 'review',
          familyActionRequired: true,
          nextActionCode: 'CORRECT_SNAPSHOT_EVIDENCE',
          deadline: dueAt,
          pendingReason: 'pending_evidence_correction',
          claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
        },
      },
      meta,
    } as const;

    expect(submitReviewActionRequestSchema.parse(request)).toEqual(request);
    expect(submitReviewActionResponseSchema.parse(response)).toEqual(response);
    expect(
      submitReviewActionResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          status: {
            ...response.data.status,
            deadline: '2026-07-22T17:00:00.000-05:00',
          },
        },
      }).success,
    ).toBe(false);
  });

  it('routes a failed accessibility path to an internal access steward', () => {
    const issue = {
      kind: 'accessibility_route_required',
      reasonCode: 'route_failed',
      syntheticOnly: true,
    } as const;
    const request = {
      assignmentId,
      expectedVersion: 1,
      idempotencyKey,
      correlationId,
      issue,
    };
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        blockingIssue: {
          blockingIssueId: '00000000-0000-4000-8000-000000000822',
          assignmentId,
          reviewCaseId,
          issue,
          version: 1,
          locked: true,
          syntheticOnly: true,
        },
        transition: {
          kind: 'pending_review_blocker',
          reviewCaseId,
          route: 'narrative',
          workflowState: 'pending',
          completedVoteCount: 0,
          requiredVoteCount: 3,
          pendingReason: 'pending_accessibility_route',
          pendingItem: {
            pendingItemId: '00000000-0000-4000-8000-000000000832',
            reason: 'pending_accessibility_route',
            ownerRole: 'access_steward',
            dueAt,
            routeCode: 'internal_accessibility_route',
            state: 'open',
            syntheticOnly: true,
          },
          createdAssignment: null,
          decision: null,
          previousVotesExposed: false,
          syntheticOnly: true,
        },
        status: {
          workflowStatus: 'review_pending_internal_action',
          displayLabelCode: 'STATUS_REVIEW_PENDING_INTERNAL_ACTION',
          phase: 'review',
          familyActionRequired: false,
          nextActionCode: 'AWAIT_ACCESSIBILITY_ROUTE',
          deadline: dueAt,
          pendingReason: 'pending_accessibility_route',
          claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
        },
      },
      meta,
    } as const;

    expect(submitReviewActionRequestSchema.parse(request)).toEqual(request);
    expect(submitReviewActionResponseSchema.parse(response)).toEqual(response);
  });
});
