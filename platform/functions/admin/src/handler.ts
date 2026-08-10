import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  DEFAULT_VARIETY_CONFIG,
  type AppConfig,
  type PrecisionConfig,
  type VarietyConfig,
} from '@platform/domain';
import {
  badRequest,
  created,
  deps,
  handle,
  notFound,
  ok,
  parseJsonBody,
  requirePathParam,
  unprocessable,
  type ApiRequest,
  type ApiResponse,
  type Deps,
} from '@platform/shared';
import { publishCatalog } from './publish.js';

/**
 * Administration: publishing a catalog, registering an app, approving a type, correcting an item.
 *
 * Behind IAM SigV4 rather than an app key, because an app key ships inside a Roblox place or a web
 * bundle and must be assumed public. There is deliberately no api-key route to anything here.
 */

async function putObjectToS3(bucket: string, key: string, body: Buffer): Promise<void> {
  const { PutObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
  await new S3Client({}).send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentEncoding: 'gzip' }),
  );
}

async function publish(request: ApiRequest): Promise<ApiResponse> {
  const d = deps();
  const body = request.body
    ? parseJsonBody<{ publishedBy?: string; notes?: string; bankDir?: string }>(request)
    : {};

  const result = await publishCatalog(d, {
    publishedBy: body.publishedBy ?? 'admin',
    notes: body.notes ?? '',
    ...(body.bankDir ? { bankDir: body.bankDir } : {}),
    putObject: (key, buffer) => putObjectToS3(d.env.snapshotBucket, key, buffer),
  });

  return created(result);
}

interface CreateAppBody {
  readonly name: string;
  readonly surfaceKind: string;
  readonly abilityThreshold?: number;
  readonly recommendProbability?: number;
  readonly precision?: PrecisionConfig;
  readonly perDomainMinimum?: number;
  readonly ageBands?: readonly string[];
  readonly uiCapabilities?: readonly string[];
  readonly maxReadingBand?: string | null;
  readonly allowSyntheticItems?: boolean;
  readonly variety?: Partial<VarietyConfig>;
  readonly piiPolicy?: 'none' | 'guardian_email';
  readonly retentionDays?: number;
  readonly webhookUrl?: string | null;
  readonly ownerContact?: string;
}

async function createApp(request: ApiRequest): Promise<ApiResponse> {
  const d = deps();
  const body = parseJsonBody<CreateAppBody>(request);
  if (!body.name) throw badRequest('name is required');

  const app: AppConfig = {
    appId: `app-${randomUUID()}`,
    name: body.name,
    surfaceKind: body.surfaceKind ?? 'web',
    status: 'active',
    // Defaults copied from the prototype screener rather than invented here.
    abilityThreshold: body.abilityThreshold ?? 1.0,
    recommendProbability: body.recommendProbability ?? 0.35,
    precision: body.precision ?? {
      confidenceAbove: 0.75,
      confidenceBelow: 0.97,
      minItems: 8,
      maxItems: 16,
    },
    perDomainMinimum: body.perDomainMinimum ?? 2,
    ageBands: body.ageBands ?? [],
    uiCapabilities: body.uiCapabilities ?? [],
    maxReadingBand: body.maxReadingBand ?? null,
    allowSyntheticItems: body.allowSyntheticItems ?? true,
    pinnedSnapshotId: null,
    variety: { ...DEFAULT_VARIETY_CONFIG, ...(body.variety ?? {}) },
    piiPolicy: body.piiPolicy ?? 'none',
    retentionDays: body.retentionDays ?? 365,
    webhookUrl: body.webhookUrl ?? null,
    ownerContact: body.ownerContact ?? '',
    createdAt: new Date().toISOString(),
  };

  await d.store.putApp(app);

  /**
   * The key is returned once and stored only as a digest.
   *
   * There is no route that reads it back, because there is no way to read it back. Losing it means
   * issuing another one, which is the correct trade for a credential that cannot be recovered from a
   * database dump.
   */
  const apiKey = `gtk_${randomBytes(24).toString('base64url')}`;
  const keyHash = createHash('sha256').update(apiKey).digest('hex');
  await d.store.putApiKey(app.appId, keyHash, 'initial');

  return created({ app, apiKey, apiKeyShownOnce: true });
}

/**
 * Approve a type for an app, refusing when the app cannot render it.
 *
 * This is the reason an app declares `uiCapabilities`. Approving `SPA-PUNCH-01` on a voice-only
 * surface would otherwise be discovered by a child looking at a question that cannot be drawn, and the
 * UI contract already knows the answer.
 */
