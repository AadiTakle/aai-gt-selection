import { describe, it } from 'vitest';
import { itemOptionCount } from '@gt-selection/exam-engine';
import { getServedIndex } from '@/lib/exam/bank-loader';
import {
  LEARNING_BLOCKS,
  availableBlocks,
  blockPool,
  nextBlockItem,
  nextBlockTarget,
  summariseLearningBlock,
  toLearningTrials,
} from '@/lib/exam/phase2';

function rng(s: number) {
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

describe('PROBE floor', () => {
  it('null cohort per type', async () => {
    const pool = await getServedIndex();
    const standings = Object.fromEntries(LEARNING_BLOCKS.map((s) => [s.area, 12]));
    const out: string[] = [];
    for (const spec of availableBlocks(pool, [], standings)) {
      const sub = blockPool(spec, pool, []);
      const opts = itemOptionCount(sub[0]!) ?? 5;
      const floor = 1 / opts;
      let sum = 0,
        n = 0;
      for (let child = 0; child < 40; child += 1) {
        const rand = rng(1000 + child);
        const admin: string[] = [];
        const trials: { difficulty: number; score: number }[] = [];
        for (let t = 0; t < spec.length; t += 1) {
          const item = nextBlockItem(
            sub,
            admin,
            nextBlockTarget(toLearningTrials(trials), 12),
            t + 1,
          );
          if (!item) break;
          admin.push(item.itemId);
          const p = floor + (1 - floor) / (1 + Math.exp(-(12 - item.difficulty)));
          trials.push({ difficulty: item.difficulty, score: rand() < p ? 1 : 0 });
        }
        const r = summariseLearningBlock(toLearningTrials(trials), undefined, spec.length);
        if (r.lambda !== null) {
          sum += r.lambda;
          n += 1;
        }
      }
      out.push(
        `  ${spec.typeCode.padEnd(20)} options=${opts} floor=${floor.toFixed(3)} null_lambda=${(sum / n).toFixed(4)}`,
      );
    }
    throw new Error(`\nFLOORPROBE\n${out.join('\n')}\n`);
  });
});
