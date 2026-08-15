// WHEN EACH THING BECAME LEARNABLE — the cumulative learnability oracle, with the type factored out.
//
// WHAT THIS IS. `FLU-OPCHAIN-01` has an oracle (`stage2-learnability.mjs`) that answers, for one
// block, "given every reveal this child has already seen, what is now uniquely determined, and was
// this trial's answer available at all?". Three more Stage 2 types now exist and each needs the same
// answer. This is that oracle with the type-specific half removed and handed to an ADAPTER.
//
// WHY ONE MODULE AND NOT FOUR. Every one of the four types hides the same KIND of thing: a bijection
// from a set of visible symbols to a set of invisible meanings.
//
//   FLU-OPCHAIN-01    6 badges       -> 6 lattice operators     720 candidate systems
//   SPA-XFORM-01      6 badges       -> 6 lattice operators     720
//   QUANT-GLYPHNUM-01 5 glyphs       -> 5 numeral roles         120
//   VER-MORPHO-01     6 affix forms  -> 6 morpheme meanings     720
//
// Each type already brute-forces that space to prove its key is not recoverable from `content`
// alone. That enumeration answers "given THIS ONE ITEM, which mappings survive?". The question a
// learning block turns on is "given every reveal SO FAR, which mappings survive?" — the same
// enumeration, intersected down the trial sequence. The intersection is identical for all four; only
// "what does one reveal rule out" differs, and that is the whole of the adapter.
//
// THE ADAPTER CONTRACT. Six things, and nothing about learnability:
//
//   primitives          the visible symbols, in a fixed order. These are what "became deducible".
//   values              the hidden meanings. Must be the same length: the system is a bijection.
//   vocabulary          a one-line human label for the pair, for report headers only.
//   primitivesUsedBy    which primitives this item's stimulus lets a reveal speak about.
//   predictedKeys       under one candidate assignment, WHICH ON-SCREEN OPTIONS that assignment
//                       says are correct. Zero (it predicts something not on screen), one (the
//                       normal case), or several (VER-MORPHO's picture->word direction, where a
//                       wrong mapping can make two candidate words denote the same picture).
//   correctKeyOf        the reveal: which option the machine/language actually pointed at.
//   hiddenChainOf       the VALUES an item turns on, for the equated warm-up chooser only.
//
// Everything else below is type-free.
//
// WHY "SURVIVES THE REVEAL" IS DEFINED AS "PREDICTS THE REVEALED KEY". The reference oracle compares
// the figure a mapping produces against the figure the machine made. That is the same test written
// for a type whose reveal happens to be a figure: the revealed figure IS the correct option's
// figure, so "produces the revealed figure" and "predicts the revealed key" pick out the same
// mappings. Stated as the key, it also covers a reveal that is a ratio on a number line and one that
// is "this word, not those three" — neither of which is a function from mapping to stimulus.
//
// CLAIM BOUNDARY, inherited unchanged from the reference and load-bearing. This is an ideal reasoner
// with perfect memory and exhaustive constraint propagation. Every "answerable" is an UPPER BOUND on
// what was available to be known, never a prediction that a child would get it, and nothing here is
// a learning rate. Every bank it runs over is born-synthetic and ungated.

/* ================================================================== *
 * The candidate space
 * ================================================================== */

/** Every ordering of `items`. Exact rather than sampled: the largest space here is 6! = 720. */
export function permutations(items) {
  if (items.length <= 1) return [items.slice()];
  const out = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i], ...tail]);
  }
  return out;
}

/**
 * Build the oracle for one question type.
 *
 * The whole mapping space is enumerated once, and each item's prediction under every mapping is
 * computed once and cached by `itemId`. Both are what make the cumulative form affordable: after
 * that, folding in a reveal is a filter over an integer array and asking what is determined is a
 * scan, so a 30-trial block costs one pass over the pool rather than one enumeration per trial.
 */
