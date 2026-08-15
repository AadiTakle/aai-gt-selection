# Overnight Exam Model Reconciliation Report

> **STATUS: UNRATIFIED PROPOSAL.** This branch (`feat/exam-model-reconcile`)
> proposes adopting **`@gt-selection/contracts` as the canonical source of truth**
> for the exam model, per the recommendation in
> `docs/OVERNIGHT_GENA_INTEGRATION_PROBE.md`. It is a **wiring-only, type-unification**
> change: **no product/behavior/scoring-math change, no new features, no route or
> flow change.** It has **not** been merged and is **not** a ratified decision. All
> exam output remains born-synthetic (`synthetic_only=true`, `validated=false`);
> no disclaimers or invariants were altered.

- **Base:** `feat/exam-genA-integration-probe` @ `2973ca5` (the known-GREEN Gen-A tree).
- **Branch:** `feat/exam-model-reconcile` (pushed; **not** merged to `dev`/`staging`/`main`).
- **Requirements served:** R11 (scalable/tunable screener), R5 (defensible capability standard); D-019 (portable scoring engine). Reconciliation reference: `docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md`.
- **Isolation:** all work done in a dedicated git worktree; every commit staged with **explicit paths only** (never `git add -A`/`.`).

---

## 1. Problem (from the integration probe)

The Gen-A tree is green only because its exam slices never import each other. The
four-domain reasoning enum (`fluid_reasoning | verbal | quantitative | spatial`)
and the item/response/session shapes were **redeclared in parallel** across five
TypeScript model families plus a DB-row shape:

1. `packages/contracts/src/assessment-exam.ts` — Zod exam contract (**target canonical owner**).
2. `packages/item-bank/**` — standardized bank-item schema (spec §6 model).
3. `packages/cat-engine/**` — portable scoring/replay engine (own numeric contracts).
4. `apps/web/src/lib/exam/**` — UI-local item/scoring/session model.
5. `packages/db-types/src/exam.ts` — DB row shapes (**out of scope**).

## 2. What was unified (before → after)

### 2.1 Domain enum — the headline

| Metric | Before | After |
|---|---|---|
| `examDomainSchema` (Zod) runtime declarations | **3** (contracts, item-bank/enums.ts, apps/web/item.ts) | **1 owner + 2 re-exports** |
| `ExamDomain` / domain-type hand-written declarations | **4** (contracts, item-bank/enums.ts, apps/web/item.ts, apps/web/bank.ts) | **1 owner + 3 re-exports** |
| Independent domain declarations retained by design | — | **2** (cat-engine `SCORED_DOMAINS`; db-types — see §4) |
| Exam producers importing `@gt-selection/contracts`' domain enum | **0** (only test-fixtures consumed contracts, for other types) | **2** (item-bank, apps/web exam lib) |

`examDomainSchema = z.enum([...])` now appears **exactly once** in the workspace
(`packages/contracts/src/assessment-exam.ts`). `item-bank/enums.ts`,
`apps/web/src/lib/exam/item.ts`, and `apps/web/src/lib/exam/bank.ts` all
re-export the canonical enum/type instead of redeclaring it. The item-bank
generated catalog (`VALID_DOMAINS`, derived from `master_types.jsonl` under a
SHA guard) is unchanged and carries the **identical four values** (verified);
bank items are validated by the canonical schema.

### 2.2 Cross-family scoring adapter (contracts / item-bank → cat-engine)

New thin, **pure** seam `apps/web/src/lib/exam/cat-adapter.ts` maps:

- contract `PersistedResponse` → cat-engine `RawResponse` (`orderNo→order`, `engaged→onTask`),
- contract `ExamItem` → cat-engine `ItemParameters` (IRT + ordinal difficulty; neutral-2PL fallback for non-IRT items),
- item-bank spec `BankItem` (the richest superset item) → cat-engine `ItemParameters` (`Rasch→1PL`),
- plus `toEngineInputs(...)` producing the `{ log, items }` subset of a `ReplayInput`.

| Metric | Before | After |
|---|---|---|
| cat-engine consumers in `apps/web` | **0** | **1** (adapter + test) |
| Scoring-math changes in cat-engine | — | **0** (formulae untouched; adapter only reshapes fields) |

**All external imports in the adapter module are type-only**, so it carries no
runtime dependency and cannot pull item-bank's `node:crypto` (via `rng.ts`) into
any bundle. cat-engine's runtime is exercised only by the adapter **test**, which
maps a contract log and scores it end-to-end through `runScoring`.

### 2.3 Workspace dependency edges added (3)

| Edge | Reason |
|---|---|
| `item-bank → contracts` | re-export the canonical `examDomainSchema`/`ExamDomain` |
| `apps/web → cat-engine` | scoring adapter + test |
| `apps/web → item-bank` | spec-item adapter overload (type-only in module; runtime in test) |

No external (registry) packages were added; `pnpm-lock.yaml` changed only by
three `workspace:*` `link:` entries.

## 3. Exact files changed

