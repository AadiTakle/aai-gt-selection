# Overnight Exam-Fleet Review Guide

**Generated:** 2026-07-27 (early AM), by the overnight agent, for morning review.
**Baseline:** `dev` @ `2bc1fe8` (*"Merge feat/governance-lambda-decision into dev — D-019 + E-072"*). `origin/dev` and local `dev` are in sync (0/0).
**Status of this document:** Navigational aid only. It records **reasoned inferences** from `git log`/`git diff` metadata and worker hand-off notes. It does **not** independently re-run the branches' test suites, so per-branch "tests present" means test files exist in the tree, not that they were re-executed tonight. Nothing here is a governance ratification.

> **Purpose:** You asked me to keep producing reviewable work on branches overnight. Over multiple autonomous turns this produced *many* exam branches across several generations. Reviewing them cold is confusing, so this file is the map: what exists, how the pieces relate, what's safe, what's risky, what's only stored locally, and a recommended order to look at things.

---

## 1. TL;DR — read this first

1. **There are three generations of exam work.** They overlap heavily (each has "scoring", "item bank", "adaptive backend"). Do **not** try to merge them all — pick a spine and harvest from the rest.
2. **Recommended spine = Generation A** (the 5 clean, structure-agnostic packages freshly based on the current `dev` tip and already pushed to `origin`). They merge cleanly because they share `dev`'s base.
3. **Generation B (`feat/exam-integration`, 232 commits)** is the most *complete* system — a real Supabase adaptive backend with 30/30 server-side answer verifiers — but it sits on a **3-day-old base** and carries **ungoverned decisions** (D-024/025/027/028) and evidence (E-083/084/090/091/092) that are not yet in `dev`'s governance docs. Treat it as a rich quarry to cherry-pick/rebase, **not** a straight merge.
4. **The biggest single decision for you:** there are **four parallel item/scoring models** in flight (see §4). Someone has to pick one canonical contract before these branches can converge. Two branches (`feat/exam-converge`, `feat/exam-contract-reconcile`) are unpushed attempts at exactly this.
5. **Several high-value branches are LOCAL-ONLY (never pushed).** If a worktree is pruned the *worktree* disappears but the branch ref survives in `.git`; still, I recommend pushing the keepers (see §6) so they're backed up before you start rebasing.
6. **Still running / just launched by me tonight (held on their own branches, not merged):**
   - GT brand refactor of `apps/web` → `feat/gt-brand-frontend` (in progress).
   - D-019 Lambda handler wrapper around the clean scoring engine → `feat/exam-scoring-lambda` (launched; the one clearly-missing, non-duplicative required piece).
   - This guide → `feat/overnight-review-guide`.

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

**Ungoverned governance on Gen B (must land in `dev`'s docs when you promote any of it):**
- **Decisions:** D-024 (difficulty-adjusted ability as non-default bracket driver), D-025 (price age-band item preference in scale points), D-027 (database is the single authority on per-item correctness), D-028 (hide per-child telemetry from the test-taker).
- **Evidence:** E-083 (item handshake), E-084 (score the *verified* trace, not the client-posted one — logged as a top defect then fixed), E-090/E-091/E-092 (per-type verifier ports + server-only lexicon).
- These are referenced in commit messages on the branch; confirm they exist in the branch's `DECISION_LOG.md`/`ASSUMPTIONS_AND_EVIDENCE.md` copies and forward-port them.

### 3.C Generation C — earlier, mostly superseded

| Branch | Ahead/Behind | Pushed | Keep for | Recommendation |
|--------|--------------|--------|----------|----------------|
| `feat/adaptive-exam-app` | 6/47 | ❌ local | AX-01..05 contract+engine+DB+surface; **D-016 adaptive-screener governance** | Harvest the D-016 gov commit (`eef1d28`) if not already in `dev`; otherwise archive |
| `feat/exam-backend` / `feat/exam-engine` / `feat/exam-frontend` | 62/2/2 ahead, 12 behind | ❌ local | earliest portal wiring | Superseded by A+B; archive |
| `feat/exam-item-bank-research` | 2/64 | ❌ local | categorized K-8 catalog (318 rows) | Harvest the catalog data if useful, then archive (old base deletes newer `dev` files) |
| `feat/interview-scope-update` | 1/59 | ❌ local | D-015 Timeback-fit + R11 screener reframe | Likely already in `dev` via the brainlift re-separation merge (`0a1921a`); verify then archive |
| `feat/exam-item-schema-spec` | 0 ahead | ✅ origin | schema spec | Already in `dev` (`d11b2d3`); nothing to merge |

> ⚠️ **Old-base hazard:** Gen C branches show huge *deletions* in `git diff dev..<branch>` only because they predate files `dev` now has (research shards, brainlift consolidation, migrations). **Never** straight-`merge` them into `dev` — you'd clobber newer work. Cherry-pick the specific signal commit instead.

---

## 4. The central decision: four parallel item/scoring models

These currently coexist. They must converge on **one** canonical contract before the exam stack is coherent:

1. `packages/contracts/src/assessment-exam.ts` (Gen A `exam-data-model`) — 591-LOC Zod contract + db-types + fixtures.
2. `packages/item-bank/*` (Gen A `exam-item-bank`) — bank-item schema, generators, solvers, server-side keys.
3. `packages/cat-engine/*` (Gen A `exam-scoring-engine`) — scoring/replay types (`types.ts`, 181 LOC).
4. `apps/web/src/lib/exam/*` (Gen A `exam-session-shell`) — `item.ts` (242 LOC) + `scoring.ts`, a UI-local model.

Plus Gen B's Supabase schema is a **fifth** representation (the database's own tables/RPC shapes).

