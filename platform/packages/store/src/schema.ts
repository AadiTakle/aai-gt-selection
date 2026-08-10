import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
  ResourceNotFoundException,
  type CreateTableCommandInput,
  type DynamoDBClient,
} from '@aws-sdk/client-dynamodb';

import type { StoreConfig } from './client.js';
import { GSI1, GSI2, GSI3, GSI4, GSI5, GSI6 } from './keys.js';

/**
 * The table shape, as code.
 *
 * This exists so that the integration tests and the CDK stack cannot disagree about the schema. The
 * tests create real tables from these definitions and query real indexes; the CDK test asserts the
 * synthesised template declares the same six index names against the same key attributes. A GSI
 * that is right in one place and wrong in the other is the failure this is meant to make
 * impossible.
 *
 * Not expressed here, because DynamoDB Local ignores them and only the deployed stack can hold
 * them: point-in-time recovery, the customer-managed KMS key on the persona table, and TTL
 * configuration. Those belong to task 8 and are asserted there.
 */

export interface IndexDefinition {
  readonly name: string;
  readonly partitionKey: string;
  readonly sortKey: string;
  readonly purpose: string;
}

/** Spec section 6.3, verbatim. Attribute names are the contract with `keys.ts`. */
export const MAIN_TABLE_INDEXES: readonly IndexDefinition[] = [
  {
    name: GSI1,
    partitionKey: 'GSI1PK',
    sortKey: 'GSI1SK',
    purpose: 'every session that served an item; the item-correction backfill',
  },
  {
    name: GSI2,
    partitionKey: 'GSI2PK',
    sortKey: 'GSI2SK',
    purpose: "a persona's session history and cross-session item avoidance",
  },
  {
    name: GSI3,
    partitionKey: 'GSI3PK',
    sortKey: 'GSI3SK',
    purpose: 'per-app operations, month-bucketed',
  },
  {
    name: GSI4,
    partitionKey: 'GSI4PK',
    sortKey: 'GSI4SK',
    purpose: 'sparse: sessions that crossed the criteria bar',
  },
  {
    name: GSI5,
    partitionKey: 'GSI5PK',
    sortKey: 'GSI5SK',
    purpose: 'sessions pinned to a snapshot; blast radius of a bad publish',
  },
  {
    name: GSI6,
    partitionKey: 'GSI6PK',
    sortKey: 'GSI6SK',
    purpose: 'weak network-linkage hint, never an identity',
  },
];

/** The main table's TTL attribute. Outbox rows carry it; nothing else does. */
export const TTL_ATTRIBUTE = 'ttl';

function stringKeySchema(partitionKey: string, sortKey: string) {
  return {
    KeySchema: [
      { AttributeName: partitionKey, KeyType: 'HASH' as const },
      { AttributeName: sortKey, KeyType: 'RANGE' as const },
    ],
    AttributeDefinitions: [
      { AttributeName: partitionKey, AttributeType: 'S' as const },
      { AttributeName: sortKey, AttributeType: 'S' as const },
    ],
  };
}

function mainTableInput(tableName: string): CreateTableCommandInput {
  const base = stringKeySchema('PK', 'SK');
  return {
    TableName: tableName,
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: base.KeySchema,
    AttributeDefinitions: [
      ...base.AttributeDefinitions,
      ...MAIN_TABLE_INDEXES.flatMap((ix) => [
        { AttributeName: ix.partitionKey, AttributeType: 'S' as const },
        { AttributeName: ix.sortKey, AttributeType: 'S' as const },
      ]),
    ],
    GlobalSecondaryIndexes: MAIN_TABLE_INDEXES.map((ix) => ({
      IndexName: ix.name,
      KeySchema: [
        { AttributeName: ix.partitionKey, KeyType: 'HASH' as const },
        { AttributeName: ix.sortKey, KeyType: 'RANGE' as const },
      ],
      /**
       * Projecting everything keeps a reader from having to know which attributes an index
       * carries, at the cost of storing each indexed row twice. Narrowing this is a cost decision
       * that needs real row sizes to make, and section 11.1's backfill query wants the whole
       * response row anyway.
       */
      Projection: { ProjectionType: 'ALL' as const },
    })),
  };
}

/** `gt-answer-keys`: `PK=ITEM#<itemId>`, `SK=REV#<revision>`. Spec section 6.4. */
function answerKeyTableInput(tableName: string): CreateTableCommandInput {
  const base = stringKeySchema('PK', 'SK');
  return {
    TableName: tableName,
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: base.KeySchema,
    AttributeDefinitions: base.AttributeDefinitions,
  };
}

/** `gt-personas`: the only table holding PII, and in the deployed stack the only one with its own key. */
function personaTableInput(tableName: string): CreateTableCommandInput {
  const base = stringKeySchema('PK', 'SK');
  return {
    TableName: tableName,
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: base.KeySchema,
    AttributeDefinitions: base.AttributeDefinitions,
  };
}

export function tableInputs(cfg: StoreConfig): readonly CreateTableCommandInput[] {
  return [
    mainTableInput(cfg.tableName),
    answerKeyTableInput(cfg.answerKeyTableName),
    personaTableInput(cfg.personaTableName),
  ];
}

async function waitActive(client: DynamoDBClient, tableName: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const described = await client.send(new DescribeTableCommand({ TableName: tableName }));
    if (described.Table?.TableStatus === 'ACTIVE') return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`table ${tableName} did not become ACTIVE`);
}

/**
 * Create all three tables, tolerating tables that already exist.
 *
 * Used by the integration tests and by anything that needs a local environment. Never called from a
 * Lambda: in a deployed system the tables are CDK-owned and a function that can create a table can
 * also create one with the wrong indexes.
 */
export async function createTables(client: DynamoDBClient, cfg: StoreConfig): Promise<void> {
  for (const input of tableInputs(cfg)) {
    try {
      await client.send(new CreateTableCommand(input));
    } catch (err) {
      if (!(err instanceof ResourceInUseException)) throw err;
    }
    await waitActive(client, input.TableName as string);
  }
}

export async function deleteTables(client: DynamoDBClient, cfg: StoreConfig): Promise<void> {
  for (const name of [cfg.tableName, cfg.answerKeyTableName, cfg.personaTableName]) {
    try {
      await client.send(new DeleteTableCommand({ TableName: name }));
    } catch (err) {
      if (!(err instanceof ResourceNotFoundException)) throw err;
    }
  }
}
