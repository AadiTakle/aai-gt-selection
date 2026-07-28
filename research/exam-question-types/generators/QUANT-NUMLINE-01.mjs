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
 * DISTINCTNESS AND DIFFICULTY (both are properties of CONTENT, by construction)
 * ---------------------------------------------------------------------------
 * A placement item's whole stimulus is (representation, line bounds, drawn
 * ticks, target quantity). The first three are fixed by the rung, so the target
 * quantity is the only thing that can distinguish two items on the same rung —
 * and the admissible target set is finite and often small once the tolerance
 * band and the off-anchor margin have had their say. Rejection sampling into
 * that set duplicates content; on a rung whose admissible set is smaller than
 * the number of items wanted it duplicates it necessarily. So this generator
 * does not sample. `admissiblePool` enumerates the rung's entire admissible
 * content space, `buildItem` permutes it with a rung-scoped seed and takes slot
 * `ordinal`: sampling WITHOUT replacement. Two items on a rung cannot share a
 * target, there is no rejection loop to run away, and the choice stays a pure
 * function of (masterSeed, rung, ordinal) so the check script can regenerate
 * any single item in isolation.
 *
 * Across rungs, distinctness is structural: no two rungs share a (display,
 * line, ticks) configuration unless their denominator sets are disjoint, so
 * every content fingerprint in the bank belongs to exactly one rung. That is
 * also what makes `difficulty` recoverable from content: content -> rung, and
 * the within-rung offset is `structuralOffset`, a deterministic function of the
 * target's own structure (how far it sits from the nearest readable reference,
 * and how heavy its representation is). There is no jitter. Identical content
 * cannot exist twice, and equally-structured content always scores the same.
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
const round2 = (x) => Math.round(x * 100) / 100;
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
 *
 * TWO INVARIANTS THIS TABLE HAS TO HOLD, both checked by `auditRungs()`:
 *
 *   (1) Every rung's admissible target set must be at least as large as the
 *       number of items wanted from it. `tol` and `offAnchor` do most of the
 *       cutting: at max 30 with ticks every 10, an off-anchor rung at tol 0.10
 *       has to clear both interior thirds AND the midpoint, which leaves four
 *       usable integers out of twenty-nine. Rungs 2, 6, 11, 12 and 13 are sized
 *       against that arithmetic, not against the nominal range.
 *
 *   (2) No two rungs may produce the same content. Content carries (display,
 *       line, ticks, target) but NOT `tol` — the pass band is server-only — so
 *       two rungs that differ only in tolerance are indistinguishable to the
 *       child and would put one stimulus at two difficulties. Rungs 1/2 (both
 *       dots 0..10 every 1) and 17/19 (both numeral 0..1000 anchored at the
 *       ends) were exactly that, and produced cross-rung duplicates. Where two
 *       rungs still share a (display, line, ticks) configuration — 12/13 and
 *       18/20 — their denominator sets are disjoint instead.
 * ------------------------------------------------------------------ */
