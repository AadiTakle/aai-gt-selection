/**
 * The two IRT functions, imported from `irf` directly rather than through `@gt/engine`'s barrel.
 *
 * The barrel also exports `ScreenerSession`, which imports `@gt/item-library` — a package the game has no alias
 * for and no need of. Going through the barrel dragged the whole prototype item library into the client and broke
 * the production build outright. These two functions are pure arithmetic over `{a, b, c}` and nothing else.
 */
import { information, pCorrect } from '@gt/engine/irf';
import type { SortieState } from './types';

/**
 * The whole session loop, in the browser, with no network and no server.
 *
 * ══ WHY THIS EXISTS ═══════════════════════════════════════════════════════════════════════════════
 *
 * `?demo=1` has to work on a laptop on conference wifi, in a room with no AWS reachable, without touching a
 * single deployed resource or a single child's record. So demo mode is not "the platform with a flag set" — it
 * is a second implementation of the same three calls the platform serves, running entirely on the page.
 *
 * ══ WHAT IT IS NOT ════════════════════════════════════════════════════════════════════════════════
 *
 * Not a measurement. It selects by information at the threshold and updates a posterior, so it behaves like the
 * real thing and demonstrates honestly — but nothing is stored, nothing is re-scorable, no persona is linked,
 * no exposure is tracked across sessions, and reloading the page forgets the child entirely. A result from demo
 * mode is a demonstration of an instrument, not a reading of a person.
 *
 * **And the answer keys are in the bundle.** They have to be: scoring locally requires the keys locally, and
 * the alternative is a server. `platform/scripts/build-demo-bank.ts` says the same thing at the other end. Never
 * screen a child on this path.
 *
 * ══ ISOLATION, ENFORCED RATHER THAN INTENDED ══════════════════════════════════════════════════════
 *
 * The only fetch in this file is for its own static asset, from the same origin the page came from. There is no
 * api key, no session id that means anything outside this tab, and no code path that can reach the platform —
 * the provider that picks between the two never hands this module a URL to call.
 */

/** The bundled bank. Shape mirrors `build-demo-bank.ts`, deliberately: one writer, one reader. */
interface DemoItem {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: string;
  readonly difficulty: number;
  readonly b: number;
  readonly a: number;
  readonly c: number;
  readonly correctKey: string | number;
  readonly content: Record<string, unknown>;
}

let bankOnce: Promise<readonly DemoItem[]> | null = null;

/**
 * The bank, fetched once from the app's own origin.
 *
 * A static asset rather than a bundled import so the 293 KB does not sit in the main chunk and delay first
 * paint for the majority of players, who are not in demo mode. Still the same origin, so no cross-origin
 * request and nothing that can be blocked by a network that only allows the page itself.
 */
async function bank(): Promise<readonly DemoItem[]> {
  bankOnce ??= fetch('demo-bank.json')
    .then((r) => {
      if (!r.ok) throw new Error(`demo bank unavailable (${r.status})`);
      return r.json() as Promise<{ items: DemoItem[] }>;
    })
    .then((d) => d.items);
  return bankOnce;
}

/**
 * The bar the demo DECIDES against, matching `CRITERIA_V1` on the platform.
 *
 * Hardcoded rather than fetched, because fetching it would be a network call and because a demo that judged
 * against a different bar would demonstrate the wrong instrument. If the platform's bar moves, this moves with
 * it — a test asserts the two agree.
 *
 * This is NOT where questions are aimed. See `steer`.
 */
export const DEMO_THRESHOLD = 1.645;

/**
 * Where questions are AIMED, which is a different question from where the decision is made.
 *
 * The demo used to select at `DEMO_THRESHOLD`, which meant the very first question a visitor met was pitched at
 * the 95th percentile — bank difficulty 15.4 of 20 — and stayed there however they did. Two things wrong with
 * that. It is punishing: an adult demonstrating this got a run of items designed so that a gifted child would
 * miss a third of them. And it demonstrates the wrong thing: an adaptive instrument that never adapts looks like
 * a quiz.
 *
 * These numbers are Tiffany's, recovered from the steering the dev plugin used to do, and her reasoning holds:
 *
 *   "Deliberately below centre. Starting at 0 and walking DOWN means a young child's first contact with the
 *    game is a run of items too hard for them, which is the single worst first impression this can make. An
 *    over-easy start costs a couple of items of information; an over-hard one costs the child."
 *
 * The bank's authoring scale converts as `bank = logits * 3 + 10.5`, so a start of -1.5 is bank difficulty 6 and
 * the ceiling of 3 is 19.5 — which is what "they only went up to about 20" was describing.
 *
 * The real screener deliberately does NOT do this: it aims every question at the cut, because that is where
 * evidence about the cut comes from and it is measuring, not entertaining. A demo is entertaining.
 */
