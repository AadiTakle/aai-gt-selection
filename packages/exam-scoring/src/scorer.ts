/**
 * Deterministic exam scorer (BUILD_PLAN §5).
 *
 * Pipeline, per reasoning area:
 *   1. BRACKET — a single ordinal statistic fixes a θ span on the [1, 20]
 *      scale. Which statistic is `policy.bracketing.mode`:
 *        - `accuracy` (default): (difficulty-weighted) accuracy over the items
 *          served, against each bracket's `accuracyMin`.
 *        - `ability`: the difficulty-adjusted ability fitted from the trace
 *          (`ability.ts`), against each bracket's θ span.
 *   2. POSITION WITHIN BRACKET — a deterministic weighted average of the
 *      within-bracket metrics (M-DIFFREACH, consistency = inverse M-RTVAR,
 *      M-LEARNRATE, M-ERRTYPE, and any present process/domain metrics) → a
 *      float in [0, 1] that places the score inside the bracket span.
 *   3. Combine areas into a composite and derive a profile (strengths,
 *      learning rate, consistency).
 *
 * The two stages are the product-specified shape and both modes keep it: the
 * bracketing statistic never positions, and the metrics never bracket.
 *
 * There is NO admit/defer/retry decision. `scoreExam` is a PURE function of
 * `(items, policy)`: no clock, no randomness, no I/O — so a stored trace plus a
 * frozen policy id reproduces the score exactly.
 */
import { type AbilityFitOptions, deriveAbilityFit } from './ability';
import { DERIVED_METRIC_IDS, deriveAggregateMetrics } from './derived-metrics';
import type { MetricId } from './metric-ids';
import type { BracketingMode, ExamPolicy, MetricWeight } from './policy';
import { DEFAULT_ABILITY_BRACKETING, DEFAULT_EXAM_POLICY } from './policy';
import {
  type Area,
  type AreaScore,
  type BandLabel,
  DOMAINS,
  type ExamProfile,
  type ExamScore,
  type MetricContribution,
  type ProfileSignal,
  type ScoredItem,
} from './types';

