# Gen-A vs Gen-B Exam-Stack Consolidation — Evidence & Recommendation

> **STATUS: ANALYSIS / DECISION-SUPPORT ONLY — NOT A RATIFIED DECISION.**
> This document compares the two independently-verified generations of exam code
> and recommends a consolidation path, concern by concern. It is a *proposal* for
> the team lead. **Nothing here is merged, applied, or ratified.** The canonical-model
> choice, the spine-vs-backend decision, and the governance-ID reconciliation are
> team-lead calls (see `docs/OVERNIGHT_GOVERNANCE_DIVERGENCE.md`, `docs/OVERNIGHT_REVIEW_GUIDE.md` §7).
> All exam content on both lines is born-synthetic (`synthetic_only=true`,
> `validated=false`, D-006/R9); no item parameter or cut is empirically calibrated
> (RES-012/013). A reliable screen is **not** program-impact evidence (R10).

- **Requirements in view:** R11 (scalable/tunable GT-owned screener), R5 (defensible capability standard); D-015/D-016 (screener adoption + born-synthetic adaptive sub-app), D-019 (scoring/replay), D-020…D-028 (Gen-B build decisions), E-072 (≥1 AWS Lambda).
- **Author:** overnight analysis agent · **Date:** 2026-07-27
- **Base:** `dev` @ `2bc1fe8`. Branch: `feat/exam-genAB-consolidation-plan` (based on `dev`).
- **Method:** read-only. `git ls-tree` / `git diff --stat` / `git show` against the pushed branches, `rg` test-case counts, and reads of the actual source files. Full-suite pass/fail numbers (303/303, 308, 465/465, 728/728, 2268/2268) are quoted from the prior overnight verification branches and **cross-checked here** by re-counting test files and re-reading the code; where I re-ran a count myself it is marked *(observed)*.
- **No code was changed, no branches merged.** The only file added is this report.

---

## 0. How to read this (labels)

- **[V-obs]** Verified by me in this pass (a command/read I ran; the exact evidence is in the appendix).
- **[V-rep]** Verified in a prior overnight branch report and re-confirmed structurally here (I re-checked the file/test-file existence and counts, not necessarily by re-running the whole suite).
- **[INF]** Reasoned inference from the evidence.

---

## 1. TL;DR — per-concern verdicts

| # | Concern | Gen-A has | Gen-B has | Verdict | One-line why |
|---|---------|-----------|-----------|---------|--------------|
| 1 | **Contracts** | `contracts/assessment-exam.ts` (591 LOC, structure-agnostic, IRT, RPC envelopes, `advance/hold/retry`) | `contracts/assessment-exam-adaptive.ts` (613 LOC, adaptive-committed, answer-key/lure/scoringMode/provenance, server-authoritative raw response, closed metric registry) | **MERGE** | Same package forked at `b485567`; only the exam file differs. Take Gen-A's structure-agnostic skeleton as canonical, fold in Gen-B's server-only sub-schemas, adopt Gen-B's `questionTypeCode` regex. |
| 2 | **Scoring / engine** | `cat-engine` (75 tests): IRT 2PL/3PL θ scoring + deterministic replay + **the D-019 Lambda**; *no item selection* | `exam-engine` (112) adaptive **selection/update/stop** + `exam-scoring` (71) bracket/proficiency scorer | **KEEP BOTH, split by role** | Selection is Gen-B-unique; keep it. Pick **one** live score-of-record (Gen-B `exam-scoring`, which matches the verified backend). Keep `cat-engine` **only** as the D-019 Lambda/offline-replay unit (E-072 requires a Lambda). Add a drift test; don't run two live scorers. |
| 3 | **Item bank** | `packages/item-bank` (53): TS generator/solver toolchain + IRT params + JSONL bank + served projection | `research/exam-question-types` built out to **300 files** + DB seed + on-demand item registration (D-026) + **30 plpgsql server verifiers** (D-027) | **KEEP B**; harvest A's generator only if IRT is retained | Gen-B's banks + DB verifiers are the *verified* item source of record. Gen-A's package is a file-only bank factory with no server verifiers. |
| 4 | **Session / UI** | 23-file **pluggable-`Sequencer`** shell (`FixedSequencer`; two-stage demo adds `TwoStageSequencer`), client-only | 112-file surface (+35.8k LOC): adaptive client **wired to the DB** (`exam-session`/`exam-submit`/`exam-items` routes), persistence, app-tier verifiers w/ parity, telemetry gate (D-028) | **KEEP B** as runtime base; **harvest A's `Sequencer` + two-stage demo** | Gen-B is far more complete and is the *only* surface wired to a real backend. **This is the collision zone: 10 `apps/web` files exist on both at the same path.** |
| 5 | **Backend / DB** | **file-only, unapplied** `20260727120000_exam_data_model.sql` + 2 non-executing `.pending.sql` pgTAP stubs | 9 applied exam migrations, 8 executing exam pgTAP suites (**465/465**), 10 `app.exam_*` tables RLS **forced**, 10 `api.exam_*` RPCs `SECURITY DEFINER`, 30/30 verifiers | **KEEP B (confirmed Gen-B-unique)** | Gen-A has no real backend. Gen-B's verified Supabase backend is the single biggest reason to keep Gen-B. |
| 6 | **Governance** | encodes dev `D-019` (Lambda) + `E-072` (Lambda constraint) | encodes `D-019`(DB)/`D-020…D-028` + `E-073…E-092` | **Follow the divergence doc** | Keep dev's `D-019`/`E-072`; renumber Gen-B's colliding pair; forward-port `D-020…D-028`; transcribe the missing `D-015`/`D-016`; record a reconciliation decision. |

