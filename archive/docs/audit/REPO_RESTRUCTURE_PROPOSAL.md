# Repository Restructure Proposal

**Branch analysed:** `feat/repo-restructure-audit` (tree identical to the Gen-A tip
including the landed `cat-adapter` wiring). **Date:** 2026-07-28.
**Status:** proposal only. **No file in this repository was modified, moved,
renamed, deleted, or reformatted to produce this document.** The only change is
the addition of this file.

**Companion documents — read those for the findings this one deliberately does
not re-derive:**
[`AUDIT_SUMMARY.md`](AUDIT_SUMMARY.md) ·
[`REPO_REACHABILITY_MAP.md`](REPO_REACHABILITY_MAP.md) ·
[`DUPLICATE_MODELS.md`](DUPLICATE_MODELS.md) ·
[`GEN_A_VS_GEN_B.md`](GEN_A_VS_GEN_B.md) ·
[`BRANCH_CLEANUP_PLAN.md`](BRANCH_CLEANUP_PLAN.md)

Those five cover reachability, duplicate domain models, the two-stack
comparison, and branch cleanup. This document covers the one thing they do not:
**where files should live.**

### Evidence labels

| Label | Meaning |
| --- | --- |
| `[V]` | Verified by a command run for this document. Output is in the Appendix. |
| `[I]` | Inference from verified facts, reasoning stated inline. |
| `[A]` | Assumption. Requires the owner's confirmation. |

### Verification limits — read before trusting a `[V]`

This worktree has **no `node_modules`** (Appendix A.0), so `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm boundaries:check` **could
not be executed**. Installing them would have written a lockfile and was out of
scope. Consequently:

- Every `[V]` here is a **static** claim, verified with `git`, `rg`, `wc`,
  `git hash-object`, or a read-only Node script.
- `boundaries:check` was verified by **re-implementing its exact logic**
  in-process against this tree (Appendix A.6), not by running the npm script.
- No claim in this document depends on a build or a test run. Where a
  recommendation needs a runtime check, that check is named as a migration
  verification step rather than asserted as already done.

---

## 1. Executive summary

### 1.1 The five changes with the best benefit-to-risk ratio

Ordered by benefit per unit of risk. All five are **decision-independent** —
none of them prejudges the Gen-A/Gen-B question.

**1. Stop re-exporting `lambda/` from the `cat-engine` public barrel.**
*Two deleted lines. No file moves.*
`packages/cat-engine/src/index.ts:28-29` re-exports `./lambda/event` and
`./lambda/handler` `[V]`. Since the `cat-adapter` wiring landed, that barrel is
reached from a `'use client'` component:

```
app/dev/exam-two-stage/page.tsx
  -> components/exam/two-stage-exam.tsx      ← 'use client'
  -> lib/exam/cat-scoring.ts
  -> @gt-selection/cat-engine (barrel)
  -> src/lambda/handler.ts + src/lambda/event.ts
```

`[V]` — Appendix A.4. A serverless request handler is now on the import path of
a browser bundle. **Checkable benefit:** after the change, `rg "lambda" ` over
the client graph returns nothing, and the handler can only be reached by an
explicit deep import.

*Note this also invalidates a stale finding.* `REPO_REACHABILITY_MAP.md` §3
records `cat-engine` at **0 LOC LIVE**. That was true at `5c2c2ab`; it is **no
longer true on this tree** `[V]`. The reachability map itself flagged this would
change (§6b, "Status of the parallel wiring effort"). Treat its `cat-engine`
LIVE/TOOLING split as superseded.

**2. Move `cat-engine`'s two research subtrees out of the shipping package.**
`cat-engine` is 2,968 source LOC, of which the actual scoring/replay engine is
**1,004 LOC — 34%** `[V]`:

| Subtree | Src files | Src LOC | Share | Is it the "engine"? |
| --- | ---: | ---: | ---: | --- |
| core (`irt`, `theta`, `scoring`, `replay`, `rng`, …) | 11 | 1,004 | 34% | Yes |
| `persona-sim/` | 4 | 1,162 | **39%** | No — synthetic data generator |
| `psychometric-lab/` | 5 | 621 | 21% | No — research estimators |
| `lambda/` | 3 | 181 | 6% | No — deployment adapter |

The package's own description reads *"pure exam scoring + deterministic-replay
engine (no web/DB dependencies)"* `[V]`. The largest subtree in it is a persona
simulator. **Checkable benefit:** the parked/experimental status of 1,783 LOC
becomes visible from its path instead of from a comment.

**3. Split `docs/` by audience and lifetime.**
`docs/` has 14 root-level files, of which **9 are dated or session-transient**
(`OVERNIGHT_*` ×5, `HANDOFF_2026-07-28`, `PSYCHOMETRIC_SWEEP_2026-07-28`,
`GENB_VERIFICATION_2026-07-28`, `PERSONA_SIM_RESULTS`, `DEMO_TONIGHT`) `[V]`.
They sit beside `docs/governance/` — the tree `AGENTS.md` names as canonical.
A newcomer cannot tell from the layout which documents bind them.
**Checkable benefit:** after the split, `ls docs/` shows only durable trees, and
"is this doc authoritative?" is answerable from the path.

**4. Guard the two verified `research/` → production duplications instead of
moving them.**
Both are byte-identical copies with **no drift guard** `[V]`:

| Copy | Source | Evidence |
| --- | --- | --- |
| `apps/web/public/exam-demos/*.html` (28 files) | `research/exam-question-types/demos/` | All 28 share a git blob hash with their source (Appendix A.7) |
| `packages/cat-engine/src/measurements.data.json` | `research/exam-question-types/measurements.json` | Same blob `a768bb3d…`, 38,119 bytes each |

Do **not** dedupe these — see §7.1. Add a hash assertion instead. **Checkable
benefit:** a divergence becomes a failing test rather than a silent
inconsistency.

**5. Close the gap between what `boundaries:check` is named for and what it
does.** It enforces exactly two substring rules (§4.2). It does not check the
browser/server split, the dependency direction, acyclicity, or the package
`exports` map. The single hazard it most conspicuously misses — a package that
cannot be imported by the browser — is currently prevented by **a code
comment**. **Checkable benefit:** the guarantee moves from prose into CI.

### 1.2 What this proposal is *not*

It does not recommend a canonical stack, does not move `apps/web/src`, does not
reorganise `packages/contracts`, `db-types`, or `test-fixtures`, and does not
touch `supabase/` or `infra/`. §7 lists what to leave alone and why.

---

## 2. Current-state map

All counts are tracked files, computed for this document `[V]` (Appendix A.1–A.3).

### 2.1 Top level

**623 tracked files.**

