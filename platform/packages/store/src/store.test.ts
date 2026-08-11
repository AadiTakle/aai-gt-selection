import { randomUUID } from 'node:crypto';
import { networkInterfaces } from 'node:os';

import {
  DescribeTableCommand,
  DynamoDBClient,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  CRITERIA_V1,
  DEFAULT_VARIETY_CONFIG,
  type AppConfig,
  type DomainEstimate,
  type DomainName,
  type OutboxEvent,
  type QuestionTypeRecord,
  type RegistryItem,
  type ResponseRecord,
  type ScoreSheet,
  type SessionRecord,
  type SnapshotRecord,
} from '@platform/domain';

import {
  AnswerKeyStore,
  ITEM_SK_PREFIX,
  PERSONA_CONTACT_SK,
  PERSONA_META_SK,
  PersonaStore,
  PlatformStore,
  answerKeyPk,
  answerKeyRevisionSk,
  createDocumentClient,
  createRawClient,
  createTables,
  dayBucket,
  deleteTables,
  gsi1Sk,
  getItemRevision,
  getResponse,
  itemRevisionSk,
  listLifecycle,
  listOutbox,
  listSheetHistory,
  monthBucket,
  outboxPk,
  outboxSk,
  padOrdinal,
  personaPk,
  responseSk,
  sessionsForSnapshot,
  stripKeys,
  type StoreConfig,
} from './index.js';

/**
 * Integration tests against DynamoDB Local, spec section 15.
 *
 * Real tables with real indexes, because the things worth testing here are exactly the things a
 * mock cannot have: whether a conditional update actually rejects a retry, whether a sparse index
 * really excludes a row whose attributes are absent, and whether a transaction is really atomic.
 * A fake that answers those questions has become a second implementation of DynamoDB.
 *
 * Tables are suffixed with a random id and dropped afterwards, so two runs of this suite — or a run
 * alongside the handler suite — cannot see each other's rows.
 */

const DDB_PORT = Number(process.env.GT_DDB_PORT ?? 8456);
const REGION = 'us-east-1';

/**
 * Where DynamoDB Local might be, in preference order.
 *
 * `localhost` first, because that is where `scripts/dynamodb-local.sh` publishes it. The host's own
 * addresses follow, because a container published on `0.0.0.0` is still reachable through them when
 * something unrelated already holds the loopback binding on this port — which does happen on a
 * developer machine, and produced a bare "Method Not Allowed" the first time it did.
 */
function candidateEndpoints(): readonly string[] {
  const explicit = process.env.GT_DDB_ENDPOINT;
  if (explicit) return [explicit];
  const hosts = ['localhost', '127.0.0.1'];
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) hosts.push(address.address);
    }
  }
  return hosts.map((host) => `http://${host}:${DDB_PORT}`);
}

/**
 * Confirm the endpoint is DynamoDB, not merely something that answers.
 *
 * A TCP connection or an HTTP 200 proves nothing: any web server on the port will give both. Only a
 * real API call distinguishes "DynamoDB Local is up" from "this port belongs to someone else", and
 * getting that wrong means an integration suite that reports a protocol error instead of skipping.
 */
async function speaksDynamoDb(endpoint: string): Promise<boolean> {
  const client = new DynamoDBClient({
    endpoint,
    region: REGION,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    maxAttempts: 1,
    requestHandler: { requestTimeout: 2_000, connectionTimeout: 2_000 },
  });
  try {
    await client.send(new ListTablesCommand({ Limit: 1 }));
    return true;
  } catch {
    return false;
  } finally {
    client.destroy();
  }
}

async function resolveEndpoint(): Promise<string | null> {
  for (const endpoint of candidateEndpoints()) {
    if (await speaksDynamoDb(endpoint)) return endpoint;
  }
  return null;
}

const endpoint = await resolveEndpoint();
if (endpoint === null) {
  console.warn(
    `\n[store] No DynamoDB Local found on port ${DDB_PORT}, so the store integration suite is ` +
      'skipped. Start it with `npm run ddb:start` from platform/, and if another service already ' +
      'holds that port, point GT_DDB_ENDPOINT at the container instead.\n',
  );
}

const suite = endpoint === null ? describe.skip : describe;

const runId = randomUUID().slice(0, 8);
const cfg: StoreConfig = {
  tableName: `gt-platform-test-${runId}`,
  answerKeyTableName: `gt-answer-keys-test-${runId}`,
  personaTableName: `gt-personas-test-${runId}`,
  endpoint: endpoint ?? `http://localhost:${DDB_PORT}`,
  region: REGION,
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeType(typeCode: string): QuestionTypeRecord {
  return {
    typeCode,
    family: typeCode.slice(0, typeCode.lastIndexOf('-')),
    version: 1,
    domain: 'fluid',
    title: 'Matrix reasoning',
    uiRequirement: {
      elements: ['grid', 'optionRow'],
      counts: { grid: 1, optionRow: 1 },
      readingBand: null,
    },
    scoringModes: ['deterministic_key'],
    itemCount: 12,
    scorableCount: 9,
    difficultyRange: [4, 17],
    ageBands: ['K-1', '2-3'],
    createdAt: '2026-08-10T00:00:00.000Z',
    sourceRef: 'qbank-library/banks/FLU-MATRIX-01.jsonl',
  };
}

function makeItem(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    itemId: 'item-1',
    typeCode: 'FLU-MATRIX-01',
    revision: 1,
    domain: 'fluid',
    difficulty: 11,
    params: { b: 0.16666666666666666, a: 1.5, c: 0.25 },
    optionCount: 4,
    ageBands: ['K-1'],
    scoringMode: 'deterministic_key',
    content: { stem: 'complete the matrix', gridSize: 2, options: [{ key: 'A' }, { key: 'B' }] },
    syntheticOnly: true,
    validated: false,
    calibrated: false,
    ...overrides,
  };
}

