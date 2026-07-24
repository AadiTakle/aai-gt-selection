/**
 * Adaptive-screening full-session smoke / e2e (AX-02..AX-05, D-016; serves R11).
 *
 * Drives a complete synthetic adaptive session exactly the way the app does:
 * signs in as the born-synthetic proctor, runs the real @gt-selection/cat-engine
 * to pick each next item and score the outcome, and persists every scored
 * response + telemetry + the final outcome through the Supabase RPCs. Then reads
 * the session back and asserts the responses landed, the session completed, and a
 * 0-100 headline score was produced. Loopback-only; no live data.
 *
 * Prereqs: `pnpm db:reset` (applies migrations + seed) and `pnpm db:users`
 * (creates the synthetic admissions_operator). Run: `pnpm exam:smoke`.
 */
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

import {
  buildOutcome,
  chooseNextItem,
  computeAbilities,
  toServedItem,
  type AdministeredItem,
  type EngineState,
} from '@gt-selection/cat-engine';
import type {
  DomainAbility,
  ExamItem,
  ExamPolicy,
  ItemResponse,
  ScreeningOutcome,
  TelemetryEvent,
} from '@gt-selection/contracts';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PROCTOR_EMAIL = 'admissions@example.test';
const PROCTOR_PASSWORD = 'Synthetic-Only-2026!';
const POLICY_VERSION = 'exam-syn-v1';
const AGE_BAND = '4-5';
/** Synthetic "true" ability of the simulated test-taker (strong-ish learner). */
const TRUE_THETA = 1.1;

function readLocalSupabase(): { url: string; anonKey: string } {
  const result = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || 'Unable to read local Supabase status.');
  const status = JSON.parse(result.stdout) as {
    API_URL: string;
    ANON_KEY: string;
    PUBLISHABLE_KEY?: string;
  };
  const url = new URL(status.API_URL);
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error('Exam smoke refuses non-loopback Supabase URLs.');
  }
  return { url: status.API_URL, anonKey: status.PUBLISHABLE_KEY ?? status.ANON_KEY };
}

interface Envelope<T> {
  data: T;
}

async function rpc<T>(
  supabase: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`RPC ${name} failed: ${error.message}`);
  return (data as Envelope<T>).data;
}

