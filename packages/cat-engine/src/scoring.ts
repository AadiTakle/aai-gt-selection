import type { DomainScore, ScoringPolicy, ScreenDecision } from './types';

/**
 * Scoring primitives: percentile mapping, within-session learning rate (OLS
 * slope), RT consistency, the tunable fit composite, and the GT-owned band
 * decision. Recovered from commit 2b458cb; the composite / decision are fully
 * policy-driven, so this stays structure-agnostic (no adaptive-routing logic).
 */

/** Standard normal CDF (Abramowitz & Stegun 7.1.26). */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-0.5 * x * x);
  const poly =
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = d * poly;
  return x >= 0 ? 1 - p : p;
}

/** Percentile (0-100) of a theta on the N(0,1) reference scale. */
export function thetaToPercentile(theta: number): number {
  return Math.max(0, Math.min(100, normalCdf(theta) * 100));
}

/** OLS slope of y on x; `null` when there is fewer than two points or no x variation. */
export function slope(xs: readonly number[], ys: readonly number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    num += dx * (ys[i]! - meanY);
    den += dx * dx;
  }
  return den === 0 ? null : num / den;
}

/** Within-session learning rate: slope of item score over administration order. */
export function learningRate(order: readonly number[], scores: readonly number[]): number | null {
  return slope(order, scores);
}

/** Consistency in [0,1]: `1 - coefficient of variation of RT` (steadier => higher). */
export function consistencyFromRts(rts: readonly number[]): number | null {
  const clean = rts.filter((r) => r > 0);
  if (clean.length < 2) return null;
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  if (mean === 0) return null;
  const variance = clean.reduce((a, b) => a + (b - mean) * (b - mean), 0) / clean.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(1, 1 - cv));
}

/** Tunable fit composite: weighted-mean theta plus optional learning-rate / consistency modifiers. */
export function computeFitIndex(
  domainScores: readonly DomainScore[],
  policy: ScoringPolicy,
): number {
  let weightSum = 0;
  let thetaSum = 0;
  let lrSum = 0;
  let lrCount = 0;
  let consSum = 0;
  let consCount = 0;
  for (const ds of domainScores) {
    const weight = policy.fitWeights[ds.domain] ?? 0;
    weightSum += weight;
    thetaSum += weight * ds.theta;
    if (ds.learningRate != null) {
      lrSum += ds.learningRate;
      lrCount += 1;
    }
    if (ds.consistency != null) {
      consSum += ds.consistency;
      consCount += 1;
    }
  }
  const meanTheta = weightSum > 0 ? thetaSum / weightSum : 0;
  const meanLearningRate = lrCount > 0 ? lrSum / lrCount : 0;
  const meanConsistency = consCount > 0 ? consSum / consCount : 0;
  return (
    meanTheta +
    policy.learningRateWeight * meanLearningRate +
    policy.consistencyWeight * meanConsistency
  );
}

/** Tunable, GT-owned band decision from the fit index. NOT an admission decision (R10). */
export function decisionFromFit(fitIndex: number, policy: ScoringPolicy): ScreenDecision {
  if (fitIndex >= policy.admitCut) return 'admit';
  if (fitIndex < policy.retryCut) return 'retry';
  return 'defer';
}