function makeApp(appId: string): AppConfig {
  return {
    appId,
    name: 'Web screener',
    surfaceKind: 'web',
    status: 'active',
    abilityThreshold: 1,
    recommendProbability: 0.35,
    precision: { confidenceAbove: 0.85, confidenceBelow: 0.92, minItems: 8, maxItems: 40 },
    perDomainMinimum: 2,
    ageBands: ['K-1', '2-3'],
    uiCapabilities: ['grid', 'optionRow'],
    maxReadingBand: null,
    allowSyntheticItems: true,
    pinnedSnapshotId: null,
    variety: DEFAULT_VARIETY_CONFIG,
    piiPolicy: 'guardian_email',
    retentionDays: 90,
    webhookUrl: null,
    ownerContact: 'owner@example.test',
    createdAt: '2026-08-10T00:00:00.000Z',
  };
}

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const appId = overrides.appId ?? 'app-web';
  return {
    sessionId: 'sess-1',
    appId,
    personaId: null,
    snapshotId: 'snap-20260810-001',
    engineVersion: 'engine-2026.08.10',
    criteriaVersion: CRITERIA_V1.version,
    resolvedConfig: makeApp(appId),
    rngSeed: 'seed-1',
    ageBand: 'K-1',
    restrictedTypes: null,
    startedAt: '2026-08-10T12:00:00.000Z',
    endedAt: null,
    status: 'active',
    stopReason: null,
    decision: null,
    ...overrides,
  };
}

function makeResponse(overrides: Partial<ResponseRecord> = {}): ResponseRecord {
  return {
    sessionId: 'sess-1',
    ordinal: 1,
    state: 'served',
    itemId: 'item-1',
    itemRevision: 1,
    typeCode: 'FLU-MATRIX-01',
    domain: 'fluid',
    difficulty: 11,
    params: { b: 0.16666666666666666, a: 1.5, c: 0.25 },
    optionCount: 4,
    rawResponse: null,
    correct: null,
    latencyMs: null,
    metrics: null,
    flags: [],
    selection: {
      reason: 'max information at threshold',
      informationAtThreshold: 0.47120000000000006,
      candidatePoolSize: 812,
      k: 3,
      layer: 'randomesque',
    },
    idempotencyKey: null,
    servedAt: '2026-08-10T12:00:01.000Z',
    answeredAt: null,
    ...overrides,
  };
}

function makeEstimate(scope: DomainEstimate['scope'], mean: number): DomainEstimate {
  return {
    scope,
    mean,
    sd: 0.62,
    interval: [mean - 1.02, mean + 1.02],
    pAboveThreshold: 0.81,
    itemsScored: 4,
    itemsUnscorable: 0,
    informationAccumulated: 1.88,
  };
}

function makeSheet(overrides: Partial<ScoreSheet> = {}): ScoreSheet {
  const domains = {
    quantitative: makeEstimate('quantitative', 0.9),
    verbal: makeEstimate('verbal', 1.1),
    spatial: makeEstimate('spatial', 1.3),
    fluid: makeEstimate('fluid', 1.2),
  } satisfies Record<DomainName, DomainEstimate>;
  return {
    sessionId: 'sess-1',
    engineVersion: 'engine-2026.08.10',
    criteriaVersion: CRITERIA_V1.version,
    snapshotId: 'snap-20260810-001',
    computedAt: '2026-08-10T12:10:00.000Z',
    composite: makeEstimate('composite', 1.15),
    domains,
    itemsServed: 16,
    stopped: true,
    stopReason: 'confident-above',
    decision: 'recommend',
    passRoute: { via: 'composite' },
    meetsCriteria: true,
    derivedFromResponseCount: 16,
    unaccountedItemIds: [],
    ...overrides,
  };
}

function makeEvent(sessionId: string, overrides: Partial<OutboxEvent> = {}): OutboxEvent {
  return {
    eventId: `evt-${sessionId}-qualified`,
    kind: 'session-qualified',
    sessionId,
    criteriaVersion: CRITERIA_V1.version,
    occurredAt: '2026-08-10T12:10:00.000Z',
    payload: { decision: 'recommend' },
    ...overrides,
  };
}

/**
 * A returned domain object must carry no storage detail.
 *
 * Asserted everywhere a read happens, because the moment a caller can see `PK` it can start
 * depending on the key grammar, and the key grammar is supposed to be this package's business alone.
 */
function expectNoKeyAttributes(value: object): void {
  const keys = Object.keys(value);
  for (const attribute of ['PK', 'SK', 'GSI1PK', 'GSI2PK', 'GSI3PK', 'GSI4PK', 'GSI5PK', 'ttl']) {
    expect(keys).not.toContain(attribute);
  }
}

