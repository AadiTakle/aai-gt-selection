# Dead, Unreachable, and Unnecessary Code

**Tree audited:** `feat/repo-restructure-audit` @ `13451c8` (`docs/audit/` additions
by sibling agents land on top; every measurement below was taken against the
working tree at `13451c8`, whose tracked code is unchanged from it).
**Date:** 2026-07-28. **Status:** descriptive audit. It creates no decision, deletes
nothing, and ratifies no direction.

**This audit modified no existing file.** It adds this one document and nothing else.

Claim labels used throughout: **[V]** verified by a command whose output is in the
appendix · **[I]** inference from verified facts · **[A]** assumption not verified here.

---

## Executive summary

The repository is unusually clean by the standards of a codebase this size. The
mass of unconsumed code is **not** dead — it is parked, research, or tooling, and
three of those four categories are working as designed. Acting on a single
"unreachable lines" number would destroy deliberate work.

| Category | Source lines | Test lines | Meaning | Default action |
| --- | ---: | ---: | --- | --- |
| **1. Dead** | **318** | 0 | Nothing reaches it, no test covers it, no intent to | Delete (2 items need a decision first) |
| **2. Parked** | **5,328** | 647 | Tested, deliberate, currently unconsumed | Decide: wire or archive. **Do not delete** |
| **3. Research / experimental** | **7,862** | 1,133 | Deliberately not wired; unconsumed *is* the design | Leave alone. One firewall leak to fix |
| **4. Tooling / test-only** | **2,783** | 6,682 | Reached only by scripts, configs, or tests | Leave alone. Correct by definition |

**Genuinely dead code is 318 lines — about 1.4% of tracked TypeScript.** That is
up from the prior audit's 23 lines, but not because anything rotted: 23 of those
lines are the same two files that audit named (**confirmed**), and the other 295
are in two areas it did not examine — a superseded contracts module (160 lines)
and CSS left behind by the brand refactor (135 lines).

### The five things that matter

**1. The prior audit's headline number is now obsolete, in the good direction.**
`REPO_REACHABILITY_MAP.md` §3 reported "`cat-engine` and `item-bank` contribute
0 LOC to LIVE" and ~5,623 parked lines. **That is no longer true.** The wiring
commit it saw coming has landed: `apps/web/src/lib/exam/cat-scoring.ts` is
imported by `two-stage-exam.tsx`, which is rendered by
`app/dev/exam-two-stage/page.tsx`. `cat-engine` is now reachable from a page in
four hops [V]. `item-bank` is reachable too, but **only through `import type`**,
so it compiles into the type graph and ships no runtime [V]. Corrected numbers
are in §2.

**2. The largest genuinely dead item is a superseded contracts module nobody has
noticed.** `packages/contracts/src/application.ts` defines 43 exports; the
package barrel re-exports only the 13 assessment-related ones. The other 30 —
lines 7–152 and 206–219, **160 lines** — are not barrel-exported, not imported
by any file, and not touched by any test, and 11 of their 14 schemas have been
**re-implemented in `onboarding.ts`**, which *is* exported and *is* tested [V].
`DUPLICATE_MODELS.md` does not mention either file (zero matches) [V]. This is
the highest-confidence deletion in the repo after `address-lookup.ts`.

**3. `persona-sim` leaks through the package barrel into a browser module
graph — and `psychometric-lab`, the newer folder, gets this exactly right.**
`packages/cat-engine/src/psychometric-lab/index.ts` documents that it is
"DELIBERATELY NOT RE-EXPORTED FROM `../index.ts`", and it isn't: its only
importers are the three sweep scripts [V]. But `src/index.ts:27-29` does
`export * from './persona-sim'` and `'./lambda/handler'` — value re-exports —
so **1,343 lines of born-synthetic persona simulator and Lambda handler are
value-reachable from a `'use client'` component** [V]. Whether they survive
tree-shaking into the shipped bundle is **[A] unverified** (no `node_modules`,
so no build). The fix is a three-line barrel change, not a deletion.

**4. Two exam database test files read as coverage while providing none.**
`supabase/tests/120_exam_schema_security.pending.sql` and
`130_exam_rls_noninterference.pending.sql` — 209 lines, 44 pgTAP assertions —
use a `.pending.sql` suffix while all 12 executing files use `.test.sql` [V].
Meanwhile the exam migration creates **9 tables, 2 indexes, and 17 RLS
policies**, and **`apps/web` references none of the 9 table names** — the only
mention anywhere outside SQL is `packages/db-types/src/exam.ts`, which merely types
them [V]. The prior audit flagged the naming; the unreferenced-schema half is new
here.

**5. Two real dependency problems, both phantom, and no unused dependency
anywhere.** Every declared dependency is used by some form — import, CLI
invocation, ambient types, or a *string* in a config (`jsdom`,
`@vitest/coverage-v8`). But `apps/web/eslint.config.mjs` imports `eslint`
without `apps/web` declaring it, and `docs/critic-ready-product-roadmap.canvas.tsx`
imports `cursor`, which is declared nowhere in the workspace [V]. Both rely on
pnpm hoisting or fail outright.

### Genuinely clean areas — stated plainly, not padded

`TODO`/`FIXME`/`HACK` markers: **one** in the entire codebase, and it is inside a
file already marked dead. Commented-out code: **none**. Orphaned CSS module
files: **none** (all 22 are imported). Unreferenced static assets: **none** (all
28 exam demos plus `blueprint-lines.png` are referenced). Dead SQL functions:
**none** (all 29 are invoked). Unused dependencies: **none**. Duplicated
tsconfig: **none** — all nine extend one base. Details and evidence in §7.

---

## 1. Method, and which import forms were checked

No dependency was added to the repository, and **no `node_modules` exists in this
worktree** — so `knip`, `ts-prune`, `eslint`, `tsc`, `next build`, `vitest`, and
`supabase test db` could not be run. Everything below comes from `rg`, `git`, and
purpose-built read-only Node scripts kept **outside the tree** in `/tmp/gtaudit/`.
That boundary is why several claims are labelled **[I]** or **[A]** rather than
**[V]**; each says which.

A module graph was built over all **242 tracked `.ts/.tsx/.mjs/.js` files**,
resolving five specifier shapes:

| Form | Example | Resolved by |
| --- | --- | --- |
| Bare workspace | `@gt-selection/cat-engine` | `exports["."]` in that package's `package.json` |
| Deep workspace | `@gt-selection/item-bank/foo` | path-joined into the package directory |
| Path alias | `@/lib/exam/session` | `apps/web/src/*` from `apps/web/tsconfig.json` `paths` |
| Relative | `./scoring`, `../item` | resolved against the importing file |
| CSS module | `./x.module.css` | tracked separately, for §5 |

Statement kinds matched: `import … from`, **bare `import '…'`**, `export … from`,
`export * from`, **dynamic `import('…')`**, `require('…')`, and
`vi.mock/doMock/importActual/importMock('…')`.

**Unresolved specifiers: 0.** Every non-CSS, non-JSON specifier resolved, so the
code graph is complete over tracked files [V].

### The one refinement that changes the answer: value edges vs type-only edges

The prior audit resolved imports but did not separate them by erasure. That
matters here. `apps/web/src/lib/exam/cat-adapter.ts` imports
`@gt-selection/item-bank` as `import type` only — the import is erased by
`tsc`/`isolatedModules` and creates **no runtime dependency**. A graph that
ignores this reports all 4,415 lines of `item-bank` as live application code,
which is wrong in the opposite direction from the error the prior audit warned
about. So every edge is classified:

- **value edge** — survives compilation; the target is in the runtime/bundle graph.
- **type-only edge** — `import type` / `export type` / an all-`type` brace clause; erased.

Categories used: `LIVE-RUNTIME` (value-reachable from a page/route/proxy) ·
`LIVE-TYPE-ONLY` (only type-reachable) · `TOOLING` (reachable from an npm script
or build/test config) · `TEST-ONLY` · `ORPHANED`.

