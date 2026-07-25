# Adaptive Exam Backend — Execution & Verification Status

**Verified 2026-07-24 (worktree `gt-selection-ex-backend`, branch `feat/exam-backend`, base `e57454c`);
amended 2026-07-25 with the ownership split (§8, D-018).**

This records the first *actual execution* of the adaptive-screener migrations. They were
written in the previous session but never run; the pgTAP suite was never executed. Everything
below is a real result from the running local stack, not a design intention.

Serves **R11**. Born-synthetic throughout (`synthetic_only = true`, `validated = false`);
decisions **D-017** and **D-018** both remain *Proposed*.

> **Reading order note (2026-07-25):** §1–§5 are the 2026-07-24 execution record and are left as
> written. §6 was a *recommendation*; it has since been implemented as **§8**, which is the
> current description of how selection, scoring, and storage are divided. Where §6 and §8 differ,
> §8 is the live behaviour.

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

> **Superseded 2026-07-25.** This section is the original recommendation, kept as written for the
> reasoning behind it. It was **implemented** as decision **D-018** (still *Proposed*, still
> awaiting team-lead ratification) — see **§8** for what actually changed and what was measured.

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

1. ~~**`pnpm db:types:check` fails** until the `packages/` owner regenerates (§5).~~
   **Partly resolved 2026-07-25.** `packages/db-types/src/database.generated.ts` has been
   regenerated (purely additive: all 9 `exam_*` RPCs, +65 lines, nothing removed or changed).
   `db:types:check` still exits non-zero, but **no longer because of type drift** — see §8.6 for
   the real cause, which is a pnpm warning polluting the check's stdout and originates in
   `packages/exam-engine/package.json`.
2. ~~**Single source of truth is unresolved** (§6).~~ **Resolved 2026-07-25 by D-018** — see §8.
   The database no longer computes a competing outcome, and the stop rule has moved to
   `packages/exam-engine` where BUILD_PLAN §3 puts it. `apps/web` still does not call these RPCs;
   the wiring handoff is §8.4.
3. **The superseded `1200xx` schema is gone from the shared local database** (§1). The
   `gt-selection-adaptive-exam` worktree will conflict if it re-applies.
4. ~~**The variable-length battery is effectively fixed-length under the shipped default
   policy.**~~ **Resolved 2026-07-25 by D-018** — see §8.2. The diagnosis stands exactly as
   written: with seeded `stepSize = 0.8` and `stableDelta = 0.5`, `|delta|` was 0.8 on a correct
   answer and 0.8 on a wrong one (0.4 only on a near miss), so the convergence branch was nearly
   unreachable and every area ran to `maxItemsPerArea = 8`. Rather than retune a knob, the stop
   rule was removed from the database entirely, because BUILD_PLAN §3 assigns it to
   `packages/exam-engine` (metric coverage, `minItemsPerArea`, even spread, estimate stability).
   `stableDelta`, `minItemsPerArea`, and `maxItemsPerArea` are now dead and have been deleted from
   the shipped policy; `stepSize` stays because it is still live.
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

---

## 8. The ownership split (2026-07-25, decision D-018, *Proposed*)

**One migration: `supabase/migrations/20260725050000_exam_outcome_ownership.sql`.** It implements
the §6 recommendation. D-018 in `docs/governance/DECISION_LOG.md` records the decision, the
alternative, and the reversal; this section records what actually changed and what was measured.

### 8.1 Why a new migration rather than editing the applied ones

The three `202607241300xx` migrations are already applied and recorded in
`supabase_migrations.schema_migrations` on the shared local instance. Editing an applied file
desynchronises the ledger from the files, and the only supported way back is `supabase db reset`
— which §1 explains is unsafe here because one Postgres instance is shared with the teammate's
running app. A forward migration is the only change that applies cleanly to a database that is
already live, so that is what this is. **No reset was run; `pnpm db:users` did not need re-running.**

### 8.2 What changed

| | Before | After |
|---|---|---|
| Final score | `api.exam_submit_response` auto-called `app.exam_compute_outcome` when its stop rule fired | Nothing auto-computes. `api.exam_record_outcome` stores the `packages/exam-scoring` output **verbatim** |
| Stop rule | `attempts >= minItemsPerArea and (attempts >= maxItemsPerArea or abs(delta) <= stableDelta)` — convergence branch nearly unreachable | Removed. `packages/exam-engine` owns it (BUILD_PLAN §3). The DB keeps only a runaway guard |
| Item cap | `maxItems = 40`, indistinguishable from a stop rule | `hardItemCap = 120`, commented as a **safety cap, not a stop decision**, and set above the engine's own cap of 60 so it can never truncate a legitimate battery |
| Per-area `done` | Set by the DB stop rule | Always `false`; reserved for the engine |
| Session end | DB closed the session when its rule fired | The app closes it by recording an outcome; the DB force-closes only at the safety cap |
| Answer keys / verification / trace | DB-owned | **Unchanged** — still DB-owned |

