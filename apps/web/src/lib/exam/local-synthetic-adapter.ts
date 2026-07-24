import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  buildOutcome,
  chooseNextItem,
  computeAbilities,
  toServedItem,
  type AdministeredItem,
  type EngineState,
} from '@gt-selection/cat-engine';
import {
  apiErrorCodeSchema,
  createParticipantResponseSchema,
  examSessionResponseSchema,
  examSessionStateResponseSchema,
  getExamPolicyResponseSchema,
  itemResponseSchema,
  listExamItemsResponseSchema,
  telemetryEventSchema,
  type ApiErrorCode,
  type ExamItem,
  type ExamPolicy,
} from '@gt-selection/contracts';
import type { Json } from '@gt-selection/db-types';
import { z } from 'zod';

import {
  getLocalSyntheticAdapterEnvironment,
  validateLocalSyntheticAdapterEnvironment,
} from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { ExamService } from './service';

const trustedOperatorClaimsSchema = z.looseObject({
  sub: z.uuid(),
  app_metadata: z.looseObject({
    synthetic_only: z.literal(true),
    user_role: z.literal('admissions_operator'),
  }),
});

type ExamRpcName =
  | 'get_exam_policy'
  | 'list_exam_items'
  | 'create_exam_participant'
  | 'start_exam_session'
  | 'get_exam_session'
  | 'submit_exam_response';

interface RpcError {
  code?: string;
  message: string;
}

export interface LocalExamRpcClient {
  auth: {
    getClaims(): Promise<{ data: { claims?: unknown } | null; error: unknown }>;
  };
  rpc(
    name: ExamRpcName,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: RpcError | null }>;
}

export class LocalSyntheticExamError extends Error {
  readonly code: ApiErrorCode | null;

  constructor(message: string, code: ApiErrorCode | null = null) {
    super(message);
    this.name = 'LocalSyntheticExamError';
    this.code = code;
  }
}

function toJson(value: unknown): Json {
  return value as Json;
}

async function assertOperatorSession(client: LocalExamRpcClient) {
  const { data, error } = await client.auth.getClaims();
  const parsed = trustedOperatorClaimsSchema.safeParse(data?.claims);
  if (error || !parsed.success) {
    throw new LocalSyntheticExamError(
      'A trusted synthetic proctor (admissions_operator) session is required.',
      'AUTH_REQUIRED',
    );
  }
}

async function invokeRpc<Output>(
  client: LocalExamRpcClient,
  name: ExamRpcName,
  args: Record<string, unknown>,
  responseSchema: z.ZodType<Output>,
): Promise<Output> {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const parsedCode = apiErrorCodeSchema.safeParse(error.message);
    throw new LocalSyntheticExamError(
      parsedCode.success
        ? `The exam request was rejected (${parsedCode.data}).`
        : 'The local synthetic exam request failed safely.',
      parsedCode.success ? parsedCode.data : null,
    );
  }
  return responseSchema.parse(data);
}

async function loadPolicy(client: LocalExamRpcClient, policyVersion: string): Promise<ExamPolicy> {
  const response = await invokeRpc(
    client,
    'get_exam_policy',
    { p_policy_version: policyVersion, p_correlation_id: randomUUID() },
    getExamPolicyResponseSchema,
  );
  return response.data.policy;
}

async function loadBank(
  client: LocalExamRpcClient,
  policyVersion: string,
  ageBand: string,
): Promise<ExamItem[]> {
  const response = await invokeRpc(
    client,
    'list_exam_items',
    { p_policy_version: policyVersion, p_age_band: ageBand, p_correlation_id: randomUUID() },
    listExamItemsResponseSchema,
  );
  return response.data.items;
}

function rebuildAdministered(
  responses: z.infer<typeof examSessionStateResponseSchema>['data']['responses'],
  bank: readonly ExamItem[],
): AdministeredItem[] {
  const byId = new Map(bank.map((item) => [item.itemId, item]));
  return responses.map((record) => {
    const item = byId.get(record.itemId);
    if (!item) {
      throw new LocalSyntheticExamError('A stored response references an unknown item.', 'VALIDATION_FAILED');
    }
    return {
      item,
      order: record.orderNo,
      response: {
        itemId: record.itemId,
        correct: record.correct,
        score: record.score,
        rtMs: record.rtMs,
        firstActionMs: record.firstActionMs,
        revisions: record.revisions,
        engaged: record.engaged,
        measurements: record.measurements,
        syntheticOnly: true,
      },
    };
  });
}

