import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadBanks } from '@gt/qbank/server';
import { clearSnapshotCache, configureSnapshotSource, deps } from '@platform/shared';

/**
 * For one session: what the child sent, what the key was, and how it was marked.
 *
 * Written because the owner said they had answered everything correctly and the trace said otherwise. That is
 * exactly the claim worth checking rather than explaining away: if the marking disagrees with the answer key
 * then every ability number this platform has produced is noise, and no amount of correct psychometrics
 * downstream would show it.
 *
 * Run: npm run audit:marking <sessionId>
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
  configureSnapshotSource(async (_b, key) =>
    readFileSync(join(SNAPSHOT_DIR, key.replace(/^snapshots\//, ''))),
  );

  const sessionId = process.argv[2];
  if (!sessionId) {
    console.log('usage: npm run audit:marking <sessionId>');
    return;
  }

  const d = deps();
  const responses = await d.store.listResponses(sessionId);
  const answered = responses.filter((r) => r.state === 'answered');

  const keyOf = new Map<string, unknown>();
  const optionsOf = new Map<string, unknown>();
  for (const bank of loadBanks().values()) {
    for (const r of bank.scorable) {
      keyOf.set(r.itemId, r.answer.correctKey);
      const content = r.content as { options?: unknown };
      optionsOf.set(r.itemId, content.options);
    }
  }

  console.log(`\n${answered.length} answered in ${sessionId}\n`);
  console.log('  q   type                marked  sent                              key       options');
  let disagreements = 0;

  for (const [i, r] of answered.entries()) {
    const key = keyOf.get(r.itemId);
    const raw = r.rawResponse as Record<string, unknown> | null;
    const sent = raw
      ? `key=${JSON.stringify(raw.key)} idx=${JSON.stringify(raw.selectedIndex)}`
      : '(nothing stored)';
    const opts = optionsOf.get(r.itemId);
    const optCount = Array.isArray(opts) ? opts.length : '?';
    const optKeys = Array.isArray(opts)
      ? opts
          .map((o) => (o as { key?: unknown }).key)
          .filter((k) => k !== undefined)
          .join(',')
      : '';

    /**
     * The independent check. Marking a string key against what the child sent as `key`, and a numeric key
     * against `selectedIndex`, is what `scoreResponse` does — so agreeing with it here is not proof the rule is
     * right, but disagreeing would prove something is wrong.
     */
    const expect =
      typeof key === 'number'
        ? Number(raw?.selectedIndex) === key
        : String(raw?.key ?? '') === String(key ?? '');
    const agrees = expect === r.correct;
    if (!agrees) disagreements += 1;

    console.log(
      `  ${String(i + 1).padStart(2)}  ${r.typeCode.padEnd(18)} ${
        r.correct === true ? ' RIGHT' : r.correct === false ? ' wrong' : ' unmk '
      }  ${sent.padEnd(33)} ${JSON.stringify(key).padEnd(9)} ${optCount}${
        optKeys ? ` [${optKeys}]` : ''
      }${agrees ? '' : '   <-- MARKING DISAGREES WITH THE KEY'}`,
    );
  }

  console.log(
    `\n${disagreements === 0 ? 'Marking agrees with the answer key on every response.' : `${disagreements} response(s) marked against the key.`}`,
  );

  const byType = new Map<string, { n: number; ok: number }>();
  for (const r of answered) {
    const e = byType.get(r.typeCode) ?? { n: 0, ok: 0 };
    e.n += 1;
    if (r.correct === true) e.ok += 1;
    byType.set(r.typeCode, e);
  }
  console.log('\nby type');
  for (const [t, e] of [...byType].sort()) {
    console.log(`  ${t.padEnd(18)} ${e.ok}/${e.n}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