| Tree | Files | What it is | Linted? | Prettier? | Triggers CI? |
| --- | ---: | --- | :-: | :-: | :-: |
| `apps/` | 183 | The Next.js app (one member, `@gt-selection/web`) | own config | yes | yes |
| `research/` | 154 | Question-type catalogue, demos, backend research | **no** | **no** | **no** |
| `packages/` | 117 | Five workspace packages | yes | yes | yes |
| `docs/` | 61 | Governance, product, architecture, audit, session output | **no** | **no** | **no** |
| `scripts/` | 37 | Five unrelated concerns, two languages | yes (TS/JS only) | yes | yes |
| `supabase/` | 33 | 15 migrations, 13 pgTAP tests, 2 `.pending.sql` | n/a | n/a | yes |
| `infra/` | 9 | Terraform: ECS, Aurora, Cognito, CloudFront | n/a | n/a | **no** |
| `brainlifting/` | 8 | Four BrainLift documents | **no** | **no** | **no** |
| `.github/` | 2 | `ci.yml`, `deploy.yml` | n/a | n/a | yes |

The lint/format columns come from `eslint.config.mjs` `ignores` and
`.prettierignore` `[V]`. The CI column comes from the `paths:` filter in
`.github/workflows/ci.yml:8-20` `[V]`. **`research/`, `docs/`, `brainlifting/`,
and `infra/` appear in none of the three.** §3.4 explains why that is a problem
for exactly one of them.

### 2.2 `packages/*`

| Package | Tracked | Src files | Src LOC | Test files | Test LOC | Workspace deps |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `cat-engine` | 44 | 23 | 2,968 | 16 | 2,056 | **none** |
| `contracts` | 24 | 13 | 2,918 | 8 | 2,382 | none |
| `db-types` | 6 | 3 | 622 | 0 | 0 | none |
| `item-bank` | 35 | 22 | 4,415 | 5 | 438 | `contracts` |
| `test-fixtures` | 8 | 2 | 1,350 | 3 | 336 | `contracts` |

`cat-engine` declares **no** workspace dependency. Its three textual references
to `@gt-selection/contracts` are all in comments explaining why it deliberately
does *not* import it `[V]` (Appendix A.5). That is a correct and well-documented
boundary.

**What each package actually owns:**

- **`contracts`** — Zod schemas and shared domain types. The only package with a
  broad live consumer base: 24 bare-specifier imports from `apps/web/src` `[V]`.
  `REPO_REACHABILITY_MAP.md` §4 confirms it is load-bearing.
- **`db-types`** — generated Supabase types plus a hand-authored `exam.ts` for a
  held migration. Reached through `apps/web/src/proxy.ts`.
- **`cat-engine`** — nominally the scoring engine; actually four things (§1.1).
- **`item-bank`** — item primitives, generators, solvers, and a 257-item
  generated bank. 2,046 of its LOC are one generated file. Its build step reads
  from `research/` (§3.4).
- **`test-fixtures`** — synthetic fixtures. TEST-ONLY by design and correctly so.

### 2.3 `apps/web/src`

| Subtree | Files | LOC |
| --- | ---: | ---: |
| `components/` | 55 | 8,212 |
| `lib/` | 50 | 5,912 |
| `app/` | 29 | 910 |

`lib/` splits into `exam/` (23 files), `family/` (12), `onboarding/` (6),
`supabase/` (2), and 7 loose root modules `[V]`. Plus 28 static demo HTML files
under `public/exam-demos/`.

### 2.4 `scripts/` — five concerns, two languages

| Concern | Files | Code LOC | Typechecked in CI? | Run in CI? |
| --- | ---: | ---: | :-: | :-: |
| Repo guards (`check-*.ts`, `verify.ts`) | 4 | 194 | **no** | yes (3 of 4) |
| Operator scripts (`configure-cloud-auth-email.mjs`, `create-local-auth-users.ts`) | 2 | 196 | **no** | 1 of 2 |
| `persona-sim/` (TS research harness) | 5 | 1,348 | **no** | no |
| `psychometric-sweep/` (TS research sweeps) | 5 | 1,858 | **no** | no |
| `validation-harness/` (**Python**) | 21 | 2,873 | n/a | **no** |

`scripts/` is not a workspace member — `pnpm-workspace.yaml` globs are `apps/*`
and `packages/*` only, and the lockfile's importer list confirms exactly six
members `[V]`. So `pnpm -r run typecheck` never reaches it. `persona-sim` and
`psychometric-sweep` each ship a `tsconfig.json` and each has a dedicated root
script (`persona-sim:typecheck`, `sweep:typecheck`) — **neither is invoked by
`ci.yml` or by `scripts/verify.ts`** `[V]`. The Python harness has its own test
suite; **no CI job runs Python at all** `[V]`.

### 2.5 The four non-code trees

- **`docs/` (61)** — four durable subtrees (`governance/` 4, `product/` 7,
  `architecture/` 5, `research/` 7), plus `audit/` (5), `interviews/` (3),
  `demo-screenshots/` (16 PNGs), and **14 root files, 9 of them dated
  session output** `[V]`. It also contains one 226-line React file (§3.5).
- **`research/ ` (154)** — dominated by `exam-question-types/` (105 files: 67
  demos, catalogues, specs, plus 4 Python builders and a 4-file `qa/` harness
  with its own `package.json` named `qtype-demo-qa`) `[V]`. Also
  `backend-admissions/` (33), `test-structure-research/` (13).
- **`brainlifting/` (8)** — four BrainLifts, each a markdown document plus an
  annotated source register. Pure prose. No code, no build input.
- **`infra/` (9)** — Terraform. Resources are `aws_ecs_*`, `aws_rds_cluster`,
  `aws_cognito_*`, `aws_lb*`, `aws_cloudfront_distribution`, `aws_vpc`,
  `aws_security_group`. **There is no `aws_lambda_function` and no reference to
  `cat-engine` anywhere in `infra/`** `[V]` (Appendix A.8).

---

## 3. Coherence problems

Each is stated as: *what a newcomer would reasonably conclude* → *what is
actually true*.

### 3.1 `cat-engine`'s name and description do not describe its contents

> *Reasonable conclusion:* "`@gt-selection/cat-engine` is the scoring engine."
> *Actually:* 34% of it is `[V]`.

The remaining 66% is a synthetic persona simulator (39%), research estimators
(21%), and a Lambda adapter (6%). The three are unrelated to each other and have
different audiences, different stability expectations, and different consumers.

The package surface reflects this inconsistently `[V]`:

| Subtree | In the public barrel? | Reached how |
| --- | :-: | --- |
| core | yes | `@gt-selection/cat-engine` from `apps/web` |
| `persona-sim/` | **yes** (`index.ts:27`) | also by deep relative path from `scripts/` |
| `psychometric-lab/` | **no** — deliberately | **only** by deep relative path from `scripts/` |
| `lambda/` | **yes** (`index.ts:28-29`) | `invoke:local`, and now the client bundle |

So the package exports a persona simulator and a serverless handler to the web
app, while hiding the research lab. The hiding is the correct instinct; it is
just applied to one of the three non-engine subtrees.

### 3.2 A serverless handler is on the browser's import path

