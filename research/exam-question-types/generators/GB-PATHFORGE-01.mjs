#!/usr/bin/env node
// GB-PATHFORGE-01 - Path Forge structured bank generator (grammar, game-based delivery).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/GB-PATHFORGE-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// GAME-BASED / INTERACTIVE. Per PS_GAMEBASED_WARRANT.md the game is a DELIVERY layer over
// the `spatial` construct area, never an area of its own. Each bank item is one LEVEL: a
// board with a start hut, a goal flag, blocked cells, coins that must be picked up, a tray
// of road-tile shapes and a tile budget. The child places and rotates tiles to forge one
// continuous road; the courier then walks whatever road exists. The valuable signal is the
// PROCESS (placement order, rotations, removals, tiles used vs the minimum).
//
// The key is COMPUTED, never guessed:
//   * min road length = BFS over the state graph (cell x coins-collected bitmask);
//   * a concrete OPTIMAL SIMPLE PATH is recovered by DFS restricted to the optimal
//     sub-graph (states where distFromStart + distToGoal == total), so the stored witness
//     provably achieves the independently computed lower bound with no repeated cell;
//   * per-cell tile shapes/orientations are derived from that path's geometry.
// Levels whose optimum cannot be realised by a SIMPLE path are rejected and reseeded, so
// every emitted level is provably solvable with exactly `optimalTiles` tiles.
//
// scoring.mode = 'computed_solver': the server replays the submitted action log against the
// level (final board -> connectivity flood fill -> coins on the walked road -> tiles used)
// instead of matching one key. `answer.equivalence` credits ANY minimal-length road, so
// alternate optimal layouts score as optimal.
//
// Usage:
//   node generators/GB-PATHFORGE-01.mjs            # write bank
//   node generators/GB-PATHFORGE-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// board size, obstacle density (branching factor), solution depth, the number of coins that
// must be sequenced (interacting constraints), how far the optimum detours away from the
// straight-line greedy route, and how tight the tile budget is.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/GB-PATHFORGE-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'GB-PATHFORGE-01';
const DOMAIN = 'spatial';
const DEMO_PATH = 'demos/GB-PATHFORGE-01.html';
const GENERATOR_REF = 'GB-PATHFORGE-01@1';

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
// Grid + road-tile algebra.
// ---------------------------------------------------------------------------
const DIRS = ['N', 'E', 'S', 'W'];
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const canon = (arr) => [...new Set(arr)].sort((a, b) => DIRS.indexOf(a) - DIRS.indexOf(b));
function dirTo(from, to) { if (to[0] < from[0]) return 'N'; if (to[0] > from[0]) return 'S'; if (to[1] < from[1]) return 'W'; return 'E'; }
function shapeOf(dirs) {
  const d = canon(dirs);
  if (d.length === 2) return OPP[d[0]] === d[1] ? 'straight' : 'curve';
  if (d.length === 3) return 'tee';
  return 'other';
}

