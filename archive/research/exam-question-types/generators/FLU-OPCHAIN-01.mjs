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
// `servedItemSchema` omits wholesale. Three content-computable shortcuts are closed explicitly:
//
//   1. "pick the option that differs most from the input." Every item is required to carry at least
//      one DISTANCE-MATCHED distractor — one whose figure differs from the input in as many
//      components as the key does — so the key is never the unique argmax of surface change. This
//      is asserted here and re-derived independently by check-FLU-OPCHAIN-01.mjs.
//   2. "the key sits in the modal slot." Key positions are allocated round-robin over the five
//      slots, so the modal-key advantage is at the arithmetic floor for a 5-option item (E-094).
//   3. "brute-force the mapping and see which options survive." This is the one that was measured
//      too weakly. The first version of this generator asked only that the key not be the ONLY
//      surviving option, and by that test the bank was clean: 0 of 234 items determined. But a
//      client does not stop at determinacy — it counts how many relabellings back each option and
//      plays a rank, and measured that way the same bank handed it 34.0% in its hardest difficulty
//      slice against a 20% five-option floor (32.9% bank-wide, 38.2% worst slice, once the attacker
//      is allowed to choose its rank per vote SHAPE, which is also content). Determinacy is the
//      wrong bar: "the key is not DETERMINED" is a much weaker property than "the key is not
//      PREDICTABLE", and the gap between them was 14 points. See {@link chooseDistractors} for the
//      invariants that close it and `gate-a/opchain-attacker-probe.mjs` for the measurement.
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
// WHERE THE TWO BANKS ARE WRITTEN, AND WHY THEY ARE NOT SIBLINGS.
//
// `banks/` is the SERVED directory: `apps/web/src/lib/exam/bank-loader.ts` builds every path it
// reads inside it, and `scripts/sync-exam-demos.mjs` globs it to decide what is wired. So the
// consistent arm is written there as the plain `banks/FLU-OPCHAIN-01.jsonl` — the live bank — and
// the scrambled arm is written to `control-banks/`, a directory no application code names.
//
// That is a stronger guarantee than a filename convention. Under the previous
// `<CODE>.<arm>.jsonl` scheme both arms sat in the served directory and were skipped only because
// no `demos/<CODE>.<arm>.html` existed; adding one would silently have wired the scrambled bank.
// The research harnesses reach the control arm by naming the directory, which is the only thing
// that should be able to.
//
// Run:  node research/exam-question-types/generators/FLU-OPCHAIN-01.mjs
//       writes ../banks/FLU-OPCHAIN-01.jsonl (consistent, live) and
//       ../control-banks/FLU-OPCHAIN-01.perTrial.jsonl (scrambled control, never served)
//       and prints a coverage + equating summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

/**
 * THE FIGURE ALGEBRA LIVES IN `FLU-OPCHAIN-01-algebra.mjs`, and is re-exported here unchanged.
 *
 * §1.3 is the reason there are six operators rather than one hidden rule: a single rule to discover
 * produces a STEP (chance until insight, ceiling after), and fitting a linear lambda to a step wastes
 * most of 30 trials. A composable vocabulary makes "having learned it" a ladder — know one primitive,
 * chain two, chain three, extend to a pair never demonstrated.
 *
 * It was split out so the SERVE-TIME materialiser can import the algebra without importing this file,
 * which writes banks and ends in a CLI block with a top-level await. Every consumer — this generator,
 * the checker, the learnability adapter, the Gate A probes and the app's materialiser — resolves to
 * the same definitions, so none of them can drift on what `turn` does.
 */
export {
  GEOMETRIC_OPS,
  ATTRIBUTE_OPS,
  OPERATORS,
  isGeometric,
  BADGE_SYMBOLS,
  GLYPHS,
  composeOrient,
  GEOM_ELEMENT,
  applyOp,
  applyChain,
  figureKey,
  figureDistance,
  geometricPartIsIdentity,
  relabelVotes,
  partialRules,
} from './FLU-OPCHAIN-01-algebra.mjs';

