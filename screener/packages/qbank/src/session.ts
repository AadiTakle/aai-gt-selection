import type { Domain, StopReason } from '@gt/contracts';
import { type ItemParams, Posterior, information, paramsFor } from '@gt/engine';
import {
  type BankRecord,
  type LoadedBank,
  type ServedItem,
  domainOf,
  optionCountOf,
  scoreResponse,
  toLogits,
  toServed,
} from './bank.js';

/**
 * An adaptive session over the real item banks.
 *
 * The same measurement machinery the generator screener uses, pointed at hand-built items instead.
 * Item selection maximises information at the decision threshold, the posterior is the same grid,
 * and the stop rule is the same asymmetric confidence rule. What changes is where items come from
 * and where scoring happens: the frame renders an item it was handed and reports a response, and
 * the key never leaves this object.
 *
 * The one thing this cannot do that the generator engine can is produce an unlimited supply of
 * fresh items. A bank has a fixed number, so a long session at an extreme ability will run out of
 * useful difficulty and the stop reason says so.
 */

/**
 * How precise the caller wants the decision to be.
 *
 * Exposed as a single dial because that is the only honest way to offer "test length" as a control:
 * length is an outcome of the confidence you demand, not an input you set independently. Asking for
 * more confidence buys more questions, and the mapping is stated here rather than hidden.
 */
export interface PrecisionSetting {
  readonly label: string;
  /** Confidence needed to pass a candidate through. */
  readonly confidenceAbove: number;
  /** Confidence needed to rule one out. Always the higher bar. */
  readonly confidenceBelow: number;
  readonly minItems: number;
  readonly maxItems: number;
  /** What to tell the user they are trading. */
  readonly note: string;
}

/**
 * Five stops on one slider.
 *
 * The asymmetry between the two confidences is preserved at every stop, because the reason for it
 * does not change with length: a missed candidate costs more than a wasted application, so the
 * engine stays reluctant to rule anybody out however short the session is.
 *
 * The two shortest settings are deliberately labelled as what they are. Classification research
 * brackets a two-category decision at roughly 13 to 16 items, and the one paper asking the question
 * directly advises at least 20, so anything under about 12 is a demonstration rather than a
 * defensible measurement and the UI should say so.
 */
export const PRECISION_STEPS: readonly PrecisionSetting[] = [
  {
    label: 'Taster',
    confidenceAbove: 0.6,
    confidenceBelow: 0.9,
    minItems: 4,
    maxItems: 6,
    note: 'Far too short to decide anything. Included so the effect of the dial is visible in one sitting.',
  },
  {
    label: 'Short',
    confidenceAbove: 0.68,
    confidenceBelow: 0.94,
    minItems: 6,
    maxItems: 10,
    note: 'Below the range the classification literature supports. Treat the result as indicative.',
  },
  {
    label: 'Standard',
    confidenceAbove: 0.75,
    confidenceBelow: 0.97,
    minItems: 8,
    maxItems: 16,
    note: 'Brackets the 13 to 16 items that classification research associates with about 95% correct decisions.',
  },
  {
    label: 'Careful',
    confidenceAbove: 0.82,
    confidenceBelow: 0.98,
    minItems: 12,
    maxItems: 24,
    note: 'Meets the 20-item floor advised for group-level decision quality.',
  },
  {
    label: 'Thorough',
    confidenceAbove: 0.9,
    confidenceBelow: 0.99,
    minItems: 20,
    maxItems: 40,
    note: 'Approaches the 40 items advised where a decision about an individual has to hold.',
  },
];

export function precisionAt(index: number): PrecisionSetting {
  const i = Math.max(0, Math.min(PRECISION_STEPS.length - 1, Math.round(index)));
  return PRECISION_STEPS[i] as PrecisionSetting;
}

export interface QbankSessionConfig {
  readonly abilityThreshold: number;
  readonly precision: PrecisionSetting;
  /** Restrict to banks whose items declare this band, or leave undefined for any. */
  readonly ageBand?: string;
  /** Minimum items per domain before the session may stop. */
  readonly perDomainMinimum: number;
  /** Recommend once P(above threshold) reaches this. */
  readonly recommendProbability: number;
}

export interface QbankServe {
  readonly served: ServedItem;
  readonly typeCode: string;
  readonly domain: Domain;
  readonly difficulty: number;
  readonly informationAtThreshold: number;
  readonly selectionReason: string;
}

export interface QbankAttempt {
  readonly ordinal: number;
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: Domain;
  readonly difficulty: number;
  /** Null when the frame reported something this host could not interpret. */
  readonly correct: boolean | null;
  readonly rawResponse: unknown;
  readonly latencyMs: number;
  readonly pAboveBefore: number;
  readonly pAboveAfter: number;
  readonly selectionReason: string;
}

