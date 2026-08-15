import type { DomainName } from './domains.js';

export type EstimateScope = DomainName | 'composite';

export type StopReason =
  | 'confident-above'
  | 'confident-below'
  | 'item-cap'
  | 'bank-exhausted'
  | 'abandoned';

export type Decision = 'recommend' | 'no-recommendation';

/**
 * How a recommendation was reached.
 *
 * Recorded because the two routes are different statements about a child. "Recommended on the composite"
 * says their overall reasoning cleared the bar. "Recommended because quantitative alone" says it did not,
 * and that one domain did — which is the right answer for a spiky profile and the wrong thing to describe
 * as the same result. A sheet that cannot say which happened cannot be explained to a family later.
 */
export type PassRoute =
  | { readonly via: 'composite' }
  | { readonly via: 'domain'; readonly domains: readonly DomainName[] };

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
  /** Null while the session runs, and whenever the decision is `no-recommendation`. */
  readonly passRoute: PassRoute | null;
  readonly meetsCriteria: boolean;
  readonly derivedFromResponseCount: number;
  /**
   * Items in the trace the pool could not account for, which is always empty on a healthy recompute.
   *
   * Non-empty means evidence was at risk of being dropped — an item revised out of the pool, or a type
   * retired — and the sheet says so rather than reporting a posterior built from less than the trace.
   */
  readonly unaccountedItemIds: readonly string[];
}
