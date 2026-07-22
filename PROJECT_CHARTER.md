# GT Selection Capstone — Project Charter

## Mission

Build a workable student-selection product that allows GT School to distinguish its program effect from the advantages students bring with them more credibly than its current selected-cohort reporting allows.

The project succeeds by making GT School's contribution testable. It does not need to prove a positive effect and must permit null or negative findings.

## Problem

GT School currently selects students using factors correlated with later success, including measured ability and family resources. Observing high outcomes after admission therefore cannot establish whether the program caused those outcomes.

## Goals

1. Support a real, explainable student-selection decision.
2. Create or preserve a credible counterfactual.
3. Maintain a defensible capability standard without confusing privilege with capability.
4. Measure growth from baseline with adequate upper-range precision.
5. Make selection, evaluation, and claim boundaries auditable.
6. Protect applicants and remain feasible under real school constraints.

## Non-goals

- Predetermine a lottery, test, threshold, workflow, or technical stack.
- Modify the Timeback learning platform.
- Defend GT School or guarantee a positive result.
- Prove long-term elite attainment during the capstone.
- Solve gifted-education policy beyond this selection and evaluation problem.
- Launch a production admissions system unless separately approved.

## Stakeholders

- Students and families
- GT School admissions and program operators
- School leadership and capacity or financial owners
- Independent evaluators and researchers
- Product, design, engineering, and data contributors
- Reviewers responsible for accessibility, privacy, ethics, and student welfare

## Operating principles

1. **Evidence before preference:** Distinguish verified findings, company claims, inferences, and open assumptions.
2. **Requirements before features:** Every work item must map to a project requirement.
3. **Capability, not privilege:** Ability to pay or advocate is not evidence of student capability.
4. **Claims match designs:** Growth, access, reliability, and causal impact are different conclusions.
5. **Falsifiability:** The product must support null, harmful, and inconclusive findings.
6. **Rights before research:** Evaluation quality cannot justify avoidable applicant harm.
7. **Minimum sufficient scope:** Build only what is needed for the first credible test.

## Definition of project success

The team can explain:

- who is being selected and why;
- how capability is defined;
- what comparison separates selection from program effect;
- what outcome measures meaningful growth;
- what the design can and cannot conclude;
- whether the sample and operation are viable;
- how applicants are protected; and
- what result would count against the program.

## Canonical document order

When documents conflict, use this precedence:

1. `PROJECT_CHARTER.md`
2. `docs/product/project-requirements.md`
3. `docs/governance/DEVELOPMENT_RUBRIC.md`
4. Approved entries in `docs/governance/DECISION_LOG.md` and `docs/governance/SCOPE_EXCEPTION_LOG.md`
5. `docs/product/TRACEABILITY_MATRIX.md`
6. `docs/research/ASSUMPTIONS_AND_EVIDENCE.md`
7. Product plans, specifications, designs, and implementation notes

Supporting reference libraries:

- `docs/product/CONCEPT_OPTIONS.md` preserves the unratified concept space.
- `docs/governance/CRITIC_REVIEW_CHECKLIST.md` defines reusable adversarial reviews.
- `docs/research/METRICS_AND_GUARDRAILS_LIBRARY.md` contains candidate measures, not an approved metric set.

Supporting references cannot override the canonical documents above or ratify a product direction.

## Change authority

- Changes to the charter, required requirements, or rubric require team-lead approval and a decision-log entry.
- Work outside scope requires an approved scope-exception entry before implementation.
- New evidence may update assumptions without changing scope; changes that alter requirements also require a decision entry.
