import { standardNormals } from '../persona-sim/latent';

/**
 * Synthetic per-item dwell / interaction evidence for the engagement-detector
 * study.
 *
 * WHY IT IS SEPARATE FROM `../persona-sim/sampler.ts`: the recorded baseline in
 * `docs/PERSONA_SIM_RESULTS.md` is reproducible only while the sampler's per-trial
 * RNG substream is untouched. Drawing this signal inside the sampler would consume
 * draws and silently move every number in that run. So the signal is generated
 * downstream, in its own seeded substream keyed off the trial that already
 * happened, and conditioned on the generator's on-task flag.
 *
 * WHAT IT MODELS: whatever a client could actually record per item — dwell time
 * distribution across the stem and options, scroll/hover/replay events, option
 * revisits, focus loss. Collapsed to one bounded "engagement evidence" score
 * because the study's question is not which widget to log but HOW SEPARABLE the
 * signal has to be before it is worth collecting.
 *
 * Every constant is an OPEN ASSUMPTION [A]. The separation between the on-task and
 * off-task distributions is the whole result: a detector's ceiling is set by that
 * separation, and no real dwell instrument is known to achieve it.
 */

export interface InteractionSignalOptions {
  /** Mean evidence score for an on-task trial. Default 0.80 [A]. */
  onTaskMean?: number;
  /** Mean evidence score for an off-task trial. Default 0.30 [A]. */
  offTaskMean?: number;
  /** SD of the evidence score within either state. Default 0.16 [A]. */
  sd?: number;
  /**
   * Multiplier on the on/off separation, holding the midpoint fixed. `1` is the
   * default instrument; `0` is a signal that carries no information at all. Lets
   * the sweep report how much detector quality a WORSE instrument still buys,
   * instead of only quoting the idealized case.
   */
  separation?: number;
}

/**
 * One bounded interaction-evidence draw in [0,1], conditioned on the generator's
 * on-task truth. Normal-then-clamped rather than a beta: the clamp is visible and
 * the two distributions stay directly comparable through one SD parameter.
 */
export function sampleInteractionScore(
  rand: () => number,
  onTask: boolean,
  options: InteractionSignalOptions = {},
): number {
  const { onTaskMean = 0.8, offTaskMean = 0.3, sd = 0.16, separation = 1 } = options;
  const midpoint = (onTaskMean + offTaskMean) / 2;
  const halfGap = ((onTaskMean - offTaskMean) / 2) * separation;
  const mean = midpoint + (onTask ? halfGap : -halfGap);
  const [z] = standardNormals(rand, 1);
  return Math.max(0, Math.min(1, mean + sd * z!));
}
