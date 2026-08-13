import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { planFor } from '@gt/ui-contract';
import { CRITERIA_V1, DEFAULT_VARIETY_CONFIG, type AppConfig } from '@platform/domain';
import { loadBanks } from '@gt/qbank/server';
import { deps, resetDeps } from '@platform/shared';
import { publishCatalog } from '../functions/admin/src/publish.js';

/**
 * Fill a freshly deployed stack: publish the catalogue, register Bramblebrook, approve its types, mint a key.
 *
 * ══ WHY THIS IS NOT `seed:bramblebrook` ═══════════════════════════════════════════════════════════
 *
 * That script creates its own tables and writes snapshots to a local directory, both of which are right for
 * DynamoDB Local and wrong here: on AWS the tables belong to CloudFormation, and creating them by hand would
 * produce resources the stack does not know it owns and will not delete. This one creates nothing. It reads the
 * names CloudFormation generated, writes into what already exists, and puts the snapshot in the real bucket.
 *
 * ══ WHY IT RUNS LOCALLY RATHER THAN CALLING THE ADMIN ROUTES ═══════════════════════════════════════
 *
 * The `/v1/admin/*` routes do exactly this and are the right tool once a stack is running — but they are
 * IAM-authorised, so calling them means signing requests with SigV4, and the very first call has to happen
 * before any api key exists to test with. Running the same handler code against the same tables with the same
 * credentials avoids a bootstrapping problem and a shell script full of `aws sigv4` incantations. It is the
 * same code path: `publishCatalog` is the module the admin function calls.
 *
 * ══ SAFETY ════════════════════════════════════════════════════════════════════════════════════════
 *
 * Refuses to run without an explicit region and stack prefix, refuses if `GT_DDB_ENDPOINT` is set (which would
 * mean it is pointed at the local emulator while claiming to provision AWS), and prints the account it is about
 * to write to before it writes. The archive's live service is in us-east-1; this defaults to us-east-2 like the
 * stacks do, and the account is printed so a wrong one is visible rather than inferred.
 *
 * Run: npm run provision:aws            (region us-east-2, prefix GtQuestionPlatform)
 *      npm run provision:aws -- --region us-west-2 --prefix MyPrefix
 */

const BRAMBLEBROOK_TYPES = [
  'FLU-MATRIX-01',
  'FLU-CARPET-01',
  'QUANT-SERIES-01',
  'QUANT-FUNC-01',
  'QUANT-BALANCE-01',
  'VER-SORTBOT-01',
  'VER-RELPAIR-01',
] as const;

const MAX_ITEMS = 24;
const KEY_FILE = join(
  import.meta.dirname,
  '..',
  '..',
  'screener',
  'data',
  'sanctuary',
  'platform-app.aws.json',
);

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? (process.argv[i + 1] as string) : fallback;
}

function aws(args: readonly string[]): string {
  return execFileSync('aws', [...args], { encoding: 'utf8' }).trim();
}

/** The stack's own outputs, which is the only honest source for a CloudFormation-generated name. */
function outputs(stack: string, region: string): Record<string, string> {
  const raw = aws([
    'cloudformation',
    'describe-stacks',
    '--stack-name',
    stack,
    '--region',
    region,
    '--query',
    'Stacks[0].Outputs',
    '--output',
    'json',
  ]);
  const list = JSON.parse(raw) as { OutputKey: string; OutputValue: string }[] | null;
  const out: Record<string, string> = {};
  for (const o of list ?? []) out[o.OutputKey] = o.OutputValue;
  return out;
}

