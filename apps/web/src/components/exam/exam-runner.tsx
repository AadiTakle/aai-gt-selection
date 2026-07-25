'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EXAM_BANK, domainLabel } from '@/lib/exam/bank';
import {
  GRADE_BANDS,
  GRADE_BAND_LABEL,
  syntheticId,
  type GradeBand,
  type ItemResult,
  type ScoredItem,
  type ServedItem,
  type SessionScore,
  type TelemetryEvent,
} from '@/lib/exam/contract';
import { examEngine, type SessionState } from '@/lib/exam/engine';
import { ExamHost, type InboundResult } from '@/lib/exam/messaging';
import { DEFAULT_EXAM_POLICY, scoreSession } from '@/lib/exam/scoring';

import styles from './exam-runner.module.css';

/**
 * The test-taking portal — an ADAPTIVE, variable-length battery.
 *
 * Flow (BUILD_PLAN §1): pick a grade band → seed per-area difficulty →
 * engine.nextType → engine.nextItem → serve a demo in an iframe over the
 * postMessage protocol (host→demo init/start; demo→host ready/result/telemetry)
 * → NO correct/incorrect shown between items → engine.update → engine.isDone
 * loop → scorer → score + per-area profile screen → POST the full trace.
 *
 * Screening only — never an admission decision (results are validated=false).
 * The 8 legacy demos still self-render; a temporary bridge (legacy-bridge.ts)
 * translates their DOM into the protocol until they become pure renderers.
 */

const MAX_MS_PER_ITEM = 4 * 60 * 1000; // safety valve so a stuck item can't wedge the flow
const RESULTS_KEY = 'gt-exam-results';

type Phase = 'intro' | 'running' | 'saving' | 'done' | 'error';

function pct(n: number | null | undefined): string {
  return n == null ? '—' : `${Math.round(n * 100)}%`;
}

