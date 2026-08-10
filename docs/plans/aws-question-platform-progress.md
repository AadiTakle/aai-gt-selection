# AWS Question Platform — Overnight Progress Ledger

Durable record of what is done, so an interrupted run can reconcile instead of repeating work.
Updated as phases complete. **Read this first after any failure.**

**Branch:** `feat/aws-question-platform` (off `dev`)
**Spec:** `docs/design/aws-question-platform.md`
**Plan:** `docs/plans/aws-question-platform-implementation.md`

## Hard invariants for this run

1. **No AWS calls.** No credentials exist on this machine. `cdk synth` only, never `deploy`.
2. **No edits under `screener/`, `qbank-library/`, or `archive/`.** Import from them, never modify.
   The local demo and its 148 tests must keep passing untouched.
3. **No pushes to `dev`.** All commits land on `feat/aws-question-platform`.
4. **DynamoDB Local on port 8010** (not 8000 — `qbank-library` uses 8000 for its static server).

## Phase status

| # | Phase | Status | Commit |
|---|---|---|---|
| 0 | Spec + plan + ledger | done | — |
| 1 | `platform/` workspace scaffolding | pending | |
| 2 | `@platform/domain` — types, type-code parsing | pending | |
| 3 | `@platform/scoring` — MultiPosterior, computeSheet | pending | |
| 4 | `@platform/selection` — seeded RNG, 8 variety layers | pending | |
| 5 | `@platform/catalog` — snapshot compiler | pending | |
| 6 | `@platform/store` — DynamoDB single-table repo | pending | |
| 7 | `functions/*` — 5 Lambda handlers | pending | |
| 8 | `infra/` — CDK stack, synth, template assertions | pending | |
| 9 | Variety simulation + tuned defaults | pending | |

## External effects log

Nothing outside this repository has been mutated. No AWS resource has been created, read, or
modified. No package has been published. The only network access has been npm installs.

## Notes

(appended as work proceeds)