**Net:** Gen-A owns the **contract skeleton + the D-019 Lambda + the structure-agnostic session abstraction + the two-stage demo**. Gen-B owns the **substance that actually runs and is verified**: the backend, the adaptive selection loop, the live scorer, the real banks + server verifiers, and the DB-wired UI. The consolidation is therefore **not** "pick a winner" — it is "adopt Gen-A's typing/packaging/Lambda as the spine, rebase Gen-B's verified runtime onto it, and reconcile one contract + one scorer."

---

## 2. Topology & fact-corrections (read before the concerns)

**Where each generation actually lives** *(the phrase "5 packages on the current `dev` tip" is a base, not a merge — see below).* [V-obs]

| Line | Canonical branch(es) | Base | Verified state |
|------|----------------------|------|----------------|
| **Gen-A** | 5 pushed `feat/*` (`exam-data-model`, `exam-item-bank`, `exam-scoring-engine`→`exam-scoring-lambda`, `exam-session-shell`, `exam-validation-harness`); composed on `feat/exam-genA-integration-probe` (`2973ca5`); wired on `feat/exam-model-reconcile` (`27c5197`) | `dev` @ `2bc1fe8` | **303/303** tests, 6/6 typecheck, 0 merge conflicts [V-rep]; reconcile adds **308** [V-rep] |
| **Gen-B** | `feat/exam-integration` (`699ddea`), verified on `feat/exam-integration-verify` (`d7db7fb`) | `b485567` (2026-07-24; **8 commits behind `dev`**) | pgTAP **465/465**, JS/TS **728/728**, 30/30 verifiers, RLS forced [V-rep] |

- **Fact-correction:** `dev`'s tip (`2bc1fe8`) contains **only 3 packages** — `contracts`, `db-types`, `test-fixtures` — **not** the 5 Gen-A packages. [V-obs] `cat-engine` and `item-bank` do **not** exist on `dev`; the "5 clean packages" are 5 *unmerged branches based on `dev`*, and they only co-exist on the throwaway probe branch. **Consequence:** adopting Gen-A is a *merge of 5 branches*, not "it's already on `dev`."
- **`b485567` = `merge-base(dev, feat/exam-integration)`.** [V-obs] So the two `contracts` packages share a real common ancestor — they are the *same* package that forked, which is why 16 of their files are byte-identical (see Concern 1).
- Local worktree branches `== origin` for every branch cited. [V-obs]

---

## 3. Concern 1 — Contracts

### What each side has
Both `contracts` packages descend from the same pre-exam package. `git diff --stat` between the two package trees shows **only 5 files differ; all ~16 other files (`onboarding`, `application`, `correction`, `decision`, `review`, `workflow`, `roles`, `api-envelope`, `replay`, `reason-codes`, `errors`, and 7 shared `*.test.ts`) are byte-identical.** [V-obs]

```
packages/contracts/src/assessment-exam-adaptive.ts | 613 +++++   (Gen-B only)
packages/contracts/src/assessment-exam-contract.test.ts | 226 --  (Gen-A only)
packages/contracts/src/assessment-exam.ts          | 591 -----    (Gen-A only)
packages/contracts/src/bank-conformance.test.ts    | 119 ++       (Gen-B only)
packages/contracts/src/index.ts                    |   2 +-       (barrel swap)
```

The `index.ts` delta is a **one-line swap**: `export * from './assessment-exam'` → `export * from './assessment-exam-adaptive'`. [V-obs]

