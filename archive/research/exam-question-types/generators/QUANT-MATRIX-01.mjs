#!/usr/bin/env node
/**
 * QUANT-MATRIX-01 — "Number Web" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2 and
 * docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md). Every item is born-synthetic
 * (syntheticOnly:true, validated:false); difficulty is a design rung (FLOAT
 * 1..20), NOT a calibrated IRT parameter.
 *
 * A "number web" is a small grid (2x2 .. 3x3) of quantities in which one cell
 * (the bottom-right) is empty. The child chooses the quantity that belongs in
 * the empty cell. Difficulty rises along the type's declared levers: grid size,
 * relation family (additive plane -> rank-1 product/scaling -> column-join),
 * number of coordinated relations (row AND column), value magnitude,
 * representation (dots/object-groups at the preliteracy floor -> supported
 * numerals higher up), and distractor proximity.
 *
 * Every emitted item is verified to have a UNIQUE fill. A family-agnostic solver
 * enumerates a hypothesis space over the visible cells:
 *   - plane   : V(r,c) = a0 + br*r + bc*c            (additive / arithmetic both ways)
 *   - product : V(r,c) = rowbase[r] * colfactor[c]    (rank-1 multiplicative scaling)
 *   - colsum  : last column = sum of the preceding columns (a row "join")
 *   - rowsum  : last row    = sum of the preceding rows
 * The item is accepted only when every hypothesis consistent with the visible
 * cells agrees on exactly one value for the hole, and that value equals the
 * intended key. The same solver recovers the key from the served content alone
 * (no key leak), so it doubles as the deterministic validator.
 *
 * Usage:  node QUANT-MATRIX-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-matrix-01-v1", 6 items per difficulty rung (1..20) -> ~120.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-MATRIX-01';
const DOMAIN = 'quantitative';
const GENERATOR_REF = 'QUANT-MATRIX-01-grammar@1';
const DOT_CAP = 12;                              // max countable dots/object-group size
const NUMERAL_CAP = 99;                          // max supported-numeral value
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

/* ------------------------------------------------------------------ *
 * Seeded PRNG (deterministic, reproducible per provenance.seed)
 * ------------------------------------------------------------------ */
function xfnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class Rng {
  constructor(seedStr) { this.seed = seedStr; this._r = mulberry32(xfnv1a(seedStr)); }
  next() { return this._r(); }
  int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); }   // inclusive
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = this.int(0, i);[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  uuid() {
    const b = Array.from({ length: 16 }, () => this.int(0, 255));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map((x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
}

/* ------------------------------------------------------------------ *
 * Hypothesis space — grid fitters (hole is the bottom-right cell).
 * Each returns the predicted hole value, or null if it does not fit
 * every VISIBLE cell. The hole is g[R-1][C-1] (===null on the grid).
 * ------------------------------------------------------------------ */
const isHole = (r, c, R, C) => r === R - 1 && c === C - 1;

// Additive plane: V(r,c) = a0 + br*r + bc*c. Anchors (0,0),(0,1),(1,0) are
// always visible (the hole is the last cell); the rest must confirm.
function fitPlane(g, R, C) {
  if (R < 2 || C < 2) return null;
  const a0 = g[0][0];
  const bc = g[0][1] - a0;
  const br = g[1][0] - a0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (isHole(r, c, R, C)) continue;
    if (g[r][c] !== a0 + br * r + bc * c) return null;
  }
  return a0 + br * (R - 1) + bc * (C - 1);
}

// Rank-1 product: V(r,c) = rowbase[r]*colfactor[c]. Verified via integer
// cross-multiplication g[r][c]*g[0][0] === g[r][0]*g[0][c] over visible cells.
function fitProduct(g, R, C) {
  if (R < 2 || C < 2) return null;
  const base = g[0][0];
  if (base === 0) return null;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (isHole(r, c, R, C)) continue;
    if (g[r][c] * base !== g[r][0] * g[0][c]) return null;
  }
  const num = g[R - 1][0] * g[0][C - 1];
  if (num % base !== 0) return null;
  return num / base;
}

// Column join: the last column equals the sum of the preceding columns.
// Needs >=2 summands (C>=3) so it is distinct from "copy the left cell".
function fitColSum(g, R, C) {
  if (C < 3) return null;
  for (let r = 0; r < R - 1; r++) {         // fully-known rows confirm the rule
    let s = 0; for (let c = 0; c < C - 1; c++) s += g[r][c];
    if (g[r][C - 1] !== s) return null;
  }
  let s = 0; for (let c = 0; c < C - 1; c++) s += g[R - 1][c];
  return s;
}

// Row join: the last row equals the sum of the preceding rows (needs R>=3).
function fitRowSum(g, R, C) {
  if (R < 3) return null;
  for (let c = 0; c < C - 1; c++) {         // fully-known columns confirm the rule
    let s = 0; for (let r = 0; r < R - 1; r++) s += g[r][c];
    if (g[R - 1][c] !== s) return null;
  }
  let s = 0; for (let r = 0; r < R - 1; r++) s += g[r][C - 1];
  return s;
}

const GRID_FITTERS = [
  ['plane', fitPlane],
  ['product', fitProduct],
  ['colsum', fitColSum],
  ['rowsum', fitRowSum],
];

/* All hypotheses over the visible grid -> set of predicted hole values. */
function analyzeGrid(g, R, C) {
  const preds = new Map();
  for (const [id, fn] of GRID_FITTERS) {
    const v = fn(g, R, C);
    if (v !== null && Number.isFinite(v) && Number.isInteger(v)) preds.set(id, v);
  }
  const distinct = new Set(preds.values());
  return { preds, distinct, unique: distinct.size === 1, value: distinct.size === 1 ? [...distinct][0] : null };
}

/* ------------------------------------------------------------------ *
 * Grid generators (each returns { g, R, C, holeValue, meta })
 * meta: { family, relations, ruleText }
 * ------------------------------------------------------------------ */
function genPlane(rng, cfg) {
  const { R, C } = cfg;
  const a0 = rng.int(cfg.a0Min ?? 1, cfg.a0Max ?? 3);
  const br = rng.int(cfg.brMin ?? 1, cfg.brMax ?? 3);   // >=1 keeps it distinct from colsum/rowsum
  const bc = rng.int(cfg.bcMin ?? 1, cfg.bcMax ?? 3);
  const g = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => a0 + br * r + bc * c));
  const holeValue = g[R - 1][C - 1];
  g[R - 1][C - 1] = null;
  return { g, R, C, holeValue, meta: { family: 'plane', relations: 2, ruleText: `each row +${bc} across, each column +${br} down` } };
}

