import { useCallback, useEffect, useRef, useState } from 'react';

import { QBANK_HOST, isQbankMessage } from '@gt/qbank';

import type { AgeBand, BankSummary, Palette, Serve, SessionState } from './types';

/**
 * The adaptive session loop, written once.
 *
 * Every experience in this app uses this. The mechanics are lifted from
 * `apps/web/src/BankScreener.tsx`, which is the reference implementation: create a session, fetch the
 * next item, hand it to an iframe over postMessage, receive the child's response, post it back for
 * server-side marking, repeat until the engine stops.
 *
 * TWO THINGS THAT LOOK LIKE DETAILS AND ARE NOT.
 *
 * The live session is held in a ref as well as in state, because the `message` listener is registered
 * once and would otherwise close over a stale session id and post answers into a finished session.
 * The reference implementation does the same thing for the same reason.
 *
 * CORRECTNESS IS DELIBERATELY NOT RETURNED. The server knows whether each answer was right and the
 * engine uses it; an experience does not get to see it. That is a design constraint rather than an
 * oversight: rewards in this app must accrue for turning up and never for being right, because
 * performance-contingent rewards undermine children's intrinsic motivation and a child optimising for a
 * payout has stopped producing the behaviour the measurement depends on. Withholding the flag means an
 * experience cannot accidentally pay out on accuracy. What it gets instead is `answerCount`, which
 * ticks on every answer regardless of outcome, and that is what animations and rewards should key off.
 */

export type Phase = 'idle' | 'starting' | 'playing' | 'finished' | 'error';

export interface SessionResult {
  readonly decision: string | null;
  readonly itemsServed: number;
  readonly unscorable: number;
  readonly estimate: number;
  readonly interval: readonly [number, number];
  readonly perDomain: Record<string, number>;
  readonly stopReason: string | null;
}

export interface UseScreenerSessionOptions {
  readonly ageBand?: AgeBand;
  /** Index into the precision ladder. Lower is shorter. `GET /api/bank` lists the steps. */
  readonly precisionIndex?: number;
  /** Applied to the item iframe so the item matches the world around it. */
  readonly palette?: Palette;
  /** Pass a fixed seed to make a run reproducible, which a ladder or a daily round wants. */
  readonly seed?: number;
  /** Fires on every answer, whatever the outcome. The right hook for rewards. */
  readonly onAnswer?: (answerCount: number) => void;
  readonly onFinished?: (result: SessionResult) => void;
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}

export function useScreenerSession(options: UseScreenerSessionOptions = {}) {
  const { ageBand, precisionIndex = 1, palette, seed, onAnswer, onFinished } = options;

  const [summary, setSummary] = useState<BankSummary | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [serve, setServe] = useState<Serve | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [answerCount, setAnswerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const shownAt = useRef(Date.now());
  const live = useRef<{ sessionId: string | null }>({ sessionId: null });
  // Callbacks in a ref so the listener does not need re-registering when a parent re-renders.
  const handlers = useRef({ onAnswer, onFinished });

  useEffect(() => {
    handlers.current = { onAnswer, onFinished };
  }, [onAnswer, onFinished]);
  useEffect(() => {
    live.current = { sessionId };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    api<BankSummary>('/bank')
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyPalette = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !palette) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    for (const [name, value] of Object.entries(palette)) {
      doc.documentElement.style.setProperty(name, value);
    }
  }, [palette]);

  const finish = useCallback((next: SessionState) => {
    const out: SessionResult = {
      decision: next.decision,
      itemsServed: next.itemsServed,
      unscorable: next.unscorable,
      estimate: next.estimate,
      interval: next.interval,
      perDomain: next.perDomain,
      stopReason: next.stopReason,
    };
    setServe(null);
    setResult(out);
    setPhase('finished');
    handlers.current.onFinished?.(out);
  }, []);

  const loadNext = useCallback(
    async (id: string) => {
      const next = await api<{ done: boolean; state: SessionState } & Partial<Serve>>(
        `/bank/sessions/${id}/next`,
      );
      setState(next.state);
      if (next.done || !next.served) {
        finish(next.state);
        return;
      }
      setFrameReady(false);
      setServe(next as Serve);
      shownAt.current = Date.now();
    },
    [finish],
  );

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setAnswerCount(0);
    setPhase('starting');
    try {
      const body: Record<string, unknown> = { precisionIndex };
      if (ageBand) body.ageBand = ageBand;
      body.seed = seed ?? Math.floor(Math.random() * 1e6);
      const res = await api<{ sessionId: string; poolSize: number; state: SessionState }>(
        '/bank/sessions',
        body,
      );
      setSessionId(res.sessionId);
      setState(res.state);
      setPhase('playing');
      await loadNext(res.sessionId);
    } catch (e) {
      // The commonest failure here is a 400 for an age band with no scorable items, which is a real
      // condition rather than a bug, so it is surfaced verbatim.
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [ageBand, precisionIndex, seed, loadNext]);

  const reset = useCallback(() => {
    setSessionId(null);
    setServe(null);
    setState(null);
    setResult(null);
    setAnswerCount(0);
    setFrameReady(false);
    setError(null);
    setPhase('idle');
  }, []);

  // Hand the item over once the frame says it is ready, then tint it.
  useEffect(() => {
    if (!frameReady || !serve) return;
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ source: QBANK_HOST, type: 'init', item: serve.served }, '*');
    win.postMessage({ source: QBANK_HOST, type: 'start', tutorial: false }, '*');
    applyPalette();
  }, [frameReady, serve, applyPalette]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (!isQbankMessage(ev.data)) return;
      if (ev.data.type === 'ready') {
        setFrameReady(true);
        return;
      }
      if (ev.data.type !== 'result') return;
      const id = live.current.sessionId;
      if (!id) return;

      void (async () => {
        const response = (ev.data as { result?: { response?: unknown } }).result?.response;
        try {
          const out = await api<{ state: SessionState }>(`/bank/sessions/${id}/answer`, {
            response,
            latencyMs: Date.now() - shownAt.current,
          });
          setState(out.state);
          setAnswerCount((n) => {
            const next = n + 1;
            handlers.current.onAnswer?.(next);
            return next;
          });
          if (out.state.stopped) finish(out.state);
          else await loadNext(id);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setPhase('error');
        }
      })();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loadNext, finish]);

  const step = summary?.precisionSteps[precisionIndex];

  return {
    summary,
    phase,
    serve,
    state,
    result,
    error,
    frameReady,
    /** Ticks on every answer regardless of outcome. Key rewards off this. */
    answerCount,
    /** 1-based number of the item on screen. */
    itemNumber: (state?.itemsServed ?? 0) + 1,
    /** Rough progress for a bar, using the step's own maximum. */
    progress: step ? Math.min(1, (state?.itemsServed ?? 0) / Math.max(1, step.maxItems)) : 0,
    expectedItems: step ? { min: step.minItems, max: step.maxItems } : null,
    frameRef,
    onFrameLoad: applyPalette,
    start,
    reset,
    sessionId,
  };
}
