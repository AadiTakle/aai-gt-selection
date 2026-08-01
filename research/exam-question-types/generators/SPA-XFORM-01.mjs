// SPA-XFORM-01 "Transform Machine" — DUAL-MODE structured bank generator (Bucket A: grammar).
//
// A Stage 2 learning-block type, built to STAGE2_QUESTION_DESIGN.md §3.4 and §9.2 (U2/U3) under
// D-S2-3 (the scrambled-system control is a binding gate). FLU-OPCHAIN-01 is the reference
// implementation and this file mirrors its structure deliberately.
//
// THE TASK. A machine shows one to three badges, in order, then applies the transformations they
// stand for to a small block figure on a 4x4 lattice. The child taps which of five figures the
// machine produces. One tap, five fixed positions, no drag and no construction.
//
// ---------------------------------------------------------------------------
// WHY THIS IS ONE GENERATOR AND TWO BANKS
//
// §4.1.1 makes the scrambled control a generator MODE rather than a separate artifact: two code
// paths or two renderers would confound the arm contrast with the generator or the renderer.
// `systemPersistence` is therefore a parameter of this file, present from its first commit:
//
//   consistent  one badge->operator mapping for the WHOLE bank, so what the child learns on trial
//               1 is still true on trial 30 and knowledge of the system is the only thing that can
//               transfer, because no item ever repeats.
//   perTrial    a FRESH mapping every item, so nothing carries forward. Any climb observed here is
//               the contamination floor: practice, warm-up, residual interface learning, guessing,
//               regression at the handover and difficulty misspecification, summed.
//
// The two banks are equated by CONSTRUCTION. The OPERATOR chain is drawn from the lever tuple and
// the seed, identically in both modes; the BADGE chain is that chain's inverse image under the
// mapping. So the input figure, all five option figures, the key, the key slot, the distractor
// slate, the age band and the stated difficulty are identical item for item. The only difference in
// `content` is which badge symbols label the chain, and the badge tray is always listed in one
// canonical order so the tray itself carries no information in either mode.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// THE SPATIAL-SPECIFIC RISK, AND WHAT IS DONE ABOUT IT
//
// §3.4 names this type the most likely of the four to fail the scrambled-system control, because
// mental-rotation practice improves within a session for everyone and would produce a climb in
// BOTH arms that owes nothing to the hidden system. Four design decisions target that directly,
// and each is measured rather than asserted:
//
//   1. ROTATION IS A MINORITY OF THE VOCABULARY, AND IS NEVER REQUIRED. One of six operators is a
//      rotation and a second is a reflection; the other four are rearrangements that no amount of
//      rotation skill executes. `turns` — how many orientation operators the chain uses — is a
//      free lever with 0 in range at every depth, so a rung of the ladder is always reachable with
//      no rotation at all. `buildBank` reports the share of the bank that needs none.
//   2. THE MAPPING-BLIND CEILING IS HELD NEAR CHANCE. At least four of the five options on every
//      item are figures that SOME injective badge->operator relabelling produces. A solver with
//      perfect spatial execution and no knowledge of the mapping therefore cannot narrow below
//      1-in-4 against a 1-in-5 chance baseline: executing the transformations better does not
//      identify the answer, and only knowing which badge means which transformation does.
//   3. NEITHER INK NOR DISPLACEMENT CARRIES SIGNAL. Every operator is a permutation of the 16
//      lattice cells, so every option shows exactly as many blocks as the input — "count the
//      blocks" is dead by construction. And at least one distractor sits at EXACTLY the key's
//      displacement from the input, so "which picture moved the most" is dead too.
//   4. BOTH ARMS SERVE THE SAME FIGURES. Whatever rotation practice accrues, accrues equally in
//      the consistent and scrambled arms and is differenced out by the gate.
//
// Scoring is accuracy only. Response time is recorded as a diagnostic and never enters the fitted
// rate, because rotation latency is exactly the quantity that improves with practice (§3.4).
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// WHY THE KEY IS NOT DERIVABLE FROM `content` (E-075/E-076)
//
// `content` gives the input figure, the badge chain and five candidate figures. Recovering the key
// needs the badge->operator mapping, which lives under `answer.system` and which `servedItemSchema`
// omits wholesale. Two content-computable shortcuts are closed explicitly, both asserted here and
// re-derived independently by check-SPA-XFORM-01.mjs:
//
//   1. "tap whichever picture moved the most." At least one distractor is DISPLACEMENT-MATCHED to
//      the key — exactly as many blocks in new cells — so the key is never the unique argmax of
//      surface change, and is not separable by displacement at all.
//   2. "brute-force every mapping." A mapping is a badge->operator bijection and the badges in a
//      chain are distinct, so guessing it is exactly guessing an ordered selection of `depth`
//      distinct operators — at most 6*5*4 = 120 of them at this type's maximum depth. If only ONE
//      option were consistent with any of them the key would be determined by `content` and the
//      hidden system never needed. The reference type shipped with that leak open on 11 of 234
//      items, every one of them a maximum-depth chain whose relabellings collapsed onto the key.
//      Here the invariant is built in from the first commit and set four times stronger than the
//      bare "not unique" floor: at least FOUR of five options must be relabelling-reachable.
//
// The reveal a learning block needs — the machine completing its action after the child commits —
// is deliberately NOT in `content`. The renderer cannot know the correct figure; the host supplies
// it after the server has scored the trial. That is a U6/U7 requirement recorded here because
// putting the reveal in the bank would hand the key to the browser.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// NOTHING IN THE VISUAL VOCABULARY MAY RESEMBLE INTERFACE CHROME
//
// A blind audit of the reference type found its `ring` operator — "add a border" — drawn as a
// rounded rectangle indistinguishable from a UI border, so children were inducing over the
// furniture rather than over the figure. The structural fix is not a naming convention:
//
//   EVERY OPERATOR IS A PERMUTATION OF THE 16 LATTICE CELLS. No operator adds, removes, encloses,
//   outlines, recolours or decorates anything; the only thing that ever changes is WHERE THE
//   BLOCKS ARE. There is therefore no operator effect a renderer could draw as a border, frame,
//   ring, halo, badge or any other element that reads as interface furniture.
//
// That is checkable rather than promised: `assertNoChrome()` below verifies each operator is a
// bijection on the cell set, and the lexical half of the same audit rejects any operator or badge
// name drawn from the chrome vocabulary. The one remaining exposure is the SUBSTRATE — a ruled 4x4
// box reads as a table — so the renderer contract recorded for U6 is that the lattice is drawn as
// faint dots and never as a ruled or boxed table.
// ---------------------------------------------------------------------------
//
// GOVERNANCE. Born-synthetic only (syntheticOnly:true, validated:false). `difficulty` is a DESIGN
// rung on the shared 1..20 scale computed from the declared levers, NOT a calibrated IRT parameter.
// NOTHING HERE IS GATED: Gate A has not been run on this bank and Gate B needs ~128 real children
// (§4.1.3), so the honest status of this type is "specced and generated, ungated". It is not wired
// into the live learning block.
//
// WHERE THE TWO BANKS ARE WRITTEN. `banks/` is the SERVED directory — `bank-loader.ts` builds every
// path it reads inside it and `sync-exam-demos.mjs` globs it to decide what is wired — so the
// consistent arm is written there as the plain `banks/SPA-XFORM-01.jsonl` and the scrambled arm is
// written to `control-banks/`, a directory no application code names. That is the same arrangement
// FLU-OPCHAIN-01 uses, and it is a stronger guarantee than a filename convention.
//
// Run:  node research/exam-question-types/generators/SPA-XFORM-01.mjs
//       writes ../banks/SPA-XFORM-01.jsonl (consistent, live) and
//       ../control-banks/SPA-XFORM-01.perTrial.jsonl (scrambled control, never served)
//       and prints a coverage, anti-leak and equating summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ================================================================== *
 * THE LATTICE
 *
 * A 4x4 grid of cells, indexed r*4+c. A FIGURE is a set of occupied
 * cells — the blocks — and nothing else. There is no colour, no fill
 * state, no border and no marker, because every one of those is an
 * attribute an operator could toggle, and an operator that toggles an
 * attribute is an operator a renderer has to draw as decoration.
 * ================================================================== */
