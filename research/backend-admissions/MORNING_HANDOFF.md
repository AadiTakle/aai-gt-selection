# Morning Handoff

## Executive Summary

The overnight research supports a minimal, auditable synthetic admissions backend—not live allocation, causal evaluation, or machine-learned admissions.

Immediate backend target:

- local Supabase/PostgreSQL;
- versioned Track A/Track B rules;
- deterministic routing;
- independent Snapshot review;
- explicit pending states;
- immutable decision inputs/results;
- audit/replay;
- RLS and prohibited-field tests;
- synthetic fixtures only.

Future research infrastructure should be designed but not built into the four-week MVP.

## Ten Strongest Findings

1. Predicted success is not predicted GT benefit.
2. Track A-versus-Track B outcomes cannot identify program effect.
3. Admitted-only outcomes create nonidentification, not routine missingness.
4. Selective programs often show null causal effects despite impressive observed outcomes.
5. Differentiated instruction can benefit specific underserved high-achiever populations.
6. Deterministic interpretable rules are better supported than ML for the current prototype.
7. Backend provenance is part of statistical validity.
8. Reviewer agreement is necessary but not rubric validity.
9. Current fairness evidence is process evidence, not true error-rate evidence.
10. Realistic broad-outcome program effects are nearer 0.10–0.20 SD than 0.40+ or 2.6× growth claims.

## Five Highest-Confidence Papers

1. **Bui, Craig, & Imberman (2014)**  
   Gifted RD plus lottery; mostly null outcomes and attrition warnings.  
   https://doi.org/10.1257/pol.6.3.30

2. **Card & Giuliano (2016)**  
   Positive local effects for a specific underserved high-achiever classroom.  
   https://doi.org/10.1257/aer.20150484

3. **Abdulkadiroğlu, Angrist, & Pathak (2014)**  
   Elite observed outcomes can largely reflect selection.  
   https://doi.org/10.3982/ECTA10266

4. **Abdulkadiroğlu, Angrist, Narita, & Pathak (2017)**  
   Full assignment mechanism/propensity materially changes causal estimates.  
   https://doi.org/10.3982/ECTA13925

5. **McBee, Peters, & Waterman (2014)**  
   AND, OR, and compensatory gifted-identification rules create different error profiles.  
   https://doi.org/10.1177/0016986213513794

## Five Main Blockers

1. Current authorized Track A workflow/cutoff/retest/correction policy
2. Track B invitation band, battery rule, domains, anchors, and passing rule
3. Actual grades, services, reviewer staffing, and operational capacity
4. Privacy, accessibility, artifacts, retention, consent, and security authority
5. Seats, applicant volume, aid package, outcome, independent evaluation, and high-performer protections

These block live use and causal claims. They do not block synthetic backend work.

## Day-0 Decisions

Before implementation:

1. Remove the false Track A/Track B program-effect claim.
2. Quarantine Track-A-first aid/lottery as future research.
3. Clarify `domain` versus `domain prestige`.
4. Freeze one pending/reviewer aggregation contract.
5. Confirm appeals are outside MVP.
6. Omit finance persistence.
7. Label every policy value as synthetic/non-authoritative.

## Two-Week Backend Build

### Week 1

- Freeze contracts, states, reasons, and fixtures.
- Initialize local Supabase.
- Implement versioned applications, assessments, policies, and RLS.
- Implement deterministic Track A/Track B routing.

### Week 2

- Implement blind artifact/narrative review and pending states.
- Implement immutable decisions, correction successors, audit, and replay.
- Execute routing, prohibited-field, concurrency, and RLS fixture matrix.
- Hand stable API contracts and reasons to Tiffany.

Weeks 3–4 are frontend integration, critic review, and demo hardening—not new
research infrastructure.

## Research Not for MVP Implementation

