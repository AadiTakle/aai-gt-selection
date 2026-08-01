// The Stage 2 block loop, with no DOM and no I/O in it.
//
// WHY THIS IS ITS OWN FILE. `stage2-review.html` cannot be driven headlessly here (no browser is
// installed), so any observation about the two arms would otherwise have to come from a separate
// script that re-walked the same four calls — a second copy of the loop, quietly free to disagree
// with the page about what it is showing. Instead the loop lives here, the page imports it, and
// `stage2-block-probe.mts` imports the same functions. A number in a report and the same number in
// the window come from one implementation by construction.
//
// The four real calls this loop makes, and nothing else:
//
//   engine.toLearningTrials        apps/web/src/lib/exam/phase2.ts
//   engine.nextBlockTarget         -> nextTargetTheta        @gt-selection/exam-scoring
//   engine.nextBlockItem           -> selectNextNovelServedItem  @gt-selection/exam-engine
//   engine.estimateLearningCurve   @gt-selection/exam-scoring
//   engine.summariseLearningBlock  apps/web/src/lib/exam/phase2.ts (on finish)
//
// `engine` is injected rather than imported because the browser loads the compiled emit under
// `stage2-build/` through an import map and the probe loads the TypeScript sources directly. Same
// source files either way; only the loader differs. Nothing here recomputes a target, a difficulty
// or an ability: search this file for `Math.exp`. The only arithmetic on `difficulty` is comparing a
// requested target against the top of the pool, which is how a trial knows the rule asked for more
// than exists.
//
// It also carries the LEARNABILITY tracker (`stage2-learnability.mjs`, injected the same way), so
// every trial records what a perfect reasoner could have determined from the reveals shown so far —
// before the child answers, never after.

/**
 * A responder is anything that can pick an option key and (optionally) watch the reveal.
 *
 * `unit` is a deterministic draw in [0, 1) from the engine's own hash, so a seed replays exactly.
 */

/** Uniform choice among the options, learning nothing, ever — the contamination-floor responder. */
export function guessingResponder() {
  return {
    id: 'guesses',
    pick: ({ item, unit }) => {
      const { options } = item.content;
      return options[Math.min(options.length - 1, Math.floor(unit * options.length))].key;
    },
    observe: () => ({ reset: false }),
    state: () => ({ resets: 0, pinned: null }),
  };
}

/**
 * The inspector's model learner: induces the badge-to-operator mapping from reveals it has seen.
 *
 * A model of a LEARNER, not of the fit and not of the selection rule. Its knowledge is worthless in
 * the scrambled arm by construction, which is the only reason the two arms can come apart at all
 * under simulation — the repository's existing simulated responder reads `difficulty` and nothing
 * else, so for it the two banks are the same bank (`pnpm exam:arm-equivalence`).
 */
export function inductionResponder(inspector) {
  const memory = inspector.newMemory();
  return {
    id: 'induces',
    pick: ({ item, unit }) => inspector.respond(item, memory, unit).key,
    observe: ({ item, correctFigure }) => inspector.learn(item, correctFigure, memory),
    state: () => {
      const snapshot = inspector.memoryState(memory);
      return { resets: snapshot.resets, pinned: snapshot.pinned.length };
    },
  };
}

/** A human clicking. `pick` is never called; the caller supplies the key. */
export function manualResponder() {
  return {
    id: 'you',
    pick: () => null,
    observe: () => ({ reset: false }),
    state: () => ({ resets: null, pinned: null }),
  };
}

