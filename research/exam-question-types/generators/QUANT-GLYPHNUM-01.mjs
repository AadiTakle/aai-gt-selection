// QUANT-GLYPHNUM-01 "Alien Numbers" — DUAL-MODE structured bank generator (Bucket A: grammar).
//
// A Stage 2 learning-block type, built to STAGE2_QUESTION_DESIGN.md §3.2 and §9.2 (U3) under
// D-S2-2 (purpose-designed) and D-S2-3 (the scrambled-system control is a binding gate).
// `FLU-OPCHAIN-01.mjs` is the reference implementation and this file follows its structure
// deliberately: same RNG idiom, same dual-mode contract, same lever-driven difficulty, same
// "every distractor is a named incomplete rule" discipline.
//
// THE TASK. An invented numeral system. A written expression of one to four glyphs sits above a
// number line whose right-hand end is labelled with another expression in the same system; the
// child taps which of five marked positions the expression belongs at. One tap, five fixed
// positions, no drag and no construction (§3.2 is explicit that the line response is tap targets
// and not a drag, so no motor learning curve enters the block).
//
// ---------------------------------------------------------------------------
// THE HIDDEN SYSTEM, AND WHY IT IS A HYBRID
//
// Five arbitrary glyphs map bijectively onto five roles in a base-4 notation:
//
//   three SCALE roles   values 1, 4, 16     (a sign-value ladder: glyphs ADD, order irrelevant)
//   two   DIGIT roles   values 2, 3         (a multiplier that BINDS to the scale after it)
//
// An expression is read left to right as a sum of UNITS. A unit is either a bare scale (worth the
// scale) or a digit immediately followed by a scale (worth digit x scale). So the notation carries
// an additive layer and a multiplicative layer, and WHICH LAYER an item needs is a property of the
// item rather than of the block.
//
// That hybrid is not decoration; it is what makes §3.2's two published difficulty directions usable
// as within-block levers. Weiers, Gilmore & Inglis (2025) found a sign-value advantage over
// place-value, and Holt & Barner (2025) found additive composition easier than multiplicative —
// both on ADULTS, which is open assumption A-S2-2. A system that were purely sign-value or purely
// place-value would have to vary the composition rule BETWEEN blocks to use that ordering, and a
// rule that changes between blocks is not learnable within one. Carrying both layers in one system
// puts the ordering inside a single child's ladder, where λ can see it.
//
// WHAT §3.2's "base" LEVER BECAME, AND WHY. §3.2 lists base among the difficulty levers. Base is a
// property of the SYSTEM, and §3.2 also fixes the system for the whole block — a per-item base
// change would re-draw the system every trial, which is the `perTrial` control arm, not a
// difficulty lever. So base is fixed at 4 for the bank and the lever is dropped, exactly as
// FLU-OPCHAIN-01 dropped §3.1's "number of operators in the active vocabulary" for the same reason.
// Base 4 rather than Weiers' base 3: both are equally unfamiliar to a base-10 child, and base 4
// buys a fifth glyph (two digit roles instead of one), which raises the relabelling space from 24
// mappings to 120 and is therefore the anti-leak margin below.
//
// ---------------------------------------------------------------------------
// WHY THIS IS ONE GENERATOR AND TWO BANKS
//
// §4.1.1 makes the scrambled control a generator MODE: two code paths or two renderers would
// confound the contrast with the generator or the renderer. `systemPersistence` is therefore a
// parameter of this file from its first commit:
//
//   consistent  one glyph->role mapping for the WHOLE bank. What the child works out on trial 1 is
//               still true on trial 30, so knowledge of the system transfers across items — the
//               only thing that can transfer, because no item ever repeats.
//   perTrial    a FRESH mapping every item. Nothing carries forward. Any climb observed here is the
//               design's contamination floor: practice, warm-up, residual interface learning,
//               guessing, regression at the handover and difficulty misspecification, summed.
//
// The two banks are equated BY CONSTRUCTION, not by inspection. The ROLE sequence, the line's
// maximum, every option value, the key, the key's rank on the line, the distractor slate and the
// stated difficulty are drawn from the lever tuple and the seed and never from the mode. Only which
// glyph symbols spell the expression and the line's anchor differ, and the glyph tray is listed in
// one canonical order in both arms so the tray itself carries no information.
//
// ---------------------------------------------------------------------------
// WHY THE KEY IS NOT DERIVABLE FROM `content` (E-075/E-076)
//
// `content` gives the glyph tray, the expression, the line's anchor expression and five tick
// RATIOS. It does not give the line's numeric maximum, because publishing it would hand the
// attacker the equation value(anchor) = max and pin part of the mapping for free.
//
// The strongest content-only attack is to brute-force the mapping. A mapping is a glyph->role
// bijection over five glyphs, so there are 5! = 120 of them, and the attacker is assumed to know
// the algorithm — E-075/E-076 judge derivability from the DATA, not from who knows the method. For
// each mapping the attacker computes value(expression) / value(anchor) and keeps the options whose
// ratio matches. That is closed in two layers, both re-derived independently by
// `check-QUANT-GLYPHNUM-01.mjs` from `content` alone:
//
//   1. A HARD INVARIANT: at least TWO options must survive the brute force. If only one did, a
//      browser would recover the key from `content` with no induction at all. This is the invariant
//      FLU-OPCHAIN-01 had to retrofit after its first bank leaked the key on 11 of 234 items; here
//      it is a build-time constraint and the generator abandons a layout that cannot satisfy it.
//   2. An OPTIMISED OBJECTIVE, because determinacy is the wrong bar on its own. An item where two
//      options survive still hands a guesser 50%, and an attacker who counts how many of the 120
//      mappings back each survivor and takes the modal one can beat even a five-survivor item. So
//      the layout — which line, and which partial rules make the slate — is chosen to MINIMISE the
//      best of three content-only attacks: uniform over survivors, most-backed survivor, and
//      least-backed survivor. The third is in the list because forcing the key never to be modal is
//      as predictable as letting it always be modal, and an objective that ignored it would build
//      the inverse tell while reporting a clean modal figure.
//
// The floor is 20% — five survivors, equally backed. What the bank achieves against that floor is
// reported by the generator and by the checker PER DIFFICULTY SLICE, because a leak concentrated in
// one slice is invisible in a bank mean and the block serves different slices to different children.
//
// Two surface heuristics are closed separately, because neither needs the mapping:
//
//   * "longer expression, further right." Key RANK on the line is allocated round-robin WITHIN each
//     expression length, so rank carries no information about length. Round-robin over the bank as
//     a whole would leave that correlation intact while looking balanced.
//   * "tap the end of the line." One admissible distractor is the anchor value itself, so the
//     right-hand end is a live wrong answer rather than a free elimination.
//
// Cross-item inference is NOT closed, and must not be: pooling several items in the `consistent`
// arm narrows the mapping, and doing exactly that is the induction the block is trying to measure.
// The checker reports how many items suffice to pin the mapping as a LEARNABILITY figure. In the
// `perTrial` arm the same pooling yields nothing, which is the control's whole logic.
//
// ---------------------------------------------------------------------------
// WHY THIS BANK CAN SUPPLY `M-PAE`, RATHER THAN DECLARING IT
//
// D-031 left `M-PAE` `enforced: false` in quantitative because retiring `QUANT-NUMLINE-01` left it
// with no placement supplier, and `packages/exam-engine/src/config.ts` names "a placement type
// wired again" as the re-enforcement trigger. This bank emits `scoring.rule =
// 'placement_tolerance'` with `answer.targetRatio` and `answer.tolerance`, which is the contract the
// SHIPPED generic verifiers already implement in both tiers — `verifyPlacementTolerance` in
// `apps/web/src/lib/exam/verifiers/generic.ts` and `app.exam_verify_placement_tolerance` in
// `supabase/migrations/20260725170000_exam_verify_plpgsql.sql`. Both compute
// `pae = |placedRatio - targetRatio|` and return it as `M-PAE`. So the emission needs no new
// verifier code, and `check-QUANT-GLYPHNUM-01.mjs` re-implements that formula and proves, on every
// item x every option, that the metric comes out graded, in the registry's declared [0, 0.5] range,
// and that `pae <= tolerance` picks out exactly the keyed tick.
//
// It is graded because the four wrong ticks are the values of NAMED partial rules, so the distance
// between the tapped tick and the key is the size of the child's decoding error, not an arbitrary
// gap: a child who has the vocabulary and the additive layer but not the multiplicative binding
// lands near, and a child counting glyph tokens lands far. That is what the registry means by
// "small consistent PAE separates top reasoners without ceiling".
//
// ---------------------------------------------------------------------------
// GOVERNANCE. Born-synthetic only (syntheticOnly:true, validated:false). `difficulty` is a DESIGN
// rung on the shared 1..20 scale computed from the declared levers, NOT a calibrated IRT parameter.
// NOTHING HERE IS GATED: Gate B needs ~128 real children (§4.1.3) and no synthetic run substitutes,
// so the honest status is "gate-ready, ungated". Not wired into the live learning block.
//
// WHERE THE TWO BANKS ARE WRITTEN. `banks/` is the SERVED directory — `bank-loader.ts` builds every
// path it reads inside it and `sync-exam-demos.mjs` globs it — so the consistent arm goes there as
// the plain `banks/QUANT-GLYPHNUM-01.jsonl` and the scrambled arm goes to `control-banks/`, a
// directory no application code names. That is a stronger guarantee than a filename convention.
//
// Run:  node research/exam-question-types/generators/QUANT-GLYPHNUM-01.mjs
//       writes ../banks/QUANT-GLYPHNUM-01.jsonl (consistent, live) and
//       ../control-banks/QUANT-GLYPHNUM-01.perTrial.jsonl (scrambled control, never served)
//       and prints a coverage + equating + anti-leak summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ================================================================== *
 * THE NOTATION
 * ================================================================== */