const RUNGS = {
  1:  { min: 0, max: 10,   display: 'dots',     tickEvery: 1,  tol: 0.13, offAnchor: false },
  2:  { min: 0, max: 12,   display: 'dots',     tickEvery: 1,  tol: 0.12, offAnchor: false },
  3:  { min: 0, max: 10,   display: 'dots',     tickEvery: 2,  tol: 0.11, offAnchor: false },
  4:  { min: 0, max: 20,   display: 'groups',   tickEvery: 5,  tol: 0.11, offAnchor: false },
  5:  { min: 0, max: 20,   display: 'groups',   tickEvery: 10, tol: 0.10, offAnchor: false },
  6:  { min: 0, max: 40,   display: 'groups',   tickEvery: 20, tol: 0.10, offAnchor: true  },
  7:  { min: 0, max: 50,   display: 'groups',   tickEvery: 10, tol: 0.09, offAnchor: false },
  8:  { min: 0, max: 50,   display: 'groups',   tickAt: [0, 25, 50], tol: 0.09, offAnchor: true },
  9:  { min: 0, max: 100,  display: 'groups',   tickEvery: 25, tol: 0.085, offAnchor: true },
  10: { min: 0, max: 100,  display: 'groups',   tickAt: [0, 50, 100], tol: 0.08, offAnchor: true },
  11: { min: 0, max: 1,    display: 'fraction', dens: [2, 3, 4, 5], tickAt: [0, 0.25, 0.5, 0.75, 1], tol: 0.08, offAnchor: false },
  12: { min: 0, max: 1,    display: 'fraction', dens: [3, 4, 6],    tickAt: [0, 0.5, 1], tol: 0.075, offAnchor: true },
  13: { min: 0, max: 1,    display: 'fraction', dens: [5, 7],       tickAt: [0, 0.5, 1], tol: 0.07, offAnchor: false },
  14: { min: 0, max: 100,  display: 'numeral',  tickAt: [0, 50, 100], tol: 0.065, offAnchor: true },
  15: { min: 0, max: 100,  display: 'numeral',  tickAt: [0, 100], tol: 0.06, offAnchor: false },
  16: { min: 0, max: 1000, display: 'numeral',  tickAt: [0, 500, 1000], tol: 0.055, offAnchor: true },
  17: { min: 0, max: 1000, display: 'numeral',  tickAt: [0, 1000], tol: 0.05, offAnchor: false },
  18: { min: 0, max: 1,    display: 'fraction', dens: [6, 8], tickAt: [0, 1], tol: 0.045, offAnchor: false },
  19: { min: 0, max: 10000, display: 'numeral', tickAt: [0, 10000], tol: 0.04, offAnchor: false },
  20: { min: 0, max: 1,    display: 'fraction', dens: [7, 9, 11], tickAt: [0, 1], tol: 0.035, offAnchor: false },
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
 * The rung's ENTIRE admissible content space, enumerated in a fixed order.
 *
 * A candidate is admissible when it satisfies exactly the constraints the item
 * contract states: the tolerance band lies wholly inside (0,1), the value never
 * coincides with an endpoint, and — above the counting floor — the target is
 * held off every drawn mark and off the midpoint by a margin so the item cannot
 * be solved by snapping. Enumerating rather than sampling is what makes
 * duplicate content impossible: `buildItem` draws from this list without
 * replacement.
 * ------------------------------------------------------------------ */
export function admissiblePool(cfg, ticks) {
  const marks = ticks.filter((t) => t > 0.0001 && t < 0.9999); // interior marks only
  const tol = cfg.tol;
  const out = [];
  const consider = (target, value) => {
    const ratio = round4((value - cfg.min) / (cfg.max - cfg.min));
    // (a) tolerance band lies wholly inside [0,1]
    if (ratio - tol < 0.001 || ratio + tol > 0.999) return;
    // (b) never coincides with an endpoint value
    if (value <= cfg.min || value >= cfg.max) return;
    // (c) above the counting floor, hold the target OFF every drawn mark and the
    //     midpoint by a margin so it cannot be solved by snapping to a tick.
    const gapToMark = marks.length ? Math.min(...marks.map((t) => Math.abs(t - ratio))) : 1;
    if (cfg.offAnchor && gapToMark < 1.35 * tol) return;
    if (cfg.offAnchor && Math.abs(ratio - 0.5) < 1.1 * tol) return;
    out.push({ target, value, ratio, gapToMark: round4(gapToMark) });
  };

  if (cfg.display === 'fraction') {
    for (const den of cfg.dens)
      for (let num = 1; num < den; num++)
        consider(
          { num, den, value: num / den, reduced: `${num / gcd(num, den)}/${den / gcd(num, den)}` },
          num / den,
        );
  } else {
    // dots / groups / numeral -> an integer strictly inside the range
    for (let value = cfg.min + 1; value <= cfg.max - 1; value++) consider({ value }, value);
  }
  return out;
}

/** Unbiased permutation of the pool under a rung-scoped seed. */
function permute(pool, seedStr) {
  const rng = new Rng(seedStr);
  const a = pool.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Within-rung difficulty offset in [-0.4, +0.4], a DETERMINISTIC function of the
 * candidate's own structure. It replaces a uniform random jitter, which made
 * `difficulty` partly independent of content: the same target quantity drawn on
 * two ordinals landed at two different difficulties, so the adaptive engine was
 * selecting on the generator's PRNG rather than on the item.
 *
 * Two structural features, both readable off the served content:
 *   spatial — how far the target sits from the nearest reference the child can
 *             read straight off the line (a drawn tick, a labelled endpoint, or
 *             the unmarked midpoint). Estimation error is smallest at those
 *             references and grows between them, so a target in open line is the
 *             harder placement.
 *   rep     — representation load. For fractions, how large the denominator is
 *             within the rung's own set. For counts and numerals, how far the
 *             value is from a round anchor (multiples of ten, then five, then
 *             two), since round magnitudes are the ones children hold.
 *
 * Kept inside +/-0.4 so an item never leaves its rung's integer bin.
 */
function structuralOffset(cfg, ticks, pool, pick) {
  const refs = new Set([0, 1, 0.5]);
  for (const t of ticks) refs.add(round4(t));
  const refList = [...refs];
  const gapTo = (r) => Math.min(...refList.map((x) => Math.abs(x - r)));

  const gaps = pool.map((c) => gapTo(c.ratio));
  const gLo = Math.min(...gaps);
  const gHi = Math.max(...gaps);
  const spatial = gHi - gLo < 1e-9 ? 0.5 : (gapTo(pick.ratio) - gLo) / (gHi - gLo);

  let rep;
  if (cfg.display === 'fraction') {
    const dens = pool.map((c) => c.target.den);
    const dLo = Math.min(...dens);
    const dHi = Math.max(...dens);
    rep = dHi === dLo ? 0.5 : (pick.target.den - dLo) / (dHi - dLo);
  } else {
    const v = pick.value;
    rep = v % 10 === 0 ? 0 : v % 5 === 0 ? 0.34 : v % 2 === 0 ? 0.67 : 1;
  }

  return round2(0.8 * (0.6 * spatial + 0.4 * rep - 0.5));
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
  const cfg = RUNGS[target];
  const ticks = cfg.ticks || ticksFor(cfg);
  const tol = cfg.tol;
  const marks = ticks.filter((t) => t > 0.0001 && t < 0.9999); // interior marks only

  // Draw WITHOUT REPLACEMENT from the rung's admissible content space. The
  // permutation is seeded per rung, so slot `ordinal` is the same candidate no
  // matter which other items have been built (or whether any have) — the choice
  // stays a pure function of (masterSeed, rung, ordinal), and no candidate is
  // ever drawn and discarded, so nothing downstream shifts.
  const pool = admissiblePool(cfg, ticks);
  const pick = permute(pool, `${masterSeed}:${TYPE_CODE}:d${target}:pool`)[ordinal];
  if (!pick) return null; // rung exhausted: emit fewer items rather than a duplicate

  const seed = `${masterSeed}:${TYPE_CODE}:d${target}:i${ordinal}`;
  const rng = new Rng(seed);
  const { value, ratio: targetRatio, gapToMark } = pick;

  // Difficulty is a design rung plus a structural offset derived from the
  // target itself — no jitter, so identical structure always scores identically.
  const offset = structuralOffset(cfg, ticks, pool, pick);
  const difficulty = Math.min(20, Math.max(1, round2(target + offset)));

  const content = {
    typeCode: TYPE_CODE,
    display: cfg.display,                    // 'dots' | 'groups' | 'fraction' | 'numeral'
    line: { min: cfg.min, max: cfg.max },
    ticks,                                   // drawn tick ratios (may be endpoints only)
    anchors: [                               // labeled endpoints (renderer-agnostic)
      { ratio: 0, value: cfg.min },
      { ratio: 1, value: cfg.max },
    ],
    target: pick.target,                     // the quantity to place (shown up top)
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
        tolerance: tol, offAnchor: !!cfg.offAnchor, gapToNearestMark: gapToMark,
        poolSize: pool.length, structuralOffset: offset,
      },
      ruleSpec: { representation: cfg.display, difficultyRung: target, aboveLevel: target >= 16 },
      validator: [
        { check: 'unique_answer', status: 'pass', detail: `single correct interval [${round4(targetRatio - tol)}, ${round4(targetRatio + tol)}] inside (0,1)` },
        { check: 'key_matches_solver', status: 'pass', detail: `derivePlacement -> ${targetRatio}` },
        { check: 'off_anchor_ok', status: 'pass', detail: cfg.offAnchor ? `gap ${gapToMark} >= ${round4(1.35 * tol)}` : 'counting floor: on-tick allowed' },
        { check: 'distinct_content', status: 'pass', detail: `slot ${ordinal} of a ${pool.length}-candidate rung pool, drawn without replacement` },
        { check: 'reading_load_ok', status: 'pass', detail: 'no prose stimulus; single instruction line' },
      ],
    },
    syntheticOnly: true,
    validated: false,
  };
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

  // Distinctness, measured the way the bank auditor measures it: one fingerprint
  // per served `content` object. Any collision is a defect, not a warning.
  const byContent = new Map();
  for (const it of items) {
    const fp = JSON.stringify(it.content);
    if (!byContent.has(fp)) byContent.set(fp, []);
    byContent.get(fp).push(it);
  }
  for (const group of byContent.values()) {
    if (group.length > 1) {
      problems.push(
        `duplicate content shared by ${group.length} items at difficulty ` +
          `${group.map((g) => g.difficulty).join(', ')} (${group.map((g) => g.itemId).join(', ')})`,
      );
    }
  }
  // Difficulty must be a function of content: same content -> same difficulty.
  // Guaranteed above, but asserted here so a future rung edit cannot reintroduce
  // a content-independent difficulty term unnoticed.
  const spread = Math.max(
    0,
    ...[...byContent.values()].map((g) => Math.max(...g.map((x) => x.difficulty)) - Math.min(...g.map((x) => x.difficulty))),
  );
  if (spread > 0) problems.push(`identical content carries difficulties ${spread} apart`);

  return { count: items.length, bands, rounded, thinBands, problems, items, distinct: byContent.size };
}

