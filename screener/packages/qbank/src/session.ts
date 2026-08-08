import type { Domain, StopReason } from '@gt/contracts';
import { type ItemParams, Posterior, information, paramsFor } from '@gt/engine';
import {
  type BankRecord,
  type LoadedBank,
  type ServedItem,
  domainOf,
  optionCountOf,
  responseFormatOf,
  scoreResponse,
  toLogits,
  toServed,
} from './bank.js';

/** Re-exported so a consumer of `QbankState.domains` can name its keys without reaching for contracts. */
export type { Domain };

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
  /**
   * Least share of the session to fill with multiple-choice items. Defaults to
   * `DEFAULT_MIN_MULTIPLE_CHOICE_SHARE`; set 0 to select on information alone.
   */
  readonly minMultipleChoiceShare?: number;
  /**
   * The higher bar a single domain must clear to pass on its own. Defaults to `DEFAULT_DOMAIN_BAR`.
   * **Unvalidated**, exactly as `abilityThreshold` is.
   */
  readonly domainBar?: number;
  /**
   * How much of a domain's posterior must sit above `domainBar` — the `p` in
   * `P(theta_domain > domainBar) >= p`. Defaults to `DEFAULT_DOMAIN_RECOMMEND_PROBABILITY`.
   * Set 0 to disable the domain route entirely. **Unvalidated**, as `recommendProbability` is.
   */
  readonly domainRecommendProbability?: number;
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

/**
 * One domain's readout, over that domain's items only.
 *
 * `mean` and `interval` are both required, which is the point: a per-domain mean off two items reads as a
 * finding when it is not one, so there is no way to obtain one from this type without its interval beside
 * it. Read the counts before either number.
 */
export interface DomainBand {
  readonly mean: number;
  /** 90% credible interval. Usually 2-3 logits wide, which is close to the prior. Report it anyway. */
  readonly interval: readonly [number, number];
  readonly itemsServed: number;
  /** Items that could actually be marked. The band rests on these, not on `itemsServed`. */
  readonly itemsScored: number;
}

/**
 * Which route produced a recommendation. Null unless the decision is `recommend`.
 *
 * **A domain-triggered pass is not evidence of a domain strength and must never be reported as one.** The
 * band that let the child through rests on two to four items and is 2-3 logits wide. Passing generously
 * on a noisy signal is right when a false positive is cheap; *claiming* the child is strong in that
 * domain is a measurement claim the data does not support. Pass on it, do not narrate it.
 *
 * Every domain that cleared is listed rather than a single strongest one, because picking a winner out of
 * four-item posteriors would be a ranking, and the order is fixed rather than sorted by probability so
 * nothing in the shape of this invites reading one.
 */
export type PassRoute =
  | { readonly via: 'composite' }
  | { readonly via: 'domain'; readonly domains: readonly Domain[] };

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
  /**
   * A band per domain, absent for any domain that scored nothing.
   *
   * A second readout over the same evidence as `estimate`, never a competing use of it: every scored item
   * updates the composite as well, nothing here changes selection or the stop rule, and the composite
   * stays the route to a decision. Absence means the child was not measured in that domain — do not fill
   * it in.
   */
  readonly domains: Readonly<Partial<Record<Domain, DomainBand>>>;
  /**
   * What produced a `recommend`, or null.
   *
   * Note the consequence for anything rendering a session: `stopReason` describes the **composite's**
   * confidence, so `stopReason: 'confident-below'` alongside `decision: 'recommend'` is now a reachable
   * and correct combination — the battery as a whole ruled the child out and a single domain carried them
   * anyway. That is the entire point of the rule, and it will read as a contradiction to anyone shown both
   * without explanation.
   */
  readonly passRoute: PassRoute | null;
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

/**
 * Least share of a session to fill with multiple-choice items.
 *
 * **Decided by Felipe, 8 Aug 2026, and unvalidated like every other threshold here.** A constructed
 * response is genuinely more informative per item — max information at the decision point is `0.25a²`
 * at c = 0 against `0.15a²` for a four-option item, and even a fairly guessable 1-in-14 placement is
 * still 1.41x — so selection on information alone fills a session with mazes and token sorts and never
 * asks a multiple-choice question. That is not a modelling error to correct; those items really do
 * separate candidates better per item.
 *
 * What they are not is quick. Multiple choice is one pick, and a child answers several in the time one
 * tangram placement takes, so a session made entirely of constructed items either runs long or asks
 * very little. Holding half the session for multiple choice trades information per item for information
 * per minute.
 *
 * **This is a serving rule and deliberately not a change to the model.** Penalising a constructed item's
 * information to get this outcome would corrupt the number the stop rule and the pass decision read.
 * The information stays honest; only what may be drawn is constrained — the same shape as the
 * per-domain floor above it.
 *
 * **The successor to this is information per expected second**, once `latencyMs` is forwarded (1b.5) and
 * per-type floors exist (1b.3). That expresses the real tradeoff instead of approximating it with a
 * quota, and this constant should be deleted rather than kept alongside it.
 */