import {
  ATTRIBUTE_OPS,
  BADGE_SYMBOLS,
  GEOMETRIC_OPS,
  GLYPHS,
  OPERATORS,
  applyChain,
  figureDistance,
  figureKey,
  geometricPartIsIdentity,
  isGeometric,
  makeRng,
  partialRules,
  relabelVotes,
  seededUuid,
  shuffle,
} from './FLU-OPCHAIN-01-algebra.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round2 = (x) => Math.round(x * 100) / 100;

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
 * All six classes are still TAGGED and still admissible. What changed is that
 * they no longer ORDER the slate: the class list used to carry a numeric
 * `nearness` from "almost had it" to "did not engage" and `distractorSimilarity`
 * picked a point on it, but the strengthened anti-leak invariant deletes whole
 * classes at some depths, which would make that axis a lever that moves the
 * stated difficulty without moving the item. See {@link chooseDistractors} for
 * the positioner that replaced it. Each label maps to a lure class already
 * registered in item-shape.mjs, so M-ERRTYPE / M-RULEID stay computable without
 * widening the coarse enum.
 * ================================================================== */
const FAILURES = [
  { kind: 'order_error', lure: 'order_error' },
  { kind: 'over_application', lure: 'over_application' },
  { kind: 'omission', lure: 'omission' },
  { kind: 'wrong_operator', lure: 'wrong_operator' },
  { kind: 'first_step_only', lure: 'first_step_only' },
  { kind: 'identity_copy', lure: 'identity_copy' },
];

/**
 * How far a slate's summed distance cost may exceed the best available before the vote-balancing
 * objective is allowed to move it.
 *
 * The difficulty lever comes FIRST and the anti-leak objective only chooses among slates the lever
 * is nearly indifferent between. Without a bound like this, minimising the attacker would quietly
 * BECOME the difficulty model, which is the §1.1(d) structured-labelling error wearing a security
 * badge — and the temptation is real, because the budget buys the anti-leak figure directly: 44
 * items in this bank could be driven to zero information by spending between 0.6 and 3.9 more.
 *
 * 1.0 over four distractors is 0.25 of one figure component each, which is the same PER-DISTRACTOR
 * budget `VER-MORPHO-01` set (0.75 over three), chosen there because a quarter of one attribute is
 * below the granularity the lever itself resolves. Taking the sibling's per-distractor number rather
 * than the value that minimises the attacker is the point: this constant is the one place where the
 * measurement could be tuned into the design, so it is set by precedent and the residual it leaves
 * is reported instead.
 */
const DISTANCE_COST_TOLERANCE = 1.0;

/**
 * Choose four distractors at the requested distance from the key, subject to four invariants.
 *
 * WHY THE POSITIONER CHANGED, AND WHAT IT COST. The first version ordered candidates by rule-class
 * NEARNESS: `order_error` (1.0) down to `identity_copy` (0.0), with `distractorSimilarity` picking a
 * point on that axis. Invariant I2 below makes that axis unusable as a positioner, because it
 * deletes whole rule classes at some depths — at depth 1 the only reachable non-key figures are the
 * five single-operator outputs, so every candidate is `wrong_operator` and the nearness axis is a
 * single point. A lever that moves the stated difficulty without moving the item is exactly the
 * §1.1(d) labelling error, so the positioner is now FIGURE DISTANCE FROM THE KEY — how many
 * components separate a distractor from the right answer. At similarity 1 every distractor sits one
 * component from the key and the item is a minimal-pair discrimination; at similarity 0 they sit as
 * far away as the chain admits. That axis exists for every reachable candidate at every depth and
 * does not depend on the rule taxonomy at all, which is the same move `VER-MORPHO-01` made for the
 * same reason.
 *
 * The rule tagging is NOT what was given up: every distractor still carries the named partial rule
 * it encodes, and §4.6's strategy trace is unchanged. What was given up is rule-class nearness as
 * the *ordering* key, and the classes that survive the I2 filter are now whatever the chain happens
 * to admit rather than a designed spread. §9 of the Gate A report measures which classes those are.
 *
 * The four invariants, in the order they bind:
 *
 *   I2  EVERY chosen distractor must be relabelling-reachable. This is the strengthening: with all
 *       five options reachable, nothing can be eliminated and the "delete what no mapping reaches,
 *       guess among the rest" attack sits exactly on the 20% chance floor. The previous invariant
 *       asked for one reachable distractor, which bounds that attack at 50%.
 *   I1  at least one chosen distractor must move as far from the INPUT as the key does, or "tap
 *       whichever picture changed the most" scores above chance with no knowledge of the system.
 *   I3  the key's RANK among the five vote counts must land on `voteRankTarget`, which `buildBank`
 *       allocates round-robin over the five ranks exactly as it allocates the key's screen position.
 *
 * WHY I3 IS A RANK QUOTA AND NOT "THE KEY IS NEVER MODAL". Modal and anti-modal are the first and
 * last of five ranks, and a client can run any of them — and can run a different one depending on the
 * vote SHAPE it is looking at, because the sorted vote vector is content. So bounding the two tails
 * leaves the middle open, and pushing the key away from modal is itself a pattern: it hands the
 * anti-modal attacker the certainty the modal attacker lost. Every rank-based attack is closed at
 * once, and only at once, by making the key's rank UNIFORM: if the key is equally likely to occupy
 * any of the five ranks, then a tier of size s holds the key on s/5 of items and guessing inside it
 * pays 1/s, so every tier strategy scores exactly 1/5 whatever the shape. That is the invariant, and
 * it is why the round-robin cursor is a recorded lever rather than a local optimisation.
 *
 * A slate whose five vote counts are all EQUAL is a single tier spanning all five ranks, so it
 * satisfies every target and carries no information at all. Those are preferred wherever they exist,
 * and they are the reason most of the bank sits exactly on the floor rather than near it. The rank
 * quota is what handles the remainder, where the chain admits no equal-vote slate.
 *
 * Slates are enumerated exhaustively rather than hill-climbed — after de-duplication by figure there
 * are at most a dozen or so candidates, so all 4-subsets is a few hundred evaluations and there is no
 * reason to accept a local optimum on the one property E-075/E-076 turn on.
 */
