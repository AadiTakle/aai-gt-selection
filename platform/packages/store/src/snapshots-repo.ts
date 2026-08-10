import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { SessionRecord, SnapshotRecord } from '@platform/domain';

import { queryAll, scanAll, type RepoContext } from './client.js';
import { GSI5, META_SK, SNAPSHOT_PK_PREFIX, gsi5Pk, snapshotPk, stripKeys } from './keys.js';

/**
 * Published catalog snapshots.
 *
 * The registry is the mutable authoring surface; a snapshot is the immutable thing a session pins,
 * so publishing cannot alter a session in flight. This row is the metadata — the selection index
 * itself lives in S3, because a serving function wants it as one object it can cache in module
 * scope rather than as several thousand rows.
 */

/**
 * Spec section 6.1 classes a snapshot as write-once, but this is an unconditional put.
 *
 * Section 10 requires publishing to be idempotent, and a conditional put would turn a retried
 * publish of identical input into a failure. Uniqueness is enforced upstream instead, by snapshot
 * ids being monotonic (`snap-<yyyymmdd>-<nnn>`): a second publish gets a new id rather than
 * overwriting an old one. The weakness is honest — nothing here stops a caller from deliberately
 * rewriting a snapshot under its existing id.
 */
export async function putSnapshot(ctx: RepoContext, s: SnapshotRecord): Promise<void> {
  await ctx.doc.send(
    new PutCommand({
      TableName: ctx.tableName,
      Item: { ...s, PK: snapshotPk(s.snapshotId), SK: META_SK },
    }),
  );
}

export async function getSnapshot(
  ctx: RepoContext,
  snapshotId: string,
): Promise<SnapshotRecord | null> {
  const got = await ctx.doc.send(
    new GetCommand({
      TableName: ctx.tableName,
      Key: { PK: snapshotPk(snapshotId), SK: META_SK },
    }),
  );
  return got.Item ? stripKeys<SnapshotRecord>(got.Item) : null;
}

/**
 * The newest snapshot, for an app that pins nothing.
 *
 * A scan, for the same reason `listTypes` is one: spec section 6.3 provides no index over snapshots
 * and each sits in its own partition. Snapshots are published rarely and read at cold start, so the
 * cost is bounded — but a "latest pointer" row would remove the scan entirely and is the obvious
 * change if publishing ever becomes frequent.
 *
 * Ordering is by snapshot id, which is monotonic by construction, with `createdAt` as the
 * tiebreaker for ids that sort equal.
 */
export async function latestSnapshot(ctx: RepoContext): Promise<SnapshotRecord | null> {
  const rows = await scanAll(ctx.doc, {
    TableName: ctx.tableName,
    FilterExpression: 'SK = :meta AND begins_with(PK, :prefix)',
    ExpressionAttributeValues: { ':meta': META_SK, ':prefix': SNAPSHOT_PK_PREFIX },
  });
  const snapshots = rows.map((row) => stripKeys<SnapshotRecord>(row));
  if (snapshots.length === 0) return null;
  return snapshots.sort((a, b) => {
    const byId = a.snapshotId.localeCompare(b.snapshotId);
    return byId !== 0 ? byId : a.createdAt.localeCompare(b.createdAt);
  })[snapshots.length - 1] as SnapshotRecord;
}

/**
 * Every session pinned to a snapshot: the blast radius of a bad publish.
 *
 * Not a `PlatformStore` method, because the method list in the implementation plan has no reader for
 * `GSI5`. It is exported at package level so the index the schema declares has something that reads
 * it, and so a handler that needs to answer "what did this publish affect" does not have to invent
 * its own query.
 */
export async function sessionsForSnapshot(
  ctx: RepoContext,
  snapshotId: string,
  limit?: number,
): Promise<readonly string[]> {
  const rows = await queryAll(
    ctx.doc,
    {
      TableName: ctx.tableName,
      IndexName: GSI5,
      KeyConditionExpression: 'GSI5PK = :pk',
      ExpressionAttributeValues: { ':pk': gsi5Pk(snapshotId) },
    },
    limit,
  );
  return rows.map((row) => stripKeys<SessionRecord>(row).sessionId);
}