### Non-import reference forms checked separately

Reachability by import is not the only reachability, and the prior audit produced
two false orphans by treating it as such. Each of these was checked by hand:

| Form | How checked | Result |
| --- | --- | --- |
| Next.js file-system routing | 29 roots taken as every `page/route/layout/template` under `app/` + `proxy.ts` | Framework contract, **[A]** not proven by a build |
| `package.json` `scripts` / `bin` | every script token that is a tracked path | 17 script roots found (table in appendix D) |
| Bundler aliases | `rg 'vitest.server-only'` | `vitest.server-only.ts` is aliased, **not** imported [V] |
| Documented hand-run scripts | grep each orphan's basename across `docs/` and `research/` | 3 of 5 orphan candidates are documented operator scripts [V] |
| String-referenced config plugins | `rg 'jsdom\|coverage'` in vitest configs | `jsdom` referenced as the string `environment: 'jsdom'` [V] |
| Template-built asset paths | read `bank.ts`, then match `typeCode` per asset | demo URLs are built as `` `/exam-demos/${typeCode}.html` `` [V] |
| SQL invoked by name | each of 29 function names grepped across app + SQL | all 29 invoked [V] |

**The template-built asset path is the trap this audit nearly fell into.** A grep
for `exam-demos/CX-diverge-01.html` returns nothing, because the path is
assembled at runtime from `typeCode`. Had I stopped there I would have reported
9 orphaned demo assets. All 28 are referenced [V] — see §5.

### Where this audit could still be wrong

1. **No build, no test run, no typecheck.** Bundle membership, tree-shaking
   outcomes, and test pass counts are inferences here, never measurements.
2. **Next.js routing is assumed.** If a route file is excluded by config, its
   subtree is misclassified LIVE.
3. **My own tooling produced three false positives, all caught and corrected**
   below: `family-dashboard.module.css` classes (dynamic `styles[state]`),
   the `@fontsource-variable/*` dependencies (a regex that swallowed bare
   `import 'x'`), and 9 "orphaned" demo assets (template-built paths). I report
   them because they calibrate how much to trust the rest: **treat every negative
   result as a lead, not as authorisation to delete.**

---

## 2. Reachability, re-run — and what changed since the prior audit

Line counts are `wc -l` throughout, matching the prior audit's convention.

| Category | Files | Lines |
| --- | ---: | ---: |
| `LIVE-RUNTIME` | 115 | 14,141 |
| `LIVE-TYPE-ONLY` | 23 | 4,556 |
| `TOOLING` | 30 | 5,213 |
| `TEST-ONLY` | 66 | 9,212 |
| `ORPHANED` | 8 | 687 |

Per area (`files/lines`):

| Area | LIVE-RUNTIME | LIVE-TYPE-ONLY | TOOLING | TEST-ONLY | ORPHANED |
| --- | --- | --- | --- | --- | --- |
| `apps/web/src/app` | 28/816 | – | – | 1/94 | – |
| `apps/web/src/components` | 28/4,155 | – | – | 6/306 | – |
| `apps/web/src/lib/exam` | 12/2,220 | – | – | 11/1,010 | – |
| `apps/web/src/lib` (other) | 16/1,666 | 1/29 | – | 8/964 | 2/23 |
| `apps/web` root/config | 1/53 | – | 6/129 | 3/103 | 1/1 |
| `apps/web/e2e` | – | – | – | 3/173 | – |
| `packages/contracts` | 13/2,918 | – | – | 8/2,382 | – |
| `packages/db-types` | – | 3/622 | – | – | – |
| `packages/cat-engine` core | 11/1,004 | – | – | 9/781 | – |
| `packages/cat-engine/lambda` | 2/147 | – | 1/34 | 1/142 | – |
| `packages/cat-engine/persona-sim` | 4/1,162 | – | – | 3/760 | – |
| `packages/cat-engine/psychometric-lab` | – | – | 5/621 | 3/373 | – |
| `packages/item-bank` | – | 19/3,905 | 3/510 | 5/438 | – |
| `packages/test-fixtures` | – | – | – | 5/1,686 | – |
| `scripts` (root) | – | – | 5/276 | – | 1/114 |
| `scripts/persona-sim` | – | – | 4/1,348 | – | – |
| `scripts/psychometric-sweep` | – | – | 4/1,858 | – | – |
| `research/exam-question-types/qa` | – | – | 1/395 | – | 3/323 |
| `docs` | – | – | – | – | 1/226 |
| `eslint.config.mjs` (root) | – | – | 1/42 | – | – |

### The parked seam is now wired — this is the headline correction

`REPO_REACHABILITY_MAP.md` §3 stated: *"cat-engine and item-bank contribute 0 LOC
to LIVE"* and *"5,623 LOC that no rendered page reaches"*. **Both statements were
true at `5c2c2ab` and are false now.** The wiring branch that audit saw moving
mid-run has merged. The chain, resolved through the graph [V]:

```
apps/web/src/app/dev/exam-two-stage/page.tsx
  -> apps/web/src/components/exam/two-stage-exam.tsx        ('use client')
    -> apps/web/src/lib/exam/cat-scoring.ts                 (value import)
      -> packages/cat-engine/src/index.ts                    (value import)
        -> persona-sim/{index,latent,measurement,sampler}.ts (via `export *`)
        -> lambda/{event,handler}.ts                         (via `export *`)
    -> apps/web/src/lib/exam/cat-adapter.ts                 (from cat-scoring)
      -> packages/item-bank/src/index.ts                     (TYPE-ONLY)
```

So the corrected picture:

| Prior audit claim | Status now | Correct figure |
| --- | --- | --- |
| `cat-engine` contributes 0 LOC to LIVE | **Superseded** | 1,151 lines runtime-live (core 1,004 + lambda 147) |
| `item-bank` contributes 0 LOC to LIVE | **Refined** | 0 runtime lines; 3,905 lines type-only reachable |
| `cat-adapter.ts`'s only importer is its own test | **Superseded** | now also imported by `cat-scoring.ts` |
| ~5,623 lines parked | **Superseded** | 5,328 parked source, composed differently (§4) |
| 23 genuinely dead lines | **Confirmed** for the two files named | but the true total is 318 (§3) |

### What the application actually uses from `cat-engine`

Reachability through a barrel is not use. `cat-scoring.ts` imports exactly **three
value symbols** — `estimateThetaEap`, `estimateThetaMle`, `scoreItems` — plus five
types [V]. Everything else in the 2,313-line package is dragged into the module
graph by `export *`. That distinction is the whole of finding §7.1.

---

## 3. Category 1 — DEAD (318 lines)

Nothing reaches it, no test covers it, and nothing is waiting for it.

