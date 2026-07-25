/**
 * Session-level aggregate metrics, FITTED from the stored trace.
 *
 * `M-RTVAR`, `M-CONSIST`, `M-LEARNRATE` and `M-ROTSLOPE` are statistics over a series of items.
 * A renderer cannot report a response-time variance, a cross-item consistency, a growth slope or
 * a rotation slope from a single item, so the scorer must fit them rather than read them out of
 * `ScoredItem.metrics`. Averaging whatever a renderer happened to emit under those ids would be
 * a category error, and in practice would leave the profile permanently `unknown`, because no
 * real bank emits them.
 *
 * Everything here is a pure function of the stored trace, so a frozen policy plus the trace
 * reproduces the score exactly (BUILD_PLAN §5).
 *
 * The engine (`@gt-selection/exam-engine`, `src/derived.ts`) answers the matching question of
 * whether there is ENOUGH data to fit each of these; the minimum-input thresholds below are kept
 * in step with its core-metric registry. The two packages are intentionally independent
 * (BUILD_PLAN §7), so these small formulas are stated in both rather than shared.
 */
import type { ScoredItem } from './types';

/** Metric ids the scorer fits from the trace instead of reading from item metric bags. */
export const DERIVED_METRIC_IDS: ReadonlySet<string> = new Set([
  'M-RTVAR',
  'M-CONSIST',
  'M-LEARNRATE',
  'M-ROTSLOPE',
]);

/** Minimum inputs before each fit is reported, mirroring the engine's registry `minSamples`. */
const MIN_RT_SAMPLES = 20;
const MIN_MATCHED_PAIRS = 3;
const MIN_GROWTH_TRIALS = 8;
const MIN_ROTATION_TRIALS = 12;
const MIN_DISTINCT_DISPARITIES = 3;

/** Max difficulty gap for two items to count as a matched parallel pair (engine default). */
const PAIR_TOLERANCE = 1.0;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function sd(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  let sum = 0;
  for (const v of values) sum += (v - m) ** 2;
  return Math.sqrt(sum / values.length);
}

/** Ordinary-least-squares slope of `ys` on `xs`; `null` when x has no spread. */
function olsSlope(xs: readonly number[], ys: readonly number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    num += dx * ((ys[i] as number) - my);
    den += dx * dx;
  }
  if (den === 0) return null;
  return num / den;
}

function responseTime(item: ScoredItem): number | null {
  const rt = item.metrics['M-RT'];
  return isFiniteNumber(rt) ? rt : null;
}

function disparity(item: ScoredItem): number | null {
  const deg = item.stimulus?.angularDisparityDeg;
  return isFiniteNumber(deg) ? deg : null;
}

/**
 * Intra-individual response-time variability as a coefficient of variation over CORRECT trials
 * (MEASUREMENTS M-RTVAR: "Compute SD/CV over the child's RT series (correct trials)"). Lower is
 * better; the scorer's consistency signal is its inverse. Never rewards raw speed — a uniformly
 * slow child and a uniformly fast one both score as consistent.
 */
export function deriveRtVariability(items: readonly ScoredItem[]): number | null {
  const rts: number[] = [];
  for (const item of items) {
    const rt = responseTime(item);
    if (item.correct && rt !== null && rt > 0) rts.push(rt);
  }
  if (rts.length < MIN_RT_SAMPLES) return null;
  const m = mean(rts);
  if (m <= 0) return null;
  return sd(rts) / m;
}

/**
 * Cross-item consistency: the fraction of matched parallel pairs whose outcomes agree.
 *
 * Items are sorted by difficulty and greedily paired while within `PAIR_TOLERANCE` of each other.
 * Bank difficulty is the design-estimated b, so difficulty proximity stands in for "parallel
 * form"; this is a provisional operationalization of MEASUREMENTS' AIG-cloned matched pairs
 * (born-synthetic, validated=false).
 */
export function deriveConsistency(items: readonly ScoredItem[]): number | null {
  const sorted = [...items].sort((a, b) =>
    a.difficulty !== b.difficulty ? a.difficulty - b.difficulty : a.itemId < b.itemId ? -1 : 1,
  );

  let pairs = 0;
  let agreements = 0;
  for (let i = 0; i + 1 < sorted.length; ) {
    const first = sorted[i] as ScoredItem;
    const second = sorted[i + 1] as ScoredItem;
    if (second.difficulty - first.difficulty <= PAIR_TOLERANCE) {
      pairs += 1;
      if (first.correct === second.correct) agreements += 1;
      i += 2;
    } else {
      i += 1;
    }
  }

  if (pairs < MIN_MATCHED_PAIRS) return null;
  return agreements / pairs;
}

/**
 * Within-session ceiling growth, mapped to [0, 1] with 0.5 = no growth (MEASUREMENTS
 * M-LEARNRATE: "max difficulty solved over trials", early block vs late block).
 *
 * CLAIM BOUNDARY: under an adaptive battery the early ceiling is anchored to the grade-band
 * seed, so a large early climb partly reflects how far the seed was from the child rather than
 * how fast they learn. This is a provisional within-session growth index, NOT a validated
 * learning-potential or program-benefit signal (`validated=false`).
 */
export function deriveLearningRate(
  items: readonly ScoredItem[],
  scaleMin: number,
  scaleMax: number,
): number | null {
  if (items.length < MIN_GROWTH_TRIALS) return null;

  const half = Math.floor(items.length / 2);
  const ceiling = (slice: readonly ScoredItem[]): number => {
    let best = scaleMin;
    for (const item of slice) if (item.correct) best = Math.max(best, item.difficulty);
    return best;
  };

  const span = scaleMax - scaleMin;
  if (span <= 0) return null;
  const growth = ceiling(items.slice(half)) - ceiling(items.slice(0, half));
  return Math.min(1, Math.max(0, 0.5 + growth / (2 * span)));
}

/**
 * Mental-rotation RT slope in ms per degree: correct-trial response time regressed on the item's
 * target angular disparity (the Shepard-Metzler chronometric signature). Lower is better.
 *
 * Requires the server to have attached `stimulus.angularDisparityDeg`, which only the spatial
 * banks that record it can supply. Returns `null` unless there are enough correct trials across
 * enough distinct angles for the slope to mean anything.
 */
export function deriveRotationSlope(items: readonly ScoredItem[]): number | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const item of items) {
    const deg = disparity(item);
    const rt = responseTime(item);
    if (item.correct && deg !== null && rt !== null) {
      xs.push(deg);
      ys.push(rt);
    }
  }
  if (xs.length < MIN_ROTATION_TRIALS) return null;
  if (new Set(xs).size < MIN_DISTINCT_DISPARITIES) return null;
  return olsSlope(xs, ys);
}

/**
 * Every session-level aggregate that can be fitted from `items`. Metrics without enough inputs
 * are omitted, so the scorer simply leaves them out of the within-bracket average rather than
 * substituting a fabricated value.
 */
export function deriveAggregateMetrics(
  items: readonly ScoredItem[],
  scaleMin: number,
  scaleMax: number,
): Map<string, number> {
  const out = new Map<string, number>();
  const rtVar = deriveRtVariability(items);
  if (rtVar !== null) out.set('M-RTVAR', rtVar);
  const consistency = deriveConsistency(items);
  if (consistency !== null) out.set('M-CONSIST', consistency);
  const learnRate = deriveLearningRate(items, scaleMin, scaleMax);
  if (learnRate !== null) out.set('M-LEARNRATE', learnRate);
  const rotation = deriveRotationSlope(items);
  if (rotation !== null) out.set('M-ROTSLOPE', rotation);
  return out;
}
