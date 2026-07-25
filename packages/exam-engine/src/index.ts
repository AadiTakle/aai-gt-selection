/**
 * @gt-selection/exam-engine — pure, deterministic adaptive-selection engine.
 *
 * See `docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md` §3. Public surface: the five engine
 * functions plus the local contract types, tunable config, and a born-synthetic harness.
 */

// Engine functions
export { startState } from './state';
export { nextType, nextItem, toServedItem } from './selection';
export { update, difficultyDelta } from './update';
export { isDone, areaMetricsCovered, areaEstimateStable, coverageIsEven } from './done';

// Configuration and registries
export {
  DEFAULT_CONFIG,
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
  enforcedMetricsForArea,
  metricCount,
  enforcedShortfallCount,
  underCoveredWeights,
  typeHasUnseenItem,
  availableTypesByArea,
} from './coverage';

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
export {
  AREAS,
  AGE_BANDS,
} from './types';
export type {
  Area,
  AgeBand,
  MetricId,
  ItemId,
  TypeCode,
  ItemContent,
  ItemAnswer,
  ItemScoring,
  ItemProvenance,
  BankItem,
  ServedItem,
  TelemetryEvent,
  ItemResult,
  ScoredItem,
  QuestionType,
  Banks,
  MetricScope,
  CoreMetricSpec,
  EngineConfig,
  AreaState,
  SessionState,
} from './types';
