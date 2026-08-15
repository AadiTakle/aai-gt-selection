// Tiny validator for the FLU-STACK-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: content.options carry NO lure/answer leak; the blank
//      row's third panel is null (answer not served).
//   3. Answer key matches an INDEPENDENT solver: re-INFER the per-layer operator from
//      the two complete rows (require it to be unique), apply it to the last row, and
//      confirm exactly one option matches and it is the declared correctKey.
//   4. Reproducible from provenance; difficulty equals difficulty-from-levers.
//   5. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND
//      >=5 items per +/-1 pt band (BUILD_PLAN §0).
//
// Run:  node research/exam-question-types/generators/check-FLU-STACK-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers, applyOp, OPS } from './FLU-STACK-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/FLU-STACK-01.jsonl');
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
const isInt = (x) => Number.isInteger(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;
const samePanel = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

// Independent operator inference: for each layer, find the operator that fits BOTH
// complete rows (0 and 1). Require exactly one. Does not trust content.ops.
function inferOps(rows, layers) {
  const ops = [];
  for (let l = 0; l < layers; l++) {
    const fits = OPS.filter((o) => [0, 1].every((r) => applyOp(rows[r].a[l], rows[r].b[l], o) === rows[r].c[l]));
    if (fits.length !== 1) return null; // ambiguous or contradictory
    ops.push(fits[0]);
  }
  return ops;
}
function solvePanel(rows, inferredOps) {
  return rows[2].a.map((a, l) => applyOp(a, rows[2].b[l], inferredOps[l]));
}

// ---- 2 + 3. Per-item structural + key + reproducibility checks ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'FLU-STACK-01') fail(id, `typeCode != FLU-STACK-01 (${it.typeCode})`);
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
  const bits = c.bits;
  if (![4, 9].includes(bits)) fail(id, `bits not 4 or 9 (${bits})`);
  const max = (1 << (bits || 4)) - 1;
  const ops = c.ops || [];
  const layers = c.layers;
  if (![1, 2].includes(layers)) fail(id, `layers not 1 or 2 (${layers})`);
  if (!Array.isArray(ops) || ops.length !== layers || !ops.every((o) => OPS.includes(o))) fail(id, `ops invalid (${ops})`);

  // Rows: exactly 3; rows 0,1 complete; row 2 c === null (answer not served).
  const rows = c.rows || [];
  if (!Array.isArray(rows) || rows.length !== 3) fail(id, 'rows length != 3');
  else {
    const okMaskArr = (arr, allowZero) =>
      Array.isArray(arr) && arr.length === layers && arr.every((m) => isInt(m) && m >= (allowZero ? 0 : 1) && m <= max);
    for (let r = 0; r < 3; r++) {
      const rw = rows[r] || {};
      if (!okMaskArr(rw.a, false) || !okMaskArr(rw.b, false)) fail(id, `row ${r} a/b malformed`);
      if (r < 2) {
        if (!okMaskArr(rw.c, true)) fail(id, `row ${r} c malformed`);
      } else if (rw.c !== null) fail(id, 'blank row (row 2) c must be null (answer not served)');
    }
    if (!c.blank || c.blank.row !== 2) fail(id, 'blank.row must be 2');
  }

  // Options: 4..6, unique keys, each a panel of `layers` masks; no leak.
  const opts = c.options || [];
  if (!Array.isArray(opts) || opts.length < 4 || opts.length > 6) fail(id, `options count out of 4..6 (${opts.length})`);
  const keys = opts.map((o) => o && o.key);
  if (new Set(keys).size !== keys.length) fail(id, 'option keys not unique');
  for (const o of opts) {
    if (!o || typeof o.key !== 'string') fail(id, 'option missing key');
    const p = o && o.panel;
    if (!Array.isArray(p) || p.length !== layers || !p.every((m) => isInt(m) && m >= 0 && m <= max)) fail(id, 'option panel malformed');
    for (const leak of ['lure', 'tag', 'detail', 'correct', 'isCorrect', 'operator', 'dropped'])
      if (o && Object.prototype.hasOwnProperty.call(o, leak)) fail(id, `option leaks answer field "${leak}"`);
  }
  // Options must be distinct panels.
  for (let a = 0; a < opts.length; a++)
    for (let b = a + 1; b < opts.length; b++) if (opts[a].panel && opts[b].panel && samePanel(opts[a].panel, opts[b].panel)) fail(id, 'duplicate option panels');

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

  // key_matches_solver + unique_answer: re-infer the operator per layer from the shown
  // rows, apply to the last row, confirm exactly one option matches == correctKey.
  if (Array.isArray(rows) && rows.length === 3 && [1, 2].includes(layers)) {
    const inferred = inferOps(rows, layers);
    if (!inferred) fail(id, 'shown rows do NOT uniquely determine the operator (independent solver)');
    else {
      if (!deepEq(inferred, ops)) fail(id, `inferred operator ${inferred} != declared ops ${ops}`);
      const expected = solvePanel(rows, inferred);
      const matching = opts.filter((o) => samePanel(o.panel, expected)).map((o) => o.key);
      if (matching.length !== 1) fail(id, `solver found ${matching.length} options matching the combined panel (want exactly 1)`);
      else if (matching[0] !== ans.correctKey) fail(id, `solver key ${matching[0]} != declared correctKey ${ans.correctKey}`);
    }
  }

  // 4. Reproducibility: regenerate from provenance and deep-compare.
  const lev = (it.provenance && it.provenance.levers) || {};
  try {
    const regen = normalizeBankItem(genItem({ bits: lev.bits, ops: lev.ops, distractorSimilarity: lev.distractorSimilarity, keyPosition: lev.keyPosition, seed: it.provenance.seed }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }

  // Difficulty must equal the value derived from its own levers.
  const derived = round2(difficultyFromLevers(lev.bits, lev.ops || [], lev.distractorSimilarity));
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
console.log(`FLU-STACK-01 bank check: ${items.length} items`);
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
