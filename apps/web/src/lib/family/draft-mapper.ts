import {
  FINAL_SIGNATURE_STATEMENT,
  type ApplicationDraft,
  type ApplicationFinalSubmission,
  type SchoolSelection,
  type StudentProfileContent,
  type SupportDisclosure,
  type SyntheticAddress,
} from '@gt-selection/contracts';

import { completedSteps } from './progress';
import {
  ACKNOWLEDGEMENT_VERSION,
  FINANCE_SEMANTICS_VERSION,
  LANGUAGE_VOCABULARY_VERSION,
  PROFILE_PURPOSE_VERSION,
  SIGNATURE_VERSION,
  SUPPORT_VOCABULARY_VERSION,
} from './vocab';
import {
  SYNTHETIC_COUNTRY_CODE,
  SYNTHETIC_POSTAL_CODE,
  toSyntheticName,
  toSyntheticStudentCode,
} from './synthetic';
import type { AddressFields, WizardState } from './wizard-types';

/**
 * Pure wizard-state → contract-shape mappers. All literal/version/purpose fields
 * come from constants here so there is a single source of truth. These functions
 * assume the relevant sections are complete; callers gate on `progress` helpers.
 *
 * The born-synthetic contract requires names/addresses to begin with "Synthetic"
 * and postal code to be "00000"; `toSyntheticName` applies that transform on the
 * way to the backend. The UI no longer shows a "Synthetic" chip — the constraint
 * is applied at the persistence boundary only.
 */

// The finance contract requires a tax year; the UI asks for "most recent year".
const MOST_RECENT_TAX_YEAR = 2025;

function toAddress(fields: AddressFields): SyntheticAddress {
  return {
    line1: toSyntheticName(fields.street1),
    line2: fields.street2.trim() ? toSyntheticName(fields.street2) : null,
    city: toSyntheticName(fields.city),
    regionCode: fields.stateCode,
    postalCode: SYNTHETIC_POSTAL_CODE,
    countryCode: SYNTHETIC_COUNTRY_CODE,
  };
}

export function toStudentProfileContent(state: WizardState): StudentProfileContent {
  const { student, household } = state;
  return {
    student: {
      syntheticStudentCode: toSyntheticStudentCode(student.name || state.meta.profileId),
      fullName: toSyntheticName(student.name),
      dateOfBirth: student.dateOfBirth,
      genderCode: student.genderCode,
      genderVocabularyVersion: 'GENDER-SYN-V1',
    },
    household: {
      guardianRelationshipCode: household.guardianRelationshipCode,
      primaryAddress: toAddress(household.address),
      hasPriorGtRelative: household.hasPriorGtRelative,
      priorGtRelativeNames: household.hasPriorGtRelative
        ? household.priorGtRelativeNameFragments
            .filter((n) => n.trim() !== '')
            .map((n) => toSyntheticName(n))
        : [],
      languageSurvey: {
        homeLanguageCode: household.language.homeLanguageCode,
        firstLanguageCode: household.language.firstLanguageCode,
        primaryLanguageCode: household.language.primaryLanguageCode,
        hasAdditionalLanguages: household.language.hasAdditionalLanguages,
        additionalLanguageCodes: household.language.hasAdditionalLanguages
          ? household.language.additionalLanguageCodes
          : [],
        vocabularyVersion: LANGUAGE_VOCABULARY_VERSION,
      },
    },
    purpose: {
      code: 'SYN_PROFILE_ACCOUNT_SETUP',
      version: PROFILE_PURPOSE_VERSION,
    },
    syntheticOnly: true,
  };
}

function toSchoolSelection(state: WizardState): SchoolSelection | undefined {
  const s = state.school;
  // Manual "not listed" entry, OR a real school picked from the NCES search.
  // Both are persisted as an `other` snapshot with the born-synthetic transform
  // applied to the name/address (the contract forbids raw real institution data;
  // the real name is only shown in-session, never stored verbatim). Relaxing
  // that to keep the real name is a governance change — see the education-step
  // note and GOVERNANCE_REAL_SCHOOL_SEARCH.md.
  if (s.selectionKind === 'other' || (s.selectionKind === 'directory' && s.realSchoolId)) {
    if (!s.name.trim()) return undefined;
    return {
      selectionKind: 'other',
      snapshot: {
        name: toSyntheticName(s.name),
        typeCode: s.typeCode || 'SYN_SCHOOL_PUBLIC',
        address: toAddress(s.address),
        syntheticOnly: true,
      },
    };
  }
  // Synthetic directory row (has our own UUIDs).
  if (s.selectionKind === 'directory' && s.schoolId && s.schoolVersionId) {
    return {
      selectionKind: 'directory',
      schoolId: s.schoolId,
      schoolVersionId: s.schoolVersionId,
      snapshot: {
        name: toSyntheticName(s.name),
        typeCode: s.typeCode,
        address: toAddress(s.address),
        syntheticOnly: true,
      },
    };
  }
  return undefined;
}

