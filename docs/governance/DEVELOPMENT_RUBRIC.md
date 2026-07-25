# Development Rubric

## Purpose

Use this rubric to approve or reject concepts, plans, features, experiments, and completed work. It operationalizes `project-requirements.md`; it does not replace it.

## Required submission

Every proposed work item must include:

1. Requirement IDs served.
2. Problem or uncertainty reduced.
3. Smallest sufficient deliverable.
4. Acceptance evidence.
5. Assumptions introduced or tested.
6. Applicant, validity, and operational risks.
7. Owner and reviewer.

Missing requirement traceability is an automatic scope failure.

## Hard gates

All applicable required gates must pass. `Not applicable` requires a written rationale approved by the reviewer.

| Gate | Pass condition | Required evidence |
|---|---|---|
| R1 Selection decision | The target population, decision, inputs, rule, owner, and output are explicit and reproducible. | Worked decision cases or executable acceptance test |
| R2 Counterfactual | Treatment and comparison are defined, comparability is justified, and remaining bias is bounded. | Identification argument and threat analysis |
| R3 Prospective causal question | Population, exposure, comparison, outcome, horizon, analysis, and maximum claim are fixed before results. | Approved protocol or specification |
| R4 Non-circularity | Selection standing is not presented as program impact; baseline and comparison roles are explicit. | Selection-to-outcome data map |
| R5 Capability standard | Capability and each decision-used measure have a defensible meaning and validity rationale. | Measure rationale, boundary cases, error handling |
| R6 Growth measurement | Baseline, high-ceiling outcome, horizon, attrition, missingness, and practice effects are addressed. | Measurement validation evidence |
| R7 Auditability | Rules, changes, analyses, and null/inconclusive reporting are reconstructable. | Versioned rules, logs, preregistration, report plan |
| R8 Feasibility | Volume, power, capacity, staffing, calendar, permissions, and failure paths are credible. | Feasibility assessment and accountable owners |
| R9 Student protection | Rights, consent, access, correction, privacy, cost, and avoidable harms are addressed. | Applicant-rights review |
| R10 Claim boundaries | Reliability, access, outcomes, and causal impact are reported as distinct milestones. | Claims map with allowed and prohibited language |

Any failed hard gate blocks approval for the activity that depends on it.

## Concept comparison scorecard

After all fatal hard gates pass, score each product concept from 1 to 5:

| Criterion | Weight | Score 1 | Score 3 | Score 5 |
|---|---:|---|---|---|
| Causal credibility | 30 | No credible counterfactual or claim exceeds design | Plausible comparison with material assumptions | Protected identification, explicit estimand, bounded claims |
| Fairness and access | 20 | Opaque or inaccessible with unaddressed exclusion | Several safeguards but meaningful gaps | Explainable, accessible, contestable, and monitored |
| Operational feasibility | 15 | Depends on unavailable authority, volume, staffing, or data | Runnable with major dependencies or manual work | Fits real calendar, capacity, owners, and data |
| Measurement validity and power | 15 | Outcome is invalid, ceiling-limited, or uninformative | Suitable measurement with precision risk | High-ceiling outcome and credible precision plan |
| Adoption likelihood | 10 | No sponsor or conflicts with core incentives | Plausible sponsor with meaningful change risk | Named sponsor, aligned value, manageable burden |
| Gaming, privacy, and ethics | 10 | Easily gamed or creates unacceptable data/harm risk | Controls exist but residual risk is material | Proportionate, auditable, data-minimized safeguards |

Calculate `weight × score ÷ 5` and sum to 100.

The weighted score cannot average away:

- an invalid counterfactual for the promised claim;
- an invalid primary outcome;
- unacceptable applicant harm;
- unlawful or non-consensual data use; or
- dependency on invented GT facts.

Close scores indicate uncertainty, not false precision. Record the largest score disagreements and rejected alternatives in `DECISION_LOG.md`.

## High-leverage score

Score each item:

- `0` — Not addressed
- `1` — Partially addressed or planned
- `2` — Operationalized with evidence

| ID | Criterion |
|---|---|
| H1 | Broader, evidence-backed capability measures |
| H2 | Capability separated from family advantage |
| H3 | Design addresses unobserved selection |
| H4 | Candidate-pool access is broadened |
| H5 | Independent evaluation |
| H6 | Adequate statistical information |
| H7 | Equity and access guardrails |
| H8 | Current high performers protected |
| H9 | Decisions explainable and contestable |
| H10 | Gaming and burden minimized |

Interpretation:

- `14–20`: Strong contribution to the core goals
- `8–13`: Material gaps require explicit trade-off decisions
- `0–7`: Weak alignment; redesign or narrow the claim

The score cannot compensate for a failed hard gate. Any omitted high-leverage item requires a rationale.

## Automatic rejection conditions

Reject or stop work when it:

- cannot map to R1–R10 or H1–H10;
- presents a preferred solution as a project requirement;
- invents GT School facts, thresholds, authority, capacity, or data access;
- relies only on admitted-student before/after results for causal impact;
- makes a claim stronger than the identification design;
- treats ability to pay, parent advocacy, or demographic identity as capability;
- uses broad self-reported motivation as a standalone capability measure;
- sacrifices applicant rights to preserve an evaluation;
- suppresses null, harmful, or inconclusive findings;
- adds production complexity before the first credible test requires it.

## Review outcomes

- **Approve:** All hard gates pass and high-leverage omissions are justified.
- **Revise:** Goal is in scope, but evidence, boundaries, or acceptance criteria are incomplete.
- **Scope exception required:** Work does not map cleanly to the current requirements but may be strategically necessary.
- **Reject:** Work conflicts with the charter, fails a non-negotiable gate, or lacks a credible path to compliance.

## Completion check

Before marking work complete:

1. Update `TRACEABILITY_MATRIX.md`.
2. Update `ASSUMPTIONS_AND_EVIDENCE.md` if evidence changed.
3. Add a `DECISION_LOG.md` entry for material trade-offs.
4. Confirm any scope exception is approved and current.
5. Record verification evidence, not only implementation output.
