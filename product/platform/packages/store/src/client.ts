import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  type QueryCommandInput,
  type ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';

/**
 * One place that decides how this package talks to DynamoDB.
 *
 * Everything goes through `DynamoDBDocumentClient` rather than the low-level client so that repo
 * code writes plain JavaScript objects and never `{ S: '...' }` attribute-value wrappers. The cost
 * is that control-plane commands (`CreateTable`) need the raw client, which `schema.ts` takes
 * explicitly.
 */

export interface ClientOptions {
  /** Set to reach DynamoDB Local. Absent in a deployed function, where the region is the endpoint. */
  readonly endpoint?: string;
  readonly region?: string;
}

/**
 * The three tables, named by the caller.
 *
 * Names are injected rather than derived so that a test can create throwaway tables and a deployed
 * function can read its own from the environment. The answer-key and persona tables are separate
 * for the IAM reasons in spec section 4.1, not for scale.
 */
export interface StoreConfig extends ClientOptions {
  readonly tableName: string;
  readonly answerKeyTableName: string;
  readonly personaTableName: string;
}

const DEFAULT_REGION = 'us-east-1';

/**
 * A local endpoint means DynamoDB Local, which authenticates nothing but still requires the SDK to
 * produce a signature. Without these placeholders the credential provider chain runs, finds no
 * profile and no instance metadata, and the first call fails after a timeout that looks like a
 * network problem rather than a configuration one.
 *
 * The condition is deliberately on `endpoint` rather than on an environment flag: a deployed
 * function never sets an endpoint, so it can never pick up a fake credential by accident.
 */
export function createRawClient(opts: ClientOptions): DynamoDBClient {
  if (opts.endpoint) {
    return new DynamoDBClient({
      endpoint: opts.endpoint,
      region: opts.region ?? DEFAULT_REGION,
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    });
  }
  return new DynamoDBClient(opts.region ? { region: opts.region } : {});
}

export function createDocumentClient(opts: ClientOptions): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(createRawClient(opts), {
    marshallOptions: {
      /**
       * Domain records use `null` for absent values, never `undefined`, so nothing meaningful is
       * dropped here. What this does remove is the sparse index attributes, which are built as
       * `undefined` when a row does not belong in an index — and an absent attribute is exactly
       * what makes a sparse GSI sparse. An empty string would put the row in the index.
       */
      removeUndefinedValues: true,
      convertClassInstanceToMap: false,
    },
    unmarshallOptions: {
      /** Numbers come back as JS numbers. Every stored number here is well inside double range. */
      wrapNumbers: false,
    },
  });
}

/** What a repo module needs: a client and the table it writes to. */
export interface RepoContext {
  readonly doc: DynamoDBDocumentClient;
  readonly tableName: string;
}

type Row = Record<string, unknown>;

/**
 * Query every page.
 *
 * DynamoDB paginates at 1 MB regardless of `Limit`, so a single-page read is a correctness bug
 * waiting for the table to grow. `limit` here means "stop once this many rows are in hand", which
 * is what the callers that take a `limit` argument actually want.
 */
export async function queryAll(
  doc: DynamoDBDocumentClient,
  input: QueryCommandInput,
  limit?: number,
): Promise<Row[]> {
  const rows: Row[] = [];
  let startKey: Row | undefined;
  do {
    const page = await doc.send(
      new QueryCommand({ ...input, ExclusiveStartKey: startKey }),
    );
    for (const row of page.Items ?? []) rows.push(row as Row);
    startKey = page.LastEvaluatedKey as Row | undefined;
    if (limit !== undefined && rows.length >= limit) return rows.slice(0, limit);
  } while (startKey);
  return rows;
}

/**
 * Scan every page.
 *
 * Used only where spec section 6.3 declares no index for the access pattern — listing all types and
 * finding the latest snapshot. Both are small, cold, admin-side reads. Any use of this on a
 * request-serving path is a design error, not an optimisation opportunity.
 */
export async function scanAll(
  doc: DynamoDBDocumentClient,
  input: ScanCommandInput,
): Promise<Row[]> {
  const rows: Row[] = [];
  let startKey: Row | undefined;
  do {
    const page = await doc.send(new ScanCommand({ ...input, ExclusiveStartKey: startKey }));
    for (const row of page.Items ?? []) rows.push(row as Row);
    startKey = page.LastEvaluatedKey as Row | undefined;
  } while (startKey);
  return rows;
}

/**
 * Whether a rejected write failed its condition rather than failing outright.
 *
 * Matched by name because the SDK surfaces the same failure as a typed exception from a single
 * write and as a cancellation reason inside `TransactionCanceledException` from a transaction, and
 * an `instanceof` check would only catch the first.
 */
export function isConditionalCheckFailed(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const name = (err as { name?: unknown }).name;
  if (name === 'ConditionalCheckFailedException') return true;
  if (name !== 'TransactionCanceledException') return false;
  const reasons = (err as { CancellationReasons?: readonly { Code?: string }[] })
    .CancellationReasons;
  return (reasons ?? []).some((r) => r.Code === 'ConditionalCheckFailed');
}