// ---------------------------------------------------------------------------
// Key grammar. Pure, so it runs whether or not the container is up.
// ---------------------------------------------------------------------------

describe('key grammar', () => {
  it('pads ordinals to four digits so lexicographic order is numeric order', () => {
    expect(padOrdinal(1)).toBe('0001');
    expect(padOrdinal(10)).toBe('0010');
    expect(responseSk(2) < responseSk(10)).toBe(true);
    expect(gsi1Sk('sess-1', 7)).toBe('SESSION#sess-1#0007');
  });

  it('keeps item history out of a current-item query, by prefix alone', () => {
    expect(itemRevisionSk('item-1', 3).startsWith(ITEM_SK_PREFIX)).toBe(false);
    expect(itemRevisionSk('item-1', 3)).toBe('ITEMREV#item-1#0003');
  });

  it('reads a month or day bucket from an instant or from either notation', () => {
    expect(monthBucket('2026-08-10T12:00:00.000Z')).toBe('2026-08');
    expect(monthBucket('202608')).toBe('2026-08');
    expect(monthBucket('2026-08')).toBe('2026-08');
    expect(dayBucket('2026-08-10T12:00:00.000Z')).toBe('2026-08-10');
    expect(() => monthBucket('2026')).toThrow(/yyyy-mm/);
  });

  it('strips every key attribute and nothing else', () => {
    const stripped = stripKeys<{ a: number }>({
      PK: 'x',
      SK: 'y',
      GSI4PK: 'z',
      GSI4SK: 'w',
      ttl: 1,
      a: 1,
    });
    expect(stripped).toEqual({ a: 1 });
  });
});

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

