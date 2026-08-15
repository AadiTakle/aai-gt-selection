import { createHash, randomUUID } from 'node:crypto';
import { bankRoutes } from '@gt/qbank/wire';
import { loadBanks, paramsForRecord } from '@gt/qbank/server';
import { pCorrect } from '@gt/engine';
import { CRITERIA_V1, DEFAULT_VARIETY_CONFIG, type AppConfig } from '@platform/domain';
import { clearSnapshotCache, configureSnapshotSource, deps, resetDeps } from '@platform/shared';
import { createRawClient, createTables, deleteTables, type StoreConfig } from '@platform/store';
import { publishCatalog } from '../functions/admin/src/publish.js';
import { routeLocal } from '../local/src/router.js';

/**
 * How many questions a decision takes **through the real handlers**, not through a simulation of them.
 *
 * `measure-bramblebrook.ts` calls `selectNext` and `computeSheet` directly with a pool already filtered to the
 * app's seven types. That turned out to be the one thing production did differently: `sheetFor` handed the stop
 * rule the whole catalogue, so domain coverage waited on spatial items Bramblebrook can never serve, and every
 * real session ran to the 24-item cap while the simulation happily stopped at 12. The simulation was right
 * about the design and silent about the deployment.
 *
 * This closes that gap by driving HTTP requests through the same routes the game uses. It is far slower per
 * session, so the cohort is small and the numbers are coarse — its job is to agree with the simulation, not to
 * replace it.
 *
 * Run: npm run measure:live [sessions]
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

const STATIONS = [
  ['QUANT-SERIES-01', 'QUANT-FUNC-01', 'QUANT-BALANCE-01'],
  ['FLU-MATRIX-01', 'FLU-CARPET-01'],
  ['VER-SORTBOT-01', 'VER-RELPAIR-01'],
] as const;

function normal(seed: number): number {
  // Deterministic standard normal, so a rerun measures the same cohort.
  let t = seed + 0x6d2b79f5;
  const rand = () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const u = Math.max(1e-12, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

async function main(): Promise<void> {
  const sessions = Number(process.argv[2] ?? 16);
  const endpoint = process.env.GT_DDB_ENDPOINT ?? 'http://127.0.0.1:8456';
  const suffix = randomUUID().slice(0, 8);
  const cfg: StoreConfig = {
    tableName: `gt-live-main-${suffix}`,
    answerKeyTableName: `gt-live-keys-${suffix}`,
    personaTableName: `gt-live-personas-${suffix}`,
    endpoint,
    region: 'us-east-1',
  };

  process.env.AWS_ACCESS_KEY_ID = 'local';
  process.env.AWS_SECRET_ACCESS_KEY = 'local';
  process.env.AWS_REGION = 'us-east-1';
  process.env.GT_TABLE_NAME = cfg.tableName;
  process.env.GT_ANSWER_KEY_TABLE_NAME = cfg.answerKeyTableName;
  process.env.GT_PERSONA_TABLE_NAME = cfg.personaTableName;
  process.env.GT_SNAPSHOT_BUCKET = 'live';
  process.env.GT_DDB_ENDPOINT = endpoint;
  resetDeps();
  clearSnapshotCache();

  const objects = new Map<string, Buffer>();
  configureSnapshotSource(async (_b, key) => {
    const found = objects.get(key);
    if (!found) throw new Error(`no snapshot ${key}`);
    return found;
  });

  const raw = createRawClient({ endpoint, region: 'us-east-1' });
  await createTables(raw, cfg);
  const d = deps();

  console.log('publishing the catalogue...');
  await publishCatalog(d, {
    publishedBy: 'measure-live-path',
    putObject: async (key, body) => {
      objects.set(key, body);
    },
  });

  const apiKey = `gtk_live_${suffix}`;
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
  for (const t of BRAMBLEBROOK_TYPES) await d.store.setApprovedType(app.appId, t, true, 'measure');
  await d.store.putApiKey(app.appId, createHash('sha256').update(apiKey).digest('hex'), 'measure');

  const keyOf = new Map<string, string | number>();
  const paramsOf = new Map<string, { a: number; b: number; c: number }>();
  for (const bank of loadBanks().values()) {
    for (const r of bank.scorable) {
      keyOf.set(r.itemId, r.answer.correctKey);
      /**
       * The real item parameters, which an earlier version of this script forgot to load.
       *
       * Without them the fallback used the *authoring* difficulty the wire reports — around 14 — as if it were
       * a logit, so `pCorrect` returned the guessing floor for every child at every ability and the whole
       * cohort answered at chance. The measurement looked plausible and meant nothing.
       */
      paramsOf.set(r.itemId, paramsForRecord(r));
    }
  }

  const call = async (method: string, path: string, body?: unknown) => {
    const res = await routeLocal({
      method,
      path,
      body: body === undefined ? null : JSON.stringify(body),
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    });
    return { status: res.statusCode, body: JSON.parse(res.body) as Record<string, unknown> };
  };

  console.log(`driving ${sessions} sessions through the real routes...\n`);
  const counts: number[] = [];
  const reasons = new Map<string, number>();
  const decisions = new Map<string, number>();

  for (let s = 0; s < sessions; s += 1) {
    const theta = normal(s * 7919 + 13);
    const keeper = `keeper-live-${suffix}-${s}`;
    let answered = 0;
    let done = false;
    /**
     * The first session this keeper opened, and the only one measured.
     *
     * An earlier version counted every answer the keeper gave across the whole walk, which quietly measured
     * the wrong thing: once a session reaches a decision, resumption refuses it (a finished screening is
     * finished) and the next station opens a *new* session. Totals of 48 were two screenings of 24 added
     * together, not one long one.
     */
    let firstSessionId: string | null = null;

    // Walk the stations in rotation, four questions a visit, the way a child plays.
    for (let visit = 0; visit < 12 && !done; visit += 1) {
      const station = STATIONS[visit % STATIONS.length] as readonly string[];
      const created = await call('POST', bankRoutes.createSession(), {
        personaId: keeper,
        types: [...station],
      });
      const sessionId = created.body.sessionId as string;
      firstSessionId ??= sessionId;
      if (sessionId !== firstSessionId) {
        // The first screening ended and a second has begun. Stop counting.
        done = true;
        break;
      }

      for (let i = 0; i < 4; i += 1) {
        const next = await call('GET', bankRoutes.next(sessionId));
        if (next.body.done === true) {
          done = true;
          break;
        }
        const item = next.body.served as { itemId: string };
        const p = paramsOf.get(item.itemId);
        if (!p) throw new Error(`no parameters for ${item.itemId}`);
        const key = keyOf.get(item.itemId);
        const asString = String(key ?? '');
        /**
         * Right with probability `pCorrect(theta, params)`, else deliberately not the key on both channels —
         * `scoreResponse` marks a numeric key against `selectedIndex` and a string key against `key`, so
         * moving only one leaves the other accidentally correct for half of this app's types.
         */
        const wantCorrect = Math.random() < pCorrect(theta, p);
        const sendString = wantCorrect ? asString : asString === 'A' ? 'B' : 'A';
        const idx = typeof key === 'number' ? key : Number(asString);
        const sendIndex = wantCorrect ? idx : Number.isFinite(idx) ? (idx === 0 ? 1 : 0) : 1;
        await call('POST', bankRoutes.answer(sessionId), {
          response: { key: sendString, selectedKey: sendString, selectedIndex: sendIndex },
          latencyMs: 6500,
        });
        answered += 1;
      }
    }

    const sheet = firstSessionId ? await d.store.getCurrentSheet(firstSessionId) : null;
    counts.push(answered);
    reasons.set(String(sheet?.stopReason), (reasons.get(String(sheet?.stopReason)) ?? 0) + 1);
    decisions.set(String(sheet?.decision), (decisions.get(String(sheet?.decision)) ?? 0) + 1);
    console.log(`  session ${s + 1}/${sessions}: ${answered} questions, ${sheet?.stopReason ?? 'no stop'}`);
  }

  const sorted = [...counts].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  console.log('\nQUESTIONS TO A DECISION, through the real handlers');
  console.log(`  median  ${q(0.5)}`);
  console.log(`  p90     ${q(0.9)}`);
  console.log(`  max     ${sorted[sorted.length - 1]}`);
  console.log(`  mean    ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}`);
  console.log(`  hit the 24-item cap: ${counts.filter((n) => n >= 24).length} of ${counts.length}`);
  console.log(`  stop reasons: ${JSON.stringify(Object.fromEntries(reasons))}`);
  console.log(`  decisions:    ${JSON.stringify(Object.fromEntries(decisions))}`);

  await deleteTables(raw, cfg);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
