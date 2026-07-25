import { z } from 'zod';

/**
 * Adaptive K-8 cognitive-screener contracts (EXAM_ADAPTIVE_BUILD_PLAN §2-§5).
 *
 * Framework- and Supabase-free Zod schemas shared by the adaptive engine
 * (`@gt-selection/exam-engine`), the deterministic scorer
 * (`@gt-selection/exam-scoring`), the Supabase RPC adapter, and the demo
 * renderer. Everything here is born-synthetic (`syntheticOnly`,
 * `validated = false`); no item difficulty, weight, or cut is empirically
 * calibrated (RES-012, RES-013).
 *
 * Difficulty is a FLOAT on a 1..20 proficiency scale (BUILD_PLAN §0/§2): a
 * design-estimated rung, never a calibrated IRT parameter. Answer keys,
 * scoring modes, and provenance live on the bank item only and never reach the
 * browser (BUILD_PLAN §2, EXAM_ITEM_SCHEMA_SPEC §6.3-§6.4).
 */

// --- Core enums ---------------------------------------------------------------

/** The four testable reasoning areas (BUILD_PLAN §2). */
export const examDomainSchema = z.enum(['fluid_reasoning', 'verbal', 'quantitative', 'spatial']);

/** Age/grade bands used to seed the start difficulty and bias selection. */
export const ageBandSchema = z.enum(['K-1', '2-3', '4-5', '6-8']);

/**
 * Question-type code from the 66-type catalog, e.g. `FLU-MATRIX-01`.
 *
 * The middle segment is mixed-case on purpose: 11 of the 66 catalog `type_id`s
 * (`WM-bind-01`, `CX-achieve-02`, …) use a lowercase mnemonic, and
 * `catalog/master_types.jsonl` is the established vocabulary across specs,
 * demos, banks, and docs (D-020, E-074).
 */
export const questionTypeCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]+-[A-Za-z0-9]+-\d+$/);

/**
 * The ~20 measurement ids that make up the basic-core metric set (BUILD_PLAN
 * §4). All are tracked; a subset also influences selection and/or scoring now
 * (see `BASIC_CORE_METRICS`). Other declared measurements stay tracked-inert
 * and are not enumerated here.
 */
export const metricIdSchema = z.enum([
  'M-ACC',
  'M-DIFFREACH',
  'M-RT',
  'M-RTFIRST',
  'M-RTVAR',
  'M-REV',
  'M-ERRTYPE',
  'M-CONSIST',
  'M-LEARNRATE',
  'M-PATH',
  'M-EFF',
  'M-PLANFUL',
  'M-ENGAGE',
  'M-RAPIDGUESS',
  'M-RULEID',
  'M-VOCABLVL',
  'M-LURETYPE',
  'M-PAE',
  'M-ROTSLOPE',
  'M-IDEAFLU',
]);

/**
 * Difficulty as a FLOAT 1..20 (BUILD_PLAN §0/§2). Design rung / proficiency
 * estimate, NOT a calibrated IRT `b`. K-1 ~1-4, 2-3 ~4-8, 4-5 ~8-12,
 * 6-8 ~12-16, above-level ~16-20.
 */
export const difficultyScoreSchema = z.number().min(1).max(20);

/**
 * Per-item measurement values, keyed by measurement id (BUILD_PLAN §2/§4).
 * Partial: an item emits only the metrics its type produces.
 */
export const metricMapSchema = z.partialRecord(metricIdSchema, z.number());

/** Per-area running sample counts per metric (feeds the stop rule, §3/§4). */
export const metricCountMapSchema = z.partialRecord(metricIdSchema, z.int().nonnegative());

// --- Answer key, scoring, provenance (bank/server-only) -----------------------

/**
 * COARSE distractor lure taxonomy (EXAM_ITEM_SCHEMA_SPEC §6.3). Deliberately
 * small and closed so `M-ERRTYPE` / `M-LURETYPE` / `M-RULEID` stay computable
 * server-side: every selectable element buckets into exactly one of these.
 *
 * It is not expressive enough to name what a type actually diagnoses — 219
 * distinct domain labels exist across the 63 banks — so the fine-grained label
 * lives beside it in `lureDetail` (D-020, E-074). Widening this enum would make
 * the metrics uncomputable; dropping the domain label would make diagnosis
 * useless. Both are kept, at different grain.
 */
