# Separating Selection Effect from Program Effect

## Backend and Admissions Research Report

**Status:** Overnight research in progress  
**Track A scope:** Audit current policy only  
**Track B scope:** Candidate eligibility, future allocation/evaluation options, and auditability  
**Primary outcome:** Academic growth after admission  
**Secondary construct:** Advanced STEM readiness by eighth grade  

## Executive Position

The backend must keep three questions separate:

1. **Who appears ready or promising before admission?**
2. **Who is likely to succeed regardless of GT?**
3. **Who is likely to benefit more from GT than from their alternative?**

A predictive admissions model answers the second question. A program-effect design answers the third. Conflating them recreates the selection-effect problem.

Track A should be audited as the unchanged baseline. Track B can prototype transparent eligibility rules, but Track B success cannot establish program effect without a credible comparison group.

## Core Statistical Estimands

Every estimand must name:

- target population;
- treatment/offer package;
- comparison condition;
- outcome and scale;
- horizon;
- assignment/selection route; and
- weighting population.

Symbols below are templates, not complete GT estimands until those fields are locked.

### Selection Effect

Difference between admitted and non-admitted students attributable to pre-existing characteristics:

\[
E[Y(0) \mid A=1] - E[Y(0) \mid A=0]
\]

where \(A\) is admission and \(Y(0)\) is the outcome without GT.

### Program Effect

Average treatment effect for the target population:

\[
E[Y(1) - Y(0)]
\]

The individual counterfactual is never observed. Randomization, instrumental variables, regression discontinuity, or strong quasi-experimental assumptions are required to estimate it.

### Offer Effect

If seats are randomized among equally eligible applicants, the primary intention-to-treat estimand is:

\[
\tau_{\text{ITT,target}}
=
\sum_h w_h
\left(
E[Y\mid Z=1,H=h]
-
E[Y\mid Z=0,H=h]
\right)
\]

where \(Z\) is initial assignment to the complete offer package, \(H\) is the randomization block, and \(w_h\) is the prespecified target eligible-population weight. When assignment probabilities differ, use the known design probabilities. Certainty cells are descriptive and do not identify the randomized contrast.

### Benefit-Targeting Effect

Selecting students with high predicted outcomes is not the same as selecting students with high predicted treatment effects:

\[
\tau(x) = E[Y(1)-Y(0)\mid X=x]
\]

Estimating \(\tau(x)\) requires treatment variation and outcome data. It cannot be learned from admitted students alone.

## Two Anchor Evidence Families

### Differentiated instruction can produce program effects

Card and Giuliano’s high-achiever classroom study uses regression discontinuity and reports meaningful gains, concentrated among underserved Black and Hispanic high achievers. This supports the proposition that service-aligned differentiated instruction can create value beyond selection.

### Selective admission alone often produces null effects

Exam-school and gifted-program studies by Abdulkadiroğlu, Angrist, Pathak, Dobbie, Fryer, Bui, Craig, and Imberman often find near-zero effects at admission cutoffs despite large peer-quality differences. This is the essential counterevidence: selecting stronger students or peers does not itself prove instructional value.

## Research Questions

1. Which causal design is feasible if GT later offers fewer Track B seats than eligible applicants?
2. How should Track A be audited without changing policy?
3. Which Track B features are defensible before local outcome data exist?
4. When is a transparent rule preferable to a predictive model?
5. How should uncertainty, missingness, reviewer disagreement, and measurement error affect eligibility?
6. What synthetic simulation can demonstrate selection bias, treatment-effect estimation, and policy trade-offs?
7. How should backend records support replay, preregistration, attrition analysis, and independent evaluation?
8. What measurable middle-school outcomes reasonably approximate advanced STEM readiness without claiming to predict MIT admission?

## Provisional Method Hierarchy

1. Randomized scarce offers among equally eligible applicants
2. Regression discontinuity around a protected eligibility/allocation threshold
3. Prospective phased rollout or comparative interrupted time series
4. Matching/weighting with explicit unmeasured-confounding sensitivity
5. Single-group pre/post growth, which cannot identify program effect

## Algorithmic Guardrails

