#!/usr/bin/env node
/**
 * Independent validator for the QUANT-WORD-01 structured bank.
 *
 * This file deliberately imports NOTHING from the generator. It re-derives every
 * answer from scratch by parsing the item's own structured math fields and
 * recomputing them with an evaluator written here; the stored `answer.correctKey`
 * is never trusted, only compared against.
 *
 * Checks (exit nonzero on any failure):
 *   1.  JSONL parses; each row has EXACTLY the BankItem keys of BUILD_PLAN §2.
 *   2.  Governance flags: syntheticOnly true, validated false, scoring mode,
 *       provenance generator/seed, uuid-shaped unique itemIds, allowed ageBands.
 *   3.  Rendered text <-> deep structure: the numerals printed in the story are a
 *       BIJECTION onto the declared quantities, the question prints no numeral,
 *       and storyText is exactly the sentences plus the question.
 *   4.  INDEPENDENT RE-DERIVATION: evaluate content.math.steps over
 *       content.math.quantities, take the value at content.math.answerStep, and
 *       require that exactly one option carries it and that option is correctKey.
 *   5.  Distractor diagnostics: every lure is in the taxonomy, and every lure's
 *       stored derivation is re-evaluated here and must reproduce that option's
 *       value exactly (so M-LURETYPE / M-ERRTYPE labels are earned, not asserted).
 *   6.  Irrelevant information: quantities no step references are counted and
 *       must match the recorded lever.
 *   7.  No key leak: `content` carries no correctness marker, no answer value
 *       field, and options expose only {key, value}.
 *   8.  Reading gate (D-017): the reading load recomputed from the text matches
 *       the recorded load and stays inside the caps for the item's LOWEST band.
 *   9.  Band density: >=5 items per integer difficulty bin 1..20 AND per +/-1 pt
 *       band, spanning the floor and the ceiling.
 *   10. Ladder sanity: reasoning steps and relational depth actually rise with
 *       difficulty (difficulty is not being carried by arithmetic size).
 *
 * Run:  node research/exam-question-types/generators/check-QUANT-WORD-01.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/QUANT-WORD-01.jsonl');

const TYPE_CODE = 'QUANT-WORD-01';
const DOMAIN = 'quantitative';
const DEMO_PATH = 'demos/QUANT-WORD-01.html';
// The QUANT-WORD-01 catalog spec declares no K-1 band for this type.
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;
const BANK_KEYS = [
  'itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated',
];
const LURE_CLASSES = new Set([
  'wrong_operation', 'off_by_one_step', 'used_the_irrelevant_number',
  'reversed_comparison', 'miscount_by_one',
]);
const OPS = new Set(['add', 'sub', 'mul', 'div', 'mod']);
const READING_CAPS = {
  '2-3': { maxSentences: 5, maxWords: 45, maxWordLength: 9 },
  '4-5': { maxSentences: 7, maxWords: 75, maxWordLength: 11 },
  '6-8': { maxSentences: 9, maxWords: 115, maxWordLength: 14 },
};
// Any field name inside `content` containing one of these betrays the key.
const LEAK_TOKENS = [
  'correct', 'answer', 'solution', 'lure', 'misconception', 'rationale',
  'distractor', 'derivation', 'verdict', 'score',
];
// `math.answerStep` names WHICH step ends the computation; it carries no value
// and the renderer never reads it, so it is the one sanctioned exception.
const LEAK_ALLOW_PATHS = new Set(['content.math.answerStep']);
// `content` is a closed shape: an unexpected field is a leak until proven safe.
const CONTENT_KEYS = ['typeCode', 'presentation', 'prompt', 'storyText', 'storySentences',
  'question', 'math', 'options', 'readingLoad'];
const MATH_KEYS = ['schema', 'unknownPosition', 'stepCount', 'relationalDepth',
  'quantities', 'operations', 'steps', 'answerStep'];
const READING_KEYS = ['sentences', 'words', 'maxWordLength', 'band'];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isInt = (x) => typeof x === 'number' && Number.isInteger(x);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/* ------------------------------------------------------------------ *
 * Independent arithmetic evaluator (no generator code involved).
 * Operands: {q:<quantityId>} | {s:<stepId>} | {lit:<int>} (lures only).
 * ------------------------------------------------------------------ */