export const DEFAULT_MIN_MULTIPLE_CHOICE_SHARE = 0.5;

/**
 * The bar a single domain must clear to pass a candidate the composite would reject, and how much of that
 * domain's posterior has to sit above it.
 *
 * **Both unvalidated against real children**, like `abilityThreshold` and `recommendProbability`. They were
 * chosen against simulated cohorts on 8 Aug 2026 rather than picked for roundness. At Careful precision
 * with four items per domain, the domain route recommends:
 *
 * | Cohort | bar 1.0 / p 0.30 | **bar 1.5 / p 0.45** | bar 1.5 / p 0.60 |
 * |---|---|---|---|
 * | true spatial spike +2.5 | 96% | **78%** | 0% |
 * | true spatial spike +2.0 | 87% | **59%** | 0% |
 * | uniformly average, theta 0 | 19% | **1%** | 0% |
 * | uniformly weak, theta -0.5 | 9% | **1%** | 0% |
 *
 * The composite route recommends **0%** of all four cohorts, which is the finding that justifies the rule:
 * a real spike is currently rejected `confident-below` with the evidence sitting in the transcript.
 *
 * Two things to know before changing either number. There is a cliff just above p = 0.5 — at 0.60 the rule
 * stops firing for anybody, because four items cannot put that much mass past the bar — so p is doing
 * nearly all the work and a bar of 2.0 never fires at all. And the rule's power is a function of
 * `perDomainMinimum`: fewer items per domain means a flatter posterior and a rule that cannot fire.
 *
 * `p` is deliberately below a half, for the reason `recommendProbability` is: the cost-optimal threshold is
 * the false-positive share of total error cost, and a missed child costs far more than an extra review.
 */
export const DEFAULT_DOMAIN_BAR = 1.5;
export const DEFAULT_DOMAIN_RECOMMEND_PROBABILITY = 0.45;