**Test-count reality-check.** Gen-A `contracts` = 60, Gen-B = 184 [V-rep], but that gap is **not** a 3×-richer core contract. 7 of the 8 test files are identical; the only different test file is Gen-A's `assessment-exam-contract.test.ts` (13 `it`) vs Gen-B's `bank-conformance.test.ts` (4 `it`). Gen-B's extra ~120 cases come from **`describe.each(banks…)` / `it.each(SERVER_ONLY_FIELDS)`** sweeping all 63 banks — a data-driven conformance sweep, not more contract surface. [V-obs]

**They are, however, genuinely divergent *designs* of the exam contract** (both Zod, both born-synthetic, both share the 4-domain enum, age bands, telemetry/postMessage skeleton, and the R10 `claimBoundary`): [V-obs, from reading both files]

| Dimension | Gen-A `assessment-exam.ts` | Gen-B `assessment-exam-adaptive.ts` |
|---|---|---|
| Stance | **Structure-agnostic** (`deliveryStructure: linear\|adaptive\|two_stage\|custom`; adaptive state kept in opaque `structureConfig`/`structureState` the contract never interprets) | **Adaptive-committed** (float-difficulty proficiency ladder baked in) |
| Difficulty | ordinal rung `1..20` nullable **+ optional IRT** (`a`,`b`,`c`, 2PL/3PL) | **float `1..20`** design rung, explicitly *not* IRT |
| Scoring authority | `itemResponseSchema` carries client-emitted `correct`+`score` (demo→host) | `itemResultSchema` is **raw response only**; `scoredItemSchema` server-extends it → **server-authoritative correctness baked into the contract (D-027)** |
| Answer-key model | not in the contract (bank/DB side) | **rich, in-contract:** `answerKey` + `lureClass` (9) + `distractorRationale`(Map/grouped) + `scoringMode` (4) + `provenance` (D-020) |
| Served/bank split | two parallel object schemas | `servedItemSchema = bankItemSchema.omit({answer,scoring,provenance})` — **structural** leak guarantee |
| Metric ids | open regex `M-[A-Z]+` | **closed enum (20)** + `BASIC_CORE_METRICS` registry w/ scope/influence/minSamples (D-022) |
| Telemetry kinds | open lower-snake string + suggested set | **closed enum (9)** |
| Engine state | opaque blob | **explicit** `areaState`/`sessionState` in contract |
| Policy | structure-agnostic (opaque params) | concrete adaptive knobs w/ defaults (decaying step D-023, age-band bonus D-025, bracket cuts) |
| Outcome decision | `screenDecision` = `advance/hold/retry` | **no decision label** (profile only) |
| `questionTypeCode` regex | `^[A-Z]+-[A-Z0-9]+-\d+$` — **uppercase-only** | `^[A-Z]+-[A-Za-z0-9]+-\d+$` — mixed-case |
| RPC request/response envelopes | **full set** (createParticipant/startSession/submitResponse/getSession/getExamPolicy/listExamItems/examSessionState) | absent from this file (RPC lives in the DB `api.*` tier) |

**Concrete divergence with a real consequence [V-obs]:** Gen-A's `questionTypeCode` regex **rejects 11 of the 66 catalog types** (`WM-bind-01`, `CX-achieve-02`, … use a lowercase middle segment). Gen-B's regex accepts them. A canonical contract must use Gen-B's regex or it cannot represent the real catalog.

### Overlap vs unique
- **Overlap:** the 4-domain enum, age bands, telemetry event + postMessage protocol skeleton, born-synthetic invariants, `claimBoundary`. And ~16 non-exam contract files are *identical*.
- **Unique to A:** structure-agnostic delivery abstraction, IRT parameter schema, the full RPC envelope set, `screenDecision`.
- **Unique to B:** the server-authoritative raw-response split, the answer-key/lure/scoringMode/provenance model, the closed metric registry, explicit adaptive state/policy knobs. **These are exactly what the verified DB verifiers + item registry depend on.**

### Recommendation — **MERGE (Gen-A skeleton canonical + fold in Gen-B's server-only sub-schemas)**
Neither strictly dominates: Gen-A is the better *chassis* (structure-agnostic, RPC envelopes, hosts the two-stage demo and the Lambda), Gen-B carries the *concrete adaptive substance the working backend needs*. Because the two files have **different names and everything else is identical**, they can literally coexist in one package with a 2-line barrel union — this is the low-risk migration seam.

