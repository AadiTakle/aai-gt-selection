/**
 * Self-contained type surface for the portable scoring engine (D-019).
 *
 * The engine is a PURE, structure-agnostic Lambda payload: it must run
 * identically in local dev and in AWS Lambda with NO web / DB / framework
 * dependencies. It therefore declares its own numeric contracts here instead of
 * importing `@gt-selection/contracts` (which carries Zod / Supabase-facing
 * schemas). Nothing here couples to a specific test structure (two-stage,
 * adaptive, fixed-form): callers hand the engine responses + pinned parameters
 * and it scores whatever the sequencer produced.
 *
 * Everything produced by this engine is `synthetic_only=true`, `validated=false`
 * (D-006, R9): a screening score is not an admission decision and is not
 * evidence of program impact (R10).
 */

export type IrtModel = '1PL' | '2PL' | '3PL';

/** 2PL / 3PL item parameters. For a 1PL / 2PL item, `c = 0`. */
export interface IrtParameters {
  /** Discrimination. */
  a: number;
  /** Difficulty (location on the theta scale). */
  b: number;
  /** Lower asymptote / pseudo-guessing (3PL). Use `0` for 1PL / 2PL. */
  c: number;
  /** Optional label; does not affect the math. */
  model?: IrtModel;
}

/**
 * The four scored domains (METRIC_FRAMEWORK.md §1). Exposed as a const tuple so
 * callers can reference the canonical GT domains, but the engine stays
 * structure-agnostic: any `DomainKey` string is accepted.
 */
export const SCORED_DOMAINS = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'] as const;
export type ScoredDomain = (typeof SCORED_DOMAINS)[number];

/** A domain identifier: a canonical `ScoredDomain` or any caller-defined string. */
export type DomainKey = string;

/** One dichotomous response paired with its item parameters (theta input). */
export interface ScoredResponse {
  irt: IrtParameters;
  correct: boolean;
}

/** Ability estimate: point value plus its standard error. */
export interface ThetaEstimate {
  theta: number;
  se: number;
}

/**
 * Three-band screening classification: generic above-cut / uncertain /
 * below-cut. NOT an admission decision (R10).
 */
export type ScreenDecision = 'admit' | 'defer' | 'retry';

/**
 * Tunable, GT-owned scoring policy. Contains ONLY scoring knobs — no adaptive
 * routing / sequencing fields — so the engine remains structure-agnostic.
 */
export interface ScoringPolicy {
  policyVersion: string;
  /** Per-domain weights for the composite fit index. */
  fitWeights: Record<string, number>;
  /** Weight on the mean within-session learning rate (M-LEARNRATE). */
  learningRateWeight: number;
  /** Weight on the mean RT consistency (M-RTVAR / M-CONSIST). */
  consistencyWeight: number;
  /** Fit-index value at or above which the decision is `admit`. */
  admitCut: number;
  /** Fit-index value below which the decision is `retry`. */
  retryCut: number;
  /** EAP prior mean (defaults to 0). */
  priorMean?: number;
  /** EAP prior SD (defaults to 1). */
  priorSd?: number;
  /** Minimum effort-valid response rate for a valid decision (defaults to 0.8). */
  minEngagementRate?: number;
}

/** Pinned item parameters for scoring + replay (server-side; holds the key). */
export interface ItemParameters {
  itemId: string;
  domain: DomainKey;
  irt: IrtParameters;
  /** Ordinal difficulty, used for M-DIFFREACH (ceiling reached). */
  difficultyLevel: number;
  /** Correct answer, when correctness is resolved from a raw answer string. */
  answerKey?: string;
  /** Max raw score for polytomous items (M-POLY). Omit / `1` => dichotomous. */
  maxScore?: number;
  /**
   * Per-item rapid-guess RT floor in ms (M-RAPIDGUESS). A response at or below
   * this is treated as non-effortful and excluded from theta + speed credit.
   */
  rapidGuessThresholdMs: number;
}

/**
 * A raw, unscored response from the session log. Correctness is resolved in
 * priority order: `answer` vs `ItemParameters.answerKey`, else `correct`, else
 * `rawScore` vs `maxScore`.
 */
export interface RawResponse {
  itemId: string;
  /** 1-based administration order across the session. */
  order: number;
  /** Total response time in ms (M-RT). */
  rtMs: number;
  /** Chosen answer; resolved against the item key when both are present. */
  answer?: string;
  /** Directly-provided correctness (used when no answer / key is available). */
  correct?: boolean;
  /** Directly-provided raw score for polytomous items (0..maxScore). */
  rawScore?: number;
  /** Engagement flag from M-ENGAGE (on-task). Defaults to `true`. */
  onTask?: boolean;
}

/** A fully scored item response. */
export interface ScoredItem {
  itemId: string;
  domain: DomainKey;
  order: number;
  irt: IrtParameters;
  difficultyLevel: number;
  correct: boolean;
  /** Normalized score in [0,1] (`rawScore / maxScore`, or `1` / `0`). */
  score: number;
  rtMs: number;
  /** M-RAPIDGUESS flag: `rtMs` at or below the item's floor. */
  rapidGuess: boolean;
  /** M-ENGAGE on-task flag. */
  onTask: boolean;
  /** Effort-valid = on-task AND not a rapid guess. Gates theta + speed credit. */
  effortValid: boolean;
}

/** Per-domain score bundle. */
export interface DomainScore {
  domain: DomainKey;
  theta: number;
  se: number;
  percentile: number | null;
  itemsScored: number;
  itemsEffortValid: number;
  maxDifficultyReached: number;
  learningRate: number | null;
  consistency: number | null;
}

/** Session-level engagement summary (the gate). */
export interface EngagementSummary {
  totalResponses: number;
  effortValidResponses: number;
  rapidGuessResponses: number;
  offTaskResponses: number;
  /** effort-valid / total, or `null` when there are no responses. */
  responseTimeEffort: number | null;
  /** True when `responseTimeEffort >= policy.minEngagementRate`. */
  engagementValid: boolean;
}

/** The final, canonical screening result — the Lambda return payload. */
export interface ScreeningResult {
  policyVersion: string;
  seed: string;
  domainScores: DomainScore[];
  compositeTheta: number;
  fitIndex: number;
  engagement: EngagementSummary;
  decision: ScreenDecision;
  /** Seeded-bootstrap stability of the decision in [0,1]. */
  decisionConfidence: number;
  claimBoundary: string;
  syntheticOnly: true;
  validated: false;
}
