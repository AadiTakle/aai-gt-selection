# Stage 2 — Rotating Multi-System Blocks versus the Single 30-Trial Block

**Status:** Measurement comparison. **Nothing is wired into the live block.** No bank, generator,
checker, renderer, estimator or `packages/exam-scoring` file changes behaviour. No decision is
recorded here; the recommendation awaits owner sign-off.

**Verdict up front.** At a matched budget of 30 scored trials, rotating between several independent
hidden systems is **worth building, conditionally**. It roughly doubles the reliability of the block:
ICC(1,1) **0.35 → 0.54–0.62** and rank recovery **0.48 → 0.67–0.76** across every k from 2 to 6, with
non-overlapping 90% bootstrap bands, against the current design scored by its own per-primitive
latency measure (best setting k = 5: ICC 0.62, rank 0.76). The gain is not "more trials" — the
incumbent row spends the same 30 — and it survives every sensitivity tested. **Three things qualify
it.** First, the entire benefit rests on an assumption a simulation cannot test: that a child's
crack-times covary across independent systems. The correlation reported in §5 was *planted by the
generative model* and is not evidence. Second, the return saturates at two or three systems, because
a 30-trial budget cannot reach more; k = 5 and k = 6 administer only 3.4 systems on average and are
not distinguishable from k = 2. Third, the measure is weak in the upper two-thirds of the ability
range — inside the top tercile it recovers ability at rho 0.18 from one system and 0.32 from three —
though §6 shows this is *not* a top-end floor at system sizes 5 and 6, and is no worse at the top
than in the middle.

**Requirements served:** R5 (a decision-used measure must have a defensible relationship to what it
claims to measure — the whole document is a variance-ratio argument), R6 (measure growth without a
gifted-student ceiling — §6 is the ceiling test and it is the least comfortable section), R7
(auditable and falsifiable — every table is one seeded command), R10 (state the boundaries of every
conclusion — §5 and §8), H1, H6.

**Evidence and assumptions used:** E-095 and E-200 (the recovery ladder and the estimator's
manufactured-rate problem, which is why answerability has to be separable from correctness before any
crack-time means anything), E-075/E-076 (content-derivability, re-checked here through the same
oracle code path that computes answerability), E-211 (PR #42's acquisition-latency measurement, whose
criterion and survival machinery this run imports rather than restates). **No new E or D ID is
claimed.** This is a simulation of a design that has not been approved, and minting an evidence ID
for a planted correlation would be exactly the error §5 warns about. **New assumptions: A-R1 through
A-R6, §8.**

**Re-run everything here with:**

```
pnpm stage2:rotation                                 # the full run, ~35s, deterministic
pnpm --filter @gt-selection/web test                 # includes this simulation's 18 assertions
```

Raw output is committed at `research/exam-question-types/stage2-rotation-output.md`, so every number
below can be checked without running anything.

---

## 1. What was measured, and what it is made of

The proposal: Stage 2 currently runs **one hidden system for 30 trials**. Once a child cracks it,
every later trial is one they will get right, and a predictable trial carries almost no information.
The alternative is **several independent hidden systems, rotating on demonstrated mastery** — each
yielding one observation, trials-to-crack.

Nothing in the simulation re-implements a measurement that already exists:

| piece | source | why it is reused rather than rewritten |
| --- | --- | --- |
| mastery criterion | `createBadgeTest` / `DEFAULT_CRITERION`, PR #42 | A second criterion would make the comparison against PR #42's baseline a comparison of two criteria. |
| cumulative oracle | `stage2-learnability-core.mjs`, PR #48 | Decides which trials were answerable from prior reveals; supplies both the onset clock and the rotation trigger. |
| survival + variance machinery | `kaplanMeier`, `fitRandomInterceptAft`, `varianceComponents`, PR #42 | The rotating block's reliability is computed by the identical estimator that produced the single-block baseline. |
| figure algebra | `generators/FLU-OPCHAIN-01.mjs` | The simulated stimulus is the shipped stimulus, not a cartoon of it. |

