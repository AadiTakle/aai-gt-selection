import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CRITERIA_V1 } from '@platform/domain';
import { clearSnapshotCache, configureSnapshotSource, deps } from '@platform/shared';
import { computeSheet, toEngineConfig, type TraceEntry } from '@platform/scoring';

/**
 * Replay one session answer by answer, and report the question at which it became decidable.
 *
 * A stored sheet only says where a session ended up. This says *when* it got there, which is the difference
 * between "was that enough" and "how much of it was necessary". It is read-only: nothing is written back.
 *
 * Run: npm run replay:session <sessionId>
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
  process.env.GT_TOKEN_SECRET ??= 'local';
  clearSnapshotCache();
  configureSnapshotSource(async (_b, key) =>
    readFileSync(join(SNAPSHOT_DIR, key.replace(/^snapshots\//, ''))),
  );

  const sessionId = process.argv[2];
  if (!sessionId) {
    console.log('usage: npm run replay:session <sessionId>');
    return;
  }

  const d = deps();
  const { loadSession } = await import('../functions/shared/src/session-service.js');
  const loaded = await loadSession(d, sessionId, 'app-bramblebrook');
  const { session, answered, index, appApprovedTypes } = loaded;
  const servable = index.items.filter((i) => appApprovedTypes.has(i.typeCode));
  const config = toEngineConfig(session.resolvedConfig, session.ageBand);

  const byId = new Map(index.items.map((i) => [i.itemId, i]));
  const trace: TraceEntry[] = [];
  let decidedAt: number | null = null;

  console.log(`\nreplaying ${sessionId}`);
  console.log(`cut theta ${config.abilityThreshold}, budget ${config.precision.minItems}-${config.precision.maxItems}\n`);
  console.log('  q   type               ok   ability   90% interval        p(above)  verdict');

  for (const [i, r] of answered.entries()) {
    const candidate = byId.get(r.itemId);
    trace.push({
      ordinal: i + 1,
      itemId: r.itemId,
      typeCode: r.typeCode,
      domain: candidate?.domain ?? 'fluid',
      difficulty: r.difficulty,
      params: r.params,
      correct: r.correct,
      latencyMs: r.latencyMs ?? null,
      rawResponse: null,
      flags: r.flags ?? [],
    });

    const sheet = computeSheet({
      sessionId,
      snapshotId: session.snapshotId,
      config,
      criteria: CRITERIA_V1,
      trace,
      candidates: index.items,
      servable,
      itemsServed: trace.length,
      computedAt: '2026-08-12T00:00:00.000Z',
    });
    const c = sheet.composite;
    if (sheet.stopped && decidedAt === null) decidedAt = i + 1;
    console.log(
      `  ${String(i + 1).padStart(2)}  ${r.typeCode.padEnd(18)} ${r.correct === true ? ' + ' : r.correct === false ? ' - ' : ' ? '} ${c.mean.toFixed(2).padStart(6)}   [${c.interval[0].toFixed(2)}, ${c.interval[1].toFixed(2)}]`.padEnd(66) +
        `  ${(c.pAboveThreshold * 100).toFixed(1).padStart(5)}%   ${sheet.stopped ? `STOP: ${sheet.stopReason} → ${sheet.decision}` : ''}`,
    );
  }

  console.log(`\nanswered: ${answered.length}`);
  console.log(
    decidedAt === null
      ? '  no determination reached; more questions needed'
      : `  determination reached at question ${decidedAt}, so ${answered.length - decidedAt} of the ${answered.length} were surplus`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
