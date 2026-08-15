# Stage 2 — Per-Primitive Acquisition Latency versus the Fitted Slope

**Status:** Measurement comparison. **Nothing is built into the live block.** This document reports
what two candidate Stage 2 readouts do on the same simulated blocks, and recommends against building
the new one. No estimator, bank, generator, renderer or engine file changes behaviour. No decision is
recorded here; the recommendation awaits owner sign-off.

**Verdict up front.** Acquisition latency is measurably better than λ on this population — its
between-child variance is 1.43× its replication error against λ's 1.07, it recovers the known
ordering of the simulated learners at Spearman 0.71 against λ's 0.29, and it splits half at 0.92
against λ's 0.80. **It is still not worth building**, for three reasons that the same run establishes:
two-thirds of the average measured latency is the instrument rather than the learner; a plain count
of primitives demonstrated gets 99% of the benefit with none of the survival machinery; and block
accuracy, which needs no new machinery at all, beats both. The measure also fails hardest exactly
where Stage 2 matters most — at the top two standings its variance ratio is 0.26 and 0.01, because
the block never pins half the vocabulary there.

**Requirements served:** R5 (a decision-used measure must have a defensible relationship to what it
claims to measure — a readout whose between-child spread does not exceed its own error cannot carry
one), R6 (measure growth without a gifted-student ceiling — §7 is the ceiling, and it is where both
measures fail), R7 (auditable and falsifiable — the whole comparison is one seeded command), R10
(state the boundaries).

**Evidence and assumptions used:** E-095 and E-200 (recovery, attenuation, posterior SE and the
contamination floor of the fitted climb — E-200 is why λ's numbers here are read as an upper bound
on λ rather than a fair fight), E-210 (the intuitiveness audit that fixed the child screen these
blocks are administered through), E-075/E-076 (content-derivability, whose oracle is the same
implementation that computes identifiability here). Decisions honoured: D-S2-1, D-S2-2, D-S2-3
(the scrambled control is a binding gate, so §8 is not optional), D-030, D-200.
**New evidence entry: E-211.** **New assumptions: A-L1 through A-L5, §9.**

**In scope:** a per-primitive acquisition criterion with a stated and measured false-alarm rate;
identifiability-normalised latencies with censoring handled by survival methods; a like-for-like
variance decomposition against λ on identical blocks; the scrambled-arm control; and a
recommendation.

**Explicitly out of scope:** any change to `estimateLearningCurve`, `learningRateReadout`,
`nextBlockTarget`, the bank, the renderer or the live block; any reference distribution or banding;
any claim about real children.

**Reproduce:** `pnpm stage2:review:build && pnpm stage2:latency`. Fully seeded; 1,176 blocks in
about 11 seconds. Instruments: `research/exam-question-types/stage2-latency.mjs` (measurement),
`stage2-latency-responders.js` (the graded responder), `stage2-latency-report.mjs` (the grid).
Assertions: `apps/web/src/lib/exam/stage2-latency.test.ts`.

---

## 1. What was compared, and on what

Both readouts are computed from the same blocks. The blocks are produced by the real administration
path — `apps/web/src/lib/exam/phase2.ts` plus `@gt-selection/exam-{engine,scoring}` — over the
`FLU-OPCHAIN-01` two-arm bank, 30 scored trials after three unscored worked demonstrations.

**λ**, the incumbent: the posterior-mode slope of `theta(t) = theta0 + lambda·t` fitted by
`estimateLearningCurve` with the standing estimate as the `theta0` prior mean, exactly as the block
itself fits it.

**Acquisition latency**, the challenger: per primitive *i* of the six-badge vocabulary,

```
d_i  first trial at which i is uniquely determinable from the reveals this child has seen
k_i  first trial at which this child demonstrates knowing i, to the criterion in §2
L_i  = k_i − d_i
```

`d_i` comes from the learnability oracle already in the repository, which propagates every reveal
against all 720 badge→operator bijections and reports what a perfect reasoner could have determined.
It is an upper bound on what was available to be known, so `L_i` is never negative by construction.

### The population

