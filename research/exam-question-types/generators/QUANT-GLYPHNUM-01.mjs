// QUANT-GLYPHNUM-01 "Alien Numbers" — DUAL-MODE TEMPLATE generator (Bucket A: grammar).
//
// Rebuilt to STAGE2_REDESIGN_SPEC.md §5.1 under D-211. Serves R5, R6, R7, R8, R10, H1, H6, H10.
// Supersedes the five-option build this file used to hold; STAGE2_QUESTION_DESIGN.md §3.2 is
// superseded for this type by §5.1 of the redesign spec, and §1.2 / §4.1.1 / §4.3 still bind.
//
// ---------------------------------------------------------------------------
// THE TASK
//
// An invented PLACE-VALUE numeral system in a non-decimal base. A numeral of one to four marks sits
// above a number line whose right-hand end is labelled with another numeral in the same system. The
// child DRAGS A SLIDER to where the numeral belongs. There are no options.
//
// Left-to-right significance is retained — leftmost mark most significant. It is the one convention
// that is genuinely intuitive and carries no information worth measuring; reversing it would test
// convention-breaking rather than quantitative reasoning (§5.1).
//
// ---------------------------------------------------------------------------
// WHY BASE 6, AND WHY THE DIGIT SET HAS NO ZERO
//
// Three constraints pick the base, and only one value satisfies all three.
//
// 1. NON-DECIMAL, and not a base-10 landmark. Weiers, Gilmore & Inglis (2025) used base 3
//    explicitly "to avoid the confound of familiarity with base-10"; 6 shares that property.
//
// 2. EVERY DIGIT EQUAL IN INTRINSIC COST (§3 of the redesign spec). A zero digit is not equal in
//    cost to a non-zero one — "this mark means nothing is here" is a different and famously harder
//    inference than "this mark means three" — so a system containing zero prices difficulty partly
//    on WHICH digit was drawn, which is exactly what §3 forbids. The digit set is therefore
//    {1,2,3,4,5}: zero-free, so every numeral this generator writes has every place occupied, and
//    every digit glyph is one lookup and nothing more.
//
//    A zero-free digit set in base b has b-1 members, so THE TRAY DOES NOT GIVE THE BASE. Five
//    marks in a base-6 system is a fact the child has to derive from where numerals land, not count
//    off the tray — and a child who assumes base = tray size infers 5 and is wrong. That is a
//    graded inference rather than a leak.
//
// 3. THE RELABELLING SPACE HAS TO BEAT THE RESPONSE'S OWN CHANCE FLOOR, which is about 1/15 (see
//    below). A client that brute-forces every glyph->digit bijection always has the true reading
//    among its candidates, so it can never do worse than 1/g! for g glyphs. That guaranteed floor
//    must sit BELOW the response floor, or per-session re-keying is the weakest link in the item
//    rather than the strongest:
//
//      base 4 -> 3 glyphs ->   6 mappings -> 16.7%  vs a 6.7% floor   FAILS
//      base 5 -> 4 glyphs ->  24 mappings ->  4.2%  vs a 6.7% floor   marginal
//      base 6 -> 5 glyphs -> 120 mappings ->  0.8%  vs a 6.7% floor   an order of magnitude clear
//
//    Base 6 is the smallest base that clears it with margin. It also keeps the vocabulary lever a
//    real 1..5 range and keeps the five glyph drawings the renderer already has, so no new
//    legibility work is needed.
//
// ---------------------------------------------------------------------------
// THE RESPONSE, AND WHAT IT DOES TO THE CHANCE FLOOR
//
// §5.1 says a continuous response has "no guessing floor — it drops from 0.2 to effectively 0".
// That is the right direction and the wrong number, and the number is the whole point of E-207, so
// this bank computes it rather than asserting it.
//
// A placement is graded `|placedRatio - targetRatio| <= tolerance`, so the placements that score
// correct form an INTERVAL and a client who does not know the answer succeeds with probability equal
// to that interval's share of wherever it places. Two readings, both computed by the CLI:
//
//   * uniform over the whole line            -> 2 * TOLERANCE_RATIO      = 0.0500
//   * uniform over the bank's target SUPPORT -> 2 * t / (support width)  = 0.0667 = 1/15
//
// The estimator takes the LARGER, because a floor below the truth reads chance successes as ability,
// which is the direction that costs. {@link CHANCE_FLOOR} says why the support is narrower than the
// line and why a child can learn it inside a block.
//
// Requiring every target at least a tolerance from both ends pays for itself twice: the accepting
// interval is then exactly 2t on every item, so the block's single-floor fit is exact rather than an
// average, and it kills "slam the slider to the end", the heuristic the old five-option build had to
// spend a distractor (`anchor_echo`) closing.
//
// So the floor falls THREE-FOLD from the five-option 0.2, not to zero. Equivalently the slider is a
// FIFTEEN-alternative response where the five options it replaces were five.
// `packages/exam-engine/src/item-format.ts` carries the same figure as
// `CONTINUOUS_PLACEMENT_CHANCE_FLOOR` and `blockGuessingFloor` in `apps/web/src/lib/exam/phase2.ts`
// reads it off the response FORMAT, so neither has to guess `1/n` from an option count this type
// does not have.
//
// CLAIM BOUNDARY. Uniform placement is a design assumption of exactly the same class as
// "the floor is the reciprocal of the option count" (D-200 part 1): a real child who does not know
// is not uniform — centre bias raises the effective floor for mid-line targets and lowers it at the
// edges — and a disengaged child sits below it again. E-211 records the assumption; nothing here is
// a calibrated `c`.
//
// ---------------------------------------------------------------------------
// WHY THIS EMITS TEMPLATES
//
// §2.1 of the redesign spec requires banks to store templates rather than finished items, so the
// server can draw the session mapping and materialise from it. For this type that is unusually
// cheap, and the reason is worth stating because it is why §8 sequences Alien Numbers early:
//
//   A TEMPLATE STORES THE NUMERAL AS DIGIT VALUES, NOT AS GLYPHS. `value(numeral)` is therefore a
//   property of the template, so the TARGET RATIO, THE TOLERANCE AND EVERY DIFFICULTY LEVER ARE
//   INVARIANT UNDER RE-KEYING. Only which glyph draws which digit moves.
//
// Both failures §2 measured on the current banks are therefore impossible here rather than merely
// fixed. Failure A (difficulty drifts under relabelling) cannot occur because every lever is a count
// over digit values. Failure B (the answer stops being on screen) cannot occur because the answer is
// a position on a continuous line and every position is on screen.
//
// `provenance.template` is the authority and `provenance` is what `servedItemSchema` omits, so the
// template never reaches a browser. `content` and `answer` are the REFERENCE MATERIALISATION under
// the bank's declared `systemSeed`: they keep the type servable on today's path, and a serve-time
// materialiser re-keys by rewriting exactly those two objects from the template. The checker proves
// the reference materialisation is reproducible from the template alone.
//
// ---------------------------------------------------------------------------
// WHAT A CLIENT CAN COMPUTE FROM `content` ALONE (E-075/E-076)
//
// `content` gives the glyph tray, the numeral as a glyph string, the anchor as a glyph string, and
// the response field. It does NOT give the base, any digit's value, the line's numeric maximum, the
// target ratio or the tolerance.
//
// The strongest content-only attack is still to brute-force the 120 glyph->digit bijections, but a
// continuous response changes what that buys. With five fixed options the attacker's candidates
// COINCIDED with the options by construction, which is what made the leak dangerous. Here the
// candidates are 120 ratios spread along the line and only those inside the accepting band score, so
// the attack's yield collapses to roughly the band's own measure. The generator computes it exactly
// as `bandHit` and REFUSES any layout above the response floor, which makes "the brute force is no
// better than random placement" a build-time invariant rather than an argument.
//
// Two further attacks that need no mapping at all, both closed by construction and both measured:
//
//   * FIXED PLACEMENT. Park the slider at one ratio for every item. Best case over the bank is
//     reported; target ratios are spread uniformly over the admissible interval, so it lands at the
//     floor.
//   * THE DIFFICULTY-ORDINAL ATTACK. `difficulty` is served, so a scraped bank sorted by it must not
//     predict where on the line the answer sits. STAGE2_ANTILEAK_COMPARISON §7.2 read the key slot
//     straight off the difficulty rank at 32.9% on the old build. The replacement is structural:
//     within every rung the target ratio is spread across the admissible interval, and the generator
//     reports the difficulty x targetRatio correlation and the best per-slice fixed placement.
//
// Cross-item inference is NOT closed and must not be: pooling items in the `consistent` arm narrows
// the mapping, and doing exactly that is the induction the block measures. In `perTrial` the same
// pooling yields nothing, which is the control's whole logic.
//
// ---------------------------------------------------------------------------
// CONCRETENESS FADING — DESIGNED, EMITTED, AND DELIBERATELY NOT IN `content`
//
// §3.2 asked for "each glyph beside a depicted quantity", fading by a fixed trial index. The old
// renderer recorded that as impossible, correctly: a renderer cannot depict a glyph's worth without
// the key.
//
// A server-emitted schedule makes it possible, and building it surfaced a constraint §5.1 could not
// have known: A DEMONSTRATION CANNOT RIDE ON A SCORED ITEM'S `content`. Any truthful depiction is an
// equation over the session mapping, and one equation against a fixed anchor collapses the 120
// candidates to about one — so a worked example co-served with a scored numeral hands the browser
// THAT item's answer before the child answers. That is a firewall breach, not a learnability
// disclosure: it is strictly worse than the post-commit reveal §1.1 measured, which discloses the
// same equation only for an item that is already committed and never re-served.
//
// So the schedule is emitted in `provenance.template.demonstration` — server-only — and specifies
// UNSCORED demonstration trials at the head of the block. Three stages, which is the fade:
//
//   `counted`  the numeral, and its quantity drawn as countable unit tokens along the line
//   `extent`   the same, as a filled bar with no countable units
//   `symbolic` the numeral and its position only
//
// What fades is the REPRESENTATION OF MAGNITUDE, concrete to abstract, which is what concreteness
// fading means (Fyfe, McNeil, Son & Goldstone 2014; Goldstone & Son 2005). What does not fade is
// "which mark is worth what", because that was never depictable without publishing the key, and
// §3.2's "each glyph" is not admissible at any stage. The renderer implements the phase; which block
// phase sends it is the serve-time path's job and is out of scope here.
//
// ---------------------------------------------------------------------------
// M-PAE, AND WHY THIS BANK STILL SUPPLIES IT
//
// `scoring.rule = 'placement_tolerance'` with `answer.targetRatio` and `answer.tolerance` — the
// contract the SHIPPED generic verifiers already implement in both tiers (`verifyPlacementTolerance`
// in `apps/web/src/lib/exam/verifiers/generic.ts`, `app.exam_verify_placement_tolerance` and
// `app.exam_verify_quant_glyphnum` in the database). Both return `pae = |placedRatio - targetRatio|`
// as M-PAE. Nothing new is needed.
//
// What DID change is the metric's realised range. With five options every response was one of five
// ratios the generator had already constrained to within 0.5 of the target. A free slider can be
// placed anywhere, so PAE now genuinely spans [0, 1 - tolerance]. `policy.ts` declares M-PAE over
// {min: 0, max: 0.5}: that is a NORMALISATION window, and `normalizeToUnit` clamps, so a placement
// more than half the line away scores as maximally wrong — which is the right reading and needs no
// registry change. The generator reports the realised span so the claim is measured.
//
// ---------------------------------------------------------------------------
// GOVERNANCE. Born-synthetic only (syntheticOnly:true, validated:false). `difficulty` is a DESIGN
// rung on the shared 1..20 scale computed from the declared levers, NOT a calibrated IRT parameter.
// NOTHING HERE IS GATED: Gate B needs ~128 real children (§4.1.3) and no synthetic run substitutes,
// and §6 of the redesign spec records that a continuous-response type sits outside every Gate A cell
// measured so far, so Gate A must be re-read for it (E-211 does that).
//
// Run:  node research/exam-question-types/generators/QUANT-GLYPHNUM-01.mjs
//       writes ../banks/QUANT-GLYPHNUM-01.jsonl (consistent, live) and
//       ../control-banks/QUANT-GLYPHNUM-01.perTrial.jsonl (scrambled control, never served)
//       and prints coverage, equating, floor and anti-leak summaries.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ================================================================== *
 * THE NOTATION
 * ================================================================== */

