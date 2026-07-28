import type { RawBankItem } from '../bank-loader';
import { fluidVerifiers } from './fluid';
import { quantitativeVerifiers } from './quantitative';
import { spatialVerifiers } from './spatial';
import {
  verifyConstructedValue,
  verifyKeyed,
  verifyPlacementTolerance,
} from './generic';
import type { Verdict, Verifier } from './types';
import { verbalVerifiers } from './verbal';

export type { Verdict, Verifier } from './types';

/**
 * Per-type verifiers, merged across domains. A type appears here only when its
 * response is a constructed artefact (a path, a set of taps, a plane setting)
 * that the generic key/tolerance/value verifiers cannot grade.
 *
 * Domain files are owned separately so they can be written in parallel; a
 * duplicate `typeCode` across two domains is a bug and is asserted against in
 * `verifiers.test.ts`.
 */
export const perTypeVerifiers: Record<string, Verifier> = {
  ...fluidVerifiers,
  ...verbalVerifiers,
  ...quantitativeVerifiers,
  ...spatialVerifiers,
};

/**
 * Resolve the verifier for an item: an exact per-type verifier first, then the
 * generic verifier named by the item's server-only `scoring.rule`, then the
 * option-key default.
 *
 * `scripts/sync-exam-demos.mjs` refuses to wire a type that lands on no verifier
 * at all, so an ungradeable type never reaches the submit route — serving one
 * would score every child 0 and drag the adaptive estimate down. Keep the two in
 * step: `isVerifiable()` is what the sync consults.
 */
export function resolveVerifier(item: RawBankItem): Verifier {
  const perType = perTypeVerifiers[item.typeCode];
  if (perType) return perType;
  switch (item.scoring?.rule) {
    case 'placement_tolerance':
      return verifyPlacementTolerance;
    case 'constructed_value_equals_optimum':
      return verifyConstructedValue;
    default:
      return verifyKeyed;
  }
}

export function verify(item: RawBankItem, response: Record<string, unknown>): Verdict {
  return resolveVerifier(item)(item, response);
}

/** Type codes that have a dedicated verifier, for the sync script's gate. */
export function verifiedTypeCodes(): string[] {
  return Object.keys(perTypeVerifiers).sort();
}
