#!/usr/bin/env node
// SPA-FOLDNET-01 - Fold-the-Net structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-FOLDNET-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// The correct opposite/adjacent face (and the correct solid for the net-to-solid shell)
// is COMPUTED from a face-adjacency map derived from the solid topology - never guessed.
// For box nets the map is produced by an explicit cube-rolling fold simulation over the
// polyomino net; for prisms/pyramids it is the analytic adjacency of the chosen solid.
//
// Usage:
//   node generators/SPA-FOLDNET-01.mjs            # write bank
//   node generators/SPA-FOLDNET-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// net regularity, solid type (cube -> prism/pyramid), opposite-vs-adjacent question,
// number of candidate options, face style (color -> symbol), and fold-scaffold on/off.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-FOLDNET-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'SPA-FOLDNET-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'SPA-FOLDNET-01@1';

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
// Deterministic RFC-4122-shaped uuid (v4 layout) from a seed string.
// ---------------------------------------------------------------------------
// KEY-POSITION BALANCE (E-073)
// Shuffling every item's options independently still leaves the correct key's
// POSITION uneven over the bank: the ramp shows 2 options at the floor and 6 at
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
// Palettes (no-emoji house style: geometric glyphs / dingbats only).
// ---------------------------------------------------------------------------
const COLORS = ['#ef6b8f', '#5267df', '#28ad9c', '#f5ad32', '#9b6be8', '#3eb7d3', '#f07f4f', '#62b86c', '#d94f7a', '#4a8fd6'];
const SYMBOLS = ['\u25C6', '\u25CF', '\u25B2', '\u25A0', '\u2605', '\u271A', '\u2B1F', '\u2726', '\u25D6', '\u2B22'];

// ---------------------------------------------------------------------------
// Solid topology + face-adjacency / opposite maps.
// faceCount / family drive the net-to-solid confusability lures.
// ---------------------------------------------------------------------------
const FAMILY = { cube: 'box', rect: 'box', tri: 'prism', pent: 'prism', hex: 'prism', tetra: 'pyramid', pyramid: 'pyramid' };
const FACE_COUNT = { cube: 6, rect: 6, tri: 5, pent: 7, hex: 8, tetra: 4, pyramid: 5 };

// Box (cube/rect): faces 0=Up 1=Down 2=Front 3=Back 4=Left 5=Right.
const BOX_OPPOSITE = { 0: 1, 1: 0, 2: 3, 3: 2, 4: 5, 5: 4 };
function boxAdjacency(f) { return [0, 1, 2, 3, 4, 5].filter(x => x !== f && x !== BOX_OPPOSITE[f]); }

// n-gonal prism: sides 0..n-1, capTop = n, capBottom = n+1.
function prismModel(n) {
  const faces = []; for (let i = 0; i < n + 2; i++) faces.push(i);
  const CT = n, CB = n + 1;
  const adjacency = {}, opposite = {};
  for (let i = 0; i < n; i++) {
    adjacency[i] = [((i - 1) % n + n) % n, (i + 1) % n, CT, CB];
    opposite[i] = (n % 2 === 0) ? (i + n / 2) % n : null; // sides have an opposite only when n is even
  }
  adjacency[CT] = [...Array(n).keys()]; adjacency[CB] = [...Array(n).keys()];
  opposite[CT] = CB; opposite[CB] = CT;
  return { faces, adjacency, opposite };
}
// Square pyramid: base = 4, side triangles 0..3 (up,right,down,left).
function sqPyramidModel() {
  const adjacency = { 0: [4, 1, 3], 1: [4, 0, 2], 2: [4, 1, 3], 3: [4, 2, 0], 4: [0, 1, 2, 3] };
  const opposite = { 0: 2, 1: 3, 2: 0, 3: 1, 4: null };
  return { faces: [0, 1, 2, 3, 4], adjacency, opposite };
}
// Tetrahedron: 4 faces, mutually adjacent, no opposite.
function tetraModel() {
  const adjacency = { 0: [1, 2, 3], 1: [0, 2, 3], 2: [0, 1, 3], 3: [0, 1, 2] };
  const opposite = { 0: null, 1: null, 2: null, 3: null };
  return { faces: [0, 1, 2, 3], adjacency, opposite };
}
function solidModel(kind) {
  if (kind === 'cube' || kind === 'rect') {
    const adjacency = {}, opposite = {};
    for (let f = 0; f < 6; f++) { adjacency[f] = boxAdjacency(f); opposite[f] = BOX_OPPOSITE[f]; }
    return { faces: [0, 1, 2, 3, 4, 5], adjacency, opposite };
  }
  if (kind === 'tri') return prismModel(3);
  if (kind === 'pent') return prismModel(5);
  if (kind === 'hex') return prismModel(6);
  if (kind === 'tetra') return tetraModel();
  if (kind === 'pyramid') return sqPyramidModel();
  throw new Error('unknown solid ' + kind);
}

