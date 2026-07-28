import { probabilityCorrect } from '../irt';
import type { IrtParameters } from '../types';

import { standardNormals, thetaToDial } from './latent';

/**
 * Per-metric measurement models: latent traits -> one trial's observable
 * behaviour (`PERSONA_SIM_AND_VALIDATION_DESIGN.md` §1, "Measurement models").
 *
 * WHY THIS EXISTS: the design deliberately does NOT re-implement the response
 * model — the 3PL in `../irt.ts` IS the accuracy model, and this module only adds
 * the surrounding observables (which difficulty a child reaches, what KIND of
 * error they make, how long they take, and whether the trial was effortful at
 * all). Keeping them here, pure and seeded, means the same generative assumptions
 * can be inspected, unit-tested, and replayed independently of the session shell.
 *
 * SCOPE OF THIS SLICE: the accuracy family (M-ACC, M-DIFFREACH, M-ERRTYPE /
 * M-LURETYPE), the RT family (M-RT + lapses), the engagement gate (M-ENGAGE /
 * M-RAPIDGUESS / M-DRIFT), and the within-block ability climb that M-LEARNRATE is
 * supposed to pick up. The creativity / working-memory / process generators in the
 * design table are NOT implemented here.
 *
 * Every constant is an OPEN ASSUMPTION [A]; none is calibrated against a real
 * response-time or error-type distribution. A recovered statistic is a property of
 * these assumptions, not evidence about children.
 */

/** Discrimination / guessing used when an item carries no calibrated parameters. */
export interface IrtFromDialOptions {
  /** `a`. Default 1.1 — a plausible mid-range discrimination [A]. */
  discrimination?: number;
  /** `c`. Default 0.25 = a four-option floor ("effectively random chance"). */
  guessing?: number;
}

/**
 * Derive 3PL parameters from an ordinal 1-20 design rung via the doc's dial->theta
 * mapping. This is the bridge that lets a synthetic bank with DESIGN rungs (never
 * calibrated difficulty) drive a real 3PL response, and it is the simulator's
 * assumption — not a calibration claim.
 */
export function irtFromDial(dial: number, options: IrtFromDialOptions = {}): IrtParameters {
  const { discrimination = 1.1, guessing = 0.25 } = options;
  return { a: discrimination, b: (dial - 10.5) / 3, c: guessing, model: '3PL' };
}

/** One 3PL coin flip: the whole accuracy channel (M-ACC). */
export function sampleCorrect(rand: () => number, theta: number, irt: IrtParameters): boolean {
  return rand() < probabilityCorrect(theta, irt);
}

/**
 * The difficulty at which the 3PL success probability crosses 0.5 — the
 * near-deterministic target M-DIFFREACH is supposed to estimate under escalation.
 * With a guessing floor `c` the 0.5 crossing sits slightly ABOVE theta (chance is
 * the asymptote above the score, not at it), so this is `theta + ln(...)/a`, not
 * theta itself. Returns `+Infinity` when `c >= 0.5` (the curve never crosses).
 */
export function difficultyReachTheta(theta: number, irt: IrtParameters): number {
  const { a, c } = irt;
  if (c >= 0.5) return Number.POSITIVE_INFINITY;
  const target = (0.5 - c) / (1 - c);
  return theta - Math.log(target / (1 - target)) / a;
}

export interface DifficultyReachOptions {
  /** SD of the escalation noise on the reached rung, in theta units. Default 0.25 [A]. */
  noiseSd?: number;
}

/**
 * M-DIFFREACH: the reached difficulty expressed on the 1-20 dial. Near
 * deterministic in theta, plus escalation noise (a real staircase overshoots or
 * stops early depending on the last few coin flips).
 */
export function sampleDifficultyReachDial(
  rand: () => number,
  theta: number,
  irt: IrtParameters,
  options: DifficultyReachOptions = {},
): number {
  const { noiseSd = 0.25 } = options;
  const reach = difficultyReachTheta(theta, irt);
  if (!Number.isFinite(reach)) return thetaToDial(theta);
  const [z] = standardNormals(rand, 1);
  return thetaToDial(reach + noiseSd * z!);
}

// --- error type / lure (M-ERRTYPE, M-LURETYPE) --------------------------------

/**
 * Error taxonomy for a wrong answer. `near_miss` = the child engaged the right
 * relation and mis-applied it (an item at their edge); `random` = the item was far
 * enough above them that the response is effectively a guess.
 */
export type PersonaErrorType = 'near_miss' | 'random';

