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

/**
 * NO `tokenSecret`, and the deleted requirement is worth a note.
 *
 * This required `GT_TOKEN_SECRET` and nothing ever read the value. It was left over from the served-token
 * design that was removed when the pending response row became the binding instead. The infra dutifully created
 * a Secrets Manager secret, granted four functions read on it, and passed its ARN as `GT_TOKEN_SECRET_ARN` —
 * which is not the name the code demanded, so every deployed function failed at cold start with
 * "missing required environment variable GT_TOKEN_SECRET" and the authorizer denied every request as 403.
 *
 * It could not be caught locally, because every local entry point sets `GT_TOKEN_SECRET` to a literal. The
 * variable existed precisely so that the check would pass, which meant the check protected nothing and hid a
 * name mismatch until the first real deployment.
 */
export function readEnv(): PlatformEnv {
  return {
    tableName: required('GT_TABLE_NAME'),
    answerKeyTableName: required('GT_ANSWER_KEY_TABLE_NAME'),
    personaTableName: required('GT_PERSONA_TABLE_NAME'),
    snapshotBucket: process.env.GT_SNAPSHOT_BUCKET ?? '',
    rescoreQueueUrl: process.env.GT_RESCORE_QUEUE_URL ?? null,
    endpoint: process.env.GT_DDB_ENDPOINT ?? null,
    region: process.env.AWS_REGION ?? 'us-east-1',
  };
}
