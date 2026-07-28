// Tiny validator for the FLU-VENN-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: content carries NO rule dims/values and NO answer leak
//      (the child must induce the rules from the exemplars alone).
//   3. Rules are inducible + unique + keyed: each ring's exemplars have EXACTLY ONE
//      constant dimension (the rule); exactly ONE candidate satisfies BOTH rules and
//      it is the declared correctKey (the spec's uniqueness audit).
//   4. Reproducible from provenance; difficulty equals difficulty-from-levers.
//   5. Difficulty coverage: spans 1..20 with >=5 per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-FLU-VENN-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers, ALLDIMS, DOM } from './FLU-VENN-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/FLU-VENN-01.jsonl');
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

// Dimensions that are CONSTANT across a set of exemplar figures.
function constantDims(exs) {
  return ALLDIMS.filter((d) => exs.every((f) => f[d] === exs[0][d]));
}
function validFig(f) {
  return f && ALLDIMS.every((d) => Object.prototype.hasOwnProperty.call(f, d));
}

// ---- 2 + 3. Per-item structural + rule-induction + uniqueness checks ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'FLU-VENN-01') fail(id, `typeCode != FLU-VENN-01 (${it.typeCode})`);
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
  if (c.ruleCount !== 2) fail(id, `content.ruleCount != 2 (${c.ruleCount})`);
  if (![2, 3].includes(c.exemplarCount)) fail(id, `exemplarCount not 2..3 (${c.exemplarCount})`);
  if (![4, 5, 6].includes(c.optionCount)) fail(id, `optionCount not 4..6 (${c.optionCount})`);
  // Renderable content must NOT leak the rule dims/values (child must induce them).
  for (const leak of ['leftDim', 'rightDim', 'leftVal', 'rightVal', 'correctKey', 'answer'])
    if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks rule field "${leak}"`);

  const leftEx = c.leftExemplars || [];
  const rightEx = c.rightExemplars || [];
  if (leftEx.length !== c.exemplarCount || rightEx.length !== c.exemplarCount) fail(id, 'exemplar arrays != exemplarCount');
  for (const f of [...leftEx, ...rightEx]) if (!validFig(f)) fail(id, 'exemplar figure malformed');

  // Options: optionCount candidates, unique keys, renderable subset only.
  const opts = c.options || [];
  if (!Array.isArray(opts) || opts.length !== c.optionCount || opts.length < 4 || opts.length > 6)
    fail(id, `options count out of 4..6 or != optionCount (${opts.length})`);
  const keys = opts.map((o) => o && o.key);
  if (new Set(keys).size !== keys.length) fail(id, 'option keys not unique');
  for (const o of opts) {
    if (!o || typeof o.key !== 'string' || !validFig(o.figure)) fail(id, 'option figure malformed');
    for (const leak of ['lure', 'rulesSatisfied', 'tag', 'correct', 'isCorrect'])
      if (o && Object.prototype.hasOwnProperty.call(o, leak)) fail(id, `option leaks answer field "${leak}"`);
  }

  // Answer bookkeeping.
  const ans = it.answer || {};
  if (!keys.includes(ans.correctKey)) fail(id, `correctKey "${ans.correctKey}" not an option key`);
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  if (ratKeys.length !== keys.length || !keys.every((k) => ratKeys.includes(k)))
    fail(id, 'distractorRationales do not cover every option key');
  const correctRats = ratKeys.filter((k) => rats[k] && lureLabel(rats[k]) === 'correct');
  if (correctRats.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${correctRats.length}`);
  else if (correctRats[0] !== ans.correctKey) fail(id, 'the "correct" rationale key != correctKey');

  // Rule induction + uniqueness: each ring's exemplars must fix EXACTLY ONE dimension.
  if (leftEx.length && rightEx.length && leftEx.every(validFig) && rightEx.every(validFig)) {
    const lc = constantDims(leftEx);
    const rc = constantDims(rightEx);
    if (lc.length !== 1) fail(id, `left ring exemplars fix ${lc.length} dims (want exactly 1): [${lc}]`);
    if (rc.length !== 1) fail(id, `right ring exemplars fix ${rc.length} dims (want exactly 1): [${rc}]`);
    if (lc.length === 1 && rc.length === 1) {
      const leftDim = lc[0];
      const rightDim = rc[0];
      if (leftDim === rightDim) fail(id, 'left and right rule dims coincide');
      const leftVal = leftEx[0][leftDim];
      const rightVal = rightEx[0][rightDim];
      // Consistency with the declared answer.
      if (ans.leftDim !== leftDim || ans.leftVal !== leftVal) fail(id, `declared left rule (${ans.leftDim}=${ans.leftVal}) != induced (${leftDim}=${leftVal})`);
      if (ans.rightDim !== rightDim || ans.rightVal !== rightVal) fail(id, `declared right rule (${ans.rightDim}=${ans.rightVal}) != induced (${rightDim}=${rightVal})`);
      // Exactly one candidate satisfies BOTH rings, and it is the declared correctKey.
      const both = opts.filter((o) => o.figure[leftDim] === leftVal && o.figure[rightDim] === rightVal).map((o) => o.key);
      if (both.length !== 1) fail(id, `${both.length} candidates satisfy both rings (want exactly 1)`);
      else if (both[0] !== ans.correctKey) fail(id, `conjunction key ${both[0]} != declared correctKey ${ans.correctKey}`);
    }
  }

  // 4. Reproducibility: regenerate from provenance and deep-compare.
  const lev = (it.provenance && it.provenance.levers) || {};
  try {
    const regen = normalizeBankItem(genItem({ leftDim: lev.leftDim, rightDim: lev.rightDim, exemplarCount: lev.exemplarCount, optionCount: lev.optionCount, distractorSimilarity: lev.distractorSimilarity, keyPosition: lev.keyPosition, seed: it.provenance.seed }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }

  // Difficulty must equal the value derived from its own levers.
  const derived = round2(difficultyFromLevers([lev.leftDim, lev.rightDim], lev.exemplarCount, lev.optionCount, lev.distractorSimilarity));
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
console.log(`FLU-VENN-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — parses, structure valid, rules inducible+unique, key reproducible, coverage 1..20 with >=5 per bin and per +/-1pt band.');
