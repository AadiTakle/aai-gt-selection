// Tiny validator for the FLU-ANALOGY-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: content carries NO lure/answer leak.
//   3. Answer key is valid, unique, and matches an INDEPENDENT analogy solver
//      (infer the A->B per-attribute delta, apply to C, confirm one option matches).
//   4. Reproducible from provenance; difficulty equals difficulty-from-levers.
//   5. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND
//      >=5 items per +/-1 pt band (BUILD_PLAN §0).
//
// Run:  node research/exam-question-types/generators/check-FLU-ANALOGY-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers, COLORS, FILLS } from './FLU-ANALOGY-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/FLU-ANALOGY-01.jsonl');
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

// Independent analogy solver: recover the per-attribute transform from A->B and
// re-apply it to C. Does not trust the generator's own tag.
function solveExpected(A, B, C) {
  const colorD = (COLORS.indexOf(B.color) - COLORS.indexOf(A.color) + COLORS.length) % COLORS.length;
  const fillD = (FILLS.indexOf(B.fill) - FILLS.indexOf(A.fill) + FILLS.length) % FILLS.length;
  const sizeD = B.size - A.size;
  const countD = B.count - A.count;
  const rotD = ((B.rot - A.rot) % 360 + 360) % 360;
  return {
    shape: C.shape, // shape is the analogy invariant (never transformed)
    color: COLORS[(COLORS.indexOf(C.color) + colorD) % COLORS.length],
    count: C.count + countD,
    size: C.size + sizeD,
    rot: ((C.rot + rotD) % 360 + 360) % 360,
    fill: FILLS[(FILLS.indexOf(C.fill) + fillD) % FILLS.length],
  };
}

// ---- 2 + 3. Per-item structural + key + reproducibility checks ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'FLU-ANALOGY-01') fail(id, `typeCode != FLU-ANALOGY-01 (${it.typeCode})`);
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
  if (!Array.isArray(c.transforms) || c.transforms.length < 1 || c.transforms.length > 4)
    fail(id, `transformCount out of 1..4 (${c.transforms && c.transforms.length})`);
  const ex = c.example || {};
  const q = c.question || {};
  if (!ex.source || !ex.result) fail(id, 'example.source/result missing');
  if (!q.source) fail(id, 'question.source missing');
  // The A->B example and C->? question must share the same transform (shape invariant).
  if (ex.source && ex.result && ex.source.shape !== ex.result.shape) fail(id, 'example changed shape (analogy shape must be invariant)');

  // Options: 4..6, unique keys, renderable subset only (no lure/answer leak).
  const opts = c.options || [];
  if (!Array.isArray(opts) || opts.length < 4 || opts.length > 6) fail(id, `options count out of 4..6 (${opts.length})`);
  const keys = opts.map((o) => o && o.key);
  if (new Set(keys).size !== keys.length) fail(id, 'option keys not unique');
  for (const o of opts) {
    if (!o || typeof o.key !== 'string') fail(id, 'option missing key');
    const t = o && o.tile;
    if (!t || typeof t.shape !== 'string' || typeof t.color !== 'string' || !isNum(t.count) || !isNum(t.size) || !isNum(t.rot) || typeof t.fill !== 'string')
      fail(id, 'option tile malformed');
    for (const leak of ['lure', 'tag', 'detail', 'correct', 'isCorrect', 'rules'])
      if (o && Object.prototype.hasOwnProperty.call(o, leak)) fail(id, `option leaks answer field "${leak}"`);
  }

  // Answer: correctKey references an option; rationales cover every key; exactly one "correct".
  const ans = it.answer || {};
  if (!keys.includes(ans.correctKey)) fail(id, `correctKey "${ans.correctKey}" not an option key`);
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  if (ratKeys.length !== keys.length || !keys.every((k) => ratKeys.includes(k)))
    fail(id, 'distractorRationales do not cover every option key');
  const correctRats = ratKeys.filter((k) => rats[k] && rats[k].lure === 'correct');
  if (correctRats.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${correctRats.length}`);
  else if (correctRats[0] !== ans.correctKey) fail(id, 'the "correct" rationale key != correctKey');

  // key_matches_solver + unique_answer: independently solve C->? and confirm exactly
  // one option matches, and that it is the declared correctKey.
  if (ex.source && ex.result && q.source) {
    const expected = solveExpected(ex.source, ex.result, q.source);
    const matching = opts.filter((o) => deepEq(o.tile, expected)).map((o) => o.key);
    if (matching.length !== 1) fail(id, `solver found ${matching.length} options matching C->? (want exactly 1)`);
    else if (matching[0] !== ans.correctKey) fail(id, `solver key ${matching[0]} != declared correctKey ${ans.correctKey}`);
  }

  // 4. Reproducibility: regenerate from provenance and deep-compare.
  const lev = (it.provenance && it.provenance.levers) || {};
  try {
    const regen = genItem({ transforms: lev.transforms, distractorSimilarity: lev.distractorSimilarity, seed: it.provenance.seed });
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }

  // Difficulty must equal the value derived from its own levers.
  const derived = round2(difficultyFromLevers(lev.transforms || [], lev.distractorSimilarity));
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
console.log(`FLU-ANALOGY-01 bank check: ${items.length} items`);
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
