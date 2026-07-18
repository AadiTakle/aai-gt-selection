# Reviewer, Rubric, and Fairness Validation

## Status

Research specification only. Track B Snapshot evidence is not validated for live admissions.

## 1. Reviewer Reliability Package

Do not rely on one coefficient.

### Ordinal rubric dimensions

Report by route and dimension:

- Category counts
- Exact agreement
- Adjacent agreement
- Linear-weighted kappa
- Gwet AC2
- Ordinal Krippendorff alpha when ratings are missing or reviewer counts vary
- Non-adjacent and decision-critical disagreement
- 95% confidence intervals from case-level resampling

Quadratic weights are sensitivity analyses because they assume stronger interval-like spacing.

### Final three-class decision

`qualifies`, `does_not_currently_qualify`, and `pending` are nominal.

Report:

- Full confusion matrix
- Exact agreement
- Class-specific positive agreement
- Gwet AC1
- Unweighted Cohen/Conger/Fleiss kappa as appropriate
- Artifact-route third-review trigger rate
- Narrative-route vote patterns
- Final decision-change rate

Calculate artifact reliability from the first two independent ratings only. The third artifact review exists only for disagreements and is selection-biased.

### Sample planning

- Rubric development: 30–50 deliberately difficult synthetic cases
- Minimum reliability pilot: 100 cases, ideally 50 per route
- Preferred validation: 200 cases, roughly 100 per route
- Stronger rare-class/subgroup validation: 300+
- Reviewer benchmark qualification: 20–30 cases
- Connected benchmark library: 60–100 cases
- Per-reviewer linked ratings: at least 30; 50–100 preferred for severity/drift

These are planning targets, not universal authorization thresholds.

## 2. Reviewer Severity and Drift

Use a connected assignment design in which reviewers share benchmark cases.

Monitor:

- Reviewer category distributions
- Qualification and pending rates
- Severity adjusted for case mix
- Extreme/central rating use
- Reviewer × route
- Reviewer × domain
- Reviewer × time
- Reviewer × language/accessibility context
- Boundary disagreement

Use generalizability theory for absolute decision dependability and many-facet Rasch only when the rating network is connected and the construct is sufficiently coherent.

Do not create one latent giftedness score from intentionally distinct dimensions.

## 3. Rubric Validation Stages

### Stage 0 — Validity argument

Define:

- Intended interpretation
- Permitted use
- Prohibited claims
- Student model
- Evidence model
- Route/task model
- Scoring model
- Decision rule
- Assumptions and rebuttals

### Stage 1 — Content and anchors

- Map domains to actual GT services
- Define observable evidence and counterevidence
- Include low-polish/high-capability and high-polish/weak-capability examples
- Develop positive, negative, and boundary anchors
- Review construct underrepresentation and opportunity contamination

### Stage 2 — Response process

- Cognitive interviews with families and reviewers
- Test prompt interpretation
- Test assistance/provenance reporting
- Vary names, school prestige, polish, equipment, and formatting
- Validate accessible and translated routes

### Stage 3 — Standard setting

- Independent panel judgments before discussion
- Complete-profile Body of Work approach
- Repeat judgments
- Replicate with another panel
- Quantify panel-composition variation
- Keep standard separate from seat capacity

### Stage 4 — Reliability and route bridging

- Three independent ratings during validation
- G-theory variance decomposition
- MFRM reviewer/route/domain diagnostics
- Matched synthetic artifact/narrative cases
- Natural paired-route sample if ethically available
- Lower-confidence-bound decision consistency gate

### Stage 5 — Prospective shadow validity

- Freeze rubric and rule
- Do not affect admission
- Use independent criteria rated by blinded evaluators
- Collect outcomes beyond admitted applicants where possible
- Compare CogAT/base evidence with base plus Snapshot dimensions
- Use out-of-time or untouched validation

### Stage 6 — Subgroup and limited live validation

- Differential prediction and calibration
- Route/domain/language/accommodation interactions
- Missingness, artifact availability, pending, and appeal differences
- Independent evaluator approval
- Stop rules

### Stage 7 — Consequences and maintenance

- Burden and abandonment
- Coaching/AI evidence inflation
- Reviewer drift
- Appeals and reversals
- Privacy incidents
- Re-entry outcomes
- Track A invariance
- Revalidation after material changes

## 4. Fairness Metrics

### Defensible before valid outcomes

