/**
 * Small statistics helpers for the persona-recovery report.
 *
 * Deliberately dependency-free and duplicated at small scale rather than imported
 * from the Python validation harness: this script runs in Node, and the harness is
 * the authority for the psychometric analyses (it consumes the CSV this runner
 * writes). Anything here is a recovery diagnostic, not a psychometric verdict.
 */

export const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length;

export function sd(xs: readonly number[]): number {
  if (xs.length < 2) return Number.NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1));
}

/** Root mean squared error of `estimate` against `truth` (paired, same length). */
export function rmse(truth: readonly number[], estimate: readonly number[]): number {
  if (truth.length === 0) return Number.NaN;
  let sum = 0;
  for (let i = 0; i < truth.length; i++) {
    const d = estimate[i]! - truth[i]!;
    sum += d * d;
  }
  return Math.sqrt(sum / truth.length);
}

/** Mean signed error: positive = the estimator runs high. */
export function bias(truth: readonly number[], estimate: readonly number[]): number {
  return mean(truth.map((t, i) => estimate[i]! - t));
}

export function pearson(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length < 2) return Number.NaN;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  return dx2 === 0 || dy2 === 0 ? Number.NaN : num / Math.sqrt(dx2 * dy2);
}

/** Spearman rank correlation (average ranks for ties). */
export function spearman(xs: readonly number[], ys: readonly number[]): number {
  return pearson(rank(xs), rank(ys));
}

function rank(xs: readonly number[]): number[] {
  const order = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(xs.length).fill(0);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]!.v === order[i]!.v) j += 1;
    const average = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[order[k]!.i] = average;
    i = j + 1;
  }
  return ranks;
}

/** Linear-interpolated percentile (0-100) of a sample. */
export function percentileOf(xs: readonly number[], percentile: number): number {
  if (xs.length === 0) return Number.NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = ((sorted.length - 1) * percentile) / 100;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (pos - lo) * (sorted[hi]! - sorted[lo]!);
}

export interface ClassificationResult {
  n: number;
  cut: number;
  estimateCut: number;
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  accuracy: number;
  /** P(flagged | truly above cut). */
  sensitivity: number;
  /** P(not flagged | truly below cut). */
  specificity: number;
  /** P(missed | truly above cut) — the applicant-facing error that matters most. */
  falseNegativeRate: number;
  kappa: number;
}

/**
 * Agreement between "truly above cut" and "estimated above cut". The
 * false-negative rate is called out separately because a missed above-cut child is
 * the error with a real cost to the applicant; a screening instrument that trades
 * it away for headline accuracy is not acceptable (R10 claim boundaries).
 */
export function classify(
  truth: readonly number[],
  estimate: readonly number[],
  cut: number,
  /**
   * Optional separate threshold on the ESTIMATE. Applying the truth cut directly to
   * a shrunken EAP under-selects by construction, so an operational comparison uses
   * a cut matched on the estimate's own distribution instead.
   */
  estimateCut: number = cut,
): ClassificationResult {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (let i = 0; i < truth.length; i++) {
    const actual = truth[i]! >= cut;
    const predicted = estimate[i]! >= estimateCut;
    if (actual && predicted) tp += 1;
    else if (!actual && predicted) fp += 1;
    else if (!actual && !predicted) tn += 1;
    else fn += 1;
  }
  const n = truth.length;
  const accuracy = n === 0 ? Number.NaN : (tp + tn) / n;
  const pe = n === 0 ? Number.NaN : (((tp + fn) * (tp + fp)) / n + ((tn + fp) * (tn + fn)) / n) / n;
  return {
    n,
    cut,
    estimateCut,
    truePositive: tp,
    falsePositive: fp,
    trueNegative: tn,
    falseNegative: fn,
    accuracy,
    sensitivity: tp + fn === 0 ? Number.NaN : tp / (tp + fn),
    specificity: tn + fp === 0 ? Number.NaN : tn / (tn + fp),
    falseNegativeRate: tp + fn === 0 ? Number.NaN : fn / (tp + fn),
    kappa: pe === 1 ? Number.NaN : (accuracy - pe) / (1 - pe),
  };
}

/** Cohen's kappa for two boolean decision vectors (decision CONSISTENCY, not truth). */
export function agreement(
  a: readonly boolean[],
  b: readonly boolean[],
): { agreement: number; kappa: number; n: number } {
  const n = a.length;
  if (n === 0) return { agreement: Number.NaN, kappa: Number.NaN, n };
  let both = 0;
  let neither = 0;
  let aOnly = 0;
  let bOnly = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] && b[i]) both += 1;
    else if (!a[i] && !b[i]) neither += 1;
    else if (a[i]) aOnly += 1;
    else bOnly += 1;
  }
  const observed = (both + neither) / n;
  const pe =
    (((both + aOnly) * (both + bOnly)) / n + ((neither + bOnly) * (neither + aOnly)) / n) / n;
  return { agreement: observed, kappa: pe === 1 ? Number.NaN : (observed - pe) / (1 - pe), n };
}

export function round(x: number, digits = 4): number {
  if (!Number.isFinite(x)) return Number.NaN;
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

/** Fixed-width number for the markdown tables (NaN prints as `n/a`). */
export function fmt(x: number, digits = 3): string {
  return Number.isFinite(x) ? x.toFixed(digits) : 'n/a';
}
