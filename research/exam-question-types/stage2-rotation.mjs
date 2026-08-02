// ROTATING HIDDEN SYSTEMS — does several short crack-times beat one long curve?
//
// THE PROPOSAL. Stage 2 currently runs ONE hidden system for 30 trials. Once a child cracks it every
// later trial is one they will get right, and a trial whose outcome is predictable carries almost no
// information about the child. The alternative is several INDEPENDENT hidden systems, rotating the
// moment mastery is demonstrated: each system yields one observation — trials-to-crack — and the
// claim is that k such observations aggregate better than one long curve.
//
// WHAT IS BORROWED AND WHAT IS NEW. Nothing here re-implements a measurement that already exists:
//
//   the cumulative oracle    `stage2-learnability-core.mjs` (PR #48). Given every reveal so far,
//                            what is now uniquely determined and was this trial's answer available?
//                            It supplies BOTH the onset clock and the rotation trigger.
//   the criterion            `createBadgeTest` / `DEFAULT_CRITERION` from `stage2-latency.mjs`
//                            (PR #42), imported unchanged. A sequential log-odds accumulator whose
//                            false-alarm rate under guessing is bounded by 1/threshold.
//   the figure algebra       `applyChain` / `figureKey` from the FLU-OPCHAIN-01 generator, so "what
//                            the machine does" keeps one definition and the simulated stimulus is
//                            the shipped stimulus rather than a cartoon of it.
//   the statistics           `varianceComponents`, `kaplanMeier`, `fitRandomInterceptAft`,
//                            `correlation` — all from `stage2-latency.mjs`, so the reliability of a
//                            rotating block is computed by the identical estimator that produced
//                            the single-block baseline it is being compared against.
//
// What is new is only the SEQUENCE: an item pool whose hidden mapping can be swapped mid-block, and
// a runner that swaps it on mastery. No bank rotates, so no bank could have supplied this.
//
// WHY THE ITEMS ARE SYNTHESISED RATHER THAN READ FROM THE BANK. `banks/FLU-OPCHAIN-01.jsonl` holds
// ONE system across all of its items; the control bank redraws every trial. Neither is "rotate on
// mastery", and producing a bank that did would be a generator change this workstream is explicitly
// not allowed to make. So the pool here is built in memory from the generator's own algebra, and the
// hidden mapping is a parameter rather than a property of a file. The consequence is stated plainly
// in the report: the item MIX is this file's choice, not the shipped selection rule's.
//
// THE SYSTEM SIZE IS THE SIZING LEVER. `size` is how many primitives the hidden bijection covers —
// 3, 4, 5 or 6 badges onto that many operators. It is the parameter the owner would actually turn to
// put a median crack-time in a target band, and it is why the pool is parameterised at all.
//
// CLAIM BOUNDARY, inherited and load-bearing. Every child here is a program with a PLANTED latent
// trait. Correlations among its crack-times are a property of the generative model and are not
// evidence that any such trait exists in children. Nothing in this file is a learning rate, and
// nothing in it has seen a child. It is measurement-only: no live block imports it.

import {
  BADGE_SYMBOLS,
  GLYPHS,
  OPERATORS,
  applyChain,
  figureKey,
} from './generators/FLU-OPCHAIN-01.mjs';
import { DEFAULT_CRITERION, createBadgeTest } from './stage2-latency.mjs';
import { createOracle } from './stage2-learnability-core.mjs';

export { DEFAULT_CRITERION };

/* ================================================================== *
 * 0. Determinism
 * ================================================================== */

/**
 * A small counter-based PRNG.
 *
 * Counter-based rather than a stateful stream because the simulation draws in several interleaved
 * places — item selection, the learner's encoding coin, its tie-breaks — and a shared stream would
 * make each of those depend on how many draws the others happened to take. Every draw here is a
 * pure function of (seed, label), so adding a diagnostic that consumes randomness cannot silently
 * move a number somewhere else in the report.
 */
