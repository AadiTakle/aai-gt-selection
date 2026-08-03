// Independent validator for the FLU-DEDUCE-01 structured bank.
//
// The clue semantics, the survivor solver and the difficulty arithmetic below are
// RE-IMPLEMENTED here from the documented model rather than imported, so a bug in
// the generator cannot validate itself. The generator is imported only to prove the
// item is byte-reproducible from its own provenance.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: content carries no answer key or lure taxonomy.
//   3. Independent deduction: exactly ONE candidate satisfies every clue, and it is
//      the declared correctKey; every clue eliminates at least one candidate.
//   4. Difficulty equals the value independently re-derived from the item's levers,
//      and the item regenerates byte-identically from its provenance.
//   5. Coverage: spans 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-FLU-DEDUCE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem } from './FLU-DEDUCE-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/FLU-DEDUCE-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8']; // this type excludes K-1 by design
const ALLOWED_LURES = [
  'correct',
  'single_clue_miss',
  'multi_clue_miss',
  'negation_trap',
  'conjunction_partial',
  'relational_miss',
];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---- independent clue evaluator (re-implemented from the documented forms) ---- */
function holds(clue, f) {
  if (clue.form === 'is') return f[clue.dim] === clue.value;
  if (clue.form === 'not') return f[clue.dim] !== clue.value;
  if (clue.form === 'and') return clue.terms.every((t) => f[t.dim] === t.value);
  if (clue.form === 'atleast') return f[clue.dim] >= clue.value;
  if (clue.form === 'atmost') return f[clue.dim] <= clue.value;
  return false;
}

/* ---- independent difficulty arithmetic (documented lever model) ---- */
const base = (L) =>
  1.0 + 1.3 * (L.nClues - 2) + 0.7 * (L.nCands - 4) + 1.1 * L.negCount + 1.6 * L.conjCount + 1.0 * L.relCount;
const SIM_SPAN = 3.0;
// Anchors span the DOCUMENTED design space: 2..5 clues, 4..8 candidates, at most
// 2 negated / 2 conjunctive / 2 relational clues, and no more special-form clues
// than there are clues. Enumerated here rather than imported.
const ANCHORS = (() => {
  const bases = [];
  for (let nClues = 2; nClues <= 5; nClues++)
    for (let nCands = 4; nCands <= 8; nCands++)
      for (let negCount = 0; negCount <= 2; negCount++)
        for (let conjCount = 0; conjCount <= 2; conjCount++)
          for (let relCount = 0; relCount <= 2; relCount++) {
            if (negCount + conjCount + relCount > nClues) continue;
            bases.push(base({ nClues, nCands, negCount, conjCount, relCount }));
          }
  return bases;
})();
const RAW_MIN = Math.min(...ANCHORS);
const RAW_MAX = Math.max(...ANCHORS) + SIM_SPAN;
function difficultyOf(L) {
  const raw = base(L) + SIM_SPAN * L.candidateSimilarity;
  return Math.max(1, Math.min(20, 1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN)));
}

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

