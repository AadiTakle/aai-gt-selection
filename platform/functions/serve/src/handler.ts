import { randomUUID } from 'node:crypto';
import {
  toServedQuestion,
  type ResponseRecord,
  type SessionRecord,
} from '@platform/domain';
import { ENGINE_VERSION } from '@platform/scoring';
import { selectNext } from '@platform/selection';
import { CRITERIA_V1 } from '@platform/domain';
import {
  SERVED_TOKEN_TTL_MS,
  badRequest,
  created,
  deps,
  forbidden,
  handle,
  loadSession,
  notFound,
  ok,
  parseJsonBody,
  personaRecentItems,
  requireAppId,
  requirePathParam,
  selectionRequestFor,
  sheetFor,
  signServedToken,
  type ApiRequest,
  type ApiResponse,
  type Deps,
} from '@platform/shared';

/**
 * Starting a session, and choosing what to ask next.
 *
 * This function has no IAM permission on the answer-key table, so no code path here can obtain a key
 * whatever it asks for. That is the reason serving and scoring are separate functions rather than two
 * routes on one.
 */

interface CreateSessionBody {
  readonly personaId?: string;
  readonly ageBand?: string;
  readonly locale?: string;
}

async function createSession(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const d = deps();
  const body = request.body ? parseJsonBody<CreateSessionBody>(request) : {};

  const app = await d.store.getApp(appId);
  if (!app) throw notFound(`no app ${appId}`);
  if (app.status !== 'active') throw forbidden('app is disabled');

  const snapshot = app.pinnedSnapshotId
    ? await d.store.getSnapshot(app.pinnedSnapshotId)
    : await d.store.latestSnapshot();
  if (!snapshot) throw notFound('no catalog snapshot has been published');

  const ageBand = body.ageBand ?? null;
  if (ageBand !== null && app.ageBands.length > 0 && !app.ageBands.includes(ageBand)) {
    throw badRequest(`app does not serve age band ${ageBand}`, { serves: app.ageBands });
  }

  /**
   * A persona is created only when the app supplies one.
   *
   * An anonymous session is the default and stays entirely out of the persona index. Nothing about a
   * child is stored unless an app that is permitted to collect contact details chooses to link one.
   */
  let personaId: string | null = null;
  if (body.personaId) {
    if (app.piiPolicy === 'none') {
      throw forbidden('app is not permitted to link a persona');
    }
    personaId = body.personaId;
    await d.personas.create(personaId, body.locale ?? null, appId);
  }

  const session: SessionRecord = {
    sessionId: `sess-${randomUUID()}`,
    appId,
    personaId,
    snapshotId: snapshot.snapshotId,
    engineVersion: ENGINE_VERSION,
    criteriaVersion: CRITERIA_V1.version,
    // Frozen. An app edit mid-session cannot change the rules a child is measured under.
    resolvedConfig: app,
    rngSeed: randomUUID(),
    ageBand,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: 'active',
    stopReason: null,
    decision: null,
  };

  await d.store.putSession(session);
  // The exposure denominator. Bumped at session start rather than at first item so that an abandoned
  // session still counts against exposure rates, which is the honest denominator.
  await d.store.bumpAppSessionCount(appId);

  const loaded = await loadSession(d, session.sessionId, appId);
  const sheet = sheetFor(loaded);
  await d.store.putSheet(sheet, []);

  return created({
    sessionId: session.sessionId,
    snapshotId: session.snapshotId,
    engineVersion: session.engineVersion,
    criteriaVersion: session.criteriaVersion,
    sheet,
  });
}

