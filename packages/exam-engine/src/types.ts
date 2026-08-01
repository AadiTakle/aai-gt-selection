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

/**
 * Which rule decides what an area's next item is aimed at.
 *
 * - `staircase`: the shipped Levitt/Kesten up-down rule. One point estimate per area, moved by a
 *   decaying step on each answer, and the nearest unseen item to it is served. Cheap, robust, and
 *   carries no notion of how much it knows — so it cannot choose the most informative question and
 *   never produces an uncertainty.
 * - `mfi`: maximum Fisher information at the posterior mean. A belief over the child's standing is
 *   maintained from the trace (`posterior.ts`), and the item served is the one carrying most
 *   information about a child at that belief's mean.
 * - `mepv`: minimum expected posterior variance. Same belief, but each candidate is scored by
 *   simulating BOTH answers and averaging the variance that would remain — "whichever way they
 *   answer, the range shrinks as much as possible".
 * - `cut`: maximum Fisher information at a fixed DECISION POINT (`decisionCut`) rather than at the
 *   child. Shortest route to a defensible above/below classification; see the knob.
 *
 * `staircase` restores the pre-change behaviour exactly and is retained so the rules can be
 * compared on the same instrument and so the tests that encode staircase mechanics have a defined
 * path.
 *
 * `mfi` and `mepv` are ability-targeted and differ only in criterion, which makes them the honest
 * pair to compare — the literature's most-cited advantage for MEPV-style criteria confounds the
 * criterion with the prior it was run against. `cut` answers a different question entirely and is
 * not comparable to either on precision; see `decisionCut`.
 */
export type SelectionRule = 'staircase' | 'mfi' | 'mepv' | 'cut';

