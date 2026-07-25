#!/usr/bin/env node
// SPA-ROLL-01 - Rolling-Cube structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-ROLL-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// A cube with six painted faces rolls along a lattice path. The symbol that ends up on
// the asked face (TOP or FRONT) is COMPUTED by composing integer roll matrices - never
// guessed. The independent verifier re-derives the same landing face with a SEPARATE
// permutation roller (different code path) and requires agreement, so the animation the
// child sees and the scored key provably match.
//
// Usage:
//   node generators/SPA-ROLL-01.mjs            # write bank
//   node generators/SPA-ROLL-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// path length (rolls), number of turns, asked face (TOP -> FRONT), removal of the
// step-through scaffold, board size, and number of options (3 -> all 6 symbols).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-ROLL-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'SPA-ROLL-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'SPA-ROLL-01@1';

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
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// ---------------------------------------------------------------------------
// KEY-POSITION BALANCE (E-073)
// Shuffling every item's options independently still leaves the correct key's
// POSITION uneven over the bank: the ramp shows 3 options at the floor and 6 at
// the ceiling, so the head slots collect the surplus and the modal key beats
// chance. An uneven pseudo-guessing floor inflates low-ability accuracy
// (M-ACC), so the bank allocates each item a target slot from a least-loaded
// counter and the item seats its correct option there. The option SET, the
// lures and the difficulty profile are untouched.
//
// Slots are allocated uniformly WITHIN each option-count stratum first and only
// then balanced across the whole bank. Option count is itself a difficulty
// lever, so balancing the pooled key counts alone would make the last slot of
// the rarer long items almost always correct — a larger exploit than the one
// being fixed.
// ---------------------------------------------------------------------------
function makeSlotAllocator(maxSlots) {
  const globalUse = new Array(maxSlots).fill(0);
  const byOptionCount = new Map();
  let tick = 0;
  return (n) => {
    if (!byOptionCount.has(n)) byOptionCount.set(n, new Array(n).fill(0));
    const localUse = byOptionCount.get(n);
    let best = tick % n;
    for (let k = 1; k < n; k++) {
      const i = (tick + k) % n;
      if (localUse[i] < localUse[best] || (localUse[i] === localUse[best] && globalUse[i] < globalUse[best])) best = i;
    }
    tick++; localUse[best]++; globalUse[best]++; return best;
  };
}
// Seat the correct entry of an already-shuffled list at the allocated slot,
// leaving the distractors in their shuffled relative order.
function seatCorrect(list, isCorrect, slotFor) {
  const ci = list.findIndex(isCorrect);
  const at = slotFor(list.length);
  if (ci < 0 || at < 0 || at >= list.length) return list;
  const rest = list.filter((_, i) => i !== ci);
  return [...rest.slice(0, at), list[ci], ...rest.slice(at)];
}