/** The notation's base. See the header for why 6 and not 3, 4 or 5. */
export const BASE = 6;

/**
 * The digit values, zero-free. A base-b zero-free digit set has b-1 members, which is why five
 * glyphs do not announce base 6.
 */
export const DIGITS = Object.freeze([1, 2, 3, 4, 5]);

/**
 * Glyph symbols. Five neutral marks, in ONE canonical order in every item of both banks, so the
 * tray never hints at the mapping. Deliberately abstract: anything with a counting connotation (a
 * tally, a dot cluster) would order the digits before the child has induced an ordering.
 */
export const GLYPHS = Object.freeze(['arc', 'chevron', 'crescent', 'notch', 'spiral']);

/**
 * Half-width of the accepting band, as a fraction of the line.
 *
 * 0.025 is chosen against the two things that bound it from opposite sides.
 *
 *  * FROM BELOW, the child's pointing precision. On a ~600px line +/-2.5% is +/-15px, comfortably
 *    inside a child's slider control, and the renderer also offers arrow keys. A band tight enough
 *    to punish pointing would make the block partly a motor-learning measure, which is the failure
 *    §1.4 exists to prevent.
 *  * FROM ABOVE, the chance floor, which IS 2 * this number. Every point of tolerance is bought
 *    with guessing accuracy.
 *
 * FIXED, not proportional to the target. A Weber-style band would vary the floor per item and the
 * block's fit takes one floor; a "closer to the true integer than to any other" band would vary it
 * with the line's maximum and shrink to sub-pixel on a long line. A constant fraction keeps the
 * motor demand identical across the ladder, so difficulty cannot be confounded with pointing
 * precision, and keeps the floor a single exact number.
 */
export const TOLERANCE_RATIO = 0.025;

/**
 * The stretch of the line targets are drawn from.
 *
 * NOT the whole line, and the reason is a property of the notation rather than a choice. A small
 * target ratio needs a numeral far shorter than its anchor, and then all 120 candidate readings pile
 * up near zero — every one of them lands within a tolerance of every other, so the brute force wins
 * outright and the pair fails the hard invariant below. Measured over the whole notation, the
 * contiguous stretch that survives is [0.20, 0.95], and nothing at any tolerance a child can point
 * to will widen it.
 *
 * So it is DECLARED rather than discovered, and the generator asserts it, because it is load-bearing
 * twice: it sets the chance floor, and it is what a client learns about the bank for free.
 */
export const SUPPORT_MIN = 0.2;
export const SUPPORT_MAX = 0.95;

/**
 * What a client who does not know the answer scores. This is the number the block's fit and its
 * targeting rule both need, and getting it wrong is the misspecification E-207 exists to fix.
 *
 * Two readings, and the estimator takes the LARGER, because a floor set below the truth is the
 * direction that reads chance successes as ability:
 *
 *   * A placement uniform on the WHOLE line scores the measure of the accepting interval,
 *     `2 * TOLERANCE_RATIO` = 0.050. Every target sits at least a tolerance from both ends, so that
 *     measure is exactly `2 * TOLERANCE_RATIO` on every item rather than varying at the edges.
 *   * A placement uniform on the SUPPORT scores `2 * TOLERANCE_RATIO / (SUPPORT_MAX - SUPPORT_MIN)`
 *     = 0.0667. A child cannot read the support off one item, but over thirty trials they can see
 *     that nothing ever lands in the left fifth of the line, and a client that has the bank knows it
 *     immediately.
 *
 * Equivalently: a +/-2.5% band over a 0.75-wide support divides the answer into 15 disjoint
 * accepting intervals, so the slider is a FIFTEEN-alternative response where the five options it
 * replaces were five. The floor falls from 0.2 to 1/15, a three-fold reduction — not to zero, which
 * is what §5.1 of the redesign spec asserts and this measures instead.
 */
export const CHANCE_FLOOR = (2 * TOLERANCE_RATIO) / (SUPPORT_MAX - SUPPORT_MIN);

/** The floor a placement uniform on the whole line would score. Reported alongside, never used. */
export const UNIFORM_LINE_FLOOR = 2 * TOLERANCE_RATIO;

/** Read a digit-value sequence as a number, leftmost most significant. */
export function valueOf(digits) {
  let total = 0;
  for (const digit of digits) total = total * BASE + digit;
  return total;
}

/** Every numeral of length 1..`maxLength` over the zero-free digit set, shortest first. */
function allNumerals(maxLength) {
  let level = [[]];
  const out = [];
  for (let length = 1; length <= maxLength; length++) {
    const next = [];
    for (const prefix of level) {
      for (const digit of DIGITS) next.push([...prefix, digit]);
    }
    out.push(...next);
    level = next;
  }
  return out;
}