/** Tunable, deterministic engine configuration (carried in state to keep functions pure). */
export interface EngineConfig {
  /** Seed for deterministic, reproducible tie-breaks. */
  seed: number;
  /** Which rule aims item selection (see {@link SelectionRule}). */
  selectionRule: SelectionRule;
  /**
   * Logistic discrimination per scale point in the engine's response model. Only read under
   * `mepv`. Matches the scoring package's ability-fit default so selection and reporting assume
   * the same response curve.
   */
  responseSlope: number;
  /**
   * Chance-success floor assumed for every item: the probability a child well below an item still
   * answers it correctly. Every wired bank is multiple choice, so the truthful value is positive
   * and `0.2` is a five-option item.
   *
   * `0` restores the no-guessing model the standing estimator used to assume. That assumption is
   * what put the reported standing level above the child's actual ability, and under `mepv` it
   * also mis-places the aim: the information peak sits at `P = (1 + sqrt(1 + 8c)) / 4`, so a
   * zero floor aims at an even chance where a five-option item wants roughly 0.65.
   */
  guessingFloor: number;
  /**
   * SD of the weakly-informative normal prior the belief starts from, centred on the grade-band
   * seed. `Infinity` disables it (a flat prior over the scale). Only read under `mepv`.
   */
  posteriorPriorSd: number;
  /**
   * Randomesque exposure control for the `mepv` item choice, as a FRACTION of the best expected
   * posterior variance. Any unseen item within this much of the best is treated as carrying
   * equivalent information; the age-band preference then decides between them and the session seed
   * breaks what is left.
   *
   * A fraction rather than an absolute, because expected posterior variance falls by an order of
   * magnitude across a session and a fixed margin would be inert at the start and decisive at the
   * end. `0` restores a strict argmax. This is the `mepv` counterpart of
   * {@link EngineConfig.itemSelectionTolerance}, which continues to govern the `staircase` path.
   */
  mepvTolerance: number;
  /**
   * The decision point `cut` selection aims every item at, on the 1..20 difficulty scale, or `null`
   * when no cut is defined.
   *
   * WHAT IT BUYS. Spray and Reckase established that when the goal is a CLASSIFICATION at a cut,
   * aiming items at the cut reaches a defensible decision in fewer items than aiming them at the
   * child — even than aiming at the child's TRUE ability. Their Rasch example decides in 3.78 items
   * against 4.26, and the margin is largest exactly where a selective cut sits: high decision
   * point, high-ability examinee. Matching the child drives their success rate toward a half, which
   * flattens the very contrast an above/below decision rests on.
   *
   * WHAT IT COSTS, AND WHY IT IS NOT THE DEFAULT. Cut-targeted selection is barely adaptive to the
   * person: every child starts on the same items and the only adaptation is in how long they sit
   * there. That destroys the exposure control that ability matching provides for free, which is
   * directly at odds with the item-variety work in this module, and it yields an ability estimate
   * that is precise only NEAR THE CUT — so a child well above or below it gets a decision but not a
   * usable standing level.
   *
   * WHICH MATTERS DEPENDS ON AN UNRESOLVED QUESTION about what Stage 1 is for. If it is a GATE, a
   * cut exists and this is the cheaper route to it. If it is a LOCATOR — a per-area standing level
   * that scales Stage 2 — then precision away from the cut is the product and `cut` is the wrong
   * objective. Both are supported as a policy choice rather than settled here, and no cut VALUE is
   * assumed: a real one is a district threshold, not something this repository may invent.
   */
  decisionCut: number | null;
  /** ± difficulty window (in scale points) for item selection. */
  difficultyWindow: number;
  /**
   * How many scale points of targeting error the engine will accept to serve an age-band-matched
   * item. Item selection ranks candidates by `|difficulty − estimate| + (band match ? 0 : bias)`,
   * so `0` makes the age band a pure tie-break between equally well-targeted items and a very
   * large value makes an age-band match override targeting entirely.
   */
  ageBandBias: number;
  /**
   * Randomesque exposure control for the TYPE choice, in selection-score points. Any type scoring
   * within this much of the best is treated as an acceptable substitute and one is drawn using the
   * session seed. `0` restores strict argmax, which serves the same type order to every child.
   *
   * Must stay strictly below {@link EngineConfig.trackedCoverageCap}, or a tracked-inert shortfall
   * stops deciding the type choice and an enforced one comes within tolerance of no shortfall at
   * all. See the note on `DEFAULT_CONFIG` and D-203.
   */
  typeSelectionTolerance: number;
  /**
   * The same idea for the ITEM choice, in difficulty scale points. Any unseen item within this much
   * of the best-targeted one may be drawn. Costs a little targeting precision and buys item-level
   * variety and bank exposure; `0` restores strict nearest-item.
   */
  itemSelectionTolerance: number;
  /**
   * Selection-score discount applied to a type the child has just been served, fading linearly to
   * nothing across `typeRecencyWindow`. Stops one session cycling the same few types. `0` disables.
   */
  typeRecencyPenalty: number;
  /** How many items back the recency discount reaches, counted within the area. */
  typeRecencyWindow: number;
  /**
   * Selection-score bonus for a type this area has not drawn from yet, in the same points as the
   * coverage weights and the age-band bonus.
   *
   * The recency discount spaces out a type the child has just met; this is the separate question of
   * how many DIFFERENT task formats an area's estimate rests on at all. Without it an area
   * gravitates to whichever few types lead on metric coverage and a child can finish a battery
   * having met a handful of games, which is both a narrower construct sample than the area label
   * claims and the monotony complaint that prompted the change.
   *
   * Must stay strictly below `ENFORCED_METRIC_WEIGHT` (2, in `config.ts`), or a novel type
   * outranks one that closes a shortfall the stop rule is gated on and sessions stop completing.
   * `selection-variety.test.ts` pins that. `0` disables the bonus.
   */
  typeNoveltyBonus: number;
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
  /**
   * How many items ahead of the least-served area another area may be and still be eligible for
   * the next item, so that the choice between them can be made on UNCERTAINTY rather than on
   * item count.
   *
   * Area choice used to be a strict rotation: fewest items seen, then neediest on enforced
   * coverage, then a seeded jitter. That spends the battery evenly, which is not the same thing as
   * spending it usefully — an area whose early items happened to be badly targeted carries far
   * less information than an equally-long area that was well aimed, and the rotation cannot tell
   * the two apart. With a belief per area (`posterior.ts`) it can: among the eligible areas the
   * next item goes to the one whose belief is still widest.
   *
   * The slack is what keeps that from starving an area. It is clamped to
   * `max(0, evenSpreadTolerance - 1)` at the point of use, which bounds the items-seen gap at
   * `evenSpreadTolerance` BY CONSTRUCTION: an area can only be served while it is within `slack`
   * of the minimum, so it can never end more than `slack + 1` ahead of it. `coverageIsEven` gates
   * the stop rule, so a rule that could breach it would stop sessions completing at all.
   *
   * `0` leaves the eligible set exactly the areas tied for fewest-seen, so uncertainty decides
   * only genuine ties and the spread is identical to the strict rotation's.
   */
  areaSpreadSlack: number;
  /** Minimum items per area before completion is possible. */
  minItemsPerArea: number;
  /**
   * Distinct question types an area's evidence must span before the stop rule will conclude it.
   * Guards construct breadth: see `areaBreadthCovered`. `1` disables the requirement, and an area
   * with fewer wired types than this can never finish — `auditTypeBreadth` checks for that.
   */
  minTypesPerArea: number;
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
   * Ceiling on the combined selection weight a type may earn from TRACKED-INERT metric shortfalls,
   * however many of them it declares. Enforced shortfalls are unaffected and still sum without
   * limit. Set this to a very large number to restore the uncapped sum; see `coverageGain`.
   */
  trackedCoverageCap: number;
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
