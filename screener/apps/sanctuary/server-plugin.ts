import type { Plugin, ViteDevServer } from 'vite';
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { sortingGateServes } from './game/screener/sortbotGate';

/**
 * The sanctuary's own server side, and the reason it has to exist at all.
 *
 * ══ THE PROBLEM ═══════════════════════════════════════════════════════════════════════════════════
 *
 * The owner asked for the engine's real adaptivity: "if they keep missing questions, they progressively
 * get easier. if they keep getting it right, it will probably show harder questions."
 *
 * That is NOT what the engine does on its own, and this was measured rather than assumed. `nextItem()`
 * maximises information AT `abilityThreshold`, and the threshold is fixed when a session is created and
 * never moves. So at a fixed threshold the served sequence is byte-identical whether every answer is
 * right or every answer is wrong:
 *
 *     thr 0  all-right  difficulty: 9.9 9.9 9.8 9.8 9.8 9.8 10.0 10.0
 *     thr 0  all-wrong  difficulty: 9.9 9.9 9.8 9.8 9.8 9.8 10.0 10.0
 *
 * Selection never reads responses. The POSTERIOR does move — mean 0.35 all-right against -2.97 all-wrong
 * — so the engine's estimate adapts while its selection ignores that estimate. Threshold is the whole
 * difficulty lever, and `/debug` publishes the conversion: `thresholdInBankScale = threshold * 3 + 10.5`,
 * which matches the measurement (thr -2 served ~3.8, thr 0 served ~9.9, thr +1 served ~12.9).
 *
 * Closing that loop means feeding each round's posterior back in as the next round's threshold.
 *
 * ══ WHY IT CANNOT LIVE IN THE BROWSER ═════════════════════════════════════════════════════════════
 *
 * `useSortie` deletes `correct` from every answer response, so the game layer CANNOT pay a child for
 * being right — enforced by wiring rather than by a comment, because a coin awarded for accuracy teaches
 * a five-year-old to guess fast, which corrupts the estimate this product exists to produce.
 *
 * A running ability estimate is not literally a correctness flag, but it leaks one: a mean that rose
 * means the last answer was right. Handing the browser `posteriorMean` after each item would hand it
 * correctness with one subtraction, and the discipline would be gone while still looking intact.
 *
 * So the estimate lives here, server side, and the browser is told only a session id. Nothing on this
 * route ever returns a mean, an interval, or a correctness flag to the client. That is the invariant;
 * `keeps the estimate server-side` in `adapt.test.ts` is the test that holds it.
 *
 * ══ HOW IT ADAPTS ═════════════════════════════════════════════════════════════════════════════════
 *
 * A station visit is delivered as CHUNKS rather than as one session. Each chunk is a real qbank session
 * opened at the child's current estimate for that battery; when it closes, this plugin reads `/debug`
 * server-to-server, folds the posterior into the running estimate, and the next chunk opens steered to
 * the new value. Chunks are deliberately short so a child feels the difficulty move within one visit
 * rather than only between visits.
 *
 * WHAT THIS COSTS, stated plainly: a fresh session per chunk starts a fresh posterior, so the credible
 * interval does not accumulate across chunks. That is a real loss and it is bounded, because a single
 * visit was never going to produce a reportable interval anyway — one 8-item round measured 1.50 to 2.75
 * logits wide, and roughly 32 items in one battery is where the width reaches 1.00. Proper accumulation
 * needs the attempt ledger replayed through a real `Posterior`, which is why every attempt is written to
 * `LEDGER` here even though nothing reads it back yet. The log is the thing that makes that fix possible
 * later; without it the evidence is simply gone.
 */

const API = process.env.GT_SANCTUARY_API ?? 'http://127.0.0.1:5203/api';
const DATA = 'data/sanctuary';
const LEDGER = `${DATA}/ledger.jsonl`;
const KEEPERS = `${DATA}/keepers.jsonl`;

/** Beyond this the bank has nothing left to serve, so steering further is a fiction. */
const THRESHOLD_MIN = -3;
const THRESHOLD_MAX = 3;

/**
 * Where a child starts before anything is known about them.
 *
 * Deliberately below centre. Starting at 0 and walking DOWN means a young child's first contact with the
 * game is a run of items too hard for them, which is the single worst first impression this can make. An
 * over-easy start costs a couple of items of information; an over-hard one costs the child.
 */
const PRIOR = -1.5;

