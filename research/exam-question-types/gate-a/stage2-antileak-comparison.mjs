// One content-only attacker, run against all four Stage 2 banks, so their anti-leak figures are
// comparable for the first time.
//
// WHY THIS FILE EXISTS. Each Stage 2 type published an anti-leak figure measured by its own
// generator's own checker, and no two of them used the same statistic:
//
//   FLU-OPCHAIN-01   max over a slice of three FIXED strategy means, fixed difficulty edges
//   QUANT-GLYPHNUM-01 the same three-strategy maximum, fixed difficulty edges
//   SPA-XFORM-01     the MODAL strategy mean alone, equal-count quartiles
//   VER-MORPHO-01    mean of max(votes)/sum(votes) — a posterior SHARE, not a hit rate — quartiles
//
// Four numbers computed four ways on two different slicings cannot be ranked against each other.
// This probe recomputes all of them from one engine, on one slicing, with one definition of a hit.
//
// THE THREAT MODEL, AND THE LINE IT DOES NOT CROSS. `servedItemSchema` is
// `bankItemSchema.omit({answer, scoring, provenance})` and `toServedItem()` additionally drops
// `demoPath`, so a browser holds `{itemId, typeCode, domain, difficulty, ageBands, content,
// syntheticOnly, validated}` and nothing else. Every attack below is handed a served projection and
// never sees `answer`; the key is passed separately, to the SCORER, on a different argument. An
// attack that reads a server-only field proves nothing, so the structure of this file makes reading
// one impossible rather than merely discouraged.
//
// THE ATTACK FAMILIES, WEAKEST FIRST.
//
//   F0 determined       brute force leaves exactly one option. Should be zero everywhere.
//   F1 uniform          guess evenly among the options some mapping reaches. Pure elimination.
//   F2 vote-weighted    take the option the most surviving mappings point at (modal), splitting
//                       ties. Its mirror, anti-modal, is scored too: a generator that pushes the
//                       key away from modal hands the other tail a certainty, so reporting modal
//                       alone would be choosing one's own evidence.
//   F2b best rank tier  MINE, and the cheapest thing in this file. Modal and anti-modal are the
//                       FIRST and LAST of k vote ranks, and the middle ones are just as available.
//                       A generator that keeps the key off both ends has not kept it off rank 2. So
//                       this scores all k ranks and takes the best — one fitted integer over the
//                       whole slice, no conditioning, essentially no capacity to overfit.
//   F3 sorted-vote      the family found while rebuilding FLU-OPCHAIN-01. The client sees the whole
//                       sorted vote vector — the SHAPE — so it can run a different rank tier per
//                       shape. Dominates F1 and F2 by construction.
//   F4 positional-vote  MINE. The shape throws away which SLOT holds which vote count, and slot
//                       identity is content too. Condition on the unsorted vote vector and allow
//                       the attacker to name a slot as well as a tier. A strict refinement of F3's
//                       partition over a strict superset of F3's policies, so it dominates F3 by
//                       construction; the question this probe answers is by how much.
//   F5 covariate-vote   MINE. F4 plus the served covariates a client also holds — chain depth and
//                       the difficulty band. Same policy set, finer partition.
//   F7 no-brute-force   MINE. Drop the brute force entirely and condition on the served COVARIATES
//                       alone — chain depth, presentation direction — then name a slot. Anything
//                       this scores above the floor is a leak in how the generator allocated its
//                       key-position cursor, not in the symbol system, and it costs the client
//                       nothing. F7b adds the item's rank in the bank's difficulty order, which a
//                       scraper can compute and which tracks the emission index those cursors are a
//                       function of.
//   F6 cross-item       MINE, and the one that is not a per-item property at all. The served bank
//                       is the CONSISTENT arm: one hidden symbol->meaning system for every item in
//                       it. So a client that has seen several items can intersect "the key of that
//                       item was on that screen" across all of them, and each item it adds shrinks
//                       the set of systems still possible. This is measured as a curve — items
//                       collected against systems surviving — because the number that matters is
//                       how many items a session must serve before the mapping is pinned.
//
// F3, F4 and F5 are FITTED attackers: "run whichever tier is the key most often for this shape"
// presupposes knowing which option was the key on the items used to fit. That is not free, and it
// is not impossible either — a learning block reveals the resolved instance after the child
// commits, so a scraper accumulates labelled items by playing. Both readings are therefore
// reported: the in-sample fit, which is an upper bound and is what the published FLU-OPCHAIN-01
// figure is, and a seeded 5-fold cross-validated fit, which is what an attacker actually achieves
// after learning the pattern from labelled items it did not have to answer.
//
// AND A CONTROL, BECAUSE A FITTED ATTACKER ALWAYS SCORES SOMETHING. Refining a partition can only
// raise an in-sample score, so "F4 beats F3 in sample" is true by construction and means nothing on
// its own. Every conditional family therefore also reports a seeded label-permutation null: the
// same fit, run after pairing each item's vote vector with another item's key. What the family is
// worth is the gap between the observed number and that null, and the cross-validated column is
// what survives it.
//
// PER-ITEM WORST CASES, NOT ONLY MEANS. A bank mean can sit at the floor while individual items are
// outright wins for an attacker. Every family reports the count of items it scores 1.0 on.
//
// Run:
//   node research/exam-question-types/gate-a/stage2-antileak-comparison.mjs
//   node research/exam-question-types/gate-a/stage2-antileak-comparison.mjs --json
//
// Banks are read straight out of the git object database by `<ref>:<path>`, because three of the
// four live on unmerged branches and copying them into this branch would collide with the merge in
// flight and detach the figures from the banks Gate A was actually run against. Nothing here writes
// to any working tree.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/* ==================================================================== *
 * SERVED PROJECTION — the only thing any attack is allowed to see.
 * ==================================================================== */

/** Exactly what `servedItemSchema` omits, plus the `demoPath` `toServedItem()` drops at runtime. */
const SERVER_ONLY_FIELDS = ['answer', 'scoring', 'provenance', 'demoPath'];

function toServed(item) {
  const served = { ...item };
  for (const field of SERVER_ONLY_FIELDS) delete served[field];
  return served;
}

