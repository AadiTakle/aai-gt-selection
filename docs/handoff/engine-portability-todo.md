# Engine and item bank: make them adoptable anywhere

**Owner: Felipe.** Written 6 Aug 2026 after auditing the code against the requirements, not from memory.
Every claim below has a file reference so you can check it rather than trust it.

The goal is that any program — a Pokémon game, a family portal, someone else's product — can ask two
questions over HTTP and get sound measurement back: *what should I ask next* and *how did they do*.
Today both answers exist as a long-lived Express process with sessions in a `Map`, so nothing outside
this repo can use them.

---

## Where things stand against the four requirements

| Requirement | State |
|---|---|
| 1a. Next-item selection as a Lambda | Algorithm works, **wrong objective** (info-at-threshold, not MEPV), not a Lambda, no battery choice |
| 1b. Grading as a Lambda | Binary marking works, **no mistake weighting, no guess protection**, not a Lambda |
| 2. Every type maps to a CogAT subtest | **17 of 53 mapped.** Verbal Analogies has zero direct coverage |
| 3. This document | Done |

Read the three sections below before picking anything up. Several tasks look small and are not, and two
of them are correctness bugs rather than features.

---

## 1a. Next-item selection

### What already works

The adaptive loop is real and tested. `QbankSession` in
`screener/packages/qbank/src/session.ts` holds a grid-based Bayesian posterior over ability
(`screener/packages/engine/src/posterior.ts`), updates it after each response, and stops on a
confidence rule. `screener/packages/engine/src/` has no filesystem dependency at all, so the maths is
already portable; only bank loading touches disk.

It takes exactly the inputs the requirement asks for: the items already answered, whether each was
right, and the running ability estimate with its uncertainty.

### What is wrong: the objective is not MEPV

`session.ts:231` selects by maximising **Fisher information at the decision threshold**:

```ts
const info = information(threshold, paramsFor(entry.b, 4, 1.5));
```

That is a deliberate choice for a pass/fail classifier — it picks the item that best separates above
the line from below it. **MEPV is a different objective.** MEPV picks the item whose expected
posterior variance, averaged over the possible responses weighted by how likely each is, comes out
lowest. It reduces uncertainty in the *score*; information-at-threshold sharpens a *decision*.

There is no MEPV code anywhere in the repo. Searching for `mepv`, `expected posterior`, and
`posterior variance` returns nothing.

Which one we want is a product question, not a technical one, and it is worth settling before you
write code. If we report an ability score with an interval, MEPV is right. If we only ever say
"recommend / do not recommend", the current criterion is better and cheaper. My read is that we want
both, selectable per session, because the screener wants a decision and any prep product wants a
score.

**Task 1a.1 — Implement MEPV alongside the current criterion.** For each candidate item, compute the
posterior you would hold after a correct response and after an incorrect one, take each variance,
weight them by the predicted probability of each response under the current posterior, and pick the
item with the smallest expected variance. The posterior is already a grid, so this is a loop over the
grid per candidate and needs no new maths library. Put the criterion behind a config field
(`selection: 'mepv' | 'threshold-information'`) rather than replacing what is there.

**Task 1a.2 — Make it not O(pool) per item.** MEPV over 5,425 items means two posterior updates each,
per question. Restrict candidates before scoring them: current practice is to consider only items
within a difficulty window around the estimate. Measure it before optimising; it may well be fine.

### What is missing: choosing a battery

There is no battery selection. What exists is a hard coverage floor: `session.ts:222-226` finds
domains below `perDomainMinimum` and serves those first, then falls through to pure information
greed. Domains are the four internal ones (`quantitative`, `verbal`, `spatial`, `fluid`) from
`domainOf` in `bank.ts`, **not** CogAT's three batteries.

**Task 1a.3 — Add battery as a first-class concept.** CogAT has Verbal, Quantitative and Nonverbal.
Our four domains do not map onto those three cleanly, and `fluid` in particular is a bucket for
everything that did not fit (`bank.ts` says so). Decide the mapping, then select a battery by which
one currently carries the most uncertainty, rather than by a fixed floor.

**Task 1a.4 — Report per-battery ability, not just overall.** CogAT reports a profile across three
batteries and that is much of what makes it useful for placement. Today there is one posterior. Three
posteriors plus a composite is a bigger change than it sounds and should be scoped on its own.

### A calibration problem you will hit immediately

`session.ts:231` passes `paramsFor(entry.b, 4, 1.5)`: **every item is assumed to have 4 options and a
discrimination of 1.5**, whatever it actually has. `paramsFor` sets the guessing floor to
`1 / optionCount` (`engine/src/irf.ts:20`), so a 3-option item is modelled as easier to guess than it
is and a 6-option item as harder. Discrimination is invented outright.

