import { isRapidGuess } from '../rte';

/**
 * Candidate engagement detectors (M-ENGAGE specification study).
 *
 * WHY THIS EXISTS: the recorded baseline shows the production RT rapid-guess gate
 * cutting composite RMSE from 0.961 to 0.467 but leaving a −0.199 bias, against
 * −0.066 under perfect engagement telemetry. The RT floor can only see FAST
 * disengagement; a slow, checked-out response answers at the guessing floor and
 * still enters theta. These detectors are the candidate signals that could close
 * that gap, written as pure rules over one session's observable trial stream so
 * each can be scored for sensitivity/specificity against the simulator's known
 * on-task truth and for the bias it actually removes.
 *
 * A detector FLAGS a trial for exclusion from theta. Every rule returns a boolean
 * per trial in administration order; `unionFlags` composes them, because a
 * detector suite that requires agreement would inherit the RT gate's blind spot.
 *
 * CLAIM BOUNDARY: sensitivity/specificity here are measured against a SIMULATED
 * on-task flag drawn from an assumed engagement model, not against observed child
 * behaviour. They quantify what each signal could buy IF disengagement behaves the
 * way the simulator assumes. They are not a validated detector and never justify
 * an inference about a specific child's effort (R10).
 *
 * SCOPE: deliberately NOT exported from `../index.ts` — nothing here is approved
 * for production scoring.
 */

/** One trial as a detector sees it: no ground truth, only observables. */
export interface DetectorTrial {
  rtMs: number;
  correct: boolean;
  /**
   * Model-expected P(correct) for this item at the session's working ability
   * estimate. A detector may use it, but it is an ESTIMATE — an implausibility
   * rule built on it inherits that estimate's error.
   */
  expectedCorrect: number;
  /**
   * Optional per-item dwell / interaction evidence in [0,1]; higher = more
   * engaged. Absent when the product does not collect it.
   */
  interactionScore?: number | undefined;
}

/** D1 — the production baseline: RT at or below the item's rapid-guess floor. */
export function rapidGuessFlags(trials: readonly DetectorTrial[], thresholdMs: number): boolean[] {
  return trials.map((t) => isRapidGuess(t.rtMs, thresholdMs));
}

export interface DriftDeclineOptions {
  /** Trailing window length in trials. Default 6. */
  windowLength?: number;
  /**
   * Mean residual (`observed − expected`) at or below which the window is treated
   * as disengaged. Default −0.30 [A]: an average shortfall of nearly a third of an
   * item per trial, well outside ordinary Bernoulli noise over six trials.
   */
  meanResidualFloor?: number;
  /**
   * Once triggered, keep flagging until the window recovers. Models M-DRIFT: the
   * simulator makes each off-task trial raise the odds of the next, so a decline
   * is a state rather than an isolated event.
   */
  latching?: boolean;
}

/**
 * D2 — within-session decline. Flags trials inside a trailing window whose mean
 * 3PL residual has collapsed, which is what a child who has checked out looks
 * like when their RT stays normal.
 *
 * Only trials from the trigger point forward are flagged, never retroactively:
 * the rule has to be implementable in a live session, and a retroactive version
 * would flatter itself by using the future.
 */
export function driftDeclineFlags(
  trials: readonly DetectorTrial[],
  options: DriftDeclineOptions = {},
): boolean[] {
  const { windowLength = 6, meanResidualFloor = -0.3, latching = true } = options;
  const flags = trials.map(() => false);
  let latched = false;
  for (let i = 0; i < trials.length; i++) {
    const start = Math.max(0, i - windowLength + 1);
    const count = i - start + 1;
    if (count < windowLength) continue;
    let sum = 0;
    for (let j = start; j <= i; j++) {
      sum += (trials[j]!.correct ? 1 : 0) - trials[j]!.expectedCorrect;
    }
    const declined = sum / count <= meanResidualFloor;
    if (declined) latched = true;
    else if (!latching) latched = false;
    flags[i] = latching ? latched : declined;
  }
  return flags;
}

