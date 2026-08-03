// SERVE-TIME MATERIALISATION for FLU-OPCHAIN-01 — the bank stores a template, the SESSION makes the item.
//
// STAGE2_REDESIGN_SPEC.md §2.1 and §3. This module is the whole of the path: draw the session's
// symbol->operator mapping, materialise a template's options under it, price the item on four
// relabelling-invariant levers, and record enough that the session replays exactly from its seed.
//
// ---------------------------------------------------------------------------
// WHAT WAS BROKEN, MEASURED, IN PR #51
//
// The owner's remedy for a permanently-compromised bank is to draw the hidden mapping per session
// rather than at build time. PR #51 measured whether the shipped banks can take that and found two
// separate failures.
//
// FAILURE B, the blocking one. The options are baked into the bank while the mapping is drawn at
// serve time, and nothing reconciles them, so the correct answer is on screen only by luck. A depth-d
// chain has P(6,d) readings and five fixed places to land:
//
//     chain depth 1 -> 78.2% of mappings land the key on screen
//     chain depth 4 -> 13.8%
//
// and depth is what the ladder is made of. A session served a mean of 28.0% of the bank and 87.8% of
// the 0.5-point rungs fell short of the five items the bank guarantees.
//
// FAILURE A. Difficulty is priced on a count of one operator sub-class (`geom`), and class membership
// belongs to the operator rather than to the symbol, so a free relabelling moves it on 48.3% of
// (item, mapping) pairs — mean 0.83 points against a granularity of 0.5 and a selection tolerance of
// 0.25.
//
// ---------------------------------------------------------------------------
// HOW THIS FIXES BOTH, AND WHY THE FIXES ARE THE SAME FIX
//
// {@link materialiseTemplate} resolves the chain's SLOTS through the drawn mapping FIRST, then builds
// every option from the template's rationales under that same mapping. The key is not selected from a
// baked slate; it is computed, and the distractors are computed alongside it. So admissibility stops
// being a probability: **the key is on screen by construction, at every depth, under every mapping.**
//
// The same move kills Failure A, because once options are materialised the difficulty model no longer
// needs a proxy for "how hard is the composition" — it can use the thing itself. {@link priceItem}
// prices four levers, none of which names an operator or an operator class: chain length (a count of
// positions), vocabulary in play (a count of symbols), evidence (a property of the trial history) and
// residual ambiguity (how many readings the child's own reveals still leave standing).
//
// It also closes something re-keying alone did not. The shipped generator allocates the key's screen
// slot with a global round-robin cursor and emits items in increasing difficulty, so sorting a scraped
// bank by the served `difficulty` recovers the emission index and `n mod 5` is the answer slot — the
// F7b attack, **70.5%** on this bank against a 20% floor. Here the slot comes from a seeded hash of
// (session seed, template id) and difficulty is a function of the child's evidence, so the two are
// independent by construction and there is no bank-wide order to scrape.
//
// ---------------------------------------------------------------------------
// THE RESIDUAL AMBIGUITY LEVER IS THE PR #48 ORACLE, NOT A SECOND IMPLEMENTATION
//
// §3 requires residual ambiguity — "how many readings remain consistent with everything revealed so
// far" — and the learnability oracles built in PR #48 already compute exactly that quantity, because
// that is what "when did this primitive become deducible" is made of. This module imports
// `createOracle` and the `flu-opchain` adapter and uses them AS the difficulty function. There is one
// definition of what a reveal rules out, and the difficulty model and the learnability report cannot
// disagree about it.
//
// ---------------------------------------------------------------------------
// CLAIM BOUNDARY
//
// Born-synthetic throughout (`syntheticOnly: true`, `validated: false`). Nothing here is evidence that
// the type measures learning — that is Gate B, it needs roughly 128 real children, and it has not run.
// Every difficulty this module computes is a DESIGN rung on the shared 1..20 scale, not a calibrated
// IRT parameter, and it is now additionally a function of one child's own history, which makes it
// less comparable across children rather than more. §5 states what that costs.

import { adapter as fluOpchainAdapter } from './stage2-learnability-adapters/flu-opchain.mjs';
import { applyRationaleTransform } from './stage2-item-template.mjs';
import { createOracle } from './stage2-learnability-core.mjs';
import {
  BADGE_SYMBOLS,
  GEOM_ELEMENT,
  OPERATORS,
  applyChain,
  figureDistance,
  figureKey,
  isGeometric,
  makeRng,
  relabelVotes,
  seededUuid,
  shuffle,
} from './generators/FLU-OPCHAIN-01-algebra.mjs';