// ---------------------------------------------------------------------------
// Solver. min road = BFS over (cell, coin-mask); a SIMPLE optimal path is recovered by
// DFS through the optimal sub-graph. Returns null when the goal is unreachable, or
// {total, path:null} when no simple realisation of the optimum exists.
// ---------------------------------------------------------------------------
function solveOptimal(R, C, blocked, start, goal, coins) {
  const idx = (r, c) => r * C + c;
  const nCells = R * C;
  const nMask = 1 << coins.length;
  const FULL = nMask - 1;
  const coinBit = new Map();
  coins.forEach((p, i) => coinBit.set(idx(p[0], p[1]), 1 << i));
  const isBlocked = new Uint8Array(nCells);
  for (const b of blocked) isBlocked[idx(b[0], b[1])] = 1;
  const nbrs = (cell) => {
    const r = (cell / C) | 0, c = cell % C, out = [];
    if (r > 0) out.push(cell - C);
    if (r < R - 1) out.push(cell + C);
    if (c > 0) out.push(cell - 1);
    if (c < C - 1) out.push(cell + 1);
    return out.filter(x => !isBlocked[x]);
  };
  const sid = (cell, mask) => cell * nMask + mask;
  const startCell = idx(start[0], start[1]), goalCell = idx(goal[0], goal[1]);
  if (isBlocked[startCell] || isBlocked[goalCell]) return null;

  const N = nCells * nMask;
  const distF = new Int32Array(N).fill(-1);
  const s0 = sid(startCell, coinBit.get(startCell) || 0);
  distF[s0] = 0;
  const q = [s0];
  for (let qi = 0; qi < q.length; qi++) {
    const s = q[qi], cell = (s / nMask) | 0, mask = s % nMask;
    for (const nb of nbrs(cell)) {
      const ns = sid(nb, mask | (coinBit.get(nb) || 0));
      if (distF[ns] < 0) { distF[ns] = distF[s] + 1; q.push(ns); }
    }
  }
  const goalState = sid(goalCell, FULL);
  if (distF[goalState] < 0) return null;
  const total = distF[goalState];

  // Reverse BFS: distB[s] = min forward steps from s to (goal, all coins).
  const distB = new Int32Array(N).fill(-1);
  distB[goalState] = 0;
  const q2 = [goalState];
  for (let qi = 0; qi < q2.length; qi++) {
    const s = q2[qi], cell = (s / nMask) | 0, mask = s % nMask;
    const bit = coinBit.get(cell) || 0;
    const preMasks = (bit && (mask & bit)) ? [mask, mask ^ bit] : [mask];
    for (const u of nbrs(cell)) for (const pm of preMasks) {
      const ps = sid(u, pm);
      if (distB[ps] < 0) { distB[ps] = distB[s] + 1; q2.push(ps); }
    }
  }

  // DFS the optimal sub-graph for a path with no repeated cell.
  const stack = [], used = new Set();
  let budget = 400000, found = null;
  const dfs = (s) => {
    if (found || budget-- <= 0) return;
    const cell = (s / nMask) | 0;
    stack.push(cell); used.add(cell);
    if (s === goalState) found = stack.slice();
    else {
      const mask = s % nMask;
      for (const nb of nbrs(cell)) {
        if (used.has(nb)) continue;
        const ns = sid(nb, mask | (coinBit.get(nb) || 0));
        if (distF[ns] === distF[s] + 1 && distB[ns] >= 0 && distF[ns] + distB[ns] === total) dfs(ns);
        if (found) break;
      }
    }
    stack.pop(); used.delete(cell);
  };
  dfs(s0);
  if (!found) return { total, path: null };
  return { total, path: found.map(cell => [(cell / C) | 0, cell % C]) };
}