export const GRID = 4;
export const CELLS = GRID * GRID;

/** Build a cell permutation from a coordinate map. */
function cellPermutation(move) {
  const table = new Array(CELLS);
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const [nr, nc] = move(r, c);
      table[r * GRID + c] = nr * GRID + nc;
    }
  }
  return table;
}

/* ================================================================== *
 * THE OPERATOR VOCABULARY — six cell permutations that COMPOSE.
 *
 * §1.3 is the reason there are six of these rather than one hidden
 * transformation: a single rule to discover produces a STEP (chance
 * until insight, ceiling after), and fitting a linear rate to a step
 * wastes most of 30 trials. A composable vocabulary makes "having
 * learned it" a ladder — know one, chain two, chain three.
 *
 * TWO of the six change the figure's ORIENTATION. That minority is the
 * load-bearing choice of this design, not an accident: §3.4's stated
 * failure mode is a climb produced by mental-rotation practice, and a
 * vocabulary in which rotation is one operator of six — and in which
 * `turns = 0` is a reachable lever value at every depth — cannot be
 * climbed by getting faster at rotating.
 *
 * The other four rearrange the lattice without reorienting it. They do
 * not commute with the orientation pair, which is what makes "the
 * badges compose IN ORDER" a real thing to learn rather than a slogan.
 * ================================================================== */
export const ORIENTATION_OPS = ['pivot', 'mirror'];
export const REARRANGE_OPS = ['braid', 'stagger', 'drift', 'shunt'];
export const OPERATORS = [...ORIENTATION_OPS, ...REARRANGE_OPS];
export const isOrientation = (op) => ORIENTATION_OPS.includes(op);