function seededUuid(seedStr) {
  const b = new Uint8Array(16);
  let h = hashStr(seedStr);
  for (let i = 0; i < 16; i++) { h = (Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i * 0x9e3779b1) >>> 0; b[i] = h & 0xff; }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

// ---------------------------------------------------------------------------
// Faces (no-emoji house style: geometric glyphs) + cube slots.
// ---------------------------------------------------------------------------
const COLORS = ['#ef6b8f', '#5267df', '#28ad9c', '#f5ad32', '#9b6be8', '#3eb7d3'];
const SYMBOLS = ['\u25C6', '\u25CF', '\u25B2', '\u25A0', '\u2605', '\u271A']; // diamond circle triangle square star plus
const FACES = SYMBOLS.map((sym, i) => ({ sym, col: COLORS[i] }));
const KEYS = ['U', 'D', 'N', 'S', 'E', 'W'];
const OPP = { U: 'D', D: 'U', N: 'S', S: 'N', E: 'W', W: 'E' };

// ---------------------------------------------------------------------------
// Integer orientation matrices (CSS axes, Y down) - identical convention to the demo.
// ---------------------------------------------------------------------------
const RZp = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];   // roll East
const RZn = [[0, 1, 0], [-1, 0, 0], [0, 0, 1]];   // roll West
const RXp = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];   // roll North (away)
const RXn = [[1, 0, 0], [0, 0, 1], [0, -1, 0]];   // roll South (toward)
const ROLL = { E: RZp, W: RZn, N: RXp, S: RXn };
const MOVE = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };
const ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function matmul(A, B) { const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += A[i][k] * B[k][j]; R[i][j] = s; } return R; }
function transpose(A) { return [[A[0][0], A[1][0], A[2][0]], [A[0][1], A[1][1], A[2][1]], [A[0][2], A[1][2], A[2][2]]]; }
function applyM(A, v) { return [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2], A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2], A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]]; }
function faceKey(n) { n = n.map(Math.round); if (n[0] === 1) return 'E'; if (n[0] === -1) return 'W'; if (n[1] === 1) return 'D'; if (n[1] === -1) return 'U'; if (n[2] === 1) return 'S'; return 'N'; }
const ASKVEC = { top: [0, -1, 0], front: [0, 0, 1] };
function faceUnderAsk(M, ask) { return faceKey(applyM(transpose(M), ASKVEC[ask])); }
// Compose all rolls from identity and return the slot landing under the asked face.
function landingSlotMatrix(dirs, ask) { let M = ID; for (const d of dirs) M = matmul(ROLL[d], M); return faceUnderAsk(M, ask); }

// Independent permutation roller (SEPARATE code path used only for verification).
// State = which body slot currently occupies each world position.
function landingSlotPermutation(dirs, ask) {
  let s = { top: 'U', bottom: 'D', north: 'N', south: 'S', east: 'E', west: 'W' };
  for (const d of dirs) {
    const p = { ...s };
    if (d === 'E') { s.top = p.west; s.east = p.top; s.bottom = p.east; s.west = p.bottom; }
    else if (d === 'W') { s.top = p.east; s.west = p.top; s.bottom = p.west; s.east = p.bottom; }
    else if (d === 'N') { s.top = p.south; s.north = p.top; s.bottom = p.north; s.south = p.bottom; }
    else if (d === 'S') { s.top = p.north; s.south = p.top; s.bottom = p.south; s.north = p.bottom; }
  }
  return ask === 'top' ? s.top : s.south;   // front = south (+z, toward viewer)
}

