'use server';

import { createServerLocalSyntheticExamAdapter } from './local-synthetic-adapter';
import type { CreateParticipantInput, StartSessionInput, SubmitResponseInput } from './service';

export async function createExamParticipantAction(input: CreateParticipantInput) {
  const service = await createServerLocalSyntheticExamAdapter();
  return service.createParticipant(input);
}

export async function startExamSessionAction(input: StartSessionInput) {
  const service = await createServerLocalSyntheticExamAdapter();
  return service.startSession(input);
}

export async function submitExamResponseAction(input: SubmitResponseInput) {
  const service = await createServerLocalSyntheticExamAdapter();
  return service.submitResponse(input);
}

export async function getExamSessionAction(sessionId: string) {
  const service = await createServerLocalSyntheticExamAdapter();
  return service.getSession(sessionId);
}
