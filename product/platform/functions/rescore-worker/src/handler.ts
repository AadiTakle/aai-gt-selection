import { createHash } from 'node:crypto';
import {
  CRITERIA_V1,
  type OutboxEvent,
  type ScoreSheet,
  type SelectionCandidate,
} from '@platform/domain';
import { computeSheet, toEngineConfig, type TraceEntry } from '@platform/scoring';
import { deps, log, type Deps } from '@platform/shared';

/**
 * Recompute sheets for sessions affected by a corrected item.
 *
 * The point worth stating: this does not have its own scoring logic. It rebuilds the trace and calls
 * the same `computeSheet` the live path calls, which is why a backfill and a live answer cannot
 * disagree. If this file contained a second derivation, a corrected difficulty could produce a
 * different decision here than the one production would have made, and nobody would know which was
 * right.
 *
 * Unlike the live path, this reads item parameters from the **registry** rather than from the trace.
 * That is the entire purpose: the trace records what was believed at the time, and a rescore asks
 * what the same answers mean under what is believed now.
 */

interface RescoreMessage {
  readonly sessionId: string;
  readonly reason: string;
}

interface SqsRecord {
  readonly messageId: string;
  readonly body: string;
}

interface SqsEvent {
  readonly Records: readonly SqsRecord[];
}

interface BatchResponse {
  readonly batchItemFailures: readonly { readonly itemIdentifier: string }[];
}

function qualificationEvents(sheet: ScoreSheet, previous: ScoreSheet | null): OutboxEvent[] {
  if (!sheet.meetsCriteria) return [];
  if (previous?.meetsCriteria && previous.criteriaVersion === sheet.criteriaVersion) return [];

  const eventId = createHash('sha256')
    .update(`${sheet.sessionId}:${sheet.criteriaVersion}:qualified`)
    .digest('hex')
    .slice(0, 32);

  return [
    {
      eventId,
      kind: 'session-qualified',
      sessionId: sheet.sessionId,
      criteriaVersion: sheet.criteriaVersion,
      occurredAt: sheet.computedAt,
      payload: {
        engineVersion: sheet.engineVersion,
        snapshotId: sheet.snapshotId,
        itemsScored: sheet.composite.itemsScored,
        pAboveThreshold: sheet.composite.pAboveThreshold,
        decision: sheet.decision,
        viaRescore: true,
      },
    },
  ];
}

export interface RescoreOutcome {
  readonly sessionId: string;
  readonly before: boolean;
  readonly after: boolean;
  readonly decisionChanged: boolean;
  readonly parametersChanged: number;
}

export async function rescoreSession(d: Deps, sessionId: string): Promise<RescoreOutcome> {
  const session = await d.store.getSession(sessionId);
  if (!session) throw new Error(`no session ${sessionId}`);

  const responses = await d.store.listResponses(sessionId);
  const answered = responses.filter((r) => r.state === 'answered');

  let parametersChanged = 0;
  const trace: TraceEntry[] = [];
  for (const response of answered) {
    const current = await d.store.getItem(response.typeCode, response.itemId);
    // The whole purpose of a rescore: read the parameters believed *now*, not the ones the trace
    // recorded. An item missing from the registry cannot happen through any supported path, since
    // nothing deletes; if it ever does, the trace's own parameters are the honest fallback.
    const params = current?.params ?? response.params;
    if (params.b !== response.params.b || params.a !== response.params.a) parametersChanged += 1;
    trace.push({
      ordinal: response.ordinal,
      itemId: response.itemId,
      typeCode: response.typeCode,
      domain: response.domain,
      difficulty: current?.difficulty ?? response.difficulty,
      params,
      correct: response.correct,
      latencyMs: response.latencyMs,
      rawResponse: response.rawResponse,
      flags: response.flags ?? [],
    });
  }

  const previous = await d.store.getCurrentSheet(sessionId);

  /**
   * The pool a rescore reasons about is the trace's own items at their current parameters.
   *
   * Not the snapshot: a finished session's stop reason is already recorded, and handing the engine a
   * catalog that has moved since would let a publish rewrite why a past session ended.
   */
  const candidates: SelectionCandidate[] = trace.map((entry) => ({
    itemId: entry.itemId,
    itemRevision: 1,
    typeCode: entry.typeCode,
    domain: entry.domain,
    params: entry.params,
    difficulty: entry.difficulty,
    optionCount: 4,
    ageBands: [],
    scoringMode: 'deterministic_key',
    markable: true,
    readingBand: null,
    syntheticOnly: false,
  }));

  const sheet = computeSheet({
    sessionId,
    snapshotId: session.snapshotId,
    config: toEngineConfig(session.resolvedConfig, session.ageBand),
    criteria: CRITERIA_V1,
    trace,
    candidates,
    itemsServed: responses.length,
    poolExhausted: session.stopReason === 'bank-exhausted',
    abandoned: session.stopReason === 'abandoned',
  });

  await d.store.putSheet(sheet, qualificationEvents(sheet, previous));

  return {
    sessionId,
    before: previous?.meetsCriteria ?? false,
    after: sheet.meetsCriteria,
    decisionChanged: (previous?.decision ?? null) !== sheet.decision,
    parametersChanged,
  };
}

export async function handler(event: SqsEvent): Promise<BatchResponse> {
  const d = deps();
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records ?? []) {
    let message: RescoreMessage;
    try {
      message = JSON.parse(record.body) as RescoreMessage;
    } catch {
      // An unparseable message will never parse. Reporting it as a failure would retry it until the
      // queue's redrive policy gives up, so it goes to the log and is dropped.
      log({ level: 'error', rescore: 'unparseable', messageId: record.messageId });
      continue;
    }

    try {
      const outcome = await rescoreSession(d, message.sessionId);
      log({
        level: 'info',
        rescore: 'done',
        reason: message.reason,
        ...outcome,
        newlyQualified: !outcome.before && outcome.after,
      });
    } catch (error) {
      log({
        level: 'error',
        rescore: 'failed',
        sessionId: message.sessionId,
        message: error instanceof Error ? error.message : String(error),
      });
      // Partial batch response: only this message is retried, not the nine that succeeded.
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
}
