import {
  type BankRecord,
  type PoolEntry,
  type Posteriors,
  type Progress,
  type QbankAttempt,
  type QbankSessionConfig,
  type QbankState,
  initialPosteriors,
  progressFrom,
  stateFor,
  stopReasonFor,
} from '@gt/qbank/server';
import type { DomainName, ItemParameters, SelectionCandidate } from '@platform/domain';

/**
 * The minimum a response has to say for it to move belief.
 *
 * `params` are the ones in force when the item was served, carried on the response record rather than
 * looked up. That is what lets a rescore choose deliberately between what was believed then and what is
 * believed now, and what stops an item leaving the pool from silently deleting its own evidence.
 */
export interface ScoredResponse {
  readonly domain: DomainName;
  readonly params: ItemParameters;
  /** Null when the platform could not mark it, or the engine declined to believe it. */
  readonly correct: boolean | null;
}

/**
 * The seam between the platform's records and Felipe's engine.
 *
 * The engine owns the decision — the stop rule, the pass route, the domain bands — and this module owns
 * getting the platform's data into the shapes it expects. Everything here is a translation; no measurement
 * rule is implemented in this file, deliberately, because two implementations of a stop rule is how two
 * answers about a child come to exist.
 *
 * ## Why the posteriors are built here rather than by `posteriorsFrom`
 *
 * `posteriorsFrom(history, pool)` recovers each item's parameters by looking the item up in the pool, and
 * skips any attempt whose item is not there:
 *
 *     const entry = byId.get(attempt.itemId);
 *     if (!entry) continue;
 *
 * That is right for a live session, where the pool is the session's own. It is wrong for this platform's
 * backfill. A re-score runs after an item was revised or a type was retired, which is exactly when an
 * attempt's item may have left the pool — and the result would be a posterior built from fewer items,
 * returned with no indication that evidence was dropped, and stored as the current sheet.
 *
 * The platform records `(a, b, c)` on every response as served, so it does not need the lookup. Building
 * the posteriors from the trace cannot silently lose an attempt, and `coverageOf` below reports the case
 * his function would have swallowed so a caller can refuse rather than proceed.
 */

/** Update order is composite then domain, matching `posteriorsFrom`, so the arithmetic is identical. */
export function posteriorsFromTrace(responses: readonly ScoredResponse[]): Posteriors {
  const posteriors = initialPosteriors();
  for (const response of responses) {
    if (response.correct === null) continue;
    const target = posteriors.byDomain[response.domain];
    if (!target) {
      throw new Error(`response declares unknown domain ${String(response.domain)}`);
    }
    posteriors.composite.update(response.params, response.correct);
    target.update(response.params, response.correct);
  }
  return posteriors;
}

/**
 * A response as the engine's transcript sees it.
 *
 * `pAboveBefore` and `pAboveAfter` are what the engine records live; a sheet derived after the fact does
 * not have them and must not invent them, so they are zero and nothing reads them. `flags` carries the
 * rapid-guess marker through.
 */
export interface TraceEntry extends ScoredResponse {
  readonly ordinal: number;
  readonly itemId: string;
  readonly typeCode: string;
  readonly difficulty: number;
  readonly latencyMs: number | null;
  readonly rawResponse: unknown;
  readonly flags?: readonly string[];
}

export function toAttempts(trace: readonly TraceEntry[]): QbankAttempt[] {
  return trace.map((entry) => ({
    ordinal: entry.ordinal,
    itemId: entry.itemId,
    typeCode: entry.typeCode,
    domain: entry.domain,
    difficulty: entry.difficulty,
    correct: entry.correct,
    rawResponse: entry.rawResponse,
    latencyMs: entry.latencyMs ?? 0,
    // Not recoverable after the fact, and not read by the stop rule or the pass route.
    pAboveBefore: 0,
    pAboveAfter: 0,
    selectionReason: '',
    flags: entry.flags ?? [],
  }));
}

/**
 * A pool the engine can reason about, from the platform's selection index.
 *
 * The engine reads three things from a pool: which domains it can serve (the coverage half of the stop
 * rule), an item's parameters, and its response format. The first two come across exactly. The third does
 * not: `responseFormatOf` reads the record's `content`, which the selection index deliberately does not
 * carry, so `Progress.multipleChoiceServed` will read zero through this pool. That is safe here because
 * the stop rule and the pass route never consult it — it drives the multiple-choice share quota, which is
 * a *serving* rule. Anything in the platform that wants that quota must build its pool from registry
 * items, which do carry content.
 */
