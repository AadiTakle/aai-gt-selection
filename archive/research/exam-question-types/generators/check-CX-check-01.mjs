// Independent validator for the CX-check-01 "Check It Twice" bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: `content` carries NO truth marker (no trueBin, no
//      planted list, no correctness flag on a tile or bin).
//   3. The deterministically-checkable component is INDEPENDENTLY reproducible:
//      this file recomputes each tile's canonical repetition signature from its own
//      text, resolves the one bin whose rule it matches, and rebuilds the whole
//      answer key + planted-slip list without trusting any generator tag.
//   4. Board sanity: bin rules are distinct canonical signatures, every bin owns at
//      least two tiles in the TRUE assignment, tile texts are unique, the planted
//      count matches the lever, and no deadline is imposed (submit speed must never
//      be rewarded).
//   5. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND >=5 per
//      +/-1 pt band; each item's difficulty equals the value derived from its levers;
//      each item regenerates byte-identically from its provenance.
//
// Run:  node research/exam-question-types/generators/check-CX-check-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers, TEMPLATE_POOL } from './CX-check-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/CX-check-01.jsonl');
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
const round2 = (x) => Math.round(x * 100) / 100;

// Independent re-implementation of the repetition signature (does not import it).
function sigOf(text) {
  const seen = {};
  let next = 0;
  let out = '';
  for (const ch of text) {
    if (!(ch in seen)) {
      seen[ch] = String.fromCharCode(65 + next);
      next += 1;
    }
    out += seen[ch];
  }
  return out;
}

const FORBIDDEN_CONTENT_KEYS = [
  'truebin',
  'planted',
  'plantederrors',
  'correctkey',
  'answer',
  'iscorrect',
  'correct',
  'lure',
  'distractorrationales',
  'scoringrule',
  'solution',
  'answerkey',
];
function scanForLeaks(node, id, path = 'content') {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => scanForLeaks(v, id, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (FORBIDDEN_CONTENT_KEYS.includes(k.toLowerCase())) fail(id, `content leaks truth field "${path}.${k}"`);
    scanForLeaks(v, id, `${path}.${k}`);
  }
}

// ---- 2 + 3 + 4. Per-item checks ----
const seenIds = new Set();
let totalPlanted = 0;
const subtletyHistogram = new Map();

