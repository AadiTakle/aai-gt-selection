// Independent validator for the QUANT-MOBILE-01 structured bank.
//
// The generator solves its mobiles with Gauss-Jordan elimination. This script
// deliberately does NOT reuse that solver: it re-derives every answer by BRUTE
// FORCE over a grid of candidate figure weights, reimplementing the torque
// relation (load x arm length) from scratch, and never reads answer.correctKey
// until the very end (only to compare). Checks (exit nonzero on any failure):
//   1. JSONL parses; every row is a well-formed BankItem (BUILD_PLAN §2 shape,
//      exactly the contract keys, born-synthetic flags, demoPath).
//   2. Served/renderable split: `content` carries no weights, keys, lures or
//      any other answer data at any depth.
//   3. Mobile geometry is well formed: one empty hook, positive integer arms.
//   4. Independent re-derivation: every candidate weight assignment consistent
//      with the visible level beams must yield the SAME single balancing option,
//      and it must equal the keyed answer. The torque identity
//      load(left)*armL == load(right)*armR is then re-checked on every beam with
//      the correct cluster hung on the empty hook.
//   5. Distractor taxonomy: every non-correct option has a diagnostic lure +
//      misconception label (M-LURETYPE / M-ERRTYPE depend on it).
//   6. The ceiling is STRUCTURAL: figure weights and cluster sizes stay small at
//      every rung, and above-level items earn difficulty from beams/depth/
//      unequal arms rather than from bigger numbers.
//   7. Reproducibility: each item regenerates byte-identically from its seed.
//   8. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND
//      >=5 items per +/-1 pt band (BUILD_PLAN §0).
//
// Run:  node research/exam-question-types/generators/check-QUANT-MOBILE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildItem } from './QUANT-MOBILE-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/QUANT-MOBILE-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];              // catalog age_bands for this type
const CONTRACT_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
const MIN_PER_BAND = 5;
const MAX_FIGURE_WEIGHT = 8;      // arithmetic load ceiling (construct = relations, not numbers)
const MAX_CLUSTER_PIECES = 6;
const WEIGHT_GRID_MAX = 14;       // brute-force search space for an unknown figure weight
const WEIGHT_GRID_STEP = 0.5;     // half steps catch non-integer alternative solutions too

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------------------------------------------------------------- *
 * Independent mobile mathematics (no import from the generator)
 * ---------------------------------------------------------------- */

// Every leaf under `node`: {counts: {shape: n}, holes: n}
function tally(node, acc = { counts: Object.create(null), holes: 0 }) {
  if (node.kind === 'beam') { tally(node.left, acc); tally(node.right, acc); }
  else if (node.kind === 'hole') acc.holes += 1;
  else for (const s of node.cluster) acc.counts[s] = (acc.counts[s] || 0) + 1;
  return acc;
}
function beamList(node, out = []) {
  if (node.kind !== 'beam') return out;
  out.push(node);
  beamList(node.left, out); beamList(node.right, out);
  return out;
}
function leafList(node, out = []) {
  if (node.kind === 'beam') { leafList(node.left, out); leafList(node.right, out); }
  else out.push(node);
  return out;
}
function treeDepth(node) {
  return node.kind === 'beam' ? 1 + Math.max(treeDepth(node.left), treeDepth(node.right)) : 0;
}
const clusterWeight = (cluster, w) => cluster.reduce((s, x) => s + w[x], 0);
const sig = (c) => c.slice().sort().join('+');

// Torque of a hanging subtree given figure weights and the load on the hook.
function loadOf(node, w, hookLoad) {
  if (node.kind === 'beam') return loadOf(node.left, w, hookLoad) + loadOf(node.right, w, hookLoad);
  if (node.kind === 'hole') return hookLoad;
  return clusterWeight(node.cluster, w);
}
// Level test, reimplemented directly from the lever relation.
function everyBeamLevel(tree, w, hookLoad) {
  return beamList(tree).every((b) =>
    Math.abs(loadOf(b.left, w, hookLoad) * b.armL - loadOf(b.right, w, hookLoad) * b.armR) < 1e-9);
}

