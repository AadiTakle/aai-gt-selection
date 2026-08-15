# Orientation, for the agent preparing this repository for GT

> **Updated after repository consolidation (`e7b7f33`).** Active code and documentation now live
> under `product/`; prepend `product/` to this document's older unqualified `screener/`,
> `platform/`, `qbank-library/` and `docs/` paths. The deployed-app branch has been pushed and
> merged into `handoff/repo-organization`. GT readers should start at
> [`../gt/README.md`](../gt/README.md); this file remains the detailed point-in-time audit.

Written 14 Aug 2026. Read this before touching anything, then verify the claims in it — the rest of this
repository contains several documents that were true when written and are not true now, and this one will decay
the same way. Every number below was measured on the date above, and the commands that produce them are given so
you can re-measure rather than trust.

Your job is to make this handable to GT. This document is the map: what each directory is, what is real, what is
deployed, and which documents to distrust.

---

## 1. What this project is, in one paragraph

GT (a gifted-and-talented school operator) needs to find academically gifted children at a scale that
one-at-a-time testing cannot reach. The deliverable is **a shared measurement library plus front doors onto it**:
an item bank of 53 question types, an adaptive engine that estimates ability from responses, and a serverless
platform that serves questions and stores traces — with a 3D web game (**Bramblebrook**) as the first surface a
child actually touches. The binding constraint from GT, recorded in
`product/docs/interviews/2026-08-03-crystal-martel-call.md`, is that **we may not build an in-house cognitive test to
replace CogAT**; the bar is 95th-percentile CogAT, strictly applied. Read that interview first. It is the only
document here that constrains rather than proposes.

---

## 2. The one thing most likely to mislead you

**The platform is deployed.** The operational READMEs now say so. Earlier designs and plans retain
their original proposal detail behind prominent historical/completed banners; do not read checklist
state inside those files as current deployment status.

**Five surfaces are live**, in the Superbuilders **sandbox** account `056956104102`, region `us-east-1`, all
against one platform. Verified 200 on 14 Aug:

| Surface | URL | Reads the library live |
|---|---|---|
| Bramblebrook game | https://d14xlnxxtsczg9.cloudfront.net | yes — serving and scoring |
| Bramblebrook demo, self-contained | https://d14xlnxxtsczg9.cloudfront.net/?demo=1 | no, by design — see §6 |
| Backend dashboard | https://d14n29hsrte7u8.cloudfront.net | yes — catalogue and app registrations |
| Question-type review, 36 types | https://d284xy6sbvs9mb.cloudfront.net | yes — types, spectra, served items |
| CogAT prep explainer | https://scunwsuf4i.us-east-1.awsapprunner.com/about-the-test | no — an explainer, not a screener |
| GT screener example | https://kt49a2xvq5.us-east-1.awsapprunner.com/demo/exam?telemetry=1 | no — still its own engine |

The platform behind them: `https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com`. A protected route
such as `/v1/catalog/types` returns **401** unkeyed; the bare API root returns 404 because no root route exists.

**Where that is documented now.** The four non-Bramblebrook surfaces came from
`feat/library-apps-on-platform`. That branch is pushed and its deployment inventory is integrated at
`product/deployed-apps/README.md` on `handoff/repo-organization`.

**Correcting the stale status documents is your other first task**, because anyone reading them will conclude the
opposite of the truth about the most important thing in the repository.

---

## 3. Where everything is

### Active code

| Path | What it is | Trust |
|---|---|---|
| `product/screener/` | The item library, adaptive engines, Bramblebrook, prototype and internal tools. | High; run the current suite for its count. |
| `product/platform/` | The serverless side: registry, scoring, selection, DynamoDB store, Lambda handlers, CDK. | High; run the current suite for its count. |
| `product/qbank-library/` | 53 JSONL banks (7,319 records) and 52 standalone HTML item demos. The content. | High as data; see §6 on calibration. |
| `product/deployed-apps/` | Live deployment inventory, dashboard, question-type review and source pointers. | High for current URLs and hosting. |