// ---------------------------------------------------------------------------
// numeric helpers
// ---------------------------------------------------------------------------

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** Map `value` into [0, 1] across [min, max]; degenerate ranges map to 0. */
function normalizeToUnit(value: number, min: number, max: number): number {
  if (!(max > min)) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

/** Normalize then flip for `lower`-is-better metrics so higher output = better. */
function directionalNorm(value: number, mw: MetricWeight): number {
  const n = normalizeToUnit(value, mw.range.min, mw.range.max);
  return mw.direction === 'lower' ? 1 - n : n;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// ---------------------------------------------------------------------------
// per-area aggregation
// ---------------------------------------------------------------------------

interface AreaAggregate {
  readonly area: Area;
  readonly items: readonly ScoredItem[];
  /** (Difficulty-weighted) accuracy in [0, 1]. Always computed and always reported. */
  readonly accuracy: number;
  /**
   * Difficulty-adjusted ability on the [1, 20] scale. Only fitted under `mode: 'ability'`, so the
   * default path is byte-for-byte the code it always was.
   */
  readonly ability: number | null;
  /**
   * Conditional standard error of `ability` on the [1, 20] scale, from the items this area served
   * (Fisher information). `null` whenever `ability` is. Wider when fewer or badly-targeted items
   * were answered, so a results screen can show an honest range rather than a bare point.
   */
  readonly abilitySe: number | null;
  /** Metric id → single aggregated value used for scoring. */
  readonly aggregated: ReadonlyMap<string, number>;
  /** Metric id → number of items that reported it (coverage, informational). */
  readonly coverage: ReadonlyMap<string, number>;
}

/** `mode` is optional on the policy so that pre-existing policy objects keep their behaviour. */
function bracketingMode(policy: ExamPolicy): BracketingMode {
  return policy.bracketing.mode ?? 'accuracy';
}

function abilityFitOptions(policy: ExamPolicy): AbilityFitOptions {
  const ability = policy.bracketing.ability ?? DEFAULT_ABILITY_BRACKETING;
  return {
    slope: ability.slope,
    priorSd: ability.priorSd,
    min: policy.scale.min,
    max: policy.scale.max,
  };
}

const MAX_AGGREGATED_METRICS: ReadonlySet<string> = new Set(['M-DIFFREACH']);

function aggregateArea(
  area: Area,
  items: readonly ScoredItem[],
  policy: ExamPolicy,
): AreaAggregate {
  const { min: scaleMin, max: scaleMax } = policy.scale;

  // Accuracy (bracket driver).
  let accNum = 0;
  let accDen = 0;
  for (const item of items) {
    const score = isFiniteNumber(item.score) ? clamp(item.score, 0, 1) : 0;
    const difficulty = clamp(item.difficulty, scaleMin, scaleMax);
    const weight = policy.bracketing.difficultyWeighted ? difficulty : 1;
    accNum += weight * score;
    accDen += weight;
  }
  const accuracy = accDen > 0 ? clamp(accNum / accDen, 0, 1) : 0;

  // Ability (the alternative bracket driver, D-024). Fitted from the same per-item difficulty and
  // score the accuracy term reads — no engine state is consulted.
  const abilityFit =
    bracketingMode(policy) === 'ability'
      ? deriveAbilityFit(items, abilityFitOptions(policy))
      : null;
  const ability = abilityFit?.estimate ?? null;
  const abilitySe = abilityFit?.se ?? null;

  // Collect raw metric values per id. Session-level aggregates are skipped: they are fitted from
  // the trace below, and averaging a per-item emission of one would be meaningless.
  const rawValues = new Map<string, number[]>();
  for (const item of items) {
    for (const [id, value] of Object.entries(item.metrics)) {
      if (!isFiniteNumber(value) || DERIVED_METRIC_IDS.has(id)) continue;
      const bucket = rawValues.get(id);
      if (bucket) bucket.push(value);
      else rawValues.set(id, [value]);
    }
  }

  const aggregated = new Map<string, number>();
  const coverage = new Map<string, number>();
  for (const [id, values] of rawValues) {
    coverage.set(id, values.length);
    aggregated.set(id, MAX_AGGREGATED_METRICS.has(id) ? Math.max(...values) : mean(values));
  }

  // Session-level aggregates fitted from this area's trace (RT variability, cross-item
  // consistency, within-session growth, mental-rotation slope). Only those with enough inputs
  // appear; the rest are simply absent from the within-bracket average.
  for (const [id, value] of deriveAggregateMetrics(items, scaleMin, scaleMax)) {
    aggregated.set(id, value);
    coverage.set(id, items.length);
  }

  // M-DIFFREACH: fold in a ceiling derived from the hardest correct item, so it
  // is available even when the engine did not attach an explicit metric value.
  let derivedCeiling = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    if (item.correct) {
      derivedCeiling = Math.max(derivedCeiling, clamp(item.difficulty, scaleMin, scaleMax));
    }
  }
  if (Number.isFinite(derivedCeiling)) {
    const explicit = aggregated.get('M-DIFFREACH');
    aggregated.set(
      'M-DIFFREACH',
      explicit === undefined ? derivedCeiling : Math.max(explicit, derivedCeiling),
    );
  }

  return { area, items, accuracy, ability, abilitySe, aggregated, coverage };
}

// ---------------------------------------------------------------------------
// bracketing + within-bracket positioning
// ---------------------------------------------------------------------------

/**
 * Stage 1: one ordinal statistic → one bracket.
 *
 * `accuracy` mode walks the brackets by their accuracy floors; `ability` mode walks them by their
 * θ spans, so an area lands in the bracket that contains its fitted ability. Both take the
 * HIGHEST bracket the statistic clears, and both fall back to the lowest bracket when it clears
 * none — so a policy whose lowest floor is above the statistic behaves the same either way.
 *
 * `ability` falls back to the accuracy rule when the fit returned `null` (an area with no items,
 * or a degenerate scale/slope). That is a defined-behaviour fallback, not a blend: the two
 * statistics never both contribute to one bracket.
 */
function pickBracket(
  agg: AreaAggregate,
  policy: ExamPolicy,
): {
  index: number;
  min: number;
  max: number;
} {
  const useAbility = bracketingMode(policy) === 'ability' && agg.ability !== null;

  const brackets = [...policy.bracketing.brackets].sort((a, b) =>
    useAbility ? a.theta.min - b.theta.min : a.accuracyMin - b.accuracyMin,
  );
  if (brackets.length === 0) {
    return { index: 0, min: policy.scale.min, max: policy.scale.max };
  }

  let chosen = brackets[0]!;
  for (const bracket of brackets) {
    const cleared = useAbility
      ? (agg.ability as number) >= bracket.theta.min
      : agg.accuracy >= bracket.accuracyMin;
    if (cleared) chosen = bracket;
  }
  return { index: chosen.index, min: chosen.theta.min, max: chosen.theta.max };
}

interface PositionResult {
  position: number;
  contributions: MetricContribution[];
}

function positionWithinBracket(agg: AreaAggregate, policy: ExamPolicy): PositionResult {
  const contributions: MetricContribution[] = [];
  let weightSum = 0;
  let weightedNormSum = 0;

  // Stable ordering (sorted metric id) → deterministic contributions list.
  const entries = Object.entries(policy.position.metricWeights).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );

  for (const [metricId, mw] of entries) {
    if (!mw || mw.weight <= 0) continue;
    const value = agg.aggregated.get(metricId);
    if (value === undefined) continue;
    const normalized = directionalNorm(value, mw);
    contributions.push({
      metricId: metricId as MetricId,
      value,
      normalized,
      weight: mw.weight,
      direction: mw.direction,
    });
    weightSum += mw.weight;
    weightedNormSum += mw.weight * normalized;
  }

  const position =
    weightSum > 0
      ? clamp(weightedNormSum / weightSum, 0, 1)
      : clamp(policy.position.defaultPosition, 0, 1);

  return { position, contributions };
}

