# GT Selection Capstone — Project Charter

## Mission

Build a scalable, tunable in-house **screener** that identifies applicants who are gifted *and* able to thrive and accelerate on GT School's Timeback learning platform, validated against GT's own data and with a cut GT owns. **This is the binding aim, and it is what GT asked for** (E-401, E-402; Crystal Martel interview, 2026-07-23).

Giftedness remains a core, necessary component of the target, but the criterion the screener predicts is fit — the ability to thrive and accelerate on the platform (some gifted students do not fit it; some students who accelerate on it would not clear a conventional gifted cutoff).

A second aim — a **credible counterfactual** that would let GT School distinguish its program effect from the advantages students bring with them — remains part of the project but is **not binding**, and is pursued **through the screener** rather than as a parallel track (D-400). The instrument comes first because it is both the request and the precondition: a screener running at scale with a locked, published cut is an assignment rule with a discontinuity, and that is what a later identification strategy would be built on.

The project succeeds by producing a defensible, operable selection decision, and by being honest about what that does and does not establish. It does not need to prove a positive effect, must permit null or negative findings, and must not present a working screener as evidence that the program works.

The project is **not** building a complete admissions application. GT already runs one and asked for the test to be integrated into it (E-401). Scope boundary: `docs/governance/RESCOPE_ANALYSIS_2026-07-30.md` §8.

## Problem

GT School currently selects students using factors correlated with later success, including measured ability and family resources. Observing high outcomes after admission therefore cannot establish whether the program caused those outcomes.

## Goals

Binding:

1. Identify applicants who are gifted and able to thrive and accelerate on the Timeback platform, validated against GT's existing signals (CogAT, MAP) and, where available, platform acceleration.
2. Produce a screener operable algorithmically at applicant volumes in the thousands, exposing parameters and a cut that GT admissions tunes and owns, while preserving a human path for near-miss and behavioral (shadow-day) review.
3. Support a real, explainable student-selection decision.
4. Maintain a defensible capability-and-fit standard without confusing privilege with capability.
5. Make selection, evaluation, and claim boundaries auditable.
6. Protect applicants and remain feasible under real school constraints.

Non-binding, pursued through the screener (D-400):

7. Create or preserve a credible counterfactual.
8. Measure growth from baseline with adequate upper-range precision.

Goals 7 and 8 are not delivery obligations. They remain goals because the project should not foreclose them, and because the claim boundaries attached to them bind whether or not they are pursued.

## Non-goals

- Lock a final threshold or cut on GT's behalf (GT tunes and owns the cut), or dictate a technical stack.
- Modify the Timeback learning platform (deeply understanding it is now a dependency, since the screener predicts fit to it).
- Defend GT School or guarantee a positive result.
- Prove long-term elite attainment during the capstone.
- Solve gifted-education policy beyond this selection and evaluation problem.
- Operate a live production admissions system; a GT-tunable screener model and validation harness intended for GT-side integration is in scope (D-015), but running it in production is not, unless separately approved.
- Build a complete admissions application. GT operates its own applicant portal and reviewer dashboard and asked for the screener to be integrated into it (E-401). Family intake, application workflow, reviewer panels, admissions queues, and applicant correction surfaces are in scope only where the screener depends on them (D-400).
- Demonstrate a program effect during the capstone. Not forbidden, not scheduled, and never claimable beyond what the design supports.

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
- how capability and fit are defined;
- how the screener decides, at what scale, and who owns the cut;
- what the design can and cannot conclude, and what it must therefore refrain from saying;
- whether the sample and operation are viable;
- how applicants are protected; and
- what result would count against the screener.

If, and only if, the project pursues the non-binding second aim, it must additionally explain what comparison separates selection from program effect, what outcome measures meaningful growth, and what result would count against the program.

## Canonical document order

When documents conflict, use this precedence:

1. `PROJECT_CHARTER.md`
2. `docs/product/project-requirements.md`
3. `docs/governance/DEVELOPMENT_RUBRIC.md`
4. Approved entries in `docs/governance/DECISION_LOG.md` and `docs/governance/SCOPE_EXCEPTION_LOG.md`
5. `docs/product/TRACEABILITY_MATRIX.md`
6. `docs/research/ASSUMPTIONS_AND_EVIDENCE.md`
7. Product plans, specifications, designs, and implementation notes

Within `docs/product/project-requirements.md`, the tiers rank against each other (D-400):

1. **Required** requirements bind unconditionally and outrank everything below. Where a required and a conditionally-required requirement conflict, the required one wins — R9 defeats R2, so a research design that would deny a seat to a qualified applicant in order to create a comparison group is not available at any evidentiary benefit.
2. **Conditionally required** requirements do not bind capstone completion, and bind in full on any program-effect claim. They cannot be partially satisfied to support a weakened claim.
3. **High-leverage** requirements are included unless omission is documented.

The tier of a requirement never changes what may be *claimed*. R4, R7, and R10 are Required and govern the claims attached to every tier.

Supporting reference libraries:

- `docs/product/CONCEPT_OPTIONS.md` preserves the unratified concept space.
- `docs/governance/CRITIC_REVIEW_CHECKLIST.md` defines reusable adversarial reviews.
- `docs/research/METRICS_AND_GUARDRAILS_LIBRARY.md` contains candidate measures, not an approved metric set.

Supporting references cannot override the canonical documents above or ratify a product direction.

## Change authority

- Changes to the charter, required requirements, or rubric require team-lead approval and a decision-log entry.
- Work outside scope requires an approved scope-exception entry before implementation.
- New evidence may update assumptions without changing scope; changes that alter requirements also require a decision entry.
