#!/usr/bin/env node
/**
 * QUANT-FUNC-01 — "Machine Rule" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2 and
 * docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md). Every item is born-synthetic
 * (syntheticOnly:true, validated:false); difficulty is a design rung (FLOAT
 * 1..20), NOT a calibrated IRT parameter.
 *
 * A "machine" turns each input number into an output by a hidden rule. The child
 * sees 2-3 worked input->output examples, infers the rule, and chooses the output
 * the machine would make for a new input. Difficulty rises along the type's
 * declared levers: rule family (add/subtract -> multiply -> affine a*x+b ->
 * divide x/k+b), coefficient magnitude, number of worked examples needed,
 * value magnitude, representation (dots/object-groups at the preliteracy floor ->
 * supported numerals higher up), and distractor proximity.
 *
 * Every emitted item is verified to have a UNIQUE output. A family-agnostic solver
 * enumerates a hypothesis space over the visible example pairs:
 *   - affine : f(x) = a*x + b        (a in 1..4, integer b)
 *   - divide : f(x) = x/k + b        (k in 2..3, integer b, exact division)
 * The item is accepted only when every rule consistent with all example pairs
 * predicts exactly one output for the new input, and that value equals the
 * intended key. The same solver recovers the key from the served content alone
 * (no key leak), so it doubles as the deterministic validator.
 *
 * Usage:  node QUANT-FUNC-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-func-01-v1", 6 items per difficulty rung (1..20) -> ~120.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-FUNC-01';
const DOMAIN = 'quantitative';
const GENERATOR_REF = 'QUANT-FUNC-01-grammar@1';
const DOT_CAP = 12;                              // max countable dots/object-group size
const NUMERAL_CAP = 99;                          // max supported-numeral value
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

/* ------------------------------------------------------------------ *
 * Seeded PRNG (deterministic, reproducible per provenance.seed)
 * ------------------------------------------------------------------ */
function xfnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
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
  int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); }
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
 * Hypothesis space — machine-rule fitters over the visible example pairs.
 * Returns a Map<ruleId, predictedOutput> of every rule consistent with all
 * pairs; the item is unique iff those predictions collapse to one value.
 * ------------------------------------------------------------------ */
function analyzeMachine(pairs, input) {
  const preds = new Map();
  // affine f(x)=a*x+b
  for (let a = 1; a <= 4; a++) for (let b = -9; b <= 9; b++) {
    if (pairs.every(([x, y]) => a * x + b === y)) preds.set(`affine_a${a}_b${b}`, a * input + b);
  }
  // divide f(x)=x/k+b (exact division only)
  for (const k of [2, 3]) for (let b = -9; b <= 9; b++) {
    if (input % k === 0 && pairs.every(([x, y]) => x % k === 0 && x / k + b === y)) preds.set(`div_k${k}_b${b}`, input / k + b);
  }
  const distinct = new Set(preds.values());
  return { preds, distinct, unique: distinct.size === 1, value: distinct.size === 1 ? [...distinct][0] : null };
}

/* ------------------------------------------------------------------ *
 * Machine generators (each returns { pairs, input, output, meta })
 * meta: { family, a, b, k, ruleText }
 * ------------------------------------------------------------------ */
const capFor = (display) => (display === 'dots' ? DOT_CAP : NUMERAL_CAP);
const inRange = (v, display) => Number.isInteger(v) && v >= 1 && v <= capFor(display);

function pickDistinct(rng, count, lo, hi, mult) {
  const pool = [];
  for (let v = lo; v <= hi; v++) if (!mult || v % mult === 0) pool.push(v);
  if (pool.length < count + 1) return null;                     // need pairs + a distinct challenge
  const sh = rng.shuffle(pool);
  return sh.slice(0, count + 1);                                // last one is the challenge input
}

