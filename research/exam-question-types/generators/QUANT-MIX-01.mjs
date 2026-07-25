#!/usr/bin/env node
/**
 * QUANT-MIX-01 — "Fair Share" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2 and
 * docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md). Every item is born-synthetic
 * (syntheticOnly:true, validated:false); difficulty is a design rung (FLOAT
 * 1..20), NOT a calibrated IRT parameter.
 *
 * CONSTRUCTION TASK (not multiple-choice). A target bowl shows two ingredients
 * in a part-to-part arrangement (m*p tokens of A, m*q tokens of B, where p:q is
 * the reduced mix). A second bowl must end up tasting the same. Either one row
 * is already filled (`given_row`) or the bowl has a fixed capacity
 * (`fixed_total`); the child builds the remaining amounts with scoops. The
 * response is therefore CONSTRUCTED counts, so scoring.mode is
 * 'computed_solver':
 *
 *     correct  <=>  countA * targetB == countB * targetA        (equivalent mix)
 *                   AND the item constraint holds               (locked row / capacity)
 *     M-PAE    =    |countA/(countA+countB) - targetA/(targetA+targetB)|
 *
 * M-PAE is the continuous concentration error (BUILD_PLAN §4, the quant core
 * metric): a child who is one scoop out is not the same as one who inverted the
 * ratio, and the solver is fully reproducible from the stored counts.
 *
 * DIFFICULTY IS STRUCTURAL, NOT ARITHMETIC. The ladder moves from replicating a
 * visible composite unit to: reducing a non-reduced target (m>1), non-integer
 * scale factors (3/2, 2/3, 4/3 — no whole batch can be copied), shrinking, both
 * rows unknown at once, grouped tokens that must be unitised instead of
 * counted, and a bowl that starts in the classic additive-error state and has
 * to be recognised as wrong. Every count stays at or below 24 tokens.
 *
 * UNIQUE-ANSWER GATE. A solver reads ONLY served content (target bowl, work
 * bowl, constraint, limits) and enumerates every reachable pair of counts that
 * satisfies the scoring predicate. It rejects any item without exactly one
 * solution, and confirms that solution equals the intended key. Because it
 * never reads `answer`, it doubles as the no-leak validator.
 *
 * Usage:  node QUANT-MIX-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-mix-01-v1", 6 items per difficulty rung (1..20) -> ~120.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-MIX-01';
const DOMAIN = 'quantitative';
const GENERATOR_REF = 'QUANT-MIX-01-grammar@1';
const DEMO_PATH = 'demos/QUANT-MIX-01.html';
const MAX_PER_INGREDIENT = 24;          // uniform across the bank, so it never hints at the key
const TOKEN_PAIRS = [                   // shape + texture carry identity; colour is never the only cue
  ['berry', 'drop'],
  ['leaf', 'pebble'],
  ['berry', 'pebble'],
  ['leaf', 'drop'],
];

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
  uuid() {
    const b = Array.from({ length: 16 }, () => this.int(0, 255));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map((x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
}
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const round4 = (x) => Math.round(x * 1e4) / 1e4;

/* ------------------------------------------------------------------ *
 * Served-content solver: the deterministic scorer + the unique-answer gate.
 * Reads NOTHING from `answer` (this is the no-leak gate).
 * ------------------------------------------------------------------ */
export function concentration(a, b) { return a + b > 0 ? a / (a + b) : null; }

// M-PAE: |child concentration - target concentration|, a fraction in [0,1].
export function paeOf(content, counts) {
  const t = concentration(content.targetBowl.A, content.targetBowl.B);
  const c = concentration(counts.A, counts.B);
  return c == null ? 1 : round4(Math.abs(c - t));
}

// The documented scoring predicate, derived from served content alone.
export function isEquivalent(content, counts) {
  const { A: ta, B: tb } = content.targetBowl;
  if (!(counts.A > 0) || !(counts.B > 0)) return false;
  if (counts.A * tb !== counts.B * ta) return false;
  const k = content.constraint;
  if (k.kind === 'fixed_total') return counts.A + counts.B === k.total;
  // given_row: the pre-filled row is locked and must be left as served
  const locked = content.locked[0];
  return counts[locked] === content.workBowl[locked];
}

