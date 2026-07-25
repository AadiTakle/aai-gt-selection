#!/usr/bin/env node
/**
 * QUANT-NUMLINE-01 — "Number Line Jump" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2 and
 * docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md). Every item is born-synthetic
 * (syntheticOnly:true, validated:false); difficulty is a design rung (FLOAT
 * 1..20), NOT a calibrated IRT parameter.
 *
 * PLACEMENT TASK (not multiple-choice). The child slides a jumper to the spot
 * on a bounded line where a shown target quantity belongs. The response is a
 * CONTINUOUS position (a ratio in [0,1]); there are no answer cards. The
 * deterministic scorer is:
 *
 *     targetRatio = (target.value - line.min) / (line.max - line.min)
 *     pae         = |placedRatio - targetRatio|          // M-PAE (fraction of range)
 *     correct     = pae <= answer.tolerance              // 0/1, server-authoritative
 *
 * This is fully reproducible from the stored trace (placedRatio + the item's
 * line/target/tolerance), so scoring.mode is 'deterministic_key': the "key" is
 * the target position and the tolerance band. `answer.tolerance` and the
 * derived `answer.targetRatio` live SERVER-ONLY (stripped from ServedItem), so
 * the renderer never receives the pass band and can never show correctness.
 *
 * Difficulty rises along the type's declared levers (types_quantitative.jsonl):
 *   line range and target magnitude, tick density / labeled anchors, distance
 *   from anchors and the midpoint, representation (dots/object-groups at the
 *   preliteracy floor -> grouped tens -> visual fractions -> supported numerals
 *   with a magnitude bar), and required placement tolerance.
 *
 * UNIQUE-answer verification for a placement item: the correct region is a
 * single contiguous interval [targetRatio ± tolerance] that (a) lies wholly
 * inside [0,1], (b) never touches an endpoint value, and (c) above the counting
 * floor is held OFF every drawn tick/anchor by a margin, so the item cannot be
 * solved by snapping to a visible mark — it forces genuine magnitude estimation.
 * An independent solver (`derivePlacement`) recovers targetRatio from the served
 * content alone (line + target), so the key never leaks and the check script can
 * re-derive it.
 *
 * Usage:  node QUANT-NUMLINE-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-numline-01-v1", 6 items per difficulty rung (1..20) -> ~120.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-NUMLINE-01';
const DOMAIN = 'quantitative';
const GENERATOR_REF = 'QUANT-NUMLINE-01-grammar@1';

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
  uuid() {
    const b = Array.from({ length: 16 }, () => this.int(0, 255));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map((x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
}

/* ------------------------------------------------------------------ *
 * Pure helpers (shared with the check script)
 * ------------------------------------------------------------------ */
const round4 = (x) => Math.round(x * 1e4) / 1e4;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

// Independent solver: recover the correct placement ratio from SERVED content
// alone (line bounds + target). This is the schema-spec `unique_answer` /
// `key_matches_solver` re-derivation for a placement item — it trusts nothing
// in `answer`.
export function derivePlacement(content) {
  const { line, target } = content;
  const value = target.den ? target.num / target.den : target.value;
  const ratio = (value - line.min) / (line.max - line.min);
  return { value, ratio: round4(ratio) };
}

// Tick/anchor ratios that are actually DRAWN for the child (served content).
export function drawnMarkRatios(content) {
  const set = new Set();
  for (const t of content.ticks || []) set.add(round4(t));
  for (const a of content.anchors || []) set.add(round4(a.ratio));
  return [...set];
}

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> line/representation/tolerance config
 * Low rungs = countable dots on short fully-ticked lines (preliteracy floor);
 * mid = grouped tens with fading ticks; high = visual fractions and supported
 * numerals with a magnitude bar on wide, sparsely-anchored lines.
 * ------------------------------------------------------------------ */
