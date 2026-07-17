# Agent and Contributor Instructions

These instructions apply to every human or AI contributor working in this project.

## Start here

Read in this order before proposing or changing product behavior:

1. `PROJECT_CHARTER.md`
2. `docs/project-requirements.md`
3. `docs/DEVELOPMENT_RUBRIC.md`
4. `docs/TRACEABILITY_MATRIX.md`
5. `docs/ASSUMPTIONS_AND_EVIDENCE.md`
6. `docs/DECISION_LOG.md`
7. `docs/SCOPE_EXCEPTION_LOG.md`

When relevant, also read:

- `docs/CONCEPT_OPTIONS.md` before concept selection;
- `docs/CRITIC_REVIEW_CHECKLIST.md` before approval or completion; and
- `docs/METRICS_AND_GUARDRAILS_LIBRARY.md` before choosing metrics.

These are reference libraries, not approved product direction.

## Mandatory workflow

1. **Classify the request:** research, concept, plan, implementation, evaluation, or scope change.
2. **Map requirements:** Cite the R/H IDs served before substantive work.
3. **Check evidence:** Identify evidence-register entries used and any new assumptions.
4. **Define acceptance:** State the smallest sufficient deliverable and evidence that will verify it.
5. **Check boundaries:** Apply the hard gates and automatic rejection conditions in the rubric.
6. **Implement minimally:** Do not add unrelated features, architecture, or research questions.
7. **Update governance:** Maintain traceability, evidence, decision, and exception records when affected.
8. **Verify:** Report fresh evidence against acceptance criteria before claiming completion.

## Stop conditions

Stop and ask for direction when:

- work cannot map to R1–R10 or H1–H10;
- canonical documents conflict;
- a GT-specific fact, threshold, authority, capacity, or data source is unknown and materially changes the result;
- the proposed causal claim exceeds the design;
- applicant rights would be traded for research quality;
- a preferred solution is being treated as a requirement;
- an unapproved scope exception is needed.

Do not fill gaps by inventing facts or silently choosing a product direction.

## Required plan and handoff format

Every substantive plan must state:

- **Requirements:** R/H IDs
- **Evidence/assumptions:** E IDs and new assumptions
- **In scope:** Minimum deliverable
- **Out of scope:** Explicit exclusions
- **Acceptance evidence:** How completion will be verified
- **Risks:** Causal, applicant, operational, and privacy risks
- **Governance updates:** Files that must be updated

Every completion handoff must state:

- requirements addressed;
- files or behavior changed;
- verification performed and result;
- remaining assumptions or blockers;
- decisions or scope exceptions created.

## Document precedence

Follow the precedence in `PROJECT_CHARTER.md`. A lower-precedence plan, specification, comment, or historical document cannot override a higher-precedence requirement.

If a requested change conflicts with the charter or required requirements, explain the conflict and request either a scope exception or a formal governance change.

## Claims and evidence

- Label verified findings, independent context, company claims, reasoned inferences, and open assumptions correctly.
- Predictive validity is not program impact.
- Before/after growth is not a counterfactual.
- Access, reliability, outcome change, and causal impact are separate milestones.
- Null, harmful, and inconclusive findings are valid outcomes.
