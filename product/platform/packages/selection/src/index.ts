/**
 * Question selection.
 *
 * Pure, and a pure function of one request record. Everything the algorithm needs is passed in, so
 * the eight variety layers can be measured over thousands of simulated sessions without a database
 * and the simulation that tunes the defaults runs exactly the code the Lambda runs.
 */

export { domainsOwed, eligible } from './eligibility.js';
export { EMPTY_EXPOSURE, exposureDamping, exposureRate } from './exposure.js';
export type { ExposureSnapshot } from './exposure.js';
export { buildIndex } from './index-model.js';
export type { SelectionIndex } from './index-model.js';
export type { SelectionRequest, SelectionResult } from './request.js';
export { rngFor } from './rng.js';
export type { Rng } from './rng.js';
export { domainOfLast, selectDeterministic, selectNext } from './select.js';