// ---------------------------------------------------------------------------
// Cube-rolling fold simulation for BOX nets.
// A valid unfolding is equivalent to rolling a cube across the plane, stamping the
// bottom face at each visited cell. Track face ids in slots T/B/N/S/E/W; each 90-deg
// fold across a shared net edge is a roll. The face touching the paper (B slot) is the
// cell's face. Any valid net therefore yields a correct, distinct face per cell.
// ---------------------------------------------------------------------------
function rollOrient(o, dir) {
  if (dir === 'R') return { T: o.W, B: o.E, N: o.N, S: o.S, E: o.T, W: o.B };
  if (dir === 'L') return { T: o.E, B: o.W, N: o.N, S: o.S, E: o.B, W: o.T };
  if (dir === 'U') return { T: o.S, B: o.N, N: o.T, S: o.B, E: o.E, W: o.W };
  if (dir === 'D') return { T: o.N, B: o.S, N: o.B, S: o.T, E: o.E, W: o.W };
  throw new Error('bad dir');
}
// cells: array of [col,row]. Returns { faceOf: Map "col,row"->faceId } or null if invalid.
function foldBoxNet(cells) {
  const key = (c) => c[0] + ',' + c[1];
  const set = new Map(cells.map((c, i) => [key(c), i]));
  const start = 0;
  const init = { T: 3, B: 2, N: 0, S: 1, E: 5, W: 4 }; // start cell stamps Front(2), matches demo center
  const faceOf = new Map();
  const orientAt = new Map();
  faceOf.set(key(cells[start]), init.B);
  orientAt.set(key(cells[start]), init);
  const queue = [cells[start]];
  const steps = [['R', [1, 0]], ['L', [-1, 0]], ['D', [0, 1]], ['U', [0, -1]]];
  while (queue.length) {
    const c = queue.shift();
    const o = orientAt.get(key(c));
    for (const [dir, [dx, dy]] of steps) {
      const nc = [c[0] + dx, c[1] + dy];
      const nk = key(nc);
      if (!set.has(nk) || orientAt.has(nk)) continue;
      const no = rollOrient(o, dir);
      orientAt.set(nk, no); faceOf.set(nk, no.B); queue.push(nc);
    }
  }
  if (faceOf.size !== cells.length) return null;         // net not connected
  const distinct = new Set(faceOf.values());
  if (cells.length === 6 && distinct.size !== 6) return null; // not a valid cube net
  return { faceOf };
}

// Candidate box net polyominoes (col,row). Validated by the fold sim; invalid ones drop.
const BOX_NET_CANDIDATES = [
  { name: 'cross', regular: true, cells: [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]] },
  { name: 'tee', regular: true, cells: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [1, 3]] },
  { name: 'zigzag', regular: false, cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]] },
  { name: 'stairs', regular: false, cells: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 3]] },
  { name: 'offset', regular: false, cells: [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]] },
  { name: 'longL', regular: false, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]] },
];
const BOX_NETS = BOX_NET_CANDIDATES.filter(n => foldBoxNet(n.cells) !== null);

