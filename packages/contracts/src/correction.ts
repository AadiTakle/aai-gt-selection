import { z } from 'zod';

import { apiSuccessSchema } from './api-envelope';
import { applicationDraftSchema, assessmentInputSchema } from './application';
import { apiErrorSchema } from './errors';
import { fixtureProvenanceSchema } from './review';
import { statusProjectionSchema } from './workflow';

const sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

const applicationFactualCorrectionSchema = z
  .object({
    kind: z.literal('application_factual'),
    targetApplicationVersionId: z.uuid(),
    correctedApplication: applicationDraftSchema,
  })
  .strict();

const assessmentFactualCorrectionSchema = z
  .object({
    kind: z.literal('assessment_factual'),
    targetAssessmentVersionId: z.uuid(),
    correctedAssessment: assessmentInputSchema,
  })
  .strict();

const fixtureProvenanceCorrectionSchema = z
  .object({
    fixtureId: z.string().min(1),
    correctedProvenance: fixtureProvenanceSchema,
  })
  .strict();

const snapshotProvenanceCorrectionSchema = z
  .object({
    kind: z.literal('snapshot_provenance'),
    targetSnapshotVersionId: z.uuid(),
    fixtureProvenanceCorrections: z.array(fixtureProvenanceCorrectionSchema).min(1).max(2),
  })
  .strict();

const proceduralCorrectionSchema = z
  .object({
    kind: z.literal('procedural_error'),
    targetDecisionId: z.uuid(),
    errorCode: z.enum([
      'wrong_policy_version',
      'required_review_omitted',
      'submitted_item_omitted',
    ]),
    cureCode: z.enum([
      'rerun_complete_manifest',
      'fresh_conflict_cleared_review',
      'include_omitted_submitted_item',
    ]),
  })
  .strict();

export const verifiedCorrectionSchema = z.discriminatedUnion('kind', [
  applicationFactualCorrectionSchema,
  assessmentFactualCorrectionSchema,
  snapshotProvenanceCorrectionSchema,
  proceduralCorrectionSchema,
]);

export const applyCorrectionRequestSchema = z
  .object({
    correctionCaseId: z.uuid(),
    expectedCaseVersion: z.int().positive(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
    correction: verifiedCorrectionSchema,
  })
  .strict();

export const disabledCorrectionRequestSchema = z
  .object({
    correctionCaseId: z.uuid(),
    expectedCaseVersion: z.int().positive(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
    disabledKind: z.enum(['substantive_rubric_appeal', 'new_evidence']),
  })
  .strict();

export const correctionVersionReferenceSchema = z
  .object({
    entityType: z.enum([
      'application_version',
      'assessment_version',
      'snapshot_version',
      'decision_trace',
    ]),
    versionId: z.uuid(),
    version: z.int().positive(),
    supersedesId: z.uuid().nullable(),
    contentHash: sha256Schema,
    syntheticOnly: z.literal(true),
  })
  .strict();

const decisionUsedImpactSchema = z
  .object({
    decisionUse: z.literal('decision_used'),
    rerunStatus: z.literal('completed'),
    manifestHash: sha256Schema,
    policyBundleId: z.string().min(1),
    affectedDecisionRunIds: z.array(z.uuid()).min(1),
    inputHashBefore: sha256Schema,
    inputHashAfter: sha256Schema,
    resultHashBefore: sha256Schema,
    resultHashAfter: sha256Schema,
    exactOriginalReplayPreserved: z.literal(true),
  })
  .strict()
  .superRefine((impact, context) => {
    if (
      impact.inputHashBefore === impact.inputHashAfter ||
      impact.resultHashBefore === impact.resultHashAfter
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Decision-used correction must bind a new input and result commitment.',
      });
    }
  });

const excludedDecisionImpactSchema = z
  .object({
    decisionUse: z.literal('excluded_from_decision'),
    rerunStatus: z.literal('not_required_invariant_verified'),
    manifestHash: z.null(),
    policyBundleId: z.string().min(1),
    affectedDecisionRunIds: z.tuple([]),
    inputHashBefore: sha256Schema,
    inputHashAfter: sha256Schema,
    resultHashBefore: sha256Schema,
    resultHashAfter: sha256Schema,
    exactOriginalReplayPreserved: z.literal(true),
  })
  .strict()
  .superRefine((impact, context) => {
    if (
      impact.inputHashBefore !== impact.inputHashAfter ||
      impact.resultHashBefore !== impact.resultHashAfter
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Decision-excluded correction must preserve input and result hashes.',
      });
    }
  });

export const correctionDecisionImpactSchema = z.discriminatedUnion('decisionUse', [
  decisionUsedImpactSchema,
  excludedDecisionImpactSchema,
]);

export const appliedCorrectionSchema = z
  .object({
    correctionCaseId: z.uuid(),
    correctionKind: z.enum(['factual_or_provenance', 'procedural_error']),
    resolution: z.literal('applied'),
    originalPreserved: z.literal(true),
    syntheticOnly: z.literal(true),
  })
  .strict();

const applyCorrectionResponseDataSchema = z
  .object({
    correction: appliedCorrectionSchema,
    originalVersion: correctionVersionReferenceSchema,
    successorVersion: correctionVersionReferenceSchema,
    decisionImpact: correctionDecisionImpactSchema,
    status: statusProjectionSchema,
  })
  .strict()
  .superRefine(({ originalVersion, successorVersion }, context) => {
    if (
      successorVersion.entityType !== originalVersion.entityType ||
      successorVersion.supersedesId !== originalVersion.versionId ||
      successorVersion.version !== originalVersion.version + 1 ||
      successorVersion.versionId === originalVersion.versionId
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Correction successor must extend exactly one immutable original version.',
        path: ['successorVersion'],
      });
    }
  });

export const applyCorrectionResponseSchema = apiSuccessSchema(applyCorrectionResponseDataSchema);

export const disabledCorrectionResponseSchema = apiErrorSchema.superRefine(({ error }, context) => {
  if (error.code !== 'FEATURE_DISABLED' || error.retryable) {
    context.addIssue({
      code: 'custom',
      message: 'Deferred correction requests must return non-retryable FEATURE_DISABLED.',
      path: ['error', 'code'],
    });
  }
});

export type VerifiedCorrection = z.infer<typeof verifiedCorrectionSchema>;
export type ApplyCorrectionRequest = z.infer<typeof applyCorrectionRequestSchema>;
export type DisabledCorrectionRequest = z.infer<typeof disabledCorrectionRequestSchema>;
export type CorrectionVersionReference = z.infer<typeof correctionVersionReferenceSchema>;
export type CorrectionDecisionImpact = z.infer<typeof correctionDecisionImpactSchema>;
export type AppliedCorrection = z.infer<typeof appliedCorrectionSchema>;
export type ApplyCorrectionResponse = z.infer<typeof applyCorrectionResponseSchema>;
