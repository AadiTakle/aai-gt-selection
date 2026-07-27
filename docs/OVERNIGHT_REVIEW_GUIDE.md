# Overnight Exam-Fleet Review Guide

**Generated:** 2026-07-27 (early AM), by the overnight agent, for morning review.
**Baseline:** `dev` @ `2bc1fe8` (*"Merge feat/governance-lambda-decision into dev — D-019 + E-072"*). `origin/dev` and local `dev` are in sync (0/0).
**Status of this document:** Navigational aid only. Most of it records **reasoned inferences** from `git log`/`git diff` metadata and worker hand-off notes; where I say "tests present" for the older/larger branches it means test files exist, not that they were re-executed tonight. **Exceptions that ARE verified:** the §3.B governance-ID conflict (diffed against the actual `DECISION_LOG.md`/`ASSUMPTIONS_AND_EVIDENCE.md` on the branches) and the green build/test results for the branches I built tonight (§8). Nothing here is a governance ratification — the conflict resolutions in §3.B need your sign-off.

> **Purpose:** You asked me to keep producing reviewable work on branches overnight. Over multiple autonomous turns this produced *many* exam branches across several generations. Reviewing them cold is confusing, so this file is the map: what exists, how the pieces relate, what's safe, what's risky, what's only stored locally, and a recommended order to look at things.

---

## 1. TL;DR — read this first

1. **There are three generations of exam work.** They overlap heavily (each has "scoring", "item bank", "adaptive backend"). Do **not** try to merge them all — pick a spine and harvest from the rest.
2. **Recommended spine = Generation A** (the 5 clean, structure-agnostic packages freshly based on the current `dev` tip and already pushed to `origin`). They merge cleanly because they share `dev`'s base.
3. **Generation B (`feat/exam-integration`, 232 commits)** is the most *complete* system — a real Supabase adaptive backend with 30/30 server-side answer verifiers — but it sits on a **3-day-old base** and its governance line diverged from `dev`. **Two IDs genuinely collide** — `D-019` and `E-072` each mean *different things* on `dev` vs this branch — and `dev` is **missing `D-015`/`D-016`** entirely. See §3.B for the verified, ready-to-apply reconciliation. Treat Gen B as a rich quarry to cherry-pick/rebase, **not** a straight merge.
4. **The biggest single decision for you:** there are **four parallel item/scoring models** in flight (see §4). Someone has to pick one canonical contract before these branches can converge. Two branches (`feat/exam-converge`, `feat/exam-contract-reconcile`) are unpushed attempts at exactly this.
5. **Several high-value branches are LOCAL-ONLY (never pushed).** If a worktree is pruned the *worktree* disappears but the branch ref survives in `.git`; still, I recommend pushing the keepers (see §6) so they're backed up before you start rebasing.
6. **New branches I produced tonight (held on their own branches, not merged) — see §8 for status:**
   - `feat/overnight-review-guide` (this guide) · `feat/exam-scoring-lambda` (D-019 handler, ✅ green) · `feat/gt-brand-frontend` (brand refactor, ✅ green) · `feat/exam-genA-integration-probe` (spine composability probe, in progress).

---

## 2. Generation map

| Gen | Base commit | Age | What it is | Merge posture |
|-----|-------------|-----|------------|---------------|
| **A — Clean fleet** | `dev` @ `2bc1fe8` | current | 5 structure-agnostic packages, 1 commit each, **all pushed**, local==origin | ✅ Merge candidates; low conflict |
| **B — Full backend line** | `b485567` (2026-07-24) | 8 commits behind `dev` | Live Supabase adaptive backend + 30/30 plpgsql verifiers; `exam-integration` (pushed) is the superset | ⚠️ Rebase/cherry-pick, not straight-merge; carries ungoverned decisions |
| **C — Earlier generations** | `2e041bf`, `326c9fa`, `ca2006b`, `0a1921a` | 12–64 behind | `adaptive-exam-app` (AX-01..05 + D-016), `exam-backend/engine/frontend`, `item-bank-research`, `interview-scope-update` | 🔎 Mostly superseded; harvest specific commits (esp. D-016 governance) then archive |

`b485567..dev` (the 8 commits Gen B is missing) = the Lambda-governance work, the test-structure BrainLift + brainlift consolidation, and hosted-synthetic persistence. So a Gen B → `dev` merge must reconcile against all of those.

---