function evaluate(quantityValues, steps, { allowLiterals = false } = {}) {
  const vals = { ...quantityValues };
  for (const st of steps) {
    if (!st || typeof st.id !== 'string' || !OPS.has(st.op)) return { error: `bad step ${JSON.stringify(st)}` };
    const read = (o) => {
      if (!o || typeof o !== 'object') return { error: 'operand not an object' };
      if (o.q !== undefined) return vals[o.q] === undefined ? { error: `unknown quantity ${o.q}` } : { v: vals[o.q] };
      if (o.s !== undefined) return vals[o.s] === undefined ? { error: `unknown step ${o.s}` } : { v: vals[o.s] };
      if (o.lit !== undefined) {
        if (!allowLiterals) return { error: 'literal operand not allowed here' };
        return isInt(o.lit) ? { v: o.lit } : { error: 'non-integer literal' };
      }
      return { error: `unresolvable operand ${JSON.stringify(o)}` };
    };
    const A = read(st.a), B = read(st.b);
    if (A.error) return { error: A.error };
    if (B.error) return { error: B.error };
    let r;
    if (st.op === 'add') r = A.v + B.v;
    else if (st.op === 'sub') r = A.v - B.v;
    else if (st.op === 'mul') r = A.v * B.v;
    else if (st.op === 'div') { if (B.v === 0 || A.v % B.v !== 0) return { error: 'non-exact division' }; r = A.v / B.v; }
    else if (st.op === 'mod') { if (B.v === 0) return { error: 'mod by zero' }; r = A.v % B.v; }
    if (!Number.isInteger(r)) return { error: 'non-integer intermediate' };
    vals[st.id] = r;
  }
  return { vals };
}

function readOperand(vals, o, allowLiterals) {
  if (!o || typeof o !== 'object') return null;
  if (o.q !== undefined) return vals[o.q];
  if (o.s !== undefined) return vals[o.s];
  if (o.lit !== undefined && allowLiterals) return o.lit;
  return null;
}

// Reading load, recomputed from the text alone.
function measureReading(sentences) {
  const text = sentences.join(' ');
  const words = text.split(/\s+/).filter(Boolean);
  const alpha = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return {
    sentences: sentences.length,
    words: words.length,
    maxWordLength: alpha.reduce((m, w) => Math.max(m, w.length), 0),
  };
}

// Recursive scan of `content` for anything that would name the correct option.
function scanForLeaks(node, path, id) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((v, i) => scanForLeaks(v, `${path}[${i}]`, id)); return; }
  for (const [k, v] of Object.entries(node)) {
    const here = `${path}.${k}`;
    const lower = k.toLowerCase();
    if (!LEAK_ALLOW_PATHS.has(here) && LEAK_TOKENS.some((t) => lower.includes(t))) {
      fail(id, `content leaks answer field "${here}"`);
    }
    scanForLeaks(v, here, id);
  }
}
function assertExactKeys(obj, want, label, id) {
  if (!obj || typeof obj !== 'object') return;
  const got = Object.keys(obj).sort(), exp = want.slice().sort();
  if (got.length !== exp.length || got.some((k, i) => k !== exp[i])) {
    fail(id, `${label} keys != expected shape (got ${got.join(',')})`);
  }
}

