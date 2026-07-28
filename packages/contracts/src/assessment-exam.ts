import { z } from 'zod';

import { apiSuccessSchema } from './api-envelope';

/**
 * Format-agnostic cognitive-exam contracts (AX-01..AX-05, D-016; serves R11/R5/R9).
 *
 * Framework- and Supabase-free Zod schemas shared by the exam engine, the
 * Supabase RPC adapter, and the test-taking surface. Everything here is
 * born-synthetic (`synthetic_only`, `validated=false`, D-006/R9); no item
 * parameter or cut is empirically calibrated (RES-012).
 *
 * STRUCTURE-AGNOSTIC by design. The delivery structure (linear/fixed-form,
 * adaptive, two-stage/multistage, or custom) is carried as *tunable config*
 * (`deliveryStructure`, `itemSelection`, `stopRule`, `structureConfig`,
 * `structureState`) rather than baked into the tables or the required shape of
 * a session, policy, item, or outcome. Adaptive-only concepts (live theta/SE
 * ability tracking, EAP priors, max-information selection, SE stop rules,
 * fit/learning-rate composites) live inside opaque, engine-owned config/state
 * blobs the contract does not interpret — so a linear fixed form and an
 * adaptive form both validate against the same schemas.
 *
 * Salvaged and adapted from commit `2b458cb`
 * (`packages/contracts/src/assessment-exam.ts`). Held for human review.
 */

// --- Core enums ---------------------------------------------------------------

/** Reasoning content areas measured by the exam. A *content* taxonomy, not a
 * delivery-structure assumption. */
export const examDomainSchema = z.enum(['fluid_reasoning', 'verbal', 'quantitative', 'spatial']);

export const ageBandSchema = z.enum(['K-1', '2-3', '4-5', '6-8']);

export const sessionStatusSchema = z.enum(['active', 'completed', 'abandoned']);

/**
 * How items are delivered across a session. Naming the structure explicitly
 * (as tunable config) is what lets the model stay structure-agnostic: nothing
 * downstream is allowed to *assume* one of these values.
 */
export const deliveryStructureSchema = z.enum(['linear', 'adaptive', 'two_stage', 'custom']);

/**
 * How an item is scored. IRT is one option among several; a format-agnostic
 * bank may hold classical, rubric-scored, or rule-based items with no IRT
 * parameters at all.
 */
export const scoringModelSchema = z.enum([
  'irt_2pl',
  'irt_3pl',
  'classical',
  'rubric',
  'rule_based',
  'none',
]);

/** Named point-estimate scale for a score. Structure-agnostic: `theta` is only
 * one option, alongside percent/raw/logit/custom. */
export const scoreScaleSchema = z.enum(['theta', 'percent', 'raw', 'logit', 'custom']);

/** Item-selection strategy label. The concrete parameters live in
 * `itemSelection.params`, so no adaptive-specific field is required. */
export const itemSelectionStrategySchema = z.enum([
  'fixed_order',
  'random',
  'max_information',
  'stratified',
  'custom',
]);

/** Stop-rule label. Parameters (e.g. `{ count }`, `{ targetSe }`,
 * `{ maxSeconds }`) live in `stopRule.params`. */
export const stopRuleKindSchema = z.enum([
  'fixed_count',
  'target_precision',
  'time_limit',
  'custom',
]);

/**
 * Tunable, GT-owned SCREENING routing signal — never an admission decision
 * (R10 claim boundary). Deliberately renamed from the salvaged
 * `admit|defer|retry` to `advance|hold|retry` to avoid an admission-claim
 * smell, consistent with the app-wide prohibition on admitted/offered/… public
 * outcomes. Held for human review.
 */
export const screenDecisionSchema = z.enum(['advance', 'hold', 'retry']);

// --- Identifiers --------------------------------------------------------------

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Z0-9_-]+$/);

/** Question-type code from the catalog, e.g. `FLU-MATRIX-01`. */
export const questionTypeCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]+-[A-Z0-9]+-\d+$/);

/** Pseudonymous, PII-free participant code, e.g. `PART-SYN-0001`. */
export const participantCodeSchema = codeSchema.regex(/^PART-SYN-[A-Z0-9-]+$/);