export const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];
const round2 = (x) => Math.round(x * 100) / 100;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/* ================================================================== *
 * 1. THE SESSION SYSTEM
 * ================================================================== */

/**
 * Draw one session's hidden system from its seed.
 *
 * TWO permutations, not one, and the second is worth explaining because it buys less than it looks
 * like it does and is still worth having.
 *
 * `slotToOperator` is the system proper: what each slot of the hidden vocabulary MEANS this session.
 * Re-drawing it is the owner's rule 1, and it is what converts a permanent, transferable, bank-wide
 * compromise into a per-session, non-transferable one.
 *
 * `slotToBadge` is which SYMBOL the child sees for each slot. Cryptographically it adds nothing —
 * badge->operator is already uniform over the 720 bijections once `slotToOperator` is drawn. What it
 * adds is that a scrape of session A does not even INDEX into session B: the same template shows a
 * different badge chain, so a table keyed on (chain, options) built by playing one block does not
 * match a single screen in the next. Cheap, and strictly better than not doing it.
 *
 * NEITHER PERMUTATION MAY REACH THE BROWSER, and neither may the seed they come from, because the
 * seed determines both. `apps/web/src/lib/exam/materialised-session.ts` holds the seed server-side and
 * hands the browser an opaque token; `served-boundary.test.ts` and
 * `stage2-materialisation.test.ts` assert the payload carries no part of either.
 */
export function drawSessionSystem(sessionSeed) {
  const operators = shuffle(OPERATORS, makeRng(`session|operators|${sessionSeed}`));
  const badges = shuffle(BADGE_SYMBOLS, makeRng(`session|badges|${sessionSeed}`));
  const badgeToOperator = {};
  badges.forEach((badge, slot) => {
    badgeToOperator[badge] = operators[slot];
  });
  return {
    systemId: `sess-${seededUuid(`system|${sessionSeed}`).slice(0, 8)}`,
    slotToOperator: operators,
    slotToBadge: badges,
    badgeToOperator,
  };
}

/* ================================================================== *
 * 2. MATERIALISING ONE ITEM
 * ================================================================== */

/**
 * Why a template could not be served this session. Named rather than counted, because the two reasons
 * call for different responses: the first is a property of the template under this mapping and the
 * second is a property of the mapping.
 */
export const EXCLUSION_REASONS = Object.freeze({
  /**
   * §4.1's rule, stated as the spec states it: a template that admits fewer than two reachable
   * options is one where brute-forcing the mapping leaves a single option standing, so the key is
   * recoverable from `content` with no induction at all (E-075/E-076).
   */
  FEWER_THAN_TWO_REACHABLE: 'fewer-than-two-reachable-options',
  /** Not enough rationales materialised to distinct, reachable, non-key figures to fill the screen. */
  TOO_FEW_DISTRACTORS: 'too-few-admissible-distractors',
  /**
   * Under THIS mapping the chain does nothing to its input, so the key is the unchanged figure. A
   * child who taps "the picture that did not change" is right without reading the machine.
   */
  CHAIN_IS_A_NO_OP: 'chain-is-a-no-op-under-this-mapping',
  /**
   * Under THIS mapping the chain's orientation operators cancel in D4 — `slant` then `flip` then
   * `turn` is the identity — so the figure ends up pointing exactly as it started and the child can
   * ignore those badges entirely. The item is then far easier than its chain length, which is the
   * §1.1(d) structured-labelling error: chain length is a priced lever, and this item does not
   * deserve its rung. The shipped generator rejects these at build time; a template cannot, because
   * which slots are geometric is not known until the mapping is drawn, so the same guard moves here.
   */
  GEOMETRIC_PART_CANCELS: 'geometric-part-cancels-under-this-mapping',
});

