/**
 * Curated synthetic vocabularies for the family application UI.
 *
 * The database and the `@gt-selection/contracts` Zod schemas validate coded
 * fields by REGEX PREFIX only (e.g. `^SYN_GRADE_`, `^SYN_LANGUAGE_`) — there is
 * no closed enum table — so the frontend owns the display vocabulary. Each entry
 * pairs a human-readable `label` (what the parent picks) with the synthetic
 * `code` that is actually stored. These are deliberately demo vocabularies for
 * this synthetic dataset.
 *
 * The `*_VERSION` constants mirror the literal version fields the contracts
 * require, so `draft-mapper.ts` sets them from one source of truth.
 */

export type VocabOption = { code: string; label: string };

export const GENDER_VOCABULARY_VERSION = 'GENDER-SYN-V1';
export const LANGUAGE_VOCABULARY_VERSION = 'LANGUAGE-SYN-V1';
export const SUPPORT_VOCABULARY_VERSION = 'SUPPORT-SYN-V1';
export const FINANCE_SEMANTICS_VERSION = 'FINANCE-SYN-V1';
export const PROFILE_PURPOSE_VERSION = 'PROFILE-PURPOSE-SYN-V1';
export const ACKNOWLEDGEMENT_VERSION = 'ACKNOWLEDGEMENT-SYN-V1';
export const SIGNATURE_VERSION = 'SIGNATURE-SYN-V1';

export const GENDERS: VocabOption[] = [
  { code: 'SYN_GENDER_FEMALE', label: 'Female' },
  { code: 'SYN_GENDER_MALE', label: 'Male' },
  { code: 'SYN_GENDER_NONBINARY', label: 'Non-binary' },
  { code: 'SYN_GENDER_SELF_DESCRIBE', label: 'Prefer to self-describe' },
  { code: 'SYN_GENDER_UNDISCLOSED', label: 'Prefer not to say' },
];

export const GRADES: VocabOption[] = [
  { code: 'SYN_GRADE_02', label: 'Grade 2' },
  { code: 'SYN_GRADE_03', label: 'Grade 3' },
  { code: 'SYN_GRADE_04', label: 'Grade 4' },
  { code: 'SYN_GRADE_05', label: 'Grade 5' },
  { code: 'SYN_GRADE_06', label: 'Grade 6' },
  { code: 'SYN_GRADE_07', label: 'Grade 7' },
  { code: 'SYN_GRADE_08', label: 'Grade 8' },
];

export const ENTRY_YEARS = [2027, 2028] as const;

export const RELATIONSHIPS: VocabOption[] = [
  { code: 'SYN_RELATIONSHIP_PARENT', label: 'Parent' },
  { code: 'SYN_RELATIONSHIP_LEGAL_GUARDIAN', label: 'Legal guardian' },
  { code: 'SYN_RELATIONSHIP_GRANDPARENT', label: 'Grandparent' },
  { code: 'SYN_RELATIONSHIP_FOSTER_PARENT', label: 'Foster parent' },
  { code: 'SYN_RELATIONSHIP_OTHER', label: 'Other' },
];

// Real US states, still carried as SYN_REGION_<ABBR> codes so the born-synthetic
// contract's `^SYN_REGION_` rule is satisfied while the family sees real names.
const US_STATES: [string, string][] = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
];

export const REGIONS: VocabOption[] = US_STATES.map(([abbr, name]) => ({
  code: `SYN_REGION_${abbr}`,
  label: name,
}));

/**
 * Synthetic address book for the "start typing / pick one" autofill. There is no
 * live address API here (and the CSP blocks external
 * calls), so selecting one of these fills street/city/state/zip in one tap.
 */
export type AddressSuggestion = {
  id: string;
  label: string;
  street1: string;
  city: string;
  stateCode: string;
  zip: string;
};

export const ADDRESS_SUGGESTIONS: AddressSuggestion[] = [
  {
    id: 'addr-1',
    label: '418 Larkspur Ave, Cedar Falls, IA 50613',
    street1: '418 Larkspur Ave',
    city: 'Cedar Falls',
    stateCode: 'SYN_REGION_IA',
    zip: '50613',
  },
  {
    id: 'addr-2',
    label: '2100 Rownd St, Waterloo, IA 50701',
    street1: '2100 Rownd St',
    city: 'Waterloo',
    stateCode: 'SYN_REGION_IA',
    zip: '50701',
  },
  {
    id: 'addr-3',
    label: '55 Grove St, Austin, TX 78701',
    street1: '55 Grove St',
    city: 'Austin',
    stateCode: 'SYN_REGION_TX',
    zip: '78701',
  },
  {
    id: 'addr-4',
    label: '900 Ansborough Ave, Phoenix, AZ 85004',
    street1: '900 Ansborough Ave',
    city: 'Phoenix',
    stateCode: 'SYN_REGION_AZ',
    zip: '85004',
  },
];

export const LANGUAGES: VocabOption[] = [
  { code: 'SYN_LANGUAGE_ENGLISH', label: 'English' },
  { code: 'SYN_LANGUAGE_SPANISH', label: 'Spanish' },
  { code: 'SYN_LANGUAGE_CHINESE', label: 'Chinese' },
  { code: 'SYN_LANGUAGE_ARABIC', label: 'Arabic' },
  { code: 'SYN_LANGUAGE_VIETNAMESE', label: 'Vietnamese' },
  { code: 'SYN_LANGUAGE_TAGALOG', label: 'Tagalog' },
  { code: 'SYN_LANGUAGE_OTHER', label: 'Another language' },
];

export const SCHOOL_TYPES: VocabOption[] = [
  { code: 'SYN_SCHOOL_PUBLIC', label: 'Public' },
  { code: 'SYN_SCHOOL_PRIVATE', label: 'Private / independent' },
  { code: 'SYN_SCHOOL_CHARTER', label: 'Charter' },
  { code: 'SYN_SCHOOL_HOME', label: 'Home education' },
];

export const ACCOMMODATIONS: VocabOption[] = [
  { code: 'SYN_ACCOM_IEP', label: 'IEP' },
  { code: 'SYN_ACCOM_504', label: '504 plan support' },
  { code: 'SYN_ACCOM_SPEECH', label: 'Speech / language' },
  { code: 'SYN_ACCOM_OT', label: 'Occupational therapy' },
  { code: 'SYN_ACCOM_BEHAVIORAL', label: 'Behavioral support' },
];

export const SUPPORT_PLANS: VocabOption[] = [
  { code: 'SYN_PLAN_504', label: '504 Plan' },
  { code: 'SYN_PLAN_GIFTED_SERVICE', label: 'Gifted service plan' },
  { code: 'SYN_PLAN_LEARNING_SUPPORT', label: 'Learning support plan' },
];

export const REFERRAL_SOURCES: VocabOption[] = [
  { code: 'SYN_REFERRAL_FRIEND_FAMILY', label: 'A friend or family member' },
  { code: 'SYN_REFERRAL_CURRENT_SCHOOL', label: "My child's current school" },
  { code: 'SYN_REFERRAL_COMMUNITY_EVENT', label: 'Community event' },
  { code: 'SYN_REFERRAL_SOCIAL_MEDIA', label: 'Social media' },
  { code: 'SYN_REFERRAL_WEB_SEARCH', label: 'Web search' },
  { code: 'SYN_REFERRAL_OTHER', label: 'Other' },
];

export function labelForCode(options: VocabOption[], code: string | undefined | null): string {
  if (!code) return '—';
  return options.find((option) => option.code === code)?.label ?? code;
}