| Path (and range) | Lines | Evidence | Deletion risk | Verification command |
| --- | ---: | --- | --- | --- |
| `packages/contracts/src/application.ts` **lines 7–152, 206–219** | **160** | 30 of 43 exports absent from the barrel; only importers of `./application` are `index.ts` (assessment names only) and `correction.ts` (`assessmentInputSchema`); **no test imports `./application`**; 11 of 14 schemas re-implemented in `onboarding.ts` [V] | **Safe** (needs one glance to confirm no external consumer is planned) | `rg -n "['\"]\./application['\"]" packages/ && rg -n "from '\./application'" packages/contracts/src/*.test.ts` |
| `apps/web/src/lib/family/address-lookup.ts` (whole file) | 22 | Zero references repo-wide; superseded by `app/api/address/route.ts`, which its own header (lines 4–15) describes as the intended replacement [V]. Confirms prior audit | **Safe** | `rg -n "address-lookup" .` |
| `apps/web/src/styles/globals.css` **lines 79–115** (legacy alias block, 29 custom properties) | 37 | Block is explicitly labelled *"Legacy aliases → brand tokens. Kept so any not-yet-migrated reference still resolves"*. **Zero `var()` references remain** — the migration it exists to protect is complete [V] | **Needs a decision** — deliberate shim, but its stated purpose is now fulfilled | `for v in --gt-ember --gt-petrol --gt-font-body --gt-color-accent; do rg -c "var\(\s*$v\b" apps/web; done` |
| `apps/web/src/components/family/assessment-gate.module.css` (7 classes, 8 rule blocks) | 54 | `cardReady, included, feeRow, feeLabel, feeAmount, ghost, payRow`; the component uses only 7 other classes and does **no** dynamic `styles[…]` indexing [V] | **Safe** | `rg -o "styles\.[a-zA-Z][\w]*" apps/web/src/components/family/assessment-gate.tsx \| sort -u` |
| `apps/web/src/components/family/steps.module.css` (3 classes, 5 rule blocks) | 40 | `optHint, control, selectWrap`; component's full used set is 17 other classes, no dynamic indexing [V] | **Safe** | `rg -o "styles\.[a-zA-Z][\w]*" apps/web/src/components/family/steps.tsx \| sort -u` |
| `apps/web/src/styles/globals.css` lines 25, 27, 44, 76 (`--gt-black`, `--gt-grey-light`, `--color-primary-soft`, `--gt-shadow-card`) | 4 | Declared outside the legacy block, never referenced via `var()` [V] | **Safe** | same `var()` scan as above |
| `apps/web/src/lib/contracts.ts` (whole file) | 1 | Body is `export * from '@gt-selection/contracts';`; zero importers [V]. Confirms prior audit | **Needs a decision** — `docs/architecture/ARCHITECTURE_PLAN.md:229` documents this file as the intended convention, which all 25 consumers ignore. Fix the doc or adopt the file | `rg -n "@/lib/contracts" apps/web/src` |
| **Total** | **318** | | | |

### On `application.ts` — the substantive new finding

`packages/contracts/src/index.ts` re-exports `./application` **selectively** (7
schemas + 6 types, all assessment-related) while doing `export *` from
`./onboarding`. `onboarding.ts` independently defines `applicationStateSchema`,
`applicationDraftSchema`, `saveApplicationDraftRequestSchema`,
`applicationVersionSchema`, `getApplicationStatusRequestSchema`, and
`submitApplicationRequestSchema` — and those are the versions the application and
the tests actually use (`local-synthetic-adapter.ts:15`, `contracts.test.ts:12`,
both importing from the barrel) [V].

The dead region is cleanly separable: lines 154–204 (the assessment half) and
lines 220–225 (its types) reference nothing from lines 7–152, so the two halves
have no coupling [V]. The local helper schemas at lines 9–27 (`shortTextSchema`,
`codeSchema`, `syntheticNameSchema`, …) are used **only** by the dead half.

Four of the dead schemas — `priorSchoolSchema`, `applicationStudentSchema`,
`applicationEducationSchema`, `applicationGuardianSchema` — have **no**
`onboarding.ts` counterpart [V]. They are not superseded; they are abandoned. That
is the one part worth a human glance before deleting: if the prior-schools /
guardian model is still wanted, it lives only here.

**Because `exports` in `packages/contracts/package.json` is `{".": "./src/index.ts"}`
with no subpath entries, no consumer can deep-import these names.** Verified: zero
occurrences of `@gt-selection/contracts/` anywhere [V]. So "not in the barrel"
really does mean unreachable, and this is not a deliberate-public-API case.

### Not counted as dead, deliberately

`research/exam-question-types/qa/probe-interact.mjs` (92 lines) is graph-orphaned
and, unlike its two siblings, is **not** documented in `DEMO_QA_REPORT.md`. Its
only mention anywhere is its own usage header [V]. It is nonetheless the same kind
of artefact as `probe-flow.mjs` and `probe-wordladder.mjs` — a hand-run diagnostic
in an isolated harness — so calling it dead would repeat exactly the error the
prior audit documented. Classified as tooling (§6, undocumented) with a
recommendation to document or drop it, not as dead.

---

## 4. Category 2 — PARKED (5,328 source lines, 647 test lines)

Built and tested ahead of a consumer that does not exist yet. **Deleting any of
this destroys deliberate work.** The correct action is a decision — wire it or
archive it explicitly — not a cleanup.

| Path | Lines | Category | Evidence | Deletion risk | Verification command |
| --- | ---: | --- | --- | --- | --- |
| `packages/item-bank/src/**` (19 files) | 3,905 | Parked — type-only reachable | Reached from the app **only** through `import type` in `cat-adapter.ts:7`; erased at compile time, so zero runtime lines ship [V]. 28 of 29 barrel exports have no importer [V] | **Do not delete** — 37 test declarations across 5 files | `rg -n "@gt-selection/item-bank" apps/web/src` then confirm every hit is `import type` |
| `packages/item-bank/scripts/**` (3 files) | 510 | Tooling | Reached by `item-bank:generate` (`gen-type-registry` → `build-bank` → `qa-report`) [V] | Do not delete | `rg -n '"generate"' packages/item-bank/package.json` |
| `supabase/migrations/20260727120000_exam_data_model.sql` | 366 | Parked | Creates **9 tables, 2 indexes, 17 RLS policies**; **zero** `apps/web` references to any of the 9 table names [V] | **Do not delete** | `rg -l "exam_session\|exam_item\|exam_telemetry_event\|exam_participant\|exam_policy\|exam_question_type" apps/web` (expect no matches) |
| `supabase/migrations/20260727120100_exam_data_model_seed.sql` | 124 | Parked | Seed for the above | Do not delete | as above |
| `packages/db-types/src/exam.ts` | 423 | Parked — type-only | Pulled in via the `db-types` barrel; type-only; describes the tables from the migration above [V] | Do not delete | `rg -n "from '@gt-selection/db-types'" apps/web/src` |
| `apps/web/src/lib/exam/cat-adapter.ts` — 5 exports | (of 204) | Parked | `toRawResponse`, `toItemParameters`, `specItemToItemParameters`, `provisionalIrtFromRung`, `toEngineInputs` are imported **only by the file's own test** [V] | Do not delete | `rg -n "toEngineInputs\|specItemToItemParameters" apps/web/src` |
| **Total (source)** | **5,328** | | | | |
| `supabase/tests/120_exam_schema_security.pending.sql` | 86 *(test)* | **Parked but silently skipped** | `.pending.sql` suffix; all 12 executing files use `.test.sql` [V]. 20 pgTAP assertions never run | Do not delete — **rename or retire** | `ls supabase/tests/ && rg -o 'plan\((\d+)\)' -r '$1' supabase/tests/*.pending.sql` |
| `supabase/tests/130_exam_rls_noninterference.pending.sql` | 123 *(test)* | **Parked but silently skipped** | as above; 24 assertions never run [V] | Do not delete — rename or retire | as above |
| `packages/item-bank/src/*.test.ts` (5 files) | 438 *(test)* | Parked | 37 test declarations covering the parked package | Do not delete | `rg -c "^\s*it\(" packages/item-bank/src/*.test.ts` |
| **Total (test)** | **647** | | | | |

### The two disconnected content systems still exist

`item-bank` generates a **257-item** bank (`data/bank/items.bank.jsonl`,
`data/served/items.served.jsonl`) that nothing in `apps/web` reads, while the
rendered exam uses hand-written arrays in `apps/web/src/lib/exam/bank.ts` and
`sample-items-two-stage.ts` pointing at static HTML [V]. **This is unchanged from
the prior audit and remains accurate** — the `cat-scoring.ts` wiring connected the
*scoring engine*, not the *item bank*. `item-bank`'s contribution to the running
product is still zero lines of runtime.

### The exam database schema is the sharper version of the same problem

