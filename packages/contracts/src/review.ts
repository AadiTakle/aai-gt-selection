import { z } from 'zod';

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
export type ReviewerClassification = z.infer<typeof reviewerClassificationSchema>;
export type ReviewRating = z.infer<typeof reviewRatingSchema>;
export type SubmitReviewRequest = z.infer<typeof submitReviewRequestSchema>;