/**
 * Static audit of the rung table itself, run before anything is generated so a
 * shortfall is reported as a table defect rather than as a missing item.
 * Enforces the two invariants documented on RUNGS.
 */
function auditRungs(perTarget) {
  const problems = [];
  const configs = new Map();
  for (let rung = 1; rung <= 20; rung++) {
    const cfg = RUNGS[rung];
    const ticks = cfg.ticks || ticksFor(cfg);
    const pool = admissiblePool(cfg, ticks);
    if (pool.length < perTarget) {
      problems.push(`rung ${rung}: only ${pool.length} admissible targets for ${perTarget} items`);
    }
    // (2) cross-rung content collision: same visible configuration AND an
    //     overlapping target space.
    const key = JSON.stringify([cfg.display, cfg.min, cfg.max, ticks]);
    const values = new Set(pool.map((c) => JSON.stringify(c.target)));
    for (const [otherRung, other] of configs.get(key) || []) {
      const shared = [...values].filter((v) => other.has(v));
      if (shared.length) {
        problems.push(
          `rungs ${otherRung} and ${rung} share a visible configuration and ${shared.length} target(s); ` +
            `one stimulus would carry two difficulties`,
        );
      }
    }
    configs.set(key, [...(configs.get(key) || []), [rung, values]]);
  }
  return problems;
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

  const rungProblems = auditRungs(perTarget);
  if (rungProblems.length) {
    console.log(`\nFAIL ${rungProblems.length} rung-table problem(s):`);
    rungProblems.forEach((p) => console.log('  - ' + p));
    process.exitCode = 1;
    return;
  }

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
  console.log(`distinct content fingerprints: ${v.distinct}/${v.count}`);
  console.log('\nrung -> admissible pool size:');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => {
    const cfg = RUNGS[i + 1];
    return `${i + 1}:${admissiblePool(cfg, cfg.ticks || ticksFor(cfg)).length}`;
  }).join('  '));
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