## 3. Branch-by-branch detail

### 3.A Generation A — clean structure-agnostic fleet (RECOMMENDED SPINE)

All are `base=2bc1fe8` (current `dev`), `behind/ahead = 0/1`, pushed, `local==origin`.

| Branch | Tip | Contents | Size | Tests present |
|--------|-----|----------|------|---------------|
| `feat/exam-scoring-engine` | `455a3b7` | `packages/cat-engine`: IRT (2PL/3PL), EAP+MLE theta, seeded RNG, normal-CDF/percentile + OLS learning-rate + RT-consistency scoring, RTE rapid-guess filter, per-item/per-domain scoring, deterministic replay verifier, typed measurement registry | 24 files, +2305 | ✅ irt/theta/scoring/rte/item-scoring/replay/rng/measurements/result |
| `feat/exam-item-bank` | `585fb12` | `packages/item-bank`: standardized, server-scored bank — schema, content generators (fluid/quant/spatial/verbal), 263-line solver set, generated 2046-line type-registry, provenance, QA report script | 36 files, +5695 | ✅ data-files/generators/projection/registry/schema |
| `feat/exam-session-shell` | `b5454a2` | `apps/web` exam session shell: pluggable `Sequencer` (`FixedSequencer`), pure session loop, item player + single-select & embedded-demo renderers, `use-exam-session` hook, runnable synthetic demo, `/dev/exam-shell` page | 23 files, +2127/−180 | ✅ single-select-renderer/item/sample-items/scoring/sequencer/session |
| `feat/exam-validation-harness` | `0f64f35` | `scripts/validation-harness`: born-synthetic Python psychometrics harness (IRT calibration, reliability, DIF, classification accuracy/consistency), sample HTML/MD report, traceability doc | 21 files, +4038 | ✅ test_pipeline_smoke / test_psychometrics |
| `feat/exam-data-model` | `e29d886` | `packages/contracts` exam contracts (591 LOC) + test, `packages/db-types/exam.ts` (423), `packages/test-fixtures/exam-fixtures.ts` (255) + test, `supabase` migration + seed (**file-only, not applied**) + forced-RLS, 2 pending pgtap stubs | 13 files, +2388 | ✅ contract test + fixtures test; pgtap stubs are `.pending` |

**Why this is the spine:** same base as `dev`, small, tested, already backed up on `origin`, and explicitly designed to be *structure-agnostic* (works whether or not the two-regime test structure is accepted). The D-019 scoring/replay Lambda unit lives here (`cat-engine`).

**Caveat inside Gen A:** `exam-session-shell` ships its **own** item/scoring model under `apps/web/src/lib/exam/*` (`item.ts`, `scoring.ts`, `sample-items.ts`) that is *parallel* to `packages/contracts` + `packages/item-bank` + `packages/cat-engine`. That's model #4 in §4 — reconcile before or during merge.

### 3.B Generation B — full-stack adaptive backend line

Base `b485567`, 8 behind `dev`.

| Branch | Tip | Ahead | Pushed | Role |
|--------|-----|-------|--------|------|
| `feat/exam-integration` | `699ddea` | 232 | ✅ origin | **Superset / flagship.** Full Supabase adaptive exam: core schema, RPC API, synthetic seed, per-child outcome ownership, item-registration handshake, **30/30 per-type answer verifiers ported to plpgsql** (server is the single authority on correctness — D-027), telemetry gate (D-028), `exam:reconcile` gate, browser battery reconciled. |
| `feat/exam-verify-plpgsql` | `5331685` | 213 | ❌ local-only | Subset already merged into `exam-integration` (plpgsql verifier line). |
| `feat/exam-telemetry-gate` | `c1446ae` | 213 | ❌ local-only | Subset already merged into `exam-integration` (hide per-child telemetry from the test-taker). |
| `feat/exam-contract-reconcile` | — | 134 | ❌ local-only | Attempt to reconcile contracts across tiers. Relevant to the §4 model decision. |
| `feat/exam-converge` | — | 173 | ❌ local-only | Larger convergence attempt. Relevant to the §4 model decision. |

**Component families that fed Gen B (mostly already merged into `exam-integration` via its merge commits):** `feat/exam-bank*` (14), `feat/exam-verify*` (8), `feat/exam-key-balance*` (3), `feat/exam-dupes*` (2), plus `exam-overshoot`, `exam-standalone-guard`, `exam-persist`, `exam-score-input`, `exam-score-ability`, `exam-validators`, `exam-init-handshake`, `exam-agebands`, `exam-leak-fix`, `exam-stoprule`, `exam-wire`, `exam-spaview`. Treat these as **history** — don't review individually; they live inside `exam-integration`.

