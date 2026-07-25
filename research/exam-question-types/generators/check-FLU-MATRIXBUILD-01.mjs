// Independent validator for the FLU-MATRIXBUILD-01 structured bank.
//
// FLU-MATRIXBUILD-01 is a CONSTRUCTED response (scoring.mode = 'computed_solver'),
// so this file does not just compare a stored key: it re-implements the rule
// taxonomy from scratch (predicate style, not the generator's constructive style),
// re-induces the missing tile from the VISIBLE cells only, and re-runs the
// declared equivalence rule as a server would.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Served/server split: `content` carries no answer, key, lure or rule data.
//   3. Independent solver: for each constructed attribute, every rule in the
//      taxonomy that fits the visible cells predicts ONE value; that value is the
//      declared canonical answer and exactly one picker option carries it.
//   4. Equivalence rule re-run: canonical response scores max; every single-
//      attribute mutation scores max-1 (per-attribute partial credit works).
//   5. Lure taxonomy covers every picker option exactly once, with one 'correct'
//      per constructed attribute, and the correct slot is not positionally leaked.
//   6. Reproducibility: each item regenerates byte-identically from its provenance.
//   7. Difficulty: matches an independent implementation of the declared model and
//      is monotone in the continuous lever.
//   8. Coverage: spans 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-FLU-MATRIXBUILD-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, allConfigs } from './FLU-MATRIXBUILD-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/FLU-MATRIXBUILD-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8']; // this type's declared age_bands (no K-1)
const ALLOWED_LURES = [
  'correct',
  'row_repeat',
  'column_repeat',
  'operation_confusion',
  'off_by_one',
  'distribution_slip',
  'grid_value_other',
  'off_pattern',
];
const BANK_ITEM_KEYS = [
  'itemId',
  'typeCode',
  'domain',
  'difficulty',
  'ageBands',
  'demoPath',
  'content',
  'answer',
  'scoring',
  'provenance',
  'syntheticOnly',
  'validated',
];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ================================================================== *
 * INDEPENDENT RULE TAXONOMY — written as predicates over the visible grid.
 * Deliberately NOT the generator's constructive code: this re-derives the blank
 * from what a child can actually see, which is what the server solver must do.
 * ================================================================== */
function inducePredictions(values, G, numeric) {
  // values: G x G with values[G-1][G-1] === null (the blank).
  const shown = [];
  for (let r = 0; r < G; r++)
    for (let c = 0; c < G; c++) if (!(r === G - 1 && c === G - 1)) shown.push({ r, c, v: values[r][c] });
  const row = (r) => shown.filter((s) => s.r === r).map((s) => s.v);
  const col = (c) => shown.filter((s) => s.c === c).map((s) => s.v);
  const allSame = (xs) => xs.every((x) => x === xs[0]);
  const uniq = (xs) => [...new Set(xs)];
  const preds = [];

  if (Array.from({ length: G }, (_, r) => row(r)).every(allSame)) preds.push({ rule: 'row_constant', value: row(G - 1)[0] });
  if (Array.from({ length: G }, (_, c) => col(c)).every(allSame)) preds.push({ rule: 'col_constant', value: col(G - 1)[0] });

  const alphabet = uniq(shown.map((s) => s.v));
  if (alphabet.length === G) {
    const rowsDistinct = Array.from({ length: G }, (_, r) => uniq(row(r)).length === row(r).length).every(Boolean);
    const colsDistinct = Array.from({ length: G }, (_, c) => uniq(col(c)).length === col(c).length).every(Boolean);
    if (rowsDistinct && colsDistinct) {
      const gapRow = alphabet.filter((v) => !row(G - 1).includes(v));
      const gapCol = alphabet.filter((v) => !col(G - 1).includes(v));
      if (gapRow.length === 1 && gapCol.length === 1 && gapRow[0] === gapCol[0])
        preds.push({ rule: 'latin', value: gapRow[0] });
    }
  }

  if (numeric) {
    const deltas = [];
    for (let r = 0; r < G; r++) {
      const vs = row(r);
      for (let i = 1; i < vs.length; i++) deltas.push(vs[i] - vs[i - 1]);
    }
    const dset = uniq(deltas);
    if (dset.length === 1 && dset[0] !== 0) {
      const lastRow = row(G - 1);
      preds.push({ rule: 'progression', value: lastRow[lastRow.length - 1] + dset[0] });
    }
    if (G === 3) {
      const full = [0, 1];
      if (full.every((r) => values[r][2] === values[r][0] + values[r][1]))
        preds.push({ rule: 'arithmetic_add', value: values[G - 1][0] + values[G - 1][1] });
      if (full.every((r) => values[r][2] === values[r][0] - values[r][1]))
        preds.push({ rule: 'arithmetic_sub', value: values[G - 1][0] - values[G - 1][1] });
    }
  }
  return preds;
}