// ---------------------------------------------------------------------------
// Path generation on a W x H lattice (deterministic).
// ---------------------------------------------------------------------------
function isRev(a, b) { return (a === 'E' && b === 'W') || (a === 'W' && b === 'E') || (a === 'N' && b === 'S') || (a === 'S' && b === 'N'); }
function genPath(P, rng) {
  const W = P.grid, H = P.grid; let best = null;
  for (let t = 0; t < 500; t++) {
    let x = Math.floor(W / 2), z = Math.floor(H / 2); const cells = [{ x, z }], dirs = []; let turns = 0, prev = null, ok = true;
    for (let i = 0; i < P.len; i++) {
      let opts = ['E', 'W', 'N', 'S'].filter(k => { const nx = x + MOVE[k][0], nz = z + MOVE[k][1]; return nx >= 0 && nx < W && nz >= 0 && nz < H && !(prev && isRev(k, prev)); });
      if (prev && turns >= P.turns) { const st = opts.filter(k => k === prev); if (st.length) opts = st; }
      if (!opts.length) { ok = false; break; }
      const k = opts[Math.floor(rng() * opts.length)];
      if (prev && k !== prev) turns++;
      x += MOVE[k][0]; z += MOVE[k][1]; cells.push({ x, z }); dirs.push(k); prev = k;
    }
    if (ok && dirs.length === P.len && turns <= P.turns) { best = { cells, dirs, turns }; if (turns >= Math.min(P.turns, 1) || P.turns === 0) break; }
  }
  return best || { cells: [{ x: Math.floor(P.grid / 2), z: Math.floor(P.grid / 2) }, { x: Math.floor(P.grid / 2) + 1, z: Math.floor(P.grid / 2) }], dirs: ['E'], turns: 0 };
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
// ---------------------------------------------------------------------------
const PROFILES = {
  1: { len: 1, turns: 0, ask: 'top', step: true, nOpt: 3, grid: 5 },
  2: { len: 2, turns: 0, ask: 'top', step: true, nOpt: 3, grid: 5 },
  3: { len: 2, turns: 1, ask: 'top', step: true, nOpt: 3, grid: 5 },
  4: { len: 3, turns: 1, ask: 'top', step: true, nOpt: 4, grid: 5 },
  5: { len: 3, turns: 1, ask: 'top', step: true, nOpt: 4, grid: 5 },
  6: { len: 4, turns: 2, ask: 'top', step: true, nOpt: 4, grid: 5 },
  7: { len: 4, turns: 2, ask: 'top', step: false, nOpt: 5, grid: 5 },
  8: { len: 5, turns: 2, ask: 'top', step: false, nOpt: 5, grid: 5 },
  9: { len: 5, turns: 3, ask: 'top', step: false, nOpt: 5, grid: 5 },
  10: { len: 6, turns: 3, ask: 'top', step: false, nOpt: 6, grid: 5 },
  11: { len: 6, turns: 3, ask: 'front', step: false, nOpt: 6, grid: 6 },
  12: { len: 7, turns: 3, ask: 'front', step: false, nOpt: 6, grid: 6 },
  13: { len: 7, turns: 4, ask: 'front', step: false, nOpt: 6, grid: 6 },
  14: { len: 8, turns: 4, ask: 'front', step: false, nOpt: 6, grid: 6 },
  15: { len: 8, turns: 4, ask: 'front', step: false, nOpt: 6, grid: 6 },
  16: { len: 9, turns: 4, ask: 'front', step: false, nOpt: 6, grid: 7 },
  17: { len: 9, turns: 5, ask: 'front', step: false, nOpt: 6, grid: 7 },
  18: { len: 10, turns: 5, ask: 'front', step: false, nOpt: 6, grid: 7 },
  19: { len: 10, turns: 5, ask: 'front', step: false, nOpt: 6, grid: 7 },
  20: { len: 11, turns: 5, ask: 'front', step: false, nOpt: 6, grid: 7 },
};
const ITEMS_PER_LEVEL = 5;
const OPT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const ADJ = {
  U: ['N', 'S', 'E', 'W'], D: ['N', 'S', 'E', 'W'],
  N: ['U', 'D', 'E', 'W'], S: ['U', 'D', 'E', 'W'],
  E: ['U', 'D', 'N', 'S'], W: ['U', 'D', 'N', 'S'],
};

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildOptions(paint, finalKey, startKey, prof, rng, slotFor) {
  const correctSym = paint[finalKey].sym;
  const seenSlots = new Set([finalKey]);
  const distractors = [];
  const addSlot = (slot, lure) => {
    if (distractors.length >= prof.nOpt - 1) return;
    if (!slot || seenSlots.has(slot)) return;
    seenSlots.add(slot); distractors.push({ slot, lure });
  };
  addSlot(startKey, 'no_track');            // kept the starting face (did not roll it mentally)
  addSlot(OPP[finalKey], 'opposite');       // the face opposite the landing face
  for (const s of shuffle(rng, ADJ[finalKey])) addSlot(s, 'near_miss'); // faces adjacent to the answer
  for (const s of shuffle(rng, KEYS)) addSlot(s, 'random');             // anything else remaining
  const chosen = seatCorrect(shuffle(rng, [{ slot: finalKey, lure: 'correct' }, ...distractors]), c => c.lure === 'correct', slotFor);
  const options = chosen.map((c, i) => ({ key: OPT_KEYS[i], sym: paint[c.slot].sym, color: paint[c.slot].col }));
  const distractorRationales = chosen.map(c => c.lure);
  const correctKey = chosen.map((c, i) => ({ c, key: OPT_KEYS[i] })).find(o => o.c.slot === finalKey).key;
  return { options, distractorRationales, correctKey, correctSym };
}

function buildItem(L, idx, slotFor) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const prof = PROFILES[L];
  const startKey = faceKey(ASKVEC[prof.ask]);
  let path = null, paint = null, finalKey = null;
  for (let t = 0; t < 80; t++) {
    path = genPath(prof, rng);
    const sh = shuffle(rng, FACES); paint = {}; KEYS.forEach((k, i) => paint[k] = sh[i]);
    finalKey = landingSlotMatrix(path.dirs, prof.ask);
    if (finalKey !== startKey) break;   // the asked face must actually change
  }
  const { options, distractorRationales, correctKey, correctSym } = buildOptions(paint, finalKey, startKey, prof, rng, slotFor);
  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;

  const content = {
    typeCode: TYPE_CODE,
    question: { mode: 'roll_cube', ask: prof.ask, prompt: prof.ask === 'top' ? 'Which symbol lands on the TOP face?' : 'Which symbol ends up on the FRONT face (toward you)?', askTag: prof.ask === 'top' ? 'which symbol lands on TOP?' : 'which symbol faces YOU (front)?' },
    grid: { W: prof.grid, H: prof.grid },
    cube: { faces: paint },     // slot -> {sym,col}; renderer paints the cube and rolls it
    path: { cells: path.cells, dirs: path.dirs, turns: path.turns },
    optionKind: 'symbol',
    options,
    scaffold: { step: prof.step, warmup: prof.step },
  };
  const answer = { correctKey, correctSym, finalKey, startKey, relation: 'roll_orientation', distractorRationales };
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
  const slotFor = makeSlotAllocator(OPT_KEYS.length);
  for (let L = 1; L <= 20; L++) for (let i = 0; i < ITEMS_PER_LEVEL; i++) items.push(buildItem(L, i, slotFor));
  return items;
}

