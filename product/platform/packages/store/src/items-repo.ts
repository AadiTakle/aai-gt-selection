import { GetCommand, PutCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { RegistryItem } from '@platform/domain';

import { isConditionalCheckFailed, queryAll, type RepoContext } from './client.js';
import { ITEM_SK_PREFIX, itemRevisionSk, itemSk, stripKeys, typePk } from './keys.js';

/**
 * Items are revisioned, not immutable.
 *
 * The scenario this whole design is built around is a difficulty that turns out to be wrong, so an
 * item has to be able to change. What must not change is the record of what was served: every prior
 * state is preserved at `ITEMREV#<itemId>#<rev>` and every response stores the parameters it was
 * served under. Together those two facts are what let a recompute tell "this child got it wrong"
 * apart from "we later decided the item was harder".
 */

export type ItemPatch = Partial<
  Pick<RegistryItem, 'difficulty' | 'params' | 'validated' | 'calibrated'>
>;

/**
 * A preserved prior state, plus why it was superseded.
 *
 * The domain `RegistryItem` carries no audit fields, and adding them to the current row would mean
 * `getItem` no longer round-trips to the domain shape. The audit therefore attaches to the history
 * row, which is the thing the change actually created.
 */
export interface ItemRevisionRecord extends RegistryItem {
  readonly changeReason: string;
  readonly revisedAt: string;
}

export async function putItem(ctx: RepoContext, i: RegistryItem): Promise<void> {
  await ctx.doc.send(
    new PutCommand({
      TableName: ctx.tableName,
      Item: { ...i, PK: typePk(i.typeCode), SK: itemSk(i.itemId) },
    }),
  );
}

export async function getItem(
  ctx: RepoContext,
  typeCode: string,
  itemId: string,
): Promise<RegistryItem | null> {
  const got = await ctx.doc.send(
    new GetCommand({
      TableName: ctx.tableName,
      Key: { PK: typePk(typeCode), SK: itemSk(itemId) },
    }),
  );
  return got.Item ? stripKeys<RegistryItem>(got.Item) : null;
}

/**
 * Read a superseded state back.
 *
 * Not a `PlatformStore` method, because the method list in the implementation plan does not include
 * one and later tasks are written against that list. It is exported at package level because
 * "prior revisions remain readable" is a guarantee this package makes, and a guarantee no caller can
 * exercise is not a guarantee.
 */
export async function getItemRevision(
  ctx: RepoContext,
  typeCode: string,
  itemId: string,
  revision: number,
): Promise<ItemRevisionRecord | null> {
  const got = await ctx.doc.send(
    new GetCommand({
      TableName: ctx.tableName,
      Key: { PK: typePk(typeCode), SK: itemRevisionSk(itemId, revision) },
    }),
  );
  return got.Item ? stripKeys<ItemRevisionRecord>(got.Item) : null;
}

/**
 * The only mutation path for an item.
 *
 * Reads the current state, writes it unchanged to its history row, then writes the patched item at
 * the next revision — both in one transaction, so a crash cannot leave a revision number that no
 * history row explains. The condition on the current row's revision makes two concurrent revisions
 * of the same item fail the second rather than silently losing one.
 */
export async function reviseItem(
  ctx: RepoContext,
  typeCode: string,
  itemId: string,
  patch: ItemPatch,
  reason: string,
  now: string = new Date().toISOString(),
): Promise<RegistryItem> {
  const current = await getItem(ctx, typeCode, itemId);
  if (!current) throw new Error(`cannot revise unknown item ${itemId} of type ${typeCode}`);

  const history: ItemRevisionRecord = { ...current, changeReason: reason, revisedAt: now };
  const next: RegistryItem = { ...current, ...patch, revision: current.revision + 1 };

  try {
    await ctx.doc.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: ctx.tableName,
              Item: {
                ...history,
                PK: typePk(typeCode),
                SK: itemRevisionSk(itemId, current.revision),
              },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Put: {
              TableName: ctx.tableName,
              Item: { ...next, PK: typePk(typeCode), SK: itemSk(itemId) },
              ConditionExpression: '#revision = :expected',
              ExpressionAttributeNames: { '#revision': 'revision' },
              ExpressionAttributeValues: { ':expected': current.revision },
            },
          },
        ],
      }),
    );
  } catch (err) {
    if (isConditionalCheckFailed(err)) {
      throw new Error(
        `item ${itemId} changed while being revised from revision ${current.revision}; retry`,
      );
    }
    throw err;
  }
  return next;
}

/**
 * Current items for a type.
 *
 * `begins_with(SK, 'ITEM#')` excludes the history rows, whose prefix is `ITEMREV#`. The two
 * collections share the type's partition and are separated by nothing else.
 */
export async function listItemsForType(
  ctx: RepoContext,
  typeCode: string,
): Promise<readonly RegistryItem[]> {
  const rows = await queryAll(ctx.doc, {
    TableName: ctx.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': typePk(typeCode), ':prefix': ITEM_SK_PREFIX },
  });
  return rows.map((row) => stripKeys<RegistryItem>(row));
}