A 9-table schema with 17 RLS policies exists, is typed in `db-types/src/exam.ts`,
and has 209 lines of security/RLS tests written for it — and **the application
persists exam results in a module-level JavaScript array instead**
(`app/api/exam-results/route.ts:23`, documented as a deliberate stand-in) [V].
Nothing is broken; three layers of a feature exist and are not joined. The part
that is actively misleading is the `.pending.sql` naming: 44 assertions that read
as coverage and provide none.

---

## 5. Category 3 — RESEARCH / EXPERIMENTAL (7,862 source lines, 1,133 test lines)

Deliberately not wired into the product. **Being unconsumed is the design**, and
every folder here says so in its own header. This is not a defect and should not
appear in any "dead lines" total.

| Path | Lines | Reached by | Deletion risk | Verification command |
| --- | ---: | --- | --- | --- |
| `packages/cat-engine/src/psychometric-lab/**` (5 src) | 621 | The 3 sweep scripts only — **correctly firewalled** from `../index.ts` [V] | **Do not delete** — 39 test declarations | `rg -n "psychometric-lab" packages/cat-engine/src/index.ts` (expect: no match) |
| `packages/cat-engine/src/persona-sim/**` (4 src) | 1,162 | `scripts/persona-sim/bank.ts` **and** — unintentionally — the app, via `src/index.ts:27` [V] | **Do not delete** — 64 test declarations. See §6.1 | `rg -n "export \* from './persona-sim'" packages/cat-engine/src/index.ts` |
| `scripts/psychometric-sweep/**` (4 files) | 1,858 | `sweep:lambda`, `sweep:selection`, `sweep:engagement` [V] | Do not delete | `rg -n "sweep:" package.json` |
| `scripts/persona-sim/**` (4 files) | 1,348 | `persona-sim` npm script [V] | Do not delete | `rg -n '"persona-sim"' package.json` |
| `scripts/validation-harness/**` (14 `.py`) | 2,873 | Hand-run Python harness; referenced by 8 docs and by `scripts/persona-sim/harness-export.ts:6` [V] | Do not delete | `rg -ln "validation-harness" docs research` |
| **Total** | **7,862** | | | |

**`psychometric-lab` is the model to copy.** Its `index.ts` states it is
"DELIBERATELY NOT RE-EXPORTED FROM `../index.ts`" because "the engine's public
surface is the approved scoring + replay payload (D-019)", and the code matches the
comment exactly: its only importers are the three sweep scripts [V]. That is a
firewall that works. `persona-sim` predates it and does not have one.

---

## 6. Category 4 — TOOLING / TEST-ONLY (2,783 source lines, 6,682 test lines)

Reached only by scripts, configs, or tests. **This is correct, not a defect.**
Listed so nobody mistakes it for dead code later.

| Path | Lines | Reached by | Note |
| --- | ---: | --- | --- |
| `packages/test-fixtures/src/**` | 1,686 | Tests only, across packages | Its job. 35 of 41 barrel exports are test-only, which for a fixtures package is the definition of working [V] |
| `apps/web/vitest.server-only.ts` | 1 | **Bundler alias**, never imported — `vitest.config.ts:14`, `vitest.integration.config.ts:13` [V] | Prior audit's false positive; **confirmed still load-bearing** |
| `scripts/configure-cloud-auth-email.mjs` | 114 | Hand-run; documented at `docs/DEMO_TONIGHT.md:69,105,118` [V] | Prior audit's false positive; **confirmed still tooling** |
| `research/exam-question-types/qa/qa.mjs` | 396 | `qa` script in its own isolated `package.json` [V] | Standalone harness, not an app dependency |
| `research/exam-question-types/qa/probe-flow.mjs` | 151 | Hand-run; documented at `DEMO_QA_REPORT.md:209` [V] | Not dead |
| `research/exam-question-types/qa/probe-wordladder.mjs` | 80 | Hand-run; documented at `DEMO_QA_REPORT.md:210` [V] | Not dead |
| `research/exam-question-types/qa/probe-interact.mjs` | 92 | Hand-run, **undocumented** — only its own usage header [V] | Weakest case in the repo. Document it or drop it |
| `docs/critic-ready-product-roadmap.canvas.tsx` | 226 | Nothing; described at `docs/README.md:56` as a kept canvas artefact [V] | Documentation artefact. Also the source of a phantom dependency (§8) and outside every tsconfig (§7.4) |
| `scripts/*.ts` (5 root scripts) | 276 | `verify`, `boundaries:check`, `security:scan`, `db:types:check`, `db:users` [V] | Live tooling, but never typechecked (§7.4) |
| `packages/cat-engine/src/lambda/invoke-local.ts` | 34 | `cat-engine:invoke:local` [V] | Only Lambda-adjacent entry point; **no Lambda is deployed** — `infra/` is Terraform only, no JS/TS [V] |

---

## 7. Unnecessary complexity

Judged conservatively. Where I cannot tell whether an abstraction is deliberate, I
say so rather than recommend removing it.

### 7.1 `persona-sim` and `lambda` leak through the `cat-engine` barrel — the one finding here with a clear fix

`packages/cat-engine/src/index.ts:27-29`:

```27:29:packages/cat-engine/src/index.ts
export * from './persona-sim';
export * from './lambda/event';
export * from './lambda/handler';
```

These are **value** re-exports. `cat-scoring.ts` imports three functions from this
barrel, so **1,309 lines** (persona-sim 1,162 + `lambda/event.ts` and
`lambda/handler.ts` 147) enter the module graph of a `'use client'` component that
has no use for either [V]. (`lambda/invoke-local.ts`, the remaining 34 lines and the
only `node:` importer, is *not* in the barrel — see below.)

Three separate problems, worth separating:

1. **A research simulator is in a product module graph.** `persona-sim` generates
   synthetic test-takers with known latent truth. Its own header says recovery
   against it "is CIRCULAR … never real validity (R10)". It has no business being
   reachable from a rendered page, regardless of bundling.
2. **A server-shaped Lambda handler is in a client module graph.** `lambda/handler.ts`
   is the D-019 Lambda payload.
3. **`cat-scoring.ts`'s own stated invariant is weakened.** Its header (lines 26–29)
   argues carefully that `item-bank` must stay type-only because
   `rng.ts` imports `node:crypto`, and that `cat-engine` is "safe to bundle for the
   browser (pure math, no `node:` imports)". That premise is **still true** —
   `invoke-local.ts` is the only `node:` import in `cat-engine`, and it is not in
   the barrel [V] — so nothing breaks today. But the reasoning protects the
   *adapter's* purity while the barrel quietly widens the surface behind it.

**Does it reach the shipped bundle? [A] Unverified.** These are side-effect-free ESM
modules, so a correct tree-shake should drop them; `export *` barrels are also a
well-known tree-shaking weak spot. Deciding this needs a build, which this worktree
cannot do.

**Suggested fix (not applied):** give `persona-sim` and `lambda` the same treatment
`psychometric-lab` already has — drop them from `index.ts` and let the sweep
scripts and `invoke-local.ts` deep-import them. **Risk: needs a decision** — it is
a public-surface change to the package, and `scripts/persona-sim/bank.ts` already
deep-imports `persona-sim/latent` directly [V], which shows the pattern works.

**Verification:** `rg -n "from '@gt-selection/cat-engine'" apps/web packages scripts`
— confirm no consumer relies on a `persona-sim` or `lambda` name coming from the barrel.

### 7.2 `OnboardingService` — an interface with exactly one implementation

`apps/web/src/lib/onboarding/service.ts` (29 lines) declares an 8-method interface.
It has **one** implementation and **one** importer, the same file:
`local-synthetic-adapter.ts:32` imports the type and `:125` returns it [V]. No
consumer accepts an `OnboardingService` parameter, so the interface is not used
polymorphically and adds no seam today.

**I cannot tell whether this is premature or planned, and I lean towards planned.**
The implementation is named `local-synthetic-adapter`, `env.ts` exports
`isHostedDeploy`, and the factory is parameterised on a client and an environment —
all consistent with a second, hosted adapter being intended. **Risk: do not
delete.** If a second adapter is not coming, inlining the types into the adapter
removes one file; that is a 29-line gain and not worth forcing the question.

