// "If the block stopped at THIS trial, what would be reported, and how wide is it?"
//
// The review window already shows where the estimate landed once the block finished. That answers
// the wrong question. The question the whole Stage 2 investment turns on is whether the measure
// ever becomes reportable INSIDE a block, and after how many trials — and the only way to see that
// is to recompute the readout after every trial and watch the interval contract, or fail to.
//
// This module produces that series for both candidate readouts, and nothing else. It renders
// nothing and it defines no criterion of its own:
//
//   λ         `estimateLearningCurve` over the prefix, UNANCHORED. See {@link lambdaAt}.
//   latency   `blockLatencies` over the prefix, from `stage2-latency.mjs` — the sequential
//             log-odds criterion, the identifiability normalisation and the four censoring
//             states, imported rather than restated. See {@link latencyAt}.
//
// The one thing `stage2-latency.mjs` does not supply is an uncertainty for ONE block. Its
// child-level score is a random-intercept AFT fitted across children, which is not identified from
// a single child, so {@link restrictedMeanWithSe} adds the standard error of the restricted mean
// survival time it already computes. That is the only new statistics in this file, it is the
// textbook estimator, and its small-sample weakness is stated at the function.
//
// THREE REFUSALS ARE BUILT IN, because a running readout invites over-reading more than a final
// one does:
//
//   1. No band, no rank, no absolute rate. Gate B has not run. Every point is an interval and its
//      relation to a reference line; nothing here names a level.
//   2. An estimate that the data has not moved off its prior is reported as NO ESTIMATE rather
//      than as a very wide one. A plotted interval three times the height of the panel reads as
//      "we know something imprecise"; the truth in the opening trials is "we know nothing yet".
//   3. Latency is right-censored and, in the scrambled arm, undefined. Both states are carried
//      through as states, never collapsed into a number.

import {
  DEFAULT_CRITERION,
  blockLatencies,
  kaplanMeier,
} from './stage2-latency.mjs';

/**
 * The climb a child who learns nothing still fits, in scale points per trial.
 *
 * MEASURED, not chosen. `STAGE2_BANK_RECOVERY_MEASUREMENT.md` §3 runs 400 children at λ_true = 0
 * — no learning whatsoever — through the corrected estimator and the same adaptive targeting loop
 * the block uses, on this exact bank: `FLU-OPCHAIN-01` returns **λ̄ = 0.0096 ± 0.0033** (Monte-Carlo
 * SE) in BOTH arms, against 0.0098 on an idealised difficulty grid and 0.0183 on `FLU-MATRIX-01`.
 * E-200 records the mechanism: the fit picks the next difficulty and then reads its own walk, so
 * the loop manufactures a positive rate out of chance successes.
 *
 * The default band spans 0.009 to 0.017 — the measured value on this bank at its lower edge, and
 * the neighbouring pool's value at its upper, which is the range the reviewer asked to see drawn.
 * It is editable in the window precisely because it is a measurement with its own error and not a
 * constant: how sensitive "cleared at trial N" is to where the line is put is part of the answer.
 *
 * An interval overlapping this band means NOT DISTINGUISHABLE FROM NO LEARNING. Clearing it means
 * the climb is larger than the loop's own artefact — which is still not a learning rate.
 */
export const CONTAMINATION_FLOOR = Object.freeze({ low: 0.009, high: 0.017 });

/** 95% normal interval, the same 1.96 the rest of the window uses. */
const Z = 1.96;

/**
 * The prior SD of λ, read out of the estimator rather than copied from it.
 *
 * Fitting zero trials leaves the posterior equal to the prior, so `lambdaSe` comes back as exactly
 * `priorLambdaSd`. Asking the engine is what stops this file from quietly disagreeing with it if
 * that default ever changes — the failure mode the whole `stage2-build` arrangement exists to
 * prevent.
 */
export function priorLambdaSd(engine) {
  return engine.estimateLearningCurve([]).lambdaSe;
}

