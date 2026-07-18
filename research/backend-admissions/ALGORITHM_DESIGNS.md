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
  output qualifies / does_not_currently_qualify
  OR abstain for conflict/competence and trigger replacement

IF any decision-critical evidence is uninterpretable:
  case workflow = pending_evidence_correction before vote aggregation
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
  estimate the block-specific initial-offer ITT
  aggregate using prespecified target eligible-population block weights
  if assignment probabilities differ within support:
    use the known design probabilities in a Horvitz-Thompson,
    Hájek, or equivalent design-based estimator
  exclude certainty cells from the randomized contrast
  retain them in descriptive policy reporting

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

SHARP RD:
  treatment equals cutoff assignment
  treatment effect = outcome discontinuity

FUZZY RD:
  estimate outcome discontinuity (reduced form)
  estimate treatment/enrollment discontinuity (first stage)
  local complier effect = reduced form / first stage
  require continuity, exclusion, monotonicity,
  nonzero first stage, and stable treatment version

TRACK A WITH TRACK B:
  first estimate the jump in route, eligibility, offer,
  enrollment, and exposure separately
  label reduced form as Track A-side policy versus
  Track B-available policy unless stronger assumptions hold

VALIDATE:
  density/manipulation test
  covariate continuity
  bandwidth sensitivity
  local-linear primary estimation
  local-quadratic bias correction/sensitivity
  never use global high-order polynomial as primary
  placebo cutoffs

CLAIM:
  sharp local effect, fuzzy local complier effect,
  or local policy-regime effect—never an unspecified RD effect
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

## H. Selective-Label Audit

Historical admitted-only data observe outcomes under GT for selected students. They do not observe:

- GT outcomes for rejected applicants;
- no-GT outcomes for admitted applicants; or
- treatment benefit for either group.

```text
FOR each candidate target variable:
  label as:
    human_decision
    reviewer_judgment
    observed_outcome
    proxy_outcome
    Y1_observed
    Y0_observed

REJECT target if:
  admission/reviewer decision is mislabeled as success
  outcome is available only in a zero-overlap region
  causal benefit is inferred from admitted-only outcomes

REPORT:
  outcome availability map
  admission-propensity overlap
  effective sample size
  admitted-only optimism gap
  Manski/assumption-based bounds
```

Reject inference, positive-unlabeled learning, and Heckman correction are sensitivity/comparator methods—not evidence generators. Pseudo-labels do not create rejected applicants’ outcomes.

## I. Alternative-Path RD Audit

Track B changes the policy immediately below the Track A cutoff.

```text
DEFINE:
  running score X
  Track A cutoff cA
  Track B invitation and eligibility rules
  offer/enrollment/exposure separately

ESTIMATE FIRST:
  jump in Track A route
  jump in overall eligibility
  jump in offer
  jump in enrollment

IF Track B availability changes at cA:
  label reduced form as A-side policy vs B-available policy

DO NOT label as:
  pure Track A program effect
  overall GT effect
  separate A and B effects

VALIDATE:
  first/final score distributions
  retests, appeals, corrections, overrides
  battery/profile assignment variables
  ties and lottery probabilities
  density and covariate continuity
  cutoff-specific treatment versions
```

A fuzzy enrollment LATE is possible only when a nonzero first stage and exclusion, monotonicity, continuity, and treatment-version assumptions are defensible.

## J. Future CATE and Policy Validation

An individual treatment effect is never observed. Validate group ranking and policy value.

