import { z } from 'zod';

import { apiSuccessSchema } from './api-envelope';
import { trackADecisionSummarySchema, trackBInvitationDecisionSummarySchema } from './decision';
import { statusProjectionSchema } from './workflow';

export const applicationStateSchema = z.enum(['draft', 'submitted', 'superseded']);

export const applicationDraftSchema = z
  .object({
    currentGrade: z.string().min(1),
    requestedGrade: z.string().min(1),
    requestedEntryYear: z.int().min(2026).max(2100),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const saveApplicationDraftRequestSchema = z
  .object({
    applicationId: z.uuid(),
    draft: applicationDraftSchema,
    expectedVersion: z.int().nonnegative(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const applicationVersionSchema = z
  .object({
    applicationId: z.uuid(),
    applicationVersionId: z.uuid(),
    version: z.int().positive(),
    supersedesId: z.uuid().nullable(),
    state: applicationStateSchema,
    syntheticOnly: z.literal(true),
    currentGrade: z.string().min(1),
    requestedGrade: z.string().min(1),
    requestedEntryYear: z.int().min(2026).max(2100),
    contentHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  })
  .strict();

export const submitApplicationRequestSchema = z
  .object({
    applicationVersionId: z.uuid(),
    expectedVersion: z.int().nonnegative(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const submitApplicationResponseDataSchema = z
  .object({
    application: applicationVersionSchema,
    status: statusProjectionSchema,
  })
  .strict();

export const submitApplicationResponseSchema = apiSuccessSchema(
  submitApplicationResponseDataSchema,
);

export const assessmentValiditySchema = z.enum(['pending', 'valid', 'invalid']);

export const assessmentInputSchema = z
  .object({
    instrumentCode: z.literal('COGAT_SYNTHETIC'),
    compositeScore: z.number().min(0).max(100).nullable(),
    verbalScore: z.number().min(0).max(100).nullable(),
    quantitativeScore: z.number().min(0).max(100).nullable(),
    nonverbalScore: z.number().min(0).max(100).nullable(),
    validity: assessmentValiditySchema,
    syntheticOnly: z.literal(true),
  })
  .strict();

export const assessmentVersionSchema = assessmentInputSchema.extend({
  assessmentVersionId: z.uuid(),
  applicationId: z.uuid(),
  version: z.int().positive(),
  supersedesId: z.uuid().nullable(),
});

export const recordAssessmentVersionRequestSchema = z
  .object({
    applicationId: z.uuid(),
    assessment: assessmentInputSchema,
    supersedesAssessmentVersionId: z.uuid().nullable(),
    expectedVersion: z.int().nonnegative(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const assessmentRoutingSchema = z
  .object({
    inputHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    trackA: trackADecisionSummarySchema,
    trackBInvitation: trackBInvitationDecisionSummarySchema,
  })
  .strict();

export const recordAssessmentVersionResponseDataSchema = z
  .object({
    assessment: assessmentVersionSchema,
    routing: assessmentRoutingSchema,
    status: statusProjectionSchema,
  })
  .strict();

export const recordAssessmentVersionResponseSchema = apiSuccessSchema(
  recordAssessmentVersionResponseDataSchema,
);

export type ApplicationState = z.infer<typeof applicationStateSchema>;
export type ApplicationDraft = z.infer<typeof applicationDraftSchema>;
export type SaveApplicationDraftRequest = z.infer<typeof saveApplicationDraftRequestSchema>;
export type ApplicationVersion = z.infer<typeof applicationVersionSchema>;
export type SubmitApplicationRequest = z.infer<typeof submitApplicationRequestSchema>;
export type SubmitApplicationResponse = z.infer<typeof submitApplicationResponseSchema>;
export type AssessmentValidity = z.infer<typeof assessmentValiditySchema>;
export type AssessmentInput = z.infer<typeof assessmentInputSchema>;
export type AssessmentVersion = z.infer<typeof assessmentVersionSchema>;
export type RecordAssessmentVersionRequest = z.infer<typeof recordAssessmentVersionRequestSchema>;
export type AssessmentRouting = z.infer<typeof assessmentRoutingSchema>;
export type RecordAssessmentVersionResponse = z.infer<typeof recordAssessmentVersionResponseSchema>;