- Funnel-stage selection rates and differences
- Application and route completion
- Accessibility fulfillment
- Missing/pending/correction/appeal rates
- Burden and processing time
- Reviewer severity and disagreement
- Prohibited-field mutation invariance
- Track A invariance
- Replay accuracy

These identify disparities or process failures. They do not prove fairness or discrimination.

### Require independent valid outcomes

- Sensitivity/true-positive rate
- False-negative and false-positive rates
- Equalized odds/equal opportunity
- Predictive parity/PPV
- NPV parity
- Calibration within groups
- Differential prediction

Reviewer decisions, admission, or Track A/Track B route are not ground truth.

### Metric trade-offs

When base rates differ and prediction is imperfect, calibration, predictive parity, and equalized error rates generally cannot all hold simultaneously.

Preregister:

- harm being prioritized;
- primary and secondary metrics;
- population and label;
- uncertainty;
- remediation; and
- prohibited trade-offs.

Protected traits remain in a permissioned audit dataset and cannot enter eligibility.

## 5. Pending and Abstention Logic

Keep uncertainty types separate:

1. Test-score uncertainty
2. Reviewer/evidence uncertainty
3. Predictive-model uncertainty
4. Causal-benefit uncertainty
5. Operational/policy uncertainty

Prototype outcomes:

- `qualifies`
- `does_not_currently_qualify`
- `pending_evidence_correction`
- `pending_additional_blind_review`
- `pending_no_majority`
- `pending_accessibility_route`
- `pending_policy_configuration`

Rules:

- Pending never expires silently into rejection.
- Every pending state has an owner, reason, deadline, and route.
- Only valid/interpretable evidence with the required majority can produce a negative classification.
- Audit pending burden by route and subgroup.

Do not create automated confidence probabilities in the synthetic prototype.

Future conformal or learned deferral requires independent labels, representative calibration data, shift checks, and subgroup coverage analysis.

## 6. Transparent Challenger Ladder

Current prototype:

- Deterministic rule and independent reviewer majority only

Future shadow challengers:

1. Regularized logistic/ordinal model
2. Sparse integer scorecard
3. Short optimal rule list
4. Depth-2/3 optimal tree
5. Monotonic GAM/EBM/lattice
6. Gradient boosting/random forest as a performance ceiling
7. After identified treatment data: shallow DR policy tree or calibrated benefit bands

Promotion requires:

- valid target;
- prospective feature availability;
- untouched temporal/cohort holdout;
- meaningful superiority over deterministic baseline;
- calibration;
- subgroup-harm and access gates;
- model multiplicity and disagreement audit;
- monotonic/prohibited-input tests;
- randomized human-system trial;
- effective contestability;
- rollback and monitoring; and
- independent approval.

A black box must materially outperform every constrained interpretable alternative. Post-hoc explanations do not satisfy this gate.

## 7. Core Sources

- Cohen (1960): https://doi.org/10.1177/001316446002000104
- Gwet (2008): https://doi.org/10.1348/000711006X126600
- Krippendorff (2004): https://doi.org/10.1093/hcr/30.3.411
- Brennan (2001): https://doi.org/10.1007/978-1-4757-3456-0
- Myford & Wolfe (2003): https://pubmed.ncbi.nlm.nih.gov/14523257/
- AERA/APA/NCME Standards: https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf
- Kane (2013): https://doi.org/10.1111/jedm.12000
- Mislevy, Steinberg, & Almond (2003): https://doi.org/10.1207/S15366359MEA0101_02
- Shavelson, Baxter, & Gao (1993): https://doi.org/10.1111/j.1745-3984.1993.tb00424.x
- Kuncel et al. (2013): https://doi.org/10.1037/a0034156
- Hardt, Price, & Srebro (2016): https://proceedings.neurips.cc/paper_files/paper/2016/file/6a9659feb1216f14f7384ba499518b38-Paper.pdf
- Kleinberg, Mullainathan, & Raghavan (2017): https://doi.org/10.4230/LIPIcs.ITCS.2017.43
- Cherian & Candès (2024): https://www.jmlr.org/papers/v25/23-0739.html
- Jacobs & Wallach (2021): https://doi.org/10.1145/3442188.3445901
- Chow (1970): https://doi.org/10.1109/TIT.1970.1054406
- Bates et al. (2021): https://doi.org/10.1145/3478535
- Mozannar & Sontag (2020): https://proceedings.mlr.press/v119/mozannar20b.html
- Rudin (2019): https://doi.org/10.1038/s42256-019-0048-x
