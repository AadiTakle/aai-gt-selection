# Adaptive exam — trace persistence notes

What `apps/web` writes to Supabase, what is provably reconstructable from those rows,
and the one thing that is not. Companion to `EXAM_ADAPTIVE_BUILD_PLAN.md` §6 and
decision **D-029**. Everything below is born-synthetic (`synthetic_only = true`,
`validated = false`); no number here is validated against any outcome.

## 1. What is wired

| Moment | Route | RPCs called |
|---|---|---|
| Battery starts | `POST /api/exam-session` | `api.exam_create_participant`, `api.exam_start_session` |
| Each answered item | `POST /api/exam-submit` | `api.exam_register_item`, `api.exam_submit_response` |
| Battery ends | `POST /api/exam-results` | `api.exam_get_scoring_inputs`, `api.exam_record_outcome` |

All three run server-side in `apps/web/src/lib/exam/persistence.ts`. The browser never
holds a proctor session and never reaches an `api.exam_*` RPC.

The exam RPCs require the `admissions_operator` (proctor) persona, so the server tier
signs in as the synthetic operator fixture seeded by `pnpm db:users`, using the app's
existing publishable-key convention. Configuration is three environment variables
(`GT_EXAM_PERSISTENCE_ENABLED`, `GT_EXAM_PROCTOR_EMAIL`, `GT_EXAM_PROCTOR_PASSWORD`); no
service-role or secret key is involved, and `assertNoElevatedRuntimeKeys` still applies.

`api.exam_register_item` is new (`20260725160000_exam_item_registration.sql`) and is the
one addition this work required. `app.exam_item` held only the 80 placeholder rows the
seed migration generates, whose ids are disjoint from the 7,900 generated bank items the
runner actually serves, so `api.exam_submit_response` rejected every real item with
`PT400` and no trace could be recorded at all. Registration is idempotent and
INSERT-only, and it carries the item's real server-only answer key into
`app.exam_item.answer_key`, which is revoked from every client role.

## 2. Ownership (D-029)

Unchanged by this work:

- `packages/exam-engine` selects every item. `api.exam_get_next_item` is never called on
  a persisted session, so the two selection paths are never mixed.
- `packages/exam-scoring` computes the score. It is stored **verbatim** through
  `api.exam_record_outcome` (`scorer_source = 'packages/exam-scoring'`). The demoted
  `app.exam_compute_outcome` is never called, so no second outcome competes.
- The database keeps the keys and verifies each response inside
  `app.exam_verify_response` (D-027; `app.exam_score_response` is demoted).
- **The database also decides WHICH ITEMS the scorer is handed.** For a persisted session
  the scorer input is read back from `app.exam_scorer_input_json` through
  `api.exam_get_scoring_inputs`; the `scoredItems` array in the request body is never
  scored. See §4.

## 3. Degradation

Persistence is off unless explicitly enabled, and every write is best-effort. A missing
config, an unreachable database, a rejected RPC, or a slow one (8-second timeout) is
logged with a `[exam-persistence]` prefix and returns `null`/`false`. `/api/exam-session`
answers `examSessionId: null`, the runner keeps that null, and the battery proceeds
exactly as it did before this change — in memory, unpersisted. The only visible
difference is an informational `persisted` flag, plus a `scoreSource` of
`client-trace-unverified` on the result, which says in the response what the number is
worth. Covered by `apps/web/src/lib/exam/persistence.test.ts`.

**One exception, and it is deliberate.** A payload that carries an `examSessionId` while
persistence is configured is asserting a database session, and its score is READ from
that session. If the read fails, `/api/exam-results` answers `503
SCORER_INPUT_UNAVAILABLE`, stores nothing, and returns no score. Degrading to the request
body there would put back exactly the defect §4 records, and unlike a failed write a
stored score cannot be withdrawn. The trace itself is already safe in the database, so a
session that hits this can be scored later from the rows it holds.

## 4. Two verdicts per item, and the score used to read the wrong one

**Resolved 2026-07-25 for every session recorded from now on; the history below is what
was measured on the way there and is kept because the numbers in it are cited elsewhere.**

Two separate things were wrong, and closing the first exposed the second.

1. **The two tiers graded differently** (E-081, closed partially by D-027). The rest of
   this section is that story.
