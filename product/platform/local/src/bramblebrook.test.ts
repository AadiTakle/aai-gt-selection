import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bankRoutes } from '@gt/qbank/wire';
import { loadBanks } from '@gt/qbank/server';
import { DEFAULT_VARIETY_CONFIG, type AppConfig } from '@platform/domain';
import {
  clearSnapshotCache,
  configureSnapshotSource,
  deps,
  resetDeps,
  type Deps,
} from '@platform/shared';
import { createRawClient, createTables, deleteTables, type StoreConfig } from '@platform/store';
import { publishCatalog } from '../../functions/admin/src/publish.js';
import { routeLocal } from './router.js';
import { LOCAL_REGION, SKIP_MESSAGE, resolveDdbEndpoint } from '../../test-support/ddb.js';

/**
 * A whole Bramblebrook screening, driven through the platform the way the game drives it.
 *
 * This is the integration claim: the seven verbs the game draws are servable, a keeper's session accumulates
 * across bursts, a battery restriction is honoured, no answer key crosses the wire, and the game's own answer
 * payload marks correctly — including the two verbal types that only became servable when the loader learned
 * that a numeric `correctKey` is an option index.
 *
 * It goes through `routeLocal` rather than calling handlers directly, so the routing, the api-key authorizer
 * and the event shaping are all exercised. What it does not go through is HTTP itself, which the dev server
 * adds and which has no logic in it.
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

/** The three stations, and the types each draws. Mirrors `game/stations/sites.ts`. */
const STATIONS: readonly { readonly name: string; readonly types: readonly string[] }[] = [
  { name: 'coat wall', types: ['FLU-MATRIX-01', 'FLU-CARPET-01'] },
  { name: 'tide ledge', types: ['QUANT-SERIES-01', 'QUANT-FUNC-01', 'QUANT-BALANCE-01'] },
  { name: "day's log", types: ['VER-SORTBOT-01', 'VER-RELPAIR-01'] },
];

const ENDPOINT = await resolveDdbEndpoint();
const suite = ENDPOINT ? describe : describe.skip;
if (!ENDPOINT) console.warn(SKIP_MESSAGE);

