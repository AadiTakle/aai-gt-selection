/**
 * Ability scoring.
 *
 * The measurement rules live in `@gt/qbank`'s `engine.ts`; this package translates the platform's records
 * into what it expects, stores the verdict as a `ScoreSheet`, and judges it against versioned criteria.
 * Nothing here reimplements a stop rule, a pass route or a posterior update — see `qbank-adapter.ts` for
 * the one place that decision is argued.
 */

export { evaluateCriteria } from './criteria.js';
export {
  coverageOf,
  domainCountsOf,
  posteriorsFromTrace,
  toAttempts,
  toEngineConfig,
  toPool,
  toQbankState,
  verdictFor,
} from './qbank-adapter.js';
export type { Coverage, EngineVerdict, ScoredResponse, TraceEntry } from './qbank-adapter.js';
export { computeSheet } from './sheet.js';
export type { SheetInput } from './sheet.js';
export { ENGINE_VERSION } from './version.js';
