#!/usr/bin/env node
/**
 * QUANT-BALANCE-01 — "Balance Lab" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2 and
 * docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md). Every item is born-synthetic
 * (syntheticOnly:true, validated:false); difficulty is a design rung (FLOAT
 * 1..20), NOT a calibrated IRT parameter.
 *
 * Shapes carry hidden integer weights. A few example scales reveal equivalences
 * (e.g. one cube balances two orbs). The left pan holds a target load; the child
 * chooses which of four candidate right-pan loads has the SAME total weight
 * (balances). Difficulty rises along the type's declared levers: number of shape
 * types / equivalence relations, length of the substitution chain, target/load
 * size, whether the balancing load requires substitution (not a copy), and
 * distractor proximity (matched-count-not-weight and off-by-one-weight lures).
 *
 * Every emitted item is verified to have a UNIQUE balancing option. A solver
 * recovers the shape weights from the served example scales alone by Gaussian
 * elimination (anchoring the base shape = 1). It rejects any item whose examples
 * do not FULLY determine every shape weight, then confirms that exactly one
 * served option matches the target weight, and that it equals the intended key.
 * Because the solver reads only served content (examples/target/options, never
 * the key), it doubles as the deterministic, no-leak validator.
 *
 * Usage:  node QUANT-BALANCE-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-balance-01-v1", 6 items per difficulty rung (1..20) -> ~120.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-BALANCE-01';
const DOMAIN = 'quantitative';
const GENERATOR_REF = 'QUANT-BALANCE-01-grammar@1';
const SHAPE_NAMES = ['orb', 'cube', 'diamond', 'triangle'];   // base -> heavier; base weight anchored to 1
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
 * Weight solver — Gaussian elimination over the equivalence equations.
 * equations: [{coef:number[nVars], rhs:number}]; returns integer weight map
 * or null if the system is inconsistent, under-determined, or non-integer/
 * non-positive. Used both to design and (independently) to validate items.
 * ------------------------------------------------------------------ */
function solveWeights(vars, equations) {
  const n = vars.length;
  const m = equations.map((e) => [...e.coef, e.rhs]);
  const pivotRowForCol = Array(n).fill(-1);
  let r = 0;
  for (let col = 0; col < n; col++) {
    let piv = -1;
    for (let rr = r; rr < m.length; rr++) if (Math.abs(m[rr][col]) > 1e-9) { piv = rr; break; }
    if (piv < 0) continue;
    [m[r], m[piv]] = [m[piv], m[r]];
    const pv = m[r][col];
    for (let c = 0; c <= n; c++) m[r][c] /= pv;
    for (let rr = 0; rr < m.length; rr++) {
      if (rr !== r && Math.abs(m[rr][col]) > 1e-12) {
        const f = m[rr][col];
        for (let c = 0; c <= n; c++) m[rr][c] -= f * m[r][c];
      }
    }
    pivotRowForCol[col] = r; r++;
  }
  for (let rr = 0; rr < m.length; rr++) {                 // consistency: no 0 = nonzero
    let z = true; for (let c = 0; c < n; c++) if (Math.abs(m[rr][c]) > 1e-9) { z = false; break; }
    if (z && Math.abs(m[rr][n]) > 1e-9) return null;
  }
  for (let col = 0; col < n; col++) if (pivotRowForCol[col] < 0) return null;   // under-determined
  const w = {};
  for (let col = 0; col < n; col++) {
    const val = m[pivotRowForCol[col]][n];
    const rv = Math.round(val);
    if (Math.abs(val - rv) > 1e-6 || rv <= 0) return null;
    w[vars[col]] = rv;
  }
  return w;
}

