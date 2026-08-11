import { useCallback, useEffect, useRef, useState } from 'react';

import type { Battery } from './batteries';
import type { OptionRef, Serve, SortieState } from './types';

/**
 * One sortie: a short run of questions at a station, dressed in-world as a care verb.
 *
 * Now served by the question platform rather than by the local Express prototype and this app's Vite plugin.
 * The paths and payloads are `@gt/qbank`'s wire contract, which this hook already spoke — what changed is
 * what stands behind them, and three of the reasons this file used to give are now obsolete:
 *
 * WHY A BATTERY IS STILL A RESTRICTION, but no longer a workaround. It used to be one: the prototype engine
 * kept a single pooled posterior and discarded an item's domain at update time, so the only way to get a
 * per-battery number was to run a whole session inside one battery. The platform keeps four domain posteriors
 * and a composite, so per-battery estimates come out of one session for free. Restricting a sortie to one
 * battery is now a *game* decision — a child walks to the tide ledge and answers tide-ledge questions — and
 * not a measurement compromise.
 *
 * WHY NO THRESHOLD. This app used to steer difficulty by moving the ability threshold to the child's running
 * mean, which turned a classifier into a measurer and had the documented consequence that the confidence bars
 * never fired and every sortie ended at the item cap. The platform is server-authoritative on measurement
 * configuration: the threshold, the precision and the per-domain minimum come from the registered app, and a
 * client cannot move them. A client that could lower its own bar could manufacture a recommendation.
 *
 * WHY NO CHUNK ROUTE. A burst is no longer a session. One session per keeper spans every visit, so the trace
 * accumulates and the interval actually narrows; `/sanctuary/chunk` and `/sanctuary/close` existed to carry
 * ability between separate sessions and have nothing left to carry.
 *
 * CORRECTNESS STILL NEVER REACHES THE GAME. The contract returns `correct` on an answer, with its own note
 * that a caller putting it in front of a child should think twice. This hook deletes it before returning, so
 * nothing downstream can pay out on accuracy because it is not there to read.
 */

/**
 * Where the platform is, and who is asking.
 *
 * Both come from Vite's environment so that pointing the game at a deployed stack is configuration rather
 * than a code change: set `VITE_GT_PLATFORM_URL` and `VITE_GT_APP_KEY`. The defaults are the local dev
 * server. The key identifies the app, not a person, and is embedded in the client exactly as it would be in
 * a Roblox place — which is why the platform trusts it for identity and nothing else.
 */
// Read through a cast rather than by adding `vite/client` to the shared tsconfig, which would change the
// compilation of every app in this workspace to configure one.
const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const PLATFORM_URL = viteEnv.VITE_GT_PLATFORM_URL ?? '/platform';
const APP_KEY = viteEnv.VITE_GT_APP_KEY ?? '';

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${PLATFORM_URL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': APP_KEY },
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
  /** This station's battery, narrowed against what the app is approved to serve. */
  types: readonly string[];
  settleMs?: number;
  /**
   * The keeper this sortie belongs to, carried as the platform's persona.
   *
   * It is what makes ability accumulate across visits and what stops a returning child being re-asked items
   * they have already seen. Pseudonymous: the platform stores no contact details for a Bramblebrook keeper.
   */
  keeperId?: string;
  /**
   * Accepted and ignored, so the harness compiles.
   *
   * Threshold, precision, item exclusion and difficulty range were this app's levers when it drove a local
   * engine. The platform resolves all four from the registered app and refuses to take them from a client, so
   * passing them here changes nothing. `SortieHarness`'s threshold slider is inert as a result; measuring
   * against a pinned threshold is now a job for the platform's own simulation harness, which can set one.
   */
  threshold?: number;
  excludeItemIds?: readonly string[];
  difficultyRange?: readonly [number, number];
  precisionIndex?: number;
  steered?: boolean;
}): Sortie {
  const { types, settleMs = 900, keeperId = 'anon', battery } = opts;

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
      `/api/bank/sessions/${sid}/next`,
    );
    if (!alive.current) return;
    setState(next.state);
    // Nothing to close: the session outlives the burst, so a keeper walking away leaves it open for the
    // next visit rather than ending it.
    if (next.done || !next.served) {
      setServe(null);
      setPhase('closed');
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
       * One session per keeper, resumed rather than recreated.
       *
       * The platform holds the trace, so a keeper returning to a station continues the session they already
       * have: `next` on an open session serves the next question, and the estimate keeps narrowing across
       * visits instead of restarting from the prior at every burst.
       *
       * `types` narrows the pool to this station's battery, and the platform intersects it with what the app
       * is approved to serve — an unapproved code is refused rather than quietly dropped, so a typo cannot
       * shrink a child's pool unnoticed.
       */
      const res = await api<{ sessionId: string; state: SortieState }>('/api/bank/sessions', {
        types,
        ...(keeperId ? { personaId: keeperId } : {}),
      });
      if (!alive.current) return;
      id.current = res.sessionId;
      setSessionId(res.sessionId);
      setState(res.state);
      await loadNext(res.sessionId);
    } catch (e) {
      if (!alive.current) return;
      setError(String((e as Error).message ?? e));
      setPhase('error');
    }
  }, [types, keeperId, loadNext]);

  const answer = useCallback(
    async (option: OptionRef) => {
      const sid = id.current;
      // Guarded because a child taps twice, and the second tap would otherwise answer the next item
      // with the previous item's choice.
      if (!sid || busy.current || phase !== 'asking') return;
      busy.current = true;
      setPhase('settling');
      try {
        const raw = await api<Record<string, unknown>>(`/api/bank/sessions/${sid}/answer`, {
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
