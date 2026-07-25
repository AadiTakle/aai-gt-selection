#!/usr/bin/env node
/**
 * QUANT-EQUAL-01 — "Make It Equal" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2). Every item is
 * born-synthetic (syntheticOnly:true, validated:false); `difficulty` is a DESIGN
 * rung (FLOAT 1..20), NOT a calibrated IRT parameter.
 *
 * CONSTRUCT: relational interpretation of the equal sign (McNeil & Alibali 2005;
 * Carpenter, Franke & Levi 2003). An item is two signed term lists around `=`,
 * one or more of which is a SLOT holding the same unknown quantity. The child
 * picks the tile that makes both sides the same amount.
 *
 * Difficulty rises along the type's declared levers (master_types.jsonl):
 *   canonical -> non-canonical layout | unknown position | one -> many operations
 *   across both sides | concrete support faded (dots -> dots+bar -> numeral+bar ->
 *   numeral) | structure family (direct -> compensation -> decomposition ->
 *   inverse -> repeated group -> unknown on BOTH sides) | distractor strength.
 *
 * ARITHMETIC LOAD IS DELIBERATELY HELD DOWN. The top band (16-20) is hard because
 * the same unknown appears in repeated groups on both sides of the equal sign —
 * real algebraic-equivalence reasoning — not because the numbers are bigger. Every
 * keyed value stays a small positive integer.
 *
 * Every emitted item is verified by a family-agnostic linear solver that reads the
 * SERVED content only: each side reduces to (m*x + c), so a unique key exists iff
 * mLeft != mRight, and the key is (cRight-cLeft)/(mLeft-mRight). The same solver
 * recovers the key without the answer block, so no answer data need live in
 * `content`.
 *
 * Usage:  node QUANT-EQUAL-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-equal-01-v1", 7 items per difficulty rung (1..20) -> 140.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-EQUAL-01';
const DOMAIN = 'quantitative';
const DEMO_PATH = 'demos/QUANT-EQUAL-01.html';
const GENERATOR_REF = 'QUANT-EQUAL-01-grammar@1';
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
const TILE_MIN = 1;
const TILE_MAX = 40;          // largest tile quantity a child ever has to pick
const DOT_CAP = 12;           // countable dot-group ceiling (concrete displays)
const SIDE_CAP = 60;          // largest side total we allow (keeps bars readable)

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
 * Term algebra. A term is a signed, optionally repeated quantity:
 *   {kind:'num', op:'+'|'-', value, times}   -> times copies of `value`
 *   {kind:'slot', op:'+'|'-', times}          -> times copies of the unknown
 * A side therefore evaluates to (m * x + c).
 * ------------------------------------------------------------------ */
export const num = (value, op = '+', times = 1) => ({ kind: 'num', op, value, times });
export const slot = (op = '+', times = 1) => ({ kind: 'slot', op, times });

export function coeffs(side) {
  let m = 0, c = 0;
  for (const t of side) {
    const s = t.op === '-' ? -1 : 1;
    const k = t.times || 1;
    if (t.kind === 'slot') m += s * k;
    else c += s * k * t.value;
  }
  return { m, c };
}
/** Family-agnostic solver over the served term lists. null when not uniquely pinned. */
export function solveEquation(left, right) {
  const L = coeffs(left), R = coeffs(right);
  const den = L.m - R.m;
  if (den === 0) return null;                       // unknown cancels -> no unique key
  const numer = R.c - L.c;
  if (numer % den !== 0) return null;               // non-integer -> not a tile quantity
  return numer / den;
}
const sideValue = (side, x) => { const { m, c } = coeffs(side); return m * x + c; };
/** Running total must never go negative: "take away" must be physically showable. */
function runningOk(side, x) {
  let run = 0;
  for (const t of side) {
    const s = t.op === '-' ? -1 : 1;
    const k = t.times || 1;
    run += s * k * (t.kind === 'slot' ? x : t.value);
    if (run < 0) return false;
  }
  return true;
}
const termMagnitude = (t, x) => (t.times || 1) * (t.kind === 'slot' ? x : t.value);