suite('PlatformStore against DynamoDB Local', () => {
  const raw = createRawClient({ endpoint: cfg.endpoint, region: cfg.region });
  const doc = createDocumentClient({ endpoint: cfg.endpoint, region: cfg.region });
  const store = new PlatformStore(cfg);
  const keys = new AnswerKeyStore(cfg);
  const personas = new PersonaStore(cfg);
  const ctx = { doc, tableName: cfg.tableName };

  beforeAll(async () => {
    await createTables(raw, cfg);
  });

  afterAll(async () => {
    await deleteTables(raw, cfg);
  });

  describe('question types are write-once', () => {
    it('rejects a second write for the same code', async () => {
      const type = makeType('FLU-WRITEONCE-01');
      await store.putType(type);
      await expect(store.putType({ ...type, title: 'edited' })).rejects.toThrow(/write-once/i);
      const stored = await store.getType(type.typeCode);
      expect(stored?.title).toBe('Matrix reasoning');
    });

    it('round-trips the record exactly, with no storage attributes left on it', async () => {
      const type = makeType('FLU-ROUNDTRIP-01');
      await store.putType(type);
      const stored = await store.getType(type.typeCode);
      expect(stored).toEqual(type);
      expectNoKeyAttributes(stored as object);
    });

    it('returns null for a code that was never written', async () => {
      expect(await store.getType('FLU-ABSENT-99')).toBeNull();
    });

    it('lists the types it has written', async () => {
      const codes = (await store.listTypes()).map((t) => t.typeCode);
      expect(codes).toContain('FLU-WRITEONCE-01');
      expect(codes).toContain('FLU-ROUNDTRIP-01');
    });
  });

  describe('type lifecycle is appended, never edited', () => {
    it('reports the newest status after two transitions', async () => {
      const type = makeType('FLU-LIFECYCLE-01');
      await store.putType(type);
      expect(await store.currentStatus(type.typeCode)).toBe('active');

      await store.appendLifecycle(
        type.typeCode,
        'deprecated',
        '2026-08-11T00:00:00.000Z',
        'superseded by -02',
      );
      await store.appendLifecycle(
        type.typeCode,
        'superseded',
        '2026-08-12T00:00:00.000Z',
        'FLU-MATRIX-02 published',
      );

      expect(await store.currentStatus(type.typeCode)).toBe('superseded');
      const events = await listLifecycle(ctx, type.typeCode);
      expect(events.map((e) => e.status)).toEqual(['deprecated', 'superseded']);
      expect(events[0]?.reason).toBe('superseded by -02');
      expectNoKeyAttributes(events[0] as object);
    });

    it('treats a type with no events as active rather than as an error', async () => {
      await store.putType(makeType('FLU-NOEVENTS-01'));
      expect(await store.currentStatus('FLU-NOEVENTS-01')).toBe('active');
    });
  });

  describe('items are revisioned in place, with history preserved', () => {
    it('round-trips an item exactly', async () => {
      const item = makeItem({ itemId: 'item-roundtrip' });
      await store.putItem(item);
      const stored = await store.getItem(item.typeCode, item.itemId);
      expect(stored).toEqual(item);
      expectNoKeyAttributes(stored as object);
    });

    it('bumps the revision, preserves the old parameters, and leaves the old revision readable', async () => {
      const item = makeItem({ itemId: 'item-revise', difficulty: 11 });
      await store.putItem(item);

      const revised = await store.reviseItem(
        item.typeCode,
        item.itemId,
        { difficulty: 15, params: { b: 1.5, a: 1.5, c: 0.25 }, validated: true },
        'expert review found it harder than authored',
      );

      expect(revised.revision).toBe(2);
      expect(revised.difficulty).toBe(15);
      expect(revised.params.b).toBe(1.5);
      expect(revised.validated).toBe(true);
      expect(await store.getItem(item.typeCode, item.itemId)).toEqual(revised);

      const history = await getItemRevision(ctx, item.typeCode, item.itemId, 1);
      expect(history?.revision).toBe(1);
      expect(history?.difficulty).toBe(11);
      expect(history?.params).toEqual(item.params);
      expect(history?.changeReason).toBe('expert review found it harder than authored');
      expect(history?.revisedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('keeps a chain of revisions readable after two corrections', async () => {
      const item = makeItem({ itemId: 'item-chain', difficulty: 5 });
      await store.putItem(item);
      await store.reviseItem(item.typeCode, item.itemId, { difficulty: 6 }, 'first');
      const third = await store.reviseItem(item.typeCode, item.itemId, { difficulty: 7 }, 'second');

      expect(third.revision).toBe(3);
      expect((await getItemRevision(ctx, item.typeCode, item.itemId, 1))?.difficulty).toBe(5);
      expect((await getItemRevision(ctx, item.typeCode, item.itemId, 2))?.difficulty).toBe(6);
      expect(await getItemRevision(ctx, item.typeCode, item.itemId, 3)).toBeNull();
    });

    it('lists current items for a type without their history rows', async () => {
      const typeCode = 'FLU-LIST-01';
      await store.putItem(makeItem({ itemId: 'list-a', typeCode }));
      await store.putItem(makeItem({ itemId: 'list-b', typeCode }));
      await store.reviseItem(typeCode, 'list-a', { difficulty: 19 }, 'correction');

      const listed = await store.listItemsForType(typeCode);
      expect(listed.map((i) => i.itemId).sort()).toEqual(['list-a', 'list-b']);
      expect(listed.every((i) => i.revision >= 1)).toBe(true);
    });

    it('refuses to revise an item that does not exist', async () => {
      await expect(
        store.reviseItem('FLU-MATRIX-01', 'no-such-item', { difficulty: 3 }, 'nope'),
      ).rejects.toThrow(/unknown item/i);
    });
  });

  describe('apps, approvals and keys', () => {
    it('round-trips an app config including its nested precision and variety blocks', async () => {
      const app = makeApp('app-roundtrip');
      await store.putApp(app);
      const stored = await store.getApp(app.appId);
      expect(stored).toEqual(app);
      expectNoKeyAttributes(stored as object);
    });

    it('reflects approval and revocation in the approved list', async () => {
      const appId = 'app-approvals';
      await store.putApp(makeApp(appId));
      await store.setApprovedType(appId, 'FLU-MATRIX-01', true, 'admin@example.test');
      await store.setApprovedType(appId, 'VER-MORPHO-01', true, 'admin@example.test');
      expect([...(await store.listApprovedTypes(appId))].sort()).toEqual([
        'FLU-MATRIX-01',
        'VER-MORPHO-01',
      ]);

      await store.setApprovedType(appId, 'FLU-MATRIX-01', false, 'admin@example.test');
      expect(await store.listApprovedTypes(appId)).toEqual(['VER-MORPHO-01']);

      await store.setApprovedType(appId, 'FLU-MATRIX-01', true, 'admin@example.test');
      expect([...(await store.listApprovedTypes(appId))].sort()).toEqual([
        'FLU-MATRIX-01',
        'VER-MORPHO-01',
      ]);
    });

    it('resolves a key hash to its app and an unknown hash to null', async () => {
      await store.putApp(makeApp('app-keys'));
      await store.putApiKey('app-keys', 'a'.repeat(64), 'primary');
      await store.putApiKey('app-keys', 'b'.repeat(64), 'rotation');
      await store.putApp(makeApp('app-other'));
      await store.putApiKey('app-other', 'c'.repeat(64), 'primary');

      expect(await store.resolveApiKey('a'.repeat(64))).toBe('app-keys');
      expect(await store.resolveApiKey('b'.repeat(64))).toBe('app-keys');
      expect(await store.resolveApiKey('c'.repeat(64))).toBe('app-other');
      expect(await store.resolveApiKey('d'.repeat(64))).toBeNull();
    });
  });

  describe('snapshots', () => {
    const snapshot = (snapshotId: string, createdAt: string): SnapshotRecord => ({
      snapshotId,
      createdAt,
      itemCount: 4534,
      typeCount: 53,
      s3Key: `${snapshotId}.json.gz`,
      checksum: 'sha256:deadbeef',
      publishedBy: 'admin@example.test',
      notes: 'initial publish',
    });

    it('round-trips a snapshot and finds the newest by monotonic id', async () => {
      await store.putSnapshot(snapshot('snap-20260810-001', '2026-08-10T00:00:00.000Z'));
      await store.putSnapshot(snapshot('snap-20260810-002', '2026-08-10T06:00:00.000Z'));
      await store.putSnapshot(snapshot('snap-20260809-009', '2026-08-09T00:00:00.000Z'));

      const stored = await store.getSnapshot('snap-20260810-001');
      expect(stored).toEqual(snapshot('snap-20260810-001', '2026-08-10T00:00:00.000Z'));
      expectNoKeyAttributes(stored as object);
      expect((await store.latestSnapshot())?.snapshotId).toBe('snap-20260810-002');
      expect(await store.getSnapshot('snap-never')).toBeNull();
    });
  });

  describe('sessions and the response trace', () => {
    it('round-trips a session including the frozen app config', async () => {
      const session = makeSession({ sessionId: 'sess-roundtrip', personaId: 'persona-1' });
      await store.putSession(session);
      const stored = await store.getSession(session.sessionId);
      expect(stored).toEqual(session);
      expectNoKeyAttributes(stored as object);
    });

    it('closes a session, deriving abandoned status from the stop reason', async () => {
      await store.putSession(makeSession({ sessionId: 'sess-stop' }));
      await store.finishSession(
        'sess-stop',
        'confident-above',
        'recommend',
        '2026-08-10T12:20:00.000Z',
      );
      const stopped = await store.getSession('sess-stop');
      expect(stopped?.status).toBe('stopped');
      expect(stopped?.stopReason).toBe('confident-above');
      expect(stopped?.decision).toBe('recommend');
      expect(stopped?.endedAt).toBe('2026-08-10T12:20:00.000Z');

      await store.putSession(makeSession({ sessionId: 'sess-abandon' }));
      await store.finishSession('sess-abandon', 'abandoned', null, '2026-08-10T12:30:00.000Z');
      expect((await store.getSession('sess-abandon'))?.status).toBe('abandoned');
    });

    it('returns the trace in served order, past the point where padding matters', async () => {
      const sessionId = 'sess-trace';
      await store.putSession(makeSession({ sessionId }));
      for (const ordinal of [10, 1, 2, 11]) {
        await store.putServedResponse(makeResponse({ sessionId, ordinal, itemId: `i-${ordinal}` }));
      }
      const trace = await store.listResponses(sessionId);
      expect(trace.map((r) => r.ordinal)).toEqual([1, 2, 10, 11]);
      expect(trace[0]).toEqual(makeResponse({ sessionId, ordinal: 1, itemId: 'i-1' }));
      expectNoKeyAttributes(trace[0] as object);
    });
  });

  describe('completeResponse is the idempotency guarantee (spec section 8.1)', () => {
    it('applies once, reports a retry, and does not let the retry change the mark', async () => {
      const sessionId = 'sess-idempotent';
      await store.putSession(makeSession({ sessionId }));
      await store.putServedResponse(makeResponse({ sessionId, ordinal: 1 }));

      const first = await store.completeResponse(sessionId, 1, {
        rawResponse: 'B',
        correct: true,
        latencyMs: 4210,
        metrics: { focusLosses: 0 },
        idempotencyKey: 'idem-1',
        answeredAt: '2026-08-10T12:00:09.000Z',
      });
      expect(first).toBe('applied');

      const retry = await store.completeResponse(sessionId, 1, {
        rawResponse: 'C',
        correct: false,
        latencyMs: 99,
        metrics: null,
        idempotencyKey: 'idem-1',
        answeredAt: '2026-08-10T12:00:20.000Z',
      });
      expect(retry).toBe('already-answered');

      const stored = await getResponse(ctx, sessionId, 1);
      expect(stored?.state).toBe('answered');
      expect(stored?.correct).toBe(true);
      expect(stored?.rawResponse).toBe('B');
      expect(stored?.latencyMs).toBe(4210);
      expect(stored?.answeredAt).toBe('2026-08-10T12:00:09.000Z');
    });

    it('records an unscorable response as answered with a null mark', async () => {
      const sessionId = 'sess-unscorable';
      await store.putSession(makeSession({ sessionId }));
      await store.putServedResponse(makeResponse({ sessionId, ordinal: 1 }));
      expect(
        await store.completeResponse(sessionId, 1, {
          rawResponse: { drawing: 'blob' },
          correct: null,
          latencyMs: 12000,
          metrics: null,
          idempotencyKey: null,
          answeredAt: '2026-08-10T12:01:00.000Z',
        }),
      ).toBe('applied');
      const stored = await getResponse(ctx, sessionId, 1);
      expect(stored?.state).toBe('answered');
      expect(stored?.correct).toBeNull();
    });

    it('reports a response that was never served rather than creating one', async () => {
      expect(
        await store.completeResponse('sess-never', 4, {
          rawResponse: 'A',
          correct: true,
          latencyMs: 10,
          metrics: null,
          idempotencyKey: null,
          answeredAt: '2026-08-10T12:00:00.000Z',
        }),
      ).toBe('already-answered');
      expect(await getResponse(ctx, 'sess-never', 4)).toBeNull();
    });
  });

  describe('index queries', () => {
    it('finds every session that served an item, with its ordinal (spec section 11.1)', async () => {
      const itemId = 'item-backfill';
      const served: readonly [string, number][] = [
        ['sess-bf-a', 3],
        ['sess-bf-b', 7],
        ['sess-bf-c', 12],
      ];
      for (const [sessionId, ordinal] of served) {
        await store.putSession(makeSession({ sessionId }));
        await store.putServedResponse(makeResponse({ sessionId, ordinal, itemId }));
        await store.putServedResponse(
          makeResponse({ sessionId, ordinal: ordinal + 1, itemId: 'item-unrelated' }),
        );
      }

      const found = [...(await store.sessionsForItem(itemId))].sort((a, b) =>
        a.sessionId.localeCompare(b.sessionId),
      );
      expect(found).toEqual([
        { sessionId: 'sess-bf-a', ordinal: 3 },
        { sessionId: 'sess-bf-b', ordinal: 7 },
        { sessionId: 'sess-bf-c', ordinal: 12 },
      ]);
      expect(await store.sessionsForItem('item-never-served')).toEqual([]);
    });

    it("returns a persona's sessions newest first", async () => {
      const personaId = 'persona-history';
      const starts = [
        ['sess-p-old', '2026-08-01T09:00:00.000Z'],
        ['sess-p-mid', '2026-08-05T09:00:00.000Z'],
        ['sess-p-new', '2026-08-09T09:00:00.000Z'],
      ] as const;
      for (const [sessionId, startedAt] of starts) {
        await store.putSession(makeSession({ sessionId, personaId, startedAt }));
      }
      expect(await store.sessionsForPersona(personaId)).toEqual([
        'sess-p-new',
        'sess-p-mid',
        'sess-p-old',
      ]);
      expect(await store.sessionsForPersona(personaId, 2)).toEqual(['sess-p-new', 'sess-p-mid']);
      expect(await store.sessionsForPersona('persona-unknown')).toEqual([]);
    });

    it('keeps anonymous sessions out of the persona index entirely', async () => {
      await store.putSession(makeSession({ sessionId: 'sess-anon', personaId: null }));
      expect(await store.sessionsForPersona('null')).toEqual([]);
    });

    it('lists an app’s sessions for a month, in either bucket notation', async () => {
      const appId = 'app-month';
      await store.putSession(
        makeSession({ sessionId: 'sess-m-1', appId, startedAt: '2026-08-02T09:00:00.000Z' }),
      );
      await store.putSession(
        makeSession({ sessionId: 'sess-m-2', appId, startedAt: '2026-08-20T09:00:00.000Z' }),
      );
      await store.putSession(
        makeSession({ sessionId: 'sess-m-3', appId, startedAt: '2026-09-01T09:00:00.000Z' }),
      );

      expect([...(await store.sessionsForApp(appId, '2026-08'))].sort()).toEqual([
        'sess-m-1',
        'sess-m-2',
      ]);
      expect([...(await store.sessionsForApp(appId, '202608'))].sort()).toEqual([
        'sess-m-1',
        'sess-m-2',
      ]);
      expect(await store.sessionsForApp(appId, '2026-09')).toEqual(['sess-m-3']);
    });

    it('enumerates the sessions a snapshot is responsible for', async () => {
      const snapshotId = 'snap-20260810-777';
      await store.putSession(makeSession({ sessionId: 'sess-s-1', snapshotId }));
      await store.putSession(makeSession({ sessionId: 'sess-s-2', snapshotId }));
      expect([...(await sessionsForSnapshot(ctx, snapshotId))].sort()).toEqual([
        'sess-s-1',
        'sess-s-2',
      ]);
    });
  });

  describe('score sheets and the transactional outbox', () => {
    it('writes the sheet, its history row and one outbox row per event, atomically', async () => {
      const sessionId = 'sess-sheet';
      const sheet = makeSheet({ sessionId });
      const event = makeEvent(sessionId);
      await store.putSheet(sheet, [event]);

      const current = await store.getCurrentSheet(sessionId);
      expect(current).toEqual(sheet);
      expectNoKeyAttributes(current as object);

      const history = await listSheetHistory(ctx, sessionId);
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(sheet);

      const events = await listOutbox(ctx, sheet.computedAt);
      expect(events.map((e) => e.eventId)).toContain(event.eventId);
      const stored = events.find((e) => e.eventId === event.eventId);
      expect(stored).toEqual(event);
      expectNoKeyAttributes(stored as object);
    });

    it('appends a history row per recompute while overwriting the current row', async () => {
      const sessionId = 'sess-recompute';
      const first = makeSheet({ sessionId, computedAt: '2026-08-10T12:10:00.000Z' });
      const second = makeSheet({
        sessionId,
        computedAt: '2026-08-11T09:00:00.000Z',
        composite: makeEstimate('composite', 0.4),
        decision: 'no-recommendation',
        meetsCriteria: false,
    passRoute: null,
    unaccountedItemIds: [],
      });

      await store.putSheet(first, []);
      await store.putSheet(second, []);

      expect((await store.getCurrentSheet(sessionId))?.computedAt).toBe(second.computedAt);
      const history = await listSheetHistory(ctx, sessionId);
      expect(history.map((s) => s.computedAt)).toEqual([first.computedAt, second.computedAt]);
    });

    it('collapses a duplicated event id rather than failing the transaction', async () => {
      const sessionId = 'sess-dupe';
      const sheet = makeSheet({ sessionId, computedAt: '2026-08-12T09:00:00.000Z' });
      const event = makeEvent(sessionId, { occurredAt: sheet.computedAt });
      await store.putSheet(sheet, [event, event]);
      const events = await listOutbox(ctx, sheet.computedAt);
      expect(events.filter((e) => e.eventId === event.eventId)).toHaveLength(1);
    });

    it('gives an outbox row a thirty day expiry rather than keeping it forever', async () => {
      const sessionId = 'sess-ttl';
      const sheet = makeSheet({ sessionId, computedAt: '2026-08-13T09:00:00.000Z' });
      const event = makeEvent(sessionId, { occurredAt: sheet.computedAt });
      await store.putSheet(sheet, [event]);
      const row = await doc.send(
        new GetCommand({
          TableName: cfg.tableName,
          Key: { PK: outboxPk(sheet.computedAt), SK: outboxSk(event.eventId) },
        }),
      );
      const expected = Math.floor(Date.parse(sheet.computedAt) / 1000) + 30 * 24 * 60 * 60;
      expect(row.Item?.ttl).toBe(expected);
    });
  });

  describe('GSI4 is sparse, so qualifying is a query and not a scan', () => {
    it('returns only the sessions whose sheet met the criteria', async () => {
      const criteriaVersion = 'criteria-sparse-test';
      await store.putSheet(
        makeSheet({ sessionId: 'sess-q-yes', criteriaVersion, meetsCriteria: true }),
        [],
      );
      await store.putSheet(
        makeSheet({
          sessionId: 'sess-q-no',
          criteriaVersion,
          meetsCriteria: false,
          decision: 'no-recommendation',
        }),
        [],
      );
      await store.putSheet(
        makeSheet({
          sessionId: 'sess-q-also',
          criteriaVersion,
          meetsCriteria: true,
          computedAt: '2026-08-14T09:00:00.000Z',
        }),
        [],
      );

      const qualified = await store.qualifiedSessions(criteriaVersion);
      expect([...qualified].sort()).toEqual(['sess-q-also', 'sess-q-yes']);
      expect(qualified).not.toContain('sess-q-no');
    });

    it('filters by a decision watermark', async () => {
      const criteriaVersion = 'criteria-watermark-test';
      await store.putSheet(
        makeSheet({
          sessionId: 'sess-w-early',
          criteriaVersion,
          computedAt: '2026-08-01T00:00:00.000Z',
        }),
        [],
      );
      await store.putSheet(
        makeSheet({
          sessionId: 'sess-w-late',
          criteriaVersion,
          computedAt: '2026-08-20T00:00:00.000Z',
        }),
        [],
      );
      expect(await store.qualifiedSessions(criteriaVersion, '2026-08-10')).toEqual([
        'sess-w-late',
      ]);
    });

    it('drops a session out of the index when a recompute puts it below the bar', async () => {
      const criteriaVersion = 'criteria-demote-test';
      const sessionId = 'sess-demoted';
      await store.putSheet(
        makeSheet({ sessionId, criteriaVersion, computedAt: '2026-08-15T09:00:00.000Z' }),
        [],
      );
      expect(await store.qualifiedSessions(criteriaVersion)).toEqual([sessionId]);

      await store.putSheet(
        makeSheet({
          sessionId,
          criteriaVersion,
          computedAt: '2026-08-16T09:00:00.000Z',
          meetsCriteria: false,
          decision: 'no-recommendation',
        }),
        [],
      );
      expect(await store.qualifiedSessions(criteriaVersion)).toEqual([]);
    });
  });

  describe('exposure counters', () => {
    it('counts serves per item and sessions per app', async () => {
      const appId = 'app-exposure';
      await store.putApp(makeApp(appId));
      for (let i = 0; i < 3; i += 1) await store.incrementExposure(appId, 'item-hot');
      await store.incrementExposure(appId, 'item-cool');
      await store.bumpAppSessionCount(appId);
      await store.bumpAppSessionCount(appId);

      const exposure = await store.exposureFor(appId, ['item-hot', 'item-cool', 'item-unserved']);
      expect(exposure.sessionCount).toBe(2);
      expect(exposure.servedCounts.get('item-hot')).toBe(3);
      expect(exposure.servedCounts.get('item-cool')).toBe(1);
      expect(exposure.servedCounts.has('item-unserved')).toBe(false);
      expect(exposure.servedCounts.get('item-hot')! / exposure.sessionCount).toBeCloseTo(1.5);
    });

    it('reports a zero session count for an app that has never started one', async () => {
      const exposure = await store.exposureFor('app-quiet', ['item-hot']);
      expect(exposure.sessionCount).toBe(0);
      expect(exposure.servedCounts.size).toBe(0);
    });

    it('keeps counters for one app out of another app’s view', async () => {
      await store.incrementExposure('app-exp-a', 'shared-item');
      await store.incrementExposure('app-exp-a', 'shared-item');
      await store.incrementExposure('app-exp-b', 'shared-item');
      expect((await store.exposureFor('app-exp-a', ['shared-item'])).servedCounts.get('shared-item')).toBe(2);
      expect((await store.exposureFor('app-exp-b', ['shared-item'])).servedCounts.get('shared-item')).toBe(1);
    });

    it('does not disturb the app config row it shares a partition with', async () => {
      const appId = 'app-exposure-config';
      const app = makeApp(appId);
      await store.putApp(app);
      await store.incrementExposure(appId, 'item-hot');
      await store.bumpAppSessionCount(appId);
      expect(await store.getApp(appId)).toEqual(app);
    });
  });

  describe('answer keys live in their own table', () => {
    it('round-trips a key at a revision and returns null for an absent one', async () => {
      await keys.put({
        itemId: 'item-1',
        typeCode: 'FLU-MATRIX-01',
        revision: 1,
        correctKey: 'B',
        scoringMode: 'deterministic_key',
        extra: { distractorRationales: { A: 'off by one' } },
      });
      await keys.put({
        itemId: 'item-1',
        typeCode: 'FLU-MATRIX-01',
        revision: 2,
        correctKey: 'C',
        scoringMode: 'deterministic_key',
        extra: {},
      });

      expect((await keys.get('item-1', 1))?.correctKey).toBe('B');
      expect((await keys.get('item-1', 2))?.correctKey).toBe('C');
      expect(await keys.get('item-1', 3)).toBeNull();
      expect(await keys.get('item-absent', 1)).toBeNull();
      expectNoKeyAttributes((await keys.get('item-1', 1)) as object);
    });

    it('is a different table from the registry, so a registry read cannot reach a key', async () => {
      const registryRow = await doc.send(
        new GetCommand({
          TableName: cfg.tableName,
          Key: { PK: answerKeyPk('item-1'), SK: answerKeyRevisionSk(1) },
        }),
      );
      expect(registryRow.Item).toBeUndefined();
    });
  });

  describe('personas hold the only PII, and only in one row', () => {
    it('deletes a contact on request and leaves the pseudonymous record intact', async () => {
      const personaId = 'persona-erasure';
      const ttlEpoch = Math.floor(Date.parse('2026-11-10T00:00:00.000Z') / 1000);
      await personas.create(personaId, 'en-US', 'app-web');
      await personas.putContact(personaId, 'guardian@example.test', 'consent-1', ttlEpoch);

      expect(await personas.getContact(personaId)).toEqual({
        guardianEmail: 'guardian@example.test',
      });

      await personas.deleteContact(personaId);
      expect(await personas.getContact(personaId)).toBeNull();

      const meta = await doc.send(
        new GetCommand({
          TableName: cfg.personaTableName,
          Key: { PK: personaPk(personaId), SK: PERSONA_META_SK },
        }),
      );
      expect(meta.Item).toBeDefined();
      expect(meta.Item?.firstSeenAppId).toBe('app-web');
      expect(meta.Item?.locale).toBe('en-US');
      expect(meta.Item?.guardianEmail).toBeUndefined();
    });

    it('writes the retention deadline as a ttl attribute', async () => {
      const personaId = 'persona-ttl';
      const ttlEpoch = Math.floor(Date.parse('2026-12-01T00:00:00.000Z') / 1000);
      await personas.create(personaId, null, 'app-web');
      await personas.putContact(personaId, 'guardian2@example.test', null, ttlEpoch);
      const row = await doc.send(
        new GetCommand({
          TableName: cfg.personaTableName,
          Key: { PK: personaPk(personaId), SK: PERSONA_CONTACT_SK },
        }),
      );
      expect(row.Item?.ttl).toBe(ttlEpoch);
      expect(row.Item?.collectedFrom).toBe('guardian');
      expect(row.Item?.robloxUsername).toBeUndefined();
      expect(row.Item?.childFirstName).toBeUndefined();
    });

    it('does not rewrite where a persona was first seen when create is retried', async () => {
      const personaId = 'persona-retry';
      await personas.create(personaId, 'en-US', 'app-web');
      await personas.create(personaId, 'fr-FR', 'app-roblox');
      const meta = await doc.send(
        new GetCommand({
          TableName: cfg.personaTableName,
          Key: { PK: personaPk(personaId), SK: PERSONA_META_SK },
        }),
      );
      expect(meta.Item?.firstSeenAppId).toBe('app-web');
      expect(meta.Item?.locale).toBe('en-US');
    });

    it('returns null for a persona with no contact row', async () => {
      await personas.create('persona-nocontact', null, 'app-web');
      expect(await personas.getContact('persona-nocontact')).toBeNull();
    });
  });

  describe('schema', () => {
    it('declares all six indexes from spec section 6.3 on the main table', async () => {
      const described = await raw.send(new DescribeTableCommand({ TableName: cfg.tableName }));
      const names = (described.Table?.GlobalSecondaryIndexes ?? [])
        .map((ix) => ix.IndexName)
        .sort();
      expect(names).toEqual(['GSI1', 'GSI2', 'GSI3', 'GSI4', 'GSI5', 'GSI6']);
    });

    it('is idempotent, so a second create against a live table is not an error', async () => {
      await expect(createTables(raw, cfg)).resolves.toBeUndefined();
    });

    it('tolerates deleting tables that are already gone', async () => {
      const absent: StoreConfig = {
        ...cfg,
        tableName: `absent-${runId}-a`,
        answerKeyTableName: `absent-${runId}-b`,
        personaTableName: `absent-${runId}-c`,
      };
      await expect(deleteTables(raw, absent)).resolves.toBeUndefined();
    });
  });
});