export const OPERATOR_PERMUTATION = {
  /** Quarter turn clockwise about the lattice centre. The only rotation. */
  pivot: cellPermutation((r, c) => [c, GRID - 1 - r]),
  /** Reflection left to right. */
  mirror: cellPermutation((r, c) => [r, GRID - 1 - c]),
  /** Neighbouring columns trade places: 0<->1 and 2<->3. */
  braid: cellPermutation((r, c) => [r, c ^ 1]),
  /** Neighbouring rows trade places: 0<->1 and 2<->3. */
  stagger: cellPermutation((r, c) => [r ^ 1, c]),
  /** The four quarters of the lattice trade places diagonally. */
  drift: cellPermutation((r, c) => [(r + 2) % GRID, (c + 2) % GRID]),
  /** Every block steps one column right; the last column wraps to the first. */
  shunt: cellPermutation((r, c) => [r, (c + 1) % GRID]),
};

/**
 * Badge symbols. Six neutral pictorial glyphs, in ONE canonical order in every
 * item of both banks, so the tray never hints at the mapping. They are labels
 * the renderer draws beside the machine; they are deliberately not lattice
 * shapes, and deliberately not any glyph a UI would use as a control.
 */
export const BADGE_SYMBOLS = ['crescent', 'spiral', 'trefoil', 'zigzag', 'teardrop', 'leaf'];

/**
 * Words that name interface furniture. No operator and no badge may be called
 * one, because the name is what a renderer reaches for when it decides what to
 * draw — the reference type's `ring` became a rounded rectangle for exactly
 * that reason.
 */
export const CHROME_LEXICON = [
  'ring',
  'border',
  'frame',
  'box',
  'panel',
  'bar',
  'button',
  'tab',
  'chevron',
  'caret',
  'arrow',
  'check',
  'tick',
  'cross',
  'plus',
  'close',
  'menu',
  'outline',
  'shadow',
  'highlight',
  'badge',
  'pill',
  'card',
  'tooltip',
  'slider',
  'toggle',
  'circle',
  'square',
  'rect',
  'underline',
  'divider',
];

/**
 * The structural half of the anti-chrome audit, run at import time.
 *
 * A permutation cannot add ink, so no operator's effect can be drawn as
 * something enclosing or adorning the figure. This is the property that makes
 * the claim mechanical instead of a promise, and it is re-derived by the
 * checker rather than trusted.
 */
export function assertNoChrome() {
  for (const op of OPERATORS) {
    const table = OPERATOR_PERMUTATION[op];
    if (!table || table.length !== CELLS || new Set(table).size !== CELLS) {
      throw new Error(`operator "${op}" is not a permutation of the ${CELLS} lattice cells`);
    }
  }
  for (const name of [...OPERATORS, ...BADGE_SYMBOLS]) {
    const hit = CHROME_LEXICON.find((word) => name.toLowerCase().includes(word));
    if (hit) throw new Error(`"${name}" is named after interface chrome ("${hit}")`);
  }
}
assertNoChrome();

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
 * ================================================================== */

/** Apply one operator to a figure. Pure; blocks stay sorted so equality is textual. */
export function applyOp(op, blocks) {
  const table = OPERATOR_PERMUTATION[op];
  if (!table) throw new Error(`unknown operator "${op}"`);
  return blocks.map((cell) => table[cell]).sort((a, b) => a - b);
}

/** Apply a chain left-to-right: the first badge acts first. */
export function applyChain(chain, blocks) {
  return chain.reduce((state, op) => applyOp(op, state), blocks);
}

export const figureKey = (blocks) => blocks.join('.');

/**
 * Displacement between two figures: how many blocks ended up somewhere new.
 *
 * Both figures always hold the same number of blocks — every operator is a
 * permutation — so this is a symmetric count in 0..density, and it is the
 * metric the first anti-leak invariant is stated in: the key must never be
 * separable from the distractors by how far the machine appears to have moved
 * things.
 */
export function displacement(a, b) {
  const target = new Set(b);
  return a.filter((cell) => !target.has(cell)).length;
}

/* ================================================================== *
 * CHAIN CONSTRUCTION
 *
 * No operator repeats inside a chain, and — the stronger condition — a chain's
 * composed permutation must not be reachable by any SHORTER chain over the same
 * vocabulary. Both are correctness constraints rather than tidiness.
 *
 * A chain equivalent to a shorter one is far easier than its stated depth: the
 * child can ignore a badge and still be right. Its difficulty label is then
 * wrong in a way that correlates with which configs the targeting rule serves
 * late in the block, and §1.1(d) is explicit that structured labelling error
 * BIASES the fitted rate rather than merely attenuating it. So such chains are
 * rejected rather than noted. Four of the 120 depth-3 chains fail this and are
 * dropped; nothing at depth 1 or 2 does.
 * ================================================================== */
export const MAX_DEPTH = 3;