/** Measurement id from `measurements.json`, e.g. `M-ACC`, `M-DIFFREACH`. */
export const measurementIdSchema = z.string().regex(/^M-[A-Z]+$/);

/** Per-item measurement values keyed by measurement id (fully automated). */
export const measurementMapSchema = z.record(measurementIdSchema, z.number());

/**
 * Opaque, engine-owned config/state the CONTRACT does not interpret. This is
 * the seam that keeps the model structure-agnostic: adaptive priors, exposure
 * controls, routing tables, live theta/SE, stage indices, etc. all live here
 * and are meaningful only to the engine that produced them.
 */
export const opaqueConfigSchema = z.record(z.string(), z.unknown());

/** Generic numeric signal map for derived, structure-specific metrics
 * (e.g. `fitIndex`, `compositeTheta`, `learningRate`, `maxDifficultyReached`). */
export const metricMapSchema = z.record(z.string(), z.number());

// --- IRT parameters (2PL / 3PL) ----------------------------------------------

/** Optional per-item IRT parameters. Present only for IRT-scored items. */
export const irtParametersSchema = z
  .object({
    /** Discrimination (a). */
    a: z.number().positive(),
    /** Difficulty (b) on the theta scale. */
    b: z.number(),
    /** Pseudo-guessing (c); 0 for a 2PL item. */
    c: z.number().min(0).max(1),
    model: z.enum(['2PL', '3PL']),
  })
  .strict();

// --- Items --------------------------------------------------------------------

/**
 * Full item as stored in the bank (engine/DB side). IRT parameters are optional
 * so a non-IRT (classical/rubric/rule-based) format is a first-class citizen.
 */
export const examItemSchema = z
  .object({
    itemId: z.uuid(),
    typeCode: questionTypeCodeSchema,
    domain: examDomainSchema,
    /** Optional ordinal difficulty rung; `null` when a format has no ladder. */
    difficultyLevel: z.int().min(1).max(20).nullable(),
    ageBands: z.array(ageBandSchema).min(1),
    /** Declares HOW the item is scored; drives whether `irt` is required. */
    scoringModel: scoringModelSchema,
    /** IRT parameters, present only for IRT scoring models; otherwise `null`. */
    irt: irtParametersSchema.nullable(),
    /** Renderer, relative to the demos root, e.g. `demos/FLU-MATRIX-01.html`. */
    demoPath: z.string().min(1),
    /** Item-specific config the demo interprets (seed, variant, options). */
    params: z.record(z.string(), z.unknown()),
    syntheticOnly: z.literal(true),
  })
  .strict()
  .refine(
    (item) =>
      item.scoringModel !== 'irt_2pl' && item.scoringModel !== 'irt_3pl' ? true : item.irt !== null,
    {
      message: 'IRT scoring models require irt parameters',
      path: ['irt'],
    },
  );

/** Item as delivered to the client — no scoring parameters leak to the browser. */
export const servedItemSchema = z
  .object({
    itemId: z.uuid(),
    typeCode: questionTypeCodeSchema,
    domain: examDomainSchema,
    difficultyLevel: z.int().min(1).max(20).nullable(),
    demoPath: z.string().min(1),
    params: z.record(z.string(), z.unknown()),
  })
  .strict();

// --- Responses & telemetry ----------------------------------------------------

/** A scored response plus its automatically-derived measurements. */
export const itemResponseSchema = z
  .object({
    itemId: z.uuid(),
    correct: z.boolean(),
    /** Partial-credit score in [0,1]; 1 for a correct dichotomous item. */
    score: z.number().min(0).max(1),
    rtMs: z.number().nonnegative(),
    firstActionMs: z.number().nonnegative().nullable(),
    revisions: z.int().nonnegative(),
    /** Engagement gate: false = rapid-guess / off-task; speed signals discounted. */
    engaged: z.boolean(),
    measurements: measurementMapSchema,
    syntheticOnly: z.literal(true),
  })
  .strict();

/**
 * Telemetry event kind. A generic, lower_snake code rather than a fixed
 * (adaptive-flavored) enum, so any delivery structure can emit its own event
 * vocabulary. See `SUGGESTED_TELEMETRY_KINDS` for a non-binding reference set.
 */
