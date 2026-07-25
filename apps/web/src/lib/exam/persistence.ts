import 'server-only';

import type { ExamScore } from '@gt-selection/exam-scoring';
import { createClient } from '@supabase/supabase-js';

import { getServerEnvironment } from '@/lib/env';

import type { RawBankItem } from './bank-loader';

/**
 * Supabase persistence for the adaptive exam trace (BUILD_PLAN §6; D-019).
 *
 * SERVER-ONLY. Everything here runs inside a route handler; the browser never
 * holds a proctor session, never sees an answer key, and never talks to the
 * `api.exam_*` RPCs directly.
 *
 * Ownership follows D-019 exactly:
 *   - the DATABASE stores the trace and verifies each raw answer against the
 *     server-only key it holds (`app.exam_score_response`, inside
 *     `api.exam_submit_response`);
 *   - `@gt-selection/exam-engine` selects; `@gt-selection/exam-scoring` scores,
 *     and its output is stored VERBATIM through `api.exam_record_outcome`. The
 *     demoted `app.exam_compute_outcome` is never called.
 *
 * RPCs used, in the order a session touches them:
 *   api.exam_create_participant → api.exam_start_session → (per item)
 *   api.exam_register_item → api.exam_submit_response → api.exam_record_outcome.
 *
 * DEGRADED MODE IS THE DEFAULT. Persistence is opt-in per environment and every
 * call is best-effort: a missing config, an unreachable database, or a rejected
 * RPC returns `null`/`false` after a `console.warn`, and the caller carries on.
 * A child's exam must never fail because a write failed.
 */

/** Identity of the proctor persona the exam RPCs require (`admissions_operator`). */
interface ProctorConfig {
  url: string;
  publishableKey: string;
  email: string;
  password: string;
}

/** Policy row the migrations seed; the session is opened against it. */
const EXAM_POLICY_VERSION = 'exam-syn-v1';

/** Recorded on the outcome so a stored score can be traced to what produced it. */
const SCORER_SOURCE_VERSION = 'gt-selection-exam-scoring-0.0.0';

/** A slow database must not stall the battery behind it. */
const RPC_TIMEOUT_MS = 8_000;

/** Proctor client pinned to the `api` schema, the only schema RPCs are exposed on. */
function createProctorClient(config: ProctorConfig) {
  return createClient(config.url, config.publishableKey, {
    db: { schema: 'api' },
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init) =>
        fetch(input as RequestInfo, { ...init, signal: AbortSignal.timeout(RPC_TIMEOUT_MS) }),
    },
  });
}

type ProctorClient = ReturnType<typeof createProctorClient>;

let cached: { client: ProctorClient; signedIn: boolean } | null = null;
let warnedDisabled = false;

function readProctorConfig(): ProctorConfig | null {
  if (process.env.GT_EXAM_PERSISTENCE_ENABLED !== 'true') return null;
  const email = process.env.GT_EXAM_PROCTOR_EMAIL;
  const password = process.env.GT_EXAM_PROCTOR_PASSWORD;
  if (!email || !password) {
    if (!warnedDisabled) {
      warnedDisabled = true;
      console.warn(
        '[exam-persistence] GT_EXAM_PERSISTENCE_ENABLED=true but GT_EXAM_PROCTOR_EMAIL/' +
          'GT_EXAM_PROCTOR_PASSWORD are unset. Running without persistence.',
      );
    }
    return null;
  }
  try {
    // Reuses the app's own Supabase config and its loopback / no-elevated-keys guards.
    const environment = getServerEnvironment();
    return {
      url: environment.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      email,
      password,
    };
  } catch (error) {
    console.warn('[exam-persistence] Supabase environment rejected:', describe(error));
    return null;
  }
}

export function isExamPersistenceConfigured(): boolean {
  return readProctorConfig() != null;
}

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}

/**
 * A proctor-authenticated client, created and signed in once per server process.
 * The publishable (anon) key plus a password grant is the same shape the rest of
 * the app uses; no service-role or secret key is involved.
 */