// Per-cell tile requirement derived from the path geometry (interior cells only).
function tilesForPath(path) {
  const out = [];
  for (let i = 1; i < path.length - 1; i++) {
    const dirs = canon([dirTo(path[i], path[i - 1]), dirTo(path[i], path[i + 1])]);
    out.push({ r: path[i][0], c: path[i][1], shape: shapeOf(dirs), dirs });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
//   block  = obstacle density (branching factor / misleading corridors)
//   coins  = interacting pickup constraints (ordering load)
//   slack  = tileBudget - optimalTiles (waste allowed; 1 at the top = near-perfect play)
//   steps  = minimum solution depth
//   detour = required optimalSteps / manhattan(start,goal) (how wrong the greedy line is)
// ---------------------------------------------------------------------------
const PROFILES = {
  1: { R: 4, C: 4, block: 0.00, coins: 0, slack: 5, steps: 3, detour: 1.00 },
  2: { R: 4, C: 5, block: 0.05, coins: 0, slack: 5, steps: 4, detour: 1.00 },
  3: { R: 5, C: 5, block: 0.08, coins: 0, slack: 4, steps: 5, detour: 1.00 },
  4: { R: 5, C: 6, block: 0.10, coins: 0, slack: 4, steps: 6, detour: 1.05 },
  5: { R: 6, C: 6, block: 0.12, coins: 1, slack: 4, steps: 7, detour: 1.05 },
  6: { R: 6, C: 6, block: 0.14, coins: 1, slack: 3, steps: 8, detour: 1.10 },
  7: { R: 6, C: 7, block: 0.16, coins: 1, slack: 3, steps: 9, detour: 1.10 },
  8: { R: 7, C: 7, block: 0.18, coins: 1, slack: 3, steps: 10, detour: 1.15 },
  9: { R: 7, C: 7, block: 0.18, coins: 2, slack: 3, steps: 11, detour: 1.15 },
  10: { R: 7, C: 8, block: 0.20, coins: 2, slack: 3, steps: 12, detour: 1.20 },
  11: { R: 8, C: 8, block: 0.20, coins: 2, slack: 2, steps: 13, detour: 1.20 },
  12: { R: 8, C: 8, block: 0.22, coins: 2, slack: 2, steps: 14, detour: 1.25 },
  13: { R: 8, C: 9, block: 0.22, coins: 2, slack: 2, steps: 15, detour: 1.25 },
  14: { R: 9, C: 9, block: 0.24, coins: 3, slack: 2, steps: 16, detour: 1.30 },
  15: { R: 9, C: 9, block: 0.24, coins: 3, slack: 2, steps: 17, detour: 1.30 },
  16: { R: 9, C: 10, block: 0.25, coins: 3, slack: 1, steps: 18, detour: 1.35 },
  17: { R: 10, C: 10, block: 0.26, coins: 3, slack: 1, steps: 19, detour: 1.35 },
  18: { R: 10, C: 10, block: 0.27, coins: 3, slack: 1, steps: 21, detour: 1.40 },
  19: { R: 10, C: 11, block: 0.28, coins: 3, slack: 1, steps: 23, detour: 1.45 },
  20: { R: 11, C: 11, block: 0.28, coins: 3, slack: 1, steps: 25, detour: 1.50 },
};
const ITEMS_PER_LEVEL = 6;

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const RESPONSE_TAXONOMY = [
  { kind: 'connected_optimal', rationale: 'the final board joins hut to flag through every coin using exactly the minimum number of tiles (correct)' },
  { kind: 'connected_extra_tiles', rationale: 'a continuous road exists but uses more tiles than the minimum (planning inefficiency)' },
  { kind: 'connected_missed_coin', rationale: 'the road joins hut to flag but the walked route skips a required coin' },
  { kind: 'disconnected', rationale: 'submitted with no continuous road from hut to flag (tiles placed but not joined, or a mis-rotated tile)' },
  { kind: 'over_budget', rationale: 'more tiles placed than the level budget allows' },
  { kind: 'invalid_placement', rationale: 'a tile was submitted on a blocked cell, the hut or the flag (illegal board state)' },
];

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

function buildLevel(prof, rng, relax) {
  const R = prof.R, C = prof.C;
  const minSteps = Math.max(3, Math.round(prof.steps * (relax >= 2 ? 0.75 : 1)));
  const needDetour = prof.detour * (relax >= 1 ? 0.85 : 1);

  // Start on the west side, goal on the east side, so the board is worth crossing.
  const start = [Math.floor(rng() * R), Math.floor(rng() * Math.max(1, Math.ceil(C / 3)))];
  const goal = [Math.floor(rng() * R), C - 1 - Math.floor(rng() * Math.max(1, Math.ceil(C / 3)))];
  if (start[0] === goal[0] && start[1] === goal[1]) return null;

  const free = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) continue;
    free.push([r, c]);
  }
  const pool = free.slice();
  const blocked = [];
  const nBlock = Math.floor(pool.length * prof.block);
  for (let i = 0; i < nBlock && pool.length; i++) blocked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const coins = [];
  for (let i = 0; i < prof.coins && pool.length; i++) coins.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);

  const sol = solveOptimal(R, C, blocked, start, goal, coins);
  if (!sol || !sol.path) return null;
  if (sol.total < minSteps) return null;
  const manhattan = Math.abs(start[0] - goal[0]) + Math.abs(start[1] - goal[1]);
  const detour = sol.total / Math.max(1, manhattan);
  if (detour < needDetour) return null;
  const optimalTiles = sol.total - 1;
  if (optimalTiles < 1) return null;
  return { R, C, start, goal, blocked, coins, sol, manhattan, detour, optimalTiles };
}

