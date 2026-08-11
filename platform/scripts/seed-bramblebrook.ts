import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { planFor } from '@gt/ui-contract';
import { DEFAULT_VARIETY_CONFIG, type AppConfig } from '@platform/domain';
import { deps, resetDeps } from '@platform/shared';
import { createRawClient, createTables } from '@platform/store';
import { publishCatalog } from '../functions/admin/src/publish.js';

/**
 * Put a catalogue and the Bramblebrook app into a local platform.
 *
 * A deployed platform with no catalogue and no registered app serves 404s to everything meaningful, and there
 * was no way to get either in. This is that way, for local development; the same operations exist as admin
 * routes for a deployed stack.
 *
 * Idempotent: publishing unchanged banks writes no new types and no new item revisions, and re-running reuses
 * the app if one is already registered under the same name. The api key is the exception and cannot be — it is
 * stored only as a digest, so a re-run issues a new one rather than recovering the old.
 *
 * Run: npm run seed:bramblebrook
 */

const BRAMBLEBROOK_TYPES = [
  // Nonverbal, drawn as the coat wall
  'FLU-MATRIX-01',
  'FLU-CARPET-01',
  // Quantitative, drawn as the tide ledge
  'QUANT-SERIES-01',
  'QUANT-FUNC-01',
  'QUANT-BALANCE-01',
  // Verbal, drawn as the day's log. Servable only since the numeric-key fix: both address options by
  // position and carry no letter, so a loader requiring a string key excluded them from every pool.
  'VER-SORTBOT-01',
  'VER-RELPAIR-01',
] as const;

/**
 * Bramblebrook's screening budget, and why it is not the burst length.
 *
 * A burst at a station is about four questions, and that is a pacing decision the game makes. This is the
 * whole screening, across every visit a keeper makes, because one session per keeper is what lets the interval
 * narrow.
 *
 * 24 rather than 16. The single-domain pass route needs six scored items in the clearing domain before the
 * platform will act on it, and a 16-item session over three batteries leaves each about five — so the route
 * the game is shaped around could never fire and every keeper would be judged on the composite alone. 24
 * gives roughly eight per battery.
 */
const MAX_ITEMS = 24;

const DATA_DIR = join(import.meta.dirname, '..', '..', 'screener', 'data', 'sanctuary');
const KEY_FILE = join(DATA_DIR, 'platform-app.json');
const SNAPSHOT_DIR = join(DATA_DIR, 'snapshots');

function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

const config = {
  tableName: env('GT_TABLE_NAME', 'gt-platform-local'),
  answerKeyTableName: env('GT_ANSWER_KEY_TABLE_NAME', 'gt-answer-keys-local'),
  personaTableName: env('GT_PERSONA_TABLE_NAME', 'gt-personas-local'),
  endpoint: env('GT_DDB_ENDPOINT', 'http://127.0.0.1:8456'),
  region: env('AWS_REGION', 'us-east-1'),
};