const STEER_START = -1.5;
const STEER_MIN = -3;
const STEER_MAX = 3;

/**
 * How much of the new estimate to take each time.
 *
 * Tiffany's again, and for the reason she gives: jumping the whole way to a three-item posterior swings
 * difficulty on what is mostly noise, and one lucky guess should not put a child at the ceiling. Two-thirds
 * moves visibly within a visit while still taking several answers to travel a long way.
 */
const STEER_LEARN = 0.66;

const clampSteer = (x: number): number => Math.max(STEER_MIN, Math.min(STEER_MAX, x));

/** How long a demo session runs before it declares a verdict, matching the app's registered budget. */
export const DEMO_MIN_ITEMS = 12;
export const DEMO_MAX_ITEMS = 24;
const CONFIDENCE_BELOW = 0.97;
const CONFIDENCE_ABOVE = 0.75;
const RECOMMEND_AT = 0.3;

/**
 * A posterior over ability on a fixed grid.
 *
 * A grid rather than a closed form because the 3PL likelihood has no conjugate prior, and 121 points over
 * [-4, 4] is both plenty for a decision at 1.645 and cheap enough to redo on every answer. The platform's
 * engine does the same thing for the same reason; this is a smaller copy of it rather than a different idea.
 */
const GRID = Array.from({ length: 121 }, (_, i) => -4 + (i * 8) / 120);

function normalPrior(): number[] {
  const w = GRID.map((t) => Math.exp(-(t * t) / 2));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}

interface Answered {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: string;
  readonly b: number;
  readonly a: number;
  readonly c: number;
  readonly correct: boolean;
}

export interface DemoSession {
  readonly sessionId: string;
  posterior: number[];
  /** Where the NEXT question is aimed, in logits. Starts below centre and follows the estimate. */
  steer: number;
  readonly answered: Answered[];
  readonly served: Set<string>;
  pending: DemoItem | null;
  restrictedTypes: readonly string[] | null;
  stopped: boolean;
}

const sessions = new Map<string, DemoSession>();

function mean(posterior: readonly number[]): number {
  return GRID.reduce((s, t, i) => s + t * (posterior[i] ?? 0), 0);
}

function probabilityAbove(posterior: readonly number[], threshold: number): number {
  return GRID.reduce((s, t, i) => (t > threshold ? s + (posterior[i] ?? 0) : s), 0);
}

function interval(posterior: readonly number[]): [number, number] {
  let acc = 0;
  let low = GRID[0] ?? -4;
  let high = GRID[GRID.length - 1] ?? 4;
  for (const [i, t] of GRID.entries()) {
    acc += posterior[i] ?? 0;
    if (acc >= 0.05 && low === (GRID[0] ?? -4)) low = t;
    if (acc >= 0.95) {
      high = t;
      break;
    }
  }
  return [low, high];
}

function update(posterior: readonly number[], item: Answered): number[] {
  const next = GRID.map((t, i) => {
    const p = pCorrect(t, { a: item.a, b: item.b, c: item.c });
    return (posterior[i] ?? 0) * (item.correct ? p : 1 - p);
  });
  const sum = next.reduce((a, b) => a + b, 0);
  return sum > 0 ? next.map((x) => x / sum) : [...posterior];
}

function stateOf(session: DemoSession): SortieState {
  const scored = session.answered.length;
  const pAbove = probabilityAbove(session.posterior, DEMO_THRESHOLD);
  const [low, high] = interval(session.posterior);

  /**
   * The same stop rule the platform applies, minus per-domain coverage.
   *
   * Coverage is left out deliberately rather than forgotten: it exists so a real decision cannot rest on one
   * battery, and a demo is walked through by a person who chooses which station to visit. Enforcing it would
   * make a demo stall at "answer six more of a kind you did not come here to show".
   */
  const enough = scored >= DEMO_MIN_ITEMS;
  const capped = scored >= DEMO_MAX_ITEMS;
  const confidentAbove = enough && pAbove >= CONFIDENCE_ABOVE;
  const confidentBelow = enough && pAbove <= 1 - CONFIDENCE_BELOW;
  const stopped = capped || confidentAbove || confidentBelow;

  return {
    stopped,
    stopReason: stopped ? (capped && !confidentAbove && !confidentBelow ? 'item-cap' : confidentAbove ? 'confident-above' : 'confident-below') : null,
    itemsServed: session.served.size,
    unscorable: 0,
    estimate: mean(session.posterior),
    interval: [low, high],
    pAbove,
    decision: stopped ? (pAbove >= RECOMMEND_AT ? 'recommend' : 'no-recommendation') : null,
  } as unknown as SortieState;
}