function genProduct(rng, cfg) {
  const { R, C } = cfg;
  const colf = [1];
  for (let c = 1; c < C; c++) colf.push(colf[c - 1] + rng.int(cfg.colStepMin ?? 1, cfg.colStepMax ?? 2));
  const rowb = [rng.int(cfg.baseMin ?? 1, cfg.baseMax ?? 3)];
  for (let r = 1; r < R; r++) rowb.push(rowb[r - 1] + rng.int(cfg.rowStepMin ?? 1, cfg.rowStepMax ?? 2));
  const g = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => rowb[r] * colf[c]));
  const holeValue = g[R - 1][C - 1];
  g[R - 1][C - 1] = null;
  return { g, R, C, holeValue, meta: { family: 'product', relations: 2, ruleText: `columns scale by [${colf.join(', ')}], rows grow the base` } };
}

function genColSum(rng, cfg) {
  const { R, C } = cfg;                       // C>=3
  const g = Array.from({ length: R }, () => Array(C).fill(0));
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C - 1; c++) g[r][c] = rng.int(cfg.cellMin ?? 1, cfg.cellMax ?? 6);
    g[r][C - 1] = g[r].slice(0, C - 1).reduce((a, b) => a + b, 0);
  }
  const holeValue = g[R - 1][C - 1];
  g[R - 1][C - 1] = null;
  return { g, R, C, holeValue, meta: { family: 'colsum', relations: 2, ruleText: `last column = sum of the first ${C - 1} columns` } };
}

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> generator config sampler
 * Low rungs = dots/object-groups (preliteracy); higher = supported numerals.
 * ------------------------------------------------------------------ */