function buildItem(L, idx) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const prof = PROFILES[L];

  let lv = null;
  for (let attempt = 0; attempt < 900 && !lv; attempt++) {
    const relax = attempt < 500 ? 0 : (attempt < 750 ? 1 : 2);
    lv = buildLevel(prof, rng, relax);
  }
  if (!lv) {
    // Deterministic fallback: an open board (always solvable, no obstacles, no coins).
    const R = prof.R, C = prof.C;
    const start = [0, 0], goal = [R - 1, C - 1];
    const sol = solveOptimal(R, C, [], start, goal, []);
    lv = { R, C, start, goal, blocked: [], coins: [], sol, manhattan: (R - 1) + (C - 1), detour: 1, optimalTiles: sol.total - 1 };
  }

  const { R, C, start, goal, blocked, coins, sol, optimalTiles, detour } = lv;
  const tileSpec = tilesForPath(sol.path);
  const shapeCounts = tileSpec.reduce((a, t) => (a[t.shape] = (a[t.shape] || 0) + 1, a), {});
  const trayShapes = L <= 3 ? ['straight', 'curve'] : ['straight', 'curve', 'tee'];
  const tileBudget = optimalTiles + prof.slack;

  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;

  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'forge_road',
      prompt: coins.length
        ? `Place and turn road tiles to join the hut to the flag, going over all ${coins.length} coin${coins.length > 1 ? 's' : ''}. Use as few tiles as you can, then press GO.`
        : 'Place and turn road tiles to join the hut to the flag. Use as few tiles as you can, then press GO.',
      unit: 'tiles',
    },
    grid: { R, C },
    start,
    goal,
    blocked: blocked.map(b => b.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    coins: coins.map(g => g.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    tray: trayShapes,               // unlimited pieces per shape; the BUDGET is the constraint
    tileBudget,                     // > optimalTiles by design, so it never states the optimum
    optionKind: 'tile_placements',
    metricParams: { planWindowMs: 4000 },
    scaffold: { warmup: L <= 2 },
  };
  const answer = {
    correctKey: String(optimalTiles),        // minimum tiles, computed by BFS over (cell, coin-mask)
    optimalTiles,
    optimalSteps: sol.total,
    optimalPath: sol.path,
    tileSpec,                                 // one connecting configuration (independently checkable)
    shapeCounts,
    detourRatio: Math.round(detour * 100) / 100,
    budgetSlack: prof.slack,
    relation: 'min_tiles_connecting_road_bfs_coinmask',
    equivalence: {
      rule: 'any_minimal_road',
      detail: 'ANY final board whose continuous hut->flag road walks over every coin and uses exactly optimalTiles tiles is scored optimal; the stored optimalPath is one witness, not the only accepted layout. Tile orientation is judged by connectivity, not by matching tileSpec.',
    },
    metricSpec: {
      'M-PATH': 'count of primitive actions in response.actions (place/rotate/remove/go) = strategy-signature length',
      'M-EFF': 'optimalTiles / max(response.cost.actual, optimalTiles), where cost.actual = tiles left on the final board',
      'M-PLANFUL': '0.5*min(1, response.firstActionLatencyMs / content.metricParams.planWindowMs) + 0.5*(1 - revisitRate); revisitRate = (rotations+removals)/max(1, total actions)',
      'M-EXPLORE': 'distinct board cells touched by any action / count of placeable (non-blocked, non-endpoint) cells',
      note: 'M-EFF is server-derived: the renderer never receives optimalTiles, so it emits response.cost.actual and the server divides.',
    },
    distractorRationales: RESPONSE_TAXONOMY,
  };
  return {
    itemId: seededUuid(seed),
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsForLevel(L),
    demoPath: DEMO_PATH,
    content,
    answer,
    scoring: { mode: 'computed_solver' },
    provenance: { generator: 'grammar', generatorRef: GENERATOR_REF, seed, level: L, delivery: 'game' },
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
// Self-check (the standalone validator in check-GB-PATHFORGE-01.mjs re-derives everything
// again without importing this file).
// ---------------------------------------------------------------------------
function validateStored(c, ans) {
  const path = ans.optimalPath;
  const blockedSet = new Set(c.blocked.map(b => b[0] + ',' + b[1]));
  if (!Array.isArray(path) || path.length < 3) return 'path too short';
  if (path[0][0] !== c.start[0] || path[0][1] !== c.start[1]) return 'path does not start at the hut';
  const end = path[path.length - 1];
  if (end[0] !== c.goal[0] || end[1] !== c.goal[1]) return 'path does not end at the flag';
  const seen = new Set();
  for (const p of path) {
    const k = p[0] + ',' + p[1];
    if (seen.has(k)) return 'path revisits a cell (not simple)';
    seen.add(k);
    if (blockedSet.has(k)) return 'path crosses a blocked cell';
    if (p[0] < 0 || p[0] >= c.grid.R || p[1] < 0 || p[1] >= c.grid.C) return 'path leaves the board';
  }
  for (let i = 1; i < path.length; i++) {
    if (Math.abs(path[i][0] - path[i - 1][0]) + Math.abs(path[i][1] - path[i - 1][1]) !== 1) return `step ${i} is not 4-adjacent`;
  }
  for (const g of c.coins) if (!seen.has(g[0] + ',' + g[1])) return 'path misses a coin';
  if (path.length - 2 !== ans.optimalTiles) return `path interior ${path.length - 2} != optimalTiles ${ans.optimalTiles}`;
  if (c.tileBudget <= ans.optimalTiles) return 'tileBudget does not exceed the optimum (would state the key)';
  for (const t of ans.tileSpec) if (!c.tray.includes(t.shape)) return `tile shape ${t.shape} not in the tray`;
  return null;
}

function verify(items) {
  let ok = 0, bad = 0; const problems = []; const bands = {};
  for (let L = 1; L <= 20; L++) bands[L] = 0;
  const seenIds = new Set();
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (seenIds.has(it.itemId)) problems.push(`${it.itemId}: duplicate itemId`);
    seenIds.add(it.itemId);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.difficulty < 1 || it.difficulty > 20) problems.push(`${it.itemId}: difficulty out of range`);
    if (it.scoring.mode !== 'computed_solver') problems.push(`${it.itemId}: scoring mode wrong`);
    for (const leak of ['optimalTiles', 'optimalPath', 'tileSpec', 'answer', 'optimalSteps'])
      if (leak in it.content) problems.push(`${it.itemId}: content leaks ${leak}`);
    const err = validateStored(it.content, it.answer);
    if (err) problems.push(`${it.itemId}: stored solution invalid - ${err}`);
    const re = solveOptimal(it.content.grid.R, it.content.grid.C, it.content.blocked, it.content.start, it.content.goal, it.content.coins);
    const recomputed = re ? String(re.total - 1) : 'UNREACHABLE';
    if (recomputed === it.answer.correctKey && !err) ok++;
    else { bad++; problems.push(`${it.itemId}: key ${it.answer.correctKey} != recomputed ${recomputed}`); }
    for (let L = 1; L <= 20; L++) if (it.difficulty >= L - 1 && it.difficulty <= L + 1) bands[L]++;
  }
  return { ok, bad, problems, bands };
}