What is new is only the **sequence**: an item pool whose hidden mapping can be swapped mid-block, and
a runner that swaps it on mastery.

**Why the items are synthesised rather than read from the bank.** `banks/FLU-OPCHAIN-01.jsonl` holds
one system across all its items; the control bank redraws every trial. Neither is "rotate on
mastery", and producing a bank that was would be a generator change this workstream is not allowed to
make. The pool is therefore built in memory from the generator's own algebra, and the hidden mapping
is a parameter rather than a property of a file. Two consequences are stated rather than buried:

- **The item mix is this file's choice, not the live selection rule's.** The live rule targets
  difficulty against a running ability estimate; the simulation draws chain depths from a fixed
  mixture (15% depth 1, 50% depth 2, 35% depth 3). §8 varies it in both directions.
- **The pool is verified, not assumed.** Every template is checked through the oracle's own
  `contentDerivability` — the E-075/E-076 attack — and dropped if its key is recoverable from content
  with zero reveals. Every slate holds exactly five options at every system size, so the guessing
  floor does not drift across the sizing sweep.

## 2. The rotation rule, and that a guesser does not trigger it

A trial is an **opportunity** only when the cumulative oracle says its answer was already determined
by the reveals the child had seen. On such a trial exactly one option is consistent with holding the
system, so a child who has it answers that option by construction (the criterion is *sound*), and a
guesser hits it with probability q = 1/|options| (the criterion is *calibrated*). Each opportunity is
fed to PR #42's accumulator at its own q; the system is cracked when the log-odds cross log 100.

At a five-option slate a pass is worth log(0.9/0.2) = 1.504 and a miss log(0.1/0.8) = −2.079 against
a bound of 4.605 — so mastery needs **four clean determined trials**, and one miss costs about a
trial and a half of credit back.

**Measured false-alarm rate: 18 of 4,000 guesser blocks = 0.4%**, against Wald's analytic bound of
1%. The guessers were offered **28.2 determined-trial opportunities per block over 29.9 trials** —
the oracle keeps offering them, because its knowledge state is built from the *reveals*, which a
guesser still sees. The low rate is the criterion working, not an absence of chances to fire.

## 3. Where the informative trials actually are

The current design run to its full length — one system, 30 trials, criterion evaluated but not used
to stop. Selected rows from the full per-trial table in the committed output:

| trial | cracked | accuracy | share of block's discriminating signal |
| --- | --- | --- | --- |
| 1 | 0.0% | 44.7% | 0.2% |
| 3 | 0.0% | 58.3% | 6.0% |
| 5 | 2.3% | 69.2% | 7.0% |
| 7 | 25.0% | 82.8% | **8.0%** |
| 8 | 42.7% | 88.0% | 7.4% |
| 12 | 76.3% | 90.8% | 6.0% |
| 20 | 91.3% | 94.8% | 0.6% |
| 30 | 97.0% | 97.2% | 2.2% |

"Discriminating signal" is the squared point-biserial correlation between correctness at that trial
and the planted trait, normalised over the block: the share of the outcome's variance that is about
the child. A trial every child gets right has none, whatever its accuracy.

**The waste, per child. 66.3% of all trials served in a 30-trial single-system block are served after
that child had already demonstrated mastery.** Accuracy on them is 96.6% against 67.2% before. Among
the 97.2% of blocks in which the child cracked the system at all, the median crack is trial 8 and the
mean number of post-mastery trials is **20.5 of 30**. A block that set out to measure acquisition
spends two thirds of its length confirming an acquisition it has already observed. The owner's
observation is reproduced.

**But the tail is not literally empty, and the distinction changes what rotation is for.**
Post-mastery trials carry **18.0%** of the block's discriminating signal, not zero, because children
crack at different times: at trial 20 the block is still separating the 8.7% who have not cracked
from the rest. The honest statement is narrower than "20 wasted trials" — the tail is nearly
uninformative about any child who has *already* cracked, and it degenerates into a slow binary test
of whether a child ever will. **Rotation is worth considering because it replaces that binary with a
graded count, not because the tail contributes nothing.**