- Use rule-based, interpretable eligibility until local validation data exist.
- Do not optimize a black-box model on historical admission decisions.
- Do not train on outcomes observed only for admitted students without correcting selective labels.
- Separate decision-used, routing, operations, financial, and research fields.
- Preserve raw inputs, feature versions, reviewer ratings, rule versions, and reason codes.
- Report calibration and outcome-based error by relevant applicant groups only after an independent common outcome and adequate support exist; before then, report process, missingness, burden, agreement, and invariance metrics.
- Use uncertainty bands rather than false precision at cutoffs.
- Keep Track A and Track B outcomes separate before pooling.
- Never describe predicted success as predicted program benefit.

## Initial Power Findings

Illustrative assumptions: balanced individual randomization, two-sided 5% level, 80% power, baseline covariates explaining 50% of outcome variance, complete outcomes, and no clustering.

\[
N
\approx
\frac{(z_{.975}+z_{.80})^2(1-R^2)}
{q(1-q)d^2}
\]

This normal approximation follows standard education-experiment power logic; design-specific planning should follow Schochet’s framework and exact Monte Carlo simulation: https://doi.org/10.3102/1076998607302714

- One cohort with \(N=40\): minimum detectable effect approximately 0.63 SD
- \(N=80\): approximately 0.44 SD
- Four pooled cohorts totaling \(N=160\): approximately 0.31 SD
- Detecting 0.30 SD: approximately 175 analyzed applicants
- Detecting 0.20 SD: approximately 393 analyzed applicants
- Detecting 0.50 SD: approximately 63 analyzed applicants

With 20% attrition and a 75% first stage, a first-order approximation for a 0.30-SD complier effect is roughly 389 recruited applicants before finite-sample weak-IV behavior, clustering, or multiplicity.

These are planning illustrations, not GT forecasts. Design-specific simulation must use actual applicant volume, offer ratio, baseline correlation, outcome reliability, attrition, compliance, and clustering.

## Policy-Learning Finding

Historical admitted-only outcomes cannot train a model to identify who benefits from GT:

- \(Y(0)\) is absent for admitted students.
- Selection depends on unmeasured family and reviewer factors.
- Outcomes may be missing for rejected applicants.
- Hard cutoffs create positivity failures.
- Training on historical decisions learns old policy, not capability or treatment benefit.

Future benefit targeting requires randomized or strongly identified outcome data.

The two strongest transparent future candidates are:

1. **Honest capacity-constrained doubly robust policy tree**
   - Maximum depth two
   - Untouched evaluation set
   - Explicit seat constraint
   - Lottery within an oversubscribed terminal leaf

2. **Honest calibrated benefit scorecard**
   - Three to five preregistered modifiers
   - Separate discovery, estimation, and evaluation samples
   - Fixed benefit bands
   - Lottery at the capacity boundary

If held-out evidence does not beat a capacity-matched lottery by a meaningful margin, retain the lottery.

## Advanced STEM Readiness Outcome

“MIT ready by eighth grade” is an aspiration, not a validated outcome.

Use:

### Primary

Baseline-adjusted spring grade-8 high-ceiling mathematics outcome under the prespecified counterfactual. MAP Growth Math 6+ is a conditional candidate, subject to an upper-tail precision gate.

### Secondary readiness profile

- Advanced mathematics mastery and sequence
- Above-level quantitative reasoning
- Advanced mathematical problem solving
- Science and engineering reasoning
- Computational/research production and continuation readiness

Keep domains separate. Do not create a compensatory “MIT readiness” score or predict MIT admission.

## Backend Research Direction

Recommended architecture:

- PostgreSQL current-state tables for product usability
- Versioned feature observations and policy configurations
- Immutable decision runs with exact input snapshots
- Append-only workflow, correction, consent, assignment, and audit events
- Separate admissions and evaluation data planes
- Purpose-limited, checksum-verifiable analysis exports
- Frozen analysis snapshots with policy, data, code, and protocol fingerprints

Full event sourcing is unnecessary for the four-week prototype.

## Important Current Claim Correction

A performance difference between accepted Track A and Track B students does not demonstrate program effect:

- both groups receive GT;
- each route selects a systematically different population; and
- there is no untreated counterfactual.

That comparison is descriptive route heterogeneity. Program effect requires a treated-versus-untreated contrast or another valid causal design.

## Selective-Label Finding

Admitted-only records create nonidentification, not ordinary missing data.

- Models trained on admitted outcomes estimate performance under GT for historically selected students.
- They do not estimate rejected applicants’ GT outcomes.
- They do not observe admitted students’ no-GT outcomes.
- Hard cutoffs create feature regions with zero treatment overlap.
- Reviewer-majority labels teach the current policy, not student benefit.