// ---------------------------------------------------------------------------
// Net layout geometry (SVG coords, 360 x 260 viewBox) for the pure renderer.
// Each cell: { faceId, shape, ... , color, symbol, marked }.
// ---------------------------------------------------------------------------
function boxNetCells(kind, layout, faceStyle, colorOf, symbolOf, markedFaceId) {
  const aw = kind === 'rect' ? 50 : 44, ah = kind === 'rect' ? 38 : 44;
  const cols = layout.cells.map(c => c[0]), rows = layout.cells.map(c => c[1]);
  const w = (Math.max(...cols) + 1) * aw, h = (Math.max(...rows) + 1) * ah;
  const ox = (360 - w) / 2, oy = (260 - h) / 2;
  const { faceOf } = foldBoxNet(layout.cells);
  return layout.cells.map(c => {
    const faceId = faceOf.get(c[0] + ',' + c[1]);
    return {
      faceId, shape: 'rect', x: ox + c[0] * aw, y: oy + c[1] * ah, w: aw, h: ah,
      color: colorOf[faceId], symbol: faceStyle === 'symbol' ? symbolOf[faceId] : '', marked: faceId === markedFaceId,
    };
  });
}
function ngonPoints(cx, cy, r, n, rot = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos(rot + i * 2 * Math.PI / n), cy + r * Math.sin(rot + i * 2 * Math.PI / n)]);
}
function prismNetCells(n, kind, layout, faceStyle, colorOf, symbolOf, markedFaceId) {
  const sw = n <= 3 ? 60 : n === 5 ? 46 : 40, sh = 64;
  const stripW = n * sw, ox = (360 - stripW) / 2, oy = 130 - sh / 2;
  const CT = n, CB = n + 1;
  const cells = [];
  for (let i = 0; i < n; i++) {
    cells.push({ faceId: i, shape: 'rect', x: ox + i * sw, y: oy, w: sw, h: sh, color: colorOf[i], symbol: faceStyle === 'symbol' ? symbolOf[i] : '', marked: i === markedFaceId });
  }
  const r = sw * 0.6;
  const topSide = layout.capTopAt % n, botSide = layout.capBotAt % n;
  const ctc = [ox + topSide * sw + sw / 2, oy - r - 2];
  const cbc = [ox + botSide * sw + sw / 2, oy + sh + r + 2];
  cells.push({ faceId: CT, shape: 'poly', points: ngonPoints(ctc[0], ctc[1], r, n), color: colorOf[CT], symbol: faceStyle === 'symbol' ? symbolOf[CT] : '', marked: CT === markedFaceId });
  cells.push({ faceId: CB, shape: 'poly', points: ngonPoints(cbc[0], cbc[1], r, n), color: colorOf[CB], symbol: faceStyle === 'symbol' ? symbolOf[CB] : '', marked: CB === markedFaceId });
  return cells;
}
function sqPyramidNetCells(faceStyle, colorOf, symbolOf, markedFaceId) {
  const cx = 180, cy = 130, s = 58, t = 54;
  const base = { faceId: 4, shape: 'rect', x: cx - s / 2, y: cy - s / 2, w: s, h: s, color: colorOf[4], symbol: faceStyle === 'symbol' ? symbolOf[4] : '', marked: markedFaceId === 4 };
  const tris = [
    { faceId: 0, points: [[cx - s / 2, cy - s / 2], [cx + s / 2, cy - s / 2], [cx, cy - s / 2 - t]] },
    { faceId: 1, points: [[cx + s / 2, cy - s / 2], [cx + s / 2, cy + s / 2], [cx + s / 2 + t, cy]] },
    { faceId: 2, points: [[cx + s / 2, cy + s / 2], [cx - s / 2, cy + s / 2], [cx, cy + s / 2 + t]] },
    { faceId: 3, points: [[cx - s / 2, cy + s / 2], [cx - s / 2, cy - s / 2], [cx - s / 2 - t, cy]] },
  ].map(tr => ({ faceId: tr.faceId, shape: 'poly', points: tr.points, color: colorOf[tr.faceId], symbol: faceStyle === 'symbol' ? symbolOf[tr.faceId] : '', marked: markedFaceId === tr.faceId }));
  return [base, ...tris];
}
function tetraNetCells(faceStyle, colorOf, symbolOf, markedFaceId) {
  const cx = 180, cy = 120, h = 52, half = 46;
  const A = [cx, cy - h], B = [cx - half, cy + h * 0.66], C = [cx + half, cy + h * 0.66];
  const reflect = (P, Q, apex) => { const mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2; return [2 * mx - apex[0], 2 * my - apex[1]]; };
  const cells = [
    { faceId: 0, points: [A, B, C] },
    { faceId: 1, points: [A, B, reflect(A, B, C)] },
    { faceId: 2, points: [A, C, reflect(A, C, B)] },
    { faceId: 3, points: [B, C, reflect(B, C, A)] },
  ].map(tr => ({ faceId: tr.faceId, shape: 'poly', points: tr.points, color: colorOf[tr.faceId], symbol: faceStyle === 'symbol' ? symbolOf[tr.faceId] : '', marked: markedFaceId === tr.faceId }));
  return cells;
}
function buildNetCells(kind, layout, faceStyle, colorOf, symbolOf, markedFaceId) {
  if (kind === 'cube' || kind === 'rect') return boxNetCells(kind, layout, faceStyle, colorOf, symbolOf, markedFaceId);
  if (kind === 'tri') return prismNetCells(3, kind, layout, faceStyle, colorOf, symbolOf, markedFaceId);
  if (kind === 'pent') return prismNetCells(5, kind, layout, faceStyle, colorOf, symbolOf, markedFaceId);
  if (kind === 'hex') return prismNetCells(6, kind, layout, faceStyle, colorOf, symbolOf, markedFaceId);
  if (kind === 'pyramid') return sqPyramidNetCells(faceStyle, colorOf, symbolOf, markedFaceId);
  if (kind === 'tetra') return tetraNetCells(faceStyle, colorOf, symbolOf, markedFaceId);
  throw new Error('no net for ' + kind);
}

