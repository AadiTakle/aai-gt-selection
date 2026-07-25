#!/usr/bin/env node
// GB-ROBOPATH-01 - Path Coder structured bank generator (grammar, game-based delivery).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/GB-ROBOPATH-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// GAME-BASED / INTERACTIVE type. The child does not pick one of four: they compose a whole
// PROGRAM (forward / turn-left / turn-right tokens, optionally with a repeat count) and run
// it, and the robot executes the entire plan. The valuable signal is the PROCESS - the build
// order, the edit/revision pattern, the pre-first-token planning pause, and above all the
// EFFICIENCY of the plan versus the true optimum. Per PS_GAMEBASED_WARRANT.md "game-based" is
// a delivery layer over the spatial construct, never a construct of its own, and the scored
// quantity is efficiency-vs-optimal, NOT speed.
//
// The optimum is COMPUTED, never guessed: a lexicographic Dijkstra over turtle states
// (row, col, heading, keysCollectedMask) minimises (primitive actions, then program tokens).
// Edges are "apply one command k times" for k = 1..maxReps, costing (k actions, 1 token), so
// the token optimum respects the item's instruction set exactly. Because there are no
// enumerated options, answer.distractorRationales documents the RESPONSE taxonomy a
// deterministic scorer uses (optimal / detour / crash / missed-key / incomplete) rather than
// per-option lures.
//
// Usage:
//   node generators/GB-ROBOPATH-01.mjs            # write bank
//   node generators/GB-ROBOPATH-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// SOLUTION DEPTH (target optimal-action count, ~3 -> ~50) and INSTRUCTION-SET COMPLEXITY
// (turn-free straight routes -> relative turns -> repeat counts up to x4), plus grid size,
// obstacle density and the number of keys that must be sequenced before the door.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/GB-ROBOPATH-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'GB-ROBOPATH-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'gb-robopath-01-grammar@1';
const DEMO_PATH = 'demos/GB-ROBOPATH-01.html';
const SOLVER_ID = 'gb-robopath-01-turtle-lex@1';

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
const round2 = (x) => Math.round(x * 100) / 100;
const rnd = (rng, n) => Math.floor(rng() * n);

// ---------------------------------------------------------------------------
// Turtle world.
// ---------------------------------------------------------------------------
const HEADINGS = ['N', 'E', 'S', 'W'];
const DELTA = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const COMMANDS = ['F', 'L', 'R'];
function turn(h, cmd) {
  const i = HEADINGS.indexOf(h);
  return cmd === 'R' ? HEADINGS[(i + 1) % 4] : HEADINGS[(i + 3) % 4];
}

// Minimal binary heap keyed by numeric cost.
function heapPush(h, node) {
  h.push(node); let i = h.length - 1;
  while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; }
}
function heapPop(h) {
  const top = h[0], last = h.pop();
  if (h.length) { h[0] = last; let i = 0;
    for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
      if (l < h.length && h[l][0] < h[m][0]) m = l;
      if (r < h.length && h[r][0] < h[m][0]) m = r;
      if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } }
  return top;
}

const TOKEN_UNIT = 1;        // lexicographic packing: cost = actions*ACTION_UNIT + tokens
const ACTION_UNIT = 4096;    // tokens per solution can never reach 4096 on these grids