const RUNGS = {
  1:  { min: 0, max: 10,   display: 'dots',     tickEvery: 1,  tol: 0.13, offAnchor: false },
  2:  { min: 0, max: 10,   display: 'dots',     tickEvery: 1,  tol: 0.12, offAnchor: false },
  3:  { min: 0, max: 10,   display: 'dots',     tickEvery: 2,  tol: 0.11, offAnchor: false },
  4:  { min: 0, max: 20,   display: 'groups',   tickEvery: 5,  tol: 0.11, offAnchor: false },
  5:  { min: 0, max: 20,   display: 'groups',   tickEvery: 10, tol: 0.10, offAnchor: false },
  6:  { min: 0, max: 30,   display: 'groups',   tickEvery: 10, tol: 0.10, offAnchor: true  },
  7:  { min: 0, max: 50,   display: 'groups',   tickEvery: 10, tol: 0.09, offAnchor: false },
  8:  { min: 0, max: 50,   display: 'groups',   tickAt: [0, 25, 50], tol: 0.09, offAnchor: true },
  9:  { min: 0, max: 100,  display: 'groups',   tickEvery: 25, tol: 0.085, offAnchor: true },
  10: { min: 0, max: 100,  display: 'groups',   tickAt: [0, 50, 100], tol: 0.08, offAnchor: true },
  11: { min: 0, max: 1,    display: 'fraction', dens: [2, 4], tol: 0.08, offAnchor: false },
  12: { min: 0, max: 1,    display: 'fraction', dens: [4],    tickAt: [0, 0.5, 1], tol: 0.075, offAnchor: true },
  13: { min: 0, max: 1,    display: 'fraction', dens: [3, 5], tickAt: [0, 1], tol: 0.07, offAnchor: false },
  14: { min: 0, max: 100,  display: 'numeral',  tickAt: [0, 50, 100], tol: 0.065, offAnchor: true },
  15: { min: 0, max: 100,  display: 'numeral',  tickAt: [0, 100], tol: 0.06, offAnchor: false },
  16: { min: 0, max: 1000, display: 'numeral',  tickAt: [0, 500, 1000], tol: 0.055, offAnchor: true },
  17: { min: 0, max: 1000, display: 'numeral',  tickAt: [0, 1000], tol: 0.05, offAnchor: false },
  18: { min: 0, max: 1,    display: 'fraction', dens: [6, 8], tickAt: [0, 1], tol: 0.045, offAnchor: false },
  19: { min: 0, max: 1000, display: 'numeral',  tickAt: [0, 1000], tol: 0.04, offAnchor: false },
  20: { min: 0, max: 1,    display: 'fraction', dens: [7, 8, 9], tickAt: [0, 1], tol: 0.035, offAnchor: false },
};

function ticksFor(cfg) {
  if (cfg.tickAt) return cfg.tickAt.map((v) => round4((v - cfg.min) / (cfg.max - cfg.min)));
  const out = [];
  for (let v = cfg.min; v <= cfg.max + 1e-9; v += cfg.tickEvery) out.push(round4((v - cfg.min) / (cfg.max - cfg.min)));
  return out;
}

function ageBandsFor(target) {
  if (target <= 3) return ['K-1'];
  if (target === 4) return ['K-1', '2-3'];
  if (target <= 7) return ['2-3'];
  if (target === 8) return ['2-3', '4-5'];
  if (target <= 11) return ['4-5'];
  if (target === 12) return ['4-5', '6-8'];
  return ['6-8'];
}

/* ------------------------------------------------------------------ *
 * Sample a target for the rung's representation.
 * Returns { target, value } or null if this draw is unusable.
 * ------------------------------------------------------------------ */
function sampleTarget(rng, cfg) {
  if (cfg.display === 'fraction') {
    const den = rng.pick(cfg.dens);
    const num = rng.int(1, den - 1);
    return { target: { num, den, value: num / den, reduced: `${num / gcd(num, den)}/${den / gcd(num, den)}` }, value: num / den };
  }
  // dots / groups / numeral -> an integer strictly inside the range
  const value = rng.int(cfg.min + 1, cfg.max - 1);
  return { target: { value }, value };
}

/* ------------------------------------------------------------------ *
 * Named-misconception placement zones (the placement analogue of
 * distractorRationales): each labels a region a mis-estimate would land in and
 * the misconception it implies. Scoring never uses these — they annotate error.
 * ------------------------------------------------------------------ */