Heckman selection, reject inference, positive-unlabeled learning, and outcome extrapolation remain assumption-dependent. They may be useful synthetic comparators, but none replaces exploration/randomization or a credible quasi-experiment.

Track A should receive a label-provenance, overlap, range-restriction, and admitted-only optimism audit without changing its decisions.

## Track A RD with Track B

Track A’s numerical cutoff remains, but Track B changes the policy immediately below it.

The most defensible RD estimand is:

> the local effect of crossing from the Track B-available policy regime to the Track A policy regime.

It is not automatically:

- overall GT eligibility;
- an offer;
- enrollment;
- a pure Track A effect; or
- separate Track A and Track B effects.

A fuzzy enrollment LATE may remain possible only if a meaningful enrollment jump survives and continuity, exclusion, monotonicity, score integrity, and common-treatment assumptions are defensible.

The backend must retain first and final scores, retests, appeals, overrides, battery-profile rules, ties, route versions, offers, enrollment, and exposure.

## Heterogeneity Validation

Future personalized allocation should validate:

- BLP calibration;
- two- or three-group GATES;
- one prespecified RATE metric;
- held-out doubly robust policy value;
- capacity-matched comparison against lottery/current policy; and
- stability across algorithms, splits, and cohorts.

Do not report individual treatment-effect accuracy. A held-out randomized study still observes only one potential outcome per student.

If the held-out lower confidence bound does not beat a capacity-matched lottery by a meaningful preregistered margin, the lottery remains the better-supported policy.

## Synthetic Simulation

The simulation specification now includes:

- latent readiness, domain talent, opportunity, and unobserved advocacy;
- CogAT measurement error and Track A/B rules;
- artifact/narrative availability and reviewer severity;
- null, homogeneous, and heterogeneous treatment effects;
- randomized offers, RD, matching, and pre/post estimators;
- attrition, ceiling, compliance, clustering, and manipulation stress;
- causal bias/coverage/power metrics; and
- eligibility accuracy, reviewer agreement, route differences, and replay metrics.

The central synthetic demonstration is that Track A-versus-Track B outcome gaps can be nonzero when the true program effect is exactly zero.

## Reviewer and Rubric Validation

Use a layered reliability report:

- ordinal dimensions: exact/adjacent agreement, linear-weighted kappa, Gwet AC2, and ordinal alpha when needed;
- final three-class decisions: confusion matrix, exact/class-specific agreement, AC1, and unweighted kappa;
- artifact reliability: first two reviewers only;
- narrative reliability: all three reviewers;
- third-review frequency and decision changes reported separately.

Planning targets:

- 30–50 difficult synthetic cases for rubric development;
- 100 cases for a minimum pilot;
- approximately 200 balanced cases for plausible route-level validation;
- 300+ for rare pending/subgroup analyses; and
- 30–100 linked ratings per reviewer for severity and drift.

Reliability is not validity. Validation must also address content, response process, route equivalence, standard setting, criterion validity, incremental value, subgroup prediction, and consequences.

## Fairness Findings

Before independent valid outcomes, report:

- funnel-stage selection and completion;
- accommodation, missing, pending, correction, and appeal;
- reviewer severity and disagreement;
- burden;
- prohibited-field invariance; and
- replay/implementation consistency.

Equalized odds, equal opportunity, predictive parity, calibration, and true error rates require a valid outcome observed across selected and comparison applicants. Admission and reviewer majority are not ground truth.

Protected traits belong in a separate permissioned audit dataset, not eligibility logic.

## Uncertainty and Pending

Keep separate:

- CogAT measurement uncertainty;
- reviewer/evidence uncertainty;
- predictive uncertainty;
- causal-benefit uncertainty; and
- operational/policy uncertainty.

The synthetic prototype should use explicit pending reason codes and no automated confidence probability. Pending must have an owner, deadline, correction/access route, and no silent conversion to rejection.

## Interpretable Model Ladder

Current recommendation: deterministic rule plus independent reviewer majority.

Future shadow challengers:

1. Regularized logistic/ordinal model
2. Sparse integer scorecard
3. Short optimal rule list
4. Depth-2/3 optimal tree
5. Monotonic GAM/EBM/lattice
6. Black-box model as a performance ceiling
7. After identified treatment data: shallow DR policy tree or calibrated benefit scorecard

A challenger must beat the deterministic baseline on untouched data by a meaningful margin while passing calibration, subgroup harm, stability, monotonicity, contestability, and rollback gates.