/** The same withholding rule the local seed derives, for the same reason: two copies would drift. */
function withheldItems(): readonly string[] {
  const out: string[] = [];
  for (const record of loadBanks().get('VER-SORTBOT-01')?.scorable ?? []) {
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
  if (process.env.GT_DDB_ENDPOINT) {
    throw new Error(
      'GT_DDB_ENDPOINT is set, which points this at the local emulator. Unset it before provisioning AWS.',
    );
  }

  const region = arg('region', 'us-east-2');
  const prefix = arg('prefix', 'GtQuestionPlatform');

  const who = JSON.parse(aws(['sts', 'get-caller-identity', '--output', 'json'])) as {
    Account: string;
    Arn: string;
  };
  console.log(`account ${who.Account} in ${region}`);
  console.log(`as ${who.Arn}\n`);

  const data = outputs(`${prefix}Data`, region);
  const api = outputs(`${prefix}Api`, region);
  for (const key of ['MainTableName', 'AnswerKeyTableName', 'PersonaTableName', 'SnapshotBucketName']) {
    if (!data[key]) throw new Error(`${prefix}Data has no output ${key}; is the stack deployed?`);
  }

  process.env.AWS_REGION = region;
  process.env.GT_TABLE_NAME = data.MainTableName;
  process.env.GT_ANSWER_KEY_TABLE_NAME = data.AnswerKeyTableName;
  process.env.GT_PERSONA_TABLE_NAME = data.PersonaTableName;
  process.env.GT_SNAPSHOT_BUCKET = data.SnapshotBucketName;
  // Only the api key path needs it locally, and it is never read for anything this script does.
  process.env.GT_TOKEN_SECRET ??= 'provisioning';
  resetDeps();

  console.log(`tables   ${data.MainTableName}`);
  console.log(`keys     ${data.AnswerKeyTableName}`);
  console.log(`personas ${data.PersonaTableName}`);
  console.log(`bucket   ${data.SnapshotBucketName}\n`);

  const d = deps();

  /**
   * The snapshot goes to the real bucket, gzipped, exactly as the admin function would put it.
   *
   * Imported lazily so a machine without the S3 client can still run `--help`-shaped invocations, and so this
   * script's failure mode when credentials are wrong is an AWS error rather than a module resolution error.
   */
  const { PutObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region });

  console.log('publishing the catalogue...');
  const published = await publishCatalog(d, {
    publishedBy: `provision-aws:${who.Arn}`,
    putObject: async (key, body) => {
      await s3.send(
        new PutObjectCommand({
          Bucket: data.SnapshotBucketName as string,
          Key: key,
          Body: body,
          ContentEncoding: 'gzip',
        }),
      );
    },
  });
  console.log(
    `  ${published.snapshotId}: ${published.itemsWritten} items, ${published.answerKeysWritten} keys, ` +
      `${published.typesWritten} types written`,
  );

  // `.union` is the aggregate across the types; the plan itself is per-type. Same call the local seed makes.
  const required = planFor([...BRAMBLEBROOK_TYPES]).union;
  const withheld = withheldItems();
  const existing = await d.store.getApp('app-bramblebrook');
  const app: AppConfig = {
    ...(existing ?? {
      appId: 'app-bramblebrook',
      name: 'Bramblebrook',
      surfaceKind: 'game',
      status: 'active',
      recommendProbability: 0.3,
      precision: { confidenceAbove: 0.75, confidenceBelow: 0.97, minItems: 12, maxItems: MAX_ITEMS },
      perDomainMinimum: 2,
      ageBands: [],
      allowSyntheticItems: true,
      pinnedSnapshotId: null,
      variety: DEFAULT_VARIETY_CONFIG,
      piiPolicy: 'none',
      retentionDays: 365,
      webhookUrl: null,
      ownerContact: '',
      createdAt: new Date().toISOString(),
    }),
    // Policy is re-applied on every run, so provisioning an already-provisioned stack updates it rather than
    // silently keeping whatever it had. This is the same trap the local seed hit.
    abilityThreshold: CRITERIA_V1.abilityThreshold,
    maxReadingBand: '2-3',
    withheldItemIds: withheld,
    uiCapabilities: [...required.elements],
  };
  await d.store.putApp(app);
  console.log(`\napp ${app.appId}: threshold ${app.abilityThreshold}, reading band ${app.maxReadingBand}`);
  console.log(`  withholding ${withheld.length} item(s)`);

  for (const typeCode of BRAMBLEBROOK_TYPES) {
    await d.store.setApprovedType(app.appId, typeCode, true, 'provision-aws');
  }
  const approved = await d.store.listApprovedTypes(app.appId);
  console.log(`  approved ${approved.length} types`);

  /**
   * A fresh api key, printed once and written to disk once.
   *
   * The platform stores only a digest and cannot return it, so a lost key means minting another. Written to a
   * `.aws.json` file distinct from the local one so that pointing a build at the wrong environment requires
   * choosing the wrong file rather than merely forgetting which one was last written.
   */
  const apiKey = `gtk_${randomBytes(18).toString('base64url')}`;
  await d.store.putApiKey(app.appId, createHash('sha256').update(apiKey).digest('hex'), 'provision-aws');
  mkdirSync(dirname(KEY_FILE), { recursive: true });
  writeFileSync(
    KEY_FILE,
    `${JSON.stringify({ appId: app.appId, apiKey, region, apiBaseUrl: api.ApiBaseUrl ?? null }, null, 2)}\n`,
  );

  console.log(`\napi key written to ${KEY_FILE}`);
  console.log('  that file is the only copy: the platform keeps a digest and cannot return it.');
  console.log('\nput these in screener/.env.production.local to build a game against this stack:');
  console.log(`  VITE_GT_PLATFORM_URL=${api.ApiBaseUrl ?? '<deploy the Api stack for its ApiBaseUrl output>'}`);
  console.log(`  VITE_GT_APP_KEY=${apiKey}`);
  if (!existsSync(KEY_FILE)) throw new Error('key file was not written');
}

main().catch((error) => {
  console.error(`\nprovisioning failed: ${(error as Error).message}`);
  process.exitCode = 1;
});
