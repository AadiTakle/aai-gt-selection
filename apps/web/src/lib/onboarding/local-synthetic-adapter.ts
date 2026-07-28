import 'server-only';

import {
  apiErrorCodeSchema,
  getApplicationRequestSchema,
  getApplicationResponseSchema,
  getApplicationStatusRequestSchema,
  getApplicationStatusResponseSchema,
  getStudentProfileRequestSchema,
  getStudentProfileResponseSchema,
  listActiveSchoolsRequestSchema,
  listActiveSchoolsResponseSchema,
  listStudentProfilesRequestSchema,
  listStudentProfilesResponseSchema,
  saveApplicationDraftRequestSchema,
  saveApplicationDraftResponseSchema,
  saveStudentProfileRequestSchema,
  saveStudentProfileResponseSchema,
  submitApplicationRequestSchema,
  submitApplicationResponseSchema,
} from '@gt-selection/contracts';
import type { ApiErrorCode } from '@gt-selection/contracts';
import type { Json } from '@gt-selection/db-types';
import { z } from 'zod';

import {
  getLocalSyntheticAdapterEnvironment,
  validateLocalSyntheticAdapterEnvironment,
} from '@/lib/env';
import { saveExamSessionResponseSchema } from '@/lib/exam/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { OnboardingService } from './service';

const trustedFamilyClaimsSchema = z.looseObject({
  sub: z.uuid(),
  app_metadata: z.looseObject({
    synthetic_only: z.literal(true),
    user_role: z.literal('family'),
  }),
});

type LocalRpcName =
  | 'save_student_profile'
  | 'get_student_profile'
  | 'list_student_profiles'
  | 'list_active_schools'
  | 'save_application_draft'
  | 'get_application'
  | 'submit_application'
  | 'get_application_status'
  | 'save_exam_session';

interface LocalRpcError {
  code?: string;
  message: string;
}

export interface LocalSyntheticRpcClient {
  auth: {
    getClaims(): Promise<{
      data: { claims?: unknown } | null;
      error: unknown;
    }>;
  };
  rpc(
    name: LocalRpcName,
    args: Record<string, unknown>,
  ): PromiseLike<{
    data: unknown;
    error: LocalRpcError | null;
  }>;
}

export class LocalSyntheticOnboardingError extends Error {
  readonly code: ApiErrorCode | null;

  constructor(message: string, code: ApiErrorCode | null = null) {
    super(message);
    this.name = 'LocalSyntheticOnboardingError';
    this.code = code;
  }
}

async function assertTrustedSyntheticFamilySession(client: LocalSyntheticRpcClient) {
  const { data, error } = await client.auth.getClaims();
  const parsedClaims = trustedFamilyClaimsSchema.safeParse(data?.claims);
  if (error || !parsedClaims.success) {
    throw new LocalSyntheticOnboardingError(
      'A trusted synthetic family session is required.',
      'AUTH_REQUIRED',
    );
  }
}

function toJson(value: unknown): Json {
  return value as Json;
}

async function invokeRpc<Output>(
  client: LocalSyntheticRpcClient,
  name: LocalRpcName,
  args: Record<string, unknown>,
  responseSchema: z.ZodType<Output>,
): Promise<Output> {
  await assertTrustedSyntheticFamilySession(client);
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const parsedCode = apiErrorCodeSchema.safeParse(error.message);
    throw new LocalSyntheticOnboardingError(
      parsedCode.success
        ? `The onboarding request was rejected (${parsedCode.data}).`
        : 'The local synthetic onboarding request failed safely.',
      parsedCode.success ? parsedCode.data : null,
    );
  }

  return responseSchema.parse(data);
}

export function createLocalSyntheticOnboardingAdapter({
  client,
  environment = process.env,
}: {
  client: LocalSyntheticRpcClient;
  environment?: Record<string, string | undefined>;
}): OnboardingService {
  validateLocalSyntheticAdapterEnvironment(environment);

  return {
    async saveStudentProfile(input) {
      const request = saveStudentProfileRequestSchema.parse(input);
      return invokeRpc(
        client,
        'save_student_profile',
        {
          p_profile_id: request.profileId,
          p_profile: toJson(request.profile),
          p_expected_version: request.expectedVersion,
          p_idempotency_key: request.idempotencyKey,
          p_correlation_id: request.correlationId,
        },
        saveStudentProfileResponseSchema,
      );
    },
    async getStudentProfile(input) {
      const request = getStudentProfileRequestSchema.parse(input);
      return invokeRpc(
        client,
        'get_student_profile',
        {
          p_profile_id: request.profileId,
          p_correlation_id: request.correlationId,
        },
        getStudentProfileResponseSchema,
      );
    },
    async listStudentProfiles(input) {
      const request = listStudentProfilesRequestSchema.parse(input);
      return invokeRpc(
        client,
        'list_student_profiles',
        {
          p_correlation_id: request.correlationId,
        },
        listStudentProfilesResponseSchema,
      );
    },
    async listActiveSchools(input) {
      const request = listActiveSchoolsRequestSchema.parse(input);
      return invokeRpc(
        client,
        'list_active_schools',
        {
          p_correlation_id: request.correlationId,
        },
        listActiveSchoolsResponseSchema,
      );
    },
    async saveApplicationDraft(input) {
      const request = saveApplicationDraftRequestSchema.parse(input);
      return invokeRpc(
        client,
        'save_application_draft',
        {
          p_application_id: request.applicationId,
          p_student_profile_version_id: request.studentProfileVersionId,
          p_draft: toJson(request.draft),
          p_expected_version: request.expectedVersion,
          p_idempotency_key: request.idempotencyKey,
          p_correlation_id: request.correlationId,
        },
        saveApplicationDraftResponseSchema,
      );
    },
    async getApplication(input) {
      const request = getApplicationRequestSchema.parse(input);
      return invokeRpc(
        client,
        'get_application',
        {
          p_application_id: request.applicationId,
          p_correlation_id: request.correlationId,
        },
        getApplicationResponseSchema,
      );
    },
    async submitApplication(input) {
      const request = submitApplicationRequestSchema.parse(input);
      return invokeRpc(
        client,
        'submit_application',
        {
          p_application_version_id: request.applicationVersionId,
          p_expected_version: request.expectedVersion,
          p_idempotency_key: request.idempotencyKey,
          p_correlation_id: request.correlationId,
        },
        submitApplicationResponseSchema,
      );
    },
    async getApplicationStatus(input) {
      const request = getApplicationStatusRequestSchema.parse(input);
      return invokeRpc(
        client,
        'get_application_status',
        {
          p_application_id: request.applicationId,
          p_correlation_id: request.correlationId,
        },
        getApplicationStatusResponseSchema,
      );
    },
    async saveExamSession(input) {
      // `input.session` already carries the server-computed summary and the
      // born-synthetic student name (the action does that transform).
      return invokeRpc(
        client,
        'save_exam_session',
        {
          p_session: toJson(input.session),
          p_application_id: input.applicationId,
          p_idempotency_key: input.idempotencyKey,
          p_correlation_id: input.correlationId,
        },
        saveExamSessionResponseSchema,
      );
    },
  };
}

export async function createServerLocalSyntheticOnboardingAdapter() {
  getLocalSyntheticAdapterEnvironment();
  const client = await createSupabaseServerClient();
  return createLocalSyntheticOnboardingAdapter({
    client: client as unknown as LocalSyntheticRpcClient,
    environment: process.env,
  });
}
