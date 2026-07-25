import type { Verifier } from './types';

/**
 * Per-type verifiers for the quantitative domain, keyed by `typeCode`.
 *
 * Each entry grades a constructed response that no generic verifier can handle.
 * Re-derive the expected response from `item.content` plus `item.answer` where
 * possible, rather than trusting a stored key, and never show correctness to the
 * client beyond the boolean this returns.
 */
export const quantitativeVerifiers: Record<string, Verifier> = {};