2. **The score never read the database's verdicts at all** (E-084). `/api/exam-results`
   scored `scoreExam(trace.data.scoredItems)`, where `trace` is the parsed REQUEST BODY.
   So the `claim_boundary` stamped on every outcome row — "recomputable from the stored
   trace via `app.exam_scorer_input_json`" — was false, and a scripted client that posted
   `scoredItems` claiming `correct: true` at high `difficulty` was handed the score it
   asked for. Verifying answers in the database bought nothing while the scorer never
   read the verdicts.

The fix for (2) is one rule: **when the payload carries an `examSessionId`, the scorer
input is read from the database**, through `api.exam_get_scoring_inputs`, and that is what
is scored, returned to the browser, and stored. There is no fallback to the request body
(§3). Re-running the same seeded 22-item battery across the change:

```
composite the client trace would have produced (pre-fix): 7.467904132453549
composite from app.exam_scorer_input_json     (post-fix): 6.421120506722555
```

The whole of that gap is one item: the app tier and the database still disagree on
`GB-PATHFORGE-01` (1 of 22), which is the residual (1) above. The database's verdict is
the authority per D-027 and is now the one that scores. Expect corrected composites to be
lower; that is the point, not a regression.

The gate is `pnpm exam:reconcile`, which re-verifies every stored response, re-hashes the
trace, and re-scores it, then compares composite, per-area proficiency/accuracy/bracket
and profile to the outcome row. It exits 0 on sessions recorded after the fix and
non-zero on every session recorded before it. Note that it compares the database against
itself: it cannot see an app-tier/database verdict disagreement, so it is not a substitute
for `pnpm exam:verify:diff`.

### History (E-081/D-026/D-027)

**`app.exam_score_response` and the app's per-type verifiers grade the same response by
different rules, and they disagree often.**

The database compares the submitted `key`/`selectedKey`/`value` against
`answer_key.correctKey` (or `answer_key.solution` for `computed_solver`). That is the
whole of its verification vocabulary. The banks are not shaped that way:

- 30 of the 63 wired types are graded by a per-type verifier in
  `apps/web/src/lib/exam/verifiers/`, because their response is a constructed artefact —
  a path, a plane setting, a bin assignment, a set of built words. `verifyCurious` and
  `verifyConcept` re-derive the expected answer from `content`; `verifyCheckTwice` grades
  a `finalPlacement` map against `answer.trueBin`. None of that is a key comparison.
- 18 types declare `scoring.mode = 'computed_solver'` but store `answer.correctKey`, not
  the `answer_key.solution` the database's solver branch reads, so that branch never
  matches.
- 7 verbal types key by numeric option index while the demos report `selectedIndex`,
  which the database's comparison does not read.

Measured on the round trip recorded below: **15 of 22 items disagreed** (the database
called 4 correct; the verifiers called 11 correct, and the two sets barely overlap).

Because `api.exam_submit_response` writes its own verdict into
`exam_item_response.correct`, `.score`, and `metrics['M-ACC']`, and because
`app.exam_scorer_input_json` projects exactly those columns, **re-running `scoreExam`
over the database's canonical scorer input did not reproduce the recorded score**:

```
composite recorded (packages/exam-scoring)      : 7.43376016008243
composite recomputed from exam_scorer_input_json: 3.774707062976571
```

That broke the audit path D-029 built (`scorer_input_hash` → recompute → compare). The
hash itself is fine — it still matches the stored trace — but what it hashed was not the
input the recorded score came from. That last clause is what E-084 turned out to be: the
hash certifies the trace, and nothing certified that the score came from it.

**Closed by D-027, partially.** The owner ratified porting the per-type verifiers into plpgsql so
the database is the single authority on per-item correctness. `app.exam_verify_response` now
dispatches per-type → `scoring.rule` generic → keyed, `api.exam_submit_response` verifies through
it, and `app.exam_score_response` is demoted rather than deleted. Agreement with the app tier over
2,268 real cases rises from 1,659 to 1,989; 4 of 31 per-type verifiers and 3 of 3 generic ones are
ported, and the rest are inventoried in `EXAM_VERIFIER_PORT_INVENTORY.md`. The paragraph below is
the state as of D-026 and is kept because it is what was measured then.

