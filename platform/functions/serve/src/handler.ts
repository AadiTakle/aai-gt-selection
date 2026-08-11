import { randomUUID } from 'node:crypto';
import type { CreateSessionResponse, NextResponse } from '@gt/qbank/wire';
import { CRITERIA_V1, type ResponseRecord, type SessionRecord } from '@platform/domain';
import { ENGINE_VERSION, toEngineConfig } from '@platform/scoring';
import { selectNext } from '@platform/selection';
import {
  badRequest,
  created,
  deps,
  forbidden,
  handle,
  loadSession,
  notFound,
  ok,
  parseJsonBody,
  personaRecentItems,
  requireAppId,
  requirePathParam,
  selectionRequestFor,
  sheetFor,
  toQbankState,
  type ApiRequest,
  type ApiResponse,
} from '@platform/shared';

/**
 * Starting a session, and choosing what to ask next.
 *
 * Speaks `@gt/qbank`'s wire contract, so a client written against the Express prototype — Bramblebrook
 * included — reaches this without changing its request shapes. The response types are imported rather than
 * redeclared, which is the point of that contract: a response that stops matching stops compiling.
 *
 * This function has no IAM permission on the answer-key table, so no code path here can obtain a key
 * whatever it asks for. That is why serving and scoring are separate functions rather than two routes.
 *
 * ## Measurement configuration is server-authoritative
 *
 * `CreateSessionRequest` lets a caller ask for an ability threshold, a precision step, a per-domain minimum
 * and a recommendation probability. On this platform those come from the registered app and a request cannot
 * move them: a client that could lower its own bar could manufacture a recommendation. The request is not
 * rejected for carrying them — that would break existing callers for no gain — and what was actually used
 * comes back in `config`, which is what the contract's `ResolvedSessionConfig` is for.
 *
 * `types` is different and is honoured, narrowed to the app's approved list. It is how a caller asks for one
 * battery rather than the whole pool, and an unapproved or unknown code is a 400 rather than a silent
 * narrowing, because a typo would otherwise shrink a child's pool with nobody noticing.
 */

interface CreateBody {
  readonly types?: readonly string[];
  readonly ageBand?: string;
  readonly personaId?: string;
  readonly locale?: string;
  readonly seed?: number;
}

async function createSession(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const d = deps();
  const body = request.body ? parseJsonBody<CreateBody>(request) : {};

  const app = await d.store.getApp(appId);
  if (!app) throw notFound(`no app ${appId}`);
  if (app.status !== 'active') throw forbidden('app is disabled');

  const snapshot = app.pinnedSnapshotId
    ? await d.store.getSnapshot(app.pinnedSnapshotId)
    : await d.store.latestSnapshot();
  if (!snapshot) throw notFound('no catalog snapshot has been published');

  const ageBand = body.ageBand ?? null;
  if (ageBand !== null && app.ageBands.length > 0 && !app.ageBands.includes(ageBand)) {
    throw badRequest(`app does not serve age band ${ageBand}`, { serves: app.ageBands });
  }

  const approved = new Set(await d.store.listApprovedTypes(appId));
  const requested = body.types ?? null;
  if (requested) {
    const unapproved = requested.filter((code) => !approved.has(code));
    if (unapproved.length > 0) {
      throw badRequest('one or more requested types are not approved for this app', { unapproved });
    }
    if (requested.length === 0) throw badRequest('types was supplied but empty');
  }

  /**
   * A persona is created only when the app supplies one, and a persona is not PII.
   *
   * An earlier version refused this whenever `piiPolicy` was `'none'`, which conflated two different things
   * and would have blocked Bramblebrook outright. A persona record is pseudonymous by design — spec §6.4 puts
   * `createdAt`, `locale` and `firstSeenAppId` on `META` and nothing else — and contact details live on a
   * separate `CONTACT` row under their own key. An app needs a persona to carry ability between visits and to
   * stop a returning child re-answering yesterday's items, and neither requires knowing who they are.
   *
   * So `piiPolicy` gates writing `CONTACT`, which is the only row that identifies anyone. Linking a
   * pseudonymous persona is always allowed.
   */
  let personaId: string | null = null;
  if (body.personaId) {
    personaId = body.personaId;
    await d.personas.create(personaId, body.locale ?? null, appId);
  }

  const session: SessionRecord = {
    sessionId: `sess-${randomUUID()}`,
    appId,
    personaId,
    snapshotId: snapshot.snapshotId,
    engineVersion: ENGINE_VERSION,
    criteriaVersion: CRITERIA_V1.version,
    // Frozen. An app edit mid-session cannot change the rules a child is measured under.
    resolvedConfig: app,
    // A caller may pin the seed for a reproducible session; otherwise the platform picks one, because two
    // children sharing a seed would be asked the same questions.
    rngSeed: body.seed === undefined ? randomUUID() : String(body.seed),
    ageBand,
    restrictedTypes: requested ? [...requested] : null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: 'active',
    stopReason: null,
    decision: null,
  };

  await d.store.putSession(session);
  // The exposure denominator. Bumped at session start rather than at first item so that an abandoned
  // session still counts, which is the honest denominator.
  await d.store.bumpAppSessionCount(appId);

  const loaded = await loadSession(d, session.sessionId, appId);
  const sheet = sheetFor(loaded);
  await d.store.putSheet(sheet, []);

  const engineConfig = toEngineConfig(app, ageBand);
  const response: CreateSessionResponse = {
    sessionId: session.sessionId,
    poolSize: loaded.eligibleCount,
    config: {
      abilityThreshold: engineConfig.abilityThreshold,
      precision: engineConfig.precision,
      ...(ageBand ? { ageBand } : {}),
      perDomainMinimum: engineConfig.perDomainMinimum,
      recommendProbability: engineConfig.recommendProbability,
    },
    state: toQbankState(sheet),
  };
  return created(response);
}

