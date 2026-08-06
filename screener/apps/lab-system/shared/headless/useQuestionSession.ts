import { useCallback, useEffect, useRef, useState } from 'react';

import type { AgeBand, BankSummary, SessionState } from '../types';
import { adapt, declineResponse, responseFor, type Choice, type Question } from './adapt';

/**
 * The session loop, headless.
 *
 * No iframe, no library renderer, no postMessage. The app receives a normalised {@link Question} and
 * draws it however it likes; answering is a function call. That is the whole difference from the
 * iframe version, and it is what lets a question become Minecraft blocks or a Pokéball throw rather
 * than a generic exam widget in a themed border.
 *
 * CORRECTNESS IS RETURNED HERE, unlike the iframe hook. A game needs it: building the next layer of a
 * house when the answer was right, and nothing happening when it was not, is the loop that makes a
 * child want the next question. The rule that still holds is that a wrong answer never takes anything
 * away and never closes a door. Progress stalls; it does not reverse, and there is no failure state.
 *
 * DECLINED ITEMS ARE INVISIBLE. Two of the sixteen types the engine serves cannot be presented as a
 * choice (see UNPRESENTABLE in adapt.ts). When one arrives the hook posts a response the server cannot
 * mark, which the engine counts as unscorable and excludes from the estimate, then immediately fetches
 * the next item. The child never sees a gap.
 */

export type Phase = 'idle' | 'starting' | 'asking' | 'finished' | 'error';

export interface SessionResult {
  readonly decision: string | null;
  readonly itemsServed: number;
  readonly unscorable: number;
  readonly estimate: number;
  readonly interval: readonly [number, number];
  readonly perDomain: Record<string, number>;
  readonly stopReason: string | null;
  /** How many the child got right, which is the app's progress currency. */
  readonly correct: number;
  readonly asked: number;
}

