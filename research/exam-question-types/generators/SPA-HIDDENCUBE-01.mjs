#!/usr/bin/env node
// SPA-HIDDENCUBE-01 - X-Ray Cubes structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-HIDDENCUBE-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// The child sees a cube pile from one corner and reports the TOTAL number of cubes,
// including the ones that cannot be seen. Every stack is a voxel height-map, so it is
// stable by construction (a cube at height y always rests on the cubes below it) and the
// occluded cubes are LOGICALLY FORCED rather than decorative.
//
// OCCLUSION RULE (documented, exactly reproducible): with the camera in the corner
// quadrant (sc, sr) - sc = +/-1 along the column axis, sr = +/-1 along the row axis - the
// three camera-facing faces of a cube at (c, y, r) are its +y face, its (c+sc) face and
// its (r+sr) face. A face is fully covered exactly when the neighbouring cell in that
// direction is occupied (the neighbour's projection contains the face's projection), so:
//
//     hidden(c,y,r)  <=>  occ(c, y+1, r) AND occ(c+sc, y, r) AND occ(c, y, r+sr)
//
// The answer key is the TOTAL cube count (viewpoint-invariant). visible / hidden /
// bury-depth are recorded as answer-side DIAGNOSTICS: they drive M-ERRTYPE (a
// "visible-only" undercount is a systematic occlusion failure, +/-1 is a near miss) and
// the difficulty ramp. `content` carries only renderable geometry - never a count.
//
// Usage:
//   node generators/SPA-HIDDENCUBE-01.mjs            # write bank
//   node generators/SPA-HIDDENCUBE-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// footprint size, stack height, TOTAL cube count, number of occluded cubes, occlusion
// (bury) depth, irregular stacking with holes, the viewpoint quadrant (angular disparity
// from the canonical corner view), and withdrawal of the inspection turntable.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-HIDDENCUBE-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'SPA-HIDDENCUBE-01';
const DOMAIN = 'spatial';
const DEMO_PATH = 'demos/SPA-HIDDENCUBE-01.html';
const GENERATOR_REF = 'SPA-HIDDENCUBE-01@1';
const ITEMS_PER_LEVEL = 7;
const STEPPER_MAX = 60;
const CANON_YAW_DEG = -45; // canonical corner view (camera toward +col, +row)

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
const round1 = (x) => Math.round(x * 10) / 10;
const round2 = (x) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------------------
// Camera quadrants. yawDeg is the turntable yaw that puts the camera in that corner
// for the renderer's orthographic projection; (sc, sr) are the occluding directions.
// ---------------------------------------------------------------------------
const QUADRANTS = [
  { q: 0, sc: 1, sr: 1, yawDeg: -45 },
  { q: 1, sc: -1, sr: 1, yawDeg: 45 },
  { q: 2, sc: -1, sr: -1, yawDeg: 135 },
  { q: 3, sc: 1, sr: -1, yawDeg: -135 },
];
function angularDisparity(aDeg, bDeg) {
  let d = Math.abs(aDeg - bDeg) % 360;
  if (d > 180) d = 360 - d;
  return round1(d);
}