- Causal forests, CATE, policy trees, and benefit scorecards
- Income/aid-stratified lotteries
- Cryptographic public draws
- Live waitlist/assignment propensity machinery
- MAP/ANCOVA/MME implementation
- Live rubric thresholds/standard setting
- Outcome-based fairness metrics
- Evaluator microdata exports and differential privacy
- Transportability, mediation, fidelity, and economic evaluation infrastructure

These are future protocols and design constraints.

## Canonical Contradictions to Resolve Separately

1. PRD Track A/Track B difference as program effect is causally false.
2. PRD allocation is outside MVP but includes a Track-A-first aid/lottery idea.
3. PRD says current Track A is preserved while current GT policy remains unconfirmed.
4. `Domain` is prohibited while domain-specific anchors are required; the intended prohibition is domain prestige/unsupported domain use.
5. Appeal scope is inconsistent.
6. Finance fields conflict with the future-only finance schema.
7. PRD and research pending/reviewer states need one aggregation contract.
8. Holistic-evidence report’s original non-decisional evidence recommendation is superseded by D-008; it remains a caution, not current product policy.

## Research Corrections Applied

- Separated sharp, fuzzy, and Track-A/Track-B policy-regime RD.
- Defined block-weighted randomized-offer ITT.
- Added explicit missing-data denominator and sensitivity strategy.
- Added clustered/interference simulation scenarios.
- Fixed no-hidden-confounding matching scenario.
- Separated superiority, equivalence, persistence, and noninferiority hypotheses.
- Defined paired held-out policy-value promotion estimand.
- Corrected Bui article/working-paper estimate version mixing.
- Corrected Card–Giuliano observation count and local-complier labels.
- Corrected market-design simulation and saturated-sample descriptions.
- Separated two ASSISTments trials.
- Added missing tutoring/ITS/gifted working-paper sources.
- Normalized deep-dive evidence grades to A/B/C.

## Bottom-Line Claims

### Supported

- The synthetic backend can make admissions rules replayable and auditable.
- Track B can broaden the eligible pool.
- Structured review is more defensible than freeform holistic judgment.
- Certain differentiated high-achiever services have produced causal gains in external settings.
- Small GT cohorts will struggle to identify modest effects and heterogeneity.

### Not Supported

- Track A-versus-Track B outcome differences prove program effect.
- Snapshot evidence is validated for live admissions.
- GT will produce Alpha’s claimed growth.
- A model can learn who benefits from admitted-only data.
- “MIT ready by eighth grade” is a validated outcome.
- Any live lottery, threshold, MME, or fairness rule is currently authorized.

## Current Public-Fact Update

- Independent reporting places GT's CogAT threshold around the 90th percentile;
  the exact official rule/form remains unverified.
- Timeback is beta and version-sensitive.
- The strongest public Alpha artifact recalculates to approximately 1.69× math
  and 1.54× reading, not the 2.6× headline, and has no counterfactual.
- TEFA's standard 2026–27 award is $10,474, with up to $30,000 under the
  disability formula; GT participation and aid interaction remain unknown.
- Public privacy materials disclose extensive child monitoring, while a
  complete subprocessor list, retention schedule, public security audit, DPA,
  SOC 2 report, and breach SLA were not found.

## Implementation Artifacts

- `ACCESSIBILITY_AND_MEASUREMENT_FAIRNESS.md`
- `BACKEND_IMPLEMENTATION_BACKLOG.md`
- `MVP_DATA_CONTRACT.md`
- `SYNTHETIC_FIXTURE_MATRIX.md`
- `MVP_THREAT_MODEL.md`

These are synthetic prototype specifications, not validation for live admissions.

## Accessibility Claim Boundary

Prohibited-field invariance is firewall evidence only. It does not prove:

- accessibility conformance;
- accommodation construct preservation;
- translation quality;
- artifact/narrative route equivalence; or
- fair participation.

The synthetic MVP should claim accommodation-use noninterference and protected
pending states, not accommodation equivalence. WCAG 2.2 AA is a target until
manual and assistive-technology testing is complete.
