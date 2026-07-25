// Independent validator for the GB-PATHFORGE-01 structured bank.
//
// This checker does NOT import the generator. It re-derives every key from the served
// level geometry alone:
//   * its own BFS over the state graph (cell x coins-collected bitmask) recomputes the
//     minimum road length, i.e. SOLVABILITY and the optimum, from `content` only;
//   * the stored optimalPath is then validated as a legal, SIMPLE, coin-covering walk of
//     exactly that length (a witness that the lower bound is attainable);
//   * the stored tileSpec is rebuilt into a board and flood-filled through matching pipe
//     arms, so the road provably joins hut -> flag over every coin.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Born-synthetic + server/renderable split: content carries NO optimum / solution,
//      and the tile budget never equals the optimum (which would state the key).
//   3. Key is COMPUTED: independent BFS optimum == correctKey; 100% of levels solvable;
//      the stored witness is simple, legal and connects at exactly that cost.
//   4. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-GB-PATHFORGE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-PATHFORGE-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- grid + pipe algebra (fresh reimplementation) ----
const DIRS = ['N', 'E', 'S', 'W'];
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const canon = (a) => [...new Set(a)].sort((x, y) => DIRS.indexOf(x) - DIRS.indexOf(y));
const key = (p) => p[0] + ',' + p[1];
function dirTo(from, to) { if (to[0] < from[0]) return 'N'; if (to[0] > from[0]) return 'S'; if (to[1] < from[1]) return 'W'; return 'E'; }
function shapeOf(dirs) {
  const d = canon(dirs);
  if (d.length === 2) return OPP[d[0]] === d[1] ? 'straight' : 'curve';
  if (d.length === 3) return 'tee';
  return 'other';
}
function neighbourCells(r, c, R, C) {
  const o = [];
  if (r > 0) o.push([r - 1, c, 'N']);
  if (r < R - 1) o.push([r + 1, c, 'S']);
  if (c > 0) o.push([r, c - 1, 'W']);
  if (c < C - 1) o.push([r, c + 1, 'E']);
  return o;
}

// Independent minimum-road solver: BFS over (cell, coin-mask). Returns min courier steps
// (tiles = steps - 1) or null when the level is UNSOLVABLE.
function minRoadSteps(content) {
  const { R, C } = content.grid;
  const idx = (r, c) => r * C + c;
  const nCells = R * C;
  const coins = content.coins || [];
  const nMask = 1 << coins.length;
  const bitAt = new Map();
  coins.forEach((p, i) => bitAt.set(idx(p[0], p[1]), 1 << i));
  const blocked = new Set((content.blocked || []).map((b) => idx(b[0], b[1])));
  const startCell = idx(content.start[0], content.start[1]);
  const goalCell = idx(content.goal[0], content.goal[1]);
  if (blocked.has(startCell) || blocked.has(goalCell)) return null;
  const dist = new Int32Array(nCells * nMask).fill(-1);
  const sid = (cell, mask) => cell * nMask + mask;
  const s0 = sid(startCell, bitAt.get(startCell) || 0);
  dist[s0] = 0;
  const q = [s0];
  for (let qi = 0; qi < q.length; qi++) {
    const s = q[qi], cell = (s / nMask) | 0, mask = s % nMask;
    const r = (cell / C) | 0, c = cell % C;
    for (const [nr, nc] of neighbourCells(r, c, R, C)) {
      const nb = idx(nr, nc);
      if (blocked.has(nb)) continue;
      const ns = sid(nb, mask | (bitAt.get(nb) || 0));
      if (dist[ns] < 0) { dist[ns] = dist[s] + 1; q.push(ns); }
    }
  }
  const goalState = sid(goalCell, nMask - 1);
  return dist[goalState] < 0 ? null : dist[goalState];
}

