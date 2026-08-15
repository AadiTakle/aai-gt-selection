/**
 * Reconcile a persisted exam session against the two claims its outcome row makes.
 *
 * `app.exam_session_outcome.claim_boundary` asserts the score is "recomputable from the
 * stored trace via app.exam_scorer_input_json", and D-027 asserts the database is the
 * authority on per-item correctness. Both were written down before anything checked them.
 * This does the checking, on a real session rather than on synthesised cases:
 *
 *   1. RE-VERIFY — every stored response is re-graded by `app.exam_verify_response` and compared
 *      to the `correct` stored beside it. Note what this does and does not prove: that column is
 *      written by `api.exam_record_response`, which calls the same dispatcher, so this compares
 *      the database against ITSELF ACROSS TIME. It catches a trace whose recorded verdict the
 *      current dispatcher no longer reproduces — which is what happens to every session recorded
 *      while a type was still unported, since the dispatcher fell back to the keyed default and
 *      rejected constructed responses (E-081). It CANNOT see an app-tier/database divergence;
 *      only `pnpm exam:verify:diff` compares the two implementations. Ported and generic tiers
 *      are reported separately, so a session that served only generic types cannot look like
 *      proof of the port.
 *   2. RE-HASH — `app.exam_scorer_input_hash` is recomputed and compared to the hash stored
 *      on the outcome. A mismatch means the trace has drifted since it was scored.
 *   3. RE-SCORE — the stored scorer input is fed back through `scoreExam` from
 *      `packages/exam-scoring` and the composite, per-area scores and profile are compared to
 *      what is stored. This is what makes "deterministic and reproducible" falsifiable.
 *
 * The exit code is non-zero if any of the three fails, so it can gate a merge.
 *
 * Usage (against a running local Supabase):
 *   pnpm exam:reconcile              # the most recently started session
 *   pnpm exam:reconcile <uuid>       # a specific session
 *   pnpm exam:reconcile --all        # every completed session
 *
 * Read-only: it opens no transaction and writes nothing.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { DEFAULT_EXAM_POLICY, scoreExam, type ScoredItem } from '@gt-selection/exam-scoring';
import { Client } from 'pg';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');

/** Composite and area scores are float; compare to a tolerance, not exactly. */
const SCORE_EPSILON = 1e-9;

interface ResponseRow {
  type_code: string;
  order_no: number;
  app_correct: boolean | null;
  db_correct: boolean | null;
  ported: boolean;
}

/** One entry of the outcome's `area_scores`, which is a JSON ARRAY of `AreaScore`, not a map. */
interface StoredArea {
  area: string;
  proficiency: number;
  accuracy: number;
  bracket: number;
}

interface OutcomeRow {
  composite_score: number;
  area_scores: StoredArea[] | null;
  profile: unknown;
  scorer_input_hash: string | null;
  scorer_input_count: number;
  scorer_source: string;
}

function localDatabaseUrl(): string {
  const fromEnv = process.env.EXAM_DIFF_DB_URL ?? process.env.SUPABASE_DB_URL;
  if (fromEnv) return fromEnv;
  const status = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const found = /"DB_URL"\s*:\s*"([^"]+)"/.exec(status);
  if (!found?.[1]) throw new Error('exam-reconcile: `supabase status -o json` reported no DB_URL.');
  return found[1];
}

function assertLocal(url: string): void {
  const host = new URL(url).hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`exam-reconcile refuses a non-loopback database (${host}).`);
  }
}

/**
 * Serialise with OBJECT KEYS SORTED, so a jsonb round trip compares equal.
 *
 * Postgres normalises jsonb object keys by length then bytewise, so the stored
 * profile comes back as `{strengths, consistency, rankedAreas, …}` while the
 * scorer emits `{strengths, relativeWeaknesses, rankedAreas, …}`. Array order is
 * left alone: `rankedAreas` is an ordering and a change in it is a real change.
 */
function canonical(value: unknown): string {
  const sortKeys = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(sortKeys);
    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.entries(node as Record<string, unknown>)
          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
          .map(([key, entry]) => [key, sortKeys(entry)]),
      );
    }
    return node;
  };
  return JSON.stringify(sortKeys(value ?? null));
}