### Concrete migration step
1. In one `contracts` package, keep **both** `assessment-exam.ts` and `assessment-exam-adaptive.ts`; union the barrel (`export *` from both). This is a 2-line change and textually conflict-free. [V-obs on feasibility]
2. Converge the **shared** primitives to a single owner: `examDomainSchema`, `ageBandSchema`, `telemetryEvent*`, `HOST/DEMO_MESSAGE_SOURCE`. Adopt **Gen-B's `questionTypeCode` regex** (superset).
3. Fold Gen-B's `answerKey`/`lureClass`/`distractorRationale`/`scoringMode`/`provenance`/`BASIC_CORE_METRICS` and the raw-`itemResult`→`scoredItem` split into the canonical file (or keep them in an `-adaptive` sub-module that imports the shared primitives).
4. Decide the outcome shape: keep Gen-A's `screenDecision` (screening routing) **or** Gen-B's decision-free profile — this is the one genuine product choice here (R10 boundary favors *not* over-labeling; either is defensible).

**Lost if you pick only one:** pick A-only → the DB verifiers/registry lose their contract (answer-key taxonomy, scoringMode, closed metrics) and must be re-authored; pick B-only → lose the structure-agnostic delivery model, IRT schema, RPC envelopes, and the two-stage demo's contract basis.

---

## 4. Concern 2 — Scoring / engine

### What each side does [V-obs from reading each package's `index.ts` + `package.json`]
- **Gen-A `cat-engine` (75 discrete tests, *observed* raw `it`=75):** pure, **zero-runtime-dependency** IRT scoring + deterministic-replay engine. Exports `irt` (2PL/3PL), `theta` (EAP+MLE), seeded `rng`, `scoring`, `rte` (rapid-guess filter), `item-scoring`, `replay`, and **`lambda/handler` + `lambda/event`** — the intended AWS Lambda payload (D-019). Its header states it **"does NOT itself route or select items."** No adaptive loop.
- **Gen-B `exam-engine` (112):** pure, zero-runtime-dep **adaptive-selection** engine — `startState`, `nextType`/`nextItem`/`toServedItem` (selection), `update`/`stepSize`/`directionReversals` (reversal-indexed decaying difficulty, D-023), `isDone`/coverage/stop-rule, `replaySession`, synthetic-bank harness. **This is the adaptive loop `cat-engine` deliberately omits.**
- **Gen-B `exam-scoring` (71, *observed* raw `it`=71):** pure, zero-runtime-dep **metric registry + bracket/proficiency scorer** — `scoreExam(items, policy) → ExamScore`, `ability` (difficulty-adjusted bracket driver, D-024), derived metrics (RT variance, consistency, growth, rotation slope).

All three are dependency-free with **their own local type copies** (same pattern), so any of them can sit on a spine via a thin type-mapping adapter — exactly what `feat/exam-model-reconcile` already did for `cat-engine` (`cat-adapter.ts`, +5 tests). [V-obs on deps]

### Overlap vs unique
- **Unique to Gen-A:** real **IRT** (2PL/3PL a/b/c + EAP/MLE θ) and **the only Lambda in the repo** (satisfies E-072 / dev-D-019).
- **Unique to Gen-B:** **adaptive item selection**, the difficulty-update loop, the coverage-based stop rule — none of which exist in `cat-engine`.
- **The genuine redundancy = SCORING.** `cat-engine` (IRT θ on a latent scale) and `exam-scoring` (accuracy brackets + proficiency on `1..20`) compute the *same* deliverable (per-area ability + composite) with **incompatible math and incompatible item inputs** (IRT `a/b/c` vs float difficulty + metric maps). The **verified end-to-end system uses Gen-B's `exam-engine`+`exam-scoring`, not IRT**; per the probe, `cat-engine` is imported by nothing outside itself and its only realized consumer is the D-019 Lambda handler.

### Recommendation — **KEEP BOTH, split by role; drop the *redundancy*, not a package**
- **Selection/update/stop-rule:** **keep Gen-B `exam-engine`** (unique; there is no A equivalent).
- **Score-of-record:** **keep Gen-B `exam-scoring`** as the single live scorer (it matches the verified backend + DB verifiers + the float-difficulty item model).
- **`cat-engine`:** **keep, but re-scope to the D-019 Lambda / offline deterministic-replay & audit unit.** It must not be "dropped": dev-`D-019` + `E-072` require ≥1 AWS Lambda, and `cat-engine/lambda/*` is the repo's only realization. [V-obs: dev `E-072` text = "must incorporate at least one AWS Lambda … satisfied by … the exam scoring + deterministic-replay engine."]
- **Do not run two live scorers.** Designate one; add a compile-time drift test so `cat-engine`'s `SCORED_DOMAINS` and the canonical `examDomainSchema` cannot silently diverge (probe/reconcile already recommend this).

### Concrete migration step
Bring `exam-engine` + `exam-scoring` onto the spine as pure packages (no product change). Write one adapter mapping the canonical served item + persisted responses into `exam-engine`/`exam-scoring` inputs (mirrors the existing `cat-adapter.ts`). Keep `feat/exam-scoring-lambda` as the Lambda entry over `cat-engine`. **Can Gen-B's engine "sit on top of" `cat-engine`?** No — they are peers, not layers: `exam-engine` sits on the *contract/bank*, not on `cat-engine`; and only one of {`cat-engine` scoring, `exam-scoring`} can be the score-of-record.

