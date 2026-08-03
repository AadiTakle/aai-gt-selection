// PER-PRIMITIVE ACQUISITION LATENCY — the event-time alternative to the fitted slope.
//
// WHAT IS BEING MEASURED, AND WHY IT MIGHT BEAT λ. `estimateLearningCurve` fits a rate to a
// 30-trial accuracy series. A rate is a difference score in disguise: it inherits the poor
// reliability of the curve it is fitted to, and its functional form is disputed. Gallistel,
// Fairhurst & Balsam (2004, PNAS 101:13124) argue that when individual learning is abrupt rather
// than gradual, a rate is not estimable at all and the ONSET LATENCY is the correct measure.
// Inducing a badge→operator mapping is plausibly step-like per operator: you do not know `turn`
// 40% well. So this module measures, per primitive i:
//
//   d_i   the first trial at which primitive i is UNIQUELY DETERMINABLE from the reveals the child
//         has actually seen. Supplied by the learnability oracle, not by a model of a child.
//   k_i   the first trial at which the responder DEMONSTRATES knowing it, to a stated criterion.
//   L_i   = k_i − d_i. An event time. No curve is fitted, so no functional form is assumed.
//
// THE NORMALISATION IS THE ONLY NOVEL PART. Plain trials-to-criterion confounds "slow learner"
// with "was not yet learnable": a child cannot demonstrate `turn` before any reveal has pinned it,
// and counting the trials before that against them measures the item sequence, not the child.
// Subtracting d_i removes exactly that, and it is removable here only because the generator can
// compute identifiability exactly. {@link naiveLatencies} keeps the un-normalised version so the
// difference between the two is measured rather than asserted.
//
// THREE THINGS THAT DECIDE WHETHER THE COMPARISON IS WORTH ANYTHING, HANDLED HERE:
//
//   1. THE CRITERION. First-correct is worthless at a five-option guessing floor. The criterion
//      here is a sequential log-odds test over per-primitive evidence — see {@link badgeOpportunity}
//      and {@link DEFAULT_CRITERION} — whose false-alarm rate under uniform guessing is bounded
//      analytically by Wald and measured empirically against the guessing responder.
//   2. RIGHT-CENSORING. Most blocks end before criterion. Averaging the reached ones biases the
//      measure toward fast learners and would fake a favourable result, so every latency is carried
//      as an (time, event) pair and summarised by Kaplan–Meier or by a censored log-normal AFT with
//      the child as a random effect. See {@link kaplanMeier} and {@link fitRandomInterceptAft}.
//   3. AGGREGATION. Up to six latencies per child, and they are NOT independent — pinning five
//      badges pins the sixth through the bijection, so the constraint propagation couples them. The
//      AFT random intercept is the aggregation: one latent per-child log-latency shift, with the
//      within-child correlation absorbed by the random effect rather than assumed away.
//
// CLAIM BOUNDARY. Everything here runs on synthetic responders over a born-synthetic, ungated bank.
// It can establish that a measure separates CONSTRUCTED learners from CONSTRUCTED guessers. It
// cannot establish that it separates real children, and nothing it produces is a learning rate.
//
// This module is measurement only. Nothing in it is imported by the live block or by the review
// window; `research/exam-question-types/stage2-latency-report.mjs` is its only caller.

import {
  BADGE_SYMBOLS,
  OPERATORS,
  applyChain,
  figureKey,
} from './generators/FLU-OPCHAIN-01.mjs';
import { determinedBadges, newKnowledge, observe } from './stage2-learnability.mjs';

/* ================================================================== *
 * 1. d_i — when each primitive became deducible
 * ================================================================== */

/**
 * The trial at which each badge first became uniquely determined by the reveals seen so far.
 *
 * Zero means "pinned by the unscored warm-up", which is a real and different state from "pinned by
 * scored trial 1" — a badge the demonstrations gave away was available from trial 1 onward, and
 * charging the child a trial for it would shorten every latency by one. The existing tracker's
 * `firstDetermined` cannot express this (it only runs inside `record`), so onsets are recomputed
 * here from the oracle's own primitives rather than read off the tracker.
 *
 * Under `perTrial` the generator redraws the system every item, so no reveal constrains any later
 * trial and NOTHING is ever determinable. That is stated by construction, exactly as the tracker
 * states it, and not inferred from behaviour.
 *
 * @param {'consistent'|'perTrial'} persistence
 * @param {{item: object, revealedFigure: object}[]} priorReveals unscored warm-up, in order
 * @param {{item: object, revealedFigure: object}[]} trials scored trials, in served order
 * @returns {Record<string, number>} badge -> onset trial (0 = warm-up). Absent = never determinable.
 */
