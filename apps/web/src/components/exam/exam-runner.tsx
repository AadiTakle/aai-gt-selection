'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { EXAM_DOMAINS, domainLabel, embeddedDemoBank } from '@/lib/exam/bank';
import { FixedSequencer } from '@/lib/exam/sequencer';

import { ItemPlayer } from './item-player';
import { requestExamSkip } from './player-events';
import { useExamSession } from './use-exam-session';
import styles from './exam-runner.module.css';

/**
 * The test-taking portal. It now drives the reusable session shell
 * (`useExamSession`) over the legacy iframe battery with a swappable
 * {@link FixedSequencer}, presenting each item through the generic {@link ItemPlayer}
 * and posting the whole session to /api/exam-results. Behavior is unchanged from
 * the original hard-coded runner — the sequencing structure is now a one-line
 * strategy swap, not baked into this component.
 *
 * Screening only — never an admission decision (results are validated=false).
 */

const AGE_BAND = '4-5';
const RESULTS_KEY = 'gt-exam-results';

function pct(n: number | null): string {
  return n == null ? '—' : `${Math.round(n * 100)}%`;
}

export function ExamRunner({
  studentName,
  dashboardHref,
}: {
  studentName: string;
  dashboardHref: string;
}) {
  const bank = useMemo(() => embeddedDemoBank(), []);
  // Swap this single line to change the sequencing STRUCTURE (e.g. an approved
  // adaptive/two-stage strategy) without touching the shell, player, or items.
  const sequencer = useMemo(() => new FixedSequencer(), []);

  const {
    phase,
    currentItem,
    answeredCount,
    totalPlanned,
    summary,
    error,
    start,
    handleOutcome,
    retry,
  } = useExamSession({
    bank,
    sequencer,
    studentName,
    ageBand: AGE_BAND,
    resultsStorageKey: RESULTS_KEY,
  });

  // ---- intro ---------------------------------------------------------------
  if (phase === 'intro') {
    return (
      <div className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>Adaptive screening</p>
            <h1 className={styles.title}>Ready to begin, {studentName}?</h1>
            <p className={styles.lede}>
              You’ll see {totalPlanned} short activities across four kinds of thinking. Each one
              shows you how it works first, with a practice round that doesn’t count. Questions get
              harder or easier as you go, so the level always fits. Take your time.
            </p>
            <button type="button" className={styles.primary} onClick={start}>
              Start the assessment →
            </button>
            <Link className={styles.ghost} href={dashboardHref}>
              Back to portal
            </Link>
          </div>
        </section>
        <p className={styles.boundary}>
          This is an eligibility screening only. It is not an IQ test, an enrollment offer, or an
          admission decision. Results simply help route your family to the right next step.
        </p>
      </div>
    );
  }

  // ---- results -------------------------------------------------------------
  if (phase === 'done' && summary) {
    return (
      <div className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>Screening complete</p>
            <h1 className={styles.title}>Nice work, {studentName}.</h1>
            <p className={styles.lede}>
              Every activity is done and your session has been saved. Here’s a synthetic summary of
              what we saw. A person reviews these signals before any next step.
            </p>
          </div>
        </section>

        <section className={styles.summaryCard}>
          <div className={styles.summaryTop}>
            <div>
              <p className={styles.cardKicker}>Overall accuracy</p>
              <p className={styles.bigStat}>{pct(summary.overallAccuracy)}</p>
            </div>
            <div>
              <p className={styles.cardKicker}>Activities answered</p>
              <p className={styles.bigStat}>
                {summary.itemsAnswered}
                <span className={styles.statSub}>/{totalPlanned}</span>
              </p>
            </div>
            <div>
              <p className={styles.cardKicker}>Avg. difficulty reached</p>
              <p className={styles.bigStat}>
                {summary.meanDifficultyReached == null
                  ? '—'
                  : summary.meanDifficultyReached.toFixed(1)}
                <span className={styles.statSub}>/6</span>
              </p>
            </div>
          </div>

          <p className={styles.cardKicker}>By reasoning area</p>
          <div className={styles.domainBars}>
            {EXAM_DOMAINS.map((d) => {
              const acc = summary.perDomainAccuracy[d];
              return (
                <div key={d} className={styles.domainBar}>
                  <div className={styles.domainBarHead}>
                    <span>{domainLabel(d)}</span>
                    <span className={styles.domainBarPct}>{acc == null ? '—' : pct(acc)}</span>
                  </div>
                  <div className={styles.track}>
                    <div className={styles.fill} style={{ width: `${(acc ?? 0) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <Link className={styles.primary} href={dashboardHref}>
          Return to portal →
        </Link>
        <p className={styles.boundary}>
          Synthetic screening result (validated=false). A screen indicates likely fit; it is not an
          admission decision and is not evidence of program impact.
        </p>
      </div>
    );
  }

  // ---- saving / error ------------------------------------------------------
  if (phase === 'saving') {
    return (
      <div className={styles.wrap}>
        <section className={styles.centered}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Saving your session…</p>
        </section>
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div className={styles.wrap}>
        <section className={styles.centered}>
          <h1 className={styles.title}>We hit a snag</h1>
          <p className={styles.lede}>{error}</p>
          <button type="button" className={styles.primary} onClick={retry}>
            Try saving again
          </button>
          <Link className={styles.ghost} href={dashboardHref}>
            Back to portal
          </Link>
        </section>
      </div>
    );
  }

  // ---- running -------------------------------------------------------------
  return (
    <div className={styles.runWrap}>
      <header className={styles.runHead}>
        <div>
          <p className={styles.kicker}>
            Question {answeredCount + 1} of {totalPlanned} ·{' '}
            {currentItem ? domainLabel(currentItem.domain) : ''}
          </p>
          <p className={styles.runTitle}>{currentItem?.title}</p>
        </div>
        <button type="button" className={styles.skip} onClick={() => requestExamSkip()}>
          Skip this one →
        </button>
      </header>

      <div className={styles.progress} aria-hidden="true">
        {Array.from({ length: totalPlanned }, (_, i) => (
          <span
            key={i}
            className={`${styles.seg} ${i < answeredCount ? styles.segDone : ''} ${
              i === answeredCount ? styles.segActive : ''
            }`}
          />
        ))}
      </div>

      {currentItem ? (
        <ItemPlayer item={currentItem} onComplete={handleOutcome} frameClassName={styles.frame} />
      ) : null}

      <p className={styles.frameNote}>
        {currentItem?.blurb} · Difficulty adjusts to each answer. This is a synthetic screening
        activity.
      </p>
    </div>
  );
}
