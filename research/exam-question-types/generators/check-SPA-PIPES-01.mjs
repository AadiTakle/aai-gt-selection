// Independent validator for the SPA-PIPES-01 structured bank.
//
// This checker does NOT import the generator. It re-derives each item's key purely from the
// served geometry: it reconstructs the connectable corridor as the graph of >=2-arm tiles
// (decoys carry <=1 arm and can never be an interior road node), walks it start->goal as a
// simple path, and re-sums the minimum quarter-turns needed to point each corridor tile's
// arms along the path. That recomputed optimum must equal the declared correctKey, and the
// stored solutionOrients must actually connect the road at exactly that cost.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Born-synthetic + server/renderable split: content carries NO optimum / solution.
//   3. Key is COMPUTED: corridor re-solved from geometry equals correctKey; stored solution
//      connects car->flag through gems at exactly optimalRot; decoys are all <=1 arm.
//   4. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-SPA-PIPES-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/SPA-PIPES-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- pipe algebra (fresh reimplementation) ----
const DIRS = ['N', 'E', 'S', 'W'];
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const CW = { N: 'E', E: 'S', S: 'W', W: 'N' };
const canon = (arr) => [...new Set(arr)].sort((a, b) => DIRS.indexOf(a) - DIRS.indexOf(b));
function rotSet(set, k) { let s = set.slice(); const n = ((k % 4) + 4) % 4; for (let i = 0; i < n; i++) s = s.map(d => CW[d]); return canon(s); }
function setEq(a, b) { a = canon(a); b = canon(b); return a.length === b.length && a.every((x, i) => x === b[i]); }
function minRot(initial, required) { for (let k = 0; k < 4; k++) if (setEq(rotSet(initial, k), required)) return k; return null; }
function neighbors4(r, c, R, C) { const o = []; if (r > 0) o.push([r - 1, c, 'N']); if (r < R - 1) o.push([r + 1, c, 'S']); if (c > 0) o.push([r, c - 1, 'W']); if (c < C - 1) o.push([r, c + 1, 'E']); return o; }
function dirTo(from, to) { if (to[0] < from[0]) return 'N'; if (to[0] > from[0]) return 'S'; if (to[1] < from[1]) return 'W'; return 'E'; }
const key = (p) => p[0] + ',' + p[1];

