import { z } from 'zod';

import { apiSuccessSchema } from './api-envelope';
import { trackADecisionSummarySchema, trackBInvitationDecisionSummarySchema } from './decision';
import { statusProjectionSchema } from './workflow';

export const applicationStateSchema = z.enum(['draft', 'submitted', 'superseded']);

const shortTextSchema = z.string().trim().min(1).max(200);
const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Z0-9_-]+$/);
const phoneSchema = z.string().trim().min(7).max(32);

export const priorSchoolSchema = z
  .object({
    schoolName: shortTextSchema.optional(),
    schoolType: shortTextSchema,
    enrollmentStartDate: z.iso.date().optional(),
    enrollmentEndDate: z.iso.date().nullable().optional(),
  })
  .strict();

export const applicationStudentSchema = z
  .object({
    syntheticStudentIdentifier: codeSchema,
    // Age is intentionally used instead of date of birth to minimize child data.
    ageYears: z.int().positive(),
    currentGrade: shortTextSchema,
    requestedGrade: shortTextSchema,
    requestedEntryYear: z.int().min(2026).max(2100),
  })
  .partial()
  .strict();

export const applicationEducationSchema = z
  .object({
    currentSchoolName: shortTextSchema.optional(),
    currentSchoolType: shortTextSchema,
    enrollmentStartDate: z.iso.date().optional(),
    enrollmentEndDate: z.iso.date().nullable().optional(),
    priorSchools: z.array(priorSchoolSchema).max(10),
  })
  .partial()
  .strict();

export const applicationGuardianSchema = z
  .object({
    fullName: shortTextSchema,
    relationshipToChild: shortTextSchema,
    hasRelativeInGtProgram: z.boolean(),
    email: z.string().trim().email().max(254).nullable(),
    phone: phoneSchema.nullable(),
  })
  .partial()
  .strict();

export const applicationFinalSubmissionSchema = z
  .object({
    completedStepCodes: z.array(codeSchema).max(20),
    accuracyAcknowledged: z.boolean(),
    signatureName: shortTextSchema,
    signedAt: z.iso.datetime({ offset: true }),
  })
  .partial()
  .strict();

export const applicationDraftSchema = z
  .object({
    student: applicationStudentSchema.optional(),
    education: applicationEducationSchema.optional(),
    guardian: applicationGuardianSchema.optional(),
    finalSubmission: applicationFinalSubmissionSchema.optional(),
    // Operations-only context. It is never projected to reviewers or decisions.
    referralSourceCode: codeSchema.nullable().optional(),
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

export const applicationVersionSchema = applicationDraftSchema
  .extend({
    applicationId: z.uuid(),
    applicationVersionId: z.uuid(),
    version: z.int().positive(),
    supersedesId: z.uuid().nullable(),
    state: applicationStateSchema,
    contentHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  })
  .strict();

export const saveApplicationDraftResponseDataSchema = z
  .object({
    application: applicationVersionSchema,
  })
  .strict();

export const saveApplicationDraftResponseSchema = apiSuccessSchema(
  saveApplicationDraftResponseDataSchema,
);

export const getApplicationStatusRequestSchema = z
  .object({
    applicationId: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const getApplicationStatusResponseSchema = apiSuccessSchema(statusProjectionSchema);

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
export type PriorSchool = z.infer<typeof priorSchoolSchema>;
export type ApplicationStudent = z.infer<typeof applicationStudentSchema>;
export type ApplicationEducation = z.infer<typeof applicationEducationSchema>;
export type ApplicationGuardian = z.infer<typeof applicationGuardianSchema>;
export type ApplicationFinalSubmission = z.infer<typeof applicationFinalSubmissionSchema>;
export type ApplicationDraft = z.infer<typeof applicationDraftSchema>;
export type SaveApplicationDraftRequest = z.infer<typeof saveApplicationDraftRequestSchema>;
export type ApplicationVersion = z.infer<typeof applicationVersionSchema>;
export type SaveApplicationDraftResponse = z.infer<typeof saveApplicationDraftResponseSchema>;
export type GetApplicationStatusRequest = z.infer<typeof getApplicationStatusRequestSchema>;
export type GetApplicationStatusResponse = z.infer<typeof getApplicationStatusResponseSchema>;
export type SubmitApplicationRequest = z.infer<typeof submitApplicationRequestSchema>;
export type SubmitApplicationResponse = z.infer<typeof submitApplicationResponseSchema>;
export type AssessmentValidity = z.infer<typeof assessmentValiditySchema>;
export type AssessmentInput = z.infer<typeof assessmentInputSchema>;
export type AssessmentVersion = z.infer<typeof assessmentVersionSchema>;
export type RecordAssessmentVersionRequest = z.infer<typeof recordAssessmentVersionRequestSchema>;
export type AssessmentRouting = z.infer<typeof assessmentRoutingSchema>;
export type RecordAssessmentVersionResponse = z.infer<typeof recordAssessmentVersionResponseSchema>;
