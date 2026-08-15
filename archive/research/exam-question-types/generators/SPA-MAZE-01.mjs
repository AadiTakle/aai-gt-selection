#!/usr/bin/env node
// SPA-MAZE-01 - Plan-the-Path structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-MAZE-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// This is an INTERACTIVE planning type (route-finding), not multiple-choice. The child
// navigates the child from start to goal (collecting any gems) in as few steps as
// possible. The deterministic "key" is the OPTIMAL step count, COMPUTED with breadth-first
// search over the maze graph plus a gem-order search - never guessed. A concrete optimal
// path is stored so the key is independently checkable. Because there are no enumerated
// options, `answer.distractorRationales` documents the RESPONSE taxonomy a deterministic
// scorer uses (optimal / detour / missed-gem / suboptimal-order / invalid / incomplete)
// rather than per-option lures. `scoring.mode='deterministic_key'`: a submitted path scores
// correct iff it is a legal walk that reaches the goal, visits every gem, and has length
// equal to the optimal.
//
// Usage:
//   node generators/SPA-MAZE-01.mjs            # write bank
//   node generators/SPA-MAZE-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// maze size (R x C) and — the lever the review asked for — the COMPETITIVENESS of the
// alternative routes, not random loop density:
//
//   K-1 (1-4)    one viable route
//   2-3 (5-8)    two routes of clearly different lengths (>= 6 steps apart)
//   4-5 (9-12)   two routes two steps apart
//   6-8 (13-16)  three routes at the tightest spacing the grid allows
//   above (17-20) several near-equal routes, exactly one of them shortest
//
// The route set is MEASURED, never assumed. Every maze is a spanning tree (exactly one
// route) plus a small, searched-for set of extra edges; after each candidate set the
// generator enumerates every simple start->goal route and keeps the maze only if the
// resulting length profile matches the band. `answer.routeProfile` records what was
// achieved, and verify() re-enumerates it from `content` alone.
//
// PARITY NOTE — the grid is 4-connected and therefore bipartite, so every start->goal
// route has the same length parity and two route lengths can never differ by an odd
// number. The review's "three paths differing by 1 step" is unreachable in this movement
// model; 2 steps is the tightest spacing that exists, and that is what the 6-8 band uses.
//
// Gems sit only on cells EVERY route crosses, so adding a gem cannot make a competing
// route unviable. Making the gems a detour instead would restore the old travelling-
// salesman load but would leave only one route legal, which is the opposite of what the
// review asked for.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-MAZE-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'SPA-MAZE-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'SPA-MAZE-01@1';

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
// Maze graph: undirected passable edges between 4-neighbour cells.
// ---------------------------------------------------------------------------
function edgeKey(a, b) { const [r1, c1] = a, [r2, c2] = b; return (r1 < r2 || (r1 === r2 && c1 < c2)) ? `${r1},${c1}-${r2},${c2}` : `${r2},${c2}-${r1},${c1}`; }
function neighborsOf(r, c, R, C) { const out = []; if (r > 0) out.push([r - 1, c]); if (r < R - 1) out.push([r + 1, c]); if (c > 0) out.push([r, c - 1]); if (c < C - 1) out.push([r, c + 1]); return out; }
function carve(R, C, rng) {
  const open = new Set();
  const visited = Array.from({ length: R }, () => Array(C).fill(false));
  const stack = [[0, 0]]; visited[0][0] = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const nbs = neighborsOf(r, c, R, C).filter(([nr, nc]) => !visited[nr][nc]);
    if (!nbs.length) { stack.pop(); continue; }
    const [nr, nc] = nbs[Math.floor(rng() * nbs.length)];
    open.add(edgeKey([r, c], [nr, nc])); visited[nr][nc] = true; stack.push([nr, nc]);
  }
  return open;
}
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Every wall that could be opened without leaving the grid. */
function nonTreeEdges(R, C, open) {
  const out = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (r < R - 1) { const k = edgeKey([r, c], [r + 1, c]); if (!open.has(k)) out.push(k); }
    if (c < C - 1) { const k = edgeKey([r, c], [r, c + 1]); if (!open.has(k)) out.push(k); }
  }
  return out;
}
/**
 * EVERY simple start->goal route, or null when the search blew past a cap (which
 * only happens on a maze too loopy to reason about, and such a maze is rejected).
 * This is the measurement the review's "closely competitive alternative paths"
 * requirement rests on: the bands are checked against it, not against loop density.
 */
