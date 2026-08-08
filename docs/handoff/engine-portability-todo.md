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
| 1a. Next-item selection as a Lambda | Algorithm works, **objective settled** (info-at-threshold — see below), not a Lambda, no per-domain reporting yet |
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

### RESOLVED: the objective is a binary pass/fail classifier, not MEPV

**Decided by Aadi and Felipe, 6 Aug 2026. MEPV is not being implemented.**

The product is a binary pass/fail classifier. It answers "is this child above the line" and never
reports an ability score, so `session.ts:231` is already selecting on the right objective:

```ts
const info = information(threshold, paramsFor(entry.b, 4, 1.5));
```

Maximising **Fisher information at the decision threshold** picks the item that best separates above
the line from below it, which is exactly what a classifier wants. It is also the cheaper of the two.

Kept for the record, because it will be asked again: MEPV picks the item whose expected posterior
variance — averaged over the possible responses, weighted by how likely each is — comes out lowest.
It reduces uncertainty in the *score*. Information-at-threshold sharpens a *decision*. We are only
ever making a decision, so the score-shaped objective buys nothing and costs items.

There is no MEPV code anywhere in the repo and none is wanted. If a future product does need a
reported ability score with an interval, this is the entry to reopen — add MEPV alongside the current
criterion behind a config field rather than replacing it, and re-read the two tasks below in the
history of this file.

**Task 1a.1 — Implement MEPV alongside the current criterion. — DROPPED.** Superseded by the decision
above.

**Task 1a.2 — Make it not O(pool) per item. — DROPPED.** Only existed to make MEPV affordable.
Information-at-threshold is one cheap evaluation per candidate, so the pool size is not a problem
today. If selection ever gets slow, the fix is the same difficulty-window restriction described here
before, and it should be measured before it is written.

### Domain handling, and the spike question

There is no battery selection. What exists is a hard coverage floor: `session.ts:222-226` finds
domains below `perDomainMinimum` and serves those first, then falls through to pure information
greed. Domains are the four internal ones (`quantitative`, `verbal`, `spatial`, `fluid`) from
`domainOf` in `bank.ts`, **not** CogAT's three batteries.

**Task 1a.3 — Add battery as a first-class concept. — DROPPED.** Decided by Aadi and Felipe,
6 Aug 2026: we keep our own four domains (`quantitative`, `verbal`, `spatial`, `fluid`) and do not
introduce CogAT's three batteries as a selection concept. The existing coverage floor
(`session.ts:222-226`) stays as the mechanism. Note the consequence for requirement 2: CogAT
alignment is now carried entirely by the per-type mapping in section 2, not by the domain structure,
so `cogat.ts` is the only place that claim lives.

**Task 1a.4 — Hold and report a confidence interval per domain.** Rescoped by Aadi and Felipe,
6 Aug 2026. Prerequisite for 1a.7, which reads these to let a domain spike pass on its own.

**The product is the binary pass/fail, and every question feeds it.** The composite posterior is
updated by every scored item regardless of domain, and that composite is the primary route to a pass.
The per-domain posteriors are a second readout over the same evidence, not a competing use of it — no
item is spent on a domain estimate at the composite's expense.

Hold four posteriors, one per domain, each updated only by its own items, and report mean plus 90%
interval for each. `Posterior` already has `interval(0.9)`, so this is four instances and a switch on
`serve.domain` in `submit()`. No hierarchical model, no change to the stop rule or selection.

**Report the bands even when they are very wide, which they usually will be.** A session runs 8-16
items, so a domain sees 2-4 and its interval will often be 2-3 logits — close to the prior. Report it
anyway: it is an honest account of what was covered, and nothing hangs on it. Two rules:

- Never render a per-domain mean without its interval. A bare number off two items reads as a finding.
- Show items served per domain, and suppress rather than print a domain that got none. **A K-1 session
  cannot currently be served a single verbal item** (`perDomain.verbal` is structurally 0 at that band,
  confirmed by both app loops), so a K-1 verbal band would be the prior with a label on it.

**Task 1a.7 — Let a domain spike pass on its own: disjunctive rule.** Decided by Aadi and Felipe,
6 Aug 2026. Blocked on 1a.4, which computes the per-domain posteriors this reads.

**The problem.** Today there is one posterior and every item updates it with no domain conditioning
(`session.ts:272`), so a child at +2.5 in spatial and −1.0 in verbal has the spike averaged away and
lands mid-scale. A composite threshold cannot express "exceptional in one thing".

