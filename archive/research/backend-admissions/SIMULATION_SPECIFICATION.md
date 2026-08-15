# Synthetic Simulation Specification

## Purpose

Demonstrate, with known synthetic truth:

1. why treated Track A-versus-Track B differences alone do not estimate program
   effect;
2. how the BrainLift's Track B randomized-offer effect plus treated-route
   noninferiority design supports pathway expansion;
3. when randomized offers and RD recover causal effects;
4. how matching and pre/post designs fail under hidden selection;
5. how Track B rule choices change false positives/negatives; and
6. how reviewer disagreement, artifacts, missingness, and measurement error
   affect decisions.

Not approved for live admissions or GT-specific effect claims.

Multi-cohort pooling and drift scenarios evaluate future analyst behavior. They
do not imply new applicant fields or MVP statistical-collection requirements.

## Reproducibility

- Root seed: `20260718`
- Smoke runs: 100 replications
- Development runs: 500
- Final research runs: 2,000 per scenario cell
- Applicant pools: \(N\in\{160,400,1000\}\)
- Frozen reference population: \(10^6\) applicants for synthetic score normalization
- Preserve separate `oracle`, `observed`, and `audit` datasets
- Record DGP version, parameter hash, seed, estimator, package lock, and result hash

## Applicant Model

Generate latent:

- \(A\): general academic readiness
- \(Q\): quantitative/domain talent
- \(S\): spatial/domain talent
- \(O\): opportunity/resources
- \(U\): unobserved persistence, advocacy, and follow-through
- \(G\): synthetic audit subgroup, prohibited from eligibility

Correlate \(Q\), \(S\), and \(O\) with \(A\). Let \(U\) depend partly on \(A\) and opportunity so historical selection shares an unobserved cause with outcomes.

Generate grades 3–8.

Assign applicants to synthetic cohorts, classrooms, and guides. Generate:

- cohort random effect;
- classroom/guide random effect;
- unequal cluster sizes; and
- a prespecified peer-exposure mapping \(g_i\), such as the fraction of peers offered/enrolled.

The outcome DGP includes:

\[
Y_i(z_i,g_i)
=
Y_i(0,0)
+
z_i\tau_i
+
\eta g_i
+
u_{cohort}
+
u_{class/guide}
\]

Use ICC scenarios \(0,.05,.10,.20\) and spillover effects \(0,.10,.20\) SD.

When exposure is not randomized at multiple independent groups, interpret the ITT as the effect of the realized offer policy/package, not a pure direct instructional effect.

## CogAT-Like Measurements

Create verbal, quantitative, and nonverbal batteries from latent readiness/domain variables plus measurement error.

For battery reliability \(r_C\):

\[
C_{ik}=\sqrt{r_C}C^*_{ik}+\sqrt{1-r_C}\epsilon_{ik}
\]

Use \(r_C\in\{.60,.80,.95\}\).

Compute a standardized composite from battery values using the frozen reference population.

## Track A

Synthetic rule:

\[
T_A=1\{C\ge c_{90}\}
\]

Required invariant tests:

- Enabling Track B changes zero Track A decisions.
- Prohibited-field changes alter zero results.
- Boundary cases are deterministic.
- Replay reproduces every decision.

## Track B Invitation

For applicants below Track A:

\[
I_B=1\{c_{70}\le C<c_{90}\ \lor\ \max(C_k)\ge b_{90}\}
\]

These are fictional thresholds for simulation only.

## Track B Evidence and Review

Generate six evidence dimensions:

- domain exceptionalness;
- learning rate;
- transfer;
- independence;
- recurrence; and
- specificity.

Artifact availability increases with opportunity. Narrative evidence has higher observation noise.

Reviewer model:

\[
Z_{ijd}=\theta_{id}-b_j+a_{ij}+e_{ijd}
\]

where:

- \(b_j\): reviewer severity;
- \(a_{ij}\): reviewer-by-applicant effect;
- \(e_{ijd}\): dimension-level noise.

Reviewer-variance scenarios approximate 10%, 25%, and 40% rater variance.

Workflow:

- Artifact route: two reviewers; third on disagreement.
- Narrative route: three reviewers.
- Majority controls.
- Decision-critical uninterpretable evidence yields `pending`.

Compare:

- structured required-minimum rule;
- strict AND rule;
- liberal OR rule; and
- compensatory average.

## Potential Outcomes

Generate baseline:

\[
Y_{pre}=f(A,Q,S,O,U)+\epsilon_{pre}
\]

Untreated outcome:

\[
Y(0)=\alpha+.70Y_{pre}+g(A,Q,S,O,U)+\epsilon_0
\]

Treatment regimes:

- null: \(\tau_i=0\);
- homogeneous: \(\tau_i=.25\);
- heterogeneous: benefit varies with baseline readiness, spatial/domain strength, and synthetic subgroup, clipped to a plausible range.

\[
Y(1)=Y(0)+\tau_i
\]

Vary outcome reliability \(.70,.90\), ceiling prevalence, practice, and attrition.

## Assignment Designs

### Route comparison

Admit Track A and Track B applicants and compare outcomes by route.

Expected finding:

\[
E[Y(1)\mid A]-E[Y(1)\mid B]
\]

does not equal \(E[Y(1)-Y(0)]\). Under a null effect, route differences can remain large because selection differs.

Use this comparison only for the Stage-2 service-fit estimand. Evaluate
one-sided noninferiority coverage under prespecified margins and demonstrate
that failure to reject a route difference does not establish equivalence.

### Randomized offers

Randomize offers among equally eligible Track B candidates within prespecified
operational blocks.

