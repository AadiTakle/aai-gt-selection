import type { DomainName } from './domains.js';

export interface DomainRequirement {
  readonly minItemsScored: number;
  readonly requiredProbability: number;
}

/**
 * The rule that decides whether a session is worth acting on.
 *
 * Versioned and immutable, because a determination is only defensible if you can say which rule
 * produced it. Every score sheet records the version that judged it, so a later change to the bar
 * never silently rewrites history.
 *
 * This is deliberately separate from an app's `recommendProbability`. That number decides what a
 * family is told on screen and errs generous, since a false positive costs one declined application
 * while a false negative costs a child nobody hears about. This number decides whether the platform
 * proactively reaches out, which is a stronger claim with a reputational cost attached, so it
 * demands more confidence.
 */
export interface GiftedCriteria {
  readonly version: string;
  /** Ability line, in logits. */
  readonly abilityThreshold: number;
  /** Composite P(theta > threshold) required. */
  readonly requiredProbability: number;
  readonly minItemsScored: number;
  /**
   * The disjunctive route: the ability line a single domain must clear on its own when the composite has
   * not. Set higher than `abilityThreshold`, because passing on one domain alone is a stronger claim about
   * that domain than the composite makes about the whole. Undefined falls back to the engine's default.
   */
  readonly domainBar?: number;
  /** Confidence required on a single domain for that route. Undefined falls back to the engine's default. */
  readonly domainRequiredProbability?: number;
  /**
   * Items a domain must have scored before it may carry a session on its own.
   *
   * The engine's `passRouteFor` requires only that a domain scored something at all, which is right for it:
   * it reports what cleared and leaves the judgement to the caller. This is that judgement. A blueprint
   * minimum of one leaves each domain two or three items in a ten-item session, and measurement showed the
   * route then almost never fires — but the failure mode if it did would be worse than not firing, because
   * "recommended on quantitative alone" off two items is a claim about a child that two items cannot support.
   */
  readonly domainMinItemsScored?: number;
  /** Floors that must be met before the platform will act, whichever route cleared. */
  readonly perDomainRequirements: Readonly<Partial<Record<DomainName, DomainRequirement>>>;
  readonly description: string;
}

/**
 * Placeholder. The threshold and item floor are the prototype's own
 * (`defaultScreenerConfig`: 1.0 logits, 8 items). The outreach probability is set above the
 * prototype's on-screen bar of roughly 0.35 for the reason given above.
 *
 * None of these numbers has met a child. Replacing them is an owner decision, recorded in
 * `docs/design/aws-question-platform.md` section 17.
 */
export const CRITERIA_V1: GiftedCriteria = {
  version: 'criteria-v1',
  abilityThreshold: 1.0,
  requiredProbability: 0.75,
  minItemsScored: 8,
  /**
   * The single-domain route, stated rather than left to the engine's defaults.
   *
   * The bar sits above the composite threshold because passing on one domain alone is a stronger claim
   * about that domain than the composite makes about the whole child. The confidence matches the
   * composite's rather than the engine's looser 0.45, because this decides whether a family is contacted
   * and one domain is less evidence, not more — it should not be the easier route.
   *
   * Six items is the number that makes the route mean anything. Below it the arithmetic will still produce
   * a probability and the probability will still be indefensible.
   */
  domainBar: 1.5,
  domainRequiredProbability: 0.75,
  domainMinItemsScored: 6,
  perDomainRequirements: {},
  description:
    'Placeholder criteria pending a product decision. Ability threshold and item floor copied ' +
    'from the prototype screener; outreach probability set above the on-screen recommendation ' +
    'bar because contacting a family is a stronger claim than encouraging one. The single-domain ' +
    'route demands the same confidence as the composite and six scored items in the clearing ' +
    'domain. Not calibrated.',
};