// Given weights, solve the single unknown hook load from the beam equations.
// Each beam is linear in X: (Lc + Lh*X)*armL - (Rc + Rh*X)*armR = 0.
// Returns X > 0 when every beam agrees, else null.
function solveHookLoad(tree, w) {
  let x = null;
  for (const b of beamList(tree)) {
    const L = tally(b.left), R = tally(b.right);
    const lc = Object.entries(L.counts).reduce((s, [k, n]) => s + n * w[k], 0);
    const rc = Object.entries(R.counts).reduce((s, [k, n]) => s + n * w[k], 0);
    const constant = lc * b.armL - rc * b.armR;
    const slope = L.holes * b.armL - R.holes * b.armR;
    if (Math.abs(slope) < 1e-12) { if (Math.abs(constant) > 1e-9) return null; continue; }
    const cand = -constant / slope;
    if (!(cand > 0)) return null;
    if (x === null) x = cand;
    else if (Math.abs(cand - x) > 1e-9) return null;
  }
  return x;
}

// Brute force: every weight assignment on the grid that keeps the visible
// mobile level. The anchor figure is pinned to 1 because the scale of the whole
// mobile is arbitrary (all loads and options scale together).
function bruteForceSolutions(content) {
  const shapes = content.shapes;
  const visible = new Set();
  for (const leaf of leafList(content.tree)) if (leaf.kind === 'leaf') leaf.cluster.forEach((s) => visible.add(s));
  const anchor = shapes.find((s) => visible.has(s));
  if (!anchor) return { anchor: null, solutions: [] };

  const free = shapes.filter((s) => s !== anchor);
  const grid = [];
  for (let v = WEIGHT_GRID_STEP; v <= WEIGHT_GRID_MAX + 1e-9; v += WEIGHT_GRID_STEP) grid.push(round2(v));

  const solutions = [];
  const w = { [anchor]: 1 };
  (function rec(i) {
    if (solutions.length > 8) return;                       // ambiguity already proven
    if (i === free.length) {
      const x = solveHookLoad(content.tree, w);
      if (x !== null) solutions.push({ weights: { ...w }, hookLoad: x });
      return;
    }
    for (const v of grid) { w[free[i]] = v; rec(i + 1); }
    delete w[free[i]];
  })(0);
  return { anchor, solutions };
}

