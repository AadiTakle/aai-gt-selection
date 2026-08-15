#!/usr/bin/env node
/**
 * QUANT-SERIES-01 — "Pattern Steps" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2 and
 * docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md). Every item is born-synthetic
 * (syntheticOnly:true, validated:false); difficulty is a design rung (FLOAT
 * 1..20), NOT a calibrated IRT parameter.
 *
 * Difficulty rises along the type's declared levers (types_quantitative.jsonl):
 *   rule family (repeat -> additive -> multiplicative -> growing-step ->
 *   alternating -> interleaved -> interleaved+attribute), step size, number of
 *   coordinated attributes/streams, representation (dots/object-groups at the
 *   preliteracy floor -> supported numerals higher up), and distractor proximity.
 *
 * Every emitted item is verified to have a UNIQUE continuation: a family-agnostic
 * solver enumerates a hypothesis space (constant / arithmetic / geometric /
 * quadratic / fibonacci / periodic / alternating / interleaved) over the visible
 * numeric terms and accepts the item only when all consistent hypotheses agree on
 * exactly one next value, and that value equals the intended key. The same solver
 * recovers the key from the served content alone (no key leak), so it doubles as
 * the deterministic validator.
 *
 * Usage:  node QUANT-SERIES-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-series-01-v1", 6 items per difficulty rung (1..20) -> ~120.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';
import { VarietyLedger } from './variety.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-SERIES-01';
const DOMAIN = 'quantitative';
const GENERATOR_REF = 'QUANT-SERIES-01-grammar@1';
const SHAPES = ['dot', 'star', 'moon'];        // reused from the demo's shape set
const DOT_CAP = 12;                            // max countable dots/object-group size
const NUMERAL_CAP = 99;                         // max supported-numeral value
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
 * Hypothesis space — single-stream fitters (return predicted next or null)
 * ------------------------------------------------------------------ */
const allEqual = (s) => s.every((x) => x === s[0]);
const diffs = (s) => s.slice(1).map((x, i) => x - s[i]);

function fitConstant(s) { return s.length >= 2 && allEqual(s) ? s[s.length - 1] : null; }

function fitArithmetic(s) {
  if (s.length < 2) return null;
  const d = diffs(s);
  return d.every((x) => x === d[0]) ? s[s.length - 1] + d[0] : null;
}

function fitGeometric(s) {
  if (s.length < 2 || s.some((x) => x === 0)) return null;
  const r = s[1] / s[0];
  if (!Number.isInteger(r) || r < 2) return null;                 // integer ratio >= 2 only
  for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1] * r) return null;
  return s[s.length - 1] * r;
}

// Quadratic (constant 2nd difference). Requires >=4 points so at least TWO 2nd
// differences confirm constancy — this deliberately prevents a 3-point sequence
// (which any quadratic fits) from masquerading as a pinned rule and colliding
// with geometric/fibonacci readings.
function fitQuadratic(s) {
  if (s.length < 4) return null;
  const d1 = diffs(s), d2 = diffs(d1);
  if (!d2.every((x) => x === d2[0])) return null;
  if (d2[0] === 0) return null;                                   // pure arithmetic -> covered by fitArithmetic
  const nextD1 = d1[d1.length - 1] + d2[0];
  return s[s.length - 1] + nextD1;
}

function fitFibonacci(s) {
  if (s.length < 3) return null;
  for (let i = 2; i < s.length; i++) if (s[i] !== s[i - 1] + s[i - 2]) return null;
  return s[s.length - 1] + s[s.length - 2];
}

function fitPeriodic(s, p) {
  if (s.length < p + 1) return null;                              // need >=1 wrap to confirm
  for (let i = p; i < s.length; i++) if (s[i] !== s[i - p]) return null;
  if (p >= 2 && allEqual(s)) return null;                         // constant -> covered by fitConstant
  return s[s.length - p];
}

function fitAlternating(s) {
  if (s.length < 4) return null;
  const d = diffs(s);
  const a = d[0], b = d[1];
  if (a === b) return null;                                       // arithmetic -> covered elsewhere
  for (let i = 0; i < d.length; i++) if (d[i] !== (i % 2 === 0 ? a : b)) return null;
  const nextDiff = d.length % 2 === 0 ? a : b;
  return s[s.length - 1] + nextDiff;
}

