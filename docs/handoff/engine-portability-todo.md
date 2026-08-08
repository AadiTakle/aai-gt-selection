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

> **Note on line references, 8 Aug 2026.** Task 3.1 moved all the measurement out of
> `packages/qbank/src/session.ts` into `packages/qbank/src/engine.ts`; `session.ts` is now a thin stateful
> wrapper. Every `session.ts:NNN` reference written before that date points at where the code *was* — the
> observation it supports still holds, but look for the named function in `engine.ts`. Selection is
> `selectNext`, grading is `grade`, the stop rule is `stopReasonFor`, the pass rule is `passRouteFor`, and
> the derived counters are `progressFrom`. Line numbers are not restated here because they churn; the
> function names will not.

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

**DONE 8 Aug 2026.** Four `Posterior` instances (now `Posteriors` in `engine.ts`), each updated only by its own domain's
scored items, reported through a new `domains` on `QbankState`. Composite untouched and still the pass
route. No hierarchical model, no change to selection or the stop rule. Tests in `domain-bands.test.ts`
rebuild each domain's posterior from its own attempts and check the session lands in the same place, and
separately rebuild the composite from all attempts to prove it was not disturbed. 220 tests pass.

`mean` and `interval` are both **required** fields on `DomainBand`, so there is no way to get a
per-domain mean out of this type without its interval beside it. That is the "never emit a mean without
its interval" rule made structural rather than remembered.

**Suppression keys off items *scored*, not items served.** A domain served twice whose responses were
both unmarkable holds exactly the prior it started with, and publishing that under a domain label is the
same failure as publishing a domain nobody asked about — it just arrives by a different route. Both
counts are reported so the gap is visible.

**Correction: the K-1 claim above is wrong.** K-1 has **51 servable verbal items**, and a K-1 session
with `perDomainMinimum: 1` serves one and returns a verbal band. Measured, not reasoned. Whatever was
true in the app loops is not true of the engine, so the acceptance criterion "a K-1 session returns no
verbal band" cannot be met and should not be. The real criterion, which does hold: **a domain that
scored nothing returns no band, and a session that covered all four returns four.** Suppression is easy
to reach without K-1 — with `perDomainMinimum: 0` greedy selection puts an entire session into one or two
domains at every band, so a 16-item K-1 session returns exactly one band.

**What the bands actually look like, and why the interval rule earns its keep.** A 16-item K-1 session at
`perDomainMinimum: 1`:

| Domain | Mean | 90% interval | Width | Scored |
|---|---|---|---|---|
| quantitative | 1.13 | [0.05, 2.35] | 2.30 | 13 |
| verbal | 0.07 | [-1.50, 1.65] | 3.15 | 1 |
| spatial | 0.07 | [-1.50, 1.65] | 3.15 | 1 |
| fluid | 0.11 | [-1.40, 1.70] | 3.10 | 1 |

Composite: 1.15, [0.05, 2.35]. Widths run 2.05 to 3.30 logits across every session tried, and a
single-item band is barely distinguishable from the prior. **Read the third row as a reader would**:
`verbal: 0.07` against a composite of 1.15 says this child is weak verbally. It says nothing of the kind
— it is one item, and the interval covers everything from well below the threshold to well above it.
Suppressing it would be worse, because then the session would silently claim verbal coverage it did not
have. So it is reported, with its width and its count, and anything rendering it must show all three.

**Nothing renders these yet, deliberately.** `state()` is the boundary the task asked for and 1a.7
consumes it programmatically. Every host re-declares its own response types by hand (see 3.4), so adding
a surface means picking a presentation for a number that is this easy to misread, and the rule above has
to be enforced wherever that happens.

**One hazard carried over from today's selection work.** There is no per-type diversity rule, so a
domain's handful of items can all be one type — a spatial band whose evidence is five `SPA-VIEW-01` items
is a statement about one type, not about spatial ability. 1a.7 already forbids reporting a
domain-triggered pass as a domain strength; the same caution applies to these bands, for a second reason.

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

