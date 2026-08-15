import type { Domain, SessionRecord, StopReason } from '@gt/contracts';

/**
 * Metrics over stored sessions.
 *
 * Two rules run through this module. Everything is keyed by generator *version* and by
 * surface, because a change to an item type or a change of surface produces a different
 * instrument and pooling across them hides that. And every screener-effectiveness figure
 * returns null rather than zero when no outcome has been attached, because "we do not know"
 * and "it performed at zero" are different statements and a dashboard that renders them the
 * same way will get one read as the other.
 */

export interface GeneratorStats {
  readonly generatorId: string;
  readonly generatorVersion: string;
  readonly responses: number;
  readonly proportionCorrect: number;
  /** Correlation between getting this item right and the session's overall score. */
  readonly pointBiserial: number | null;
  readonly medianLatencyMs: number;
  /** Distinct seeds served. Low numbers relative to responses mean forms are repeating. */
  readonly distinctSeeds: number;
  readonly exposureRate: number;
}

export interface ScreenerStats {
  readonly sessions: number;
  readonly completed: number;
  readonly abandoned: number;
  readonly medianItems: number;
  readonly meanItems: number;
  readonly stopReasons: Readonly<Record<string, number>>;
  readonly decisions: { readonly recommend: number; readonly noRecommendation: number };
  readonly itemsByDomain: Readonly<Record<Domain, number>>;
  /** Share of sessions that served at least one uncalibrated generator. */
  readonly uncalibratedShare: number;
  /** Where candidates drop out, by item position. */
  readonly abandonByPosition: Readonly<Record<number, number>>;
}

/**
 * Screener effectiveness. Every field is null until real outcomes exist, and `outcomesKnown`
 * says how many sessions carry one.
 */
export interface EffectivenessStats {
  readonly outcomesKnown: number;
  readonly sensitivity: number | null;
  readonly specificity: number | null;
  readonly positivePredictiveValue: number | null;
  readonly negativePredictiveValue: number | null;
  readonly baseRate: number | null;
  /** Youden's J. Sensitivity plus specificity minus one, so zero means no better than chance. */
  readonly youdenJ: number | null;
  /**
   * Net benefit at the surface's own recommendation threshold, minus the benefit of simply
   * recommending everybody. Above zero means using the screener beats not using it.
   */
  readonly netBenefitOverTreatAll: number | null;
}

function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? ((s[mid - 1] as number) + (s[mid] as number)) / 2 : (s[mid] as number);
}

function pearson(xs: readonly number[], ys: readonly number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i] as number; sy += ys[i] as number; }
  const mx = sx / n, my = sy / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = (xs[i] as number) - mx;
    const b = (ys[i] as number) - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

export function generatorStats(sessions: readonly SessionRecord[]): readonly GeneratorStats[] {
  const totalResponses = sessions.reduce((s, x) => s + x.responses.length, 0);
  const byVersion = new Map<string, { id: string; version: string; correct: number[]; latency: number[]; seeds: Set<number>; sessionScore: number[] }>();

  for (const session of sessions) {
    const score = session.responses.filter((r) => r.correct).length;
    for (const r of session.responses) {
      const key = `${r.generatorId}@${r.generatorVersion}`;
      let entry = byVersion.get(key);
      if (!entry) {
        entry = { id: r.generatorId, version: r.generatorVersion, correct: [], latency: [], seeds: new Set(), sessionScore: [] };
        byVersion.set(key, entry);
      }
      entry.correct.push(r.correct ? 1 : 0);
      entry.latency.push(r.latencyMs);
      entry.seeds.add(r.seed);
      // Rest-of-session score, so the item under test is excluded from its own criterion.
      entry.sessionScore.push(score - (r.correct ? 1 : 0));
    }
  }

  return [...byVersion.values()].map((e) => ({
    generatorId: e.id,
    generatorVersion: e.version,
    responses: e.correct.length,
    proportionCorrect: e.correct.reduce((s, x) => s + x, 0) / Math.max(1, e.correct.length),
    pointBiserial: pearson(e.correct, e.sessionScore),
    medianLatencyMs: median(e.latency),
    distinctSeeds: e.seeds.size,
    exposureRate: totalResponses === 0 ? 0 : e.correct.length / totalResponses,
  })).sort((a, b) => b.responses - a.responses);
}