`app.exam_compute_outcome` and the difficulty-stepping logic were **demoted, not deleted**. The
stepping still runs, because it is the bookkeeping behind the in-database *fallback* selection in
`api.exam_get_next_item`; that function is now commented as a fallback that must not be mixed with
engine-driven selection in one session.

**Dead knobs removed** from `exam_policy.config` for `exam-syn-v1`: `minItemsPerArea`,
`maxItemsPerArea`, `stableDelta`, `maxItems`. Each was read *only* by the deleted stop rule.
`stepSize = 0.8` **stays** — it is genuinely still live. No live-but-broken rule is left behind.

### 8.3 Storing a score the database did not compute — the audit trail

This is the real risk the split introduces, and it is mitigated inside the same migration rather
than deferred. `app.exam_session_outcome` gains `outcome_raw` (the verbatim `ExamScore`),
`scorer_source`, `scorer_version`, `scoring_policy_id`, `scorer_input_hash`, and
`scorer_input_count`. The typed columns are a projection for querying; `outcome_raw` is the record.

`app.exam_scorer_input_json(session_id)` renders the stored trace as exactly the `ScoredItem[]`
that `scoreExam` consumes, in administration order. `app.exam_scorer_input_hash(session_id)`
sha256s its canonical `jsonb::text`. The database computes that hash **itself** at record time —
it is never client-supplied — so a stored score can always be recomputed from the trace and
checked. Test 122 assertion 30 re-derives the hash after recording and proves it still matches.

Two further guards: an outcome is refused if the session has no stored responses
(`PT409 SESSION_HAS_NO_RESPONSES` — an unauditable score cannot be stored), and refused if the
payload is not `syntheticOnly` (`PT400 SYNTHETIC_ONLY_REQUIRED`).

### 8.4 RPC surface a caller must use

Two RPCs added; one changed its response payload. Signatures, exactly:

```
api.exam_get_scoring_inputs(p_session_id uuid, p_correlation_id uuid) -> jsonb
api.exam_record_outcome(
  p_session_id      uuid,
  p_outcome         jsonb,   -- the packages/exam-scoring ExamScore, verbatim
  p_scoring_policy_id text,  -- ^[A-Za-z0-9._-]{1,120}$ (e.g. the ExamPolicy id)
  p_scorer_version  text,    -- nullable; ^[A-Za-z0-9._+-]{1,120}$
  p_idempotency_key uuid,
  p_correlation_id  uuid
) -> jsonb
```

`api.exam_submit_response` keeps its 7-argument signature. Its `data` object changed:
`done` and `outcome` are **gone**; `itemsAdministered`, `hardItemCap`, `hardCapReached`, and
`stopRuleOwner` are new. `scored` and `session` are unchanged. **`hardCapReached` is not a
completion signal** — it means the runaway guard fired and something went wrong.

The loop the app must now run:

1. `api.exam_start_session` → session.
2. Ask **`packages/exam-engine`** for the next item; serve it (or use `api.exam_get_next_item`
   as a DB-only fallback, never both in one session).
3. `api.exam_submit_response` → server-verified `correct`/`score`/`metrics`. Feed that into
   `engine.update`. Stop looping when **`engine.isDone`** says so — not when the database says so.
4. `api.exam_get_scoring_inputs` → the canonical `items` array and its `inputHash`.
5. `scoreExam(items, policy)` in `packages/exam-scoring`.
6. `api.exam_record_outcome(sessionId, examScore, policy.id, scorerVersion, idempotencyKey,
   correlationId)`. This writes the outcome **and** closes the session.
7. `api.exam_get_outcome` / `api.exam_get_session_state` read it back; both now return
   `scorerOutput` (verbatim), `scoredBy`, `scorerInputHash`, and `scorerInputCount`.