export function createOracle(adapter, { revealMode = 'outcome' } = {}) {
  const { primitives, values } = adapter;
  if (revealMode !== 'outcome' && revealMode !== 'option') {
    throw new Error(`revealMode must be outcome|option, got "${revealMode}"`);
  }
  if (primitives.length !== values.length) {
    throw new Error(
      `${adapter.id}: the hidden system must be a bijection, but there are ` +
        `${primitives.length} primitives and ${values.length} values.`,
    );
  }

  const mappings = permutations(values).map((assigned) =>
    Object.fromEntries(primitives.map((primitive, i) => [primitive, assigned[i]])),
  );
  const allIndices = mappings.map((_, i) => i);

  /** itemId -> for each mapping index, the option keys that mapping says are correct. */
  const predictionCache = new Map();
  function predictions(item) {
    const hit = predictionCache.get(item.itemId);
    if (hit) return hit;
    const rows = mappings.map((mapping) => adapter.predictedKeys(item, mapping));
    predictionCache.set(item.itemId, rows);
    return rows;
  }

  /**
   * The response keys this item offers — what a mapping's prediction can be compared against.
   *
   * Read through the adapter, because not every Stage 2 type answers with an option. A tolerance-graded
   * PLACEMENT has no option list; its response space is the finite set of disjoint accepting intervals
   * the tolerance cuts the line into, which is the same kind of object under a different name. An
   * adapter that says nothing keeps the option-list default, so the three keyed types are unaffected.
   */
  const optionKeysOf = (item) =>
    adapter.responseKeysOf ? adapter.responseKeysOf(item) : item.content.options.map((o) => o.key);

  /** Fresh ignorance: every system is still possible. */
  const newKnowledge = () => ({ surviving: allIndices, reveals: 0, contradicted: 0 });

  /**
   * Narrow the surviving set with one reveal.
   *
   * A reveal that eliminates EVERYTHING means the accumulated knowledge was about a different
   * system, which in the `consistent` arm would be a generator bug and in the scrambled control is
   * the entire point. The count is carried rather than swallowed, and the set is rebuilt from the
   * full space so the oracle stays an upper bound instead of becoming vacuously omniscient over an
   * empty one.
   *
   * `revealMode` brackets how much a reveal is assumed to show, and exists because none of the four
   * types has a shipped renderer yet, so nobody has fixed it:
   *
   *   outcome  the child sees WHAT the system produced — the output figure, the true position on the
   *            line, the picture the word denotes. A hypothesis pointing anywhere else is refuted,
   *            including one pointing off the visible slate entirely. This is what the reference
   *            type's oracle assumes and it is the default.
   *   option   the child sees only WHICH OPTION was right. A hypothesis naming a different option is
   *            still refuted, but one whose prediction is not on the slate at all is not, because at
   *            that resolution the reveal did not say where it was wrong. A deliberate lower bound:
   *            no renderer can carry less information than this and still be a reveal.
   *
   * Everything the report calls a headline is quoted under both, so no conclusion rests on a
   * rendering decision that has not been taken.
   */
  function observe(knowledge, item, revealedKey) {
    const rows = predictions(item);
    const survives =
      revealMode === 'outcome'
        ? (index) => rows[index].includes(revealedKey)
        : (index) => rows[index].length === 0 || rows[index].includes(revealedKey);
    const surviving = knowledge.surviving.filter(survives);
    if (surviving.length === 0) {
      return {
        surviving: allIndices,
        reveals: knowledge.reveals + 1,
        contradicted: knowledge.contradicted + 1,
      };
    }
    return { surviving, reveals: knowledge.reveals + 1, contradicted: knowledge.contradicted };
  }

  /**
   * Primitives every surviving system agrees about.
   *
   * Includes determination BY ELIMINATION, which is why the joint space is carried rather than
   * per-primitive candidate sets: pin five of six and the bijection pins the sixth even though it
   * has never appeared in any reveal. A marginal representation cannot see that, and the difference
   * is not small — it is most of the back half of a block.
   */
  function determinedPrimitives(knowledge) {
    const out = {};
    const first = mappings[knowledge.surviving[0]];
    for (const primitive of primitives) {
      const value = first[primitive];
      if (knowledge.surviving.every((index) => mappings[index][primitive] === value)) {
        out[primitive] = value;
      }
    }
    return out;
  }

  /**
   * Which options the reveals so far still allow, and whether they pick one out.
   *
   * `determined` is the question a trace turns on: could this trial have been answered from what had
   * already been shown? `viable` is how many options survive, which is the honest partial answer for
   * a trial that narrowed the field to two without settling it — and, across a block, the
   * distribution that decides whether the ruled-out signal can carry anything correctness cannot.
   */
  function answerability(knowledge, item) {
    const rows = predictions(item);
    const viable = new Set();
    for (const index of knowledge.surviving) for (const key of rows[index]) viable.add(key);
    const options = [...viable].sort();
    return {
      viable: options,
      determined: options.length === 1 ? options[0] : null,
      /** Chance of answering correctly from the reveals alone, guessing among what survives. */
      chanceFromKnowledge: options.length === 0 ? 0 : 1 / options.length,
    };
  }

  /**
   * Whether `content` alone fixes the key — the E-075/E-076 anti-leak attack, restated.
   *
   * This is {@link answerability} against zero reveals, which is its correct definition: a client
   * holds the item and the candidate space and nothing else. When exactly one option survives, the
   * key is recoverable with no induction at all. Deriving it from the same code path as the
   * cumulative trace is deliberate — the leak count and the learnability trace cannot disagree.
   */
  function contentDerivability(item) {
    const { viable } = answerability(newKnowledge(), item);
    return { viableOptions: viable, leaks: viable.length === 1, count: viable.length };
  }

  const oracle = {
    adapter,
    id: adapter.id,
    typeCode: adapter.typeCode,
    revealMode,
    primitives,
    values,
    mappings,
    predictions,
    optionKeysOf,
    newKnowledge,
    observe,
    determinedPrimitives,
    answerability,
    contentDerivability,
    // Convenience wrappers, so a caller holding an oracle never has to pass it back to a free
    // function it would then be free to pass a different oracle to.
    createTracker: (options) => createTracker(oracle, options),
    traceBlock: (options) => traceBlock(oracle, options),
  };
  return oracle;
}