export function screenerStats(sessions: readonly SessionRecord[]): ScreenerStats {
  const stopReasons: Record<string, number> = {};
  const itemsByDomain = { quantitative: 0, verbal: 0, spatial: 0, fluid: 0 } as Record<Domain, number>;
  const abandonByPosition: Record<number, number> = {};
  let recommend = 0, noRec = 0, abandoned = 0, completed = 0, uncalibrated = 0;

  for (const s of sessions) {
    const reason: StopReason | 'in-progress' = s.stopReason ?? 'in-progress';
    stopReasons[reason] = (stopReasons[reason] ?? 0) + 1;
    if (s.stopReason === 'abandoned') {
      abandoned++;
      const pos = s.responses.length;
      abandonByPosition[pos] = (abandonByPosition[pos] ?? 0) + 1;
    } else if (s.stopReason) completed++;
    if (s.decision === 'recommend') recommend++;
    else if (s.decision === 'no-recommendation') noRec++;
    if (s.usedUncalibratedItems) uncalibrated++;
    for (const r of s.responses) itemsByDomain[r.domain] += 1;
  }

  const counts = sessions.map((s) => s.responses.length);
  return {
    sessions: sessions.length,
    completed,
    abandoned,
    medianItems: median(counts),
    meanItems: counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length),
    stopReasons,
    decisions: { recommend, noRecommendation: noRec },
    itemsByDomain,
    uncalibratedShare: sessions.length === 0 ? 0 : uncalibrated / sessions.length,
    abandonByPosition,
  };
}

export function effectivenessStats(
  sessions: readonly SessionRecord[],
  recommendProbability: number,
): EffectivenessStats {
  const scored = sessions.filter((s) => s.outcome && s.decision);
  if (scored.length === 0) {
    return {
      outcomesKnown: 0,
      sensitivity: null,
      specificity: null,
      positivePredictiveValue: null,
      negativePredictiveValue: null,
      baseRate: null,
      youdenJ: null,
      netBenefitOverTreatAll: null,
    };
  }

  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const s of scored) {
    const positive = s.decision === 'recommend';
    const actual = s.outcome!.clearedBar;
    if (positive && actual) tp++;
    else if (positive && !actual) fp++;
    else if (!positive && !actual) tn++;
    else fn++;
  }

  const n = scored.length;
  const sensitivity = tp + fn === 0 ? null : tp / (tp + fn);
  const specificity = tn + fp === 0 ? null : tn / (tn + fp);
  const ppv = tp + fp === 0 ? null : tp / (tp + fp);
  const npv = tn + fn === 0 ? null : tn / (tn + fn);
  const baseRate = (tp + fn) / n;

  // Net benefit, on the decision-curve definition. The threshold probability encodes how many
  // false positives one true positive is worth, so this is the metric that actually answers
  // "is using this screener better than not using it" rather than "is it accurate".
  const w = recommendProbability / (1 - recommendProbability);
  const netBenefit = tp / n - (fp / n) * w;
  const treatAll = baseRate - (1 - baseRate) * w;

  return {
    outcomesKnown: n,
    sensitivity,
    specificity,
    positivePredictiveValue: ppv,
    negativePredictiveValue: npv,
    baseRate,
    youdenJ: sensitivity !== null && specificity !== null ? sensitivity + specificity - 1 : null,
    netBenefitOverTreatAll: netBenefit - treatAll,
  };
}

/** Split sessions by surface, since the proposal treats two surfaces as two instruments. */
export function bySurface(sessions: readonly SessionRecord[]): Map<string, SessionRecord[]> {
  const out = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const list = out.get(s.surfaceId) ?? [];
    list.push(s);
    out.set(s.surfaceId, list);
  }
  return out;
}