function placementRationales(cfg, targetRatio) {
  const r = {
    left_end_bias: { lure: 'anchor', misconception: 'anchor_to_left_endpoint', zone: '[0, tol]' },
    right_end_bias: { lure: 'anchor', misconception: 'anchor_to_right_endpoint', zone: '[1-tol, 1]' },
    midpoint_pull: { lure: 'anchor', misconception: 'pull_to_unmarked_midpoint', zone: 'near 0.5' },
  };
  // logarithmic compression: small values placed too high, large too low
  r[targetRatio < 0.5 ? 'log_overshoot_small' : 'log_undershoot_large'] = {
    lure: 'representation', misconception: 'logarithmic_magnitude_mapping',
    zone: targetRatio < 0.5 ? 'right of target' : 'left of target',
  };
  if (cfg.display === 'fraction') {
    r.whole_number_bias = { lure: 'representation', misconception: 'count_parts_ignore_whole', zone: 'treats numerator as whole count' };
  }
  if ((cfg.ticks || []).length > 2 || cfg.tickEvery) {
    r.tick_miscount = { lure: 'near_order', misconception: 'off_by_one_interval', zone: 'one interval off target' };
  }
  return r;
}

/* ------------------------------------------------------------------ *
 * Assemble a single verified placement BankItem for a difficulty rung
 * ------------------------------------------------------------------ */