/* ================================================================== *
 * Scoring a choice against what the evidence allowed
 * ================================================================== */

/**
 * Score one choice against the state of knowledge at the moment it was made.
 *
 * Three classes, exhaustive and disjoint, because `viableKeys` is exactly the set of options some
 * surviving system still predicts:
 *
 *   determined   the answer was uniquely pinned by prior reveals and this is it.
 *   consistent   several options were still genuinely possible and this is one of them. Correctness
 *                here is luck; a child who reasoned to the edge of what was knowable and then
 *                guessed has done everything the evidence permitted.
 *   ruledOut     no system consistent with what this child had already been shown produces this
 *                option. They did not fail to guess — they contradicted their own evidence.
 *
 * `ruledOut` splits by WHAT did the ruling out, and the split matters more than the total:
 *
 *   content      no mapping whatsoever produces this option, so it is excluded by the item on
 *                screen and rejecting it needs no memory of any reveal.
 *   reveals      some mapping does produce it, and this child had already seen the reveals that
 *                eliminate every such mapping. THIS is information held and not used.
 *
 * Derived from the row recorded BEFORE the answer, never recomputed afterwards, so a later reveal
 * cannot retroactively make a choice look eliminated.
 */
export function classifyChoice(row, chosenKey) {
  const viable = new Set(row.viableKeys);
  if (viable.has(chosenKey)) {
    return { klass: viable.size === 1 ? 'determined' : 'consistent', among: viable.size, by: null };
  }
  return {
    klass: 'ruledOut',
    among: viable.size,
    by: new Set(row.contentViableKeys).has(chosenKey) ? 'reveals' : 'content',
  };
}

/* ================================================================== *
 * A whole block, incrementally
 * ================================================================== */

