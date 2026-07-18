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
E[Y \mid Z=1] - E[Y \mid Z=0]
\]

where \(Z\) is assignment to an offer.

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
- Report calibration and error by relevant applicant groups.
- Use uncertainty bands rather than false precision at cutoffs.
- Keep Track A and Track B outcomes separate before pooling.
- Never describe predicted success as predicted program benefit.

## Initial Power Findings

Illustrative assumptions: balanced individual randomization, two-sided 5% level, 80% power, baseline covariates explaining 50% of outcome variance, complete outcomes, and no clustering.

- One cohort with \(N=40\): minimum detectable effect approximately 0.63 SD
- \(N=80\): approximately 0.44 SD
- Four pooled cohorts totaling \(N=160\): approximately 0.31 SD
- Detecting 0.30 SD: approximately 175 analyzed applicants
- Detecting 0.20 SD: approximately 393 analyzed applicants
- Detecting 0.50 SD: approximately 63 analyzed applicants

With 20% attrition and a 75% first stage, a 0.30-SD complier effect may require roughly 389 recruited applicants before clustering or multiplicity.

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

## Deliverables Under Construction

- Source-graded paper deep dives
- Causal design decision tree
- Track A audit algorithm
- Track B eligibility algorithm
- Future randomized-offer and RD algorithms
- Synthetic data and simulation specification
- Power and sensitivity analysis checklist
- Advanced STEM-readiness outcome framework