**The rule.** Pass if the composite clears its threshold, **or** if any single domain clears a
higher one. Two things still need specifying and both should be written down when they are chosen:
the domain bar itself, and what "clears" means given the bands are wide — with a 2-3 logit interval
it is the probability threshold, not the bar, that does most of the work, so state it as
`P(theta_domain > domainBar) >= p` and pick `p` deliberately rather than defaulting to 0.5.

**Why this is defensible: the errors are not symmetric, and the output is not definitive.** A false
negative is a capable child the programme never learns about. A false positive is a review and an
afternoon. The tool recommends and never rejects, so being generous costs little and being strict
costs the thing we are trying to prevent. Tune the rule to miss as few children as possible and
accept the extra recommendations that come with it.

This is not a new posture — the engine already encodes it twice, so the disjunctive rule extends an
asymmetry rather than introducing one:

- `defaultScreenerConfig` sets `confidenceAbove: 0.75` against `confidenceBelow: 0.97`
  (`engine/src/configs.ts`), and the stop logic reads the second as `pAbove <= 0.03`
  (`qbank/src/session.ts:302-303`). It takes far more evidence to rule a child out than to let one in.
  The config's own comment says so: *"Eager to pass a candidate through, reluctant to rule one out."*
- Every surface sets `recommendProbability` between 0.30 and 0.40 — deliberately below a half,
  because the cost-optimal threshold is the false-positive share of total error cost and here those
  costs are nowhere near equal. The comment records that an earlier draft used 0.55 and *"quietly
  contradicted the proposal it came from."*

**Three consequences, all of them binding.**

1. **A domain-triggered pass is not evidence of a domain strength, and must never be reported as
   one.** The band that let the child through is 2-4 items wide. Passing generously on a noisy signal
   is fine when a false positive is cheap; *claiming* the child is strong in spatial on that basis is
   a measurement claim the data does not support. Pass on it, do not narrate it.
2. **This holds only while the output is a recommendation.** If a "no recommendation" is ever used to
   turn a child away, the asymmetry inverts, false positives start costing someone something, and
   this entry has to be reopened. It would also re-raise the exposure that produced the ban on an
   in-house cognitive test in the first place, so it is not only a measurement question.
3. **Lakin's objection is answered, not dodged.** "An 'OR' rule does not manufacture diversity
   without lowering the bar" (`brainlifting/gifted-assessment-quality-brainlift/`, Insight 12) is
   correct and lands against anyone claiming an OR rule is *more accurate*. We are not claiming that.
   We are widening the net on purpose because we have named which error is expensive. Say it that way.

**The case for.** Wai's Project TALENT figure: 70% of the spatial top 1% did not qualify on the
verbal and quantitative composites (`brainlifting/talent-screening-brainlift/`, SPOV 4). A
composite-only threshold reproduces exactly that miss, which is the single largest quantified gap in
that research and the reason this rule exists.

### A calibration problem you will hit immediately

`session.ts:231` passes `paramsFor(entry.b, 4, 1.5)`: **every item is assumed to have 4 options and a
discrimination of 1.5**, whatever it actually has. `paramsFor` sets the guessing floor to
`1 / optionCount` (`engine/src/irf.ts:20`), so a 3-option item is modelled as easier to guess than it
is and a 6-option item as harder. Discrimination is invented outright.

**Task 1a.5 — Pass the real option count.** It is available on the item content. Cheap, and it makes
every probability in the model less wrong.

**DONE 8 Aug 2026 — cheap to write, and it moves selection much more than "less wrong" suggests.**

`optionCountOf` in `bank.ts` reads the count off `content.options` and returns **null** rather than a
number when the content enumerates nothing. Both call sites now go through one private `paramsOf` in
`session.ts`, so selection and the posterior update cannot drift apart — if they ever computed the
guessing floor differently the engine would choose an item under one model and score it under another,
which fails invisibly. Discrimination stays at 1.5 behind a named `FIXED_DISCRIMINATION` with the
comment 1a.6 will need.

**How wrong the literal 4 was.** Of the 5,034 servable records only **2,373 have four options**.
Counts run 2 to 8. `QUANT-DOTS-01` is 120 left/right comparisons — a coin flip modelled as a 25% guess.
`FLU-OPCHAIN-01` is 468 five-option items, `SPA-XFORM-01` another 234.

**The measured effect on selection, which is larger than I expected:**

| | |
|---|---|
| Items whose information changed | **1,695 of 5,034** |
| First pick, whole pool at threshold 1.0 | `CX-check-01` → `SPA-VIEW-01` (8 options) |
| Overlap in the 50 most-informative items | **7 of 50** |