function configFor(rng, d) {
  const dots = { display: 'dots' }, num = { display: 'numeral' };
  const table = {
    1: () => ({ ...dots, gen: genPlane, R: 2, C: 2, a0Min: 2, a0Max: 4, brMin: 1, brMax: 1, bcMin: 1, bcMax: 1, proximity: 'far' }),
    2: () => ({ ...dots, gen: genPlane, R: 2, C: 2, a0Min: 2, a0Max: 5, brMin: 1, brMax: 2, bcMin: 1, bcMax: 1, proximity: 'far' }),
    3: () => ({ ...dots, gen: genPlane, R: 2, C: 2, a0Min: 2, a0Max: 5, brMin: 1, brMax: 3, bcMin: 1, bcMax: 3, proximity: 'medium' }),
    4: () => ({ ...dots, gen: genPlane, R: 2, C: 3, a0Min: 1, a0Max: 3, brMin: 1, brMax: 2, bcMin: 1, bcMax: 1, proximity: 'far' }),
    5: () => ({ ...dots, gen: genPlane, R: 2, C: 3, a0Min: 1, a0Max: 3, brMin: 1, brMax: 2, bcMin: 1, bcMax: 2, proximity: 'medium' }),
    6: () => ({ ...dots, gen: genPlane, R: 3, C: 2, a0Min: 1, a0Max: 3, brMin: 1, brMax: 2, bcMin: 1, bcMax: 2, proximity: 'medium' }),
    7: () => ({ ...num, gen: genPlane, R: 3, C: 3, a0Min: 1, a0Max: 4, brMin: 1, brMax: 3, bcMin: 1, bcMax: 3, proximity: 'medium' }),
    8: () => ({ ...num, gen: genPlane, R: 3, C: 3, a0Min: 2, a0Max: 6, brMin: 2, brMax: 4, bcMin: 2, bcMax: 4, proximity: 'near' }),
    9: () => ({ ...num, gen: genProduct, R: 2, C: 3, baseMin: 1, baseMax: 3, rowStepMin: 1, rowStepMax: 2, colStepMin: 1, colStepMax: 1, proximity: 'medium' }),
    10: () => ({ ...num, gen: genProduct, R: 3, C: 2, baseMin: 1, baseMax: 3, rowStepMin: 1, rowStepMax: 2, colStepMin: 1, colStepMax: 2, proximity: 'medium' }),
    11: () => ({ ...num, gen: genProduct, R: 3, C: 3, baseMin: 1, baseMax: 2, rowStepMin: 1, rowStepMax: 1, colStepMin: 1, colStepMax: 2, proximity: 'medium' }),
    12: () => ({ ...num, gen: genProduct, R: 3, C: 3, baseMin: 1, baseMax: 3, rowStepMin: 1, rowStepMax: 2, colStepMin: 1, colStepMax: 2, proximity: 'near' }),
    13: () => ({ ...num, gen: genColSum, R: 3, C: 3, cellMin: 1, cellMax: 6, proximity: 'medium' }),
    14: () => ({ ...num, gen: genColSum, R: 3, C: 3, cellMin: 2, cellMax: 9, proximity: 'near' }),
    15: () => ({ ...num, gen: genProduct, R: 3, C: 3, baseMin: 2, baseMax: 4, rowStepMin: 1, rowStepMax: 2, colStepMin: 1, colStepMax: 2, proximity: 'near' }),
    16: () => ({ ...num, gen: genProduct, R: 3, C: 3, baseMin: 2, baseMax: 5, rowStepMin: 1, rowStepMax: 2, colStepMin: 2, colStepMax: 3, proximity: 'near' }),
    17: () => ({ ...num, gen: genProduct, R: 3, C: 3, baseMin: 3, baseMax: 6, rowStepMin: 2, rowStepMax: 3, colStepMin: 2, colStepMax: 3, proximity: 'near' }),
    18: () => ({ ...num, gen: genColSum, R: 3, C: 3, cellMin: 4, cellMax: 11, proximity: 'near' }),
    19: () => ({ ...num, gen: genProduct, R: 3, C: 3, baseMin: 3, baseMax: 7, rowStepMin: 2, rowStepMax: 3, colStepMin: 2, colStepMax: 3, proximity: 'near' }),
    20: () => ({ ...num, gen: genProduct, R: 3, C: 3, baseMin: 4, baseMax: 8, rowStepMin: 2, rowStepMax: 3, colStepMin: 2, colStepMax: 4, proximity: 'near' }),
  };
  return table[d]();
}

/* ------------------------------------------------------------------ *
 * Distractor construction (named misconceptions -> lure taxonomy)
 * ------------------------------------------------------------------ */
const capFor = (display) => (display === 'dots' ? DOT_CAP : NUMERAL_CAP);
const inRange = (v, display) => Number.isInteger(v) && v >= 1 && v <= capFor(display);