/**
 * Materialise one template into a finished item under one session system.
 *
 * Returns `{ item, materialisation }` or `{ excluded: <reason> }`. Never throws on an inadmissible
 * template: exclusion is an expected outcome of drawing a mapping, not an error.
 *
 * The order of operations is the contract, and it is the opposite of the shipped generator's:
 *
 *   1. resolve the chain's SLOTS to operators through the session mapping;
 *   2. compute the key by running that operator chain over the input;
 *   3. materialise the rationales, in the template's priority order, taking the first four that give
 *      DISTINCT, REACHABLE, non-key figures;
 *   4. place the key at a slot drawn from a hash of (session seed, template id);
 *   5. shuffle the distractors into the remaining slots from the same seed.
 *
 * Step 3 keeps the shipped bank's I2 invariant unchanged: every option must be reachable by SOME
 * relabelling, so the "delete what no mapping reaches, guess among the rest" attack sits exactly on
 * the 20% five-option floor. `relabelVotes` is a function of (input, chain length) and not of the
 * mapping, which is why that invariant survives re-keying at all.
 *
 * Step 4 is where the F7b difficulty-ordinal attack dies. There is no emission cursor and no bank-wide
 * difficulty order to recover it from.
 */
export function materialiseTemplate(template, system, { sessionSeed }) {
  const operatorChain = template.chain.map((slot) => system.slotToOperator[slot]);
  const input = template.input;
  const key = applyChain(operatorChain, input);
  const keyFigure = figureKey(key);

  if (keyFigure === figureKey(input)) {
    return { excluded: EXCLUSION_REASONS.CHAIN_IS_A_NO_OP };
  }
  if (geometricPartCancels(operatorChain)) {
    return { excluded: EXCLUSION_REASONS.GEOMETRIC_PART_CANCELS };
  }

  const reachable = relabelVotes(template.chain.length, input);
  if (!reachable.has(keyFigure)) {
    // Cannot happen — the key IS one of the enumerated injective readings — but the whole path rests
    // on it, so it is checked rather than trusted.
    throw new Error(
      `${template.templateId}: the key is not in its own reachable set, so relabelVotes and ` +
        'applyChain disagree about the algebra',
    );
  }

  const taken = new Map([[keyFigure, 'key']]);
  const distractors = [];
  const rejected = [];
  for (const rationale of template.rationales) {
    if (distractors.length === 4) break;
    const slotChain = applyRationaleTransform(template.chain, rationale.transform);
    if (slotChain === null) {
      rejected.push({ rationaleId: rationale.rationaleId, why: 'transform-not-applicable' });
      continue;
    }
    const figure = applyChain(
      slotChain.map((slot) => system.slotToOperator[slot]),
      input,
    );
    const fk = figureKey(figure);
    if (taken.has(fk)) {
      // The normal case, not an error: five of six operators are involutions, so `twice@0` and
      // `drop@0` collide whenever slot 0 means one of them, and two commuting attribute operators
      // make `reorder@i` produce the key itself. This is what the priority list is long for.
      rejected.push({ rationaleId: rationale.rationaleId, why: `collides-with-${taken.get(fk)}` });
      continue;
    }
    if ((reachable.get(fk) ?? 0) < 1) {
      rejected.push({ rationaleId: rationale.rationaleId, why: 'not-relabelling-reachable' });
      continue;
    }
    taken.set(fk, rationale.rationaleId);
    distractors.push({ rationale, figure, votes: reachable.get(fk) ?? 0 });
  }

  if (distractors.length < 4) {
    return { excluded: EXCLUSION_REASONS.TOO_FEW_DISTRACTORS, rejected };
  }

  const optionFigures = [key, ...distractors.map((d) => d.figure)];
  const reachableOptions = optionFigures.filter((figure) => (reachable.get(figureKey(figure)) ?? 0) >= 1);
  if (reachableOptions.length < 2) {
    return { excluded: EXCLUSION_REASONS.FEWER_THAN_TWO_REACHABLE };
  }

  // The key's screen slot, and the order of the four distractors around it, both drawn from the
  // session seed and the template id. No cursor, no emission index, nothing a bank scrape can order.
  const placementRng = makeRng(`placement|${sessionSeed}|${template.templateId}`);
  const keySlot = Math.floor(placementRng() * OPTION_KEYS.length);
  const shuffled = shuffle(distractors, placementRng);

  const options = [];
  const rationaleBySlot = [];
  let d = 0;
  for (let slot = 0; slot < OPTION_KEYS.length; slot += 1) {
    if (slot === keySlot) {
      options.push({ key: OPTION_KEYS[slot], figure: cloneFigure(key) });
      rationaleBySlot.push({ optionKey: OPTION_KEYS[slot], rationaleId: 'correct', lure: 'correct' });
    } else {
      const chosen = shuffled[d++];
      options.push({ key: OPTION_KEYS[slot], figure: cloneFigure(chosen.figure) });
      rationaleBySlot.push({
        optionKey: OPTION_KEYS[slot],
        rationaleId: chosen.rationale.rationaleId,
        lure: chosen.rationale.lure,
        note: chosen.rationale.note,
      });
    }
  }

  const badgeChain = template.chain.map((slot) => system.slotToBadge[slot]);
  const correctKey = OPTION_KEYS[keySlot];

  return {
    item: {
      /**
       * A PER-SESSION item id. Two sessions serving the same template serve different items, because
       * they are different items: different badges, different options, different key. Deriving it
       * from the session seed also means an id scraped from one session names nothing in another.
       */
      itemId: seededUuid(`item|${sessionSeed}|${template.templateId}`),
      typeCode: template.typeCode,
      domain: template.domain,
      ageBands: template.ageBands.slice(),
      /** Filled by {@link priceItem}: difficulty is not a property of the item alone. */
      difficulty: null,
      content: {
        typeCode: template.typeCode,
        // Canonical order, so the tray carries no information about this session's mapping.
        badgeTray: BADGE_SYMBOLS.slice(),
        input: cloneFigure(input),
        chain: badgeChain,
        options,
      },
      /** SERVER-ONLY from here down. Never projected toward the browser. */
      answer: {
        correctKey,
        operatorChain: operatorChain.slice(),
        badgeChain: badgeChain.slice(),
        strategyTrace: Object.fromEntries(
          rationaleBySlot.map((entry) => [
            entry.optionKey,
            { ruleId: entry.rationaleId, kind: entry.rationaleId === 'correct' ? 'correct' : entry.lure },
          ]),
        ),
        distractorRationales: Object.fromEntries(
          rationaleBySlot.map((entry) => [
            entry.optionKey,
            {
              lure: entry.lure,
              ruleId: entry.rationaleId,
              ...(entry.note === undefined ? {} : { note: entry.note }),
            },
          ]),
        ),
        keyDistanceFromInput: figureDistance(input, key),
        relabelling: {
          optionVotes: options.map((o) => reachable.get(figureKey(o.figure)) ?? 0),
          viableOptions: reachableOptions.length,
        },
      },
      scoring: { mode: 'deterministic_key' },
      syntheticOnly: true,
      validated: false,
    },
    /**
     * The R7 record. Everything needed to say what trial 7 showed, without re-deriving it and without
     * storing the mapping alongside every trial. `optionRationaleIds` in slot order plus `keySlot` is
     * the option ORDER; the difficulty is added by {@link priceItem}.
     */
    materialisation: {
      templateId: template.templateId,
      keySlot,
      correctKey,
      optionRationaleIds: rationaleBySlot.map((entry) => entry.rationaleId),
      optionFigureKeys: options.map((o) => figureKey(o.figure)),
      chainLength: template.chain.length,
      slots: template.structure.slots.slice(),
    },
  };
}

