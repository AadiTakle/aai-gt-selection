// FLU-OPCHAIN-01 "Machine Chain" — DUAL-MODE structured bank generator (Bucket A: grammar).
//
// A Stage 2 learning-block type, built to STAGE2_QUESTION_DESIGN.md §3.1 and §9.2 (U3) under
// D-S2-1 (the block stays in fluid reasoning), D-S2-2 (purpose-designed, NOT an extension of
// FLU-CONCEPT-01) and D-S2-3 (the scrambled-system control is a binding gate).
//
// THE TASK. A row of 2-4 badges shows the operators a machine will apply, in order, to a small
// figure. Six operators, drawn with arbitrary badge symbols. The child taps which of five output
// figures the machine produces. One tap, five fixed positions, no drag and no construction.
//
// ---------------------------------------------------------------------------
// WHY THIS IS ONE GENERATOR AND TWO BANKS, AND WHY THAT IS THE WHOLE POINT
//
// D-S2-3 makes the scrambled-system control an acceptance GATE, and §4.1.1 makes it a generator
// MODE rather than a separate artifact: if the two arms came off different code paths or were drawn
// by different renderers, the contrast would be confounded with the generator or the renderer and
// the gate would be measuring the wrong difference. So `systemPersistence` is a parameter of this
// file, present from its first commit:
//
//   consistent  one badge->operator mapping for the WHOLE bank. What the child learns on trial 1
//               is still true on trial 30, so knowledge of the system transfers across items —
//               which is the only thing that can transfer, because no item ever repeats.
//   perTrial    a FRESH mapping every item. Every badge is new every trial, so nothing carries
//               forward. Any climb observed here is the design's contamination floor: practice,
//               warm-up, residual interface learning, guessing, regression at the handover, and
//               difficulty misspecification, summed.
//
// The two banks are equated by CONSTRUCTION, not by inspection. The OPERATOR chain is drawn from
// the lever tuple and the seed, identically in both modes; the BADGE chain is then the mapping's
// inverse image of it. So the input figure, all five option figures, the key, the key position, the
// distractor slate and the stated difficulty are IDENTICAL across the two banks item for item. The
// only difference in `content` is which badge symbols label the chain, and the badge tray is always
// listed in one canonical order so the tray itself carries no information in either mode.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// WHY THE KEY IS NOT DERIVABLE FROM `content` (E-075/E-076)
//
// `content` gives the input figure, the badge chain and five candidate outputs. Recovering the key
// needs the badge->operator mapping, and the mapping lives under `answer.system`, which
// `servedItemSchema` omits wholesale. Two content-computable shortcuts are closed explicitly:
//
//   1. "pick the option that differs most from the input." Every item is required to carry at least
//      one DISTANCE-MATCHED distractor — one whose figure differs from the input in as many
//      components as the key does — so the key is never the unique argmax of surface change. This
//      is asserted here and re-derived independently by check-FLU-OPCHAIN-01.mjs.
//   2. "the key sits in the modal slot." Key positions are allocated round-robin over the five
//      slots, so the modal-key advantage is at the arithmetic floor for a 5-option item (E-094).
//
// The reveal a learning block needs — the machine completing its action after the child commits —
// is deliberately NOT in `content`. The renderer cannot know the correct output; the host supplies
// it after `/api/exam-submit` has scored the trial. That is a U6/U7 requirement recorded here
// because putting the reveal in the bank would hand the key to the browser.
// ---------------------------------------------------------------------------
//
// GOVERNANCE. Born-synthetic only (syntheticOnly:true, validated:false). `difficulty` is a DESIGN
// rung on the shared 1..20 scale computed from the declared levers, NOT a calibrated IRT parameter.
// NOTHING HERE IS GATED: Gate B needs ~128 real children (§4.1.3) and no synthetic run can stand in
// for them, so the honest status of this type is "gate-ready, ungated". It is not wired into the
// live learning block.
//
// Run:  node research/exam-question-types/generators/FLU-OPCHAIN-01.mjs
//       writes ../banks/FLU-OPCHAIN-01.consistent.jsonl and ../banks/FLU-OPCHAIN-01.perTrial.jsonl
//       and prints a coverage + equating summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ================================================================== *
 * THE OPERATOR VOCABULARY — a small closed set whose primitives COMPOSE.
 *
 * §1.3 is the reason there are six of these rather than one hidden rule: a
 * single rule to discover produces a STEP (chance until insight, ceiling
 * after), and fitting a linear lambda to a step wastes most of 30 trials.
 * A composable vocabulary makes "having learned it" a ladder — know one
 * primitive, chain two, chain three, extend to a pair never demonstrated.
 *
 * Three of the six act on the figure's ORIENTATION and generate the dihedral
 * group D4, so they do not commute: applying `turn` then `flip` lands somewhere
 * different from `flip` then `turn`. That non-commutativity is what makes
 * "the badges compose IN ORDER" a real thing to learn rather than a slogan,
 * and it is the difficulty lever §3.1 calls order-sensitivity.
 *
 * The other three toggle independent attributes and commute with everything.
 * A chain built only from those is order-free and therefore easier, which is
 * the other half of the same lever.
 * ================================================================== */