## Assignment and Market-Design Finding

Offers generated by a complex assignment system are not unconditionally random.

Research Design Meets Market Design shows that preferences, priorities, capacities, and higher-ranked alternatives must be included in offer propensity. In Denver:

- propensity-controlled charter effects were about +0.41 SD math, +0.17 reading, and +0.32 writing;
- omitting mechanism propensity reduced estimates by roughly 44%–60%; and
- full exact-type conditioning could use only 462 observations, while propensity-score reduction used more than 2,000.

If GT uses one fixed lottery within a frozen block, probability is simple. If it adds income blocks, priorities, multiple services, or waitlist cascades, the backend must preserve and replay the complete mechanism.

The primary causal exposure should be initial offer. “Ever offered” can become endogenous through earlier families’ acceptance decisions.

## Aid and Treatment Package

A randomized offer estimates the package offered:

- GT access;
- net tuition and scholarship;
- deposit terms;
- transportation;
- technology; and
- related supports.

If these components vary with assignment, the ITT is a package effect. An enrollment LATE is not a pure instructional effect when aid or technology can affect outcomes directly.

Capability eligibility, finance, allocation, identity/consent, and evaluation need separate data planes.

## Recommended Future Lottery

- Batch eligible applicants.
- Freeze capacity and blocks.
- Use few operational/prognostic strata.
- Assign exact seats with uniform complete randomization.
- Generate one immutable random waitlist.
- Preserve known offer probabilities.
- Analyze initial-offer ITT.
- Use IV/LATE only with defensible assumptions.

For public verifiability, a future implementation can freeze a signed pseudonymous roster before a fixed public randomness beacon, derive an HMAC ranking key, and publish signed result artifacts. Cryptographic auditability prevents seed/roster manipulation; it does not establish causal validity or fairness.

## Two Additional Anchor Papers

### Research Design Meets Market Design

Provides direct quantitative evidence that complete assignment-mechanism records can change estimated school effects by approximately a factor of two.

### Empirical Welfare and Doubly Robust Policy Learning

Kitagawa–Tetenov and Athey–Wager show how to choose a restricted capacity-aware policy after causal identification exists. Policy class complexity creates an explicit sample-size/regret trade-off. GT should begin with a depth-2 policy tree or small benefit scorecard and retain lottery allocation unless held-out value improves credibly.

## Backend Data Model

The research now specifies:

- separate identity, privacy, admissions, policy, evidence, review, decision, audit, and consent schemas;
- immutable application, assessment, policy, evidence, rating, and decision versions;
- append-only corrections and audit events;
- feature-permission firewall;
- Track A invariance and decision replay queries;
- future isolated allocation and evaluation schemas; and
- role-level RLS for family, admissions, reviewers, policy admin, auditor, privacy, allocation, and evaluator.

Full event sourcing is unnecessary. Use mutable queue projections plus immutable decision/audit records.

## Track A Audit

Track A remains unchanged.

The audit should test:

- Track B toggle invariance;
- exact historical replay;
- cutoff and boundary behavior;
- score/battery distributions;
- missing, invalid, retest, and correction patterns;
- subgroup and opportunity funnels;
- range restriction;
- selective outcome availability; and
- calibration only when an independent common outcome gate passes.

Permitted claim: implementation was reproduced and observed disparities were measured.

Prohibited claim: Track A is fair, locally valid, or causally effective from synthetic/admitted-only data.

## Outcome Model and Falsification

Primary future model:

- blocked initial-offer ITT;
- high-ceiling scale-score endpoint;
- baseline-adjusted ANCOVA;
- block fixed effects;
- Lin-style treatment–covariate interactions;
- HC2/HC3 plus design-matched randomization inference.

Gain scores, percentiles, SGPs, value-added models, and route differences remain descriptive.

Every evaluation needs:

- causal DAG;
- negative-control/pre-treatment placebo register;
- design-specific balance/manipulation/pretrend checks;
- preregistered specification curve;
- threat-matched sensitivity analysis; and
- stop/narrow response rules.

Diagnostics can discredit a design. Passing them does not prove identification.

## Evaluator Export

Recommended three-tier output:

1. Restricted pseudonymous replay package
2. Disclosure-reviewed report package
3. Public protocol/code/aggregate package

Use explicit allowlisted PostgreSQL views, one consistent snapshot, release-specific HMAC pseudonyms, BagIt checksums, signed manifests, full data dictionary, provenance, environment lock, disclosure review, and independent offline replay.

