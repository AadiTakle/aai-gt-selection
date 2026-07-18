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
- **Status:** Superseded by D-008
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

### D-008 — Ratify Track B Talent Evidence Snapshot prototype

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Preserve the authorized Track A CogAT admissions rule and add a profile-aware Track B invitation for promising below-cutoff CogAT applicants. Final Track B eligibility combines the CogAT gate with a 10–15 minute parent/guardian Talent Evidence Snapshot requiring no new child work.
- **Requirements served:** R1, R5, R7–R10, H1, H2, H4, H7, H9, H10
- **Evidence:** E-005 and E-006 support caution around a single hard screen while preserving capability; E-019 shows nominations provide limited complementary information; E-021 supports replacing unstructured recommendations with structured evidence while noting transfer limits; E-023 supports structured rules over freeform holistic judgment. None validates the Snapshot for live GT eligibility, so approval is restricted to the synthetic prototype.
- **Evidence routes:** Primary route uses one or two existing artifacts per selected domain. Applicants without artifacts may use a bounded structured narrative fallback completed by a parent/guardian or other directly observing adult.
- **Review:** Artifact route receives two independent reviews and a blind third review on disagreement. Narrative fallback receives three independent blind reviews from the start. Majority classification controls.
- **Domain rule:** Any demonstrable talent domain may contribute when evidence also shows learning rate, transfer, abstraction, or comparable capacity relevant to thriving in GT. Domain prestige cannot affect the decision.
- **Alternatives considered:** Keep the current parent essay; require new child performance tasks; restrict Track B to academic domains; make artifacts mandatory; use one reviewer; use automated scoring.
- **Rationale:** The selected workflow reduces parent-prose bias, preserves access for applicants without recorded artifacts, retains asynchronous/domain-specific talent, and fits the no-additional-child-work and four-week constraints.
- **Consequences:** The exact CogAT band, battery-profile rule, domain anchors, rubric thresholds, service catalog, and allocation/evaluation method remain configurable/open. Track B eligibility does not itself establish program effect or guarantee a seat.
- **Owner:** Team lead
- **Supersedes:** D-005

### D-009 — Use Supabase and PostgreSQL for the prototype backend

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Use Next.js with the local Supabase development stack and PostgreSQL for the four-week synthetic prototype.
- **Requirements served:** R7, R8, R9
- **Alternatives considered:** Firebase Emulator Suite.
- **Rationale:** The team selected PostgreSQL and Supabase in a separate technical discussion.
- **Consequences:** PostgreSQL stores synthetic application and workflow data; Supabase provides local APIs, authentication, storage integration, and role-based access. No live child data or production Supabase project is authorized.
- **Owner:** Team lead

### D-010 — Ratify future two-stage evaluation design, MAP outcome, and MVP remedy/consent boundaries

- **Date:** 2026-07-18
- **Status:** Approved
- **Decision:** Ratify the following governance-sync clarifications, restoring the BrainLift's intended two-stage evaluation interpretation and aligning MVP scope with the RES-008/RES-009 findings: (1) any future evaluation of Track B is a two-stage design, not a single Track-A-vs-Track-B comparison — stage one randomizes offer-versus-not-offered among equally eligible Track B candidates to estimate the Track B initial-offer/package effect, and stage two compares treated Track B against treated Track A as a service-fit noninferiority comparison; neither stage, nor their combination, supports a claim that Track A and Track B have equal route-specific causal effects without a Track A counterfactual. (2) MAP is ratified as the selected common future outcome measure for this design, verified only with lightweight upper-tail and administration-consistency checks, never scored or used for eligibility. (3) The proposed non-offered-candidate follow-up is a fall/winter/spring MAP testing schedule, a proposed next-cycle application-fee waiver of about $100 for submitting all three MAP results, and a 2–3 minute structured questionnaire per MAP submission covering schooling, tutoring, adaptive software, enrichment, and MAP prep since the prior test. (4) The questionnaire is hidden from admissions and cannot affect eligibility or re-entry; the questionnaire and other post-assignment resource data are descriptive mechanism/substitution information for a future evaluator, not primary intent-to-treat controls. (5) Sufficient Track B applicant volume/oversubscription (needed for randomized offer-versus-not-offered) is treated as an external go-to-market assumption, not a product blocker. (6) Pooling cohorts across cycles and handling rule/rubric/rater version drift are future analyst responsibilities using existing operational metadata; the MVP adds no new applicant-facing fields to support this. (7) MVP decision remedies are limited to explanation and factual/procedural correction; a substantive rubric-application appeal and automated re-entry are deferred beyond MVP scope, though manual staff-initiated re-entry may remain. (8) All prototype Track A/Track B rules remain fictional, versioned, and tagged `synthetic_only=true` and `validated=false`. (9) Any future seat allocation and the future evaluation design described above remain strictly downstream of this MVP and outside its scope.
- **Requirements served:** R2, R3, R4, R6, R7, R8, R9, R10, H3, H5, H6, H8, H9
- **Evidence:** RES-008 (two-stage estimand correction), RES-009 (cohort pooling and version-drift analysis), RES-004 (explanation/correction/appeal boundary), RES-005 (privacy/consent separation for research fields)
- **Alternatives considered:** Ratifying a single Track-A-vs-Track-B comparison as an equal-effect causal claim; collecting the resource questionnaire as a decision-used or admissions-visible field; adding new MVP persistence fields for cohort pooling or version tracking now; implementing substantive rubric appeal and automated re-entry within the four-week MVP; leaving prototype rules unmarked or implicitly authoritative.
- **Rationale:** RES-008 confirms the BrainLift intended two distinct comparisons — a randomized intent-to-treat estimate and a non-randomized service-fit comparison — while the prior PRD wording collapsed them into one equal-effect causal claim; separating them preserves a valid future identification strategy without overstating what either stage can show. Treating MAP, the fee waiver, and the questionnaire as proposed and hidden from admissions keeps the eligibility product from being contaminated by future-outcome incentives while still recording enough design intent that a future evaluator is not foreclosed. Deferring substantive appeal, automated re-entry, and cohort-pooling fields keeps the four-week MVP scoped to explainable eligibility and correction rather than adjudication or longitudinal-analysis capacity the team cannot build or validate in the available time.
- **Consequences:** The PRD's "Allocation and Evaluation," "Future Evaluation Handoff," and "Correction, Appeal, and Re-entry" sections, and `B-08`, must state these boundaries; no claim of Track A/Track B causal equivalence, live allocation, or implemented substantive appeal/automated re-entry is authorized. Applicant-volume risk is explicitly not a reason to block MVP delivery. All prototype rules remain fictional/versioned/`synthetic_only=true`/`validated=false` until superseded by a live-validation decision.
- **Owner:** Team lead
- **Relationship to prior decisions:** Builds on D-008 (Track A/Track B prototype ratification) and D-009 (Supabase/PostgreSQL backend) by fixing the future evaluation and remedy boundaries those decisions left open; does not supersede either.

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
