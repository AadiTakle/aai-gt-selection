'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  isDone,
  nextItem,
  nextType,
  startState,
  update,
  type Area,
  type Banks,
  type ScoredItem as EngineScoredItem,
  type ServedItem,
  type SessionState,
} from '@gt-selection/exam-engine';
import {
  DEFAULT_EXAM_POLICY,
  scoreExam,
  type ExamScore,
  type ScoredItem as ScoringScoredItem,
} from '@gt-selection/exam-scoring';

import { EXAM_BANK_BY_CODE, EXAM_DOMAINS, domainLabel } from '@/lib/exam/bank';
import {
  EXAM_ENGINE_OVERRIDES,
  NATIVE_PROTOCOL_TYPES,
  bandForTheta,
  buildBanks,
  demoPathFor,
  fetchServedItem,
  fetchServedPool,
  numericMetrics,
  openExamSession,
  submitAnswer,
} from '@/lib/exam/adaptive';
import { GRADE_BANDS, GRADE_BAND_LABEL, syntheticId, type GradeBand } from '@/lib/exam/contract';
import { ExamHost, type InboundResult } from '@/lib/exam/messaging';

import styles from './exam-runner.module.css';

/**
 * The test-taking portal — an ADAPTIVE, variable-length battery on the REAL
 * engine + scorer (BUILD_PLAN §1).
 *
 * Flow: pick a grade band → `startState` → fetch the served bank (no keys) →
 * loop(`nextType` → `nextItem` → render the demo in an iframe over the
 * postMessage protocol → collect the child's raw ItemResult → POST it to
 * `/api/exam-submit` for SERVER correctness → `update` → `isDone`) → `scoreExam`
 * → score + per-area profile screen → POST the full trace to `/api/exam-results`.
 *
 * No correct/incorrect is shown between items. Answer keys live server-side;
 * results are a screening signal only (`validated=false`), never an admission
 * decision.
 */

const MAX_MS_PER_ITEM = 4 * 60 * 1000; // safety valve so a stuck item can't wedge the flow
const READY_FALLBACK_MS = 500; // how long to wait for a demo's `ready` before initing anyway
const RESULTS_KEY = 'gt-exam-results';

type Phase = 'intro' | 'running' | 'saving' | 'done' | 'error';

