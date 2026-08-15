// Independent validator for the SPA-PUNCH-01 structured bank.
//
// This checker does NOT import the generator. It recomputes every hole set with a
// DIFFERENT algorithm than the generator's forward per-cell transform: it REVERSE-UNFOLDS
// each punched cell of the final folded region back out through the crease reflections
// (orthogonal creases mirror across a half-plane, oblique creases transpose the square
// live region) and collects the original cells that must therefore be punched. The
// generator instead pushes all 16..64 sheet cells forward through the folds and reads off
// which ones land under a punch.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Born-synthetic + server/renderable split: content carries NO key, hole set,
//      derivation or lure table.
//   3. The rendered stimulus matches the geometry: independently recomputed creases,
//      folded region, layer count and punched cells equal what `content` will draw.
//   4. Key is COMPUTED: reverse-unfolding the declared derivation reproduces
//      answer.correctKey and answer.trueCells exactly.
//   5. Every lure in the table is re-derived from its own derivation, differs from the
//      key, and its recorded chirality is confirmed by an independent reflection test
//      (a mirror foil must really be the key reflected across a sheet symmetry axis).
//   6. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band,
//      and hole count rises with difficulty.
//
// Run:  node research/exam-question-types/generators/check-SPA-PUNCH-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lureLabel } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/SPA-PUNCH-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;
const LEAK_KEYS = ['answer', 'correctKey', 'trueCells', 'holeCount', 'derivation', 'distractorRationales', 'signature', 'solution'];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;
const VERT = (op) => op === 'L' || op === 'R';
const HORZ = (op) => op === 'T' || op === 'B';
const OBL = (op) => op === 'D1' || op === 'D2';

