/**
 * Local type definitions for the adaptive exam engine.
 *
 * These mirror the interface contract in `docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md`
 * (§2 item/result contract, §3 engine contract, §4 core metrics). They are intentionally
 * self-contained so this package does not depend on `packages/contracts` being ready; the
 * shapes reconcile at the integration merge. Born-synthetic: `syntheticOnly=true`,
 * `validated=false`, difficulty is a design-estimated provisional float on a 1..20 scale.
 */

/** The four scored reasoning areas (a.k.a. domains). */
export type Area = 'fluid_reasoning' | 'verbal' | 'quantitative' | 'spatial';

/** Ordered list of the four areas. */
export const AREAS: readonly Area[] = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];

/** Grade/age bands used for the start difficulty and item targeting. */
export type AgeBand = 'K-1' | '2-3' | '4-5' | '6-8' | 'above-level';

/** Ordered list of the age bands from youngest to oldest. */
export const AGE_BANDS: readonly AgeBand[] = ['K-1', '2-3', '4-5', '6-8', 'above-level'];

/** A measurement id from the metric registry (§4). Kept open so the registry can grow. */
export type MetricId = string;

export type ItemId = string;
export type TypeCode = string;

/**
 * Which regime an item was served under.
 *
 * - `standing`: locating where the child already performs (two-sided bracketing, `update.ts`).
 * - `learning`: the novel block, held near a difficulty derived from the settled standing estimate
 *   so that the climb across trials is the signal rather than the search for the child's level.
 *
 * Recorded per item because a growth statistic over a mixed trace is uninterpretable: while the
 * estimate is still bracketing, the hardest-solved difficulty rises as the search converges, so a
 * rising ceiling is produced both by the child learning and by the estimate arriving. Separating
 * the two requires knowing which items belonged to which regime.
 */
export type ExamStage = 'standing' | 'learning';

/** Renderer-agnostic, per-type stimulus parameters. */
export type ItemContent = Record<string, unknown>;

/** Server-only answer key (never reaches the browser). */
export interface ItemAnswer {
  correctKey: string;
}

/**
 * Server-supplied stimulus parameters that a derived aggregate needs but a renderer cannot
 * report. These live on the bank item's server-only `answer` block, so the browser never sees
 * them; the server attaches them to the `ScoredItem` it hands back.
 */
export interface ItemStimulus {
  /**
   * Target angular disparity in degrees, for banks that set `answer.angularDisparityDeg`
   * (currently `SPA-VIEW-01` and `SPA-XSCAN-01`). Input to the `M-ROTSLOPE` fit.
   */
  angularDisparityDeg?: number;
}

/** Server-only scoring mode declaration. */
export interface ItemScoring {
  mode: 'deterministic_key' | 'computed_solver' | 'proxy_bank' | 'model_judge_deferred';
}

/** Server-only provenance. */
export interface ItemProvenance {
  generator: 'grammar' | 'llm' | 'human';
}

/**
 * A full bank item. `difficulty` is a float 1..20. `answer`/`scoring`/`provenance` are
 * server-only and are stripped before an item is served to the browser.
 */
export interface BankItem {
  itemId: ItemId;
  typeCode: TypeCode;
  domain: Area;
  difficulty: number;
  ageBands: AgeBand[];
  content: ItemContent;
  answer: ItemAnswer;
  scoring: ItemScoring;
  provenance: ItemProvenance;
  syntheticOnly: true;
  validated: false;
}

/** What the browser receives: a bank item minus the server-only fields. */
export type ServedItem = Omit<BankItem, 'answer' | 'scoring' | 'provenance'>;

/** A single telemetry event captured during an item interaction. */
export interface TelemetryEvent {
  kind: string;
  atMs: number;
}

/**
 * Emitted by the demo (via postMessage) and re-verified by the server. Carries the raw child
 * response and the structured numeric metrics for the item — but NO correctness from the client.
 */
export interface ItemResult {
  itemId: ItemId;
  typeCode: TypeCode;
  domain: Area;
  response: unknown;
  metrics: Record<MetricId, number>;
  telemetry: TelemetryEvent[];
}

/** Server-scored item result: the client result plus server-authoritative correctness. */
export interface ScoredItem extends ItemResult {
  correct: boolean;
  score: number;
  difficulty: number;
  /** Optional server-only stimulus parameters for derived aggregates (see {@link ItemStimulus}). */
  stimulus?: ItemStimulus;
  /** Regime this item was served under; absent is read as `standing` (see {@link ExamStage}). */
  stage?: ExamStage;
}

