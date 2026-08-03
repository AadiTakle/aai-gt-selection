#!/usr/bin/env node
// GB-EXPLORE-01 - Explorer's Map structured bank generator (grammar, game-based delivery).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/GB-EXPLORE-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// GAME-BASED / INTERACTIVE. Per PS_GAMEBASED_WARRANT.md the game is a DELIVERY layer over
// the `spatial` construct area, never an area of its own. Each bank item is one WORLD: a
// fogged grid with a home hut, walls, and named landmarks that are revealed only near the
// walker. The child (1) explores until every landmark is found, (2) points a compass dial
// back at named landmarks that are hidden again, and (3) walks home under full fog along a
// shortcut they never travelled. The valuable signal is the PROCESS: route choice,
// exploration breadth, planning pause, and travel cost versus the optimum.
//
// The key is COMPUTED, never guessed: BFS gives all-pairs shortest distances over passable
// cells between {home, landmarks}; the minimal closed tour (home -> every landmark -> home)
// is found by exhaustive permutation over <=5 landmarks, and a concrete optimal walk is
// stored as a witness. A nearest-neighbour tour is also stored so the ramp can require the
// greedy route to be genuinely misleading.
//
// scoring.mode = 'computed_solver': the server replays the emitted action log against the
// world (legal moves, landmarks found, total travel, pointing angles, shortcut length)
// rather than matching one key. `answer.equivalence` credits ANY minimal-cost tour.
//
// Usage:
//   node generators/GB-EXPLORE-01.mjs            # write bank
//   node generators/GB-EXPLORE-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// world size, wall density (branching factor), landmark count (tour-ordering load), fog
// radius (how little is visible at once), how much worse the greedy nearest-landmark route
// is than the optimum, the number of hidden-landmark pointings, and move-budget tightness.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/GB-EXPLORE-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'GB-EXPLORE-01';
const DOMAIN = 'spatial';
const DEMO_PATH = 'demos/GB-EXPLORE-01.html';
const GENERATOR_REF = 'GB-EXPLORE-01@1';

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
// Grid helpers + BFS.
// ---------------------------------------------------------------------------
const key = (p) => p[0] + ',' + p[1];
function neighbours(r, c, R, C) {
  const o = [];
  if (r > 0) o.push([r - 1, c]);
  if (r < R - 1) o.push([r + 1, c]);
  if (c > 0) o.push([r, c - 1]);
  if (c < C - 1) o.push([r, c + 1]);
  return o;
}
// BFS from a source over passable cells; returns {dist:Map, prev:Map}.
function bfsFrom(R, C, blockedSet, src) {
  const dist = new Map([[key(src), 0]]);
  const prev = new Map([[key(src), null]]);
  const q = [src];
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    for (const nb of neighbours(cur[0], cur[1], R, C)) {
      const k = key(nb);
      if (blockedSet.has(k) || dist.has(k)) continue;
      dist.set(k, dist.get(key(cur)) + 1);
      prev.set(k, cur);
      q.push(nb);
    }
  }
  return { dist, prev };
}
function pathBetween(prevMap, target) {
  const out = [];
  let cur = target;
  while (cur) { out.push(cur); cur = prevMap.get(key(cur)); }
  return out.reverse();
}
function permute(arr) {
  if (arr.length <= 1) return [arr];
  const res = [];
  arr.forEach((v, i) => permute(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(p => res.push([v, ...p])));
  return res;
}

// Optimal open tour (home -> every landmark) and closed tour (… -> home), by exhaustive
// permutation over BFS all-pairs distances. Returns null if any landmark is unreachable.
function optimalTours(R, C, blockedSet, home, landmarks) {
  const nodes = [home, ...landmarks.map(l => [l.r, l.c])];
  const bfs = nodes.map(n => bfsFrom(R, C, blockedSet, n));
  for (let i = 1; i < nodes.length; i++) if (!bfs[0].dist.has(key(nodes[i]))) return null;
  const d = (i, j) => bfs[i].dist.get(key(nodes[j]));
  const ids = landmarks.map((_, i) => i + 1);
  const walkFor = (order, closed) => {
    const stops = [0, ...order].concat(closed ? [0] : []);
    let moves = 0, path = [nodes[stops[0]]];
    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i], to = stops[i + 1];
      moves += d(from, to);
      path = path.concat(pathBetween(bfs[from].prev, nodes[to]).slice(1));
    }
    return { moves, path, order: order.map(i => landmarks[i - 1].id) };
  };
  let bestOpen = null, bestClosed = null;
  for (const order of permute(ids)) {
    const o = walkFor(order, false);
    if (!bestOpen || o.moves < bestOpen.moves) bestOpen = o;
    const cl = walkFor(order, true);
    if (!bestClosed || cl.moves < bestClosed.moves) bestClosed = cl;
  }
  // Greedy nearest-landmark tour (the intuitive but often wrong route), closed.
  let cur = 0, remaining = ids.slice(), greedy = 0;
  const greedyOrder = [];
  while (remaining.length) {
    let bi = 0, bd = Infinity;
    remaining.forEach((n, i) => { const dd = d(cur, n); if (dd < bd) { bd = dd; bi = i; } });
    greedy += bd; cur = remaining[bi]; greedyOrder.push(landmarks[cur - 1].id); remaining.splice(bi, 1);
  }
  greedy += d(cur, 0);
  // Eccentricity of home over the reachable region (bounds any return walk).
  let ecc = 0;
  for (const v of bfs[0].dist.values()) ecc = Math.max(ecc, v);
  const homeDistances = landmarks.map((l, i) => ({ id: l.id, moves: d(0, i + 1) }));
  return { open: bestOpen, closed: bestClosed, greedyClosed: greedy, greedyOrder, ecc, homeDistances };
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
//   block  = wall density; lm = landmarks; fog = reveal radius (Chebyshev)
//   slack  = moveBudget - optimal open tour; points = hidden-landmark pointings
//   greedy = required (nearest-landmark tour - optimal tour) in moves
//   tour   = minimum optimal closed-tour length (solution depth)
// ---------------------------------------------------------------------------
const PROFILES = {
  1: { R: 4, C: 4, block: 0.00, lm: 1, fog: 2, slack: 9, points: 1, greedy: 0, tour: 4 },
  2: { R: 5, C: 5, block: 0.04, lm: 1, fog: 2, slack: 9, points: 1, greedy: 0, tour: 6 },
  3: { R: 5, C: 5, block: 0.06, lm: 2, fog: 2, slack: 8, points: 1, greedy: 0, tour: 8 },
  4: { R: 6, C: 6, block: 0.08, lm: 2, fog: 2, slack: 8, points: 1, greedy: 0, tour: 10 },
  5: { R: 6, C: 6, block: 0.10, lm: 2, fog: 2, slack: 7, points: 2, greedy: 0, tour: 12 },
  6: { R: 6, C: 7, block: 0.12, lm: 3, fog: 2, slack: 7, points: 2, greedy: 0, tour: 14 },
  7: { R: 7, C: 7, block: 0.14, lm: 3, fog: 2, slack: 6, points: 2, greedy: 1, tour: 16 },
  8: { R: 7, C: 7, block: 0.15, lm: 3, fog: 2, slack: 6, points: 2, greedy: 1, tour: 18 },
  9: { R: 7, C: 8, block: 0.16, lm: 3, fog: 1, slack: 6, points: 2, greedy: 1, tour: 20 },
  10: { R: 8, C: 8, block: 0.17, lm: 3, fog: 1, slack: 5, points: 2, greedy: 1, tour: 22 },
  11: { R: 8, C: 8, block: 0.18, lm: 4, fog: 1, slack: 5, points: 3, greedy: 2, tour: 24 },
  12: { R: 8, C: 9, block: 0.19, lm: 4, fog: 1, slack: 5, points: 3, greedy: 2, tour: 26 },
  13: { R: 9, C: 9, block: 0.20, lm: 4, fog: 1, slack: 4, points: 3, greedy: 2, tour: 28 },
  14: { R: 9, C: 9, block: 0.21, lm: 4, fog: 1, slack: 4, points: 3, greedy: 2, tour: 30 },
  15: { R: 9, C: 10, block: 0.22, lm: 4, fog: 1, slack: 4, points: 3, greedy: 3, tour: 32 },
  16: { R: 10, C: 10, block: 0.23, lm: 5, fog: 1, slack: 4, points: 3, greedy: 3, tour: 34 },
  17: { R: 10, C: 10, block: 0.24, lm: 5, fog: 1, slack: 3, points: 3, greedy: 3, tour: 36 },
  18: { R: 10, C: 11, block: 0.25, lm: 5, fog: 1, slack: 3, points: 4, greedy: 4, tour: 38 },
  19: { R: 11, C: 11, block: 0.26, lm: 5, fog: 1, slack: 3, points: 4, greedy: 4, tour: 40 },
  20: { R: 11, C: 11, block: 0.27, lm: 5, fog: 1, slack: 3, points: 4, greedy: 5, tour: 42 },
};
const ITEMS_PER_LEVEL = 6;
const LABELS = ['TREE', 'WELL', 'ROCK', 'POND', 'GATE', 'BARN', 'CAVE', 'MILL'];

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const RESPONSE_TAXONOMY = [
  { kind: 'complete_optimal', rationale: 'every landmark found and the walk home taken at the minimum total travel cost (correct)' },
  { kind: 'complete_detour', rationale: 'every landmark found and home reached, but total travel exceeds the optimal tour (route-planning inefficiency)' },
  { kind: 'greedy_order', rationale: 'landmarks visited in nearest-first order when a different order is cheaper (local rather than global planning)' },
  { kind: 'incomplete_exploration', rationale: 'the move budget ran out before every landmark was found' },
  { kind: 'shortcut_detour', rationale: 'the never-travelled walk home is longer than the shortest route from where the child stood (route rather than survey knowledge)' },
  { kind: 'pointing_error', rationale: 'compass angle to a hidden landmark deviates from the true bearing; large systematic error indicates residual egocentric coding' },
];

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildWorld(prof, rng, relax) {
  const R = prof.R, C = prof.C;
  const needTour = Math.max(4, Math.round(prof.tour * (relax >= 2 ? 0.7 : (relax >= 1 ? 0.85 : 1))));
  const needGreedy = relax >= 1 ? Math.max(0, prof.greedy - 1) : prof.greedy;

  const home = [Math.floor(rng() * R), Math.floor(rng() * C)];
  const free = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (!(r === home[0] && c === home[1])) free.push([r, c]);
  const pool = free.slice();
  const blocked = [];
  const nBlock = Math.floor(pool.length * prof.block);
  for (let i = 0; i < nBlock && pool.length; i++) blocked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const blockedSet = new Set(blocked.map(key));

  const landmarks = [];
  for (let i = 0; i < prof.lm && pool.length; i++) {
    const cell = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    landmarks.push({ id: 'L' + (i + 1), label: LABELS[i % LABELS.length], r: cell[0], c: cell[1] });
  }
  if (landmarks.length < prof.lm) return null;

  const tours = optimalTours(R, C, blockedSet, home, landmarks);
  if (!tours) return null;                                   // a landmark is walled off
  if (tours.closed.moves < needTour) return null;
  if (tours.greedyClosed - tours.closed.moves < needGreedy) return null;
  return { R, C, home, blocked, landmarks, tours };
}