**Governance ID conflicts on Gen B — VERIFIED by diffing the actual `docs/governance/DECISION_LOG.md` and `docs/research/ASSUMPTIONS_AND_EVIDENCE.md` on `feat/exam-integration` vs `dev` (not just commit messages).** This is more serious than "add some entries" — there are two genuine **ID collisions** created because the Gen-B governance line (authored 2026-07-24/25) was never merged to `dev`, and tonight's `dev` work reused two of its IDs:

| ID | On `dev` (canonical, merged) | On `feat/exam-integration` (unmerged) | Resolution needed |
|----|------------------------------|----------------------------------------|-------------------|
| **D-019** | "Add one AWS Lambda for exam scoring & deterministic replay" (2026-07-26) | "One source of truth for screener selection and scoring: the DB stores, the TS packages decide" (2026-07-25) | **Collision.** Keep `dev`'s D-019 (merged); renumber Gen-B's to the next free ID (e.g. **D-029**) on merge. |
| **E-072** | "The project must incorporate at least one AWS Lambda function…" (tonight) | "Statistical originality (M-ORIG)/flexibility (M-FLEX) can't be computed without a per-prompt norm bank…" (2026-07-25) | **Collision.** Keep `dev`'s E-072; renumber Gen-B's to the next free ID (e.g. **E-093**) on merge. |