/** Longest numeral the bank writes. Four marks is the top of §1.3's composition ladder. */
const MAX_LENGTH = 4;

/** Every numeral, with its value, computed once. */
const NUMERALS = allNumerals(MAX_LENGTH).map((digits) => ({
  digits,
  value: valueOf(digits),
  length: digits.length,
}));

/** Numerals by value, so an anchor can be looked up by the quantity it has to label. */
const NUMERALS_BY_VALUE = (() => {
  const byValue = new Map();
  for (const numeral of NUMERALS) {
    // The shortest spelling wins, so a given quantity has ONE canonical anchor and the anchor is
    // identical across the two persistence arms up to relabelling.
    const held = byValue.get(numeral.value);
    if (held === undefined || numeral.length < held.length) byValue.set(numeral.value, numeral);
  }
  return byValue;
})();

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
 * THE HIDDEN SYSTEM — a glyph->digit bijection.
 *
 * `consistent` draws one and holds it for the whole bank. `perTrial` draws a
 * fresh one per item. Nothing else about the item changes with the mode,
 * because the template stores digit VALUES.
 * ================================================================== */
export function drawSystem(seed) {
  const rng = makeRng(`system|${seed}`);
  const values = shuffle(DIGITS.slice(), rng);
  const mapping = {};
  GLYPHS.forEach((glyph, i) => {
    mapping[glyph] = values[i];
  });
  return { systemId: `sys-${seed}`, mapping };
}

/** Glyph that means `digit` under this mapping. */
function glyphFor(system, digit) {
  const found = GLYPHS.find((glyph) => system.mapping[glyph] === digit);
  if (found === undefined) throw new Error(`system ${system.systemId} has no glyph for ${digit}`);
  return found;
}

/** Every glyph->digit bijection: the attacker's whole hypothesis space (5! = 120). */
export const ALL_MAPPINGS = (() => {
  const out = [];
  const walk = (i, used, acc) => {
    if (i === GLYPHS.length) {
      out.push({ ...acc });
      return;
    }
    for (const digit of DIGITS) {
      if (used.has(digit)) continue;
      used.add(digit);
      acc[GLYPHS[i]] = digit;
      walk(i + 1, used, acc);
      used.delete(digit);
    }
  };
  walk(0, new Set(), {});
  return out;
})();

/**
 * Every digit-value RELABELLING of the digit set (5! = 120).
 *
 * The brute force can be computed on digit values instead of on glyphs, and the two agree for the
 * reason the anti-leak profile is identical in both arms: the glyph string is the true mapping
 * applied to the digits, and composing the true mapping with each of the 120 relabellings runs over
 * the same 120 relabellings again. So the attacker's yield depends on the DIGIT sequences alone —
 * never on which glyphs spell them, and therefore never on the persistence mode. This form is used
 * here because it is cheap and cacheable; `check-QUANT-GLYPHNUM-01.mjs` deliberately uses the slow
 * honest one, built from `content` and nothing else, so the equivalence is checked not assumed.
 */
const DIGIT_PERMUTATIONS = (() => {
  const out = [];
  const walk = (i, used, acc) => {
    if (i === DIGITS.length) {
      out.push(acc.slice());
      return;
    }
    for (const digit of DIGITS) {
      if (used.has(digit)) continue;
      used.add(digit);
      acc[i] = digit;
      walk(i + 1, used, acc);
      used.delete(digit);
    }
  };
  walk(0, new Set(), []);
  return out;
})();

/**
 * How many of the 120 relabellings put this numeral inside the accepting band, given this anchor.
 *
 * THIS IS THE ATTACKER'S YIELD, and it is the quantity the layout search minimises. A relabelling
 * `p` maps digit value `d` to `p[d-1]`; the attacker reading the glyph strings under it would place
 * at `value(p(numeral)) / value(p(anchor))`. The true relabelling is the identity and is always
 * counted, so this can never return 0 — which is why the bound below is a floor and not a wish.
 */
function bandHitCount(numeral, anchor, targetRatio) {
  let hits = 0;
  let onSupport = 0;
  for (const p of DIGIT_PERMUTATIONS) {
    let numeratorValue = 0;
    for (const d of numeral) numeratorValue = numeratorValue * BASE + p[d - 1];
    let denominatorValue = 0;
    for (const d of anchor) denominatorValue = denominatorValue * BASE + p[d - 1];
    if (denominatorValue <= 0) continue;
    const ratio = numeratorValue / denominatorValue;
    // THE SUPPORT IS ITSELF INFORMATION, and this is where that gets paid for. `SUPPORT_MIN` and
    // `SUPPORT_MAX` are a property of the bank, so a client that has watched a few trials — or read
    // the generator — can discard every candidate reading that falls outside them before guessing
    // among the rest. Counting only the survivors is therefore the honest attacker model, and it is
    // strictly stronger than counting all 120. It was not obvious: the oracle found two items in 430
    // where the support alone pins the accepting interval, which the all-120 count rated safe.
    if (ratio < SUPPORT_MIN || ratio > SUPPORT_MAX) continue;
    onSupport += 1;
    // The 1e-12 is not slack in the invariant, it is the same comparison the verifier makes: a
    // candidate landing on the exact boundary is graded correct, so it has to be counted as a hit.
    if (Math.abs(ratio - targetRatio) <= TOLERANCE_RATIO + 1e-12) hits += 1;
  }
  return { hits, onSupport };
}

/* ================================================================== *
 * DIFFICULTY — every lever a count over digit values, so a relabelling
 * cannot move any of them (§3).
 *
 * §1.1(d) is why this is arithmetic over template properties rather than a
 * hand label: the block serves systematically different item subsets early and
 * late, so difficulty error that correlates with subset composition correlates
 * with trialIndex, and correlated error in `b` maps straight onto `lambda`.
 * ================================================================== */

/**
 * DIFFICULTY IS COUNTED IN HALF-RUNGS, NOT IN ARBITRARY WEIGHTS.
 *
 * Every lever contributes a whole number of 0.5-point steps, so every difficulty this bank can
 * express lands exactly on the 0.5-point grid the scale is read on. Two things follow, and both were
 * defects of the old build.
 *
 *  * THE GRID IS E-095's GRID. Recovery, attenuation and posterior SE were measured on "an idealised
 *    0.5-point item grid" with twelve items per rung. A bank whose difficulties are arbitrary floats
 *    is being compared against that grid across a difference nobody chose; a bank built on it is
 *    density-matched by construction, which is what makes A4 a comparison rather than an analogy.
 *  * COVERAGE IS PROVABLE. The step sets below are chosen so their sums hit every integer from 0 to
 *    38, which is every rung from 1.0 to 20.0 — not "in practice" but arithmetically, and the CLI
 *    prints the check.
 *
 * The weights are ordinal design claims and nothing more: no item here has a calibrated `b`.
 */

/**
 * Half-rungs from the numeral's length: how many marks must be read and weighted. Dominant, and
 * CONVEX — a second mark is nearly free where the third and fourth are not.
 *
 * That shape is the response channel showing up in the ladder rather than a fudge. A +/-2.5% band
 * divides the line into 20 accepting intervals, so the answer carries about log2(20) = 4.3 bits
 * however long the numeral is, and in base 6 that is under two marks of precision. `digitsNeeded`
 * records per item how many leading marks actually pin the value inside the band, and it is 1 for
 * every two-mark numeral this bank admits at the youngest band. A mark the band cannot ask about is
 * not a second thing to decode; the load arrives at three and four marks, where it must be
 * integrated. Pricing all four marks alike would be difficulty misspecification, which §1.1(d) says
 * biases lambda.
 */
export const LENGTH_STEPS = Object.freeze({ 1: 0, 2: 1, 3: 6, 4: 16 });

/**
 * Half-rungs from the anchor's length. The reference at the end of the line is itself a numeral in
 * the same notation, so a longer anchor is more to decode before anything can be placed — and a
 * four-mark anchor means the child decodes two numerals at the top of the notation, which is why
 * that step is the large one.
 */
export const ANCHOR_STEPS = Object.freeze({ 1: 0, 2: 1, 3: 2, 4: 9 });

/**
 * Half-rungs per distinct glyph beyond the two any item must use.
 *
 * `vocabularyInPlay` counts the distinct glyphs across the numeral AND the anchor, because both must
 * be decoded to place anything. It is at least 2: an item whose numeral and anchor used one glyph
 * between them would sit at a target ratio of 1, which the admissible interval excludes.
 *
 * This is the template-encodable form of §3's "how many distinct symbols have appeared so far this
 * block". The history-conditioned form is a serve-time quantity — it depends on which trials this
 * child has already seen — and the template records everything a materialiser needs to recompute it.
 */
