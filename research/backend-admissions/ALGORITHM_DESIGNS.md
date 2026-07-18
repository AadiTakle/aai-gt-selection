# Backend and Admissions Algorithm Designs

## Status

Implementable pseudocode under research. Not approved for live admissions.

## A. Track A Audit

Track A policy remains unchanged. The audit checks implementation and outcome reporting.

```text
INPUT:
  versioned Track A policy
  synthetic CogAT profiles
  synthetic applicant IDs

FOR each applicant:
  result = apply_current_track_a_rule(profile, policy_version)
  store profile_version, policy_version, result, reason_code

ASSERT:
  result is identical before and after Track B is enabled
  prohibited fields are not inputs
  all boundary cases use the configured rule
  every result can be replayed
```

## B. Track B Invitation

```text
INPUT:
  applicant below Track A cutoff
  configured promising composite band
  configured strong-battery rule

invite =
  composite_in_promising_band
  OR any_allowed_battery_meets_profile_rule

OUTPUT:
  invited / not_invited
  reason_code
  configuration_version
```

## C. Track B Snapshot Eligibility

```text
PRECONDITION:
  Track B invitation = invited

EVIDENCE ROUTE:
  artifact route -> two reviewers; third on disagreement
  narrative route -> three reviewers

FOR each reviewer:
  classify domain exceptionalness
  classify learning rate
  classify transfer/abstraction
  classify independence
  classify recurrence
  classify evidence specificity
  output qualifies / does_not_currently_qualify / pending

IF any decision-critical evidence is uninterpretable:
  final = pending
ELSE:
  final = majority reviewer classification

STORE:
  evidence version
  rubric version
  independent ratings
  final reason
  reviewer and configuration versions
```

## D. Future Randomized-Offer Evaluation

```text
PRECONDITIONS:
  more equally eligible applicants than seats
  genuine scarcity and ethical equipoise
  independent evaluation protocol registered
  outcomes and follow-up fixed before assignment

WITHIN each predeclared randomization block:
  assign offer using reproducible random seed
  preserve nonzero offer and non-offer probabilities

PRIMARY ANALYSIS:
  intention-to-treat = mean(outcome | offer) - mean(outcome | no_offer)

SECONDARY:
  complier effect via instrumental variables, only if assumptions hold
```

## E. Future Regression-Discontinuity Evaluation

```text
PRECONDITIONS:
  protected continuous running variable
  immutable cutoff
  no score manipulation
  adequate observations near cutoff

ESTIMATE:
  discontinuity in outcome at cutoff

VALIDATE:
  density/manipulation test
  covariate continuity
  bandwidth sensitivity
  polynomial/order sensitivity
  placebo cutoffs

CLAIM:
  local effect near cutoff only
```

## F. Candidate-Selection Modeling Rules

Do not fit a model until:

- the target outcome is defined;
- labels exist for both treated and comparison applicants;
- selective missing outcomes are addressed;
- feature availability is prospective and consistent;
- local sample size supports validation; and
- fairness and calibration audits are preregistered.

When data later exist:

1. Start with transparent logistic/ordinal models and monotonic constraints where justified.
2. Compare against the simple policy baseline.
3. Use nested cross-validation and temporal holdout.
4. Report calibration, not only ranking metrics.
5. Audit subgroup false-negative, false-positive, and missingness rates.
6. Keep outcome prediction separate from treatment-effect estimation.
7. Never auto-admit or auto-reject from an unvalidated model.

## G. Synthetic Simulation Plan

Generate applicants with:

- latent baseline readiness;
- CogAT measurement error and battery profiles;
- opportunity/resources;
- Track B domain evidence quality;
- reviewer severity and disagreement;
- treatment assignment;
- heterogeneous true treatment effects;
- attrition and missing outcomes; and
- high-ceiling academic-growth outcomes.

Compare:

- unchanged Track A;
- Track B invitation and eligibility rules;
- admit-all Track B;
- randomized scarce offers;
- RD threshold;
- naïve pre/post growth;
- matched comparison; and
- treatment-effect-aware policy learning.

Measure:

- selection bias;
- recovered treatment effect;
- confidence interval coverage;
- calibration;
- decision stability;
- subgroup error;
- power;
- attrition sensitivity; and
- welfare under constrained seats.