// Enumerate every reachable pair of counts that satisfies the predicate.
export function solveMix(content) {
  const max = content.limits.maxPerIngredient;
  const hits = [];
  for (let a = 1; a <= max; a++) {
    for (let b = 1; b <= max; b++) {
      if (isEquivalent(content, { A: a, B: b })) hits.push({ A: a, B: b });
      if (hits.length > 4) return { unique: false, solutions: hits };
    }
  }
  return { unique: hits.length === 1, solutions: hits, counts: hits.length === 1 ? hits[0] : null };
}

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> mixture configs.
 *   p:q      reduced mix                (ratio complexity)
 *   m        target shown as m*p : m*q  (m>1 forces reducing first)
 *   s        answer is s*p : s*q        (scale s/m; non-integer or <1 = harder)
 *   family   given_row (one unknown) | fixed_total (both unknown)
 *   display  tokens (countable) | grouped (fives -> unitising)
 *   filled   work bowl starts in the additive-error state and must be corrected
 * Several equivalent configs per rung give within-rung variety.
 * ------------------------------------------------------------------ */
const RUNGS = {
  1: { family: 'given_row', display: 'tokens', filled: false, mixes: [[1, 2, 1, 2], [2, 1, 1, 2], [1, 2, 1, 2]] },
  2: { family: 'given_row', display: 'tokens', filled: false, mixes: [[1, 2, 1, 3], [2, 1, 1, 3], [1, 3, 1, 2]] },
  3: { family: 'given_row', display: 'tokens', filled: false, mixes: [[1, 3, 1, 2], [3, 1, 1, 2], [1, 2, 1, 4]] },
  4: { family: 'given_row', display: 'tokens', filled: false, mixes: [[2, 3, 1, 2], [3, 2, 1, 2], [1, 4, 1, 2]] },
  5: { family: 'fixed_total', display: 'tokens', filled: false, mixes: [[1, 2, 1, 3], [2, 1, 1, 3], [1, 3, 1, 2]] },
  6: { family: 'given_row', display: 'tokens', filled: false, mixes: [[2, 3, 1, 3], [3, 2, 1, 3], [2, 5, 1, 2]] },
  7: { family: 'fixed_total', display: 'tokens', filled: false, mixes: [[2, 3, 1, 2], [3, 2, 1, 2], [1, 4, 1, 3]] },
  8: { family: 'given_row', display: 'tokens', filled: false, mixes: [[3, 4, 1, 2], [4, 3, 1, 2], [3, 5, 1, 2]] },
  9: { family: 'given_row', display: 'tokens', filled: false, mixes: [[1, 2, 3, 2], [2, 1, 3, 2], [1, 3, 2, 1]] },
  10: { family: 'given_row', display: 'tokens', filled: false, mixes: [[2, 3, 2, 3], [3, 2, 2, 3], [1, 2, 2, 3]] },
  11: { family: 'fixed_total', display: 'tokens', filled: false, mixes: [[3, 4, 1, 3], [4, 3, 1, 3], [2, 5, 1, 3]] },
  12: { family: 'given_row', display: 'grouped', filled: false, mixes: [[3, 5, 2, 3], [5, 3, 2, 3], [2, 5, 2, 3]] },
  13: { family: 'fixed_total', display: 'tokens', filled: false, mixes: [[2, 3, 3, 2], [3, 2, 3, 2], [1, 3, 3, 2]] },
  14: { family: 'fixed_total', display: 'grouped', filled: false, mixes: [[3, 4, 2, 3], [4, 3, 2, 3], [2, 3, 2, 3]] },
  15: { family: 'given_row', display: 'grouped', filled: true, mixes: [[2, 3, 2, 3], [3, 2, 2, 3], [3, 4, 2, 3]] },
  16: { family: 'fixed_total', display: 'grouped', filled: false, mixes: [[3, 5, 2, 3], [5, 3, 2, 3], [2, 5, 2, 3]] },
  17: { family: 'fixed_total', display: 'grouped', filled: true, mixes: [[3, 4, 3, 2], [4, 3, 3, 2], [2, 3, 3, 2]] },
  18: { family: 'fixed_total', display: 'grouped', filled: true, mixes: [[2, 5, 2, 3], [5, 2, 2, 3], [3, 4, 2, 3]] },
  19: { family: 'fixed_total', display: 'grouped', filled: true, mixes: [[2, 5, 3, 2], [5, 2, 3, 2], [3, 4, 3, 2]] },
  20: { family: 'fixed_total', display: 'grouped', filled: true, mixes: [[3, 5, 3, 2], [5, 3, 3, 2], [3, 5, 2, 3]] },
};