### Reference and history

| Path | What it is | Trust |
|---|---|---|
| `archive/` | The pre-reset project, frozen 2026-08-03. Supabase, exam engine, 47 decisions, 117 evidence entries. | Historical only. Nothing here runs in production and no child ever took it. |
| `brainlifting/` | 14 argument documents, each building a defensible position from sources. | High as reasoning, but they are arguments, not status. |
| `product/docs/` | GT guides, design, plans, measurement and handoff. | `product/docs/gt/` is current; older sections are mixed. |
| `shots/` | 43 screenshots from the lab-app experiments. | Artifacts. One handoff doc claims 210; the repo has 43. |

### Inside `screener/`

Seven apps. Only three matter for GT:

| App | Purpose | State |
|---|---|---|
| `apps/sanctuary/` | **Bramblebrook** — the 3D ranch game. The flagship surface. | Live, deployed, actively worked. |
| `apps/api/` | Express API for the prototype path, port 5181. | Live, but the platform supersedes it for Bramblebrook. |
| `apps/web/` | The main screener/practice/catalogue web UI, port 5180. | Live. |
| `apps/bank-review/` | Internal tool for reviewing the 53 types. | Internal. |
| `apps/theme-planner/` | Internal theming tool. | Internal. |
| `apps/lab-character/`, `apps/lab-system/` | Ten stealth-screener experiments from two overnight loops. | **Experiments.** Their handoff docs point at worktrees (`~/gt-loop-a`, `~/gt-loop-b`) that are not this repo. |

Seven packages. The one that matters most:

| Package | Provides |
|---|---|
| `packages/qbank/` | **The engine in use.** Loads the 53 banks, selects by Fisher information, grades, and holds the wire contract. Everything live imports this. |
| `packages/engine/` | An older generator-based engine. Still tested, still referenced by `npm run sim`, **not** what the screeners use. |
| `packages/item-library/` | Generator-based item library that pairs with `packages/engine/`. Same caveat. |
| `packages/ui-contract/` | UI capability vocabulary and the CogAT mapping (`cogat.ts`). |
| `packages/contracts/`, `packages/practice/`, `packages/stats/` | Shared types, practice mode, session metrics. |

**There are two measurement stacks in this repository** — generator (`item-library` + `engine`) and bank
(`qbank`). This confuses everyone who arrives. The live answer is `qbank`.

### Inside `platform/`

| Path | What it is |
|---|---|
| `packages/domain/` | Pure types and defaults, including `CRITERIA_V1` — the gifted bar. No AWS. |
| `packages/scoring/` | Wraps `@gt/qbank`'s engine; builds the score sheet from a trace. |
| `packages/selection/` | Eligibility plus eight variety layers, so two children do not get the same test. |
| `packages/catalog/` | Compiles the JSONL banks into registry rows, answer keys, and a selection index. |
| `packages/store/` | The DynamoDB single-table repository. |
| `functions/` | Six Lambda handlers: `authorizer`, `catalog`, `serve`, `score`, `admin`, `rescore-worker`. |
| `infra/` | CDK: `data-stack` (tables, bucket, key, queues), `api-stack` (HTTP API, Lambdas), `web-stack` (CloudFront). |
| `local/` | A dev server that routes to the **real** handlers, so local play exercises deployed code. |
| `scripts/` | Fourteen operational scripts. The important ones are in §4. |

---

## 4. How to run and inspect it

```bash
# The local stack: storage, then seed, then the platform, then the game.
cd product/platform && npm run ddb:start && npm run seed:bramblebrook && npm run dev:local
cd product/screener && npm run sanctuary          # http://127.0.0.1:5230

# What CI runs. Run this before you push anything.
cd product/screener && npm run verify     # typecheck + current tests + simulation + smoke
cd product/screener && npm run build      # the DEFAULT vite config, not sanctuary's

# The platform's own tests. Integration tests need storage running.
cd product/platform && npm run ddb:start && npm test
```

