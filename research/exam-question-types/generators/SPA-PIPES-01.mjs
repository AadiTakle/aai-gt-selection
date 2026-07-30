#!/usr/bin/env node
// SPA-PIPES-01 - Path-Connect (pipe-rotation) structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-PIPES-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// This is an INTERACTIVE type (like SPA-MAZE-01), not multiple-choice. The child rotates
// pipe tiles a quarter-turn at a time to connect a road from the car (west edge) to EVERY
// flag on the east edge, passing through any gems. The deterministic "key" is the OPTIMAL
// number of quarter-turn rotations, COMPUTED from geometry - never guessed.
//
// Rigor of the key: the solution road is a THIN self-avoiding TREE (induced: two road cells
// are 4-adjacent only where the road actually runs between them). Its leaves are exactly the
// terminals - the car and the flags - and every road tile carries exactly as many arms as its
// role needs: 2 for a run or a corner, 3 for a T where the road forks towards two flags.
// Every non-road tile is a DECOY with 0 or 1 arm, so it can never be an interior node of any
// road. The road is therefore the UNIQUE connectable network, and the minimum rotations to
// connect = the sum over road tiles of the minimal quarter-turns from the tile's shuffled
// orientation to its solved one. An independent verifier rebuilds the tree purely from the
// tile arm-counts + geometry and re-sums the minimum, so the wiring the child sees and the
// scored key provably match. Because there are no enumerated options,
// answer.distractorRationales documents the RESPONSE taxonomy a deterministic scorer uses
// (optimal / detour / missed-gem / incomplete).
//
// Usage:
//   node generators/SPA-PIPES-01.mjs            # write bank
//   node generators/SPA-PIPES-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via the
// number of FLAGS the road must reach (plan §4 band -> 1..20 scale; §6.3 SPA-PIPES-01 curve):
//
//   K-1 (1-4)     1 flag, short route
//   2-3 (5-8)     1 flag, longer route
//   4-5 (9-12)    2 flags
//   6-8 (13-16)   3 flags, T-branches required
//   above (17-20) 4 flags
//
// "T-branches required" is checked, not asserted: `answer.tBranch.requiredProof` records the
// result of deleting every 3-arm tile from the grid and re-running the flood fill, which must
// leave at least one flag unreachable. Note that two flags already force a T in this
// mechanic - a road serving two terminals needs a fork, and passing THROUGH a flag needs the
// flag's own tile to carry three arms - so the 4-5 band gets one T as a side effect of having
// two endpoints at all.
//
// NOT IMPLEMENTED: the above-level band's "limited pipe inventory". The child rotates tiles
// that are already on the board; there is no inventory to limit. Scarcity would need a tray
// the child draws pieces from, i.e. a placement interaction rather than a rotation one.
// Above-level therefore raises the flag count to four instead.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

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
// Thin self-avoiding road TREE. Every branch is grown the same way: a new cell may
// touch only its predecessor among road cells, so the road stays induced and is
// therefore the only network the tiles can ever form.
// ---------------------------------------------------------------------------
const ck = (cell) => cell[0] + ',' + cell[1];
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Grow a branch eastwards from `anchor` (already on the road) until it reaches the
 * east edge. `minCells` is the branch's own minimum length, which is how "longer
 * route" becomes a difficulty lever instead of an accident of the walk.
 */
function growBranch(R, C, rng, road, anchor, minCells) {
  const branch = [];
  const local = new Set();
  const occupied = (r, c) => road.has(r + ',' + c) || local.has(r + ',' + c);
  const touchesOnlyPred = (nc, pred) => neighbors4(nc[0], nc[1], R, C)
    .every(([nr, ncl]) => (nr === pred[0] && ncl === pred[1]) || !occupied(nr, ncl));
  let guard = 0;
  while (guard++ < 20000) {
    const cur = branch.length ? branch[branch.length - 1] : anchor;
    if (branch.length && cur[1] === C - 1 && branch.length >= minCells) return branch;
    let cand = neighbors4(cur[0], cur[1], R, C).map((x) => [x[0], x[1]])
      .filter((nc) => !occupied(nc[0], nc[1]) && touchesOnlyPred(nc, cur));
    // Bias eastward for reachability, with seeded jitter for turns.
    cand.sort((a, b) => (C - 1 - a[1]) - (C - 1 - b[1]));
    if (rng() < 0.5) cand.reverse();
    if (rng() < 0.35 && cand.length > 1) { const i = 1 + Math.floor(rng() * (cand.length - 1)); [cand[0], cand[i]] = [cand[i], cand[0]]; }
    if (!cand.length) {                    // dead end -> backtrack
      if (!branch.length) return null;
      const dead = branch.pop(); local.delete(ck(dead)); continue;
    }
    const nc = cand[0]; branch.push(nc); local.add(ck(nc));
  }
  return null;
}

