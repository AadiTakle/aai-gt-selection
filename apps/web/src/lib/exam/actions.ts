'use server';

import type { AgeBand } from '@gt-selection/contracts';

import { parseUserRoleClaim } from '@/lib/role-claims';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import {
  createLocalSyntheticExamAdapter,
  createServerLocalSyntheticExamAdapter,
  type LocalExamRpcClient,
} from './local-synthetic-adapter';
import type { CreateParticipantInput, StartSessionInput, SubmitResponseInput } from './service';

/**
 * The born-synthetic exam RPCs require a trusted synthetic proctor
 * (admissions_operator). For the loopback-only demo we establish that session
 * server-side so no credentials or Supabase keys ever reach the browser bundle.
 */
const SYNTHETIC_PROCTOR_EMAIL = 'admissions@example.test';
const SYNTHETIC_PROCTOR_PASSWORD = 'Synthetic-Only-2026!';

export async function createExamParticipantAction(input: CreateParticipantInput) {
  const service = await createServerLocalSyntheticExamAdapter();
  return service.createParticipant(input);
}

export async function startExamSessionAction(input: StartSessionInput) {
  const service = await createServerLocalSyntheticExamAdapter();
  return service.startSession(input);
}

/**
 * Demo entry point: ensure the synthetic proctor session (signing in server-side
 * if needed), then create a pseudonymous participant and open an adaptive
 * session — returning the first served item. Loopback-only, born-synthetic.
 */
export async function startProctoredExamAction(input: {
  pseudonymCode: string;
  ageBand: AgeBand;
  policyVersion: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const role = parseUserRoleClaim(data?.claims);
  if (!(role.success && role.data === 'admissions_operator')) {
    const { error } = await supabase.auth.signInWithPassword({
      email: SYNTHETIC_PROCTOR_EMAIL,
      password: SYNTHETIC_PROCTOR_PASSWORD,
    });
    if (error) {
      throw new Error(
        `Could not open a synthetic proctor session (${error.message}). Seed local users with \`pnpm db:users\`.`,
      );
    }
  }
  const service = createLocalSyntheticExamAdapter({
    client: supabase as unknown as LocalExamRpcClient,
    environment: process.env,
  });
  const participant = await service.createParticipant({
    pseudonymCode: input.pseudonymCode,
    ageBand: input.ageBand,
  });
  return service.startSession({
    participantId: participant.participantId,
    policyVersion: input.policyVersion,
  });
}

export async function submitExamResponseAction(input: SubmitResponseInput) {
  const service = await createServerLocalSyntheticExamAdapter();
  return service.submitResponse(input);
}

export async function getExamSessionAction(sessionId: string) {
  const service = await createServerLocalSyntheticExamAdapter();
  return service.getSession(sessionId);
}