for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'CX-check-01') fail(id, `typeCode != CX-check-01 (${it.typeCode})`);
  if (it.domain !== 'fluid_reasoning') fail(id, `domain != fluid_reasoning (${it.domain})`);
  if (it.demoPath !== 'demos/CX-check-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20)
    fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  const ans = it.answer || {};

  // -- scoring bookkeeping: this type must NOT claim a judge it does not have --
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.scoring || !Array.isArray(it.scoring.deterministic) || it.scoring.deterministic.length < 4)
    fail(id, 'scoring.deterministic must list the machine-scored components');
  if (!it.scoring || !Array.isArray(it.scoring.deferred) || it.scoring.deferred.length !== 0)
    fail(id, 'scoring.deferred must be empty for this type (no judge exists or is needed)');
  if (!it.scoring || typeof it.scoring.deferredRationale !== 'string')
    fail(id, 'scoring.deferredRationale must explain why no judge is used');
  if (typeof ans.validityCaveat !== 'string' || ans.validityCaveat.length < 40)
    fail(id, 'answer.validityCaveat (carefulness vs slow processing) missing');

  // -- content shape --
  const bins = c.bins || [];
  const tokens = c.tokens || [];
  const P = c.patternLength;
  if (!Array.isArray(bins) || bins.length < 2 || bins.length > 4) fail(id, `binCount out of 2..4 (${bins.length})`);
  if (!Array.isArray(tokens) || tokens.length < 6 || tokens.length > 16)
    fail(id, `tokenCount out of 6..16 (${tokens.length})`);
  if (bins.length !== c.binCount) fail(id, 'content.binCount != bins.length');
  if (tokens.length !== c.tokenCount) fail(id, 'content.tokenCount != tokens.length');
  if (![3, 4, 5].includes(P)) fail(id, `patternLength not 3..5 (${P})`);
  if (tokens.length < 2 * bins.length) fail(id, 'fewer than two tiles per bin');
  if (!c.controls || c.controls.submitAvailableFrom !== 'start')
    fail(id, 'controls.submitAvailableFrom must be "start" (checking has to stay voluntary)');
  if (!c.controls || c.controls.timeLimitSec !== null)
    fail(id, 'controls.timeLimitSec must be null (never reward submit speed)');

  // bin rules must be distinct canonical signatures drawn from the declared pool
  const patterns = bins.map((b) => b && b.pattern);
  if (new Set(patterns).size !== patterns.length) fail(id, 'two bins share the same rule');
  const binKeys = bins.map((b) => b && b.key);
  if (new Set(binKeys).size !== binKeys.length) fail(id, 'bin keys not unique');
  for (const b of bins) {
    if (!b || typeof b.pattern !== 'string' || b.pattern.length !== P) fail(id, 'bin pattern malformed');
    else if (sigOf(b.pattern) !== b.pattern) fail(id, `bin pattern "${b.pattern}" is not canonical`);
    else if (!(TEMPLATE_POOL[P] || []).includes(b.pattern)) fail(id, `bin pattern "${b.pattern}" not in the pool`);
    if (Object.keys(b).length !== 2) fail(id, `bin carries extra fields (${Object.keys(b).join(',')})`);
  }

  // -- 2. no truth marker reachable from content --
  scanForLeaks(c, id);
  const tokenIds = tokens.map((t) => t && t.id);
  if (new Set(tokenIds).size !== tokenIds.length) fail(id, 'tile ids not unique');
  const texts = tokens.map((t) => t && t.text);
  if (new Set(texts).size !== texts.length) fail(id, 'two tiles share the same text (ambiguous review target)');
  for (const t of tokens) {
    if (!t || typeof t.id !== 'string' || typeof t.text !== 'string' || typeof t.bin !== 'string')
      fail(id, 'tile malformed');
    else {
      if (Object.keys(t).length !== 3) fail(id, `tile carries extra fields (${Object.keys(t).join(',')})`);
      if (t.text.length !== P) fail(id, `tile "${t.text}" is not ${P} long`);
      if (!binKeys.includes(t.bin)) fail(id, `tile ${t.id} sits in unknown bin ${t.bin}`);
    }
  }

  // -- 3. independent solve of the whole key from the visible board --
  const solvedTrueBin = {};
  let solvable = true;
  for (const t of tokens) {
    const sig = sigOf(t.text);
    const matches = bins.filter((b) => b.pattern === sig);
    if (matches.length !== 1) {
      fail(id, `tile ${t.id} ("${t.text}" -> ${sig}) matches ${matches.length} bin rules (want exactly 1)`);
      solvable = false;
    } else solvedTrueBin[t.id] = matches[0].key;
  }
  if (solvable) {
    if (!deepEq(solvedTrueBin, ans.trueBin)) fail(id, 'solver trueBin != answer.trueBin');
    const solvedKey = tokens.map((t) => `${t.id}:${solvedTrueBin[t.id]}`).join('|');
    if (solvedKey !== ans.correctKey) fail(id, 'solver correctKey != answer.correctKey');

    const solvedPlanted = tokens.filter((t) => t.bin !== solvedTrueBin[t.id]).map((t) => t.id).sort();
    const declaredPlanted = (ans.plantedErrors || []).map((p) => p.tokenId).sort();
    if (!deepEq(solvedPlanted, declaredPlanted)) fail(id, 'solver planted-slip set != answer.plantedErrors');
    const lev = (it.provenance && it.provenance.levers) || {};
    if (solvedPlanted.length !== lev.plantedErrors)
      fail(id, `board carries ${solvedPlanted.length} slips but the lever says ${lev.plantedErrors}`);
    totalPlanted += solvedPlanted.length;

    // every bin owns at least two tiles in the TRUE assignment
    for (const b of bins) {
      const owned = tokens.filter((t) => solvedTrueBin[t.id] === b.key).length;
      if (owned < 2) fail(id, `bin ${b.key} owns only ${owned} tile(s) in the true assignment`);
    }
    // rationales cover every tile and mark exactly the planted ones
    const rats = ans.distractorRationales || {};
    if (Object.keys(rats).length !== tokens.length) fail(id, 'distractorRationales do not cover every tile');
    const markedPlanted = Object.keys(rats).filter((k) => rats[k] && lureLabel(rats[k]) === 'planted_error').sort();
    if (!deepEq(markedPlanted, solvedPlanted)) fail(id, 'rationale planted set != solved planted set');
  }

  // -- 5. reproducibility + difficulty derives from levers --
  const lev = (it.provenance && it.provenance.levers) || {};
  try {
    const regen = normalizeBankItem(genItem({
      tokenCount: lev.tokenCount,
      binCount: lev.binCount,
      patternLength: lev.patternLength,
      plantedErrors: lev.plantedErrors,
      subtlety: lev.subtlety,
      seed: it.provenance.seed,
    }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }
  const derived = round2(
    difficultyFromLevers(lev.tokenCount, lev.binCount, lev.patternLength, lev.plantedErrors, lev.subtlety),
  );
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
  const bucket = Math.round(clampNum(lev.subtlety, 0, 1) * 4);
  subtletyHistogram.set(bucket, (subtletyHistogram.get(bucket) || 0) + 1);
}
function clampNum(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

// The subtlety lever must actually be exercised across the bank.
if (subtletyHistogram.size < 4) fail('coverage', `subtlety lever only reaches ${subtletyHistogram.size} of 5 buckets`);

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
for (const b of binCounts.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < MIN_PER_BAND))
  fail('coverage', `integer bin k=${b.k} has ${b.n} items (<${MIN_PER_BAND})`);
for (const b of bandCounts.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < MIN_PER_BAND))
  fail('coverage', `+/-1pt band around k=${b.k} has ${b.n} items (<${MIN_PER_BAND})`);

// ---- Report ----
console.log(`CX-check-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`planted slips re-derived independently from the visible board: ${totalPlanted}`);
console.log(
  'subtlety-lever buckets (0=obvious .. 4=subtle): ' +
    [...subtletyHistogram.entries()].sort((a, b) => a[0] - b[0]).map(([b, n]) => `${b}:${n}`).join(' '),
);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — parses, structure valid, content carries no truth marker, the full sort key and planted-slip list' +
    ' were independently re-derived from the visible board, coverage 1..20 with >=5 per bin and per +/-1pt band.',
);
