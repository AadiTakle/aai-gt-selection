// Independent validator for the CX-achieve-02 "Investigation Station" bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: `content` carries NO answer artifact (no key, no
//      ranking, no rule, no rubric, no optimal plan, no correctness marker on an
//      option) and no conclusion option is tagged.
//   3. Every DETERMINISTICALLY-CHECKABLE component is independently reproducible
//      from `content` alone, using this file's own solver (it does not trust the
//      generator's tags):
//        - the bench's true optimum -> answer.correctKey / answer.bestSetting;
//        - uniqueness of that optimum and a margin the wobble cannot erase;
//        - the unique highest-effect factor -> answer.topFactorId;
//        - the bench reading function -> answer.verification.sampleReadings.
//   4. Deferred-judge bookkeeping: scoring.mode='model_judge_deferred', rubric
//      dimensions with anchors are recorded, and no automated rubric scorer is
//      claimed.
//   5. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND
//      >=5 items per +/-1 pt band (BUILD_PLAN §0), and every item's difficulty
//      equals the value derived from its own levers.
//
// Run:  node research/exam-question-types/generators/check-CX-achieve-02.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, difficultyFromLevers, SCENARIOS, NOISE_PATTERN } from './CX-achieve-02.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/CX-achieve-02.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8']; // CX-achieve-02 declares no K-1
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

/* ---- Independent bench solver (re-implemented from the documented model) ---- */
function enumerate(factors) {
  let out = [{}];
  for (const f of factors) {
    const next = [];
    for (const partial of out) for (const lv of f.levels) next.push({ ...partial, [f.id]: lv.value });
    out = next;
  }
  return out;
}
function expected(app, factors, setting) {
  let v = app.base;
  for (const f of factors) v += app.weights[f.id][setting[f.id]];
  const it = app.interaction;
  if (it && setting[it.factorA] === it.levelA && setting[it.factorB] === it.levelB) v += it.bonus;
  return v;
}
function reading(app, factors, setting, trialSlot) {
  const P = [3, 5, 7, 11];
  let h = 0;
  factors.forEach((f, i) => {
    h += (setting[f.id] + 1) * P[i % P.length];
  });
  h += trialSlot * 7;
  return Math.max(1, expected(app, factors, setting) + NOISE_PATTERN[h % NOISE_PATTERN.length] * app.noiseAmp);
}
const sKey = (factors, s) => factors.map((f) => `${f.id}=${s[f.id]}`).join(',');

// Fields that would leak an answer if they ever appeared under `content`.
const FORBIDDEN_CONTENT_KEYS = [
  'correctkey',
  'answer',
  'best',
  'bestsetting',
  'bestexpected',
  'optimal',
  'optimalplan',
  'rubric',
  'ruleStatement'.toLowerCase(),
  'factorranking',
  'topfactorid',
  'margin',
  'iscorrect',
  'correct',
  'lure',
  'distractorrationales',
  'verification',
  'solution',
  'answerkey',
  'solutionkey',
];
function scanForLeaks(node, id, path = 'content') {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => scanForLeaks(v, id, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (FORBIDDEN_CONTENT_KEYS.includes(k.toLowerCase())) fail(id, `content leaks answer field "${path}.${k}"`);
    scanForLeaks(v, id, `${path}.${k}`);
  }
}

// ---- 2 + 3 + 4. Per-item checks ----
const seenIds = new Set();
const correctKeyPositions = new Map();

