# Requirement Traceability Matrix

## Rules

- Every concept, feature, experiment, or technical work item must reference at least one requirement ID.
- Required items must identify acceptance evidence before implementation begins.
- A work item without traceability is out of scope unless an approved scope exception exists.
- Update status and evidence links as work progresses; do not mark `Verified` without fresh evidence.

## Requirement coverage

| ID | Requirement summary | Current product mapping | Acceptance evidence | Accountable owner | Status |
|---|---|---|---|---|---|
| R1 | Produce a student-selection decision | D-008 Track A/Track B prototype | PRD routing and eligibility acceptance cases | Team lead | Specified |
| R2 | Create a credible counterfactual | Allocation/evaluation remains undecided | Future identification review | Evaluation owner | Deferred |
| R3 | Define the causal question prospectively | No causal protocol ratified | Future prospective evaluation specification | Evaluation owner | Deferred |
| R4 | Avoid circular selection and measurement | PRD separates admissions evidence from future impact outcomes | Selection-to-outcome field firewall test | Product and evaluation owners | Partially specified |
| R5 | Preserve a defensible capability standard | Profile-aware CogAT gate plus Talent Evidence Snapshot | Reviewer rubric, boundary, prohibited-input, and validation plan | Selection owner | Specified pending validation |
| R6 | Measure growth without ceiling effects | No impact outcome ratified | Future measurement validation | Measurement owner | Deferred |
| R7 | Make the process auditable and falsifiable | Versioned routing, reviewer, decision, correction, and claim traces | Deterministic replay and claim-boundary tests | Product owner | Specified |
| R8 | Operate under real GT constraints | Four-week synthetic workflow; GT values remain configurable | Synthetic feasibility review and open-decision register | Operations owner | In progress |
| R9 | Protect students and families | Access, privacy, consent, correction, appeal, and re-entry workflows | Applicant-rights, access-fulfillment, translation, and prohibited-field acceptance tests | Student/family advocate | Partially specified |
| R10 | State claim boundaries | Eligibility separated from allocation and program-effect claims | Claims register and adversarial notice tests | Team lead | Specified |
| H1 | Use broader capability measures | Any demonstrable talent domain may support Track B | Domain-neutral rubric and domain-anchor validation | Selection owner | Specified pending validation |
| H2 | Separate capability from family advantage | Prose, income, prestige, awards, paid enrichment, and recommender access prohibited | Field-firewall and route-outcome audits | Selection owner | Specified |
| H3 | Address unobserved selection | No allocation/evaluation method chosen | Future identification-strength review | Evaluation owner | Deferred |
| H4 | Expand candidate-pool access | Profile-aware below-cutoff Track B | Invitation and route-completion funnel tests | Access owner | Specified |
| H5 | Use independent evaluation | Auditor role defined; evaluation protocol deferred | Future independence agreement | Team lead | Deferred |
| H6 | Ensure adequate statistical information | No sample/power design chosen | Future power or precision assessment | Evaluation owner | Deferred |
| H7 | Track equity and access | Route, subgroup, accommodation, pending, and reviewer metrics | Synthetic subgroup funnel, access-fulfillment, language-route, and reviewer audit | Access owner | Partially specified |
| H8 | Protect current high performers | Not addressed by admissions prototype | Future guardrail definition | Program owner | Not assessed |
| H9 | Explain and contest decisions | Reason traces, correction, appeal, pending, and re-entry | Applicant explanation and appeal tests | Student/family advocate | Specified |
| H10 | Minimize gaming and burden | 10–15 minute Snapshot, provenance, fallback route, prohibited-input rules | Timed usability and adversarial evidence tests | Product owner | Specified |

## Work-item register

Add one row before beginning substantive work.

