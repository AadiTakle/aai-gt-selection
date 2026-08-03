# Repository Reachability Map

**Branch audited:** `feat/repo-structure-audit` @ `5c2c2ab` (identical tree to
`feat/test-structure-revamp`, `feat/persona-sim`, `feat/exam-cat-adapter-wire`).
**Date:** 2026-07-27. **Scope:** `apps/web/src`, `packages/*/src`, `scripts/`.
**Status:** descriptive audit. Creates no decision and ratifies no direction.

This document answers one question: *starting from the things that actually
execute, what code is reached?* Nothing here is a recommendation to delete.
Section 6 separates "dead" from "parked" because conflating them is the single
most likely way a document like this misleads.

---

## 1. Method (and its limits)

An import graph was built over all **198 tracked `.ts/.tsx/.mjs/.js` files** in
`apps/web`, `packages/`, and `scripts/`, resolving four specifier forms:

| Form | Example | Resolution |
| --- | --- | --- |
| Bare workspace | `@gt-selection/contracts` | `exports["."]` in that package's `package.json` |
| Deep workspace | `@gt-selection/item-bank/foo` | path-joined into the package dir |
| Path alias | `@/lib/exam/session` | `apps/web/src/*` (from `apps/web/tsconfig.json` `paths`) |
| Relative | `./scoring`, `../item` | resolved against the importing file's directory |

Statements matched: `import … from`, bare `import '…'`, `export … from`,
dynamic `import('…')`, `require('…')`, and `vi.mock('…')`. Extension probing
covered `.ts .tsx .mjs .cjs .js .jsx` and `/index.*`.

**Why this matters.** A naive `rg 'exam/scoring'` finds nothing for
`apps/web/src/lib/exam/scoring.ts`, because its only non-test importer writes
`from './scoring'` (`apps/web/src/lib/exam/session.ts:3`). Every deadness claim
below was resolved through the graph, then re-checked by hand against all three
import forms.

**Completeness check.** 24 specifiers failed to resolve. All 24 are CSS modules
(`./x.module.css`) or one JSON data file
(`packages/cat-engine/src/measurements.ts` → `./measurements.data.json`). **Zero
TypeScript imports were left unresolved**, so the code graph is complete.

### Known limits — read before acting on this

1. **Non-import references are invisible to the graph.** Two of four initially
   ORPHANED files turned out to be reached by a bundler alias and a documented
   hand-run command. Both are reclassified in §5. Assume the graph
   *under*-counts reachability; treat every ORPHANED result as a candidate to
   investigate, never as proof.
2. **Next.js file-system routing is assumed, not proven.** Entry points were
   taken to be every `page/route/layout/template/*.tsx?` under
   `apps/web/src/app` plus `apps/web/src/proxy.ts`. This matches the App Router
   convention and the files present, but no build was run to confirm the route
   manifest.
3. **`TOOLING` is a coarse bucket.** It means "reached from an npm script or a
   build/test config", not "valuable" or "currently run in CI". §4 gives the
   specific script for each.
4. **No dynamic/string-built import paths were found**, so that false-negative
   class does not apply here — but it was not exhaustively proven absent.

---

## 2. Entry points used as graph roots

**Runtime roots (29).** 28 App Router files + `apps/web/src/proxy.ts`:

```
apps/web/src/app/(embed)/{admissions,config-audit,review}/page.tsx
apps/web/src/app/(embed)/family/{,apply,assessment,dashboard,exam}/page.tsx
apps/web/src/app/(embed)/family/template.tsx, (embed)/layout.tsx
apps/web/src/app/api/{address,exam-results,health,schools,session}/route.ts
apps/web/src/app/auth/{callback,signout}/route.ts
apps/web/src/app/dev/exam-shell/page.tsx, dev/exam-two-stage/page.tsx
apps/web/src/app/dev/family-preview/{,apply,assessment,dashboard,exam}/page.tsx
apps/web/src/app/dev/family-preview/template.tsx
apps/web/src/app/{layout.tsx,page.tsx,login/page.tsx}
apps/web/src/proxy.ts
```

