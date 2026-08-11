/**
 * An app is a front door onto the same engine.
 *
 * Configuration lives here rather than in the platform because two surfaces do not produce
 * comparable numbers. A game-delivered screener carries construct-irrelevant variance a plain web
 * page does not, so the recommendation threshold belongs to the surface. That argument is made in
 * `docs/proposals/public-screener.md` and encoded in `prototypeSurfaces`.
 */

export interface PrecisionConfig {
  /** Confidence needed to pass a candidate through. */
  readonly confidenceAbove: number;
  /** Confidence needed to rule one out. Always the higher bar. */
  readonly confidenceBelow: number;
  readonly minItems: number;
  readonly maxItems: number;
}

/**
 * How much variety to buy, and therefore how much measurement efficiency to spend.
 *
 * Every setting here trades precision for unpredictability. Defaults are measured by simulation
 * rather than guessed; see `platform/scripts/simulate-variety.ts`.
 */
export interface VarietyConfig {
  /** Sample from the top K by information instead of taking the maximum. */
  readonly randomesqueK: number;
  /** Early in a session, widen K to this fraction of the eligible pool. */
  readonly earlyKFraction: number;
  /** How many items count as early. */
  readonly earlyItemCount: number;
  /** Damp an item's information by 1 / (1 + times its type has been served). */
  readonly sameTypeDamping: boolean;
  /**
   * Prefer a different domain when an alternative is within this relative information loss.
   *
   * Measured, and re-measured once the guessing floors were corrected. At 0.10 the layer worked while
   * every item was assumed to have four options; once probe sets and cell sets got their real floors the
   * information landscape spread out, off-domain alternatives stopped landing within 10%, and same-domain
   * adjacency drifted from 0% back up to 24.8% — chance level for four domains, meaning the layer had
   * quietly stopped doing anything. At 0.30 it returns to 0% for about 0.03 items per decision.
   */
  readonly domainInterleaveTolerance: number;
  /** No item should appear in more than this fraction of an app's sessions. Zero disables. */
  readonly targetExposureRate: number;
  /**
   * How sharply an over-exposed item is punished. One is proportional damping, which measurement
   * showed is too weak to hold a ceiling; higher values turn the preference into an effective cap.
   */
  readonly exposureDampingExponent: number;
  /**
   * Draw the opening item from within this many logits of the threshold, in a seeded domain.
   * Zero disables the randomised opening entirely and falls through to ordinary selection.
   */
  readonly openingJitterLogits: number;
  /** Avoid items this persona saw in their last N sessions. */
  readonly personaLookbackSessions: number;
}

/**
 * Measured, not chosen. See `platform/scripts/simulate-variety.ts` and spec section 9.2.1.
 *
 * Against the real catalog with 1,000 simulated children of known ability, these settings classify
 * true ability as accurately as the deterministic engine (0.920 both) for about 0.2 extra items per
 * decision, while taking the cohort from 16 distinct items served to 507 and from one opening question
 * to over 400.
 *
 * `randomesqueK` is 6 rather than 3 because 6 measured better: at K=3 accuracy was 0.914, at K=6 it was
 * 0.920, and at K=10 it fell to 0.913. All three are within sampling noise of each other, and 6 is the
 * best of them at no cost in session length.
 */
export const DEFAULT_VARIETY_CONFIG: VarietyConfig = {
  randomesqueK: 6,
  earlyKFraction: 0.1,
  earlyItemCount: 3,
  sameTypeDamping: true,
  domainInterleaveTolerance: 0.3,
  targetExposureRate: 0.2,
  exposureDampingExponent: 3,
  openingJitterLogits: 0.5,
  personaLookbackSessions: 2,
};

/**
 * What contact information an app may collect.
 *
 * `guardian_email` is the ceiling for this phase. Collecting anything directly from a child, a
 * Roblox username included, is gated behind a COPPA consent design that does not exist yet.
 */
export type PiiPolicy = 'none' | 'guardian_email';

export interface AppConfig {
  readonly appId: string;
  readonly name: string;
  /** Free-form label for the delivery context: 'web', 'roblox', 'game', 'portal'. */
  readonly surfaceKind: string;
  readonly status: 'active' | 'disabled';
  /** Where the decision line sits, in logits. */
  readonly abilityThreshold: number;
  /** P(theta > threshold) at or above which this surface says "consider applying". */
  readonly recommendProbability: number;
  readonly precision: PrecisionConfig;
  /** Items per domain before the stop rule may fire. */
  readonly perDomainMinimum: number;
  readonly ageBands: readonly string[];
  /**
   * Which of the UI elements in `@gt/ui-contract` this app can render. Approving a type the app
   * cannot render is rejected at the admin boundary rather than discovered by a child.
   */
  readonly uiCapabilities: readonly string[];
  readonly maxReadingBand: string | null;
  readonly allowSyntheticItems: boolean;
  /** Null means follow the latest published snapshot. */
  readonly pinnedSnapshotId: string | null;
  readonly variety: VarietyConfig;
  readonly piiPolicy: PiiPolicy;
  readonly retentionDays: number;
  readonly webhookUrl: string | null;
  readonly ownerContact: string;
  readonly createdAt: string;
}

export interface ApprovedType {
  readonly appId: string;
  readonly typeCode: string;
  readonly enabled: boolean;
  readonly approvedAt: string;
  readonly approvedBy: string;
}