const VOCAB_STEPS = 2;

/**
 * Half-rungs when the numeral uses one glyph in two different places, by whether the two places are
 * adjacent or separated.
 *
 * The sharpest available probe of place value: the same mark, worth different amounts, in one
 * numeral. A child holding a lookup table cannot produce two values for one symbol; a child holding
 * the place rule must. Separated occurrences cost more than adjacent ones because adjacent ones can
 * be read as a single doubled unit, and a separated pair cannot.
 */
export const REPEAT_STEPS = Object.freeze({ none: 0, adjacent: 5, separated: 6 });

/** Half-rungs when the ANCHOR repeats a mark: the same load, on the numeral that labels the line. */
const ANCHOR_REPEAT_STEPS = 1;

/**
 * WHY RESIDUAL AMBIGUITY IS A CONSTRAINT HERE AND NOT A PRICED COORDINATE.
 *
 * §3 of the redesign spec names residual ambiguity as the lever that replaces class-counting, and it
 * is computed per item here — `residualAmbiguity = 1 - bandHit`, over all 120 relabellings, exactly
 * the quantity the PR #48 learnability oracles report. It is enforced as a HARD INVARIANT: no pair
 * whose brute force beats a random placement is admissible at any rung.
 *
 * It is deliberately NOT one of the terms above, and the reason is a property of this response
 * format that §3 could not have anticipated. `difficulty` IS SERVED. With difficulty an exact
 * function of the levers, a client inverts it to recover the lever tuple — and the four terms above
 * are all things the child is already looking at: how many marks the numeral has, how many the
 * anchor has, how many distinct marks are in play, whether one repeats. Recovering them discloses
 * nothing.
 *
 * `bandHit` is not on screen. It is the number of candidate readings that cluster within a tolerance
 * of the true one, and a client can compute the neighbour count of every candidate it enumerates —
 * so a served difficulty that encoded `bandHit` would let it discard every candidate whose
 * neighbour count disagreed. That is STAGE2_ANTILEAK_COMPARISON §7.2's difficulty-ordinal attack
 * rebuilt in a continuous response, and §7.4 is the standing warning about scoring only the attacks
 * one thought of. Pricing ambiguity would have bought a within-rung positioner the half-rung grid
 * does not need, at the price of the one lever that is not already public. The CLI measures the
 * neighbour-count attack so the choice is evidenced rather than argued.
 */

/**
 * Total half-rungs, so 0 is difficulty 1.0 and {@link MAX_STEPS} is difficulty 20.0.
 *
 * HOW THE NUMBERS ABOVE WERE FIXED, since a design weight nothing calibrates can still be chosen
 * badly. Each is an ordinal claim and every lever is monotone in it. Within that family the
 * particular integers were chosen by an exhaustive search over the whole admissible space
 * (`ADMISSIBLE`, 142k pairs) for a weighting whose reachable half-rung set covers EVERY rung from
 * 1.0 to 20.0 under the §4.3 band caps — because a hole in the ladder is a difficulty the selection
 * rule can never serve, and E-095's recovery figures assume a 0.5-point grid with no gaps. The
 * search returned a unique family with no holes; the CLI re-checks coverage on every build, so a
 * future weight change that reopens a hole fails loudly instead of quietly.
 */
export const MAX_STEPS =
  LENGTH_STEPS[MAX_LENGTH] +
  ANCHOR_STEPS[MAX_LENGTH] +
  VOCAB_STEPS * (DIGITS.length - 2) +
  REPEAT_STEPS.separated +
  ANCHOR_REPEAT_STEPS;

export function leverSteps({
  length,
  anchorLength,
  vocabularyInPlay,
  repeatedPlace,
  anchorRepeatedPlace,
}) {
  return (
    LENGTH_STEPS[length] +
    ANCHOR_STEPS[anchorLength] +
    VOCAB_STEPS * (vocabularyInPlay - 2) +
    REPEAT_STEPS[repeatedPlace] +
    ANCHOR_REPEAT_STEPS * anchorRepeatedPlace
  );
}

/** Lever tuple -> design rung on the shared 1..20 scale, always exactly on the 0.5-point grid. */
export function difficultyFromLevers(levers) {
  return clamp(1 + 0.5 * leverSteps(levers), 1, 20);
}

/* ================================================================== *
 * BANDS — the developmental floor §4.3 requires.
 *
 * Li et al. (2024) found 6-7-year-olds mostly best fit by a RANDOM-RESPONSE
 * model on an information-integration structure, so §4.3 forbids multi-
 * dimensional integration at the young bands. Here the integration dimension IS
 * place value: combining a mark with a place weight is two features acting on
 * one another.
 *
 * THE CAP IS ON `digitsNeeded`, NOT ON THE NUMBER OF MARKS, and that is the one
 * place this differs from the old build's `maxLength`/`maxBinds` pair. What a
 * young band must not be handed is an item that CANNOT BE ANSWERED without
 * integrating two marks, and a two-mark numeral against a long enough line is
 * answerable from the leading mark alone — the tail cannot move the value out of
 * the band. Capping the mark count instead would have withheld those items while
 * admitting nothing safer, and would have left the K-1 window with the 27
 * one-mark pairs the notation admits in total. Capping the integration demand
 * withholds exactly the items whose answer requires the integration.
 *
 * A repeated mark across places is the purest integration probe and is withheld
 * until 4-5 whatever its `digitsNeeded` says.
 * ================================================================== */
export const BANDS = [
  { band: 'K-1', lo: 1, hi: 4, maxDigitsNeeded: 1, maxLength: 2, allowRepeat: false },
  { band: '2-3', lo: 4, hi: 8, maxDigitsNeeded: 2, maxLength: 3, allowRepeat: false },
  { band: '4-5', lo: 8, hi: 12, maxDigitsNeeded: 2, maxLength: 4, allowRepeat: true },
  { band: '6-8', lo: 12, hi: 20, maxDigitsNeeded: MAX_LENGTH, maxLength: 4, allowRepeat: true },
];

/**
 * The lowest rung this bank ships, and it is not 1.0.
 *
 * THIS TYPE HAS NO K-1 SUPPLY, and the reason is a measured property of the notation rather than a
 * developmental judgement. A K-1 item may not require two marks to be integrated (§4.3), so it is a
 * one-mark numeral or a two-mark numeral whose leading mark decides — and those are exactly the items
 * a SUPPORT-AWARE brute force wins. A short numeral against a short anchor has few distinct readings
 * once the ones falling outside [SUPPORT_MIN, SUPPORT_MAX] are discarded, so the accepting interval
 * takes a large share of what is left: of the 27 one-mark pairs in the whole notation, none clears the
 * support floor, and three two-mark pairs do.
 *
 * Three items is not a ladder. The alternatives were both worse: shipping the three would advertise a
 * band the block would exhaust on its first trials, and admitting items that need two marks
 * integrated would put the youngest children on the structure §4.3 says they answer at random.
 *
 * So the honest statement is that the quantitative Stage 2 activity starts at the 2-3 band, which is
 * a coverage gap to record rather than a defect to hide. `ageBands` on every shipped item is true;
 * there simply are no K-1 ones.
 */
export const LADDER_MIN = 4;

/** The band whose window contains a difficulty. */
export function bandFor(difficulty) {
  return BANDS.find((b) => difficulty < b.hi) ?? BANDS[BANDS.length - 1];
}

/** Declared age band, read straight off the difficulty window. */
export function ageBandsFor(difficulty) {
  return [bandFor(difficulty).band];
}

/**
 * Whether the §4.3 caps admit this pair at the difficulty its own levers give it.
 *
 * Applied by the item's OWN difficulty rather than by the rung it was aimed at, so the checker's cap
 * and the builder's cap cannot disagree at a band boundary — the disagreement the old build had to
 * clip a rung window to avoid.
 */
export function bandAdmits(pair) {
  const band = bandFor(pair.difficulty);
  if (pair.digitsNeeded > band.maxDigitsNeeded) return false;
  if (pair.levers.length > band.maxLength) return false;
  if (pair.levers.repeatedPlace !== 'none' && !band.allowRepeat) return false;
  return true;
}

/* ================================================================== *
 * ONE TEMPLATE
 * ================================================================== */

/**
 * How many leading marks must be decoded before the value is pinned inside the band.
 *
 * Knowing the top `k` digits leaves the tail free over the zero-free digit set, so the value is
 * pinned to an interval; the smallest `k` whose interval fits inside a tolerance of its own midpoint
 * is what a child actually has to read. Recorded rather than priced — see {@link LENGTH_LOAD} — and
 * it is the figure that says how much of the numeral the response channel can even ask about.
 */