**DONE 8 Aug 2026.** `passRouteFor` (now in `engine.ts`); `passRoute` on `QbankState`; `domainBar` and
`domainRecommendProbability` in config with defaults of **1.5** and **0.45**. Tests in
`disjunctive-pass.test.ts` simulate whole cohorts against a true ability per domain. 229 tests pass.

**The miss is real and it is total.** Simulated at Careful precision with four items per domain, 150
candidates per cohort, the composite route recommends **0%** of true spatial spikes. Not a few — none.
A child at +2.5 spatial and -1.0 elsewhere is rejected `confident-below` at pAbove ≈ 0.019 with the
spike sitting in the transcript. Project TALENT's 70% is reproduced here as 100%, because our composite
is four domains wide and averages harder than a two-battery composite does.

**With the rule, at the shipped defaults:**

| Cohort | Recommended | via composite | via domain |
|---|---|---|---|
| spiky spatial +2.5, rest -1.0 | **78%** | 0% | 78% |
| uniformly weak, -0.5 | 1% | 0% | 1% |
| uniformly strong, +1.8 | 99% | 99% | 0% |

The two routes divide cleanly: the composite carries the uniformly strong and never fires for a spike,
the domain route carries the spike and almost never fires for anyone flat. A worked session:

```
stopReason=confident-below   composite pAbove=0.019   decision=recommend
passRoute={"via":"domain","domains":["spatial"]}
  quantitative  -0.47 [-1.85, 0.75] n=4
  verbal         0.52 [-0.95, 1.75] n=4
  spatial        1.47 [ 0.35, 2.65] n=4
  fluid         -0.83 [-2.10, 0.25] n=7
```

**How the two numbers were chosen.** Against simulated cohorts rather than for roundness, and the grid
is in the comment beside them. `p` is doing nearly all the work, as this entry predicted: there is a
cliff just above 0.5 where the rule stops firing for anybody, because four items cannot put that much
mass past the bar, and a bar of 2.0 never fires at all. `bar 1.0 / p 0.30` reaches 96% sensitivity but
recommends 19% of uniformly average children; `bar 1.5 / p 0.45` takes 78% at 1%. Both unvalidated.
**The rule's power is a function of `perDomainMinimum`** — fewer items per domain is a flatter posterior
and a rule that cannot fire — so anyone lowering that is also disabling this.

**Consequence 1 is enforced structurally.** `passRoute` lists *every* domain that cleared, in `DOMAINS`
order rather than by probability, so there is no "strongest domain" field to misread. The type comment
says a domain-triggered pass is not evidence of a domain strength. Only domains that actually scored are
eligible: an untouched domain still holds its prior, and a prior has real mass above a modest bar, so a
low `p` would otherwise recommend a child on a domain nobody asked them about — a false positive
manufactured out of the prior. There is a test for exactly that.

**A presentational hazard this creates, and it needs owning before anything renders a result.**
`stopReason` describes the *composite's* confidence, so `stopReason: 'confident-below'` beside
`decision: 'recommend'` is now reachable and correct — the battery ruled the child out and one domain
carried them anyway. That is the rule working. Shown to a parent or an admissions reader without
explanation it looks like a bug, or worse, like the tool contradicting itself.

**One thing the simulation settled that this entry left open: the domain route is in practice a
single-domain rule.** Two domains at +2.0 lift the composite to pAbove 0.86, so the composite claims
those candidates first. The multi-domain branch is only reachable with an artificially low bar. Worth
knowing before anyone designs a display around "which domains carried this".

**And the caution from 1a.4 applies here with more force.** There is no per-type diversity rule, so the
four spatial items that carry a pass can all be one type. A pass triggered by four `SPA-VIEW-01` items
is a pass on one task, not on spatial ability. That does not undermine the rule — being generous on a
noisy signal is the stated intent — but it is a second reason never to narrate which domain did it.