// Choose a net layout for a kind + regularity preference.
function chooseLayout(kind, regularity, rng) {
  if (kind === 'cube' || kind === 'rect') {
    let pool = BOX_NETS;
    if (regularity === 'regular') pool = BOX_NETS.filter(n => n.regular);
    else if (regularity === 'irregular') pool = BOX_NETS.filter(n => !n.regular);
    return pick(rng, pool.length ? pool : BOX_NETS);
  }
  if (FAMILY[kind] === 'prism') {
    const n = kind === 'tri' ? 3 : kind === 'pent' ? 5 : 6;
    // regular = caps centered on the strip; irregular = caps offset to the ends.
    if (regularity === 'irregular') return { name: 'offset', regular: false, capTopAt: 0, capBotAt: n - 1 };
    return { name: 'centered', regular: true, capTopAt: Math.floor(n / 2), capBotAt: Math.floor(n / 2) };
  }
  return { name: 'canonical', regular: true };
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20 (levers rise together).
// ---------------------------------------------------------------------------
const PROFILES = {
  1: { kinds: ['cube'], mode: 'net_to_solid', faceStyle: 'color', nOpts: 2, regularity: 'regular', scaffold: true },
  2: { kinds: ['cube'], mode: 'net_to_solid', faceStyle: 'color', nOpts: 2, regularity: 'regular', scaffold: true },
  3: { kinds: ['cube', 'rect'], mode: 'net_to_solid', faceStyle: 'color', nOpts: 3, regularity: 'regular', scaffold: true },
  4: { kinds: ['cube', 'rect'], mode: 'net_to_solid', faceStyle: 'color', nOpts: 3, regularity: 'any', scaffold: true },
  5: { kinds: ['cube'], mode: 'opposite_face', faceStyle: 'color', nOpts: 3, regularity: 'regular', scaffold: true },
  6: { kinds: ['cube', 'rect'], mode: 'opposite_face', faceStyle: 'color', nOpts: 3, regularity: 'regular', scaffold: true },
  7: { kinds: ['cube', 'rect'], mode: 'opposite_face', faceStyle: 'color', nOpts: 4, regularity: 'any', scaffold: true },
  8: { kinds: ['rect', 'tri'], mode: 'net_to_solid', faceStyle: 'symbol', nOpts: 4, regularity: 'any', scaffold: true },
  9: { kinds: ['cube', 'rect'], mode: 'opposite_face', faceStyle: 'symbol', nOpts: 4, regularity: 'irregular', scaffold: false },
  10: { kinds: ['tri', 'pent'], mode: 'net_to_solid', faceStyle: 'symbol', nOpts: 4, regularity: 'any', scaffold: false },
  11: { kinds: ['pyramid'], mode: 'opposite_face', faceStyle: 'color', nOpts: 4, regularity: 'any', scaffold: false },
  12: { kinds: ['pyramid', 'hex'], mode: 'opposite_face', faceStyle: 'symbol', nOpts: 4, regularity: 'any', scaffold: false },
  13: { kinds: ['hex'], mode: 'opposite_face', faceStyle: 'color', nOpts: 4, regularity: 'regular', scaffold: false },
  14: { kinds: ['hex'], mode: 'opposite_face', faceStyle: 'symbol', nOpts: 5, regularity: 'irregular', scaffold: false },
  15: { kinds: ['pent'], mode: 'adjacent_face', faceStyle: 'symbol', nOpts: 3, regularity: 'any', scaffold: false },
  16: { kinds: ['hex'], mode: 'adjacent_face', faceStyle: 'color', nOpts: 4, regularity: 'regular', scaffold: false },
  17: { kinds: ['hex'], mode: 'adjacent_face', faceStyle: 'symbol', nOpts: 4, regularity: 'irregular', scaffold: false },
  18: { kinds: ['hex'], mode: 'adjacent_face', faceStyle: 'symbol', nOpts: 4, regularity: 'irregular', scaffold: false },
  19: { kinds: ['hex'], mode: 'opposite_face', faceStyle: 'symbol', nOpts: 6, regularity: 'irregular', scaffold: false },
  20: { kinds: ['hex'], mode: 'adjacent_face', faceStyle: 'symbol', nOpts: 4, regularity: 'irregular', scaffold: false },
};
const ITEMS_PER_LEVEL = 5;

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const PROMPTS = {
  net_to_solid: 'Which shape does this net fold into?',
  opposite_face: 'Fold the net. Which face ends up OPPOSITE the star face?',
  adjacent_face: 'Fold the net. Which face TOUCHES the star face?',
};

// net-to-solid confusability pool (ordered by nearness).
const SOLID_DIST = {
  cube: ['rect', 'pyramid', 'tri', 'hex'],
  rect: ['cube', 'tri', 'pyramid'],
  tri: ['pent', 'pyramid', 'rect', 'hex'],
  pent: ['hex', 'tri', 'rect'],
  hex: ['pent', 'tri', 'rect'],
  tetra: ['pyramid', 'tri', 'cube'],
  pyramid: ['tetra', 'tri', 'cube', 'pent'],
};
function solidLure(correctKind, otherKind) {
  if (FACE_COUNT[correctKind] === FACE_COUNT[otherKind]) return 'face_shape_confusion';
  if (FAMILY[correctKind] === FAMILY[otherKind]) return 'near_family';
  return 'wrong_family';
}

// A face id that can legally carry a face-relation question for this kind/mode.
function eligibleMarkedFaces(kind, mode, model) {
  const faces = model.faces;
  if (mode === 'opposite_face') return faces.filter(f => model.opposite[f] != null);
  if (mode === 'adjacent_face') {
    // need >= (nOpts-1) non-adjacent faces available; only prism sides qualify.
    return faces.filter(f => {
      const nonAdj = faces.filter(x => x !== f && !model.adjacency[f].includes(x));
      return nonAdj.length >= 2 && FAMILY[kind] === 'prism' && f < (kind === 'tri' ? 3 : kind === 'pent' ? 5 : 6);
    });
  }
  return faces;
}

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildItem(L, idx, slotFor) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const prof = PROFILES[L];
  const kind = pick(rng, prof.kinds);
  const model = solidModel(kind);
  const faceStyle = prof.faceStyle;

  // Randomize the color/symbol assignment per face (permutation) for variety.
  const colorPerm = shuffle(rng, COLORS).slice(0, model.faces.length);
  const symbolPerm = shuffle(rng, SYMBOLS).slice(0, model.faces.length);
  const colorOf = {}, symbolOf = {};
  model.faces.forEach((f, i) => { colorOf[f] = colorPerm[i]; symbolOf[f] = symbolPerm[i]; });

  let mode = prof.mode;
  // Fall back to net_to_solid if the requested face mode has no eligible marked face.
  if (mode !== 'net_to_solid' && eligibleMarkedFaces(kind, mode, model).length === 0) mode = 'net_to_solid';

  const layout = chooseLayout(kind, prof.regularity, rng);
  let markedFaceId = null, relation = mode, options = [], distractorRationales = [], correctKey = null, correctFaceId = null;
  const OPT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  if (mode === 'net_to_solid') {
    relation = 'net_to_solid';
    const nOpts = Math.min(prof.nOpts, 1 + SOLID_DIST[kind].length);
    const lures = shuffle(rng, SOLID_DIST[kind]).slice(0, nOpts - 1);
    const raw = seatCorrect(shuffle(rng, [kind, ...lures]), k => k === kind, slotFor);
    options = raw.map((k, i) => ({ key: OPT_KEYS[i], kind: k }));
    correctFaceId = null;
    const correct = options.find(o => o.kind === kind);
    correctKey = correct.key;
    distractorRationales = options.map(o => (o.kind === kind ? 'correct' : solidLure(kind, o.kind)));
  } else {
    const faces = model.faces;
    markedFaceId = pick(rng, eligibleMarkedFaces(kind, mode, model));
    if (mode === 'opposite_face') {
      correctFaceId = model.opposite[markedFaceId];
      const adjacent = model.adjacency[markedFaceId].filter(f => f !== correctFaceId);
      const others = faces.filter(f => f !== markedFaceId && f !== correctFaceId && !adjacent.includes(f));
      const nOpts = Math.min(prof.nOpts, 1 + adjacent.length + others.length);
      const distPool = [...shuffle(rng, adjacent).map(f => ({ f, lure: 'adjacent_near_miss' })),
      ...shuffle(rng, others).map(f => ({ f, lure: 'nonadjacent_confusion' }))].slice(0, nOpts - 1);
      const chosen = seatCorrect(shuffle(rng, [{ f: correctFaceId, lure: 'correct' }, ...distPool]), c => c.lure === 'correct', slotFor);
      options = chosen.map((c, i) => ({ key: OPT_KEYS[i], faceId: c.f, color: colorOf[c.f], symbol: faceStyle === 'symbol' ? symbolOf[c.f] : '' }));
      distractorRationales = chosen.map(c => c.lure);
      correctKey = chosen.map((c, i) => ({ c, key: OPT_KEYS[i] })).find(o => o.c.f === correctFaceId).key;
    } else { // adjacent_face
      const adjacentSides = model.adjacency[markedFaceId].filter(f => f < (kind === 'tri' ? 3 : kind === 'pent' ? 5 : 6));
      correctFaceId = pick(rng, adjacentSides.length ? adjacentSides : model.adjacency[markedFaceId]);
      const nonAdj = faces.filter(f => f !== markedFaceId && !model.adjacency[markedFaceId].includes(f));
      const nOpts = Math.min(prof.nOpts, 1 + nonAdj.length);
      const distPool = shuffle(rng, nonAdj).slice(0, nOpts - 1).map(f => ({ f, lure: model.opposite[markedFaceId] === f ? 'opposite_confusion' : 'nonadjacent_confusion' }));
      const chosen = seatCorrect(shuffle(rng, [{ f: correctFaceId, lure: 'correct' }, ...distPool]), c => c.lure === 'correct', slotFor);
      options = chosen.map((c, i) => ({ key: OPT_KEYS[i], faceId: c.f, color: colorOf[c.f], symbol: faceStyle === 'symbol' ? symbolOf[c.f] : '' }));
      distractorRationales = chosen.map(c => c.lure);
      correctKey = chosen.map((c, i) => ({ c, key: OPT_KEYS[i] })).find(o => o.c.f === correctFaceId).key;
    }
  }

  const cells = buildNetCells(kind, layout, faceStyle, colorOf, symbolOf, markedFaceId);
  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;

  const content = {
    typeCode: TYPE_CODE,
    question: { mode, relation, prompt: PROMPTS[mode], markedFaceId },
    solid: { kind, family: FAMILY[kind], faceCount: FACE_COUNT[kind] },
    net: { kind, regular: !!layout.regular, variant: layout.name, cells },
    faceStyle,
    optionKind: mode === 'net_to_solid' ? 'solid' : 'face',
    options,
    scaffold: { autoFold: prof.scaffold, warmup: prof.scaffold },
  };
  const answer = { correctKey, correctFaceId, relation, distractorRationales };
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
  const slotFor = makeSlotAllocator(7); // OPT_KEYS A..G
  for (let L = 1; L <= 20; L++) for (let i = 0; i < ITEMS_PER_LEVEL; i++) items.push(buildItem(L, i, slotFor));
  return items;
}

