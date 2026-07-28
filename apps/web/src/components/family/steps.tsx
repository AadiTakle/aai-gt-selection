'use client';

import type { Dispatch } from 'react';

import { FINAL_SIGNATURE_STATEMENT } from '@gt-selection/contracts';

import {
  ACCOMMODATIONS,
  ENTRY_YEARS,
  GENDERS,
  GRADES,
  labelForCode,
  LANGUAGES,
  REFERRAL_SOURCES,
  REGIONS,
  RELATIONSHIPS,
  SCHOOL_TYPES,
  SUPPORT_PLANS,
} from '@/lib/family/vocab';
import type { WizardAction } from '@/lib/family/wizard-reducer';
import type { WizardState } from '@/lib/family/wizard-types';

import { AddressAutocomplete } from './address-autocomplete';
import { SchoolSearch } from './school-search';
import {
  ChipMultiSelect,
  RevealGroup,
  SyntheticSelect,
  TextField,
  YesNoToggle,
} from './synthetic-field';
import styles from './steps.module.css';

function stateLabel(code: string): string {
  return labelForCode(REGIONS, code);
}

type StepProps = {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
};

function toggleCode(list: string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

export function StepStudentProfile({ state, dispatch }: StepProps) {
  const { student } = state;
  return (
    <div className={styles.grid}>
      <div className={styles.colFull}>
        <TextField
          label="Student's name"
          value={student.name}
          onChange={(v) => dispatch({ type: 'setStudent', patch: { name: v } })}
          required
          placeholder="First and last name"
        />
      </div>
      <TextField
        label="Date of birth"
        type="date"
        value={student.dateOfBirth}
        onChange={(v) => dispatch({ type: 'setStudent', patch: { dateOfBirth: v } })}
        required
      />
      <SyntheticSelect
        label="Gender"
        options={GENDERS}
        value={student.genderCode}
        onChange={(v) => dispatch({ type: 'setStudent', patch: { genderCode: v } })}
        required
      />
    </div>
  );
}

export function StepEducationalBackground({ state, dispatch }: StepProps) {
  const { school, applicationCore } = state;
  const isOther = school.selectionKind === 'other';

  return (
    <div className={styles.grid}>
      <SchoolSearch
        selectedName={school.selectionKind && !isOther ? school.name : ''}
        onSelect={(picked) => {
          // real school shown to the family; stored via the synthetic-safe mapper
          dispatch({
            type: 'setSchool',
            patch: {
              selectionKind: 'directory',
              schoolId: null,
              schoolVersionId: null,
              realSchoolId: picked.id,
              name: picked.name,
              typeCode: 'SYN_SCHOOL_PUBLIC',
              address: {
                street1: picked.street,
                street2: '',
                city: picked.city,
                stateCode: `SYN_REGION_${picked.state}`,
                zip: picked.zip,
              },
            },
          });
        }}
        onOther={() =>
          dispatch({
            type: 'setSchool',
            patch: {
              selectionKind: 'other',
              schoolId: null,
              schoolVersionId: null,
              realSchoolId: null,
            },
          })
        }
      />
      {school.name ? (
        <div className={styles.colFull}>
          <p className={styles.autofill}>
            <strong>{school.name}</strong>
            {school.address.city ? (
              <>
                {' '}
                · {school.address.city}
                {school.address.stateCode ? `, ${stateLabel(school.address.stateCode)}` : ''}
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {isOther ? (
        <div className={styles.colFull}>
          <RevealGroup open={isOther}>
            <div className={styles.grid}>
              <div className={styles.colFull}>
                <TextField
                  label="School name"
                  value={school.name}
                  onChange={(v) => dispatch({ type: 'setSchool', patch: { name: v } })}
                  required
                />
              </div>
              <SyntheticSelect
                label="School type"
                options={SCHOOL_TYPES}
                value={school.typeCode}
                onChange={(v) => dispatch({ type: 'setSchool', patch: { typeCode: v } })}
                required
              />
              <TextField
                label="School city"
                value={school.address.city}
                onChange={(v) => dispatch({ type: 'setSchoolAddress', patch: { city: v } })}
                required
              />
            </div>
          </RevealGroup>
        </div>
      ) : null}

      <SyntheticSelect
        label="Current grade"
        options={GRADES}
        value={applicationCore.currentGradeCode}
        onChange={(v) => dispatch({ type: 'setApplicationCore', patch: { currentGradeCode: v } })}
        required
      />
      <SyntheticSelect
        label="Requested entry grade"
        options={GRADES}
        value={applicationCore.requestedGradeCode}
        onChange={(v) => dispatch({ type: 'setApplicationCore', patch: { requestedGradeCode: v } })}
        required
      />
      <SyntheticSelect
        label="Requested entry year"
        options={ENTRY_YEARS.map((y) => ({ code: String(y), label: `Fall ${y}` }))}
        value={applicationCore.requestedEntryYear ? String(applicationCore.requestedEntryYear) : ''}
        onChange={(v) =>
          dispatch({ type: 'setApplicationCore', patch: { requestedEntryYear: Number(v) } })
        }
        required
      />
    </div>
  );
}

export function StepSupportDisclosure({ state, dispatch }: StepProps) {
  const { support } = state;
  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <p className={styles.cardTitle}>Accommodations &amp; learning plans</p>
        <p className={styles.cardNote}>
          This section is private operational context. It is hidden from eligibility reviewers and
          never affects any routing or decision.
        </p>
        <YesNoToggle
          legend="Does your child have accommodations, learning plans, or other support?"
          value={support.supportNeeded}
          onChange={(v) => dispatch({ type: 'setSupport', patch: { supportNeeded: v } })}
        />
        <RevealGroup open={support.supportNeeded === true}>
          <ChipMultiSelect
            label="Accommodations"
            options={ACCOMMODATIONS}
            selected={support.accommodationCodes}
            onToggle={(code) =>
              dispatch({
                type: 'setSupport',
                patch: { accommodationCodes: toggleCode(support.accommodationCodes, code) },
              })
            }
          />
          <ChipMultiSelect
            label="Support plans"
            options={SUPPORT_PLANS}
            selected={support.supportPlanCodes}
            onToggle={(code) =>
              dispatch({
                type: 'setSupport',
                patch: { supportPlanCodes: toggleCode(support.supportPlanCodes, code) },
              })
            }
          />
          <label className={styles.plainLabel}>
            Details about accommodations or challenges <span className={styles.req}>*</span>
          </label>
          <textarea
            className={styles.textarea}
            maxLength={1000}
            value={support.details}
            placeholder="Anything that helps us support your child well."
            onChange={(e) => dispatch({ type: 'setSupport', patch: { details: e.target.value } })}
          />
        </RevealGroup>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Disclosures</p>
        <YesNoToggle
          legend="Has the student been dismissed, suspended, placed on probation, or received another serious disciplinary sanction?"
          value={support.seriousDisciplineSanction}
          onChange={(v) =>
            dispatch({ type: 'setSupport', patch: { seriousDisciplineSanction: v } })
          }
        />
        <YesNoToggle
          legend="Has the student voluntarily withdrawn for a non-health reason?"
          value={support.nonHealthWithdrawal}
          onChange={(v) => dispatch({ type: 'setSupport', patch: { nonHealthWithdrawal: v } })}
        />
        <RevealGroup
          open={support.seriousDisciplineSanction === true || support.nonHealthWithdrawal === true}
        >
          <label className={styles.plainLabel}>
            Please explain <span className={styles.req}>*</span>
          </label>
          <textarea
            className={styles.textarea}
            maxLength={1000}
            value={support.disclosureExplanation}
            placeholder="A brief explanation. Required when you answer yes; stays private."
            onChange={(e) =>
              dispatch({ type: 'setSupport', patch: { disclosureExplanation: e.target.value } })
            }
          />
        </RevealGroup>
      </div>
    </div>
  );
}

export function StepHouseholdLanguage({ state, dispatch }: StepProps) {
  const { household } = state;
  const lang = household.language;
  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <p className={styles.cardTitle}>Guardian &amp; household</p>
        <div className={styles.grid}>
          <TextField
            label="Parent / guardian name"
            value={household.guardianName}
            onChange={(v) => dispatch({ type: 'setHousehold', patch: { guardianName: v } })}
            required
          />
          <SyntheticSelect
            label="Your relationship to the child"
            options={RELATIONSHIPS}
            value={household.guardianRelationshipCode}
            onChange={(v) =>
              dispatch({ type: 'setHousehold', patch: { guardianRelationshipCode: v } })
            }
            required
          />
          <AddressAutocomplete
            onResolved={(a) =>
              dispatch({
                type: 'setHouseholdAddress',
                patch: { street1: a.street1, city: a.city, stateCode: a.stateCode, zip: a.zip },
              })
            }
          />
          <TextField
            label="Street address"
            value={household.address.street1}
            onChange={(v) => dispatch({ type: 'setHouseholdAddress', patch: { street1: v } })}
            required
          />
          <TextField
            label="Apt / unit"
            value={household.address.street2}
            onChange={(v) => dispatch({ type: 'setHouseholdAddress', patch: { street2: v } })}
          />
          <TextField
            label="City"
            value={household.address.city}
            onChange={(v) => dispatch({ type: 'setHouseholdAddress', patch: { city: v } })}
            required
          />
          <SyntheticSelect
            label="State"
            options={REGIONS}
            value={household.address.stateCode}
            onChange={(v) => dispatch({ type: 'setHouseholdAddress', patch: { stateCode: v } })}
            required
          />
          <TextField
            label="ZIP code"
            value={household.address.zip}
            onChange={(v) => dispatch({ type: 'setHouseholdAddress', patch: { zip: v } })}
            required
            inputMode="numeric"
            placeholder="e.g. 50613"
          />
        </div>

        <div className={styles.subToggle}>
          <YesNoToggle
            legend="Have any relatives attended GT School?"
            value={household.hasPriorGtRelative}
            onChange={(v) =>
              dispatch({
                type: 'setHousehold',
                patch: {
                  hasPriorGtRelative: v,
                  priorGtRelativeNameFragments: v ? household.priorGtRelativeNameFragments : [],
                },
              })
            }
          />
          <RevealGroup open={household.hasPriorGtRelative}>
            {household.priorGtRelativeNameFragments.map((name, index) => (
              <div key={index} className={styles.relRow}>
                <TextField
                  label={`Relative ${index + 1}`}
                  value={name}
                  onChange={(v) => {
                    const next = [...household.priorGtRelativeNameFragments];
                    next[index] = v;
                    dispatch({
                      type: 'setHousehold',
                      patch: { priorGtRelativeNameFragments: next },
                    });
                  }}
                  required
                />
                <button
                  type="button"
                  className={styles.relRemove}
                  aria-label={`Remove relative ${index + 1}`}
                  onClick={() =>
                    dispatch({
                      type: 'setHousehold',
                      patch: {
                        priorGtRelativeNameFragments: household.priorGtRelativeNameFragments.filter(
                          (_, i) => i !== index,
                        ),
                      },
                    })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.addBtn}
              onClick={() =>
                dispatch({
                  type: 'setHousehold',
                  patch: {
                    priorGtRelativeNameFragments: [...household.priorGtRelativeNameFragments, ''],
                  },
                })
              }
            >
              + Add a relative
            </button>
          </RevealGroup>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Home language survey</p>
        <p className={styles.cardNote}>
          These help us serve multilingual families — they are never scored.
        </p>
        <div className={styles.grid}>
          <SyntheticSelect
            label="Language most often spoken at home"
            options={LANGUAGES}
            value={lang.homeLanguageCode}
            onChange={(v) => dispatch({ type: 'setLanguage', patch: { homeLanguageCode: v } })}
            required
          />
          <SyntheticSelect
            label="Language the child first learned"
            options={LANGUAGES}
            value={lang.firstLanguageCode}
            onChange={(v) => dispatch({ type: 'setLanguage', patch: { firstLanguageCode: v } })}
            required
          />
          <SyntheticSelect
            label="Language the child uses most"
            options={LANGUAGES}
            value={lang.primaryLanguageCode}
            onChange={(v) => dispatch({ type: 'setLanguage', patch: { primaryLanguageCode: v } })}
            required
          />
        </div>
      </div>
    </div>
  );
}

export function StepFinancialIntake({ state, dispatch }: StepProps) {
  const { financial } = state;
  return (
    <div className={styles.stack}>
      <p className={styles.cardNote}>
        Purpose-separated and private. Income can never affect eligibility, and we do not request
        any W-2 or proof document now — only later, and only if your child is admitted. Please use
        your most recent tax year.
      </p>
      <div className={styles.grid}>
        <TextField
          label="Annual household income (USD)"
          type="number"
          min={0}
          value={financial.annualHouseholdIncomeDollars}
          onChange={(v) =>
            dispatch({ type: 'setFinancial', patch: { annualHouseholdIncomeDollars: v } })
          }
          required
          placeholder="e.g. 85000"
        />
        <TextField
          label="People in household"
          type="number"
          min={1}
          max={30}
          value={financial.householdMemberCount ? String(financial.householdMemberCount) : ''}
          onChange={(v) =>
            dispatch({
              type: 'setFinancial',
              patch: { householdMemberCount: v ? Number(v) : null },
            })
          }
          required
          placeholder="e.g. 4"
        />
      </div>
    </div>
  );
}

export function StepReviewSignature({ state, dispatch }: StepProps) {
  const { signature } = state;
  return (
    <div className={styles.stack}>
      <div className={styles.ack}>
        <p className={styles.legal}>“{FINAL_SIGNATURE_STATEMENT}”</p>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={signature.accuracyAcknowledged}
            onChange={(e) =>
              dispatch({ type: 'setSignature', patch: { accuracyAcknowledged: e.target.checked } })
            }
          />
          <span>
            I have read and accept the statement above, and confirm the information is true and
            complete.
          </span>
        </label>
      </div>
      <div className={styles.grid}>
        <SyntheticSelect
          label="How did you hear about us?"
          options={REFERRAL_SOURCES}
          value={signature.referralSourceCode}
          onChange={(v) => dispatch({ type: 'setSignature', patch: { referralSourceCode: v } })}
        />
        <TextField
          label="Signature (type your full name)"
          value={signature.signatureName}
          onChange={(v) => dispatch({ type: 'setSignature', patch: { signatureName: v } })}
          required
        />
      </div>
    </div>
  );
}
