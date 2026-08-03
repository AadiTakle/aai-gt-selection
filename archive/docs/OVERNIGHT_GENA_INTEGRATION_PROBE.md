# Overnight "Generation A" Exam Stack — Integration Probe

> **THROWAWAY PROBE BRANCH — DO NOT MERGE.** This branch
> (`feat/exam-genA-integration-probe`) is a born-synthetic, single-purpose
> verification artifact created to answer one question: *do the 5 clean Gen-A
> exam branches actually compose into one green tree, or do their overlapping
> item/scoring models collide?* It is **not** a candidate for `dev`, `staging`,
> or `main`. The merge commits exist only to reproduce the integrated state; the
> **primary deliverable is this report**. Discard the branch after reading.

- **Base:** `dev` @ `2bc1fe8` (`Merge feat/governance-lambda-decision into dev`)
- **Probe branch:** `feat/exam-genA-integration-probe`
- **Date:** 2026-07-27
- **Toolchain:** pnpm 10.34.5, Node v25.9.0 (repo `engines` wants `24.x` — emits a
  non-fatal `Unsupported engine` warning throughout), Python 3.9.6 (system).
- **Migrations:** the `feat/exam-data-model` `supabase/migrations/*` were merged as
  **files only and NOT applied** (per task).

---

## 1. Per-merge result

All five branches were merged into the probe branch one at a time with
`git merge --no-ff`, in the required order. **Every merge was clean — zero
conflicts.** No entry in the conflict policy had to be exercised.

| # | Branch | Result | Files added / changed |
|---|--------|--------|-----------------------|
| 1 | `feat/exam-data-model` | **CLEAN** | 13 files. `packages/contracts/src/assessment-exam.ts` (+ `assessment-exam-contract.test.ts`, `index.ts` +1), `packages/db-types/src/exam.ts` (+ `index.ts` +1), `packages/test-fixtures/src/exam-fixtures.ts` (+ `.test.ts`, `index.ts` +2), plus **file-only** `supabase/migrations/20260727120000_exam_data_model.sql`, `..._seed.sql`, `README_exam_data_model.md`, `supabase/tests/*.pending.sql`. |
| 2 | `feat/exam-item-bank` | **CLEAN** | 36 files. Entire `packages/item-bank/**` (src, data JSONL bank, scripts, generated type registry) + `pnpm-lock.yaml` (+19). |
| 3 | `feat/exam-scoring-lambda` | **CLEAN** (lockfile auto-merged, no conflict) | 30 files. Entire `packages/cat-engine/**` — the portable scoring/replay engine **plus** `packages/cat-engine/src/lambda/**` (handler, event, local invoke, sample event) — inherited via its base `feat/exam-scoring-engine`, + `pnpm-lock.yaml` (+12). |
| 4 | `feat/exam-session-shell` | **CLEAN** | 23 files. `apps/web/src/lib/exam/**` + `apps/web/src/components/exam/**` + `apps/web/src/app/dev/exam-shell/page.tsx`; `exam-runner.tsx` rewritten (+47 / −180). |
| 5 | `feat/exam-validation-harness` | **CLEAN** | 21 files. Entire `scripts/validation-harness/**` (Python; pure stdlib; not part of the pnpm build). |

**Overall delta vs `dev`:** 122 files changed, +16,989 / −180. Two brand-new
workspace packages: `@gt-selection/item-bank`, `@gt-selection/cat-engine`
(`contracts`, `db-types`, `test-fixtures` already existed on `dev` and only
received additive exam files).

**Why every merge was clean (important):** the five slices are *disjoint on
disk*. Each branch either creates its own package/directory or edits a
*different* barrel, so no two branches ever touch the same file. The
"overlapping item/scoring models" the reviewer worried about **do not overlap at
the file level** — they are parallel definitions in separate modules. A git merge
therefore sees nothing to reconcile. The collision is **architectural, not
textual** (see §3). The prepared conflict policy (lockfile regen, barrel union,
semantic model tie-break) was never triggered.

