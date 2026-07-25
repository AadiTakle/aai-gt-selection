/**
 * Rebuild session state from a stored trace.
 *
 * BUILD_PLAN §5 requires the whole pipeline to be reproducible from the persisted trace. Derived
 * core metrics are fitted from `AreaState.trace`, which `update` builds purely out of the
 * `ScoredItem`s it is given — so folding the stored results back through `update` reconstructs
 * the identical state, including every derived metric's adequacy. Nothing depends on live
 * in-memory state that is never written down.
 */
import { startState } from './state';
import { update } from './update';
import type { AgeBand, EngineConfig, ScoredItem, SessionState } from './types';

/**
 * Replay stored, server-scored items in their original order.
 *
 * @param gradeBand The band the session was started with (seeds the per-area difficulty).
 * @param items     The stored trace, oldest first.
 * @param overrides The same engine-config overrides the original session ran with.
 */
export function replaySession(
  gradeBand: AgeBand,
  items: readonly ScoredItem[],
  overrides?: Partial<EngineConfig>,
): SessionState {
  let state = startState(gradeBand, overrides);
  for (const item of items) state = update(state, item);
  return state;
}
