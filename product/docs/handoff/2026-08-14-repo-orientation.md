# Orientation, for the agent preparing this repository for GT

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
`docs/interviews/2026-08-03-crystal-martel-call.md`, is that **we may not build an in-house cognitive test to
replace CogAT**; the bar is 95th-percentile CogAT, strictly applied. Read that interview first. It is the only
document here that constrains rather than proposes.

---

## 2. The one thing most likely to mislead you

**The platform is deployed, and several documents say it is not.**

`platform/README.md` line 7 still opens with "**Nothing here is deployed.**" That was true until 13 Aug. It is
now false. The same staleness affects `docs/design/sanctuary-platform-integration.md` and
`docs/plans/sanctuary-platform-integration.md`, both of which say "Nothing implemented" about work that shipped.

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

The platform behind them: `https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com`. It should return **401**
unkeyed, which is it refusing correctly rather than failing.

**Where that is documented, and the risk attached.** The four non-Bramblebrook surfaces come from
`feat/library-apps-on-platform`, whose `demo/README.md` is the only inventory of them. **That branch is local and
has never been pushed**, and it is 115 commits behind `dev`. If this working copy is lost, the record of four
live deployments goes with it. Pushing it is the most urgent thing in this document.

**Correcting the stale status documents is your other first task**, because anyone reading them will conclude the
opposite of the truth about the most important thing in the repository.

---

## 3. Where everything is

### Active code

| Path | What it is | Trust |
|---|---|---|
| `screener/` | The item library, the adaptive engine, and every front door built on them. **The library is the product.** | High. 621 tests. |
| `platform/` | The serverless side: registry, scoring, selection, DynamoDB store, Lambda handlers, CDK. | High. 326 tests. |
| `qbank-library/` | 53 JSONL banks (7,319 records) and 52 standalone HTML item demos. The content. | High as data; see §6 on calibration. |

### Reference and history

| Path | What it is | Trust |
|---|---|---|
| `archive/` | The pre-reset project, frozen 2026-08-03. Supabase, exam engine, 47 decisions, 117 evidence entries. | Historical only. Nothing here runs in production and no child ever took it. |
| `brainlifting/` | 14 argument documents, each building a defensible position from sources. | High as reasoning, but they are arguments, not status. |
| `docs/` | Design, plans, measurement, handoff. See §5 — mixed currency. | Mixed. Read §5 before trusting any of it. |
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
cd platform && npm run ddb:start && npm run seed:bramblebrook && npm run dev:local
cd screener && npm run sanctuary          # http://127.0.0.1:5230

# What CI runs. Run this before you push anything.
cd screener && npm run verify             # typecheck + 621 tests + simulation + smoke
cd screener && npm run build              # the DEFAULT vite config, not sanctuary's

# The platform's own tests. Integration tests skip silently without storage running.
cd platform && npm run ddb:start && npm test    # 326 tests
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

1. `docs/interviews/2026-08-03-crystal-martel-call.md` — the constraints. Nothing else binds.
2. `docs/plans/aws-question-platform-progress.md` — **the single most current status document.** A ledger of
   what was built, what broke, and what was decided. When it disagrees with a design doc, believe the ledger.
3. `docs/overnight/README.md` and the four numbered files beside it — the measurement artifacts. What the
   instrument actually does, with the caveats attached.
4. `docs/handoff/engine-portability-tasks.md` — task-level status for the `qbank` engine.
5. `docs/design/aws-question-platform.md` — the platform design as approved.

**Distrust these, in this order of danger:**

| Document | Problem |
|---|---|
| `platform/README.md` | Says "Nothing here is deployed." It is deployed. |
| `docs/design/sanctuary-platform-integration.md` | Says "Nothing implemented." It is implemented. |
| `docs/plans/sanctuary-platform-integration.md` | Same. |
| `docs/README.md` | Says "no concept chosen, no design approved." A design was approved on 10 Aug. |
| `screener/README.md` | Claims 111 tests. There are 621. Also describes the generator stack as the product. |
| `docs/handoff/2026-08-06-*-apps.md` | Both reference external worktrees that are not this repo. Their architectural findings are still useful; their instructions are not. |

**Every test count in every document except this one is wrong.** Measured 14 Aug: `screener` **621**, `platform`
**326**. Re-measure rather than copy.

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

**2,145 of 7,319 bank records cannot be marked.** Excluded by scoring mode: `computed_solver`,
`non-index-numeric-key`, and two retirement reasons. The largest recoverable pool is 1,634 `computed_solver`
items that carry real keys behind comparison rules nobody has written.

**Verbal Analogies has no direct CogAT coverage** — the largest alignment gap, task 2.1 in
`docs/handoff/engine-portability-tasks.md`.

**Only the sandbox account.** Nothing is in production, and an intern cannot deploy there. Whoever takes this to
production needs `sbproduction` access and a fresh `cdk bootstrap`.

**CI does not test the platform.** `.github/workflows/verify.yml` runs `screener/` only — typecheck, tests,
simulation, smoke, and the default web build. `platform/`'s 326 tests run on nobody's machine but yours, and the
sanctuary build is not built in CI either. That is a gap worth closing before handoff.

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

1. Fix the four stale status documents in §5. They actively mislead.
2. Reconcile every test count, or delete the counts — a wrong number is worse than no number.
3. Decide `recommendProbability`, and record the decision with its reasoning.
4. Put `platform/` in CI, and build the sanctuary bundle there too.
5. Move demo mode into a shared package so `?demo=1` works for every screener.
6. Write GT's own document — this one is for an agent, not for them. They need what it does, what it costs, what
   it cannot do yet, and how to run it, without the archaeology.

---

## 9. Branch and deployment state, 14 Aug 2026

```
origin/dev                      9fc64a3   the integrated line: engine, game, platform, demo mode, docs
origin/feat/sanctuary           f47505a   the game line, Tiffany and Felipe plus this work
feat/library-apps-on-platform   79e1f86   LOCAL ONLY, NEVER PUSHED. Four of the five live demos.
```

**`dev` is not a superset.** It contains the engine, the game, the platform and demo mode, but *not*
`feat/library-apps-on-platform`, which carries the backend dashboard, the question-type review UI, and the
`demo/` folder that documents every deployment. That branch diverged before the merge into `dev` and is 115
commits behind it, so reconciling them is real work rather than a fast-forward. Several other branches also hold
unmerged commits — `origin/feat/cogat-prep-pivot` (16), `origin/feat/adaptive-exam-app` (6),
`origin/feat/apps-system-led` (4), and local `feat/review-ui-and-play-gate` (7) among them. Run this before
assuming anything is merged:

```bash
for B in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin | grep -v HEAD); do
  N=$(git log --oneline --no-merges origin/dev..$B 2>/dev/null | wc -l | tr -d ' ')
  [ "$N" != "0" ] && printf '%-46s %s commits not in dev\n' "$B" "$N"
done
```

`dev` and `feat/sanctuary` are both current and were merged cleanly. **No deployment happens from a git push** —
verified: the only workflow has `permissions: contents: read` and no deploy step, there is no
apprunner/amplify/vercel/netlify/Dockerfile config in the repo, no Amplify app points at this repo, and the GT
App Runner services in the sandbox run from pinned ECR image tags with `autoDeploy: false`. Both the platform and
the game were deployed by hand with `cdk deploy`. Re-verify this before you trust it.