/* ---- 1. Parse ---- */
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} is not valid JSON: ${e.message}`); }
});

/* ---- 2..8. Per-item checks ---- */
const seenIds = new Set();
const seenStories = new Set();
const lureCounts = {};
const schemaCounts = {};
let resolvedCorrect = 0;

for (const it of items) {
  const id = (it && it.itemId) || '(no id)';

  // --- shape / governance ---
  const keys = Object.keys(it).sort();
  const want = BANK_KEYS.slice().sort();
  if (keys.length !== want.length || keys.some((k, i) => k !== want[i])) {
    fail(id, `BankItem keys != contract set (got ${keys.join(',')})`);
  }
  if (typeof it.itemId !== 'string' || !UUID_RE.test(it.itemId)) fail(id, 'itemId is not a v4 uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== TYPE_CODE) fail(id, `typeCode != ${TYPE_CODE}`);
  if (it.domain !== DOMAIN) fail(id, `domain != ${DOMAIN}`);
  if (it.demoPath !== DEMO_PATH) fail(id, `demoPath != ${DEMO_PATH}`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `ageBands outside the type spec (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, `scoring.mode != deterministic_key (${it.scoring && it.scoring.mode})`);
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string' || !it.provenance.seed) fail(id, 'provenance.seed missing');

  const c = it.content;
  if (!c || typeof c !== 'object') { fail(id, 'content missing'); continue; }
  if (c.typeCode !== TYPE_CODE) fail(id, 'content.typeCode mismatch');
  if (c.presentation !== 'text') fail(id, `content.presentation must be "text" (D-017 reading gate), got ${c.presentation}`);
  if (typeof c.prompt !== 'string' || !c.prompt) fail(id, 'content.prompt missing');

  // --- 7. no key leak: closed shape + name scan ---
  assertExactKeys(c, CONTENT_KEYS, 'content', id);
  assertExactKeys(c.math, MATH_KEYS, 'content.math', id);
  assertExactKeys(c.readingLoad, READING_KEYS, 'content.readingLoad', id);
  scanForLeaks(c, 'content', id);

  // --- text integrity ---
  if (!Array.isArray(c.storySentences) || c.storySentences.length < 2) fail(id, 'content.storySentences too short');
  if (typeof c.question !== 'string' || !c.question.trim().endsWith('?')) fail(id, 'content.question must end with "?"');
  if (typeof c.storyText !== 'string') fail(id, 'content.storyText missing');
  const rebuilt = [...(c.storySentences || []), c.question].join(' ');
  if (c.storyText !== rebuilt) fail(id, 'storyText != storySentences + question');
  if (/\d/.test(c.question || '')) fail(id, 'question sentence prints a numeral (the child must carry it from the story)');
  if (seenStories.has(c.storyText)) fail(id, 'duplicate story text in the bank');
  seenStories.add(c.storyText);

  // --- math skeleton ---
  const m = c.math;
  if (!m || typeof m !== 'object') { fail(id, 'content.math missing'); continue; }
  if (typeof m.schema !== 'string' || !m.schema) fail(id, 'math.schema missing');
  schemaCounts[m.schema] = (schemaCounts[m.schema] || 0) + 1;
  if (typeof m.unknownPosition !== 'string') fail(id, 'math.unknownPosition missing');
  if (!Array.isArray(m.quantities) || m.quantities.length < 2) fail(id, 'math.quantities too short');
  if (!Array.isArray(m.steps) || m.steps.length < 1) { fail(id, 'math.steps missing'); continue; }
  if (m.stepCount !== m.steps.length) fail(id, `math.stepCount ${m.stepCount} != steps.length ${m.steps.length}`);
  if (!Array.isArray(m.operations) || m.operations.length !== m.steps.length
    || m.operations.some((op, i) => op !== m.steps[i].op)) fail(id, 'math.operations does not mirror the step ops');
  if (!isInt(m.relationalDepth) || m.relationalDepth < 1) fail(id, 'math.relationalDepth invalid');

  const qVals = {};
  for (const q of m.quantities) {
    if (!q || typeof q.id !== 'string' || !isInt(q.value) || q.value < 0) { fail(id, `bad quantity ${JSON.stringify(q)}`); continue; }
    if (qVals[q.id] !== undefined) fail(id, `duplicate quantity id ${q.id}`);
    qVals[q.id] = q.value;
    if (Object.keys(q).length !== 2) fail(id, `quantity ${q.id} exposes extra fields (${Object.keys(q).join(',')})`);
  }

  // content steps may never use literals — every operand must be a story number
  for (const st of m.steps) {
    for (const side of ['a', 'b']) {
      const o = st[side];
      if (o && o.lit !== undefined) fail(id, `step ${st.id} uses a literal operand (all operands must be printed story numbers)`);
    }
  }

  // --- 3. printed numerals <-> declared quantities (bijection) ---
  const printed = ((c.storyText || '').match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
  const declared = m.quantities.map((q) => q.value).sort((a, b) => a - b);
  if (printed.length !== declared.length || printed.some((v, i) => v !== declared[i])) {
    fail(id, `printed numerals [${printed}] != declared quantities [${declared}]`);
  }
  if (new Set(printed).size !== printed.length) fail(id, 'the same numeral is printed twice (ambiguous reference)');

  // --- 4. INDEPENDENT RE-DERIVATION of the answer ---
  const run = evaluate(qVals, m.steps, { allowLiterals: false });
  if (run.error) { fail(id, `math.steps do not evaluate: ${run.error}`); continue; }
  if (typeof m.answerStep !== 'string' || run.vals[m.answerStep] === undefined) {
    fail(id, `math.answerStep "${m.answerStep}" is not a computed step`); continue;
  }
  const derived = run.vals[m.answerStep];
  if (!isInt(derived) || derived < 1) fail(id, `re-derived answer ${derived} is not a positive integer`);
  if (m.answerStep !== m.steps[m.steps.length - 1].id) fail(id, 'answerStep is not the final step (dangling computation)');

  const opts = c.options;
  if (!Array.isArray(opts) || opts.length !== 4) { fail(id, `expected 4 options, got ${opts && opts.length}`); continue; }
  const optKeys = opts.map((o) => o && o.key);
  if (new Set(optKeys).size !== 4) fail(id, 'option keys not unique');
  if (optKeys.join('') !== 'ABCD') fail(id, `option keys must be A,B,C,D in order (got ${optKeys.join(',')})`);
  for (const o of opts) {
    if (!o || typeof o.key !== 'string' || !isInt(o.value)) fail(id, `malformed option ${JSON.stringify(o)}`);
    else if (Object.keys(o).length !== 2) fail(id, `option ${o.key} exposes extra fields (${Object.keys(o).join(',')})`);
    else if (o.value < 0) fail(id, `option ${o.key} is negative`);
  }
  if (new Set(opts.map((o) => o.value)).size !== 4) fail(id, 'option values are not distinct');

  const matching = opts.filter((o) => o.value === derived).map((o) => o.key);
  if (matching.length !== 1) fail(id, `re-derived answer ${derived} matches ${matching.length} options (want exactly 1)`);
  const ans = it.answer || {};
  if (matching.length === 1) {
    if (matching[0] !== ans.correctKey) fail(id, `solver key ${matching[0]} != stored correctKey ${ans.correctKey}`);
    else resolvedCorrect++;
  }

  // --- 5. distractor diagnostics, each recomputed ---
  const rats = ans.distractorRationales || {};
  const nonCorrect = optKeys.filter((k) => k !== ans.correctKey);
  const ratKeys = Object.keys(rats).sort();
  if (ratKeys.length !== 3 || nonCorrect.slice().sort().join('') !== ratKeys.join('')) {
    fail(id, `distractorRationales must cover exactly the 3 non-correct keys (got ${ratKeys.join(',')})`);
  }
  for (const k of nonCorrect) {
    const r = rats[k];
    if (!r) continue;
    if (!LURE_CLASSES.has(r.lure)) { fail(id, `option ${k} has unknown lure "${r.lure}"`); continue; }
    lureCounts[r.lure] = (lureCounts[r.lure] || 0) + 1;
    if (typeof r.misconception !== 'string' || !r.misconception) fail(id, `option ${k} lure has no misconception label`);
    const d = r.derivation;
    if (!d || !Array.isArray(d.steps) || !d.value) { fail(id, `option ${k} lure has no recomputable derivation`); continue; }
    const dr = evaluate(qVals, d.steps, { allowLiterals: true });
    if (dr.error) { fail(id, `option ${k} derivation does not evaluate: ${dr.error}`); continue; }
    const dv = readOperand(dr.vals, d.value, true);
    const optVal = (opts.find((o) => o.key === k) || {}).value;
    if (dv === null || dv === undefined) fail(id, `option ${k} derivation value operand unresolved`);
    else if (dv !== optVal) fail(id, `option ${k} lure "${r.lure}" recomputes to ${dv} but the option shows ${optVal}`);
    if (optVal === derived) fail(id, `option ${k} is labelled a distractor but equals the correct value`);
    // the irrelevant lure must actually reference an unused quantity
    if (r.lure === 'used_the_irrelevant_number') {
      const usedInLure = new Set();
      for (const st of d.steps) for (const side of ['a', 'b']) if (st[side] && st[side].q) usedInLure.add(st[side].q);
      const usedInMath = new Set();
      for (const st of m.steps) for (const side of ['a', 'b']) if (st[side] && st[side].q) usedInMath.add(st[side].q);
      if (![...usedInLure].some((q) => !usedInMath.has(q))) {
        fail(id, `option ${k} claims the irrelevant-number lure but uses no unreferenced quantity`);
      }
    }
  }

  // --- 6. irrelevant-information bookkeeping ---
  const referenced = new Set();
  for (const st of m.steps) for (const side of ['a', 'b']) if (st[side] && st[side].q) referenced.add(st[side].q);
  const unreferenced = m.quantities.filter((q) => !referenced.has(q.id)).length;
  const lever = (it.provenance && it.provenance.levers) || {};
  if (lever.irrelevantCount !== unreferenced) {
    fail(id, `levers.irrelevantCount ${lever.irrelevantCount} != ${unreferenced} unreferenced quantities`);
  }
  if (lever.stepCount !== m.steps.length) fail(id, 'levers.stepCount != actual step count');

  // --- 8. reading gate (D-017) ---
  const band = it.ageBands && it.ageBands[0];
  const caps = READING_CAPS[band];
  const reading = measureReading([...(c.storySentences || []), c.question || '']);
  const rl = c.readingLoad || {};
  if (rl.band !== band) fail(id, `readingLoad.band ${rl.band} != lowest ageBand ${band}`);
  for (const f of ['sentences', 'words', 'maxWordLength']) {
    if (rl[f] !== reading[f]) fail(id, `readingLoad.${f} ${rl[f]} != recomputed ${reading[f]}`);
  }
  if (caps) {
    if (reading.sentences > caps.maxSentences) fail(id, `band ${band}: ${reading.sentences} sentences > cap ${caps.maxSentences}`);
    if (reading.words > caps.maxWords) fail(id, `band ${band}: ${reading.words} words > cap ${caps.maxWords}`);
    if (reading.maxWordLength > caps.maxWordLength) fail(id, `band ${band}: longest word ${reading.maxWordLength} > cap ${caps.maxWordLength}`);
  } else fail(id, `no reading cap for band ${band}`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(c.storyText || '')) fail(id, 'story text contains a pictograph/emoji');
}

