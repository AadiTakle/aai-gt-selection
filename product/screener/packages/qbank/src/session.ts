import type { StopReason } from '@gt/contracts';

import { type BankRecord, type LoadedBank } from './bank.js';
import {
  type Domain,
  type PoolEntry,
  type Posteriors,
  type QbankAttempt,
  type QbankServe,
  type QbankSessionConfig,
  type QbankState,
  buildPool,
  grade,
  initialPosteriors,
  selectNext,
  stateFor,
  stopReasonFor,
} from './engine.js';

/**
 * A stateful session over the real item banks.
 *
 * **All the measurement lives in `engine.ts` now.** This class holds three things — the transcript, the
 * belief, and which item is currently out with the candidate — and calls `selectNext` and `grade` for
 * everything else. It exists because the Express API, four apps and the smoke suite were written against
 * it, and because a stateful handle is genuinely the more convenient shape when you are in one process
 * anyway.
 *
 * Everything that used to be private state here — used ids, per-domain counts, scored counts, the
 * multiple-choice tally, the unscorable tally — is now derived from the transcript by `progressFrom`. Two
 * places holding the same fact is how they come to disagree, and a stateless engine has to be immune to
 * that: replaying a history must land exactly where the original session did.
 *
 * What this class cannot do is survive the process. `bankSessions` in `apps/api/src/server.ts` is a `Map`,
 * so a second request landing on another Lambda instance finds nothing. That is not fixed by this refactor
 * and is not meant to be — it is task 3.2, which decides whether the caller holds the state (signed, so a
 * client cannot hand itself a posterior) or DynamoDB does.
 */
export class QbankSession {
  private posteriors: Posteriors = initialPosteriors();
  private readonly attempts: QbankAttempt[] = [];
  private pending: { record: BankRecord; serve: QbankServe } | null = null;
  private stopReason: StopReason | null = null;

  /** Every servable record across the banks this session may draw on, with its domain resolved. */
  private readonly pool: readonly PoolEntry[];

  constructor(
    private readonly config: QbankSessionConfig,
    banks: ReadonlyMap<string, LoadedBank>,
    private readonly rngSeed: number,
  ) {
    const records: BankRecord[] = [];
    for (const bank of banks.values()) records.push(...bank.scorable);
    this.pool = buildPool(records, { ageBand: config.ageBand, cogatAlignment: config.cogatAlignment });
  }

  get poolSize(): number {
    return this.pool.length;
  }

  getAttempts(): readonly QbankAttempt[] {
    return [...this.attempts];
  }

  /** Exactly what the two pure functions are given, so a caller can lift a session out of this class. */
  private engineInput() {
    return { config: this.config, pool: this.pool, history: this.attempts, posteriors: this.posteriors };
  }

  state(): QbankState {
    return stateFor(this.config, this.pool, this.attempts, this.posteriors, this.stopReason);
  }

  /** Choose the next item, remembering which one is out so `submit` knows what it is marking. */
  nextItem(): QbankServe | null {
    if (this.stopReason) return null;
    if (this.pending) return this.pending.serve;

    const { serve, stopReason } = selectNext(this.engineInput());
    if (!serve) {
      this.stopReason = stopReason;
      return null;
    }
    // The pool entry rather than the served copy: `submit` needs the answer key, which `toServed` strips.
    const record = this.pool.find((e) => e.record.itemId === serve.served.itemId)!.record;
    this.pending = { record, serve };
    return serve;
  }

  /**
   * Mark a response and decide whether to continue.
   *
   * The order here is load-bearing and unchanged: the probability is read before and after the update so the
   * transcript records what this single item moved, and the stop rule is evaluated after the attempt is
   * recorded so `item-cap` counts the item just answered.
   */
  submit(rawResponse: unknown, latencyMs: number): QbankState {
    const pending = this.pending;
    if (!pending) throw new Error('submit called with no pending item');
    if (this.stopReason) throw new Error('submit called on a stopped session');

    const { record, serve } = pending;
    const threshold = this.config.abilityThreshold;
    const pAboveBefore = this.posteriors.composite.probabilityAbove(threshold);

    const { correct, posteriors, flags } = grade({
      item: record,
      response: rawResponse,
      latencyMs,
      posteriors: this.posteriors,
      rapidGuessFloorScale: this.config.rapidGuessFloorScale,
    });
    this.posteriors = posteriors;

    const pAboveAfter = this.posteriors.composite.probabilityAbove(threshold);
    this.attempts.push({
      ordinal: this.attempts.length + 1,
      itemId: record.itemId,
      typeCode: record.typeCode,
      domain: serve.domain,
      difficulty: record.difficulty,
      correct,
      rawResponse,
      latencyMs,
      pAboveBefore,
      pAboveAfter,
      selectionReason: serve.selectionReason,
      flags,
    });
    this.pending = null;

    this.stopReason = stopReasonFor(this.engineInput());
    return this.state();
  }

  abandon(): QbankState {
    // Not derivable from the evidence — it is the caller's intent — so it is owned here and not in the engine.
    if (!this.stopReason) this.stopReason = 'abandoned';
    return this.state();
  }

  /** Everything the debug tray shows. Nothing here is hidden from the operator. */
  debug() {
    return {
      seed: this.rngSeed,
      poolSize: this.pool.length,
      poolUsed: this.attempts.length,
      threshold: this.config.abilityThreshold,
      precision: this.config.precision,
      perDomainMinimum: this.config.perDomainMinimum,
      recommendProbability: this.config.recommendProbability,
      posteriorMean: this.posteriors.composite.mean(),
      posteriorSd: this.posteriors.composite.sd(),
      interval: this.posteriors.composite.interval(0.9),
      difficultyMapping: 'b = (difficulty - 10.5) / 3, a rescaling of the bank scale and not a calibration',
      attempts: this.attempts,
    };
  }
}

/**
 * Re-exported so every existing import of this module keeps working.
 *
 * The types and thresholds moved to `engine.ts` when the measurement did, but four apps, the API and the
 * test suite import them from here, and a refactor that renames everyone's imports is a refactor that gets
 * reverted. New code should prefer `./engine.js` directly.
 */
export {
  DEFAULT_DOMAIN_BAR,
  DEFAULT_DOMAIN_RECOMMEND_PROBABILITY,
  DEFAULT_MIN_MULTIPLE_CHOICE_SHARE,
  DOMAINS,
  FIXED_DISCRIMINATION,
  PRECISION_STEPS,
  UNGUESSABLE,
  buildPool,
  clonePosteriors,
  domainBandsFor,
  grade,
  initialPosteriors,
  paramsForRecord,
  passRouteFor,
  posteriorsFrom,
  precisionAt,
  progressFrom,
  restorePosteriors,
  selectNext,
  snapshotPosteriors,
  stateFor,
  stopReasonFor,
} from './engine.js';
export type {
  Domain,
  DomainBand,
  GradeInput,
  GradeResult,
  PassRoute,
  PoolEntry,
  Posteriors,
  PrecisionSetting,
  Progress,
  QbankAttempt,
  QbankServe,
  QbankSessionConfig,
  QbankState,
  SelectNextInput,
  SelectNextResult,
} from './engine.js';