/** Deterministic 2PL correctness for the simulated learner. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulateResponse(item: ExamItem, rng: () => number): ItemResponse {
  const { a, b, c } = item.irt;
  const p = c + (1 - c) / (1 + Math.exp(-a * (TRUE_THETA - b)));
  const correct = rng() < p;
  const rtMs = 3200 + Math.round(rng() * 4200);
  const firstActionMs = 700 + Math.round(rng() * 1500);
  const revisions = rng() < 0.2 ? 1 : 0;
  return {
    itemId: item.itemId,
    correct,
    score: correct ? 1 : 0,
    rtMs,
    firstActionMs,
    revisions,
    engaged: rtMs >= 700,
    measurements: {
      'M-ACC': correct ? 1 : 0,
      'M-RT': rtMs,
      'M-RTFIRST': firstActionMs,
      'M-REV': revisions,
      'M-DIFFREACH': correct ? item.difficultyLevel : 0,
    },
    syntheticOnly: true,
  };
}

function telemetryFor(response: ItemResponse, difficulty: number): TelemetryEvent[] {
  return [
    { kind: 'item_shown', itemId: response.itemId, tOffsetMs: 0, payload: { difficulty } },
    {
      kind: 'first_action',
      itemId: response.itemId,
      tOffsetMs: response.firstActionMs ?? 0,
      payload: {},
    },
  ];
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-0.5 * x * x);
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = d * poly;
  return x >= 0 ? 1 - p : p;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL  ${message}`);
    process.exit(1);
  }
  console.log(`PASS  ${message}`);
}

async function main() {
  const { url, anonKey } = readLocalSupabase();
  const supabase = createClient(url, anonKey, {
    db: { schema: 'api' },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: PROCTOR_EMAIL,
    password: PROCTOR_PASSWORD,
  });
  if (signInError) {
    throw new Error(
      `Synthetic proctor sign-in failed (${signInError.message}). Run \`pnpm db:users\` first.`,
    );
  }

  const participant = await rpc<{ participant: { participantId: string } }>(
    supabase,
    'create_exam_participant',
    {
      p_pseudonym_code: `PART-SYN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      p_age_band: AGE_BAND,
      p_correlation_id: randomUUID(),
    },
  );

  const started = await rpc<{ session: { sessionId: string; ageBand: string; policyVersion: string } }>(
    supabase,
    'start_exam_session',
    {
      p_participant_id: participant.participant.participantId,
      p_policy_version: POLICY_VERSION,
      p_idempotency_key: randomUUID(),
      p_correlation_id: randomUUID(),
    },
  );
  const sessionId = started.session.sessionId;

  const policyResp = await rpc<{ policy: ExamPolicy }>(supabase, 'get_exam_policy', {
    p_policy_version: POLICY_VERSION,
    p_correlation_id: randomUUID(),
  });
  const bankResp = await rpc<{ items: ExamItem[] }>(supabase, 'list_exam_items', {
    p_policy_version: POLICY_VERSION,
    p_age_band: started.session.ageBand,
    p_correlation_id: randomUUID(),
  });
  const policy = policyResp.policy;
  const bank = bankResp.items;

  console.log(`Item bank: ${bank.length} items across ${policy.domains.length} domains.`);

  const rng = mulberry32(0xa5ce7d);
  let administered: AdministeredItem[] = [];
  let state: EngineState = {
    sessionId,
    ageBand: started.session.ageBand as EngineState['ageBand'],
    policy,
    administered,
  };

  let next = chooseNextItem(state, bank);
  let answered = 0;
  let finalOutcome: ScreeningOutcome | null = null;
  const domainsSeen = new Set<string>();
  let maxDifficulty = 0;

  while (next) {
    const served = toServedItem(next);
    domainsSeen.add(served.domain);
    const response = simulateResponse(next, rng);
    if (response.correct) maxDifficulty = Math.max(maxDifficulty, next.difficultyLevel);

    administered = [...administered, { item: next, order: administered.length + 1, response }];
    state = { ...state, administered };
    const abilities: DomainAbility[] = computeAbilities(state);
    const afterNext = chooseNextItem(state, bank);
    const outcome = afterNext === null ? buildOutcome(state) : null;

    await rpc(supabase, 'submit_exam_response', {
      p_session_id: sessionId,
      p_response: response,
      p_telemetry: telemetryFor(response, served.difficultyLevel),
      p_abilities: abilities,
      p_outcome: outcome,
      p_idempotency_key: randomUUID(),
      p_correlation_id: randomUUID(),
    });

    answered += 1;
    if (outcome) finalOutcome = outcome;
    next = afterNext;
  }

  console.log(
    `Administered ${answered} items across ${domainsSeen.size} domains; hardest correct rung ${maxDifficulty}/6.`,
  );

  // Read the session back through the API to prove durable persistence.
  const readback = await rpc<{
    session: { status: string };
    responses: unknown[];
    outcome: ScreeningOutcome | null;
  }>(supabase, 'get_exam_session', { p_session_id: sessionId, p_correlation_id: randomUUID() });

  assert(answered >= 12 && answered <= 16, `session length in band (got ${answered}, target 12-15)`);
  assert(domainsSeen.size === 4, 'session spanned all four reasoning domains');
  assert(maxDifficulty >= 4, `session reached genuinely hard items (rung ${maxDifficulty}/6)`);
  assert(readback.responses.length === answered, `all ${answered} responses persisted`);
  assert(readback.session.status === 'completed', 'session marked completed');
  assert(readback.outcome !== null, 'final outcome persisted');

  const outcome = finalOutcome ?? readback.outcome;
  if (!outcome) {
    console.error('FAIL  no outcome produced');
    process.exit(1);
  }
  const ascendScore = Math.round(Math.max(0, Math.min(100, normalCdf(outcome.fitIndex) * 100)));
  console.log(
    `\nAscend Score ${ascendScore}/100 · decision ${outcome.decision} · composite θ ${outcome.compositeTheta.toFixed(
      2,
    )} · fit ${outcome.fitIndex.toFixed(2)} · engagement ${outcome.engagementValid ? 'valid' : 'provisional'}`,
  );
  for (const d of outcome.domainScores) {
    console.log(
      `  ${d.domain.padEnd(16)} θ ${d.theta.toFixed(2)}  %ile ${
        d.percentile == null ? '—' : Math.round(d.percentile)
      }  items ${d.itemsAdministered}  hardest ${d.maxDifficultyReached}/6`,
    );
  }
  console.log('\nAll exam smoke assertions passed.');
  process.exit(0);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