// Lexicographic optimum: fewest primitive actions, then fewest program tokens.
// Returns { actions, tokens, program:[{cmd,reps}], actionSeq:['F','L',...] } or null.
export function solveOptimal(R, C, wallSet, start, keys, door, maxReps) {
  const K = keys.length, FULL = (1 << K) - 1;
  const keyIndex = new Map(); keys.forEach((k, i) => keyIndex.set(k[0] + ',' + k[1], i));
  const nMask = 1 << K;
  const enc = (r, c, h, m) => (((r * C + c) * 4 + h) * nMask) + m;
  const total = R * C * 4 * nMask;
  const dist = new Float64Array(total).fill(Infinity);
  const prev = new Array(total).fill(null);
  const pickUp = (r, c, m) => { const i = keyIndex.get(r + ',' + c); return i === undefined ? m : (m | (1 << i)); };

  const h0 = HEADINGS.indexOf(start.h);
  const s0 = enc(start.r, start.c, h0, pickUp(start.r, start.c, 0));
  dist[s0] = 0;
  const heap = []; heapPush(heap, [0, s0]);
  let goal = -1;
  while (heap.length) {
    const [d, u] = heapPop(heap);
    if (d > dist[u]) continue;
    const m = u % nMask, rest = (u - m) / nMask;
    const h = rest % 4, cell = (rest - h) / 4;
    const c = cell % C, r = (cell - c) / C;
    if (r === door[0] && c === door[1] && m === FULL) { goal = u; break; }
    for (const cmd of COMMANDS) {
      let cr = r, cc = c, ch = h, cm = m;
      for (let k = 1; k <= maxReps; k++) {
        if (cmd === 'F') {
          const [dr, dc] = DELTA[HEADINGS[ch]];
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nr >= R || nc < 0 || nc >= C || wallSet.has(nr + ',' + nc)) break;   // bump: illegal
          cr = nr; cc = nc; cm = pickUp(nr, nc, cm);
        } else ch = HEADINGS.indexOf(turn(HEADINGS[ch], cmd));
        const v = enc(cr, cc, ch, cm);
        const nd = d + k * ACTION_UNIT + TOKEN_UNIT;
        if (nd < dist[v]) { dist[v] = nd; prev[v] = { u, cmd, reps: k }; heapPush(heap, [nd, v]); }
      }
    }
  }
  if (goal < 0) return null;
  const program = [];
  let cur = goal;
  while (prev[cur]) { const p = prev[cur]; program.push({ cmd: p.cmd, reps: p.reps }); cur = p.u; }
  program.reverse();
  const actionSeq = [];
  program.forEach(t => { for (let i = 0; i < t.reps; i++) actionSeq.push(t.cmd); });
  const packed = dist[goal];
  return {
    actions: Math.floor(packed / ACTION_UNIT),
    tokens: packed % ACTION_UNIT,
    program,
    actionSeq,
  };
}

// Execute a primitive action sequence; returns {ok,r,c,h,keysLeft,crashedAt}.
export function runActions(R, C, wallSet, start, keys, actionSeq) {
  let r = start.r, c = start.c, h = start.h;
  const left = new Set(keys.map(k => k[0] + ',' + k[1]));
  left.delete(r + ',' + c);
  for (let i = 0; i < actionSeq.length; i++) {
    const cmd = actionSeq[i];
    if (cmd === 'F') {
      const [dr, dc] = DELTA[h]; const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= R || nc < 0 || nc >= C || wallSet.has(nr + ',' + nc)) return { ok: false, crashedAt: i, r, c, h, keysLeft: left.size };
      r = nr; c = nc; left.delete(r + ',' + c);
    } else h = turn(h, cmd);
  }
  return { ok: true, crashedAt: -1, r, c, h, keysLeft: left.size };
}

// ---------------------------------------------------------------------------
// Difficulty ramp. Levers per BUILD_PLAN 0 ladder:
//   K-1 ~ 1-4 | 2-3 ~ 4-8 | 4-5 ~ 8-12 | 6-8 ~ 12-16 | above-level ~ 16-20.
// targetActions = solution depth; maxReps = instruction-set complexity (1 = no repeat token).
// ---------------------------------------------------------------------------
const LEVELS = {
  1:  { R: 3, C: 3, walls: 0,  keys: 0, maxReps: 1, targetActions: 3 },
  2:  { R: 3, C: 4, walls: 1,  keys: 0, maxReps: 1, targetActions: 5 },
  3:  { R: 4, C: 4, walls: 2,  keys: 0, maxReps: 1, targetActions: 7 },
  4:  { R: 4, C: 4, walls: 2,  keys: 1, maxReps: 1, targetActions: 9 },
  5:  { R: 4, C: 5, walls: 3,  keys: 1, maxReps: 1, targetActions: 11 },
  6:  { R: 5, C: 5, walls: 4,  keys: 1, maxReps: 1, targetActions: 13 },
  7:  { R: 5, C: 5, walls: 5,  keys: 1, maxReps: 1, targetActions: 15 },
  8:  { R: 5, C: 6, walls: 5,  keys: 2, maxReps: 2, targetActions: 18 },
  9:  { R: 6, C: 6, walls: 6,  keys: 2, maxReps: 2, targetActions: 21 },
  10: { R: 6, C: 6, walls: 7,  keys: 2, maxReps: 2, targetActions: 24 },
  11: { R: 6, C: 7, walls: 8,  keys: 2, maxReps: 2, targetActions: 27 },
  12: { R: 7, C: 7, walls: 9,  keys: 2, maxReps: 3, targetActions: 30 },
  13: { R: 7, C: 7, walls: 10, keys: 3, maxReps: 3, targetActions: 33 },
  14: { R: 7, C: 8, walls: 11, keys: 3, maxReps: 3, targetActions: 36 },
  15: { R: 8, C: 8, walls: 12, keys: 3, maxReps: 3, targetActions: 39 },
  16: { R: 8, C: 8, walls: 13, keys: 3, maxReps: 4, targetActions: 42 },
  17: { R: 8, C: 9, walls: 15, keys: 3, maxReps: 4, targetActions: 45 },
  18: { R: 9, C: 9, walls: 17, keys: 3, maxReps: 4, targetActions: 49 },
  19: { R: 9, C: 10, walls: 19, keys: 3, maxReps: 4, targetActions: 53 },
  20: { R: 10, C: 10, walls: 22, keys: 3, maxReps: 4, targetActions: 58 },
};
const ITEMS_PER_LEVEL = 6;
const CANDIDATES = 40;      // candidate wall/start/door layouts per item
const KEY_LAYOUTS = 8;      // trial key placements per candidate world