/**
 * How much of the new evidence to take per chunk.
 *
 * A chunk is 2-3 items, which is thin, and jumping the full distance to a 3-item posterior would swing
 * difficulty wildly on what is mostly noise — a child who guesses one lucky answer should not suddenly
 * face the ceiling. Two-thirds moves visibly within a visit (which is what was asked for) while still
 * taking three chunks to travel most of the way to a persistently different level.
 */
const LEARN = 0.66;

interface Keeper {
  keeperId: string;
  /** Running estimate per battery, in logits. */
  theta: Record<string, number>;
  /** Every itemId this keeper has been served, per battery, so nothing repeats. */
  seen: Record<string, string[]>;
}

const keepers = new Map<string, Keeper>();
/** sessionId -> what it was opened for, so `/close` knows where to fold the posterior. */
const open = new Map<string, { keeperId: string; battery: string; items: string[] }>();

function ensureData(): void {
  mkdirSync(dirname(LEDGER), { recursive: true });
}

/**
 * Items that exist, are scorable, and still must never be served.
 *
 * `VER-SORTBOT-01` asks a child to judge category membership from pictures, and on some of its items the
 * pictures cannot carry the question — a distractor drawn as a member of the category, or an answer whose
 * substitute drawing does not have the visible attribute the category is about. On five of them the item
 * INVERTS: a child reasoning correctly from what is on screen picks the trap and is marked wrong, and the
 * engine records that as inability.
 *
 * The gate has to run HERE, not in the component. A render-time check runs after selection, when the child
 * is already looking at the question and an answer will be recorded against it — declining to draw at that
 * point produces an unanswerable item plus a blank panel, which is strictly worse than not gating.
 *
 * 27 of 37 survive at K-1 and 2-3; 4-5 and 6-8 are rejected entirely on their own merits, so this subsumes
 * the band gate rather than merely agreeing with it. Better 27 honest items than 37 with six traps.
 */
function ungatedSortbotIds(): string[] {
  const dir = process.env.GT_QBANK_BANKS ?? '../qbank-library/banks';
  const out: string[] = [];
  try {
    const raw = readFileSync(`${dir}/VER-SORTBOT-01.jsonl`, 'utf8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      const rec = JSON.parse(line) as { itemId?: string; content?: Record<string, unknown> };
      if (rec.itemId && rec.content && !sortingGateServes(rec.content)) out.push(rec.itemId);
    }
  } catch {
    /* The bank is not where we guessed. Better to serve nothing of this type than to serve traps. */
    return ['*'];
  }
  return out;
}

/** Last line per keeperId wins, mirroring the append-only reasoning in `apps/api/src/store.ts`. */
function load(): void {
  if (!existsSync(KEEPERS)) return;
  for (const line of readFileSync(KEEPERS, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const k = JSON.parse(line) as Keeper;
      if (k.keeperId) keepers.set(k.keeperId, k);
    } catch {
      /* A truncated final line is expected after a hard kill; the previous line still stands. */
    }
  }
}

function keeper(id: string): Keeper {
  let k = keepers.get(id);
  if (!k) {
    k = { keeperId: id, theta: {}, seen: {} };
    keepers.set(id, k);
  }
  return k;
}

function clamp(v: number): number {
  return Math.max(THRESHOLD_MIN, Math.min(THRESHOLD_MAX, v));
}

async function apiJson<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(API + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return (await r.json()) as T;
}

