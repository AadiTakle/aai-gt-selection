// WHEN DID EACH THING BECOME LEARNABLE — the learnability oracle for FLU-OPCHAIN-01.
//
// THE PROBLEM THIS SOLVES. A child who answers wrong on trial 5 because the operator the item turns
// on had not yet been shown to them has not failed to learn. They were asked a question that no
// amount of reasoning could have answered, and scoring it as a miss puts measurement error straight
// into `lambda`. `estimateLearningCurve` sees only the second half of the construct — when the child
// knew a thing — and never the first half, when that thing became knowable. The honest statement of
// what a learning block measures is the GAP between the two, and this module computes the first half.
//
// WHAT IT IS, PRECISELY. An ideal reasoner with perfect memory and exhaustive constraint
// propagation, given exactly the reveals the child was given and nothing else. The hidden system is
// a bijection from six badges to six operators, so there are 6! = 720 candidate systems; every
// reveal (input figure, badge chain, the figure the machine made) eliminates the ones that would
// have produced a different figure. Everything below is a question about the surviving set:
//
//   determined badge      every surviving system agrees on what this badge does. Note this includes
//                         determination BY ELIMINATION: pin five badges and the bijection pins the
//                         sixth, even if it has never appeared in a chain.
//   determined answer     every surviving system points at the same option on screen. Strictly
//                         weaker than pinning the badges in the chain — collisions in D4 mean
//                         several systems can agree on the output while disagreeing on the badges.
//                         "Determinable from the reveals so far" is the weaker one, so it is the one
//                         used.
//   knowable fraction     determined badges / 6, and log2 of the surviving count as the bits view.
//
// AND IT SCORES THE CHILD'S CHOICE AGAINST THAT SET, which is a different construct from
// correctness. On a trial nobody could answer, being right is luck; but selecting an option that the
// child's OWN earlier reveals had already eliminated is not luck, it is information held and not
// used. `classifyChoice` splits every response into the uniquely determined answer, a still-possible
// option, or an already-excluded one, and splits the last by whether the exclusion needed any memory
// at all. Every rate is reported against the rate a uniform guesser would produce on the same items,
// because how many options an item excludes is a property of the item and not of the child.
//
// IT IS NOT A MODEL OF A CHILD, and that is the point. `stage2-inspectors/opchain.js` carries a
// model LEARNER used as an auto-responder; its answers depend on how it breaks ties and it can be
// wrong. This is an upper bound on what was available to be known, so a gap between it and any
// responder is that responder's learning, and a gap the other way is impossible.
//
// THE CONTROL ARM IS HANDLED BY CONSTRUCTION, NOT BY MODELLING. In `perTrial` the system is redrawn
// every item, so a reveal from trial 4 constrains nothing about trial 5's system: knowledge resets
// to all 720 before every trial. Nothing is ever determined from prior reveals and no answer is ever
// derivable from them. That is not an assumption about children, it is what the generator did, and
// it is why the control is a control.
//
// CONTENT-DERIVABILITY IS THE SAME QUESTION WITH ZERO REVEALS. If a single option is determined when
// nothing at all has been revealed, then `content` fixes the key and the hidden system was never
// needed — which is exactly the anti-leak attack E-075/E-076 judge (brute-force the mappings, keep
// the ones whose output is on screen, and see whether they agree). So the leak count and the
// learnability trace come out of one implementation rather than two, and they cannot disagree.
//
// The figure algebra is imported from the generator that wrote the bank, never restated.

import {
  BADGE_SYMBOLS,
  OPERATORS,
  applyChain,
  figureKey,
} from './generators/FLU-OPCHAIN-01.mjs';

/* ================================================================== *
 * The candidate space: every badge -> operator bijection.
 *
 * Enumerated once. 720 is small enough that the propagation below is exact —
 * there is no heuristic, no sampling and no per-badge independence assumption,
 * so "determined" means determined and not "probably determined".
 * ================================================================== */
