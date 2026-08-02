// The Stage 2 block loop for any adapted type, with no DOM and no I/O in the loop itself.
//
// WHAT IT IS FOR. The learnability oracle answers a question about a SEQUENCE of reveals, so it
// needs a sequence, and the sequence has to be the one the product would actually serve — a block
// assembled by a different rule would report the answerability of a bank nobody administers.
//
// THE REAL CALLS, and nothing else:
//
//   nextTargetTheta             @gt-selection/exam-scoring     what difficulty to aim at
//   selectNextNovelServedItem   @gt-selection/exam-engine      which unseen item that gets you
//   hashUnit                    @gt-selection/exam-engine      the deterministic draw a seed replays
//
// There is no arithmetic on `difficulty` here beyond comparing a requested target against the top of
// the pool, which is how a trial knows the rule asked for more than the bank holds. Nothing
// recomputes a target, an ability or a rate.
//
// WHY NOT `phase2.novelBlockPool`. That function filters the pool to the ONE configured learning
// block type, which is `FLU-OPCHAIN-01`. Three of the four types here are not it and not even in its
// area, so calling it would return an empty pool. The pool is therefore assembled from the type's
// own bank file — which is what `novelBlockPool` would return for a type that were configured — and
// the two selection calls that decide the sequence are the product's own, unmodified.
//
// TWO ARMS, ALWAYS. `banks/<CODE>.jsonl` holds the `consistent` arm, in which one hidden system
// holds for the whole bank; `control-banks/<CODE>.perTrial.jsonl` holds the scrambled control, in
// which the system is redrawn every item. The control is handled by CONSTRUCTION rather than by
// modelling: the tracker discards knowledge before each trial because the generator redrew the
// system, so nothing is ever determined from prior reveals in it. That is what makes it a control.

import { hashUnit, selectNextNovelServedItem } from '../../packages/exam-engine/src/index.ts';
import { nextTargetTheta } from '../../packages/exam-scoring/src/index.ts';

export { loadArm, loadArms } from './stage2-learnability-banks.mjs';

/**
 * How far above the settled standing the block aims, and how long it runs.
 *
 * Taken from `apps/web/src/lib/exam/phase2.ts` rather than chosen here — those are the product's
 * numbers and a local copy would be free to drift from them.
 */
export const TARGET_OFFSET = 1;
export const BLOCK_LENGTH = 30;

/* ================================================================== *
 * The warm-up
 * ================================================================== */

/**
 * Pick `count` unscored worked demonstrations: the easiest items whose HIDDEN chains are disjoint.
 *
 * Chosen by the hidden chain and never by the visible one. That is what keeps the two arms equated —
 * hidden chains are identical item-for-item across an arm pair by construction, visible chains are
 * not, so selecting on the visible ones would hand the two arms different demonstrations and
 * confound the contrast with the warm-up.
 *
 * Disjointness is what keeps the cost down: a depth-1 demonstration pins its primitive outright, and
 * if the depth-2 demonstration reused it, its partner would be pinned by subtraction. With disjoint
 * chains the later reveals constrain their sets jointly without settling any member.
 *
 * DEFAULT ZERO for the three new types. The reference type runs three demonstrations because that
 * count was measured for it (`stage2-block-run.js`); no equivalent decision has been taken for these
 * three, and inventing one here would be inventing product design inside a measurement. The knob
 * exists so the warm-up's effect can be REPORTED as a sensitivity, and so the reference type can be
 * reproduced at its own setting.
 */
export function chooseWarmup(pool, adapter, count) {
  if (count <= 0) return [];
  const byEase = pool
    .slice()
    .sort((a, b) => a.difficulty - b.difficulty || (a.itemId < b.itemId ? -1 : 1));
  const chosen = [];
  const used = new Set();
  for (let depth = 1; depth <= count; depth += 1) {
    const found = byEase.find((item) => {
      if (chosen.includes(item)) return false;
      const chain = adapter.hiddenChainOf({ answer: item.answerForWarmup });
      if (!Array.isArray(chain)) return false;
      if (new Set(chain).size !== depth) return false;
      return chain.every((value) => !used.has(value));
    });
    if (!found) continue;
    for (const value of adapter.hiddenChainOf({ answer: found.answerForWarmup })) used.add(value);
    chosen.push(found);
  }
  return chosen;
}