/** Per-item trace row: the raw result + the server-authoritative verdict. */
interface TraceScoredItem {
  itemId: string;
  typeCode: string;
  domain: Area;
  response: unknown;
  metrics: Record<string, number>;
  telemetry: Record<string, unknown>[];
  correct: boolean;
  score: number;
  difficulty: number;
  skipped: boolean;
}

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
  const [scoredCount, setScoredCount] = useState(0);
  const [outcome, setOutcome] = useState<ExamScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const stateRef = useRef<SessionState | null>(null);
  const banksRef = useRef<Banks | null>(null);
  const servedRef = useRef<ServedItem[]>([]);
  const scoredRef = useRef<TraceScoredItem[]>([]);
  const telemetryRef = useRef<Record<string, unknown>[]>([]);
  const processedRef = useRef<Set<string>>(new Set());
  const sessionRef = useRef<{
    sessionId: string;
    participantCode: string;
    startedAt: string;
    /** Supabase `app.exam_session.session_id`; null when running unpersisted. */
    examSessionId: string | null;
  }>({ sessionId: '', participantCode: '', startedAt: '', examSessionId: null });
  const handleResultRef = useRef<
    (item: ServedItem, inbound: InboundResult, skipped: boolean) => void
  >(() => {});

  // POST the completed trace; the server recomputes the score authoritatively.
  const finalize = useCallback(async () => {
    setPhase('saving');
    const scored = scoredRef.current;
    const localOutcome = scoreExam(scored as unknown as ScoringScoredItem[], DEFAULT_EXAM_POLICY);
    const payload = {
      sessionId: sessionRef.current.sessionId,
      ...(sessionRef.current.examSessionId
        ? { examSessionId: sessionRef.current.examSessionId }
        : {}),
      participantCode: sessionRef.current.participantCode,
      studentName,
      gradeBand,
      startedAt: sessionRef.current.startedAt,
      finishedAt: new Date().toISOString(),
      itemsServed: servedRef.current,
      scoredItems: scored,
      telemetry: telemetryRef.current,
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
      const data = (await res.json()) as { ok: boolean; outcome?: ExamScore };
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
  }, [studentName, gradeBand]);

  // Serve the next engine-selected item, or finalize when the battery is done.
  // The engine selects over the key-free, content-free index; the chosen item's
  // stimulus is fetched just before it is rendered.
  const serveNext = useCallback(
    (state: SessionState) => {
      const banks = banksRef.current;
      if (!banks) {
        void finalize();
        return;
      }
      let selected: ServedItem;
      try {
        const typeCode = nextType(state, banks);
        if (!typeCode) {
          void finalize();
          return;
        }
        selected = nextItem(state, typeCode, banks);
      } catch {
        // Pool exhausted for the selected type — conclude with what we have.
        void finalize();
        return;
      }

      void (async () => {
        let item = selected;
        try {
          item = await fetchServedItem(selected.itemId);
        } catch {
          // Fall back to the index entry; the demo will show an empty stimulus
          // and the item can still be skipped rather than wedging the battery.
        }
        servedRef.current = [...servedRef.current, item];
        setServed(servedRef.current);
        setCurrent(item);
      })();
    },
    [finalize],
  );

  // Record one item's result: server-verify correctness, then advance the engine.
  const handleResult = useCallback(
    async (item: ServedItem, inbound: InboundResult, skipped: boolean) => {
      if (processedRef.current.has(item.itemId)) return;
      processedRef.current.add(item.itemId);
      const state = stateRef.current;
      if (!state) return;

      const clientMetrics = numericMetrics(inbound.metrics);
      // A skip/timeout still contributes coverage so the battery can conclude.
      if (skipped) {
        clientMetrics['M-RT'] = MAX_MS_PER_ITEM;
        clientMetrics['M-RTFIRST'] = MAX_MS_PER_ITEM;
        clientMetrics['M-REV'] = 0;
      }

      // Collected before the round trip so the same events are both persisted
      // with the response and kept on the in-memory trace.
      const perItemTelemetry = telemetryRef.current.filter((e) => e['itemId'] === item.itemId);

      const verdict = await submitAnswer({
        itemId: item.itemId,
        response: inbound.response,
        skipped,
        examSessionId: sessionRef.current.examSessionId,
        clientMetrics,
        telemetry: perItemTelemetry,
      });
      const serverMetrics = verdict?.metrics ?? { 'M-ACC': 0, 'M-ERRTYPE': 0 };
      const correct = verdict?.correct ?? false;
      const score = verdict?.score ?? 0;
      const difficulty = verdict?.difficulty ?? item.difficulty;

      const scored: TraceScoredItem = {
        itemId: item.itemId,
        typeCode: item.typeCode,
        domain: item.domain,
        response: inbound.response ?? null,
        metrics: { ...clientMetrics, ...serverMetrics },
        telemetry: perItemTelemetry,
        correct,
        score,
        difficulty,
        skipped,
      };
      scoredRef.current = [...scoredRef.current, scored];
      setScoredCount(scoredRef.current.length);

      const nextState = update(state, scored as unknown as EngineScoredItem);
      stateRef.current = nextState;

      if (isDone(nextState)) void finalize();
      else serveNext(nextState);
    },
    [serveNext, finalize],
  );

  useEffect(() => {
    handleResultRef.current = (item, inbound, skipped) => {
      void handleResult(item, inbound, skipped);
    };
  }, [handleResult]);

  // Bind the postMessage channel for the current item's iframe.
  useEffect(() => {
    if (phase !== 'running' || !current) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const item = current;
    let initiated = false;
    let readySeen = false;
    let readyFallback: number | undefined;

    const host = new ExamHost(iframe, {
      origin: window.location.origin,
      onReady: () => {
        readySeen = true;
        if (readyFallback !== undefined) window.clearTimeout(readyFallback);
        sendInit();
      },
      onResult: (inbound) => handleResultRef.current(item, inbound, false),
      onTelemetry: (event) => {
        telemetryRef.current.push({ ...event, itemId: item.itemId });
      },
    });

    function sendInit() {
      if (initiated) return;
      initiated = true;
      host.init(item);
      host.start();
    }

    const onLoad = () => {
      // Refactored demos speak the protocol natively; only bridge a legacy demo.
      if (!NATIVE_PROTOCOL_TYPES.has(item.typeCode)) host.installLegacyBridge();
      // `load` fires when the document is parsed, which can precede the demo
      // installing its own `message` listener — an init sent then is dropped and
      // the demo waits forever. `ready` is the demo's signal that it is
      // listening, so prefer it and only fall back for a demo that never sends
      // one (the legacy self-rendering set).
      if (readyFallback === undefined) {
        readyFallback = window.setTimeout(() => {
          if (!readySeen) sendInit();
        }, READY_FALLBACK_MS);
      }
    };
    iframe.addEventListener('load', onLoad);
    if (iframe.contentDocument?.readyState === 'complete') onLoad();

    const timeout = window.setTimeout(() => {
      handleResultRef.current(item, { response: { timedOut: true } }, true);
    }, MAX_MS_PER_ITEM);

    const onSkip = () => handleResultRef.current(item, { response: { skipped: true } }, true);
    window.addEventListener('gt-exam-skip', onSkip);

    return () => {
      host.dispose();
      iframe.removeEventListener('load', onLoad);
      window.clearTimeout(timeout);
      if (readyFallback !== undefined) window.clearTimeout(readyFallback);
      window.removeEventListener('gt-exam-skip', onSkip);
    };
  }, [phase, current]);

  const start = useCallback(async () => {
    setError(null);
    setOutcome(null);
    setCurrent(null);
    servedRef.current = [];
    scoredRef.current = [];
    telemetryRef.current = [];
    processedRef.current = new Set();
    setServed([]);
    setScoredCount(0);
    setPhase('running');
    try {
      const pool = await fetchServedPool();
      if (pool.length === 0) throw new Error('EMPTY_BANK');
      banksRef.current = buildBanks(pool);
      const state = startState(gradeBand, EXAM_ENGINE_OVERRIDES);
      stateRef.current = state;
      const participantCode = syntheticId('PART');
      sessionRef.current = {
        sessionId: syntheticId('SESS'),
        participantCode,
        startedAt: new Date().toISOString(),
        examSessionId: null,
      };
      // Best-effort: a null id simply means this battery is not traced to the
      // database. It must never stop the child from starting.
      sessionRef.current.examSessionId = await openExamSession(participantCode, gradeBand);
      serveNext(state);
    } catch {
      setError('We could not load the activities. Please try again.');
      setPhase('error');
    }
  }, [gradeBand, serveNext]);

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

            <button type="button" className={styles.primary} onClick={() => void start()}>
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
    const areaScores = EXAM_DOMAINS.map((area) => outcome.perArea[area]).filter(
      (a): a is NonNullable<typeof a> => a != null,
    );
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
              <p className={styles.frameNote}>{bandForTheta(outcome.composite)}</p>
            </div>
            <div>
              <p className={styles.cardKicker}>Activities answered</p>
              <p className={styles.bigStat}>{scoredCount}</p>
            </div>
            <div>
              <p className={styles.cardKicker}>Grade band</p>
              <p className={styles.bigStat} style={{ fontSize: '1.4rem' }}>
                {GRADE_BAND_LABEL[gradeBand]}
              </p>
            </div>
          </div>

          <p className={styles.cardKicker}>By reasoning area (proficiency θ /20)</p>
          <div className={styles.domainBars}>
            {areaScores.map((area) => (
              <div key={area.area} className={styles.domainBar}>
                <div className={styles.domainBarHead}>
                  <span>{domainLabel(area.area)}</span>
                  <span className={styles.domainBarPct}>
                    {area.proficiency.toFixed(1)} · {bandForTheta(area.proficiency)} · acc{' '}
                    {pct(area.accuracy)}
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
              <p className={styles.profileValue}>
                {outcome.profile.consistency.label}
                {outcome.profile.consistency.normalized != null
                  ? ` · ${pct(outcome.profile.consistency.normalized)}`
                  : ''}
              </p>
            </div>
            <div className={styles.profileItem}>
              <p className={styles.profileLabel}>Learning rate</p>
              <p className={styles.profileValue}>
                {outcome.profile.learningRate.label}
                {outcome.profile.learningRate.normalized != null
                  ? ` · ${pct(outcome.profile.learningRate.normalized)}`
                  : ''}
              </p>
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
          <button type="button" className={styles.primary} onClick={() => void finalize()}>
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
  const meta = current ? EXAM_BANK_BY_CODE.get(current.typeCode) : undefined;
  if (!current) {
    return (
      <div className={styles.wrap}>
        <section className={styles.centered}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Preparing your first activity…</p>
        </section>
      </div>
    );
  }
  return (
    <div className={styles.runWrap}>
      <header className={styles.runHead}>
        <div>
          <p className={styles.kicker}>
            Question {scoredCount + 1} · {domainLabel(current.domain)}
          </p>
          <p className={styles.runTitle}>{meta?.title ?? current.typeCode}</p>
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
            className={`${styles.seg} ${i < scoredCount ? styles.segDone : ''} ${
              i === scoredCount ? styles.segActive : ''
            }`}
          />
        ))}
      </div>

      <iframe
        key={current.itemId}
        ref={iframeRef}
        title={`${meta?.title ?? current.typeCode} question`}
        src={demoPathFor(current.typeCode)}
        className={styles.frame}
      />

      <p className={styles.frameNote}>
        {meta?.blurb} · Adaptive — the battery length adjusts to your answers. This is a synthetic
        screening activity; results are not shown between questions.
      </p>
    </div>
  );
}