export function onsetTrials({ persistence, priorReveals = [], trials }) {
  if (persistence === 'perTrial') return {};

  const onset = {};
  let knowledge = newKnowledge();
  const fold = (reveal, trialNumber) => {
    knowledge = observe(knowledge, reveal.item, reveal.revealedFigure);
    for (const badge of Object.keys(determinedBadges(knowledge))) {
      if (onset[badge] === undefined) onset[badge] = trialNumber;
    }
  };

  for (const reveal of priorReveals) fold(reveal, 0);
  trials.forEach((trial, index) => fold(trial, index + 1));
  return onset;
}

/* ================================================================== *
 * 2. The criterion: what counts as demonstrating one primitive
 * ================================================================== */

/** Every ordered assignment of DISTINCT operators to a chain's badges. At most 6·5·4·3 = 360. */
function chainAssignments(chain) {
  const out = [];
  const walk = (depth, picked) => {
    if (depth === chain.length) {
      out.push(picked.slice());
      return;
    }
    for (const op of OPERATORS) {
      // No operator repeats inside a chain (the generator forbids it: five of the six are
      // involutions, so a repeat would silently cancel), so an assignment that reuses one is not a
      // system the item could have come from.
      if (picked.includes(op)) continue;
      picked.push(op);
      walk(depth + 1, picked);
      picked.pop();
    }
  };
  walk(0, []);
  return out;
}

/**
 * For one item, every badge in its chain: which options are reachable while HOLDING that badge at
 * a given operator.
 *
 * This is the per-primitive refinement of `classifyChoice`'s determined/consistent/ruled-out split.
 * That classification asks whether a choice is compatible with the reveals; this asks whether a
 * choice is compatible with one specific belief about one specific badge, marginalising over every
 * belief the child could hold about the others.
 *
 * Memoised on `itemId`: it is a property of the item alone, the same items recur across hundreds of
 * simulated blocks, and the two arms share no item ids (they are separately generated banks), so
 * the cache cannot alias across the very contrast being measured.
 *
 * @returns {Map<string, Map<string, Set<string>>>} badge -> operator -> option keys
 */
const REACH_CACHE = new Map();
function reachableByBadgeOperator(item) {
  const cached = REACH_CACHE.get(item.itemId);
  if (cached !== undefined) return cached;

  const chain = item.content.chain;
  const byFigure = new Map(item.content.options.map((o) => [figureKey(o.figure), o.key]));
  const out = new Map(
    chain.map((badge) => [badge, new Map(OPERATORS.map((op) => [op, new Set()]))]),
  );
  for (const assignment of chainAssignments(chain)) {
    const key = byFigure.get(figureKey(applyChain(assignment, item.content.input)));
    if (key === undefined) continue;
    chain.forEach((badge, position) => {
      out.get(badge).get(assignment[position]).add(key);
    });
  }
  REACH_CACHE.set(item.itemId, out);
  return out;
}

/**
 * What this item can and cannot show about ONE badge, given the operator that badge truly holds.
 *
 * `passKeys` are the options a child who holds that badge CORRECTLY could produce, whatever they
 * believe about the rest of the chain. Two properties make this the right unit of evidence:
 *
 *   SOUND. A responder whose belief assigns the badge its true operator produces its answer from an
 *   assignment containing that operator, so its choice is in `passKeys` BY CONSTRUCTION — no matter
 *   how wrong it is about the other badges in the chain. The test therefore cannot punish knowing
 *   one primitive for not knowing another, which a raw correctness criterion does.
 *
 *   CALIBRATED. `q` is the exact probability a uniform guesser lands in `passKeys` on THIS item.
 *   It varies from 1/5 to 1 depending on how many distractors the item happens to place outside the
 *   badge's reach, so a fixed run-length criterion would be a much stronger test on some items than
 *   on others. Carrying `q` per opportunity is what lets the criterion below weight each piece of
 *   evidence by how much it is actually worth.
 *
 * An item with `q === 1` excludes nothing about this badge and is not an opportunity: no response
 * to it could distinguish a knower from a guesser.
 */