Between-child variance is meaningless without a population that varies, and the harness shipped only
two responders — an exhaustive inducer and a uniform guesser. Those are endpoints, and a comparison
run on two points would be won by whichever measure saturates less. So a graded family was added
(`stage2-latency-responders.js`): the same induction model with an **encoding fidelity** φ, the
probability that a reveal is folded into memory at all. At φ = 1 it is byte-for-byte the harness's
existing `inductionResponder` — asserted in the test suite, not assumed. Lower φ arrives at each
primitive later without being worse at reasoning from what it has, which is the construct a learning
block claims to measure and is deliberately not the same thing as lower accuracy.

| responder | block accuracy | primitives its memory pinned | mean served difficulty | mean chain depth |
| --- | --- | --- | --- | --- |
| φ = 1.00 | 0.860 | 5.14 / 6 | 18.14 | 3.82 |
| φ = 0.50 | 0.799 | 5.13 / 6 | 17.10 | 3.68 |
| φ = 0.25 | 0.709 | 4.74 / 6 | 15.54 | 3.47 |
| φ = 0.15 | 0.588 | 3.42 / 6 | 14.42 | 3.30 |
| φ = 0.10 | 0.502 | 2.51 / 6 | 12.94 | 3.08 |
| φ = 0.06 | 0.407 | 1.14 / 6 | 12.02 | 2.95 |
| guesser | 0.211 | 0.00 / 6 | 8.90 | 2.37 |

A "child" is a (φ, standing) pair; replicate blocks are seeds. 6 fidelities × 7 standings = 42
children, 12 seeds each, plus the guesser, both arms: **1,176 blocks**.

**The absolute size of every between-child variance below is a property of this ladder, which this
workstream chose.** Spread the ladder and every measure's ratio rises. Only the comparison between
measures, on the same blocks, is interpretable — and that comparison is exact, because both readouts
see the identical item sequences and the identical responses.

---

## 2. The criterion, and why a guesser does not satisfy it

First-correct is not a criterion at a five-option floor: on these blocks it fires on 89–100% of
primitives for every responder including the guesser. What replaced it is a sequential log-odds test
over per-primitive evidence.

### The evidence unit

For a served trial whose chain contains badge *i*, enumerate every assignment of distinct operators
to that chain (at most 6·5·4·3 = 360) and record which on-screen option each produces. Then

- **pass** — the child's chosen option is reachable while holding *i* at its true operator;
- **fail** — it is not, so producing it requires *i* to be something else;
- **q** — the share of options that are reachable that way, which is exactly what a uniform guesser
  scores on that trial.

Two properties make this the right unit, and the second is why a fixed run length was rejected.

**It is sound.** A responder whose belief assigns *i* correctly generates its answer from an
assignment containing that operator, so its choice is a pass *whatever it believes about the other
badges in the chain*. Knowing one primitive is never punished for not knowing another. A raw
correctness criterion does exactly that, and on a bank whose mean chain depth is 3.8 it would be
measuring composition load and calling it acquisition. (Asserted exhaustively over the bank in
`stage2-latency.test.ts`.)

**It is calibrated per item.** `q` ranges from 0.2 to 0.8 across this bank depending on how many
distractors happen to fall outside the badge's reach. Three consecutive passes at q = 0.2 are 125:1
evidence; at q = 0.6 they are 4.6:1, which a guesser clears about one window in five. A fixed
"k consecutive" criterion treats those as the same observation, so it is not a criterion, it is a
lottery over which items the selection rule served.

### The test

Accumulate, over informative opportunities (0 < q < 1) after `d_i`:

```
pass:  + log((1 − lapse) / q)
fail:  + log(lapse / (1 − q))
```

and declare acquisition when the total crosses log(threshold). `lapse = 0.10` is P(a knower answers
outside the pass set) — generous on purpose, so one stray response is not disqualifying.
`threshold = 100`. Wald bounds the false-alarm probability under guessing at 1/threshold = 1% per
primitive.

### What it costs a guesser — measured, not asserted

Over 84 guessing blocks the criterion fired on **2 of the 499 deducible primitives it tested — 0.4%**,
inside the 1% bound and roughly 200× lower than first-correct on the identical trials. Two of 84
guessing blocks produced any event at all.

| responder | reached criterion | opportunities to criterion | first-correct would have fired on |
| --- | --- | --- | --- |
| φ = 1.00 | 83% (360/432) | 7.3 | 100% |
| φ = 0.50 | 79% (349/441) | 8.5 | 100% |
| φ = 0.25 | 65% (298/456) | 9.4 | 99% |
| φ = 0.15 | 46% (210/459) | 9.2 | 99% |
| φ = 0.10 | 34% (158/468) | 9.3 | 96% |
| φ = 0.06 | 22% (102/471) | 9.2 | 96% |
| guesser | **0.4%** (2/504) | 4.5 | 89% |

