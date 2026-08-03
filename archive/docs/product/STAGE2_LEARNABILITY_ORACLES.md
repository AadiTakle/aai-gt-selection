# Cumulative learnability oracles for the three new Stage 2 types

**Status:** Measurement instrument plus its first reading, for `SPA-XFORM-01`,
`QUANT-GLYPHNUM-01` and `VER-MORPHO-01`. Not a gate, not a wiring change, and not evidence that any
of these types measures learning. Every figure below is a simulation over born-synthetic, ungated
banks whose `difficulty` values are design rungs.

**What was built:** one shared cumulative-learnability oracle
(`research/exam-question-types/stage2-learnability-core.mjs`) with four adapters, a type-agnostic
block loop that drives it down the product's real administration path, a report, and a test suite.
`FLU-OPCHAIN-01` is carried as a fourth adapter so the shared core can be validated against the
oracle it was factored out of.

**Not built, and out of scope:** any change to the three types' generators, banks, checkers or Gate A
reports; any renderer; any wiring into the live learning block; any change to
`packages/exam-scoring`. Nothing here alters what is served to a child.

**Requirements served:** R6 (measure growth without a gifted-student ceiling — this is what tells a
slow learner apart from an unanswerable question), R7 (auditable and falsifiable — every figure below
is one command), R10 (state the boundaries of every conclusion), H1, H6.

**Evidence used:** E-095 (the recovery ladder the block length is set against), E-200 (the estimator
manufactures a rate from chance successes, which is why answerability has to be separable from
correctness), E-075/E-076 (content-computable items — re-checked here through the shared oracle).
**No new E or D ID is claimed.** The three types' governance unit is still ahead of them and minting
IDs from a measurement their owner has not read would pre-empt it.

**Re-run everything here with:**

```
pnpm stage2:learnability                             # the full grid, ~5s, deterministic
pnpm --filter @gt-selection/web test                 # includes the oracle's 61 assertions
```

Its raw output is committed at `research/exam-question-types/stage2-type-learnability-output.md`, so
every table below can be checked without running anything.

---

## 1. The answer

**One shared abstraction worked, for all four types including the reference.** The oracle is one
type-free module; each adapter is 40–75 lines, most of it comment, and contains no learnability logic
at all. Three of the four types needed nothing beyond the contract. The fourth, `VER-MORPHO-01`,
forced one widening of it, described in §3.

**The three headline distributions, consistent (measurement) arm, 8 seeds × 7 standings × 30 trials:**

| | `FLU-OPCHAIN-01` (reference) | `SPA-XFORM-01` | `QUANT-GLYPHNUM-01` | `VER-MORPHO-01` |
| --- | --- | --- | --- | --- |
| primitives | 6 badges | 6 badges | 5 glyphs | 6 affix forms |
| candidate systems | 720 | 720 | 120 | 720 |
| **trials answerable from prior reveals** | **98%** | **91%** | **96%** | **91%** |
| median first-deducible trial | 1 | 3 | 1 | 3 |
| primitives never pinned in 30 trials | 14% | 0% | 0% | 14% |
| **trials with 2–3 options still viable** | **1.9%** | **5.2%** | **1.1%** | **4.6%** |

**The ruled-out signal is not informative for any of the four in the measurement arm**, and the
reason is the same one the reference type already recorded: the oracle determines the answer on
91–98% of trials, so "picked a ruled-out option" is almost exactly "wrong". The middle band the
signal needs holds 1–5% of trials. `SPA-XFORM-01` and `VER-MORPHO-01` are the least bad of the four —
roughly two and a half times the reference type's band — and two and a half times almost nothing is
still almost nothing.

**In the scrambled control arm the four types split into two shapes, and the split is caused by an
anti-leak invariant.** `FLU-OPCHAIN-01` and `QUANT-GLYPHNUM-01` hold a usable middle band there
(24.7% and 34.5% of trials); `SPA-XFORM-01` and `VER-MORPHO-01` hold none (0.0%). The cause is how
each bank chose distractors: `SPA-XFORM-01` requires three of four distractors to be
relabelling-reachable and `VER-MORPHO-01` requires all three of its, so with nothing revealed every
option is viable and there is nothing for a child to be wrong about. The same choice that makes a
bank hard to attack makes its control arm silent about inference.

