import type {
  Decision,
  Domain,
  ItemGenerator,
  RenderedItem,
  ResponseRecord,
  ScreenerConfig,
  StopReason,
  SurfaceConfig,
} from '@gt/contracts';
import { Rng } from '@gt/item-library';
import { information, paramsFor, type ItemParams } from './irf.js';
import { Posterior } from './posterior.js';

export interface SessionInit {
  readonly sessionId: string;
  readonly config: ScreenerConfig;
  readonly surface: SurfaceConfig;
  /** Already filtered to what this screener may serve, by the library. */
  readonly available: readonly ItemGenerator[];
  readonly seed: number;
}

export interface NextItem {
  readonly item: RenderedItem;
  readonly params: ItemParams;
  readonly selectionReason: string;
}

export interface SessionState {
  readonly stopped: boolean;
  readonly stopReason: StopReason | null;
  readonly pAbove: number;
  readonly decision: Decision | null;
  readonly itemsServed: number;
  readonly interval: readonly [number, number];
}

interface DomainCount {
  served: number;
  min: number;
  max: number;
}

/**
 * One candidate's run through one screener.
 *
 * The engine is a state machine with two public moves: ask for the next item, then submit
 * an answer. It holds no I/O and no clock beyond what callers hand it, so a real session and
 * a simulated one drive it through the same path. That is what lets the harness test the
 * decision logic without children.
 */
export class ScreenerSession {
  private readonly posterior = new Posterior();
  private readonly rng: Rng;
  private readonly responses: ResponseRecord[] = [];
  private readonly domainCounts = new Map<Domain, DomainCount>();
  private readonly usedSeeds = new Set<string>();
  private pending: NextItem | null = null;
  private stopReason: StopReason | null = null;
  private sawUncalibrated = false;

  constructor(private readonly init: SessionInit) {
    this.rng = new Rng(init.seed);
    for (const rule of init.config.blueprint) {
      this.domainCounts.set(rule.domain, { served: 0, min: rule.minItems, max: rule.maxItems });
    }
  }

  get sessionId(): string {
    return this.init.sessionId;
  }

  get usedUncalibratedItems(): boolean {
    return this.sawUncalibrated;
  }

  getResponses(): readonly ResponseRecord[] {
    return [...this.responses];
  }

  state(): SessionState {
    const pAbove = this.posterior.probabilityAbove(this.init.config.stopRule.abilityThreshold);
    const stopped = this.stopReason !== null;
    return {
      stopped,
      stopReason: this.stopReason,
      pAbove,
      decision: stopped ? this.decide(pAbove) : null,
      itemsServed: this.responses.length,
      interval: this.posterior.interval(0.9),
    };
  }

  private decide(pAbove: number): Decision {
    return pAbove >= this.init.surface.recommendProbability ? 'recommend' : 'no-recommendation';
  }

  /**
   * Which generator to ask next.
   *
   * Selection maximises information at the decision threshold rather than at the running
   * ability estimate. A screener does not need a precise score, it needs to know which side
   * of a line the candidate is on, so the useful item is the one that best separates those
   * two possibilities. Blueprint minimums override this when the remaining budget would
   * otherwise leave a domain unmeasured.
   */
  nextItem(): NextItem | null {
    if (this.stopReason) return null;
    if (this.pending) return this.pending;

    const { stopRule } = this.init.config;
    const threshold = stopRule.abilityThreshold;

    const eligibleDomains = this.eligibleDomains();
    if (eligibleDomains.length === 0) {
      this.stopReason = 'bank-exhausted';
      return null;
    }

    const forced = this.forcedDomains(eligibleDomains);
    const domainsToConsider = forced.length > 0 ? forced : eligibleDomains;

    let best: { gen: ItemGenerator; info: number } | null = null;
    for (const gen of this.init.available) {
      if (!domainsToConsider.includes(gen.domain)) continue;
      const params = paramsFor(gen.difficulty.b, 4, gen.difficulty.a);
      const info = information(threshold, params);
      if (!best || info > best.info) best = { gen, info };
    }

    if (!best) {
      this.stopReason = 'bank-exhausted';
      return null;
    }

    const seed = this.drawUnusedSeed(best.gen);
    if (seed === null) {
      this.stopReason = 'bank-exhausted';
      return null;
    }

    const item = best.gen.render(seed);
    const params = paramsFor(best.gen.difficulty.b, item.options.length, best.gen.difficulty.a);
    if (best.gen.difficulty.source !== 'calibrated') this.sawUncalibrated = true;

    const reason =
      forced.length > 0
        ? `blueprint minimum for ${best.gen.domain}; information at threshold ${best.info.toFixed(3)}`
        : `highest information at threshold ${threshold.toFixed(2)} (${best.info.toFixed(3)})`;

    this.pending = { item, params, selectionReason: reason };
    return this.pending;
  }

