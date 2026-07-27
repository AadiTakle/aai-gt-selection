import type {
  ExamItem,
  ExamPolicy,
  ExamSession,
  ItemResponse,
  Participant,
  ScreeningOutcome,
  ServedItem,
  StartSessionResponse,
  SubmitResponseResponse,
  TelemetryEvent,
} from '@gt-selection/contracts';

/**
 * Born-synthetic fixtures for the format-agnostic exam data model (AX-01..AX-05,
 * D-016; R9/D-006). Everything is `syntheticOnly: true` and, for tunable config,
 * `validated: false`. No parameter or cut is empirically calibrated (RES-012).
 *
 * The DEFAULT session/policy fixtures are LINEAR (non-adaptive) on purpose: they
 * are the acceptance evidence that the schema is structure-agnostic end-to-end.
 * An adaptive policy fixture is included to show the same schema also expresses
 * adaptive delivery through tunable config alone.
 *
 * Held for human review before any DB apply or merge.
 */

const CLAIM_BOUNDARY = 'A reliable screen is not program-impact evidence (screening only, R10).';

export const syntheticExamPolicyLinear = {
  policyVersion: 'exam-syn-linear-v1',
  deliveryStructure: 'linear',
  domains: ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'],
  scoringModel: 'classical',
  itemSelection: { strategy: 'fixed_order', params: {} },
  stopRule: { kind: 'fixed_count', params: { count: 8 } },
  decision: { advanceCut: 0.8, retryFloor: -0.8 },
  structureConfig: {},
  syntheticOnly: true,
  validated: false,
} satisfies ExamPolicy;

export const syntheticExamPolicyAdaptive = {
  policyVersion: 'exam-syn-adaptive-v1',
  deliveryStructure: 'adaptive',
  domains: ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'],
  scoringModel: 'irt_2pl',
  itemSelection: { strategy: 'max_information', params: { exposureTopK: 3 } },
  stopRule: { kind: 'target_precision', params: { targetSe: 0.42 } },
  decision: { advanceCut: 0.8, retryFloor: -0.8 },
  structureConfig: { priorMean: 0, priorSd: 1 },
  syntheticOnly: true,
  validated: false,
} satisfies ExamPolicy;

export const syntheticParticipant = {
  participantId: '00000000-0000-4000-8000-00000000ea01',
  pseudonymCode: 'PART-SYN-0001',
  ageBand: '4-5',
  syntheticOnly: true,
} satisfies Participant;

export const syntheticIrtItem = {
  itemId: '00000000-0000-4000-8000-00000000ea21',
  typeCode: 'FLU-MATRIX-01',
  domain: 'fluid_reasoning',
  difficultyLevel: 4,
  ageBands: ['K-1', '2-3', '4-5', '6-8'],
  scoringModel: 'irt_2pl',
  irt: { a: 1.2, b: -0.275, c: 0, model: '2PL' },
  demoPath: 'FLU-MATRIX-01.html',
  params: { seed: 'FLU-MATRIX-01-4', difficulty: 4 },
  syntheticOnly: true,
} satisfies ExamItem;

export const syntheticClassicalItem = {
  itemId: '00000000-0000-4000-8000-00000000ea22',
  typeCode: 'VER-CLOZE-01',
  domain: 'verbal',
  difficultyLevel: 3,
  ageBands: ['2-3', '4-5'],
  scoringModel: 'classical',
  irt: null,
  demoPath: 'VER-CLOZE-01.html',
  params: { seed: 'VER-CLOZE-01-3', difficulty: 3 },
  syntheticOnly: true,
} satisfies ExamItem;

export const syntheticServedItem = {
  itemId: '00000000-0000-4000-8000-00000000ea21',
  typeCode: 'FLU-MATRIX-01',
  domain: 'fluid_reasoning',
  difficultyLevel: 4,
  demoPath: 'FLU-MATRIX-01.html',
  params: { seed: 'FLU-MATRIX-01-4', difficulty: 4 },
} satisfies ServedItem;

export const syntheticItemResponse = {
  itemId: '00000000-0000-4000-8000-00000000ea21',
  correct: true,
  score: 1,
  rtMs: 8200,
  firstActionMs: 1400,
  revisions: 1,
  engaged: true,
  measurements: { 'M-ACC': 1, 'M-RT': 8200, 'M-DIFFREACH': 4 },
  syntheticOnly: true,
} satisfies ItemResponse;