The scripts worth knowing, all from `platform/`:

| Command | Answers |
|---|---|
| `npm run show:sessions` | Who has played, and where each session stands |
| `npm run show:sheet` | The full score sheet for one session |
| `npm run replay:session <id>` | Answer by answer, when did it become decidable |
| `npm run audit:marking <id>` | Was each response marked correctly against the key |
| `npm run what-if <id>` | How many more correct answers would have changed the verdict |
| `npm run verify:cloud` | 16 checks that the whole path works, against emulated storage |
| `npm run measure:bramblebrook` | Simulate 4,000 children; writes `docs/overnight/` |
| `npm run measure:live` | The same question through real HTTP handlers |
| `npm run provision:aws` | Fill a deployed stack: publish catalogue, register app, mint key |
| `npm run reset:keeper <id>` | Close out a keeper's sessions so play starts fresh |

**AWS access is through the Superbuilders credential broker, not `aws login`.** `sb-aws-creds` is installed and
`~/.aws/config` has a `[profile sbsandbox]` with a `credential_process`, so `AWS_PROFILE=sbsandbox` works for the
CLI and for CDK. Interns get **`sbsandbox` only** — `sbproduction` is admin-gated and `legacy` is unavailable.
The `sb-aws` MCP server exposes `whoami`, `accounts`, and `guide`; read `guide` with slug `credential-broker` and
`tagging-overview` before touching infrastructure.

---

## 5. Which documents to trust

Read in this order:

1. `product/docs/gt/README.md` — current GT-facing operations and maintenance.
2. `product/docs/interviews/2026-08-03-crystal-martel-call.md` — the constraints. Nothing else binds.
3. `product/deployed-apps/README.md` — current URLs, hosting and source pointers.
4. `product/docs/overnight/README.md` and the four numbered files beside it — the measurement artifacts. What the
   instrument actually does, with the caveats attached.
5. `product/docs/plans/aws-question-platform-progress.md` — decision and bug history.
6. `product/docs/design/aws-question-platform.md` — the approved architectural design.

**Historical documents to interpret carefully:**

| Document | Problem |
|---|---|
| `product/docs/design/sanctuary-platform-integration.md` | Historical design; now bannered as implemented. |
| `product/docs/plans/sanctuary-platform-integration.md` | Historical execution plan; now bannered as completed. |
| `product/docs/handoff/2026-08-06-*-apps.md` | Reference external worktrees; use the in-repo paths in the banners, while retaining the findings. |

Operational READMEs and `product/docs/gt/` now avoid hardcoded test totals. Re-measure rather than copy.

---

## 6. What is honestly unfinished

Do not let this list be discovered by GT. Each of these is a real limit, and stating them is what makes the rest
credible.

**The difficulties are not calibrated.** Every item's difficulty is a linear rescale of an authoring judgement,
not a parameter fitted to children's responses. `bank = logits × 3 + 10.5`, and the platform says so in its own
`/api/bank` response. So the instrument's machinery is verified and its *scale* is not. **No child has ever taken
this.** Everything in `docs/overnight/` measures whether the machinery finds children above a cut on this scale —
a necessary check, and not the same as finding gifted children.

**Sensitivity is 0.774.** At the 95th-percentile cut, over 4,000 simulated children, roughly a quarter of
genuinely-above-cut children are missed. Lowering `recommendProbability` from 0.30 to 0.20 buys about 6 points of
sensitivity for roughly 3.8 more declined applications per additional child found. It is **recommended and not
applied**, because it is a values judgement about families versus children. See
`docs/overnight/02-the-gifted-cut-for-grades-3-5.md`.

**Every question is above grade level, by necessity.** The bank's age bands are difficulty tiers wearing grade
labels: grade-appropriate items top out at 0.64 logits against a cut of 1.645, so a band-locked session cannot
reach a gifted decision at all. Bramblebrook therefore serves 100% above-grade material. That is standard
above-level testing, and it means a gifted third grader will get a good share wrong. **The game's framing has to
carry that**, and it is a copy problem nobody has solved.