/* ------------------------------------------------------------------ *
 * Structure families. Each picks the KEY x first, then builds an equation
 * around it, so the arithmetic stays small while the structure carries the
 * difficulty.
 * ------------------------------------------------------------------ */
const F = {
  // a + b = _            (canonical: the classic "answer after equals" layout)
  canonical_sum: (rng, cfg) => {
    const a = rng.int(1, cfg.max), b = rng.int(1, cfg.max);
    return { left: [num(a), num(b)], right: [slot()], layout: 'canonical' };
  },
  // _ = a + b            (reversed canonical: unknown before the operations)
  reversed_canonical: (rng, cfg) => {
    const a = rng.int(1, cfg.max), b = rng.int(1, cfg.max);
    return { left: [slot()], right: [num(a), num(b)], layout: 'canonical' };
  },
  // a + b = _ + c        (non-canonical, unknown first on the right)
  noncanon_slot_first: (rng, cfg) => {
    const x = rng.int(1, cfg.max), c = rng.int(1, cfg.max);
    const a = rng.int(1, cfg.max); const b = x + c - a;
    return { left: [num(a), num(b)], right: [slot(), num(c)], layout: 'non_canonical' };
  },
  // a + b = c + _        (non-canonical, unknown last)
  noncanon_slot_last: (rng, cfg) => {
    const x = rng.int(1, cfg.max), c = rng.int(1, cfg.max);
    const a = rng.int(1, cfg.max); const b = x + c - a;
    return { left: [num(a), num(b)], right: [num(c), slot()], layout: 'non_canonical' };
  },
  // a + _ = c + d        (unknown on the LEFT of the equal sign)
  unknown_on_left: (rng, cfg) => {
    const x = rng.int(1, cfg.max), a = rng.int(1, cfg.max);
    const c = rng.int(1, cfg.max); const d = a + x - c;
    return { left: [num(a), slot()], right: [num(c), num(d)], layout: 'non_canonical' };
  },
  // a + b = (a-k) + _    (compensation: one side shifted by k, so x = b + k)
  compensation: (rng, cfg) => {
    const k = rng.int(1, cfg.shift || 3);
    const b = rng.int(1, Math.max(1, cfg.max - k));
    const a = rng.int(k + 1, cfg.max);
    return { left: [num(a), num(b)], right: [num(a - k), slot()], layout: 'non_canonical' };
  },
  // a + _ = (a+k) + d    (compensation with the unknown on the left)
  compensation_left: (rng, cfg) => {
    const k = rng.int(1, cfg.shift || 3);
    const a = rng.int(1, cfg.max), d = rng.int(1, Math.max(1, cfg.max - k));
    return { left: [num(a), slot()], right: [num(a + k), num(d)], layout: 'non_canonical' };
  },
  // a + b = a + k + _    (decomposition: b is split into k and the unknown)
  decomposition: (rng, cfg) => {
    const a = rng.int(1, cfg.max);
    const b = rng.int(2, cfg.max);
    const k = rng.int(1, b - 1);
    return { left: [num(a), num(b)], right: [num(a), num(k), slot()], layout: 'non_canonical' };
  },
  // a - b = _ + c        (inverse: a removal on one side only)
  inverse_sub: (rng, cfg) => {
    const x = rng.int(1, cfg.max), c = rng.int(1, cfg.max), b = rng.int(1, cfg.max);
    const a = x + c + b;
    return { left: [num(a), num(b, '-')], right: [slot(), num(c)], layout: 'non_canonical' };
  },
  // a - b = _ - c        (removals on BOTH sides)
  sub_both: (rng, cfg) => {
    const x = rng.int(2, cfg.max), c = rng.int(1, Math.min(x - 1, cfg.max));
    const b = rng.int(1, cfg.max); const a = x - c + b;
    return { left: [num(a), num(b, '-')], right: [slot(), num(c, '-')], layout: 'non_canonical' };
  },
  // a + b = c + _ + d    (three terms opposite the unknown's neighbours)
  three_term: (rng, cfg) => {
    const x = rng.int(1, cfg.max), c = rng.int(1, cfg.max), d = rng.int(1, cfg.max);
    const a = rng.int(1, cfg.max); const b = x + c + d - a;
    return { left: [num(a), num(b)], right: [num(c), slot(), num(d)], layout: 'non_canonical' };
  },
  // k groups of a = _ + b        (repeated group visible)
  group_visible: (rng, cfg) => {
    const k = rng.int(2, cfg.groupMax || 3);
    const a = rng.int(2, cfg.max), b = rng.int(1, cfg.max);
    return { left: [num(a, '+', k)], right: [slot(), num(b)], layout: 'non_canonical' };
  },
  // k groups of _ = a + b        (unknown INSIDE a repeated group)
  group_slot: (rng, cfg) => {
    const k = rng.int(2, cfg.groupMax || 3);
    const x = rng.int(2, Math.max(2, Math.floor(cfg.max)));
    const a = rng.int(1, k * x - 1); const b = k * x - a;
    return { left: [slot('+', k)], right: [num(a), num(b)], layout: 'non_canonical' };
  },
  // k groups of a + b = _ + c    (group plus a loose term)
  mixed_group: (rng, cfg) => {
    const k = rng.int(2, cfg.groupMax || 3);
    const a = rng.int(2, cfg.max), b = rng.int(1, cfg.max), c = rng.int(1, cfg.max);
    return { left: [num(a, '+', k), num(b)], right: [slot(), num(c)], layout: 'non_canonical' };
  },
  // k groups of _ - b = c + d    (unknown in a group, with a removal)
  group_slot_sub: (rng, cfg) => {
    const k = rng.int(2, cfg.groupMax || 3);
    const x = rng.int(2, Math.max(2, cfg.max));
    const b = rng.int(1, Math.min(cfg.max, k * x - 2));
    const rest = k * x - b;
    const c = rng.int(1, rest - 1); const d = rest - c;
    return { left: [slot('+', k), num(b, '-')], right: [num(c), num(d)], layout: 'non_canonical' };
  },
  // j groups of _ + k groups of a = b + c   (two coefficients on one side)
  two_groups: (rng, cfg) => {
    const j = rng.int(2, cfg.groupMax || 3), k = rng.int(2, cfg.groupMax || 3);
    const x = rng.int(2, Math.max(2, cfg.max));
    const a = rng.int(1, cfg.max);
    const total = j * x + k * a;
    const b = rng.int(1, total - 1); const c = total - b;
    return { left: [slot('+', j), num(a, '+', k)], right: [num(b), num(c)], layout: 'non_canonical' };
  },
  // j groups of _ + a = _ + b    (SAME unknown on both sides -> real equivalence)
  slot_both_add: (rng, cfg) => {
    const j = rng.int(2, cfg.groupMax || 3);
    const x = rng.int(2, Math.max(2, cfg.max));
    const a = rng.int(1, cfg.max);
    const b = a + (j - 1) * x;
    return { left: [slot('+', j), num(a)], right: [slot(), num(b)], layout: 'non_canonical' };
  },
  // j groups of _ - a = k groups of _ + b   (unknown both sides, with a removal)
  slot_both_sub: (rng, cfg) => {
    const k = rng.int(1, (cfg.groupMax || 3) - 1);
    const j = rng.int(k + 1, cfg.groupMax || 4);
    const x = rng.int(2, Math.max(2, cfg.max));
    const a = rng.int(1, Math.max(1, (j - k) * x - 1));
    const b = (j - k) * x - a;
    return { left: [slot('+', j), num(a, '-')], right: [slot('+', k), num(b)], layout: 'non_canonical' };
  },
  // j groups of _ + a = k groups of _ + m groups of b + c  (deepest structure)
  slot_both_group: (rng, cfg) => {
    const k = rng.int(1, (cfg.groupMax || 3) - 1);
    const j = rng.int(k + 1, cfg.groupMax || 4);
    const x = rng.int(2, Math.max(2, cfg.max));
    const m = rng.int(2, 3);
    const b = rng.int(2, cfg.max);
    const a = rng.int(1, cfg.max);
    const c = (j - k) * x + a - m * b;
    return { left: [slot('+', j), num(a)], right: [slot('+', k), num(b, '+', m), num(c)], layout: 'non_canonical' };
  },
};

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> {families, display, levers}
 * Concrete support fades as the structural demand rises (Rittle-Johnson &
 * Alibali 1999): dots -> dots+bar -> numeral+bar -> numeral.
 * ------------------------------------------------------------------ */
