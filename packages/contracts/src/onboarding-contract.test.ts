import { describe, expect, it } from 'vitest';

import {
  FINAL_SIGNATURE_STATEMENT,
  applicationDraftSchema,
  financialIntakeSchema,
  getApplicationRequestSchema,
  homeLanguageSurveySchema,
  listStudentProfilesResponseDataSchema,
  saveApplicationDraftRequestSchema,
  saveStudentProfileRequestSchema,
  studentProfileContentSchema,
  submitApplicationResponseSchema,
  supportDisclosureSchema,
} from './index';

const uuid = '00000000-0000-4000-8000-000000000001';

const syntheticAddress = {
  line1: 'Synthetic 100 Example Way',
  line2: null,
  city: 'Synthetic City',
  regionCode: 'SYN_REGION_TX',
  postalCode: '00000',
  countryCode: 'US',
} as const;

const completeProfile = {
  student: {
    syntheticStudentCode: 'STUDENT-SYN-001',
    fullName: 'Synthetic Student One',
    dateOfBirth: '2016-04-12',
    genderCode: 'SYN_GENDER_UNSPECIFIED',
    genderVocabularyVersion: 'GENDER-SYN-V1',
  },
  household: {
    guardianRelationshipCode: 'SYN_RELATIONSHIP_PARENT',
    primaryAddress: syntheticAddress,
    hasPriorGtRelative: true,
    priorGtRelativeNames: ['Synthetic Relative One'],
    languageSurvey: {
      homeLanguageCode: 'SYN_LANGUAGE_ENGLISH',
      firstLanguageCode: 'SYN_LANGUAGE_ENGLISH',
      primaryLanguageCode: 'SYN_LANGUAGE_ENGLISH',
      hasAdditionalLanguages: true,
      additionalLanguageCodes: ['SYN_LANGUAGE_SPANISH'],
      vocabularyVersion: 'LANGUAGE-SYN-V1',
    },
  },
  purpose: {
    code: 'SYN_PROFILE_ACCOUNT_SETUP',
    version: 'PROFILE-PURPOSE-SYN-V1',
  },
  syntheticOnly: true,
} as const;

const supportDisclosure = {
  supportNeeded: true,
  vocabularyVersion: 'SUPPORT-SYN-V1',
  accommodationCodes: ['SYN_ACCOM_EXTENDED_TIME'],
  supportPlanCodes: ['SYN_PLAN_504'],
  otherSelected: false,
  details: 'Synthetic support details for local integration testing.',
  seriousDisciplineSanction: true,
  nonHealthWithdrawal: false,
  disclosureExplanation: 'Synthetic disciplinary explanation for fixture coverage.',
  purposeCode: 'SYN_SUPPORT_OPERATIONS_ONLY',
  syntheticOnly: true,
} as const;

const financialIntake = {
  annualHouseholdIncomeMinor: 12_500_000,
  currencyCode: 'USD',
  taxYear: 2025,
  incomeDefinitionCode: 'SYN_INCOME_GROSS_ANNUAL_V1',
  householdMemberCount: 4,
  householdMemberDefinitionCode: 'SYN_HOUSEHOLD_MEMBERS_V1',
  semanticsVersion: 'FINANCE-SYN-V1',
  purposeCode: 'SYN_FINANCIAL_AID_INTAKE_ONLY',
  syntheticOnly: true,
} as const;

const fullDraft = {
  application: {
    currentGradeCode: 'SYN_GRADE_05',
    requestedEntryYear: 2027,
    requestedGradeCode: 'SYN_GRADE_06',
  },
  school: {
    selectionKind: 'directory',
    schoolId: '00000000-0000-4000-8000-000000000501',
    schoolVersionId: '00000000-0000-4000-8000-000000000511',
    snapshot: {
      name: 'Synthetic Learning Academy',
      typeCode: 'SYN_SCHOOL_INDEPENDENT',
      address: syntheticAddress,
      syntheticOnly: true,
    },
  },
  supportDisclosure,
  financialIntake,
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
  syntheticOnly: true,
} as const;

const submittedResponse = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    application: {
      ...fullDraft,
      applicationId: '00000000-0000-4000-8000-000000000101',
      applicationVersionId: '00000000-0000-4000-8000-000000000102',
      studentProfileVersionId: '00000000-0000-4000-8000-000000000103',
      privateContextVersionId: '00000000-0000-4000-8000-000000000104',
      version: 2,
      supersedesId: '00000000-0000-4000-8000-000000000105',
      state: 'submitted',
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
    correlationId: '00000000-0000-4000-8000-000000000106',
    idempotencyKey: '00000000-0000-4000-8000-000000000107',
    idempotentReplay: false,
  },
} as const;

