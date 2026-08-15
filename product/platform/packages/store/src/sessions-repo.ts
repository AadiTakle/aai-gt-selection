import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Decision, ResponseRecord, SessionRecord, StopReason } from '@platform/domain';

import { isConditionalCheckFailed, queryAll, type RepoContext } from './client.js';
import {
  GSI1,
  GSI2,
  GSI3,
  META_SK,
  RESPONSE_SK_PREFIX,
  gsi1Pk,
  gsi1Sk,
  gsi2Pk,
  gsi2Sk,
  gsi3Pk,
  gsi3Sk,
  gsi5Pk,
  gsi5Sk,
  responseSk,
  sessionPk,
  stripKeys,
} from './keys.js';

/**
 * Sessions and the append-only trace of responses beneath them.
 *
 * The trace is the authority. A score sheet is a materialised view that can always be rebuilt from
 * these rows, which is why scoring and historical recompute are the same function and why a
 * corrected item difficulty can be propagated through every session that ever saw the item.
 */

export interface ServedSessionOrdinal {
  readonly sessionId: string;
  readonly ordinal: number;
}

export interface ResponsePatch {
  readonly rawResponse: unknown;
  readonly correct: boolean | null;
  readonly latencyMs: number;
  readonly metrics: Record<string, unknown> | null;
  /** Markers the engine attached while grading, `rapid-guess` being the one that exists today. */
  readonly flags: readonly string[];
  readonly idempotencyKey: string | null;
  readonly answeredAt: string;
}

/**
 * Write the session header.
 *
 * Three index projections ride along. `GSI2` is written only when a persona is known, which keeps
 * anonymous sessions out of the persona history index entirely rather than gathering them under a
 * placeholder partition. `GSI3` buckets by the month the session started, so a busy app spreads
 * across partitions instead of concentrating on one. `GSI5` is what answers "which sessions used
 * this snapshot" after a bad publish.
 *
 * `GSI6`, the network-linkage hint of spec section 12.1, is not written: a `SessionRecord` carries
 * no address hash and this signature takes nothing else. The index exists and is empty.
 */
export async function putSession(ctx: RepoContext, s: SessionRecord): Promise<void> {
  await ctx.doc.send(
    new PutCommand({
      TableName: ctx.tableName,
      Item: {
        ...s,
        PK: sessionPk(s.sessionId),
        SK: META_SK,
        GSI2PK: s.personaId === null ? undefined : gsi2Pk(s.personaId),
        GSI2SK: s.personaId === null ? undefined : gsi2Sk(s.startedAt, s.sessionId),
        GSI3PK: gsi3Pk(s.appId, s.startedAt),
        GSI3SK: gsi3Sk(s.startedAt, s.sessionId),
        GSI5PK: gsi5Pk(s.snapshotId),
        GSI5SK: gsi5Sk(s.sessionId),
      },
    }),
  );
}

export async function getSession(
  ctx: RepoContext,
  sessionId: string,
): Promise<SessionRecord | null> {
  const got = await ctx.doc.send(
    new GetCommand({ TableName: ctx.tableName, Key: { PK: sessionPk(sessionId), SK: META_SK } }),
  );
  return got.Item ? stripKeys<SessionRecord>(got.Item) : null;
}

/**
 * Close a session.
 *
 * The status follows the stop reason rather than being passed separately, because the two cannot
 * legally disagree: a session that stopped because the child walked away is abandoned, and anything
 * else that stops is stopped.
 */
export async function finishSession(
  ctx: RepoContext,
  sessionId: string,
  stopReason: StopReason,
  decision: Decision | null,
  at: string,
): Promise<void> {
  await ctx.doc.send(
    new UpdateCommand({
      TableName: ctx.tableName,
      Key: { PK: sessionPk(sessionId), SK: META_SK },
      UpdateExpression:
        'SET #status = :status, #stopReason = :stopReason, #decision = :decision, #endedAt = :at',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#stopReason': 'stopReason',
        '#decision': 'decision',
        '#endedAt': 'endedAt',
      },
      ExpressionAttributeValues: {
        ':status': stopReason === 'abandoned' ? 'abandoned' : 'stopped',
        ':stopReason': stopReason,
        ':decision': decision,
        ':at': at,
      },
    }),
  );
}

