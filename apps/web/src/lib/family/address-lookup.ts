import { ADDRESS_SUGGESTIONS, type AddressSuggestion } from './vocab';

/**
 * Address lookup seam.
 *
 * Today this returns curated synthetic suggestions (no external call): the
 * browser CSP blocks third-party requests and the born-synthetic policy (B-06)
 * forbids storing real address data. When those are resolved, swap the body for
 * a server route that proxies a real provider (USPS Address API / Google Places
 * / Smarty) — mirroring how `/api/schools` proxies the NCES directory — and keep
 * this function's signature so callers don't change.
 *
 * TODO(B-06): replace with a real provider behind `/api/address?q=` once CSP +
 * privacy review allow real address data.
 */
export async function lookupAddress(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim().toLowerCase();
  if (!q) return ADDRESS_SUGGESTIONS;
  return ADDRESS_SUGGESTIONS.filter(
    (a) => a.label.toLowerCase().includes(q) || a.city.toLowerCase().includes(q),
  );
}