/** The notation's base. Fixed for the bank — see the header on why it is not a per-item lever. */
export const BASE = 4;

/** Sign-value ladder: these glyphs ADD, and a run of them is order-free. */
export const SCALE_ROLES = Object.freeze({ scaleI: 1, scaleII: BASE, scaleIII: BASE * BASE });
/** Multipliers: a digit BINDS to the scale immediately after it. `1` needs no glyph (a bare scale). */
export const DIGIT_ROLES = Object.freeze({ digitII: 2, digitIII: 3 });

export const ROLES = Object.freeze([...Object.keys(SCALE_ROLES), ...Object.keys(DIGIT_ROLES)]);
export const isScale = (role) => role in SCALE_ROLES;
export const isDigit = (role) => role in DIGIT_ROLES;
export const roleValue = (role) => SCALE_ROLES[role] ?? DIGIT_ROLES[role];

/**
 * Glyph symbols. Five neutral marks, in ONE canonical order in every item of both banks, so the
 * tray never hints at the mapping. They are labels the renderer draws. Deliberately abstract:
 * anything with a counting or numeric connotation (a tally, a dot cluster) would leak an ordering
 * onto the roles before the child has induced one.
 */
export const GLYPHS = Object.freeze(['arc', 'chevron', 'crescent', 'notch', 'spiral']);

/**
 * Read a role sequence as a number.
 *
 * TOTAL by design. The generator only ever emits sequences in which every digit is followed by a
 * scale, but the ANTI-LEAK brute force applies wrong mappings, which turn scales into digits and
 * produce sequences the grammar would never emit. A partial function there would silently drop
 * attacker hypotheses and flatter the invariant, so a trailing or doubled digit falls back to its
 * own face value.
 */
export function valueOf(roles) {
  let total = 0;
  let i = 0;
  while (i < roles.length) {
    const here = roles[i];
    const next = roles[i + 1];
    if (isDigit(here) && next !== undefined && isScale(next)) {
      total += roleValue(here) * roleValue(next);
      i += 2;
    } else {
      total += roleValue(here);
      i += 1;
    }
  }
  return total;
}

/** Number of digit->scale bindings in a role sequence. */
export function bindsIn(roles) {
  let binds = 0;
  let i = 0;
  while (i < roles.length) {
    if (isDigit(roles[i]) && roles[i + 1] !== undefined && isScale(roles[i + 1])) {
      binds += 1;
      i += 2;
    } else {
      i += 1;
    }
  }
  return binds;
}

/** True when the sequence is one the grammar may emit: every digit binds to a scale after it. */
export function isWellFormed(roles) {
  for (let i = 0; i < roles.length; i += 1) {
    if (!isDigit(roles[i])) continue;
    if (roles[i + 1] === undefined || !isScale(roles[i + 1])) return false;
  }
  return roles.length > 0;
}

/* ------------------------------------------------------------------ *
 * Seeded RNG (xmur3 -> mulberry32), the same idiom every generator here uses.
 * ------------------------------------------------------------------ */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  return mulberry32(xmur3(seed)());
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function seededUuid(seed) {
  const rng = makeRng('uuid|' + seed);
  const hex = [];
  for (let i = 0; i < 32; i++) hex.push(Math.floor(rng() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round2 = (x) => Math.round(x * 100) / 100;
const round6 = (x) => Math.round(x * 1e6) / 1e6;

/* ================================================================== *
 * DIFFICULTY MODEL — from the declared levers, monotone by construction.
 *
 * §1.1(d) is why this is arithmetic over generator parameters rather than a
 * hand label: the block serves systematically different item subsets early and
 * late, so difficulty error that correlates with subset composition correlates
 * with trialIndex, and correlated error in `b` maps straight onto `lambda`.
 * Random labelling error only attenuates; structured labelling error BIASES.
 *
 * Expression length dominates because it is the ladder the learnable thing
 * unlocks (§1.3). The multiplicative binding is priced twice — once per binding
 * and once for the fact that ANY binding makes the notation order-sensitive —
 * because "these two glyphs mean something different in the other order" is the
 * step that separates a child holding the rule from one holding a lookup table.
 * ================================================================== */
export const LENGTH_LOAD = Object.freeze({ 1: 0, 2: 2.2, 3: 4.0, 4: 5.4 });
/** Load per multiplicative binding: a product to hold, not a term to add. */
const BIND_WEIGHT = 1.1;
/** Extra load once ANY binding is present, because the notation stops being order-free. */
const ORDER_WEIGHT = 1.6;
/** Load per distinct glyph beyond the first: more of the vocabulary must be held at once. */
const DISTINCT_WEIGHT = 0.8;
/** Span of the continuous distractor-nearness lever, the within-rung positioner. */
const NEARNESS_SPAN = 2.8;

export function baseScore({ length, binds, distinct }) {
  return (
    1.0 +
    LENGTH_LOAD[length] +
    BIND_WEIGHT * binds +
    ORDER_WEIGHT * (binds > 0 ? 1 : 0) +
    DISTINCT_WEIGHT * (distinct - 1)
  );
}

/** Order-sensitivity is DERIVED from the binding count, never declared independently. */
export const isOrderSensitive = (binds) => (binds > 0 ? 1 : 0);

/**
 * Every lever combination the grammar can build.
 *
 * `binds` is bounded by the number of digit->scale pairs that fit; `distinct` by how many distinct
 * glyphs a sequence of that shape can carry. A sequence with b bindings uses b digit tokens and
 * `length - b` scale tokens, so distinct is at most min(b, 2) + min(length - b, 3), and at least 1,
 * or 2 once a binding forces both a digit and a scale to be present.
 */
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const length of [1, 2, 3, 4]) {
    for (let binds = 0; binds <= Math.floor(length / 2); binds++) {
      const scales = length - binds;
      const maxDistinct = Math.min(binds, 2) + Math.min(scales, 3);
      const minDistinct = binds > 0 ? 2 : 1;
      for (let distinct = minDistinct; distinct <= maxDistinct; distinct++) {
        out.push({ length, binds, distinct });
      }
    }
  }
  return out;
})();

