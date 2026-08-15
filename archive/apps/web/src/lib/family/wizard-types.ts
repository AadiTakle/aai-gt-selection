import type { OnboardingStepCode } from '@gt-selection/contracts';

/**
 * The wizard holds loosely-typed field state (strings/booleans/arrays) while the
 * parent fills things in; `draft-mapper.ts` converts this into the strict
 * contract shapes only when saving. This keeps the form forgiving (partial,
 * resumable) without fighting the strict Zod schemas on every keystroke.
 */

export type StudentFields = {
  name: string;
  dateOfBirth: string; // yyyy-mm-dd
  genderCode: string;
};

export type AddressFields = {
  street1: string;
  street2: string;
  city: string;
  stateCode: string; // a SYN_REGION_* code presented as a US state
  zip: string;
};

export type LanguageFields = {
  homeLanguageCode: string;
  firstLanguageCode: string;
  primaryLanguageCode: string;
  hasAdditionalLanguages: boolean;
  additionalLanguageCodes: string[];
};

export type HouseholdFields = {
  guardianName: string; // real parent/guardian name, stored verbatim (not born-synthetic)
  guardianRelationshipCode: string;
  address: AddressFields;
  hasPriorGtRelative: boolean;
  priorGtRelativeNameFragments: string[];
  language: LanguageFields;
};

export type SchoolFields = {
  selectionKind: 'directory' | 'other' | '';
  schoolId: string | null;
  schoolVersionId: string | null;
  realSchoolId: string | null; // NCES id when chosen from the real school search
  name: string;
  typeCode: string;
  address: AddressFields;
};

export type ApplicationCoreFields = {
  currentGradeCode: string;
  requestedEntryYear: number | null;
  requestedGradeCode: string;
};

export type SupportFields = {
  // null = not answered yet, so this section is never auto-complete
  supportNeeded: boolean | null;
  accommodationCodes: string[];
  supportPlanCodes: string[];
  otherSelected: boolean;
  details: string;
  seriousDisciplineSanction: boolean | null;
  nonHealthWithdrawal: boolean | null;
  disclosureExplanation: string;
};

export type FinancialFields = {
  annualHouseholdIncomeDollars: string; // raw dollar input; converted to minor units on save
  currencyCode: string;
  householdMemberCount: number | null;
};

export type SignatureFields = {
  accuracyAcknowledged: boolean;
  referralSourceCode: string;
  signatureName: string;
};

export type WizardMeta = {
  profileId: string;
  profileVersion: number; // 0 until first profile save
  studentProfileVersionId: string | null;
  applicationId: string;
  applicationVersion: number; // 0 until first draft save
  applicationVersionId: string | null;
  correlationId: string;
};

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export type WizardState = {
  student: StudentFields;
  household: HouseholdFields;
  school: SchoolFields;
  applicationCore: ApplicationCoreFields;
  support: SupportFields;
  financial: FinancialFields;
  signature: SignatureFields;
  meta: WizardMeta;
  saveState: SaveState;
  saveError: string | null;
  submitted: boolean;
};

export const STEP_ORDER: OnboardingStepCode[] = [
  'STUDENT_PROFILE',
  'EDUCATIONAL_BACKGROUND',
  'SUPPORT_DISCLOSURE',
  'HOUSEHOLD_LANGUAGE',
  'FINANCIAL_INTAKE',
  'REVIEW_SIGNATURE',
];