/**
 * Whether the chain's orientation operators compose to the identity in D4.
 *
 * The same predicate the shipped generator applies to an operator chain at build time. It lives here
 * as well because under materialisation the operator chain does not exist until the mapping is drawn,
 * so this is the only place it CAN be applied — see {@link EXCLUSION_REASONS.GEOMETRIC_PART_CANCELS}.
 */
function geometricPartCancels(operatorChain) {
  let a = 0;
  let b = 0;
  let sawGeometric = false;
  for (const op of operatorChain) {
    if (!isGeometric(op)) continue;
    sawGeometric = true;
    const g = GEOM_ELEMENT[op];
    a = (((g.a + (g.b ? -a : a)) % 4) + 4) % 4;
    b = (g.b + b) % 2;
  }
  return sawGeometric && a === 0 && b === 0;
}

const cloneFigure = (f) => ({ ...f, orient: { ...f.orient } });

/* ================================================================== *
 * 3. DIFFICULTY — four levers, none of which names a meaning (§3)
 * ================================================================== */

/**
 * Load per chain length. Taken unchanged from the shipped generator's `DEPTH_LOAD` so the depth ladder
 * keeps the shape Gate A measured, and so a difficulty computed here is on the same 1..20 scale as one
 * read off the shipped bank rather than on a new scale that happens to share its bounds.
 */
