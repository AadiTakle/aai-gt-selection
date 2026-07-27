import type {
  DomainKey,
  DomainScore,
  ItemParameters,
  RawResponse,
  ScoredItem,
  ScoredResponse,
  ScoringPolicy,
} from './types';
import { isRapidGuess } from './rte';
import { estimateThetaEap, type ThetaOptions } from './theta';
import { consistencyFromRts, learningRate, thetaToPercentile } from './scoring';

/**
 * Per-item and per-domain scoring. Structure-agnostic: it scores whatever
 * responses it is handed, grouped by whatever `domain` the pinned parameters
 * declare — no assumption of adaptive routing, staging, or fixed forms.
 */

/** Resolve correctness for a raw response against its pinned parameters. */
export function resolveCorrect(raw: RawResponse, params: ItemParameters): boolean {
  if (params.answerKey !== undefined && raw.answer !== undefined) {
    return raw.answer === params.answerKey;
  }
  if (raw.correct !== undefined) return raw.correct;
  if (raw.rawScore !== undefined) {
    const max = params.maxScore ?? 1;
    return raw.rawScore >= max;
  }
  return false;
}

/** Normalized [0,1] score: `rawScore / maxScore` (polytomous) or `1` / `0` (dichotomous). */
export function normalizedScore(raw: RawResponse, params: ItemParameters, correct: boolean): number {
  if (raw.rawScore !== undefined) {
    const max = params.maxScore ?? 1;
    if (max <= 0) return correct ? 1 : 0;
    return Math.max(0, Math.min(1, raw.rawScore / max));
  }
  return correct ? 1 : 0;
}

/** Score a single raw response into a `ScoredItem`, applying the RTE effort gate. */
export function scoreItem(raw: RawResponse, params: ItemParameters): ScoredItem {
  const correct = resolveCorrect(raw, params);
  const score = normalizedScore(raw, params, correct);
  const onTask = raw.onTask ?? true;
  const rapidGuess = isRapidGuess(raw.rtMs, params.rapidGuessThresholdMs);
  return {
    itemId: params.itemId,
    domain: params.domain,
    order: raw.order,
    irt: params.irt,
    difficultyLevel: params.difficultyLevel,
    correct,
    score,
    rtMs: raw.rtMs,
    rapidGuess,
    onTask,
    effortValid: onTask && !rapidGuess,
  };
}

/**
 * Score a session log against a pinned item-parameter map. Responses whose
 * `itemId` is not in the map are dropped (unknown item). Output is sorted
 * deterministically by administration order, then `itemId`.
 */
export function scoreItems(
  log: readonly RawResponse[],
  paramsById: ReadonlyMap<string, ItemParameters>,
): ScoredItem[] {
  const scored: ScoredItem[] = [];
  for (const raw of log) {
    const params = paramsById.get(raw.itemId);
    if (!params) continue;
    scored.push(scoreItem(raw, params));
  }
  scored.sort(
    (l, r) => l.order - r.order || (l.itemId < r.itemId ? -1 : l.itemId > r.itemId ? 1 : 0),
  );
  return scored;
}

function eapOptionsFromPolicy(policy: ScoringPolicy): ThetaOptions {
  const options: ThetaOptions = {};
  if (policy.priorMean !== undefined) options.priorMean = policy.priorMean;
  if (policy.priorSd !== undefined) options.priorSd = policy.priorSd;
  return options;
}

/**
 * Per-domain score from already-scored items. Theta uses ONLY effort-valid
 * responses (effort-moderated IRT); percentile, ceiling, learning rate, and
 * consistency are computed from those same effort-valid items.
 */
export function scoreDomain(
  items: readonly ScoredItem[],
  domain: DomainKey,
  policy: ScoringPolicy,
): DomainScore {
  const inDomain = items.filter((i) => i.domain === domain).sort((l, r) => l.order - r.order);
  const valid = inDomain.filter((i) => i.effortValid);
  const scored: ScoredResponse[] = valid.map((i) => ({ irt: i.irt, correct: i.correct }));
  const { theta, se } = estimateThetaEap(scored, eapOptionsFromPolicy(policy));
  const orders = valid.map((i) => i.order);
  const scores = valid.map((i) => i.score);
  const rts = valid.map((i) => i.rtMs);
  const correctDifficulties = valid.filter((i) => i.correct).map((i) => i.difficultyLevel);
  return {
    domain,
    theta,
    se,
    percentile: valid.length > 0 ? thetaToPercentile(theta) : null,
    itemsScored: inDomain.length,
    itemsEffortValid: valid.length,
    maxDifficultyReached: correctDifficulties.length > 0 ? Math.max(...correctDifficulties) : 0,
    learningRate: learningRate(orders, scores),
    consistency: consistencyFromRts(rts),
  };
}

/** Per-domain scores for a list of domains (deterministic per input order). */
export function scoreDomains(
  items: readonly ScoredItem[],
  domains: readonly DomainKey[],
  policy: ScoringPolicy,
): DomainScore[] {
  return domains.map((d) => scoreDomain(items, d, policy));
}