### 7.3 Duplicated demo assets

All 28 files in `apps/web/public/exam-demos/` are **byte-identical** to their
counterparts in `research/exam-question-types/demos/` (67 files) — 7,974 duplicated
lines, verified with `cmp` on all 28 [V]. No script performs the copy in this tree
(`scripts/sync-exam-demos.mjs` exists only on the Gen-B branch) [V], so it was done
by hand.

This is **already covered in `docs/audit/REPO_RESTRUCTURE_PROPOSAL.md` §109** by a
sibling agent, via git blob hashes. Recorded here for completeness and not
re-analysed. Not dead — `public/` is how Next.js serves them.

### 7.4 Dead configuration: the root `typecheck` script does not typecheck

```
"typecheck": "tsc --showConfig -p tsconfig.base.json > /dev/null && pnpm -r --if-present run typecheck"
```

`tsc --showConfig` **prints** the resolved configuration and exits; it compiles
nothing. And `tsconfig.base.json` has no `include`/`files`, so it could not check
anything even if it did compile. The real work is entirely in the `pnpm -r` half,
which covers only workspace packages — and `pnpm-workspace.yaml` is `apps/*` +
`packages/*` [V].

Consequences, computed against all nine tsconfig `include` globs [V]:

- **6 tracked `.ts`/`.tsx` files are outside every tsconfig** and are therefore
  never typechecked: `scripts/verify.ts`, `scripts/check-generated-types.ts`,
  `scripts/check-security-boundaries.ts`, `scripts/check-workspace-boundaries.ts`,
  `scripts/create-local-auth-users.ts` (281 lines of live tooling, including the
  boundary and security scanners) and `docs/critic-ready-product-roadmap.canvas.tsx`.
- `scripts/persona-sim/tsconfig.json` and `scripts/psychometric-sweep/tsconfig.json`
  exist but are **not** reached by `typecheck`; they need the separate
  `persona-sim:typecheck` and `sweep:typecheck` scripts, which nothing chains [V].

**Risk: safe to fix, and this is a gap rather than dead code** — the fix adds
coverage rather than removing lines. I did **not** check whether those 6 files
actually contain type errors, only that nothing would report them if they did.
Verification: add a `scripts/tsconfig.json`, chain the two orphaned typecheck
scripts into `typecheck`, and run `pnpm typecheck`.

### 7.5 Defensive code for impossible states — none found worth reporting

I looked for guards on unreachable states and found the opposite pattern: the
defensive code that exists is load-bearing. `cat-scoring.ts:116-124` returns an
`EMPTY` estimate for a zero-length item list, which is reachable (a session with
no effort-valid responses). `estimateDemoTheta` drops unresolvable results rather
than guessing (`:145-152`) — deliberate and documented. Nothing to remove.

### 7.6 Markers and commented-out code — genuinely clean

| Check | Result |
| --- | --- |
| `TODO`/`FIXME`/`HACK`/`XXX` in code | **1 total** — `address-lookup.ts:13`, a `TODO(B-06)` inside a file already dead. Age: it is the file's own supersession note, and the replacement route already shipped [V] |
| Commented-out code (`// const`, `// return`, `// if (`, …) | **0** — the single regex hit is prose [V] |
| Block-commented code | **0** — every `/* … */` hit is JSDoc [V] |

For a repo of 242 code files, one marker and zero commented-out blocks is an
unusually good result. No action.

---

## 8. Dependency issues

### 8.1 Unused dependencies: none

Every declared dependency in all 8 `package.json` files is used by **some** form.
My first pass reported 10 unused in `apps/web`; **all 10 were false positives of my
own tooling and are corrected here.** The lesson generalises: a dependency can be
"used" without ever appearing in an `import`.

| Dependency | First reported | Actually reached by | Form |
| --- | --- | --- | --- |
| `@fontsource-variable/{literata,inter-tight,inconsolata}` | unused | `app/layout.tsx:6,7,8` | **bare `import 'x'`** — my regex swallowed these; caught by direct `rg` [V] |
| `jsdom` | unused | `vitest.config.ts:18` | **string** `environment: 'jsdom'` [V] |
| `@vitest/coverage-v8` | unused | `vitest run --coverage` | **string**, resolved by provider name [I] |
| `@testing-library/jest-dom` | unused | `vitest.setup.ts:1` | bare import [V] |
| `react-dom` | unused | required by `next`/`react` at runtime | peer/runtime, never imported [I] |
| `@types/react`, `@types/react-dom`, `@types/node` | unused | ambient types; `tsconfig.base.json` sets `"types": ["node"]` | ambient [V] |
| `typescript`, `eslint`, `prettier`, `supabase`, `tsx` | unused | `tsc -p`, `eslint`, etc. in scripts | CLI [V] |

One genuinely arguable item: **`vitest` in the root `package.json`.** The root has
no `vitest.config`, and root `test` is `pnpm -r --if-present run test`; each package
declares `vitest@4.1.10` itself [V]. It is plausibly a deliberate single-version
pin. **Low confidence, needs a decision, 1 line.** Verification: remove it and run
`pnpm -r run test`.

### 8.2 Phantom dependencies: 2 — both real pnpm hazards

pnpm does not hoist by default in the way npm does, so importing an undeclared
package works only accidentally.

| Package | Imports | Declared in | Risk | Verification command |
| --- | --- | --- | --- | --- |
| `@gt-selection/web` | `eslint/config` at `apps/web/eslint.config.mjs:1` | **not** in `apps/web/package.json`; only in the root | **Real** — `apps/web`'s own `lint` script resolves `eslint` through the root. Add `eslint` to `apps/web` devDependencies | `rg -n '"eslint"' apps/web/package.json` (expect: no match) |
| root | `cursor` at `docs/critic-ready-product-roadmap.canvas.tsx` | **nowhere in the workspace** | **Real but inert** — the file is outside every tsconfig (§7.4) and imported by nothing, so it never resolves | `rg -n "cursor" package.json apps/web/package.json` |

Note `apps/web` does declare `eslint-config-next`, so the omission looks like an
oversight rather than a policy.

---

## 9. Stale generated artifacts

| Artifact | Lines | Reproducible from source? | Freshness enforced? |
| --- | ---: | --- | --- |
| `packages/db-types/src/database.generated.ts` | 197 | Yes — `pnpm db:types` (`supabase gen types typescript --local --schema api`) [V] | **Yes** — `scripts/check-generated-types.ts` via `db:types:check` [V] |
| `packages/item-bank/src/generated/type-registry.generated.ts` | 2,046 | Yes — `pnpm --filter @gt-selection/item-bank gen:registry` [V] | **Yes** — carries `MASTER_TYPES_SHA256`, asserted by `src/registry.test.ts` against `master_types.jsonl` [V] |
| `packages/item-bank/data/{bank,served}/items.*.jsonl` | 257 each | Yes — `build-bank.ts` [V] | Partially — `src/data-files.test.ts` reads them |

**Both committed generated files have a freshness check, which is better hygiene
than most repos.** Whether they are *currently* in sync is **[A] unverified** — it
needs a live Supabase (`db:types:check`) and a generator run, neither available
here. No stale artifact was found, and none is claimed clean either.

`.gitignore` correctly excludes `coverage/`, `.next/`, `playwright-report/`, and the
QA harness's `node_modules`/`results.json` [V]. No build output is committed.

---

## 10. This area is clean

Stated plainly so the owner does not spend time here. Each row was checked; none is
an assumption of cleanliness.

