import {
  syntheticFullApplicationDraft,
  syntheticProfileContent,
} from '@gt-selection/test-fixtures';
import { describe, expect, it } from 'vitest';

import { LocalSyntheticOnboardingError } from './local-synthetic-adapter';
import type { OnboardingService } from './service';
import { runSubmitApplicationFlow, type SubmitApplicationFlowRequest } from './submit-flow';

type Call = { method: string; profileId?: string; applicationId?: string; expectedVersion: number };

/**
 * Minimal OnboardingService stand-in for the three methods the flow touches.
 * `onSave*` lets a test fail a step so the heal path can be exercised.
 */
function makeService(overrides?: {
  failProfile?: (call: Call) => void;
  failDraft?: (call: Call) => void;
}): { service: OnboardingService; calls: Call[] } {
  const calls: Call[] = [];
  const service = {
    async saveStudentProfile(input) {
      const call: Call = {
        method: 'saveStudentProfile',
        profileId: input.profileId,
        expectedVersion: input.expectedVersion,
      };
      calls.push(call);
      overrides?.failProfile?.(call);
      return {
        data: { profile: { profileVersionId: `pv-${input.profileId}`, version: 1 } },
      } as Awaited<ReturnType<OnboardingService['saveStudentProfile']>>;
    },
    async saveApplicationDraft(input) {
      const call: Call = {
        method: 'saveApplicationDraft',
        applicationId: input.applicationId,
        expectedVersion: input.expectedVersion,
      };
      calls.push(call);
      overrides?.failDraft?.(call);
      return {
        data: { application: { applicationVersionId: `av-${input.applicationId}`, version: 1 } },
      } as Awaited<ReturnType<OnboardingService['saveApplicationDraft']>>;
    },
    async submitApplication(input) {
      calls.push({ method: 'submitApplication', expectedVersion: input.expectedVersion });
      return {
        data: { application: { applicationVersionId: input.applicationVersionId, version: 2 } },
      } as Awaited<ReturnType<OnboardingService['submitApplication']>>;
    },
  } as OnboardingService;
  return { service, calls };
}

const baseRequest = (): SubmitApplicationFlowRequest => ({
  profileId: '11111111-1111-4111-8111-111111111111',
  applicationId: '22222222-2222-4222-8222-222222222222',
  profile: syntheticProfileContent,
  draft: syntheticFullApplicationDraft,
  expectedProfileVersion: 3,
  expectedApplicationVersion: 4,
  correlationId: '33333333-3333-4333-8333-333333333333',
});

describe('runSubmitApplicationFlow', () => {
  it('runs profile → draft → submit with the given ids/versions on the happy path', async () => {
    const { service, calls } = makeService();
    const result = await runSubmitApplicationFlow(service, baseRequest());

    expect(result.status).toBe('submitted');
    expect(result.healed).toBe(false);
    expect(result.profileId).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.applicationId).toBe('22222222-2222-4222-8222-222222222222');
    expect(calls.map((c) => c.method)).toEqual([
      'saveStudentProfile',
      'saveApplicationDraft',
      'submitApplication',
    ]);
    // the caller's expected versions were used, not zeros
    expect(calls[0]?.expectedVersion).toBe(3);
    expect(calls[1]?.expectedVersion).toBe(4);
  });

  it('heals a stale application by restarting under fresh ids at version 0', async () => {
    // fail any save that still uses the stale (non-zero) expected version
    const { service, calls } = makeService({
      failProfile: (call) => {
        if (call.expectedVersion !== 0) {
          throw new LocalSyntheticOnboardingError('rejected', 'RESOURCE_NOT_FOUND');
        }
      },
    });
    const request = baseRequest();
    const result = await runSubmitApplicationFlow(service, request);

    expect(result.status).toBe('submitted');
    expect(result.healed).toBe(true);
    // fresh, server-minted ids — not the stale ones the client sent
    expect(result.profileId).not.toBe(request.profileId);
    expect(result.applicationId).not.toBe(request.applicationId);
    // the retried profile save used expectedVersion 0 (a clean create)
    const profileSaves = calls.filter((c) => c.method === 'saveStudentProfile');
    expect(profileSaves).toHaveLength(2);
    expect(profileSaves[1]?.expectedVersion).toBe(0);
  });

  it('treats an already-submitted application as done, not an error', async () => {
    const { service } = makeService({
      failDraft: () => {
        throw new LocalSyntheticOnboardingError('locked', 'SUBMISSION_LOCKED');
      },
    });
    const result = await runSubmitApplicationFlow(service, baseRequest());

    expect(result.status).toBe('already_submitted');
    expect(result.healed).toBe(false);
  });

  it('rethrows a non-healable error instead of restarting', async () => {
    const { service, calls } = makeService({
      failProfile: () => {
        throw new LocalSyntheticOnboardingError('bad', 'VALIDATION_FAILED');
      },
    });
    await expect(runSubmitApplicationFlow(service, baseRequest())).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    // no retry attempted
    expect(calls.filter((c) => c.method === 'saveStudentProfile')).toHaveLength(1);
  });
});