// ---------------------------------------------------------------------------
// Independent verification: re-roll via the PERMUTATION method, match against options.
// ---------------------------------------------------------------------------
function independentKey(item) {
  const c = item.content;
  const slot = landingSlotPermutation(c.path.dirs, c.question.ask);   // separate roller
  const sym = c.cube.faces[slot].sym;
  const matches = c.options.filter(o => o.sym === sym);
  return matches.length === 1 ? matches[0].key : `AMBIGUOUS(${matches.length})`;
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
    for (const o of it.content.options) if ('lure' in o || 'correct' in o) problems.push(`${it.itemId}: option leaks answer`);
    // the asked face must actually change from the start orientation
    if (it.answer.finalKey === it.answer.startKey) problems.push(`${it.itemId}: asked face did not change`);
    // matrix landing (as generated) must match permutation landing (independent)
    const mKey = landingSlotMatrix(it.content.path.dirs, it.content.question.ask);
    if (mKey !== it.answer.finalKey) problems.push(`${it.itemId}: stored finalKey ${it.answer.finalKey} != matrix ${mKey}`);
    const nCorrect = it.answer.distractorRationales.filter(r => r === 'correct').length;
    if (nCorrect !== 1) problems.push(`${it.itemId}: expected 1 correct rationale, got ${nCorrect}`);
    if (it.answer.distractorRationales.length !== it.content.options.length) problems.push(`${it.itemId}: rationale/option length mismatch`);
    const k = independentKey(it);
    if (k === it.answer.correctKey) ok++; else { bad++; problems.push(`${it.itemId}: key ${it.answer.correctKey} != recomputed ${k} (${it.content.question.ask}/${it.content.path.dirs.join('')})`); }
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
  const byAsk = {}; for (const it of items) byAsk[it.content.question.ask] = (byAsk[it.content.question.ask] || 0) + 1;
  console.log(`[${TYPE_CODE}] ask:`, JSON.stringify(byAsk));
  const byOpts = {}; for (const it of items) { const n = it.content.options.length; byOpts[n] = (byOpts[n] || 0) + 1; }
  console.log(`[${TYPE_CODE}] option counts:`, JSON.stringify(byOpts));

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (matrix vs permutation): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${cov.minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: keys agree across two independent rollers, coverage satisfied, born-synthetic.`);
}

main();
