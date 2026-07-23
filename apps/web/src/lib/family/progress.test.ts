import { describe, expect, it } from 'vitest';

import { overallProgress, sectionRatios } from './progress';
import { createInitialWizardState } from './wizard-reducer';
import type { WizardState } from './wizard-types';

function baseState(): WizardState {
  return createInitialWizardState({
    profileId: '11111111-1111-4111-8111-111111111111',
    applicationId: '22222222-2222-4222-8222-222222222222',
    correlationId: '33333333-3333-4333-8333-333333333333',
  });
}

describe('progress', () => {
  it('shows a motivating non-zero start and stays well short of complete on an empty form', () => {
    const progress = overallProgress(baseState());
    expect(progress).toBeGreaterThan(0.05);
    expect(progress).toBeLessThan(0.2);
  });

  it('never auto-completes support & disclosures before the questions are answered', () => {
    const state = baseState();
    // all three yes/no default to null (unanswered)
    expect(sectionRatios(state).SUPPORT_DISCLOSURE).toBeLessThan(1);
  });

  it('completes support only once all three yes/no answers are given', () => {
    const state = baseState();
    state.support.supportNeeded = false;
    state.support.seriousDisciplineSanction = false;
    state.support.nonHealthWithdrawal = false;
    expect(sectionRatios(state).SUPPORT_DISCLOSURE).toBe(1);
  });

  it('requires the disclosure explanation once a disclosure flag is yes', () => {
    const state = baseState();
    state.support.supportNeeded = false;
    state.support.nonHealthWithdrawal = false;
    state.support.seriousDisciplineSanction = true;
    expect(sectionRatios(state).SUPPORT_DISCLOSURE).toBeLessThan(1);
    state.support.disclosureExplanation = 'A brief synthetic explanation.';
    expect(sectionRatios(state).SUPPORT_DISCLOSURE).toBe(1);
  });

  it('weights review lightly so finishing the five data sections reads as almost done', () => {
    const state = baseState();
    state.student = { name: 'A', dateOfBirth: '2016-01-01', genderCode: 'SYN_GENDER_MALE' };
    state.school = {
      selectionKind: 'other',
      schoolId: null,
      schoolVersionId: null,
      realSchoolId: null,
      name: 'S',
      typeCode: 'SYN_SCHOOL_PUBLIC',
      address: {
        street1: 'x',
        street2: '',
        city: 'y',
        stateCode: 'SYN_REGION_NORTH',
        zip: '50613',
      },
    };
    state.applicationCore = {
      currentGradeCode: 'SYN_GRADE_04',
      requestedEntryYear: 2027,
      requestedGradeCode: 'SYN_GRADE_05',
    };
    state.household = {
      ...state.household,
      guardianRelationshipCode: 'SYN_RELATIONSHIP_PARENT',
      address: {
        street1: 'x',
        street2: '',
        city: 'y',
        stateCode: 'SYN_REGION_NORTH',
        zip: '50613',
      },
      language: {
        homeLanguageCode: 'SYN_LANGUAGE_ENGLISH',
        firstLanguageCode: 'SYN_LANGUAGE_ENGLISH',
        primaryLanguageCode: 'SYN_LANGUAGE_ENGLISH',
        hasAdditionalLanguages: false,
        additionalLanguageCodes: [],
      },
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
      annualHouseholdIncomeDollars: '80000',
      currencyCode: 'USD',
      householdMemberCount: 4,
    };
    expect(overallProgress(state)).toBeGreaterThan(0.9);
    expect(overallProgress(state)).toBeLessThan(1);
  });
});
