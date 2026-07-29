import type { ServedItem } from '@gt-selection/exam-engine';
import { learningRateReadout, type LearningTrial } from '@gt-selection/exam-scoring';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  LEARNING_BLOCK_AREA,
  LEARNING_BLOCK_LENGTH,
  blockCanRun,
  clearLearningBlockHandoff,
  loadLearningBlockHandoff,
  nextBlockItem,
  novelBlockPool,
  saveLearningBlockHandoff,
  summariseLearningBlock,
  toLearningTrials,
  type LearningBlockHandoff,
} from './phase2';

function served(itemId: string, difficulty: number, domain = LEARNING_BLOCK_AREA): ServedItem {
  return {
    itemId,
    typeCode: 'SYN-TYPE-01',
    domain,
    difficulty,
    ageBands: [],
    content: {},
    syntheticOnly: true,
    validated: false,
  } as unknown as ServedItem;
}

/** A child whose ability outruns the difficulty ramp, so the block really does show a climb. */
function climbingBlock(n: number, lambda: number, seed = 7): LearningTrial[] {
  let s = seed;
  const rand = (): number => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  return Array.from({ length: n }, (_, t) => {
    const ability = 10 + lambda * t;
    const difficulty = 11 + 0.15 * t;
    const p = 1 / (1 + Math.exp(-(ability - difficulty)));
    return { difficulty, score: rand() < p ? 1 : 0, trialIndex: t };
  });
}

describe('novelBlockPool', () => {
  it('keeps only unseen items in the block area', () => {
    const pool = [
      served('a', 10),
      served('b', 11),
      served('c', 12, 'verbal'),
      served('d', 13, 'quantitative'),
    ];
    const novel = novelBlockPool(pool, ['a']);
    expect(novel.map((i) => i.itemId)).toEqual(['b']);
  });

  it('treats an empty seen-set as everything in the area being available', () => {
    const pool = [served('a', 10), served('b', 11)];
    expect(novelBlockPool(pool, [])).toHaveLength(2);
  });
});

describe('blockCanRun', () => {
  const pool = Array.from({ length: 40 }, (_, i) => served(`i-${i}`, 10 + i * 0.1));

  it('is true when the area has enough unseen items', () => {
    expect(blockCanRun(pool, [], 30)).toBe(true);
  });

  it('is false once too many have already been served', () => {
    const seen = pool.slice(0, 15).map((i) => i.itemId);
    expect(blockCanRun(pool, seen, 30)).toBe(false);
  });

  it('defaults to the configured block length', () => {
    const justUnder = pool.slice(0, LEARNING_BLOCK_LENGTH - 1);
    expect(blockCanRun(justUnder, [])).toBe(false);
  });
});

describe('nextBlockItem', () => {
  const pool = [served('far-low', 5), served('near', 12), served('far-high', 19)];

  it('picks the unseen item closest to the target difficulty', () => {
    expect(nextBlockItem(pool, [], 12.2, 1)?.itemId).toBe('near');
  });

  it('never re-serves an item already administered', () => {
    const picked = nextBlockItem(pool, ['near'], 12.2, 1);
    expect(picked?.itemId).not.toBe('near');
  });

  it('returns null once the pool is exhausted', () => {
    expect(nextBlockItem(pool, ['far-low', 'near', 'far-high'], 12, 1)).toBeNull();
  });
});

describe('toLearningTrials', () => {
  it('indexes trials in the order they were served', () => {
    const trials = toLearningTrials([
      { difficulty: 11, score: 1 },
      { difficulty: 12, score: 0 },
    ]);
    expect(trials).toEqual([
      { difficulty: 11, score: 1, trialIndex: 0 },
      { difficulty: 12, score: 0, trialIndex: 1 },
    ]);
  });
});

describe('summariseLearningBlock', () => {
  it('refuses to read a pace from an unfinished block, and says so without blaming the child', () => {
    const readout = summariseLearningBlock(climbingBlock(9, 0.4), undefined, 30);
    expect(readout.band).toBe('indeterminate');
    expect(readout.lambda).toBeNull();
    expect(readout.reason).toMatch(/not finished/i);
    expect(readout.reason).not.toMatch(/slow|behind|struggl/i);
  });

  it('with no comparison group it still fits the pace but declines to grade it', () => {
    const readout = summariseLearningBlock(climbingBlock(30, 0.4), undefined, 30);
    expect(readout.band).toBe('indeterminate');
    expect(readout.trialCount).toBe(30);
    // The pace is on the record even though it is not reportable as a band.
    expect(readout.lambda).not.toBeNull();
    expect(readout.reason).toMatch(/comparison group/i);
    // The explanation must point at the test, never at the child.
    expect(readout.reason).toMatch(/limit of how new this test is/i);
  });

  it('defers to the engine readout once a reference distribution exists', () => {
    const trials = climbingBlock(30, 0.4);
    const reference = { mean: 0, sd: 0.15 };
    expect(summariseLearningBlock(trials, reference, 30).band).toBe(
      learningRateReadout(trials, { reference, minTrials: 30 }).band,
    );
  });
});

/** jsdom here ships a non-functional localStorage, so back it with a real in-memory store. */
function installLocalStorage(): void {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
}

describe('learning-block handoff', () => {
  const handoff: LearningBlockHandoff = {
    sessionId: 'SESS-SYN-1',
    examSessionId: null,
    gradeBand: '4-5',
    standing: 13.4,
    seenItemIds: ['a', 'b'],
    finishedAt: '2026-07-29T00:00:00.000Z',
    blockLength: 30,
  };

  beforeEach(() => {
    installLocalStorage();
    clearLearningBlockHandoff();
  });

  it('round-trips so the block can be started in a later sitting', () => {
    saveLearningBlockHandoff(handoff);
    expect(loadLearningBlockHandoff()).toEqual(handoff);
  });

  it('returns null when nothing has been handed over', () => {
    expect(loadLearningBlockHandoff()).toBeNull();
  });

  it('is cleared once the block is done', () => {
    saveLearningBlockHandoff(handoff);
    clearLearningBlockHandoff();
    expect(loadLearningBlockHandoff()).toBeNull();
  });

  it('ignores a corrupt or half-written handoff rather than starting a bad block', () => {
    window.localStorage.setItem('gt-exam-learning-block', '{"sessionId":"x"}');
    expect(loadLearningBlockHandoff()).toBeNull();
    window.localStorage.setItem('gt-exam-learning-block', 'not json');
    expect(loadLearningBlockHandoff()).toBeNull();
  });
});