const ALL_BASES = ALLOWED_CONFIGS.map(baseScore);
const RAW_MIN = Math.min(...ALL_BASES);
const RAW_MAX = Math.max(...ALL_BASES) + NEARNESS_SPAN;

/** Lever tuple -> design rung on the shared 1..20 scale. */
export function difficultyFromLevers(cfg, distractorNearness) {
  const raw = baseScore(cfg) + NEARNESS_SPAN * distractorNearness;
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}

function solveNearness(cfg, targetDifficulty) {
  const rawNeeded = RAW_MIN + ((targetDifficulty - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(cfg)) / NEARNESS_SPAN, 0, 1);
}

/* ================================================================== *
 * BANDS — the developmental floor §4.3 requires.
 *
 * Li et al. (2024) found 6-7-year-olds mostly best fit by a RANDOM-RESPONSE
 * model on an information-integration structure, so §4.3 forbids multi-
 * dimensional integration at the young bands. Here the integration dimension is
 * the MULTIPLICATIVE BINDING — combining a digit with a scale is the step that
 * makes two features act on one another — so the young bands are capped on
 * `binds` as well as on length. A pure sign-value run is unidimensional
 * additive composition and stays available all the way down.
 * ================================================================== */
export const BANDS = [
  { band: 'K-1', lo: 1, hi: 4, maxLength: 2, maxBinds: 0 },
  { band: '2-3', lo: 4, hi: 8, maxLength: 3, maxBinds: 0 },
  { band: '4-5', lo: 8, hi: 12, maxLength: 4, maxBinds: 1 },
  { band: '6-8', lo: 12, hi: 20, maxLength: 4, maxBinds: 2 },
];

/** The band whose window contains a difficulty. */
export function bandFor(difficulty) {
  return BANDS.find((b) => difficulty < b.hi) ?? BANDS[BANDS.length - 1];
}

/** Declared age band, read straight off the difficulty window. */
export function ageBandsFor(difficulty) {
  return [bandFor(difficulty).band];
}

/* ================================================================== *
 * THE HIDDEN SYSTEM — a glyph->role bijection.
 *
 * `consistent` draws one and holds it for the whole bank. `perTrial` draws a
 * fresh one per item. Nothing else about the item changes with the mode.
 * ================================================================== */
export function drawSystem(seed) {
  const rng = makeRng(`system|${seed}`);
  const roles = shuffle(ROLES, rng);
  const mapping = {};
  GLYPHS.forEach((glyph, i) => {
    mapping[glyph] = roles[i];
  });
  return { systemId: `sys-${seed}`, mapping };
}

/** Glyph that means `role` under this mapping. */
function glyphFor(system, role) {
  const found = Object.keys(system.mapping).find((glyph) => system.mapping[glyph] === role);
  if (!found) throw new Error(`system ${system.systemId} has no glyph for "${role}"`);
  return found;
}

/** Every glyph->role bijection: the attacker's whole hypothesis space (5! = 120). */
export const ALL_MAPPINGS = (() => {
  const out = [];
  const walk = (i, used, acc) => {
    if (i === GLYPHS.length) {
      out.push({ ...acc });
      return;
    }
    for (const role of ROLES) {
      if (used.has(role)) continue;
      used.add(role);
      acc[GLYPHS[i]] = role;
      walk(i + 1, used, acc);
      used.delete(role);
    }
  };
  walk(0, new Set(), {});
  return out;
})();

/* ================================================================== *
 * EXPRESSION CONSTRUCTION
 * ================================================================== */

/**
 * Build a role sequence with exactly the requested length, binding count and distinct-glyph count.
 *
 * The distinct count is over GLYPHS, and the mapping is a bijection, so it is equivalently the
 * number of distinct roles — which is why it can be enforced here, on roles, and re-derived by the
 * checker from `content` without the mapping.
 */
export function buildExpression({ length, binds, distinct }, rng) {
  const scaleNames = Object.keys(SCALE_ROLES);
  const digitNames = Object.keys(DIGIT_ROLES);
  const scaleCount = length - binds;

  for (let attempt = 0; attempt < 400; attempt++) {
    // Digits first: `binds` of them, drawn with replacement from two roles.
    const digits = [];
    for (let i = 0; i < binds; i++) digits.push(digitNames[Math.floor(rng() * digitNames.length)]);
    const scales = [];
    for (let i = 0; i < scaleCount; i++) scales.push(scaleNames[Math.floor(rng() * scaleNames.length)]);

    // Lay the units out: every digit takes the scale that follows it, so a sequence is a shuffle of
    // `binds` two-token units and `scaleCount - binds` one-token units.
    if (scales.length < binds) continue;
    const units = [];
    for (let i = 0; i < binds; i++) units.push([digits[i], scales[i]]);
    for (let i = binds; i < scales.length; i++) units.push([scales[i]]);
    const roles = shuffle(units, rng).flat();

    if (roles.length !== length) continue;
    if (!isWellFormed(roles)) continue;
    if (bindsIn(roles) !== binds) continue;
    if (new Set(roles).size !== distinct) continue;
    return roles;
  }
  return null;
}

/* ================================================================== *
 * THE LINE
 *
 * The right-hand end is labelled with an expression in the same notation, so
 * the stimulus contains no Arabic numeral anywhere and the scale itself has to
 * be read out of the system. `line.max` — the NUMBER — is deliberately absent
 * from `content`: publishing it would give a brute-forcing client the equation
 * value(anchor) = max and pin part of the mapping for free.
 * ================================================================== */

/** Largest line maximum the generator will consider. Above the largest expressible item value. */
const MAX_LINE = 200;

/**
 * Shortest canonical role sequence for every value up to {@link MAX_LINE}.
 *
 * Units are added in descending value order and the reconstruction always takes the
 * largest-first path, so the anchor for a given number is one fixed sequence rather than a draw —
 * which matters because the anchor must be identical across the two arms up to relabelling.
 */
const ANCHOR_TABLE = (() => {
  const units = [];
  for (const scale of Object.keys(SCALE_ROLES)) {
    units.push({ roles: [scale], value: SCALE_ROLES[scale], cost: 1 });
    for (const digit of Object.keys(DIGIT_ROLES)) {
      units.push({
        roles: [digit, scale],
        value: DIGIT_ROLES[digit] * SCALE_ROLES[scale],
        cost: 2,
      });
    }
  }
  units.sort((a, b) => b.value - a.value || a.cost - b.cost);

  const cost = new Array(MAX_LINE + 1).fill(Infinity);
  const via = new Array(MAX_LINE + 1).fill(null);
  cost[0] = 0;
  for (let v = 1; v <= MAX_LINE; v++) {
    for (const unit of units) {
      if (unit.value > v) continue;
      const candidate = cost[v - unit.value] + unit.cost;
      if (candidate < cost[v]) {
        cost[v] = candidate;
        via[v] = unit;
      }
    }
  }

  const table = new Map();
  for (let v = 1; v <= MAX_LINE; v++) {
    if (!Number.isFinite(cost[v])) continue;
    const roles = [];
    let rest = v;
    while (rest > 0) {
      const unit = via[rest];
      roles.push(...unit.roles);
      rest -= unit.value;
    }
    table.set(v, { roles, tokens: roles.length });
  }
  return table;
})();