function genMachine(rng, cfg) {
  const display = cfg.display;
  const cap = capFor(display);
  const nPairs = cfg.pairs;
  const mult = cfg.family === 'divide' ? cfg.k : 1;
  const draw = pickDistinct(rng, nPairs, cfg.xMin ?? 1, cfg.xMax ?? 9, mult);
  if (!draw) return null;
  const xs = draw.slice(0, nPairs);
  const input = draw[nPairs];

  const f = cfg.family === 'divide'
    ? (x) => x / cfg.k + cfg.b
    : (x) => cfg.a * x + cfg.b;

  const pairs = xs.map((x) => [x, f(x)]);
  const output = f(input);

  // every displayed number (inputs, outputs, challenge) must be in range
  const nums = [...xs, ...pairs.map((p) => p[1]), input, output];
  if (nums.some((n) => !inRange(n, display))) return null;

  const ruleText = cfg.family === 'divide'
    ? `divide by ${cfg.k}${cfg.b ? (cfg.b > 0 ? ` then add ${cfg.b}` : ` then take away ${-cfg.b}`) : ''}`
    : `${cfg.a === 1 ? '' : `times ${cfg.a}`}${cfg.a !== 1 && cfg.b ? ' then ' : ''}${cfg.b > 0 ? `add ${cfg.b}` : cfg.b < 0 ? `take away ${-cfg.b}` : (cfg.a === 1 ? 'no change' : '')}`.trim();

  return {
    pairs, input, output,
    meta: { family: cfg.family, a: cfg.a, b: cfg.b, k: cfg.k, ruleText: ruleText || `times ${cfg.a}` },
  };
}

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> generator config sampler
 * Low rungs = dots/object-groups (preliteracy); higher = supported numerals.
 * ------------------------------------------------------------------ */
function configFor(rng, d) {
  const dots = { display: 'dots' }, num = { display: 'numeral' };
  const table = {
    1: () => ({ ...dots, family: 'affine', a: 1, b: 1, pairs: 2, xMin: 1, xMax: 6, proximity: 'far' }),
    2: () => ({ ...dots, family: 'affine', a: 1, b: rng.pick([1, 2]), pairs: 2, xMin: 1, xMax: 7, proximity: 'far' }),
    3: () => ({ ...dots, family: 'affine', a: 1, b: rng.pick([2, 3]), pairs: 2, xMin: 1, xMax: 7, proximity: 'medium' }),
    4: () => ({ ...dots, family: 'affine', a: 1, b: rng.pick([-1, -2]), pairs: 2, xMin: 3, xMax: 10, proximity: 'medium' }),
    5: () => ({ ...dots, family: 'affine', a: 2, b: 0, pairs: 2, xMin: 1, xMax: 5, proximity: 'medium' }),
    6: () => ({ ...num, family: 'affine', a: rng.pick([1, 2]), b: rng.pick([2, 3, 4]), pairs: 2, xMin: 1, xMax: 9, proximity: 'medium' }),
    7: () => ({ ...num, family: 'affine', a: 2, b: rng.pick([0, 1]), pairs: 3, xMin: 1, xMax: 9, proximity: 'medium' }),
    8: () => ({ ...num, family: 'affine', a: rng.pick([2, 3]), b: rng.pick([0, 1, 2]), pairs: 3, xMin: 1, xMax: 9, proximity: 'near' }),
    9: () => ({ ...num, family: 'affine', a: 3, b: 0, pairs: 3, xMin: 1, xMax: 9, proximity: 'medium' }),
    10: () => ({ ...num, family: 'affine', a: 2, b: rng.pick([1, 2, 3]), pairs: 3, xMin: 1, xMax: 11, proximity: 'near' }),
    11: () => ({ ...num, family: 'affine', a: 3, b: rng.pick([1, 2]), pairs: 3, xMin: 1, xMax: 9, proximity: 'near' }),
    12: () => ({ ...num, family: 'affine', a: 3, b: rng.pick([-1, -2]), pairs: 3, xMin: 2, xMax: 10, proximity: 'near' }),
    13: () => ({ ...num, family: 'divide', k: 2, b: rng.pick([0, 1, 2]), pairs: 3, xMin: 2, xMax: 18, proximity: 'near' }),
    14: () => ({ ...num, family: 'divide', k: 2, b: rng.pick([1, 2, 3]), pairs: 3, xMin: 2, xMax: 20, proximity: 'near' }),
    15: () => ({ ...num, family: 'divide', k: 3, b: rng.pick([0, 1, 2]), pairs: 3, xMin: 3, xMax: 27, proximity: 'near' }),
    16: () => ({ ...num, family: 'affine', a: rng.pick([3, 4]), b: rng.pick([2, 3]), pairs: 3, xMin: 1, xMax: 12, proximity: 'near' }),
    17: () => ({ ...num, family: 'affine', a: 4, b: rng.pick([1, 2]), pairs: 3, xMin: 1, xMax: 12, proximity: 'near' }),
    18: () => ({ ...num, family: 'affine', a: 4, b: rng.pick([-1, -2, -3]), pairs: 3, xMin: 2, xMax: 14, proximity: 'near' }),
    19: () => ({ ...num, family: 'affine', a: rng.pick([3, 4]), b: rng.pick([-3, -4, 3, 4]), pairs: 3, xMin: 2, xMax: 16, proximity: 'near' }),
    20: () => ({ ...num, family: 'affine', a: 4, b: rng.pick([-3, 3, 5]), pairs: 3, xMin: 2, xMax: 18, proximity: 'near' }),
  };
  return table[d]();
}

