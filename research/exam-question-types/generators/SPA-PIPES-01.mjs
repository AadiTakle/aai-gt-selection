#!/usr/bin/env node
// SPA-PIPES-01 - Path-Connect (pipe-rotation) structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-PIPES-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// This is an INTERACTIVE type (like SPA-MAZE-01), not multiple-choice. The child rotates
// pipe tiles a quarter-turn at a time to connect a road from the car (west edge) to the flag
// (east edge), passing through any gems. The deterministic "key" is the OPTIMAL number of
// quarter-turn rotations, COMPUTED from geometry - never guessed.
//
// Rigor of the key: the solution road is a THIN self-avoiding corridor (an induced path: no
// two non-consecutive corridor cells are 4-adjacent). Every corridor tile is a 2-arm pipe;
// every non-corridor tile is a <=2-arm-free DECOY (0 or 1 arm) that can never be an interior
// node of any road. Therefore the corridor is the UNIQUE connectable route, and the minimum
// rotations to connect = the sum over corridor tiles of the minimal quarter-turns from the
// tile's shuffled orientation to the orientation whose arms point along the corridor. An
// independent verifier reconstructs the corridor purely from the tile arm-counts + geometry
// and re-sums the minimum, so the animation the child sees and the scored key provably match.
// Because there are no enumerated options, answer.distractorRationales documents the RESPONSE
// taxonomy a deterministic scorer uses (optimal / detour / missed-gem / incomplete).
//
// Usage:
//   node generators/SPA-PIPES-01.mjs            # write bank
//   node generators/SPA-PIPES-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via grid
// size, corridor length / number of turns, and the number of gems that must lie on the road.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-PIPES-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'SPA-PIPES-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'SPA-PIPES-01@1';

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) + string hashing.
// ---------------------------------------------------------------------------
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seedStr) { return mulberry32(hashStr(seedStr)); }
function seededUuid(seedStr) {
  const b = new Uint8Array(16);
  let h = hashStr(seedStr);
  for (let i = 0; i < 16; i++) { h = (Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i * 0x9e3779b1) >>> 0; b[i] = h & 0xff; }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

// ---------------------------------------------------------------------------
// Pipe direction algebra (arms N/E/S/W). rotSet rotates an arm set clockwise.
// ---------------------------------------------------------------------------
const DIRS = ['N', 'E', 'S', 'W'];
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const CW = { N: 'E', E: 'S', S: 'W', W: 'N' };
function rotSet(set, k) { let s = set.slice(); const n = ((k % 4) + 4) % 4; for (let i = 0; i < n; i++) s = s.map(d => CW[d]); return canon(s); }
function canon(arr) { return [...new Set(arr)].sort((a, b) => DIRS.indexOf(a) - DIRS.indexOf(b)); }
function setEq(a, b) { a = canon(a); b = canon(b); if (a.length !== b.length) return false; return a.every((x, i) => x === b[i]); }
function minRot(initial, required) { for (let k = 0; k < 4; k++) if (setEq(rotSet(initial, k), required)) return k; return null; }
function neighbors4(r, c, R, C) { const out = []; if (r > 0) out.push([r - 1, c, 'N']); if (r < R - 1) out.push([r + 1, c, 'S']); if (c > 0) out.push([r, c - 1, 'W']); if (c < C - 1) out.push([r, c + 1, 'E']); return out; }
function dirTo(from, to) { if (to[0] < from[0]) return 'N'; if (to[0] > from[0]) return 'S'; if (to[1] < from[1]) return 'W'; return 'E'; }

// ---------------------------------------------------------------------------
// Thin self-avoiding corridor generator (induced path: a new cell may touch only its
// predecessor among path cells). Grows from the west edge until it reaches the east edge.
// ---------------------------------------------------------------------------
function genCorridor(R, C, rng) {
  const startRow = Math.floor(rng() * R);
  const start = [startRow, 0];
  const path = [start];
  const inPath = new Set([start[0] + ',' + start[1]]);
  const touchesOnlyPred = (nc, cur) => {
    for (const [nr, ncl] of neighbors4(nc[0], nc[1], R, C).map(x => [x[0], x[1]])) {
      if (nr === cur[0] && ncl === cur[1]) continue;
      if (inPath.has(nr + ',' + ncl)) return false;
    }
    return true;
  };
  let guard = 0;
  while (guard++ < 20000) {
    const cur = path[path.length - 1];
    if (cur[1] === C - 1 && path.length >= C) return { start, goal: cur, path };  // reached east edge
    let cand = neighbors4(cur[0], cur[1], R, C).map(x => [x[0], x[1]])
      .filter(nc => !inPath.has(nc[0] + ',' + nc[1]) && touchesOnlyPred(nc, cur));
    // Bias eastward for reachability, with seeded jitter for turns.
    cand.sort((a, b) => (C - 1 - a[1]) - (C - 1 - b[1]));
    if (rng() < 0.5) cand.reverse();
    if (rng() < 0.35 && cand.length > 1) { const i = 1 + Math.floor(rng() * (cand.length - 1)); [cand[0], cand[i]] = [cand[i], cand[0]]; }
    if (!cand.length) {                    // dead end -> backtrack
      if (path.length === 1) return null;
      const dead = path.pop(); inPath.delete(dead[0] + ',' + dead[1]); continue;
    }
    const nc = cand[0]; path.push(nc); inPath.add(nc[0] + ',' + nc[1]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
// ---------------------------------------------------------------------------
const PROFILES = {
  1: { R: 3, C: 4, gems: 0 }, 2: { R: 4, C: 4, gems: 0 }, 3: { R: 4, C: 5, gems: 0 }, 4: { R: 5, C: 5, gems: 0 },
  5: { R: 5, C: 6, gems: 1 }, 6: { R: 6, C: 6, gems: 1 }, 7: { R: 6, C: 7, gems: 1 }, 8: { R: 7, C: 7, gems: 1 },
  9: { R: 7, C: 8, gems: 2 }, 10: { R: 7, C: 8, gems: 2 }, 11: { R: 8, C: 8, gems: 2 }, 12: { R: 8, C: 9, gems: 2 },
  13: { R: 8, C: 9, gems: 2 }, 14: { R: 9, C: 9, gems: 3 }, 15: { R: 9, C: 9, gems: 3 }, 16: { R: 9, C: 10, gems: 3 },
  17: { R: 9, C: 10, gems: 3 }, 18: { R: 10, C: 10, gems: 3 }, 19: { R: 10, C: 10, gems: 3 }, 20: { R: 10, C: 11, gems: 3 },
};
const ITEMS_PER_LEVEL = 5;

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const RESPONSE_TAXONOMY = [
  { kind: 'connected_optimal', rationale: 'a continuous road connects the car to the flag through all gems using the minimum quarter-turns (correct)' },
  { kind: 'connected_detour', rationale: 'the road connects but used more quarter-turns than the optimal (inefficiency)' },
  { kind: 'connected_missed_gem', rationale: 'the road connects car to flag but bypasses a required gem' },
  { kind: 'incomplete', rationale: 'submitted before a continuous road connects the car to the flag' },
];

// Required (solved) arm set for each corridor tile, from the path geometry.
function requiredForPath(path) {
  return path.map((cell, i) => {
    const arms = [];
    arms.push(i === 0 ? 'W' : dirTo(cell, path[i - 1]));
    arms.push(i === path.length - 1 ? 'E' : dirTo(cell, path[i + 1]));
    return { r: cell[0], c: cell[1], dirs: canon(arms) };
  });
}

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildItem(L, idx) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const prof = PROFILES[L];
  const R = prof.R, C = prof.C;

  let corridor = null;
  for (let t = 0; t < 60 && !corridor; t++) corridor = genCorridor(R, C, rng);
  if (!corridor) { const row = Math.floor(rng() * R); corridor = { start: [row, 0], goal: [row, C - 1], path: Array.from({ length: C }, (_, c) => [row, c]) }; }
  const { start, goal, path } = corridor;

  const required = requiredForPath(path);
  const reqByCell = new Map(required.map(t => [t.r + ',' + t.c, t.dirs]));

  // gems on interior corridor cells (not start/goal).
  const interior = path.slice(1, -1);
  const gems = [];
  const gemPool = interior.slice();
  const nGems = Math.min(prof.gems, gemPool.length);
  for (let i = 0; i < nGems; i++) { const gi = Math.floor(rng() * gemPool.length); gems.push(gemPool.splice(gi, 1)[0]); }

  // Tiles: corridor cells get a 2-arm pipe scrambled off-solution; decoys get <=1 arm.
  const solutionOrients = [];
  let optimalRot = 0;
  const tiles = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const key = r + ',' + c;
    if (reqByCell.has(key)) {
      const req = reqByCell.get(key);
      let kRot = 1 + Math.floor(rng() * 3);
      for (let tr = 0; tr < 6 && setEq(rotSet(req, kRot), req); tr++) kRot = 1 + Math.floor(rng() * 3);
      if (setEq(rotSet(req, kRot), req)) kRot = 1;                 // 2-arm sets always change under a single turn
      const initial = rotSet(req, kRot);
      const k = minRot(initial, req); optimalRot += k;
      solutionOrients.push({ r, c, dirs: req });
      tiles.push({ r, c, dirs: initial });
    } else {
      // decoy: 0 or 1 arm (never an interior road node).
      const roll = rng();
      const dirs = roll < 0.45 ? [DIRS[Math.floor(rng() * 4)]] : (roll < 0.60 ? [DIRS[Math.floor(rng() * 4)]] : []);
      tiles.push({ r, c, dirs: canon(dirs) });
    }
  }

  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;
  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'connect_road',
      collectGems: gems.length > 0,
      prompt: gems.length
        ? `Rotate the pipes to connect the road from the car to the flag through all ${gems.length} gem${gems.length > 1 ? 's' : ''}, in as few turns as possible.`
        : 'Rotate the pipes to connect the road from the car to the flag in as few turns as possible.',
    },
    grid: { R, C },
    start, goal, gems,
    tiles,                       // every cell; corridor tiles have 2 arms, decoys have <=1
    optionKind: 'pipe_rotations',
    scaffold: { warmup: L <= 2 },
  };
  const answer = {
    correctKey: String(optimalRot),          // the optimal quarter-turn count (computed from geometry)
    optimalRot,
    solutionOrients,                          // one connecting configuration (independently checkable)
    relation: 'min_rotations_to_connect',
    distractorRationales: RESPONSE_TAXONOMY,
  };
  return {
    itemId: seededUuid(seed),
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsForLevel(L),
    content,
    answer,
    scoring: { mode: 'deterministic_key' },
    provenance: { generator: 'grammar', generatorRef: GENERATOR_REF, seed },
    syntheticOnly: true,
    validated: false,
  };
}

