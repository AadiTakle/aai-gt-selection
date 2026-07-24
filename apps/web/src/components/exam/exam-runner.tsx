'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EXAM_BANK, EXAM_DOMAINS, domainLabel, type ExamBankItem } from '@/lib/exam/bank';
import { accuracyFrom, difficultyFrom, isDemoDone, readMetrics } from '@/lib/exam/harvest';
import type { ExamItemResult, ExamSummary } from '@/lib/exam/types';

import styles from './exam-runner.module.css';

/**
 * The test-taking portal. Sequences the 8-item battery in a same-origin iframe,
 * harvests each demo's on-screen metrics when it finishes, and posts the whole
 * session to /api/exam-results. A child sees one question at a time with a clear
 * progress header; the collected scores land server-side and in localStorage so
 * the dashboard can reflect completion.
 *
 * Screening only — never an admission decision (results are validated=false).
 */

const AGE_BAND = '4-5';
const MAX_MS_PER_ITEM = 4 * 60 * 1000; // safety valve so a stuck item can't wedge the flow
const POLL_MS = 400;
const RESULTS_KEY = 'gt-exam-results';

type Phase = 'intro' | 'running' | 'saving' | 'done' | 'error';

function randomParticipant(): string {
  // born-synthetic, PII-free participant code
  return `PART-SYN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

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
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ExamItemResult[]>([]);
  const [summary, setSummary] = useState<ExamSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sessionRef = useRef({
    sessionId: '',
    participantCode: '',
    startedAt: '',
  });
  const advancingRef = useRef(false);
  // hold the latest finalize() so recordAndAdvance can call it without a cycle
  const finalizeRef = useRef<(items: ExamItemResult[]) => void>(() => {});

  const current: ExamBankItem | undefined = EXAM_BANK[index];

  // Record one item's harvested result and move to the next (or finish).
  const recordAndAdvance = useCallback(
    (item: ExamBankItem, result: Omit<ExamItemResult, 'typeCode' | 'domain'>) => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      setResults((prev) => {
        const next = [...prev, { typeCode: item.typeCode, domain: item.domain, ...result }];
        if (next.length >= EXAM_BANK.length) {
          finalizeRef.current(next);
        } else {
          setIndex(next.length);
          advancingRef.current = false;
        }
        return next;
      });
    },
    [],
  );

  // POST the completed session, mirror to localStorage, show results.
  const finalize = useCallback(
    async (items: ExamItemResult[]) => {
      setPhase('saving');
      const payload = {
        sessionId: sessionRef.current.sessionId,
        participantCode: sessionRef.current.participantCode,
        studentName,
        ageBand: AGE_BAND,
        startedAt: sessionRef.current.startedAt,
        finishedAt: new Date().toISOString(),
        items,
        syntheticOnly: true as const,
      };
      try {
        const res = await fetch('/api/exam-results', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok: boolean; summary?: ExamSummary };
        if (!res.ok || !data.ok || !data.summary) throw new Error('SAVE_REJECTED');
        setSummary(data.summary);
        try {
          window.localStorage.setItem(
            RESULTS_KEY,
            JSON.stringify({
              sessionId: payload.sessionId,
              finishedAt: payload.finishedAt,
              summary: data.summary,
            }),
          );
        } catch {
          // localStorage best-effort only
        }
        setPhase('done');
      } catch {
        setError('We could not save your session. Your answers are safe — please try again.');
        setPhase('error');
      }
    },
    [studentName],
  );
  useEffect(() => {
    finalizeRef.current = (items) => void finalize(items);
  }, [finalize]);

  // Poll the current same-origin demo until it reports "done", then harvest.
  useEffect(() => {
    if (phase !== 'running' || !current) return;
    advancingRef.current = false;
    const startedItemAt = Date.now();
    let stopped = false;

    const finishItem = (skipped: boolean) => {
      if (stopped) return;
      stopped = true;
      const doc = iframeRef.current?.contentDocument;
      const metrics = doc ? readMetrics(doc) : {};
      recordAndAdvance(current, {
        skipped,
        metrics,
        accuracy: accuracyFrom(metrics),
        difficultyReached: difficultyFrom(metrics),
      });
    };

    const timer = window.setInterval(() => {
      const doc = iframeRef.current?.contentDocument;
      if (doc && isDemoDone(doc)) {
        window.clearInterval(timer);
        finishItem(false);
      } else if (Date.now() - startedItemAt > MAX_MS_PER_ITEM) {
        window.clearInterval(timer);
        finishItem(true); // timed out → record what we can, mark skipped
      }
    }, POLL_MS);

    // expose a manual skip via a custom event dispatched by the Skip button
    const onSkip = () => {
      window.clearInterval(timer);
      finishItem(true);
    };
    window.addEventListener('gt-exam-skip', onSkip);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('gt-exam-skip', onSkip);
    };
  }, [phase, current, recordAndAdvance]);

  function start() {
    sessionRef.current = {
      sessionId: randomParticipant().replace('PART', 'SESS'),
      participantCode: randomParticipant(),
      startedAt: new Date().toISOString(),
    };
    setResults([]);
    setIndex(0);
    setPhase('running');
  }

  // ---- intro ---------------------------------------------------------------
  if (phase === 'intro') {
    return (
      <div className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>Adaptive screening</p>
            <h1 className={styles.title}>Ready to begin, {studentName}?</h1>
            <p className={styles.lede}>
              You’ll see {EXAM_BANK.length} short activities across four kinds of thinking. Each one
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
                <span className={styles.statSub}>/{EXAM_BANK.length}</span>
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
          <button type="button" className={styles.primary} onClick={() => void finalize(results)}>
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
  const answered = results.length;
  return (
    <div className={styles.runWrap}>
      <header className={styles.runHead}>
        <div>
          <p className={styles.kicker}>
            Question {answered + 1} of {EXAM_BANK.length} ·{' '}
            {current ? domainLabel(current.domain) : ''}
          </p>
          <p className={styles.runTitle}>{current?.title}</p>
        </div>
        <button
          type="button"
          className={styles.skip}
          onClick={() => window.dispatchEvent(new Event('gt-exam-skip'))}
        >
          Skip this one →
        </button>
      </header>

      <div className={styles.progress} aria-hidden="true">
        {EXAM_BANK.map((item, i) => (
          <span
            key={item.typeCode}
            className={`${styles.seg} ${i < answered ? styles.segDone : ''} ${
              i === answered ? styles.segActive : ''
            }`}
          />
        ))}
      </div>

      {current ? (
        <iframe
          key={current.typeCode}
          ref={iframeRef}
          title={`${current.title} question`}
          src={current.demoPath}
          className={styles.frame}
        />
      ) : null}

      <p className={styles.frameNote}>
        {current?.blurb} · Difficulty adjusts to each answer. This is a synthetic screening
        activity.
      </p>
    </div>
  );
}