function configFor(rng, d) {
  const table = {
    1: { fams: ['canonical_sum'], display: 'dots', max: 4, options: 4, proximity: 'far' },
    2: { fams: ['canonical_sum', 'reversed_canonical'], display: 'dots', max: 6, options: 4, proximity: 'far' },
    3: { fams: ['noncanon_slot_first'], display: 'dots', max: 5, options: 4, proximity: 'far' },
    4: { fams: ['noncanon_slot_first', 'noncanon_slot_last'], display: 'dots', max: 7, options: 4, proximity: 'medium' },
    5: { fams: ['unknown_on_left'], display: 'dots_bar', max: 8, options: 4, proximity: 'medium' },
    6: { fams: ['noncanon_slot_last', 'unknown_on_left'], display: 'dots_bar', max: 10, options: 4, proximity: 'medium' },
    7: { fams: ['compensation'], display: 'dots_bar', max: 10, shift: 2, options: 5, proximity: 'medium' },
    8: { fams: ['decomposition'], display: 'numeral_bar', max: 12, options: 5, proximity: 'medium' },
    9: { fams: ['compensation_left', 'compensation'], display: 'numeral_bar', max: 16, shift: 4, options: 5, proximity: 'near' },
    10: { fams: ['inverse_sub'], display: 'numeral_bar', max: 12, options: 5, proximity: 'near' },
    11: { fams: ['sub_both'], display: 'numeral_bar', max: 14, options: 5, proximity: 'near' },
    12: { fams: ['three_term'], display: 'numeral_bar', max: 14, options: 5, proximity: 'near' },
    13: { fams: ['group_visible'], display: 'numeral', max: 9, groupMax: 3, options: 5, proximity: 'near' },
    14: { fams: ['group_slot'], display: 'numeral', max: 9, groupMax: 3, options: 6, proximity: 'near' },
    15: { fams: ['mixed_group'], display: 'numeral', max: 9, groupMax: 3, options: 6, proximity: 'near' },
    16: { fams: ['group_slot_sub'], display: 'numeral', max: 9, groupMax: 3, options: 6, proximity: 'near' },
    17: { fams: ['two_groups'], display: 'numeral', max: 8, groupMax: 3, options: 6, proximity: 'near' },
    18: { fams: ['slot_both_add'], display: 'numeral', max: 8, groupMax: 3, options: 6, proximity: 'near' },
    19: { fams: ['slot_both_sub'], display: 'numeral', max: 8, groupMax: 4, options: 6, proximity: 'near' },
    20: { fams: ['slot_both_group'], display: 'numeral', max: 8, groupMax: 4, options: 6, proximity: 'near' },
  };
  const cfg = { ...table[d] };
  cfg.family = rng.pick(cfg.fams);
  return cfg;
}

