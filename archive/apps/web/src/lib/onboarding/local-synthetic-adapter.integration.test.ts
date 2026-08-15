import type { Database } from '@gt-selection/db-types';
import {
  syntheticFullApplicationDraft,
  syntheticProfileContent,
} from '@gt-selection/test-fixtures';
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createLocalSyntheticOnboardingAdapter } from './local-synthetic-adapter';
import type { LocalSyntheticRpcClient } from './local-synthetic-adapter';

const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!apiUrl || !publishableKey) {
  throw new Error('Local adapter integration requires the local public Supabase values.');
}

const environment = {
  ...process.env,
  GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED: 'true',
  GT_LOCAL_SYNTHETIC_PROJECT_ID: 'gt-selection-capstone',
  NEXT_PUBLIC_SUPABASE_URL: apiUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  NODE_ENV: 'test',
};

const familyClient = createClient<Database>(apiUrl, publishableKey, {
  db: { schema: 'api' },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const otherFamilyClient = createClient<Database>(apiUrl, publishableKey, {
  db: { schema: 'api' },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const sameFamilyConcurrentClient = createClient<Database>(apiUrl, publishableKey, {
  db: { schema: 'api' },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

describe('local synthetic adapter integration', () => {
  beforeAll(async () => {
    const firstLogin = await familyClient.auth.signInWithPassword({
      email: 'family@example.test',
      password: 'Synthetic-Only-2026!',
    });
    const secondLogin = await otherFamilyClient.auth.signInWithPassword({
      email: 'family-two@example.test',
      password: 'Synthetic-Only-2026!',
    });
    const concurrentLogin = await sameFamilyConcurrentClient.auth.signInWithPassword({
      email: 'family@example.test',
      password: 'Synthetic-Only-2026!',
    });
    if (firstLogin.error || secondLogin.error || concurrentLogin.error) {
      throw firstLogin.error ?? secondLogin.error ?? concurrentLogin.error;
    }
  });

  afterAll(async () => {
    await Promise.all([
      familyClient.auth.signOut(),
      otherFamilyClient.auth.signOut(),
      sameFamilyConcurrentClient.auth.signOut(),
    ]);
  });

  it('supports one frontend-ready profile/application happy path with owner isolation', async () => {
    const adapter = createLocalSyntheticOnboardingAdapter({
      client: familyClient as unknown as LocalSyntheticRpcClient,
      environment,
    });
    const otherAdapter = createLocalSyntheticOnboardingAdapter({
      client: otherFamilyClient as unknown as LocalSyntheticRpcClient,
      environment,
    });
    const profileId = crypto.randomUUID();
    const applicationId = crypto.randomUUID();

    const savedProfile = await adapter.saveStudentProfile({
      profileId,
      profile: {
        ...syntheticProfileContent,
        student: {
          ...syntheticProfileContent.student,
          syntheticStudentCode: `STUDENT-SYN-${profileId.replaceAll('-', '').toUpperCase()}`,
        },
      },
      expectedVersion: 0,
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    });
    expect(savedProfile.data.profile.student.fullName).toBe('Synthetic Student One');

    const profiles = await adapter.listStudentProfiles({
      correlationId: crypto.randomUUID(),
    });
    expect(profiles.data.profiles.map(({ profileId: id }) => id)).toContain(profileId);

    const schools = await adapter.listActiveSchools({
      correlationId: crypto.randomUUID(),
    });
    expect(schools.data.schools).toHaveLength(2);

    const savedDraft = await adapter.saveApplicationDraft({
      applicationId,
      studentProfileVersionId: savedProfile.data.profile.profileVersionId,
      draft: syntheticFullApplicationDraft,
      expectedVersion: 0,
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    });
    const reloaded = await adapter.getApplication({
      applicationId,
      correlationId: crypto.randomUUID(),
    });
    expect(reloaded.data.application.financialIntake?.householdMemberCount).toBe(4);
    expect(reloaded.data.application.school?.snapshot.name).toBe('Synthetic Learning Academy');

    const submitted = await adapter.submitApplication({
      applicationVersionId: savedDraft.data.application.applicationVersionId,
      expectedVersion: savedDraft.data.application.version,
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    });
    expect(submitted.data.status.workflowStatus).toBe('awaiting_assessment');
    const status = await adapter.getApplicationStatus({
      applicationId,
      correlationId: crypto.randomUUID(),
    });
    expect(Object.keys(status.data)).toHaveLength(8);

    await expect(
      otherAdapter.getApplication({
        applicationId,
        correlationId: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });

  it('serializes real two-session save and submit races', async () => {
    const firstSession = createLocalSyntheticOnboardingAdapter({
      client: familyClient as unknown as LocalSyntheticRpcClient,
      environment,
    });
    const secondSession = createLocalSyntheticOnboardingAdapter({
      client: sameFamilyConcurrentClient as unknown as LocalSyntheticRpcClient,
      environment,
    });
    const profileId = crypto.randomUUID();
    const applicationId = crypto.randomUUID();
    const savedProfile = await firstSession.saveStudentProfile({
      profileId,
      profile: {
        ...syntheticProfileContent,
        student: {
          ...syntheticProfileContent.student,
          syntheticStudentCode: `STUDENT-SYN-${profileId.replaceAll('-', '').toUpperCase()}`,
        },
      },
      expectedVersion: 0,
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    });
    const saveRequest = {
      applicationId,
      studentProfileVersionId: savedProfile.data.profile.profileVersionId,
      draft: syntheticFullApplicationDraft,
      expectedVersion: 0,
    };

    const saveResults = await Promise.allSettled([
      firstSession.saveApplicationDraft({
        ...saveRequest,
        idempotencyKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      }),
      secondSession.saveApplicationDraft({
        ...saveRequest,
        idempotencyKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      }),
    ]);
    const successfulSaves = saveResults.filter((result) => result.status === 'fulfilled');
    const rejectedSaves = saveResults.filter((result) => result.status === 'rejected');
    expect(successfulSaves).toHaveLength(1);
    expect(rejectedSaves).toHaveLength(1);
    expect(rejectedSaves[0]).toMatchObject({
      reason: { code: 'STALE_VERSION' },
    });

    const savedDraft = successfulSaves[0]?.value;
    if (!savedDraft) {
      throw new Error('The save race did not produce one winning draft.');
    }
    const submitRequest = {
      applicationVersionId: savedDraft.data.application.applicationVersionId,
      expectedVersion: savedDraft.data.application.version,
    };
    const submitResults = await Promise.allSettled([
      firstSession.submitApplication({
        ...submitRequest,
        idempotencyKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      }),
      secondSession.submitApplication({
        ...submitRequest,
        idempotencyKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      }),
    ]);
    expect(submitResults.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(submitResults.filter((result) => result.status === 'rejected')).toEqual([
      expect.objectContaining({
        reason: expect.objectContaining({ code: 'SUBMISSION_LOCKED' }),
      }),
    ]);

    const reloaded = await firstSession.getApplication({
      applicationId,
      correlationId: crypto.randomUUID(),
    });
    expect(reloaded.data.application).toMatchObject({
      state: 'submitted',
      version: 2,
    });
  });
});
