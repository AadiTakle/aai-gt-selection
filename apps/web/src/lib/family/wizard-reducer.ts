import type { ApplicationVersion, StudentProfileVersion } from '@gt-selection/contracts';

import { fromSyntheticName } from './synthetic';
import type { AddressFields, SaveState, WizardState } from './wizard-types';

const EMPTY_ADDRESS: AddressFields = {
  street1: '',
  street2: '',
  city: '',
  stateCode: '',
  zip: '',
};

export type WizardAction =
  | { type: 'setStudent'; patch: Partial<WizardState['student']> }
  | { type: 'setHousehold'; patch: Partial<WizardState['household']> }
  | { type: 'setHouseholdAddress'; patch: Partial<AddressFields> }
  | { type: 'setLanguage'; patch: Partial<WizardState['household']['language']> }
  | { type: 'setSchool'; patch: Partial<WizardState['school']> }
  | { type: 'setSchoolAddress'; patch: Partial<AddressFields> }
  | { type: 'setApplicationCore'; patch: Partial<WizardState['applicationCore']> }
  | { type: 'setSupport'; patch: Partial<WizardState['support']> }
  | { type: 'setFinancial'; patch: Partial<WizardState['financial']> }
  | { type: 'setSignature'; patch: Partial<WizardState['signature']> }
  | { type: 'setSaveState'; saveState: SaveState; error?: string | null }
  | {
      type: 'profileSaved';
      profileVersion: number;
      studentProfileVersionId: string;
    }
  | { type: 'draftSaved'; applicationVersion: number; applicationVersionId: string }
  | { type: 'hydrate'; state: WizardState }
  | { type: 'submitted' };

export function createInitialWizardState(seed: {
  profileId: string;
  applicationId: string;
  correlationId: string;
}): WizardState {
  return {
    student: { name: '', dateOfBirth: '', genderCode: '' },
    household: {
      guardianName: '',
      guardianRelationshipCode: '',
      address: { ...EMPTY_ADDRESS },
      hasPriorGtRelative: false,
      priorGtRelativeNameFragments: [],
      language: {
        homeLanguageCode: '',
        firstLanguageCode: '',
        primaryLanguageCode: '',
        hasAdditionalLanguages: false,
        additionalLanguageCodes: [],
      },
    },
    school: {
      selectionKind: '',
      schoolId: null,
      schoolVersionId: null,
      realSchoolId: null,
      name: '',
      typeCode: '',
      address: { ...EMPTY_ADDRESS },
    },
    applicationCore: {
      currentGradeCode: '',
      requestedEntryYear: null,
      requestedGradeCode: '',
    },
    support: {
      supportNeeded: null,
      accommodationCodes: [],
      supportPlanCodes: [],
      otherSelected: false,
      details: '',
      seriousDisciplineSanction: null,
      nonHealthWithdrawal: null,
      disclosureExplanation: '',
    },
    financial: {
      annualHouseholdIncomeDollars: '',
      currencyCode: 'USD',
      householdMemberCount: null,
    },
    signature: { accuracyAcknowledged: false, referralSourceCode: '', signatureName: '' },
    meta: {
      profileId: seed.profileId,
      profileVersion: 0,
      studentProfileVersionId: null,
      applicationId: seed.applicationId,
      applicationVersion: 0,
      applicationVersionId: null,
      correlationId: seed.correlationId,
    },
    saveState: 'idle',
    saveError: null,
    submitted: false,
  };
}

