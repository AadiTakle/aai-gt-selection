# Adaptive Exam Backend — Execution & Verification Status

**Verified 2026-07-24 (worktree `gt-selection-ex-backend`, branch `feat/exam-backend`, base `e57454c`).**

This records the first *actual execution* of the adaptive-screener migrations. They were
written in the previous session but never run; the pgTAP suite was never executed. Everything
below is a real result from the running local stack, not a design intention.

Serves **R11**. Born-synthetic throughout (`synthetic_only = true`, `validated = false`);
decision **D-017** remains *Proposed*.

---

## 1. What applied

All three migrations applied **cleanly on the first attempt**, via
`supabase migration up --local` (the official CLI path, so the ledger is recorded properly):

| Migration | Result |
|---|---|
| `20260724130000_exam_adaptive_core.sql` | applied — 8 tables, forced RLS, grants |
| `20260724130100_exam_adaptive_api.sql` | applied — 4 `app` helpers + 7 `api` RPCs |
| `20260724130200_exam_adaptive_seed.sql` | applied — 1 policy, 4 question types, 80 bank items |

`supabase_migrations.schema_migrations` now lists exactly the 13 migrations present in
`supabase/migrations/` on this branch — the local database and this branch agree.

### No destructive reset was required

**A full `pnpm db:reset` was NOT run.** All worktrees share one local Supabase instance and one
Postgres port, so a reset would have destroyed the teammate's local auth users and application
data. Instead the schema was reconciled surgically.

The obstacle: the shared local database had migrations `20260724120000` / `120100` / `120200`
applied — the superseded `feat/adaptive-exam-app` `exam_core.sql` generation. Those are **not on
this branch** (they live only in the `gt-selection-adaptive-exam` worktree), and they collide on
all eight `app.exam_*` table names. Their design is the older integer/IRT one
(`difficulty_level integer`, `irt_a/b/c`, no answer-key column at all).

`supabase/tools/reconcile_local_exam_schema.sql` removes them (objects **and** ledger rows) so
`supabase migration up --local` can apply this branch's set. It is re-runnable and documents
exactly what was done to the shared database.

**What was destroyed:** the superseded `exam_core` objects plus their contents — 1 synthetic
session, 1 synthetic participant, 4 synthetic responses. All born-synthetic prototype data from a
previous run of a superseded design. A data-only dump was taken first
(`/tmp/superseded_exam_data_backup.sql`, local scratch, not committed). Nothing belonging to the
teammate's assessment portal was touched; local auth users were preserved, so **`pnpm db:users`
did not need to be re-run**.

**Consequence to be aware of:** the `gt-selection-adaptive-exam` worktree can no longer assume its
`exam_core` schema is live. Re-running `supabase migration up --local` from that worktree would
try to re-apply `1200xx` and collide again. That branch is superseded by this one.

---

## 2. pgTAP result

```
$ supabase test db --local
... 000_scaffold ... ok      ... 080_milestone_a_schema_security ... ok
... 010_onboarding_cycle ... ok  ... 090_profile_directory_api ...... ok
... 020_onboarding_idempotency . ok  ... 100_application_roundtrip_firewall ok
... 030_onboarding_application_schema ok  ... 110_idempotency_directory_expiry ok
... 040_onboarding_rls ......... ok  ... 120_exam_adaptive_backend ..... ok
... 050_save_application_draft . ok  ... 121_exam_answer_key_firewall ... ok
... 060_submit_application ..... ok
... 070_get_application_status . ok
All tests successful.
Files=14, Tests=274,  1 wallclock secs
Result: PASS
```

**274 assertions across 14 files, 0 failures.**

- `120_exam_adaptive_backend.test.sql` — **44/44 pass, unmodified.** No assertion had to be
  corrected. The migrations were right and the test was right; they had simply never been run
  against each other.
- `121_exam_answer_key_firewall.test.sql` — **new, 26/26 pass** (see §4).
- The 12 pre-existing suites (204 assertions) still pass, so this schema composes with the
  teammate's assessment portal rather than colliding with it.

One migration change was needed, and it came from the linter rather than the tests (§3).

---

## 3. `db:lint`

```
$ supabase db lint --local --schema app,api,public --fail-on error
Linting schema: app / api / public
No schema errors found
{"results":[],"message":"db lint"}
```

**Clean — zero results at every level, not just zero errors.** Two findings were fixed to get here:

