'use server';

import type {
  GetApplicationRequest,
  GetApplicationStatusRequest,
  GetStudentProfileRequest,
  ListActiveSchoolsRequest,
  ListStudentProfilesRequest,
  SaveApplicationDraftRequest,
  SaveStudentProfileRequest,
  SubmitApplicationRequest,
} from '@gt-selection/contracts';

import { createServerLocalSyntheticOnboardingAdapter } from './local-synthetic-adapter';
import { runSubmitApplicationFlow, type SubmitApplicationFlowRequest } from './submit-flow';

export async function saveStudentProfileAction(request: SaveStudentProfileRequest) {
  const service = await createServerLocalSyntheticOnboardingAdapter();
  return service.saveStudentProfile(request);
}

export async function getStudentProfileAction(request: GetStudentProfileRequest) {
  const service = await createServerLocalSyntheticOnboardingAdapter();
  return service.getStudentProfile(request);
}

export async function listStudentProfilesAction(request: ListStudentProfilesRequest) {
  const service = await createServerLocalSyntheticOnboardingAdapter();
  return service.listStudentProfiles(request);
}

export async function listActiveSchoolsAction(request: ListActiveSchoolsRequest) {
  const service = await createServerLocalSyntheticOnboardingAdapter();
  return service.listActiveSchools(request);
}

export async function saveApplicationDraftAction(request: SaveApplicationDraftRequest) {
  const service = await createServerLocalSyntheticOnboardingAdapter();
  return service.saveApplicationDraft(request);
}

export async function getApplicationAction(request: GetApplicationRequest) {
  const service = await createServerLocalSyntheticOnboardingAdapter();
  return service.getApplication(request);
}

export async function submitApplicationAction(request: SubmitApplicationRequest) {
  const service = await createServerLocalSyntheticOnboardingAdapter();
  return service.submitApplication(request);
}

export async function getApplicationStatusAction(request: GetApplicationStatusRequest) {
  const service = await createServerLocalSyntheticOnboardingAdapter();
  return service.getApplicationStatus(request);
}

/**
 * Run the whole submit sequence (profile → draft → submit) server-side, where
 * the real RPC error codes are visible. On a stale/cross-account application it
 * self-heals under fresh ids so submit can't dead-end — see `submit-flow.ts`.
 */
export async function submitApplicationFlowAction(request: SubmitApplicationFlowRequest) {
  const service = await createServerLocalSyntheticOnboardingAdapter();
  return runSubmitApplicationFlow(service, request);
}