// ---------------------------------------------------------------------------
// Voxel analysis: total / visible / hidden / bury depth from a height-map.
// ---------------------------------------------------------------------------
// occ(c, y, r) == H[r][c] > y, so the occlusion rule collapses to height comparisons.
function analyze(H, R, C, sc, sr) {
  let total = 0, hidden = 0, maxBury = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const h = H[r][c];
    total += h;
    const hSide = (c + sc >= 0 && c + sc < C) ? H[r][c + sc] : 0;
    const hDeep = (r + sr >= 0 && r + sr < R) ? H[r + sr][c] : 0;
    for (let y = 0; y < h; y++) {
      if (h > y + 1 && hSide > y && hDeep > y) { hidden++; if (h - 1 - y > maxBury) maxBury = h - 1 - y; }
    }
  }
  return { total, hidden, visible: total - hidden, maxBury };
}
function layersOf(H, R, C) {
  let maxH = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) maxH = Math.max(maxH, H[r][c]);
  const layers = [];
  for (let y = 0; y < maxH; y++) {
    const cells = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (H[r][c] > y) cells.push([r, c]);
    layers.push(cells);
  }
  return { layers, maxHeight: maxH };
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
// ---------------------------------------------------------------------------
const ALLQ = [0, 1, 2, 3];
const PROFILES = {
  1: { R: 2, C: 2, maxH: 2, holes: false, minHidden: 1, maxHidden: 1, minBury: 0, totalMin: 5, totalMax: 8, quads: [0], rotate: true, yawJitter: 5 },
  2: { R: 2, C: 2, maxH: 3, holes: false, minHidden: 1, maxHidden: 2, minBury: 0, totalMin: 6, totalMax: 10, quads: [0], rotate: true, yawJitter: 6 },
  3: { R: 2, C: 3, maxH: 3, holes: false, minHidden: 1, maxHidden: 3, minBury: 0, totalMin: 8, totalMax: 13, quads: [0], rotate: true, yawJitter: 7 },
  4: { R: 2, C: 3, maxH: 3, holes: false, minHidden: 2, maxHidden: 4, minBury: 1, totalMin: 10, totalMax: 15, quads: [0], rotate: true, yawJitter: 8 },
  5: { R: 3, C: 3, maxH: 3, holes: false, minHidden: 2, maxHidden: 5, minBury: 1, totalMin: 12, totalMax: 17, quads: [0, 1], rotate: true, yawJitter: 8 },
  6: { R: 3, C: 3, maxH: 3, holes: true, minHidden: 3, maxHidden: 6, minBury: 1, totalMin: 13, totalMax: 19, quads: [0, 1], rotate: true, yawJitter: 9 },
  7: { R: 3, C: 3, maxH: 4, holes: true, minHidden: 3, maxHidden: 7, minBury: 1, totalMin: 15, totalMax: 21, quads: [0, 1], rotate: true, yawJitter: 9 },
  8: { R: 3, C: 3, maxH: 4, holes: true, minHidden: 4, maxHidden: 8, minBury: 1, totalMin: 17, totalMax: 23, quads: [0, 1, 3], rotate: true, yawJitter: 10 },
  9: { R: 3, C: 4, maxH: 4, holes: true, minHidden: 4, maxHidden: 9, minBury: 2, totalMin: 18, totalMax: 25, quads: [0, 1, 3], rotate: true, yawJitter: 10 },
  10: { R: 3, C: 4, maxH: 4, holes: true, minHidden: 5, maxHidden: 10, minBury: 2, totalMin: 20, totalMax: 27, quads: ALLQ, rotate: true, yawJitter: 11 },
  11: { R: 3, C: 4, maxH: 5, holes: true, minHidden: 6, maxHidden: 11, minBury: 2, totalMin: 21, totalMax: 29, quads: ALLQ, rotate: false, yawJitter: 11 },
  12: { R: 4, C: 4, maxH: 4, holes: true, minHidden: 6, maxHidden: 12, minBury: 2, totalMin: 23, totalMax: 31, quads: ALLQ, rotate: false, yawJitter: 12 },
  13: { R: 4, C: 4, maxH: 5, holes: true, minHidden: 7, maxHidden: 13, minBury: 2, totalMin: 25, totalMax: 33, quads: ALLQ, rotate: false, yawJitter: 12 },
  14: { R: 4, C: 4, maxH: 5, holes: true, minHidden: 8, maxHidden: 14, minBury: 3, totalMin: 26, totalMax: 35, quads: ALLQ, rotate: false, yawJitter: 12 },
  15: { R: 4, C: 4, maxH: 5, holes: true, minHidden: 9, maxHidden: 15, minBury: 3, totalMin: 28, totalMax: 37, quads: ALLQ, rotate: false, yawJitter: 12 },
  16: { R: 4, C: 4, maxH: 6, holes: true, minHidden: 10, maxHidden: 16, minBury: 3, totalMin: 29, totalMax: 39, quads: ALLQ, rotate: false, yawJitter: 12 },
  17: { R: 4, C: 4, maxH: 6, holes: true, minHidden: 11, maxHidden: 18, minBury: 3, totalMin: 30, totalMax: 38, quads: ALLQ, rotate: false, yawJitter: 12 },
  18: { R: 4, C: 4, maxH: 6, holes: true, minHidden: 12, maxHidden: 20, minBury: 3, totalMin: 32, totalMax: 40, quads: ALLQ, rotate: false, yawJitter: 12 },
  19: { R: 4, C: 5, maxH: 6, holes: true, minHidden: 13, maxHidden: 22, minBury: 4, totalMin: 34, totalMax: 42, quads: ALLQ, rotate: false, yawJitter: 12 },
  20: { R: 4, C: 5, maxH: 6, holes: true, minHidden: 14, maxHidden: 24, minBury: 4, totalMin: 36, totalMax: 46, quads: ALLQ, rotate: false, yawJitter: 12 },
};