function chooseDistractors(chain, input, key, similarity, votes, voteRankTarget) {
  const keyFigure = figureKey(key);
  const keyVotes = votes.get(keyFigure) ?? 0;
  const keyInputDistance = figureDistance(input, key);
  const seen = new Set([keyFigure]);

  // I2, as a FILTER rather than a repair. A candidate no relabelling reaches is one the attacker can
  // prove is not the key and delete, so it is not admissible at all.
  const candidates = partialRules(chain)
    .map((rule) => ({ rule, output: applyChain(rule.chain, input) }))
    .filter(({ output }) => {
      const k = figureKey(output);
      if (seen.has(k)) return false;
      seen.add(k);
      return (votes.get(k) ?? 0) >= 1;
    })
    .map((entry) => ({
      ...entry,
      keyDistance: figureDistance(key, entry.output),
      inputDistance: figureDistance(input, entry.output),
      votes: votes.get(figureKey(entry.output)) ?? 0,
    }));
  if (candidates.length < 4) return null;

  const maxKeyDistance = Math.max(...candidates.map((c) => c.keyDistance));
  const target = 1 + (1 - similarity) * (maxKeyDistance - 1);
  const ordered = candidates
    .map((entry) => ({ ...entry, cost: Math.abs(entry.keyDistance - target) }))
    .sort((a, b) => a.cost - b.cost || (a.rule.ruleId < b.rule.ruleId ? -1 : 1));

  const admissible = [];
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      for (let k = j + 1; k < ordered.length; k++) {
        for (let l = k + 1; l < ordered.length; l++) {
          const slate = [ordered[i], ordered[j], ordered[k], ordered[l]];
          if (!slate.some((c) => c.inputDistance >= keyInputDistance)) continue; // I1
          const tally = [keyVotes, ...slate.map((c) => c.votes)];
          const sum = tally.reduce((a, b) => a + b, 0);
          const above = tally.filter((v) => v > keyVotes).length;
          const shared = tally.filter((v) => v === keyVotes).length;
          const tiers = new Set(tally).size;
          admissible.push({
            slate,
            distanceCost: slate.reduce((a, c) => a + c.cost, 0),
            // The key's tier occupies ranks [above, above + shared - 1] of the five, so the target is
            // met when it falls inside that window.
            hitsRankTarget: voteRankTarget >= above && voteRankTarget <= above + shared - 1,
            tiers,
            maxShare: Math.max(...tally) / sum,
            uniquelyExtreme:
              shared === 1 && (above === 0 || above + shared === tally.length) ? 1 : 0,
            slateId: slate.map((s) => s.rule.ruleId).join('|'),
          });
        }
      }
    }
  }
  if (admissible.length === 0) return null;

  // Lever first, anti-leak second: the budget is measured against the BEST distance cost any
  // admissible slate reaches, so the anti-leak objective can only choose among slates the difficulty
  // lever already treats as equivalent.
  const budget = Math.min(...admissible.map((c) => c.distanceCost)) + DISTANCE_COST_TOLERANCE;
  return admissible
    .filter((c) => c.distanceCost <= budget + 1e-9)
    .sort(
      (a, b) =>
        // I3 first: the rank quota is the invariant, and an equal-vote slate satisfies it for free.
        Number(b.hitsRankTarget) - Number(a.hitsRankTarget) ||
        // Fewer tiers is less information; one tier is none.
        a.tiers - b.tiers ||
        // Only if the quota cannot be met: do not hand any single strategy a certainty.
        a.uniquelyExtreme - b.uniquelyExtreme ||
        a.maxShare - b.maxShare ||
        a.distanceCost - b.distanceCost ||
        (a.slateId < b.slateId ? -1 : a.slateId > b.slateId ? 1 : 0),
    )[0].slate;
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
  voteRankTarget,
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

  // The client's whole posterior over the item, computed once and shared by the slate search and the
  // per-item audit below, so the invariants and the reported figure cannot drift apart.
  const votes = relabelVotes(chain.length, input);
  const distractors = chooseDistractors(
    chain,
    input,
    key,
    distractorSimilarity,
    votes,
    voteRankTarget,
  );
  if (distractors === null) {
    throw new Error(`no admissible 4-distractor slate under the anti-leak invariants (seed ${seed})`);
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
      lure: FAILURES.find((f) => f.kind === rule.kind).lure,
      ruleId: rule.ruleId,
      partialRuleKind: rule.kind,
      note: rule.note,
    };
    strategyTrace[optionKey] = { ruleId: rule.ruleId, kind: rule.kind };
  });

  const cfg = { depth, geom };
  const difficulty = round2(difficultyFromLevers(cfg, distractorSimilarity));

  // The anti-leak audit, carried PER ITEM so the claim is checkable off the shipped bank rather than
  // only off a generator run. `optionVotes` is how many relabellings send the chain to each option,
  // in A..E order; `viableOptions` is how many survive the elimination attack (5 is the target, and
  // 1 would be a determined item); `maxVoteShare` is the modal attacker's posterior, whose floor is
  // 1/5 = 0.2 and which equals 0.2 exactly when all five options are equally backed.
  const optionVotes = figures.map((figure) => votes.get(figureKey(figure)) ?? 0);
  const totalVotes = optionVotes.reduce((a, b) => a + b, 0);

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
      relabelling: {
        optionVotes,
        viableOptions: optionVotes.filter((v) => v > 0).length,
        maxVoteShare: totalVotes === 0 ? 1 : round2(Math.max(...optionVotes) / totalVotes),
        minVoteShare: totalVotes === 0 ? 1 : round2(Math.min(...optionVotes) / totalVotes),
      },
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
        // Which of the five vote ranks the key is aimed at, round-robin across the bank. This is the
        // anti-leak rank quota (I3), recorded as a lever so the item stays reproducible from its own
        // provenance and the checker can re-derive the invariant rather than trust it.
        voteRankTarget,
        glyphIndex,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        distractorSimilarity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

