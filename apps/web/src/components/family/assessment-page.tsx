'use client';

import Link from 'next/link';

import { EXAM_FEE_USD, EXAM_NAME } from '@/lib/exam/branding';

import styles from './assessment-page.module.css';

/**
 * The dedicated assessment step of the family journey. The CogAT step is
 * replaced by the born-synthetic {EXAM_NAME} adaptive screener (D-016, R11):
 * the family sees what {EXAM_NAME} includes and the fee, then launches the
 * self-contained {EXAM_NAME} flow (payment -> adaptive battery -> result).
 * Prototype/illustrative only — never a validated determination (R10).
 */

const ASCEND_FLOW_URL = '/ascend';

export function AssessmentPage({ dashboardHref }: { dashboardHref: string }) {
  return (
    <div className={styles.wrap}>
      <Link className={styles.back} href={dashboardHref}>
        ← Back to portal
      </Link>

      <section className={styles.hero}>
        <p className={styles.kicker}>Assessment</p>
        <h1 className={styles.title}>{EXAM_NAME} assessment</h1>
        <p className={styles.lede}>
          {EXAM_NAME} is the next step toward your eligibility result — a short, adaptive reasoning
          session that adjusts to your child. Here’s what it includes and what it costs before you
          begin.
        </p>
      </section>

      <div className={styles.grid}>
        <section className={styles.detailCard}>
          <p className={styles.cardKicker}>What’s included</p>
          <ul className={styles.included}>
            <li>One adaptive {EXAM_NAME} session across four reasoning domains</li>
            <li>Difficulty that adapts to each answer in real time</li>
            <li>Automatic routing to your eligibility result</li>
            <li>Family status updates throughout</li>
          </ul>
        </section>

        <section className={styles.feeCard}>
          <p className={styles.cardKicker}>Assessment fee</p>
          <p className={styles.feeAmount}>${EXAM_FEE_USD.toFixed(2)}</p>
          <p className={styles.feeNote}>Charged once, right before your assessment begins.</p>

          <Link className={styles.primary} href={ASCEND_FLOW_URL}>
            Start the {EXAM_NAME} Assessment →
          </Link>
          <p className={styles.readyNote}>
            Prototype — synthetic demo, not a validated determination.
          </p>
        </section>
      </div>
    </div>
  );
}