function makeDistractors(rng, ctx) {
  const { g, R, C, holeValue, meta, display, proximity } = ctx;
  const copyLeft = g[R - 1][C - 2];
  const copyUp = g[R - 2] ? g[R - 2][C - 1] : undefined;

  // "wrong operation" reads: what a competing relation would put in the hole.
  const naivePlane = (() => {
    const a0 = g[0][0], bc = g[0][1] - a0, br = g[1] ? g[1][0] - a0 : 0;
    return a0 + br * (R - 1) + bc * (C - 1);
  })();
  const naiveProduct = (() => {
    const base = g[0][0]; if (!base) return undefined;
    const num = g[R - 1][0] * g[0][C - 1];
    return num % base === 0 ? num / base : undefined;
  })();
  const naiveColSum = (() => {
    if (C < 2) return undefined;
    let s = 0; for (let c = 0; c < C - 1; c++) s += g[R - 1][c]; return s;
  })();
  // single-relation reads: extend only the last row (ignore the column rule).
  const rowOnly = (() => {
    if (C >= 3) return copyLeft + (g[R - 1][C - 2] - g[R - 1][C - 3]);
    return copyLeft + (g[0][1] - g[0][0]);
  })();
  const colOnly = (() => {
    if (R >= 3) return copyUp + (g[R - 2][C - 1] - g[R - 3][C - 1]);
    return copyUp !== undefined ? copyUp + (g[1][0] - g[0][0]) : undefined;
  })();

  const cand = {
    copy_left: { value: copyLeft, lure: 'surface_match', misconception: 'copy_adjacent_cell' },
    copy_up: { value: copyUp, lure: 'surface_match', misconception: 'copy_adjacent_cell' },
    used_addition: { value: naivePlane, lure: 'rule_violation', misconception: 'added_instead_of_scaled' },
    used_scaling: { value: naiveProduct, lure: 'rule_violation', misconception: 'scaled_instead_of_added' },
    summed_row: { value: naiveColSum, lure: 'rule_violation', misconception: 'summed_the_row' },
    row_only: { value: rowOnly, lure: 'rule_violation', misconception: 'row_relation_only' },
    col_only: { value: colOnly, lure: 'rule_violation', misconception: 'column_relation_only' },
    off_plus1: { value: holeValue + 1, lure: 'near_order', misconception: 'off_by_one' },
    off_minus1: { value: holeValue - 1, lure: 'near_order', misconception: 'off_by_one' },
    random_far: { value: holeValue + rng.pick([-6, -5, -4, 4, 5, 6]), lure: 'distractor_other', misconception: 'random_choice' },
  };

  const byFamily = {
    plane: ['used_scaling', 'row_only', 'copy_left', 'off_plus1', 'off_minus1', 'random_far'],
    product: ['used_addition', 'row_only', 'copy_left', 'off_plus1', 'off_minus1', 'random_far'],
    colsum: ['used_addition', 'row_only', 'copy_left', 'off_plus1', 'off_minus1', 'random_far'],
  };
  const proxExtra = { far: ['random_far'], medium: ['off_plus1', 'random_far'], near: ['off_plus1', 'off_minus1', 'col_only'] };

  const chosen = [];
  const seen = new Set([String(holeValue)]);
  const tryAdd = (o) => {
    if (!o || o.value === undefined || o.value === null) return;
    if (!inRange(o.value, display)) return;
    const key = String(o.value);
    if (seen.has(key)) return;
    seen.add(key);
    chosen.push({ value: o.value, lure: o.lure, misconception: o.misconception });
  };

  const order = [...(byFamily[meta.family] || []), ...(proxExtra[proximity] || [])];
  for (const name of order) { if (chosen.length >= 3) break; tryAdd(cand[name]); }

  // fallback fill to guarantee exactly 3 distinct wrong options
  let delta = 1;
  while (chosen.length < 3 && delta < 40) {
    tryAdd({ value: holeValue + delta, lure: 'near_order', misconception: 'off_by_one' });
    tryAdd({ value: holeValue - delta, lure: 'near_order', misconception: 'off_by_one' });
    delta++;
  }
  return chosen.length >= 3 ? rng.shuffle(chosen).slice(0, 3) : null;
}

/* ------------------------------------------------------------------ *
 * Assemble a single verified BankItem for a target difficulty rung
 * ------------------------------------------------------------------ */
