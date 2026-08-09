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

const API = process.env.GT_API ?? 'http://localhost:5203';
const BANKS = fileURLToPath(new URL('../../../../data/sanctuary/banks/', import.meta.url));

/**
 * The types this directory now draws in world.
 *
 * `VER-SEQUENCE-01` is the one that matters most and it is first among equals for a reason: its
 * `correctKey` is an INTEGER and its options carry no `key`, so POSITION is the answer. Everything else
 * here is lettered. A presentation that handed back a letter where a position was wanted — or the other
 * way round — would fail line 1 below and nowhere else in the whole system, which is why all six go
 * through the same `handedFor` rather than each deciding for itself.
 */
const TYPES = [
  'QUANT-SERIES-01',
  'VER-SEQUENCE-01',
  'SPA-XFORM-01',
  'QUANT-FUNC-01',
  'FLU-CARPET-01',
  'QUANT-BALANCE-01',
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
if (failed) process.exitCode = 1;
