// Tiny validator for the FLU-MATRIX-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: content.options carry NO lure/answer leak.
//   3. Answer key is valid, unique, and matches the grammar solver (reproducible).
//   4. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND
//      >=5 items per +/-1 pt band (BUILD_PLAN §0).
//
// Run:  node research/exam-question-types/generators/check-FLU-MATRIX-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers } from './FLU-MATRIX-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/FLU-MATRIX-01.jsonl');
const ALLOWED_BANDS = ['K-1', '2-3', '4-5', '6-8'];
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

// Independent solver: recompute the blank tile from the VISIBLE matrix using the
// documented positional grammar (does not trust the generator's own tag). This is
// the schema-spec `unique_answer` / `key_matches_solver` check for a grammar item.
function solveBlank(cells, G, activeRules) {
  const shapes = cells[0].map((t) => t.shape); // shape at (0,c) == shapes[c]
  const colors = cells.map((row) => row[0].color); // color at (r,0) == colors[r] (or colors[0])
  const r = G - 1;
  const c = G - 1;
  return {
    shape: shapes[(r + c) % G],
    color: activeRules.includes('color') ? colors[r] : colors[0],
    count: activeRules.includes('count') ? c + 1 : 1,
    rot: activeRules.includes('rotation') ? ((2 * r + c) % 3) * 120 : 0,
  };
}

// ---- 2 + 3. Per-item structural + key + reproducibility checks ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'FLU-MATRIX-01') fail(id, `typeCode != FLU-MATRIX-01 (${it.typeCode})`);
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
  if (![2, 3].includes(c.gridSize)) fail(id, `gridSize not 2 or 3 (${c.gridSize})`);
  const G = c.gridSize;

  // Matrix: G x G, exactly one blank at bottom-right.
  const cells = c.matrix && c.matrix.cells;
  if (!Array.isArray(cells) || cells.length !== G || cells.some((r) => !Array.isArray(r) || r.length !== G))
    fail(id, 'matrix.cells is not GxG');
  else {
    let nulls = 0;
    for (let r = 0; r < G; r++)
      for (let cc = 0; cc < G; cc++) if (cells[r][cc] === null) nulls++;
    if (nulls !== 1) fail(id, `expected exactly 1 blank cell, got ${nulls}`);
    if (cells[G - 1][G - 1] !== null) fail(id, 'blank must be bottom-right cell');
  }

  // Options: 4..6, unique keys, renderable subset only (no lure/answer leak).
  const opts = c.options || [];
  if (!Array.isArray(opts) || opts.length < 4 || opts.length > 6) fail(id, `options count out of 4..6 (${opts.length})`);
  const keys = opts.map((o) => o && o.key);
  if (new Set(keys).size !== keys.length) fail(id, 'option keys not unique');
  for (const o of opts) {
    if (!o || typeof o.key !== 'string') fail(id, 'option missing key');
    const t = o && o.tile;
    if (!t || typeof t.shape !== 'string' || typeof t.color !== 'string' || !isNum(t.count) || !isNum(t.rot))
      fail(id, 'option tile malformed');
    // SERVED-SUBSET SAFETY: a renderable option must not carry the answer taxonomy.
    for (const leak of ['lure', 'rulesSatisfied', 'rulesViolated', 'correct', 'isCorrect'])
      if (o && Object.prototype.hasOwnProperty.call(o, leak)) fail(id, `option leaks answer field "${leak}"`);
  }

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

  // key_matches_solver + unique_answer: independently solve the blank and confirm
  // exactly one option matches it, and that option is the declared correctKey.
  if (Array.isArray(cells) && cells.length === G && c.activeRules) {
    const expected = solveBlank(cells, G, c.activeRules);
    const matching = opts.filter((o) => deepEq(o.tile, expected)).map((o) => o.key);
    if (matching.length !== 1) fail(id, `solver found ${matching.length} options matching the blank (want exactly 1)`);
    else if (matching[0] !== ans.correctKey) fail(id, `solver key ${matching[0]} != declared correctKey ${ans.correctKey}`);
  }

  // 3. Reproducibility + key-matches-solver: regenerate from provenance and deep-compare.
  const lev = (it.provenance && it.provenance.levers) || {};
  try {
    const regen = normalizeBankItem(genItem({
      gridSize: lev.gridSize,
      activeRules: lev.activeRules,
      distractorSimilarity: lev.distractorSimilarity,
      keyPosition: lev.keyPosition,
      seed: it.provenance.seed,
    }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }

  // Difficulty must equal the value derived from its own levers.
  const derived = Math.round(difficultyFromLevers(lev.gridSize, lev.activeRules || [], lev.distractorSimilarity) * 100) / 100;
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
}

// ---- 4. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (does not reach the floor)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (does not reach the ceiling)`);

const binCounts = Array.from({ length: 20 }, () => 0); // integer bin: round(d)
const bandCounts = Array.from({ length: 20 }, () => 0); // +/-1 pt band around k
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
const shortBins = binCounts.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < MIN_PER_BAND);
const shortBands = bandCounts.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < MIN_PER_BAND);
for (const b of shortBins) fail('coverage', `integer bin k=${b.k} has ${b.n} items (<${MIN_PER_BAND})`);
for (const b of shortBands) fail('coverage', `+/-1pt band around k=${b.k} has ${b.n} items (<${MIN_PER_BAND})`);

function round2(x) {
  return Math.round(x * 100) / 100;
}

// ---- Report ----
console.log(`FLU-MATRIX-01 bank check: ${items.length} items`);
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