function scoreArea(agg: AreaAggregate, policy: ExamPolicy): AreaScore {
  const bracket = pickBracket(agg, policy);
  const { position, contributions } = positionWithinBracket(agg, policy);
  const proficiency = clamp(
    bracket.min + position * (bracket.max - bracket.min),
    policy.scale.min,
    policy.scale.max,
  );

  return {
    area: agg.area,
    proficiency,
    bracket: bracket.index,
    bracketRange: [bracket.min, bracket.max],
    accuracy: agg.accuracy,
    // Present only under ability bracketing, so the default output shape is unchanged.
    ...(agg.ability === null ? {} : { abilityEstimate: agg.ability }),
    ...(agg.abilitySe === null || !Number.isFinite(agg.abilitySe)
      ? {}
      : { abilityStandardError: agg.abilitySe }),
    positionWithinBracket: position,
    itemsScored: agg.items.length,
    contributions,
    metricCoverage: Object.fromEntries(agg.coverage),
  };
}

// ---------------------------------------------------------------------------
// profile
// ---------------------------------------------------------------------------

function bandLabel(normalized: number | null, moderate: number, high: number): BandLabel {
  if (normalized === null) return 'unknown';
  if (normalized >= high) return 'high';
  if (normalized >= moderate) return 'moderate';
  return 'low';
}

function rangeFor(
  policy: ExamPolicy,
  metricId: MetricId,
  fallbackMin: number,
  fallbackMax: number,
) {
  const mw = policy.position.metricWeights[metricId as keyof typeof policy.position.metricWeights];
  return mw ? mw.range : { min: fallbackMin, max: fallbackMax };
}

/** Mean of a per-area aggregated metric across the areas that reported it. */
function crossAreaMean(aggs: readonly AreaAggregate[], metricId: string): number | null {
  const values: number[] = [];
  for (const agg of aggs) {
    const v = agg.aggregated.get(metricId);
    if (v !== undefined) values.push(v);
  }
  return values.length > 0 ? mean(values) : null;
}