**Checkpoint 1 — domain enum (`bec40ee`)**
- `packages/item-bank/package.json` — add `@gt-selection/contracts` workspace dep.
- `packages/item-bank/src/enums.ts` — re-export `examDomainSchema`/`ExamDomain` from contracts; drop the local `z.enum(VALID_DOMAINS)` redeclaration.
- `apps/web/src/lib/exam/item.ts` — re-export `examDomainSchema`/`ExamDomain` from contracts; drop the local `z.enum([...])`.
- `apps/web/src/lib/exam/bank.ts` — import/re-export `ExamDomain` from `./item`; drop the local union type.
- `pnpm-lock.yaml`.

**Checkpoint 2 — scoring adapter + deps (`c5ecad8`)**
- `apps/web/package.json` — add `@gt-selection/cat-engine` + `@gt-selection/item-bank` workspace deps.
- `apps/web/src/lib/exam/cat-adapter.ts` — **new** type-only mapping seam.
- `apps/web/src/lib/exam/cat-adapter.test.ts` — **new** runtime test (5 cases) proving the mapped inputs score through the real engine.
- `pnpm-lock.yaml`.

**Checkpoint 3 — this report.**

## 4. Deliberately left as follow-up (to stay GREEN / in scope)

1. **cat-engine `SCORED_DOMAINS` NOT unified to contracts.** cat-engine is an
   explicitly dependency-free, portable AWS Lambda payload (D-019) whose
   `types.ts` documents that it "declares its own numeric contracts here instead
   of importing `@gt-selection/contracts` (which carries Zod / Supabase-facing
   schemas)"; its `package.json` has **zero** runtime deps. Forcing a contracts
   import would add Zod to the Lambda payload — an **architecture/behavior change
   forbidden by the task's hard constraints**. Its four values are already
   identical to the canonical enum, and this branch's adapter is the intended
   seam. *Future option (needs ratification):* extract a tiny dependency-free
   `@gt-selection/exam-domains` leaf that both contracts and cat-engine depend on.

2. **apps/web full item + response + session model merge NOT done.** The UI-local
   `BankItem` (discriminated on `renderKind`: `single-select | embedded-demo`) and
   the harvest-based `ExamItemResult`/`ExamSessionInput` are a genuinely different
   shape from both the item-bank spec `BankItem` (typed content registry) and the
   contract `ExamItem`/`ItemResponse`. The session shell (`session.ts`,
   `sequencer.ts`, `scoring.ts`, `harvest.ts`, `use-exam-session.ts`, renderers,
   the `exam-results` route) and their tests all depend on it; removing/merging it
   would be a **behavior/flow change** and would go red. Domain enum was unified
   across it; the deeper merge is deferred.

3. **`lureClassSchema` NOT runtime-unified (apps/web ↔ item-bank).** The apps/web
   copy is byte-identical (9 members) to item-bank's canonical one, but item-bank's
   runtime index pulls `node:crypto` (via `rng.ts`), which is unsafe for the
   apps/web **client** bundle (`item.ts` is client-bundled via `toServedItem`).
   Re-pointing the runtime enum risks a `next build` break not caught by the gated
   suite. A clean fix needs an item-bank **subpath / browser-safe `enums`
   entrypoint** (a `package.json` `exports` change) — deferred as its own task.
   (The adapter references item-bank only via type-only imports, which is safe.)

4. **`packages/db-types` + Supabase migrations untouched** (per scope). The DB
   `domain` CHECK constraints and row shapes remain the DB's own declaration;
   aligning them to contracts is a migration/DB-review task.

Nothing was reverted mid-layer: each layer that was started landed green; the
merges in items 2–3 were deliberately **not started** after analysis showed they
would break green or introduce a latent build break.

## 5. Verification (from the worktree root — same suite as the probe)

| Check | Result |
|---|---|
| `pnpm install` | clean; lockfile changes = 3 `workspace:*` links only (no external packages) |
| `pnpm -r typecheck` | **6/6 green** |
| `pnpm -r test` | **308 passed** (baseline 303; **+5** new adapter tests; **0** regressions) |
| `pnpm -r run lint` (per package) | **clean** across all 6 packages (`eslint src`) |

Per-package tests: cat-engine 75 · contracts 60 · item-bank 53 · test-fixtures 25
· apps/web **95** (was 90). Tests updated purely because a type moved: **none**
(no existing test was edited; the +5 are all in the new `cat-adapter.test.ts`).

The pre-existing ~23 ROOT lint errors noted in the task
(`family/apply-wizard.tsx`, `scripts/configure-cloud-auth-email.mjs`) are dev
baseline debt from a root `eslint .` config and are **not present** in the
per-package `eslint src` runs on this base; this branch adds no lint errors.

## 6. Claim boundary

Type unification and a mapping seam do **not** change what the exam measures or
claims. A reliable screen is not program-impact evidence (R10). No item
parameter or cut is empirically calibrated (RES-012); all content remains
born-synthetic (RES-013).
