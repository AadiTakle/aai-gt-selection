import { GetCommand, PutCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { AppConfig, ApprovedType } from '@platform/domain';

import { queryAll, type RepoContext } from './client.js';
import {
  APPROVED_TYPE_SK_PREFIX,
  META_SK,
  apiKeyLookupPk,
  apiKeySk,
  appPk,
  approvedTypeSk,
  stripKeys,
} from './keys.js';

/**
 * Apps: their configuration, the types they may serve, and the keys that identify them.
 *
 * An app config is mutable, but a session freezes the config it started under, so an edit here can
 * never change the rules a child is already being measured against.
 */

export interface ApiKeyRecord {
  readonly appId: string;
  readonly keyHash: string;
  readonly label: string;
  readonly createdAt: string;
}

export async function putApp(ctx: RepoContext, a: AppConfig): Promise<void> {
  await ctx.doc.send(
    new PutCommand({
      TableName: ctx.tableName,
      Item: { ...a, PK: appPk(a.appId), SK: META_SK },
    }),
  );
}

export async function getApp(ctx: RepoContext, appId: string): Promise<AppConfig | null> {
  const got = await ctx.doc.send(
    new GetCommand({ TableName: ctx.tableName, Key: { PK: appPk(appId), SK: META_SK } }),
  );
  return got.Item ? stripKeys<AppConfig>(got.Item) : null;
}

/**
 * Approve or revoke one type for one app.
 *
 * A row per type rather than a list on the config row, so that two administrators approving two
 * different types cannot overwrite each other, and so that a revocation is an edit to one small row
 * on a path that the serving function reads constantly.
 *
 * Revoking writes `enabled: false` rather than deleting, because "was approved and then was not" is
 * information a later audit of what a session could have served needs.
 */
export async function setApprovedType(
  ctx: RepoContext,
  appId: string,
  typeCode: string,
  enabled: boolean,
  by: string,
  now: string = new Date().toISOString(),
): Promise<void> {
  const row: ApprovedType = {
    appId,
    typeCode,
    enabled,
    approvedAt: now,
    approvedBy: by,
  };
  await ctx.doc.send(
    new PutCommand({
      TableName: ctx.tableName,
      Item: { ...row, PK: appPk(appId), SK: approvedTypeSk(typeCode) },
    }),
  );
}

export async function listApprovedTypes(
  ctx: RepoContext,
  appId: string,
): Promise<readonly string[]> {
  const rows = await queryAll(ctx.doc, {
    TableName: ctx.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': appPk(appId), ':prefix': APPROVED_TYPE_SK_PREFIX },
  });
  return rows
    .map((row) => stripKeys<ApprovedType>(row))
    .filter((row) => row.enabled)
    .map((row) => row.typeCode);
}

/**
 * Store a hashed key and its reverse lookup in one transaction.
 *
 * Only the SHA-256 of the key is ever stored, so a dump of this table does not yield a working
 * credential. The two rows are written together because an authorizer that can find a lookup row
 * with no matching key row — or the reverse — would either authenticate a revoked key or reject a
 * live one.
 */
export async function putApiKey(
  ctx: RepoContext,
  appId: string,
  keyHash: string,
  label: string,
  now: string = new Date().toISOString(),
): Promise<void> {
  const record: ApiKeyRecord = { appId, keyHash, label, createdAt: now };
  await ctx.doc.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: ctx.tableName,
            Item: { ...record, PK: appPk(appId), SK: apiKeySk(keyHash) },
          },
        },
        {
          Put: {
            TableName: ctx.tableName,
            Item: { ...record, PK: apiKeyLookupPk(keyHash), SK: META_SK },
          },
        },
      ],
    }),
  );
}

/**
 * Resolve a key hash to an app, or null.
 *
 * One `GetItem`, which is what makes this usable in an authorizer on every request. Whether the app
 * is allowed to proceed — status, quota — is the authorizer's decision, not this lookup's.
 */
export async function resolveApiKey(ctx: RepoContext, keyHash: string): Promise<string | null> {
  const got = await ctx.doc.send(
    new GetCommand({
      TableName: ctx.tableName,
      Key: { PK: apiKeyLookupPk(keyHash), SK: META_SK },
    }),
  );
  if (!got.Item) return null;
  return stripKeys<ApiKeyRecord>(got.Item).appId;
}
