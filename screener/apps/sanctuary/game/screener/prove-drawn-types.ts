/**
 * MARKING PROOF for every type this directory has learned to draw.
 *
 * WHY A SECOND PROOF NEXT TO `prove-marking.mjs`. That script covers all ten types but re-derives the
 * address rule in its own copy of `handedFor`, so it proves the SERVER understands a correctly
 * addressed answer — not that the PRESENTATIONS produce one. Those are different claims, and the
 * second is the one that breaks when somebody edits a presentation. This script imports the real
 * `handedFor` that every component calls, so the thing under test is the shipped code path.
 *
 * `toRef` is still copied rather than imported, for the same reason `prove-marking.mjs` copies it:
 * `shared/ItemStage.tsx` lazily imports a dozen React renderers, and a proof that needs the bundler
 * is a proof that gets skipped.
 *
 * WHAT IS PROVEN, per type:
 *   1. submitting the option the on-disk `answer.correctKey` names comes back `correct: true`
 *   2. submitting any other option comes back `correct: false`
 *   3. `state.unscorable` stays 0 across both, i.e. the server understood the address
 *
 * `VER-SEQUENCE-01` is the one that matters. Its `correctKey` is an INTEGER and its options carry no
 * `key`, so the position is the answer. A component that handed back a letter would fail line 1 here
 * and nowhere else in the system.
 *
 * Run: npx tsx apps/sanctuary/game/screener/prove-drawn-types.ts
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { handedFor } from './address';
import { SORTING_GATE_BANDS, sortingGateServes } from './SortingGate';

const API = process.env.GT_API ?? 'http://localhost:5203';
const BANKS = fileURLToPath(new URL('../../../../data/sanctuary/banks/', import.meta.url));

/**
 * The types this directory now draws in world.
 *
 * `VER-SEQUENCE-01` is the one that matters most and it is first among equals for a reason: its
 * `correctKey` is an INTEGER and its options carry no `key`, so POSITION is the answer. Everything else
 * here is lettered. A presentation that handed back a letter where a position was wanted — or the other
 * way round — would fail line 1 below and nowhere else in the whole system, which is why all seven go
 * through the same `handedFor` rather than each deciding for itself.
 */
const TYPES = [
  'QUANT-SERIES-01',
  'VER-SEQUENCE-01',
  'SPA-XFORM-01',
  'QUANT-FUNC-01',
  'FLU-CARPET-01',
  'QUANT-BALANCE-01',
  /**
   * The second positional type, and worth its own round trip rather than being assumed to behave like
   * `VER-SEQUENCE-01`.
   *
   * Both are addressed by position, but they arrive at it from different shapes: `VER-SEQUENCE-01`
   * options are `{order: [...]}` and these are `{token: {text}}`. Neither carries a `key`, so `handedFor`
   * falls through to the index for both — and that fall-through is a DEFAULT, which is precisely the kind
   * of thing that holds for the case somebody checked and not for the one they did not. `correctKey` is
   * an integer on all 100 items of this bank, so the integer-versus-string trap is live here too.
   */
  'VER-SORTBOT-01',
] as const;

/** `shared/ItemStage.tsx`, copied. Resolves whichever address family the item uses. */
function toRef(content: Record<string, unknown>, handed: string): { key: string; index: number } {
  const options = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
  const byKey = options.findIndex((o) => typeof o?.key === 'string' && o.key === handed);
  if (byKey >= 0) return { key: handed, index: byKey };
  const asIndex = Number(handed);
  if (Number.isInteger(asIndex) && asIndex >= 0 && asIndex < options.length) {
    return { key: handed, index: asIndex };
  }
  return { key: handed, index: -1 };
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(data.error ?? res.statusText));
  return data as T;
}

