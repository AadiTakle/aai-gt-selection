/**
 * A simulated novel block, for looking at how the learning-rate interval contracts.
 *
 * DEVELOPMENT ONLY. Nothing here touches a real child, a real session, or the database. It exists so
 * `/dev/learning-interval` can show the interval narrowing trial by trial without waiting for
 * thirty to sixty hand-answered items, and so the contraction can be compared against the ladder
 * `MEASURED_POSTERIOR_SE_LADDER` records.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT. The administration path is the shipped one: `nextBlockTarget`
 * chooses the difficulty to aim at (which is `nextTargetTheta`, the same estimator the interval is
 * fitted with, in its targeting role) and `nextBlockItem` picks the item (which is the engine's
 * `selectNextNovelServedItem`). That closed loop is the whole reason the measurement is contaminated
 * — the fit's own output decides what gets served next — so a simulation that pre-scripted the
 * difficulty walk would show a contraction that no real block produces.
 *
 * The CHILD is the synthetic part: a one-parameter logistic with an explicit guessing floor and a
 * climbing ability, which is the same responder `exam-learning-block-harness.ts` uses. It models no
 * fatigue, no strategy, no engagement, and no learning that is not a straight line in ability. A
 * contraction seen here is evidence about the estimator's precision on this block design, and it is
 * not evidence that a within-session climb measures learning in a person (D-030).
 */
import { selectNextNovelServedItem, type ServedItem } from '@gt-selection/exam-engine';
import { type LearningTrial } from '@gt-selection/exam-scoring';

import { LEARNING_BLOCK_AREA, blockGuessingFloor, nextBlockTarget } from './phase2';

/** The chance floor of a five-option item — what the banks the block draws from actually are. */
export const FIVE_OPTION_FLOOR = 0.2;

export interface SimulatedChild {
  /** Ability at trial 0, on the 1–20 scale. */
  readonly theta0: number;
  /** True climb in scale points per trial. 0 is the null learner the contamination floor is about. */
  readonly lambda: number;
  /**
   * The settled standing estimate handed over from Phase 1, deliberately allowed to differ from
   * `theta0`. `STAGE2_QUESTION_DESIGN` §4.4 names regression to the mean at the handover as its own
   * source of spurious λ, so a simulation that set these equal would flatter the estimator.
   */
  readonly standing: number;
  /** The item format's real chance floor, as the CHILD experiences it. */
  readonly responderFloor: number;
  readonly seed: number;
}

export interface SimulatedTrial extends LearningTrial {
  readonly itemId: string;
  /** Difficulty the targeting rule asked for, before the pool rounded it to an available item. */
  readonly target: number;
}

export interface SimulatedBlock {
  readonly trials: SimulatedTrial[];
  /** True when the pool ran out before the requested length. Reported, never silent. */
  readonly exhausted: boolean;
}

/** Deterministic uniform draws, so a seed in the URL reproduces a run exactly. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * An idealised pool on a fixed difficulty grid — E-095's "0.5-point item grid".
 *
 * This is the control condition, not a shortcut. It carries no bank at all, so a contraction
 * measured on it isolates what the estimator and the adaptive loop do from what any particular
 * bank's grid does to them. The bank-recovery measurement's headline is that `FLU-OPCHAIN-01` has arrived at this bound: at
 * 30 trials the two are statistically indistinguishable, so there is no bank on the other side of it.
 *
 * `perRung` matches the harness's 12 so a long block visiting a narrow band of rungs does not
 * exhaust the pool and end up measuring exhaustion instead.
 */
export function idealGridPool(step = 0.5, perRung = 12): ServedItem[] {
  const items: ServedItem[] = [];
  for (let d = 1; d <= 20 + 1e-9; d += step) {
    const difficulty = Math.round(d * 100) / 100;
    for (let i = 0; i < perRung; i += 1) {
      items.push({
        itemId: `grid-${difficulty.toFixed(2)}-${String(i)}`,
        typeCode: 'GRID-IDEAL-01',
        domain: LEARNING_BLOCK_AREA,
        difficulty,
        ageBands: ['4-5'],
        content: {},
        syntheticOnly: true,
        validated: false,
      });
    }
  }
  return items;
}

/**
 * Administer one novel block against a synthetic child, using the shipped administration path.
 *
 * Nothing about the difficulty walk is pre-scripted: it is whatever `nextBlockTarget` and the pool's
 * grid produce together, which is the only reason the run says anything about either.
 */
export function simulateLearningBlock(
  pool: readonly ServedItem[],
  child: SimulatedChild,
  length: number,
): SimulatedBlock {
  const rand = mulberry32(child.seed);
  const trials: SimulatedTrial[] = [];
  const administered: string[] = [];
  let exhausted = false;
  // The same floor the shipped runner derives, off the same pool, so the simulated block is aimed
  // under the block's own response model rather than a shared default. Deliberately NOT
  // `child.responderFloor`: the estimator only ever knows what the bank declares, and a simulation
  // that handed it the truth would hide exactly the misspecification it exists to expose.
  const { guessing } = blockGuessingFloor(pool);

  for (let t = 0; t < length; t += 1) {
    const target = nextBlockTarget(trials, child.standing, guessing);
    const item = selectNextNovelServedItem(pool, administered, target, child.seed);
    if (item === null) {
      exhausted = true;
      break;
    }
    administered.push(item.itemId);

    const ability = child.theta0 + child.lambda * t;
    const star = 1 / (1 + Math.exp(-(ability - item.difficulty)));
    const p = child.responderFloor + (1 - child.responderFloor) * star;

    trials.push({
      itemId: item.itemId,
      difficulty: item.difficulty,
      score: rand() < p ? 1 : 0,
      trialIndex: t,
      target,
    });
  }

  return { trials, exhausted };
}