/**
 * Point an already-open session at a different slice of the pool.
 *
 * Bramblebrook is why this exists. Each station is one battery, and a keeper walks between them across many
 * visits, so "which types may be served" is a property of *where the child is standing right now* and not of
 * the session. Freezing it at creation forced a new session per station, which restarted the estimate every
 * time and meant the interval never narrowed — the exact flaw one-session-per-keeper was meant to remove.
 *
 * This deliberately does not touch `resolvedConfig`, which stays frozen for the session's whole life. The
 * distinction is worth being precise about: `resolvedConfig` holds the rules a child is *measured* under, and
 * changing those mid-session would mean two halves of one trace judged by different standards. Restricted
 * types only narrow which items may be drawn, and every item drawn is scored the same way regardless. One is a
 * measurement rule and the other is a pool filter.
 *
 * Conditioned on the session still being active, so a stopped session cannot be reopened by retargeting it.
 */
export async function retargetSession(
  ctx: RepoContext,
  sessionId: string,
  restrictedTypes: readonly string[] | null,
): Promise<boolean> {
  try {
    await ctx.doc.send(
      new UpdateCommand({
        TableName: ctx.tableName,
        Key: { PK: sessionPk(sessionId), SK: META_SK },
        UpdateExpression: 'SET #restrictedTypes = :types',
        ConditionExpression: 'attribute_exists(PK) AND #status = :active',
        ExpressionAttributeNames: { '#restrictedTypes': 'restrictedTypes', '#status': 'status' },
        ExpressionAttributeValues: {
          ':types': restrictedTypes === null ? null : [...restrictedTypes],
          ':active': 'active',
        },
      }),
    );
    return true;
  } catch (err) {
    if (isConditionalCheckFailed(err)) return false;
    throw err;
  }
}

/**
 * Write the response row at serve time, in `served` state.
 *
 * Two things fall out of writing this before the child has answered. Abandonment becomes visible
 * instead of invisible, since a row that never leaves `served` is a question that was shown and
 * never answered. And the `GSI1` projection lands here, so the backfill query in spec section 11.1
 * finds every session that saw an item whether or not the child finished.
 */
export async function putServedResponse(ctx: RepoContext, r: ResponseRecord): Promise<void> {
  await ctx.doc.send(
    new PutCommand({
      TableName: ctx.tableName,
      Item: {
        ...r,
        PK: sessionPk(r.sessionId),
        SK: responseSk(r.ordinal),
        GSI1PK: gsi1Pk(r.itemId),
        GSI1SK: gsi1Sk(r.sessionId, r.ordinal),
      },
    }),
  );
}

/**
 * The idempotency guarantee, spec section 8.1.
 *
 * A conditional update on `state = 'served'` is the whole mechanism. A retried submission — a
 * flaky network, an impatient double tap, an at-least-once queue — fails the condition and is told
 * so, rather than counting the same evidence into the posterior twice. The difference between a
 * retry being harmless and a retry silently corrupting an ability estimate is this one expression.
 *
 * Honest limitation: a response that was never served fails the same condition and is reported as
 * `already-answered`. The two are indistinguishable without a second read, and the caller's next
 * step — return the stored result — is safe in both cases.
 */
