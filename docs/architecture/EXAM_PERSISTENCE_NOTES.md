# Adaptive exam — trace persistence notes

What `apps/web` writes to Supabase, what is provably reconstructable from those rows,
and the one thing that is not. Companion to `EXAM_ADAPTIVE_BUILD_PLAN.md` §6 and
decision **D-019**. Everything below is born-synthetic (`synthetic_only = true`,
`validated = false`); no number here is validated against any outcome.

## 1. What is wired

| Moment | Route | RPCs called |
|---|---|---|
| Battery starts | `POST /api/exam-session` | `api.exam_create_participant`, `api.exam_start_session` |
| Each answered item | `POST /api/exam-submit` | `api.exam_register_item`, `api.exam_submit_response` |
| Battery ends | `POST /api/exam-results` | `api.exam_record_outcome` |

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

## 2. Ownership (D-019)

Unchanged by this work:

- `packages/exam-engine` selects every item. `api.exam_get_next_item` is never called on
  a persisted session, so the two selection paths are never mixed.
- `packages/exam-scoring` computes the score. It is stored **verbatim** through
  `api.exam_record_outcome` (`scorer_source = 'packages/exam-scoring'`). The demoted
  `app.exam_compute_outcome` is never called, so no second outcome competes.
- The database keeps the keys and verifies each response inside
  `app.exam_score_response`.

## 3. Degradation

Persistence is off unless explicitly enabled, and every write is best-effort. A missing
config, an unreachable database, a rejected RPC, or a slow one (8-second timeout) is
logged with a `[exam-persistence]` prefix and returns `null`/`false`. `/api/exam-session`
answers `examSessionId: null`, the runner keeps that null, and the battery proceeds
exactly as it did before this change — in memory, unpersisted. No route's status code or
contract changes; the only visible difference is an informational `persisted` flag.
Covered by `apps/web/src/lib/exam/persistence.test.ts`.

## 4. The open defect: two verdicts per item, and only one of them is in the scored columns

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
over the database's canonical scorer input does not reproduce the recorded score**:

```
composite recorded (packages/exam-scoring)      : 7.43376016008243
composite recomputed from exam_scorer_input_json: 3.774707062976571
```

That breaks the audit path D-019 built (`scorer_input_hash` → recompute → compare). The
hash itself is fine — it still matches the stored trace — but what it hashes is not the
input the recorded score came from.

**Not fixed here, deliberately.** The brief pins the database as the verifier ("the
database stores and verifies"), and making the two agree means either porting 30 typed
verifiers into plpgsql or moving verification authority to the application tier, which
D-019 considered and rejected as alternative (c). Either is a governance decision, not a
persistence task. Note that D-019(c) was already contradicted in practice before this
change: `/api/exam-submit` and `bank-loader.ts` have been verifying against on-disk keys
in the Next.js server tier since the runner was wired, which the decision's author
recorded as `apps/web` not calling the exam RPCs at all.

**Mitigated so nothing is silent.** `/api/exam-submit` appends an `app_verdict` telemetry
event per item carrying the verdict and metric map the engine and scorer actually
consumed. The trace therefore holds both verdicts, explicitly labelled, and the recorded
score is exactly reproducible from the database:

```
composite recorded                              : 7.43376016008243
composite recomputed from app_verdict telemetry : 7.43376016008243   (difference 0.000000)
```

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
   fallback bookkeeping D-019 demoted, updated from the database's own verdicts. The
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
```

`apps/web/src/lib/exam/persistence.integration.test.ts` drives the real route handlers,
the real engine, the real banks, and the real verifiers, then reads the session back
through `api.exam_get_session_state` and `api.exam_get_outcome`.
