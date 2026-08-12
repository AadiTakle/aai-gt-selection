import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { SessionRecord } from '@platform/domain';
import { deps } from '@platform/shared';
import { createDocumentClient } from '@platform/store';

/**
 * Close out a keeper's sessions so their next visit starts a fresh screening.
 *
 * Abandon rather than delete. The trace is the authority for everything the platform can say, and throwing one
 * away means a re-score after an item's difficulty is corrected silently skips a child who was measured on it.
 * Abandoned sessions are also what resumption already refuses, so this needs no new rule: the next station a
 * keeper walks up to opens a new session with a fresh prior.
 *
 * Run: npm run reset:keeper <personaId>          (or a session id, to reset just that one)
 */

async function main(): Promise<void> {
  process.env.AWS_ACCESS_KEY_ID ??= 'local';
  process.env.AWS_SECRET_ACCESS_KEY ??= 'local';
  process.env.AWS_REGION ??= 'us-east-1';
  process.env.GT_DDB_ENDPOINT ??= 'http://127.0.0.1:8456';
  process.env.GT_TABLE_NAME ??= 'gt-platform-local';
  process.env.GT_ANSWER_KEY_TABLE_NAME ??= 'gt-answer-keys-local';
  process.env.GT_PERSONA_TABLE_NAME ??= 'gt-personas-local';
  process.env.GT_SNAPSHOT_BUCKET ??= 'local';
  process.env.GT_TOKEN_SECRET ??= 'local';

  const target = process.argv[2];
  if (!target) {
    console.log('usage: npm run reset:keeper <personaId|sessionId>');
    return;
  }

  const d = deps();
  const doc = createDocumentClient({
    endpoint: process.env.GT_DDB_ENDPOINT,
    region: process.env.AWS_REGION ?? 'us-east-1',
  });

  let ids: string[];
  if (target.startsWith('sess-')) {
    ids = [target];
  } else {
    ids = [...(await d.store.sessionsForPersona(target))];
    if (ids.length === 0) {
      /**
       * The persona index only carries sessions that named a persona, so a keeper whose sessions predate the
       * persona link would look like it has none. Falling back to a paginated scan means "reset this keeper"
       * cannot silently reset nothing.
       */
      let startKey: Record<string, unknown> | undefined;
      const found: string[] = [];
      do {
        const page = await doc.send(
          new ScanCommand({
            TableName: process.env.GT_TABLE_NAME,
            FilterExpression: 'begins_with(SK, :sk) AND attribute_exists(sessionId) AND personaId = :p',
            ExpressionAttributeValues: { ':sk': 'META', ':p': target },
            ExclusiveStartKey: startKey,
          }),
        );
        for (const s of (page.Items ?? []) as SessionRecord[]) found.push(s.sessionId);
        startKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (startKey);
      ids = found;
    }
  }

  if (ids.length === 0) {
    console.log(`no sessions found for ${target}`);
    return;
  }

  let closed = 0;
  let already = 0;
  for (const id of ids) {
    const session = await d.store.getSession(id);
    if (!session) continue;
    if (session.status !== 'active') {
      already += 1;
      continue;
    }
    await d.store.finishSession(id, 'abandoned', null, new Date().toISOString());
    closed += 1;
    console.log(`  closed ${id}`);
  }

  console.log(
    `\n${closed} session(s) closed, ${already} already finished. The next station this keeper walks up to starts a new screening.`,
  );
  console.log('The traces are kept, so a later re-score still reaches these answers.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
