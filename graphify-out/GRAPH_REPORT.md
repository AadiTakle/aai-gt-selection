# Graph Report - .  (2026-07-18)

## Corpus Check
- Corpus is ~49,885 words - fits in a single context window. You may not need a graph.

## Summary
- 137 nodes · 131 edges · 26 communities (16 shown, 10 thin omitted)
- Extraction: 88% EXTRACTED · 9% INFERRED · 3% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Causal Attribution and Governance
- Selection Requirements and Rights
- Evaluation Design and Measurement
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

## God Nodes (most connected - your core abstractions)
1. `R2 Credible Counterfactual` - 9 edges
2. `R9 Protect Students and Families` - 6 edges
3. `D-008 Track B Talent Evidence Snapshot Prototype` - 6 edges
4. `R7 Auditable and Falsifiable Process` - 5 edges
5. `Required Hard Gates` - 5 edges
6. `Program Effect` - 4 edges
7. `Credible Counterfactual` - 4 edges
8. `R1 Actual Student-Selection Decision` - 4 edges
9. `R5 Defensible Capability Standard` - 4 edges
10. `R6 Growth Without Gifted Ceiling` - 4 edges

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

## Communities (26 total, 10 thin omitted)

### Community 0 - "Causal Attribution and Governance"
Cohesion: 0.16
Nodes (14): Canonical Document Precedence, E-001 Public GT Reporting Lacks Credible Comparison, Methodologist Critic Lens, D-001 Canonical Project Governance, Seat Allocation and Evaluation Out of Scope, Track A vs Track B Difference as Program Effect Claim, R10 Conclusion Boundaries, R2 Credible Counterfactual (+6 more)

### Community 1 - "Selection Requirements and Rights"
Cohesion: 0.16
Nodes (14): Mandatory Contributor Workflow, E-006 Ability and Achievement Remain Predictive, Decision Rule Matters More Than Extra Test, Applicant and Family Critic Lens, D-002 Solution-Agnostic Requirements, D-003 Requirement-ID Traceability, Required Hard Gates, Rights Safety and Data Metrics (+6 more)

### Community 2 - "Evaluation Design and Measurement"
Cohesion: 0.18
Nodes (12): E-009 Random Assignment Balances Unobserved Traits, E-012 High-Ceiling Outcome Availability Assumption, Impact and Measurement Metrics, H3 Address Unobserved Selection, R3 Prospective Causal Question, R6 Growth Without Gifted Ceiling, Deferred R2 R3 R6 Evaluation Work, BrainLift PDF Export (+4 more)

### Community 3 - "Track B Snapshot Review"
Cohesion: 0.21
Nodes (12): E-019 Nominations Are Limited Complementary Evidence, E-020 Teacher Effects in Ratings, E-021 Unstructured Recommendations Encode Advantage, D-005 No Ratified Concept, D-008 Track B Talent Evidence Snapshot Prototype, Existing Artifact Evidence Route, Independent Blind Majority Review, Bounded Structured Narrative Fallback (+4 more)

### Community 4 - "Evidence Quality and Screening"
Cohesion: 0.20
Nodes (10): E-004 Alpha 2.6x MAP Growth Company Claim, Access and Fairness Metrics, H4 Expand Candidate-Pool Access, H7 Equity and Access Guardrails, Card and Giuliano Universal Screening Study, Alpha 2.6x MAP Growth Claim Under Test, Elite Illusion Null-at-the-Margin Evidence, Author Stake and Conflict-of-Interest Audit (+2 more)

### Community 5 - "Audit and Local Validation"
Cohesion: 0.20
Nodes (10): E-011 Independent Evaluation Permission Assumption, E-017 WJ V and WISC-V Targeted Pathway, E-023 Structured Review Beats Freeform Holism, Prospective Local Psychometric Validation, Reusable Adversarial Tests, Versioned Decision Audit and Replay, Freeform Holistic Review Failure, Selection Reliability Metrics (+2 more)

### Community 6 - "Prohibited Inputs and Equity"
Cohesion: 0.29
Nodes (7): E-003 Financial Resources Shape Access, E-007 Grit and Mindset Weak Standalone Signals, E-018 Nonverbal Substitution Does Not Remove Bias, Prohibited Eligibility Inputs, H2 Capability Separated from Family Advantage, F7 Profile-Preserving Decision Engine, Credé Grit Meta-Analysis

### Community 7 - "Four-Week Roadmap"
Cohesion: 0.29
Nodes (5): Task, tasks, views, Week, weeks

### Community 8 - "Synthetic Track Configuration"
Cohesion: 0.40
Nodes (5): E-002 Unconfirmed CogAT Threshold Near 90th Percentile, Synthetic Admissions Decision Support MVP, Track A Preserved CogAT Route, Profile-Aware Track B Invitation, No Active Scope Exceptions

### Community 9 - "Capability Breadth"
Cohesion: 0.40
Nodes (5): E-005 Single Cognitive Screen False Negatives, E-008 Spatial Ability Adds Distinct Information, Structured Multi-Domain Evidence Profile, H1 Broader Evidence-Backed Capability Measures, Ability Breadth Including Spatial Reasoning

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
Cohesion: 0.50
Nodes (4): Concept A Selection-First, Concept B Evaluation-First, Concept C Integrated Selection and Evaluation, Weighted Concept Comparison Scorecard

### Community 14 - "Accessibility and Accommodations"
Cohesion: 0.67
Nodes (3): Access Language and Accommodation Stories, F2 Universal Accessible Application, F6 Accommodations and Administration Integrity

### Community 15 - "Decision Rights and Privacy"
Cohesion: 0.67
Nodes (3): Privacy Correction Appeal and Re-entry Stories, F10 Consent Privacy and Research Separation, F9 Explainable Decision and Remedy Lifecycle

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
- **71 isolated node(s):** `Week`, `Task`, `tasks`, `weeks`, `views` (+66 more)
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
- **Why does `R2 Credible Counterfactual` connect `Causal Attribution and Governance` to `Selection Requirements and Rights`, `Evaluation Design and Measurement`, `Concept Options and Scoring`?**
  _High betweenness centrality (0.226) - this node is a cross-community bridge._
- **Why does `Required Hard Gates` connect `Selection Requirements and Rights` to `Causal Attribution and Governance`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **Why does `D-008 Track B Talent Evidence Snapshot Prototype` connect `Track B Snapshot Review` to `Capability Breadth`, `Selection Requirements and Rights`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._