function buildItem(L, idx) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const prof = PROFILES[L];

  let w = null;
  for (let attempt = 0; attempt < 1200 && !w; attempt++) {
    const relax = attempt < 700 ? 0 : (attempt < 1000 ? 1 : 2);
    w = buildWorld(prof, rng, relax);
  }
  if (!w) {
    // Deterministic fallback: an open world (no walls, always fully reachable).
    const R = prof.R, C = prof.C;
    const home = [0, 0];
    const landmarks = [];
    for (let i = 0; i < prof.lm; i++) {
      const r = (i * 3 + 1) % R, c = (i * 5 + 2) % C;
      landmarks.push({ id: 'L' + (i + 1), label: LABELS[i % LABELS.length], r: r === 0 && c === 0 ? 1 : r, c });
    }
    w = { R, C, home, blocked: [], landmarks, tours: optimalTours(R, C, new Set(), home, landmarks) };
  }

  const { R, C, home, blocked, landmarks, tours } = w;
  const moveBudget = tours.open.moves + prof.slack;
  const shortcutBudget = tours.ecc + 4;
  const pointing = landmarks.slice(0, Math.min(prof.points, landmarks.length)).map(l => l.id);
  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;

  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'explore_point_shortcut',
      prompt: `Walk around the foggy map and find all ${landmarks.length} landmark${landmarks.length > 1 ? 's' : ''}. Then turn the dial to point at each named landmark, and walk back home the shortest way you can.`,
      unit: 'moves',
    },
    grid: { R, C },
    home,
    blocked: blocked.map(b => b.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    landmarks: landmarks.map(l => ({ id: l.id, label: l.label, r: l.r, c: l.c })),
    fogRadius: prof.fog,
    moveBudget,                 // > the optimal exploration leg by design (never states it)
    shortcutBudget,
    pointing,                   // landmark ids the child must point at, in order
    optionKind: 'exploration_actions',
    metricParams: { planWindowMs: 4000 },
    scaffold: { warmup: L <= 2 },
  };
  const answer = {
    correctKey: String(tours.closed.moves),   // minimum total travel, computed by BFS + tour search
    optimalTotalMoves: tours.closed.moves,
    optimalExploreMoves: tours.open.moves,
    optimalOrder: tours.closed.order,
    optimalPath: tours.closed.path,
    exploreOrder: tours.open.order,
    explorePath: tours.open.path,
    homeDistances: tours.homeDistances,
    greedyClosedMoves: tours.greedyClosed,
    greedyExcess: tours.greedyClosed - tours.closed.moves,
    bearingRule: 'true bearing = degrees clockwise from north of (landmark - standCell), i.e. atan2(dc, -dr) in degrees normalised to [0,360); M-VIEWANG = mean over pointings of the absolute circular difference between response.pointings[i].angleDeg and that bearing',
    relation: 'min_closed_tour_bfs_all_pairs',
    equivalence: {
      rule: 'any_minimal_tour',
      detail: 'ANY legal walk that reaches every landmark and returns home in optimalTotalMoves is scored optimal; the stored optimalPath and optimalOrder are one witness. Shortcut legs are credited against the shortest route from the cell the child actually stood on.',
    },
    metricSpec: {
      'M-PATH': 'count of primitive actions in response.actions (move/blocked/point/shortcut-move) = strategy-signature length',
      'M-EFF': 'optimalTotalMoves / max(response.cost.actual, optimalTotalMoves), where cost.actual = exploreMoves + shortcutMoves',
      'M-PLANFUL': '0.5*min(1, response.firstActionLatencyMs / content.metricParams.planWindowMs) + 0.5*(1 - revisitRate); revisitRate = revisited cells / max(1, moves)',
      'M-EXPLORE': 'distinct passable cells entered / total passable cells in the world',
      'M-VIEWANG': 'server-side from response.pointings via answer.bearingRule (the renderer never scores its own angles)',
      note: 'M-EFF and M-VIEWANG are server-derived: the renderer never receives the optimum, so it emits raw costs and raw angles.',
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
// Self-check (check-GB-EXPLORE-01.mjs re-derives everything again without importing this).
// ---------------------------------------------------------------------------
function validateWalk(c, path, mustReturnHome) {
  const blockedSet = new Set(c.blocked.map(key));
  if (!Array.isArray(path) || path.length < 1) return 'empty walk';
  if (key(path[0]) !== key(c.home)) return 'walk does not start at home';
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (p[0] < 0 || p[0] >= c.grid.R || p[1] < 0 || p[1] >= c.grid.C) return `cell ${i} off the world`;
    if (blockedSet.has(key(p))) return `cell ${i} is a wall`;
    if (i > 0 && Math.abs(p[0] - path[i - 1][0]) + Math.abs(p[1] - path[i - 1][1]) !== 1) return `step ${i} not 4-adjacent`;
  }
  const visited = new Set(path.map(key));
  for (const l of c.landmarks) if (!visited.has(l.r + ',' + l.c)) return `landmark ${l.id} never reached`;
  if (mustReturnHome && key(path[path.length - 1]) !== key(c.home)) return 'walk does not end at home';
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
    if (it.scoring.mode !== 'computed_solver') problems.push(`${it.itemId}: scoring mode wrong`);
    for (const leak of ['optimalTotalMoves', 'optimalPath', 'optimalOrder', 'answer'])
      if (leak in it.content) problems.push(`${it.itemId}: content leaks ${leak}`);
    const c = it.content;
    const t = optimalTours(c.grid.R, c.grid.C, new Set(c.blocked.map(key)), c.home, c.landmarks);
    const recomputed = t ? String(t.closed.moves) : 'UNREACHABLE';
    const e1 = validateWalk(c, it.answer.optimalPath, true);
    const e2 = validateWalk(c, it.answer.explorePath, false);
    if (e1) problems.push(`${it.itemId}: stored optimalPath invalid - ${e1}`);
    if (e2) problems.push(`${it.itemId}: stored explorePath invalid - ${e2}`);
    if (c.moveBudget <= it.answer.optimalExploreMoves) problems.push(`${it.itemId}: moveBudget does not exceed the optimal explore leg`);
    if (recomputed === it.answer.correctKey && !e1 && !e2) ok++;
    else { bad++; problems.push(`${it.itemId}: key ${it.answer.correctKey} != recomputed ${recomputed}`); }
    for (let L = 1; L <= 20; L++) if (it.difficulty >= L - 1 && it.difficulty <= L + 1) bands[L]++;
  }
  return { ok, bad, problems, bands };
}

