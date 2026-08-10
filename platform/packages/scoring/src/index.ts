/**
 * Ability scoring.
 *
 * Pure: takes a response trace and returns a score sheet. No I/O, no AWS, no knowledge of how the
 * trace was stored. That is what lets the same function serve a live answer and a mass recompute.
 */

export { evaluateCriteria } from './criteria.js';
export { MultiPosterior, replay } from './multi-posterior.js';
export type { ScoredResponse } from './multi-posterior.js';
export { computeSheet } from './sheet.js';
export type { SheetInput } from './sheet.js';
export { ENGINE_VERSION } from './version.js';
