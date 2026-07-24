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
const UNLOCK_KEY = 'gt-synthetic-assessment-unlocked';

/** The four reasoning domains the adaptive assessment measures. */
const DOMAINS = [
  {
    name: 'Fluid reasoning',
    detail: 'Spotting patterns and solving new problems without prior knowledge.',
  },
  {
    name: 'Verbal reasoning',
    detail: 'Understanding language, relationships between words, and meaning.',
  },
  {
    name: 'Quantitative reasoning',
    detail: 'Working with numbers, sequences, and mathematical relationships.',
  },
  {
    name: 'Spatial reasoning',
    detail: 'Picturing and mentally rotating shapes and figures in space.',
  },
] as const;

function readUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(UNLOCK_KEY) === 'true';
}

export function AssessmentPage({
  dashboardHref,
  examHref,
}: {
  dashboardHref: string;
  examHref: string;
}) {
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
        <div className={styles.heroText}>
          <p className={styles.kicker}>Assessment</p>
          <h1 className={styles.title}>CogAT assessment</h1>
          <p className={styles.lede}>
            A short, adaptive reasoning session, and the next step toward your eligibility result.
            Here’s what it measures, what to expect, and what it costs before you begin.
          </p>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.detailCard}>
          <p className={styles.cardKicker}>At a glance</p>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Length</dt>
              <dd className={styles.factValue}>About 10 minutes, in one sitting</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Format</dt>
              <dd className={styles.factValue}>
                Adaptive. Questions get harder or easier with each answer, so the level always fits
              </dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Preparation</dt>
              <dd className={styles.factValue}>
                None needed. It measures reasoning, not memorized facts
              </dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Included</dt>
              <dd className={styles.factValue}>
                One session, a secure testing portal, live status updates, and automatic routing to
                your eligibility result
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.feeCard}>
          <p className={styles.cardKicker}>Assessment fee</p>
          <p className={styles.feeAmount}>${MOCK_FEE_USD.toFixed(2)}</p>
          <p className={styles.feeNote}>Charged once, right before your assessment begins.</p>

          {unlocked ? (
            <>
              <Link className={styles.primary} href={examHref}>
                Open the assessment →
              </Link>
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

      <section className={styles.measures}>
        <p className={styles.cardKicker}>What it measures</p>
        <p className={styles.sectionLede}>
          Four kinds of reasoning, scored independently so strengths in any area come through.
        </p>
        <div className={styles.domainGrid}>
          {DOMAINS.map((d, i) => (
            <div key={d.name} className={styles.domain}>
              <span className={styles.domainNum}>{String(i + 1).padStart(2, '0')}</span>
              <p className={styles.domainName}>{d.name}</p>
              <p className={styles.domainDetail}>{d.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <p className={styles.boundary}>
        This is an eligibility screening only, not an IQ test, an enrollment offer, or an admission
        decision. Results help route your family to the right next step.
      </p>
    </div>
  );
}