export const CHAIN_LENGTH_LOAD = { 1: 0, 2: 2.4, 3: 4.4, 4: 6.0 };

/** How much the whole vocabulary being in play adds, over having seen one symbol. */
export const VOCABULARY_WEIGHT = 2.0;

/**
 * The widest step between adjacent chain lengths, which is what the evidence lever has to cover.
 *
 * Chain length is the only lever with big discrete steps, so it partitions the scale into four bands.
 * If no other lever spans a whole step, the reachable difficulties are four disjoint clusters with
 * GAPS between them, and a target landing in a gap cannot be served however large the pool is. That
 * was measured, not feared: at 1.6 the pool offered 15 to 55 distinct values and still missed a target
 * by 1.36 points, because they were all inside the bands.
 */
export const MAX_LENGTH_STEP = Math.max(
  ...[2, 3, 4].map((length) => CHAIN_LENGTH_LOAD[length] - CHAIN_LENGTH_LOAD[length - 1]),
);

/**
 * How much relief a fully-evidenced item gets. **Derived, not chosen.**
 *
 * EVIDENCE IS WHERE THE POOL'S RESOLUTION COMES FROM, which is worth saying because the first version
 * of this model had almost none. Three of the four levers saturate: chain length is a small integer,
 * vocabulary in play is a BLOCK fact and therefore identical across every candidate at a given trial,
 * and residual ambiguity goes to 1 for every item the moment the system is pinned — which on a seeded
 * 30-trial run happened at trial 12. From there the whole pool offered **four** distinct difficulties,
 * one per chain length, against a selection tolerance of 0.25. Evidence is the only lever that both
 * varies across candidates late in a block and does not saturate, because two items drawing on
 * different symbols have genuinely different histories however long the block has run.
 *
 * So the weight is set to whatever makes the evidence lever span one full chain-length step, which is
 * the condition for the four bands to overlap and the reachable set to be gap-free. `MAX_RELIEF` is
 * the most {@link evidenceRelief} actually reaches in a 30-trial block rather than its limit of 1 —
 * relief is concave and approaches 1 only asymptotically, so dividing by the limit would leave the
 * bands short of touching by a tenth of the block's whole range.
 *
 * WHAT THE NUMBER MEANS, since it is now larger than the depth-1 load: a depth-2 item whose two
 * symbols the child has seen resolved several times is priced no harder than a depth-1 item on a
 * symbol they have never seen. That is the claim, and it is the right way round — a composition of two
 * known operations is arithmetic, and a single unknown one is a guess.
 */
const MAX_RELIEF = 1 - 1 / (1 + 8);
export const EVIDENCE_WEIGHT = round2(MAX_LENGTH_STEP / MAX_RELIEF);

/**
 * Relief from the evidence behind ONE item's symbols, in 0..1.
 *
 * The mean over the item's distinct symbols of a saturating per-symbol relief `1 - 1/(1+c)`, where `c`
 * counts the committed trials that constrained that symbol.
 *
 * Three properties, each of which rules out a simpler reading that was tried first:
 *
 *   A MEAN, NOT A SUM. Summing counts over the item's symbols credits a depth-4 item four times over
 *   for having four symbols, so chain length would buy relief when chain length is supposed to cost
 *   load — and the sum saturates almost immediately, which is what flattened the pool to four values.
 *
 *   SATURATING PER SYMBOL. The fourth trial to constrain a symbol says far less than the first, so
 *   relief is concave in `c`. This is also what keeps the term bounded without a cap, and a cap is what
 *   destroys resolution: any bucketing collapses exactly the distinctions the selector needs late.
 *
 *   BOTTLENECK-SENSITIVE. One symbol at `c = 0` holds a depth-2 item's relief at most 0.5 however well
 *   evidenced the other is, because a single unresolved step leaves the whole composition open. The
 *   mean of a concave function does that without a separate minimum term.
 */
export function evidenceRelief(evidenceCounts) {
  if (evidenceCounts.length === 0) return 0;
  let total = 0;
  for (const count of evidenceCounts) total += 1 - 1 / (1 + Math.max(0, count));
  return total / evidenceCounts.length;
}
/** How much complete ignorance of the system adds, over knowing it exactly. */
export const AMBIGUITY_WEIGHT = 3.4;