/* ------------------------------------------------------------------ *
 * Structural legality gate. Rejects anything a renderer could not show
 * honestly, or whose arithmetic load would swamp the equivalence demand.
 * ------------------------------------------------------------------ */
function legal(left, right, x, cfg) {
  if (!Number.isInteger(x) || x < TILE_MIN || x > TILE_MAX) return false;
  const cap = cfg.display === 'dots' || cfg.display === 'dots_bar' ? DOT_CAP : TILE_MAX;
  if (x > cap) return false;
  for (const t of [...left, ...right]) {
    if (t.kind === 'num') {
      if (!Number.isInteger(t.value) || t.value < 1 || t.value > cap) return false;
    }
    if ((t.times || 1) > 4) return false;
  }
  if (sideValue(left, x) !== sideValue(right, x)) return false;
  if (sideValue(left, x) < 1 || sideValue(left, x) > SIDE_CAP) return false;
  if (!runningOk(left, x) || !runningOk(right, x)) return false;
  // Concrete displays must stay countable: total dots per side stay small.
  if (cfg.display === 'dots' && sideValue(left, x) > DOT_CAP + 6) return false;
  return true;
}

/* ------------------------------------------------------------------ *
 * Distractors — each is a NAMED misconception from the equivalence
 * literature, re-derived by solving a DELIBERATELY BROKEN reading of the
 * same equation. M-LURETYPE / M-ERRTYPE consume these labels.
 * ------------------------------------------------------------------ */