| Area | Result | Evidence |
| --- | --- | --- |
| CSS module **files** | **All 22 imported.** Zero orphaned stylesheets | Every `.module.css` has ≥1 importing `.tsx` [V] |
| CSS from the brand refactor | **Zero unused classes** in the three refactored exam modules (`two-stage-exam` 40 classes, `exam-runner` 32, `synthetic-exam` 7) | Per-class check against consuming TSX [V] |
| Font module references | **No dangling references.** All three `@fontsource-variable` packages imported; `--font-display/-body/-utility` all declared (`globals.css:9-11`) and used | [V] |
| Static assets | **All referenced.** 28/28 exam demos (via template-built paths) + `blueprint-lines.png` (5 CSS `url()` refs) | [V] |
| SQL functions | **All 29 invoked.** No dead function, trigger, or helper | Each name grepped across app code and SQL; lowest was 3 refs (definition + comment + trigger) [V] |
| SQL migrations | No orphaned migration. The 2 exam migrations are parked (§4), not dead | [V] |
| `TODO`/`FIXME`/`HACK` | **1 in the whole repo**, inside an already-dead file | [V] |
| Commented-out code | **None** | [V] |
| Unused dependencies | **None** in any of 8 packages | §8.1 [V] |
| tsconfig duplication | **None.** All 9 extend `tsconfig.base.json`; per-package overrides are 1–3 lines | [V] |
| ESLint / Prettier config duplication | **None.** One root `eslint.config.mjs`, one `apps/web` override, one `.prettierrc.json` | [V] |
| Committed build output | **None** | [V] |
| `packages/test-fixtures` being test-only | **Correct**, not a defect | [V] |
| `apps/web/src/app` route tree | No orphaned page, route, layout, or template | All 29 are graph roots [V] |
| Duplicate `applicationDraftSchema` etc. | Found — but it is the *cause* of §3's dead code, not a separate problem | [V] |

### Unused exports: what is real and what is not

My export scan flagged 70+ files. Most are false positives, and saying which
matters more than the raw count:

- **Framework conventions are not unused exports.** `default`, `dynamic`,
  `metadata`, `GET`, `POST`, `proxy`, `config`, `register` are string-referenced by
  Next.js. ~34 files flagged for this reason alone — all correct as written.
- **A package's deliberate public API is not unused code.**
  `packages/item-bank/src/index.ts` has 28 of 29 exports with no importer, and
  `packages/test-fixtures/src/index.ts` has 35 of 41 used only by tests. For a
  spec package and a fixtures package respectively, that is the intended shape.
- **Zod schema + inferred type pairs** inflate the count without meaning anything.

After filtering, the export findings that carry information are: the 30 in
`application.ts` (§3, dead), the 5 test-only ones in `cat-adapter.ts` (§4, parked),
and app-internal type exports in `apps/web/src/lib/exam/item.ts` (16 of 28) and
`lib/family/wizard-types.ts` (9 of 13). Those last two are **type-only exports in
app-internal modules** — genuinely unconsumed, ~25 declarations, but each is one
line of a schema family and removing them buys almost nothing. **Risk: safe but not
worth the churn.** Verification: `pnpm --filter @gt-selection/web typecheck`.

---

## 11. Where this audit corrected or confirmed the earlier one

| Earlier claim | Source | Verdict | Detail |
| --- | --- | --- | --- |
| 23 genuinely dead lines | `AUDIT_SUMMARY.md` §1 | **Confirmed, then extended** | The two files named are still dead and still total 23 lines. But the figure was scoped to `apps/web/src`, `packages/*/src`, `scripts/`; it did not examine `packages/contracts/src/application.ts` (160) or any CSS (135). True total: **318** |
| ~5,600 parked lines in `cat-engine` + `item-bank` | `AUDIT_SUMMARY.md` §1, `REACHABILITY` §3 | **Superseded** | `cat-engine` is now runtime-live via `cat-scoring.ts`. Parked total is 5,537 but composed differently: `item-bank` (3,902) + exam DB cluster (1,122) + misc |
| "`cat-engine` and `item-bank` contribute 0 LOC to LIVE" | `REACHABILITY` §3 | **False now** | `cat-engine` 1,150 runtime lines; `item-bank` 3,902 type-only lines |
| `cat-adapter.ts`'s only importer is its own test | `REACHABILITY` §6b | **Superseded** | Now also `cat-scoring.ts:15` |
| `scoring.ts` / `harvest.ts` are LIVE | `REACHABILITY` §4 | **Confirmed** | Still reached via `session.ts` |
| `contracts` is load-bearing, ~25 importers | `REACHABILITY` §4 | **Confirmed** | Still the most-imported package |
| `vitest.server-only.ts` is a false orphan (bundler alias) | `REACHABILITY` §5 | **Confirmed** | Both aliases still present |
| `configure-cloud-auth-email.mjs` is a false orphan (hand-run) | `REACHABILITY` §5 | **Confirmed** | Still documented in `DEMO_TONIGHT.md` |
| `address-lookup.ts` is safe to delete | `REACHABILITY` §6a, §7.1 | **Confirmed** | Still zero references; replacement still shipped |
| `apps/web/src/lib/contracts.ts` is dead but documented | `REACHABILITY` §6a | **Confirmed** | Unchanged |
| Exam DB tests are skipped via `.pending.sql` | `REACHABILITY` §6c | **Confirmed and sharpened** | Also: the 9-table schema those tests target has **zero** `apps/web` references, and there are 44 non-running assertions |
| `test-fixtures` is correctly test-only | `REACHABILITY` §7.5 | **Confirmed** | Unchanged |
| Gen-A has 248 pgTAP assertions, 0 exam-specific | `AUDIT_SUMMARY.md` §G | **Confirmed and split** | 248 = **204 that execute** (`*.test.sql`) + **44 that do not** (`*.pending.sql`). All 44 non-running ones are the exam assertions, which is exactly why the exam count reads as zero [V] |
| "No dynamic/string-built import paths were found" | `REACHABILITY` §1 limit 4 | **Corrected** | True for *module* specifiers, but demo **asset** paths are template-built (`` `/exam-demos/${typeCode}.html` ``). This nearly produced 9 false orphans here |
| `DUPLICATE_MODELS.md` covers the duplicate models | implied | **Gap found** | It has **zero** mentions of `application.ts` or `onboarding.ts`, which duplicate 11 schemas — the largest duplication in `contracts` [V] |

**New findings not present in the earlier audit at all:** the `application.ts` dead
region (§3); the `persona-sim`/`lambda` barrel leak (§7.1); the unreferenced exam
schema (§4); the CSS legacy-alias block and unused module classes (§3, §5); both
phantom dependencies (§8.2); and the root `typecheck` script not typechecking (§7.4).

---

## 12. Suggested order of action

Nothing here is applied. Ordered by certainty-to-effort, not by size.

**Safe, no decision needed**

1. Delete `apps/web/src/lib/family/address-lookup.ts` (22 lines) — proven superseded.
2. Delete `packages/contracts/src/application.ts` lines 7–152 and 206–219 (160 lines)
   — after one glance at the 4 abandoned guardian/prior-school schemas.
3. Delete the 10 unused CSS classes in `assessment-gate.module.css` and
   `steps.module.css` (94 lines) and the 4 stray custom properties (4 lines).
4. Add `eslint` to `apps/web` devDependencies — closes a phantom dependency.

**Needs one small decision**

5. `persona-sim` + `lambda` barrel leak — drop 3 lines from `cat-engine/src/index.ts`
   and let deep imports do the work, matching `psychometric-lab`.
6. `globals.css` legacy alias block (37 lines) — the migration it protects is done.
7. `apps/web/src/lib/contracts.ts` — adopt the convention or delete the file and fix
   `ARCHITECTURE_PLAN.md:229`.
8. `.pending.sql` → `.test.sql`, or retire the two files. 44 assertions currently
   read as coverage and provide none.
9. Give `scripts/` a tsconfig and chain the two orphaned typecheck scripts.

**Blocked on the Gen-A / Gen-B decision (see `GEN_A_VS_GEN_B.md`)**

10. The fate of `item-bank` (3,902 lines) and the exam DB schema cluster (1,122 lines).
    **Do not delete either while the decision is open.**

