# Overnight Governance Divergence — reference & reconciliation notes

**Companion to `docs/OVERNIGHT_REVIEW_GUIDE.md` (§3.B).**
**Status:** Reference material and a *proposed* procedure. **Nothing here is ratified.** The colliding-ID resolution and the forked-evidence re-numbering are governance decisions for the team lead. This file exists so you don't have to hand-extract entries from unmerged branches at merge time.

## Why this exists
The exam work forked into parallel governance lines that were never merged into `dev`. As a result:
1. **`dev` is missing `D-015` and `D-016`** (its `DECISION_LOG.md` jumps `D-014 → D-017`), even though R11/product reference them.
2. **`D-019` collides:** `dev` = "Add one AWS Lambda for exam scoring & deterministic replay" (2026-07-26) vs `feat/exam-integration` = "One source of truth for screener selection and scoring…" (2026-07-25).
3. **`E-072` collides three ways:** `dev` = the AWS-Lambda constraint (tonight); `feat/exam-integration` = M-ORIG/M-FLEX need a per-prompt norm bank (2026-07-25); and `feat/adaptive-exam-app`'s `D-015` cites `E-071–E-077` as the Crystal-Martel interview range. Even `E-071` differs (reading-literacy on `dev`).
4. **`D-020…D-028` and `E-073…E-092`** exist only on `feat/exam-integration`, **but** their internal evidence cross-references belong to the forked register above, so they can't be pasted blind either.
5. **`E-073` now collides too (added 2026-07-28).** Item 4 originally read "forward-port without ID collisions (they're unused on `dev`)". That is no longer true. `dev`'s register ended at `E-072`, so the psychometric sweep took the next free ID and registered `E-073` = the born-synthetic learning-rate power result (`docs/PSYCHOMETRIC_SWEEP_2026-07-28.md`). `feat/exam-integration`'s `E-073` is an unrelated entry about correct-key position balance and pseudo-guessing floors across the generated banks. Two different facts now share one ID across the two lineages. This is the second time an ID was consumed on `dev` while a Gen-B entry already held it — the same way `D-019` and `E-072` collided — and it will keep happening on every night of work until the registers are reconciled, because the two lineages allocate from the same counter without seeing each other.

## Proposed reconciliation (NEEDS RATIFICATION — do not apply blindly)
1. **Keep `dev` canonical** for the two collisions: `dev`'s `D-019` (Lambda) and `E-072` (Lambda constraint) stay as-is because they're already merged.
2. **Renumber the Gen-B collisions on merge:** `feat/exam-integration` `D-019` → `D-029`; its `E-072` and its `E-073` both need new IDs, since `dev` now holds both. Forward-porting `E-073…E-092` therefore shifts by one and can no longer be a straight copy. Update every in-branch reference to the old IDs.
2a. **Stop the recurrence, not just this instance.** Renumbering after the fact is the expensive half. The cheap fix is to reserve disjoint ranges per lineage (or require any new entry to be allocated against the union of both registers) so that a night of research cannot silently consume an ID Gen-B already uses. Until that is decided, assume every `E-0xx` added on `dev` above `E-072` is a probable collision.
3. **Transcribe `D-015` + `D-016` into `dev`** (verbatim below), then **re-point their evidence citations** (`E-071–E-077`) to whatever the canonical `dev` register decides those entries are — this is the step that is *not* mechanical.
4. **Forward-port `D-020…D-028` and `E-073…E-092`** from `feat/exam-integration`, fixing cross-refs to the reconciled numbering.
5. Record the whole reconciliation as a new decision (e.g. `D-030 — Reconcile the forked exam governance registers`) so the history is auditable (R3).

## Verbatim `D-015` (from `feat/adaptive-exam-app:docs/governance/DECISION_LOG.md`)
Reproduced exactly for transcription; **do not** copy the `E-071–E-077` citation without re-pointing it (see step 3).

