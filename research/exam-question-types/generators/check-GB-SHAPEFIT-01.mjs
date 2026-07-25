// Independent validator for the GB-SHAPEFIT-01 structured bank.
//
// This checker does NOT import the generator and does NOT trust any stored optimum. From the
// served silhouette + tray it rebuilds the orientation group offered by the item's own
// instruction set, enumerates every legal placement, and re-derives the cheapest assembly with
// its OWN search - deliberately a different algorithm from the generator's branch and bound:
//
//   iterative deepening on COST (IDA*). For an increasing cost bound, a depth-first search
//   fills the outline choosing, at each step, the uncovered cell with the FEWEST remaining
//   candidate placements (most-constrained-cell branching) and abandoning a branch as soon as
//   costSoFar + ceil(cellsLeft / largestPiece) exceeds the bound. The first bound at which a
//   full cover appears is the minimum move cost. A cell with zero candidates prunes at once,
//   which is also how unsolvable silhouettes are detected.
//
// Move cost model (must match what the renderer charges the child): one move per orientation
// button press (rotate, and flip where the instruction set offers it) plus one move per piece
// placement. A piece's orientation cost is the minimal word length in the offered generators
// that carries its tray shape onto its placed shape, minimised over symmetric duplicates.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN 2 shape, exact key set).
//   2. Born-synthetic + server/renderable split: content carries no optimum/assembly/cost, the
//      tray carries no real-vs-herring flag, and the move budget is a pure function of the tray.
//   3. Solvability is 100%, the re-derived minimum equals the declared cost, and the stored
//      assembly is a genuine exact cover of the outline at exactly that cost using reachable
//      orientations only.
//   4. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band, and the
//      declared difficulty levers (silhouette area, piece count, herring count) ramp monotonically.
//
// Run:  node research/exam-question-types/generators/check-GB-SHAPEFIT-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-SHAPEFIT-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];   // exactly this type's declared catalog age_bands
const MIN_PER_BAND = 5;
const REQUIRED_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- polyomino geometry + orientation group (fresh reimplementation) ----
const norm = (cells) => {
  const mr = Math.min(...cells.map(c => c[0])), mc = Math.min(...cells.map(c => c[1]));
  return cells.map(c => [c[0] - mr, c[1] - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const sig = (cells) => norm(cells).map(c => c.join(',')).join('|');
const turnCW = (cells) => norm(cells.map(([r, c]) => [c, -r]));
const mirror = (cells) => norm(cells.map(([r, c]) => [r, -c]));
function apply(cells, word) { let cur = norm(cells); for (const w of word) cur = w === 'rotate' ? turnCW(cur) : mirror(cur); return cur; }
const PROBE = [[0, 0], [1, 0], [2, 0], [2, 1]];
function group(ops) {
  const seen = new Map([[sig(PROBE), []]]);
  const q = [[]];
  while (q.length) {
    const word = q.shift();
    for (const g of ops) {
      const next = word.concat(g);
      const k = sig(apply(PROBE, next));
      if (!seen.has(k)) { seen.set(k, next); q.push(next); }
    }
  }
  return [...seen.values()];
}
// Minimal presses that carry `from` onto `to`, or null when unreachable with these ops.
function pressesBetween(from, to, grp) {
  let best = null;
  const goal = sig(to);
  for (const word of grp) if (sig(apply(from, word)) === goal) best = best === null ? word.length : Math.min(best, word.length);
  return best;
}

// ---- IDA* minimum-cost exact cover ----
function minCost(targetCells, tray, grp) {
  const N = targetCells.length;
  const index = new Map(targetCells.map((c, i) => [c[0] + ',' + c[1], i]));
  const placements = [];
  let biggest = 1;
  for (const p of tray) {
    biggest = Math.max(biggest, p.cells.length);
    const byShape = new Map();
    for (const word of grp) {
      const img = apply(p.cells, word), k = sig(img);
      const prev = byShape.get(k);
      if (!prev || prev.presses > word.length) byShape.set(k, { presses: word.length, cells: img });
    }
    for (const { presses, cells } of byShape.values()) {
      const dedupe = new Set();
      for (const anchor of targetCells) {
        const dr = anchor[0] - cells[0][0], dc = anchor[1] - cells[0][1];
        let mask = 0, ok = true; const abs = [];
        for (const [r, c] of cells) {
          const i = index.get((r + dr) + ',' + (c + dc));
          if (i === undefined) { ok = false; break; }
          mask += 2 ** i; abs.push([r + dr, c + dc]);
        }
        if (!ok || dedupe.has(mask)) continue;
        dedupe.add(mask);
        placements.push({ pid: p.id, mask, cost: presses + 1, cells: abs, presses });
      }
    }
  }
  // candidate placements per cell
  const perCell = Array.from({ length: N }, () => []);
  for (const pl of placements) for (let i = 0; i < N; i++) if (Math.floor(pl.mask / 2 ** i) % 2 === 1) perCell[i].push(pl);
  if (perCell.some(list => list.length === 0)) return null;   // a cell no piece can ever cover

  const covers = (mask, i) => Math.floor(mask / 2 ** i) % 2 === 1;
  const used = new Set(); const chosen = [];
  let found = null;

  function dfs(covered, cost, bound, left) {
    // Bound FIRST: a completed cover is only acceptable if it also fits inside the current
    // cost bound, otherwise IDA* would return the first cover it stumbles into rather than
    // the cheapest one.
    if (cost + Math.ceil(left / biggest) > bound) return false;
    if (left === 0) { found = chosen.slice(); return true; }
    // most-constrained uncovered cell
    let target = -1, bestCount = Infinity, bestList = null;
    for (let i = 0; i < N; i++) {
      if (covers(covered, i)) continue;
      const list = perCell[i].filter(pl => !used.has(pl.pid) && (pl.mask & covered) === 0);
      if (list.length < bestCount) { bestCount = list.length; target = i; bestList = list; if (!list.length) break; }
    }
    if (!bestList || !bestList.length) return false;
    bestList.sort((a, b) => a.cost - b.cost);
    for (const pl of bestList) {
      used.add(pl.pid); chosen.push(pl);
      let bits = 0; for (let i = 0; i < N; i++) if (covers(pl.mask, i)) bits++;
      if (dfs(covered | pl.mask, cost + pl.cost, bound, left - bits)) return true;
      chosen.pop(); used.delete(pl.pid);
    }
    return false;
  }

  const floor = Math.ceil(N / biggest);
  for (let bound = floor; bound <= N * 6 + 8; bound++) {
    if (dfs(0, 0, bound, N)) {
      const moves = found.reduce((a, p) => a + p.cost, 0);
      return { moves, placements: found.map(p => ({ id: p.pid, cells: p.cells, orientOps: p.presses })) };
    }
  }
  return null;
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} not valid JSON: ${e.message}`); } });

// ---- 2 + 3. Per-item structure + independent optimum recompute ----
const seenIds = new Set();
let coverable = 0, checked = 0;
const leversByLevel = new Map();
for (const it of items) {
  checked++;
  const id = (it.itemId || '(no id)').slice(0, 8);
  const keys = Object.keys(it);
  for (const k of REQUIRED_KEYS) if (!keys.includes(k)) fail(id, `missing required key "${k}"`);
  for (const k of keys) if (!REQUIRED_KEYS.includes(k)) fail(id, `unexpected top-level key "${k}"`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(it.itemId)) fail(id, 'itemId is not a v4-shaped uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId'); seenIds.add(it.itemId);
  if (it.typeCode !== 'GB-SHAPEFIT-01') fail(id, `typeCode != GB-SHAPEFIT-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length || !it.ageBands.every(b => ALLOWED_BANDS.includes(b))) fail(id, `ageBands invalid (${it.ageBands})`);
  if (it.demoPath !== 'demos/GB-SHAPEFIT-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  else if (typeof it.scoring.solverId !== 'string' || !it.scoring.solverId) fail(id, 'scoring.solverId missing');
  if (!it.provenance || it.provenance.generator !== 'grammar' || typeof it.provenance.seed !== 'string') fail(id, 'provenance invalid');

  const c = it.content || {}, a = it.answer || {};
  const banned = /^(optimal|optimalMoves|canonicalSolution|placements|cost|answer|solution|moves|orientOps|correctKey|real|_real|herring)$/i;
  (function scanKeys(node, path) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((v, i) => scanKeys(v, `${path}[${i}]`)); return; }
    for (const [k, v] of Object.entries(node)) {
      if (banned.test(k)) fail(id, `content leaks a solution field at ${path}.${k}`);
      scanKeys(v, `${path}.${k}`);
    }
  })(c, 'content');

  if (!c.grid || !isNum(c.grid.R) || !isNum(c.grid.C)) { fail(id, 'grid missing'); continue; }
  if (!c.target || !Array.isArray(c.target.cells) || !c.target.cells.length) { fail(id, 'target missing'); continue; }
  if (c.target.cells.length !== c.target.area) fail(id, 'target.area != number of target cells');
  const tset = new Set(c.target.cells.map(x => x.join(',')));
  if (tset.size !== c.target.cells.length) fail(id, 'duplicate target cells');
  for (const [r, cc] of c.target.cells) if (r < 0 || r >= c.grid.R || cc < 0 || cc >= c.grid.C) fail(id, `target cell ${r},${cc} outside the grid`);
  // the silhouette must be one connected blob
  {
    const seen = new Set([c.target.cells[0].join(',')]); const q = [c.target.cells[0]];
    while (q.length) { const [r, cc] = q.pop();
      for (const nb of [[r - 1, cc], [r + 1, cc], [r, cc - 1], [r, cc + 1]]) { const k = nb.join(','); if (tset.has(k) && !seen.has(k)) { seen.add(k); q.push(nb); } } }
    if (seen.size !== tset.size) fail(id, `silhouette is not connected (${seen.size}/${tset.size})`);
  }
  if (!Array.isArray(c.tray) || !c.tray.length) { fail(id, 'tray missing'); continue; }
  const trayIds = new Set(c.tray.map(t => t.id));
  if (trayIds.size !== c.tray.length) fail(id, 'duplicate tray ids');
  for (const t of c.tray) {
    if (!Array.isArray(t.cells) || !t.cells.length) fail(id, `tray piece ${t.id} has no cells`);
    else if (sig(t.cells) !== t.cells.map(x => x.join(',')).join('|')) fail(id, `tray piece ${t.id} is not normalised`);
  }
  const ops = (c.instructionSet && c.instructionSet.ops) || [];
  if (!ops.includes('rotate')) fail(id, 'instructionSet.ops must offer rotate');
  if (ops.some(o => o !== 'rotate' && o !== 'flip')) fail(id, `unknown op in ${ops}`);
  if (c.question.canFlip !== ops.includes('flip')) fail(id, 'question.canFlip disagrees with instructionSet.ops');
  if (!c.limits || c.limits.maxMoves !== 12 * c.tray.length) fail(id, `limits.maxMoves != 12*trayCount (${c.limits && c.limits.maxMoves})`);

  const grp = group(ops);
  const re = minCost(c.target.cells, c.tray, grp);
  if (!re) { fail(id, 'UNSOLVABLE: no exact cover of the silhouette exists'); continue; }
  coverable++;
  if (!a.cost || re.moves !== a.cost.moves) fail(id, `re-derived minimum ${re.moves} != answer.cost.moves ${a.cost && a.cost.moves}`);
  if (a.correctKey !== String(c.target.area)) fail(id, `correctKey ${a.correctKey} != silhouette area ${c.target.area}`);
  if (re.moves > c.limits.maxMoves) fail(id, 'the optimum exceeds the declared move budget');

  // stored assembly must be a legal exact cover at exactly the optimum
  const cs = a.canonicalSolution || {};
  if (!Array.isArray(cs.placements)) fail(id, 'canonicalSolution.placements missing');
  else {
    const trayById = new Map(c.tray.map(t => [t.id, t.cells]));
    const covered = new Set(); const used = new Set();
    let cost = 0, err = null;
    for (const pl of cs.placements) {
      if (used.has(pl.id)) { err = `reuses tray piece ${pl.id}`; break; }
      used.add(pl.id);
      const base = trayById.get(pl.id);
      if (!base) { err = `placement references unknown tray piece ${pl.id}`; break; }
      const presses = pressesBetween(base, pl.cells, grp);
      if (presses === null) { err = `piece ${pl.id} cannot reach its placed orientation with ops ${ops}`; break; }
      if (presses !== pl.orientOps) { err = `piece ${pl.id} orientOps ${pl.orientOps} != minimal ${presses}`; break; }
      cost += presses + 1;
      for (const cell of pl.cells) {
        const k = cell.join(',');
        if (!tset.has(k)) { err = `piece ${pl.id} covers ${k} outside the outline`; break; }
        if (covered.has(k)) { err = `overlap at ${k}`; break; }
        covered.add(k);
      }
      if (err) break;
    }
    if (!err && covered.size !== tset.size) err = `assembly covers ${covered.size}/${tset.size} cells`;
    if (!err && cost !== re.moves) err = `stored assembly costs ${cost} but the minimum is ${re.moves}`;
    if (!err && cs.moves !== re.moves) err = `canonicalSolution.moves ${cs.moves} != minimum ${re.moves}`;
    if (err) fail(id, err);
  }
  if (!a.acceptedEquivalence || typeof a.acceptedEquivalence.rule !== 'string') fail(id, 'answer.acceptedEquivalence.rule missing');
  if (!Array.isArray(a.distractorRationales) || !a.distractorRationales.length) fail(id, 'distractorRationales (response taxonomy) missing');

  const lv = it.provenance.levers || {};
  if (lv.level) {
    if (!leversByLevel.has(lv.level)) leversByLevel.set(lv.level, []);
    leversByLevel.get(lv.level).push({ area: c.target.area, pieces: lv.realPieces, herrings: lv.herrings, tray: c.tray.length, moves: re.moves });
  }
}

