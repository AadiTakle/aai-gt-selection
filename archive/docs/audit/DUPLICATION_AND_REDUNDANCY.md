# Duplication and Redundancy Audit

**Branch audited:** `feat/repo-restructure-audit` @ `0f31334`. **Date:** 2026-07-28.
**Status:** descriptive audit. Recommends owners and guards; ratifies nothing and
changes no code.

**Requirements served:** R7 (auditable and falsifiable — a number restated in five
documents that disagree is not auditable), R8 (feasible under real constraints — a
fix that must land in N places is N times the cost), R10 (state the boundaries of
every conclusion). One dependency finding touches R9 / D-006.

**Scope.** Literal and near-literal code clones, redundant utilities, redundant test
scaffolding, configuration duplication, documentation duplication and contradiction,
and dependency duplication/drift.

**Out of scope.** Duplicated *domain model shapes* (item, served item, response,
session, decision, IRT parameters, metric map). Those are already catalogued in
[`DUPLICATE_MODELS.md`](DUPLICATE_MODELS.md) and are cross-referenced here rather
than re-derived. Also out of scope: recommending a canonical exam stack (see
[`GEN_A_VS_GEN_B.md`](GEN_A_VS_GEN_B.md)) and repository layout (see
[`REPO_RESTRUCTURE_PROPOSAL.md`](REPO_RESTRUCTURE_PROPOSAL.md)).

**Evidence labels.** `[V]` verified by a command reproduced in the appendix,
`[I]` inference from verified facts, `[A]` open assumption.

**Acceptance evidence for this document.** Every quantified claim traces to a
command in §7. Working tree unchanged apart from this file (§7.A).

---

## 0. Executive summary — highest cost first

