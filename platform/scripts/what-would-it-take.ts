import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { information, pCorrect } from '@gt/engine';
import { CRITERIA_V1 } from '@platform/domain';
import { clearSnapshotCache, configureSnapshotSource, deps } from '@platform/shared';
import { computeSheet, toEngineConfig, type TraceEntry } from '@platform/scoring';

/**
 * Given the questions one session was actually asked: how many would have had to be right to be recommended?
 *
 * Answers "why not me" with a number rather than a shrug. It replays the real trace with the real item
 * parameters and only the outcomes changed, so the difficulties are the ones that child actually met.
 *
 * Run: npm run what-if <sessionId>
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
    console.log('usage: npm run what-if <sessionId>');
    return;
  }

  const d = deps();
  const { loadSession } = await import('../functions/shared/src/session-service.js');
  const loaded = await loadSession(d, sessionId, 'app-bramblebrook');
  const { session, answered, index, appApprovedTypes } = loaded;
  const servable = index.items.filter((i) => appApprovedTypes.has(i.typeCode));
  const config = toEngineConfig(session.resolvedConfig, session.ageBand);
  const byId = new Map(index.items.map((i) => [i.itemId, i]));

  const base = answered.map((r, i) => ({
    ordinal: i + 1,
    itemId: r.itemId,
    typeCode: r.typeCode,
    domain: byId.get(r.itemId)?.domain ?? ('fluid' as const),
    difficulty: r.difficulty,
    params: r.params,
    correct: r.correct,
    latencyMs: r.latencyMs ?? null,
    rawResponse: null,
    flags: [] as string[],
  }));

  const sheetFrom = (trace: TraceEntry[]) =>
    computeSheet({
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

  const actual = sheetFrom(base as TraceEntry[]);
  const rightNow = base.filter((e) => e.correct === true).length;

  console.log(`\nthe ${base.length} questions actually asked, median difficulty ${
    [...base.map((e) => e.params.b)].sort((a, b) => a - b)[Math.floor(base.length / 2)]?.toFixed(2)
  } logits`);
  console.log(`cut theta ${config.abilityThreshold}, recommend at p(above) >= ${config.recommendProbability}\n`);
  console.log(`  as answered: ${rightNow}/${base.length} right -> ability ${actual.composite.mean.toFixed(2)}, p(above) ${(actual.composite.pAboveThreshold * 100).toFixed(1)}% -> ${actual.decision ?? 'no verdict yet'}`);

  /**
   * Turning the *most informative* misses into hits first.
   *
   * Which questions are made right matters as much as how many: a miss on a hard item costs more than a miss
   * on an easy one, so flipping in descending information order is the cheapest route to a recommendation and
   * therefore the honest lower bound on "how many would it have taken".
   */
  const missIdx = base
    .map((e, i) => ({ i, info: information(config.abilityThreshold, e.params) }))
    .filter(({ i }) => base[i]!.correct !== true)
    .sort((a, b) => b.info - a.info);

  console.log('\n  flipping the most informative misses to hits, one at a time:');
  let recommendedAt: number | null = null;
  for (let k = 1; k <= missIdx.length; k += 1) {
    const trace = base.map((e) => ({ ...e }));
    for (let j = 0; j < k; j += 1) trace[missIdx[j]!.i]!.correct = true;
    const sheet = sheetFrom(trace as TraceEntry[]);
    const p = sheet.composite.pAboveThreshold;
    const verdict = p >= config.recommendProbability ? 'RECOMMEND' : '';
    console.log(
      `    ${rightNow + k}/${base.length} right -> ability ${sheet.composite.mean.toFixed(2)}, p(above) ${(p * 100).toFixed(1)}%  ${verdict}`,
    );
    if (recommendedAt === null && p >= config.recommendProbability) recommendedAt = rightNow + k;
  }

  console.log(
    recommendedAt === null
      ? `\n  even answering all ${base.length} correctly does not reach the bar at these difficulties.`
      : `\n  ${recommendedAt} of ${base.length} would have been recommended, against ${rightNow} actually right.`,
  );

  console.log('\n  what each question asked of you, by difficulty:');
  for (const e of [...base].sort((a, b) => b.params.b - a.params.b)) {
    const chanceAtCut = pCorrect(config.abilityThreshold, e.params);
    console.log(
      `    ${e.typeCode.padEnd(18)} b=${e.params.b.toFixed(2)}  a child exactly at the cut gets this right ${(chanceAtCut * 100).toFixed(0)}% of the time  ${
        e.correct === true ? 'you: right' : e.correct === false ? 'you: wrong' : 'you: unmarked'
      }`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