Covered in §1.1(1). The chain is verified in all forms `[V]`: static named
import at `two-stage-exam.tsx:6`, static import at `cat-scoring.ts:9`, and the
barrel re-exports at `index.ts:28-29`. No dynamic `import()`, `require`, or
`vi.mock` form is involved.

`infra/` has no Lambda resource `[V]`, so `src/lambda/` currently has **no
deployment target at all**. It is a shape without a consumer, shipped to the one
consumer it should never have.

### 3.3 The browser-safety hazard is enforced by a code comment

`packages/item-bank/src/index.ts:53` re-exports `./rng`, and
`packages/item-bank/src/rng.ts:1` is `import { createHash } from 'node:crypto'`
`[V]`. So **any value import of `@gt-selection/item-bank` pulls `node:crypto`
into the graph.**

Today this is contained because every `apps/web` import of `item-bank` outside
tests is `import type` `[V]` (`cat-adapter.ts:7`). What keeps it that way is a
comment in `apps/web/src/lib/exam/cat-scoring.ts:26-29`:

> *"cat-engine is safe to bundle for the browser (pure math, no `node:`
> imports); `@gt-selection/item-bank` is NOT (its `rng.ts` imports
> `node:crypto`), so item-bank stays type-only in the adapter."*

That comment is accurate, well-placed, and **not a control**. Nothing fails if
someone changes `import type` to `import`. `boundaries:check` does not look for
`node:` specifiers (§4.2), and `item-bank`'s `package.json` has no `browser`
field or export condition marking the constraint `[V]`.

This is the clearest case in the repo of a real invariant held only by
convention.

### 3.4 `research/` is a build input, but is treated as prose everywhere else

`research/` is excluded from ESLint, from Prettier, and from the CI `paths:`
filter `[V]`. Yet:

- `packages/item-bank/scripts/gen-type-registry.ts:22` reads
  `research/exam-question-types/catalog/master_types.jsonl` and emits a
  committed generated file carrying its SHA-256 `[V]`.
- `packages/item-bank/src/registry.test.ts:14` resolves the same catalogue and
  asserts against it `[V]`.

**Consequence:** a commit that changes only
`research/exam-question-types/catalog/master_types.jsonl` **does not trigger
CI**, even though it can break `packages/item-bank`'s test suite `[I]` — the
inference is from the `paths:` list, which does not include `research/**`, and
does not use a fallback. This is a genuine hole, and it is a *tooling* hole, not
a layout hole. §5 treats it accordingly.

`research/` also contains four Python builders and a four-file Node QA harness
with its own `package.json` `[V]`. That `package.json` is **not** a workspace
member (globs are single-level) `[V]`, so it is inert today — but it is a
loaded gun for any future change to `pnpm-workspace.yaml`.

### 3.5 `docs/` mixes four audiences, and contains a React component

Four kinds of document share one flat namespace: **binding governance**
(`governance/`, and `AGENTS.md` names `product/` too), **durable architecture**
(`architecture/`), **audit output** (`audit/`), and **dated session handoffs**
(9 root files). Nothing in the layout distinguishes "this constrains you" from
"this is what an agent produced overnight on 2026-07-27".

Separately: `docs/critic-ready-product-roadmap.canvas.tsx` is a **226-line
TypeScript React file** `[V]`. It is:

- matched by no `tsconfig.json` `include` in the repo (all nine were checked)
  `[V]`;
- ESLint-ignored via `docs/**` `[V]`;
- Prettier-ignored via `docs/` `[V]`.

It is the only source file in the repo covered by no type check, no lint, and no
formatter. That is a direct consequence of putting code in a prose tree.

### 3.6 `scripts/` has accumulated five unrelated concerns

CI guards, operator runbook scripts, a TypeScript research harness, TypeScript
research sweeps, and a 2,873-LOC Python package all share one directory
(§2.4). The consequences are concrete, not aesthetic:

- The Python harness has tests that **nothing runs** `[V]`.
- Two TypeScript research trees have typecheck scripts that **nothing invokes**
  `[V]`.
- A reader looking for "the checks CI runs" must filter them out of 37 files in
  two languages.

### 3.7 `scripts/` reaches through package boundaries

`scripts/persona-sim/` and `scripts/psychometric-sweep/` import
`packages/cat-engine` internals by **deep relative path** — 33 occurrences
across 10 distinct internal specifiers `[V]`:

```
'../../packages/cat-engine/src/irt'
'../../packages/cat-engine/src/persona-sim/index'
'../../packages/cat-engine/src/psychometric-lab/index'
'../../packages/cat-engine/src/rng'
'../../packages/cat-engine/src/theta'
…
```

`cat-engine`'s `package.json` declares `"exports": { ".": "./src/index.ts" }`
`[V]` — a single entry point. These imports bypass it entirely. Because
`scripts/` is not a workspace member, it cannot use the bare specifier without
being made one, so the reach-in is currently the *only* option available `[I]`.
That is a structural gap, not carelessness.

### 3.8 Two research→production copies with no drift guard

Verified in §1.1(4). Note the demo copy is *deliberate and documented* — the
`.prettierignore` comment reads *"verbatim question-type demos copied from
research/exam-question-types — do not reformat"* `[V]`. The intent is sound. The
missing piece is a check that the copy still matches.

### 3.9 Prior-audit findings that are still open

Re-verified on this tree, not re-derived `[V]`:

- `apps/web/src/lib/contracts.ts` — 1 line, still zero importers.
- `apps/web/src/lib/family/address-lookup.ts` — 22 lines, still zero references.

Both remain as `REPO_REACHABILITY_MAP.md` §5 described them. They are
*deletions*, not restructuring, and are listed there with the right analysis;
this document does not restate the case.

---

## 4. Boundaries and layering

### 4.1 The dependency graph is acyclic

Derived from declared `package.json` dependencies **and** from actual import
specifiers, which agree `[V]`:

```
contracts ──────┬─────────► item-bank ───┐
   (0 deps)     └─────────► test-fixtures ├──► apps/web  (@gt-selection/web)
db-types ─────────────────────────────────┤
cat-engine (0 deps) ──────────────────────┘
```

- **Acyclic:** yes `[V]`. Maximum depth 2.
- **No undeclared workspace dependency:** yes `[V]`. `cat-engine`'s only
  mentions of `contracts` are comments (Appendix A.5).
- **No package imports `apps/web`:** confirmed by the replicated check `[V]`.

The one edge not in this picture is `scripts/ → packages/cat-engine/src/**`
(§3.7), which no declared-dependency view can see because `scripts/` has no
`package.json`.

### 4.2 What `boundaries:check` actually enforces

`scripts/check-workspace-boundaries.ts` is 37 lines. It walks `packages/`,
selects files matching `/\.[cm]?[jt]sx?$/`, and applies exactly **two substring
tests** `[V]`:

1. the file text contains `@gt-selection/web` **or** `apps/web`;
2. the file is under `packages/contracts/` **and** contains `@supabase/`.

It currently passes (Appendix A.6) `[V]`.

**The gap between the name and the behaviour:**