  /** Domains that still have budget and still have generators behind them. */
  private eligibleDomains(): Domain[] {
    const out: Domain[] = [];
    for (const [domain, count] of this.domainCounts) {
      if (count.served >= count.max) continue;
      if (!this.init.available.some((g) => g.domain === domain)) continue;
      out.push(domain);
    }
    return out;
  }

  /**
   * Domains still short of their blueprint minimum.
   *
   * Coverage is satisfied first, then the remaining budget goes to information. An earlier
   * version deferred coverage until the budget was nearly spent, on the theory that
   * information should get first call. That was wrong in a way worth recording: the stop rule
   * cannot fire until the blueprint is satisfied, so deferring coverage to the end guaranteed
   * every session ran to the item cap and the adaptive stop never happened at all.
   *
   * Within the short domains the most informative item still wins, so this constrains
   * selection rather than replacing it.
   */
  private forcedDomains(eligible: readonly Domain[]): Domain[] {
    const short: Domain[] = [];
    for (const [domain, count] of this.domainCounts) {
      if (count.served < count.min && eligible.includes(domain)) short.push(domain);
    }
    return short;
  }

  private drawUnusedSeed(gen: ItemGenerator): number | null {
    for (let attempt = 0; attempt < 64; attempt++) {
      const seed = this.rng.int(1, 1_000_000);
      const k = `${gen.id}@${gen.version}#${seed}`;
      if (!this.usedSeeds.has(k)) {
        this.usedSeeds.add(k);
        return seed;
      }
    }
    return null;
  }

  /**
   * Score the pending item and re-evaluate whether to continue.
   *
   * Stopping is a confidence rule rather than a length rule, so a clear case ends early and
   * an ambiguous one spends the whole budget. That is the behaviour a short public tool
   * needs, and it is the reason classification costs fewer items than measurement.
   */
  submit(selectedOptionId: string, latencyMs: number): SessionState {
    const pending = this.pending;
    if (!pending) throw new Error('submit called with no pending item');
    if (this.stopReason) throw new Error('submit called on a stopped session');

    const { stopRule } = this.init.config;
    const threshold = stopRule.abilityThreshold;
    const pBefore = this.posterior.probabilityAbove(threshold);
    const correct = selectedOptionId === pending.item.correctOptionId;

    this.posterior.update(pending.params, correct);
    const pAfter = this.posterior.probabilityAbove(threshold);

    const domain = this.domainOf(pending.item.generatorId);
    const count = this.domainCounts.get(domain);
    if (count) count.served += 1;

    this.responses.push({
      ordinal: this.responses.length + 1,
      generatorId: pending.item.generatorId,
      generatorVersion: pending.item.generatorVersion,
      seed: pending.item.seed,
      domain,
      correct,
      latencyMs,
      pAboveBefore: pBefore,
      pAboveAfter: pAfter,
      selectionReason: pending.selectionReason,
    });
    this.pending = null;

    const served = this.responses.length;
    const blueprintSatisfied = [...this.domainCounts.values()].every((c) => c.served >= c.min);

    if (served >= stopRule.maxItems) {
      this.stopReason = 'item-cap';
    } else if (served >= stopRule.minItems && blueprintSatisfied) {
      if (pAfter >= stopRule.confidenceAbove) this.stopReason = 'confident-above';
      else if (pAfter <= 1 - stopRule.confidenceBelow) this.stopReason = 'confident-below';
    }

    return this.state();
  }

  abandon(): SessionState {
    if (!this.stopReason) this.stopReason = 'abandoned';
    return this.state();
  }

  private domainOf(generatorId: string): Domain {
    const gen = this.init.available.find((g) => g.id === generatorId);
    if (!gen) throw new Error(`no generator ${generatorId} in this session's available set`);
    return gen.domain;
  }
}