/** Deep-compare two profiles by content; the profile is data, not a float. */
function sameProfile(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

async function sessionIds(client: Client): Promise<string[]> {
  if (process.argv.includes('--all')) {
    const all = await client.query<{ session_id: string }>(
      `select s.session_id from app.exam_session s
         join app.exam_session_outcome o on o.session_id = s.session_id
        order by s.started_at`,
    );
    return all.rows.map((r) => r.session_id);
  }
  const explicit = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (explicit) return [explicit];
  const latest = await client.query<{ session_id: string }>(
    `select s.session_id from app.exam_session s
       join app.exam_session_outcome o on o.session_id = s.session_id
      order by s.started_at desc limit 1`,
  );
  if (latest.rows.length === 0) {
    throw new Error(
      'exam-reconcile: no scored session found. Run a battery first, or see ' +
        'docs/architecture/EXAM_PERSISTENCE_NOTES.md §6.',
    );
  }
  return latest.rows.map((r) => r.session_id);
}

async function reconcile(client: Client, sessionId: string): Promise<boolean> {
  const outcome = await client.query<OutcomeRow>(
    `select composite_score, area_scores, profile, scorer_input_hash,
            scorer_input_count, scorer_source
       from app.exam_session_outcome where session_id = $1`,
    [sessionId],
  );
  const stored = outcome.rows[0];
  if (!stored) {
    console.log(`${sessionId}  NO OUTCOME — session was never scored`);
    return false;
  }

  /* 1. re-verify every response through the database ---------------------- */
  const responses = await client.query<ResponseRow>(
    `select r.type_code, r.order_no, r.correct as app_correct,
            (app.exam_verify_response(r.item_id, r.raw_answer)->>'correct')::boolean as db_correct,
            exists(select 1 from app.exam_verifier_registry g
                    where g.type_code = r.type_code) as ported
       from app.exam_item_response r
      where r.session_id = $1
      order by r.order_no`,
    [sessionId],
  );

  const tiers = { ported: { n: 0, agree: 0 }, generic: { n: 0, agree: 0 } };
  const disagreements: string[] = [];
  for (const row of responses.rows) {
    const tier = row.ported ? tiers.ported : tiers.generic;
    tier.n += 1;
    if (row.app_correct === row.db_correct) tier.agree += 1;
    else
      disagreements.push(
        `#${row.order_no} ${row.type_code} app=${row.app_correct} db=${row.db_correct}`,
      );
  }
  const verifyOk = disagreements.length === 0;

  /* 2. re-hash the stored trace ------------------------------------------ */
  const hash = await client.query<{ h: string }>('select app.exam_scorer_input_hash($1) as h', [
    sessionId,
  ]);
  const rehashed = hash.rows[0]?.h ?? null;
  const hashOk = stored.scorer_input_hash !== null && rehashed === stored.scorer_input_hash;

  /* 3. re-score from the stored trace ------------------------------------ */
  const input = await client.query<{ j: ScoredItem[] }>(
    'select app.exam_scorer_input_json($1) as j',
    [sessionId],
  );
  const items = input.rows[0]?.j ?? [];
  const rescored = scoreExam(items, DEFAULT_EXAM_POLICY);
  const compositeOk = Math.abs(rescored.composite - stored.composite_score) <= SCORE_EPSILON;
  const countOk = items.length === stored.scorer_input_count;

  const storedAreas = stored.area_scores ?? [];
  const rescoredAreas = rescored.perArea as Record<string, StoredArea | undefined>;
  const areaDiffs: string[] = [];
  for (const area of storedAreas) {
    const got = rescoredAreas[area.area];
    if (!got) {
      areaDiffs.push(`${area.area}: absent from the recomputed score`);
      continue;
    }
    // Compare the two numbers that decide the outcome — the bracket driver and the
    // proficiency inside it — plus the bracket itself, which is ordinal and exact.
    if (Math.abs(got.proficiency - area.proficiency) > SCORE_EPSILON) {
      areaDiffs.push(
        `${area.area}: proficiency stored=${area.proficiency} rescored=${got.proficiency}`,
      );
    }
    if (Math.abs(got.accuracy - area.accuracy) > SCORE_EPSILON) {
      areaDiffs.push(`${area.area}: accuracy stored=${area.accuracy} rescored=${got.accuracy}`);
    }
    if (got.bracket !== area.bracket) {
      areaDiffs.push(`${area.area}: bracket stored=${area.bracket} rescored=${got.bracket}`);
    }
  }
  const profileOk = sameProfile(stored.profile, rescored.profile);
  const scoreOk = compositeOk && countOk && areaDiffs.length === 0 && profileOk;

  /* report --------------------------------------------------------------- */
  const ok = verifyOk && hashOk && scoreOk;
  console.log(`\nsession ${sessionId}  ${ok ? 'RECONCILED' : 'FAILED'}`);
  console.log(
    `  verdicts   ported ${tiers.ported.agree}/${tiers.ported.n}, ` +
      `generic ${tiers.generic.agree}/${tiers.generic.n} agree` +
      (verifyOk ? '' : `\n             ${disagreements.join('\n             ')}`),
  );
  console.log(
    `  trace hash ${hashOk ? 'unchanged' : `DRIFTED stored=${stored.scorer_input_hash} now=${rehashed}`}`,
  );
  console.log(
    `  composite  stored ${stored.composite_score} rescored ${rescored.composite}` +
      ` over ${items.length} items (${stored.scorer_source})` +
      (countOk ? '' : ` — COUNT MISMATCH, outcome recorded ${stored.scorer_input_count}`),
  );
  if (areaDiffs.length > 0) console.log(`  areas      ${areaDiffs.join('\n             ')}`);
  if (!profileOk) {
    console.log(
      `  profile    DIFFERS from the stored profile\n             stored   ${canonical(stored.profile)}` +
        `\n             rescored ${canonical(rescored.profile)}`,
    );
  }
  return ok;
}

async function main(): Promise<void> {
  const url = localDatabaseUrl();
  assertLocal(url);
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const ids = await sessionIds(client);
    let failures = 0;
    for (const id of ids) {
      const ok = await reconcile(client, id);
      if (!ok) failures += 1;
    }
    console.log(
      `\n${ids.length - failures}/${ids.length} session(s) reconciled: the database agrees with ` +
        'the recorded verdicts, and the recorded score recomputes from the stored trace.',
    );
    if (failures > 0) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await main();