function permutations(items) {
  if (items.length <= 1) return [items.slice()];
  const out = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i], ...tail]);
  }
  return out;
}

/** All 720 systems, each a plain badge -> operator record. */
export const ALL_SYSTEMS = permutations(OPERATORS).map((ops) =>
  Object.fromEntries(BADGE_SYMBOLS.map((badge, i) => [badge, ops[i]])),
);

/** Indices into {@link ALL_SYSTEMS}: the systems still consistent with everything revealed. */
export function newKnowledge() {
  return { surviving: ALL_SYSTEMS.map((_, i) => i), reveals: 0, contradicted: 0 };
}

const chainUnder = (system, badgeChain) => badgeChain.map((badge) => system[badge]);

/**
 * The option each surviving system predicts for this item, as a map key -> count.
 *
 * A system whose predicted output is not on screen at all contributes nothing: the item's five
 * options do not span every figure the vocabulary can reach, so "no option matches" is the normal
 * case for most wrong systems and is not evidence about anything.
 */
function optionVotes(knowledge, item) {
  const byFigure = new Map(item.content.options.map((o) => [figureKey(o.figure), o.key]));
  const votes = new Map();
  for (const index of knowledge.surviving) {
    const system = ALL_SYSTEMS[index];
    const produced = figureKey(applyChain(chainUnder(system, item.content.chain), item.content.input));
    const key = byFigure.get(produced);
    if (key === undefined) continue;
    votes.set(key, (votes.get(key) ?? 0) + 1);
  }
  return votes;
}

/**
 * Narrow the surviving set with one reveal.
 *
 * `revealedFigure` is what the machine actually made — the only teaching signal the design has. A
 * reveal that eliminates everything means the accumulated knowledge was about a DIFFERENT system,
 * which in the consistent arm would be a generator bug and in the scrambled arm is the whole point;
 * either way the count is carried rather than swallowed, and the set is rebuilt from all 720 so the
 * oracle stays an upper bound instead of becoming vacuously omniscient over an empty set.
 */
export function observe(knowledge, item, revealedFigure) {
  const target = figureKey(revealedFigure);
  const surviving = knowledge.surviving.filter((index) => {
    const chain = chainUnder(ALL_SYSTEMS[index], item.content.chain);
    return figureKey(applyChain(chain, item.content.input)) === target;
  });
  if (surviving.length === 0) {
    return {
      surviving: ALL_SYSTEMS.map((_, i) => i),
      reveals: knowledge.reveals + 1,
      contradicted: knowledge.contradicted + 1,
    };
  }
  return {
    surviving,
    reveals: knowledge.reveals + 1,
    contradicted: knowledge.contradicted,
  };
}

/** Badges every surviving system agrees about, as a badge -> operator record. */
export function determinedBadges(knowledge) {
  const out = {};
  for (const badge of BADGE_SYMBOLS) {
    const first = ALL_SYSTEMS[knowledge.surviving[0]][badge];
    if (knowledge.surviving.every((index) => ALL_SYSTEMS[index][badge] === first)) out[badge] = first;
  }
  return out;
}

/**
 * Which options the reveals so far allow, and whether they pick one out.
 *
 * `determined` is the question the trace turns on: could this trial have been answered from what had
 * already been shown? `viable` is how many options survive, which is the honest partial answer for a
 * trial that narrowed the field to two without settling it.
 */
export function answerability(knowledge, item) {
  const votes = optionVotes(knowledge, item);
  const options = [...votes.keys()].sort();
  return {
    viable: options,
    determined: options.length === 1 ? options[0] : null,
    /** Chance of a correct answer from the reveals alone, guessing among what survives. */
    chanceFromKnowledge: options.length === 0 ? 0 : 1 / options.length,
  };
}

/* ================================================================== *
 * How a child behaved under genuine uncertainty
 * ================================================================== */

