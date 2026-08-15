// Can a Stage 2 bank be re-keyed per session? — the feasibility measurement.
//
// The premise under test, from the owner's decision: ship item STRUCTURES with no key and no
// mapping, draw the hidden badge->operator system per session on the server, and let the key be
// whatever that session's mapping produces on each item. This file measures whether the four Stage
// 2 banks actually admit that, rather than assuming the existing anti-leak invariant implies it.
//
// Four questions, in the order they can invalidate the design:
//
//   Q1 RE-KEYABILITY.  How many DISTINCT options can be made correct by relabelling? That number is
//                      the size of the key space a session draw can move within. An item where only
//                      two of five options are reachable hands a 50% floor to anyone who brute-
//                      forces the relabelling — worse than the 20% the bank has today.
//   Q2 DIFFICULTY.     Every one of the four types prices a COUNT OF A SUB-CLASS of operators
//                      (geometric / orientation / binding / number-scope). A free relabelling
//                      changes that count, so the calibrated rung moves. Measured in the product's
//                      own 1..20 units for FLU-OPCHAIN-01 and in lever units for the rest.
//   Q3 DISTRACTORS.    The four non-key options are named partial rules of the ORIGINAL chain
//                      (§4.6's strategy trace). Under a different mapping they are, in general, not
//                      partial rules of anything. Measured as a survival fraction.
//   Q4 RESIDUAL.       With the cross-item attack removed, what does the strongest remaining
//                      per-item attacker score? That is what per-session keying leaves on the table.
//
// Each question is asked twice, of two mapping families:
//
//   FREE            every bijection over the tray (720 / 720 / 120 / 720).
//   CLASS-PRESERVING  only bijections that keep each symbol inside its operator CLASS. Every one of
//                     the four types splits its vocabulary in two and prices the count of one half,
//                     so this is exactly the subgroup under which Q2's drift is zero by
//                     construction. It is much smaller, which is the trade Q1 prices.
//
// PROVENANCE OF THE SEMANTICS. The figure/lattice/numeral/picture algebras below are re-implemented
// from each type's specification rather than imported from its generator, for the reason
// STAGE2_ANTILEAK_COMPARISON.md gives: importing a generator's own `applyOp` makes a generator that
// is wrong about its own algebra agree with itself. They are checked by asserting that every
// shipped key is reachable under the shipped mapping, on every item of every bank, before any
// number below is computed. The DIFFICULTY model is the opposite case and is imported from the
// generator on purpose: Q2 asks whether the product's own calibrated rung survives, so it has to be
// the product's own arithmetic.
//
// Banks are read out of the git object database by `<ref>:<path>`. Three of the four live on
// unmerged branches, so nothing here touches a working tree and the Gate A runs already recorded
// against those banks stay valid.
//
// Run:  node research/exam-question-types/stage2-session-keying-feasibility.mjs
//       node research/exam-question-types/stage2-session-keying-feasibility.mjs --json

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  baseScore as fluBaseScore,
  difficultyFromLevers as fluDifficultyFromLevers,
  partialRules as fluPartialRules,
} from './generators/FLU-OPCHAIN-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

const SEED = 'STAGE2_SESSION_KEYING|v1';

/* ==================================================================== *
 * Seeded RNG, the idiom every generator in this directory uses.
 * ==================================================================== */

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
const makeRng = (seed) => mulberry32(xmur3(seed)());

/* ==================================================================== *
 * THE TWO MAPPING FAMILIES
 * ==================================================================== */

/** Every bijection from `symbols` onto `vocabulary` (both the same length). */
function bijections(symbols, vocabulary) {
  const out = [];
  const used = new Set();
  const acc = {};
  const walk = (i) => {
    if (i === symbols.length) {
      out.push({ ...acc });
      return;
    }
    for (const v of vocabulary) {
      if (used.has(v)) continue;
      used.add(v);
      acc[symbols[i]] = v;
      walk(i + 1);
      used.delete(v);
    }
  };
  walk(0);
  return out;
}

/**
 * Every mapping that keeps each badge's operator CLASS unchanged, anchored on the bank's own
 * mapping: `σ(badge) = ρ(σ_shipped(badge))` for every class-preserving permutation `ρ` of the
 * operator vocabulary.
 *
 * Anchoring matters and getting it wrong inverts the result. The class of a badge is not a property
 * of its position in the tray — the shipped mapping sends `circle`/`square`/`triangle` to the three
 * ATTRIBUTE operators, not the three geometric ones — so cutting the tray in canonical order
 * produces a family under which the bank's own key is unreachable on half its items. This family is
 * the orbit of the shipped mapping under the class-preserving subgroup, which is the only
 * construction that makes "the priced lever cannot move" true by definition.
 */
function classPreservingFamily(shipped, classes) {
  const relabellings = [];
  const perClass = classes.map((ops) => bijections(ops, ops));
  const walk = (i, acc) => {
    if (i === perClass.length) {
      relabellings.push({ ...acc });
      return;
    }
    for (const partial of perClass[i]) walk(i + 1, { ...acc, ...partial });
  };
  walk(0, {});
  return relabellings.map((rho) =>
    Object.fromEntries(Object.entries(shipped).map(([badge, op]) => [badge, rho[op]])),
  );
}

/* ==================================================================== *
 * FLU-OPCHAIN-01 — six operators on a figure; the chain composes left to right.
 * ==================================================================== */

const FLU_GEOM = ['turn', 'flip', 'slant'];
const FLU_ATTR = ['swap', 'ring', 'twin'];
const FLU_OPS = [...FLU_GEOM, ...FLU_ATTR];
const FLU_ELEMENT = { turn: { a: 1, b: 0 }, flip: { a: 0, b: 1 }, slant: { a: 1, b: 1 } };

