// Independent validator for the SPA-HIDDENCUBE-01 structured bank.
//
// This checker does NOT import the generator. It re-derives every answer key from the
// renderable geometry with a DIFFERENT algorithm than the generator's height-map scan:
// it rasterizes `content.stack.layers` into a flat 3D occupancy bitmap and computes the
// occlusion set with whole-grid BOOLEAN SHIFT-AND masks
//
//     hiddenGrid = occ & shift(occ, +1 in y) & shift(occ, sc in col) & shift(occ, sr in row)
//
// (the generator instead compares column heights cube-by-cube). Totals are recounted by
// popcount over the occupancy bitmap rather than by summing heights, and bury depth is
// re-derived from column runs read back out of the bitmap.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Born-synthetic + server/renderable split: content carries NO count / key / diagnostic.
//   3. Geometry is physically legal: every layer's footprint is contained in the layer
//      below it, so no cube floats and every occluded cube is logically FORCED.
//   4. Key is COMPUTED: the occupancy popcount reproduces answer.correctKey, and the
//      shift-mask occlusion reproduces visibleCount / hiddenCount / maxBuryDepth.
//   5. Lure table: exactly one 'correct' entry equal to the key, values unique and in the
//      stepper range, and the 'visible_only_undercount' lure equals the recomputed
//      visible count (M-ERRTYPE depends on that being exact).
//   6. Angular disparity is recorded per item so M-ROTSLOPE can be fit across items.
//   7. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-SPA-HIDDENCUBE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/SPA-HIDDENCUBE-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;
const LEAK_KEYS = ['answer', 'correctKey', 'correctCount', 'total', 'totalCubes', 'hiddenCount', 'visibleCount', 'diagnostics', 'distractorRationales', 'solution'];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- independent occupancy bitmap + shift-mask occlusion -------------------
function buildOccupancy(stack) {
  const C = stack.cols, R = stack.rows, Y = stack.maxHeight;
  const g = new Uint8Array(C * Y * R);
  const at = (c, y, r) => c + C * (y + Y * r);
  let outOfRange = 0;
  stack.layers.forEach((cells, y) => cells.forEach(([r, c]) => {
    if (c < 0 || c >= C || r < 0 || r >= R || y < 0 || y >= Y) { outOfRange++; return; }
    g[at(c, y, r)] = 1;
  }));
  return { g, C, R, Y, at, outOfRange };
}
// shifted[c,y,r] = occ[c+dc, y+dy, r+dr]; out-of-bounds reads as empty.
function shift(o, dc, dy, dr) {
  const out = new Uint8Array(o.g.length);
  for (let r = 0; r < o.R; r++) for (let y = 0; y < o.Y; y++) for (let c = 0; c < o.C; c++) {
    const sc = c + dc, sy = y + dy, sr = r + dr;
    if (sc < 0 || sc >= o.C || sy < 0 || sy >= o.Y || sr < 0 || sr >= o.R) continue;
    out[o.at(c, y, r)] = o.g[o.at(sc, sy, sr)];
  }
  return out;
}
function analyzeIndependently(stack, signs) {
  const o = buildOccupancy(stack);
  const up = shift(o, 0, 1, 0), side = shift(o, signs.col, 0, 0), deep = shift(o, 0, 0, signs.row);
  let total = 0, hidden = 0;
  const hiddenGrid = new Uint8Array(o.g.length);
  for (let i = 0; i < o.g.length; i++) {
    if (!o.g[i]) continue;
    total++;
    if (up[i] && side[i] && deep[i]) { hiddenGrid[i] = 1; hidden++; }
  }
  // Column runs read back out of the bitmap: height, contiguity (stability), bury depth.
  let maxBury = 0, floating = 0, footprint = 0;
  for (let r = 0; r < o.R; r++) for (let c = 0; c < o.C; c++) {
    let top = -1, filled = 0;
    for (let y = 0; y < o.Y; y++) if (o.g[o.at(c, y, r)]) { top = y; filled++; }
    if (top < 0) continue;
    footprint++;
    if (filled !== top + 1) floating++;             // a gap in the column = a floating cube
    for (let y = 0; y <= top; y++) if (hiddenGrid[o.at(c, y, r)]) maxBury = Math.max(maxBury, top - y);
  }
  return { total, hidden, visible: total - hidden, maxBury, footprint, floating, outOfRange: o.outOfRange };
}
function scanLeaks(node, path, id) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((v, i) => scanLeaks(v, `${path}[${i}]`, id)); return; }
  for (const k of Object.keys(node)) {
    if (LEAK_KEYS.includes(k)) fail(id, `content leaks "${k}" at ${path}.${k}`);
    scanLeaks(node[k], `${path}.${k}`, id);
  }
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} not valid JSON: ${e.message}`); } });

// ---- 2..6. Per-item structural + independent key recompute ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId'); seenIds.add(it.itemId);
  if (it.typeCode !== 'SPA-HIDDENCUBE-01') fail(id, `typeCode != SPA-HIDDENCUBE-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (it.demoPath !== 'demos/SPA-HIDDENCUBE-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  scanLeaks(c, 'content', id);
  const S = c.stack || {};
  if (!isNum(S.rows) || !isNum(S.cols) || !isNum(S.maxHeight) || !Array.isArray(S.layers) || S.layers.length === 0) {
    fail(id, 'stack geometry missing'); continue;
  }
  if (S.layers.length !== S.maxHeight) fail(id, `layers ${S.layers.length} != maxHeight ${S.maxHeight}`);
  const V = (c.view || {}).cameraSigns || {};
  if (![1, -1].includes(V.col) || ![1, -1].includes(V.row)) fail(id, 'view.cameraSigns invalid');
  if (!isNum((c.view || {}).angularDisparityDeg)) fail(id, 'view.angularDisparityDeg missing (M-ROTSLOPE needs it)');
  if (!c.response || c.response.mode !== 'stepper' || !isNum(c.response.max)) fail(id, 'response stepper spec missing');
  if (c.scaffold && c.scaffold.xray === true) fail(id, 'x-ray must be off for scored bank items');

  // 3. Stability: each layer's footprint must sit on the layer below it.
  for (let y = 1; y < S.layers.length; y++) {
    const below = new Set(S.layers[y - 1].map(([r, cc]) => `${r},${cc}`));
    for (const [r, cc] of S.layers[y]) if (!below.has(`${r},${cc}`)) fail(id, `floating cube at layer ${y} cell ${r},${cc}`);
  }

  // 4. Independent recompute of the key + occlusion diagnostics.
  const rc = analyzeIndependently(S, V);
  if (rc.outOfRange) fail(id, `${rc.outOfRange} cube(s) outside the declared footprint`);
  if (rc.floating) fail(id, `${rc.floating} column(s) with a gap (unsupported cube)`);
  const ans = it.answer || {};
  const d = ans.diagnostics || {};
  if (String(rc.total) !== String(ans.correctKey)) fail(id, `occupancy popcount ${rc.total} != correctKey ${ans.correctKey}`);
  if (rc.total !== ans.correctCount) fail(id, `occupancy popcount ${rc.total} != answer.correctCount ${ans.correctCount}`);
  if (rc.hidden !== d.hiddenCount) fail(id, `shift-mask hidden ${rc.hidden} != diagnostics.hiddenCount ${d.hiddenCount}`);
  if (rc.visible !== d.visibleCount) fail(id, `shift-mask visible ${rc.visible} != diagnostics.visibleCount ${d.visibleCount}`);
  if (rc.maxBury !== d.maxBuryDepth) fail(id, `bury depth ${rc.maxBury} != diagnostics.maxBuryDepth ${d.maxBuryDepth}`);
  if (rc.footprint !== d.footprintCount) fail(id, `footprint ${rc.footprint} != diagnostics.footprintCount ${d.footprintCount}`);
  if (rc.hidden < 1) fail(id, 'no occluded cube: the item does not test hidden-cube inference');
  if (rc.total > (c.response ? c.response.max : 0)) fail(id, `total ${rc.total} exceeds the stepper max`);

  // 5. Lure table (M-ERRTYPE).
  const rats = ans.distractorRationales || [];
  if (!Array.isArray(rats) || rats.length < 2) fail(id, `distractorRationales too few (${rats.length})`);
  const correctRats = rats.filter((x) => x && x.lure === 'correct');
  if (correctRats.length !== 1) fail(id, `expected exactly 1 'correct' lure, got ${correctRats.length}`);
  else if (correctRats[0].value !== rc.total) fail(id, `'correct' lure value ${correctRats[0].value} != total ${rc.total}`);
  const vals = rats.map((x) => x && x.value);
  if (new Set(vals).size !== vals.length) fail(id, 'lure values not unique');
  for (const x of rats) {
    if (!isNum(x.value) || x.value < 0 || x.value > c.response.max) fail(id, `lure value out of stepper range (${x.value})`);
    if (typeof x.lure !== 'string' || !x.lure) fail(id, 'lure label missing');
    if (typeof x.chirality !== 'string') fail(id, 'lure chirality field missing');
  }
  const visLure = rats.find((x) => x.lure === 'visible_only_undercount');
  if (rc.visible !== rc.total && !visLure) fail(id, 'missing visible_only_undercount lure');
  if (visLure && visLure.value !== rc.visible) fail(id, `visible_only lure ${visLure.value} != recomputed visible ${rc.visible}`);
  if (!isNum(d.angularDisparityDeg)) fail(id, 'diagnostics.angularDisparityDeg missing (M-ROTSLOPE)');
}

// ---- 7. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (floor not reached)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ceiling not reached)`);
const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d); if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

// A gradual ramp: total cubes and occluded cubes must both rise with difficulty.
function corr(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxy / Math.sqrt(sxx * syy || 1);
}
const rTotal = corr(diffs, items.map((it) => it.answer.correctCount));
const rHidden = corr(diffs, items.map((it) => it.answer.diagnostics.hiddenCount));
if (rTotal < 0.8) fail('ramp', `difficulty vs total-cubes correlation ${rTotal.toFixed(2)} < 0.80`);
if (rHidden < 0.8) fail('ramp', `difficulty vs hidden-cubes correlation ${rHidden.toFixed(2)} < 0.80`);

// ---- Report ----
console.log(`SPA-HIDDENCUBE-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log(`ramp correlation: total cubes r=${rTotal.toFixed(3)} · hidden cubes r=${rHidden.toFixed(3)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, stacks stable, totals + occlusion re-derived by occupancy popcount and shift-mask line of sight, coverage 1..20 with >=5 per bin and per +/-1pt band.');