// ---- 2 + 3 + 4. Per-item checks ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'FLU-DEDUCE-01') fail(id, `typeCode != FLU-DEDUCE-01 (${it.typeCode})`);
  if (it.domain !== 'fluid_reasoning') fail(id, `domain != fluid_reasoning (${it.domain})`);
  if (it.demoPath !== 'demos/FLU-DEDUCE-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
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
  const clues = c.clues || [];
  const cands = c.candidates || [];
  if (!Array.isArray(clues) || clues.length < 2 || clues.length > 5) fail(id, `clue count out of 2..5 (${clues.length})`);
  if (clues.length !== c.clueCount) fail(id, 'content.clueCount != clues.length');
  if (!Array.isArray(cands) || cands.length < 4 || cands.length > 8)
    fail(id, `candidate count out of 4..8 (${cands.length})`);
  if (cands.length !== c.candidateCount) fail(id, 'content.candidateCount != candidates.length');

  // SERVED-SUBSET SAFETY: nothing renderable may carry the key or the taxonomy.
  const contentStr = JSON.stringify(c);
  for (const leak of ['correctKey', 'distractorRationales', 'targetFigure', 'lure', 'cluesViolated', 'isCorrect'])
    if (contentStr.includes(leak)) fail(id, `content leaks "${leak}"`);
  const keys = cands.map((o) => o && o.key);
  if (new Set(keys).size !== keys.length) fail(id, 'candidate keys not unique');
  const FIG_DIMS = ['shape', 'color', 'fill', 'size', 'tilt', 'dots', 'pos'];
  for (const o of cands) {
    const f = o && o.figure;
    if (!f || FIG_DIMS.some((d) => f[d] === undefined)) fail(id, 'candidate figure malformed');
    else if (!isNum(f.dots)) fail(id, 'candidate dots not numeric');
  }
  const clueIds = clues.map((x) => x.clueId);
  if (new Set(clueIds).size !== clueIds.length) fail(id, 'clue ids not unique');
  const clueDimsUsed = [];
  for (const cl of clues) {
    if (!['is', 'not', 'and', 'atleast', 'atmost'].includes(cl.form)) fail(id, `unknown clue form ${cl.form}`);
    if (typeof cl.label !== 'string' || !cl.label.length) fail(id, 'clue missing on-screen label');
    clueDimsUsed.push(...(cl.form === 'and' ? cl.terms.map((t) => t.dim) : [cl.dim]));
  }
  // One constraint per dimension => no clue can be implied by another.
  if (new Set(clueDimsUsed).size !== clueDimsUsed.length)
    fail(id, `clues share a dimension (${clueDimsUsed.join(',')}) — a clue may be redundant`);

  // ---- 3. INDEPENDENT DEDUCTION: solve the lineup from clues alone ----
  const survivors = cands.filter((o) => clues.every((cl) => holds(cl, o.figure))).map((o) => o.key);
  if (survivors.length !== 1) fail(id, `solver found ${survivors.length} survivors (want exactly 1)`);
  else if (survivors[0] !== (it.answer || {}).correctKey)
    fail(id, `solver survivor ${survivors[0]} != declared correctKey ${(it.answer || {}).correctKey}`);

  // Every clue must eliminate at least one candidate (no inert clue).
  for (const cl of clues) {
    if (!cands.some((o) => !holds(cl, o.figure))) fail(id, `clue ${cl.clueId} eliminates nobody (inert)`);
  }

  // Rationales: cover every key, exactly one "correct", lure labels from the taxonomy,
  // and each listed violation must actually hold under the independent evaluator.
  const ans = it.answer || {};
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  if (ratKeys.length !== keys.length || !keys.every((k) => ratKeys.includes(k)))
    fail(id, 'distractorRationales do not cover every candidate key');
  const correctRats = ratKeys.filter((k) => rats[k] && lureLabel(rats[k]) === 'correct');
  if (correctRats.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${correctRats.length}`);
  else if (correctRats[0] !== ans.correctKey) fail(id, 'the "correct" rationale key != correctKey');
  for (const k of ratKeys) {
    const r = rats[k] || {};
    if (!ALLOWED_LURES.includes(lureLabel(r))) fail(id, `unknown lure label "${lureLabel(r)}" on ${k}`);
    const cand = cands.find((o) => o.key === k);
    if (!cand) continue;
    const trueViolations = clues.filter((cl) => !holds(cl, cand.figure)).map((cl) => cl.clueId);
    if (!deepEq((r.cluesViolated || []).slice().sort(), trueViolations.slice().sort()))
      fail(id, `rationale ${k} lists ${JSON.stringify(r.cluesViolated)} but solver finds ${JSON.stringify(trueViolations)}`);
    if (lureLabel(r) === 'negation_trap' && !(trueViolations.length === 1 && clues.find((cl) => cl.clueId === trueViolations[0]).form === 'not'))
      fail(id, `${k} tagged negation_trap but is not a single negated-clue near-miss`);
  }

  // ---- 4. Difficulty + reproducibility ----
  const lev = (it.provenance && it.provenance.levers) || {};
  const derived = round2(difficultyOf(lev));
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
  try {
    const regen = normalizeBankItem(genItem({ ...lev, seed: it.provenance.seed }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }
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
binCounts.forEach((n, i) => {
  if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`);
});
bandCounts.forEach((n, i) => {
  if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`);
});

// ---- Report ----
console.log(`FLU-DEDUCE-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — parses, structure valid, unique survivor re-derived independently, coverage 1..20 with >=5 per bin and per +/-1pt band.');
