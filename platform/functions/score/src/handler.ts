import { createHash } from 'node:crypto';
import { CRITERIA_V1, type OutboxEvent, type ScoreSheet } from '@platform/domain';
import {
  badRequest,
  conflict,
  deps,
  forbidden,
  handle,
  loadSession,
  notFound,
  ok,
  parseJsonBody,
  requireAppId,
  requirePathParam,
  sheetFor,
  verifyServedToken,
  type ApiRequest,
  type ApiResponse,
  type Deps,
} from '@platform/shared';
import { TokenError } from '@platform/shared';
import { markAgainstKey } from './mark.js';

/**
 * Marking a response and updating the sheet.
 *
 * The only function on the request path with read access to the answer-key table. It never trusts the
 * client about which item is being answered: `serve` signed that, and this verifies the signature.
 *
 * The sheet is rebuilt from the whole trace on every call rather than updated incrementally. That
 * costs two posterior updates per prior response — microseconds — and buys the property that a
 * historical recompute runs this same derivation, so a backfill cannot drift from what production did.
 */

interface SubmitBody {
  readonly servedToken: string;
  readonly response: unknown;
  readonly latencyMs?: number;
  readonly metrics?: Record<string, unknown>;
}

/**
 * The outbox event for a session that has crossed the bar.
 *
 * The id is derived from the session and the criteria version rather than generated, so a mass
 * rescore that re-qualifies the same session collapses onto the same event and a family is not told
 * twice. That is the whole reason a deterministic id is worth the loss of a random one.
 */
function qualificationEvents(sheet: ScoreSheet, previous: ScoreSheet | null): OutboxEvent[] {
  if (!sheet.meetsCriteria) return [];
  if (previous?.meetsCriteria && previous.criteriaVersion === sheet.criteriaVersion) return [];

  const eventId = createHash('sha256')
    .update(`${sheet.sessionId}:${sheet.criteriaVersion}:qualified`)
    .digest('hex')
    .slice(0, 32);

  return [
    {
      eventId,
      kind: 'session-qualified',
      sessionId: sheet.sessionId,
      criteriaVersion: sheet.criteriaVersion,
      occurredAt: sheet.computedAt,
      payload: {
        engineVersion: sheet.engineVersion,
        snapshotId: sheet.snapshotId,
        itemsScored: sheet.composite.itemsScored,
        pAboveThreshold: sheet.composite.pAboveThreshold,
        decision: sheet.decision,
      },
    },
  ];
}

async function submit(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const sessionId = requirePathParam(request, 'sessionId');
  const d = deps();
  const body = parseJsonBody<SubmitBody>(request);

  if (!body.servedToken) throw badRequest('servedToken is required');

  let claims;
  try {
    claims = verifyServedToken(body.servedToken, d.env.tokenSecret);
  } catch (error) {
    if (error instanceof TokenError) throw forbidden(error.message);
    throw error;
  }
  // A token is valid only for the session it was issued against, so one cannot be carried across.
  if (claims.sessionId !== sessionId) throw forbidden('served token is for another session');

  const loaded = await loadSession(d, sessionId, appId);
  const served = loaded.responses.find((r) => r.ordinal === claims.ordinal);
  if (!served) throw notFound(`session ${sessionId} has no item at ordinal ${claims.ordinal}`);
  if (served.itemId !== claims.itemId) throw forbidden('served token does not match the trace');

  /**
   * Marking happens before the conditional write, and the conditional write is what makes a retry
   * safe. A duplicate submission fails the condition and returns the sheet already computed, rather
   * than folding the same evidence into the posterior a second time.
   */
  const key = await d.answerKeys.get(served.itemId, served.itemRevision);
  const correct = key ? markAgainstKey(key.correctKey, body.response) : null;

  const outcome = await d.store.completeResponse(sessionId, claims.ordinal, {
    rawResponse: body.response ?? null,
    correct,
    latencyMs: typeof body.latencyMs === 'number' ? body.latencyMs : 0,
    metrics: body.metrics ?? null,
    idempotencyKey: request.headers['idempotency-key'] ?? null,
    answeredAt: new Date().toISOString(),
  });

  if (outcome === 'already-answered') {
    const existing = await d.store.getCurrentSheet(sessionId);
    if (!existing) throw conflict('response was already answered but no sheet exists');
    return ok({ sheet: existing, stopped: existing.stopped, replayed: true });
  }

  const previous = await d.store.getCurrentSheet(sessionId);
  const after = await loadSession(d, sessionId, appId);
  const sheet = sheetFor(after);

  await d.store.putSheet(sheet, qualificationEvents(sheet, previous));

  if (sheet.stopped) {
    await d.store.finishSession(
      sessionId,
      sheet.stopReason ?? 'item-cap',
      sheet.decision,
      new Date().toISOString(),
    );
  }

  return ok({
    sheet,
    stopped: sheet.stopped,
    stopReason: sheet.stopReason,
    decision: sheet.decision,
    // Whether another question exists is `next`'s question to answer, not this one's.
    next: { available: !sheet.stopped },
    replayed: false,
  });
}

async function abandon(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const sessionId = requirePathParam(request, 'sessionId');
  const d = deps();

  const loaded = await loadSession(d, sessionId, appId);
  if (loaded.session.status !== 'active') {
    return ok({ sheet: await d.store.getCurrentSheet(sessionId), alreadyClosed: true });
  }

  const sheet = sheetFor(loaded, { abandoned: true });
  await d.store.putSheet(sheet, qualificationEvents(sheet, await d.store.getCurrentSheet(sessionId)));
  await d.store.finishSession(sessionId, 'abandoned', sheet.decision, new Date().toISOString());

  return ok({ sheet, alreadyClosed: false });
}

async function readSheet(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const sessionId = requirePathParam(request, 'sessionId');
  const d = deps();

  // Loaded rather than read straight from the sheet row, because this also enforces that the session
  // belongs to the calling app.
  const loaded = await loadSession(d, sessionId, appId);
  const stored = await d.store.getCurrentSheet(sessionId);
  if (!stored) throw notFound(`no sheet for session ${sessionId}`);

  return ok({
    sheet: stored,
    // A sheet that has fallen behind its trace is a bug worth surfacing rather than hiding, and the
    // reconciliation is one comparison.
    staleAgainstTrace: stored.derivedFromResponseCount !== loaded.answered.length,
    criteriaVersion: CRITERIA_V1.version,
  });
}

export async function handler(event: Record<string, unknown>): Promise<ApiResponse> {
  return handle(event, async (request) => {
    if (request.path.endsWith('/abandon')) return abandon(request);
    if (request.method === 'GET') return readSheet(request);
    return submit(request);
  });
}

export { qualificationEvents, type Deps };