The threshold is a free parameter, so its effect is reported rather than defended:

| threshold | Wald bound | measured guesser rate | reasoner reached | reasoner mean L | learner censoring |
| --- | --- | --- | --- | --- | --- |
| 20:1 | 5.0% | 1.4% | 91% | 11.0 | 34% |
| 100:1 | 1.0% | 0.4% | 83% | 14.0 | 46% |
| 400:1 | 0.3% | 0.0% | 81% | 16.4 | 52% |

Loosening it buys shorter latencies and less censoring at a higher false-alarm rate; the conclusions
in §5 hold across the range.

---

## 3. Censoring, and the part of the sample that is empty

Every (block, primitive) falls into one of four states, and collapsing them would hide the problem:

| state | meaning | share of the 3,528 live-arm (block, primitive) pairs |
| --- | --- | --- |
| event | criterion reached; `L_i` observed | 42% |
| censored | deducible and tested, block ended first; `L_i >` block end − `d_i` | 49% |
| untested | deducible, but no informative item was served on it afterwards | 0.4% |
| not deducible | never pinned inside the block; **`L_i` does not exist** | 8% |

**The headline censoring rate is 54%** of deducible primitives across the whole live arm; **46%**
restricted to the learner population, and 17% for the perfect reasoner. Averaging only the primitives
that reached criterion would have reported 17.5 trials for a φ = 0.06 learner against the
censoring-correct restricted mean of 27.2 — a 36% understatement, in the direction the prompt warns
about, toward the fast.

Everything downstream therefore uses survival methods: Kaplan–Meier for the descriptive picture and a
censored log-normal AFT for the child-level score. Never a mean of the reached ones.

| responder | at risk | events | censoring | KM median | RMST(30) | mean of reached only |
| --- | --- | --- | --- | --- | --- | --- |
| φ = 1.00 | 432 | 360 | 17% | 15.0 | 16.7 | 14.0 |
| φ = 0.50 | 441 | 349 | 21% | 19.0 | 19.3 | 16.5 |
| φ = 0.25 | 456 | 298 | 35% | 23.0 | 22.1 | 18.1 |
| φ = 0.15 | 459 | 210 | 54% | not reached | 24.1 | 17.4 |
| φ = 0.10 | 468 | 158 | 66% | not reached | 26.0 | 18.5 |
| φ = 0.06 | 471 | 102 | 78% | not reached | 27.2 | 17.5 |
| guesser | 504 | 2 | 100% | not reached | 29.9 | 9.5 |

### Censoring by standing

| standing | never deducible | right-censored | usable latencies per block |
| --- | --- | --- | --- |
| 5 | 0% | 55% | 2.68 of 6 |
| 8 | 0% | 47% | 3.18 of 6 |
| 11 | 0% | 43% | 3.43 of 6 |
| 13 | 0% | 44% | 3.35 of 6 |
| 15 | 0% | 42% | 3.50 of 6 |
| 17 | **25%** | 48% | 2.36 of 6 |
| 19 | **44%** | 40% | 2.01 of 6 |

At standing 19 the measure has two observations per child to work with, and 44% of the vocabulary
has no onset to measure from at all. That is not censoring — it is absence, and a survival model
cannot repair it.

### The onset is not exogenous

The normalisation's whole claim is that subtracting `d_i` removes the "wasn't yet learnable"
confound. It removes it only partly, because `d_i` depends on which items were served, and which
items were served depends on the child's own answers through the adaptive targeting rule:

| responder | deducible primitives per block | mean onset `d_i` |
| --- | --- | --- |
| φ = 1.00 | 5.14 | 1.67 |
| φ = 0.25 | 5.43 | 1.98 |
| φ = 0.06 | 5.61 | 2.31 |
| guesser | 6.00 | 3.03 |

A faster child is served harder, deeper items, which pin fewer badges per reveal and pin them later —
so the quantity being subtracted is itself a function of performance, and it runs *against* the fast
child. This is a real limitation of the design as built, not of the idea: it would go away if the
selection rule targeted identifiability instead of difficulty, which would change what Stage 2
selects on and is therefore a design decision, not a bug fix.

