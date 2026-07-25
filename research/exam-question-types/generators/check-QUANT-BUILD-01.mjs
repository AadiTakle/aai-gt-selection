// Tiny validator for the QUANT-BUILD-01 structured bank.
//
// QUANT-BUILD-01 is a construction/optimisation task: arrange cards into place
// slots to build the largest/smallest value obeying the pictured rules. Checks
// (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Served split: content carries the cards/goal/rules but NOT the answer.
//   3. Key is reproducible: an independent solver enumerates the permutation
//      space, confirms a UNIQUE optimum, and matches answer.optimalValue/key.
//   4. The documented deterministic value-scorer credits only the optimum and
//      rejects the misconception builds (wrong value and/or rule violations).
//   5. Each distractor is a real permutation of the cards with a named misconception.
//   6. Item is reproducible from its provenance seed (grammar has not drifted).
//   7. Difficulty coverage: spans 1..20 with >=5 per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-QUANT-BUILD-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildItem, solveOptimum, feasible, valueOf } from './QUANT-BUILD-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/QUANT-BUILD-01.jsonl');
const ALLOWED_BANDS = ['K-1', '2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;
const sortedMultiset = (a) => a.slice().sort((x, y) => x - y).join(',');

// Documented deterministic scorer (mirrors scoring.description).
function scoreBuild(item, arrangement) {
  const c = item.content;
  const feas = feasible(arrangement, c.constraints || {});
  return { correct: feas && valueOf(arrangement) === item.answer.optimalValue, feasible: feas };
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} invalid JSON: ${e.message}`); } });

// ---- Per-item ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'QUANT-BUILD-01') fail(id, `typeCode != QUANT-BUILD-01 (${it.typeCode})`);
  if (it.domain !== 'quantitative') fail(id, `domain != quantitative (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (typeof it.provenance?.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  if (!Array.isArray(c.cards) || c.cards.length !== c.slots) fail(id, 'cards length != slots');
  if (!['max', 'min'].includes(c.goal)) fail(id, `bad goal (${c.goal})`);
  if (!['dots', 'digits'].includes(c.representation)) fail(id, `bad representation (${c.representation})`);
  // 2. no answer leak in served content.
  for (const leak of ['optimalValue', 'optimalArrangement', 'correctKey', 'answer'])
    if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks ${leak}`);

  // 3. re-solve independently.
  const sol = solveOptimum(c);
  if (!sol) { fail(id, 'solver found no feasible arrangement'); continue; }
  if (sol.arrangements.length !== 1) fail(id, `optimum not unique (${sol.arrangements.length} arrangements)`);
  if (sol.value !== it.answer.optimalValue) fail(id, `solver value ${sol.value} != answer ${it.answer.optimalValue}`);
  if (it.answer.correctKey !== sol.arrangement.join('')) fail(id, `correctKey ${it.answer.correctKey} != solver ${sol.arrangement.join('')}`);
  if (sol.runnerUp == null) fail(id, 'no runner-up value (optimum not well-separated)');
  else if (c.goal === 'max' && !(sol.value > sol.runnerUp)) fail(id, 'optimum not strictly > runner-up');
  else if (c.goal === 'min' && !(sol.value < sol.runnerUp)) fail(id, 'optimum not strictly < runner-up');

  // start layout must require rearrangement.
  if (valueOf(c.cards) === sol.value) fail(id, 'start layout already optimal (no swap needed)');

  // 4. deterministic scorer behaviour.
  if (!scoreBuild(it, sol.arrangement).correct) fail(id, 'scorer rejects the optimum');
  if (scoreBuild(it, c.cards).correct) fail(id, 'scorer credits the (non-optimal) start layout');

  // 5. distractors: real permutations of the cards, named, and NOT optimal.
  const rats = it.answer.distractorRationales || {};
  if (Object.keys(rats).length < 1) fail(id, 'no distractor rationales');
  for (const [name, d] of Object.entries(rats)) {
    if (!d || typeof d.misconception !== 'string') fail(id, `distractor ${name} missing misconception`);
    if (!Array.isArray(d.arrangement)) { fail(id, `distractor ${name} missing arrangement`); continue; }
    if (sortedMultiset(d.arrangement) !== sortedMultiset(c.cards)) fail(id, `distractor ${name} is not a permutation of the cards`);
    if (valueOf(d.arrangement) !== d.value) fail(id, `distractor ${name} value mismatch`);
    if (d.value === it.answer.optimalValue) fail(id, `distractor ${name} equals the optimum`);
    if (scoreBuild(it, d.arrangement).correct) fail(id, `scorer credits distractor ${name}`);
  }

  // 6. reproducibility from provenance.
  const parts = it.provenance.seed.split(':');
  const masterSeed = parts[0];
  const rung = parseInt((parts[2] || '').replace(/^d/, ''), 10);
  const ordinal = parseInt((parts[3] || '').replace(/^i/, ''), 10);
  if (!Number.isInteger(rung) || !Number.isInteger(ordinal)) fail(id, 'cannot parse rung/ordinal from seed');
  else {
    try { const regen = buildItem(masterSeed, rung, ordinal); if (!regen) fail(id, 'regeneration produced null'); else if (!deepEq(regen, it)) fail(id, 'item NOT reproducible from provenance (grammar drift)'); }
    catch (e) { fail(id, `regeneration threw: ${e.message}`); }
  }
}

// ---- 7. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5`);
const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d); if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band k=${i + 1} has ${n} (<${MIN_PER_BAND})`); });

// ---- Report ----
console.log(`QUANT-BUILD-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — parses, unique optimum reproducible + no-leak, deterministic value-scorer verified, distractors valid, coverage 1..20 with >=5 per bin and per +/-1pt band.');