**Do not touch**

11. Everything in §5 (research) and §6 (tooling/test-only) — 10,645 source lines
    whose unconsumed status is either the design or the definition.

---

## Appendix — verbatim command output

Run from the worktree root at `13451c8`. Helper scripts live in `/tmp/gtaudit/`,
outside the repository.

### A. This audit changed nothing

```
$ git status --short
                         ← empty before this file was written

$ git rev-parse HEAD
13451c8d70981fb43ed7ea554c33ce87011b8b03
```

### B. Graph totals, with value/type edges separated

```
$ node /tmp/gtaudit/graph2.mjs <worktree>
HEAD 13451c8
┌────────────────┬───────┬───────┐
│ (index)        │ files │ loc   │
├────────────────┼───────┼───────┤
│ LIVE-RUNTIME   │ 115   │ 14256 │
│ LIVE-TYPE-ONLY │ 23    │ 4579  │
│ TOOLING        │ 30    │ 5243  │
│ TEST-ONLY      │ 66    │ 9278  │
│ ORPHANED       │ 8     │ 695   │
└────────────────┴───────┴───────┘
unresolved (non-css/json/asset): 0

--- ORPHANED ---
    2 apps/web/src/lib/contracts.ts
   23 apps/web/src/lib/family/address-lookup.ts
    2 apps/web/vitest.server-only.ts
  227 docs/critic-ready-product-roadmap.canvas.tsx
  152 research/exam-question-types/qa/probe-flow.mjs
   93 research/exam-question-types/qa/probe-interact.mjs
   81 research/exam-question-types/qa/probe-wordladder.mjs
  115 scripts/configure-cloud-auth-email.mjs
```

(These counts are `split('\n').length`, i.e. `wc -l` + 1. §2 restates them as `wc -l`.)

### C. The parked seam is wired — path from a page to `cat-engine`

```
$ node /tmp/gtaudit/path.mjs <worktree> packages/cat-engine/src/index.ts
######## packages/cat-engine/src/index.ts
  apps/web/src/app/dev/exam-two-stage/page.tsx
    -> apps/web/src/components/exam/two-stage-exam.tsx
      -> apps/web/src/lib/exam/cat-scoring.ts
        -> packages/cat-engine/src/index.ts
  importers (3):
     [test] apps/web/src/lib/exam/cat-adapter.test.ts
            apps/web/src/lib/exam/cat-adapter.ts
            apps/web/src/lib/exam/cat-scoring.ts

######## packages/cat-engine/src/persona-sim/latent.ts
  apps/web/src/app/dev/exam-two-stage/page.tsx
    -> apps/web/src/components/exam/two-stage-exam.tsx
      -> apps/web/src/lib/exam/cat-scoring.ts
        -> packages/cat-engine/src/index.ts
          -> packages/cat-engine/src/persona-sim/index.ts
            -> packages/cat-engine/src/persona-sim/latent.ts

######## packages/cat-engine/src/psychometric-lab/index.ts
  NOT REACHABLE from a runtime root
  importers (3):
            scripts/psychometric-sweep/run-engagement-sweep.ts
            scripts/psychometric-sweep/run-lambda-sweep.ts
            scripts/psychometric-sweep/run-selection-sweep.ts
```

The last block is the firewall working: `psychometric-lab` is script-only, as
documented. The middle block is the leak.

### D. `item-bank` is type-only, not runtime-live

```
$ sed -n '1,10p' apps/web/src/lib/exam/cat-adapter.ts
import type {
  IrtParameters as EngineIrtParameters,
  ItemParameters,
  RawResponse,
} from '@gt-selection/cat-engine';
import type { ExamItem, PersistedResponse } from '@gt-selection/contracts';
import type { BankItem as SpecBankItem } from '@gt-selection/item-bank';

$ rg -n "from 'node:|require\('node:" packages/item-bank/src packages/cat-engine/src
packages/item-bank/src/rng.ts:1:import { createHash } from 'node:crypto';
packages/cat-engine/src/lambda/invoke-local.ts:14:import { readFileSync } from 'node:fs';
(plus 3 test files)

$ head -3 apps/web/src/components/exam/two-stage-exam.tsx
'use client';
```

Every `item-bank` import is `import type`, so its 3,902 lines ship nothing.
`cat-engine`'s only `node:` import is `invoke-local.ts`, which is not in the barrel.

### E. `application.ts` — the dead region

```
$ cat packages/contracts/src/index.ts
export * from './api-envelope';
export * from './assessment-exam';
export {
  assessmentInputSchema, assessmentRoutingSchema, assessmentValiditySchema,
  assessmentVersionSchema, recordAssessmentVersionRequestSchema,
  recordAssessmentVersionResponseDataSchema, recordAssessmentVersionResponseSchema,
} from './application';
export type {
  AssessmentInput, AssessmentRouting, AssessmentValidity, AssessmentVersion,
  RecordAssessmentVersionRequest, RecordAssessmentVersionResponse,
} from './application';
export * from './correction';
… (onboarding, decision, errors, reason-codes, replay, review, roles, workflow)

$ rg -n "['\"]\./application['\"]|contracts/src/application" -g '!docs/**' .
./packages/contracts/src/index.ts:11:} from './application';
./packages/contracts/src/index.ts:19:} from './application';
./packages/contracts/src/correction.ts:4:import { assessmentInputSchema } from './application';
                         ← three importers, all inside the package

$ rg -n "from '\./application'" packages/contracts/src/*.test.ts
                         ← empty: NO test imports ./application

$ rg -n "@gt-selection/contracts/" -g '!*.md' .
                         ← empty: no deep import can bypass the barrel
```

The duplication that makes it dead:

```
$ rg -n "export const (saveApplicationDraftRequestSchema|applicationDraftSchema)" packages/contracts/src/
packages/contracts/src/onboarding.ts:417:export const applicationDraftSchema = z
packages/contracts/src/onboarding.ts:428:export const saveApplicationDraftRequestSchema = z
packages/contracts/src/application.ts:82:export const applicationDraftSchema = z
packages/contracts/src/application.ts:94:export const saveApplicationDraftRequestSchema = z

$ sed -n '1,25p' packages/contracts/src/contracts.test.ts | rg "from"
} from './index';        ← the tests exercise onboarding.ts's copies, via the barrel

$ rg -n "application\.ts|onboarding\.ts" docs/audit/DUPLICATE_MODELS.md
                         ← empty: the prior duplicate-model audit missed this pair
```

Which names have an `onboarding.ts` replacement:

```
applicationStateSchema              onboarding.ts: 1
priorSchoolSchema                   onboarding.ts: 0     ← abandoned, no replacement
applicationStudentSchema            onboarding.ts: 0     ← abandoned
applicationEducationSchema          onboarding.ts: 0     ← abandoned
applicationGuardianSchema           onboarding.ts: 0     ← abandoned
applicationFinalSubmissionSchema    onboarding.ts: 1
applicationDraftSchema              onboarding.ts: 1
saveApplicationDraftRequestSchema   onboarding.ts: 1
applicationVersionSchema            onboarding.ts: 1
saveApplicationDraftResponseSchema  onboarding.ts: 1
getApplicationStatusRequestSchema   onboarding.ts: 1
getApplicationStatusResponseSchema  onboarding.ts: 1
submitApplicationRequestSchema      onboarding.ts: 1
submitApplicationResponseSchema     onboarding.ts: 1
```

### F. CSS — unused custom properties, with a control group

```
$ for v in --gt-ember --gt-petrol --gt-font-body --gt-color-accent \
           --gt-black --color-primary-soft --gt-shadow-card --gt-grey-light; do
    echo "$v $(rg -o "var\(\s*$v\b" apps/web | wc -l)"; done
--gt-ember             0
--gt-petrol            0
--gt-font-body         0
--gt-color-accent      0
--gt-black             0
--color-primary-soft   0
--gt-shadow-card       0
--gt-grey-light        0

$ # control group — the detector works
--gt-gold              48
--color-ink            92
--gt-space-4           51
--gt-shadow-pop         2
--font-body            27
```