// ---------------------------------------------------------------------------
// Independent verification: recompute the key from the topology, check coverage.
// ---------------------------------------------------------------------------
function independentKey(item) {
  const c = item.content, model = solidModel(c.solid.kind);
  if (c.question.mode === 'net_to_solid') {
    return c.options.find(o => o.kind === c.solid.kind)?.key ?? null;
  }
  const marked = c.question.markedFaceId;
  if (c.question.mode === 'opposite_face') {
    const opp = model.opposite[marked];
    return c.options.find(o => o.faceId === opp)?.key ?? null;
  }
  // adjacent_face: exactly one option must be adjacent to the marked face.
  const adj = c.options.filter(o => model.adjacency[marked].includes(o.faceId));
  return adj.length === 1 ? adj[0].key : `AMBIGUOUS(${adj.length})`;
}

function verify(items) {
  let ok = 0, bad = 0; const problems = [];
  const bands = {}; for (let L = 1; L <= 20; L++) bands[L] = 0;
  for (const it of items) {
    // required fields
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.difficulty < 1 || it.difficulty > 20) problems.push(`${it.itemId}: difficulty out of range`);
    // one 'correct' rationale, aligned length
    const nCorrect = it.answer.distractorRationales.filter(r => r === 'correct').length;
    if (nCorrect !== 1) problems.push(`${it.itemId}: expected 1 correct rationale, got ${nCorrect}`);
    if (it.answer.distractorRationales.length !== it.content.options.length) problems.push(`${it.itemId}: rationale/option length mismatch`);
    // key recomputed independently from topology
    const k = independentKey(it);
    if (k === it.answer.correctKey) ok++; else { bad++; problems.push(`${it.itemId}: key ${it.answer.correctKey} != recomputed ${k} (${it.content.question.mode}/${it.content.solid.kind})`); }
    // coverage: count into every integer band within +/-1pt
    for (let L = 1; L <= 20; L++) if (it.difficulty >= L - 1 && it.difficulty <= L + 1) bands[L]++;
  }
  return { ok, bad, problems, bands };
}

function coverageReport(bands) {
  const lines = [];
  let minBand = Infinity;
  for (let L = 1; L <= 20; L++) { lines.push(`  band ${String(L).padStart(2)} (+/-1pt): ${bands[L]}`); minBand = Math.min(minBand, bands[L]); }
  return { text: lines.join('\n'), minBand };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const doVerify = process.argv.includes('--verify');
  const items = generate();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, items.map(it => JSON.stringify(it)).join('\n') + '\n');
  console.log(`[SPA-FOLDNET-01] wrote ${items.length} items -> ${OUT}`);
  const byMode = {}; for (const it of items) byMode[it.content.question.mode] = (byMode[it.content.question.mode] || 0) + 1;
  console.log('[SPA-FOLDNET-01] modes:', JSON.stringify(byMode));

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[SPA-FOLDNET-01] key check: ${v.ok} ok, ${v.bad} bad`);
  console.log(`[SPA-FOLDNET-01] coverage (min band count = ${cov.minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[SPA-FOLDNET-01] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < ITEMS_PER_LEVEL) { console.error(`[SPA-FOLDNET-01] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log('[SPA-FOLDNET-01] OK: keys computed from topology, coverage satisfied, born-synthetic.');
}

main();