## 2. What the oracles are, and what they replace

Each type already brute-forced its mapping space to prove the key is not recoverable from `content`:
120 glyph-to-role assignments for the quantitative type, the relabelling space for the spatial and
verbal ones. Those enumerators answer *given this one item, which mappings survive?* The oracle
answers *given every reveal so far, which mappings survive?* — the same enumeration, intersected down
the trial sequence, discarding what each observation eliminates. A primitive is **deducible** once
every surviving mapping agrees about it.

Two things depend on it and neither works without it.

**Telling "hasn't learned it" apart from "wasn't learnable yet."** A wrong answer on a trial where
nothing determined the answer is not a failure to learn — it is an unanswerable question, and
`estimateLearningCurve` scores the two identically. Per 30-trial block, model learner, consistent arm:

| | `FLU-OPCHAIN-01` | `SPA-XFORM-01` | `QUANT-GLYPHNUM-01` | `VER-MORPHO-01` |
| --- | --- | --- | --- | --- |
| missed while determinable (real learning gap) | 1.91 | 0.54 | 0.04 | 4.02 |
| right while undeterminable (luck) | 0.21 | 0.77 | 0.11 | 0.93 |
| unanswerable trials | 0.57 | 2.75 | 1.14 | 2.70 |

The two right-hand columns are what correctness currently mislabels. On `SPA-XFORM-01` they are
larger than the genuine gap.

**The ruled-out versus consistent split.** At each trial the oracle reports which options remain
consistent with the evidence, so a choice falls into exactly one of *determined*, *consistent* and
*ruled out*. §5 reports what that is worth.

## 3. One abstraction, four adapters — where it fit and where it strained

Every one of the four types hides the same kind of thing: a bijection from visible symbols to
invisible meanings, with each item constraining the symbols it happens to show. The adapter contract
is six members, none of them about learnability: the primitives, the values, which primitives an item
constrains, what an assignment predicts, the reveal, and the hidden chain (used only by the warm-up
chooser). The intersect-across-trials logic, the determination test, the choice classification, the
content-derivability check, the per-block summary and the two responders are all shared.

**Where it strained, once.** `VER-MORPHO-01` runs in two directions. In `wordToPicture` a mapping
decodes the word into exactly one picture and so predicts one option, like the two figure types. In
`pictureToWord` the options are *words*, a mapping must decode all four and report which land on the
target picture, and a **wrong** mapping can make two of them land there at once. So a mapping
predicts a *set*. The contract is therefore `predictedKeys(item, assignment) → string[]` rather than
a single key. Written the obvious way — assume one prediction, take the first — the oracle would have
silently eliminated live mappings and reported trials as deducible when they were not.

**Two structural differences worth stating, because they change what the numbers mean.**

`QUANT-GLYPHNUM-01`'s reveal is a point on a continuum, not a transformed stimulus. Its anchor
expression is part of every item, so a single trial constrains two to five of the five glyphs at once
(three or four on 87% of items), and the ratio is a fine-grained observable. **One reveal alone leaves
a median of two surviving mappings out of 120, and pins the entire notation outright on 31% of
items.** Its median first-deducible trial is 1. A type whose vocabulary is available after one or two
demonstrations produces a step, not a ramp — the failure mode §1.3 of the design exists to avoid, and
a stronger version of the warning its Gate A report already issued.

Its child-facing response is also a continuous placement scored within a tolerance, not a choice among
five things. The five "options" used throughout are the tick slate the bank itself declares and the
slate its own anti-leak analysis is written against, so a viable-option count for this type is a count
over that declared slate. Its answerability and deducibility figures are unaffected — those are about
the mapping, not the response widget.

## 4. Deducibility and answerability, per type

**First-deducible trial.** Every (block, primitive) pair, consistent arm, pooled over standings and
seeds:

| type | pairs | never pinned | median trial | p25 / p75 | pinned by trial 5 / 10 / 20 |
| --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 336 | 14% | 1 | 1 / 2 | 82% / 86% / 86% |
| `SPA-XFORM-01` | 336 | 0% | 3 | 2 / 4 | 85% / 98% / 100% |
| `QUANT-GLYPHNUM-01` | 280 | 0% | 1 | 1 / 2 | 100% / 100% / 100% |
| `VER-MORPHO-01` | 336 | 14% | 3 | 2 / 4 | 86% / 86% / 86% |

