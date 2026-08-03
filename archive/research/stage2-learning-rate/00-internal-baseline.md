# Stage 2 learning-rate metrics — internal baseline

**Purpose.** The anchor for the external research lanes in this directory. Everything below is
already measured, decided, or written down inside this repository. The research lanes exist to
answer what this baseline leaves open; they should be read against it, not instead of it.

**Status of this file:** a summary of existing repo state, with pointers. It ratifies nothing.
Every figure here is traceable to an `E-###` entry in `docs/research/ASSUMPTIONS_AND_EVIDENCE.md`
or a `D-###` entry in `docs/governance/DECISION_LOG.md`.

---

## 1. What the block is, as built

- **Phase 1** finds a per-area standing level (θ on a `[1,20]` difficulty scale) by two-sided
  bracketing, stopping when the area estimate settles (D-030 part 1).
- **Phase 2** administers **~30 novel items in ONE area**, policy-fixed for every child, only
  after that area's estimate has settled and the pool holds ≥30 unseen items. Every item is
  stage-marked `'learning'`, server-side, so a client cannot relabel its own trace into the fit.
- **The estimator** (`packages/exam-scoring/src/learning-curve.ts`) fits, by MAP:

      P(correct | difficulty b, trial t) = g + (1-g) / (1 + exp(-slope * (theta0 + lambda*t - b)))

  λ is in **scale points per trial**. Reporting goes through `learningRateReadout`, which returns
  `below | typical | above | indeterminate` and refuses to name a band when the posterior is too
  wide (D-030 part 3).
- **Items are five-option multiple choice** (mixed 4/5/6 on the wired bank), no feedback in the
  block as originally specified. `STAGE2_QUESTION_DESIGN.md` §1.5 has since argued feedback is
  *unavoidable* and specifies a minimal defensible form; that is design, not yet measurement.

## 2. What has been measured

### 2.1 The estimator was manufacturing a rate (E-200, fixed under D-200)

The shipped estimator assumed **no guessing floor** against five-option items. Over 400 simulated
children per cell at 30 trials, **all with λ_true = 0 — no learning at all**:

| arm | fitted λ̄ | false `above` |
|---|---|---|
| shipped estimator, ideal grid | **0.0398 ± 0.0043** | 32.8% |
| shipped estimator, `FLU-MATRIX-01` | **0.0547 ± 0.0049** | 48.8% |
| floor corrected in fit *and* targeting, grid | 0.0098 ± 0.0033 | 14.0% |
| **difficulty frozen at `standing + 1`** (loop broken, fit still misspecified) | **0.0018 ± 0.0023** | 6.0% |

**The mechanism is the closed loop, not the fit.** The inflated fit raises `theta0`,
`nextTargetTheta` aims higher, and the fit then reads its own rising difficulty walk as a climb.
The fit alone is approximately unbiased and mildly *negative*. This is the single most important
internal finding: **adaptive difficulty targeting and slope estimation are coupled, and the
coupling generates signal out of chance successes.**

### 2.2 Correcting it is necessary but not sufficient (E-200)

Post-fix recovery at 30 trials is r = 0.254 (grid) / 0.249 (wired bank), against the r = 0.448
that E-095 published for a *constructed-response* responder with no floor. Roughly half.

### 2.3 A purpose-built bank closes the bank gap, and it is not enough

`FLU-OPCHAIN-01` was built for exactly this measurement. At 30 trials it is **statistically
indistinguishable from an idealised 0.5-point grid with no bank involved** (paired r difference
−0.002 ± 0.006 over 8 seeds) and clearly beats `FLU-MATRIX-01` (+0.047 ± 0.010). That is the
ceiling a bank can deliver. On it:

- a cohort that learned nothing still fits **λ̄ = 0.0097 ± 0.0011 — 8.6 MC SEs from zero** over
  3,200 children;
- recovery is **r = 0.332**;
- against the **SD-0.03** reference the project's own synthetic work used, **every arm at every
  length from 30 to 60 trials is 100% indeterminate — before and after the fix**.

**Therefore the residual is an estimator-and-loop property, and no bank can remove it.**

What the bank does buy is length-efficiency: paired advantage over `FLU-MATRIX-01` grows to
**+0.137 at 45 trials and +0.240 at 60**.

### 2.4 The reference distribution is unknown

`LearningRateReference` has **no defaults** and must be supplied by the caller: mean, SD, and now
(D-200) a **required measured `contaminationFloor`**. There is no K-8 data on how much children
actually differ in λ. `r` is not a property of the estimator alone — at an assumed spread of
SD 0.10 the same 30-trial block reaches r = 0.885, at SD 0.03 it resolves nobody.

## 3. What has been decided