More options means less guessing contamination means more information, so **the engine now
systematically prefers items with more options.** That is the correct consequence of a correct model,
but it is a real change in what a child is shown, and it interacts with the coverage floor in
`session.ts:222-226` rather than being neutral to it. Worth a look before anyone reads a session
transcript and wonders why the spatial types with eight options keep coming up.

**Two things this turned up that are not about 1a.5.**

1. **`npm run sim` does not exercise the qbank engine at all.** `packages/engine/src/harness/` contains
   no reference to `qbank`, `QbankSession` or `loadBanks`; it simulates the generator engine. The
   simulation output was byte-identical before and after a change that reorders most of the bank's
   selection, which is how I noticed. **This breaks 1b.8's plan as written** — it says to take a
   baseline off the simulation harness and report the change in pass rate per age band, but lure
   weighting is a qbank scoring change and the harness never runs qbank. Either the harness grows a
   bank-backed mode first, or 1b.8 measures through `verify-showcase.ts` instead. Decide before
   starting 1b.8; the task is otherwise unrunnable.
2. **The guessing floor cannot affect a wrong answer.** For an incorrect response the 3PL likelihood is
   `(1-c)(1-logistic)`, and `(1-c)` is constant in theta, so it divides out in normalisation. The option
   count therefore changes the posterior **only on items the candidate got right**, and changes selection
   on every item. My first version of the test asserted a difference after a wrong answer and passed
   against the unfixed code, which is exactly the false negative TDD is meant to catch. Both directions
   are now pinned in `option-count.test.ts`.

**The one open decision, left open deliberately.** 420 servable items across four types answer with
something that is not a choice from a list — `CX-check-01` assigns tokens to bins, `SPA-MAZE-01` traces
a path, `SPA-PIPES-01` sets rotations, `SPA-TANGRAM-01` places pieces. `optionCountOf` returns null for
all of them and `session.ts` falls back to a named `ASSUMED_OPTION_COUNT = 4`, which keeps them behaving
exactly as they did before this change. A uniform guess over four options is not the right model for any
of them and the honest floor is probably nearer 0. I did not pick a number, because moving it changes
who passes and that is a measurement decision, not a refactor. Note that `paramsFor(b, 0)` already
yields `c = 0` if that is the answer.

Three further types are countable but only by reading a second field: `FLU-DEDUCE-01` has
`candidates`/`candidateCount` (120 items), `FLU-ODDPAIR-01` has `rows`/`rowCount` (120), and
`GB-FLAWFINDER-01` has `claims`/`claimCount` (120). `SPA-HIDDENCUBE-01` (108) answers over a numeric
`response` range, and `FLU-CONCEPT-01` (78) gives three yes/no probes, so its response space is 8 and
not 3. All five are left on the fallback: each is a modelling judgement rather than a lookup, and
guessing at five of them to save one config decision is how the bank got a placement ratio marked as an
option index in the first place.

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

**But 6,928 is the wrong number to plan against.** It counts items that *carry* the data, not items
where the class the child picked can be looked up at scoring time. Measured on the 21 showcase types,
7 Aug 2026: 9 types (1,114 items) join cleanly on option key; 3 more (312 items) hold distractors only
and need one line to handle; 5 types (602 items) have `content.options` of `null` so there is nothing
to key on; and 4 types (400 items) have options carrying no `key` field, which is the same defect that
already makes `VER-RELPAIR-01` unmarkable. **So 12 of 21 served types, around 1,426 items, are usable
today.** It also only fires on wrong answers, so in an 8-16 item session it touches perhaps three to
five responses. Worth doing, possibly, but it is a refinement and not a transformation — which is why
1b.8 exists.

**Task 1b.8 — Measure the effect before building it.** Gates 1b.1 and 1b.2. Re-run the coverage join
across all 53 types, take a baseline off the simulation harness, then spike fractional scoring behind
a flag — `likelihood = p^s * (1-p)^(1-s)`, `s = 1` correct, `s = 0` unclassifiable, a provisional
ordering in between — and report three numbers per age band: the share of scored responses that got a
non-binary `s`, the change in pass rate, and the change in mean estimate.

The third is the one to watch. Every wrong answer now costs less than it did, so estimates drift
**upward** and the effective threshold moves without anyone editing `abilityThreshold`. Given the
asymmetric-loss position in 1a.7 that direction is probably wanted, but it should be chosen rather
than absorbed. Measure the drift first, then decide whether to recalibrate against it.

