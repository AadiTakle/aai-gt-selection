'use client';

import { fromSyntheticName } from '@/lib/family/synthetic';
import {
  GENDERS,
  GRADES,
  labelForCode,
  LANGUAGES,
  REGIONS,
  RELATIONSHIPS,
} from '@/lib/family/vocab';
import type { WizardState } from '@/lib/family/wizard-types';

import styles from './locked-review.module.css';

/**
 * Read-only "locked answers" view shown once the application is submitted. The
 * family can look back over everything they shared; "Make edits" unlocks the
 * editable wizard again.
 */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value || '—'}</span>
    </div>
  );
}

export function LockedReview({
  state,
  onEdit,
  dashboardHref,
}: {
  state: WizardState;
  onEdit: () => void;
  dashboardHref: string;
}) {
  const { student, household, school, applicationCore, financial } = state;
  const addr = household.address;
  const income = financial.annualHouseholdIncomeDollars
    ? `$${Number(financial.annualHouseholdIncomeDollars).toLocaleString()}`
    : '';

  return (
    <div className={styles.wrap}>
      <a className={styles.back} href={dashboardHref}>
        ← Back to portal
      </a>
      <header className={styles.head}>
        <div>
          <p className={styles.kicker}>Submitted</p>
          <h1 className={styles.title}>Your application</h1>
          <p className={styles.intro}>
            These answers are locked in. Look them over anytime, and use “Make edits” if something
            needs to change.
          </p>
        </div>
        <button type="button" className={styles.editBtn} onClick={onEdit}>
          Make edits
        </button>
      </header>

      <section className={styles.card}>
        <div className={styles.lockBar}>Student information</div>
        <Row label="Student's name" value={fromSyntheticName(student.name)} />
        <Row label="Date of birth" value={student.dateOfBirth} />
        <Row label="Gender" value={labelForCode(GENDERS, student.genderCode)} />
      </section>

      <section className={styles.card}>
        <div className={styles.lockBar}>Educational background</div>
        <Row label="Current school" value={school.name} />
        <Row label="Current grade" value={labelForCode(GRADES, applicationCore.currentGradeCode)} />
        <Row
          label="Requested entry"
          value={`${labelForCode(GRADES, applicationCore.requestedGradeCode)}${
            applicationCore.requestedEntryYear
              ? ` · Fall ${applicationCore.requestedEntryYear}`
              : ''
          }`}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.lockBar}>Family &amp; language</div>
        <Row label="Parent / guardian" value={household.guardianName} />
        <Row
          label="Relationship"
          value={labelForCode(RELATIONSHIPS, household.guardianRelationshipCode)}
        />
        <Row
          label="Address"
          value={[addr.street1, addr.city, labelForCode(REGIONS, addr.stateCode), addr.zip]
            .filter(Boolean)
            .join(', ')}
        />
        <Row
          label="Home language"
          value={labelForCode(LANGUAGES, household.language.homeLanguageCode)}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.lockBar}>Financial intake</div>
        <Row label="Household income" value={income} />
        <Row
          label="People in household"
          value={financial.householdMemberCount ? String(financial.householdMemberCount) : ''}
        />
        <p className={styles.privateNote}>Private · never used for eligibility.</p>
      </section>

      <p className={styles.boundary}>
        This is an eligibility application only, not an enrollment or admission decision.
      </p>
    </div>
  );
}
