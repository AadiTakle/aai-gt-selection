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
/**
 * The gifted bar for grades 3 to 5, at the 95th percentile.
 *
 * θ = 1.645 is the 95th percentile of a standard normal, and 95th-percentile CogAT "strictly applied" is the
 * bar GT states in `docs/interviews/2026-08-03-crystal-martel-call.md`. The prototype's 1.0 was roughly the
 * 84th percentile and was chosen to screen generously; that argument belongs on the *recommendation
 * probability*, not on where the line is, and conflating the two made the instrument look stricter than it was
 * while measuring somewhere else entirely.
 *
 * `domainBar` moves with it. It must stay above the composite threshold — passing on one domain alone is a
 * stronger claim about that domain than the composite makes about the whole child — and at 1.5 it would have
 * fallen *below* a 1.645 composite, quietly making the single-domain route the easier way in. 2.0 restores the
 * ordering, and a test now asserts it rather than trusting the numbers to stay in order.
 */
export const CRITERIA_V1: GiftedCriteria = {
  version: 'criteria-v1',
  abilityThreshold: 1.645,
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
  domainBar: 2.0,
  domainRequiredProbability: 0.75,
  domainMinItemsScored: 6,
  perDomainRequirements: {},
  description:
    'Targets gifted identification in grades 3 to 5 at the 95th percentile (theta 1.645), which is ' +
    'the CogAT bar GT states. Outreach probability sits above an app\u2019s on-screen recommendation ' +
    'bar because contacting a family is a stronger claim than encouraging one. The single-domain ' +
    'route demands the same confidence as the composite, a higher ability bar, and six scored ' +
    'items in the clearing domain. Not calibrated against children: the difficulties these ' +
    'probabilities are computed over are a linear rescale of an authoring scale.',
};
