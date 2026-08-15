import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionRecord } from '@platform/domain';
import { clearSnapshotCache, configureSnapshotSource, deps } from '@platform/shared';
import { createDocumentClient } from '@platform/store';

/**
 * The full score sheet for one session, or for the largest session if none is named.
 *
 * `show-sessions` answers "which sessions exist and roughly where do they stand". This answers "what does the
 * instrument actually say about this child, and what would it still need to decide".
 *
 * Run: npm run show:sheet [sessionId]
 */

const SNAPSHOT_DIR = join(import.meta.dirname, '..', '..', 'screener', 'data', 'sanctuary', 'snapshots');

async function main(): Promise<void> {
  process.env.AWS_ACCESS_KEY_ID ??= 'local';
  process.env.AWS_SECRET_ACCESS_KEY ??= 'local';
  process.env.AWS_REGION ??= 'us-east-1';
  process.env.GT_DDB_ENDPOINT ??= 'http://127.0.0.1:8456';
  process.env.GT_TABLE_NAME ??= 'gt-platform-local';
  process.env.GT_ANSWER_KEY_TABLE_NAME ??= 'gt-answer-keys-local';
  process.env.GT_PERSONA_TABLE_NAME ??= 'gt-personas-local';
  process.env.GT_SNAPSHOT_BUCKET ??= 'local';
  clearSnapshotCache();
  configureSnapshotSource(async (_bucket, key) =>
    readFileSync(join(SNAPSHOT_DIR, key.replace(/\//g, '_'))),
  );

  const d = deps();
  const doc = createDocumentClient({
    endpoint: process.env.GT_DDB_ENDPOINT,
    region: process.env.AWS_REGION ?? 'us-east-1',
  });

  let target = process.argv[2] ?? null;
  if (!target) {
    // The session with the most answered responses, which is the only one worth reading.
    const found: { id: string; n: number }[] = [];
    let startKey: Record<string, unknown> | undefined;
    do {
      const page = await doc.send(
        new ScanCommand({
          TableName: process.env.GT_TABLE_NAME,
          FilterExpression: 'begins_with(SK, :sk) AND attribute_exists(sessionId)',
          ExpressionAttributeValues: { ':sk': 'META' },
          ExclusiveStartKey: startKey,
        }),
      );
      for (const s of (page.Items ?? []) as SessionRecord[]) {
        const rs = await d.store.listResponses(s.sessionId);
        found.push({ id: s.sessionId, n: rs.filter((r) => r.state === 'answered').length });
      }
      startKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (startKey);
    found.sort((a, b) => b.n - a.n);
    target = found[0]?.id ?? null;
  }
  if (!target) {
    console.log('no sessions found');
    return;
  }

  const session = await d.store.getSession(target);
  const sheet = await d.store.getCurrentSheet(target);
  const responses = await d.store.listResponses(target);
  const answered = responses.filter((r) => r.state === 'answered');
  if (!session || !sheet) {
    console.log(`no session or sheet for ${target}`);
    return;
  }

  const cfg = session.resolvedConfig;
  const cut = cfg.abilityThreshold;
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  const band = (e: { interval: readonly [number, number] }) =>
    `[${e.interval[0].toFixed(2)}, ${e.interval[1].toFixed(2)}]`;

  console.log(`\nsession ${target}`);
  console.log(`keeper  ${session.personaId ?? '(anonymous)'}`);
  console.log(`status  ${session.status}${session.stopReason ? ` (${session.stopReason})` : ''}`);
  console.log(`cut     theta ${cut} — the 95th percentile`);
  console.log(`budget  ${cfg.precision.minItems} to ${cfg.precision.maxItems} items`);

  console.log(`\nCOMPOSITE after ${answered.length} answered`);
  const c = sheet.composite;
  console.log(`  ability        ${c.mean.toFixed(2)} logits  (90% interval ${band(c)}, width ${(c.interval[1] - c.interval[0]).toFixed(2)})`);
  console.log(`  above the cut  ${pct(c.pAboveThreshold)}   — needs ${pct(cfg.recommendProbability)} to recommend`);
  console.log(`  scored ${c.itemsScored}, unscorable ${c.itemsUnscorable}, information ${c.informationAccumulated.toFixed(2)}`);

  console.log(`\nPER BATTERY`);
  for (const [name, e] of Object.entries(sheet.domains)) {
    if (e.itemsScored === 0 && e.itemsUnscorable === 0) {
      console.log(`  ${name.padEnd(13)} no items yet`);
      continue;
    }
    console.log(
      `  ${name.padEnd(13)} ${e.mean.toFixed(2)}  ${band(e).padEnd(16)} above cut ${pct(e.pAboveThreshold).padStart(4)}  n=${e.itemsScored}${e.itemsUnscorable ? ` (+${e.itemsUnscorable} unscorable)` : ''}`,
    );
  }

  console.log(`\nDECISION`);
  console.log(`  stopped        ${sheet.stopped ? `yes — ${sheet.stopReason}` : 'no, still gathering'}`);
  console.log(`  decision       ${sheet.decision ?? '(none yet)'}`);
  console.log(`  meets outreach criteria  ${sheet.meetsCriteria ? 'yes' : 'no'}`);
  if (sheet.passRoute) console.log(`  pass route     ${sheet.passRoute.via}`);

  const correct = answered.filter((r) => r.correct === true).length;
  const wrong = answered.filter((r) => r.correct === false).length;
  const unmarked = answered.filter((r) => r.correct === null).length;
  console.log(`\nWHAT WAS ANSWERED`);
  console.log(`  ${correct} right, ${wrong} wrong, ${unmarked} unscorable`);
  const byType = new Map<string, { n: number; ok: number }>();
  for (const r of answered) {
    const e = byType.get(r.typeCode) ?? { n: 0, ok: 0 };
    e.n += 1;
    if (r.correct === true) e.ok += 1;
    byType.set(r.typeCode, e);
  }
  for (const [t, e] of [...byType].sort()) {
    console.log(`  ${t.padEnd(18)} ${e.ok}/${e.n} right`);
  }
  const flagged = answered.filter((r) => (r.flags ?? []).length > 0);
  if (flagged.length > 0) {
    console.log(`  flagged: ${flagged.length} — ${[...new Set(flagged.flatMap((r) => r.flags ?? []))].join(', ')}`);
  }
  const bs = answered.map((r) => r.params.b);
  if (bs.length > 0) {
    console.log(
      `  difficulty served: median ${bs.sort((x, y) => x - y)[Math.floor(bs.length / 2)]!.toFixed(2)}, range ${Math.min(...bs).toFixed(2)} to ${Math.max(...bs).toFixed(2)} logits`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
