import { createHash } from 'node:crypto';
import type { AnswerRequest, AnswerResponse } from '@gt/qbank/wire';
import { CRITERIA_V1, type OutboxEvent, type ScoreSheet } from '@platform/domain';
import { toQbankState } from '@platform/scoring';
import {
  conflict,
  deps,
  handle,
  loadSession,
  notFound,
  ok,
  parseJsonBody,
  requireAppId,
  requirePathParam,
  sheetFor,
  type ApiRequest,
  type ApiResponse,
} from '@platform/shared';
import { markAgainstKey } from './mark.js';

/**
 * Marking a response and updating the sheet.
 *
 * The only function on the request path with read access to the answer-key table.
 *
 * ## Why there is no token
 *
 * An earlier version signed the served item and made the client carry the signature, because the client
 * said which item it was answering and that claim could not be trusted. The trace is held server-side, so
 * the response row already in `served` state *is* that binding — the client is not asked which item it
 * answered and could not usefully lie about it. The wire contract has no such field, and it turns out not to
 * need one.
 *
 * ## Why the sheet is rebuilt every time
 *
 * Rebuilt from the whole trace rather than updated incrementally. That costs a posterior replay per call,
 * which is microseconds, and buys the property that a historical recompute runs this same derivation — so a
 * backfill cannot drift from what production did.
 */

/**
 * The outbox event for a session that has crossed the bar.
 *
 * The id is derived from the session and the criteria version rather than generated, so a mass rescore that
 * re-qualifies the same session collapses onto the same event and a family is not told twice.
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
        // Which route cleared, because "on quantitative alone" is a different claim to a family than
        // "on the composite".
        passRoute: sheet.passRoute,
      },
    },
  ];
}

async function answer(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const sessionId = requirePathParam(request, 'sessionId');
  const d = deps();
  const body = parseJsonBody<AnswerRequest>(request);

  const loaded = await loadSession(d, sessionId, appId);
  const served = loaded.pending;

  /**
   * Nothing pending, which the token used to distinguish and this has to recover.
   *
   * With a signed token the client carried the ordinal, so a retry after a lost response could be matched to
   * its row and answered from storage. Without it, a retry and a stray answer look identical: both find no
   * pending row. Returning 409 for both would make a dropped connection cost a client its answer, which is
   * the wrong trade for a screener a child is sitting.
   *
   * So: a session that has answered something treats this as a replay and returns what it already decided,
   * which is idempotent and cannot move the posterior. A session that has answered nothing has genuinely
   * been asked to mark an item it never served, and that is a 409 rather than an invented ordinal.
   */
  if (!served) {
    const last = loaded.answered[loaded.answered.length - 1];
    if (!last) {
      throw conflict('this session has no item awaiting an answer', {
        hint: 'call next before answer',
      });
    }
    const existing = await d.store.getCurrentSheet(sessionId);
    if (!existing) throw conflict('nothing is pending and no sheet exists');
    const replayed: AnswerResponse = {
      state: toQbankState(existing),
      correct: last.correct,
      difficulty: last.difficulty,
    };
    return ok(replayed);
  }

  /**
   * Marking happens before the conditional write, and the conditional write is what makes a retry safe. A
   * duplicate submission fails the condition and returns the sheet already computed, rather than folding the
   * same evidence into the posterior a second time.
   */
  const key = await d.answerKeys.get(served.itemId, served.itemRevision);
  const correct = key ? markAgainstKey(key, body.response) : null;

  const outcome = await d.store.completeResponse(sessionId, served.ordinal, {
    rawResponse: body.response ?? null,
    correct,
    latencyMs: typeof body.latencyMs === 'number' ? body.latencyMs : 0,
    metrics: null,
    idempotencyKey: request.headers['idempotency-key'] ?? null,
    answeredAt: new Date().toISOString(),
  });

  if (outcome === 'already-answered') {
    const existing = await d.store.getCurrentSheet(sessionId);
    if (!existing) throw conflict('response was already answered but no sheet exists');
    const replayed: AnswerResponse = {
      state: toQbankState(existing),
      correct: served.correct,
      difficulty: served.difficulty,
    };
    return ok(replayed);
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

  /**
   * `correct` crosses to the calling app, as the contract specifies.
   *
   * The contract's own note is the right one: an app putting this in front of a child should think twice,
   * because every item in the catalogue declines to report correctness on purpose. Sending null instead
   * would be worse than trusting the app — the contract uses null for "could not be marked", which is not
   * the same claim and must stay distinguishable.
   */
  const response: AnswerResponse = {
    state: toQbankState(sheet),
    correct,
    difficulty: served.difficulty,
  };
  return ok(response);
}

async function abandon(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const sessionId = requirePathParam(request, 'sessionId');
  const d = deps();

  const loaded = await loadSession(d, sessionId, appId);
  if (loaded.session.status !== 'active') {
    const stored = await d.store.getCurrentSheet(sessionId);
    return ok({ state: stored ? toQbankState(stored) : null, alreadyClosed: true });
  }

  const sheet = sheetFor(loaded, { abandoned: true });
  await d.store.putSheet(sheet, qualificationEvents(sheet, await d.store.getCurrentSheet(sessionId)));
  await d.store.finishSession(sessionId, 'abandoned', sheet.decision, new Date().toISOString());

  return ok({ state: toQbankState(sheet), alreadyClosed: false });
}

/**
 * The platform's own sheet route, outside the bank contract.
 *
 * The contract has no equivalent: its `state` rides along with every answer, and `debug` is an operator
 * view. This exists because the platform stores sheets and an app needs to read one back without answering
 * anything — after a reload, or to show a result screen.
 */
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
    state: toQbankState(stored),
    // A sheet that has fallen behind its trace is a bug worth surfacing rather than hiding.
    staleAgainstTrace: stored.derivedFromResponseCount !== loaded.answered.length,
    criteriaVersion: CRITERIA_V1.version,
  });
}

export async function handler(event: Record<string, unknown>): Promise<ApiResponse> {
  return handle(event, async (request) => {
    if (request.path.endsWith('/abandon')) return abandon(request);
    if (request.method === 'GET') return readSheet(request);
    return answer(request);
  });
}

export { qualificationEvents };