### A calibration problem you will hit immediately

`session.ts:231` passes `paramsFor(entry.b, 4, 1.5)`: **every item is assumed to have 4 options and a
discrimination of 1.5**, whatever it actually has. `paramsFor` sets the guessing floor to
`1 / optionCount` (`engine/src/irf.ts:20`), so a 3-option item is modelled as easier to guess than it
is and a 6-option item as harder. Discrimination is invented outright.

**Task 1a.5 — Pass the real option count.** It is available on the item content. Cheap, and it makes
every probability in the model less wrong.

**DONE 8 Aug 2026 — cheap to write, and it moves selection much more than "less wrong" suggests.**

`optionCountOf` in `bank.ts` reads the count off `content.options` and returns **null** rather than a
number when the content enumerates nothing. Both call sites now go through one `paramsForRecord`
(since 3.1, in `engine.ts`), so selection and the posterior update cannot drift apart — if they ever computed the
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

**RESOLVED: an item that enumerates nothing is treated as unguessable, c = 0.** Decided by Felipe,
8 Aug 2026 — "assume they're unguessable for now". `engine.ts` uses a named `UNGUESSABLE` and
`paramsFor` already yields `c = 0` when handed no options. It applies to **528 items across five
types**: `CX-check-01` (assigns tokens to bins), `SPA-MAZE-01` (a path), `SPA-PIPES-01` (rotations),
`SPA-TANGRAM-01` (a placement) and `SPA-HIDDENCUBE-01` (a 0-60 stepper, so 61 outcomes and a true floor
of 0.016, near enough to 0 to leave alone).

It is an assumption and a generous one. A large response space is not an impossible one: a small maze
has few plausible routes, and a six-token sort has 2^6 assignments a child can stumble into. c = 0 says
that never happens, so a lucky answer is read as knowledge. That is the same direction as everything
else here — eager to pass, reluctant to rule out — but it should be revisited with
`abilityThreshold` and `recommendProbability` rather than treated as settled.

**Deciding this first exposed a bug in my own change, which is why it is worth writing down.** Five of
the nine types that `optionCountOf` originally returned null for are perfectly ordinary multiple choice;
they just named the list after the thing being chosen. Putting them on the unguessable floor was flatly
wrong, and worse than the literal 4 it replaced — `FLU-DEDUCE-01` offers four to eight candidates, so
the old default was accidentally exact for a third of them. Now read directly:

| Type | Field | Counts | Items |
|---|---|---|---|
| `FLU-DEDUCE-01` | `candidates` | 4-8 | 120 |
| `FLU-ODDPAIR-01` | `rows` | 4-6 | 120 |
| `GB-FLAWFINDER-01` | `claims` | 3-4 | 120 |
| `FLU-CONCEPT-01` | `probes`, 2^n | 8 | 78 |

`FLU-CONCEPT-01` needed thought rather than a lookup: it asks three independent yes/no probes and keys
all three as one string (`'YNN'`). Marking is all-or-nothing, so the space is 2^3 and reporting 3 would
claim a child guesses right a third of the time when it is an eighth.

### The guessing floor is now derived per item, and a share of each session is held for multiple choice

Decided by Felipe, 8 Aug 2026, after the c = 0 version showed the five constructed types taking 100% of
the 50 most-informative items.

**First: c = 0 was replaced by the space the item declares.** `optionCountOf` no longer returns null for
anything in the bank — every one of the 5,034 servable items now has a response space read off its own
content:

| Type | Space, from content | c |
|---|---|---|
| `SPA-HIDDENCUBE-01` | declared stepper, `(max-min)/step + 1` | 1/61 |
| `SPA-MAZE-01`, `SPA-PIPES-01` | `R*C + 1`; the answer is a count the grid bounds | 1/17 to 1/145 |
| `SPA-TANGRAM-01` | `R*C*L + 1` | 1/10 to 1/37 |
| `CX-check-01` | `binCount^tokenCount` | 1/64 to ~0 |
| `FLU-CONCEPT-01` | `2^probes`, keyed all-or-nothing | 1/8 |

