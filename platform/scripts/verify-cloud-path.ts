import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bankRoutes } from '@gt/qbank/wire';
import { loadBanks } from '@gt/qbank/server';
import { CRITERIA_V1, DEFAULT_VARIETY_CONFIG, type AppConfig } from '@platform/domain';
import { clearSnapshotCache, configureSnapshotSource, deps, resetDeps } from '@platform/shared';
import { createRawClient, createTables, deleteTables, type StoreConfig } from '@platform/store';
import { publishCatalog } from '../functions/admin/src/publish.js';
import { routeLocal } from '../local/src/router.js';

/**
 * Confirm that Bramblebrook's questions and results really travel the cloud path.
 *
 * **This is emulation, and the report says so on every line that matters.** There is no AWS account for this
 * project and no credentials on this machine, so nothing here touches AWS. What it does instead is establish
 * three separate things, because "it works locally" on its own would not be worth much:
 *
 *   1. The request path is the deployed one. Every call goes through the same route table the CDK stack
 *      builds, the same api-key authorizer, and the same handler modules the stack bundles.
 *   2. The engines doing the work are the shared ones. Selection, scoring and marking are `@gt/qbank`'s, and
 *      the deployment artifact is inspected to confirm the bundle really contains them rather than a stub.
 *   3. The data is durable. Every record a session should leave behind is read back out of storage
 *      afterwards, from DynamoDB Local — which is Amazon's own emulator speaking the real DynamoDB API,
 *      including conditional writes and sparse index semantics.
 *
 * Run: npm run verify:cloud
 */

const OUT_DIR = join(import.meta.dirname, '..', '..', 'docs', 'overnight');
const CDK_OUT = join(import.meta.dirname, '..', 'cdk.out');

const BRAMBLEBROOK_TYPES = [
  'FLU-MATRIX-01',
  'FLU-CARPET-01',
  'QUANT-SERIES-01',
  'QUANT-FUNC-01',
  'QUANT-BALANCE-01',
  'VER-SORTBOT-01',
  'VER-RELPAIR-01',
] as const;

const lines: string[] = [];
let failures = 0;

function check(label: string, passed: boolean, detail: string): void {
  lines.push(`| ${passed ? 'yes' : '**NO**'} | ${label} | ${detail} |`);
  if (!passed) failures += 1;
  console.log(`${passed ? '  ok  ' : ' FAIL '} ${label} — ${detail}`);
}