export function createLocalSyntheticExamAdapter({
  client,
  environment = process.env,
}: {
  client: LocalExamRpcClient;
  environment?: Record<string, string | undefined>;
}): ExamService {
  validateLocalSyntheticAdapterEnvironment(environment);

  return {
    async createParticipant(input) {
      await assertOperatorSession(client);
      const response = await invokeRpc(
        client,
        'create_exam_participant',
        {
          p_pseudonym_code: input.pseudonymCode,
          p_age_band: input.ageBand,
          p_correlation_id: randomUUID(),
        },
        createParticipantResponseSchema,
      );
      return response.data.participant;
    },

    async startSession(input) {
      await assertOperatorSession(client);
      const started = await invokeRpc(
        client,
        'start_exam_session',
        {
          p_participant_id: input.participantId,
          p_policy_version: input.policyVersion,
          p_idempotency_key: randomUUID(),
          p_correlation_id: randomUUID(),
        },
        examSessionResponseSchema,
      );
      const session = started.data.session;
      const [policy, bank] = await Promise.all([
        loadPolicy(client, session.policyVersion),
        loadBank(client, session.policyVersion, session.ageBand),
      ]);
      const state: EngineState = {
        sessionId: session.sessionId,
        ageBand: session.ageBand,
        policy,
        administered: [],
      };
      const next = chooseNextItem(state, bank);
      return { session, nextItem: next ? toServedItem(next) : null, outcome: null };
    },

    async submitResponse(input) {
      await assertOperatorSession(client);
      const response = itemResponseSchema.parse(input.response);
      const telemetry = z.array(telemetryEventSchema).parse(input.telemetry);

      const stateResponse = await invokeRpc(
        client,
        'get_exam_session',
        { p_session_id: input.sessionId, p_correlation_id: randomUUID() },
        examSessionStateResponseSchema,
      );
      const session = stateResponse.data.session;
      const [policy, bank] = await Promise.all([
        loadPolicy(client, session.policyVersion),
        loadBank(client, session.policyVersion, session.ageBand),
      ]);

      const prior = rebuildAdministered(stateResponse.data.responses, bank);
      const newItem = bank.find((item) => item.itemId === response.itemId);
      if (!newItem) {
        throw new LocalSyntheticExamError('The submitted item is not in the bank.', 'VALIDATION_FAILED');
      }
      const administered = [...prior, { item: newItem, order: prior.length + 1, response }];
      const state: EngineState = {
        sessionId: session.sessionId,
        ageBand: session.ageBand,
        policy,
        administered,
      };
      const abilities = computeAbilities(state);
      const next = chooseNextItem(state, bank);
      const outcome = next === null ? buildOutcome(state) : null;

      const persisted = await invokeRpc(
        client,
        'submit_exam_response',
        {
          p_session_id: input.sessionId,
          p_response: toJson(response),
          p_telemetry: toJson(telemetry),
          p_abilities: toJson(abilities),
          p_outcome: outcome ? toJson(outcome) : null,
          p_idempotency_key: randomUUID(),
          p_correlation_id: randomUUID(),
        },
        examSessionResponseSchema,
      );
      return {
        session: persisted.data.session,
        nextItem: next ? toServedItem(next) : null,
        outcome,
      };
    },

    async getSession(sessionId) {
      await assertOperatorSession(client);
      const stateResponse = await invokeRpc(
        client,
        'get_exam_session',
        { p_session_id: sessionId, p_correlation_id: randomUUID() },
        examSessionStateResponseSchema,
      );
      const session = stateResponse.data.session;
      if (session.status === 'completed') {
        return { session, nextItem: null, outcome: stateResponse.data.outcome };
      }
      const [policy, bank] = await Promise.all([
        loadPolicy(client, session.policyVersion),
        loadBank(client, session.policyVersion, session.ageBand),
      ]);
      const state: EngineState = {
        sessionId: session.sessionId,
        ageBand: session.ageBand,
        policy,
        administered: rebuildAdministered(stateResponse.data.responses, bank),
      };
      const next = chooseNextItem(state, bank);
      return { session, nextItem: next ? toServedItem(next) : null, outcome: null };
    },
  };
}

export async function createServerLocalSyntheticExamAdapter() {
  getLocalSyntheticAdapterEnvironment();
  const client = await createSupabaseServerClient();
  return createLocalSyntheticExamAdapter({
    client: client as unknown as LocalExamRpcClient,
    environment: process.env,
  });
}