function main() {
  const doVerify = process.argv.includes('--verify');
  const items = generate();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, serializeBank(items));
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);
  const byLm = {}; for (const it of items) { const n = it.content.landmarks.length; byLm[n] = (byLm[n] || 0) + 1; }
  console.log(`[${TYPE_CODE}] landmarks:`, JSON.stringify(byLm));
  const tot = items.map(it => it.answer.optimalTotalMoves);
  console.log(`[${TYPE_CODE}] optimal closed tour: min ${Math.min(...tot)}, max ${Math.max(...tot)}`);
  const gx = items.map(it => it.answer.greedyExcess);
  console.log(`[${TYPE_CODE}] greedy excess (nearest-landmark route penalty): min ${Math.min(...gx)}, max ${Math.max(...gx)}`);

  const v = verify(items);
  let minBand = Infinity; const lines = [];
  for (let L = 1; L <= 20; L++) { lines.push(`  band ${String(L).padStart(2)} (+/-1pt): ${v.bands[L]}`); minBand = Math.min(minBand, v.bands[L]); }
  console.log(`[${TYPE_CODE}] key check (BFS all-pairs + tour re-solve + walk validation): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(lines.join('\n'));
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: every world fully reachable, optimum re-solved by BFS+tour search, witness walks validated, coverage satisfied, born-synthetic.`);
}

main();