Per item, not per type, and from the item's own content rather than from the spread of keys in the bank
— setting a guessing floor from the answers would be circular and would move whenever a bank grew. The
useful property is that it falls as the item gets harder: a 4x4 maze is one guess in 17 and a 12x12 one
is one in 145. Across the pool the floor now runs min 0.0000, p25 0.20, median 0.25, p75 0.25, max 0.50.
It is still an approximation — a child does not guess uniformly over a stepper — and the code says so.

**Second, and this is the part the floor could not do: a small guessing chance does not rebalance
selection.** Max information at the decision point, a = 1.5:

| c | | max I | vs 4-option |
|---|---|---|---|
| 0 | unguessable | 0.5625 | 1.62x |
| 0.05 | flat small | 0.5100 | 1.47x |
| 0.07 | a 14-answer placement | 0.4908 | 1.41x |
| 0.25 | four options | 0.3481 | 1.00x |

A constructed item would need a genuine one-in-four guess merely to draw level. **Constructed items
really are more informative per item; that is not a modelling artefact to fix.** What they are not is
quick, and a child answers several multiple-choice questions in the time one tangram placement takes. So
the engine maximises information per *item* while the product wants information per *minute*.

`minMultipleChoiceShare` (default 0.5) holds at least half of each session for multiple choice, as a
running share so it scales from a 4-item Taster to a 20-item Thorough without knowing the cap. It is the
same shape as the per-domain floor directly above it in `nextItem`, and it stands down when the pool has
no multiple-choice item left, because a coverage rule that can empty the pool would report
`bank-exhausted` on a bank that is not exhausted.

**It is a serving rule and deliberately not a change to the model.** Penalising a constructed item's
information to get this outcome would corrupt the number the stop rule and the pass decision both read.
The information stays honest; only what may be drawn is constrained. Measured over a 16-item session on
the full pool: 13% multiple choice before, 50% after.

**The successor is information per expected second**, once `latencyMs` is forwarded (1b.5) and per-type
floors exist (1b.3). That states the real tradeoff instead of approximating it with a quota, and
`DEFAULT_MIN_MULTIPLE_CHOICE_SHARE` should be deleted then rather than kept alongside it.

**Still true, and still unaddressed: the five constructed types are all unmapped to CogAT.**
`SPA-MAZE-01`, `SPA-PIPES-01`, `SPA-TANGRAM-01` and `SPA-HIDDENCUBE-01` are in the unmapped spatial list
in section 2 and `CX-check-01` is in the unmapped context pair. The format floor caps them at half a
session rather than resolving the alignment question; 2.3's pool filter is what actually resolves it.

**And one thing this exposed that nobody has looked at: there is no per-type diversity rule at all.** A
16-item session over the full pool serves `CX-check-01` eight times and `SPA-VIEW-01` five, about four
distinct types in sixteen questions. It is not caused by any of today's changes and it was worse before
them — at share 0 the same session is eleven `CX-check-01` items out of sixteen — because items of one
type share a difficulty band and a parameter set, so whatever wins once wins repeatedly. Coverage is
enforced per domain and per format and nowhere per type. Worth a decision before 1a.4: a per-domain
interval whose spatial evidence is five `SPA-VIEW-01` items is a statement about one type, not about
spatial ability, and 1a.7 already forbids reporting a domain-triggered pass as a domain strength.

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

**DONE 8 Aug 2026.** New `packages/qbank/src/engine.ts` holds the measurement; `session.ts` is now a thin
wrapper — a 130-line class plus a re-export block that keeps the moved types importable from their old
path, so no consumer had to change. A pure refactor
with the suite green throughout, then 12 new tests for the guarantees the old design made
unrepresentable. 241 tests pass.