const withTimesFlattened = (side) => side.map((t) => ({ ...t, times: 1 }));
const withSlotOpFlipped = (side) => side.map((t) => (t.kind === 'slot' ? { ...t, op: t.op === '-' ? '+' : '-' } : t));
const withLastOpFlipped = (side) => {
  const out = side.map((t) => ({ ...t }));
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].kind === 'num' && i > 0) { out[i].op = out[i].op === '-' ? '+' : '-'; break; }
  }
  return out;
};
const dropExtraSlots = (side, keepFirst) => {
  let seen = keepFirst;
  return side.flatMap((t) => {
    if (t.kind !== 'slot') return [t];
    if (!seen) { seen = true; return [t]; }
    return [];
  });
};

function misconceptionCandidates(left, right, x) {
  const out = [];
  const add = (value, lure, misconception, note) => {
    if (value == null || !Number.isInteger(value)) return;
    out.push({ value, lure, misconception, note });
  };
  const slotOnLeft = left.some((t) => t.kind === 'slot');
  const ownSide = slotOnLeft ? left : right;
  const otherSide = slotOnLeft ? right : left;

  // "add up everything you can see" — the strongest operational signature.
  const totalAll = [...left, ...right].reduce((s, t) => s + (t.kind === 'num' ? (t.times || 1) * t.value : 0), 0);
  add(totalAll, 'operational_total_all', 'adds_every_visible_number',
    'sums every number on both sides: the equal sign read as "and then"');

  // "the total of the other side" — answer-after-equals / operational reading.
  add(Math.abs(coeffs(otherSide).c), 'operational_answer_after_equals', 'writes_other_side_total',
    'writes the total of the side without the box instead of balancing');

  // "the total of my own side's visible numbers" — side confusion.
  add(Math.abs(coeffs(ownSide).c), 'side_confusion', 'uses_own_side_visible_total',
    'ignores the other side and reuses the numbers next to the box');

  // difference of the two visible sides — a partial relational attempt.
  add(Math.abs(coeffs(left).c - coeffs(right).c), 'side_confusion', 'difference_of_visible_sides',
    'subtracts the visible sides without accounting for the box structure');

  // repeated group read as a single group.
  const flatX = solveEquation(withTimesFlattened(left), withTimesFlattened(right));
  add(flatX, 'group_structure', 'ignores_repeated_group',
    'reads each repeated group as one group, losing the multiplier');

  // the multiplier applied to the answer instead of inside the group.
  const grouped = [...left, ...right].find((t) => t.kind === 'slot' && (t.times || 1) > 1);
  if (grouped) {
    add(x * grouped.times, 'group_structure', 'multiplies_the_answer',
      'gives the whole group total instead of one group');
  }

  // only the first box counted when the unknown appears twice.
  const slotCount = [...left, ...right].filter((t) => t.kind === 'slot').length;
  if (slotCount > 1) {
    const partial = solveEquation(dropExtraSlots(left, false), dropExtraSlots(right, left.some((t) => t.kind === 'slot')));
    add(partial, 'partial_structure', 'solves_for_one_box_only',
      'treats only one box as unknown and ignores the matching box on the other side');
  }

  // joining where the child should remove (and vice versa).
  add(solveEquation(withSlotOpFlipped(left), withSlotOpFlipped(right)), 'inverse_operation', 'flips_the_box_operation',
    'adds where the box is taken away (or the reverse)');
  add(solveEquation(withLastOpFlipped(left), withLastOpFlipped(right)), 'inverse_operation', 'flips_a_visible_operation',
    'reverses a join/remove action shown in the equation');

  // surface copy of a neighbouring quantity, then of any visible quantity.
  const ownNums = ownSide.filter((t) => t.kind === 'num');
  if (ownNums.length) add(ownNums[ownNums.length - 1].value, 'surface_match', 'copies_neighbour_quantity',
    'copies the quantity sitting next to the box');
  for (const t of [...left, ...right]) {
    if (t.kind === 'num') add(t.value, 'surface_match', 'copies_a_visible_quantity',
      'reuses one quantity from the equation instead of balancing the sides');
  }

  // near-miss ordering errors.
  add(x + 1, 'near_order', 'off_by_one_high', 'one more than the balancing amount');
  add(x - 1, 'near_order', 'off_by_one_low', 'one less than the balancing amount');
  add(x + 2, 'near_order', 'off_by_two_high', 'two more than the balancing amount');
  add(x - 2, 'near_order', 'off_by_two_low', 'two less than the balancing amount');
  return out;
}

