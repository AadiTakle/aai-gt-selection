/*
 * End-to-end integration smoke for the adaptive screening instrument (D-016).
 * Signs in as the born-synthetic proctor, then runs a full adaptive session
 * against the LIVE local Supabase RPCs, driving item selection with the real
 * CAT engine (exactly as the Next.js Server Action adapter does) and a
 * deterministic simulated responder. Prints the final screening outcome.
 *
 * Run from apps/web:  pnpm exec tsx scripts/exam-smoke.ts
 */
import { randomUUID } from 'node:crypto';

import {
  buildOutcome,
  chooseNextItem,
  computeAbilities,
  probabilityCorrect,
  type AdministeredItem,
  type EngineState,
} from '@gt-selection/cat-engine';
import {
  createParticipantResponseSchema,
  examSessionResponseSchema,
  examSessionStateResponseSchema,
  getExamPolicyResponseSchema,
  listExamItemsResponseSchema,
  type ExamItem,
  type ItemResponse,
} from '@gt-selection/contracts';
import { createClient } from '@supabase/supabase-js';

const URL = 'http://127.0.0.1:65421';
const ANON = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const POLICY = 'exam-syn-v1';
const TRUE_THETA = 1.8; // simulate a strong responder

function simulate(item: ExamItem, order: number): AdministeredItem {
  const correct = probabilityCorrect(TRUE_THETA, item.irt) >= 0.5;
  const response: ItemResponse = {
    itemId: item.itemId,
    correct,
    score: correct ? 1 : 0,
    rtMs: 2500,
    firstActionMs: 400,
    revisions: 0,
    engaged: true,
    measurements: { 'M-ACC': correct ? 1 : 0 },
    syntheticOnly: true,
  };
  return { item, order, response };
}

async function main() {
  const client = createClient(URL, ANON, {
    db: { schema: 'api' },
    auth: { persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({
    email: 'admissions@example.test',
    password: 'Synthetic-Only-2026!',
  });
  if (signIn.error) throw new Error(`sign-in failed: ${signIn.error.message}`);

  const call = async <T>(
    name: string,
    args: Record<string, unknown>,
    schema: { parse: (value: unknown) => T },
  ): Promise<T> => {
    const { data, error } = await client.rpc(name as never, args as never);
    if (error) throw new Error(`${name} failed: ${error.message}`);
    return schema.parse(data);
  };

  const participant = (
    await call(
      'create_exam_participant',
      {
        p_pseudonym_code: `PART-SYN-${randomUUID().slice(0, 6).toUpperCase()}`,
        p_age_band: '4-5',
        p_correlation_id: randomUUID(),
      },
      createParticipantResponseSchema,
    )
  ).data.participant;

  const started = (
    await call(
      'start_exam_session',
      {
        p_participant_id: participant.participantId,
        p_policy_version: POLICY,
        p_idempotency_key: randomUUID(),
        p_correlation_id: randomUUID(),
      },
      examSessionResponseSchema,
    )
  ).data.session;

  const policy = (
    await call(
      'get_exam_policy',
      { p_policy_version: POLICY, p_correlation_id: randomUUID() },
      getExamPolicyResponseSchema,
    )
  ).data.policy;
  const bank = (
    await call(
      'list_exam_items',
      { p_policy_version: POLICY, p_age_band: started.ageBand, p_correlation_id: randomUUID() },
      listExamItemsResponseSchema,
    )
  ).data.items;

  const administered: AdministeredItem[] = [];
  let state: EngineState = {
    sessionId: started.sessionId,
    ageBand: started.ageBand,
    policy,
    administered,
  };
  let next = chooseNextItem(state, bank);
  let count = 0;

  while (next && count < 200) {
    administered.push(simulate(next, administered.length + 1));
    state = { ...state, administered: [...administered] };
    const abilities = computeAbilities(state);
    const following = chooseNextItem(state, bank);
    const outcome = following === null ? buildOutcome(state) : null;
    const lastResponse = administered[administered.length - 1]!.response;
    await call(
      'submit_exam_response',
      {
        p_session_id: started.sessionId,
        p_response: lastResponse,
        p_telemetry: [{ kind: 'response', itemId: lastResponse.itemId, tOffsetMs: 2500, payload: {} }],
        p_abilities: abilities,
        p_outcome: outcome,
        p_idempotency_key: randomUUID(),
        p_correlation_id: randomUUID(),
      },
      examSessionResponseSchema,
    );
    next = following;
    count += 1;
  }

  const finalState = (
    await call(
      'get_exam_session',
      { p_session_id: started.sessionId, p_correlation_id: randomUUID() },
      examSessionStateResponseSchema,
    )
  ).data;

  console.log(`items administered: ${count}`);
  console.log(`session status: ${finalState.session.status}`);
  console.log(`persisted responses: ${finalState.responses.length}`);
  console.log('outcome:', JSON.stringify(finalState.outcome, null, 2));
  if (!finalState.outcome) throw new Error('no outcome persisted');
  console.log(
    `DECISION=${finalState.outcome.decision} fitIndex=${finalState.outcome.fitIndex.toFixed(3)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