// Base single-stream predictors used both globally and per interleaved substream.
const BASE_FITTERS = [
  ['constant', fitConstant],
  ['arithmetic', fitArithmetic],
  ['geometric', fitGeometric],
  ['quadratic', fitQuadratic],
  ['fibonacci', fitFibonacci],
];

function predictStream(stream) {
  const preds = new Map();
  for (const [id, fn] of BASE_FITTERS) {
    const v = fn(stream);
    if (v !== null && Number.isFinite(v)) preds.set(id, v);
  }
  return preds;                                                   // Map<hypId, value>
}
function uniqueStream(stream) {
  const preds = predictStream(stream);
  const vals = new Set(preds.values());
  return vals.size === 1 ? [...vals][0] : null;
}

// Interleaved fitter: split into `p` positional substreams; the next index's
// target substream must be uniquely predicted (>=3 pts) and every other
// substream must be internally consistent (confirms the interleaving is real).
function fitInterleaved(s, p) {
  const nextIdx = s.length;
  const target = nextIdx % p;
  const streams = Array.from({ length: p }, (_, r) => s.filter((_, i) => i % p === r));
  const tgt = streams[target];
  if (tgt.length < 3) return null;
  const pred = uniqueStream(tgt);
  if (pred === null) return null;
  for (let r = 0; r < p; r++) {
    if (r === target) continue;
    if (streams[r].length < 2) return null;
    if (predictStream(streams[r]).size === 0) return null;
  }
  return pred;
}

/* All hypotheses over the full visible sequence -> set of predicted next values. */
function analyze(s) {
  const preds = new Map();
  const add = (id, v) => { if (v !== null && Number.isFinite(v)) preds.set(id, v); };
  for (const [id, fn] of BASE_FITTERS) add(id, fn(s));
  add('periodic2', fitPeriodic(s, 2));
  add('periodic3', fitPeriodic(s, 3));
  add('periodic4', fitPeriodic(s, 4));
  add('alternating', fitAlternating(s));
  add('interleaved2', fitInterleaved(s, 2));
  add('interleaved3', fitInterleaved(s, 3));
  const distinct = new Set(preds.values());
  return { preds, distinct, unique: distinct.size === 1, value: distinct.size === 1 ? [...distinct][0] : null };
}

/* ------------------------------------------------------------------ *
 * Sequence generators (each returns { values[], nextValue, meta })
 * meta: { family, ruleCount, streams, stepMagnitude, ruleText }
 * ------------------------------------------------------------------ */
