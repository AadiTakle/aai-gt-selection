import { z } from 'zod';

import { apiSuccessSchema } from './api-envelope';
import { statusProjectionSchema } from './workflow';

export const FINAL_SIGNATURE_STATEMENT =
  'I/We hereby state that the information contained herein is true and complete. I/We acknowledge that supplemental information may be required by the school and understand that our application will not be reviewed until supplement(s), if required, have been submitted.';

export const applicationStateSchema = z.enum(['draft', 'submitted', 'superseded']);

const syntheticNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^Synthetic(?:\s|$)/);
const syntheticCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^SYN_[A-Z0-9_]+$/);
const syntheticStudentCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^STUDENT-SYN-[A-Z0-9_-]+$/);
const boundedDetailsSchema = z.string().trim().min(1).max(1_000);
const contentHashSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const syntheticAddressSchema = z
  .object({
    line1: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^Synthetic(?:\s|$)/),
    line2: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^Synthetic(?:\s|$)/)
      .nullable(),
    city: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^Synthetic(?:\s|$)/),
    regionCode: syntheticCodeSchema.refine((value) => value.startsWith('SYN_REGION_')),
    postalCode: z.literal('00000'),
    countryCode: z.literal('US'),
  })
  .strict();

export const studentIdentitySchema = z
  .object({
    syntheticStudentCode: syntheticStudentCodeSchema,
    fullName: syntheticNameSchema,
    dateOfBirth: z.iso.date(),
    genderCode: syntheticCodeSchema.refine((value) => value.startsWith('SYN_GENDER_')),
    genderVocabularyVersion: z.literal('GENDER-SYN-V1'),
  })
  .strict();

export const homeLanguageSurveySchema = z
  .object({
    homeLanguageCode: syntheticCodeSchema.refine((value) => value.startsWith('SYN_LANGUAGE_')),
    firstLanguageCode: syntheticCodeSchema.refine((value) => value.startsWith('SYN_LANGUAGE_')),
    primaryLanguageCode: syntheticCodeSchema.refine((value) => value.startsWith('SYN_LANGUAGE_')),
    hasAdditionalLanguages: z.boolean(),
    additionalLanguageCodes: z
      .array(syntheticCodeSchema.refine((value) => value.startsWith('SYN_LANGUAGE_')))
      .max(10),
    vocabularyVersion: z.literal('LANGUAGE-SYN-V1'),
  })
  .strict()
  .superRefine((survey, context) => {
    const uniqueCodes = new Set(survey.additionalLanguageCodes);
    if (uniqueCodes.size !== survey.additionalLanguageCodes.length) {
      context.addIssue({
        code: 'custom',
        message: 'Additional language codes must be unique.',
        path: ['additionalLanguageCodes'],
      });
    }
    if (survey.hasAdditionalLanguages && survey.additionalLanguageCodes.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Select at least one additional language.',
        path: ['additionalLanguageCodes'],
      });
    }
    if (!survey.hasAdditionalLanguages && survey.additionalLanguageCodes.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Additional languages must be empty when the flag is no.',
        path: ['additionalLanguageCodes'],
      });
    }
  });

export const householdProfileSchema = z
  .object({
    guardianRelationshipCode: syntheticCodeSchema.refine((value) =>
      value.startsWith('SYN_RELATIONSHIP_'),
    ),
    primaryAddress: syntheticAddressSchema,
    hasPriorGtRelative: z.boolean(),
    priorGtRelativeNames: z.array(syntheticNameSchema).max(10),
    languageSurvey: homeLanguageSurveySchema,
  })
  .strict()
  .superRefine((household, context) => {
    if (new Set(household.priorGtRelativeNames).size !== household.priorGtRelativeNames.length) {
      context.addIssue({
        code: 'custom',
        message: 'Prior-GT relative names must be unique.',
        path: ['priorGtRelativeNames'],
      });
    }
    if (household.hasPriorGtRelative && household.priorGtRelativeNames.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'At least one synthetic relative name is required.',
        path: ['priorGtRelativeNames'],
      });
    }
    if (!household.hasPriorGtRelative && household.priorGtRelativeNames.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Relative names must be empty when the flag is no.',
        path: ['priorGtRelativeNames'],
      });
    }
  });