```text
1. Preregister population, offer, comparison, outcome, horizon,
   capacity, features, model candidates, missingness, and claim.

2. Freeze development and untouched randomized evaluation data.

3. Build cross-fitted AIPW causal scores on valid randomized data.

4. Run:
   BLP calibration slope
   2-3 group GATES
   one prespecified RATE/AUTOC metric
   held-out doubly robust policy value
   capacity-matched comparison to lottery/current policy

5. Repeat honest splits using published aggregation;
   never count split-level significance.

6. On an untouched randomized evaluation set with known
   assignment probabilities and action support, estimate the paired contrast:

     Delta_V =
       V(policy_learned) - V(policy_capacity_matched_lottery)

   Use the same applicant-level doubly robust scores for both
   policy values so covariance is retained.

7. Audit:
   rank correlation across algorithms
   top-capacity Jaccard overlap
   group-effect order reversals
   subgroup burden/harm
   leave-one-cohort-out stability

8. Account prospectively for policy-search, metric, and subgroup
   multiplicity; evaluation data cannot influence policy learning.

9. Promote only when the one-sided lower confidence bound for
   Delta_V exceeds
   a capacity-matched lottery by the preregistered meaningful margin.

10. Otherwise retain the simpler rule or lottery.
```

Recommended first future models:

- depth-2 doubly robust policy tree;
- calibrated benefit scorecard with 3–5 preregistered modifiers.

Flexible forests remain exploratory unless sample size and held-out validation support them.

## K. Reviewer Reliability Algorithm

```text
INPUT:
  independent pre-adjudication ratings
  route, domain, reviewer, case, time, and synthetic audit group

FOR each ordinal dimension and route:
  compute category distribution
  exact agreement
  adjacent agreement
  linear-weighted kappa
  Gwet AC2
  ordinal alpha when ratings are missing/variable
  case-bootstrap 95% intervals

FOR final three-class decision:
  compute confusion matrix
  exact and class-specific agreement
  Gwet AC1
  unweighted kappa
  third-review rate

FIT diagnostics:
  reviewer severity adjusted for case mix
  reviewer × route
  reviewer × domain
  reviewer × time
  reviewer × accessibility/language context

DO NOT:
  use adjudicated outcomes as reliability data
  treat agreement as validity
  combine dimensions into one latent giftedness score
```

## L. Fairness Audit Algorithm

```text
BEFORE valid outcomes:
  report stage counts and denominators
  selection-rate difference and ratio
  completion, missing, pending, correction, appeal
  accommodation fulfillment and burden
  reviewer severity/disagreement
  Track A and prohibited-field invariance
  replay accuracy

  label gaps as disparities requiring investigation
  never label as TPR/FPR, calibration, or equal opportunity

AFTER a construct-valid target is defined under an explicit treatment regime
and representative labels exist for that target:
  estimate sensitivity/FNR and specificity/FPR
  predictive parity and NPV
  calibration/differential prediction
  equalized odds/equal opportunity
  simultaneous subgroup intervals

  do not use a post-admission outcome as neutral ground truth when admission
  can change that outcome

PROTECTED ATTRIBUTES:
  separate permissioned audit store
  excluded from eligibility inputs
  unknown remains unknown
  no proxy inference for individual decisions
```

## M. Pending/Abstention State Machine

```text
IF required accessibility/language route is unavailable, denied, or failed:
  pending_accessibility_route
ELSE IF evidence invalid, materially incomplete, or uninterpretable:
  pending_evidence_correction
ELSE IF artifact reviewers disagree:
  pending_additional_blind_review
ELSE IF policy has no deterministic answer:
  pending_policy_configuration
ELSE:
  apply majority classification

FOR every pending state:
  assign reason, owner, deadline, correction/access route
  preserve input/rule/rating versions
  prohibit silent timeout to rejection
```

Do not create confidence probabilities until a prospectively validated predictive model and representative calibration set exist.

## N. Auditable Blocked Lottery

```text
PRECONDITIONS:
  final eligible roster
  genuine oversubscription and equipoise
  fixed seat counts by real operational block
  complete offer package
  independent protocol approval

FREEZE:
  pseudonymous entrant tokens
  block IDs and capacities
  eligibility/policy hashes
  waitlist and transfer rules
  target future randomness source

CANONICALIZE and sign freeze manifest before randomness is available.

DERIVE key from:
  frozen-manifest hash
  fixed future public randomness
  optional independently escrowed operator secret

FOR applicant in each block:
  rank_digest = HMAC_SHA256(
    key,
    draw_id || block_id || applicant_token
  )

SORT complete digest ascending.
OFFER first k.
WAITLIST everyone else in same immutable order.

STORE:
  manifest, signature, randomness proof, key/reveal
  every digest and rank
  initial assignment
  append-only offer/waitlist events
  exact assignment probability

ANALYZE:
  initial-offer ITT by original block
  preserve noncompliers and later waitlist offers in original assignment
```