/**
 * Accumulate a block's learnability as it is administered.
 *
 * A tracker rather than one batch function because the same numbers have to be available live,
 * before each trial is answered — a caller that recomputed them its own way would be a second
 * implementation free to disagree. `traceBlock` is a thin loop over this.
 *
 * `persistence` decides whether knowledge carries. Under `perTrial` it is discarded before every
 * trial because the generator redrew the system: a reveal from trial 4 constrains nothing about
 * trial 5. That is not an assumption about children, it is what the generator did, and it is why
 * the control is a control.
 */
export function createTracker(oracle, { persistence }) {
  if (persistence !== 'consistent' && persistence !== 'perTrial') {
    throw new Error(`persistence must be consistent|perTrial, got "${persistence}"`);
  }
  const { adapter, primitives } = oracle;

  let carried = oracle.newKnowledge();
  let warmupReveals = 0;
  let warmupDetermined = 0;
  const primitivesShown = new Set();
  const rows = [];
  /** Primitive -> the trial at which it first became determined; 0 means "by the warm-up". */
  const firstDetermined = {};

  /**
   * Fold in an UNSCORED reveal seen before trial 1 — a worked demonstration or warm-up item.
   *
   * These belong in the knowledge state and not in the trial list: they taught, and they were not
   * scored, so counting them as trials would feed them into any rate fitted afterwards.
   */
  function observePrior(item) {
    carried = oracle.observe(carried, item, adapter.correctKeyOf(item));
    for (const primitive of adapter.primitivesUsedBy(item)) primitivesShown.add(primitive);
    warmupReveals += 1;
    if (persistence === 'consistent') {
      for (const primitive of Object.keys(oracle.determinedPrimitives(carried))) {
        if (firstDetermined[primitive] === undefined) firstDetermined[primitive] = 0;
      }
      warmupDetermined = Object.keys(oracle.determinedPrimitives(carried)).length;
    }
  }

  /** What a perfect reasoner could have determined BEFORE this item is answered. */
  function before(item) {
    const knowledge = persistence === 'consistent' ? carried : oracle.newKnowledge();
    const determined = oracle.determinedPrimitives(knowledge);
    const answer = oracle.answerability(knowledge, item);
    const content = oracle.contentDerivability(item);
    const used = adapter.primitivesUsedBy(item);
    const optionKeys = oracle.optionKeysOf(item);
    const ruledOutKeys = optionKeys.filter((key) => !answer.viable.includes(key));

    return {
      trial: rows.length + 1,
      itemId: item.itemId,
      difficulty: item.difficulty,
      /** Primitives of the whole vocabulary pinned before this trial was served. */
      knowablePrimitives: Object.keys(determined).length,
      knowable: Object.keys(determined).length / primitives.length,
      /** The primitives this item constrains, and how many of them were already pinned. */
      usedPrimitives: [...new Set(used)],
      usedKnown: used.filter((primitive) => determined[primitive] !== undefined).length,
      usedCount: used.length,
      /** Primitives this item turns on that had never appeared in any earlier reveal at all. */
      unseenPrimitives: used.filter((primitive) => !primitivesShown.has(primitive)),
      systemsRemaining: knowledge.surviving.length,
      bitsRemaining: Math.log2(knowledge.surviving.length),
      /** THE headline per-trial fact: was this answer derivable from what had been revealed? */
      derivable: answer.determined !== null,
      derivedKey: answer.determined,
      /** How many options the evidence still permits. The distribution of this decides everything. */
      viableFromKnowledge: answer.viable.length,
      chanceFromKnowledge: answer.chanceFromKnowledge,
      /** Derivable from `content` with no reveals at all — a leak, not learning. */
      contentDerivable: content.leaks,
      contentViable: content.count,

      /* The state a choice is judged against, kept on the row so the judgement uses the
         pre-answer knowledge by construction rather than by remembering to. */
      optionKeys,
      viableKeys: answer.viable.slice(),
      contentViableKeys: content.viableOptions.slice(),
      ruledOutKeys,
      /**
       * What a uniform guesser scores on this trial's `ruledOut` class. THE baseline the observed
       * rate has to be read against: how often an option is excluded is a property of how many
       * distractors this item happens to place outside the system's reach, so a raw ruled-out rate
       * mostly measures the item and only secondarily the child.
       */
      ruledOutChance: optionKeys.length === 0 ? 0 : ruledOutKeys.length / optionKeys.length,
      /** Filled by `record`. */
      chosenKey: null,
      correct: null,
      inference: null,
      ruledOutBy: null,
    };
  }

  /**
   * Commit a scored trial: keep its `before` row, classify the choice against it, then fold the
   * reveal into the knowledge — in that order, so the classification cannot see this trial's reveal.
   */
  function record(item, { correct = null, chosenKey = null, precomputed = null } = {}) {
    const row = { ...(precomputed ?? before(item)), correct };
    if (chosenKey !== null) {
      const verdict = classifyChoice(row, chosenKey);
      row.chosenKey = chosenKey;
      row.inference = verdict.klass;
      row.ruledOutBy = verdict.by;
      row.viableAtChoice = verdict.among;
    }
    rows.push(row);
    for (const primitive of adapter.primitivesUsedBy(item)) primitivesShown.add(primitive);
    carried = oracle.observe(carried, item, adapter.correctKeyOf(item));
    if (persistence === 'consistent') {
      for (const primitive of Object.keys(oracle.determinedPrimitives(carried))) {
        // Recorded against the trial whose reveal pinned it, so "became deducible at trial k" means
        // a perfect reasoner could have used it from trial k+1 onward.
        if (firstDetermined[primitive] === undefined) firstDetermined[primitive] = row.trial;
      }
    }
    return row;
  }

  return {
    persistence,
    observePrior,
    before,
    record,
    rows,
    get warmupDetermined() {
      return warmupDetermined;
    },
    get warmupReveals() {
      return warmupReveals;
    },
    get firstDetermined() {
      return { ...firstDetermined };
    },
    summary: () =>
      summarise({
        oracle,
        rows,
        firstDetermined,
        persistence,
        warmupDetermined,
        warmupReveals,
        finalSystems: carried.surviving.length,
        contradictions: carried.contradicted,
      }),
  };
}