export function badgeOpportunity(item, badge, trueOperator) {
  const byOperator = reachableByBadgeOperator(item).get(badge);
  // A badge the chain never mentions constrains nothing about the figure the machine made, so every
  // option is compatible with holding it correct: q = 1, and there is no evidence to be had.
  if (byOperator === undefined) {
    return { informative: false, q: 1, passKeys: new Set(item.content.options.map((o) => o.key)) };
  }
  const passKeys = byOperator.get(trueOperator) ?? new Set();
  const options = item.content.options.length;
  const q = options === 0 ? 1 : passKeys.size / options;
  return { informative: q > 0 && q < 1, q, passKeys };
}

/**
 * The evidence threshold, and why these two numbers.
 *
 * `lapse` is P(a child who knows the primitive nonetheless answers outside `passKeys`) — a slip, a
 * mis-click, or a failure to compose a four-badge chain they understand badge-by-badge. 0.10 is
 * deliberately generous: a smaller value would make one stray response nearly disqualifying and
 * turn the criterion into a test of composition load rather than of primitive knowledge.
 *
 * `threshold` is the likelihood ratio required to declare acquisition. Wald's bound gives
 * P(ever crossing | the responder is guessing) ≤ 1/threshold, so 100 is ≤1% per primitive and
 * ≤ ~6% per child across six. That is the analytic guarantee; the report measures the realised
 * false-alarm rate against the guessing responder rather than trusting it.
 */
export const DEFAULT_CRITERION = Object.freeze({ lapse: 0.1, threshold: 100 });

/**
 * Sequential log-odds accumulator for one primitive.
 *
 * A FIXED RUN OF k CONSECUTIVE HITS WAS REJECTED, and the reason is the `q` above. At q = 0.2 three
 * consecutive passes are strong evidence (5³ = 125 to 1); at q = 0.6 they are 4.6 to 1 and a guesser
 * clears them roughly one window in five. A criterion that treats those two runs as the same
 * observation is not a criterion, it is a lottery over which items the selection rule happened to
 * serve. Weighting each opportunity by log((1−lapse)/q) prices the evidence at what it is worth,
 * and lets the threshold — not the item mix — control the false-alarm rate.
 *
 * Evidence AGAINST accumulates too, at log(lapse/(1−q)) per miss, so a responder that stumbles into
 * a run of lucky passes and then reverts does not stay credited.
 */
export function createBadgeTest({ lapse, threshold } = DEFAULT_CRITERION) {
  const bound = Math.log(threshold);
  let logOdds = 0;
  let crossed = false;
  return {
    get logOdds() {
      return logOdds;
    },
    get crossed() {
      return crossed;
    },
    /** Fold one informative opportunity. Returns true on the observation that crosses. */
    feed(passed, q) {
      if (crossed) return false;
      logOdds += passed ? Math.log((1 - lapse) / q) : Math.log(lapse / (1 - q));
      if (logOdds >= bound) {
        crossed = true;
        return true;
      }
      return false;
    },
  };
}

/* ================================================================== *
 * 3. A whole block: L_i for every primitive, with censoring
 * ================================================================== */

