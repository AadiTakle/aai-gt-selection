// Independent validator for the CX-figural-01 structured bank.
//
// CX-figural-01 is an OPEN PRODUCTION type: there is no answer key to re-derive,
// so "independent re-derivation" here means (a) re-deriving every stimulus
// property that the item claims, from the emitted geometry alone, using formulas
// re-implemented in this file, and (b) proving the bank contains no automated
// creativity/originality judge anywhere.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Open-response contract: correctKey null, no distractors, scorable false,
//      scoring.mode 'model_judge_deferred', a consensual-assessment rubric present,
//      and NO automated originality/creativity score anywhere in the item.
//   3. Process metrics: the automated list is a subset of the type's declared
//      measurements and is counts/timings only (M-ORIG stays deferred).
//   4. Stimulus geometry re-derived from the emitted points: stroke count, point
//      count, in-bounds, minimum drawable length, x-monotonicity below the
//      backtracking threshold, and ambiguity actually driving line complexity
//      (correlation between the ambiguity lever and measured direction reversals).
//   5. Reproducibility: each item regenerates byte-identically from its provenance.
//   6. Demand rung matches an independent implementation of the declared model.
//   7. Coverage: spans 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-CX-figural-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem, allConfigs, CONSTRAINTS } from './CX-figural-01.mjs';
import { normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/CX-figural-01.jsonl');
const ALLOWED_BANDS = ['K-1', '2-3', '4-5', '6-8'];
// The type's declared measurements (catalog/master_types.jsonl CX-figural-01).
const DECLARED_MEASUREMENTS = ['M-IDEAFLU', 'M-ORIG', 'M-ELAB', 'M-PATH', 'M-PERSIST', 'M-ENGAGE'];
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
const CANVAS = { width: 320, height: 160 };
const BACKTRACK_THRESHOLD = 0.55; // below this the generator promises a left-to-right line

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---- independent re-implementation of the documented stimulus formulas ---- */
const controlCount = (a) => 3 + Math.round(a * 5);
const expectedPoints = (a) => (controlCount(a) - 1) * 8 + 1;

/* ---- independent re-implementation of the demand model ---- */
const D_AMBIGUITY_SPAN = 2.6;
function rawOf(cfg, ambiguity) {
  const load = (CONSTRAINTS.find((c) => c.id === cfg.constraint) || { load: NaN }).load;
  return (
    1.0 +
    1.5 * (cfg.baseLines - 1) +
    load +
    0.9 * (cfg.ideaTargetMin - 1) +
    (2.0 * (180 - cfg.timeWindowSec)) / 120 +
    D_AMBIGUITY_SPAN * ambiguity
  );
}
const SPACE = allConfigs();
const D_RAW_MIN = Math.min(...SPACE.map((c) => rawOf(c, 0)));
const D_RAW_MAX = Math.max(...SPACE.map((c) => rawOf(c, 1)));
function demandOf(cfg, ambiguity) {
  return Math.max(1, Math.min(20, 1 + ((rawOf(cfg, ambiguity) - D_RAW_MIN) * 19) / (D_RAW_MAX - D_RAW_MIN)));
}

/* ---- geometry measures computed from the emitted points only ---- */
function polylineLength(points) {
  let s = 0;
  for (let i = 1; i < points.length; i++) s += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return s;
}
function verticalReversals(points) {
  let n = 0;
  let prev = 0;
  for (let i = 1; i < points.length; i++) {
    const dy = points[i][1] - points[i - 1][1];
    if (Math.abs(dy) < 0.05) continue;
    const s = Math.sign(dy);
    if (prev !== 0 && s !== prev) n++;
    prev = s;
  }
  return n;
}
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
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

/* ---- 2..6. Per-item checks ---- */
const seenIds = new Set();
const ambiguities = [];
const reversals = [];

for (const it of items) {
  const id = it.itemId || '(no id)';

  const keys = Object.keys(it).sort();
  if (!deepEq(keys, BANK_ITEM_KEYS.slice().sort())) fail(id, `BankItem keys != contract set (${keys.join(',')})`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(it.itemId))
    fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'CX-figural-01') fail(id, `typeCode != CX-figural-01 (${it.typeCode})`);
  if (it.domain !== 'fluid_reasoning') fail(id, `domain != fluid_reasoning (${it.domain})`);
  if (it.demoPath !== 'demos/CX-figural-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  /* ---- 2. open-response contract ---- */
  const ans = it.answer || {};
  const sc = it.scoring || {};
  if (ans.correctKey !== null) fail(id, `answer.correctKey must be null for an open production item (${ans.correctKey})`);
  if (!ans.distractorRationales || Object.keys(ans.distractorRationales).length !== 0)
    fail(id, 'answer.distractorRationales must be empty (this type has no distractors)');
  if (ans.scorable !== false) fail(id, 'answer.scorable must be false');
  if (sc.mode !== 'model_judge_deferred') fail(id, `scoring.mode != model_judge_deferred (${sc.mode})`);
  if (sc.autoScored !== false) fail(id, 'scoring.autoScored must be false');
  if (sc.participatesInSelection !== true) fail(id, 'scoring.participatesInSelection must be true (metric coverage)');
  const dj = ans.deferredJudge || {};
  if (dj.method !== 'consensual_assessment_technique') fail(id, 'deferredJudge.method must be consensual_assessment_technique');
  if (!Array.isArray(dj.dimensions) || !dj.dimensions.includes('originality')) fail(id, 'deferredJudge must defer originality');
  if (!Array.isArray(dj.artifact) || dj.artifact.length === 0) fail(id, 'deferredJudge.artifact must name the stored artifacts');
  // No automated creativity/originality judge may hide anywhere in the item.
  const itemJson = JSON.stringify(it);
  for (const banned of ['originalityScore', 'creativityScore', 'autoOriginality', 'origPoints', 'noveltyWeight', 'inverseFrequency'])
    if (itemJson.includes(banned)) fail(id, `item defines an automated creativity scorer field "${banned}"`);

  /* ---- 3. process metrics ---- */
  const auto = ans.automatedProcessMetrics || [];
  if (!Array.isArray(auto) || auto.length === 0) fail(id, 'answer.automatedProcessMetrics missing (type must still feed selection)');
  for (const m of auto) if (!DECLARED_MEASUREMENTS.includes(m)) fail(id, `automated metric ${m} is not a declared measurement of this type`);
  if (auto.includes('M-ORIG')) fail(id, 'M-ORIG must NOT be automated — originality is deferred to the panel');
  if (!auto.includes('M-IDEAFLU')) fail(id, 'M-IDEAFLU (ideation fluency count) must be automated — it is a basic-core metric');
  if (!Array.isArray(sc.selectionSignals) || sc.selectionSignals.length === 0)
    fail(id, 'scoring.selectionSignals missing (how the type participates in selection)');

  /* ---- 4. stimulus geometry, re-derived from the emitted points ---- */
  const c = it.content || {};
  const lev = (it.provenance && it.provenance.levers) || {};
  const contentJson = JSON.stringify(c);
  for (const banned of ['answer', 'correct', 'interpretation', 'originality', 'ambiguity', 'score'])
    if (contentJson.includes(banned)) fail(id, `content leaks answer/judge-side field "${banned}"`);
  if (typeof c.prompt !== 'string' || c.prompt.length < 20) fail(id, 'content.prompt missing (on-screen reading gate, D-017)');
  if (!c.constraint || !CONSTRAINTS.some((x) => x.id === c.constraint.id)) fail(id, 'content.constraint unknown');
  else if (!c.prompt.startsWith(c.constraint.text)) fail(id, 'prompt does not open with the declared constraint text');
  if (!Number.isInteger(c.ideaTargetMin) || c.ideaTargetMin < 1) fail(id, 'content.ideaTargetMin invalid');
  if (!Number.isInteger(c.timeWindowSec) || c.timeWindowSec < 30) fail(id, 'content.timeWindowSec invalid');
  if (c.timeWindowSec / c.ideaTargetMin < 20) fail(id, `asks for ${c.ideaTargetMin} ideas in ${c.timeWindowSec}s (<20s per idea)`);
  if (!Array.isArray(c.labelCategories) || c.labelCategories.length < 3) fail(id, 'content.labelCategories missing (non-typing fallback)');

  const st = c.stimulus || {};
  const strokes = st.strokes || [];
  if (!deepEq(st.viewBox, CANVAS)) fail(id, 'stimulus.viewBox != canvas');
  if (strokes.length !== st.baseLineCount) fail(id, `stroke count ${strokes.length} != baseLineCount ${st.baseLineCount}`);
  if (st.baseLineCount !== lev.baseLines) fail(id, 'baseLineCount != provenance lever');
  const want = expectedPoints(lev.ambiguity);
  for (const s of strokes) {
    if (!Array.isArray(s.points) || s.points.length !== want)
      fail(id, `stroke ${s.id} has ${s.points ? s.points.length : 0} points, formula says ${want}`);
    if (!Array.isArray(s.points)) continue;
    for (const p of s.points) {
      if (!Array.isArray(p) || p.length !== 2 || !isNum(p[0]) || !isNum(p[1])) fail(id, `stroke ${s.id} has a malformed point`);
      else if (p[0] < 0 || p[0] > CANVAS.width || p[1] < 0 || p[1] > CANVAS.height)
        fail(id, `stroke ${s.id} leaves the canvas at ${p}`);
    }
    const len = polylineLength(s.points);
    if (len < CANVAS.width * 0.6) fail(id, `stroke ${s.id} is only ${Math.round(len)}px long (not a usable squiggle)`);
    // Below the documented backtracking threshold the line must read left-to-right.
    if (lev.ambiguity <= BACKTRACK_THRESHOLD) {
      for (let i = 1; i < s.points.length; i++)
        if (s.points[i][0] < s.points[i - 1][0] - 0.05) {
          fail(id, `stroke ${s.id} backtracks in x at ambiguity ${round2(lev.ambiguity)} (<= ${BACKTRACK_THRESHOLD})`);
          break;
        }
    }
    ambiguities.push(lev.ambiguity);
    reversals.push(verticalReversals(s.points));
  }

  /* ---- 5. reproducibility from provenance ---- */
  try {
    const regen = normalizeBankItem(genItem({
      baseLines: lev.baseLines,
      constraint: lev.constraint,
      ideaTargetMin: lev.ideaTargetMin,
      timeWindowSec: lev.timeWindowSec,
      ambiguity: lev.ambiguity,
      seed: it.provenance.seed,
    }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }

  /* ---- 6. demand rung from an independent implementation ---- */
  const cfg = {
    baseLines: lev.baseLines,
    constraint: lev.constraint,
    ideaTargetMin: lev.ideaTargetMin,
    timeWindowSec: lev.timeWindowSec,
  };
  const derived = round2(demandOf(cfg, lev.ambiguity));
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != independently derived ${derived}`);
  if (c.ideaTargetMin !== lev.ideaTargetMin || c.timeWindowSec !== lev.timeWindowSec)
    fail(id, 'content demand parameters disagree with the provenance levers');

  const expectBands = [];
  if (it.difficulty < 4.5) expectBands.push('K-1');
  if (it.difficulty >= 3.5 && it.difficulty < 8.5) expectBands.push('2-3');
  if (it.difficulty >= 7.5 && it.difficulty < 12.5) expectBands.push('4-5');
  if (it.difficulty >= 11.5) expectBands.push('6-8');
  if (!deepEq(it.ageBands, expectBands)) fail(id, `ageBands ${it.ageBands} != rung-derived ${expectBands}`);
}

// The ambiguity lever must actually make the stimulus more complex, otherwise the
// demand ramp is fiction.
const r = pearson(ambiguities, reversals);
if (!(r >= 0.5)) fail('stimulus', `ambiguity lever barely moves line complexity (r=${round2(r)} between ambiguity and reversals, want >=0.5)`);

/* ---- 7. Coverage ---- */
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min demand ${round2(min)} > 1.5 (does not reach the floor)`);
if (!(max >= 19.5)) fail('coverage', `max demand ${round2(max)} < 19.5 (does not reach the ceiling)`);

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
console.log(`CX-figural-01 bank check: ${items.length} items`);
console.log(`demand span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`stimulus strokes re-measured: ${reversals.length}; ambiguity vs reversals r=${round2(r)}`);
console.log('open-response contract: correctKey null, no distractors, originality deferred to a CAT panel');

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — structure valid, open-response contract held with no automated creativity judge, stimulus geometry re-derived from the emitted points, coverage 1..20 with >=5 per bin and per +/-1pt band.');