async function getProctorClient(): Promise<ProctorClient | null> {
  if (cached?.signedIn) return cached.client;
  const config = readProctorConfig();
  if (!config) return null;

  try {
    const client = cached?.client ?? createProctorClient(config);
    const { error } = await client.auth.signInWithPassword({
      email: config.email,
      password: config.password,
    });
    if (error) {
      console.warn('[exam-persistence] proctor sign-in failed:', error.message);
      cached = { client, signedIn: false };
      return null;
    }
    cached = { client, signedIn: true };
    return client;
  } catch (error) {
    console.warn('[exam-persistence] proctor client unavailable:', describe(error));
    return null;
  }
}

/** Envelope every `api.exam_*` RPC returns. */
interface RpcEnvelope<Data> {
  apiVersion: string;
  syntheticOnly: boolean;
  data: Data;
  meta: { correlationId: string; idempotencyKey: string | null; idempotentReplay: boolean };
}

async function callRpc<Data>(
  name: string,
  args: Record<string, unknown>,
): Promise<RpcEnvelope<Data> | null> {
  const client = await getProctorClient();
  if (!client) return null;
  try {
    const { data, error } = await client.rpc(name, args);
    if (error) {
      // A signed-out/expired session is the one failure worth retrying once.
      if (error.message === 'AUTH_REQUIRED' && cached) {
        cached = { client: cached.client, signedIn: false };
      }
      console.warn(`[exam-persistence] ${name} rejected:`, error.message);
      return null;
    }
    return data as RpcEnvelope<Data>;
  } catch (error) {
    console.warn(`[exam-persistence] ${name} failed:`, describe(error));
    return null;
  }
}

function correlationId(): string {
  return crypto.randomUUID();
}

export interface PersistedSession {
  examSessionId: string;
  participantId: string;
}

/**
 * Open a pseudonymous participant + session. `participantCode` is the runner's
 * `PART-SYN-*` code, so re-running the same code reuses the same participant.
 */
export async function startPersistedSession(input: {
  participantCode: string;
  gradeBand: string;
}): Promise<PersistedSession | null> {
  const participant = await callRpc<{
    participant: { participantId: string };
  }>('exam_create_participant', {
    p_pseudonym_code: input.participantCode,
    p_age_band: input.gradeBand,
    p_correlation_id: correlationId(),
  });
  if (!participant) return null;

  const participantId = participant.data.participant.participantId;
  const session = await callRpc<{ session: { sessionId: string } }>('exam_start_session', {
    p_participant_id: participantId,
    p_policy_version: EXAM_POLICY_VERSION,
    p_grade_band: input.gradeBand,
    p_idempotency_key: crypto.randomUUID(),
    p_correlation_id: correlationId(),
  });
  if (!session) return null;

  return { examSessionId: session.data.session.sessionId, participantId };
}

/**
 * Admit a served bank item into `app.exam_item`, WITH its server-only answer key,
 * so the database can verify the response against it. Idempotent; the key travels
 * server→database only and is never returned.
 */
async function registerItem(item: RawBankItem, metricIds: readonly string[]): Promise<boolean> {
  const registered = await callRpc<{ registered: boolean; alreadyPresent: boolean }>(
    'exam_register_item',
    {
      p_item: {
        itemId: item.itemId,
        typeCode: item.typeCode,
        domain: item.domain,
        difficulty: item.difficulty,
        ageBands: item.ageBands,
        content: item.content,
        answer: item.answer,
        scoring: item.scoring ?? {},
        provenance: item.provenance ?? {},
        metricIds,
        demoPath: item.demoPath ?? `${item.typeCode}.html`,
        syntheticOnly: true,
        validated: false,
      },
      p_correlation_id: correlationId(),
    },
  );
  return registered != null;
}

/** One telemetry event in the shape `api.exam_submit_response` unpacks. */
interface TelemetryRow {
  itemId?: string;
  kind: string;
  seq: number | null;
  tOffsetMs: number;
  payload: Record<string, unknown>;
}