export const lureClassSchema = z.enum([
  'correct',
  'associate',
  'surface_match',
  'reversed_relation',
  'local_fit',
  'global_mismatch',
  'rule_violation',
  'near_order',
  'distractor_other',
]);

/**
 * Why one selectable element is right or wrong (EXAM_ITEM_SCHEMA_SPEC §6.3).
 *
 * Open-ended: per-type diagnostic fields (`note`, `misconception`,
 * `derivation`, …) pass through untouched. This object is reachable only
 * through `answer`, which `servedItemSchema` omits, so it never reaches the
 * browser.
 */
export const distractorRationaleSchema = z.looseObject({
  /** Bucketable coarse class. Required so M-ERRTYPE/M-LURETYPE stay computable. */
  lureClass: lureClassSchema,
  /**
   * The type's own fine-grained label (`off_pattern`, `mis_binding_swap`, …).
   * Present only when it says more than `lureClass` does.
   */
  lureDetail: z.string().min(1).optional(),
});

/**
 * Per-element lure map, keyed by the element's own identifier (D-020).
 *
 * Keyed rather than positional because the selectable elements are frequently
 * not positional options: `VER-EVIDENCE-01` keys passage sentences,
 * `WM-bubble-01` keys per-lane n-back steps, `SPA-PUNCH-01` keys fold
 * signatures. Server-side M-ERRTYPE also has to answer "which lure did this
 * child choose" by key, which a position-aligned array cannot do once options
 * are shuffled per session.
 */
export const distractorRationaleMapSchema = z.record(z.string().min(1), distractorRationaleSchema);

/**
 * Server-only answer key (BUILD_PLAN §2). `correctKey` stays untyped for now
 * (index | key | set | canonical solution); its typed per-type shape lands
 * with the item-content registry (EXAM_ITEM_SCHEMA_SPEC §6.2-§6.3, future work).
 *
 * Open-ended for the same reason: a question type's ground truth is
 * type-specific (`optimalPath`, `bindings`, `acceptedEquivalence`, …) and the
 * typed per-type registry does not exist yet. Safe to leave open because
 * `servedItemSchema` omits `answer` wholesale — nothing here can reach the
 * browser by being unlisted.
 */
export const answerKeySchema = z.looseObject({
  correctKey: z.unknown(),
  /** Per-element lure classes, keyed by element id. */
  distractorRationales: distractorRationaleMapSchema.optional(),
});

/** Server-authoritative scoring mode (BUILD_PLAN §2; detail in SPEC §6.4). */
export const scoringModeSchema = z.enum([
  'deterministic_key',
  'computed_solver',
  'proxy_bank',
  'model_judge_deferred',
]);

/**
 * Server-authoritative scoring mode (BUILD_PLAN §2; detail in SPEC §6.4).
 *
 * Open-ended beyond `mode`: `computed_solver` types carry the solver id,
 * tolerance, and partial-credit rule the server needs, and those differ per
 * type. Server-only — `servedItemSchema` omits `scoring`.
 */
export const scoringSchema = z.looseObject({ mode: scoringModeSchema });

/** One validator/QA verdict recorded at generation time (SPEC §6.5). */
export const validatorVerdictSchema = z.looseObject({
  check: z.string().min(1),
  status: z.enum(['pass', 'fail', 'warn', 'skipped']),
});

/**
 * How an item was made (BUILD_PLAN §2). Reproducibility + audit trail.
 *
 * Open-ended: every generator records its own difficulty levers, rule spec,
 * and lexicon hashes, which is the point of a provenance record. Server-only —
 * `servedItemSchema` omits `provenance`.
 */
export const provenanceSchema = z.looseObject({
  generator: z.enum(['grammar', 'llm', 'human']),
  /** Path of the script/prompt that emitted the item, repo-relative. */
  generatorRef: z.string().min(1).optional(),
  /** Grammar reproducibility. */
  seed: z.string().optional(),
  /** LLM model id / prompt-hash reference. */
  model: z.string().optional(),
  validatorVerdicts: z.array(validatorVerdictSchema).optional(),
});

