# Repository Structure Audit — Executive Summary

**Audited:** `feat/repo-structure-audit` @ `5c2c2ab`, 2026-07-27.
**Changed:** nothing but `docs/audit/**`. No code, config, branch, or worktree
was modified.

Companion documents: [`REPO_REACHABILITY_MAP.md`](REPO_REACHABILITY_MAP.md) ·
[`DUPLICATE_MODELS.md`](DUPLICATE_MODELS.md) ·
[`GEN_A_VS_GEN_B.md`](GEN_A_VS_GEN_B.md) ·
[`BRANCH_CLEANUP_PLAN.md`](BRANCH_CLEANUP_PLAN.md)

---

## The five things that matter

**1. The repo has almost no dead code, but a lot of parked code — and the
distinction changes what you should do.** Genuinely dead: **23 lines**, in two
files. Reachable from no rendered page: **5,623 lines** across
`packages/cat-engine` and `packages/item-bank`. That code is tested (128 passing
tests), documented, and deliberate — it simply has no consumer. Deleting it
would be wrong; leaving it silently unreachable is what has been happening.

**2. You are running two disconnected content systems.** `item-bank` generates a
**257-item** bank that nothing in the app reads. The exam users actually see is
`apps/web/src/lib/exam/bank.ts` — a **hand-written array of 8 items** pointing at
static HTML demos. Meanwhile Gen-B (`feat/exam-integration`) has **7,900 bank
item lines already wired to its renderer**. The item-generation investment on
this branch has produced 3% of Gen-B's content and delivers none of it.

**3. Gen-A and Gen-B are not two versions of one system; they are two systems
that disagree about who decides whether an answer is right.** Gen-A scores in a
client module from a bank item that carries the answer key. Gen-B scores in
PostgreSQL (`app.exam_verify_response` plus **30 per-type verifiers**, backed by
**261 exam-specific pgTAP assertions** and an RLS key firewall). **These cannot
be merged.** Gen-A has **zero executing exam database tests** — its two exam DB
test files are named `.pending.sql`, so the runner skips them.

**4. Two packages currently encode contradictory requirements, and both test
suites pass.** `contracts` forbids the decision value `admit`
(`assessment-exam-contract.test.ts:215` asserts it is rejected — it was renamed
to `advance` specifically to avoid an admission claim). `cat-engine` **returns**
`admit` (`scoring.ts:94`) and asserts it does (`scoring.test.ts:110`). This is
contained today only because nothing calls `cat-engine`. It is a claim-boundary
violation sitting one wiring commit away from being reachable — **and that
wiring commit landed on `feat/exam-cat-adapter-wire` while this audit was
running.**