/* Recover weights from served examples + confirm a unique balancing option. */
function analyzeBalance(content) {
  const vars = content.shapes.slice();
  const idx = new Map(vars.map((s, i) => [s, i]));
  const equations = [];
  for (const ex of content.examples || []) {
    const coef = Array(vars.length).fill(0);
    for (const s of ex.left) coef[idx.get(s)] += 1;
    for (const s of ex.right) coef[idx.get(s)] -= 1;
    equations.push({ coef, rhs: 0 });
  }
  const base = vars[0];                                   // anchor base shape to weight 1 (fixes scale)
  const acoef = Array(vars.length).fill(0); acoef[idx.get(base)] = 1;
  equations.push({ coef: acoef, rhs: 1 });
  const w = solveWeights(vars, equations);
  if (!w) return { unique: false };
  const wt = (load) => load.reduce((s, shp) => s + (w[shp] ?? NaN), 0);
  const targetWeight = wt(content.target);
  if (!Number.isFinite(targetWeight)) return { unique: false };
  const balancing = (content.options || []).filter((o) => wt(o.load) === targetWeight);
  return {
    weights: w, targetWeight,
    unique: balancing.length === 1,
    correctKey: balancing.length === 1 ? balancing[0].key : null,
  };
}

/* ------------------------------------------------------------------ *
 * Item generator (returns { content-pieces, weights, meta } or null)
 * ------------------------------------------------------------------ */
const loadWeight = (load, w) => load.reduce((s, x) => s + w[x], 0);
const loadSig = (load) => load.slice().sort().join('+');

