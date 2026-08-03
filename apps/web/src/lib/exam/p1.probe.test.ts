import { describe, it } from 'vitest';
import { getServedIndex } from '@/lib/exam/bank-loader';
import { phase1Pool } from '@/lib/exam/phase2';
describe('P', () => {
  it('p', async () => {
    const pool = await getServedIndex();
    const p1 = phase1Pool(pool);
    const by = (arr: typeof pool) =>
      ['fluid_reasoning', 'verbal', 'quantitative', 'spatial']
        .map((a) => `${a.slice(0, 4)}=${arr.filter((i) => i.domain === a).length}`)
        .join(' ');
    const types = (arr: typeof pool) => new Set(arr.map((i) => i.typeCode)).size;
    throw new Error(
      `\nPOOL  all=${pool.length} types=${types(pool)}  ${by(pool)}\nP1    all=${p1.length} types=${types(p1)}  ${by(p1)}\n`,
    );
  });
});