`feat/exam-converge` (173 commits) and `feat/exam-contract-reconcile` (134) are unpushed prior attempts at this reconciliation on the Gen B base — worth reading before you redo the work, but they're on the old base so their *code* may not apply cleanly to Gen A.

**Suggested convergence rule (proposal, not a decision):** make `packages/contracts` the single source of truth for item/response/session shapes; have `item-bank`, `cat-engine`, the session shell, and the Supabase migration all *import from* or *conform to* it. This is a clean-up task, not new features.

---

## 5. Recommended review / integration order

1. **Confirm the spine.** Skim the 5 Gen A branches (they're small and on `origin`). Decide they're the foundation.
2. **Resolve §4 model choice** (pick canonical contract). This unblocks everything else.
3. **Merge Gen A into `dev`** in dependency order: `exam-data-model` → `exam-item-bank` → `exam-scoring-engine` → `exam-session-shell` → `exam-validation-harness`. Reconcile the `apps/web/src/lib/exam` vs `packages` overlap during the session-shell merge.
4. **Fold in `feat/exam-scoring-lambda`** (my launched branch) once `exam-scoring-engine` is in — it's a thin handler over `cat-engine`, realizing D-019 in-repo (no deploy).
5. **Then decide Gen B.** Either (a) rebase `exam-integration` onto the new `dev` (large, but it's the real backend), or (b) cherry-pick its verifier/RPC layer onto the Gen A contracts. **Forward-port D-024/025/027/028 + E-083/84/90/91/92 into governance either way.**
6. **Harvest Gen C** (D-016 gov, catalog data) then delete the dead branches to de-clutter.
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
- **Governance forward-port:** ratify D-016 and D-024/025/027/028 (currently only on branches) into `dev`'s `DECISION_LOG.md`?
- **Branch hygiene:** OK to delete the ~30 superseded component branches (`exam-bank*`, `exam-verify*`, etc.) after harvesting?

---

## 8. What I did tonight (all on their own branches, nothing merged to shared branches)

- **This guide** — `feat/overnight-review-guide` (docs only).
- **D-019 Lambda handler** — `feat/exam-scoring-lambda`, based on `feat/exam-scoring-engine`: a thin, event-invoked handler wrapping `cat-engine`'s scoring/replay as a portable pure function + local invoke harness + test, **no cloud deploy** (Terraform/IAM remain the dormant follow-ups D-019 already describes).
- **GT brand refactor** — `feat/gt-brand-frontend` (launched earlier; visual refactor of `apps/web` per the GT brand skill).

None of these touch `main`/`staging`/`dev`. Everything is held for your review.

*Non-exam branches present in the repo (`onboarding*`, `brainlift*`, `backend-admissions-core`, `governance-*`, `qtype-recategorization`, `reseparate-brainlifts`, `admissions-portal-frontend`, etc.) are prior/other workstreams and are out of scope for this exam-fleet map.*