33 of 83 declared properties are unreferenced; 29 are the documented legacy-alias
block at `globals.css:79-115`, whose own comment explains it exists for
"not-yet-migrated reference[s]" that no longer exist.

### G. CSS classes — including a false positive of my own tooling

```
$ node /tmp/gtaudit/css.mjs <worktree>
apps/web/src/components/family/assessment-gate.module.css  (7 of 14)
    cardReady, included, feeRow, feeLabel, feeAmount, ghost, payRow
apps/web/src/components/family/family-dashboard.module.css  (3 of 27)
    active, done, upcoming                    ← FALSE POSITIVE, see below
apps/web/src/components/family/steps.module.css  (3 of 20)
    optHint, control, selectWrap
```

`family-dashboard` is wrong. The classes are applied by **dynamic index**:

```
$ rg -n "styles\[" apps/web/src
apps/web/src/components/family/family-dashboard.tsx:109:  <div className={`${styles.phaseCard} ${styles[state]}`}>

$ rg -n "'done' : index === activePhase" apps/web/src/components/family/family-dashboard.tsx
100:  index < activePhase ? 'done' : index === activePhase ? 'active' : 'upcoming';
```

So `.active`, `.done`, and `.upcoming` are all used. **`family-dashboard.module.css`
has zero unused classes** and is excluded from §3. The other two files were
re-verified by enumerating each component's full used set:

```
$ rg -o "styles\.[a-zA-Z][\w]*" apps/web/src/components/family/assessment-gate.tsx | sort -u
styles.card  styles.cardInvite  styles.kicker  styles.lockedBtn
styles.note  styles.primary  styles.title      ← the 7 flagged names are absent

$ rg -o "styles\.[a-zA-Z][\w]*" apps/web/src/components/family/steps.tsx | sort -u
styles.ack styles.addBtn styles.autofill styles.card styles.cardNote
styles.cardTitle styles.check styles.colFull styles.grid styles.legal
styles.plainLabel styles.relRemove styles.relRow styles.req styles.stack
styles.subToggle styles.textarea            ← optHint/control/selectWrap absent
```

The brand-refactored modules are clean:

```
two-stage-exam.module.css  defined=40  dynamicIndexing=false  unused=[]
synthetic-exam.module.css  defined=7   dynamicIndexing=false  unused=[]
exam-runner.module.css     defined=32  dynamicIndexing=false  unused=[]
```

### H. Assets — the template-path trap

```
$ sed -n '34,37p' apps/web/src/lib/exam/bank.ts
function demo(typeCode: string): string {
  return `/exam-demos/${typeCode}.html`;
}

$ # each demo's typeCode in NON-TEST app source
$ for f in $(git ls-files 'apps/web/public/exam-demos/*.html'); do … done
  demos with no non-test typeCode reference: 0 / 28

$ rg -n "blueprint-lines" apps/web/src | wc -l
5
```

A literal grep for `exam-demos/CX-diverge-01.html` returns nothing. All 28 are live.

### I. SQL — every function invoked, and the unreferenced exam schema

```
$ rg -oiN "create (or replace )?function [a-z_]+\.[a-z0-9_]+" supabase/migrations \
    | sed -E 's/.*function //I' | sort -u | wc -l
29
                         ← all 29 have ≥1 invocation; api.* 5-6 app refs each,
                           app.* 3-47 SQL refs each (constraints, policies, triggers)

$ rg -c "create table" supabase/migrations/20260727120000_exam_data_model.sql
9                        ← exam_policy, exam_question_type, exam_item, exam_participant,
                           exam_session, exam_session_progress, exam_item_response,
                           exam_telemetry_event, exam_session_outcome
$ rg -c "^create index"  supabase/migrations/20260727120000_exam_data_model.sql
2
$ rg -c "^create policy" supabase/migrations/20260727120000_exam_data_model.sql
17

$ rg -l "exam_session|exam_item|exam_telemetry_event|exam_participant|exam_policy|exam_question_type" apps/web
                         ← no matches: apps/web never names an exam table
$ rg -l "…same pattern…" packages
packages/db-types/src/exam.ts
                         ← the only non-SQL mention in the repo, and it only types them

$ rg -o 'plan\((\d+)\)' -r '$1' supabase/tests/*.test.sql    | paste -sd+ - | bc
204                      ← executing
$ rg -o 'plan\((\d+)\)' -r '$1' supabase/tests/*.pending.sql | paste -sd+ - | bc
44                       ← never executed (.pending.sql suffix)
```

### J. Markers and commented-out code

```
$ rg -n "\b(TODO|FIXME|HACK|XXX)\b" -g '!docs/**' -g '!*.md' -g '!pnpm-lock.yaml' .
./apps/web/src/lib/family/address-lookup.ts:13: * TODO(B-06): replace with a real provider …

$ rg -c "^\s*//\s*(const|let|var|function|return|import|export|if\s*\(|for\s*\(|await|class|console\.)" \
      --glob '*.ts' --glob '*.tsx' --glob '*.mjs' -g '!docs/**' . | paste -sd+ - | bc
1                        ← and that one line is prose, not code
```

### K. tsconfig coverage

```
$ node /tmp/gtaudit/tsconfig-cover.mjs <worktree>
apps/web/tsconfig.json:            126 tracked file(s)
packages/cat-engine/tsconfig.json:  39
packages/contracts/tsconfig.json:   21
packages/db-types/tsconfig.json:     3
packages/item-bank/tsconfig.json:   27
packages/test-fixtures/tsconfig.json: 5
scripts/persona-sim/tsconfig.json:   4
scripts/psychometric-sweep/tsconfig.json: 4
tsconfig.base.json: NO "include" -> matches nothing on its own

tracked .ts/.tsx: 235; covered: 229; UNCOVERED: 6
   docs/critic-ready-product-roadmap.canvas.tsx
   scripts/check-generated-types.ts
   scripts/check-security-boundaries.ts
   scripts/check-workspace-boundaries.ts
   scripts/create-local-auth-users.ts
   scripts/verify.ts
```

An earlier run of this check reported 119 uncovered files. That was a bug in my glob
translator (`**/*.ts` failing to match nested paths); it is corrected above, and the
before/after is recorded because the wrong number looked plausible.

### L. Phantom dependencies

```
$ cat apps/web/eslint.config.mjs | head -1
import { defineConfig, globalIgnores } from 'eslint/config';

$ rg -n '"eslint"' apps/web/package.json
                         ← empty: eslint is not declared in apps/web

$ node /tmp/gtaudit/deps.mjs <worktree> | rg -A2 PHANTOM
## gt-selection-capstone
  IMPORTED, not declared here (PHANTOM / relies on hoisting):
    - cursor  in 1 file(s): docs/critic-ready-product-roadmap.canvas.tsx
## @gt-selection/web
  IMPORTED, not declared here (PHANTOM / relies on hoisting):
    - eslint  in 1 file(s): apps/web/eslint.config.mjs
```

### M. Static test counts (declarations, not executions)

`node_modules` is absent, so no suite was run. These are counted declarations and
are **[I]**, an upper bound on files and a lower bound on cases (`it.each` expands):

```
apps/web                27 test files, 135 it/test declarations
packages/cat-engine      16 test files, 179   (persona-sim 64, psychometric-lab 39)
packages/contracts        8 test files,  54
packages/item-bank        5 test files,  37
packages/test-fixtures    3 test files,  25
                         ─────────────────────
                         59 files,      430 declarations
```

The prior audit measured **336 passing tests** by running the suite. The gap is
consistent with the new `persona-sim` and `psychometric-lab` suites (103
declarations) landing since, plus `it.each` expansion. **Not a contradiction, and
not a verification either** — re-run `pnpm -r --if-present run test` after
`pnpm install` to measure it.








