import {
  CRITERIA_V1,
  DOMAIN_NAMES,
  type DomainName,
  type ResponseRecord,
  type ScoreSheet,
  type SessionRecord,
} from '@platform/domain';
import { computeSheet, toEngineConfig, toQbankState, type TraceEntry } from '@platform/scoring';
import { eligible, type SelectionIndex, type SelectionRequest } from '@platform/selection';
import type { Deps } from './deps.js';
import { forbidden, notFound } from './http.js';
import { loadSelectionIndex } from './snapshot-cache.js';

/**
 * The parts of a session both serving and scoring need.
 *
 * Kept here rather than duplicated because the two handlers must agree exactly about what the trace
 * means. If `serve` computed coverage one way and `score` another, sessions would stop at different
 * points depending on which function looked last.
 */

export interface LoadedSession {
  readonly session: SessionRecord;
  readonly responses: readonly ResponseRecord[];
  readonly answered: readonly ResponseRecord[];
  /** The response already served and awaiting an answer, if there is one. */
  readonly pending: ResponseRecord | null;
  /** The app's approvals, narrowed by whatever the session restricted itself to at creation. */
  readonly approvedTypes: ReadonlySet<string>;
  /**
   * The app's approvals *without* the session's per-burst restriction.
   *
   * Selection wants `approvedTypes`, because a burst should only draw from the station the child is standing
   * at. The stop rule's domain-coverage check wants this one, because over the whole session a keeper walks
   * between stations and can be asked anything the app approves.
   */
  readonly appApprovedTypes: ReadonlySet<string>;
  readonly index: SelectionIndex;
  /** How many items this session could still be offered, which the contract reports as `poolSize`. */
  readonly eligibleCount: number;
}

export async function loadSession(
  d: Deps,
  sessionId: string,
  appId: string,
): Promise<LoadedSession> {
  const session = await d.store.getSession(sessionId);
  if (!session) throw notFound(`no session ${sessionId}`);
  // Scoped by the authorizer's app identity, never by anything in the request body. This is what
  // stops one app reading or advancing another app's sessions.
  if (session.appId !== appId) throw forbidden('session belongs to another app');

  const responses = await d.store.listResponses(sessionId);
  const snapshot = await d.store.getSnapshot(session.snapshotId);
  if (!snapshot) throw notFound(`session pins snapshot ${session.snapshotId}, which is missing`);

  const index = await loadSelectionIndex(
    session.snapshotId,
    d.env.snapshotBucket,
    snapshot.s3Key,
  );

  /**
   * Approved types are read live rather than frozen onto the session.
   *
   * Everything else in `resolvedConfig` is frozen, so an app edit cannot change the rules a child is
   * being measured under mid-session. Approval is the deliberate exception: revoking a type is the
   * action you take when a type turns out to be broken, and it has to take effect on the next
   * question rather than after every open session drains.
   */
  const approved = await d.store.listApprovedTypes(session.appId);
  /**
   * The session's own restriction is intersected with the app's live approvals, not substituted for them.
   *
   * A type revoked from the app after a session began stops being served to it, which is the point of
   * reading approvals live. A restriction the session asked for cannot widen that.
   */
  const restricted = session.restrictedTypes;
  const approvedTypes = new Set(
    restricted ? approved.filter((code) => restricted.includes(code)) : approved,
  );

  const loaded: LoadedSession = {
    session,
    responses,
    answered: responses.filter((r) => r.state === 'answered'),
    pending: responses.find((r) => r.state === 'served') ?? null,
    approvedTypes,
    appApprovedTypes: new Set(approved),
    index,
    eligibleCount: 0,
  };

  return { ...loaded, eligibleCount: eligible(selectionRequestFor(loaded, 1)).length };
}

/**
 * The trace as the engine adapter reads it.
 *
 * The parameters come off the response record, not the registry, so a recompute against corrected
 * difficulties is a deliberate act rather than an accident of read ordering — and so an item that has
 * since left the pool still contributes its evidence.
 */
export { toQbankState };

export function toTrace(answered: readonly ResponseRecord[]): TraceEntry[] {
  return answered.map((r) => ({
    ordinal: r.ordinal,
    itemId: r.itemId,
    typeCode: r.typeCode,
    domain: r.domain,
    difficulty: r.difficulty,
    params: r.params,
    correct: r.correct,
    latencyMs: r.latencyMs,
    rawResponse: r.rawResponse,
    flags: r.flags ?? [],
  }));
}