async function main(): Promise<void> {
  process.env.AWS_ACCESS_KEY_ID ??= 'local';
  process.env.AWS_SECRET_ACCESS_KEY ??= 'local';
  process.env.AWS_REGION = config.region;
  process.env.GT_TABLE_NAME = config.tableName;
  process.env.GT_ANSWER_KEY_TABLE_NAME = config.answerKeyTableName;
  process.env.GT_PERSONA_TABLE_NAME = config.personaTableName;
  process.env.GT_DDB_ENDPOINT = config.endpoint;
  process.env.GT_TOKEN_SECRET ??= 'local-development-only';
  process.env.GT_SNAPSHOT_BUCKET = 'local';
  resetDeps();

  console.log(`tables in ${config.endpoint}`);
  await createTables(createRawClient({ endpoint: config.endpoint, region: config.region }), config);

  const d = deps();

  /**
   * Snapshots go to disk rather than S3.
   *
   * The serving function reads a snapshot through an injectable fetcher precisely so that local development
   * needs no bucket. Same bytes, same gzip, same checksum.
   */
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const published = await publishCatalog(d, {
    publishedBy: 'seed-bramblebrook',
    notes: 'Local development catalogue.',
    putObject: async (key, body) => {
      const target = join(SNAPSHOT_DIR, key.replace(/^snapshots\//, ''));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, body);
    },
  });

  console.log(
    `catalogue ${published.snapshotId}: ${published.typesWritten} types written, ` +
      `${published.typesSkipped} already present, ${published.itemsWritten} items, ` +
      `${published.itemsRevised} revised, ${published.answerKeysWritten} keys`,
  );
  console.log(`  stats: ${JSON.stringify(published.stats)}`);

  // Sanity: the seven verbs must actually be servable, or the game has nothing to draw.
  const missing: string[] = [];
  for (const typeCode of BRAMBLEBROOK_TYPES) {
    const type = await d.store.getType(typeCode);
    if (!type || type.scorableCount === 0) missing.push(typeCode);
  }
  if (missing.length > 0) {
    throw new Error(`these types have nothing servable, so the game cannot draw them: ${missing.join(', ')}`);
  }

  /**
   * What the app must be able to render, derived rather than declared.
   *
   * `planFor` is the reverse of the approval check: it reports the union of UI elements the seven types
   * demand, which is exactly what the app has to claim. Writing the list by hand would let it drift from the
   * types and would make the approval check tautological.
   */
  const required = planFor([...BRAMBLEBROOK_TYPES]).union;
  console.log(`ui capabilities required by the seven verbs: ${required.elements.join(', ')}`);
  console.log(`reading band demanded: ${String(required.readingBand)}`);

  const existingKey = existsSync(KEY_FILE)
    ? (JSON.parse(readFileSync(KEY_FILE, 'utf8')) as { appId?: string })
    : {};
  const existing = existingKey.appId ? await d.store.getApp(existingKey.appId) : null;

  const app: AppConfig = existing ?? {
    appId: 'app-bramblebrook',
    name: 'Bramblebrook',
    surfaceKind: 'game',
    status: 'active',
    abilityThreshold: 1.0,
    // A game surface carries the most construct-irrelevant variance, so it recommends most generously.
    recommendProbability: 0.3,
    precision: {
      confidenceAbove: 0.75,
      confidenceBelow: 0.97,
      minItems: 12,
      maxItems: MAX_ITEMS,
    },
    // Light coverage rather than a floor of six: selection distributes across batteries on its own, and
    // forcing six each would make every session at least eighteen items before it could stop.
    perDomainMinimum: 2,
    ageBands: [],
    uiCapabilities: [...required.elements],
    // Every one of the seven demands no reading, which is what makes the game usable by a child who cannot
    // yet read reliably. Stating 'none' keeps it that way as types are added.
    maxReadingBand: 'none',
    allowSyntheticItems: true,
    pinnedSnapshotId: null,
    variety: DEFAULT_VARIETY_CONFIG,
    // Pseudonymous keepers. A persona carries ability between visits and needs no contact details.
    piiPolicy: 'none',
    retentionDays: 365,
    webhookUrl: null,
    ownerContact: '',
    createdAt: new Date().toISOString(),
  };
  await d.store.putApp(app);
  console.log(`app ${app.appId} (${app.name}), budget ${app.precision.maxItems} items per keeper`);

  for (const typeCode of BRAMBLEBROOK_TYPES) {
    await d.store.setApprovedType(app.appId, typeCode, true, 'seed-bramblebrook');
  }
  const approved = await d.store.listApprovedTypes(app.appId);
  console.log(`approved ${approved.length} types: ${approved.join(', ')}`);

  const apiKey = `gtk_${randomBytes(24).toString('base64url')}`;
  await d.store.putApiKey(app.appId, createHash('sha256').update(apiKey).digest('hex'), 'seed');

  const snapshot = await d.store.latestSnapshot();
  writeFileSync(
    KEY_FILE,
    `${JSON.stringify(
      {
        appId: app.appId,
        apiKey,
        snapshotId: snapshot?.snapshotId ?? null,
        snapshotFile: snapshot ? join(SNAPSHOT_DIR, snapshot.s3Key.replace(/^snapshots\//, '')) : null,
        note: 'Local development only. The key is stored as a digest, so this file is the only copy.',
      },
      null,
      2,
    )}\n`,
  );
  console.log(`\napi key written to ${KEY_FILE}`);
  console.log('that file is the only copy: the platform keeps a digest and cannot return it.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

export { BRAMBLEBROOK_TYPES, MAX_ITEMS };
