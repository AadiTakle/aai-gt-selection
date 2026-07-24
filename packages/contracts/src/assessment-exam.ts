import { z } from 'zod';

import { apiSuccessSchema } from './api-envelope';

/**
 * Adaptive screening-instrument contracts (AX-01, D-016; serves R11/R5).
 *
 * Framework- and Supabase-free Zod schemas shared by the CAT engine
 * (`@gt-selection/cat-engine`), the Supabase RPC adapter, and the test-taking
 * surface. Everything here is born-synthetic (`synthetic_only`, `validated=false`);
 * no item parameter or cut is empirically calibrated (see RES-012).
 */

// --- Core enums ---------------------------------------------------------------

/** The four testable reasoning domains. Working memory / processing speed /
 * engagement are cross-cutting measured signals, not domains. */
export const examDomainSchema = z.enum(['fluid_reasoning', 'verbal', 'quantitative', 'spatial']);

export const ageBandSchema = z.enum(['K-1', '2-3', '4-5', '6-8']);

export const sessionStatusSchema = z.enum(['active', 'completed', 'abandoned']);

/** Tunable, GT-owned screening decision (R11). Screening only — not admission. */
export const screenDecisionSchema = z.enum(['admit', 'defer', 'retry']);

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

// --- IRT parameters (2PL / 3PL) ----------------------------------------------

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

/** Full item as stored in the bank (engine/DB side; includes IRT params). */
export const examItemSchema = z
  .object({
    itemId: z.uuid(),
    typeCode: questionTypeCodeSchema,
    domain: examDomainSchema,
    /** Ordinal difficulty rung within the type's ladder. */
    difficultyLevel: z.int().min(1).max(20),
    ageBands: z.array(ageBandSchema).min(1),
    irt: irtParametersSchema,
    /** Renderer, relative to the demos root, e.g. `demos/FLU-MATRIX-01.html`. */
    demoPath: z.string().min(1),
    /** Item-specific config the demo interprets (seed, variant, options). */
    params: z.record(z.string(), z.unknown()),
    syntheticOnly: z.literal(true),
  })
  .strict();

/** Item as delivered to the client — no IRT parameters leak to the browser. */
export const servedItemSchema = z
  .object({
    itemId: z.uuid(),
    typeCode: questionTypeCodeSchema,
    domain: examDomainSchema,
    difficultyLevel: z.int().min(1).max(20),
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

export const telemetryEventKindSchema = z.enum([
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
]);

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

// --- Ability state, policy, and screening outcome -----------------------------

/** Live per-domain adaptive state (theta/SE updated after each response). */
export const domainAbilitySchema = z
  .object({
    domain: examDomainSchema,
    theta: z.number(),
    se: z.number().nonnegative(),
    itemsAdministered: z.int().nonnegative(),
    done: z.boolean(),
  })
  .strict();

/** Tunable, GT-owned screening policy — versioned synthetic config (R11). */
export const examPolicySchema = z
  .object({
    policyVersion: z.string().min(1),
    domains: z.array(examDomainSchema).min(1),
    minItemsPerDomain: z.int().min(1),
    maxItemsPerDomain: z.int().min(1),
    /** Stop a domain when its standard error falls to/below this. */
    targetSe: z.number().positive(),
    priorMean: z.number(),
    priorSd: z.number().positive(),
    /** Randomesque exposure control: choose randomly among the top-K by info. */
    exposureTopK: z.int().min(1),
    /** Timeback-fit composite weights per domain (sum need not be 1). */
    fitWeights: z.record(examDomainSchema, z.number()),
    /** fitIndex >= admitCut => admit. */
    admitCut: z.number(),
    /** fitIndex < retryCut => retry; between the two => defer. */
    retryCut: z.number(),
    /** Timeback-fit modifiers folded into fitIndex (0 = theta-only, GT-tunable). */
    learningRateWeight: z.number().default(0),
    consistencyWeight: z.number().default(0),
    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strict();

/** Final per-domain summary, including Timeback-fit signals. */
export const domainScoreSchema = z
  .object({
    domain: examDomainSchema,
    theta: z.number(),
    se: z.number().nonnegative(),
    percentile: z.number().min(0).max(100).nullable(),
    itemsAdministered: z.int().nonnegative(),
    /** M-DIFFREACH: hardest difficulty rung answered correctly. */
    maxDifficultyReached: z.int().nonnegative(),
    /** M-LEARNRATE: within-session ability growth slope (Timeback-fit core). */
    learningRate: z.number().nullable(),
    /** Consistency from RT variability / lapse rate (higher = steadier). */
    consistency: z.number().nullable(),
  })
  .strict();

export const screeningOutcomeSchema = z
  .object({
    domainScores: z.array(domainScoreSchema),
    compositeTheta: z.number(),
    /** Tunable Timeback-fit composite index. */
    fitIndex: z.number(),
    /** Overall engagement gate (false = results provisional). */
    engagementValid: z.boolean(),
    decision: screenDecisionSchema,
    policyVersion: z.string().min(1),
    /** R10 boundary — a reliable screen is not program-impact evidence. */
    claimBoundary: z.string().min(1),
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
    abilities: z.array(domainAbilitySchema),
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

export const createParticipantResponseSchema = apiSuccessSchema(createParticipantResponseDataSchema);

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

export const listExamItemsResponseDataSchema = z.object({ items: z.array(examItemSchema) }).strict();
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

/** host -> demo: begin the scored phase (after the wordless warm-up). */
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
export type ScreenDecision = z.infer<typeof screenDecisionSchema>;
export type MeasurementMap = z.infer<typeof measurementMapSchema>;
export type IrtParameters = z.infer<typeof irtParametersSchema>;
export type ExamItem = z.infer<typeof examItemSchema>;
export type ServedItem = z.infer<typeof servedItemSchema>;
export type ItemResponse = z.infer<typeof itemResponseSchema>;
export type TelemetryEventKind = z.infer<typeof telemetryEventKindSchema>;
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
export type DomainAbility = z.infer<typeof domainAbilitySchema>;
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