1. **Error**, `api.submit_exam_response`: `column "rt_ms" of relation "exam_item_response" does not
   exist`. This was a *leftover* — a superseded `1200xx` RPC whose 7-argument signature my first
   drop pass missed (I had guessed 6). Its body referenced the old table shape, which no longer
   existed. The linter caught it; the pgTAP suite could not have, because nothing calls it.
   Dropped in `reconcile_local_exam_schema.sql`.
2. **Warning**, `app.exam_compute_outcome`: unused variable `v_existing`. Removed from
   `20260724130100_exam_adaptive_api.sql`. After the edit the whole migration set was torn down and
   re-applied from the files, so the committed SQL and the live database are byte-for-byte the same
   definition rather than the file having been patched after the fact.

---

## 4. Security boundary: answer keys cannot reach a client

This was verified three independent ways, and then verified *again* by deliberately breaking it.

### 4a. Grant posture (SQL)

```sql
select has_schema_privilege('anon','app','usage'),
       has_schema_privilege('authenticated','app','usage'),
       has_column_privilege('anon','app.exam_item','answer_key','select'),
       has_column_privilege('authenticated','app.exam_item','answer_key','select'),
       has_column_privilege('anon','app.exam_item','scoring','select'),
       has_column_privilege('authenticated','app.exam_item','scoring','select'),
       has_table_privilege('service_role','app.exam_item','select');
```

→ **`f` for every one of them.** The full ACL on the table is:

```
app.exam_item relacl = {app_owner=arwdDxtm/app_owner, api_executor=r/app_owner}
```

No client-facing role appears at all — not `anon`, not `authenticated`, not `service_role`, not
`PUBLIC`. The key columns are unreachable because the *table* is unreachable.

### 4b. Runtime denial (SQL)

```sql
set role anon;          select answer_key from app.exam_item;
set role anon;          select scoring    from app.exam_item;
set role authenticated; select answer_key from app.exam_item;
set role authenticated; select scoring    from app.exam_item;
```

→ all four raise **`42501 permission denied for schema app`**. Denial happens at the schema gate,
before row-level or column-level policy is even consulted.

### 4c. The served projection is key-free (SQL)

```sql
select array_agg(k order by k) from jsonb_object_keys(app.exam_served_item_json(<item>)) k;
```

→ `{ageBands, content, demoPath, difficulty, domain, itemId, syntheticOnly, typeCode, validated}`

Nine presentation fields. `answer_key`, `scoring`, and `provenance` are structurally absent — the
projection is an explicit allow-list, not a filtered `select *`.

### 4d. End-to-end over HTTP (the surface a browser actually reaches)

Against the live PostgREST at `127.0.0.1:65421`:

| # | Request (as role) | Result |
|---|---|---|
| A | `GET /rest/v1/exam_item?select=*` (anon) | **404** `PGRST205 Could not find the table 'api.exam_item' in the schema cache` |
| B | `GET /rest/v1/exam_item?select=answer_key,scoring` + `Accept-Profile: app` (anon) | **406** `PGRST106 Invalid schema: app — Only the following schemas are exposed: api` |
| C | `POST /rest/v1/rpc/exam_get_next_item` (anon) | **401** `42501 permission denied for schema api` |
| E | `GET /rest/v1/exam_item?select=answer_key` + `Accept-Profile: app` (**authenticated operator**) | **406** `PGRST106 Invalid schema: app` |
| G | `POST /rest/v1/rpc/exam_get_next_item` (**authenticated operator**, valid JWT) | **200**, key-free item |

The G payload's item object, over the wire:

```json
{"domain":"fluid_reasoning","itemId":"3d39d033-...","content":{"prompt":"Choose the option that
completes the pattern.","options":[{"key":"A"},{"key":"B"},{"key":"C"},{"key":"D"}],
"difficulty":10.0},"ageBands":["2-3","4-5"],"demoPath":"FLU-MATRIX-01.html",
"typeCode":"FLU-MATRIX-01","validated":false,"difficulty":10.0,"syntheticOnly":true}
```

Grepping that response for `answer_key|answerKey|correctKey|solution|scoring|provenance` returned
**no matches**. (`{"key":"A"}` entries are *option identifiers* — the choices rendered to the
child — not the answer.) The rows this roundtrip created were deleted afterwards; the bank is back
to 80 seeded items, 0 sessions, 0 participants.

### 4e. Codified as a permanent test, and proven non-vacuous

All of the above is now `supabase/tests/121_exam_answer_key_firewall.test.sql` — **26 assertions,
26 pass**. Two of them (11, 12) assert the key *is* present server-side, so the firewall assertions
cannot pass against an empty column; assertion 25 does the same for the list payload.

