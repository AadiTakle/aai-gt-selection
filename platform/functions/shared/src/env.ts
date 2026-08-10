/**
 * Runtime configuration, read once and validated loudly.
 *
 * A Lambda that starts with a missing table name and only discovers it on the first request fails in
 * the middle of a child's session. Reading everything at module load turns that into a cold-start
 * failure the deployment sees.
 */

export interface PlatformEnv {
  readonly tableName: string;
  readonly answerKeyTableName: string;
  readonly personaTableName: string;
  readonly snapshotBucket: string;
  readonly tokenSecret: string;
  readonly rescoreQueueUrl: string | null;
  /** Set only in tests, pointing at DynamoDB Local. */
  readonly endpoint: string | null;
  readonly region: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing required environment variable ${name}`);
  return value;
}

export function readEnv(): PlatformEnv {
  return {
    tableName: required('GT_TABLE_NAME'),
    answerKeyTableName: required('GT_ANSWER_KEY_TABLE_NAME'),
    personaTableName: required('GT_PERSONA_TABLE_NAME'),
    snapshotBucket: process.env.GT_SNAPSHOT_BUCKET ?? '',
    tokenSecret: required('GT_TOKEN_SECRET'),
    rescoreQueueUrl: process.env.GT_RESCORE_QUEUE_URL ?? null,
    endpoint: process.env.GT_DDB_ENDPOINT ?? null,
    region: process.env.AWS_REGION ?? 'us-east-1',
  };
}
