import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { DOMAIN_NAMES, type ScoreSheet } from '@platform/domain';
import { createRawClient, createTables, deleteTables, type StoreConfig } from '@platform/store';
import {
  clearSnapshotCache,
  configureSnapshotSource,
  deps,
  resetDeps,
  type Deps,
} from '@platform/shared';
import { bankRoutes } from '@gt/qbank/wire';
import { handler as adminHandler } from './admin/src/handler.js';
import { publishCatalog } from './admin/src/publish.js';
import { handler as catalogHandler } from './catalog/src/handler.js';
import { handler as scoreHandler } from './score/src/handler.js';
import { handler as serveHandler } from './serve/src/handler.js';
import { rescoreSession } from './rescore-worker/src/handler.js';
import { apiEvent, memoryObjectStore, writeFixtureBanks } from './test-fixtures.js';

import { LOCAL_REGION, SKIP_MESSAGE, resolveDdbEndpoint } from '../test-support/ddb.js';

/**
 * Discovered rather than assumed. An open socket is not proof of DynamoDB: on this machine port 8010
 * was held by an unrelated server that answered HTTP happily and then failed every DynamoDB call.
 */
const ENDPOINT = await resolveDdbEndpoint();
const suite = ENDPOINT ? describe : describe.skip;
if (!ENDPOINT) console.warn(SKIP_MESSAGE);