**Task 1a.5 — Pass the real option count.** It is available on the item content. Cheap, and it makes
every probability in the model less wrong.

**Task 1a.6 — Calibrate discrimination from response data.** Needs real attempts. Until then keep it
fixed and say so; `@gt/stats` already computes point-biserial per item
(`screener/packages/stats/src/index.ts:85-115`), which is the input.

---

## 1b. Grading

### What already works

`scoreResponse` in `screener/packages/qbank/src/bank.ts` marks a response against the item's key and
returns `true`, `false`, or `null` for "cannot be marked". Unscorable attempts are counted and
**excluded from the ability estimate** (`session.ts:272`), which is the right behaviour: an attempt
nobody can mark must not be counted as a failure.

It handles two key styles on strictly separate paths — a letter against the reported letter, an
integer index against the reported index. Keep them separate. Crossing them marks an entire type
wrong on every attempt while looking perfectly healthy from the outside, and it has happened twice.
`packages/qbank/src/numeric-key.test.ts` holds both directions over all 500 index-keyed items.

### What is missing: weighting by how easy the mistake was

Grading is binary. A wrong answer that was nearly right scores the same as a wild one.

**The data for this already exists and no code reads it.** 6,928 of 7,319 bank items carry
`answer.distractorRationales`, tagging every option with a `lureClass`:

| lureClass | share of options |
|---|---|
| `rule_violation` | 19.0% |
| `near_order` | 17.1% |
| `local_fit` | 13.8% |
| `global_mismatch` | 12.8% |
| `distractor_other` | 6.2% |
| `surface_match` | 5.3% |
| `reversed_relation` | 5.0% |
| `associate` | 1.2% |

Searching the whole `screener/` tree for `lureClass` or `distractorRationales` returns zero hits in
any `.ts` or `.tsx` file. It is authored, validated, shipped to the bank, and then ignored. It is also
deliberately stripped before reaching the browser (see the `LEAKY` regex in the item HTML), so it is
safe to use server-side.

**Task 1b.1 — Grade wrong answers by lure class.** A `local_fit` error means the child had the right
idea and missed a constraint; a `global_mismatch` means they did not engage the rule at all. Those are
not the same evidence. The clean way to use it is in the likelihood: instead of `1 - p` for any wrong
answer, use a per-class likelihood so a near miss moves the posterior less than a wild one. That keeps
one coherent probability model rather than bolting a partial-credit score onto the side.

**Task 1b.2 — Agree the ordering before you code it.** Rank the nine classes by how much they should
count against the child, and get that ranking reviewed by whoever authored the banks. This is a
measurement judgement, not an implementation detail, and getting it backwards is worse than binary
scoring.

### What is missing: protection against guessing

The only guessing protection is the static IRT floor, `c = 1 / optionCount`
(`engine/src/irf.ts:20`). There is no behavioural detection at all: no rapid-guess rule, no person-fit
or aberrance statistic, no analysis of answers across multiple questions. The requirement asks
specifically for the cross-item version and it does not exist.

The useful news is that `latencyMs` is already captured per response and stored
(`session.ts:126-138`), just never used in estimation. Some item renderers even compute a
`M-RAPIDGUESS` metric client-side, but hosts do not forward it (`useQuestionSession.ts:207-209` sends
only `{ response, latencyMs }`).

**Task 1b.3 — Rapid-guess detection.** If a response arrives faster than a plausible reading time for
that item, treat it as unscorable rather than wrong. Unscorable already exists and is already excluded
from the estimate, so the plumbing is done. Set the threshold per item type, not globally: a paper
folding item and a two-word analogy have very different floors.

**Task 1b.4 — Person-fit across the session.** Getting hard items right while missing easy ones is the
signature of guessing or of a mis-set starting difficulty. Compute a standard person-fit statistic over
the responses so far and surface it on the result. Start by reporting it, not by acting on it.

**Task 1b.5 — Forward the item metrics that already exist.** The renderers emit response time, first-
action time, answer changes and a rapid-guess flag. Hosts drop them. Pass them through and store them,
even before anything consumes them, so there is data to calibrate against later.

### Two correctness items, one urgent

**Task 1b.6 — 1,894 of 7,319 bank items cannot be marked and are silently dropped.**
`bank.ts:121` admits only `scoring.mode === 'deterministic_key'`. The other two modes are excluded at
load, not implemented:

- `computed_solver`: 1,774 items across 15 types
- `model_judge_deferred`: 120 items, `CX-achieve-02`

