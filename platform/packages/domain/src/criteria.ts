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
  perDomainRequirements: {},
  description:
    'Placeholder criteria pending a product decision. Ability threshold and item floor copied ' +
    'from the prototype screener; outreach probability set above the on-screen recommendation ' +
    'bar because contacting a family is a stronger claim than encouraging one. Not calibrated.',
};
