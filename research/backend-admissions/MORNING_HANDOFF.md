# Morning Handoff

## Overnight Package Baseline — 2026-07-18 09:35 UTC-5

- Branch: `research/overnight-backend-selection`
- Final research-cycle commit: `c11c1373a1320c4588d4f9ff1fd4d9613fb50873`
- Branch at handoff: 19 commits ahead of `main`
- Delta at handoff: 43 files, +34,321/−4 lines
- Research package at handoff: 33 Markdown artifacts, 10,682 lines, 43,303 words
- Source-register entries: 214
- Logged iterations: 19 (`0` through `18`)
- Graphify: 1,021 nodes, 982 edges, no duplicate/dangling edges
- Executable implementation: none; no package manifest, migrations, source
  scaffold, or tests exist
- Overnight recurring loop: stopped at user request

Canonical reading order:

1. `MORNING_HANDOFF.md`
2. `DAY_ZERO_DECISION_BRIEF.md`
3. `FINAL_RESEARCH_AUDIT.md`
4. `OVERNIGHT_RESEARCH_REPORT.md`
5. `PROVISIONAL_IMPLEMENTATION_CONTRACT.md`
6. `CRITICAL_TEST_MANIFEST.md`

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
2. Track B randomized offers identify Track B program effect; treated Track
   A/Track B comparison separately tests service-fit noninferiority.
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

1. Replace the single Track A/Track B causal claim with the BrainLift two-stage
   Track B lottery-effect plus Track A/Track B noninferiority design.
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

1. PRD collapses the BrainLift's two-stage design: Track B offer randomization
   identifies effect, while treated Track A/Track B comparison tests service fit.
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

- Treated Track A-versus-Track B outcomes alone prove program effect or equal
  Track A/Track B treatment effects.
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
- GT's policy describes extensive screen/audio/video/location/app monitoring;
  Alpha's separate policy includes additional behavioral, RFID/Bluetooth, and
  possible biometric processing.
- GT states purpose-based retention without category-specific durations; Alpha
  states a general graduation/disenrollment plus 4–5-year period. No complete
  category-by-category schedule was found.
- A complete posted subprocessor list, public security audit, detailed DPA,
  SOC 2 report, and breach SLA were not found.

## Implementation Artifacts

- `ACCESSIBILITY_AND_MEASUREMENT_FAIRNESS.md`
- `BACKEND_IMPLEMENTATION_BACKLOG.md`
- `CANONICALIZATION_AND_REPLAY_BLUEPRINT.md`
- `CHILD_DATA_PRIVACY_AND_RETENTION.md`
- `CRITICAL_TEST_MANIFEST.md`
- `DAY_ZERO_DECISION_BRIEF.md`
- `EXPLANATION_AND_CONTESTABILITY.md`
- `FINAL_RESEARCH_AUDIT.md`
- `MVP_DATA_CONTRACT.md`
- `SYNTHETIC_FIXTURE_MATRIX.md`
- `MVP_THREAT_MODEL.md`
- `PROVISIONAL_IMPLEMENTATION_CONTRACT.md`
- `RLS_AND_AUTH_BLUEPRINT.md`

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

## Contestability Boundary

Implement now:

- trace-derived decision notices;
- factual/provenance, access, and procedural correction;
- immutable successors and reruns; and
- re-entry isolation fixtures.

Specify but disable substantive rubric appeal until the PRD/feature-map scope,
authority, staffing, deadlines, and standard of review are decided. Do not offer
feature-changing “how to qualify” advice.

## Privacy Lifecycle Boundary

Use born-synthetic fixtures only—never real or lightly modified child records.
Restrict Supabase `service_role` to local seed/reset, add typed purpose/retention
metadata, and verify end-of-demo purge. The synthetic choice sentinel tests
noninterference; it is not legally effective consent management.

## Final Implementation Warning

No executable application/backend exists yet. The full research data/privacy
architecture is intentionally broader than the feasible two-week backend cut.
Ratify `DAY_ZERO_DECISION_BRIEF.md`, then implement only the narrowed backlog.
