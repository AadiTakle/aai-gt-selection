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
export const AREAS: readonly Area[] = [
  'fluid_reasoning',
  'verbal',
  'quantitative',
  'spatial',
];

/** Grade/age bands used for the start difficulty and item targeting. */
export type AgeBand = 'K-1' | '2-3' | '4-5' | '6-8' | 'above-level';

/** Ordered list of the age bands from youngest to oldest. */
export const AGE_BANDS: readonly AgeBand[] = ['K-1', '2-3', '4-5', '6-8', 'above-level'];

/** A measurement id from the metric registry (§4). Kept open so the registry can grow. */
export type MetricId = string;

export type ItemId = string;
export type TypeCode = string;

/** Renderer-agnostic, per-type stimulus parameters. */
export type ItemContent = Record<string, unknown>;

/** Server-only answer key (never reaches the browser). */
export interface ItemAnswer {
  correctKey: string;
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

/** A core-metric registry entry (§4). */
export interface CoreMetricSpec {
  id: MetricId;
  scope: MetricScope;
  /** Minimum samples (per applicable area) required before the stop rule is satisfied. */
  minSamples: number;
  /** Whether shortfall blocks `isDone`. Tracked-inert metrics (enforced=false) only bias selection. */
  enforced: boolean;
}

/** Tunable, deterministic engine configuration (carried in state to keep functions pure). */
export interface EngineConfig {
  /** Seed for deterministic, reproducible tie-breaks. */
  seed: number;
  /** ± difficulty window (in scale points) for item selection. */
  difficultyWindow: number;
  /** Max length of the per-area recent-accuracy window. */
  accWindowSize: number;
  /** Max length of the per-area recent-estimate window (used for the stability check). */
  estWindowSize: number;
  /** Minimum per-update magnitude (the gradual floor). */
  minUpdate: number;
  /** Maximum per-update magnitude (the gradual ceiling). */
  maxUpdate: number;
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
  /** Count of samples collected per metric id in this area. */
  metricCounts: Record<MetricId, number>;
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
