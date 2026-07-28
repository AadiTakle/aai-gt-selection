/**
 * Local TypeScript types that MIRROR the shapes in
 * `docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md` (§2 item/result contract,
 * §5 scoring contract).
 *
 * They are declared here on purpose so the scoring package can build and be
 * tested WITHOUT depending on `packages/contracts` (which another workstream
 * owns). At the integration merge these are reconciled against the canonical
 * Zod contracts. Born-synthetic only (`synthetic_only=true`, `validated=false`).
 */
import type { MetricId } from './metric-ids';

/** The four scored reasoning domains (BUILD_PLAN §1). Also the score "areas". */
export const DOMAINS = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'] as const;
export type Domain = (typeof DOMAINS)[number];

/** A scored area is one of the four domains. */
export type Area = Domain;

/** The proficiency scale used everywhere: a float in [1, 20] (BUILD_PLAN §0). */
export const SCALE_MIN = 1;
export const SCALE_MAX = 20;

/**
 * Which regime an item was served under.
 *
 * - `standing`: locating where the child already performs (two-sided bracketing).
 * - `learning`: the novel block, held near a difficulty derived from the settled standing
 *   estimate, so the climb across trials is the signal rather than the search for the level.
 *
 * The learning-rate fit reads only `learning` items. Fitting growth over a mixed trace is
 * uninterpretable: while the estimate is still bracketing, the hardest-solved difficulty rises as
 * the search converges, so a rising ceiling is produced both by the child learning and by the
 * estimate arriving.
 */
export const EXAM_STAGES = ['standing', 'learning'] as const;
export type ExamStage = (typeof EXAM_STAGES)[number];

/** A numeric metric map keyed by measurement ID (BUILD_PLAN: `Record<MetricId, number>`). */
export type MetricMap = Readonly<Partial<Record<MetricId, number>>>;

/** Minimal telemetry event shape (full trace lives server-side; ignored by the scorer). */
export interface TelemetryEvent {
  readonly t: number;
  readonly type: string;
  readonly [key: string]: unknown;
}

/**
 * Structured per-item result emitted by the demo via postMessage
 * (BUILD_PLAN §2). Carries NO correctness from the client.
 */
export interface ItemResult {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: Domain;
  readonly response?: unknown;
  readonly metrics: MetricMap;
  readonly telemetry?: readonly TelemetryEvent[];
}

/**
 * Server-supplied stimulus parameters a session-level aggregate needs but a renderer cannot
 * report. They live on the bank item's server-only `answer` block, so the browser never sees
 * them; the server attaches them to the result it stores.
 */
export interface ItemStimulus {
  /**
   * Target angular disparity in degrees, for banks that record it (`SPA-VIEW-01`,
   * `SPA-XSCAN-01`). The regressor for the `M-ROTSLOPE` fit.
   */
  readonly angularDisparityDeg?: number;
}

/**
 * Server-verified item result (BUILD_PLAN §2: `ItemResult + {correct, score, difficulty}`).
 * This is the sole per-item input to the deterministic scorer.
 */
export interface ScoredItem extends ItemResult {
  /** Server-verified correctness. */
  readonly correct: boolean;
  /** Server-verified score in [0, 1] (dichotomous 0/1 or polytomous partial credit). */
  readonly score: number;
  /** Design-estimated item difficulty, float in [1, 20]. */
  readonly difficulty: number;
  /** Optional server-only stimulus parameters for derived aggregates ({@link ItemStimulus}). */
  readonly stimulus?: ItemStimulus;
  /** Regime this item was served under; absent is read as `standing` ({@link ExamStage}). */
  readonly stage?: ExamStage;
}

/** Coarse band label for profile signals. */
export type BandLabel = 'low' | 'moderate' | 'high' | 'unknown';

/** How a single metric contributed to a within-bracket position (transparency/audit). */
export interface MetricContribution {
  readonly metricId: MetricId;
  /** Aggregated value across the area's items. */
  readonly value: number;
  /** Value mapped to [0, 1] after direction handling (higher = pushes score up). */
  readonly normalized: number;
  /** Effective weight applied. */
  readonly weight: number;
  readonly direction: 'higher' | 'lower';
}

/** Per-area score output. */
export interface AreaScore {
  readonly area: Area;
  /** Proficiency estimate (≈θ) on the [1, 20] scale. */
  readonly proficiency: number;
  /** Ordinal accuracy bracket index this area landed in. */
  readonly bracket: number;
  /** The [min, max] θ span of the chosen bracket. */
  readonly bracketRange: readonly [number, number];
  /**
   * (Difficulty-weighted) accuracy over the area's items, in [0, 1]. Always reported; it picks
   * the bracket only under `bracketing.mode: 'accuracy'` (the default).
   */
  readonly accuracy: number;
  /**
   * Difficulty-adjusted ability fitted from the trace, on the [1, 20] scale. Present ONLY under
   * `bracketing.mode: 'ability'`, where it is the statistic that picked the bracket.
   */
  readonly abilityEstimate?: number;
  /** Position within the bracket, in [0, 1] (0 = bracket floor, 1 = bracket ceiling). */
  readonly positionWithinBracket: number;
  /** Number of scored items in this area. */
  readonly itemsScored: number;
  /** Per-metric contributions to the within-bracket position. */
  readonly contributions: readonly MetricContribution[];
  /** metricId -> sample count observed in this area (coverage, informational). */
  readonly metricCoverage: Readonly<Record<string, number>>;
}

/** A named profile signal (aggregate of a metric across areas). */
export interface ProfileSignal {
  /** Raw aggregate value (null when no data was observed). */
  readonly raw: number | null;
  /** Normalized to [0, 1] (null when no data was observed). */
  readonly normalized: number | null;
  readonly label: BandLabel;
}

/**
 * Profile object (BUILD_PLAN §5): strengths, learning rate, consistency.
 * NO admit/defer/retry decision label is produced here.
 */
export interface ExamProfile {
  /** Areas whose proficiency exceeds the composite by `strengthMargin`, strongest first. */
  readonly strengths: readonly Area[];
  /** Areas whose proficiency trails the composite by `strengthMargin`, weakest first. */
  readonly relativeWeaknesses: readonly Area[];
  /** All scored areas ranked by proficiency (strongest first). */
  readonly rankedAreas: readonly Area[];
  /** Within-session learning rate (Timeback-fit core, from M-LEARNRATE). */
  readonly learningRate: ProfileSignal;
  /** Response consistency (inverse of intra-individual RT variability, M-RTVAR). */
  readonly consistency: ProfileSignal;
}

/**
 * Full deterministic scoring output. Reproducible from `(items, policy)` alone.
 * Contains NO admit/defer/retry decision (BUILD_PLAN §0/§5).
 */
export interface ExamScore {
  /** Per-area scores; only areas that had at least one scored item are present. */
  readonly perArea: Readonly<Partial<Record<Area, AreaScore>>>;
  /** Composite proficiency (≈θ) on the [1, 20] scale. */
  readonly composite: number;
  readonly profile: ExamProfile;
  /** The policy id/version used, echoed for reproducibility/audit. */
  readonly policyId: string;
  readonly scaleMin: number;
  readonly scaleMax: number;
  /** Always true: this package only ever scores synthetic data. */
  readonly syntheticOnly: true;
}
