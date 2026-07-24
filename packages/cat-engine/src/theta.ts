import type { IrtParameters } from '@gt-selection/contracts';

import { probabilityCorrect, itemInformation, responseLogLikelihood } from './irt';

/**
 * Ability (theta) estimation for the adaptive engine (AX-02): EAP over a
 * quadrature grid (primary) and MLE via Fisher scoring (secondary).
 */

export interface ScoredResponse {
  irt: IrtParameters;
  correct: boolean;
}

export interface ThetaEstimate {
  theta: number;
  se: number;
}

export interface ThetaOptions {
  priorMean?: number;
  priorSd?: number;
  gridPoints?: number;
  gridMin?: number;
  gridMax?: number;
}

function normalPdf(x: number, mean: number, sd: number): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/**
 * Expected a posteriori (EAP) theta with a normal prior over a fixed grid.
 * Robust for short adaptive tests and all-correct / all-incorrect strings,
 * where the MLE diverges. Returns the posterior mean and posterior SD (as SE).
 */
export function estimateThetaEap(
  responses: readonly ScoredResponse[],
  options: ThetaOptions = {},
): ThetaEstimate {
  const { priorMean = 0, priorSd = 1, gridPoints = 61, gridMin = -4, gridMax = 4 } = options;
  const step = (gridMax - gridMin) / (gridPoints - 1);
  const nodes: number[] = [];
  const weights: number[] = [];
  let wSum = 0;
  let wThetaSum = 0;
  for (let i = 0; i < gridPoints; i++) {
    const node = gridMin + i * step;
    let logLik = 0;
    for (const r of responses) logLik += responseLogLikelihood(node, r.irt, r.correct);
    const w = normalPdf(node, priorMean, priorSd) * Math.exp(logLik);
    nodes.push(node);
    weights.push(w);
    wSum += w;
    wThetaSum += w * node;
  }
  if (wSum === 0) return { theta: priorMean, se: priorSd };
  const theta = wThetaSum / wSum;
  let varSum = 0;
  for (let i = 0; i < gridPoints; i++) {
    const d = nodes[i]! - theta;
    varSum += weights[i]! * d * d;
  }
  return { theta, se: Math.sqrt(varSum / wSum) };
}

/**
 * Maximum-likelihood theta via Newton-Raphson / Fisher scoring. Falls back to
 * EAP for uninformative (all-same) response strings where the MLE is +/- Inf.
 */
export function estimateThetaMle(
  responses: readonly ScoredResponse[],
  options: ThetaOptions = {},
): ThetaEstimate {
  if (responses.length === 0) {
    return { theta: options.priorMean ?? 0, se: options.priorSd ?? 1 };
  }
  const firstCorrect = responses[0]!.correct;
  if (responses.every((r) => r.correct === firstCorrect)) {
    return estimateThetaEap(responses, options);
  }

  let theta = 0;
  for (let iter = 0; iter < 50; iter++) {
    let score = 0;
    let info = 0;
    for (const r of responses) {
      const p = probabilityCorrect(theta, r.irt);
      const { a, c } = r.irt;
      const u = r.correct ? 1 : 0;
      if (p > 0 && p < 1) score += (a * (p - c) * (u - p)) / (p * (1 - c));
      info += itemInformation(theta, r.irt);
    }
    if (info === 0) break;
    const delta = score / info;
    theta = Math.max(-6, Math.min(6, theta + delta));
    if (Math.abs(delta) < 1e-5) break;
  }
  const info = responses.reduce((s, r) => s + itemInformation(theta, r.irt), 0);
  return { theta, se: info > 0 ? 1 / Math.sqrt(info) : (options.priorSd ?? 1) };
}