| A reader would assume it checks… | Does it? | Reality |
| --- | :-: | --- |
| Packages don't import the app | ~ | Substring, not import. A comment mentioning `apps/web` fails the build. |
| The dependency graph is acyclic | **no** | Never computed. |
| Layering (who may depend on whom) | **no** | Only the app is forbidden, and only to packages. |
| The browser/server split | **no** | No `node:` specifier check. This is §3.3. |
| The `exports` map is respected | **no** | The 33 deep reach-ins from `scripts/` are invisible — it only walks `packages/`. |
| CI runs it on every change | ~ | Only when the `paths:` filter matches; `research/**` does not. |

Two properties are worth calling out precisely because they interact with any
move:

- **It is a substring test, not an import test.** Any file under `packages/`
  that so much as *mentions* the path `apps/web` in a comment is a violation.
  Restructure notes that reference app paths must not be written into package
  source `[V]`, and this is a live tripwire for a migration.
- **It fails loudly if `packages/` disappears.** `readdir` on a missing
  directory throws `[I]`. That is the desirable behaviour, and it contrasts
  sharply with the security scan below.

### 4.3 `security:scan` fails *silently* when a path moves

`scripts/check-security-boundaries.ts:5` hardcodes
`['apps/web/src', 'apps/web/.next/static', 'packages', '.env.example']`, and
lines 30-34 do `try { await access(targetRoot) } catch { continue }` `[V]`.

**A missing scan root is skipped without a warning, and the script still prints
"Elevated-key and public-environment boundaries verified." and exits 0** `[I]`.
Any restructure that renames a scanned root therefore converts the elevated-key
scan into a green no-op. This is the single most dangerous interaction between a
move and the existing tooling, and it is *not* a hypothetical: `packages` is one
of the four literals.

---

## 5. Proposed target structure

Two-part proposal. **Part A is decision-independent.** **Part B is gated on the
Gen-A/Gen-B choice** and is presented as a shape, not a schedule.

### 5.1 Part A — the decision-independent layout

Only changed or newly-meaningful nodes are annotated; unlisted nodes stay
exactly where they are.

```
.
├── apps/
│   └── web/                       UNCHANGED. See §7.2.
│
├── packages/                      Shipping libraries only. One rule: everything
│   │                              here may be imported by apps/web at runtime.
│   ├── contracts/                 UNCHANGED — load-bearing, correctly scoped.
│   ├── db-types/                  UNCHANGED.
│   ├── test-fixtures/             UNCHANGED — TEST-ONLY is its job.
│   ├── item-bank/                 UNCHANGED IN PLACE (see §6 step 5 for the
│   │                              node:crypto fix, which is not a move).
│   └── cat-engine/                Shrinks to what its name says: the scoring +
│       └── src/                   replay engine. 1,004 LOC, 11 files.
│           ├── index.ts           Barrel stops exporting lambda/ and persona-sim/.
│           └── (irt, theta, scoring, replay, rng, result, rte,
│                item-scoring, measurements, types)
│
├── research-code/                 NEW TREE. Executable, tested, deliberately
│   │                              unconsumed by the product. Parked ≠ dead:
│   │                              the location is the status marker.
│   ├── persona-sim/               FROM packages/cat-engine/src/persona-sim/
│   │                              (1,162 LOC) + scripts/persona-sim/ (1,348 LOC).
│   │                              Generator and its driver reunited.
│   ├── psychometric-lab/          FROM packages/cat-engine/src/psychometric-lab/
│   │                              (621 LOC) + scripts/psychometric-sweep/
│   │                              (1,858 LOC). Already un-exported; now also
│   │                              un-adjacent to shipping code.
│   └── validation-harness/        FROM scripts/validation-harness/ (Python,
│                                  2,873 LOC). Moves for language separation.
│
├── deploy/                        NEW, SMALL.
│   └── cat-engine-lambda/         FROM packages/cat-engine/src/lambda/ (181 LOC).
│                                  A deployment adapter is not library code.
│                                  Parked until infra/ grows a Lambda (§7.4).
│
├── scripts/                       Shrinks to one concern: things CI and
│   │                              operators run against this repo.
│   ├── check-workspace-boundaries.ts
│   ├── check-security-boundaries.ts
│   ├── check-generated-types.ts
│   ├── check-research-sync.ts     NEW. Asserts the two byte-identical copies
│   │                              in §3.8 still match. ~20 lines.
│   ├── verify.ts
│   ├── create-local-auth-users.ts
│   └── configure-cloud-auth-email.mjs
│
├── docs/                          Split by audience and lifetime.
│   ├── governance/                UNCHANGED — binding. Precedence per AGENTS.md.
│   ├── product/                   UNCHANGED — binding.
│   ├── architecture/              UNCHANGED — durable design.
│   ├── research/                  UNCHANGED — durable synthesis.
│   ├── audit/                     UNCHANGED — dated but durable findings.
│   ├── interviews/                UNCHANGED — primary source material.
│   ├── runbooks/                  NEW. FROM docs/DEPLOYMENT_RUNBOOK.md,
│   │                              docs/GOVERNANCE_REAL_SCHOOL_SEARCH.md.
│   │                              Operational, durable, non-binding.
│   ├── sessions/                  NEW. FROM the 9 dated root files. Append-only
│   │                              session output. Explicitly non-authoritative.
│   ├── demo-screenshots/          UNCHANGED.
│   └── README.md                  Stays; becomes the index that explains the
│                                  above split.
│
├── research/                      UNCHANGED AS A LOCATION. Prose, catalogues,
│                                  demos, and source material. But its role as a
│                                  build input gets declared (§6 step 7).
├── brainlifting/                  UNCHANGED. See §7.3.
├── infra/                         UNCHANGED.
└── supabase/                      UNCHANGED.
```

**The organising rule, stated once:** a directory's *path* should answer "may
the product depend on this?" `packages/` = yes. `research-code/` = no, and that
is deliberate. `deploy/` = only at deploy time. `research/` and `docs/` = not
code. Today that question is answerable only by reading the import graph.

#### Why `research-code/` and not `packages/research/*`

Because `pnpm-workspace.yaml` globs are **single-level** (`packages/*`) `[V]`.
Nesting a package one level deeper silently removes it from the workspace — it
would not appear in the lockfile importers, its `pnpm -r` scripts would stop
running, and nothing would report an error. A sibling top-level tree with an
explicit workspace glob is the safer shape `[I]`.

Whether `research-code/*` becomes a workspace member at all is a real choice:

- **As workspace members** (`research-code/*` added to the globs): they get bare
  specifiers instead of the 33 deep reach-ins (§3.7), and `pnpm -r typecheck`
  reaches them for the first time. Cost: they appear in `pnpm -r` output
  everywhere.
- **As non-members** (a plain directory, like `scripts/` today): zero tooling
  change, but the reach-in problem simply moves.

**Recommended: workspace members.** It is the only option that actually fixes
§3.7. **Speculative — owner's call**, because it changes what `pnpm -r`
enumerates repo-wide.