Do not use database `random()`, post-hoc seeds, mutable rosters, or rerandomization after declines.

## O. Complex Assignment Propensity

```text
IF allocation uses only one frozen block:
  propensity = seats_in_block / eligible_in_block

IF allocation uses preferences, priorities, aid constraints,
multiple programs, or linked waitlists:
  freeze full mechanism state
  simulate or analytically derive assignment propensity
  condition evaluation on complete type/propensity
  verify balance within propensity support

DO NOT:
  assume raw offer is unconditionally random
  use global offer rate when block probabilities differ
  ignore zero/one probability applicants
  estimate ever-offered effect with a naive mean difference
```

## P. Accessibility, Translation, and Route Fairness

```text
FOR each decision-used construct:
  version construct definition, essential demands, barriers,
  permitted supports, route anchors, and prohibited proxies

FOR each accommodation/language route:
  record route version and transformation lineage
  review semantic, cultural, accessibility, and construct changes
  classify:
    approved_provisional
    approved_distinct_construct
    pending_revision
    rejected_construct_change

GENERATE matched synthetic case families:
  hold intended capability evidence constant
  mutate language, presentation, access metadata, interpreter,
  formatting polish, support fulfillment, and prohibited fields

EXACT SOFTWARE INVARIANCE:
  metadata-only mutation ->
    identical outcome, ordered reasons, and decision-input hash

CONSTRUCT-MATCHED ROUTE CONSISTENCY:
  compare dimension ratings, uninterpretable flags, final decisions,
  pending, reviewer disagreement, burden, and completion time
  do not require byte/hash identity across transformed evidence

IF live sample/model is inadequate:
  report effect sizes, intervals, denominators, and missingness
  status = insufficient_information
  prohibit "equivalent", "DIF-free", or "fairness proven"

IF DIF or noninvariance is detected:
  trigger linguistic/cultural/construct review
  do not automatically label bias or change applicant result
```

Track B is intentionally multidimensional and rater-mediated. Do not collapse it
into one latent giftedness score solely to run multigroup CFA.

## Q. Explanation and Contestability

`pending` is a workflow state, not a reviewer vote. Resolve decision-critical
invalidity/access/ambiguity before aggregation; replace reviewer competence or
conflict abstentions. Aggregate only `qualifies` and
`does_not_currently_qualify`.

```text
EXPLAIN:
  render from exact decision trace
  include outcome, contrast, decision-used evidence,
  policy/rubric version, ordered reasons, prohibited inputs,
  next action, deadline, and claim boundary

SUBMIT REMEDY:
  pin target decision, input hash, and policy bundle
  use idempotency key
  classify:
    explanation
    factual_or_provenance_correction
    access_failure
    procedural_error
    rubric_appeal
    re_entry

TRIAGE:
  factual/provenance -> data steward
  access failure -> protected pending + paused clock
  procedure -> independent conflict-cleared reviewer
  rubric appeal when disabled -> explicit deferred status
  new evidence -> later-cycle re-entry

APPLY CORRECTION:
  create immutable successor
  rerun only from one complete versioned manifest
  preserve original trace
  issue new versioned notice

IF future rubric appeal is enabled:
  same evidence and rubric only
  hide prior votes, identities, and outcome
  appeal reviewer may uphold or remand
  remand creates fresh normal panel
```

Do not generate threshold-distance, smallest-change, or feature-optimization
advice. Explanation fidelity is tested against the executed trace; satisfaction
or trust is not evidence of correctness.
