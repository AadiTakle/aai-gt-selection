import type { TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import type { OutboxEvent } from '@platform/domain';

import { queryAll, type RepoContext } from './client.js';
import { OUTBOX_SK_PREFIX, dayBucket, outboxPk, outboxSk, stripKeys } from './keys.js';

/**
 * The transactional outbox, spec section 11.3.
 *
 * A mass rescore must not email the same family twice. The sheet write and the event write happen in
 * one transaction, so there is no window in which a family qualifies and nothing is queued, and no
 * window in which something is queued for a sheet that was never written. Streams then carry the
 * event onward.
 *
 * Deduplication is the event id's job, not this module's: the id is a hash of
 * `(sessionId, criteriaVersion, kind)`, so a redelivery and a re-rescore both write the same key and
 * collapse to one row.
 */

export type TransactItem = NonNullable<TransactWriteCommandInput['TransactItems']>[number];

/**
 * Events are operational, not evidence. Thirty days is long enough to debug a delivery failure and
 * short enough that the table does not accumulate a permanent second copy of every decision. The
 * durable record of what was decided is the score sheet history.
 */
export const OUTBOX_TTL_DAYS = 30;

function ttlFor(occurredAt: string): number {
  const at = Date.parse(occurredAt);
  const base = Number.isNaN(at) ? Date.now() : at;
  return Math.floor(base / 1000) + OUTBOX_TTL_DAYS * 24 * 60 * 60;
}

/** The write, as a transaction item, so a caller can bundle it with whatever caused it. */
export function outboxPutItem(ctx: RepoContext, event: OutboxEvent): TransactItem {
  return {
    Put: {
      TableName: ctx.tableName,
      Item: {
        ...event,
        PK: outboxPk(event.occurredAt),
        SK: outboxSk(event.eventId),
        ttl: ttlFor(event.occurredAt),
      },
    },
  };
}

/** Events for one day. The partition is day-bucketed, so a reader must name the day. */
export async function listOutbox(
  ctx: RepoContext,
  day: string,
): Promise<readonly OutboxEvent[]> {
  const rows = await queryAll(ctx.doc, {
    TableName: ctx.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': outboxPk(dayBucket(day)), ':prefix': OUTBOX_SK_PREFIX },
  });
  return rows.map((row) => stripKeys<OutboxEvent>(row));
}