/* ================================================================== *
 * INDEPENDENT DIFFICULTY MODEL — transcribed from the documented lever weights
 * (relational-complexity rung), not imported from the generator.
 * ================================================================== */
const D_ATTR = { shape: 1.0, color: 1.05, count: 1.2 };
const D_RULE = { row_constant: 1.0, col_constant: 1.15, latin: 1.9, progression: 2.2, arithmetic_add: 2.8, arithmetic_sub: 3.0 };
const D_LOAD_SPAN = 3.4;
function rawOf(gridSize, attrRules, countMax, load) {
  const hasCount = attrRules.some((a) => a.attr === 'count');
  return (
    1.0 +
    (gridSize === 3 ? 2.4 : 0) +
    attrRules.reduce((s, a) => s + D_ATTR[a.attr] + D_RULE[a.rule], 0) +
    1.1 * (attrRules.length - 1) +
    (hasCount ? 0.35 * (countMax - 3) : 0) +
    D_LOAD_SPAN * load
  );
}
const SPACE = allConfigs();
const D_RAW_MIN = Math.min(...SPACE.map((c) => rawOf(c.gridSize, c.attrRules, c.countMax, 0)));
const D_RAW_MAX = Math.max(...SPACE.map((c) => rawOf(c.gridSize, c.attrRules, c.countMax, 1)));
function difficultyOf(gridSize, attrRules, countMax, load) {
  const d = 1 + ((rawOf(gridSize, attrRules, countMax, load) - D_RAW_MIN) * 19) / (D_RAW_MAX - D_RAW_MIN);
  return Math.max(1, Math.min(20, d));
}

/* ================================================================== *
 * SERVER-SIDE SCORER — re-runs answer.equivalence deterministically.
 * ================================================================== */
function scoreConstructed(item, submitted) {
  const eq = item.answer.equivalence;
  let score = 0;
  for (const attr of eq.attributes) {
    const want = item.answer.canonical[attr];
    let got = submitted[attr];
    if (attr === 'count') got = typeof got === 'string' ? parseInt(got, 10) : got;
    else got = typeof got === 'string' ? got.trim().toLowerCase() : got;
    if (got === want) score += eq.partialCredit.scorePerAttribute;
  }
  return score;
}

/* ---- 1. Parse ---- */
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

/* ---- 2..7. Per-item checks ---- */
const seenIds = new Set();
const correctSlotIndex = [];
const byConfig = new Map();

