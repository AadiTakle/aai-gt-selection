import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadBanks } from '@gt/qbank/server';
import { planFor } from '@gt/ui-contract';
import { CRITERIA_V1, DEFAULT_VARIETY_CONFIG, type AppConfig } from '@platform/domain';
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

/**
 * Items whose defect survives any presentation, and which this surface therefore will not serve.
 *
 * Only `VER-SORTBOT-01` contributes today, and the split is worth being exact about, because the pictorial
 * failure and this are two different problems that looked like one:
 *
 *   - **Synonym rules** ("words meaning truthful") frequently have more than one defensible answer. One item
 *     keys `veracious` while `honest` sits in the options and also means truthful; another keys `mitigate`
 *     while `soften` and `reduce` are both there. Rendering them as text does not help, because "honest is
 *     also truthful" is true in every medium. All of them are 6-8 band, so holding them back costs the pool
 *     nothing at grade level.
 *   - **Phonological rules** (rhyme, initial sound) are legible as text, so the presentation objection goes
 *     away — but rhyming is not categorical reasoning and does not belong in Verbal Classification. Withheld
 *     on construct grounds rather than on rendering.
 *
 * What is deliberately NOT withheld: the 73 items the glyph gate rejected. Those were unanswerable *as
 * pictures*, and this app now presents words, which is the whole point of the reading-band change above.
 * Withholding them too would keep the pool at 27 and leave the actual fix doing nothing.
 *
 * Derived rather than hardcoded, so authoring a new synonym item cannot quietly add a broken question.
 */
function withheldItems(): readonly string[] {
  const out: string[] = [];
  const bank = loadBanks().get('VER-SORTBOT-01');
  for (const record of bank?.scorable ?? []) {
    const rule = String(
      (record as { provenance?: { derivation?: { rule?: unknown } } }).provenance?.derivation?.rule ?? '',
    ).toLowerCase();
    const phonological = rule.includes('rhyme') || rule.includes('start') || rule.includes('sound');
    const synonym = rule.startsWith('words that mean') || rule.startsWith('words meaning');
    if (phonological || synonym) out.push(record.itemId);
  }
  return out;
}

async function main(): Promise<void> {
  process.env.AWS_ACCESS_KEY_ID ??= 'local';
  process.env.AWS_SECRET_ACCESS_KEY ??= 'local';
  process.env.AWS_REGION = config.region;
  process.env.GT_TABLE_NAME = config.tableName;
  process.env.GT_ANSWER_KEY_TABLE_NAME = config.answerKeyTableName;
  process.env.GT_PERSONA_TABLE_NAME = config.personaTableName;
  process.env.GT_DDB_ENDPOINT = config.endpoint;
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

  const withheld = withheldItems();
  const app: AppConfig = existing ?? {
    appId: 'app-bramblebrook',
    name: 'Bramblebrook',
    surfaceKind: 'game',
    status: 'active',
    /**
     * The 95th percentile, matching CRITERIA_V1 and the CogAT bar GT states.
     *
     * Selection maximises information *at this threshold*, so this is also what sets the difficulty a child
     * is first asked: items near b = 1.645. In this bank that difficulty lives in the 6-8 band, which means a
     * third grader's opening question is above grade level by construction. That is deliberate and it is how
     * above-level testing finds the top few percent — an instrument that only asks grade-level questions
     * cannot separate a gifted third grader from a merely capable one, because both answer them all.
     */
    abilityThreshold: 1.645,
    /**
     * Deliberately generous, and separately from where the line is.
     *
     * A false positive costs one family a declined application; a false negative costs a child nobody hears
     * about. A game surface also carries the most construct-irrelevant variance of any front door, so it
     * should be the most willing to pass someone through for a human to look at.
     */
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
    /**
     * No age-band restriction, which in this bank is a difficulty restriction.
     *
     * The bands are difficulty tiers wearing grade labels: K-1 spans b -3.17 to -2.04, 2-3 spans -2.26 to
     * -0.71, 4-5 spans -0.97 to +0.64, and 6-8 spans +0.37 to +3.17. There is no '3-5' band at all. Locking a
     * grade 3-5 session to grade-appropriate items would cap the hardest question available at 0.64 logits,
     * a full logit below the 1.645 cut, so the posterior could never discriminate at the bar this instrument
     * exists to decide. Difficulty is chosen by information at the threshold instead.
     */
    ageBands: [],
    uiCapabilities: [...required.elements],
    /**
     * '2-3', not 'none', and this is a deliberate reversal.
     *
     * 'none' was right when the audience was pre-readers, and it is what pushed `VER-SORTBOT-01` into drawing
     * its words as pictures — which broke it: the drawability gate passes only 27 of its 100 items, and in 8 of
     * them the keyed answer draws as the same shape as the OUT counter-example, so the visible evidence points
     * away from the right answer. See `docs/design/sortbot-for-grades-3-5.md`.
     *
     * This app targets third to fifth graders, who read fluently, and real CogAT presents Verbal Classification
     * as words from grade 3 upward. '2-3' is the honest ceiling: single common words, well inside third-grade
     * reading, and it stops well short of sentences.
     *
     * The cost is stated rather than hidden. A child who reads late now scores lower on the verbal battery for
     * a reason that is not reasoning. That is an argument for the disjunctive pass route — which lets a child
     * clear on quantitative or fluid alone — and not an argument for pictures that cannot be answered.
     */
    maxReadingBand: '2-3',
    allowSyntheticItems: true,
    withheldItemIds: withheld,
    pinnedSnapshotId: null,
    variety: DEFAULT_VARIETY_CONFIG,
    // Pseudonymous keepers. A persona carries ability between visits and needs no contact details.
    piiPolicy: 'none',
    retentionDays: 365,
    webhookUrl: null,
    ownerContact: '',
    createdAt: new Date().toISOString(),
  };

  /**
   * Re-seeding must actually apply the current policy, which `existing ?? {…}` on its own does not.
   *
   * Reusing a stored app wholesale was right while the only thing the seed created was an app that did not
   * exist yet. It is wrong the moment a policy changes: an app seeded before the reading band moved to '2-3'
   * would keep 'none' forever, and the sortbot fix would appear to do nothing for the one reader most likely
   * to test it — someone who had already run the seed once.
   *
   * `createdAt` and the api key are deliberately not touched: those identify the app rather than configure it.
   */
  const policied: AppConfig = {
    ...app,
    abilityThreshold: CRITERIA_V1.abilityThreshold,
    maxReadingBand: '2-3',
    withheldItemIds: withheld,
    uiCapabilities: [...required.elements],
  };
  await d.store.putApp(policied);
  console.log(`app ${policied.appId} (${policied.name}), budget ${policied.precision.maxItems} items per keeper`);
  console.log(`reading band ${policied.maxReadingBand} — words are shown as words for this audience`);
  console.log(`withholding ${withheld.length} item(s) whose defects survive any presentation`);

  for (const typeCode of BRAMBLEBROOK_TYPES) {
    await d.store.setApprovedType(policied.appId, typeCode, true, 'seed-bramblebrook');
  }
  const approved = await d.store.listApprovedTypes(policied.appId);
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