/**
 * What makes two items the SAME QUESTION, for the purpose of refusing to ship both.
 *
 * `learning-block.ts` forbids re-serving an item, because a re-served item measures recall of that
 * item rather than the system. Two items that differ only in `itemId` are a repeat wearing a new
 * label, and if they also carry different stated difficulties they are the §1.1(d) structured
 * labelling error as well — the same question priced twice. At six items per rung the stimulus space
 * was wide enough to hide this; at twelve it is not, and the first 12/rung draw produced one such
 * pair at difficulty 1.09 and 1.80.
 *
 * Two properties of the fingerprint are deliberate and both are load-bearing.
 *
 * It is ARM-INDEPENDENT: it names the operator chain, not the badge chain. A badge-sensitive
 * fingerprint would let the two arms collide at different points and therefore redraw at different
 * points, so they would contain different items — which would break the item-for-item equating the
 * whole control condition rests on.
 *
 * It is INSENSITIVE TO OPTION ORDER, and identifies the answer by its FIGURE rather than by its slot.
 * Two items showing the same input, the same chain and the same five pictures are the same question
 * even when the key has been round-robined into a different position: a child who remembers the
 * picture is right again wherever it sits. An order-sensitive fingerprint misses those — it left four
 * such pairs in the 6/rung bank on `dev` and would have left ten here, which `qa/audit_banks.mjs`
 * reports as "near-identical once option ordering is normalised".
 */
