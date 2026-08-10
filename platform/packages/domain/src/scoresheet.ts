import type { DomainName } from './domains.js';

export type EstimateScope = DomainName | 'composite';

export type StopReason =
  | 'confident-above'
  | 'confident-below'
  | 'item-cap'
  | 'bank-exhausted'
  | 'abandoned';

export type Decision = 'recommend' | 'no-recommendation';

export interface DomainEstimate {
  readonly scope: EstimateScope;
  /** Posterior mean, in logits. */
  readonly mean: number;
  readonly sd: number;
  /** Central 90% credible interval. */
  readonly interval: readonly [number, number];
  readonly pAboveThreshold: number;
  readonly itemsScored: number;
  /** Responses this scope could not mark. They move no evidence. */
  readonly itemsUnscorable: number;
  readonly informationAccumulated: number;
}

/**
 * A materialised view over a session's trace.
 *
 * Stored because a result screen should be one read and because criteria queries need an indexable
 * value, but never authoritative: the trace is. `derivedFromResponseCount` is how a reader detects
 * a sheet that has fallen behind its trace.
 */
export interface ScoreSheet {
  readonly sessionId: string;
  /** Pins the algorithm that produced this, so a recompute is comparable to its predecessor. */
  readonly engineVersion: string;
  readonly criteriaVersion: string;
  readonly snapshotId: string;
  readonly computedAt: string;
  readonly composite: DomainEstimate;
  readonly domains: Readonly<Record<DomainName, DomainEstimate>>;
  readonly itemsServed: number;
  readonly stopped: boolean;
  readonly stopReason: StopReason | null;
  readonly decision: Decision | null;
  readonly meetsCriteria: boolean;
  readonly derivedFromResponseCount: number;
}