function body(req: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(s || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

export function sanctuaryPlugin(): Plugin {
  ensureData();
  load();
  /* Computed once at start-up rather than per session: it reads a bank file and runs a predicate over 100
     items, and nothing about it changes while the server is up. */
  const UNGATED = ungatedSortbotIds();

  /**
   * Mounted on BOTH the dev server and `vite preview`.
   *
   * `configureServer` alone would make difficulty steering a dev-time-only feature: a built bundle would
   * still call `/sanctuary/chunk`, get a 404, and every station would silently fall back to no session at
   * all. Nothing would log an error, because the failure is a missing route rather than a thrown one.
   *
   * This is still not a deployment story — both hooks are Vite's own servers, and a real host needs these
   * three routes behind whatever serves the static bundle. But it means the thing can be built and run
   * from the command line without the adaptivity quietly disappearing, and it makes the missing piece
   * one small server rather than a rewrite.
   */
  const mount = (server: Pick<ViteDevServer, 'middlewares'>) => {
      /**
       * Open one chunk, steered to what this keeper's last chunks showed.
       *
       * Returns `{ sessionId }` and nothing else. No threshold, no mean, no interval: the browser has no
       * use for any of them and every one of them leaks the child's standing back into a layer that is
       * deliberately blind to it.
       */
      server.middlewares.use('/sanctuary/chunk', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return res.end();
        try {
          const b = await body(req);
          const keeperId = String(b.keeperId ?? 'anon');
          const battery = String(b.battery ?? 'Nonverbal');
          const types = Array.isArray(b.types) ? (b.types as string[]) : [];
          const k = keeper(keeperId);
          const threshold = clamp(k.theta[battery] ?? PRIOR);

          /* Already-served items plus the ones no child may ever be shown. Both go down the same channel
             because the engine offers exactly one way to remove an item from a pool. */
          const seen = [...(k.seen[battery] ?? []), ...UNGATED];
          const s = await apiJson<{ sessionId: string; state: unknown }>('/bank/sessions', {
            types,
            abilityThreshold: threshold,
            precisionIndex: typeof b.precisionIndex === 'number' ? b.precisionIndex : 0,
            perDomainMinimum: 1,
            // No ageBand, deliberately: band and difficulty are the same axis in this bank, so locking the
            // band administers only items the child will pass and the posterior never narrows.
            ...(seen.length ? { excludeItemIds: seen } : {}),
            seed: Math.floor(Math.random() * 1e6),
          });
          open.set(s.sessionId, { keeperId, battery, items: [] });
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ sessionId: s.sessionId }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });

      /**
       * A chunk finished. Harvest it server-to-server and steer.
       *
       * The browser is only ever the messenger here — it says "this session is done" and receives `{ ok }`.
       * Everything that matters is read from the API directly by this process.
       */
      server.middlewares.use('/sanctuary/close', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return res.end();
        try {
          const b = await body(req);
          const sessionId = String(b.sessionId ?? '');
          const rec = open.get(sessionId);
          if (!rec) {
            res.setHeader('content-type', 'application/json');
            return res.end(JSON.stringify({ ok: false }));
          }
          const dbg = await apiJson<Record<string, unknown>>(`/bank/sessions/${sessionId}/debug`);
          const state = (dbg.state ?? {}) as Record<string, unknown>;
          const mean = Number(dbg.posteriorMean ?? state.estimate);
          const k = keeper(rec.keeperId);

          if (Number.isFinite(mean)) {
            const before = k.theta[rec.battery] ?? PRIOR;
            k.theta[rec.battery] = clamp(before + LEARN * (mean - before));
          }

          /* Attempts, so a real Posterior can be replayed over the whole history later. Nothing reads this
             back yet and that is fine: the alternative is discarding the only evidence there is. */
          /* TOP LEVEL, not inside `state`. Reading `state.attempts` silently yields nothing: no ledger
             lines and no exclusions, so a returning child re-answers yesterday's items and the estimate
             double-counts them. It cost an empty `items seen: 0` in the first end-to-end run and would
             never have shown up as an error. */
          const attempts = Array.isArray(dbg.attempts) ? (dbg.attempts as unknown[]) : [];
          for (const a of attempts) {
            appendFileSync(
              LEDGER,
              JSON.stringify({ keeperId: rec.keeperId, battery: rec.battery, sessionId, ...(a as object) }) + '\n',
            );
          }
          const seen = (k.seen[rec.battery] ??= []);
          for (const a of attempts) {
            const id = (a as Record<string, unknown>).itemId;
            if (typeof id === 'string' && !seen.includes(id)) seen.push(id);
          }
          appendFileSync(KEEPERS, JSON.stringify(k) + '\n');
          open.delete(sessionId);

          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });

      /**
       * The adult view. Deliberately a separate route from anything the game touches, and it is the ONLY
       * place a number is ever published.
       */
      server.middlewares.use('/sanctuary/record', async (req: IncomingMessage, res: ServerResponse) => {
        const id = new URL(req.url ?? '', 'http://x').searchParams.get('keeperId') ?? 'anon';
        const k = keepers.get(id);
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            keeperId: id,
            theta: k?.theta ?? {},
            counts: Object.fromEntries(Object.entries(k?.seen ?? {}).map(([b, v]) => [b, v.length])),
            caveat:
              'Logits on an uncalibrated bank with an assumed discrimination of 1.5. Precision about a model, not accuracy about a child.',
          }),
        );
      });
  };

  return {
    name: 'sanctuary-sortie',
    configureServer: mount,
    configurePreviewServer: mount,
  };
}
