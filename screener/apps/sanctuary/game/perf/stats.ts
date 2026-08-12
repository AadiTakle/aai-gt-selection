/**
 * Frame timings, reduced to the four numbers that decide whether a child sees a stall.
 *
 * THE MEDIAN AND NOT THE MEAN. The mean of sixty good frames and one 200ms stall is a number that
 * describes neither of them, and it moves when the stall does, which makes it useless for telling
 * whether a change helped. The median is what the frame usually costs.
 *
 * p99 IS THE ONE THAT MATTERS MOST. At 60fps it is the worst frame in roughly every one and a half
 * seconds — which is to say, how often a child would actually feel the game hesitate. A change that
 * improves the median and leaves p99 where it was has not fixed anything they would notice.
 */
export interface Summary {
  n: number;
  median: number;
  p90: number;
  p99: number;
  max: number;
}

const EMPTY: Summary = { n: 0, median: 0, p90: 0, p99: 0, max: 0 };

export function summarise(samples: readonly number[]): Summary {
  if (samples.length === 0) return { ...EMPTY };
  /* Copied before sorting. The caller's array is a live ring buffer being appended to every frame,
     and sorting it in place would reorder history under the sampler. */
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q: number): number =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!;
  return {
    n: sorted.length,
    median: at(0.5),
    p90: at(0.9),
    p99: at(0.99),
    max: sorted[sorted.length - 1]!,
  };
}
