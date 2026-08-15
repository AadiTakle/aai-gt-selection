import { useCallback, useEffect, useRef, useState } from 'react';

import { demoAnswer, demoCreateSession, demoNext } from './demoSession';
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
 * CORRECTNESS NOW REACHES THE GAME, BY DECISION, AND ONLY AFTER THE ANSWER IS COMMITTED.
 *
 * This hook used to delete `correct` before returning, and the contract still warns that a caller putting it
 * in front of a child should think twice. The owner has asked for it: right and wrong are told, right pays
 * double and sounds better. What that buys is a game worth playing, which a stealth screener depends on more
 * than it depends on any single psychometric nicety — a child who quits after four questions is measured not
 * at all.
 *
 * What it costs, written down rather than discovered later:
 *
 *   - **The bank is now leakable.** A child who plays the same station repeatedly learns which option was
 *     keyed, and a child who talks to another child spreads it. Exposure control damps how often an item is
 *     reused but does not prevent it.
 *   - **Behaviour changes mid-measurement.** Feedback is famously double-edged; roughly a third of the
 *     interventions in Kluger & DeNisi's meta-analysis lowered performance. A child who learns they are
 *     getting them wrong at 60% — which is what maximising information *means* — may try less hard, and that
 *     lands in the ability estimate as though it were ability.
 *   - **The reward is now informative about correctness**, so paying double is a second channel telling a
 *     child the same thing. `Cradle.tsx`'s "earned by taking part, never by being right" no longer holds.
 *
 * The one thing that is NOT given up: the answer is scored server-side before any of this is known here. The
 * child commits, the platform marks, and only then does the browser learn the outcome — so feedback cannot
 * change the response it is feedback about. That ordering is what keeps the measurement honest, and it is
 * also the only kind of feedback the learning literature is unambiguously positive about.
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

/**
 * `?demo=1`: run the whole session on the page, and touch nothing deployed.
 *
 * ══ WHY A URL PARAMETER ═══════════════════════════════════════════════════════════════════════════
 *
 * A demo has to be decidable by whoever is about to give it, on a machine they may not have configured, seconds
 * before they present. A build flag cannot do that — it would mean two deployments and the risk of showing the
 * wrong one. A link can.
 *
 * Read ONCE at module load rather than per call, so the mode cannot change halfway through a session and leave
 * half a trace on the platform and half in memory.
 *
 * ══ WHAT "ISOLATED" MEANS HERE, PRECISELY ═════════════════════════════════════════════════════════
 *
 * In demo mode this module makes no request to the platform at all: no session is created, no answer is posted,
 * no api key is sent, and nothing is written anywhere that outlives the tab. The only network access on that
 * path is `demoSession`'s fetch of its own static asset from the origin the page was served from. So a demo
 * cannot create a persona, cannot contaminate exposure counts, cannot appear in anybody's outreach queue, and
 * cannot be affected by the platform being down, misconfigured, or absent.
 *
 * The cost, stated once here and again in `demoSession`: the answer keys are in that asset, because scoring
 * locally requires them locally. Demo mode shows the instrument to adults. It does not measure children.
 */
const DEMO = (() => {
  try {
    if (typeof window === 'undefined') return false;
    const flag = new URLSearchParams(window.location.search).get('demo');
    return flag === '1' || flag === 'true';
  } catch {
    // A window without a parsable location is not a demo. Failing closed means falling back to the platform,
    // which is the path that is actually configured and monitored.
    return false;
  }
})();

/** Whether this page is running the isolated demo rather than talking to the platform. */
export function isDemo(): boolean {
  return DEMO;
}

/**
 * NOTE ON READING, since the code that asked about it is gone.
 *
 * This hook used to fetch the app's `maxReadingBand` from `/v1/catalog/app` so a presentation could choose
 * between setting a word and drawing it. `wordPlate.tsx` now sets words unconditionally, and does it better than
 * the glyph fallback ever could, so nothing asks any more and the request has been removed — it was also the one
 * network call demo mode could not make.
 *
 * The latent inconsistency is worth recording rather than leaving to be discovered: an app registered with
 * `maxReadingBand: 'none'` would still be shown words, because the presentation no longer consults it. The
 * platform continues to intersect that field when choosing items, so the POOL is still correct; only the
 * rendering ignores it. Bramblebrook declares '2-3', so nothing is wrong today.
 */

export type Phase = 'idle' | 'opening' | 'asking' | 'settling' | 'closed' | 'error';

