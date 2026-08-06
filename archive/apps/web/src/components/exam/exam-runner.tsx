'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  isDone,
  nextItem,
  planNextSelection,
  startState,
  update,
  AREAS,
  type Area,
  type Banks,
  type BurstPlan,
  type EngineConfig,
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
  examEngineOverrides,
  GESTURE_DEMO_TYPES,
  debugModeServerSnapshot,
  debugModeSnapshot,
  emulateAnswer,
  NATIVE_PROTOCOL_TYPES,
  bandForTheta,
  buildBanks,
  demoPathFor,
  fetchServedItem,
  fetchServedPool,
  numericMetrics,
  openExamSession,
  submitAnswer,
  subscribeToDebugMode,
} from '@/lib/exam/adaptive';
import { GRADE_BANDS, GRADE_BAND_LABEL, syntheticId, type GradeBand } from '@/lib/exam/contract';
import { buildDebugView, type DebugTraceItem } from '@/lib/exam/debug-view';
import { stage1Progress, stage2Progress } from '@/lib/exam/progress';
import { ExamHost, type InboundResult } from '@/lib/exam/messaging';
import {
  LEARNING_BLOCK_AREA,
  LEARNING_BLOCK_LENGTH,
  availableBlocks,
  blockGuessingFloor,
  blockPool,
  phase1Pool,
  clearLearningBlockHandoff,
  learningBlockHandoffServerSnapshot,
  learningBlockHandoffSnapshot,
  nextBlockItem,
  nextBlockTarget,
  saveLearningBlockHandoff,
  subscribeToLearningBlockHandoff,
  summariseLearningBlock,
  summariseStage2,
  toLearningTrials,
  type CompletedBlock,
  type LearningBlockSpec,
  type Stage2Readout,
  type LearningBlockHandoff,
  type LearningBlockReadout,
} from '@/lib/exam/phase2';
import { openReviewGate, resetReviewDwell } from '@/lib/exam/review-dwell';
import { ASSESSMENT_SURFACE, type ExamSurface } from '@/lib/exam/surfaces';

import { ExamDebugPanel } from './exam-debug-panel';
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

/**
 * How long the machine's own outcome stays on screen before the next PHASE 1 item.
 *
 * A learning-block type has to give the child something to induce FROM, and what it gives them is
 * the mechanism's next visible state rather than a verdict (STAGE2_QUESTION_DESIGN §1.5). That
 * state has to be legible for long enough to be read; advancing the instant the server answers
 * would deliver the feedback and hide it in the same frame. It is a fixed pause for every child on
 * every trial — nothing here is contingent on whether they were right, which is what keeps the
 * cadence out of the fitted climb.
 *
 * STAGE 2 NO LONGER USES IT. A learning block hands the advance to the child instead — see the Next
 * control below and STAGE2_REDESIGN_SPEC §4.2. Phase 1 keeps the fixed hold: the four types that
 * produce a reveal are in the Phase 1 registry too, and Phase 1 is a bracketing search rather than
 * a block to be sat with, so nothing there changes.
 */
const REVEAL_HOLD_MS = 1600;

/**
 * Phase 1 ends at `done`. The learning block is a SEPARATE activity the family starts themselves
 * (`block-*`), possibly in a later sitting — see `lib/exam/phase2.ts` for why it is handed over
 * rather than continued.
 */
type Phase =
  | 'intro'
  | 'running'
  | 'saving'
  | 'done'
  | 'error'
  | 'block-intro'
  | 'block-running'
  | 'block-done';

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

/**
 * Family-facing wording for the learning-pace bands. `indeterminate` is the expected answer today
 * and is phrased as something the test cannot yet do — never as a finding about the child.
 */
const LEARNING_BAND_LABEL: Record<string, string> = {
  below: 'Slower than the comparison group',
  typical: 'Typical for the comparison group',
  above: 'Faster than the comparison group',
  indeterminate: 'Not enough to tell yet',
};

