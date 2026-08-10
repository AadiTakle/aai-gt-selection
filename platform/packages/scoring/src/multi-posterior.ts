import { Posterior, information } from '@gt/engine';
import {
  DOMAIN_NAMES,
  type DomainEstimate,
  type DomainName,
  type EstimateScope,
  type ItemParameters,
} from '@platform/domain';

/**
 * Ability belief held per domain and in aggregate.
 *
 * Five posteriors: one for each of the four blueprint domains, plus a composite. Each domain
 * posterior sees only its own items. The composite sees every scored response, which makes it
 * exactly the pooled posterior the prototype already ships — so adding per-domain estimation cannot
 * change the number the existing engine would have produced. That property is asserted directly in
 * `scoring.test.ts` and is the reason this change is safe to make.
 *
 * Every posterior is the `Posterior` from `@gt/engine`, not a reimplementation. The grid, the prior
 * and the Bayes update are the ones the existing 23 engine tests cover.
 */

interface ScopeState {
  readonly posterior: Posterior;
  /**
   * Parameters of every scored item, kept so that accumulated information can be evaluated at
   * whatever threshold the caller asks about rather than at one fixed at construction time.
   */
  readonly seen: ItemParameters[];
  scored: number;
  unscorable: number;
}

function freshScope(): ScopeState {
  return { posterior: new Posterior(), seen: [], scored: 0, unscorable: 0 };
}

export class MultiPosterior {
  private readonly scopes: Map<EstimateScope, ScopeState> = new Map([
    ...DOMAIN_NAMES.map((d) => [d, freshScope()] as const),
    ['composite', freshScope()] as const,
  ]);

  private scope(scope: EstimateScope): ScopeState {
    const state = this.scopes.get(scope);
    if (!state) throw new Error(`unknown estimate scope ${String(scope)}`);
    return state;
  }

  /**
   * Fold one response in.
   *
   * A response the platform could not mark is counted and discarded. It cannot be treated as wrong,
   * because a renderer this host failed to interpret says nothing about the child, and treating it
   * as evidence would put an invented answer into the estimate.
   */
  update(domain: DomainName, params: ItemParameters, correct: boolean | null): void {
    const target = this.scope(domain);
    const composite = this.scope('composite');

    if (correct === null) {
      target.unscorable += 1;
      composite.unscorable += 1;
      return;
    }

    for (const state of [target, composite]) {
      state.posterior.update(params, correct);
      state.seen.push(params);
      state.scored += 1;
    }
  }

  pAbove(scope: EstimateScope, threshold: number): number {
    return this.scope(scope).posterior.probabilityAbove(threshold);
  }

  itemsScored(scope: EstimateScope): number {
    return this.scope(scope).scored;
  }

  estimate(scope: EstimateScope, threshold: number): DomainEstimate {
    const state = this.scope(scope);
    return {
      scope,
      mean: state.posterior.mean(),
      sd: state.posterior.sd(),
      interval: state.posterior.interval(0.9),
      pAboveThreshold: state.posterior.probabilityAbove(threshold),
      itemsScored: state.scored,
      itemsUnscorable: state.unscorable,
      informationAccumulated: state.seen.reduce((sum, p) => sum + information(threshold, p), 0),
    };
  }
}

export interface ScoredResponse {
  readonly domain: DomainName;
  /** The parameters as served, not as currently stored. A recompute reads these from the trace. */
  readonly params: ItemParameters;
  readonly correct: boolean | null;
}

/**
 * Rebuild belief from a trace.
 *
 * This is the whole reason the trace is authoritative rather than the sheet. Live scoring and a
 * historical backfill both call this, so a recompute cannot drift from what production did. Replay
 * costs two posterior updates per response over a 161-point grid, which for a 40-item session is
 * about 13,000 multiply-adds.
 */
export function replay(responses: readonly ScoredResponse[]): MultiPosterior {
  const posterior = new MultiPosterior();
  for (const r of responses) posterior.update(r.domain, r.params, r.correct);
  return posterior;
}
