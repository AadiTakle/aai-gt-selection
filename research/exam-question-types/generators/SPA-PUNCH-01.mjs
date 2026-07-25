#!/usr/bin/env node
// SPA-PUNCH-01 - Fold & Punch structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-PUNCH-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// This is a CONSTRUCTED-RESPONSE type (scoring.mode = 'computed_solver'). The child
// watches an n x n sheet fold, sees the punch(es) go through the folded stack, and then
// MARKS every cell of the unfolded sheet that will carry a hole. Partial credit (M-POLY)
// is graded server-side against the computed hole set; M-ERRTYPE is read off the labelled
// foil configurations recorded in `answer`.
//
// The hole set is COMPUTED - never authored - by a forward per-cell fold simulation:
// every original cell carries its current position through each crease reflection, and a
// punch marks every original cell that currently sits under the punched cell. Orthogonal
// creases (L/R/T/B) are half-plane reflections; oblique creases (D1 = main diagonal,
// D2 = anti-diagonal) are transposes of a square live region and may only be the final
// fold, which is exactly the ETS VZ-2 "Paper Folding" progression in the spec.
//
// Usage:
//   node generators/SPA-PUNCH-01.mjs            # write bank
//   node generators/SPA-PUNCH-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// fold count (1 -> 4, i.e. 2 -> 16 layers), oblique folds, punch count (1 -> 3), grid
// resolution (4x4 -> 8x8), mixed fold axes and reversed fold directions.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-PUNCH-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'SPA-PUNCH-01';
const DOMAIN = 'spatial';
const DEMO_PATH = 'demos/SPA-PUNCH-01.html';
const GENERATOR_REF = 'SPA-PUNCH-01@1';
const ITEMS_PER_LEVEL = 7;
const MAX_HOLES = 24;

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
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function seededUuid(seedStr) {
  const b = new Uint8Array(16);
  let h = hashStr(seedStr);
  for (let i = 0; i < 16; i++) { h = (Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i * 0x9e3779b1) >>> 0; b[i] = h & 0xff; }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
const round2 = (x) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------------------
// Fold simulation (forward, per cell). Every original cell carries its current
// position; a crease reflects the half being folded over onto the half being kept.
// ---------------------------------------------------------------------------
const OPP = { L: 'R', R: 'L', T: 'B', B: 'T', D1: 'D2', D2: 'D1' };
const IS_VERT = (op) => op === 'L' || op === 'R';
const IS_HORZ = (op) => op === 'T' || op === 'B';
const IS_OBL = (op) => op === 'D1' || op === 'D2';

function applyFolds(n, seq) {
  const cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cells.push({ ox: x, oy: y, x, y });
  let bb = { x0: 0, y0: 0, x1: n - 1, y1: n - 1 };
  let diagonal = null;
  const folds = [];
  for (const op of seq) {
    if (diagonal) return null;                     // an oblique fold must be the last one
    const w = bb.x1 - bb.x0 + 1, h = bb.y1 - bb.y0 + 1;
    if (IS_VERT(op)) {
      if (w < 2 || w % 2) return null;
      const p = bb.x0 + w / 2;
      if (op === 'L') { cells.forEach(q => { if (q.x < p) q.x = 2 * p - 1 - q.x; }); bb = { ...bb, x0: p }; }
      else { cells.forEach(q => { if (q.x >= p) q.x = 2 * p - 1 - q.x; }); bb = { ...bb, x1: p - 1 }; }
      folds.push({ op, axis: 'vertical', creaseAt: p, keep: op === 'L' ? 'right' : 'left' });
    } else if (IS_HORZ(op)) {
      if (h < 2 || h % 2) return null;
      const p = bb.y0 + h / 2;
      if (op === 'T') { cells.forEach(q => { if (q.y < p) q.y = 2 * p - 1 - q.y; }); bb = { ...bb, y0: p }; }
      else { cells.forEach(q => { if (q.y >= p) q.y = 2 * p - 1 - q.y; }); bb = { ...bb, y1: p - 1 }; }
      folds.push({ op, axis: 'horizontal', creaseAt: p, keep: op === 'T' ? 'bottom' : 'top' });
    } else if (IS_OBL(op)) {
      if (w !== h || w < 2) return null;
      const m = w, x0 = bb.x0, y0 = bb.y0;
      if (op === 'D1') cells.forEach(q => { const a = q.x - x0, b = q.y - y0; if (a > b) { q.x = x0 + b; q.y = y0 + a; } });
      else cells.forEach(q => { const a = q.x - x0, b = q.y - y0; if (a + b > m - 1) { q.x = x0 + (m - 1 - b); q.y = y0 + (m - 1 - a); } });
      diagonal = op;
      folds.push({ op, axis: 'diagonal', creaseAt: null, keep: op === 'D1' ? 'below_main_diagonal' : 'above_anti_diagonal' });
    } else return null;
  }
  return { cells, bb, diagonal, folds };
}
// Snap a normalized punch position to a live cell of the final region.
function resolvePunch(bb, diagonal, u, v) {
  const w = bb.x1 - bb.x0 + 1, h = bb.y1 - bb.y0 + 1, m = w;
  let px = bb.x0 + Math.round(u * (w - 1)), py = bb.y0 + Math.round(v * (h - 1));
  if (diagonal === 'D1') { const a = px - bb.x0, b = py - bb.y0; if (a > b) { px = bb.x0 + b; py = bb.y0 + a; } }
  if (diagonal === 'D2') { const a = px - bb.x0, b = py - bb.y0; if (a + b > m - 1) { px = bb.x0 + (m - 1 - b); py = bb.y0 + (m - 1 - a); } }
  return [px, py];
}
function sigOf(cells) {
  return cells.slice().sort((a, b) => a.y - b.y || a.x - b.x).map(c => `${c.x},${c.y}`).join('|');
}
// Full fold -> punch -> unfold model. Returns null when the configuration is illegal.
function unfoldModel(n, seq, punchNorms) {
  const F = applyFolds(n, seq);
  if (!F) return null;
  const pts = punchNorms.map(([u, v]) => resolvePunch(F.bb, F.diagonal, u, v));
  const keys = pts.map(p => `${p[0]},${p[1]}`);
  if (new Set(keys).size !== keys.length) return null;   // punches must hit distinct cells
  const map = new Map();
  for (const q of F.cells) {
    const i = keys.indexOf(`${q.x},${q.y}`);
    if (i < 0) continue;
    const k = `${q.ox},${q.oy}`;
    if (!map.has(k)) map.set(k, i);
  }
  const cells = [...map].map(([k, p]) => { const [x, y] = k.split(',').map(Number); return { x, y, p }; })
    .sort((a, b) => a.y - b.y || a.x - b.x);
  return { cells, signature: sigOf(cells), punchCells: pts, bb: F.bb, diagonal: F.diagonal, folds: F.folds, layerCount: Math.pow(2, seq.length) };
}

// ---------------------------------------------------------------------------
// Valid fold-sequence pools.
// ---------------------------------------------------------------------------
const ORTHO = ['L', 'R', 'T', 'B'];
function enumerateSeqs(n, foldCount, oblique) {
  const prefixLen = oblique ? foldCount - 1 : foldCount;
  const out = [];
  const rec = (pfx) => {
    if (pfx.length === prefixLen) {
      if (oblique) { for (const d of ['D1', 'D2']) { const s = [...pfx, d]; if (applyFolds(n, s)) out.push(s); } }
      else if (applyFolds(n, pfx)) out.push(pfx);
      return;
    }
    for (const o of ORTHO) rec([...pfx, o]);
  };
  rec([]);
  return out;
}
const usesBothAxes = (s) => s.some(IS_VERT) && s.some(IS_HORZ);
const hasDirectionReversal = (s) => s.some((op, i) => s.slice(i + 1).includes(OPP[op]));

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
// ---------------------------------------------------------------------------
const PUNCH_POOL = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0, 0.5], [1, 0.5], [0.5, 1], [0.5, 0.5]];
const PROFILES = {
  1: { n: 4, folds: 1, obl: false, punches: 1 },
  2: { n: 4, folds: 1, obl: false, punches: 2 },
  3: { n: 6, folds: 1, obl: false, punches: 2 },
  4: { n: 4, folds: 2, obl: false, punches: 1 },
  5: { n: 6, folds: 2, obl: false, punches: 1 },
  6: { n: 8, folds: 2, obl: false, punches: 1 },
  7: { n: 4, folds: 1, obl: true, punches: 2 },
  8: { n: 6, folds: 2, obl: false, punches: 2 },
  9: { n: 8, folds: 2, obl: false, punches: 2 },
  10: { n: 8, folds: 1, obl: true, punches: 3 },
  11: { n: 8, folds: 3, obl: false, punches: 1 },
  12: { n: 8, folds: 3, obl: false, punches: 1, reverseDir: true },
  13: { n: 8, folds: 3, obl: false, punches: 1, mixAxes: true },
  14: { n: 6, folds: 3, obl: true, punches: 1 },
  15: { n: 8, folds: 3, obl: true, punches: 1 },
  16: { n: 8, folds: 3, obl: false, punches: 2, mixAxes: true },
  17: { n: 8, folds: 4, obl: false, punches: 1 },
  18: { n: 8, folds: 4, obl: false, punches: 1, mixAxes: true, reverseDir: true },
  19: { n: 8, folds: 3, obl: true, punches: 2 },
  20: { n: 8, folds: 3, obl: true, punches: 3 },
};