/**
 * Score one choice against what the evidence allowed at the moment it was made.
 *
 * Three classes, exhaustive and disjoint, because `viable` is exactly the set of options some
 * surviving system still predicts:
 *
 *   determined   the answer was uniquely pinned by prior reveals and this is it.
 *   consistent   several options were still genuinely possible and this is one of them. Correctness
 *                here is luck, and treating it as skill is what dilutes accuracy as a learning
 *                signal — a child who reasoned to the edge of what was knowable and then guessed
 *                has done everything the evidence permitted.
 *   ruledOut     no system consistent with what this child had already been shown can produce this
 *                figure. They did not fail to guess; they contradicted their own evidence.
 *
 * `ruledOut` splits by WHAT did the ruling out, and the split matters more than the total:
 *
 *   content      no mapping whatsoever produces this figure from this input and chain, so the option
 *                is excluded by the item on screen. Rejecting it needs no memory of any reveal —
 *                only the willingness to check the chain against the figure.
 *   reveals      some mapping does produce it, and this child had already seen the reveals that
 *                eliminate every such mapping. This is the failure of inference the owner is after:
 *                information held and not used.
 *
 * Derived from the row recorded BEFORE the answer, never recomputed afterwards, so a later reveal
 * cannot retroactively make a choice look eliminated.
 */
export function classifyChoice(row, chosenKey) {
  const viable = new Set(row.viableKeys);
  if (viable.has(chosenKey)) {
    return {
      klass: viable.size === 1 ? 'determined' : 'consistent',
      among: viable.size,
      ruledOutBy: null,
    };
  }
  return {
    klass: 'ruledOut',
    among: viable.size,
    ruledOutBy: new Set(row.contentViableKeys).has(chosenKey) ? 'reveals' : 'content',
  };
}

/**
 * Whether `content` alone fixes the key — the E-075/E-076 anti-leak attack.
 *
 * This is {@link answerability} against zero reveals, which is the correct definition: a client has
 * the item and the 720 candidate systems, and nothing else. When exactly one option is consistent
 * with any of them the key is recoverable with no induction at all.
 */
export function contentDerivability(item) {
  const fresh = newKnowledge();
  const { viable } = answerability(fresh, item);
  return { viableOptions: viable, leaks: viable.length === 1, count: viable.length };
}

/* ================================================================== *
 * A whole block, incrementally
 *
 * A tracker rather than one batch function because the review window needs the
 * SAME numbers live, before each trial is answered, and a page that recomputed
 * them its own way would be a second implementation free to disagree with the
 * report. `traceBlock` below is a thin loop over this.
 * ================================================================== */

/**
 * Accumulate a block's learnability as it is administered.
 *
 * `persistence` decides whether knowledge carries. Under `perTrial` it is discarded before every
 * trial because the generator redrew the system, so the trace states the control's defining property
 * rather than inferring it from behaviour.
 */