// Program-token budget: a pure function of the grid and instruction set ONLY, so it can
// never leak how long the optimal program is. Always far above the optimum (asserted).
export function maxProgramTokensFor(R, C) { return 4 * R * C; }

// Age-band targeting hint from the difficulty rung. This type declares only 2-3 | 4-5 | 6-8 in
// catalog/master_types.jsonl, so the BUILD_PLAN ladder's bottom rungs target the lowest
// declared band rather than inventing K-1: the D-017 reading gate raises an age floor, it
// never lowers one. Boundary overlap is a targeting hint, not a hard cut.
export function ageBandsFor(difficulty) {
  const bands = [];
  const add = (b) => { if (!bands.includes(b)) bands.push(b); };
  if (difficulty < 8.5) add('2-3');
  if (difficulty >= 7.5 && difficulty < 12.5) add('4-5');
  if (difficulty >= 11.5) add('6-8');
  if (bands.length === 0) add(difficulty < 8 ? '2-3' : '6-8');
  return bands;
}

const RESPONSE_TAXONOMY = [
  { kind: 'solved_optimal', rationale: 'the program runs without a bump, collects every key and stops on the door, using exactly the optimal number of primitive actions (correct + maximally efficient)' },
  { kind: 'solved_detour', rationale: 'a legal solving program that uses more actions than the optimum (route or turn inefficiency; M-EFF < 1)' },
  { kind: 'solved_verbose', rationale: 'action-optimal but uses more program tokens than optimal (repeat counts not exploited; instruction-set inefficiency)' },
  { kind: 'crashed', rationale: 'a forward step ran into a wall or off the grid; the run aborts at that action (planning/simulation failure)' },
  { kind: 'missed_key', rationale: 'the robot stopped on the door but never stepped on one or more keys (goal decomposition failure)' },
  { kind: 'incomplete', rationale: 'the program ended somewhere other than the door with no crash (under-planned route)' },
];