export function buildItem(masterSeed, target, ordinal) {
  const MAX_TRIES = 800;
  const cfg = RUNGS[target];
  const ticks = cfg.ticks || ticksFor(cfg);
  const tol = cfg.tol;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${target}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);

    const s = sampleTarget(rng, cfg);
    if (!s) continue;
    const value = s.value;
    const targetRatio = round4((value - cfg.min) / (cfg.max - cfg.min));

    // (a) tolerance band lies wholly inside [0,1]
    if (targetRatio - tol < 0.001 || targetRatio + tol > 0.999) continue;
    // (b) never coincides with an endpoint value
    if (value <= cfg.min || value >= cfg.max) continue;

    // (c) above the counting floor, hold the target OFF every drawn mark and the
    //     midpoint by a margin so it cannot be solved by snapping to a tick.
    const marks = ticks.filter((t) => t > 0.0001 && t < 0.9999); // interior marks only
    const gapToMark = marks.length ? Math.min(...marks.map((t) => Math.abs(t - targetRatio))) : 1;
    if (cfg.offAnchor && gapToMark < 1.35 * tol) continue;
    if (cfg.offAnchor && Math.abs(targetRatio - 0.5) < 1.1 * tol) continue;

    // difficulty float: rung + small jitter (|.|<0.5 keeps the integer bin stable)
    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((target + jitter) * 100) / 100));

    const content = {
      typeCode: TYPE_CODE,
      display: cfg.display,                    // 'dots' | 'groups' | 'fraction' | 'numeral'
      line: { min: cfg.min, max: cfg.max },
      ticks,                                   // drawn tick ratios (may be endpoints only)
      anchors: [                               // labeled endpoints (renderer-agnostic)
        { ratio: 0, value: cfg.min },
        { ratio: 1, value: cfg.max },
      ],
      target: s.target,                        // the quantity to place (shown up top)
      response: { kind: 'continuous_position', domain: [0, 1] },
      prompt: 'Slide the jumper to where the amount belongs, then press go.',
    };

    const rationales = placementRationales({ ...cfg, ticks }, targetRatio);

    return {
      itemId: rng.uuid(),
      typeCode: TYPE_CODE,
      domain: DOMAIN,
      difficulty,
      ageBands: ageBandsFor(target),
      content,
      answer: {
        // scoring.mode is 'deterministic_key': the key is the target POSITION +
        // tolerance band (server-only). correctKey names the canonical response.
        correctKey: 'target',
        targetRatio,
        targetValue: value,
        tolerance: tol,
        scorer: 'abs_position_error_within_tolerance',
        distractorRationales: rationales,
      },
      scoring: {
        mode: 'deterministic_key',
        rule: 'placement_tolerance',
        tolerance: tol,
        targetRatio,
        description:
          'correct iff |placedRatio - targetRatio| <= tolerance; ' +
          'PAE (M-PAE) = |placedRatio - targetRatio| as a fraction of the line range; ' +
          'placedRatio is the child\'s release position in [0,1]. Deterministic and reproducible.',
      },
      provenance: {
        generator: 'grammar',
        generatorRef: GENERATOR_REF,
        seed,
        levers: {
          min: cfg.min, max: cfg.max, display: cfg.display,
          tickCount: ticks.length, interiorMarks: marks.length,
          tolerance: tol, offAnchor: !!cfg.offAnchor, gapToNearestMark: round4(gapToMark),
        },
        ruleSpec: { representation: cfg.display, difficultyRung: target, aboveLevel: target >= 16 },
        validator: [
          { check: 'unique_answer', status: 'pass', detail: `single correct interval [${round4(targetRatio - tol)}, ${round4(targetRatio + tol)}] inside (0,1)` },
          { check: 'key_matches_solver', status: 'pass', detail: `derivePlacement -> ${targetRatio}` },
          { check: 'off_anchor_ok', status: 'pass', detail: cfg.offAnchor ? `gap ${round4(gapToMark)} >= ${round4(1.35 * tol)}` : 'counting floor: on-tick allowed' },
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
 * Post-write verification: parse + structure + no-leak re-derivation +
 * coverage (>=5 per ±1pt band)
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
    const c = it.content || {};
    if (!c.line || !(c.line.max > c.line.min)) problems.push(`${it.itemId}: bad line bounds`);
    if (!c.target) problems.push(`${it.itemId}: missing target`);
    // NO-LEAK solver check: recover placement ratio from served content only.
    const solved = derivePlacement(c);
    if (Math.abs(solved.ratio - it.answer.targetRatio) > 0.0002) problems.push(`${it.itemId}: solver ratio ${solved.ratio} != answer ${it.answer.targetRatio}`);
    // tolerance band must sit inside (0,1)
    const tol = it.answer.tolerance;
    if (!(it.answer.targetRatio - tol > 0 && it.answer.targetRatio + tol < 1)) problems.push(`${it.itemId}: tolerance band escapes [0,1]`);
    // served content must NOT carry the pass tolerance (server-only)
    if (c.tolerance != null) problems.push(`${it.itemId}: content leaks tolerance`);
    // distractor (misconception) rationales present
    if (!it.answer.distractorRationales || Object.keys(it.answer.distractorRationales).length < 3) problems.push(`${it.itemId}: too few misconception rationales`);
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
  const masterSeed = args.seed || 'quant-numline-01-v1';
  const perTarget = parseInt(args.per || '6', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-NUMLINE-01.jsonl');

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

  console.log(`\nQUANT-NUMLINE-01 bank written: ${outPath}`);
  console.log(`items: ${v.count}  (target ${perTarget}/rung x 20 rungs)`);
  console.log('\nrung -> made:');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${perTargetCount[i + 1]}`).join('  '));
  console.log('\n±1pt band coverage (need >=5):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.bands[i + 1]}`).join('  '));
  const reps = {};
  for (const it of v.items) reps[it.content.display] = (reps[it.content.display] || 0) + 1;
  console.log('\nrepresentations:', JSON.stringify(reps));

  if (v.thinBands.length) console.log(`\nWARN thin ±1pt bands (<5): ${v.thinBands.join(', ')}`);
  if (v.problems.length) {
    console.log(`\nFAIL ${v.problems.length} validation problem(s):`);
    v.problems.slice(0, 25).forEach((p) => console.log('  - ' + p));
    process.exitCode = 1;
    return;
  }
  if (v.thinBands.length) { process.exitCode = 1; return; }
  console.log('\nOK: JSONL parses, coverage >=5 per ±1pt band, and the solver re-derives every target position from served content (no leak).');
}

// Run only when invoked directly (so the check script can import helpers).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