export const GEOMETRIC_OPS = ['turn', 'flip', 'slant'];
export const ATTRIBUTE_OPS = ['swap', 'ring', 'twin'];
export const OPERATORS = [...GEOMETRIC_OPS, ...ATTRIBUTE_OPS];
export const isGeometric = (op) => GEOMETRIC_OPS.includes(op);

/**
 * Badge symbols. Six neutral shapes, in ONE canonical order in every item of
 * both banks, so the tray never hints at the mapping. They are labels the
 * renderer draws; they are deliberately not the figure glyph vocabulary.
 */
export const BADGE_SYMBOLS = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];

/**
 * Figure glyphs. Every one is CHIRAL and has no rotational symmetry, which is
 * not decoration: if the glyph were symmetric, `flip` and `turn` would be
 * invisible and the geometric half of the vocabulary would be unlearnable.
 */
export const GLYPHS = ['flag', 'hook', 'boot', 'comma'];

/**
 * WHAT REPLACED §3.1's "undemonstrated combination" LEVER, AND WHY IT HAD TO GO.
 *
 * §3.1 lists five difficulty levers. Two of them are not properties of an item:
 * "whether the chained pair has been demonstrated before in this child's block"
 * is a property of a SEQUENCE, and "number of operators in the active
 * vocabulary" is fixed for the whole block by the same section. §1.1(d) requires
 * difficulty to be computable per item, so neither can be priced here — every
 * attempt to encode the first as a per-item flag either duplicates the
 * order-sensitivity lever or charges load to attribute-only chains where
 * reordering provably changes nothing, which is precisely the structured
 * labelling error §1.1(d) says biases lambda rather than merely attenuating it.
 *
 * The replacement is REPRESENTATIONAL MIXING: whether the chain mixes geometric
 * and attribute operators. A chain of three toggles is bookkeeping; a chain that
 * interleaves toggles with orientation changes forces the child to carry an
 * imagined intermediate FIGURE through steps that do not touch it. That is a
 * real load, it is derived from (depth, geom) rather than added as a free
 * parameter that could be unreachable, and it is checkable.
 */
export const isMixed = (depth, geom) => (geom > 0 && geom < depth ? 1 : 0);

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

/* ================================================================== *
 * FIGURE SEMANTICS
 *
 * Orientation is an element of D4 written uniquely as r^a m^b, with `a` quarter
 * turns clockwise and `b` a mirror flag. The product below is the D4 relation
 * m r = r^-1 m; it is the entire reason `turn` and `flip` fail to commute, so
 * it is worth reading rather than trusting.
 * ================================================================== */
export function composeOrient(g, o) {
  return {
    a: (((g.a + (g.b ? -o.a : o.a)) % 4) + 4) % 4,
    b: (g.b + o.b) % 2,
  };
}

/** Each geometric operator as the D4 element it left-multiplies by. */
export const GEOM_ELEMENT = {
  turn: { a: 1, b: 0 }, // quarter turn clockwise
  flip: { a: 0, b: 1 }, // mirror
  slant: { a: 1, b: 1 }, // mirror about a diagonal
};

/** Apply one operator to a figure state. Pure; never mutates. */
export function applyOp(op, figure) {
  if (isGeometric(op)) {
    return { ...figure, orient: composeOrient(GEOM_ELEMENT[op], figure.orient) };
  }
  if (op === 'swap') return { ...figure, shade: figure.shade === 'solid' ? 'hollow' : 'solid' };
  if (op === 'ring') return { ...figure, border: figure.border ? 0 : 1 };
  if (op === 'twin') return { ...figure, pair: figure.pair ? 0 : 1 };
  throw new Error(`unknown operator "${op}"`);
}

