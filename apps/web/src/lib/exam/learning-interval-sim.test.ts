import {
  MEASURED_POSTERIOR_SE_LADDER,
  learningRateIntervalSeries,
} from '@gt-selection/exam-scoring';
import { describe, expect, it } from 'vitest';

import { LEARNING_BLOCK_AREA, LEARNING_BLOCK_TARGET_OFFSET } from './phase2';
import {
  FIVE_OPTION_FLOOR,
  idealGridPool,
  simulateLearningBlock,
  type SimulatedChild,
} from './learning-interval-sim';

const child: SimulatedChild = {
  theta0: 11,
  lambda: 0.08,
  standing: 10.4,
  responderFloor: FIVE_OPTION_FLOOR,
  seed: 21,
};

describe('idealGridPool', () => {
  it('covers the whole scale on a 0.5-point grid, deep enough not to exhaust', () => {
    const pool = idealGridPool();
    const difficulties = [...new Set(pool.map((item) => item.difficulty))].sort((a, b) => a - b);

    expect(difficulties[0]).toBe(1);
    expect(difficulties[difficulties.length - 1]).toBe(20);
    expect(difficulties).toHaveLength(39);
    expect(pool.every((item) => item.domain === LEARNING_BLOCK_AREA)).toBe(true);
    // Every rung deep enough that a 60-trial block camped on one rung still finds items.
    expect(pool.length / difficulties.length).toBeGreaterThanOrEqual(12);
  });
});

describe('simulateLearningBlock', () => {
  const pool = idealGridPool();

  it('is deterministic in the seed and different across seeds', () => {
    const a = simulateLearningBlock(pool, child, 30);
    const b = simulateLearningBlock(pool, child, 30);
    const other = simulateLearningBlock(pool, { ...child, seed: 22 }, 30);

    expect(a.trials).toEqual(b.trials);
    expect(a.trials.map((t) => t.score)).not.toEqual(other.trials.map((t) => t.score));
  });

  it('never repeats an item, because a repeat measures recall of that item', () => {
    const { trials } = simulateLearningBlock(pool, child, 60);
    expect(new Set(trials.map((trial) => trial.itemId)).size).toBe(trials.length);
  });

  it('indexes trials in served order and reports the target it aimed at', () => {
    const { trials, exhausted } = simulateLearningBlock(pool, child, 30);

    expect(exhausted).toBe(false);
    expect(trials).toHaveLength(30);
    expect(trials.map((trial) => trial.trialIndex)).toEqual(
      Array.from({ length: 30 }, (_, i) => i),
    );
    // The first target is fixed by the handover, before any fit has information to project from.
    expect(trials[0]!.target).toBeCloseTo(child.standing + LEARNING_BLOCK_TARGET_OFFSET, 6);
  });

  /**
   * The load-bearing property. The difficulty walk must come from the fit's own output, because that
   * closed loop is the mechanism E-200 measured: a fit that reads chance successes as ability aims
   * the next item higher and then reads its own walk back as a climb. A pre-scripted ladder here
   * would show a contraction no real block produces.
   */
  it('walks difficulty up for a learner and does not for a null learner', () => {
    const learner = simulateLearningBlock(pool, { ...child, lambda: 0.15 }, 60);
    const nullLearner = simulateLearningBlock(pool, { ...child, lambda: 0 }, 60);

    const drift = (trials: readonly { difficulty: number }[]) => {
      const half = Math.floor(trials.length / 2);
      const mean = (xs: readonly { difficulty: number }[]) =>
        xs.reduce((sum, t) => sum + t.difficulty, 0) / xs.length;
      return mean(trials.slice(half)) - mean(trials.slice(0, half));
    };

    expect(drift(learner.trials)).toBeGreaterThan(1);
    expect(drift(learner.trials)).toBeGreaterThan(drift(nullLearner.trials));
  });

  it('reports exhaustion rather than silently shortening the block', () => {
    const thin = idealGridPool(0.5, 1).slice(0, 10);
    const { trials, exhausted } = simulateLearningBlock(thin, child, 30);

    expect(exhausted).toBe(true);
    expect(trials.length).toBeLessThan(30);
  });

  it('responds to the guessing floor: a floorless child scores less on items above them', () => {
    const hard = { ...child, theta0: 4, standing: 4 };
    const fiveOption = simulateLearningBlock(pool, hard, 30);
    const floorless = simulateLearningBlock(pool, { ...hard, responderFloor: 0 }, 30);

    const correct = (trials: readonly { score: number }[]) =>
      trials.reduce((sum, trial) => sum + trial.score, 0);
    expect(correct(floorless.trials)).toBeLessThan(correct(fiveOption.trials));
  });
});

/**
 * The end-to-end property the dev view exists to show: run the shipped administration path against a
 * synthetic child and the posterior contracts along the measured ladder.
 *
 * This is the one assertion that would catch a change to either half — the simulation drifting away
 * from the shipped path, or the interval module drifting away from the estimator — because only the
 * combination lands on the measured cells.
 */
describe('the simulated block contracts along the measured ladder', () => {
  it('lands within 0.5x-2x of every measured cell, and narrows monotonically across them', () => {
    const { trials } = simulateLearningBlock(idealGridPool(), child, 60);
    const steps = learningRateIntervalSeries(trials, { contaminationFloor: 0.0097 });

    const observed = MEASURED_POSTERIOR_SE_LADDER.map((rung) => ({
      rung,
      se: steps[rung.trials - 1]!.posteriorSe!,
    }));

    for (const { rung, se } of observed) {
      expect(se).toBeGreaterThan(rung.meanPosteriorSe * 0.5);
      expect(se).toBeLessThan(rung.meanPosteriorSe * 2);
    }
    for (let i = 1; i < observed.length; i += 1) {
      expect(observed[i]!.se).toBeLessThan(observed[i - 1]!.se);
    }
  });
});