/**
 * Per-primitive latencies for one completed block.
 *
 * `trials` is `[{ item, revealedFigure, chosenKey, trueMapping }]` in served order; `trueMapping`
 * is that item's badge→operator map, which under `perTrial` differs every trial and under
 * `consistent` is the same map throughout.
 *
 * THE CLOCK STARTS AT d_i, and that is a claim, not a convenience. Before d_i the primitive is not
 * deducible from anything the child has seen, so a response consistent with knowing it is luck by
 * construction, and feeding it to the criterion would let a lucky guesser reach criterion for
 * something nobody could yet know. Restricting the accumulator to trials after d_i makes
 * `k_i > d_i` true by construction and `L_i ≥ 1` well defined, which is also what keeps the log
 * transform in the AFT honest.
 *
 * FOUR OUTCOMES PER PRIMITIVE, and they are not interchangeable:
 *
 *   event           criterion reached. L_i observed.
 *   censored        deducible, tested, block ended first. L_i > (T − d_i). The measure's whole
 *                   censoring problem lives here.
 *   untested        deducible but the selection rule never served an informative item on it after
 *                   d_i. Censored with ZERO exposure — carries no information about the child at
 *                   all, and lumping it with `censored` would understate how much of the sample is
 *                   empty.
 *   notDeducible    the block never pinned it. L_i is UNDEFINED, not censored: there is no onset to
 *                   measure from. Dropping these silently is the failure mode at high standings,
 *                   where only about half the vocabulary is ever pinned.
 */
export function blockLatencies({
  persistence,
  priorReveals = [],
  trials,
  criterion,
  half = 'all',
}) {
  const onset = onsetTrials({ persistence, priorReveals, trials });
  const horizon = trials.length;
  const rule = criterion ?? DEFAULT_CRITERION;
  // Odd/even over a badge's own opportunity stream, not over trial numbers: an odd/even split on
  // trials would hand one half systematically more opportunities than the other for any badge the
  // selection rule happened to serve in a run, and the two halves would then not be exchangeable.
  const keep =
    half === 'all'
      ? () => true
      : half === 'odd'
        ? (n) => n % 2 === 1
        : (n) => n % 2 === 0;

  return BADGE_SYMBOLS.map((badge) => {
    const d = onset[badge];
    const deducible = d !== undefined;
    const test = createBadgeTest(rule);
    let opportunities = 0;
    let used = 0;
    let criterionTrial = null;
    let criterionOpportunity = null;
    let passes = 0;
    let depthAtCriterion = null;

    for (let index = 0; index < trials.length; index += 1) {
      const trialNumber = index + 1;
      // Nothing before the onset can be evidence about this primitive: it was not yet deducible,
      // so a compatible choice is chance and an incompatible one is not a failure of inference.
      if (!deducible || trialNumber <= d) continue;
      const trial = trials[index];
      const trueOperator = trial.trueMapping?.[badge];
      if (trueOperator === undefined) continue;
      const { informative, q, passKeys } = badgeOpportunity(trial.item, badge, trueOperator);
      if (!informative) continue;

      opportunities += 1;
      if (!keep(opportunities)) continue;
      used += 1;
      const passed = passKeys.has(trial.chosenKey);
      if (passed) passes += 1;
      if (test.feed(passed, q) && criterionTrial === null) {
        criterionTrial = trialNumber;
        criterionOpportunity = used;
        depthAtCriterion = trial.item.content.chain.length;
      }
    }

    const event = criterionTrial !== null;
    return {
      badge,
      deducible,
      onset: deducible ? d : null,
      opportunities: used,
      passes,
      /** Pass rate on informative opportunities — the raw signal before any event-time framing. */
      passRate: used === 0 ? null : passes / used,
      criterionTrial,
      event,
      untested: deducible && used === 0,
      /** L_i on the TRIAL clock: the quantity the measure is about. */
      latency: event ? criterionTrial - d : null,
      /** Where a non-event is censored. Administrative: the block simply ended. */
      censoredAt: deducible && !event ? horizon - d : null,
      /**
       * L_i on the OPPORTUNITY clock. The trial clock charges a child for trials the selection rule
       * spent on other primitives, and the rule targets DIFFICULTY, so exposure is not equated
       * across children. Counting only informative opportunities removes that, at the cost of a
       * unit nobody outside this file can interpret. Both are reported.
       */
      latencyOpportunities: criterionOpportunity,
      censoredAtOpportunities: deducible && !event ? used : null,
      logOdds: test.logOdds,
      depthAtCriterion,
    };
  });
}

