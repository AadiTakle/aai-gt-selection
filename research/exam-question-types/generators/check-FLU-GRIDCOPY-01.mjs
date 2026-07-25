// Independent validator for the FLU-GRIDCOPY-01 structured bank.
//
// The grid transforms, the program-search solver and the difficulty arithmetic are
// RE-IMPLEMENTED here from the documented model rather than imported, so a bug in
// the generator cannot validate itself. Crucially the answer key is re-derived FROM
// THE CONTENT ALONE: the checker searches the program space for every transform
// consistent with the shown examples and confirms they all predict the declared
// `correctKey` on the probe input. The generator is imported only to prove each
// item is byte-reproducible from its own provenance.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: content carries no target grid, program or key.
//   3. Identifiability + key: the examples determine exactly one output for the
//      probe, and it equals correctKey (also equal to answer.targetGrid).
//   4. Difficulty equals the value independently re-derived from the item's levers,
//      and the item regenerates byte-identically from its provenance.
//   5. Coverage: spans 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-FLU-GRIDCOPY-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem } from './FLU-GRIDCOPY-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/FLU-GRIDCOPY-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8']; // this type excludes K-1 by design
const ALLOWED_LURES = [
  'identity_copy',
  'first_step_only',
  'second_step_only',
  'wrong_direction',
  'axis_confusion',
  'unconditional_apply',
  'colour_swap_reversed',
];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---- independent grid transforms (re-implemented from the documented op set) ---- */
const ser = (g) => g.map((r) => r.join('')).join('/');
const zeros = (R, C) => Array.from({ length: R }, () => Array.from({ length: C }, () => 0));
function op1(g, o) {
  const R = g.length,
    C = g[0].length,
    n = zeros(R, C);
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      if (o.op === 'shift') {
        const sr = r - o.dy,
          sc = c - o.dx;
        n[r][c] = sr >= 0 && sr < R && sc >= 0 && sc < C ? g[sr][sc] : 0;
      } else if (o.op === 'reflectH') n[r][c] = g[r][C - 1 - c];
      else if (o.op === 'reflectV') n[r][c] = g[R - 1 - r][c];
      else if (o.op === 'rot180') n[r][c] = g[R - 1 - r][C - 1 - c];
      else if (o.op === 'recolor') n[r][c] = g[r][c] === o.from ? o.to : g[r][c];
      else if (o.op === 'shiftColor') n[r][c] = g[r][c] === o.color ? 0 : g[r][c];
      else throw new Error('unknown op ' + o.op);
    }
  if (o.op === 'shiftColor') {
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++) {
        if (g[r][c] !== o.color) continue;
        const tr = r + o.dy,
          tc = c + o.dx;
        if (tr >= 0 && tr < R && tc >= 0 && tc < C) n[tr][tc] = o.color;
      }
  }
  return n;
}
const run = (g, prog) => prog.reduce(op1, g);

// Program search space: all single ops plus all ordered two-step compositions.
function space(paletteSize) {
  const s = [];
  for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) if (dx || dy) s.push({ op: 'shift', dx, dy });
  s.push({ op: 'reflectH' }, { op: 'reflectV' }, { op: 'rot180' });
  for (let a = 1; a <= paletteSize; a++)
    for (let b = 1; b <= paletteSize; b++) if (a !== b) s.push({ op: 'recolor', from: a, to: b });
  for (let col = 1; col <= paletteSize; col++)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.push({ op: 'shiftColor', color: col, dx, dy });
  const progs = s.map((x) => [x]);
  for (const a of s) for (const b of s) progs.push([a, b]);
  return progs;
}

/* ---- independent difficulty arithmetic (documented lever model) ---- */
const LOADS = {
  shift: 1.2,
  reflectH: 2.0,
  reflectV: 2.2,
  rot180: 2.8,
  recolor: 1.6,
  shiftColor: 3.4,
  'shift+recolor': 3.8,
  'reflectH+recolor': 4.6,
  'rot180+recolor': 5.4,
  'shift+shiftColor': 5.6,
  'shiftColor+recolor': 6.0,
};
const MIN_PALETTE = { shift: 1, reflectH: 1, reflectV: 1, rot180: 1 };
const GRID_LIST = [[3, 3], [3, 4], [4, 4], [4, 5], [5, 5]];
const DENSITY_SPAN = 3.0;
const baseOf = (L) =>
  1.0 + LOADS[L.programKey] + 0.22 * (L.rows * L.cols - 9) + (L.exampleCount >= 2 ? 0 : 1.4) + 0.8 * (L.paletteSize - 1);