const PROXIMITY_ORDER = {
  far: ['operational_total_all', 'operational_answer_after_equals', 'side_confusion', 'surface_match', 'near_order'],
  medium: ['operational_total_all', 'operational_answer_after_equals', 'side_confusion', 'inverse_operation', 'near_order', 'surface_match'],
  near: ['group_structure', 'partial_structure', 'inverse_operation', 'operational_total_all', 'operational_answer_after_equals', 'side_confusion', 'near_order', 'surface_match'],
};

function makeDistractors(rng, left, right, x, cfg) {
  const wanted = cfg.options - 1;
  const cap = cfg.display === 'dots' || cfg.display === 'dots_bar' ? DOT_CAP : TILE_MAX;
  const pool = misconceptionCandidates(left, right, x)
    .filter((d) => d.value >= TILE_MIN && d.value <= cap && d.value !== x);

  const chosen = [];
  const used = new Set([x]);
  const take = (d) => {
    if (chosen.length >= wanted || used.has(d.value)) return;
    used.add(d.value);
    chosen.push(d);
  };
  for (const lure of PROXIMITY_ORDER[cfg.proximity]) pool.filter((d) => d.lure === lure).forEach(take);
  pool.forEach(take);                                   // any remaining named misconception
  // fallback: nearest unused quantities, still labelled as ordering near-misses
  for (let delta = 1; chosen.length < wanted && delta <= cap; delta++) {
    for (const v of [x + delta, x - delta]) {
      if (v >= TILE_MIN && v <= cap && !used.has(v)) {
        take({ value: v, lure: 'near_order', misconception: `off_by_${delta}`, note: `${delta} away from the balancing amount` });
      }
    }
  }
  return chosen.length === wanted ? chosen : null;
}

/* ------------------------------------------------------------------ *
 * Age-band targeting hint. QUANT-EQUAL-01 declares 2-3 | 4-5 | 6-8 only
 * (master_types.jsonl): the equal sign plus join/remove notation is the
 * construct, so the type has no K-1 floor even at rung 1.
 * ------------------------------------------------------------------ */
export function ageBandsFor(target) {
  if (target <= 6) return ['2-3'];
  if (target <= 8) return ['2-3', '4-5'];
  if (target <= 12) return ['4-5'];
  if (target === 13) return ['4-5', '6-8'];
  return ['6-8'];
}

