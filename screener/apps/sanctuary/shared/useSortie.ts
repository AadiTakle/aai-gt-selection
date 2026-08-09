import { useCallback, useEffect, useRef, useState } from 'react';

import type { Battery } from './batteries';
import type { OptionRef, Serve, SortieState } from './types';

/**
 * One sortie: a short single-battery measurement, dressed in-world as a care verb.
 *
 * WHY SINGLE-BATTERY. The engine is unidimensional. One `Posterior`, one scalar theta, and the item's
 * domain is discarded at update time, so a mixed session cannot yield four estimates. Restricting the
 * pool to one battery's types makes the session's own estimate a per-battery estimate, which is why
 * this app needs no engine change. `coverageMet` already passes a domain absent from the pool.
 *
 * WHY NO ageBand. Age band and difficulty are the same axis in this bank: every K-1 item sits at b
 * between -3.17 and -2.04, so a band-locked session only ever administers items the child will pass
 * and the posterior never narrows. Difficulty is steered by `abilityThreshold` instead, because
 * `nextItem()` maximises information AT THE THRESHOLD rather than at the estimate. Setting the
 * threshold to the child's running per-battery mean turns a classifier into a measurer.
 *
 * EXPECTED CONSEQUENCE, not a bug: with the threshold tracking the estimate, pAbove sits near 0.5, so
 * the asymmetric confidence bars never fire and `stopReason` is always `item-cap`. Sortie length is
 * therefore set by the precision step, which is what a game wants.
 *
 * CORRECTNESS NEVER REACHES THE GAME. `/answer` returns `correct`, and this hook deletes it before
 * returning. Nothing downstream can pay out on accuracy, because it is not there to read. The ledger
 * is harvested server to server from `/debug` instead. This is enforced by wiring rather than by
 * comment, and `verify-sanctuary.ts` asserts the returned object has no `correct` property.
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

export type Phase = 'idle' | 'opening' | 'asking' | 'settling' | 'closed' | 'error';

export interface Sortie {
  phase: Phase;
  serve: Serve | null;
  state: SortieState | null;
  error: string | null;
  answered: number;
  sessionId: string | null;
  open: () => Promise<void>;
  answer: (option: OptionRef) => Promise<void>;
}

export function useSortie(opts: {
  battery: Battery;
  types: readonly string[];
  /** Where to concentrate information. The child's running per-battery mean, in logits. */
  threshold: number;
  /** Every itemId this battery has already served this keeper. Selection is deterministic, so
   *  without this a returning child re-answers yesterday's items and the estimate double-counts. */
  excludeItemIds?: readonly string[];
  difficultyRange?: readonly [number, number];
  precisionIndex?: number;
  settleMs?: number;
  /**
   * Let the server pick the difficulty. On in the game, off in `SortieHarness`, which drives sessions
   * directly to check the measurement rather than to play and needs to pin the threshold to do so.
   */
  steered?: boolean;
  keeperId?: string;
}): Sortie {
  const {
    types,
    threshold,
    excludeItemIds,
    difficultyRange,
    precisionIndex = 1,
    settleMs = 900,
    steered = false,
    keeperId = 'anon',
    battery,
  } = opts;

  const [phase, setPhase] = useState<Phase>('idle');
  const [serve, setServe] = useState<Serve | null>(null);
  const [state, setState] = useState<SortieState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answered, setAnswered] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const id = useRef<string | null>(null);
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

  const loadNext = useCallback(async (sid: string) => {
    const next = await api<{ done: boolean; state: SortieState } & Partial<Serve>>(
      `/bank/sessions/${sid}/next`,
    );
    if (!alive.current) return;
    setState(next.state);
    if (next.done || !next.served) {
      setServe(null);
      setPhase('closed');
      /**
       * Tell the server the chunk is over so it can harvest the posterior and steer the next one. Sent
       * fire-and-forget: this is the moment a child sees their slime hatch, and a failed housekeeping
       * call must never hold that up or surface an error to them. A dropped close costs one chunk of
       * steering, which is invisible; a blocked hatch is not.
       */
      if (steered && id.current) {
        void fetch('/sanctuary/close', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId: id.current }),
        }).catch(() => {});
      }
      return;
    }
    setServe(next as Serve);
    shownAt.current = Date.now();
    setPhase('asking');
  }, []);

  const open = useCallback(async () => {
    setError(null);
    setAnswered(0);
    setPhase('opening');
    try {
      /**
       * OPENED THROUGH `/sanctuary/chunk`, NOT BY CREATING A SESSION HERE.
       *
       * The threshold is the difficulty dial — measured, `thresholdInBankScale = threshold * 3 + 10.5` —
       * and it must track what the child has been doing or nothing adapts. But this layer is deliberately
       * blind to correctness (see `delete raw.correct` below), and an ability estimate hands correctness
       * over by subtraction: a mean that went up means the last answer was right. So the plugin picks the
       * threshold from its own server-side record and returns nothing but a session id.
       *
       * `threshold`, `excludeItemIds` and `difficultyRange` stay in the options for the harness, which
       * drives sessions directly to check the measurement rather than to play. In the game they are
       * ignored, and that is the point: the game does not get a say in how hard the next question is.
       */
      let sid: string;
      if (steered) {
        const r = await fetch('/sanctuary/chunk', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ keeperId, battery, types, precisionIndex }),
        });
        if (!r.ok) throw new Error(`chunk -> ${r.status}`);
        sid = ((await r.json()) as { sessionId: string }).sessionId;
      } else {
        const res = await api<{ sessionId: string; state: SortieState }>('/bank/sessions', {
          types,
          abilityThreshold: threshold,
          precisionIndex,
          perDomainMinimum: 1,
          // No ageBand, deliberately. See the header.
          ...(excludeItemIds?.length ? { excludeItemIds } : {}),
          ...(difficultyRange ? { difficultyRange } : {}),
          seed: Math.floor(Math.random() * 1e6),
        });
        sid = res.sessionId;
        setState(res.state);
      }
      if (!alive.current) return;
      id.current = sid;
      setSessionId(sid);
      await loadNext(sid);
    } catch (e) {
      if (!alive.current) return;
      setError(String((e as Error).message ?? e));
      setPhase('error');
    }
  }, [types, threshold, precisionIndex, excludeItemIds, difficultyRange, loadNext]);

  const answer = useCallback(
    async (option: OptionRef) => {
      const sid = id.current;
      // Guarded because a child taps twice, and the second tap would otherwise answer the next item
      // with the previous item's choice.
      if (!sid || busy.current || phase !== 'asking') return;
      busy.current = true;
      setPhase('settling');
      try {
        const raw = await api<Record<string, unknown>>(`/bank/sessions/${sid}/answer`, {
          // Both paths, because scoreResponse marks a numeric key against selectedIndex and a string
          // key against key, and the two never meet. Sending one loses a whole family of types.
          response: { key: option.key, selectedKey: option.key, selectedIndex: option.index },
          latencyMs: Date.now() - shownAt.current,
        });
        if (!alive.current) return;

        // The single most important line in this file.
        delete raw.correct;

        setState(raw.state as SortieState);
        setAnswered((n) => n + 1);

        const advance = () => {
          busy.current = false;
          if (!alive.current) return;
          if ((raw.state as SortieState).stopped) {
            setServe(null);
            setPhase('closed');
          } else {
            void loadNext(sid).catch((e) => {
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

  return { phase, serve, state, error, answered, sessionId, open, answer };
}