function toSupportDisclosure(state: WizardState): SupportDisclosure {
  const s = state.support;
  const supportNeeded = s.supportNeeded === true;
  const seriousDisciplineSanction = s.seriousDisciplineSanction === true;
  const nonHealthWithdrawal = s.nonHealthWithdrawal === true;
  const detailsRequired = supportNeeded || s.otherSelected;
  const explanationRequired = seriousDisciplineSanction || nonHealthWithdrawal;
  return {
    supportNeeded,
    vocabularyVersion: SUPPORT_VOCABULARY_VERSION,
    accommodationCodes: supportNeeded ? s.accommodationCodes : [],
    supportPlanCodes: supportNeeded ? s.supportPlanCodes : [],
    otherSelected: supportNeeded ? s.otherSelected : false,
    details: detailsRequired && s.details.trim() ? s.details.trim() : null,
    seriousDisciplineSanction,
    nonHealthWithdrawal,
    disclosureExplanation:
      explanationRequired && s.disclosureExplanation.trim() ? s.disclosureExplanation.trim() : null,
    purposeCode: 'SYN_SUPPORT_OPERATIONS_ONLY',
    syntheticOnly: true,
  };
}

/** Dollars (string) → non-negative integer minor units. */
export function dollarsToMinor(dollars: string): number {
  if (/-/.test(dollars)) return 0;
  const parsed = Number.parseFloat(dollars.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

/**
 * Build the (possibly partial) application draft for autosave. Every sub-object
 * is included only when its section has enough to form a valid shape, matching
 * the all-optional `applicationDraftSchema`.
 */
export function toApplicationDraft(
  state: WizardState,
  options: { includeFinalSubmission: boolean } = { includeFinalSubmission: false },
): ApplicationDraft {
  const draft: ApplicationDraft = { syntheticOnly: true };

  const core = state.applicationCore;
  if (core.currentGradeCode && core.requestedEntryYear && core.requestedGradeCode) {
    draft.application = {
      currentGradeCode: core.currentGradeCode,
      requestedEntryYear: core.requestedEntryYear,
      requestedGradeCode: core.requestedGradeCode,
    };
  }

  const school = toSchoolSelection(state);
  if (school) draft.school = school;

  // include support once all three yes/no answers are given and coherent
  const s = state.support;
  const allAnswered =
    s.supportNeeded !== null &&
    s.seriousDisciplineSanction !== null &&
    s.nonHealthWithdrawal !== null;
  const supportCoherent = !(s.supportNeeded === true || s.otherSelected) || s.details.trim() !== '';
  const disclosureCoherent =
    !(s.seriousDisciplineSanction === true || s.nonHealthWithdrawal === true) ||
    s.disclosureExplanation.trim() !== '';
  if (allAnswered && supportCoherent && disclosureCoherent) {
    draft.supportDisclosure = toSupportDisclosure(state);
  }

  const fin = state.financial;
  if (fin.annualHouseholdIncomeDollars.trim() && fin.householdMemberCount) {
    draft.financialIntake = {
      annualHouseholdIncomeMinor: dollarsToMinor(fin.annualHouseholdIncomeDollars),
      currencyCode: fin.currencyCode || 'USD',
      taxYear: MOST_RECENT_TAX_YEAR,
      incomeDefinitionCode: 'SYN_INCOME_GROSS_ANNUAL_V1',
      householdMemberCount: fin.householdMemberCount,
      householdMemberDefinitionCode: 'SYN_HOUSEHOLD_MEMBERS_V1',
      semanticsVersion: FINANCE_SEMANTICS_VERSION,
      purposeCode: 'SYN_FINANCIAL_AID_INTAKE_ONLY',
      syntheticOnly: true,
    };
  }

  if (options.includeFinalSubmission) {
    const fs = toFinalSubmission(state);
    if (fs) draft.finalSubmission = fs;
  }

  return draft;
}

/** Build the final submission block (used only at review/submit time). */
export function toFinalSubmission(
  state: WizardState,
  now: string = new Date().toISOString(),
): ApplicationFinalSubmission | null {
  if (!state.signature.accuracyAcknowledged) return null;
  if (!state.signature.referralSourceCode) return null;
  if (!state.signature.signatureName.trim()) return null;
  return {
    completedStepCodes: completedSteps(state),
    acknowledgementVersion: ACKNOWLEDGEMENT_VERSION,
    acknowledgementStatement: FINAL_SIGNATURE_STATEMENT,
    accuracyAcknowledged: true,
    acknowledgedAt: now,
    referralSourceCode: state.signature.referralSourceCode,
    signatureStatementVersion: SIGNATURE_VERSION,
    signatureStatement: FINAL_SIGNATURE_STATEMENT,
    signatureName: toSyntheticName(state.signature.signatureName),
    signedAt: now,
  };
}
