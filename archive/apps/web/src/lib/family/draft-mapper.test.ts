import {
  applicationDraftSchema,
  studentProfileContentSchema,
  submittedFinalSubmissionSchema,
} from '@gt-selection/contracts';
import { describe, expect, it } from 'vitest';

import {
  dollarsToMinor,
  toApplicationDraft,
  toFinalSubmission,
  toStudentProfileContent,
} from './draft-mapper';
import { createInitialWizardState } from './wizard-reducer';
import type { WizardState } from './wizard-types';

// A fully-filled wizard state, the way the UI would produce it after a parent
// completes every section using the synthetic pickers and prefixed inputs.
function completeState(): WizardState {
  const state = createInitialWizardState({
    profileId: '11111111-1111-4111-8111-111111111111',
    applicationId: '22222222-2222-4222-8222-222222222222',
    correlationId: '33333333-3333-4333-8333-333333333333',
  });
  state.student = {
    name: 'Rivera',
    dateOfBirth: '2016-05-04',
    genderCode: 'SYN_GENDER_FEMALE',
  };
  state.household = {
    guardianName: 'Jordan Rivera',
    guardianRelationshipCode: 'SYN_RELATIONSHIP_PARENT',
    address: {
      street1: 'Maple Way 12',
      street2: '',
      city: 'Cedarton',
      stateCode: 'SYN_REGION_NORTH',
      zip: '50613',
    },
    hasPriorGtRelative: true,
    priorGtRelativeNameFragments: ['Rivera Elder'],
    language: {
      homeLanguageCode: 'SYN_LANGUAGE_ENGLISH',
      firstLanguageCode: 'SYN_LANGUAGE_SPANISH',
      primaryLanguageCode: 'SYN_LANGUAGE_ENGLISH',
      hasAdditionalLanguages: false,
      additionalLanguageCodes: [],
    },
  };
  state.school = {
    selectionKind: 'other',
    schoolId: null,
    schoolVersionId: null,
    realSchoolId: null,
    name: 'Cedarton Elementary',
    typeCode: 'SYN_SCHOOL_PUBLIC',
    address: {
      street1: 'School Road 3',
      street2: '',
      city: 'Cedarton',
      stateCode: 'SYN_REGION_NORTH',
      zip: '50613',
    },
  };
  state.applicationCore = {
    currentGradeCode: 'SYN_GRADE_04',
    requestedEntryYear: 2027,
    requestedGradeCode: 'SYN_GRADE_05',
  };
  state.support = {
    supportNeeded: false,
    accommodationCodes: [],
    supportPlanCodes: [],
    otherSelected: false,
    details: '',
    seriousDisciplineSanction: false,
    nonHealthWithdrawal: false,
    disclosureExplanation: '',
  };
  state.financial = {
    annualHouseholdIncomeDollars: '85000',
    currencyCode: 'USD',
    householdMemberCount: 4,
  };
  state.signature = {
    accuracyAcknowledged: true,
    referralSourceCode: 'SYN_REFERRAL_FRIEND_FAMILY',
    signatureName: 'Rivera Parent',
  };
  return state;
}

describe('draft-mapper produces contract-valid payloads', () => {
  it('maps a complete state to a schema-valid student profile', () => {
    const profile = toStudentProfileContent(completeState());
    const parsed = studentProfileContentSchema.safeParse(profile);
    expect(parsed.success).toBe(true);
    // the visible "Synthetic" prefix is applied to names
    expect(profile.student.fullName.startsWith('Synthetic')).toBe(true);
    // real ZIP persists verbatim (governance carve-out); guardian name too
    expect(profile.household.primaryAddress.postalCode).toBe('50613');
    expect(profile.household.guardianName).toBe('Jordan Rivera');
  });

  it('maps a complete state to a schema-valid application draft', () => {
    const draft = toApplicationDraft(completeState(), { includeFinalSubmission: true });
    const parsed = applicationDraftSchema.safeParse(draft);
    if (!parsed.success) console.error(parsed.error.issues);
    expect(parsed.success).toBe(true);
    expect(draft.application?.requestedEntryYear).toBe(2027);
    expect(draft.school?.selectionKind).toBe('other');
  });

  it('produces a submittable final submission with all six steps complete', () => {
    const submission = toFinalSubmission(completeState(), '2026-07-22T12:00:00.000Z');
    expect(submission).not.toBeNull();
    const parsed = submittedFinalSubmissionSchema.safeParse(submission);
    if (!parsed.success) console.error(parsed.error.issues);
    expect(parsed.success).toBe(true);
    expect(submission?.completedStepCodes).toHaveLength(6);
  });

  it('omits sub-objects that are not yet coherent (partial autosave stays valid)', () => {
    const partial = createInitialWizardState({
      profileId: '11111111-1111-4111-8111-111111111111',
      applicationId: '22222222-2222-4222-8222-222222222222',
      correlationId: '33333333-3333-4333-8333-333333333333',
    });
    const draft = toApplicationDraft(partial);
    expect(applicationDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.application).toBeUndefined();
    expect(draft.financialIntake).toBeUndefined();
  });

  it('converts dollars to non-negative integer minor units', () => {
    expect(dollarsToMinor('85000')).toBe(8500000);
    expect(dollarsToMinor('1,234.50')).toBe(123450);
    expect(dollarsToMinor('-5')).toBe(0);
    expect(dollarsToMinor('')).toBe(0);
  });
});