**npm-script roots (12)**, discovered by scanning every `package.json` script
for a file path that exists in the tree:

| Entry file | Script |
| --- | --- |
| `scripts/verify.ts` | `verify` |
| `scripts/check-workspace-boundaries.ts` | `boundaries:check` |
| `scripts/check-security-boundaries.ts` | `security:scan` |
| `scripts/check-generated-types.ts` | `db:types:check` |
| `scripts/create-local-auth-users.ts` | `db:users` |
| `packages/db-types/src/database.generated.ts` | `db:types` (output target) |
| `packages/db-types/src/index.ts` | `@gt-selection/db-types:lint` |
| `packages/item-bank/scripts/gen-type-registry.ts` | `item-bank:generate` |
| `packages/item-bank/scripts/build-bank.ts` | `item-bank:generate` |
| `packages/item-bank/scripts/qa-report.ts` | `item-bank:generate` |
| `packages/cat-engine/src/lambda/invoke-local.ts` | `cat-engine:invoke:local` |
| `apps/web/vitest.integration.config.ts` | `web:test:integration` |

**Config roots (6):** `apps/web/{next,playwright,vitest,vitest.integration,eslint}.config.*`
and `apps/web/vitest.setup.ts`.

**Lambda handlers:** none deployed. `infra/` is Terraform only (9 `.tf` files, no
JS/TS). `packages/cat-engine/src/lambda/handler.ts` is a Lambda-shaped handler
but is reached only via the local `invoke:local` script — see §4.

---

## 3. Classification totals

| Category | Files | LOC | Meaning |
| --- | ---: | ---: | --- |
| **LIVE** | 101 | 12,148 | Reachable from a page, route, or the proxy |
| **TOOLING** | 44 | 5,871 | Reachable only from an npm script or build/test config |
| **TEST-ONLY** | 63 | 8,158 | Reachable only from `*.test.*` / `e2e/` |
| **ORPHANED** | 4 | 142 | No importer found by the graph |
| **Total** | 212 | 26,319 | (198 source files + 14 config/e2e files) |

Per-area breakdown (`files/LOC`):

| Area | LIVE | TOOLING | TEST-ONLY | ORPHANED |
| --- | --- | --- | --- | --- |
| `apps/web/src/app` | 28/842 | – | 1/95 | – |
| `apps/web/src/components` | 28/4,109 | – | 6/312 | – |
| `apps/web/src/lib/exam` | 10/1,849 | – | 11/883 | – |
| `apps/web/src/lib` (other) | 18/1,738 | – | 8/972 | 2/25 |
| `apps/web` root/config | 1/54 | 6/135 | 3/106 | 1/2 |
| `apps/web/e2e` | – | – | 3/176 | – |
| `packages/contracts` | 13/2,931 | – | 8/2,390 | – |
| `packages/db-types` | 3/625 | – | – | – |
| `packages/cat-engine` | **0/0** | 12/1,072 | 12/1,036 | – |
| `packages/item-bank` | **0/0** | 21/4,383 | 6/497 | – |
| `packages/test-fixtures` | – | – | 5/1,691 | – |
| `scripts` | – | 5/281 | – | 1/115 |

**The headline number: `cat-engine` and `item-bank` contribute 0 LOC to LIVE.**
Counting source only (excluding their own tests), that is **5,623 LOC**
(`cat-engine` 14 files/1,186 LOC + `item-bank` 22 files/4,437 LOC) that no
rendered page reaches. Note 2,046 of `item-bank`'s LOC are one generated file
(`src/generated/type-registry.generated.ts`), so **hand-written parked source is
≈3,577 LOC**. The previously-reported "~5,100 LOC parked" is in the right range;
the precise figures are above.

---

## 4. LIVE packages and how they are reached

Only **two** of the five workspace packages are reachable from a rendered page.

### `@gt-selection/contracts` — LIVE, load-bearing (confirmed)

33 direct importers of `packages/contracts/src/index.ts` (25 files use the bare
`@gt-selection/contracts` specifier; the rest are internal). Spans onboarding,
family, auth, and exam. Representative chain:

```
apps/web/src/app/(embed)/family/dashboard/page.tsx
  -> apps/web/src/components/family/dashboard-loader.tsx
  -> packages/contracts/src/index.ts
```

Prior finding #5 ("genuinely load-bearing, ~25 importers") is **confirmed**.

### `@gt-selection/db-types` — LIVE

```
apps/web/src/proxy.ts -> packages/db-types/src/index.ts
  -> packages/db-types/src/{database.generated.ts, exam.ts}
```

Note `db-types/src/exam.ts` (625 LOC area) is pulled in through the package
barrel; it is type-only and describes tables from a **held, unapplied**
migration (`supabase/migrations/20260727120000_exam_data_model.sql`; see the
file header at `packages/db-types/src/exam.ts:1-18`).

### The live exam runtime

All four exam surfaces converge on the same shell:

```
apps/web/src/app/(embed)/family/exam/page.tsx           (auth-gated: requireRole(['family']))
apps/web/src/app/dev/family-preview/exam/page.tsx
  -> components/exam/preview-exam.tsx -> exam-runner.tsx -> item-player.tsx
       -> lib/exam/session.ts -> {scoring.ts, harvest.ts, item.ts, sequencer.ts}
       -> lib/exam/bank.ts

apps/web/src/app/dev/exam-shell/page.tsx      -> components/exam/synthetic-exam.tsx
apps/web/src/app/dev/exam-two-stage/page.tsx  -> components/exam/two-stage-exam.tsx
```

**Prior finding #4 is confirmed: `scoring.ts` and `harvest.ts` are LIVE.**

- `apps/web/src/lib/exam/scoring.ts` — 2 importers: `scoring.test.ts` and
  `apps/web/src/lib/exam/session.ts:3` (`import { scoreResponse } from './scoring'`).
  4 runtime chains.
- `apps/web/src/lib/exam/harvest.ts` — 3 importers: its test,
  `session.ts`, and `components/exam/renderers/embedded-demo-renderer.tsx`.
  4 runtime chains.

Both would have been mislabelled dead by a path-substring grep.

---

## 5. ORPHANED results, individually adjudicated

The graph returned four. **Two are false positives of my own tool.** This is
reported prominently because it calibrates how much to trust the ORPHANED
column generally.

| File | LOC | Verdict | Evidence |
| --- | ---: | --- | --- |
| `apps/web/vitest.server-only.ts` | 2 | **FALSE POSITIVE — TOOLING** | Loaded by bundler alias, not import: `apps/web/vitest.config.ts:14` and `apps/web/vitest.integration.config.ts:13` both map `'server-only' → vitest.server-only.ts`. Deleting it breaks both test configs. |
| `scripts/configure-cloud-auth-email.mjs` | 115 | **FALSE POSITIVE — TOOLING (hand-run)** | A documented operator script, invoked by hand: `docs/DEMO_TONIGHT.md:69,105,118`; usage in its own header at lines 33-36. Never imported by design. |
| `apps/web/src/lib/contracts.ts` | 1 | **GENUINELY ORPHANED** | Body is one line: `export * from '@gt-selection/contracts';`. Zero importers — `rg "@/lib/contracts"` returns nothing. |
| `apps/web/src/lib/family/address-lookup.ts` | 22 | **GENUINELY ORPHANED — superseded** | Zero references anywhere (`rg address-lookup` → only itself). |

### The two real orphans are interesting for different reasons

**`apps/web/src/lib/contracts.ts` is a convention nobody followed.**
`docs/architecture/ARCHITECTURE_PLAN.md:229` describes it as "the
application-facing re-export". In practice all 25 consumers import
`@gt-selection/contracts` directly. So either the doc or the file is wrong. This
is a documentation-vs-code drift question, not a cleanup question — decide which
you want before removing anything.

