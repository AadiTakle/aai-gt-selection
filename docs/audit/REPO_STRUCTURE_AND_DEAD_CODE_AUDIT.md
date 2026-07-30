# Repository Structure and Dead-Code Audit

**Audited commit:** `6afc596ed703722a3a5cf9859952ca3a4f9dc8fc` (`origin/dev`, "Merge PR #16:
requirement-ID audit"), 2026-07-30.
**Method:** read-only. Work was done in a throwaway worktree
(`git worktree add ../gt-audit-deadcode -b feat/repo-dead-code-audit 6afc596`) so the primary
checkout was never touched. The only file this audit adds is this one. Nothing was deleted,
renamed, refactored, pruned, or regenerated.

**Requirements served:** R7 (auditable and falsifiable — two findings below break the
"recompute the score from the stored trace" audit path), R8 (feasible under real constraints —
one finding is a deploy-time blocker), R10 (state the boundaries of every conclusion — the
governance records that state those boundaries have drifted from the code).
**Evidence touched:** E-084 established the `scorer_input_hash` recompute-and-compare path that
finding 1 shows is now defeated on the parked scoring seam. No new evidence IDs are claimed; no
decision or scope exception is created by this document.

A concurrent agent was adding files for a Stage 2 question type while this ran. Everything below
describes `6afc596` and nothing that appeared after it.

---

## Act on these five first

Ranked by what they prevent, not by size.

**1. Two different "scorer input hash" implementations exist, and the parked one cannot ever
agree with the live one.** The database computes `sha256:<64 hex>`
(`supabase/migrations/20260725050000_exam_outcome_ownership.sql:92-106`). The scoring function
that D-019 says will be deployed computes a 32-bit FNV-1a rendered as 8 hex characters with no
prefix (`packages/exam-scoring/src/lambda/handler.ts:46-53`). Both surface through a field named
`inputHash`. `packages/contracts/src/application.ts:188` requires
`/^sha256:[0-9a-f]{64}$/`, and `supabase/tests/122_exam_outcome_ownership.test.sql:257` and
`supabase/tests/124_exam_scorer_input_ownership.test.sql:145` assert that regex. So the moment
the lambda seam is wired, the scoring service returns a hash that fails the contract *and* will
never match the hash the database recorded for the same trace — silently breaking the D-029
recompute-and-compare gate that R7 rests on. **Cost to fix: one function body.** Cost of not
fixing: an audit path that reports "verified" while comparing nothing. (Full detail: finding B1.)

**2. The web app reads its item bank from `research/` at runtime, and the container image does
not ship `research/`.** `apps/web/src/lib/exam/bank-loader.ts:67-101` resolves
`research/exam-question-types/banks/*.jsonl` by walking up from `process.cwd()` and reads them
with `fs.readFile`. `apps/web/next.config.ts` sets `output: 'standalone'` with **no**
`outputFileTracingIncludes`, and `apps/web/Dockerfile:56-58` copies only `.next/standalone`,
`.next/static`, and `apps/web/public`. The read failure is swallowed by design
(`bank-loader.ts:86-88`: `catch { continue; // a missing bank must not crash the whole
battery }`), so the deployed app would serve an empty pool and a battery that never starts,
with no error. `pnpm exam:sync` already publishes the *demos* into `apps/web/public/` (which the
Dockerfile does copy) and `exam:sync:check` gates them; the *banks* were never given the same
treatment. (Finding C1.)

**3. `docs/product/FEATURE_TO_REQUIREMENT_MAP.md` — the file `AGENTS.md` designates as the
development index for "current implementation status, blockers, and remaining work" — was last
touched 2026-07-22 (`e9aa889`) and its status section is stamped "As of 2026-07-20 on
`feat/onboarding-backend-core`".** It says "the remaining assessment/review/decision tables and
RPCs … are not implemented" and quotes "22 web/unit tests". The repo at `6afc596` has 12 exam
migrations, 48 wired question types, an adaptive engine, a scoring package, persistence, and
**346 passing web tests**. In 280 lines it mentions the exam on 2 lines, neither of them a
feature row. Every agent is instructed to start here. (Finding D1.)

**4. Thirteen local branches have an upstream pointing at a different branch — four of them at
`origin/dev`, including the branch the concurrent agent is working on right now.** A bare
`git push` from `feat/stage2-flu-system-learning`, `feat/brainlift-metric-evidence`,
`feat/brainlift-test-evaluation`, or `feat/phase2-learning-block` pushes into `dev`, bypassing
the `feat/* -> dev` review step `AGENTS.md` mandates. The prior audit flagged 12 of these on
2026-07-27 and recommended unsetting them as item 1 of "do now, zero risk"; the count has since
gone **up**. Fix is `git branch --unset-upstream <name>` — config only, no history touched.
(Finding E2.)

**5. `packages/contracts` defines 22 exports twice — in `application.ts` and `onboarding.ts` —
with mutually incompatible `.strict()` shapes, and the package barrel picks a winner by
allow-list rather than by decision.** `applicationDraftSchema` is
`{student, education, guardian, referralSourceCode}` in one and
`{application, school, supportDisclosure, financialIntake}` in the other; since both are
`.strict()`, each rejects everything the other requires. `index.ts` allow-lists 13 assessment
names from `./application` and `export *`s `./onboarding`, so consumers silently get the
`onboarding.ts` model and `application.ts`'s 160 lines of pre-D-013 shape are unreachable. This
is the one finding where I reached the wrong answer first and had to reverse it, which is why it
is here rather than buried. (Finding B10.)

**Runner-up.** `apps/web/src/lib/exam/legacy-bridge.ts` (201 lines) is unreachable by
construction and its own docblock names the deletion condition, which is now enforced by the sync
script's protocol gate. (Finding A3.)

---

## Tooling used

No analysis dependency was added to the repo. `git status --porcelain` in the audit worktree is
empty apart from this file.

| Tool                                                          | How it was run                                                    | What it was good for                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `knip` v5                                                     | `pnpm dlx knip@5 --no-exit-code` (no install, no `package.json` change) | Unused files, unused exports, unused dependencies across the pnpm workspace |
| Repo's own gates                                              | `pnpm boundaries:check`, `pnpm security:scan`, `node scripts/sync-exam-demos.mjs --check` | Establishing what is *already* enforced, so this audit reports only gaps  |
| `pnpm -r run test`                                            | full suite, 403s                                                  | Proving which "suspicious" modules are load-bearing                        |
| Three throwaway scripts in `/tmp/gtaudit/`                    | export-consumer census, markdown dangling-path scan, hash differential | Per-package export reachability; doc drift; the finding-1 demonstration    |

`ts-prune` and `depcheck` were not used: `knip` supersedes both and, unlike `ts-prune`,
understands pnpm workspaces and barrel re-exports. TypeScript project references are not
configured in this repo (each package has a standalone `tsconfig.json` with no `references`
array), so `tsc --build`-based unused-export detection was not available.

**Where `pnpm format:check` and `pnpm lint` stand.** Both pass at `6afc596` with this file
present. Be aware that neither actually inspects it: `.prettierignore` lists `docs/` and `*.md`,
and `eslint.config.mjs:11` ignores `docs/**`. The verification is therefore "the repo-wide gates
are still green", not "this file was linted". Both gates were also green *before* this file was
added, so the 23 pre-existing lint errors the 2026-07-27 audit recorded have since been fixed.

---

## A. Dead code

### Certain — verified unreferenced, safe to delete

**A1. `apps/web/src/lib/contracts.ts` — 1 line.** Its entire content is
`export * from '@gt-selection/contracts';`. Zero importers:

```
$ rg -n "lib/contracts|@/lib/contracts" apps/web packages scripts
(no matches)
```

`knip` lists it under unused files. Every consumer imports `@gt-selection/contracts` directly.

**A2. `apps/web/src/lib/family/address-lookup.ts` — 22 lines.** `lookupAddress()` has zero
importers, and `apps/web/src/app/api/address/route.ts:162` performs the same filter over the
same `ADDRESS_SUGGESTIONS` array from the same module (`@/lib/family/vocab`). This is dead *and*
duplicated.

```
$ rg -n "ADDRESS_SUGGESTIONS|lookupAddress" apps/web/src
apps/web/src/app/api/address/route.ts:3:import { ADDRESS_SUGGESTIONS } from '@/lib/family/vocab';
apps/web/src/app/api/address/route.ts:162:  const predictions: AddressPrediction[] = ADDRESS_SUGGESTIONS.filter((a) =>
apps/web/src/lib/family/vocab.ts:127:export const ADDRESS_SUGGESTIONS: AddressSuggestion[] = [
apps/web/src/lib/family/address-lookup.ts:1:import { ADDRESS_SUGGESTIONS, type AddressSuggestion } from './vocab';
apps/web/src/lib/family/address-lookup.ts:18:  if (!q) return ADDRESS_SUGGESTIONS;
```

Note the docblock claims it is a "seam" for a future real provider — but the route it says to
mirror (`/api/address`) **already exists and already does the job**, so the seam is occupied.

**A1 + A2 are the same 23 lines in the same two files that `docs/audit/AUDIT_SUMMARY.md:16-21`
identified on 2026-07-27**, listed as item 4 of "Do now — safe, reversible, no decision required",
and re-confirmed the next day by `DEAD_AND_UNNECESSARY_CODE.md:30-34` ("23 of those lines are the
same two files that audit named — **confirmed**"). Three days and ~340 commits later they are
untouched. The useful finding is less the 23 lines than the fact that the safe-and-cheap tier of
two consecutive audits was not executed. (The 07-28 revision raised the total to 318 lines by
adding `application.ts`; that part is treated separately as B10, because the reasoning behind it
needs correcting before anyone acts.)

### Probable — unreachable by construction; delete after a human confirms intent

**A3. `apps/web/src/lib/exam/legacy-bridge.ts` — 201 lines, plus its 3-line consumer.**
`NATIVE_PROTOCOL_TYPES` (`apps/web/src/lib/exam/adaptive.ts:28-30`) is built from *every* entry in
`registry.generated.ts`; the only call site
(`apps/web/src/components/exam/exam-runner.tsx:515`) fires only when a served item's `typeCode` is
**not** in that set; and every served item comes from the same registry (`bank-loader.ts:30`,
`BANK_TYPE_CODES = EXAM_TYPE_CODES`). The guard is unsatisfiable. Meanwhile
`scripts/sync-exam-demos.mjs:229-239, 407-418` refuses to publish a demo that does not handle
`init`/`start` and emit `result` — exactly the condition the bridge exists to paper over. Its
header still says "The current 8 demos"; there are 48.

What would settle the remaining doubt: whether anyone intends to serve a demo that is *not* in
`registry.generated.ts`. Today that is
impossible — `/api/exam-items` (`apps/web/src/app/api/exam-items/route.ts:3`) serves only
`bank-loader`'s pool, and that pool is keyed by `EXAM_TYPE_CODES`. If the answer is "no", then
`legacy-bridge.ts`, `ExamHost.installLegacyBridge()`
(`apps/web/src/lib/exam/messaging.ts:134-136`), the guard at `exam-runner.tsx:515`, and the
`LEGACY_DEMO_BRIDGE_SOURCE` export all go together.

**A4. 34 orphaned question-type generators — 14,949 lines, 28.4% of
`research/exam-question-types/generators/` (52,578 lines).** Commit `3639e86` ("retire the 17
question types the reviewer pass rejected", 64 files, −17,484) deleted each retired type's bank
and demo but left both its generator and its checker in place:

```
$ comm -23 <(ls generators/*.mjs | xargs -n1 basename | sed 's/\.mjs$//' \
      | grep -vE '^(check-|item-shape|lexicon-child-en|occlusion-legibility|variety)' | sort) \
    <(ls banks/*.jsonl | xargs -n1 basename | sed 's/\.jsonl$//' | sort)
CX-curious-02  CX-diverge-01  CX-figural-01  CX-sjt-01  FLU-MATRIXBUILD-01
GB-DEBATE-01   GB-FILTER-01   GB-PATHFORGE-01  GB-SHAPEFIT-01  QUANT-BUILD-01
QUANT-EQUAL-01 QUANT-MOBILE-01  QUANT-NUMLINE-01  VER-BUILDIT-01  VER-WORDTRAIN-01
WM-gate-01     WM-gridflash-01
```

Exactly 17, matching the commit. The same 17 come back for `check-*.mjs`. **These are generators
whose output artifact was deliberately deleted — which is precisely the "parked on purpose vs.
dead" judgement call, and I do not think it should be made without the owner.** The case for
keeping them: `research/exam-question-types/README.md:81` treats the generator as the
reproducible recipe, so a retired type can be revived by re-running it. The case for deleting:
`docs/product/QUESTION_IMPROVEMENT_PLAN.md §5` retired these on *design* grounds (the reviewer
pass rejected the types themselves), not on generation-quality grounds, so the recipe reproduces
something already judged unusable. **What would settle it:** one line in
`QUESTION_IMPROVEMENT_PLAN.md` saying whether any of the 17 is a revival candidate. If none is,
this is the single largest deletable block in the repo.

### Needs a human — parked, and the parking is legible but unratified

**A5. Track B's contract surface — 1,241 lines — is exercised only by its own fixtures.**
Per-module census (`/tmp/gtaudit/contracts-consume.mjs`, matching every exported name against
every tracked `.ts/.tsx/.mjs/.sql` file outside `packages/contracts/`):

| Module                        |   LOC | exports | outside references | reached from                            |
| ----------------------------- | ----: | ------: | -----------------: | --------------------------------------- |
| `api-envelope.ts`             |    22 |       3 |              **0** | nothing                                 |
| `decision.ts`                 |    67 |      16 |              **0** | nothing                                 |
| `reason-codes.ts`             |    20 |       2 |              **0** | nothing                                 |
| `review.ts`                   |   792 |      63 |                  8 | `packages/test-fixtures` only           |
| `replay.ts`                   |   236 |      14 |                  2 | `packages/test-fixtures` only           |
| `correction.ts`               |   213 |      15 |                  3 | `packages/test-fixtures` only           |
| `workflow.ts`                 |    70 |      10 |                  3 | `dashboard-loader.tsx` (**live**)       |
| `onboarding.ts`               |   612 |      82 |                 49 | app wizard, adapter (**live**)          |
| `assessment-exam-adaptive.ts` |   644 |      79 |                 27 | `lib/exam/types.ts`, research QA (live) |
| `application.ts`              |   225 |      43 |          see **B10** | barrel exports 13 of 43                 |
| `errors.ts` / `roles.ts`      |    61 |       6 |                  5 | auth, adapter (**live**)                |

`api-envelope.ts` + `decision.ts` + `reason-codes.ts` = **109 lines with no reference anywhere in
the repo, including tests**. `review.ts` + `replay.ts` + `correction.ts` = **1,241 lines reached
only through `packages/test-fixtures`, which is itself imported only by test files** (five, all
`*.test.ts`), so the whole Track B reviewer/replay/correction contract surface is exercised by
its own fixtures and by nothing else.

This is very likely intended parking — a specified-but-unbuilt Track B — and I am explicitly
**not** calling it dead. But it is not *labelled* as parked anywhere I could find, and 1,350
lines of schema that only its own fixtures read is indistinguishable from abandonment to the
next reader. **What would settle it:** a status line in `FEATURE_TO_REQUIREMENT_MAP.md` per
contract family. Which is finding D1 again, from the other end.

**Caution on this table.** The census matches names, not module resolution, so it *over*-reports
reachability whenever two modules export the same name. That is exactly what happens in
`application.ts` — see B10, where a first pass of this audit reached the wrong conclusion before
the barrel was read.

**A6. `scripts/validation-harness/` (2,873 Python lines across 21 files) is not reachable from
any npm script or CI job.** `package.json` has no entry for it; `.github/workflows/ci.yml` never
invokes Python. It is documented (`scripts/validation-harness/README.md`,
`TRACEABILITY.md`) and referenced from `docs/audit/GEN_A_VS_GEN_B.md` and
`docs/PERSONA_SIM_RESULTS.md`, and it ships a checked-in `sample-report/` plus its own
`tests/test_psychometrics.py` and `tests/test_pipeline_smoke.py`. Reads as a deliberately
external harness, run by hand. **Not dead — but not verified either**: it has tests and nothing
runs them, so nothing would tell you if it stopped working. What would settle it: a decision on
whether it is a gate or a completed one-off study.

### `knip` findings I checked and rejected as false positives

Recorded so nobody re-chases them.

| `knip` said                                        | Reality                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `apps/web/vitest.integration.config.ts` unused     | Named by `apps/web/package.json` `test:integration`, and run by CI (`ci.yml`, "authenticated onboarding action integration") |
| `scripts/audit-requirement-ids.mjs` unused         | Hand-run tool documented by `docs/governance/REQUIREMENT_ID_AUDIT.md`                                              |
| `scripts/configure-cloud-auth-email.mjs` unused    | Hand-run, documented in `docs/DEMO_TONIGHT.md` and three overnight records                                          |
| 127 `research/exam-question-types/generators/*.mjs` unused | Run by hand / by `RUN` loop; 93 of them still own a live bank. Only the 17-type subset in A4 is orphaned    |
| 8 `research/exam-question-types/qa/*.mjs` unused    | Standalone harness with its own `qa/package.json` (`"qa": "node qa.mjs"`) and its own Playwright dep                |
| `Field` in `synthetic-field.tsx` unused export      | Used inside its own module (lines 53, 100). Over-broad export, not dead code                                        |
| `db-types/database.generated.ts` helpers unused     | Generated by `supabase gen types`; unused helper types are expected output                                          |
| `docs/critic-ready-product-roadmap.canvas.tsx`      | A Cursor Canvas artifact under `docs/`, which no build root includes. Inert by placement, not dead                  |

`knip` also flagged `@testing-library/user-event` and root `vitest` as unused devDependencies.
Both look real but are trivia; I did not chase them.

**Checked and found clean — no orphans here.** `package.json` scripts: all 12 file targets exist
(`exam:bracketing`, `exam:phase1-demo`, `exam:phase2-demo`, `exam:sync`, `exam:reconcile`,
`exam:verify:diff`, `db:*`, `verify`, `boundaries:check`, `security:scan`). Per-type verifiers:
25 registered across `apps/web/src/lib/exam/verifiers/{fluid,verbal,quantitative,spatial}.ts`,
and the only one not in the wired registry is `CX-achieve-02`, which is correctly gated by
`research/exam-question-types/qa/NOT_SERVABLE.json` and documented at `fluid.ts:261`. No test
file targets a deleted module.

---

## B. Duplicated and near-duplicated logic

### B1. The calibration case: two string hashes, still divergent — and now in three places

The reported problem ("two different hash functions producing different seeds for the same input
string") **is still real**, and it has two distinct instances.

**Instance 1 — scorer-input fingerprint. Consequential.**

| Where                                                    | Algorithm                | Output for the same trace |
| -------------------------------------------------------- | ------------------------ | ------------------------- |
| `supabase/migrations/20260725050000_exam_outcome_ownership.sql:92-106` | SHA-256 over `jsonb::text` | `sha256:` + 64 hex        |
| `packages/exam-scoring/src/lambda/handler.ts:46-53`      | FNV-1a 32-bit            | 8 hex, no prefix          |

Both are called the fingerprint of the scorer input; both are exposed as `inputHash`
(`handler.ts:40`, `migration:480`, `migration:715`, `persistence.ts:334`). The live path uses
the SQL one — `/api/exam-results` (`route.ts:133`) reads `stored.inputHash`, which
`apps/web/src/lib/exam/persistence.ts:366` obtains from `api.exam_get_scoring_inputs`, i.e. from
`app.exam_scorer_input_hash`. The TS one is reachable only via
`packages/exam-scoring/src/index.ts:31` and is exercised only by
`packages/exam-scoring/src/lambda/handler.test.ts`, whose three assertions test
self-consistency (`second.inputHash === first.inputHash`) and never compare against the database.
So the divergence is invisible to the suite. `infra/lambda.tf` is explicitly a "SKELETON — not
wired to a live account" with a placeholder artifact, which is why this has not bitten yet.

**Instance 2 — deterministic unit draw from a string. Two incompatible algorithms.**

- `packages/exam-engine/src/rng.ts:22` `hashUnit(seed, key)` — Murmur-style, constants
  `0x9e3779b9 / 2654435761 / 3266489909`, returns `[0,1)`. Drives item and area selection
  tie-breaks (`selection.ts:54, 75, 81, 145-146`).
- `apps/web/src/app/api/exam-emulate/route.ts:52-59` `seededUnit(seed)` — FNV-1a with
  `handler.ts`'s exact constants but a different tail mapping (`(hash >>> 8) / 0x01000000`),
  returns `[0,1)`. Drives emulated correctness and synthetic process metrics.

Run on the same inputs (`/tmp/gtaudit/hash-demo.mjs`):

```
input                              seededUnit(exam-emulate)  hashUnit(exam-engine, seed=0xc0ffee)
item:FLU-MATRIX-01-0007            0.7639366984367371        0.7391410828568041
FLU-MATRIX-01-0007:11.00           0.6840754747390747        0.34519587154500186
area:spatial:12                    0.47535115480422974       0.3466272356454283
```

Nothing today feeds the same string to both, so this is latent rather than broken. The real cost
is that the repo now has three hand-rolled string hashes in production paths (two of them
FNV-1a with identical constants and different tails) and no single owner for "turn a string into
a deterministic number".

**B2. `mulberry32` is exported and never imported; three files hand-copy it instead.**

```
$ rg -n "mulberry32" packages apps scripts/*.ts | grep -v research
packages/exam-engine/src/index.ts:73:export { mulberry32, hashUnit } from './rng';
packages/exam-engine/src/rng.ts:11:export function mulberry32(seed: number): () => number {
packages/exam-scoring/src/learning-curve.test.ts:12:function mulberry32(seed: number): () => number {
packages/exam-scoring/src/learning-rate-readout.test.ts:12:function mulberry32(seed: number): () => number {
apps/web/src/lib/exam/persistence.integration.test.ts:146:function mulberry32(seed: number): () => number {
```

Zero `import`s of it anywhere. Three verbatim local redefinitions. `rng.ts:6` even advertises it
as "exported for callers that want a conventional streaming PRNG" — there are three such callers
and none of them took it. Cheapest fix in this document.

**B3. The 1PL/Rasch logic exists in two production modules, and it is legitimate — but the slope
constant is triplicated.** The two implementations are genuinely different models, not copies:

- `packages/exam-scoring/src/ability.ts` — one-parameter MAP fit of θ by 60-step bisection on
  the log-posterior derivative (`:70` for the response probability, `:139` for Fisher
  information).
- `packages/exam-scoring/src/learning-curve.ts:170-177` — joint (θ₀, λ) Newton fit of a logistic
  *with a lower asymptote*, which reduces to the plain 1PL score/information pair at `c = 0`
  (the code says so at `:175`). A nested generalisation, not a duplicate.

The duplication is the constant. `slope = 1.0` is written three times as an independent literal:
`policy.ts:67` (`DEFAULT_ABILITY_BRACKETING`), `learning-curve.ts:131` (parameter default), and
`apps/web/src/app/api/exam-emulate/route.ts:36` (`const SLOPE = 1.0`, whose comment claims it
"matches the engine/scorer default so the model agrees" — a claim nothing enforces). Change the
policy and the emulator silently models a different child. `learning-curve.ts:49-51` documents
that its prior widths must be rescaled by `1/slope` if slope moves, which makes the coupling
explicit and the triplication worse.

**B4. Two ability estimators for the same construct — confirmed deliberate, do not "fix".**
`packages/exam-engine/src/update.ts:42-90` is a Robbins-Monro/Kesten decaying-gain staircase
indexed by direction reversals; `packages/exam-scoring/src/ability.ts` is a 1PL MAP fit. They
disagree by design and `ability.ts:17-19` says why: *"the engine's own running estimate is NOT an
input, so the scorer keeps its single input contract and a stored trace still reproduces the
score exactly."* Listed here because it looks exactly like duplicated psychometrics and is not.

**B5. The 5-band difficulty scale is written out in three places.** Edges `4 / 8 / 12 / 16 / 20`
appear as bracket `theta` spans (`policy.ts:140-144`), as display band cutoffs
(`apps/web/src/lib/exam/adaptive.ts:350-356` `THETA_BANDS`), and as prose in
`apps/web/src/lib/exam/contract.ts:32` and `packages/exam-engine/src/config.ts:4`. `policy.ts`
is the only one a policy edit would move.

**B6. `metricMapSchema` is defined twice, incompatibly, and both are live.**
`packages/contracts/src/assessment-exam-adaptive.ts:80` is
`z.partialRecord(metricIdSchema, z.number())` — known metric IDs, numbers only.
`apps/web/src/lib/exam/types.ts:26` is `z.record(z.string(), z.union([z.string(), z.number()]))`
— any key, strings allowed. The app-tier one is reached from `/api/exam-results` through
`examSessionInputSchema` (`route.ts:153`), so the legacy branch of a live route validates metric
maps against the *looser* schema while the contracts package forbids exactly what it permits.

**B7. `apps/web/src/lib/exam/types.ts` carries a 90-line "LEGACY" block that is still live.**
Lines 21-110 (`metricMapSchema`, `examItemResultSchema`, `examSessionInputSchema`,
`examSummarySchema`, `examSessionRecordSchema`, `summarize()`) are labelled "Retained for the
in-memory store + existing tests", and `summarizeScored()` at `:195` is described as mirroring
`summarize()`. Both are reached: `route.ts:155` calls `summarize`, `:94` and `:124` call
`summarizeScored`. So this is two parallel session models and two summarisers behind one route,
not dead code — but the "legacy" label is now 90 lines of load-bearing production path.

**B8. `apps/web/public/exam-demos/*.html` (20,154 lines) duplicates
`research/exam-question-types/demos/*.html` (20,789 lines) — and this one is legitimate.**
Verified, not assumed:

```
$ node scripts/sync-exam-demos.mjs --check
…
OK: public/exam-demos and registry.generated.ts are up to date.
```

`scripts/sync-exam-demos.mjs` is a byte-exact copier with gates (protocol conformance at
`:229-239`, answer-key leak scan at `:242-255`, servability at `:150-167`), it prunes stale files
(`:606-608`), and `--check` fails on drift (`:593-600`). `COMPAT_PATCHES` is empty (`:63`), so
published bytes equal source bytes. 48 published files for 49 banks; the one gap is
`CX-achieve-02`, blocked with a written reason. **This is a generated artifact with a verifying
gate, and should not be treated as duplication.** The one flaw: that gate is not in CI — see C3.

**B9. `dev/family-preview/**` vs `(embed)/family/**` — confirmed intentional, one 9-line
exception.** Six page files each, all differing substantively: the preview tree calls
`notFound()` in production and renders different components (`PreviewDashboard`, `PreviewExam`)
driven by localStorage. Only `template.tsx` is a near-copy (9 lines, 5 differing — the comment
and the function name).

### B10. Twenty-two contract names are defined twice inside `packages/contracts`, with incompatible shapes, and the barrel silently picks one

`application.ts` and `onboarding.ts` both define these 22 exports:

```
applicationStateSchema  applicationFinalSubmissionSchema  applicationDraftSchema
saveApplicationDraftRequestSchema   applicationVersionSchema
saveApplicationDraftResponseDataSchema  saveApplicationDraftResponseSchema
getApplicationStatusRequestSchema   getApplicationStatusResponseSchema
submitApplicationRequestSchema  submitApplicationResponseDataSchema
submitApplicationResponseSchema
+ the 10 matching `z.infer` type aliases
```

They are not equivalent. `applicationDraftSchema` is a different model in each, and both are
`.strict()`, so **each rejects every field the other requires**:

| `application.ts:82-92`                                       | `onboarding.ts:426-435`                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `student?`, `education?`, `guardian?`                        | `application?`, `school?`, `supportDisclosure?`, `financialIntake?`       |
| `referralSourceCode?`                                        | —                                                                         |
| `finalSubmission?`, `syntheticOnly` (shared)                 | `finalSubmission?`, `syntheticOnly` (shared)                              |

`saveApplicationDraftRequestSchema` diverges too: `onboarding.ts:440` requires
`studentProfileVersionId`, `application.ts:94-101` has no such field.

**Which one wins, and why nobody noticed.** `packages/contracts/src/index.ts` re-exports
`./application` through an explicit 13-name allow-list — all of them assessment schemas — and
re-exports `./onboarding` with `export *`. So every consumer of `@gt-selection/contracts` gets
the `onboarding.ts` definitions, and `application.ts`'s 22 same-named exports are unreachable
through the package's public entry point. The only deep importer of `./application` anywhere is
`correction.ts:4`, and it takes `assessmentInputSchema` (an allow-listed one).

```
$ rg -n "from './application'|contracts/src/application" packages apps scripts
packages/contracts/src/correction.ts:4:import { assessmentInputSchema } from './application';
packages/contracts/src/index.ts:10:} from './application';
packages/contracts/src/index.ts:18:} from './application';
```

The `student/education/guardian` shape is the pre-D-013 application model; the
`application/school/supportDisclosure/financialIntake` shape is the D-013 two-layer one. Half a
superseded model was left in place with live names.

**This corroborates `docs/audit/DEAD_AND_UNNECESSARY_CODE.md`'s recommendation #2** ("delete
`packages/contracts/src/application.ts` lines 7–152 and 206–219, 160 lines — the highest-confidence
deletion in the repo after `address-lookup.ts`"), which is still unexecuted. Two refinements
before anyone acts on it: four of those schemas (`priorSchoolSchema:29`,
`applicationStudentSchema:38`, `applicationEducationSchema:50`, `applicationGuardianSchema:61`)
are composition inputs to `applicationDraftSchema` at `:56` and `:84-86`, so the range has to go
as one unit or not at all; and `statusProjectionSchema` is imported at `:5` from `./workflow`
solely for the shadowed response schemas, so that import goes with it.

**I flag this as the clearest instance of the trap this kind of audit sets.** My own name-based
census initially reported 21 of these 43 exports as "live" because the app *does* reference the
names — from `onboarding.ts`. Reading `index.ts` reversed the conclusion. Any tool that matches
identifiers rather than resolving modules will make the same mistake here.

---

## C. Structural drift and boundary leaks

### What `scripts/check-workspace-boundaries.ts` actually enforces

37 lines. It walks `packages/**`, and raises a violation when a file contains the literal string
`@gt-selection/web` or `apps/web` (`:25-27`), or when a file under a `contracts/` path contains
`@supabase/` (`:28-30`). That is all. Two string checks, one direction, one tier. It passes at
`6afc596`. Everything below is a boundary it cannot see.

**C1. `apps/web` depends on `research/` at runtime — the deploy blocker.** Detailed in "Act on
these five first" item 2. The boundary script only looks *from* `packages/`, so an
`apps/ -> research/` edge is structurally invisible to it. This is the most consequential
boundary in the repo and the least guarded.

**C2. `packages/` also reaches into `research/`, in three places.**

```
packages/contracts/src/bank-conformance.test.ts:33: const BANK_DIR = join(repoRoot(), 'research/exam-question-types/banks');
packages/exam-engine/src/testing/real-bank.ts:3:    …reads research/exam-question-types/ instead of a fabricated bank
packages/exam-engine/src/real-bank.test.ts:5:      …against what research/exam-question-types/ actually declares
```

Tests only, and `real-bank.ts:77` even accounts for the hazard ("`research/` is written
concurrently by…"). But it means `packages/contracts` — the tier whose own README says it must
not depend on implementation details — has a filesystem dependency on a research directory, and
`check-workspace-boundaries.ts` permits it because the forbidden strings are `apps/web` and
`@gt-selection/web`.

**C3. CI does not run on `research/**`, so edits to the app's runtime item bank trigger nothing.**
`.github/workflows/ci.yml` `paths:` lists `apps/**`, `packages/**`, `scripts/**`,
`supabase/**` and eight root files. `research/**` and `infra/**` are absent. Consequences:

- A bank or demo edit runs **no CI at all**, while three test files read those banks
  (`packages/contracts/src/bank-conformance.test.ts`,
  `packages/exam-engine/src/real-bank.test.ts`,
  `apps/web/src/lib/exam/verifiers/fluid-verifiers.test.ts:26`).
- `pnpm exam:sync:check` — written for CI, per `sync-exam-demos.mjs:25` — is in **no** workflow
  step. Demo/registry drift is unguarded in CI even though the checker exists and passes.
- `pnpm typecheck:scripts` covers `scripts/`, but no gate covers the 127 `.mjs` generators.

**C4. `@gt-selection/test-fixtures` (1,093 lines of synthetic fixtures) sits in `apps/web`'s
`dependencies`, not `devDependencies`, and is imported only by tests.** Five importers, all
`*.test.ts`; zero production modules. Next tree-shakes what nothing imports, so this is a
manifest-correctness problem rather than shipped bytes — but it means `pnpm install --prod`
pulls synthetic fixtures into a production install, and a future accidental import from app code
would be invisible to review. `check-workspace-boundaries.ts` does not classify dependencies.

**C5. Package responsibilities are clear; the app tier's are not.** `packages/` reads cleanly:
`contracts` (Zod shapes), `db-types` (generated), `exam-engine` (selection + state + staircase),
`exam-scoring` (metrics + brackets + fits), `test-fixtures`. The overlap is inside
`apps/web/src/lib/exam/`, which holds four things at once: integration wiring
(`adaptive.ts`, `messaging.ts`, `persistence.ts`), a **second** set of exam types
(`types.ts`, `contract.ts` — see B6/B7), a **server-only data-access layer**
(`bank-loader.ts`), and the **25 per-type answer verifiers** (`verifiers/**`, 3,496 non-test
lines) that are the app tier's half of a correctness authority the database also implements
(`app.exam_verify_*`, 34 functions). Two of those four have no business being in `lib/`, and the
fourth is half of a duplicated authority nobody has reconciled.

**C6. Three test files share the `124_` prefix, and the docs cite the ambiguity.**
`supabase/tests/124_exam_scorer_input_ownership.test.sql`,
`124_exam_verify_awkward_batch.test.sql`, `124_exam_verify_moderate_batch.test.sql`. The numeric
prefix is meant to be a unique run ordinal. `docs/architecture/EXAM_VERIFIER_PORT_INVENTORY.md:77,
92, 100` and `docs/research/ASSUMPTIONS_AND_EVIDENCE.md:102` all cite bare "`supabase/tests/124`",
which now resolves to three different files.

---

## D. Stale documentation and records

I separated dated point-in-time records from living documents before judging anything. A
mechanical dangling-path scan over all tracked markdown found **160 distinct non-existent
repo paths across 485 mentions**, but that number is not the finding — most of it is correctly
frozen history. The finding is which mentions sit in documents that are still supposed to be
true.

### Correctly frozen — do not touch

`docs/OVERNIGHT_*.md` (8 files), `docs/HANDOFF_2026-07-28.md`,
`docs/GENB_VERIFICATION_2026-07-28.md`, `docs/PSYCHOMETRIC_SWEEP_2026-07-28.md`,
`docs/PERSONA_SIM_RESULTS.md`. Together they account for ~66 dangling-path mentions, essentially
all of them references to `packages/cat-engine`, `packages/item-bank`, `lib/exam/session.ts`,
`harvest.ts`, `cat-adapter.ts`, and `two-stage-sequencer.ts` — deleted in the consolidation.
That is exactly what a dated record *should* look like afterwards. `docs/governance/DECISION_LOG.md`
likewise references `docs/prd-sprint/` twice (`:48`, `:81`); both are D-006/D-007 recording the
decision to delete that folder. Correct as written.

### D1. `docs/product/FEATURE_TO_REQUIREMENT_MAP.md` — a living index that stopped tracking

The lead finding, detailed above. Two supporting measurements: `rg -ci
"exam|screener|adaptive|question type|verifier"` returns **2** matching lines in 280, neither a
feature row; and the snapshot's own numbers (`22 web/unit tests`, `204 pgTAP assertions`) against
measured reality (**346 web tests**; `438` pgTAP assertions summed across 20 `plan(N)` calls).
Its own "Maintenance rules" section (`:268`) requires an update "when a feature changes status" —
48 question types, an engine, a scorer, and 12 migrations landed without one.

### D2. `docs/product/GT_ADMISSIONS_APPLICATION_MVP_PRD.md` — every register pointer is broken

The PRD is live (last touched `429507d`, 2026-07-28). Its "Identifier registers" and "Developer
specifications" sections point at eight paths that do not exist, because the docs reorg
(`e9aa889`, 2026-07-22) moved the targets and the PRD was not updated:

| PRD line             | Points at                             | Actual location                              |
| -------------------- | ------------------------------------- | -------------------------------------------- |
| `:35`                | `docs/DECISION_LOG.md`                | `docs/governance/DECISION_LOG.md`            |
| `:40`                | `docs/ASSUMPTIONS_AND_EVIDENCE.md`    | `docs/research/ASSUMPTIONS_AND_EVIDENCE.md`  |
| `:43`                | `docs/project-requirements.md`        | `docs/product/project-requirements.md`       |
| `:44`                | `docs/TRACEABILITY_MATRIX.md`         | `docs/product/TRACEABILITY_MATRIX.md`        |
| `:47`                | `docs/FEATURE_TO_REQUIREMENT_MAP.md`  | `docs/product/FEATURE_TO_REQUIREMENT_MAP.md` |
| `:51, :56, :62, :65` | `docs/ARCHITECTURE_PLAN.md`           | `docs/architecture/ARCHITECTURE_PLAN.md`     |
| `:53`                | `docs/ONBOARDING_OVERHAUL_TICKETS.md` | `docs/architecture/ONBOARDING_OVERHAUL_TICKETS.md` |

These are inline code spans, not markdown links, so no link checker would ever flag them. A
contributor told "the R/H register is `docs/project-requirements.md`" finds nothing there.

### D3. `docs/README.md` indexes 12 of 45 docs and omits an entire directory

Last touched 2026-07-22 (`ca2006b`). 33 tracked markdown files under `docs/` are not mentioned,
including **all 8 of `docs/audit/`** (5,113 lines), 5 of 9 `docs/architecture/` files (every
`EXAM_*` one), `docs/governance/REQUIREMENT_ID_AUDIT.md`,
`docs/product/QUESTION_IMPROVEMENT_PLAN.md`, and `docs/product/STAGE2_QUESTION_DESIGN.md`. Its
"Other" section (`:56`) describes `critic-ready-product-roadmap.canvas.tsx` as an
"Excalidraw/canvas roadmap artifact", which is not what that file is.

### D4. `docs/audit/**` (8 files, 5,113 lines) — half-frozen, and dangerous in one specific way

These self-stamp a commit and date (`AUDIT_SUMMARY.md:3`: "`feat/repo-structure-audit` @
`5c2c2ab`, 2026-07-27"), which is good practice and is why I am not calling them simply stale.
They carry **197 dangling-path mentions**, concentrated in `DUPLICATION_AND_REDUNDANCY.md` (56),
`DEAD_AND_UNNECESSARY_CODE.md` (54), and `REPO_RESTRUCTURE_PROPOSAL.md` (37) — nearly all
`packages/cat-engine` (30 mentions) and `packages/item-bank` (31), both deleted.

The problem is not the findings, which were correct when written. It is that
`REPO_RESTRUCTURE_PROPOSAL.md` is a **proposal**, i.e. an instruction to act, and its target
layout is organised around a fork ("Gen-A vs Gen-B") that has since been resolved and around two
packages that no longer exist. `AUDIT_SUMMARY.md:57-100` presents three open "Decisions you must
make" of which Decision 1 and Decision 2 are now moot. Someone executing it in good faith would
do damage. Its "Do now" list is also now mixed: item 3 is moot (package deleted), item 5 is done
(lint is clean), items 1 and 2 are **not** done and item 1 has regressed (E2), item 4 is not done
(A1/A2).

The cheap fix is a two-line superseded banner at the top of each, naming this document. **What I
did not do, deliberately:** edit them. That is a change to an existing file.

### D5. Generated research artifacts still present the 17 retired types as current

`3639e86` removed banks and demos but did not regenerate the catalog and explorer outputs:

| Artifact                                                 | Size            | State                                                                 |
| -------------------------------------------------------- | --------------- | --------------------------------------------------------------------- |
| `research/exam-question-types/catalog/master_types.jsonl` | 66 rows         | all 17 retired codes present (**26% of rows**)                         |
| `research/exam-question-types/review-data.json`           | 66 entries, 415 KB | all 17 retired codes present, verified by parsing every `type_id`  |
| `research/exam-question-types/app.html`                   | 422 KB inlined  | all 66, incl. `"demo_path": "demos/GB-PATHFORGE-01.html"` — gone       |
| `catalog/INDEX.md`, `catalog/COVERAGE_REPORT*.md`         | 91 + 52 lines   | retired types counted in the coverage baseline                        |
| `research/exam-question-types/specs/types_*.jsonl`        | 66 rows total   | still declare the retired types (the design source — arguably correct) |

Measured as a share of entries rather than lines, because these are single-line-per-record JSONL
and one-giant-line inlined HTML; a line count would understate it badly.

A reviewer opening `app.html` or `review.html` sees 66 types, 17 of which can never be served,
with broken demo links. Benign for `sync-exam-demos.mjs` (it looks catalog rows up by code, so
extra rows are ignored) but actively misleading to a human. Regenerating with `build_types.py`,
`build_app.py`, `build_review_data.py` is mechanical **once someone decides whether the specs
should keep the retired entries** — which is the same question as A4.

### D6. `research/exam-question-types/RUN` says the fleet is running; `WAVE_STATE.json` says it finished

`RUN` is a sentinel: *"While this file exists, the overnight question-type fleet keeps generating
new waves. To STOP the run cleanly: delete this file."* `waves/WAVE_STATE.json` reports
`"status": "complete"` with `"recat_waves_run": 13` and a `"next"` that has since been done
(the BrainLift work merged as PR #8). Flagged with low confidence only, because a Stage 2
question-type agent was active during this audit and may legitimately be keyed off this
sentinel. **What would settle it:** ask whoever is running the Stage 2 agent whether it reads
`RUN`.

### Minor, verified

`docs/architecture/ARCHITECTURE_PLAN.md:224, 424` reference `infra/terraform/`; `infra/` holds
`.tf` files at its root with no `terraform/` subdirectory.

**False positives my own scan produced** — stated so the 485 number is not over-read.
`docs/README.md:21-27`'s seven `research/*.md` links are *correct* (they are relative to
`docs/`, and my scanner resolved from the repo root). `AGENTS.md:127` ("research/governance
branch") and `:154` (`research/overnight-backend-selection`) are branch names, not paths.
`docs/architecture/EXAM_ADAPTIVE_STATUS.md:103` is a migration-filename prefix and `:200` is
gitignored `.env.local`. Roughly 15-20 of the 160 distinct paths are of this kind. Treat the
scan as a lead generator, never as authorisation to edit.

---

## E. Worktree and branch sprawl

**E1. 40 worktrees; 28 are prunable, 12 must be kept.** All 40 were classified by whether their
branch is an ancestor of `6afc596` and whether the tree has uncommitted work
(`git -C <path> --no-optional-locks status --porcelain=v1` — the `--no-optional-locks` matters,
it avoids rewriting another worktree's index). Note that a first pass using `awk '{print $2}'` on
`git worktree list --porcelain` silently reported every tree as clean, because the repository
paths contain spaces; the numbers below come from the corrected parse.

**Keep — has uncommitted work:**

| Worktree                    | Branch                                             | Dirty files | Merged? |
| --------------------------- | -------------------------------------------------- | ----------: | ------- |
| `r11-reconciliation`        | `feat/r11-reconciliation`                          |          12 | now no  |
| `rescope-screener-primary`  | `feat/gov-rescope-screener-primary` (renamed mid-audit) |       2 | now no  |
| `exam-stage-classification` | `feat/exam-stage-classification`                   |           1 | yes     |
| `genb-verification`         | `feat/genb-verification`                           |           1 | **no**  |

**Keep — unmerged commits that exist only here:**

| Worktree                        | Branch                        | Ahead of dev | Behind |
| ------------------------------- | ----------------------------- | -----------: | -----: |
| `gt-selection-adaptive-exam`    | `feat/adaptive-exam-app`      |            6 |    425 |
| `gt-selection-interview-scope`  | `feat/interview-scope-update` |            1 |    437 |
| `phase2-learning-rate`          | `feat/phase2-learning-rate`   |            1 |    288 |
| `genb-verification`             | `feat/genb-verification`      |            1 |    154 |

**Keep — active or infrastructure:** the primary checkout, `stage2-flu-system-learning` (the
concurrent agent), `stage2-question-design`, and this audit's `gt-audit-deadcode`.

**Prunable — branch fully merged into `origin/dev`, tree clean (26):**
`gt-capstone-exam-validation-harness`, `gt-selection-ex-handshake`,
`gt-selection-ex-integration`, `gt-selection-ex-telemetry`, `gt-selection-exam-items`,
`gt-selection-exam-session-shell`, `brainlift-metric-evidence`, `brainlift-test-evaluation`,
`brand-on-demo`, `cat-adapter-wire`, `decision-vocab`, `exam-genA-integration-probe`,
`exam-genAB-consolidation-plan`, `exam-integration-verify`, `exam-model-reconcile`,
`exam-scoring-engine`, `exam-scoring-lambda`, `exam-two-stage-demo`,
`exam-two-stage-demo-shots`, `exam-two-stage-real-pools`, `overnight-review-guide`,
`persona-sim`, `psychometric-sweep`, `repo-restructure-audit`, `repo-structure-audit`,
`test-structure-revamp`. Behind `origin/dev` by 153 to 440 commits each.

**Prunable — detached HEAD, matching no branch (2):** `gt-selection-pr1-audit` @ `0d061ab`,
`gt-selection-qbank-preview` @ `47f5311`. The prior audit could not identify the latter either;
it is still unidentified. Both clean, so nothing is lost, but confirm before removing.

Note `requirement-id-audit` is merged and clean but only 4 commits behind — likely just
finished. Not in the prune list; a human should confirm.

**What pruning buys:** `gt-worktrees/` alone is **17 GB** (`du -sh`, 26 trees, dominated by
per-worktree `node_modules`); one measured sibling (`gt-selection-adaptive-exam`) is 751 MB. The
26 clean-and-merged trees are conservatively 15-17 GB. **This is a recommendation only —
nothing was pruned.** The safe form is `git worktree remove <path>` followed by
`git branch -d <name>` (never `-D`), one at a time.

**E2. Thirteen mis-set branch upstreams — up from 12.** Full list under "Act on these five
first" item 4; the mechanism is that `git push` with no arguments follows `@{upstream}`.

```
$ git for-each-ref --format='%(refname:short)|%(upstream:short)' refs/heads/ \
    | awk -F'|' '$2!="" && $2!="origin/"$1 {print $1" -> "$2}'
feat/brainlift-metric-evidence   -> origin/dev
feat/brainlift-test-evaluation   -> origin/dev
feat/exam-contract-reconcile     -> origin/feat/exam-integration
feat/exam-converge               -> origin/feat/exam-integration
feat/exam-key-balance            -> origin/feat/exam-integration
feat/exam-key-balance-2          -> origin/feat/exam-integration
feat/exam-key-balance-3          -> origin/feat/exam-integration
feat/exam-verify-fluid-2         -> origin/feat/exam-integration
feat/exam-verify-fluid-3         -> origin/feat/exam-integration
feat/exam-verify-quant-2         -> origin/feat/exam-integration
feat/exam-verify-spatial-4       -> origin/feat/exam-integration
feat/phase2-learning-block       -> origin/dev
feat/stage2-flu-system-learning  -> origin/dev
```

**E3. 126 local branches; 117 are fully merged into `origin/dev`.** The nine that are not:

```
$ git branch --no-merged origin/dev
feat/adaptive-exam-app   feat/genb-verification   feat/gov-rescope-screener-primary
feat/interview-scope-update   feat/onboarding-demo-redesign   feat/phase2-learning-rate
feat/r11-reconciliation   main   staging
```

So 126 branches represent seven live pieces of work plus the two upper tiers. On the remote, five
feature branches are unmerged (`feat/adaptive-exam-app`, `feat/genb-verification`,
`feat/interview-scope-update`, `feat/onboarding-demo-redesign`, `feat/unified-platform`) plus
`origin/main` and `origin/staging`.

**Branches moved while this audit ran, which is itself worth recording.** At the first scan
`feat/r11-reconciliation` was an ancestor of `6afc596`; by the last scan it was 2 commits ahead.
`feat/rescope-screener-primary` was renamed to `feat/gov-rescope-screener-primary`, also 2 ahead.
Both were already in the "keep" tier so the prune list is unaffected, but it means **E1 and E3 are
snapshots against `6afc596` and must be re-derived immediately before any pruning.**

---

## Confirmed live — do not re-investigate

Twelve of these looked dead or duplicated and are not. Two are the inverse — they look live to a
name-based search and are not. The last two are baseline status, recorded so the next audit has a
starting point.

| Suspected                                              | Verdict | Evidence                                                                                             |
| ------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------- |
| `apps/web/public/exam-demos/**` duplicates research demos | **Synced, gated** | `node scripts/sync-exam-demos.mjs --check` → "up to date"; byte-exact copier with prune + drift fail  |
| Per-type verifier for a retired type                   | **None exist** | 25 registered codes; only non-wired one is `CX-achieve-02`, blocked with a written reason           |
| Two 1PL implementations are copies                     | **Different models** | `learning-curve.ts:175` documents the reduction to plain 1PL at `c = 0`                          |
| Engine staircase vs scorer MAP fit                     | **Deliberate** | `ability.ts:17-19` states the single-input-contract reason                                            |
| `dev/family-preview/**` duplicates `(embed)/family/**` | **Intentional** | Different components, `notFound()` in production; only `template.tsx` overlaps (9 lines)             |
| `vitest.integration.config.ts` orphaned (knip)          | **Live** | `apps/web/package.json` `test:integration`; run by `ci.yml`                                          |
| `scripts/audit-requirement-ids.mjs` orphaned (knip)     | **Live** | Hand-run; documented by `docs/governance/REQUIREMENT_ID_AUDIT.md`                                    |
| `scripts/configure-cloud-auth-email.mjs` orphaned (knip)| **Live** | Hand-run; documented in `docs/DEMO_TONIGHT.md`                                                       |
| `research/exam-question-types/qa/**` orphaned (knip)    | **Live** | Standalone harness, own `package.json` + Playwright dep                                              |
| `research/exam-question-types/catalog/` missing         | **Present and tracked** | 6 files under `git ls-files`; `sync-exam-demos.mjs:39` resolves                              |
| `legacy exam types block` in `lib/exam/types.ts`        | **Live** | `exam-results/route.ts:153, 155` uses `examSessionInputSchema` and `summarize`                        |
| `application.ts`'s 22 duplicate exports look live to grep | **NOT live** — the inverse trap | The app references the *names*; `index.ts` resolves them from `onboarding.ts`. See B10 |
| `packages/contracts/src/application.ts` as a whole      | **Partly live** | Its 13 barrel-exported assessment schemas are live and must survive any B10 deletion              |
| `db-types` generated helper types unused                | **Expected** | Output of `supabase gen types typescript`                                                            |
| 23 pre-existing lint errors from the 2026-07-27 audit   | **Fixed** | `pnpm lint` exits 0 at `6afc596`                                                                     |
| Whole test suite health                                 | **Green** | 52 files / **754 tests** pass in 403s: contracts 151, exam-engine 132, exam-scoring 107, fixtures 18, web 346 |

---

## Quantified footprint

Repository size at `6afc596`: 849 tracked files, **232,879 tracked text lines** (research
114,150 · apps 45,097 · supabase 22,404 · docs 20,928 · packages 15,362 · brainlifting 8,344 ·
scripts 6,158 · infra 436). TypeScript/TSX alone: 37,432.

| Category                                                    | Size                      | Share of repo | Confidence                                      |
| ----------------------------------------------------------- | ------------------------: | ------------: | ----------------------------------------------- |
| Certain dead, deletable now (A1, A2)                        |                **23** LOC |        0.01 % | Certain                                         |
| Shadowed superseded contract model (B10)                    |               **160** LOC |        0.07 % | Certain (unreachable), needs care (composition) |
| Unreachable by construction (A3 bridge + wiring)            |              **~205** LOC |        0.09 % | Probable                                        |
| Orphaned retired-type generators (A4)                       |            **14,949** LOC |        6.42 % | Probable, needs owner sign-off                  |
| Contracts with zero reference anywhere (A5, 3 modules)       |               **109** LOC |        0.05 % | Certain (unreferenced); parked-by-intent likely |
| Contracts reached only via test fixtures (A5, 3 modules)     |             **1,241** LOC |        0.53 % | Certain (measurement), needs-a-human (intent)   |
| Duplicated logic worth consolidating (B1-B3, B5, B6)         |              **~120** LOC |        0.05 % | Certain                                         |
| Generated artifacts carrying retired types (D5)              | **17 of 66 entries** × 5 artifacts |      — | Certain (drift), needs decision (fix)           |
| Stale pointers in *living* docs (D2 ×10, minor ×2)           |            **12** mentions |            — | Certain                                         |
| `docs/audit/**` needing a superseded banner (D4)             | **5,113** LOC, 197 mentions |      2.20 % | Certain                                         |
| Prunable worktrees (E1)                                      | **28** trees, ~15-17 GB   |            — | Probable (snapshot)                             |

**Bottom line: 183 lines are unambiguously deletable (23 dead + 160 unreachable-and-superseded).
About 15,150 lines — 6.5% of the repo — are unreachable but need exactly one human decision each
(A3 and A4). Roughly 1,350 lines are parked-by-design and should be labelled, not deleted.** The
repo does not have a dead-code problem. It has a labelling-and-boundary problem, and the labels
that would resolve it live in a document that stopped being maintained on 2026-07-22.

---

## Biggest structural recommendation, with its cost

### Promote the item bank out of `research/` into a first-class workspace package

**The problem in one sentence:** `research/exam-question-types/banks/**` is production data that
the app reads at runtime, that CI does not test on change, that the container does not ship, and
that no boundary check governs — because it lives in a directory the whole toolchain treats as
research.

**Proposed change.** Create `packages/exam-bank/` owning the served banks, with
`packages/exam-bank/src/index.ts` exposing the loader that is today
`apps/web/src/lib/exam/bank-loader.ts` (which moves, along with the answer-key/served-item split
it enforces). `research/exam-question-types/` keeps generators, specs, QA, demos, and catalog —
the design workshop. `scripts/sync-exam-demos.mjs` gains one job: publish banks into the package
as well as demos into `apps/web/public/`, and keep its `--check` gate over both.

**What this buys, concretely:**

- The runtime dependency becomes a workspace import, so Next's tracing includes it and the
  container ships it. Finding C1 closes structurally rather than by remembering to add
  `outputFileTracingIncludes`.
- `research/**` can stay out of CI `paths:` honestly, because the load-bearing bytes move into
  `packages/**`, which is already covered.
- `check-workspace-boundaries.ts` starts governing the edge, and `packages/contracts`' test-time
  reach into `research/` (C2) becomes a normal package dependency.
- `apps/web/src/lib/exam/` loses one of its four unrelated responsibilities (C5).

**What it costs — the part that makes this a decision and not a chore:**

| Cost                     | Detail                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files moved              | 49 bank JSONL (~5 MB, ~3k items) + `bank-loader.ts` (197 lines) + a new `package.json`/`tsconfig.json`                                                               |
| Import rewrites          | 5 call sites: `api/exam-items`, `api/exam-submit`, `api/exam-emulate`, `persistence.integration.test.ts`, `scripts/verifier-differential.ts` (which type-imports `RawBankItem`) |
| Path-resolution rewrites | 4: `bank-loader.ts:67-76` `resolveBanksDir()` disappears; `bank-conformance.test.ts:33`, `real-bank.ts`, `fluid-verifiers.test.ts:26` repoint                       |
| Sync-script change       | `sync-exam-demos.mjs` gains a bank-publish step and a second drift check                                                                                             |
| **Highest-risk item**    | The answer-key firewall. `bank-loader.ts` is the *only* module that holds `answer.correctKey`, and `toServedItem()` (`:104-115`) is what keeps it off the wire. Moving it moves the security boundary. `supabase/tests/121_exam_answer_key_firewall.test.sql` guards the database side; the app side is guarded by `served-boundary.test.ts` and `standalone-guard.test.ts`, which must be re-pointed and re-run before the move is called done. |
| **What would break**     | Any in-flight branch touching `apps/web/src/lib/exam/bank-loader.ts` or `research/**/banks/` conflicts. At `6afc596` that includes the Stage 2 agent's active work. **This should not be attempted while a question-type agent is mid-flight.** |
| Not solved by this       | The two-hash divergence (B1), the `lib/exam/types.ts` legacy/adaptive split (B7), and the app-vs-database verifier duplication (C5) are all untouched                |

**Sequencing.** Do B1 (one function body), B2, E2 (`--unset-upstream`), A1, A2, and D1-D3 first:
all are cheap, independent, and reversible. Do C1 next with a one-line
`outputFileTracingIncludes` as a stopgap while the package move is decided. Do B10 after
diffing the two `applicationDraftSchema` definitions field by field and confirming the
`student/education/guardian` shape is genuinely superseded — it is 160 lines, but it is 160 lines
of contract, so it earns a real read rather than a delete. Do A4 and D5 together, after the owner
answers the revival question. Do the package move last, in a quiet window with no question-type
agent running.

---

## Confidence split

Of 31 numbered findings, each assigned exactly one tier:

| Confidence                                                                    | Count  | Findings                                                                                       |
| ----------------------------------------------------------------------------- | -----: | ---------------------------------------------------------------------------------------------- |
| **Certain** — mechanically verified, reproducible command shown                | **21** | A1, A2, B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, C2, C3, C4, C6, D2, D3, D5, E2, E3            |
| **Probable** — the proof is a reachability argument, not an execution           |  **5** | A3, C1, D1, D4, E1                                                                             |
| **Needs a human** — the measurement is solid, the intent is not mine to decide  |  **5** | A4 (revival value), A5 (Track B parking), A6 (harness status), C5 (tier ownership), D6 (sentinel) |

**Where the probable ones could be wrong.** A3 assumes no future non-registry demo — true today,
a design choice tomorrow. C1 is a strong inference from three configuration files, **not an
executed test**: I did not run `next build` or `docker build`, so the failure mode is predicted,
not observed, and a `docker build` plus one `GET /api/exam-items` would settle it in ten minutes.
D1 and D4 are judgements about what a document is *for*, and a reasonable person could argue
`docs/audit/**` is simply frozen history. E1 is a snapshot, and branches demonstrably moved during
this audit (E3), so re-derive it immediately before pruning anything.

**Where the certain ones are narrower than they sound.** B10 is certain that the 22 names are
unreachable *through the barrel*; it does not prove the deletion is safe, because four of the
schemas are composition inputs. D5 is certain about the drift and silent about whether
regenerating is the right fix. E3's counts are exact for `6afc596` and stale the moment anyone
commits.

**What I could not determine.**

1. Whether the deployed container actually serves an empty pool (C1) — inferred, not run.
2. Whether the 17 retired types have revival value (A4) — needs the owner.
3. Whether Track B's 1,350 contract lines are parked or abandoned (A5) — needs the owner.
4. What `gt-selection-qbank-preview` @ `47f5311` contains; it matches no branch, and the
   2026-07-27 audit could not identify it either.
5. Whether the Stage 2 agent reads `research/exam-question-types/RUN` (D6).
6. Whether `scripts/validation-harness/` still runs (A6) — it has no gate, so nobody would know.

**Known limits of the method, and the three mistakes it made.**

`knip` under-reports. It treats barrel `export *` as consumption, so
`packages/exam-scoring/src/lambda/handler.ts` never appeared in its unused-file list despite having
no consumer outside its own test — finding B1 was found by hand, not by tooling.

My export-consumer census over-reports, because it matches identifiers rather than resolving
modules. It counts a mention in a comment as a reference, and — the serious case — it counts a
reference to a *name* as a reference to whichever module you happened to be asking about. That
produced a wrong conclusion about `packages/contracts/src/application.ts` that survived until
`index.ts` was read (B10). Where it mattered (`hashUnit`, `mulberry32`, `lookupAddress`,
`installLegacyBridge`) I re-checked the import statements directly.

The markdown dangling-path scan over-reports by roughly 10-12%: it resolves every path from the
repo root, so correct relative links look broken (`docs/README.md:21-27`), and it cannot tell a
branch name or a filename prefix from a path (`AGENTS.md:154`, `EXAM_ADAPTIVE_STATUS.md:103`).

My first worktree scan reported all 40 trees clean because `awk '{print $2}'` truncated paths at
the first space; four trees are in fact dirty (E1).

None of these tools sees a `pnpm dlx`, a hand-run `.mjs`, a bundler alias, or a Terraform
reference. **Treat every "unused" label in this document as a lead.** The `knip` false-positive
table (8 entries) and the "Confirmed live" table (12 rejected leads) together record 20 leads that
turned out to be live, expected, or deliberate — which is roughly two thirds of everything this
audit looked at twice.