---

## 2. Build results (from the probe worktree root)

| Step | Command | Result |
|------|---------|--------|
| Install | `pnpm install` | **PASS.** "Lockfile is up to date, resolution step is skipped." 7 workspace projects. Working tree **clean after install** — `pnpm install` changed nothing (the merged `pnpm-lock.yaml`, +31 vs `dev`, was already consistent). |
| Typecheck | `pnpm typecheck` (`tsc -p tsconfig.base.json` + `pnpm -r run typecheck`) | **PASS.** 6/6 projects green: `contracts`, `db-types`, `test-fixtures`, `item-bank`, `cat-engine`, `apps/web`. |
| Test | `pnpm test` (`pnpm -r run test`, vitest) | **PASS. 303/303 tests, 46/46 files.** |
| Lint | `pnpm lint` (`eslint .` + `pnpm -r run lint`) | **FAIL at root `eslint .` — but all 23 errors are pre-existing `dev` baseline debt, not Gen-A (see below).** |
| Python harness | `cd scripts/validation-harness && python -m pytest` | **SKIPPED** (no `pytest` on the system interpreter; separate pure-stdlib toolchain). Import smoke passed — see below. |

### Test counts (all passing)

| Package | Test files | Tests |
|---------|-----------:|------:|
| `packages/cat-engine` | 10 | 75 |
| `packages/contracts` | 8 | 60 |
| `packages/item-bank` | 5 | 53 |
| `packages/test-fixtures` | 3 | 25 |
| `apps/web` | 20 | 90 |
| **Total** | **46** | **303** |

(`packages/db-types` has no test script and is skipped by `--if-present`.)

### Lint detail — the failure is NOT Gen-A

`pnpm lint` runs `eslint .` first; it exits 1 with **23 errors in exactly two
files, neither of which is an exam file and neither of which any Gen-A merge
touched:**

- `apps/web/src/components/family/apply-wizard.tsx:197` — `Definition for rule
  'react-hooks/exhaustive-deps' was not found` (×1). The root flat config does
  not register the react-hooks plugin; the file carries a disable comment for a
  rule the root config doesn't know.
- `scripts/configure-cloud-auth-email.mjs` — `'process'/'console'/'fetch' is not
  defined` `no-undef` (×22). A Node script linted under browser-ish globals.

Evidence these are baseline, not introduced by Gen-A:

- `git log dev..HEAD -- <those two files> eslint.config.*` is **empty** → both
  files and the ESLint config are byte-identical to `dev`. `eslint .` on `dev`
  produces the same 23 errors.
- **Gen-A exam code is lint-clean:** `eslint` over
  `packages/{contracts,db-types,test-fixtures,item-bank,cat-engine}` +
  `apps/web/src/lib/exam` + `apps/web/src/components/exam` exits **0**.
- **Per-package lint passes:** `pnpm -r run lint` (each project's own
  `eslint src`) exits **0** for all 6 projects, including `apps/web`.

So the integrated Gen-A stack adds **zero** new lint errors; the red `pnpm lint`
is a pre-existing repo hygiene issue in unrelated files.

### Python harness