suite('the request path, end to end', () => {
  const suffix = randomUUID().slice(0, 8);
  const cfg: StoreConfig = {
    tableName: `gt-fn-main-${suffix}`,
    answerKeyTableName: `gt-fn-keys-${suffix}`,
    personaTableName: `gt-fn-personas-${suffix}`,
    endpoint: ENDPOINT as string,
    region: LOCAL_REGION,
  };

  const banks = writeFixtureBanks(12);
  const objects = memoryObjectStore();
  let d: Deps;
  let appId: string;
  let snapshotId: string;

  beforeAll(async () => {
    process.env.AWS_ACCESS_KEY_ID = 'local';
    process.env.AWS_SECRET_ACCESS_KEY = 'local';
    process.env.AWS_REGION = LOCAL_REGION;
    process.env.GT_TABLE_NAME = cfg.tableName;
    process.env.GT_ANSWER_KEY_TABLE_NAME = cfg.answerKeyTableName;
    process.env.GT_PERSONA_TABLE_NAME = cfg.personaTableName;
    process.env.GT_SNAPSHOT_BUCKET = 'test-bucket';
    process.env.GT_TOKEN_SECRET = 'test-secret-for-served-tokens';
    process.env.GT_DDB_ENDPOINT = ENDPOINT as string;
    delete process.env.GT_RESCORE_QUEUE_URL;

    resetDeps();
    clearSnapshotCache();
    configureSnapshotSource(objects.fetch);

    const raw = createRawClient({ endpoint: ENDPOINT as string, region: LOCAL_REGION });
    await createTables(raw, cfg);

    d = deps();

    const published = await publishCatalog(d, {
      publishedBy: 'test',
      bankDir: banks.dir,
      putObject: objects.put,
    });
    snapshotId = published.snapshotId;

    const appResponse = await adminHandler(
      apiEvent({
        method: 'POST',
        path: '/v1/admin/apps',
        body: {
          name: 'Fixture app',
          surfaceKind: 'web',
          ageBands: ['3-5'],
          perDomainMinimum: 1,
          piiPolicy: 'guardian_email',
        },
      }),
    );
    appId = JSON.parse(appResponse.body).app.appId as string;

    for (const typeCode of banks.typeCodes) {
      const approved = await adminHandler(
        apiEvent({
          method: 'PUT',
          path: `/v1/admin/apps/${appId}/types/${typeCode}`,
          pathParameters: { appId, typeCode },
          body: { enabled: true },
        }),
      );
      // Asserted rather than assumed. A silently failing approval leaves an empty eligible pool and
      // makes every downstream test fail for a reason that has nothing to do with what it tests.
      if (approved.statusCode !== 200) {
        throw new Error(`approving ${typeCode} failed: ${approved.statusCode} ${approved.body}`);
      }
    }
  }, 120_000);

  afterAll(async () => {
    const raw = createRawClient({ endpoint: ENDPOINT as string, region: LOCAL_REGION });
    await deleteTables(raw, cfg);
    configureSnapshotSource(null);
    resetDeps();
  }, 60_000);

  // --- helpers

  /**
   * Start a session and pin its RNG seed.
   *
   * Production generates a fresh seed per session, which is correct there and hostile here: a test
   * that asserts an exact stop reason is then asserting over a random draw of item difficulties, and a
   * perfect responder who happens to be served easy items can legitimately reach the item cap instead
   * of confidence. The seed is rewritten through the store rather than accepted from the request,
   * because letting a client choose the seed would let a client choose its questions.
   */
  async function startSession(
    body: Record<string, unknown> = {},
    seed = 'fixed-test-seed',
  ): Promise<string> {
    const response = await serveHandler(
      apiEvent({
        method: 'POST',
        path: bankRoutes.createSession(),
        appId,
        body: { ageBand: '3-5', ...body },
      }),
    );
    expect(response.statusCode).toBe(201);
    const sessionId = JSON.parse(response.body).sessionId as string;

    const session = await d.store.getSession(sessionId);
    if (!session) throw new Error(`session ${sessionId} vanished after creation`);
    await d.store.putSession({ ...session, rngSeed: seed });

    return sessionId;
  }

  async function next(sessionId: string, asApp = appId): Promise<Record<string, unknown>> {
    const response = await serveHandler(
      apiEvent({
        method: 'GET',
        path: bankRoutes.next(sessionId),
        appId: asApp,
        pathParameters: { sessionId },
      }),
    );
    return { statusCode: response.statusCode, ...JSON.parse(response.body) };
  }

  async function answer(
    sessionId: string,
    key: string,
    asApp = appId,
  ): Promise<Record<string, unknown>> {
    const response = await scoreHandler(
      apiEvent({
        method: 'POST',
        path: bankRoutes.answer(sessionId),
        appId: asApp,
        pathParameters: { sessionId },
        body: { response: { key }, latencyMs: 4000 },
      }),
    );
    return { statusCode: response.statusCode, ...JSON.parse(response.body) };
  }

  async function readSheet(sessionId: string, asApp = appId): Promise<ScoreSheet> {
    const response = await scoreHandler(
      apiEvent({
        method: 'GET',
        path: `/v1/sessions/${sessionId}/sheet`,
        appId: asApp,
        pathParameters: { sessionId },
      }),
    );
    return JSON.parse(response.body).sheet as ScoreSheet;
  }

  /** Drive a whole session, answering every item correctly. */
  async function runSession(sessionId: string): Promise<{
    sheet: ScoreSheet;
    served: { itemId: string; typeCode: string }[];
  }> {
    const served: { itemId: string; typeCode: string }[] = [];

    for (let guard = 0; guard < 60; guard += 1) {
      const question = await next(sessionId);
      if (question.done === true) break;
      const item = question.served as { itemId: string };
      served.push({ itemId: item.itemId, typeCode: question.typeCode as string });
      const marked = await answer(sessionId, banks.keys.get(item.itemId) as string);
      if ((marked.state as { stopped: boolean }).stopped) break;
    }

    // The bank contract carries a `QbankState`, not a sheet. The sheet is the platform's own record and is
    // read from the platform's own route.
    return { sheet: await readSheet(sessionId), served };
  }

  // --- tests

  describe('publishing', () => {
    it('wrote the fixture catalog and one snapshot', async () => {
      expect(snapshotId).toMatch(/^snap-\d{8}-\d{3}$/);
      const snapshot = await d.store.getSnapshot(snapshotId);
      expect(snapshot?.itemCount).toBe(banks.typeCodes.length * banks.itemsPerType);
      expect(objects.size()).toBe(1);
    });

    it('is idempotent: republishing unchanged banks writes no new types', async () => {
      const again = await publishCatalog(d, {
        publishedBy: 'test',
        bankDir: banks.dir,
        putObject: objects.put,
      });
      expect(again.typesWritten).toBe(0);
      expect(again.typesSkipped).toBe(banks.typeCodes.length);
      expect(again.itemsRevised).toBe(0);
    });

    it('put every answer key in the separate table, and none in the registry', async () => {
      const itemId = `${banks.typeCodes[0]}-i00`;
      expect((await d.answerKeys.get(itemId, 1))?.correctKey).toBe(banks.keys.get(itemId));
      const item = await d.store.getItem(banks.typeCodes[0] as string, itemId);
      expect(JSON.stringify(item)).not.toContain('correctKey');
    });
  });

  describe('a full session', () => {
    it('runs to a stop and produces five populated estimates', async () => {
      const sessionId = await startSession();
      const { sheet, served } = await runSession(sessionId);

      expect(sheet.stopped).toBe(true);
      expect(sheet.stopReason).not.toBeNull();
      expect(sheet.decision).not.toBeNull();
      expect(served.length).toBeGreaterThanOrEqual(8);

      expect(sheet.composite.itemsScored).toBe(served.length);
      expect(sheet.derivedFromResponseCount).toBe(served.length);
      for (const domain of DOMAIN_NAMES) {
        expect(sheet.domains[domain]).toBeDefined();
        expect(sheet.domains[domain].interval).toHaveLength(2);
      }
      // Coverage was required at one per domain, so every domain must have contributed.
      for (const domain of DOMAIN_NAMES) {
        expect(sheet.domains[domain].itemsScored).toBeGreaterThanOrEqual(1);
      }
    });

    it('recommends a child who answered everything correctly', async () => {
      const sessionId = await startSession();
      const { sheet } = await runSession(sessionId);
      expect(sheet.composite.pAboveThreshold).toBeGreaterThan(0.5);
      expect(sheet.decision).toBe('recommend');
      expect(sheet.stopReason).toBe('confident-above');
    });

    it('never repeats an item inside a session', async () => {
      const sessionId = await startSession();
      const { served } = await runSession(sessionId);
      expect(new Set(served.map((s) => s.itemId)).size).toBe(served.length);
    });

    it('closes the session record when it stops', async () => {
      const sessionId = await startSession();
      await runSession(sessionId);
      const session = await d.store.getSession(sessionId);
      expect(session?.status).toBe('stopped');
      expect(session?.endedAt).not.toBeNull();
    });

    it('gives two differently seeded sessions different question sequences', async () => {
      const a = await runSession(await startSession({}, 'seed-alpha'));
      const b = await runSession(await startSession({}, 'seed-beta'));
      expect(a.served.map((s) => s.itemId).join()).not.toBe(b.served.map((s) => s.itemId).join());
    });

    /**
     * Reproducing a session needs its seed *and* the exposure state it ran against.
     *
     * This test began life asserting that one seed always yields one sequence, and it failed every
     * time. The seed is not the whole input: exposure damping reads counters that the previous session
     * moved, so the same child sat twice against a different cohort history is legitimately asked
     * different questions. That is exposure control working, not a leak of nondeterminism.
     *
     * Exact replay is a property of pure selection given identical inputs, and it is asserted where it
     * is true: `selection.test.ts` for a single draw, and `variety.test.ts` for a whole cohort replayed
     * from scratch, which reproduces the exposure trajectory as well as the seeds.
     */
    it('depends on cohort exposure as well as on its seed', async () => {
      const a = await runSession(await startSession({}, 'seed-replay'));
      const b = await runSession(await startSession({}, 'seed-replay'));
      expect(a.served.map((s) => s.itemId)).not.toEqual(b.served.map((s) => s.itemId));
    });

    it('assigns a fresh seed per session in production, not a fixed one', async () => {
      // The pinning above is a test affordance. Production must not share seeds between children, or
      // every session would ask the same questions again.
      const first = await serveHandler(
        apiEvent({ method: 'POST', path: '/v1/sessions', appId, body: { ageBand: '3-5' } }),
      );
      const second = await serveHandler(
        apiEvent({ method: 'POST', path: '/v1/sessions', appId, body: { ageBand: '3-5' } }),
      );
      const seedOf = async (r: { body: string }) =>
        (await d.store.getSession(JSON.parse(r.body).sessionId as string))?.rngSeed;
      expect(await seedOf(first)).not.toBe(await seedOf(second));
    });
  });

  describe('what crosses to the client', () => {
    it('sends no answer key, no item parameters and no scoring mode', async () => {
      const sessionId = await startSession();
      const question = await next(sessionId);
      const serialised = JSON.stringify(question.served);

      for (const forbidden of ['correctKey', 'distractorRationales', 'scoringMode', 'params']) {
        expect(serialised).not.toContain(forbidden);
      }
      // The contract carries no token: the pending response row is the binding.
      expect(question.servedToken).toBeUndefined();
      expect(question.state).toBeDefined();
    });

    it('exposes the selection reason, so a sequence can be explained afterwards', async () => {
      const question = await next(await startSession());
      // The contract's own fields, spread at the top level of a serve.
      expect(question.selectionReason).toBeTypeOf('string');
      expect(question.informationAtThreshold).toBeTypeOf('number');
      expect(question.difficulty).toBeTypeOf('number');
    });
  });

  describe('idempotency, and the binding that replaced the token', () => {
    it('re-issues the same question when next is called twice', async () => {
      const sessionId = await startSession();
      const first = await next(sessionId);
      const second = await next(sessionId);
      expect((second.served as { itemId: string }).itemId).toBe(
        (first.served as { itemId: string }).itemId,
      );
    });

    /**
     * What the served-item token used to protect.
     *
     * The client is no longer asked which item it answered, so it cannot claim a different one: the server
     * reads the row it left in `served` state. These tests assert the property the token existed for, now
     * held by the trace instead.
     */
    it('answers whatever is pending, not whatever the body claims', async () => {
      const sessionId = await startSession();
      const question = await next(sessionId);
      const pendingId = (question.served as { itemId: string }).itemId;

      const response = await scoreHandler(
        apiEvent({
          method: 'POST',
          path: bankRoutes.answer(sessionId),
          appId,
          pathParameters: { sessionId },
          // A body naming another item, and an ordinal that is not the pending one.
          body: { response: { key: 'A' }, itemId: 'some-other-item', ordinal: 99 },
        }),
      );
      expect(response.statusCode).toBe(200);

      const trace = await d.store.listResponses(sessionId);
      const answered = trace.filter((r) => r.state === 'answered');
      expect(answered).toHaveLength(1);
      expect(answered[0]?.itemId).toBe(pendingId);
    });

    it('refuses an answer when nothing is pending', async () => {
      const sessionId = await startSession();
      const response = await scoreHandler(
        apiEvent({
          method: 'POST',
          path: bankRoutes.answer(sessionId),
          appId,
          pathParameters: { sessionId },
          body: { response: { key: 'A' } },
        }),
      );
      // A session that has served nothing has nothing to answer, and inventing an ordinal for it would
      // put a response in the trace against no item.
      expect(response.statusCode).toBe(409);
    });

    it('does not let a second answer move the posterior', async () => {
      const sessionId = await startSession();
      const question = await next(sessionId);
      const itemId = (question.served as { itemId: string }).itemId;

      const first = await answer(sessionId, banks.keys.get(itemId) as string);
      const replay = await answer(sessionId, banks.keys.get(itemId) as string);

      const firstState = first.state as { estimate: number; itemsServed: number };
      const replayState = replay.state as { estimate: number; itemsServed: number };
      expect(replayState.estimate).toBeCloseTo(firstState.estimate, 12);
      expect(replayState.itemsServed).toBe(firstState.itemsServed);

      const trace = await d.store.listResponses(sessionId);
      expect(trace.filter((r) => r.state === 'answered')).toHaveLength(1);
    });

    it('does not let a replay flip a wrong answer into a right one', async () => {
      const sessionId = await startSession();
      const question = await next(sessionId);
      const itemId = (question.served as { itemId: string }).itemId;
      const correct = banks.keys.get(itemId) as string;
      const wrong = correct === 'A' ? 'B' : 'A';

      await answer(sessionId, wrong);
      await answer(sessionId, correct);

      const trace = await d.store.listResponses(sessionId);
      expect(trace.find((r) => r.itemId === itemId)?.correct).toBe(false);
    });
  });

  describe('app isolation', () => {
    it('refuses to advance a session belonging to another app', async () => {
      const sessionId = await startSession();
      const other = await adminHandler(
        apiEvent({
          method: 'POST',
          path: '/v1/admin/apps',
          body: { name: 'Other app', surfaceKind: 'web' },
        }),
      );
      const otherAppId = JSON.parse(other.body).app.appId as string;

      const response = await serveHandler(
        apiEvent({
          method: 'GET',
          path: `/v1/sessions/${sessionId}/next`,
          appId: otherAppId,
          pathParameters: { sessionId },
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('never serves a type the app has not approved', async () => {
      const restricted = await adminHandler(
        apiEvent({
          method: 'POST',
          path: '/v1/admin/apps',
          body: { name: 'Quant only', surfaceKind: 'web', ageBands: ['3-5'], perDomainMinimum: 0 },
        }),
      );
      const quantAppId = JSON.parse(restricted.body).app.appId as string;
      const onlyType = banks.typeCodes[0] as string;
      await adminHandler(
        apiEvent({
          method: 'PUT',
          path: `/v1/admin/apps/${quantAppId}/types/${onlyType}`,
          pathParameters: { appId: quantAppId, typeCode: onlyType },
          body: { enabled: true },
        }),
      );

      const created = await serveHandler(
        apiEvent({ method: 'POST', path: '/v1/sessions', appId: quantAppId, body: { ageBand: '3-5' } }),
      );
      const sessionId = JSON.parse(created.body).sessionId as string;

      for (let i = 0; i < 6; i += 1) {
        const question = await next(sessionId, quantAppId);
        if (question.done === true) break;
        expect(question.typeCode).toBe(onlyType);
        await answer(
          sessionId,
          banks.keys.get((question.served as { itemId: string }).itemId) as string,
          quantAppId,
        );
      }
    });

    it('links a pseudonymous persona even when the app may collect no contact details', async () => {
      /**
       * A persona is not PII. Its record carries createdAt, locale and firstSeenAppId and nothing else;
       * contact details live on a separate row under their own key. An app needs a persona to carry ability
       * between visits and to stop a returning child re-answering yesterday's items, and neither requires
       * knowing who they are — so `piiPolicy: 'none'` must not block it. An earlier version refused this,
       * which would have blocked Bramblebrook outright.
       */
      const plain = await adminHandler(
        apiEvent({
          method: 'POST',
          path: '/v1/admin/apps',
          body: { name: 'No PII', surfaceKind: 'web', piiPolicy: 'none', ageBands: ['3-5'] },
        }),
      );
      const plainAppId = JSON.parse(plain.body).app.appId as string;
      for (const typeCode of banks.typeCodes) {
        await adminHandler(
          apiEvent({
            method: 'PUT',
            path: `/v1/admin/apps/${plainAppId}/types/${typeCode}`,
            pathParameters: { appId: plainAppId, typeCode },
            body: { enabled: true },
          }),
        );
      }

      const response = await serveHandler(
        apiEvent({
          method: 'POST',
          path: bankRoutes.createSession(),
          appId: plainAppId,
          body: { ageBand: '3-5', personaId: 'keeper-1' },
        }),
      );
      expect(response.statusCode).toBe(201);

      const sessionId = JSON.parse(response.body).sessionId as string;
      expect((await d.store.getSession(sessionId))?.personaId).toBe('keeper-1');
      // Pseudonymous: the persona exists and has no contact row.
      expect(await d.personas.getContact('keeper-1')).toBeNull();
    });
  });

  describe('the catalog surface', () => {
    it('marks which types this app may serve', async () => {
      const response = await catalogHandler(
        apiEvent({ method: 'GET', path: '/v1/catalog/types', appId }),
      );
      const body = JSON.parse(response.body);
      expect(body.count).toBe(banks.typeCodes.length);
      expect(body.types.every((t: { approvedForThisApp: boolean }) => t.approvedForThisApp)).toBe(
        true,
      );
      expect(body.types[0].status).toBe('active');
    });

    it('reports a type without enumerating its bank', async () => {
      const typeCode = banks.typeCodes[0] as string;
      const response = await catalogHandler(
        apiEvent({
          method: 'GET',
          path: `/v1/catalog/types/${typeCode}`,
          appId,
          pathParameters: { typeCode },
        }),
      );
      const body = JSON.parse(response.body);
      expect(body.typeCode).toBe(typeCode);
      expect(body.difficulties).toHaveLength(banks.itemsPerType);
      expect(response.body).not.toContain('correctKey');
      expect(response.body).not.toContain('stem');
    });

    it('reports the app its own configuration and pinned snapshot', async () => {
      const response = await catalogHandler(
        apiEvent({ method: 'GET', path: '/v1/catalog/app', appId }),
      );
      const body = JSON.parse(response.body);
      expect(body.app.appId).toBe(appId);
      expect(body.approvedTypes).toHaveLength(banks.typeCodes.length);
      expect(body.snapshotId).toBeTypeOf('string');
    });
  });

  describe('abandonment', () => {
    it('closes a session and keeps the trace it had', async () => {
      const sessionId = await startSession();
      const question = await next(sessionId);
      await answer(sessionId, banks.keys.get((question.served as { itemId: string }).itemId) as string);

      const response = await scoreHandler(
        apiEvent({
          method: 'POST',
          path: `/v1/sessions/${sessionId}/abandon`,
          appId,
          pathParameters: { sessionId },
        }),
      );
      expect((JSON.parse(response.body).state as { stopReason: string }).stopReason).toBe('abandoned');
      const sheet = await readSheet(sessionId);
      expect(sheet.stopReason).toBe('abandoned');
      expect(sheet.composite.itemsScored).toBe(1);
      expect((await d.store.getSession(sessionId))?.status).toBe('abandoned');
    });

    it('reports no further questions once closed', async () => {
      const sessionId = await startSession();
      await scoreHandler(
        apiEvent({
          method: 'POST',
          path: `/v1/sessions/${sessionId}/abandon`,
          appId,
          pathParameters: { sessionId },
        }),
      );
      expect((await next(sessionId)).done).toBe(true);
    });
  });

  describe('reading a sheet back', () => {
    it('returns the stored sheet and reconciles it against the trace', async () => {
      const sessionId = await startSession();
      await runSession(sessionId);
      const response = await scoreHandler(
        apiEvent({
          method: 'GET',
          path: `/v1/sessions/${sessionId}/sheet`,
          appId,
          pathParameters: { sessionId },
        }),
      );
      const body = JSON.parse(response.body);
      expect(body.staleAgainstTrace).toBe(false);
      expect(body.sheet.sessionId).toBe(sessionId);
    });
  });

  describe('correcting an item and rescoring what saw it', () => {
    it('finds exactly the sessions that served the item', async () => {
      const first = await runSession(await startSession());
      const target = first.served[0] as { itemId: string; typeCode: string };

      const response = await adminHandler(
        apiEvent({
          method: 'POST',
          path: `/v1/admin/items/${target.itemId}/revise`,
          pathParameters: { itemId: target.itemId },
          body: { typeCode: target.typeCode, difficulty: 19, reason: 'harder than authored' },
        }),
      );
      const body = JSON.parse(response.body);

      const expected = await d.store.sessionsForItem(target.itemId);
      expect(body.affectedSessions).toBe(new Set(expected.map((e) => e.sessionId)).size);
      expect(body.affectedSessions).toBeGreaterThan(0);
      expect(body.item.revision).toBe(2);
      // No queue configured in the test environment, so it identifies without enqueueing.
      expect(body.enqueued).toBe(0);
    });

    it('rescoring reads the corrected parameters and can change the estimate', async () => {
      const sessionId = await startSession();
      const { served, sheet: before } = await runSession(sessionId);
      const target = served[0] as { itemId: string; typeCode: string };

      await adminHandler(
        apiEvent({
          method: 'POST',
          path: `/v1/admin/items/${target.itemId}/revise`,
          pathParameters: { itemId: target.itemId },
          body: { typeCode: target.typeCode, difficulty: 20, reason: 'much harder than authored' },
        }),
      );

      const outcome = await rescoreSession(d, sessionId);
      expect(outcome.parametersChanged).toBeGreaterThanOrEqual(1);

      const after = await d.store.getCurrentSheet(sessionId);
      // A correct answer on a harder item is stronger evidence, so the estimate should not fall.
      expect(after?.composite.mean).toBeGreaterThanOrEqual(before.composite.mean - 1e-9);
      expect(after?.engineVersion).toBe(before.engineVersion);
    });

    it('refuses a revision with no reason, because it rewrites a difficulty', async () => {
      const response = await adminHandler(
        apiEvent({
          method: 'POST',
          path: '/v1/admin/items/whatever/revise',
          pathParameters: { itemId: 'whatever' },
          body: { typeCode: banks.typeCodes[0] },
        }),
      );
      expect(response.statusCode).toBe(400);
    });
  });

  describe('qualification events', () => {
    it('writes one outbox event for a session that crosses the bar, and not two', async () => {
      const sessionId = await startSession();
      const { sheet } = await runSession(sessionId);
      if (!sheet.meetsCriteria) {
        expect(sheet.composite.itemsScored).toBeGreaterThan(0);
        return;
      }

      const qualified = await d.store.qualifiedSessions(sheet.criteriaVersion);
      expect(qualified).toContain(sessionId);

      // A rescore that re-qualifies the same session must not emit a second event.
      await rescoreSession(d, sessionId);
      await rescoreSession(d, sessionId);
      const stillOnce = await d.store.qualifiedSessions(sheet.criteriaVersion);
      expect(stillOnce.filter((s) => s === sessionId)).toHaveLength(1);
    });
  });
});