export interface UseQuestionSessionOptions {
  readonly ageBand?: AgeBand;
  readonly precisionIndex?: number;
  readonly seed?: number;
  /** Fired after every answer. `correct` may be null when the server could not mark it. */
  readonly onAnswered?: (info: { correct: boolean | null; asked: number; correctCount: number }) => void;
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

interface NextPayload {
  done: boolean;
  state: SessionState;
  served?: { itemId: string; typeCode: string; difficulty: number; content: Record<string, unknown> };
  typeCode?: string;
  domain?: string;
  difficulty?: number;
  informationAtThreshold?: number;
  selectionReason?: string;
}

export function useQuestionSession(options: UseQuestionSessionOptions = {}) {
  const { ageBand, precisionIndex = 1, seed, onAnswered, onFinished } = options;

  const [summary, setSummary] = useState<BankSummary | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [question, setQuestion] = useState<Question | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [asked, setAsked] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [declined, setDeclined] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sessionId = useRef<string | null>(null);
  const shownAt = useRef(Date.now());
  const tally = useRef({ asked: 0, correct: 0 });
  const handlers = useRef({ onAnswered, onFinished });

  useEffect(() => {
    handlers.current = { onAnswered, onFinished };
  }, [onAnswered, onFinished]);

  useEffect(() => {
    let cancelled = false;
    api<BankSummary>('/bank')
      .then((s) => !cancelled && setSummary(s))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = useCallback((next: SessionState) => {
    const out: SessionResult = {
      decision: next.decision,
      itemsServed: next.itemsServed,
      unscorable: next.unscorable,
      estimate: next.estimate,
      interval: next.interval,
      perDomain: next.perDomain,
      stopReason: next.stopReason,
      correct: tally.current.correct,
      asked: tally.current.asked,
    };
    setQuestion(null);
    setResult(out);
    setPhase('finished');
    handlers.current.onFinished?.(out);
  }, []);

  /**
   * Fetch until something presentable arrives.
   *
   * Bounded, because a session whose remaining pool is entirely undrawable would otherwise spin. The
   * bound is generous relative to the longest configured session and the loop exits on `done` anyway.
   */
  const advance = useCallback(
    async (id: string) => {
      for (let guard = 0; guard < 40; guard++) {
        const next = await api<NextPayload>(`/bank/sessions/${id}/next`);
        setState(next.state);
        if (next.done || !next.served) {
          finish(next.state);
          return;
        }
        const asQuestion = adapt({
          served: next.served,
          typeCode: next.typeCode ?? next.served.typeCode,
          domain: next.domain ?? '',
          difficulty: next.difficulty ?? next.served.difficulty,
          informationAtThreshold: next.informationAtThreshold ?? 0,
          selectionReason: next.selectionReason ?? '',
        });
        if (asQuestion) {
          setQuestion(asQuestion);
          shownAt.current = Date.now();
          return;
        }
        // Cannot be drawn here. Decline it and keep going without showing the child anything.
        setDeclined((n) => n + 1);
        const out = await api<{ state: SessionState }>(`/bank/sessions/${id}/answer`, {
          response: declineResponse(),
          latencyMs: 0,
        });
        setState(out.state);
        if (out.state.stopped) {
          finish(out.state);
          return;
        }
      }
      setError('Ran out of presentable questions.');
      setPhase('error');
    },
    [finish],
  );

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setQuestion(null);
    setLastCorrect(null);
    setAsked(0);
    setCorrectCount(0);
    setDeclined(0);
    tally.current = { asked: 0, correct: 0 };
    setPhase('starting');
    try {
      const body: Record<string, unknown> = { precisionIndex };
      if (ageBand) body.ageBand = ageBand;
      body.seed = seed ?? Math.floor(Math.random() * 1e6);
      const res = await api<{ sessionId: string; state: SessionState }>('/bank/sessions', body);
      sessionId.current = res.sessionId;
      setState(res.state);
      setPhase('asking');
      await advance(res.sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [ageBand, precisionIndex, seed, advance]);

  /** Answer the question on screen. Returns whether it was right, so a caller can animate on it. */
  const answer = useCallback(
    async (choice: Choice): Promise<boolean | null> => {
      const id = sessionId.current;
      if (!id || busy) return null;
      setBusy(true);
      try {
        const out = await api<{ state: SessionState; correct: boolean | null }>(
          `/bank/sessions/${id}/answer`,
          { response: responseFor(choice), latencyMs: Date.now() - shownAt.current },
        );
        setState(out.state);
        setLastCorrect(out.correct);
        tally.current = {
          asked: tally.current.asked + 1,
          correct: tally.current.correct + (out.correct === true ? 1 : 0),
        };
        setAsked(tally.current.asked);
        setCorrectCount(tally.current.correct);
        handlers.current.onAnswered?.({
          correct: out.correct,
          asked: tally.current.asked,
          correctCount: tally.current.correct,
        });
        if (out.state.stopped) finish(out.state);
        else await advance(id);
        return out.correct;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase('error');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [busy, advance, finish],
  );

  const reset = useCallback(() => {
    sessionId.current = null;
    tally.current = { asked: 0, correct: 0 };
    setQuestion(null);
    setState(null);
    setResult(null);
    setLastCorrect(null);
    setAsked(0);
    setCorrectCount(0);
    setDeclined(0);
    setError(null);
    setPhase('idle');
  }, []);

  const step = summary?.precisionSteps[precisionIndex];

  return {
    summary,
    phase,
    question,
    state,
    result,
    error,
    /** Whether the last answer was right. Null when the server could not mark it. */
    lastCorrect,
    asked,
    correctCount,
    /** Items the engine served that this surface could not draw. Diagnostic, not for display. */
    declined,
    /** True while an answer is in flight, so a UI can lock its controls. */
    busy,
    expectedItems: step ? { min: step.minItems, max: step.maxItems } : null,
    start,
    answer,
    reset,
  };
}
