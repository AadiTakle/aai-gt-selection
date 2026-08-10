import {
  deps,
  handle,
  notFound,
  ok,
  requireAppId,
  requirePathParam,
  type ApiRequest,
  type ApiResponse,
} from '@platform/shared';

/**
 * Read-only questions about the catalog and about the calling app.
 *
 * This is how an app discovers what it is allowed to serve and what rendering each type demands,
 * without ever asking for an item. It has read access to the registry and no access to anything
 * else — no answer keys, no personas, no sessions.
 */

async function listTypes(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const d = deps();

  const [types, approved] = await Promise.all([
    d.store.listTypes(),
    d.store.listApprovedTypes(appId),
  ]);
  const approvedSet = new Set(approved);
  const onlyApproved = request.query.approved === 'true';

  const statuses = await Promise.all(types.map((t) => d.store.currentStatus(t.typeCode)));

  const rows = types
    .map((type, i) => ({
      ...type,
      status: statuses[i],
      approvedForThisApp: approvedSet.has(type.typeCode),
    }))
    .filter((row) => !onlyApproved || row.approvedForThisApp);

  return ok({ types: rows, count: rows.length });
}

async function readType(request: ApiRequest): Promise<ApiResponse> {
  requireAppId(request);
  const typeCode = requirePathParam(request, 'typeCode');
  const d = deps();

  const type = await d.store.getType(typeCode);
  if (!type) throw notFound(`no question type ${typeCode}`);

  const [status, items] = await Promise.all([
    d.store.currentStatus(typeCode),
    d.store.listItemsForType(typeCode),
  ]);

  return ok({
    ...type,
    status,
    // Difficulty distribution rather than items: an app has no business enumerating a bank, and the
    // shape is what a planner actually wants.
    difficulties: items.map((i) => i.difficulty).sort((a, b) => a - b),
    scorableItemCount: items.filter((i) => i.scoringMode === 'deterministic_key').length,
  });
}

async function readApp(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const d = deps();

  const app = await d.store.getApp(appId);
  if (!app) throw notFound(`no app ${appId}`);

  const [approvedTypes, snapshot] = await Promise.all([
    d.store.listApprovedTypes(appId),
    app.pinnedSnapshotId ? d.store.getSnapshot(app.pinnedSnapshotId) : d.store.latestSnapshot(),
  ]);

  return ok({
    app: {
      appId: app.appId,
      name: app.name,
      surfaceKind: app.surfaceKind,
      status: app.status,
      ageBands: app.ageBands,
      uiCapabilities: app.uiCapabilities,
      maxReadingBand: app.maxReadingBand,
      precision: app.precision,
      perDomainMinimum: app.perDomainMinimum,
      // The thresholds an app is measured against are its own configuration, so it may read them.
      // No individual child's score is exposed anywhere in this response.
      abilityThreshold: app.abilityThreshold,
      recommendProbability: app.recommendProbability,
    },
    approvedTypes,
    snapshotId: snapshot?.snapshotId ?? null,
  });
}

export async function handler(event: Record<string, unknown>): Promise<ApiResponse> {
  return handle(event, async (request) => {
    if (request.path.endsWith('/catalog/app')) return readApp(request);
    if (request.pathParameters.typeCode) return readType(request);
    return listTypes(request);
  });
}
