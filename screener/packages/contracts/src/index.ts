/**
 * Shared vocabulary for the item library, the engine, and anything built on them.
 *
 * Two invariants are encoded here rather than left to convention, because they are the
 * reason the library can be edited while screeners are live:
 *
 *   1. A published GeneratorVersion is immutable. Editing produces a new version.
 *   2. A screener reads a BankSnapshot, which is a frozen list of pinned versions.
 *
 * A third is encoded because it keeps us honest: DifficultyEstimate carries its own
 * provenance, so an assumed number can never be mistaken for a measured one.
 */

// ---------------------------------------------------------------------------
// Domains and constructs
// ---------------------------------------------------------------------------

export const DOMAINS = ['quantitative', 'verbal', 'spatial', 'fluid'] as const;
export type Domain = (typeof DOMAINS)[number];

export const AGE_BANDS = ['k-2', '3-5', '6-8'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

/**
 * Reading load matters independently of domain. A quantitative item delivered as a word
 * problem measures reading as well as mathematics, which is the confound the reading-channel
 * work is about. Authors declare it so a screener can exclude text-heavy items for the
 * bands that cannot read yet.
 */
export const READING_LOADS = ['none', 'low', 'high'] as const;
export type ReadingLoad = (typeof READING_LOADS)[number];

// ---------------------------------------------------------------------------
// Difficulty, with provenance attached
// ---------------------------------------------------------------------------

export type DifficultySource = 'assumed' | 'calibrated';

export interface DifficultyEstimate {
  /** Location on the ability scale, in logits. Higher is harder. */
  readonly b: number;
  /**
   * Discrimination. How sharply the item separates candidates either side of `b`, and
   * therefore how much information one response carries. Held at an assumed value until
   * real responses exist, because estimating it needs far more data than estimating b.
   */
  readonly a: number;
  /** Standard error of b. Wide for assumed values, narrower once calibrated. */
  readonly se: number;
  readonly source: DifficultySource;
  /** Responses behind a calibrated estimate. Zero when assumed. */
  readonly n: number;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export interface ItemOption {
  readonly id: string;
  /** Plain text, or a small declarative figure the renderer draws. */
  readonly content: ItemContent;
}

export type ItemContent =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'glyphSequence'; readonly glyphs: readonly string[] }
  | { readonly kind: 'grid'; readonly rows: number; readonly cols: number; readonly cells: readonly (string | null)[] }
  | { readonly kind: 'shape'; readonly path: readonly [number, number][]; readonly rotation: number; readonly mirrored: boolean };

/**
 * One rendered question. Produced by a generator from a seed, never authored by hand,
 * and never stored as the canonical artifact. The canonical artifact is the generator
 * plus the seed, which is what makes a session replayable.
 */
/**
 * Why an item's answer is correct, written by the generator at render time.
 *
 * The generator built the item from a rule, so it already knows the rule. Discarding it and
 * asking a human to reconstruct it later is the expensive way round. A screener never shows
 * this; a practice tool is mostly made of it.
 */
export interface ItemExplanation {
  /** One sentence naming the rule the item is built on. */
  readonly rule: string;
  /** How the rule produces this particular answer. */
  readonly working: string;
  /** What a candidate who picked a wrong option probably did instead. Optional. */
  readonly commonError?: string;
}

export interface RenderedItem {
  readonly generatorId: string;
  readonly generatorVersion: string;
  readonly seed: number;
  readonly stem: ItemContent;
  /** Optional instruction shown above the stem. Kept separate so it can be narrated. */
  readonly prompt: string;
  readonly options: readonly ItemOption[];
  readonly correctOptionId: string;
  readonly readingLoad: ReadingLoad;
  /** Absent until an author writes one. A practice tool should refuse to serve items without it. */
  readonly explanation?: ItemExplanation;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

export type GeneratorStatus = 'draft' | 'published' | 'deprecated';

/**
 * Which kinds of tool may serve a family.
 *
 * This exists because a shared bank creates a problem a shared bank does not obviously have.
 * Practising on a family inflates later performance on that family, by roughly a third of a
 * standard deviation on a second sitting and more in younger children, and the inflated score
 * also shifts toward memory and away from reasoning. So a practice tool drawing from the same
 * families a screener uses would be coaching candidates on that screener. Declaring usage per
 * family is what keeps the two apart.
 *
 * The default is 'assessment', deliberately, so nothing reaches a practice tool by accident.
 */
export const ITEM_USAGES = ['assessment', 'prep', 'both'] as const;
export type ItemUsage = (typeof ITEM_USAGES)[number];

/**
 * Metadata an author supplies. Kept separate from the render function so the studio can
 * list, filter and validate the library without executing anything.
 */
export interface GeneratorMeta {
  readonly id: string;
  readonly version: string;
  readonly title: string;
  /** What the author believes this measures. Prose, for humans reviewing the bank. */
  readonly construct: string;
  readonly domain: Domain;
  readonly ageBands: readonly AgeBand[];
  readonly readingLoad: ReadingLoad;
  readonly difficulty: DifficultyEstimate;
  readonly usage: ItemUsage;
  /**
   * True when the options are drawn from the stem by design, as in an odd-one-out item where
   * the candidate reads a list and picks from it. Declared rather than inferred, so the
   * publish-time answer-leak check stays strict for every family that is not like this.
   */
  readonly selectFromStem?: boolean;
  readonly status: GeneratorStatus;
  /** Set when status becomes 'deprecated'. Explains why, for whoever reads the bank later. */
  readonly deprecationNote?: string;
  readonly authoredBy: string;
  readonly authoredAt: string;
}

/**
 * A generator is a pure function of its seed. Same seed, same item, byte for byte.
 * Determinism is checked at publish time rather than trusted, because the whole replay
 * story rests on it.
 */
export interface ItemGenerator extends GeneratorMeta {
  render(seed: number): RenderedItem;
}

// ---------------------------------------------------------------------------
// Snapshots: the pinned set a screener actually reads
// ---------------------------------------------------------------------------

export interface SnapshotEntry {
  readonly generatorId: string;
  readonly generatorVersion: string;
}

/**
 * Frozen on creation. Nothing mutates a snapshot, which is what lets an author publish
 * or deprecate freely while a screener is mid-flight.
 */
export interface BankSnapshot {
  readonly id: string;
  readonly label: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly entries: readonly SnapshotEntry[];
}

// ---------------------------------------------------------------------------
// Screener configuration
// ---------------------------------------------------------------------------

export interface BlueprintRule {
  readonly domain: Domain;
  readonly minItems: number;
  readonly maxItems: number;
}

/**
 * The engine classifies rather than measures, so the config states a threshold on the
 * ability scale and how confident we need to be about which side of it a candidate sits.
 */
export interface StopRule {
  /** Ability threshold in logits. The decision is about this line, not about a score. */
  readonly abilityThreshold: number;
  /**
   * Confidence needed to stop and pass the candidate through. Deliberately the lower of the
   * two bars, because concluding "above" costs at worst a declined application.
   */
  readonly confidenceAbove: number;
  /**
   * Confidence needed to stop without a recommendation. Deliberately the higher bar.
   *
   * A single symmetric threshold has a failure mode worth recording. The prior probability of
   * being above a demanding threshold is already small, so a symmetric rule fires "below"
   * on the prior rather than on anything the candidate did, and it fires on the first item.
   * Requiring much more confidence in that direction is both the fix and the right shape for
   * a tool whose whole argument is that a missed child costs more than a wasted application.
   */
  readonly confidenceBelow: number;
  readonly minItems: number;
  readonly maxItems: number;
}

/**
 * Per the public-screener proposal, surfaces are separate instruments: a game-delivered
 * version and a plain web version do not score the same way. So the recommendation
 * threshold is attached to the surface rather than to the screener.
 */
export interface SurfaceConfig {
  readonly id: string;
  readonly label: string;
  /** Recommend applying when P(above threshold) reaches this. */
  readonly recommendProbability: number;
}

export interface ScreenerConfig {
  readonly id: string;
  readonly version: string;
  readonly label: string;
  /** The pinned snapshot. Editing the library cannot reach a screener through this. */
  readonly snapshotId: string;
  readonly ageBand: AgeBand;
  readonly blueprint: readonly BlueprintRule[];
  readonly stopRule: StopRule;
  readonly surfaces: readonly SurfaceConfig[];
  /** Refuse to serve generators whose difficulty is still assumed. */
  readonly requireCalibratedItems: boolean;
  /** Exclude items above this reading load. Set to 'none' for pre-readers. */
  readonly maxReadingLoad: ReadingLoad;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export type StopReason =
  | 'confident-above'
  | 'confident-below'
  | 'item-cap'
  | 'bank-exhausted'
  | 'abandoned';

export type Decision = 'recommend' | 'no-recommendation';

export interface ResponseRecord {
  readonly ordinal: number;
  readonly generatorId: string;
  readonly generatorVersion: string;
  readonly seed: number;
  readonly domain: Domain;
  readonly correct: boolean;
  readonly latencyMs: number;
  /** Posterior probability of being above threshold, before and after this item. */
  readonly pAboveBefore: number;
  readonly pAboveAfter: number;
  /** Why the engine picked this generator. Kept for auditability, not for scoring. */
  readonly selectionReason: string;
}

export interface SessionRecord {
  readonly id: string;
  readonly screenerConfigId: string;
  readonly screenerConfigVersion: string;
  readonly snapshotId: string;
  readonly surfaceId: string;
  readonly ageBand: AgeBand;
  readonly seed: number;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly responses: readonly ResponseRecord[];
  readonly stopReason: StopReason | null;
  readonly pAbove: number;
  readonly decision: Decision | null;
  /** True when any served generator had assumed rather than calibrated difficulty. */
  readonly usedUncalibratedItems: boolean;
  /**
   * Attached later, if ever, when a real outcome is known for this candidate. Until then
   * every screener-effectiveness statistic is unavailable rather than zero.
   */
  readonly outcome?: SessionOutcome;
}

export interface SessionOutcome {
  /** Did the candidate clear the bar the screener was trying to predict? */
  readonly clearedBar: boolean;
  readonly source: string;
  readonly recordedAt: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  readonly check: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

export interface ValidationResult {
  readonly generatorId: string;
  readonly generatorVersion: string;
  readonly issues: readonly ValidationIssue[];
  readonly publishable: boolean;
}