```markdown
### D-015 — Reframe the selection target to Timeback-fit (giftedness core) and adopt a scalable, tunable, GT-validated screener

- **Date:** 2026-07-24
- **Status:** Approved
- **Decision:** Reframe the selection target from "identify giftedness" to "identify applicants who are gifted *and* able to thrive and accelerate on the Timeback platform," with giftedness a necessary but not sufficient component. Adopt a scalable, tunable, GT-validated screener as a first-class deliverable (new R11) and reframe R5 to a capability-and-fit standard. Retain the counterfactual/lottery design (R2; D-010) unchanged as the program-effect evaluation arm — the screener defines the capable/fit pool, the lottery measures program effect. Record GT's current operational anchors — the multi-path admission rubric (high CogAT; or two MAP screeners above the 95th percentile; or a blended CogAT+MAP aggregate above the 90th percentile; or a 99th-percentile composite waiver) and the 85th-percentile fall MAP reading gate with an ESL/exceptional-cognitive exception — as documented validation references, not a locked cut. The screener must run algorithmically at applicant volumes in the thousands (GT Anywhere at scale), with a human shadow-day retained for behavioral fit. North-star context: the "MIT-ready by 8th grade, ~100,000 students" leadership goal (expansion-dependent; current cohorts ~40-46 physical + ~300 virtual).
- **Requirements served:** R1, R5, R8, R11; complements R2–R4, R6, R7, R9, R10; H1, H4, H10
- **Alternatives considered:** Keep the giftedness-only target; target Timeback-fit only (dropping giftedness); keep the charter counterfactual-only and treat the screener as "not predetermined."
- **Evidence:** E-071–E-077 (GT admissions-director interview, Crystal Martel, 2026-07-23, Otter transcripts pt.1/pt.2)
- **Rationale:** The GT admissions director specified that the platform serves a specific learner profile: some gifted students do not thrive on Timeback (twice-exceptional, ESL, heavy-repetition needs, non-academic prodigies), while some students who are not conventionally "gifted" accelerate on it. Optimizing the screener for platform fit (with giftedness necessary) matches what GT actually selects for and what its data can validate, while the retained counterfactual keeps program-effect claims honest and non-circular (R4, R10).
- **Consequences:** `PROJECT_CHARTER.md` (mission, goals, non-goals) and `docs/product/project-requirements.md` (core success, R5, new R11, non-requirements) are updated. Deferred, tracked follow-ups (not this pass): reframing the two brainlifts toward the Timeback-fit target (counterfactual brainlift 10K→100K figure and a forward note; reconciling the assessment-quality brainlift's Insight 14 "never a will-benefit prediction" — proposed to the author, not rewritten); designing the GT-data validation study (new-test vs CogAT/MAP overlap; Timeback-acceleration criterion); re-orienting the question-type catalog toward the Timeback-fit / learning-rate construct. Tracked as RES-012 and RES-013. Does not supersede D-008 (Track A/B), D-010 (two-stage evaluation), D-012 (platform), or D-014 (personas/journey).
- **Owner:** Team lead
- **Relationship to prior decisions:** Refines the charter mission and R5; retains D-008's Track A/Track B and D-010's evaluation design; does not change platform (D-012) or MVP persona/journey (D-014) decisions.
```

## Verbatim `D-016` (from `feat/adaptive-exam-app:docs/governance/DECISION_LOG.md`)
Note this entry already names `packages/cat-engine` — i.e. it anticipates the Gen-A scoring package, which is a point in favor of adopting Gen A as the spine.