/**
 * Batch form: walk a completed block and return the per-trial rows plus the block summary.
 *
 * `trials` is `[{ item, correct?, chosenKey? }]` in served order; `priorReveals` the unscored
 * warm-up, same shape.
 */
export function traceBlock(oracle, { trials, persistence, priorReveals = [] }) {
  const tracker = createTracker(oracle, { persistence });
  for (const reveal of priorReveals) tracker.observePrior(reveal.item ?? reveal);
  for (const trial of trials) {
    tracker.record(trial.item, {
      correct: trial.correct ?? null,
      chosenKey: trial.chosenKey ?? null,
    });
  }
  return { rows: tracker.rows, summary: tracker.summary() };
}

/* ================================================================== *
 * The per-block figures
 * ================================================================== */

/**
 * `unanswerablePrefix` is the honest length of the induction ramp: the leading trials no reasoner
 * could have answered from prior reveals. It is NOT a defect — with nothing revealed, nothing is
 * determinable, and that ramp is the baseline a climb is measured against. `multiIntroductionTrials`
 * IS a defect: one reveal cannot attribute a change between two primitives neither of which has ever
 * been seen, so such a trial is unanswerable AND uninformative, and the sequence chose it rather
 * than the construct requiring it.
 */
function summarise({
  oracle,
  rows,
  firstDetermined,
  persistence,
  warmupDetermined,
  warmupReveals,
  finalSystems,
  contradictions,
}) {
  const n = rows.length;
  const third = Math.max(1, Math.floor(n / 3));
  const shareOf = (slice) =>
    slice.length === 0 ? 0 : slice.filter((r) => r.derivable).length / slice.length;
  const derivable = rows.filter((r) => r.derivable);

  let prefix = 0;
  while (prefix < n && !rows[prefix].derivable) prefix += 1;

  const pinned = Object.keys(firstDetermined).length;
  const maxOptions = rows.reduce((most, r) => Math.max(most, r.optionKeys.length), 0);
  /** Index k holds the number of trials on which exactly k options were still viable. */
  const viableHistogram = new Array(maxOptions + 1).fill(0);
  for (const r of rows) viableHistogram[r.viableFromKnowledge] += 1;

  return {
    typeCode: oracle.typeCode,
    revealMode: oracle.revealMode,
    persistence,
    trials: n,
    primitives: oracle.primitives.length,
    warmupReveals,
    /** Primitives already pinned by the unscored warm-up, before trial 1. */
    warmupDetermined,
    firstDetermined,
    primitivesEverPinned: pinned,
    everPinnedShare: pinned / oracle.primitives.length,
    /**
     * Candidate systems still standing after the last reveal.
     *
     * The residue is what the block could not separate, and its SIZE says what kind of residue it
     * is: three survivors over six primitives is a three-cycle among primitives that only ever
     * appeared in compositions with each other, which is exactly why every trial can be answerable
     * while half the vocabulary stays formally open.
     */
    finalSystems,
    /** Primitives never uniquely pinned — the residue, named rather than just counted. */
    unpinned: oracle.primitives.filter((primitive) => firstDetermined[primitive] === undefined),
    /**
     * Whether every unpinned primitive appeared in EVERY served item.
     *
     * This separates the two reasons a residue exists, and they call for opposite responses. When it
     * holds, the block never served an item containing a proper subset of the residue, so nothing
     * could have separated its members — a coverage property of the sequence, fixable by selection.
     * When it does not, the members were seen apart and still could not be told apart, which is a
     * degeneracy in the VOCABULARY and cannot be fixed by serving different items.
     */
    residueAlwaysCoOccurred:
      rows.length > 0 &&
      Object.keys(firstDetermined).length < oracle.primitives.length &&
      oracle.primitives
        .filter((primitive) => firstDetermined[primitive] === undefined)
        .every((primitive) => rows.every((r) => r.usedPrimitives.includes(primitive))),
    /**
     * Reveals that eliminated everything. Must be zero in the `consistent` arm — the bank holds one
     * system for all of its items, so a contradiction there is a generator bug and not a finding.
     */
    contradictions,
    /** Trial by which the WHOLE vocabulary was pinned, or null if it never was. */
    fullyKnowableAt:
      pinned === oracle.primitives.length ? Math.max(...Object.values(firstDetermined)) : null,
    /** Mean first-deducible trial over the primitives that were ever pinned. */
    meanFirstDetermined:
      pinned === 0
        ? null
        : Object.values(firstDetermined).reduce((a, b) => a + b, 0) / pinned,

    derivableTrials: derivable.length,
    derivableShare: n === 0 ? 0 : derivable.length / n,
    derivableFirstThird: shareOf(rows.slice(0, third)),
    derivableLastThird: shareOf(rows.slice(-third)),
    unanswerablePrefix: prefix,
    /**
     * Trials that showed a primitive for the first time. UNAVOIDABLE and bounded by the vocabulary
     * size: a vocabulary learned inside the block has to be introduced somewhere.
     */
    primitiveIntroductions: rows.filter((r) => r.unseenPrimitives.length > 0).length,
    /** Trials that showed TWO OR MORE for the first time at once — the avoidable defect. */
    multiIntroductionTrials: rows.filter((r) => r.unseenPrimitives.length > 1).length,
    contentDerivableTrials: rows.filter((r) => r.contentDerivable).length,

    /** THE distribution the ruled-out signal lives or dies on. */
    viableHistogram,
    meanViable: n === 0 ? 0 : rows.reduce((sum, r) => sum + r.viableFromKnowledge, 0) / n,
    /** Trials with two or three options left: the only regime where the split is not near-collinear. */
    partiallyDeterminedTrials: rows.filter(
      (r) => r.viableFromKnowledge >= 2 && r.viableFromKnowledge <= 3,
    ).length,

    /**
     * What a responder scores by exploiting only what was available: derivable trials right, the
     * rest at the chance the surviving options allow. The ceiling any honest accuracy sits under.
     */
    availableAccuracy:
      n === 0 ? 0 : rows.reduce((sum, r) => sum + (r.derivable ? 1 : r.chanceFromKnowledge), 0) / n,
    meanKnowable: n === 0 ? 0 : rows.reduce((sum, r) => sum + r.knowable, 0) / n,
    knowableByThird: [rows.slice(0, third), rows.slice(third, n - third), rows.slice(-third)].map(
      (slice) =>
        slice.length === 0 ? 0 : slice.reduce((sum, r) => sum + r.knowable, 0) / slice.length,
    ),

    /** The two halves of what `correct` conflates. */
    correctWhileUndeterminable: rows.filter((r) => r.correct === true && !r.derivable).length,
    missedWhileDeterminable: rows.filter((r) => r.correct === false && r.derivable).length,
    inference: summariseInference(rows),
  };
}