/**
 * A road tree with `nFlags` leaves on the east edge and the car on the west edge.
 * Returns { start, flags, cells, adj } or null. `adj` is the road adjacency, which
 * is what the arm sets are read off.
 */
function genRoad(R, C, rng, nFlags, minCells, maxCells) {
  const start = [Math.floor(rng() * R), 0];
  const road = new Set([ck(start)]);
  const adj = new Map([[ck(start), []]]);
  const cellOf = new Map([[ck(start), start]]);
  const flags = [];

  const attach = (anchor, branch) => {
    let prev = anchor;
    for (const cell of branch) {
      road.add(ck(cell)); cellOf.set(ck(cell), cell); adj.set(ck(cell), []);
      adj.get(ck(prev)).push(cell); adj.get(ck(cell)).push(prev);
      prev = cell;
    }
    flags.push(branch[branch.length - 1]);
  };

  const trunkMin = Math.max(C - 1, Math.ceil(minCells / nFlags));
  const trunk = growBranch(R, C, rng, road, start, trunkMin);
  if (!trunk) return null;
  attach(start, trunk);

  for (let f = 1; f < nFlags; f++) {
    // A fork may only be hung on a road cell that still has an arm to spare, and
    // never on a flag (a flag has to stay a leaf carrying the off-grid stub).
    const armsSoFar = (cell) => adj.get(ck(cell)).length + (ck(cell) === ck(start) ? 1 : 0);
    const anchors = shuffle(rng, [...road].map((k) => cellOf.get(k)))
      .filter((cell) => !flags.some((g) => ck(g) === ck(cell)) && armsSoFar(cell) <= 2 && cell[1] < C - 1);
    let grown = null, at = null;
    for (const anchor of anchors) {
      grown = growBranch(R, C, rng, road, anchor, 1);
      if (grown) { at = anchor; break; }
    }
    if (!grown) return null;
    attach(at, grown);
  }

  if (road.size < minCells || road.size > maxCells) return null;
  if (new Set(flags.map(ck)).size !== nFlags) return null;
  return { start, flags, cells: [...road].map((k) => cellOf.get(k)), adj };
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
// ---------------------------------------------------------------------------
const BANDS = ['K-1', '2-3', '4-5', '6-8', 'above-level'];
function bandOfLevel(L) { return L <= 4 ? 'K-1' : L <= 8 ? '2-3' : L <= 12 ? '4-5' : L <= 16 ? '6-8' : 'above-level'; }
const BAND_RULE = {
  'K-1': 'one flag, short route',
  '2-3': 'one flag, longer route',
  '4-5': 'two flags',
  '6-8': 'three flags, at least one T-branch provably required',
  'above-level': 'four flags',
};
// The review names 6-8 as the band where a T is required. Two endpoints already force
// a fork in this mechanic, so the property is asserted from 4-5 up rather than pretended
// to start later.
const T_REQUIRED_BANDS = new Set(['4-5', '6-8', 'above-level']);
// `flags` is the band lever; min/maxCells set how long the road is.
const PROFILES = {
  1: { R: 3, C: 4, flags: 1, gems: 0, minCells: 4, maxCells: 7 },
  2: { R: 4, C: 4, flags: 1, gems: 0, minCells: 4, maxCells: 8 },
  3: { R: 4, C: 5, flags: 1, gems: 0, minCells: 5, maxCells: 9 },
  4: { R: 5, C: 5, flags: 1, gems: 0, minCells: 6, maxCells: 10 },
  5: { R: 5, C: 6, flags: 1, gems: 1, minCells: 9, maxCells: 14 },
  6: { R: 6, C: 6, flags: 1, gems: 1, minCells: 10, maxCells: 15 },
  7: { R: 6, C: 7, flags: 1, gems: 1, minCells: 11, maxCells: 16 },
  8: { R: 7, C: 7, flags: 1, gems: 1, minCells: 12, maxCells: 17 },
  9: { R: 7, C: 7, flags: 2, gems: 1, minCells: 12, maxCells: 19 },
  10: { R: 7, C: 8, flags: 2, gems: 2, minCells: 13, maxCells: 21 },
  11: { R: 8, C: 8, flags: 2, gems: 2, minCells: 14, maxCells: 23 },
  12: { R: 8, C: 9, flags: 2, gems: 2, minCells: 15, maxCells: 25 },
  13: { R: 8, C: 9, flags: 3, gems: 2, minCells: 17, maxCells: 27 },
  14: { R: 9, C: 9, flags: 3, gems: 2, minCells: 18, maxCells: 29 },
  15: { R: 9, C: 10, flags: 3, gems: 3, minCells: 19, maxCells: 31 },
  16: { R: 9, C: 10, flags: 3, gems: 3, minCells: 20, maxCells: 33 },
  17: { R: 10, C: 10, flags: 4, gems: 3, minCells: 22, maxCells: 35 },
  18: { R: 10, C: 10, flags: 4, gems: 3, minCells: 23, maxCells: 37 },
  19: { R: 10, C: 11, flags: 4, gems: 3, minCells: 24, maxCells: 39 },
  20: { R: 10, C: 11, flags: 4, gems: 3, minCells: 25, maxCells: 41 },
};
const ITEMS_PER_LEVEL = 5;

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const RESPONSE_TAXONOMY = [
  { kind: 'connected_optimal', rationale: 'a continuous road connects the car to every flag through all gems using the minimum quarter-turns (correct)' },
  { kind: 'connected_detour', rationale: 'the road connects but used more quarter-turns than the optimal (inefficiency)' },
  { kind: 'connected_missed_gem', rationale: 'the road connects car to the flags but bypasses a required gem' },
  { kind: 'incomplete', rationale: 'submitted before a continuous road connects the car to every flag' },
];

/**
 * Required (solved) arm set for every road tile: one arm per road neighbour, plus
 * the off-grid stub the car and each flag hang off. A fork therefore comes out as a
 * 3-arm T by construction, not by decoration.
 */
function requiredForRoad(cells, adj, start, flags) {
  const flagKeys = new Set(flags.map(ck));
  return cells.map((cell) => {
    const arms = adj.get(ck(cell)).map((nb) => dirTo(cell, nb));
    if (ck(cell) === ck(start)) arms.push('W');
    if (flagKeys.has(ck(cell))) arms.push('E');
    return { r: cell[0], c: cell[1], dirs: canon(arms) };
  });
}

/**
 * Delete every 3-arm tile and ask whether the car could still reach each flag
 * through the remaining >=2-arm tiles. If it cannot, no rotation of the served
 * tray solves this item without a T, which is the review's requirement stated as
 * something checkable rather than something claimed.
 */
function tBranchProof(R, C, tiles, start, flags) {
  const usable = new Map();
  for (const t of tiles) if (t.dirs.length === 2) usable.set(t.r + ',' + t.c, t);
  const seen = new Set();
  if (usable.has(ck(start))) {
    seen.add(ck(start));
    const q = [start];
    for (let qi = 0; qi < q.length; qi++) {
      const [r, c] = q[qi];
      for (const [nr, nc] of neighbors4(r, c, R, C)) {
        const k = nr + ',' + nc;
        if (usable.has(k) && !seen.has(k)) { seen.add(k); q.push([nr, nc]); }
      }
    }
  }
  const unreachable = flags.filter((g) => !seen.has(ck(g)));
  return { tCount: tiles.filter((t) => t.dirs.length === 3).length, flagsUnreachableWithoutT: unreachable.length };
}

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildItem(L, idx) {
  const prof = PROFILES[L];
  const R = prof.R, C = prof.C;
  const band = bandOfLevel(L);

  let seed = '', rng = null, road = null;
  for (let salt = 0; salt < 400 && !road; salt++) {
    seed = `${TYPE_CODE}|L${L}|#${idx}|s${salt}|${BASE_SEED}`;
    rng = makeRng(seed);
    road = genRoad(R, C, rng, prof.flags, prof.minCells, prof.maxCells);
  }
  if (!road) throw new Error(`${TYPE_CODE} L${L} #${idx}: no ${prof.flags}-flag road found`);
  const { start, flags, cells, adj } = road;
  const goal = flags[0];

  const required = requiredForRoad(cells, adj, start, flags);
  const reqByCell = new Map(required.map(t => [t.r + ',' + t.c, t.dirs]));

  // gems on road cells that are neither the car nor a flag.
  const terminals = new Set([ck(start), ...flags.map(ck)]);
  const gemPool = cells.filter((cell) => !terminals.has(ck(cell)));
  const gems = [];
  const nGems = Math.min(prof.gems, gemPool.length);
  for (let i = 0; i < nGems; i++) { const gi = Math.floor(rng() * gemPool.length); gems.push(gemPool.splice(gi, 1)[0]); }

  // Tiles: road cells get their solved 2- or 3-arm pipe scrambled off-solution; decoys get <=1 arm.
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

  const proof = tBranchProof(R, C, tiles, start, flags);
  const target = flags.length === 1 ? 'the flag' : `all ${flags.length} flags`;
  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;
  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'connect_road',
      collectGems: gems.length > 0,
      flagCount: flags.length,
      prompt: gems.length
        ? `Rotate the pipes to connect the road from the car to ${target} through all ${gems.length} gem${gems.length > 1 ? 's' : ''}, in as few turns as possible.`
        : `Rotate the pipes to connect the road from the car to ${target} in as few turns as possible.`,
    },
    grid: { R, C },
    start,
    goal,                        // the first flag; kept so a single-endpoint reader still works
    goals: flags,                // every flag the road must reach
    gems,
    tiles,                       // every cell; road tiles have 2-3 arms, decoys have <=1
    optionKind: 'pipe_rotations',
    scaffold: { warmup: L <= 2 },
  };
  const answer = {
    correctKey: String(optimalRot),          // the optimal quarter-turn count (computed from geometry)
    optimalRot,
    solutionOrients,                          // one connecting configuration (independently checkable)
    relation: 'min_rotations_to_connect',
    band,
    bandRule: BAND_RULE[band],
    flagCount: flags.length,
    roadCells: cells.length,
    tBranch: {
      count: proof.tCount,
      // > 0 means the flood fill through 2-arm tiles alone cannot serve every flag,
      // i.e. no rotation-only solution avoids a T.
      requiredProof: proof.flagsUnreachableWithoutT,
    },
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
    provenance: { generator: 'grammar', generatorRef: GENERATOR_REF, seed, level: L, levers: { grid: `${R}x${C}`, band, flags: flags.length, roadCells: cells.length, tBranches: proof.tCount, gems: gems.length } },
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

const goalsOf = (content) => content.goals || [content.goal];

// Flood fill through matching arms for a given orientation map; connected iff EVERY
// flag is reached (a road that serves three flags but one is the same failure as a
// road that serves none).
function connects(content, orientMap) {
  const { R, C } = content.grid, key = p => p[0] + ',' + p[1];
  const startArms = orientMap.get(key(content.start)) || [];
  if (!startArms.includes('W')) return false;
  for (const g of goalsOf(content)) if (!(orientMap.get(key(g)) || []).includes('E')) return false;
  const seen = new Set([key(content.start)]), q = [content.start]; let qi = 0;
  while (qi < q.length) {
    const cell = q[qi++]; const arms = orientMap.get(key(cell)) || [];
    for (const [nr, nc, dir] of neighbors4(cell[0], cell[1], R, C)) {
      const narms = orientMap.get(nr + ',' + nc) || [];
      if (arms.includes(dir) && narms.includes(OPP[dir]) && !seen.has(nr + ',' + nc)) { seen.add(nr + ',' + nc); q.push([nr, nc]); }
    }
  }
  return goalsOf(content).every(g => seen.has(key(g)));
}

/**
 * Rebuild the road (>=2-arm tiles) from geometry alone and confirm it is a TREE whose
 * leaves are exactly the terminals. That is the property the uniqueness argument rests
 * on: a minimal tree over the terminals cannot be trimmed, and every decoy has too few
 * arms to stand in for any of it, so exactly one wiring connects.
 */
function reconstructRoad(content) {
  const { R, C } = content.grid;
  const tiles = tileMap(content);
  const road = new Set();
  content.tiles.forEach(t => { if (t.dirs.length >= 2) road.add(t.r + ',' + t.c); });
  const key = p => p[0] + ',' + p[1];
  const terminals = [content.start, ...goalsOf(content)];
  for (const t of terminals) if (!road.has(key(t))) return { error: `terminal ${key(t)} is not a road tile` };
  const adj = c => neighbors4(c[0], c[1], R, C).map(x => [x[0], x[1]]).filter(n => road.has(n[0] + ',' + n[1]));

  const seen = new Set([key(content.start)]);
  const order = [content.start];
  for (let qi = 0; qi < order.length; qi++) {
    for (const nb of adj(order[qi])) if (!seen.has(key(nb))) { seen.add(key(nb)); order.push(nb); }
  }
  if (seen.size !== road.size) return { error: `stray road tiles not connected to the car (${road.size - seen.size})` };
  let edges = 0;
  for (const k of road) { const [r, c] = k.split(',').map(Number); edges += adj([r, c]).length; }
  if (edges / 2 !== road.size - 1) return { error: `road is not a tree (${edges / 2} edges over ${road.size} cells)` };

  const terminalKeys = new Set(terminals.map(key));
  for (const k of road) {
    const [r, c] = k.split(',').map(Number);
    if (adj([r, c]).length === 1 && !terminalKeys.has(k)) return { error: `dead-end road tile at ${k} serves no flag` };
  }
  const adjacency = new Map([...road].map((k) => {
    const [r, c] = k.split(',').map(Number);
    return [k, adj([r, c])];
  }));
  return { cells: order, adjacency, tiles };
}

function independentOptimal(content) {
  const rc = reconstructRoad(content);
  if (rc.error) return { error: rc.error };
  const req = requiredForRoad(rc.cells, rc.adjacency, content.start, goalsOf(content));
  let total = 0;
  for (const t of req) {
    const initial = rc.tiles.get(t.r + ',' + t.c);
    const k = minRot(initial, t.dirs);
    if (k === null) return { error: `tile ${t.r},${t.c} initial ${initial} cannot rotate to required ${t.dirs}` };
    total += k;
  }
  // gems must lie on the reconstructed road.
  const onRoad = new Set(rc.cells.map(p => p[0] + ',' + p[1]));
  for (const g of content.gems) if (!onRoad.has(g[0] + ',' + g[1])) return { error: `gem ${g} off the road` };
  return { optimalRot: total, cells: rc.cells };
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
      if (!connects(it.content, solMap)) problems.push(`${it.itemId}: stored solutionOrients does NOT connect car->every flag`);
      if (solCost !== it.answer.optimalRot) problems.push(`${it.itemId}: stored solution cost ${solCost} != optimalRot ${it.answer.optimalRot}`);
    }
    // band curve: endpoint count and, from 6-8 up, a T that is provably unavoidable.
    const goals = goalsOf(it.content);
    const expectFlags = PROFILES[Math.max(1, Math.min(20, Math.round(it.provenance.level)))].flags;
    if (goals.length !== expectFlags) problems.push(`${it.itemId}: ${goals.length} flags, band wants ${expectFlags}`);
    if (it.content.question.flagCount !== goals.length) problems.push(`${it.itemId}: flagCount does not match goals`);
    const proof = tBranchProof(it.content.grid.R, it.content.grid.C, it.content.tiles, it.content.start, goals);
    if (proof.tCount !== it.answer.tBranch.count) problems.push(`${it.itemId}: tBranch.count ${it.answer.tBranch.count} != measured ${proof.tCount}`);
    if (proof.flagsUnreachableWithoutT !== it.answer.tBranch.requiredProof) problems.push(`${it.itemId}: tBranch.requiredProof stale`);
    if (T_REQUIRED_BANDS.has(it.answer.band) && proof.flagsUnreachableWithoutT === 0) {
      problems.push(`${it.itemId}: band ${it.answer.band} requires a T but every flag is reachable through 2-arm tiles alone`);
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
  writeFileSync(OUT, serializeBank(items));
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);
  const byGems = {}; for (const it of items) { const g = it.content.gems.length; byGems[g] = (byGems[g] || 0) + 1; }
  console.log(`[${TYPE_CODE}] gems:`, JSON.stringify(byGems));
  const rots = items.map(it => it.answer.optimalRot);
  console.log(`[${TYPE_CODE}] optimalRot: min ${Math.min(...rots)}, max ${Math.max(...rots)}`);

  // Measured band curve: endpoints, road length, and the T-necessity proof.
  console.log(`[${TYPE_CODE}] measured band curve:`);
  for (const band of BANDS) {
    const inBand = items.filter((it) => it.answer.band === band);
    const flags = [...new Set(inBand.map((it) => it.answer.flagCount))].sort();
    const cells = inBand.map((it) => it.answer.roadCells);
    const ts = inBand.map((it) => it.answer.tBranch.count);
    const proven = inBand.filter((it) => it.answer.tBranch.requiredProof > 0).length;
    console.log(
      `  ${band.padEnd(11)} n=${String(inBand.length).padStart(3)}  flags=${flags.join('/')}` +
      `  roadCells=${Math.min(...cells)}-${Math.max(...cells)}` +
      `  T-pieces=${Math.min(...ts)}-${Math.max(...ts)}` +
      `  T-required(proved)=${proven}/${inBand.length}`,
    );
  }

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (road re-solve + all-flag connect validation): ${v.ok} ok, ${v.bad} bad`);
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