// The catalog declares only [2-3, 4-5, 6-8] for this type, so rungs 1-4 are the easy
// floor of the 2-3 band rather than a K-1 band of their own.
function ageBandsFor(target) {
  if (target <= 7) return ['2-3'];
  if (target === 8) return ['2-3', '4-5'];
  if (target <= 11) return ['4-5'];
  if (target === 12) return ['4-5', '6-8'];
  return ['6-8'];
}

function gridToCells(g, R, C) {
  const cells = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    cells.push(isHole(r, c, R, C) ? { hole: true } : { value: g[r][c] });
  }
  return cells;
}
function cellsToGrid(cells, R, C) {
  const g = Array.from({ length: R }, () => Array(C).fill(null));
  cells.forEach((cell, i) => {
    const r = Math.floor(i / C), c = i % C;
    g[r][c] = cell.hole ? null : cell.value;
  });
  return g;
}

function buildItem(masterSeed, target, ordinal) {
  const MAX_TRIES = 800;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${target}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);
    const cfg = configFor(rng, target);
    const built = cfg.gen(rng, cfg);
    const { g, R, C, holeValue, meta } = built;

    // display-range gate (all visible cells + the intended fill)
    if (!inRange(holeValue, cfg.display)) continue;
    let ok = true;
    for (let r = 0; r < R && ok; r++) for (let c = 0; c < C && ok; c++) {
      if (isHole(r, c, R, C)) continue;
      if (!inRange(g[r][c], cfg.display)) ok = false;
    }
    if (!ok) continue;

    // UNIQUE-fill gate (family-agnostic solver over the visible cells)
    const verdict = analyzeGrid(g, R, C);
    if (!verdict.unique || verdict.value !== holeValue) continue;

    // distractors
    const distractors = makeDistractors(rng, { g, R, C, holeValue, meta, display: cfg.display, proximity: cfg.proximity });
    if (!distractors) continue;

    // options: correct + 3 distractors, shuffled; keys assigned by final position
    const optDefs = rng.shuffle([{ value: holeValue, _correct: true }, ...distractors]);
    const options = optDefs.map((o, i) => ({ key: OPTION_KEYS[i], value: o.value }));
    const correctKey = OPTION_KEYS[optDefs.findIndex((o) => o._correct)];
    const distractorRationales = {};
    optDefs.forEach((o, i) => { if (!o._correct) distractorRationales[OPTION_KEYS[i]] = { lure: o.lure, misconception: o.misconception }; });

    // difficulty float: rung + small jitter (|.|<0.5 keeps the integer bin stable)
    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((target + jitter) * 100) / 100));

    const content = {
      typeCode: TYPE_CODE,
      display: cfg.display,                         // 'dots' (preliteracy) | 'numeral'
      attributes: ['count'],
      rows: R,
      cols: C,
      cells: gridToCells(g, R, C),                  // row-major; hole cell -> {hole:true}
      holeIndex: (R - 1) * C + (C - 1),
      options,
      prompt: 'Choose the amount that belongs in the empty cell.',
    };

    return {
      itemId: rng.uuid(),
      typeCode: TYPE_CODE,
      domain: DOMAIN,
      difficulty,
      ageBands: ageBandsFor(target),
      content,
      answer: { correctKey, distractorRationales },
      scoring: { mode: 'deterministic_key' },
      provenance: {
        generator: 'grammar',
        generatorRef: GENERATOR_REF,
        seed,
        ruleFamily: meta.family,
        ruleSpec: { ...meta, difficultyRung: target, gridSize: `${R}x${C}`, aboveLevel: target >= 16 },
        validator: [
          { check: 'unique_answer', status: 'pass', detail: `hyps={${[...verdict.preds.keys()].join(',')}} -> ${verdict.value}` },
          { check: 'key_matches_solver', status: 'pass' },
          { check: 'lure_taxonomy_ok', status: 'pass' },
          { check: 'reading_load_ok', status: 'pass', detail: 'no prose stimulus; single instruction line' },
        ],
      },
      syntheticOnly: true,
      validated: false,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Post-write verification: parse every line + coverage (>=5 per ±1pt band)
 * + re-derive the key from served content alone (no-leak / solver check)
 * ------------------------------------------------------------------ */
function verifyBank(path) {
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim());
  const items = [];
  const problems = [];
  lines.forEach((line, i) => {
    let it; try { it = JSON.parse(line); } catch (e) { problems.push(`line ${i + 1}: JSON parse error`); return; }
    items.push(it);
    if (it.typeCode !== TYPE_CODE) problems.push(`${it.itemId}: bad typeCode`);
    if (it.domain !== DOMAIN) problems.push(`${it.itemId}: bad domain`);
    if (!(it.difficulty >= 1 && it.difficulty <= 20)) problems.push(`${it.itemId}: difficulty out of range`);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.scoring?.mode !== 'deterministic_key') problems.push(`${it.itemId}: scoring mode`);
    const opts = it.content?.options || [];
    if (opts.length !== 4) problems.push(`${it.itemId}: expected 4 options`);
    const keys = opts.map((o) => o.key);
    if (!keys.includes(it.answer?.correctKey)) problems.push(`${it.itemId}: correctKey not an option`);
    const nonCorrect = keys.filter((k) => k !== it.answer.correctKey);
    for (const k of nonCorrect) if (!it.answer.distractorRationales?.[k]) problems.push(`${it.itemId}: missing rationale for ${k}`);
    const sig = new Set(opts.map((o) => String(o.value)));
    if (sig.size !== opts.length) problems.push(`${it.itemId}: duplicate options`);
    // exactly one hole cell, at the declared index
    const holes = (it.content.cells || []).filter((c) => c.hole);
    if (holes.length !== 1) problems.push(`${it.itemId}: expected exactly one empty cell`);
    if (it.content.cells?.[it.content.holeIndex]?.hole !== true) problems.push(`${it.itemId}: holeIndex mismatch`);
    // NO-LEAK solver check: recover the fill from served cells only
    const g = cellsToGrid(it.content.cells, it.content.rows, it.content.cols);
    const verdict = analyzeGrid(g, it.content.rows, it.content.cols);
    const correctOpt = opts.find((o) => o.key === it.answer.correctKey);
    if (!verdict.unique) problems.push(`${it.itemId}: solver found non-unique fill`);
    else if (verdict.value !== correctOpt.value) problems.push(`${it.itemId}: solver value != keyed value`);
  });

  // coverage: every integer band p in 1..20 needs >=5 items with |difficulty-p|<=1
  const bands = {};
  const rounded = {};
  for (let p = 1; p <= 20; p++) bands[p] = 0;
  for (const it of items) {
    for (let p = 1; p <= 20; p++) if (Math.abs(it.difficulty - p) <= 1) bands[p]++;
    const r = Math.round(it.difficulty); rounded[r] = (rounded[r] || 0) + 1;
  }
  const thinBands = Object.entries(bands).filter(([, c]) => c < 5).map(([p]) => p);
  return { count: items.length, bands, rounded, thinBands, problems, items };
}