/** Apply a chain left-to-right: the first badge acts first. */
export function applyChain(chain, figure) {
  return chain.reduce((state, op) => applyOp(op, state), figure);
}

export const figureKey = (f) =>
  `${f.glyph}|${f.orient.a}${f.orient.b}|${f.shade}|${f.border}|${f.pair}`;

/**
 * Surface change between two figures, counted in components. Orientation counts
 * as ONE component however far it moved, because a child comparing pictures sees
 * "pointing a different way", not a rotation count.
 *
 * This is the metric the anti-leak invariant is stated in: the key must never be
 * the unique option that changed the most.
 */
export function figureDistance(a, b) {
  let d = 0;
  if (a.orient.a !== b.orient.a || a.orient.b !== b.orient.b) d += 1;
  if (a.shade !== b.shade) d += 1;
  if (a.border !== b.border) d += 1;
  if (a.pair !== b.pair) d += 1;
  return d;
}

/* ================================================================== *
 * DIFFICULTY MODEL — from the declared levers, monotone by construction.
 *
 * §1.1(d) is why this is arithmetic over generator parameters rather than a
 * hand label: the block serves systematically different item subsets early and
 * late, so any difficulty error that correlates with the composition of those
 * subsets correlates with trialIndex, and correlated error in `b` maps straight
 * onto `lambda`. Random labelling error only attenuates; structured labelling
 * error BIASES. Every term below is countable from the item's own levers and
 * strictly signed, so check-FLU-OPCHAIN-01.mjs can assert monotonicity in each
 * lever without knowing anything about children.
 *
 * Composition depth dominates because it is the ladder the learnable thing
 * unlocks (§1.3). Order-sensitivity is priced separately from geometric count
 * because holding an intermediate figure in mind is the step that separates a
 * child who has abstracted "compose in badge order" from one who has not.
 * ================================================================== */
export const DEPTH_LOAD = { 1: 0, 2: 2.4, 3: 4.4, 4: 6.0 };
/** Load per geometric operator: an imagined intermediate figure, not a toggle. */
const GEOM_WEIGHT = 0.9;
/** Extra load once TWO distinct geometric operators are in play, so order matters. */
const ORDER_WEIGHT = 1.5;
/** Load for interleaving orientation changes with attribute toggles. */
const MIX_WEIGHT = 1.2;
/** Span of the continuous distractor-distance lever, the within-rung positioner. */
const SIMILARITY_SPAN = 2.6;

export function baseScore({ depth, geom }) {
  return (
    1.0 +
    DEPTH_LOAD[depth] +
    GEOM_WEIGHT * geom +
    ORDER_WEIGHT * Math.max(0, geom - 1) +
    MIX_WEIGHT * isMixed(depth, geom)
  );
}

/**
 * Every lever combination the grammar can build.
 *
 * `geom` counts DISTINCT geometric operators, because no operator repeats inside
 * a chain — see `buildChain`. `depth - geom` attribute operators must also be
 * distinct, and there are only three of them, which is what bounds `geom` below.
 * Every entry here is reachable by construction; there is no filtering step,
 * because an unreachable config would mean a difficulty the bank claims to serve
 * and cannot.
 */
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const depth of [1, 2, 3, 4]) {
    const minGeom = Math.max(0, depth - ATTRIBUTE_OPS.length);
    for (let geom = minGeom; geom <= Math.min(depth, GEOMETRIC_OPS.length); geom++) {
      out.push({ depth, geom });
    }
  }
  return out;
})();

const ALL_BASES = ALLOWED_CONFIGS.map(baseScore);
const RAW_MIN = Math.min(...ALL_BASES);
const RAW_MAX = Math.max(...ALL_BASES) + SIMILARITY_SPAN;

/** Lever tuple -> design rung on the shared 1..20 scale. */
export function difficultyFromLevers(cfg, distractorSimilarity) {
  const raw = baseScore(cfg) + SIMILARITY_SPAN * distractorSimilarity;
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}

function solveSimilarity(cfg, targetDifficulty) {
  const rawNeeded = RAW_MIN + ((targetDifficulty - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(cfg)) / SIMILARITY_SPAN, 0, 1);
}

