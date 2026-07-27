import type {
  DomainKey,
  DomainScore,
  EngagementSummary,
  ScoredItem,
  ScoringPolicy,
  ScreenDecision,
  ScreeningResult,
} from './types';
import { computeFitIndex, decisionFromFit } from './scoring';
import { hashSeed, mulberry32 } from './rng';
import { scoreDomains } from './item-scoring';

/**
 * Final, structure-agnostic rollup: engagement gate -> per-domain scores ->
 * composite fit index -> band decision + seeded-bootstrap confidence. This is
 * pure scoring, not routing (routing lived in the excluded `select.ts` /
 * `session.ts`).
 */

/** The claim boundary attached to every result (R10, D-006). */
export const CLAIM_BOUNDARY =
  'Synthetic screening result (synthetic_only=true, validated=false). A reliable ' +
  'screen indicates likely giftedness and Timeback-fit; it is NOT an admission ' +
  'decision and is NOT evidence of program impact (R10, D-006).';

/** Session engagement summary (the gate) from scored items. */
export function summarizeEngagement(
  items: readonly ScoredItem[],
  policy: ScoringPolicy,
): EngagementSummary {
  const total = items.length;
  const valid = items.filter((i) => i.effortValid).length;
  const rapid = items.filter((i) => i.rapidGuess).length;
  const offTask = items.filter((i) => !i.onTask).length;
  const minRate = policy.minEngagementRate ?? 0.8;
  const rte = total > 0 ? valid / total : null;
  return {
    totalResponses: total,
    effortValidResponses: valid,
    rapidGuessResponses: rapid,
    offTaskResponses: offTask,
    responseTimeEffort: rte,
    engagementValid: total > 0 && rte !== null && rte >= minRate,
  };
}

/** Composite theta = mean theta over domains with at least one effort-valid item. */
export function compositeTheta(domainScores: readonly DomainScore[]): number {
  const withItems = domainScores.filter((d) => d.itemsEffortValid > 0);
  if (withItems.length === 0) return 0;
  return withItems.reduce((s, d) => s + d.theta, 0) / withItems.length;
}

/**
 * Seeded-bootstrap decision confidence in [0,1]. Resample the effort-valid
 * items (with replacement) using a seeded RNG, recompute the per-domain scores,
 * fit index, and band decision, and report the fraction of resamples that agree
 * with the point decision. Deterministic given the same `seed`, so it replays
 * bit-for-bit (R7).
 */
export function decisionConfidence(
  items: readonly ScoredItem[],
  domains: readonly DomainKey[],
  policy: ScoringPolicy,
  pointDecision: ScreenDecision,
  seed: string,
  iterations = 200,
): number {
  const valid = items.filter((i) => i.effortValid);
  if (valid.length === 0 || iterations <= 0) return 0;
  const rng = mulberry32(hashSeed(`${seed}:confidence`));
  let agree = 0;
  for (let it = 0; it < iterations; it++) {
    const resample: ScoredItem[] = [];
    for (let k = 0; k < valid.length; k++) {
      const idx = Math.min(Math.floor(rng() * valid.length), valid.length - 1);
      resample.push(valid[idx]!);
    }
    const ds = scoreDomains(resample, domains, policy);
    if (decisionFromFit(computeFitIndex(ds, policy), policy) === pointDecision) agree += 1;
  }
  return agree / iterations;
}

/** Inputs for {@link buildResult}. */
export interface BuildResultInput {
  items: readonly ScoredItem[];
  domains: readonly DomainKey[];
  policy: ScoringPolicy;
  seed: string;
  /** Bootstrap iterations for confidence (pinned; default 200). */
  confidenceIterations?: number;
}

/** Assemble the canonical screening result from scored items. */
export function buildResult(input: BuildResultInput): ScreeningResult {
  const { items, domains, policy, seed } = input;
  const iterations = input.confidenceIterations ?? 200;
  const domainScores = scoreDomains(items, domains, policy);
  const engagement = summarizeEngagement(items, policy);
  const fitIndex = computeFitIndex(domainScores, policy);
  const composite = compositeTheta(domainScores);
  const pointDecision: ScreenDecision = engagement.engagementValid
    ? decisionFromFit(fitIndex, policy)
    : 'retry';
  const confidence = decisionConfidence(items, domains, policy, pointDecision, seed, iterations);
  return {
    policyVersion: policy.policyVersion,
    seed,
    domainScores,
    compositeTheta: composite,
    fitIndex,
    engagement,
    decision: pointDecision,
    decisionConfidence: confidence,
    claimBoundary: CLAIM_BOUNDARY,
    syntheticOnly: true,
    validated: false,
  };
}