/**
 * How many unscored worked demonstrations open the block, before trial 1.
 *
 * THREE, and the number is measured rather than chosen. Two problems are solved by the same device.
 *
 * FIRST, TASK VERSUS SYSTEM. The first version tangled them: a child met a figure, a row of
 * unexplained symbols and five candidate outputs, and had to work out what was even being asked.
 * Trials spent on that are construct-irrelevant variance landing exactly where the fit is most
 * sensitive to it — the opening trials, which carry the `theta0` anchor the whole climb is measured
 * from. A worked example is the design's own answer (§1.7, Sweller & Cooper 1985: novices need the
 * system demonstrated), and depths 1, 2 and 3 make the task grammar self-evident by showing it:
 *
 *   one badge     the figure changes in ONE way        -> "badges do something to the figure"
 *   two badges    two changes                          -> "several badges act, one after another"
 *   three badges  three changes                        -> "however many badges there are, all act"
 *
 * SECOND, ANSWERABILITY. Depths 1 + 2 + 3 with DISJOINT operator chains exercise all six operators,
 * so no scored trial can ever turn on a badge the child has never once been shown. Measured over six
 * seeds at each of seven standings, `multiIntroductionTrials` — trials showing two brand-new badges at
 * once, which no single reveal can attribute and which are therefore unanswerable AND uninformative:
 *
 *   demonstrations   0      1      2      3
 *   2+ introductions 1.0-2.0  1.0-2.0  0.3-1.0  0.00   <- zero at every standing
 *   badges pinned    0/6    1/6    1/6    1/6
 *   1st-third answerable  68-90%  80-92%  83-95%  85-100%
 *
 * The cost stays at ONE badge of six because the chains are disjoint (see {@link chooseWarmup}): only
 * the depth-1 demonstration pins a badge outright, and the depth-2 and depth-3 reveals constrain their
 * operator sets jointly without settling any individual member. So three demonstrations buy the whole
 * avoidable-unanswerability problem for a sixth of the vocabulary.
 *
 * WHAT IS DELIBERATELY NOT REMOVED. The leading run of trials that are unanswerable because nothing
 * has been revealed yet stays, at 0-1 trials. That ramp is not a defect: it is the baseline the climb
 * is measured from, and it is half of what a learning rate is — the gap between when a thing became
 * knowable and when the child knew it. Removing it would delete the quantity.
 *
 * FIXED COUNT, NEVER PERFORMANCE-CONTINGENT. §1.7 fades worked examples on a fixed schedule precisely
 * so `lambda` stays comparable between children; a criterion-based warm-up would give slower children
 * more exposure and fold their own performance into their own baseline.
 */
export const WARMUP_DEMONSTRATIONS = 3;

/**
 * Pick the worked demonstrations: the easiest items showing depth 1, then depth 2, then depth 3.
 *
 * Chosen by the OPERATOR chain, never by the badge chain. That is what keeps the two arms equated:
 * operator chains are identical item-for-item across the pair by construction, badge chains are not,
 * so selecting on badges would hand the two arms different demonstrations and confound the contrast
 * with the warm-up. In the product this choice is the server's — it is the only party that knows the
 * operator chain — which is why it reads `reviewerOnly` here rather than `content`.
 *
 * THE CHAINS ARE FORCED DISJOINT, and that is what keeps the cost down. A depth-1 demonstration pins
 * its badge outright: one badge, one visible change, nothing else it could be. If the depth-2
 * demonstration then reused that badge, its partner would be pinned too by subtraction, and two
 * demonstrations would hand over a third of the vocabulary. With disjoint chains the depth-2 reveal
 * constrains its pair jointly without settling either, so the warm-up teaches the task grammar while
 * giving away as little of the system as the demonstration can. Measured, not assumed: the
 * learnability trace reports `warmupDetermined`.
 */
export function chooseWarmup(bank, pool, count = WARMUP_DEMONSTRATIONS) {
  const byEase = pool
    .slice()
    .sort((a, b) => a.difficulty - b.difficulty || (a.itemId < b.itemId ? -1 : 1));
  const chosen = [];
  const usedOps = new Set();
  for (let depth = 1; depth <= count; depth += 1) {
    const found = byEase.find((item) => {
      const chain = bank.reviewerOnly[item.itemId]?.operatorChain ?? null;
      if (chain === null || chain.length !== depth) return false;
      return chain.every((op) => !usedOps.has(op));
    });
    if (!found) continue;
    for (const op of bank.reviewerOnly[found.itemId].operatorChain) usedOps.add(op);
    chosen.push(found);
  }
  return chosen;
}

/** The figure the machine makes for an item, from the reviewer-only key. */
function correctFigureOf(bank, item) {
  const meta = bank.reviewerOnly[item.itemId] ?? null;
  return item.content.options.find((o) => o.key === meta?.correctKey)?.figure ?? null;
}

/**
 * Set up a block against one arm's bank.
 *
 * `bank.served` is the shape the product ships (no answer key); `bank.reviewerOnly` is the review
 * window's separate, never-shipped side table. Keeping them apart is what stops the loop from
 * accidentally selecting on something the browser would not have.
 *
 * `learnability` is the oracle module. Passing it in rather than importing it keeps this file free of
 * any opinion about what "knowable" means, and lets a second Stage 2 type supply its own.
 */