### 5.2 Part B — gated on the stack decision

Nothing below should be done before Decision 1 in `AUDIT_SUMMARY.md` is made.
Presented so the target is not a surprise later.

| If the decision is… | Then the layout implication |
| --- | --- |
| **Gen-A** (`GEN_A_VS_GEN_B.md` Option 2) | `packages/item-bank` becomes load-bearing and must be made browser-safe or explicitly server-only (§6 step 5 stops being optional). `apps/web/src/lib/exam/` grows a persistence layer and likely warrants splitting into `lib/exam/{delivery,scoring,telemetry}/`. |
| **Gen-B** (Option 1) | `packages/cat-engine` and `packages/item-bank` lose their consumer entirely. Both should move under `research-code/` or an `archive/` tree with a decision record — the "archived, not wired" label Option 3 depends on. `research/exam-question-types/banks/` becomes a **product** input, not research, and should move out of `research/`. |
| **Gen-B + archive `cat-engine`** (Option 3) | As Gen-B, and `research-code/` is exactly the home Option 3 needs. **Part A makes Option 3 cheaper without committing to it.** |

That last row is the reason Part A is worth doing now: every Part A move is one
that Option 3 would require anyway, and that Options 1 and 2 do not penalise.

---

## 6. Migration path

Each step is independently verifiable and independently revertible. The
verification column names the command that proves the step did not break
anything; **none has been run** (§Verification limits).

**Before any step:** run `pnpm verify` once on an untouched tree to establish a
baseline. `pnpm lint` is expected to exit non-zero with 23 pre-existing errors —
`AUDIT_SUMMARY.md` §Appendix A proves they predate all of this. Do not mistake
that for a regression you caused.

### Decision-independent — safe now

| # | Step | Files | Verify with | Breakage risk |
| --- | --- | --- | --- | --- |
| 1 | Delete lines 28-29 of `packages/cat-engine/src/index.ts` (stop exporting `lambda/`). Add a deep export path if `invoke:local` needs it. | 1 | `pnpm --filter @gt-selection/cat-engine test && pnpm --filter @gt-selection/web build` | **Low.** Only `invoke-local.ts` and the handler test consume these; both can import relatively. |
| 2 | Same for `persona-sim` (line 27) — *only after* step 4 confirms no app consumer. | 1 | `pnpm -r test` | **Low.** |
| 3 | Add `scripts/check-research-sync.ts`; call it from `verify.ts` and `ci.yml`. | 3 | `pnpm tsx scripts/check-research-sync.ts` → exit 0 today | **None.** Additive. |
| 4 | Extend `boundaries:check`: flag `node:`/bare-builtin imports reachable from a package barrel; flag deep reach-ins into `packages/*/src/**` from outside that package. | 1 | `pnpm boundaries:check` — **expect it to fail**, on `item-bank/src/rng.ts` and the 33 reach-ins. That failure is the evidence the check works. | **Medium.** Will surface real violations. Land the check with an explicit allowlist for the known 33, then burn the list down. |
| 5 | Make `item-bank`'s `node:crypto` dependency structural: move `rng.ts` behind a `./server` export condition, or swap `createHash` for a pure implementation. | 2-3 | `pnpm --filter @gt-selection/item-bank test` and step 4's check going green for this file | **Medium.** Changing the hash changes generated IDs — `registry.test.ts` asserts a SHA. Prefer the export-condition route. |
| 6 | `git mv` the 9 dated files to `docs/sessions/`; the 2 runbooks to `docs/runbooks/`; update `docs/README.md`. | 12 | `rg -n "docs/DEPLOYMENT_RUNBOOK\|docs/OVERNIGHT_\|docs/HANDOFF_\|DEMO_TONIGHT" .` → every hit must resolve | **Low.** Exactly one referrer outside `docs/`: `infra/README.md:34` → `docs/DEPLOYMENT_RUNBOOK.md` `[V]`. No dated file is referenced from any code or config tree. Fix that one line in the same commit; also update `REPO_REACHABILITY_MAP.md:210`, which cites `docs/DEMO_TONIGHT.md`. |
| 7 | Add `research/exam-question-types/catalog/**` and `research/exam-question-types/measurements.json` to the `paths:` filter in `ci.yml` (both `pull_request` and `push`). | 1 | Push a no-op change to the catalogue; confirm CI triggers | **None.** Widens coverage only. |
| 8 | Create `research-code/`; `git mv` `scripts/validation-harness/` into it. Python only — no TS/JS consumer. | 21 | `rg -n "scripts/validation-harness" .` → 13 referrers, all prose except one `[V]` | **Low.** No import-graph involvement: the only non-prose referrer is a comment at `scripts/persona-sim/harness-export.ts:6`. The other 12 are documentation (`docs/` ×5, `research/` ×3, `docs/audit/` ×2, and this file). Prose references may be updated in a follow-up; none of them break a build. |
| 9 | `git mv` `packages/cat-engine/src/persona-sim/` and `src/psychometric-lab/` to `research-code/`, together with `scripts/persona-sim/` and `scripts/psychometric-sweep/`. Rewrite the 33 specifiers. | ~40 | `pnpm -r typecheck && pnpm -r test && pnpm persona-sim:typecheck && pnpm sweep:typecheck` | **High — the big one.** See §6.1. |
| 10 | `git mv` `packages/cat-engine/src/lambda/` to `deploy/cat-engine-lambda/`. Move the `invoke:local` script with it. | 5 | `pnpm --filter @gt-selection/cat-engine test`, then run `invoke:local` from its new home | **Low** *if* step 1 landed first. |

Steps 1-8 are **certain** recommendations: each has a checkable benefit and a
bounded blast radius. Steps 9 and 10 are **certain in direction, speculative in
timing** — see §6.2.

### 6.1 Step 9 is where things break — the specific hazards

Every one of these is a verified path or glob that a move invalidates.

1. **Fixed-depth `../../..` resolution.** `gen-type-registry.ts:21` computes
   `REPO_ROOT = resolve(HERE, '../../..')` from `packages/item-bank/scripts/`,
   and `registry.test.ts:14` does the same from `packages/item-bank/src/` `[V]`.
   These are *silently wrong* at a different depth — `resolve` does not throw,
   it just points somewhere else, and `readFileSync` then fails with a confusing
   ENOENT. **Step 9 does not move `item-bank`, so it is safe** — but any future
   step that changes `item-bank`'s depth must fix these two lines first.
2. **`pnpm-workspace.yaml` single-level globs** (§5.1). Add
   `research-code/*` explicitly, in the same commit as the move.
3. **The 33 deep specifiers** (§3.7). Mechanical, but a missed one fails at
   *runtime* in a script CI does not run — so it can pass CI and still be broken.
   Mitigation: land step 4's reach-in check first so the rewrite is verified.
4. **`check-security-boundaries.ts`'s silent skip** (§4.3). Step 9 does not
   remove `packages/`, so the scan keeps working — but if a later step empties
   it, the scan goes green-and-blind. Fix the `continue` to a hard error as part
   of step 4.
