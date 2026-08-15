import {
  syntheticFullApplicationDraft,
  syntheticProfileContent,
} from '@gt-selection/test-fixtures';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { resetIntegrationCookieStore } from '../../../vitest.next-headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import {
  getApplicationAction,
  getApplicationStatusAction,
  getStudentProfileAction,
  listActiveSchoolsAction,
  listStudentProfilesAction,
  saveApplicationDraftAction,
  saveStudentProfileAction,
  submitApplicationAction,
} from './actions';

describe('frontend-imported onboarding actions integration', () => {
  beforeAll(async () => {
    resetIntegrationCookieStore();
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.signInWithPassword({
      email: 'family@example.test',
      password: 'Synthetic-Only-2026!',
    });
    if (error) {
      throw error;
    }
  });

  afterAll(() => {
    resetIntegrationCookieStore();
  });

  it('executes the authenticated local synthetic happy path through actions.ts', async () => {
    const profileId = crypto.randomUUID();
    const applicationId = crypto.randomUUID();

    const savedProfile = await saveStudentProfileAction({
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
    const reloadedProfile = await getStudentProfileAction({
      profileId,
      correlationId: crypto.randomUUID(),
    });
    expect(reloadedProfile.data.profile.profileVersionId).toBe(
      savedProfile.data.profile.profileVersionId,
    );

    const profiles = await listStudentProfilesAction({
      correlationId: crypto.randomUUID(),
    });
    expect(profiles.data.profiles.some(({ profileId: id }) => id === profileId)).toBe(true);

    const schools = await listActiveSchoolsAction({
      correlationId: crypto.randomUUID(),
    });
    expect(schools.data.schools).toHaveLength(2);

    const savedDraft = await saveApplicationDraftAction({
      applicationId,
      studentProfileVersionId: savedProfile.data.profile.profileVersionId,
      draft: syntheticFullApplicationDraft,
      expectedVersion: 0,
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    });
    const reloadedApplication = await getApplicationAction({
      applicationId,
      correlationId: crypto.randomUUID(),
    });
    expect(reloadedApplication.data.application.school?.snapshot.name).toBe(
      'Synthetic Learning Academy',
    );

    const submitted = await submitApplicationAction({
      applicationVersionId: savedDraft.data.application.applicationVersionId,
      expectedVersion: savedDraft.data.application.version,
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    });
    expect(submitted.data.application.state).toBe('submitted');

    const status = await getApplicationStatusAction({
      applicationId,
      correlationId: crypto.randomUUID(),
    });
    expect(status.data.workflowStatus).toBe('awaiting_assessment');

    const firstFamilyClient = await createSupabaseServerClient();
    await firstFamilyClient.auth.signOut();
    const { error } = await firstFamilyClient.auth.signInWithPassword({
      email: 'family-two@example.test',
      password: 'Synthetic-Only-2026!',
    });
    if (error) {
      throw error;
    }

    await expect(
      getApplicationAction({
        applicationId,
        correlationId: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });
});
