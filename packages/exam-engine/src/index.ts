/**
 * @gt-selection/exam-engine — pure, deterministic adaptive-selection engine.
 *
 * See `docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md` §3. Public surface: the five engine
 * functions plus the local contract types, tunable config, and a born-synthetic harness.
 */

// Engine functions
export { startState } from './state';
export { nextType, nextItem, toServedItem } from './selection';
export { update, difficultyDelta, directionReversals, stepSize, toObservation } from './update';
export {
  isDone,
  areaMetricsCovered,
  areaEstimateStable,
  areaBreadthCovered,
  auditTypeBreadth,
  coverageIsEven,
} from './done';
export { replaySession } from './replay';

// Back-to-back same-type serving. `planNextSelection` is the loop-level contract every caller
// advances through, so a burst behaves identically in a browser and in the simulation harness.
export {
  burstLengthFor,
  classifyBankSpeed,
  classifyTypeSpeed,
  fastTypeCodes,
  planNextSelection,
} from './burst';
export type { BurstPlan, TypeSpeedVerdict } from './burst';

// Novel-block administration (the learning-rate regime). Administration only: the projection that
// picks the target difficulty, the fit and the readout all live in `@gt-selection/exam-scoring`.
export {
  RECOMMENDED_NOVEL_BLOCK_LENGTH,
  novelItems,
  poolSupportsBlock,
  blockReadiness,
  selectNextNovelItem,
  selectNextNovelServedItem,
} from './learning-block';
export type { BlockReadiness, BlockUnavailableReason } from './learning-block';

// Configuration and registries
export {
  DEFAULT_CONFIG,
  DEFAULT_BURST_POLICY,
  CORE_METRICS,
  GRADE_BAND_SEED,
  AGE_BAND_BONUS,
  ENFORCED_METRIC_WEIGHT,
  TRACKED_METRIC_WEIGHT,
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
  DIFFICULTY_RANGE,
} from './config';

// Coverage helpers (used by selection + stop rule; exported for integration/inspection)
export {
  scopeAppliesToArea,
  metricKind,
  metricAdequacyScope,
  enforcedMetricsForArea,
  enforcedSessionMetrics,
  metricCount,
  sessionTrace,
  metricSamplesInArea,
  metricSamplesInSession,
  metricAdequateInArea,
  sessionMetricsCovered,
  enforcedShortfallCount,
  distinctTypesInArea,
  underCoveredMetrics,
  underCoveredWeights,
  coverageGain,
  typeHasUnseenItem,
  availableTypesByArea,
  auditMetricSupply,
} from './coverage';
export type { CoverageGap, MetricSupply } from './coverage';

// Derived (session-level aggregate) core metrics
export {
  DERIVED_METRIC_IDS,
  responseTimes,
  matchedPairCount,
  rotationTrials,
  distinctDisparities,
  derivedMetricAdequate,
  derivedInputCount,
} from './derived';

// Deterministic randomness + stats
export { mulberry32, hashUnit } from './rng';
export { clamp, mean, variance, sd, standardError, pushWindow, lastN } from './stats';

// Errors
export { NoAvailableItemError, UnknownTypeError } from './errors';

// Born-synthetic harness
export {
  buildSyntheticBanks,
  respondSynthetically,
  runSyntheticSession,
  difficultyToBand,
} from './testing/synthetic-bank';
export type {
  TrueTheta,
  SyntheticBankOptions,
  SyntheticSessionResult,
  SessionStep,
} from './testing/synthetic-bank';

// Types + constants
export { AREAS, AGE_BANDS } from './types';
export type {
  Area,
  AgeBand,
  ExamStage,
  MetricId,
  ItemId,
  TypeCode,
  ItemContent,
  ItemAnswer,
  ItemScoring,
  ItemProvenance,
  ItemStimulus,
  BankItem,
  ServedItem,
  TelemetryEvent,
  ItemResult,
  ItemObservation,
  ScoredItem,
  QuestionType,
  Banks,
  MetricScope,
  MetricKind,
  MetricAdequacyScope,
  BurstPolicy,
  CoreMetricSpec,
  EngineConfig,
  AreaState,
  SessionState,
} from './types';