for (const it of items) {
  const id = it.itemId || '(no id)';

  const keys = Object.keys(it).sort();
  if (!deepEq(keys, BANK_ITEM_KEYS.slice().sort())) fail(id, `BankItem keys != contract set (${keys.join(',')})`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(it.itemId))
    fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'FLU-MATRIXBUILD-01') fail(id, `typeCode != FLU-MATRIXBUILD-01 (${it.typeCode})`);
  if (it.domain !== 'fluid_reasoning') fail(id, `domain != fluid_reasoning (${it.domain})`);
  if (it.demoPath !== 'demos/FLU-MATRIXBUILD-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands}) — K-1 is out of band for this type`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const sc = it.scoring || {};
  if (sc.mode !== 'computed_solver') fail(id, `scoring.mode != computed_solver (${sc.mode})`);
  if (!sc.solver || sc.solver.deterministic !== true) fail(id, 'scoring.solver.deterministic must be true');

  const c = it.content || {};
  const G = c.gridSize;
  if (![2, 3].includes(G)) fail(id, `gridSize not 2 or 3 (${G})`);

  // ---- 2. served-subset safety: no answer data reachable from content ----
  const contentJson = JSON.stringify(c);
  for (const banned of ['correctKey', 'canonical', 'lure', 'rationale', 'answer', 'solution', 'attrRules', 'inducedRules', 'ruleType'])
    if (contentJson.includes(banned)) fail(id, `content leaks answer-side field "${banned}"`);
  for (const p of c.pickers || [])
    for (const o of p.options || []) {
      const ok = Object.keys(o).sort();
      if (!deepEq(ok, ['key', 'value'])) fail(id, `picker option carries extra fields (${ok.join(',')})`);
    }

  const attrs = c.constructedAttributes || [];
  if (!Array.isArray(attrs) || attrs.length < 1 || attrs.length > 3) fail(id, `constructedAttributes out of 1..3 (${attrs})`);
  if (G === 2 && attrs.length > 2) fail(id, '2x2 grid must not carry 3 constructed attributes');
  if (!c.prompt || typeof c.prompt !== 'string') fail(id, 'content.prompt missing (on-screen reading gate, D-017)');

  const cells = c.matrix && c.matrix.cells;
  if (!Array.isArray(cells) || cells.length !== G || cells.some((r) => !Array.isArray(r) || r.length !== G))
    fail(id, 'matrix.cells is not GxG');
  else {
    let nulls = 0;
    for (let r = 0; r < G; r++) for (let cc = 0; cc < G; cc++) if (cells[r][cc] === null) nulls++;
    if (nulls !== 1) fail(id, `expected exactly 1 blank cell, got ${nulls}`);
    if (cells[G - 1][G - 1] !== null) fail(id, 'blank must be the bottom-right cell');
    for (let r = 0; r < G; r++)
      for (let cc = 0; cc < G; cc++) {
        const t = cells[r][cc];
        if (t === null) continue;
        if (typeof t.shape !== 'string' || typeof t.color !== 'string' || !Number.isInteger(t.count))
          fail(id, `cell (${r},${cc}) malformed`);
      }
    // Non-constructed attributes must be constant everywhere (nothing extra to reason about).
    for (const attr of ['shape', 'color', 'count']) {
      if (attrs.includes(attr)) continue;
      const vals = new Set();
      for (let r = 0; r < G; r++) for (let cc = 0; cc < G; cc++) if (cells[r][cc]) vals.add(cells[r][cc][attr]);
      if (vals.size !== 1) fail(id, `non-constructed attribute "${attr}" varies across the grid`);
      if (c.fixedAttributes && c.fixedAttributes[attr] !== [...vals][0])
        fail(id, `content.fixedAttributes.${attr} does not match the grid`);
    }
  }

  // ---- 3. independent solver ----
  const ans = it.answer || {};
  if (!ans.canonical || !ans.equivalence) fail(id, 'answer.canonical / answer.equivalence missing');
  if (Array.isArray(cells) && cells.length === G) {
    for (const attr of attrs) {
      const values = cells.map((row, r) => row.map((t, cc) => (r === G - 1 && cc === G - 1 ? null : t[attr])));
      const preds = inducePredictions(values, G, attr === 'count');
      const distinct = [...new Set(preds.map((p) => p.value))];
      if (preds.length === 0) fail(id, `${attr}: no taxonomy rule fits the visible cells (unsolvable)`);
      else if (distinct.length !== 1)
        fail(id, `${attr}: visible cells are ambiguous (${preds.map((p) => `${p.rule}->${p.value}`).join(', ')})`);
      else if (distinct[0] !== (ans.canonical || {})[attr])
        fail(id, `${attr}: solver derived ${distinct[0]} but answer.canonical says ${(ans.canonical || {})[attr]}`);
      // the derived value must be offered exactly once in that attribute's picker
      const picker = (c.pickers || []).find((p) => p.attribute === attr);
      if (!picker) fail(id, `${attr}: no picker for a constructed attribute`);
      else {
        const hits = picker.options.filter((o) => o.value === distinct[0]);
        if (hits.length !== 1) fail(id, `${attr}: picker offers the derived value ${hits.length} times (want 1)`);
        else if ((ans.correctOptionKeys || {})[attr] !== hits[0].key)
          fail(id, `${attr}: correctOptionKeys says ${(ans.correctOptionKeys || {})[attr]}, solver says ${hits[0].key}`);
        else correctSlotIndex.push(picker.options.findIndex((o) => o.key === hits[0].key));
        if (new Set(picker.options.map((o) => o.value)).size !== picker.options.length)
          fail(id, `${attr}: picker offers duplicate values`);
        if (picker.options.length < 3 || picker.options.length > 6)
          fail(id, `${attr}: picker option count out of 3..6 (${picker.options.length})`);
      }
    }
    // correctKey must be exactly the canonical vector in the documented format
    const expectKey = ['shape', 'color', 'count']
      .filter((a) => attrs.includes(a))
      .map((a) => `${a}=${(ans.canonical || {})[a]}`)
      .join('|');
    if (ans.correctKey !== expectKey) fail(id, `correctKey "${ans.correctKey}" != canonical vector "${expectKey}"`);
  }

  // ---- 4. re-run the declared equivalence rule as a server would ----
  const eq = ans.equivalence || {};
  if (eq.rule !== 'attribute_vector_exact') fail(id, `unknown equivalence rule (${eq.rule})`);
  if (!deepEq(eq.attributes, attrs)) fail(id, 'equivalence.attributes != constructedAttributes');
  if (!eq.partialCredit || eq.partialCredit.maxScore !== attrs.length) fail(id, 'equivalence.partialCredit.maxScore != attribute count');
  if (sc.solver && sc.solver.maxScore !== attrs.length) fail(id, 'scoring.solver.maxScore != attribute count');
  if (ans.canonical) {
    if (scoreConstructed(it, ans.canonical) !== attrs.length) fail(id, 'canonical response does not score full credit');
    for (const attr of attrs) {
      const picker = (c.pickers || []).find((p) => p.attribute === attr);
      const wrong = picker && picker.options.find((o) => o.value !== ans.canonical[attr]);
      if (!wrong) continue;
      const mutated = { ...ans.canonical, [attr]: wrong.value };
      if (scoreConstructed(it, mutated) !== attrs.length - 1)
        fail(id, `single-attribute miss on "${attr}" does not score exactly maxScore-1`);
    }
    // string-normalised submission must still score (the declared normalization)
    const messy = {};
    for (const attr of attrs) messy[attr] = attr === 'count' ? String(ans.canonical[attr]) : ` ${String(ans.canonical[attr]).toUpperCase()} `;
    if (scoreConstructed(it, messy) !== attrs.length) fail(id, 'declared normalization does not accept an equivalent submission');
  }

  // ---- 5. lure taxonomy ----
  const rats = ans.distractorRationales || {};
  const allOptionKeys = (c.pickers || []).flatMap((p) => p.options.map((o) => o.key));
  const ratKeys = Object.keys(rats);
  if (ratKeys.length !== allOptionKeys.length || !allOptionKeys.every((k) => ratKeys.includes(k)))
    fail(id, 'distractorRationales do not cover every picker option key');
  for (const k of ratKeys) {
    const r = rats[k];
    if (!r || !ALLOWED_LURES.includes(r.lure)) fail(id, `option ${k} has an unknown lure (${r && r.lure})`);
    if (!r || !attrs.includes(r.attribute)) fail(id, `option ${k} rationale names a non-constructed attribute`);
  }
  for (const attr of attrs) {
    const corr = ratKeys.filter((k) => rats[k].attribute === attr && rats[k].lure === 'correct');
    if (corr.length !== 1) fail(id, `${attr}: expected exactly 1 "correct" rationale, got ${corr.length}`);
  }

  // ---- 6. reproducibility from provenance ----
  const lev = (it.provenance && it.provenance.levers) || {};
  try {
    const regen = genItem({
      gridSize: lev.gridSize,
      attrRules: lev.attrRules,
      countMax: lev.countMax,
      perceptualLoad: lev.perceptualLoad,
      seed: it.provenance.seed,
    });
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }

  // ---- 7. difficulty from an independent implementation of the model ----
  const derived = round2(difficultyOf(lev.gridSize, lev.attrRules || [], lev.countMax, lev.perceptualLoad));
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != independently derived ${derived}`);
  const sig = `G${lev.gridSize}|${(lev.attrRules || []).map((r) => r.attr + ':' + r.rule).join(',')}|M${lev.countMax}`;
  if (!byConfig.has(sig)) byConfig.set(sig, []);
  byConfig.get(sig).push({ load: lev.perceptualLoad, d: it.difficulty });

  // age band must agree with the difficulty rung
  const expectBands = [];
  if (it.difficulty < 8.5) expectBands.push('2-3');
  if (it.difficulty >= 7.5 && it.difficulty < 12.5) expectBands.push('4-5');
  if (it.difficulty >= 11.5) expectBands.push('6-8');
  if (!deepEq(it.ageBands, expectBands)) fail(id, `ageBands ${it.ageBands} != rung-derived ${expectBands}`);
}

// monotonicity of the continuous lever within a fixed config
for (const [sig, rows] of byConfig) {
  const sorted = rows.slice().sort((a, b) => a.load - b.load);
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].d < sorted[i - 1].d - 1e-9) fail('difficulty', `config ${sig} is not monotone in perceptual load`);
}

// the correct picker slot must not be positionally predictable
if (correctSlotIndex.length) {
  const zeroShare = correctSlotIndex.filter((i) => i === 0).length / correctSlotIndex.length;
  if (zeroShare > 0.45) fail('leak', `correct picker option sits first ${(zeroShare * 100).toFixed(0)}% of the time (positional leak)`);
}

/* ---- 8. Coverage ---- */
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
for (const b of binCounts.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < MIN_PER_BAND))
  fail('coverage', `integer bin k=${b.k} has ${b.n} items (<${MIN_PER_BAND})`);
for (const b of bandCounts.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < MIN_PER_BAND))
  fail('coverage', `+/-1pt band around k=${b.k} has ${b.n} items (<${MIN_PER_BAND})`);

/* ---- Report ---- */
console.log(`FLU-MATRIXBUILD-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`distinct lever configs used: ${byConfig.size}`);
console.log(`solver: re-induced ${items.reduce((s, it) => s + (it.content.constructedAttributes || []).length, 0)} attribute rules from visible cells only`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — structure valid, every blank independently re-derived and unique, equivalence rule reproducible with partial credit, no answer data in content, coverage 1..20 with >=5 per bin and per +/-1pt band.');
