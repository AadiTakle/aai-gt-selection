# Format-agnostic exam data model — HELD FOR HUMAN REVIEW

> **DO NOT APPLY. DO NOT MERGE. Held for human review before any DB apply or merge.**
>
> The migration files in this set were authored offline on branch
> `feat/exam-data-model` and have **not** been applied to any database (shared,
> live, local, or otherwise). They are a review deliverable only.
>
> Note: because a migration file placed in `supabase/migrations/` is included by
> `supabase db reset` / `pnpm db:test`, a reviewer who runs those commands on
> this branch **will** apply this migration to their local database. That is the
> intended review path — it is a synthetic, additive, ephemeral local apply, not
> a shared/live apply. Do not point these at a shared or production database
> until reviewed and approved.

## What this is

A **structure-agnostic**, **born-synthetic** data model for a custom cognitive
exam. It deliberately does **not** bake in adaptive/two-stage assumptions: the
delivery structure (linear/fixed-form, adaptive, two-stage/multistage, or
custom) is carried as *tunable config*, so the same schema and contracts express
any of them without change.

Salvaged and adapted from commit `2b458cb`
(`packages/contracts/src/assessment-exam.ts` and
`supabase/migrations/20260724120000_exam_core.sql` +
`20260724120200_exam_seed.sql`).

## Requirements / evidence

- **Serves:** R11 (tunable GT-owned screening), R9 (born-synthetic, privacy),
  R5 (measurement surface). Decision context D-016; born-synthetic rule D-006.
- **Evidence / assumptions:** no item parameter or cut is calibrated
  (synthetic_only, validated=false); real calibration is tracked by RES-012.
- **Claim boundary (R10):** the outcome is a **screening** signal only. The
  decision vocabulary was deliberately renamed from the salvaged
  `admit | defer | retry` to `advance | hold | retry` to avoid an admission-claim
  smell, consistent with the app-wide prohibition on admitted/offered/…
  outcomes. Every outcome carries a mandatory `claim_boundary`.

## Files in this deliverable

| File | Purpose | Applied? |
| --- | --- | --- |
| `packages/contracts/src/assessment-exam.ts` | Format-agnostic Zod contracts (item/session/response/telemetry/policy/outcome + RPC + demo protocol) | n/a (TS) |
| `packages/contracts/src/assessment-exam-contract.test.ts` | Contract tests proving the format-agnostic properties | runs in `pnpm test` |
| `packages/db-types/src/exam.ts` | Hand-authored Row/Insert/Update types for the private `app.exam_*` tables (the generator only emits the exposed `api` schema) | n/a (TS) |
| `packages/test-fixtures/src/exam-fixtures.ts` | Born-synthetic fixtures (linear + adaptive) | n/a (TS) |
| `packages/test-fixtures/src/exam-fixtures.test.ts` | Fixture validation tests | runs in `pnpm test` |
| `supabase/migrations/20260727120000_exam_data_model.sql` | Schema + forced RLS (private `app` tables) | **NO — held** |
| `supabase/migrations/20260727120100_exam_data_model_seed.sql` | Synthetic seed (linear + adaptive policy, item bank, one classical item) | **NO — held** |
| `supabase/tests/120_exam_schema_security.pending.sql` | Schema/security shape pgtap stub | **NO — `.pending.sql` not auto-run** |
| `supabase/tests/130_exam_rls_noninterference.pending.sql` | RLS ownership + non-interference pgtap stub | **NO — `.pending.sql` not auto-run** |

## How it was made format-agnostic (vs. the salvaged CAT model)

- **Policy** no longer requires adaptive-only knobs (`minItemsPerDomain`,
  `maxItemsPerDomain`, `targetSe`, `priorMean/priorSd`, `exposureTopK`). It now
  carries a `deliveryStructure`, a generic `itemSelection {strategy, params}`, a
  generic `stopRule {kind, params}`, generic `decision` cuts, and an opaque
  `structureConfig` for structure-specific tuning. Linear uses `fixed_order` +
  `fixed_count`; adaptive expresses priors/exposure/SE inside `structureConfig`
  and `params`.
- **Session** no longer embeds live per-domain `theta/se` ability state. It
  carries structure-neutral `progress` plus an opaque, engine-owned
  `structureState` (null for linear). The DB table `exam_session_progress`
  replaces `exam_session_domain` and has **no** `theta`/`se` columns; live state
  lives in a `state` jsonb.
- **Items** keep IRT columns but they are **NULLABLE**; `scoring_model`
  (`irt_2pl | irt_3pl | classical | rubric | rule_based | none`) declares how an
  item is scored, so non-IRT formats are first-class. `difficulty_level` is
  nullable (no forced ladder).
- **Outcome** replaces `compositeTheta`/`fit_index` columns with a generic
  `composite` + `composite_scale` and an opaque `metrics` jsonb for
  structure-specific signals.
- **Telemetry** `kind` is a generic lower_snake code, not a fixed
  adaptive-flavored enum (`SUGGESTED_TELEMETRY_KINDS` is reference-only).

## Acceptance evidence (verifiable now)

- Contracts + fixtures validate: `pnpm --filter @gt-selection/contracts test`
  and `pnpm --filter @gt-selection/test-fixtures test` pass.
- Typechecks pass for `@gt-selection/contracts`, `@gt-selection/db-types`,
  `@gt-selection/test-fixtures`.
- The migration files exist and are **not applied** by this work.

## Activation checklist (for a human reviewer, after approval)

1. Review the migration, seed, and RLS/non-interference stubs.
2. Apply locally only: `pnpm db:reset` (applies migrations + seed to the local
   Supabase DB). Never point at a shared/live DB before sign-off.
3. Regenerate DB types: `pnpm db:types` — note this emits the `api` schema only;
   the private `app.exam_*` types remain hand-authored in
   `packages/db-types/src/exam.ts`.
4. Activate the pgtap stubs: rename `*.pending.sql` → `*.test.sql`, then
   `pnpm db:test`.
5. Only after all of the above pass should this be considered for promotion via
   the normal `feat/* -> dev -> staging -> main` flow.
