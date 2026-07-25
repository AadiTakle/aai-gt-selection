// Independent validator for the CX-diverge-01 "Brainstorm Blaster" bank.
//
// This type has NO answer key, so "key_matches_solver" does not apply. What IS
// deterministically checkable — and what this file independently reproduces —
// is (a) the rendered prompt text and window, which must follow from the levers
// alone, and (b) the M-IDEAFLU AUTO-COUNT RULE, re-implemented here from the
// documented description in `answer.autoCountRule` and cross-checked against the
// generator's exported function on a fixture. Everything else is deferred.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. No key is faked: answer.correctKey === null, a rationale is recorded, and
//      the deferred rubric + category scheme + open assumptions are present.
//   3. No judging aid leaks into `content` (no rubric, no category scheme, no
//      norm bank, no exemplar answers) — the child must not be told what kinds
//      of idea are being counted.
//   4. Independent reproduction: the prompt headline, subject, mode, constraint
//      set and timeWindowSec are rebuilt from the levers and compared; the
//      auto-count rule is re-implemented and cross-checked on fixtures.
//   5. Prompt hygiene: constraints unique and drawn from the pool, wording is
//      text-only (no audio directive), every mode x abstractness cell is used,
//      and the subject inventory is genuinely varied.
//   6. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND >=5
//      per +/-1 pt band; difficulty derives from levers; items regenerate.
//
// Run:  node research/exam-question-types/generators/check-CX-diverge-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  genItem,
  difficultyFromLevers,
  windowSecFor,
  countDistinctIdeas,
  MODES,
  SUBJECTS,
  CONSTRAINT_POOL,
  CATEGORY_SCHEME,
  WINDOW_MIN_SEC,
  WINDOW_MAX_SEC,
} from './CX-diverge-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/CX-diverge-01.jsonl');
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

/* ---- Independent re-implementation of the documented auto-count rule ---- */
function normLocal(text) {
  let s = String(text).toLowerCase();
  let out = '';
  for (const ch of s) out += /[a-z0-9]/.test(ch) ? ch : ' ';
  out = out.replace(/^\s+|\s+$/g, '');
  out = out.replace(/^(a|an|the)\s+/, '');
  return out.split(/\s+/).filter(Boolean).join(' ');
}
function countLocal(list) {
  const seen = new Set();
  for (const t of list) {
    const n = normLocal(t);
    if (n) seen.add(n);
  }
  return seen.size;
}
// Fixtures: the rule must be a PLAIN count — exact dedupe only, never fuzzy.
const AUTO_COUNT_FIXTURES = [
  { input: ['a hammer', 'Hammer!', 'hammer'], want: 1, why: 'case, punctuation and a leading article collapse' },
  { input: ['boat', 'tiny boat'], want: 2, why: 'different strings stay distinct (no semantic merging)' },
  { input: ['   ', 'flower pot', 'flower  pot'], want: 1, why: 'blank ignored; inner spacing collapses' },
  { input: [], want: 0, why: 'no ideas is a valid, countable outcome' },
];
for (const f of AUTO_COUNT_FIXTURES) {
  const mine = countLocal(f.input);
  const theirs = countDistinctIdeas(f.input);
  if (mine !== f.want) fail('autocount', `validator count ${mine} != expected ${f.want} (${f.why})`);
  if (theirs !== f.want) fail('autocount', `generator count ${theirs} != expected ${f.want} (${f.why})`);
}

const FORBIDDEN_CONTENT_KEYS = [
  'rubric',
  'categoryscheme',
  'categories',
  'normbank',
  'originalitynormbank',
  'exemplars',
  'answer',
  'correctkey',
  'autocountrule',
  'openassumptions',
  'solution',
];
function scanForLeaks(node, id, path = 'content') {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => scanForLeaks(v, id, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (FORBIDDEN_CONTENT_KEYS.includes(k.toLowerCase())) fail(id, `content leaks judging aid "${path}.${k}"`);
    scanForLeaks(v, id, `${path}.${k}`);
  }
}