export interface ErrorTypeOptions {
  /** `(b - theta)` at which near-miss and random are equally likely. Default 1.0 [A]. */
  randomMidpoint?: number;
  /** Steepness of the near-miss -> random transition. Default 1.2 [A]. */
  randomSlope?: number;
}

/**
 * P(random | wrong). Rises as `b` exceeds theta and falls toward zero as `b`
 * approaches theta, which is the doc's requirement: error KIND carries information
 * about where the child is relative to the item, over and above right/wrong.
 */
export function randomErrorProbability(
  theta: number,
  irt: IrtParameters,
  options: ErrorTypeOptions = {},
): number {
  const { randomMidpoint = 1.0, randomSlope = 1.2 } = options;
  const delta = irt.b - theta;
  return 1 / (1 + Math.exp(-randomSlope * (delta - randomMidpoint)));
}

/** Sample the error type for a trial already known to be WRONG. */
export function sampleErrorType(
  rand: () => number,
  theta: number,
  irt: IrtParameters,
  options: ErrorTypeOptions = {},
): PersonaErrorType {
  return rand() < randomErrorProbability(theta, irt, options) ? 'random' : 'near_miss';
}

/**
 * Map an error type onto the bank's distractor lure taxonomy (M-LURETYPE). Plain
 * strings, so the engine does not couple to the item-schema enum: `local_fit` is
 * the "engaged the relation, applied it locally" distractor, `global_mismatch` the
 * "did not engage the relation at all" distractor.
 */
export function lureClassForErrorType(errorType: PersonaErrorType): string {
  return errorType === 'near_miss' ? 'local_fit' : 'global_mismatch';
}

// --- response time (M-RT, M-RTVAR, M-LAPSE) -----------------------------------

export interface ResponseTimeOptions {
  /** Median RT in ms for an average-speed child on an at-ability item. Default 9000 [A]. */
  baseMs?: number;
  /** Log-ms reduction per SD of processing speed. Default 0.22 [A]. */
  speedCoefficient?: number;
  /** Log-ms increase per theta unit of `(b - theta)`. Default 0.28 [A]. */
  difficultyCoefficient?: number;
  /** `(b - theta)` is clipped to +/- this before entering the mean. Default 2.5. */
  difficultyClip?: number;
  /** Log-scale SD at consistency 1 / consistency 0. Defaults 0.18 / 0.75 [A]. */
  spreadFloor?: number;
  spreadCeiling?: number;
  /** Probability of an attention lapse (a long draw). Default 0.04 [A]. */
  lapseRate?: number;
  /** Multiplicative range of a lapse. Defaults 1.8 / 4.0 [A]. */
  lapseMinFactor?: number;
  lapseMaxFactor?: number;
  /** Hard bounds in ms. Defaults 400 / 300000. */
  minMs?: number;
  maxMs?: number;
}

export interface ResponseTimeInput {
  theta: number;
  irt: IrtParameters;
  /** Standardized processing speed; higher = faster. */
  speed: number;
  /** RT consistency in (0,1); higher = steadier. */
  consistency: number;
}

export interface ResponseTimeDraw {
  rtMs: number;
  /** True when an attention lapse stretched this draw (M-LAPSE). */
  lapse: boolean;
}

/**
 * Log-normal RT whose median rises with `(b - theta)` and falls with processing
 * speed, with spread set by consistency and an occasional long draw as a lapse.
 * Log-normal rather than normal because RT is positive and right-skewed; the
 * `(b - theta)` term is what makes RT informative about ability at all.
 */
export function sampleResponseTimeMs(
  rand: () => number,
  input: ResponseTimeInput,
  options: ResponseTimeOptions = {},
): ResponseTimeDraw {
  const {
    baseMs = 9000,
    speedCoefficient = 0.22,
    difficultyCoefficient = 0.28,
    difficultyClip = 2.5,
    spreadFloor = 0.18,
    spreadCeiling = 0.75,
    lapseRate = 0.04,
    lapseMinFactor = 1.8,
    lapseMaxFactor = 4.0,
    minMs = 400,
    maxMs = 300000,
  } = options;

  const delta = Math.max(-difficultyClip, Math.min(difficultyClip, input.irt.b - input.theta));
  const mu = Math.log(baseMs) - speedCoefficient * input.speed + difficultyCoefficient * delta;
  const sigma = spreadFloor + (spreadCeiling - spreadFloor) * (1 - input.consistency);
  const [z] = standardNormals(rand, 1);
  let rt = Math.exp(mu + sigma * z!);

  const lapse = rand() < lapseRate;
  if (lapse) rt *= lapseMinFactor + (lapseMaxFactor - lapseMinFactor) * rand();

  return { rtMs: Math.max(minMs, Math.min(maxMs, rt)), lapse };
}

