import {
  activeSyntheticSchoolsResponseFixture,
  applicationDraftStatusResponseFixture,
  applicationReviewResponseFixture,
  savedApplicationDraftResponseFixture,
  savedStudentProfileResponseFixture,
  studentProfilesResponseFixture,
  submittedApplicationResponseFixture,
  syntheticFullApplicationDraft,
  syntheticProfileContent,
  syntheticStudentProfile,
  syntheticStudentProfileResponseFixture,
} from '@gt-selection/test-fixtures';
import { describe, expect, it } from 'vitest';

import { createLocalSyntheticOnboardingAdapter } from './local-synthetic-adapter';

const environment = {
  GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED: 'true',
  GT_LOCAL_SYNTHETIC_PROJECT_ID: 'gt-selection-capstone',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable-key',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:65421',
  NODE_ENV: 'test',
} as const;

const correlationId = '00000000-0000-4000-8000-000000000300';
const idempotencyKey = '00000000-0000-4000-8000-000000000299';

const examSessionRecord = {
  sessionId: 'SESS-SYN-ABC123',
  participantCode: 'PART-SYN-ABC123',
  studentName: 'Synthetic Learner',
  ageBand: '4-5',
  startedAt: '2026-07-25T16:00:00.000Z',
  finishedAt: '2026-07-25T16:12:00.000Z',
  items: [
    {
      typeCode: 'SYN_PATTERN',
      domain: 'reasoning',
      skipped: false,
      metrics: { 'M-ACC': '0.8' },
      accuracy: 0.8,
      difficultyReached: 4,
    },
  ],
  syntheticOnly: true as const,
  summary: {
    overallAccuracy: 0.8,
    perDomainAccuracy: { reasoning: 0.8 },
    meanDifficultyReached: 4,
    itemsAnswered: 1,
    itemsSkipped: 0,
  },
};

const saveExamSessionResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    examSessionId: '00000000-0000-4000-8000-0000000005e5',
    createdAt: '2026-07-25T16:12:01.000Z',
    summary: examSessionRecord.summary,
  },
  meta: {
    correlationId,
    idempotencyKey,
    idempotentReplay: false,
  },
};

function createFakeClient(
  claims: Record<string, unknown> = {
    sub: '00000000-0000-4000-8000-00000000f001',
    app_metadata: {
      synthetic_only: true,
      user_role: 'family',
    },
  },
) {
  const responses: Record<string, unknown> = {
    save_student_profile: savedStudentProfileResponseFixture,
    get_student_profile: syntheticStudentProfileResponseFixture,
    list_student_profiles: studentProfilesResponseFixture,
    list_active_schools: activeSyntheticSchoolsResponseFixture,
    save_application_draft: savedApplicationDraftResponseFixture,
    get_application: applicationReviewResponseFixture,
    submit_application: submittedApplicationResponseFixture,
    get_application_status: applicationDraftStatusResponseFixture,
    save_exam_session: saveExamSessionResponseFixture,
  };
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = {
    auth: {
      getClaims: async () => ({
        data: { claims },
        error: null,
      }),
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return {
        data: responses[name],
        error: null,
      };
    },
  };

  return { calls, client, responses };
}

describe('server-only local synthetic onboarding adapter', () => {
  it('runs the complete typed frontend hookup surface', async () => {
    const { calls, client } = createFakeClient();
    const adapter = createLocalSyntheticOnboardingAdapter({
      client,
      environment,
    });

    await adapter.saveStudentProfile({
      profileId: syntheticStudentProfile.profileId,
      profile: syntheticProfileContent,
      expectedVersion: 0,
      idempotencyKey,
      correlationId,
    });
    await adapter.getStudentProfile({
      profileId: syntheticStudentProfile.profileId,
      correlationId,
    });
    await adapter.listStudentProfiles({ correlationId });
    await adapter.listActiveSchools({ correlationId });
    await adapter.saveApplicationDraft({
      applicationId: savedApplicationDraftResponseFixture.data.application.applicationId,
      studentProfileVersionId: syntheticStudentProfile.profileVersionId,
      draft: syntheticFullApplicationDraft,
      expectedVersion: 0,
      idempotencyKey,
      correlationId,
    });
    await adapter.getApplication({
      applicationId: savedApplicationDraftResponseFixture.data.application.applicationId,
      correlationId,
    });
    await adapter.submitApplication({
      applicationVersionId:
        savedApplicationDraftResponseFixture.data.application.applicationVersionId,
      expectedVersion: 1,
      idempotencyKey,
      correlationId,
    });
    await adapter.getApplicationStatus({
      applicationId: savedApplicationDraftResponseFixture.data.application.applicationId,
      correlationId,
    });

    expect(calls.map(({ name }) => name)).toEqual([
      'save_student_profile',
      'get_student_profile',
      'list_student_profiles',
      'list_active_schools',
      'save_application_draft',
      'get_application',
      'submit_application',
      'get_application_status',
    ]);
    expect(calls.every(({ args }) => !('actorId' in args) && !('role' in args))).toBe(true);
  });

  it('saves a durable exam session through the born-synthetic RPC', async () => {
    const { calls, client } = createFakeClient();
    const adapter = createLocalSyntheticOnboardingAdapter({ client, environment });

    const result = await adapter.saveExamSession({
      applicationId: '00000000-0000-4000-8000-000000000001',
      session: examSessionRecord,
      idempotencyKey,
      correlationId,
    });

    const call = calls.find(({ name }) => name === 'save_exam_session');
    expect(call?.args).toEqual({
      p_session: examSessionRecord,
      p_application_id: '00000000-0000-4000-8000-000000000001',
      p_idempotency_key: idempotencyKey,
      p_correlation_id: correlationId,
    });
    expect(result.data.summary.overallAccuracy).toBe(0.8);
  });

  it('rejects an exam-session response whose summary is malformed', async () => {
    const { client, responses } = createFakeClient();
    responses.save_exam_session = {
      ...saveExamSessionResponseFixture,
      data: { ...saveExamSessionResponseFixture.data, summary: { overallAccuracy: 'nope' } },
    };
    const adapter = createLocalSyntheticOnboardingAdapter({ client, environment });

    await expect(
      adapter.saveExamSession({
        applicationId: null,
        session: examSessionRecord,
        idempotencyKey,
        correlationId,
      }),
    ).rejects.toThrow();
  });

  it('rejects a role supplied only through user-editable metadata', async () => {
    const { client } = createFakeClient({
      sub: '00000000-0000-4000-8000-00000000f001',
      app_metadata: {},
      user_metadata: {
        synthetic_only: true,
        user_role: 'family',
      },
    });
    const adapter = createLocalSyntheticOnboardingAdapter({ client, environment });

    await expect(adapter.listStudentProfiles({ correlationId })).rejects.toThrow(
      /trusted synthetic family session/i,
    );
  });

  it('parses every RPC response through the public contract', async () => {
    const { client, responses } = createFakeClient();
    responses.list_active_schools = {
      ...activeSyntheticSchoolsResponseFixture,
      data: {
        schools: [
          {
            ...activeSyntheticSchoolsResponseFixture.data.schools[0],
            w2DocumentId: 'forbidden',
          },
        ],
      },
    };
    const adapter = createLocalSyntheticOnboardingAdapter({ client, environment });

    await expect(adapter.listActiveSchools({ correlationId })).rejects.toThrow();
  });
});