/**
 * The same criterion with NO identifiability normalisation — plain trials-to-criterion.
 *
 * This is the ablation the whole exercise turns on. It runs the accumulator from trial 1 regardless
 * of when the primitive became deducible, which is what any implementation without a generator-side
 * oracle would be forced to do. Two things it is for:
 *
 *   1. It prices the normalisation. The gap between this and {@link blockLatencies} IS what
 *      subtracting d_i buys.
 *   2. It is the honest scrambled-arm control. The normalised measure is undefined in the scrambled
 *      arm by construction (nothing is ever deducible, so there is no onset), which makes it immune
 *      to the control rather than tested by it. This version is not immune: it will happily produce
 *      tidy trials-to-criterion numbers on a system that cannot be learned, and how tidy they look
 *      is the measurement of how much the normalisation was doing.
 */
export function naiveLatencies({ trials, criterion }) {
  const horizon = trials.length;
  const rule = criterion ?? DEFAULT_CRITERION;

  return BADGE_SYMBOLS.map((badge) => {
    const test = createBadgeTest(rule);
    let opportunities = 0;
    let criterionTrial = null;

    for (let index = 0; index < trials.length; index += 1) {
      const trial = trials[index];
      const trueOperator = trial.trueMapping?.[badge];
      if (trueOperator === undefined) continue;
      const { informative, q, passKeys } = badgeOpportunity(trial.item, badge, trueOperator);
      if (!informative) continue;
      opportunities += 1;
      if (test.feed(passKeys.has(trial.chosenKey), q) && criterionTrial === null) {
        criterionTrial = index + 1;
      }
    }

    const event = criterionTrial !== null;
    return {
      badge,
      opportunities,
      event,
      latency: criterionTrial,
      censoredAt: event ? null : horizon,
    };
  });
}

/* ================================================================== *
 * 4. Survival summaries
 * ================================================================== */

/**
 * Kaplan–Meier product-limit estimate.
 *
 * The non-parametric answer to the censoring problem: every subject contributes to the risk set for
 * as long as they were observed, so a block that ended before criterion still says "not by then"
 * instead of vanishing. `observations` is `[{ time, event }]` with `time ≥ 0`.
 */
export function kaplanMeier(observations) {
  const points = observations.filter((o) => Number.isFinite(o.time)).sort((a, b) => a.time - b.time);
  const n = points.length;
  const curve = [];
  let survival = 1;
  let atRisk = n;
  let index = 0;

  while (index < n) {
    const time = points[index].time;
    let events = 0;
    let leaving = 0;
    while (index < n && points[index].time === time) {
      if (points[index].event) events += 1;
      leaving += 1;
      index += 1;
    }
    if (events > 0) survival *= 1 - events / atRisk;
    curve.push({ time, atRisk, events, survival });
    atRisk -= leaving;
  }

  const median = curve.find((p) => p.survival <= 0.5)?.time ?? null;
  return {
    n,
    events: points.filter((p) => p.event).length,
    censored: points.filter((p) => !p.event).length,
    censoringRate: n === 0 ? null : points.filter((p) => !p.event).length / n,
    curve,
    /** Null when the curve never reaches 0.5 — which is the normal case under heavy censoring. */
    median,
    restrictedMean: (horizon) => restrictedMeanSurvival(curve, horizon),
  };
}

/**
 * Area under the KM curve up to `horizon` — the restricted mean survival time.
 *
 * Reported instead of the median because under heavy censoring the median is frequently undefined,
 * and "undefined" is not a number a comparison can use. RMST is always defined, and it is the
 * censoring-correct analogue of "average latency" that averaging the reached ones only pretends
 * to be.
 */
function restrictedMeanSurvival(curve, horizon) {
  let area = 0;
  let previousTime = 0;
  let survival = 1;
  for (const point of curve) {
    if (point.time > horizon) break;
    area += survival * (point.time - previousTime);
    survival = point.survival;
    previousTime = point.time;
  }
  return area + survival * Math.max(0, horizon - previousTime);
}

/* ------------------------------------------------------------------ *
 * Accelerated failure time with the child as a random effect
 * ------------------------------------------------------------------ */

const SQRT_2PI = Math.sqrt(2 * Math.PI);
const normalPdf = (z) => Math.exp(-0.5 * z * z) / SQRT_2PI;