export interface QbankState {
  readonly stopped: boolean;
  readonly stopReason: StopReason | null;
  readonly pAbove: number;
  readonly decision: 'recommend' | 'no-recommendation' | null;
  readonly itemsServed: number;
  readonly unscorable: number;
  readonly estimate: number;
  readonly interval: readonly [number, number];
  readonly perDomain: Readonly<Record<string, number>>;
}

const DOMAINS: readonly Domain[] = ['quantitative', 'verbal', 'spatial', 'fluid'];

/**
 * Discrimination, held at 1.5 for every item.
 *
 * **This is fixed, not calibrated.** No item in this bank has been fitted against real attempts, so
 * there is no per-item discrimination to use; 1.5 is a moderately discriminating item by convention and
 * nothing more. `@gt/stats` already computes point-biserial per item
 * (`packages/stats/src/index.ts:85-115`), which is the input once real response data exists — that is
 * task 1a.6. Until then this number is an assumption applied uniformly, and any claim that one item
 * separates candidates better than another is not supported by anything here.
 */
const FIXED_DISCRIMINATION = 1.5;

/**
 * What to assume when an item does not enumerate its options: that it cannot be guessed.
 *
 * **Decided by Felipe, 8 Aug 2026.** Four types answer with something that is not a choice from a list
 * — `CX-check-01` assigns tokens to bins, `SPA-MAZE-01` traces a path, `SPA-PIPES-01` sets rotations,
 * `SPA-TANGRAM-01` places pieces — and `optionCountOf` returns null for their 420 servable items. There
 * is no n for a 1/n floor, so they are treated as unguessable and c is 0. `paramsFor` already returns
 * `c = 0` when handed no options, which is why this is expressed as a count rather than a floor.
 *
 * **This is an assumption, not a measurement, and it is deliberately generous.** A response space that
 * is large is not a response space that is impossible: a small maze has few plausible routes and a
 * six-token sort has 2^6 assignments, some of which a child will stumble into. c = 0 says none of that
 * happens, so a lucky answer is read as knowledge. The consequence is that these items look more
 * informative than any multiple-choice item at the same difficulty and selection prefers them
 * accordingly — see the 1a.5 entry in `docs/handoff/engine-portability-todo.md` for how strongly.
 *
 * Revisit alongside `abilityThreshold` and `recommendProbability`, which carry the same warning: an
 * unvalidated number chosen deliberately, in the direction of passing rather than rejecting.
 */
const UNGUESSABLE = 0;

export class QbankSession {
  private readonly posterior = new Posterior();
  private readonly attempts: QbankAttempt[] = [];
  private readonly usedItemIds = new Set<string>();
  private readonly perDomain = new Map<Domain, number>(DOMAINS.map((d) => [d, 0]));
  private pending: { record: BankRecord; serve: QbankServe } | null = null;
  private stopReason: StopReason | null = null;
  private unscorable = 0;

  /** Every scorable record across the banks this session may draw on, with its domain resolved. */
  private readonly pool: readonly { record: BankRecord; domain: Domain; b: number }[];

  constructor(
    private readonly config: QbankSessionConfig,
    banks: ReadonlyMap<string, LoadedBank>,
    private readonly rngSeed: number,
  ) {
    const pool: { record: BankRecord; domain: Domain; b: number }[] = [];
    for (const bank of banks.values()) {
      for (const record of bank.scorable) {
        if (config.ageBand && !(record.ageBands ?? []).includes(config.ageBand)) continue;
        pool.push({ record, domain: domainOf(record), b: toLogits(record.difficulty) });
      }
    }
    this.pool = pool;
  }

  get poolSize(): number {
    return this.pool.length;
  }

  /**
   * The IRT parameters for one item, used by selection and by the posterior update alike.
   *
   * Both go through here on purpose. If the two ever computed the guessing floor differently the engine
   * would choose an item under one model and score it under another, which is invisible from the outside
   * and corrupts the estimate rather than failing.
   */
  private paramsOf(b: number, record: BankRecord): ItemParams {
    return paramsFor(b, optionCountOf(record) ?? UNGUESSABLE, FIXED_DISCRIMINATION);
  }

  getAttempts(): readonly QbankAttempt[] {
    return [...this.attempts];
  }

  state(): QbankState {
    const pAbove = this.posterior.probabilityAbove(this.config.abilityThreshold);
    const stopped = this.stopReason !== null;
    return {
      stopped,
      stopReason: this.stopReason,
      pAbove,
      decision: stopped ? (pAbove >= this.config.recommendProbability ? 'recommend' : 'no-recommendation') : null,
      itemsServed: this.attempts.length,
      unscorable: this.unscorable,
      estimate: this.posterior.mean(),
      interval: this.posterior.interval(0.9),
      perDomain: Object.fromEntries(this.perDomain),
    };
  }