**Never pinned is not never usable.** The reference type's known result — at standings 17 and 19 only
half its vocabulary is ever uniquely pinned while 95–100% of trials stay answerable — reproduces
exactly, and `VER-MORPHO-01` behaves the same way at the same standings. The residue explains it: at
those standings both types end the block with **exactly three candidate systems standing** in every
one of the sixteen affected blocks. Three survivors over six primitives is a three-cycle: every
composition is determined and no individual member is. So a block can answer every trial while half
its vocabulary is formally open, and "vocabulary not pinned" must never be read as "the child could
not have answered".

**But the two residues have different causes, and the causes need opposite responses.** The oracle
reports which primitives were never pinned and whether they appeared in every served item:

| type | blocks with a residue | residue size | members appeared in every served item | reading |
| --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 16 / 56 | 3 | 16 / 16 | **coverage** |
| `SPA-XFORM-01` | 0 / 56 | — | — | fully pinned every block |
| `QUANT-GLYPHNUM-01` | 0 / 56 | — | — | fully pinned every block |
| `VER-MORPHO-01` | 16 / 56 | 3 | 0 / 16 | **vocabulary** |

For the reference type it is **coverage**: at standings 17 and 19 the targeting rule reaches only
three distinct badge-sets across thirty trials and three badges appear in all of them, so no served
item ever contains a proper subset of the three and nothing could separate them. A selection rule that
sometimes served an item outside that band would fix it.

For `VER-MORPHO-01` it is **vocabulary**, and selection cannot fix it. Its three unpinned affixes are
seen apart and still cannot be told apart, and in all sixteen blocks they are **exactly the three
number meanings** — `plural`, `dual`, `paucal`. Those are the three transpositions of the same
three-element count group, so they are mutually indistinguishable unless the running count happens to
visit the values that separate them, and the high-difficulty items do not make it. This is a property
of the meaning inventory the type chose, not of its bank, and it is the sharpest difference from the
reference type this exercise found.

`SPA-XFORM-01` and `QUANT-GLYPHNUM-01` never leave a residue at all: both end every block at one
surviving system at every standing. For `QUANT-GLYPHNUM-01` that is the anchor dragging most of the
vocabulary into every trial.

The cost of full pinning appears in the opening trials instead. Without a warm-up, `SPA-XFORM-01` and
`VER-MORPHO-01` open with a 2.0–2.7 trial ramp of unanswerable trials and 1.3–1.5 trials that
introduce two never-seen primitives at once. That second number is the avoidable defect: no single
reveal can attribute a change between two symbols neither of which has ever been shown, so such a
trial costs a trial and buys nothing.

**What a warm-up would buy them, reported and not taken.** Applying the reference type's own chooser
(the easiest items whose hidden chains are disjoint) with no other change:

| type | warm-up items found | 2+ introductions: none → 3 | unanswerable ramp: none → 3 | answerable: none → 3 |
| --- | --- | --- | --- | --- |
| `SPA-XFORM-01` | 3 | 1.29 → **0.00** | 2.02 → 0.84 | 91% → 96% |
| `QUANT-GLYPHNUM-01` | 2 | 1.16 → **0.00** | 1.13 → 0.00 | 96% → 100% |
| `VER-MORPHO-01` | 2 | 1.48 → **0.88** | 2.66 → 0.95 | 91% → 96% |

Three demonstrations remove the avoidable defect outright on two of the three. `VER-MORPHO-01` cannot
find three disjoint-chain items in its bank and so cannot reach zero this way. Choosing a warm-up is a
product decision none of these three types has taken, and taking one inside a measurement would be
inventing design; this sizes it so the decision can be made on a number.

## 5. Is the ruled-out signal worth anything, per type?

Per-trial count of options at least one surviving system still predicts. Consistent arm:

| type | 1 viable | 2 viable | 3 viable | 4 viable | 5 viable | **2–3 viable** |
| --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 98.1% | 1.8% | 0.1% | 0.0% | 0.0% | **1.9%** |
| `SPA-XFORM-01` | 90.8% | 3.4% | 1.8% | 3.8% | 0.2% | **5.2%** |
| `QUANT-GLYPHNUM-01` | 96.2% | 0.7% | 0.5% | 0.8% | 1.9% | **1.1%** |
| `VER-MORPHO-01` | 91.0% | 3.2% | 1.5% | 4.3% | 0.0% | **4.6%** |