export function createRun({
  engine,
  bank,
  arm,
  standing,
  seed,
  length,
  seenItemIds = [],
  responder,
  learnability = null,
  warmupCount = WARMUP_DEMONSTRATIONS,
}) {
  const wholePool = engine.novelBlockPool(bank.served, seenItemIds);
  const warmup = warmupCount > 0 ? chooseWarmup(bank, wholePool, warmupCount) : [];
  // The demonstrations are spent: a scored trial on an item the child has already been walked
  // through would measure recall of that item, which is the one thing the block forbids.
  const warmupIds = new Set(warmup.map((item) => item.itemId));
  const pool = wholePool.filter((item) => !warmupIds.has(item.itemId));

  const tracker = learnability ? learnability.createTracker({ persistence: arm }) : null;
  const warmupReveals = warmup.map((item) => ({
    item,
    revealedFigure: correctFigureOf(bank, item),
    meta: bank.reviewerOnly[item.itemId] ?? null,
  }));
  for (const reveal of warmupReveals) {
    // The warm-up teaches, so its reveals are real evidence and belong in the knowledge state. They
    // are NOT trials: they are unscored, and scoring them would put them into `lambda`.
    if (tracker) tracker.observePrior(reveal.item, reveal.revealedFigure);
    if (responder.observe) responder.observe({ item: reveal.item, correctFigure: reveal.revealedFigure, correct: null });
  }

  return {
    engine,
    bank,
    arm,
    standing,
    seed,
    length,
    responder,
    pool,
    tracker,
    warmup: warmupReveals,
    canRun: engine.blockCanRun(pool, seenItemIds, length),
    /** Top of the pool, so a trial can say whether the targeting rule asked for more than exists. */
    poolMax: pool.length === 0 ? 0 : Math.max(...pool.map((item) => item.difficulty)),
    served: [],
    rows: [],
    current: null,
    pending: null,
    exhausted: false,
    finished: false,
    readout: null,
    finalFit: null,
  };
}

const metaFor = (run, itemId) => run.bank.reviewerOnly[itemId] ?? null;

/** Ask the real targeting rule what to aim at, then the real selection rule what that gets you. */
export function beginTrial(run) {
  if (run.served.length >= run.length) {
    run.current = null;
    return null;
  }
  const trials = run.engine.toLearningTrials(run.served);
  const target = run.engine.nextBlockTarget(trials, run.standing);
  const item = run.engine.nextBlockItem(
    run.pool,
    run.served.map((s) => s.itemId),
    target,
    run.seed,
  );
  if (item === null) {
    // A block that runs out of items is a reportable condition, not an error to swallow: the rate
    // then rests on fewer trials than the design assumed, and at these lengths that is most of it.
    run.exhausted = true;
    run.current = null;
    return null;
  }
  run.current = {
    item,
    target,
    projecting: trials.length >= run.engine.MIN_TRIALS_FOR_PROJECTION,
    // Computed BEFORE the child answers, because that is the question: given only what has already
    // been revealed, was this answer available to be worked out at all?
    learn: run.tracker ? run.tracker.before(item) : null,
    // The rule asked for more than the bank holds, so the item served is whatever was left at the
    // top and the difficulty walk has stopped carrying information about this child.
    clamped: target > run.poolMax - 1e-9,
  };
  run.pending = null;
  return run.current;
}

/** Deterministic draw for the auto-responders, from the engine's hash so a seed replays exactly. */
export function unitFor(run, itemId) {
  return run.engine.hashUnit(run.seed, `${run.arm}:${run.served.length}:${itemId}`);
}

/** What an auto-responder would answer to the item on screen. */
export function autoKey(run) {
  const { item } = run.current;
  return run.responder.pick({ item, run, unit: unitFor(run, item.itemId) });
}

/**
 * Commit an answer, show the reveal, and re-fit.
 *
 * The reveal is not a courtesy: seeing what the machine produced is the only teaching signal in the
 * design, so a responder that never sees it cannot induce anything and the consistent arm would be
 * indistinguishable from its own control for a reason that has nothing to do with the bank.
 */