function servedPayload(
  d: Deps,
  response: ResponseRecord,
  content: Record<string, unknown>,
  uiRequirement: unknown,
): ApiResponse {
  const item = toServedQuestion({
    itemId: response.itemId,
    typeCode: response.typeCode,
    revision: response.itemRevision,
    domain: response.domain,
    difficulty: response.difficulty,
    params: response.params,
    optionCount: response.optionCount,
    ageBands: [],
    scoringMode: 'deterministic_key',
    content,
    syntheticOnly: false,
    validated: false,
    calibrated: false,
  });

  return ok({
    item,
    typeCode: response.typeCode,
    domain: response.domain,
    difficulty: response.difficulty,
    ordinal: response.ordinal,
    uiRequirement,
    servedToken: signServedToken(
      {
        sessionId: response.sessionId,
        ordinal: response.ordinal,
        itemId: response.itemId,
        itemRevision: response.itemRevision,
        expiresAt: Date.now() + SERVED_TOKEN_TTL_MS,
      },
      d.env.tokenSecret,
    ),
    selection: response.selection,
  });
}

async function nextItem(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const sessionId = requirePathParam(request, 'sessionId');
  const d = deps();

  const loaded = await loadSession(d, sessionId, appId);
  if (loaded.session.status !== 'active') {
    return ok({
      available: false,
      reason: loaded.session.stopReason,
      sheet: await d.store.getCurrentSheet(sessionId),
    });
  }

  /**
   * A pending item is re-issued rather than replaced.
   *
   * An app that loses the response to `next` and calls it again must get the same question back. The
   * alternative silently burns an item from the pool and leaves an orphan row in the trace on every
   * dropped connection.
   */
  if (loaded.pending) {
    const item = await d.store.getItem(loaded.pending.typeCode, loaded.pending.itemId);
    if (!item) throw notFound(`item ${loaded.pending.itemId} is no longer in the registry`);
    const type = await d.store.getType(loaded.pending.typeCode);
    return servedPayload(d, loaded.pending, item.content, type?.uiRequirement ?? null);
  }

  const sheet = sheetFor(loaded);
  if (sheet.stopped) {
    await d.store.finishSession(
      sessionId,
      sheet.stopReason ?? 'item-cap',
      sheet.decision,
      new Date().toISOString(),
    );
    await d.store.putSheet(sheet, []);
    return ok({ available: false, reason: sheet.stopReason, sheet });
  }

  const ordinal = loaded.responses.length + 1;
  const baseRequest = selectionRequestFor(loaded, ordinal);
  const exposure = await d.store.exposureFor(
    appId,
    baseRequest.index.items.map((c) => c.itemId),
  );
  const recent = await personaRecentItems(d, loaded.session);

  const chosen = selectNext({ ...baseRequest, exposure, personaRecentItemIds: recent });

  if (!chosen) {
    // Discovered here, because this is the only place that asks the pool for something. Scoring never
    // has to reason about exhaustion.
    const exhausted = sheetFor(loaded, { poolExhausted: true });
    await d.store.finishSession(
      sessionId,
      exhausted.stopReason ?? 'bank-exhausted',
      exhausted.decision,
      new Date().toISOString(),
    );
    await d.store.putSheet(exhausted, []);
    return ok({ available: false, reason: exhausted.stopReason, sheet: exhausted });
  }

  const { candidate, trace } = chosen;
  const item = await d.store.getItem(candidate.typeCode, candidate.itemId);
  if (!item) throw notFound(`item ${candidate.itemId} is in the snapshot but not the registry`);

  const response: ResponseRecord = {
    sessionId,
    ordinal,
    state: 'served',
    itemId: candidate.itemId,
    itemRevision: candidate.itemRevision,
    typeCode: candidate.typeCode,
    domain: candidate.domain,
    difficulty: candidate.difficulty,
    params: candidate.params,
    optionCount: candidate.optionCount,
    rawResponse: null,
    correct: null,
    latencyMs: null,
    metrics: null,
    selection: trace,
    idempotencyKey: null,
    servedAt: new Date().toISOString(),
    answeredAt: null,
  };

  await d.store.putServedResponse(response);
  await d.store.incrementExposure(appId, candidate.itemId);

  const type = await d.store.getType(candidate.typeCode);
  return servedPayload(d, response, item.content, type?.uiRequirement ?? null);
}

export async function handler(event: Record<string, unknown>): Promise<ApiResponse> {
  return handle(event, async (request) => {
    if (request.method === 'POST') return createSession(request);
    return nextItem(request);
  });
}