function main() {
  const doVerify = process.argv.includes('--verify');
  const items = generate();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, items.map(it => JSON.stringify(it)).join('\n') + '\n');
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);
  const byCoins = {}; for (const it of items) { const g = it.content.coins.length; byCoins[g] = (byCoins[g] || 0) + 1; }
  console.log(`[${TYPE_CODE}] coins:`, JSON.stringify(byCoins));
  const tiles = items.map(it => it.answer.optimalTiles);
  console.log(`[${TYPE_CODE}] optimalTiles: min ${Math.min(...tiles)}, max ${Math.max(...tiles)}`);
  const det = items.map(it => it.answer.detourRatio);
  console.log(`[${TYPE_CODE}] detour ratio (optimum vs straight line): min ${Math.min(...det)}, max ${Math.max(...det)}`);

  const v = verify(items);
  let minBand = Infinity; const lines = [];
  for (let L = 1; L <= 20; L++) { lines.push(`  band ${String(L).padStart(2)} (+/-1pt): ${v.bands[L]}`); minBand = Math.min(minBand, v.bands[L]); }
  console.log(`[${TYPE_CODE}] key check (BFS re-solve + simple-path validation): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(lines.join('\n'));
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: every level solvable, optimum re-solved by BFS, simple-path witness validated, coverage satisfied, born-synthetic.`);
}

main();
