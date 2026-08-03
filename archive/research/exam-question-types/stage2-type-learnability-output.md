 WARN  Unsupported engine: wanted: {"node":"24.x"} (current: {"node":"v25.9.0","pnpm":"10.34.5"})

> gt-selection-capstone@0.0.0 stage2:learnability /Users/atakle/Desktop/Intership Files/Alpha AI Engineering 2026/gt-worktrees/stage2-learnability-oracles
> tsx research/exam-question-types/stage2-type-learnability-report.mjs

# Stage 2 cumulative learnability — 4 types

30 scored trials, 8 seeds x standings 5/8/11/13/15/17/19, both arms, two responders: 896 blocks.
Real administration path: `nextTargetTheta` (@gt-selection/exam-scoring) chooses the target and
`selectNextNovelServedItem` (@gt-selection/exam-engine) chooses the item, both unmodified.

One shared oracle (`stage2-learnability-core.mjs`) with one adapter per type. The candidate space
is every symbol->meaning bijection, intersected down the trial sequence; a primitive is DEDUCIBLE
once every surviving bijection agrees about it, including by elimination.

| type | hidden system | candidate systems | items/arm | options | warm-up |
| --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 6 badges -> 6 lattice operators | 720 | 234 | 5 | 3 unscored |
| `SPA-XFORM-01` | 6 badges -> 6 lattice operators | 720 | 234 | 5 | none |
| `QUANT-GLYPHNUM-01` | 5 glyphs -> 5 numeral roles | 120 | 468 | 5 | none |
| `VER-MORPHO-01` | 6 affix forms -> 6 morpheme meanings | 720 | 468 | 4 | none |

**Warm-up.** `FLU-OPCHAIN-01` opens with three unscored worked demonstrations because that count
was measured for it. No equivalent decision has been taken for the other three, so they run with
none, and §7 sizes what one would buy them. Choosing one here would be inventing product design
inside a measurement.

**One caveat about `QUANT-GLYPHNUM-01`, stated once and applying to every table below.** Its
child-facing response is a CONTINUOUS placement on a number line scored within a tolerance, not a
choice among five things. The five "options" are the tick slate the bank itself declares and the
slate its own anti-leak analysis is written against (`viableOptions` in the generator), so using
them keeps this report in the type’s own frame — but a viable-option count for this type is a
count over that declared slate, not over anything the child can physically do. Its answerability
and deducibility columns are unaffected: those are about the mapping, not the response widget.

## 0. Validation — the shared core against `FLU-OPCHAIN-01`

The reference type already has a hand-written oracle. It is run here through the SHARED core as
a fourth adapter, at its own warm-up setting, so the three new oracles are not merely plausible
implementations of an idea — they are the reference oracle with the type factored out. What the
reference reported, and what this reproduces:

| claim from the reference report | reproduced here |
| --- | --- |
| at standings 17 and 19 only about HALF the vocabulary is ever uniquely pinned | **50%** ever pinned |
| 95-100% of trials stay answerable even so | **100%** at standings 17/19, 98% over all standings |
| the warm-up gives away one badge of six | **1.00/6** pinned before trial 1 |
| three demonstrations drive 2+ introductions to zero at every standing | **0.00** |
| the oracle determines the answer on about 97% of trials, so the ruled-out signal is nearly redundant | **98.1%** determined; **1.9%** of trials have 2-3 viable |
| the reasoning responder lifts -0.67 while the guesser sits at chance | **-0.732** against **+0.003** |
| a separation of 3.6 block SDs against a block-to-block SD of 0.18 | **8.58** SDs against **0.09** — does NOT reproduce; see below |

**The one figure that does not reproduce, and why it is the expected one to miss.** Everything
structural matches. The separation does not: the reference measured a responder that landed on a
ruled-out option 3.8 times per block and this one lands there 1.9 times, so the same lift sits on
half the variance and the ratio doubles. That quantity is the RESPONDER’S ERROR RATE, which is
the most bank-sensitive number in the report — the reference ran against the bank
`stage2:review:build` assembles on the review-window branch, and this runs against
`banks/FLU-OPCHAIN-01.jsonl` as it stands on `dev`. Nothing about the oracle differs: the lift
itself, the guesser’s position at chance, and the scrambled arm’s separation (1.27 here
against a reported 1.4) all land where the reference put them. The separation figure should be
read as bank-dependent wherever it appears, including in the three tables below.