Pseudonymization is not anonymization. Differential privacy is a possible public-aggregate tool, not a substitute for controlled microdata access.

## Program-Mechanism Evidence

Randomized tutoring provides a plausible upper benchmark, not GT validation:

- Nickow et al. final pooled effect: approximately 0.288 SD
- Large-scale independent standardized tutoring: often approximately 0.16–0.22 SD
- ASSISTments: approximately 0.18 initially and 0.10 one year later
- DreamBox: approximately 0.11
- Reasoning Mind RCT: approximately −0.06, nonsignificant

ITS headline effects shrink sharply on independent standardized outcomes. Kulik/Fletcher found local-test effects around 0.62–0.73 versus standardized effects around 0.09–0.13.

The current evidence supports planning around 0.10–0.20 SD, not 0.40+, 2 SD, or Alpha’s growth multiplier.

## High-Ability and Service-Design Evidence

Direct high-ability randomized evidence is sparse. A 2026 Olympiad-nominated combinatorics-course working paper reports +0.165 SD ITT, supporting structured advanced teaching over independent study but not validating GT’s model.

Service design implication:

> high-ceiling diagnostic → compact demonstrated mastery → immediate advanced work → dynamic domain grouping → structured flexible pacing → retention and wellbeing checks.

Grouping labels and peer composition are insufficient. Program effects arise when instruction, level, feedback, and advanced content actually change.

## Treatment Moderators

The strongest confirmatory candidate is continuous domain-specific pretreatment achievement relative to the offered curriculum.

Use SES/opportunity, ELL, and disability/2e for prespecified equity reporting without directional benefit claims.

Keep broad ability profiles, spatial ability outside spatial instruction, motivation, conscientiousness, and age exploratory unless a specific mechanism and adequate interaction power exist.

## Provisional Meaningful-Effect Framework

For future evaluator ratification:

- 12-month MME: +0.10 SD
- 24-month persistence threshold: +0.05 SD
- Highest-baseline noninferiority margin: −0.05 SD

Effects around 0.20–0.30 SD would be strong. Effects above 0.30 SD would be exceptional for a full-year independent broad-outcome evaluation.

These values are proposals, not GT facts. Do not change the MME to fit sample size.

## Standard Setting

Track B needs a configural boundary, not a global score.

Recommended future method:

- modified Dominant Profile Judgment;
- complete-profile independent classification;
- replicated panels;
- withheld boundary cases;
- separate artifact/narrative route analysis; and
- shadow validation before live influence.

Angoff and Bookmark are poor fits because Track B lacks item probabilities and a unidimensional calibrated scale. Classical Body of Work usually depends on a total score.

Synthetic anchors must remain clearly named fixtures with no GT authority or “validated” label.

## Decision Utility

Rules should be compared through:

- hard validity/rights/feasibility gates;
- expected utility across plausible false-positive/false-negative costs;
- decision-curve/net-benefit sensitivity;
- reviewer and seat capacity;
- process and fairness metrics; and
- Pareto frontiers.

Accuracy alone assumes equal error costs. One fairness metric cannot certify a rule.

## Transportability

Effects and selection-rule performance may change by cohort, grade, site, treatment version, comparator, and applicant population.

GT should define source and target frames, measure effect modifiers, inspect sampling positivity, standardize/weight to the target where defensible, and report context-specific estimates plus future-context prediction intervals.

Repeated cohorts at one school improve temporal evidence, not multisite generalizability.

## Monitoring and Updating

Monitor deterministic rules for:

- data/provenance failure;
- input/population drift;
- boundary/missingness changes;
- reviewer drift;
- access and subgroup consequences; and
- outcome relationships when valid labels mature.

Learned models require additional calibration, discrimination, training stability, feature/training lineage, shadow deployment, and rollback.

Do not use automatic continual learning. Every update is offline, versioned, independently validated, shadowed, and explicitly approved.

## Fidelity and Economics

Primary causal result remains the offer ITT for the complete package.

Fidelity measures describe adherence, dose, reach, quality, responsiveness, differentiation, adaptations, and context. Do not condition the primary analysis on post-treatment fidelity or engagement.

Costing should use an ingredients approach and compare incremental cost with the same randomized effect. Report cost per offered and served applicant, cost per 0.10 SD, and cost per progression milestone. Long-run monetization remains scenario analysis.

## Adversarial Research Audit