// ---------------------------------------------------------------------------
// Candidate world generation.
// ---------------------------------------------------------------------------
// One candidate world = walls + start/door + several trial key layouts. The key layout whose
// optimum lands closest to the level's target solution depth wins, which is what makes the
// depth ramp smooth at the hard end (keys are the strongest lever on route length).
function genCandidate(rng, cfg) {
  const { R, C } = cfg;
  const margin = Math.max(1, Math.floor(C / 4));
  const start = { r: rnd(rng, R), c: rnd(rng, margin), h: HEADINGS[rnd(rng, 4)] };
  const door = [rnd(rng, R), C - 1 - rnd(rng, margin)];
  if (start.r === door[0] && start.c === door[1]) return null;
  if (Math.abs(start.r - door[0]) + Math.abs(start.c - door[1]) < Math.ceil((R + C) / 2)) return null;

  const free = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (r === start.r && c === start.c) continue;
    if (r === door[0] && c === door[1]) continue;
    free.push([r, c]);
  }
  for (let i = free.length - 1; i > 0; i--) { const j = rnd(rng, i + 1); [free[i], free[j]] = [free[j], free[i]]; }
  const wallSet = new Set();
  for (let i = 0; i < cfg.walls && i < free.length; i++) wallSet.add(free[i].join(','));
  const openCells = free.slice(cfg.walls);
  if (openCells.length < cfg.keys) return null;
  const walls = [...wallSet].map(s => s.split(',').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  let best = null, bestGap = Infinity;
  const trials = cfg.keys ? KEY_LAYOUTS : 1;
  for (let t = 0; t < trials; t++) {
    const keys = [];
    if (cfg.keys) {
      // Spread keys: each new key is the farthest of a few random draws from the anchors so
      // far, so higher rungs get genuinely long collect-then-exit routes rather than clusters.
      const anchors = [[start.r, start.c], door];
      while (keys.length < cfg.keys) {
        let pick = null, pickScore = -1;
        for (let s = 0; s < 5; s++) {
          const cand = openCells[rnd(rng, openCells.length)];
          if (keys.some(k => k[0] === cand[0] && k[1] === cand[1])) continue;
          const score = Math.min(...anchors.concat(keys).map(p => Math.abs(p[0] - cand[0]) + Math.abs(p[1] - cand[1])));
          if (score > pickScore) { pickScore = score; pick = cand; }
        }
        if (!pick) break;
        keys.push([pick[0], pick[1]]);
      }
      if (keys.length < cfg.keys) continue;
    }
    const opt = solveOptimal(R, C, wallSet, start, keys, door, cfg.maxReps);
    if (!opt) continue;                                     // unsolvable layout -> discard
    const gap = Math.abs(opt.actions - cfg.targetActions);
    if (gap < bestGap) { bestGap = gap; best = { R, C, start, door, keys, walls, wallSet, opt }; }
    if (gap === 0) break;
  }
  return best;
}