/**
 * Domains the session's eligible pool can actually serve.
 *
 * No longer consulted by `sheetFor`: the engine reads coverage off the pool it is handed, so passing a
 * separate list would be a second answer to one question. Kept because serving still reports it.
 */
export function domainsAvailable(loaded: LoadedSession): readonly DomainName[] {
  const request = selectionRequestFor(loaded, 1);
  const pool = eligible({ ...request, usedItemIds: new Set(), personaRecentItemIds: new Set() });
  return DOMAIN_NAMES.filter((domain) => pool.some((candidate) => candidate.domain === domain));
}

export function sheetFor(
  loaded: LoadedSession,
  options: { readonly poolExhausted?: boolean; readonly abandoned?: boolean } = {},
): ScoreSheet {
  const { session, answered, responses, index } = loaded;

  return computeSheet({
    sessionId: session.sessionId,
    snapshotId: session.snapshotId,
    config: toEngineConfig(session.resolvedConfig, session.ageBand),
    criteria: CRITERIA_V1,
    trace: toTrace(answered),
    // The whole snapshot, for reconciling the trace against the bank.
    candidates: index.items,
    /**
     * What this app could ever ask, which is what the coverage check must see.
     *
     * Passing the whole snapshot here meant the rule waited on domains the app has no approved type for, so
     * coverage was unsatisfiable and every session ran to the item cap instead of stopping when confident.
     * Not narrowed by the session's `restrictedTypes`: that is the station the child is at right now, and
     * they will walk to the others.
     */
    servable: index.items.filter((item) => loaded.appApprovedTypes.has(item.typeCode)),
    itemsServed: responses.length,
    poolExhausted: options.poolExhausted ?? false,
    abandoned: options.abandoned ?? session.status === 'abandoned',
  });
}

/**
 * Build a selection request from a loaded session.
 *
 * `personaRecentItemIds` is left empty here and filled by the serving handler, which is the only
 * caller that needs it: computing it costs one indexed query plus a trace read per recent session,
 * and the sheet does not depend on it.
 */
export function selectionRequestFor(
  loaded: LoadedSession,
  ordinal: number,
  extras: Partial<SelectionRequest> = {},
): SelectionRequest {
  const { session, answered, responses, approvedTypes, index } = loaded;
  const config = session.resolvedConfig;

  const typeServedCounts = new Map<string, number>();
  const domainServedCounts = new Map<DomainName, number>();
  for (const response of responses) {
    typeServedCounts.set(response.typeCode, (typeServedCounts.get(response.typeCode) ?? 0) + 1);
    domainServedCounts.set(response.domain, (domainServedCounts.get(response.domain) ?? 0) + 1);
  }

  const last = answered[answered.length - 1] ?? responses[responses.length - 1];

  return {
    index,
    threshold: config.abilityThreshold,
    ordinal,
    rngSeed: session.rngSeed,
    approvedTypes,
    /**
     * Read live from the app, like approvals rather than like the frozen config.
     *
     * Withdrawing an item is what you do when it turns out to be broken, and it has to take effect on the
     * next question rather than after every open session has drained.
     */
    withheldItemIds: new Set(config.withheldItemIds ?? []),
    ageBand: session.ageBand,
    maxReadingBand: config.maxReadingBand,
    allowSynthetic: config.allowSyntheticItems,
    usedItemIds: new Set(responses.map((r) => r.itemId)),
    personaRecentItemIds: new Set(),
    typeServedCounts,
    domainServedCounts,
    lastDomain: last ? last.domain : null,
    perDomainMinimum: config.perDomainMinimum,
    variety: config.variety,
    exposure: null,
    ...extras,
  };
}

/**
 * Items this persona met in their recent sessions.
 *
 * Bounded by the app's `personaLookbackSessions` because the cost is a query per session and the
 * value falls away fast: a child who took the screener a year ago does not remember item 3.
 */
export async function personaRecentItems(
  d: Deps,
  session: SessionRecord,
): Promise<Set<string>> {
  const out = new Set<string>();
  const lookback = session.resolvedConfig.variety.personaLookbackSessions;
  if (!session.personaId || lookback <= 0) return out;

  const recent = await d.store.sessionsForPersona(session.personaId, lookback + 1);
  for (const id of recent.filter((i) => i !== session.sessionId).slice(0, lookback)) {
    for (const response of await d.store.listResponses(id)) out.add(response.itemId);
  }
  return out;
}
