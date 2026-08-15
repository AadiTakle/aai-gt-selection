import { BatchGetCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type { RepoContext } from './client.js';
import { APP_SESSION_STAT_SK, appPk, itemStatSk } from './keys.js';

/**
 * The two counters exposure control runs on, spec section 9.2 layer 6.
 *
 * Exposure rate is `item.servedCount / app.sessionCount` for the app in question. Spreading bank
 * usage matters for item security, and it is also the only route to calibration: an item served
 * three times will never accumulate enough responses to estimate a difficulty from.
 *
 * Both counters are per-app. An item that is overexposed on a small Roblox front door is not
 * overexposed on a large web screener, and a global counter would damp the wrong one.
 */

/**
 * What selection needs to damp an overexposed item.
 *
 * Declared here rather than imported because `@platform/domain` does not carry it and this package
 * must not depend on `@platform/selection`. The shape is structurally identical to the
 * `ExposureSnapshot` that the selection package declares, so a value produced here is assignable
 * there without a conversion.
 */
export interface ExposureSnapshot {
  readonly sessionCount: number;
  readonly servedCounts: ReadonlyMap<string, number>;
}

/** DynamoDB caps a batch get at 100 keys. */
const BATCH_GET_LIMIT = 100;

function chunk<T>(xs: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

/**
 * Count one serve of one item for one app.
 *
 * An atomic `ADD` rather than a read-modify-write, because the serve path is concurrent by nature and
 * a lost increment understates exposure, which is the direction that hurts: it makes an overexposed
 * item look safe to serve again.
 */
export async function incrementExposure(
  ctx: RepoContext,
  appId: string,
  itemId: string,
): Promise<void> {
  await ctx.doc.send(
    new UpdateCommand({
      TableName: ctx.tableName,
      Key: { PK: appPk(appId), SK: itemStatSk(itemId) },
      UpdateExpression: 'SET #itemId = :itemId ADD #servedCount :one',
      ExpressionAttributeNames: { '#itemId': 'itemId', '#servedCount': 'servedCount' },
      ExpressionAttributeValues: { ':itemId': itemId, ':one': 1 },
    }),
  );
}

/** The denominator. Bumped once per session start, never per response. */
export async function bumpAppSessionCount(ctx: RepoContext, appId: string): Promise<void> {
  await ctx.doc.send(
    new UpdateCommand({
      TableName: ctx.tableName,
      Key: { PK: appPk(appId), SK: APP_SESSION_STAT_SK },
      UpdateExpression: 'ADD #sessionCount :one',
      ExpressionAttributeNames: { '#sessionCount': 'sessionCount' },
      ExpressionAttributeValues: { ':one': 1 },
    }),
  );
}

/**
 * Counters for a set of items, plus the app's session count.
 *
 * Items with no counter are simply absent from the map rather than present at zero, so a caller can
 * tell "never served" from "served zero times", and so the map stays proportional to what has
 * actually been served rather than to the size of the bank.
 */
export async function exposureFor(
  ctx: RepoContext,
  appId: string,
  itemIds: readonly string[],
): Promise<ExposureSnapshot> {
  const sessionRow = await ctx.doc.send(
    new GetCommand({
      TableName: ctx.tableName,
      Key: { PK: appPk(appId), SK: APP_SESSION_STAT_SK },
    }),
  );
  const sessionCount = Number(sessionRow.Item?.sessionCount ?? 0);

  const servedCounts = new Map<string, number>();
  const unique = [...new Set(itemIds)];
  for (const batch of chunk(unique, BATCH_GET_LIMIT)) {
    let keys = batch.map((itemId) => ({ PK: appPk(appId), SK: itemStatSk(itemId) }));
    while (keys.length > 0) {
      const got = await ctx.doc.send(
        new BatchGetCommand({ RequestItems: { [ctx.tableName]: { Keys: keys } } }),
      );
      for (const row of got.Responses?.[ctx.tableName] ?? []) {
        const itemId = row.itemId as string | undefined;
        if (itemId === undefined) continue;
        servedCounts.set(itemId, Number(row.servedCount ?? 0));
      }
      /** A batch get may decline part of the request under throttling; the unprocessed half is retried. */
      keys = (got.UnprocessedKeys?.[ctx.tableName]?.Keys ?? []) as typeof keys;
    }
  }

  return { sessionCount, servedCounts };
}