function genRepeat(rng, cfg) {
  const period = cfg.period;
  const pool = [];
  while (pool.length < period) { const v = rng.int(1, cfg.valMax); if (!pool.includes(v)) pool.push(v); }
  const len = cfg.len;
  const values = Array.from({ length: len }, (_, i) => pool[i % period]);
  const nextValue = pool[len % period];
  return { values, nextValue, meta: { family: 'repeat', ruleCount: 1, streams: 1, stepMagnitude: 0, ruleText: `repeat cycle of ${period}` } };
}
function genAdditive(rng, cfg) {
  const step = cfg.step;
  const len = cfg.len;
  const cap = cfg.display === 'dots' ? DOT_CAP : NUMERAL_CAP;
  const maxStart = Math.max(1, cap - step * len);
  const start = rng.int(1, Math.max(1, Math.min(maxStart, cfg.startMax ?? maxStart)));
  const values = Array.from({ length: len }, (_, i) => start + step * i);
  const nextValue = start + step * len;
  return { values, nextValue, meta: { family: 'additive', ruleCount: 1, streams: 1, stepMagnitude: step, ruleText: `+${step}` } };
}
function genMultiplicative(rng, cfg) {
  const ratio = cfg.ratio;
  const len = cfg.len;
  const maxStart = Math.floor(NUMERAL_CAP / Math.pow(ratio, len));
  const start = rng.int(1, Math.max(1, Math.min(maxStart, cfg.startMax ?? maxStart)));
  const values = Array.from({ length: len }, (_, i) => start * Math.pow(ratio, i));
  const nextValue = start * Math.pow(ratio, len);
  return { values, nextValue, meta: { family: 'multiplicative', ruleCount: 1, streams: 1, stepMagnitude: ratio, ruleText: `x${ratio}` } };
}
function genGrowingStep(rng, cfg) {
  const first = cfg.firstStep, inc = cfg.stepInc, len = cfg.len;
  const start = rng.int(1, cfg.startMax ?? 3);
  const values = [start];
  let step = first;
  for (let i = 1; i < len; i++) { values.push(values[i - 1] + step); step += inc; }
  const nextValue = values[len - 1] + step;
  return { values, nextValue, meta: { family: 'growing-step', ruleCount: 2, streams: 1, stepMagnitude: first, ruleText: `+${first} then step+${inc}` } };
}
function genAlternating(rng, cfg) {
  const a = cfg.stepA, b = cfg.stepB, len = cfg.len;
  const start = rng.int(cfg.startMin ?? 1, cfg.startMax ?? 4);
  const values = [start];
  for (let i = 1; i < len; i++) values.push(values[i - 1] + (i % 2 === 1 ? a : b));
  const nextValue = values[len - 1] + (len % 2 === 1 ? a : b);
  return { values, nextValue, meta: { family: 'alternating', ruleCount: 2, streams: 1, stepMagnitude: Math.abs(a), ruleText: `alternate +${a}/${b >= 0 ? '+' : ''}${b}` } };
}
// Interleaved: `p` positional substreams, each arithmetic (arithmetic is the
// only family a 3-point substream pins unambiguously within the hypothesis
// space, keeping the row <=7 cards). Next term belongs to substream 0.
function genInterleaved(rng, cfg) {
  const p = cfg.period, k = cfg.perStream;                        // len = p*k
  const streams = [];
  for (let r = 0; r < p; r++) {
    let step, start;
    do { step = rng.pick(cfg.stepChoices); } while (step === 0);
    start = rng.int(cfg.startMin ?? 1, cfg.startMax ?? 9);
    // keep the whole stream (incl. its next term) positive and within numeral cap
    const lastNeeded = start + step * k;
    if (lastNeeded < 1 || lastNeeded > NUMERAL_CAP) { start = rng.int(3, 9); step = Math.abs(step); }
    streams.push({ start, step, kind: 'arithmetic' });
  }
  const len = p * k;
  const values = Array.from({ length: len }, (_, i) => {
    const r = i % p, idx = Math.floor(i / p);
    return streams[r].start + streams[r].step * idx;
  });
  const nextValue = streams[0].start + streams[0].step * k;
  const meta = {
    family: cfg.useShape ? 'interleaved-attribute' : 'interleaved',
    ruleCount: cfg.useShape ? p + 1 : p, streams: p,
    stepMagnitude: Math.max(...streams.map((x) => Math.abs(x.step))),
    ruleText: `${p} interleaved streams (${streams.map((x) => `+${x.step}`).join(', ')})${cfg.useShape ? ' + shape' : ''}`,
  };
  return { values, nextValue, meta, streams };
}

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> generator config sampler
 * ------------------------------------------------------------------ */
