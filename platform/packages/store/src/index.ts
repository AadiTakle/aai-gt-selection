import type {
  AppConfig,
  Decision,
  OutboxEvent,
  QuestionTypeRecord,
  RegistryItem,
  ResponseRecord,
  ScoreSheet,
  SessionRecord,
  SnapshotRecord,
  StopReason,
  TypeStatus,
} from '@platform/domain';

import { createDocumentClient, type RepoContext, type StoreConfig } from './client.js';
import * as apps from './apps-repo.js';
import * as exposure from './exposure-repo.js';
import * as items from './items-repo.js';
import * as sessions from './sessions-repo.js';
import * as sheets from './sheets-repo.js';
import * as snapshots from './snapshots-repo.js';
import * as types from './types-repo.js';

/**
 * The DynamoDB repository behind the whole platform.
 *
 * One table with six indexes, plus two isolated tables for the answer keys and the personas. The
 * shape is `docs/design/aws-question-platform.md` section 6 and every key string in it comes from
 * `keys.ts`.
 *
 * This class is a facade over per-entity modules rather than a monolith. Each module owns one
 * entity's access patterns and can be read on its own; this file exists so that a handler holds one
 * object instead of seven, and so the method list the rest of the platform is written against lives
 * in one place.
 *
 * Two things this class deliberately does not have. There is no method that updates a
 * `QuestionTypeRecord`: types are write-once (spec section 5.2) and the absence is the enforcement.
 * And there is no method that deletes anything from the registry, because spec section 5.2 rule 5
 * says deletion does not exist.
 */
export class PlatformStore {
  private readonly ctx: RepoContext;

  constructor(cfg: StoreConfig) {
    this.ctx = {
      doc: createDocumentClient({ endpoint: cfg.endpoint, region: cfg.region }),
      tableName: cfg.tableName,
    };
  }

  // types — no update method exists, by design

  putType(t: QuestionTypeRecord): Promise<void> {
    return types.putType(this.ctx, t);
  }

  getType(typeCode: string): Promise<QuestionTypeRecord | null> {
    return types.getType(this.ctx, typeCode);
  }

  listTypes(): Promise<readonly QuestionTypeRecord[]> {
    return types.listTypes(this.ctx);
  }

  appendLifecycle(
    typeCode: string,
    status: TypeStatus,
    at: string,
    reason: string,
  ): Promise<void> {
    return types.appendLifecycle(this.ctx, typeCode, status, at, reason);
  }

  currentStatus(typeCode: string): Promise<TypeStatus> {
    return types.currentStatus(this.ctx, typeCode);
  }

  // items

  putItem(i: RegistryItem): Promise<void> {
    return items.putItem(this.ctx, i);
  }

  getItem(typeCode: string, itemId: string): Promise<RegistryItem | null> {
    return items.getItem(this.ctx, typeCode, itemId);
  }

  reviseItem(
    typeCode: string,
    itemId: string,
    patch: items.ItemPatch,
    reason: string,
  ): Promise<RegistryItem> {
    return items.reviseItem(this.ctx, typeCode, itemId, patch, reason);
  }

  listItemsForType(typeCode: string): Promise<readonly RegistryItem[]> {
    return items.listItemsForType(this.ctx, typeCode);
  }

  // apps

  putApp(a: AppConfig): Promise<void> {
    return apps.putApp(this.ctx, a);
  }

  getApp(appId: string): Promise<AppConfig | null> {
    return apps.getApp(this.ctx, appId);
  }

  setApprovedType(
    appId: string,
    typeCode: string,
    enabled: boolean,
    by: string,
  ): Promise<void> {
    return apps.setApprovedType(this.ctx, appId, typeCode, enabled, by);
  }

  listApprovedTypes(appId: string): Promise<readonly string[]> {
    return apps.listApprovedTypes(this.ctx, appId);
  }

  putApiKey(appId: string, keyHash: string, label: string): Promise<void> {
    return apps.putApiKey(this.ctx, appId, keyHash, label);
  }

  resolveApiKey(keyHash: string): Promise<string | null> {
    return apps.resolveApiKey(this.ctx, keyHash);
  }

  // snapshots

  putSnapshot(s: SnapshotRecord): Promise<void> {
    return snapshots.putSnapshot(this.ctx, s);
  }

  getSnapshot(id: string): Promise<SnapshotRecord | null> {
    return snapshots.getSnapshot(this.ctx, id);
  }

  latestSnapshot(): Promise<SnapshotRecord | null> {
    return snapshots.latestSnapshot(this.ctx);
  }

  // sessions and responses