export function hashUnit(seed, label) {
  let h = 2166136261 ^ seed;
  const text = String(label);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A labelled stream: `draw()` advances a counter, so a caller needs no bookkeeping of its own. */
export function createRng(seed, salt = '') {
  let n = 0;
  return {
    draw() {
      n += 1;
      return hashUnit(seed, `${salt}|${n}`);
    },
    /** Uniform integer in [0, bound). */
    int(bound) {
      return Math.min(bound - 1, Math.floor(this.draw() * bound));
    },
    pick(list) {
      return list[this.int(list.length)];
    },
    /** Fisher–Yates, on a copy. */
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = this.int(i + 1);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

/** Box–Muller, from two labelled draws. Used only to give children a continuous latent trait. */
export function standardNormal(seed, label) {
  const u = Math.max(1e-12, hashUnit(seed, `${label}|u`));
  const v = hashUnit(seed, `${label}|v`);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ================================================================== *
 * 1. Systems
 * ================================================================== */

/**
 * The order operators enter a system as it grows: geometric and attribute alternating.
 *
 * NOT the generator's own order, and not a random subset, and the reason is the sizing sweep. The
 * six operators are not interchangeable: the three geometric ones generate a group of order eight
 * and do NOT commute, while the three attribute ones are independent boolean toggles that commute
 * with everything. A chain built only from commuting operators is order-invariant, so every
 * assignment to it produces the SAME figure and the item distinguishes nothing — a random subset of
 * three lands on the all-commuting case often enough that size 3 would silently lose its deep items
 * and stop being comparable with size 5.
 *
 * Alternating fixes that: every size from 3 up carries at least two geometric operators, each size's
 * value set is a prefix of the next, and the only thing that changes across the sweep is HOW MANY
 * primitives the system has. That is the parameter the sweep is about.
 */
export const DEFAULT_VALUE_ORDER = ['turn', 'swap', 'flip', 'ring', 'slant', 'twin'];

/** The value set a system of this size is built from. */
export function valuesFor(size) {
  if (size < 2 || size > OPERATORS.length) {
    throw new Error(`system size must be 2..${OPERATORS.length}, got ${size}`);
  }
  return DEFAULT_VALUE_ORDER.slice(0, size);
}

/**
 * A hidden system: a bijection from the first `size` badges onto that size's value set.
 *
 * INDEPENDENCE BETWEEN SYSTEMS IS A FRESH PERMUTATION, NOT A FRESH VOCABULARY. Two systems in one
 * rotating block use the same badges and the same operators and differ only in which badge means
 * which — so the child re-learns the mapping and never re-learns the task. Redrawing the operator
 * set instead would change what the second system IS, and a crack-time difference between systems
 * would then be partly about the algebra rather than about the child. It also has to hold for the
 * pool to work at all: one oracle enumerates one value set's permutations.
 */
export function makeSystem(size, seed, index = 0) {
  const primitives = BADGE_SYMBOLS.slice(0, size);
  const values = valuesFor(size);
  const rng = createRng(seed, `system|${size}|${index}`);
  const assigned = rng.shuffle(values);
  const mapping = Object.fromEntries(primitives.map((p, i) => [p, assigned[i]]));
  return { id: `sys-${size}-${seed}-${index}`, size, primitives, values, mapping };
}

/* ================================================================== *
 * 2. The item pool
 * ================================================================== */

/**
 * Every ordered assignment of DISTINCT values to a chain. Mirrors the generator's rule that no
 * operator repeats inside a chain (five of the six are involutions, so a repeat would cancel and the
 * item would not be the item it looks like).
 */
function chainAssignments(chain, values) {
  const out = [];
  const walk = (depth, picked) => {
    if (depth === chain.length) {
      out.push(picked.slice());
      return;
    }
    for (const value of values) {
      if (picked.includes(value)) continue;
      picked.push(value);
      walk(depth + 1, picked);
      picked.pop();
    }
  };
  walk(0, []);
  return out;
}

const INPUT_SHADES = ['solid', 'hollow'];

/** A stimulus figure, drawn over the generator's own component space. */
function drawInput(rng) {
  return {
    glyph: rng.pick(GLYPHS),
    orient: { a: rng.int(4), b: rng.int(2) },
    shade: rng.pick(INPUT_SHADES),
    border: rng.int(2),
    pair: rng.int(2),
  };
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];

/**
 * One item TEMPLATE: a badge chain, an input, and five options — and NO answer.
 *
 * THE TEMPLATE IS MAPPING-FREE, AND THAT IS THE WHOLE TRICK. The options are drawn from the figures
 * reachable by SOME distinct-value assignment to the chain, never from the true one, so a template's
 * `content` is the same object whatever system is hidden behind it. Three things follow, and the
 * simulation would be unaffordable or dishonest without them:
 *
 *   1. ROTATION IS EXPRESSIBLE AT ALL. Swapping the mapping mid-block changes which option is
 *      correct and nothing the child can see. That is what a rotating block IS, and it is a property
 *      a bank whose items were generated from a fixed system cannot have.
 *   2. THE ORACLE'S PREDICTION CACHE SURVIVES ROTATION. `createOracle` caches the prediction row for
 *      every candidate mapping against `itemId`. Because the row depends only on content, one pool
 *      is enumerated once and reused across every system, child and replicate in the run.
 *   3. THE ANTI-LEAK PROPERTY IS STRUCTURAL. A template whose key were recoverable from content
 *      alone would leak in every system built on it; because the options are outputs of competing
 *      assignments, several mappings survive, and `admitTemplate` below asserts it rather than
 *      trusting the construction.
 *
 * Returns null when the chain cannot fill five distinct options, which at depth 1 over a small
 * value set is common and is a property of the algebra rather than a failure.
 */
function makeTemplate(chain, values, rng, index) {
  const input = drawInput(rng);
  const reachable = new Map();
  for (const assignment of chainAssignments(chain, values)) {
    const figure = applyChain(assignment, input);
    const key = figureKey(figure);
    if (!reachable.has(key)) reachable.set(key, figure);
  }
  // At least two options a mapping can point at, or the key is fixed by content and the item is a
  // leak rather than an induction trial. The stricter oracle check in `buildPool` still runs.
  if (reachable.size < 2) return null;

  const chosen = new Map(
    rng
      .shuffle([...reachable.entries()])
      .slice(0, OPTION_KEYS.length)
      .map(([key, figure]) => [key, figure]),
  );
  // TOP UP WITH FIGURES NO ASSIGNMENT PRODUCES. A short chain cannot reach five distinct figures —
  // at depth 1 it reaches at most `size` of them — so a slate built only from reachable outputs
  // would shrink with the system size and change the guessing floor along with it. Padding from the
  // full operator set keeps every slate at five options, which is what holds `q` fixed across the
  // sizing sweep. An unreachable distractor is predicted by no mapping, so it narrows nothing and
  // cannot make the item more answerable than the algebra allows.
  for (let guard = 0; chosen.size < OPTION_KEYS.length && guard < 200; guard += 1) {
    const padDepth = 1 + rng.int(2);
    const padChain = rng.shuffle(OPERATORS).slice(0, padDepth);
    const figure = applyChain(padChain, input);
    const key = figureKey(figure);
    if (!chosen.has(key)) chosen.set(key, figure);
  }
  if (chosen.size < OPTION_KEYS.length) return null;

  const figures = rng.shuffle([...chosen.values()]);
  return {
    itemId: `rot-${values.length}-${index}`,
    difficulty: chain.length,
    content: {
      chain: chain.slice(),
      input,
      options: figures.map((figure, i) => ({ key: OPTION_KEYS[i], figure })),
    },
  };
}

/**
 * The adapter that hands this pool to the shared cumulative oracle.
 *
 * Deliberately the same six-function contract the four shipped Stage 2 types implement, and the
 * `predictedKeys` body is the reference type's verbatim: an assignment whose output is not on the
 * slate predicts nothing, which is evidence against that assignment rather than evidence about an
 * option. `correctKeyOf` is the one departure — it reads a per-SYSTEM answer table rather than a
 * fixed `reviewerOnly.correctKey`, because under rotation the same item has different answers under
 * different systems, which is the entire point.
 */
export function rotationAdapter(size, values) {
  return {
    id: `rotation-${size}`,
    typeCode: `ROTATION-${size}`,
    vocabulary: `${size} badges -> ${size} lattice operators`,
    primitives: BADGE_SYMBOLS.slice(0, size),
    values: values.slice(),
    primitivesUsedBy: (item) => item.content.chain,
    predictedKeys(item, assignment) {
      const produced = figureKey(
        applyChain(
          item.content.chain.map((badge) => assignment[badge]),
          item.content.input,
        ),
      );
      const hit = item.content.options.find((o) => figureKey(o.figure) === produced);
      return hit ? [hit.key] : [];
    },
    correctKeyOf: (item) => item.answerByMapping.get(item.currentMappingKey) ?? null,
    describe: (item) => `d${item.content.chain.length}`,
  };
}

/** Canonical string for a mapping, so an answer table can be keyed by it. */
export const mappingKey = (mapping) =>
  Object.keys(mapping)
    .sort()
    .map((p) => `${p}=${mapping[p]}`)
    .join(',');

export const DEFAULT_DEPTHS = [1, 2, 3];

/**
 * How often each chain depth is served.
 *
 * Roughly the shipped bank's shape — mass on the composed depths, a minority of single-badge items —
 * rather than uniform. It matters because depth decides how much one reveal is worth: a depth-1
 * reveal pins its badge outright, so a depth-1-heavy sequence would make every system trivially
 * crackable and would flatter the proposal. This mix is THIS FILE'S CHOICE and not the live
 * selection rule, which targets difficulty against a running ability estimate; the report says so.
 */
export const DEFAULT_DEPTH_MIX = { 1: 0.15, 2: 0.5, 3: 0.35 };

/**
 * Build a pool for one system size, and the oracle that reads it.
 *
 * Built ONCE per size and shared by every block in a run. Two properties are enforced here rather
 * than assumed downstream, because both fail silently:
 *
 *   NO CONTENT LEAK. A template whose key is fixed by `content` with zero reveals is dropped. This
 *   is the E-075/E-076 attack, run through the same code path the trace uses, so the pool cannot be
 *   more answerable than the oracle believes it is.
 *   THE ANSWER IS ON THE SLATE. Five options cannot hold every figure the chain can reach, so for
 *   any given system most deep templates have no correct option. Those are not served under that
 *   system; `answerByMapping` records which systems each template is servable under.
 *
 * THE SECOND PROPERTY IS WHY THE POOL IS BUILT PER DEPTH AND WHY IT IS LARGE. At depth 3 over six
 * values a chain reaches around a hundred distinct figures and the slate holds five, so only a few
 * per cent of systems can be served a given deep template. Sizing the buckets by their coverage —
 * rather than generating one undifferentiated pool — is what stops a block from silently degrading
 * into the depth-1 items that happen to be servable under everything. `coverage` reports the
 * realised numbers so a thin bucket is visible instead of showing up as an unexplained `exhausted`.
 */
export function buildPool({
  size,
  seed = 20260801,
  perDepth = 900,
  depths = DEFAULT_DEPTHS,
  revealMode = 'outcome',
} = {}) {
  const values = valuesFor(size);
  const primitives = BADGE_SYMBOLS.slice(0, size);
  const oracle = createOracle(rotationAdapter(size, values), { revealMode });
  const usableDepths = depths.filter((d) => d <= size);
  const byDepth = new Map(usableDepths.map((d) => [d, []]));
  const items = [];

  for (const depth of usableDepths) {
    const rng = createRng(seed, `pool|${size}|d${depth}`);
    for (let attempt = 0; byDepth.get(depth).length < perDepth && attempt < perDepth * 8; ) {
      attempt += 1;
      const chain = rng.shuffle(primitives).slice(0, depth);
      const template = makeTemplate(chain, values, rng, `${depth}-${items.length}`);
      if (template === null) continue;
      if (oracle.contentDerivability(template).leaks) continue;

      // Which of the size! systems this template can be served under, and the answer in each.
      const rows = oracle.predictions(template);
      const answerByMapping = new Map();
      oracle.mappings.forEach((mapping, index) => {
        if (rows[index].length === 1) answerByMapping.set(mappingKey(mapping), rows[index][0]);
      });
      if (answerByMapping.size === 0) continue;
      const built = { ...template, answerByMapping };
      byDepth.get(depth).push(built);
      items.push(built);
    }
  }

  if (items.length === 0) throw new Error(`no admissible templates at size ${size}`);
  const total = oracle.mappings.length;
  return {
    size,
    values,
    primitives,
    oracle,
    items,
    byDepth,
    depths: usableDepths,
    /** Mean templates servable under one system, per depth: the supply a long block draws on. */
    coverage: Object.fromEntries(
      usableDepths.map((d) => {
        const bucket = byDepth.get(d);
        const share =
          bucket.reduce((sum, item) => sum + item.answerByMapping.size / total, 0) /
          Math.max(1, bucket.length);
        return [d, { templates: bucket.length, servablePerSystem: share * bucket.length }];
      }),
    ),
  };
}

/* ================================================================== *
 * 2b. Re-keying admissibility
 * ================================================================== */

const meanOf = (xs) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

/** Where an option key sits on the slate, which is what a key-slot imbalance is measured over. */
const slotOf = (item, key) => item.content.options.findIndex((o) => o.key === key);

/**
 * Can this pool be re-keyed under a mapping drawn at session time?
 *
 * DELIBERATELY THE SIBLING BRANCH'S STATISTIC, not a new one, so the two results can be read
 * against each other. `feat/stage2-session-keying` asks, for each item and each bijection in the
 * free family, whether that mapping's output lands on one of the item's options — `keyUnder >= 0` —
 * and reports the share of the family that does (`admissibleShare`) plus how many DISTINCT options
 * are ever the key (`reachable`, with four-of-five its shippability bar). `answerByMapping` already
 * holds exactly that: `buildPool` records the single predicted key under every mapping the oracle
 * enumerates, and the oracle's family is every bijection over the size's value set.
 *
 * TWO FAILURE MODES, AT OPPOSITE ENDS, AND ONLY REPORTING ONE WOULD MISLEAD:
 *
 *   TOO MUCH DEPTH FOR THE SIZE. The chain reaches far more figures than a slate holds, so most
 *   mappings put the answer off screen. `meanAdmissibleShare` collapses. This is the sibling's
 *   finding and the reason a per-session draw served only part of its bank.
 *   TOO LITTLE DEPTH FOR THE SIZE. There are so few distinct assignments that they collide onto two
 *   or three figures. Every mapping is admissible, but the key only ever lands on those few options,
 *   so the effective guessing floor is 1/`reachable` rather than 1/5 and a client who knows the
 *   vocabulary can discard the rest. `meanReachable`, `safeFraction` and `meanMaxShare` catch it;
 *   `meanAdmissibleShare` alone reads it as a perfect score.
 *
 * `meanReachable` is not comparable with the shipped bank's in the way `meanAdmissibleShare` is:
 * this pool draws its slate from reachable figures by construction (§2), so it can only lose options
 * to assignment collisions, whereas the shipped generator's distractors are named partial rules and
 * some are unreachable outright. The share statistic is the one to compare.
 */
export function admissibility(pool, { safeAt = OPTION_KEYS.length - 1 } = {}) {
  const mappings = pool.oracle.mappings.length;
  const byDepth = {};
  for (const depth of pool.depths) {
    const bucket = pool.byDepth.get(depth) ?? [];
    if (bucket.length === 0) continue;
    const shares = [];
    const reachable = [];
    const maxShares = [];
    for (const item of bucket) {
      const admissible = item.answerByMapping.size;
      shares.push(admissible / mappings);
      const perSlot = new Array(item.content.options.length).fill(0);
      for (const key of item.answerByMapping.values()) perSlot[slotOf(item, key)] += 1;
      reachable.push(perSlot.filter((n) => n > 0).length);
      maxShares.push(admissible === 0 ? 1 : Math.max(...perSlot) / admissible);
    }
    byDepth[depth] = {
      templates: bucket.length,
      meanAdmissibleShare: meanOf(shares),
      meanReachable: meanOf(reachable),
      safeFraction: reachable.filter((r) => r >= safeAt).length / reachable.length,
      deadFraction: reachable.filter((r) => r <= 1).length / reachable.length,
      meanMaxShare: meanOf(maxShares),
    };
  }
  return { size: pool.size, mappings, byDepth };
}

/**
 * What ONE session's draw can actually serve, which is the quantity the sibling's shippability
 * verdict turned on.
 *
 * Its bank had to fill forty half-point rungs with five items each and a draw left 87.8% of them
 * short. A rotating block asks a different question of the same pool — enough unseen servable items
 * at the depths it serves to reach mastery, a few tens rather than a full ladder — so the supply is
 * reported as a COUNT against what a block consumes, not as ladder coverage.
 *
 * `worstSlot` is the share of this draw's servable items whose key sits on the most-used option
 * position. The shipped bank balances key position with a round-robin cursor that a session-time
 * draw does not have, so it is checked rather than assumed.
 */
export function sessionSupply(pool, mapping) {
  const key = mappingKey(mapping);
  const slots = new Array(OPTION_KEYS.length).fill(0);
  const perDepth = {};
  let servable = 0;
  for (const depth of pool.depths) {
    const bucket = (pool.byDepth.get(depth) ?? []).filter((item) => item.answerByMapping.has(key));
    perDepth[depth] = bucket.length;
    servable += bucket.length;
    for (const item of bucket) slots[slotOf(item, item.answerByMapping.get(key))] += 1;
  }
  return {
    servable,
    servableShare: servable / Math.max(1, pool.items.length),
    perDepth,
    worstSlot: servable === 0 ? 1 : Math.max(...slots) / servable,
  };
}

/* ================================================================== *
 * 3. The learner
 * ================================================================== */

/**
 * The model child: an induction memory over the value set, with graded ENCODING FIDELITY.
 *
 * Structurally identical to `stage2-inspectors/opchain.js` — the same candidate-set narrowing, the
 * same no-repeat rule, the same reset when a reveal contradicts everything the memory allows — with
 * the operator universe made a parameter so a system of size 3 is not reasoned about as though three
 * of its badges could mean operators that are not in play. `stage2-rotation.test.mjs` asserts the
 * two agree response-for-response at size 6, so this is the shipped reasoner and not a lookalike.
 *
 * WHAT IS GRADED IS ENCODING, NOT ACCURACY, and that choice is inherited from PR #42 for the same
 * reason: `fidelity` is P(a reveal is folded into memory at all), so a slower child reaches each
 * primitive LATER without being worse at reasoning from what it already holds. That is what a
 * learning block claims to measure. A lapse rate would instead make it worse at everything, which is
 * a different construct, so `lapse` is kept separate and small.
 *
 * `misbind` is the one addition, and it exists because rotation creates a failure mode a
 * single-system block cannot have: a child arriving at system 2 may carry system 1's mapping. At
 * `misbind > 0` the memory starts each system after the first already narrowed toward the PREVIOUS
 * system's answers, so proactive interference is modelled rather than assumed away.
 */
export function createLearner({ values, fidelity = 1, lapse = 0, seed, salt = '' }) {
  const universe = values.slice();
  let candidates = new Map();
  let resets = 0;
  let encodes = 0;
  let responses = 0;
  let ignored = 0;

  const candidatesFor = (badge) => {
    if (!candidates.has(badge)) candidates.set(badge, new Set(universe));
    return candidates.get(badge);
  };

  const assignments = (chain, useAll) => {
    const pools = chain.map((badge) => (useAll ? universe.slice() : [...candidatesFor(badge)]));
    const out = [];
    const walk = (depth, picked) => {
      if (out.length > 4096) return;
      if (depth === chain.length) {
        out.push(picked.slice());
        return;
      }
      for (const value of pools[depth]) {
        if (picked.includes(value)) continue;
        picked.push(value);
        walk(depth + 1, picked);
        picked.pop();
      }
    };
    walk(0, []);
    return out;
  };

  return {
    fidelity,
    lapse,
    /** Wipe the memory: a new system shares no mapping with the last one. */
    reset({ misbind = 0, previousMapping = null } = {}) {
      candidates = new Map();
      if (misbind > 0 && previousMapping !== null) {
        for (const [badge, value] of Object.entries(previousMapping)) {
          if (!universe.includes(value)) continue;
          // Carried belief, not certainty: the child leans on the old meaning without having ruled
          // the alternatives out, so one contradicting reveal is enough to undo it.
          if (hashUnit(seed, `${salt}|misbind|${badge}`) < misbind) {
            candidates.set(badge, new Set([value]));
          }
        }
      }
    },
    /** Which option the memory points at. Ties broken by a labelled draw, never by `Math.random`. */
    pick(item) {
      const unit = hashUnit(seed, `${salt}|pick|${responses}`);
      responses += 1;
      const { chain, input, options } = item.content;
      if (hashUnit(seed, `${salt}|lapse|${responses}`) < lapse) {
        return options[Math.min(options.length - 1, Math.floor(unit * options.length))].key;
      }
      const byKey = new Map(options.map((o) => [figureKey(o.figure), o.key]));
      const votes = new Map();
      for (const assignment of assignments(chain, false)) {
        const key = byKey.get(figureKey(applyChain(assignment, input)));
        if (key === undefined) continue;
        votes.set(key, (votes.get(key) ?? 0) + 1);
      }
      if (votes.size === 0) {
        return options[Math.min(options.length - 1, Math.floor(unit * options.length))].key;
      }
      const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      const top = ranked[0][1];
      const tied = ranked.filter(([, n]) => n === top);
      return tied[Math.min(tied.length - 1, Math.floor(unit * tied.length))][0];
    },
    /**
     * Fold in a reveal, or fail to.
     *
     * An unencoded reveal leaves the memory UNTOUCHED — it is an absent belief, not a wrong one. A
     * child who mislearned would be a different construct and would confound acquisition speed with
     * error rate, which is exactly the confound the fidelity parameter exists to avoid.
     */
    observe(item, revealedKey) {
      encodes += 1;
      if (hashUnit(seed, `${salt}|encode|${encodes}`) >= fidelity) {
        ignored += 1;
        return { encoded: false, reset: false };
      }
      const { chain, input, options } = item.content;
      const revealed = options.find((o) => o.key === revealedKey);
      if (!revealed) return { encoded: true, reset: false };
      const target = figureKey(revealed.figure);

      let consistent = assignments(chain, false).filter(
        (a) => figureKey(applyChain(a, input)) === target,
      );
      let reset = false;
      if (consistent.length === 0) {
        reset = true;
        resets += 1;
        for (const badge of chain) candidates.set(badge, new Set(universe));
        consistent = assignments(chain, true).filter(
          (a) => figureKey(applyChain(a, input)) === target,
        );
      }
      if (consistent.length === 0) return { encoded: true, reset };

      chain.forEach((badge, position) => {
        const survivors = new Set(consistent.map((a) => a[position]));
        const before = candidatesFor(badge);
        const next = new Set([...before].filter((v) => survivors.has(v)));
        candidates.set(badge, next.size > 0 ? next : survivors);
      });
      return { encoded: true, reset };
    },
    /** Badges the memory has narrowed to one value — the learner's OWN belief, not the oracle's. */
    pinned() {
      return [...candidates.entries()].filter(([, set]) => set.size === 1).map(([badge]) => badge);
    },
    state: () => ({ resets, ignored, encodes, responses }),
  };
}

/** The degenerate learner: never encodes, always guesses. The rotation rule must not fire on it. */
export function createGuesser({ seed, salt = '' }) {
  let responses = 0;
  return {
    fidelity: 0,
    lapse: 1,
    reset() {},
    pick(item) {
      responses += 1;
      const { options } = item.content;
      const unit = hashUnit(seed, `${salt}|guess|${responses}`);
      return options[Math.min(options.length - 1, Math.floor(unit * options.length))].key;
    },
    observe: () => ({ encoded: false, reset: false }),
    pinned: () => [],
    state: () => ({ resets: 0, ignored: responses, encodes: 0, responses }),
  };
}

/* ================================================================== *
 * 4. The rotation rule
 * ================================================================== */

/**
 * WHEN TO ROTATE: the cumulative oracle names the opportunities, PR #42's accumulator prices them.
 *
 * THE OPPORTUNITY. A trial counts as evidence about mastery only when the oracle says the answer was
 * DETERMINED by the reveals already seen. On such a trial there is exactly one option a child who
 * holds the system can be pointing at, so:
 *
 *   sound       a child who has the mapping produces that option by construction. The test cannot
 *               punish a child for a trial nothing had yet determined, which is the failure a raw
 *               run-of-correct criterion makes and is why `derivable` gates the stream.
 *   calibrated  `q` is the exact chance a uniform guesser lands on it — 1/|options|, which varies
 *               with the slate — so each observation is priced at what it is actually worth rather
 *               than counted.
 *
 * THE ACCUMULATOR IS NOT REWRITTEN. `createBadgeTest` is imported from `stage2-latency.mjs` and fed
 * `(passed, q)`; the threshold, the lapse allowance and Wald's 1/threshold false-alarm bound all
 * come with it. What changes is only the UNIT: PR #42 asks "has this child demonstrated one
 * primitive", and rotation asks "has this child demonstrated the whole system", so the stream is
 * determined-trial outcomes rather than per-primitive opportunities.
 *
 * WHAT THE BOUND IS WORTH HERE. At the default rule and a five-option slate a pass is worth
 * log(0.9/0.2) = 1.50 and a miss log(0.1/0.8) = -2.08 against a bound of log 100 = 4.61, so mastery
 * needs four clean determined trials and one miss costs about a trial and a half of credit. The
 * analytic guarantee is P(a guesser ever crosses) <= 1%; `stage2-rotation.test.mjs` measures the
 * realised rate rather than trusting it.
 *
 * THE FLOOR THIS IMPLIES IS REAL AND IS NOT A BUG. Four determined trials must elapse after the
 * first determination however fast the child is, so crack-time cannot go below (first determination
 * + 4). Any measure with a sequential criterion has such a floor; the report quantifies it instead
 * of hiding it, because a floor inside the ability range is what would sink the design.
 */
export function createMasteryRule(criterion = DEFAULT_CRITERION) {
  const test = createBadgeTest(criterion);
  let opportunities = 0;
  let passes = 0;
  return {
    get logOdds() {
      return test.logOdds;
    },
    get crossed() {
      return test.crossed;
    },
    opportunitiesSeen: () => opportunities,
    passesSeen: () => passes,
    /**
     * Offer one answered trial. Returns true on the trial that crosses.
     *
     * `row` is the oracle's pre-answer row, so the judgement uses the state of knowledge BEFORE this
     * trial's reveal by construction rather than by remembering to.
     */
    offer(row, chosenKey) {
      if (!row.derivable) return false;
      const q = row.optionKeys.length === 0 ? 1 : 1 / row.optionKeys.length;
      if (!(q > 0 && q < 1)) return false;
      opportunities += 1;
      const passed = chosenKey === row.derivedKey;
      if (passed) passes += 1;
      return test.feed(passed, q);
    },
  };
}

/* ================================================================== *
 * 5. Running one system, and a whole block
 * ================================================================== */

/**
 * Administer one hidden system until mastery or the cap.
 *
 * `cap` is what makes censoring real rather than notional: a child who never crosses inside it is
 * NOT dropped, it is recorded as "longer than `cap`", which is the only handling that does not bias
 * the measure toward fast learners.
 *
 * The unscored warm-up is one demonstration by default. It is a reveal and belongs in the knowledge
 * state; it is not a trial, and counting it as one would shorten every crack-time by one while still
 * costing the session its 15 seconds. Both are reported: `trials` is what the measure is on,
 * `screens` is what the clock is on.
 */
export function runSystem({
  pool,
  system,
  learner,
  seed,
  cap = 40,
  warmup = 1,
  criterion = DEFAULT_CRITERION,
  seenItemIds = new Set(),
  depthMix = DEFAULT_DEPTH_MIX,
  /**
   * Whether the block ends at mastery.
   *
   * True is rotation. FALSE IS THE CURRENT DESIGN and is not a debug option: measuring how much of a
   * 30-trial block sits after mastery requires running the trials that sit after mastery, so the
   * baseline arm has to keep going past the crossing and record where it happened.
   */
  stopOnCrack = true,
}) {
  const { oracle } = pool;
  const key = mappingKey(system.mapping);
  const rng = createRng(seed, `serve|${system.id}`);
  // Served in a shuffled order WITHIN each depth, then drawn across depths by the mix, so the depth
  // sequence is the design's and the item sequence is the seed's.
  const queues = new Map(
    pool.depths.map((depth) => [
      depth,
      rng.shuffle(
        (pool.byDepth.get(depth) ?? []).filter(
          (item) => item.answerByMapping.has(key) && !seenItemIds.has(item.itemId),
        ),
      ),
    ]),
  );
  const weights = pool.depths.map((depth) => depthMix[depth] ?? 0);
  const weightTotal = weights.reduce((a, b) => a + b, 0);

  /** Draw the next item: the mix's depth if that bucket still has stock, else the deepest that has. */
  const take = (preferShallow = false) => {
    if (preferShallow) {
      for (const depth of pool.depths) {
        if ((queues.get(depth) ?? []).length > 0) return queues.get(depth).shift();
      }
      return null;
    }
    let draw = rng.draw() * weightTotal;
    let wanted = pool.depths[0];
    for (let i = 0; i < pool.depths.length; i += 1) {
      draw -= weights[i];
      if (draw <= 0) {
        wanted = pool.depths[i];
        break;
      }
    }
    if (queues.get(wanted).length > 0) return queues.get(wanted).shift();
    const fallback = [...pool.depths]
      .sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted))
      .find((depth) => queues.get(depth).length > 0);
    return fallback === undefined ? null : queues.get(fallback).shift();
  };

  const answerOf = (item) => item.answerByMapping.get(key);
  // The adapter reads the answer off the item, so the current system is bound here and the oracle
  // needs to know nothing about rotation.
  const bind = (item) => Object.assign(item, { currentMappingKey: key });

  const tracker = oracle.createTracker({ persistence: 'consistent' });
  const rule = createMasteryRule(criterion);

  const warmupItems = [];
  for (let i = 0; i < warmup; i += 1) {
    // Shallowest available: a depth-1 reveal pins its badge outright and teaches what the task is.
    const item = take(true);
    if (item === null) break;
    bind(item);
    tracker.observePrior(item);
    learner.observe(item, answerOf(item));
    warmupItems.push(item.itemId);
    seenItemIds.add(item.itemId);
  }

  const trials = [];
  /** Item references and choices, for the per-primitive baseline measure to re-read. */
  const served = [];
  let crackTrial = null;
  let exhausted = false;

  for (let n = 1; n <= cap; n += 1) {
    const item = take();
    if (item === null) {
      exhausted = true;
      break;
    }
    bind(item);
    seenItemIds.add(item.itemId);

    const row = tracker.before(item);
    const chosenKey = learner.pick(item);
    const answer = answerOf(item);
    tracker.record(item, { correct: chosenKey === answer, chosenKey });
    learner.observe(item, answer);

    const crossed = rule.offer(row, chosenKey);
    trials.push({
      trial: n,
      itemId: item.itemId,
      depth: item.content.chain.length,
      derivable: row.derivable,
      viable: row.viableFromKnowledge,
      knowable: row.knowable,
      chosenKey,
      correct: chosenKey === answer,
      logOdds: rule.logOdds,
      /** Whether this trial was served AFTER the child had already demonstrated mastery. */
      afterCrack: crackTrial !== null,
    });
    served.push({ trial: n, item, chosenKey });
    if (crossed && crackTrial === null) {
      crackTrial = n;
      if (stopOnCrack) break;
    }
  }

  const observed = trials.length;
  return {
    systemId: system.id,
    size: system.size,
    /** The hidden bijection, so the per-primitive baseline can price each opportunity. */
    mapping: system.mapping,
    served,
    /** Primitive -> trial at which the ORACLE first pinned it. 0 means "by the demonstration". */
    firstDetermined: tracker.firstDetermined,
    /** Trials-to-crack. Null when the cap or the pool ended first — see `censored`. */
    crackTrial,
    event: crackTrial !== null,
    /** Where a non-event is censored: "longer than this". Never dropped. */
    censoredAt: crackTrial === null ? observed : null,
    censored: crackTrial === null,
    /** The pool ran out before the cap. Reported so a censoring rate cannot hide a supply problem. */
    exhausted,
    trials: observed,
    screens: observed + warmupItems.length,
    warmupItems,
    /** First trial the oracle could have answered from prior reveals: the induction ramp. */
    firstDerivable: trials.find((t) => t.derivable)?.trial ?? null,
    determinedTrials: trials.filter((t) => t.derivable).length,
    accuracy: observed === 0 ? null : trials.filter((t) => t.correct).length / observed,
    /** Trials served after mastery was demonstrated. Zero by construction when `stopOnCrack`. */
    postCrackTrials: trials.filter((t) => t.afterCrack).length,
    postCrackAccuracy: (() => {
      const after = trials.filter((t) => t.afterCrack);
      return after.length === 0 ? null : after.filter((t) => t.correct).length / after.length;
    })(),
    opportunities: rule.opportunitiesSeen(),
    passes: rule.passesSeen(),
    logOdds: rule.logOdds,
    rows: trials,
    summary: tracker.summary(),
  };
}

/**
 * A whole block: `k` independent systems in sequence, each run to mastery or the cap.
 *
 * k = 1 with `cap = 30` and `warmup = 3` is the CURRENT design, so the comparison the report makes
 * is between two settings of one runner rather than between two programs that might differ
 * somewhere nobody looked.
 *
 * The item pool is shared and `seenItemIds` carries across systems, so no template is ever served
 * twice to the same child. That matters more under rotation than it would in a single block: a
 * repeated stimulus under a NEW mapping would be a memory probe rather than an induction trial.
 */
export function runBlock({
  pool,
  child,
  k = 1,
  cap = 40,
  warmup = 1,
  seed,
  criterion = DEFAULT_CRITERION,
  systemSeed = null,
  depthMix = DEFAULT_DEPTH_MIX,
  stopOnCrack = true,
  /**
   * A SCORED-TRIAL BUDGET FOR THE WHOLE BLOCK, which is what makes the k sweep a fair comparison.
   *
   * Left null, each of the k systems runs to its own `cap` and a k = 6 block costs six times what a
   * k = 1 block costs — so "more systems is more reliable" would only be saying "more trials is more
   * reliable", which nobody doubts. With a budget set, every k spends the same session and the
   * comparison is about how to SPEND thirty trials rather than about how many to buy. A system the
   * budget cuts short is censored, not dropped, and a system the budget never reaches simply does
   * not exist for that child.
   */
  budget = null,
}) {
  const learner =
    child.kind === 'guesser'
      ? createGuesser({ seed, salt: `${child.id}` })
      : createLearner({
          values: pool.values,
          fidelity: child.fidelity,
          lapse: child.lapse ?? 0,
          seed,
          salt: `${child.id}`,
        });

  const seenItemIds = new Set();
  const systems = [];
  let previousMapping = null;
  let remaining = budget ?? Number.POSITIVE_INFINITY;

  for (let i = 0; i < k && remaining >= 1; i += 1) {
    // Systems are drawn from a seed independent of the child, so two children compared on "system 2"
    // are compared on the SAME system. Any crack-time difference is then about them.
    const system = makeSystem(pool.size, systemSeed ?? seed, i);
    learner.reset({ misbind: child.misbind ?? 0, previousMapping });
    previousMapping = system.mapping;
    const run = runSystem({
      pool,
      system,
      learner,
      seed: seed + i * 101,
      cap: Math.min(cap, remaining),
      warmup,
      criterion,
      seenItemIds,
      depthMix,
      stopOnCrack,
    });
    remaining -= run.trials;
    systems.push(run);
  }

  return {
    childId: child.id,
    fidelity: child.fidelity ?? null,
    trait: child.trait ?? null,
    k,
    cap,
    budget,
    /** Systems actually administered. Below `k` when the budget ran out first. */
    systemsRun: systems.length,
    systems,
    /** Scored trials. The budget the owner prices against a 15-second question. */
    totalTrials: systems.reduce((sum, s) => sum + s.trials, 0),
    /** Scored trials plus unscored demonstrations: what the session clock actually sees. */
    totalScreens: systems.reduce((sum, s) => sum + s.screens, 0),
    events: systems.filter((s) => s.event).length,
    censored: systems.filter((s) => s.censored).length,
    /**
     * The k observations, in the shape the survival machinery wants: an event contributes its time,
     * a censored system contributes "longer than this". Fed to `kaplanMeier` and to the AFT.
     */
    observations: systems.map((s) => ({
      time: Math.max(1, s.event ? s.crackTrial : s.censoredAt),
      event: s.event,
    })),
  };
}

/* ================================================================== *
 * 6. The baseline measure: PR #42's per-primitive latency, over this pool
 * ================================================================== */

/**
 * What one item can show about ONE primitive, given the value that primitive truly holds.
 *
 * This is `badgeOpportunity` from `stage2-latency.mjs`, restated over a parameterised value set. The
 * restatement is not a second implementation of the criterion — the criterion is `createBadgeTest`
 * and that is imported — it is the same EVIDENCE definition with the hypothesis space narrowed from
 * the six shipped operators to the `size` a system of this size actually uses. Marginalising over
 * six when the child is reasoning over five would price every opportunity wrong, and it is priced
 * evidence that the whole criterion rests on.
 *
 * `passKeys` are the options a responder holding this primitive correctly could produce, whatever it
 * believes about the rest of the chain, so the test cannot punish knowing one primitive for not
 * knowing another. `q` is the exact chance a uniform guesser lands in that set on THIS item; an item
 * with q = 1 excludes nothing and is not an opportunity.
 */
const OPPORTUNITY_CACHE = new Map();
export function primitiveOpportunity(item, primitive, trueValue, values) {
  const cacheKey = `${item.itemId}|${values.length}`;
  let byPrimitive = OPPORTUNITY_CACHE.get(cacheKey);
  if (byPrimitive === undefined) {
    const { chain, input, options } = item.content;
    const byFigure = new Map(options.map((o) => [figureKey(o.figure), o.key]));
    byPrimitive = new Map(
      chain.map((badge) => [badge, new Map(values.map((v) => [v, new Set()]))]),
    );
    for (const assignment of chainAssignments(chain, values)) {
      const key = byFigure.get(figureKey(applyChain(assignment, input)));
      if (key === undefined) continue;
      chain.forEach((badge, position) => {
        byPrimitive.get(badge).get(assignment[position]).add(key);
      });
    }
    OPPORTUNITY_CACHE.set(cacheKey, byPrimitive);
  }

  const byValue = byPrimitive.get(primitive);
  // A primitive the chain never mentions constrains nothing about the figure the machine made.
  if (byValue === undefined) {
    return { informative: false, q: 1, passKeys: new Set(item.content.options.map((o) => o.key)) };
  }
  const passKeys = byValue.get(trueValue) ?? new Set();
  const optionCount = item.content.options.length;
  const q = optionCount === 0 ? 1 : passKeys.size / optionCount;
  return { informative: q > 0 && q < 1, q, passKeys };
}

/**
 * Per-primitive acquisition latencies for one administered system — THE CURRENT DESIGN'S MEASURE.
 *
 * WHY THIS EXISTS AT ALL. Comparing a rotating block against "one crack-time from a 30-trial block"
 * would be comparing it against a strawman: the single-system block as it stands does not produce
 * one number, it produces up to `size` per-primitive latencies which PR #42 aggregates through the
 * same AFT. Scoring the k = 1 baseline that way is the only fair version of the comparison, and
 * without it every conclusion in the report would be an artefact of having weakened the incumbent.
 *
 * The clock starts at the ORACLE'S onset d_i, exactly as in PR #42: before d_i the primitive is not
 * deducible from anything shown, so a compatible response is luck and feeding it to the accumulator
 * would let a lucky guesser reach criterion for something nobody could yet know.
 *
 * Four outcomes, and they are not interchangeable — `event`, `censored` (deducible, tested, block
 * ended first), `untested` (deducible but never given an informative item), and not deducible at all
 * (no onset, so no latency is defined and the primitive contributes nothing rather than a zero).
 */
export function perPrimitiveLatencies({ run, mapping, values, criterion = DEFAULT_CRITERION }) {
  const onset = run.firstDetermined;
  const horizon = run.trials;

  return Object.keys(mapping).map((primitive) => {
    const d = onset[primitive];
    const deducible = d !== undefined;
    const test = createBadgeTest(criterion);
    let used = 0;
    let passes = 0;
    let criterionTrial = null;

    for (const served of run.served) {
      if (!deducible || served.trial <= d) continue;
      const { informative, q, passKeys } = primitiveOpportunity(
        served.item,
        primitive,
        mapping[primitive],
        values,
      );
      if (!informative) continue;
      used += 1;
      const passed = passKeys.has(served.chosenKey);
      if (passed) passes += 1;
      if (test.feed(passed, q) && criterionTrial === null) criterionTrial = served.trial;
    }

    const event = criterionTrial !== null;
    return {
      primitive,
      deducible,
      onset: deducible ? d : null,
      opportunities: used,
      passes,
      event,
      untested: deducible && used === 0,
      /** L_i on the trial clock. Null when never deducible: undefined, not censored. */
      latency: event ? criterionTrial - d : null,
      censoredAt: deducible && !event ? horizon - d : null,
    };
  });
}

/** The per-primitive observations of a whole block, in the shape the AFT wants. */
export function perPrimitiveObservations(block, values) {
  const out = [];
  for (const run of block.systems) {
    for (const row of perPrimitiveLatencies({ run, mapping: run.mapping, values })) {
      if (!row.deducible) continue;
      const time = row.event ? row.latency : row.censoredAt;
      if (!Number.isFinite(time) || time < 1) continue;
      out.push({ time, event: row.event });
    }
  }
  return out;
}

/* ================================================================== *
 * 7. Populations
 * ================================================================== */

/**
 * A population of children with a CONTINUOUS planted latent trait.
 *
 * A ladder of six fidelities was right for PR #42, which asked whether a measure recovers a known
 * ordering. It is wrong here: reliability is a variance ratio, and a ladder makes the between-child
 * variance a property of the spacing this file chose. A continuous draw makes it a property of the
 * population instead.
 *
 * THE TRAIT IS PLANTED AND THAT IS THE CENTRAL CAVEAT OF THE WHOLE EXERCISE. One latent value per
 * child drives every system that child sees, so crack-times MUST correlate across systems. That
 * correlation is the generative model's, not a finding, and no number derived from it is evidence
 * that children have such a trait. The report states this next to the number rather than in a
 * footnote.
 *
 * Fidelity is a logistic transform of a standard normal, calibrated so the population spans roughly
 * the 0.06–1.0 range PR #42's ladder covered — below about 0.06 the induction model still pins most
 * of the vocabulary, so a wider low tail buys spread the construct does not have.
 */
export function makePopulation({ n = 60, seed = 4242, misbind = 0, lapse = 0.02 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const trait = standardNormal(seed, `child|${i}`);
    const fidelity = 1 / (1 + Math.exp(-(0.55 + 1.15 * trait)));
    return {
      id: `child-${i}`,
      kind: 'learner',
      /** The planted trait, on the scale the report ranks against. */
      trait,
      fidelity: Math.min(1, Math.max(0.03, fidelity)),
      lapse,
      misbind,
    };
  });
}