/** A registered question type (metadata used for selection). */
export interface QuestionType {
  typeCode: TypeCode;
  domain: Area;
  ageBands: AgeBand[];
  /** Declared measurements this type contributes (used for coverage-driven selection). */
  metrics: MetricId[];
}

/** The item bank + type registry the engine selects from. */
export interface Banks {
  types: QuestionType[];
  items: BankItem[];
}

/** Where a metric can be collected, used to decide which areas must cover it. */
export type MetricScope = 'all' | Area | 'interactive' | 'open_ended';

/**
 * How a metric's samples arrive.
 *
 * - `observed`: a renderer genuinely reports a value for a single item, so a sample is one
 *   emission and coverage is a count of emissions.
 * - `derived`: a session-level aggregate the engine fits from the accumulated per-item trace
 *   (an RT variance, a consistency rate, a growth slope). One item cannot carry a value for it,
 *   so counting emissions would be a category error; adequacy is a condition on the derivation's
 *   INPUTS instead — see `derived.ts`.
 */
export type MetricKind = 'observed' | 'derived';

/**
 * The population a metric's `minSamples` is counted over.
 *
 * - `per_area`: construct-bound; the minimum must be met separately in every applicable area.
 * - `session`: person-level; the minimum is met across the whole session. Response-time signals
 *   describe one child's RT distribution, not one area's, and `MEASUREMENTS.md` states their
 *   "how much" per child rather than per construct.
 */
export type MetricAdequacyScope = 'per_area' | 'session';

/**
 * Policy for serving several items of one type back-to-back (`burst.ts`).
 *
 * Every value here is a knob rather than a constant: how long a burst may run, and how wide a
 * choice still counts as answerable in one tap. `maxLength: 1` disables bursting entirely and
 * restores exactly the one-item-then-rotate behaviour.
 */
export interface BurstPolicy {
  /**
   * Longest run of consecutive items from a single type. `1` disables bursting. The effective
   * length is also bounded by the type's unseen items and by the room left before `hardItemCap`.
   */
  readonly maxLength: number;
  /**
   * Shortest burst a qualifying type may be given, once the per-type step-down for a wider option
   * list has been applied. Also the floor that keeps bursting worthwhile at all: a "burst" of one is
   * just the ordinary rotation.
   */
  readonly minLength: number;
  /**
   * Most options an item may offer and still count as a one-tap choice. A wider choice is a search
   * through candidates, which is work in its own right rather than instruction-reading overhead.
   */
  readonly maxOptions: number;
}

/** A core-metric registry entry (§4). */
export interface CoreMetricSpec {
  id: MetricId;
  scope: MetricScope;
  /**
   * Minimum samples required before the stop rule is satisfied, counted over `adequacy`. For a
   * `derived` metric this is the minimum count of the derivation's inputs, not of emissions.
   */
  minSamples: number;
  /** Whether shortfall blocks `isDone`. Tracked-inert metrics (enforced=false) only bias selection. */
  enforced: boolean;
  /** Defaults to `observed`. */
  kind?: MetricKind;
  /** Defaults to `per_area`. */
  adequacy?: MetricAdequacyScope;
  /**
   * Number of wired types known to supply this metric in each applicable area, when that number
   * is low enough to be a real coverage risk. Purely documentary: it records a fragility that
   * `auditMetricSupply` re-checks against the live banks so it cannot rot silently.
   */
  supplyNote?: string;
}

/**
 * One item's contribution to the per-area trace, retained so session-level aggregates can be
 * DERIVED rather than emitted. Everything here comes straight off the `ScoredItem`, so the trace
 * is reproducible by replaying stored results through `update` (BUILD_PLAN §5) — no derived
 * value depends on live in-memory state that is never persisted.
 */
export interface ItemObservation {
  itemId: ItemId;
  typeCode: TypeCode;
  difficulty: number;
  score: number;
  correct: boolean;
  /** Response time in ms when the item reported `M-RT`; `null` otherwise. */
  rtMs: number | null;
  /** Target angular disparity in degrees when the server supplied one; `null` otherwise. */
  angularDisparityDeg: number | null;
  /** Regime this item was served under (see {@link ExamStage}). */
  stage: ExamStage;
}