- **Forward-port cleanly (no collision — `dev` doesn't use these IDs):** decisions **D-020, D-021, D-022, D-023, D-024, D-025, D-026, D-027, D-028**; evidence **E-073…E-084, E-090, E-091, E-092**. (These entries already exist verbatim on the branch's governance files; promoting Gen-B carries them along.)
- **Missing from `dev` entirely:** **D-015** ("Reframe selection target to Timeback-fit…") and **D-016** ("Build the R11 screener as a born-synthetic adaptive test sub-application"). `dev`'s `DECISION_LOG.md` jumps D-014 → D-017. Both entries exist on `feat/adaptive-exam-app`; D-015 also on `feat/interview-scope-update`. These should be transcribed into `dev` regardless of the Gen-B decision, because R11/product already reference them.
- **Net:** only **2 IDs actually collide** at the decision/top level (D-019, E-072). **BUT the evidence register itself forked three ways** and is *not* safe to paste mechanically: `E-072` means a Lambda constraint on `dev`, an M-ORIG/M-FLEX norm-bank note on `exam-integration`, and (within D-015's `E-071–E-077` citation on `adaptive-exam-app`) part of the Crystal-Martel interview range. Even `E-071` differs (reading-literacy on `dev` vs interview evidence in the D-015 citation). So transcribing D-015/D-016 verbatim will drag in evidence cross-refs (`E-072–E-077`) that don't line up with `dev`'s register. **This makes the reconciliation a genuine governance-ratification task, not a mechanical merge** — decide the canonical numbering and re-point the cross-refs. That's your call, not mine. The verbatim D-015/D-016 entries are reproduced for reference in `docs/OVERNIGHT_GOVERNANCE_DIVERGENCE.md` (same branch).

### 3.C Generation C — earlier, mostly superseded

| Branch | Ahead/Behind | Pushed | Keep for | Recommendation |
|--------|--------------|--------|----------|----------------|
| `feat/adaptive-exam-app` | 6/47 | ❌ local | AX-01..05 contract+engine+DB+surface; **holds the D-015 + D-016 entries that `dev` is missing** | **Harvest D-015 + D-016** into `dev`'s `DECISION_LOG.md` (verified absent from `dev`); then archive the code (superseded by A+B) |
| `feat/exam-backend` / `feat/exam-engine` / `feat/exam-frontend` | 62/2/2 ahead, 12 behind | ❌ local | earliest portal wiring | Superseded by A+B; archive |
| `feat/exam-item-bank-research` | 2/64 | ❌ local | categorized K-8 catalog (318 rows) | Harvest the catalog data if useful, then archive (old base deletes newer `dev` files) |
| `feat/interview-scope-update` | 1/59 | ❌ local | also carries the **D-015** entry (Timeback-fit + R11 screener reframe) | **Correction:** D-015 is **not** yet in `dev` (verified — `dev` skips D-015/D-016). This branch or `adaptive-exam-app` is the source to transcribe from; then archive |
| `feat/exam-item-schema-spec` | 0 ahead | ✅ origin | schema spec | Already in `dev` (`d11b2d3`); nothing to merge |

> ⚠️ **Old-base hazard:** Gen C branches show huge *deletions* in `git diff dev..<branch>` only because they predate files `dev` now has (research shards, brainlift consolidation, migrations). **Never** straight-`merge` them into `dev` — you'd clobber newer work. Cherry-pick the specific signal commit instead.

---

## 4. The central decision: four parallel item/scoring models

> ✅ **VERIFIED by the `feat/exam-genA-integration-probe` run** (see `docs/OVERNIGHT_GENA_INTEGRATION_PROBE.md`): merging all 5 Gen-A branches off `dev@2bc1fe8` produced **zero conflicts**, a clean `pnpm install`, **6/6 typecheck**, and **303/303 tests passing**, with per-package lint clean. So Gen-A *is* a defensible spine. **But the tree is green only because the slices never meet in the same module:** **0** of the exam producers import the canonical `@gt-selection/contracts` exam contract (its only consumer is the data-model branch's own fixtures), `item-bank`/`cat-engine` are imported by nothing outside themselves, and the 4-domain enum is redeclared in **≥5 places**. It's "five spines side by side, not one." Encouragingly, the probe judged unifying them to be **pure wiring, not a product decision** — every slice already cites the same `EXAM_ITEM_SCHEMA_SPEC.md`.

These currently coexist. They must converge on **one** canonical contract before the exam stack is coherent:

1. `packages/contracts/src/assessment-exam.ts` (Gen A `exam-data-model`) — 591-LOC Zod contract + db-types + fixtures.
2. `packages/item-bank/*` (Gen A `exam-item-bank`) — bank-item schema, generators, solvers, server-side keys.
3. `packages/cat-engine/*` (Gen A `exam-scoring-engine`) — scoring/replay types (`types.ts`, 181 LOC).
4. `apps/web/src/lib/exam/*` (Gen A `exam-session-shell`) — `item.ts` (242 LOC) + `scoring.ts`, a UI-local model.

Plus Gen B's Supabase schema is a **fifth** representation (the database's own tables/RPC shapes).

`feat/exam-converge` (173 commits) and `feat/exam-contract-reconcile` (134) are unpushed prior attempts at this reconciliation on the Gen B base — worth reading before you redo the work, but they're on the old base so their *code* may not apply cleanly to Gen A.

**Smallest path to a true single-contract spine (from the probe, wiring-only):**
1. Make `@gt-selection/contracts` the sole owner of the domain enum + item + session/response types; have `item-bank` and `apps/web` re-export/consume them and **drop the duplicate `apps/web/src/lib/exam` defs + `sample-items.ts`**.
2. Add a thin `contracts → cat-engine` scoring adapter.
3. Add `item-bank` and `cat-engine` as workspace deps of `apps/web`.

I've started this on **`feat/exam-model-reconcile`** (based on the green probe tree) as a reviewable proposal — see §8. It is a proposal for your review, not a ratified canonical-model choice.

---

## 5. Recommended review / integration order

1. **Confirm the spine.** Skim the 5 Gen A branches (they're small and on `origin`). Decide they're the foundation.
2. **Resolve §4 model choice** (pick canonical contract). This unblocks everything else.
3. **Merge Gen A into `dev`** in dependency order: `exam-data-model` → `exam-item-bank` → `exam-scoring-engine` → `exam-session-shell` → `exam-validation-harness`. Reconcile the `apps/web/src/lib/exam` vs `packages` overlap during the session-shell merge.
4. **Fold in `feat/exam-scoring-lambda`** (my launched branch) once `exam-scoring-engine` is in — it's a thin handler over `cat-engine`, realizing D-019 in-repo (no deploy).
5. **Then decide Gen B.** Either (a) rebase `exam-integration` onto the new `dev` (large, but it's the real backend), or (b) cherry-pick its verifier/RPC layer onto the Gen A contracts. **Either way, apply the §3.B governance reconciliation:** renumber Gen-B's `D-019`→`D-029` and `E-072`→`E-093` (they collide with `dev`), then forward-port `D-020…D-028` and `E-073…E-092`.
6. **Harvest Gen C first:** transcribe **D-015 + D-016 into `dev`** (verified missing) and grab the catalog data, then delete the dead branches to de-clutter.
7. **Brand:** review `feat/gt-brand-frontend` independently (visual layer; low coupling to the above).

---

## 6. Local-only branches worth backing up (push before rebasing)

These carry real work but exist only in your local `.git` (not on `origin`). Recommend `git push -u origin <branch>` for the keepers before any rebase surgery:
- `feat/exam-converge` (173) and `feat/exam-contract-reconcile` (134) — the model-reconciliation attempts (§4).
- `feat/exam-verify-plpgsql` / `feat/exam-telemetry-gate` — redundant with `exam-integration` (already pushed), so optional.
- `feat/adaptive-exam-app` — if you want the AX contract / D-016 history.

I did **not** push these tonight — pushing another contributor's/older-generation branches unprompted felt like overreach. Your call.

---

## 7. Open questions only you can answer

- **Spine vs backend:** adopt Gen A clean packages as the foundation and port Gen B's Supabase backend onto them (my recommendation), or promote Gen B and back-fit the clean packages?
- **Canonical model (§4):** which of the 4–5 representations is the source of truth?
- **Governance ID collisions (§3.B):** ratify the resolution — keep `dev`'s `D-019`/`E-072`, renumber Gen-B's colliding pair, forward-port `D-020…D-028`/`E-073…E-092`, and transcribe the missing `D-015`/`D-016`? (All verified against the branch files; needs your sign-off.)
- **Branch hygiene:** OK to delete the ~30 superseded component branches (`exam-bank*`, `exam-verify*`, etc.) after harvesting?

---

## 8. What I did tonight (all on their own branches, nothing merged to shared branches)

- **This guide** — `feat/overnight-review-guide` (docs only). Includes the **verified** governance-conflict analysis in §3.B.
- **D-019 Lambda handler** — `feat/exam-scoring-lambda` (based on `feat/exam-scoring-engine`): a thin, event-invoked handler wrapping `cat-engine`'s scoring/replay as a portable pure function + local invoke harness + tests + README, **no cloud deploy**. ✅ Verified: **75/75 tests, typecheck + lint clean**, local invoke returns a valid fingerprint. Pushed.
- **GT brand refactor** — `feat/gt-brand-frontend`: GT School brand applied across all `apps/web` surfaces (self-hosted fonts, token layer, chamfered CTAs). ✅ Verified: **64/64 web tests, typecheck + lint + `next build` clean**. One deliberate deviation flagged (kept the wizard's navy sidebar as a branded panel). Pushed.
- **Gen-A integration probe** — `feat/exam-genA-integration-probe`: merged the 5 spine branches into one tree and ran the full suite. ✅ Result: **zero merge conflicts, clean install, 6/6 typecheck, 303/303 tests, per-package lint clean.** Verdict: Gen-A is a defensible spine but is currently unwired (see §4). Full write-up in `docs/OVERNIGHT_GENA_INTEGRATION_PROBE.md` on that branch. Throwaway/do-not-merge.
- **Model reconciliation (proposal)** — `feat/exam-model-reconcile` (based on the green probe tree): wires the 5 slices onto `@gt-selection/contracts` per §4's wiring plan (canonical enum/types, scoring adapter, workspace deps, drop duplicate `apps/web/src/lib/exam` defs) while keeping the suite green. A reviewable proposal for the canonical-model choice — not merged, not a ratified decision.
- **Bonus finding (pre-existing `dev` lint debt):** root `pnpm lint` fails with **23 errors that already exist on `dev`** — 1 in `apps/web/src/…/family/apply-wizard.tsx`, 22 in `scripts/configure-cloud-auth-email.mjs` — unrelated to any exam work. A small, separate cleanup opportunity (note: `apply-wizard.tsx` is also touched by the brand branch, and `configure-cloud-auth-email.mjs` is deleted by some Gen-C branches, so fix it in coordination with those).

None of these touch `main`/`staging`/`dev`. Everything is held for your review.

*Non-exam branches present in the repo (`onboarding*`, `brainlift*`, `backend-admissions-core`, `governance-*`, `qtype-recategorization`, `reseparate-brainlifts`, `admissions-portal-frontend`, etc.) are prior/other workstreams and are out of scope for this exam-fleet map.*