/* ---------------------------------------------------------------- *
 * 1. Parse
 * ---------------------------------------------------------------- */
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} is not valid JSON: ${e.message}`); }
});

/* ---------------------------------------------------------------- *
 * 2-7. Per-item checks
 * ---------------------------------------------------------------- */
const LEAK_KEYS = new Set(['weight', 'weights', 'answer', 'correctKey', 'correct', 'isCorrect',
  'lure', 'misconception', 'rationale', 'distractorRationales', 'missingLoad', 'rootLoad',
  'hookLoad', 'tolerance', 'difficultyRung', 'solution', 'key_' ]);
function findLeak(node, path = 'content') {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) { const p = findLeak(node[i], `${path}[${i}]`); if (p) return p; }
    return null;
  }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      if (LEAK_KEYS.has(k)) return `${path}.${k}`;
      const p = findLeak(node[k], `${path}.${k}`); if (p) return p;
    }
  }
  return null;
}

const seenIds = new Set();
const seenSeeds = new Set();
let maxFigureWeightSeen = 0;
let maxClusterSeen = 0;

for (const it of items) {
  const id = it.itemId || '(no id)';

  // ---- 1/2. Contract shape ----
  const keys = Object.keys(it).sort();
  if (!deepEq(keys, CONTRACT_KEYS.slice().sort())) fail(id, `BankItem keys != contract set (${keys.join(',')})`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'QUANT-MOBILE-01') fail(id, `typeCode != QUANT-MOBILE-01 (${it.typeCode})`);
  if (it.domain !== 'quantitative') fail(id, `domain != quantitative (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `ageBand outside the catalog set (${it.ageBands})`);
  if (it.demoPath !== 'demos/QUANT-MOBILE-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key (pick-one response)');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');
  else { if (seenSeeds.has(it.provenance.seed)) fail(id, 'duplicate seed'); seenSeeds.add(it.provenance.seed); }

  const c = it.content || {};
  const leak = findLeak(c);
  if (leak) fail(id, `content leaks answer data at ${leak}`);
  if (!Array.isArray(c.shapes) || !c.shapes.length) fail(id, 'content.shapes missing');
  if (!c.tree || c.tree.kind !== 'beam') fail(id, 'content.tree must be a beam');
  if (typeof c.prompt !== 'string' || !c.prompt.length) fail(id, 'content.prompt missing (on-screen text gate)');

  // ---- 3. Geometry ----
  const beams = beamList(c.tree);
  const leaves = leafList(c.tree);
  const holes = leaves.filter((l) => l.kind === 'hole');
  if (holes.length !== 1) fail(id, `expected exactly 1 empty hook, found ${holes.length}`);
  for (const b of beams) {
    if (!Number.isInteger(b.armL) || !Number.isInteger(b.armR) || b.armL < 1 || b.armR < 1) fail(id, 'beam arm lengths must be positive integers');
    if (!b.left || !b.right) fail(id, 'beam missing a side');
  }
  for (const l of leaves) {
    if (l.kind === 'hole') continue;
    if (!Array.isArray(l.cluster) || !l.cluster.length) fail(id, 'leaf cluster empty');
    else {
      maxClusterSeen = Math.max(maxClusterSeen, l.cluster.length);
      if (l.cluster.length > MAX_CLUSTER_PIECES) fail(id, `leaf cluster has ${l.cluster.length} figures (> ${MAX_CLUSTER_PIECES}: counting load)`);
      if (!l.cluster.every((s) => c.shapes.includes(s))) fail(id, 'leaf uses an undeclared figure');
    }
  }
  const opts = c.options || [];
  if (opts.length !== 4) fail(id, `expected 4 options, got ${opts.length}`);
  const optKeys = opts.map((o) => o && o.key);
  if (new Set(optKeys).size !== optKeys.length) fail(id, 'option keys not unique');
  if (new Set(opts.map((o) => sig(o.cluster || []))).size !== opts.length) fail(id, 'duplicate option clusters');
  for (const o of opts) {
    if (!Array.isArray(o.cluster) || !o.cluster.length) fail(id, 'option cluster empty');
    else {
      maxClusterSeen = Math.max(maxClusterSeen, o.cluster.length);
      if (o.cluster.length > MAX_CLUSTER_PIECES) fail(id, `option cluster has ${o.cluster.length} figures (> ${MAX_CLUSTER_PIECES})`);
      if (!o.cluster.every((s) => c.shapes.includes(s))) fail(id, 'option uses an undeclared figure');
    }
    for (const bad of ['weight', 'lure', 'correct', 'isCorrect']) if (Object.prototype.hasOwnProperty.call(o, bad)) fail(id, `option leaks "${bad}"`);
  }

  // ---- 4. INDEPENDENT re-derivation (brute force over the torque relations) ----
  const { anchor, solutions } = bruteForceSolutions(c);
  if (!anchor) fail(id, 'no visible figure to anchor the weight scale');
  else if (!solutions.length) fail(id, 'no weight assignment makes the visible mobile level (unsolvable item)');
  else {
    const verdicts = new Set();
    for (const s of solutions) {
      const matching = opts.filter((o) => Math.abs(clusterWeight(o.cluster, s.weights) - s.hookLoad) < 1e-9).map((o) => o.key);
      verdicts.add(matching.join('|'));
    }
    if (verdicts.size !== 1) fail(id, `ambiguous item: consistent weightings disagree about the answer (${[...verdicts].join(' / ')})`);
    const only = [...verdicts][0];
    if (only.includes('|')) fail(id, `more than one option balances the mobile (${only})`);
    else if (only === '') fail(id, 'no option balances the mobile');
    else if (only !== it.answer.correctKey) fail(id, `re-derived key ${only} != keyed answer ${it.answer.correctKey}`);

    // Re-check the torque identity beam by beam with the answer hung on the hook.
    const s0 = solutions[0];
    const correctOpt = opts.find((o) => o.key === it.answer.correctKey);
    if (correctOpt && !everyBeamLevel(c.tree, s0.weights, clusterWeight(correctOpt.cluster, s0.weights)))
      fail(id, 'torque check failed: some beam is not level with the keyed cluster on the hook');
    for (const [, v] of Object.entries(s0.weights)) maxFigureWeightSeen = Math.max(maxFigureWeightSeen, v);
    if (Object.values(s0.weights).some((v) => v > MAX_FIGURE_WEIGHT))
      fail(id, `a figure weighs ${Math.max(...Object.values(s0.weights))} (> ${MAX_FIGURE_WEIGHT}: arithmetic load, not relational load)`);
  }

  // ---- 5. Answer + lure taxonomy ----
  const ans = it.answer || {};
  if (!optKeys.includes(ans.correctKey)) fail(id, `correctKey "${ans.correctKey}" is not an option key`);
  const rats = ans.distractorRationales || {};
  const wrongKeys = optKeys.filter((k) => k !== ans.correctKey);
  if (Object.keys(rats).length !== wrongKeys.length) fail(id, 'distractorRationales must cover every non-correct option exactly');
  for (const k of wrongKeys) {
    const r = rats[k];
    if (!r) fail(id, `no rationale for distractor ${k}`);
    else {
      if (typeof r.lure !== 'string' || !r.lure) fail(id, `distractor ${k} has no lure label (M-LURETYPE)`);
      if (typeof r.misconception !== 'string' || !r.misconception) fail(id, `distractor ${k} has no misconception label (M-ERRTYPE)`);
    }
  }
  if (rats[ans.correctKey]) fail(id, 'the correct key must not have a distractor rationale');

  // ---- 6. Structural (not arithmetic) ceiling ----
  const lev = (it.provenance && it.provenance.levers) || {};
  if (Math.round(it.difficulty) !== lev.difficultyRung) fail(id, `difficulty ${it.difficulty} does not sit in its declared rung ${lev.difficultyRung}`);
  if (lev.beams !== beams.length) fail(id, `levers.beams ${lev.beams} != rendered beams ${beams.length}`);
  if (lev.depth !== treeDepth(c.tree)) fail(id, `levers.depth ${lev.depth} != rendered depth ${treeDepth(c.tree)}`);
  const unequal = beams.filter((b) => b.armL !== b.armR).length;
  if (lev.unequalBeams !== unequal) fail(id, `levers.unequalBeams ${lev.unequalBeams} != rendered ${unequal}`);
  if (it.difficulty >= 16 && !(beams.length >= 6 || unequal >= 2))
    fail(id, `above-level item is not structurally hard (beams ${beams.length}, unequal arms ${unequal})`);
  if (it.difficulty <= 4 && unequal > 0) fail(id, 'floor item should use equal arms only');

  // ---- 7. Reproducibility from provenance ----
  const parts = String(it.provenance.seed).split(':');   // master:TYPE:d<rung>:i<ordinal>:a<attempt>
  const rung = parseInt((parts[2] || '').replace(/^d/, ''), 10);
  const ordinal = parseInt((parts[3] || '').replace(/^i/, ''), 10);
  if (!Number.isInteger(rung) || !Number.isInteger(ordinal)) fail(id, `cannot parse rung/ordinal from seed (${it.provenance.seed})`);
  else {
    try {
      const regen = buildItem(parts[0], rung, ordinal);
      if (!regen) fail(id, 'regeneration produced null');
      else if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
    } catch (e) { fail(id, `regeneration threw: ${e.message}`); }
  }
}

/* ---------------------------------------------------------------- *
 * 8. Coverage
 * ---------------------------------------------------------------- */
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
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

// answer keys should not be concentrated on one option
const keyHist = {};
for (const it of items) keyHist[it.answer.correctKey] = (keyHist[it.answer.correctKey] || 0) + 1;
for (const [k, n] of Object.entries(keyHist)) if (n > items.length * 0.45) fail('balance', `answer key ${k} used in ${n}/${items.length} items (response set is guessable)`);

/* ---------------------------------------------------------------- *
 * Report
 * ---------------------------------------------------------------- */
console.log(`QUANT-MOBILE-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('answer key spread:      ' + JSON.stringify(keyHist));
console.log(`arithmetic load:        heaviest figure ${maxFigureWeightSeen}, largest cluster ${maxClusterSeen} figures`);

if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - contract shape, no content leak, every answer independently re-derived from the torque relations (unique), lure taxonomy complete, structural ceiling, reproducible, coverage 1..20 with >=5 per bin and per +/-1pt band.');