const PROMPT = 'Put a tile in the box so both sides have the same amount.';
const PROMPT_MULTI = 'Put a tile in the boxes so both sides have the same amount. Every box gets the same tile.';

/* ------------------------------------------------------------------ *
 * Assemble a single verified BankItem for a target difficulty rung
 * ------------------------------------------------------------------ */
export function buildItem(masterSeed, target, ordinal) {
  const MAX_TRIES = 800;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${target}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);
    const cfg = configFor(rng, target);
    const built = F[cfg.family](rng, cfg);
    const { left, right, layout } = built;

    const x = solveEquation(left, right);
    if (x === null) continue;
    if (!legal(left, right, x, cfg)) continue;

    const distractors = makeDistractors(rng, left, right, x, cfg);
    if (!distractors) continue;

    const slotTerms = [...left, ...right].filter((t) => t.kind === 'slot');
    const slotCount = slotTerms.reduce((s, t) => s + (t.times || 1), 0);
    const slotSide = left.some((t) => t.kind === 'slot')
      ? (right.some((t) => t.kind === 'slot') ? 'both' : 'left')
      : 'right';

    // options: key = final shuffled position, so the key carries no positional hint
    const optDefs = rng.shuffle([{ value: x, _correct: true }, ...distractors]);
    const options = optDefs.map((o, i) => ({ key: OPTION_KEYS[i], value: o.value }));
    const correctKey = OPTION_KEYS[optDefs.findIndex((o) => o._correct)];
    const distractorRationales = {};
    optDefs.forEach((o, i) => {
      if (o._correct) return;
      distractorRationales[OPTION_KEYS[i]] = { lure: o.lure, misconception: o.misconception, note: o.note };
    });

    // difficulty float: rung + jitter (|jitter| < 0.5 keeps the integer bin stable)
    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((target + jitter) * 100) / 100));

    const content = {
      typeCode: TYPE_CODE,
      prompt: slotCount > 1 ? PROMPT_MULTI : PROMPT,
      display: cfg.display,                 // dots | dots_bar | numeral_bar | numeral
      layout,                                // canonical | non_canonical
      slotSide,                              // left | right | both
      slotCount,                             // how many boxes take the SAME tile
      left,                                  // signed term list (renderer-agnostic)
      right,
      options,                               // {key, value} only — no lure, no key
    };

    return {
      itemId: rng.uuid(),
      typeCode: TYPE_CODE,
      domain: DOMAIN,
      difficulty,
      ageBands: ageBandsFor(target),
      demoPath: DEMO_PATH,
      content,
      answer: { correctKey, distractorRationales },
      scoring: { mode: 'deterministic_key' },
      provenance: {
        generator: 'grammar',
        generatorRef: GENERATOR_REF,
        seed,
        structureFamily: cfg.family,
        levers: {
          difficultyRung: target,
          display: cfg.display,
          layout,
          slotSide,
          slotCount,
          operationCount: [...left, ...right].length - 1,
          maxGroupSize: Math.max(...[...left, ...right].map((t) => t.times || 1)),
          distractorProximity: cfg.proximity,
          aboveLevel: target >= 16,
        },
        validator: [
          { check: 'unique_answer', status: 'pass', detail: `mL-mR=${coeffs(left).m - coeffs(right).m} != 0` },
          { check: 'key_matches_solver', status: 'pass', detail: `x=${x}` },
          { check: 'arithmetic_below_structure', status: 'pass', detail: `max side total ${sideValue(left, x)}` },
          { check: 'lure_taxonomy_ok', status: 'pass' },
          { check: 'reading_load_ok', status: 'pass', detail: 'single instruction line; no prose stimulus' },
        ],
      },
      syntheticOnly: true,
      validated: false,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Post-write verification (the generator's own smoke check; the binding
 * independent re-derivation lives in check-QUANT-EQUAL-01.mjs)
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
    if (opts.length < 4 || opts.length > 6) problems.push(`${it.itemId}: option count ${opts.length}`);
    const keys = opts.map((o) => o.key);
    if (new Set(opts.map((o) => o.value)).size !== opts.length) problems.push(`${it.itemId}: duplicate option values`);
    if (!keys.includes(it.answer?.correctKey)) problems.push(`${it.itemId}: correctKey not an option`);
    for (const k of keys.filter((k) => k !== it.answer.correctKey)) {
      if (!it.answer.distractorRationales?.[k]) problems.push(`${it.itemId}: missing rationale for ${k}`);
    }
    // no-leak solver check: recover the key from served content alone
    const x = solveEquation(it.content.left, it.content.right);
    const keyed = opts.find((o) => o.key === it.answer.correctKey);
    if (x === null) problems.push(`${it.itemId}: solver found no unique key`);
    else if (x !== keyed.value) problems.push(`${it.itemId}: solver ${x} != keyed ${keyed.value}`);
    else if (opts.filter((o) => o.value === x).length !== 1) problems.push(`${it.itemId}: key value not unique among options`);
    if (/"correctKey"|"lure"|"misconception"/.test(JSON.stringify(it.content))) problems.push(`${it.itemId}: content leaks answer data`);
  });

  const bands = {}, rounded = {};
  for (let p = 1; p <= 20; p++) bands[p] = 0;
  for (const it of items) {
    for (let p = 1; p <= 20; p++) if (Math.abs(it.difficulty - p) <= 1) bands[p]++;
    const r = Math.round(it.difficulty); rounded[r] = (rounded[r] || 0) + 1;
  }
  const thinBands = Object.entries(bands).filter(([, c]) => c < 5).map(([p]) => p);
  const thinBins = Array.from({ length: 20 }, (_, i) => i + 1).filter((k) => (rounded[k] || 0) < 5);
  return { count: items.length, bands, rounded, thinBands, thinBins, problems, items };
}