5. **`boundaries:check`'s `apps/web` substring** (§4.2). Do not write "moved
   from `apps/web/...`" into any file under `packages/`.
6. **`ci.yml` `paths:` filter** enumerates top-level trees `[V]`. A new
   top-level `research-code/` and `deploy/` must be added or **changes there
   will not trigger CI** — the failure mode is silence.
7. **ESLint and Prettier ignore lists** enumerate top-level trees `[V]`. Decide
   deliberately whether `research-code/` is linted. Recommendation: **lint it**
   (it is real, tested TypeScript, unlike `research/`), which means adding
   nothing to the ignore lists and letting the root config pick it up.
8. **`tsconfig` path aliases.** Low risk here: the only alias in the repo is
   `apps/web`'s `@/*` → `./src/*` `[V]`, and step 9 does not touch `apps/web`.
   The two script tsconfigs use `"include": ["*.ts"]` — directory-relative, so
   they travel correctly with a move `[I]`.

### 6.2 What must wait for the stack decision

- **Anything that moves `packages/item-bank` or `packages/cat-engine` as a
  whole.** Under Gen-B both lose their consumer and should be archived; under
  Gen-A `item-bank` becomes load-bearing. Moving now risks moving twice.
- **Restructuring `apps/web/src/lib/exam/`.** Its 23 files are the contested
  surface. `GEN_A_VS_GEN_B.md` §1.4 is explicit that the two stacks disagree
  about what belongs there at all.
- **Relocating `research/exam-question-types/banks/`.** It does not exist on
  this branch (0 files `[V]`, per `GEN_A_VS_GEN_B.md` §1.2); under Gen-B it
  becomes a product input and stops being research.
- **Consolidating the duplicate domain models.** That is `DUPLICATE_MODELS.md`
  §9's subject, and its first seven items are decision-independent — but they
  are *model* changes, not *layout* changes, and should not be bundled into a
  move commit where a rename would hide a semantic change.

Note step 9 moves `persona-sim` and `psychometric-lab` — **not** `cat-engine`'s
core. That is what makes it decision-independent: those two subtrees are
research under either stack `[I]`.

---

## 7. What NOT to restructure

A proposal that moves everything is a bad proposal. These are recommendations
*against* churn, each with the reason.

### 7.1 Do not dedupe the 28 demo HTML files

They are byte-identical to their `research/` sources `[V]`, which looks like an
obvious dedupe. It is not:

- Next.js serves `public/` from disk; a symlink or build-time copy adds a build
  step and a platform-portability question for **28 static files with no logic**.
- The duplication is deliberate and documented in `.prettierignore` `[V]`.
- The real risk is not the duplication, it is **undetected drift**.

Step 3's ~20-line hash check buys the entire benefit at a fraction of the cost.
Same reasoning for `measurements.data.json`.

### 7.2 Do not restructure `apps/web/src`

`components/` (55 files) and `lib/` (50 files) are conventionally organised and
the `@/*` alias works. The one sub-tree with a genuine structural argument —
`lib/exam/` — is exactly the one the stack decision governs (§6.2). Reorganising
it now is the highest-probability wasted work in this repo.

### 7.3 Do not move or merge `brainlifting/`

Eight files, pure prose, zero build involvement `[V]`. It is a distinct artefact
class with a distinct authoring process (per `AGENTS.md` and the BrainLift
skill). Folding it into `docs/` would blur it into the governance tree it is
explicitly not part of, for no tooling gain — both are already
lint- and format-exempt `[V]`.

### 7.4 Do not build Lambda packaging for `deploy/cat-engine-lambda/`

Step 10 moves the handler so its status is honest. It is **not** an argument to
deploy it. `infra/` is ECS/Fargate with no Lambda resource `[V]`, and
`GEN_A_VS_GEN_B.md` leaves D-019's fate open. Moving it costs 181 LOC of churn;
wiring it would be building a deployment target for a stack that may be
discarded.

### 7.5 Do not split `packages/contracts`

At 2,918 source LOC with 24 live importers `[V]` it is the largest single
package by consumer count, and splitting it is tempting. But
`GEN_A_VS_GEN_B.md` §2 item 5 records that `contracts` has **forked** across the
two stacks, and that merging both files produces duplicate exports — *a compile
error, not a merge conflict*. Any split now will be re-litigated by the stack
decision. **Leave it.**

### 7.6 Do not add a `packages/` → `apps/` reverse dependency, or a root `src/`

Neither exists today and the graph is clean (§4.1). Recorded so a future
"simplification" does not introduce one.

### 7.7 Do not rename `research/`

Despite §3.4, the tree's *name* is right and its 154 files are genuinely
research. The problem is that two files inside it are build inputs while the
whole tree is CI-invisible. That is fixed by step 7 (four lines of YAML), not by
a move that would invalidate the two `../../..` computations and 10 doc
cross-references `[V]`.

---

## 8. Decision dependencies at a glance

| Recommendation | Decision-independent? | Confidence |
| --- | :-: | --- |
| Stop exporting `lambda/` from the barrel (step 1) | **Yes** | Certain |
| Research-sync hash guard (step 3) | **Yes** | Certain |
| Extend `boundaries:check` (step 4) | **Yes** | Certain |
| Fix `security:scan`'s silent skip (step 4) | **Yes** | Certain |
| `item-bank` `node:crypto` made structural (step 5) | **Yes** | Certain on the goal; **speculative** on the mechanism (export condition vs pure hash) |
| Split `docs/` into `sessions/` + `runbooks/` (step 6) | **Yes** | Certain |
| Add `research/catalog/**` to CI `paths:` (step 7) | **Yes** | Certain |
| Move `validation-harness/` (step 8) | **Yes** | Certain |
| Move `persona-sim` + `psychometric-lab` to `research-code/` (step 9) | **Yes** | Certain in direction; **owner's call** on whether they become workspace members |
| Move `lambda/` to `deploy/` (step 10) | **Yes** | Certain in direction; **speculative** on the destination name |
| Archive vs keep `cat-engine` / `item-bank` | **No** — Decision 1 | Blocked |
| Restructure `apps/web/src/lib/exam/` | **No** — Decision 1 | Blocked |
| Relocate Gen-B's `banks/` out of `research/` | **No** — Decision 1 | Blocked |
| Split `packages/contracts` | **No** — Decision 1 | Recommended against regardless (§7.5) |

---

## Appendix — verbatim command output

All commands run from the worktree root on `feat/repo-restructure-audit`.

### A.0 Environment (why nothing was executed)

```
$ ls -d node_modules 2>/dev/null || echo "NO root node_modules"
NO root node_modules
$ ls -d packages/*/node_modules apps/*/node_modules 2>/dev/null || echo "NO package node_modules"
NO package node_modules
$ node --version
v25.9.0
```

### A.1 Top-level file counts

