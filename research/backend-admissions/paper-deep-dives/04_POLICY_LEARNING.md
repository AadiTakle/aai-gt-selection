# Paper Deep Dive 4

## Kitagawa and Tetenov (2018)

**Title:** Who Should Be Treated? Empirical Welfare Maximization Methods for Treatment Choice  
**Venue:** Econometrica, 86(2), 591–616  
**DOI:** https://doi.org/10.3982/ECTA13288  
**Evidence grade:** A  

## Athey and Wager (2021)

**Title:** Policy Learning With Observational Data  
**Venue:** Econometrica, 89(1), 133–161  
**DOI:** https://doi.org/10.3982/ECTA15732  
**Evidence grade:** A  

## Why These Papers Matter

These papers address a future question:

> After credible treatment-effect data exist, which qualified applicants should receive scarce seats to maximize expected incremental benefit?

They do not:

- establish causal identification;
- define GT capability;
- validate Track B;
- authorize protected-trait targeting; or
- make individual treatment effects observable.

## Policy Value

Let \(\pi(x)\) indicate whether the policy offers GT:

\[
V(\pi)=E[\pi(X)\tau(X)]
\]

where:

\[
\tau(x)=E[Y(1)-Y(0)\mid X=x]
\]

The goal is to select the best policy inside a restricted implementable class, not estimate every student’s individual causal effect.

## Kitagawa–Tetenov: Empirical Welfare Maximization

EWM directly maximizes estimated welfare over a policy class.

Under bounded outcomes, overlap, unconfoundedness, and policy-class VC dimension \(v\), worst-case regret is bounded at order:

\[
O\left(\sqrt{\frac{v}{n}}\right)
\]

The core trade-off:

- richer policy classes reduce approximation error;
- richer classes increase estimation/overfitting error.

The lower-bound result shows no learner can uniformly escape this sample-size/complexity trade-off without stronger assumptions.

### Capacity

Policies can be restricted to treat no more than a fixed share or number of applicants.

For a finite GT roster:

\[
\sum_i\pi(X_i)\le B
\]

where \(B\) is seat capacity.

Capacity must be built into learning and evaluation. Learning an unconstrained rule and truncating the ranking afterward changes the policy.

### Verified empirical illustration

In the randomized JTPA dataset:

- \(N=9,223\)
- Treatment probability \(2/3\)
- Linear EWM assigned 69% of the population
- Linear predictive plug-in assigned 86%

Prediction and welfare optimization therefore produced materially different policies.

## Athey–Wager: Doubly Robust Policy Learning

The doubly robust score is:

\[
\hat\Gamma_i=
\hat m_1(X_i)-\hat m_0(X_i)
+
\frac{W_i-\hat e(X_i)}
{\hat e(X_i)[1-\hat e(X_i)]}
[Y_i-\hat m_{W_i}(X_i)]
\]

The policy maximizes:

\[
\frac1n\sum_i[2\pi(X_i)-1]\hat\Gamma_i
\]

This becomes weighted classification:

- label: sign of estimated benefit;
- weight: magnitude of estimated benefit;
- classifier: restricted policy class.

### Cross-fitting

1. Split into folds.
2. Fit nuisance models outside each fold.
3. Compute held-out causal scores.
4. Optimize the policy from cross-fitted scores.

Cross-fitting reduces overfitting in score construction. It does not replace an untouched final evaluation set.

### What double robustness does not repair

- Unmeasured confounding
- No treatment overlap
- Selective labels
- Outcome attrition
- Interference
- Invalid utility
- Future population drift

## GT Algorithm Recommendation

Only after randomized/identified outcomes exist:

1. Keep Track B capability eligibility separate.
2. Define one treatment package and outcome.
3. Use randomized offer probabilities where possible.
4. Compare:
   - capacity-matched lottery;
   - simple transparent baseline;
   - depth-1/2 policy tree;
   - small benefit scorecard.
5. Cross-fit nuisance models.
6. Lock the final rule.
7. Evaluate on untouched data.
8. Report held-out policy value and confidence interval.
9. Promote only if the lower confidence bound beats lottery by a meaningful preregistered margin.
10. Use randomization for ties or uncertain boundary seats.

## Why Shallow Policies

For small GT samples:

- depth-2 tree or 3–5-term scorecard is interpretable;
- sample complexity is lower than flexible CATE ranking;
- decision reasons can be disclosed;
- prohibited features can be audited;
- policy instability can be measured.

If flexible methods disagree substantially about who belongs in the top-capacity set, do not deploy a personalized policy.

## Required Backend Fields

- Frozen pre-offer feature snapshot
- Allowed action set
- Offer probability
- Policy version
- Capacity
- Selected action
- Baseline and outcome
- Missingness and attrition
- Treatment package/version
- Cohort/site
- Safety and rights constraints
- Human override and reason

## Maximum Defensible Claim

Held-out evaluation can estimate that a locked policy improves expected outcome relative to a comparator for the studied eligible population.

It cannot establish:

- individual causal benefit;
- benefit outside assignment support;
- fairness without separate evidence;
- transportability to other program versions; or
- superiority from in-sample welfare alone.

## Direct Project Implication

The current prototype should not implement policy learning. Its contribution is to store data and assignment probabilities that would make future policy learning possible.

If valid heterogeneity evidence never emerges, a transparent lottery remains better supported than increasingly complex targeting.