/* ---- 9. Band density ---- */
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (floor not reached)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ceiling not reached)`);

const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

/* ---- 10. Ladder sanity: structure, not arithmetic size, carries difficulty ---- */
const low = items.filter((it) => it.difficulty < 5);
const high = items.filter((it) => it.difficulty >= 16);
const mid = items.filter((it) => it.difficulty >= 9 && it.difficulty < 13);
const meanBy = (arr, f) => (arr.length ? arr.reduce((s, x) => s + f(x), 0) / arr.length : 0);
const stepsLow = meanBy(low, (it) => it.content.math.stepCount);
const stepsMid = meanBy(mid, (it) => it.content.math.stepCount);
const stepsHigh = meanBy(high, (it) => it.content.math.stepCount);
const depthLow = meanBy(low, (it) => it.content.math.relationalDepth);
const depthHigh = meanBy(high, (it) => it.content.math.relationalDepth);
if (!(stepsHigh > stepsMid && stepsMid > stepsLow)) {
  fail('ladder', `mean reasoning steps do not rise across the ladder (low ${round2(stepsLow)}, mid ${round2(stepsMid)}, high ${round2(stepsHigh)})`);
}
if (!(depthHigh > depthLow + 1)) {
  fail('ladder', `mean relational depth does not rise (low ${round2(depthLow)}, high ${round2(depthHigh)})`);
}
const irrLow = low.filter((it) => it.provenance.levers.irrelevantCount > 0).length / Math.max(1, low.length);
const irrHigh = high.filter((it) => it.provenance.levers.irrelevantCount > 0).length / Math.max(1, high.length);
if (!(irrHigh >= irrLow)) fail('ladder', 'irrelevant information does not become more common with difficulty');
// The arithmetic itself must NOT be what gets harder: the biggest operand at the
// ceiling may not be dramatically larger than at the floor.
const maxOperand = (it) => Math.max(...it.content.math.quantities.map((q) => q.value));
const opLow = meanBy(low, maxOperand), opHigh = meanBy(high, maxOperand);
if (opHigh > opLow * 3) fail('ladder', `operand size grew ${round2(opHigh / opLow)}x from floor to ceiling — difficulty is leaking into arithmetic magnitude`);

/* ---- Report ---- */
console.log(`QUANT-WORD-01 bank check: ${items.length} items`);
console.log(`answers independently re-derived and matched: ${resolvedCorrect}/${items.length}`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min per integer bin: ${Math.min(...binCounts)} | min per +/-1pt band: ${Math.min(...bandCounts)}`);
console.log('mean reasoning steps  low/mid/high: '
  + `${round2(stepsLow)} / ${round2(stepsMid)} / ${round2(stepsHigh)}`);
console.log('mean relational depth low/high:     ' + `${round2(depthLow)} / ${round2(depthHigh)}`);
console.log('mean largest operand  low/high:     ' + `${round2(opLow)} / ${round2(opHigh)}  (must stay flat)`);
console.log('lure classes: ' + JSON.stringify(lureCounts));
console.log('schemas: ' + JSON.stringify(schemaCounts));
console.log(`unique story texts: ${seenStories.size}`);

if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - every answer re-derived from the item\'s own math fields, every lure recomputed,'
  + ' text matches structure, no key leak, reading load inside band caps,'
  + ' and >=5 items per integer bin and per +/-1 pt band across 1..20.');