The half-pinned / fully-answerable combination is the structural fact the reference names and
every type below is read against: **a composition can be determined without its factorisation
being determined.** Once enough compositions are known, every trial is answerable while several
individual primitives remain formally open — so "vocabulary not pinned" is not "child could not
have answered", and the two must never be collapsed.

## 1. When the system became knowable

`ever pinned` is the share of the vocabulary that was uniquely determined at ANY point in the
block. `all by` is the trial at which the LAST primitive was pinned, over the blocks where all of
them were. `answerable` is the share of trials whose key was determined by prior reveals, with
the per-third columns computed within each third. `ramp` is the leading run of trials no reasoner
could have answered — inherent, not a defect. `2+ intro` counts trials introducing two primitives
at once, which no single reveal can attribute: that IS the avoidable defect and it must be zero.
`available acc` is what a perfect reasoner scores; `actual acc` is what the model learner scored.

Consistent arm only. In the scrambled control the generator redraws the system every trial, so
nothing is ever determined from prior reveals and every one of these columns is zero by
construction — that is what makes it a control, and it is asserted in the test suite.

| type | standing | ever pinned | all by | answerable | 1st third | last third | ramp | 2+ intro | knowable 1st/mid/last | available acc | actual acc |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 5 | 100% | 5.00 (8/8) | 97% | 90% | 100% | 0.63 | 0 | 72% / 100% / 100% | 98% | 97% |
| `FLU-OPCHAIN-01` | 8 | 100% | 2.00 (8/8) | 97% | 90% | 100% | 0.00 | 0 | 83% / 100% / 100% | 98% | 96% |
| `FLU-OPCHAIN-01` | 11 | 100% | 1.00 (8/8) | 97% | 90% | 100% | 1.00 | 0 | 92% / 100% / 100% | 98% | 97% |
| `FLU-OPCHAIN-01` | 13 | 100% | 6.13 (8/8) | 100% | 100% | 100% | 0.00 | 0 | 75% / 100% / 100% | 100% | 100% |
| `FLU-OPCHAIN-01` | 15 | 100% | 1.75 (8/8) | 97% | 90% | 100% | 0.25 | 0 | 85% / 100% / 100% | 98% | 96% |
| `FLU-OPCHAIN-01` | 17 | 50% | never | 100% | 100% | 100% | 0.00 | 0 | 45% / 50% / 50% | 100% | 81% |
| `FLU-OPCHAIN-01` | 19 | 50% | never | 100% | 100% | 100% | 0.00 | 0 | 47% / 50% / 50% | 100% | 80% |
| `SPA-XFORM-01` | 5 | 100% | 7.25 (8/8) | 86% | 57% | 100% | 3.38 | **0.38** | 55% / 100% / 100% | 91% | 89% |
| `SPA-XFORM-01` | 8 | 100% | 4.00 (8/8) | 90% | 70% | 100% | 3.00 | **1.00** | 66% / 100% / 100% | 94% | 91% |
| `SPA-XFORM-01` | 11 | 100% | 5.13 (8/8) | 91% | 74% | 100% | 2.00 | **1.88** | 69% / 100% / 100% | 94% | 90% |
| `SPA-XFORM-01` | 13 | 100% | 7.63 (8/8) | 90% | 73% | 100% | 2.00 | **1.88** | 59% / 99% / 100% | 94% | 91% |
| `SPA-XFORM-01` | 15 | 100% | 4.25 (8/8) | 94% | 81% | 100% | 1.75 | **1.88** | 71% / 100% / 100% | 96% | 94% |
| `SPA-XFORM-01` | 17 | 100% | 4.88 (8/8) | 92% | 75% | 100% | 1.00 | **1.00** | 65% / 100% / 100% | 95% | 93% |
| `SPA-XFORM-01` | 19 | 100% | 4.00 (8/8) | 93% | 80% | 100% | 1.00 | **1.00** | 70% / 100% / 100% | 96% | 94% |
| `QUANT-GLYPHNUM-01` | 5 | 100% | 2.25 (8/8) | 96% | 88% | 100% | 1.13 | **1.50** | 82% / 100% / 100% | 97% | 96% |
| `QUANT-GLYPHNUM-01` | 8 | 100% | 2.38 (8/8) | 96% | 88% | 100% | 1.25 | **1.13** | 82% / 100% / 100% | 97% | 96% |
| `QUANT-GLYPHNUM-01` | 11 | 100% | 2.00 (8/8) | 97% | 90% | 100% | 1.00 | **1.00** | 80% / 100% / 100% | 97% | 97% |
| `QUANT-GLYPHNUM-01` | 13 | 100% | 1.00 (8/8) | 97% | 90% | 100% | 1.00 | **1.00** | 90% / 100% / 100% | 97% | 97% |
| `QUANT-GLYPHNUM-01` | 15 | 100% | 1.75 (8/8) | 97% | 90% | 100% | 1.00 | **1.00** | 86% / 100% / 100% | 98% | 98% |
| `QUANT-GLYPHNUM-01` | 17 | 100% | 1.63 (8/8) | 95% | 85% | 100% | 1.50 | **1.50** | 86% / 100% / 100% | 97% | 95% |
| `QUANT-GLYPHNUM-01` | 19 | 100% | 1.00 (8/8) | 97% | 90% | 100% | 1.00 | **1.00** | 90% / 100% / 100% | 97% | 97% |
| `VER-MORPHO-01` | 5 | 100% | 4.00 (8/8) | 87% | 60% | 100% | 4.00 | **1.00** | 70% / 100% / 100% | 92% | 92% |
| `VER-MORPHO-01` | 8 | 100% | 3.50 (8/8) | 94% | 81% | 100% | 1.63 | **2.00** | 69% / 100% / 100% | 96% | 93% |
| `VER-MORPHO-01` | 11 | 100% | 4.00 (8/8) | 93% | 80% | 100% | 2.00 | **1.63** | 72% / 100% / 100% | 95% | 95% |
| `VER-MORPHO-01` | 13 | 100% | 3.00 (8/8) | 93% | 80% | 100% | 2.00 | **2.00** | 73% / 100% / 100% | 95% | 94% |
| `VER-MORPHO-01` | 15 | 100% | 3.38 (8/8) | 89% | 66% | 100% | 3.38 | **1.38** | 72% / 100% / 100% | 93% | 92% |
| `VER-MORPHO-01` | 17 | 50% | never | 95% | 84% | 100% | 1.63 | **1.38** | 35% / 50% / 50% | 96% | 51% |
| `VER-MORPHO-01` | 19 | 50% | never | 87% | 60% | 100% | 4.00 | **1.00** | 33% / 50% / 50% | 92% | 49% |