/* ================================================================== *
 * Responders
 * ================================================================== */

/** Uniform choice among the options, learning nothing, ever — the contamination-floor responder. */
export function guessingResponder() {
  return {
    id: 'guesses',
    pick: ({ item, unit }) => {
      const { options } = item.content;
      return options[Math.min(options.length - 1, Math.floor(unit * options.length))].key;
    },
    observe: () => ({ reset: false }),
    state: () => ({ resets: 0, pinned: 0 }),
  };
}

/**
 * A model LEARNER: induces the mapping from reveals it has seen, and no better than a child could.
 *
 * DELIBERATELY WEAKER THAN THE ORACLE, and the gap is the point. It carries a MARGINAL memory — a
 * candidate set per primitive — rather than the joint set of surviving bijections. A marginal
 * representation cannot do determination by elimination and cannot represent "these two are one of
 * these two ways round", so it sometimes selects an option its own reveals had already excluded.
 * That is what makes the ruled-out class non-empty for anything except a guesser, and therefore what
 * makes the signal measurable at all. An oracle-backed responder would score zero ruled-out by
 * construction and would only ever be measuring the oracle.
 *
 * This is the generalisation of `stage2-inspectors/opchain.js`'s `newMemory`/`respond`/`learn`, with
 * badges and operators replaced by the adapter's primitives and values.
 */
export function inductionResponder(adapter, { assignmentCap = 4096 } = {}) {
  const candidates = new Map();
  let resets = 0;

  const poolFor = (primitive) => {
    if (!candidates.has(primitive)) candidates.set(primitive, new Set(adapter.values));
    return candidates.get(primitive);
  };

  /** Every injective assignment to this item's primitives the memory still permits. */
  function assignments(primitives, useAll) {
    const pools = primitives.map((primitive) =>
      useAll ? adapter.values.slice() : [...poolFor(primitive)],
    );
    const out = [];
    const walk = (depth, picked) => {
      if (out.length > assignmentCap) return;
      if (depth === primitives.length) {
        out.push({ ...picked });
        return;
      }
      for (const value of pools[depth]) {
        // The system is a bijection, so an assignment that gives two primitives the same value
        // cannot be it.
        if (Object.values(picked).includes(value)) continue;
        picked[primitives[depth]] = value;
        walk(depth + 1, picked);
        delete picked[primitives[depth]];
      }
    };
    walk(0, {});
    return out;
  }

  return {
    id: 'induces',
    pick: ({ item, unit }) => {
      const used = [...new Set(adapter.primitivesUsedBy(item))];
      const votes = new Map();
      for (const assignment of assignments(used, false)) {
        for (const key of adapter.predictedKeys(item, assignment)) {
          votes.set(key, (votes.get(key) ?? 0) + 1);
        }
      }
      const { options } = item.content;
      if (votes.size === 0) {
        return options[Math.min(options.length - 1, Math.floor(unit * options.length))].key;
      }
      const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      const top = ranked[0][1];
      const tied = ranked.filter(([, n]) => n === top);
      return tied[Math.min(tied.length - 1, Math.floor(unit * tied.length))][0];
    },

    /**
     * Narrow the memory with the reveal.
     *
     * If no permitted assignment explains it, the memory about these primitives must be wrong, so it
     * is thrown away for them and rebuilt from the full value set. That reset is the observable
     * signature of the scrambled arm: knowledge that keeps being contradicted.
     */
    observe: ({ item, correctKey }) => {
      const used = [...new Set(adapter.primitivesUsedBy(item))];
      const explains = (assignment) => adapter.predictedKeys(item, assignment).includes(correctKey);
      let consistent = assignments(used, false).filter(explains);
      let reset = false;
      if (consistent.length === 0) {
        reset = true;
        resets += 1;
        for (const primitive of used) candidates.set(primitive, new Set(adapter.values));
        consistent = assignments(used, true).filter(explains);
      }
      if (consistent.length === 0) return { reset };
      for (const primitive of used) {
        const survivors = new Set(consistent.map((assignment) => assignment[primitive]));
        const before = poolFor(primitive);
        const next = new Set([...before].filter((value) => survivors.has(value)));
        candidates.set(primitive, next.size > 0 ? next : survivors);
      }
      return { reset };
    },

    state: () => ({
      resets,
      pinned: [...candidates.values()].filter((set) => set.size === 1).length,
    }),
  };
}

