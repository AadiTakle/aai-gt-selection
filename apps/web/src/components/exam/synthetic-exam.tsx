'use client';

import { useMemo } from 'react';

import { EXAM_DOMAINS, domainLabel } from '@/lib/exam/bank';
import { syntheticSampleBank } from '@/lib/exam/sample-items';
import { FixedSequencer } from '@/lib/exam/sequencer';

import { ItemPlayer } from './item-player';
import { useExamSession } from './use-exam-session';
import shell from './exam-runner.module.css';
import styles from './synthetic-exam.module.css';

/**
 * Minimal, clickable, born-SYNTHETIC stakeholder demo of the session shell.
 *
 * It runs the same {@link useExamSession} shell + {@link ItemPlayer} used by the
 * family portal, but over a native single-select sample bank across all four
 * domains (see `sample-items.ts`) with the default {@link FixedSequencer}. It
 * proves: any item type renders through one player; the shell is structure-
 * agnostic; and swapping the sequencer is a one-line change. Everything here is
 * synthetic and validated=false — a screening prototype, not a real assessment.
 */

function pct(n: number | null): string {
  return n == null ? '—' : `${Math.round(n * 100)}%`;
}

function meanResponseMs(times: (number | null | undefined)[]): number | null {
  const xs = times.filter((t): t is number => typeof t === 'number');
  return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}