**Lost either way:** dropping IRT (`cat-engine` scoring) loses a future calibrated-IRT path (RES-012) but nothing currently wired; dropping `exam-scoring` loses the *verified* live scorer and breaks the DB parity. Keeping both without a chosen authority risks two divergent "official" scores.

---

## 5. Concern 3 — Item bank

### What each side has [V-obs]
- **Gen-A `packages/item-bank` (53 tests, 24 src files + data):** a self-contained TS **bank factory** — `bank-item`/`enums`/`answer`/`provenance`/**`irt.ts`** schemas, content generators (`content/{fluid,quant,spatial,verbal}`), a 263-line `solvers.ts`, a large generated `type-registry.generated.ts`, `rng.ts` (uses `node:crypto`), a served-projection, JSONL data (`data/bank/items.bank.jsonl`, `data/served/items.served.jsonl`), and QA/build scripts. **File-based; no DB; no server verifiers.**
- **Gen-B item representation:** the shared catalog `research/exam-question-types` is **built out from a 102-file skeleton (dev/Gen-A) to 300 files** (+265 files, +82,098/−11,793 vs `dev`) — the real 63-type banks plus QA tooling (`leak_scan.mjs`, `dupe_fingerprint.mjs`) — **plus** DB seed, **on-demand DB item registration** (`api.exam_register_item`, D-026), and **30 plpgsql server-side verifiers** (D-027). Gen-B has **no `packages/item-bank`.** [V-obs: Gen-B package list]

### Overlap vs unique
- **Overlap:** both encode question types across the 4 domains with answer keys + served projections and both cite `EXAM_ITEM_SCHEMA_SPEC.md`; both do generation + QA.
- **Unique to A:** the packaged generator/solver toolchain, **per-item IRT parameters**, the generated type registry.
- **Unique to B:** the *actual* research banks (300 files), the **server-authoritative plpgsql verifiers** (the real "server keys"), DB item registration, leak/dupe scanners, and the richer answer-key/lure taxonomy the verifiers consume.

### Recommendation — **KEEP B; harvest A's generator only if IRT is retained**
Gen-B's research banks + DB registration + verifiers are the **verified item source of record** and are what the 465/465 pgTAP and 2268/2268 cross-tier differential actually exercise. Gen-A's `item-bank` is a clean *generator*, not a runtime source, and its IRT params are only useful if `cat-engine` IRT scoring is kept.

### Concrete migration step
Adopt Gen-B's banks + `api.exam_register_item` + plpgsql verifiers. Point the bank schema at the canonical contract (the reconcile branch already unified the domain enum for `item-bank`). If IRT stays: keep `item-bank/irt.ts` + generators as an **offline** synthetic-bank/IRT-parameter tool feeding fixtures + Lambda replay. If not: archive `packages/item-bank`, harvesting `solvers.ts` only if a generator is still wanted. **Lost if you drop A's item-bank:** the reusable generator/solver/IRT toolchain and its coverage-QA harness (re-derivable, not verification-critical).

---

## 6. Concern 4 — Session / UI

### What each side has [V-obs]
- **Gen-A `apps/web` (23 files, +2,127/−180 vs `dev`):** a **structure-agnostic pluggable session shell** — `lib/exam/{session,sequencer,item,bank,scoring,harvest,sample-items,types}`, a `FixedSequencer` (and `TwoStageSequencer` on the demo branch), `components/exam/*` renderers (single-select + embedded-demo), `use-exam-session`, a synthetic demo at `/dev/exam-shell`, and one `api/exam-results` route (persists with a graceful local-summary fallback). **Client-only; no adaptive/DB wiring.**
- **Gen-B `apps/web` (112 files, +35,806/−1,618 vs `dev`):** the adaptive client **wired to the backend** — `api/exam-session`, `api/exam-submit`, `api/exam-items` routes, `lib/exam/{adaptive,bank-loader,persistence,contract,messaging,legacy-bridge,registry.generated}`, **app-tier verifiers** (`lib/exam/verifiers/{fluid,quant,spatial,verbal,generic}` + `lexicon-parity`) that mirror the plpgsql verifiers for the cross-tier differential, `served-boundary`/`standalone-guard`, and the **D-028 telemetry-panel gate**.

### Overlap vs unique — **this is the collision zone**
Unlike the packages (disjoint on disk), the two `apps/web` surfaces **collide on 10 files at identical paths** [V-obs]:
```
app/(embed)/family/exam/page.tsx            components/exam/exam-runner.tsx (+ .module.css)
app/api/exam-results/route.ts (+ .test.ts)  components/exam/preview-exam.tsx
app/dev/family-preview/exam/page.tsx        lib/exam/bank.ts (+ bank.test.ts)
                                            lib/exam/types.ts
```
A straight merge of the two UIs **would conflict** here — this is the one place a textual merge is not clean.

### Recommendation — **KEEP B as the runtime base; harvest A's `Sequencer` + two-stage demo**
Gen-B is dramatically more complete and is the *only* surface connected to a real, verified backend. Gen-A's value is the **pluggable `Sequencer` abstraction** and the **two-stage demo** (`feat/exam-two-stage-demo`, the deliverable Crystal asked for), which map to the structure-agnostic contract.

### Concrete migration step
Base the runtime UI on Gen-B. Re-introduce Gen-A's `Sequencer` seam as an **additional delivery structure** (register `FixedSequencer`/`TwoStageSequencer` alongside Gen-B's adaptive driver) rather than merging file-by-file. Reconcile the 10 colliding files by hand (favor Gen-B's wired versions; port Gen-A's renderer/demo niceties). **Lost either way:** A-base loses the whole wired backend surface + verifiers (unacceptable); B-base defers/re-tests the two-stage demo and pluggable shell onto the new base.

---

## 7. Concern 5 — Backend / DB (confirmed Gen-B-unique)

### Evidence [V-obs, corroborating the `feat/exam-integration-verify` report]
- **Gen-B:** 9 exam migrations — `exam_adaptive_core` (schema), `exam_adaptive_api` (RPC), `exam_adaptive_seed`, `exam_outcome_ownership`, `exam_item_registration`, `exam_verify_plpgsql` + 3 verifier batches — of **20 total**; 8 executing exam pgTAP suites (`120`–`130`). Verified: **pgTAP 465/465**, **10/10 `api.exam_*` RPCs `SECURITY DEFINER`**, **10/10 `app.exam_*` tables RLS enabled + forced**, **30/30 per-type verifiers** confirmed 3 ways (registry rows, distinct fns, `2268/2268` differential), answer keys firewalled from `anon`/`authenticated`. [V-rep]
- **Gen-A:** **2 file-only, unapplied** exam SQL files (`20260727120000_exam_data_model.sql` + seed) and **2 non-executing `.pending.sql` pgTAP stubs** (`120_exam_schema_security.pending.sql`, `130_exam_rls_noninterference.pending.sql`). The probe confirms these migrations were merged "files only and NOT applied." **Gen-A has no runnable backend.** [V-obs]
- Gen-A also adds `packages/db-types/src/exam.ts` (423 LOC hand-written DB row shapes); **Gen-B has no such file** (0 LOC) because it generates types from the real applied schema. [V-obs] → Gen-A's `db-types/exam.ts` is largely superseded once Gen-B's DB exists.

### Recommendation — **KEEP B.** This is the decisive asymmetry.
There is nothing to merge here: Gen-B *is* the backend; Gen-A only sketches one. The main reason to keep Gen-B at all is this verified Supabase schema/RPC/RLS/verifier stack.

### Concrete migration step
Carry Gen-B's `supabase/migrations/*` + `supabase/tests/12x–130` intact. **Rebasing them onto `dev` is the real work:** Gen-B's base is 8 commits behind `dev` (the Lambda-governance, brainlift, and hosted-persistence commits). After rebase, **re-run `pnpm db:reset && pnpm db:test`** and the JS/TS suites to reconfirm 465/465 + 728/728 on the new base. Drop Gen-A's `db-types/exam.ts` in favor of generated types (or keep only as a typed façade).

---

## 8. Concern 6 — Governance / decisions (cross-ref, not re-derived)

Full detail and verbatim entries live in **`docs/OVERNIGHT_GOVERNANCE_DIVERGENCE.md`** (on `feat/overnight-review-guide`). Core claims **re-confirmed here against the actual files** [V-obs]:
- `dev`'s `DECISION_LOG.md` jumps **`D-014 → D-017`** — **`D-015`/`D-016` are missing** (they define R11 screener adoption and the born-synthetic adaptive sub-app; `D-016` even names `packages/cat-engine`).
- **`D-019` collides:** `dev` = "Add one AWS Lambda for exam scoring & deterministic replay"; `feat/exam-integration` = "One source of truth for screener selection and scoring: the database stores, the TypeScript packages decide."
- **`E-072` collides:** `dev` = the "≥1 AWS Lambda" constraint (satisfied by the `cat-engine` Lambda); Gen-B = an M-ORIG/M-FLEX norm-bank note.
- `feat/exam-integration` carries `D-020…D-028` and (per the divergence doc) `E-073…E-092`, which **forward-port without top-level ID collision**. [V-obs on D-020…D-028 headings]

### Recommendation — adopt the divergence doc's procedure (needs ratification)
Keep `dev`'s `D-019`/`E-072` (already merged); **renumber** Gen-B's colliding pair (`D-019→D-029`, `E-072→E-093`) and re-point in-branch refs; **forward-port** `D-020…D-028` / `E-073…E-092`; **transcribe** `D-015`/`D-016` into `dev` and re-point their `E-071–E-077` citations (this step is *not* mechanical — the evidence register forked three ways); record it all as a new decision (e.g. `D-030`). This is a governance-ratification task for the team lead, independent of the code path chosen.

---

## 9. Top-level recommended consolidation path

**Primary recommendation — "Gen-A typed spine + Lambda; rebase Gen-B's verified runtime onto it; one contract, one live scorer."** This matches `OVERNIGHT_REVIEW_GUIDE.md` §7 and the governance that already anticipates `packages/cat-engine` (D-016). Ordered steps with effort/risk:

| # | Step | Effort | Risk | Notes / acceptance |
|---|------|--------|------|--------------------|
| 0 | Merge the 5 Gen-A branches into `dev` (data-model → item-bank → scoring-lambda → session-shell → validation-harness) | **S** | **Low** | Probe proved 0 conflicts, 303/303. Re-run `pnpm typecheck && pnpm -r test`. |
| 1 | Land `feat/exam-model-reconcile` wiring (single domain-enum owner + `cat-adapter`) | **S** | **Low** | Already green at 308. |
| 2 | Land `feat/exam-scoring-lambda` (D-019 Lambda over `cat-engine`) | **S** | **Low** | Green at 75/75; satisfies E-072. |
| 3 | **Reconcile the two contracts** (barrel-union both exam files → converge shared enums → adopt Gen-B `questionTypeCode` regex + fold in server-only sub-schemas) | **M** | **Med** | Non-mechanical: server-authoritative response, answer-key taxonomy, closed metric enum, outcome-label choice. Acceptance: contracts typecheck + `bank-conformance` green. |
| 4 | **Rebase `feat/exam-integration` onto the new `dev`** and re-point its engine/scoring/banks/UI at the reconciled contract | **L** | **High** | The 232-commit, +35.8k-LOC system, 8 commits behind base, **10 colliding `apps/web` files**. Acceptance: **re-run pgTAP 465/465, JS/TS 728/728, differential 2268/2268, RLS forced.** |
| 5 | Designate `exam-scoring` as score-of-record; re-scope `cat-engine` to Lambda/offline-replay; add domain-drift test | **S–M** | **Med** | Must not ship two live scorers. |
| 6 | Governance reconciliation (renumber D-019/E-072; forward-port D-020…D-028; transcribe D-015/D-016; record D-030) | **M** | **Med** | Ratification required; evidence re-pointing is not mechanical. |
| 7 | Harvest `feat/exam-two-stage-demo` + `feat/exam-validation-harness` onto the converged tree | **S** | **Low** | Additive; demo is a stakeholder deliverable. |

**Dominant cost/risk is Step 4** — you are rebasing the *only verified end-to-end system* onto the smaller skeleton and must fully re-verify it. The spine is clean precisely because it is mostly unwired scaffolding.

### Lower-risk alternative — "Gen-B as base; harvest Gen-A's Lambda/demo/contract-abstractions"
Take `feat/exam-integration` as the base, **rebase it onto `dev`** (absorb the 8 missing commits), then harvest onto it: `cat-engine` + the D-019 Lambda (governance), the structure-agnostic contract additions (`deliveryStructure`, IRT schema, RPC envelopes) as an extension, the `Sequencer`/two-stage demo, and the validation harness. Governance reconciliation is identical.
- **Effort:** rebase-onto-`dev` (**M**, 8 commits) + harvest (**M**). **Risk:** **Med.**
- **Why consider it:** it **avoids re-verifying the whole backend against a new contract** — the proven 465/465 + 728/728 stay on their own shapes; you only re-test the *harvested* additions.
- **Trade-off:** the canonical contract stays adaptive-flavored (structure-agnosticism becomes an extension, not the base), you carry Gen-B's larger surface, and `packages/db-types/exam.ts` + `item-bank` become optional tools.

**Decision framing for the team lead:** if you value the *structure-agnostic contract + governance-anticipated package layout* enough to pay a full backend re-verification, take the **Primary**. If you value *preserving the maximum verified work with the least re-testing*, take the **Alternative**. Both keep `cat-engine`'s Lambda (E-072), keep `exam-engine`'s selection, require choosing one score-of-record, and require the same governance fix.

---

## 10. What is lost / must be re-tested — either way

**Always required regardless of path:**
- Keep `cat-engine`'s Lambda (E-072/dev-D-019) and `exam-engine`'s selection (unique); choose exactly one score-of-record; resolve the `D-019`/`E-072` collision + `D-015`/`D-016` gap.
- Re-run the full Gen-B verification after *any* rebase (its base is 8 commits behind `dev`): `pnpm db:reset`, `pnpm db:test` (465), `pnpm -r test` (728), `pnpm exam:verify:diff` (2268), RLS-forced introspection.

**If Primary (Gen-A spine):**
- **Re-test surface is large:** every Gen-B verifier/RPC/RLS/UI path re-pointed at the reconciled contract must be re-verified; regressions in the 30 verifiers or forced-RLS are the main hazard.
- **Superseded/likely dropped:** Gen-A `db-types/exam.ts` (423 LOC, replaced by generated types); Gen-A `test-fixtures/exam-fixtures.ts` (255 LOC, re-pointed); possibly `packages/item-bank` (→ offline tool).
- **At risk of loss if rushed:** Gen-B's server-only contract richness (answer-key/lure/scoringMode/provenance, closed metric registry) if the merge naïvely keeps only Gen-A's file.

**If Alternative (Gen-B base):**
- **Lost/demoted:** Gen-A's structure-agnostic contract as *canonical* (kept as extension), the IRT parameter schema (unless `cat-engine` retained), the RPC envelope set (Gen-B uses DB `api.*`), and Gen-A's `db-types/exam.ts`.
- **Re-test surface is smaller** (only harvested pieces: Lambda, demo, harness, contract-extension), but you inherit Gen-B's larger/older surface and its documentation drift (two stale STATUS docs noted by the verify report).

---

## 11. Appendix — evidence commands & observed numbers

*(Read-only; run from a worktree on `dev`. `GENA=origin/feat/exam-genA-integration-probe`, `GENB=origin/feat/exam-integration`.)*

- Package sets: `git ls-tree --name-only <ref> packages/` → **Gen-A(probe):** cat-engine, contracts, db-types, item-bank, test-fixtures; **Gen-B:** contracts, db-types, exam-engine, exam-scoring, test-fixtures; **dev tip:** contracts, db-types, test-fixtures only. [V-obs]
- Contracts divergence: `git diff --stat $GENA $GENB -- packages/contracts/src` → 5 files differ (733+/818−), rest byte-identical; `index.ts` = 1-line barrel swap. [V-obs]
- Exam-contract sizes: `assessment-exam.ts` 591 LOC; `assessment-exam-adaptive.ts` 613 LOC. [V-obs]
- Test-file counts (`rg -c '^\s*(it|test)\('`, raw, pre-`.each`): cat-engine **75**; exam-scoring **71** (both match full-run); contracts A raw 53 / B raw 44 but full-run 60 / 184 — gap is `describe.each`/`it.each` over 63 banks in `bank-conformance.test.ts`. [V-obs]
- Engine deps: `cat-engine`, `exam-engine`, `exam-scoring` all have **no runtime dependencies**; `item-bank` deps `zod` only. [V-obs]
- Backend: Gen-B 9 exam migrations / 8 exam pgTAP suites; Gen-A 2 file-only migrations + 2 `.pending.sql` stubs. [V-obs] Verified pgTAP 465/465, JS/TS 728/728, 30/30 verifiers, RLS forced. [V-rep]
- Item banks: `research/exam-question-types` = 102 files on dev/Gen-A, **300 on Gen-B** (+265 files, +82,098/−11,793). [V-obs]
- UI collision: 10 `apps/web/src` exam files on both at identical paths (see §6). [V-obs]
- Governance: dev `DECISION_LOG` D-014→D-017 (D-015/D-016 absent); dev D-019=Lambda, E-072=Lambda constraint; Gen-B D-019=DB-source-of-truth (collision), D-020…D-028 present. [V-obs]

**Prior overnight sources cross-referenced:** `docs/OVERNIGHT_REVIEW_GUIDE.md`, `docs/OVERNIGHT_GENA_INTEGRATION_PROBE.md`, `docs/OVERNIGHT_MODEL_RECONCILE_REPORT.md`, `docs/OVERNIGHT_EXAM_INTEGRATION_VERIFY.md`, `docs/OVERNIGHT_GOVERNANCE_DIVERGENCE.md`.

*Analysis/decision-support only. Not a ratified decision. Born-synthetic throughout; predictive validity ≠ program impact (R10).*