export async function completeResponse(
  ctx: RepoContext,
  sessionId: string,
  ordinal: number,
  patch: ResponsePatch,
): Promise<'applied' | 'already-answered'> {
  try {
    await ctx.doc.send(
      new UpdateCommand({
        TableName: ctx.tableName,
        Key: { PK: sessionPk(sessionId), SK: responseSk(ordinal) },
        UpdateExpression:
          'SET #state = :answered, #rawResponse = :rawResponse, #correct = :correct, ' +
          '#latencyMs = :latencyMs, #metrics = :metrics, #flags = :flags, ' +
          '#idempotencyKey = :idempotencyKey, #answeredAt = :answeredAt',
        ConditionExpression: '#state = :served',
        ExpressionAttributeNames: {
          '#state': 'state',
          '#rawResponse': 'rawResponse',
          '#correct': 'correct',
          '#latencyMs': 'latencyMs',
          '#metrics': 'metrics',
          '#flags': 'flags',
          '#idempotencyKey': 'idempotencyKey',
          '#answeredAt': 'answeredAt',
        },
        ExpressionAttributeValues: {
          ':answered': 'answered',
          ':served': 'served',
          ':rawResponse': patch.rawResponse,
          ':correct': patch.correct,
          ':latencyMs': patch.latencyMs,
          ':metrics': patch.metrics,
          ':flags': patch.flags,
          ':idempotencyKey': patch.idempotencyKey,
          ':answeredAt': patch.answeredAt,
        },
      }),
    );
    return 'applied';
  } catch (err) {
    if (isConditionalCheckFailed(err)) return 'already-answered';
    throw err;
  }
}

export async function getResponse(
  ctx: RepoContext,
  sessionId: string,
  ordinal: number,
): Promise<ResponseRecord | null> {
  const got = await ctx.doc.send(
    new GetCommand({
      TableName: ctx.tableName,
      Key: { PK: sessionPk(sessionId), SK: responseSk(ordinal) },
    }),
  );
  return got.Item ? stripKeys<ResponseRecord>(got.Item) : null;
}

/** The full trace, in the order it was served. Four-digit ordinals are what makes that true. */
export async function listResponses(
  ctx: RepoContext,
  sessionId: string,
): Promise<readonly ResponseRecord[]> {
  const rows = await queryAll(ctx.doc, {
    TableName: ctx.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': sessionPk(sessionId), ':prefix': RESPONSE_SK_PREFIX },
  });
  return rows.map((row) => stripKeys<ResponseRecord>(row));
}

/**
 * Every session that ever served an item, with the ordinal it was served at.
 *
 * This is the query the item-correction backfill is built on (spec section 11.1). Correcting a
 * difficulty is only defensible if every session that saw the item can be found and rescored, and
 * finding them by scanning the trace would make the correction cost proportional to the whole
 * table rather than to the item.
 */
export async function sessionsForItem(
  ctx: RepoContext,
  itemId: string,
): Promise<readonly ServedSessionOrdinal[]> {
  const rows = await queryAll(ctx.doc, {
    TableName: ctx.tableName,
    IndexName: GSI1,
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': gsi1Pk(itemId) },
  });
  return rows.map((row) => {
    const r = stripKeys<ResponseRecord>(row);
    return { sessionId: r.sessionId, ordinal: r.ordinal };
  });
}

/**
 * A persona's sessions, newest first.
 *
 * Newest first because both callers want recency: the serving engine avoids items this child saw in
 * their last couple of sessions, and an operator looking at a persona wants the latest attempt.
 */
export async function sessionsForPersona(
  ctx: RepoContext,
  personaId: string,
  limit?: number,
): Promise<readonly string[]> {
  const rows = await queryAll(
    ctx.doc,
    {
      TableName: ctx.tableName,
      IndexName: GSI2,
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': gsi2Pk(personaId) },
      ScanIndexForward: false,
    },
    limit,
  );
  return rows.map((row) => stripKeys<SessionRecord>(row).sessionId);
}

/** One app's sessions for one month. The bucket accepts `2026-08` or `202608`. */
export async function sessionsForApp(
  ctx: RepoContext,
  appId: string,
  yyyymm: string,
  limit?: number,
): Promise<readonly string[]> {
  const rows = await queryAll(
    ctx.doc,
    {
      TableName: ctx.tableName,
      IndexName: GSI3,
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: { ':pk': gsi3Pk(appId, yyyymm) },
      ScanIndexForward: false,
    },
    limit,
  );
  return rows.map((row) => stripKeys<SessionRecord>(row).sessionId);
}
