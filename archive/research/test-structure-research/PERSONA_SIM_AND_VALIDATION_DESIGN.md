# Persona Simulation & Validation Design (metrics ↔ reasoning-score)

**Status:** Design/analysis, consolidated from a side discussion so the main thread has it. **Not ratified.** Born-synthetic (D-006, R9); serves the R11 screener + reflects D-015 (Timeback-fit target) / D-016 (tunable, GT-owned policy). Claim labels: **[V]** verified in cited framework/literature, **[I]** reasoned inference, **[A]** open assumption to validate.

Companion to `STAGE_CLASSIFICATION_AND_METRIC_AUDIT.md` (which stage each type feeds) — this doc covers how to (1) simulate personas to build/validate the scoring algorithm, (2) substantiate it with real GT data, (3) collect the data that would prove the *second* stage, and (4) keep the whole thing GT-tunable.

---

## 1. Synthetic persona simulator + parameter-recovery loop

**Goal:** auto-generate synthetic test-takers whose latent "reasoning score" drives probabilistic responses + metrics; run them through a test; then fit an algorithm that inverts metrics → reasoning score, and validate that it recovers the injected truth.

**The response model is already the 3PL and already implemented** — `packages/cat-engine/src/irt.ts` `probabilityCorrect(theta, {a,b,c})`:
- `b ≪ θ` → p≈1 (certain correct); `b = θ` → p at the inflection (halfway between chance and 1); `b ≫ θ` → p≈`c` (the guessing floor = 1/#options = "effectively random chance"). `a` (discrimination) sets how wide the certain→chance transition band around θ is.
- Refinement to the intuitive model: chance is the asymptote *above* the score, not *at* it; at exactly θ you're at the halfway point.
- A response is `seededUniform() < probabilityCorrect(θ, item)` using the existing seeded RNG (`rng.ts`) → reproducible/born-synthetic.
- Map the 1–20 dial to θ (N(0,1)): `θ = (score − 10.5)/3` (so 15 ≈ +1.5 SD ≈ 93rd pct via `thetaToPercentile`).

**A persona is a correlated latent-trait vector** (draw from a multivariate normal with a plausible correlation matrix so traits aren't independent):

| latent | drives |
|---|---|
| per-domain ability θ (verbal/quant/spatial/fluid) | M-ACC, M-DIFFREACH, M-ERRTYPE, M-RULEID |
| learning rate λ | M-LEARNRATE, M-PROG, M-HYP |
| processing speed τ + consistency | M-RT, M-RTFIRST, M-RTVAR, M-LAPSE |
| engagement/effort e (+ rapid-guess propensity) | M-ENGAGE, M-RAPIDGUESS, M-DRIFT, M-PERSIST |
| planfulness p | M-PLANFUL, M-EFF |
| creativity κ | M-IDEAFLU, M-FLEX, M-ORIG, M-ELAB |
| working-memory span w | M-SPAN, M-UPDATECOST, M-DPRIME |

Useful **archetypes** to generate: high-standing/low-learning-rate (gifted-but-plateaus), moderate-standing/high-learning-rate (**the Timeback-fit target**), high-ability/low-effort (engagement-gate stress test), high-both, low-both.

**Measurement models (latent → each metric, deterministic or probabilistic):**
- **M-ACC:** 3PL coin-flip (above).
- **M-DIFFREACH:** max `b` where p crosses ~0.5 under escalation ≈ θ + noise (near-deterministic).
- **M-ERRTYPE/M-LURETYPE:** conditional on a wrong answer, P(near-miss) rises as `b→θ`, P(random) rises as `b≫θ`.
- **RT family:** log-normal RT, mean increasing in `(b−θ)` + baseline τ, spread from consistency; occasional long draws = lapses.
- **M-LEARNRATE:** make ability climb within a novel block `θ_eff(t)=θ_base+λ·t`, generate responses; the existing OLS `scoring.learningRate(order, scores)` recovers ~λ.
- **Engagement gate:** e sets P(on-task); disengaged trials emit rapid-guess (tiny RT, accuracy=`c`) + a drift decline → lets you verify the gate catches + down-weights them.
- **Creativity/WM/process:** small generators (Poisson-ish idea counts; span staircase threshold = w+noise; informative-action fraction from p).

**Run the persona through the *real* scoring path** (don't re-implement): the session shell already takes a `respond` fn — `driveSession(bank, sequencer, respond)` in `apps/web/src/lib/exam/session.ts`. Set `respond = personaSampler(persona, seed)` and run the same Phase-1/Phase-2/fixed/adaptive sequencer → harvest exactly the metrics the product computes. Bonus: this is the concrete test harness for the construct-separation / ceiling-is-solved / learning-rate-provenance audits in the classification doc.

**Recovery + tuning loop:**
1. Sample N personas with known ground truth → run each → collect `(metric_vector, ground_truth)`.
2. Recover: EAP/MLE already inverts responses→θ̂ (`theta.ts`) for the accuracy channel; fit a regression `metrics→θ̂` (and `M-LEARNRATE`-family→λ̂) for the full vector.
3. Tune: the composite weights are hand-set today (`computeFitIndex` `fitWeights`/`learningRateWeight`/`consistencyWeight`); the labeled sim data lets you fit them to best recover ground truth.
4. Validate with the `scripts/validation-harness` (RMSE/bias/correlation of θ̂ vs θ, classification accuracy at the cut, ΔR² incremental validity).

**What it proves / can't [I]:** correctness of the scoring code (recovers injected truth), estimator bias/precision, **items/metrics needed for a target SE**, gate robustness, incremental value of process over accuracy, and standing↔learning-rate separation. It **cannot** prove the metrics measure *real* ability or *real* acceleration — recovering θ from your own generative model is circular, and tuning on sim data tunes to your assumptions. Method + power + sensitivity, not truth.

**Build map (mostly assembly):** exists = 3PL (`irt.ts`), seeded RNG (`rng.ts`), run loop (`session.driveSession`), metric rollup (`scoring.ts`/`item-scoring.ts`/`result.ts`), θ recovery (`theta.ts`), born-synthetic generate→validate harness w/ ground truth (`scripts/validation-harness`). New (small) = persona latent generator + per-metric measurement models + recovery/tuning report; natural home = a pure, seeded `persona-sim` module in `packages/cat-engine` feeding the harness. **Smallest vertical slice:** persona generator + 3PL accuracy channel + `driveSession` run + θ-recovery report over ~1,000 personas → read recovery RMSE before adding process/learning-rate channels.

---

## 2. Substantiating the algorithm with real GT data (CogAT / MAP / admit status)

**Yes for the standing/ability channel; no for the learning-rate channel; and the admit label is partly circular.**

| data | substantiates |
|---|---|
| CogAT (SAS) | **Convergent validity** for the accuracy/θ (Stage-1) channel — a real, non-circular external ability measure |
| MAP (RIT) | convergent validity for achievement-loaded parts; weaker for pure reasoning |
| MAP *growth* (longitudinal) | closest available **proxy** for a learning signal — confounded, not within-session |
| admitted / non-admitted | **classification agreement** — but circular (see below) |

**Two crucial caveats:**
1. **The admit label is circular with CogAT/MAP** — GT's admit decision is *derived from* CogAT+MAP (the D-015 rubric). "Predict admission" ≈ "predict CogAT/MAP thresholds." Agreement shows you can **reproduce current practice with a scalable automated instrument** (real R11 value), not that you measure a truer construct or beat the battery.
2. **CogAT/MAP substantiate Stage 1, not Stage 2** — they are static status, not learning rate or program benefit. You *can* show Phase-1 accuracy recovers ability that correlates with CogAT (real convergent validity for half the instrument). You *cannot* substantiate `M-LEARNRATE`/Timeback-fit from CogAT/MAP/admit; best case is MAP growth as a weak, confounded proxy — and even a positive there is predictive validity, **not** program impact (R10).

**Where it plugs in:** the `validation-harness` schema already has `cogat_sas`, `map_rit`, `criterion_eoy`, an admit-style cut, and subgroup columns, and computes concurrent validity, classification agreement, incremental validity (ΔR²), ceiling/floor, DIF. Real data swaps the synthetic ground-truth for real criteria and runs the *same* harness → external substantiation (no longer circular against your own model). Sim = method/correctness/power; real data = external substantiation.

**Watch-outs:** get the **non-admitted** rows too (avoid range restriction); incremental validity only means something against an **independent** criterion (not admission, which came from CogAT/MAP); real data trips the privacy/consent gate — the harness **fails closed** on non-synthetic data (B-06), so it needs de-identification, consent, and a formal authorized live-data decision.

---

## 3. Data to *prove the second stage* (learning-rate / Timeback-fit)

You need a **downstream learning/acceleration criterion** + a design that separates "predicts who accelerates" from "predicts who benefits *from Timeback specifically*." The screener's `M-LEARNRATE` is a **micro** signal (minutes); the platform outcome is the **macro** criterion (months). Proving Stage 2 = micro predicts macro.

**Criterion data from Timeback's own mastery telemetry (gold source):**
- **Mastery velocity** — objectives/lessons mastered per unit time (or grade-levels/year). Most direct "acceleration."
- **Time-to-mastery per objective** — platform-scale analog of within-session trials-to-mastery.
- **Learning-curve slope** — skill gain over time, adjusted for starting level.
- **Novel-domain acquisition rate** — closest analog to the "novel type" in `M-LEARNRATE`.
- **Retention/durability** — re-test retention (fast-but-shallow vs durable).
- **Engagement/persistence telemetry** — session regularity, persistence (platform analog of `M-PERSIST`/`M-ENGAGE`).
- **Secondary:** MAP growth (fall→winter→spring RIT slope), grade progression — credible but achievement-loaded/confounded.

**Design that makes it prove something:**
- **Prospective + linked** (screen at intake → track platform outcomes forward).
- **Variance on the predictor** (admit a spread of learning-rate scores, not only the top, or you can't see whether low scorers do worse).
- **Dosage adjustment (critical):** acceleration partly reflects hours used — log platform time and adjust, or you confound "learns fast" with "used it more."
- **Counterfactual interaction (the real Timeback-fit prize):** the charter's lottery/counterfactual arm (D-010/R2) — randomize admission among near-cut applicants, then test whether `M-LEARNRATE` predicts the **treatment effect** (admitted-vs-control gap). A learning-rate × treatment interaction is what distinguishes "Timeback-fit" from "generically able." Short of a lottery: regression-discontinuity at the cut.
- **Held-out validation:** fit weights on one cohort, validate on the next.

**Data dictionary (per child, pseudonymous linkage):**
- **Intake:** full metric vector (per-domain θ, `M-LEARNRATE`, process/effort), item params + seed (replay), timestamp.
- **Outcomes over T months:** mastery velocity, time-to-mastery, growth slope (platform + MAP), retention, engagement telemetry, per-domain pace.
- **Covariates:** baseline level (CogAT/MAP/θ), grade, **dosage (hours on platform)**, attendance, prior exposure.
- **Flags:** linkage ID, subgroup (equity), consent status.

---

## 4. Keep it experimental & GT-tunable

Scoring must be **GT-owned, versioned policy — never hardcoded** (already the direction in D-016). The composite + cut are already policy objects (`packages/cat-engine/src/scoring.ts` `computeFitIndex` / `decisionFromFit(fitIndex, policy)`).

Make it a real experimental instrument:
1. **One versioned policy surface** for every knob: per-domain `fitWeights`, the standing-vs-learning-rate balance (`learningRateWeight` — literally the "how much do we lean on Timeback-fit vs raw ability" dial), `consistencyWeight`, `admitCut`/`retryCut`, engagement-gate floors, difficulty→score mapping. GT edits the policy, not code.
2. **Version + stamp:** every scored result records the policy version used (reproducible/replayable — R7, D-019 replay Lambda). Re-tuning never invalidates old decisions' interpretability.
3. **Re-calibration loop:** as `(screener-metrics, platform-outcome)` pairs accrue, GT re-fits weights/cuts against the *real* criterion → new policy version.
4. **Shadow / what-if before publish:** score a held-out cohort with the candidate policy alongside the live one, show how many admits flip, then publish.
5. **Locked invariants (tunable ≠ unaudited):** born-synthetic until an authorized live-data decision; the engagement gate can't be tuned to credit rapid-guessing; `M-LEARNRATE` stays labeled a hypothesis; every cut change is a logged decision.
6. **Surface:** a small GT-facing "policy studio" (view/edit/version/what-if/publish).

---

## 5. Claim ladder + governance
Access → reliability → outcome change → causal impact are **separate milestones** (R10). The sim gets you method + correctness + power. Real CogAT/MAP substantiates the **standing** channel (convergent) + reproduces current selection. Platform telemetry gets you **predictive validity** of learning-rate → platform pace. The **causal / differential-benefit** claim (the actual D-015 target) needs the counterfactual arm. All real-child data is experimental research: consent, de-identification, IRB-style review, data minimization, and the born-synthetic gate stays closed until a formal authorized live-data decision (applicant/child rights over research convenience).