/* ------------------------------------------------------------------ */
function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }));
  const masterSeed = args.seed || 'quant-equal-01-v1';
  const perTarget = parseInt(args.per || '7', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-EQUAL-01.jsonl');
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

  writeFileSync(outPath, items.map((it) => JSON.stringify(it)).join('\n') + '\n', 'utf8');
  const v = verifyBank(outPath);

  console.log(`\nQUANT-EQUAL-01 bank written: ${outPath}`);
  console.log(`items: ${v.count}  (target ${perTarget}/rung x 20 rungs)`);
  console.log('\nrung -> made:');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${perTargetCount[i + 1]}`).join('  '));
  console.log('\ninteger bin counts (need >=5):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.rounded[i + 1] || 0}`).join('  '));
  console.log('\n±1pt band coverage (need >=5):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.bands[i + 1]}`).join('  '));
  const fams = {};
  for (const it of v.items) fams[it.provenance.structureFamily] = (fams[it.provenance.structureFamily] || 0) + 1;
  console.log('\nstructure families:', JSON.stringify(fams));
  const lures = {};
  for (const it of v.items) for (const r of Object.values(it.answer.distractorRationales)) lures[r.lure] = (lures[r.lure] || 0) + 1;
  console.log('lure taxonomy:', JSON.stringify(lures));

  if (v.problems.length) {
    console.log(`\nFAIL ${v.problems.length} validation problem(s):`);
    v.problems.slice(0, 25).forEach((p) => console.log('  - ' + p));
    process.exitCode = 1;
    return;
  }
  if (v.thinBins.length || v.thinBands.length) {
    console.log(`\nFAIL thin coverage — bins: ${v.thinBins.join(', ') || 'none'} / bands: ${v.thinBands.join(', ') || 'none'}`);
    process.exitCode = 1;
    return;
  }
  console.log('\nOK: JSONL parses, >=5 items per integer bin and per ±1pt band, and the linear solver re-derives every key from served content (no leak).');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