function keysOnDisk(typeCode: string): Map<string, string | number> {
  const byId = new Map<string, string | number>();
  for (const line of readFileSync(`${BANKS}${typeCode}.jsonl`, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const d = JSON.parse(line) as { itemId: string; answer?: { correctKey?: string | number } };
    if (d.answer?.correctKey !== undefined) byId.set(d.itemId, d.answer.correctKey);
  }
  return byId;
}

interface Served {
  done?: boolean;
  served?: { itemId: string; content: Record<string, unknown> };
}
interface Marked {
  correct: boolean;
  state: { unscorable: number };
}

async function prove(typeCode: string) {
  const disk = keysOnDisk(typeCode);
  const sess = await api<{ sessionId: string; poolSize: number }>('/bank/sessions', {
    types: [typeCode],
    abilityThreshold: -2.5,
    precisionIndex: 1,
    perDomainMinimum: 1,
    seed: 4242,
  });

  const passes: {
    itemId: string;
    correctKey: string | number;
    chosen: number;
    handed: string;
    ref: { key: string; index: number };
    correct: boolean;
    unscorable: number;
  }[] = [];

  for (const wantCorrect of [true, false]) {
    const next = await api<Served>(`/bank/sessions/${sess.sessionId}/next`);
    if (next.done || !next.served) throw new Error(`${typeCode}: pool exhausted`);
    const content = next.served.content;
    const options = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
    const key = disk.get(next.served.itemId);
    if (key === undefined) throw new Error(`${typeCode}: ${next.served.itemId} not on disk`);

    // Where the on-disk key points, under whichever family this type uses.
    const correctIndex = typeof key === 'number' ? key : options.findIndex((o) => o?.key === key);
    if (correctIndex < 0) throw new Error(`${typeCode}: correctKey ${JSON.stringify(key)} matches no option`);

    const chosen = wantCorrect ? correctIndex : (correctIndex + 1) % options.length;
    // THE LINE UNDER TEST: the same call `TideLine` and `DayLog` make.
    const handed = handedFor(options[chosen], chosen);
    const ref = toRef(content, handed);
    const res = await api<Marked>(`/bank/sessions/${sess.sessionId}/answer`, {
      response: { key: ref.key, selectedKey: ref.key, selectedIndex: ref.index },
      latencyMs: 900,
    });

    passes.push({
      itemId: next.served.itemId,
      correctKey: key,
      chosen,
      handed,
      ref,
      correct: res.correct,
      unscorable: res.state.unscorable,
    });
  }

  const hit = passes[0]!;
  const miss = passes[1]!;
  const ok = hit.correct === true && miss.correct === false && hit.unscorable === 0 && miss.unscorable === 0;
  return { typeCode, poolSize: sess.poolSize, hit, miss, ok };
}

let failed = 0;
for (const t of TYPES) {
  const r = await prove(t);
  if (!r.ok) failed += 1;
  console.log(`\n${r.typeCode}  (pool ${r.poolSize}, correctKey is a ${typeof r.hit.correctKey})`);
  console.log(
    `  on-disk key ${JSON.stringify(r.hit.correctKey)} → handedFor gave ${JSON.stringify(r.hit.handed)} → ` +
      `ref ${JSON.stringify(r.hit.ref)} → correct: ${r.hit.correct}   [want true]`,
  );
  // A different item is served for the second pass, so its own key is printed too — otherwise the
  // two lines can look identical by coincidence and the proof reads as if it did nothing.
  console.log(
    `  next item's key is ${JSON.stringify(r.miss.correctKey)}, chose option ${r.miss.chosen} instead → ` +
      `handedFor gave ${JSON.stringify(r.miss.handed)} → ref ${JSON.stringify(r.miss.ref)} → ` +
      `correct: ${r.miss.correct}   [want false]`,
  );
  console.log(`  unscorable: ${r.hit.unscorable} then ${r.miss.unscorable}   [want 0]`);
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}`);
}

console.log(`\n${TYPES.length - failed}/${TYPES.length} drawn types marked correctly.`);

/* ============================================================================
   POSITION REALLY IS THE ANSWER — the pass the loop above cannot make on its own
   ========================================================================== */

/**
 * A HIT ON A NONZERO INDEX, because a hit on index 0 proves less than it looks like it proves.
 *
 * The loop above serves whatever the fixed seed serves, and for `VER-SORTBOT-01` the first item it draws
 * has `correctKey: 0`. Work through what that actually tests. A broken component that ignored its index
 * entirely and always handed back the string `"0"` would pass line 1, because the key IS 0; and it would
 * pass line 2 as well, because the second item's key is 2 and `"0"` is duly marked wrong. Both assertions
 * green, the whole address rule unexercised, and the failure mode this script exists to catch — a
 * presentation that hands back something other than its option's position — sails straight through.
 *
 * So this walks the pool until it finds an item whose answer is NOT at position 0 and submits that
 * position. Now a constant, an off-by-one and a letter all fail, which is the claim the file's header
 * actually makes. `VER-SEQUENCE-01` gets the same treatment for the same reason: it is the other
 * positional type and it has the same shape of hole.
 */
async function proveNonZeroPosition(typeCode: string) {
  const disk = keysOnDisk(typeCode);
  const sess = await api<{ sessionId: string }>('/bank/sessions', {
    types: [typeCode],
    abilityThreshold: -2.5,
    precisionIndex: 3,
    perDomainMinimum: 1,
    seed: 90210,
  });

  for (let tries = 0; tries < 12; tries += 1) {
    const next = await api<Served>(`/bank/sessions/${sess.sessionId}/next`);
    if (next.done || !next.served) break;
    const content = next.served.content;
    const options = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
    const key = disk.get(next.served.itemId);
    // Only an integer key that is not 0 can carry this proof.
    if (typeof key !== 'number' || key <= 0 || key >= options.length) {
      // Spend the item on a deliberate miss so the session advances.
      await api<Marked>(`/bank/sessions/${sess.sessionId}/answer`, {
        response: { key: '0', selectedKey: '0', selectedIndex: 0 },
        latencyMs: 900,
      });
      continue;
    }
    const handed = handedFor(options[key], key);
    const ref = toRef(content, handed);
    const res = await api<Marked>(`/bank/sessions/${sess.sessionId}/answer`, {
      response: { key: ref.key, selectedKey: ref.key, selectedIndex: ref.index },
      latencyMs: 900,
    });
    return { itemId: next.served.itemId, key, handed, ref, correct: res.correct, unscorable: res.state.unscorable };
  }
  return null;
}

console.log('\nposition-is-the-answer, on a NONZERO index');
let posFailed = 0;
for (const t of ['VER-SORTBOT-01', 'VER-SEQUENCE-01']) {
  const r = await proveNonZeroPosition(t);
  if (!r) {
    console.log(`  ${t}: no nonzero-key item found in 12 draws — proof not made`);
    posFailed += 1;
    continue;
  }
  const ok = r.correct === true && r.unscorable === 0;
  if (!ok) posFailed += 1;
  console.log(
    `  ${t}: on-disk key ${r.key} (nonzero) → handedFor gave ${JSON.stringify(r.handed)} → ` +
      `ref ${JSON.stringify(r.ref)} → correct: ${r.correct}   unscorable: ${r.unscorable}   ${ok ? 'PASS' : 'FAIL'}`,
  );
}

/* ============================================================================
   THE SORTING GATE'S OWN GATE
   ========================================================================== */

/**
 * `VER-SORTBOT-01` is the first type here that REFUSES most of its bank, so the refusal needs proving too.
 *
 * Marking and drawability are independent claims and both can fail on their own. The loop above proves the
 * server understands this type's address; this proves the component will only ever be handed items it can
 * draw honestly. Without it the gate is a comment, and a comment is not a measurement — the numbers in
 * `SortingGate.tsx`'s header would quietly stop being true the first time somebody added a noun to
 * `eventMeaning.ts`, in either direction.
 *
 * THE SHIPPED PREDICATE, IMPORTED, not a copy. `toRef` above is copied because `shared/ItemStage.tsx`
 * drags a dozen lazily-imported renderers in behind it; `SortingGate.tsx` does not have that problem —
 * `tsx` loads it and its `@react-three/fiber` import without a bundler and without a browser, because the
 * predicate is a pure function over the payload and nothing in the module needs a canvas to be defined. So
 * the thing under test here is the same function the component gates on.
 *
 * WHAT THE NUMBERS SHOULD BE, measured over the bank on disk:
 *
 *     K-1        13 of 17 servable
 *     2-3        14 of 20 servable
 *     4-5         0 of 20 servable      vocabulary is abstract; nothing draws `ad hominem`
 *     6-8         0 of 43 servable      same, and 26 of them have two options drawn alike
 *
 * The two zeroes are the important ones and they are why the band list is a convenience rather than the
 * mechanism: the content gate rejects every single item of both large bands on its own merits, so it
 * SUBSUMES the band gate. If a future noun ever made a 4-5 item pass, the gate would let it through and it
 * would be right to — the band list would then be the thing that was wrong.
 */
const SORTBOT = 'VER-SORTBOT-01';
const BANDS = ['K-1', '2-3', '4-5', '6-8'] as const;
/** Every band the gate is allowed to serve must be in `SORTING_GATE_BANDS`, and vice versa. */
const WANT: Record<string, [number, number]> = {
  'K-1': [13, 17],
  '2-3': [14, 20],
  '4-5': [0, 20],
  '6-8': [0, 43],
};
/** What the served pool comes to. Asserted, so a regenerated bank cannot silently invalidate `REFUSED`. */
const WANT_POOL = 27;

interface SortRow {
  ageBands: string[];
  content: Record<string, unknown>;
}

const sortRows: SortRow[] = readFileSync(`${BANKS}${SORTBOT}.jsonl`, 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as SortRow);

console.log(`\n${SORTBOT} drawability gate  (declared bands: ${SORTING_GATE_BANDS.join(', ')})`);
let gateFailed = 0;
for (const band of BANDS) {
  const rows = sortRows.filter((r) => r.ageBands.includes(band));
  const ok = rows.filter((r) => sortingGateServes(r.content)).length;
  const [wantOk, wantTotal] = WANT[band] ?? [0, 0];
  const good = ok === wantOk && rows.length === wantTotal;
  if (!good) gateFailed += 1;
  const served = SORTING_GATE_BANDS.includes(band) ? 'served' : 'gated out';
  console.log(`  ${band.padEnd(4)} ${String(ok).padStart(2)}/${String(rows.length).padStart(2)} servable  [want ${wantOk}/${wantTotal}]  ${served}  ${good ? 'ok' : 'MISMATCH'}`);
}
const pool = sortRows.filter(
  (r) => r.ageBands.some((b) => SORTING_GATE_BANDS.includes(b)) && sortingGateServes(r.content),
).length;
console.log(`  pool actually served: ${pool}   [want ${WANT_POOL}]`);
if (pool !== WANT_POOL) gateFailed += 1;
console.log(`  ${gateFailed === 0 ? 'PASS' : 'FAIL'}`);

if (failed || gateFailed || posFailed) process.exitCode = 1;