function configFor(rng, d) {
  const dots = { display: 'dots' }, num = { display: 'numeral' };
  const table = {
    1: () => ({ ...dots, gen: genRepeat, period: 2, valMax: 4, len: 4, proximity: 'far' }),
    2: () => ({ ...dots, gen: genRepeat, period: 2, valMax: 5, len: rng.int(4, 5), proximity: 'far' }),
    3: () => ({ ...dots, gen: genRepeat, period: 3, valMax: 5, len: rng.int(5, 6), proximity: 'medium' }),
    4: () => ({ ...dots, gen: genAdditive, step: 1, len: 4, startMax: 4, proximity: 'far' }),
    // Rungs 5 and 6 count in dots, so DOT_CAP is what really bounds them: at
    // startMax 3 rung 5 had three possible sequences (+2 from 1, 2 or 3) for
    // six items. Running the start up to the cap widens both without touching
    // the step size, which is the lever the ramp actually turns here.
    5: () => ({ ...dots, gen: genAdditive, step: 2, len: rng.int(3, 5), startMax: 6, proximity: 'medium' }),
    6: () => ({ ...dots, gen: genAdditive, step: rng.pick([2, 3]), len: rng.int(3, 4), startMax: 6, proximity: 'medium' }),
    7: () => ({ ...num, gen: genAdditive, step: rng.pick([3, 4]), len: rng.int(4, 5), startMax: 6, proximity: 'medium' }),
    8: () => ({ ...num, gen: genAdditive, step: rng.pick([4, 5, 6]), len: 4, startMax: 9, proximity: 'near' }),
    9: () => ({ ...num, gen: genMultiplicative, ratio: 2, len: 4, startMax: 3, proximity: 'medium' }),
    10: () => ({ ...num, gen: genMultiplicative, ratio: rng.pick([2, 3]), len: 4, startMax: 2, proximity: 'near' }),
    11: () => ({ ...num, gen: genGrowingStep, firstStep: rng.pick([1, 2]), stepInc: 1, len: 5, startMax: 3, proximity: 'medium' }),
    12: () => ({ ...num, gen: genGrowingStep, firstStep: rng.pick([2, 3]), stepInc: rng.pick([1, 2]), len: 5, startMax: 3, proximity: 'near' }),
    13: () => ({ ...num, gen: genAlternating, stepA: rng.pick([3, 4]), stepB: rng.pick([-1, -2]), len: rng.int(5, 6), startMin: 3, startMax: 6, proximity: 'near' }),
    14: () => ({ ...num, gen: genAlternating, stepA: rng.pick([5, 6]), stepB: rng.pick([1, 2]), len: 6, startMin: 2, startMax: 5, proximity: 'near' }),
    15: () => ({ ...num, gen: genInterleaved, period: 2, perStream: 3, stepChoices: [2, 3, 4], proximity: 'near' }),
    16: () => ({ ...num, gen: genInterleaved, period: 2, perStream: 3, stepChoices: [3, 4, 5, -2], proximity: 'near' }),
    17: () => ({ ...num, gen: genInterleaved, period: 2, perStream: 3, stepChoices: [2, 3, 4], useShape: true, proximity: 'near' }),
    18: () => ({ ...num, gen: genInterleaved, period: 2, perStream: 3, stepChoices: [3, 5, -2, -3], useShape: true, proximity: 'near' }),
    19: () => ({ ...num, gen: genInterleaved, period: 2, perStream: 3, stepChoices: [4, 5, 6, -3], useShape: true, proximity: 'near' }),
    20: () => ({ ...num, gen: genInterleaved, period: 2, perStream: 3, stepChoices: [5, 6, 7, -4], useShape: true, proximity: 'near' }),
  };
  return table[d]();
}

/* ------------------------------------------------------------------ *
 * Distractor construction (named misconceptions -> lure taxonomy)
 * ------------------------------------------------------------------ */
const cap = (display) => (display === 'dots' ? DOT_CAP : NUMERAL_CAP);
const inRange = (v, display) => Number.isInteger(v) && v >= 1 && v <= cap(display);