Scrambled control arm:

| type | 1 viable | 2 viable | 3 viable | 4 viable | 5 viable | **2–3 viable** |
| --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 0.0% | 13.9% | 10.8% | 28.2% | 47.1% | **24.7%** |
| `SPA-XFORM-01` | 0.0% | 0.0% | 0.0% | 89.3% | 10.7% | **0.0%** |
| `QUANT-GLYPHNUM-01` | 0.0% | 4.6% | 29.9% | 31.1% | 34.5% | **34.5%** |
| `VER-MORPHO-01` | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | **0.0%** |

**The block-SD separations are large and should not be believed as evidence the signal is useful.**
In the consistent arm the reasoning responder beats the guesser by 8.6 (reference), 20.7
(`SPA-XFORM-01`), 65.3 (`QUANT-GLYPHNUM-01`) and 2.8 (`VER-MORPHO-01`) block SDs. Those numbers are
large *because* the answer is determined on almost every trial: with one viable option, "ruled out"
is a synonym for "wrong", and the separation is measuring accuracy under another name. The
distribution above is the honest reading and it says the opposite.

**Where a middle band exists, it is in the control arm**, which is where the signal is least useful:
the control exists to measure a contamination floor, and it is exactly the arm in which nothing has
been eliminated by reveals, so `ruled out` there is a property of the item rather than of the child.

## 6. Why the answer is determined so often, and what could change it

The oracle was re-run with one thing changed: a reveal read as naming only *which option* was right
rather than showing *what the system produced*. That reading is counterfactual — for all four types
the key **is** the produced outcome, so highlighting the right option necessarily shows the output
figure, the denoted picture, or the true position on the line, and no renderer shows less. It is run
precisely because it is counterfactual: the gap is the share of the oracle's certainty that comes from
refuting hypotheses whose prediction is *not on screen at all*.

| type | answerable: outcome shown → option named only | 2–3 viable: outcome shown → option named only |
| --- | --- | --- |
| `FLU-OPCHAIN-01` | 98% → 46% | 1.9% → 44.3% |
| `SPA-XFORM-01` | 91% → 29% | 5.2% → 44.2% |
| `QUANT-GLYPHNUM-01` | 96% → 41% | 1.1% → 44.7% |
| `VER-MORPHO-01` | 91% → 30% | 4.6% → 34.5% |

Nearly all of it. Every trial silently eliminates the hundreds of systems that would have produced
something off the slate, and that — not the number of options — is what leaves one survivor.

**The consequence is a design one, and it is not taken here.** A partially-determined regime cannot be
reached by trimming distractors. It needs either a reveal that does not display the outcome, or a
selection rule that targets *how determined* the answer is rather than how difficult the item is. Both
change what the block selects on, so both belong to the owner.

## 7. What this does and does not license

The oracle is a perfect reasoner with perfect memory. Every "answerable" here is an upper bound on
what was **available** to be known, never a prediction that a child would get it. The model learner is
a marginal-memory learner, deliberately weaker than the oracle: it tracks a candidate set per
primitive rather than the joint set of surviving systems, so it cannot do determination by elimination
and sometimes contradicts its own evidence. That is what makes the ruled-out class non-empty for
anything other than a guesser, and it is also why its accuracy is not a prediction about children.

Nothing here is a learning rate. Nothing here is evidence that any of these four types measures
learning — that is Gate B, it needs real children, and it has not run. Three of the four types have no
renderer, all four banks are born-synthetic and ungated, and the whole grid is a simulation over design
rungs.

One figure from the reference report does not reproduce and it is recorded rather than reconciled: the
3.6-block-SD separation is 8.6 here. The lift itself (−0.73 against a guesser at chance), the
guesser's position, and the scrambled arm's separation (1.27 against a reported 1.4) all match; what
differs is how often the model learner lands on a ruled-out option — 1.9 times per block here against
a reported 3.8 — which halves the variance the same lift is divided by. That quantity is the most
bank-sensitive number in the report, and the two runs are against different builds of the same type's
bank. The separation figure should be read as bank-dependent wherever it appears.
