# Stage 2 serve-time materialisation — FLU-OPCHAIN-01

seed: STAGE2_SERVE_TIME_MATERIALISATION|v1
shipped bank: 468 items   templates: 336   sessions drawn: 8

Everything below is born-synthetic and ungated. No figure here is evidence about a child.

## §1 Admissibility — is the answer on screen?

### The shipped bank, re-keyed (PR #51 Failure B)

| chain depth | items | difficulty span | mappings landing the key on screen |
| --- | --- | --- | --- |
| 1 | 98 | 1.01 – 5.29 | **83.3%** |
| 2 | 116 | 4.03 – 11.14 | **29.9%** |
| 3 | 118 | 8.03 – 16.54 | **18.0%** |
| 4 | 136 | 12.03 – 19.99 | **18.4%** |

Definition, because it is not interchangeable with the recorded figure. A mapping "lands the key on
screen" when the figure the badge chain produces under it is shown by SOME option of the baked
slate — not necessarily the option the bank records as the key. Measured over all 720 bijections
exactly, not sampled. This is an independent implementation and it does not reproduce D-206/E-205’s
78.2% / 13.8% to the decimal: it reads about 5 points higher at both ends on the same bank, whose
difficulty spans do match cell for cell. The direction and the magnitude are the same finding —
admissibility collapses with depth to under a fifth of mappings — but the two numbers are not
interchangeable and the recorded pair is the one on the register.

### The materialised path

| chain depth | items served | key on screen | templates excluded |
| --- | --- | --- | --- |
| 1 | 144 | **100.0%** | 0.0% |
| 2 | 360 | **100.0%** | 0.0% |
| 3 | 468 | **100.0%** | 2.5% |
| 4 | 321 | **100.0%** | 10.8% |

Exclusions, by reason:
  geometric-part-cancels-under-this-mapping: 39
  chain-is-a-no-op-under-this-mapping: 12

## §2 The difficulty-ordinal slot attack (F7b)

| target | slot from the difficulty ordinal | its permutation null | lift over the null | modal slot |
| --- | --- | --- | --- | --- |
| shipped bank (468 items) | **60.7%** | 22.2% | **+38.5** | 20.1% |
| materialised session (30 trials) | 29.2% mean, 33.3% worst | 30.0% | **-0.83** | 28.8% |

Floor for a five-option item: 20.0%. The NULL is the column to read against, not the floor: the attacker fits one integer (which offset of `rank mod 5` to play) and keeps the
best of five, which on 30 trials scores well above chance on data with no pattern in it. The null
shuffles the slots against the difficulty order, preserving both marginals and destroying only
their association, so a served figure AT its null has no recoverable ordering left in it.

Key-slot marginal over every materialised item of every drawn session: A 18.9%  B 20.8%  C 20.9%  D 20.0%  E 19.4%

## §3 Relabelling invariance of difficulty

templates compared across 8 drawn mappings: 336
structural levers (chain length + vocabulary): moved on **0.0%** of templates, max drift 0.000
total difficulty, which §3 says SHOULD move with the mapping through residual ambiguity: mean 0.27, p95 0.48, max 0.48

## §4 R7 replay from the session seed

| session seed | trials | ledger reproduced exactly |
| --- | --- | --- |
| session|672973442 | 30 | **yes** |
| session|503235402 | 30 | **yes** |
| session|383962260 | 30 | **yes** |
| session|455304412 | 30 | **yes** |
| session|406904165 | 30 | **yes** |
| session|293705970 | 30 | **yes** |
| session|821671190 | 30 | **yes** |
| session|252031940 | 30 | **yes** |

## §5 What the new model reaches, and what it costs

reachable difficulty at trial 1: 9.09 – 18.00
top of the reachable window: 18.00 at trial 1, 12.04 at the last trial
mean distinct difficulties offered per trial: 27.7
|difficulty - target|: mean 0.38, p95 0.97, max 1.03; within the 0.25 selection tolerance on **46.7%** of trials
0.5-point rungs never reachable at any trial of any session: 11 (1, 1.5, 2, 2.5, 3, 3.5, 6.5, 18.5, 19, 19.5, 20)

THE CONFOUND §3 OF THE SPEC DOES NOT MENTION. Two of the four levers move monotonically with
trial index by construction — evidence only accumulates and residual ambiguity only shrinks — so
the price of an unchanged item FALLS as the block runs. Measured on the whole unserved pool, which
has no selection in it, the mean price goes from 14.17 at trial 1 to 8.90 at the last, r = -0.794 against trial index.
That collides with how the climb is fitted: `estimateLearningCurve` takes difficulty as the item
covariate, and a covariate that declines with trial index by construction absorbs part of the very
climb it conditions on. `levers.structural` is recorded for that reason and is the covariate a fit
should use. Naming the threshold at which this stops being acceptable is not this branch’s call.

## §6 The served payload

no key material: 18 forbidden tokens checked, 0 present