/** Line maxima worth considering: expressible in at most four tokens, like the expressions. */
const LINE_CANDIDATES = [...ANCHOR_TABLE.entries()]
  .filter(([, entry]) => entry.tokens <= 4)
  .map(([value]) => value)
  .sort((a, b) => a - b);

/* ================================================================== *
 * PARTIAL RULES — each wrong option a NAMED incomplete version of the system.
 *
 * §4.6 makes this a build requirement rather than a nicety: with every wrong
 * option encoding a specific partial rule, each response is classifiable, which
 * gives both a falsification test (in a real learner, errors should migrate from
 * spread-out toward the near classes) and the ordinal fallback the §4.1.4
 * Verdict-2 branch depends on. The fallback has to exist at the moment the gate
 * returns Verdict 2, not a build cycle later.
 *
 * It is also what makes `M-PAE` a genuine approximate-error signal rather than a
 * relabelled "which wrong tick": the gap between the tapped tick and the key is
 * the size of the child's decoding error in quantity space.
 *
 * `nearness` orders the failures from "almost had it" to "did not engage" and
 * the item's `distractorNearness` lever picks a slate along that axis. Every
 * label is one already registered in `item-shape.mjs`, so M-ERRTYPE / M-RULEID
 * stay computable without widening the coarse enum.
 * ================================================================== */
const FAILURES = [
  // Has the vocabulary and the additive default, has not got the binding. The near miss.
  { kind: 'additive_only', lure: 'operation_confusion', nearness: 1.0 },
  // Has the binding idea and applies it where there is no digit.
  { kind: 'over_binding', lure: 'over_application', nearness: 0.85 },
  // Has the binding idea and attaches a digit that is not written at all.
  { kind: 'phantom_bind', lure: 'over_application', nearness: 0.8 },
  // Reads the notation under the OTHER published composition regime: place-value, not sign-value.
  { kind: 'place_value_read', lure: 'inverted_rule', nearness: 0.75 },
  // Dropped a token.
  { kind: 'token_omitted', lure: 'omission', nearness: 0.6 },
  // One glyph valued as another.
  { kind: 'glyph_confusion', lure: 'one_factor_off', nearness: 0.5 },
  // Counted each glyph once, ignoring repeats.
  { kind: 'repeats_ignored', lure: 'wrong_count', nearness: 0.4 },
  // Read the first unit and stopped.
  { kind: 'first_unit_only', lure: 'first_step_only', nearness: 0.25 },
  // Took the biggest glyph and ignored the rest.
  { kind: 'largest_glyph_only', lure: 'incomplete', nearness: 0.2 },
  // Counted the glyphs instead of valuing them — the "longer means bigger" heuristic, made visible.
  { kind: 'token_count', lure: 'surface_match', nearness: 0.1 },
  // Tapped the end of the line.
  { kind: 'anchor_echo', lure: 'anchor', nearness: 0.0 },
];
const NEARNESS = Object.fromEntries(FAILURES.map((f) => [f.kind, f.nearness]));
const LURE_OF = Object.fromEntries(FAILURES.map((f) => [f.kind, f.lure]));

/**
 * Every partial rule this expression admits, as {ruleId, kind, value, note}.
 *
 * `lineMax` is a parameter because one rule — tapping the end of the line — is a property of the
 * line rather than of the expression, and it is the rule that keeps "tap the right-hand end" from
 * being a free elimination.
 */
export function partialRules(roles, lineMax) {
  const out = [];
  const label = (rs) => rs.join('+');

  if (bindsIn(roles) > 0) {
    out.push({
      ruleId: `additive:${label(roles)}`,
      kind: 'additive_only',
      value: roles.reduce((sum, r) => sum + roleValue(r), 0),
      note: 'added every glyph instead of multiplying across the binding',
    });
  }

  for (let i = 0; i + 1 < roles.length; i++) {
    if (!isScale(roles[i]) || !isScale(roles[i + 1])) continue;
    const bound = roles.slice();
    const product = roleValue(bound[i]) * roleValue(bound[i + 1]);
    const rest = roles.filter((_, j) => j !== i && j !== i + 1);
    out.push({
      ruleId: `overbind@${i}:${label(roles)}`,
      kind: 'over_binding',
      value: product + valueOf(rest),
      note: `multiplied glyphs ${i + 1} and ${i + 2}, which are not a binding`,
    });
  }

  // A bare scale is one no digit is bound to; attaching a phantom digit to it is the mirror image
  // of `additive_only` — the binding rule over-applied instead of missed — and it is the only
  // over-estimating failure available at length 1, which is what keeps key rank balanceable there.
  for (let i = 0; i < roles.length; i++) {
    if (!isScale(roles[i])) continue;
    if (i > 0 && isDigit(roles[i - 1])) continue;
    for (const digit of Object.keys(DIGIT_ROLES)) {
      const grown = roles.slice();
      grown.splice(i, 0, digit);
      out.push({
        ruleId: `phantom@${i}=${digit}:${label(grown)}`,
        kind: 'phantom_bind',
        value: valueOf(grown),
        note: `multiplied glyph ${i + 1} by a digit that is not written`,
      });
    }
  }

  if (roles.length >= 2) {
    let place = 0;
    for (let i = 0; i < roles.length; i++) {
      place += roleValue(roles[i]) * BASE ** (roles.length - 1 - i);
    }
    out.push({
      ruleId: `placevalue:${label(roles)}`,
      kind: 'place_value_read',
      value: place,
      note: 'read the notation as place-value, weighting each glyph by its position',
    });
  }

  for (let i = 0; i < roles.length; i++) {
    const dropped = roles.filter((_, j) => j !== i);
    if (dropped.length === 0) continue;
    out.push({
      ruleId: `drop@${i}:${label(dropped)}`,
      kind: 'token_omitted',
      value: valueOf(dropped),
      note: `skipped glyph ${i + 1}`,
    });
  }

  for (let i = 0; i < roles.length; i++) {
    for (const role of ROLES) {
      if (role === roles[i]) continue;
      const swapped = roles.slice();
      swapped[i] = role;
      out.push({
        ruleId: `misread@${i}=${role}:${label(swapped)}`,
        kind: 'glyph_confusion',
        value: valueOf(swapped),
        note: `read glyph ${i + 1} as a different glyph`,
      });
    }
  }

  if (new Set(roles).size < roles.length) {
    const unique = [...new Set(roles)];
    out.push({
      ruleId: `unique:${label(unique)}`,
      kind: 'repeats_ignored',
      value: valueOf(unique),
      note: 'counted each different glyph once and ignored the repeats',
    });
  }

  if (roles.length >= 2) {
    const firstUnit = isDigit(roles[0]) ? roles.slice(0, 2) : roles.slice(0, 1);
    if (firstUnit.length < roles.length) {
      out.push({
        ruleId: `firstUnit:${label(firstUnit)}`,
        kind: 'first_unit_only',
        value: valueOf(firstUnit),
        note: 'read the first part of the expression and stopped',
      });
    }
    out.push({
      ruleId: `largest:${label(roles)}`,
      kind: 'largest_glyph_only',
      value: Math.max(...roles.map(roleValue)),
      note: 'took the biggest glyph and ignored the rest',
    });
    out.push({
      ruleId: `count:${roles.length}`,
      kind: 'token_count',
      value: roles.length,
      note: 'counted the glyphs instead of reading their values',
    });
  }

  out.push({
    ruleId: `anchor:${lineMax}`,
    kind: 'anchor_echo',
    value: lineMax,
    note: 'tapped the end of the line',
  });

  return out;
}

/* ================================================================== *
 * ANTI-LEAK: what a client can compute from `content` alone.
 * ================================================================== */