/**
 * How much information the block must add before its λ interval is drawn at all.
 *
 * The opening trials are the failure this panel is most likely to cause. `estimateLearningCurve`
 * always returns a number and an SE, so a naive running plot draws an interval from trial 1 —
 * ±0.29 scale points per trial at trial 5, which is seventeen times the contamination floor the
 * panel is asking about. That is not an imprecise measurement. It is the prior, redrawn, and
 * plotting it invites a reader to see a band "narrowing" when nothing has happened yet.
 *
 * The bar is posterior precision at least DOUBLE the prior's — the block must have contributed at
 * least as much information about λ as the prior contributed, which in SD terms is
 * `priorSd / sqrt(2)` ≈ 0.106. Two is the smallest multiple that means "the data now outweighs the
 * assumption", and it is stated here rather than tuned to make a run look good. On a 30-trial
 * block against this bank it typically starts passing somewhere around trial 20, which is
 * consistent with E-095: recovery of an injected climb is r = 0.18 at 15 trials and 0.45 at 30.
 */
export const PRIOR_INFORMATION_MULTIPLE = 2;

/* ================================================================== *
 * λ — the fitted slope, refitted after every trial
 * ================================================================== */

/**
 * What `summariseLearningBlock` would report for λ if the block ended after these trials.
 *
 * UNANCHORED, and that is the whole point of the distinction. The trial-by-trial table shows the
 * fit anchored on the standing estimate, because that is the fit `nextBlockTarget` uses to aim the
 * next item and a trace of the steering has to show what steers. The number that would be
 * REPORTED is the unanchored one — `summariseLearningBlock` calls `estimateLearningCurve(trials)`
 * with no prior mean — so a running "what would be reported" series has to be the unanchored fit
 * or it is answering a different question. The two differ most in the opening trials, which is
 * exactly where this panel is read.
 *
 * `state` is a refusal, not a severity:
 *
 *   tooFew        below `MIN_TRIALS_FOR_PROJECTION`; the engine's own statement that the fit does
 *                 not yet carry information.
 *   priorBound    the block has not yet contributed as much information about λ as the prior did.
 *                 See {@link PRIOR_INFORMATION_MULTIPLE}.
 *   notConverged  Fisher scoring did not settle. `summariseLearningBlock` returns `lambda: null`
 *                 in this state, so a panel claiming to show what would be reported shows nothing.
 *                 This is not rare and it is not a bug: a block a child gets mostly right pushes
 *                 `theta0` into the scale ceiling, where the damped step keeps hitting the bound.
 *   ok            an interval the block earned.
 */
export function lambdaAt(engine, servedPrefix, { priorSd }) {
  const trials = engine.toLearningTrials(servedPrefix);
  const fit = engine.estimateLearningCurve(trials);
  const half = Z * fit.lambdaSe;

  let state = 'ok';
  if (trials.length < engine.MIN_TRIALS_FOR_PROJECTION) state = 'tooFew';
  else if (!fit.converged) state = 'notConverged';
  else if (fit.lambdaSe > priorSd / Math.sqrt(PRIOR_INFORMATION_MULTIPLE)) state = 'priorBound';

  const usable = state === 'ok';
  return {
    trials: trials.length,
    lambda: usable ? fit.lambda : null,
    lambdaSe: usable ? fit.lambdaSe : null,
    lo: usable ? fit.lambda - half : null,
    hi: usable ? fit.lambda + half : null,
    converged: fit.converged,
    state,
    /** Diagnostic only: the point the fit is sitting on even while the state refuses to report it. */
    rawLambda: fit.lambda,
    rawSe: fit.lambdaSe,
  };
}

/** Whether an interval sits entirely above the floor band — the only "says anything" this panel has. */
export function clearsFloor(point, floor) {
  return point.state === 'ok' && point.lo > floor.high;
}

/** Whether an interval sits entirely below zero AND below the floor: a fitted decline. */
export function belowFloor(point, floor) {
  return point.state === 'ok' && point.hi < floor.low;
}

/* ================================================================== *
 * Latency — the censored survival readout, refitted after every trial
 * ================================================================== */

/**
 * Standard error of the restricted mean survival time.
 *
 * `kaplanMeier` computes RMST but not its error, because the report it was written for compares
 * group means over hundreds of blocks and gets its uncertainty from replication. One block cannot
 * replicate, so the interval has to come from within the curve. This is the standard estimator
 * (Klein & Moeschberger §4.5): each event time contributes the squared remaining area weighted by
 * the Greenwood term.
 *
 *   Var[RMST(τ)] = Σ_{t_i ≤ τ}  ( ∫_{t_i}^{τ} Ŝ(u) du )²  ·  d_i / ( n_i (n_i − d_i) )
 *
 * TWO HONEST WEAKNESSES, both surfaced rather than smoothed. It is asymptotic, and a block has at
 * most six primitives, so with two or three events it understates. And the final event time, where
 * the risk set empties, has an undefined term; it is dropped, which biases the variance DOWN.
 * `droppedTerms` reports how often that happened so a reader can see when the interval is
 * optimistic. This is why {@link latencyAt} refuses to plot below two events rather than trusting
 * the number.
 */