const RAW_MIN = 1.0 + CHAIN_LENGTH_LOAD[1] + 0 - EVIDENCE_WEIGHT + 0;
const RAW_MAX = 1.0 + CHAIN_LENGTH_LOAD[4] + VOCABULARY_WEIGHT - 0 + AMBIGUITY_WEIGHT;

/**
 * Price one materialised item against one child's evidence.
 *
 * FOUR LEVERS, and the table in §3 is the whole justification for each:
 *
 *   chainLength        how many symbols are applied. A count of POSITIONS, not of meanings, so a
 *                      relabelling cannot move it. Dominant, because it is the ladder the learnable
 *                      thing unlocks (§1.3).
 *   vocabularyInPlay   how many distinct symbols have appeared so far this block, this item included.
 *                      A count of SYMBOLS, not of what they do.
 *   evidence           how many earlier trials constrained at least one of this item's symbols. A
 *                      property of the trial HISTORY.
 *   residualAmbiguity  how many readings are still consistent with every reveal so far AND still land
 *                      on some option of THIS item. Computed by the PR #48 oracle. It moves WITH the
 *                      session mapping rather than against it, which is what §3 asks of it.
 *
 * WHAT NONE OF THEM IS: a count of an operator sub-class. That is Failure A, and the whole reason the
 * shipped model had to go.
 *
 * A CONSEQUENCE THAT IS NOT IN §3 AND HAS TO BE SAID. Two of the four levers move monotonically with
 * trial index by construction — evidence only accumulates, and residual ambiguity only shrinks — so an
 * item's price FALLS as the block proceeds even though nothing about the item changed. That is the
 * intended reading of §3 ("what actually makes an item hard for this child at this point in the
 * block"), and it collides with how the climb is fitted: `estimateLearningCurve` takes difficulty as
 * the item covariate, and a covariate that declines with trial index by construction absorbs part of
 * the very climb it is meant to condition on. So `levers.structural` is recorded alongside the total —
 * the two levers a file CAN hold, with no evidence term in them — and it is the covariate a fit should
 * use. The size of the confound is measured in §5 of the probe rather than assumed small.
 */
export function priceItem({
  chainLength,
  vocabularyInPlay,
  slotCount,
  evidenceCounts,
  residualAmbiguity,
  readingsTotal,
}) {
  const lengthLoad = CHAIN_LENGTH_LOAD[chainLength] ?? CHAIN_LENGTH_LOAD[4];
  const vocabularyLoad =
    slotCount > 1 ? (VOCABULARY_WEIGHT * (vocabularyInPlay - 1)) / (slotCount - 1) : 0;
  const relief = EVIDENCE_WEIGHT * evidenceRelief(evidenceCounts);
  // Log rather than linear: halving the surviving readings is one bit whether it happens at 720 or at
  // 4, and a linear term would put almost the whole lever in the first two trials of the block.
  const ambiguityShare =
    readingsTotal <= 1 ? 0 : Math.log2(Math.max(1, residualAmbiguity)) / Math.log2(readingsTotal);
  const ambiguityLoad = AMBIGUITY_WEIGHT * ambiguityShare;

  const raw = 1.0 + lengthLoad + vocabularyLoad - relief + ambiguityLoad;
  const difficulty = clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);

  return {
    difficulty: round2(difficulty),
    levers: {
      chainLength,
      vocabularyInPlay,
      /** Per-symbol constraining-trial counts, in the item's chain order. The lever's raw input. */
      evidenceCounts: evidenceCounts.slice(),
      /** The bottleneck, carried because it is what the lever is interpreted as. */
      evidence: evidenceCounts.length === 0 ? 0 : Math.min(...evidenceCounts),
      residualAmbiguity,
      /**
       * The evidence-free part of the same scale, for a fit that needs an item covariate which is not
       * a function of trial index. See the note above.
       */
      structural: round2(
        clamp(
          1 + ((1.0 + lengthLoad + vocabularyLoad - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN),
          1,
          20,
        ),
      ),
    },
  };
}

/* ================================================================== *
 * 4. A WHOLE SESSION, DETERMINISTIC FROM ITS SEED
 * ================================================================== */

