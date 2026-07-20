import { describe, expect, it } from 'vitest';

import {
  applyCorrectionRequestSchema,
  applyCorrectionResponseSchema,
  disabledCorrectionRequestSchema,
  disabledCorrectionResponseSchema,
} from './index';

const uuid = '00000000-0000-4000-8000-000000000001';
const correlationId = '00000000-0000-4000-8000-000000000301';
const idempotencyKey = '00000000-0000-4000-8000-000000000302';
const hash = (character: string) => `sha256:${character.repeat(64)}`;

describe('correction contracts', () => {
  it('creates a successor assessment and reruns from one complete manifest', () => {
    const request = {
      correctionCaseId: '00000000-0000-4000-8000-000000000911',
      expectedCaseVersion: 1,
      idempotencyKey,
      correlationId,
      correction: {
        kind: 'assessment_factual',
        targetAssessmentVersionId: '00000000-0000-4000-8000-000000000201',
        correctedAssessment: {
          instrumentCode: 'COGAT_SYNTHETIC',
          compositeScore: 90,
          verbalScore: 89,
          quantitativeScore: 90,
          nonverbalScore: 89,
          validity: 'valid',
          syntheticOnly: true,
        },
      },
    } as const;
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        correction: {
          correctionCaseId: request.correctionCaseId,
          correctionKind: 'factual_or_provenance',
          resolution: 'applied',
          originalPreserved: true,
          syntheticOnly: true,
        },
        originalVersion: {
          entityType: 'assessment_version',
          versionId: request.correction.targetAssessmentVersionId,
          version: 1,
          supersedesId: null,
          contentHash: hash('1'),
          syntheticOnly: true,
        },
        successorVersion: {
          entityType: 'assessment_version',
          versionId: '00000000-0000-4000-8000-000000000205',
          version: 2,
          supersedesId: request.correction.targetAssessmentVersionId,
          contentHash: hash('2'),
          syntheticOnly: true,
        },
        decisionImpact: {
          decisionUse: 'decision_used',
          rerunStatus: 'completed',
          manifestHash: hash('3'),
          policyBundleId: 'PB-SYN-01',
          affectedDecisionRunIds: ['00000000-0000-4000-8000-000000000921'],
          inputHashBefore: hash('4'),
          inputHashAfter: hash('5'),
          resultHashBefore: hash('6'),
          resultHashAfter: hash('7'),
          exactOriginalReplayPreserved: true,
        },
        status: {
          workflowStatus: 'track_a_eligible',
          displayLabelCode: 'STATUS_TRACK_A_ELIGIBLE',
          phase: 'decision',
          familyActionRequired: false,
          nextActionCode: null,
          deadline: null,
          pendingReason: null,
          claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
        },
      },
      meta: {
        correlationId,
        idempotencyKey,
        idempotentReplay: false,
      },
    } as const;

    expect(applyCorrectionRequestSchema.parse(request)).toEqual(request);
    expect(applyCorrectionResponseSchema.parse(response)).toEqual(response);
    expect(
      applyCorrectionResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          successorVersion: {
            ...response.data.successorVersion,
            supersedesId: uuid,
          },
        },
      }).success,
    ).toBe(false);
    expect(
      applyCorrectionResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          decisionImpact: {
            ...response.data.decisionImpact,
            inputHashAfter: response.data.decisionImpact.inputHashBefore,
          },
        },
      }).success,
    ).toBe(false);
    expect(
      applyCorrectionResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          decisionImpact: {
            ...response.data.decisionImpact,
            resultHashAfter: response.data.decisionImpact.resultHashBefore,
          },
        },
      }).success,
    ).toBe(false);
  });

  it('proves excluded-field correction leaves decision hashes unchanged', () => {
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        correction: {
          correctionCaseId: '00000000-0000-4000-8000-000000000912',
          correctionKind: 'factual_or_provenance',
          resolution: 'applied',
          originalPreserved: true,
          syntheticOnly: true,
        },
        originalVersion: {
          entityType: 'application_version',
          versionId: '00000000-0000-4000-8000-000000000101',
          version: 1,
          supersedesId: null,
          contentHash: hash('8'),
          syntheticOnly: true,
        },
        successorVersion: {
          entityType: 'application_version',
          versionId: '00000000-0000-4000-8000-000000000102',
          version: 2,
          supersedesId: '00000000-0000-4000-8000-000000000101',
          contentHash: hash('9'),
          syntheticOnly: true,
        },
        decisionImpact: {
          decisionUse: 'excluded_from_decision',
          rerunStatus: 'not_required_invariant_verified',
          manifestHash: null,
          policyBundleId: 'PB-SYN-01',
          affectedDecisionRunIds: [],
          inputHashBefore: hash('a'),
          inputHashAfter: hash('a'),
          resultHashBefore: hash('b'),
          resultHashAfter: hash('b'),
          exactOriginalReplayPreserved: true,
        },
        status: {
          workflowStatus: 'track_b_snapshot_required',
          displayLabelCode: 'STATUS_TRACK_B_SNAPSHOT_REQUIRED',
          phase: 'snapshot',
          familyActionRequired: true,
          nextActionCode: 'SUBMIT_SNAPSHOT',
          deadline: null,
          pendingReason: null,
          claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
        },
      },
      meta: {
        correlationId,
        idempotencyKey,
        idempotentReplay: false,
      },
    } as const;

    expect(applyCorrectionResponseSchema.parse(response)).toEqual(response);
    expect(
      applyCorrectionResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          decisionImpact: {
            ...response.data.decisionImpact,
            inputHashAfter: hash('c'),
          },
        },
      }).success,
    ).toBe(false);
  });

  it('bounds application, provenance, and procedural corrections to existing records', () => {
    const common = {
      correctionCaseId: '00000000-0000-4000-8000-000000000914',
      expectedCaseVersion: 1,
      idempotencyKey,
      correlationId,
    } as const;
    const applicationRequest = {
      ...common,
      correction: {
        kind: 'application_factual',
        targetApplicationVersionId: '00000000-0000-4000-8000-000000000101',
        correctedApplication: {
          student: {
            currentGrade: '5',
            requestedGrade: '6',
            requestedEntryYear: 2028,
          },
          syntheticOnly: true,
        },
      },
    } as const;
    const provenanceRequest = {
      ...common,
      correction: {
        kind: 'snapshot_provenance',
        targetSnapshotVersionId: '00000000-0000-4000-8000-000000000501',
        fixtureProvenanceCorrections: [
          {
            fixtureId: 'fixture:artifact-qualifying',
            correctedProvenance: {
              creationMethod: 'independent_synthetic_construction',
              sourceRecordUsed: false,
              reviewedAt: '2026-07-19T09:00:00.000-05:00',
            },
          },
        ],
      },
    } as const;
    const proceduralRequest = {
      ...common,
      correction: {
        kind: 'procedural_error',
        targetDecisionId: '00000000-0000-4000-8000-000000000901',
        errorCode: 'wrong_policy_version',
        cureCode: 'rerun_complete_manifest',
      },
    } as const;

    expect(applyCorrectionRequestSchema.parse(applicationRequest)).toEqual(applicationRequest);
    expect(applyCorrectionRequestSchema.parse(provenanceRequest)).toEqual(provenanceRequest);
    expect(applyCorrectionRequestSchema.parse(proceduralRequest)).toEqual(proceduralRequest);
    expect(
      applyCorrectionRequestSchema.safeParse({
        ...provenanceRequest,
        correction: {
          ...provenanceRequest.correction,
          newFixtureId: 'fixture:new-evidence',
        },
      }).success,
    ).toBe(false);
  });

  it('returns FEATURE_DISABLED for substantive appeal or new evidence', () => {
    const request = {
      correctionCaseId: '00000000-0000-4000-8000-000000000913',
      expectedCaseVersion: 1,
      idempotencyKey,
      correlationId,
      disabledKind: 'substantive_rubric_appeal',
    } as const;
    const response = {
      error: {
        code: 'FEATURE_DISABLED',
        message: 'Substantive rubric appeal is deferred beyond the synthetic MVP.',
        retryable: false,
        correlationId,
        currentState: 'correction_available',
        fieldErrors: [],
      },
    } as const;

    expect(disabledCorrectionRequestSchema.parse(request)).toEqual(request);
    expect(disabledCorrectionResponseSchema.parse(response)).toEqual(response);
    expect(applyCorrectionRequestSchema.safeParse(request).success).toBe(false);
    expect(
      disabledCorrectionRequestSchema.safeParse({
        ...request,
        disabledKind: 'new_evidence',
      }).success,
    ).toBe(true);
  });
});