// --- Items --------------------------------------------------------------------

/**
 * Full bank item (server/DB side, BUILD_PLAN §2). Includes the answer key,
 * scoring mode, and provenance — none of which may reach the browser.
 * `content` is an untyped params blob for now; a typed per-type registry
 * (SPEC §6.2) is future work.
 */
export const bankItemSchema = z
  .object({
    itemId: z.uuid(),
    typeCode: questionTypeCodeSchema,
    domain: examDomainSchema,
    /** FLOAT 1..20 design rung (NOT calibrated). */
    difficulty: difficultyScoreSchema,
    /** Targeting hint for selection (age-band preference). */
    ageBands: z.array(ageBandSchema).min(1),
    /**
     * Which renderer presents this item, e.g. `demos/FLU-MATRIX-01.html`
     * (SPEC §6.1). Bank-relative and advisory: a host may resolve the type to
     * its own renderer instead. Optional here so engine- and test-constructed
     * items need not invent one; the research banks all carry it (D-021).
     */
    demoPath: z.string().min(1).optional(),
    /** Renderer-agnostic stimulus/config; typed per-type registry is future work. */
    content: z.record(z.string(), z.unknown()),
    /** SERVER-ONLY. */
    answer: answerKeySchema,
    /** SERVER-ONLY. */
    scoring: scoringSchema,
    /** SERVER-ONLY. */
    provenance: provenanceSchema,
    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strict();

/**
 * Client-facing item (BUILD_PLAN §2): the bank item MINUS
 * answer / scoring / provenance. What the browser is allowed to render.
 */
export const servedItemSchema = bankItemSchema
  .omit({ answer: true, scoring: true, provenance: true })
  .strict();

// --- Telemetry ----------------------------------------------------------------

export const telemetryEventKindSchema = z.enum([
  'session_start',
  'item_shown',
  'ready',
  'first_action',
  'action',
  'revision',
  'idle',
  'response',
  'item_end',
]);

/** One raw interaction event streamed from a demo (append-only trace, §6). */
export const telemetryEventSchema = z
  .object({
    kind: telemetryEventKindSchema,
    itemId: z.uuid().nullable(),
    /** Milliseconds since the referenced item was shown (or session start). */
    tOffsetMs: z.number().nonnegative(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

// --- Results ------------------------------------------------------------------

/**
 * Emitted by the demo via postMessage; the server re-verifies (BUILD_PLAN §2).
 * Carries the child's RAW response only — NO correctness/score from the client.
 */
export const itemResultSchema = z
  .object({
    itemId: z.uuid(),
    typeCode: questionTypeCodeSchema,
    domain: examDomainSchema,
    /** Raw child choice/actions; correctness is decided server-side. */
    response: z.unknown(),
    /** Structured numeric measurements (§4). */
    metrics: metricMapSchema,
    telemetry: z.array(telemetryEventSchema),
  })
  .strict();

/**
 * Server-added scoring on top of an `ItemResult` (BUILD_PLAN §2): correctness,
 * a [0,1] score, and the item's difficulty (for the ability update).
 */
export const scoredItemSchema = itemResultSchema.extend({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  difficulty: difficultyScoreSchema,
});

// --- Demo embedding protocol (postMessage; BUILD_PLAN §2) ---------------------

export const HOST_MESSAGE_SOURCE = 'gt-exam-host';
export const DEMO_MESSAGE_SOURCE = 'gt-exam-demo';

/** host -> demo: load a served item into the embedded demo. */
export const hostInitMessageSchema = z
  .object({
    source: z.literal(HOST_MESSAGE_SOURCE),
    type: z.literal('init'),
    item: servedItemSchema,
  })
  .strict();

/** host -> demo: begin the scored phase. */
export const hostStartMessageSchema = z
  .object({
    source: z.literal(HOST_MESSAGE_SOURCE),
    type: z.literal('start'),
  })
  .strict();

export const hostMessageSchema = z.discriminatedUnion('type', [
  hostInitMessageSchema,
  hostStartMessageSchema,
]);

/** demo -> host: renderer mounted and ready. */
export const demoReadyMessageSchema = z
  .object({
    source: z.literal(DEMO_MESSAGE_SOURCE),
    type: z.literal('ready'),
  })
  .strict();

/** demo -> host: the raw result for the current item (server re-verifies). */
export const demoResultMessageSchema = z
  .object({
    source: z.literal(DEMO_MESSAGE_SOURCE),
    type: z.literal('result'),
    result: itemResultSchema,
  })
  .strict();

/** demo -> host: a raw telemetry event. */
export const demoTelemetryMessageSchema = z
  .object({
    source: z.literal(DEMO_MESSAGE_SOURCE),
    type: z.literal('telemetry'),
    event: telemetryEventSchema,
  })
  .strict();

export const demoMessageSchema = z.discriminatedUnion('type', [
  demoReadyMessageSchema,
  demoResultMessageSchema,
  demoTelemetryMessageSchema,
]);

// --- Engine state (BUILD_PLAN §3) ---------------------------------------------

/**
 * Live per-area adaptive state. `difficulty` is the student's current
 * proficiency estimate in that area (float 1..20); performance adds/subtracts
 * from it (gradual, clamped 1..20).
 */
export const areaStateSchema = z
  .object({
    area: examDomainSchema,
    difficulty: difficultyScoreSchema,
    /** Bank items already served in this area (no repeats). */
    itemsSeen: z.set(z.uuid()),
    /** Recent per-item scores/correctness used to nudge difficulty. */
    accWindow: z.array(z.number()),
    /** Running sample counts per metric (drives the stop rule, §4). */
    metricCounts: metricCountMapSchema,
  })
  .strict();

/** Whole-session adaptive state produced by `startState` and evolved by `update`. */
export const sessionStateSchema = z
  .object({
    sessionId: z.uuid(),
    /** Requested grade band; seeds start difficulty and biases selection. */
    gradeBand: ageBandSchema,
    /** One entry per reasoning area. */
    areas: z.array(areaStateSchema),
    itemsAdministered: z.int().nonnegative(),
    /** True once `isDone` holds (adequate core-metric coverage across areas). */
    done: z.boolean(),
    policyVersion: z.string().min(1),
  })
  .strict();

// --- Tunable policy (BUILD_PLAN §5; defaults now, admin-portal-editable later) -

/** Deterministic within-bracket positioning weights (§5.2). */
export const withinBracketWeightsSchema = z
  .object({
    /** M-DIFFREACH (ceiling). */
    diffReach: z.number(),
    /** Consistency = M-RTVAR inverse / M-CONSIST. */
    consistency: z.number(),
    /** M-LEARNRATE (within-session growth). */
    learnRate: z.number(),
    /** M-ERRTYPE (near-miss vs random). */
    errType: z.number(),
    /** Present process/domain metrics (M-PATH/M-EFF/M-RULEID/...). */
    process: z.number(),
  })
  .strict();

/** Provisional default within-bracket weights (born-synthetic, tunable). */
export const DEFAULT_WITHIN_BRACKET_WEIGHTS: WithinBracketWeights = {
  diffReach: 0.35,
  consistency: 0.2,
  learnRate: 0.2,
  errType: 0.15,
  process: 0.1,
};

/**
 * Tunable exam policy (BUILD_PLAN §5). All weights/cuts are provisional design
 * defaults (born-synthetic, `validated = false`); an admin portal edits them later.
 */
export const examPolicySchema = z
  .object({
    policyVersion: z.string().min(1),
    areas: z.array(examDomainSchema).min(1),

    /** Start difficulty (float 1..20) seeded per requested grade band (§0/§3). */
    startDifficultyByBand: z.record(ageBandSchema, difficultyScoreSchema),

    /** Gradual difficulty update magnitude, clamped 1..20 (§3). */
    difficultyStepMin: z.number().positive().default(0.4),
    difficultyStepMax: z.number().positive().default(1.0),
    /** Sliding accuracy window length for the difficulty nudge. */
    accWindowSize: z.int().min(1).default(5),

    /** Accuracy cut points mapping per-area M-ACC to an ordinal bracket (§5.1). */
    bracketAccuracyCuts: z.array(z.number().min(0).max(1)).default([0.5, 0.7, 0.85, 0.95]),

    /** Within-bracket positioning weights (§5.2). */
    withinBracketWeights: withinBracketWeightsSchema.default(DEFAULT_WITHIN_BRACKET_WEIGHTS),

    /** Stop rule (§3): stable area estimate when consistency SE <= this. */
    stopConsistencyThreshold: z.number().positive().default(0.3),
    minItemsPerArea: z.int().min(1).default(4),
    maxItemsPerArea: z.int().min(1).default(20),

    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strict();

// --- Outcome (BUILD_PLAN §5.3) ------------------------------------------------

/** Per-area result: proficiency (~theta on the 1..20 scale) + profile signals. */
export const areaOutcomeSchema = z
  .object({
    area: examDomainSchema,
    /** ~theta on the 1..20 proficiency scale. */
    proficiency: difficultyScoreSchema,
    /** Ordinal accuracy bracket the area landed in (§5.1). */
    bracket: z.int().nonnegative(),
    itemsSeen: z.int().nonnegative(),
    /** M-DIFFREACH: hardest difficulty reached (float 1..20). */
    ceiling: difficultyScoreSchema,
    /** From M-RTVAR inverse / M-CONSIST (higher = steadier); null if unknown. */
    consistency: z.number().nullable(),
    /** M-LEARNRATE within-session growth slope; null if unknown. */
    learningRate: z.number().nullable(),
  })
  .strict();

/** Cross-area profile (strengths, learning rate, consistency). NO decision label. */
export const examProfileSchema = z
  .object({
    /** Areas above the composite. */
    strengths: z.array(examDomainSchema),
    learningRate: z.number().nullable(),
    consistency: z.number().nullable(),
  })
  .strict();

/**
 * Final exam outcome (BUILD_PLAN §5.3): per-area proficiency + composite +
 * profile. Deterministic and fully reproducible from the stored trace.
 * NO admit/defer/retry decision label (§0/§5).
 */
export const examOutcomeSchema = z
  .object({
    areaOutcomes: z.array(areaOutcomeSchema),
    /** Composite proficiency on the 1..20 scale. */
    composite: difficultyScoreSchema,
    profile: examProfileSchema,
    policyVersion: z.string().min(1),
    /** R10 boundary: a reliable screen is not program-impact evidence. */
    claimBoundary: z.string().min(1),
    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strict();

// --- Basic-core metric registry (BUILD_PLAN §4) -------------------------------

/** Where a metric applies. */
export const metricScopeSchema = z.enum([
  'all',
  'interactive',
  'fluid',
  'verbal',
  'quant',
  'spatial',
  'open-ended',
]);

/**
 * What a metric drives now. `select` covers item/type selection AND the
 * continuation/stop rule; `score` covers bracket + within-bracket positioning;
 * `track` = recorded but inert (engagement metrics are tracked, not enforced).
 */
export const metricInfluenceSchema = z.enum(['select', 'score', 'track']);

export const coreMetricSpecSchema = z
  .object({
    id: metricIdSchema,
    scope: metricScopeSchema,
    /** Provisional design minimum sample count for the stop rule (§3); NOT calibrated. */
    minSamples: z.int().nonnegative(),
    influences: z.array(metricInfluenceSchema).min(1),
  })
  .strict();

export type CoreMetricSpec = z.infer<typeof coreMetricSpecSchema>;

/**
 * The basic-core metric set (BUILD_PLAN §4): the ~20 measurements tracked AND
 * influencing selection/scoring now. `minSamples` values are provisional design
 * defaults (born-synthetic, not empirically calibrated). `influences` maps the
 * §4 "Used for" column onto the {select, score, track} vocabulary (stop-rule
 * folds into `select`; profile follows from `score`).
 */
export const BASIC_CORE_METRICS: readonly CoreMetricSpec[] = [
  { id: 'M-ACC', scope: 'all', minSamples: 10, influences: ['select', 'score'] },
  { id: 'M-DIFFREACH', scope: 'all', minSamples: 6, influences: ['select', 'score'] },
  { id: 'M-RT', scope: 'all', minSamples: 8, influences: ['score'] },
  { id: 'M-RTFIRST', scope: 'all', minSamples: 8, influences: ['score'] },
  { id: 'M-RTVAR', scope: 'all', minSamples: 8, influences: ['score'] },
  { id: 'M-REV', scope: 'all', minSamples: 8, influences: ['score'] },
  { id: 'M-ERRTYPE', scope: 'all', minSamples: 6, influences: ['select', 'score'] },
  { id: 'M-CONSIST', scope: 'all', minSamples: 10, influences: ['select', 'score'] },
  { id: 'M-LEARNRATE', scope: 'all', minSamples: 6, influences: ['score'] },
  { id: 'M-PATH', scope: 'interactive', minSamples: 3, influences: ['score'] },
  { id: 'M-EFF', scope: 'interactive', minSamples: 3, influences: ['score'] },
  { id: 'M-PLANFUL', scope: 'interactive', minSamples: 3, influences: ['score'] },
  { id: 'M-ENGAGE', scope: 'all', minSamples: 8, influences: ['track'] },
  { id: 'M-RAPIDGUESS', scope: 'all', minSamples: 8, influences: ['track'] },
  { id: 'M-RULEID', scope: 'fluid', minSamples: 4, influences: ['score'] },
  { id: 'M-VOCABLVL', scope: 'verbal', minSamples: 4, influences: ['score'] },
  { id: 'M-LURETYPE', scope: 'verbal', minSamples: 4, influences: ['score'] },
  { id: 'M-PAE', scope: 'quant', minSamples: 4, influences: ['score'] },
  { id: 'M-ROTSLOPE', scope: 'spatial', minSamples: 4, influences: ['score'] },
  { id: 'M-IDEAFLU', scope: 'open-ended', minSamples: 3, influences: ['track', 'select'] },
];

// --- Inferred types -----------------------------------------------------------

export type ExamDomain = z.infer<typeof examDomainSchema>;
export type AgeBand = z.infer<typeof ageBandSchema>;
export type QuestionTypeCode = z.infer<typeof questionTypeCodeSchema>;
export type MetricId = z.infer<typeof metricIdSchema>;
export type DifficultyScore = z.infer<typeof difficultyScoreSchema>;
export type MetricMap = z.infer<typeof metricMapSchema>;
export type MetricCountMap = z.infer<typeof metricCountMapSchema>;
export type LureClass = z.infer<typeof lureClassSchema>;
export type DistractorRationale = z.infer<typeof distractorRationaleSchema>;
export type DistractorRationaleMap = z.infer<typeof distractorRationaleMapSchema>;
export type AnswerKey = z.infer<typeof answerKeySchema>;
export type ScoringMode = z.infer<typeof scoringModeSchema>;
export type Scoring = z.infer<typeof scoringSchema>;
export type ValidatorVerdict = z.infer<typeof validatorVerdictSchema>;
export type Provenance = z.infer<typeof provenanceSchema>;
export type BankItem = z.infer<typeof bankItemSchema>;
export type ServedItem = z.infer<typeof servedItemSchema>;
export type TelemetryEventKind = z.infer<typeof telemetryEventKindSchema>;
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
export type ItemResult = z.infer<typeof itemResultSchema>;
export type ScoredItem = z.infer<typeof scoredItemSchema>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
export type DemoMessage = z.infer<typeof demoMessageSchema>;
export type AreaState = z.infer<typeof areaStateSchema>;
export type SessionState = z.infer<typeof sessionStateSchema>;
export type WithinBracketWeights = z.infer<typeof withinBracketWeightsSchema>;
export type ExamPolicy = z.infer<typeof examPolicySchema>;
export type AreaOutcome = z.infer<typeof areaOutcomeSchema>;
export type ExamProfile = z.infer<typeof examProfileSchema>;
export type ExamOutcome = z.infer<typeof examOutcomeSchema>;
export type MetricScope = z.infer<typeof metricScopeSchema>;
export type MetricInfluence = z.infer<typeof metricInfluenceSchema>;