As a negative control, `app.exam_served_item_json` was temporarily rewritten to include
`answer_key` inside a rolled-back transaction:

```
not ok 1 - served projection field set
#   have: {ageBands,answerKey,content,demoPath,difficulty,domain,itemId,syntheticOnly,typeCode,validated}
#   want: {ageBands,content,demoPath,difficulty,domain,itemId,syntheticOnly,typeCode,validated}
not ok 2 - payload matches no key-material pattern
```

The test detects a leak. It is not passing by accident.

**Naming note:** BUILD_PLAN §2 calls the contract field `answer`; the physical column is
`app.exam_item.answer_key`. Both it and `scoring` are covered.

---

## 5. Generated types — NOT regenerated (needs a decision)

`supabase gen types typescript --local --schema api` produces a **purely additive** diff against
the committed `packages/db-types/src/database.generated.ts`: the 7 new `exam_*` RPCs
(`exam_create_participant`, `exam_list_items`, `exam_start_session`, `exam_get_next_item`,
`exam_submit_response`, `exam_get_session_state`, `exam_get_outcome`), 50 added lines, nothing
removed or changed.

**`pnpm db:types:check` is therefore currently NOT satisfied**, and I did not fix it, because the
target file lives under `packages/`, which this task explicitly assigns to another agent. The
instruction to regenerate and the instruction not to touch `packages/` conflict, so rather than
silently pick one I am flagging it: overwriting a single generated file that another in-flight
workstream may be editing right now is the harder change to undo.

**To resolve, the `packages/` owner runs one command with this branch's schema live:**

```
pnpm db:types && pnpm db:types:check
```

No hand-editing is needed. The diff is deterministic and additive.

---

## 6. Open design question: ONE source of truth for selection and scoring

**This is a recommendation, not a ratified decision. It requires sign-off before anyone acts on
it, and nothing in `packages/` was changed.**

### The conflict as it actually stands

There are two live implementations:

| | In-database (this branch) | TypeScript (`packages/exam-engine` + `exam-scoring`) |
|---|---|---|
| Selection | `api.exam_get_next_item` ordering CTE: `attempts → domain ordinal → age-band → metric coverage → difficulty gap` | `selection.ts` + `rng.ts`, seeded RNG |
| Per-item verification | `app.exam_score_response` vs. the server-only key | Next.js `/api/exam-submit`, keys from bank files |
| Final score | `app.exam_compute_outcome` | `scorer.ts` |
| Size / tests | ~1,000 lines plpgsql, 70 pgTAP assertions | ~3,076 lines TS, 51 unit tests + a convergence simulation |
| Used by the app today | nothing | everything |

They are **not equivalent**, and the divergence is substantive, not cosmetic:

- **Scoring.** BUILD_PLAN §5 requires *accuracy sets the bracket, metrics position within the
  bracket*. `scorer.ts` implements exactly that. `app.exam_compute_outcome` does not — it reports
  per-area proficiency as simply the final adaptive difficulty and the composite as a weighted mean
  of those. It is a reasonable placeholder, but it is a **simplification that will silently disagree
  with the TS scorer on the same trace.** Two different numbers from one trace is precisely the
  failure the "one source of truth" requirement exists to prevent.
- **Selection.** Different tie-breaking and a seeded RNG on one side only, so the two will serve
  **different item sequences from identical state** — meaning different traces, not just different
  scores.
- **Double-computation, today.** `api.exam_submit_response` calls `app.exam_compute_outcome`
  automatically when the stop rule fires. If the app also scores with `scoring.ts`, one session
  produces two competing outcomes. This is the concrete thing to resolve first.

### Recommendation: split by concern; do not pick one side wholesale

**The database must own the answer keys and per-item verification. The TypeScript packages should
own selection and final scoring.**

Reasoning:

1. **Key custody is not negotiable and belongs in the DB.** §4 above is only meaningful because the
   key comparison happens inside `app.exam_score_response`, behind a schema no client role can
   reach. Moving verification into the app tier would make the entire firewall decorative. Keep
   `exam_item.answer_key`, `exam_score_response`, the persistence tables, telemetry, and the RPC
   surface exactly as they are.
2. **Scoring belongs where §5 is actually implemented.** The TS scorer is the faithful one. Porting
   the bracket-then-position pipeline into plpgsql would mean rewriting ~3,000 tested lines into a
   language with a much weaker testing story, to obtain a number we can already compute correctly.
3. **Reproducibility does not require in-database computation.** It requires a frozen trace plus a
   frozen policy version — both of which this schema already stores
   (`exam_item_response` + `exam_session_outcome.policy_version`). A pure function of
   `(trace, policy)` is reproducible wherever it runs; `scoreExam` is explicitly pure (no clock, no
   randomness, no I/O).
