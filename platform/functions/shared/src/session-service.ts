import {
  CRITERIA_V1,
  DOMAIN_NAMES,
  type DomainName,
  type ResponseRecord,
  type ScoreSheet,
  type SessionRecord,
} from '@platform/domain';
import { computeSheet, type ScoredResponse } from '@platform/scoring';
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
  readonly approvedTypes: ReadonlySet<string>;
  readonly index: SelectionIndex;
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
  const approvedTypes = new Set(await d.store.listApprovedTypes(session.appId));

  return {
    session,
    responses,
    answered: responses.filter((r) => r.state === 'answered'),
    pending: responses.find((r) => r.state === 'served') ?? null,
    approvedTypes,
    index,
  };
}

export function toScoredResponses(answered: readonly ResponseRecord[]): ScoredResponse[] {
  // The parameters come off the trace, not off the registry. That is what makes a recompute against
  // corrected difficulties a deliberate act rather than an accident of read ordering.
  return answered.map((r) => ({ domain: r.domain, params: r.params, correct: r.correct }));
}

/** Domains the session's eligible pool can actually serve, for the coverage half of the stop rule. */
export function domainsAvailable(loaded: LoadedSession): readonly DomainName[] {
  const request = selectionRequestFor(loaded, 1);
  const pool = eligible({ ...request, usedItemIds: new Set(), personaRecentItemIds: new Set() });
  return DOMAIN_NAMES.filter((domain) => pool.some((candidate) => candidate.domain === domain));
}

export function sheetFor(
  loaded: LoadedSession,
  options: { readonly poolExhausted?: boolean; readonly abandoned?: boolean } = {},
): ScoreSheet {
  const { session, answered, responses } = loaded;
  const config = session.resolvedConfig;

  return computeSheet({
    sessionId: session.sessionId,
    snapshotId: session.snapshotId,
    threshold: config.abilityThreshold,
    criteria: CRITERIA_V1,
    responses: toScoredResponses(answered),
    precision: config.precision,
    perDomainMinimum: config.perDomainMinimum,
    recommendProbability: config.recommendProbability,
    itemsServed: responses.length,
    poolExhausted: options.poolExhausted ?? false,
    abandoned: options.abandoned ?? session.status === 'abandoned',
    domainsAvailable: domainsAvailable(loaded),
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