Compare:

- unadjusted ITT;
- Lin-adjusted blocked ANCOVA;
- IV/LATE under compliance scenarios;
- deliberately invalid as-treated analysis.

Combine the valid Track B ITT with the service-fit noninferiority result and
measure how often the joint decision correctly supports or rejects pathway
expansion.

### Regression discontinuity

Generate a continuous synthetic allocation score and cutoff.

Compare:

- valid sharp RD;
- valid fuzzy RD;
- manipulated RD;
- bandwidth and placebo sensitivity.

### Matching

Generate observational participation from baseline, opportunity, and unobserved \(U\). Omit \(U\) from estimators.

Scenario definitions:

- S09: set the \(U\rightarrow participation\) coefficient to zero, so observed covariates suffice.
- S10/S11: set positive \(U\rightarrow participation\) coefficients while \(U\) remains an outcome cause and omitted from estimators.

Compare:

- propensity matching;
- AIPW under observed-confounding assumptions;
- hidden-confounding stress levels.

### Pre/post

Estimate admitted-student change without a comparison group.

Expected failure: natural growth and regression to the mean appear as program effect.

## Core Scenario Set

- S00: null effect; Track A/B route-gap trap
- S01: homogeneous effect; route comparison still misses ATE
- S02: valid blocked lottery, strong compliance
- S03: lottery, moderate compliance
- S04: weak first stage
- S05: differential attrition
- S06: valid sharp RD
- S07: valid fuzzy RD
- S08: manipulated RD
- S09: matching with no hidden confounding
- S10: moderate hidden confounding
- S11: strong hidden confounding and poor overlap
- S12: null treatment plus natural-growth pre/post failure
- S13: outcome ceiling and low reliability
- S14: structured Track B rule
- S15: low CogAT reliability
- S16: reviewer variance stress
- S17: narrative noise stress
- S18: independent versus anchored review
- S19: structured/AND/OR/compensatory rules
- S20: prohibited-field mutation and replay
- S21: clustered outcomes with increasing ICC
- S22: peer spillover contamination
- S23: treatment-version differences across cohorts
- S24: stable treatment, sequential cohort pooling
- S25: unmodeled treatment/outcome-norm drift
- S26: ordinary repeated p-value peeking versus group-sequential/confidence
  sequence
- S27: stable versus near-zero projected-growth denominator in 2.6×
  decomposition

## Metrics

### Causal

- Bias and absolute bias
- RMSE and empirical standard error
- Reported standard error
- 95% coverage
- Type-I error and power
- Cumulative confidence-interval width by cohort count
- Sequential stopping error and coverage
- Cohort/version heterogeneity
- Bias of pooled versus version-specific estimates
- Total, counterfactual, and attributable growth-multiple recovery
- First-stage strength
- RD local sample and diagnostics
- Matching balance and overlap
- Attrition bounds

### Eligibility

- Sensitivity, specificity, PPV, and NPV against synthetic target
- Track A invariance
- Subgroup error and selection-rate differences
- Artifact/narrative route differences
- Pending/adjudication rates
- Reviewer agreement and severity
- Prohibited-field invariance
- Decision replay rate

## Expected Demonstrations

- Valid lottery ITT is approximately unbiased with correct coverage.
- Track A/B route differences remain nonzero under a true zero program effect,
  while the joint design distinguishes causal Track B benefit from service fit.
- Small samples frequently fail to establish either Track B benefit or
  Track A/B noninferiority even when both are true.
- Stable repeated cohorts narrow uncertainty approximately with
  \(1/\sqrt{N}\), while unmodeled program/norm drift converges to a misleading
  average.
- Repeated ordinary significance testing inflates false positives; registered
  sequential methods preserve their intended error guarantees.
- Growth-multiple decomposition recovers the attributable component when the
  projected denominator is stable and becomes volatile near zero.
- Matching bias increases with hidden confounding despite observed balance.
- Pre/post analysis reports apparent gains under zero treatment effect.
- Weak compliance preserves diluted ITT but destabilizes IV.
- Manipulated RD fails diagnostics and coverage.
- Ceiling effects reduce power and attenuate observed growth.
- Anchoring can raise reviewer agreement without raising truth accuracy.
- AND/OR/compensatory rules trade false negatives and false positives differently.
- Prohibited-field changes and Track B enablement leave Track A unchanged.

## Implementation Packages

- `numpy`, `scipy`
- `pandas` or `polars`, `pyarrow`
- `statsmodels`, `linearmodels`
- `rdrobust`
- `scikit-learn`
- `krippendorff`, `irrCAC`
- `pandera`
- `pytest`, `hypothesis`
- `joblib`, `xarray`
- `matplotlib`, `seaborn`

Use a locked `uv` environment when implementation begins.

## Methods

- Angrist, Imbens, & Rubin: https://doi.org/10.1080/01621459.1996.10476902
- Imbens & Lemieux: https://doi.org/10.1016/j.jeconom.2007.05.001
- Calonico, Cattaneo, & Titiunik: https://doi.org/10.3982/ECTA11757
- McCrary: https://doi.org/10.1016/j.jeconom.2007.05.005
- Rosenbaum & Rubin: https://doi.org/10.1093/biomet/70.1.41
- Lin: https://doi.org/10.1214/12-AOAS583
- Lee: https://doi.org/10.1111/j.1467-937X.2009.00536.x
- Cinelli & Hazlett: https://doi.org/10.1111/rssb.12348
- McBee, Peters, & Waterman: https://doi.org/10.1177/0016986213513794
- McCoach et al.: https://doi.org/10.1177/00144029241247035