/** Composed permutation of a chain, as a cell table. */
export function chainPermutation(chain) {
  let table = [...Array(CELLS).keys()];
  for (const op of chain) table = table.map((cell) => OPERATOR_PERMUTATION[op][cell]);
  return table;
}

/** Every composed permutation reachable by a chain of fewer than `depth` distinct operators. */
const SHALLOWER_PERMUTATIONS = (() => {
  const byDepth = [];
  const cumulative = new Set([[...Array(CELLS).keys()].join(',')]);
  byDepth.push(new Set(cumulative));
  const walk = (depth) => {
    const out = [];
    const step = (acc, used) => {
      if (acc.length === depth) {
        out.push(acc.slice());
        return;
      }
      for (const op of OPERATORS) {
        if (used.has(op)) continue;
        used.add(op);
        acc.push(op);
        step(acc, used);
        acc.pop();
        used.delete(op);
      }
    };
    step([], new Set());
    return out;
  };
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    byDepth.push(new Set(cumulative));
    for (const chain of walk(depth)) cumulative.add(chainPermutation(chain).join(','));
  }
  return byDepth;
})();

/** Whether the chain does something no shorter chain over this vocabulary can do. */
export function depthIsHonest(chain) {
  return !SHALLOWER_PERMUTATIONS[chain.length].has(chainPermutation(chain).join(','));
}

/** Whether some adjacent swap of the chain changes what the machine produces. */
export function isOrderSensitive(chain) {
  const reference = chainPermutation(chain).join(',');
  for (let i = 0; i + 1 < chain.length; i++) {
    const swapped = chain.slice();
    [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
    if (chainPermutation(swapped).join(',') !== reference) return true;
  }
  return false;
}

export function buildChain({ depth, turns }, rng) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const orientationPicks = shuffle(ORIENTATION_OPS, rng).slice(0, turns);
    const rearrangePicks = shuffle(REARRANGE_OPS, rng).slice(0, depth - turns);
    const chain = shuffle([...orientationPicks, ...rearrangePicks], rng);
    if (chain.length !== depth) continue;
    if (!depthIsHonest(chain)) continue;
    return chain;
  }
  return null;
}

/* ================================================================== *
 * DIFFICULTY MODEL — from the declared levers, monotone by construction.
 *
 * §1.1(d) is why this is arithmetic over generator parameters rather than a
 * hand label: the block serves systematically different item subsets early and
 * late, so any difficulty error that correlates with the composition of those
 * subsets correlates with trialIndex, and correlated error in `b` maps straight
 * onto the fitted rate. Random labelling error only attenuates; structured
 * labelling error BIASES. Every term below is countable from the item's own
 * levers and strictly signed.
 *
 * WHERE THE RANGE COMES FROM, AND WHY IT IS NOT DEPTH.
 *
 * The reference type reached the top of the 1..20 scale by chaining four
 * operators, and paid twice for it: 6*5*4*3 = 360 relabellings of a depth-4
 * chain collapse onto each other often enough to hand the key to a brute-force
 * client, which is how that bank shipped with 11 of 234 items derivable; and a
 * pool whose top rungs exist only at maximum depth truncates for exactly the
 * high-standing children whose climb is the measurement.
 *
 * So depth stops at THREE here and the range is extended by FIGURE DENSITY —
 * §3.4's own "figure complexity (block count)" lever, promoted from a minor
 * within-rung positioner to the principal range-extender. Density carries 5.75
 * of the 17.05 raw points, roughly 6.4 points of the 1..20 scale, which is what
 * lets depth stop early. It is the right lever for it: tracking seven blocks
 * through a rearrangement is harder than tracking two for a reason that has
 * nothing to do with how deep the composition is, so it adds load without
 * adding relabelling collapse.
 * ================================================================== */
export const DEPTH_LOAD = { 1: 0, 2: 2.6, 3: 4.6 };
/** Load per orientation operator: an imagined re-orientation, not a local move. */
const TURN_WEIGHT = 0.9;
/** Extra load once BOTH orientation operators are in play, so order bites. */
const ORDER_WEIGHT = 1.4;
/** Load for interleaving re-orientations with rearrangements. */
const MIX_WEIGHT = 1.1;
/** Load per block above the floor — the range-extending lever. */
const DENSITY_WEIGHT = 1.15;
/** Span of the continuous distractor-distance lever, the within-rung positioner. */
const SIMILARITY_SPAN = 2.4;

export const MIN_DENSITY = 2;
export const MAX_DENSITY = 7;

/**
 * Representational mixing, derived from (depth, turns) rather than added as a
 * free parameter that could be unreachable. A chain of three rearrangements is
 * bookkeeping on a lattice; a chain that interleaves rearrangements with
 * re-orientations forces the child to carry an imagined intermediate FIGURE
 * through steps that do not reorient it. That is a real load and it is
 * checkable.
 */
export const isMixed = (depth, turns) => (turns > 0 && turns < depth ? 1 : 0);