for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'CX-achieve-02') fail(id, `typeCode != CX-achieve-02 (${it.typeCode})`);
  if (it.domain !== 'fluid_reasoning') fail(id, `domain != fluid_reasoning (${it.domain})`);
  if (it.demoPath !== 'demos/CX-achieve-02.html') fail(id, `demoPath wrong (${it.demoPath})`);
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

  // -- deferred-judge bookkeeping --
  if (!it.scoring || it.scoring.mode !== 'model_judge_deferred') fail(id, 'scoring.mode != model_judge_deferred');
  if (!it.scoring || !Array.isArray(it.scoring.deterministic) || it.scoring.deterministic.length < 3)
    fail(id, 'scoring.deterministic must list the machine-scored components');
  if (!it.scoring || !Array.isArray(it.scoring.deferred) || it.scoring.deferred.length === 0)
    fail(id, 'scoring.deferred must name the judge-dependent component');
  const rub = ans.rubric || {};
  if (rub.judge !== 'deferred') fail(id, 'answer.rubric.judge must be "deferred" (no auto rubric scorer exists)');
  if (!Array.isArray(rub.dimensions) || rub.dimensions.length < 3) fail(id, 'answer.rubric.dimensions missing');
  else
    for (const d of rub.dimensions) {
      if (!d.id || !d.anchors || Object.keys(d.anchors).length < 4)
        fail(id, `rubric dimension "${d.id}" needs 0..3 anchors`);
    }

  // -- content shape --
  const factors = c.factors || [];
  if (!Array.isArray(factors) || factors.length < 2 || factors.length > 4)
    fail(id, `factors count out of 2..4 (${factors.length})`);
  const scenario = SCENARIOS.find((s) => s.id === (c.scenario && c.scenario.id));
  if (!scenario) fail(id, `unknown scenario id (${c.scenario && c.scenario.id})`);
  const levelCounts = new Set(factors.map((f) => (f.levels || []).length));
  if (levelCounts.size !== 1 || ![2, 3].includes([...levelCounts][0]))
    fail(id, `factors must all carry 2 or 3 levels (${[...levelCounts].join('/')})`);
  for (const f of factors) {
    if (!f.id || !f.label) fail(id, 'factor missing id/label');
    (f.levels || []).forEach((lv, i) => {
      if (lv.value !== i || typeof lv.label !== 'string') fail(id, `factor ${f.id} level ${i} malformed`);
    });
  }
  const app = c.apparatus || {};
  if (!isNum(app.base) || !app.weights || !isNum(app.noiseAmp)) fail(id, 'apparatus malformed');
  for (const f of factors)
    if (!Array.isArray(app.weights[f.id]) || app.weights[f.id].length !== f.levels.length)
      fail(id, `apparatus.weights missing/short for ${f.id}`);
  if (!isNum(c.trialBudget) || c.trialBudget < 4) fail(id, `trialBudget too small (${c.trialBudget})`);
  if (c.minTrialsBeforeConclusion !== 2) fail(id, 'minTrialsBeforeConclusion must be 2');

  // -- 2. no answer artifact reachable from content --
  scanForLeaks(c, id);
  const opts = (c.conclusion && c.conclusion.options) || [];
  if (!Array.isArray(opts) || opts.length < 4 || opts.length > 5) fail(id, `options count out of 4..5 (${opts.length})`);
  const keys = opts.map((o) => o && o.key);
  if (new Set(keys).size !== keys.length) fail(id, 'option keys not unique');
  for (const o of opts) {
    if (!o || typeof o.key !== 'string' || !o.setting) fail(id, 'option missing key/setting');
    if (Object.keys(o).length !== 2) fail(id, `option carries extra fields (${Object.keys(o).join(',')})`);
    for (const f of factors)
      if (!Number.isInteger(o.setting[f.id]) || o.setting[f.id] < 0 || o.setting[f.id] >= f.levels.length)
        fail(id, `option ${o.key} has an out-of-range level for ${f.id}`);
  }
  const settingKeys = opts.map((o) => sKey(factors, o.setting));
  if (new Set(settingKeys).size !== settingKeys.length) fail(id, 'duplicate setups among conclusion options');
  if (c.conclusion && c.conclusion.depth >= 2 && !Array.isArray(c.conclusion.factorOptions))
    fail(id, 'depth>=2 requires factorOptions');

  // -- 3. independent solve: true optimum, uniqueness, margin --
  if (factors.length >= 2 && app.weights) {
    const scored = enumerate(factors)
      .map((s) => ({ s, e: expected(app, factors, s) }))
      .sort((a, b) => b.e - a.e);
    const topE = scored[0].e;
    const tied = scored.filter((x) => x.e === topE);
    if (tied.length !== 1) fail(id, `bench optimum is not unique (${tied.length} tied setups)`);
    const solvedBest = scored[0].s;
    if (!deepEq(solvedBest, ans.bestSetting)) fail(id, 'solver bestSetting != answer.bestSetting');
    const matching = opts.filter((o) => sKey(factors, o.setting) === sKey(factors, solvedBest)).map((o) => o.key);
    if (matching.length !== 1) fail(id, `solver found ${matching.length} options matching the optimum (want exactly 1)`);
    else if (matching[0] !== ans.correctKey) fail(id, `solver key ${matching[0]} != declared correctKey ${ans.correctKey}`);

    const margin = topE - scored[1].e;
    if (Math.abs(margin - ans.margin) > 1e-9) fail(id, `solver margin ${margin} != answer.margin ${ans.margin}`);
    // The wobble must never make the true optimum unrecoverable: it has to be
    // beatable on a single unlucky trial at most, never on the expected values.
    if (!(margin >= 3)) fail(id, `optimum margin ${margin} < 3 (not discoverable)`);
    if (!(margin > app.noiseAmp)) fail(id, `optimum margin ${margin} <= noiseAmp ${app.noiseAmp}`);

    // unique highest-effect factor (the depth-2 sub-key)
    const effects = factors
      .map((f) => ({ factorId: f.id, span: Math.max(...app.weights[f.id]) - Math.min(...app.weights[f.id]) }))
      .sort((a, b) => b.span - a.span);
    if (effects.length > 1 && effects[0].span === effects[1].span)
      fail(id, 'highest-effect factor is tied (depth-2 sub-key would be ambiguous)');
    if (effects[0].factorId !== ans.topFactorId)
      fail(id, `solver topFactor ${effects[0].factorId} != answer.topFactorId ${ans.topFactorId}`);

    // reading function reproducible from content.apparatus alone
    for (const sr of (ans.verification && ans.verification.sampleReadings) || []) {
      const r = reading(app, factors, sr.setting, sr.trialSlot);
      if (r !== sr.reading) fail(id, `bench reading not reproducible (got ${r}, recorded ${sr.reading})`);
    }
    if (!((ans.verification || {}).sampleReadings || []).length) fail(id, 'answer.verification.sampleReadings missing');

    const pos = keys.indexOf(ans.correctKey);
    correctKeyPositions.set(pos, (correctKeyPositions.get(pos) || 0) + 1);
  }

  // rationales cover every option key, exactly one "correct"
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  if (ratKeys.length !== keys.length || !keys.every((k) => ratKeys.includes(k)))
    fail(id, 'distractorRationales do not cover every option key');
  const correctRats = ratKeys.filter((k) => rats[k] && rats[k].lure === 'correct');
  if (correctRats.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${correctRats.length}`);
  else if (correctRats[0] !== ans.correctKey) fail(id, 'the "correct" rationale key != correctKey');

  // -- 5. reproducibility from provenance + difficulty derives from levers --
  const lev = (it.provenance && it.provenance.levers) || {};
  try {
    const regen = genItem({
      scenarioId: lev.scenarioId,
      factorCount: lev.factorCount,
      levelCount: lev.levelCount,
      hasInteraction: lev.hasInteraction,
      conclusionDepth: lev.conclusionDepth,
      noise: lev.noise,
      seed: it.provenance.seed,
    });
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }
  const derived = round2(
    difficultyFromLevers(lev.factorCount, lev.levelCount, lev.hasInteraction ? 1 : 0, lev.conclusionDepth, lev.noise),
  );
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
}

// Key position must not be predictable from the option order.
if (correctKeyPositions.size < 4)
  fail('coverage', `correct setup appears in only ${correctKeyPositions.size} distinct option positions`);

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
console.log(`CX-achieve-02 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(
  'correct-setup option position spread: ' +
    [...correctKeyPositions.entries()].sort((a, b) => a[0] - b[0]).map(([p, n]) => `${p}:${n}`).join(' '),
);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — parses, structure valid, content carries no answer artifact, bench optimum + top factor + readings' +
    ' independently reproduced, deferred-judge rubric recorded, coverage 1..20 with >=5 per bin and per +/-1pt band.',
);
