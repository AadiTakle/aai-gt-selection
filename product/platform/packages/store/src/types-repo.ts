import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { QuestionTypeRecord, TypeLifecycleEvent, TypeStatus } from '@platform/domain';

import { isConditionalCheckFailed, queryAll, scanAll, type RepoContext } from './client.js';
import {
  LIFECYCLE_SK_PREFIX,
  META_SK,
  TYPE_PK_PREFIX,
  lifecycleSk,
  stripKeys,
  typePk,
} from './keys.js';

/**
 * Question types: written once, never updated, and changed only by appending.
 *
 * There is no `updateType` here and there must never be one. Spec section 5.2 makes a type record
 * immutable because sessions cite the type they measured under, and a type whose definition can
 * change retroactively makes every past session uninterpretable. A change is a new record at the
 * next version in the family; a lifecycle transition is an appended event.
 */

export async function putType(ctx: RepoContext, t: QuestionTypeRecord): Promise<void> {
  try {
    await ctx.doc.send(
      new PutCommand({
        TableName: ctx.tableName,
        Item: { ...t, PK: typePk(t.typeCode), SK: META_SK },
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    );
  } catch (err) {
    if (isConditionalCheckFailed(err)) {
      throw new Error(
        `type ${t.typeCode} already exists and type records are write-once; ` +
          'a change is a new version in the same family (spec section 5.2)',
      );
    }
    throw err;
  }
}

export async function getType(
  ctx: RepoContext,
  typeCode: string,
): Promise<QuestionTypeRecord | null> {
  const got = await ctx.doc.send(
    new GetCommand({ TableName: ctx.tableName, Key: { PK: typePk(typeCode), SK: META_SK } }),
  );
  return got.Item ? stripKeys<QuestionTypeRecord>(got.Item) : null;
}

/**
 * Every type in the registry.
 *
 * This is a scan with a filter, because spec section 6.3 declares no index over "all types" and
 * each type sits in its own partition. It is acceptable at the current size — 53 types against a
 * table whose other rows are items and sessions — and only because the catalog function caches the
 * result. If the catalog read ever becomes hot, the fix is a collection row or a seventh index, not
 * a bigger page size.
 */
export async function listTypes(ctx: RepoContext): Promise<readonly QuestionTypeRecord[]> {
  const rows = await scanAll(ctx.doc, {
    TableName: ctx.tableName,
    FilterExpression: 'SK = :meta AND begins_with(PK, :prefix)',
    ExpressionAttributeValues: { ':meta': META_SK, ':prefix': TYPE_PK_PREFIX },
  });
  return rows
    .map((row) => stripKeys<QuestionTypeRecord>(row))
    .sort((a, b) => a.typeCode.localeCompare(b.typeCode));
}

export async function appendLifecycle(
  ctx: RepoContext,
  typeCode: string,
  status: TypeStatus,
  at: string,
  reason: string,
): Promise<void> {
  const event: TypeLifecycleEvent = { typeCode, status, at, reason };
  await ctx.doc.send(
    new PutCommand({
      TableName: ctx.tableName,
      Item: { ...event, PK: typePk(typeCode), SK: lifecycleSk(at) },
    }),
  );
}

export async function listLifecycle(
  ctx: RepoContext,
  typeCode: string,
): Promise<readonly TypeLifecycleEvent[]> {
  const rows = await queryAll(ctx.doc, {
    TableName: ctx.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': typePk(typeCode), ':prefix': LIFECYCLE_SK_PREFIX },
  });
  return rows.map((row) => stripKeys<TypeLifecycleEvent>(row));
}

/**
 * The newest lifecycle event's status, or `active` when a type has none.
 *
 * Defaulting to `active` rather than throwing treats "published, never transitioned" as the normal
 * case, which it is: the publish path writes a type record and no lifecycle event. The alternative
 * — requiring publish to write an opening `active` event — would make a missing event an error
 * state that the serving path has to handle mid-session.
 */
export async function currentStatus(ctx: RepoContext, typeCode: string): Promise<TypeStatus> {
  const rows = await queryAll(
    ctx.doc,
    {
      TableName: ctx.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': typePk(typeCode), ':prefix': LIFECYCLE_SK_PREFIX },
      ScanIndexForward: false,
      Limit: 1,
    },
    1,
  );
  const newest = rows[0];
  if (!newest) return 'active';
  return stripKeys<TypeLifecycleEvent>(newest).status;
}