export function ExamRunner({
  studentName,
  dashboardHref,
  gradeBand: initialGradeBand,
  surface = ASSESSMENT_SURFACE,
}: {
  studentName: string;
  dashboardHref: string;
  gradeBand?: GradeBand;
  /**
   * Which front door this is. Defaults to the admissions battery, so every existing caller keeps
   * the behaviour it had. See `lib/exam/surfaces.ts` for what a surface is allowed to change.
   */
  surface?: ExamSurface;
}) {
  const { copy } = surface;
  const [phase, setPhase] = useState<Phase>('intro');
  const [gradeBand, setGradeBand] = useState<GradeBand>(initialGradeBand ?? '4-5');
  const [current, setCurrent] = useState<ServedItem | null>(null);
  // Write-only since the progress bar became continuous: `servedRef` is the source of truth, and
  // this setter is kept purely to re-render on each newly served item.
  const [, setServed] = useState<ServedItem[]>([]);
  const [scoredCount, setScoredCount] = useState(0);
  const [outcome, setOutcome] = useState<ExamScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Phase 2. `pendingBlock` is a handoff left by a finished Phase 1 — possibly from an earlier
  // sitting — which is what lets the family come back and start the block later. Read through an
  // external store so server and first client render agree and writes here refresh it.
  const pendingBlock = useSyncExternalStore(
    subscribeToLearningBlockHandoff,
    learningBlockHandoffSnapshot,
    learningBlockHandoffServerSnapshot,
  );
  const [blockCount, setBlockCount] = useState(0);
  const [blockReadout, setBlockReadout] = useState<LearningBlockReadout | null>(null);
  const blockTrialsRef = useRef<{ difficulty: number; score: number }[]>([]);
  /** Mirror of the block trials for render; the ref stays the source of truth for callbacks. */
  const [blockTrials, setBlockTrials] = useState<{ difficulty: number; score: number }[]>([]);
  const blockAdministeredRef = useRef<string[]>([]);
  const blockPoolRef = useRef<ServedItem[]>([]);
  const blockStandingRef = useRef(0);
  /**
   * The active activity's chance-success floor, derived from its own pool's option count.
   *
   * Fixed once when the activity starts rather than re-derived per trial, so every trial of one
   * block is fitted and aimed under the same response model — a floor that moved mid-block would
   * make the climb partly an artifact of the assumption changing.
   */
  const blockGuessingRef = useRef(blockGuessingFloor([]).guessing);
  /** Routes each result to the block instead of the Phase 1 engine; a ref so it is never stale. */
  const inBlockRef = useRef(false);

  // ---- self-paced advance (STAGE2_REDESIGN_SPEC §4.2) -----------------------
  /**
   * The revealed trial the child is currently sitting with, or `null`.
   *
   * While this is set, the runner has served the reveal and is doing nothing else. It is the only
   * thing that ends the trial: no timer runs against it, so a Stage 2 trial cannot advance unless
   * the child acts. That is the point — a fixed hold flicks the outcome past a child who wanted to
   * look at it, and the outcome is the entire learning signal the block runs on.
   */
  const [review, setReview] = useState<{ itemId: string; typeCode: string } | null>(null);
  /** Resolves the promise `handleResult` is parked on. Cleared as it fires, so it runs once. */
  const releaseReviewRef = useRef<(() => void) | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  /**
   * Park until the child continues.
   *
   * The gate itself — and the time-to-next it records — is `lib/exam/review-dwell.ts`. The figure
   * goes to that ledger and nowhere else: it is not returned here, not attached to the trial, and
   * not visible to the fit, which is why the separation is a module boundary rather than a habit.
   */
  const waitForChildToContinue = useCallback((item: ServedItem, emulated: boolean) => {
    const gate = openReviewGate(item, { emulated });
    releaseReviewRef.current = () => {
      releaseReviewRef.current = null;
      setReview(null);
      gate.release();
    };
    setReview({ itemId: item.itemId, typeCode: item.typeCode });
    return gate.settled;
  }, []);

  // ---- Phase 2 as a sequence of activities ----------------------------------
  /** Which activity of the queue is on screen, mirrored into state for the progress line. */
  const [blockIndex, setBlockIndex] = useState(0);
  const blockIndexRef = useRef(0);
  /** The activities this child was offered, after availability filtering. */
  const blockQueueRef = useRef<LearningBlockSpec[]>([]);
  const activeSpecRef = useRef<LearningBlockSpec | null>(null);
  /** Render mirrors of the Phase 2 refs: render must not read `.current`. */
  const [activeSpec, setActiveSpec] = useState<LearningBlockSpec | null>(null);
  const [blockQueue, setBlockQueue] = useState<LearningBlockSpec[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [blockStanding, setBlockStanding] = useState(0);
  /**
   * TRUE climb of the emulated child, in scale points per trial — the same units the fit
   * reports. 0 is the honest default: a non-learner is what the block has to be able to
   * show, and it is the case the estimator is known to get wrong.
   */
  const [emulatedLambda, setEmulatedLambda] = useState(0);
  /** Emulate the rest of the block without a click per trial. */
  const [autoRun, setAutoRun] = useState(false);
  const completedBlocksRef = useRef<CompletedBlock[]>([]);
  /** Whole served pool, kept so each activity can build its own single-type sub-pool. */
  const blockFullPoolRef = useRef<ServedItem[]>([]);
  /** Items unavailable to the next activity: Phase 1's, plus every earlier activity's. */
  const blockSeenRef = useRef<string[]>([]);
  const blockStandingsRef = useRef<Partial<Record<Area, number>>>({});
  const [stage2, setStage2] = useState<Stage2Readout | null>(null);
  useEffect(() => {
    blockIndexRef.current = blockIndex;
  }, [blockIndex]);

  // Auto-run: emulate one trial per served item until the block ends. Chained through the
  // served item rather than a loop, so each trial waits for the server's verdict exactly as a
  // clicked one does — the trace an auto-run produces is the same trace.
  const autoRunBusyRef = useRef(false);
  useEffect(() => {
    if (!autoRun) return;
    if (phase !== 'block-running' || !current) return;
    if (autoRunBusyRef.current) return;
    autoRunBusyRef.current = true;
    const item = current;
    const ability = blockStandingRef.current + emulatedLambda * blockTrialsRef.current.length;
    void (async () => {
      try {
        await handleResultRef.current(item, { response: { emulated: true } }, false, ability);
      } finally {
        autoRunBusyRef.current = false;
      }
    })();
  }, [autoRun, phase, current, emulatedLambda]);

  /**
   * Auto-run has no child, so it presses Next itself.
   *
   * The gate is never bypassed — the trial is still released by an action, and the row it leaves is
   * flagged `emulated` so a session-budget figure built from the ledger does not include a
   * researcher's emulator. Making the gate conditional on auto-run instead would leave two advance
   * paths where the whole design rests on there being one.
   */
  useEffect(() => {
    if (autoRun && review) releaseReviewRef.current?.();
  }, [autoRun, review]);

  /** Move focus to Next when a trial becomes reviewable, so it is reachable without a pointer. */
  useEffect(() => {
    if (review) nextRef.current?.focus();
  }, [review]);

  /** Ability estimate for the item on screen, mirrored into state so render never reads a ref. */
  const [debugAbility, setDebugAbility] = useState<number | null>(null);
  /**
   * Answered items, in state rather than a ref, because the debug dock renders from them: appending
   * one is what re-renders the panel and advances the convergence on screen. Kept separate from
   * `scoredRef` (which is the POSTed trace) so the panel can carry the burst position without
   * changing the results payload.
   */
  const [debugTrace, setDebugTrace] = useState<DebugTraceItem[]>([]);

  /**
   * The burst the on-screen item belongs to. One item is on screen at a time, so this is always the
   * plan for `current`; `planNextSelection` reads it back to decide whether to stay on the type.
   */
  const burstRef = useRef<BurstPlan | null>(null);
  /**
   * The burst on screen, and which QUESTION it is.
   *
   * A burst is several items of one type asked back to back, each aimed by how the previous
   * ones went. To a child that is one question with several parts, not several questions that
   * happen to look alike — so the counter advances per burst and the part is shown inside it.
   */
  const [burstView, setBurstView] = useState<BurstPlan | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);

  /**
   * The engine configuration this session runs under.
   *
   * Taken from the live session at `start` and held in state, not re-derived: the config now
   * carries a seed drawn per sitting, so building a second one would report a different seed from
   * the one the session is actually replaying off — which is the one number in the dock that has to
   * be the session's own. State rather than a ref because the dock renders from it. It cannot change
   * mid-session: `startState` fixes the config and `update` carries it through untouched.
   */
  const [engineConfig, setEngineConfig] = useState<EngineConfig>(
    () => startState(gradeBand, surface.engineOverrides).config,
  );

  /** `?debug=1` on the exam URL: shows the convergence dock, the demo's researcher panel, Emulate. */
  const debugMode = useSyncExternalStore(
    subscribeToDebugMode,
    debugModeSnapshot,
    debugModeServerSnapshot,
  );

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  /**
   * The live postMessage channel to the item on screen.
   *
   * Held in a ref because the reveal is sent from `handleResult`, which runs after the server round
   * trip and outside the effect that owns the channel. It is cleared on dispose, so a late verdict
   * for an item that has already been torn down posts nothing.
   */
  const hostRef = useRef<ExamHost | null>(null);
  /**
   * The demo window that has already announced `{type:'ready'}`.
   *
   * A demo announces itself once per DOCUMENT, and a burst serves several items through one
   * document, so for every item after the first there is no `ready` coming and no `load` to hear.
   * Window identity is what separates "the document the previous item ran in" from a freshly
   * created iframe, whose window belongs to a new browsing context.
   */
  const readyWindowRef = useRef<Window | null>(null);
  const stateRef = useRef<SessionState | null>(null);
  /** Render mirror of the engine session; the progress projection is derived from it. */
  const [engineState, setEngineState] = useState<SessionState | null>(null);
  const banksRef = useRef<Banks | null>(null);
  const servedRef = useRef<ServedItem[]>([]);
  const scoredRef = useRef<TraceScoredItem[]>([]);
  const telemetryRef = useRef<Record<string, unknown>[]>([]);
  const processedRef = useRef<Set<string>>(new Set());
  /** Type codes already demonstrated this session, so a gesture hint never replays. */
  const demoedTypesRef = useRef<Set<string>>(new Set());
  const sessionRef = useRef<{
    sessionId: string;
    participantCode: string;
    startedAt: string;
    /** Supabase `app.exam_session.session_id`; null when running unpersisted. */
    examSessionId: string | null;
  }>({ sessionId: '', participantCode: '', startedAt: '', examSessionId: null });
  const handleResultRef = useRef<
    (item: ServedItem, inbound: InboundResult, skipped: boolean, emulateAbility?: number) => void
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

      // Hand Phase 2 what it needs to start LATER: the settled standing level in the block's area,
      // and every item already served so the block can guarantee unfamiliar ones. Without this the
      // block would have to run in the same sitting off live engine state.
      // Every area's settled level, not just the block area: each activity is aimed at the
      // standing the child reached in ITS OWN area, since a spatial block pitched at a fluid
      // standing would be aimed at the wrong child.
      const standings: Partial<Record<Area, number>> = {};
      for (const area of AREAS) {
        const score = finalOutcome.perArea[area];
        const level = score?.abilityEstimate ?? score?.proficiency ?? null;
        if (level !== null) standings[area] = level;
      }
      const standing = standings[LEARNING_BLOCK_AREA] ?? null;
      // A door that does not offer Stage 2 must not leave a handoff behind either. The handoff is
      // what makes "Part two is still waiting" appear on a LATER visit, so writing one here would
      // put a 30-trial block in front of a screener child the next time they opened the page.
      if (standing !== null && surface.offersStage2) {
        const handoff: LearningBlockHandoff = {
          sessionId: payload.sessionId,
          examSessionId: sessionRef.current.examSessionId,
          gradeBand,
          standing,
          standings,
          seenItemIds: servedRef.current.map((servedItem) => servedItem.itemId),
          finishedAt: payload.finishedAt,
          blockLength: LEARNING_BLOCK_LENGTH,
          completedBlockIds: [],
        };
        saveLearningBlockHandoff(handoff);
      }

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
  }, [studentName, gradeBand, surface.offersStage2]);

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
        // Either the next item of the burst already running, or a fresh type. Staying on the type is
        // all a burst is: `update` has already moved this area's estimate, so `nextItem` re-targets
        // at the new one and the burst adapts to how the previous items went.
        const plan = planNextSelection(state, banks, burstRef.current);
        if (!plan) {
          void finalize();
          return;
        }
        burstRef.current = plan;
        setBurstView(plan);
        // index 1 means `planNextSelection` started a fresh burst rather than continuing one.
        if (plan.index === 1)
          setQuestionNumber((n) => (scoredRef.current.length === 0 ? 1 : n + 1));
        selected = nextItem(state, plan.typeCode, banks);
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
        setDebugAbility(state.areas[item.domain]?.difficulty ?? null);
        setCurrent(item);
      })();
    },
    [finalize],
  );

  // Record one item's result: server-verify correctness, then advance the engine.
  // ---- Phase 2: the novel learning block ------------------------------------
  // Block trials are collected in their OWN ref, never in the Phase 1 trace. That separation is
  // the point: a rate fitted over the bracketing stream measures the search converging, not the
  // child learning (BUILD_PLAN §5.5).

  // Phase 2 is a SEQUENCE of activities, not one block. Each is a single question type run in one
  // area, because the thing being measured is a hidden system the child induces across trials —
  // and that system belongs to a type, so it cannot span one (phase2.ts, LEARNING_BLOCKS).
  const finishBlock = useCallback(
    (trialsOverride?: readonly { difficulty: number; score: number }[]) => {
      const spec = activeSpecRef.current;
      const trials = toLearningTrials(trialsOverride ?? blockTrialsRef.current);
      const readout = summariseLearningBlock(
        trials,
        undefined,
        spec?.length ?? LEARNING_BLOCK_LENGTH,
        blockGuessingRef.current,
      );
      setBlockReadout(readout);
      if (spec) {
        completedBlocksRef.current = [...completedBlocksRef.current, { spec, readout }];
        setCompletedCount(completedBlocksRef.current.length);
        // Items this activity used are unavailable to the next one — an item repeated across
        // activities would measure recall of it rather than the new system.
        blockSeenRef.current = [...blockSeenRef.current, ...blockAdministeredRef.current];
      }
      inBlockRef.current = false;
      setAutoRun(false);
      setCurrent(null);

      const nextIndex = blockIndexRef.current + 1;
      if (nextIndex < blockQueueRef.current.length) {
        // Another activity waits. The child chooses when to start it, exactly as they chose to
        // start Phase 2 — a run of four back-to-back blocks is where fatigue would enter.
        setPhase('block-intro');
        setBlockIndex(nextIndex);
        return;
      }

      clearLearningBlockHandoff();
      setStage2(summariseStage2(completedBlocksRef.current, blockQueueRef.current.length));
      setPhase('block-done');
    },
    [],
  );

  const serveNextBlockItem = useCallback(() => {
    const spec = activeSpecRef.current;
    if (!spec) return;
    const trials = toLearningTrials(blockTrialsRef.current);
    if (trials.length >= spec.length) {
      finishBlock();
      return;
    }

    // Aim just above the settled standing early on, then re-fit from the level reached so far.
    const target = nextBlockTarget(trials, blockStandingRef.current, blockGuessingRef.current);
    const picked = nextBlockItem(
      blockPoolRef.current,
      blockAdministeredRef.current,
      target,
      trials.length + 1,
    );
    if (!picked) {
      // Pool exhausted early. Reportable, not swallowed: the readout will decline to name a band.
      finishBlock();
      return;
    }
    blockAdministeredRef.current = [...blockAdministeredRef.current, picked.itemId];

    void (async () => {
      let item = picked;
      try {
        item = await fetchServedItem(picked.itemId);
      } catch {
        // Fall back to the index entry; the item can still be skipped rather than wedging.
      }
      setDebugAbility(blockStandingRef.current);
      setCurrent(item);
    })();
  }, [finishBlock]);

  /** Begin the activity at `index` in the queue this child was offered. */
  const startActivity = useCallback(
    (index: number) => {
      const spec = blockQueueRef.current[index];
      if (!spec) return;
      activeSpecRef.current = spec;
      setActiveSpec(spec);
      setBlockIndex(index);
      setBlockReadout(null);
      setCurrent(null);
      releaseReviewRef.current = null;
      setReview(null);
      blockTrialsRef.current = [];
      setBlockTrials([]);
      blockAdministeredRef.current = [];
      blockStandingRef.current = blockStandingsRef.current[spec.area] ?? blockStandingRef.current;
      setBlockStanding(blockStandingRef.current);
      blockPoolRef.current = blockPool(spec, blockFullPoolRef.current, blockSeenRef.current);
      // This activity's own chance floor. `VER-MORPHO-01` is four-option where the other three are
      // five, so a single shared default would fit and aim one of the four at the wrong asymptote.
      blockGuessingRef.current = blockGuessingFloor(blockPoolRef.current).guessing;
      processedRef.current = new Set();
      setBlockCount(0);
      inBlockRef.current = true;
      setPhase('block-running');
      serveNextBlockItem();
    },
    [serveNextBlockItem],
  );

  const startLearningBlock = useCallback(
    async (handoff: LearningBlockHandoff) => {
      setError(null);
      setBlockReadout(null);
      setStage2(null);
      setCurrent(null);
      completedBlocksRef.current = [];
      setCompletedCount(0);
      // One sitting's time-to-next figures stay one sitting's; a resumed block starts a new budget.
      resetReviewDwell();
      blockSeenRef.current = [...handoff.seenItemIds];
      blockStandingsRef.current = handoff.standings;
      blockStandingRef.current = handoff.standing;
      sessionRef.current = {
        sessionId: handoff.sessionId,
        participantCode: sessionRef.current.participantCode || syntheticId('PART'),
        startedAt: new Date().toISOString(),
        examSessionId: handoff.examSessionId,
      };

      try {
        const pool = await fetchServedPool();
        blockFullPoolRef.current = pool;
        // Only the activities this child can actually be given: bank wired, enough unseen items,
        // and a settled standing in that area to aim at.
        setBlockQueue(
          (blockQueueRef.current = availableBlocks(
            pool,
            handoff.seenItemIds,
            handoff.standings,
            handoff.completedBlockIds,
          )),
        );
        if (blockQueueRef.current.length === 0) {
          // Nothing runnable. Say so rather than serving a short block, whose fitted climb would
          // rest on fewer trials than the design assumes.
          activeSpecRef.current = null;
          setActiveSpec(null);
          setStage2(summariseStage2([], 0));
          setPhase('block-done');
          return;
        }
        startActivity(0);
      } catch {
        inBlockRef.current = false;
        setError('We could not load the next set of activities. Please try again.');
        setPhase('error');
      }
    },
    [startActivity],
  );

  const handleResult = useCallback(
    async (item: ServedItem, inbound: InboundResult, skipped: boolean, emulateAbility?: number) => {
      if (processedRef.current.has(item.itemId)) return;
      processedRef.current.add(item.itemId);
      // NOTE: the Phase 1 session-state check happens AFTER the server round trip, because a block
      // resumed in a later sitting has no live Phase 1 state to check.

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

      // Emulation asks the server to SAMPLE the outcome at the caller's ability; the browser has
      // no answer key and must not be able to assert one. Everything downstream is identical, so an
      // emulated item moves the estimate exactly as a real answer of that outcome would.
      const verdict =
        emulateAbility === undefined
          ? await submitAnswer({
              itemId: item.itemId,
              response: inbound.response,
              skipped,
              examSessionId: sessionRef.current.examSessionId,
              clientMetrics,
              telemetry: perItemTelemetry,
            })
          : await emulateAnswer({
              itemId: item.itemId,
              ability: emulateAbility,
              examSessionId: sessionRef.current.examSessionId,
            });
      const serverMetrics = verdict?.metrics ?? { 'M-ACC': 0, 'M-ERRTYPE': 0 };
      const correct = verdict?.correct ?? false;
      const score = verdict?.score ?? 0;
      const difficulty = verdict?.difficulty ?? item.difficulty;

      // The machine finishes its action. Only a type that declares a reveal gets one, only for a
      // committed (never a skipped) trial, and only after the server has graded it — see
      // `lib/exam/reveal.ts`. The demo draws it as world-state; nothing here says whether the child
      // was right.
      //
      // What ends the trial then splits by PHASE and by nothing else. Stage 2 hands it to the child
      // (§4.2): the trial stays on screen until they press Next, and how long that took is recorded
      // as a process signal that reaches no estimator. Phase 1 keeps its fixed hold, the same length
      // for every child on every item, which is what keeps the cadence out of the fitted climb.
      const reveal = verdict && 'reveal' in verdict ? verdict.reveal : undefined;
      if (reveal && !skipped) {
        hostRef.current?.reveal(reveal);
        if (inBlockRef.current) await waitForChildToContinue(item, emulateAbility !== undefined);
        else await new Promise((resolve) => setTimeout(resolve, REVEAL_HOLD_MS));
      }

      // A block trial goes to the block, and nowhere near the Phase 1 engine state.
      if (inBlockRef.current) {
        const trials = [...blockTrialsRef.current, { difficulty, score }];
        blockTrialsRef.current = trials;
        setBlockTrials(trials);
        setBlockCount(trials.length);
        if (trials.length >= (activeSpecRef.current?.length ?? LEARNING_BLOCK_LENGTH))
          finishBlock(trials);
        else serveNextBlockItem();
        return;
      }

      const state = stateRef.current;
      if (!state) return;

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

      // Same row plus the burst position, for the debug dock. Appending re-renders the panel, which
      // is what makes the estimate and its range visibly move as each question is answered.
      const plan = burstRef.current;
      setDebugTrace((rows) => [
        ...rows,
        {
          ...scored,
          ...(plan ? { burstIndex: plan.index, burstLength: plan.length } : {}),
        },
      ]);

      const nextState = update(state, scored as unknown as EngineScoredItem);
      stateRef.current = nextState;
      setEngineState(nextState);

      if (isDone(nextState)) void finalize();
      else serveNext(nextState);
    },
    [serveNext, finalize, finishBlock, serveNextBlockItem, waitForChildToContinue],
  );

  useEffect(() => {
    handleResultRef.current = (item, inbound, skipped, emulateAbility) => {
      void handleResult(item, inbound, skipped, emulateAbility);
    };
  }, [handleResult]);

  // Bind the postMessage channel for the current item's iframe.
  useEffect(() => {
    if ((phase !== 'running' && phase !== 'block-running') || !current) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const item = current;
    let initiated = false;
    let readySeen = false;
    let readyFallback: number | undefined;

    /**
     * Is an inbound message about the item on screen?
     *
     * The demo instance outlives the item now — a burst re-inits one document instead of reloading
     * it — so a late message about the item just answered would otherwise be recorded against this
     * one, and a whole answer could land on the wrong stimulus. Demos that name the item they are
     * talking about are held to it; one that names nothing (or names nothing yet) is taken at its
     * word, because there is nothing else to go on.
     */
    const isThisItem = (named: unknown) =>
      named === undefined || named === null || named === item.itemId;

    const host = new ExamHost(iframe, {
      origin: window.location.origin,
      onReady: () => {
        readySeen = true;
        readyWindowRef.current = iframe.contentWindow;
        if (readyFallback !== undefined) window.clearTimeout(readyFallback);
        sendInit();
      },
      onResult: (inbound) => {
        if (!isThisItem(inbound.itemId)) return;
        handleResultRef.current(item, inbound, false);
      },
      onTelemetry: (event) => {
        if (!isThisItem(event['itemId'])) return;
        telemetryRef.current.push({ ...event, itemId: item.itemId });
      },
    });
    hostRef.current = host;

    function sendInit() {
      if (initiated) return;
      initiated = true;
      host.init(item);
      // Only a designated type gets the gesture demonstration, and only the first time this
      // session meets it. The demo's own "already shown" flag cannot be relied on: it dies with the
      // iframe, which now survives a whole burst rather than one item, so the CALLER tracks it.
      const needsDemo =
        GESTURE_DEMO_TYPES.has(item.typeCode) && !demoedTypesRef.current.has(item.typeCode);
      if (needsDemo) demoedTypesRef.current.add(item.typeCode);
      host.start(needsDemo);
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
    // The next item of a burst arrives at a document that is already loaded and already listening,
    // so neither `ready` nor `load` will fire again for it. Init straight away rather than sitting
    // out the fallback with the answered item still on screen.
    if (readyWindowRef.current !== null && readyWindowRef.current === iframe.contentWindow) {
      sendInit();
    }

    const timeout = window.setTimeout(() => {
      handleResultRef.current(item, { response: { timedOut: true } }, true);
    }, MAX_MS_PER_ITEM);

    const onSkip = () => handleResultRef.current(item, { response: { skipped: true } }, true);
    window.addEventListener('gt-exam-skip', onSkip);

    return () => {
      host.dispose();
      if (hostRef.current === host) hostRef.current = null;
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
    burstRef.current = null;
    setBurstView(null);
    setQuestionNumber(1);
    setServed([]);
    setScoredCount(0);
    setDebugTrace([]);
    setPhase('running');
    try {
      const pool = await fetchServedPool();
      if (pool.length === 0) throw new Error('EMPTY_BANK');
      // Phase 1 never draws a Phase 2 activity type: they measure a different thing, and an
      // item spent here is one the block can no longer treat as unfamiliar (phase2.ts). The
      // screener narrows it further to types that can burst — see `screenerPool`.
      const surfacePool = surface.pool(pool);
      if (surfacePool.length === 0) throw new Error('EMPTY_BANK');
      banksRef.current = buildBanks(surfacePool);
      const state = startState(gradeBand, examEngineOverrides(surface.engineOverrides));
      stateRef.current = state;
      setEngineState(state);
      setEngineConfig(state.config);
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
            <p className={styles.kicker}>{copy.introKicker}</p>
            <h1 className={styles.title}>{copy.introTitle(studentName)}</h1>
            <p className={styles.lede}>{copy.introLede}</p>

            <p className={styles.cardKicker}>{copy.gradePrompt}</p>
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
              {copy.startCta}
            </button>
            <Link className={styles.ghost} href={dashboardHref}>
              {copy.backCta}
            </Link>
          </div>
        </section>

        {/* A block handed over by an earlier sitting: the family can pick it up whenever. */}
        {pendingBlock && surface.offersStage2 ? (
          <section className={styles.summaryCard}>
            <p className={styles.cardKicker}>Picking up where you left off</p>
            <h2 className={styles.runTitle}>Part two is still waiting</h2>
            <p className={styles.lede}>
              You have already finished the first part. The short second part — new kinds of puzzles
              — is still available whenever you are ready for it.
            </p>
            <button
              type="button"
              className={styles.primary}
              onClick={() => setPhase('block-intro')}
            >
              Continue to part two →
            </button>
          </section>
        ) : null}

        <p className={styles.boundary}>{copy.introBoundary}</p>
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
            <p className={styles.kicker}>{copy.doneKicker}</p>
            <h1 className={styles.title}>{copy.doneTitle(studentName)}</h1>
            <p className={styles.lede}>{copy.doneLede}</p>
          </div>
        </section>

        <section className={styles.summaryCard}>
          <div className={styles.summaryTop}>
            <div>
              <p className={styles.cardKicker}>{copy.headlineStatLabel}</p>
              {/*
                The composite figure is withheld on a screener. A number out of twenty reads as a
                grade to every parent who sees one, and a 17-item session has an interval around it
                far too wide to support that reading — so the band is shown as words instead of
                being decorated with a number it cannot justify.
              */}
              {surface.reportsTechnicalScore ? (
                <>
                  <p className={styles.bigStat}>
                    {outcome.composite.toFixed(1)}
                    <span className={styles.statSub}>/20</span>
                  </p>
                  <p className={styles.frameNote}>{bandForTheta(outcome.composite)}</p>
                </>
              ) : (
                <p className={styles.bigStat} style={{ fontSize: '1.4rem' }}>
                  {bandForTheta(outcome.composite)}
                </p>
              )}
            </div>
            <div>
              <p className={styles.cardKicker}>{copy.countStatLabel}</p>
              <p className={styles.bigStat}>{scoredCount}</p>
            </div>
            <div>
              <p className={styles.cardKicker}>Grade band</p>
              <p className={styles.bigStat} style={{ fontSize: '1.4rem' }}>
                {GRADE_BAND_LABEL[gradeBand]}
              </p>
            </div>
          </div>

          <p className={styles.cardKicker}>{copy.areaBreakdownLabel}</p>
          <div className={styles.domainBars}>
            {areaScores.map((area) => (
              <div key={area.area} className={styles.domainBar}>
                <div className={styles.domainBarHead}>
                  <span>{domainLabel(area.area)}</span>
                  <span className={styles.domainBarPct}>
                    {surface.reportsTechnicalScore ? (
                      <>
                        {area.proficiency.toFixed(1)}
                        {area.abilityStandardError != null
                          ? ` ±${(1.96 * area.abilityStandardError).toFixed(1)}`
                          : ''}{' '}
                        · {bandForTheta(area.proficiency)} · acc {pct(area.accuracy)}
                      </>
                    ) : (
                      bandForTheta(area.proficiency)
                    )}
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
          </div>
        </section>

        {/*
          Learning pace is deliberately NOT reported here. The per-area growth metric this screen
          used to print rises when the adaptive search converges, so on its own it measures the
          software homing in rather than the child (D-030). It is now measured only over the
          separate block below, which the family starts themselves.
        */}
        {pendingBlock && surface.offersStage2 ? (
          <section className={styles.summaryCard}>
            <p className={styles.cardKicker}>Optional next part</p>
            <h2 className={styles.runTitle}>
              See how quickly {studentName} picks up something new
            </h2>
            <p className={styles.lede}>
              This part is a short set of unfamiliar puzzles, pitched a little above where{' '}
              {studentName} just landed. It measures something the first part cannot: not what they
              already know, but how fast they get the hang of something new.
            </p>
            <p className={styles.frameNote}>
              You can start it now or come back to it another time — the results above are already
              saved.
            </p>
            <button
              type="button"
              className={styles.primary}
              onClick={() => setPhase('block-intro')}
            >
              Start the next part →
            </button>
          </section>
        ) : null}

        <Link className={styles.primary} href={dashboardHref}>
          {copy.returnCta}
        </Link>
        <p className={styles.boundary}>{copy.doneBoundary}</p>
      </div>
    );
  }

  // ---- Phase 2 intro: the family starts this, and it is framed as hard on purpose ----------
  if (phase === 'block-intro') {
    // Mid-sequence the queue is known, so this screen names the activity ahead and how many
    // remain. Before the first one it is not, so it stays general.
    const queued = blockQueue;
    const upcoming = queued[blockIndex] ?? null;
    const isResuming = queued.length > 0 && completedCount > 0;
    return (
      <div className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>
              {isResuming
                ? `Part two — activity ${blockIndex + 1} of ${queued.length}`
                : 'Part two — learning something new'}
            </p>
            <h1 className={styles.title}>
              {isResuming
                ? `Next up: ${upcoming?.label ?? 'a new activity'}.`
                : 'These are meant to be hard.'}
            </h1>
            {isResuming ? (
              <p className={styles.lede}>
                That was a different puzzle from the one before it, and this next set works by its
                own rules again. {upcoming ? `There are ${upcoming.length} of them.` : ''} Same idea
                as last time: nobody is expected to get them all, and what matters is how you get on
                as you go.
              </p>
            ) : (
              <p className={styles.lede}>
                The next part is a set of activities made of puzzles you have not seen before,
                pitched a little above where you just finished. Each one works by its own hidden
                rules, and you work them out as you go. You are not expected to get them all — most
                people do not, and that is exactly how this part is supposed to feel.
              </p>
            )}
            <p className={styles.lede}>
              Take your time, and keep going even when one looks unfamiliar.
            </p>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                if (isResuming) startActivity(blockIndex);
                else if (pendingBlock) void startLearningBlock(pendingBlock);
              }}
            >
              I’m ready — begin →
            </button>
            <Link className={styles.ghost} href={dashboardHref}>
              Not right now
            </Link>
          </div>
        </section>
        <p className={styles.boundary}>
          This is an eligibility screening only. It is not an IQ test, an enrollment offer, or an
          admission decision.
        </p>
      </div>
    );
  }

  // ---- Phase 2 result: a band, or an honest refusal to name one ----------------------------
  if (phase === 'block-done' && blockReadout) {
    return (
      <div className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>Part two complete</p>
            <h1 className={styles.title}>Thanks, {studentName}.</h1>
          </div>
        </section>

        <section className={styles.summaryCard}>
          <p className={styles.cardKicker}>Learning pace</p>
          <p className={styles.bigStat} style={{ fontSize: '1.5rem' }}>
            {LEARNING_BAND_LABEL[stage2?.band ?? blockReadout.band]}
          </p>
          <p className={styles.lede}>{stage2?.reason ?? blockReadout.reason}</p>
          <p className={styles.frameNote}>
            {stage2 && stage2.completed > 0
              ? `Based on ${stage2.blocks.reduce((n, b) => n + b.readout.trialCount, 0)} unfamiliar ` +
                `puzzles across ${stage2.completed} ` +
                `${stage2.completed === 1 ? 'activity' : 'activities'}` +
                `${stage2.offered > stage2.completed ? ` of ${stage2.offered} offered` : ''}.`
              : 'We could not run this part — there were not enough unfamiliar puzzles left.'}
          </p>
          {stage2 && stage2.blocks.length > 0 ? (
            <table className={styles.rateTable}>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Puzzles</th>
                  <th>Learning rate</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {stage2.blocks.map((b) => (
                  <tr key={b.spec.id}>
                    <td>{b.spec.label}</td>
                    <td>{b.readout.trialCount}</td>
                    <td>{b.readout.lambda === null ? '—' : b.readout.lambda.toFixed(3)}</td>
                    <td>
                      {b.readout.lambdaSe === null ? '—' : `± ${b.readout.lambdaSe.toFixed(3)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {stage2 && stage2.blocks.length > 0 ? (
            <p className={styles.frameNote}>
              Learning rate is the fitted climb in difficulty points per puzzle, with the margin
              either side of it. It is provisional: there is no comparison group yet, and at this
              block length the figure carries a floor, so a rate near zero is not evidence a child
              did not learn.
            </p>
          ) : null}
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
  const isBlockRunning = phase === 'block-running';
  const progress = isBlockRunning
    ? stage2Progress(
        blockQueue.map((spec) => spec.length),
        blockIndex,
        blockTrials.length,
      )
    : stage1Progress(engineState, scoredCount);
  const meta = current ? EXAM_BANK_BY_CODE.get(current.typeCode) : undefined;
  const demoSrc = current ? demoPathFor(current.typeCode, debugMode) : '';
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
            {isBlockRunning
              ? `${activeSpec?.label ?? 'New puzzle'} — ${blockCount + 1} of ` +
                `${activeSpec?.length ?? LEARNING_BLOCK_LENGTH}` +
                (blockQueue.length > 1
                  ? ` · activity ${blockIndex + 1} of ${blockQueue.length}`
                  : '')
              : burstView && burstView.length > 1 && surface.showBurstPosition
                ? `Question ${questionNumber} · part ${burstView.index} of ${burstView.length}`
                : `Question ${questionNumber}`}{' '}
            · {domainLabel(current.domain)}
          </p>
          <p className={styles.runTitle}>{meta?.title ?? current.typeCode}</p>
        </div>
        <div className={styles.runActions}>
          {debugMode ? (
            <button
              type="button"
              className={styles.emulate}
              title="Sample this item's outcome at the current ability estimate, instead of answering it"
              onClick={() => {
                if (!current) return;
                // Ability for THIS item's area: the engine's running estimate in Phase 1, the
                // settled standing the block was pitched against in Phase 2.
                const ability = isBlockRunning
                  ? // The emulated child CLIMBS: theta(t) = standing + lambda * t, matching the
                    // curve `estimateLearningCurve` inverts. A flat standing can only ever
                    // produce a non-learner, which is why this used to look broken.
                    blockStandingRef.current + emulatedLambda * blockTrialsRef.current.length
                  : (stateRef.current?.areas[current.domain]?.difficulty ??
                    blockStandingRef.current);
                handleResultRef.current(current, { response: { emulated: true } }, false, ability);
              }}
            >
              Emulate{debugAbility === null ? '' : ` (θ ${debugAbility.toFixed(1)})`} →
            </button>
          ) : null}
          {/* Nothing to skip once the answer is in: this trial is finished and being looked at. */}
          {review ? null : (
            <button
              type="button"
              className={styles.skip}
              onClick={() => window.dispatchEvent(new Event('gt-exam-skip'))}
            >
              Skip this one →
            </button>
          )}
        </div>
      </header>

      {/*
        One smooth bar, not a segment per question. Phase 1 has no fixed length — it ends when the
        stop rule is satisfied — so a fixed count of segments would be asserting a total nobody
        knows. The fill is `answered / shortest total still consistent with the rules`, which is
        why it moves unevenly: an area settling removes a requirement and the bar takes a bigger
        step. In Phase 2 the total IS known, and the bar spans every activity rather than
        resetting per activity.
      */}
      <div
        className={styles.progress}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.fraction * 100)}
        aria-label={isBlockRunning ? 'Progress through part two' : 'Progress through part one'}
      >
        <span
          className={styles.progressFill}
          style={{ width: `${Math.max(1.5, progress.fraction * 100)}%` }}
        />
      </div>

      {/*
        Keyed on the DEMO, not on the item.

        A burst asks two or three items of one type back to back and a Stage 2 activity asks thirty,
        all of them through the identical demo file. Keying on the item id tore the iframe down and
        reloaded the same page under the child every time, which is what made a burst read as being
        asked the same question three times over instead of one question with several parts. Keyed
        on the path, the instance survives the burst and each item arrives as a fresh
        `{type:'init', item}` + `{type:'start'}` — safe because every published demo resets its
        per-item state on init, asserted per type in `lib/exam/demo-protocol.test.ts`. The key still
        changes when the TYPE changes, so a different activity always gets a clean document.
      */}
      <iframe
        key={demoSrc}
        ref={iframeRef}
        title={`${meta?.title ?? current.typeCode} question`}
        src={demoSrc}
        className={styles.frame}
      />

      {/*
        The reviewable trial, and the only way out of it.

        Every word here points at the WORK — what came out, and which one was picked — and none of
        it points at the child. There is no verdict, no tally and no count of anything they have got
        right, because feedback about the person is what Category 7.8 found made performance worse
        (STAGE2_REDESIGN_SPEC §4.3). Which of the two marks the child should draw a conclusion from
        is left to them; that inference is the thing the block is measuring.
      */}
      {review ? (
        <div className={styles.reviewBar}>
          <p className={styles.reviewNote} aria-live="polite">
            Take as long as you like looking at this one. The marks show what the activity did and
            which one you picked.
          </p>
          <button
            type="button"
            ref={nextRef}
            className={styles.next}
            onClick={() => releaseReviewRef.current?.()}
          >
            Next →
          </button>
        </div>
      ) : (
        /*
          Deliberately terse. The type blurb and the "adaptive" explainer used to sit here, but they
          restated what the activity itself already says and turned every question into something to
          read first. The demo carries its own one-line instruction.
        */
        <p className={styles.frameNote}>
          {isBlockRunning
            ? 'These are meant to be hard — keep going even when one looks unfamiliar. '
            : ''}
          Synthetic screening activity; results are not shown between questions.
        </p>
      )}

      {/*
        The convergence dock. Rendered from the answered-item trace alone, so it is a view of the
        session rather than a second copy of it, and every number in it comes from the engine's own
        update or the scorer's own ability fit.
      */}
      {debugMode ? (
        <ExamDebugPanel
          view={buildDebugView({
            trace: debugTrace,
            gradeBand,
            config: engineConfig,
          })}
          // In a learning block the bracketing search is not running, so the convergence view
          // would be describing something that is not happening. Show the climb instead.
          stage2={
            isBlockRunning && activeSpec
              ? {
                  label: activeSpec.label,
                  activityIndex: blockIndex,
                  activityCount: blockQueue.length,
                  length: activeSpec.length,
                  standing: blockStanding,
                  trials: blockTrials,
                  emulatedLambda,
                  onEmulatedLambda: setEmulatedLambda,
                  autoRun,
                  onAutoRun: setAutoRun,
                }
              : null
          }
        />
      ) : null}
    </div>
  );
}