If the shift is lost in the noise of a 12-item session, close 1b.1 and 1b.2 rather than arguing about
the ordering.

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
tolerance. When I widened the loader to accept numeric keys, all 391 of those items entered the pool
and the index comparison truncated the ratio to `0`, so picking the first option marked correct on
every item and everything else marked wrong. Fixed by requiring a numeric key to be a non-negative
integer in both the loader and `scoreResponse`, and the type is now held back. Tests in
`numeric-key.test.ts`. **The lesson worth keeping: `scoring.mode` in the bank data is not always
true.** Treat it as a claim to verify, not a fact.

**VERIFIED 8 Aug 2026 — the fix holds, and the sweep is clean. PASS.**

The fix itself is sound. `bank.ts:139` refuses a numeric key that is not a whole non-negative integer
at load, `bank.ts:191` refuses the same in `scoreResponse`, and the two paths agree, so an item that
slipped past one would still be unscorable rather than marked wrongly.

Swept all 53 banks, 7,319 records, reading the raw JSONL and cross-checking against `loadBanks()`:

| `scoring.mode` | Records |
|---|---|
| `deterministic_key` | 5,425 |
| `computed_solver` | 1,774 |
| `model_judge_deferred` | 120 |

Of the 5,425 `deterministic_key` records: 4,534 carry a letter key, 500 carry an option index
(exactly the five verbal types, all servable, so the widening still buys what it was for), and 391
carry a non-integer number. **All 391 are `QUANT-GLYPHNUM-01` and all 391 are held back**
(`excluded: {"non-index-numeric-key": 391}`). No other type declares `deterministic_key` over a key
that is not an option index, and there are no negative keys anywhere. Sampled GLYPHNUM items mark
`null` against index 0, index 1, and the truncated ratio.

The sweep is now a test rather than a terminal session — three cases in `numeric-key.test.ts` under
*the whole library, not just the type that broke*. They assert the **invariant** (nothing with a
non-index numeric key is ever servable; every servable item marks both right and wrong) rather than a
count, because a count assertion goes red on every legitimate bank change and trains people to bump
the number without reading why. 198 tests pass, up from 195.

**Three counts in this document are wrong, and I measured the right ones today.** Feeds 2.5:

| Claim | Where | Says | Measured 8 Aug |
|---|---|---|---|
| GLYPHNUM items that entered the pool | this entry | 204 | **391** (corrected above) |
| Scorable items | 2.5 below, `tasks.md` | 5,425 | **5,034** |
| Items dropped at load | 1b.6 below, `tasks.md` | 1,894 | **2,285** |
| Test count | *Running it*, `tasks.md` | 195 | **198** |

5,425 is the `deterministic_key` count, not the servable count — it includes the 391 GLYPHNUM items
the fix holds back. Servable is 5,034, and `npm run smoke` has been printing exactly that
(`5034 of 7319 records can be marked host-side`) the whole time, so the doc disagreed with the
codebase's own output rather than with something unmeasured. `README.md:148-149` says 4,534 markable
and 2,785 not; both predate index keys and both are now wrong.

**One finding that changes 1b.6's scope, not just its numbers.** 1b.6 says 1,894 items are dropped
and names two missing modes. There is a **third** shape: GLYPHNUM's 391 items declare
`deterministic_key` and carry `answer.tolerance` (`0.025`), so they need a numeric comparison within a
tolerance — neither a solver nor a judge. That is 2,285 dropped in total, in three categories not two,
and the 391 are the cheapest of the three to make servable since the rule is one comparison and the
data is already there. Worth pulling forward ahead of the solver work.

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
2. **1a.4** per-domain intervals, then **1a.7** the disjunctive pass rule it unblocks. Both small,
   and together they are the change that stops a spiky child being averaged out.
3. **3.1** stateless refactor — unblocks everything in section 3 and is valuable alone.
4. **3.4** wire contract, then **3.6** CI.
5. **1b.3** rapid-guess, using the latency already stored.
6. **2.2 / 2.3** CogAT mapping and enforcement — mostly judgement, little code, and it is a stated
   requirement.
7. **1b.8** measure the lure-weighting effect, then **1b.1** / **1b.2** only if it is real.
8. **1b.6** solver-scored types, largest and least urgent, but it is what unlocks Paper Folding.

Still needing a decision rather than an implementer: the domain bar and the probability threshold in
1a.7. Neither blocks writing the code — put them in config with a stated default and a comment saying
they are unvalidated, the same way `abilityThreshold` and `recommendProbability` already are.

*(MEPV was item 6 here. Dropped — see 1a.)*

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
