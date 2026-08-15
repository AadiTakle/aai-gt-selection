import type { ItemGenerator, ScreenerConfig, StopReason, SurfaceConfig } from '@gt/contracts';
import { Rng } from '@gt/item-library';
import { pCorrect, paramsFor } from '../irf.js';
import { ScreenerSession } from '../session.js';

/**
 * A synthetic candidate. `trueAbility` is the number the engine is trying to locate against
 * the threshold, and the engine never sees it. Everything the harness reports is scored
 * against it, which is the only way to test a decision rule without children.
 */
export interface SimulatedCandidate {
  readonly trueAbility: number;
  /** Chance of answering wrongly despite knowing it. Inattention, misclicks, fatigue. */
  readonly slip: number;
  /** Chance of answering correctly without knowing, beyond the guessing floor. */
  readonly guess: number;
}

export interface SimulationResult {
  readonly sessionId: string;
  readonly trueAbility: number;
  readonly aboveThreshold: boolean;
  readonly recommended: boolean;
  readonly correctDecision: boolean;
  readonly itemsServed: number;
  readonly stopReason: StopReason | null;
  readonly pAbove: number;
  readonly domainCounts: Readonly<Record<string, number>>;
}

export function simulateSession(args: {
  config: ScreenerConfig;
  surface: SurfaceConfig;
  available: readonly ItemGenerator[];
  candidate: SimulatedCandidate;
  seed: number;
  sessionId?: string;
}): SimulationResult {
  const { config, surface, available, candidate, seed } = args;
  const sessionId = args.sessionId ?? `sim-${seed}`;
  const session = new ScreenerSession({ sessionId, config, surface, available, seed });
  const rng = new Rng(seed ^ 0x5bf03635);

  let guard = 0;
  while (!session.state().stopped) {
    if (guard++ > 500) throw new Error('simulation exceeded its item budget, which means the stop rule cannot terminate');
    const next = session.nextItem();
    if (!next) break;

    const params = next.params;
    let p = pCorrect(candidate.trueAbility, params);
    p = p * (1 - candidate.slip) + (1 - p) * candidate.guess;

    const answersCorrectly = rng.next() < p;
    const chosen = answersCorrectly
      ? next.item.correctOptionId
      : (rng.pick(next.item.options.filter((o) => o.id !== next.item.correctOptionId)).id);

    session.submit(chosen, rng.int(1500, 9000));
  }

  const state = session.state();
  const aboveThreshold = candidate.trueAbility > config.stopRule.abilityThreshold;
  const recommended = state.decision === 'recommend';

  const domainCounts: Record<string, number> = {};
  for (const r of session.getResponses()) {
    domainCounts[r.domain] = (domainCounts[r.domain] ?? 0) + 1;
  }

  return {
    sessionId,
    trueAbility: candidate.trueAbility,
    aboveThreshold,
    recommended,
    correctDecision: aboveThreshold === recommended,
    itemsServed: state.itemsServed,
    stopReason: state.stopReason,
    pAbove: state.pAbove,
    domainCounts,
  };
}

export interface CohortSummary {
  readonly n: number;
  readonly medianItems: number;
  readonly meanItems: number;
  /** Of candidates truly above the threshold, the share recommended. */
  readonly sensitivity: number;
  /** Of candidates truly below it, the share not recommended. */
  readonly specificity: number;
  /** Of those recommended, the share truly above. Depends on the base rate, so read it with n. */
  readonly precision: number;
  readonly baseRate: number;
  readonly stopReasons: Readonly<Record<string, number>>;
  readonly results: readonly SimulationResult[];
}

export function simulateCohort(args: {
  config: ScreenerConfig;
  surface: SurfaceConfig;
  available: readonly ItemGenerator[];
  n: number;
  firstSeed?: number;
  slip?: number;
  guess?: number;
  /** Ability distribution. Defaults to standard normal, which is a general population. */
  abilityMean?: number;
  abilitySd?: number;
}): CohortSummary {
  const { config, surface, available, n } = args;
  const firstSeed = args.firstSeed ?? 9000;
  const slip = args.slip ?? 0.05;
  const guess = args.guess ?? 0.02;
  const mean = args.abilityMean ?? 0;
  const sd = args.abilitySd ?? 1;

  const results: SimulationResult[] = [];
  for (let i = 0; i < n; i++) {
    const seed = firstSeed + i;
    const rng = new Rng(seed ^ 0x1a2b3c4d);
    // Box-Muller, so the cohort is normally distributed rather than uniform.
    const u1 = Math.max(rng.next(), 1e-12);
    const u2 = rng.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    results.push(
      simulateSession({
        config,
        surface,
        available,
        candidate: { trueAbility: mean + sd * z, slip, guess },
        seed,
      }),
    );
  }

  const above = results.filter((r) => r.aboveThreshold);
  const below = results.filter((r) => !r.aboveThreshold);
  const recommended = results.filter((r) => r.recommended);
  const items = results.map((r) => r.itemsServed).sort((a, b) => a - b);

  const stopReasons: Record<string, number> = {};
  for (const r of results) {
    const k = r.stopReason ?? 'none';
    stopReasons[k] = (stopReasons[k] ?? 0) + 1;
  }

  return {
    n,
    medianItems: items.length === 0 ? 0 : (items[Math.floor(items.length / 2)] as number),
    meanItems: results.reduce((s, r) => s + r.itemsServed, 0) / Math.max(1, results.length),
    sensitivity: above.length === 0 ? NaN : above.filter((r) => r.recommended).length / above.length,
    specificity: below.length === 0 ? NaN : below.filter((r) => !r.recommended).length / below.length,
    precision: recommended.length === 0 ? NaN : recommended.filter((r) => r.aboveThreshold).length / recommended.length,
    baseRate: results.length === 0 ? NaN : above.length / results.length,
    stopReasons,
    results,
  };
}
