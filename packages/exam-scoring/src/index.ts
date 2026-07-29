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
 * - Session-level aggregates fitted from the trace (RT variability, consistency, growth,
 *   rotation slope), which no renderer can emit per item.
 * - Local types mirroring the BUILD_PLAN item/result/scoring contract.
 * - {@link estimateLearningCurve} / {@link learningRateReadout} — the novel-block learning rate.
 *   Fitted and reported here, but deliberately NOT part of {@link scoreExam}'s output: it is a
 *   labelled hypothesis, so it stays outside the scored decision until someone chooses otherwise.
 *   {@link nextTargetTheta} is the projection an administering caller needs to aim the next trial;
 *   choosing the item itself belongs to `@gt-selection/exam-engine`.
 */
export * from './metric-ids';
export * from './types';
export * from './metric-registry';
export * from './policy';
export * from './derived-metrics';
export * from './ability';
export * from './learning-curve';
export * from './learning-rate-readout';
export * from './scorer';
// The same scoring, packaged as a standalone cloud function (D-019). Exported so a caller can run
// it in-process during development and deploy the identical code path.
export * from './lambda/handler';