/**
 * Normalise a demo's loose telemetry bag into the append-only trace row shape.
 * The whole original event is kept as `payload`, so nothing is lost in the
 * translation; only the indexed columns are derived.
 */
export function toTelemetryRows(
  events: readonly unknown[],
  itemId: string,
  startSeq = 0,
): TelemetryRow[] {
  return events.map((raw, index) => {
    const event = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const kindValue = event.kind ?? event.type ?? event.event;
    const offset = event.tOffsetMs ?? event.tOffset ?? event.t ?? event.atMs;
    const seq = event.seq;
    return {
      itemId,
      kind: String(typeof kindValue === 'string' && kindValue ? kindValue : 'event').slice(0, 40),
      seq:
        typeof seq === 'number' && Number.isFinite(seq)
          ? Math.max(0, Math.trunc(seq))
          : startSeq + index,
      tOffsetMs:
        typeof offset === 'number' && Number.isFinite(offset) ? Math.max(0, Math.trunc(offset)) : 0,
      payload: event,
    };
  });
}

export interface PersistedResponse {
  /** The database's own verdict, from its independent key comparison. */
  dbCorrect: boolean;
  dbScore: number;
  orderNo: number;
  itemsAdministered: number;
}

/**
 * Persist one answered item: register the item, then hand the raw answer, the
 * client-emitted metrics, and the item's telemetry to `api.exam_submit_response`,
 * which verifies against the stored key and appends the trace rows.
 *
 * The returned verdict is the DATABASE's. The runner keeps using the verdict from
 * `/api/exam-submit`'s per-type verifiers, which is the one the engine and scorer
 * consumed; `docs/architecture/EXAM_PERSISTENCE_NOTES.md` records where the two
 * can disagree and why that is not resolved here.
 */
export async function persistItemResponse(input: {
  examSessionId: string;
  item: RawBankItem;
  metricIds: readonly string[];
  rawAnswer: unknown;
  metrics: Record<string, number>;
  telemetry: readonly unknown[];
}): Promise<PersistedResponse | null> {
  if (!(await registerItem(input.item, input.metricIds))) return null;

  const rawAnswer =
    input.rawAnswer == null || typeof input.rawAnswer === 'undefined' ? {} : input.rawAnswer;

  const submitted = await callRpc<{
    scored: { correct: boolean; score: number; orderNo: number };
    itemsAdministered: number;
  }>('exam_submit_response', {
    p_session_id: input.examSessionId,
    p_item_id: input.item.itemId,
    p_raw_answer: rawAnswer,
    p_metrics: input.metrics,
    p_telemetry: toTelemetryRows(input.telemetry, input.item.itemId),
    p_idempotency_key: crypto.randomUUID(),
    p_correlation_id: correlationId(),
  });
  if (!submitted) return null;

  return {
    dbCorrect: submitted.data.scored.correct,
    dbScore: submitted.data.scored.score,
    orderNo: submitted.data.scored.orderNo,
    itemsAdministered: submitted.data.itemsAdministered,
  };
}

/**
 * Store the `packages/exam-scoring` outcome VERBATIM and close the session. The
 * database records a sha256 of the canonical scorer input it derives from the
 * stored trace, so the score can later be recomputed and checked against it.
 */
export async function persistOutcome(input: {
  examSessionId: string;
  outcome: ExamScore;
}): Promise<boolean> {
  const recorded = await callRpc<{ outcome: unknown }>('exam_record_outcome', {
    p_session_id: input.examSessionId,
    p_outcome: input.outcome,
    p_scoring_policy_id: input.outcome.policyId,
    p_scorer_version: SCORER_SOURCE_VERSION,
    p_idempotency_key: crypto.randomUUID(),
    p_correlation_id: correlationId(),
  });
  return recorded != null;
}

/** Test seam: drop the cached proctor client so config changes take effect. */
export function resetExamPersistenceForTests(): void {
  cached = null;
  warnedDisabled = false;
}
