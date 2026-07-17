# Decision Log

## Rules

Record decisions that change scope, requirements, evidence standards, product direction, or major trade-offs. Do not use this log for routine implementation choices.

Each decision must include the requirements served, alternatives considered, evidence, consequences, owner, and date. Reversals create a new entry; do not rewrite history.

## Decisions

### D-001 — Establish canonical project governance

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Use the charter, requirements, rubric, traceability matrix, evidence register, decision log, and scope-exception log as the canonical governance package.
- **Requirements served:** R7, R8, R10, H9
- **Alternatives considered:** Rely on the BrainLift alone; rely on a PRD alone.
- **Rationale:** Research does not define operating scope, and a PRD can prematurely lock a solution. Separate governance makes boundaries explicit and reviewable.
- **Consequence:** All contributors must use the canonical reading order in `PROJECT_CHARTER.md`.
- **Owner:** Team lead

### D-002 — Keep project requirements solution-agnostic

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Requirements define outcomes and evidence standards, not a lottery, specific assessment, workflow, or architecture.
- **Requirements served:** R1–R10
- **Alternatives considered:** Adopt the BrainLift's capability-gated lottery as the required solution.
- **Rationale:** The BrainLift is a core resource, but its proposed solution is not the capstone requirement.
- **Consequence:** Preferred mechanisms must be justified during concept selection rather than treated as fixed.
- **Owner:** Team lead

### D-003 — Require requirement-ID traceability

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Every substantive plan, feature, experiment, or technical work item must map to at least one R/H requirement.
- **Requirements served:** R7, R8, R10
- **Alternatives considered:** Informal alignment during review.
- **Rationale:** Explicit IDs make scope drift visible before implementation.
- **Consequence:** Unmapped work is rejected or requires an approved scope exception.
- **Owner:** Team lead

### D-004 — Treat previous PRD sprint outputs as historical exploration

- **Date:** 2026-07-17
- **Status:** Superseded by D-007
- **Decision:** Retain `docs/prd-sprint/` for research and design reference, but do not treat it as an approved product direction or binding PRD.
- **Requirements served:** R7, R8, R10
- **Alternatives considered:** Delete the files; adopt them as the current PRD.
- **Rationale:** The work contains useful analysis but was created before the team selected a product direction.
- **Consequence:** Canonical governance documents override any conflicting material in that folder.
- **Owner:** Team lead

### D-005 — No product concept is currently ratified

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Product discovery remains open until the team evaluates concepts against the development rubric.
- **Requirements served:** R1–R10
- **Alternatives considered:** Ratify the integrated pilot from the historical PRD sprint.
- **Rationale:** The team must own concept selection and trade-offs.
- **Consequence:** Agents may analyze or prototype concepts but must not describe one as approved without a new decision entry.
- **Owner:** Team lead

### D-006 — Scope the capstone to two people and four weeks

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Target a critic-ready synthetic-data prototype and evaluation evidence pack within four weeks and 40 human person-days, using parallel AI factories.
- **Requirements served:** R1–R10, H1–H10
- **Alternatives considered:** Production-ready admissions system; live pilot; full academic-year impact evaluation.
- **Rationale:** AI can compress research, implementation, testing, and documentation, but cannot remove stakeholder, psychometric, ethical, or elapsed-time constraints.
- **Consequence:** Production launch, live student data, final external approvals, and measured program impact are explicitly out of scope. The prototype must distinguish proven, simulated, assumed, and future work.
- **Owner:** Team lead

### D-007 — Distill and remove the historical PRD sprint

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Preserve reusable concept, critic-review, metric, guardrail, and scoring material in solution-agnostic canonical references, then delete `docs/prd-sprint/`.
- **Requirements served:** R7, R8, R10, H5, H9
- **Alternatives considered:** Retain the folder indefinitely; delete it without preserving reusable material.
- **Evidence:** `CONCEPT_OPTIONS.md`, `CRITIC_REVIEW_CHECKLIST.md`, `METRICS_AND_GUARDRAILS_LIBRARY.md`, and the updated development rubric.
- **Rationale:** The folder contained valuable analysis but also a large unratified PRD that could mislead contributors into treating Concept C as approved.
- **Consequence:** The distilled references preserve useful options and test patterns without carrying forward a product decision.
- **Owner:** Team lead
- **Supersedes:** D-004

## Entry template

### D-XXX — Decision title

- **Date:** YYYY-MM-DD
- **Status:** Proposed / Approved / Superseded / Rejected
- **Decision:** Concise statement
- **Requirements served:** R/H IDs
- **Alternatives considered:** Options evaluated
- **Evidence:** Register IDs or source links
- **Rationale:** Why this choice best serves the requirements
- **Consequences:** Scope, risks, and follow-up work
- **Owner:** Named decision-maker
- **Supersedes:** Prior decision ID, if applicable