export function baseScore({ depth, turns, density }) {
  return (
    1.0 +
    DEPTH_LOAD[depth] +
    TURN_WEIGHT * turns +
    ORDER_WEIGHT * Math.max(0, turns - 1) +
    MIX_WEIGHT * isMixed(depth, turns) +
    DENSITY_WEIGHT * (density - MIN_DENSITY)
  );
}

/**
 * Every lever combination the grammar can build. `turns` is bounded by the two
 * orientation operators and `depth - turns` by the four rearrangements, so at
 * this depth every entry is reachable by construction; there is no filtering
 * step, because an unreachable config would mean a difficulty the bank claims
 * to serve and cannot.
 */
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    const minTurns = Math.max(0, depth - REARRANGE_OPS.length);
    for (let turns = minTurns; turns <= Math.min(depth, ORIENTATION_OPS.length); turns++) {
      for (let density = MIN_DENSITY; density <= MAX_DENSITY; density++) {
        out.push({ depth, turns, density });
      }
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
 * BANDS — the developmental floor §4.3 requires.
 *
 * Li et al. (2024) found 6-7-year-olds mostly best fit by a RANDOM-RESPONSE
 * model on an information-integration structure, so §4.3 forbids multi-
 * dimensional integration at the young bands. Here that is two caps, not one:
 * composition depth is the dimensionality of the rule, and figure density is
 * the number of elements a child must track through it. Both are capped by
 * band, and both are checkable from the levers alone.
 * ================================================================== */
export const BANDS = [
  { band: 'K-1', lo: 1, hi: 4, maxDepth: 1, maxDensity: 4 },
  { band: '2-3', lo: 4, hi: 8, maxDepth: 2, maxDensity: 5 },
  { band: '4-5', lo: 8, hi: 12, maxDepth: 2, maxDensity: 6 },
  { band: '6-8', lo: 12, hi: 20, maxDepth: 3, maxDensity: 7 },
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
 * DISTRACTORS — each one a NAMED incomplete version of the system.
 *
 * §4.6 makes this a build requirement rather than a nicety: with every wrong
 * option encoding a specific partial rule, each response is classifiable, which
 * gives both a falsification test (in a real learner errors should migrate from
 * random toward misread-badge and wrong-order) and the ordinal fallback the
 * §4.1.4 Verdict-2 branch depends on. The fallback has to exist at the moment
 * the gate returns Verdict 2, not a build cycle later.
 *
 * `nearness` orders the failures from "almost had it" to "did not engage", and
 * the item's `distractorSimilarity` lever picks a slate along that axis. Each
 * label is already registered in item-shape.mjs, so M-ERRTYPE / M-RULEID stay
 * computable without widening the coarse enum.
 *
 * The axis is deliberately INTERLEAVED by relabelling-reachability. Four of the
 * eight failures produce a figure some badge relabelling also produces
 * (order_error, wrong_axis, wrong_operator, wrong_family) and four do not
 * (over_application, omission, first_step_only, identity_copy). Sorting the
 * reachable four to one end would mean the anti-leak repair below always fired
 * against the similarity lever at one extreme; interleaved, it rarely fires at
 * all.
 * ================================================================== */
const FAILURES = [
  { kind: 'order_error', nearness: 1.0, relabelReachable: true },
  { kind: 'wrong_axis', nearness: 0.8, relabelReachable: true },
  { kind: 'over_application', nearness: 0.65, relabelReachable: false },
  { kind: 'wrong_operator', nearness: 0.5, relabelReachable: true },
  { kind: 'omission', nearness: 0.35, relabelReachable: false },
  { kind: 'wrong_family', nearness: 0.2, relabelReachable: true },
  { kind: 'first_step_only', nearness: 0.1, relabelReachable: false },
  { kind: 'identity_copy', nearness: 0.0, relabelReachable: false },
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
    if (!isOrientation(chain[i])) continue;
    for (const op of ORIENTATION_OPS) {
      if (chain.includes(op)) continue;
      const substituted = chain.slice();
      substituted[i] = op;
      out.push({
        ruleId: `axis@${i}=${op}:${label(substituted)}`,
        kind: 'wrong_axis',
        chain: substituted,
        note: `re-oriented the figure the other way at badge ${i + 1}`,
      });
    }
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
    for (const op of OPERATORS) {
      if (chain.includes(op)) continue;
      if (isOrientation(op) && isOrientation(chain[i])) continue; // that is wrong_axis
      const substituted = chain.slice();
      substituted[i] = op;
      out.push({
        ruleId: `sub@${i}=${op}:${label(substituted)}`,
        kind: 'wrong_operator',
        chain: substituted,
        note: `read badge ${i + 1} as a different transformation`,
      });
    }
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
  for (let i = 0; i + 1 < chain.length; i++) {
    for (const first of OPERATORS) {
      if (chain.includes(first)) continue;
      for (const second of OPERATORS) {
        if (second === first || chain.includes(second)) continue;
        const substituted = chain.slice();
        substituted[i] = first;
        substituted[i + 1] = second;
        out.push({
          ruleId: `pair@${i}=${first}+${second}:${label(substituted)}`,
          kind: 'wrong_family',
          chain: substituted,
          note: `read badges ${i + 1} and ${i + 2} as a different pair of transformations`,
        });
      }
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
    note: 'applied no badge at all',
  });
  return out;
}

/**
 * Every figure an attacker can reach WITHOUT the mapping, by relabelling it.
 *
 * A mapping is a badge->operator bijection and the badges in a chain are
 * distinct, so guessing the mapping is exactly guessing an ordered selection of
 * `depth` distinct operators for the chain's positions — at most 6*5*4 = 120 of
 * them. Anything the client can compute, it can compute this way, so this set
 * IS the client's view of the item, and how many OPTIONS fall inside it is the
 * ceiling on a solver that has perfect spatial execution and no knowledge of
 * the system.
 */
export function relabelReachableFigures(depth, input) {
  const out = new Set();
  const walk = (position, used, state) => {
    if (position === depth) {
      out.add(figureKey(state));
      return;
    }
    for (const op of OPERATORS) {
      if (used.has(op)) continue;
      used.add(op);
      walk(position + 1, used, applyOp(op, state));
      used.delete(op);
    }
  };
  walk(0, new Set(), input);
  return out;
}

/**
 * How many of the four distractors must be reachable by relabelling.
 *
 * Three, so four of the five options are, and a solver with perfect spatial
 * execution but no mapping is capped at 1-in-4 against a 1-in-5 baseline. The
 * bare anti-leak floor — "the key is not the UNIQUE reachable option" — needs
 * only one, and one is not enough here: §3.4's stated failure mode is a climb
 * driven by improving spatial execution, and a solver who can eliminate three
 * options on execution alone climbs to 50% without inducing anything.
 *
 * It is not four, because that would evict every unreachable failure class from
 * the slate and with them the "did not engage" register of the strategy trace,
 * which is the §4.6 falsification test and the Verdict-2 fallback.
 */
export const REACHABLE_DISTRACTORS = 3;

/**
 * Choose four distractors along the nearness axis at `similarity`, subject to
 * two invariants applied in a fixed order.
 *
 * The two required roles are filled from the CHEAPEST candidate that can fill
 * them, then the remaining slots go to the cheapest candidates outright. That
 * is deterministic, terminates, and keeps the slate as close to the similarity
 * lever as the constraints allow.
 */
function chooseDistractors(chain, input, key, similarity) {
  const keyFigure = figureKey(key);
  const keyDisplacement = displacement(input, key);
  const reachable = relabelReachableFigures(chain.length, input);

  const seen = new Set([keyFigure]);
  const pool = [];
  for (const rule of partialRules(chain)) {
    const output = applyChain(rule.chain, input);
    const fk = figureKey(output);
    if (seen.has(fk)) continue;
    seen.add(fk);
    pool.push({
      rule,
      output,
      cost: Math.abs(NEARNESS[rule.kind] - similarity),
      displacementMatched: displacement(input, output) === keyDisplacement,
      relabelReachable: reachable.has(fk),
    });
  }
  pool.sort((a, b) => a.cost - b.cost || (a.rule.ruleId < b.rule.ruleId ? -1 : 1));
  if (pool.length < 4) return null;

  const chosen = [];
  const take = (predicate) => {
    const found = pool.find((c) => predicate(c) && !chosen.includes(c));
    if (found) chosen.push(found);
    return Boolean(found);
  };

  // Invariant 1: the key is not separable by how far the machine moved things.
  if (!take((c) => c.displacementMatched)) return null;
  // Invariant 2: four of five options are consistent with SOME relabelling.
  while (chosen.filter((c) => c.relabelReachable).length < REACHABLE_DISTRACTORS) {
    if (chosen.length === 4) return null;
    if (!take((c) => c.relabelReachable)) return null;
  }
  // Invariant 3: the slate names at least two distinct failures, so a wrong answer says WHICH
  // incomplete rule the child used rather than only that one was used. A slate of four
  // same-kind distractors still identifies which badge was misread, but it cannot show the
  // error migration §4.6 uses as the falsification test. Best effort: taken only if a rival kind
  // exists, and only after the two hard invariants are already satisfied.
  if (chosen.length < 4) {
    const kinds = new Set(chosen.map((c) => c.rule.kind));
    if (kinds.size === 1) take((c) => !kinds.has(c.rule.kind));
  }
  for (const candidate of pool) {
    if (chosen.length === 4) break;
    if (!chosen.includes(candidate)) chosen.push(candidate);
  }
  return chosen.length === 4 ? chosen : null;
}

/* ================================================================== *
 * ONE ITEM
 * ================================================================== */

/** Draw `density` distinct cells, ordered, from the seeded stream. */
function drawFigure(density, rng) {
  const pool = shuffle([...Array(CELLS).keys()], rng);
  return pool.slice(0, density).sort((a, b) => a - b);
}

/**
 * Generate ONE structured BankItem.
 *
 * The chain and the input figure are re-drawn together until both the
 * observability condition and the two anti-leak invariants hold. Retrying is
 * not a fallback: a figure symmetric enough that several operators land it in
 * the same place collapses the relabelling set, and a figure that the chain
 * happens to fix is not an item at all. Every draw comes off the seeded stream,
 * so the item stays byte-reproducible from its provenance.
 *
 * @param {{depth,turns,density,distractorSimilarity,keyPosition,
 *          systemPersistence,systemSeed,seed}} lever
 */
export function genItem({
  depth,
  turns,
  density,
  distractorSimilarity,
  keyPosition,
  systemPersistence,
  systemSeed,
  seed,
}) {
  if (systemPersistence !== 'consistent' && systemPersistence !== 'perTrial') {
    throw new Error(`systemPersistence must be consistent|perTrial, got "${systemPersistence}"`);
  }
  const rng = makeRng(seed);

  // The OPERATOR chain and the figures depend only on the levers and the seed — never on the mode.
  // That is what equates the two banks: both arms serve the same figures, the same key and the same
  // difficulty, and differ only in which badge symbols label the operators.
  let chain = null;
  let input = null;
  let key = null;
  let distractors = null;
  for (let attempt = 0; attempt < 64; attempt++) {
    if (chain === null || attempt % 8 === 0) {
      chain = buildChain({ depth, turns }, rng);
      if (chain === null) throw new Error(`no honest chain for depth=${depth} turns=${turns}`);
    }
    const candidate = drawFigure(density, rng);
    const output = applyChain(chain, candidate);
    if (figureKey(output) === figureKey(candidate)) continue; // the machine did nothing visible
    const slate = chooseDistractors(chain, candidate, output, distractorSimilarity);
    if (slate === null) continue;
    input = candidate;
    key = output;
    distractors = slate;
    break;
  }
  if (distractors === null) {
    throw new Error(
      `no figure satisfies the anti-leak invariants for depth=${depth} turns=${turns} ` +
        `density=${density} (seed ${seed})`,
    );
  }

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
      lure: rule.kind,
      ruleId: rule.ruleId,
      partialRuleKind: rule.kind,
      note: rule.note,
    };
    strategyTrace[optionKey] = { ruleId: rule.ruleId, kind: rule.kind };
  });

  // How many options a mapping-blind solver cannot rule out. Recorded per item rather than only
  // summarised, because it is the quantity §3.4's spatial risk turns on and the checker re-derives
  // it from `content` alone.
  const reachable = relabelReachableFigures(chain.length, input);
  const relabelReachableOptions = figures.filter((f) => reachable.has(figureKey(f))).length;

  const cfg = { depth, turns, density };
  const difficulty = round2(difficultyFromLevers(cfg, distractorSimilarity));

  return {
    itemId: seededUuid(`${systemPersistence}|${seed}`),
    typeCode: 'SPA-XFORM-01',
    domain: 'spatial',
    difficulty, // FLOAT 1..20 — DESIGN rung from the levers, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/SPA-XFORM-01.html',
    content: {
      typeCode: 'SPA-XFORM-01',
      grid: { rows: GRID, cols: GRID },
      // The full vocabulary, always in canonical order, so the tray leaks nothing in either mode.
      badgeTray: BADGE_SYMBOLS.slice(),
      input: { blocks: input.slice() },
      // Surface chain only. The transformation each badge stands for is server-only.
      chain: badgeChain,
      options: optionKeys.map((optionKey, i) => ({ key: optionKey, blocks: figures[i].slice() })),
    },
    answer: {
      correctKey: optionKeys[slot],
      // SERVER-ONLY: the system itself. Shipping this would make every item a lookup.
      system: { systemId: system.systemId, mapping: { ...system.mapping } },
      operatorChain: chain.slice(),
      badgeChain: badgeChain.slice(),
      orderSensitive: isOrderSensitive(chain) ? 1 : 0,
      // §4.6's per-trial strategy trace: which partial rule each option is consistent with.
      strategyTrace,
      strategyTraceRules: FAILURES.map((f) => f.kind),
      keyDisplacementFromInput: displacement(input, key),
      // The mapping-blind ceiling is 1 / this. Never below REACHABLE_DISTRACTORS + 1.
      relabelReachableOptions,
      distractorRationales,
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'spa-xform-01-grammar@1',
      seed,
      levers: {
        depth,
        turns,
        density,
        // Derived from (depth, turns), recorded so the checker re-derives difficulty from the
        // levers alone without re-deriving the derivation.
        mixed: isMixed(depth, turns),
        // The control condition, recorded in provenance rather than content: the renderer must not
        // know which arm it is serving, and `servedItemSchema` omits provenance (§4.1.1).
        systemPersistence,
        systemSeed,
        keyPosition,
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
 * goes all-correct, and has its rate pushed toward the bound with an inflated
 * SE — truncating the top of the distribution exactly where the interesting
 * children are. Gate A check A3 is what measures whether this bank delivers it;
 * the grain is a precondition, not proof.
 * ================================================================== */
export function buildBank({ systemPersistence, perRung = 6, systemSeed = 'SPA-XFORM-01|v1' }) {
  const items = [];
  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));

  let keyCursor = 0;

  for (const rung of rungs) {
    // The rung window is clipped to its BAND's window as well as to +/-0.24, so an item cannot land
    // a rounding-width across a band edge and carry the neighbouring band's caps with it. The
    // checker caps depth and density by the item's own difficulty, not by the rung it was aimed at,
    // and without this clip the two disagree at every boundary rung.
    const band = bandFor(rung);
    const lo = Math.max(1, rung - 0.24, band.lo);
    const hi = Math.min(20, rung + 0.24, band.band === '6-8' ? 20 : band.hi - 0.01);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      if (cfg.depth > band.maxDepth) continue; // §4.3 developmental floor, on rule dimensionality
      if (cfg.density > band.maxDensity) continue; // and on how many blocks must be tracked
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
      const similarity = solveSimilarity(segment.cfg, target);
      const c = segment.cfg;
      const seed = `SPA-XFORM-01|rung=${rung}|i=${i}|D${c.depth}T${c.turns}N${c.density}`;
      items.push(
        genItem({
          ...c,
          distractorSimilarity: similarity,
          // Round-robin, so key position is balanced by construction rather than by luck (E-094).
          keyPosition: keyCursor++ % 5,
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
 * CLI entrypoint: write BOTH banks and print coverage + anti-leak + equating.
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
  consistent: '../banks/SPA-XFORM-01.jsonl',
  perTrial: '../control-banks/SPA-XFORM-01.perTrial.jsonl',
};

if (isMain()) {
  const perRung = Number(process.env.PER_RUNG || 6);
  const modes = ['consistent', 'perTrial'];
  const banks = {};

  for (const mode of modes) {
    const items = buildBank({ systemPersistence: mode, perRung });
    banks[mode] = items;
    const outPath = resolve(__dirname, BANK_PATHS[mode]);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, serializeBank(items));
    console.log(`SPA-XFORM-01 (${mode}): ${items.length} items -> ${outPath}`);
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
  for (const it of reference) {
    keyCounts[it.answer.correctKey] = (keyCounts[it.answer.correctKey] ?? 0) + 1;
  }
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

  // Anti-leak, reported as counts rather than claimed. `derivable` is the number of items on which
  // a client that brute-forces every badge relabelling finds exactly one consistent option and so
  // has the key from `content` alone — the measurement the reference type reported as 11/234.
  const histogram = {};
  let derivable = 0;
  for (const it of reference) {
    const n = it.answer.relabelReachableOptions;
    histogram[n] = (histogram[n] ?? 0) + 1;
    if (n < 2) derivable++;
  }
  const worstCeiling = Math.min(...reference.map((it) => it.answer.relabelReachableOptions));
  const meanCeiling =
    reference.reduce((sum, it) => sum + 1 / it.answer.relabelReachableOptions, 0) /
    reference.length;
  console.log(
    `\nanti-leak: key derivable from content on ${derivable}/${reference.length} items ` +
      `(brute-forcing every badge relabelling)`,
  );
  console.log(
    `options consistent with SOME relabelling: ` +
      Object.entries(histogram)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([n, c]) => `${n}:${c}`)
        .join('  ') +
      `  — mapping-blind ceiling: mean ${meanCeiling.toFixed(3)}, worst ${(1 / worstCeiling).toFixed(3)}, chance 0.200`,
  );
  const noRotation = reference.filter((it) => it.provenance.levers.turns === 0).length;
  console.log(
    `rotation-free items (turns=0): ${noRotation}/${reference.length} ` +
      `(${((100 * noRotation) / reference.length).toFixed(1)}%) — no rung of the ladder requires a rotation`,
  );

  // Equating (U3(g)): the two banks must differ ONLY in persistence.
  const a = banks.consistent;
  const b = banks.perTrial;
  const mismatches = [];
  if (a.length !== b.length) mismatches.push(`item counts ${a.length} vs ${b.length}`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].difficulty !== b[i].difficulty) mismatches.push(`item ${i}: difficulty`);
    if (a[i].answer.correctKey !== b[i].answer.correctKey) mismatches.push(`item ${i}: key slot`);
    if (a[i].content.options.length !== b[i].content.options.length) {
      mismatches.push(`item ${i}: option count`);
    }
    if (JSON.stringify(a[i].content.options) !== JSON.stringify(b[i].content.options)) {
      mismatches.push(`item ${i}: option figures`);
    }
    if (a[i].answer.operatorChain.join('>') !== b[i].answer.operatorChain.join('>')) {
      mismatches.push(`item ${i}: operator chain`);
    }
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
    '\nNOT GATED. Gate A has not been run on this bank and Gate B needs ~128 real children\n' +
      '(§4.1.3); no synthetic run substitutes. The consistent arm is the live bank; the scrambled\n' +
      'arm lives outside banks/ and is never served.',
  );
}