function buildItem(L, idx) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const cfg = LEVELS[L];

  let best = null, bestGap = Infinity;
  for (let t = 0; t < CANDIDATES; t++) {
    const cand = genCandidate(rng, cfg);
    if (!cand) continue;
    const gap = Math.abs(cand.opt.actions - cfg.targetActions);
    if (gap < bestGap) { best = cand; bestGap = gap; if (gap === 0) break; }
  }
  if (!best) {                                             // guaranteed fallback: open corridor
    const R = cfg.R, C = cfg.C;
    const start = { r: 0, c: 0, h: 'E' }, door = [R - 1, C - 1];
    const wallSet = new Set();
    const opt = solveOptimal(R, C, wallSet, start, [], door, cfg.maxReps);
    best = { R, C, start, door, keys: [], walls: [], wallSet, opt };
  }

  const { R, C, start, door, keys, walls, opt } = best;
  const repeatEnabled = cfg.maxReps > 1;
  const difficulty = round2(Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35))));
  const nKeys = keys.length;

  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'program_robot',
      keyCount: nKeys,
      prompt: nKeys
        ? `Build one program that takes the robot to the door and picks up all ${nKeys} key${nKeys > 1 ? 's' : ''} on the way. Use as few steps as you can, then press RUN.`
        : 'Build one program that takes the robot to the door. Use as few steps as you can, then press RUN.',
    },
    grid: { R, C },
    walls,
    start,
    door,
    keys,
    instructionSet: {
      commands: ['F', 'L', 'R'],
      turnsAreRelative: true,
      repeat: { enabled: repeatEnabled, maxReps: cfg.maxReps },
    },
    limits: { maxProgramTokens: maxProgramTokensFor(R, C) },
    optionKind: 'program',
    scaffold: { warmup: L <= 2 },
  };

  const answer = {
    correctKey: String(opt.actions),          // canonical cost key = optimal primitive actions
    canonicalSolution: {
      program: opt.program,                   // token form (uses repeat when it is allowed)
      actionSeq: opt.actionSeq,               // expanded primitive form
      actionCount: opt.actions,
      tokenCount: opt.tokens,
    },
    cost: { actions: opt.actions, tokens: opt.tokens },
    relation: 'min_actions_then_tokens_turtle_dijkstra',
    acceptedEquivalence: {
      rule: 'any_legal_solution_of_equal_action_cost',
      note: 'Alternate optima exist (mirror routes, equal-cost turn orders, and repeat/flat token forms). '
        + 'A submission is CORRECT iff its expanded action sequence never bumps a wall or edge, steps on every key, '
        + 'and ends on the door. It is OPTIMAL iff, in addition, its action count equals cost.actions. '
        + 'Token economy is judged separately against cost.tokens and only when instructionSet.repeat.enabled.',
      efficiency: 'M-EFF = cost.actions / executedActionCount (1.0 = optimal, capped at 1.0)',
    },
    distractorRationales: RESPONSE_TAXONOMY,
  };

  return {
    itemId: seededUuid(seed),
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    demoPath: DEMO_PATH,
    content,
    answer,
    scoring: { mode: 'computed_solver', solverId: SOLVER_ID, partialCredit: true },
    provenance: {
      generator: 'grammar',
      generatorRef: GENERATOR_REF,
      seed,
      levers: { level: L, R, C, walls: walls.length, keys: nKeys, maxReps: cfg.maxReps, targetActions: cfg.targetActions, optimalActions: opt.actions, optimalTokens: opt.tokens },
    },
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
// Independent self-verification (the standalone checker re-does this from the JSONL).
// ---------------------------------------------------------------------------
function verify(items) {
  let ok = 0, bad = 0; const problems = [];
  const bands = {}; for (let L = 1; L <= 20; L++) bands[L] = 0;
  const seenIds = new Set();
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (seenIds.has(it.itemId)) problems.push(`${it.itemId}: duplicate itemId`); seenIds.add(it.itemId);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.difficulty < 1 || it.difficulty > 20) problems.push(`${it.itemId}: difficulty out of range`);
    if (it.scoring.mode !== 'computed_solver') problems.push(`${it.itemId}: scoring mode wrong`);
    const c = it.content, a = it.answer;
    for (const leak of ['answer', 'canonicalSolution', 'optimalActions', 'cost', 'solution']) if (leak in c) problems.push(`${it.itemId}: content leaks ${leak}`);

    const wallSet = new Set(c.walls.map(w => w.join(',')));
    const re = solveOptimal(c.grid.R, c.grid.C, wallSet, c.start, c.keys, c.door, c.instructionSet.repeat.maxReps);
    if (!re) { bad++; problems.push(`${it.itemId}: UNSOLVABLE`); continue; }
    if (String(re.actions) !== a.correctKey) { bad++; problems.push(`${it.itemId}: recomputed ${re.actions} != correctKey ${a.correctKey}`); continue; }
    if (re.tokens !== a.cost.tokens) { bad++; problems.push(`${it.itemId}: recomputed tokens ${re.tokens} != ${a.cost.tokens}`); continue; }
    const run = runActions(c.grid.R, c.grid.C, wallSet, c.start, c.keys, a.canonicalSolution.actionSeq);
    if (!run.ok || run.keysLeft !== 0 || run.r !== c.door[0] || run.c !== c.door[1]) { bad++; problems.push(`${it.itemId}: stored program does not solve the world`); continue; }
    if (a.canonicalSolution.actionSeq.length !== re.actions) { bad++; problems.push(`${it.itemId}: stored actionSeq length != optimum`); continue; }
    if (c.limits.maxProgramTokens < re.tokens) { bad++; problems.push(`${it.itemId}: token budget below the optimum`); continue; }
    ok++;
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
  const acts = items.map(it => it.answer.cost.actions);
  const toks = items.map(it => it.answer.cost.tokens);
  console.log(`[${TYPE_CODE}] optimal actions: min ${Math.min(...acts)}, max ${Math.max(...acts)}`);
  console.log(`[${TYPE_CODE}] optimal tokens:  min ${Math.min(...toks)}, max ${Math.max(...toks)}`);
  const byKeys = {}; for (const it of items) { const k = it.content.keys.length; byKeys[k] = (byKeys[k] || 0) + 1; }
  console.log(`[${TYPE_CODE}] keys per item:`, JSON.stringify(byKeys));
  const withRepeat = items.filter(it => it.content.instructionSet.repeat.enabled).length;
  console.log(`[${TYPE_CODE}] items with repeat tokens enabled: ${withRepeat}`);

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (turtle re-solve + program replay): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min +/-1pt band count = ${cov.minBand}, need >= 5):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < 5) { console.error(`[${TYPE_CODE}] FAIL: coverage below 5 in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: every world solvable, optima re-derived, coverage satisfied, born-synthetic.`);
}

if (process.argv[1] && process.argv[1].endsWith('GB-ROBOPATH-01.mjs')) main();
