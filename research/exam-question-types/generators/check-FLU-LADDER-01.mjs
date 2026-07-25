// Tiny validator for the FLU-LADDER-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: content.options carry NO lure/answer leak.
//   3. Answer key is valid and matches an INDEPENDENT transitive solver: build the
//      clue DAG ("above" ranks higher) and Kahn-sort it; require a UNIQUE total order
//      and confirm exactly one option equals it and it is the declared correctKey.
//   4. Reproducible from provenance; difficulty equals difficulty-from-levers.
//   5. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND
//      >=5 items per +/-1 pt band (BUILD_PLAN §0).
//
// Run:  node research/exam-question-types/generators/check-FLU-LADDER-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers } from './FLU-LADDER-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/FLU-LADDER-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8']; // this type excludes K-1 by design
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');

const items = [];
lines.forEach((line, i) => {
  try {
    items.push(JSON.parse(line));
  } catch (e) {
    fail('parse', `line ${i + 1} is not valid JSON: ${e.message}`);
  }
});

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;
const sameOrder = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

// Independent transitive solver: Kahn topological sort over the clue DAG. Returns the
// unique total order (top -> bottom), or null if the clues do not force a single order.
// Does not trust the generator's declared order.
function solveOrder(ids, clues) {
  const indeg = {};
  const adj = {};
  for (const id of ids) {
    indeg[id] = 0;
    adj[id] = [];
  }
  for (const c of clues) {
    if (!(c.above in adj) || !(c.below in indeg)) return null;
    adj[c.above].push(c.below);
    indeg[c.below]++;
  }
  const remaining = new Set(ids);
  const order = [];
  while (remaining.size) {
    const zero = [...remaining].filter((id) => indeg[id] === 0);
    if (zero.length !== 1) return null; // ambiguous or contradictory -> not a unique order
    const x = zero[0];
    order.push(x);
    remaining.delete(x);
    for (const nb of adj[x]) indeg[nb]--;
  }
  return order;
}
// Does `order` satisfy every clue (above appears before below)?
function satisfiesAll(order, clues) {
  const rank = {};
  order.forEach((id, i) => (rank[id] = i));
  return clues.every((c) => rank[c.above] < rank[c.below]);
}