export const syntheticTelemetryEvents = [
  { kind: 'session_start', itemId: null, tOffsetMs: 0, payload: {} },
  {
    kind: 'item_shown',
    itemId: '00000000-0000-4000-8000-00000000ea21',
    tOffsetMs: 50,
    payload: { demoPath: 'FLU-MATRIX-01.html' },
  },
  {
    kind: 'first_action',
    itemId: '00000000-0000-4000-8000-00000000ea21',
    tOffsetMs: 1400,
    payload: {},
  },
  {
    kind: 'response',
    itemId: '00000000-0000-4000-8000-00000000ea21',
    tOffsetMs: 8200,
    payload: { correct: true },
  },
] satisfies TelemetryEvent[];

const emptyProgress = [
  { domain: 'fluid_reasoning', itemsAdministered: 0, done: false },
  { domain: 'verbal', itemsAdministered: 0, done: false },
  { domain: 'quantitative', itemsAdministered: 0, done: false },
  { domain: 'spatial', itemsAdministered: 0, done: false },
] as const;

export const syntheticExamSession = {
  sessionId: '00000000-0000-4000-8000-00000000ea11',
  participantId: '00000000-0000-4000-8000-00000000ea01',
  status: 'active',
  ageBand: '4-5',
  policyVersion: 'exam-syn-linear-v1',
  deliveryStructure: 'linear',
  progress: [...emptyProgress],
  structureState: null,
  startedAt: '2026-07-27T12:00:00.000Z',
} satisfies ExamSession;

export const syntheticScreeningOutcome = {
  domainScores: [
    {
      domain: 'fluid_reasoning',
      score: 74,
      scoreScale: 'percent',
      se: null,
      percentile: 74,
      itemsAdministered: 8,
      metrics: { maxDifficultyReached: 6 },
    },
    {
      domain: 'verbal',
      score: 68,
      scoreScale: 'percent',
      se: null,
      percentile: 68,
      itemsAdministered: 8,
      metrics: { maxDifficultyReached: 5 },
    },
    {
      domain: 'quantitative',
      score: 71,
      scoreScale: 'percent',
      se: null,
      percentile: 71,
      itemsAdministered: 8,
      metrics: { maxDifficultyReached: 6 },
    },
    {
      domain: 'spatial',
      score: 70,
      scoreScale: 'percent',
      se: null,
      percentile: 70,
      itemsAdministered: 8,
      metrics: { maxDifficultyReached: 5 },
    },
  ],
  composite: 71,
  compositeScale: 'percent',
  engagementValid: true,
  decision: 'advance',
  policyVersion: 'exam-syn-linear-v1',
  claimBoundary: CLAIM_BOUNDARY,
  metrics: { fitIndex: 0.71 },
  syntheticOnly: true,
  validated: false,
} satisfies ScreeningOutcome;

export const startSessionResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    session: syntheticExamSession,
    nextItem: syntheticServedItem,
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-00000000ea31',
    idempotencyKey: '00000000-0000-4000-8000-00000000ea32',
    idempotentReplay: false,
  },
} satisfies StartSessionResponse;

export const submitResponseCompleteFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    session: {
      ...syntheticExamSession,
      status: 'completed',
      progress: [
        { domain: 'fluid_reasoning', itemsAdministered: 8, done: true },
        { domain: 'verbal', itemsAdministered: 8, done: true },
        { domain: 'quantitative', itemsAdministered: 8, done: true },
        { domain: 'spatial', itemsAdministered: 8, done: true },
      ],
    },
    nextItem: null,
    outcome: syntheticScreeningOutcome,
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-00000000ea33',
    idempotencyKey: '00000000-0000-4000-8000-00000000ea34',
    idempotentReplay: false,
  },
} satisfies SubmitResponseResponse;

/**
 * Every top-level exam fixture that carries a `syntheticOnly` marker. The
 * session is intentionally excluded because, like the salvaged contract, an
 * `ExamSession` carries no marker of its own — it is always wrapped in a
 * synthetic API envelope (see the response fixtures) and owned by a synthetic
 * participant/policy.
 */
export const examFixtures = [
  syntheticExamPolicyLinear,
  syntheticExamPolicyAdaptive,
  syntheticParticipant,
  syntheticIrtItem,
  syntheticClassicalItem,
  syntheticItemResponse,
  syntheticScreeningOutcome,
  startSessionResponseFixture,
  submitResponseCompleteFixture,
] as const;