/** D4 as r^a m^b under the relation m r = r^-1 m. */
const dcompose = (g, o) => ({
  a: (((g.a + (g.b ? -o.a : o.a)) % 4) + 4) % 4,
  b: (g.b + o.b) % 2,
});

function fluStep(op, fig) {
  if (FLU_GEOM.includes(op)) return { ...fig, orient: dcompose(FLU_ELEMENT[op], fig.orient) };
  if (op === 'swap') return { ...fig, shade: fig.shade === 'solid' ? 'hollow' : 'solid' };
  if (op === 'ring') return { ...fig, border: fig.border ? 0 : 1 };
  if (op === 'twin') return { ...fig, pair: fig.pair ? 0 : 1 };
  throw new Error(`unknown operator "${op}"`);
}
const fluKey = (f) => `${f.glyph}|${f.orient.a}${f.orient.b}|${f.shade}|${f.border}|${f.pair}`;
const fluChain = (ops, input) => ops.reduce((state, op) => fluStep(op, state), input);

/* ==================================================================== *
 * SPA-XFORM-01 — six cell permutations of a 4x4 lattice.
 * ==================================================================== */

const SPA_GRID = 4;
function cellPermutation(move) {
  const table = new Array(SPA_GRID * SPA_GRID);
  for (let r = 0; r < SPA_GRID; r++) {
    for (let c = 0; c < SPA_GRID; c++) {
      const [nr, nc] = move(r, c);
      table[r * SPA_GRID + c] = nr * SPA_GRID + nc;
    }
  }
  return table;
}
const SPA_TURNS = ['pivot', 'mirror'];
const SPA_MOVES = ['braid', 'stagger', 'drift', 'shunt'];
const SPA_OPS = [...SPA_TURNS, ...SPA_MOVES];
const SPA_PERMUTATION = {
  pivot: cellPermutation((r, c) => [c, SPA_GRID - 1 - r]),
  mirror: cellPermutation((r, c) => [r, SPA_GRID - 1 - c]),
  braid: cellPermutation((r, c) => [r, c ^ 1]),
  stagger: cellPermutation((r, c) => [r ^ 1, c]),
  drift: cellPermutation((r, c) => [(r + 2) % SPA_GRID, (c + 2) % SPA_GRID]),
  shunt: cellPermutation((r, c) => [r, (c + 1) % SPA_GRID]),
};
const spaStep = (op, blocks) => blocks.map((cell) => SPA_PERMUTATION[op][cell]).sort((a, b) => a - b);
const spaKey = (blocks) => blocks.join('.');
const spaChain = (ops, blocks) => ops.reduce((state, op) => spaStep(op, state), blocks);

/* ==================================================================== *
 * QUANT-GLYPHNUM-01 — five glyphs onto five numeric roles; the item is a ratio.
 * ==================================================================== */

const QUANT_BASE = 4;
const QUANT_SCALES = { scaleI: 1, scaleII: QUANT_BASE, scaleIII: QUANT_BASE * QUANT_BASE };
const QUANT_DIGITS = { digitII: 2, digitIII: 3 };
const QUANT_SCALE_ROLES = Object.keys(QUANT_SCALES);
const QUANT_DIGIT_ROLES = Object.keys(QUANT_DIGITS);
const QUANT_ROLES = [...QUANT_SCALE_ROLES, ...QUANT_DIGIT_ROLES];
const isScale = (role) => role in QUANT_SCALES;
const isDigit = (role) => role in QUANT_DIGITS;
const roleValue = (role) => QUANT_SCALES[role] ?? QUANT_DIGITS[role];
const round6 = (x) => Math.round(x * 1e6) / 1e6;