  putSession(s: SessionRecord): Promise<void> {
    return sessions.putSession(this.ctx, s);
  }

  getSession(id: string): Promise<SessionRecord | null> {
    return sessions.getSession(this.ctx, id);
  }

  finishSession(
    id: string,
    stopReason: StopReason,
    decision: Decision | null,
    at: string,
  ): Promise<void> {
    return sessions.finishSession(this.ctx, id, stopReason, decision, at);
  }

  putServedResponse(r: ResponseRecord): Promise<void> {
    return sessions.putServedResponse(this.ctx, r);
  }

  completeResponse(
    sessionId: string,
    ordinal: number,
    patch: sessions.ResponsePatch,
  ): Promise<'applied' | 'already-answered'> {
    return sessions.completeResponse(this.ctx, sessionId, ordinal, patch);
  }

  listResponses(sessionId: string): Promise<readonly ResponseRecord[]> {
    return sessions.listResponses(this.ctx, sessionId);
  }

  // sheets, transactional with the outbox

  putSheet(sheet: ScoreSheet, events: readonly OutboxEvent[]): Promise<void> {
    return sheets.putSheet(this.ctx, sheet, events);
  }

  getCurrentSheet(sessionId: string): Promise<ScoreSheet | null> {
    return sheets.getCurrentSheet(this.ctx, sessionId);
  }

  // index queries

  sessionsForItem(itemId: string): Promise<readonly sessions.ServedSessionOrdinal[]> {
    return sessions.sessionsForItem(this.ctx, itemId);
  }

  sessionsForPersona(personaId: string, limit?: number): Promise<readonly string[]> {
    return sessions.sessionsForPersona(this.ctx, personaId, limit);
  }

  sessionsForApp(appId: string, yyyymm: string, limit?: number): Promise<readonly string[]> {
    return sessions.sessionsForApp(this.ctx, appId, yyyymm, limit);
  }

  qualifiedSessions(criteriaVersion: string, since?: string): Promise<readonly string[]> {
    return sheets.qualifiedSessions(this.ctx, criteriaVersion, since);
  }

  // counters

  incrementExposure(appId: string, itemId: string): Promise<void> {
    return exposure.incrementExposure(this.ctx, appId, itemId);
  }

  bumpAppSessionCount(appId: string): Promise<void> {
    return exposure.bumpAppSessionCount(this.ctx, appId);
  }

  exposureFor(
    appId: string,
    itemIds: readonly string[],
  ): Promise<exposure.ExposureSnapshot> {
    return exposure.exposureFor(this.ctx, appId, itemIds);
  }
}

export { AnswerKeyStore } from './answer-keys.js';
export { PersonaStore } from './personas.js';
export type { PersonaContactRecord, PersonaMetaRecord } from './personas.js';

export type { ClientOptions, RepoContext, StoreConfig } from './client.js';
export { createDocumentClient, createRawClient, isConditionalCheckFailed } from './client.js';

export type { ExposureSnapshot } from './exposure-repo.js';

/** Every key string in the platform. Nothing outside `keys.ts` may build one. */
export * from './keys.js';

export {
  MAIN_TABLE_INDEXES,
  TTL_ATTRIBUTE,
  createTables,
  deleteTables,
  tableInputs,
  type IndexDefinition,
} from './schema.js';

/**
 * Readers the `PlatformStore` method list has no equivalent for.
 *
 * Each exists because this package makes a guarantee that would otherwise be unverifiable: prior
 * item revisions remain readable, a lifecycle is a sequence rather than a status, a sheet has a
 * history, an outbox row was really written, and a bad publish's blast radius can be enumerated
 * through `GSI5`. They are free functions taking a context rather than methods, so the class shape
 * the rest of the platform is written against stays exactly as the implementation plan specifies.
 */
export { getItemRevision, type ItemPatch, type ItemRevisionRecord } from './items-repo.js';
export { listLifecycle } from './types-repo.js';
export { getResponse, type ResponsePatch, type ServedSessionOrdinal } from './sessions-repo.js';
export { listSheetHistory } from './sheets-repo.js';
export { OUTBOX_TTL_DAYS, listOutbox } from './outbox-repo.js';
export { sessionsForSnapshot } from './snapshots-repo.js';
export type { ApiKeyRecord } from './apps-repo.js';

/**
 * Re-exported so that a consumer importing from `@platform/store` finds the record shapes the
 * implementation plan lists here. They are declared in `@platform/domain` and are not redefined:
 * the store persists them, it does not own them.
 */
export type { AnswerKeyRecord, OutboxEvent, SnapshotRecord } from '@platform/domain';