**`SPA-PUNCH-01` is in that list**, which matters because it is the one true Paper Folding type and
Paper Folding is a CogAT subtest we claim to cover. Its key is `"0,0|0,3"` — a set of grid cells — so
marking it needs a solver that compares cell sets, not a key match. The archive has per-type verifier
functions under `archive/apps/web/src/lib/exam/verifiers/` that were never connected to this API;
start there rather than from scratch.

**Task 1b.7 — I shipped a scoring bug today and fixed it; check my fix.** `QUANT-GLYPHNUM-01`
declares `deterministic_key` but stores a placement *ratio* (`0.235294`) to be marked against a
tolerance. When I widened the loader to accept numeric keys, 204 of those items entered the pool and
the index comparison truncated the ratio to `0`, so picking the first option marked correct on every
item and everything else marked wrong. Fixed by requiring a numeric key to be a non-negative integer
in both the loader and `scoreResponse`, and the type is now held back. Tests in
`numeric-key.test.ts`. **The lesson worth keeping: `scoring.mode` in the bank data is not always
true.** Treat it as a claim to verify, not a fact.

---

## 2. CogAT alignment

The requirement is that every type has a direct connection to a CogAT question type. **17 of 53 types
are mapped, 10 of them directly.**

`screener/packages/ui-contract/src/cogat.ts` is the only machine-readable mapping. Each entry records
a subtest, a `strength` of `direct` or `loose`, and a free-text note.

| CogAT subtest | Direct | Loose |
|---|---|---|
| Figure Matrices | 3 | 0 |
| Paper Folding | 1 | 2 |
| Figure Classification | 1 | 2 |
| Sentence Completion | 1 | 1 |
| Number Analogies | 1 | 1 |
| Verbal Classification | 1 | 0 |
| Number Series | 1 | 0 |
| Number Puzzles | 1 | 0 |
| **Verbal Analogies** | **0** | 1 |

**Task 2.1 — Build a Verbal Analogies type.** It has no direct coverage, and it is one of the three
subtests on Riverside's own screening form. `VER-RELPAIR-01` is mapped loosely and its own note says
it is not `A:B::C:?` completion. This is the largest single gap against the requirement.

**Task 2.2 — Decide, for each of the 36 unmapped types, whether it is CogAT or not.** Absence from
`cogat.ts` currently means two different things — "deliberately not CogAT" for the working-memory and
game-based types, and "nobody has looked yet" for the rest. Those need separating. The 36:

- Working memory (3): `WM-bind-01`, `WM-bubble-01`, `WM-corsi-01`
- Game-based (6): `GB-EXPLORE-01`, `GB-FLAWFINDER-01`, `GB-ROBOPATH-01`, `GB-TRACK-01`, `GB-WORDFORGE-01`, `GB-WORDLADDER-01`
- Context (2): `CX-achieve-02`, `CX-check-01`
- Verbal (4): `VER-EVIDENCE-01`, `VER-MORPHO-01`, `VER-SENSE-01`, `VER-SEQUENCE-01`
- Spatial (11): `SPA-HIDDENCUBE-01`, `SPA-MAZE-01`, `SPA-PIPES-01`, `SPA-ROLL-01`, `SPA-SCENE-01`, `SPA-SHADOW-01`, `SPA-TANGRAM-01`, `SPA-VIEW-01`, `SPA-XFORM-01`, `SPA-XPLANE-01`, `SPA-XSCAN-01`
- Quantitative (5): `QUANT-DOTS-01`, `QUANT-GLYPHNUM-01`, `QUANT-GRAPH-01`, `QUANT-MIX-01`, `QUANT-WORD-01`
- Fluid (5): `FLU-ANALOGY-01`, `FLU-GRIDCOPY-01`, `FLU-LADDER-01`, `FLU-ODDPAIR-01`, `FLU-OPCHAIN-01`

Some are obvious. `FLU-ANALOGY-01` is a figure analogy and almost certainly belongs under Figure
Matrices. Several spatial types have no CogAT analogue and should be recorded as `none` rather than
left blank.

**Task 2.3 — Put the mapping on the item, and enforce it.** Today `cogat.ts` is advisory: nothing stops
a "CogAT-aligned" instrument drawing from an unmapped type. Add a `cogatSubtest` field to the bank
records, fail the build when a type has neither a subtest nor an explicit `none`, and filter the pool
by it at session start. The pool filter already exists — I added a `types` parameter to
`POST /api/bank/sessions` today — so this is a matter of deriving the list from the mapping instead of
hand-writing it.

**Task 2.4 — Reconcile the second, contradicting list.** `screener/apps/lab-system/shared/showcase.ts`
is a curated demo allowlist I wrote today, grouped into five families. It disagrees with `cogat.ts` in
both directions: it includes `FLU-ANALOGY-01`, which is unmapped, and holds back `QUANT-BALANCE-01`,
`FLU-VENN-01` and `FLU-STACK-01`, which are mapped as direct. Both lists are defensible for their own
purpose, but two sources of truth will drift. Once 2.2 and 2.3 are done, `showcase.ts` should derive
from the mapping.