// ---- 2 + 3. Per-item structural + key + reproducibility checks ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'FLU-LADDER-01') fail(id, `typeCode != FLU-LADDER-01 (${it.typeCode})`);
  if (it.domain !== 'fluid_reasoning') fail(id, `domain != fluid_reasoning (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20)
    fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);

  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  const n = c.n;
  if (!Number.isInteger(n) || n < 3 || n > 6) fail(id, `n out of 3..6 (${n})`);
  const chars = c.characters || [];
  if (!Array.isArray(chars) || chars.length !== n) fail(id, `characters length != n (${chars.length} vs ${n})`);
  const charIds = chars.map((ch) => ch && ch.id);
  if (new Set(charIds).size !== charIds.length) fail(id, 'character ids not unique');
  for (const ch of chars)
    if (!ch || typeof ch.id !== 'string' || typeof ch.shape !== 'string' || typeof ch.color !== 'string')
      fail(id, 'character malformed (need id/shape/color)');

  // Clues: reference valid character ids; "above"/"below" distinct.
  const clues = c.clues || [];
  if (!Array.isArray(clues) || clues.length < n - 1) fail(id, `too few clues (${clues.length} < ${n - 1})`);
  for (const cl of clues) {
    if (!cl || !charIds.includes(cl.above) || !charIds.includes(cl.below) || cl.above === cl.below)
      fail(id, 'clue references invalid/equal character ids');
  }

  // Options: 4..6, unique keys, each a full permutation of the cast; no leak.
  const opts = c.options || [];
  if (!Array.isArray(opts) || opts.length < 4 || opts.length > 6) fail(id, `options count out of 4..6 (${opts.length})`);
  const keys = opts.map((o) => o && o.key);
  if (new Set(keys).size !== keys.length) fail(id, 'option keys not unique');
  for (const o of opts) {
    if (!o || typeof o.key !== 'string') fail(id, 'option missing key');
    const ord = o && o.order;
    if (!Array.isArray(ord) || ord.length !== n) fail(id, 'option order not length n');
    else if (new Set(ord).size !== n || !ord.every((x) => charIds.includes(x))) fail(id, 'option order is not a permutation of the cast');
    for (const leak of ['lure', 'tag', 'detail', 'correct', 'isCorrect', 'position', 'where'])
      if (o && Object.prototype.hasOwnProperty.call(o, leak)) fail(id, `option leaks answer field "${leak}"`);
  }
  // Options must be distinct orderings.
  for (let a = 0; a < opts.length; a++)
    for (let b = a + 1; b < opts.length; b++) if (opts[a].order && opts[b].order && sameOrder(opts[a].order, opts[b].order)) fail(id, 'duplicate option orderings');

  // Answer: correctKey references an option; rationales cover every key; exactly one "correct".
  const ans = it.answer || {};
  if (!keys.includes(ans.correctKey)) fail(id, `correctKey "${ans.correctKey}" not an option key`);
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  if (ratKeys.length !== keys.length || !keys.every((k) => ratKeys.includes(k)))
    fail(id, 'distractorRationales do not cover every option key');
  const correctRats = ratKeys.filter((k) => rats[k] && lureLabel(rats[k]) === 'correct');
  if (correctRats.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${correctRats.length}`);
  else if (correctRats[0] !== ans.correctKey) fail(id, 'the "correct" rationale key != correctKey');

  // key_matches_solver + unique_answer: independently solve the order and confirm
  // exactly one option matches it, and that option is the declared correctKey.
  const solved = solveOrder(charIds, clues);
  if (!solved) fail(id, 'clues do NOT force a unique total order (independent solver)');
  else {
    if (!satisfiesAll(solved, clues)) fail(id, 'solved order does not satisfy all clues');
    const matching = opts.filter((o) => sameOrder(o.order, solved)).map((o) => o.key);
    if (matching.length !== 1) fail(id, `solver found ${matching.length} options matching the unique order (want exactly 1)`);
    else if (matching[0] !== ans.correctKey) fail(id, `solver key ${matching[0]} != declared correctKey ${ans.correctKey}`);
    // No distractor may also satisfy every clue (would make the key non-unique).
    const alsoValid = opts.filter((o) => o.key !== ans.correctKey && satisfiesAll(o.order, clues)).map((o) => o.key);
    if (alsoValid.length) fail(id, `distractor(s) ${alsoValid.join(',')} also satisfy all clues (key not unique)`);
  }

  // 4. Reproducibility: regenerate from provenance and deep-compare.
  const lev = (it.provenance && it.provenance.levers) || {};
  try {
    const regen = normalizeBankItem(genItem({ n: lev.n, extra: lev.extra, distractorSimilarity: lev.distractorSimilarity, seed: it.provenance.seed }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }

  // Difficulty must equal the value derived from its own levers.
  const derived = round2(difficultyFromLevers(lev.n, lev.extra, lev.distractorSimilarity));
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
}

// ---- 5. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (does not reach the floor)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (does not reach the ceiling)`);

const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
const shortBins = binCounts.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < MIN_PER_BAND);
const shortBands = bandCounts.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < MIN_PER_BAND);
for (const b of shortBins) fail('coverage', `integer bin k=${b.k} has ${b.n} items (<${MIN_PER_BAND})`);
for (const b of shortBands) fail('coverage', `+/-1pt band around k=${b.k} has ${b.n} items (<${MIN_PER_BAND})`);

// ---- Report ----
console.log(`FLU-LADDER-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — parses, structure valid, key reproducible, coverage 1..20 with >=5 per bin and per +/-1pt band.');