export function SyntheticExam() {
  const bank = useMemo(() => syntheticSampleBank(), []);
  // One-line strategy swap point: replace FixedSequencer with an approved
  // adaptive/two-stage strategy implementing the same Sequencer interface.
  const sequencer = useMemo(() => new FixedSequencer(), []);

  const {
    phase,
    currentItem,
    answeredCount,
    totalPlanned,
    results,
    summary,
    error,
    start,
    handleOutcome,
    retry,
  } = useExamSession({ bank, sequencer, studentName: 'Demo Learner', ageBand: '6-8' });

  // ---- intro ---------------------------------------------------------------
  if (phase === 'intro') {
    return (
      <div className={shell.wrap}>
        <section className={shell.hero}>
          <div className={shell.heroText}>
            <span className={styles.badge}>Synthetic · validated=false</span>
            <p className={shell.kicker}>Session shell demo</p>
            <h1 className={shell.title}>Custom cognitive screener — runnable prototype</h1>
            <p className={shell.lede}>
              {totalPlanned} self-contained sample items across four reasoning domains, presented by
              a pluggable session shell with the default fixed, domain-balanced sequencer. Each item
              captures your response, per-item response time, and telemetry, then scores server-side
              into a summary. No real data is used.
            </p>
            <button type="button" className={shell.primary} onClick={start}>
              Start the demo →
            </button>
          </div>
        </section>
        <p className={shell.boundary}>
          Born-synthetic prototype (D-006, R9). Items are hand-authored placeholders that reference
          the question-type catalog; they are not calibrated, not validated, and never an admission
          or ability decision. The sequencing structure is intentionally swappable and unapproved.
        </p>
      </div>
    );
  }

  // ---- results -------------------------------------------------------------
  if (phase === 'done' && summary) {
    const meanRt = meanResponseMs(results.map((r) => r.responseTimeMs));
    return (
      <div className={shell.wrap}>
        <section className={shell.hero}>
          <div className={shell.heroText}>
            <span className={styles.badge}>Synthetic · validated=false</span>
            <p className={shell.kicker}>Session complete</p>
            <h1 className={shell.title}>Scored summary</h1>
            <p className={shell.lede}>
              The full session ran end-to-end through the shell with the FixedSequencer and was
              scored server-side. Below is the synthetic summary plus the per-item response and
              timing the player captured.
            </p>
          </div>
        </section>

        <section className={shell.summaryCard}>
          <div className={shell.summaryTop}>
            <div>
              <p className={shell.cardKicker}>Overall accuracy</p>
              <p className={shell.bigStat}>{pct(summary.overallAccuracy)}</p>
            </div>
            <div>
              <p className={shell.cardKicker}>Items answered</p>
              <p className={shell.bigStat}>
                {summary.itemsAnswered}
                <span className={shell.statSub}>/{totalPlanned}</span>
              </p>
            </div>
            <div>
              <p className={shell.cardKicker}>Avg. response time</p>
              <p className={shell.bigStat}>
                {meanRt == null ? '—' : (meanRt / 1000).toFixed(1)}
                <span className={shell.statSub}>s</span>
              </p>
            </div>
          </div>

          <p className={shell.cardKicker}>By reasoning area</p>
          <div className={shell.domainBars}>
            {EXAM_DOMAINS.map((d) => {
              const acc = summary.perDomainAccuracy[d];
              return (
                <div key={d} className={shell.domainBar}>
                  <div className={shell.domainBarHead}>
                    <span>{domainLabel(d)}</span>
                    <span className={shell.domainBarPct}>{acc == null ? '—' : pct(acc)}</span>
                  </div>
                  <div className={shell.track}>
                    <div className={shell.fill} style={{ width: `${(acc ?? 0) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={shell.summaryCard}>
          <p className={shell.cardKicker}>Per-item capture</p>
          <table className={styles.results}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Domain</th>
                <th>Result</th>
                <th>Response time</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const mark = r.skipped
                  ? { text: 'Skipped', cls: styles.skippedRow }
                  : r.accuracy === 1
                    ? { text: '✓ Correct', cls: styles.correct }
                    : r.accuracy === 0
                      ? { text: '✗ Incorrect', cls: styles.incorrect }
                      : { text: '—', cls: styles.mono };
                return (
                  <tr key={`${r.typeCode}-${i}`}>
                    <td className={styles.mono}>{r.typeCode}</td>
                    <td>{domainLabel(r.domain)}</td>
                    <td className={`${styles.mark} ${mark.cls}`}>{mark.text}</td>
                    <td className={styles.mono}>
                      {r.responseTimeMs == null ? '—' : `${(r.responseTimeMs / 1000).toFixed(1)} s`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <button type="button" className={shell.primary} onClick={start}>
          Run the demo again →
        </button>
        <p className={shell.boundary}>
          Synthetic result (validated=false). Accuracy here reflects hand-authored placeholder keys,
          not a calibrated screen; it is not evidence of ability or program impact.
        </p>
      </div>
    );
  }

  // ---- saving / error ------------------------------------------------------
  if (phase === 'saving') {
    return (
      <div className={shell.wrap}>
        <section className={shell.centered}>
          <div className={shell.spinner} aria-hidden="true" />
          <p>Scoring your session…</p>
        </section>
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div className={shell.wrap}>
        <section className={shell.centered}>
          <h1 className={shell.title}>Heads up</h1>
          <p className={shell.lede}>{error}</p>
          {summary ? (
            <p className={shell.lede}>Overall accuracy (local): {pct(summary.overallAccuracy)}</p>
          ) : null}
          <button type="button" className={shell.primary} onClick={retry}>
            Try scoring again
          </button>
        </section>
      </div>
    );
  }

  // ---- running -------------------------------------------------------------
  return (
    <div className={shell.runWrap}>
      <header className={shell.runHead}>
        <div>
          <p className={shell.kicker}>
            Item {answeredCount + 1} of {totalPlanned} ·{' '}
            {currentItem ? domainLabel(currentItem.domain) : ''}
          </p>
          <p className={shell.runTitle}>{currentItem?.title}</p>
        </div>
        <span className={styles.badge}>Synthetic</span>
      </header>

      <div className={shell.progress} aria-hidden="true">
        {Array.from({ length: totalPlanned }, (_, i) => (
          <span
            key={i}
            className={`${shell.seg} ${i < answeredCount ? shell.segDone : ''} ${
              i === answeredCount ? shell.segActive : ''
            }`}
          />
        ))}
      </div>

      {currentItem ? <ItemPlayer item={currentItem} onComplete={handleOutcome} /> : null}

      <p className={shell.frameNote}>
        {currentItem?.blurb} · Synthetic sample item · scored server-side.
      </p>
    </div>
  );
}