  /**
   * Choose the next item.
   *
   * Maximises Fisher information at the decision threshold rather than at the running estimate, for
   * the same reason the generator engine does: the question worth asking is the one that best
   * separates above the line from below it, not the one that pins down a score.
   *
   * Domains below their blueprint minimum are served first, because the stop rule cannot fire until
   * coverage is met and deferring coverage would guarantee every session ran to the cap.
   */
  nextItem(): QbankServe | null {
    if (this.stopReason) return null;
    if (this.pending) return this.pending.serve;

    const threshold = this.config.abilityThreshold;
    const short = DOMAINS.filter(
      (d) =>
        (this.perDomain.get(d) ?? 0) < this.config.perDomainMinimum &&
        this.pool.some((p) => p.domain === d && !this.usedItemIds.has(p.record.itemId)),
    );

    let best: { record: BankRecord; domain: Domain; info: number } | null = null;
    for (const entry of this.pool) {
      if (this.usedItemIds.has(entry.record.itemId)) continue;
      if (short.length > 0 && !short.includes(entry.domain)) continue;
      const info = information(threshold, this.paramsOf(entry.b, entry.record));
      if (!best || info > best.info) best = { record: entry.record, domain: entry.domain, info };
    }

    if (!best) {
      this.stopReason = 'bank-exhausted';
      return null;
    }

    const serve: QbankServe = {
      served: toServed(best.record),
      typeCode: best.record.typeCode,
      domain: best.domain,
      difficulty: best.record.difficulty,
      informationAtThreshold: best.info,
      selectionReason:
        short.length > 0
          ? `blueprint minimum for ${best.domain}; information ${best.info.toFixed(3)} at threshold ${threshold.toFixed(2)}`
          : `highest information at threshold ${threshold.toFixed(2)} (${best.info.toFixed(3)}) from ${this.pool.length - this.usedItemIds.size} remaining`,
    };
    this.pending = { record: best.record, serve };
    return serve;
  }

  /**
   * Mark a response and decide whether to continue.
   *
   * A response this host cannot interpret is counted and does not update the posterior, because
   * guessing at it would put invented evidence into the estimate. That is the honest failure mode
   * for hand-built items whose UIs were written independently of each other.
   */
  submit(rawResponse: unknown, latencyMs: number): QbankState {
    const pending = this.pending;
    if (!pending) throw new Error('submit called with no pending item');
    if (this.stopReason) throw new Error('submit called on a stopped session');

    const { record, serve } = pending;
    const threshold = this.config.abilityThreshold;
    const pBefore = this.posterior.probabilityAbove(threshold);
    const correct = scoreResponse(record, rawResponse);

    if (correct === null) this.unscorable += 1;
    else this.posterior.update(this.paramsOf(toLogits(record.difficulty), record), correct);

    const pAfter = this.posterior.probabilityAbove(threshold);
    this.usedItemIds.add(record.itemId);
    this.perDomain.set(serve.domain, (this.perDomain.get(serve.domain) ?? 0) + 1);
    this.attempts.push({
      ordinal: this.attempts.length + 1,
      itemId: record.itemId,
      typeCode: record.typeCode,
      domain: serve.domain,
      difficulty: record.difficulty,
      correct,
      rawResponse,
      latencyMs,
      pAboveBefore: pBefore,
      pAboveAfter: pAfter,
      selectionReason: serve.selectionReason,
    });
    this.pending = null;

    const { precision } = this.config;
    const scored = this.attempts.filter((a) => a.correct !== null).length;
    const coverageMet = DOMAINS.every(
      (d) =>
        (this.perDomain.get(d) ?? 0) >= this.config.perDomainMinimum ||
        !this.pool.some((p) => p.domain === d),
    );

    if (this.attempts.length >= precision.maxItems) this.stopReason = 'item-cap';
    else if (scored >= precision.minItems && coverageMet) {
      if (pAfter >= precision.confidenceAbove) this.stopReason = 'confident-above';
      else if (pAfter <= 1 - precision.confidenceBelow) this.stopReason = 'confident-below';
    }

    return this.state();
  }

  abandon(): QbankState {
    if (!this.stopReason) this.stopReason = 'abandoned';
    return this.state();
  }

  /** Everything the debug tray shows. Nothing here is hidden from the operator. */
  debug() {
    return {
      seed: this.rngSeed,
      poolSize: this.pool.length,
      poolUsed: this.usedItemIds.size,
      threshold: this.config.abilityThreshold,
      precision: this.config.precision,
      perDomainMinimum: this.config.perDomainMinimum,
      recommendProbability: this.config.recommendProbability,
      posteriorMean: this.posterior.mean(),
      posteriorSd: this.posterior.sd(),
      interval: this.posterior.interval(0.9),
      difficultyMapping: 'b = (difficulty - 10.5) / 3, a rescaling of the bank scale and not a calibration',
      attempts: this.attempts,
    };
  }
}