export function restrictedMeanWithSe(km, horizon) {
  const points = km.curve.filter((p) => p.time <= horizon);
  const areaBefore = [];
  let area = 0;
  let survival = 1;
  let previousTime = 0;
  for (const point of points) {
    area += survival * (point.time - previousTime);
    areaBefore.push(area);
    survival = point.survival;
    previousTime = point.time;
  }
  const rmst = area + survival * Math.max(0, horizon - previousTime);

  let variance = 0;
  let droppedTerms = 0;
  points.forEach((point, index) => {
    if (point.events === 0) return;
    const remaining = point.atRisk - point.events;
    if (remaining <= 0) {
      droppedTerms += 1;
      return;
    }
    const tail = rmst - areaBefore[index];
    variance += tail * tail * (point.events / (point.atRisk * remaining));
  });

  return { rmst, se: Math.sqrt(variance), droppedTerms };
}

/**
 * What the latency readout would say if the block ended after these trials.
 *
 * `trials` is the prefix in `blockLatencies`' shape. The four per-primitive states come straight
 * from that function and are NOT collapsed: 49% of live-arm (block, primitive) pairs are censored
 * and 8% never become deducible at all (`STAGE2_LATENCY_VS_SLOPE.md` §3), so a display that showed
 * only the primitives that resolved would be reporting the fast half of the vocabulary and calling
 * it the child.
 *
 * `state`:
 *
 *   noOnset       nothing was ever deducible, so no latency EXISTS. This is the scrambled arm by
 *                 construction, and it is an immunity rather than a passing grade: the control
 *                 cannot supply the normalised measure with an input, so it cannot test it (§6).
 *   tooFew        deducible primitives exist but fewer than two reached criterion. With zero
 *                 events the survival curve never drops and RMST equals the horizon with zero
 *                 estimated variance — a confident-looking number meaning "no evidence", which is
 *                 the single most misleading thing this panel could draw.
 *   ok            an interval the block earned.
 *
 * The scale is TRIALS, and lower is faster. The horizon τ is the reference: RMST = τ is exactly
 * "no primitive was ever demonstrated inside the block", which is where a guesser sits (§3 measures
 * 29.9 of 30 over 84 guessing blocks). An interval touching τ says the block did not distinguish
 * this child from one who acquired nothing.
 */
export function latencyAt({ arm, priorReveals, trials, horizon, criterion = DEFAULT_CRITERION }) {
  const perBadge = blockLatencies({ persistence: arm, priorReveals, trials, criterion });

  const deducible = perBadge.filter((b) => b.deducible);
  const observations = deducible.map((b) =>
    b.event ? { time: b.latency, event: true } : { time: b.censoredAt, event: false },
  );
  const events = observations.filter((o) => o.event).length;

  const counts = {
    event: events,
    censored: perBadge.filter((b) => b.deducible && !b.event && !b.untested).length,
    untested: perBadge.filter((b) => b.untested).length,
    notDeducible: perBadge.filter((b) => !b.deducible).length,
  };

  if (deducible.length === 0) {
    return { state: 'noOnset', perBadge, counts, rmst: null, se: null, lo: null, hi: null };
  }

  const km = kaplanMeier(observations);
  const { rmst, se, droppedTerms } = restrictedMeanWithSe(km, horizon);

  if (events < 2) {
    return {
      state: 'tooFew',
      perBadge,
      counts,
      rmst: null,
      se: null,
      lo: null,
      hi: null,
      rawRmst: rmst,
      censoringRate: km.censoringRate,
      droppedTerms,
    };
  }

  return {
    state: 'ok',
    perBadge,
    counts,
    rmst,
    se,
    // Clamped to the horizon: RMST is an area under a curve on [0, τ] and cannot exceed τ, so an
    // interval drawn past it would be describing trials the block does not have.
    lo: Math.max(0, rmst - Z * se),
    hi: Math.min(horizon, rmst + Z * se),
    /** True when the interval still touches "acquired nothing" — the latency panel's floor test. */
    touchesCeiling: Math.min(horizon, rmst + Z * se) >= horizon - 1e-9,
    censoringRate: km.censoringRate,
    kaplanMeier: km,
    droppedTerms,
  };
}