export function ExamRunner({
  studentName,
  dashboardHref,
  gradeBand: initialGradeBand,
}: {
  studentName: string;
  dashboardHref: string;
  gradeBand?: GradeBand;
}) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [gradeBand, setGradeBand] = useState<GradeBand>(initialGradeBand ?? '4-5');
  const [current, setCurrent] = useState<ServedItem | null>(null);
  const [served, setServed] = useState<ServedItem[]>([]);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [outcome, setOutcome] = useState<SessionScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const stateRef = useRef<SessionState | null>(null);
  const servedRef = useRef<ServedItem[]>([]);
  const resultsRef = useRef<ItemResult[]>([]);
  const telemetryRef = useRef<TelemetryEvent[]>([]);
  const processedRef = useRef<Set<string>>(new Set());
  const sessionRef = useRef({ sessionId: '', participantCode: '', startedAt: '' });
  const handleResultRef = useRef<(item: ServedItem, inbound: InboundResult, skipped: boolean) => void>(
    () => {},
  );

  // POST the completed trace, recompute score server-side, show the profile.
  const finalize = useCallback(
    async (servedItems: ServedItem[], itemResults: ItemResult[], telemetry: TelemetryEvent[]) => {
      setPhase('saving');
      const localOutcome = scoreSession(
        { gradeBand, results: itemResults, servedItems },
        DEFAULT_EXAM_POLICY,
      );
      const payload = {
        sessionId: sessionRef.current.sessionId,
        participantCode: sessionRef.current.participantCode,
        studentName,
        gradeBand,
        startedAt: sessionRef.current.startedAt,
        finishedAt: new Date().toISOString(),
        itemsServed: servedItems,
        results: itemResults,
        telemetry,
        score: localOutcome,
        syntheticOnly: true as const,
        validated: false as const,
      };
      try {
        const res = await fetch('/api/exam-results', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok: boolean; outcome?: SessionScore };
        if (!res.ok || !data.ok) throw new Error('SAVE_REJECTED');
        const finalOutcome = data.outcome ?? localOutcome;
        setOutcome(finalOutcome);
        try {
          window.localStorage.setItem(
            RESULTS_KEY,
            JSON.stringify({
              sessionId: payload.sessionId,
              finishedAt: payload.finishedAt,
              outcome: finalOutcome,
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
    [studentName, gradeBand],
  );

  // Serve the next engine-selected item, or finalize when the battery is done.
  const serveNext = useCallback(
    (state: SessionState) => {
      const done = examEngine.isDone(state);
      const typeCode = done ? null : examEngine.nextType(state, EXAM_BANK);
      if (!typeCode) {
        void finalize(servedRef.current, resultsRef.current, telemetryRef.current);
        return;
      }
      const item = examEngine.nextItem(state, typeCode, EXAM_BANK);
      servedRef.current = [...servedRef.current, item];
      setServed(servedRef.current);
      setCurrent(item);
    },
    [finalize],
  );

  // Record one item's result (no correctness from the client) and advance.
  const handleResult = useCallback(
    (item: ServedItem, inbound: InboundResult, skipped: boolean) => {
      if (processedRef.current.has(item.itemId)) return;
      processedRef.current.add(item.itemId);
      const state = stateRef.current;
      if (!state) return;

      const metrics = inbound.metrics ?? {};
      const perItemTelemetry = telemetryRef.current.filter((e) => e.itemId === item.itemId);
      const result: ItemResult = {
        itemId: item.itemId,
        typeCode: item.typeCode,
        domain: item.domain,
        response: inbound.response ?? { legacyAggregate: true },
        metrics,
        telemetry: perItemTelemetry,
        skipped,
      };
      resultsRef.current = [...resultsRef.current, result];
      setResults(resultsRef.current);

      // Correctness/score are derived here as a stand-in for server re-verification;
      // for legacy demos M-ACC is the aggregate pass rate for the mini-battery.
      const acc = metrics['M-ACC'];
      const score = typeof acc === 'number' && Number.isFinite(acc) ? acc : 0;
      const scored: ScoredItem = { ...result, correct: score >= 0.5, score, difficulty: item.difficulty };

      const nextState = examEngine.update(state, scored);
      stateRef.current = nextState;
      serveNext(nextState);
    },
    [serveNext],
  );

  useEffect(() => {
    handleResultRef.current = handleResult;
  }, [handleResult]);

  // Bind the postMessage channel for the current item's iframe.
  useEffect(() => {
    if (phase !== 'running' || !current) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const host = new ExamHost(iframe, {
      origin: window.location.origin,
      onReady: () => {
        host.init(current);
        host.start();
      },
      onResult: (inbound) => handleResultRef.current(current, inbound, false),
      onTelemetry: (event) => {
        telemetryRef.current.push({ ...event, itemId: current.itemId });
      },
    });

    const onLoad = () => {
      // Legacy demos don't speak the protocol yet — inject the DOM→postMessage
      // bridge (a real renderer sets window.__gtExamNativeProtocol and no-ops it).
      host.installLegacyBridge();
    };
    iframe.addEventListener('load', onLoad);
    if (iframe.contentDocument?.readyState === 'complete') host.installLegacyBridge();

    const timeout = window.setTimeout(() => {
      handleResultRef.current(current, { response: { timedOut: true }, metrics: {} }, true);
    }, MAX_MS_PER_ITEM);

    const onSkip = () =>
      handleResultRef.current(current, { response: { skipped: true }, metrics: {} }, true);
    window.addEventListener('gt-exam-skip', onSkip);

    return () => {
      host.dispose();
      iframe.removeEventListener('load', onLoad);
      window.clearTimeout(timeout);
      window.removeEventListener('gt-exam-skip', onSkip);
    };
  }, [phase, current]);

  function start() {
    const state = examEngine.startState(gradeBand);
    stateRef.current = state;
    sessionRef.current = {
      sessionId: syntheticId('SESS'),
      participantCode: syntheticId('PART'),
      startedAt: new Date().toISOString(),
    };
    servedRef.current = [];
    resultsRef.current = [];
    telemetryRef.current = [];
    processedRef.current = new Set();
    setServed([]);
    setResults([]);
    setOutcome(null);
    setError(null);
    setPhase('running');
    serveNext(state);
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
              This is a short, adaptive session across four kinds of thinking. It starts at your
              grade level, then gets harder or easier as you go — so the level always fits. There is
              no fixed number of questions; it stops once we have enough to see your strengths.
            </p>

            <p className={styles.cardKicker}>Choose your grade</p>
            <div className={styles.gradeGrid} role="group" aria-label="Grade band">
              {GRADE_BANDS.map((band) => (
                <button
                  key={band}
                  type="button"
                  className={`${styles.gradeOption} ${
                    band === gradeBand ? styles.gradeOptionActive : ''
                  }`}
                  aria-pressed={band === gradeBand}
                  onClick={() => setGradeBand(band)}
                >
                  {GRADE_BAND_LABEL[band]}
                </button>
              ))}
            </div>

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

  // ---- results (score + per-area profile) ----------------------------------
  if (phase === 'done' && outcome) {
    return (
      <div className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>Screening complete</p>
            <h1 className={styles.title}>Nice work, {studentName}.</h1>
            <p className={styles.lede}>
              Every activity is done and your session has been saved. Here’s a synthetic profile of
              what we saw across the four reasoning areas. A person reviews these signals before any
              next step.
            </p>
          </div>
        </section>

        <section className={styles.summaryCard}>
          <div className={styles.summaryTop}>
            <div>
              <p className={styles.cardKicker}>Composite proficiency</p>
              <p className={styles.bigStat}>
                {outcome.composite.toFixed(1)}
                <span className={styles.statSub}>/20</span>
              </p>
              <p className={styles.frameNote}>{outcome.compositeBracketLabel}</p>
            </div>
            <div>
              <p className={styles.cardKicker}>Activities answered</p>
              <p className={styles.bigStat}>{results.length}</p>
            </div>
            <div>
              <p className={styles.cardKicker}>Grade band</p>
              <p className={styles.bigStat} style={{ fontSize: '1.4rem' }}>
                {GRADE_BAND_LABEL[outcome.gradeBand]}
              </p>
            </div>
          </div>

          <p className={styles.cardKicker}>By reasoning area (proficiency θ /20)</p>
          <div className={styles.domainBars}>
            {outcome.perArea.map((area) => (
              <div key={area.area} className={styles.domainBar}>
                <div className={styles.domainBarHead}>
                  <span>{domainLabel(area.area)}</span>
                  <span className={styles.domainBarPct}>
                    {area.proficiency.toFixed(1)} · {area.bracketLabel} · acc {pct(area.accuracy)}
                  </span>
                </div>
                <div className={styles.track}>
                  <div
                    className={styles.fill}
                    style={{ width: `${(area.proficiency / 20) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={styles.profileGrid}>
            <div className={styles.profileItem}>
              <p className={styles.profileLabel}>Strengths</p>
              <div className={styles.chips}>
                {outcome.profile.strengths.length ? (
                  outcome.profile.strengths.map((s) => (
                    <span key={s} className={styles.chip}>
                      {domainLabel(s)}
                    </span>
                  ))
                ) : (
                  <span className={styles.chip}>Even profile</span>
                )}
              </div>
            </div>
            <div className={styles.profileItem}>
              <p className={styles.profileLabel}>Consistency</p>
              <p className={styles.profileValue}>{pct(outcome.profile.consistency)}</p>
            </div>
            <div className={styles.profileItem}>
              <p className={styles.profileLabel}>Learning rate</p>
              <p className={styles.profileValue}>{outcome.profile.learningRate.toFixed(2)}</p>
            </div>
          </div>
        </section>

        <Link className={styles.primary} href={dashboardHref}>
          Return to portal →
        </Link>
        <p className={styles.boundary}>
          Synthetic screening result (validated=false). Accuracy sets each area’s bracket; other
          metrics position the score within it. A screen indicates likely fit; it is not an
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
          <p>Scoring your session…</p>
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
          <button
            type="button"
            className={styles.primary}
            onClick={() =>
              void finalize(servedRef.current, resultsRef.current, telemetryRef.current)
            }
          >
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
  const meta = current ? EXAM_BANK.find((b) => b.typeCode === current.typeCode) : undefined;
  return (
    <div className={styles.runWrap}>
      <header className={styles.runHead}>
        <div>
          <p className={styles.kicker}>
            Question {answered + 1} · {current ? domainLabel(current.domain) : ''}
          </p>
          <p className={styles.runTitle}>{meta?.title}</p>
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
        {served.map((item, i) => (
          <span
            key={item.itemId}
            className={`${styles.seg} ${i < answered ? styles.segDone : ''} ${
              i === answered ? styles.segActive : ''
            }`}
          />
        ))}
      </div>

      {current ? (
        <iframe
          key={current.itemId}
          ref={iframeRef}
          title={`${meta?.title ?? current.typeCode} question`}
          src={current.demoPath}
          className={styles.frame}
        />
      ) : null}

      <p className={styles.frameNote}>
        {meta?.blurb} · Adaptive — the battery length adjusts to your answers. This is a synthetic
        screening activity; results are not shown between questions.
      </p>
    </div>
  );
}