function buildProfile(
  areaScores: readonly AreaScore[],
  aggs: readonly AreaAggregate[],
  composite: number,
  policy: ExamPolicy,
): ExamProfile {
  const areaOrder = new Map<Area, number>(DOMAINS.map((d, i) => [d, i]));

  const ranked = [...areaScores].sort((a, b) => {
    if (b.proficiency !== a.proficiency) return b.proficiency - a.proficiency;
    return (areaOrder.get(a.area) ?? 0) - (areaOrder.get(b.area) ?? 0);
  });
  const rankedAreas = ranked.map((a) => a.area);

  const margin = policy.profile.strengthMargin;
  const strengths = ranked.filter((a) => a.proficiency >= composite + margin).map((a) => a.area);
  const relativeWeaknesses = [...areaScores]
    .sort((a, b) => {
      if (a.proficiency !== b.proficiency) return a.proficiency - b.proficiency;
      return (areaOrder.get(a.area) ?? 0) - (areaOrder.get(b.area) ?? 0);
    })
    .filter((a) => a.proficiency <= composite - margin)
    .map((a) => a.area);

  // Learning rate (Timeback-fit core), from M-LEARNRATE.
  const lrRange = rangeFor(policy, 'M-LEARNRATE', 0, 1);
  const lrRaw = crossAreaMean(aggs, 'M-LEARNRATE');
  const lrNorm = lrRaw === null ? null : normalizeToUnit(lrRaw, lrRange.min, lrRange.max);
  const learningRate: ProfileSignal = {
    raw: lrRaw,
    normalized: lrNorm,
    label: bandLabel(
      lrNorm,
      policy.profile.learnRateBands.moderate,
      policy.profile.learnRateBands.high,
    ),
  };

  // Consistency = inverse intra-individual RT variability (M-RTVAR).
  const rtvRange = rangeFor(policy, 'M-RTVAR', 0.05, 0.9);
  const rtvRaw = crossAreaMean(aggs, 'M-RTVAR');
  const consNorm = rtvRaw === null ? null : 1 - normalizeToUnit(rtvRaw, rtvRange.min, rtvRange.max);
  const consistency: ProfileSignal = {
    raw: rtvRaw,
    normalized: consNorm,
    label: bandLabel(
      consNorm,
      policy.profile.consistencyBands.moderate,
      policy.profile.consistencyBands.high,
    ),
  };

  return { strengths, relativeWeaknesses, rankedAreas, learningRate, consistency };
}

// ---------------------------------------------------------------------------
// public entry point
// ---------------------------------------------------------------------------

/**
 * Score a full exam trace deterministically.
 *
 * @param items  Server-verified item results (the stored trace). Order does not
 *               change the result. Items are grouped by `domain` into areas.
 * @param policy Tunable scoring policy; defaults to {@link DEFAULT_EXAM_POLICY}.
 * @returns Per-area proficiency (≈θ on [1, 20]), a composite, and a profile.
 *          No admit/defer/retry decision is produced.
 */
export function scoreExam(
  items: readonly ScoredItem[],
  policy: ExamPolicy = DEFAULT_EXAM_POLICY,
): ExamScore {
  // Group by area in the fixed DOMAINS order for determinism.
  const byArea = new Map<Area, ScoredItem[]>();
  for (const item of items) {
    if (!(DOMAINS as readonly string[]).includes(item.domain)) continue;
    const bucket = byArea.get(item.domain);
    if (bucket) bucket.push(item);
    else byArea.set(item.domain, [item]);
  }

  const aggs: AreaAggregate[] = [];
  const areaScores: AreaScore[] = [];
  const perArea: Partial<Record<Area, AreaScore>> = {};
  for (const area of DOMAINS) {
    const areaItems = byArea.get(area);
    if (!areaItems || areaItems.length === 0) continue;
    const agg = aggregateArea(area, areaItems, policy);
    const areaScore = scoreArea(agg, policy);
    aggs.push(agg);
    areaScores.push(areaScore);
    perArea[area] = areaScore;
  }

  // Composite: area-weighted mean of proficiency, renormalized over present areas.
  let compW = 0;
  let compWV = 0;
  for (const areaScore of areaScores) {
    const w = policy.areaWeights[areaScore.area];
    compW += w;
    compWV += w * areaScore.proficiency;
  }
  const composite =
    areaScores.length === 0
      ? policy.scale.min
      : compW > 0
        ? clamp(compWV / compW, policy.scale.min, policy.scale.max)
        : clamp(mean(areaScores.map((a) => a.proficiency)), policy.scale.min, policy.scale.max);

  const profile = buildProfile(areaScores, aggs, composite, policy);

  return {
    perArea,
    composite,
    profile,
    policyId: policy.id,
    scaleMin: policy.scale.min,
    scaleMax: policy.scale.max,
    syntheticOnly: true,
  };
}