/**
 * For every one of the 120 glyph->role relabellings, the ratio the expression would sit at.
 *
 * This IS the client's view of the item: it sees the expression and the anchor as glyph strings and
 * the ticks as ratios, and everything else it can compute it can compute this way. Returned as a
 * map from ratio (rounded to the tick grid) to the number of mappings that produce it, because the
 * strongest attacker is not "which options survive" but "which surviving option has the most
 * mappings behind it".
 */
export function relabelRatioSupport(expressionGlyphs, anchorGlyphs) {
  const support = new Map();
  for (const mapping of ALL_MAPPINGS) {
    const exprRoles = expressionGlyphs.map((g) => mapping[g]);
    const anchorRoles = anchorGlyphs.map((g) => mapping[g]);
    const anchorValue = valueOf(anchorRoles);
    if (anchorValue <= 0) continue;
    const ratio = round6(valueOf(exprRoles) / anchorValue);
    support.set(ratio, (support.get(ratio) ?? 0) + 1);
  }
  return support;
}

/**
 * The same brute force, computed on ROLE sequences and memoised.
 *
 * The two agree, and the reason is worth stating because it is also the reason the anti-leak
 * profile is identical in both arms: the glyph strings are the true mapping applied to the roles,
 * and composing the true mapping with each of the 120 relabellings runs over the same 120
 * relabellings again. So the support map depends on the role sequences alone — never on which
 * glyphs happen to spell them, and therefore never on the persistence mode. The generator uses this
 * form because it is cheap; `check-QUANT-GLYPHNUM-01.mjs` deliberately uses the slow honest one,
 * built from `content` and nothing else, so the equivalence is checked rather than assumed.
 */
const ROLE_PERMUTATIONS = (() => {
  const out = [];
  const walk = (i, used, acc) => {
    if (i === ROLES.length) {
      out.push({ ...acc });
      return;
    }
    for (const role of ROLES) {
      if (used.has(role)) continue;
      used.add(role);
      acc[ROLES[i]] = role;
      walk(i + 1, used, acc);
      used.delete(role);
    }
  };
  walk(0, new Set(), {});
  return out;
})();

const ROLE_SUPPORT_CACHE = new Map();
function relabelRatioSupportForRoles(exprRoles, anchorRoles) {
  const cacheKey = `${exprRoles.join('+')}|${anchorRoles.join('+')}`;
  const hit = ROLE_SUPPORT_CACHE.get(cacheKey);
  if (hit) return hit;
  const support = new Map();
  for (const permutation of ROLE_PERMUTATIONS) {
    const anchorValue = valueOf(anchorRoles.map((r) => permutation[r]));
    if (anchorValue <= 0) continue;
    const ratio = round6(valueOf(exprRoles.map((r) => permutation[r])) / anchorValue);
    support.set(ratio, (support.get(ratio) ?? 0) + 1);
  }
  ROLE_SUPPORT_CACHE.set(cacheKey, support);
  return support;
}

/**
 * How far the slate an item actually carries sits from the nearness its difficulty lever declares.
 *
 * Reported rather than asserted: the layout search trades nearness fidelity for anti-leak margin,
 * and the honest question is not whether the trade happened but whether what it cost TRENDS with
 * difficulty. It is the trend, not the magnitude, that §1.1(d) says maps onto lambda.
 */
export function realisedNearnessError(item) {
  const declared = item.provenance.levers.distractorNearness;
  const wrong = Object.entries(item.answer.strategyTrace).filter(([, t]) => t.kind !== 'correct');
  const total = wrong.reduce((sum, [, t]) => sum + Math.abs(NEARNESS[t.kind] - declared), 0);
  return total / wrong.length;
}

/** Options a brute-forcing client cannot rule out, with how many mappings back each. */
export function viableOptions(options, expressionGlyphs, anchorGlyphs) {
  const support = relabelRatioSupport(expressionGlyphs, anchorGlyphs);
  return options
    .map((o) => ({ key: o.key, mappings: support.get(round6(o.ratio)) ?? 0 }))
    .filter((o) => o.mappings > 0);
}

/* ================================================================== *
 * ONE ITEM
 * ================================================================== */

/**
 * Generate ONE structured BankItem.
 *
 * @param {{length,binds,distinct,distractorNearness,keyRank,
 *          systemPersistence,systemSeed,seed}} lever
 */