/**
 * The inference-quality signal: how the responder behaved relative to what it had already been told.
 *
 * Every rate is reported next to the rate a uniform guesser would produce on the SAME items, because
 * the number of excluded options is a property of the item: `ruledOutRate` alone would rank banks,
 * not children. The lift is the part about the child, signed so NEGATIVE means information was used.
 */
function summariseInference(rows) {
  const scored = rows.filter((r) => r.inference !== null);
  const rate = (subset, test) =>
    subset.length === 0 ? null : subset.filter(test).length / subset.length;
  const mean = (subset, pick) =>
    subset.length === 0 ? null : subset.reduce((sum, r) => sum + pick(r), 0) / subset.length;
  const isRuledOut = (r) => r.inference === 'ruledOut';

  /** Trials the answer was NOT uniquely determined on — the undiluted slice. */
  const open = scored.filter((r) => !r.derivable);
  const settled = scored.filter((r) => r.derivable);
  /**
   * Trials with two or three options left. On a determined trial "ruled out" is just "wrong", and
   * on a wide-open one there is little to exclude; this is the band where the class split carries
   * something accuracy does not, and it is reported separately because on some types it is empty.
   */
  const partial = scored.filter(
    (r) => r.viableFromKnowledge >= 2 && r.viableFromKnowledge <= 3,
  );
  const half = Math.floor(scored.length / 2);
  const observedRuledOut = rate(scored, isRuledOut);
  const chanceRuledOut = mean(scored, (r) => r.ruledOutChance);
  const openObserved = rate(open, isRuledOut);
  const openChance = mean(open, (r) => r.ruledOutChance);
  const partialObserved = rate(partial, isRuledOut);
  const partialChance = mean(partial, (r) => r.ruledOutChance);

  return {
    scored: scored.length,
    determined: scored.filter((r) => r.inference === 'determined').length,
    consistent: scored.filter((r) => r.inference === 'consistent').length,
    ruledOut: scored.filter(isRuledOut).length,
    ruledOutByReveals: scored.filter((r) => r.ruledOutBy === 'reveals').length,
    ruledOutByContent: scored.filter((r) => r.ruledOutBy === 'content').length,

    ruledOutRate: observedRuledOut,
    ruledOutChance: chanceRuledOut,
    ruledOutLift:
      observedRuledOut === null || chanceRuledOut === null ? null : observedRuledOut - chanceRuledOut,

    openTrials: open.length,
    openRuledOutRate: openObserved,
    openRuledOutChance: openChance,
    openRuledOutLift: openObserved === null || openChance === null ? null : openObserved - openChance,
    openConsistentRate: rate(open, (r) => r.inference === 'consistent'),

    partialTrials: partial.length,
    partialRuledOutRate: partialObserved,
    partialRuledOutChance: partialChance,
    partialRuledOutLift:
      partialObserved === null || partialChance === null ? null : partialObserved - partialChance,

    determinedTaken: rate(settled, (r) => r.inference === 'determined'),
    ruledOutFirstHalf: rate(scored.slice(0, half), isRuledOut),
    ruledOutSecondHalf: rate(scored.slice(half), isRuledOut),
  };
}