export const telemetryEventKindSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z][a-z0-9_]*$/);

/** Non-binding, reference-only telemetry vocabulary (not enforced). */
export const SUGGESTED_TELEMETRY_KINDS = [
  'session_start',
  'item_shown',
  'ready',
  'warmup_done',
  'first_action',
  'action',
  'hint',
  'revision',
  'idle',
  'response',
  'item_end',
] as const;

/** One raw interaction event streamed from a demo (append-only in the DB). */
export const telemetryEventSchema = z
  .object({
    kind: telemetryEventKindSchema,
    itemId: z.uuid().nullable(),
    /** Milliseconds since the referenced item was shown (or session start). */
    tOffsetMs: z.number().nonnegative(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

// --- Session progress, policy, and outcome ------------------------------------

/**
 * Structure-neutral per-domain progress. Deliberately holds NO live theta/SE
 * (that adaptive state, if any, lives in `session.structureState`). Works
 * identically for linear, adaptive, and two-stage delivery.
 */
export const domainProgressSchema = z
  .object({
    domain: examDomainSchema,
    itemsAdministered: z.int().nonnegative(),
    done: z.boolean(),
  })
  .strict();

/**
 * Tunable, GT-owned screening policy — versioned synthetic config (R11).
 * Structure-agnostic: the only required knobs are structure-neutral; all
 * structure-specific tuning is carried inside `structureConfig`.
 */
export const examPolicySchema = z
  .object({
    policyVersion: z.string().min(1),
    deliveryStructure: deliveryStructureSchema,
    domains: z.array(examDomainSchema).min(1),
    scoringModel: scoringModelSchema,
    /** Strategy label + opaque params (e.g. `exposureTopK` for max_information). */
    itemSelection: z
      .object({
        strategy: itemSelectionStrategySchema,
        params: opaqueConfigSchema,
      })
      .strict(),
    /** Stop-rule label + opaque params (e.g. `count`, `targetSe`, `maxSeconds`). */
    stopRule: z
      .object({
        kind: stopRuleKindSchema,
        params: opaqueConfigSchema,
      })
      .strict(),
    /**
     * Tunable screening cuts on the composite score:
     * composite >= advanceCut -> advance; composite < retryFloor -> retry;
     * otherwise -> hold. Screening only (R10), never admission.
     */
    decision: z
      .object({
        advanceCut: z.number(),
        retryFloor: z.number(),
      })
      .strict(),
    /** Structure/engine-specific tuning the contract does not interpret
     * (e.g. adaptive priorMean/priorSd, routing modules). Empty for linear. */
    structureConfig: opaqueConfigSchema,
    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strict();

/** Final per-domain summary. `se` and structure-specific signals are optional. */
export const domainScoreSchema = z
  .object({
    domain: examDomainSchema,
    /** Point estimate on `scoreScale` (theta for IRT, percent for classical, …). */
    score: z.number(),
    scoreScale: scoreScaleSchema,
    /** Standard error where the scoring model produces one; otherwise `null`. */
    se: z.number().nonnegative().nullable(),
    percentile: z.number().min(0).max(100).nullable(),
    itemsAdministered: z.int().nonnegative(),
    /** Structure-specific derived signals (maxDifficultyReached, learningRate, …). */
    metrics: metricMapSchema,
  })
  .strict();

export const screeningOutcomeSchema = z
  .object({
    domainScores: z.array(domainScoreSchema),
    /** Composite point estimate on `compositeScale`. */
    composite: z.number(),
    compositeScale: scoreScaleSchema,
    /** Overall engagement gate (false = results provisional). */
    engagementValid: z.boolean(),
    decision: screenDecisionSchema,
    policyVersion: z.string().min(1),
    /** R10 boundary — a reliable screen is not program-impact evidence. */
    claimBoundary: z.string().min(1),
    /** Structure-specific composite signals (e.g. fitIndex, compositeTheta). */
    metrics: metricMapSchema,
    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strict();

// --- Session ------------------------------------------------------------------

export const participantSchema = z
  .object({
    participantId: z.uuid(),
    pseudonymCode: participantCodeSchema,
    ageBand: ageBandSchema,
    syntheticOnly: z.literal(true),
  })
  .strict();

export const sessionSchema = z
  .object({
    sessionId: z.uuid(),
    participantId: z.uuid(),
    status: sessionStatusSchema,
    ageBand: ageBandSchema,
    policyVersion: z.string().min(1),
    deliveryStructure: deliveryStructureSchema,
    /** Structure-neutral progress; no live ability state is baked in. */
    progress: z.array(domainProgressSchema),
    /** Opaque engine-owned live state (adaptive theta/SE, stage index, …) or
     * `null`. The contract never interprets this. */
    structureState: opaqueConfigSchema.nullable(),
    startedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

// --- RPC request / response envelopes ----------------------------------------

export const createParticipantRequestSchema = z
  .object({
    pseudonymCode: participantCodeSchema,
    ageBand: ageBandSchema,
    correlationId: z.uuid(),
  })
  .strict();

export const createParticipantResponseDataSchema = z
  .object({ participant: participantSchema })
  .strict();

export const createParticipantResponseSchema = apiSuccessSchema(
  createParticipantResponseDataSchema,
);

export const startSessionRequestSchema = z
  .object({
    participantId: z.uuid(),
    policyVersion: z.string().min(1),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const startSessionResponseDataSchema = z
  .object({
    session: sessionSchema,
    nextItem: servedItemSchema.nullable(),
  })
  .strict();

export const startSessionResponseSchema = apiSuccessSchema(startSessionResponseDataSchema);

export const submitResponseRequestSchema = z
  .object({
    sessionId: z.uuid(),
    response: itemResponseSchema,
    telemetry: z.array(telemetryEventSchema).max(2000),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const submitResponseResponseDataSchema = z
  .object({
    session: sessionSchema,
    /** null once the whole session is complete. */
    nextItem: servedItemSchema.nullable(),
    /** present only when the session completes on this submission. */
    outcome: screeningOutcomeSchema.nullable(),
  })
  .strict();

export const submitResponseResponseSchema = apiSuccessSchema(submitResponseResponseDataSchema);

export const getSessionRequestSchema = z
  .object({
    sessionId: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

export const getSessionResponseDataSchema = z
  .object({
    session: sessionSchema,
    nextItem: servedItemSchema.nullable(),
    outcome: screeningOutcomeSchema.nullable(),
  })
  .strict();

export const getSessionResponseSchema = apiSuccessSchema(getSessionResponseDataSchema);

// --- RPC response schemas (server adapter reads config/state) -----------------

export const getExamPolicyResponseDataSchema = z.object({ policy: examPolicySchema }).strict();
export const getExamPolicyResponseSchema = apiSuccessSchema(getExamPolicyResponseDataSchema);

export const listExamItemsResponseDataSchema = z
  .object({ items: z.array(examItemSchema) })
  .strict();
export const listExamItemsResponseSchema = apiSuccessSchema(listExamItemsResponseDataSchema);

/** start/submit RPCs persist and return the updated session only. */
export const examSessionResponseDataSchema = z.object({ session: sessionSchema }).strict();
export const examSessionResponseSchema = apiSuccessSchema(examSessionResponseDataSchema);

/** A response as stored in the DB (used to rebuild engine state server-side). */
export const persistedResponseSchema = z
  .object({
    itemId: z.uuid(),
    domain: examDomainSchema,
    orderNo: z.int().positive(),
    correct: z.boolean(),
    score: z.number().min(0).max(1),
    rtMs: z.number().nonnegative(),
    firstActionMs: z.number().nonnegative().nullable(),
    revisions: z.int().nonnegative(),
    engaged: z.boolean(),
    measurements: measurementMapSchema,
  })
  .strict();

export const examSessionStateResponseDataSchema = z
  .object({
    session: sessionSchema,
    responses: z.array(persistedResponseSchema),
    outcome: screeningOutcomeSchema.nullable(),
  })
  .strict();
export const examSessionStateResponseSchema = apiSuccessSchema(examSessionStateResponseDataSchema);

/** Client-facing step returned by the exam service (adapter-built). */
export type ExamStep = z.infer<typeof submitResponseResponseDataSchema>;
export type PersistedResponse = z.infer<typeof persistedResponseSchema>;

// --- Demo embedding protocol (postMessage; AX-01) -----------------------------

export const HOST_MESSAGE_SOURCE = 'gt-exam-host';
export const DEMO_MESSAGE_SOURCE = 'gt-exam-demo';

/** host -> demo: load an item into the embedded demo. */
export const hostInitMessageSchema = z
  .object({
    source: z.literal(HOST_MESSAGE_SOURCE),
    type: z.literal('init'),
    sessionId: z.uuid(),
    item: servedItemSchema,
  })
  .strict();

/** host -> demo: begin the scored phase (after an optional wordless warm-up). */
export const hostStartMessageSchema = z
  .object({
    source: z.literal(HOST_MESSAGE_SOURCE),
    type: z.literal('start'),
    itemId: z.uuid(),
  })
  .strict();

export const hostMessageSchema = z.discriminatedUnion('type', [
  hostInitMessageSchema,
  hostStartMessageSchema,
]);

/** demo -> host: renderer mounted and ready (before an item is loaded). */
export const demoReadyMessageSchema = z
  .object({
    source: z.literal(DEMO_MESSAGE_SOURCE),
    type: z.literal('ready'),
    itemId: z.uuid().optional(),
  })
  .strict();

/** demo -> host: unscored warm-up finished; scoring may begin. */
export const demoWarmupDoneMessageSchema = z
  .object({
    source: z.literal(DEMO_MESSAGE_SOURCE),
    type: z.literal('warmup_done'),
    itemId: z.uuid(),
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

/** demo -> host: the scored response for the current item. */
export const demoResponseMessageSchema = z
  .object({
    source: z.literal(DEMO_MESSAGE_SOURCE),
    type: z.literal('response'),
    response: itemResponseSchema,
  })
  .strict();

export const demoMessageSchema = z.discriminatedUnion('type', [
  demoReadyMessageSchema,
  demoWarmupDoneMessageSchema,
  demoTelemetryMessageSchema,
  demoResponseMessageSchema,
]);

// --- Inferred types -----------------------------------------------------------

export type ExamDomain = z.infer<typeof examDomainSchema>;
export type AgeBand = z.infer<typeof ageBandSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type DeliveryStructure = z.infer<typeof deliveryStructureSchema>;
export type ScoringModel = z.infer<typeof scoringModelSchema>;
export type ScoreScale = z.infer<typeof scoreScaleSchema>;
export type ItemSelectionStrategy = z.infer<typeof itemSelectionStrategySchema>;
export type StopRuleKind = z.infer<typeof stopRuleKindSchema>;
export type ScreenDecision = z.infer<typeof screenDecisionSchema>;
export type MeasurementMap = z.infer<typeof measurementMapSchema>;
export type MetricMap = z.infer<typeof metricMapSchema>;
export type OpaqueConfig = z.infer<typeof opaqueConfigSchema>;
export type IrtParameters = z.infer<typeof irtParametersSchema>;
export type ExamItem = z.infer<typeof examItemSchema>;
export type ServedItem = z.infer<typeof servedItemSchema>;
export type ItemResponse = z.infer<typeof itemResponseSchema>;
export type TelemetryEventKind = z.infer<typeof telemetryEventKindSchema>;
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
export type DomainProgress = z.infer<typeof domainProgressSchema>;
export type ExamPolicy = z.infer<typeof examPolicySchema>;
export type DomainScore = z.infer<typeof domainScoreSchema>;
export type ScreeningOutcome = z.infer<typeof screeningOutcomeSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type ExamSession = z.infer<typeof sessionSchema>;
export type CreateParticipantRequest = z.infer<typeof createParticipantRequestSchema>;
export type CreateParticipantResponse = z.infer<typeof createParticipantResponseSchema>;
export type StartSessionRequest = z.infer<typeof startSessionRequestSchema>;
export type StartSessionResponse = z.infer<typeof startSessionResponseSchema>;
export type SubmitResponseRequest = z.infer<typeof submitResponseRequestSchema>;
export type SubmitResponseResponse = z.infer<typeof submitResponseResponseSchema>;
export type GetSessionRequest = z.infer<typeof getSessionRequestSchema>;
export type GetSessionResponse = z.infer<typeof getSessionResponseSchema>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
export type DemoMessage = z.infer<typeof demoMessageSchema>;