## 2. First-deducible trial, per primitive

Every (block, primitive) pair in the consistent arm, pooled over standings and seeds. `never` is
the share never uniquely pinned in 30 trials — which is NOT the same as never usable: a
composition can be determined without its factorisation being, so a block can answer every trial
while leaving half its vocabulary formally open. That gap is the finding, not an error.
`by warm-up` counts primitives already pinned before trial 1.

| type | pairs | never pinned | by warm-up | median trial | p25 / p75 | mean trial | pinned by trial 5 / 10 / 20 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 336 | **14%** | 17% | 1 | 1 / 2 | 1.69 | 82% / 86% / 86% |
| `SPA-XFORM-01` | 336 | **0%** | 0% | 3 | 2 / 4 | 3.53 | 85% / 98% / 100% |
| `QUANT-GLYPHNUM-01` | 280 | **0%** | 0% | 1 | 1 / 2 | 1.50 | 100% / 100% / 100% |
| `VER-MORPHO-01` | 336 | **14%** | 0% | 3 | 2 / 4 | 2.92 | 86% / 86% / 86% |

And the same by standing, with the RESIDUE — how many candidate systems were still standing
after the last reveal. The residue is what the block could not separate, and its size says what
kind of residue it is. One means the vocabulary was fully pinned. Three over six primitives is a
three-cycle: three symbols that only ever appeared in compositions with each other, so every
composition is determined and no individual member is. That is the whole of the half-pinned /
fully-answerable result, and it is a property of which items the targeting rule reaches at that
standing rather than of the child.

