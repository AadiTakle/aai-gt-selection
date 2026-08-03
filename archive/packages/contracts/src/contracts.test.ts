import { describe, expect, it } from 'vitest';

import {
  FINAL_SIGNATURE_STATEMENT,
  apiErrorCodeSchema,
  decisionSummarySchema,
  getApplicationStatusRequestSchema,
  getApplicationStatusResponseSchema,
  recordAssessmentVersionRequestSchema,
  recordAssessmentVersionResponseSchema,
  reviewerClassificationSchema,
  saveApplicationDraftRequestSchema,
  saveApplicationDraftResponseSchema,
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
      studentProfileVersionId: uuid,
      draft: {
        application: {
          currentGradeCode: 'SYN_GRADE_05',
          requestedEntryYear: 2027,
          requestedGradeCode: 'SYN_GRADE_06',
        },
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
        draft: {
          ...request.draft,
          householdIncome: 100_000,
        },
      }).success,
    ).toBe(false);
    expect(
      saveApplicationDraftRequestSchema.safeParse({
        ...request,
        draft: {
          ...request.draft,
          dateOfBirth: '2016-01-01',
        },
      }).success,
    ).toBe(false);
    expect(
      saveApplicationDraftRequestSchema.safeParse({
        ...request,
        draft: {
          ...request.draft,
          essayOne: 'Synthetic prose is explicitly outside onboarding.',
        },
      }).success,
    ).toBe(false);
  });

  it('accepts a valid application submission request', () => {
    const request = {
      applicationVersionId: uuid,
      expectedVersion: 1,
      idempotencyKey: uuid,
      correlationId: uuid,
    };

    expect(submitApplicationRequestSchema.parse(request)).toBeDefined();
    expect(
      submitApplicationRequestSchema.safeParse({
        ...request,
        expectedVersion: 0,
      }).success,
    ).toBe(false);
  });

  it('returns typed draft-save and applicant-safe status-read envelopes', () => {
    const draftResponse = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        application: {
          applicationId: uuid,
          applicationVersionId: uuid,
          studentProfileVersionId: uuid,
          privateContextVersionId: uuid,
          version: 1,
          supersedesId: null,
          state: 'draft',
          application: {
            currentGradeCode: 'SYN_GRADE_05',
            requestedEntryYear: 2027,
            requestedGradeCode: 'SYN_GRADE_06',
          },
          syntheticOnly: true,
          contentHash: `sha256:${'1'.repeat(64)}`,
          privateContextContentHash: `sha256:${'2'.repeat(64)}`,
        },
      },
      meta: {
        correlationId: uuid,
        idempotencyKey: uuid,
        idempotentReplay: false,
      },
    };
    const statusRequest = {
      applicationId: uuid,
      correlationId: uuid,
    };
    const statusResponse = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        workflowStatus: 'application_draft',
        displayLabelCode: 'STATUS_APPLICATION_DRAFT',
        phase: 'application',
        familyActionRequired: true,
        nextActionCode: 'COMPLETE_APPLICATION',
        deadline: null,
        pendingReason: null,
        claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
      },
      meta: {
        correlationId: uuid,
        idempotencyKey: null,
        idempotentReplay: false,
      },
    };

    expect(saveApplicationDraftResponseSchema.parse(draftResponse)).toEqual(draftResponse);
    expect(getApplicationStatusRequestSchema.parse(statusRequest)).toEqual(statusRequest);
    expect(getApplicationStatusResponseSchema.parse(statusResponse)).toEqual(statusResponse);
    expect(Object.keys(statusResponse.data)).toEqual([
      'workflowStatus',
      'displayLabelCode',
      'phase',
      'familyActionRequired',
      'nextActionCode',
      'deadline',
      'pendingReason',
      'claimBoundaryCode',
    ]);
  });

  it('returns the submitted application with an applicant-safe status envelope', () => {
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        application: {
          applicationId: '00000000-0000-4000-8000-000000000001',
          applicationVersionId: '00000000-0000-4000-8000-000000000002',
          studentProfileVersionId: '00000000-0000-4000-8000-000000000003',
          privateContextVersionId: '00000000-0000-4000-8000-000000000004',
          version: 2,
          supersedesId: '00000000-0000-4000-8000-000000000005',
          state: 'submitted',
          syntheticOnly: true,
          application: {
            currentGradeCode: 'SYN_GRADE_05',
            requestedEntryYear: 2027,
            requestedGradeCode: 'SYN_GRADE_06',
          },
          school: {
            selectionKind: 'other',
            snapshot: {
              name: 'Synthetic Other School',
              typeCode: 'SYN_SCHOOL_OTHER',
              address: {
                line1: 'Synthetic 100 Example Way',
                line2: null,
                city: 'Synthetic City',
                regionCode: 'SYN_REGION_TX',
                postalCode: '00000',
                countryCode: 'US',
              },
              syntheticOnly: true,
            },
          },
          supportDisclosure: {
            supportNeeded: false,
            vocabularyVersion: 'SUPPORT-SYN-V1',
            accommodationCodes: [],
            supportPlanCodes: [],
            otherSelected: false,
            details: null,
            seriousDisciplineSanction: false,
            nonHealthWithdrawal: false,
            disclosureExplanation: null,
            purposeCode: 'SYN_SUPPORT_OPERATIONS_ONLY',
            syntheticOnly: true,
          },
          financialIntake: {
            annualHouseholdIncomeMinor: 12_500_000,
            currencyCode: 'USD',
            taxYear: 2025,
            incomeDefinitionCode: 'SYN_INCOME_GROSS_ANNUAL_V1',
            householdMemberCount: 4,
            householdMemberDefinitionCode: 'SYN_HOUSEHOLD_MEMBERS_V1',
            semanticsVersion: 'FINANCE-SYN-V1',
            purposeCode: 'SYN_FINANCIAL_AID_INTAKE_ONLY',
            syntheticOnly: true,
          },
          finalSubmission: {
            completedStepCodes: [
              'STUDENT_PROFILE',
              'EDUCATIONAL_BACKGROUND',
              'SUPPORT_DISCLOSURE',
              'HOUSEHOLD_LANGUAGE',
              'FINANCIAL_INTAKE',
              'REVIEW_SIGNATURE',
            ],
            acknowledgementVersion: 'ACKNOWLEDGEMENT-SYN-V1',
            acknowledgementStatement: FINAL_SIGNATURE_STATEMENT,
            accuracyAcknowledged: true,
            acknowledgedAt: '2026-07-20T16:00:00.000Z',
            referralSourceCode: 'SYN_REFERRAL_WEB_SEARCH',
            signatureStatementVersion: 'SIGNATURE-SYN-V1',
            signatureStatement: FINAL_SIGNATURE_STATEMENT,
            signatureName: 'Synthetic Guardian One',
            signedAt: '2026-07-20T16:01:00.000Z',
          },
          contentHash: `sha256:${'1'.repeat(64)}`,
          privateContextContentHash: `sha256:${'2'.repeat(64)}`,
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

  it('restricts decision reasons to the versioned public vocabulary', () => {
    const result = decisionSummarySchema.safeParse({
      decisionId: uuid,
      decisionKind: 'track_a_eligibility',
      outcome: 'eligible',
      pendingReason: null,
      orderedReasonCodes: ['UNVERSIONED_REASON'],
      resultHash: `sha256:${'1'.repeat(64)}`,
      policyBundleId: 'PB-SYN-01',
      syntheticOnly: true,
    });

    expect(result.success).toBe(false);
  });

  it('ties each decision outcome to its decision kind', () => {
    const result = decisionSummarySchema.safeParse({
      decisionId: uuid,
      decisionKind: 'track_a_eligibility',
      outcome: 'invited',
      pendingReason: null,
      orderedReasonCodes: ['TA_BELOW_CONFIGURED_BOUNDARY'],
      resultHash: `sha256:${'1'.repeat(64)}`,
      policyBundleId: 'PB-SYN-01',
      syntheticOnly: true,
    });

    expect(result.success).toBe(false);
  });

  it('returns invalid assessment routing as a domain-level pending response', () => {
    const assessment = {
      instrumentCode: 'COGAT_SYNTHETIC',
      compositeScore: null,
      verbalScore: null,
      quantitativeScore: null,
      nonverbalScore: null,
      validity: 'invalid',
      syntheticOnly: true,
    };
    const request = {
      applicationId: uuid,
      assessment,
      supersedesAssessmentVersionId: null,
      expectedVersion: 0,
      idempotencyKey: uuid,
      correlationId: uuid,
    };
    const decisionBase = {
      decisionId: uuid,
      outcome: 'pending',
      pendingReason: 'pending_assessment_correction',
      orderedReasonCodes: ['ASSESSMENT_MISSING_OR_INVALID'],
      resultHash: `sha256:${'2'.repeat(64)}`,
      policyBundleId: 'PB-SYN-01',
      syntheticOnly: true,
    };
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        assessment: {
          assessmentVersionId: uuid,
          applicationId: uuid,
          version: 1,
          supersedesId: null,
          ...assessment,
        },
        routing: {
          inputHash: `sha256:${'1'.repeat(64)}`,
          trackA: {
            ...decisionBase,
            decisionKind: 'track_a_eligibility',
          },
          trackBInvitation: {
            ...decisionBase,
            decisionKind: 'track_b_invitation',
          },
        },
        status: {
          workflowStatus: 'assessment_needs_correction',
          displayLabelCode: 'STATUS_ASSESSMENT_NEEDS_CORRECTION',
          phase: 'assessment',
          familyActionRequired: false,
          nextActionCode: 'AWAIT_ASSESSMENT_CORRECTION',
          deadline: null,
          pendingReason: 'pending_assessment_correction',
          claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
        },
      },
      meta: {
        correlationId: uuid,
        idempotencyKey: uuid,
        idempotentReplay: false,
      },
    };

    expect(recordAssessmentVersionRequestSchema.parse(request)).toEqual(request);
    expect(recordAssessmentVersionResponseSchema.parse(response)).toEqual(response);
    expect(response.data.routing.trackA.orderedReasonCodes).toEqual([
      'ASSESSMENT_MISSING_OR_INVALID',
    ]);
  });

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