```markdown
### D-016 — Build the R11 screener as a born-synthetic adaptive test sub-application

- **Date:** 2026-07-24
- **Status:** Approved
- **Decision:** Build the R11 screening instrument as a bounded, born-synthetic adaptive test sub-application inside the existing pnpm monorepo (Mode A per D-011), on the runnable local Supabase/PostgreSQL stack (D-012 keeps this code runnable until the AWS binding migration). Scope: (1) an item bank of interactive question types drawn from the `research/exam-question-types` catalog, each item carrying versioned IRT parameters; (2) an in-stack TypeScript IRT/CAT engine (`packages/cat-engine`) that estimates per-domain ability (theta), selects each next item by maximizing item information, applies an engagement gate and consistency weighting, and stops on a target standard error or item cap with exposure control; (3) private `app.*` tables + `api.*` `SECURITY DEFINER` RPCs + forced RLS for participants, sessions, item responses, raw telemetry events, and derived per-domain metrics, exposed only through RPCs and generated `api` types; (4) a Next.js test-taking surface that embeds the existing self-contained demos through a `postMessage` telemetry contract and drives the adaptive loop. All item parameters, stopping rules, and cut scores are versioned synthetic policy (`synthetic_only=true`, `validated=false`), tunable and owned by GT (R11).
- **Reconciliation with D-014:** This instrument is GT's own screening tool — **not** embedded CogAT and **not** a live testing integration. The D-014 external-CogAT handoff and the `api.record_assessment_version` import path are unchanged; CogAT remains GT's trusted signal and a validation anchor (E-074). The screener is a parallel R11 capability whose outputs feed the capability-and-fit decision only after GT-data validation (RES-012). It does not supersede D-014.
- **Requirements served:** R11 (primary), R5, R8; bounded by R7, R9, R10; advances H1, H4, H6, H10; complements R1.
- **Alternatives considered:** Embedded CogAT (rejected in D-014); a separate off-stack FastAPI/Python service (rejected — breaks the RLS/definer-RPC firewall, generated-type discipline, and D-012 portability); a client-only prototype with no backend (rejected — cannot persist metrics server-side or run server-side adaptive selection); deferring the build (rejected — R11/D-015 make the screener a first-class deliverable).
- **Evidence:** D-015 (R11 adoption), E-071/E-075 (GT validation data), `research/exam-question-types/` catalog + `measurements.json`; D-011 (Mode A architecture), D-012 (portable PostgreSQL design). No item parameters are empirically calibrated; initial IRT parameters are assumed/synthetic pending GT data (validated=false).
- **Consequences:** Remains born-synthetic per D-006/D-011/D-013 — no live child data, no production deployment, loopback-only, no service-role/elevated key in app runtime. The "production-oriented" build follows the repo's production-shaped RLS/definer-RPC/immutable-versioning design, portable to the D-012 AWS target; per-app containerization/Terraform is not added now. Pseudonymous test-takers use a proctor/admin-authenticated session-token pattern with no PII (participant records store only a synthetic pseudonym code). Adds feature IDs AX-01–AX-06 and traceability work item TECH-004; the question-type catalog re-orientation remains RES-013 and the validation study RES-012. Does not supersede D-014 (external CogAT), D-011/D-012 (architecture/platform), or D-006 (synthetic scope).
- **Owner:** Team lead
- **Relationship to prior decisions:** Implements R11/D-015; extends D-011's Mode A sub-application and D-012's portable PostgreSQL design; reconciles with D-014 without superseding it.
```

## Gen-B decision titles to forward-port (`feat/exam-integration`, verbatim titles)
For your convenience; full bodies are on the branch. The `D-019` here is the **colliding** one (→ renumber per step 2).
- `D-019` — One source of truth for screener selection and scoring: the database stores, the TypeScript packages decide  *(COLLIDES with dev's Lambda D-019 → renumber)*
- `D-020` — Reconcile the question banks with the canonical item contract; lure taxonomy becomes two fields
- `D-021` — `demoPath` is a required bank field and an optional contract field
- `D-022` — Split the screener's core-metric registry into per-item observed and trace-derived metrics
- `D-023` — Replace the screener's fixed difficulty step with a reversal-indexed decaying step schedule
- `D-024` — Offer a difficulty-adjusted ability statistic as an alternative bracket driver; the accuracy default is unchanged
- `D-025` — Price the screener's age-band item preference in scale points instead of letting it override difficulty targeting
- `D-026` — Served bank items are registered into the database on demand, and the two per-item verdicts are both recorded
- `D-027` — The database is the single authority on per-item correctness: the per-type verifiers are ported to plpgsql
- `D-028` — The child-facing screener hides the per-child telemetry panel; `?telemetry=1` retains it for demonstration

*All content above is born-synthetic (`synthetic_only=true`, `validated=false`); no live data or production authorization is implied.*
