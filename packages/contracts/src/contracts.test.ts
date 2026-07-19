import { describe, expect, it } from 'vitest';

import {
  apiErrorCodeSchema,
  reviewerClassificationSchema,
  saveApplicationDraftRequestSchema,
  statusProjectionSchema,
  submitApplicationRequestSchema,
  submitApplicationResponseSchema,
  submitReviewRequestSchema,
  trackAOutcomeSchema,
  trackBEligibilityOutcomeSchema,
  trackBInvitationOutcomeSchema,
} from './index';

const uuid = '00000000-0000-4000-8000-000000000001';

describe('public contract boundaries', () => {
  it('accepts a versioned idempotent draft-save request and rejects unknown fields', () => {
    const request = {
      applicationId: uuid,
      draft: {
        currentGrade: '5',
        requestedEntryYear: 2027,
        requestedGrade: '6',
        syntheticOnly: true,
      },
      expectedVersion: 0,
      idempotencyKey: uuid,
      correlationId: uuid,
    };

    expect(saveApplicationDraftRequestSchema.parse(request)).toEqual(request);
    expect(
      saveApplicationDraftRequestSchema.safeParse({
        ...request,
        householdIncome: 100_000,
      }).success,
    ).toBe(false);
  });

  it('accepts a valid application submission request', () => {
    expect(
      submitApplicationRequestSchema.parse({
        applicationVersionId: uuid,
        expectedVersion: 1,
        idempotencyKey: uuid,
        correlationId: uuid,
      }),
    ).toBeDefined();
  });

  it('returns the submitted application with an applicant-safe status envelope', () => {
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        application: {
          applicationId: uuid,
          applicationVersionId: uuid,
          version: 1,
          supersedesId: null,
          state: 'submitted',
          syntheticOnly: true,
          currentGrade: '5',
          requestedGrade: '6',
          requestedEntryYear: 2027,
          contentHash: `sha256:${'1'.repeat(64)}`,
        },
        status: {
          workflowStatus: 'awaiting_assessment',
          displayLabelCode: 'STATUS_AWAITING_ASSESSMENT',
          phase: 'assessment',
          familyActionRequired: false,
          nextActionCode: 'AWAIT_ASSESSMENT',
          deadline: null,
          pendingReason: null,
          claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
        },
      },
      meta: {
        correlationId: uuid,
        idempotencyKey: uuid,
        idempotentReplay: false,
      },
    };

    expect(submitApplicationResponseSchema.parse(response)).toEqual(response);
    expect(
      submitApplicationResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          status: {
            ...response.data.status,
            workflowStatus: 'admitted',
          },
        },
      }).success,
    ).toBe(false);
  });

  it.each(['admitted', 'offered', 'waitlisted', 'funded', 'not gifted'])(
    'rejects prohibited public outcome %s',
    (prohibitedOutcome) => {
      expect(trackAOutcomeSchema.safeParse(prohibitedOutcome).success).toBe(false);
      expect(trackBInvitationOutcomeSchema.safeParse(prohibitedOutcome).success).toBe(false);
      expect(trackBEligibilityOutcomeSchema.safeParse(prohibitedOutcome).success).toBe(false);
    },
  );

  it('accepts only binary reviewer classifications', () => {
    expect(reviewerClassificationSchema.safeParse('qualifies').success).toBe(true);
    expect(reviewerClassificationSchema.safeParse('pending').success).toBe(false);
  });

  it('rejects duplicate review dimensions', () => {
    const duplicatedRating = {
      dimensionCode: 'DE',
      anchorCode: 'DE-2',
      ratingCode: '2',
      evidenceReference: 'fixture:artifact-qualifying',
    };

    const result = submitReviewRequestSchema.safeParse({
      assignmentId: uuid,
      expectedVersion: 1,
      idempotencyKey: uuid,
      correlationId: uuid,
      classification: 'qualifies',
      ratings: Array.from({ length: 6 }, () => duplicatedRating),
    });

    expect(result.success).toBe(false);
  });

  it('requires the eligibility-not-admission claim boundary', () => {
    const result = statusProjectionSchema.safeParse({
      workflowStatus: 'track_b_eligible',
      displayLabelCode: 'STATUS_TRACK_B_ELIGIBLE',
      phase: 'decision',
      familyActionRequired: false,
      nextActionCode: null,
      deadline: null,
      pendingReason: null,
      claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
    });

    expect(result.success).toBe(true);
  });

  it('keeps the API error vocabulary closed', () => {
    expect(apiErrorCodeSchema.safeParse('ROLE_FORBIDDEN').success).toBe(true);
    expect(apiErrorCodeSchema.safeParse('DATABASE_ERROR').success).toBe(false);
  });
});
