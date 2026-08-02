import type { ServedItem } from '@gt-selection/exam-engine';
import { learningRateReadout, type LearningTrial } from '@gt-selection/exam-scoring';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  LEARNING_BLOCKS,
  LEARNING_BLOCK_AREA,
  LEARNING_BLOCK_LENGTH,
  LEARNING_BLOCK_TYPE,
  availableBlocks,
  blockCanRun,
  blockPool,
  clearLearningBlockHandoff,
  loadLearningBlockHandoff,
  nextBlockItem,
  novelBlockPool,
  saveLearningBlockHandoff,
  summariseLearningBlock,
  toLearningTrials,
  type LearningBlockHandoff,
} from './phase2';

const BLOCK_TYPE = LEARNING_BLOCK_TYPE ?? 'SYN-TYPE-01';

function served(
  itemId: string,
  difficulty: number,
  domain = LEARNING_BLOCK_AREA,
  typeCode = BLOCK_TYPE,
): ServedItem {
  return {
    itemId,
    typeCode,
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

  /**
   * The block administers ONE type, because the thing being learned is that type's hidden system
   * and nothing carries across a mixture (§1.2). Before this filter the wired fluid pool gave the
   * block 4-10 machine-chain trials out of 30, interleaved with ten other types.
   */
  it('keeps only the block type, not every type in the area', () => {
    const pool = [
      served('block-a', 10),
      served('other', 10.1, LEARNING_BLOCK_AREA, 'FLU-MATRIX-01'),
      served('block-b', 10.2),
    ];
    expect(novelBlockPool(pool, []).map((i) => i.itemId)).toEqual(['block-a', 'block-b']);
  });

  it('refuses to start a block the block type cannot fill on its own', () => {
    const mixed = [
      ...Array.from({ length: 10 }, (_, i) => served(`block-${String(i)}`, 10 + i * 0.1)),
      ...Array.from({ length: 40 }, (_, i) =>
        served(`other-${String(i)}`, 10 + i * 0.1, LEARNING_BLOCK_AREA, 'FLU-MATRIX-01'),
      ),
    ];
    expect(blockCanRun(mixed, [], 30)).toBe(false);
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

  it('with no comparison group it still fits the pace but declines to report it', () => {
    const readout = summariseLearningBlock(climbingBlock(30, 0.4), undefined, 30);
    expect(readout.band).toBe('indeterminate');
    expect(readout.trialCount).toBe(30);
    // The pace stays on the record as a diagnostic even though it is not reportable.
    expect(readout.lambda).not.toBeNull();
    expect(readout.reason).toMatch(/comparison group/i);
    // The explanation must point at the test, never at the child.
    expect(readout.reason).toMatch(/limits of how new this test is/i);
  });

  /**
   * The readout position, asserted rather than assumed: Gate B has not run, so no block may name a
   * band, and a 30-item block cannot support an absolute rate on ANY bank — a cohort that learned
   * nothing fits a positive climb on the purpose-built one. A wired reference would be the one way
   * a band could appear, so this pins the wired call rather than the pure function.
   */
  it('names no band and quotes no rate however hard the block climbs', () => {
    for (const rate of [0, 0.05, 0.2, 0.5, 1]) {
      const readout = summariseLearningBlock(climbingBlock(30, rate), undefined, 30);
      expect(readout.band, `climb ${String(rate)}`).toBe('indeterminate');
      // Nothing the family sees may contain the fitted number, in any spelling.
      expect(readout.reason).not.toMatch(/\d/);
      expect(readout.reason).not.toMatch(/fast|slow|above|below|typical|ahead|behind/i);
    }
  });

  it('defers to the engine readout once a reference distribution exists', () => {
    const trials = climbingBlock(30, 0.4);
    // A contamination floor has to be declared before any band can be named (E-200); 0 here keeps
    // this test about the delegation rather than about the bar.
    const reference = { mean: 0, sd: 0.15, contaminationFloor: 0 };
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
    standings: { fluid_reasoning: 13.4 },
    seenItemIds: ['a', 'b'],
    finishedAt: '2026-07-29T00:00:00.000Z',
    blockLength: 30,
    completedBlockIds: [],
  };

  beforeEach(() => {
    installLocalStorage();
    clearLearningBlockHandoff();
  });

  it('round-trips so the block can be started in a later sitting', () => {
    saveLearningBlockHandoff(handoff);
    expect(loadLearningBlockHandoff()).toEqual(handoff);
  });

  it('resumes a handoff written before Phase 2 had more than one activity', () => {
    // No `standings`, no `completedBlockIds` — exactly what an in-flight run would have stored.
    window.localStorage.setItem(
      'gt-exam-learning-block',
      JSON.stringify({
        sessionId: 'SESS-OLD-1',
        examSessionId: null,
        gradeBand: '4-5',
        standing: 12,
        seenItemIds: ['a'],
        finishedAt: '2026-07-29T00:00:00.000Z',
        blockLength: 30,
      }),
    );
    const loaded = loadLearningBlockHandoff();
    expect(loaded?.standings.fluid_reasoning).toBe(12);
    expect(loaded?.completedBlockIds).toEqual([]);
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

describe('multi-activity Phase 2', () => {
  /** A pool holding `count` unseen items for each of the given activity specs. */
  function poolFor(specs: readonly (typeof LEARNING_BLOCKS)[number][], count: number) {
    return specs.flatMap((spec) =>
      Array.from({ length: count }, (_, i) =>
        served(`${spec.id}-${i}`, 10, spec.area, spec.typeCode),
      ),
    );
  }

  const allStandings = Object.fromEntries(LEARNING_BLOCKS.map((s) => [s.area, 12]));

  it('offers only the activities whose bank is actually wired', () => {
    // Exactly the situation on `dev`: one type banked, three not.
    const pool = poolFor(LEARNING_BLOCKS.slice(0, 1), LEARNING_BLOCK_LENGTH);
    const offered = availableBlocks(pool, [], allStandings);
    expect(offered.map((s) => s.id)).toEqual(['fluid']);
  });

  it('offers all four once every bank is present', () => {
    const pool = poolFor(LEARNING_BLOCKS, LEARNING_BLOCK_LENGTH);
    expect(availableBlocks(pool, [], allStandings)).toHaveLength(4);
  });

  it('drops an activity whose area never settled a standing', () => {
    const pool = poolFor(LEARNING_BLOCKS, LEARNING_BLOCK_LENGTH);
    const { spatial: _dropped, ...missingSpatial } = allStandings;
    expect(availableBlocks(pool, [], missingSpatial).map((s) => s.id)).not.toContain('spatial');
  });

  it('drops an activity left with too few unseen items by Phase 1', () => {
    const pool = poolFor(LEARNING_BLOCKS, LEARNING_BLOCK_LENGTH);
    const spatial = LEARNING_BLOCKS[1]!;
    const seen = pool.filter((i) => i.typeCode === spatial.typeCode).map((i) => i.itemId);
    expect(availableBlocks(pool, seen, allStandings).map((s) => s.id)).not.toContain(spatial.id);
  });

  it('does not re-offer an activity already completed, so a resumed run continues', () => {
    const pool = poolFor(LEARNING_BLOCKS, LEARNING_BLOCK_LENGTH);
    const offered = availableBlocks(pool, [], allStandings, ['fluid', 'spatial']);
    expect(offered.map((s) => s.id)).toEqual(['quantitative', 'verbal']);
  });

  it('keeps each activity single-type — the system a child induces cannot span types', () => {
    const pool = poolFor(LEARNING_BLOCKS, LEARNING_BLOCK_LENGTH);
    for (const spec of LEARNING_BLOCKS) {
      const codes = new Set(blockPool(spec, pool, []).map((i) => i.typeCode));
      expect([...codes]).toEqual([spec.typeCode]);
    }
  });
});