**`address-lookup.ts` was overtaken by its own replacement.** Its header
(lines 4-15) says: *"When those are resolved, swap the body for a server route
that proxies a real provider … mirroring how `/api/schools` proxies the NCES
directory."* That route now exists — `apps/web/src/app/api/address/route.ts`
implements exactly that (Nominatim upstream, synthetic fallback), and
`components/family/address-autocomplete.tsx:5` imports its types directly. Both
the old seam and the new route filter the same `ADDRESS_SUGGESTIONS` from
`lib/family/vocab.ts`. This is **superseded dead code**, the clearest
safe-to-remove item in the repo. Confidence: high.

**Lint note.** `scripts/configure-cloud-auth-email.mjs` alone produces **22 of
the repo's 23 lint errors** (see the appendix in `AUDIT_SUMMARY.md`). It is not
dead, but it is the single highest-leverage lint fix available.

---

## 6. Dead vs parked — the distinction that matters

These need different decisions. Removing parked code destroys deliberate work;
keeping dead code costs maintenance and misleads readers.

### 6a. DEAD — nothing reaches it, and nothing is waiting for it

| Item | LOC | Confidence |
| --- | ---: | --- |
| `apps/web/src/lib/family/address-lookup.ts` | 22 | **High** — replacement shipped and in use |
| `apps/web/src/lib/contracts.ts` | 1 | **Medium** — dead in fact, but documented as the intended convention |

Total genuinely dead: **23 LOC**. The repo has very little classic dead code.

### 6b. PARKED — deliberately built ahead of a consumer that does not exist yet

This is where the mass is.

**`packages/cat-engine`** — 14 source files, 1,186 LOC, 10 test files, 75 tests
passing. Its `package.json` describes it as the "Intended AWS Lambda payload for
D-019". Reachability:

- From a rendered page: **none**.
- From an npm script: yes, one — `invoke:local`:
  ```
  packages/cat-engine/src/lambda/invoke-local.ts -> lambda/event.ts -> replay.ts
    -> item-scoring.ts -> {scoring.ts, theta.ts -> irt.ts}
  ```
- Its own public barrel `packages/cat-engine/src/index.ts` is **TEST-ONLY**: the
  only importers are `apps/web/src/lib/exam/cat-adapter.ts` and that file's test.
- **No Lambda is deployed.** `infra/` is Terraform with no function packaging for
  this handler (verified: `git ls-files 'infra/**'` → 9 `.tf` files + README).

**`packages/item-bank`** — 22 source files, 4,437 LOC (2,046 generated), 53 tests
passing. Reachable only from `pnpm --filter @gt-selection/item-bank generate`
(`gen-type-registry` → `build-bank` → `qa-report`). Its barrel
`packages/item-bank/src/index.ts` is likewise **TEST-ONLY**.