const ANCHORS = (() => {
  const out = [];
  for (const programKey of Object.keys(LOADS))
    for (const [rows, cols] of GRID_LIST)
      for (const exampleCount of [1, 2])
        for (let paletteSize = 1; paletteSize <= 3; paletteSize++) {
          if (paletteSize < (MIN_PALETTE[programKey] ?? 2)) continue;
          out.push(baseOf({ programKey, rows, cols, exampleCount, paletteSize }));
        }
  return out;
})();
const RAW_MIN = Math.min(...ANCHORS);
const RAW_MAX = Math.max(...ANCHORS) + DENSITY_SPAN;
const difficultyOf = (L) =>
  Math.max(1, Math.min(20, 1 + ((baseOf(L) + DENSITY_SPAN * L.demandDensity - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN)));

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

  if (it.typeCode !== 'FLU-GRIDCOPY-01') fail(id, `typeCode != FLU-GRIDCOPY-01 (${it.typeCode})`);
  if (it.domain !== 'fluid_reasoning') fail(id, `domain != fluid_reasoning (${it.domain})`);
  if (it.demoPath !== 'demos/FLU-GRIDCOPY-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20)
    fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  const { rows, cols, paletteSize } = c;
  const okGrid = (g) =>
    Array.isArray(g) &&
    g.length === rows &&
    g.every((r) => Array.isArray(r) && r.length === cols && r.every((v) => Number.isInteger(v) && v >= 0 && v <= paletteSize));

  if (!GRID_LIST.some(([r, cc]) => r === rows && cc === cols)) fail(id, `grid ${rows}x${cols} outside the design space`);
  if (!Array.isArray(c.palette) || c.palette.length !== paletteSize) fail(id, 'palette length != paletteSize');
  if (!Array.isArray(c.examples) || c.examples.length !== c.exampleCount) fail(id, 'exampleCount != examples.length');
  if (!c.editable || c.editable.initFrom !== 'probeInput' || c.editable.cycleStates !== paletteSize + 1)
    fail(id, 'editable spec malformed');
  if (!okGrid(c.probeInput)) fail(id, 'probeInput malformed');
  for (const ex of c.examples || []) {
    if (!okGrid(ex.input) || !okGrid(ex.output)) fail(id, 'example grid malformed');
    else if (ser(ex.input) === ser(ex.output)) fail(id, 'an example shows no change');
  }

  // SERVED-SUBSET SAFETY: nothing renderable may carry the key, target or program.
  const contentStr = JSON.stringify(c);
  for (const leak of ['correctKey', 'targetGrid', 'program', 'distractorRationales', 'editsRequired'])
    if (contentStr.includes(leak)) fail(id, `content leaks "${leak}"`);

  const ans = it.answer || {};
  if (!okGrid(ans.targetGrid)) fail(id, 'answer.targetGrid malformed');
  else {
    if (ans.correctKey !== ser(ans.targetGrid)) fail(id, 'correctKey is not the serialized targetGrid');
    if (okGrid(c.probeInput) && ser(c.probeInput) === ser(ans.targetGrid))
      fail(id, 'target equals the probe input (no edit required)');
    let h = 0;
    if (okGrid(c.probeInput))
      for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) if (c.probeInput[r][cc] !== ans.targetGrid[r][cc]) h++;
    if (ans.editsRequired !== h) fail(id, `editsRequired ${ans.editsRequired} != solver hamming ${h}`);
    let taps = 0;
    if (okGrid(c.probeInput))
      for (let r = 0; r < rows; r++)
        for (let cc = 0; cc < cols; cc++)
          taps += (ans.targetGrid[r][cc] - c.probeInput[r][cc] + paletteSize + 1) % (paletteSize + 1);
    if (ans.minTaps !== taps) fail(id, `minTaps ${ans.minTaps} != solver tap count ${taps}`);
    if (ans.minTaps < ans.editsRequired) fail(id, 'minTaps cannot be below the cell-difference count');
  }

  // ---- 3. KEY RE-DERIVED FROM CONTENT ALONE ----
  if (okGrid(c.probeInput) && (c.examples || []).every((ex) => okGrid(ex.input) && okGrid(ex.output))) {
    const consistent = space(paletteSize).filter((p) => c.examples.every((ex) => ser(run(ex.input, p)) === ser(ex.output)));
    if (!consistent.length) fail(id, 'no program in the audit space reproduces the worked examples');
    else {
      const predicted = new Set(consistent.map((p) => ser(run(c.probeInput, p))));
      if (predicted.size !== 1) fail(id, `examples do not identify one answer (${predicted.size} rival outputs)`);
      else if (!predicted.has(ans.correctKey)) fail(id, 'solver-derived output != declared correctKey');
    }
  }

  // Near-miss taxonomy: valid distinct grids with recognised lure labels.
  const rats = ans.distractorRationales || {};
  if (!Object.keys(rats).length) fail(id, 'no distractorRationales');
  for (const [key, r] of Object.entries(rats)) {
    if (key === ans.correctKey) fail(id, 'a distractor equals the correct answer');
    const grid = key.split('/').map((row) => row.split('').map(Number));
    if (!okGrid(grid)) fail(id, `distractor key "${key}" is not a valid grid`);
    if (!ALLOWED_LURES.includes(r.lure)) fail(id, `unknown lure label "${r.lure}"`);
    if (typeof r.note !== 'string' || !r.note.length) fail(id, 'distractor missing rationale note');
  }

  // ---- 4. Difficulty + reproducibility ----
  const lev = (it.provenance && it.provenance.levers) || {};
  const derived = round2(difficultyOf(lev));
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
  try {
    const regen = genItem({ ...lev, seed: it.provenance.seed });
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
console.log(`FLU-GRIDCOPY-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — parses, structure valid, key re-derived from the worked examples alone, coverage 1..20 with >=5 per bin and per +/-1pt band.');
