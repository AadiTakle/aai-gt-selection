import {
  DOMAIN_NAMES,
  emptyDomainRecord,
  type Decision,
  type DomainEstimate,
  type DomainName,
  type GiftedCriteria,
  type PassRoute,
  type PrecisionConfig,
  type ScoreSheet,
  type SelectionCandidate,
} from '@platform/domain';
import { information } from '@gt/engine';
import { evaluateCriteria } from './criteria.js';
import {
  coverageOf,
  verdictFor,
  type Posteriors,
  type Progress,
  type QbankSessionConfig,
  type TraceEntry,
} from './qbank-adapter.js';
import { ENGINE_VERSION } from './version.js';

/**
 * The stored score sheet, derived from the engine's verdict.
 *
 * The engine decides; this shapes. Every rule that concludes something about a child — the item cap, the
 * item floor, domain coverage, the two confidence bars, the pass route — lives in `@gt/qbank`'s
 * `engine.ts` and is reached through `verdictFor`. What is added here is the platform's own record-keeping:
 * which algorithm produced the sheet, which criteria judged it, which snapshot it ran against, and whether
 * the trace and the pool still agree.
 *
 * The sheet keeps a richer per-domain readout than the engine's `DomainBand`, because it is the thing
 * stored and indexed: a band gives a mean and an interval, and a sheet also needs the probability above the
 * bar, the unscorable count, and the information accumulated, none of which are recoverable later.
 */

export interface SheetInput {
  readonly sessionId: string;
  readonly snapshotId: string;
  /** The session's resolved configuration, as the engine expects it. */
  readonly config: QbankSessionConfig;
  readonly criteria: GiftedCriteria;
  /** The answered trace, in order. */
  readonly trace: readonly TraceEntry[];
  /** Every candidate in the session's snapshot, unfiltered. */
  readonly candidates: readonly SelectionCandidate[];
  /** Including any item served but not yet answered. */
  readonly itemsServed: number;
  readonly poolExhausted?: boolean;
  readonly abandoned?: boolean;
  readonly computedAt?: string;
}

function estimateFor(
  scope: 'composite' | DomainName,
  posteriors: Posteriors,
  progress: Progress,
  trace: readonly TraceEntry[],
  threshold: number,
): DomainEstimate {
  const posterior = scope === 'composite' ? posteriors.composite : posteriors.byDomain[scope];
  const scoped = scope === 'composite' ? trace : trace.filter((entry) => entry.domain === scope);
  const scored = scoped.filter((entry) => entry.correct !== null);

  return {
    scope,
    mean: posterior.mean(),
    sd: posterior.sd(),
    interval: posterior.interval(0.9),
    pAboveThreshold: posterior.probabilityAbove(threshold),
    itemsScored: scored.length,
    itemsUnscorable: scoped.length - scored.length,
    informationAccumulated: scored.reduce(
      (sum, entry) => sum + information(threshold, entry.params),
      0,
    ),
  };
}

export function computeSheet(input: SheetInput): ScoreSheet {
  const verdict = verdictFor({
    config: input.config,
    trace: input.trace,
    candidates: input.candidates,
    ...(input.poolExhausted === undefined ? {} : { poolExhausted: input.poolExhausted }),
    ...(input.abandoned === undefined ? {} : { abandoned: input.abandoned }),
  });
  const { state, posteriors, progress } = verdict;
  const threshold = input.config.abilityThreshold;

  const domains = emptyDomainRecord<DomainEstimate>(() => estimateFor(
    'composite',
    posteriors,
    progress,
    [],
    threshold,
  ));
  for (const domain of DOMAIN_NAMES) {
    domains[domain] = estimateFor(domain, posteriors, progress, input.trace, threshold);
  }

  return {
    sessionId: input.sessionId,
    engineVersion: ENGINE_VERSION,
    criteriaVersion: input.criteria.version,
    snapshotId: input.snapshotId,
    computedAt: input.computedAt ?? new Date().toISOString(),
    composite: estimateFor('composite', posteriors, progress, input.trace, threshold),
    domains,
    itemsServed: input.itemsServed,
    stopped: state.stopped,
    stopReason: state.stopReason,
    decision: state.decision as Decision | null,
    passRoute: (state.passRoute ?? null) as PassRoute | null,
    meetsCriteria: evaluateCriteria(posteriors, progress, input.criteria),
    derivedFromResponseCount: input.trace.length,
    unaccountedItemIds: coverageOf(input.trace, input.candidates).missingItemIds,
  };
}

export type { PrecisionConfig };