export function stimulusFingerprint(item) {
  const keyFigure = item.content.options.find((o) => o.key === item.answer.correctKey).figure;
  return JSON.stringify([
    figureKey(item.content.input),
    item.answer.operatorChain,
    figureKey(keyFigure),
    item.content.options.map((o) => figureKey(o.figure)).sort(),
  ]);
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
export function buildBank({ systemPersistence, perRung = 12, systemSeed = 'FLU-OPCHAIN-01|v1' }) {
  const items = [];
  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));

  // One global item counter driving three balanced allocations.
  //
  // The key's screen POSITION takes `n % 5` and the key's vote RANK takes `floor(n / 5) % 5`, so the
  // pair walks all 25 combinations every 25 items. Incrementing both at `n % 5` would have made them
  // equal on every item, which would hand a client "the key's screen slot tells you its vote rank" —
  // a leak assembled out of two separate anti-leak measures.
  let itemCursor = 0;
  let glyphCursor = 0;
  /** Every stimulus already emitted, so a duplicate question is refused rather than shipped. */
  const emitted = new Set();

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
      const baseSeed = `FLU-OPCHAIN-01|rung=${rung}|i=${i}|D${c.depth}G${c.geom}`;
      // The cursors advance once per ITEM, not once per redraw attempt, so a redraw cannot shift the
      // key-position or vote-rank allocation off its round-robin.
      const lever = {
        ...c,
        distractorSimilarity: similarity,
        // Round-robin over all three, so key position, key vote rank and glyph are balanced by
        // construction rather than by luck (E-094).
        keyPosition: itemCursor % 5,
        voteRankTarget: Math.floor(itemCursor++ / 5) % 5,
        glyphIndex: glyphCursor++ % GLYPHS.length,
        systemPersistence,
        systemSeed,
      };

      // Redraw on a duplicate stimulus, carrying the attempt in the SEED rather than in a new lever,
      // so the item stays byte-reproducible from its own provenance: the checker regenerates from
      // `levers` + `provenance.seed` and lands on the same draw without knowing a redraw happened.
      let item = null;
      for (let attempt = 0; attempt < 64 && item === null; attempt++) {
        const candidate = genItem({
          ...lever,
          seed: attempt === 0 ? baseSeed : `${baseSeed}|r${attempt}`,
        });
        if (emitted.has(stimulusFingerprint(candidate))) continue;
        item = candidate;
      }
      if (item === null) {
        throw new Error(`64 redraws at rung ${rung} i=${i} all duplicated an existing stimulus`);
      }
      emitted.add(stimulusFingerprint(item));
      items.push(item);
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
/**
 * Where each arm's bank file lives. The consistent arm takes the bare code inside the served
 * directory so the loader and the sync script find it by the ordinary rule; the scrambled arm is
 * written outside that directory entirely, keeping its arm suffix so a stray copy is recognisable.
 */
export const BANK_PATHS = {
  consistent: '../banks/FLU-OPCHAIN-01.jsonl',
  perTrial: '../control-banks/FLU-OPCHAIN-01.perTrial.jsonl',
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
  // Anti-leak, on the bank just written, so a regeneration that weakened it says so immediately
  // rather than waiting for the checker. `reportBank` is the same code the before/after comparison
  // ran, which is the only way the two sides of that comparison are the same measurement.
  const { reportBank } = await import('../gate-a/opchain-attacker-probe.mjs');
  reportBank('FLU-OPCHAIN-01.consistent (as just written)', reference);

  // Content fingerprints. `learning-block.ts` forbids re-serving an item because a repeat measures
  // recall of that item, and two items differing only in `itemId` are a repeat wearing a new label.
  // Pricing one stimulus at two difficulties would also be the §1.1(d) labelling error directly.
  const fingerprints = new Map();
  for (const it of reference) {
    const fp = JSON.stringify([it.content.input, it.content.chain, it.content.options]);
    fingerprints.set(fp, (fingerprints.get(fp) ?? 0) + 1);
  }
  const collided = [...fingerprints.values()].filter((n) => n > 1).reduce((a, n) => a + n, 0);
  console.log(
    `\ncontent fingerprints: ${fingerprints.size} distinct over ${reference.length} items` +
      (collided > 0 ? ` — ${collided} ITEMS COLLIDE` : ' (no duplicate stimuli)'),
  );

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