| ID | Substance | Status |
|---|---|---|
| **D-030** | Learning rate is one session-level figure over ONE area, reported as an ordinal band or not at all; `indeterminate` is first-class | Proposed, awaiting ratification |
| **D-200** | The fit assumes the item format's chance floor; no band may be named without a **measured** contamination floor; separability tested against posterior SE **plus** that floor | **Approved** 2026-07-30 |
| **D-S2-1..4** | Stage 2 question design, incl. the **scrambled-system control** as the binding acceptance gate | Recorded |

Reproduction: `pnpm exam:block-harness -- --guessing-probe | --fix-probe | --calibrate`.

## 4. The construct we are actually chasing

**E-098 (company claim, Crystal Martel interview 2026-07-23):** the "speed" GT values is *the rate
of absorbing and adapting to new information — mastering a concept in ~1–2 exposures, then
advancing* — plus fast pattern/spatial recognition and relational connection-drawing. Explicitly
**not** raw response latency.

Worth stating plainly, because it may be the crux: **GT's own description of the construct is a
trials-to-mastery quantity ("1–2 exposures"), and we are fitting a continuous slope.** Whether the
target quantity is mis-specified — not merely badly estimated — is a question for the research
lanes, particularly the graduated-prompt and trials-to-criterion traditions.

## 5. Constraints any proposal must satisfy

1. **Auditable and replayable** (R7) — a rate must be recomputable from the stored trace; a session
   must replay from its own recorded state.
2. **Fair at the cut** — the top 1–2% decision boundary is where subgroup error must be checked,
   not the mean.
3. **Born-synthetic today** — the bank is `syntheticOnly=true, validated=false`; every difficulty
   is design-estimated, not calibrated. Recovering an injected climb from responses generated by
   that same climb is **circular** and establishes only estimator correctness.
4. **Child time is the scarce input** — 30 items in one area already competes with Phase 1's
   ~30-item battery for a K-8 attention span.
5. **A real-data path exists but is not yet delivered** — E-100: GT has committed to dummy-testing
   its ~46 GT School students (≤45 min) plus every student's CogAT and MAP screeners. That is the
   only route to a real reference distribution, and it is small.

## 6. What the research lanes must answer

1. Is an individual-level learning rate from ~30 binary trials **identifiable in principle**, or
   are we asking for something the information does not support? (Lanes 01, 03)
2. Is a **linear climb** the right functional form, and is a slope the right quantity at all —
   versus trials-to-criterion, prompts-to-criterion, transfer, or savings? (Lanes 02, 04)
3. Does the field consider a **no-feedback** novel-item block a learning measurement, or just a
   harder static test? (Lane 02)
4. Which **design levers** raise recoverability, and does the adaptive targeting loop have to go?
   (Lane 05 — note §2.1 has already isolated the loop as the contamination mechanism.)
5. What must be demonstrated before a learning-rate figure may **gate an admissions decision**,
   and what is the responsible fallback if it never clears that bar? (Lane 05)

---

## 7. Cross-checks of lane findings against this codebase

Recorded as lanes report, so a literature mechanism is never adopted without checking whether it
actually describes our implementation.

### 7.1 Lane 03 mechanism "one-sided constraint" — DOES NOT APPLY (checked 2026-07-31)

