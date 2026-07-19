import { z } from 'zod';

import { apiSuccessSchema } from './api-envelope';
import { statusProjectionSchema } from './workflow';

export const snapshotRouteSchema = z.enum(['artifact', 'narrative']);
export const reviewerClassificationSchema = z.enum(['qualifies', 'does_not_currently_qualify']);

export const reviewDimensionCodeSchema = z.enum(['DE', 'LR', 'TA', 'IN', 'RE', 'SP']);

export const fixtureProvenanceSchema = z
  .object({
    creationMethod: z.literal('independent_synthetic_construction'),
    sourceRecordUsed: z.literal(false),
    reviewedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const snapshotFixtureReferenceSchema = z
  .object({
    fixtureId: z.string().min(1),
    route: snapshotRouteSchema,
    domainCode: z.string().min(1),
    syntheticOnly: z.literal(true),
    provenance: fixtureProvenanceSchema,
  })
  .strict();

const domainCodesSchema = z.array(z.string().min(1)).min(1).max(2);
const artifactFixtureReferenceSchema = snapshotFixtureReferenceSchema.extend({
  route: z.literal('artifact'),
});
const narrativeFixtureReferenceSchema = snapshotFixtureReferenceSchema.extend({
  route: z.literal('narrative'),
});

const requireFixtureDomains = (
  value: { domainCodes: string[]; fixtureReferences: { domainCode: string }[] },
  context: z.RefinementCtx,
) => {
  const selectedDomains = new Set(value.domainCodes);
  if (value.fixtureReferences.some(({ domainCode }) => !selectedDomains.has(domainCode))) {
    context.addIssue({
      code: 'custom',
      message: 'Every fixture domain must be one of the selected primary domains.',
      path: ['domainCodes'],
    });
  }
};

export const narrativeContextSchema = z
  .object({
    observerRelationship: z.enum(['parent_guardian', 'direct_observer']),
    observationDurationMonths: z.int().min(1).max(216),
    observationFrequency: z.enum(['daily', 'weekly', 'monthly', 'less_than_monthly']),
    settingCodes: z
      .array(z.enum(['home', 'school', 'community', 'other_synthetic']))
      .min(1)
      .max(4),
    paidRelationship: z.boolean(),
    instructionOrAssistance: z.enum(['none', 'limited', 'substantive']),
    opportunityContext: z.enum(['routine_access', 'limited_access', 'unknown']),
    conflictOfInterest: z.boolean(),
    wordCount: z.int().min(1).max(400),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const artifactSnapshotInputSchema = z
  .object({
    route: z.literal('artifact'),
    domainCodes: domainCodesSchema,
    fixtureReferences: z.array(artifactFixtureReferenceSchema).min(1).max(2),
    syntheticOnly: z.literal(true),
  })
  .strict()
  .superRefine(requireFixtureDomains);

export const narrativeSnapshotInputSchema = z
  .object({
    route: z.literal('narrative'),
    domainCodes: domainCodesSchema,
    fixtureReferences: z.tuple([narrativeFixtureReferenceSchema]),
    narrativeContext: narrativeContextSchema,
    syntheticOnly: z.literal(true),
  })
  .strict()
  .superRefine(requireFixtureDomains);

export const snapshotInputSchema = z.discriminatedUnion('route', [
  artifactSnapshotInputSchema,
  narrativeSnapshotInputSchema,
]);

const snapshotVersionFields = {
  snapshotVersionId: z.uuid(),
  applicationId: z.uuid(),
  version: z.int().positive(),
  supersedesId: z.uuid().nullable(),
  contentHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
};

export const artifactSnapshotVersionSchema =
  artifactSnapshotInputSchema.safeExtend(snapshotVersionFields);
export const narrativeSnapshotVersionSchema =
  narrativeSnapshotInputSchema.safeExtend(snapshotVersionFields);
export const snapshotVersionSchema = z.discriminatedUnion('route', [
  artifactSnapshotVersionSchema,
  narrativeSnapshotVersionSchema,
]);

export const submitSnapshotVersionRequestSchema = z
  .object({
    applicationId: z.uuid(),
    trackBInvitationDecisionId: z.uuid(),
    snapshot: snapshotInputSchema,
    supersedesSnapshotVersionId: z.uuid().nullable(),
    expectedVersion: z.int().nonnegative(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

const initialAssignmentBaseSchema = z
  .object({
    assignmentId: z.uuid(),
    status: z.literal('assigned'),
    blind: z.literal(true),
    syntheticOnly: z.literal(true),
  })
  .strict();

const reviewerSlotOneSchema = initialAssignmentBaseSchema.extend({
  slot: z.literal(1),
  reviewerRole: z.literal('reviewer'),
});
const reviewerSlotTwoSchema = initialAssignmentBaseSchema.extend({
  slot: z.literal(2),
  reviewerRole: z.literal('reviewer'),
});
const supervisorSlotThreeSchema = initialAssignmentBaseSchema.extend({
  slot: z.literal(3),
  reviewerRole: z.literal('supervisor'),
});

const reviewCaseBaseFields = {
  reviewCaseId: z.uuid(),
  snapshotVersionId: z.uuid(),
  rubricVersionId: z.literal('RB-SYN-01'),
  workflowState: z.literal('under_review'),
  blind: z.literal(true),
  syntheticOnly: z.literal(true),
};

export const artifactReviewCaseSchema = z
  .object({
    ...reviewCaseBaseFields,
    route: z.literal('artifact'),
    initialAssignments: z.tuple([reviewerSlotOneSchema, reviewerSlotTwoSchema]),
  })
  .strict();

export const narrativeReviewCaseSchema = z
  .object({
    ...reviewCaseBaseFields,
    route: z.literal('narrative'),
    initialAssignments: z.tuple([
      reviewerSlotOneSchema,
      reviewerSlotTwoSchema,
      supervisorSlotThreeSchema,
    ]),
  })
  .strict();

export const reviewCaseSchema = z.discriminatedUnion('route', [
  artifactReviewCaseSchema,
  narrativeReviewCaseSchema,
]);

export const snapshotUnderReviewStatusSchema = statusProjectionSchema.extend({
  workflowStatus: z.literal('snapshot_under_review'),
  displayLabelCode: z.literal('STATUS_SNAPSHOT_UNDER_REVIEW'),
  phase: z.literal('review'),
  familyActionRequired: z.literal(false),
  nextActionCode: z.literal('AWAIT_REVIEW'),
  deadline: z.null(),
  pendingReason: z.null(),
});

const artifactSnapshotSubmissionDataSchema = z
  .object({
    snapshot: artifactSnapshotVersionSchema,
    reviewCase: artifactReviewCaseSchema,
    status: snapshotUnderReviewStatusSchema,
  })
  .strict()
  .superRefine(({ snapshot, reviewCase }, context) => {
    if (snapshot.snapshotVersionId !== reviewCase.snapshotVersionId) {
      context.addIssue({
        code: 'custom',
        message: 'Review case must reference the submitted Snapshot version.',
        path: ['reviewCase', 'snapshotVersionId'],
      });
    }
  });
const narrativeSnapshotSubmissionDataSchema = z
  .object({
    snapshot: narrativeSnapshotVersionSchema,
    reviewCase: narrativeReviewCaseSchema,
    status: snapshotUnderReviewStatusSchema,
  })
  .strict()
  .superRefine(({ snapshot, reviewCase }, context) => {
    if (snapshot.snapshotVersionId !== reviewCase.snapshotVersionId) {
      context.addIssue({
        code: 'custom',
        message: 'Review case must reference the submitted Snapshot version.',
        path: ['reviewCase', 'snapshotVersionId'],
      });
    }
  });

export const submitSnapshotVersionResponseSchema = apiSuccessSchema(
  z.union([artifactSnapshotSubmissionDataSchema, narrativeSnapshotSubmissionDataSchema]),
);

export const reviewRatingSchema = z
  .object({
    dimensionCode: reviewDimensionCodeSchema,
    anchorCode: z.string().min(1),
    ratingCode: z.string().min(1),
    evidenceReference: z.string().min(1),
  })
  .strict();

export const submitReviewRequestSchema = z
  .object({
    assignmentId: z.uuid(),
    expectedVersion: z.int().nonnegative(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
    classification: reviewerClassificationSchema,
    ratings: z.array(reviewRatingSchema).length(6),
  })
  .strict()
  .superRefine(({ ratings }, context) => {
    const uniqueDimensions = new Set(ratings.map(({ dimensionCode }) => dimensionCode));
    if (uniqueDimensions.size !== ratings.length) {
      context.addIssue({
        code: 'custom',
        message: 'Each review dimension may be rated exactly once.',
        path: ['ratings'],
      });
    }
  });

export type SnapshotRoute = z.infer<typeof snapshotRouteSchema>;
export type FixtureProvenance = z.infer<typeof fixtureProvenanceSchema>;
export type SnapshotFixtureReference = z.infer<typeof snapshotFixtureReferenceSchema>;
export type NarrativeContext = z.infer<typeof narrativeContextSchema>;
export type SnapshotInput = z.infer<typeof snapshotInputSchema>;
export type SnapshotVersion = z.infer<typeof snapshotVersionSchema>;
export type SubmitSnapshotVersionRequest = z.infer<typeof submitSnapshotVersionRequestSchema>;
export type ReviewCase = z.infer<typeof reviewCaseSchema>;
export type SubmitSnapshotVersionResponse = z.infer<typeof submitSnapshotVersionResponseSchema>;
export type ReviewerClassification = z.infer<typeof reviewerClassificationSchema>;
export type ReviewRating = z.infer<typeof reviewRatingSchema>;
export type SubmitReviewRequest = z.infer<typeof submitReviewRequestSchema>;