function ageBandsForLevel(L) {
  if (L <= 4) return ['2-3'];
  if (L <= 8) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const PROMPT = 'The paper was folded, then punched. Tap every square that will have a hole when the paper is opened up.';

// ---------------------------------------------------------------------------
// Distractor (foil) configurations: labelled WRONG hole sets a child can produce.
// Each carries a derivation so the validator can re-derive it independently, and a
// chirality tag (mirror foils matter for reflection-error profiling).
// ---------------------------------------------------------------------------
const REFLECTIONS = {
  mirror_vertical: (n, c) => ({ x: n - 1 - c.x, y: c.y, p: c.p }),
  mirror_horizontal: (n, c) => ({ x: c.x, y: n - 1 - c.y, p: c.p }),
  mirror_main_diagonal: (n, c) => ({ x: c.y, y: c.x, p: c.p }),
  mirror_anti_diagonal: (n, c) => ({ x: n - 1 - c.y, y: n - 1 - c.x, p: c.p }),
};
function reflectSet(n, cells, axis) { return cells.map(c => REFLECTIONS[axis](n, c)); }
// Chirality is COMPUTED, not asserted: a foil is a mirror foil exactly when its hole set
// is the correct set reflected across one of the sheet's four symmetry axes.
function chiralityOf(n, trueCells, foilSig) {
  if (foilSig === sigOf(trueCells)) return 'same';   // the key itself is never a mirror foil
  for (const axis of Object.keys(REFLECTIONS)) {
    if (sigOf(reflectSet(n, trueCells, axis)) === foilSig) return axis;
  }
  return 'same';
}
function buildFoils(n, seq, punchNorms, truth) {
  const out = [];
  const push = (lure, derivation, model) => {
    if (!model || !model.cells.length) return;
    if (model.signature === truth.signature) return;
    out.push({ lure, chirality: chiralityOf(n, truth.cells, model.signature), derivation, cells: model.cells, signature: model.signature });
  };
  if (seq.length > 1) {
    push('lost_last_fold', { kind: 'sequence', seq: seq.slice(0, -1), punchNorms },
      unfoldModel(n, seq.slice(0, -1), punchNorms));
  }
  const flipped = [...seq.slice(0, -1), OPP[seq[seq.length - 1]]];
  push('wrong_final_fold_direction', { kind: 'sequence', seq: flipped, punchNorms }, unfoldModel(n, flipped, punchNorms));
  if (seq.length > 2) {
    push('first_fold_only', { kind: 'sequence', seq: seq.slice(0, 1), punchNorms },
      unfoldModel(n, seq.slice(0, 1), punchNorms));
  }
  if (punchNorms.length > 1) {
    push('lost_a_punch', { kind: 'sequence', seq, punchNorms: punchNorms.slice(0, -1) },
      unfoldModel(n, seq, punchNorms.slice(0, -1)));
  }
  // No reflection at all: the child marks only where the punch physically landed.
  const literal = { cells: truth.punchCells.map((p, i) => ({ x: p[0], y: p[1], p: i })) };
  literal.signature = sigOf(literal.cells);
  push('no_reflection_literal_punch', { kind: 'punch_cells_only' }, literal);
  // The whole answer mirrored: the classic reflection-axis error (M-MIRRORFA family).
  const mir = { cells: reflectSet(n, truth.cells, 'mirror_vertical') };
  mir.signature = sigOf(mir.cells);
  push('mirrored_whole_pattern', { kind: 'mirror_sheet', axis: 'mirror_vertical' }, mir);
  // De-duplicate by signature and cap the table.
  const seen = new Set();
  return out.filter(f => (seen.has(f.signature) ? false : (seen.add(f.signature), true))).slice(0, 5);
}
function jaccard(aSig, bSig) {
  const A = new Set(aSig.split('|')), B = new Set(bSig.split('|'));
  let inter = 0; A.forEach(x => { if (B.has(x)) inter++; });
  const uni = new Set([...A, ...B]).size;
  return uni ? round2(inter / uni) : 0;
}

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildItem(L, idx, usedSigs) {
  const P = PROFILES[L];
  let pool = enumerateSeqs(P.n, P.folds, !!P.obl);
  if (P.mixAxes) pool = pool.filter(usesBothAxes);
  if (P.reverseDir) pool = pool.filter(hasDirectionReversal);
  if (!pool.length) throw new Error(`no valid fold sequence for level ${L}`);

  const wantHoles = P.punches * Math.pow(2, P.folds);
  const minHoles = P.obl ? Math.max(2, Math.ceil(wantHoles * 0.55)) : wantHoles;

  let salt = 0, seed = '', chosen = null;
  for (; ; salt++) {
    seed = `${TYPE_CODE}|L${L}|#${idx}|s${salt}|${BASE_SEED}`;
    const rng = makeRng(seed);
    const seq = pool[Math.floor(rng() * pool.length)];
    const punchNorms = shuffle(rng, PUNCH_POOL).slice(0, P.punches);
    const model = unfoldModel(P.n, seq, punchNorms);
    const ok = model && model.cells.length >= minHoles && model.cells.length <= Math.min(MAX_HOLES, wantHoles)
      && (!usedSigs.has(model.signature) || salt >= 120);
    if (ok) { chosen = { seq, punchNorms, model, rng }; break; }
    if (salt > 4000) throw new Error(`level ${L} item ${idx}: no configuration found`);
  }
  const { seq, punchNorms, model, rng } = chosen;
  usedSigs.add(model.signature);

  const foils = buildFoils(P.n, seq, punchNorms, model).map((f, i) => ({
    key: `F${i + 1}`,
    lure: f.lure,
    chirality: f.chirality,
    derivation: f.derivation,
    signature: f.signature,
    cellCount: f.cells.length,
    overlapWithKey: jaccard(f.signature, model.signature),
  }));
  const distractorRationales = [
    { key: 'K', lure: 'correct', chirality: 'same', derivation: { kind: 'sequence', seq: [...seq], punchNorms: punchNorms.map(p => [...p]) }, signature: model.signature, cellCount: model.cells.length, overlapWithKey: 1 },
    ...foils,
  ];

  const difficulty = round2(Math.min(20, Math.max(1, L + (rng() * 0.9 - 0.45))));

  const content = {
    typeCode: TYPE_CODE,
    question: { mode: 'mark_unfolded_holes', relation: 'fold_punch_unfold_reflection', prompt: PROMPT },
    grid: { n: P.n },
    folds: model.folds,
    foldedRegion: { x0: model.bb.x0, y0: model.bb.y0, x1: model.bb.x1, y1: model.bb.y1, diagonal: model.diagonal },
    punches: model.punchCells.map(p => ({ x: p[0], y: p[1] })),
    layerCount: model.layerCount,
    obliqueFold: !!model.diagonal,
    response: { mode: 'mark_cells', maxMarks: P.n * P.n },
    scaffold: { foldReplay: true, unfoldReveal: false, warmup: L <= 2 },
  };
  const answer = {
    correctKey: model.signature,
    relation: 'fold_punch_unfold_reflection',
    derivation: { grid: P.n, seq: [...seq], punchNorms: punchNorms.map(p => [...p]) },
    trueCells: model.cells,
    holeCount: model.cells.length,
    layerCount: model.layerCount,
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
    scoring: { mode: 'computed_solver' },
    provenance: { generator: 'grammar', generatorRef: GENERATOR_REF, seed, level: L, levers: { grid: P.n, folds: P.folds, oblique: !!P.obl, punches: P.punches } },
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
// Self-check: re-run the fold model from the recorded derivation and confirm the
// stored key, the rendered punch cells and the folded region all agree.
// ---------------------------------------------------------------------------
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
    for (const leak of ['correctKey', 'answer', 'trueCells', 'holeCount', 'derivation'])
      if (leak in it.content) problems.push(`${it.itemId}: content leaks ${leak}`);
    const nCorrect = it.answer.distractorRationales.filter(d => d.lure === 'correct').length;
    if (nCorrect !== 1) problems.push(`${it.itemId}: expected 1 correct rationale, got ${nCorrect}`);
    const d = it.answer.derivation;
    const re = unfoldModel(d.grid, d.seq, d.punchNorms);
    if (re && re.signature === it.answer.correctKey &&
      sigOf(it.content.punches.map(p => ({ x: p.x, y: p.y }))) === sigOf(re.punchCells.map(p => ({ x: p[0], y: p[1] })))) ok++;
    else { bad++; problems.push(`${it.itemId}: re-simulated key != stored key`); }
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

  const holes = items.map(it => it.answer.holeCount);
  console.log(`[${TYPE_CODE}] holes per item: ${Math.min(...holes)}..${Math.max(...holes)}`);
  const byFolds = {}; for (const it of items) { const f = it.content.folds.length; byFolds[f] = (byFolds[f] || 0) + 1; }
  console.log(`[${TYPE_CODE}] fold counts:`, JSON.stringify(byFolds));
  const obl = items.filter(it => it.content.obliqueFold).length;
  const byGrid = {}; for (const it of items) byGrid[it.content.grid.n] = (byGrid[it.content.grid.n] || 0) + 1;
  console.log(`[${TYPE_CODE}] oblique-fold items: ${obl}  ·  grids:`, JSON.stringify(byGrid));
  const foilN = items.map(it => it.answer.distractorRationales.length);
  console.log(`[${TYPE_CODE}] lure table size: ${Math.min(...foilN)}..${Math.max(...foilN)} (incl. the key)`);

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (re-simulate fold/punch/unfold): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${cov.minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: hole sets computed from the fold geometry, coverage satisfied, born-synthetic.`);
}

main();