/** Create a session, or resume this tab's open one for the same keeper, mirroring the platform's behaviour. */
export async function demoCreateSession(input: {
  readonly personaId?: string | undefined;
  readonly types?: readonly string[] | undefined;
}): Promise<{ sessionId: string; state: SortieState }> {
  await bank();
  const key = `demo-${input.personaId ?? 'anon'}`;
  const existing = sessions.get(key);
  if (existing && !existing.stopped) {
    existing.restrictedTypes = input.types ?? null;
    return { sessionId: key, state: stateOf(existing) };
  }
  const session: DemoSession = {
    sessionId: key,
    posterior: normalPrior(),
    steer: STEER_START,
    answered: [],
    served: new Set(),
    pending: null,
    restrictedTypes: input.types ?? null,
    stopped: false,
  };
  sessions.set(key, session);
  return { sessionId: key, state: stateOf(session) };
}

/**
 * The next question: the most informative unseen item at the threshold, among the types this station serves.
 *
 * Randomesque rather than a strict argmax — one of the top few by information, chosen at random — because a
 * strict argmax shows the same demo to every audience and the same first question to the same audience twice.
 * That is the platform's own reasoning, in miniature.
 */
export async function demoNext(
  sessionId: string,
): Promise<{ done: boolean; state: SortieState } & Record<string, unknown>> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('no demo session');
  const state = stateOf(session);
  if (state.stopped) {
    session.stopped = true;
    return { done: true, state };
  }
  if (session.pending) {
    return { done: false, state, ...wire(session.pending, session.steer) };
  }

  const all = await bank();
  const eligible = all.filter(
    (item) =>
      !session.served.has(item.itemId) &&
      (session.restrictedTypes === null || session.restrictedTypes.includes(item.typeCode)),
  );
  if (eligible.length === 0) return { done: true, state };

  const ranked = [...eligible].sort(
    (x, y) =>
      information(session.steer, { a: y.a, b: y.b, c: y.c }) -
      information(session.steer, { a: x.a, b: x.b, c: x.c }),
  );
  const top = ranked.slice(0, Math.min(6, ranked.length));
  const chosen = top[Math.floor(Math.random() * top.length)] as DemoItem;
  session.pending = chosen;
  session.served.add(chosen.itemId);
  return { done: false, state, ...wire(chosen, session.steer) };
}

/**
 * The same shape the platform's `serve` returns.
 *
 * `correctKey` is deliberately not spread in. It is in the bundle and there is no hiding that, but a renderer
 * should never be able to read it off the payload it was handed — the platform guarantees that by never sending
 * it, and this keeps the same guarantee on this path so no presentation can come to depend on it being there.
 */
function wire(item: DemoItem, steer: number): Record<string, unknown> {
  return {
    served: { itemId: item.itemId, revision: 1, content: item.content },
    typeCode: item.typeCode,
    domain: item.domain,
    difficulty: item.difficulty,
    informationAtThreshold: information(steer, { a: item.a, b: item.b, c: item.c }),
    selectionReason: 'demo',
  };
}

/** Mark an answer and advance the posterior. Returns `correct` exactly as the platform's answer route does. */
export async function demoAnswer(
  sessionId: string,
  response: { key?: unknown; selectedKey?: unknown; selectedIndex?: unknown },
): Promise<{ correct: boolean | null; state: SortieState }> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('no demo session');
  const item = session.pending;
  if (!item) throw new Error('no question is pending');
  session.pending = null;

  /**
   * The two channels, because a numeric key addresses a POSITION and a letter key addresses a LABEL, and
   * comparing one against the other marks a whole type wrong on every item. This is the same rule
   * `markAgainstKey` applies on the platform; getting it wrong here would make the demo lie in the one way
   * nobody would notice.
   */
  const correct =
    typeof item.correctKey === 'number'
      ? Number(response.selectedIndex) === item.correctKey
      : String(response.key ?? response.selectedKey ?? '').trim().toLowerCase() ===
        String(item.correctKey).trim().toLowerCase();

  const entry: Answered = {
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain,
    b: item.b,
    a: item.a,
    c: item.c,
    correct,
  };
  session.answered.push(entry);
  session.posterior = update(session.posterior, entry);
  /**
   * Follow the estimate, damped, and clamped to what the bank can actually serve.
   *
   * Damped so a single lucky answer does not jump to the ceiling; clamped because beyond +-3 logits the bank has
   * nothing left and steering further would aim at items that do not exist.
   */
  session.steer = clampSteer(
    session.steer + (mean(session.posterior) - session.steer) * STEER_LEARN,
  );
  return { correct, state: stateOf(session) };
}

/** Forget everything. Demo state is per tab and per page load; this is here for the harnesses. */
export function demoReset(): void {
  sessions.clear();
  bankOnce = null;
}