**Not fixed at the time, deliberately.** The brief pins the database as the verifier ("the
database stores and verifies"), and making the two agree means either porting 30 typed
verifiers into plpgsql or moving verification authority to the application tier, which
D-029 considered and rejected as alternative (c). Either is a governance decision, not a
persistence task. Note that D-029(c) was already contradicted in practice before this
change: `/api/exam-submit` and `bank-loader.ts` have been verifying against on-disk keys
in the Next.js server tier since the runner was wired, which the decision's author
recorded as `apps/web` not calling the exam RPCs at all.

**Mitigated so nothing is silent.** `/api/exam-submit` appends an `app_verdict` telemetry
event per item carrying the verdict and metric map the ENGINE consumed. The trace
therefore holds both verdicts, explicitly labelled:

```
composite recorded                              : 7.43376016008243
composite recomputed from app_verdict telemetry : 7.43376016008243   (difference 0.000000)
```

That equality is the pre-fix reading: it says the recorded score came from the app tier's
verdicts. Post-fix the recorded score comes from `app.exam_scorer_input_json`, so it is
the `app_verdict` recomputation that is now expected to differ, by exactly the items the
two tiers still grade differently. The engine's own inputs are unchanged — the engine
runs during the battery and can only use the verdict `/api/exam-submit` returns.

## 5. Other gaps, reported not fixed

1. **No read path returns telemetry payloads.** `api.exam_get_session_state` returns
   `telemetryCount` only. The events are in `app.exam_telemetry_event` and are readable
   by SQL, but the RPC surface cannot return them, so an API-only reader cannot recover
   the `app_verdict` records or the interaction trace. A read-only
   `api.exam_get_telemetry` would close this; it was left out to keep the migration
   minimal.
2. **Served-but-unanswered items are not representable.** `app.exam_item_response` is the
   only per-item row, so an item served and then abandoned leaves no trace. In practice
   the runner submits every served item (a timeout or skip is submitted as `skipped`), so
   served and answered coincide today. The `skipped` flag survives only inside
   `raw_answer`; there is no column for it.
3. **The type-code check was widened.** `app.exam_question_type.type_code` required an
   all-caps middle segment, which 11 wired types (`CX-check-01`, `WM-bubble-01`, …) do not
   satisfy. Widened to match the vocabulary D-020(a) ratifies rather than renaming the
   types.
4. **The session's `area_state` in the database is not the engine's state.** It is the
   fallback bookkeeping D-029 demoted, updated from the database's own verdicts. The
   authoritative per-area estimate lives in `packages/exam-engine` and is not persisted;
   the outcome's `perArea` is. Rebuilding the engine's mid-battery state requires
   `packages/exam-engine`'s `replay.ts` over the trace, not `exam_session.area_state`.
5. **The score-separation defect is untouched** (`EXAM_ADAPTIVE_STATUS.md` open defect 0).
   Whatever `packages/exam-scoring` returns is what is persisted.

## 6. Verifying a round trip

```
supabase start && pnpm db:users
export GT_EXAM_PERSISTENCE_ENABLED=true
export GT_EXAM_PROCTOR_EMAIL=admissions@example.test
export GT_EXAM_PROCTOR_PASSWORD=...            # the pnpm db:users fixture password
pnpm --filter @gt-selection/web test:integration
pnpm exam:reconcile                            # the session that run just recorded
```

`apps/web/src/lib/exam/persistence.integration.test.ts` drives the real route handlers,
the real engine, the real banks, and the real verifiers, then reads the session back
through `api.exam_get_session_state`, `api.exam_get_scoring_inputs` and
`api.exam_get_outcome`. It also runs the forgery directly: a second, deliberately
all-wrong session is posted with a `scoredItems` array claiming every item correct at
difficulty 20, and the returned and stored composites are asserted to equal the database
trace's (2.2) rather than the forged payload's (20.0).

`pnpm exam:reconcile` is the standing gate and takes a session id, `--all`, or nothing
(the most recently started scored session). It exits non-zero on any session recorded
before the E-084 fix, including `3e03558f`; those rows are left as recorded rather than
rewritten, because "this composite is not reproducible" is the finding.