export interface ImplausiblePatternOptions {
  /**
   * Expected P(correct) above which a wrong answer is treated as implausible.
   * Default 0.75 [A].
   */
  easyThreshold?: number;
  /** Consecutive implausible misses required before flagging. Default 2. */
  runLength?: number;
}

/**
 * D3 — response-pattern implausibility: runs of incorrect responses on items well
 * below the working ability estimate.
 *
 * `runLength` defaults to 2 because a single miss on an easy item is ordinary
 * Bernoulli noise at any ability; it is the RUN that carries information. The
 * flagged span covers the whole run, since the first miss of a run is as
 * non-effortful as the last.
 */
export function implausiblePatternFlags(
  trials: readonly DetectorTrial[],
  options: ImplausiblePatternOptions = {},
): boolean[] {
  const { easyThreshold = 0.75, runLength = 2 } = options;
  const flags = trials.map(() => false);
  let run = 0;
  for (let i = 0; i < trials.length; i++) {
    const trial = trials[i]!;
    const implausible = !trial.correct && trial.expectedCorrect >= easyThreshold;
    run = implausible ? run + 1 : 0;
    if (run >= runLength) {
      for (let j = i - run + 1; j <= i; j++) flags[j] = true;
    }
  }
  return flags;
}

/**
 * D4 — idealized per-item dwell / interaction evidence. Flags a trial whose
 * interaction score falls below `threshold`. Trials without the signal are never
 * flagged, so a partially-instrumented form degrades to its other detectors
 * rather than to silent exclusion.
 */
export function interactionFlags(trials: readonly DetectorTrial[], threshold: number): boolean[] {
  return trials.map((t) => t.interactionScore != null && t.interactionScore < threshold);
}

/**
 * Element-wise OR over detector outputs. Union rather than intersection: the whole
 * point of adding a signal is to catch disengagement the RT floor cannot see, and
 * requiring agreement would re-impose exactly that blind spot. The cost is
 * specificity, which the sweep reports alongside sensitivity.
 */
export function unionFlags(...flagSets: readonly (readonly boolean[])[]): boolean[] {
  const length = flagSets.reduce((max, set) => Math.max(max, set.length), 0);
  const out = new Array<boolean>(length).fill(false);
  for (const set of flagSets) {
    for (let i = 0; i < set.length; i++) if (set[i]) out[i] = true;
  }
  return out;
}

/** Detection performance of a flag vector against known off-task trials. */
export interface DetectionPerformance {
  n: number;
  offTask: number;
  flagged: number;
  truePositive: number;
  falsePositive: number;
  /** P(flagged | off-task). */
  sensitivity: number;
  /** P(not flagged | on-task). */
  specificity: number;
  /** P(off-task | flagged). */
  precision: number;
}

/**
 * Score a flag vector against the generator's on-task truth. `onTask[i] === false`
 * is the positive class, because the detector's job is to find non-evidence.
 */
export function detectionPerformance(
  flags: readonly boolean[],
  onTask: readonly boolean[],
): DetectionPerformance {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  const n = Math.min(flags.length, onTask.length);
  for (let i = 0; i < n; i++) {
    const positive = !onTask[i];
    if (flags[i] && positive) tp += 1;
    else if (flags[i] && !positive) fp += 1;
    else if (!flags[i] && positive) fn += 1;
    else tn += 1;
  }
  return {
    n,
    offTask: tp + fn,
    flagged: tp + fp,
    truePositive: tp,
    falsePositive: fp,
    sensitivity: tp + fn === 0 ? Number.NaN : tp / (tp + fn),
    specificity: tn + fp === 0 ? Number.NaN : tn / (tn + fp),
    precision: tp + fp === 0 ? Number.NaN : tp / (tp + fp),
  };
}
