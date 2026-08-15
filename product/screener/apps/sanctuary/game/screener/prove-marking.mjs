/**
 * MARKING PROOF for the ten types the 3D dressings present.
 *
 * WHY THIS EXISTS AND WHY IT RUNS FIRST. Nothing in the world can tell you that an item was marked
 * against the wrong field: a mis-addressed option is not an error, it is a wrong answer. So the only
 * way to know the plumbing is sound is to submit the on-disk `answer.correctKey` and watch the server
 * agree. The three `VER-*` types are the live hazard: their `correctKey` is an INTEGER and their
 * options carry no `key` field at all, so a dressing that hands back a letter marks every verbal item
 * wrong, silently and confidently, and the posterior quietly fills with noise.
 *
 * WHAT IS PROVEN, per type:
 *   1. submitting the on-disk correctKey returns `correct: true`
 *   2. submitting a different option returns `correct: false`
 *   3. `state.unscorable` stays 0 across both, i.e. the server understood the address
 *
 * The chain under test is the REAL one. `handed` is computed exactly as the 3D presentations compute
 * it (the option's `key` when it has one, otherwise the stringified index), pushed through a copy of
 * `toRef` from `shared/ItemStage.tsx`, and posted in the same triple-addressed body `useSortie` uses.
 * Copying those two small pieces rather than importing them is deliberate: this script runs on plain
 * node against a live API, and a proof that needs the bundler is a proof that gets skipped.
 *
 * Run: node apps/sanctuary/game/screener/prove-marking.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = process.env.GT_API ?? 'http://localhost:5203';
const BANKS = fileURLToPath(new URL('../../../../data/sanctuary/banks/', import.meta.url));

/** The ten types, in battery order, matching `shared/batteries.ts`. */
const TYPES = [
  'FLU-MATRIX-01',
  'FLU-CARPET-01',
  'SPA-XFORM-01',
  'FLU-OPCHAIN-01',
  'QUANT-SERIES-01',
  'QUANT-FUNC-01',
  'QUANT-BALANCE-01',
  'VER-SEQUENCE-01',
  'VER-SORTBOT-01',
  'VER-RELPAIR-01',
];

/* ---------------------------------------------------------------------------
   the two pieces of the real chain, copied verbatim
   ------------------------------------------------------------------------- */

/** `shared/ItemStage.tsx`. Resolves whichever address the item actually uses. */
function toRef(content, handed) {
  const options = Array.isArray(content.options) ? content.options : [];
  const byKey = options.findIndex((o) => typeof o?.key === 'string' && o.key === handed);
  if (byKey >= 0) return { key: handed, index: byKey };
  const asIndex = Number(handed);
  if (Number.isInteger(asIndex) && asIndex >= 0 && asIndex < options.length) {
    return { key: handed, index: asIndex };
  }
  return { key: handed, index: -1 };
}

/**
 * What every 3D presentation hands back for the option at `index`.
 *
 * One line, and it is the whole hazard: lettered options are addressed by letter, keyless ones by
 * position. Every dressing in this directory routes through `handedFor` so the rule lives once.
 */
function handedFor(content, index) {
  const opt = Array.isArray(content.options) ? content.options[index] : undefined;
  return typeof opt?.key === 'string' ? opt.key : String(index);
}

/* ------------------------------------------------------------------------- */