/* ================================================================== *
 * The series
 * ================================================================== */

/**
 * A prefix of `run.rows` in the shape `blockLatencies` reads.
 *
 * `trueMapping` is the reviewer-only side table's copy of the badge→operator map in force for that
 * item, which under `perTrial` differs every trial. It is never on the served item, so it can only
 * come from the side table, and it never reaches the child's screen.
 */
function latencyTrials(rows, upTo) {
  return rows.slice(0, upTo).map((row) => ({
    item: row.item,
    revealedFigure: row.revealed.output,
    chosenKey: row.answered,
    trueMapping: row.meta?.system?.mapping ?? null,
  }));
}

/**
 * Both readouts at every trial of a run, oldest first.
 *
 * Called by the window after each answer and by `stage2-block-probe.mjs`, so a trial number quoted
 * in a report and the same trial number on screen come from one implementation. Recomputing every
 * prefix rather than updating in place is deliberate: an incremental λ would have to carry the
 * Fisher-scoring state forward, and a running estimate whose value depended on when it was asked
 * would be worse than useless in a panel whose whole subject is how the value moves.
 */
export function runningSeries({ engine, run, criterion = DEFAULT_CRITERION }) {
  const priorSd = priorLambdaSd(engine);
  const horizon = run.length;
  const priorReveals = run.warmup.map((reveal) => ({
    item: reveal.item,
    revealedFigure: reveal.revealedFigure,
  }));

  const series = [];
  for (let upTo = 1; upTo <= run.rows.length; upTo += 1) {
    const lambda = lambdaAt(engine, run.served.slice(0, upTo), { priorSd });
    const latency = latencyAt({
      arm: run.arm,
      priorReveals,
      trials: latencyTrials(run.rows, upTo),
      horizon,
      criterion,
    });
    series.push({ trial: upTo, lambda, latency });
  }
  return series;
}

/**
 * The trial at which a predicate first held, and whether it was still holding at the end.
 *
 * Both halves are reported because "first cleared" on its own is a cherry-pick. An interval that
 * clears the floor at trial 14 and falls back over it at trial 19 has not shown that the measure
 * became reportable; it has shown that a 30-trial block wanders. The panel labels the first
 * crossing because that is what was asked for, and it labels whether it held because that is what
 * makes the first crossing readable.
 */
export function firstCrossing(series, predicate) {
  const at = series.findIndex(predicate);
  if (at < 0) return { trial: null, held: false, sinceCount: 0 };
  const after = series.slice(at);
  return {
    trial: series[at].trial,
    held: after.every(predicate),
    sinceCount: after.filter(predicate).length,
  };
}

/** Everything a caller needs to state, in one sentence, what the run's λ interval did. */
export function lambdaVerdict(series, floor = CONTAMINATION_FLOOR) {
  const crossing = firstCrossing(series, (point) => clearsFloor(point.lambda, floor));
  const last = series.length > 0 ? series[series.length - 1] : null;
  return {
    ...crossing,
    floor,
    /** The other direction: an interval entirely BELOW the floor is a fitted decline, not silence. */
    below: firstCrossing(series, (point) => belowFloor(point.lambda, floor)).trial,
    endState: last?.lambda.state ?? null,
    endLambda: last?.lambda.lambda ?? null,
    endLo: last?.lambda.lo ?? null,
    endHi: last?.lambda.hi ?? null,
    endClears: last ? clearsFloor(last.lambda, floor) : false,
    /** Trials whose state refused to report at all, by reason — the "too little evidence" tally. */
    refused: series.filter((point) => point.lambda.state !== 'ok').length,
  };
}

/** The same for the latency panel: the first trial whose interval left the "acquired nothing" line. */
export function latencyVerdict(series) {
  const crossing = firstCrossing(
    series,
    (point) => point.latency.state === 'ok' && point.latency.touchesCeiling === false,
  );
  const last = series.length > 0 ? series[series.length - 1] : null;
  return {
    ...crossing,
    endState: last?.latency.state ?? null,
    endRmst: last?.latency.rmst ?? null,
    endLo: last?.latency.lo ?? null,
    endHi: last?.latency.hi ?? null,
    endCounts: last?.latency.counts ?? null,
  };
}
