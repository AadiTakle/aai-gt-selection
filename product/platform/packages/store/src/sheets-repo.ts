import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { OutboxEvent, ScoreSheet } from '@platform/domain';

import { queryAll, type RepoContext } from './client.js';
import {
  GSI4,
  SHEET_CURRENT_SK,
  SHEET_SK_PREFIX,
  gsi4Pk,
  gsi4Sk,
  sheetHistorySk,
  sessionPk,
  stripKeys,
} from './keys.js';
import { outboxPutItem, type TransactItem } from './outbox-repo.js';

/**
 * Score sheets: one current row, an append-only history, and the outbox events they cause.
 *
 * The sheet is a materialised view over the trace and is stored for three reasons: a result screen
 * should be one read, a criteria query needs an indexable value, and "what did we tell this family,
 * and when" has to be answerable after a recompute changes a decision. The history row is what makes
 * the third one true.
 */

/**
 * DynamoDB caps a transaction at 100 items. Two rows are the sheet and its history, so 98 events fit
 * — far more than the one `session-qualified` event a sheet can currently produce. The guard exists
 * so that a future caller batching events discovers the limit here rather than in production.
 */
const TRANSACTION_ITEM_LIMIT = 100;

/**
 * Write the sheet, its history row, and one row per event, atomically.
 *
 * `Put` rather than `Update` on the current row is deliberate. A recompute that drops a session back
 * below the bar must remove it from `GSI4`, and a `Put` of an item without the index attributes does
 * that; an `Update` would leave the stale attributes behind and the session would stay in the
 * "newly qualified" query forever.
 *
 * The `GSI4` attributes are written only when the sheet meets the criteria, and are absent rather
 * than empty when it does not. That absence is what makes the index sparse, and the sparseness is
 * what makes "who newly qualified" a query instead of a scan over every sheet ever written.
 */
export async function putSheet(
  ctx: RepoContext,
  sheet: ScoreSheet,
  events: readonly OutboxEvent[],
): Promise<void> {
  const qualified = sheet.meetsCriteria
    ? {
        GSI4PK: gsi4Pk(sheet.criteriaVersion),
        GSI4SK: gsi4Sk(sheet.computedAt, sheet.sessionId),
      }
    : {};

  /**
   * A transaction cannot touch the same item twice, and a deterministic event id means a caller can
   * legitimately hand over the same event twice while assembling a batch. Collapsing duplicates here
   * matches what the id is for; rejecting them would turn an idempotent intent into an error.
   */
  const seen = new Set<string>();
  const eventItems: TransactItem[] = [];
  for (const event of events) {
    if (seen.has(event.eventId)) continue;
    seen.add(event.eventId);
    eventItems.push(outboxPutItem(ctx, event));
  }

  const items: TransactItem[] = [
    {
      Put: {
        TableName: ctx.tableName,
        Item: { ...sheet, PK: sessionPk(sheet.sessionId), SK: SHEET_CURRENT_SK, ...qualified },
      },
    },
    {
      Put: {
        TableName: ctx.tableName,
        Item: {
          ...sheet,
          PK: sessionPk(sheet.sessionId),
          SK: sheetHistorySk(sheet.computedAt),
        },
      },
    },
    ...eventItems,
  ];

  if (items.length > TRANSACTION_ITEM_LIMIT) {
    throw new Error(
      `putSheet would write ${items.length} rows in one transaction, over the limit of ` +
        `${TRANSACTION_ITEM_LIMIT}; batch the events`,
    );
  }

  await ctx.doc.send(new TransactWriteCommand({ TransactItems: items }));
}

export async function getCurrentSheet(
  ctx: RepoContext,
  sessionId: string,
): Promise<ScoreSheet | null> {
  const got = await ctx.doc.send(
    new GetCommand({
      TableName: ctx.tableName,
      Key: { PK: sessionPk(sessionId), SK: SHEET_CURRENT_SK },
    }),
  );
  return got.Item ? stripKeys<ScoreSheet>(got.Item) : null;
}

/**
 * Every sheet ever computed for a session, oldest first.
 *
 * The `SHEET#CURRENT` row shares the prefix and is filtered out here, because it is a duplicate of
 * whichever history row is newest and would otherwise appear twice.
 */
export async function listSheetHistory(
  ctx: RepoContext,
  sessionId: string,
): Promise<readonly ScoreSheet[]> {
  const rows = await queryAll(ctx.doc, {
    TableName: ctx.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': sessionPk(sessionId), ':prefix': SHEET_SK_PREFIX },
  });
  return rows
    .filter((row) => row.SK !== SHEET_CURRENT_SK)
    .map((row) => stripKeys<ScoreSheet>(row));
}

/**
 * Sessions that crossed the bar under one criteria version, oldest first.
 *
 * `since` filters on the sort key, which is `<decidedAt>#<sessionId>`, so a notifier can ask for
 * everything decided after its last watermark without reading what it has already seen.
 */
export async function qualifiedSessions(
  ctx: RepoContext,
  criteriaVersion: string,
  since?: string,
): Promise<readonly string[]> {
  const rows = await queryAll(ctx.doc, {
    TableName: ctx.tableName,
    IndexName: GSI4,
    KeyConditionExpression:
      since === undefined ? 'GSI4PK = :pk' : 'GSI4PK = :pk AND GSI4SK >= :since',
    ExpressionAttributeValues:
      since === undefined ? { ':pk': gsi4Pk(criteriaVersion) } : { ':pk': gsi4Pk(criteriaVersion), ':since': since },
  });
  return rows.map((row) => stripKeys<ScoreSheet>(row).sessionId);
}