/**
 * Open a materialised session over a template pool.
 *
 * DETERMINISM MOVED, AND THIS IS WHERE IT MOVED TO. Under the shipped bank the item is fixed and the
 * session is a walk over it, so "reconstruct what this child saw" needs only the item ids. Under
 * materialisation the item is a function of the session, so reconstruction needs the SEED and the
 * child's own choices — and nothing else. That is R7's requirement restated: a rejected family's
 * result must be reconstructible, and {@link replaySession} is the reconstruction.
 *
 * The oracle is built once. Its mapping space is 720 wide and each item's prediction row is cached by
 * `itemId`, so folding in a reveal is a filter over an integer array and asking what an item still
 * admits is a scan. Difficulty is memoised against an evidence VERSION that bumps on every commit,
 * because the surviving set is the only input that changes between trials.
 */
export function openSession({ sessionSeed, templates, revealMode = 'outcome' }) {
  const system = drawSessionSystem(sessionSeed);
  const oracle = createOracle(fluOpchainAdapter, { revealMode });
  const readingsTotal = oracle.mappings.length;

  /** Templates that materialise under THIS mapping, and the ones that did not, with the reason. */
  const materialised = [];
  const excluded = [];
  for (const template of templates) {
    const result = materialiseTemplate(template, system, { sessionSeed });
    if (result.excluded !== undefined) {
      excluded.push({ templateId: template.templateId, reason: result.excluded });
      continue;
    }
    materialised.push({ template, ...result });
  }

  let knowledge = oracle.newKnowledge();
  let evidenceVersion = 0;
  /** Template ids already served this session. A re-served item measures recall of that item. */
  const served = new Set();
  /** Badge symbols that have appeared in any served item's chain so far. */
  const symbolsSeen = new Set();
  /** Per badge symbol, how many committed trials constrained it. */
  const constraintCount = new Map();
  const ledger = [];
  const priceCache = new Map();

  /**
   * What the child's evidence says about one candidate, right now.
   *
   * `residualAmbiguity` is the oracle's surviving set intersected with "and this reading puts
   * something on THIS screen". Both halves matter: the first is what the reveals so far have left
   * standing, the second is what of that is live for this item. A reading that predicts a figure not
   * among the five options tells the child nothing here, so counting it would price an item on
   * ambiguity it does not actually carry.
   */
  function evidenceFor(entry) {
    const rows = oracle.predictions(entry.item);
    let live = 0;
    for (const index of knowledge.surviving) if (rows[index].length > 0) live += 1;

    const chain = entry.item.content.chain;
    const vocabularyInPlay = new Set([...symbolsSeen, ...chain]).size;

    // Per SYMBOL rather than per item, and de-duplicated, because that is the resolution
    // `evidenceRelief` needs to keep two items over different symbol sets distinguishable.
    const evidenceCounts = [...new Set(chain)].map((symbol) => constraintCount.get(symbol) ?? 0);

    return { residualAmbiguity: live, vocabularyInPlay, evidenceCounts };
  }

  function priceOf(entry) {
    const cacheKey = `${String(evidenceVersion)}|${entry.item.itemId}`;
    const hit = priceCache.get(cacheKey);
    if (hit) return hit;
    const { residualAmbiguity, vocabularyInPlay, evidenceCounts } = evidenceFor(entry);
    const priced = priceItem({
      chainLength: entry.template.chain.length,
      vocabularyInPlay,
      slotCount: entry.template.structure.slotCount,
      evidenceCounts,
      residualAmbiguity,
      readingsTotal,
    });
    priceCache.set(cacheKey, priced);
    return priced;
  }

  /**
   * Every candidate still unserved, priced against the evidence so far.
   *
   * Returned as fresh objects carrying the priced `difficulty`, so a caller selecting on difficulty is
   * selecting on the number that will be RECORDED — the two cannot drift.
   */
  function candidates() {
    const out = [];
    for (const entry of materialised) {
      if (served.has(entry.template.templateId)) continue;
      const priced = priceOf(entry);
      out.push({
        entry,
        item: { ...entry.item, difficulty: priced.difficulty },
        difficulty: priced.difficulty,
        levers: priced.levers,
      });
    }
    return out;
  }

  /**
   * Serve one candidate: write the ledger row, then fold this item's symbols into "seen".
   *
   * The reveal is NOT folded in here. A reveal happens after the child commits, so folding it at serve
   * time would let this trial's own answer decide how hard this trial was — the exact ordering error
   * the oracle's own test suite exists to catch.
   */
  function serve(templateId) {
    const entry = materialised.find((m) => m.template.templateId === templateId);
    if (entry === undefined) {
      throw new Error(`${templateId} is not admissible in session ${sessionSeed}`);
    }
    if (served.has(templateId)) throw new Error(`${templateId} was already served this session`);
    const priced = priceOf(entry);
    served.add(templateId);

    const row = {
      trial: ledger.length + 1,
      templateId,
      itemId: entry.item.itemId,
      difficulty: priced.difficulty,
      levers: priced.levers,
      ...entry.materialisation,
      chosenKey: null,
      correct: null,
    };
    ledger.push(row);
    for (const symbol of entry.item.content.chain) symbolsSeen.add(symbol);
    return { item: { ...entry.item, difficulty: priced.difficulty }, row };
  }

  /**
   * Commit the child's answer to the trial just served, and fold the reveal into the evidence.
   *
   * `chosenKey` is recorded and does not affect the evidence: what the child saw is the machine's
   * output, and the machine produced the same figure whatever they tapped. This is why a replay needs
   * the choices only to reproduce the TARGETING walk, not the materialisation.
   */
  function commit({ chosenKey }) {
    const row = ledger[ledger.length - 1];
    if (row === undefined) throw new Error('nothing has been served yet');
    if (row.chosenKey !== null) throw new Error(`trial ${String(row.trial)} was already committed`);
    const entry = materialised.find((m) => m.template.templateId === row.templateId);
    row.chosenKey = chosenKey;
    row.correct = chosenKey === row.correctKey;

    knowledge = oracle.observe(knowledge, oracleItem(entry), row.correctKey);
    for (const symbol of new Set(entry.item.content.chain)) {
      constraintCount.set(symbol, (constraintCount.get(symbol) ?? 0) + 1);
    }
    evidenceVersion += 1;
    return row;
  }

  return {
    sessionSeed,
    system,
    oracle,
    readingsTotal,
    materialised,
    excluded,
    candidates,
    serve,
    commit,
    ledger,
    get evidenceVersion() {
      return evidenceVersion;
    },
    get surviving() {
      return knowledge.surviving.length;
    },
  };
}