export const studentProfileContentSchema = z
  .object({
    student: studentIdentitySchema,
    household: householdProfileSchema,
    purpose: z
      .object({
        code: z.literal('SYN_PROFILE_ACCOUNT_SETUP'),
        version: z.literal('PROFILE-PURPOSE-SYN-V1'),
      })
      .strict(),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const studentProfileVersionSchema = studentProfileContentSchema
  .extend({
    profileId: z.uuid(),
    profileVersionId: z.uuid(),
    version: z.int().positive(),
    supersedesId: z.uuid().nullable(),
    contentHash: contentHashSchema,
  })
  .strict();

export const studentProfileSummarySchema = z
  .object({
    profileId: z.uuid(),
    profileVersionId: z.uuid(),
    version: z.int().positive(),
    syntheticStudentCode: syntheticStudentCodeSchema,
    fullName: syntheticNameSchema,
    syntheticOnly: z.literal(true),
  })
  .strict();

export const saveStudentProfileRequestSchema = z
  .object({
    profileId: z.uuid(),
    profile: studentProfileContentSchema,
    expectedVersion: z.int().nonnegative(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const saveStudentProfileResponseDataSchema = z
  .object({
    profile: studentProfileVersionSchema,
  })
  .strict();

export const saveStudentProfileResponseSchema = apiSuccessSchema(
  saveStudentProfileResponseDataSchema,
);

export const getStudentProfileRequestSchema = z
  .object({
    profileId: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const getStudentProfileResponseDataSchema = z
  .object({
    profile: studentProfileVersionSchema,
  })
  .strict();

export const getStudentProfileResponseSchema = apiSuccessSchema(
  getStudentProfileResponseDataSchema,
);

export const listStudentProfilesRequestSchema = z
  .object({
    correlationId: z.uuid(),
  })
  .strict();

export const listStudentProfilesResponseDataSchema = z
  .object({
    profiles: z.array(studentProfileSummarySchema),
  })
  .strict();

export const listStudentProfilesResponseSchema = apiSuccessSchema(
  listStudentProfilesResponseDataSchema,
);

export const schoolSnapshotSchema = z
  .object({
    name: syntheticNameSchema,
    typeCode: syntheticCodeSchema.refine((value) => value.startsWith('SYN_SCHOOL_')),
    address: syntheticAddressSchema,
    syntheticOnly: z.literal(true),
  })
  .strict();

export const schoolDirectoryEntrySchema = schoolSnapshotSchema
  .extend({
    schoolId: z.uuid(),
    schoolVersionId: z.uuid(),
    version: z.int().positive(),
    directoryVersion: z.literal('SCHOOL-DIRECTORY-SYN-V1'),
  })
  .strict();

const directorySchoolSelectionSchema = z
  .object({
    selectionKind: z.literal('directory'),
    schoolId: z.uuid(),
    schoolVersionId: z.uuid(),
    snapshot: schoolSnapshotSchema,
  })
  .strict();

const otherSchoolSelectionSchema = z
  .object({
    selectionKind: z.literal('other'),
    snapshot: schoolSnapshotSchema,
  })
  .strict();

export const schoolSelectionSchema = z.discriminatedUnion('selectionKind', [
  directorySchoolSelectionSchema,
  otherSchoolSelectionSchema,
]);

export const listActiveSchoolsRequestSchema = z
  .object({
    correlationId: z.uuid(),
  })
  .strict();

export const listActiveSchoolsResponseDataSchema = z
  .object({
    schools: z.array(schoolDirectoryEntrySchema).max(500),
  })
  .strict();

export const listActiveSchoolsResponseSchema = apiSuccessSchema(
  listActiveSchoolsResponseDataSchema,
);

export const applicationCoreSchema = z
  .object({
    currentGradeCode: syntheticCodeSchema.refine((value) => value.startsWith('SYN_GRADE_')),
    requestedEntryYear: z.int().min(2026).max(2100),
    requestedGradeCode: syntheticCodeSchema.refine((value) => value.startsWith('SYN_GRADE_')),
  })
  .strict();

export const supportDisclosureSchema = z
  .object({
    supportNeeded: z.boolean(),
    vocabularyVersion: z.literal('SUPPORT-SYN-V1'),
    accommodationCodes: z
      .array(syntheticCodeSchema.refine((value) => value.startsWith('SYN_ACCOM_')))
      .max(20),
    supportPlanCodes: z
      .array(syntheticCodeSchema.refine((value) => value.startsWith('SYN_PLAN_')))
      .max(20),
    otherSelected: z.boolean(),
    details: boundedDetailsSchema.nullable(),
    seriousDisciplineSanction: z.boolean(),
    nonHealthWithdrawal: z.boolean(),
    disclosureExplanation: boundedDetailsSchema.nullable(),
    purposeCode: z.literal('SYN_SUPPORT_OPERATIONS_ONLY'),
    syntheticOnly: z.literal(true),
  })
  .strict()
  .superRefine((support, context) => {
    if (new Set(support.accommodationCodes).size !== support.accommodationCodes.length) {
      context.addIssue({
        code: 'custom',
        message: 'Accommodation codes must be unique.',
        path: ['accommodationCodes'],
      });
    }
    if (new Set(support.supportPlanCodes).size !== support.supportPlanCodes.length) {
      context.addIssue({
        code: 'custom',
        message: 'Support-plan codes must be unique.',
        path: ['supportPlanCodes'],
      });
    }
    const selections = support.accommodationCodes.length + support.supportPlanCodes.length;
    if (support.supportNeeded && selections === 0 && !support.otherSelected) {
      context.addIssue({
        code: 'custom',
        message: 'Select a support code or the synthetic other option.',
        path: ['accommodationCodes'],
      });
    }
    if ((support.supportNeeded || support.otherSelected) && support.details === null) {
      context.addIssue({
        code: 'custom',
        message: 'Bounded support details are required.',
        path: ['details'],
      });
    }
    if (
      !support.supportNeeded &&
      (selections > 0 || support.otherSelected || support.details !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Support fields must be empty when support is not needed.',
        path: ['supportNeeded'],
      });
    }
    const explanationRequired = support.seriousDisciplineSanction || support.nonHealthWithdrawal;
    if (explanationRequired && support.disclosureExplanation === null) {
      context.addIssue({
        code: 'custom',
        message: 'A bounded disclosure explanation is required.',
        path: ['disclosureExplanation'],
      });
    }
    if (!explanationRequired && support.disclosureExplanation !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Disclosure explanation must be empty when both flags are no.',
        path: ['disclosureExplanation'],
      });
    }
  });

export const financialIntakeSchema = z
  .object({
    annualHouseholdIncomeMinor: z.int().nonnegative().max(1_000_000_000_00),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    taxYear: z.int().min(2000).max(2100),
    incomeDefinitionCode: z.literal('SYN_INCOME_GROSS_ANNUAL_V1'),
    householdMemberCount: z.int().min(1).max(30),
    householdMemberDefinitionCode: z.literal('SYN_HOUSEHOLD_MEMBERS_V1'),
    semanticsVersion: z.literal('FINANCE-SYN-V1'),
    purposeCode: z.literal('SYN_FINANCIAL_AID_INTAKE_ONLY'),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const REQUIRED_ONBOARDING_STEP_CODES = [
  'STUDENT_PROFILE',
  'EDUCATIONAL_BACKGROUND',
  'SUPPORT_DISCLOSURE',
  'HOUSEHOLD_LANGUAGE',
  'FINANCIAL_INTAKE',
  'REVIEW_SIGNATURE',
] as const;

export const onboardingStepCodeSchema = z.enum(REQUIRED_ONBOARDING_STEP_CODES);

export const applicationFinalSubmissionSchema = z
  .object({
    completedStepCodes: z.array(onboardingStepCodeSchema).min(1).max(6),
    acknowledgementVersion: z.literal('ACKNOWLEDGEMENT-SYN-V1'),
    acknowledgementStatement: z.literal(FINAL_SIGNATURE_STATEMENT),
    accuracyAcknowledged: z.literal(true),
    acknowledgedAt: z.iso.datetime({ offset: true }),
    referralSourceCode: syntheticCodeSchema.refine((value) => value.startsWith('SYN_REFERRAL_')),
    signatureStatementVersion: z.literal('SIGNATURE-SYN-V1'),
    signatureStatement: z.literal(FINAL_SIGNATURE_STATEMENT),
    signatureName: syntheticNameSchema,
    signedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((submission, context) => {
    if (new Set(submission.completedStepCodes).size !== submission.completedStepCodes.length) {
      context.addIssue({
        code: 'custom',
        message: 'Completed step codes must be unique.',
        path: ['completedStepCodes'],
      });
    }
  });

export const applicationDraftSchema = z
  .object({
    application: applicationCoreSchema.optional(),
    school: schoolSelectionSchema.optional(),
    supportDisclosure: supportDisclosureSchema.optional(),
    financialIntake: financialIntakeSchema.optional(),
    finalSubmission: applicationFinalSubmissionSchema.optional(),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const saveApplicationDraftRequestSchema = z
  .object({
    applicationId: z.uuid(),
    studentProfileVersionId: z.uuid(),
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
    studentProfileVersionId: z.uuid(),
    privateContextVersionId: z.uuid(),
    version: z.int().positive(),
    supersedesId: z.uuid().nullable(),
    state: applicationStateSchema,
    contentHash: contentHashSchema,
    privateContextContentHash: contentHashSchema,
  })
  .strict();

export const submittedFinalSubmissionSchema = applicationFinalSubmissionSchema.superRefine(
  (submission, context) => {
    if (
      submission.completedStepCodes.length !== REQUIRED_ONBOARDING_STEP_CODES.length ||
      REQUIRED_ONBOARDING_STEP_CODES.some(
        (stepCode) => !submission.completedStepCodes.includes(stepCode),
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Every required onboarding step must be completed before submission.',
        path: ['completedStepCodes'],
      });
    }
  },
);

export const submittedApplicationVersionSchema = z
  .object({
    application: applicationCoreSchema,
    school: schoolSelectionSchema,
    supportDisclosure: supportDisclosureSchema,
    financialIntake: financialIntakeSchema,
    finalSubmission: submittedFinalSubmissionSchema,
    syntheticOnly: z.literal(true),
    applicationId: z.uuid(),
    applicationVersionId: z.uuid(),
    studentProfileVersionId: z.uuid(),
    privateContextVersionId: z.uuid(),
    version: z.int().min(2),
    supersedesId: z.uuid(),
    state: z.literal('submitted'),
    contentHash: contentHashSchema,
    privateContextContentHash: contentHashSchema,
  })
  .strict()
  .superRefine((application, context) => {
    if (application.applicationVersionId === application.supersedesId) {
      context.addIssue({
        code: 'custom',
        message: 'A submitted version cannot supersede itself.',
        path: ['supersedesId'],
      });
    }
  });

export const submittedApplicationStatusSchema = z
  .object({
    workflowStatus: z.literal('awaiting_assessment'),
    displayLabelCode: z.literal('STATUS_AWAITING_ASSESSMENT'),
    phase: z.literal('assessment'),
    familyActionRequired: z.literal(false),
    nextActionCode: z.literal('AWAIT_ASSESSMENT'),
    deadline: z.null(),
    pendingReason: z.null(),
    claimBoundaryCode: z.literal('ELIGIBILITY_NOT_ADMISSION'),
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

export const getApplicationRequestSchema = z
  .object({
    applicationId: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const getApplicationResponseDataSchema = z
  .object({
    profile: studentProfileVersionSchema,
    application: applicationVersionSchema,
  })
  .strict();

export const getApplicationResponseSchema = apiSuccessSchema(getApplicationResponseDataSchema);

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
    expectedVersion: z.int().positive(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const submitApplicationResponseDataSchema = z
  .object({
    application: submittedApplicationVersionSchema,
    status: submittedApplicationStatusSchema,
  })
  .strict();

export const submitApplicationResponseSchema = apiSuccessSchema(
  submitApplicationResponseDataSchema,
);

export type ApplicationState = z.infer<typeof applicationStateSchema>;
export type SyntheticAddress = z.infer<typeof syntheticAddressSchema>;
export type StudentIdentity = z.infer<typeof studentIdentitySchema>;
export type HomeLanguageSurvey = z.infer<typeof homeLanguageSurveySchema>;
export type HouseholdProfile = z.infer<typeof householdProfileSchema>;
export type StudentProfileContent = z.infer<typeof studentProfileContentSchema>;
export type StudentProfileVersion = z.infer<typeof studentProfileVersionSchema>;
export type StudentProfileSummary = z.infer<typeof studentProfileSummarySchema>;
export type SaveStudentProfileRequest = z.infer<typeof saveStudentProfileRequestSchema>;
export type SaveStudentProfileResponse = z.infer<typeof saveStudentProfileResponseSchema>;
export type GetStudentProfileRequest = z.infer<typeof getStudentProfileRequestSchema>;
export type GetStudentProfileResponse = z.infer<typeof getStudentProfileResponseSchema>;
export type ListStudentProfilesRequest = z.infer<typeof listStudentProfilesRequestSchema>;
export type ListStudentProfilesResponse = z.infer<typeof listStudentProfilesResponseSchema>;
export type SchoolSnapshot = z.infer<typeof schoolSnapshotSchema>;
export type SchoolDirectoryEntry = z.infer<typeof schoolDirectoryEntrySchema>;
export type SchoolSelection = z.infer<typeof schoolSelectionSchema>;
export type ListActiveSchoolsRequest = z.infer<typeof listActiveSchoolsRequestSchema>;
export type ListActiveSchoolsResponse = z.infer<typeof listActiveSchoolsResponseSchema>;
export type ApplicationCore = z.infer<typeof applicationCoreSchema>;
export type SupportDisclosure = z.infer<typeof supportDisclosureSchema>;
export type FinancialIntake = z.infer<typeof financialIntakeSchema>;
export type OnboardingStepCode = z.infer<typeof onboardingStepCodeSchema>;
export type ApplicationFinalSubmission = z.infer<typeof applicationFinalSubmissionSchema>;
export type ApplicationDraft = z.infer<typeof applicationDraftSchema>;
export type SaveApplicationDraftRequest = z.infer<typeof saveApplicationDraftRequestSchema>;
export type ApplicationVersion = z.infer<typeof applicationVersionSchema>;
export type SubmittedApplicationVersion = z.infer<typeof submittedApplicationVersionSchema>;
export type SubmittedApplicationStatus = z.infer<typeof submittedApplicationStatusSchema>;
export type SaveApplicationDraftResponse = z.infer<typeof saveApplicationDraftResponseSchema>;
export type GetApplicationRequest = z.infer<typeof getApplicationRequestSchema>;
export type GetApplicationResponse = z.infer<typeof getApplicationResponseSchema>;
export type GetApplicationStatusRequest = z.infer<typeof getApplicationStatusRequestSchema>;
export type GetApplicationStatusResponse = z.infer<typeof getApplicationStatusResponseSchema>;
export type SubmitApplicationRequest = z.infer<typeof submitApplicationRequestSchema>;
export type SubmitApplicationResponse = z.infer<typeof submitApplicationResponseSchema>;