/* ------------------------------------------------------------------ *
 * Distractor construction (named misconceptions -> lure taxonomy)
 * ------------------------------------------------------------------ */
function makeDistractors(rng, ctx) {
  const { pairs, input, output, meta, display, proximity } = ctx;
  const { family, a, b, k } = meta;
  const lastOut = pairs[pairs.length - 1][1];

  const cand = {
    copy_input: { value: input, lure: 'surface_match', misconception: 'copied_input' },
    last_output: { value: lastOut, lure: 'surface_match', misconception: 'copied_example_output' },
    off_plus1: { value: output + 1, lure: 'near_order', misconception: 'off_by_one' },
    off_minus1: { value: output - 1, lure: 'near_order', misconception: 'off_by_one' },
    random_far: { value: output + rng.pick([-6, -5, -4, 4, 5, 6]), lure: 'distractor_other', misconception: 'random_choice' },
  };
  if (family === 'affine') {
    if (b !== 0) cand.scale_only = { value: a * input, lure: 'rule_violation', misconception: 'applied_scale_ignored_shift' };
    if (a !== 1) cand.shift_only = { value: input + b, lure: 'rule_violation', misconception: 'applied_shift_ignored_scale' };
    if (a >= 2 && b === 0) cand.confused_op = { value: input + a, lure: 'rule_violation', misconception: 'added_instead_of_multiplied' };
    if (b !== 0) cand.reversed = { value: a * input - b, lure: 'reversed_relation', misconception: 'reversed_shift_sign' };
  } else { // divide
    cand.scale_only = { value: input / k, lure: 'rule_violation', misconception: 'divided_ignored_shift' };
    if (b !== 0) cand.reversed = { value: input / k - b, lure: 'reversed_relation', misconception: 'reversed_shift_sign' };
    cand.confused_op = { value: input * k + b, lure: 'rule_violation', misconception: 'multiplied_instead_of_divided' };
  }

  const byFamily = {
    affine: ['scale_only', 'shift_only', 'confused_op', 'reversed', 'copy_input', 'last_output', 'off_plus1', 'off_minus1', 'random_far'],
    divide: ['scale_only', 'confused_op', 'reversed', 'copy_input', 'last_output', 'off_plus1', 'off_minus1', 'random_far'],
  };
  const proxExtra = { far: ['random_far'], medium: ['off_plus1', 'random_far'], near: ['off_plus1', 'off_minus1'] };

  const chosen = [];
  const seen = new Set([String(output)]);
  const tryAdd = (o) => {
    if (!o || o.value === undefined || o.value === null) return;
    if (!inRange(o.value, display)) return;
    const key = String(o.value);
    if (seen.has(key)) return;
    seen.add(key);
    chosen.push({ value: o.value, lure: o.lure, misconception: o.misconception });
  };

  const order = [...(byFamily[family] || []), ...(proxExtra[proximity] || [])];
  for (const name of order) { if (chosen.length >= 3) break; tryAdd(cand[name]); }

  let delta = 1;
  while (chosen.length < 3 && delta < 40) {
    tryAdd({ value: output + delta, lure: 'near_order', misconception: 'off_by_one' });
    tryAdd({ value: output - delta, lure: 'near_order', misconception: 'off_by_one' });
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

function buildItem(masterSeed, target, ordinal) {
  const MAX_TRIES = 800;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${target}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);
    const cfg = configFor(rng, target);
    const built = genMachine(rng, cfg);
    if (!built) continue;
    const { pairs, input, output, meta } = built;

    // challenge input must be new (inference, not lookup)
    if (pairs.some(([x]) => x === input)) continue;

    // UNIQUE-output gate (family-agnostic solver over the visible pairs)
    const verdict = analyzeMachine(pairs, input);
    if (!verdict.unique || verdict.value !== output) continue;

    const distractors = makeDistractors(rng, { pairs, input, output, meta, display: cfg.display, proximity: cfg.proximity });
    if (!distractors) continue;

    const optDefs = rng.shuffle([{ value: output, _correct: true }, ...distractors]);
    const options = optDefs.map((o, i) => ({ key: OPTION_KEYS[i], value: o.value }));
    const correctKey = OPTION_KEYS[optDefs.findIndex((o) => o._correct)];
    const distractorRationales = {};
    optDefs.forEach((o, i) => { if (!o._correct) distractorRationales[OPTION_KEYS[i]] = { lure: o.lure, misconception: o.misconception }; });

    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((target + jitter) * 100) / 100));

    const content = {
      typeCode: TYPE_CODE,
      display: cfg.display,                         // 'dots' (preliteracy) | 'numeral'
      attributes: ['count'],
      pairs,                                         // worked input->output examples (renderer-agnostic)
      input,                                         // the new input to transform
      options,
      prompt: 'Choose the amount the machine makes for the new input.',
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
        ruleSpec: { family: meta.family, a: meta.a, b: meta.b, k: meta.k, ruleText: meta.ruleText, examples: pairs.length, difficultyRung: target, aboveLevel: target >= 16 },
        validator: [
          { check: 'unique_answer', status: 'pass', detail: `rules={${[...verdict.preds.keys()].join(',')}} -> ${verdict.value}` },
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
 * Post-write verification: parse + coverage (>=5 per ±1pt band)
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
    const pairs = it.content?.pairs || [];
    if (pairs.length < 2) problems.push(`${it.itemId}: need >=2 example pairs`);
    if (pairs.some(([x]) => x === it.content.input)) problems.push(`${it.itemId}: challenge input reuses an example (lookup, not inference)`);
    // NO-LEAK solver check: recover the output from served pairs + input only
    const verdict = analyzeMachine(pairs, it.content.input);
    const correctOpt = opts.find((o) => o.key === it.answer.correctKey);
    if (!verdict.unique) problems.push(`${it.itemId}: solver found non-unique output`);
    else if (verdict.value !== correctOpt.value) problems.push(`${it.itemId}: solver value != keyed value`);
  });

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
  const masterSeed = args.seed || 'quant-func-01-v1';
  const perTarget = parseInt(args.per || '6', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-FUNC-01.jsonl');

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

  const jsonl = items.map((it) => JSON.stringify(it)).join('\n') + '\n';
  writeFileSync(outPath, jsonl, 'utf8');

  const v = verifyBank(outPath);

  console.log(`\nQUANT-FUNC-01 bank written: ${outPath}`);
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