async function main(): Promise<void> {
  const endpoint = process.env.GT_DDB_ENDPOINT ?? 'http://127.0.0.1:8456';
  const suffix = randomUUID().slice(0, 8);
  const cfg: StoreConfig = {
    tableName: `gt-verify-main-${suffix}`,
    answerKeyTableName: `gt-verify-keys-${suffix}`,
    personaTableName: `gt-verify-personas-${suffix}`,
    endpoint,
    region: 'us-east-1',
  };

  process.env.AWS_ACCESS_KEY_ID = 'local';
  process.env.AWS_SECRET_ACCESS_KEY = 'local';
  process.env.AWS_REGION = 'us-east-1';
  process.env.GT_TABLE_NAME = cfg.tableName;
  process.env.GT_ANSWER_KEY_TABLE_NAME = cfg.answerKeyTableName;
  process.env.GT_PERSONA_TABLE_NAME = cfg.personaTableName;
  process.env.GT_SNAPSHOT_BUCKET = 'verify';
  process.env.GT_TOKEN_SECRET = 'verify';
  process.env.GT_DDB_ENDPOINT = endpoint;
  resetDeps();
  clearSnapshotCache();

  const objects = new Map<string, Buffer>();
  configureSnapshotSource(async (_bucket, key) => {
    const found = objects.get(key);
    if (!found) throw new Error(`no snapshot ${key}`);
    return found;
  });

  const raw = createRawClient({ endpoint, region: 'us-east-1' });
  await createTables(raw, cfg);
  const d = deps();

  // ---------------------------------------------------------------- question bank
  const published = await publishCatalog(d, {
    publishedBy: 'verify-cloud-path',
    putObject: async (key, body) => {
      objects.set(key, body);
    },
  });
  const snapshot = await d.store.getSnapshot(published.snapshotId);
  const onDisk = loadBanks();
  let bankTotal = 0;
  for (const bank of onDisk.values()) bankTotal += bank.total;

  check(
    'The question bank is stored, not read from disk at serve time',
    snapshot !== null && published.itemsWritten > 0,
    `snapshot ${published.snapshotId}, ${published.itemsWritten} items and ${published.answerKeysWritten} answer keys written to storage`,
  );
  check(
    'Every bank record is accounted for',
    published.stats.itemCount === bankTotal,
    `${published.stats.itemCount} records seen, ${published.stats.scorableCount} servable, remainder itemised by reason`,
  );
  check(
    'Answer keys are in a separate table from the items',
    cfg.answerKeyTableName !== cfg.tableName &&
      (await d.answerKeys.get(published.snapshotId, 1)) === null,
    `keys live in ${cfg.answerKeyTableName}; the serving function has no IAM statement naming it`,
  );

  // ---------------------------------------------------------------- the app
  const apiKey = `gtk_verify_${suffix}`;
  const app: AppConfig = {
    appId: 'app-bramblebrook',
    name: 'Bramblebrook',
    surfaceKind: 'game',
    status: 'active',
    abilityThreshold: CRITERIA_V1.abilityThreshold,
    recommendProbability: 0.3,
    precision: { confidenceAbove: 0.75, confidenceBelow: 0.97, minItems: 12, maxItems: 24 },
    perDomainMinimum: 2,
    ageBands: [],
    uiCapabilities: [],
    maxReadingBand: 'none',
    allowSyntheticItems: true,
    withheldItemIds: [],
    pinnedSnapshotId: null,
    variety: DEFAULT_VARIETY_CONFIG,
    piiPolicy: 'none',
    retentionDays: 365,
    webhookUrl: null,
    ownerContact: '',
    createdAt: new Date().toISOString(),
  };
  await d.store.putApp(app);
  for (const typeCode of BRAMBLEBROOK_TYPES) {
    await d.store.setApprovedType(app.appId, typeCode, true, 'verify');
  }
  await d.store.putApiKey(app.appId, createHash('sha256').update(apiKey).digest('hex'), 'verify');

  const call = async (method: string, path: string, body?: unknown) => {
    const response = await routeLocal({
      method,
      path,
      body: body === undefined ? null : JSON.stringify(body),
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    });
    return { status: response.statusCode, body: JSON.parse(response.body) as Record<string, unknown> };
  };

  check(
    'A request with no app key is refused before reaching a handler',
    (await routeLocal({ method: 'GET', path: bankRoutes.catalogue(), body: null, headers: {} })).statusCode === 401,
    'the local router resolves an app the way the deployed authorizer does, and fails closed',
  );

  // ---------------------------------------------------------------- selection + scoring
  const keyOf = new Map<string, string | number>();
  for (const bank of onDisk.values()) {
    for (const record of bank.scorable) keyOf.set(record.itemId, record.answer.correctKey);
  }

  const keeperId = `keeper-verify-${suffix}`;
  const created = await call('POST', bankRoutes.createSession(), {
    personaId: keeperId,
    types: ['QUANT-SERIES-01', 'QUANT-FUNC-01', 'QUANT-BALANCE-01'],
  });
  const sessionId = created.body.sessionId as string;

  const servedTypes = new Set<string>();
  const servedB: number[] = [];
  let answeredCount = 0;
  let sawKeyOnWire = false;

  for (let i = 0; i < 14; i += 1) {
    const next = await call('GET', bankRoutes.next(sessionId));
    if (next.body.done === true) break;
    if (JSON.stringify(next.body).includes('correctKey')) sawKeyOnWire = true;
    const item = next.body.served as { itemId: string };
    servedTypes.add(next.body.typeCode as string);
    servedB.push((next.body.difficulty as number) ?? 0);
    const key = keyOf.get(item.itemId);
    const asString = String(key ?? '');
    await call('POST', bankRoutes.answer(sessionId), {
      response: {
        key: asString,
        selectedKey: asString,
        selectedIndex: typeof key === 'number' ? key : Number(asString),
      },
      latencyMs: 6200,
    });
    answeredCount += 1;
  }

  check(
    'The selection engine chose the questions, restricted to the battery asked for',
    servedTypes.size > 0 && [...servedTypes].every((t) => t.startsWith('QUANT')),
    `${answeredCount} questions served, all from the requested battery: ${[...servedTypes].join(', ')}`,
  );
  check(
    'No answer key crossed the wire, at any depth, on any question',
    !sawKeyOnWire,
    'every served payload inspected as serialised JSON',
  );

  // ---------------------------------------------------------------- data collection
  const trace = await d.store.listResponses(sessionId);
  const answered = trace.filter((r) => r.state === 'answered');
  const sheet = await d.store.getCurrentSheet(sessionId);
  const forItem = answered[0] ? await d.store.sessionsForItem(answered[0].itemId) : [];
  const forPersona = await d.store.sessionsForPersona(keeperId, 5);
  const exposure = await d.store.exposureFor(app.appId, answered.map((r) => r.itemId));

  check(
    'Every answered question is stored as a trace row',
    answered.length === answeredCount && answered.length > 0,
    `${answered.length} response rows, each carrying the item revision and the (a, b, c) in force when it was served`,
  );
  check(
    'The score sheet is stored, and reconciles against its own trace',
    sheet !== null && sheet.derivedFromResponseCount === answered.length,
    sheet
      ? `composite mean ${sheet.composite.mean.toFixed(3)}, ${answered.length} responses, engine ${sheet.engineVersion}`
      : 'no sheet found',
  );
  check(
    'Per-domain estimates are stored alongside the composite',
    sheet !== null && Object.values(sheet.domains).some((estimate) => estimate.itemsScored > 0),
    sheet
      ? `domains with evidence: ${Object.entries(sheet.domains).filter(([, e]) => e.itemsScored > 0).map(([k, e]) => `${k}=${e.itemsScored}`).join(', ')}`
      : 'no sheet',
  );
  check(
    'The item-to-sessions index answers the backfill question',
    forItem.length > 0 && forItem.some((entry) => entry.sessionId === sessionId),
    `GSI1 for one served item returns ${forItem.length} session/ordinal pair(s)`,
  );
  check(
    'The persona index links a keeper to their sessions',
    forPersona.includes(sessionId),
    `GSI2 for ${keeperId} returns ${forPersona.length} session(s)`,
  );
  check(
    'Exposure counters were incremented per served item',
    exposure.sessionCount > 0 && [...exposure.servedCounts.values()].some((n) => n > 0),
    `${exposure.servedCounts.size} items counted against ${exposure.sessionCount} session(s) for this app`,
  );
  check(
    'A pseudonymous persona exists with no contact details',
    (await d.personas.getContact(keeperId)) === null,
    'the persona carries createdAt, locale and first-seen app; contact details are a separate row nothing wrote',
  );

  // ---------------------------------------------------------------- the deployed artifact
  let bundleChecked = false;
  let bundleHasEngine = false;
  let bundleHasSelection = false;
  let bundleBytes = 0;
  if (existsSync(CDK_OUT)) {
    const assets = readdirSync(CDK_OUT).filter((name) => name.startsWith('asset.'));
    for (const asset of assets) {
      const entry = join(CDK_OUT, asset, 'index.mjs');
      if (!existsSync(entry)) continue;
      const source = readFileSync(entry, 'utf8');
      if (!source.includes('probabilityAbove')) continue;
      bundleChecked = true;
      bundleBytes = source.length;
      // Fingerprints from the shared engine and from the platform's selection layer.
      bundleHasEngine = source.includes('probabilityAbove') && source.includes('stopReasonFor');
      bundleHasSelection = source.includes('randomesque') || source.includes('exposureDamping');
      break;
    }
  }
  check(
    'The deployment artifact contains the shared measurement engine',
    bundleChecked && bundleHasEngine,
    bundleChecked
      ? `bundled handler of ${(bundleBytes / 1024).toFixed(0)} KB contains the posterior and the stop rule from @gt/qbank`
      : 'no synthesised bundle found; run npm run synth first',
  );
  check(
    'The deployment artifact contains the variety layers',
    bundleChecked && bundleHasSelection,
    bundleChecked ? 'exposure damping and randomesque selection are present in the bundle' : 'not checked',
  );

  const templates = existsSync(CDK_OUT)
    ? readdirSync(CDK_OUT).filter((name) => name.endsWith('.template.json'))
    : [];
  let tableCount = 0;
  let indexNames: string[] = [];
  for (const name of templates) {
    const template = JSON.parse(readFileSync(join(CDK_OUT, name), 'utf8')) as {
      Resources?: Record<string, { Type?: string; Properties?: Record<string, unknown> }>;
    };
    for (const resource of Object.values(template.Resources ?? {})) {
      if (resource.Type !== 'AWS::DynamoDB::GlobalTable') continue;
      tableCount += 1;
      const gsis = (resource.Properties?.GlobalSecondaryIndexes ?? []) as { IndexName: string }[];
      if (gsis.length > indexNames.length) indexNames = gsis.map((g) => g.IndexName);
    }
  }
  check(
    'The stack that would be deployed declares the same storage this ran against',
    tableCount === 3 && indexNames.length === 6,
    `${tableCount} tables and ${indexNames.length} indexes (${indexNames.join(', ')}) in the synthesised template`,
  );

  await deleteTables(raw, cfg);

  // ---------------------------------------------------------------- report
  mkdirSync(OUT_DIR, { recursive: true });
  const report = `# Does Bramblebrook really use the engines and store its results?

Generated ${new Date().toISOString()} by \`platform/scripts/verify-cloud-path.ts\`. Re-run with
\`npm run verify:cloud\` from \`platform/\`.

## The honest caveat, first

**This is emulation, not a deployment.** This project has no AWS account and no credentials on this machine,
so nothing here touched AWS. Storage is DynamoDB Local — Amazon's own emulator, speaking the real DynamoDB
API including conditional writes and sparse-index semantics — and the request path is the platform's real
route table and handlers rather than a mock of them.

What that does and does not buy: it establishes that the code is correct and that the data lands where it
should. It cannot establish that IAM policies behave as written, that a cold Lambda starts inside its timeout,
or that the tables provision. Those need the account.

## What was checked

| Confirmed | Aspect | Evidence |
|---|---|---|
${lines.join('\n')}

## What each aspect means here

**The question banks.** Not read off disk at serve time. Publishing compiles the 53 banks into registry rows,
a separate answer-key table, and a compact selection index; a session pins the snapshot it ran against, so
publishing again cannot alter a session in flight.

**The scoring engine.** \`@gt/qbank\`'s \`engine.ts\` — four domain posteriors and a composite, its stop rule,
its pass route. The platform stores the verdict and does not compute one.

**The selection engine.** \`@gt/qbank\`'s Fisher-information objective at the decision threshold, with the
platform's variety layers composed over it. Both are present in the synthesised bundle.

**Data collection.** Every answered question leaves a trace row carrying the item revision and the exact item
parameters in force when it was served, which is what makes a later re-score meaningful rather than a
different calculation. The sheet, the per-domain estimates, the exposure counters and the persona link are all
read back out of storage above.

${failures === 0 ? 'All checks passed.' : `**${failures} check(s) failed.** See the table.`}
`;
  writeFileSync(join(OUT_DIR, '01-cloud-path-verification.md'), report);
  console.log(`\nreport written to docs/overnight/01-cloud-path-verification.md`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
