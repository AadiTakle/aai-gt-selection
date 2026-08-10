import { DOMAIN_NAMES, type GiftedCriteria } from '@platform/domain';
import type { MultiPosterior } from './multi-posterior.js';

/**
 * Does this session meet the bar for the platform to act on it?
 *
 * Evaluated against the posterior rather than against a finished sheet, because the criteria carry
 * their own ability threshold and it need not be the one the session was run at. An app sets where
 * its own on-screen recommendation line sits; the criteria decide when the platform reaches out to
 * a family. Reading `pAboveThreshold` off a sheet computed at the app's threshold would silently
 * answer a different question.
 *
 * The item floor is not decoration. A posterior can be confident after four easy items, and acting
 * on four items would be indefensible.
 */
export function evaluateCriteria(posterior: MultiPosterior, criteria: GiftedCriteria): boolean {
  if (posterior.itemsScored('composite') < criteria.minItemsScored) return false;
  if (posterior.pAbove('composite', criteria.abilityThreshold) < criteria.requiredProbability) {
    return false;
  }

  for (const domain of DOMAIN_NAMES) {
    const requirement = criteria.perDomainRequirements[domain];
    if (!requirement) continue;
    if (posterior.itemsScored(domain) < requirement.minItemsScored) return false;
    if (posterior.pAbove(domain, criteria.abilityThreshold) < requirement.requiredProbability) {
      return false;
    }
  }

  return true;
}