async function nextItem(request: ApiRequest): Promise<ApiResponse> {
  const appId = requireAppId(request);
  const sessionId = requirePathParam(request, 'sessionId');
  const d = deps();

  const loaded = await loadSession(d, sessionId, appId);

  if (loaded.session.status !== 'active') {
    const stored = await d.store.getCurrentSheet(sessionId);
    const done: NextResponse = { done: true, state: toQbankState(stored ?? sheetFor(loaded)) };
    return ok(done);
  }

  /**
   * A pending item is re-issued rather than replaced.
   *
   * An app that loses the response to `next` and calls it again must get the same question back. The
   * alternative silently burns an item from the pool and leaves an orphan row in the trace on every dropped
   * connection. It is also what makes the answer route need no token: the pending row is the binding.
   */
  if (loaded.pending) {
    const item = await d.store.getItem(loaded.pending.typeCode, loaded.pending.itemId);
    if (!item) throw notFound(`item ${loaded.pending.itemId} is no longer in the registry`);
    return ok(servedResponse(loaded.pending, item.content, toQbankState(sheetFor(loaded))));
  }

  const sheet = sheetFor(loaded);
  if (sheet.stopped) {
    await d.store.finishSession(
      sessionId,
      sheet.stopReason ?? 'item-cap',
      sheet.decision,
      new Date().toISOString(),
    );
    await d.store.putSheet(sheet, []);
    return ok({ done: true, state: toQbankState(sheet) } satisfies NextResponse);
  }

  const ordinal = loaded.responses.length + 1;
  const baseRequest = selectionRequestFor(loaded, ordinal);
  const exposure = await d.store.exposureFor(
    appId,
    baseRequest.index.items.map((c) => c.itemId),
  );
  const recent = await personaRecentItems(d, loaded.session);

  const chosen = selectNext({ ...baseRequest, exposure, personaRecentItemIds: recent });

  if (!chosen) {
    // Discovered here, because this is the only place that asks the pool for something. Scoring never has
    // to reason about exhaustion.
    const exhausted = sheetFor(loaded, { poolExhausted: true });
    await d.store.finishSession(
      sessionId,
      exhausted.stopReason ?? 'bank-exhausted',
      exhausted.decision,
      new Date().toISOString(),
    );
    await d.store.putSheet(exhausted, []);
    return ok({ done: true, state: toQbankState(exhausted) } satisfies NextResponse);
  }

  const { candidate, trace } = chosen;
  const item = await d.store.getItem(candidate.typeCode, candidate.itemId);
  if (!item) throw notFound(`item ${candidate.itemId} is in the snapshot but not the registry`);

  const record: ResponseRecord = {
    sessionId,
    ordinal,
    state: 'served',
    itemId: candidate.itemId,
    itemRevision: candidate.itemRevision,
    typeCode: candidate.typeCode,
    domain: candidate.domain,
    difficulty: candidate.difficulty,
    params: candidate.params,
    optionCount: candidate.optionCount,
    rawResponse: null,
    correct: null,
    latencyMs: null,
    metrics: null,
    // Grading attaches these; nothing is known at serve time.
    flags: [],
    selection: trace,
    idempotencyKey: null,
    servedAt: new Date().toISOString(),
    answeredAt: null,
  };

  await d.store.putServedResponse(record);
  await d.store.incrementExposure(appId, candidate.itemId);

  return ok(servedResponse(record, item.content, toQbankState(sheet)));
}

/**
 * The contract spreads the served fields at the top level rather than nesting them, and `served` is a
 * `ServedItem` — the bank record without its answer or its scoring rule.
 */
function servedResponse(
  record: ResponseRecord,
  content: Record<string, unknown>,
  state: ReturnType<typeof toQbankState>,
): NextResponse {
  return {
    done: false,
    served: {
      itemId: record.itemId,
      typeCode: record.typeCode,
      domain: record.domain,
      difficulty: record.difficulty,
      ageBands: [],
      content,
    },
    typeCode: record.typeCode,
    domain: record.domain,
    difficulty: record.difficulty,
    informationAtThreshold: record.selection.informationAtThreshold,
    selectionReason: record.selection.reason,
    state,
  } as NextResponse;
}

export async function handler(event: Record<string, unknown>): Promise<ApiResponse> {
  return handle(event, async (request) => {
    if (request.method === 'POST') return createSession(request);
    return nextItem(request);
  });
}
