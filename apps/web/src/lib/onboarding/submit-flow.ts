import 'server-only';

import { randomUUID } from 'node:crypto';

import type { ApplicationDraft, StudentProfileContent } from '@gt-selection/contracts';

import { LocalSyntheticOnboardingError } from './local-synthetic-adapter';
import type { OnboardingService } from './service';

/**
 * Server-side submit orchestrator.
 *
 * Submit is a three-step sequence (save profile → save draft → submit), and each
 * step carries an optimistic-concurrency `expectedVersion`. When a browser
 * resumes ids that the current actor can't advance — stale rows, or an
 * application created under a *different* signed-in account — the RPCs raise
 * RESOURCE_NOT_FOUND / STALE_VERSION *before* creating anything, so submit
 * dead-ends every time.
 *
 * Crucially, a production Next build hides the real error from the client (it
 * only ever sees the generic "Server Components render" message + a digest), so
 * the client can't tell a healable stale-id error from anything else. Running the
 * sequence here — where `LocalSyntheticOnboardingError.code` is visible — lets us
 * detect that case and restart the flow under fresh, server-minted ids
 * (expectedVersion 0 always creates cleanly under the current actor). The
 * effective ids/versions are returned so the client can adopt them.
 */

export type SubmitApplicationFlowRequest = {
  profileId: string;
  applicationId: string;
  profile: StudentProfileContent;
  /** Draft built with `includeFinalSubmission: true`. */
  draft: ApplicationDraft;
  expectedProfileVersion: number;
  expectedApplicationVersion: number;
  correlationId: string;
};

export type SubmitApplicationFlowResult = {
  status: 'submitted' | 'already_submitted';
  /** The ids actually used — fresh ones when the flow had to heal. */
  profileId: string;
  applicationId: string;
  profileVersion: number;
  studentProfileVersionId: string | null;
  applicationVersion: number;
  applicationVersionId: string | null;
  /** True when a stale/cross-account application forced a clean restart. */
  healed: boolean;
};

/** Errors that a clean restart under fresh ids can recover from. */
function isHealable(error: unknown): boolean {
  return (
    error instanceof LocalSyntheticOnboardingError &&
    (error.code === 'RESOURCE_NOT_FOUND' || error.code === 'STALE_VERSION')
  );
}

/** The application is already submitted — nothing more to do, just land. */
function isSubmissionLocked(error: unknown): boolean {
  return error instanceof LocalSyntheticOnboardingError && error.code === 'SUBMISSION_LOCKED';
}

async function runOnce(
  service: OnboardingService,
  request: SubmitApplicationFlowRequest,
  ids: { profileId: string; applicationId: string },
  expected: { profile: number; application: number },
): Promise<Omit<SubmitApplicationFlowResult, 'healed' | 'status'>> {
  const profileResult = await service.saveStudentProfile({
    profileId: ids.profileId,
    profile: request.profile,
    expectedVersion: expected.profile,
    idempotencyKey: randomUUID(),
    correlationId: request.correlationId,
  });
  const studentProfileVersionId = profileResult.data.profile.profileVersionId;

  const draftResult = await service.saveApplicationDraft({
    applicationId: ids.applicationId,
    studentProfileVersionId,
    draft: request.draft,
    expectedVersion: expected.application,
    idempotencyKey: randomUUID(),
    correlationId: request.correlationId,
  });

  const submitResult = await service.submitApplication({
    applicationVersionId: draftResult.data.application.applicationVersionId,
    expectedVersion: draftResult.data.application.version,
    idempotencyKey: randomUUID(),
    correlationId: request.correlationId,
  });

  return {
    profileId: ids.profileId,
    applicationId: ids.applicationId,
    profileVersion: profileResult.data.profile.version,
    studentProfileVersionId,
    applicationVersion: submitResult.data.application.version,
    applicationVersionId: submitResult.data.application.applicationVersionId,
  };
}

export async function runSubmitApplicationFlow(
  service: OnboardingService,
  request: SubmitApplicationFlowRequest,
): Promise<SubmitApplicationFlowResult> {
  try {
    const result = await runOnce(
      service,
      request,
      { profileId: request.profileId, applicationId: request.applicationId },
      { profile: request.expectedProfileVersion, application: request.expectedApplicationVersion },
    );
    return { ...result, status: 'submitted', healed: false };
  } catch (error) {
    // already submitted (e.g. re-submitting after "Make edits" with no server
    // change) — treat as done and let the client land on the locked view.
    if (isSubmissionLocked(error)) {
      return {
        status: 'already_submitted',
        profileId: request.profileId,
        applicationId: request.applicationId,
        profileVersion: request.expectedProfileVersion,
        studentProfileVersionId: null,
        applicationVersion: request.expectedApplicationVersion,
        applicationVersionId: null,
        healed: false,
      };
    }
    // anything other than a stale/orphaned id is a real failure — surface it.
    if (!isHealable(error)) throw error;
    // stale or cross-account ids: restart the whole flow under fresh ids. Fresh
    // ids + expectedVersion 0 always create cleanly for the current actor.
    const healed = await runOnce(
      service,
      request,
      { profileId: randomUUID(), applicationId: randomUUID() },
      { profile: 0, application: 0 },
    );
    return { ...healed, status: 'submitted', healed: true };
  }
}