## 4. Reliability as a function of system count

Every k aggregates its crack-times through the same log-normal AFT with a child random intercept that
PR #42 used. Between-child variance and within-child error are **measured by replication** — the same
child run over 10 replicate blocks — not estimated from a model.

**No Spearman–Brown projection appears anywhere below.** That formula assumes the k observations are
parallel measures of one trait, which is precisely the assumption under test; applying it would
assume the conclusion. Every value is observed. Bands are 90% percentile bootstraps over children.

**Budget-matched: every arm spends 30 scored trials.**

| arm | systems run | trials spent | ratio | **ICC(1,1)** | ICC 90% | rank recovery | rank 90% |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **current design** — 1 system, per-primitive latency (PR #42's measure) | 1.00 | **30.0** | 0.54 | **0.35** | 0.25–0.42 | 0.48 | — |
| k = 1 — one crack-time only | 1.00 | 10.1 | 0.49 | **0.33** | 0.24–0.38 | 0.50 | 0.41–0.55 |
| k = 2 | 1.95 | 19.7 | 1.28 | **0.56** | 0.46–0.64 | 0.67 | 0.57–0.73 |
| k = 3 | 2.79 | 26.6 | 1.19 | **0.54** | 0.45–0.62 | 0.68 | 0.59–0.74 |
| k = 4 | 3.35 | 29.3 | 1.37 | **0.58** | 0.50–0.63 | 0.74 | 0.67–0.78 |
| k = 5 | 3.42 | **30.0** | 1.65 | **0.62** | 0.53–0.69 | 0.76 | 0.68–0.81 |
| k = 6 | 3.49 | **30.0** | 1.23 | **0.55** | 0.46–0.62 | 0.71 | 0.63–0.77 |

**The incumbent is scored the way the incumbent is actually scored.** The single-system block does not
produce one number: PR #42's measure extracts up to five per-primitive acquisition latencies from the
same 30 trials and aggregates them through this same AFT. That is the first row, and it is what every
k row has to beat. Comparing rotation against a lone crack-time (the second row) would be beating a
strawman — though as it happens the two baselines land in the same place.

**The budget is a ceiling, not a quota, and this is the one place the table can mislead.** A k = 1
block stops at its single crack and so spends only 10 of its 30 trials; k = 5 and k = 6 spend all 30.
The **trial-matched** comparison is therefore the first row against the k = 5 and k = 6 rows — 30
trials each way, ICC 0.35 against 0.62 and 0.55 — and *not* k = 1 against k = 5, which would be
confounded by trial count. k = 3 reaching 0.54 on 26.6 trials is the strongest single result in the
table: it beats the incumbent while spending 11% fewer trials.

**What the table says.** The readable contrast is **k = 1 against k > 1**, not one k against another:
the bootstrap bands for k = 2 through k = 6 all overlap each other, and none of them overlaps the
baseline's 0.25–0.42. Rotation buys +0.19 to +0.27 of ICC and +0.19 to +0.28 of rank recovery at no
extra trials. Which k inside that range is best is not resolvable at this sample size.

**Where the return stops, and why.** "Systems run" never reaches k above about 3.5. A 30-trial budget
divided by a median crack-time of 8–9 leaves room for three systems and part of a fourth, so
requesting six delivers three and a half, and the last one is censored by the budget. **Beyond k = 3
the parameter is not doing anything**; the binding constraint is the budget, not the design.

Without a budget cap — every system running to mastery or its own 30-trial cap — the sweep separates
"rotation helps" from "more trials help":

| k | mean scored trials | **ICC(1,1)** | ICC 90% | rank recovery |
| --- | --- | --- | --- | --- |
| 1 | 10.1 | **0.33** | 0.24–0.38 | 0.50 |
| 2 | 22.0 | **0.61** | 0.51–0.67 | 0.67 |
| 3 | 33.3 | **0.67** | 0.58–0.73 | 0.72 |
| 4 | 43.7 | **0.69** | 0.63–0.74 | 0.79 |
| 5 | 56.2 | **0.79** | 0.73–0.84 | 0.83 |
| 6 | 67.4 | **0.81** | 0.73–0.85 | 0.84 |

Reliability keeps climbing when trials are free. It does not when they are not. The budget-matched
table is the one that answers the owner's question.

## 5. The assumption that decides everything

**Observed:** mean pairwise Pearson r between a child's log crack-times on two different systems =
**0.28** (15 pairs, ~555 children each, range 0.22–0.35). One-way ICC over systems within a block =
**0.31**.

**This number is an artefact of the generative model and is not evidence for the design.** Every
child in this simulation is a single encoding-fidelity parameter that drives every system it sees, so
its crack-times *must* covary. What the 0.28 measures is how much measurement noise the block piles
on top of a correlation that was planted — it is an upper bound on what the instrument could recover
*if* the trait existed, and it says nothing about whether it does. A simulation cannot answer that
question, and no amount of extra simulation will change this.

It is worth being precise about how load-bearing this is: **if real crack-times do not correlate
across systems, every ICC in §4 is wrong and the proposal fails outright.** Aggregating k
uncorrelated observations of k different things does not measure one thing better; it measures
nothing, more precisely.

What would settle it, in order of cost:

1. **Within-session, real children.** Administer two independent systems to the same child in one
   sitting and correlate the two crack-times. A disattenuated correlation near zero kills the
   proposal; above roughly 0.4 supports it. This is the smallest sufficient study and it needs no
   outcome variable, no follow-up and no comparison group.
2. **Order-counterbalanced.** System A first for half the children, B first for the other half.
   Without this, fatigue and warm-up carryover both manufacture positive covariance with no shared
   trait at all.
3. **Discriminant check.** The same two crack-times against an unrelated speeded task. A crack-time
   correlation no larger than the correlation with general processing speed is not evidence for a
   *learning-rate* trait.
4. **Test–retest across days**, the only version that separates a trait from a session state.

Until (1) and (2) have run, every reliability figure in this document should be read as conditional
on an untested assumption.

## 6. Sizing, and whether strong children floor out

`size` is how many primitives the hidden bijection covers. Free-running arm at k = 3, split by
planted-ability tercile:

| size | candidate systems | median crack: low | mid | high | censoring |
| --- | --- | --- | --- | --- | --- |
| 3 | 6 | 9 | 7 | 5 | 1.1% |
| 4 | 24 | 13 | 8 | 7 | 3.8% |
| 5 | 120 | 13 | **9** | 8 | 3.5% |
| 6 | 720 | 14 | **9** | 8 | 5.2% |

**Sizes 5 and 6 put the mid-ability median at 9, inside the 8–12 target band.** Size 4 sits at 8, at
the bottom edge. Size 3 is too easy at 7 and, as below, floors badly.

**Two different failures get called "a floor" and only one is present.** A *hard floor* is the
criterion's own evidence requirement: it needs four clean determined trials and determination cannot
precede the first reveals, so crack-time cannot go below (first determined trial + 4) however able
the child is. *Flattening* is the failure that would sink the design — crack-time no longer tracking
ability among able children, whether or not anyone sits on the floor.

| size | floor observed | high-band median | at floor (±1) | within-band rho, 1 system | within-band rho, mean of 3 | high vs mid AUC |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 4 | 5 | **62.7%** | 0.15 | 0.30 | 0.59 |
| 4 | 5 | 7 | 39.7% | 0.18 | 0.30 | 0.65 |
| 5 | 4 | 8 | **13.3%** | 0.18 | 0.32 | 0.61 |
| 6 | 4 | 8 | **7.0%** | 0.16 | 0.31 | 0.63 |

**There is no hard floor at sizes 5 and 6.** Strong children crack in a median of 8 trials against a
floor of 4, and only 7–13% of their crack-times sit within one trial of it. The "strong children
crack everything in 2–3 trials" failure mode does **not** occur at these sizes. It does occur at size
3, where 63% of top-tercile crack-times are at the floor — which is the argument against shrinking
the system to buy session time.

**But separation at the top is weak, and this needs the right control.** A tercile is a narrow slice
of trait, so a low within-band correlation is partly expected everywhere. The same statistic in all
three bands, at size 5:

| band | median crack | within-band rho, 1 system | within-band rho, mean of 3 | censoring |
| --- | --- | --- | --- | --- |
| low | 13 | 0.35 | 0.52 | 10.5% |
| mid | 9 | 0.13 | 0.21 | 0.0% |
| high | 8 | 0.18 | 0.32 | 0.0% |

**The top band is not specifically worse than the middle — it is slightly better.** The measure is
sharpest at the bottom, where slow children produce long and variable crack-times, and blunt across
the upper two-thirds. That is a different and more general problem than the gifted-student ceiling
that has recurred elsewhere in Stage 2: it is not a ceiling, it is coarseness. Aggregating three
systems roughly doubles the within-band correlation in every band (0.35→0.52, 0.13→0.21, 0.18→0.32),
which is the same effect §4 reports and is the main thing rotation buys.

## 7. Budget and censoring

Free-running arm; `screens` adds the one unscored demonstration each system opens with, because the
session clock pays for those too. At 15 seconds per question:

| k | mean trials | p90 trials | mean minutes | p90 minutes |
| --- | --- | --- | --- | --- |
| 1 | 10.1 | 18.0 | 2.8 | 4.8 |
| 2 | 22.0 | 38.1 | 6.0 | 10.0 |
| 3 | 33.3 | 57.0 | 9.1 | 15.0 |
| 4 | 43.7 | 73.0 | 11.9 | 19.3 |
| 5 | 56.2 | 95.1 | 15.3 | 25.0 |
| 6 | 67.4 | 108.2 | 18.4 | 28.6 |

**The cost falls where the measure is weakest.** A low-ability child censors on every system and pays
the full cap every time: at k = 3, low-band children average 50.5 screens (p90 72) against high-band
27.4 (p90 34). Any free-running design has to price the p90, not the mean, and the p90 is set by the
children the measure tells us least about. **The budget-matched design does not have this problem** —
that is its main practical argument, ahead of reliability.

**Censoring is carried, never dropped.** A child who never cracks a system is the observation "longer
than the cap", which enters the AFT through the survivor function and the Kaplan–Meier curves through
the risk set. Dropping them would bias every figure toward fast learners.

| k | systems observed | censoring rate | KM median crack | blocks with zero events |
| --- | --- | --- | --- | --- |
| 1 | 600 | 2.8% | 8 | 2.8% |
| 3 | 1,800 | 3.5% | 9 | 0.5% |
| 6 | 3,600 | 4.3% | 9 | 0.0% |

Free-running censoring is low (3–4%) because the cap is generous. **In the budget-matched arm it is
much higher and concentrated by ability**, because the last system is cut short by the budget rather
than by the cap: at k = 3, censoring runs 32.5% (low) / 10.6% (mid) / 3.8% (high), and at k = 6,
38.0% / 24.3% / 21.5%. This is the mechanism behind the saturation in §4 — past three systems the
budget-matched design is mostly manufacturing censored observations. It is also the strongest
argument for k = 2 or 3 over larger k: **a design that spends its budget generating censored
observations of able children is spending it badly**, whatever the survival model can recover.

Rotation does *reduce* the rate of a child producing no usable observation at all: 2.8% of k = 1
blocks yield zero events against 0.5% at k = 3 and 0.0% at k = 6. That matters for a selection
instrument, where "no reading" is worse than an imprecise one.

## 8. Sensitivities, and the assumptions that remain

Each row changes one thing against the budget-matched k = 3 cell.

| variant | ICC(1,1) | ICC 90% | rank recovery |
| --- | --- | --- | --- |
| default | 0.54 | 0.45–0.62 | 0.68 |
| proactive interference, misbind 0.3 | 0.51 | 0.42–0.58 | 0.67 |
| proactive interference, misbind 0.6 | 0.45 | 0.36–0.52 | 0.66 |
| no warm-up demonstration | 0.55 | 0.47–0.61 | 0.70 |
| three demonstrations per system | 0.56 | 0.47–0.63 | 0.71 |
| system size 4 | 0.62 | 0.53–0.68 | 0.74 |
| system size 6 | 0.59 | 0.50–0.66 | 0.74 |
| shallow item mix (depth 1 half the block) | 0.56 | 0.46–0.62 | 0.70 |
| deep item mix (depth 3 half the block) | 0.62 | 0.54–0.68 | 0.74 |

Every variant stays well above the 0.35 baseline. The most damaging is heavy **proactive
interference** — a child arriving at system 2 carrying system 1's mapping — which costs 0.09 of ICC
at misbind 0.6 and raises censoring from 14% to 23%. That is the one mechanism that is specific to
rotation and cannot occur in the current design, and it is not measurable in simulation: whether
children actually carry a discarded mapping forward is an empirical question.

**New assumptions, none of them tested:**

- **A-R1.** Crack-times covary within a child across independent systems. §5. Load-bearing for
  everything; a simulation cannot establish it.
- **A-R2.** A child treats a rotated system as a fresh mapping rather than carrying the previous one
  forward. Modelled as `misbind` and varied; the true value is unknown and could be worse than 0.6.
- **A-R3.** Rotating the hidden mapping mid-block is not itself confusing or demotivating. The
  simulation has no model of a child noticing that the rules changed and disengaging. This is a
  child-experience risk, not a psychometric one, and it needs the intuitiveness-audit treatment that
  E-210 applied to the child screen.
- **A-R4.** One unscored demonstration is enough to orient a child to a new system. Varied (0 and 3
  demonstrations) with little effect on reliability, but the simulated learner cannot be confused,
  only uninformed.
- **A-R5.** The live difficulty-targeting selection rule would not systematically change the depth
  mix in a way that alters these conclusions. The two depth-mix rows bracket it; the real rule is not
  modelled.
- **A-R6.** The measured item pool is representative of what a generator could actually produce for
  a rotating design. No bank rotates today, so this is an assumption about a bank that does not
  exist.

**What is deliberately out of scope:** any change to a bank, generator, checker or renderer; any
wiring into the live block; any change to `packages/exam-scoring` or the estimator; any Gate A or
Gate B claim for any type; any recommendation about which of the four Stage 2 types should carry a
rotating design.

## 9. Recommendation

**Build it, after one study, at k = 2 or 3 and system size 5.**

The reliability gain at a matched budget is real, large and robust: ICC 0.35 → 0.54–0.62, rank
recovery 0.48 → 0.67–0.76, with no extra trials and non-overlapping bootstrap bands. Nothing in the
sensitivity sweep reverses it. Sizes 5 and 6 put the mid-ability median crack-time at 9 trials,
inside the target band, with no hard floor at the top.

**k = 2 or 3, not more.** Beyond three systems a 30-trial budget cannot deliver what is asked for: the
sweep administers at most 3.5 systems whatever k says, and the extra requested systems are censored
before they start. Larger k spends the budget generating censored observations, disproportionately of
able children.

**The study that has to come first** is §5(1) plus §5(2): two independent systems in one session,
order-counterbalanced, with a disattenuated correlation between crack-times. It is small, it needs no
outcome variable, and it is the only thing that distinguishes this proposal from an elegant way of
aggregating noise. **If that correlation is near zero the design is dead and the 30 trials should stay
where they are.**

**What the document does not establish.** That crack-time measures learning; that the trait it
assumes exists; that any of these numbers transfers to children; that the current block is bad
because two thirds of it is post-mastery — §3 shows the tail is degenerate, not empty. The comparison
with PR #42's published figures (ICC 0.59, rank recovery 0.71 on the real bank) is **not** a like-for-
like comparison: different population, synthetic pool, and a block-level rather than per-primitive
criterion. Only the rows of §4 are comparable with each other.