const CAP_ROUTES = 64;
const CAP_STEPS = 250000;
function enumerateRoutes(R, C, open, start, goal) {
  const key = (p) => p[0] + ',' + p[1];
  const goalKey = key(goal);
  const routes = [];
  const visited = new Set([key(start)]);
  const path = [start];
  let steps = 0, overflow = false;
  const walk = (cur) => {
    if (++steps > CAP_STEPS) { overflow = true; return; }
    if (key(cur) === goalKey) {
      routes.push(path.slice());
      if (routes.length > CAP_ROUTES) overflow = true;
      return;
    }
    for (const nb of neighborsOf(cur[0], cur[1], R, C)) {
      const nk = key(nb);
      if (visited.has(nk) || !open.has(edgeKey(cur, nb))) continue;
      visited.add(nk); path.push(nb);
      walk(nb);
      path.pop(); visited.delete(nk);
      if (overflow) return;
    }
  };
  walk(start);
  return overflow ? null : routes;
}
const routeLengths = (routes) => routes.map((p) => p.length - 1).sort((a, b) => a - b);
/** Cells every route crosses (the shared spine gems are allowed to sit on). */
function sharedCells(routes) {
  const counts = new Map();
  for (const route of routes) for (const key of new Set(route.map((p) => p[0] + ',' + p[1]))) {
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n === routes.length).map(([k]) => k.split(',').map(Number));
}
// BFS shortest path (inclusive of both endpoints); null if unreachable.
function bfsPath(R, C, open, a, b) {
  const key = p => p[0] + ',' + p[1];
  const prev = new Map([[key(a), null]]);
  const q = [a]; let qi = 0;
  while (qi < q.length) {
    const cur = q[qi++];
    if (key(cur) === key(b)) break;
    for (const nb of neighborsOf(cur[0], cur[1], R, C)) {
      if (open.has(edgeKey(cur, nb)) && !prev.has(key(nb))) { prev.set(key(nb), cur); q.push(nb); }
    }
  }
  if (!prev.has(key(b))) return null;
  const path = []; let cur = b;
  while (cur) { path.push(cur); cur = prev.get(key(cur)); }
  return path.reverse();
}
function permute(arr) { if (arr.length <= 1) return [arr]; const res = []; arr.forEach((v, i) => { const rest = arr.slice(0, i).concat(arr.slice(i + 1)); permute(rest).forEach(p => res.push([v, ...p])); }); return res; }
// Optimal plan visiting all gems (any order) then goal. Returns {length, path, order}.
function optimalPlan(R, C, open, start, goal, gems) {
  if (!gems.length) { const p = bfsPath(R, C, open, start, goal); return { length: p.length - 1, path: p, order: [] }; }
  let best = null;
  for (const order of permute(gems)) {
    const stops = [start, ...order, goal]; let path = [stops[0]]; let ok = true;
    for (let i = 0; i < stops.length - 1; i++) {
      const seg = bfsPath(R, C, open, stops[i], stops[i + 1]);
      if (!seg) { ok = false; break; }
      path = path.concat(seg.slice(1));
    }
    if (ok && (!best || path.length - 1 < best.length)) best = { length: path.length - 1, path, order };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
// ---------------------------------------------------------------------------
// `maxLen` caps the walk the child actually has to make. A spanning tree left to
// itself produces serpentine corridors, and an above-level item is meant to be a
// planning problem, not seventy-eight taps.
const PROFILES = {
  1: { R: 4, C: 4, gems: 0, maxLen: 10 },
  2: { R: 4, C: 5, gems: 0, maxLen: 11 },
  3: { R: 5, C: 5, gems: 0, maxLen: 12 },
  4: { R: 5, C: 6, gems: 0, maxLen: 14 },
  5: { R: 6, C: 6, gems: 0, maxLen: 16 },
  6: { R: 6, C: 7, gems: 1, maxLen: 18 },
  7: { R: 7, C: 7, gems: 1, maxLen: 20 },
  8: { R: 7, C: 8, gems: 1, maxLen: 22 },
  9: { R: 8, C: 8, gems: 1, maxLen: 24 },
  10: { R: 8, C: 9, gems: 2, maxLen: 26 },
  11: { R: 9, C: 9, gems: 2, maxLen: 28 },
  12: { R: 9, C: 10, gems: 2, maxLen: 30 },
  13: { R: 10, C: 10, gems: 2, maxLen: 32 },
  14: { R: 10, C: 10, gems: 2, maxLen: 34 },
  15: { R: 10, C: 11, gems: 3, maxLen: 36 },
  16: { R: 11, C: 11, gems: 3, maxLen: 38 },
  17: { R: 11, C: 11, gems: 3, maxLen: 40 },
  18: { R: 11, C: 12, gems: 3, maxLen: 42 },
  19: { R: 12, C: 12, gems: 3, maxLen: 44 },
  20: { R: 12, C: 12, gems: 3, maxLen: 46 },
};
const ITEMS_PER_LEVEL = 5;

// ---------------------------------------------------------------------------
// Route-competition bands (plan §4 band -> 1..20 scale; §6.3 SPA-MAZE-01 curve).
// `test` runs on the ASCENDING list of every simple route's length.
// ---------------------------------------------------------------------------
const BANDS = ['K-1', '2-3', '4-5', '6-8', 'above-level'];
function bandOfLevel(L) { return L <= 4 ? 'K-1' : L <= 8 ? '2-3' : L <= 12 ? '4-5' : L <= 16 ? '6-8' : 'above-level'; }
const CLEARLY_DIFFERENT = 6;             // steps; "two paths, clearly different lengths"
const ROUTE_SPECS = {
  'K-1': {
    extra: 0, poolDelta: [],
    rule: 'exactly one viable route',
    test: (lens) => lens.length === 1,
  },
  '2-3': {
    extra: 1, poolDelta: [],
    rule: `exactly two routes, at least ${CLEARLY_DIFFERENT} steps apart`,
    test: (lens) => lens.length === 2 && lens[1] - lens[0] >= CLEARLY_DIFFERENT,
  },
  '4-5': {
    extra: 1, poolDelta: [],
    rule: 'exactly two routes, exactly 2 steps apart',
    test: (lens) => lens.length === 2 && lens[1] - lens[0] === 2,
  },
  '6-8': {
    extra: 2, poolDelta: [2, 4],
    rule: 'exactly three routes at lengths L, L+2, L+4 (2 = the tightest spacing a 4-connected grid allows)',
    test: (lens) => lens.length === 3 && lens[1] - lens[0] === 2 && lens[2] - lens[1] === 2,
  },
  'above-level': {
    extra: 3, poolDelta: [2],
    rule: 'four or more routes, exactly one of minimum length, at least three tied 2 steps behind it',
    test: (lens) => lens.length >= 4 && lens[1] > lens[0] && lens.filter((n) => n === lens[0] + 2).length >= 3,
  },
};

/**
 * A maze whose measured route profile satisfies the band, or null.
 * Start from a spanning tree (one route by construction) and open walls one at a
 * time, re-enumerating after every candidate set — the profile is never inferred
 * from how many walls were opened.
 */
const MAX_COMBOS = 4000;
function searchMaze(R, C, start, goal, spec, maxLen, rng) {
  const tree = carve(R, C, rng);
  const base = enumerateRoutes(R, C, tree, start, goal);
  if (!base) return null;
  // Opening walls can only shorten the shortest route, and never by much, so a
  // wildly long tree path is thrown away before the candidate scan.
  if (routeLengths(base)[0] > maxLen + 6) return null;
  if (spec.extra === 0) return spec.test(routeLengths(base)) ? { open: tree, routes: base } : null;

  const singles = [];
  for (const e of shuffle(rng, nonTreeEdges(R, C, tree))) {
    const open = new Set(tree); open.add(e);
    const routes = enumerateRoutes(R, C, open, start, goal);
    if (!routes) continue;
    const lens = routeLengths(routes);
    if (spec.extra === 1 && spec.test(lens)) return { open, routes };
    if (routes.length === 2 && spec.poolDelta.includes(lens[1] - lens[0])) singles.push(e);
  }
  if (spec.extra === 1 || singles.length < spec.extra) return null;

  const pool = singles.slice(0, 24);
  let combos = 0;
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      if (spec.extra === 2) {
        if (++combos > MAX_COMBOS) return null;
        const open = new Set(tree); open.add(pool[i]); open.add(pool[j]);
        const routes = enumerateRoutes(R, C, open, start, goal);
        if (routes && spec.test(routeLengths(routes))) return { open, routes };
        continue;
      }
      for (let k = j + 1; k < pool.length; k++) {
        if (++combos > MAX_COMBOS) return null;
        const open = new Set(tree); open.add(pool[i]); open.add(pool[j]); open.add(pool[k]);
        const routes = enumerateRoutes(R, C, open, start, goal);
        if (routes && spec.test(routeLengths(routes))) return { open, routes };
      }
    }
  }
  return null;
}

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const RESPONSE_TAXONOMY = [
  { kind: 'optimal', rationale: 'legal path that reaches the goal, visits every gem, length == optimal (correct)' },
  { kind: 'detour', rationale: 'legal path reaches the goal and gems but is longer than optimal (inefficiency)' },
  { kind: 'suboptimal_gem_order', rationale: 'all gems collected but sequenced in a costlier order than optimal' },
  { kind: 'missed_gem', rationale: 'reached the goal but skipped a required gem' },
  { kind: 'invalid', rationale: 'a step crosses a wall or is not 4-adjacent (illegal walk)' },
  { kind: 'incomplete', rationale: 'path does not terminate at the goal' },
];

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildItem(L, idx) {
  const prof = PROFILES[L];
  const R = prof.R, C = prof.C;
  const start = [0, 0], goal = [R - 1, C - 1];
  const band = bandOfLevel(L);
  const spec = ROUTE_SPECS[band];

  let seed = '', rng = null, found = null, gems = [], plan = null;
  for (let salt = 0; salt < 240 && !found; salt++) {
    seed = `${TYPE_CODE}|L${L}|#${idx}|s${salt}|${BASE_SEED}`;
    rng = makeRng(seed);
    const candidate = searchMaze(R, C, start, goal, spec, prof.maxLen, rng);
    if (!candidate) continue;
    if (routeLengths(candidate.routes)[0] > prof.maxLen) continue;

    // Gems only on the shared spine, so every competing route stays viable.
    const spine = sharedCells(candidate.routes)
      .filter(([r, c]) => !(r === start[0] && c === start[1]) && !(r === goal[0] && c === goal[1]));
    if (spine.length < prof.gems) continue;
    const pool = shuffle(rng, spine);
    gems = pool.slice(0, prof.gems);

    // The stored key must be the shortest LEGAL WALK, and it must coincide with the
    // shortest enumerated route — otherwise a gem is pulling the optimum off the
    // measured route set and the profile would describe a different task.
    plan = optimalPlan(R, C, candidate.open, start, goal, gems);
    if (!plan || plan.length !== routeLengths(candidate.routes)[0]) continue;
    found = candidate;
  }
  if (!found) throw new Error(`${TYPE_CODE} L${L} #${idx}: no maze matched the ${band} route spec`);

  const open = found.open;
  const lens = routeLengths(found.routes);
  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;
  const openEdges = [...open].sort();

  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'shortest_path',
      collectGems: gems.length > 0,
      prompt: gems.length ? `Reach the goal in as few steps as possible, collecting all ${gems.length} gem${gems.length > 1 ? 's' : ''}.` : 'Reach the goal in as few steps as possible.',
    },
    grid: { R, C },
    openEdges,
    start, goal, gems,
    optionKind: 'path',
    scaffold: { warmup: L <= 2 },
  };
  const answer = {
    correctKey: String(plan.length),           // the optimal step count (computed from geometry)
    optimalLength: plan.length,
    optimalPath: plan.path,
    gemOrder: plan.order,
    relation: 'min_path_bfs',
    // What the route search actually achieved — re-derivable from `content` alone,
    // which is what verify() does. Server-side because a route count is a hint.
    routeProfile: {
      band,
      rule: spec.rule,
      routeCount: found.routes.length,
      lengths: lens,
      shortest: lens[0],
      runnerUpGap: lens.length > 1 ? lens[1] - lens[0] : null,
      tiedAtRunnerUp: lens.length > 1 ? lens.filter((n) => n === lens[1]).length : 0,
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
    provenance: { generator: 'grammar', generatorRef: GENERATOR_REF, seed, level: L, levers: { grid: `${R}x${C}`, band, routeCount: found.routes.length, gems: gems.length } },
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
// Independent verification: re-solve the optimal from content, and validate the
// stored optimal path is a legal walk of exactly that length hitting every gem.
// ---------------------------------------------------------------------------
function sameCell(a, b) { return a[0] === b[0] && a[1] === b[1]; }
function validateStoredPath(c, ans) {
  const open = new Set(c.openEdges);
  const path = ans.optimalPath;
  if (!Array.isArray(path) || path.length < 1) return 'empty path';
  if (!sameCell(path[0], c.start)) return 'does not start at start';
  if (!sameCell(path[path.length - 1], c.goal)) return 'does not end at goal';
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const man = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    if (man !== 1) return `step ${i} not 4-adjacent`;
    if (!open.has(edgeKey(a, b))) return `step ${i} crosses a wall`;
  }
  for (const g of c.gems) if (!path.some(p => sameCell(p, g))) return 'skips a required gem';
  if (path.length - 1 !== ans.optimalLength) return `path length ${path.length - 1} != optimalLength ${ans.optimalLength}`;
  return null;
}
function independentOptimal(c) {
  const open = new Set(c.openEdges);
  return optimalPlan(c.grid.R, c.grid.C, open, c.start, c.goal, c.gems);
}

function verify(items) {
  let ok = 0, bad = 0; const problems = [];
  const bands = {}; for (let L = 1; L <= 20; L++) bands[L] = 0;
  const byBand = {}; for (const b of BANDS) byBand[b] = { items: 0, routeCounts: {}, gaps: {}, lengthSpread: [] };
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.difficulty < 1 || it.difficulty > 20) problems.push(`${it.itemId}: difficulty out of range`);
    if (it.scoring.mode !== 'deterministic_key') problems.push(`${it.itemId}: scoring mode wrong`);
    // content must NOT leak the optimal answer
    if ('optimalLength' in it.content || 'optimalPath' in it.content || 'answer' in it.content) problems.push(`${it.itemId}: content leaks answer`);
    // stored optimal path must be a legal minimal walk
    const pathErr = validateStoredPath(it.content, it.answer);
    if (pathErr) problems.push(`${it.itemId}: stored path invalid - ${pathErr}`);
    // re-solve optimal independently and require agreement with the stored key
    const re = independentOptimal(it.content);
    const recomputed = re ? String(re.length) : 'UNREACHABLE';
    if (recomputed === it.answer.correctKey && !pathErr) ok++;
    else { bad++; problems.push(`${it.itemId}: key ${it.answer.correctKey} != recomputed ${recomputed} (${it.content.grid.R}x${it.content.grid.C}, ${it.content.gems.length} gems)`); }

    // Re-enumerate the competing routes straight from the served maze and hold the
    // item to its band's rule. This is the evidence for the review's curve.
    const p = it.answer.routeProfile;
    const spec = ROUTE_SPECS[p ? p.band : ''];
    const routes = enumerateRoutes(it.content.grid.R, it.content.grid.C, new Set(it.content.openEdges), it.content.start, it.content.goal);
    if (!p || !spec) problems.push(`${it.itemId}: no routeProfile`);
    else if (!routes) problems.push(`${it.itemId}: route enumeration overflowed`);
    else {
      const lens = routeLengths(routes);
      if (lens.join(',') !== p.lengths.join(',')) problems.push(`${it.itemId}: stored profile ${p.lengths.join(',')} != re-enumerated ${lens.join(',')}`);
      if (!spec.test(lens)) problems.push(`${it.itemId}: band ${p.band} route profile ${lens.join(',')} fails "${spec.rule}"`);
      if (lens[0] !== it.answer.optimalLength) problems.push(`${it.itemId}: shortest route ${lens[0]} != optimalLength ${it.answer.optimalLength}`);
      const onEvery = new Set(sharedCells(routes).map((cell) => cell.join(',')));
      for (const g of it.content.gems) if (!onEvery.has(g.join(','))) problems.push(`${it.itemId}: gem ${g} is not on every route`);
      const b = byBand[p.band];
      if (b) {
        b.items++;
        b.routeCounts[lens.length] = (b.routeCounts[lens.length] || 0) + 1;
        if (lens.length > 1) b.gaps[lens[1] - lens[0]] = (b.gaps[lens[1] - lens[0]] || 0) + 1;
        b.lengthSpread.push(lens.map((n) => n - lens[0]).join('/'));
      }
    }
    for (let L = 1; L <= 20; L++) if (it.difficulty >= L - 1 && it.difficulty <= L + 1) bands[L]++;
  }
  return { ok, bad, problems, bands, byBand };
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
  const opt = items.map(it => it.answer.optimalLength);
  console.log(`[${TYPE_CODE}] optimal length: min ${Math.min(...opt)}, max ${Math.max(...opt)}`);

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] measured route profile per band (re-enumerated from content):`);
  for (const b of BANDS) {
    const s = v.byBand[b];
    const spread = {}; for (const k of s.lengthSpread) spread[k] = (spread[k] || 0) + 1;
    console.log(`  ${b.padEnd(11)} n=${String(s.items).padStart(3)}  routes/item ${JSON.stringify(s.routeCounts)}  runner-up gap ${JSON.stringify(s.gaps)}  offsets-from-shortest ${JSON.stringify(spread)}`);
  }
  console.log(`[${TYPE_CODE}] key check (BFS re-solve + path validation): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${cov.minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: optimal keys re-solved + path-validated, coverage satisfied, born-synthetic.`);
}

main();