```
selectNext({ config, pool, history, posteriors }) -> { serve | null, stopReason | null }
grade({ item, response, latencyMs, posteriors })  -> { correct | null, posteriors, flags }
```

Two departures from the signatures above, both forced by work done since they were written. `posterior`
is `posteriors` — a composite plus one per domain — because 1a.4 and 1a.7 gave the engine four more
beliefs to carry. And `selectNext` takes the `pool`, because "no filesystem" means the items have to
arrive as an argument; `buildPool(records, ageBand)` is the whole of the engine's dependency on the item
library, and a caller can hand it bank records, an S3 object, a prebuilt metadata index (3.3), or eight
literal objects in a test.

**`flags` is empty today.** It is in the shape now because the wire contract is the product (3.4) and
adding a field to a published contract costs more than reserving one. 1b.3's rapid-guess detection is
what fills it.

**Six private fields became one derivation.** Used ids, per-domain counts, scored counts, the
multiple-choice tally and the unscorable tally were all held on the session and kept in step by hand
inside `submit`. They are now computed from the transcript by `progressFrom`. That is the change that
makes the state model trustworthy rather than merely stateless: two places holding the same fact is how
they come to disagree, and a caller replaying a history has to land exactly where the original session
did.

**`Posterior` gained the half it was missing.** It had `snapshot()` and no way back, so a belief could be
read but never restored — the actual obstacle to both this task and 3.2. `Posterior.fromSnapshot()`
validates and renormalises, `clone()` copies exactly, and the pair round-trips through JSON, which is
what 3.2 will need whichever storage it picks.

**A bug the new tests found, which the old ones could not.** `clone()` first went through
`fromSnapshot`, which renormalises. Renormalising an already-normalised density only adds rounding, so
every `grade` call perturbed belief at about 1e-16 — including in the three domains the item never
touched — and a posterior updated one response at a time slowly drifted from the same posterior replayed
from its transcript. Harmless in any single session and fatal to the property that makes caller-held
state safe, since two hosts would then disagree about the same child. `clone()` is now an exact copy and
there is a test asserting the incremental and replayed beliefs are bit-identical.

**Where the stop rule went.** Extracted, not moved. `stopReasonFor` is pure and consulted in two places:
`selectNext`, so a stateless caller learns the session is over without submitting anything, and the
wrapper's `submit` at exactly the moment it used to, so observable behaviour is unchanged. `abandoned`
stays on the wrapper — it is a caller's intent rather than a property of the evidence, so no function of
the history can return it.

**One thing not to overclaim.** The functions perform no filesystem access, and `engine.test.ts` proves
it by building a pool from eight inline records without ever calling `loadBanks`. But `engine.ts` still
*imports* `bank.ts` for `BankRecord`, `scoreResponse` and `optionCountOf`, and `bank.ts` imports
`node:fs` at the top. Nothing reads a file on import — `BANK_DIR` is a `join` — so this is irrelevant on
Lambda and matters only to a browser bundle, which is the boundary `index.ts` already documents. Severing
it means splitting the pure record helpers out of the loader, which is the same seam 3.3 opens when it
builds a metadata-only index. Do them together.

**`apps/api` calls them.** Through the wrapper this entry asks for, and it holds no measurement logic of
its own — no `Posterior`, no `paramsFor`, no `information`, no `scoreResponse`. What it still holds is
`bankSessions`, a `Map`, which is 3.2 and not this task.

**Task 3.2 — Decide where session state lives.** Either the caller holds it and passes it back (signed
so it cannot be tampered with — a client that can edit its own posterior can hand itself any score), or
DynamoDB keyed by session id. Caller-held is simpler and fits "adoptable into any program"; it needs
the signing to be right.

**RESOLVED 8 Aug 2026 (Felipe): caller-held.** No table. `packages/qbank/src/portable.ts`;
`sealSession` / `openSession` / `resumeFrom`; 16 tests, 257 pass.