Error codes on step 6: `PT409 OUTCOME_ALREADY_RECORDED` (write-once), `PT409
SESSION_HAS_NO_RESPONSES`, `PT400 SYNTHETIC_ONLY_REQUIRED`, `PT400 VALIDATION_FAILED`,
`PT404 RESOURCE_NOT_FOUND` (including another operator's session), plus the standard
`PT409 IDEMPOTENCY_KEY_REUSED`. Replaying the identical request with the same idempotency key
returns the original payload with `meta.idempotentReplay = true`.

`api.exam_get_outcome`'s `data.complete` now means *an outcome has been recorded*, never *the
database scored it*. It stays `false` for the whole battery.

### 8.5 Verification (real output, 2026-07-25)

```
$ pnpm db:test
... 120_exam_adaptive_backend.test.sql ........... ok
... 121_exam_answer_key_firewall.test.sql ........ ok
... 122_exam_outcome_ownership.test.sql .......... ok
All tests successful.
Files=15, Tests=306,  1 wallclock secs
Result: PASS
```

**306 assertions across 15 files, 0 failures**, up from 274 across 14. The +32:

- **`122_exam_outcome_ownership.test.sql` — new, 30 assertions.** Proves the demotion (the
  reference scorer still exists, carries a `DEMOTED` comment, and **no `api` RPC body mentions
  it**), that submitting responses creates a trace and **zero** outcome rows, that an externally
  computed outcome round-trips exactly, that the recorded hash re-derives from the trace, and the
  ownership/born-synthetic/write-once/idempotency guards.
- **`120_exam_adaptive_backend.test.sql` — 44 → 46.** Two added for the new RPCs; the
  SECURITY DEFINER / owner / `search_path` posture counts went 7 → 9. Three changed meaning
  rather than being deleted: assertion 38 now asserts the *safety cap* fired rather than a stop
  rule, and 39/40 now assert that submitting responses produces **no** outcome — the exact
  inversion of the old behaviour.
- **`121_exam_answer_key_firewall.test.sql` — 26/26, unchanged and still passing.** The
  answer-key firewall is untouched by this change: key custody and `app.exam_score_response`
  stay in the database, which is the whole point of splitting here rather than moving
  verification into the app tier. Only its fixture policy was edited, to drop the dead knobs.

**Non-vacuity.** Both headline assertions were checked with negative controls, in rolled-back
transactions:

```
# perturb the expected verbatim value:
not ok 20 - the externally computed outcome round-trips EXACTLY (stored verbatim, not re-derived)
#   have: ... "composite": 12.5 ...
#   want: ... "composite": 99 ...

# insert an outcome row during the battery (i.e. simulate the old auto-compute):
not ok 15 - submitting responses creates NO outcome row — the competing score is gone
#   have: 1
#   want: 0
```

```
$ pnpm db:lint
Linting schema: app / api / public
No schema errors found
{"results":[],"message":"db lint"}
```

Clean at every level, not just errors.

### 8.6 `db:types` — regenerated; `db:types:check` blocked by something else

`pnpm db:types` was run with Node 24.18.0 on PATH. The diff to
`packages/db-types/src/database.generated.ts` is **purely additive**: +65 lines covering all nine
`exam_*` RPCs (the seven from §5 plus `exam_get_scoring_inputs` and `exam_record_outcome`);
nothing removed or altered.

`pnpm db:types:check` still exits 1, and it is worth being precise about why, because it is **not**
type drift and **not** the Node version:

```
$ pnpm exec supabase gen types typescript --local --schema api   # stdout, first line
packages/exam-engine                     |  WARN  The field "pnpm.onlyBuiltDependencies" was
found in .../packages/exam-engine/package.json. This will not take effect. You should configure
"pnpm.onlyBuiltDependencies" at the root of the workspace instead.
```

`scripts/check-generated-types.ts` compares the committed file byte-for-byte against the **stdout**
of a spawned `pnpm exec supabase gen types`. pnpm prepends that warning to stdout, so the
comparison can never match. Strip the 340-character warning and the committed file matches the
generated output exactly (verified). The fix is one line in
`packages/exam-engine/package.json` — move `pnpm.onlyBuiltDependencies` to the workspace root, or
make the check tolerate a pnpm banner — and both files are outside this workstream's edit scope.

### 8.7 How to reverse this

Nothing was dropped, so reversal is additive. See D-018 for the ratified wording; operationally:

1. Re-add `if v_hard_cap_reached then v_outcome := app.exam_compute_outcome(p_session_id); end if;`
   to `api.exam_submit_response` (or restore the original `v_session_done` variable and rule).
   `app.exam_compute_outcome` is intact and its comment names this call site.
2. Restore `minItemsPerArea`, `maxItemsPerArea`, and `stableDelta` to `app.exam_policy.config` —
   and set `stableDelta` **above** `stepSize`, or the convergence branch is unreachable again.
3. Optionally revoke `api.exam_record_outcome` from `authenticated`.

Reverting `20260725050000_exam_outcome_ownership.sql` wholesale also works, at the cost of the
outcome audit columns.

### 8.8 Still open after this change

- The engine-versus-database convergence behaviour has **not** been simulated against the real
  banks. That an engine-driven battery finishes well below the 120-item guard is a design
  expectation, not a measurement.
- `apps/web` does not call any of these RPCs yet (§8.4 is the handoff).
- The in-database fallback selection in `api.exam_get_next_item` still diverges from the engine's
  seeded-RNG selection. Demoting it in a comment is not the same as reconciling it; if the two are
  ever mixed in one session they will produce different traces from identical state.

---

## Reproducing this verification

From a worktree on `feat/exam-backend`, with the shared stack already running:

```bash
supabase status                       # confirm the local stack is up
docker exec -i supabase_db_gt-selection-capstone psql -U postgres -d postgres \
  --single-transaction -v ON_ERROR_STOP=1 -f - < supabase/tools/reconcile_local_exam_schema.sql
supabase migration up --local         # applies 20260724130000/130100/130200 + 20260725050000
supabase test db --local              # expect: Files=15, Tests=306, Result: PASS
supabase db lint --local --schema app,api,public --fail-on error   # expect: No schema errors found
```

The 2026-07-24 run used the Supabase CLI directly because this worktree had no `node_modules`.
The 2026-07-25 run installed them (`pnpm install --frozen-lockfile`, Node 24.18.0) and used the
`pnpm db:*` scripts, which are equivalent.