**The parked seam, stated precisely.** `item-bank` generates a real bank —
`packages/item-bank/data/bank/items.bank.jsonl` and `data/served/items.served.jsonl`,
**257 items each** (`wc -l`). Nothing in `apps/web` reads either file
(`rg 'items\.bank\.jsonl|items\.served\.jsonl'` outside `packages/item-bank/`
returns only that package's own script and test). Meanwhile the live exam UI
uses `apps/web/src/lib/exam/bank.ts`, a **hand-written array of 8 items**
(`bank.ts:39-96`) pointing at static HTML under `apps/web/public/exam-demos/`
(28 files).

> **So there are two parallel content systems on this branch: a 257-item
> generated bank that nothing renders, and an 8-item hardcoded bank that is the
> only thing users see.** Neither is broken; they are simply not connected.

**`apps/web/src/lib/exam/cat-adapter.ts`** — the intended bridge. Its only
importer is its own test (`cat-adapter.test.ts`). It is the single file that
imports both `@gt-selection/cat-engine` and `@gt-selection/item-bank`.
**Prior finding #2 is confirmed exactly as stated.**

> **Status of the parallel wiring effort — this moved during the audit.**
> At the start of this audit, `feat/exam-cat-adapter-wire` resolved to `5c2c2ab`,
> the identical commit as this branch, with an empty `git diff --stat`. By the
> end of the audit it had advanced to `4fae489`:
>
> ```
> $ git diff --stat HEAD feat/exam-cat-adapter-wire
>  apps/web/src/components/exam/two-stage-exam.tsx |  64 +++++
>  apps/web/src/lib/exam/cat-adapter.test.ts       |  67 +++++
>  apps/web/src/lib/exam/cat-adapter.ts            | 103 ++++++-
>  apps/web/src/lib/exam/cat-scoring.test.ts       | 179 +++++++++++
>  apps/web/src/lib/exam/cat-scoring.ts            | 178 +++++++++++
>  5 files changed, 587 insertions(+), 4 deletions(-)
> ```
>
> That branch now adds a `cat-scoring.ts` module and wires `cat-adapter` into
> `two-stage-exam.tsx` — i.e. **finding #2 is being actively resolved there.**
> Everything in this document describes `feat/repo-structure-audit` @ `5c2c2ab`,
> where `cat-engine`/`item-bank` remain unreachable. Re-run the reachability
> commands in §8 after that branch merges; the LIVE/TOOLING split for
> `cat-engine` will change. I did not analyse `4fae489` — it landed
> mid-audit and is outside the audited tree.

**`packages/test-fixtures`** — 5 files, 1,691 LOC, TEST-ONLY. This is correct
and intended for a fixtures package; it is not a problem.

### 6c. Not parked, not dead — just quietly unrun

`supabase/tests/120_exam_schema_security.pending.sql` and
`130_exam_rls_noninterference.pending.sql` use the `.pending.sql` suffix, so
`supabase test db` (which globs `*.test.sql`) never runs them. Gen-A therefore
has **zero executing exam-level database tests**, despite shipping two exam
migrations. Flagged here because it is easy to mistake their presence for
coverage.

---

## 7. What this means for a cleanup decision

Ordered by ratio of certainty to effort. **No action is taken by this document.**

1. **Delete `apps/web/src/lib/family/address-lookup.ts`** (22 LOC). Proven
   superseded. Zero risk.
2. **Resolve `apps/web/src/lib/contracts.ts`** — either adopt the documented
   convention or delete the file and correct `ARCHITECTURE_PLAN.md:229`.
   Currently the repo does neither.
3. **Fix or retire `scripts/configure-cloud-auth-email.mjs`** — clears 22 of 23
   lint errors. It is live tooling, so fix (add an eslint env) rather than delete
   unless the deferred email work is cancelled.
4. **Decide the fate of the parked seam** (`cat-engine` + `item-bank` +
   `cat-adapter`, ~5,600 LOC, 128 passing tests). The choice is *wire it* or
   *archive it* — but it should not silently remain in the third state of
   "maintained, tested, and unreachable". **This decision is entangled with the
   Gen-A/Gen-B choice** (see `GEN_A_VS_GEN_B.md`): Gen-B has no `cat-engine` and
   no `item-bank` at all, so choosing Gen-B moots this work.
5. **Leave `test-fixtures` alone.** TEST-ONLY is its job.

---

## 8. Reproduction

The graph builder used for this document is not committed (this audit adds no
code). To reproduce the headline classifications with stock tools:

```bash
# LIVE-ness of scoring.ts / harvest.ts via all three import forms
rg -n "from '\./scoring'|from '@/lib/exam/scoring'|exam/scoring" apps/web/src --glob '!*.test.*'
rg -n "from '\./harvest'|from '@/lib/exam/harvest'|exam/harvest" apps/web/src --glob '!*.test.*'

# cat-engine / item-bank reachability from app code
rg -n "@gt-selection/(cat-engine|item-bank)" apps/web/src

# the only importer of cat-adapter
rg -n "cat-adapter" apps/web/src

# generated bank exists but is unread by the app
wc -l packages/item-bank/data/bank/items.bank.jsonl
rg -n "items\.bank\.jsonl|items\.served\.jsonl" apps packages scripts --glob '!*.jsonl'

# orphan false positive: bundler alias, not an import
rg -n "vitest.server-only" apps/web
```

Verbatim output of these commands is pasted in `AUDIT_SUMMARY.md` §Appendix.