describe('Milestone A onboarding contracts', () => {
  it('uses the exact approved D-013 final signature statement', () => {
    expect(FINAL_SIGNATURE_STATEMENT).toBe(
      'I/We hereby state that the information contained herein is true and complete. I/We acknowledge that supplemental information may be required by the school and understand that our application will not be reviewed until supplement(s), if required, have been submitted.',
    );
  });

  it('accepts a complete reusable profile and enforces its conditional household fields', () => {
    expect(studentProfileContentSchema.parse(completeProfile)).toEqual(completeProfile);

    expect(
      studentProfileContentSchema.safeParse({
        ...completeProfile,
        household: {
          ...completeProfile.household,
          priorGtRelativeNames: [],
        },
      }).success,
    ).toBe(false);
    expect(
      studentProfileContentSchema.safeParse({
        ...completeProfile,
        household: {
          ...completeProfile.household,
          languageSurvey: {
            ...completeProfile.household.languageSurvey,
            additionalLanguageCodes: [],
          },
        },
      }).success,
    ).toBe(false);
  });

  it('requires empty conditional arrays when household flags are no', () => {
    expect(
      homeLanguageSurveySchema.safeParse({
        ...completeProfile.household.languageSurvey,
        hasAdditionalLanguages: false,
        additionalLanguageCodes: ['SYN_LANGUAGE_SPANISH'],
      }).success,
    ).toBe(false);
    expect(
      studentProfileContentSchema.safeParse({
        ...completeProfile,
        household: {
          ...completeProfile.household,
          hasPriorGtRelative: false,
          priorGtRelativeNames: ['Synthetic Relative One'],
        },
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate prior-GT relative names', () => {
    expect(
      studentProfileContentSchema.safeParse({
        ...completeProfile,
        household: {
          ...completeProfile.household,
          priorGtRelativeNames: ['Synthetic Relative One', 'Synthetic Relative One'],
        },
      }).success,
    ).toBe(false);
  });

  it('rejects non-synthetic identity and address vocabulary', () => {
    expect(
      studentProfileContentSchema.safeParse({
        ...completeProfile,
        student: {
          ...completeProfile.student,
          fullName: 'Real Student',
        },
      }).success,
    ).toBe(false);
    // real ZIP now persists verbatim (governance carve-out); a malformed ZIP
    // still fails
    expect(
      studentProfileContentSchema.safeParse({
        ...completeProfile,
        household: {
          ...completeProfile.household,
          primaryAddress: {
            ...syntheticAddress,
            postalCode: '78701',
          },
        },
      }).success,
    ).toBe(true);
    expect(
      studentProfileContentSchema.safeParse({
        ...completeProfile,
        household: {
          ...completeProfile.household,
          primaryAddress: {
            ...syntheticAddress,
            postalCode: 'ABCDE',
          },
        },
      }).success,
    ).toBe(false);
  });

  it('accepts an optional verbatim guardian name but rejects an empty one', () => {
    // guardianName is a real name stored verbatim (no "Synthetic" prefix)
    expect(
      studentProfileContentSchema.safeParse({
        ...completeProfile,
        household: { ...completeProfile.household, guardianName: 'Jordan Rivera' },
      }).success,
    ).toBe(true);
    // optional: absent is fine (back-compat)
    expect(studentProfileContentSchema.safeParse(completeProfile).success).toBe(true);
    // present-but-empty is rejected (min length 1)
    expect(
      studentProfileContentSchema.safeParse({
        ...completeProfile,
        household: { ...completeProfile.household, guardianName: '' },
      }).success,
    ).toBe(false);
  });

  it('enforces all support and disclosure branches', () => {
    expect(supportDisclosureSchema.parse(supportDisclosure)).toEqual(supportDisclosure);
    expect(
      supportDisclosureSchema.safeParse({
        ...supportDisclosure,
        details: null,
      }).success,
    ).toBe(false);
    expect(
      supportDisclosureSchema.safeParse({
        ...supportDisclosure,
        disclosureExplanation: null,
      }).success,
    ).toBe(false);
    expect(
      supportDisclosureSchema.safeParse({
        ...supportDisclosure,
        supportNeeded: false,
        accommodationCodes: [],
        supportPlanCodes: [],
        details: null,
        seriousDisciplineSanction: false,
        disclosureExplanation: null,
      }).success,
    ).toBe(true);
  });

  it.each([
    {
      field: 'accommodationCodes',
      value: ['SYN_ACCOM_EXTENDED_TIME', 'SYN_ACCOM_EXTENDED_TIME'],
    },
    {
      field: 'supportPlanCodes',
      value: ['SYN_PLAN_504', 'SYN_PLAN_504'],
    },
  ] as const)('rejects duplicate $field', ({ field, value }) => {
    expect(
      supportDisclosureSchema.safeParse({
        ...supportDisclosure,
        [field]: value,
      }).success,
    ).toBe(false);
  });

  it('accepts configurable synthetic finance semantics and rejects proof fields', () => {
    expect(financialIntakeSchema.parse(financialIntake)).toEqual(financialIntake);
    expect(
      financialIntakeSchema.safeParse({
        ...financialIntake,
        w2DocumentId: uuid,
      }).success,
    ).toBe(false);
  });

  it('accepts full and partial application drafts but rejects excluded fields', () => {
    expect(applicationDraftSchema.parse(fullDraft)).toEqual(fullDraft);
    expect(
      applicationDraftSchema.parse({
        application: fullDraft.application,
        syntheticOnly: true,
      }),
    ).toEqual({
      application: fullDraft.application,
      syntheticOnly: true,
    });

    for (const prohibitedField of ['essayOne', 'enrollmentDate', 'priorSchools', 'w2Upload']) {
      expect(
        applicationDraftSchema.safeParse({
          ...fullDraft,
          [prohibitedField]: 'not allowed',
        }).success,
      ).toBe(false);
    }
  });

  it('does not impose a speculative profile-list cardinality cap', () => {
    const profiles = Array.from({ length: 21 }, (_, index) => ({
      profileId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      profileVersionId: `00000000-0000-4000-8001-${String(index + 1).padStart(12, '0')}`,
      version: 1,
      syntheticStudentCode: `STUDENT-SYN-${String(index + 1).padStart(3, '0')}`,
      fullName: `Synthetic Student ${index + 1}`,
      syntheticOnly: true,
    }));

    expect(listStudentProfilesResponseDataSchema.parse({ profiles }).profiles).toHaveLength(21);
  });

  it('requires a coherent, complete submitted response', () => {
    expect(submitApplicationResponseSchema.parse(submittedResponse)).toEqual(submittedResponse);

    const impossibleApplications = [
      {
        ...submittedResponse.data.application,
        application: undefined,
      },
      {
        ...submittedResponse.data.application,
        school: undefined,
      },
      {
        ...submittedResponse.data.application,
        supportDisclosure: undefined,
      },
      {
        ...submittedResponse.data.application,
        financialIntake: undefined,
      },
      {
        ...submittedResponse.data.application,
        finalSubmission: undefined,
      },
      {
        ...submittedResponse.data.application,
        state: 'draft',
      },
      {
        ...submittedResponse.data.application,
        version: 1,
      },
      {
        ...submittedResponse.data.application,
        supersedesId: null,
      },
      {
        ...submittedResponse.data.application,
        supersedesId: submittedResponse.data.application.applicationVersionId,
      },
      {
        ...submittedResponse.data.application,
        finalSubmission: {
          ...submittedResponse.data.application.finalSubmission,
          completedStepCodes: ['STUDENT_PROFILE'],
        },
      },
    ];

    for (const application of impossibleApplications) {
      expect(
        submitApplicationResponseSchema.safeParse({
          ...submittedResponse,
          data: {
            ...submittedResponse.data,
            application,
          },
        }).success,
      ).toBe(false);
    }

    expect(
      submitApplicationResponseSchema.safeParse({
        ...submittedResponse,
        data: {
          ...submittedResponse.data,
          status: {
            ...submittedResponse.data.status,
            workflowStatus: 'application_draft',
            phase: 'application',
            familyActionRequired: true,
            nextActionCode: 'COMPLETE_APPLICATION',
          },
        },
      }).success,
    ).toBe(false);
  });

  it('requires the signed statement verbatim', () => {
    expect(
      applicationDraftSchema.safeParse({
        ...fullDraft,
        finalSubmission: {
          ...fullDraft.finalSubmission,
          signatureStatement: `${FINAL_SIGNATURE_STATEMENT} Changed`,
        },
      }).success,
    ).toBe(false);
  });

  it('keeps actor and role outside strict family request payloads', () => {
    const profileRequest = {
      profileId: uuid,
      profile: completeProfile,
      expectedVersion: 0,
      idempotencyKey: uuid,
      correlationId: uuid,
    };
    const applicationRequest = {
      applicationId: uuid,
      studentProfileVersionId: uuid,
      draft: fullDraft,
      expectedVersion: 0,
      idempotencyKey: uuid,
      correlationId: uuid,
    };

    expect(saveStudentProfileRequestSchema.parse(profileRequest)).toEqual(profileRequest);
    expect(saveApplicationDraftRequestSchema.parse(applicationRequest)).toEqual(applicationRequest);
    expect(
      getApplicationRequestSchema.parse({ applicationId: uuid, correlationId: uuid }),
    ).toBeDefined();
    expect(
      saveApplicationDraftRequestSchema.safeParse({
        ...applicationRequest,
        actorId: uuid,
        role: 'family',
      }).success,
    ).toBe(false);
  });
});