**Demo mode ships the answer keys.** `?demo=1` runs the whole session in the browser with no network, which
requires the keys to be in the bundle — `screener/apps/sanctuary/public/demo-bank.json`, on a public URL. Anyone
with devtools can read every answer. It is for demonstrating to adults and must never screen a child whose result
matters. **And it only works for Bramblebrook**; the other screener apps get nothing from the parameter until it
moves into a shared package.

**2,385 of 7,319 bank records are excluded from the compiled servable pool.** The golden catalogue
test accounts for them as 1,634 `computed_solver`, 391 `non-index-numeric-key`, 240
`retired:reviewer-kill`, and 120 `retired:validity-defect`. Re-run the test rather than copying these
counts forward.

**Verbal Analogies has no direct CogAT coverage** — the largest alignment gap, task 2.1 in
`docs/handoff/engine-portability-tasks.md`.

**Only the sandbox account.** Nothing is in production, and an intern cannot deploy there. Whoever takes this to
production needs `sbproduction` access and a fresh `cdk bootstrap`.

**CI does not test the platform.** `.github/workflows/verify.yml` runs `product/screener/` only —
typecheck, tests, simulation, smoke, and the default web build. Platform and Sanctuary verification
remain documented manual handoff gates.

---

## 7. The lesson this project learned the hard way

Written down because it will save you a day.

**Emulation hid three real defects, and every one appeared on the first real deployment.** DynamoDB Local
enforces no IAM, knows nothing of organisations, and accepts any environment variable. So: an organisation SCP
denying every region but `us-east-1` (the data stack rolled back); a required env var that nothing read and whose
name did not match what the infra passed (every function died at cold start, the authorizer 403'd everything);
and a missing `dynamodb:PutItem` grant for a persona write that had been added months earlier in code (every
session creation failed). All three were invisible locally and obvious in thirty seconds of CloudWatch.

The same shape appeared twice more in the game: a test named "accumulates one session" that gathered the session
ids and never asserted on them, so twelve sessions passed a test whose name promised one; and a measurement
harness that filtered its own pool and so measured a design that production did not run.

**The pattern: a check that constructs its own inputs tests the design and stays silent about the deployment.**
When you verify something for GT, verify it against the thing that will run.

---

## 8. Suggested order of work

1. Decide `recommendProbability`, and record the decision with its reasoning.
2. Put `product/platform/` and the Sanctuary build in CI.
3. Move demo mode into a shared package if every screener needs an offline adult-demo mode.
4. Bring the CogAT prep source onto an integrated branch if it must be maintained from this repository.
5. Preserve the GT-facing guides under `product/docs/gt/` as the current operational layer.

---

## 9. Branch and deployment state after handoff consolidation

```
origin/dev                              8f16f9b   pre-reorganization integrated line
origin/feat/library-apps-on-platform   79e1f86   deployed-app inventory and static apps
handoff/repo-organization             e7b7f33   merge plus product/ consolidation
```

`handoff/repo-organization` is a merge commit with the current `dev` line and
`feat/library-apps-on-platform` as parents. Recovery tags and the exact move map are in the root
`REORGANIZATION.md`. Other branches may still contain unintegrated experiments; inspect before deleting them:

```bash
for B in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin | grep -v HEAD); do
  N=$(git log --oneline --no-merges origin/dev..$B 2>/dev/null | wc -l | tr -d ' ')
  [ "$N" != "0" ] && printf '%-46s %s commits not in dev\n' "$B" "$N"
done
```

**No deployment happens from a git push.** The active workflow has read-only repository permissions
and no deploy step. App Runner services use pinned ECR images with `autoDeploy: false`; the platform
and game deploy manually through CDK. Moving the source under `product/` does not alter any live AWS
resource. Current and local verification commands are in `product/docs/gt/testing-and-demos.md`.