async function api(path, body) {
  const res = await fetch(`${API}/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

const bankCache = new Map();
function correctKeyOf(typeCode, itemId) {
  let byId = bankCache.get(typeCode);
  if (!byId) {
    byId = new Map();
    const text = readFileSync(`${BANKS}${typeCode}.jsonl`, 'utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      const d = JSON.parse(line);
      byId.set(d.itemId, d.answer?.correctKey);
    }
    bankCache.set(typeCode, byId);
  }
  return byId.get(itemId);
}

/** `useSortie`'s body: both addresses, because scoreResponse's two paths never meet. */
function bodyFor(ref) {
  return {
    response: { key: ref.key, selectedKey: ref.key, selectedIndex: ref.index },
    latencyMs: 800,
  };
}

async function proveType(typeCode) {
  const sess = await api('/bank/sessions', {
    types: [typeCode],
    abilityThreshold: -2.5,
    precisionIndex: 1,
    perDomainMinimum: 1,
    seed: 1234,
  });
  const sid = sess.sessionId;
  const row = { typeCode, poolSize: sess.poolSize, keyType: null, hit: null, miss: null, unscorable: null, items: [] };

  // Pass 1: the on-disk key. Pass 2: any other option.
  for (const wantCorrect of [true, false]) {
    const next = await api(`/bank/sessions/${sid}/next`);
    if (next.done || !next.served) throw new Error(`${typeCode}: pool exhausted before pass ${wantCorrect ? 1 : 2}`);
    const content = next.served.content;
    const options = content.options ?? [];
    const key = correctKeyOf(typeCode, next.served.itemId);
    if (key === undefined) throw new Error(`${typeCode}: ${next.served.itemId} not found on disk`);
    row.keyType = typeof key;

    // The index the on-disk key points at, under whichever address family this type uses.
    const correctIndex =
      typeof key === 'number' ? key : options.findIndex((o) => o?.key === key);
    if (correctIndex < 0) throw new Error(`${typeCode}: correctKey ${JSON.stringify(key)} matches no option`);

    const index = wantCorrect
      ? correctIndex
      : (correctIndex + 1) % options.length; // any other option
    const ref = toRef(content, handedFor(content, index));
    const res = await api(`/bank/sessions/${sid}/answer`, bodyFor(ref));

    row.items.push({
      itemId: next.served.itemId,
      correctKey: key,
      chosenIndex: index,
      handed: handedFor(content, index),
      ref,
      correct: res.correct,
    });
    row.unscorable = res.state.unscorable;
    if (wantCorrect) row.hit = res.correct;
    else row.miss = res.correct;
  }

  row.ok = row.hit === true && row.miss === false && row.unscorable === 0;
  return row;
}

const rows = [];
for (const t of TYPES) {
  try {
    rows.push(await proveType(t));
  } catch (e) {
    rows.push({ typeCode: t, ok: false, error: String(e.message ?? e) });
  }
}

console.log('\ntype              pool  keyType  correctKey->correct  other->correct  unscorable  verdict');
console.log('-'.repeat(96));
for (const r of rows) {
  if (r.error) {
    console.log(`${r.typeCode.padEnd(18)}${'ERROR'.padEnd(48)}${r.error}`);
    continue;
  }
  const a = r.items[0];
  const b = r.items[1];
  console.log(
    r.typeCode.padEnd(18) +
      String(r.poolSize).padEnd(6) +
      String(r.keyType).padEnd(9) +
      `${JSON.stringify(a.correctKey)} -> ${String(r.hit)}`.padEnd(21) +
      `${JSON.stringify(b.handed)} -> ${String(r.miss)}`.padEnd(16) +
      String(r.unscorable).padEnd(12) +
      (r.ok ? 'PASS' : 'FAIL'),
  );
}

console.log('\naddress detail (what each dressing hands back, and what it resolved to)');
console.log('-'.repeat(96));
for (const r of rows) {
  if (r.error) continue;
  for (const it of r.items) {
    console.log(
      `${r.typeCode.padEnd(18)}handed=${JSON.stringify(it.handed).padEnd(6)} ref=${JSON.stringify(it.ref).padEnd(24)} correctKey=${JSON.stringify(it.correctKey).padEnd(5)}`,
    );
  }
}

const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length}/${rows.length} types marked correctly.`);
if (failed.length) {
  console.log(`FAILED: ${failed.map((r) => r.typeCode).join(', ')}`);
  process.exitCode = 1;
}