function tileMap(content) { const m = new Map(); content.tiles.forEach(t => m.set(t.r + ',' + t.c, canon(t.dirs))); return m; }
function requiredForPath(path) {
  return path.map((cell, i) => ({ r: cell[0], c: cell[1], dirs: canon([i === 0 ? 'W' : dirTo(cell, path[i - 1]), i === path.length - 1 ? 'E' : dirTo(cell, path[i + 1])]) }));
}
function reconstructCorridor(content) {
  const { R, C } = content.grid;
  const corridor = new Set();
  content.tiles.forEach(t => { if (canon(t.dirs).length >= 2) corridor.add(t.r + ',' + t.c); });
  if (!corridor.has(key(content.start)) || !corridor.has(key(content.goal))) return { error: 'start/goal is not a 2-arm corridor tile' };
  const adj = (c) => neighbors4(c[0], c[1], R, C).map(x => [x[0], x[1]]).filter(n => corridor.has(key(n)));
  const path = [content.start]; const seen = new Set([key(content.start)]); let cur = content.start, guard = 0;
  while (guard++ < 20000) {
    if (key(cur) === key(content.goal)) break;
    const nexts = adj(cur).filter(n => !seen.has(key(n)));
    if (nexts.length !== 1) return { error: `corridor not a simple path at ${key(cur)} (choices ${nexts.length})` };
    cur = nexts[0]; seen.add(key(cur)); path.push(cur);
  }
  if (key(path[path.length - 1]) !== key(content.goal)) return { error: 'corridor walk did not reach goal' };
  if (seen.size !== corridor.size) return { error: `stray 2-arm tiles off the corridor (${corridor.size - seen.size})` };
  return { path };
}
function connects(content, orientMap) {
  const { R, C } = content.grid;
  if (!(orientMap.get(key(content.start)) || []).includes('W')) return false;
  if (!(orientMap.get(key(content.goal)) || []).includes('E')) return false;
  const seen = new Set([key(content.start)]), q = [content.start]; let qi = 0;
  while (qi < q.length) {
    const cell = q[qi++]; const arms = orientMap.get(key(cell)) || [];
    for (const [nr, nc, dir] of neighbors4(cell[0], cell[1], R, C)) {
      const narms = orientMap.get(nr + ',' + nc) || [];
      if (arms.includes(dir) && narms.includes(OPP[dir]) && !seen.has(nr + ',' + nc)) { seen.add(nr + ',' + nc); q.push([nr, nc]); }
    }
  }
  return seen.has(key(content.goal));
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} not valid JSON: ${e.message}`); } });

// ---- 2 + 3. Per-item structural + independent key recompute ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId'); seenIds.add(it.itemId);
  if (it.typeCode !== 'SPA-PIPES-01') fail(id, `typeCode != SPA-PIPES-01 (${it.typeCode})`);
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
  for (const leak of ['optimalRot', 'solutionOrients', 'answer']) if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks "${leak}"`);
  if (!c.grid || !isNum(c.grid.R) || !isNum(c.grid.C)) fail(id, 'grid missing');
  if (!Array.isArray(c.tiles) || c.tiles.length !== (c.grid.R * c.grid.C)) fail(id, `tiles count != R*C (${c.tiles && c.tiles.length})`);
  if (!Array.isArray(c.start) || !Array.isArray(c.goal)) fail(id, 'start/goal missing');
  // decoys must carry <=1 arm (guarantees the corridor is the unique connectable route).
  const req = requiredForPath; // used below
  const ans = it.answer || {};

  const rc = reconstructCorridor(c);
  if (rc.error) { fail(id, `corridor: ${rc.error}`); continue; }
  const onPath = new Set(rc.path.map(key));
  for (const t of c.tiles) { const n = canon(t.dirs).length; if (!onPath.has(t.r + ',' + t.c) && n >= 2) fail(id, `decoy at ${t.r},${t.c} has ${n} arms (must be <=1)`); }

  const tiles = tileMap(c);
  const need = req(rc.path);
  let total = 0, unrot = null;
  for (const t of need) { const k = minRot(tiles.get(t.r + ',' + t.c), t.dirs); if (k === null) { unrot = `${t.r},${t.c}`; break; } total += k; }
  if (unrot) { fail(id, `corridor tile ${unrot} cannot rotate to its required orientation`); continue; }
  if (String(total) !== ans.correctKey) fail(id, `recomputed optimum ${total} != correctKey ${ans.correctKey}`);
  if (total !== ans.optimalRot) fail(id, `recomputed optimum ${total} != answer.optimalRot ${ans.optimalRot}`);

  // stored solution must connect at exactly optimalRot from the served start orientation.
  if (Array.isArray(ans.solutionOrients)) {
    const solMap = new Map(c.tiles.map(t => [t.r + ',' + t.c, canon(t.dirs)]));
    let solCost = 0, solBad = null;
    for (const so of ans.solutionOrients) { const k = minRot(tiles.get(so.r + ',' + so.c), so.dirs); if (k === null) { solBad = `${so.r},${so.c}`; break; } solCost += k; solMap.set(so.r + ',' + so.c, canon(so.dirs)); }
    if (solBad) fail(id, `stored solution un-rotatable at ${solBad}`);
    else { if (!connects(c, solMap)) fail(id, 'stored solutionOrients does NOT connect car->flag'); if (solCost !== ans.optimalRot) fail(id, `stored solution cost ${solCost} != optimalRot ${ans.optimalRot}`); }
  } else fail(id, 'answer.solutionOrients missing');

  for (const g of (c.gems || [])) if (!onPath.has(g[0] + ',' + g[1])) fail(id, `gem ${g} not on corridor`);
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
console.log(`SPA-PIPES-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, corridor re-solved from geometry equals the declared optimum, solution connects at optimum, coverage 1..20 with >=5 per bin and per +/-1pt band.');