Lane 03 reports that PFA clamps its learning-rate term at ≥ 0 ("bounded to a minimum of 0 γ to
prevent over fitting from resulting in negative learning rates"), and that Käser et al. found
unconstrained AFM fits positive rates for 54% of skills against 100% for constrained variants — a
one-sided constraint gives `E[λ̂ | λ=0] > 0` by construction, with the apparent significance growing
as √N. That is a candidate explanation for an 8.6-MC-SE floor.

**It is not ours.** `packages/exam-scoring/src/learning-curve.ts` is symmetric on both counts:
`priorLambdaMean` defaults to **0** with `priorLambdaSd` **0.15**, and the Fisher-scoring update
clamps to `[-LAMBDA_BOUND, +LAMBDA_BOUND]` = **[−1, +1]**. Nothing forbids a negative rate.

Our own measurement agrees and settles it: with the targeting loop frozen, the same misspecified
fit returns **−0.0006 ± 0.0023** (and −0.0034 ± 0.0029 with the floor corrected) — a *negative*
central estimate, which a one-sided constraint could not produce. See E-200.

### 7.2 Lane 03 mechanism "curvature" — cannot explain the NULL cohort

A linear fit to a concave curve read over early opportunities inflates the slope (lane 03 cites a
median +118% inflation in slope SD when iAFM is truncated at 10 opportunities). This is a real
exposure for children who *are* learning — it bears on attenuation and on E-095's claim boundary
that "if the functional form is wrong the recovered slope is a summary of the wrong curve."

It does **not** explain the contamination floor, because the contaminated cohorts have
**λ_true = 0**: there is no curve for a straight line to mis-approximate.

### 7.3 Lane 03 mechanism "position–difficulty coupling" — CONVERGES WITH E-200

Lane 03 cites Effenberger, Pelánek & Čechák (LAK '20) obtaining an *increasing* marginal learning
curve purely from item-ordering bias, **under the true generating model**, and notes that λ is the
only term in `θ0 + λt` able to absorb monotone drift in item difficulty.

This is independent external corroboration of E-200, which isolated the same mechanism by
measurement rather than by argument: freezing served difficulty at `standing + 1` collapses the
null-cohort fit from λ̄ = 0.0398 to 0.0018 without touching the fit. **Two lines of evidence, one
internal and one external, now name the adaptive targeting loop as the contamination source.**

### 7.4 The information-ceiling arithmetic — the number that matters most

Lane 03 derives (flagging the arithmetic as its own, from Koedinger et al., PNAS 2023, where the
median between-student learning-rate IQR is 0.018 log-odds against 0.830 for the intercept, with
feedback and ~200 observations per student): SE(λ̂) ≈ 0.046 at 30 trials against a true rate SD of
≈ 0.013 predicts **r ≈ 0.28**. We measure **r = 0.332** on a purpose-built bank at the ideal-grid
ceiling.

If that holds, our estimator is not underperforming — **it is at the information ceiling**, and the
implied lengths are ≈68 trials for reliability 0.5 and ≈109 for 0.8. To be verified against lane 01
independently, since the whole calculation is hostage to the true between-child rate SD, which is
exactly the quantity nobody has measured in K-8 children (§2.4).

**Corroborated by lane 01, from a different direction and slightly more pessimistic.** Willett's
growth-rate-reliability identity (restated as Eq. 8 of Brandmaier et al. 2018, full text retrieved)
governs: `GRR = σ²_slope / (σ²_slope + σ²_ε / SS_T)`. Estimability is set by **between-person slope
variance**, not by test quality or trial count. With SS_T = 2247.5 for 30 contiguous trials and
σ²_ε = 1/I from a 1PL with a 0.2 floor (I ≈ 0.17 on target, 0.094 above level), against the same
Koedinger spread, lane 01 gets **GRR 0.036–0.063, i.e. r = 0.19–0.25** — reached from IRT
information rather than from slope variance alone. Two independent derivations, 0.19–0.28.

### 7.5 Our simulations assume a between-child spread ~2.3× the only empirical anchor (checked 2026-07-31)

E-095's reproduction path and `scripts/exam-learning-block-harness.ts` both draw
**λ ~ N(0.06, 0.03²)** (`NARROW_REFERENCE = { mean: 0.06, sd: 0.03 }`). Lane 01's derivation from
Koedinger et al. (PNAS 2023) puts the empirical between-student rate SD at **≈ 0.0133**
(IQR 0.018 log-odds ÷ 1.349).

The units correspond because `learning-curve.ts` fixes `slope: 1.0`, at which **one scale point is
one logit** (stated in its own docblock), so scale-points-per-trial and log-odds-per-opportunity are
the same quantity here. That correspondence should be re-checked by the measurement owner before
this is relied on, since it is the hinge of the comparison.

**Consequence: every recovery figure this project has quoted — r = 0.448, r = 0.332, the whole
ladder — is measured at a between-child spread more than twice the best available empirical
estimate, and is therefore optimistic.** E-095 already flagged that `r` is not a property of the
estimator and moves with the assumed spread (at SD 0.10 it reaches 0.885). What is new is that the
spread is no longer merely *unknown*: there is now an anchor, and it sits **below** what we assumed.
Lane 01 raises exactly this to explain why our measured 0.33 exceeds its own 0.19–0.25 ceiling.

**This is the highest-value open question in the whole exercise**, because it decides whether the
block is short or whether the construct is thin. It is checkable today with no new data:
re-run `pnpm exam:block-harness -- --calibrate --guessing 0.2` with `lambdaSd` at 0.0133.

### 7.6 The one cheap lever found so far: mass the trials at the ends

`SS_T` — the sum of squared deviations of trial index about its mean — is what the GRR denominator
divides by, and it is maximised by placing observations at the **extremes** rather than spreading
them evenly. Lane 01: 30 contiguous trials give SS_T = 2247.5; **two blocks of 15 at the ends give
6307.5 (2.8×)**, taking r from ≈0.25 to ≈0.40 **with the same 30-item budget**.

Three independent lines now point at the same shape: this, Embretson's MRMLC two-condition
structure (lane 01), and lane 04's ranked candidate #4 ("dual baseline: drop block 1, score block
2"). Note the tension to resolve before adopting it: massing at the ends buys slope precision, while
lane 04 wants the first block *discarded* as practice — those are different uses of the same split.