**Task 2.5 — Fix the stale counts in the docs.** `docs/design/ui-agnostic-assessment-system.md` §5 says
52 types and 9 direct; it is 53 and 10. `screener/README.md` says 4,534 scorable items; it is 5,425
after today's loader change, and will change again with 1b.6.

---

## 3. Getting both engines onto Lambda

There is no Lambda today. No `serverless.yml`, no SAM template, no CDK, no `aws-lambda` dependency, no
`exports.handler` anywhere under `screener/`. The archive has a Terraform skeleton with a
`exam_scoring` Lambda (`archive/infra/lambda.tf`) and a handler at
`archive/packages/exam-scoring/src/lambda/handler.ts`, but that scores a completed exam trace and has
nothing to do with adaptive selection. `archive/infra/main.tf` line 1 says "SKELETON ONLY: not wired
to a live account, no state backend."

### The one thing that makes this hard

**Sessions live in a `Map` in the process.** `bankSessions` in `apps/api/src/server.ts:156` holds every
in-flight session. Lambda is stateless and scales out, so the second request can land on a different
instance and the session is gone. Nothing about the maths needs fixing; the state model does.

**Task 3.1 — Make the engine stateless first, before touching AWS.** Rework the two entry points so
each call takes the whole session state in and returns the new state out, with no server-side storage:

- `selectNext({ config, history, posterior }) -> { item, posterior, stopReason | null }`
- `grade({ item, response, latencyMs, posterior }) -> { correct | null, posterior, flags }`

This is worth doing on its own merits even if Lambda never happens: it makes the engine testable
without a server and adoptable by anyone. Do it as a pure refactor with the existing tests green, then
keep `QbankSession` as a thin stateful wrapper over it so nothing breaks.

**Task 3.2 — Decide where session state lives.** Either the caller holds it and passes it back (signed
so it cannot be tampered with — a client that can edit its own posterior can hand itself any score), or
DynamoDB keyed by session id. Caller-held is simpler and fits "adoptable into any program"; it needs
the signing to be right.

**Task 3.3 — Solve bank loading for a cold start.** `loadBanks()` reads 19 MB of JSONL from disk at
startup and holds it (`bank.ts:91` says exactly this). Options, roughly in order of preference:
a compact prebuilt index of just what selection needs (id, type, difficulty, age bands, option count,
key) which should be a small fraction of 19 MB; or S3 with a warm in-memory cache; or a Lambda layer.
Selection needs only item *metadata* — it never needs item content, which is most of the bytes. That
observation is probably the whole answer.

**Task 3.4 — Write the wire contract down.** There is no OpenAPI spec and no typed client. The contract
lives in Express handlers and is re-declared by hand in each React client (for example
`BankScreener.tsx:18-54`). If the point is adoption by other programs, the contract is the product.
Write it before the handlers.

**Task 3.5 — Then the actual Lambdas.** Two functions, both thin wrappers over 3.1. Choose one IaC
approach; do not add a third alongside the archive's Terraform.

**Task 3.6 — Add CI.** `screener/` has no `.github/workflows`. There are 195 unit tests and a simulation
harness and nothing runs them automatically. Before anyone deploys anything, `npm run verify` should
run on every push.

---

## Suggested order

1. **1b.7 verification** and **1a.5** (real option count) — small, and both are current wrongness.
2. **3.1** stateless refactor — unblocks everything in section 3 and is valuable alone.
3. **3.4** wire contract, then **3.6** CI.
4. **1b.3** rapid-guess, using the latency already stored.
5. **2.2 / 2.3** CogAT mapping and enforcement — mostly judgement, little code, and it is a stated
   requirement.
6. **1a.1** MEPV, once someone has decided score-vs-decision.
7. **1b.1** lure-class weighting, once the ordering in 1b.2 is agreed.
8. **1b.6** solver-scored types, largest and least urgent, but it is what unlocks Paper Folding.

## Running it

```bash
cd screener
npm install
npm run api          # Express on 5181
npm run web          # Vite on 5180
npm run verify       # typecheck, 195 tests, simulation, smoke
npm run kit          # UI kit coverage report
npx tsx apps/lab-system/verify-showcase.ts   # plays a real session per age band
```

`screener/README.md` describes the loop. `docs/design/ui-agnostic-assessment-system.md` covers the
abstraction between items and presentation, and
`screener/apps/lab-system/shared/uikit/README.md` covers the theming format.