/* ------------------------------------------------------------------ *
 * Age bands. The catalog declares only 2-3 | 4-5 | 6-8 for this type (K-1 is
 * excluded because coordinating two varying quantities is not assumed), so the
 * 1..20 design ladder is mapped onto the three declared bands.
 * ------------------------------------------------------------------ */
function ageBandsFor(rung) {
  if (rung <= 7) return ['2-3'];
  if (rung === 8) return ['2-3', '4-5'];
  if (rung <= 11) return ['4-5'];
  if (rung === 12) return ['4-5', '6-8'];
  return ['6-8'];
}

/* ------------------------------------------------------------------ *
 * Named misconception zones. The response is constructed, so these are the
 * error states the server maps a wrong construction onto (M-ERRTYPE /
 * M-LURETYPE), each with the exact counts a child holding that misconception
 * would build.
 * ------------------------------------------------------------------ */
function errorZones({ ta, tb, ca, cb, family, total, lockedRow, lockedValue }) {
  const zones = {};
  const add = (name, lure, misconception, counts, note) => {
    if (!counts) return;
    const { A, B } = counts;
    if (!Number.isInteger(A) || !Number.isInteger(B)) return;
    if (A <= 0 || B <= 0 || A > MAX_PER_INGREDIENT || B > MAX_PER_INGREDIENT) return;
    if (A === ca && B === cb) return;                                   // never label the key as an error
    if (family === 'given_row' && counts[lockedRow] !== lockedValue) return; // unreachable: that row is locked
    if (Object.values(zones).some((z) => z.counts.A === A && z.counts.B === B)) return;
    zones[name] = { lure, misconception, counts: { A, B }, note };
  };
  const diff = tb - ta;

  if (family === 'given_row') {
    // keeps the DIFFERENCE between the rows instead of the ratio
    add('additive_shift', 'proportional_lure', 'additive_instead_of_multiplicative',
      lockedRow === 'A' ? { A: ca, B: ca + diff } : { A: cb - diff, B: cb },
      `keeps the same gap between the rows (${Math.abs(diff)}) instead of the same ratio`);
    // leaves the other row exactly as the target bowl shows it
    add('copied_target_row', 'surface_match', 'ignored_the_new_size',
      lockedRow === 'A' ? { A: ca, B: tb } : { A: ta, B: cb },
      'copies the target row unchanged, so only one ingredient was scaled');
    // one scoop out
    add('off_by_one', 'near_order', 'off_by_one_scoop',
      lockedRow === 'A' ? { A: ca, B: cb + 1 } : { A: ca + 1, B: cb },
      'one scoop away from an equivalent mix');
    add('off_by_one_low', 'near_order', 'off_by_one_scoop',
      lockedRow === 'A' ? { A: ca, B: cb - 1 } : { A: ca - 1, B: cb },
      'one scoop away from an equivalent mix');
    // reads the ratio the wrong way round
    add('inverted_ratio', 'proportional_lure', 'inverted_ratio',
      lockedRow === 'A' ? { A: ca, B: Math.round((ca * ta) / tb) } : { A: Math.round((cb * tb) / ta), B: cb },
      'applies the two parts the wrong way round');
  } else {
    // fills the bowl keeping the row gap instead of the ratio
    const gapA = (total - diff) / 2;
    add('additive_shift', 'proportional_lure', 'additive_instead_of_multiplicative',
      { A: gapA, B: gapA + diff }, `fills the bowl keeping the gap of ${Math.abs(diff)} between the rows`);
    // swaps the two parts
    add('inverted_ratio', 'proportional_lure', 'inverted_ratio', { A: cb, B: ca },
      'puts the bigger amount on the wrong ingredient');
    // splits the bowl evenly, ignoring the mix entirely
    add('even_split', 'rule_violation', 'ignored_the_mix',
      total % 2 === 0 ? { A: total / 2, B: total / 2 } : { A: (total - 1) / 2, B: (total + 1) / 2 },
      'shares the bowl equally instead of by the mix');
    // scales one row and tops up the other
    add('scaled_one_row', 'rule_violation', 'scaled_one_ingredient_only', { A: ca, B: total - ca + 1 },
      'scales one ingredient, then fills the rest with the other');
    add('off_by_one', 'near_order', 'off_by_one_scoop', { A: ca + 1, B: cb - 1 },
      'one scoop away from an equivalent mix');
  }
  return zones;
}

