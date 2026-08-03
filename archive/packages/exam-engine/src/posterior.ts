/**
 * A live per-area belief about where the child stands, and the arithmetic that picks the item
 * which shrinks that belief fastest.
 *
 * WHY THIS EXISTS. Until now selection carried one number per area — a staircase position nudged
 * up on a correct answer and down on a wrong one — and aimed every item at it. A staircase is a
 * heuristic approximation to a search: it has no notion of how much it knows, so it cannot ask
 * "which question would tell me the most", and the standard error the scorer reports afterwards
 * was never available while the session was running. This module supplies the missing quantity:
 * a distribution over the child's standing, updated after every answer, from which both an
 * estimate and its uncertainty fall out.
 *
 * THE MODEL is the same one-parameter logistic the scorer fits, with a chance-success floor:
 *
 *     P(correct | theta, b) = c + (1 - c) / (1 + exp(-slope * (theta - b)))
 *
 * `c` matters more than it looks. Every wired bank is multiple choice, so a child well below an
 * item still passes it sometimes. Under `c = 0` the most informative item is the one the child has
 * an even chance on, i.e. difficulty equal to ability. Under `c > 0` the information peak moves to
 * `P = (1 + sqrt(1 + 8c)) / 4` — about 0.65 for a five-option item — so the item that teaches the
 * most is somewhat EASIER than the child, not level with them. Nothing here hard-codes that
 * offset: it falls out of maximising against a floor-aware likelihood, which is the point of
 * writing the floor into the model rather than correcting for it afterwards.
 *
 * REPRESENTATION is a fixed grid over the difficulty scale rather than a closed-form posterior.
 * The floor-aware likelihood has no conjugate prior, the scale is bounded and only 19 points wide,
 * and a grid makes the expected-variance calculation below a few multiplications instead of an
 * integral. It also keeps the whole thing exactly reproducible: no optimiser, no tolerance, no
 * iteration count that could differ between machines.
 *
 * REBUILT FROM THE TRACE, never stored. `beliefFor` recomputes an area's belief from its stored
 * observations every time it is asked. That costs ~1,000 multiplications and buys the property
 * BUILD_PLAN §5 requires: a session replays to the same state from its stored results alone, with
 * no live in-memory belief that could drift from what was persisted.
 *
 * CLAIM BOUNDARY. `slope` and `guessingFloor` are design assumptions, not calibrated parameters —
 * no bank item has a calibrated discrimination or a measured chance floor, and every difficulty is
 * a design estimate on a born-synthetic bank (`syntheticOnly = true`, `validated = false`). This
 * belief is a SELECTION instrument: it decides which question to ask next. It is not a validated
 * ability score, and the fact that it is a posterior does not make its inputs any more real.
 */
import { DIFFICULTY_MAX, DIFFICULTY_MIN, GRADE_BAND_SEED } from './config';
import type { Area, AreaState, SessionState } from './types';

/**
 * Spacing of the difficulty grid the belief lives on.
 *
 * A quarter of a scale point: finer than `minUpdate` (0.25 — the smallest move the staircase can
 * make), and far finer than the bank's own difficulty resolution, so the grid is never the thing
 * limiting precision. 77 points over the 1..20 scale.
 */
export const BELIEF_GRID_STEP = 0.25;

/** The difficulty grid every belief is expressed over: `DIFFICULTY_MIN`..`DIFFICULTY_MAX`. */
export const BELIEF_GRID: readonly number[] = buildGrid();

function buildGrid(): number[] {
  const points: number[] = [];
  for (let x = DIFFICULTY_MIN; x <= DIFFICULTY_MAX + 1e-9; x += BELIEF_GRID_STEP) {
    points.push(Math.round(x * 1e6) / 1e6);
  }
  return points;
}

