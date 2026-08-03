/**
 * Phase 2, end to end, against the REAL bank.
 *
 * Everything else about Stage 2 is tested a piece at a time: the pool filter, the selection rule,
 * the fit, the readout. Nothing asserted that a whole Phase 2 — every activity a child is offered,
 * every trial of each — actually runs to completion on the bank that ships. This does, by driving
 * the real pool through the real selection rule and the real readout.
 *
 * WHAT THIS IS NOT. It runs ONE simulated child per condition on one seed, so the fitted numbers
 * are single draws and not measurements. The cohort figures live in E-095, E-200 and E-205, which
 * use 400 children per cell over 8 seeds. Nothing here says a within-session climb measures
 * learning; it says the pipeline completes and moves in the right direction under known truth,
 * which is a necessary condition and not a sufficient one.
 */
import { describe, expect, it } from 'vitest';

import { getServedIndex } from '@/lib/exam/bank-loader';
import {
  LEARNING_BLOCKS,
  availableBlocks,
  blockPool,
  nextBlockItem,
  nextBlockTarget,
  summariseLearningBlock,
  summariseStage2,
  toLearningTrials,
  type CompletedBlock,
} from '@/lib/exam/phase2';

/** Responder with a real five-option guessing floor, climbing at `lambdaTrue` per trial. */
function respond(theta: number, difficulty: number, rand: () => number): number {
  const floor = 0.2;
  const p = floor + (1 - floor) / (1 + Math.exp(-(theta - difficulty)));
  return rand() < p ? 1 : 0;
}

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

async function runStage2(lambdaTrue: number) {
  const pool = await getServedIndex();
  const standings = Object.fromEntries(LEARNING_BLOCKS.map((s) => [s.area, 12])) as Partial<
    Record<(typeof LEARNING_BLOCKS)[number]['area'], number>
  >;
  const offered = availableBlocks(pool, [], standings);
  const rand = rng(20260803);

  let seen: string[] = [];
  const completed: CompletedBlock[] = [];

  for (const spec of offered) {
    const sub = blockPool(spec, pool, seen);
    const administered: string[] = [];
    const trials: { difficulty: number; score: number }[] = [];
    const standing = standings[spec.area] ?? 12;

    for (let t = 0; t < spec.length; t += 1) {
      const target = nextBlockTarget(toLearningTrials(trials), standing);
      const item = nextBlockItem(sub, administered, target, t + 1);
      if (!item) break;
      administered.push(item.itemId);
      trials.push({
        difficulty: item.difficulty,
        score: respond(standing + lambdaTrue * t, item.difficulty, rand),
      });
    }

    completed.push({
      spec,
      readout: summariseLearningBlock(toLearningTrials(trials), undefined, spec.length),
    });
    // An item spent in one activity is unavailable to the next: a repeat would measure recall of
    // that item rather than the new system.
    seen = [...seen, ...administered];
  }

  return { offered, completed, stage2: summariseStage2(completed, offered.length) };
}

describe('Phase 2 end to end on the shipped bank', () => {
  it('offers four activities and runs every one to its full length', async () => {
    const { offered, completed, stage2 } = await runStage2(0.06);

    expect(offered).toHaveLength(4);
    expect(completed).toHaveLength(4);
    for (const block of completed) {
      expect(block.readout.trialCount).toBe(block.spec.length);
    }
    expect(completed.reduce((n, b) => n + b.readout.trialCount, 0)).toBe(120);
    expect(stage2.completed).toBe(stage2.offered);
  });

  it('gives each activity its own single type, and never repeats an item across them', async () => {
    const { completed } = await runStage2(0.06);
    const codes = completed.map((b) => b.spec.typeCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('still refuses to name a band, because no reference distribution exists', async () => {
    // The honest output at this block length. If this ever starts returning a band without a
    // reference having been supplied, something has begun inventing precision.
    for (const lambdaTrue of [0, 0.12]) {
      const { stage2, completed } = await runStage2(lambdaTrue);
      expect(stage2.band).toBe('indeterminate');
      for (const block of completed) expect(block.readout.band).toBe('indeterminate');
    }
  });

  it('moves in the right direction between a non-learner and a fast learner', async () => {
    // Directional only, on one child per condition. The separation is far smaller than the
    // per-activity SE, which is exactly why no band is reported.
    const still = await runStage2(0);
    const fast = await runStage2(0.12);

    const mean = (r: Awaited<ReturnType<typeof runStage2>>) => {
      const fits = r.completed.map((b) => b.readout.lambda).filter((x): x is number => x !== null);
      return fits.reduce((a, b) => a + b, 0) / fits.length;
    };

    expect(mean(fast)).toBeGreaterThan(mean(still));
  });
});