export function genItem({
  length,
  binds,
  distinct,
  distractorNearness,
  keyRank,
  systemPersistence,
  systemSeed,
  seed,
}) {
  if (systemPersistence !== 'consistent' && systemPersistence !== 'perTrial') {
    throw new Error(`systemPersistence must be consistent|perTrial, got "${systemPersistence}"`);
  }
  const rng = makeRng(seed);

  const system =
    systemPersistence === 'consistent' ? drawSystem(systemSeed) : drawSystem(`${systemSeed}|${seed}`);

  // Everything below is drawn from the levers and the seed, never from the mode. That is what
  // equates the two banks: both arms serve the same values, the same key, the same key rank and the
  // same difficulty, and differ only in which glyph symbols spell them.
  let built = null;
  for (let attempt = 0; attempt < 60 && built === null; attempt++) {
    const roles = buildExpression({ length, binds, distinct }, rng);
    if (roles === null) continue;
    built = layOutItem(roles, { distractorNearness, keyRank });
  }
  if (built === null) {
    throw new Error(
      `no admissible line/slate for length=${length} binds=${binds} distinct=${distinct} ` +
        `rank=${keyRank} (seed ${seed})`,
    );
  }

  const { roles, lineMax, anchorRoles, options, slot } = built;
  const trueValue = valueOf(roles);
  const optionKeys = ['A', 'B', 'C', 'D', 'E'];

  const expressionGlyphs = roles.map((role) => glyphFor(system, role));
  const anchorGlyphs = anchorRoles.map((role) => glyphFor(system, role));

  const distractorRationales = {};
  const strategyTrace = {};
  const optionValues = {};
  optionKeys.forEach((optionKey, i) => {
    optionValues[optionKey] = options[i].value;
    const rule = options[i].rule;
    if (rule === null) {
      distractorRationales[optionKey] = {
        lure: 'correct',
        ruleId: `full:${roles.join('+')}`,
        note: 'every glyph read at its own value, with each digit multiplying the scale after it',
      };
      strategyTrace[optionKey] = { ruleId: `full:${roles.join('+')}`, kind: 'correct' };
      return;
    }
    distractorRationales[optionKey] = {
      lure: LURE_OF[rule.kind],
      ruleId: rule.ruleId,
      partialRuleKind: rule.kind,
      note: rule.note,
    };
    strategyTrace[optionKey] = { ruleId: rule.ruleId, kind: rule.kind };
  });

  const cfg = { length, binds, distinct };
  const difficulty = round2(difficultyFromLevers(cfg, distractorNearness));

  // The tolerance that makes `pae <= tolerance` mean "tapped the keyed tick" and nothing else:
  // strictly less than half the smallest gap between neighbouring ticks.
  const gaps = [];
  for (let i = 1; i < options.length; i++) gaps.push(options[i].ratio - options[i - 1].ratio);
  const tolerance = round6(Math.min(...gaps) / 2.5);

  return {
    itemId: seededUuid(`${systemPersistence}|${seed}`),
    typeCode: 'QUANT-GLYPHNUM-01',
    domain: 'quantitative',
    difficulty, // FLOAT 1..20 — DESIGN rung from the levers, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/QUANT-GLYPHNUM-01.html',
    content: {
      typeCode: 'QUANT-GLYPHNUM-01',
      // The full vocabulary, always in canonical order, so the tray leaks nothing in either mode.
      glyphTray: GLYPHS.slice(),
      // Surface glyphs only. Which role each glyph plays is server-only.
      expression: expressionGlyphs,
      // The line's numeric maximum is NOT here on purpose — see the header.
      line: { minValue: 0, maxExpression: anchorGlyphs },
      options: options.map((option, i) => ({ key: optionKeys[i], ratio: round6(option.ratio) })),
      // What the renderer must post back for the shipped placement verifier to grade the trial.
      responseField: 'placedRatio',
    },
    answer: {
      correctKey: optionKeys[slot],
      // The `placement_tolerance` contract: both verifier tiers read exactly these two fields.
      targetRatio: round6(trueValue / lineMax),
      tolerance,
      // SERVER-ONLY: the system itself. Shipping this would make every item a lookup.
      system: { systemId: system.systemId, mapping: { ...system.mapping } },
      expressionRoles: roles.slice(),
      anchorRoles: anchorRoles.slice(),
      lineMax,
      trueValue,
      optionValues,
      // §4.6's per-trial strategy trace: which partial rule each option is consistent with.
      strategyTrace,
      strategyTraceRules: FAILURES.map((f) => f.kind),
      distractorRationales,
    },
    scoring: {
      mode: 'deterministic_key',
      // Dispatches to the SHIPPED generic placement verifier in both tiers, which returns M-PAE.
      rule: 'placement_tolerance',
      description:
        'pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, ' +
        'which the generator sets below half the smallest gap between neighbouring ticks so the ' +
        'band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better).',
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'quant-glyphnum-01-grammar@1',
      seed,
      levers: {
        length,
        binds,
        distinct,
        // Derived from `binds`, recorded so the checker re-derives difficulty from the levers alone
        // without re-deriving the derivation.
        orderSensitive: isOrderSensitive(binds),
        // The control condition, recorded in provenance rather than content: the renderer must not
        // know which arm it is serving, and `servedItemSchema` omits provenance (§4.1.1).
        systemPersistence,
        systemSeed,
        keyRank,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        distractorNearness,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

/**
 * Choose the line maximum and the four distractors for one role sequence.
 *
 * Returns `null` when no combination satisfies every constraint, so the caller can redraw the
 * expression rather than ship an item that fails an invariant. The constraints, in the order they
 * bind:
 *
 *   * exactly `keyRank` distractor values below the key and `4 - keyRank` above, so key rank is
 *     controllable and can be balanced within each expression length;
 *   * all five values distinct and inside (0, lineMax], so every tick is a real position;
 *   * `|ratio - targetRatio| <= 0.5` for every option, which keeps M-PAE inside the [0, 0.5] range
 *     the metric registry declares;
 *   * at least two options survive a brute force over all 120 relabellings, and at least one
 *     SURVIVING DISTRACTOR is backed by at least as many mappings as the key.
 */
function layOutItem(roles, { distractorNearness, keyRank }) {
  const trueValue = valueOf(roles);
  let best = null;

  for (const lineMax of preferredLineMaxima(trueValue)) {
    const anchor = ANCHOR_TABLE.get(lineMax);
    if (!anchor) continue;

    const seen = new Set([trueValue]);
    const candidates = [];
    for (const rule of partialRules(roles, lineMax)) {
      if (!Number.isInteger(rule.value)) continue;
      if (rule.value <= 0 || rule.value > lineMax) continue;
      if (seen.has(rule.value)) continue;
      if (Math.abs(rule.value - trueValue) / lineMax > 0.5) continue;
      seen.add(rule.value);
      candidates.push(rule);
    }

    const support = relabelRatioSupportForRoles(roles, anchor.roles);
    const backedValue = (value) => (support.get(round6(value / lineMax)) ?? 0) > 0;
    const order = byNearnessTo(distractorNearness, backedValue);
    const below = candidates.filter((c) => c.value < trueValue).sort(order);
    const above = candidates.filter((c) => c.value > trueValue).sort(order);
    if (below.length < keyRank || above.length < 4 - keyRank) continue;

    // The anchor and the expression are read under the SAME mapping, so the attacker's hypothesis
    // space is over the pair, and it moves with the LINE as well as with the slate. Scoring lines
    // against each other rather than taking the first admissible one is what turns invariant 1 from
    // a floor the item scrapes past into the quantity the layout is chosen to maximise.
    let tried = 0;
    for (const chosen of slateChoices(below, above, keyRank, backedValue)) {
      if (tried++ >= 30) break; // the swap fan-out is quadratic; thirty is enough to find a maximum
      // Each option carries the rule that put it there, so the rationale and the tick can never
      // drift apart: the slate is ordered by nearness and the line is ordered by magnitude, and
      // pairing them by index rather than by object is exactly the mismatch the checker caught.
      const entries = [
        ...chosen.map((rule) => ({ value: rule.value, rule })),
        { value: trueValue, rule: null },
      ].sort((x, y) => x.value - y.value);
      const values = entries.map((e) => e.value);
      const slot = entries.findIndex((e) => e.rule === null);
      if (slot !== keyRank) continue;

      const backing = values.map((v) => support.get(round6(v / lineMax)) ?? 0);
      // Nearness fidelity, kept in the score so a layout cannot buy anti-leak margin with a slate
      // that no longer sits where the difficulty lever says it does. §1.1(d): a stated difficulty
      // the item does not honour is structured labelling error, and structured error biases lambda.
      const nearnessCost =
        chosen.reduce((sum, c) => sum + Math.abs(NEARNESS[c.kind] - distractorNearness), 0) /
        chosen.length;
      // Anti-leak first, nearness as the tie-break. The weight is deliberately below the smallest
      // step the attacker term can take (1/4 - 1/5 = 0.05), so nearness can only choose between
      // layouts the brute force already finds equally uninformative.
      const attackerCost = bestAttackerAccuracy(backing, slot);
      const score = -attackerCost - 0.02 * nearnessCost;
      if (best === null || score > best.score) {
        best = {
          score,
          survivors: backing.filter((n) => n > 0).length,
          attackerCost,
          nearnessCost,
          layout: {
            roles,
            lineMax,
            anchorRoles: anchor.roles,
            options: entries.map((e) => ({ value: e.value, ratio: e.value / lineMax, rule: e.rule })),
            slot,
          },
        };
      }
    }
    // Chance is the floor: five evenly-backed survivors means the brute force returns the whole
    // option set with nothing to choose between its members. Nothing is left to gain by trying
    // longer lines once an item reaches it.
    if (best !== null && best.attackerCost <= 0.2 + 1e-9) break;
  }
  return best === null ? null : best.layout;
}

/**
 * What the best content-only attacker scores on one item, given how many of the 120 relabellings
 * back each option and which option is the key.
 *
 * Three strategies, because an attacker picks whichever works and reporting only the weakest would
 * be choosing one's own evidence:
 *
 *   uniform     guess evenly among the options that survive the brute force;
 *   modal       take the survivor the most relabellings point at;
 *   anti-modal  take the survivor the fewest point at, which beats chance exactly when a generator
 *               has over-corrected by pushing the key away from being modal.
 *
 * The layout search minimises the maximum of the three, which drives them together: they coincide
 * at 1/5 when every option survives and all are equally backed, and that is the only configuration
 * in which the brute force returns no information at all.
 */
export function bestAttackerAccuracy(backing, keyIndex) {
  const survivorIndices = backing.map((n, i) => [n, i]).filter(([n]) => n > 0);
  if (survivorIndices.length === 0) return 1;
  const keySurvives = backing[keyIndex] > 0;
  const uniform = keySurvives ? 1 / survivorIndices.length : 0;
  const pick = (target) => {
    const tied = survivorIndices.filter(([n]) => n === target);
    return tied.some(([, i]) => i === keyIndex) ? 1 / tied.length : 0;
  };
  const modal = pick(Math.max(...survivorIndices.map(([n]) => n)));
  const antiModal = pick(Math.min(...survivorIndices.map(([n]) => n)));
  return Math.max(uniform, modal, antiModal);
}

/**
 * Order candidate rules by how close their failure class sits to the requested nearness, breaking
 * near-ties toward a value the brute force can also reach.
 *
 * The 0.12 tie-break is smaller than the smallest gap between adjacent nearness classes, so it can
 * only reorder rules that were already close on the difficulty lever. Anti-leak buys nothing at the
 * expense of the item sitting where its stated difficulty says it does.
 */
function byNearnessTo(target, backedValue) {
  const cost = (rule) =>
    Math.abs(NEARNESS[rule.kind] - target) - (backedValue(rule.value) ? 0.12 : 0);
  return (a, b) => cost(a) - cost(b) || (a.ruleId < b.ruleId ? -1 : 1);
}

/**
 * Slates to try, best first.
 *
 * The first is the plain nearness-optimal pick. The rest swap one distractor at a time for a
 * further-out alternative on the same side of the key, which is how an item whose best slate is
 * weak on the anti-leak invariant is improved without abandoning the difficulty lever: the swap
 * costs some nearness fidelity, which the caller prices, and nothing else.
 *
 * The only slate this refuses outright is one no relabelling can reach at all, because that is
 * invariant 1 — with the key always reachable under the true mapping, one reachable distractor is
 * what makes two options survive the brute force.
 */
function* slateChoices(below, above, keyRank, backedValue) {
  const nBelow = keyRank;
  const nAbove = 4 - keyRank;
  const ok = (chosen) => chosen.some((c) => backedValue(c.value));

  const baseBelow = below.slice(0, nBelow);
  const baseAbove = above.slice(0, nAbove);
  if (baseBelow.length !== nBelow || baseAbove.length !== nAbove) return;

  const first = [...baseBelow, ...baseAbove];
  if (ok(first)) yield first;

  for (let slot = 0; slot < nBelow; slot++) {
    for (let alt = nBelow; alt < below.length; alt++) {
      const swapped = baseBelow.slice();
      swapped[slot] = below[alt];
      const chosen = [...swapped, ...baseAbove];
      if (ok(chosen)) yield chosen;
    }
  }
  for (let slot = 0; slot < nAbove; slot++) {
    for (let alt = nAbove; alt < above.length; alt++) {
      const swapped = baseAbove.slice();
      swapped[slot] = above[alt];
      const chosen = [...baseBelow, ...swapped];
      if (ok(chosen)) yield chosen;
    }
  }
}

/**
 * Line maxima worth trying for a given key value, best first.
 *
 * Prefer a line the key actually uses — a maximum far above the key would push every tick into the
 * left-hand sliver and make the response a crowding judgement instead of a magnitude one — and,
 * among those, prefer a short anchor, because the anchor is itself an expression the child has to
 * read.
 */
function preferredLineMaxima(trueValue) {
  // The upper bound is generous on purpose. Keeping every option inside the metric registry's
  // [0, 0.5] range for M-PAE means the line has to be at least twice the widest error the slate
  // carries, and at small key values the widest available partial-rule error is many times the key
  // itself — so a line that merely "looks well used" cannot always be had, and the range contract
  // is worth more than the aesthetics.
  return LINE_CANDIDATES.filter((v) => v >= trueValue && v <= Math.max(64, trueValue * 4)).sort(
    (a, b) => {
      const ra = trueValue / a;
      const rb = trueValue / b;
      // 0.55 keeps the key off both ends of the line without pinning it to the exact middle, which
      // would itself be a content-derivable tell.
      const score = (r, v) => Math.abs(r - 0.55) + 0.05 * (ANCHOR_TABLE.get(v)?.tokens ?? 9);
      return score(ra, a) - score(rb, b) || a - b;
    },
  );
}

/* ================================================================== *
 * BANK BUILDER
 *
 * Fills every 0.5-point rung of the 1..20 scale with >=perRung items.
 *
 * `perRung` defaults to 12 rather than FLU-OPCHAIN-01's 6, and the reason is a
 * measured one rather than a preference. STAGE2_BANK_RECOVERY_MEASUREMENT §5
 * found that `FLU-OPCHAIN-01` tracks the harness's idealised grid to about 45
 * trials and then falls behind it, and conjectured pool depth per rung as the
 * cause: the ideal grid carries 12 items per 0.5-point rung and that bank
 * carries 6. That conjecture was recorded as untested. Building at 12 makes this
 * bank density-matched to the ideal grid, so the conjecture becomes a comparison
 * anyone can run rather than a paragraph, and it is the cheap way to extend the
 * ceiling — by item density rather than by deepening the composition, which
 * would push the top rungs past what the band ladder allows.
 *
 * Key RANK is round-robined WITHIN each expression length, not across the bank.
 * Round-robin across the bank balances the marginal distribution while leaving
 * "longer expression, further right" intact, and that correlation is derivable
 * from `content` with no knowledge of the system at all.
 * ================================================================== */
export function buildBank({ systemPersistence, perRung = 12, systemSeed = 'QUANT-GLYPHNUM-01|v1' }) {
  const items = [];
  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));

  const rankCursor = new Map();

  for (const rung of rungs) {
    // The rung window is clipped to its BAND's window as well as to +/-0.24, so an item cannot land
    // a rounding-width across a band edge and carry the neighbouring band's caps with it. The
    // checker caps by the item's own difficulty, not by the rung it was aimed at, and without this
    // clip the two disagree at every boundary rung.
    const band = bandFor(rung);
    const lo = Math.max(1, rung - 0.24, band.lo);
    const hi = Math.min(20, rung + 0.24, band.band === '6-8' ? 20 : band.hi - 0.01);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      if (cfg.length > band.maxLength) continue; // §4.3 developmental floor
      if (cfg.binds > band.maxBinds) continue;
      const a = Math.max(lo, difficultyFromLevers(cfg, 0));
      const b = Math.min(hi, difficultyFromLevers(cfg, 1));
      if (b > a + 1e-6) segments.push({ cfg, lo: a, hi: b });
    }
    if (segments.length === 0) {
      throw new Error(`no lever config reaches rung ${rung} under the ${band.band} caps`);
    }

    const stride = Math.max(1, Math.floor(segments.length / perRung));
    const hits = segments.map(() => 0);
    for (let i = 0; i < perRung; i++) hits[(i * stride) % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perRung; i++) {
      const index = (i * stride) % segments.length;
      const segment = segments[index];
      const li = localSeen[index]++;
      const target = segment.lo + (segment.hi - segment.lo) * ((li + 0.5) / hits[index]);
      const nearness = solveNearness(segment.cfg, target);
      const c = segment.cfg;
      const cursor = rankCursor.get(c.length) ?? 0;
      rankCursor.set(c.length, cursor + 1);
      const seed = `QUANT-GLYPHNUM-01|rung=${rung}|i=${i}|L${c.length}B${c.binds}D${c.distinct}`;
      items.push(
        genItem({
          ...c,
          distractorNearness: nearness,
          keyRank: cursor % 5,
          systemPersistence,
          systemSeed,
          seed,
        }),
      );
    }
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint: write BOTH banks and print coverage + equating + leak summary.
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

/**
 * Where each arm's bank file lives. The consistent arm takes the bare code inside the served
 * directory so the loader and the sync script find it by the ordinary rule; the scrambled arm is
 * written outside that directory entirely, keeping its arm suffix so a stray copy is recognisable.
 */
export const BANK_PATHS = {
  consistent: '../banks/QUANT-GLYPHNUM-01.jsonl',
  perTrial: '../control-banks/QUANT-GLYPHNUM-01.perTrial.jsonl',
};

if (isMain()) {
  const perRung = Number(process.env.PER_RUNG || 12);
  const modes = ['consistent', 'perTrial'];
  const banks = {};

  for (const mode of modes) {
    const items = buildBank({ systemPersistence: mode, perRung });
    banks[mode] = items;
    const outPath = resolve(__dirname, BANK_PATHS[mode]);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, serializeBank(items));
    console.log(`QUANT-GLYPHNUM-01 (${mode}): ${items.length} items -> ${outPath}`);
  }

  const reference = banks.consistent;
  const rungCounts = new Map();
  for (const it of reference) {
    const rung = round2(Math.round(it.difficulty * 2) / 2);
    rungCounts.set(rung, (rungCounts.get(rung) ?? 0) + 1);
  }
  const short = [...rungCounts].filter(([, n]) => n < 5).map(([r]) => r);
  const diffs = reference.map((it) => it.difficulty);
  console.log(
    `\ndifficulty span: ${round2(Math.min(...diffs))} .. ${round2(Math.max(...diffs))} ` +
      `over ${rungCounts.size} distinct 0.5-point rungs`,
  );
  console.log(short.length ? `SHORT RUNGS (<5): ${short.join(',')}` : 'all 0.5-point rungs >=5 OK');

  const keyCounts = {};
  for (const it of reference)
    keyCounts[it.answer.correctKey] = (keyCounts[it.answer.correctKey] ?? 0) + 1;
  console.log(
    `key positions (all items are 5-option, so one stratum): ` +
      Object.entries(keyCounts)
        .sort()
        .map(([k, n]) => `${k}:${n} (${((100 * n) / reference.length).toFixed(1)}%)`)
        .join('  '),
  );

  const byLength = new Map();
  for (const it of reference) {
    const len = it.provenance.levers.length;
    const row = byLength.get(len) ?? {};
    row[it.answer.correctKey] = (row[it.answer.correctKey] ?? 0) + 1;
    byLength.set(len, row);
  }
  console.log(
    `key rank BY EXPRESSION LENGTH (closes "longer means further right"):\n` +
      [...byLength]
        .sort((a, b) => a[0] - b[0])
        .map(
          ([len, row]) =>
            `  length ${len}: ` +
            ['A', 'B', 'C', 'D', 'E'].map((k) => `${k}:${row[k] ?? 0}`).join(' '),
        )
        .join('\n'),
  );

  const bandCounts = {};
  for (const it of reference) {
    const b = it.ageBands.join('+');
    bandCounts[b] = (bandCounts[b] ?? 0) + 1;
  }
  console.log(
    `bands served: ${Object.entries(bandCounts)
      .sort()
      .map(([b, n]) => `${b}:${n}`)
      .join('  ')}`,
  );

  // Anti-leak, reported as a determinacy COUNT and as a graded attacker accuracy (E-075/E-076),
  // sliced by difficulty because a leak concentrated in one slice is invisible in a bank mean and
  // the block serves different slices to different children.
  const SLICES = [
    [1, 5],
    [5, 10],
    [10, 15],
    [15, 20.01],
  ];
  const slice = SLICES.map(([lo, hi]) => ({
    lo,
    hi,
    n: 0,
    sole: 0,
    survivors: 0,
    uniform: 0,
    modal: 0,
    antiModal: 0,
  }));
  let paeMax = 0;
  for (const it of reference) {
    const row = slice.find((s) => it.difficulty >= s.lo && it.difficulty < s.hi);
    const survivors = viableOptions(
      it.content.options,
      it.content.expression,
      it.content.line.maxExpression,
    );
    const backing = it.content.options.map(
      (o) => survivors.find((s) => s.key === o.key)?.mappings ?? 0,
    );
    const keyIndex = it.content.options.findIndex((o) => o.key === it.answer.correctKey);
    const counts = survivors.map((s) => s.mappings);
    const pick = (target) => {
      const tied = survivors.filter((s) => s.mappings === target);
      return tied.some((s) => s.key === it.answer.correctKey) ? 1 / tied.length : 0;
    };
    row.n += 1;
    row.survivors += survivors.length;
    if (survivors.length < 2) row.sole += 1;
    row.uniform += 1 / survivors.length;
    row.modal += pick(Math.max(...counts));
    row.antiModal += pick(Math.min(...counts));
    if (backing[keyIndex] === 0) throw new Error(`key not reachable under the true mapping`);
    for (const option of it.content.options) {
      paeMax = Math.max(paeMax, Math.abs(option.ratio - it.answer.targetRatio));
    }
  }
  const n = reference.length;
  const sum = (f) => slice.reduce((a, s) => a + f(s), 0);
  console.log(
    `\nanti-leak (all ${ALL_MAPPINGS.length} glyph->role relabellings brute-forced per item):\n` +
      `  items where only ONE option survives: ${sum((s) => s.sole)} / ${n}\n` +
      `  mean surviving options: ${(sum((s) => s.survivors) / n).toFixed(2)}\n` +
      `  best content-only attacker: ${(
        (100 *
          Math.max(
            sum((s) => s.uniform),
            sum((s) => s.modal),
            sum((s) => s.antiModal),
          )) /
        n
      ).toFixed(1)}% against a 20.0% chance floor`,
  );
  console.log('  | difficulty | n | mean survivors | uniform | modal | anti-modal | nearness err |');
  for (const s of slice) {
    const errors = reference
      .filter((it) => it.difficulty >= s.lo && it.difficulty < s.hi)
      .map((it) => realisedNearnessError(it));
    console.log(
      `  | ${s.lo}-${s.hi === 20.01 ? 20 : s.hi} | ${s.n} | ${(s.survivors / s.n).toFixed(2)} | ` +
        `${((100 * s.uniform) / s.n).toFixed(1)}% | ${((100 * s.modal) / s.n).toFixed(1)}% | ` +
        `${((100 * s.antiModal) / s.n).toFixed(1)}% | ` +
        `${(errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(3)} |`,
    );
  }
  console.log(
    '  The nearness column is |realised - declared| on the within-rung distractor lever. It is a\n' +
      '  cost of the anti-leak search and it matters only if it TRENDS with difficulty: random\n' +
      '  labelling error attenuates lambda, error correlated with which items the block serves late\n' +
      '  biases it (§1.1(d)).',
  );
  console.log(`  worst M-PAE over every item x option: ${paeMax.toFixed(3)} (registry range max 0.5)`);

  // Equating (U3(g)): the two banks must differ ONLY in persistence.
  const a = banks.consistent;
  const b = banks.perTrial;
  const mismatches = [];
  if (a.length !== b.length) mismatches.push(`item counts ${a.length} vs ${b.length}`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].difficulty !== b[i].difficulty) mismatches.push(`item ${i}: difficulty`);
    if (a[i].answer.correctKey !== b[i].answer.correctKey) mismatches.push(`item ${i}: key slot`);
    if (a[i].content.options.length !== b[i].content.options.length)
      mismatches.push(`item ${i}: option count`);
    if (JSON.stringify(a[i].content.options) !== JSON.stringify(b[i].content.options))
      mismatches.push(`item ${i}: option ratios`);
    if (a[i].answer.expressionRoles.join('+') !== b[i].answer.expressionRoles.join('+'))
      mismatches.push(`item ${i}: role sequence`);
    if (a[i].answer.lineMax !== b[i].answer.lineMax) mismatches.push(`item ${i}: line maximum`);
  }
  const distinctSystems = new Set(b.map((it) => it.answer.system.systemId)).size;
  console.log(
    `\nequating: ${mismatches.length === 0 ? 'the two banks match on every scored property' : `MISMATCH — ${mismatches.slice(0, 5).join('; ')}`}`,
  );
  console.log(
    `persistence: consistent bank uses ${new Set(a.map((it) => it.answer.system.systemId)).size} system(s); ` +
      `perTrial bank uses ${distinctSystems} (one per item)`,
  );
  console.log(
    '\nNOT GATED. Gate B needs ~128 real children (§4.1.3); no synthetic run substitutes. The\n' +
      'consistent arm is the live bank; the scrambled arm lives outside banks/ and is never served.',
  );
}