export function createTracker({ persistence }) {
  if (persistence !== 'consistent' && persistence !== 'perTrial') {
    throw new Error(`persistence must be consistent|perTrial, got "${persistence}"`);
  }

  let carried = newKnowledge();
  let warmupDetermined = 0;
  const badgesShown = new Set();
  const rows = [];
  /** Badge -> the 1-based trial at which it first became determined. */
  const firstDetermined = {};

  /**
   * Fold in an UNSCORED reveal seen before trial 1 — a worked demonstration or warm-up item.
   *
   * These belong in the knowledge state and not in the trial list: they taught, and they were not
   * scored, so counting them as trials would feed them into `lambda`.
   */
  function observePrior(item, revealedFigure) {
    carried = observe(carried, item, revealedFigure);
    for (const badge of item.content.chain) badgesShown.add(badge);
    warmupDetermined = Object.keys(determinedBadges(carried)).length;
  }

  /** What a perfect reasoner could have determined BEFORE this item is answered. */
  function before(item) {
    // Under `perTrial` nothing carries, so the state a child could reason from is the empty one.
    const knowledge = persistence === 'consistent' ? carried : newKnowledge();
    const determined = determinedBadges(knowledge);
    const answer = answerability(knowledge, item);
    const content = contentDerivability(item);
    const optionKeys = item.content.options.map((o) => o.key);
    const ruledOutKeys = optionKeys.filter((key) => !answer.viable.includes(key));

    return {
      trial: rows.length + 1,
      chain: item.content.chain.slice(),
      difficulty: item.difficulty,
      /** Badges of the whole vocabulary pinned before this trial was served. */
      knowableBadges: Object.keys(determined).length,
      knowable: Object.keys(determined).length / BADGE_SYMBOLS.length,
      /** How many of THIS chain's badges were pinned. */
      chainKnown: item.content.chain.filter((badge) => determined[badge] !== undefined).length,
      chainLength: item.content.chain.length,
      /** Badges in this chain that had never appeared in any earlier reveal at all. */
      unseenBadges: item.content.chain.filter((badge) => !badgesShown.has(badge)),
      systemsRemaining: knowledge.surviving.length,
      bitsRemaining: Math.log2(knowledge.surviving.length),
      /** THE headline per-trial fact: was this answer derivable from what had been revealed? */
      derivable: answer.determined !== null,
      derivedKey: answer.determined,
      viableFromKnowledge: answer.viable.length,
      chanceFromKnowledge: answer.chanceFromKnowledge,
      /** Derivable from `content` with no reveals at all — a leak, not learning. */
      contentDerivable: content.leaks,
      contentViable: content.count,

      /* The state a choice is judged against. Kept on the row so the judgement uses the
         pre-answer knowledge by construction rather than by remembering to. */
      optionKeys,
      viableKeys: answer.viable.slice(),
      contentViableKeys: content.viableOptions.slice(),
      /** Options the evidence had already excluded, so a child selecting one contradicted it. */
      ruledOutKeys,
      /**
       * What a uniform guesser scores on this trial's `ruledOut` class. THE baseline the observed
       * rate has to be read against: how often an option is excluded is a property of how many
       * distractors this item happens to place outside the vocabulary's reach, so a raw ruled-out
       * rate mostly measures the item and only secondarily the child. The lift against this is the
       * part that is about the child.
       */
      ruledOutChance: optionKeys.length === 0 ? 0 : ruledOutKeys.length / optionKeys.length,
      /** Filled by `record`: which of the three classes the child's actual choice fell into. */
      chosenKey: null,
      inference: null,
      ruledOutBy: null,
    };
  }

  /**
   * Commit a scored trial: keep its `before` row, classify the choice against it, then fold the
   * reveal into the knowledge — in that order, so the classification cannot see this trial's reveal.
   */
  function record(item, revealedFigure, { correct = null, chosenKey = null, precomputed } = {}) {
    const row = { ...(precomputed ?? before(item)), correct };
    if (chosenKey !== null) {
      const verdict = classifyChoice(row, chosenKey);
      row.chosenKey = chosenKey;
      row.inference = verdict.klass;
      row.ruledOutBy = verdict.ruledOutBy;
    }
    rows.push(row);
    for (const badge of item.content.chain) badgesShown.add(badge);
    carried = observe(carried, item, revealedFigure);
    if (persistence === 'consistent') {
      for (const badge of Object.keys(determinedBadges(carried))) {
        // Recorded against the trial whose reveal pinned it, so "became knowable at trial k" means
        // a child reasoning perfectly could have used it from trial k+1 onward.
        if (firstDetermined[badge] === undefined) firstDetermined[badge] = row.trial;
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
    get firstDetermined() {
      return { ...firstDetermined };
    },
    summary: () => summarise(rows, firstDetermined, persistence, warmupDetermined),
  };
}

/**
 * Batch form: walk a completed block and return the per-trial rows plus the block summary.
 *
 * `trials` is `[{ item, revealedFigure, correct? }]` in served order; `priorReveals` the same shape
 * for the unscored warm-up.
 */
export function traceBlock({ trials, persistence, priorReveals = [] }) {
  const tracker = createTracker({ persistence });
  for (const reveal of priorReveals) tracker.observePrior(reveal.item, reveal.revealedFigure);
  for (const trial of trials) {
    tracker.record(trial.item, trial.revealedFigure, {
      correct: trial.correct ?? null,
      chosenKey: trial.chosenKey ?? null,
    });
  }
  return { rows: tracker.rows, summary: tracker.summary() };
}

/**
 * The per-block figures a bank defect is read off.
 *
 * `unanswerablePrefix` is the honest length of the induction ramp: the number of leading trials no
 * reasoner could have answered from prior reveals. It is NOT a defect on its own — with nothing
 * revealed, nothing is determinable, and that ramp is the baseline the climb is measured against.
 * `trialsWithUnseenBadge` IS a defect: a chain turning on a badge that has never been shown is
 * unanswerable for a reason the sequence chose, not a reason the construct requires.
 */
function summarise(rows, firstDetermined, persistence, warmupDetermined) {
  const n = rows.length;
  const third = Math.max(1, Math.floor(n / 3));
  /** Share WITHIN a slice, so the per-third columns are comparable to each other and to the whole. */
  const shareOf = (slice) =>
    slice.length === 0 ? 0 : slice.filter((r) => r.derivable).length / slice.length;
  const derivable = rows.filter((r) => r.derivable);

  let prefix = 0;
  while (prefix < n && !rows[prefix].derivable) prefix += 1;

  return {
    persistence,
    trials: n,
    /** Badges already pinned by the unscored warm-up, before trial 1. */
    warmupDetermined,
    firstDetermined,
    /** Trial by which the WHOLE vocabulary was pinned, or null if it never was. */
    fullyKnowableAt:
      Object.keys(firstDetermined).length === BADGE_SYMBOLS.length
        ? Math.max(...Object.values(firstDetermined))
        : null,
    derivableTrials: derivable.length,
    derivableShare: n === 0 ? 0 : derivable.length / n,
    derivableFirstThird: shareOf(rows.slice(0, third)),
    derivableLastThird: shareOf(rows.slice(-third)),
    unanswerablePrefix: prefix,
    /**
     * Trials that showed a badge for the first time. UNAVOIDABLE and bounded by six minus whatever
     * the warm-up covered: a vocabulary learned inside the block has to be introduced somewhere, and
     * the trial that introduces a badge is by definition one where that badge was unknown.
     */
    badgeIntroductions: rows.filter((r) => r.unseenBadges.length > 0).length,
    /**
     * Trials that showed TWO OR MORE badges for the first time at once. THIS is the avoidable defect
     * and the number that has to be zero. One reveal cannot attribute a change between two badges
     * neither of which has ever been seen, so such a trial is both unanswerable and uninformative —
     * it costs a trial and buys nothing, and the sequence chose it rather than the construct
     * requiring it.
     */
    multiIntroductionTrials: rows.filter((r) => r.unseenBadges.length > 1).length,
    contentDerivableTrials: rows.filter((r) => r.contentDerivable).length,
    /**
     * What a responder scores by exploiting only what was available: derivable trials right, the
     * rest at the chance the surviving options allow. The ceiling any honest accuracy sits under,
     * and the number a fitted climb has to beat before it is about the child.
     */
    availableAccuracy:
      n === 0 ? 0 : rows.reduce((sum, r) => sum + (r.derivable ? 1 : r.chanceFromKnowledge), 0) / n,
    /** Mean knowable fraction, and the same at each third, for the "how much was knowable" curve. */
    meanKnowable: n === 0 ? 0 : rows.reduce((sum, r) => sum + r.knowable, 0) / n,
    knowableByThird: [rows.slice(0, third), rows.slice(third, n - third), rows.slice(-third)].map(
      (slice) =>
        slice.length === 0 ? 0 : slice.reduce((sum, r) => sum + r.knowable, 0) / slice.length,
    ),
    /** Trials whose answer the child actually got right while it was NOT yet derivable. */
    correctWhileUndeterminable: rows.filter((r) => r.correct === true && !r.derivable).length,
    /** Trials whose answer was derivable and the child still missed it — the learning gap. */
    missedWhileDeterminable: rows.filter((r) => r.correct === false && r.derivable).length,
    inference: summariseInference(rows),
  };
}

/**
 * The inference-quality signal: how the child behaved when the answer was not knowable.
 *
 * Raw accuracy on an undeterminable trial is luck, so it carries no information about the child and
 * still enters `lambda` as though it did. This is the part of the same behaviour that is NOT luck.
 * Every rate is reported next to the rate a uniform guesser would produce on the same items, because
 * the number of excluded options is a property of the item: `ruledOutRate` alone would rank banks,
 * not children. The lift is the quantity about the child, and it is signed so that NEGATIVE means
 * information was used.
 */
function summariseInference(rows) {
  const scored = rows.filter((r) => r.inference !== null);
  const rate = (subset, test) =>
    subset.length === 0 ? null : subset.filter(test).length / subset.length;
  const mean = (subset, pick) =>
    subset.length === 0 ? null : subset.reduce((sum, r) => sum + pick(r), 0) / subset.length;
  const isRuledOut = (r) => r.inference === 'ruledOut';

  /** Trials where the answer was NOT uniquely determined — the owner's undiluted slice. */
  const open = scored.filter((r) => !r.derivable);
  const settled = scored.filter((r) => r.derivable);
  const half = Math.floor(scored.length / 2);
  const observedRuledOut = rate(scored, isRuledOut);
  const chanceRuledOut = mean(scored, (r) => r.ruledOutChance);
  const openObserved = rate(open, isRuledOut);
  const openChance = mean(open, (r) => r.ruledOutChance);

  return {
    scored: scored.length,
    /* Counts of the three classes. Disjoint and summing to `scored`. */
    determined: scored.filter((r) => r.inference === 'determined').length,
    consistent: scored.filter((r) => r.inference === 'consistent').length,
    ruledOut: scored.filter(isRuledOut).length,
    /* The split that separates "held information and did not use it" from "never needed memory". */
    ruledOutByReveals: scored.filter((r) => r.ruledOutBy === 'reveals').length,
    ruledOutByContent: scored.filter((r) => r.ruledOutBy === 'content').length,

    ruledOutRate: observedRuledOut,
    ruledOutChance: chanceRuledOut,
    ruledOutLift:
      observedRuledOut === null || chanceRuledOut === null ? null : observedRuledOut - chanceRuledOut,

    /**
     * Restricted to trials nobody could have answered. This is the signal the owner asked for:
     * correctness here is pure luck, but whether the guess respected the evidence is not.
     */
    openTrials: open.length,
    openRuledOutRate: openObserved,
    openRuledOutChance: openChance,
    openRuledOutLift:
      openObserved === null || openChance === null ? null : openObserved - openChance,
    /** Share of undeterminable trials answered with a genuinely still-possible option. */
    openConsistentRate: rate(open, (r) => r.inference === 'consistent'),

    /** On trials that WERE determined, how often the determined answer was taken. */
    determinedTaken: rate(settled, (r) => r.inference === 'determined'),

    /**
     * Within-block stability. A signal that drifts across halves is a learning curve, not a trait;
     * one that holds is a candidate for scoring. Split-half agreement across many blocks is in
     * `stage2-learnability-report.mjs` — this is only the cheap within-block view.
     */
    ruledOutFirstHalf: rate(scored.slice(0, half), isRuledOut),
    ruledOutSecondHalf: rate(scored.slice(half), isRuledOut),
  };
}