// ---- region-only forward pass: record each crease so punches can be reflected back ----
function foldRegions(n, seq) {
  let bb = { x0: 0, y0: 0, x1: n - 1, y1: n - 1 };
  const creases = [];
  let diagonal = null;
  for (const op of seq) {
    if (diagonal) return null;
    const w = bb.x1 - bb.x0 + 1, h = bb.y1 - bb.y0 + 1;
    if (VERT(op)) {
      if (w < 2 || w % 2) return null;
      const p = bb.x0 + w / 2;
      creases.push({ op, p, before: { ...bb } });
      bb = op === 'L' ? { ...bb, x0: p } : { ...bb, x1: p - 1 };
    } else if (HORZ(op)) {
      if (h < 2 || h % 2) return null;
      const p = bb.y0 + h / 2;
      creases.push({ op, p, before: { ...bb } });
      bb = op === 'T' ? { ...bb, y0: p } : { ...bb, y1: p - 1 };
    } else if (OBL(op)) {
      if (w !== h || w < 2) return null;
      creases.push({ op, m: w, before: { ...bb } });
      diagonal = op;
    } else return null;
  }
  return { creases, bb, diagonal };
}
function resolvePunch(bb, diagonal, u, v) {
  const w = bb.x1 - bb.x0 + 1, h = bb.y1 - bb.y0 + 1, m = w;
  let px = bb.x0 + Math.round(u * (w - 1)), py = bb.y0 + Math.round(v * (h - 1));
  if (diagonal === 'D1') { const a = px - bb.x0, b = py - bb.y0; if (a > b) { px = bb.x0 + b; py = bb.y0 + a; } }
  if (diagonal === 'D2') { const a = px - bb.x0, b = py - bb.y0; if (a + b > m - 1) { px = bb.x0 + (m - 1 - b); py = bb.y0 + (m - 1 - a); } }
  return [px, py];
}
// Walk the creases backwards, adding the mirror image of every point already in the set.
function reverseUnfoldOne(info, px, py) {
  let S = new Set([`${px},${py}`]);
  for (let i = info.creases.length - 1; i >= 0; i--) {
    const f = info.creases[i], add = [];
    for (const key of S) {
      const [x, y] = key.split(',').map(Number);
      if (f.op === 'L') { if (x >= f.p) { const m = 2 * f.p - 1 - x; if (m >= f.before.x0 && m < f.p) add.push(`${m},${y}`); } }
      else if (f.op === 'R') { if (x < f.p) { const m = 2 * f.p - 1 - x; if (m <= f.before.x1 && m >= f.p) add.push(`${m},${y}`); } }
      else if (f.op === 'T') { if (y >= f.p) { const m = 2 * f.p - 1 - y; if (m >= f.before.y0 && m < f.p) add.push(`${x},${m}`); } }
      else if (f.op === 'B') { if (y < f.p) { const m = 2 * f.p - 1 - y; if (m <= f.before.y1 && m >= f.p) add.push(`${x},${m}`); } }
      else if (f.op === 'D1') {                       // kept below the main diagonal
        const a = x - f.before.x0, b = y - f.before.y0;
        if (a <= b) { const nx = f.before.x0 + b, ny = f.before.y0 + a; if (nx !== x || ny !== y) add.push(`${nx},${ny}`); }
      } else if (f.op === 'D2') {                     // kept above the anti-diagonal
        const a = x - f.before.x0, b = y - f.before.y0, m = f.m;
        if (a + b <= m - 1) { const nx = f.before.x0 + (m - 1 - b), ny = f.before.y0 + (m - 1 - a); if (nx !== x || ny !== y) add.push(`${nx},${ny}`); }
      }
    }
    add.forEach(k => S.add(k));
  }
  return S;
}
function reverseUnfold(n, seq, punchNorms) {
  const info = foldRegions(n, seq);
  if (!info) return null;
  const pts = punchNorms.map(([u, v]) => resolvePunch(info.bb, info.diagonal, u, v));
  if (new Set(pts.map(p => p.join(','))).size !== pts.length) return null;
  const map = new Map();
  pts.forEach((p, i) => { for (const k of reverseUnfoldOne(info, p[0], p[1])) if (!map.has(k)) map.set(k, i); });
  const cells = [...map].map(([k, p]) => { const [x, y] = k.split(',').map(Number); return { x, y, p }; })
    .sort((a, b) => a.y - b.y || a.x - b.x);
  return { cells, signature: sigOf(cells), punchCells: pts, bb: info.bb, diagonal: info.diagonal, creases: info.creases, layerCount: Math.pow(2, seq.length) };
}
function sigOf(cells) {
  return cells.slice().sort((a, b) => a.y - b.y || a.x - b.x).map(c => `${c.x},${c.y}`).join('|');
}
const REFLECTIONS = {
  mirror_vertical: (n, c) => ({ x: n - 1 - c.x, y: c.y }),
  mirror_horizontal: (n, c) => ({ x: c.x, y: n - 1 - c.y }),
  mirror_main_diagonal: (n, c) => ({ x: c.y, y: c.x }),
  mirror_anti_diagonal: (n, c) => ({ x: n - 1 - c.y, y: n - 1 - c.x }),
};
function chiralityOf(n, trueCells, foilSig) {
  if (foilSig === sigOf(trueCells)) return 'same';   // the key itself is never a mirror foil
  for (const axis of Object.keys(REFLECTIONS)) {
    if (sigOf(trueCells.map(c => REFLECTIONS[axis](n, c))) === foilSig) return axis;
  }
  return 'same';
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

// ---- 2..5. Per-item structural + independent key recompute ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId'); seenIds.add(it.itemId);
  if (it.typeCode !== 'SPA-PUNCH-01') fail(id, `typeCode != SPA-PUNCH-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (it.demoPath !== 'demos/SPA-PUNCH-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  scanLeaks(c, 'content', id);
  const n = c.grid && c.grid.n;
  if (![4, 6, 8].includes(n)) { fail(id, `grid.n unexpected (${n})`); continue; }
  if (!Array.isArray(c.folds) || c.folds.length < 1) { fail(id, 'folds missing'); continue; }
  if (!Array.isArray(c.punches) || c.punches.length < 1) { fail(id, 'punches missing'); continue; }
  if (!c.response || c.response.mode !== 'mark_cells' || c.response.maxMarks !== n * n) fail(id, 'response spec wrong');
  if (c.scaffold && c.scaffold.unfoldReveal === true) fail(id, 'unfold reveal must be off for scored items');

  const ans = it.answer || {};
  const d = ans.derivation || {};
  if (d.grid !== n) fail(id, `derivation grid ${d.grid} != content grid ${n}`);
  if (!Array.isArray(d.seq) || !Array.isArray(d.punchNorms)) { fail(id, 'derivation malformed'); continue; }
  if (d.seq.length !== c.folds.length) fail(id, 'derivation fold count != rendered fold count');
  if (d.seq.some((op, i) => c.folds[i].op !== op)) fail(id, 'rendered fold ops differ from the derivation');

  // 3 + 4. Independent reverse-unfold of the declared derivation.
  const re = reverseUnfold(n, d.seq, d.punchNorms);
  if (!re) { fail(id, 'derivation is not a legal fold sequence'); continue; }
  if (re.signature !== ans.correctKey) fail(id, `reverse-unfold key != declared correctKey`);
  if (sigOf(ans.trueCells || []) !== re.signature) fail(id, 'answer.trueCells != reverse-unfolded hole set');
  if (ans.holeCount !== re.cells.length) fail(id, `holeCount ${ans.holeCount} != ${re.cells.length}`);
  if (ans.layerCount !== re.layerCount || c.layerCount !== re.layerCount) fail(id, 'layerCount wrong');
  if (sigOf(c.punches) !== sigOf(re.punchCells.map(p => ({ x: p[0], y: p[1] })))) fail(id, 'rendered punch cells != independently resolved punch cells');
  const R = c.foldedRegion || {};
  if (R.x0 !== re.bb.x0 || R.x1 !== re.bb.x1 || R.y0 !== re.bb.y0 || R.y1 !== re.bb.y1 || (R.diagonal || null) !== re.diagonal)
    fail(id, 'rendered folded region != independently recomputed region');
  if (!!c.obliqueFold !== !!re.diagonal) fail(id, 'obliqueFold flag wrong');
  // Every crease must fall inside the sheet and every hole inside the grid.
  for (const cell of re.cells) if (cell.x < 0 || cell.x >= n || cell.y < 0 || cell.y >= n) fail(id, 'hole outside the sheet');
  if (re.cells.length < 2) fail(id, 'fewer than 2 holes: no reflection is being tested');

  // 5. Lure table.
  const rats = Object.values(ans.distractorRationales || {});
  if (rats.length < 2) fail(id, `lure table too small (${rats.length})`);
  const correct = rats.filter((x) => x && lureLabel(x) === 'correct');
  if (correct.length !== 1) fail(id, `expected exactly 1 'correct' lure, got ${correct.length}`);
  else if (correct[0].signature !== ans.correctKey) fail(id, "'correct' lure signature != correctKey");
  const keys = rats.map((x) => x && x.key);
  if (new Set(keys).size !== keys.length) fail(id, 'lure keys not unique');
  const sigs = rats.map((x) => x && x.signature);
  if (new Set(sigs).size !== sigs.length) fail(id, 'lure signatures not unique');
  for (const f of rats) {
    if (typeof lureLabel(f) !== 'string' || !lureLabel(f)) { fail(id, 'lure label missing'); continue; }
    if (typeof f.chirality !== 'string') { fail(id, 'lure chirality missing'); continue; }
    const der = f.derivation || {};
    let got = null;
    if (der.kind === 'sequence') { const m = reverseUnfold(n, der.seq, der.punchNorms); got = m && m.signature; }
    else if (der.kind === 'punch_cells_only') got = sigOf(re.punchCells.map(p => ({ x: p[0], y: p[1] })));
    else if (der.kind === 'mirror_sheet') got = sigOf(re.cells.map(cc => REFLECTIONS[der.axis](n, cc)));
    else fail(id, `unknown lure derivation kind (${der.kind})`);
    if (got !== null && got !== f.signature) fail(id, `lure ${f.key} (${lureLabel(f)}) does not re-derive to its signature`);
    if (lureLabel(f) !== 'correct' && f.signature === ans.correctKey) fail(id, `lure ${f.key} equals the key`);
    const chir = chiralityOf(n, re.cells, f.signature);
    if (chir !== f.chirality) fail(id, `lure ${f.key} chirality ${f.chirality} != recomputed ${chir}`);
  }
}

// ---- 6. Coverage + ramp ----
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
function corr(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxy / Math.sqrt(sxx * syy || 1);
}
const rHoles = corr(diffs, items.map((it) => it.answer.holeCount));
const rLayers = corr(diffs, items.map((it) => it.answer.layerCount));
if (rHoles < 0.75) fail('ramp', `difficulty vs hole-count correlation ${rHoles.toFixed(2)} < 0.75`);
if (rLayers < 0.6) fail('ramp', `difficulty vs layer-count correlation ${rLayers.toFixed(2)} < 0.60`);

// ---- Report ----
console.log(`SPA-PUNCH-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log(`ramp correlation: holes r=${rHoles.toFixed(3)} · layers r=${rLayers.toFixed(3)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, every hole set reverse-unfolds to the declared key, lures re-derived with confirmed chirality, coverage 1..20 with >=5 per bin and per +/-1pt band.');