/**
 * Whether this visit is over, given what the platform said and how many questions have been asked here.
 *
 * A free function rather than a branch inside the timer, because the two reasons a station closes are easy to
 * confuse and this is where the difference lives. `stopped` is the platform's: the child has been measured and
 * there are no more questions for them at all. `roundLength` is the game's: this visit asked what it came to
 * ask, and the child will be back. The session outlives the round, so the second must not be mistaken for the
 * first anywhere that decides whether to open a station again.
 */
export function visitOver(
  state: { stopped: boolean },
  askedHere: number,
  roundLength: number | undefined,
): boolean {
  if (state.stopped) return true;
  return roundLength !== undefined && askedHere >= roundLength;
}

export interface Sortie {
  phase: Phase;
  serve: Serve | null;
  state: SortieState | null;
  error: string | null;
  answered: number;
  /**
   * Whether the last answer was the keyed one, or `null` when nothing has been answered yet or the platform
   * could not mark it. `null` is not "wrong": an unmarkable response — a tap too fast to be an attempt, or an
   * item whose scoring rule is not written — must not be shown to a child as a miss.
   */
  lastCorrect: boolean | null;
  sessionId: string | null;
  open: () => Promise<void>;
  /**
   * `flags` are markers the presentation attached, e.g. `no-audio` when a spoken item had no voice. The
   * platform honours an allowlist of them and records such a response as unscorable rather than wrong.
   */
  answer: (option: OptionRef, flags?: readonly string[]) => Promise<void>;
}

export function useSortie(opts: {
  battery: Battery;
  /** This station's battery, narrowed against what the app is approved to serve. */
  types: readonly string[];
  settleMs?: number;
  /**
   * How many questions one visit to a station asks before the round closes.
   *
   * The session is longer than the round and outlives it — the platform decides when a child has been
   * measured, and this only decides when *this visit* ends. Left undefined, a round runs until the session
   * itself stops, which is what every caller did before stations had a set length.
   */
  roundLength?: number;
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
  const { types, settleMs = 900, keeperId = 'anon', battery, roundLength } = opts;

  const [phase, setPhase] = useState<Phase>('idle');
  const [serve, setServe] = useState<Serve | null>(null);
  const [state, setState] = useState<SortieState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answered, setAnswered] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  /**
   * Answers given at this station on this visit, as a ref rather than the `answered` state.
   *
   * `advance` runs from a timer whose closure captured `answered` before the answer landed, so reading state
   * there would compare a stale count against the round length and overshoot by one every time.
   */
  const inRound = useRef(0);

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
    const next = DEMO
      ? ((await demoNext(sid)) as { done: boolean; state: SortieState } & Partial<Serve>)
      : await api<{ done: boolean; state: SortieState } & Partial<Serve>>(
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
    setLastCorrect(null);
    inRound.current = 0;
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
      const res = DEMO
        ? await demoCreateSession({ personaId: keeperId, types })
        : await api<{ sessionId: string; state: SortieState }>('/api/bank/sessions', {
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
    async (option: OptionRef, flags?: readonly string[]) => {
      const sid = id.current;
      // Guarded because a child taps twice, and the second tap would otherwise answer the next item
      // with the previous item's choice.
      if (!sid || busy.current || phase !== 'asking') return;
      busy.current = true;
      setPhase('settling');
      try {
        // Both paths, because scoreResponse marks a numeric key against selectedIndex and a string key
        // against key, and the two never meet. Sending one loses a whole family of types.
        const response = { key: option.key, selectedKey: option.key, selectedIndex: option.index };
        const raw = DEMO
          ? ((await demoAnswer(sid, response)) as unknown as Record<string, unknown>)
          : await api<Record<string, unknown>>(`/api/bank/sessions/${sid}/answer`, {
              response,
              latencyMs: Date.now() - shownAt.current,
              ...(flags && flags.length > 0 ? { flags } : {}),
            });
        if (!alive.current) return;

        /**
         * The outcome, as the platform marked it. `undefined` and `null` both mean "not marked" and are kept
         * distinct from `false` all the way to the screen: a child who was not scored has not missed.
         */
        setLastCorrect(typeof raw.correct === 'boolean' ? raw.correct : null);

        setState(raw.state as SortieState);
        setAnswered((n) => n + 1);
        inRound.current += 1;

        const advance = () => {
          busy.current = false;
          if (!alive.current) return;
          /**
           * Closing here rather than fetching one more question and abandoning it matters: `next` writes the
           * served row before the child answers, and an unanswered row is re-issued on the next visit *and*
           * suppresses the stop rule until it is answered. Deciding before the fetch keeps the round clean.
           */
          if (visitOver(raw.state as SortieState, inRound.current, roundLength)) {
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
    [phase, loadNext, settleMs, roundLength],
  );

  return { phase, serve, state, error, answered, lastCorrect, sessionId, open, answer };
}
