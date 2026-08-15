import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

/**
 * Find a DynamoDB Local that is really DynamoDB.
 *
 * The naive check — open a socket, or accept any HTTP response — is what made this necessary. Port
 * 8010 was contested on a developer machine by an ssh port-forward and a stray Python server, and a
 * client that connected happily then received `{"detail":"Method Not Allowed"}` and surfaced it as an
 * unparseable SDK error. So the probe issues an actual `ListTables` and only accepts an endpoint that
 * answers it.
 *
 * Candidates are tried in preference order: an explicit `GT_DDB_ENDPOINT`, then the loopback address
 * the start script publishes on.
 */

const DEFAULT_PORT = Number(process.env.GT_DDB_PORT ?? 8456);

function candidates(): readonly string[] {
  const explicit = process.env.GT_DDB_ENDPOINT;
  if (explicit) return [explicit];
  return [`http://127.0.0.1:${DEFAULT_PORT}`, `http://localhost:${DEFAULT_PORT}`];
}

export const LOCAL_CREDENTIALS = { accessKeyId: 'local', secretAccessKey: 'local' } as const;
export const LOCAL_REGION = 'us-east-1';

export async function resolveDdbEndpoint(): Promise<string | null> {
  for (const endpoint of candidates()) {
    const client = new DynamoDBClient({
      endpoint,
      region: LOCAL_REGION,
      credentials: LOCAL_CREDENTIALS,
      maxAttempts: 1,
    });
    try {
      await client.send(new ListTablesCommand({ Limit: 1 }));
      return endpoint;
    } catch {
      // Try the next candidate. A failure here means "not DynamoDB", not "DynamoDB is broken".
    } finally {
      client.destroy();
    }
  }
  return null;
}

export const SKIP_MESSAGE =
  'DynamoDB Local is not answering. Start it with: npm run ddb:start (from platform/)';