/**
 * A normalised probability mass over {@link BELIEF_GRID}.
 *
 * `mass[i]` is the current probability that the child's standing is at `BELIEF_GRID[i]`. Held as a
 * plain array so a belief is cheap to copy and trivially serialisable, though nothing serialises
 * one today — it is rebuilt from the trace instead.
 */
export interface Belief {
  readonly mass: readonly number[];
}

/** The response model's parameters. Both are design assumptions; see the module docblock. */
export interface ResponseModel {
  /** Logistic discrimination per scale point. */
  readonly slope: number;
  /**
   * Chance-success floor `c`. `0` is the no-guessing model the standing fit used to assume, which
   * is wrong for a bank in which every item is multiple choice; 0.2 is a five-option item.
   */
  readonly guessing: number;
}

/**
 * Probability the child answers an item of this difficulty correctly.
 *
 * Exported because the measurement scripts and the tests both need to assert against the SAME
 * response model the engine selects with, rather than against a restatement of it.
 */
export function responseProbability(
  theta: number,
  difficulty: number,
  model: ResponseModel,
): number {
  const floor = clamp01(model.guessing);
  const skill = 1 / (1 + Math.exp(-model.slope * (theta - difficulty)));
  return floor + (1 - floor) * skill;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * A weakly-informative normal prior centred on the grade-band seed.
 *
 * Centred on the seed rather than the scale midpoint because the requested grade band is genuine
 * prior information about the child and the engine already acts on it — today's staircase STARTS
 * at the seed, which is a far stronger commitment to the band than any proper prior. At the
 * default `priorSd` of 6 the prior carries 1/36 of a unit of precision against roughly 0.25 from
 * each well-targeted item, so it is outweighed within about four items per area and exists only to
 * keep a very short or wholly one-sided trace off the scale bounds.
 *
 * That last clause is a deliberate difference from the staircase, and the degenerate responders in
 * `real-bank.test.ts` are where it shows: a child correct on everything served is only known to be
 * "at least as able as the hardest item they saw", so an honest belief settles just above that
 * item rather than asserting the top of the scale.
 */
export function priorBelief(seedDifficulty: number, priorSd: number): Belief {
  const mass: number[] = [];
  const usePrior = Number.isFinite(priorSd) && priorSd > 0;
  for (const theta of BELIEF_GRID) {
    if (!usePrior) {
      mass.push(1);
      continue;
    }
    const z = (theta - seedDifficulty) / priorSd;
    mass.push(Math.exp(-0.5 * z * z));
  }
  return { mass: normalise(mass) };
}

function normalise(mass: readonly number[]): number[] {
  let total = 0;
  for (const m of mass) total += m;
  if (!(total > 0)) return BELIEF_GRID.map(() => 1 / BELIEF_GRID.length);
  return mass.map((m) => m / total);
}

/** Fold one observed response into a belief. Pure; returns a new belief. */
export function updateBelief(
  belief: Belief,
  difficulty: number,
  correct: boolean,
  model: ResponseModel,
): Belief {
  const next: number[] = [];
  for (let i = 0; i < BELIEF_GRID.length; i++) {
    const p = responseProbability(BELIEF_GRID[i] as number, difficulty, model);
    next.push((belief.mass[i] as number) * (correct ? p : 1 - p));
  }
  return { mass: normalise(next) };
}

/** Posterior mean — the belief's point estimate of the child's standing. */
export function beliefMean(belief: Belief): number {
  let sum = 0;
  for (let i = 0; i < BELIEF_GRID.length; i++) {
    sum += (BELIEF_GRID[i] as number) * (belief.mass[i] as number);
  }
  return sum;
}

/** Posterior variance. */
export function beliefVariance(belief: Belief): number {
  const mu = beliefMean(belief);
  let sum = 0;
  for (let i = 0; i < BELIEF_GRID.length; i++) {
    const d = (BELIEF_GRID[i] as number) - mu;
    sum += d * d * (belief.mass[i] as number);
  }
  return sum;
}

/**
 * Posterior standard deviation — the uncertainty attached to {@link beliefMean}.
 *
 * This is the quantity area selection ranks on and the one the "how much do we still not know
 * about this area" question is answered with. It is a POSTERIOR SD from the engine's own belief,
 * deliberately not the same number as `abilityStandardError` in the scoring package, which is the
 * conditional SE of a separate maximum-a-posteriori fit computed after the fact for reporting. The
 * two answer the same question with the same response model and land close together, and
 * `posterior.test.ts` pins that they do — but they are not interchangeable and neither is derived
 * from the other.
 */
export function beliefSd(belief: Belief): number {
  return Math.sqrt(beliefVariance(belief));
}

/**
 * Fisher information an item of this difficulty carries about a child AT this ability.
 *
 *     I = (dP/dtheta)^2 / (P (1 - P))
 *
 * This is the cheap criterion: one evaluation per candidate at a single point, against MEPV's two
 * full posterior updates per candidate. Maximising it at the posterior mean is `mfi`.
 *
 * WHERE IT PEAKS IS NOT WHERE A FLOOR-FREE MODEL SAYS. With `c = 0` this reduces to
 * `a^2 P (1 - P)`, maximised at `P = 0.5`, i.e. at an item difficulty equal to the ability. With
 * `c > 0` it peaks at `P = (1 + sqrt(1 + 8c)) / 4` — Birnbaum (1968), restated in Lord (1980) and
 * generalised by Magis (2013) — which is about 0.653 for `c = 0.2`, at a difficulty roughly
 * `0.27 / a` BELOW the ability. So the most informative item is one the child passes about two
 * times in three.
 *
 * NOTHING HERE ASSUMES SYMMETRY, and that is deliberate. The usual up-down machinery for 1PL and
 * 2PL banks leans on the information function being symmetric about the ability, so "one step
 * easier" and "one step harder" are interchangeable moves. A lower asymptote breaks that: the
 * function is skewed, and the whole point of the shift above is that the two directions are no
 * longer equivalent. Every rule in `selection.ts` that reads this ranks candidates by the value it
 * returns rather than by distance from a target, so the asymmetry is carried rather than assumed
 * away — the one remaining symmetric construct, the `difficultyWindow` filter, is a bound on how
 * far off-target a thin bank may push an item and is deliberately far wider than the shift.
 *
 * `P * (1 - P)` is close to 65.3% for a five-option item as an UPPER anchor rather than a
 * constant: an estimated `c` is usually below the reciprocal of the option count, because
 * distractors are not equally attractive and children below an item do not choose uniformly.
 */
export function fisherInformation(theta: number, difficulty: number, model: ResponseModel): number {
  const floor = clamp01(model.guessing);
  const skill = 1 / (1 + Math.exp(-model.slope * (theta - difficulty)));
  const p = floor + (1 - floor) * skill;
  if (!(p > 0) || !(p < 1)) return 0;
  const slopeAtTheta = model.slope * (1 - floor) * skill * (1 - skill);
  return (slopeAtTheta * slopeAtTheta) / (p * (1 - p));
}

/**
 * Expected posterior variance after asking an item of this difficulty — the MEPV criterion.
 *
 *     E[Var(theta | u)] = P(correct) * Var(theta | correct) + P(wrong) * Var(theta | wrong)
 *
 * Minimising it is the formal statement of "whichever way they answer, the range shrinks as much
 * as possible", which is what a binary search does when it picks the midpoint. Both branches are
 * evaluated, so the number already accounts for the fact that a very easy item is likely to be
 * answered correctly and teach almost nothing when it is.
 *
 * IT IS NOT THE DEFAULT, AND THE LITERATURE IS WHY. The theoretical case is that Fisher
 * information at a point silently assumes the point is right, while MEPV integrates over the
 * belief — a real difference while the belief is wide, which is where this change is aimed. The
 * empirical case is much weaker than that argument suggests. Chen, Ankenmann and Chang found the
 * sophisticated criteria only marginally better early and no precision advantage past about ten
 * items. Choi and Swartz found no clear benefit from more sophisticated criteria at all, showed
 * one supposedly superior criterion to be mathematically identical to a simpler one, and found
 * maximum information at an EAP estimate very competitive. Van der Linden's favourable result
 * confounds criterion with prior: the maximum-information arm ran on a flat prior while the
 * Bayesian arms had an informative one.
 *
 * The reading that survives all three is that the gain comes from averaging over a range of
 * ability rather than from predicting the next response — so a posterior-based ESTIMATE may be
 * doing the work, and the response prediction may be paying for nothing. `pnpm
 * exam:selection-diversity` runs both arms on this bank to settle it here rather than by argument,
 * and the answer is split: `mfi` reaches a stated precision sooner, `mepv` lands closer to the
 * planted ability and reports an interval that matches its own error. That is why this ships and
 * `mfi` does not, and why the reasoning is written out at `DEFAULT_CONFIG` rather than assumed.
 */
export function expectedPosteriorVariance(
  belief: Belief,
  difficulty: number,
  model: ResponseModel,
): number {
  const n = BELIEF_GRID.length;
  const p: number[] = new Array<number>(n);
  let pCorrect = 0;
  for (let i = 0; i < n; i++) {
    const pi = responseProbability(BELIEF_GRID[i] as number, difficulty, model);
    p[i] = pi;
    pCorrect += (belief.mass[i] as number) * pi;
  }

  // A response whose outcome is already certain cannot change the belief, so the expected
  // posterior variance is simply the current one. Guarding here keeps the branch normalisations
  // below from dividing by zero at the scale bounds.
  const pWrong = 1 - pCorrect;
  if (!(pCorrect > 0) || !(pWrong > 0)) return beliefVariance(belief);

  let meanC = 0;
  let meanW = 0;
  for (let i = 0; i < n; i++) {
    const theta = BELIEF_GRID[i] as number;
    const w = belief.mass[i] as number;
    meanC += theta * ((w * (p[i] as number)) / pCorrect);
    meanW += theta * ((w * (1 - (p[i] as number))) / pWrong);
  }

  let varC = 0;
  let varW = 0;
  for (let i = 0; i < n; i++) {
    const theta = BELIEF_GRID[i] as number;
    const w = belief.mass[i] as number;
    const dC = theta - meanC;
    const dW = theta - meanW;
    varC += dC * dC * ((w * (p[i] as number)) / pCorrect);
    varW += dW * dW * ((w * (1 - (p[i] as number))) / pWrong);
  }

  return pCorrect * varC + pWrong * varW;
}

/** The response model a session is configured to select under. */
export function modelOf(config: SessionState['config']): ResponseModel {
  return { slope: config.responseSlope, guessing: config.guessingFloor };
}

/**
 * Rebuild an area's belief from its stored trace.
 *
 * The trace is the only input, so this is reproducible from persisted results alone and a replayed
 * session reaches the same belief as the live one. Items are folded in trace order; the model is
 * order-independent, but keeping the order makes the intermediate beliefs meaningful for the
 * item-by-item measurements in the harness.
 */
export function beliefFor(state: SessionState, area: Area): Belief {
  return beliefFromTrace(state.areas[area], GRADE_BAND_SEED[state.gradeBand], state.config);
}

/** {@link beliefFor} against a bare area state, for callers that hold one without a session. */
export function beliefFromTrace(
  areaState: Pick<AreaState, 'trace'>,
  seedDifficulty: number,
  config: SessionState['config'],
): Belief {
  const model = modelOf(config);
  let belief = priorBelief(seedDifficulty, config.posteriorPriorSd);
  for (const observation of areaState.trace) {
    belief = updateBelief(belief, observation.difficulty, observation.correct, model);
  }
  return belief;
}