---

## 4. Aggregation

Up to six latencies per child, and they are not independent: the mapping is a bijection, so pinning
five badges pins the sixth, and the constraint propagation couples the onsets. Whatever makes a child
slow on one primitive also makes them slow on the others.

The aggregation is a **log-normal accelerated-failure-time model with the child as a random
intercept**, fitted by marginal maximum likelihood with Gauss–Hermite quadrature over the random
effect. One latent per-child shift shared across that child's primitives; censored observations enter
through the survivor function; the child-level score is the posterior mean shift. That says the
coupling exists and absorbs it, where averaging the six would both discard the censoring and treat
the coupling as extra precision it has not earned.

Fitted over the live arm: within-child SD of log latency σ = 0.506, between-block SD τ = 0.510.
Running the identical model on the responders' **true** acquisition trials — which only a simulation
can see — gives σ = 0.927 and τ = 1.706, and that pair is carried through every table below as the
ceiling any behavioural criterion could reach.

**A caveat that runs in the challenger's favour and is priced in §5:** the AFT score is an empirical
Bayes estimate, so it is shrunk, and λ is not. The count of primitives reaching criterion is
shrinkage-free and lands within 0.01 of the AFT score on every headline statistic, which is the check
that the shrinkage is not doing the work.

---

## 5. The comparison

### 5.1 Between-child variance against within-child error — the number that decides it

A child is a (φ, standing) pair and replicates are seeds, so **within-child error is measured by
replication rather than estimated from a model**, and the identical one-way random-effects
decomposition applies to every row. `ratio` is between-child variance over single-block replication
error; below 1 two children cannot be told apart from one block each.

| measure | between-child var | within-child var | **ratio** | ICC(1,1) |
| --- | --- | --- | --- | --- |
| λ (fitted slope) | 0.0234 | 0.0218 | **1.07** | 0.52 |
| latency score (AFT) | 0.0918 | 0.0642 | **1.43** | 0.59 |
| latency score, TRUE acquisition — the ceiling | 1.6449 | 0.6164 | **2.67** | 0.73 |
| primitives reaching criterion (count) | 2.0941 | 1.4796 | **1.42** | 0.59 |
| block accuracy | 0.0365 | 0.0172 | **2.12** | 0.68 |

**Read this row by row.**

λ sits at 1.07: its spread across children barely exceeds the noise on a single block. That is the
published problem, reproduced here on the project's own bank.

Latency at 1.43 is a 34% improvement, and it is real. But the *count* of primitives demonstrated is
1.42 — statistically the same, with no survival model, no onset oracle and no censoring problem. And
**block accuracy is 2.12**, better than either, and it is already computed.

The ceiling row is the important one. Even with the true acquisition trials handed over — which no
child would ever expose — latency reaches only 2.67, below what accuracy already achieves. **The
criterion is not the bottleneck. The construct is.**

### 5.2 Why λ's 1.07 is worse than it looks

λ has an ICC of 0.52, so it reliably measures *something*. It is not learning speed:

| φ | accuracy | mean λ | mean latency score |
| --- | --- | --- | --- |
| 1.00 | 0.860 | 0.2046 | 0.483 |
| 0.50 | 0.799 | 0.3279 | 0.356 |
| 0.25 | 0.709 | **0.3371** | 0.189 |
| 0.15 | 0.588 | 0.2217 | 0.009 |
| 0.10 | 0.502 | 0.1921 | −0.133 |
| 0.06 | 0.407 | 0.0639 | −0.259 |
| guesser | 0.211 | −0.0772 | −0.622 |

λ is an inverted U in learning ability, peaking at φ = 0.25. The mechanism is headroom: a responder
that induces the system in the first few trials has nothing left to climb, so its fitted slope is
*smaller* than that of a responder who spends the block climbing. λ's replicable between-child
variance is largely variance in how much room the child had, not in how fast they moved.

### 5.3 Separation, in comparable units

AUC is the probability that a randomly drawn block from the first group scores more learner-like than
one from the second — unit-free, so scale points per trial and log trials compare directly. Blocks on
which a measure returns nothing are ranked last rather than dropped, because "produced no number" is
itself evidence.

