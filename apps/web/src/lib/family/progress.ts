import type { OnboardingStepCode } from '@gt-selection/contracts';

import { STEP_ORDER, type WizardState } from './wizard-types';

/**
 * Per-section completion ratio (0..1), derived from the real field state.
 * A section reads complete when its required fields are filled; conditional
 * follow-ups only count when their trigger is on.
 */
export function sectionRatios(state: WizardState): Record<OnboardingStepCode, number> {
  const filled = (...values: unknown[]) =>
    values.filter((v) => (typeof v === 'string' ? v.trim() !== '' : v !== null && v !== undefined))
      .length;

  // 1. Student profile (identity)
  const studentReq = [state.student.name, state.student.dateOfBirth, state.student.genderCode];
  const studentProfile = filled(...studentReq) / studentReq.length;

  // 2. Educational background — a school is chosen when it's a manual "other"
  // entry (needs name+type), a real NCES pick (has realSchoolId + name), or a
  // synthetic directory row (has schoolId).
  const isOther = state.school.selectionKind === 'other';
  const schoolChosen = isOther
    ? state.school.name.trim() !== '' && state.school.typeCode !== ''
    : state.school.realSchoolId !== null || state.school.schoolId !== null;
  const eduReq = [
    schoolChosen ? 'ok' : '',
    state.applicationCore.currentGradeCode,
    state.applicationCore.requestedEntryYear,
    state.applicationCore.requestedGradeCode,
  ];
  const educationalBackground =
    state.school.selectionKind === '' ? 0 : filled(...eduReq) / eduReq.length;

  // 3. Support & disclosures — every yes/no must be ANSWERED (never auto-complete).
  const supportParts: number[] = [];
  supportParts.push(state.support.supportNeeded === null ? 0 : 1);
  if (state.support.supportNeeded === true || state.support.otherSelected) {
    supportParts.push(state.support.details.trim() !== '' ? 1 : 0);
  }
  supportParts.push(state.support.seriousDisciplineSanction === null ? 0 : 1);
  supportParts.push(state.support.nonHealthWithdrawal === null ? 0 : 1);
  if (
    state.support.seriousDisciplineSanction === true ||
    state.support.nonHealthWithdrawal === true
  ) {
    supportParts.push(state.support.disclosureExplanation.trim() !== '' ? 1 : 0);
  }
  const supportDisclosure = supportParts.reduce((a, b) => a + b, 0) / supportParts.length;

  // 4. Household & language
  const langReq = [
    state.household.guardianRelationshipCode,
    state.household.address.street1,
    state.household.address.city,
    state.household.address.stateCode,
    state.household.address.zip,
    state.household.language.homeLanguageCode,
    state.household.language.firstLanguageCode,
    state.household.language.primaryLanguageCode,
  ];
  const householdLanguage = filled(...langReq) / langReq.length;

  // 5. Financial intake — income + household size only
  const finReq = [
    state.financial.annualHouseholdIncomeDollars,
    state.financial.householdMemberCount,
  ];
  const financialIntake = filled(...finReq) / finReq.length;

  // 6. Review & sign
  const reviewReq = [state.signature.accuracyAcknowledged, state.signature.signatureName];
  const reviewSignature = filled(...reviewReq) / reviewReq.length;

  return {
    STUDENT_PROFILE: studentProfile,
    EDUCATIONAL_BACKGROUND: educationalBackground,
    SUPPORT_DISCLOSURE: supportDisclosure,
    HOUSEHOLD_LANGUAGE: householdLanguage,
    FINANCIAL_INTAKE: financialIntake,
    REVIEW_SIGNATURE: reviewSignature,
  };
}

/**
 * Overall progress for the gauge. Intentionally motivating: a small floor so it
 * never reads 0%, and a lighter weight on the final review step so finishing the
 * five data sections reads as "almost done". Presentation only — Submit still
 * hard-gates on real validation.
 */
export function overallProgress(state: WizardState): number {
  const ratios = sectionRatios(state);
  const weights: Record<OnboardingStepCode, number> = {
    STUDENT_PROFILE: 1,
    EDUCATIONAL_BACKGROUND: 1,
    SUPPORT_DISCLOSURE: 1,
    HOUSEHOLD_LANGUAGE: 1,
    FINANCIAL_INTAKE: 1,
    REVIEW_SIGNATURE: 0.5,
  };
  const totalWeight = STEP_ORDER.reduce((sum, step) => sum + weights[step], 0);
  const earned = STEP_ORDER.reduce((sum, step) => sum + weights[step] * ratios[step], 0);
  const raw = earned / totalWeight;
  const FLOOR = 0.06;
  return Math.min(1, FLOOR + raw * (1 - FLOOR));
}

export function isSectionComplete(state: WizardState, step: OnboardingStepCode): boolean {
  return sectionRatios(state)[step] >= 0.999;
}

export function completedSteps(state: WizardState): OnboardingStepCode[] {
  return STEP_ORDER.filter((step) => isSectionComplete(state, step));
}
