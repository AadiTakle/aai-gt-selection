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
| 0 | Spec + plan + ledger | done | `3e31d21` |
| 1 | `platform/` workspace scaffolding | done | `784cde0` |
| 2 | `@platform/domain` — types, type-code parsing | done | `784cde0` (23 tests) |
| 3 | `@platform/scoring` — MultiPosterior, computeSheet | done | `99e2b4a` (26 tests) |
| 4 | `@platform/selection` — seeded RNG, 8 variety layers | done | `7af60a4` (55 tests) |
| 5 | `@platform/catalog` — snapshot compiler | in progress | |
| 6 | `@platform/store` — DynamoDB single-table repo | in progress | |
| 7 | `functions/*` — Lambda handlers | pending | |
| 8 | `infra/` — CDK stack, synth, template assertions | pending | |
| 9 | Variety simulation against the real catalog | pending | |

Running total: **104 tests passing** in `platform/`. `screener` still at its baseline 148.

## Decisions taken during implementation, beyond the spec

1. `SelectionCandidate`, `AnswerKeyRecord`, `SnapshotRecord`, `OutboxEvent` live in
   `@platform/domain` (`candidate.ts`) rather than in `selection`/`catalog`, so the compiler and the
   store need no dependency on the selection algorithm. This made phases 3–6 mutually independent.
2. `evaluateCriteria` takes a `MultiPosterior`, not a finished `ScoreSheet`, because criteria carry
   their own ability threshold which need not be the session's. Reading `pAboveThreshold` off a sheet
   computed at the app's threshold would answer a different question.
3. `SheetInput` gained `threshold` and `domainsAvailable`. The first separates the session's
   operative line from the criteria's. The second stops a domain with no scorable items from holding
   the stop rule open forever — twenty of the fifty-three types have none.
4. `VarietyConfig` gained `exposureDampingExponent`, default 3. Proportional damping was measured at
   0.425 max exposure against a 0.20 target. See spec §9.2 layer 6.
5. `openingJitterLogits: 0` now disables the opening layer rather than silently falling back to a
   random draw over the whole pool.
6. `toServedQuestion` deep-scrubs answer-shaped keys from item content as a second net behind the
   registry's structural exclusion of answers.

## External effects log

Nothing outside this repository has been mutated. No AWS resource has been created, read, or
modified. No package has been published. The only network access has been npm installs.

## Notes

(appended as work proceeds)