/** Abramowitz & Stegun 7.1.26 error function; ~1.5e-7 absolute, far below the noise here. */
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
}
const normalCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/** 12-node Gauss–Hermite rule, enough for a smooth one-dimensional Gaussian random effect. */
const GH_NODES = [
  -3.889724897869782, -3.020637025120890, -2.279507080501060, -1.597682635152605,
  -0.947788391240164, -0.314240376254359, 0.314240376254359, 0.947788391240164, 1.597682635152605,
  2.279507080501060, 3.020637025120890, 3.889724897869782,
];
const GH_WEIGHTS = [
  0.000000265855168, 0.000085736870436, 0.003905390584629, 0.051607985615884, 0.260492310264161,
  0.570135236262480, 0.570135236262480, 0.260492310264161, 0.051607985615884, 0.003905390584629,
  0.000085736870436, 0.000000265855168,
];

/**
 * Log-likelihood of one child's latencies given a value of that child's random intercept.
 *
 * Log-normal AFT: log L = mu + b + sigma·e. An event contributes its density, a censored
 * observation contributes its survivor function — which is the entire point of doing this rather
 * than averaging: a block that ended at trial 30 without criterion is the statement "longer than
 * this", and a mean over the reached ones throws that statement away and biases toward fast
 * learners.
 */
function childLogLikelihood(observations, mu, sigma, b) {
  let total = 0;
  for (const { time, event } of observations) {
    const z = (Math.log(time) - mu - b) / sigma;
    if (event) {
      total += Math.log(Math.max(1e-300, normalPdf(z) / (sigma * time)));
    } else {
      total += Math.log(Math.max(1e-12, 1 - normalCdf(z)));
    }
  }
  return total;
}

/**
 * Fit a log-normal AFT with a per-child Gaussian random intercept, by marginal maximum likelihood.
 *
 * THE RANDOM EFFECT IS THE AGGREGATION RULE. Six latencies from one child are not six independent
 * observations: the constraint propagation couples them (pinning five badges pins the sixth), and
 * whatever makes a child slow on one primitive makes them slow on the others. A random intercept
 * says exactly that — one latent per-child shift, shared across the child's primitives, with the
 * residual spread estimated rather than assumed — and the alternative of averaging the six would
 * both ignore censoring and treat the coupling as extra precision it has not earned.
 *
 * Returns the variance components and a scorer: {@link scoreChild} converts one child's latencies
 * into a posterior mean shift, which is the per-block scalar the comparison against λ needs.
 *
 * @param {Array<Array<{time:number,event:boolean}>>} byChild
 */
export function fitRandomInterceptAft(byChild) {
  const usable = byChild.filter((obs) => obs.length > 0);
  if (usable.length < 3) return null;

  const marginal = (params) => {
    const [mu, logSigma, logTau] = params;
    const sigma = Math.exp(logSigma);
    const tau = Math.exp(logTau);
    let total = 0;
    for (const observations of usable) {
      let acc = 0;
      for (let g = 0; g < GH_NODES.length; g += 1) {
        // Probabilists' scaling: b = sqrt(2)·tau·node turns the physicists' rule into an
        // expectation over N(0, tau²), and the weights then sum to sqrt(pi).
        const b = Math.SQRT2 * tau * GH_NODES[g];
        acc += GH_WEIGHTS[g] * Math.exp(childLogLikelihood(observations, mu, sigma, b));
      }
      total += Math.log(Math.max(1e-300, acc / Math.sqrt(Math.PI)));
    }
    return total;
  };

  const start = [
    Math.log(
      Math.max(
        1,
        usable.flat().reduce((sum, o) => sum + o.time, 0) / Math.max(1, usable.flat().length),
      ),
    ),
    Math.log(0.6),
    Math.log(0.4),
  ];
  const fitted = nelderMead((p) => -marginal(p), start);
  const [mu, logSigma, logTau] = fitted.x;
  const sigma = Math.exp(logSigma);
  const tau = Math.exp(logTau);

  return {
    mu,
    /** Within-child residual SD of log latency: the measurement error the comparison needs. */
    sigma,
    /** Between-child SD of log latency: the signal. */
    tau,
    logLikelihood: -fitted.fx,
    children: usable.length,
    /**
     * Posterior mean and variance of one child's shift, by the same quadrature. The mean is the
     * child-level score; the variance is that score's own error, and the ratio tau²/mean(variance)
     * is the "between-child spread against its own error" figure that decides whether a measure can
     * rank anyone at all.
     */
    scoreChild(observations) {
      if (observations.length === 0) return { mean: 0, variance: tau * tau, informative: false };
      let w0 = 0;
      let w1 = 0;
      let w2 = 0;
      for (let g = 0; g < GH_NODES.length; g += 1) {
        const b = Math.SQRT2 * tau * GH_NODES[g];
        const w = GH_WEIGHTS[g] * Math.exp(childLogLikelihood(observations, mu, sigma, b));
        w0 += w;
        w1 += w * b;
        w2 += w * b * b;
      }
      if (!(w0 > 0)) return { mean: 0, variance: tau * tau, informative: false };
      const mean = w1 / w0;
      return { mean, variance: Math.max(1e-9, w2 / w0 - mean * mean), informative: true };
    },
  };
}

