// Independent validator for the VER-BUILDIT-01 structured bank.
//
// The headline check is the ANSWER-KEY FIREWALL. The browser receives
// ServedItem = BankItem minus {answer, scoring, provenance} (build plan §2), so anything
// reachable from `content` is public. This file re-implements the leak detection from the
// contract rather than importing the generator's own validator, so a bug in the generator
// cannot certify itself.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a BankItem with EXACTLY the contract key set (§2).
//   2. SERVED-SUBSET FIREWALL: no answer-revealing key, and no literal "correct" value,
//      is reachable from `content` at ANY depth.
//   3. ADVERSARIAL ORACLE: no per-option field value predicts the correct option. This
//      catches a leak renamed to an innocent key, which a name-based scan would miss.
//   4. answer.distractorRationales is an OBJECT keyed by option index (a positional array
//      containing "correct" is the same leak one layer up), covers every option exactly
//      once, uses only the declared lure taxonomy, and names exactly one 'correct'.
//   5. correctKey is not positionally predictable across the bank.
//   6. Difficulty coverage by the governing SLIDING-WINDOW rule: for every x in 1..20,
//      #{items with |difficulty - x| <= 1} >= 5. (This is the build-plan rule; the
//      one-point-wide integer bucket is a stricter bin and is reported for information only.)
//   7. Byte-level reproducibility: the committed JSONL equals the generator output.
//   8. Born-synthetic governance flags and the K-1 reading gate (D-017).
//
// Run:  node research/exam-question-types/generators/check-VER-BUILDIT-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBank } from './VER-BUILDIT-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/VER-BUILDIT-01.jsonl');

const TYPE = 'VER-BUILDIT-01';
const DOMAIN = 'verbal';
const SCORING_MODE = 'deterministic_key';
const LURE_CLASSES = new Set(["correct","rule_violation","reversed_relation","global_mismatch"]);
const OPTION_KEYS = ["placements"];
const CONTRACT_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
const MIN_WINDOW_DENSITY = 5;
const MAX_WORD_LEN_K1 = 8;
const MIN_FREQ_K1 = 5;

// Keys that identify the correct option. Stated independently of the generator.
const LEAK_KEY = /^(lure|lures|misconception|correct|iscorrect|is_correct|correctkey|key|keys|answer|answers|answerkey|solution|solver|rule|rules|rationale|rationales|distractorrationales|fit|why|note|explanation|error|errortype|error_type|truth|verdict|valid|isvalid|expected|score|points)$/i;
// Correctness markers only. Ordinary words like "key" or "answer" are legitimate stimulus
// vocabulary for a verbal type; a leak hidden behind an innocent-looking value is caught by
// the adversarial oracle below instead of by name matching.
const LEAK_VALUE = /^(correct|incorrect|is_?correct)$/i;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

function walk(node, path, visit) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`, visit)); return; }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) { visit(k, v, `${path}.${k}`); walk(v, `${path}.${k}`, visit); }
  }
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8');
const lines = raw.trim().length ? raw.trim().split('\n') : [];
if (!lines.length) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1}: ${e.message}`); }
});

const seenIds = new Set();