suite('Bramblebrook on the platform', () => {
  const suffix = randomUUID().slice(0, 8);
  const cfg: StoreConfig = {
    tableName: `gt-bb-main-${suffix}`,
    answerKeyTableName: `gt-bb-keys-${suffix}`,
    personaTableName: `gt-bb-personas-${suffix}`,
    endpoint: ENDPOINT as string,
    region: LOCAL_REGION,
  };

  const objects = new Map<string, Buffer>();
  const apiKey = 'gtk_bramblebrook_test';
  const keyHash = createHash('sha256').update(apiKey).digest('hex');
  let d: Deps;
  const keyOf = new Map<string, string | number>();

  beforeAll(async () => {
    process.env.AWS_ACCESS_KEY_ID = 'local';
    process.env.AWS_SECRET_ACCESS_KEY = 'local';
    process.env.AWS_REGION = LOCAL_REGION;
    process.env.GT_TABLE_NAME = cfg.tableName;
    process.env.GT_ANSWER_KEY_TABLE_NAME = cfg.answerKeyTableName;
    process.env.GT_PERSONA_TABLE_NAME = cfg.personaTableName;
    process.env.GT_SNAPSHOT_BUCKET = 'test';
    process.env.GT_DDB_ENDPOINT = ENDPOINT as string;
    resetDeps();
    clearSnapshotCache();
    configureSnapshotSource(async (_bucket, key) => {
      const found = objects.get(key);
      if (!found) throw new Error(`no snapshot ${key}`);
      return found;
    });

    await createTables(createRawClient({ endpoint: ENDPOINT as string, region: LOCAL_REGION }), cfg);
    d = deps();

    await publishCatalog(d, {
      publishedBy: 'bramblebrook-test',
      putObject: async (key, body) => {
        objects.set(key, body);
      },
    });

    const app: AppConfig = {
      appId: 'app-bramblebrook',
      name: 'Bramblebrook',
      surfaceKind: 'game',
      status: 'active',
      abilityThreshold: 1.0,
      recommendProbability: 0.3,
      precision: { confidenceAbove: 0.75, confidenceBelow: 0.97, minItems: 12, maxItems: 24 },
      perDomainMinimum: 2,
      ageBands: [],
      uiCapabilities: [],
      maxReadingBand: 'none',
      allowSyntheticItems: true,
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
      await d.store.setApprovedType(app.appId, typeCode, true, 'test');
    }
    await d.store.putApiKey(app.appId, keyHash, 'test');

    for (const bank of loadBanks().values()) {
      for (const record of bank.scorable) keyOf.set(record.itemId, record.answer.correctKey);
    }
  }, 240_000);

  afterAll(async () => {
    await deleteTables(createRawClient({ endpoint: ENDPOINT as string, region: LOCAL_REGION }), cfg);
    configureSnapshotSource(null);
    resetDeps();
  }, 120_000);

  async function call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const response = await routeLocal({
      method,
      path,
      body: body === undefined ? null : JSON.stringify(body),
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    });
    return { status: response.statusCode, body: JSON.parse(response.body) as Record<string, unknown> };
  }

  /** The payload the game sends: all three addressings, because its options sometimes carry no key. */
  function answerFor(itemId: string): { key: string; selectedKey: string; selectedIndex: number } {
    const key = keyOf.get(itemId);
    const asString = String(key ?? '');
    const asIndex = typeof key === 'number' ? key : Number.isFinite(Number(key)) ? Number(key) : -1;
    return { key: asString, selectedKey: asString, selectedIndex: asIndex };
  }

  /**
   * An answer that is not the key, whatever shape the key takes.
   *
   * Both channels have to be wrong at once: `scoreResponse` marks a numeric key against `selectedIndex` and a
   * string key against `key`, so moving only one of them leaves the other accidentally correct for half the
   * types in this app.
   */
  function wrongAnswerFor(itemId: string): { key: string; selectedKey: string; selectedIndex: number } {
    const key = keyOf.get(itemId);
    const asString = String(key ?? '');
    const wrongString = asString === 'A' ? 'B' : 'A';
    const asIndex = typeof key === 'number' ? key : Number(asString);
    const wrongIndex = Number.isFinite(asIndex) ? (asIndex === 0 ? 1 : 0) : 1;
    return { key: wrongString, selectedKey: wrongString, selectedIndex: wrongIndex };
  }

  it('reports only the seven verbs in its catalogue', async () => {
    const { status, body } = await call('GET', bankRoutes.catalogue());
    expect(status).toBe(200);
    expect(body.typeCount).toBe(BRAMBLEBROOK_TYPES.length);
    expect(body.scorable).toBe(800);
  });

  it('runs a keeper through every station and accumulates one session', async () => {
    const keeperId = `keeper-${randomUUID().slice(0, 8)}`;
    const sessionIds = new Set<string>();
    const served: { itemId: string; typeCode: string }[] = [];
    let unscorable = 0;

    // Three bursts, one per station, the way a child walks the ranch.
    let burst = 0;
    for (const station of STATIONS) {
      const created = await call('POST', bankRoutes.createSession(), {
        personaId: keeperId,
        types: station.types,
      });
      /**
       * Created once, resumed thereafter.
       *
       * This assertion is the one this test was named for and did not make. It collected `sessionIds` and
       * never checked the set, so three separate sessions passed a test called "accumulates one session" —
       * and the real game duly produced twelve sessions for twenty-six answers, with an interval that could
       * never narrow. A set gathered and not asserted on is not a check.
       */
      expect(created.status).toBe(burst === 0 ? 201 : 200);
      burst += 1;
      const sessionId = created.body.sessionId as string;
      sessionIds.add(sessionId);

      for (let i = 0; i < 4; i += 1) {
        const next = await call('GET', bankRoutes.next(sessionId));
        expect(next.status).toBe(200);
        if (next.body.done === true) break;

        const item = next.body.served as { itemId: string };
        // Every question a station serves belongs to that station.
        expect(station.types).toContain(next.body.typeCode as string);
        served.push({ itemId: item.itemId, typeCode: next.body.typeCode as string });

        // No answer key, at any depth, ever.
        expect(JSON.stringify(next.body)).not.toContain('correctKey');

        const marked = await call('POST', bankRoutes.answer(sessionId), {
          response: answerFor(item.itemId),
          latencyMs: 5200,
        });
        expect(marked.status).toBe(200);
        const state = marked.body.state as { unscorable: number };
        unscorable = state.unscorable;
      }
    }

    // The game's own harness calls this the figure that must stay zero: anything else is a response shape
    // the platform could not read, which is how a whole family of types disappears without an error.
    expect(unscorable).toBe(0);
    expect(served.length).toBeGreaterThanOrEqual(9);
    expect(new Set(served.map((s) => s.itemId)).size).toBe(served.length);

    // One session across all three stations, which is what makes the rest of this meaningful.
    expect(sessionIds.size).toBe(1);
    const [onlySession] = [...sessionIds];

    /**
     * And the trace on that one session holds every question, which is the property the interval depends on.
     *
     * Asserting the session count alone would not catch a resumed session that somehow wrote its responses
     * elsewhere; this is the difference between one id and one accumulating body of evidence.
     */
    const trace = await d.store.listResponses(onlySession as string);
    expect(trace.filter((r) => r.state === 'answered')).toHaveLength(served.length);

    // The estimate narrowed. A restarting session sits at the prior's width of about 3.3 logits forever.
    const sheet = await d.store.getCurrentSheet(onlySession as string);
    expect(sheet).not.toBeNull();
    const width = sheet!.composite.interval[1] - sheet!.composite.interval[0];
    expect(width).toBeLessThan(3.0);
    expect(sheet!.derivedFromResponseCount).toBe(served.length);

    // All three batteries contributed, and the verbal ones are the two that only became servable when the
    // loader learned a numeric key is an option index.
    const types = new Set(served.map((s) => s.typeCode));
    expect([...types].some((t) => t.startsWith('QUANT'))).toBe(true);
    expect([...types].some((t) => t.startsWith('FLU'))).toBe(true);
    expect([...types].some((t) => t.startsWith('VER'))).toBe(true);
  }, 120_000);

  it('refuses a station whose types the app has not approved', async () => {
    const { status, body } = await call('POST', bankRoutes.createSession(), {
      types: ['SPA-MAZE-01'],
    });
    expect(status).toBe(400);
    expect(body.unapproved).toEqual(['SPA-MAZE-01']);
  });

  it('retargets the resumed session to the new station rather than keeping the old battery', async () => {
    /**
     * The reason resumption needed more than "return the existing id".
     *
     * `restrictedTypes` is frozen onto the session at creation, so resuming without retargeting would lock a
     * keeper to whichever station they happened to visit first — the quantitative log forever, no matter which
     * board they walked up to next. The child would see one battery and the composite would never earn its name.
     */
    const keeperId = `keeper-${randomUUID().slice(0, 8)}`;
    const first = await call('POST', bankRoutes.createSession(), {
      personaId: keeperId,
      types: ['QUANT-SERIES-01'],
    });
    expect(first.status).toBe(201);

    const second = await call('POST', bankRoutes.createSession(), {
      personaId: keeperId,
      types: ['FLU-MATRIX-01'],
    });
    expect(second.status).toBe(200);
    expect(second.body.sessionId).toBe(first.body.sessionId);

    const next = await call('GET', bankRoutes.next(second.body.sessionId as string));
    expect(next.body.typeCode).toBe('FLU-MATRIX-01');
  }, 60_000);

  it('does not resume a session that has already stopped', async () => {
    const keeperId = `keeper-${randomUUID().slice(0, 8)}`;
    const first = await call('POST', bankRoutes.createSession(), {
      personaId: keeperId,
      types: ['QUANT-SERIES-01'],
    });
    const sessionId = first.body.sessionId as string;
    await d.store.finishSession(sessionId, 'abandoned', null, new Date().toISOString());

    const second = await call('POST', bankRoutes.createSession(), {
      personaId: keeperId,
      types: ['QUANT-SERIES-01'],
    });
    // A finished screening is finished. Resuming it would append to a trace someone already drew a line under.
    expect(second.status).toBe(201);
    expect(second.body.sessionId).not.toBe(sessionId);
  }, 60_000);

  it('can reach a decision even though it has no spatial type to serve', async () => {
    /**
     * The coverage rule waits until every domain *in the pool* has been sampled, and Bramblebrook has no
     * approved spatial type while the snapshot holds 1,428 spatial items. Handed the whole catalogue, the rule
     * waited forever on a domain the app cannot serve: coverage was unsatisfiable, so no session ever stopped
     * on confidence and every one ran to the 24-item cap. This is that, pinned — a session that answers enough
     * to be decided must actually be decided.
     *
     * Answers are deliberately wrong, because the fastest route to a confident verdict at a 95th-percentile
     * cut is a run of misses at difficulties chosen to sit on the bar.
     */
    const keeperId = `keeper-${randomUUID().slice(0, 8)}`;
    const created = await call('POST', bankRoutes.createSession(), { personaId: keeperId });
    const sessionId = created.body.sessionId as string;

    let stopped = false;
    let served = 0;
    for (let i = 0; i < 24; i += 1) {
      const next = await call('GET', bankRoutes.next(sessionId));
      if (next.body.done === true) {
        stopped = true;
        break;
      }
      served += 1;
      const item = next.body.served as { itemId: string };
      await call('POST', bankRoutes.answer(sessionId), {
        response: wrongAnswerFor(item.itemId),
        latencyMs: 7000,
      });
    }

    expect(stopped).toBe(true);
    // Under the cap, which is the whole point: before the fix this could only ever end by exhausting it.
    expect(served).toBeLessThan(24);

    const sheet = await d.store.getCurrentSheet(sessionId);
    expect(sheet?.stopped).toBe(true);
    expect(sheet?.stopReason).toBe('confident-below');
    expect(sheet?.decision).toBe('no-recommendation');
    // Spatial was never asked about and must not be holding the decision up.
    expect(sheet?.domains.spatial.itemsScored).toBe(0);
  }, 180_000);

  it('keeps an anonymous session out of resumption entirely', async () => {
    /**
     * No persona, no continuity, and that is the correct behaviour rather than a gap: resumption is keyed on
     * the persona, and two anonymous children share nothing that could tell them apart. Silently joining them
     * into one session would pool two people's evidence into one estimate.
     */
    const a = await call('POST', bankRoutes.createSession(), { types: ['QUANT-SERIES-01'] });
    const b = await call('POST', bankRoutes.createSession(), { types: ['QUANT-SERIES-01'] });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.sessionId).not.toBe(b.body.sessionId);
  }, 60_000);

  it('gives a returning keeper fresh items rather than the ones already seen', async () => {
    const keeperId = `keeper-${randomUUID().slice(0, 8)}`;
    const seen: string[][] = [];

    for (let visit = 0; visit < 2; visit += 1) {
      const created = await call('POST', bankRoutes.createSession(), {
        personaId: keeperId,
        types: ['QUANT-SERIES-01', 'QUANT-FUNC-01', 'QUANT-BALANCE-01'],
      });
      const sessionId = created.body.sessionId as string;
      const items: string[] = [];
      for (let i = 0; i < 3; i += 1) {
        const next = await call('GET', bankRoutes.next(sessionId));
        if (next.body.done === true) break;
        const item = next.body.served as { itemId: string };
        items.push(item.itemId);
        await call('POST', bankRoutes.answer(sessionId), {
          response: answerFor(item.itemId),
          latencyMs: 5200,
        });
      }
      seen.push(items);
    }

    const [first, second] = seen as [string[], string[]];
    const repeated = second.filter((id) => first.includes(id));
    // The persona index is what replaced the app's hand-kept list of seen item ids.
    expect(repeated).toEqual([]);
  }, 120_000);

  it('declines a tap too fast to be an attempt, without marking it wrong', async () => {
    const created = await call('POST', bankRoutes.createSession(), {
      types: ['FLU-MATRIX-01', 'FLU-CARPET-01'],
    });
    const sessionId = created.body.sessionId as string;
    const next = await call('GET', bankRoutes.next(sessionId));
    const item = next.body.served as { itemId: string };

    const marked = await call('POST', bankRoutes.answer(sessionId), {
      response: answerFor(item.itemId),
      latencyMs: 12,
    });
    // Correct answer, impossible speed. Unscorable, not right and not wrong: tapping is cheap in a game and
    // a child crossing the ranch can hit a pod wall in passing.
    expect(marked.body.correct).toBeNull();
    const trace = await d.store.listResponses(sessionId);
    expect(trace[0]?.flags).toContain('rapid-guess');
    expect((marked.body.state as { unscorable: number }).unscorable).toBe(1);
  }, 60_000);
});
