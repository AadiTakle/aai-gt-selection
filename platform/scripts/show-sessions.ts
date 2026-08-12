import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { clearSnapshotCache, configureSnapshotSource, deps } from '@platform/shared';
import { createDocumentClient } from '@platform/store';
import type { SessionRecord } from '@platform/domain';

/**
 * Print every session in local storage with its score sheet.
 *
 * There is no adult-facing view for this yet — `/sanctuary/record` reports the gap rather than a stale number,
 * because no HTTP route exposed a keeper's history until now. This is the stopgap for looking at your own play.
 *
 * Run: npm run show:sessions
 */

const SNAPSHOT_DIR = join(
  import.meta.dirname,
  '..',
  '..',
  'screener',
  'data',
  'sanctuary',
  'snapshots',
);

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
  clearSnapshotCache();
  configureSnapshotSource(async (_bucket, key) =>
    readFileSync(join(SNAPSHOT_DIR, key.replace(/\//g, '_'))),
  );

  const d = deps();
  /**
   * A scan, deliberately. There is no access pattern for "every session" and there should not be one — the
   * table is designed around per-persona and per-item lookups. This is a local diagnostic over a handful of
   * rows, not something that belongs on a route.
   */
  const doc = createDocumentClient({
    endpoint: process.env.GT_DDB_ENDPOINT,
    region: process.env.AWS_REGION ?? 'us-east-1',
  });
  const sessions: SessionRecord[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    /**
     * Paginated, which a first version was not — and it silently lied.
     *
     * A filtered Scan applies the filter *after* reading a 1 MB page, and this table holds ~4,934 registry
     * items alongside a handful of sessions. One page never reached the session rows, so the script reported
     * two sessions out of thirteen and looked like it had worked.
     */
    const page = await doc.send(
      new ScanCommand({
        TableName: process.env.GT_TABLE_NAME,
        FilterExpression: 'begins_with(SK, :sk) AND attribute_exists(sessionId)',
        ExpressionAttributeValues: { ':sk': 'META' },
        ExclusiveStartKey: startKey,
      }),
    );
    sessions.push(...((page.Items ?? []) as SessionRecord[]));
    startKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (startKey);
  if (sessions.length === 0) {
    console.log('no sessions in local storage yet');
    return;
  }

  const byPersona = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const k = s.personaId ?? '(no keeper)';
    if (!byPersona.has(k)) byPersona.set(k, []);
    byPersona.get(k)!.push(s);
  }

  for (const [persona, list] of byPersona) {
    list.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    let answeredTotal = 0;
    console.log(`\nkeeper ${persona} — ${list.length} session(s)`);
    console.log('  started    items  composite, 90% interval    p(above cut)  decision');
    for (const s of list) {
      const responses = await d.store.listResponses(s.sessionId);
      const answered = responses.filter((r) => r.state === 'answered');
      answeredTotal += answered.length;
      const sheet = await d.store.getCurrentSheet(s.sessionId);
      const c = sheet?.composite;
      // The interval is the central 90% credible interval, in logits, as `[low, high]`.
      const interval = c ? `${c.mean.toFixed(2)} [${c.interval[0].toFixed(2)}, ${c.interval[1].toFixed(2)}]` : '—';
      const width = c ? (c.interval[1] - c.interval[0]).toFixed(2) : '—';
      const p = c ? `${(c.pAboveThreshold * 100).toFixed(0)}%`.padStart(11) : '          —';
      console.log(
        `  ${s.startedAt.slice(11, 19)}  ${String(answered.length).padStart(5)}  ${interval.padEnd(24)} ${p}  ${
          sheet?.decision ?? s.status
        }  (width ${width})`,
      );
    }
    console.log(`  ${answeredTotal} questions answered in total across those sessions`);
    if (list.length > 1) {
      console.log(
        `  NOTE: ${list.length} separate sessions means the estimate restarted each time rather than narrowing.`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