**Signed is not enough, and this is the part worth reading.** Signing gives integrity and says nothing
about confidentiality, and here confidentiality is the sharper requirement. The transcript records, for
every item, **whether the child got it right**, along with the running probability that they are above
the threshold. This product refuses to tell a child any of that: every item in the catalogue carries the
comment *"NEUTRAL acknowledgment only — never correct/incorrect"*, `toServed` strips the key before an
item crosses to the frame, and the smoke suite asserts it three times
(`scripts/check-practice.py:130`, `:175`, `:244`). A signed-but-readable token in the client's own hands
would defeat all three at once — not by leaking the answer key, but by reporting the outcome, which is
the thing the key was being protected to avoid.

So the state is **sealed with AES-256-GCM**, which authenticates and conceals with one primitive. There
is no version of this system that wants integrity without secrecy, so there is no reason to offer a
signing-only mode. A test asserts no segment of a token decodes to `correct`, `pAbove`,
`abilityThreshold`, a domain name or a selection reason.

**The token holds the transcript and no posterior.** 3.1 established that `posteriorsFrom(history, pool)`
reproduces belief from the transcript bit for bit, so shipping the five densities as well would be a
second copy of one fact — and two copies of a fact are how they come to disagree. It also saves 17.5 KB.

**Three more decisions inside the decision, each with a reason:**

- **The config is sealed inside the token, not passed beside it.** If the caller supplied the threshold on
  every request, a client could begin a session against one bar and finish against an easier one, and
  nothing in the engine would notice.
- **`issuedAt` and a maximum age** (24h default). A sealed token is a bearer credential; whoever holds it
  holds that session, so the window in which a leaked one is worth anything should be bounded.
- **Every failure is a refusal, never a repair,** and the error does not say which check failed.
  Distinguishing a bad key from a bad tag tells an attacker which half to keep working on.

**Sizes, measured. This constrains 3.4.**

| Session | Items | Sealed token |
|---|---|---|
| Standard | 8 | 4,556 B |
| Thorough | 20 | 10,658 B |

A 10.6 KB token **does not fit in a cookie** (4 KB) and exceeds the default header limit of most proxies.
**The token belongs in the request body**, and the wire contract has to say so rather than leave a client
to discover it behind a 431. A full 40-item Thorough session lands near 20 KB.

**One fork left open deliberately.** The engine needs only `{itemId, domain, correct}` per attempt —
`typeCode` and `difficulty` are recoverable from the pool, and `selectionReason`, `pAboveBefore`,
`pAboveAfter`, `rawResponse` and `latencyMs` are audit and telemetry rather than evidence. Dropping them
would take a Thorough token from about 10.6 KB to roughly 1.5 KB. It would also throw away the audit
trail, and *"every item records why the engine chose it"* is a smoke assertion and the sort of thing that
matters when someone asks why a child saw what they saw. It would additionally discard exactly the
latency data 1b.5 wants to start collecting. So the full transcript stays for now; if token size becomes
the binding constraint, the honest fix is to keep the audit trail server-side rather than to stop
recording it.

**Two limitations of caller-held state that no amount of crypto removes**, and 3.5 should decide whether
the product cares:

1. **A token can be replayed.** Nothing stops a client presenting an earlier token to retry an item it got
   wrong; it would simply resume from the shorter transcript. Preventing that needs server-side memory of
   what has been spent, which is the thing caller-held state was chosen to avoid. For a screener whose
   output is a recommendation and whose stated posture is deliberately generous, retrying is a much
   smaller problem than it would be for an exam — but it is a property of the decision, not an oversight.
2. **Resuming against a different pool silently changes the evidence.** An answered item missing from the
   pool would contribute nothing to the replay, so a caller that narrows its `types` filter mid-session
   would quietly discard responses. `resumeFrom` refuses that case loudly instead of replaying a
   truncated history, and the contract should state that the pool must not narrow.

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
