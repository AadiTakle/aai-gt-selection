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

**A second argument, added after the first measurement.** Per-session re-keying — the fix for the
bank-scraping defect, recorded *not shippable* for the current block in
[PR #51](https://github.com/AadiTakle/aai-gt-selection/pull/51) — **is viable at size 5, and rotation
already does it.** The k systems in a block are k freshly drawn mappings against one fixed pool, so
every figure in §4 was measured under session keying. §9 shows why the constraint that broke it does
not apply: PR #51 failed on *ladder coverage*, five items in each of forty half-point rungs, and a
crack-time block has no rungs — a single-depth supply matches the mixed default at ICC 0.65 against
0.62. Security and measurement do not conflict at this size; they point the same way, because the
size that stops strong children flooring out (13.3% at floor, against 62.7% at size 3) is also the
size whose items keep all five options reachable.

**A third measurement, and it is a negative one.** §9d assumed rotation's short per-mapping exposure
would also blunt the within-session cross-item attack. **§10 ran the attack and refutes that.** The
mapping is pinned after a median of 4 items against a system that lives 8, and a rotating block
concedes **89.8%** to the attacker against the current design's 96.8% — a 7-point gain against a 20%
floor, which is not a mitigation. What rotation *does* break is permanence: a scrape applied to the
next session scores 24.9% against 24.0% for a mapping guessed at random and never scraped. **The
security claim is therefore narrower than §9 alone would suggest — rotation fixes the scraping
defect, not the live intersection attack**, which is bounded below by how much the reveals disclose
and is unsolved in both designs.

**Requirements served:** R5 (a decision-used measure must have a defensible relationship to what it
claims to measure — the whole document is a variance-ratio argument), R6 (measure growth without a
gifted-student ceiling — §6 is the ceiling test and it is the least comfortable section), R7
(auditable and falsifiable — every table is one seeded command), R10 (state the boundaries of every
conclusion — §5 and §8), H1, H6.

**Evidence and assumptions used:** E-095 and E-200 (the recovery ladder and the estimator's
manufactured-rate problem, which is why answerability has to be separable from correctness before any
crack-time means anything), E-075/E-076 (content-derivability, re-checked here through the same
oracle code path that computes answerability), E-211 (PR #42's acquisition-latency measurement, whose
criterion and survival machinery this run imports rather than restates), PR #47's F6 cross-item
attack (imported verbatim in §10, not re-implemented). **No new E or D ID is
claimed.** This is a simulation of a design that has not been approved, and minting an evidence ID
for a planted correlation would be exactly the error §5 warns about. **New assumptions: A-R1 through
A-R6, §8.**

**Re-run everything here with:**

```
pnpm stage2:rotation                                 # the full run, ~35s, deterministic
pnpm --filter @gt-selection/web test                 # includes this simulation's 24 assertions
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
  exist. §9b prices supply against this pool, so the headroom figures inherit the assumption.
- **A-R7. REFUTED, §10.** A rotating block's shorter per-mapping exposure was assumed to limit the
  within-session intersection attack. F6 has now been run against the design and it does not: the
  pin needs a median of 4 items against a median 8-trial system, and block-level attacker accuracy
  falls only from 96.8% to 89.8%. The permanence half of the assumption is **supported** and
  promoted to a finding — a scrape is worth 0.9 points over never having scraped. Retained as a
  refuted entry rather than deleted, because the original claim was communicated.

**What is deliberately out of scope:** any change to a bank, generator, checker or renderer; any
wiring into the live block; any change to `packages/exam-scoring` or the estimator; any Gate A or
Gate B claim for any type; any recommendation about which of the four Stage 2 types should carry a
rotating design.

## 9. Per-session re-keying: does the recommended size survive it?

A separate workstream, `feat/stage2-session-keying`
([PR #51](https://github.com/AadiTakle/aai-gt-selection/pull/51)), tested drawing the hidden system at
session time instead of baking it into the shipped bank — the fix for a real defect, where scraping
about a dozen items pins a bank's system permanently for every future child. It was recorded **not
shippable for the current block**: a session draw served 28% of the bank and left 87.8% of the
half-point rungs short of five items, because *re-keying admissibility collapses with chain depth*
(78.2% of relabellings admissible at depth 1, 13.8% at depth 4). Since the current ladder is built out
of depth, the fix cuts the ladder off at the top.

**The result matters here because rotation has no choice about re-keying.** The k systems in a block
differ only in which badge means which, so every reliability figure in §4 was *already* produced under
freshly drawn mappings — ten replicates × k draws each, against one fixed pool. Re-keying is not an
extra mechanism to add to this design; it is what makes the block a rotation. The open question was
whether the pool that supports it is one anyone could ship.

### 9a. Admissibility by system size and chain depth

PR #51's statistic, unchanged. `admissible` is the share of the free bijection family whose output for
an item lands on one of its five options; the rest cannot serve that item in that session.
`reachable` counts how many *distinct* options are ever the key, and PR #51's shippability bar is four
of five.

| depth | size 3 | size 4 | **size 5** | size 6 | shipped bank (PR #51, 6 operators) |
| --- | --- | --- | --- | --- | --- |
| 1 | 100.0% | 100.0% | **100.0%** | 83.3% | 78.2% |
| 2 | 100.0% | 71.1% | **38.8%** | 28.0% | 25.7% |
| 3 | 100.0% | 83.4% | **29.2%** | 16.6% | 13.5% |
| 4 | — | 100.0% | **50.0%** | 18.4% | 13.8% |

**The size-6 column reproduces PR #51's collapse closely** (83.3 / 28.0 / 16.6 / 18.4 against its 78.2
/ 25.7 / 13.5 / 13.8), which is what licenses reading the rest of the table as comparable. The
*reachable-option* counts are not comparable and are reported separately below: this pool draws its
slate from the chain's reachable figures by construction (§1), so it loses options only to assignment
collisions, whereas the shipped generator's distractors are named partial rules and some are
unreachable outright.

**The curve has two ends, and reading admissibility alone would misprice one of them.**

| size | depth | admissible | mean reachable | ≥4 of 5 reachable | key on one option |
| --- | --- | --- | --- | --- | --- |
| 3 | 3 | 100.0% | **2.00** | **0.0%** | **50.0%** |
| 4 | 4 | 100.0% | **2.00** | **0.0%** | **50.0%** |
| 5 | 2 | 38.8% | 5.00 | 100.0% | 26.2% |
| 5 | 3 | 29.2% | 5.00 | 100.0% | 28.2% |

Going *deeper* for a given size collapses admissibility — PR #51's finding. Going *shallower* for a
given size eventually collapses the number of distinct assignments instead. At size 3 depth 3 and at
size 4 depth 4 every mapping is admissible, yet the key only ever lands on **two of the five options**:
the honest guessing floor is 0.50 rather than 0.20, and a client that knows the vocabulary can discard
three options unseen. A shallower-is-safer reading of the admissibility column alone would score those
cells as perfect and ship a broken item. **Size 5 at depths 1–3 clears both ends**: five reachable
options everywhere, key position balanced within 8 points of even, and admissibility well above zero.

### 9b. What one draw supplies, against what a block spends

PR #51's verdict turned on ladder coverage — five items in each of forty half-point rungs. A rotating
block does not ask that. It asks for enough unseen servable items, at the depths it serves, to reach
mastery k times, which is a few tens. So the supply is priced as a count against consumption (40
mapping draws, the simulation's own 900-per-depth pool):

| size | servable per draw | share of pool | thinnest depth | items a k = 5 block spends | headroom |
| --- | --- | --- | --- | --- | --- |
| 4 | 2,295 | 85.0% | 645 | 63.4 | 36× |
| **5** | **1,508** | **55.8%** | **264** | **63.4** | **24×** |
| 6 | 1,151 | 42.6% | 149 | 63.4 | 18× |

Worst key slot over all draws is 22.5% at size 5 against 20.0% for perfect balance, so a session draw
does not need the shipped bank's round-robin cursor to keep the answer off a predictable position.

**The important thing this table says is that admissibility was never the binding constraint — the
ladder requirement was.** At size 5, 29.2% admissibility at depth 3 is the *same order* as the shipped
bank's failing numbers. What changed is not that size 5 sits in a comfortable region; it is that
rotation asks for 63 items and gets 1,508, where the current block asks for five items in each of
forty specific rungs and cannot get them.

### 9c. Does rotation still need the half-point ladder?

Under the current block the score is the **height reached**, so the rung an item sits on *is* the
measurement and the grain has to be fine. Under rotation the score is **trials to crack**, and what a
trial has to do is narrow the candidate set — a property of whether the item is determined, not of
where it sits on a ladder. Each row serves the recommended k = 5 configuration from one depth only:

| item supply | ICC(1,1) | ICC 90% | rank recovery |
| --- | --- | --- | --- |
| mixed default (depth 1/2/3 at 15/50/35) | 0.62 | 0.53–0.69 | 0.76 |
| depth 1 only | 0.65 | 0.56–0.71 | 0.76 |
| depth 2 only | 0.64 | 0.55–0.70 | 0.75 |
| depth 3 only | 0.65 | 0.56–0.71 | 0.76 |
| depths 1–2 only | 0.62 | 0.54–0.69 | 0.76 |

**The grain is not doing work.** A block built from a single depth matches the mixed default on every
figure; all five bands overlap and rank recovery is 0.75–0.76 throughout. Single-depth is very
slightly *higher*, and the likely reason is mechanical rather than interesting — a homogeneous supply
removes item-difficulty variation from the within-child error, which is the ICC's denominator. The
finding is that the grain does not matter, **not** that flatter is better.

This bears directly on PR #51's blocker. Its failure metric was "87.8% of the 0.5-point rungs left
short of five items". Under rotation there are no 0.5-point rungs to leave short. **The constraint that
broke per-session keying does not apply to a design measured by crack-time.**

*What this cannot settle:* this pool prices difficulty by chain depth alone. The shipped ladder also
prices the geometric-operator count and the distractor similarity. Those are not varied here, so the
rows above bear on whether the *block* needs a spread of rungs — not on whether the generator should
keep its finer levers for other purposes.

### 9d. Do security and measurement conflict?

**At size 5, no — and the reason is worth stating precisely, because the obvious version of the
argument is wrong.** The tempting reading is "shallower systems are more admissible, so re-key by going
shallow". That reading is unsafe in both directions:

| | measurement | security |
| --- | --- | --- |
| size 3 | fails — **62.7%** of high-ability crack-times sit at the floor (§6) | fails — depth-3 items reachable on only 2 of 5 options, guessing floor 0.50 |
| size 4 | marginal — 39.7% at floor, mid-band median 8 | fine at depths 1–3; depth 4 collapses to 2 reachable options |
| **size 5** | **works — 13.3% at floor, mid-band median 9** | **works — 5 reachable options, balanced key slot, 24× supply headroom** |
| size 6 | works — 7.0% at floor, mid-band median 9 | works, with 18× headroom and the thinnest depth bucket |

**The two goals point the same way here rather than trading off.** Shrinking the system to buy
admissibility floors out strong children *and* collapses the option set; the size that fixes the floor
is also the size with five reachable options and balanced key positions. Sizes 5 and 6 both clear
both bars, and size 5 has the larger supply margin.

**The honest qualification.** This is not a discovery that size 5 sits in a high-admissibility region —
it does not, at 29.2% for its modal depth. It is that a rotating block's demand on the pool is roughly
two orders of magnitude smaller than a difficulty-ladder block's, so an admissibility that is fatal to
one is immaterial to the other. If a future design re-introduced fine difficulty targeting *within* a
rotating system, PR #51's constraint would come back with it.

**Two things this section does not establish, one of which has since been measured.** It does not
measure the *within-session* intersection attack — a client narrowing the surviving mappings from the
reveals it is shown. **§10 now runs that attack, and it refutes the mitigation this section
originally proposed:** the pin needs a median of 4 items against a system lifetime of 8, and a
rotating block still concedes 89.8% against the current design's 96.8%. Read the security claim in
this section as covering *permanence only*. It also does not establish that a generator can *produce*
a rotating pool with these properties (A-R6); the pool here is synthesised in memory.

## 10. F6 against the rotating design: A-R7 measured

§9d assumed, without measuring, that rotation's shorter per-mapping exposure limits the cross-item
intersection attack. **That assumption is half right, and the half that fails is the half that was
offered as a mitigation.** F6 is run here with PR #47's own probe — `crossItemAttack` and `scoreItem`
imported verbatim from `research/exam-question-types/gate-a/stage2-antileak-comparison.mjs`, with a
new adapter because that file's adapters read shipped bank content and this pool is synthesised.

**Headline: rotation does not mitigate the within-session attack. It does break permanence
completely.**

Two channels are scored. `onScreen` is PR #47's — the client knows only that the output was one of
the five figures, which is all a static bank scrape gives. `reveal` is the stronger channel a
*learning* block hands over: the trial resolves in front of the child, so the client also knows
which figure. **Rotation only works in a block that reveals**, so `reveal` is the channel this design
has to answer for.

### 10a. Items to pin, against how long a mapping lives

| size | candidate mappings | onScreen median | reveal p10 | reveal median | reveal p90 | information bound |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 6 | never | 2 | **2** | 5 | 1.11 |
| 4 | 24 | 25 | 2 | **3** | 5 | 1.97 |
| **5 (recommended)** | 120 | 14 | 3 | **4** | 6.1 | 2.97 |
| 6 | 720 | 14 | 4 | **6** | 10 | 4.09 |

A size-5 system's **lifetime** in the recommended block is a median of 8 scored trials (p10 4, p90
15). The pin needs 4. **The attack lands comfortably inside a system's life, not at its boundary.**

**And no pool change fixes it.** `information bound` is log₅ of the hypothesis space: a five-option
reveal carries at most log₂5 bits, so no mapping over that many candidates survives more than that
many reveals however the items are chosen. The observed median sits *at* the bound. The attack is not
exploiting a weakness a better-constructed pool would remove — it is reading the reveals, and the
reveals are the pedagogical feature the whole design is built on. Making the pin outlast a median
8-trial system needs a hypothesis space above 5⁸ ≈ 390,000 mappings, roughly a nine-badge vocabulary,
against 120 at size 5 and 720 at the shipped size 6. §6 sized the system at five for reasons that
have nothing to do with this, and enlarging it to nine would break every crack-time result above.

Note the direction: **the recommended size 5 is *more* pinnable than the shipped size 6** (median 4
against 6), because shrinking the vocabulary shrinks the hypothesis space. That is a cost of the
sizing recommendation that §6 did not price.

### 10b. What the attacker scores across a whole block

The attacker rides along with the blocks §4 measured, committing to each trial *before* that trial's
reveal arrives, and losing its entire hypothesis state at every rotation.

| arm | mean pin trial | systems ever pinned | share of trials before the pin | **attacker accuracy** | before pin | after pin |
| --- | --- | --- | --- | --- | --- | --- |
| k = 1, 30 trials (current design) | 3.40 | 100.0% | 11.3% | **96.8%** | 71.6% | 100.0% |
| k = 3, budget-matched | 3.33 | 94.9% | 35.2% | **89.3%** | 70.5% | 100.0% |
| k = 5, budget-matched | 3.08 | 92.3% | 34.8% | **89.8%** | 70.7% | 100.0% |

**Rotation buys 7 points against a 20% floor. That is not a mitigation.** It works as far as it goes —
the share of trials the attacker answers unpinned rises from 11.3% to about 35%, which is exactly the
effect A-R7 predicted — but two things cancel most of it. The pin arrives at trial 3 of a system that
lives 8, so rotation is re-arming an attacker that re-pins almost immediately. And the attacker is
not helpless before the pin: voting over the surviving mappings scores **70.7%** while still unpinned,
because after one or two reveals the survivor set already agrees about most items.

An 89.8% attacker and a 96.8% attacker are the same finding for a selection instrument. **Anyone who
was told rotation might fix the cross-item attack should be told it does not.**

### 10c. Permanence, which rotation genuinely does break

The severe property of the shipped design is that one scrape pins the bank and every future child is
served items whose answers the attacker already holds. Tested literally: pin session A's mapping,
then answer session B's items with it. **The control is not the guessing floor** — two bijections over
five badges agree somewhere by coincidence, so a stale pin scores above the floor for reasons that
have nothing to do with having scraped anything. The control is a mapping picked at random and never
scraped.

| attacker on the next session | accuracy |
| --- | --- |
| pinned mapping, same session (the shipped design's permanence) | **100.0%** |
| pinned mapping from session A, applied to session B | 24.9% |
| a mapping guessed at random, never scraped — **the control** | 24.0% |
| no mapping knowledge at all, vote over the full family | 23.2% |
| guessing floor | 20.0% |

**A scrape is worth 0.9 points over guessing, which is nothing.** 28.0% of the next session's items
the stale mapping cannot key at all. Averaged over 40 session pairs. This is the clean positive
result and it is the one that matters for the defect PR #51 set out to fix: *scraping stops being
permanent*.

**What an attacker does retain across sessions**, stated precisely, because "the mappings are fresh"
is not the same as "the attacker starts over":

- **The item structures.** Every chain, input and option slate is still shared, and if the pool ships
  they are known in advance. Rotation re-keys the mapping, not the items.
- **The ability to enumerate.** The vocabulary and the algebra are public, so the full bijection
  family is always available — that is what the 23.2% row is.
- **The per-item leak.** Voting over the full family scores 23.2% against a 20.0% floor. That 3.2
  points is permanent, does not depend on any scrape, and is the residual the per-item families
  (F1–F5) are about. It is not affected by rotation in either direction.
- **Nothing about which badge means which.** That, and only that, is what a fresh draw destroys.

### 10d. What separates the attacker from a child who has cracked the system

| | p10 | median | p90 |
| --- | --- | --- | --- |
| attacker pins the mapping at trial | 2 | **3** | 5 |
| child demonstrates mastery at trial | 6 | **8** | 14 |

**In the served data, nothing distinguishes them in kind — only in speed.** Both perform the same
computation on the same evidence and both then answer correctly; the block records a response and a
correctness, and after the pin the attacker's record is a child's record with a shorter ramp. The two
distributions here barely overlap (attacker p90 = 5 against child p10 = 6), so an *unmodified*
attacker is detectable as an implausibly fast learner.

**That detection is worth very little, and it should not be presented as a control.** The attacker
chooses its own accuracy. One that answers at a plausible rate on a plausible ramp is
indistinguishable from a strong child by construction, and it still scores whatever it wants to
score. Speed-based detection catches only an attacker that is not trying to avoid it.

### 10e. Verdict on A-R7

**A-R7 is refuted as written and must not be repeated.** It claimed the ~10-trial exposure limits the
cross-item attack; the pin needs 4 items and arrives at trial 3, and the block-level attacker drops
only from 96.8% to 89.8%. The claim that rotation *might fix the cross-item attack* is wrong and
should be corrected with anyone who has heard it.

**The permanence half is now supported by measurement rather than assumed** (§10c), and it is
promoted from an assumption to a finding: a scrape carries 0.9 points over never having scraped.

**What this does and does not change.** It does not change any reliability result — the attacker is
not a child and §4 is untouched. It does not make rotation *worse* than the current design on this
axis; 89.8% beats 96.8%. It does narrow the security claim in §9 from "rotation solves the security
problem" to "rotation solves the *permanence* half of it". The within-session intersection attack is
unsolved in both designs, it is bounded below by the information content of the reveals, and it
needs a different mechanism — server-side answer checking without a full reveal, a reveal that does
not disclose the resolved figure, or per-child item selection — none of which is in scope here.

## 11. Recommendation

**Build it, after one study, at k = 2 or 3 and system size 5.**

The reliability gain at a matched budget is real, large and robust: ICC 0.35 → 0.54–0.62, rank
recovery 0.48 → 0.67–0.76, with no extra trials and non-overlapping bootstrap bands. Nothing in the
sensitivity sweep reverses it. Sizes 5 and 6 put the mid-ability median crack-time at 9 trials,
inside the target band, with no hard floor at the top.

**Size 5 also carries half of the security fix, at no cost to the measurement.** A rotating block is
already per-session keyed, and §9 finds the pool supports it with 24× supply headroom, five reachable
options per item and balanced key positions. The reason PR #51 could not ship the same fix for the
current block — 87.8% of half-point rungs left short — does not survive a change of measure: §9c
finds a single-depth item supply matches the calibrated mix. So the **permanence** defect, where one
scrape breaks the bank for every future child, is fixed on the way past rather than as a second
project (§10c: a scrape carries 0.9 points over guessing).

**The other half is not fixed, and §10 measured it rather than assuming it.** The within-session
intersection attack still scores **89.8%** against the current design's 96.8%. That is bounded below
by how much the reveals disclose, not by anything about rotation, so no version of this design closes
it. Rotation is not worse than the incumbent here, but it must not be sold as the fix. Closing it
needs a separate mechanism — server-side checking without a full reveal, or a reveal that does not
disclose the resolved figure — and that is out of scope for this workstream.

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
because two thirds of it is post-mastery — §3 shows the tail is degenerate, not empty; that a
rotating block resists the within-session intersection attack, which §9d flags as unmeasured. The
comparison
with PR #42's published figures (ICC 0.59, rank recovery 0.71 on the real bank) is **not** a like-for-
like comparison: different population, synthetic pool, and a block-level rather than per-primitive
criterion. Only the rows of §4 are comparable with each other.