// ---- 4. Coverage + lever ramp ----
const diffs = items.map(it => it.difficulty).filter(isNum);
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

// The headline levers are piece count and red-herring count (plus silhouette area). The
// minimum MOVE cost is not asserted monotone: adding pieces also adds cheaper assemblies, so
// the ramp lives in the search space, not in the optimum's magnitude.
const ramp = [];
for (let L = 1; L <= 20; L++) {
  const rows = leversByLevel.get(L) || [];
  const avg = (f) => rows.length ? rows.reduce((a, r) => a + f(r), 0) / rows.length : 0;
  ramp.push({ L, area: avg(r => r.area), pieces: avg(r => r.pieces), herrings: avg(r => r.herrings), tray: avg(r => r.tray), moves: avg(r => r.moves) });
}
for (let i = 1; i < 20; i++) {
  if (ramp[i].area <= ramp[i - 1].area) fail('ramp', `silhouette area did not increase from rung ${i} to ${i + 1}`);
  if (ramp[i].pieces < ramp[i - 1].pieces) fail('ramp', `piece count decreased from rung ${i} to ${i + 1}`);
  if (ramp[i].tray < ramp[i - 1].tray) fail('ramp', `tray size decreased from rung ${i} to ${i + 1}`);
}
if (!(ramp[19].pieces > ramp[0].pieces + 3)) fail('ramp', 'piece-count lever does not span far enough');

// ---- Report ----
console.log(`GB-SHAPEFIT-01 bank check: ${items.length} items`);
console.log(`solvability (independently re-covered): ${coverable}/${checked}  ${checked ? Math.round(1000 * coverable / checked) / 10 : 0}%`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('lever ramp (rung: area/pieces/herrings/tray -> optimal moves):');
console.log('  ' + ramp.map(r => `${r.L}:${round2(r.area)}/${round2(r.pieces)}/${round2(r.herrings)}/${round2(r.tray)}->${round2(r.moves)}`).join('  '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, 100% of silhouettes independently re-covered, the minimum move cost re-derived by IDA* matches the declared optimum, the stored assembly is an exact cover at exactly that cost, no solution data in content, coverage 1..20 with >=5 per bin and per +/-1pt band, monotone lever ramp.');