| measure | reasoner vs guesser | reasoner vs φ = 0.06 | Spearman with φ, per block | within standing |
| --- | --- | --- | --- | --- |
| λ | 0.942 | 0.722 | 0.274 | 0.294 |
| latency score (AFT) | **1.000** | **0.959** | **0.670** | **0.709** |
| latency, TRUE acquisition | 1.000 | 1.000 | 0.883 | 0.886 |
| primitives reaching criterion | 1.000 | 0.927 | 0.605 | 0.657 |
| block accuracy | 1.000 | 0.962 | 0.705 | 0.769 |

Reasoner against guesser is the easy contrast and everything except λ is perfect at it. The
informative column is the ordering: latency recovers the known fidelity ladder at Spearman 0.71
within standing, λ at 0.29. Accuracy again edges latency out, at 0.77.

### 5.4 What a measured latency is actually made of

The model learner reports the trial at which its own memory pinned each primitive, so the measured
latency splits exactly into the learner and the instrument:

```
L_i = k_i − d_i  =  (t*_i − d_i)  +  (k_i − t*_i)
                     acquisition      detection lag
```

| responder | events | acquisition `t* − d` | detection lag `k − t*` | measured L | detection share |
| --- | --- | --- | --- | --- | --- |
| φ = 1.00 | 360 | 0.68 (SD 1.07) | 13.36 (SD 5.25) | 14.03 | **95%** |
| φ = 0.50 | 345 | 4.12 (SD 4.43) | 12.42 (SD 6.16) | 16.54 | 75% |
| φ = 0.25 | 276 | 7.96 (SD 6.92) | 10.02 (SD 7.29) | 17.97 | 56% |
| φ = 0.15 | 167 | 10.27 (SD 8.13) | 7.18 (SD 8.98) | 17.45 | 41% |
| φ = 0.10 | 98 | 9.07 (SD 6.88) | 9.58 (SD 8.50) | 18.65 | 51% |
| φ = 0.06 | 20 | 16.00 (SD 8.47) | 2.60 (SD 11.66) | 18.60 | 14% |

**Across the learner population, 67% of the average measured latency is the instrument** — the
detection term has SD 7.33 trials against the acquisition term's 6.62. A responder that acquires a
primitive within one trial of it becoming deducible is recorded at 14 trials, because that is how long
it takes to accumulate 100:1 evidence at a five-option guessing floor.

This is not a tuning problem. It is arithmetic: any criterion with a bounded false-alarm rate needs
several diagnostic responses, and the block serves about one informative opportunity per primitive
every two trials. Loosening the threshold to 20:1 cuts the reasoner's mean latency from 14.0 to 11.0
and raises the guesser's false-alarm rate to 1.4% — the detection floor moves, it does not go away.

### 5.5 Split-half within a block

λ is refitted on the odd and even trials keeping their original indices, so both halves stay in scale
points per trial. The latency criterion runs on the odd and even opportunities of each primitive's own
stream. The pooled column counts standing differences as agreement; the within-standing column removes
that and is the honest figure.

| population | measure | pooled r | within-standing r | within-standing Spearman–Brown |
| --- | --- | --- | --- | --- |
| learners | λ | 0.736 | 0.667 | 0.800 |
| learners | primitives reached | 0.847 | **0.855** | **0.922** |
| learners | mean latency, events only | 0.686 | 0.587 | 0.739 |

The count of primitives demonstrated is the most internally consistent statistic on the block. The
latency *value* is the least — 0.587 within standing, and that figure is flattered, because it can
only be computed on blocks where both halves produced an event, which is precisely the selection
§3 warns against.

---

## 6. The scrambled control arm

D-S2-3 makes the scrambled control binding, and the prompt is right that a latency measure producing
tidy numbers on an unlearnable system would be disqualifying. The check has to be run carefully,
because the obvious version of it is vacuous.

**The normalised measure is silent there, and that is an immunity rather than a result.** In the
`perTrial` arm the generator redraws the mapping every item, so no reveal constrains any later trial
and nothing is ever deducible. Across 588 scrambled blocks, **0 primitives had an onset**, so 0
latencies exist. The control cannot supply the measure with an input, so it cannot test it.

**The un-normalised version is not immune, and this is the real check.** Plain trials-to-criterion —
the same evidence test run from trial 1 with no onset subtraction, which is what any implementation
without a generator-side identifiability oracle is forced to use — fires **400 times across the
scrambled arm**, against 1,802 in the live arm.