// ---- 2 + 3 + 4 + 5. Per-item checks ----
const seenIds = new Set();
const cellsUsed = new Set();
const subjectsUsed = new Set();
const windowsSeen = new Set();

for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'CX-diverge-01') fail(id, `typeCode != CX-diverge-01 (${it.typeCode})`);
  if (it.domain !== 'fluid_reasoning') fail(id, `domain != fluid_reasoning (${it.domain})`);
  if (it.demoPath !== 'demos/CX-diverge-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
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
  const lev = (it.provenance && it.provenance.levers) || {};

  // -- 2. no faked key; deferred bookkeeping present --
  if (!('correctKey' in ans) || ans.correctKey !== null) fail(id, 'answer.correctKey must be null for this type');
  if (typeof ans.noKeyRationale !== 'string' || ans.noKeyRationale.length < 40) fail(id, 'answer.noKeyRationale missing');
  if (!it.scoring || it.scoring.mode !== 'model_judge_deferred') fail(id, 'scoring.mode != model_judge_deferred');
  if (!it.scoring || !Array.isArray(it.scoring.deterministic) || it.scoring.deterministic.length < 4)
    fail(id, 'scoring.deterministic must list the machine-computed signals');
  if (!it.scoring || !Array.isArray(it.scoring.deferred) || it.scoring.deferred.length < 3)
    fail(id, 'scoring.deferred must name every judge-dependent signal');
  const defText = ((it.scoring && it.scoring.deferred) || []).join(' ');
  if (!/M-FLEX/.test(defText) || !/M-ORIG/.test(defText))
    fail(id, 'M-FLEX and M-ORIG must be listed as deferred (no automated judge exists)');
  if (ans.originalityNormBank !== null) fail(id, 'answer.originalityNormBank must be null (no norm bank is built)');
  if (!Array.isArray(ans.openAssumptions) || ans.openAssumptions.length < 2)
    fail(id, 'answer.openAssumptions must record the missing norm bank and clusterer');
  const rub = ans.rubric || {};
  if (rub.judge !== 'deferred') fail(id, 'answer.rubric.judge must be "deferred"');
  if (!Array.isArray(rub.dimensions) || rub.dimensions.length < 4) fail(id, 'answer.rubric.dimensions missing');
  else
    for (const d of rub.dimensions) {
      if (!d.id || !d.anchors || Object.keys(d.anchors).length < 4)
        fail(id, `rubric dimension "${d.id}" needs 0..3 anchors`);
    }
  if (!deepEq(ans.categoryScheme, CATEGORY_SCHEME)) fail(id, 'answer.categoryScheme != the declared scheme');
  if (!ans.autoCountRule || !/exact/i.test(ans.autoCountRule.dedupe || ''))
    fail(id, 'answer.autoCountRule must document an EXACT (non-fuzzy) dedupe');

  // -- 3. no judging aid in content --
  scanForLeaks(c, id);

  // -- 4. independent reproduction of the rendered prompt from the levers --
  const mode = MODES[lev.modeIndex];
  if (!mode || c.prompt.mode !== mode) fail(id, `prompt.mode ${c.prompt && c.prompt.mode} != lever mode ${mode}`);
  else {
    const cell = SUBJECTS[mode][lev.abstractness];
    if (!cell) fail(id, `no subject cell for ${mode}/${lev.abstractness}`);
    else {
      const subject = cell[lev.subjectIndex % cell.length];
      let wantHead;
      if (mode === 'alternate_uses') wantHead = `How many different ways could you use ${subject}?`;
      else if (mode === 'instances') wantHead = `Name as many ${subject} as you can.`;
      else wantHead = `How are ${subject[0]} and ${subject[1]} alike? Name as many ways as you can.`;
      if (c.prompt.headline !== wantHead) fail(id, `headline not reproducible from levers ("${c.prompt.headline}")`);
      const wantA = mode === 'similarities' ? subject[0] : subject;
      const wantB = mode === 'similarities' ? subject[1] : null;
      if (c.prompt.subject !== wantA || c.prompt.subjectB !== wantB) fail(id, 'prompt subject not reproducible');
      cellsUsed.add(`${lev.modeIndex}/${lev.abstractness}`);
      subjectsUsed.add(mode === 'similarities' ? subject.join('+') : subject);
    }
  }
  const wantWindow = windowSecFor(lev.windowTightness);
  if (c.timeWindowSec !== wantWindow) fail(id, `timeWindowSec ${c.timeWindowSec} != derived ${wantWindow}`);
  if (c.timeWindowSec < WINDOW_MIN_SEC || c.timeWindowSec > WINDOW_MAX_SEC)
    fail(id, `timeWindowSec out of ${WINDOW_MIN_SEC}..${WINDOW_MAX_SEC} (${c.timeWindowSec})`);
  windowsSeen.add(c.timeWindowSec);

  // -- 5. prompt hygiene --
  const cons = c.constraints || [];
  if (!Array.isArray(cons) || cons.length !== lev.constraintCount)
    fail(id, `constraint count ${cons.length} != lever ${lev.constraintCount}`);
  const consIds = cons.map((x) => x && x.id);
  if (new Set(consIds).size !== consIds.length) fail(id, 'duplicate constraints');
  for (const x of cons)
    if (!CONSTRAINT_POOL.some((p) => p.id === x.id && p.text === x.text)) fail(id, `constraint "${x && x.id}" not in the pool`);
  if (c.responseMode !== 'text') fail(id, 'responseMode must be "text" (D-017: on-screen text only, never audio)');
  if (c.minIdeasToSend !== 1) fail(id, 'minIdeasToSend must be 1 (never block a child who stops early)');
  if (!isNum(c.ideaMaxChars) || c.ideaMaxChars < 20) fail(id, 'ideaMaxChars missing/too small');
  const textBlob = JSON.stringify(c).toLowerCase();
  if (/audio|listen|voice|speak|narrat/.test(textBlob)) fail(id, 'content contains an audio directive (D-017 forbids it)');
  if (!/no wrong answer/.test((c.prompt && c.prompt.note ? c.prompt.note : '').toLowerCase()))
    fail(id, 'prompt.note must tell the child that no answer is wrong');

  // -- 6. reproducibility + difficulty derives from levers --
  try {
    const regen = genItem({
      modeIndex: lev.modeIndex,
      abstractness: lev.abstractness,
      constraintCount: lev.constraintCount,
      subjectIndex: lev.subjectIndex,
      windowTightness: lev.windowTightness,
      seed: it.provenance.seed,
    });
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }
  const derived = round2(
    difficultyFromLevers(lev.modeIndex, lev.abstractness, lev.constraintCount, lev.windowTightness),
  );
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
}

if (cellsUsed.size !== 9) fail('coverage', `only ${cellsUsed.size} of 9 mode x abstractness cells are used`);
if (subjectsUsed.size < 20) fail('coverage', `only ${subjectsUsed.size} distinct subjects across the bank (want >=20)`);
if (windowsSeen.size < 10) fail('coverage', `only ${windowsSeen.size} distinct ideation windows (lever under-used)`);

// ---- 6. Coverage ----
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
console.log(`CX-diverge-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(
  `prompt space: ${cellsUsed.size}/9 mode x abstractness cells, ${subjectsUsed.size} distinct subjects, ` +
    `${windowsSeen.size} distinct windows (${Math.min(...windowsSeen)}s..${Math.max(...windowsSeen)}s)`,
);
console.log(`auto-count rule fixtures re-derived independently: ${AUTO_COUNT_FIXTURES.length}/${AUTO_COUNT_FIXTURES.length}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — parses, structure valid, no key is faked, no judging aid leaks into content, prompt/window/auto-count' +
    ' rule independently reproduced, coverage 1..20 with >=5 per bin and per +/-1pt band.',
);