**5. 96 local branches represent about 13 pieces of real work.** 19 are fully
merged into `dev`; 61 are strict ancestors of a live tip (48 of them are one
workstream's step-by-step history). Separately, **12 branches have an upstream
pointing at a different branch — three of them at `origin/dev`.** A bare
`git push` from those pushes into `dev`. That is almost certainly how a previous
parallel run corrupted sibling branches.

---

## Decisions you must make

### Decision 1 — Which exam stack? *(everything else waits on this)*

> **The fork:** keep Gen-A's psychometric design and rebuild its backend, or
> take Gen-B's working backend and content and port Gen-A's better UI onto it.

The costs are asymmetric, and that asymmetry is the finding:

| Direction | Cheap | Expensive |
| --- | --- | --- |
| **A → B** | bank content, correctness authority, persistence, tests (all already exist) | porting Gen-A's UI; ratifying decisions D-020…D-028; re-adding R/H traceability |
| **B → A** | UI (already there) | 9 migrations, 30 verifiers, re-enveloping 7,900 items, real persistence |

Gen-A is ahead on: session UI, structure-agnosticism, IRT/psychometric design,
governance traceability (Gen-B's exam code cites **no R/H requirement IDs at
all**), and an external Python validation harness.
Gen-B is ahead on: content volume, correctness authority, persistence, and test
coverage of the things that would actually break.

**Also note:** Gen-B carries **nine decisions (D-020…D-028) that do not exist on
`dev`**, and its engine cites four of them. Adopting Gen-B ratifies them;
rejecting it means deciding whether they were ever valid. Either way this is a
governance action.

`GEN_A_VS_GEN_B.md` §3 lays out three coherent options. Option 3 (adopt Gen-B,
archive `cat-engine` intact for a later scoring service) is the lowest-regret
choice if the IRT work is valuable but not urgent.

### Decision 2 — Wire the parked seam, or archive it?

~5,600 LOC of `cat-engine` + `item-bank` is maintained, tested, and unreachable.
The only acceptable outcomes are *wired* or *explicitly archived*. **This
decision is entangled with Decision 1** — Gen-B contains neither package, so
choosing Gen-B moots it. Note that wiring is already in progress on
`feat/exam-cat-adapter-wire`; if Decision 1 might go to Gen-B, that work is at
risk of being discarded.

### Decision 3 — Restore the branch tier flow, or document what you actually do?

`main` and `staging` are both **128 commits behind `dev`**. The four-tier
promotion flow in `AGENTS.md` has stopped. Either resume it or amend the doc;
right now neither describes reality, and "the reviewed baseline on `main`" is
128 commits stale.

---

## Prioritised cleanup sequence

**Do now — safe, reversible, no decision required**

1. **Unset the 12 mis-set branch upstreams.** Config-only, zero risk, removes
   the mechanism that corrupts sibling branches. (`BRANCH_CLEANUP_PLAN.md` §2.1)
2. **Push the local-only branches holding unique work** — `feat/adaptive-exam-app`,
   `feat/prd-dev-gap-fixes`, `feat/exam-cat-adapter-wire`. Their only copy is on
   this machine.
3. **Rename `cat-engine`'s decision values** `admit|defer` → `advance|hold`.
   Mechanical, no live consumer, closes a claim-boundary violation. Doing it
   *after* wiring is strictly worse. (`DUPLICATE_MODELS.md` §5)
4. **Delete `apps/web/src/lib/family/address-lookup.ts`** (22 LOC, proven
   superseded by `api/address/route.ts`).
5. **Fix `scripts/configure-cloud-auth-email.mjs`'s eslint env** — clears 22 of
   the repo's 23 lint errors.

**Next — provable, mechanical**

6. Delete the 18 fully-merged branches one at a time with `git branch -d`
   (never `-D`), excluding the archival `research/overnight-backend-selection`.
7. Consolidate the seven duplicate models that do not prejudge Decision 1:
   lure class, answer key, scoring contract, provenance, age band, domain-enum
   drift test, and the metric-map normalisation in `harvest.ts`.
   (`DUPLICATE_MODELS.md` §9)

**Blocked on Decision 1**

8. Retire the losing generation's 48 or 13 lineage branches and their worktrees.
9. Unify item / served-item / session / scoring-result models.

**Blocked on Decision 3**

10. Reconcile `main`/`staging` with `dev`.

---

## Confidence and caveats

| Claim | Confidence | Basis |
| --- | --- | --- |
| `scoring.ts` / `harvest.ts` are LIVE | **High** | Full import graph + all three specifier forms |
| `cat-engine`/`item-bank` unreachable from any page | **High** | Graph + `rg` cross-check; only importer is a test |
| 257 vs 7,900 bank items | **High** | `wc -l` on both branches |
| 30 per-type DB verifiers | **High** | Enumerated from migration sources |
| 465 pgTAP assertions (Gen-B) | **High** | Summed `plan(N)` across 20 files |
| 336 Gen-A JS tests passing | **High** | Suite executed |
| **728 Gen-B JS tests** | **Low — UNVERIFIED** | 462 static declarations counted; `it.each` may expand it. Not run. |
| Metric map / decision / age-band incompatibilities | **High** | Probed with the real schemas (§Appendix) |
| Branch containment | **High** | `rev-list` + `branch --contains`, but a snapshot |
| Worktree staleness | **Medium** | Branch containment only — **uncommitted work not checked** |
| Answer keys in the production bundle | **Medium** | Static import chain proven; `next build` not run |

**What I could not determine:**

1. Gen-B's real JS test pass count, and whether Gen-B currently passes at all
   (its pgTAP needs a live Supabase).
2. Uncommitted work in the other 25 worktrees — deliberately not inspected, to
   respect the read-only boundary. **Largest blind spot in this audit.**
3. What `gt-selection-qbank-preview` @ `47f5311` (detached HEAD) contains; it
   matches no local branch.
4. Whether Next.js emits the dev-route client chunk (containing answer keys)
   into a production build.
5. Whether Gen-B's 8-commit lag behind `dev` conflicts — not test-merged.

**Where this audit could be wrong.** The import graph *under*-reports
reachability: it cannot see bundler aliases or hand-run commands. It initially
flagged 4 orphans; **2 were its own false positives** (`vitest.server-only.ts`
is a bundler alias; `configure-cloud-auth-email.mjs` is a documented hand-run
script). Both are corrected in `REPO_REACHABILITY_MAP.md` §5. Treat any
"ORPHANED" label as a lead, never as authorisation to delete.

---

## Appendix — verbatim command output

Run from the repo root on `feat/repo-structure-audit` @ `5c2c2ab`.

### A. Working tree unchanged, lint unchanged

```
$ git status --porcelain=v1 -uall
                                      ← empty before docs/audit/** was written

$ pnpm lint
/apps/web/src/components/family/apply-wizard.tsx
  197:5  error  Definition for rule 'react-hooks/exhaustive-deps' was not found
/scripts/configure-cloud-auth-email.mjs
   41:15  error  'process' is not defined  no-undef
   … (21 more in the same file)
✖ 23 problems (23 errors, 0 warnings)
```

**These 23 errors are provably pre-existing**, by three independent checks:

```
$ for f in apps/web/src/components/family/apply-wizard.tsx \
           scripts/configure-cloud-auth-email.mjs; do
    [ "$(git rev-parse HEAD:$f)" = "$(git rev-parse dev:$f)" ] && echo "IDENTICAL to dev: $f"
  done
IDENTICAL to dev: apps/web/src/components/family/apply-wizard.tsx
IDENTICAL to dev: scripts/configure-cloud-auth-email.mjs

$ git diff --stat 5c2c2ab HEAD -- ':!docs/audit'
                                      ← empty: no tracked code changed
```

Both offending files are byte-identical to `dev`; no tracked code changed during
the audit; and the count matches the independently recorded figure in
`docs/OVERNIGHT_REVIEW_GUIDE.md:199` — *"root `pnpm lint` fails with 23 errors
that already exist on `dev` — 1 in `apply-wizard.tsx`, 22 in
`configure-cloud-auth-email.mjs`"*.

`pnpm lint` therefore exits non-zero both before and after this audit, for
reasons this audit did not cause and did not fix (fixing them would mean
touching code, which was out of scope).

### B. Gen-A test suite (measured)

```
$ pnpm -r --if-present run test
packages/cat-engine     Test Files  10 passed (10)   Tests   75 passed (75)
packages/contracts      Test Files   8 passed (8)    Tests   60 passed (60)
packages/test-fixtures  Test Files   3 passed (3)    Tests   25 passed (25)
packages/item-bank      Test Files   5 passed (5)    Tests   53 passed (53)
apps/web                Test Files  24 passed (24)   Tests  123 passed (123)
                                    ─────────────────────────────────────────
                                    50 files                336 passed
```

### C. Reachability — all three import forms

```
$ rg -n "from '\./scoring'|from '@/lib/exam/scoring'" apps/web/src --glob '!*.test.*'
apps/web/src/lib/exam/session.ts:3:import { scoreResponse, type PlayerResponse } from './scoring';

$ rg -n "from '\./harvest'|from '@/lib/exam/harvest'" apps/web/src --glob '!*.test.*'
apps/web/src/lib/exam/session.ts:1:import { accuracyFrom, difficultyFrom } from './harvest';
apps/web/src/components/exam/renderers/embedded-demo-renderer.tsx:5:import { isDemoDone, readMetrics } from '@/lib/exam/harvest';
```

Both are LIVE. A substring grep for `exam/scoring` finds neither.

```
$ rg -n "@gt-selection/(cat-engine|item-bank)" apps/web/src
apps/web/src/lib/exam/cat-adapter.test.ts:1:import { runScoring, type ScoringPolicy } from '@gt-selection/cat-engine';
apps/web/src/lib/exam/cat-adapter.test.ts:3:import { buildBankItem } from '@gt-selection/item-bank';
apps/web/src/lib/exam/cat-adapter.ts:5:} from '@gt-selection/cat-engine';
apps/web/src/lib/exam/cat-adapter.ts:7:import type { BankItem as SpecBankItem } from '@gt-selection/item-bank';
apps/web/src/lib/exam/cat-adapter.ts:11: * item-bank spec item) -> the portable `@gt-selection/cat-engine` scoring inputs
apps/web/src/lib/exam/two-stage-sequencer.ts:45: * classification rule (θ EAP from `@gt-selection/cat-engine` + SPRT/GLR at the

$ rg -ln "cat-adapter" apps/web/src
apps/web/src/lib/exam/cat-adapter.test.ts
```

**Note the two grep traps this exposes.** `two-stage-sequencer.ts:45` is a
*comment*, not an import — a naive grep counts it as a live consumer of
`cat-engine`. And the only file *referencing* `cat-adapter` is its own test.

### D. Two content systems

```
$ wc -l packages/item-bank/data/bank/items.bank.jsonl
     257 packages/item-bank/data/bank/items.bank.jsonl

$ rg -n "items\.bank\.jsonl|items\.served\.jsonl" apps scripts
(no matches outside packages/item-bank)

$ git ls-tree -r --name-only feat/exam-integration -- research/exam-question-types/banks | wc -l
      66              ← Gen-B bank files (7,900 item lines total)
$ git ls-tree -r --name-only HEAD -- research/exam-question-types/banks | wc -l
       0              ← Gen-A has none
```

### E. Orphan false positive

```
$ rg -n "vitest.server-only" apps/web
apps/web/vitest.config.ts:14:      'server-only': path.join(directory, 'vitest.server-only.ts'),
apps/web/vitest.integration.config.ts:13:      'server-only': path.join(directory, 'vitest.server-only.ts'),
```

Reached by bundler alias, never imported. The graph called it ORPHANED; it is
load-bearing tooling.

### F. Gen-A / Gen-B disjointness

```
$ git diff --shortstat HEAD feat/exam-integration
 620 files changed, 140537 insertions(+), 47664 deletions(-)

$ git rev-list --count dev..feat/exam-integration   → 232   (8 behind dev)
$ git rev-list --count feat/exam-integration        → 404
$ git rev-list --count HEAD                         → 218
```

### G. DB verifiers and pgTAP (Gen-B)

```
$ git grep -hoE "create (or replace )?function app\.exam_verify_[a-z0-9_]+" \
      feat/exam-integration -- supabase/migrations | sed 's/.*function //' | sort -u | wc -l
34        ← 1 dispatcher + 3 generic + 30 per-type

$ …sum of plan(N) across supabase/tests/*.sql
Gen-B: 465   (261 of them exam-specific)
Gen-A: 248   (0 exam-specific; its 2 exam files are *.pending.sql and never run)
```

### H. Schema-compatibility probe

Run via `pnpm --filter @gt-selection/contracts exec tsx /tmp/probe.ts`
(script in `DUPLICATE_MODELS.md` §10):

```
[1] contracts.measurementMapSchema vs harvested map -> REJECTED
      M-ACC:      expected number, received string
      M-ACC_num:  Invalid key in record
      M-DIFFREACH:     expected number, received string
      M-DIFFREACH_num: Invalid key in record
[2] contracts.measurementMapSchema vs numeric-only `_num` keys -> REJECTED
      pattern /^M-[A-Z]+$/ does not match "M-ACC_num"
[3] contracts.measurementMapSchema vs canonical M-* keys -> ACCEPTED
[4] screeningOutcomeSchema decision='advance' -> accepted
[4] screeningOutcomeSchema decision='admit'   -> REJECTED (enum)
[4] screeningOutcomeSchema decision='defer'   -> REJECTED (enum)
[4] screeningOutcomeSchema decision='hold'    -> accepted
[4] screeningOutcomeSchema decision='retry'   -> accepted
[5] contracts.examItemSchema with item-bank's 'K-8' band -> REJECTED
      ageBands.0: Invalid option: expected one of "K-1"|"2-3"|"4-5"|"6-8"
```

`[1]`/`[2]` affect the **live** harvest path. `[5]` is **latent** — no generated
item currently uses `K-8`:

```
$ grep -o '"K-8"' packages/item-bank/data/bank/items.bank.jsonl | wc -l
       0
```

### I. Branch upstream hazard

```
$ git for-each-ref --format='%(refname:short)|%(upstream:short)' refs/heads/ \
    | awk -F'|' '$2!="" && $2!="origin/"$1 {print $1" -> "$2}'
feat/exam-contract-reconcile  -> origin/feat/exam-integration
feat/exam-converge            -> origin/feat/exam-integration
feat/exam-item-bank-research  -> origin/dev
feat/exam-key-balance         -> origin/feat/exam-integration
feat/exam-key-balance-2       -> origin/feat/exam-integration
feat/exam-key-balance-3       -> origin/feat/exam-integration
feat/exam-question-types      -> origin/dev
feat/exam-verify-fluid-2      -> origin/feat/exam-integration
feat/exam-verify-fluid-3      -> origin/feat/exam-integration
feat/exam-verify-quant-2      -> origin/feat/exam-integration
feat/exam-verify-spatial-4    -> origin/feat/exam-integration
feat/interview-scope-update   -> origin/dev
```

### J. The wiring branch moved mid-audit

```
$ git rev-parse HEAD feat/exam-cat-adapter-wire
5c2c2ab413f8c3c0fc8db81dbc7860eeb7835605       ← audited tree
4fae489fd0292c011dbb8b3b47ee641392f73e08       ← moved during the audit

$ git log --oneline 5c2c2ab..feat/exam-cat-adapter-wire
4fae489 feat(exam): wire cat-engine EAP/MLE theta into the two-stage demo summary

$ git diff --stat HEAD feat/exam-cat-adapter-wire
 5 files changed, 587 insertions(+), 4 deletions(-)
```

At the start of the audit these were the same commit. Every reachability claim
here describes `5c2c2ab`.
