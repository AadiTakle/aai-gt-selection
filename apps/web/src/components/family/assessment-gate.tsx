'use client';

import Link from 'next/link';

import { EXAM_NAME } from '@/lib/exam/branding';
import styles from './assessment-gate.module.css';

/**
 * Dashboard entry point to the assessment. The fee is NOT shown here — it is
 * advertised on the dedicated assessment page (`/family/assessment`), which the
 * family reaches by clicking through. This keeps the dashboard focused on status
 * and makes the fee obvious in context, right before starting.
 */
export function AssessmentGate({
  enabled,
  assessmentHref,
}: {
  enabled: boolean;
  assessmentHref: string;
}) {
  if (!enabled) {
    return (
      <div className={styles.card}>
        <p className={styles.kicker}>Next step</p>
        <p className={styles.title}>{EXAM_NAME} assessment</p>
        <p className={styles.note}>
          This opens as soon as your application is submitted. It is the required next step.
        </p>
        <div className={styles.lockedBtn} aria-disabled="true">
          Submit your application first
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.cardInvite}`}>
      <p className={styles.kicker}>Your next step</p>
      <p className={styles.title}>Take the {EXAM_NAME} assessment</p>
      <p className={styles.note}>
        This is the next step toward your eligibility result. Review the details and begin when
        you’re ready.
      </p>
      <Link className={styles.primary} href={assessmentHref}>
        Continue to the assessment →
      </Link>
    </div>
  );
}
