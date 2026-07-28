import { itemInformation, responseLogLikelihood } from '../irt';
import type { IrtParameters, ScoredResponse } from '../types';

/**
 * Item-selection criteria for the psychometric sweep: maximum Fisher information
 * (MFI) and a posterior-weighted (Bayesian) alternative.
 *
 * WHY THIS IS NOT PART OF THE ENGINE'S PUBLIC SURFACE: `../index.ts` states that
 * the engine scores whatever a sequencer produced and does NOT itself route or
 * select items — the test structure is unapproved and must stay pluggable. These
 * functions exist to answer one research question ("does adaptive selection move
 * the per-domain precision wall, or is the wall the item format?"), so they live
 * in the lab module and are deliberately NOT re-exported from the Lambda payload.
 * Wiring them into a sequencer would be a structure decision, which is not made
 * here.
 *
 * CLAIM BOUNDARY: every SE these criteria produce is computed under the same 3PL
 * that generated the responses, so it is a statement about estimator precision
 * given known item parameters — not about the precision achievable over a real,
 * uncalibrated bank, where selection also has to survive parameter error and
 * exposure control.
 *
 * Pure and dependency-free.
 */

/** Anything carrying pinned 3PL parameters is selectable. */
export interface SelectableItem {
  irt: IrtParameters;
}

/**
 * Index of the pool item with the highest Fisher information at `theta`, or
 * `null` for an empty pool. Ties resolve to the earliest index so selection stays
 * deterministic and a run is reproducible from its seed alone.
 */
export function maxInformationIndex(pool: readonly SelectableItem[], theta: number): number | null {
  let bestIndex: number | null = null;
  let bestInfo = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < pool.length; i++) {
    const info = itemInformation(theta, pool[i]!.irt);
    if (info > bestInfo) {
      bestInfo = info;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/** A discrete posterior over theta: parallel nodes and (unnormalized) weights. */
export interface PosteriorGrid {
  nodes: number[];
  weights: number[];
}

export interface PosteriorGridOptions {
  priorMean?: number;
  priorSd?: number;
  gridPoints?: number;
  gridMin?: number;
  gridMax?: number;
}

/**
 * Normalized posterior over a fixed theta grid, given the responses so far.
 *
 * Computed here rather than reusing `../theta.ts` because `estimateThetaEap`
 * returns only the posterior's first two moments and the recorded baseline run
 * depends on its exact numeric path; the selection criterion needs the weights
 * themselves, and this module must not perturb the production estimator.
 */
export function posteriorGrid(
  responses: readonly ScoredResponse[],
  options: PosteriorGridOptions = {},
): PosteriorGrid {
  const { priorMean = 0, priorSd = 1, gridPoints = 61, gridMin = -4, gridMax = 4 } = options;
  const step = (gridMax - gridMin) / (gridPoints - 1);
  const nodes: number[] = [];
  const logWeights: number[] = [];
  let maxLog = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < gridPoints; i++) {
    const node = gridMin + i * step;
    const z = (node - priorMean) / priorSd;
    let logW = -0.5 * z * z;
    for (const r of responses) logW += responseLogLikelihood(node, r.irt, r.correct);
    nodes.push(node);
    logWeights.push(logW);
    if (logW > maxLog) maxLog = logW;
  }
  // Subtract the maximum before exponentiating: a long response string underflows
  // to an all-zero weight vector otherwise, which silently returns the prior.
  let sum = 0;
  const weights = logWeights.map((logW) => {
    const w = Math.exp(logW - maxLog);
    sum += w;
    return w;
  });
  return { nodes, weights: sum > 0 ? weights.map((w) => w / sum) : weights };
}

/**
 * Index of the pool item maximizing information averaged over the current
 * posterior, `E_theta[I(theta)]` — the maximum-expected-information criterion.
 *
 * Differs from MFI exactly when the posterior is wide, which is the regime a short
 * per-domain form lives in: MFI bets the next item on a point estimate built from
 * a handful of responses, and with a `c = 0.25` floor an early wrong guess can
 * park that point estimate somewhere the child is not.
 */
export function posteriorWeightedInformationIndex(
  pool: readonly SelectableItem[],
  posterior: PosteriorGrid,
): number | null {
  let bestIndex: number | null = null;
  let bestInfo = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < pool.length; i++) {
    let expected = 0;
    for (let j = 0; j < posterior.nodes.length; j++) {
      expected += posterior.weights[j]! * itemInformation(posterior.nodes[j]!, pool[i]!.irt);
    }
    if (expected > bestInfo) {
      bestInfo = expected;
      bestIndex = i;
    }
  }
  return bestIndex;
}