/** Nelder–Mead. Small, derivative-free and deterministic; three parameters do not need more. */
function nelderMead(objective, start, { maxIterations = 800, tolerance = 1e-8 } = {}) {
  const n = start.length;
  const simplex = [start.slice()];
  for (let i = 0; i < n; i += 1) {
    const point = start.slice();
    point[i] += point[i] === 0 ? 0.25 : 0.25 * Math.abs(point[i]);
    simplex.push(point);
  }
  let values = simplex.map(objective);

  const centroid = (exclude) => {
    const out = new Array(n).fill(0);
    for (let i = 0; i < simplex.length; i += 1) {
      if (i === exclude) continue;
      for (let j = 0; j < n; j += 1) out[j] += simplex[i][j] / n;
    }
    return out;
  };
  const combine = (a, b, t) => a.map((v, j) => v + t * (b[j] - v));

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
    const best = order[0];
    const worst = order[n];
    if (Math.abs(values[worst] - values[best]) < tolerance) break;

    const mid = centroid(worst);
    const reflected = combine(mid, simplex[worst], -1);
    const fr = objective(reflected);
    if (fr < values[best]) {
      const expanded = combine(mid, simplex[worst], -2);
      const fe = objective(expanded);
      simplex[worst] = fe < fr ? expanded : reflected;
      values[worst] = Math.min(fe, fr);
    } else if (fr < values[order[n - 1]]) {
      simplex[worst] = reflected;
      values[worst] = fr;
    } else {
      const contracted = combine(mid, simplex[worst], 0.5);
      const fc = objective(contracted);
      if (fc < values[worst]) {
        simplex[worst] = contracted;
        values[worst] = fc;
      } else {
        for (let i = 0; i < simplex.length; i += 1) {
          if (i === best) continue;
          simplex[i] = combine(simplex[best], simplex[i], 0.5);
        }
        values = simplex.map(objective);
      }
    }
  }

  let bestIndex = 0;
  for (let i = 1; i < values.length; i += 1) if (values[i] < values[bestIndex]) bestIndex = i;
  return { x: simplex[bestIndex], fx: values[bestIndex] };
}

/* ================================================================== *
 * 5. The quantity the whole comparison turns on
 * ================================================================== */

/**
 * One-way random-effects decomposition of a score into between-child and within-child variance.
 *
 * THE ONLY NUMBER THAT DECIDES ANYTHING. A measure whose between-child spread does not exceed its
 * own replication error cannot rank children, however clean its group means look — and that is
 * precisely what the published literature finds for fitted learning rates. Because this is a
 * simulation, the decomposition can be made design-based rather than model-based: the same
 * synthetic child is run over several seeds, so within-child error is MEASURED by replication
 * rather than estimated from a fit, and the identical procedure applies to λ and to the latency
 * score with no assumption that could favour either.
 *
 * `groups` is one array of replicate scores per child. Unbalanced groups are handled by the
 * standard unbiased ANOVA estimator (Searle, Casella & McCulloch §3.6).
 */