/** Read a role sequence as a number. TOTAL by design — a wrong mapping must still produce a value. */
function quantValueOf(roles) {
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
/** How many multiplicative bindings a role sequence contains — this type's priced sub-class count. */
function quantBinds(roles) {
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

/* ==================================================================== *
 * VER-MORPHO-01 — six affix meanings on a picture, in two presentation directions.
 * ==================================================================== */

const VER_NUMBER_SWAP = { plural: [1, 3], dual: [1, 2], paucal: [2, 3] };
const VER_SCOPE = ['plural', 'dual', 'paucal'];
const VER_OTHER = ['negate', 'resize', 'swapRole'];
const VER_MEANINGS = [...VER_SCOPE, ...VER_OTHER];

function applyMeaning(meaning, picture) {
  if (meaning in VER_NUMBER_SWAP) {
    const [lo, hi] = VER_NUMBER_SWAP[meaning];
    if (picture.count === lo) return { ...picture, count: hi };
    if (picture.count === hi) return { ...picture, count: lo };
    return { ...picture };
  }
  if (meaning === 'negate') return { ...picture, mark: picture.mark === 'none' ? 'cross' : 'none' };
  if (meaning === 'resize') return { ...picture, size: picture.size === 'small' ? 'big' : 'small' };
  if (meaning === 'swapRole')
    return { ...picture, role: picture.role === 'doer' ? 'target' : 'doer' };
  throw new Error(`unknown meaning "${meaning}"`);
}
const pictureKey = (p) => `${p.kind}|${p.count}|${p.size}|${p.mark}|${p.role}`;
const verChain = (meanings, picture) =>
  meanings.reduce((state, meaning) => applyMeaning(meaning, state), picture);

/* ==================================================================== *
 * TYPE ADAPTERS
 *
 * Every method takes the SERVED projection. `keyUnder` returns the index of the option a mapping
 * makes correct, or -1 when the mapping puts the answer off screen — which is what makes an item
 * unservable in that session rather than merely differently keyed.
 * ==================================================================== */

const ADAPTERS = {
  'FLU-OPCHAIN-01': {
    optionCount: 5,
    floor: 0.2,
    vocabulary: FLU_OPS,
    classes: [FLU_GEOM, FLU_ATTR],
    className: 'geometric',
    leverName: 'geom',
    trayOf: (c) => c.badgeTray,
    symbolsOf: (c) => c.chain,
    keyUnder(c, mapping) {
      const out = fluKey(fluChain(c.chain.map((b) => mapping[b]), c.input));
      return c.options.findIndex((o) => fluKey(o.figure) === out);
    },
    /** Distinct operators of the priced class in this mapping's chain. */
    classCount: (c, mapping) => new Set(c.chain.map((b) => mapping[b]).filter((op) => FLU_GEOM.includes(op))).size,
    depthOf: (c) => c.chain.length,
  },

  'SPA-XFORM-01': {
    optionCount: 5,
    floor: 0.2,
    vocabulary: SPA_OPS,
    classes: [SPA_TURNS, SPA_MOVES],
    className: 'orientation',
    leverName: 'turns',
    trayOf: (c) => c.badgeTray,
    symbolsOf: (c) => c.chain,
    keyUnder(c, mapping) {
      const out = spaKey(spaChain(c.chain.map((b) => mapping[b]), c.input.blocks));
      return c.options.findIndex((o) => spaKey(o.blocks.slice().sort((a, b) => a - b)) === out);
    },
    classCount: (c, mapping) => new Set(c.chain.map((b) => mapping[b]).filter((op) => SPA_TURNS.includes(op))).size,
    depthOf: (c) => c.chain.length,
  },

  'QUANT-GLYPHNUM-01': {
    optionCount: 5,
    floor: 0.2,
    vocabulary: QUANT_ROLES,
    classes: [QUANT_SCALE_ROLES, QUANT_DIGIT_ROLES],
    className: 'binding',
    leverName: 'binds',
    trayOf: (c) => c.glyphTray,
    symbolsOf: (c) => c.expression,
    keyUnder(c, mapping) {
      // The item is a ratio: the expression read as a numeral, over the numeral at the line's top.
      const numerator = quantValueOf(c.expression.map((g) => mapping[g]));
      const denominator = quantValueOf(c.line.maxExpression.map((g) => mapping[g]));
      if (denominator === 0) return -1;
      const ratio = round6(numerator / denominator);
      return c.options.findIndex((o) => round6(o.ratio) === ratio);
    },
    classCount: (c, mapping) => quantBinds(c.expression.map((g) => mapping[g])),
    depthOf: (c) => c.expression.length,
  },

  'VER-MORPHO-01': {
    optionCount: 4,
    floor: 0.25,
    vocabulary: VER_MEANINGS,
    classes: [VER_SCOPE, VER_OTHER],
    className: 'number-scope',
    leverName: 'scope',
    trayOf: (c) => c.morphemeTray,
    symbolsOf: (c) =>
      c.direction === 'wordToPicture' ? c.wordMorphemes : c.options.flatMap((o) => o.morphemes),
    keyUnder(c, mapping) {
      if (c.direction === 'wordToPicture') {
        const out = pictureKey(verChain(c.wordMorphemes.map((f) => mapping[f]), c.stemPicture));
        return c.options.findIndex((o) => pictureKey(o.picture) === out);
      }
      // picture->word. A mapping keys this item only if EXACTLY ONE candidate word denotes the
      // target under it; two or none means the mapping is not a legal key for this item at all.
      const target = pictureKey(c.targetPicture);
      const hits = [];
      c.options.forEach((o, i) => {
        if (pictureKey(verChain(o.morphemes.map((f) => mapping[f]), c.stemPicture)) === target)
          hits.push(i);
      });
      return hits.length === 1 ? hits[0] : -1;
    },
    classCount: (c, mapping) => {
      const forms =
        c.direction === 'wordToPicture' ? c.wordMorphemes : c.options[0].morphemes;
      return new Set(forms.map((f) => mapping[f]).filter((m) => VER_SCOPE.includes(m))).size;
    },
    depthOf: (c) =>
      c.direction === 'wordToPicture' ? c.wordMorphemes.length : c.options[0].morphemes.length,
  },
};

/* ==================================================================== *
 * BANKS
 * ==================================================================== */

const BANKS = [
  {
    label: 'FLU-OPCHAIN-01',
    typeCode: 'FLU-OPCHAIN-01',
    spec: 'origin/dev:research/exam-question-types/banks/FLU-OPCHAIN-01.jsonl',
  },
  {
    label: 'SPA-XFORM-01',
    typeCode: 'SPA-XFORM-01',
    spec: 'origin/feat/stage2-spa-xform:research/exam-question-types/banks/SPA-XFORM-01.jsonl',
  },
  {
    label: 'QUANT-GLYPHNUM-01',
    typeCode: 'QUANT-GLYPHNUM-01',
    spec: 'origin/feat/stage2-quant-glyphnum:research/exam-question-types/banks/QUANT-GLYPHNUM-01.jsonl',
  },
  {
    label: 'VER-MORPHO-01',
    typeCode: 'VER-MORPHO-01',
    spec: 'origin/feat/stage2-ver-morpho:research/exam-question-types/banks/VER-MORPHO-01.jsonl',
  },
];

function readBank(spec) {
  return execFileSync('git', ['show', spec], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
    .trim()
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

/** The projection the browser gets. Everything below is computed from this and nothing else. */
function toServed(item) {
  return {
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain,
    difficulty: item.difficulty,
    ageBands: item.ageBands,
    content: item.content,
    syntheticOnly: item.syntheticOnly,
    validated: item.validated,
  };
}

/* ==================================================================== *
 * Q1 + Q2 + Q3, per bank
 * ==================================================================== */

const mean = (xs) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
/** Spread-free, because these arrays run to hundreds of thousands of entries. */
const maxOf = (xs) => xs.reduce((a, b) => (b > a ? b : a), 0);
const pct = (x) => `${(100 * x).toFixed(1)}%`;
const f2 = (x) => x.toFixed(2);

function measure(bank) {
  const adapter = ADAPTERS[bank.typeCode];
  const items = readBank(bank.spec);
  const tray = adapter.trayOf(items[0].content);

  const families = {
    free: bijections(tray, adapter.vocabulary),
    class: classPreservingFamily(shippedMapping(items[0]), adapter.classes),
  };

  // The semantics check that licenses every number below: the shipped key must be what the shipped
  // mapping produces, on every item. An adapter that disagrees with the generator is measuring a
  // different type.
  let checked = 0;
  for (const item of items) {
    const shipped = shippedMapping(item);
    if (!shipped) throw new Error(`${bank.label} ${item.itemId}: no shipped mapping to check against`);
    const index = adapter.keyUnder(item.content, shipped);
    const wanted = item.content.options.findIndex((o) => optionKey(o, item) === item.answer.correctKey);
    if (index !== wanted) {
      throw new Error(
        `${bank.label} ${item.itemId}: re-implemented semantics key option ${String(index)}, ` +
          `bank says ${String(wanted)} — the adapter does not match the generator`,
      );
    }
    checked += 1;
  }

  const perFamily = {};
  for (const [name, systems] of Object.entries(families)) {
    const rows = items.map((item) => {
      const c = toServed(item).content;
      const perOption = new Array(adapter.optionCount).fill(0);
      const classCounts = [];
      let admissible = 0;
      for (const mapping of systems) {
        const index = adapter.keyUnder(c, mapping);
        if (index < 0) continue;
        admissible += 1;
        perOption[index] += 1;
        classCounts.push(adapter.classCount(c, mapping));
      }
      const reachable = perOption.filter((n) => n > 0).length;
      const maxShare = admissible === 0 ? 1 : Math.max(...perOption) / admissible;
      return {
        itemId: item.itemId,
        difficulty: item.difficulty,
        depth: adapter.depthOf(c),
        admissible,
        admissibleShare: admissible / systems.length,
        reachable,
        maxShare,
        classCounts,
        shippedClass: adapter.classCount(c, shippedMapping(item)),
      };
    });

    // Q1. "Safely re-keyable" is defined at the level the SPATIAL type already requires of itself:
    // at least four of five options reachable (three of four for the four-option verbal type). The
    // full distribution is printed too, because one threshold is a summary and not a finding.
    const safeAt = adapter.optionCount - 1;
    const histogram = new Array(adapter.optionCount + 1).fill(0);
    for (const row of rows) histogram[row.reachable] += 1;

    // Q2. Drift of the priced sub-class count, and — for the type whose full model is on `dev` —
    // the drift in the 1..20 rung the product actually serves.
    const classDrift = rows.flatMap((row) => row.classCounts.map((n) => Math.abs(n - row.shippedClass)));
    const classChanged = rows.flatMap((row) => row.classCounts.map((n) => (n === row.shippedClass ? 0 : 1)));

    perFamily[name] = {
      systems: systems.length,
      rows,
      histogram,
      meanReachable: mean(rows.map((r) => r.reachable)),
      safeFraction: rows.filter((r) => r.reachable >= safeAt).length / rows.length,
      fullFraction: rows.filter((r) => r.reachable === adapter.optionCount).length / rows.length,
      deadFraction: rows.filter((r) => r.reachable <= 1).length / rows.length,
      meanMaxShare: mean(rows.map((r) => r.maxShare)),
      worstMaxShare: Math.max(...rows.map((r) => r.maxShare)),
      meanAdmissibleShare: mean(rows.map((r) => r.admissibleShare)),
      classDriftMean: mean(classDrift),
      classDriftMax: maxOf(classDrift),
      classChangedFraction: mean(classChanged),
    };
  }

  return { bank, adapter, items, tray, perFamily, checked };
}

/**
 * The mapping the bank shipped, wherever each type records it. `VER-MORPHO-01` splits its system in
 * two — `affixMap` is the hidden part, `stemMap` names the pictures and is not a relabelling target.
 */
function shippedMapping(item) {
  const system = item.answer.system;
  return system?.mapping ?? system?.affixMap ?? null;
}
/** Option keys are strings on all four of these types, but be explicit rather than assume it. */
function optionKey(option, item) {
  return option.key ?? item.content.options.indexOf(option);
}

/* ==================================================================== *
 * Q2, in the product's own units — FLU-OPCHAIN-01 only.
 *
 * `difficulty` is `difficultyFromLevers({depth, geom}, distractorSimilarity)`. `depth` is the chain
 * length and is invariant under any relabelling. `geom` is the count of DISTINCT orientation
 * operators, and a free relabelling moves it. `distractorSimilarity` is held at the value the bank
 * recorded, which isolates the geom term: it is the drift attributable to the mapping alone.
 * ==================================================================== */

function fluDifficultyDrift(result) {
  const { items, adapter } = result;
  const out = {};
  for (const [name, family] of Object.entries(result.perFamily)) {
    const drifts = [];
    const rungMoves = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = family.rows[i];
      const levers = item.provenance.levers;
      const shipped = fluDifficultyFromLevers(
        { depth: levers.depth, geom: levers.geom },
        levers.distractorSimilarity,
      );
      for (const geom of row.classCounts) {
        const moved = fluDifficultyFromLevers(
          { depth: levers.depth, geom },
          levers.distractorSimilarity,
        );
        drifts.push(Math.abs(moved - shipped));
        // A 0.5-point rung is the bank's own granularity; anything past half of one is a rung move.
        if (Math.abs(moved - shipped) > 0.25) rungMoves.push(1);
        else rungMoves.push(0);
      }
    }
    out[name] = {
      meanAbsDrift: mean(drifts),
      maxAbsDrift: maxOf(drifts),
      p95AbsDrift: quantile(drifts, 0.95),
      rungMoveFraction: mean(rungMoves),
      // The span of the scale, for reference: a drift is only meaningful against it.
      scaleSpan: 19,
      baseSpan:
        fluBaseScore({ depth: 4, geom: 3 }) - fluBaseScore({ depth: 1, geom: 0 }),
    };
  }
  return out;
}

function quantile(xs, q) {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

/**
 * The obvious remedy for Q2, and what it costs: RECOMPUTE the rung per session.
 *
 * The server knows the session mapping, so it can price the item under the mapping the child will
 * actually meet, and the drift above becomes zero by definition. Two things then have to be checked
 * rather than assumed, and this measures both.
 *
 *   LADDER   the recomputed rungs are a different distribution from the shipped one, so a bank that
 *            fills every 0.5-point rung as shipped need not fill them per session.
 *   LEAK     `difficulty` is SERVED. If a recomputed difficulty inverts to the priced lever, then
 *            serving it hands the client how many of the chain's badges are orientation badges —
 *            two anti-leak measures assembling into a leak, which is the failure mode
 *            `FLU-OPCHAIN-01`'s own rebuild report names.
 */
function fluRecomputedLadder(result, draws) {
  const { adapter, items } = result;
  const RUNGS = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) RUNGS.push(Math.round(d * 100) / 100);
  const rungOf = (difficulty) => Math.round(difficulty * 2) / 2;

  const shortShipped = [];
  const shortRecomputed = [];
  const spanLo = [];
  const spanHi = [];
  let determined = 0;
  let served = 0;

  // Which (geom, similarity) pairs a (depth, difficulty) pair admits. `similarity` is continuous on
  // [0,1], so a geom value is FEASIBLE for a difficulty when solving for it lands inside that range.
  const feasibleGeoms = (depth, difficulty) => {
    const out = [];
    for (let geom = 0; geom <= Math.min(depth, 3); geom++) {
      if (depth - geom > 3) continue;
      const lo = fluDifficultyFromLevers({ depth, geom }, 0);
      const hi = fluDifficultyFromLevers({ depth, geom }, 1);
      if (difficulty >= lo - 1e-6 && difficulty <= hi + 1e-6) out.push(geom);
    }
    return out;
  };

  for (const truth of draws) {
    const shipped = new Map();
    const recomputed = new Map();
    const rungs = [];
    for (const item of items) {
      if (adapter.keyUnder(item.content, truth) < 0) continue;
      const levers = item.provenance.levers;
      const geom = adapter.classCount(item.content, truth);
      const difficulty =
        Math.round(
          fluDifficultyFromLevers({ depth: levers.depth, geom }, levers.distractorSimilarity) * 100,
        ) / 100;
      rungs.push(difficulty);
      const a = rungOf(item.difficulty);
      const b = rungOf(difficulty);
      shipped.set(a, (shipped.get(a) ?? 0) + 1);
      recomputed.set(b, (recomputed.get(b) ?? 0) + 1);

      served += 1;
      if (feasibleGeoms(levers.depth, difficulty).length === 1) determined += 1;
    }
    shortShipped.push(RUNGS.filter((r) => (shipped.get(r) ?? 0) < 5).length / RUNGS.length);
    shortRecomputed.push(RUNGS.filter((r) => (recomputed.get(r) ?? 0) < 5).length / RUNGS.length);
    spanLo.push(Math.min(...rungs));
    spanHi.push(maxOf(rungs));
  }

  return {
    sessions: draws.length,
    shortUnderShipped: mean(shortShipped),
    shortUnderRecomputed: mean(shortRecomputed),
    meanSpanLo: mean(spanLo),
    meanSpanHi: mean(spanHi),
    leverDeterminedFraction: served === 0 ? 0 : determined / served,
  };
}

/* ==================================================================== *
 * Q3 — do the four non-key options stay NAMED partial rules under a new mapping?
 *
 * FLU-OPCHAIN-01 only, because it is the type whose §4.6 strategy trace is on `dev` to be checked
 * against. Under the shipped mapping every distractor is by construction the output of a named
 * partial rule (reorder / twice / drop / substitute / first-only / identity). Under a different
 * mapping the chain is different, so its partial rules are different, and the on-screen figures
 * may be the output of none of them.
 * ==================================================================== */

function fluDistractorSurvival(result, systems, sampleEvery) {
  const { items, adapter } = result;
  let pairs = 0;
  let allNamed = 0;
  const namedCounts = [];
  for (let i = 0; i < items.length; i += sampleEvery) {
    const c = items[i].content;
    for (const mapping of systems) {
      const keyIndex = adapter.keyUnder(c, mapping);
      if (keyIndex < 0) continue;
      const ops = c.chain.map((b) => mapping[b]);
      const reachableByRule = new Set(
        fluPartialRules(ops).map((rule) => fluKey(fluChain(rule.chain, c.input))),
      );
      let named = 0;
      c.options.forEach((o, index) => {
        if (index === keyIndex) return;
        if (reachableByRule.has(fluKey(o.figure))) named += 1;
      });
      pairs += 1;
      namedCounts.push(named);
      if (named === 4) allNamed += 1;
    }
  }
  return {
    pairs,
    allNamedFraction: pairs === 0 ? 0 : allNamed / pairs,
    meanNamed: mean(namedCounts),
  };
}

/* ==================================================================== *
 * Q4 — the residual, and what per-session keying actually buys.
 *
 * Two numbers, and the gap between them is the whole argument:
 *
 *   PER-ITEM CEILING   the best a client can do on ONE item knowing only that the session mapping
 *                      is drawn uniformly from the family: play the option the most mappings key.
 *                      This is unchanged by per-session generation — it is a property of the item.
 *   WITHIN-SESSION     the same intersection attack the shipped bank falls to, run against ONE
 *                      session's items. Per-session keying does not stop it; it only stops the
 *                      result carrying to the next child.
 * ==================================================================== */

/** The mappings a run of sessions draws. Shared, so every per-session table describes one sample. */
function drawSessions(systems, sessions, rng) {
  return Array.from({ length: sessions }, () => systems[Math.floor(rng() * systems.length)]);
}

function sessionSimulation(result, familyName, systems, draws, blockLength, rng) {
  const { adapter, items, perFamily } = result;

  const servableShares = [];
  const pinnedAfter = { onScreen: [], reveal: [] };
  const slotWorst = [];
  const rungsFilled = [];
  const rungsShort = [];
  const perItemCeiling = mean(perFamily[familyName].rows.map((r) => r.maxShare));

  // What the bank claims about its own ladder, so the session figure has something to fall short of:
  // §1.1(c) requires every 0.5-point rung of the 1..20 scale to carry at least five items.
  const RUNGS = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) RUNGS.push(Math.round(d * 100) / 100);
  const rungOf = (difficulty) => Math.round(difficulty * 2) / 2;
  const bankRungs = new Map();
  for (const item of items) {
    const r = rungOf(item.difficulty);
    bankRungs.set(r, (bankRungs.get(r) ?? 0) + 1);
  }

  for (const truth of draws) {
    // How much of the bank this session can serve at all, and where on the ladder it lands.
    const servable = [];
    for (const item of items) {
      const index = adapter.keyUnder(item.content, truth);
      if (index >= 0) servable.push({ item, index });
    }
    servableShares.push(servable.length / items.length);

    const counts = new Map();
    for (const { item } of servable) {
      const r = rungOf(item.difficulty);
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    rungsFilled.push([...RUNGS].filter((r) => (counts.get(r) ?? 0) > 0).length / RUNGS.length);
    rungsShort.push([...RUNGS].filter((r) => (counts.get(r) ?? 0) < 5).length / RUNGS.length);

    // Key-slot balance under this draw: the shipped round-robin cursor is gone, so this is what
    // replaces it and it has to be checked rather than assumed.
    const slots = new Array(adapter.optionCount).fill(0);
    for (const { index } of servable) slots[index] += 1;
    slotWorst.push(Math.max(...slots) / Math.max(1, servable.length));

    // The within-session intersection attack, on this session's own block, under the two channels
    // a learning block actually gives a client. Both are the published F6 procedure — keep the
    // systems still consistent with what has been seen, answer with the option the survivors most
    // agree on — and "pinned" is F6's own definition, the survivor set collapsing to one.
    const order = shuffled(servable, rng).slice(0, blockLength);
    for (const channel of ['onScreen', 'reveal']) {
      let surviving = systems;
      let pinned = null;
      let hits = 0;
      for (let t = 0; t < order.length; t++) {
        const c = order[t].item.content;
        const truthIndex = order[t].index;

        // Answer BEFORE this item's own constraint is applied, which is the order a session runs in.
        const tally = new Array(adapter.optionCount).fill(0);
        for (const m of surviving) {
          const index = adapter.keyUnder(c, m);
          if (index >= 0) tally[index] += 1;
        }
        const best = tally.indexOf(maxOf(tally));
        if (best === truthIndex) hits += 1;

        surviving = surviving.filter((m) => {
          const index = adapter.keyUnder(c, m);
          // `onScreen`: the client knows only that the machine's output was one of the five figures.
          // `reveal`: the block shows which one after the child commits (U6/U7), so the client also
          // knows WHICH — a strictly stronger constraint, and the one a real block hands over.
          return channel === 'onScreen' ? index >= 0 : index === truthIndex;
        });
        if (pinned === null && surviving.length === 1) pinned = t + 1;
      }
      (channel === 'onScreen' ? pinnedAfter.onScreen : pinnedAfter.reveal).push({
        pinned,
        accuracy: hits / Math.max(1, order.length),
      });
    }
  }

  return {
    family: familyName,
    systems: systems.length,
    sessions: draws.length,
    blockLength,
    meanServableShare: mean(servableShares),
    minServableShare: Math.min(...servableShares),
    meanWorstSlot: mean(slotWorst),
    perItemCeiling,
    onScreen: channelSummary(pinnedAfter.onScreen, blockLength),
    reveal: channelSummary(pinnedAfter.reveal, blockLength),
    bankRungsShort: [...RUNGS].filter((r) => (bankRungs.get(r) ?? 0) < 5).length / RUNGS.length,
    meanRungsFilled: mean(rungsFilled),
    meanRungsShort: mean(rungsShort),
  };
}

function channelSummary(runs, blockLength) {
  const pinnedRuns = runs.filter((r) => r.pinned !== null);
  return {
    everPinnedFraction: pinnedRuns.length / Math.max(1, runs.length),
    medianPinnedAt: pinnedRuns.length === 0 ? null : quantile(pinnedRuns.map((r) => r.pinned), 0.5),
    meanAccuracy: mean(runs.map((r) => r.accuracy)),
    blockLength,
  };
}

function shuffled(array, rng) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Why the servable share is what it is: the admissible mapping count collapses with chain depth.
 *
 * An item of depth `d` is keyed by a mapping only if that mapping's operator chain lands on one of
 * five figures, and there are P(6,d) chains to land — 6 at depth 1 and 360 at depth 4. So the
 * ladder is not thinned uniformly, it is CUT OFF AT THE TOP, which is precisely the truncation
 * §1.1(c) exists to prevent.
 */
function servabilityByDepth(result, familyName) {
  const { adapter, items, perFamily } = result;
  const byDepth = new Map();
  items.forEach((item, i) => {
    const row = perFamily[familyName].rows[i];
    const d = row.depth;
    if (!byDepth.has(d)) byDepth.set(d, { n: 0, admissible: [], reachable: [], difficulty: [] });
    const bucket = byDepth.get(d);
    bucket.n += 1;
    bucket.admissible.push(row.admissibleShare);
    bucket.reachable.push(row.reachable);
    bucket.difficulty.push(item.difficulty);
  });
  return [...byDepth.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([depth, b]) => ({
      depth,
      n: b.n,
      meanAdmissibleShare: mean(b.admissible),
      meanReachable: mean(b.reachable),
      difficultyLo: Math.min(...b.difficulty),
      difficultyHi: Math.max(...b.difficulty),
    }));
}

/* ==================================================================== *
 * REPORT
 * ==================================================================== */

function main() {
  const wantJson = process.argv.includes('--json');
  const rng = makeRng(SEED);
  const results = [];

  for (const bank of BANKS) {
    let result;
    try {
      result = measure(bank);
    } catch (error) {
      console.error(`SKIPPED ${bank.label}: ${error.message}`);
      continue;
    }
    results.push(result);
  }

  const report = { seed: SEED, banks: [] };

  for (const result of results) {
    const { bank, adapter, items, perFamily } = result;
    const entry = {
      label: bank.label,
      n: items.length,
      optionCount: adapter.optionCount,
      floor: adapter.floor,
      pricedLever: adapter.leverName,
      pricedClass: adapter.className,
      free: summary(perFamily.free),
      class: summary(perFamily.class),
    };
    if (bank.typeCode === 'FLU-OPCHAIN-01') {
      const free = bijections(result.tray, adapter.vocabulary);
      const cls = classPreservingFamily(shippedMapping(items[0]), adapter.classes);
      entry.difficulty = fluDifficultyDrift(result);
      entry.distractors = {
        free: fluDistractorSurvival(result, free, 13),
        class: fluDistractorSurvival(result, cls, 3),
      };
      // One sample of 40 draws, reused by every per-session table below, so the shipped-rung
      // column of the ladder table and the servability column of the cost table describe the
      // same 40 sessions rather than two independent samples of the same quantity.
      const freeDraws = drawSessions(free, 40, rng);
      const classDraws = drawSessions(cls, 40, rng);
      entry.sessions = {
        free: sessionSimulation(result, 'free', free, freeDraws, 30, rng),
        class: sessionSimulation(result, 'class', cls, classDraws, 30, rng),
      };
      entry.byDepth = servabilityByDepth(result, 'free');
      entry.recomputed = fluRecomputedLadder(result, freeDraws);
    }
    report.banks.push(entry);
  }

  if (wantJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`# Stage 2 per-session re-keying — feasibility measurement`);
  console.log(`seed: ${SEED}\n`);

  console.log(`## Q1  How many options can a session mapping make correct?\n`);
  console.log(
    `| bank | n | options | family | systems | mean reachable | >= k-1 reachable | all reachable | <= 1 reachable | mean modal share | worst |`,
  );
  console.log(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const b of report.banks) {
    for (const family of ['free', 'class']) {
      const s = b[family];
      console.log(
        `| \`${b.label}\` | ${b.n} | ${b.optionCount} | ${family} | ${s.systems} | ${f2(s.meanReachable)} | ` +
          `**${pct(s.safeFraction)}** | ${pct(s.fullFraction)} | ${pct(s.deadFraction)} | ` +
          `${pct(s.meanMaxShare)} | ${pct(s.worstMaxShare)} |`,
      );
    }
  }

  console.log(`\n### Reachable-option histogram (count of items by number of reachable options)\n`);
  for (const b of report.banks) {
    for (const family of ['free', 'class']) {
      console.log(
        `${b.label.padEnd(20)} ${family.padEnd(6)} ${b[family].histogram
          .map((n, i) => `${String(i)}:${String(n)}`)
          .join('  ')}`,
      );
    }
  }

  console.log(`\n## Q2  Does the calibrated difficulty survive?\n`);
  console.log(
    `Every one of the four types prices a count of one operator sub-class. A FREE relabelling moves ` +
      `that count; a CLASS-PRESERVING one cannot.\n`,
  );
  console.log(`| bank | priced lever | family | mappings that move it | mean drift (lever units) | max |`);
  console.log(`| --- | --- | --- | --- | --- | --- |`);
  for (const b of report.banks) {
    for (const family of ['free', 'class']) {
      const s = b[family];
      console.log(
        `| \`${b.label}\` | \`${b.pricedLever}\` (${b.pricedClass}) | ${family} | ` +
          `**${pct(s.classChangedFraction)}** | ${f2(s.classDriftMean)} | ${f2(s.classDriftMax)} |`,
      );
    }
  }

  const flu = report.banks.find((b) => b.label === 'FLU-OPCHAIN-01');
  if (flu?.difficulty) {
    console.log(`\n### The same drift in the 1..20 rung the product serves (FLU-OPCHAIN-01)\n`);
    console.log(`| family | mean \\|Δdifficulty\\| | p95 | max | items moved off their 0.5 rung |`);
    console.log(`| --- | --- | --- | --- | --- |`);
    for (const family of ['free', 'class']) {
      const d = flu.difficulty[family];
      console.log(
        `| ${family} | **${f2(d.meanAbsDrift)}** | ${f2(d.p95AbsDrift)} | ${f2(d.maxAbsDrift)} | ` +
          `**${pct(d.rungMoveFraction)}** |`,
      );
    }
  }

  if (flu?.distractors) {
    console.log(`\n## Q3  Do the distractors stay named partial rules? (FLU-OPCHAIN-01)\n`);
    console.log(`| family | (item, mapping) pairs | all four still named | mean named of 4 |`);
    console.log(`| --- | --- | --- | --- |`);
    for (const family of ['free', 'class']) {
      const d = flu.distractors[family];
      console.log(
        `| ${family} | ${d.pairs} | **${pct(d.allNamedFraction)}** | ${f2(d.meanNamed)} |`,
      );
    }
  }

  if (flu?.byDepth) {
    console.log(`\n## Q4a  Why the servable share collapses: admissibility falls with depth\n`);
    console.log(`| chain depth | items | difficulty span | relabellings on screen | mean reachable options |`);
    console.log(`| --- | --- | --- | --- | --- |`);
    for (const d of flu.byDepth) {
      console.log(
        `| ${d.depth} | ${d.n} | ${f2(d.difficultyLo)} – ${f2(d.difficultyHi)} | ` +
          `**${pct(d.meanAdmissibleShare)}** | ${f2(d.meanReachable)} |`,
      );
    }
  }

  if (flu?.sessions) {
    console.log(`\n## Q4b  What a session costs, and what it does not fix (FLU-OPCHAIN-01)\n`);
    console.log(
      `| family | systems | bank servable under one draw | 0.5-rungs left short of 5 items | worst key slot | per-item ceiling |`,
    );
    console.log(`| --- | --- | --- | --- | --- | --- |`);
    for (const family of ['free', 'class']) {
      const s = flu.sessions[family];
      console.log(
        `| ${family} | ${s.systems} | **${pct(s.meanServableShare)}** (min ${pct(s.minServableShare)}) | ` +
          `**${pct(s.meanRungsShort)}** (bank as shipped: ${pct(s.bankRungsShort)}) | ` +
          `${pct(s.meanWorstSlot)} | ${pct(s.perItemCeiling)} |`,
      );
    }

    if (flu.recomputed) {
      const r = flu.recomputed;
      console.log(`\n### The remedy for Q2, priced: recompute the rung per session\n`);
      console.log(
        `| | 0.5-rungs short of 5 items | mean served ladder span | serving it determines \`geom\` |`,
      );
      console.log(`| --- | --- | --- | --- |`);
      console.log(`| bank as shipped | 0.0% | 1.02 – 19.98 | n/a (\`geom\` is fixed) |`);
      console.log(
        `| session subset, shipped rung | ${pct(r.shortUnderShipped)} | — | — |`,
      );
      console.log(
        `| session subset, recomputed rung | **${pct(r.shortUnderRecomputed)}** | ` +
          `${f2(r.meanSpanLo)} – ${f2(r.meanSpanHi)} | **${pct(r.leverDeterminedFraction)}** of served items |`,
      );
      console.log(
        `\nRecomputing removes the drift exactly and does not restore the ladder. It also opens a ` +
          `channel: \`difficulty\` is served, and on ${pct(r.leverDeterminedFraction)} of items the ` +
          `served pair (chain length, recomputed difficulty) admits only one \`geom\` — so the ` +
          `client is told how many of the chain's badges are orientation badges.`,
      );
    }

    console.log(`\n### The residual: the same intersection attack, inside one session\n`);
    console.log(
      `| family | channel | sessions where the system is pinned exactly | median trial it happens on | attacker accuracy over the block |`,
    );
    console.log(`| --- | --- | --- | --- | --- |`);
    for (const family of ['free', 'class']) {
      for (const channel of ['onScreen', 'reveal']) {
        const s = flu.sessions[family][channel];
        console.log(
          `| ${family} | ${channel} | **${pct(s.everPinnedFraction)}** | ` +
            `${s.medianPinnedAt === null ? '—' : `**trial ${String(s.medianPinnedAt)}**`} | ` +
            `**${pct(s.meanAccuracy)}** |`,
        );
      }
    }
    console.log(
      `\n40 sessions, 30-trial block, seeded. \`onScreen\` is the published F6 procedure — the client ` +
        `knows only that the machine's output was one of the five figures. \`reveal\` adds the ` +
        `post-commit reveal a learning block gives by design (§9 U6/U7), which says WHICH figure. ` +
        `Per-session generation stops the result carrying to the next child; it does not stop this ` +
        `child.`,
    );
  }
}

function summary(family) {
  return {
    systems: family.systems,
    histogram: family.histogram,
    meanReachable: family.meanReachable,
    safeFraction: family.safeFraction,
    fullFraction: family.fullFraction,
    deadFraction: family.deadFraction,
    meanMaxShare: family.meanMaxShare,
    worstMaxShare: family.worstMaxShare,
    meanAdmissibleShare: family.meanAdmissibleShare,
    classDriftMean: family.classDriftMean,
    classDriftMax: family.classDriftMax,
    classChangedFraction: family.classChangedFraction,
  };
}

main();