function genBalance(rng, cfg) {
  const shapes = SHAPE_NAMES.slice(0, cfg.shapeCount);

  // ---- assign weights: base=1; each heavier shape = a lighter shape + orbs ----
  const w = { orb: 1 };
  if (shapes.includes('cube')) w.cube = rng.pick([2, 3]);
  if (shapes.includes('diamond')) w.diamond = w.cube + rng.pick([1, 2]);
  if (shapes.includes('triangle')) w.triangle = w.diamond + rng.pick([1, 2]);

  // ---- example scales that reveal every non-base weight (triangular -> determined) ----
  const examples = [];
  if (shapes.includes('cube')) examples.push({ left: ['cube'], right: Array(w.cube).fill('orb') });
  if (shapes.includes('diamond')) examples.push({ left: ['diamond'], right: ['cube', ...Array(w.diamond - w.cube).fill('orb')] });
  if (shapes.includes('triangle')) examples.push({ left: ['triangle'], right: ['diamond', ...Array(w.triangle - w.diamond).fill('orb')] });

  // ---- target load on the left pan ----
  const tSize = rng.int(cfg.targetMin, cfg.targetMax);
  const target = Array.from({ length: tSize }, () => rng.pick(shapes));
  const T = loadWeight(target, w);
  const targetSig = loadSig(target);
  if (T < 2) return null;

  // ---- candidate-load pool (deduped by multiset signature) ----
  const pool = new Map();
  for (let i = 0; i < 320; i++) {
    const n = rng.int(1, cfg.maxPieces);
    const load = Array.from({ length: n }, () => rng.pick(shapes));
    const sig = loadSig(load);
    if (!pool.has(sig)) pool.set(sig, { load, sig, weight: loadWeight(load, w), pieces: n });
  }
  const all = [...pool.values()];

  // ---- correct load: same weight as target; a substitution (different composition) when required ----
  let correctPool = all.filter((p) => p.weight === T && (cfg.substitute ? p.sig !== targetSig : true));
  if (!correctPool.length) correctPool = all.filter((p) => p.weight === T);
  if (!correctPool.length) correctPool = [{ load: target.slice(), sig: targetSig, weight: T, pieces: target.length }];
  correctPool.sort((a, b) => a.pieces - b.pieces || a.sig.localeCompare(b.sig));
  const correct = correctPool[0];

  // ---- distractors: never weight T; each keyed to a named misconception ----
  const used = new Set([correct.sig]);
  const distract = [];
  const take = (pred, lure, misconception) => {
    if (distract.length >= 3) return;
    const cands = all.filter((p) => !used.has(p.sig) && p.weight !== T && pred(p))
      .sort((a, b) => a.pieces - b.pieces || a.sig.localeCompare(b.sig));
    if (cands.length) { const c = cands[0]; used.add(c.sig); distract.push({ ...c, lure, misconception }); }
  };
  if (shapes.length >= 2) take((p) => p.pieces === correct.pieces, 'surface_match', 'matched_count_not_weight');
  take((p) => p.weight === T - 1 || p.weight === T + 1, 'near_order', 'off_by_one_weight');
  take((p) => Math.abs(p.weight - T) >= 2, 'rule_violation', 'ignored_a_relation');
  take(() => true, 'distractor_other', 'other_load');
  take(() => true, 'distractor_other', 'other_load');
  if (distract.length < 3) return null;

  const relations = shapes.length - 1;
  return {
    shapes, examples, target, weights: w,
    correct, distract,
    meta: {
      family: cfg.substitute ? 'substitution' : 'direct-match',
      shapeCount: shapes.length, relations,
      substitution: !!cfg.substitute,
      ruleText: `${shapes.length} shape type(s), ${relations} equivalence relation(s), target weight ${T}`,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> generator config sampler
 * Low rungs = a single unit shape (pure count/object-groups); higher rungs add
 * shape types, substitution chains, larger loads, and near-weight lures.
 * ------------------------------------------------------------------ */
function configFor(rng, d) {
  const table = {
    1: () => ({ shapeCount: 1, targetMin: 2, targetMax: 2, maxPieces: 4, substitute: false, proximity: 'far' }),
    2: () => ({ shapeCount: 1, targetMin: 3, targetMax: 4, maxPieces: 5, substitute: false, proximity: 'far' }),
    3: () => ({ shapeCount: 1, targetMin: 4, targetMax: 5, maxPieces: 6, substitute: false, proximity: 'medium' }),
    4: () => ({ shapeCount: 2, targetMin: 2, targetMax: 3, maxPieces: 4, substitute: false, proximity: 'medium' }),
    5: () => ({ shapeCount: 2, targetMin: 2, targetMax: 3, maxPieces: 4, substitute: true, proximity: 'medium' }),
    6: () => ({ shapeCount: 2, targetMin: 2, targetMax: 3, maxPieces: 5, substitute: true, proximity: 'near' }),
    7: () => ({ shapeCount: 2, targetMin: 3, targetMax: 4, maxPieces: 5, substitute: true, proximity: 'near' }),
    8: () => ({ shapeCount: 2, targetMin: 3, targetMax: 4, maxPieces: 5, substitute: true, proximity: 'near' }),
    9: () => ({ shapeCount: 3, targetMin: 2, targetMax: 3, maxPieces: 5, substitute: true, proximity: 'medium' }),
    10: () => ({ shapeCount: 3, targetMin: 2, targetMax: 4, maxPieces: 5, substitute: true, proximity: 'near' }),
    11: () => ({ shapeCount: 3, targetMin: 3, targetMax: 4, maxPieces: 5, substitute: true, proximity: 'near' }),
    12: () => ({ shapeCount: 3, targetMin: 3, targetMax: 4, maxPieces: 6, substitute: true, proximity: 'near' }),
    13: () => ({ shapeCount: 3, targetMin: 3, targetMax: 5, maxPieces: 6, substitute: true, proximity: 'near' }),
    14: () => ({ shapeCount: 4, targetMin: 2, targetMax: 3, maxPieces: 5, substitute: true, proximity: 'near' }),
    15: () => ({ shapeCount: 4, targetMin: 3, targetMax: 4, maxPieces: 6, substitute: true, proximity: 'near' }),
    16: () => ({ shapeCount: 4, targetMin: 3, targetMax: 4, maxPieces: 6, substitute: true, proximity: 'near' }),
    17: () => ({ shapeCount: 4, targetMin: 3, targetMax: 5, maxPieces: 6, substitute: true, proximity: 'near' }),
    18: () => ({ shapeCount: 4, targetMin: 4, targetMax: 5, maxPieces: 7, substitute: true, proximity: 'near' }),
    19: () => ({ shapeCount: 4, targetMin: 4, targetMax: 6, maxPieces: 7, substitute: true, proximity: 'near' }),
    20: () => ({ shapeCount: 4, targetMin: 4, targetMax: 6, maxPieces: 7, substitute: true, proximity: 'near' }),
  };
  return table[d]();
}

/* ------------------------------------------------------------------ */
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
  const MAX_TRIES = 900;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${target}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);
    const cfg = configFor(rng, target);
    const built = genBalance(rng, cfg);
    if (!built) continue;
    const { shapes, examples, target: leftLoad, weights, correct, distract, meta } = built;

    // options: correct + 3 distractors, shuffled; keys by final position
    const optDefs = rng.shuffle([{ load: correct.load, _correct: true }, ...distract.map((d) => ({ load: d.load, lure: d.lure, misconception: d.misconception }))]);
    const options = optDefs.map((o, i) => ({ key: OPTION_KEYS[i], load: o.load }));
    const correctKey = OPTION_KEYS[optDefs.findIndex((o) => o._correct)];
    const distractorRationales = {};
    optDefs.forEach((o, i) => { if (!o._correct) distractorRationales[OPTION_KEYS[i]] = { lure: o.lure, misconception: o.misconception }; });

    const content = {
      typeCode: TYPE_CODE,
      display: 'shapes',
      attributes: ['weight'],
      shapes,
      examples,                                     // equivalence scales (reveal weights; renderer-agnostic)
      target: leftLoad,                             // left pan load to match
      options,                                       // 4 candidate right-pan loads (weights NOT served)
      prompt: 'Choose the group of shapes that balances the left pan.',
    };

    // UNIQUE-balance gate (independent solver over served content; no key access)
    const verdict = analyzeBalance(content);
    if (!verdict.unique || verdict.correctKey !== correctKey) continue;

    // options distinct as multisets
    const sigs = new Set(options.map((o) => loadSig(o.load)));
    if (sigs.size !== options.length) continue;

    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((target + jitter) * 100) / 100));

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
        ruleSpec: { ...meta, weights, targetWeight: verdict.targetWeight, difficultyRung: target, aboveLevel: target >= 16 },
        validator: [
          { check: 'unique_answer', status: 'pass', detail: `determined weights ${JSON.stringify(weights)}; target=${verdict.targetWeight}; one balancing option (${correctKey})` },
          { check: 'key_matches_solver', status: 'pass' },
          { check: 'weights_fully_determined', status: 'pass', detail: `${examples.length} example scale(s) pin ${shapes.length} shape weight(s)` },
          { check: 'lure_taxonomy_ok', status: 'pass' },
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
 * + re-derive weights and the balancing key from served content (no leak)
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
    const sigs = new Set(opts.map((o) => loadSig(o.load || [])));
    if (sigs.size !== opts.length) problems.push(`${it.itemId}: duplicate option loads`);
    if (!Array.isArray(it.content.target) || !it.content.target.length) problems.push(`${it.itemId}: empty target load`);
    if (opts.some((o) => !Array.isArray(o.load) || !o.load.length)) problems.push(`${it.itemId}: empty option load`);
    // NO-LEAK solver: recover weights + balancing option from served content only
    const verdict = analyzeBalance(it.content);
    if (!verdict.unique) problems.push(`${it.itemId}: solver found non-unique / under-determined balance`);
    else if (verdict.correctKey !== it.answer.correctKey) problems.push(`${it.itemId}: solver key != keyed answer`);
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
  const masterSeed = args.seed || 'quant-balance-01-v1';
  const perTarget = parseInt(args.per || '6', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-BALANCE-01.jsonl');

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

  console.log(`\nQUANT-BALANCE-01 bank written: ${outPath}`);
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
  console.log('\nOK: JSONL parses, coverage >=5 per ±1pt band, and the solver re-derives weights + every balancing key from served content (no leak).');
}

main();
