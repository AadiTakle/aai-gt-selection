import {
  DOMAIN_NAMES,
  emptyDomainRecord,
  type Decision,
  type DomainEstimate,
  type DomainName,
  type GiftedCriteria,
  type PrecisionConfig,
  type ScoreSheet,
  type StopReason,
} from '@platform/domain';
import { evaluateCriteria } from './criteria.js';
import { MultiPosterior, replay, type ScoredResponse } from './multi-posterior.js';
import { ENGINE_VERSION } from './version.js';

export interface SheetInput {
  readonly sessionId: string;
  readonly snapshotId: string;
  /**
   * The operative ability line for this session, from the app's resolved config. The sheet's
   * probabilities are reported at this threshold. The criteria may use a different one.
   */
  readonly threshold: number;
  readonly criteria: GiftedCriteria;
  /** The answered trace, in order. Unanswered served items are not included. */
  readonly responses: readonly ScoredResponse[];
  readonly precision: PrecisionConfig;
  readonly perDomainMinimum: number;
  readonly recommendProbability: number;
  /** Including any item currently served but not yet answered. */
  readonly itemsServed: number;
  /** True when selection had nothing eligible left to offer. */
  readonly poolExhausted: boolean;
  readonly abandoned: boolean;
  /**
   * Domains the session's pool can actually serve. A domain with no items cannot hold up the stop
   * rule, which matters because twenty of the fifty-three types have no scorable items at all.
   * Defaults to all four.
   */
  readonly domainsAvailable?: readonly DomainName[];
  readonly computedAt?: string;
}

/**
 * Why the session ended, or null if it has not.
 *
 * The order of these checks is the precedence. Abandonment wins because it is a fact about the child
 * rather than a conclusion about them. The item cap comes next because it is a hard boundary. Only
 * then does confidence get consulted, and exhaustion is last because "we ran out of questions" is
 * the least informative thing that can be said about a session that could still have decided.
 */
function decideStop(
  input: SheetInput,
  posterior: MultiPosterior,
  scored: number,
  coverageMet: boolean,
): StopReason | null {
  if (input.abandoned) return 'abandoned';
  if (input.itemsServed >= input.precision.maxItems) return 'item-cap';

  if (scored >= input.precision.minItems && coverageMet) {
    const pAbove = posterior.pAbove('composite', input.threshold);
    if (pAbove >= input.precision.confidenceAbove) return 'confident-above';
    if (pAbove <= 1 - input.precision.confidenceBelow) return 'confident-below';
  }

  if (input.poolExhausted) return 'bank-exhausted';
  return null;
}

export function computeSheet(input: SheetInput): ScoreSheet {
  const posterior = replay(input.responses);
  const available = input.domainsAvailable ?? DOMAIN_NAMES;

  const domains = emptyDomainRecord<DomainEstimate>(() => ({
    scope: 'composite',
    mean: 0,
    sd: 0,
    interval: [0, 0],
    pAboveThreshold: 0,
    itemsScored: 0,
    itemsUnscorable: 0,
    informationAccumulated: 0,
  }));
  for (const domain of DOMAIN_NAMES) {
    domains[domain] = posterior.estimate(domain, input.threshold);
  }

  const scored = posterior.itemsScored('composite');
  const coverageMet = DOMAIN_NAMES.every(
    (domain) =>
      !available.includes(domain) || domains[domain].itemsScored >= input.perDomainMinimum,
  );

  const stopReason = decideStop(input, posterior, scored, coverageMet);
  const composite = posterior.estimate('composite', input.threshold);
  const decision: Decision | null =
    stopReason === null
      ? null
      : composite.pAboveThreshold >= input.recommendProbability
        ? 'recommend'
        : 'no-recommendation';

  return {
    sessionId: input.sessionId,
    engineVersion: ENGINE_VERSION,
    criteriaVersion: input.criteria.version,
    snapshotId: input.snapshotId,
    computedAt: input.computedAt ?? new Date().toISOString(),
    composite,
    domains,
    itemsServed: input.itemsServed,
    stopped: stopReason !== null,
    stopReason,
    decision,
    meetsCriteria: evaluateCriteria(posterior, input.criteria),
    derivedFromResponseCount: input.responses.length,
  };
}
