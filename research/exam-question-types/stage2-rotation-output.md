 WARN  Unsupported engine: wanted: {"node":"24.x"} (current: {"node":"v25.9.0","pnpm":"10.34.5"})

> gt-selection-capstone@0.0.0 stage2:rotation /Users/atakle/Desktop/Intership Files/Alpha AI Engineering 2026/gt-worktrees/stage2-rotating-systems
> node research/exam-question-types/stage2-rotation-report.mjs

# Stage 2 — rotating multi-system blocks against the single 30-trial block

60 simulated children x 10 replicate blocks x 6 values of k, at system size 5.
Seeds 20260801+7919r, fully deterministic. Budget-matched arm: 30 scored trials per block at every k.
Rotation criterion: sequential log-odds on oracle-determined trials, lapse 0.1, threshold 100:1 (`createBadgeTest`, imported unchanged from PR #42).
Cumulative learnability oracle: `stage2-learnability-core.mjs` (PR #48), `outcome` reveal mode.
Figure algebra: `generators/FLU-OPCHAIN-01.mjs`. No bank is read, written or changed.

BORN-SYNTHETIC. Every child is a program with a planted latent trait. Nothing here is evidence that
children have such a trait, that this task measures learning, or that any number transfers. See §4.


Item pool, per system size — templates built and how many a single system can be served.

| size | candidate systems | templates | servable per system, depth 1 / 2 / 3 |
| --- | --- | --- | --- |
| 3 | 6 | 2700 | 900 / 900 / 900 |
| 4 | 24 | 2700 | 900 / 643 / 750 |
| 5 | 120 | 2700 | 900 / 346 / 264 |
| 6 | 720 | 2700 | 750 / 251 / 149 |

Depth mix served: depth 1 15.0%, depth 2 50.0%, depth 3 35.0%. This file's choice, NOT the live selection rule, which targets
difficulty against a running ability estimate. §8 varies it.

## 1. The rotation rule

A trial is an OPPORTUNITY only when the cumulative oracle says its answer was already determined by
the reveals the child had seen. On such a trial exactly one option is consistent with holding the
system, so a child who has it answers that option by construction, and a guesser hits it with
probability q = 1/|options|. Each opportunity is fed to PR #42's accumulator at its own q, and the
system is declared cracked when the log-odds cross log 100.

At a five-option slate a pass is worth log(0.9/0.2) = 1.504 and a miss log(0.1/0.8) = −2.079 against
a bound of 4.605, so mastery needs four clean determined trials and one miss costs about a trial and
a half of credit back. Wald bounds a guesser's crossing probability at 1/100 = 1.0%. That is the analytic guarantee; below is the realised rate.

Guessers: 4000 blocks of up to 30 trials, uniform choice throughout, no encoding.

- crossed the criterion: **18 of 4000 = 0.4%**, against the analytic bound of 1.0%.
- determined-trial opportunities offered: 28.24 per block over 29.90 trials.

The oracle keeps offering opportunities to a guesser — its knowledge state is built from the REVEALS,
which a guesser still sees — so the low crossing rate is the criterion doing the work and not an
absence of chances to fire.

## 2. Where the informative trials are in a 30-trial single-system block

The current design, run to its full length: k = 1, cap 30, the criterion evaluated but NOT used to
stop. Per trial index, across the whole population:

- `cracked` is the share of children who had already demonstrated mastery before this trial.
- `accuracy` is the share answering correctly.
- `discrimination` is the squared point-biserial correlation between correctness at this trial and
  the planted trait — the share of the outcome's variance that is about the child. A trial every
  child gets right has none whatever its accuracy, which is the property the owner's argument turns
  on. Normalised over the block it is that trial's share of the block's discriminating signal.

| trial | cracked | accuracy | oracle-determined | discrimination | share of block signal |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.0% | 44.7% | 20.0% | 0.002 | 0.2% |
| 2 | 0.0% | 37.0% | 40.0% | 0.025 | 1.7% |
| 3 | 0.0% | 58.3% | 90.0% | 0.089 | 6.0% |
| 4 | 0.0% | 70.5% | 90.0% | 0.011 | 0.7% |
| 5 | 2.3% | 69.2% | 90.0% | 0.105 | 7.0% |
| 6 | 15.2% | 70.7% | 90.0% | 0.094 | 6.3% |
| 7 | 25.0% | 82.8% | 100.0% | 0.120 | 8.0% |
| 8 | 42.7% | 88.0% | 100.0% | 0.111 | 7.4% |
| 9 | 55.2% | 90.7% | 100.0% | 0.063 | 4.2% |
| 10 | 65.3% | 88.7% | 100.0% | 0.087 | 5.8% |
| 11 | 70.8% | 90.5% | 100.0% | 0.085 | 5.7% |
| 12 | 76.3% | 90.8% | 100.0% | 0.090 | 6.0% |
| 13 | 78.8% | 95.5% | 100.0% | 0.050 | 3.3% |
| 14 | 81.5% | 92.8% | 100.0% | 0.094 | 6.3% |
| 15 | 85.3% | 93.2% | 100.0% | 0.053 | 3.5% |
| 16 | 86.7% | 94.7% | 100.0% | 0.051 | 3.4% |
| 17 | 89.2% | 92.2% | 100.0% | 0.063 | 4.2% |
| 18 | 89.8% | 93.5% | 100.0% | 0.054 | 3.6% |
| 19 | 90.3% | 94.3% | 100.0% | 0.022 | 1.5% |
| 20 | 91.3% | 94.8% | 100.0% | 0.009 | 0.6% |
| 21 | 92.0% | 96.3% | 100.0% | 0.013 | 0.9% |
| 22 | 92.7% | 96.5% | 100.0% | 0.018 | 1.2% |
| 23 | 93.2% | 96.3% | 100.0% | 0.008 | 0.5% |
| 24 | 93.3% | 96.0% | 100.0% | 0.027 | 1.8% |
| 25 | 93.7% | 95.5% | 100.0% | 0.038 | 2.5% |
| 26 | 94.2% | 97.8% | 100.0% | 0.019 | 1.3% |
| 27 | 95.3% | 96.7% | 100.0% | 0.013 | 0.9% |
| 28 | 96.0% | 98.2% | 100.0% | 0.021 | 1.4% |
| 29 | 96.7% | 97.3% | 100.0% | 0.025 | 1.7% |
| 30 | 97.0% | 97.2% | 100.0% | 0.033 | 2.2% |

**The waste, per child.** 66.3% of all trials served in a 30-trial single-system block
are served after that child had already demonstrated mastery. Accuracy on them is 96.6%
against 67.2% before. Among the 97.2% of blocks in which the child cracked the system at all, the
median crack is trial 8.00 and the mean number of post-mastery trials is 20.48 of 30 — so a block that
set out to measure acquisition spends most of its length confirming an acquisition it has already
observed. That is the owner's claim and the simulation reproduces it.

**But the tail is not worthless at the POPULATION level, and the distinction matters.** Post-mastery trials
carry 18.0% of the block's discriminating signal rather than none, because children crack at
different times: at trial 20 the block is still separating the 8.7% who have not cracked from the
rest. The honest statement is narrower than "20 wasted trials": the tail is nearly uninformative about
any child who has already cracked, and it degenerates into a slow binary test of whether a child ever
will. Rotation is worth considering because it replaces that binary with a graded count, not because
the tail is literally empty.

## 3. Reliability as a function of system count

For each k the block aggregates k crack-times into one score by the SAME log-normal AFT with a child
random intercept that PR #42 used, so the rows are comparable with that report and with each other.
Between-child variance and within-child replication error are then measured by running the same
child over 10 replicate blocks — an observed decomposition, not a model-based one.

**No Spearman–Brown projection appears anywhere in this table.** That formula assumes the k observations
are parallel measures of one trait, which is precisely the assumption under test; applying it here
would assume the conclusion. Every value below is observed.

**Budget-matched arm.** Every k spends 30 scored trials.

| arm | scored trials | observations per block | between-child var | within-child var | ratio | **ICC(1,1)** | ICC 90% | rank recovery |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **current design**: 1 system, 30 trials, per-primitive latency (PR #42) | 30.00 | 5.00 | 0.000 | 0.001 | 0.54 | **0.35** | 0.25–0.42 | 0.48 |

| k | systems actually run | mean trials SPENT | between-child var | within-child var | ratio | **ICC(1,1)** | ICC 90% | rank recovery | rank 90% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1.00 | 10.10 | 0.009 | 0.019 | 0.49 | **0.33** | 0.24–0.38 | 0.50 | 0.41–0.55 |
| 2 | 1.95 | 19.69 | 0.025 | 0.019 | 1.28 | **0.56** | 0.46–0.64 | 0.67 | 0.57–0.73 |
| 3 | 2.79 | 26.63 | 0.017 | 0.014 | 1.19 | **0.54** | 0.45–0.62 | 0.68 | 0.59–0.74 |
| 4 | 3.35 | 29.33 | 0.024 | 0.017 | 1.37 | **0.58** | 0.50–0.63 | 0.74 | 0.67–0.78 |
| 5 | 3.42 | 30.00 | 0.039 | 0.024 | 1.65 | **0.62** | 0.53–0.69 | 0.76 | 0.68–0.81 |
| 6 | 3.49 | 30.00 | 0.033 | 0.027 | 1.23 | **0.55** | 0.46–0.62 | 0.71 | 0.63–0.77 |

THE BUDGET IS A CEILING, NOT A QUOTA, and the "trials spent" column is why the row above the table
matters. A k = 1 block stops at its single crack and therefore spends about a third of the budget;
only the rotating arms actually use it. So the trial-matched comparison is the CURRENT DESIGN row —
30 trials, per-primitive latency — against the larger k rows, not k = 1 against k = 5. Both are shown
because the difference between them is precisely how much of the gain is aggregation and how much is
simply not stopping early.

The raw variances are NOT comparable between rows: the AFT is refitted per cell, so each row has its
own score scale. The ratio and the ICC are scale-free and are the columns to read. The 90% bands are
percentile bootstraps over children, and they are wide enough that neighbouring k values are not
distinguishable — the readable contrast is k = 1 against k greater than 1, not one k against another.


Same sweep with NO budget cap: every system runs to mastery or its own 30-trial cap, so a k = 6 block
costs roughly six times a k = 1 block. Reported because it separates "rotation helps" from "more
trials help", and the difference between the two tables is the whole question.

| k | mean scored trials | ratio | **ICC(1,1)** | ICC 90% | rank recovery |
| --- | --- | --- | --- | --- | --- |
| 1 | 10.10 | 0.49 | **0.33** | 0.24–0.38 | 0.50 |
| 2 | 22.00 | 1.53 | **0.61** | 0.51–0.67 | 0.67 |
| 3 | 33.33 | 2.01 | **0.67** | 0.58–0.73 | 0.72 |
| 4 | 43.74 | 2.26 | **0.69** | 0.63–0.74 | 0.79 |
| 5 | 56.24 | 3.83 | **0.79** | 0.73–0.84 | 0.83 |
| 6 | 67.40 | 4.15 | **0.81** | 0.73–0.85 | 0.84 |

## 4. Do crack-times correlate within a child across systems?

If they do not, aggregating k of them buys nothing and the proposal fails outright. Below is the
observed correlation between a child's crack-time on system i and on system j, over the k = 6
free-running arm, using only children who produced an event on both.

| systems | pairs with both cracked | Pearson r of log crack-time |
| --- | --- | --- |
| 1 vs 2 | 551 | 0.27 |
| 1 vs 3 | 562 | 0.32 |
| 1 vs 4 | 557 | 0.31 |
| 1 vs 5 | 558 | 0.22 |
| 1 vs 6 | 557 | 0.22 |
| 2 vs 3 | 556 | 0.33 |
| 2 vs 4 | 549 | 0.29 |
| 2 vs 5 | 549 | 0.31 |
| 2 vs 6 | 549 | 0.24 |
| 3 vs 4 | 559 | 0.35 |
| 3 vs 5 | 561 | 0.32 |
| 3 vs 6 | 558 | 0.32 |
| 4 vs 5 | 558 | 0.25 |
| 4 vs 6 | 553 | 0.29 |
| 5 vs 6 | 555 | 0.23 |

Mean pairwise r: **0.28**. One-way ICC over systems within a block: **0.31**.

**This number is an artefact of the generative model and is not evidence for the design.** Every child
here is a single encoding-fidelity parameter that drives every system it sees, so its crack-times
MUST covary; the correlation above measures how much measurement noise the block adds on top of a
correlation that was planted, not whether the trait exists. A simulation cannot answer that.

What would answer it, in order of cost:

1. **Within-session, real children.** Administer two independent systems to the same child in one
   sitting and correlate the two crack-times. A disattenuated correlation near zero kills the
   proposal; anything above about 0.4 supports it. This is the smallest sufficient study and it does
   not need an outcome variable.
2. **Order-counterbalanced.** System A first for half the children and B first for the other half, so
   a correlation cannot be manufactured by fatigue or by warm-up carryover, both of which produce
   positive covariance with no shared trait at all.
3. **Discriminant check.** The same two crack-times against an unrelated speeded task. A crack-time
   correlation that is no larger than the correlation with general speed is not evidence for a
   learning-rate trait.
4. **Test-retest across days**, which is the only version that separates a trait from a session state.

Until at least (1) and (2) have run, every ICC in §3 should be read as conditional on an assumption
that has not been tested.

## 5. Sizing: which system size puts the median crack-time in the 8–12 band?

`size` is how many primitives the hidden bijection covers. Crack-times below are from the free-running
arm at k = 3, split by planted-ability tercile, censored observations excluded from the median and
counted separately.

| size | candidate systems | median crack, low | mid | high | censoring | high-band IQR |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 6 | 9.00 | 7.00 | 5.00 | 1.1% | 5.00–7.00 |
| 4 | 24 | 13.00 | 8.00 | 7.00 | 3.8% | 6.00–8.00 |
| 5 | 120 | 13.00 | 9.00 | 8.00 | 3.5% | 7.00–9.00 |
| 6 | 720 | 14.00 | 9.00 | 8.00 | 5.2% | 6.00–9.00 |

**Does the measure flatten at the top?** Two different failures get called "a floor" and only one of
them is present here, so they are separated.

A HARD FLOOR is the criterion's own evidence requirement: it needs four clean determined trials, and
determination cannot happen before the first reveals land, so crack-time cannot go below (first
determined trial + 4) however able the child is. `floor` is the smallest crack-time actually observed.

FLATTENING is the thing that would sink the design: crack-time no longer tracking ability among able
children, whether or not anyone is on the floor. `within-band rho` is the rank correlation between
the planted trait and crack-time INSIDE the top tercile — near zero means the measure has stopped
distinguishing strong children from each other. `high vs mid AUC` is the chance a top-tercile child
cracks one system faster than a middle-tercile one; 0.5 is no separation.

| size | floor | high median | high 10th pct | at floor (±1) | within-band rho, single system | high vs mid AUC, single system | within-band rho, mean of 3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | 4 | 5.00 | 5.00 | 62.7% | 0.15 | 0.59 | 0.30 |
| 4 | 5 | 7.00 | 5.00 | 39.7% | 0.18 | 0.65 | 0.30 |
| 5 | 4 | 8.00 | 5.00 | 13.3% | 0.18 | 0.61 | 0.32 |
| 6 | 4 | 8.00 | 6.00 | 7.0% | 0.16 | 0.63 | 0.31 |

**Is the flattening specific to the top, or is it range restriction?** A tercile is a narrow slice of
trait, so a low within-band correlation is partly expected everywhere and the top band on its own
proves nothing. The same statistic in all three bands is the control.

| band | median crack | within-band rho, single system | within-band rho, mean of 3 | censoring |
| --- | --- | --- | --- | --- |
| low | 13.00 | 0.35 | 0.52 | 10.5% |
| mid | 9.00 | 0.13 | 0.21 | 0.0% |
| high | 8.00 | 0.18 | 0.32 | 0.0% |

## 6. Total trial budget

Free-running arm: each system runs to mastery or its 30-trial cap. `screens` counts the unscored
demonstration each system opens with, because the session clock pays for those too. Timed at
15s per question.

| k | mean trials | p90 trials | mean screens | p90 screens | mean minutes | p90 minutes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 10.10 | 18.00 | 11.10 | 19.00 | 2.78 | 4.75 |
| 2 | 22.00 | 38.10 | 24.00 | 40.10 | 6.00 | 10.03 |
| 3 | 33.33 | 57.00 | 36.33 | 60.00 | 9.08 | 15.00 |
| 4 | 43.74 | 73.00 | 47.74 | 77.00 | 11.94 | 19.25 |
| 5 | 56.24 | 95.10 | 61.24 | 100.10 | 15.31 | 25.03 |
| 6 | 67.40 | 108.20 | 73.40 | 114.20 | 18.35 | 28.55 |

By ability band, free-running, so the tail the session has to survive is visible. A low-ability child
censors on every system and therefore pays the full cap every time — the budget is worst exactly
where the measure is weakest.

| k | low: mean / p90 screens | mid | high |
| --- | --- | --- | --- |
| 1 | 15.19 / 29.10 | 10.04 / 15.00 | 8.09 / 10.00 |
| 2 | 33.95 / 54.10 | 20.87 / 29.00 | 17.18 / 22.00 |
| 3 | 50.45 / 72.10 | 31.15 / 39.00 | 27.38 / 34.00 |
| 4 | 66.81 / 93.10 | 41.41 / 50.10 | 35.02 / 42.10 |
| 5 | 86.14 / 126.00 | 53.27 / 66.00 | 44.32 / 52.00 |
| 6 | 102.82 / 149.00 | 63.86 / 78.00 | 53.53 / 63.00 |

## 7. Censoring

A child who never cracks a system inside its cap is an OBSERVATION, not a dropout: "longer than the
cap" is information, and averaging only the children who cracked would bias every figure toward fast
learners. Censored systems enter the AFT in §3 through the survivor function and the Kaplan–Meier
curves below through the risk set, so no row here drops anyone.

| k | systems observed | censored | censoring rate | KM median crack | restricted mean to cap | blocks with zero events |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 600 | 17 | 2.8% | 8.00 | 10.10 | 2.8% |
| 2 | 1200 | 53 | 4.4% | 8.00 | 11.00 | 1.5% |
| 3 | 1800 | 63 | 3.5% | 9.00 | 11.11 | 0.5% |
| 4 | 2400 | 83 | 3.5% | 9.00 | 10.94 | 0.2% |
| 5 | 3000 | 132 | 4.4% | 9.00 | 11.25 | 0.0% |
| 6 | 3600 | 156 | 4.3% | 9.00 | 11.23 | 0.0% |

Censoring by ability band, budget-matched arm — where the missing observations actually are.

| k | low | mid | high |
| --- | --- | --- | --- |
| 1 | 8.5% | 0.0% | 0.0% |
| 2 | 23.8% | 3.0% | 0.3% |
| 3 | 32.5% | 10.6% | 3.8% |
| 4 | 36.6% | 20.8% | 11.4% |
| 5 | 37.6% | 25.2% | 19.4% |
| 6 | 38.0% | 24.3% | 21.5% |

## 8. Sensitivities

Each row changes ONE thing against the budget-matched k = 3 cell. A conclusion that only survives the
default settings is not a conclusion.

| variant | ICC(1,1) | ICC 90% | rank recovery | mean trials | censoring |
| --- | --- | --- | --- | --- | --- |
| default (k = 3, budget-matched) | 0.54 | 0.45–0.62 | 0.68 | 26.63 | 14.4% |
| proactive interference, misbind 0.3 | 0.51 | 0.42–0.58 | 0.67 | 27.57 | 19.1% |
| proactive interference, misbind 0.6 | 0.45 | 0.36–0.52 | 0.66 | 28.29 | 23.1% |
| no warm-up demonstration | 0.55 | 0.47–0.61 | 0.70 | 27.62 | 16.8% |
| three demonstrations per system | 0.56 | 0.47–0.63 | 0.71 | 23.96 | 10.0% |
| system size 4 | 0.62 | 0.53–0.68 | 0.74 | 25.97 | 13.4% |
| system size 6 | 0.59 | 0.50–0.66 | 0.74 | 27.10 | 17.4% |
| shallow item mix (depth 1 half the block) | 0.56 | 0.46–0.62 | 0.70 | 27.25 | 17.4% |
| deep item mix (depth 3 half the block) | 0.62 | 0.54–0.68 | 0.74 | 26.27 | 12.5% |

## 9. Does the recommended size survive per-session re-keying?

A separate result on `feat/stage2-session-keying` (PR #51) found that drawing the hidden system at
session time — the fix for the scraping defect, where about a dozen items pin a shipped bank's system
for every future child — is not shippable for the CURRENT block: a draw served 28% of the bank and left
87.8% of the half-point rungs short of five items, because admissibility collapses with chain depth.

This section asks the same question of the rotating design. THE MEASUREMENT MATTERS BECAUSE ROTATION
HAS NO CHOICE: the k systems in a block differ only in which badge means which, so every result in §3
above was ALREADY produced under freshly drawn mappings — ten replicates × k draws apiece, against a
fixed pool. Re-keying is not an extra mechanism to bolt on here, it is what makes the block a rotation.
What is not yet established is whether the pool that supports it is a pool anyone can ship.

### 9a. Admissibility by system size and chain depth

PR #51's statistic, unchanged, so the numbers can be read against its. `relabellings on screen` is
the share of the free bijection family whose output for that item lands on one of its five options —
the rest cannot serve the item at all in that session. `reachable` counts how many DISTINCT options are
ever the key; PR #51's shippability bar is four of five, and an item well below it has an effective
guessing floor above 1/5 whatever its admissibility says.

Templates are 300 per (size, depth) cell, one depth deeper than the design serves so the curve
reaches where PR #51 measured 13.8%.

| size | mappings | depth | relabellings on screen | mean reachable | ≥4 of 5 reachable | key on one option |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 6 | 1 | **100.0%** | 3.00 | 0.0% | 33.3% |
| 3 | 6 | 2 | **100.0%** | 4.00 | 100.0% | 33.3% |
| 3 | 6 | 3 | **100.0%** | 2.00 | 0.0% | 50.0% |
| 4 | 24 | 1 | **100.0%** | 4.00 | 100.0% | 25.0% |
| 4 | 24 | 2 | **71.1%** | 5.00 | 100.0% | 23.5% |
| 4 | 24 | 3 | **83.4%** | 5.00 | 100.0% | 30.1% |
| 4 | 24 | 4 | **100.0%** | 2.00 | 0.0% | 50.0% |
| 5 | 120 | 1 | **100.0%** | 5.00 | 100.0% | 20.0% |
| 5 | 120 | 2 | **38.8%** | 5.00 | 100.0% | 26.2% |
| 5 | 120 | 3 | **29.2%** | 5.00 | 100.0% | 28.2% |
| 5 | 120 | 4 | **50.0%** | 5.00 | 100.0% | 20.0% |
| 6 | 720 | 1 | **83.3%** | 5.00 | 100.0% | 20.0% |
| 6 | 720 | 2 | **28.0%** | 5.00 | 100.0% | 24.1% |
| 6 | 720 | 3 | **16.6%** | 5.00 | 100.0% | 28.4% |
| 6 | 720 | 4 | **18.4%** | 5.00 | 100.0% | 25.7% |

PR #51 measured the SHIPPED FLU-OPCHAIN-01 bank — six operators, so the size-6 rows are the ones to
compare — at 78.2% / 25.7% / 13.5% / 13.8% for depths 1 to 4, with mean reachable 4.69 / 4.38 / 3.93 /
3.67. The share column reproduces that collapse closely, which is what licenses reading the rest of
the table. The reachable column does not, and should not be compared: this pool draws its slate from
the chain's reachable figures by construction (§2), so it loses options only to assignment collisions,
while the shipped generator's distractors are named partial rules and some are unreachable outright.

**The curve has two ends and only one of them is the failure PR #51 found.** Going deeper for a given
size collapses admissibility — that is its result. Going SHALLOWER for a given size eventually collapses
the number of distinct assignments instead: at size 3 depth 3, and at size 4 depth 4, every mapping is
admissible and the key still only ever lands on two of the five options, so the honest guessing floor is
0.50 rather than 0.20 and a client that knows the vocabulary can discard three options unseen. Reading
the share column alone would score those cells as perfect.

### 9b. What one draw actually supplies, against what a block spends

PR #51's verdict turned on ladder coverage: five items in each of forty half-point rungs, and a draw
left 87.8% of them short. A rotating block does not ask that. It asks for enough unseen servable items,
at the depths it serves, to reach mastery k times. So the supply is priced as a COUNT against
consumption. Pools here are the simulation's own (900 per depth, depths 1/2/3); 40 mapping draws.

| size | servable per draw | share of pool | thinnest depth | items a k = 5 block spends | headroom | worst key slot |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 2700.00 | 100.0% | 900.00 | 63.42 | 42.58× | 21.4% |
| 4 | 2295.30 | 85.0% | 645.42 | 63.42 | 36.19× | 22.4% |
| 5 | 1507.58 | 55.8% | 264.05 | 63.42 | 23.77× | 22.5% |
| 6 | 1151.33 | 42.6% | 149.03 | 63.42 | 18.15× | 22.4% |

`thinnest depth` is the smallest per-depth servable count, because a block that runs out of depth-3
items degrades into a shallower block rather than stopping, and that would show up as reliability
rather than as an error. `worst key slot` is the largest share of one draw's servable items keyed on a
single option position, over the draws — the shipped bank's round-robin cursor does not exist under a
session draw, so it is checked; 20.0% is balance.

### 9c. Is the half-point difficulty ladder still doing work?

Under the current block the score is the HEIGHT REACHED, so the rung an item sits on is the measurement
and the grain has to be fine. Under rotation the score is TRIALS TO CRACK, and what a trial has to do
is narrow the candidate set — a property of whether the item is determined, not of where it sits on a
ladder. Each row below serves the recommended k = 5 configuration from ONE depth only, or from a
restricted range, against the mixed default.

| item supply | ICC(1,1) | ICC 90% | rank recovery | mean trials | censoring |
| --- | --- | --- | --- | --- | --- |
| mixed default (depth 1/2/3 at 15/50/35) | 0.62 | 0.53–0.69 | 0.76 | 30.00 | 25.7% |
| depth 1 only | 0.65 | 0.56–0.71 | 0.76 | 30.00 | 28.9% |
| depth 2 only | 0.64 | 0.55–0.70 | 0.75 | 30.00 | 26.2% |
| depth 3 only | 0.65 | 0.56–0.71 | 0.76 | 29.98 | 23.7% |
| depths 1–2 only (the ≥38% admissible band) | 0.62 | 0.54–0.69 | 0.76 | 30.00 | 27.5% |

A single-depth supply is not merely tolerable, it is very slightly BETTER, and the likely reason is
mechanical rather than interesting: a homogeneous supply removes item-difficulty variation from the
within-child error, which is the denominator of the ICC. The intervals overlap throughout and no row
here separates from another; the finding is that the grain does not matter, not that flatter is better.

WHAT THIS CAN AND CANNOT SETTLE. This pool prices difficulty by chain depth alone. The shipped ladder
also prices the geometric-operator count and the distractor similarity, and those are not varied here,
so the rows above bear on whether the BLOCK needs a spread of rungs — not on whether the generator
should keep its finer levers for other purposes.


## 10. The comparison, in one place

| arm | trials | ICC(1,1) | rank recovery |
| --- | --- | --- | --- |
| current design: 1 system, 30 trials, per-primitive latency | 30.00 | 0.35 | 0.48 |
| 1 system, one crack-time only | 10.10 | 0.33 | 0.50 |
| **best rotating, budget-matched: k = 5** | 30.00 | **0.62** | 0.76 |

PR #42 measured the single-block acquisition-latency score at ICC 0.59 and rank recovery 0.71 on the
REAL FLU-OPCHAIN-01 bank against a fidelity ladder. The absolute values here are not comparable with
those — different population, synthetic pool, a block-level rather than a per-primitive criterion —
and only the rows of this table are comparable with each other.

Generated by `pnpm stage2:rotation`. Seeded, no wall clock, no network, no bank read or written.