// Rebuild the board from the stored tileSpec and flood the road through matching arms.
// Hut and flag are omnidirectional ports: they join any adjacent tile whose arm points at them.
function roadConnects(content, tileSpec) {
  const { R, C } = content.grid;
  const arms = new Map(tileSpec.map((t) => [t.r + ',' + t.c, canon(t.dirs)]));
  const startK = key(content.start), goalK = key(content.goal);
  const seen = new Set([startK]);
  const q = [content.start];
  for (let qi = 0; qi < q.length; qi++) {
    const [r, c] = q[qi];
    const here = arms.get(r + ',' + c);
    for (const [nr, nc, dir] of neighbourCells(r, c, R, C)) {
      const nk = nr + ',' + nc;
      if (seen.has(nk)) continue;
      const there = arms.get(nk);
      const outOk = (r + ',' + c) === startK || (r + ',' + c) === goalK ? true : !!here && here.includes(dir);
      if (!outOk) continue;
      const inOk = nk === startK || nk === goalK ? true : !!there && there.includes(OPP[dir]);
      if (!inOk) continue;
      seen.add(nk); q.push([nr, nc]);
    }
  }
  return { reachesGoal: seen.has(goalK), road: seen };
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} not valid JSON: ${e.message}`); } });

// ---- 2 + 3. Per-item structure + independent re-derivation ----
const seenIds = new Set();
let solvable = 0;
for (const it of items) {
  const id = it.itemId || '(no id)';
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'GB-PATHFORGE-01') fail(id, `typeCode != GB-PATHFORGE-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.demoPath !== 'demos/GB-PATHFORGE-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  const ans = it.answer || {};
  for (const leak of ['optimalTiles', 'optimalPath', 'optimalSteps', 'tileSpec', 'shapeCounts', 'answer', 'solution'])
    if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks "${leak}"`);
  if (!c.grid || !isNum(c.grid.R) || !isNum(c.grid.C)) { fail(id, 'grid missing'); continue; }
  if (!Array.isArray(c.start) || !Array.isArray(c.goal)) { fail(id, 'start/goal missing'); continue; }
  if (!Array.isArray(c.tray) || c.tray.length === 0) fail(id, 'tray missing');
  if (!isNum(c.tileBudget)) fail(id, 'tileBudget missing');
  if (!c.metricParams || !isNum(c.metricParams.planWindowMs)) fail(id, 'metricParams.planWindowMs missing');

  // 3a. SOLVABILITY + optimum, re-derived from content by our own BFS.
  const steps = minRoadSteps(c);
  if (steps === null) { fail(id, 'level is UNSOLVABLE (no hut->flag road visiting all coins)'); continue; }
  solvable++;
  const optimal = steps - 1;
  if (String(optimal) !== ans.correctKey) fail(id, `recomputed optimum ${optimal} != correctKey ${ans.correctKey}`);
  if (optimal !== ans.optimalTiles) fail(id, `recomputed optimum ${optimal} != answer.optimalTiles ${ans.optimalTiles}`);
  if (!(c.tileBudget > optimal)) fail(id, `tileBudget ${c.tileBudget} does not exceed optimum ${optimal} (budget would state the key)`);

  // 3b. Stored witness: legal, simple, coin-covering, exactly optimal.
  const path = ans.optimalPath;
  if (!Array.isArray(path) || path.length !== steps + 1) { fail(id, `optimalPath length ${path && path.length} != ${steps + 1}`); continue; }
  const blockedSet = new Set((c.blocked || []).map(key));
  const cellsSeen = new Set();
  let pathErr = null;
  if (key(path[0]) !== key(c.start)) pathErr = 'does not start at the hut';
  if (key(path[path.length - 1]) !== key(c.goal)) pathErr = 'does not end at the flag';
  for (let i = 0; i < path.length && !pathErr; i++) {
    const p = path[i];
    if (p[0] < 0 || p[0] >= c.grid.R || p[1] < 0 || p[1] >= c.grid.C) pathErr = `cell ${i} off the board`;
    else if (blockedSet.has(key(p))) pathErr = `cell ${i} is blocked`;
    else if (cellsSeen.has(key(p))) pathErr = `cell ${i} repeats (path not simple)`;
    else cellsSeen.add(key(p));
    if (i > 0 && !pathErr && Math.abs(p[0] - path[i - 1][0]) + Math.abs(p[1] - path[i - 1][1]) !== 1) pathErr = `step ${i} not 4-adjacent`;
  }
  for (const g of (c.coins || [])) if (!pathErr && !cellsSeen.has(key(g))) pathErr = `coin ${g} not on the road`;
  if (pathErr) { fail(id, `stored optimalPath invalid - ${pathErr}`); continue; }

  // 3c. tileSpec must match the witness geometry, sit in the tray, and actually connect.
  const spec = ans.tileSpec || [];
  if (spec.length !== optimal) fail(id, `tileSpec has ${spec.length} tiles != optimum ${optimal}`);
  const specByCell = new Map(spec.map((t) => [t.r + ',' + t.c, t]));
  for (let i = 1; i < path.length - 1; i++) {
    const t = specByCell.get(key(path[i]));
    if (!t) { fail(id, `tileSpec missing a tile at ${key(path[i])}`); continue; }
    const want = canon([dirTo(path[i], path[i - 1]), dirTo(path[i], path[i + 1])]);
    if (canon(t.dirs).join('') !== want.join('')) fail(id, `tile at ${key(path[i])} arms ${canon(t.dirs)} != geometry ${want}`);
    if (t.shape !== shapeOf(want)) fail(id, `tile at ${key(path[i])} shape ${t.shape} != derived ${shapeOf(want)}`);
    if (!c.tray.includes(t.shape)) fail(id, `tile shape ${t.shape} is not in the served tray`);
    if (blockedSet.has(key(path[i]))) fail(id, `tile placed on a blocked cell ${key(path[i])}`);
  }
  const flood = roadConnects(c, spec);
  if (!flood.reachesGoal) fail(id, 'stored tileSpec does NOT join the hut to the flag');
  for (const g of (c.coins || [])) if (!flood.road.has(key(g))) fail(id, `coin ${g} is not on the flooded road`);

  // 3d. answer metadata used by the server-side scorer.
  if (!ans.equivalence || ans.equivalence.rule !== 'any_minimal_road') fail(id, 'answer.equivalence (accepted-equivalence rule) missing');
  if (!ans.metricSpec || !ans.metricSpec['M-EFF']) fail(id, 'answer.metricSpec missing M-EFF derivation');
  if (!Array.isArray(ans.distractorRationales) || ans.distractorRationales.length === 0) fail(id, 'response taxonomy missing');
}

// ---- 4. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (floor not reached)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ceiling not reached)`);
const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

// ---- Report ----
console.log(`GB-PATHFORGE-01 bank check: ${items.length} items`);
console.log(`solvability (independent BFS over cell x coin-mask): ${solvable}/${items.length} = ${items.length ? round2(100 * solvable / items.length) : 0}%`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, 100% of levels solvable, optimum re-derived by independent BFS equals the declared key, simple-path witness connects hut->flag over every coin, coverage 1..20 with >=5 per bin and per +/-1pt band.');
