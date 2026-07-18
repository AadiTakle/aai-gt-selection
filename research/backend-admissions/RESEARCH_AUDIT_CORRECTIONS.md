# Adversarial Research Audit and Corrections

## Status

Overnight research package reviewed by causal-method, quantitative-source, backend, selection-method, and executive-synthesis passes.

## Corrections Applied

### Causal Methods

- Split sharp RD, fuzzy RD reduced form/first stage/LATE, and Track-A/Track-B policy-regime RD.
- Defined block-weighted target-population ITT and certainty-cell treatment.
- Added population, package, comparison, outcome, horizon, and weighting requirements to estimands.
- Added scheduled outcome denominators and primary/sensitivity missing-data plan.
- Added clustering, peer exposure, spillover, and treatment-version scenarios to simulation.
- Fixed the no-hidden-confounding matching scenario by removing the omitted cause from participation in that cell.
- Separated superiority, equivalence, persistence, and noninferiority hypotheses.
- Defined paired held-out policy-value improvement over a capacity-matched lottery.
- Clarified transport source/target definitions and hierarchical future-context inference.

### Quantitative Sources

- Replaced Bui working-paper RD estimates with version-of-record estimates and labeled the working-paper numbers.
- Labeled Bui science as attendance IV/LATE.
- Corrected Card–Giuliano’s 159,895 value to cumulative third-grade observations and labeled local complier effects.
- Corrected market-design one-million simulation unit and N=462 saturated balance sample.
- Separated Maine and North Carolina ASSISTments trials.
- Added missing tutoring, ITS, gifted-course, and scaled-tutoring sources.
- Added working-paper/author-implementation caveats for the Olympiad course.
- Removed duplicate Lakkaraju entry.
- Normalized source grades to A/B/C.
- Added final Imai–Li and CONSORT DOIs and complete NIST random-source links.

### Backend and Product Boundaries

- Added explicit outcome schedule separate from observed outcome.
- Added finance/aid package as a treatment component.
- Added allocation-mechanism propensity and cryptographic audit boundaries.
- Added source/target frames, treatment versions, monitoring, fidelity, costs, and evaluator exports.
- Kept future evaluation/allocation schemas isolated from the four-week MVP.

## Unresolved Canonical Product Conflicts

These are not silently edited on the research branch:

1. PRD claims Track A-versus-Track B performance demonstrates program effect.
2. PRD says allocation is outside MVP but includes Track-A-first aid/lottery concept.
3. PRD calls Track A current policy while B-01/E-002 remain unresolved.
4. PRD prohibits `Domain` while routing and anchors require a domain; likely intent is to prohibit domain prestige/unsupported-domain advantage.
5. Appeal support is inconsistent.
6. Finance storage is inconsistent with future-only finance schema.
7. Reviewer/pending states need one canonical aggregation contract.
8. Holistic report’s non-decisional evidence recommendation is superseded by D-008 but remains a validity caution.

## Research Not Ready for MVP

- CATE/policy trees/benefit scorecards
- Live lotteries and aid stratification
- Cryptographic public draw infrastructure
- RD/evaluation code
- MAP/ANCOVA/MME implementation
- Live standard-setting thresholds
- Outcome-dependent fairness metrics
- Evaluator microdata exports
- Transportability/fidelity/economic infrastructure
- Model drift/retraining

## Remaining Research Risks

- No GT-specific data
- No authorized current policy
- No ratified Track B thresholds/rubric
- No validated outcome
- Unknown sample size/scarcity
- Unknown reviewer capacity
- No independent evaluator agreement
- No permission for rejected-applicant follow-up
- No live privacy/legal/artifact-storage decision

## Quality Gate

The package is suitable as:

- a backend research reference;
- a future evaluation design library;
- a source register;
- an algorithm/pseudocode specification; and
- a blocker/claim-boundary record.

It is not a live admissions, allocation, or impact-evaluation protocol.