function makeDistractors(rng, ctx) {
  const { values, nextValue, meta, display, proximity, correctShape, otherShapes } = ctx;
  const last = values[values.length - 1];
  const prev = values[values.length - 2] ?? last;
  const step = meta.stepMagnitude || 1;

  const cand = {
    repeat_last: { value: last, lure: 'rule_violation', misconception: 'repeat_last_term' },
    copy_surface: { value: values.find((v) => v !== last && v !== nextValue), lure: 'surface_match', misconception: 'copy_surface_term' },
    off_plus1: { value: nextValue + 1, lure: 'near_order', misconception: 'off_by_one' },
    off_minus1: { value: nextValue - 1, lure: 'near_order', misconception: 'off_by_one' },
    wrong_step_hi: { value: nextValue + step, lure: 'rule_violation', misconception: 'wrong_step_size' },
    wrong_step_lo: { value: nextValue - step, lure: 'rule_violation', misconception: 'wrong_step_size' },
    reversed: { value: last - step, lure: 'reversed_relation', misconception: 'reversed_step' },
    doubling: { value: last * 2, lure: 'rule_violation', misconception: 'doubling_not_adding' },
    adding: { value: last + (last - prev), lure: 'rule_violation', misconception: 'adding_not_doubling' },
    ignored_stream: { value: last + (last - prev), lure: 'rule_violation', misconception: 'ignored_stream' },
    single_rule: { value: last + step, lure: 'rule_violation', misconception: 'single_rule_only' },
    random_far: { value: nextValue + rng.pick([-6, -5, -4, 4, 5, 6]), lure: 'distractor_other', misconception: 'random_choice' },
  };
  // attribute swaps: correct quantity, wrong shape (only meaningful when shapes vary)
  const attrSwaps = (otherShapes || []).map((sh) => ({ value: nextValue, shape: sh, lure: 'surface_match', misconception: 'attribute_swap' }));

  const byFamily = {
    repeat: ['repeat_last', 'copy_surface', 'random_far', 'off_plus1', 'off_minus1'],
    additive: ['repeat_last', 'wrong_step_hi', 'doubling', 'off_plus1', 'reversed', 'random_far'],
    multiplicative: ['adding', 'wrong_step_hi', 'off_plus1', 'repeat_last', 'random_far'],
    'growing-step': ['single_rule', 'off_plus1', 'wrong_step_hi', 'repeat_last', 'off_minus1'],
    alternating: ['single_rule', 'off_plus1', 'ignored_stream', 'repeat_last', 'off_minus1'],
    interleaved: ['ignored_stream', 'off_plus1', 'wrong_step_hi', 'repeat_last', 'off_minus1'],
    'interleaved-attribute': ['ignored_stream', 'off_plus1', 'wrong_step_hi', 'off_minus1'],
  };
  const proxExtra = { far: ['random_far'], medium: ['off_plus1', 'random_far'], near: ['off_plus1', 'off_minus1', 'wrong_step_lo'] };

  const chosen = [];
  const seen = new Set([`${nextValue}|${correctShape}`]);
  const tryAdd = (o) => {
    if (!o || o.value === undefined) return;
    const shape = o.shape || correctShape;
    if (!inRange(o.value, display)) return;
    const key = `${o.value}|${shape}`;
    if (seen.has(key)) return;
    seen.add(key);
    chosen.push({ value: o.value, shape, lure: o.lure, misconception: o.misconception });
  };

  // attribute swaps first for shape items (they are the signature near-lure)
  if (ctx.useShape) attrSwaps.forEach(tryAdd);
  const order = [...(byFamily[meta.family] || []), ...(proxExtra[proximity] || [])];
  for (const name of order) { if (chosen.length >= 3) break; tryAdd(cand[name]); }

  // fallback fill to guarantee exactly 3 distinct wrong options
  let delta = 1;
  while (chosen.length < 3 && delta < 40) {
    tryAdd({ value: nextValue + delta, lure: 'near_order', misconception: 'off_by_one' });
    tryAdd({ value: nextValue - delta, lure: 'near_order', misconception: 'off_by_one' });
    delta++;
  }
  return chosen.length >= 3 ? rng.shuffle(chosen).slice(0, 3) : null;
}

/* ------------------------------------------------------------------ *
 * Assemble a single verified BankItem for a target difficulty rung
 * ------------------------------------------------------------------ */
function ageBandsFor(target) {
  if (target <= 3) return ['K-1'];
  if (target === 4) return ['K-1', '2-3'];
  if (target <= 7) return ['2-3'];
  if (target === 8) return ['2-3', '4-5'];
  if (target <= 11) return ['4-5'];
  if (target === 12) return ['4-5', '6-8'];
  return ['6-8'];
}