export class QbankSession {
  private readonly posterior = new Posterior();
  private readonly attempts: QbankAttempt[] = [];
  private readonly usedItemIds = new Set<string>();
  private readonly perDomain = new Map<Domain, number>(DOMAINS.map((d) => [d, 0]));
  /**
   * One posterior per domain, each updated only by its own domain's scored items.
   *
   * Four independent instances and nothing more — no hierarchical model, no pooling, no shrinkage toward
   * the composite. With two to four items per domain a hierarchical model would be inventing structure to
   * make the numbers look narrower than the evidence is.
   */
  private readonly domainPosteriors = new Map<Domain, Posterior>(DOMAINS.map((d) => [d, new Posterior()]));
  /** Scored items per domain. A domain that scored nothing has a prior, and a prior is not reported. */
  private readonly domainScored = new Map<Domain, number>(DOMAINS.map((d) => [d, 0]));
  private pending: { record: BankRecord; serve: QbankServe } | null = null;
  private stopReason: StopReason | null = null;
  private unscorable = 0;
  /** Counted against `minMultipleChoiceShare`, and counted whether or not the response could be marked. */
  private multipleChoiceServed = 0;

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
    const passRoute = stopped ? this.passRouteFor(pAbove) : null;
    return {
      stopped,
      stopReason: this.stopReason,
      pAbove,
      decision: stopped ? (passRoute ? 'recommend' : 'no-recommendation') : null,
      passRoute,
      itemsServed: this.attempts.length,
      unscorable: this.unscorable,
      estimate: this.posterior.mean(),
      interval: this.posterior.interval(0.9),
      perDomain: Object.fromEntries(this.perDomain),
      domains: this.domainBands(),
    };
  }

  /**
   * The disjunctive pass rule: the composite clears its threshold, **or** any single domain clears a
   * higher one.
   *
   * The composite is checked first and wins when it succeeds, so a candidate the whole battery passed is
   * never reported as having been carried by one domain.
   *
   * `P(theta_domain > domainBar) >= p` rather than a comparison of means, because the bands are 2-3 logits
   * wide and at that width it is the probability threshold and not the bar that does the work. Both numbers
   * are stated in config with a comment saying they are unvalidated.
   *
   * **Only domains that scored something are eligible.** An untouched domain still holds its prior, and a
   * prior has real mass above any modest bar, so skipping this check would let a low `p` recommend a child
   * on the strength of a domain nobody asked them about — a false positive manufactured from nothing.
   */
  private passRouteFor(pAbove: number): PassRoute | null {
    if (pAbove >= this.config.recommendProbability) return { via: 'composite' };

    const bar = this.config.domainBar ?? DEFAULT_DOMAIN_BAR;
    const p = this.config.domainRecommendProbability ?? DEFAULT_DOMAIN_RECOMMEND_PROBABILITY;
    if (p <= 0) return null;

    // DOMAINS order, not probability order: this is a record of what cleared, never a ranking.
    const cleared = DOMAINS.filter(
      (d) => (this.domainScored.get(d) ?? 0) > 0 && this.domainPosteriors.get(d)!.probabilityAbove(bar) >= p,
    );
    return cleared.length > 0 ? { via: 'domain', domains: cleared } : null;
  }

  /**
   * The per-domain readout, omitting any domain that scored nothing.
   *
   * Suppression keys off scored items rather than served ones. A domain served twice whose responses were
   * both unmarkable holds exactly the prior it started with, and publishing that under a domain label
   * would be a claim about a child nobody managed to measure — the same failure as publishing a domain
   * that was never asked about, arriving by a different route.
   */
  private domainBands(): Readonly<Partial<Record<Domain, DomainBand>>> {
    const out: Partial<Record<Domain, DomainBand>> = {};
    for (const domain of DOMAINS) {
      const scored = this.domainScored.get(domain) ?? 0;
      if (scored === 0) continue;
      const posterior = this.domainPosteriors.get(domain)!;
      out[domain] = {
        mean: posterior.mean(),
        interval: posterior.interval(0.9),
        itemsServed: this.perDomain.get(domain) ?? 0,
        itemsScored: scored,
      };
    }
    return out;
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

    /**
     * Whether this draw is owed to multiple choice.
     *
     * A running share rather than a fixed count, so it scales across the precision steps without knowing
     * the item cap: a Taster of 4 and a Thorough of 20 both come out at the configured share. At 0.5 it
     * alternates — owed, free, owed, free — which is the intent.
     */
    const share = this.config.minMultipleChoiceShare ?? DEFAULT_MIN_MULTIPLE_CHOICE_SHARE;
    const owedMultipleChoice =
      share > 0 && this.multipleChoiceServed < share * (this.usedItemIds.size + 1);

    const eligible = (entry: { record: BankRecord; domain: Domain }): boolean =>
      !this.usedItemIds.has(entry.record.itemId) && (short.length === 0 || short.includes(entry.domain));

    /**
     * The format restriction applies only if something is left to satisfy it with. A caller may restrict
     * the pool to one type, and a coverage rule that can empty the pool would stop the session early and
     * report `bank-exhausted` on a bank that is not exhausted — a worse failure than serving a second
     * constructed item in a row.
     */
    const restrictToMultipleChoice =
      owedMultipleChoice &&
      this.pool.some((e) => eligible(e) && responseFormatOf(e.record) === 'multiple-choice');

    let best: { record: BankRecord; domain: Domain; info: number } | null = null;
    for (const entry of this.pool) {
      if (!eligible(entry)) continue;
      if (restrictToMultipleChoice && responseFormatOf(entry.record) !== 'multiple-choice') continue;
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
          : restrictToMultipleChoice
            ? `multiple-choice share (${this.multipleChoiceServed} of ${this.usedItemIds.size} so far, floor ${share}); information ${best.info.toFixed(3)} at threshold ${threshold.toFixed(2)}`
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
    else {
      const params = this.paramsOf(toLogits(record.difficulty), record);
      // The composite first and unconditionally: it is the pass route, and it is updated by every scored
      // item whatever domain the item came from. The domain readout is the same evidence counted again,
      // not evidence taken away from here.
      this.posterior.update(params, correct);
      this.domainPosteriors.get(serve.domain)!.update(params, correct);
      this.domainScored.set(serve.domain, (this.domainScored.get(serve.domain) ?? 0) + 1);
    }

    const pAfter = this.posterior.probabilityAbove(threshold);
    this.usedItemIds.add(record.itemId);
    this.perDomain.set(serve.domain, (this.perDomain.get(serve.domain) ?? 0) + 1);
    if (responseFormatOf(record) === 'multiple-choice') this.multipleChoiceServed += 1;
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