/** Belt and braces: a served item that still carries a server-only field is a bug in this file. */
function assertServed(served) {
  for (const field of SERVER_ONLY_FIELDS) {
    if (field in served) throw new Error(`served item still carries "${field}"`);
  }
  return served;
}

/* ==================================================================== *
 * SEEDED RNG — the same xmur3 -> mulberry32 idiom every generator here uses, so fold assignment
 * and collection order are reproducible from the seed printed in the header.
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
    return (h ^= h >>> 16) >>> 0;
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

const SEED = 'STAGE2_ANTILEAK_COMPARISON|v1';
const makeRng = (label) => mulberry32(xmur3(`${SEED}|${label}`)());

function shuffled(array, rng) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ==================================================================== *
 * MAPPING ENUMERATION — shared by every type.
 * ==================================================================== */

/**
 * Every injective assignment of `symbols` into `vocabulary`.
 *
 * A hidden system is a bijection over the whole tray, but a single item only constrains the symbols
 * it actually shows. The bijections project onto these partial assignments with a constant
 * multiplicity of (|vocabulary| - |symbols|)!, so vote RATIOS — which is all any attack here uses —
 * are identical either way, and enumerating the partial assignments is cheaper.
 */
function injections(symbols, vocabulary) {
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

/* ==================================================================== *
 * FLU-OPCHAIN-01 — six operators on a figure; the chain composes left to right.
 *
 * Re-implemented rather than imported. Importing a generator's own `applyOp` would make a generator
 * that is wrong about its own algebra agree with itself, which is the one thing an audit exists to
 * rule out.
 * ==================================================================== */

const FLU_GEOM = ['turn', 'flip', 'slant'];
const FLU_OPS = [...FLU_GEOM, 'swap', 'ring', 'twin'];
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

const fluApply = (chain, mapping, input) =>
  chain.reduce((state, badge) => fluStep(mapping[badge], state), input);

/* ==================================================================== *
 * SPA-XFORM-01 — six cell permutations of a 4x4 lattice.
 * ==================================================================== */

const SPA_GRID = 4;
const SPA_CELLS = SPA_GRID * SPA_GRID;

function cellPermutation(move) {
  const table = new Array(SPA_CELLS);
  for (let r = 0; r < SPA_GRID; r++) {
    for (let c = 0; c < SPA_GRID; c++) {
      const [nr, nc] = move(r, c);
      table[r * SPA_GRID + c] = nr * SPA_GRID + nc;
    }
  }
  return table;
}

const SPA_OPS = ['pivot', 'mirror', 'braid', 'stagger', 'drift', 'shunt'];
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
const spaApply = (chain, mapping, input) =>
  chain.reduce((state, badge) => spaStep(mapping[badge], state), input);

/* ==================================================================== *
 * QUANT-GLYPHNUM-01 — five glyphs onto five numeric roles; the item is a ratio on a line.
 * ==================================================================== */

const QUANT_BASE = 4;
const QUANT_SCALES = { scaleI: 1, scaleII: QUANT_BASE, scaleIII: QUANT_BASE * QUANT_BASE };
const QUANT_DIGITS = { digitII: 2, digitIII: 3 };
const QUANT_ROLES = [...Object.keys(QUANT_SCALES), ...Object.keys(QUANT_DIGITS)];
const isScale = (role) => role in QUANT_SCALES;
const isDigit = (role) => role in QUANT_DIGITS;
const roleValue = (role) => QUANT_SCALES[role] ?? QUANT_DIGITS[role];
const round6 = (x) => Math.round(x * 1e6) / 1e6;

/**
 * Read a role sequence as a number. TOTAL by design: a wrong mapping turns scales into digits and
 * produces sequences the grammar never emits, and a partial function there would silently drop
 * attacker hypotheses and flatter the invariant.
 */
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

/* ==================================================================== *
 * VER-MORPHO-01 — six affix meanings on a picture, in two presentation directions.
 * ==================================================================== */

const VER_NUMBER_SWAP = { plural: [1, 3], dual: [1, 2], paucal: [2, 3] };
const VER_MEANINGS = ['plural', 'dual', 'paucal', 'negate', 'resize', 'swapRole'];

function applyMeaning(meaning, picture) {
  if (meaning in VER_NUMBER_SWAP) {
    const [lo, hi] = VER_NUMBER_SWAP[meaning];
    if (picture.count === lo) return { ...picture, count: hi };
    if (picture.count === hi) return { ...picture, count: lo };
    return { ...picture };
  }
  if (meaning === 'negate') return { ...picture, mark: picture.mark === 'none' ? 'cross' : 'none' };
  if (meaning === 'resize') return { ...picture, size: picture.size === 'small' ? 'big' : 'small' };
  if (meaning === 'swapRole') return { ...picture, role: picture.role === 'doer' ? 'target' : 'doer' };
  throw new Error(`unknown meaning "${meaning}"`);
}

const pictureKey = (p) => `${p.kind}|${p.count}|${p.size}|${p.mark}|${p.role}`;
const verApply = (forms, mapping, picture) =>
  forms.reduce((state, form) => applyMeaning(mapping[form], state), picture);

/* ==================================================================== *
 * TYPE ADAPTERS
 *
 * Each returns, from the SERVED item alone, the vote each option carries under the brute force,
 * plus the served covariates the F5 attacker is allowed to condition on. None of them takes the
 * answer key as an argument, which is how "attack only what the browser gets" is enforced here.
 * ==================================================================== */

const ADAPTERS = {
  'FLU-OPCHAIN-01': {
    optionCount: 5,
    floor: 0.2,
    symbolCount: 6,
    votes(served) {
      const { input, chain, options } = served.content;
      const tally = new Map();
      for (const mapping of injections([...new Set(chain)], FLU_OPS)) {
        const k = fluKey(fluApply(chain, mapping, input));
        tally.set(k, (tally.get(k) ?? 0) + 1);
      }
      return options.map((o) => tally.get(fluKey(o.figure)) ?? 0);
    },
    covariates: (served) => ({ depth: served.content.chain.length }),
    /** Systems still possible given this one item: those whose output is on screen. */
    systemFilter(served, systems) {
      const { input, chain, options } = served.content;
      const onScreen = new Set(options.map((o) => fluKey(o.figure)));
      return systems.filter((m) => onScreen.has(fluKey(fluApply(chain, m, input))));
    },
    systemVote(served, systems) {
      const { input, chain, options } = served.content;
      const tally = new Map();
      for (const m of systems) {
        const k = fluKey(fluApply(chain, m, input));
        tally.set(k, (tally.get(k) ?? 0) + 1);
      }
      return options.map((o) => tally.get(fluKey(o.figure)) ?? 0);
    },
    allSystems: (tray) => injections(tray, FLU_OPS),
    trayOf: (served) => served.content.badgeTray,
  },

  'SPA-XFORM-01': {
    optionCount: 5,
    floor: 0.2,
    symbolCount: 6,
    votes(served) {
      const { input, chain, options } = served.content;
      const tally = new Map();
      for (const mapping of injections([...new Set(chain)], SPA_OPS)) {
        const k = spaKey(spaApply(chain, mapping, input.blocks));
        tally.set(k, (tally.get(k) ?? 0) + 1);
      }
      return options.map((o) => tally.get(spaKey(o.blocks.slice().sort((a, b) => a - b))) ?? 0);
    },
    covariates: (served) => ({ depth: served.content.chain.length }),
    systemFilter(served, systems) {
      const { input, chain, options } = served.content;
      const onScreen = new Set(options.map((o) => spaKey(o.blocks.slice().sort((a, b) => a - b))));
      return systems.filter((m) => onScreen.has(spaKey(spaApply(chain, m, input.blocks))));
    },
    systemVote(served, systems) {
      const { input, chain, options } = served.content;
      const tally = new Map();
      for (const m of systems) {
        const k = spaKey(spaApply(chain, m, input.blocks));
        tally.set(k, (tally.get(k) ?? 0) + 1);
      }
      return options.map((o) => tally.get(spaKey(o.blocks.slice().sort((a, b) => a - b))) ?? 0);
    },
    allSystems: (tray) => injections(tray, SPA_OPS),
    trayOf: (served) => served.content.badgeTray,
  },

  'QUANT-GLYPHNUM-01': {
    optionCount: 5,
    floor: 0.2,
    symbolCount: 5,
    votes(served) {
      const support = quantSupport(served, injections(QUANT_GLYPH_TRAY(served), QUANT_ROLES));
      return served.content.options.map((o) => support.get(round6(o.ratio)) ?? 0);
    },
    covariates: (served) => ({ depth: served.content.expression.length }),
    systemFilter(served, systems) {
      const onScreen = new Set(served.content.options.map((o) => round6(o.ratio)));
      return systems.filter((m) => {
        const r = quantRatio(served, m);
        return r !== null && onScreen.has(r);
      });
    },
    systemVote(served, systems) {
      const support = quantSupport(served, systems);
      return served.content.options.map((o) => support.get(round6(o.ratio)) ?? 0);
    },
    allSystems: (tray) => injections(tray, QUANT_ROLES),
    trayOf: (served) => served.content.glyphTray,
  },

  'VER-MORPHO-01': {
    optionCount: 4,
    floor: 0.25,
    symbolCount: 6,
    votes(served) {
      const c = served.content;
      if (c.direction === 'wordToPicture') {
        const tally = new Map();
        for (const mapping of injections([...new Set(c.wordMorphemes)], VER_MEANINGS)) {
          const k = pictureKey(verApply(c.wordMorphemes, mapping, c.stemPicture));
          tally.set(k, (tally.get(k) ?? 0) + 1);
        }
        return c.options.map((o) => tally.get(pictureKey(o.picture)) ?? 0);
      }
      // picture->word: a mapping is scored by whether each candidate word denotes the target under
      // it. Counted per option and independently, which is the generator's own reading and the one
      // its "leak-free by proof" claim is stated in. F5c below counts the same enumeration the
      // other way and gets a different answer.
      const target = pictureKey(c.targetPicture);
      const votes = c.options.map(() => 0);
      for (const mapping of injections(c.morphemeTray.slice(), VER_MEANINGS)) {
        c.options.forEach((o, i) => {
          if (pictureKey(verApply(o.morphemes, mapping, c.stemPicture)) === target) votes[i] += 1;
        });
      }
      return votes;
    },
    /**
     * MINE. The same 720 mappings, read as a JOINT constraint instead of four marginal ones.
     *
     * An item has exactly one right answer, so under the TRUE mapping exactly one candidate word
     * denotes the target. A mapping under which two of them do, or none, is therefore not the true
     * mapping and the client can discard it. What is left is a vote vector that is no longer equal
     * by symmetry — which is the whole basis of the published "leak-free by proof" claim for this
     * half of the bank.
     */
    jointVotes(served) {
      const c = served.content;
      if (c.direction !== 'pictureToWord') return null;
      const target = pictureKey(c.targetPicture);
      const votes = c.options.map(() => 0);
      for (const mapping of injections(c.morphemeTray.slice(), VER_MEANINGS)) {
        const hits = [];
        c.options.forEach((o, i) => {
          if (pictureKey(verApply(o.morphemes, mapping, c.stemPicture)) === target) hits.push(i);
        });
        if (hits.length === 1) votes[hits[0]] += 1;
      }
      return votes;
    },
    covariates: (served) => ({
      depth:
        served.content.direction === 'wordToPicture'
          ? served.content.wordMorphemes.length
          : served.content.options[0].morphemes.length,
      direction: served.content.direction,
    }),
    systemFilter(served, systems) {
      const c = served.content;
      if (c.direction === 'wordToPicture') {
        const onScreen = new Set(c.options.map((o) => pictureKey(o.picture)));
        return systems.filter((m) =>
          onScreen.has(pictureKey(verApply(c.wordMorphemes, m, c.stemPicture))),
        );
      }
      const target = pictureKey(c.targetPicture);
      return systems.filter(
        (m) =>
          c.options.filter(
            (o) => pictureKey(verApply(o.morphemes, m, c.stemPicture)) === target,
          ).length === 1,
      );
    },
    systemVote(served, systems) {
      const c = served.content;
      if (c.direction === 'wordToPicture') {
        const tally = new Map();
        for (const m of systems) {
          const k = pictureKey(verApply(c.wordMorphemes, m, c.stemPicture));
          tally.set(k, (tally.get(k) ?? 0) + 1);
        }
        return c.options.map((o) => tally.get(pictureKey(o.picture)) ?? 0);
      }
      const target = pictureKey(c.targetPicture);
      const votes = c.options.map(() => 0);
      for (const m of systems) {
        c.options.forEach((o, i) => {
          if (pictureKey(verApply(o.morphemes, m, c.stemPicture)) === target) votes[i] += 1;
        });
      }
      return votes;
    },
    allSystems: (tray) => injections(tray, VER_MEANINGS),
    trayOf: (served) => served.content.morphemeTray,
  },
};

const QUANT_GLYPH_TRAY = (served) => served.content.glyphTray.slice();

function quantRatio(served, mapping) {
  const anchor = served.content.line.maxExpression.map((g) => mapping[g]);
  const anchorValue = quantValueOf(anchor);
  if (anchorValue <= 0) return null;
  return round6(quantValueOf(served.content.expression.map((g) => mapping[g])) / anchorValue);
}

function quantSupport(served, mappings) {
  const support = new Map();
  for (const mapping of mappings) {
    const ratio = quantRatio(served, mapping);
    if (ratio === null) continue;
    support.set(ratio, (support.get(ratio) ?? 0) + 1);
  }
  return support;
}

/* ==================================================================== *
 * PER-ITEM SCORING
 * ==================================================================== */

/**
 * Every fixed strategy's score on one item, plus the descriptors the conditional families group on.
 *
 * `keyIndex` enters here and nowhere upstream: the attacks compute votes, the scorer compares them
 * to the truth.
 */
export function scoreItem(votes, keyIndex) {
  const survivors = votes.map((n, i) => ({ n, i })).filter((s) => s.n > 0);
  if (survivors.length === 0) {
    // No mapping reaches any option: the brute force has refuted the item, not the key. Credited to
    // the attacker as a certainty so this can never flatter a bank; asserted absent below.
    return {
      survivors: 0,
      determined: false,
      uniform: 1,
      modal: 1,
      antiModal: 1,
      maxVoteShare: 1,
      tier: 0,
      tiers: 1,
      tierSize: 1,
      shape: votes.join(','),
      full: votes.join(','),
      keyIndex,
      uniqueModalKey: true,
    };
  }
  const keySurvives = votes[keyIndex] > 0;
  const counts = survivors.map((s) => s.n);
  const hi = Math.max(...counts);
  const lo = Math.min(...counts);
  const pick = (target) => {
    const tied = survivors.filter((s) => s.n === target);
    return tied.some((s) => s.i === keyIndex) ? 1 / tied.length : 0;
  };
  const total = votes.reduce((a, b) => a + b, 0);
  const distinct = [...new Set(votes)].sort((a, b) => b - a);
  return {
    survivors: survivors.length,
    determined: survivors.length === 1,
    uniform: keySurvives ? 1 / survivors.length : 0,
    modal: pick(hi),
    antiModal: pick(lo),
    // VER-MORPHO-01's published statistic: posterior mass on the most-backed option. Recomputed
    // here only so its published figure can be reproduced and then set aside.
    maxVoteShare: total === 0 ? 1 : Math.max(...votes) / total,
    tier: distinct.indexOf(votes[keyIndex]),
    tiers: distinct.length,
    tierSize: votes.filter((v) => v === votes[keyIndex]).length,
    shape: [...votes].sort((a, b) => b - a).join(','),
    full: votes.join(','),
    keyIndex,
    uniqueModalKey: votes[keyIndex] === hi && survivors.filter((s) => s.n === hi).length === 1,
  };
}

/* ==================================================================== *
 * CONDITIONAL-POLICY ATTACKERS (F3, F4, F5)
 *
 * All three are the same machine with a different grouping key: partition the items on something a
 * client can compute, then play the single best policy inside each part. A finer partition and a
 * larger policy set can only raise the in-sample score, so F5 >= F4 >= F3 holds by construction and
 * the cross-validated columns are where the families actually separate.
 * ==================================================================== */

/**
 * The policies available inside a group, as {id -> score on this item}.
 *
 * `tier` policies need the brute force; `slot` policies need nothing at all. F7 therefore turns the
 * tier policies OFF, so whatever it scores is what a client gets without enumerating a single
 * mapping.
 */
function policyScores(entry, optionCount, withSlots, withTiers = true) {
  const scores = new Map();
  if (withTiers) {
    for (let t = 0; t < optionCount; t++) {
      scores.set(`tier:${t}`, entry.tier === t ? 1 / entry.tierSize : 0);
    }
  }
  if (withSlots) {
    for (let s = 0; s < optionCount; s++) {
      scores.set(`slot:${s}`, entry.keyIndex === s ? 1 : 0);
    }
  }
  return scores;
}

function fitPolicies(entries, optionCount, groupOf, withSlots, withTiers = true) {
  const groups = new Map();
  for (const e of entries) {
    const g = groupOf(e);
    const totals = groups.get(g) ?? new Map();
    for (const [id, score] of policyScores(e, optionCount, withSlots, withTiers)) {
      totals.set(id, (totals.get(id) ?? 0) + score);
    }
    groups.set(g, totals);
  }
  const chosen = new Map();
  for (const [g, totals] of groups) {
    let bestId = null;
    let bestScore = -1;
    for (const [id, score] of [...totals].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
    chosen.set(g, bestId);
  }
  return chosen;
}

function applyPolicies(entries, optionCount, groupOf, withSlots, chosen, withTiers = true) {
  let hits = 0;
  let unseen = 0;
  const wins = [];
  for (const e of entries) {
    const id = chosen.get(groupOf(e));
    if (id === undefined) {
      // A group the attacker has never seen. A family that already pays for the brute force falls
      // back to elimination; a brute-force-free family (F7) has nothing to fall back on but the
      // chance floor, and is charged that.
      unseen += 1;
      hits += withTiers ? e.uniform : 1 / optionCount;
      continue;
    }
    const score = policyScores(e, optionCount, withSlots, withTiers).get(id) ?? 0;
    hits += score;
    if (score >= 1 - 1e-9) wins.push(e);
  }
  return { accuracy: entries.length === 0 ? 0 : hits / entries.length, unseen, wins };
}

/**
 * The best SINGLE rank tier over a whole slice (F2b).
 *
 * One integer, fitted once. Modal is `t = 0` and anti-modal is the last non-empty tier, so this
 * generalises two of the three published strategies and scores the ranks between them that nobody
 * looked at. Reported with the tier it picked, because "the key sits at rank 2" is a design fact.
 */
function bestRankTier(entries, optionCount) {
  let best = { tier: 0, accuracy: 0 };
  for (let t = 0; t < optionCount; t++) {
    const accuracy = mean(entries.map((e) => (e.tier === t ? 1 / e.tierSize : 0)));
    if (accuracy > best.accuracy) best = { tier: t, accuracy };
  }
  return best;
}

/**
 * The same fit after breaking the link between an item's vote structure and its key.
 *
 * Each item keeps its own vote vector and borrows another item's key slot, and the tier descriptors
 * are recomputed from that pairing, so the null preserves both the vote shapes and the marginal
 * distribution of key slots and destroys only the association between them. Whatever a family
 * scores here is what its partition buys from sample size alone.
 */
function permutationNull(entries, optionCount, groupOf, withSlots, label, withTiers, rounds = 25) {
  const rng = makeRng(`null|${label}`);
  const votes = entries.map((e) => e.votes);
  const keys = entries.map((e) => e.keyIndex);
  const inSample = [];
  const crossValidated = [];
  for (let r = 0; r < rounds; r++) {
    const permuted = shuffled(keys, rng);
    const shuffledEntries = votes.map((v, i) => ({
      ...scoreItem(v, permuted[i]),
      covariates: entries[i].covariates,
      ordinalMod: entries[i].ordinalMod,
    }));
    inSample.push(
      applyPolicies(
        shuffledEntries,
        optionCount,
        groupOf,
        withSlots,
        fitPolicies(shuffledEntries, optionCount, groupOf, withSlots, withTiers),
        withTiers,
      ).accuracy,
    );
    crossValidated.push(
      crossValidate(shuffledEntries, optionCount, groupOf, withSlots, rng, withTiers).accuracy,
    );
  }
  return { inSample: mean(inSample), cv: mean(crossValidated) };
}

/**
 * Seeded 5-fold: fit the policy table on four fifths of the labelled items, score the fifth it has
 * not seen. A group the fit never saw falls back to the strongest strategy needing no fit at all —
 * eliminate, then guess among what is left.
 */
function crossValidate(entries, optionCount, groupOf, withSlots, rng, withTiers = true) {
  const order = shuffled(
    entries.map((_, i) => i),
    rng,
  );
  const FOLDS = 5;
  let hits = 0;
  let wins = 0;
  for (let f = 0; f < FOLDS; f++) {
    const testIdx = new Set(order.filter((_, i) => i % FOLDS === f));
    const train = entries.filter((_, i) => !testIdx.has(i));
    const test = entries.filter((_, i) => testIdx.has(i));
    if (test.length === 0) continue;
    const out = applyPolicies(
      test,
      optionCount,
      groupOf,
      withSlots,
      fitPolicies(train, optionCount, groupOf, withSlots, withTiers),
      withTiers,
    );
    hits += out.accuracy * test.length;
    wins += out.wins.length;
  }
  return { accuracy: entries.length === 0 ? 0 : hits / entries.length, wins };
}

/**
 * How much of a partition is a lookup table for the key.
 *
 * Over the groups holding two or more items, the share of items whose group agrees on one key slot.
 * A partition that is 90% pure is not a statistical tendency an attacker exploits on average; it is
 * a table it reads off.
 */
function partitionPurity(entries, groupOf) {
  const groups = new Map();
  for (const e of entries) {
    const g = groups.get(groupOf(e)) ?? [];
    g.push(e.keyIndex);
    groups.set(groupOf(e), g);
  }
  let inRepeated = 0;
  let pure = 0;
  for (const slots of groups.values()) {
    if (slots.length < 2) continue;
    inRepeated += slots.length;
    if (new Set(slots).size === 1) pure += slots.length;
  }
  return { inRepeated, pure, share: inRepeated === 0 ? 0 : pure / inRepeated };
}

function conditionalAttack(entries, optionCount, groupOf, withSlots, foldLabel, withTiers = true) {
  const inSample = applyPolicies(
    entries,
    optionCount,
    groupOf,
    withSlots,
    fitPolicies(entries, optionCount, groupOf, withSlots, withTiers),
    withTiers,
  );

  // This is the number an attacker actually achieves once it has learned the pattern from labelled
  // items it did not have to answer.
  const cv = crossValidate(entries, optionCount, groupOf, withSlots, makeRng(foldLabel), withTiers);
  const nulls = permutationNull(entries, optionCount, groupOf, withSlots, foldLabel, withTiers);

  return {
    accuracy: inSample.accuracy,
    cv: cv.accuracy,
    cvWins: cv.wins,
    null: nulls.inSample,
    cvNull: nulls.cv,
    purity: partitionPurity(entries, groupOf),
    groups: new Set(entries.map(groupOf)).size,
    wins: inSample.wins.length,
  };
}

const GROUP_SHAPE = (e) => e.shape;
const GROUP_FULL = (e) => e.full;
const GROUP_COVARIATE = (e) => `${e.full}|${JSON.stringify(e.covariates)}`;
/** F7 conditions on served covariates ALONE — no votes, so no brute force. */
const GROUP_COVARIATE_ONLY = (e) => JSON.stringify(e.covariates);
/** F7b adds the item's rank in the bank's difficulty order, mod the option count. */
const GROUP_ORDINAL = (e) => `${JSON.stringify(e.covariates)}|${e.ordinalMod}`;

/* ==================================================================== *
 * SLICING
 * ==================================================================== */

/** The fixed edges QUANT-GLYPHNUM-01 chose and FLU-OPCHAIN-01 adopted so the tables line up. */
const FIXED_EDGES = [
  [1, 5],
  [5, 10],
  [10, 15],
  [15, 20.01],
];

function sliceFixed(entries) {
  return FIXED_EDGES.map(([lo, hi]) => ({
    label: `${lo}–${hi === 20.01 ? 20 : hi}`,
    items: entries.filter((e) => e.difficulty >= lo && e.difficulty < hi),
  })).filter((s) => s.items.length > 0);
}

/**
 * Equal-count quartiles, which is what SPA-XFORM-01 and VER-MORPHO-01 published against.
 *
 * `ceil`, not `floor`, so a 234-item bank splits 59/59/59/57 and the rows line up with the numbers
 * already in those two reports rather than sitting one item off them.
 */
function sliceQuartiles(entries) {
  const sorted = entries.slice().sort((a, b) => a.difficulty - b.difficulty);
  const size = Math.ceil(sorted.length / 4);
  const out = [];
  for (let q = 0; q < 4; q++) {
    const items = q === 3 ? sorted.slice(3 * size) : sorted.slice(q * size, (q + 1) * size);
    if (items.length === 0) continue;
    out.push({
      label: `Q${q + 1} (${items[0].difficulty.toFixed(2)}–${items[items.length - 1].difficulty.toFixed(2)})`,
      items,
    });
  }
  return out;
}

/* ==================================================================== *
 * THE CROSS-ITEM FAMILY (F6)
 *
 * Not a per-item property. The served bank is the CONSISTENT arm — one hidden system for every item
 * in it — so "the key was on that screen" is a constraint on the SAME unknown every time, and the
 * constraints intersect. Reported as a curve because the design question is not whether the set
 * collapses but after how many items, against the 30-60 trials a learning block actually serves.
 * ==================================================================== */

export function crossItemAttack(adapter, served, keys, label) {
  // The tray is canonical and identical in every item of a bank, which is what makes "the same
  // unknown every time" true. Asserted rather than assumed: a per-item tray order would make the
  // intersection below meaningless.
  const tray = adapter.trayOf(served[0]);
  for (const s of served) {
    if (adapter.trayOf(s).join('|') !== tray.join('|')) {
      throw new Error('the symbol tray is not canonical across the bank');
    }
  }
  const rng = makeRng(`cross|${label}`);
  const order = shuffled(
    served.map((_, i) => i),
    rng,
  );
  let systems = adapter.allSystems(tray);
  const initial = systems.length;
  const curve = [];
  let collapsedAt = null;
  for (let n = 0; n < order.length; n++) {
    systems = adapter.systemFilter(served[order[n]], systems);
    if (systems.length <= 1 && collapsedAt === null) collapsedAt = n + 1;
    if (n + 1 <= 60 || (n + 1) % 100 === 0 || n === order.length - 1) {
      curve.push({ items: n + 1, systems: systems.length });
    }
    if (systems.length <= 1) break;
  }

  // What the surviving set is worth, scored over the whole bank.
  let hits = 0;
  let wins = 0;
  for (let i = 0; i < served.length; i++) {
    const votes = adapter.systemVote(served[i], systems);
    const s = scoreItem(votes, keys[i]);
    hits += s.modal;
    if (s.modal >= 1 - 1e-9) wins += 1;
  }
  return {
    initial,
    surviving: systems.length,
    collapsedAt,
    curve,
    accuracy: hits / served.length,
    wins,
  };
}

/* ==================================================================== *
 * BANK LOADING — from the git object database, never from a working tree.
 * ==================================================================== */

function readBank(spec, repoRoot) {
  if (!spec.includes(':')) {
    return readFileSync(spec, 'utf8');
  }
  const [ref, ...rest] = spec.split(':');
  return execFileSync('git', ['show', `${ref}:${rest.join(':')}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
}

function parseBank(text) {
  return text
    .trim()
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

/* ==================================================================== *
 * THE BANKS UNDER TEST
 * ==================================================================== */

const BANKS = [
  {
    label: 'FLU-OPCHAIN-01 (dev, 6/rung)',
    typeCode: 'FLU-OPCHAIN-01',
    spec: 'origin/dev:research/exam-question-types/banks/FLU-OPCHAIN-01.jsonl',
    published: { bank: 0.282, worst: 0.34, note: 'max of three fixed strategy means, fixed edges' },
  },
  {
    label: 'FLU-OPCHAIN-01 (rebuild, 12/rung)',
    typeCode: 'FLU-OPCHAIN-01',
    spec: 'feat/stage2-flu-opchain-density:research/exam-question-types/banks/FLU-OPCHAIN-01.jsonl',
    published: { bank: 0.201, worst: 0.224, note: 'max of three fixed strategy means, fixed edges' },
  },
  {
    label: 'SPA-XFORM-01',
    typeCode: 'SPA-XFORM-01',
    spec: 'feat/stage2-spa-xform:research/exam-question-types/banks/SPA-XFORM-01.jsonl',
    published: { bank: 0.249, worst: 0.378, note: 'modal strategy mean, equal-count quartiles' },
  },
  {
    label: 'QUANT-GLYPHNUM-01',
    typeCode: 'QUANT-GLYPHNUM-01',
    spec: 'feat/stage2-quant-glyphnum:research/exam-question-types/banks/QUANT-GLYPHNUM-01.jsonl',
    published: { bank: 0.274, worst: 0.286, note: 'max of three fixed strategy means, fixed edges' },
  },
  {
    label: 'VER-MORPHO-01',
    typeCode: 'VER-MORPHO-01',
    spec: 'feat/stage2-ver-morpho:research/exam-question-types/banks/VER-MORPHO-01.jsonl',
    published: { bank: 0.265, worst: 0.283, note: 'mean posterior share max(v)/sum(v), quartiles' },
  },
];

/* ==================================================================== *
 * REPORT
 * ==================================================================== */

const pct = (x) => `${(100 * x).toFixed(1)}%`;
const mean = (xs) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

function measureBank(bank, repoRoot) {
  const adapter = ADAPTERS[bank.typeCode];
  if (!adapter) throw new Error(`no adapter for ${bank.typeCode}`);
  const items = parseBank(readBank(bank.spec, repoRoot));

  // The item's rank in the bank's difficulty order. The generators emit items rung by rung while a
  // round-robin cursor walks the key slot, so this rank is a proxy for the emission index that
  // cursor is a function of. Ties break on `itemId` — served, like `difficulty` — and NOT on
  // position in the bank file, which a client does not have and which would flatter the attack.
  const ordinalOf = new Map(
    items
      .map((item) => [item.itemId, item.difficulty])
      .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
      .map(([id], rank) => [id, rank]),
  );

  const entries = items.map((item) => {
    const served = assertServed(toServed(item));
    const votes = adapter.votes(served);
    const keyIndex = served.content.options.findIndex((o) => o.key === item.answer.correctKey);
    if (keyIndex < 0) throw new Error(`${item.itemId}: correctKey names no option`);
    if (votes[keyIndex] === 0) {
      throw new Error(`${item.itemId}: the key is unreachable — the re-implemented semantics differ`);
    }
    const joint = adapter.jointVotes ? adapter.jointVotes(served) : null;
    return {
      ...scoreItem(votes, keyIndex),
      votes,
      itemId: item.itemId,
      difficulty: item.difficulty,
      ordinalMod: ordinalOf.get(item.itemId) % adapter.optionCount,
      covariates: adapter.covariates(served),
      joint: joint ? scoreItem(joint, keyIndex) : null,
      served,
    };
  });

  const summarise = (label, items_) => {
    const oc = adapter.optionCount;
    const f3 = conditionalAttack(items_, oc, GROUP_SHAPE, false, `${bank.label}|${label}|f3`);
    const f4 = conditionalAttack(items_, oc, GROUP_FULL, true, `${bank.label}|${label}|f4`);
    const f5 = conditionalAttack(items_, oc, GROUP_COVARIATE, true, `${bank.label}|${label}|f5`);
    const f7 = conditionalAttack(
      items_,
      oc,
      GROUP_COVARIATE_ONLY,
      true,
      `${bank.label}|${label}|f7`,
      false,
    );
    const f7b = conditionalAttack(
      items_,
      oc,
      GROUP_ORDINAL,
      true,
      `${bank.label}|${label}|f7b`,
      false,
    );
    const f2b = bestRankTier(items_, oc);
    return {
      label,
      n: items_.length,
      f2b,
      f7,
      f7b,
      determined: items_.filter((e) => e.determined).length,
      survivors: mean(items_.map((e) => e.survivors)),
      uniform: mean(items_.map((e) => e.uniform)),
      modal: mean(items_.map((e) => e.modal)),
      antiModal: mean(items_.map((e) => e.antiModal)),
      maxVoteShare: mean(items_.map((e) => e.maxVoteShare)),
      publishedMetric: Math.max(
        mean(items_.map((e) => e.uniform)),
        mean(items_.map((e) => e.modal)),
        mean(items_.map((e) => e.antiModal)),
      ),
      f3,
      f4,
      f5,
      // Per-item worst cases: an item some single fixed strategy takes every time.
      certainUniform: items_.filter((e) => e.uniform >= 1 - 1e-9).length,
      certainModal: items_.filter((e) => e.modal >= 1 - 1e-9).length,
      certainAntiModal: items_.filter((e) => e.antiModal >= 1 - 1e-9).length,
      uniqueModalKey: items_.filter((e) => e.uniqueModalKey).length,
      perItemOracle: mean(items_.map((e) => Math.max(e.uniform, e.modal, e.antiModal))),
    };
  };

  const fixed = sliceFixed(entries).map((s) => summarise(s.label, s.items));
  const quartiles = sliceQuartiles(entries).map((s) => summarise(s.label, s.items));
  const whole = summarise('whole bank', entries);

  // VER-MORPHO-01 publishes a direction-specific claim — "the picture-to-word half is leak-free by
  // proof" — so that half is scored on its own rather than only inside a difficulty slice.
  const directions = [...new Set(entries.map((e) => e.covariates.direction))].filter(Boolean);
  const byDirection = directions.map((d) =>
    summarise(d, entries.filter((e) => e.covariates.direction === d)),
  );

  const jointEntries = entries.filter((e) => e.joint !== null);
  const joint =
    jointEntries.length === 0
      ? null
      : {
          n: jointEntries.length,
          determined: jointEntries.filter((e) => e.joint.determined).length,
          survivors: mean(jointEntries.map((e) => e.joint.survivors)),
          uniform: mean(jointEntries.map((e) => e.joint.uniform)),
          modal: mean(jointEntries.map((e) => e.joint.modal)),
          certainModal: jointEntries.filter((e) => e.joint.modal >= 1 - 1e-9).length,
          certainUniform: jointEntries.filter((e) => e.joint.uniform >= 1 - 1e-9).length,
        };

  const cross = crossItemAttack(
    adapter,
    entries.map((e) => e.served),
    entries.map((e) => e.keyIndex),
    bank.label,
  );

  return { bank, adapter, entries, fixed, quartiles, byDirection, whole, joint, cross };
}

function printBank(result) {
  const { bank, adapter, fixed, quartiles, byDirection, whole, joint, cross } = result;
  console.log(`\n${'='.repeat(100)}\n${bank.label} — ${whole.n} items, ${adapter.optionCount}-option, floor ${pct(adapter.floor)}`);
  console.log(`published: bank ${pct(bank.published.bank)}, worst slice ${pct(bank.published.worst)}  (${bank.published.note})`);

  const header =
    '| slice | n | F0 det | survivors | F1 uniform | F2 modal | F2 anti | published | F2b rank (t) | F3 sorted | F3 cv | F4 positional | F4 cv | F5 covariate | F5 cv | F7 no-brute | F7 cv | F7b ordinal cv | F3 null / cv-null | F4 null / cv-null | F7 cv-null |';
  const rule = `|${' --- |'.repeat(21)}`;
  const line = (r) =>
    `| ${r.label} | ${r.n} | ${r.determined} | ${r.survivors.toFixed(2)} / ${adapter.optionCount} | ` +
    `${pct(r.uniform)} | ${pct(r.modal)} | ${pct(r.antiModal)} | ${pct(r.publishedMetric)} | ` +
    `${pct(r.f2b.accuracy)} (t=${r.f2b.tier}) | ` +
    `${pct(r.f3.accuracy)} | ${pct(r.f3.cv)} | ${pct(r.f4.accuracy)} | ${pct(r.f4.cv)} | ` +
    `${pct(r.f5.accuracy)} | ${pct(r.f5.cv)} | ${pct(r.f7.accuracy)} | ${pct(r.f7.cv)} | ` +
    `${pct(r.f7b.cv)} | ` +
    `${pct(r.f3.null)} / ${pct(r.f3.cvNull)} | ${pct(r.f4.null)} / ${pct(r.f4.cvNull)} | ` +
    `${pct(r.f7.cvNull)} |`;

  console.log('\nFIXED difficulty edges (1–5 / 5–10 / 10–15 / 15–20):');
  console.log(header);
  console.log(rule);
  for (const r of fixed) console.log(line(r));
  console.log(line(whole));

  console.log('\nEQUAL-COUNT quartiles:');
  console.log(header);
  console.log(rule);
  for (const r of quartiles) console.log(line(r));
  console.log(line(whole));

  if (byDirection.length > 1) {
    console.log('\nBY PRESENTATION DIRECTION:');
    console.log(header);
    console.log(rule);
    for (const r of byDirection) console.log(line(r));
  }

  console.log('\nper-item worst cases (whole bank):');
  console.log(
    `  items an attacker takes with CERTAINTY:  uniform ${whole.certainUniform}  modal ${whole.certainModal}  ` +
      `anti-modal ${whole.certainAntiModal}  |  key uniquely modal ${whole.uniqueModalKey}`,
  );
  console.log(
    `  F2b best-rank certain: ${result.entries.filter((e) => e.tier === whole.f2b.tier && e.tierSize === 1).length}` +
      ` (playing rank t=${whole.f2b.tier})`,
  );
  console.log(
    `  F3 sorted-vote certain: ${whole.f3.wins} (cv ${whole.f3.cvWins})   ` +
      `F4 positional certain: ${whole.f4.wins} (cv ${whole.f4.cvWins})   ` +
      `F5 covariate certain: ${whole.f5.wins} (cv ${whole.f5.cvWins})   ` +
      `F7 no-brute certain: ${whole.f7.wins} (cv ${whole.f7.cvWins})`,
  );
  console.log(
    `  key rank distribution (0 = modal): ${[...Array(adapter.optionCount).keys()]
      .map((t) => `${t}:${result.entries.filter((e) => e.tier === t).length}`)
      .join('  ')}`,
  );
  console.log(
    `  per-item oracle (max of the three fixed strategies, item by item): ${pct(whole.perItemOracle)}`,
  );
  console.log(
    `  VER-MORPHO-01's published statistic recomputed here (mean max(v)/sum(v)): ${pct(whole.maxVoteShare)}`,
  );
  console.log(
    `  partition sizes: F3 ${whole.f3.groups} shapes, F4 ${whole.f4.groups} vote vectors, F5 ${whole.f5.groups} vector x covariate`,
  );
  console.log(
    `  partition purity (share of items in a repeated group whose group agrees on one key slot): ` +
      `F3 ${pct(whole.f3.purity.share)} of ${whole.f3.purity.inRepeated}   ` +
      `F4 ${pct(whole.f4.purity.share)} of ${whole.f4.purity.inRepeated}`,
  );

  if (joint) {
    console.log(
      `\nF5c joint-consistency re-read of the picture->word half (${joint.n} items):\n` +
        `  determined ${joint.determined} / ${joint.n}   mean survivors ${joint.survivors.toFixed(2)} / ${adapter.optionCount}\n` +
        `  uniform ${pct(joint.uniform)}   modal ${pct(joint.modal)}   ` +
        `certain: uniform ${joint.certainUniform}, modal ${joint.certainModal}`,
    );
  }

  console.log(
    `\nF6 cross-item system intersection (the served bank is the CONSISTENT arm):\n` +
      `  hypothesis space ${cross.initial} systems -> ${cross.surviving} after the whole bank\n` +
      `  pinned to a single system after ${cross.collapsedAt ?? 'never'} items\n` +
      `  accuracy once pinned, over the whole bank: ${pct(cross.accuracy)} (${cross.wins} / ${whole.n} certain)\n` +
      `  curve: ${cross.curve
        .slice(0, 12)
        .map((p) => `${p.items}:${p.systems}`)
        .join('  ')}`,
  );
}

function main() {
  const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
  const wantJson = process.argv.includes('--json');

  if (!wantJson) {
    console.log(
      'Stage 2 anti-leak comparison — one attacker, four types, one slicing.\n' +
        `seed: ${SEED}\n` +
        'Every attack is handed a served projection (bank item minus answer/scoring/provenance/demoPath)\n' +
        'and the answer key is passed only to the scorer. cv columns are seeded 5-fold cross-validated.',
    );
  }

  const results = BANKS.map((bank) => measureBank(bank, repoRoot));
  if (wantJson) {
    console.log(
      JSON.stringify(
        results.map((r) => ({
          label: r.bank.label,
          published: r.bank.published,
          optionCount: r.adapter.optionCount,
          floor: r.adapter.floor,
          fixed: r.fixed,
          quartiles: r.quartiles,
          byDirection: r.byDirection,
          whole: r.whole,
          joint: r.joint,
          cross: { ...r.cross, curve: r.cross.curve },
        })),
        null,
        2,
      ),
    );
    return;
  }
  for (const r of results) printBank(r);
}

// Run the four-bank comparison when invoked directly. `crossItemAttack` and `scoreItem` are also
// imported by `stage2-rotation-attack.mjs`, which runs F6 against the rotating design; importing
// this file must not re-measure the banks. Nothing above this line changed with the export.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