function buildItem(masterSeed, target, ordinal, ledger) {
  const MAX_TRIES = 600;
  const STRICT_TRIES = 300;    // budget spent insisting on a sequence the bank has not shown yet
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${target}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);
    const cfg = configFor(rng, target);
    const built = cfg.gen(rng, cfg);
    const { values, nextValue, meta } = built;

    // display-range gate
    if (!inRange(nextValue, cfg.display) || values.some((v) => !inRange(v, cfg.display))) continue;

    // UNIQUE-continuation gate (family-agnostic solver over the visible numbers)
    const verdict = analyze(values);
    if (!verdict.unique || verdict.value !== nextValue) continue;

    // shapes: coordinated attribute at the ceiling (stream identity = shape)
    const useShape = !!cfg.useShape;
    const period = cfg.period || 1;
    const shapeFor = (i) => (useShape ? SHAPES[i % period] : 'dot');
    const terms = values.map((v, i) => (useShape ? { value: v, shape: shapeFor(i) } : { value: v }));
    const nextShape = shapeFor(values.length);
    const otherShapes = useShape ? SHAPES.slice(0, period).filter((s) => s !== nextShape) : [];

    // distractors
    const distractors = makeDistractors(rng, {
      values, nextValue, meta, display: cfg.display, proximity: cfg.proximity,
      correctShape: useShape ? nextShape : 'dot', otherShapes, useShape,
    });
    if (!distractors) continue;

    // options: correct + 3 distractors, shuffled; keys assigned by final position
    const correctOpt = useShape ? { value: nextValue, shape: nextShape } : { value: nextValue };
    const optDefs = rng.shuffle([{ ...correctOpt, _correct: true }, ...distractors]);
    const options = optDefs.map((o, i) => (useShape
      ? { key: OPTION_KEYS[i], value: o.value, shape: o.shape }
      : { key: OPTION_KEYS[i], value: o.value }));
    const correctKey = OPTION_KEYS[optDefs.findIndex((o) => o._correct)];
    const distractorRationales = {};
    optDefs.forEach((o, i) => { if (!o._correct) distractorRationales[OPTION_KEYS[i]] = { lure: o.lure, misconception: o.misconception }; });

    // difficulty float: rung + small jitter (|.|<0.5 keeps the integer bin stable)
    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((target + jitter) * 100) / 100));

    const content = {
      typeCode: TYPE_CODE,
      display: cfg.display,                         // 'dots' (preliteracy) | 'numeral'
      attributes: useShape ? ['count', 'shape'] : ['count'],
      slotIndex: values.length,                     // the "?" is the next term
      terms,                                        // visible sequence (renderer-agnostic data)
      options,                                       // option set as data (no lure tags -> served safely)
      prompt: 'Choose the step that comes next.',
    };

    // Variety gate. Order-insensitive, so a rejected attempt has to change the
    // sequence rather than re-deal the same four options; and because the gate
    // cannot see option order it does not move the correct key around.
    if (!ledger.wants(content, attempt < STRICT_TRIES)) continue;
    ledger.add(content);

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
        ruleSpec: { ...meta, difficultyRung: target, aboveLevel: target >= 16 },
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
    // distractor rationales cover exactly the 3 non-correct options
    const nonCorrect = keys.filter((k) => k !== it.answer.correctKey);
    for (const k of nonCorrect) if (!it.answer.distractorRationales?.[k]) problems.push(`${it.itemId}: missing rationale for ${k}`);
    // options distinct as (value|shape)
    const sig = new Set(opts.map((o) => `${o.value}|${o.shape ?? 'dot'}`));
    if (sig.size !== opts.length) problems.push(`${it.itemId}: duplicate options`);
    // NO-LEAK solver check: recover the key from served content (terms/options) only
    const values = it.content.terms.map((t) => t.value);
    const verdict = analyze(values);
    const correctOpt = opts.find((o) => o.key === it.answer.correctKey);
    if (!verdict.unique) problems.push(`${it.itemId}: solver found non-unique continuation`);
    else if (verdict.value !== correctOpt.value) problems.push(`${it.itemId}: solver value != keyed value`);
    // shape (if present) determined by minimal period of the shape track
    if ((it.content.attributes || []).includes('shape')) {
      const shapes = it.content.terms.map((t) => t.shape);
      let per = 1; for (let p = 1; p <= shapes.length; p++) { let ok = true; for (let j = p; j < shapes.length; j++) if (shapes[j] !== shapes[j - p]) { ok = false; break; } if (ok) { per = p; break; } }
      const predShape = shapes[shapes.length - per];
      if (correctOpt.shape !== predShape) problems.push(`${it.itemId}: keyed shape != periodic shape`);
    }
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
  const masterSeed = args.seed || 'quant-series-01-v1';
  const perTarget = parseInt(args.per || '6', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-SERIES-01.jsonl');

  mkdirSync(dirname(outPath), { recursive: true });

  const items = [];
  const perTargetCount = {};
  const ledger = new VarietyLedger();      // one ledger for the whole bank: no rung may repeat another
  for (let target = 1; target <= 20; target++) {
    let made = 0;
    for (let ordinal = 0; ordinal < perTarget; ordinal++) {
      const it = buildItem(masterSeed, target, ordinal, ledger);
      if (it) { items.push(it); made++; }
    }
    perTargetCount[target] = made;
  }

  const jsonl = serializeBank(items);
  writeFileSync(outPath, jsonl, 'utf8');

  const v = verifyBank(outPath);

  // ---- report ----
  console.log(`\nQUANT-SERIES-01 bank written: ${outPath}`);
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