| responder | live-arm events | scrambled-arm events | scrambled RMST(30) |
| --- | --- | --- | --- |
| φ = 1.00 | 443 / 504 | 25 / 504 | 29.5 |
| φ = 0.50 | 415 / 504 | 34 / 504 | 29.1 |
| φ = 0.25 | 339 / 504 | 60 / 504 | 28.4 |
| φ = 0.15 | 257 / 504 | 90 / 504 | 27.1 |
| φ = 0.10 | 200 / 504 | 81 / 504 | 27.7 |
| φ = 0.06 | 146 / 504 | 108 / 504 | 26.8 |
| guesser | 2 / 504 | 2 / 504 | 30.0 |

Every scrambled-arm event is a false positive: there is nothing there to acquire. Note the sign — the
*worse* learners generate more of them. A uniform guesser produces almost none (2 of 504), but a
responder holding a structured hypothesis that keeps being contradicted produces many, because its
choices stay inside the set of figures some mapping can reach, and that set overlaps heavily with the
pass set. **The un-normalised measure is fooled specifically by the child who forms a wrong theory and
sticks to it**, which is the realistic failure case rather than the convenient one.

That result is the strongest single argument in the normalisation's favour, and also the reason the
measure cannot be built without the oracle: the identifiability trace is not an optional refinement,
it is what stops the measure from reporting acquisition of something unlearnable.

For scale, λ over the same scrambled blocks: mean −0.05 to −0.10 by responder, with **11–23% of
blocks returning a 95% interval that excludes zero** — the block-level false-positive rate of the
incumbent under the same control.

---

## 7. High standings, where the block runs out of vocabulary

The learnability trace already recorded that at standings 17 and 19 only about half the vocabulary is
ever uniquely pinned. That does something sharper to a per-primitive measure than to λ: it removes
sample rather than precision.

| standing | deducible per block | usable latencies | λ ratio | latency ratio | oracle-latency ratio |
| --- | --- | --- | --- | --- | --- |
| 5 | 6.00 | 2.68 | 0.98 | 3.97 | 5.03 |
| 8 | 6.00 | 3.18 | 0.32 | 1.17 | 2.94 |
| 11 | 6.00 | 3.43 | 1.79 | 1.96 | 4.50 |
| 13 | 6.00 | 3.35 | 0.53 | 1.47 | 2.62 |
| 15 | 6.00 | 3.50 | 0.62 | 1.74 | 2.20 |
| 17 | 4.50 | 2.36 | 0.17 | **0.26** | 2.14 |
| 19 | 3.38 | 2.01 | 0.00 | **0.01** | 4.05 |

Latency beats λ at every standing. Both collapse at 17 and 19 — and the oracle row proves the
collapse is not the criterion's fault, because the true acquisition times still rank children fine
there (2.14 and 4.05). What fails is the *observation*: with two latencies per child, both heavily
censored, and the deepest chains in the bank making each response least diagnostic, there is not
enough evidence in 30 trials to detect the acquisition that did happen.

**This is the finding with the most product consequence in the document,** because GT applicants are
the high-standing case. Whatever readout Stage 2 uses, the block as currently configured does not
produce enough per-primitive evidence at the top of the scale. That is a statement about the bank and
the targeting rule, not about the choice between a slope and a latency.

---

## 8. Verdict

**Do not build the latency measure.**

It wins the comparison it was set: 1.43 against 1.07 on the variance ratio, 0.71 against 0.29 on
rank recovery, 0.92 against 0.80 on split-half. If the choice were only between a fitted slope and an
acquisition latency, latency is the better readout, and the reasons the prompt gave for expecting
that — no fitted form, an event-time observation, identifiability removable by construction — all
hold up.

It loses on everything else that matters:

1. **Two-thirds of a measured latency is the instrument.** At a five-option floor the detection lag
   is 13 trials for a responder that acquires in one. The signal is real but it is buried under a
   near-constant offset that varies with the item sequence, not the child.
2. **The count does the same job.** Primitives reaching criterion scores 1.42 against latency's 1.43
   and splits half at 0.92 against 0.74 for the latency value. It needs no AFT, no Kaplan–Meier, no
   censoring model — and being a count, it has no censoring problem to model. If the per-primitive
   criterion is ever built, build the count.