4. **The policy is meant to become admin-tunable.** Iterating weights in a versioned, unit-tested TS
   policy object is far cheaper than iterating them in migrations.

**Concrete change implied** (not made): demote `app.exam_compute_outcome` from authority to
reference, and replace the auto-computation inside `exam_submit_response` with an explicit
`api.exam_record_outcome(session_id, outcome, policy_version, ...)` that persists the outcome the TS
scorer produced. Likewise demote the in-DB selection CTE to a fallback once the app drives selection
through the engine.

**Risk this introduces, stated plainly:** the database would then store an outcome it did not
compute and cannot independently re-derive. Mitigate by persisting the policy version and a hash of
the scorer inputs alongside the outcome, so any stored score can be recomputed from the trace and
checked. That mitigation should be part of the same change, not deferred.

**If the team prefers DB authority instead**, the honest cost is: port §5 into plpgsql, delete the
TS scorer's authority, and accept weaker test ergonomics. I recommend against it, but it is a
coherent alternative and the choice is the team's, not mine.

---

## 7. Still unreconciled

1. **`pnpm db:types:check` fails** until the `packages/` owner regenerates (§5). Purely additive.
2. **Single source of truth is unresolved** (§6). Recommendation recorded; no code changed. The
   app still uses the TS packages and does not call these RPCs at all yet.
3. **The superseded `1200xx` schema is gone from the shared local database** (§1). The
   `gt-selection-adaptive-exam` worktree will conflict if it re-applies.
4. **The variable-length battery is effectively fixed-length under the shipped default policy.**
   The stop rule is `attempts >= minItemsPerArea AND (attempts >= maxItemsPerArea OR |delta| <=
   stableDelta)`. Seeded defaults are `stepSize = 0.8`, `stableDelta = 0.5`, so `|delta|` is 0.8 on
   a correct answer (more when the item is above the area estimate) and 0.8 on a wrong answer —
   dropping to 0.4 only when `M-ERRTYPE = 1` (a near miss). The convergence branch is therefore
   nearly unreachable, and in practice every area runs to `maxItemsPerArea = 8`, i.e. 32 items,
   capped at `maxItems = 40`. This contradicts BUILD_PLAN §0's "keep asking until there is adequate
   data." It is a **policy-tuning** issue, not a schema bug — `exam_policy.config` is data — so I
   did not unilaterally retune it. Either `stableDelta` must exceed `stepSize`, or the stop rule
   should key off metric coverage and estimate stability (`M-CONSIST`/SE) rather than the magnitude
   of the last step, which is what §3 actually specifies.
5. **`model_judge_deferred` items always score 0** and are inert by design (BUILD_PLAN §0 defers the
   judge). Harmless while no such items are seeded; must not be seeded into a live battery until the
   judge exists, or it will depress scores.
6. **The `computed_solver` path is exercised but not asserted in pgTAP.** Verified manually —
   correct value → `{"correct": true, "score": 1}`, wrong value → `{"correct": false, "score": 0}` —
   but only `deterministic_key` has a standing assertion. Worth an assertion when the quant bank is
   wired.
7. **Coverage-aware selection is only weakly tested.** `exam_get_next_item`'s ordering is asserted
   to return *an* item, not to return the *right* item. Area spread, metric-coverage preference, and
   age-band preference deserve dedicated assertions once more than one type per domain is seeded.
8. **The bank is a synthetic ramp, not the real banks.** The seed generates 80 placeholder items
   (4 types × 20 difficulty levels, `round(lvl * 19/20 + 0.5, 2)`). The 28 real generated banks in
   `research/exam-question-types/banks/` are not loaded into Postgres. Ingestion is a separate task.

---

## Reproducing this verification

From a worktree on `feat/exam-backend`, with the shared stack already running:

```bash
supabase status                       # confirm the local stack is up
docker exec -i supabase_db_gt-selection-capstone psql -U postgres -d postgres \
  --single-transaction -v ON_ERROR_STOP=1 -f - < supabase/tools/reconcile_local_exam_schema.sql
supabase migration up --local         # applies 20260724130000/130100/130200
supabase test db --local              # expect: Files=14, Tests=274, Result: PASS
supabase db lint --local --schema app,api,public --fail-on error   # expect: No schema errors found
```

Note that the repo's `pnpm db:*` scripts require `node_modules`, which this worktree does not have;
the commands above call the Supabase CLI directly and are equivalent.