export const RESPONDERS = {
  guesses: () => guessingResponder(),
  induces: (adapter) => inductionResponder(adapter),
};

/* ================================================================== *
 * One block
 * ================================================================== */

/**
 * Administer one block and return the run.
 *
 * The order inside a trial is the order the child experiences and the order the trace depends on:
 * the oracle's `before` row is computed when the item is served, the responder answers, the choice
 * is classified against that row, and only then is the reveal folded into the knowledge. Any other
 * order lets a trial's own reveal decide whether that trial was answerable.
 */
export function runBlock({
  oracle,
  pool: fullPool,
  arm,
  standing,
  seed,
  length = BLOCK_LENGTH,
  responderId = 'induces',
  warmupCount = 0,
}) {
  const { adapter } = oracle;
  const responder = RESPONDERS[responderId](adapter);
  const warmup = chooseWarmup(fullPool, adapter, warmupCount);
  // The demonstrations are spent: a scored trial on an item the child has been walked through would
  // measure recall of that item, which is the one thing the block forbids.
  const warmupIds = new Set(warmup.map((item) => item.itemId));
  const pool = fullPool.filter((item) => !warmupIds.has(item.itemId));
  const poolMax = pool.length === 0 ? 0 : Math.max(...pool.map((item) => item.difficulty));

  const tracker = oracle.createTracker({ persistence: arm });
  for (const item of warmup) {
    tracker.observePrior(item);
    responder.observe({ item, correctKey: adapter.correctKeyOf(item) });
  }

  const served = [];
  const rows = [];
  let clamped = 0;
  let exhausted = false;

  while (served.length < length) {
    const trials = served.map((s, index) => ({
      difficulty: s.difficulty,
      score: s.score,
      trialIndex: index,
    }));
    const target = nextTargetTheta(trials, {
      standingEstimate: standing,
      targetOffset: TARGET_OFFSET,
    });
    const item = selectNextNovelServedItem(
      pool,
      served.map((s) => s.itemId),
      target,
      seed,
    );
    if (item === null) {
      // A block that runs out of items is a reportable condition, not an error to swallow.
      exhausted = true;
      break;
    }
    if (target > poolMax - 1e-9) clamped += 1;

    const before = tracker.before(item);
    const unit = hashUnit(seed, `${arm}:${served.length}:${item.itemId}`);
    const chosenKey = responder.pick({ item, unit });
    const correctKey = adapter.correctKeyOf(item);
    const correct = chosenKey === correctKey;

    responder.observe({ item, correctKey, correct });
    const row = tracker.record(item, { correct, chosenKey, precomputed: before });

    served.push({ itemId: item.itemId, difficulty: item.difficulty, score: correct ? 1 : 0 });
    rows.push({ ...row, target, served: item.difficulty });
  }

  const summary = tracker.summary();
  const memory = responder.state();
  const n = rows.length;
  const third = Math.max(1, Math.floor(n / 3));
  const mean = (xs) => (xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length);

  return {
    typeCode: oracle.typeCode,
    arm,
    standing,
    seed,
    responderId,
    warmupUsed: warmup.length,
    warmupRequested: warmupCount,
    trials: n,
    exhausted,
    accuracy: mean(rows.map((r) => (r.correct ? 1 : 0))),
    meanServed: mean(rows.map((r) => r.served)),
    /** §4.1.1's manipulation-check observable: mean served difficulty over the last third. */
    lateServed: mean(rows.slice(-third).map((r) => r.served)),
    clampedShare: n === 0 ? 0 : clamped / n,
    resets: memory.resets,
    rows,
    learnability: summary,
  };
}
