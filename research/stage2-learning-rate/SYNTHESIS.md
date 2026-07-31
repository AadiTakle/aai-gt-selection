# Stage 2 learning-rate metrics — synthesis across five research lanes

**Date:** 2026-07-31 · **Status:** research aggregation. Ratifies nothing, decides nothing.
**Inputs:** `00-internal-baseline.md` (repo state) and lanes `01`–`05` in this directory.
**Method note:** DOK-3 insights and DOK-4 spiky points of view are reserved for the human owner
under the BrainLift method. Nothing below is written as an owner stance; the closest this file comes
is §4, which lays out options and their costs so the owner can take one.

---

## 1. Bottom line

Five lanes searched five separate literatures — change psychometrics, dynamic assessment, learning
analytics, cognitive-science learning curves, and optimal design — without seeing each other's
work. They converged on four points. **None of the four is that our estimator is badly written.**

1. **The information is not there at 30 contiguous trials.** Two independent derivations put the
   ceiling at r ≈ 0.19–0.28. We measure 0.332 — *above* both, because our simulations assume a
   between-child spread ~2.3× the only empirical anchor.
2. **The contamination is the closed targeting loop**, and the design literature has a formal name
   for it: endogeneity of a locally-optimal design.
3. **A slope is the wrong quantity.** No field that measures learning reports one. The
   quantities that work are levels, counts, and categories.
4. **Where a rate is genuinely needed, the design fix is to separate the observations**, not to
   lengthen the block.

## 2. The four convergences

### 2.1 An information ceiling near r ≈ 0.2–0.3, reached three ways

| Route | Source | Result |
|---|---|---|
| Empirical rate spread | Lane 03, from Koedinger et al. (PNAS 2023): between-student rate IQR 0.018 log-odds vs 0.830 for intercept | predicted **r ≈ 0.28** at 30 trials |
| Growth-rate reliability + IRT information | Lane 01, Willett's GRR identity as Eq. 8 of Brandmaier et al. (2018): `GRR = σ²_slope/(σ²_slope + σ²_ε/SS_T)` | **r = 0.19–0.25** |
| Our own simulation | E-095/E-200, purpose-built bank at the ideal-grid ceiling | r = 0.332 |

**Why ours is the highest of the three, and why that is bad news rather than good.** Both E-095's
reproduction path and the harness draw **λ ~ N(0.06, 0.03²)**. Lane 01's empirical anchor is
**σ_slope ≈ 0.0133**. We have been simulating children who differ from each other more than twice as
much as the only real data suggests they do. Every recovery figure the project has quoted is
therefore optimistic (see `00-internal-baseline.md` §7.5, including the unit caveat that must be
re-checked).

The governing identity says estimability is set by **between-person slope variance** — a property of
children, not of our instrument. That is the crux: if children's learning rates genuinely differ as
little as Koedinger's data suggests, no estimator and no bank recovers them from one short block.

### 2.2 The closed loop is the contamination, named formally

E-200 isolated this by measurement: freezing served difficulty at `standing + 1` collapses the
null-cohort fit from λ̄ = 0.0398 to 0.0018 without touching the fit. Two lanes independently explain
the mechanism:

- **Lane 03** — Effenberger, Pelánek & Čechák (LAK '20) obtained an increasing marginal learning
  curve purely from item-ordering bias *under the true generating model*; λ is the only term in
  `θ₀ + λt` that can absorb monotone drift in difficulty.
- **Lane 05** — optimal designs for IRT are only **locally** optimal: they depend on a guessed
  parameter value. When the guess is the very estimate the design informs, the design is
  **endogenous**. Our 0.0398 → 0.0018 is that endogeneity, not a bug.

Lane 05 adds the deeper point: **estimating a slope is a c-optimality problem, while adaptive
targeting solves a D-optimality problem** (Mathew & Sinha, 2001), and the Fisher-information
tracking optimality theorem is explicitly about a **static** parameter. Targeting is optimal for the
wrong quantity. Berger's classic result places items at the ability mode; the growth problem does
not — Bjermo (2025) shows the variance-minimising growth design is a **three-point structure**:
anchors near centre, each occasion's items **symmetrically offset either side**, the offset widening
as true growth grows. Classical 2PL slope design agrees: support at p ≈ .18/.82.

### 2.3 Nobody who measures learning reports a slope

- **Lane 02** — Grigorenko (2009, full text retrieved): there is *"no preferred or recommended
  approach to quantifying change within DT/A,"* and she recommends **post-test performance instead
  of gain**. Campione scores hint count; Budoff and Guthke score post-test level; Budoff's strongest
  result (n=627) is the stability of a **level**. Feuerstein's qualitative profile has the weakest
  evidence.
- **Lane 04** — of eleven candidate quantities ranked for our constraints, **the top four are
  levels, categories, or design changes; every rate-of-change quantity ranks 5th or below.** Our
  fitted λ ranks **6th**, with the note that it is "largest for the weakest children, so it survives
  without being useful."
- **Lane 03** — the rate carries ~46× less between-student variance than the intercept
  (0.018 vs 0.830 log-odds), which is the same fact in a third vocabulary.

### 2.4 If a rate is required, separate the observations — do not lengthen the block

Four independent routes to one design:

| Source | Statement |
|---|---|
| Lane 01 | `SS_T` = 2247.5 for 30 contiguous trials; **two blocks of 15 at the ends = 6307.5 (2.8×)**, r ≈0.25 → ≈0.40, same 30 items |
| Lane 05 | Brandmaier, Lindenberger & McCormick (2024): study **span enters effective error quadratically, wave count only linearly** — two separated short blocks beat one 60-trial block |
| Lane 04 | Ranked candidate #4, "dual baseline": discard block 1 as practice, score block 2 |
| Lane 01 | Embretson's MRMLC is structurally a **two-condition** model |

**This is the single most actionable finding in the exercise**, and it costs no additional child
time. Note the unresolved tension: lane 01 wants both blocks *scored* (to maximise the lever arm),
lane 04 wants block 1 *discarded* (to kill practice and regression artifacts). Same split, opposite
uses. That is a decision, not a detail.

## 3. What is no longer arguable

- **"λ is unidentifiable" is the wrong defence.** Beck & Chang's (2007) unidentifiability result was
  corrected by Doroudi & Brunskill (EDM 2017) — it conflated marginal with joint distributions, and
  BKT is identifiable from three sequential observations. A 2-parameter growth curve over 30 trials
  is strictly easier. The right name for our problem is **semantic model degeneracy**: a mismatch
  between the true form of learning and the model form.
- **A linear climb is not defensible as a measurement.** No camp proposes linearity; the candidates
  (power, exponential, delayed-exponential) all decelerate, and individual-level evidence favours
  discontinuous, step-like change. Linear terms have one legitimate role — *estimated* to absorb
  noise bias — which makes λ a nuisance parameter, not a reportable rate.
- **Our block is not a dynamic assessment.** Under all five traditions mediation is definitional.
  Swanson & Lussier define DA as change *"when feedback is provided,"* explicitly contrasted with
  tests where *"the examiner gives no feedback."* Without it we have an above-level static test.
  Corollary from Caffrey/Fuchs/Fuchs: validity was better with **non-contingent** (standardised)
  feedback — zero feedback is not the limiting case of good feedback, it is off the scale.
- **Two of the three mechanisms proposed for our contamination floor do not apply to us**
  (`00-internal-baseline.md` §7.1–7.2): our prior is symmetric and λ is clamped two-sided, and
  curvature cannot bias a cohort whose true λ is zero.

## 4. Options, with what each costs and buys

Presented for the owner to choose between; not a recommendation.

| | Option | Buys | Costs | Evidence standing |
|---|---|---|---|---|
| **A** | **Open the loop.** Replace adaptive targeting inside the block with a pre-registered two-sided offset schedule (Bjermo's three-point shape) | Removes the measured contamination mechanism | Zero child time, low build | Strongest-supported single change (lane 05 + E-200) |
| **B** | **Split the block**, 15 + 15 at separated points | r ≈0.25 → ≈0.40 on the same item budget | Session restructuring; must settle the score-both vs discard-first tension | Four independent routes (§2.4) |
| **C** | **Stop reporting a rate; report the above-level level.** Keep the block, score it as post-test performance | Lands on what every adjacent field actually reports; no shape assumption, no second occasion | Abandons the learning-rate claim as a *per-child* output | Lane 02 (Grigorenko), lane 04 (#1 of 11) |
| **D** | **Add standardised, non-contingent feedback or a hint ladder**, and score hints-to-criterion | The only quantity matching GT's own stated construct (E-098: "1–2 exposures") | A different instrument; new build; changes the child's experience | Lane 02, lane 04 (#2 of 11) |
| **E** | **Cohort-level only.** Order a measured cohort; refuse per-child reporting | Survives at current precision — already what `learningRateCohortRank` does | No individual learning-rate figure for an admissions decision | E-095's own conclusion, unchanged by this research |

A, B and C are compatible with each other. D is a product decision, not a scoring decision.

## 5. Verification gaps — do not treat these as established

1. **Calero et al. (2011)** — the "gifted children gain *similarly*" claim is **unsupported**. The
   abstract reports significant intergroup differences in Learning Potential and does not decompose
   level vs gain; secondary reviews cite it as *supporting* dynamic testing for gifted ID. Two
   separate agents were blocked from the full text. Retrieve doi:10.1016/j.lindif.2010.11.025
   (3 tables) before use. Annotated in lane 04.
2. **Embretson's MRMLC precision figures** — no reported SE or reliability for the change parameter
   could be verified in Embretson 1991/1992/1995 or Wang et al. 1998; abstracts claim only "good
   recovery." MRMLC also requires a **manipulation between conditions**, which our block does not
   have. This is the strongest counter-position to §2.1 and it is currently unexamined.
3. **The unit correspondence** between scale-points-per-trial and log-odds-per-opportunity rests on
   `slope: 1.0`. The whole cross-literature comparison hinges on it.
4. **`lambdaSd`** — our optimism is quantified but not yet re-measured. One command:
   `pnpm exam:block-harness -- --calibrate --guessing 0.2` with `lambdaSd` = 0.0133.
5. **DIF on a slope has no retrieved precedent** for ELL or device-familiarity subgroups. Kim &
   Willson (2014): **loading noninvariance biases the growth rate; intercept noninvariance biases
   the baseline** — so a clean DIF screen on θ₀ licenses *nothing* about λ. That evidence would have
   to be **generated by us, not cited.**
6. Several sources across lanes are abstract-level only; each lane marks its own.

## 6. Claim discipline

Unchanged by this research, and reinforced: no learning-rate band may be named without a measured
contamination floor (**D-200**, approved). Nothing here supports calling the block a measure of
learning, learning potential, or program benefit. What the research adds is that **the honest
fallback is not "report it more cautiously" — it is to report a different quantity.**

## 7. Cheapest next experiments

1. Re-run the recovery ladder at `lambdaSd` = 0.0133 (§5.4). Settles whether the block is short or
   the construct is thin. **No new data, one command.**
2. Simulate option A (fixed offset schedule) against the current loop on the null cohort. The
   harness already supports frozen difficulty — E-200 ran it.
3. Simulate option B (15 + 15) and check the predicted r ≈0.25 → ≈0.40.
4. Retrieve the two paywalled load-bearing sources (§5.1, §5.2).

Items 1–3 are simulation-only and need no child data. They would settle A and B before GT's ~46
dummy-test students (E-100) are spent.
