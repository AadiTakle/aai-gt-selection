import { useCallback, useEffect, useRef, useState } from 'react';

import type { AgeBand, BankSummary, Serve, SessionConfig, SessionState } from './types';

/**
 * The session loop, written once so every experience inherits the same adaptive machinery.
 *
 * The loop is the one from `apps/web/src/BankScreener.tsx`, with the frame handshake removed. That
 * reference embeds each item as a prebuilt HTML renderer in an iframe and talks to it over
 * postMessage. This lab draws every item itself from the headless `content`, so the two postMessage
 * hops and the ready-gate disappear entirely and an answer is a plain function call.
 *
 * WHAT THAT BUYS, since it is the point of the exercise. A themed iframe can only be retinted: the
 * host sets CSS custom properties on the item's document, so a teal star becomes a crimson star and
 * never becomes a dragon egg. Drawing from `content` instead means the item's structure is the only
 * thing fixed, and what depicts it is ours. See the handoff for the full argument.
 *
 * WHAT IT COSTS. A renderer has to exist for every type the engine might serve, and the session
 * config has no way to restrict which types that is: QbankSessionConfig takes ageBand and nothing
 * else. The workaround is upstream of this hook. The lab's API instance runs with GT_QBANK_BANKS
 * pointed at a curated directory holding only the eight types this lab draws. Also in the handoff.
 */

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export type Phase = 'idle' | 'starting' | 'asking' | 'settling' | 'done' | 'error';

export interface ScreenerSession {
  phase: Phase;
  serve: Serve | null;
  state: SessionState | null;
  summary: BankSummary | null;
  error: string | null;
  /** How many items have been answered, for progress a child can read. */
  answeredCount: number;
  /** Best guess at the total, from the precision step. A range, so treat it as soft. */
  expected: { min: number; max: number } | null;
  start: () => Promise<void>;
  answer: (key: string) => Promise<void>;
  reset: () => void;
}

/**
 * settleMs is the beat between answering and the next question arriving. It exists so an experience
 * can play a reaction: a creature nodding, a lamp lighting. Without it the next item replaces the
 * last one instantly and the world never gets to respond, which is most of what makes these feel
 * like a game rather than a form.
 */
export function useScreenerSession(opts: {
  band: AgeBand;
  precisionIndex: number;
  settleMs?: number;
  config?: Omit<SessionConfig, 'ageBand' | 'precisionIndex'>;
}): ScreenerSession {
  const { band, precisionIndex, settleMs = 900 } = opts;

  const [phase, setPhase] = useState<Phase>('idle');
  const [serve, setServe] = useState<Serve | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [summary, setSummary] = useState<BankSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  const sessionId = useRef<string | null>(null);
  const shownAt = useRef(Date.now());
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    let ok = true;
    api<BankSummary>('/bank')
      .then((s) => {
        if (ok) setSummary(s);
      })
      .catch(() => {
        /* the launcher copes without a summary; it only feeds the length hint */
      });
    return () => {
      ok = false;
    };
  }, []);

  const loadNext = useCallback(async (id: string) => {
    const next = await api<{ done: boolean; state: SessionState } & Partial<Serve>>(
      `/bank/sessions/${id}/next`,
    );
    if (!alive.current) return;
    setState(next.state);
    if (next.done || !next.served) {
      setServe(null);
      setPhase('done');
      return;
    }
    setServe(next as Serve);
    shownAt.current = Date.now();
    setPhase('asking');
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setAnsweredCount(0);
    setPhase('starting');
    try {
      const res = await api<{ sessionId: string; state: SessionState; poolSize?: number }>(
        '/bank/sessions',
        { ageBand: band, precisionIndex, seed: Math.floor(Math.random() * 1e6), ...opts.config },
      );
      if (!alive.current) return;
      sessionId.current = res.sessionId;
      setState(res.state);
      await loadNext(res.sessionId);
    } catch (e) {
      if (!alive.current) return;
      // A band with no scorable items comes back as a 400 rather than an empty session, so this
      // path is reachable by configuration rather than only by outage.
      setError(String((e as Error).message ?? e));
      setPhase('error');
    }
  }, [band, precisionIndex, loadNext, opts.config]);

  const answer = useCallback(
    async (key: string) => {
      const id = sessionId.current;
      // Guarded because a child will tap twice, and the second tap would otherwise answer the next
      // question with the previous question's choice.
      if (!id || busy.current || phase !== 'asking') return;
      busy.current = true;
      setPhase('settling');
      try {
        const out = await api<{ state: SessionState; correct: boolean | null }>(
          `/bank/sessions/${id}/answer`,
          { response: { key }, latencyMs: Date.now() - shownAt.current },
        );
        if (!alive.current) return;
        setState(out.state);
        setAnsweredCount((n) => n + 1);

        const advance = () => {
          busy.current = false;
          if (!alive.current) return;
          if (out.state.stopped) {
            setServe(null);
            setPhase('done');
          } else {
            void loadNext(id).catch((e) => {
              setError(String((e as Error).message ?? e));
              setPhase('error');
            });
          }
        };
        timers.current.push(window.setTimeout(advance, settleMs));
      } catch (e) {
        busy.current = false;
        if (!alive.current) return;
        setError(String((e as Error).message ?? e));
        setPhase('error');
      }
    },
    [phase, loadNext, settleMs],
  );

  const reset = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    busy.current = false;
    sessionId.current = null;
    setServe(null);
    setState(null);
    setError(null);
    setAnsweredCount(0);
    setPhase('idle');
  }, []);

  const step = summary?.precisionSteps[precisionIndex];

  return {
    phase,
    serve,
    state,
    summary,
    error,
    answeredCount,
    expected: step ? { min: step.minItems, max: step.maxItems } : null,
    start,
    answer,
    reset,
  };
}