/** Tunable, deterministic engine configuration (carried in state to keep functions pure). */
export interface EngineConfig {
  /** Seed for deterministic, reproducible tie-breaks. */
  seed: number;
  /** ± difficulty window (in scale points) for item selection. */
  difficultyWindow: number;
  /**
   * How many scale points of targeting error the engine will accept to serve an age-band-matched
   * item. Item selection ranks candidates by `|difficulty − estimate| + (band match ? 0 : bias)`,
   * so `0` makes the age band a pure tie-break between equally well-targeted items and a very
   * large value makes an age-band match override targeting entirely.
   */
  ageBandBias: number;
  /** Max length of the per-area recent-accuracy window. */
  accWindowSize: number;
  /** Max length of the per-area recent-estimate window (used for the stability check). */
  estWindowSize: number;
  /**
   * Minimum per-update magnitude, and the asymptote the step schedule decays toward. This is the
   * finest resolution the estimate can ever be moved at, so it sets the precision available at
   * the tail of the scale.
   */
  minUpdate: number;
  /** Absolute ceiling on any single update magnitude, after the schedule and surprise. */
  maxUpdate: number;
  /**
   * Step magnitude before the schedule has decayed at all — the burn-in stride used while the
   * estimate is still travelling toward the child's ability region. Must be >= `minUpdate`.
   */
  initialStep: number;
  /**
   * Exponent α of the `1 / m^α` decay applied to the step schedule, where `m` counts the
   * direction reversals that have accumulated in the area. Larger α settles faster and travels
   * more slowly.
   */
  stepDecayExponent: number;
  /**
   * Direction reversals ignored before the schedule starts decaying. Keeps a single lucky guess
   * or careless slip from ending the burn-in stride prematurely.
   */
  stepBurnInReversals: number;
  /**
   * How much "surprise" (a harder-than-estimate item right, or an easier-than-estimate one wrong)
   * amplifies the scheduled step. `0` disables the term; `1` lets a maximally surprising response
   * double the step, before `maxUpdate` clamps it.
   */
  surpriseGain: number;
  /** How strongly `M-ERRTYPE` near-miss softens a wrong-answer step (0..1). */
  nearMissSoften: number;
  /** Allowed (max - min) items-seen gap across areas for coverage to count as "even". */
  evenSpreadTolerance: number;
  /** Minimum items per area before completion is possible. */
  minItemsPerArea: number;
  /** Estimates required in a window before an area's stability can be judged. */
  stabilityWindow: number;
  /** Max estimate-window SD for an area to count as "stable" (guards against wild swings). */
  stabilitySd: number;
  /**
   * Max absolute drift (recent-half mean − older-half mean) of the estimate window for an area to
   * count as "stable". This is what distinguishes a settled estimate from one still trending toward
   * the student's ability.
   */
  stabilityDrift: number;
  /** Hard safety cap on total items served. */
  hardItemCap: number;
  /** Back-to-back same-type serving policy (see {@link BurstPolicy}). */
  burst: BurstPolicy;
  /**
   * Max difficulty gap (in scale points) for two items in an area to count as a matched parallel
   * pair for `M-CONSIST`. Bank difficulty is the design-estimated b, so "same b" is approximated
   * by difficulty proximity rather than by AIG clone lineage (provisional; validated=false).
   */
  consistencyPairTolerance: number;
  /** Distinct angular disparities required before an `M-ROTSLOPE` fit is considered adequate. */
  rotationMinDistinctDisparities: number;
  /** The core-metric registry (§4). */
  coreMetrics: CoreMetricSpec[];
}

/** Per-area adaptive state. */
export interface AreaState {
  area: Area;
  /** Current difficulty/proficiency estimate on the 1..20 float scale. */
  difficulty: number;
  /** Items already served in this area (avoids repeats). */
  itemsSeen: Set<ItemId>;
  /** Recent correctness scores (0..1), most-recent last, capped to `accWindowSize`. */
  accWindow: number[];
  /** Recent difficulty estimates, most-recent last, capped to `estWindowSize` (stability signal). */
  estWindow: number[];
  /** Count of samples collected per metric id in this area (`observed` metrics only). */
  metricCounts: Record<MetricId, number>;
  /** Full ordered per-item trace for this area; the input to every derived aggregate. */
  trace: ItemObservation[];
}

/** Full session state threaded through the pure engine functions. */
export interface SessionState {
  gradeBand: AgeBand;
  areas: Record<Area, AreaState>;
  /** Total items served across all areas (drives the hard safety cap). */
  itemsServed: number;
  /** Deterministic RNG state (reserved; tie-breaks are hash-based and pure). */
  rngState: number;
  config: EngineConfig;
}