export function varianceComponents(groups) {
  const usable = groups.filter((g) => g.length >= 2 && g.every((v) => Number.isFinite(v)));
  if (usable.length < 2) return null;

  const counts = usable.map((g) => g.length);
  const total = counts.reduce((a, b) => a + b, 0);
  const means = usable.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  const grand = usable.flat().reduce((a, b) => a + b, 0) / total;

  const ssBetween = usable.reduce((sum, g, i) => sum + g.length * (means[i] - grand) ** 2, 0);
  const ssWithin = usable.reduce(
    (sum, g, i) => sum + g.reduce((s, v) => s + (v - means[i]) ** 2, 0),
    0,
  );
  const dfBetween = usable.length - 1;
  const dfWithin = total - usable.length;
  if (dfBetween <= 0 || dfWithin <= 0) return null;

  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const n0 =
    (total - counts.reduce((sum, c) => sum + (c * c) / total, 0)) / dfBetween;
  const between = Math.max(0, (msBetween - msWithin) / n0);

  return {
    children: usable.length,
    blocks: total,
    /** Replication error of a SINGLE block's score. */
    within: msWithin,
    /** Variance of the true child-level scores, net of that error. */
    between,
    /**
     * The headline ratio. Below 1 the measure's spread across children is smaller than the noise
     * on one block, so two children cannot be told apart from one block each.
     */
    ratio: msWithin > 0 ? between / msWithin : null,
    /** ICC(1,1): reliability of one block as a measurement of the child. */
    icc: between + msWithin > 0 ? between / (between + msWithin) : null,
    grandMean: grand,
  };
}

/**
 * Probability a randomly drawn block from `a` outranks one from `b`, ties counted as half.
 *
 * The unit-free separation statistic. Two measures on incompatible scales — scale points per trial
 * and log trials — cannot be compared by a mean difference, and a standardised difference still
 * assumes both are roughly symmetric. AUC assumes only an ordering, which is the only thing a
 * selection instrument would ever use.
 */
export function separationAuc(a, b) {
  if (a.length === 0 || b.length === 0) return null;
  let wins = 0;
  for (const x of a) for (const y of b) wins += x > y ? 1 : x === y ? 0.5 : 0;
  return wins / (a.length * b.length);
}

/** Pearson correlation, for the split-half checks. */
export function correlation(xs, ys) {
  const pairs = xs
    .map((x, i) => [x, ys[i]])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 3) return null;
  const n = pairs.length;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}

/** Mid-ranks, so ties do not silently become an ordering. */
export function midRanks(values) {
  const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
  const out = new Array(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && values[order[j + 1]] === values[order[i]]) j += 1;
    const mid = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) out[order[k]] = mid;
    i = j + 1;
  }
  return out;
}

/**
 * Spearman rank correlation.
 *
 * Used rather than Pearson wherever a measure is compared against the fidelity ladder, because that
 * ladder is not linearly spaced and a Pearson coefficient would then be reporting the spacing this
 * file chose as much as the measure's behaviour.
 */
export function rankCorrelation(xs, ys) {
  const pairs = xs
    .map((x, i) => [x, ys[i]])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 3) return null;
  return correlation(
    midRanks(pairs.map((p) => p[0])),
    midRanks(pairs.map((p) => p[1])),
  );
}

/** Spearman–Brown step-up: what a split-half correlation implies for the whole block. */
export const spearmanBrown = (r) => (r === null ? null : (2 * r) / (1 + r));

/**
 * Average of correlations computed WITHIN groups, via Fisher's z.
 *
 * A split-half correlation pooled over standings counts the standing difference as agreement: both
 * halves of a high-standing block look alike partly because the child is high-standing, which is
 * not the block's internal consistency. Averaging within-standing correlations removes that.
 */
export function pooledWithinCorrelation(groups) {
  const zs = [];
  const weights = [];
  for (const { xs, ys } of groups) {
    const r = correlation(xs, ys);
    if (r === null || Math.abs(r) >= 0.9999) continue;
    const n = xs.filter((x, i) => Number.isFinite(x) && Number.isFinite(ys[i])).length;
    if (n < 5) continue;
    zs.push(0.5 * Math.log((1 + r) / (1 - r)));
    weights.push(n - 3);
  }
  if (zs.length === 0) return null;
  const total = weights.reduce((a, b) => a + b, 0);
  const z = zs.reduce((sum, v, i) => sum + v * weights[i], 0) / total;
  return Math.tanh(z);
}