Independent review of the overnight package identified and corrected:

- fuzzy RD reduced-form versus LATE conflation;
- inconsistent block weighting;
- undefined estimand fields;
- missing-outcome denominator/strategy;
- omitted clustering and interference in simulation;
- hidden-confounding scenario contradiction;
- conflated superiority/equivalence/noninferiority tests;
- ambiguous policy-value promotion;
- local-complier effect labels;
- working-paper/journal estimate mixing;
- ASSISTments trial conflation;
- evidence-grade inconsistency; and
- missing benchmark citations.

Remaining canonical product contradictions are documented in `MORNING_HANDOFF.md` rather than silently changing the PRD on the research branch.

## Current GT and Timeback Public Facts

Publicly confirmed:

- Georgetown K–8 campus
- 2351 Westinghouse Rd
- 30 students reported in April 2026
- $25,000 in-person tuition reported independently
- limited $10,000 founding-family scholarships advertised
- current independent report of CogAT around the 90th percentile
- GT Anywhere launched in 2026

Still unverified:

- CogAT form, exact rule, retest, and accommodations
- complete application and parent essay
- age cutoff, capacity, transportation, and several support services
- exact aid/TEFA treatment

Timeback is a beta, multi-app, version-sensitive platform. A causal treatment record must include app, platform, placement, threshold, MAP, recommendation, Guide, monitoring, workshop, and cohort versions.

## Updated Public Outcome Audit

The strongest public descriptive Alpha artifact contains 154 matched students/events and yields roughly:

- 1.69× aggregate math growth
- 1.54× aggregate reading growth

This does not reproduce the 2.6× headline and remains:

- matched-completer data;
- internally administered/analyzed;
- without student-level release;
- without attrition accounting; and
- without a counterfactual.

Current GT marketing also includes a 3× guarantee and 1400+ SAT framing. These remain company claims, not causal effect estimates.

## TEFA Context

Texas TEFA is operational for 2026–27:

- standard private-school award: $10,474;
- disability formula up to $30,000;
- income/disability priority tiers;
- oversubscription lottery/waitlist;
- private-school admission remains separate.

GT-specific provider, accreditation, tuition, aid-offset, testing, and disability practices remain unverified.

## Public Privacy Gap

GT/Alpha policies disclose extensive child activity, screen, audio/video, behavioral, location, and learning-app data. Publicly unavailable items include a complete subprocessor list, detailed retention schedule, public security audit, DPA, SOC 2 report, and breach SLA.

The synthetic-only boundary remains necessary.

## Implementation Handoff

Build now:

- local synthetic Supabase/PostgreSQL;
- deterministic versioned Track A/Track B routing;
- blind review and explicit pending states;
- immutable decisions, reasons, audit, and replay;
- RLS/prohibited-field/concurrency tests; and
- fixed synthetic artifact references.

Defer:

- allocation, aid, lotteries, and offers;
- causal/RD/ANCOVA/CATE infrastructure;
- outcomes, evaluator exports, and differential privacy;
- learned admissions models;
- live uploads/data and production deployment.

Before coding, resolve the PRD's program-effect claim, Track-A-first allocation,
domain-field, appeal, pending-state, and finance contradictions.

Implementation artifacts:

- `BACKEND_IMPLEMENTATION_BACKLOG.md`
- `MVP_DATA_CONTRACT.md`
- `SYNTHETIC_FIXTURE_MATRIX.md`
- `MVP_THREAT_MODEL.md`

## Accessibility and Measurement Fairness

The MVP can verify:

- access/accommodation/language metadata are excluded from decisions;
- failed routes become protected pending states;
- no configured route coefficient or numeric penalty exists; and
- seeded software-invariance defects are detected.

It cannot verify:

- construct preservation of an accommodation;
- equivalence of translated forms;
- narrative/artifact route parity;
- WCAG conformance before human/assistive-technology testing; or
- fairness from nonsignificant subgroup differences.

Translation requires cultural adaptation, cognitive pretesting, versioned route
lineage, and local empirical validation. Differential boost is supporting
evidence, not a validity test. DIF is not automatically bias, and no detected
DIF does not prove fairness.

Track B's intentionally multidimensional, rater-mediated rubric should not be
forced into a single latent giftedness scale. Use matched synthetic cases for
engineering checks and abstain from empirical claims when live samples are
insufficient.

See `ACCESSIBILITY_AND_MEASUREMENT_FAIRNESS.md`.
