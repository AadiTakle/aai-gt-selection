import { bandRank } from '@gt/ui-contract';
import { DOMAIN_NAMES, type DomainName, type SelectionCandidate } from '@platform/domain';
import type { SelectionRequest } from './request.js';

/**
 * Which items this session may be offered at all, before any question of which is best.
 *
 * The order below is the order in spec section 9.1. Two filters are worth calling out because they
 * are easy to mistake for defensive noise:
 *
 * The scoring-mode filter is load-bearing, not belt-and-braces. Only 4,534 of the bank's 7,319 items
 * can be marked without a solver, and twenty of the fifty-three types have none at all. Serving an
 * item this platform cannot mark would spend a child's attention on a question that moves no
 * evidence.
 *
 * The persona filter is what stops a returning child sitting the same test twice. It costs one
 * indexed query per session and is the only part of eligibility that reaches outside the snapshot.
 */
export function eligible(req: SelectionRequest): readonly SelectionCandidate[] {
  const out: SelectionCandidate[] = [];

  for (const candidate of req.index.items) {
    if (!req.approvedTypes.has(candidate.typeCode)) continue;
    if (candidate.scoringMode !== 'deterministic_key') continue;

    // Matches the prototype: when a band is requested, an item declaring no bands is not assumed
    // to fit it.
    if (req.ageBand !== null && !candidate.ageBands.includes(req.ageBand)) continue;

    // A null ceiling means the app has not constrained reading. An app that cannot present text at
    // all says so with 'none', which ranks below every real band.
    if (req.maxReadingBand !== null && bandRank(candidate.readingBand) > bandRank(req.maxReadingBand)) {
      continue;
    }

    if (candidate.syntheticOnly && !req.allowSynthetic) continue;
    if (req.usedItemIds.has(candidate.itemId)) continue;
    if (req.personaRecentItemIds.has(candidate.itemId)) continue;

    out.push(candidate);
  }

  return out;
}

/**
 * Domains that still owe items and can still supply them.
 *
 * Coverage is served first rather than last because the stop rule cannot fire until every servable
 * domain has met its minimum. Deferring coverage would mean every session ran to the item cap, which
 * is the opposite of adaptive.
 */
export function domainsOwed(
  req: SelectionRequest,
  pool: readonly SelectionCandidate[],
): readonly DomainName[] {
  return DOMAIN_NAMES.filter(
    (domain) =>
      (req.domainServedCounts.get(domain) ?? 0) < req.perDomainMinimum &&
      pool.some((candidate) => candidate.domain === domain),
  );
}