export function digitsNeeded(numeral, lineMax) {
  for (let k = 1; k <= numeral.length; k++) {
    const tail = numeral.length - k;
    let lowTail = 0;
    let highTail = 0;
    for (let i = 0; i < tail; i++) {
      lowTail = lowTail * BASE + DIGITS[0];
      highTail = highTail * BASE + DIGITS[DIGITS.length - 1];
    }
    let head = 0;
    for (let i = 0; i < k; i++) head = head * BASE + numeral[i];
    const scale = BASE ** tail;
    const halfWidth = ((head * scale + highTail - (head * scale + lowTail)) / 2) / lineMax;
    if (halfWidth <= TOLERANCE_RATIO) return k;
  }
  return numeral.length;
}

/**
 * A digit sequence's REPEAT SHAPE, with the digit values erased: `[3,1,3]` and `[5,2,5]` are both
 * `"aba"`.
 *
 * This is what survives re-keying and reaches the browser. A relabelling changes which glyph draws
 * which digit and therefore cannot change the shape, so the shape is exactly the part of the numeral
 * a client can read off the screen without solving anything.
 */
function shapeOf(digits) {
  const seen = new Map();
  return digits
    .map((digit) => {
      if (!seen.has(digit)) seen.set(digit, String.fromCharCode(97 + seen.size));
      return seen.get(digit);
    })
    .join('');
}

/** Whether a numeral repeats a mark, and whether the repeated places are adjacent or separated. */
function repeatKind(digits) {
  let kind = 'none';
  for (let i = 0; i < digits.length; i++) {
    for (let j = i + 1; j < digits.length; j++) {
      if (digits[i] !== digits[j]) continue;
      if (j > i + 1) return 'separated';
      kind = 'adjacent';
    }
  }
  return kind;
}

/**
 * Anchors worth trying for one numeral, best first.
 *
 * The admissible interval is the whole constraint: `TOLERANCE_RATIO <= value/anchor <= 1 -
 * TOLERANCE_RATIO` is what makes the chance floor exactly `2 * TOLERANCE_RATIO` on every item and
 * what stops "slam the slider to an end" being a free answer. Within it, anchors are returned in
 * canonical value order so the enumeration is deterministic and the two arms see the same set.
 */
function admissibleAnchors(value) {
  const out = [];
  const minAnchor = Math.ceil(value / SUPPORT_MAX);
  const maxAnchor = Math.floor(value / SUPPORT_MIN);
  for (const [anchorValue, anchor] of NUMERALS_BY_VALUE) {
    if (anchorValue < minAnchor || anchorValue > maxAnchor) continue;
    out.push(anchor);
  }
  return out.sort((a, b) => a.value - b.value);
}

/**
 * Every (numeral, anchor) pair the notation admits, priced.
 *
 * Enumerated rather than searched, which is what a slider buys: with no options to reconcile there
 * is no layout to optimise, so the whole admissible space can be costed once and the bank becomes a
 * stratified SELECTION from it. That is also why the bank has no key-rank machinery — there is no
 * key slot to balance, so the two surface heuristics the old build had to close ("longer numeral,
 * further right"; "tap the end of the line") have nothing to attach to.
 */
export const ADMISSIBLE = (() => {
  const out = [];
  for (const numeral of NUMERALS) {
    for (const anchor of admissibleAnchors(numeral.value)) {
      const targetRatio = round6(numeral.value / anchor.value);
      if (targetRatio < SUPPORT_MIN || targetRatio > SUPPORT_MAX) continue;

      const { hits, onSupport } = bandHitCount(numeral.digits, anchor.digits, targetRatio);
      const bandHit = hits / ALL_MAPPINGS.length;
      // THE HARD INVARIANT, in two readings, and the pair must clear both.
      //
      //   * Over all 120 relabellings, against the floor a placement uniform on the whole LINE
      //     scores. This is the plain brute force.
      //   * Over the relabellings that land on the SUPPORT, against the floor a placement uniform on
      //     the support scores. This is the brute force by a client that has noticed where the bank
      //     keys, and it is the stronger of the two.
      //
      // Above either floor the item would reward scraping over induction, and unlike the old
      // five-option build there is no distractor slate to trade against it — the pair is simply not
      // admissible.
      if (bandHit > UNIFORM_LINE_FLOOR + 1e-12) continue;
      if (onSupport === 0 || hits / onSupport > CHANCE_FLOOR + 1e-12) continue;

      const distinct = new Set([...numeral.digits, ...anchor.digits]).size;
      const levers = {
        length: numeral.length,
        anchorLength: anchor.length,
        vocabularyInPlay: distinct,
        repeatedPlace: repeatKind(numeral.digits),
        anchorRepeatedPlace: new Set(anchor.digits).size < anchor.digits.length ? 1 : 0,
      };
      out.push({
        numeral: numeral.digits,
        anchor: anchor.digits,
        value: numeral.value,
        lineMax: anchor.value,
        targetRatio,
        bandHitCount: hits,
        /** Relabellings whose reading lands anywhere the bank keys — the attacker's real hypothesis set. */
        onSupportCount: onSupport,
        residualAmbiguity: round6(1 - hits / onSupport),
        digitsNeeded: digitsNeeded(numeral.digits, anchor.value),
        // What a client sees of the item's SHAPE once the glyph names are stripped: how the marks
        // repeat, in the numeral and in the anchor. Not a difficulty lever — it is the residual
        // channel a scraped bank could join to the served difficulty, so the CLI measures the
        // attacker who conditions on it and the selection below deliberately keeps these cells
        // populated rather than unique.
        signature: `${shapeOf(numeral.digits)}/${shapeOf(anchor.digits)}`,
        levers,
        difficulty: round2(difficultyFromLevers(levers)),
      });
    }
  }
  return out;
})();

/* ================================================================== *
 * THE DEMONSTRATION SCHEDULE
 *
 * Server-only, and see the header for why it cannot ride on a scored item.
 * ================================================================== */

/** Unit tokens the `counted` stage draws along the whole line. */
const DEMO_UNITS = 12;

/**
 * The concreteness-fading schedule for one session, as digit values.
 *
 * Worked examples are chosen so the fade has something to fade THROUGH: a one-mark numeral first,
 * because a single place is the only case where a countable depiction and the notation agree
 * without the place rule; then a two-mark numeral, where the place rule is what makes the count come
 * out; then nothing. Each example carries the position it belongs at, which is the observation the
 * child is being shown, and nothing else.
 *
 * Expressed in digit values so a materialiser re-keys it with the same bijection it re-keys the
 * numeral with. `fadeAfterTrial` is §3.2's fixed trial index.
 */
export function demonstrationSchedule({ anchor, lineMax }) {
  const examples = [];
  const stages = ['counted', 'extent'];
  for (const [index, stage] of stages.entries()) {
    // A one-mark then a two-mark numeral, both small enough that the counted stage is countable.
    const numeral = index === 0 ? [DIGITS[0]] : [DIGITS[0], DIGITS[1]];
    const value = valueOf(numeral);
    if (value / lineMax > 1 - TOLERANCE_RATIO) continue;
    examples.push({ stage, numeral, ratio: round6(value / lineMax), units: DEMO_UNITS });
  }
  return {
    // The line every example is shown against, so the ratios mean the same thing across the phase.
    anchor: anchor.slice(),
    examples,
    /** Trials after which no depiction of magnitude is drawn at all (§3.2's fixed index). */
    fadeAfterTrial: examples.length,
    /** Where these trials belong. Scored items carry no schedule; the checker asserts it. */
    delivery: 'unscored_demonstration_trials',
  };
}

/* ================================================================== *
 * MATERIALISATION
 * ================================================================== */

/**
 * Turn one template into a served `content` + `answer` pair under a glyph->digit bijection.
 *
 * This IS the serve-time path's contract, exported so the sibling workstream can call the same
 * function the bank was built with rather than reimplementing it, and so the checker can prove the
 * reference materialisation is reproducible from `provenance.template` alone.
 *
 * Nothing in `content` depends on anything but the glyph strings: the target ratio, the tolerance
 * and every lever are properties of the TEMPLATE, so re-keying moves the surface and nothing else.
 */