| type | standing 5 | standing 8 | standing 11 | standing 13 | standing 15 | standing 17 | standing 19 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` ever pinned | 100% | 100% | 100% | 100% | 100% | 50% | 50% |
| `FLU-OPCHAIN-01` systems left | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 3.00 | 3.00 |
| `SPA-XFORM-01` ever pinned | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| `SPA-XFORM-01` systems left | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| `QUANT-GLYPHNUM-01` ever pinned | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| `QUANT-GLYPHNUM-01` systems left | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| `VER-MORPHO-01` ever pinned | 100% | 100% | 100% | 100% | 100% | 50% | 50% |
| `VER-MORPHO-01` systems left | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 3.00 | 3.00 |

And WHAT the residue is made of, because there are two reasons for one and they call for
opposite responses. If every unpinned primitive appeared in EVERY served item, the block never
served anything containing a proper subset of them and nothing could have separated the members:
a coverage property of the sequence, and selection could fix it. If they were seen apart and
still could not be told apart, that is a degeneracy in the VOCABULARY, and no amount of serving
different items will help.

| type | blocks with a residue | residue size | members co-occurred in every item | reading |
| --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 16 / 56 | 3.00 | 16 / 16 | **coverage** — selection never separated them |
| `SPA-XFORM-01` | 0 | — | — | fully pinned in every block |
| `QUANT-GLYPHNUM-01` | 0 | — | — | fully pinned in every block |
| `VER-MORPHO-01` | 16 / 56 | 3.00 | 0 / 16 | **vocabulary** — seen apart, still indistinguishable |

## 3. How many options were still viable — the number that decides everything

Per trial, the count of on-screen options that at least one surviving system still predicts.
**1** means the answer was determined and the ruled-out class is just "wrong": the signal is
collinear with correctness and adds nothing. **All options** means nothing has been eliminated
and there is no room to demonstrate inference. The regime where the signal carries something
correctness cannot is the middle — **2 or 3 viable** — and the last column is the only number in
this report that decides whether the signal is worth computing for a given type.


**Consistent (measurement) arm**

| type | 1 viable | 2 viable | 3 viable | 4 viable | 5 viable | mean | **2-3 viable** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 98.1% | 1.8% | 0.1% | 0.0% | 0.0% | 1.02 | **1.9%** |
| `SPA-XFORM-01` | 90.8% | 3.4% | 1.8% | 3.8% | 0.2% | 1.19 | **5.2%** |
| `QUANT-GLYPHNUM-01` | 96.2% | 0.7% | 0.5% | 0.8% | 1.9% | 1.12 | **1.1%** |
| `VER-MORPHO-01` | 91.0% | 3.2% | 1.5% | 4.3% | 0.0% | 1.19 | **4.6%** |

**Scrambled control arm**

| type | 1 viable | 2 viable | 3 viable | 4 viable | 5 viable | mean | **2-3 viable** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 0.0% | 13.9% | 10.8% | 28.2% | 47.1% | 4.09 | **24.7%** |
| `SPA-XFORM-01` | 0.0% | 0.0% | 0.0% | 89.3% | 10.7% | 4.11 | **0.0%** |
| `QUANT-GLYPHNUM-01` | 0.0% | 4.6% | 29.9% | 31.1% | 34.5% | 3.95 | **34.5%** |
| `VER-MORPHO-01` | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | 4.00 | **0.0%** |

**The verdict this table settles.** The ruled-out-versus-consistent split is worth computing for
a type only where the middle band is thick enough to hold trials. In the measurement arm it is
thin everywhere, which is the reference type’s known caution reproduced on three more types
rather than escaped. In the control arm the four types split into two shapes, and the split is a
consequence of how each bank built its distractors: `SPA-XFORM-01` requires three of four
distractors to be relabelling-reachable and `VER-MORPHO-01` requires all of them, so with nothing
revealed almost every option is viable and there is nothing to be wrong about. `FLU-OPCHAIN-01`
and `QUANT-GLYPHNUM-01` leave more unreachable options, so their control arm does have a middle
band. That is an anti-leak invariant showing up as a measurement property — the same choice that
makes a bank hard to attack makes its control arm uninformative about inference.


## 4. The learning gap — what `correct` conflates

The estimator sees only whether the child was right. These columns split its misses into the two
things they can be. `missed while determinable` is learning that had not happened yet — the
quantity a learning rate is supposed to be about. `right while undeterminable` is not learning at
all: the answer was not available, so it was luck or a content shortcut. Model learner, consistent
arm, per 30-trial block.

| type | missed while determinable | right while undeterminable | content-derivable trials | unanswerable trials |
| --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 1.91 | 0.21 | 0.00 | 0.57 |
| `SPA-XFORM-01` | 0.54 | 0.77 | 0.00 | 2.75 |
| `QUANT-GLYPHNUM-01` | 0.04 | 0.11 | 0.00 | 1.14 |
| `VER-MORPHO-01` | 4.02 | 0.93 | 0.00 | 2.70 |

## 5. Ruled out versus consistent — is the signal informative for this type?

Every choice falls in exactly one of three classes: `determined` (the unique answer, taken),
`consistent` (a still-possible option — everything the evidence permitted), `ruled out` (already
excluded). A child who picks an option their own prior reveals had eliminated has failed to use
information they held; one who picked among options still genuinely open has not.

`chance` is what uniform guessing scores on the SAME items, because how many options an item
excludes is a property of the item; `lift` is observed minus chance, so NEGATIVE means the
responder used information. Without the chance column a ruled-out rate would rank banks by how
many unreachable distractors they carry rather than rank children.

| type | responder | arm | determined | consistent | ruled out | of which by reveals | rate | chance | lift |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | guesses | consistent | 5.71 | 0.43 | 23.86 | 19.63 | 80% | 79% | **+0.003** |
| `FLU-OPCHAIN-01` | guesses | perTrial | 0.00 | 26.25 | 3.75 | 0.00 | 13% | 13% | **-0.003** |
| `FLU-OPCHAIN-01` | induces | consistent | 27.52 | 0.55 | 1.93 | 1.93 | 6% | 80% | **-0.732** |
| `FLU-OPCHAIN-01` | induces | perTrial | 0.00 | 27.30 | 2.70 | 0.00 | 9% | 18% | **-0.093** |
| `SPA-XFORM-01` | guesses | consistent | 5.71 | 1.75 | 22.54 | 17.14 | 75% | 76% | **-0.010** |
| `SPA-XFORM-01` | guesses | perTrial | 0.00 | 24.73 | 5.27 | 0.00 | 18% | 18% | **-0.005** |
| `SPA-XFORM-01` | induces | consistent | 26.71 | 2.21 | 1.07 | 1.07 | 4% | 76% | **-0.726** |
| `SPA-XFORM-01` | induces | perTrial | 0.00 | 28.30 | 1.70 | 0.00 | 6% | 18% | **-0.122** |
| `QUANT-GLYPHNUM-01` | guesses | consistent | 5.57 | 0.91 | 23.52 | 17.02 | 78% | 78% | **+0.007** |
| `QUANT-GLYPHNUM-01` | guesses | perTrial | 0.00 | 23.39 | 6.61 | 0.00 | 22% | 21% | **+0.011** |
| `QUANT-GLYPHNUM-01` | induces | consistent | 28.82 | 1.07 | 0.11 | 0.11 | 0% | 78% | **-0.773** |
| `QUANT-GLYPHNUM-01` | induces | perTrial | 0.00 | 24.66 | 5.34 | 0.00 | 18% | 21% | **-0.031** |
| `VER-MORPHO-01` | guesses | consistent | 6.41 | 2.34 | 21.25 | 21.25 | 71% | 70% | **+0.008** |
| `VER-MORPHO-01` | guesses | perTrial | 0.00 | 30.00 | 0.00 | 0.00 | 0% | 0% | **+0.000** |
| `VER-MORPHO-01` | induces | consistent | 23.29 | 2.46 | 4.25 | 4.25 | 14% | 70% | **-0.560** |
| `VER-MORPHO-01` | induces | perTrial | 0.00 | 30.00 | 0.00 | 0.00 | 0% | 0% | **+0.000** |

### Is it stable enough to score on?

SEPARATION is whether a block-level lift tells the two responders apart at all: the guesser lands
on excluded options exactly at chance by construction, so any responder that reliably beats it is
using evidence. SPREAD is whether one responder’s lift holds still across seeds and standings — a
signal whose block-to-block SD swamps the separation cannot score an individual child however
clean the group means look. The last column is the units the owner asked for: block SDs.

| type | arm | guesser lift | responder lift | separation | responder SD | **separation / SD** |
| --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | consistent | +0.003 | -0.732 | -0.735 | 0.09 | **8.58** |
| `FLU-OPCHAIN-01` | perTrial | -0.003 | -0.093 | -0.090 | 0.07 | **1.27** |
| `SPA-XFORM-01` | consistent | -0.010 | -0.726 | -0.717 | 0.03 | **20.74** |
| `SPA-XFORM-01` | perTrial | -0.005 | -0.122 | -0.117 | 0.04 | **2.81** |
| `QUANT-GLYPHNUM-01` | consistent | +0.007 | -0.773 | -0.780 | 0.01 | **65.29** |
| `QUANT-GLYPHNUM-01` | perTrial | +0.011 | -0.031 | -0.042 | 0.08 | **0.55** |
| `VER-MORPHO-01` | consistent | +0.008 | -0.560 | -0.569 | 0.20 | **2.79** |
| `VER-MORPHO-01` | perTrial | +0.000 | +0.000 | +0.000 | 0.00 | — |

## 6. Where the determination actually comes from

§3 says the answer is determined on almost every trial, which is the finding that kills the
ruled-out signal. This says WHY, because the cause decides whether anything could be done about
it. The oracle is re-run with one thing changed: a reveal is read as naming only WHICH OPTION was
right, instead of showing WHAT THE SYSTEM PRODUCED. A hypothesis predicting something off the
slate entirely then survives, where under the full reading it is refuted.

That weaker reading is COUNTERFACTUAL, not a rendering option: for all four types the key IS the
produced outcome, so highlighting the right option necessarily shows the output figure, the
denoted picture, or the true position on the line. There is no renderer that shows less. It is
run precisely because it is counterfactual — the gap between the columns is the share of the
oracle’s certainty that comes from off-slate refutation, and it is nearly all of it. Every
trial silently eliminates the hundreds of systems that would have produced something not on
screen, and THAT, not the number of options, is what leaves one survivor.

The consequence is a design one. Serving partially-determined trials cannot be achieved by
trimming distractors; it needs either a reveal that does not display the outcome, or a selection
rule that targets how determined the answer is rather than how difficult the item is. Both change
what the block selects on, so both are decisions for the owner and neither is taken here.
The responder is held fixed across the two columns, so they differ only in the oracle’s reading.

| type | answerable: outcome shown | option named only | ever pinned: outcome shown | option named only | 2-3 viable: outcome shown | option named only |
| --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 98% | 46% | 86% | 0% | 1.9% | 44.3% |
| `SPA-XFORM-01` | 91% | 29% | 100% | 13% | 5.2% | 44.2% |
| `QUANT-GLYPHNUM-01` | 96% | 41% | 100% | 0% | 1.1% | 44.7% |
| `VER-MORPHO-01` | 91% | 30% | 86% | 65% | 4.6% | 34.5% |

## 7. What an unscored warm-up would buy the three new types

Reported, not taken. `FLU-OPCHAIN-01` runs three unscored worked demonstrations chosen so their
hidden chains are disjoint; the same chooser is applied to the other three here purely to size
the effect. `2+ intro` is the avoidable defect the warm-up exists to remove — a trial turning on
two primitives neither of which has ever been shown, which no single reveal can attribute.

| type | warm-up items available | 2+ intro (none) | 2+ intro (3) | ramp (none) | ramp (3) | answerable (none) | answerable (3) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SPA-XFORM-01` | 3.00 | 1.29 | 0.00 | 2.02 | 0.84 | 91% | 96% |
| `QUANT-GLYPHNUM-01` | 2.00 | 1.16 | 0.00 | 1.13 | 0.00 | 96% | 100% |
| `VER-MORPHO-01` | 2.00 | 1.48 | 0.88 | 2.66 | 0.95 | 91% | 96% |

## What this does and does not license

The oracle is a perfect reasoner with perfect memory. Every "answerable" above is an upper bound
on what was AVAILABLE, never a prediction that a child would get it — so a gap between
`available acc` and `actual acc` is the model learner failing to exploit what it had, which for a
child would be the thing worth measuring and for this responder is largely a tie-breaking
artefact.

Nothing here is a learning rate, and nothing here is evidence that any of these four types
measures learning: that is Gate B, it needs real children, and it has not run. Every bank is
born-synthetic and ungated, three of the four types have no renderer, and the whole grid is a
simulation over design rungs.
