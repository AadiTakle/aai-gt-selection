import { describe, expect, it } from 'vitest';

import { summarise } from './stats';

describe('frame summary', () => {
  it('is empty rather than NaN when nothing has been sampled', () => {
    expect(summarise([])).toEqual({ n: 0, median: 0, p90: 0, p99: 0, max: 0 });
  });

  it('reports the middle sample, not the mean, so one stall cannot hide a good frame', () => {
    const s = summarise([10, 10, 10, 10, 1000]);
    expect(s.median).toBe(10);
    expect(s.max).toBe(1000);
    expect(s.n).toBe(5);
  });

  it('places p90 and p99 at the sample that many percent of frames beat', () => {
    const s = summarise(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(s.p90).toBe(91);
    expect(s.p99).toBe(100);
  });

  it('does not mutate the caller array', () => {
    const input = [3, 1, 2];
    summarise(input);
    expect(input).toEqual([3, 1, 2]);
  });
});