```
$ for d in apps packages docs research brainlifting infra scripts supabase .github .cursor; do
    echo "$d: $(git ls-files "$d" | wc -l) files"; done
apps: 183 files
packages: 117 files
docs: 61 files
research: 154 files
brainlifting: 8 files
infra: 9 files
scripts: 37 files
supabase: 33 files
.github: 2 files
.cursor: 3 files

$ git ls-files | wc -l
     623
```

### A.2 Per-package source and test LOC

```
cat-engine:    total_tracked=44  src_files=23 src_loc=2968  test_files=16 test_loc=2056
contracts:     total_tracked=24  src_files=13 src_loc=2918  test_files=8  test_loc=2382
db-types:      total_tracked=6   src_files=3  src_loc=622   test_files=0  test_loc=0
item-bank:     total_tracked=35  src_files=22 src_loc=4415  test_files=5  test_loc=438
test-fixtures: total_tracked=8   src_files=2  src_loc=1350  test_files=3  test_loc=336
```

### A.3 `cat-engine` subtree split

```
core:             11 src files, 1004 src lines,  9 test files
persona-sim:       4 src files, 1162 src lines,  3 test files
psychometric-lab:  5 src files,  621 src lines,  3 test files
lambda:            3 src files,  181 src lines,  1 test files
```

### A.4 The client-bundle chain (all import forms checked)

```
$ rg -n "cat-scoring" . --glob '!docs/**' --glob '!*.md'
./apps/web/src/components/exam/two-stage-exam.tsx:6:import { estimateDemoTheta } from '@/lib/exam/cat-scoring';
./apps/web/src/lib/exam/cat-scoring.test.ts:3:import { estimateDemoTheta } from './cat-scoring';
   … (remaining matches are comments and describe() strings)

$ head -3 apps/web/src/components/exam/two-stage-exam.tsx
'use client';

$ rg -n "two-stage-exam" apps/web/src --glob '!*.test.*'
apps/web/src/components/exam/two-stage-exam.tsx:18:import styles from './two-stage-exam.module.css';
apps/web/src/app/dev/exam-two-stage/page.tsx:3:import { TwoStageExam } from '@/components/exam/two-stage-exam';

$ rg -n "^import|from '" apps/web/src/lib/exam/cat-scoring.ts
1:import {
9:} from '@gt-selection/cat-engine';
11:import {
15:} from './cat-adapter';
16:import type { BankItem, ExamDomain } from './item';
17:import type { ExamItemResult } from './types';

$ sed -n '17,29p' packages/cat-engine/src/index.ts
export * from './types';
… 
export * from './persona-sim';
export * from './lambda/event';
export * from './lambda/handler';
```

Only static `import`/`export … from` forms appear. No `require`, dynamic
`import()`, or `vi.mock` participates in this chain.

### A.5 `cat-engine` has no workspace dependency

```
$ rg -n "@gt-selection/contracts" packages/cat-engine
packages/cat-engine/src/types.ts:7: * importing `@gt-selection/contracts` (which carries Zod / Supabase-facing
packages/cat-engine/src/types.ts:59: * `@gt-selection/contracts` `screenDecisionSchema`. The engine cannot import
packages/cat-engine/src/persona-sim/sampler.ts:30: * and may not depend on the web app or on `@gt-selection/contracts` (a workspace
```

All three are comments. `packages/cat-engine/package.json` declares only
`devDependencies` (`@vitest/coverage-v8`, `typescript`, `vitest`).

### A.6 `boundaries:check` logic, replicated in-process

The exact algorithm of `scripts/check-workspace-boundaries.ts` re-run via
`node --input-type=module` against this tree:

```
Workspace dependency boundaries verified.
```

### A.7 Research → production duplication

```
$ # for each apps/web/public/exam-demos/*.html, compare git blob hash to research/
IDENTICAL: CX-diverge-01.html      <-> research/exam-question-types/demos/CX-diverge-01.html
IDENTICAL: CX-figural-01.html      <-> research/exam-question-types/demos/CX-figural-01.html
IDENTICAL: FLU-ANALOGY-01.html     <-> research/exam-question-types/demos/FLU-ANALOGY-01.html
   … 25 further lines, all IDENTICAL …
IDENTICAL: VER-WORDTRAIN-01.html   <-> research/exam-question-types/demos/VER-WORDTRAIN-01.html
(28 of 28 identical; 0 DIFFERS; 0 NO MATCH)

$ git hash-object packages/cat-engine/src/measurements.data.json \
                  research/exam-question-types/measurements.json
a768bb3d54847f69f2e92b0fd1405aed57944036
a768bb3d54847f69f2e92b0fd1405aed57944036
$ wc -c packages/cat-engine/src/measurements.data.json research/exam-question-types/measurements.json
   38119 packages/cat-engine/src/measurements.data.json
   38119 research/exam-question-types/measurements.json
```

### A.8 `infra/` has no Lambda

```
$ rg -in "lambda|cat-engine|cat_engine" infra/
  (no matches)

$ rg -oN --no-filename '^resource "[a-z_]+"' infra/*.tf | sort | uniq -c | sort -rn
   2 resource "aws_security_group"
   1 resource "aws_vpc"
   1 resource "aws_rds_cluster"
   1 resource "aws_lb_target_group"
   1 resource "aws_lb"
   1 resource "aws_ecs_task_definition"
   1 resource "aws_ecs_service"
   1 resource "aws_ecs_cluster"
   1 resource "aws_cognito_user_pool_client"
   1 resource "aws_cognito_user_pool"
   1 resource "aws_cloudfront_distribution"
```

### A.9 The browser-safety hazard

```
$ sed -n '53p' packages/item-bank/src/index.ts
export { makeRng, deterministicUuid, hashStringToInt, mulberry32 } from './rng';

$ sed -n '1p' packages/item-bank/src/rng.ts
import { createHash } from 'node:crypto';

$ rg -n "@gt-selection/item-bank" apps/web/src
apps/web/src/lib/exam/cat-adapter.test.ts:3:import { buildBankItem } from '@gt-selection/item-bank';
apps/web/src/lib/exam/cat-adapter.ts:7:import type { BankItem as SpecBankItem } from '@gt-selection/item-bank';
   … (remaining matches are comments)
```

The only non-test import is `import type`. The constraint is documented at
`apps/web/src/lib/exam/cat-scoring.ts:26-29` and enforced nowhere.

### A.10 Deep reach-ins from `scripts/` into `packages/`

```
$ rg -n "\.\./\.\./packages/" scripts --glob '*.ts' -o | wc -l
      33

$ rg -oN --no-filename "'\.\./\.\./packages/[^']*'" scripts --glob '*.ts' | sort -u
'../../packages/cat-engine/src/irt'
'../../packages/cat-engine/src/persona-sim/index'
'../../packages/cat-engine/src/persona-sim/latent'
'../../packages/cat-engine/src/persona-sim/sampler'
'../../packages/cat-engine/src/psychometric-lab/index'
'../../packages/cat-engine/src/rng'
'../../packages/cat-engine/src/rte'
'../../packages/cat-engine/src/scoring'
'../../packages/cat-engine/src/theta'
'../../packages/cat-engine/src/types'

$ rg -n '"exports"' -A2 packages/cat-engine/package.json
7:  "exports": {
8-    ".": "./src/index.ts"
9-  },
```

