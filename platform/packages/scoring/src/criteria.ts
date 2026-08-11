import { passRouteFor } from '@gt/qbank/server';
import { DOMAIN_NAMES, type GiftedCriteria } from '@platform/domain';
import type { Posteriors, Progress, QbankSessionConfig } from './qbank-adapter.js';

/**
 * Does this session meet the bar for the platform to act on it?
 *
 * Evaluated with the engine's own `passRouteFor`, against the criteria's bars rather than the app's. The
 * two are different questions and were conflated in an earlier version of this file: an app's
 * `recommendProbability` decides what a family is told on screen and errs generous, because a false
 * positive costs one declined application while a false negative costs a child nobody hears about. These
 * criteria decide whether the platform reaches out, which is a stronger claim with a reputational cost, so
 * it demands more confidence and carries its own numbers.
 *
 * The disjunctive route is the reason this delegates rather than computing a composite probability. A child
 * who spikes on one domain and is unremarkable elsewhere fails a composite bar and should still be acted on;
 * a composite-only test cannot express that, and expressing it here in parallel to the engine would be a
 * second implementation of the thing that decides about children.
 *
 * The item floor is not decoration. A posterior can be confident after four easy items, and acting on four
 * items would be indefensible however confident the arithmetic looks.
 */
export function evaluateCriteria(
  posteriors: Posteriors,
  progress: Progress,
  criteria: GiftedCriteria,
): boolean {
  if (progress.scored < criteria.minItemsScored) return false;

  const config: QbankSessionConfig = {
    abilityThreshold: criteria.abilityThreshold,
    recommendProbability: criteria.requiredProbability,
    // Only the two probabilities and the two bars are read by `passRouteFor`; the rest is required by the
    // type and cannot affect the outcome here.
    precision: { label: 'criteria', confidenceAbove: 1, confidenceBelow: 1, minItems: 0, maxItems: 0, note: '' },
    perDomainMinimum: 0,
    ...(criteria.domainBar === undefined ? {} : { domainBar: criteria.domainBar }),
    ...(criteria.domainRequiredProbability === undefined
      ? {}
      : { domainRecommendProbability: criteria.domainRequiredProbability }),
  };

  if (passRouteFor(config, posteriors, progress) === null) return false;

  // Per-domain floors on top of the route, for a criteria set that insists a given domain was measured at
  // all before it will act. The engine's route says what cleared; this says what had to be attempted.
  for (const domain of DOMAIN_NAMES) {
    const requirement = criteria.perDomainRequirements[domain];
    if (!requirement) continue;
    if ((progress.domainScored[domain] ?? 0) < requirement.minItemsScored) return false;
    if (
      posteriors.byDomain[domain].probabilityAbove(criteria.abilityThreshold) <
      requirement.requiredProbability
    ) {
      return false;
    }
  }

  return true;
}
