'use client';

import { useState } from 'react';
import Link from 'next/link';

import styles from './assessment-page.module.css';

/**
 * The dedicated assessment page. The fee is advertised HERE (not on the
 * dashboard): the family sees what the CogAT assessment includes and the fee,
 * confirms the (mock) payment, then the assessment link unlocks. No real
 * processor/charge; the assessment itself is wired later by that workstream.
 */

const MOCK_FEE_USD = 75;
const ASSESSMENT_PORTAL_URL = '#'; // placeholder — real CogAT portal wired later
const UNLOCK_KEY = 'gt-synthetic-assessment-unlocked';

function readUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(UNLOCK_KEY) === 'true';
}

export function AssessmentPage({ dashboardHref }: { dashboardHref: string }) {
  const [unlocked, setUnlocked] = useState(readUnlocked);
  const [paying, setPaying] = useState(false);

  function confirmMockPayment() {
    window.sessionStorage.setItem(UNLOCK_KEY, 'true');
    setUnlocked(true);
    setPaying(false);
  }

  return (
    <div className={styles.wrap}>
      <Link className={styles.back} href={dashboardHref}>
        ← Back to portal
      </Link>

      <section className={styles.hero}>
        <p className={styles.kicker}>Assessment</p>
        <h1 className={styles.title}>CogAT assessment</h1>
        <p className={styles.lede}>
          The CogAT is the next step toward your eligibility result. Here’s what it includes and
          what it costs before you begin.
        </p>
      </section>

      <div className={styles.grid}>
        <section className={styles.detailCard}>
          <p className={styles.cardKicker}>What’s included</p>
          <ul className={styles.included}>
            <li>One scheduled CogAT assessment session</li>
            <li>Automatic routing to your eligibility result</li>
            <li>Family status updates throughout</li>
            <li>A secure testing portal opened from this page</li>
          </ul>
        </section>

        <section className={styles.feeCard}>
          <p className={styles.cardKicker}>Assessment fee</p>
          <p className={styles.feeAmount}>${MOCK_FEE_USD.toFixed(2)}</p>
          <p className={styles.feeNote}>Charged once, right before your assessment begins.</p>

          {unlocked ? (
            <>
              <a className={styles.primary} href={ASSESSMENT_PORTAL_URL}>
                Open the assessment →
              </a>
              <p className={styles.readyNote}>Your assessment access is ready.</p>
            </>
          ) : paying ? (
            <div className={styles.payRow}>
              <button type="button" className={styles.ghost} onClick={() => setPaying(false)}>
                Back
              </button>
              <button type="button" className={styles.primary} onClick={confirmMockPayment}>
                {`Confirm & pay $${MOCK_FEE_USD.toFixed(2)}`}
              </button>
            </div>
          ) : (
            <button type="button" className={styles.primary} onClick={() => setPaying(true)}>
              {`Pay $${MOCK_FEE_USD.toFixed(2)} & start assessment`}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
