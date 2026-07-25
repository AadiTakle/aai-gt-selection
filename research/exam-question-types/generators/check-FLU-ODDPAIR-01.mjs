// Tiny validator for the FLU-ODDPAIR-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: content.rows carry NO lure/answer leak.
//   3. Answer key is valid, unique, and matches an INDEPENDENT solver: recover each
//      pair's transform signature (left->right deltas) and confirm exactly ONE pair
//      deviates from the majority rule — that pair is the declared correctKey.
//   4. Reproducible from provenance; difficulty equals difficulty-from-levers.
//   5. Difficulty coverage: spans 1..20 with >=5 per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-FLU-ODDPAIR-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers, COLORS } from './FLU-ODDPAIR-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/FLU-ODDPAIR-01.jsonl');
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

// Independent transform signature for a pair (left->right per-attribute delta).
function signature(left, right) {
  return JSON.stringify([
    ((COLORS.indexOf(right.color) - COLORS.indexOf(left.color)) % COLORS.length + COLORS.length) % COLORS.length,
    right.size - left.size,
    right.dots - left.dots,
    (((right.rot - left.rot) / 90) % 4 + 4) % 4,
  ]);
}

// ---- 2 + 3. Per-item structural + key + reproducibility checks ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'FLU-ODDPAIR-01') fail(id, `typeCode != FLU-ODDPAIR-01 (${it.typeCode})`);
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
  if (![1, 2, 3].includes(c.dims)) fail(id, `dims not 1..3 (${c.dims})`);
  if (![4, 5, 6].includes(c.rowCount)) fail(id, `rowCount not 4..6 (${c.rowCount})`);

  // Rows: rowCount pairs, unique keys, renderable subset only (no lure/answer leak).
  const rows = c.rows || [];
  if (!Array.isArray(rows) || rows.length !== c.rowCount || rows.length < 4 || rows.length > 6)
    fail(id, `rows count out of 4..6 or != rowCount (${rows.length})`);
  const keys = rows.map((r) => r && r.key);
  if (new Set(keys).size !== keys.length) fail(id, 'row keys not unique');
  for (const r of rows) {
    if (!r || typeof r.key !== 'string') fail(id, 'row missing key');
    for (const side of ['left', 'right']) {
      const f = r && r[side];
      if (!f || typeof f.shape !== 'string' || typeof f.color !== 'string' || !isNum(f.size) || !isNum(f.rot) || !isNum(f.dots) || typeof f.fill !== 'string')
        fail(id, `row.${side} figure malformed`);
    }
    // A transform never changes shape or fill within a pair.
    if (r && r.left && r.right && (r.left.shape !== r.right.shape || r.left.fill !== r.right.fill))
      fail(id, 'pair changed shape/fill (only color/size/count/rot transform)');
    for (const leak of ['lure', 'odd', 'tag', 'correct', 'isCorrect', 'deviation'])
      if (r && Object.prototype.hasOwnProperty.call(r, leak)) fail(id, `row leaks answer field "${leak}"`);
  }

  // Answer: correctKey references a row; rationales cover every key; exactly one "correct".
  const ans = it.answer || {};
  if (!keys.includes(ans.correctKey)) fail(id, `correctKey "${ans.correctKey}" not a row key`);
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  if (ratKeys.length !== keys.length || !keys.every((k) => ratKeys.includes(k)))
    fail(id, 'distractorRationales do not cover every row key');
  const correctRats = ratKeys.filter((k) => rats[k] && rats[k].lure === 'correct');
  if (correctRats.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${correctRats.length}`);
  else if (correctRats[0] !== ans.correctKey) fail(id, 'the "correct" rationale key != correctKey');

  // unique_odd_pair: independently signature every pair; confirm exactly one deviates
  // from the modal signature, and that it is the declared correctKey.
  if (Array.isArray(rows) && rows.length >= 4 && rows.every((r) => r.left && r.right)) {
    const sigs = rows.map((r) => signature(r.left, r.right));
    const counts = {};
    for (const s of sigs) counts[s] = (counts[s] || 0) + 1;
    const modal = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const deviants = rows.filter((r, i) => sigs[i] !== modal).map((r) => r.key);
    if (deviants.length !== 1) fail(id, `solver found ${deviants.length} deviating pairs (want exactly 1)`);
    else if (deviants[0] !== ans.correctKey) fail(id, `solver odd pair ${deviants[0]} != declared correctKey ${ans.correctKey}`);
  }

  // 4. Reproducibility: regenerate from provenance and deep-compare.
  const lev = (it.provenance && it.provenance.levers) || {};
  try {
    const regen = genItem({ ops: lev.ops, rowCount: lev.rowCount, contrastDim: lev.contrastDim, foilPull: lev.foilPull, seed: it.provenance.seed });
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }

  // Difficulty must equal the value derived from its own levers.
  const derived = round2(difficultyFromLevers(lev.ops || [], lev.rowCount, lev.foilPull));
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
console.log(`FLU-ODDPAIR-01 bank check: ${items.length} items`);
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