**1. The same question type means different things in different files, and the
divergence is child-facing.** `apps/web` carries three parallel hand-written
representations of the same eight question types. Of those eight type codes, **seven
have conflicting child-facing blurbs** and **one has a conflicting title and a
completely different task** `[V]`. `SPA-FOLDNET-01` is *Fold-the-Net* ("fold the flat
net into a box and find the opposite face") in the research catalog, in
`bank.ts`, and in `sample-items-two-stage.ts` — and is authored in
`sample-items.ts:185-200` as **"Missing Quarter" ("find the missing part of the
square")**, an unrelated task. The type code is the join key across **seven**
representations of the item catalog (§1.1), so this is not a copywriting nit: a
reader or a future join keyed on `SPA-FOLDNET-01` gets one of two different tasks
depending on which file it lands in. **What breaks if you only fix one copy:**
nothing fails, because nothing asserts the three agree — which is exactly why they
drifted.

**2. `run-recovery.ts` re-implements a normal-variate sampler that it already
imports the package for.** `scripts/persona-sim/run-recovery.ts:361-370` inlines the
Marsaglia polar method, while `packages/cat-engine/src/persona-sim/latent.ts:179`
exports `standardNormals` — and the script already imports six other modules from
that same package `[V]`. The inline copy also discards the second variate, so it
consumes uniforms at a different rate: the two do **not** produce the same stream
from the same seed. For a repo whose determinism claim is R7 / D-019, a second
private RNG consumer is the highest-risk small clone in the tree.

**3. Two seeded-hash functions disagree, a third is a byte-equivalent copy, and the
comment on one of them is wrong.** `cat-engine`'s `hashSeed` (`rng.ts:9`) is
documented as an "FNV-ish string hash" but is not FNV; the real FNV-1a lives 60 lines
away in the same package (`replay.ts:75`) and is byte-equivalent to `item-bank`'s
`hashStringToInt` `[V]`. The same seed string therefore produces **different**
32-bit seeds in `cat-engine` and `item-bank` (`'session-abc:0'` → 4122621782 vs
2645971872) `[V]`. The `mulberry32` copy between the two packages is benign — the
streams are bit-identical over 30,000 draws `[V]` and `cat-engine` is deliberately
dependency-free — but the *hash* half of the pair is not interchangeable, and the
comment says it is.

**4. Four canonical numbers are restated across five to six documents and have
diverged.** `cat-engine`'s test count is **75** in four documents and **179** in one;
the static count is exactly **179** with zero `it.each` sites, so the newer document
is current and four are stale `[V]`. Parked LOC is **5,623** in five documents; nine
source files totalling 1,783 lines were added to `cat-engine` after that figure was
recorded, so the real number is **6,873** `[V]`. Two more (§4). A reader cannot tell
which copy is current from the documents alone.

**5. The 28 demo HTML files are byte-identical copies with no sync mechanism on this
branch — and the sync script exists on 30 other branches.** The byte-identity was
already established by `REPO_RESTRUCTURE_PROPOSAL.md` §1 step 4 / §7.1, which
recommends a hash guard rather than a dedupe; that recommendation stands. The new
finding is the **branch asymmetry**: `scripts/sync-exam-demos.mjs` exists on `dev`
and on at least 30 `feat/*` branches, and has **never** existed on this branch's
history `[V]`. On this branch the 7,974 lines / 555 KB are hand-copied.

**Scale.** 30 findings: **11 harmful, 10 benign, 8 unclear**, plus 1 recorded only as
a cross-reference to `DUPLICATE_MODELS.md`. Total near-duplicate
volume across the TypeScript/Python/mjs tree is **1,372 normalized source lines**
(both sides summed, 6-line minimum window), concentrated almost entirely in
`packages/` and `apps/` `[V]`. That is small in absolute terms — the cost here is
concentrated in *which* things are duplicated, not in how many lines.

**Five things are verifiably NOT duplicated**, against the leads I was given. These
negative results matter as much as the positives and are recorded in §6.

---

## 1. Full findings table

Classification: **harmful** = copies have diverged, or a fix must land in N places;
**benign** = the duplication is the correct architectural choice (usually deliberate
dependency isolation); **unclear** = structurally constrained or judgement-dependent.

### 1.1 Content and data duplication

| # | What | Where | Copies | Class | Cost if only one copy is fixed | Recommendation |
| --- | --- | --- | ---: | --- | --- | --- |
| D-01 | Question-type title + child-facing blurb | `apps/web/src/lib/exam/bank.ts:39-96`, `sample-items.ts:74-218`, `sample-items-two-stage.ts` (26 entries), `research/exam-question-types/catalog/master_types.jsonl` (66 rows) | 4 | **harmful** | 7 of 8 shared type codes already show 2-3 distinct blurbs; `SPA-FOLDNET-01` shows 2 titles and 2 unrelated tasks. Nothing asserts agreement, so a fix to one surface leaves the others wrong silently. | Make `master_types.jsonl` the owner for `title`; keep short blurbs app-local but add one test asserting `title === catalog.name` for every type code in every web bank. Re-author or rename `sample-items.ts`'s `SPA-FOLDNET-01`. |
| D-02 | One type code represented in up to **7** places | `master_types.jsonl` (66) · `research/.../demos/*.html` (66) · `apps/web/public/exam-demos/*.html` (28) · `bank.ts` (8) · `sample-items.ts` (8) · `sample-items-two-stage.ts` (26) · `items.bank.jsonl` (9 type codes / 257 rows) | 7 | **harmful** | 7 type codes appear in all 7; 1 in 6; 18 in 4. No representation is declared authoritative anywhere in code. | Declare `master_types.jsonl` the catalog authority in one place, and add a coverage test that every web type code exists in it (it does today: 8/8 and 26/26 `[V]`). |
| D-03 | 28 demo HTML files, byte-identical | `apps/web/public/exam-demos/` ↔ `research/exam-question-types/demos/` — 7,974 lines / 555,104 bytes | 2 | **harmful** (latent) | Already established by `REPO_RESTRUCTURE_PROPOSAL.md` §1.4/§7.1. **New:** the sync script that mechanizes this copy (`scripts/sync-exam-demos.mjs`) exists on `dev` and ≥30 `feat/*` branches and has never existed here, so on this branch the copies are hand-maintained with no guard. | Adopt the sibling proposal's hash-assertion guard. Do **not** dedupe (Next.js serves `public/` from disk). |
| D-04 | `measurements.data.json` | `packages/cat-engine/src/measurements.data.json` ↔ `research/exam-question-types/measurements.json` — same git blob `a768bb3d…`, 38,119 bytes each | 2 | **benign** | Cross-reference only: already covered by `REPO_RESTRUCTURE_PROPOSAL.md` §1.4/§7.1. `cat-engine` must stay dependency-free, so vendoring the data is correct. | Same hash guard. No dedupe. |
| D-05 | US state table, 50 rows, byte-identical | `apps/web/src/components/family/school-search.tsx:10-61` ↔ `apps/web/src/lib/family/vocab.ts:55-106` (50 lines each) | 2 | **harmful** (latent) | Identical today `[V]`. Adding DC, PR, or a military code to the family address list would silently leave the school-search filter without it — two lists the same user sees in one flow. | `vocab.ts` owns the raw `[abbr, name]` table; export it and have `school-search.tsx` import it. Mechanical, ~50 lines removed. |
| D-06 | Workflow status enum restated by hand in a test | `apps/web/src/components/family/family-dashboard.test.tsx:7-19` (`ALL_STATUSES`, 12 values) ↔ `packages/contracts/src/workflow.ts:11-24` (`workflowStatusSchema`, 12 values) | 2 | **harmful** | Identical today `[V]`. The test's *purpose* is "renders every status"; adding a 13th status to the contract leaves the test green while the dashboard is unverified for it. This is coverage that silently stops covering. | Use `workflowStatusSchema.options`. The repo already does exactly this at `apps/web/src/lib/exam/sample-items.test.ts:6` (`examDomainSchema.options`) `[V]`, so the pattern is established. One-line change. |
| D-07 | Lure-class enum, byte-identical, 9 values | `apps/web/src/lib/exam/item.ts:36-46` ↔ `packages/item-bank/src/enums.ts:41-51` | 2 | — | **Cross-reference only.** Fully covered by `DUPLICATE_MODELS.md` §3 (owner: `item-bank`). Not re-derived. | Per `DUPLICATE_MODELS.md` §9. |

### 1.2 Redundant utilities

| # | What | Where | Copies | Class | Cost if only one copy is fixed | Recommendation |
| --- | --- | --- | ---: | --- | --- | --- |
| D-08 | `mulberry32` PRNG | `packages/cat-engine/src/rng.ts:19-27` (10 lines) · `packages/item-bank/src/rng.ts:14-23` (10 lines) | 2 | **benign** | Streams are **bit-identical** across 6 seeds × 5,000 draws `[V]`; the only textual difference is a redundant `a \|= 0` in the item-bank copy. `cat-engine` documents a hard zero-dependency constraint (`types.ts:1-15`), so a 10-line reimplementation is the correct choice, not a defect. | Keep both. Optionally add a cross-package equality test, in the same spirit as the domain-enum drift test proposed in `DUPLICATE_MODELS.md` §1. |
| D-09 | Seeded string hash — **three implementations, two algorithms, one wrong comment** | `cat-engine/src/rng.ts:9-16` (`hashSeed`) · `cat-engine/src/replay.ts:75-82` (`fnv1a`, private) · `item-bank/src/rng.ts:4-11` (`hashStringToInt`) | 3 | **harmful** | `hashSeed` is labelled "FNV-ish" but is a MurmurHash-style mix; the real FNV-1a is `replay.ts:75`, which is byte-equivalent to `item-bank`'s copy `[V]`. So `cat-engine` carries **two** hashes internally (the redundancy that the zero-dependency constraint does *not* excuse), and the same seed string yields different seeds across packages `[V]`. Anyone who reads the comment and assumes seed-compatibility gets a silently different stream. | Two separate fixes: (a) correct the `rng.ts:8` comment — it is a factual error, not a style issue; (b) have `replay.ts` reuse a single in-package hash instead of a private third one. Neither crosses a package boundary. |
| D-10 | Standard-normal sampler (Marsaglia polar) | `packages/cat-engine/src/persona-sim/latent.ts:179-195` (`standardNormals`, **exported**) · `scripts/persona-sim/run-recovery.ts:361-370` (inline `normal()` closure) | 2 | **harmful** | `run-recovery.ts:8-26` already imports six modules from `cat-engine` by path, including `rng` and `persona-sim/index` (which re-exports `standardNormals`) `[V]`. The clone is gratuitous. It also drops the second variate, so it draws 2 uniforms per normal where the package amortizes — same distribution, **different stream from the same seed**. | Import `standardNormals`. Note the seed streams will change, so any recorded fixture output must be regenerated deliberately, not silently. |
| D-11 | `clamp(x, lo, hi)` | `cat-engine/src/persona-sim/latent.ts:332-334` · `cat-engine/src/psychometric-lab/learning-curve.ts:158-160` (identical 3-line bodies), plus 14 inline `Math.max(lo, Math.min(hi, x))` expressions across 8 files `[V]` | 2 + 14 inline | **benign** | A 3-line pure helper. Consolidating buys almost nothing and adds an import edge inside a package that is deliberately flat. | Leave it. If touched anyway, one private `clamp` in `cat-engine` would remove 3 lines. |
| D-12 | Descriptive statistics across **languages** (mean, SD, Pearson, Spearman, rank, quantile) | `scripts/persona-sim/stats.ts:10-80` (TypeScript) · `scripts/validation-harness/harness/psychometrics.py:40-341` (Python) | 2 | **benign** | Deliberate and documented at `stats.ts:1-8`: the Node runner writes a CSV that the Python harness consumes, and the harness "is the authority for the psychometric analyses". **Verified numerically agreeing:** `sd` vs `stdev` differ by 0.0 (both ddof=1); `percentileOf` vs `quantile` agree to 1.8e-15 across p ∈ {0,5,25,50,75,95,100} `[V]`. | Keep. This is the model case of correct duplication: isolated, declared, and numerically checked. |
| D-13 | Standard normal CDF | `cat-engine/src/scoring.ts:11-19` (Abramowitz & Stegun 7.1.26) · `psychometrics.py:227-228` (`math.erf`) | 2 | **benign** | Different algorithms, but they agree: **max absolute CDF difference 7.406e-8** over θ ∈ [-4, 4], i.e. **7.4e-6 percentile points** — four decimal places of agreement on any reported percentile `[V]`. TypeScript has no `erf`, so the polynomial is the correct choice there. | Keep. Worth recording the measured 7.4e-8 bound somewhere durable so nobody re-litigates it. |
| D-14 | Pearson correlation | `scripts/persona-sim/stats.ts:35-50` · `psychometrics.py:291-303` · `cat-engine/src/persona-sim/latent.test.ts:30-47` (inline in a test) | 3 | **unclear** | The TS/Python pair is D-12 (benign). The third copy is an 18-line reimplementation inside a `cat-engine` test. `cat-engine` cannot import from `scripts/`, so the test cannot reuse `stats.ts` — the isolation is real, but a test-local statistic that nothing verifies is a place a subtle bug hides unnoticed. | Low priority. If `cat-engine` ever gains a test-utils module, move it there. |
| D-15 | Percentile — three different meanings under similar names | `cat-engine/src/scoring.ts:22` (`thetaToPercentile`, normal-reference) · `stats.ts:72` (`percentileOf(xs, p)` → a **value**) · `psychometrics.py:73` (`quantile`) and `:94` (`percentile_of(x, value)` → a **percentile**) | 3-4 | **unclear** | Not redundant implementations — **redundant names**. TS `percentileOf(xs, p)` is Python `quantile(x, q)`; Python `percentile_of(x, value)` is the inverse and has no TS twin `[V]`. A reader porting logic between the two will invert a percentile. | Rename, do not merge: TS `percentileOf` → `quantileOf`. Documentation-level fix with a real correctness payoff. |
| D-16 | Variance convention split | `cat-engine/src/scoring.ts:53` and `rte.ts:58` divide by **n**; `stats.ts:13-17` and `psychometrics.py:47` divide by **n-1** | 2 conventions | **unclear** | On one 6-element RT vector the two SDs are 1351.13 vs 1480.09 — a **9.5% difference** `[V]`. Both are defensible (a coefficient of variation conventionally uses the population form), but neither site says which it is or why. | Do not change the math without a psychometric decision. Do add a one-line comment at `scoring.ts:53` stating the population convention is intentional. |

### 1.3 Redundant test scaffolding

| # | What | Where | Copies | Class | Cost if only one copy is fixed | Recommendation |
| --- | --- | --- | ---: | --- | --- | --- |
| D-17 | Fixture literals re-declared in `contracts` tests although a fixtures package exists | `packages/contracts/src/*.test.ts` ↔ `packages/test-fixtures/src/index.ts` — **283 cloned lines** on the contracts side across 7 test files (`onboarding-contract` 68, `contracts` 67, `review-pending` 44, `review-transition` 38, `correction-contract` 32, `snapshot-contract` 20, `replay-contract` 34) `[V]` | 8 | **unclear** | Structurally forced: `test-fixtures` depends on `contracts` (`test-fixtures/package.json`), so `contracts` importing back would be circular `[V]`. The blocks I diffed are byte-identical modulo indentation `[V]` — currently in sync, with no guard. This is the largest single clone volume in the repo and the one with the strongest excuse. | Do not invert the dependency. Either (a) accept it and add a conformance test in `test-fixtures` asserting its fixtures still parse against the schemas the contracts tests exercise, or (b) extract the literals into a leaf package that both depend on. (a) is far cheaper. |
| D-18 | Duplicated intra-package test scaffolding | `packages/contracts/src/contracts.test.ts` ↔ `onboarding-contract.test.ts` — 41 cloned lines each `[V]` | 2 | **harmful** (small) | Same package, so nothing prevents a shared local helper. Two copies of the same draft literal must be updated together when a schema field changes. | One `describe`-local builder or a `__fixtures__.ts` inside `packages/contracts/src`. |
| D-19 | `POLICY` + `buildItems()` + `buildLog()` test scaffolding | `packages/cat-engine/src/lambda/handler.test.ts:11-65` ↔ `packages/cat-engine/src/replay.test.ts:9-64` — lines 1-60 differ **only** in the import block and one comment `[V]`; 29 cloned lines each | 2 | **harmful** (small) | Same package, no constraint. A change to `ItemParameters` or `ScoringPolicy` must be mirrored in both, and `buildItems()` is byte-identical (16 lines). | Extract to `packages/cat-engine/src/test-support.ts`. ~45 lines removed, single package, no dependency change. |
| D-20 | Third `buildParams()` variant | `packages/cat-engine/src/result.test.ts:18-32` | 1 of 3 | **benign** | Deliberately different: 2 domains × 4 items with no `answerKey`, versus D-19's 4 × 3 with one. It is a distinct scenario, not a stale copy. | Leave. Do not fold into D-19's shared helper. |
| D-21 | `StatusProjection` literals repeated in a dev-preview component | `apps/web/src/components/family/preview-dashboard.tsx:20-51` — three 9-field literals; 22 lines overlap `test-fixtures/src/index.ts` `[V]` | 3 + fixtures | **benign** | The three literals hold *different* status values; they are the component's own state table, not stale fixture copies. Importing a test-fixtures package into a rendered component would be strictly worse (see D-29). | Leave. |
| D-22 | Onboarding integration-test setup | `apps/web/src/lib/onboarding/actions.integration.test.ts` ↔ `local-synthetic-adapter.integration.test.ts` — 12/18 cloned lines `[V]` | 2 | **unclear** | Small, and both already import from `@gt-selection/test-fixtures`, so the fixture data itself is shared; only the harness wiring repeats. | Low priority. |
| D-23 | Wizard-state builder | `apps/web/src/lib/family/draft-mapper.test.ts:69-77` ↔ `progress.test.ts:87-95` — 9 lines each `[V]` | 2 | **benign** | 9 lines, same directory, two tests of adjacent modules. Below the threshold where a shared helper pays for itself. | Leave. |

### 1.4 Configuration duplication

| # | What | Where | Copies | Class | Cost if only one copy is fixed | Recommendation |
| --- | --- | --- | ---: | --- | --- | --- |
| D-24 | Identical `package.json` script block | `"lint": "eslint src"`, `"test": "vitest run"`, `"test:coverage": "vitest run --coverage"`, `"typecheck": "tsc -p tsconfig.json"` across `packages/cat-engine`, `contracts`, `test-fixtures` (all four keys) and `item-bank`, `db-types` (partial) | 5 | **unclear** | pnpm has no script inheritance, so some repetition is unavoidable. But the copies have **already diverged in two consequential ways** — see D-25 and D-26. | Leave the shape; close the two divergences. |
| D-25 | Diverged copy: `item-bank` has no `test:coverage` and no `@vitest/coverage-v8` | `packages/item-bank/package.json` vs the other three test packages | 1 of 4 | **harmful** | Root `test:coverage` uses `pnpm -r --if-present`, so `item-bank` is **silently skipped** from coverage — no error, no warning. It is the package holding the answer-key/leak assertions (`data-files.test.ts`), i.e. the one where a coverage gap matters most. | Add the script and the dev dependency, or state in the root script why `item-bank` is excluded. Either is fine; silence is not. |
| D-26 | Diverged copy: `db-types` lints one file, not the directory | `packages/db-types/package.json` → `"lint": "eslint src/index.ts"` vs `"eslint src"` elsewhere | 1 of 5 | **unclear** | The narrowing is presumably to skip `src/database.generated.ts` — but that file is **already** in the root `eslint.config.mjs` ignores and `.prettierignore` `[V]`. The side effect is that the hand-written `src/exam.ts` (~200 lines) is never linted. | Change to `eslint src`; the generated file is already ignored by config. Verify before merging. |
| D-27 | `tsconfig.json` bodies | `packages/{cat-engine,contracts,db-types,test-fixtures}/tsconfig.json` — same `extends` + `rootDir: src` + `include` | 4 | **benign** | Each is 6 lines and correctly extends `tsconfig.base.json`; all 15 real compiler options live in the base once. This is idiomatic, not duplication. | Leave. Noting it only to record that the config tree is genuinely clean. |
| D-28 | Vitest config overlap | `apps/web/vitest.config.ts` (22 lines) ↔ `vitest.integration.config.ts` (20 lines) — ~14 shared lines `[V]` | 2 | **benign** | They deliberately differ on `environment` (jsdom vs node), `include`/`exclude`, plugins, and the `next/headers` alias. Extracting a base would obscure exactly the differences a reader needs. | Leave. |

### 1.5 Dependency duplication and drift

| # | What | Where | Copies | Class | Cost if only one copy is fixed | Recommendation |
| --- | --- | --- | ---: | --- | --- | --- |
| D-29 | `@gt-selection/test-fixtures` declared as a **runtime** dependency but used only by tests | `apps/web/package.json` `dependencies` ↔ imported only from `*.test.ts` / `*.integration.test.ts` `[V]` | — | **harmful** (small) | Puts a package of synthetic applicant-shaped fixture data (names, addresses, income, discipline disclosures) into the production dependency graph. Nothing imports it from a rendered component today, so no leak exists — but the declaration is what a bundler and a future reviewer read. Touches R9 / D-006 posture. | Move to `devDependencies`. One-line change; verify `pnpm --filter @gt-selection/web test` still resolves it. |
| D-30 | `@gt-selection/item-bank` declared as a runtime dependency for a type-only + test-only use | `apps/web/package.json` `dependencies`; real uses are `cat-adapter.ts:7` (`import type`) and `cat-adapter.test.ts:3` | — | **unclear** | `cat-scoring.ts:27-28` documents that item-bank is **not** browser-safe because `rng.ts` imports `node:crypto` `[V]` — see D-09. A `dependencies` entry is the one thing standing between that hazard and a value import someone adds later. | At minimum, keep the type-only discipline enforced by something stronger than a comment; `REPO_RESTRUCTURE_PROPOSAL.md` §1.5 makes the same point about `boundaries:check`. |

**Version drift: none found.** Every third-party dependency declared in more than one
workspace manifest is pinned to an **identical exact version** `[V]`: `typescript`
5.9.3 (7 manifests), `vitest` 4.1.10 (6), `@vitest/coverage-v8` 4.1.10 (4), `zod`
4.4.3 (3), `@types/node` 24.13.3 (2), `tsx` 4.23.1 (2), `@supabase/supabase-js`
2.110.7 (2). **Zero** packages differ in version across manifests. Details and the
transitive picture in §5.

**No unused declared dependencies.** Every entry in every manifest resolves to at
least one real import `[V]`. The two findings above are *misplacement*
(`dependencies` vs `devDependencies`), not absence of use.

---

## 2. Diverged duplicates, with diffs

### 2.1 One type code, two different tasks — `SPA-FOLDNET-01`

Three files and the research catalog carry the same eight type codes. `sample-items.ts`
uses `SPA-FOLDNET-01` for an unrelated task:

```
research catalog (master_types.jsonl, the research-tree authority)
  name       'Fold-the-Net'
  one_liner  'The child folds a flat net up into a 3D box and works out which
              face ends up opposite a marked face.'

apps/web/src/lib/exam/bank.ts:62-67
  title      'Fold-the-Net'
  blurb      'Fold the flat net into a box and find the opposite face.'

apps/web/src/lib/exam/sample-items-two-stage.ts
  title      'Fold-the-Net'
  blurb      'Fold the flat net into a box and find the opposite face.'

apps/web/src/lib/exam/sample-items.ts:185-200
  title      'Missing Quarter'                              <-- CONFLICT
  blurb      'Find the missing part of the square.'          <-- CONFLICT
  prompt     'A square is split into four equal quarters. Three are filled and
              the top-right quarter is empty. Which quarter is missing?'
```

**Which is current?** The catalog and the two demo-backed banks agree, and the
`/exam-demos/SPA-FOLDNET-01.html` runtime that ships is a net-folding task `[V]`.
**`sample-items.ts` is the outlier.** It is a hand-authored single-select placeholder
bank whose own header says its "type codes merely reference the catalog"
(`sample-items.ts:11-12`) — so the divergence is arguably licensed by that comment,
but the comment does not license *contradicting* the catalog's task under the same
code. Classified harmful because the type code is the join key across seven
representations (D-02).

### 2.2 Same item, three different child-facing blurbs

All eight shared type codes, blurb only. `[V]`

| Type code | `bank.ts` | `sample-items.ts` | `sample-items-two-stage.ts` | Distinct |
| --- | --- | --- | --- | ---: |
| `FLU-MATRIX-01` | …completes the pattern. | Find the shape that completes the pattern. | …completes the pattern **grid**. | **3** |
| `SPA-ROLL-01` | Track **a** cube as it tips **along a path**. | Track **the** cube as it tips **over**. | Track the cube as it tips **and find the top face**. | **3** |
| `VER-RELPAIR-01` | Find **the pair of words** that relate the same way. | Find **the pair** that relates the same way. | Find **the second pair** that relates the same way. | **3** |
| `FLU-ANALOGY-01` | Make **the third shape** change the same way as the first pair. | Make **the second pair** change the same way as the first. | (= `bank.ts`) | 2 |
| `QUANT-FUNC-01` | …what the machine makes **next**. | …what the machine makes. | (= `bank.ts`) | 2 |
| `QUANT-SERIES-01` | …continues the **stepping** pattern. | …continues the **number** pattern. | (= `bank.ts`) | 2 |
| `SPA-FOLDNET-01` | Fold the flat net into a box… | Find the missing part of the square. | (= `bank.ts`) | 2 |
| `VER-CLOZE-01` | Choose the word that best completes the sentence. | (identical) | (identical) | 1 |

**Which is current?** `sample-items-two-stage.ts` `[I]` — it is the newest surface
(the two-stage demo), and where it differs from `bank.ts` it is strictly more
specific ("pattern grid", "find the top face", "the second pair"). `sample-items.ts`
is the oldest and the shortest. No test or document declares an owner.

### 2.3 A code comment that contradicts the code — `bank.ts:9`

```
apps/web/src/lib/exam/bank.ts:9
  * Titles/one-liners are from the catalog's `master_types.jsonl`.
```

Measured against `research/exam-question-types/catalog/master_types.jsonl` `[V]`:

```
titles matching catalog.name       : 8/8   <- claim holds
blurbs matching catalog.one_liner  : 0/8   <- claim does not hold
```

The blurbs are deliberate child-facing rewrites (the catalog `one_liner` for
`SPA-ROLL-01` is 137 characters; `bank.ts`'s blurb is 38). The rewriting is
reasonable; the comment asserting provenance it does not have is not.
**Current behaviour: titles are catalog-sourced, blurbs are locally authored.**

### 2.4 Three hashes, two algorithms, one wrong label

```
packages/cat-engine/src/rng.ts:8
  /** FNV-ish string hash -> 32-bit unsigned int seed. */
  h = 1779033703 ^ seed.length            <- MurmurHash-style mix, NOT FNV
  h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)

packages/cat-engine/src/replay.ts:75      <- the actual FNV-1a, private
  h = seed >>> 0
  h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193)

packages/item-bank/src/rng.ts:4           <- the same FNV-1a, exported
  h = 0x811c9dc5
  h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193)
```

Measured `[V]`:

```
[2] same input string -> different 32-bit seeds
      "session-abc:0"    hashSeed=4122621782  hashStringToInt=2645971872  match=false
      "FLU-MATRIX-01"    hashSeed=2978615820  hashStringToInt=2521573084  match=false
      "seed"             hashSeed=1693061719  hashStringToInt=1346747564  match=false
      ""                 hashSeed=1779033703  hashStringToInt=2166136261  match=false
[3] replay.ts fnv1a(s, 0x811c9dc5) vs item-bank hashStringToInt(s)
      -> IDENTICAL (same algorithm, same constants)
```

**Current behaviour:** `cat-engine` seeds its own randomness with `hashSeed` and
fingerprints results with `fnv1a`; `item-bank` seeds item generation with
`hashStringToInt`. The two packages' "same seed" is not the same seed. Nothing in
the tree depends on cross-package seed compatibility today `[V]`, so this is
**latent** — but the misleading comment makes it a trap rather than a limitation.

### 2.5 An exported sampler versus its inline twin

```
packages/cat-engine/src/persona-sim/latent.ts:179   (exported, re-exported by
                                                     persona-sim/index.ts)
  export function standardNormals(rand, count) {
    ...
    const factor = Math.sqrt((-2 * Math.log(s)) / s);
    out.push(u * factor);
    if (out.length < count) out.push(v * factor);   <- keeps BOTH variates
  }

scripts/persona-sim/run-recovery.ts:361             (inline closure)
  const normal = () => {
    ...
    return u * Math.sqrt((-2 * Math.log(s)) / s);   <- discards v
  };
```

`run-recovery.ts:8-26` already imports `persona-sim/index`, `irt`, `rng`, `rte`,
`scoring`, and `types` from `cat-engine` by relative path `[V]`. **Current
behaviour: both are statistically valid; the streams differ.** Because the inline
version discards `v`, it consumes two uniforms per normal where the package
consumes roughly one — so replacing it will change every downstream draw for a
given seed. That is a deliberate, reviewable change, not a silent one.

### 2.6 Documentation contradictions

Four numbers are restated across the document set and have diverged. Each row gives
what I could verify statically; the worktree has no `node_modules`, so I could not
run `vitest` to obtain runtime counts (installing would risk mutating the tracked
`pnpm-lock.yaml`, which this audit must not do).

| Claim | Copies | Values | Verified | Current |
| --- | ---: | --- | --- | --- |
| `cat-engine` test count | 5 | **75** in `audit/AUDIT_SUMMARY.md:225`, `audit/GEN_A_VS_GEN_B.md:280`, `audit/REPO_REACHABILITY_MAP.md:257`, `OVERNIGHT_MODEL_RECONCILE_REPORT.md:147` · **179** in `PSYCHOMETRIC_SWEEP_2026-07-28.md:583` | Static count: **179** `it`/`test` declarations across **16** test files, **0** `it.each` sites `[V]` | **179.** Three `psychometric-lab/*.test.ts` files were added 2026-07-28, after the four stale documents were written `[V]`. |
| `apps/web` test count | 3 | **123** / 24 files in `AUDIT_SUMMARY.md:229` and `GEN_A_VS_GEN_B.md:284` · **140** in `PSYCHOMETRIC_SWEEP:583` | Static: **137** declarations across **27** files, plus **3** `it.each` sites `[V]` | **140** is consistent with 137 static + `it.each` expansion `[I]`. The 123/24 figures are stale. |
| Parked (unreachable) LOC | 5 | **5,623** in `REPO_REACHABILITY_MAP.md:134` · **~5,600** in `AUDIT_SUMMARY.md:88`, `GEN_A_VS_GEN_B.md:370`, `REPO_REACHABILITY_MAP.md:345`, `HANDOFF_2026-07-28.md:127` | `cat-engine` grew 14 → **23** source files and 1,186 → **2,968** LOC; nine files totalling **1,783** lines did not exist at the audit commit `0dbf0b5` `[V]`. Current combined `cat-engine` + `item-bank` source: **6,873** LOC `[V]` | **6,873**, i.e. the restated figure understates by ~1,250 lines (+22%). |
| "128 passing tests" for the parked packages | 4 | `AUDIT_SUMMARY.md:19`, `GEN_A_VS_GEN_B.md:370`, `REPO_REACHABILITY_MAP.md:345`, `HANDOFF_2026-07-28.md:127` | 128 = 75 + 53, both inputs now questionable (see rows 1 and below) | Stale. Derived from the superseded 75. |

**One contradiction I could not resolve.** Four documents report **53** tests for
`item-bank`; the static count is **37** `it()` declarations across 5 files, with zero
`it.each` sites, and all five test files are **byte-unchanged** since the audit
commit `0dbf0b5` `[V]`. So the gap is not staleness. Either the runtime count exceeds
static declarations by a mechanism I did not find, or the 53 was wrong when first
recorded and has been copied three times since. Marked `[I]`; resolving it needs one
`pnpm --filter @gt-selection/item-bank test` from an environment with
`node_modules` installed.

**Not a contradiction, though it reads like one.** `GENB_VERIFICATION_2026-07-28.md`
reports **17** lint errors while six other documents report **23**. These describe
different branches (Gen-B vs this lineage) and both say so `[V]`.

**Why these matter more than the code clones.** A duplicated 10-line helper costs an
edit in two places. A number duplicated across five governance documents, three of
which are named in `AGENTS.md`'s reading order, costs a reader their ability to tell
what is true — and the reader has no signal that the copies disagree.

---

## 3. Clone volume, measured

Method: normalize every `.ts` / `.tsx` / `.mjs` / `.py` file (strip comments, collapse
whitespace, drop blank and punctuation-only lines), hash every sliding window of ≥6
normalized lines, and report windows appearing in two or more distinct locations.
Generated files excluded. Script in §7.H; it lives in `/tmp` and is not committed.

```
files scanned                                        256
cloned file pairs (window >= 6 normalized lines)      47
total cloned normalized source lines (both sides)   1372
clone groups (window >= 8)                            68
clone groups (window >= 16)                            5
```

Top pairs by cloned volume `[V]`:

| Cloned lines (A+B) | A | B | Finding |
| ---: | --- | --- | --- |
| 136 | `contracts/src/onboarding-contract.test.ts` (68) | `test-fixtures/src/index.ts` (68) | D-17 |
| 134 | `contracts/src/contracts.test.ts` (67) | `test-fixtures/src/index.ts` (67) | D-17 |
| 100 | `apps/web/.../family/school-search.tsx` (50) | `apps/web/src/lib/family/vocab.ts` (50) | D-05 |
| 88 | `contracts/src/review-pending.test.ts` (44) | `test-fixtures/src/index.ts` (44) | D-17 |
| 82 | `contracts/src/contracts.test.ts` (41) | `contracts/src/onboarding-contract.test.ts` (41) | D-18 |
| 70 | `contracts/src/review-transition.test.ts` (38) | `test-fixtures/src/index.ts` (32) | D-17 |
| 64 | `contracts/src/correction-contract.test.ts` (32) | `test-fixtures/src/index.ts` (32) | D-17 |
| 58 | `cat-engine/src/lambda/handler.test.ts` (29) | `cat-engine/src/replay.test.ts` (29) | D-19 |
| 54 | `contracts/src/replay-contract.test.ts` (34) | `test-fixtures/src/index.ts` (20) | D-17 |
| 44 | `apps/web/.../family/preview-dashboard.tsx` (22) | `test-fixtures/src/index.ts` (22) | D-21 |
| 24 | `apps/web/.../family-dashboard.test.tsx` (12) | `contracts/src/workflow.ts` (12) | D-06 |
| 24 | `scripts/persona-sim/run-recovery.ts` (12) | `scripts/psychometric-sweep/run-engagement-sweep.ts` (12) | benign; both use `common.ts` |
| 22 | `cat-engine/.../persona-sim/latent.test.ts` (11) | `scripts/persona-sim/stats.ts` (11) | D-14 |
| 20 | `apps/web/src/lib/exam/item.ts` (10) | `packages/item-bank/src/enums.ts` (10) | D-07 (`DUPLICATE_MODELS.md` §3) |

**Read this table carefully before acting on it.** The two largest entries are the
*least* actionable (D-17 is blocked by a dependency cycle), and the smallest entry in
the list (D-06, 12 lines) is one of the most actionable. Clone volume and clone cost
are close to uncorrelated in this repo.

Note also what the 6-line minimum cannot see: D-10's Box-Muller clone is 8 source
lines but only ~5 after normalization, so the scanner missed it entirely and I found
it by reading. Treat the scan as a floor.

---

## 4. Dependency duplication and drift

### 4.1 Direct dependencies — no version drift

Across the 7 workspace manifests, **7** third-party packages are declared in more
than one manifest and **0** are declared at differing versions `[V]`:

| Package | Version | Manifests |
| --- | --- | ---: |
| `typescript` | 5.9.3 | 7 |
| `vitest` | 4.1.10 | 6 |
| `@vitest/coverage-v8` | 4.1.10 | 4 |
| `zod` | 4.4.3 | 3 |
| `@types/node` | 24.13.3 | 2 |
| `tsx` | 4.23.1 | 2 |
| `@supabase/supabase-js` | 2.110.7 | 2 |

This is a genuinely good result and worth stating plainly: the manifests are
hand-pinned to exact versions and they all agree today. The residual risk is that
agreement is maintained by discipline, not by tooling — `pnpm-workspace.yaml`
contains only a `packages:` list, with no `catalog:` and no `pnpm.overrides` `[V]`,
so a `typescript` bump has to be applied in seven files by hand. pnpm 10.34 (the
pinned `packageManager`) supports workspace catalogs. **Recommendation:** move the
five tool versions to a `catalog:` in `pnpm-workspace.yaml`. Low risk, removes seven
hand-synced pins. Not urgent — nothing is broken.

### 4.2 Transitive duplication — benign

19 of 345 resolved packages appear at more than one version in `pnpm-lock.yaml`
`[V]`, the worst being `eslint-visitor-keys` at three (3.4.3, 4.2.1, 5.0.1), plus 18
at two (`globals`, `minimatch`, `semver`, `postcss`, `debug`, `ignore`, …). Every one
is a nested dependency of a tool, not of application code. This is ordinary npm
ecosystem behaviour and pnpm's isolated store handles it. **No action.**

### 4.3 Declaration defects

- **`@gt-selection/test-fixtures` is in `apps/web` `dependencies` but is imported
  only from test files** `[V]` — D-29. Move to `devDependencies`.
- **`@gt-selection/item-bank` is in `dependencies` for a type-only and test-only
  use** `[V]` — D-30. Its `rng.ts` imports `node:crypto`, which
  `cat-scoring.ts:27-28` documents as making the package unsafe to bundle for the
  browser. The type-only discipline is currently enforced by a comment.
- **No declared dependency is unused.** Every entry resolves to a real import,
  including `@gt-selection/db-types` (5 importers in `apps/web/src`) and root
  `@supabase/supabase-js` (`scripts/create-local-auth-users.ts:1`) `[V]`.

---

## 5. Recommended sequence

Ordered by cost-to-benefit, not by severity. Every item is independent of the
Gen-A/Gen-B decision unless noted.

**Free — documentation only, no behaviour change**

1. **Correct the four diverged numbers** (§2.6). Either update all copies or, better,
   have the four stale documents point at the one that is measured. Highest value in
   this list: three of the affected files are in `AGENTS.md`'s required reading order.
2. **Fix the `bank.ts:9` comment** (§2.3) — titles are catalog-sourced, blurbs are not.
3. **Fix the `rng.ts:8` comment** (§2.4) — it is not an FNV hash.
4. **Comment the variance convention** at `cat-engine/src/scoring.ts:53` (D-16).

**Cheap and mechanical — single package, obvious verification**

5. **`workflowStatusSchema.options`** in `family-dashboard.test.tsx` (D-06). One line;
   the pattern already exists at `sample-items.test.ts:6`.
6. **Move `test-fixtures` to `devDependencies`** in `apps/web` (D-29).
7. **Give `item-bank` a `test:coverage` script**, or document why it has none (D-25).
8. **`db-types` lint scope** → `eslint src` (D-26). Verify the generated file is still
   skipped by the root ignore before merging.
9. **Import `standardNormals`** in `run-recovery.ts` (D-10). Note that seed streams
   change; regenerate any recorded output deliberately.
10. **Extract `cat-engine`'s duplicated test scaffolding** to `test-support.ts` (D-19).
    ~45 lines, one package.
11. **Export the state table from `vocab.ts`** and import it in `school-search.tsx`
    (D-05). ~50 lines removed.

**Guards rather than dedupes — buys the benefit at a fraction of the cost**

12. **Hash assertions for the two `research/` → production copies** (D-03, D-04).
    This is `REPO_RESTRUCTURE_PROPOSAL.md` §1.4 step 3; endorsed here, not re-argued.
13. **A conformance test in `test-fixtures`** covering the schemas the `contracts`
    tests duplicate (D-17), instead of inverting the dependency.
14. **A cross-package `mulberry32` equality test** (D-08), in the same spirit as the
    domain-enum drift test in `DUPLICATE_MODELS.md` §1.

**Needs a decision, not a refactor**

15. **`SPA-FOLDNET-01` in `sample-items.ts`** (§2.1). Re-author the item to match the
    catalog, or give it a type code that does not already mean something else. This
    is a content decision; do not let an agent pick.
16. **Declare one owner for question-type titles and blurbs** (D-01, D-02). Seven
    representations with no declared authority is the underlying condition; the
    divergences are the symptom.
17. **`pnpm-workspace.yaml` catalog** for the five hand-synced tool versions (§4.1).

**Explicitly recommended against**

- Deduping the 28 demo HTML files or `measurements.data.json` (`REPO_RESTRUCTURE_PROPOSAL.md` §7.1).
- Consolidating `clamp` (D-11), the vitest configs (D-28), or the tsconfig bodies (D-27).
- Inverting `contracts` ↔ `test-fixtures` (D-17).
- Merging the TS and Python statistics modules (D-12) — they are correct as they are,
  and now measured to agree.

---

## 6. Verified negative results

Four of the leads I was asked to check turned out to be clean. Recording them so
nobody re-investigates.

**1. Effort / rapid-guess filtering is implemented exactly once.** `cat-engine/src/rte.ts`
holds `isRapidGuess`, `isEffortValid`, `responseTimeEffort`, `filterEffortful`, and
`normativeThreshold`. `apps/web` contains **no** second implementation: every
non-test occurrence of `rapidGuess` / `effortValid` / `onTask` in `apps/web/src` is
either passing a threshold into the engine or filtering on the flag the engine
returned `[V]`. `apps/web/src/lib/exam/cat-scoring.ts:1-9` calls
`@gt-selection/cat-engine` directly and documents why the value import lives there.

**2. `apps/web` scoring does not duplicate `cat-engine` scoring.** `apps/web/src/lib/exam/scoring.ts`
is 38 lines that compare a selected index against `answer.correctIndex` for
`single-select` items. `cat-engine/src/item-scoring.ts` is 130 lines of normalized
scoring, IRT theta, and the effort gate. Different concerns, no overlap `[V]`. (The
*model shapes* they operate on do diverge — that is `DUPLICATE_MODELS.md` §7, not
this document.)

**3. Item selection is not duplicated between the web sequencers.**
`two-stage-sequencer.ts:2` imports and implements the `Sequencer` /
`SequencerContext` interface from `sequencer.ts` `[V]`; the scanner finds no clone
above 6 lines between them. `cat-engine/src/psychometric-lab/selection.ts`
(`maxInformationIndex`) is a different algorithm serving the sweep scripts, not a
rival copy.

**4. The sweep scripts already extracted their common code.**
`scripts/psychometric-sweep/common.ts` exists and is imported by all three runners;
the residual clone between them is 6 lines `[V]`.

**5. The research QA scripts contain zero clones.** `research/exam-question-types/qa/`
(`qa.mjs` 395, `probe-flow.mjs` 151, `probe-interact.mjs` 92, `probe-wordladder.mjs`
80 lines) — the scanner reports **0 cloned file pairs** at a 6-line window `[V]`,
despite the near-identical filenames.

---

## 7. Appendix — verbatim command output

Run from the worktree root at `feat/repo-restructure-audit` @ `0f31334`.

### A. Working tree unchanged

```
$ git status --porcelain=v1 -uall
                       <- empty, before docs/audit/DUPLICATION_AND_REDUNDANCY.md was written

$ git log --oneline -2
0f31334 docs(audit): propose a target repo layout structured around the unresolved stack fork
13451c8 merge: GT School brand applied to the two-stage demo surfaces

$ ls -d node_modules
ls: node_modules: No such file or directory
                       <- vitest cannot run in this worktree; no install was performed,
                          because `pnpm install` can rewrite the tracked pnpm-lock.yaml
```

### B. Demo HTML duplication and the missing sync script

```
$ cd apps/web/public/exam-demos && for f in *.html; do
    cmp -s "$f" "../../../../research/exam-question-types/demos/$f" \
      && echo "IDENTICAL $f" || echo "DIVERGED $f"; done
IDENTICAL CX-diverge-01.html          IDENTICAL QUANT-MOBILE-01.html
IDENTICAL CX-figural-01.html          IDENTICAL QUANT-NUMLINE-01.html
IDENTICAL FLU-ANALOGY-01.html         IDENTICAL QUANT-SERIES-01.html
IDENTICAL FLU-CONCEPT-01.html         IDENTICAL SPA-FOLDNET-01.html
IDENTICAL FLU-MATRIX-01.html          IDENTICAL SPA-HIDDENCUBE-01.html
IDENTICAL FLU-ODDPAIR-01.html         IDENTICAL SPA-ROLL-01.html
IDENTICAL FLU-VENN-01.html            IDENTICAL SPA-SHADOW-01.html
IDENTICAL GB-PATHFORGE-01.html        IDENTICAL VER-CLOZE-01.html
IDENTICAL GB-ROBOPATH-01.html         IDENTICAL VER-POLYSEME-01.html
IDENTICAL GB-SHAPEFIT-01.html         IDENTICAL VER-RELPAIR-01.html
IDENTICAL GB-WORDFORGE-01.html        IDENTICAL VER-SORTBOT-01.html
IDENTICAL GB-WORDLADDER-01.html       IDENTICAL VER-WORDTRAIN-01.html
IDENTICAL QUANT-BALANCE-01.html
IDENTICAL QUANT-DOTS-01.html          28 of 28 identical, 0 diverged
IDENTICAL QUANT-FUNC-01.html
IDENTICAL QUANT-GRAPH-01.html

$ ls apps/web/public/exam-demos | wc -l ; cat apps/web/public/exam-demos/*.html | wc -lc
      28
    7974  555104

$ test -f scripts/sync-exam-demos.mjs && echo EXISTS || echo "ABSENT on this branch"
ABSENT on this branch

$ git log --oneline HEAD -- scripts/sync-exam-demos.mjs
                       <- empty: never in this branch's history

$ for b in $(git branch -a --format='%(refname:short)' | head -30); do
    git cat-file -e "$b:scripts/sync-exam-demos.mjs" 2>/dev/null && echo "  has: $b"; done
  has: dev
  has: feat/adaptive-exam-app
  has: feat/backend-admissions-core
  … 30 of the first 30 branches examined carry the file

$ git hash-object packages/cat-engine/src/measurements.data.json \
                  research/exam-question-types/measurements.json
a768bb3d54847f69f2e92b0fd1405aed57944036
a768bb3d54847f69f2e92b0fd1405aed57944036
```

### C. Item-content representation map

```
representation                                       distinct type codes
----------------------------------------------------------------------------
research/.../catalog/master_types.jsonl (type_id)    66
research/.../demos/*.html                            66
apps/web/public/exam-demos/*.html                    28
apps/web/.../exam/bank.ts EXAM_BANK                   8
apps/web/.../exam/sample-items.ts                     8
apps/web/.../exam/sample-items-two-stage.ts          26
packages/item-bank/data/bank/items.bank.jsonl         9   (257 item rows)

items.served.jsonl item rows: 257

How many type codes are represented in N places?
  in 7 representations: 7 type codes
  in 6 representations: 1 type code
  in 4 representations: 18 type codes
  in 3 representations: 4 type codes
  in 2 representations: 36 type codes
total distinct type codes across the repo: 66

web exam-demos HTML is a subset of research demos HTML : True
bank.ts codes are a subset of sample-items-two-stage    : True
sample-items.ts codes == bank.ts codes                 : True (same 8)

VERIFY bank.ts:9 -- "Titles/one-liners are from the catalog's master_types.jsonl"
typeCode          in catalog  title == catalog.name  blurb == catalog.one_liner
FLU-ANALOGY-01    yes         True                   False
FLU-MATRIX-01     yes         True                   False
QUANT-FUNC-01     yes         True                   False
QUANT-SERIES-01   yes         True                   False
SPA-FOLDNET-01    yes         True                   False
SPA-ROLL-01       yes         True                   False
VER-CLOZE-01      yes         True                   False
VER-RELPAIR-01    yes         True                   False
-> titles matching catalog: 8/8   blurbs matching catalog: 0/8

SUMMARY: of 8 type codes, 1 has a conflicting TITLE and 7 have conflicting BLURBS
         across the 3 web files + catalog.
```

### D. Numeric agreement of the duplicated helpers

```
$ node /tmp/numcheck.mjs
[1] mulberry32 cat-engine vs item-bank, 6 seeds x 5000 draws -> IDENTICAL streams
[2] same input string -> three different 32-bit seeds:
      "session-abc:0"    hashSeed=4122621782  hashStringToInt=2645971872  match=false
      "FLU-MATRIX-01"    hashSeed=2978615820  hashStringToInt=2521573084  match=false
      "seed"             hashSeed=1693061719  hashStringToInt=1346747564  match=false
      ""                 hashSeed=1779033703  hashStringToInt=2166136261  match=false
[3] cat-engine replay.ts fnv1a(s, 0x811c9dc5) vs item-bank hashStringToInt(s)
      -> IDENTICAL (same algorithm, same constants)
[4] normalCdf (cat-engine scoring.ts:11) vs Python norm_cdf (psychometrics.py:227)
    over theta in [-4,4] step 0.05
      max abs CDF difference    = 7.406e-8  at theta=0.7
      max percentile difference = 7.406e-6 percentile points at theta=0.7
      agree to 4 dp on percentile? yes
[5] percentileOf (persona-sim/stats.ts:72) vs quantile (psychometrics.py:73), n=12
      max abs difference across p in {0,5,25,50,75,95,100} = 1.776e-15
      NOTE: TS percentileOf(xs, p) is Python quantile(x, q); Python
            percentile_of(x, value) (psychometrics.py:94) is the INVERSE and has
            no TS twin.
[6] sd (stats.ts:13, ddof=1) vs stdev (psychometrics.py:55, ddof=1) -> diff=0.000e+0
[7] variance convention split inside the repo:
      cat-engine consistencyFromRts (scoring.ts:53) divides by n   -> sd=1351.1312
      persona-sim sd + Python stdev divide by n-1                  -> sd=1480.0901
      same RT vector, two SDs, ratio=1.095445
```

### E. Test-count and parked-LOC resolution

```
$ # static it()/test() declarations, current tree
packages/cat-engine        test files=16   it/test decls=179   .each sites=0
packages/contracts         test files=8    it/test decls=55    .each sites=2
packages/item-bank         test files=5    it/test decls=37    .each sites=0
packages/test-fixtures     test files=3    it/test decls=25    .each sites=0
apps/web                   test files=27   it/test decls=137   .each sites=3

AUDIT_SUMMARY.md:225-231 (2026-07-27): cat-engine 10 files/75 · contracts 8/60
    · test-fixtures 3/25 · item-bank 5/53 · apps/web 24/123 = 50 files/336
PSYCHOMETRIC_SWEEP_2026-07-28.md:583  : 457 passed - cat-engine 179, apps/web 140,
    contracts 60, item-bank 53, test-fixtures 25

$ # when cat-engine's newer test files were added
2026-07-28  packages/cat-engine/src/psychometric-lab/engagement-detectors.test.ts
2026-07-28  packages/cat-engine/src/psychometric-lab/learning-curve.test.ts
2026-07-28  packages/cat-engine/src/psychometric-lab/selection.test.ts
2026-07-27  packages/cat-engine/src/persona-sim/latent.test.ts
2026-07-27  packages/cat-engine/src/persona-sim/measurement.test.ts
2026-07-27  packages/cat-engine/src/persona-sim/sampler.test.ts

$ # item-bank test files vs the audit commit
UNCHANGED  packages/item-bank/src/schema.test.ts        (10 it decls)
UNCHANGED  packages/item-bank/src/projection.test.ts    ( 3)
UNCHANGED  packages/item-bank/src/registry.test.ts      ( 8)
UNCHANGED  packages/item-bank/src/data-files.test.ts    ( 7)
UNCHANGED  packages/item-bank/src/generators.test.ts    ( 9)   total 37, docs say 53

$ # parked source LOC, excluding tests
packages/cat-engine      src files=23   src LOC=2968
packages/item-bank       src files=19   src LOC=3905
combined src LOC: 6873
REPO_REACHABILITY_MAP.md:134-135 claims 14 files/1,186 + 22 files/4,437 = 5,623

$ # cat-engine source files that did not exist at the audit commit 0dbf0b5
  NEW  packages/cat-engine/src/persona-sim/index.ts                       (  20)
  NEW  packages/cat-engine/src/persona-sim/latent.ts                      ( 487)
  NEW  packages/cat-engine/src/persona-sim/measurement.ts                 ( 307)
  NEW  packages/cat-engine/src/persona-sim/sampler.ts                     ( 348)
  NEW  packages/cat-engine/src/psychometric-lab/engagement-detectors.ts   ( 207)
  NEW  packages/cat-engine/src/psychometric-lab/index.ts                  (  23)
  NEW  packages/cat-engine/src/psychometric-lab/learning-curve.ts         ( 208)
  NEW  packages/cat-engine/src/psychometric-lab/selection.ts              ( 126)
  NEW  packages/cat-engine/src/psychometric-lab/telemetry.ts              (  57)
                                                              9 files, 1,783 lines
```

### F. Duplication that is exact

```
$ # 50-state table
$ diff <(grep "^  \['" <(awk '/^const STATE_OPTIONS/,/^\];/' \
           apps/web/src/components/family/school-search.tsx)) \
       <(grep "^  \['" <(awk '/^const US_STATES/,/^\];/' \
           apps/web/src/lib/family/vocab.ts))
                       <- empty; 50 entries each, byte-identical
   school-search.tsx:10-61     vocab.ts:55-106

$ # workflow status list
$ diff <(sed -n '8,19p'  apps/web/src/components/family/family-dashboard.test.tsx | tr -d " ,") \
       <(sed -n '12,23p' packages/contracts/src/workflow.ts                       | tr -d " ,")
                       <- empty; 12 values each, identical

$ # the pattern that makes the above avoidable already exists
$ rg -n '\.options\b' apps/web/src/lib/exam/sample-items.test.ts
6:const DOMAINS = examDomainSchema.options;

$ # cat-engine duplicated test scaffolding
$ diff <(sed -n '1,60p' packages/cat-engine/src/lambda/handler.test.ts) \
       <(sed -n '1,60p' packages/cat-engine/src/replay.test.ts)
3,7c3,5
< import type { ItemParameters, RawResponse, ScoringPolicy } from '../types';
< import { fingerprint, runScoring } from '../replay';
< import type { ReplayInput } from '../replay';
< import { handler } from './handler';
< import type { ScoringLambdaEvent } from './event';
---
> import type { ItemParameters, RawResponse, ScoringPolicy } from './types';
> import { canonicalize, fingerprint, matchesFingerprint, runScoring, verifyReplay } from './replay';
> import type { ReplayInput } from './replay';
44a43
>       // Answer the two easier items correctly, miss the hardest one.
60a60
>       items: buildItems(),
                       <- 60 lines, differing only in imports and one comment

$ # contracts tests vs test-fixtures: cloned blocks are byte-equal, not diverged
$ diff <(sed -n '124,134p' packages/contracts/src/contracts.test.ts | sed 's/^ *//') \
       <(sed -n '328,338p' packages/test-fixtures/src/index.ts      | sed 's/^ *//')
                       <- empty (same for :239-247 vs :421-429 and :207-215 vs :215-223)

$ # contracts cannot import the fixtures package
$ rg -n 'test-fixtures' packages/contracts/
                       <- no matches; test-fixtures depends on contracts
```

### G. Dependency analysis

```
$ # direct third-party deps declared in more than one manifest
third-party deps declared in >1 workspace manifest: 7
of those, declared at DIFFERENT versions: 0
  (none)

same version in >1 manifest:
  typescript              5.9.3    in 7
  vitest                  4.1.10   in 6
  @vitest/coverage-v8     4.1.10   in 4
  zod                     4.4.3    in 3
  @types/node             24.13.3  in 2
  tsx                     4.23.1   in 2
  @supabase/supabase-js   2.110.7  in 2

$ # transitive
packages resolved at >1 version: 19 of 345
  eslint-visitor-keys   3x  3.4.3, 4.2.1, 5.0.1
  ansi-styles           2x  4.3.0, 5.2.0
  aria-query            2x  5.3.0, 5.3.2
  … 16 more at 2 versions each (globals, minimatch, semver, postcss, debug,
    ignore, picomatch, lru-cache, json5, js-tokens, glob-parent, fsevents,
    dom-accessibility-api, brace-expansion, balanced-match, react-is)

$ cat pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
                       <- no catalog:, no pnpm.overrides

$ rg -n '@gt-selection/test-fixtures' apps/web/src --glob '!*.test.*'
                       <- empty: test-only, yet declared in `dependencies`

$ rg -n '@gt-selection/item-bank' apps/web/src
apps/web/src/lib/exam/cat-adapter.test.ts:3:import { buildBankItem } from '@gt-selection/item-bank';
apps/web/src/lib/exam/cat-adapter.ts:7:import type { BankItem as SpecBankItem } from '@gt-selection/item-bank';
apps/web/src/lib/exam/cat-scoring.ts:27: * `node:` imports); `@gt-selection/item-bank` is NOT (its `rng.ts` imports
```

### H. Reproducing the clone scan

The scanner is not committed (this audit adds no code). Place it at
`/tmp/dupscan.mjs` and run `node /tmp/dupscan.mjs "$(pwd)" 8`. It walks
`.ts/.tsx/.mjs/.py`, skipping `node_modules`, `.next`, `.git`, and `*generated*`;
normalizes each line by stripping `//`, `/* */`, and leading-`#` comments, collapsing
whitespace, and blanking lines shorter than 4 characters or containing only
punctuation; then hashes every window of N non-blank normalized lines and reports
windows occurring in ≥2 distinct locations. `/tmp/duppairs.mjs` aggregates the same
data per file pair (the §3 table). `/tmp/numcheck.mjs` (§7.D) re-implements each
duplicated helper verbatim from its source location and compares outputs, shelling
out to `python3` for the Python side.

```
$ node /tmp/dupscan.mjs "$(pwd)" 8   | head -1
files scanned: 256   min window: 8 normalized lines   clone groups: 68
$ node /tmp/dupscan.mjs "$(pwd)" 16  | head -1
files scanned: 256   min window: 16 normalized lines   clone groups: 5
$ node /tmp/duppairs.mjs "$(pwd)" 6  | head -1
window=6 normalized lines; 256 files; 47 cloned file pairs
$ node /tmp/duppairs.mjs "$(pwd)" 6 | tail -n +2 | awk '{s+=$1} END{print s}'
1372
$ node /tmp/duppairs.mjs "$(pwd)/research/exam-question-types" 6 | head -1
window=6 normalized lines; 8 files; 0 cloned file pairs
```

---

## 8. Confidence, limits, and where this could be wrong

| Claim | Confidence | Basis |
| --- | --- | --- |
| 28 demo HTML files byte-identical | **High** | `cmp` on all 28 |
| `sync-exam-demos.mjs` absent here, present on `dev` | **High** | `git cat-file -e` across branches |
| 7 type codes in 7 representations | **High** | Parsed all seven sources |
| `SPA-FOLDNET-01` title/task conflict | **High** | Three sources parsed + catalog `interaction` field read |
| 7 of 8 blurbs conflict | **High** | Full 3-way string comparison |
| `mulberry32` streams identical | **High** | 30,000 draws across 6 seeds |
| Seed hashes disagree | **High** | Direct computation, 4 probes |
| `normalCdf` agrees with `math.erf` to 7.4e-8 | **High** | 161-point grid vs Python |
| `cat-engine` static test count 179 | **High** | `rg` count, 0 `it.each` |
| Parked LOC now 6,873 | **Medium** | My `wc -l` method may differ from the original audit's; the *delta* (9 new files, 1,783 lines absent at `0dbf0b5`) is High |
| `apps/web` runtime count is 140 | **Medium** | 137 static + 3 `it.each` sites; not executed |
| `item-bank` 53-vs-37 discrepancy | **Low — unresolved** | Static count only; could not run vitest |
| No direct dependency version drift | **High** | All 7 manifests parsed |
| 1,372 total cloned lines | **Medium** | Sensitive to the normalizer; a floor, not a ceiling |

**What I could not determine.**

1. **Any runtime test count.** This worktree has no `node_modules`, and installing
   could rewrite the tracked `pnpm-lock.yaml`, which the read-only constraint forbids.
   Every test figure here is static.
2. **Whether `item-bank`'s 53 was ever correct** (§2.6).
3. **Whether the 3 diverged blurbs are visible on a rendered surface today.** I traced
   the files, not a running page.
4. **Duplication inside `supabase/`, `infra/`, `brainlifting/`, and the 55 markdown
   files beyond the four numbers in §2.6.** The documentation scan targeted restated
   *numbers*; restated *prose* is unexamined and is the largest gap in this audit.
5. **Whether other worktrees hold uncommitted duplicates.** Not inspected, per the
   read-only boundary — the same blind spot `AUDIT_SUMMARY.md` records.

**Where this could be wrong.** The clone scanner **under**-reports: it needs 6
consecutive normalized lines, so it misses short clones (it missed D-10 entirely,
which I found by reading) and any clone where one copy was reformatted enough to
break the window. It also cannot see semantic duplication — two functions computing
the same thing by different means. D-13's cross-language normal CDF is exactly that
case, and I found it only because I was told to look for it. **Treat every count in
§3 as a lower bound, and treat "the scanner found nothing here" as weak evidence.**

**One classification I am least sure of.** D-17 (283 lines of fixture literals in the
`contracts` tests) is marked *unclear* rather than *harmful* because the dependency
cycle is real and the copies are currently in sync. A reviewer who thinks a leaf
fixtures package is worth creating would classify it harmful, and I would not argue
hard. It is the single largest clone in the repo and the one where I most want a
second opinion.

---

## 9. Governance

**Files changed:** `docs/audit/DUPLICATION_AND_REDUNDANCY.md` only. No code, config,
data, branch, or worktree was modified; no dependency was installed.

**Decisions created:** none. **Scope exceptions created:** none.

**Traceability:** descriptive audit against R7, R8, R10 (R9 / D-006 touched by D-29).
It recommends and does not ratify, so `TRACEABILITY_MATRIX.md`,
`DECISION_LOG.md`, and `SCOPE_EXCEPTION_LOG.md` need no update. Items 15 and 16 of §5
are content and ownership decisions that require a human; items 1-14 and 17 are
mechanical and need no governance action beyond normal review.

**Open assumptions.** `[A]` The four stale numbers in §2.6 were correct when written
and drifted, rather than being wrong at the time — I verified the *current* values
and the file-addition dates, not the original measurements. `[A]` `sample-items.ts`'s
`SPA-FOLDNET-01` is an authoring error rather than a deliberate placeholder that
reuses a code it does not describe; the file header (`:11-12`) is ambiguous on this
and the resolution is a content decision.