async function approveType(request: ApiRequest): Promise<ApiResponse> {
  const d = deps();
  const appId = requirePathParam(request, 'appId');
  const typeCode = requirePathParam(request, 'typeCode');
  const body = request.body
    ? parseJsonBody<{ enabled?: boolean; by?: string; force?: boolean }>(request)
    : {};
  const enabled = body.enabled ?? true;

  const app = await d.store.getApp(appId);
  if (!app) throw notFound(`no app ${appId}`);

  const type = await d.store.getType(typeCode);
  if (!type) throw notFound(`no question type ${typeCode}`);

  if (enabled && !body.force) {
    const status = await d.store.currentStatus(typeCode);
    if (status !== 'active') {
      throw unprocessable(`type ${typeCode} is ${status}`, { status });
    }

    /**
     * The requirement comes from the registry row, not from re-deriving it here.
     *
     * `planFor` reads the bank files off disk, which a deployed Lambda does not have and which is
     * wrong even where it works: the requirement frozen at publish time is the one describing the
     * items this app would actually be served. Deriving it again at approval time reads whatever the
     * filesystem happens to hold now.
     *
     * An app that declares no capabilities is not asserting it can render nothing; it is declining to
     * declare. Validation is skipped rather than failing everything closed, because the alternative
     * makes `uiCapabilities` mandatory for every caller including a test harness.
     */
    const required = type.uiRequirement.elements;
    const missing = required.filter((element) => !app.uiCapabilities.includes(element));
    if (app.uiCapabilities.length > 0 && missing.length > 0) {
      throw unprocessable(`app cannot render ${typeCode}`, {
        missingUiElements: missing,
        appCapabilities: app.uiCapabilities,
      });
    }
  }

  await d.store.setApprovedType(appId, typeCode, enabled, body.by ?? 'admin');
  return ok({ appId, typeCode, enabled });
}

/**
 * Correct an item, then queue every session that ever saw it.
 *
 * This is the path the whole storage design exists to serve. The GSI1 query answers "who saw this
 * item" in one call, and rescoring is enqueued rather than done inline because a popular item can
 * appear in more sessions than a request can process.
 */
async function reviseItem(request: ApiRequest): Promise<ApiResponse> {
  const d = deps();
  const itemId = requirePathParam(request, 'itemId');
  const body = parseJsonBody<{
    typeCode: string;
    difficulty?: number;
    validated?: boolean;
    calibrated?: boolean;
    reason: string;
    enqueueRescore?: boolean;
  }>(request);

  if (!body.typeCode) throw badRequest('typeCode is required to locate the item');
  if (!body.reason) throw badRequest('reason is required, because this rewrites a difficulty');

  const existing = await d.store.getItem(body.typeCode, itemId);
  if (!existing) throw notFound(`no item ${itemId} under ${body.typeCode}`);

  const patch: Record<string, unknown> = {};
  if (typeof body.difficulty === 'number') {
    patch.difficulty = body.difficulty;
    // Recompute b from the corrected difficulty. a and c are properties of the item's format, not of
    // its difficulty, so they are left alone.
    patch.params = {
      ...existing.params,
      b: (body.difficulty - 10.5) / 3,
    };
  }
  if (typeof body.validated === 'boolean') patch.validated = body.validated;
  if (typeof body.calibrated === 'boolean') patch.calibrated = body.calibrated;
  if (Object.keys(patch).length === 0) throw badRequest('nothing to revise');

  const revised = await d.store.reviseItem(body.typeCode, itemId, patch, body.reason);

  const affected = await d.store.sessionsForItem(itemId);
  const sessionIds = [...new Set(affected.map((a) => a.sessionId))];

  let enqueued = 0;
  if (body.enqueueRescore !== false && sessionIds.length > 0 && d.env.rescoreQueueUrl) {
    enqueued = await enqueueRescore(d, sessionIds);
  }

  return ok({
    item: revised,
    affectedSessions: sessionIds.length,
    enqueued,
    note:
      d.env.rescoreQueueUrl === null
        ? 'no rescore queue configured; sessions were identified but not enqueued'
        : undefined,
  });
}

async function enqueueRescore(d: Deps, sessionIds: readonly string[]): Promise<number> {
  const { SQSClient, SendMessageBatchCommand } = await import('@aws-sdk/client-sqs');
  const client = new SQSClient({});
  let sent = 0;
  for (let i = 0; i < sessionIds.length; i += 10) {
    const chunk = sessionIds.slice(i, i + 10);
    await client.send(
      new SendMessageBatchCommand({
        QueueUrl: d.env.rescoreQueueUrl as string,
        Entries: chunk.map((sessionId, n) => ({
          Id: `m${i + n}`,
          MessageBody: JSON.stringify({ sessionId, reason: 'item-revised' }),
        })),
      }),
    );
    sent += chunk.length;
  }
  return sent;
}

export async function handler(event: Record<string, unknown>): Promise<ApiResponse> {
  return handle(event, async (request) => {
    if (request.path.endsWith('/catalog/publish')) return publish(request);
    if (request.path.endsWith('/revise')) return reviseItem(request);
    if (request.pathParameters.typeCode) return approveType(request);
    return createApp(request);
  });
}
