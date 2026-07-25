// Independent validator for the SPA-TANGRAM-01 structured bank.
//
// This checker does NOT import the generator. It re-derives solvability purely from the served
// content: it runs a fresh exact-cover solver over the tray pieces (each used once, any rotation)
// and confirms a subset exactly tiles the target outline. It also validates the stored
// referenceSolution is a genuine exact cover built from tray pieces, and that correctKey equals
// the target area.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Born-synthetic + server/renderable split: content carries NO solution / real-vs-herring flag.
//   3. Key is COMPUTED + solvable: an exact cover exists (fresh solve from content), the stored
//      reference is a valid exact cover of distinct tray pieces, and correctKey == target area.
//   4. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-SPA-TANGRAM-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/SPA-TANGRAM-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- geometry (fresh reimplementation) ----
const k3 = (c) => c[0] + ',' + c[1] + ',' + c[2];
function normalize(cells) {
  const ml = Math.min(...cells.map(c => c[0])), mr = Math.min(...cells.map(c => c[1])), mc = Math.min(...cells.map(c => c[2]));
  return cells.map(c => [c[0] - ml, c[1] - mr, c[2] - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
}
const shapeKey = (offs) => normalize(offs).map(o => o.join(',')).join('|');
const rotateOffsets = (offs) => normalize(offs.map(([l, r, c]) => [l, c, -r]));
function allRotations(offs) { const out = [], seen = new Set(); let cur = normalize(offs); for (let i = 0; i < 4; i++) { const k = shapeKey(cur); if (!seen.has(k)) { seen.add(k); out.push(cur); } cur = rotateOffsets(cur); } return out; }
const allRotationKeys = (offs) => new Set(allRotations(offs).map(shapeKey));
const offsetsMatchCells = (offsets, cells) => allRotationKeys(offsets).has(shapeKey(cells));

// exact-cover: subset of pieces (each once, any rotation) tiling target -> chosen placements or null.
function solveCover(targetKeys, pieces) {
  const target = new Set(targetKeys);
  const order = [...targetKeys].sort();
  const rotsById = pieces.map(p => ({ id: p.id, rots: allRotations(p.offsets) }));
  const covered = new Set(), used = new Set(), chosen = [];
  const firstUncovered = () => { for (const c of order) if (!covered.has(c)) return c.split(',').map(Number); return null; };
  function rec(depth) {
    const cell = firstUncovered();
    if (!cell) return true;
    if (depth > 80) return false;
    for (const pr of rotsById) {
      if (used.has(pr.id)) continue;
      for (const rot of pr.rots) for (const o of rot) {
        const t = [cell[0] - o[0], cell[1] - o[1], cell[2] - o[2]];
        const abs = rot.map(x => [x[0] + t[0], x[1] + t[1], x[2] + t[2]]);
        if (abs.some(a => !target.has(k3(a)) || covered.has(k3(a)))) continue;
        abs.forEach(a => covered.add(k3(a))); used.add(pr.id); chosen.push({ id: pr.id, cells: abs });
        if (rec(depth + 1)) return true;
        chosen.pop(); used.delete(pr.id); abs.forEach(a => covered.delete(k3(a)));
      }
    }
    return false;
  }
  return rec(0) ? chosen.slice() : null;
}

function verifyReference(content, answer) {
  const target = new Set(content.target.cells.map(k3));
  const covered = new Set(), usedIds = new Set();
  const trayById = new Map(content.tray.map(t => [t.id, t.offsets]));
  for (const pl of answer.referenceSolution || []) {
    if (usedIds.has(pl.id)) return `reference reuses tray piece ${pl.id}`;
    usedIds.add(pl.id);
    const off = trayById.get(pl.id); if (!off) return `reference id ${pl.id} not in tray`;
    if (!offsetsMatchCells(off, pl.cells)) return `reference piece ${pl.id} is not a rotation of its tray shape`;
    for (const c of pl.cells) { const kk = k3(c); if (!target.has(kk)) return `reference cell ${kk} outside target`; if (covered.has(kk)) return `reference overlap at ${kk}`; covered.add(kk); }
  }
  if (covered.size !== target.size) return `reference covers ${covered.size}/${target.size} target cells`;
  return null;
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} not valid JSON: ${e.message}`); } });

// ---- 2 + 3. Per-item structural + independent solvability recompute ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId'); seenIds.add(it.itemId);
  if (it.typeCode !== 'SPA-TANGRAM-01') fail(id, `typeCode != SPA-TANGRAM-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  for (const leak of ['referenceSolution', 'answer', 'optimalPlacements']) if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks "${leak}"`);
  if (!c.target || !Array.isArray(c.target.cells) || !isNum(c.target.area)) fail(id, 'target missing');
  else if (c.target.cells.length !== c.target.area) fail(id, `target.area ${c.target.area} != cells ${c.target.cells.length}`);
  if (!Array.isArray(c.tray) || c.tray.length < 2) fail(id, `tray too small (${c.tray && c.tray.length})`);
  else {
    const ids = c.tray.map(t => t.id);
    if (new Set(ids).size !== ids.length) fail(id, 'tray ids not unique');
    for (const t of c.tray) { if (!Array.isArray(t.offsets) || t.offsets.length === 0) fail(id, `tray piece ${t.id} malformed`); if ('_real' in t || 'real' in t) fail(id, `tray piece ${t.id} leaks real/herring flag`); }
  }

  const ans = it.answer || {};
  if (ans.correctKey !== String(c.target.area)) fail(id, `correctKey ${ans.correctKey} != target area ${c.target.area}`);
  const refErr = verifyReference(c, ans);
  if (refErr) fail(id, refErr);

  // INDEPENDENT solvability: a fresh exact-cover of the tray must tile the target.
  const cover = solveCover(c.target.cells.map(k3), c.tray);
  if (!cover) fail(id, 'independent exact-cover solver found NO tiling of the target from the tray');

  if (!Array.isArray(ans.distractorRationales) || ans.distractorRationales.length === 0) fail(id, 'distractorRationales (response taxonomy) missing');
}

// ---- 4. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (floor not reached)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ceiling not reached)`);
const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) { const k = Math.round(d); if (k >= 1 && k <= 20) binCounts[k - 1]++; for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++; }
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

// ---- Report ----
console.log(`SPA-TANGRAM-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, exact cover exists (fresh solve) + reference validated, key == target area, coverage 1..20 with >=5 per bin and per +/-1pt band.');
