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
// maze size (R x C), loop density (braiding = more decision points), and the number of
// gems that must be sequenced (0 -> 3, a small travelling-salesman planning load).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
function braid(R, C, open, p, rng) {
  let extra = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) neighborsOf(r, c, R, C).forEach(([nr, nc]) => {
    const k = edgeKey([r, c], [nr, nc]);
    if (!open.has(k) && rng() < p) { open.add(k); extra++; }
  });
  return extra;
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
const PROFILES = {
  1: { R: 4, C: 4, braid: 0.00, gems: 0 },
  2: { R: 4, C: 5, braid: 0.02, gems: 0 },
  3: { R: 5, C: 5, braid: 0.03, gems: 0 },
  4: { R: 5, C: 6, braid: 0.04, gems: 0 },
  5: { R: 6, C: 6, braid: 0.05, gems: 1 },
  6: { R: 6, C: 7, braid: 0.06, gems: 1 },
  7: { R: 7, C: 7, braid: 0.07, gems: 1 },
  8: { R: 7, C: 8, braid: 0.08, gems: 1 },
  9: { R: 8, C: 8, braid: 0.09, gems: 2 },
  10: { R: 8, C: 9, braid: 0.10, gems: 2 },
  11: { R: 9, C: 9, braid: 0.10, gems: 2 },
  12: { R: 9, C: 10, braid: 0.11, gems: 2 },
  13: { R: 10, C: 10, braid: 0.12, gems: 2 },
  14: { R: 10, C: 10, braid: 0.13, gems: 3 },
  15: { R: 10, C: 11, braid: 0.13, gems: 3 },
  16: { R: 11, C: 11, braid: 0.14, gems: 3 },
  17: { R: 11, C: 11, braid: 0.15, gems: 3 },
  18: { R: 11, C: 12, braid: 0.15, gems: 3 },
  19: { R: 12, C: 12, braid: 0.16, gems: 3 },
  20: { R: 12, C: 12, braid: 0.16, gems: 3 },
};
const ITEMS_PER_LEVEL = 5;

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
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const prof = PROFILES[L];
  const R = prof.R, C = prof.C;
  const start = [0, 0], goal = [R - 1, C - 1];
  let open;
  for (let t = 0; t < 8; t++) { open = carve(R, C, rng); const extra = braid(R, C, open, prof.braid, rng); if (extra >= 1 || prof.braid === 0) break; }

  // gem placement on interior cells (not start/goal), deterministic.
  const cellsPool = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (!(r === 0 && c === 0) && !(r === R - 1 && c === C - 1)) cellsPool.push([r, c]);
  const gems = [];
  while (gems.length < prof.gems && cellsPool.length) { const gi = Math.floor(rng() * cellsPool.length); gems.push(cellsPool.splice(gi, 1)[0]); }

  const plan = optimalPlan(R, C, open, start, goal, gems);
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
  const opt = items.map(it => it.answer.optimalLength);
  console.log(`[${TYPE_CODE}] optimal length: min ${Math.min(...opt)}, max ${Math.max(...opt)}`);

  const v = verify(items);
  const cov = coverageReport(v.bands);
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