function ageBandsForLevel(L) {
  if (L <= 4) return ['2-3'];
  if (L <= 8) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

// ---------------------------------------------------------------------------
// Stack search: random height-maps until the profile's occlusion budget is met.
// Falls back to a solid block (hidden cubes forced by construction).
// ---------------------------------------------------------------------------
function genStack(rng, P, sc, sr) {
  const cells = [];
  for (let r = 0; r < P.R; r++) for (let c = 0; c < P.C; c++) cells.push([r, c]);
  for (let t = 0; t < 4000; t++) {
    // Heights rise toward the camera corner (that is what forces occlusion), plus noise.
    const target = P.totalMin + Math.floor(rng() * (P.totalMax - P.totalMin + 1));
    const amp = 0.35 + rng() * 0.95, base = rng() * 1.4, noise = 0.7 + rng() * 1.1;
    const H = [];
    for (let r = 0; r < P.R; r++) {
      const row = [];
      for (let c = 0; c < P.C; c++) {
        const toward = (sc > 0 ? c : P.C - 1 - c) + (sr > 0 ? r : P.R - 1 - r);
        let h = Math.round(base + amp * toward + (rng() * 2 - 1) * noise);
        if (P.holes && rng() < 0.10) h = 0;
        row.push(Math.max(0, Math.min(P.maxH, h)));
      }
      H.push(row);
    }
    // Repair to the exact target total so the cube count tracks the difficulty rung.
    let cur = 0;
    for (const row of H) for (const h of row) cur += h;
    let guard = 0;
    while (cur !== target && guard++ < 800) {
      const [r, c] = cells[Math.floor(rng() * cells.length)];
      if (cur < target) { if (H[r][c] < P.maxH) { H[r][c]++; cur++; } }
      else if (H[r][c] > (P.holes ? 0 : 1)) { H[r][c]--; cur--; }
    }
    if (cur !== target) continue;
    if (!P.holes && H.some(row => row.some(h => h === 0))) continue;
    const a = analyze(H, P.R, P.C, sc, sr);
    if (a.hidden < P.minHidden || a.hidden > P.maxHidden) continue;
    if (a.maxBury < P.minBury) continue;
    if (a.visible === a.total) continue;
    return Object.assign({ H }, a);
  }
  // Deterministic fallback: a staircase rising toward the camera corner.
  const H = [];
  for (let r = 0; r < P.R; r++) {
    const row = [];
    for (let c = 0; c < P.C; c++) {
      const toward = (sc > 0 ? c : P.C - 1 - c) + (sr > 0 ? r : P.R - 1 - r);
      row.push(Math.max(1, Math.min(P.maxH, 1 + Math.round(toward * (P.maxH - 1) / Math.max(1, P.R + P.C - 2)))));
    }
    H.push(row);
  }
  return Object.assign({ H, fallback: true }, analyze(H, P.R, P.C, sc, sr));
}

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
const PROMPT = 'How many cubes are in the pile? Count the hidden ones too.';
const FALLBACKS = [];

function buildItem(L, idx, usedSigs) {
  const P = PROFILES[L];
  let salt = 0, seed = '', rng = null, quad = null, stack = null, sig = '';
  for (; ;) {
    seed = `${TYPE_CODE}|L${L}|#${idx}|s${salt}|${BASE_SEED}`;
    rng = makeRng(seed);
    quad = QUADRANTS[P.quads[Math.floor(rng() * P.quads.length)]];
    stack = genStack(rng, P, quad.sc, quad.sr);
    sig = `${quad.q}:${stack.H.map(r => r.join('')).join('/')}`;
    if (!usedSigs.has(sig) || salt >= 40) break;
    salt++;
  }
  usedSigs.add(sig);

  if (stack.fallback) FALLBACKS.push(`L${L}#${idx}`);
  const { layers, maxHeight } = layersOf(stack.H, P.R, P.C);
  const yawDeg = round1(quad.yawDeg + (rng() * 2 - 1) * P.yawJitter);
  const pitchDeg = round1(31 - (L - 1) * 0.5 + (rng() * 4 - 2));
  const footprint = stack.H.flat().filter(h => h > 0).length;

  // Diagnostic answer values (M-ERRTYPE lure taxonomy). De-duplicated by value.
  const rawLures = [
    { value: stack.total, lure: 'correct' },
    { value: stack.visible, lure: 'visible_only_undercount' },
    { value: stack.total - 1, lure: 'near_miss_off_by_one_low' },
    { value: stack.total + 1, lure: 'near_miss_off_by_one_high' },
    { value: footprint, lure: 'footprint_only_undercount' },
    { value: layers[0].length + (layers[1] ? layers[1].length : 0), lure: 'two_layer_undercount' },
    { value: stack.visible + 1, lure: 'partial_occlusion_credit' },
  ];
  const seenVals = new Set();
  const distractorRationales = [];
  for (const d of rawLures) {
    if (d.value < 0 || d.value > STEPPER_MAX) continue;
    if (seenVals.has(d.value)) continue;
    seenVals.add(d.value);
    // Counting is not a chirality task; recorded so the field is uniform across the bank.
    distractorRationales.push({ key: `N${d.value}`, value: d.value, lure: d.lure, chirality: 'not_applicable' });
  }

  const difficulty = round2(Math.min(20, Math.max(1, L + (rng() * 0.9 - 0.45))));

  const content = {
    typeCode: TYPE_CODE,
    question: { mode: 'count_all_cubes', relation: 'total_cube_count_including_occluded', prompt: PROMPT },
    stack: { rows: P.R, cols: P.C, maxHeight, layers },
    view: {
      quadrant: quad.q,
      cameraSigns: { col: quad.sc, row: quad.sr },
      yawDeg,
      pitchDeg,
      canonicalYawDeg: CANON_YAW_DEG,
      angularDisparityDeg: angularDisparity(yawDeg, CANON_YAW_DEG),
    },
    inspection: { rotate: P.rotate, yawStepDeg: 15, yawRangeDeg: [-40, 40] },
    response: { mode: 'stepper', min: 0, max: STEPPER_MAX, step: 1 },
    scaffold: { xray: false, warmup: L <= 2, layerHint: L <= 3 },
  };
  const answer = {
    correctKey: String(stack.total),
    correctCount: stack.total,
    relation: 'total_cube_count_including_occluded',
    diagnostics: {
      visibleCount: stack.visible,
      hiddenCount: stack.hidden,
      maxBuryDepth: stack.maxBury,
      footprintCount: footprint,
      tallestColumn: maxHeight,
      angularDisparityDeg: content.view.angularDisparityDeg,
    },
    distractorRationales,
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
    scoring: { mode: 'deterministic_key' },
    provenance: { generator: 'grammar', generatorRef: GENERATOR_REF, seed, level: L, levers: { rows: P.R, cols: P.C, maxHeight, quadrant: quad.q, rotate: P.rotate } },
    syntheticOnly: true,
    validated: false,
  };
}

function generate() {
  const items = [];
  for (let L = 1; L <= 20; L++) {
    const used = new Set();
    for (let i = 0; i < ITEMS_PER_LEVEL; i++) items.push(buildItem(L, i, used));
  }
  return items;
}

// ---------------------------------------------------------------------------
// Self-check: recompute the total + occlusion split straight from content geometry.
// ---------------------------------------------------------------------------
function recompute(item) {
  const c = item.content, S = c.stack, V = c.view.cameraSigns;
  const occ = new Set();
  S.layers.forEach((cells, y) => cells.forEach(([r, cc]) => occ.add(`${cc},${y},${r}`)));
  let hidden = 0, maxBury = 0;
  const heights = {};
  S.layers.forEach((cells, y) => cells.forEach(([r, cc]) => { heights[`${r},${cc}`] = Math.max(heights[`${r},${cc}`] || 0, y + 1); }));
  for (const key of occ) {
    const [cc, y, r] = key.split(',').map(Number);
    if (occ.has(`${cc},${y + 1},${r}`) && occ.has(`${cc + V.col},${y},${r}`) && occ.has(`${cc},${y},${r + V.row}`)) {
      hidden++; maxBury = Math.max(maxBury, heights[`${r},${cc}`] - 1 - y);
    }
  }
  return { total: occ.size, hidden, visible: occ.size - hidden, maxBury };
}

function verify(items) {
  let ok = 0, bad = 0; const problems = [];
  const bands = {}; for (let L = 1; L <= 20; L++) bands[L] = 0;
  const seenIds = new Set();
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (seenIds.has(it.itemId)) problems.push(`${it.itemId}: duplicate itemId`);
    seenIds.add(it.itemId);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.difficulty < 1 || it.difficulty > 20) problems.push(`${it.itemId}: difficulty out of range`);
    for (const leak of ['correctKey', 'correctCount', 'answer', 'total', 'hiddenCount', 'visibleCount'])
      if (leak in it.content) problems.push(`${it.itemId}: content leaks ${leak}`);
    const nCorrect = it.answer.distractorRationales.filter(d => d.lure === 'correct').length;
    if (nCorrect !== 1) problems.push(`${it.itemId}: expected 1 correct rationale, got ${nCorrect}`);
    const rc = recompute(it);
    const want = it.answer;
    if (String(rc.total) === want.correctKey && rc.hidden === want.diagnostics.hiddenCount &&
      rc.visible === want.diagnostics.visibleCount && rc.maxBury === want.diagnostics.maxBuryDepth) ok++;
    else {
      bad++;
      problems.push(`${it.itemId}: recompute total ${rc.total}/hidden ${rc.hidden} != key ${want.correctKey}/hidden ${want.diagnostics.hiddenCount}`);
    }
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

  const totals = items.map(it => it.answer.correctCount);
  const hiddens = items.map(it => it.answer.diagnostics.hiddenCount);
  console.log(`[${TYPE_CODE}] total cubes: ${Math.min(...totals)}..${Math.max(...totals)}  ·  hidden cubes: ${Math.min(...hiddens)}..${Math.max(...hiddens)}`);
  const byQuad = {}; for (const it of items) byQuad[it.content.view.quadrant] = (byQuad[it.content.view.quadrant] || 0) + 1;
  console.log(`[${TYPE_CODE}] viewpoint quadrants:`, JSON.stringify(byQuad));
  const fb = items.filter(it => it.answer.diagnostics.hiddenCount === 0).length;
  console.log(`[${TYPE_CODE}] items with zero hidden cubes (must be 0): ${fb}  ·  search fallbacks: ${FALLBACKS.length}`);
  if (FALLBACKS.length) { console.error(`[${TYPE_CODE}] FAIL: stack search fell back for ${FALLBACKS.join(', ')}`); process.exit(1); }
  const over = items.filter(it => it.answer.correctCount > STEPPER_MAX).length;
  if (over) { console.error(`[${TYPE_CODE}] FAIL: ${over} item(s) exceed the stepper range`); process.exit(1); }

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (recount voxels + re-derive occlusion): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${cov.minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (fb > 0) { console.error(`[${TYPE_CODE}] FAIL: ${fb} item(s) have no occluded cube`); process.exit(1); }
  if (cov.minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: totals computed from voxel geometry, occlusion forced, coverage satisfied, born-synthetic.`);
}

main();