/**
 * The shape the PR #48 oracle's adapter reads.
 *
 * `reviewerOnly.correctKey` is the reveal — what the machine actually pointed at — which is exactly
 * what the screen shows after the child commits, and the only server-side fact the oracle is given.
 */
function oracleItem(entry) {
  return {
    itemId: entry.item.itemId,
    typeCode: entry.item.typeCode,
    difficulty: entry.item.difficulty,
    content: entry.item.content,
    reviewerOnly: { correctKey: entry.item.answer.correctKey },
  };
}

/**
 * Re-run a session from its seed and the child's recorded choices, and hand back the ledger.
 *
 * R7's reconstruction. The inputs are the seed, the template pool, and the (templateId, chosenKey)
 * pairs the session recorded — nothing else. Notably NOT the served options, the keys or the
 * difficulties: reproducing those from the seed alone is the property being asserted, so taking them
 * as input would make the assertion circular.
 */
export function replaySession({ sessionSeed, templates, choices, revealMode = 'outcome' }) {
  const session = openSession({ sessionSeed, templates, revealMode });
  for (const choice of choices) {
    session.serve(choice.templateId);
    session.commit({ chosenKey: choice.chosenKey });
  }
  return session;
}

/**
 * Pick the unserved candidate nearest a target difficulty, ties broken on item id.
 *
 * Not imported from `@gt-selection/exam-engine` on purpose: this module is loadable by a research
 * script with no workspace build, and the rule it needs is one line. The app's serve path uses the
 * engine's own `selectNextNovelServedItem` over the same priced items, and
 * `stage2-materialisation.test.ts` checks the two agree on the pool.
 */
export function nearestCandidate(candidates, target) {
  let best = null;
  for (const candidate of candidates) {
    if (best === null) {
      best = candidate;
      continue;
    }
    const here = Math.abs(candidate.difficulty - target);
    const there = Math.abs(best.difficulty - target);
    if (here < there || (here === there && candidate.item.itemId < best.item.itemId)) {
      best = candidate;
    }
  }
  return best;
}