| Work ID | Work item | Requirement IDs | Why needed | Acceptance evidence | Owner | Reviewer | Status | Scope exception |
|---|---|---|---|---|---|---|---|---|
| GOV-001 | Establish project governance package | R7, R8, R10, H9 | Keep contributors aligned and make boundary violations visible | Canonical documents exist, cross-reference correctly, and agent rule loads project-wide | Team lead | Team | Verified | None |
| PLAN-001 | Create four-week critic-ready execution roadmap | R1–R10, H1–H10 | Sequence a two-person, AI-accelerated prototype and evidence package against critic-facing gates | Roadmap fits 40 human person-days, separates human and AI work, maps tasks to requirements, and excludes production/live-impact claims | Team lead | Team | Verified | None |
| GOV-002 | Distill historical PRD sprint references | R7, R8, R10, H5, H9 | Preserve reusable concepts, critic checks, and metric patterns without implying a ratified product | Three solution-agnostic references exist, rubric includes the scorecard, governance links are updated, and historical folder is removed | Team lead | Team | Verified | None |
| GOV-003 | Initialize project repository and planning baseline | R7, R8, R10 | Version the charter, requirements, evidence, decisions, guardrails, roadmap, and BrainLift as the shared planning baseline | Local `main` tracks the empty GitHub repository through `origin`, planning files are committed, and non-project OS metadata is ignored | Team lead | Team | Verified | None |
| RES-001 | Research CogAT gaps and candidate 1–2 test suites | R5, R7–R10, H1, H2, H4, H7, H9, H10 | Identify distinct measurement gaps, avoid redundant tests, and recommend a four-week prototype architecture | Multi-agent source-graded report ranks gaps, compares current tests, separates process from test fixes, and records candidate evidence without ratifying a live suite | Evidence owner | Team | Verified | None |
| RES-002 | Research holistic giftedness evidence and recommendation methods | R5, R7–R10, H1, H2, H4, H7, H9, H10 | Replace freeform advocacy with structured multi-domain evidence and identify defensible non-test methods | Source-graded report specifies parent/recommender forms, common performance and dynamic tasks, pathway logic, rater controls, adversarial cases, and evidence limits without ratifying a live process | Evidence owner | Team | Verified | None |
| UX-001 | Define application-process user stories | R1, R5, R8, R9, H1, H2, H4, H7, H9, H10 | Cover domain-diverse, asynchronous, accommodated, under-resourced, boundary, family, recommender, staff, and critic needs before product design | User-story library maps 49 distinct situations to observable application needs and identifies the four-week prototype subset without creating eligibility rules | Product owner | Team | Verified | None |
| UX-002 | Map user stories to a minimal MVP feature set | R1, R5, R7–R10, H1, H2, H4, H7, H9, H10 | Ensure every user need is solved end to end without multiplying one-off features or manual exceptions | Eleven bounded features map all 49 stories to primary/supporting capabilities and explicit acceptance conditions; the four-week depth cut preserves every workflow, audit, and claim-boundary contract | Product owner | Team | In progress | None |
| DOC-001 | Convert and review the admissions MVP PRD | R1, R5, R7–R10, H1, H2, H4, H7, H9, H10 | Preserve the authored Word PRD in a reviewable repository format and identify conflicts with confirmed scope and requirements | Faithful Markdown conversion exists; independent review identifies prioritized edits without silently changing the authored content | Product owner | Team | Verified | None |
| PRD-001 | Specify the Track A/Track B admissions prototype | R1, R5, R7–R10, H1, H2, H4, H7, H9, H10 | Convert confirmed product decisions into a bounded, testable four-week synthetic MVP while deferring R2, R3, R6, and remaining R4 evaluation work | PRD preserves Track A, defines profile-aware Track B invitation and dual-route Snapshot eligibility, separates allocation/research/finance, includes roles, states, requirements, acceptance criteria, metrics, risks, and open decisions | Product owner | Team | Verified | None |
| PLAN-002 | Divide the four-week MVP across two members and agent lanes | R7, R8, R10 | Sequence independent work, minimize concurrent-file edits and merge conflicts, and expose external dependencies | PRD assigns module ownership, agent boundaries, weekly checkpoints, merge rules, blocker tags, sources, synthetic fallbacks, and blocked claims | Team lead | Team | Verified | None |
| TECH-001 | Select the prototype backend | R7, R8, R9 | Align the PRD and labor plan to the team’s chosen data and backend platform | D-009 and the PRD consistently specify local Supabase with PostgreSQL and prohibit live child data or production deployment | Technical owner | Team | Verified | None |
| RES-003 | Research accessibility, translation, and measurement fairness | R5, R7–R10, H2, H4, H7, H9, H10 | Prevent software noninterference from being misrepresented as construct or route equivalence | Source-verified report separates interface access, noninterference, construct preservation, and empirical route equivalence; algorithms, fixtures, and private data contracts implement bounded synthetic checks | Evidence owner | Team | Implemented | None |

## Requirement coverage statuses

- `Not assessed`
- `Deferred`
- `Partially specified`
- `Specified`
- `Specified pending validation`
- `In progress`

## Work-item statuses

- `Proposed`
- `Approved`
- `In progress`
- `Blocked`
- `Implemented`
- `Verified`
- `Rejected`
- `Removed`

`Implemented` means the artifact exists. `Verified` means its stated acceptance evidence has been checked.