export function submitAnswer(run, key) {
  const { item, target, projecting, learn, clamped } = run.current;
  const meta = metaFor(run, item.itemId);
  const correct = key === meta.correctKey;
  const correctFigure = item.content.options.find((o) => o.key === meta.correctKey)?.figure ?? null;

  const learned = run.responder.observe({ item, correctFigure, correct, run }) ?? { reset: false };
  // Folded in AFTER the responder has answered, with the `before` row computed at `beginTrial`, so
  // the recorded learnability is what was available going in and never contaminated by this reveal.
  const learnRow = run.tracker
    ? run.tracker.record(item, correctFigure, { correct, chosenKey: key, precomputed: learn })
    : null;

  const before = run.rows.length > 0 ? run.rows[run.rows.length - 1].fit : null;
  run.served.push({ itemId: item.itemId, difficulty: item.difficulty, score: correct ? 1 : 0 });

  const trials = run.engine.toLearningTrials(run.served);
  // Anchored on the standing estimate, because that is exactly how `nextBlockTarget` fits it
  // internally. The trace therefore shows the fit that is steering the block, not a second one.
  const fit = run.engine.estimateLearningCurve(trials, { priorTheta0Mean: run.standing });
  const memory = run.responder.state();

  const row = {
    index: run.served.length,
    target,
    served: item.difficulty,
    itemId: item.itemId,
    meta,
    answered: key,
    correct,
    fit,
    before,
    projecting,
    reset: learned.reset === true,
    pinned: memory.pinned,
    learn: learnRow,
    clamped,
    /**
     * Exactly what the child was shown, for the persistent record on their screen. Carried on the row
     * rather than looked up from the bank later, so the record cannot show anything the child was not
     * actually shown — and in particular can never carry the mapping.
     */
    revealed: { input: item.content.input, chain: item.content.chain, output: correctFigure },
  };
  run.rows.push(row);
  // `row` carried on the reveal so the window can show the reviewer how this choice scored against the
  // evidence without recomputing it — a second computation there could disagree with the trace.
  run.pending = { key, correct, correctFigure, meta, item, row };
  return row;
}

/** Move past the reveal to the next trial, finishing the block when there is none. */
export function advance(run) {
  beginTrial(run);
  if (run.current === null) finish(run);
  return run.current;
}

export function finish(run) {
  if (run.finished) return run;
  run.finished = true;
  const trials = run.engine.toLearningTrials(run.served);
  // No `reference` argument, deliberately: there is no validated distribution of learning rates to
  // band against, so the app returns `indeterminate` and the window shows exactly that.
  run.readout = run.engine.summariseLearningBlock(trials, undefined, run.length);
  run.finalFit = run.engine.estimateLearningCurve(trials);
  return run;
}

/** Play a whole block with an auto-responder. */
export function playToEnd(run) {
  if (!run.canRun) return run;
  if (run.current === null && run.rows.length === 0) beginTrial(run);
  let guard = 0;
  while (run.current !== null && guard < 1000) {
    submitAnswer(run, autoKey(run));
    advance(run);
    guard += 1;
  }
  finish(run);
  return run;
}

/** Everything the comparison panel and the probe read off a completed run. */
export function summariseRun(run) {
  const rows = run.rows;
  if (rows.length === 0) return null;
  const size = Math.max(1, Math.floor(rows.length / 3));
  const share = (slice) => slice.reduce((sum, r) => sum + (r.correct ? 1 : 0), 0) / slice.length;
  const fit = run.finalFit ?? rows[rows.length - 1].fit;
  const half = 1.96 * fit.lambdaSe;
  const memory = run.responder.state();
  const lastThirdRows = rows.slice(-size);
  const clamped = rows.filter((r) => r.clamped).length;
  return {
    arm: run.arm,
    responder: run.responder.id,
    standing: run.standing,
    seed: run.seed,
    length: run.length,
    trials: rows.length,
    accuracy: share(rows),
    firstThird: share(rows.slice(0, size)),
    lastThird: share(lastThirdRows),
    meanServed: rows.reduce((sum, r) => sum + r.served, 0) / rows.length,
    lastServed: rows[rows.length - 1].served,
    /**
     * §4.1.1's manipulation-check observable: mean served difficulty over the last third. It must be
     * LOWER in the scrambled arm; accuracy must not be expected to separate, because the targeting
     * rule holds accuracy near p = 0.5 by construction.
     */
    lateServed: lastThirdRows.reduce((sum, r) => sum + r.served, 0) / lastThirdRows.length,
    /**
     * Trials where the rule asked for a difficulty the pool does not hold. On those the served
     * difficulty is whatever was left at the top, so it is no longer a function of this child — and
     * §4.1.1 says a run whose served difficulty cannot separate carries no interpretable contrast.
     */
    clampedTrials: clamped,
    clampedShare: clamped / rows.length,
    learnability: run.tracker ? run.tracker.summary() : null,
    theta0: fit.theta0,
    lambda: fit.lambda,
    lambdaSe: fit.lambdaSe,
    // `summariseLearningBlock` reports NO lambda when the fit did not converge. The diagnostic
    // value is still carried here so the two arms stay comparable, but a reader has to be able to
    // see which of the two the app would actually have declined to report.
    converged: fit.converged,
    lo: fit.lambda - half,
    hi: fit.lambda + half,
    excludesZero: fit.lambda - half > 0 || fit.lambda + half < 0,
    band: run.readout?.band ?? null,
    resets: memory.resets,
    pinned: memory.pinned,
    exhausted: run.exhausted,
  };
}