export function toPool(candidates: readonly SelectionCandidate[]): PoolEntry[] {
  return candidates.map((candidate) => ({
    record: {
      itemId: candidate.itemId,
      typeCode: candidate.typeCode,
      difficulty: candidate.difficulty,
      ageBands: candidate.ageBands,
      // Absent on purpose: see the note above, and never mark through a pool built here.
      content: {},
      scoring: { mode: candidate.scoringMode },
    } as unknown as BankRecord,
    domain: candidate.domain,
    b: candidate.params.b,
  }));
}

export interface Coverage {
  /** Item ids in the trace that the pool cannot account for. */
  readonly missingItemIds: readonly string[];
  readonly complete: boolean;
}

/**
 * Whether a pool accounts for every item a trace mentions.
 *
 * Exists so the platform can refuse a recompute rather than quietly produce one over less evidence. The
 * engine's own replay treats a missing item as a skipped attempt; here that is a condition worth reporting.
 */
export function coverageOf(
  trace: readonly TraceEntry[],
  candidates: readonly SelectionCandidate[],
): Coverage {
  const known = new Set(candidates.map((candidate) => candidate.itemId));
  const missing = [...new Set(trace.filter((e) => !known.has(e.itemId)).map((e) => e.itemId))];
  return { missingItemIds: missing, complete: missing.length === 0 };
}

export interface EngineVerdict {
  readonly state: QbankState;
  readonly progress: Progress;
  readonly posteriors: Posteriors;
}

/**
 * Ask the engine what it makes of a trace.
 *
 * `abandoned` and `bank-exhausted` are the platform's to declare, because only the caller knows a child
 * walked away or that selection came up empty. Everything else — the item cap, the item floor, domain
 * coverage, the two confidence bars, the pass route — is the engine's.
 */
export function verdictFor(input: {
  readonly config: QbankSessionConfig;
  readonly trace: readonly TraceEntry[];
  readonly candidates: readonly SelectionCandidate[];
  readonly poolExhausted?: boolean;
  readonly abandoned?: boolean;
}): EngineVerdict {
  const posteriors = posteriorsFromTrace(input.trace);
  const history = toAttempts(input.trace);
  const pool = toPool(input.candidates);

  const engineStop = stopReasonFor({ config: input.config, pool, history, posteriors });
  const stopReason = input.abandoned
    ? 'abandoned'
    : (engineStop ?? (input.poolExhausted ? 'bank-exhausted' : null));

  return {
    state: stateFor(input.config, pool, history, posteriors, stopReason),
    progress: progressFrom(history, pool),
    posteriors,
  };
}

export function domainCountsOf(progress: Progress): Readonly<Record<DomainName, number>> {
  return { ...progress.perDomain } as Record<DomainName, number>;
}

/**
 * An app's configuration, as the engine expects it.
 *
 * The platform's `AppConfig` is the durable record a session freezes; `QbankSessionConfig` is what the
 * engine reads. Keeping them separate rather than storing the engine's shape directly means a change to the
 * engine's optional knobs does not rewrite every stored session.
 *
 * `domainBar` and `domainRecommendProbability` are passed through when the app sets them and otherwise left
 * for the engine's defaults, which is the difference between an app declining to configure the disjunctive
 * route and an app switching it off.
 */
export function toEngineConfig(
  app: {
    readonly abilityThreshold: number;
    readonly recommendProbability: number;
    readonly precision: {
      readonly confidenceAbove: number;
      readonly confidenceBelow: number;
      readonly minItems: number;
      readonly maxItems: number;
    };
    readonly perDomainMinimum: number;
    readonly domainBar?: number;
    readonly domainRecommendProbability?: number;
  },
  ageBand?: string | null,
): QbankSessionConfig {
  return {
    abilityThreshold: app.abilityThreshold,
    recommendProbability: app.recommendProbability,
    precision: {
      label: 'app',
      confidenceAbove: app.precision.confidenceAbove,
      confidenceBelow: app.precision.confidenceBelow,
      minItems: app.precision.minItems,
      maxItems: app.precision.maxItems,
      note: 'Resolved from the app configuration frozen onto the session.',
    },
    perDomainMinimum: app.perDomainMinimum,
    ...(ageBand ? { ageBand } : {}),
    ...(app.domainBar === undefined ? {} : { domainBar: app.domainBar }),
    ...(app.domainRecommendProbability === undefined
      ? {}
      : { domainRecommendProbability: app.domainRecommendProbability }),
  };
}

export type { ItemParameters, Posteriors, Progress, QbankSessionConfig, QbankState };