export function materialise(template, system) {
  const glyphsOf = (digits) => digits.map((digit) => glyphFor(system, digit));
  return {
    content: {
      typeCode: 'QUANT-GLYPHNUM-01',
      // The full vocabulary, always in canonical order, so the tray leaks nothing in either mode.
      glyphTray: GLYPHS.slice(),
      // Surface glyphs only. What each glyph is worth is server-only.
      expression: glyphsOf(template.numeral),
      // The line's numeric maximum is NOT here on purpose: publishing it would hand a brute-forcing
      // client the equation value(anchor) = max and pin part of the mapping for free.
      line: { minValue: 0, maxExpression: glyphsOf(template.anchor) },
      /**
       * The response is a position, not a choice. Read by `itemResponseFormat` in
       * `packages/exam-engine/src/item-format.ts`, which is how the block's chance floor stops
       * being a reciprocal of an option count this type does not have. It names the FORMAT and
       * nothing about the band: no tolerance, no target, no base, no digit value.
       */
      responseFormat: 'continuous_placement',
      responseField: 'placedRatio',
    },
    answer: {
      /**
       * There is no option key. The canonical solution IS the position, so `correctKey` carries the
       * target ratio: `scoring.rule = 'placement_tolerance'` is what grades the trial, and the
       * servability gate in `scripts/sync-exam-demos.mjs` requires a key to exist at all.
       */
      correctKey: template.targetRatio,
      // The `placement_tolerance` contract: both verifier tiers read exactly these two fields.
      targetRatio: template.targetRatio,
      tolerance: TOLERANCE_RATIO,
      // SERVER-ONLY: the system itself. Shipping this would make every item a lookup.
      system: { systemId: system.systemId, mapping: { ...system.mapping } },
      expressionDigits: template.numeral.slice(),
      anchorDigits: template.anchor.slice(),
      lineMax: template.lineMax,
      trueValue: template.value,
      /** What a uniformly-random placement scores on this item, exactly (see the header). */
      chanceFloor: CHANCE_FLOOR,
    },
  };
}

/**
 * Generate ONE structured BankItem from an admissible pair.
 *
 * @param {{pair, systemPersistence, systemSeed, seed}} spec
 */