3. **Accuracy beats both**, at 2.12, and is already computed. See the caveat below before acting on
   that.
4. **It fails where Stage 2 is aimed.** Ratio 0.26 and 0.01 at the top two standings.
5. **It cannot be built without the oracle.** The identifiability normalisation is what keeps the
   measure honest in the scrambled arm; the implementable version without it produces 400 false
   acquisitions on a system nobody could learn, and produces more of them for worse learners.

**The caveat on accuracy, which matters more than the number.** Accuracy wins here partly because
every synthetic responder starts the block knowing nothing, so within a standing its block accuracy
*is* its learning. Real children will not start equal: prior exposure to similar puzzles, working
memory, and reading of the layout all move block accuracy without moving learning speed, and
separating those is the entire reason the design chose a rate over a level in the first place. So the
2.12 is not a licence to score Stage 2 on accuracy. It is evidence that **on synthetic responders no
readout examined here demonstrates a within-block learning construct that a level does not already
carry**, which is a different and more uncomfortable finding.

### What would have to be true in real children for the simulated advantage to survive

The comparison runs on synthetic responders. It can establish that a measure separates constructed
learners from constructed guessers and ranks constructed learners built to differ. It cannot
establish that it separates real children. For the latency advantage to transfer:

- **A-L1. Acquisition would have to be step-like per primitive.** These responders pin a primitive in
  one observation, which is Gallistel, Fairhurst & Balsam's abrupt case and is maximally favourable to
  a latency. If real acquisition is graded — partial credit, unstable retrieval, relearning — the
  criterion's detection lag grows and the advantage shrinks toward λ's.
- **A-L2. Real between-child spread in acquisition speed would have to exceed the detection floor.**
  The floor is ~13 trials on a 30-trial block. Children whose true acquisition times differ by less
  than that are indistinguishable however good the criterion.
- **A-L3. Children would have to start with no prior knowledge of the system.** A child who has met a
  similar transformation puzzle has small latencies that are not learning speed. Nothing in the design
  detects this, and it is the same confound that makes accuracy unusable.
- **A-L4. The onset would have to be closer to exogenous than it is here.** The adaptive rule hands
  faster children deeper chains that pin later, which pushes `d_i` in the wrong direction.
- **A-L5. There would have to be more per-primitive evidence at high standings than the bank
  currently produces.** At standing 19 the block yields two latencies per child.

None of A-L1 through A-L5 is testable without Gate B's ~128 real children, which the project has no
route to (STAGE2_QUESTION_DESIGN §10.2, New Question 1).

### What is worth doing instead

Stated as options, not as a decision:

- If a per-primitive readout is wanted, build the **count of primitives demonstrated**, not the
  latency. Same information on this evidence, an order of magnitude less machinery.
- The high-standing shortfall (§7) is a bank-and-targeting problem and is worth more than any
  readout change: at standings 17 and 19 the block leaves half the vocabulary unidentified, which
  caps every measure at once.
- The identifiability oracle earns its keep regardless. §6 shows it is what separates "acquired" from
  "produced a plausible answer to something unlearnable", and that is a property no readout gets
  without it.

---

## 9. Claim boundaries and new assumptions

Every number in this document comes from synthetic responders answering a born-synthetic, ungated
bank (`syntheticOnly = true`, `validated = false`) whose `difficulty` values are design rungs and not
calibrated IRT parameters. **Nothing here is a learning rate, and nothing here is evidence that a
child learns anything.**

Both readouts were computed from the same blocks, so the comparison between them is internally fair.
Neither has been shown to separate real children. The population that produced the between-child
variance was constructed by this workstream, so absolute ratios are not interpretable; only their
ordering is.

λ's figures should be read as an *upper bound* on λ, not as a fair fight in its disfavour: E-200
records that the fitted climb carries a contamination floor of roughly 0.01–0.02 scale points per
trial for a responder that learned nothing, because the targeting loop reads its own difficulty walk.
That contamination is present in the λ column here and inflates its between-child variance rather
than deflating it.

**New assumptions opened:** A-L1 through A-L5 above, all open, none testable without real children.

**Governance:** evidence entry E-211 records the measurement. No decision is recorded and no
traceability entry changes, because no product behaviour, scope or direction changes — this
workstream recommends *not* building the thing it evaluated, and that recommendation awaits owner
sign-off.