function generate() {
  const items = [];
  for (let L = 1; L <= 20; L++) for (let i = 0; i < ITEMS_PER_LEVEL; i++) items.push(buildItem(L, i));
  return items;
}

// ---------------------------------------------------------------------------
// Independent verification: reconstruct the corridor from arm-counts + geometry only,
// re-sum the minimum rotations, and confirm the stored solution connects at that cost.
// ---------------------------------------------------------------------------
function tileMap(content) { const m = new Map(); content.tiles.forEach(t => m.set(t.r + ',' + t.c, t.dirs)); return m; }

// Flood fill through matching arms for a given orientation map; returns connected(bool).
function connects(content, orientMap) {
  const { R, C } = content.grid, key = p => p[0] + ',' + p[1];
  const startArms = orientMap.get(key(content.start)) || [];
  if (!startArms.includes('W')) return false;
  const goalArms = orientMap.get(key(content.goal)) || [];
  if (!goalArms.includes('E')) return false;
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

// Reconstruct the corridor (>=2-arm tiles) as a simple path start->goal, geometry only.
function reconstructCorridor(content) {
  const { R, C } = content.grid;
  const tiles = tileMap(content);
  const corridor = new Set();
  content.tiles.forEach(t => { if (t.dirs.length >= 2) corridor.add(t.r + ',' + t.c); });
  const key = p => p[0] + ',' + p[1];
  if (!corridor.has(key(content.start)) || !corridor.has(key(content.goal))) return { error: 'start/goal not a 2-arm corridor tile' };
  const adj = c => neighbors4(c[0], c[1], R, C).map(x => [x[0], x[1]]).filter(n => corridor.has(n[0] + ',' + n[1]));
  // walk from start; each interior corridor cell must have degree 2, endpoints degree 1.
  const path = [content.start]; const seen = new Set([key(content.start)]);
  let cur = content.start, guard = 0;
  while (guard++ < 10000) {
    const nexts = adj(cur).filter(n => !seen.has(key(n)));
    if (key(cur) === key(content.goal)) break;
    if (nexts.length !== 1) return { error: `corridor not a simple path at ${key(cur)} (choices ${nexts.length})` };
    cur = nexts[0]; seen.add(key(cur)); path.push(cur);
  }
  if (key(path[path.length - 1]) !== key(content.goal)) return { error: 'corridor walk did not reach goal' };
  if (seen.size !== corridor.size) return { error: `stray corridor tiles off the start-goal path (${corridor.size - seen.size})` };
  return { path, tiles };
}

function independentOptimal(content) {
  const rc = reconstructCorridor(content);
  if (rc.error) return { error: rc.error };
  const req = requiredForPath(rc.path);
  let total = 0;
  for (const t of req) {
    const initial = rc.tiles.get(t.r + ',' + t.c);
    const k = minRot(initial, t.dirs);
    if (k === null) return { error: `tile ${t.r},${t.c} initial ${initial} cannot rotate to required ${t.dirs}` };
    total += k;
  }
  // gems must lie on the reconstructed corridor.
  const onPath = new Set(rc.path.map(p => p[0] + ',' + p[1]));
  for (const g of content.gems) if (!onPath.has(g[0] + ',' + g[1])) return { error: `gem ${g} off corridor` };
  return { optimalRot: total, path: rc.path };
}

function verify(items) {
  let ok = 0, bad = 0; const problems = [];
  const bands = {}; for (let L = 1; L <= 20; L++) bands[L] = 0;
  const seenIds = new Set();
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (seenIds.has(it.itemId)) problems.push(`${it.itemId}: duplicate itemId`); seenIds.add(it.itemId);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.difficulty < 1 || it.difficulty > 20) problems.push(`${it.itemId}: difficulty out of range`);
    if (it.scoring.mode !== 'deterministic_key') problems.push(`${it.itemId}: scoring mode wrong`);
    // content must NOT leak the optimum or the solution orientation.
    for (const leak of ['optimalRot', 'solutionOrients', 'answer']) if (leak in it.content) problems.push(`${it.itemId}: content leaks ${leak}`);
    // stored solution must actually connect and cost exactly optimalRot from the tiles' start orientation.
    const tiles = tileMap(it.content);
    const solMap = new Map(it.content.tiles.map(t => [t.r + ',' + t.c, t.dirs]));
    let solCost = 0, solBad = null;
    for (const so of it.answer.solutionOrients) {
      const init = tiles.get(so.r + ',' + so.c);
      const k = minRot(init, so.dirs); if (k === null) { solBad = `tile ${so.r},${so.c}`; break; }
      solCost += k; solMap.set(so.r + ',' + so.c, so.dirs);
    }
    if (solBad) problems.push(`${it.itemId}: stored solution un-rotatable at ${solBad}`);
    else {
      if (!connects(it.content, solMap)) problems.push(`${it.itemId}: stored solutionOrients does NOT connect car->flag`);
      if (solCost !== it.answer.optimalRot) problems.push(`${it.itemId}: stored solution cost ${solCost} != optimalRot ${it.answer.optimalRot}`);
    }
    // recompute the optimum independently (corridor reconstructed from geometry only).
    const re = independentOptimal(it.content);
    const recomputed = re.error ? `ERR(${re.error})` : String(re.optimalRot);
    if (recomputed === it.answer.correctKey && !solBad) ok++;
    else { bad++; problems.push(`${it.itemId}: key ${it.answer.correctKey} != recomputed ${recomputed} (${it.content.grid.R}x${it.content.grid.C})`); }
    for (let L = 1; L <= 20; L++) if (it.difficulty >= L - 1 && it.difficulty <= L + 1) bands[L]++;
  }
  return { ok, bad, problems, bands };
}

function coverageReport(bands) {
  const lines = []; let minBand = Infinity;
  for (let L = 1; L <= 20; L++) { lines.push(`  band ${String(L).padStart(2)} (+/-1pt): ${bands[L]}`); minBand = Math.min(minBand, bands[L]); }
  return { text: lines.join('\n'), minBand };
}

function main() {
  const doVerify = process.argv.includes('--verify');
  const items = generate();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, items.map(it => JSON.stringify(it)).join('\n') + '\n');
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);
  const byGems = {}; for (const it of items) { const g = it.content.gems.length; byGems[g] = (byGems[g] || 0) + 1; }
  console.log(`[${TYPE_CODE}] gems:`, JSON.stringify(byGems));
  const rots = items.map(it => it.answer.optimalRot);
  console.log(`[${TYPE_CODE}] optimalRot: min ${Math.min(...rots)}, max ${Math.max(...rots)}`);

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (corridor re-solve + connect validation): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${cov.minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: optimal keys re-solved from geometry + connect-validated, coverage satisfied, born-synthetic.`);
}

main();