export function genItem({ pair, systemPersistence, systemSeed, seed }) {
  if (systemPersistence !== 'consistent' && systemPersistence !== 'perTrial') {
    throw new Error(`systemPersistence must be consistent|perTrial, got "${systemPersistence}"`);
  }
  const system =
    systemPersistence === 'consistent' ? drawSystem(systemSeed) : drawSystem(`${systemSeed}|${seed}`);

  const template = {
    templateVersion: 'quant-glyphnum-01-template@1',
    base: BASE,
    digitValues: DIGITS.slice(),
    significance: 'leftmost_most_significant',
    numeral: pair.numeral.slice(),
    anchor: pair.anchor.slice(),
    value: pair.value,
    lineMax: pair.lineMax,
    targetRatio: pair.targetRatio,
    toleranceRatio: TOLERANCE_RATIO,
    chanceFloor: CHANCE_FLOOR,
    digitsNeeded: pair.digitsNeeded,
    /**
     * How many of the 120 relabellings put this numeral inside the accepting band, and its
     * complement. `residualAmbiguity` is §3's lever, computed and enforced but not priced — see the
     * note above {@link MAX_STEPS} for why a served difficulty must not encode it.
     */
    bandHitCount: pair.bandHitCount,
    onSupportCount: pair.onSupportCount,
    residualAmbiguity: pair.residualAmbiguity,
    /** Repeat shape of the numeral and the anchor, which is what survives re-keying. */
    signature: pair.signature,
    demonstration: demonstrationSchedule({ anchor: pair.anchor, lineMax: pair.lineMax }),
  };

  const { content, answer } = materialise(template, system);
  const difficulty = round2(difficultyFromLevers(pair.levers));

  return {
    itemId: seededUuid(`${systemPersistence}|${seed}`),
    typeCode: 'QUANT-GLYPHNUM-01',
    domain: 'quantitative',
    difficulty, // FLOAT 1..20 — DESIGN rung from the levers, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/QUANT-GLYPHNUM-01.html',
    content,
    answer,
    scoring: {
      mode: 'deterministic_key',
      // Dispatches to the SHIPPED generic placement verifier in both tiers, which returns M-PAE.
      rule: 'placement_tolerance',
      description:
        'pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. ' +
        'The band is a fixed fraction of the line and every target sits at least a tolerance from ' +
        'both ends, so the accepting interval has measure 2 * tolerance on every item and that is ' +
        'the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is ' +
        'better).',
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'quant-glyphnum-01-template@1',
      seed,
      /**
       * THE AUTHORITY (§2.1). `content` and `answer` above are the reference materialisation of
       * this template under `systemSeed`; a serve-time path re-keys by calling `materialise` with a
       * session mapping and rewriting exactly those two objects. `servedItemSchema` omits
       * `provenance`, so none of it reaches a browser.
       */
      template,
      levers: {
        ...pair.levers,
        // The control condition, recorded in provenance rather than content: the renderer must not
        // know which arm it is serving (§4.1.1).
        systemPersistence,
        systemSeed,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

/* ================================================================== *
 * BANK BUILDER
 *
 * Fills every 0.5-point rung of the 1..20 scale with `perRung` items, SELECTED
 * from {@link ADMISSIBLE} rather than searched for. There is no layout to
 * optimise, which is the other thing a slider buys: the whole admissible space
 * can be enumerated and costed once.
 *
 * `perRung` is 12 to match the idealised grid E-095 was measured on.
 * STAGE2_BANK_RECOVERY_MEASUREMENT §5 conjectured pool depth per rung as the
 * reason `FLU-OPCHAIN-01` falls behind that grid after ~45 trials; building at
 * the grid's own density makes that a comparison anyone can run rather than a
 * paragraph.
 *
 * SELECTION IS WHERE THE ANTI-LEAK WORK NOW LIVES, and it replaces the key-rank
 * allocator the old build needed. Two channels, both closed here:
 *
 *  1. FIXED PLACEMENT. Park the slider at one ratio for every item. This is
 *     bounded by how evenly the bank's target ratios are spread, so the ratios
 *     are laid on a STAGGERED grid: each rung takes `perRung` evenly spaced
 *     ratio buckets, and consecutive rungs offset their bucket edges by a
 *     fraction of a bucket. Aligned edges would let every rung drop an item into
 *     the same window and multiply the attack by the number of rungs.
 *  2. THE SCRAPED-BANK JOIN. `difficulty` is served and, for this type,
 *     re-keying does not move the target ratio — so a scraped bank plus the
 *     served difficulty plus the numeral's visible repeat SHAPE is a real
 *     channel that per-session keying does not close. It is bounded by how many
 *     bank items share a (rung, shape) cell, so selection prefers cells that are
 *     POPULATED rather than distinct: a rung whose twelve items share one shape
 *     leaves the join with nothing beyond the rung. The CLI measures the
 *     residual.
 *
 * Both are deterministic — no draw anywhere in the plan — so the two persistence
 * arms select identically and the equating is exact.
 * ================================================================== */
export function buildBank({ systemPersistence, perRung = 12, systemSeed = 'QUANT-GLYPHNUM-01|v2' }) {
  const rungs = [];
  for (let d = LADDER_MIN; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));

  const byRung = new Map(rungs.map((rung) => [rung, []]));
  for (const pair of ADMISSIBLE) {
    if (!bandAdmits(pair)) continue;
    byRung.get(round2(pair.difficulty))?.push(pair);
  }

  /** @type {{rung:number, have:number}[]} */
  const short = [];
  const plan = [];
  rungs.forEach((rung, rungIndex) => {
    const candidates = byRung.get(rung) ?? [];
    if (candidates.length === 0) {
      short.push({ rung, have: 0 });
      return;
    }

    // Shape cells, largest first by how many DISTINCT target ratios they can supply. Taking a whole
    // rung out of one populated cell is what leaves the scraped-bank join nothing to read.
    const cells = new Map();
    for (const pair of candidates) {
      const cell = cells.get(pair.signature) ?? [];
      cell.push(pair);
      cells.set(pair.signature, cell);
    }
    const ordered = [...cells.entries()]
      .map(([signature, pairs]) => ({
        signature,
        pairs: pairs
          .slice()
          .sort((a, b) => a.targetRatio - b.targetRatio || a.value - b.value || a.lineMax - b.lineMax),
        ratios: new Set(pairs.map((p) => p.targetRatio)).size,
      }))
      .sort((a, b) => b.ratios - a.ratios || (a.signature < b.signature ? -1 : 1));

    // Every pair the rung can offer, best shape cells first so the cell tie-break below has an
    // order to prefer.
    const pool = ordered.flatMap((cell) => cell.pairs);
    const topCell = ordered[0].signature;

    // THE GLOBAL RATIO GRID, INTERLEAVED ACROSS RUNGS. The bank's `rungs.length * perRung` slots are
    // laid out uniformly over the admissible interval and then dealt round-robin to the rungs, so
    // rung `r` asks for slots r, r + rungs.length, r + 2 * rungs.length, ... Two properties at once:
    // the bank's ratios are uniform globally, which is what bounds the fixed-placement attack, and
    // each rung's own ratios are spread across the whole interval, which is what bounds the attack
    // conditioned on a difficulty. Aligned per-rung grids would give the second without the first.
    const lo = SUPPORT_MIN;
    const hi = SUPPORT_MAX;
    const slots = rungs.length * perRung;
    const taken = new Set();
    for (let k = 0; k < perRung; k++) {
      const slot = k * rungs.length + rungIndex;
      const wanted = lo + ((hi - lo) * (slot + 0.5)) / slots;
      let best = null;
      for (const pair of pool) {
        const id = `${pair.numeral.join('')}|${pair.anchor.join('')}`;
        if (taken.has(id)) continue;
        const cost =
          Math.abs(pair.targetRatio - wanted) +
          // Cell preference, well below the per-rung slot spacing of
          // (SUPPORT_MAX - SUPPORT_MIN) / perRung, so it can only choose between pairs the ratio grid
          // already rates as near-equivalent. Concentrating a rung in one shape cell is what stops
          // the scraped-bank join reading anything from the shape.
          (pair.signature === topCell ? 0 : 0.01) +
          // Among equals, prefer the least leaky reading. Residual ambiguity is a constraint rather
          // than a lever (see above), but nothing stops it breaking a tie.
          0.001 * (pair.bandHitCount / ALL_MAPPINGS.length);
        if (best === null || cost < best.cost) best = { cost, pair, id };
      }
      if (best === null) break;
      taken.add(best.id);
      plan.push({ rung, pair: best.pair, i: k });
    }
    if (taken.size < perRung) short.push({ rung, have: taken.size });
  });

  const items = [];
  for (const entry of plan) {
    const l = entry.pair.levers;
    const seed =
      `QUANT-GLYPHNUM-01|rung=${entry.rung}|i=${entry.i}|` +
      `N${entry.pair.numeral.join('')}|A${entry.pair.anchor.join('')}|L${l.length}V${l.vocabularyInPlay}`;
    items.push(genItem({ pair: entry.pair, systemPersistence, systemSeed, seed }));
  }
  return { items, shortRungs: short };
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint: write BOTH banks and print coverage + equating + floor + leak summaries.
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

/** Pearson correlation, for the difficulty x targetRatio independence check. */
function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** Best accuracy a client gets by parking the slider at one fixed ratio for every item in `set`. */
function bestFixedPlacement(set) {
  let best = 0;
  let at = 0;
  // Every candidate ratio worth trying is one tolerance above some item's target: the accepting
  // intervals are the only places the count can change.
  for (const item of set) {
    for (const ratio of [item.answer.targetRatio, item.answer.targetRatio + item.answer.tolerance]) {
      const hits = set.filter(
        (it) => Math.abs(ratio - it.answer.targetRatio) <= it.answer.tolerance + 1e-12,
      ).length;
      if (hits > best) {
        best = hits;
        at = ratio;
      }
    }
  }
  return { rate: set.length === 0 ? 0 : best / set.length, at: round2(at), hits: best };
}

/**
 * The scraped-bank join, measured: a client that holds the whole bank, reads the served difficulty
 * and the numeral's visible repeat shape, and parks the slider at the best ratio for that cell.
 *
 * This is the attack per-session re-keying does NOT close for this type, because re-keying leaves the
 * target ratio where it was. Reported as a bank-wide accuracy so the residual is a number.
 */
function scrapedBankJoin(set) {
  const cells = new Map();
  for (const item of set) {
    const key = `${item.difficulty}|${item.provenance.template.signature}`;
    const cell = cells.get(key) ?? [];
    cell.push(item);
    cells.set(key, cell);
  }
  let hits = 0;
  let singletons = 0;
  for (const cell of cells.values()) {
    if (cell.length === 1) singletons += 1;
    hits += bestFixedPlacement(cell).hits;
  }
  return {
    rate: set.length === 0 ? 0 : hits / set.length,
    cells: cells.size,
    singletons,
    meanCell: set.length === 0 ? 0 : set.length / cells.size,
  };
}

/**
 * The neighbour-count attack, measured: a client enumerates all 120 candidate ratios, counts how
 * many other candidates sit within a tolerance of each, and keeps the candidates whose count matches
 * the item's own `bandHitCount`.
 *
 * It has no way to learn `bandHitCount` from anything served — that is the point of leaving residual
 * ambiguity out of the priced levers — so this is measured as the attack a client WOULD have if
 * difficulty had encoded it. Reported so the design choice is evidenced.
 */
function neighbourCountAttack(set) {
  let total = 0;
  for (const item of set) {
    const template = item.provenance.template;
    const ratios = [];
    for (const p of DIGIT_PERMUTATIONS) {
      let numeratorValue = 0;
      for (const d of template.numeral) numeratorValue = numeratorValue * BASE + p[d - 1];
      let denominatorValue = 0;
      for (const d of template.anchor) denominatorValue = denominatorValue * BASE + p[d - 1];
      if (denominatorValue > 0) ratios.push(numeratorValue / denominatorValue);
    }
    const tier = ratios.filter(
      (c) =>
        ratios.filter((o) => Math.abs(o - c) <= TOLERANCE_RATIO).length === template.bandHitCount,
    );
    // Playing the tier: pick one of its members at random, score if it lands in the band.
    const inBand = tier.filter((c) => Math.abs(c - template.targetRatio) <= TOLERANCE_RATIO).length;
    total += tier.length === 0 ? 0 : inBand / tier.length;
  }
  return set.length === 0 ? 0 : total / set.length;
}

if (isMain()) {
  const perRung = Number(process.env.PER_RUNG || 12);
  const modes = ['consistent', 'perTrial'];
  const banks = {};
  let shortRungs = [];

  for (const mode of modes) {
    const built = buildBank({ systemPersistence: mode, perRung });
    banks[mode] = built.items;
    shortRungs = built.shortRungs;
    const outPath = resolve(__dirname, BANK_PATHS[mode]);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, serializeBank(built.items));
    console.log(`QUANT-GLYPHNUM-01 (${mode}): ${built.items.length} items -> ${outPath}`);
  }

  const reference = banks.consistent;
  const diffs = reference.map((it) => it.difficulty);
  const rungCounts = new Map();
  for (const it of reference) {
    const rung = round2(Math.round(it.difficulty * 2) / 2);
    rungCounts.set(rung, (rungCounts.get(rung) ?? 0) + 1);
  }
  console.log(
    `\nnotation: base ${BASE}, digits {${DIGITS.join(',')}} (zero-free), ` +
      `leftmost most significant, ${GLYPHS.length} glyphs -> ${ALL_MAPPINGS.length} relabellings`,
  );
  console.log(
    `admissible (numeral, anchor) pairs in the whole notation: ${ADMISSIBLE.length} ` +
      `(of ${NUMERALS.length} numerals x their admissible anchors)`,
  );
  console.log(
    `difficulty span: ${round2(Math.min(...diffs))} .. ${round2(Math.max(...diffs))} ` +
      `over ${rungCounts.size} distinct 0.5-point rungs`,
  );
  const under = [...rungCounts].filter(([, n]) => n < 5).map(([r]) => r);
  console.log(
    shortRungs.length || under.length
      ? `SHORT RUNGS: below ${perRung} at ${shortRungs.map((s) => `${s.rung}(${s.have})`).join(',') || 'none'}; ` +
          `below 5 at ${under.join(',') || 'none'}`
      : `every one of the ${rungCounts.size} rungs from ${LADDER_MIN.toFixed(1)} to 20.0 carries ${perRung} items`,
  );
  console.log(
    `NO K-1 SUPPLY, and it is a property of the notation: a K-1 item may not need two marks ` +
      `integrated (§4.3), and every such\n  pair is decided by a support-aware brute force. The ladder ` +
      `therefore starts at ${LADDER_MIN.toFixed(1)} — the 2-3 band — which is a coverage gap to ` +
      `record, not a defect to hide.`,
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

  // --- the floor, which is the measurement §5.1 gets wrong by asserting zero -----------------
  const measures = reference.map((it) => {
    const p = it.answer.targetRatio;
    const t = it.answer.tolerance;
    return Math.min(1, p + t) - Math.max(0, p - t);
  });
  const ratios = reference.map((it) => it.answer.targetRatio);
  console.log(
    `\nchance floor — what a client who does not know the answer scores:\n` +
      `  accepting interval, uniform over the whole line: ${UNIFORM_LINE_FLOOR.toFixed(4)} ` +
      `(realised min ${Math.min(...measures).toFixed(4)}, max ${Math.max(...measures).toFixed(4)} — ` +
      `exact on every item, because every target sits at least one tolerance from both ends)\n` +
      `  uniform over the SUPPORT [${SUPPORT_MIN}, ${SUPPORT_MAX}]: ${CHANCE_FLOOR.toFixed(4)} = 1/${(1 / CHANCE_FLOOR).toFixed(0)}. ` +
      `This is the one the estimator takes; realised support ` +
      `[${Math.min(...ratios).toFixed(3)}, ${Math.max(...ratios).toFixed(3)}]\n` +
      `  five-option floor it replaces: 0.2000, so the reduction is ` +
      `${(0.2 / CHANCE_FLOOR).toFixed(1)}x — a 15-alternative response, not a zero-floor one`,
  );
  const paeMax = Math.max(
    ...reference.map((it) => Math.max(it.answer.targetRatio, 1 - it.answer.targetRatio)),
  );
  console.log(
    `  worst M-PAE a slider can produce: ${paeMax.toFixed(3)} (policy.ts normalises over [0, 0.5] ` +
      `and clamps, so anything past half the line reads as maximally wrong)`,
  );

  // --- anti-leak ------------------------------------------------------------------------------
  const SLICES = [
    [1, 5],
    [5, 10],
    [10, 15],
    [15, 20.01],
  ];
  const hits = reference.map((it) => it.provenance.template.bandHitCount);
  const supported = reference.map((it) => it.provenance.template.onSupportCount);
  const supportRates = reference.map(
    (it) => it.provenance.template.bandHitCount / it.provenance.template.onSupportCount,
  );
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(
    `\nanti-leak (all ${ALL_MAPPINGS.length} glyph->digit relabellings brute-forced per item):\n` +
      `  mean relabellings landing in the band: ${mean(hits).toFixed(2)} / ${ALL_MAPPINGS.length}\n` +
      `  plain brute force: ${((100 * Math.max(...hits)) / ALL_MAPPINGS.length).toFixed(1)}% worst item, ` +
      `${((100 * mean(hits)) / ALL_MAPPINGS.length).toFixed(1)}% bank mean, against a ` +
      `${(100 * UNIFORM_LINE_FLOOR).toFixed(1)}% whole-line floor\n` +
      `  brute force RESTRICTED TO THE SUPPORT — the stronger attacker, because the bank's target ` +
      `window is itself\n    information: ${(100 * Math.max(...supportRates)).toFixed(1)}% worst item, ` +
      `${(100 * mean(supportRates)).toFixed(1)}% bank mean, against a ` +
      `${(100 * CHANCE_FLOOR).toFixed(1)}% support floor (mean ${mean(supported).toFixed(1)} of ` +
      `${ALL_MAPPINGS.length} readings survive the support)`,
  );
  const whole = bestFixedPlacement(reference);
  const perRungFloor = 1 / perRung;
  console.log(
    `  best FIXED placement over the whole bank: ${(100 * whole.rate).toFixed(1)}% at ratio ${whole.at}\n` +
      `  neighbour-count attack (what pricing residual ambiguity into difficulty would have cost): ` +
      `${(100 * neighbourCountAttack(reference)).toFixed(1)}%`,
  );
  const join = scrapedBankJoin(reference);
  console.log(
    `  scraped-bank join (whole bank + served difficulty + visible repeat shape): ` +
      `${(100 * join.rate).toFixed(1)}% over ${join.cells} cells, mean ${join.meanCell.toFixed(1)} ` +
      `items/cell, ${join.singletons} singleton cell(s).\n` +
      `    Bounded below by 1/perRung = ${(100 * perRungFloor).toFixed(1)}% for arithmetic reasons: ${perRung} ` +
      `items spread over a support of width ${(SUPPORT_MAX - SUPPORT_MIN).toFixed(2)} cannot put fewer than one\n` +
      `    of them in the best ${(2 * TOLERANCE_RATIO).toFixed(2)}-wide window. This is the exposure per-session ` +
      `re-keying does NOT close for this type,\n    because the target ratio is a property of the ` +
      `template and re-keying leaves it where it is.`,
  );
  console.log(
    '  | difficulty | n | mean band hits | brute force | best fixed placement | mean vocab | mean digitsNeeded |',
  );
  for (const [lo, hi] of SLICES) {
    const set = reference.filter((it) => it.difficulty >= lo && it.difficulty < hi);
    if (set.length === 0) continue;
    const sliceHits = set.map((it) => it.provenance.template.bandHitCount);
    const fixed = bestFixedPlacement(set);
    const meanOf = (f) => (set.reduce((a, it) => a + f(it), 0) / set.length).toFixed(2);
    console.log(
      `  | ${lo}-${hi === 20.01 ? 20 : hi} | ${set.length} | ` +
        `${(sliceHits.reduce((a, b) => a + b, 0) / set.length).toFixed(2)} | ` +
        `${((100 * sliceHits.reduce((a, b) => a + b, 0)) / (set.length * ALL_MAPPINGS.length)).toFixed(1)}% | ` +
        `${(100 * fixed.rate).toFixed(1)}% at ${fixed.at} | ` +
        `${meanOf((it) => it.provenance.levers.vocabularyInPlay)} | ` +
        `${meanOf((it) => it.provenance.template.digitsNeeded)} |`,
    );
  }
  const r = pearson(
    diffs,
    reference.map((it) => it.answer.targetRatio),
  );
  console.log(
    `  difficulty x targetRatio correlation: r = ${r.toFixed(4)} — sorting a scraped bank by the ` +
      `served difficulty does not\n    say where on the line the answer sits, which is ` +
      `STAGE2_ANTILEAK_COMPARISON §7.2's attack on the old build (32.9% against a 20.0% floor)`,
  );

  // --- the demonstration schedule, and where it is NOT -----------------------------------------
  const leaked = reference.filter((it) => 'demonstration' in it.content);
  console.log(
    `\ndemonstration schedule: emitted on ${reference.length}/${reference.length} templates ` +
      `(server-only), present in \`content\` on ${leaked.length} items — it must be 0, because one ` +
      `worked example against a fixed anchor collapses the 120 candidates to about one and would ` +
      `hand the browser that item's own answer`,
  );
  const stages = new Set(
    reference.flatMap((it) => it.provenance.template.demonstration.examples.map((e) => e.stage)),
  );
  console.log(`  fade stages emitted: ${[...stages].join(' -> ')} -> symbolic (no depiction)`);

  // --- equating (U3(g)): the two banks must differ ONLY in persistence ------------------------
  const a = banks.consistent;
  const b = banks.perTrial;
  const mismatches = [];
  if (a.length !== b.length) mismatches.push(`item counts ${a.length} vs ${b.length}`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].difficulty !== b[i].difficulty) mismatches.push(`item ${i}: difficulty`);
    if (a[i].answer.targetRatio !== b[i].answer.targetRatio) mismatches.push(`item ${i}: target`);
    if (a[i].answer.tolerance !== b[i].answer.tolerance) mismatches.push(`item ${i}: tolerance`);
    if (a[i].answer.lineMax !== b[i].answer.lineMax) mismatches.push(`item ${i}: line maximum`);
    if (a[i].provenance.template.numeral.join('') !== b[i].provenance.template.numeral.join(''))
      mismatches.push(`item ${i}: numeral`);
  }
  console.log(
    `\nequating: ${
      mismatches.length === 0
        ? 'the two banks match on every scored property — exact by construction, because the ' +
          'template stores digit VALUES so re-keying cannot move the target, the tolerance or a lever'
        : `MISMATCH — ${mismatches.slice(0, 5).join('; ')}`
    }`,
  );
  console.log(
    `persistence: consistent bank uses ${new Set(a.map((it) => it.answer.system.systemId)).size} system(s); ` +
      `perTrial bank uses ${new Set(b.map((it) => it.answer.system.systemId)).size} (one per item)`,
  );

  console.log(
    '\nNOT GATED. Gate B needs ~128 real children (§4.1.3); no synthetic run substitutes. A\n' +
      'continuous-response type is outside every Gate A cell measured before it, so Gate A is\n' +
      're-read for this bank in E-211. The consistent arm is the live bank; the scrambled arm lives\n' +
      'outside banks/ and is never served.',
  );
}