for (const it of items) {
  const id = it.itemId || '(no id)';

  // ---- contract shape + governance ----
  if (!deepEq(Object.keys(it).sort(), CONTRACT_KEYS.slice().sort())) fail(id, `BankItem keys != contract set (${Object.keys(it).join(',')})`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== TYPE) fail(id, `typeCode != ${TYPE} (${it.typeCode})`);
  if (it.domain !== DOMAIN) fail(id, `domain != ${DOMAIN} (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length) fail(id, 'ageBands empty');
  if (it.demoPath !== `demos/${TYPE}.html`) fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== SCORING_MODE) fail(id, `scoring.mode != ${SCORING_MODE}`);
  if (!it.provenance || it.provenance.generator !== 'llm') fail(id, 'provenance.generator != llm');
  if (typeof (it.provenance || {}).seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};

  // ---- 2. SERVED-SUBSET FIREWALL ----
  walk(c, 'content', (k, v, path) => {
    if (LEAK_KEY.test(k)) fail(id, `content leaks an answer-revealing key at ${path}`);
    if (typeof v === 'string' && LEAK_VALUE.test(v.trim())) fail(id, `content carries answer-revealing value "${v}" at ${path}`);
    if (v === true && /correct|right|answer|solution/i.test(k)) fail(id, `content carries a correctness flag at ${path}`);
  });

  // ---- type-specific content shape ----
  if (c.presentation !== 'word') fail(id, "content.presentation must be 'word' (D-017)");
  if (typeof c.prompt !== 'string' || !c.prompt) fail(id, 'content.prompt missing');
  const dirs = c.directions;
  if (!Array.isArray(dirs) || dirs.length < 2 || dirs.some((s) => typeof s !== 'string' || !s)) { fail(id, 'content.directions must be >=2 non-empty strings'); continue; }
  if (c.pieceCount !== dirs.length) fail(id, 'content.pieceCount mismatch');
  const opts = c.options;
  if (!Array.isArray(opts) || opts.length < 3 || opts.length > 4) { fail(id, 'content.options must have 3..4 entries'); continue; }
  opts.forEach((o, oi) => {
    if (!deepEq(Object.keys(o).sort(), OPTION_KEYS)) fail(id, `option[${oi}] carries fields beyond ${OPTION_KEYS.join('+')} (${Object.keys(o)})`);
    const n = dirs.length;
    if (!Array.isArray(o.placements) || o.placements.length !== n) { fail(id, `option[${oi}] placements must have ${n} entries`); return; }
    if (new Set(o.placements.map((p) => p.slot)).size !== n) fail(id, `option[${oi}] slots must be distinct`);
    o.placements.forEach((p, pi) => {
      if (!p || typeof p.slot !== 'string' || !p.slot || typeof p.piece !== 'string' || !p.piece) fail(id, `option[${oi}] placement[${pi}] needs slot+piece`);
      if (!deepEq(Object.keys(p).sort(), ['piece', 'slot'])) fail(id, `option[${oi}] placement[${pi}] carries extra fields (${Object.keys(p)})`);
    });
  });
  const sigs = opts.map((o) => (o.placements || []).map((p) => `${p.slot}=${p.piece}`).join('|'));
  if (new Set(sigs).size !== sigs.length) fail(id, 'duplicate arrangements across options');

  // ---- 4. keyed rationales ----
  const ak = it.answer || {};
  if (typeof ak.correctKey !== 'number' || !(ak.correctKey >= 0 && ak.correctKey < opts.length)) fail(id, `answer.correctKey out of range (${ak.correctKey})`);
  const rats = ak.distractorRationales;
  if (!rats || typeof rats !== 'object' || Array.isArray(rats)) {
    fail(id, 'answer.distractorRationales must be an object keyed by option index, not a positional array');
  } else {
    const expected = opts.map((_, i) => String(i));
    if (!deepEq(Object.keys(rats).sort(), expected.slice().sort())) fail(id, `distractorRationales keys ${Object.keys(rats)} != option indices ${expected}`);
    const lures = expected.map((k) => (rats[k] || {}).lure);
    lures.forEach((l, li) => {
      if (!LURE_CLASSES.has(l)) fail(id, `option[${li}] lure "${l}" outside the declared taxonomy`);
      if (typeof (rats[String(li)] || {}).why !== 'string' || rats[String(li)].why.length < 8) fail(id, `option[${li}] rationale has no usable diagnostic text (M-LURETYPE)`);
    });
    const nCorrect = lures.filter((l) => l === 'correct').length;
    if (nCorrect !== 1) fail(id, `${nCorrect} lures labelled correct (need exactly 1)`);
    const distractors = lures.filter((l) => l !== 'correct');
    if (new Set(distractors).size !== distractors.length) fail(id, 'duplicate distractor lure classes');
    if (lures[ak.correctKey] !== 'correct') fail(id, `correctKey ${ak.correctKey} does not point at the 'correct' lure`);
  }

  // ---- 8. K-1 reading gate (D-017) ----
  if (Array.isArray(it.ageBands) && it.ageBands.includes('K-1')) {
    const words = [...dirs.join(' ').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean), ...opts.flatMap((o) => (o.placements || []).flatMap((p) => [...String(p.piece).split(' '), ...String(p.slot).split('-')]))];
    const tooLong = words.filter((w) => w && w.length > MAX_WORD_LEN_K1);
    if (tooLong.length) fail(id, `K-1 reading gate — words too long: ${tooLong.join(', ')}`);
    if (isNum(c.frequencyBand) && c.frequencyBand < MIN_FREQ_K1) fail(id, `K-1 reading gate — frequencyBand ${c.frequencyBand} < ${MIN_FREQ_K1}`);
  }
}

// ---- 3. ADVERSARIAL ORACLE: can any content-only signal recover the key? ----
// For every field appearing on option objects, check whether any value is a reliable
// "this one is correct" tell across the bank.
{
  const fields = new Set();
  for (const it of items) for (const o of (it.content || {}).options || []) {
    if (o && typeof o === 'object') for (const k of Object.keys(o)) fields.add(k);
  }
  for (const field of fields) {
    const stat = new Map();
    for (const it of items) {
      const opts = (it.content || {}).options || [];
      const ck = (it.answer || {}).correctKey;
      if (typeof ck !== 'number') continue;
      opts.forEach((o, i) => {
        if (!o || typeof o !== 'object' || !(field in o)) return;
        const v = JSON.stringify(o[field]);
        const e = stat.get(v) || { total: 0, correct: 0 };
        e.total++; if (i === ck) e.correct++;
        stat.set(v, e);
      });
    }
    for (const [v, e] of stat) {
      if (e.total >= 5 && e.correct / e.total >= 0.95) {
        fail('oracle', `options[].${field} value ${v.slice(0, 60)} is correct ${e.correct}/${e.total} times — content predicts the key`);
      }
    }
  }
}

// ---- 5. positional predictability of the key ----
{
  const keys = items.map((i) => (i.answer || {}).correctKey).filter((k) => typeof k === 'number');
  const counts = {};
  keys.forEach((k) => (counts[k] = (counts[k] || 0) + 1));
  const distinct = Object.keys(counts).length;
  const maxShare = keys.length ? Math.max(...Object.values(counts)) / keys.length : 0;
  if (distinct <= 1) fail('position', `correctKey is always index ${Object.keys(counts)[0]} — the key is positionally guessable`);
  else if (maxShare > 0.6) fail('position', `correctKey lands on one index ${(maxShare * 100).toFixed(0)}% of the time (${JSON.stringify(counts)})`);
}

// ---- 6. SLIDING-WINDOW difficulty coverage (the governing rule) ----
const diffs = items.map((i) => i.difficulty).filter(isNum);
const windows = [];
for (let x = 1; x <= 20; x++) {
  const n = diffs.filter((d) => Math.abs(d - x) <= 1).length;
  windows.push(n);
  if (n < MIN_WINDOW_DENSITY) fail('coverage', `sliding window x=${x}: ${n} items with |difficulty-x|<=1 (<${MIN_WINDOW_DENSITY})`);
}
const bins = Array.from({ length: 20 }, () => 0);
for (const d of diffs) { const k = Math.round(d); if (k >= 1 && k <= 20) bins[k - 1]++; }

// ---- 7. byte-level reproducibility ----
{
  const regen = buildBank().map((it) => JSON.stringify(it)).join('\n') + '\n';
  if (regen !== raw) fail('repro', 'committed JSONL does not byte-match the generator output (run the generator and commit the result)');
}

console.log(`${TYPE} bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(Math.min(...diffs))} .. ${round2(Math.max(...diffs))}`);
console.log('sliding window  (x:n, |d-x|<=1):  ' + windows.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`worst-case sliding window: ${Math.min(...windows)}  (rule: >=${MIN_WINDOW_DENSITY})`);
console.log('integer bucket  (k:n, informational):  ' + bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — contract keys exact, NO answer-revealing key or value reachable from');
console.log('       content at any depth, no content field predicts the key (adversarial');
console.log('       oracle), rationales keyed by option index with the lure taxonomy intact,');
console.log('       key not positionally guessable, sliding-window coverage met, bank');
console.log('       byte-matches the generator.');