`scripts/validation-harness` is a **separate, pure-Python-3-standard-library**
toolchain (its README states "Zero third-party dependencies … no numpy / scipy /
pandas") and is not wired into the pnpm build. `pytest` is not installed on the
system interpreter (Python 3.9.6, no venv), so the pytest suite
(`tests/test_pipeline_smoke.py`, `tests/test_psychometrics.py`) was **skipped**
per task policy (do not fight environment setup). As a cheap sanity signal, a
stdlib import smoke of every harness module
(`harness.{pipeline,psychometrics,config,dataio,synth,analyses,report}`)
**succeeded** under system `python3` (`HARNESS_IMPORT_OK`).

---

## 3. Cross-package integration — do the slices share one contract? (KEY FINDING)

**No. The spine is file-coexistent but contract-siloed.** Searching for *real*
import statements (not comment mentions):

- **`@gt-selection/contracts` (exam schema `assessment-exam.ts`)** is imported by
  exactly **one** exam consumer: `packages/test-fixtures/src/exam-fixtures.ts`
  (+ its test + barrel) — and that shipped in the **same** branch as the contract
  (`feat/exam-data-model`). Every *other* importer of `@gt-selection/contracts`
  in the tree pulls **onboarding/family** types (`StatusProjection`, `UserRole`,
  `OnboardingStepCode`, `WorkflowStatus`, …), i.e. pre-existing non-exam usage.
- **`@gt-selection/item-bank`** — imported by **nothing** outside itself.
- **`@gt-selection/cat-engine`** — imported by **nothing** outside itself.
- **`packages/db-types/src/exam.ts` (`ExamAppSchema`)** — imported by **nothing**
  (apps/web only imports the pre-existing generated `Database`/`Json`).
- **`apps/web/src/lib/exam/**` (the session shell)** — imports **neither** the
  contracts exam schema, **nor** `item-bank`, **nor** `cat-engine`. It uses its
  own `sample-items.ts` + `item.ts` + `scoring.ts` + `session.ts`.

### Concrete tally

> **4 independent TypeScript item/response/session model families coexist —
> `contracts`, `item-bank`, `cat-engine`, and `apps/web/src/lib/exam` — plus a
> 5th DB-row shape in `db-types/exam.ts`. Of the 4 exam producers, 0 import the
> canonical `@gt-selection/contracts` exam contract** (the only contract consumer
> is the data-model branch's own fixtures package).

The 4-domain content enum (`fluid_reasoning | verbal | quantitative | spatial`)
is **independently re-declared in ≥5 source locations**:

| Model owner | Where the domain enum / item type is defined |
|-------------|----------------------------------------------|
| `contracts` (intended canonical) | `packages/contracts/src/assessment-exam.ts:31` (`examDomainSchema`) + full session/item/policy schemas |
| `item-bank` | `packages/item-bank/src/enums.ts` (`examDomainSchema`) → `bank-item.ts` (`bankItemSchema`); generated `src/generated/type-registry.generated.ts:79` (`VALID_DOMAINS`), `scripts/gen-type-registry.ts:25` |
| `cat-engine` | `packages/cat-engine/src/types.ts:36` (`SCORED_DOMAINS`) + `ItemParameters` / `RawResponse` / `ScoredItem` (self-contained by design for Lambda portability — header explicitly says it will **not** import contracts) |
| `apps/web` shell | `apps/web/src/lib/exam/item.ts:27` (`examDomainSchema`), `lib/exam/bank.ts:14,32` (`ExamDomain` / `EXAM_DOMAINS`), `lib/exam/sequencer.ts:38`; own `lib/exam/types.ts` (`examSessionInputSchema` / `ExamSessionRecord`, scraped from the `#mlist` panel) |
| `db-types` | `packages/db-types/src/exam.ts` (`ExamAppSchema` DB row/insert/update shapes) |

All four TS producers cite the *same spec document*
(`docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md`) in their headers, but each
implemented it independently. The tree is green **because** these definitions
never meet in the same module — not because they agree.

---

## 4. Reconciliation points a human must resolve to unify the models

Prefer `packages/contracts` as the canonical owner (it is one of the sides and is
explicitly designed to be framework/DB-free and structure-agnostic). None of the
below require a new product decision — they wire the already-agreed
`EXAM_ITEM_SCHEMA_SPEC.md` that all slices already cite.

1. **Single domain enum.** Make `@gt-selection/contracts` `examDomainSchema` the
   sole source; delete/re-export the duplicates:
   - `packages/item-bank/src/enums.ts` + regenerate `VALID_DOMAINS`
     (`src/generated/type-registry.generated.ts:79`, `scripts/gen-type-registry.ts:25`)
   - `apps/web/src/lib/exam/item.ts:27`, `apps/web/src/lib/exam/bank.ts:14,32`,
     `apps/web/src/lib/exam/sequencer.ts:38`
   - `packages/cat-engine/src/types.ts:36` may keep a *local* copy (it is a pure,
     dependency-free engine on purpose) **but** needs a compile-time equality/
     mapping test against contracts so the two can't silently drift.
2. **Single item model.** Reconcile four item shapes →
   `packages/contracts/src/assessment-exam.ts` (canonical served/bank split) vs
   `packages/item-bank/src/bank-item.ts` (+ `content/registry.ts`, `answer.ts`,
   `scoring.ts`, `provenance.ts`; richer bank shape) vs
   `packages/cat-engine/src/types.ts` (`ItemParameters`/`ScoredItem`; scoring
   input) vs `apps/web/src/lib/exam/item.ts` + `sample-items.ts` (UI shape).
   Decision needed: does `contracts` absorb the bank's content/answer/scoring/
   provenance split, or does `item-bank` re-export the contracts item type?
3. **Single session/response contract.** Reconcile the contracts session schema
   vs `apps/web/src/lib/exam/types.ts` (`examSessionInputSchema` /
   `ExamSessionRecord`) vs `cat-engine` `RawResponse` / `ScreeningResult`. The
   web shell should *emit* the contracts session; the engine should *score* it.
4. **Missing engine adapter.** There is no `contracts → cat-engine` mapping
   (`ExamItem`/response → `ItemParameters`/`RawResponse`). The pure engine can
   stay dependency-free, but this adapter must be written for scoring to run on
   real sessions.
5. **DB layer is unwired.** `packages/db-types/src/exam.ts` (`ExamAppSchema`) is
   imported by nobody; it needs a server adapter and must stay in sync with
   contracts once the held migration
   `supabase/migrations/20260727120000_exam_data_model.sql` is reviewed **and
   applied** (not applied in this probe).
6. **Packaging.** `apps/web/package.json` does not depend on
   `@gt-selection/item-bank` or `@gt-selection/cat-engine`. Those workspace deps
   must be added before the frontend can consume the real bank/engine instead of
   its local `sample-items.ts` + `scoring.ts`.

---

## 5. Verdict

**Does Gen-A compose into a green integrated tree today?** Yes — mechanically.
All five branches merge with **zero conflicts**, `pnpm install` is clean,
`typecheck` passes 6/6, **303/303 tests pass**, and per-package lint is clean
(the only red is 23 pre-existing `dev`-baseline lint errors in two non-exam files
that no Gen-A branch touched). But **green ≠ integrated.** The tree is green
*precisely because* the five slices are disjoint and unwired: four parallel
item/response/session model families (`contracts`, `item-bank`, `cat-engine`,
`apps/web/src/lib/exam`) plus a DB-row shape coexist, the 4-domain enum is
re-declared in ≥5 places, and **0 of the exam producers import the canonical
`@gt-selection/contracts` exam contract** (the sole consumer is the data-model
branch's own fixtures). Adopting these 5 as the "spine" is reasonable, but today
it is *five spines lying side by side*, not one.

**Smallest work to make it a true single-contract spine:** (a) make
`@gt-selection/contracts` the single owner of the domain enum + served/bank item
type + session-completion type, and have `item-bank` and `apps/web` re-export/
consume them — deleting the duplicate `apps/web/src/lib/exam` domain/item/session
definitions and replacing `sample-items.ts` with the `item-bank` served
projection; (b) add a thin `contracts → cat-engine` (`ItemParameters` /
`RawResponse`) adapter so the pure engine scores the canonical session; (c) add
the `@gt-selection/item-bank` and `@gt-selection/cat-engine` workspace deps to
`apps/web`. That is wiring, not new product design — every slice already cites
the same `EXAM_ITEM_SCHEMA_SPEC.md`.

---

*Generated on the throwaway `feat/exam-genA-integration-probe` branch. Not for
merge into `dev`/`staging`/`main`.*