// --- engagement gate (M-ENGAGE, M-RAPIDGUESS, M-DRIFT) ------------------------

export interface EngagementOptions {
  /** On-task probability lost per off-task trial already emitted. Default 0.06 [A]. */
  driftPerOffTask?: number;
  /**
   * Cap on the TOTAL decline drift can produce. Default 0.15 [A]. Without a cap a
   * long form death-spirals — a handful of early off-task trials drive the on-task
   * probability to the floor and the rest of the session is noise, which is a
   * property of the unbounded model rather than a claim about children.
   */
  maxTotalDrift?: number;
  /** Floor the drifted on-task probability cannot fall below. Default 0.1. */
  driftFloor?: number;
  /** Median rapid-guess RT in ms. Default 550 [A]. */
  rapidGuessMedianMs?: number;
  /** Log-scale SD of the rapid-guess RT. Default 0.35 [A]. */
  rapidGuessSpread?: number;
  /** Hard bounds on a rapid-guess RT in ms. Defaults 150 / 1400. */
  rapidGuessMinMs?: number;
  rapidGuessMaxMs?: number;
  /** Multiplier on the normal RT for a SLOW disengaged trial. Default 2.5 [A]. */
  disengagedSlowFactor?: number;
}

/**
 * Within-session drift (M-DRIFT): every off-task trial makes the next one more
 * likely to be off-task too. Modelled as a decline in the on-task probability
 * rather than in ability, because the construct claim is that disengagement
 * destroys the EVIDENCE, not the child's ability.
 */
export function driftedEngagement(
  baseEngagement: number,
  offTaskSoFar: number,
  options: EngagementOptions = {},
): number {
  const { driftPerOffTask = 0.06, driftFloor = 0.1, maxTotalDrift = 0.15 } = options;
  // The floor never RAISES engagement: a persona defined as fully disengaged must
  // stay at zero, or an isolation test of the gate would silently leak real trials.
  const floor = Math.min(driftFloor, baseEngagement);
  const decline = Math.min(maxTotalDrift, driftPerOffTask * offTaskSoFar);
  return Math.max(floor, Math.min(1, baseEngagement - decline));
}

/** One draw of the gate: is this trial on-task? */
export function sampleOnTask(rand: () => number, onTaskProbability: number): boolean {
  return rand() < onTaskProbability;
}

/**
 * A rapid-guess RT: a tiny log-normal draw, deliberately below any plausible
 * solution-behaviour floor so the RTE filter in `../rte.ts` catches it.
 */
export function sampleRapidGuessRtMs(rand: () => number, options: EngagementOptions = {}): number {
  const {
    rapidGuessMedianMs = 550,
    rapidGuessSpread = 0.35,
    rapidGuessMinMs = 150,
    rapidGuessMaxMs = 1400,
  } = options;
  const [z] = standardNormals(rand, 1);
  const rt = Math.exp(Math.log(rapidGuessMedianMs) + rapidGuessSpread * z!);
  return Math.max(rapidGuessMinMs, Math.min(rapidGuessMaxMs, rt));
}

/**
 * Accuracy of a non-effortful response: the guessing floor `c`, i.e. "effectively
 * random chance" regardless of the child's ability. This is what makes a
 * disengaged high-ability persona look low-ability unless the gate catches it.
 */
export function sampleGuessCorrect(rand: () => number, irt: IrtParameters): boolean {
  return rand() < irt.c;
}

// --- within-block learning (M-LEARNRATE) --------------------------------------

/**
 * Ability inside a NOVEL block climbs linearly with trial index:
 * `theta_eff(t) = theta_base + lambda * t` (t is 0-based within the block). The
 * existing OLS slope in `../scoring.ts` is then supposed to recover ~lambda from
 * the resulting score sequence. Note the recovered slope is on the SCORE scale
 * (0/1 per item), not the theta scale, so it is proportional to lambda rather than
 * equal to it — the constant of proportionality depends on where the block's items
 * sit relative to theta.
 */
export function effectiveTheta(
  thetaBase: number,
  learningRate: number,
  trialInBlock: number,
): number {
  return thetaBase + learningRate * trialInBlock;
}