/* ------------------------------------------------------------------ */
function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }));
  const masterSeed = args.seed || 'quant-matrix-01-v1';
  const perTarget = parseInt(args.per || '6', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-MATRIX-01.jsonl');

  mkdirSync(dirname(outPath), { recursive: true });

  const items = [];
  const perTargetCount = {};
  for (let target = 1; target <= 20; target++) {
    let made = 0;
    for (let ordinal = 0; ordinal < perTarget; ordinal++) {
      const it = buildItem(masterSeed, target, ordinal);
      if (it) { items.push(it); made++; }
    }
    perTargetCount[target] = made;
  }

  const jsonl = serializeBank(items);
  writeFileSync(outPath, jsonl, 'utf8');

  const v = verifyBank(outPath);

  // ---- report ----
  console.log(`\nQUANT-MATRIX-01 bank written: ${outPath}`);
  console.log(`items: ${v.count}  (target ${perTarget}/rung x 20 rungs)`);
  console.log('\nrung -> made:');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${perTargetCount[i + 1]}`).join('  '));
  console.log('\n±1pt band coverage (need >=5):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.bands[i + 1]}`).join('  '));
  const fams = {};
  for (const it of v.items) fams[it.provenance.ruleFamily] = (fams[it.provenance.ruleFamily] || 0) + 1;
  console.log('\nrule families:', JSON.stringify(fams));

  if (v.thinBands.length) console.log(`\nWARN thin ±1pt bands (<5): ${v.thinBands.join(', ')}`);
  if (v.problems.length) {
    console.log(`\nFAIL ${v.problems.length} validation problem(s):`);
    v.problems.slice(0, 25).forEach((p) => console.log('  - ' + p));
    process.exitCode = 1;
    return;
  }
  if (v.thinBands.length) { process.exitCode = 1; return; }
  console.log('\nOK: JSONL parses, coverage >=5 per ±1pt band, and the solver re-derives every key from served content (no leak).');
}

main();
