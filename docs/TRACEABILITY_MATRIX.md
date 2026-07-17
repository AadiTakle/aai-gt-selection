# Requirement Traceability Matrix

## Rules

- Every concept, feature, experiment, or technical work item must reference at least one requirement ID.
- Required items must identify acceptance evidence before implementation begins.
- A work item without traceability is out of scope unless an approved scope exception exists.
- Update status and evidence links as work progresses; do not mark `Verified` without fresh evidence.

## Requirement coverage

| ID | Requirement summary | Current product mapping | Acceptance evidence | Accountable owner | Status |
|---|---|---|---|---|---|
| R1 | Produce a student-selection decision | No product concept ratified | Required before concept approval | Team lead | Not assessed |
| R2 | Create a credible counterfactual | No product concept ratified | Identification review | Evaluation owner | Not assessed |
| R3 | Define the causal question prospectively | No protocol ratified | Approved prospective specification | Evaluation owner | Not assessed |
| R4 | Avoid circular selection and measurement | No data design ratified | Selection-to-outcome data map | Product and evaluation owners | Not assessed |
| R5 | Preserve a defensible capability standard | No selection rule ratified | Measure validity and boundary-case review | Selection owner | Not assessed |
| R6 | Measure growth without ceiling effects | No outcome ratified | Measurement validation | Measurement owner | Not assessed |
| R7 | Make the process auditable and falsifiable | No product concept ratified | Audit and reporting plan | Product owner | Not assessed |
| R8 | Operate under real GT constraints | GT operating facts unconfirmed | Feasibility assessment | Operations owner | Not assessed |
| R9 | Protect students and families | No applicant workflow ratified | Applicant-rights review | Student/family advocate | Not assessed |
| R10 | State claim boundaries | No claims map ratified | Approved claims map | Team lead | Not assessed |
| H1 | Use broader capability measures | Unassigned | Distinct-value rationale | Selection owner | Not assessed |
| H2 | Separate capability from family advantage | Unassigned | Access/confounding analysis | Selection owner | Not assessed |
| H3 | Address unobserved selection | Unassigned | Identification-strength review | Evaluation owner | Not assessed |
| H4 | Expand candidate-pool access | Unassigned | Recruitment and funnel evidence | Access owner | Not assessed |
| H5 | Use independent evaluation | Unassigned | Independence agreement | Team lead | Not assessed |
| H6 | Ensure adequate statistical information | Unassigned | Power or precision assessment | Evaluation owner | Not assessed |
| H7 | Track equity and access | Unassigned | Subgroup funnel plan | Access owner | Not assessed |
| H8 | Protect current high performers | Unassigned | Guardrail definition | Program owner | Not assessed |
| H9 | Explain and contest decisions | Unassigned | Applicant explanation and appeal test | Student/family advocate | Not assessed |
| H10 | Minimize gaming and burden | Unassigned | Gaming and burden assessment | Product owner | Not assessed |

## Work-item register

Add one row before beginning substantive work.

| Work ID | Work item | Requirement IDs | Why needed | Acceptance evidence | Owner | Reviewer | Status | Scope exception |
|---|---|---|---|---|---|---|---|---|
| GOV-001 | Establish project governance package | R7, R8, R10, H9 | Keep contributors aligned and make boundary violations visible | Canonical documents exist, cross-reference correctly, and agent rule loads project-wide | Team lead | Team | Verified | None |
| PLAN-001 | Create four-week critic-ready execution roadmap | R1–R10, H1–H10 | Sequence a two-person, AI-accelerated prototype and evidence package against critic-facing gates | Roadmap fits 40 human person-days, separates human and AI work, maps tasks to requirements, and excludes production/live-impact claims | Team lead | Team | Verified | None |
| GOV-002 | Distill historical PRD sprint references | R7, R8, R10, H5, H9 | Preserve reusable concepts, critic checks, and metric patterns without implying a ratified product | Three solution-agnostic references exist, rubric includes the scorecard, governance links are updated, and historical folder is removed | Team lead | Team | Verified | None |
| GOV-003 | Initialize project repository and planning baseline | R7, R8, R10 | Version the charter, requirements, evidence, decisions, guardrails, roadmap, and BrainLift as the shared planning baseline | Local `main` tracks the empty GitHub repository through `origin`, planning files are committed, and non-project OS metadata is ignored | Team lead | Team | Verified | None |

## Allowed statuses

- `Proposed`
- `Approved`
- `In progress`
- `Blocked`
- `Implemented`
- `Verified`
- `Rejected`
- `Removed`

`Implemented` means the artifact exists. `Verified` means its stated acceptance evidence has been checked.
