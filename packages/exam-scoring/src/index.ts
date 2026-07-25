/**
 * `@gt-selection/exam-scoring`
 *
 * Deterministic metric registry + bracket scorer for the adaptive K-8 cognitive
 * screener (BUILD_PLAN §4 metrics, §5 scoring). Born-synthetic only.
 *
 * Public surface:
 * - {@link scoreExam} — pure `(items, policy) → ExamScore` scorer.
 * - {@link DEFAULT_EXAM_POLICY} — tunable defaults (weights, bracket edges, area weights).
 * - Metric registry — basic-core set (§4) + all other measurements tracked-inert.
 * - Local types mirroring the BUILD_PLAN item/result/scoring contract.
 */
export * from './metric-ids';
export * from './types';
export * from './metric-registry';
export * from './policy';
export * from './scorer';
