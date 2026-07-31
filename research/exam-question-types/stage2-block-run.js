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
// or an ability — search this file for `Math.exp` and for arithmetic on `difficulty`.

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
 * Set up a block against one arm's bank.
 *
 * `bank.served` is the shape the product ships (no answer key); `bank.reviewerOnly` is the review
 * window's separate, never-shipped side table. Keeping them apart is what stops the loop from
 * accidentally selecting on something the browser would not have.
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
}) {
  const pool = engine.novelBlockPool(bank.served, seenItemIds);
  return {
    engine,
    bank,
    arm,
    standing,
    seed,
    length,
    responder,
    pool,
    canRun: engine.blockCanRun(pool, seenItemIds, length),
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
  const { item, target, projecting } = run.current;
  const meta = metaFor(run, item.itemId);
  const correct = key === meta.correctKey;
  const correctFigure = item.content.options.find((o) => o.key === meta.correctKey)?.figure ?? null;

  const learned = run.responder.observe({ item, correctFigure, correct, run }) ?? { reset: false };

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
  };
  run.rows.push(row);
  run.pending = { key, correct, correctFigure, meta, item };
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
  return {
    arm: run.arm,
    responder: run.responder.id,
    standing: run.standing,
    seed: run.seed,
    length: run.length,
    trials: rows.length,
    accuracy: share(rows),
    firstThird: share(rows.slice(0, size)),
    lastThird: share(rows.slice(-size)),
    meanServed: rows.reduce((sum, r) => sum + r.served, 0) / rows.length,
    lastServed: rows[rows.length - 1].served,
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
