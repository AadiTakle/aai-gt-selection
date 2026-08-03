'use client';

import Link from 'next/link';

import styles from './assessment-gate.module.css';

/**
 * Dashboard entry point to the baseline.
 *
 * There is no fee to advertise any more (pivot, 2026-08-03 — see
 * `docs/product/COGAT_PREP_PIVOT.md` §7.1), so this card's job changed: it used
 * to defer to the assessment page because that is where the price lived, and now
 * it is simply the way in. `enabled` is retained because a not-yet-ready state
 * still exists — a child profile is needed before a baseline can be scored — but
 * it no longer means "has paid".
 *
 * `taken` distinguishes the first sitting from a retake, which matters more here
 * than it looks: the retake IS the product's measurement (§5), so inviting one is
 * a feature rather than an afterthought.
 */
export function AssessmentGate({
  enabled,
  assessmentHref,
  taken = false,
}: {
  enabled: boolean;
  assessmentHref: string;
  taken?: boolean;
}) {
  if (!enabled) {
    return (
      <div className={styles.card}>
        <p className={styles.kicker}>First step</p>
        <p className={styles.title}>See where you place</p>
        <p className={styles.note}>
          This opens once you’ve added your child’s details, so results can be matched to their
          grade.
        </p>
        <div className={styles.lockedBtn} aria-disabled="true">
          Add your child’s details first
        </div>
      </div>
    );
  }

  if (taken) {
    return (
      <div className={`${styles.card} ${styles.cardInvite}`}>
        <p className={styles.kicker}>When you’re ready</p>
        <p className={styles.title}>Take the baseline again</p>
        <p className={styles.note}>
          Retaking it after some practice is how you see what has actually moved. Same three areas,
          so the two are comparable.
        </p>
        <Link className={styles.primary} href={assessmentHref}>
          Retake the baseline →
        </Link>
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.cardInvite}`}>
      <p className={styles.kicker}>Start here</p>
      <p className={styles.title}>See where you place</p>
      <p className={styles.note}>
        A short session that finds your child’s level in each area and points at what to practice
        first. Free, and under 40 minutes.
      </p>
      <Link className={styles.primary} href={assessmentHref}>
        Start the baseline →
      </Link>
    </div>
  );
}