`psychometric-lab` is reachable by **no other means** — it appears in no barrel
and in no `apps/` file:

```
$ rg -n "psychometric-lab" --glob '!docs/**' --glob '!*.md' .
./packages/cat-engine/src/psychometric-lab/index.ts:2: * `psychometric-lab` — research-only estimators, selection criteria, and
./scripts/psychometric-sweep/run-engagement-sweep.ts:20:} from '../../packages/cat-engine/src/psychometric-lab/index';
./scripts/psychometric-sweep/run-lambda-sweep.ts:16:} from '../../packages/cat-engine/src/psychometric-lab/index';
./scripts/psychometric-sweep/run-selection-sweep.ts:13:} from '../../packages/cat-engine/src/psychometric-lab/index';
```

### A.11 `research/` is a build input but is CI-invisible

```
$ rg -n "research/" packages --glob '*.ts' | grep -v '^\s*\*'
packages/item-bank/src/registry.test.ts:14:const MASTER = resolve(HERE, '../../../research/exam-question-types/catalog/master_types.jsonl');
packages/item-bank/scripts/gen-type-registry.ts:22:const MASTER = resolve(REPO_ROOT, 'research/exam-question-types/catalog/master_types.jsonl');

$ sed -n '21,23p' packages/item-bank/scripts/gen-type-registry.ts
const REPO_ROOT = resolve(HERE, '../../..');
const MASTER = resolve(REPO_ROOT, 'research/exam-question-types/catalog/master_types.jsonl');

$ rg -n "research|docs|brainlifting|infra" .github/workflows/ci.yml
  (no matches)

$ rg -in "python|pytest|\.py" .github/workflows/
  (no matches)
```

### A.12 Workspace membership is single-level

```
$ cat pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*

$ rg -n "^  [a-z.]" pnpm-lock.yaml | head -8
9:  .:
42:  apps/web:
124:  packages/cat-engine:
136:  packages/contracts:
152:  packages/db-types:
158:  packages/item-bank:
180:  packages/test-fixtures:

$ rg -n '"name"' research/exam-question-types/qa/package.json
2:  "name": "qtype-demo-qa",
```

Six importers. The `package.json` inside `research/` is not among them.

### A.13 The unchecked React file in `docs/`

```
$ wc -l docs/critic-ready-product-roadmap.canvas.tsx
     226 docs/critic-ready-product-roadmap.canvas.tsx

$ rg -n '"include"' tsconfig.base.json apps/web/tsconfig.json packages/*/tsconfig.json scripts/*/tsconfig.json
scripts/psychometric-sweep/tsconfig.json:3:  "include": ["*.ts"]
scripts/persona-sim/tsconfig.json:3:  "include": ["*.ts"]
packages/item-bank/tsconfig.json:3:  "include": ["src/**/*.ts", "scripts/**/*.ts"]
packages/test-fixtures/tsconfig.json:6:  "include": ["src/**/*.ts"]
packages/cat-engine/tsconfig.json:6:  "include": ["src/**/*.ts", "src/**/*.json"]
apps/web/tsconfig.json:14:  "include": ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"]
packages/contracts/tsconfig.json:6:  "include": ["src/**/*.ts"]
packages/db-types/tsconfig.json:6:  "include": ["src/**/*.ts"]
```

`tsconfig.base.json` has no `include` at all. No config matches
`docs/**/*.tsx`. `eslint.config.mjs` ignores `docs/**`; `.prettierignore`
ignores `docs/` and `*.md`.

### A.14 `docs/` root files by lifetime

```
TRANSIENT/DATED: DEMO_TONIGHT.md
TRANSIENT/DATED: GENB_VERIFICATION_2026-07-28.md
TRANSIENT/DATED: HANDOFF_2026-07-28.md
TRANSIENT/DATED: OVERNIGHT_GENA_INTEGRATION_PROBE.md
TRANSIENT/DATED: OVERNIGHT_GOVERNANCE_DIVERGENCE.md
TRANSIENT/DATED: OVERNIGHT_MODEL_RECONCILE_REPORT.md
TRANSIENT/DATED: OVERNIGHT_REVIEW_GUIDE.md
TRANSIENT/DATED: OVERNIGHT_TWO_STAGE_DEMO.md
TRANSIENT/DATED: PERSONA_SIM_RESULTS.md
TRANSIENT/DATED: PSYCHOMETRIC_SWEEP_2026-07-28.md
durable?       : DEPLOYMENT_RUNBOOK.md
durable?       : GOVERNANCE_REAL_SCHOOL_SEARCH.md
durable?       : README.md
durable?       : critic-ready-product-roadmap.canvas.tsx
```

Ten match the dated/transient pattern; `PSYCHOMETRIC_SWEEP_2026-07-28.md` and
`PERSONA_SIM_RESULTS.md` are results reports whose classification is the owner's
call — §1.1(3) counts the conservative nine.

### A.15 Prior-audit orphans, re-verified on this tree

```
PRESENT: apps/web/src/lib/contracts.ts (1 lines)
PRESENT: apps/web/src/lib/family/address-lookup.ts (22 lines)
$ rg -n "@/lib/contracts|address-lookup" apps/web/src
  (still zero importers for both)
```

Unchanged from `REPO_REACHABILITY_MAP.md` §5.

### A.16 Cross-references that a move must fix

```
$ rg -n "DEMO_TONIGHT|OVERNIGHT_REVIEW_GUIDE|HANDOFF_2026|DEPLOYMENT_RUNBOOK" --glob '!docs/**' .
./infra/README.md:34:   interim Supabase-Cloud divergence) — see `docs/DEPLOYMENT_RUNBOOK.md`.
```

One referrer outside `docs/`, and it points at a runbook rather than at any
dated file. Migration step 6 is therefore cheaper than it looks.

```
$ rg -n "scripts/validation-harness" --glob '!scripts/validation-harness/**' .
./scripts/persona-sim/harness-export.ts:6:      … in the schema `scripts/validation-harness`     ← comment
./research/test-structure-research/STAGE_CLASSIFICATION_AND_METRIC_AUDIT.md:180
./research/test-structure-research/STAGE_CLASSIFICATION_AND_METRIC_AUDIT.md:188
./research/test-structure-research/PERSONA_SIM_AND_VALIDATION_DESIGN.md:48
./research/test-structure-research/PERSONA_SIM_AND_VALIDATION_DESIGN.md:52
./docs/OVERNIGHT_GENA_INTEGRATION_PROBE.md:33,59,103
./docs/PERSONA_SIM_RESULTS.md:22,163
./docs/OVERNIGHT_REVIEW_GUIDE.md:73
./docs/audit/GEN_A_VS_GEN_B.md:38,200
```

No `import`, `require`, or path resolution — every hit is prose or a comment.