/** Rehydrate wizard state from persisted profile + application versions (resume). */
export function hydrateWizardState(
  base: WizardState,
  profile: StudentProfileVersion,
  application: ApplicationVersion,
): WizardState {
  const hydrated: WizardState = structuredClone(base);
  hydrated.meta.profileVersion = profile.version;
  hydrated.meta.studentProfileVersionId = profile.profileVersionId;
  hydrated.meta.applicationVersion = application.version;
  hydrated.meta.applicationVersionId = application.applicationVersionId;
  // a submitted application must resume into the locked read-only view, not the
  // editable form — the backend is the source of truth for submitted-ness
  hydrated.submitted = application.state === 'submitted';

  hydrated.student = {
    name: fromSyntheticName(profile.student.fullName),
    dateOfBirth: profile.student.dateOfBirth,
    genderCode: profile.student.genderCode,
  };
  const addr = profile.household.primaryAddress;
  hydrated.household = {
    // guardian name is stored verbatim (real value, not born-synthetic), so it
    // rehydrates as-is — no fromSyntheticName strip
    guardianName: profile.household.guardianName ?? '',
    guardianRelationshipCode: profile.household.guardianRelationshipCode,
    address: {
      street1: fromSyntheticName(addr.line1),
      street2: fromSyntheticName(addr.line2),
      city: fromSyntheticName(addr.city),
      stateCode: addr.regionCode,
      zip: addr.postalCode === '00000' ? '' : addr.postalCode,
    },
    hasPriorGtRelative: profile.household.hasPriorGtRelative,
    priorGtRelativeNameFragments: profile.household.priorGtRelativeNames.map(fromSyntheticName),
    language: {
      homeLanguageCode: profile.household.languageSurvey.homeLanguageCode,
      firstLanguageCode: profile.household.languageSurvey.firstLanguageCode,
      primaryLanguageCode: profile.household.languageSurvey.primaryLanguageCode,
      hasAdditionalLanguages: profile.household.languageSurvey.hasAdditionalLanguages,
      additionalLanguageCodes: profile.household.languageSurvey.additionalLanguageCodes,
    },
  };

  if (application.application) {
    hydrated.applicationCore = {
      currentGradeCode: application.application.currentGradeCode,
      requestedEntryYear: application.application.requestedEntryYear,
      requestedGradeCode: application.application.requestedGradeCode,
    };
  }
  if (application.school) {
    const snap = application.school.snapshot;
    hydrated.school = {
      selectionKind: application.school.selectionKind,
      schoolId:
        application.school.selectionKind === 'directory' ? application.school.schoolId : null,
      schoolVersionId:
        application.school.selectionKind === 'directory'
          ? application.school.schoolVersionId
          : null,
      realSchoolId: null,
      name: fromSyntheticName(snap.name),
      typeCode: snap.typeCode,
      address: {
        street1: fromSyntheticName(snap.address.line1),
        street2: fromSyntheticName(snap.address.line2),
        city: fromSyntheticName(snap.address.city),
        stateCode: snap.address.regionCode,
        zip: snap.address.postalCode === '00000' ? '' : snap.address.postalCode,
      },
    };
  }
  if (application.supportDisclosure) {
    const sd = application.supportDisclosure;
    hydrated.support = {
      supportNeeded: sd.supportNeeded,
      accommodationCodes: sd.accommodationCodes,
      supportPlanCodes: sd.supportPlanCodes,
      otherSelected: sd.otherSelected,
      details: sd.details ?? '',
      seriousDisciplineSanction: sd.seriousDisciplineSanction,
      nonHealthWithdrawal: sd.nonHealthWithdrawal,
      disclosureExplanation: sd.disclosureExplanation ?? '',
    };
  }
  if (application.financialIntake) {
    const fi = application.financialIntake;
    hydrated.financial = {
      annualHouseholdIncomeDollars: (fi.annualHouseholdIncomeMinor / 100).toString(),
      currencyCode: fi.currencyCode,
      householdMemberCount: fi.householdMemberCount,
    };
  }
  // restore the signature from the submitted final-submission block so "Make
  // edits" → re-submit doesn't force the family to re-sign. The name is stored
  // born-synthetic, so strip the prefix for display.
  if (application.finalSubmission) {
    const fs = application.finalSubmission;
    hydrated.signature = {
      accuracyAcknowledged: fs.accuracyAcknowledged,
      referralSourceCode: fs.referralSourceCode,
      signatureName: fromSyntheticName(fs.signatureName),
    };
  }
  return hydrated;
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'setStudent':
      return { ...state, student: { ...state.student, ...action.patch } };
    case 'setHousehold':
      return { ...state, household: { ...state.household, ...action.patch } };
    case 'setHouseholdAddress':
      return {
        ...state,
        household: { ...state.household, address: { ...state.household.address, ...action.patch } },
      };
    case 'setLanguage':
      return {
        ...state,
        household: {
          ...state.household,
          language: { ...state.household.language, ...action.patch },
        },
      };
    case 'setSchool':
      return { ...state, school: { ...state.school, ...action.patch } };
    case 'setSchoolAddress':
      return {
        ...state,
        school: { ...state.school, address: { ...state.school.address, ...action.patch } },
      };
    case 'setApplicationCore':
      return { ...state, applicationCore: { ...state.applicationCore, ...action.patch } };
    case 'setSupport':
      return { ...state, support: { ...state.support, ...action.patch } };
    case 'setFinancial':
      return { ...state, financial: { ...state.financial, ...action.patch } };
    case 'setSignature':
      return { ...state, signature: { ...state.signature, ...action.patch } };
    case 'setSaveState':
      return { ...state, saveState: action.saveState, saveError: action.error ?? null };
    case 'profileSaved':
      return {
        ...state,
        meta: {
          ...state.meta,
          profileVersion: action.profileVersion,
          studentProfileVersionId: action.studentProfileVersionId,
        },
      };
    case 'draftSaved':
      return {
        ...state,
        meta: {
          ...state.meta,
          applicationVersion: action.applicationVersion,
          applicationVersionId: action.applicationVersionId,
        },
      };
    case 'hydrate':
      return action.state;
    case 'submitted':
      return { ...state, submitted: true };
    default:
      return state;
  }
}