/* ================================================================== *
 * BANDS — the developmental floor §4.3 requires, expressed over depth.
 *
 * Li et al. (2024) found 6-7-year-olds mostly best fit by a RANDOM-RESPONSE
 * model on an information-integration structure, so §4.3 forbids multi-
 * dimensional integration at the young bands: unidimensional and low-depth
 * composition only. Depth is exactly that dimensionality here, so the band
 * ladder is a cap on depth, and it is checkable from the levers alone.
 * ================================================================== */
export const BANDS = [
  { band: 'K-1', lo: 1, hi: 4, maxDepth: 1 },
  { band: '2-3', lo: 4, hi: 8, maxDepth: 2 },
  { band: '4-5', lo: 8, hi: 12, maxDepth: 3 },
  { band: '6-8', lo: 12, hi: 20, maxDepth: 4 },
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
 * THE HIDDEN SYSTEM — a badge->operator bijection.
 *
 * `consistent` draws one and holds it for the whole bank. `perTrial` draws a
 * fresh one per item. Nothing else about the item changes with the mode.
 * ================================================================== */
export function drawSystem(seed) {
  const rng = makeRng(`system|${seed}`);
  const ops = shuffle(OPERATORS, rng);
  const mapping = {};
  BADGE_SYMBOLS.forEach((symbol, i) => {
    mapping[symbol] = ops[i];
  });
  return { systemId: `sys-${seed}`, mapping };
}

/** Badge that means `op` under this mapping. */
function badgeFor(system, op) {
  const found = Object.keys(system.mapping).find((symbol) => system.mapping[symbol] === op);
  if (!found) throw new Error(`system ${system.systemId} has no badge for "${op}"`);
  return found;
}

/* ================================================================== *
 * CHAIN CONSTRUCTION
 *
 * No operator repeats inside a chain. That is a correctness constraint, not
 * tidiness: five of the six operators are involutions, so a repeat would cancel
 * and the chain would silently be shorter than its stated depth, which is
 * exactly the structured difficulty error §1.1(d) warns biases lambda.
 * ================================================================== */
export function buildChain({ depth, geom }, rng) {
  const attrCount = depth - geom;
  for (let attempt = 0; attempt < 200; attempt++) {
    const geomPicks = shuffle(GEOMETRIC_OPS, rng).slice(0, geom);
    const attrPicks = shuffle(ATTRIBUTE_OPS, rng).slice(0, attrCount);
    const chain = shuffle([...geomPicks, ...attrPicks], rng);
    if (chain.length !== depth) continue;
    if (geom > 0 && geometricPartIsIdentity(chain)) continue;
    return chain;
  }
  return null;
}

/**
 * Whether the chain's geometric operators cancel out.
 *
 * Not a corner case: in D4, `slant` then `flip` then `turn` composes to the
 * identity, so a chain of three DISTINCT orientation badges can leave the figure
 * pointing exactly as it started. Such an item is far easier than its stated
 * depth — the child can ignore three badges and still be right — which makes its
 * difficulty label wrong in a way that correlates with which configs the
 * targeting rule serves late in the block. That is the §1.1(d) bias, not noise,
 * so these chains are rejected rather than merely noted.
 */
export function geometricPartIsIdentity(chain) {
  let orient = { a: 0, b: 0 };
  for (const op of chain) {
    if (isGeometric(op)) orient = composeOrient(GEOM_ELEMENT[op], orient);
  }
  return orient.a === 0 && orient.b === 0;
}

/* ================================================================== *
 * DISTRACTORS — each one a NAMED incomplete version of the system.
 *
 * §4.6 makes this a build requirement rather than a nicety: with every wrong
 * option encoding a specific partial rule, each response is classifiable, which
 * gives both a falsification test (in a real learner errors should migrate from
 * random toward omitted-operator and wrong-order) and the ordinal fallback the
 * §4.1.4 Verdict-2 branch depends on. The fallback has to exist at the moment
 * the gate returns Verdict 2, not a build cycle later.
 *
 * `nearness` orders the failures from "almost had it" to "did not engage", and
 * the item's `distractorSimilarity` lever picks a slate along that axis. Each
 * label maps to a lure class already registered in item-shape.mjs, so
 * M-ERRTYPE / M-RULEID stay computable without widening the coarse enum.
 * ================================================================== */
const FAILURES = [
  { kind: 'order_error', lure: 'order_error', nearness: 1.0 },
  { kind: 'over_application', lure: 'over_application', nearness: 0.85 },
  { kind: 'omission', lure: 'omission', nearness: 0.7 },
  { kind: 'wrong_operator', lure: 'wrong_operator', nearness: 0.55 },
  { kind: 'first_step_only', lure: 'first_step_only', nearness: 0.25 },
  { kind: 'identity_copy', lure: 'identity_copy', nearness: 0.0 },
];
const NEARNESS = Object.fromEntries(FAILURES.map((f) => [f.kind, f.nearness]));

/** Every partial rule this chain admits, as {ruleId, kind, chain, note}. */
export function partialRules(chain) {
  const out = [];
  const label = (ops) => (ops.length ? ops.join('>') : 'none');

  for (let i = 0; i + 1 < chain.length; i++) {
    const swapped = chain.slice();
    [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
    out.push({
      ruleId: `reorder@${i}:${label(swapped)}`,
      kind: 'order_error',
      chain: swapped,
      note: `applied badge ${i + 1} and badge ${i + 2} in the wrong order`,
    });
  }
  for (let i = 0; i < chain.length; i++) {
    const doubled = [...chain.slice(0, i + 1), chain[i], ...chain.slice(i + 1)];
    out.push({
      ruleId: `twice@${i}:${label(doubled)}`,
      kind: 'over_application',
      chain: doubled,
      note: `applied badge ${i + 1} twice`,
    });
  }
  for (let i = 0; i < chain.length; i++) {
    const dropped = chain.filter((_, j) => j !== i);
    out.push({
      ruleId: `drop@${i}:${label(dropped)}`,
      kind: 'omission',
      chain: dropped,
      note: `skipped badge ${i + 1}`,
    });
  }
  for (let i = 0; i < chain.length; i++) {
    for (const op of OPERATORS) {
      if (chain.includes(op)) continue;
      const swappedIn = chain.slice();
      swappedIn[i] = op;
      out.push({
        ruleId: `sub@${i}=${op}:${label(swappedIn)}`,
        kind: 'wrong_operator',
        chain: swappedIn,
        note: `read badge ${i + 1} as a different operator`,
      });
    }
  }
  if (chain.length > 1) {
    out.push({
      ruleId: `firstOnly:${label(chain.slice(0, 1))}`,
      kind: 'first_step_only',
      chain: chain.slice(0, 1),
      note: 'applied only the first badge and stopped',
    });
  }
  out.push({
    ruleId: 'identity:none',
    kind: 'identity_copy',
    chain: [],
    note: 'applied no operator at all',
  });
  return out;
}

/**
 * Choose four distractors along the nearness axis at `similarity`.
 *
 * The last clause is the anti-leak invariant and it is not optional: at least
 * one chosen distractor must move as far from the input as the key does, or
 * "tap whichever picture changed the most" would score above chance without any
 * knowledge of the system at all.
 */
function chooseDistractors(chain, input, key, similarity) {
  const rules = partialRules(chain);
  const seen = new Set([figureKey(key)]);
  const scored = rules
    .map((rule) => ({ rule, output: applyChain(rule.chain, input) }))
    .filter(({ output }) => {
      const k = figureKey(output);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((entry) => ({
      ...entry,
      cost: Math.abs(NEARNESS[entry.rule.kind] - similarity),
      distance: figureDistance(input, entry.output),
    }))
    .sort((a, b) => a.cost - b.cost || (a.rule.ruleId < b.rule.ruleId ? -1 : 1));

  const keyDistance = figureDistance(input, key);
  const chosen = scored.slice(0, 4);
  if (chosen.length < 4) return null;

  if (!chosen.some((c) => c.distance >= keyDistance)) {
    const matched = scored.find((c) => c.distance >= keyDistance);
    if (!matched) return null;
    chosen[chosen.length - 1] = matched;
  }
  return chosen;
}

/* ================================================================== *
 * ONE ITEM
 * ================================================================== */

/**
 * Generate ONE structured BankItem.
 *
 * @param {{depth,geom,distractorSimilarity,keyPosition,glyphIndex,
 *          systemPersistence,systemSeed,seed}} lever
 */
export function genItem({
  depth,
  geom,
  distractorSimilarity,
  keyPosition,
  glyphIndex,
  systemPersistence,
  systemSeed,
  seed,
}) {
  if (systemPersistence !== 'consistent' && systemPersistence !== 'perTrial') {
    throw new Error(`systemPersistence must be consistent|perTrial, got "${systemPersistence}"`);
  }
  const rng = makeRng(seed);

  // The OPERATOR chain depends only on the levers and the seed — never on the mode. That is what
  // equates the two banks: both arms serve the same figures, the same key and the same difficulty,
  // and differ only in which badge symbols label the operators.
  const chain = buildChain({ depth, geom }, rng);
  if (chain === null) throw new Error(`no chain for depth=${depth} geom=${geom}`);

  const glyph = GLYPHS[glyphIndex % GLYPHS.length];
  const input = {
    glyph,
    orient: { a: Math.floor(rng() * 4), b: Math.floor(rng() * 2) },
    shade: rng() < 0.5 ? 'solid' : 'hollow',
    border: rng() < 0.5 ? 1 : 0,
    pair: rng() < 0.5 ? 1 : 0,
  };
  const key = applyChain(chain, input);
  if (figureKey(key) === figureKey(input)) {
    throw new Error(`chain ${chain.join('>')} is a no-op on its input (seed ${seed})`);
  }

  const distractors = chooseDistractors(chain, input, key, distractorSimilarity);
  if (distractors === null) throw new Error(`fewer than 4 distinct distractors (seed ${seed})`);

  const slot = keyPosition % 5;
  const optionKeys = ['A', 'B', 'C', 'D', 'E'];
  const figures = [];
  const rules = [];
  let d = 0;
  for (let i = 0; i < 5; i++) {
    if (i === slot) {
      figures.push(key);
      rules.push(null);
    } else {
      figures.push(distractors[d].output);
      rules.push(distractors[d].rule);
      d++;
    }
  }

  const system =
    systemPersistence === 'consistent'
      ? drawSystem(systemSeed)
      : drawSystem(`${systemSeed}|${seed}`);
  const badgeChain = chain.map((op) => badgeFor(system, op));

  const distractorRationales = {};
  const strategyTrace = {};
  optionKeys.forEach((optionKey, i) => {
    const rule = rules[i];
    if (rule === null) {
      distractorRationales[optionKey] = {
        lure: 'correct',
        ruleId: `full:${chain.join('>')}`,
        note: 'every badge applied once, in badge order',
      };
      strategyTrace[optionKey] = { ruleId: `full:${chain.join('>')}`, kind: 'correct' };
      return;
    }
    distractorRationales[optionKey] = {
      lure: FAILURES.find((f) => f.kind === rule.kind).lure,
      ruleId: rule.ruleId,
      partialRuleKind: rule.kind,
      note: rule.note,
    };
    strategyTrace[optionKey] = { ruleId: rule.ruleId, kind: rule.kind };
  });

  const cfg = { depth, geom };
  const difficulty = round2(difficultyFromLevers(cfg, distractorSimilarity));

  return {
    itemId: seededUuid(`${systemPersistence}|${seed}`),
    typeCode: 'FLU-OPCHAIN-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung from the levers, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-OPCHAIN-01.html',
    content: {
      typeCode: 'FLU-OPCHAIN-01',
      // The full vocabulary, always in canonical order, so the tray leaks nothing in either mode.
      badgeTray: BADGE_SYMBOLS.slice(),
      input: { ...input, orient: { ...input.orient } },
      // Surface chain only. The operator each badge stands for is server-only.
      chain: badgeChain,
      options: optionKeys.map((optionKey, i) => ({
        key: optionKey,
        figure: { ...figures[i], orient: { ...figures[i].orient } },
      })),
    },
    answer: {
      correctKey: optionKeys[slot],
      // SERVER-ONLY: the system itself. Shipping this would make every item a lookup.
      system: { systemId: system.systemId, mapping: { ...system.mapping } },
      operatorChain: chain.slice(),
      badgeChain: badgeChain.slice(),
      // §4.6's per-trial strategy trace: which partial rule each option is consistent with.
      strategyTrace,
      strategyTraceRules: FAILURES.map((f) => f.kind),
      keyDistanceFromInput: figureDistance(input, key),
      distractorRationales,
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-opchain-01-grammar@1',
      seed,
      levers: {
        depth,
        geom,
        // Derived from (depth, geom), recorded so the checker re-derives difficulty from the
        // levers alone without re-deriving the derivation.
        mixed: isMixed(depth, geom),
        // The control condition, recorded in provenance rather than content: the renderer must not
        // know which arm it is serving, and `servedItemSchema` omits provenance (§4.1.1).
        systemPersistence,
        systemSeed,
        keyPosition,
        glyphIndex,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        distractorSimilarity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

/* ================================================================== *
 * BANK BUILDER
 *
 * Fills every 0.5-point rung of the 1..20 scale with >=perRung items.
 *
 * 0.5 and not 1.0 because §1.1(c) is a bank-SHAPE requirement, not an item
 * count: a child climbing at 0.10 points/trial ends a 30-trial block wanting
 * items around `standing + 4`, and a pool that thins out before then saturates,
 * goes all-correct, and has its lambda pushed toward the bound with an inflated
 * SE — truncating the top of the distribution exactly where the interesting
 * children are. The U0 harness measures whether this bank actually delivers it
 * (Gate A check A3) rather than taking the granularity as proof.
 * ================================================================== */
export function buildBank({ systemPersistence, perRung = 6, systemSeed = 'FLU-OPCHAIN-01|v1' }) {
  const items = [];
  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));

  let keyCursor = 0;
  let glyphCursor = 0;

  for (const rung of rungs) {
    // The rung window is clipped to its BAND's window as well as to +/-0.24, so an item cannot land
    // a rounding-width across a band edge and carry the neighbouring band's depth cap with it. The
    // checker caps depth by the item's own difficulty, not by the rung it was aimed at, and without
    // this clip the two disagree at every boundary rung.
    const band = bandFor(rung);
    const lo = Math.max(1, rung - 0.24, band.lo);
    const hi = Math.min(20, rung + 0.24, band.band === '6-8' ? 20 : band.hi - 0.01);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      if (cfg.depth > band.maxDepth) continue; // §4.3 developmental floor
      const a = Math.max(lo, difficultyFromLevers(cfg, 0));
      const b = Math.min(hi, difficultyFromLevers(cfg, 1));
      if (b > a + 1e-6) segments.push({ cfg, lo: a, hi: b });
    }
    if (segments.length === 0) {
      throw new Error(`no lever config reaches rung ${rung} under the ${band.band} depth cap`);
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
      const similarity = solveSimilarity(segment.cfg, target);
      const c = segment.cfg;
      const seed = `FLU-OPCHAIN-01|rung=${rung}|i=${i}|D${c.depth}G${c.geom}`;
      items.push(
        genItem({
          ...c,
          distractorSimilarity: similarity,
          // Round-robin over both, so key position and glyph are balanced by construction
          // rather than by luck (E-094).
          keyPosition: keyCursor++ % 5,
          glyphIndex: glyphCursor++ % GLYPHS.length,
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
 * CLI entrypoint: write BOTH banks and print coverage + equating summary.
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}
if (isMain()) {
  const perRung = Number(process.env.PER_RUNG || 6);
  const modes = ['consistent', 'perTrial'];
  const banks = {};

  for (const mode of modes) {
    const items = buildBank({ systemPersistence: mode, perRung });
    banks[mode] = items;
    const outPath = resolve(__dirname, `../banks/FLU-OPCHAIN-01.${mode}.jsonl`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, serializeBank(items));
    console.log(`FLU-OPCHAIN-01 (${mode}): ${items.length} items -> ${outPath}`);
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
  for (const it of reference) keyCounts[it.answer.correctKey] = (keyCounts[it.answer.correctKey] ?? 0) + 1;
  console.log(
    `key positions (all items are 5-option, so one stratum): ` +
      Object.entries(keyCounts)
        .sort()
        .map(([k, n]) => `${k}:${n} (${((100 * n) / reference.length).toFixed(1)}%)`)
        .join('  '),
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
      mismatches.push(`item ${i}: option figures`);
    if (a[i].answer.operatorChain.join('>') !== b[i].answer.operatorChain.join('>'))
      mismatches.push(`item ${i}: operator chain`);
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
    '\nNOT GATED. Gate B needs ~128 real children (§4.1.3); no synthetic run substitutes. This is a\n' +
      'gate-ready type, and it is not wired into the live learning block.',
  );
}