/* ------------------------------------------------------------------ */
export function buildItem(masterSeed, rung, ordinal) {
  const MAX_TRIES = 200;
  const cfg = RUNGS[rung];
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${rung}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);

    // Vary mix, ingredients and which row is given ACROSS ordinals, so the six
    // items on a rung are distinct stimuli rather than recoloured twins.
    const variant = ordinal + attempt;
    const [p, q, m, s] = cfg.mixes[variant % cfg.mixes.length];
    if (gcd(p, q) !== 1 || s === m) continue;                  // must be reduced, and never a plain copy
    const ta = m * p, tb = m * q;                              // target bowl as displayed
    const ca = s * p, cb = s * q;                              // the equivalent mixture to build
    if (ta + tb > 24 || ca > MAX_PER_INGREDIENT || cb > MAX_PER_INGREDIENT) continue;

    // ingredients + given row track the ORDINAL, so a retry that changes the mix
    // can never collide with another ordinal on the same rung
    const [tokenA, tokenB] = TOKEN_PAIRS[ordinal % TOKEN_PAIRS.length];
    const lockedRow = cfg.family === 'given_row' ? (ordinal % 2 === 0 ? 'A' : 'B') : null;
    const lockedValue = lockedRow === 'A' ? ca : cb;
    const total = ca + cb;

    const zones = errorZones({ ta, tb, ca, cb, family: cfg.family, total, lockedRow, lockedValue });
    if (Object.keys(zones).length < 3) continue;

    // Where the work bowl starts. `filled` opens on the additive-error state,
    // which the child has to recognise as the wrong mix and repair.
    let workBowl;
    if (cfg.family === 'given_row') {
      const free = lockedRow === 'A' ? 'B' : 'A';
      workBowl = { A: lockedRow === 'A' ? ca : 0, B: lockedRow === 'B' ? cb : 0 };
      if (cfg.filled && zones.additive_shift) workBowl[free] = zones.additive_shift.counts[free];
    } else {
      workBowl = cfg.filled && zones.additive_shift ? { ...zones.additive_shift.counts } : { A: 0, B: 0 };
    }
    if (cfg.family === 'given_row' && workBowl[lockedRow] !== lockedValue) continue;
    if (workBowl.A === ca && workBowl.B === cb) continue;       // never open on the answer

    const content = {
      typeCode: TYPE_CODE,
      display: cfg.display,                                     // 'tokens' | 'grouped' (fives)
      ingredients: [{ id: 'A', token: tokenA }, { id: 'B', token: tokenB }],
      targetBowl: { A: ta, B: tb },                             // the mix to match (may be un-reduced)
      workBowl,                                                 // starting amounts in the second bowl
      locked: lockedRow ? [lockedRow] : [],                     // rows the child cannot change
      constraint: cfg.family === 'fixed_total'
        ? { kind: 'fixed_total', total }                        // bowl capacity, shown as slots
        : { kind: 'given_row', row: lockedRow },
      limits: { maxPerIngredient: MAX_PER_INGREDIENT, step: 1, batch: { A: ta, B: tb } },
      response: { kind: 'constructed_counts', ingredients: ['A', 'B'] },
      prompt: cfg.family === 'fixed_total'
        ? 'Fill the second bowl to the line so it tastes the same as the first bowl, then press Taste.'
        : 'Add scoops to the second bowl so it tastes the same as the first bowl, then press Taste.',
    };

    // UNIQUE-answer gate: enumerate from served content only, never from `answer`.
    const verdict = solveMix(content);
    if (!verdict.unique) continue;
    if (verdict.counts.A !== ca || verdict.counts.B !== cb) continue;
    if (paeOf(content, { A: ca, B: cb }) !== 0) continue;
    if (Object.values(zones).some((z) => paeOf(content, z.counts) === 0 && isEquivalent(content, z.counts))) continue;

    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((rung + jitter) * 100) / 100));

    return {
      itemId: rng.uuid(),
      typeCode: TYPE_CODE,
      domain: DOMAIN,
      difficulty,
      ageBands: ageBandsFor(rung),
      demoPath: DEMO_PATH,
      content,
      answer: {
        // Constructed response: the "key" is the canonical construction. The
        // named zones below let the server label a wrong construction.
        correctKey: `A=${ca},B=${cb}`,
        correctCounts: { A: ca, B: cb },
        unitRatio: { A: p, B: q },
        units: s,
        scaleFromTarget: round4(s / m),
        distractorRationales: zones,
      },
      scoring: {
        mode: 'computed_solver',
        rule: 'ratio_equivalence_with_constraint',
        description:
          'correct iff counts.A * targetBowl.B === counts.B * targetBowl.A with both counts > 0 AND the ' +
          'constraint holds (given_row: the locked row equals the served amount; fixed_total: counts.A + ' +
          'counts.B === constraint.total). M-PAE = |counts.A/(counts.A+counts.B) - targetBowl.A/' +
          '(targetBowl.A+targetBowl.B)| is the continuous concentration error (0 for an equivalent mix). ' +
          'Deterministic and reproducible from the stored counts.',
        metrics: ['M-PAE'],
      },
      provenance: {
        generator: 'grammar',
        generatorRef: GENERATOR_REF,
        seed,
        ruleFamily: cfg.family,
        levers: {
          ratio: `${p}:${q}`, ratioParts: p + q, targetMultiple: m, units: s,
          scaleFromTarget: round4(s / m), integerScale: Number.isInteger(s / m),
          shrink: s < m, bothRowsUnknown: cfg.family === 'fixed_total',
          display: cfg.display, startsInErrorState: !!cfg.filled,
          difficultyRung: rung, aboveLevel: rung >= 16,
        },
        ruleSpec: { targetBowl: { A: ta, B: tb }, answer: { A: ca, B: cb }, total },
        validator: [
          { check: 'unique_answer', status: 'pass', detail: `exactly one reachable equivalent mix (${ca}:${cb}) within 1..${MAX_PER_INGREDIENT}` },
          { check: 'key_matches_solver', status: 'pass', detail: `solveMix -> A=${ca},B=${cb}` },
          { check: 'pae_zero_at_key', status: 'pass', detail: 'concentration error is exactly 0 for the keyed construction' },
          { check: 'lure_taxonomy_ok', status: 'pass', detail: Object.values(zones).map((z) => z.misconception).join(', ') },
          { check: 'counting_load_ok', status: 'pass', detail: `largest row ${Math.max(ta, tb, ca, cb)} tokens (<= ${MAX_PER_INGREDIENT})` },
          { check: 'reading_load_ok', status: 'pass', detail: 'single on-screen instruction line; no prose stimulus' },
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
 * coverage (>=5 per +/-1pt band)
 * ------------------------------------------------------------------ */
const LEAK_KEYS = ['correctKey', 'correctCounts', 'answer', 'unitRatio', 'units', 'scaleFromTarget',
  'lure', 'misconception', 'distractorRationales', 'difficultyRung', 'ruleSpec'];
function leakedKey(node) {
  if (Array.isArray(node)) { for (const x of node) { const k = leakedKey(x); if (k) return k; } return null; }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      if (LEAK_KEYS.includes(k)) return k;
      const inner = leakedKey(node[k]); if (inner) return inner;
    }
  }
  return null;
}

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
    if (it.scoring?.mode !== 'computed_solver') problems.push(`${it.itemId}: scoring mode`);
    if (it.demoPath !== DEMO_PATH) problems.push(`${it.itemId}: demoPath`);
    const leak = leakedKey(it.content);
    if (leak) problems.push(`${it.itemId}: content leaks "${leak}"`);
    const verdict = solveMix(it.content);
    if (!verdict.unique) problems.push(`${it.itemId}: solver found ${verdict.solutions.length} equivalent mixes`);
    else if (verdict.counts.A !== it.answer.correctCounts.A || verdict.counts.B !== it.answer.correctCounts.B) {
      problems.push(`${it.itemId}: solver mix != keyed answer`);
    }
    if (paeOf(it.content, it.answer.correctCounts) !== 0) problems.push(`${it.itemId}: M-PAE not 0 at the key`);
    const zones = it.answer.distractorRationales || {};
    if (Object.keys(zones).length < 3) problems.push(`${it.itemId}: fewer than 3 misconception zones`);
    for (const [name, z] of Object.entries(zones)) {
      if (!z.lure || !z.misconception) problems.push(`${it.itemId}: zone ${name} missing lure/misconception`);
      if (isEquivalent(it.content, z.counts)) problems.push(`${it.itemId}: zone ${name} is actually correct`);
    }
  });

  const bands = {};
  for (let p = 1; p <= 20; p++) bands[p] = 0;
  const rounded = {};
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
  const masterSeed = args.seed || 'quant-mix-01-v1';
  const perRung = parseInt(args.per || '6', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-MIX-01.jsonl');

  mkdirSync(dirname(outPath), { recursive: true });

  const items = [];
  const perRungCount = {};
  for (let rung = 1; rung <= 20; rung++) {
    let made = 0;
    for (let ordinal = 0; ordinal < perRung; ordinal++) {
      const it = buildItem(masterSeed, rung, ordinal);
      if (it) { items.push(it); made++; }
    }
    perRungCount[rung] = made;
  }

  writeFileSync(outPath, items.map((it) => JSON.stringify(it)).join('\n') + '\n', 'utf8');
  const v = verifyBank(outPath);

  console.log(`\nQUANT-MIX-01 bank written: ${outPath}`);
  console.log(`items: ${v.count}  (target ${perRung}/rung x 20 rungs)`);
  console.log('\nrung -> made:');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${perRungCount[i + 1]}`).join('  '));
  console.log('\ninteger bucket (rounded difficulty):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.rounded[i + 1] || 0}`).join('  '));
  console.log('\n+/-1pt band coverage (need >=5):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.bands[i + 1]}`).join('  '));
  const fams = {};
  for (const it of v.items) fams[it.provenance.ruleFamily] = (fams[it.provenance.ruleFamily] || 0) + 1;
  console.log('\nresponse families:', JSON.stringify(fams));
  const scales = {};
  for (const it of v.items) { const k = it.provenance.levers.integerScale ? 'whole-batch scale' : 'non-integer scale'; scales[k] = (scales[k] || 0) + 1; }
  console.log('scale factors:', JSON.stringify(scales));

  if (v.thinBands.length) console.log(`\nWARN thin +/-1pt bands (<5): ${v.thinBands.join(', ')}`);
  if (v.problems.length) {
    console.log(`\nFAIL ${v.problems.length} validation problem(s):`);
    v.problems.slice(0, 25).forEach((p) => console.log('  - ' + p));
    process.exitCode = 1;
    return;
  }
  if (v.thinBands.length) { process.exitCode = 1; return; }
  console.log('\nOK: JSONL parses, coverage >=5 per +/-1pt band, and the solver re-derives every equivalent mix from served content (no leak).');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
