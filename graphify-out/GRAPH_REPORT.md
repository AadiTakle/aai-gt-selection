# Graph Report - gt-selection-capstone  (2026-07-18)

## Corpus Check
- 43 files · ~80,497 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 603 nodes · 573 edges · 48 communities (38 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 2% INFERRED · 1% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `61b4e34b`
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

## God Nodes (most connected - your core abstractions)
1. `Separating Selection Effect from Program Effect` - 45 edges
2. `Backend and Admissions Algorithm Designs` - 18 edges
3. `Accessibility, Translation, and Measurement Fairness` - 15 edges
4. `Supabase/PostgreSQL Research Data Model` - 15 edges
5. `Synthetic Simulation Specification` - 15 edges
6. `Morning Handoff` - 14 edges
7. `Iteration Log` - 14 edges
8. `Minimum Synthetic MVP Data Contract` - 13 edges
9. `Program-Mechanism and Effect-Size Benchmarks` - 13 edges
10. `Evaluator Export and Reproducibility Specification` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Project Stop Conditions` --semantically_similar_to--> `Automatic Rejection Conditions`  [INFERRED] [semantically similar]
  AGENTS.md → docs/DEVELOPMENT_RUBRIC.md
- `Alpha 2.6x MAP Growth Claim Under Test` --conceptually_related_to--> `Program Effect`  [AMBIGUOUS]
  gt-school-counterfactual-brainlift/brainlift-gt-school-counterfactual.md → PROJECT_CHARTER.md
- `Lottery ITT and LATE Identification` --semantically_similar_to--> `H3 Address Unobserved Selection`  [INFERRED] [semantically similar]
  gt-school-counterfactual-brainlift/brainlift-gt-school-counterfactual.md → docs/project-requirements.md
- `Track A vs Track B Difference as Program Effect Claim` --conceptually_related_to--> `Program Effect`  [AMBIGUOUS]
  docs/GT_ADMISSIONS_APPLICATION_MVP_PRD.md → PROJECT_CHARTER.md
- `Elite Illusion Null-at-the-Margin Evidence` --cites--> `Selection Effect`  [EXTRACTED]
  gt-school-counterfactual-brainlift/brainlift-gt-school-counterfactual.md → PROJECT_CHARTER.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Canonical Governance Package** — project_charter_mission, docs_project_requirements_r7, docs_development_rubric_hard_gates, docs_decision_log_d001 [EXTRACTED 1.00]
- **Track B Snapshot Workflow** — docs_gt_admissions_application_mvp_prd_track_b_invitation, docs_gt_admissions_application_mvp_prd_artifact_route, docs_gt_admissions_application_mvp_prd_narrative_fallback, docs_gt_admissions_application_mvp_prd_independent_review [EXTRACTED 1.00]
- **Credible Causal Evaluation Stack** — gt_school_counterfactual_brainlift_brainlift_gt_school_counterfactual_lottery_identification, docs_project_requirements_r3, docs_project_requirements_r6, docs_project_requirements_h6 [INFERRED 0.95]

## Communities (48 total, 10 thin omitted)

### Community 0 - "Causal Attribution and Governance"
Cohesion: 0.08
Nodes (23): 1. Reviewer Reliability Package, 2. Reviewer Severity and Drift, 3. Rubric Validation Stages, 4. Fairness Metrics, 5. Pending and Abstention Logic, 6. Transparent Challenger Ladder, 7. Core Sources, Defensible before valid outcomes (+15 more)

### Community 1 - "Selection Requirements and Rights"
Cohesion: 0.05
Nodes (44): Canonical Document Precedence, Mandatory Contributor Workflow, E-001 Public GT Reporting Lacks Credible Comparison, E-006 Ability and Achievement Remain Predictive, E-009 Random Assignment Balances Unobserved Traits, E-012 High-Ceiling Outcome Availability Assumption, Decision Rule Matters More Than Extra Test, Concept A Selection-First (+36 more)

### Community 2 - "GT School, Alpha, Timeback, and TEFA Public Facts"
Cohesion: 0.10
Nodes (19): Charter and External Record, Company claims, Confirmed, Current GT Services, GT School, GT School, Alpha, Timeback, and TEFA Public Facts, GT-specific unknowns, Highest-Priority Questions for GT (+11 more)

### Community 3 - "Track B Snapshot Review"
Cohesion: 0.10
Nodes (22): E-002 Unconfirmed CogAT Threshold Near 90th Percentile, E-005 Single Cognitive Screen False Negatives, E-008 Spatial Ability Adds Distinct Information, E-019 Nominations Are Limited Complementary Evidence, E-020 Teacher Effects in Ratings, E-021 Unstructured Recommendations Encode Advantage, D-005 No Ratified Concept, D-008 Track B Talent Evidence Snapshot Prototype (+14 more)

### Community 4 - "Evidence Quality and Screening"
Cohesion: 0.12
Nodes (17): E-003 Financial Resources Shape Access, E-004 Alpha 2.6x MAP Growth Company Claim, E-007 Grit and Mindset Weak Standalone Signals, E-018 Nonverbal Substitution Does Not Remove Bias, Prohibited Eligibility Inputs, Access and Fairness Metrics, H2 Capability Separated from Family Advantage, H4 Expand Candidate-Pool Access (+9 more)

### Community 5 - "Audit and Local Validation"
Cohesion: 0.20
Nodes (10): E-011 Independent Evaluation Permission Assumption, E-017 WJ V and WISC-V Targeted Pathway, E-023 Structured Review Beats Freeform Holism, Prospective Local Psychometric Validation, Reusable Adversarial Tests, Versioned Decision Audit and Replay, Freeform Holistic Review Failure, Selection Reliability Metrics (+2 more)

### Community 6 - "Prohibited Inputs and Equity"
Cohesion: 0.05
Nodes (41): Accessibility and Measurement Fairness, Adversarial Research Audit, Aid and Treatment Package, Algorithmic Guardrails, Assignment and Market-Design Finding, Backend and Admissions Research Report, Backend Data Model, Backend Research Direction (+33 more)

### Community 7 - "Four-Week Roadmap"
Cohesion: 0.29
Nodes (5): Task, tasks, views, Week, weeks

### Community 8 - "Synthetic Track Configuration"
Cohesion: 0.09
Nodes (22): Applicant Model, Assignment Designs, Causal, CogAT-Like Measurements, Core Scenario Set, Eligibility, Expected Demonstrations, Implementation Packages (+14 more)

### Community 9 - "Capability Breadth"
Cohesion: 0.12
Nodes (16): Candidate-selection lesson, Card and Giuliano (2016), Direct Implications for GT, Evaluation lesson, First stage, Implementation Lessons, Implied local fuzzy-RD treatment effects, Interpretation (+8 more)

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
Cohesion: 0.11
Nodes (18): A. Track A Audit, B. Track B Invitation, Backend and Admissions Algorithm Designs, C. Track B Snapshot Eligibility, D. Future Randomized-Offer Evaluation, E. Future Regression-Discontinuity Evaluation, F. Candidate-Selection Modeling Rules, G. Synthetic Simulation Plan (+10 more)

### Community 27 - "Overnight Backend and Admissions Research Log"
Cohesion: 0.11
Nodes (18): Implementation Transition, Iteration 0 — 2026-07-18, Iteration 10 — 2026-07-18, Iteration 11 — 2026-07-18, Iteration 12 — 2026-07-18, Iteration 1 — 2026-07-18, Iteration 2 — 2026-07-18, Iteration 3 — 2026-07-18 (+10 more)

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
Cohesion: 0.10
Nodes (20): Assessment event, Assignment, Backend Fields, By Design, Causal DAG Minimum, Falsification Register, Governance, High-Ceiling Gate (+12 more)

### Community 32 - "Track A Read-Only Audit Plan"
Cohesion: 0.10
Nodes (19): Acceptance Tests, Audit Goals, Boundary and Cutoff Distance, Calibration Gate, Core Queries, Execution Sequence, Funnel, Historical Replay (+11 more)

### Community 33 - "Supabase/PostgreSQL Research Data Model"
Cohesion: 0.11
Nodes (18): Acceptance Queries, Append-Only Audit, Application, Assessment, Consent Firewall, Core Entities, Decisions, Future Evaluation (+10 more)

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
Nodes (3): Empirical Welfare and Doubly Robust Policy Learning, Research Design Meets Market Design, Two Additional Anchor Papers

### Community 41 - "Morning Handoff"
Cohesion: 0.11
Nodes (18): Accessibility Claim Boundary, Bottom-Line Claims, Canonical Contradictions to Resolve Separately, Current Public-Fact Update, Day-0 Decisions, Executive Summary, Five Highest-Confidence Papers, Five Main Blockers (+10 more)

### Community 42 - "Adversarial Research Audit and Corrections"
Cohesion: 0.18
Nodes (10): Adversarial Research Audit and Corrections, Backend and Product Boundaries, Causal Methods, Corrections Applied, Quality Gate, Quantitative Sources, Remaining Research Risks, Research Not Ready for MVP (+2 more)

### Community 43 - "Two-Week Backend Implementation Backlog"
Cohesion: 0.11
Nodes (17): Day 0 — Resolve Contract Conflicts, Day 10 — Frontend Handoff, Day 1 — Freeze Contracts, Day 8 — Immutable Decisions, Days 1–2 — Initialize Local Supabase, Days 2–3 — Versioned Admissions and Policy, Days 3–4 — RLS and Field Firewall, Days 4–5 — Deterministic Routing (+9 more)

### Community 44 - "Priority Threats"
Cohesion: 0.12
Nodes (15): Assets, Audit Tampering, Concurrency, Evidence Access, Injection / XSS, Minimum Security Gate, Priority Threats, Privilege / Prohibited Fields (+7 more)

### Community 45 - "Minimum Synthetic MVP Data Contract"
Cohesion: 0.14
Nodes (13): API Boundaries, Application, Assessment, Audit, Correction, Decision, Excluded, Minimum Synthetic MVP Data Contract (+5 more)

### Community 46 - "Synthetic Fixture and Acceptance Matrix"
Cohesion: 0.15
Nodes (12): Accessibility and Route Consistency, Assessment Fixtures, Corrections and Pending, Frozen Test Policy, Prohibited-Field Invariance, Property Invariants, Replay and Concurrency, Review Aggregation (+4 more)

### Community 47 - "Accessibility, Translation, and Measurement Fairness"
Cohesion: 0.12
Nodes (15): Accessibility, Translation, and Measurement Fairness, Accommodation Review, Audit Fields, Construct Map, Executive Position, Governing Principle, Interface Target, Key Sources (+7 more)

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
- **449 isolated node(s):** `Week`, `Task`, `tasks`, `weeks`, `views` (+444 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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
- **Why does `Separating Selection Effect from Program Effect` connect `Prohibited Inputs and Equity` to `Two Additional Anchor Papers`, `Core Statistical Estimands`, `Advanced STEM Readiness Outcome`, `Two Anchor Evidence Families`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `Week`, `Task`, `tasks` to the rest of the system?**
  _449 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Causal Attribution and Governance` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._