# Graph Report - gt-selection-capstone  (2026-07-20)

## Corpus Check
- 146 files · ~144,554 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1793 nodes · 1856 edges · 149 communities (126 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `435b720e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Causal Attribution and Governance
- Selection Requirements and Rights
- GT School, Alpha, Timeback, and TEFA Public Facts
- Track B Snapshot Review
- Evidence Quality and Screening
- Audit and Local Validation
- Prohibited Inputs and Equity
- Four-Week Roadmap
- Synthetic Track Configuration
- Capability Breadth
- Feasibility and Power
- CogAT and MAP Evidence
- Performance and Dynamic Evidence
- Concept Options and Scoring
- Accessibility and Accommodations
- Decision Rights and Privacy
- Stop Conditions
- High-Performer Guardrail
- Historical PRD Decisions
- Minimum Four-Week Scope
- Supabase and PostgreSQL
- Domain-Diverse User Stories
- Operations and Audit
- SMPY and Matching Limits
- Gaming and Burden
- Supporting Tier-B Sources
- Backend and Admissions Algorithm Designs
- Overnight Backend and Admissions Research Log
- Future Allocation, Aid, and Auditable Lottery Research
- Paper Deep Dive 4
- Paper Deep Dive 3
- Outcome Modeling and Causal Falsification Plan
- Track A Read-Only Audit Plan
- Supabase/PostgreSQL Research Data Model
- Evaluator Export and Reproducibility Specification
- Program-Mechanism and Effect-Size Benchmarks
- Standard Setting, Decision Utility, and Lifecycle Validation
- Core Statistical Estimands
- Advanced STEM Readiness Outcome
- Two Anchor Evidence Families
- Two Additional Anchor Papers
- Morning Handoff
- Adversarial Research Audit and Corrections
- Two-Week Backend Implementation Backlog
- Priority Threats
- Minimum Synthetic MVP Data Contract
- Synthetic Fixture and Acceptance Matrix
- Accessibility, Translation, and Measurement Fairness
- Explanation, Correction, and Contestability
- Child Data Privacy, Retention, and Synthetic-Data Safety
- Accessibility, Translation, and Measurement Fairness
- Tutoring, Adaptive Software, and Program Mechanisms
- Child Data Privacy and Synthetic-Data Safety
- Explanation and Contestability
- Day-0 Team Decision Brief
- Tier A Load-Bearing Evidence
- Reviewer Reliability and Rubric Validation
- R2 Credible Counterfactual
- Initial Anchor Sources
- Growth Outcomes and Falsification
- Recent 2024–2026 Evidence
- Current GT, Timeback, Alpha, and TEFA Sources
- Policy Learning and Heterogeneous Effects
- Randomized Allocation and Aid
- Power, Missingness, and Interference
- Auditable Randomness and Allocation Security
- Fairness and Contestability
- R6 Growth Without Gifted Ceiling
- Complex Regression Discontinuity
- Final Overnight Research Audit
- Advanced STEM Readiness
- Backend, Audit, and Reproducibility
- Fidelity and Economic Evaluation
- Selective Labels and Missing Outcomes
- Transportability and External Validity
- Monitoring and Drift
- H3 Address Unobserved Selection
- Effect-Size and Meaningful-Effect Benchmarks
- Uncertainty and Abstention
- CATE Calibration and Policy Evaluation
- Reproducible Evaluator Exports
- Standard Setting and Decision Utility
- H4 Expand Candidate-Pool Access
- Annotated Source Register
- Critical 25-Test Backend Manifest
- Supabase Auth, RLS, and RPC Blueprint
- Supabase Auth, RLS, and Local Testing
- Concept A Selection-First
- Annotated Source Register
- review.ts
- Two-Stage BrainLift Evaluation Logic
- env.ts
- replay.ts
- Backend tickets
- GT Admissions MVP — Web Application Architecture Plan
- application.ts
- correction.ts
- Frontend Enablement Report
- package.json
- package.json
- compilerOptions
- contracts.test.ts
- dependencies
- devDependencies
- devDependencies
- scripts
- index.ts
- Feature-to-Requirement Development Map
- Cycle log
- decision.ts
- tsconfig.json
- package.json
- workflow.ts
- Comparator Case Study — Summer Science Program (SSP International)
- scripts
- package.json
- GT Selection Capstone
- snapshot-contract.test.ts
- tsconfig.json
- tsconfig.json
- tsconfig.json
- Fast Mode
- .prettierrc.json
- check-security-boundaries.ts
- package.json
- onlyBuiltDependencies
- check-workspace-boundaries.ts
- create-local-auth-users.ts
- review-pending.test.ts
- page.tsx
- check-generated-types.ts
- next.config.ts
- jsdom
- @testing-library/react
- @types/react-dom
- README.md
- vitest.config.ts
- @supabase/supabase-js
- README.md
- README.md
- README.md
- README.md

## God Nodes (most connected - your core abstractions)
1. `Separating Selection Effect from Program Effect` - 47 edges
2. `Annotated Source Register` - 31 edges
3. `Iteration Log` - 23 edges
4. `scripts` - 19 edges
5. `Backend and Admissions Algorithm Designs` - 19 edges
6. `Morning Handoff` - 19 edges
7. `PostgreSQL Research Data Model` - 18 edges
8. `Canonicalization, Hashing, and Replay Blueprint` - 18 edges
9. `Child Data Privacy, Retention, and Synthetic-Data Safety` - 17 edges
10. `Minimum Synthetic MVP Data Contract` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Project Stop Conditions` --semantically_similar_to--> `Automatic Rejection Conditions`  [INFERRED] [semantically similar]
  AGENTS.md → docs/DEVELOPMENT_RUBRIC.md
- `Track A vs Track B Difference as Program Effect Claim` --conceptually_related_to--> `Program Effect`  [AMBIGUOUS]
  docs/GT_ADMISSIONS_APPLICATION_MVP_PRD.md → PROJECT_CHARTER.md
- `Lottery ITT and LATE Identification` --semantically_similar_to--> `H3 Address Unobserved Selection`  [INFERRED] [semantically similar]
  gt-school-counterfactual-brainlift/brainlift-gt-school-counterfactual.md → docs/project-requirements.md
- `Alpha 2.6x MAP Growth Claim Under Test` --conceptually_related_to--> `Program Effect`  [AMBIGUOUS]
  gt-school-counterfactual-brainlift/brainlift-gt-school-counterfactual.md → PROJECT_CHARTER.md
- `R2 Credible Counterfactual` --implements--> `Credible Counterfactual`  [EXTRACTED]
  docs/project-requirements.md → PROJECT_CHARTER.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Canonical Governance Package** — project_charter_mission, docs_project_requirements_r7, docs_development_rubric_hard_gates, docs_decision_log_d001 [EXTRACTED 1.00]
- **Track B Snapshot Workflow** — docs_gt_admissions_application_mvp_prd_track_b_invitation, docs_gt_admissions_application_mvp_prd_artifact_route, docs_gt_admissions_application_mvp_prd_narrative_fallback, docs_gt_admissions_application_mvp_prd_independent_review [EXTRACTED 1.00]
- **Credible Causal Evaluation Stack** — gt_school_counterfactual_brainlift_brainlift_gt_school_counterfactual_lottery_identification, docs_project_requirements_r3, docs_project_requirements_r6, docs_project_requirements_h6 [INFERRED 0.95]

## Communities (149 total, 23 thin omitted)

### Community 0 - "Causal Attribution and Governance"
Cohesion: 0.08
Nodes (23): 1. Reviewer Reliability Package, 2. Reviewer Severity and Drift, 3. Rubric Validation Stages, 4. Fairness Metrics, 5. Pending and Abstention Logic, 6. Transparent Challenger Ladder, 7. Core Sources, Defensible before valid outcomes (+15 more)

### Community 1 - "Selection Requirements and Rights"
Cohesion: 0.16
Nodes (14): Mandatory Contributor Workflow, E-006 Ability and Achievement Remain Predictive, Decision Rule Matters More Than Extra Test, Applicant and Family Critic Lens, D-002 Solution-Agnostic Requirements, D-003 Requirement-ID Traceability, Required Hard Gates, Rights Safety and Data Metrics (+6 more)

### Community 2 - "GT School, Alpha, Timeback, and TEFA Public Facts"
Cohesion: 0.09
Nodes (21): Alpha Privacy Policy — August 2025, Charter and External Record, Company claims, Confirmed, Current GT Services, GT Privacy Policy — April 2026, GT School, GT School, Alpha, Timeback, and TEFA Public Facts (+13 more)

### Community 3 - "Track B Snapshot Review"
Cohesion: 0.10
Nodes (22): E-002 Unconfirmed CogAT Threshold Near 90th Percentile, E-005 Single Cognitive Screen False Negatives, E-008 Spatial Ability Adds Distinct Information, E-019 Nominations Are Limited Complementary Evidence, E-020 Teacher Effects in Ratings, E-021 Unstructured Recommendations Encode Advantage, D-005 No Ratified Concept, D-008 Track B Talent Evidence Snapshot Prototype (+14 more)

### Community 4 - "Evidence Quality and Screening"
Cohesion: 0.29
Nodes (7): E-003 Financial Resources Shape Access, E-007 Grit and Mindset Weak Standalone Signals, E-018 Nonverbal Substitution Does Not Remove Bias, Prohibited Eligibility Inputs, H2 Capability Separated from Family Advantage, F7 Profile-Preserving Decision Engine, Credé Grit Meta-Analysis

### Community 5 - "Audit and Local Validation"
Cohesion: 0.20
Nodes (10): E-011 Independent Evaluation Permission Assumption, E-017 WJ V and WISC-V Targeted Pathway, E-023 Structured Review Beats Freeform Holism, Prospective Local Psychometric Validation, Reusable Adversarial Tests, Versioned Decision Audit and Replay, Freeform Holistic Review Failure, Selection Reliability Metrics (+2 more)

### Community 6 - "Prohibited Inputs and Equity"
Cohesion: 0.05
Nodes (42): Accessibility and Measurement Fairness, Adversarial Research Audit, Aid and Treatment Package, Algorithmic Guardrails, Assignment and Market-Design Finding, Backend and Admissions Research Report, Backend Data Model, Backend Research Direction (+34 more)

### Community 7 - "Four-Week Roadmap"
Cohesion: 0.29
Nodes (5): Task, tasks, views, Week, weeks

### Community 8 - "Synthetic Track Configuration"
Cohesion: 0.09
Nodes (22): Applicant Model, Assignment Designs, Causal, CogAT-Like Measurements, Core Scenario Set, Eligibility, Expected Demonstrations, Implementation Packages (+14 more)

### Community 9 - "Capability Breadth"
Cohesion: 0.13
Nodes (14): Candidate-selection lesson, Card and Giuliano (2016), Direct Implications for GT, Evaluation lesson, Implementation Lessons, Interpretation, Limits, Paper Deep Dive 2 (+6 more)

### Community 10 - "Feasibility and Power"
Cohesion: 0.40
Nodes (5): E-010 Sufficient Demand and Scarce Seats Assumption, E-013 Calendar and Staffing Feasibility Assumption, GT Operator Critic Lens, H6 Adequate Statistical Information, R8 Feasible Under Real GT Constraints

### Community 11 - "CogAT and MAP Evidence"
Cohesion: 0.50
Nodes (4): E-015 CogAT Construct Coverage, E-016 MAP Growth Candidate Complement, CogAT Form 8 Reasoning Screen, CogAT Plus One MAP Growth Subject Candidate

### Community 12 - "Performance and Dynamic Evidence"
Cohesion: 0.50
Nodes (4): E-022 Performance and Dynamic Assessment Candidates, Common-Condition Performance Task, Scripted Mini Dynamic Assessment, F4 Common Direct Evidence and Domain Task Hub

### Community 13 - "Concept Options and Scoring"
Cohesion: 0.12
Nodes (15): Backend records required, Bui, Craig, and Imberman (2014), Designs, Direct Implications for GT, Fuzzy Regression Discontinuity, Gifted magnet lottery, Implementation Lessons, Limits (+7 more)

### Community 14 - "Accessibility and Accommodations"
Cohesion: 0.67
Nodes (3): Access Language and Accommodation Stories, F2 Universal Accessible Application, F6 Accommodations and Administration Integrity

### Community 15 - "Decision Rights and Privacy"
Cohesion: 0.67
Nodes (3): Privacy Correction Appeal and Re-entry Stories, F10 Consent Privacy and Research Separation, F9 Explainable Decision and Remedy Lifecycle

### Community 26 - "Backend and Admissions Algorithm Designs"
Cohesion: 0.09
Nodes (21): A. Track A Audit, B. Track B Invitation, Backend and Admissions Algorithm Designs, C. Track B Snapshot Eligibility, D2. Joint Track B Effect and Service-Fit Decision, D3. Future Evaluator — Cumulative Multi-Cohort Effect, D. Future Randomized-Offer Evaluation, E. Future Regression-Discontinuity Evaluation (+13 more)

### Community 27 - "Overnight Backend and Admissions Research Log"
Cohesion: 0.07
Nodes (27): Implementation Transition, Iteration 0 — 2026-07-18, Iteration 10 — 2026-07-18, Iteration 11 — 2026-07-18, Iteration 12 — 2026-07-18, Iteration 13 — 2026-07-18, Iteration 14 — 2026-07-18, Iteration 15 — 2026-07-18 (+19 more)

### Community 28 - "Future Allocation, Aid, and Auditable Lottery Research"
Cohesion: 0.11
Nodes (18): 1. Capability, Aid, Allocation, and Evaluation Must Be Separate, 2. Treatment Bundle, 3. Recommended Assignment Protocol, 4. Income-Stratified Allocation, 5. Cryptographically Auditable Draw, 6. Supabase/PostgreSQL Record Design, 7. Verification, 8. Analysis (+10 more)

### Community 29 - "Paper Deep Dive 4"
Cohesion: 0.12
Nodes (16): Athey and Wager (2021), Athey–Wager: Doubly Robust Policy Learning, Capacity, Cross-fitting, Direct Project Implication, GT Algorithm Recommendation, Kitagawa and Tetenov (2018), Kitagawa–Tetenov: Empirical Welfare Maximization (+8 more)

### Community 30 - "Paper Deep Dive 3"
Cohesion: 0.13
Nodes (14): A complex assignment mechanism, A simple fixed block lottery, Abdulkadiroğlu, Angrist, Narita, and Pathak (2017), Assignment-Propensity Method, Bias from Ignoring the Mechanism, Denver Sample, GT Implementation Lessons, Limits (+6 more)

### Community 31 - "Outcome Modeling and Causal Falsification Plan"
Cohesion: 0.08
Nodes (25): Assessment event, Assignment, Backend Fields, BrainLift Two-Stage Evaluation, By Design, Causal DAG Minimum, Falsification Register, Governance (+17 more)

### Community 32 - "Track A Read-Only Audit Plan"
Cohesion: 0.10
Nodes (19): Acceptance Tests, Audit Goals, Boundary and Cutoff Distance, Calibration Gate, Core Queries, Execution Sequence, Funnel, Historical Replay (+11 more)

### Community 33 - "Supabase/PostgreSQL Research Data Model"
Cohesion: 0.09
Nodes (21): Acceptance Queries, Append-Only Audit, Application, Assessment, Core Entities, Decisions, Explanation and Remedy, Field and Purpose Registry (+13 more)

### Community 34 - "Evaluator Export and Reproducibility Specification"
Cohesion: 0.15
Nodes (12): Data Dictionary Fields, Differential Privacy, Environment Lock, Evaluator Export and Reproducibility Specification, Export Control Tables, Package, Pseudonymization, Release Tiers (+4 more)

### Community 35 - "Program-Mechanism and Effect-Size Benchmarks"
Cohesion: 0.11
Nodes (17): Acceleration and Grouping, Benefit Moderators, Bottom Line, Confirmatory candidate, Equity reporting, not directional benefit claims, Evidence for High-Ability Students, Exploratory only, Fastest-Student and Wellbeing Guardrails (+9 more)

### Community 36 - "Standard Setting, Decision Utility, and Lifecycle Validation"
Cohesion: 0.09
Nodes (22): 1. Track B Standard Setting, 2. Decision Utility, 3. Transportability, 4. Monitoring and Drift, 5. Fidelity and Package Effects, 6. Economic Evaluation, 7. Backend Fields, 8. Sources (+14 more)

### Community 37 - "Core Statistical Estimands"
Cohesion: 0.40
Nodes (5): Benefit-Targeting Effect, Core Statistical Estimands, Offer Effect, Program Effect, Selection Effect

### Community 38 - "Advanced STEM Readiness Outcome"
Cohesion: 0.67
Nodes (3): Advanced STEM Readiness Outcome, Primary, Secondary readiness profile

### Community 39 - "Two Anchor Evidence Families"
Cohesion: 0.67
Nodes (3): Differentiated instruction can produce program effects, Selective admission alone often produces null effects, Two Anchor Evidence Families

### Community 40 - "Two Additional Anchor Papers"
Cohesion: 0.67
Nodes (3): Additional Anchor Evidence Families, Empirical Welfare and Doubly Robust Policy Learning, Research Design Meets Market Design

### Community 41 - "Morning Handoff"
Cohesion: 0.08
Nodes (23): Accessibility Claim Boundary, Bottom-Line Claims, Canonical Contradictions to Resolve Separately, Contestability Boundary, Current Public-Fact Update, Day-0 Decisions, Executive Summary, Final Implementation Warning (+15 more)

### Community 42 - "Adversarial Research Audit and Corrections"
Cohesion: 0.17
Nodes (11): Adversarial Research Audit and Corrections, Backend and Product Boundaries, Causal Methods, Corrections Applied, Final Consolidation, Quality Gate, Quantitative Sources, Remaining Research Risks (+3 more)

### Community 43 - "Two-Week Backend Implementation Backlog"
Cohesion: 0.11
Nodes (18): Day 0 — Resolve Contract Conflicts, Day 10 — Frontend Handoff, Day 1 — Freeze Contracts, Day 8 — Immutable Decisions, Days 1–2 — Initialize Local Supabase, Days 2–3 — Versioned Admissions and Policy, Days 3–4 — RLS and Field Firewall, Days 4–5 — Deterministic Routing (+10 more)

### Community 44 - "Priority Threats"
Cohesion: 0.11
Nodes (17): Assets, Audit Tampering, Concurrency, Elevated-Credential Exposure, Evidence Access, Injection / XSS, Minimum Security Gate, Priority Threats (+9 more)

### Community 45 - "Minimum Synthetic MVP Data Contract"
Cohesion: 0.11
Nodes (17): API Boundaries, Application, Assessment, Audit, Decision, Excluded, Explanation and Remedy, Field Registry (+9 more)

### Community 46 - "Synthetic Fixture and Acceptance Matrix"
Cohesion: 0.13
Nodes (14): Accessibility and Route Consistency, Assessment Fixtures, Corrections and Pending, Explanation and Remedy, Frozen Test Policy, Privacy and Retention, Prohibited-Field Invariance, Property Invariants (+6 more)

### Community 47 - "Accessibility, Translation, and Measurement Fairness"
Cohesion: 0.12
Nodes (15): Accessibility, Translation, and Measurement Fairness, Accommodation Review, Audit Fields, Construct Map, Executive Position, Governing Principle, Interface Target, Key Sources (+7 more)

### Community 48 - "Explanation, Correction, and Contestability"
Cohesion: 0.09
Nodes (21): Access Failure, Concurrency, Executive Position, Explanation, Explanation, Correction, and Contestability, Explanation Design, Factual or Provenance Correction, Feature-Changing Recourse (+13 more)

### Community 49 - "Child Data Privacy, Retention, and Synthetic-Data Safety"
Cohesion: 0.10
Nodes (20): Acceptance Fixtures, Backups and Restore, Born-Synthetic Rule, Child Data Privacy, Retention, and Synthetic-Data Safety, Consent Boundary, COPPA, Current Legal Context — July 2026, End-of-Demo Purge (+12 more)

### Community 50 - "Accessibility, Translation, and Measurement Fairness"
Cohesion: 0.12
Nodes (16): Abedi, Hofstetter, & Lord (2004) — ELL Accommodations, Accessibility, Translation, and Measurement Fairness, AERA/APA/NCME Standards (2014), Chen (2007) — Fit-Index Sensitivity, Gentry et al. (2021) — Gifted Test Evidence Audit, ITC Test Adaptation Guidelines (2017), Lakin (2012) — Ability-Test Invariance, Lohman, Korb, & Lakin (2008) — Nonverbal Tests (+8 more)

### Community 51 - "Tutoring, Adaptive Software, and Program Mechanisms"
Cohesion: 0.12
Nodes (16): Agarwal & Gaule (2026) — Developing Math Talent Worldwide, Cognitive Tutor Algebra I Trial, Duflo, Dupas, & Kremer (2011) — Tracking, Guryan et al. (2023) — High-Dosage Math Tutoring, Kraft, Schueler, & Falken (2026) — Tutoring at Scale, Kulik & Fletcher (2016) — Intelligent Tutoring Review, Kulik, Kulik, & Bangert-Drowns (1990) — Mastery Learning, Ma et al. (2014) — ITS Meta-Analysis (+8 more)

### Community 52 - "Child Data Privacy and Synthetic-Data Safety"
Cohesion: 0.12
Nodes (16): Chen et al. (2020) — GAN-Leaks, Child Data Privacy and Synthetic-Data Safety, Deng et al. (2011) — LINDDUN, FTC COPPA FAQ, FTC COPPA Final Rule Amendments (2025), Ganev et al. (2022) — DP Synthetic Minority Utility, Hoepman (2014) — Privacy Design Strategies, Meehan, Chaudhuri, & Dasgupta (2020) — Data Copying (+8 more)

### Community 53 - "Explanation and Contestability"
Cohesion: 0.13
Nodes (15): Bahner, Hüper, & Manzey (2008) — Automation Misuse, Bansal et al. (2021) — Explanations and Reliance, Barocas, Selbst, & Raghavan (2020) — Counterfactual Assumptions, Colquitt (2001) — Justice Dimensions, Explanation and Contestability, Gilliland (1993) — Selection-System Fairness, Karimi, Schölkopf, & Valera (2021) — Causal Recourse, Lyons et al. (2022) — Appeal Preferences (+7 more)

### Community 54 - "Day-0 Team Decision Brief"
Cohesion: 0.14
Nodes (13): 1. Program-Effect Claim, 2. Allocation and Aid, 3. Domain Semantics, 4. Pending and Reviewer Aggregation, 5. Appeal Boundary, 6. Finance Persistence, 7. Synthetic Policy Status, Day-0 Team Decision Brief (+5 more)

### Community 55 - "Tier A Load-Bearing Evidence"
Cohesion: 0.18
Nodes (13): Canonical Document Precedence, E-004 Alpha 2.6x MAP Growth Company Claim, D-001 Canonical Project Governance, R4 Non-Circular Selection and Measurement, Alpha 2.6x MAP Growth Claim Under Test, Elite Illusion Null-at-the-Margin Evidence, Author Stake and Conflict-of-Interest Audit, Tier A Load-Bearing Evidence (+5 more)

### Community 56 - "Reviewer Reliability and Rubric Validation"
Cohesion: 0.17
Nodes (12): Brennan (2001) — Generalizability Theory, Cohen (1960, 1968) — Kappa, Conger (1980) — Generalized Kappa, Fleiss (1971) — Many-Rater Kappa, Gwet (2008) — Agreement Under Prevalence Imbalance, Gwet (2014) — AC2, Kane (2013) — Argument-Based Validation, Krippendorff (2004) — Alpha (+4 more)

### Community 57 - "R2 Credible Counterfactual"
Cohesion: 0.29
Nodes (7): E-001 Public GT Reporting Lacks Credible Comparison, Methodologist Critic Lens, Seat Allocation and Evaluation Out of Scope, Track A vs Track B Difference as Program Effect Claim, R10 Conclusion Boundaries, R2 Credible Counterfactual, Regression Discontinuity at Admission Cutoff

### Community 58 - "Initial Anchor Sources"
Cohesion: 0.18
Nodes (11): Abdulkadiroğlu, Angrist, Narita, & Pathak (2017) — Lottery Pooling, Abdulkadiroğlu, Angrist, & Pathak (2014) — Elite Illusion, Angrist, Imbens, & Rubin (1996) — Instrumental Variables, Bui, Craig, & Imberman (2014) — Gifted Program Null, Card & Giuliano (2016) — High-Achiever Tracking, Dobbie & Fryer (2014) — High-Achieving Peers, Imbens & Lemieux (2008) — RD Practice, Initial Anchor Sources (+3 more)

### Community 59 - "Growth Outcomes and Falsification"
Cohesion: 0.18
Nodes (11): Betebenner (2009) — Student Growth Percentiles, Callaway & Sant’Anna (2021) — Staggered DiD, Growth Outcomes and Falsification, Lipsitch, Tchetgen Tchetgen, & Cohen (2010) — Negative Controls, Lord (1967) — Gain/Adjustment Paradox, Oster (2019) — Coefficient Stability, Rambachan & Roth (2023) — HonestDiD, Simonsohn, Simmons, & Nelson (2020) — Specification Curves (+3 more)

### Community 60 - "Recent 2024–2026 Evidence"
Cohesion: 0.20
Nodes (10): Abdulkadiroğlu & Back (2024) — Weighted Lotteries, Bastani et al. (2025) — GenAI Learning Harm, Bhatt et al. (2024) — Hybrid Tutoring and CAL, Card, Chyn, & Giuliano (revised 2026) — Long-Run Gifted Effects, Chen, Li, & Mao (2025) — Selective Labels with Multiple Decision-Makers, De Simone et al. (2025) — Teacher-Guided GenAI, Kraft, Edwards, & Cannata (2024) — District Tutoring at Scale, Recent 2024–2026 Evidence (+2 more)

### Community 61 - "Current GT, Timeback, Alpha, and TEFA Sources"
Cohesion: 0.20
Nodes (10): Alpha 2024–25 NWEA Report, Community Impact (April 2026), Current GT, Timeback, Alpha, and TEFA Sources, GT/Alpha Privacy Policies, GT Anywhere Refund/Guarantee Policy, GT School Official Pages, NWEA Growth-Ratio Guidance, Reason (June 2026) — GT School Profile (+2 more)

### Community 62 - "Policy Learning and Heterogeneous Effects"
Cohesion: 0.20
Nodes (10): Athey & Imbens (2016) — Honest Causal Trees, Athey, Tibshirani, & Wager (2019) — Generalized Random Forests, Athey & Wager (2021) — Doubly Robust Policy Learning, Kitagawa & Tetenov (2018) — Empirical Welfare Maximization, Lakkaraju et al. (2017) — Selective Labels, Policy Learning and Heterogeneous Effects, Sverdrup et al. (2020) — Policy Trees, Wager & Athey (2018) — Causal Forests (+2 more)

### Community 63 - "Randomized Allocation and Aid"
Cohesion: 0.22
Nodes (9): Bettinger et al. (2012) — FAFSA Assistance, Bugni, Canay, & Shaikh (2018) — Covariate-Adaptive Randomization, de Chaisemartin & Behaghel (2020) — Randomized Waiting Lists, Dynarski et al. (2021) — HAIL Aid Guarantee, Fairlie & Robinson (2013) — Technology Access, Frangakis & Rubin (2002) — Principal Stratification, Hernán & VanderWeele (2011) — Compound Treatments, Morgan & Rubin (2012) — Rerandomization (+1 more)

### Community 64 - "Power, Missingness, and Interference"
Cohesion: 0.25
Nodes (8): Aronow & Samii (2017) — General Interference, Bruhn & McKenzie (2009) — Stratification, Cinelli & Hazlett (2020) — Omitted Confounding, Hudgens & Halloran (2008) — Interference, Lee (2009) — Attrition Bounds, Lin (2013) — Covariate Adjustment, Little et al. (2012) — Missing Data, Power, Missingness, and Interference

### Community 65 - "Auditable Randomness and Allocation Security"
Cohesion: 0.25
Nodes (8): Auditable Randomness and Allocation Security, drand Protocol, NIST SP 800-90A/B/C — Random Number Generation, RFC 2104 / RFC 4231 — HMAC, RFC 5869 — HKDF, RFC 8032 — Ed25519, SPIRIT and CONSORT 2025, What Works Clearinghouse Handbook 5.0

### Community 66 - "Fairness and Contestability"
Cohesion: 0.25
Nodes (8): Cherian & Candès (2024) — Fairness Auditing Inference, Chouldechova (2017) — Calibration and Error Balance, Fairness and Contestability, Hardt, Price, & Srebro (2016) — Equalized Odds, Jacobs & Wallach (2021) — Measurement and Fairness, Kleinberg, Mullainathan, & Raghavan (2017) — Fairness Trade-offs, Kuncel et al. (2013) — Mechanical Combination, Rudin (2019) — Interpretable High-Stakes Models

### Community 67 - "R6 Growth Without Gifted Ceiling"
Cohesion: 0.40
Nodes (6): E-012 High-Ceiling Outcome Availability Assumption, Impact and Measurement Metrics, R3 Prospective Causal Question, R6 Growth Without Gifted Ceiling, Deferred R2 R3 R6 Evaluation Work, Credible Causal Measurement Stack

### Community 68 - "Complex Regression Discontinuity"
Cohesion: 0.29
Nodes (7): Abdulkadiroğlu et al. (2022) — Breaking Ties, Caetano, Caetano, & Escanciano (2023) — Multivalued Treatment RD, Cattaneo et al. (2016) — Multiple Cutoffs, Complex Regression Discontinuity, Kolesár & Rothe (2018) — Discrete Running Variable, Papay, Willett, & Murnane (2011) — Multiple Assignment Variables, Reardon & Robinson (2012) — Multiple Rating Scores

### Community 69 - "Final Overnight Research Audit"
Cohesion: 0.29
Nodes (6): Build-Now Claim Boundary, Canonical Decisions Still Required, Corrections Applied in Final Pass, Final Overnight Research Audit, Live-Use Stop Conditions, Verdict

### Community 70 - "Advanced STEM Readiness"
Cohesion: 0.33
Nodes (6): Advanced STEM Readiness, Lubinski & Benbow (2006) — SMPY Review, MIT Admissions — Academic Foundations, NWEA — MAP Growth Technical Report 2024–2025, Steenbergen-Hu & Moon (2011) — Acceleration, Wai, Lubinski, & Benbow (2009) — Spatial Ability

### Community 71 - "Backend, Audit, and Reproducibility"
Cohesion: 0.33
Nodes (6): Backend, Audit, and Reproducibility, PostgreSQL Row Security, RFC 8493 — BagIt, RFC 8785 — JSON Canonicalization, Supabase Row-Level Security, W3C PROV Data Model

### Community 72 - "Fidelity and Economic Evaluation"
Cohesion: 0.33
Nodes (6): Carroll et al. (2007) — Fidelity Framework, Fidelity and Economic Evaluation, IES Economic Evaluation Standards, Imai, Keele, & Yamamoto (2010) — Causal Mediation, Moore et al. (2015) — Process Evaluation, O’Donnell (2008) — K–12 Fidelity Review

### Community 73 - "Selective Labels and Missing Outcomes"
Cohesion: 0.33
Nodes (6): Coston et al. (2020) — Counterfactual Risk, Heckman (1979) — Sample Selection, Kleinberg et al. (2018) — Human Decisions and Machine Predictions, Manski (1989) — Anatomy of Selection, Selective Labels and Missing Outcomes, Wei (2021) — Decision-Making Under Selective Labels

### Community 74 - "Transportability and External Validity"
Cohesion: 0.33
Nodes (6): Dahabreh & Hernán (2019) — Trial Transport, Debray et al. (2013) — Internal-External Validation, Pearl & Bareinboim (2014) — External Validity, Stuart et al. (2011) — Trial Generalizability, Tipton (2013) — Generalizing Experiments, Transportability and External Validity

### Community 75 - "Monitoring and Drift"
Cohesion: 0.33
Nodes (6): Gama et al. (2014) — Concept Drift, Mitchell et al. (2019) — Model Cards, Monitoring and Drift, NIST AI 800-4 (2026) — Deployed AI Monitoring, Perdomo et al. (2020) — Performative Prediction, Steyerberg et al. (2004) — Model Updating

### Community 76 - "H3 Address Unobserved Selection"
Cohesion: 0.33
Nodes (6): E-009 Random Assignment Balances Unobserved Traits, H3 Address Unobserved Selection, BrainLift PDF Export, Capability-Gated Admission Lottery, Capable-but-Underserved Students, Lottery ITT and LATE Identification

### Community 77 - "Effect-Size and Meaningful-Effect Benchmarks"
Cohesion: 0.14
Nodes (13): Annotated Source Register, Bailey et al. (2017) — Persistence and Fadeout, CATE Calibration and Policy Evaluation, Chernozhukov et al. (2025) — Generic HTE Inference, Effect-Size and Meaningful-Effect Benchmarks, Evidence Grades, Expansion Areas, Hill et al. (2008) — Empirical Benchmarks (+5 more)

### Community 78 - "Uncertainty and Abstention"
Cohesion: 0.40
Nodes (5): Bartlett & Wegkamp (2008) — Classification with Reject Option, Bates et al. (2021) — Risk-Controlling Prediction Sets, Chow (1970) — Reject Option, Mozannar & Sontag (2020) — Learning to Defer, Uncertainty and Abstention

### Community 79 - "CATE Calibration and Policy Evaluation"
Cohesion: 0.50
Nodes (4): Concept A Selection-First, Concept B Evaluation-First, Concept C Integrated Selection and Evaluation, Weighted Concept Comparison Scorecard

### Community 80 - "Reproducible Evaluator Exports"
Cohesion: 0.40
Nodes (5): DDI Lifecycle, National Academies (2019) — Reproducibility, OCI Image Specification, Reproducible Evaluator Exports, RO-Crate

### Community 81 - "Standard Setting and Decision Utility"
Cohesion: 0.40
Nodes (5): Drummond & Holte (2006) — Cost Curves, Plake & Hambleton (2000) — Categorical Assignment, Plake, Hambleton, & Jaeger (1997) — Dominant Profiles, Standard Setting and Decision Utility, Vickers & Elkin (2006) — Decision Curve Analysis

### Community 82 - "H4 Expand Candidate-Pool Access"
Cohesion: 0.50
Nodes (4): Access and Fairness Metrics, H4 Expand Candidate-Pool Access, H7 Equity and Access Guardrails, Card and Giuliano Universal Screening Study

### Community 83 - "Annotated Source Register"
Cohesion: 0.08
Nodes (23): 1. `api.save_application_draft`, 2. `api.submit_application`, 3. `api.record_assessment_version`, 4. `api.submit_snapshot_version`, 5. `api.submit_review`, 6. `api.apply_correction`, 7. `api.replay_decision`, Core Database Invariants (+15 more)

### Community 84 - "Critical 25-Test Backend Manifest"
Cohesion: 0.20
Nodes (9): Coverage, Critical 25-Test Backend Manifest, Deferred Tests, Execution Gate, Explanation, Replay, Concurrency, and Security, Pending, Access, and Field Firewall, Review, Routing (+1 more)

### Community 85 - "Supabase Auth, RLS, and RPC Blueprint"
Cohesion: 0.07
Nodes (26): Admissions operator, Auditor, Cognito Auth, RLS, and RPC Blueprint, Concurrency, Decision service, Direct Auth/RPC integration, Elevated-Access Boundary, Family (+18 more)

### Community 86 - "Supabase Auth, RLS, and Local Testing"
Cohesion: 0.29
Nodes (7): PostgreSQL Row Security and Function Security, PostgREST Transactions, Supabase Auth, RLS, and Local Testing, Supabase Custom Access Token Hook, Supabase Custom Claims/RBAC, Supabase Local Testing, Supabase SSR Auth

### Community 87 - "Concept A Selection-First"
Cohesion: 0.09
Nodes (22): Audit Chain, Canonical Profile, Canonicalization, Hashing, and Replay Blueprint, Code and Environment Manifest, Correction and Supersession, Dates and timestamps, Decimals, Decision Root Commitment (+14 more)

### Community 88 - "Annotated Source Register"
Cohesion: 0.29
Nodes (7): Canonicalization, Hashing, and Replay, FIPS 180-4 — SHA-256, PostgreSQL 18 Determinism References, RFC 8259 and RFC 7493 — JSON/I-JSON, RFC 8785 — JSON Canonicalization Scheme, SLSA Build Provenance 1.2, W3C PROV-DM

### Community 89 - "review.ts"
Cohesion: 0.02
Nodes (89): AbstainReviewRequest, abstainReviewRequestSchema, abstainReviewResponseDataSchema, abstainReviewResponseSchema, AbstentionReason, abstentionReasonSchema, accessibilityBlockingIssueRecordSchema, accessibilityBlockingIssueSchema (+81 more)

### Community 90 - "Two-Stage BrainLift Evaluation Logic"
Cohesion: 0.33
Nodes (6): Decomposing the 2.6× claim, Multi-cohort cumulative estimation, Next unresolved weakness — power and noninferiority, Stage 1 — Track B program effect, Stage 2 — Track B service fit, Two-Stage BrainLift Evaluation Logic

### Community 91 - "env.ts"
Cohesion: 0.06
Nodes (39): GET(), GET(), AdmissionsPage(), ConfigAuditPage(), FamilyPage(), ReviewPage(), metadata, SurfacePlaceholder() (+31 more)

### Community 92 - "replay.ts"
Cohesion: 0.06
Nodes (32): ApiMeta, apiMetaSchema, apiSuccessSchema(), exactVerification, meta, storedDecision, digestReplayResultSchema, digestVerificationSchema (+24 more)

### Community 93 - "Backend tickets"
Cohesion: 0.07
Nodes (29): B10 — Implement `api.get_application_status` (read RPC), B11 — Regenerate and commit `packages/db-types`, B11A — Implement the Cognito/`pg` request adapter, B12 — Stretch: private accommodation/language route request table, B1 — Expand the application draft/version contract to the full PRD field set, B2 — Define the missing read-RPC and draft-save-response contracts, B3 — Migration: `app.application` and `app.application_version` tables, B4 — Migration: minimal synthetic `cycle` table + seed row (+21 more)

### Community 94 - "GT Admissions MVP — Web Application Architecture Plan"
Cohesion: 0.07
Nodes (28): 10. Testing & CI gate architecture (acceptance), 11. Build sequence (aligned to the PRD four-week timeline), 12. Governance updates required (per AGENTS.md § Update governance + Completion check), 13. Open blockers referenced, 1. Architectural goals and non-negotiable invariants, 2. System context (C4 level 1), 3. Technology stack (locked), 4.1 Next.js structure — four role-scoped surfaces (+20 more)

### Community 95 - "application.ts"
Cohesion: 0.06
Nodes (32): ApplicationDraft, ApplicationEducation, applicationEducationSchema, ApplicationFinalSubmission, applicationFinalSubmissionSchema, ApplicationGuardian, applicationGuardianSchema, ApplicationState (+24 more)

### Community 96 - "correction.ts"
Cohesion: 0.07
Nodes (30): applicationDraftSchema, assessmentInputSchema, applicationFactualCorrectionSchema, AppliedCorrection, appliedCorrectionSchema, ApplyCorrectionRequest, applyCorrectionRequestSchema, applyCorrectionResponseDataSchema (+22 more)

### Community 97 - "Frontend Enablement Report"
Cohesion: 0.10
Nodes (20): 2026-07-20 pre-CogAT onboarding handoff, Contract freeze, Current integration guidance, Cycle 1 frontend handoff, Cycle 2 frontend handoff, Cycle 3 frontend handoff, Cycle 4 frontend handoff, Cycle 5 frontend handoff (+12 more)

### Community 98 - "package.json"
Cohesion: 0.10
Nodes (20): dependencies, zod, devDependencies, typescript, vitest, @vitest/coverage-v8, exports, typescript (+12 more)

### Community 99 - "package.json"
Cohesion: 0.10
Nodes (20): dependencies, @gt-selection/contracts, devDependencies, typescript, vitest, @vitest/coverage-v8, exports, @gt-selection/contracts (+12 more)

### Community 100 - "compilerOptions"
Cohesion: 0.10
Nodes (20): DOM, DOM.Iterable, ES2022, node, compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames (+12 more)

### Community 101 - "contracts.test.ts"
Cohesion: 0.11
Nodes (18): applicationVersionSchema, assessmentVersionSchema, getApplicationStatusRequestSchema, getApplicationStatusResponseSchema, recordAssessmentVersionRequestSchema, recordAssessmentVersionResponseSchema, saveApplicationDraftRequestSchema, saveApplicationDraftResponseSchema (+10 more)

### Community 102 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @gt-selection/contracts, @gt-selection/db-types, @gt-selection/test-fixtures, next, react, react-dom, @supabase/ssr (+11 more)

### Community 103 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, eslint-config-next, @playwright/test, @testing-library/jest-dom, @testing-library/user-event, @types/react, typescript, @vitejs/plugin-react (+11 more)

### Community 104 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, @eslint/js, devDependencies, eslint, @eslint/js, prettier, supabase, tsx (+11 more)

### Community 105 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, boundaries:check, build, db:lint, db:reset, db:start, db:stop, db:test (+11 more)

### Community 106 - "index.ts"
Cohesion: 0.11
Nodes (17): ApplicationVersion, AssessmentVersion, GetApplicationStatusResponse, RecordAssessmentVersionResponse, SaveApplicationDraftResponse, SubmitApplicationResponse, ApplyCorrectionResponse, ReplayDecisionResponse (+9 more)

### Community 107 - "Feature-to-Requirement Development Map"
Cohesion: 0.11
Nodes (17): Admissions product, Backend and platform, Complete feature inventory, Current implementation snapshot, Current status, Evaluation and future live-use features, External blockers for live use, Feature-to-Requirement Development Map (+9 more)

### Community 108 - "Cycle log"
Cohesion: 0.11
Nodes (17): Cycle 0 — Setup, Cycle 1 — Draft-save contract, Cycle 2 — Submitted-application response, Cycle 3 — Assessment recording and routing contracts, Cycle 4 — Snapshot submission contracts, Cycle 5 — Review submission transitions, Cycle 6 — Abstention, replacement, and pending blockers, Cycle 7 — Immutable correction successors (+9 more)

### Community 109 - "decision.ts"
Cohesion: 0.12
Nodes (15): DecisionKind, decisionKindSchema, DecisionSummary, decisionSummaryBaseSchema, TrackADecisionSummary, trackADecisionSummarySchema, TrackAOutcome, TrackBEligibilityDecisionSummary (+7 more)

### Community 111 - "tsconfig.json"
Cohesion: 0.14
Nodes (13): compilerOptions, incremental, paths, plugins, exclude, extends, include, ../../tsconfig.base.json (+5 more)

### Community 112 - "package.json"
Cohesion: 0.17
Nodes (11): devDependencies, typescript, exports, typescript, name, private, scripts, lint (+3 more)

### Community 113 - "workflow.ts"
Cohesion: 0.18
Nodes (10): PendingItem, pendingItemOwnerRoleSchema, pendingItemRouteCodeSchema, pendingItemSchema, PendingReason, pendingReasonSchema, StatusProjection, statusProjectionSchema (+2 more)

### Community 114 - "Comparator Case Study — Summer Science Program (SSP International)"
Cohesion: 0.18
Nodes (10): 1. What SSP is, 2. The selection funnel — original claim vs. verified numbers, 3. The actual 2026 process (the significant change), 4. The evaluation study, 5. Organizational scale & the money (context for feasibility, R8), 6. Critiques, tensions, and open questions, 7. Direct relevance to the GT project, 8. Open data gaps (for anyone extending this) (+2 more)

### Community 115 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, start, test, test:coverage, test:e2e (+1 more)

### Community 116 - "package.json"
Cohesion: 0.22
Nodes (8): engines, node, pnpm, name, packageManager, private, type, version

### Community 117 - "GT Selection Capstone"
Cohesion: 0.22
Nodes (8): Canonical project guidance, CI/CD, GT Selection Capstone, Local commands, Ownership and merge coordination, Prerequisites, Repository status, Workspace

### Community 118 - "snapshot-contract.test.ts"
Cohesion: 0.29
Nodes (6): submitSnapshotVersionRequestSchema, submitSnapshotVersionResponseSchema, artifactReference, meta, narrativeReference, status

### Community 119 - "tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, extends, include, src/**/*.ts, ../../tsconfig.base.json

### Community 120 - "tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, extends, include, src/**/*.ts, ../../tsconfig.base.json

### Community 121 - "tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, extends, include, src/**/*.ts, ../../tsconfig.base.json

### Community 122 - "Fast Mode"
Cohesion: 0.33
Nodes (5): Eligible tasks, Escalate to full mode, Fast Mode, Skip by default, Workflow

### Community 123 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, proseWrap, semi, singleQuote, trailingComma

### Community 124 - "check-security-boundaries.ts"
Cohesion: 0.33
Nodes (4): forbiddenPatterns, root, scanRoots, violations

### Community 125 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 126 - "onlyBuiltDependencies"
Cohesion: 0.40
Nodes (5): pnpm, onlyBuiltDependencies, esbuild, sharp, unrs-resolver

### Community 127 - "check-workspace-boundaries.ts"
Cohesion: 0.40
Nodes (3): packageRoot, root, violations

### Community 128 - "create-local-auth-users.ts"
Cohesion: 0.40
Nodes (4): existingEmails, parsedUrl, supabase, syntheticUsers

### Community 129 - "review-pending.test.ts"
Cohesion: 0.50
Nodes (3): meta, submitReviewActionRequestSchema, submitReviewActionResponseSchema

## Ambiguous Edges - Review These
- `Program Effect` → `Track A vs Track B Difference as Program Effect Claim`  [AMBIGUOUS]
  docs/GT_ADMISSIONS_APPLICATION_MVP_PRD.md · relation: conceptually_related_to
- `Program Effect` → `Alpha 2.6x MAP Growth Claim Under Test`  [AMBIGUOUS]
  gt-school-counterfactual-brainlift/brainlift-gt-school-counterfactual.md · relation: conceptually_related_to
- `R2 Credible Counterfactual` → `Track A vs Track B Difference as Program Effect Claim`  [AMBIGUOUS]
  docs/GT_ADMISSIONS_APPLICATION_MVP_PRD.md · relation: conceptually_related_to
- `R10 Conclusion Boundaries` → `Track A vs Track B Difference as Program Effect Claim`  [AMBIGUOUS]
  docs/GT_ADMISSIONS_APPLICATION_MVP_PRD.md · relation: conceptually_related_to

## Knowledge Gaps
- **1325 isolated node(s):** `printWidth`, `proseWrap`, `semi`, `singleQuote`, `trailingComma` (+1320 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Program Effect` and `Track A vs Track B Difference as Program Effect Claim`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Program Effect` and `Alpha 2.6x MAP Growth Claim Under Test`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `R2 Credible Counterfactual` and `Track A vs Track B Difference as Program Effect Claim`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `R10 Conclusion Boundaries` and `Track A vs Track B Difference as Program Effect Claim`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Annotated Source Register` connect `Effect-Size and Meaningful-Effect Benchmarks` to `Accessibility, Translation, and Measurement Fairness`, `Tutoring, Adaptive Software, and Program Mechanisms`, `Child Data Privacy and Synthetic-Data Safety`, `Explanation and Contestability`, `Reviewer Reliability and Rubric Validation`, `Initial Anchor Sources`, `Growth Outcomes and Falsification`, `Recent 2024–2026 Evidence`, `Current GT, Timeback, Alpha, and TEFA Sources`, `Policy Learning and Heterogeneous Effects`, `Randomized Allocation and Aid`, `Power, Missingness, and Interference`, `Auditable Randomness and Allocation Security`, `Fairness and Contestability`, `Complex Regression Discontinuity`, `Advanced STEM Readiness`, `Backend, Audit, and Reproducibility`, `Fidelity and Economic Evaluation`, `Selective Labels and Missing Outcomes`, `Transportability and External Validity`, `Monitoring and Drift`, `Uncertainty and Abstention`, `Reproducible Evaluator Exports`, `Standard Setting and Decision Utility`, `Supabase Auth, RLS, and Local Testing`, `Annotated Source Register`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `Tutoring, Adaptive Software, and Program Mechanisms` connect `Tutoring, Adaptive Software, and Program Mechanisms` to `Effect-Size and Meaningful-Effect Benchmarks`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `Complex Regression Discontinuity` connect `Complex Regression Discontinuity` to `Effect-Size and Meaningful-Effect Benchmarks`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._