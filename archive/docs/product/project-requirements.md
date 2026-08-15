# GT Selection Capstone — Project Requirements

## Purpose

This document defines what the capstone product must accomplish. It is not a PRD and does not prescribe a particular product, workflow, statistical method, or technical architecture.

Use it to evaluate product concepts and PRD decisions:

- **Required:** Without this, the product does not satisfy the capstone's core goal.
- **Conditionally required:** Not needed for capstone completion, but binding in full on any program-effect claim the project makes. See the tier's own rules below.
- **High-leverage:** Not logically mandatory, but would materially improve causal credibility, access, measurement quality, or adoption.
- A feature that supports none of these categories should normally remain outside the capstone.

## Core success statement

The product must create a workable student-selection process that produces a scalable, defensible screening decision identifying applicants who are gifted and able to thrive and accelerate on GT School's Timeback platform. **This is the binding aim.** The capstone is not complete without it.

A second aim — letting GT School estimate its contribution to student outcomes more credibly than its current selected-cohort reporting allows — remains part of the project but is **not binding**, and is pursued **through the screener** rather than as a parallel workstream (D-400). A screener operating at scale with a locked, versioned, tunable cut is itself an assignment mechanism with a discontinuity at a known point, which is the raw material a later identification strategy would need. Building that is in scope; using it to estimate a program effect is not.

Both aims rest on the same distinction, which the product must still improve:

- **Selection effect:** Outcomes explained by who was admitted, family resources, prior achievement, motivation, or other pre-existing factors.
- **Program effect:** Outcomes caused by participating in GT School's program.

The product does not need to prove that GT School works. Giftedness is a necessary component of the screening target, but the criterion is fit — thriving and accelerating on the platform.

**The rescope narrows what may be claimed; it does not lower the standard for claiming it.** Demoting the second aim removes the obligation to build a counterfactual. It grants no permission to assert a program effect without one. A design that can no longer identify program effect can no longer report it, and R4, R7, and R10 continue to bind in full. Null, harmful, and inconclusive findings remain valid outcomes of the screener's own validation.

---

## Required project requirements

R1, R4, R5, R7, R8, R9, R10, and R11. The numbering is deliberately not contiguous: R2, R3, and R6 moved to the conditionally-required tier under D-400 and kept their IDs.

### R1. Produce an actual student-selection decision

The product must support a real decision about which applicants are eligible, admitted, offered a place, prioritized, or otherwise selected for participation.

**Evidence that this is met**

- The target applicant population is defined.
- The decision being made is explicit.
- The inputs, rules, responsible decision-maker, and resulting outputs are specified.
- Two operators applying the same locked rule to the same inputs would reach the same result, except where chance is an intentional part of the design.

### R4. Avoid circular selection and success measurement

The product must not define admission and program success using the same signal in a way that makes the conclusion self-fulfilling.

Selection inputs may predict future performance. If program impact is claimed, it must be evaluated as change relative to a credible counterfactual (R2)—not simply as the selected cohort's high outcome level. Where no such counterfactual exists, the claim is not available, and the prohibition below applies regardless.

The same circularity applies within the screening instrument itself. A screener validated only against the signals it is intended to replace, whose agreement with those signals is then reported as evidence that it works, is self-confirming. Validation must include at least one criterion the screener does not already encode.

**Evidence that this is met**

- Selection criteria and impact outcomes have distinct roles.
- Prior achievement is treated as a starting condition or covariate, not proof of impact.
- National-percentile standing alone is not presented as evidence that the program caused growth.
- Screener validation evidence names which criteria are independent of the screener's own inputs.

### R5. Preserve a defensible capability-and-fit standard

The selection process must identify students with a credible ability to benefit from and accelerate on the program's Timeback platform. Capability includes giftedness as a necessary component but is judged by fit — the ability to thrive and accelerate on the platform. Broadening access cannot mean arbitrarily lowering the capability bar.

Any selection measure used must have a defensible relationship to the capability it claims to measure. Weak, vague, or easily coached constructs cannot carry the admission decision without validation.

**Evidence that this is met**

- “Capability-and-fit” is operationally defined (giftedness plus the ability to thrive and accelerate on the platform).
- Each decision-used measure has a stated purpose and validity rationale, validated against GT's existing signals (CogAT, MAP) and, where available, platform acceleration.
- The process accounts for measurement error and boundary cases.
- GT's current operational anchors — the multi-path CogAT/MAP rubric and the 85th-percentile MAP reading gate — are documented (D-015, E-096) as validation references, not as a locked cut.
- Broad self-reported grit, motivation, or growth mindset is not used as a standalone proxy for capability.

### R7. Make the process auditable and falsifiable

An independent reviewer must be able to reconstruct how students were selected and how the program effect was estimated.

**Evidence that this is met**

- Selection rules and analysis choices are locked before results are observed.
- Decisions and changes are logged.
- Primary outcomes and analyses are preregistered, for any program-effect claim (see R3).
- Null, harmful, and inconclusive results remain reportable.
- Company claims are clearly separated from independently established findings.

### R8. Be feasible under real GT School constraints

The product must be operable with real applicant volumes, available seats, calendars, staffing, funding, data access, and legal or ethical constraints.

**Evidence that this is met**

- Required GT School inputs and permissions are named.
- Applicant volume and statistical power are assessed before causal claims are promised.
- The process has an executable timeline and accountable owners.
- Failure of the evaluation does not create avoidable harm to applicants.

### R9. Protect students and families

The selection or evaluation design must not sacrifice applicant rights for cleaner research.

**Evidence that this is met**

- Participation, data use, costs, and consequences are explained.
- Research refusal does not secretly reduce ordinary admission rights.
- Accommodations and accessible participation routes exist.
- Families can correct factual or process errors.
- Sensitive student data is minimized, permissioned, secured, and retained only as justified.

### R10. State the boundaries of every conclusion

The product must distinguish among:

- whether the process can be operated;
- whether selection is reliable;
- whether access changed;
- whether outcomes changed; and
- whether the program caused the change.

Success on the first four cannot be presented as proof of the fifth.

### R11. Provide a scalable, tunable, GT-validated screening instrument

The selection product must include a screener that predicts giftedness and Timeback-fit and can drive the admission decision at real scale.

**Evidence that this is met**

- The screener targets giftedness *and* the ability to thrive and accelerate on the Timeback platform, not giftedness alone.
- It is operable algorithmically at applicant volumes in the thousands, producing an admit / defer / "try again" decision without per-applicant human scoring.
- Its parameters and cut are exposed for GT admissions to tune and own; the product does not lock a final cut on GT's behalf.
- Its outputs are validated against GT's existing signals (CogAT, MAP) and, where available, Timeback acceleration, using GT-provided data (E-096, E-100).
- A human path is preserved for near-miss cases and behavioral (shadow-day) review; R10's claim boundaries still apply — a reliable screener does not by itself establish program impact.

---

## Conditionally required requirements — the program-effect arm

**Binding rule.** These are **not required for capstone completion**. If the project makes, publishes, or implies a claim about GT School's program effect, they govern that claim **in full** — there is no reduced standard. You either meet them or you do not make the claim.

They were Required until 2026-07-30 and were moved here by D-400, which rescoped the project so that the screener is the binding aim and program-effect demonstration is pursued through it rather than alongside it. **Each keeps its original ID**; every existing citation of R2, R3, and R6 remains valid and continues to mean what it meant. Nothing here is retired, and the door back is a decision entry, not a rewrite.

Two facts from the GT admissions-director interview bear on why this tier exists rather than a deletion. GT's seats are not currently rationed, so the randomized design R2 was expected to use has no scarcity to draw on (E-400). And no outcome window exists inside the capstone (E-403). Both are conditions of the moment, not permanent properties — which is the reason for a conditional tier instead of a retirement.

### R2. Create a credible counterfactual

The product must create or preserve a comparison that supports a more credible estimate of what selected students would have experienced without GT School.

The chosen identification strategy may be randomized or quasi-experimental, but its assumptions and limitations must be explicit. A before-and-after comparison of admitted students alone does not satisfy this requirement.

**Evidence that this is met**

- The treatment and comparison groups are defined.
- The design explains why the groups are comparable.
- The largest remaining sources of selection bias are identified.
- The strength of the resulting claim matches the strength of the design.

**Status under D-400.** Non-binding. The randomized route (D-010, EV-01) is blocked on scarcity GT does not currently have (E-400), and manufacturing that scarcity to enable research is barred by R9. The regression-discontinuity route (EV-13) is not blocked and is strengthened by the interview's documentation of hard, mechanically-applied thresholds (E-096). A screener with a locked, tunable cut supplies the running variable such a design would need.

### R3. Define the causal question before observing results

The product must force the team to specify, in advance:

- the population being studied;
- the program exposure or offer being evaluated;
- the comparison condition;
- the primary outcome;
- the measurement horizon;
- the primary analysis; and
- the maximum claim the design can support.

This prevents the evaluation from changing its success definition after seeing the data.

**Status under D-400.** Non-binding, and unusually cheap to honour when the time comes: it costs nothing until a program-effect claim is contemplated, and at that moment it must be satisfied before any result is observed. Deferring it is safe. Skipping it is not.

### R6. Measure growth without a gifted-student ceiling

The primary outcome must be capable of detecting meaningful growth across the admitted ability range.

**Evidence that this is met**

- A pre-program baseline exists.
- The outcome instrument has sufficient upper-range precision.
- The time horizon is fixed.
- The outcome is referenced to the student's starting point and comparison group.
- Ceiling effects, practice effects, attrition, and missing outcomes are addressed.

**Status under D-400.** Non-binding. This requirement governs the *impact outcome*; no measurement horizon exists within the capstone (E-403). Note that its underlying concern does not move with it: an instrument that ceilings out on gifted children is a threat to the screener too, and R11 and H1 are where that must be handled.

---

## High-leverage requirements

These should be included unless the team documents why they are infeasible or counterproductive.

H3, H5, H6, and H8 serve the conditionally-required arm above. They remain High-leverage at their existing IDs; work that omits them because the program-effect arm is not being pursued is justified on that ground alone.

### H1. Use broader, evidence-backed capability measures

Use more than one defensible view of capability so a single narrow test does not determine the entire eligible population. Strong candidates from the research include prior achievement and ability breadth, especially spatial reasoning.

Avoid adding measures merely to appear holistic. Each added signal must contribute distinct, validated information.

### H2. Separate capability from family advantage

Ability to pay, parent advocacy, access to information, and prior enrichment should not be mistaken for student capability.

The product should reduce these barriers where possible and, at minimum, measure how they shape who enters the applicant and selected pools.

### H3. Prefer designs that address unobserved selection

When genuine scarcity and ethical equipoise exist, random assignment among qualified applicants provides the strongest separation of program effect from unobserved traits such as motivation and family investment.

When randomization is infeasible, prefer the strongest valid quasi-experimental alternative and require sensitivity analysis for unmeasured confounding. Do not present matching on observed traits as equivalent to randomization.

### H4. Expand who can enter the candidate pool

Universal or broader outreach, multiple access routes, accommodations, and reduced financial barriers can surface capable students whom referrals, tuition, or a single test would otherwise miss.

This improves both access and the product's ability to evaluate the program across a less pre-selected population.

### H5. Use an independent evaluator

An evaluator independent of GT School should approve the identification strategy, outcome, analysis, and reporting rules and should retain the ability to publish null or inconclusive results.

### H6. Design for enough statistical information

Before promising an impact conclusion, assess whether the expected sample and design can detect an educationally meaningful effect.

If one cohort is too small, support prospective pooling across cohorts or sites. Underpowered results should be reported as imprecise, not interpreted as proof of no effect.

### H7. Track equity and access as guardrails

Monitor who learns about the opportunity, applies, completes the process, qualifies, receives an offer, enrolls, and remains in follow-up.

Review differences by relevant socioeconomic, racial or ethnic, language, disability, and prior-opportunity groups without treating demographic identity itself as a measure of capability.

### H8. Protect current high-performing students

Track whether the redesigned selection process harms the progress of students already well served by GT School, especially through shared workshops, guide attention, staffing, or peer-group changes.

This is a guardrail, not proof that a homogeneous cohort is necessary.

### H9. Make decisions explainable and contestable

Applicants and operators should be able to understand:

- what information was considered;
- how the rule was applied;
- which parts can be corrected or appealed; and
- which outcomes were determined by genuine chance.

### H10. Minimize gaming and burden

Prefer signals that are difficult to manipulate through coaching, family resources, or performative self-report. Keep the application and measurement burden proportionate, especially for underserved families.

---

## Explicit non-requirements

The capstone does **not** inherently require:

- an admission lottery, although randomization is the strongest option under the right conditions;
- a *locked* threshold, composite formula, or number of measures (the screener itself is now in scope per R11, but it is tunable and GT owns the cut);
- a specific user interface, application flow, database, or technical stack;
- modification of the Timeback learning platform;
- proof of long-term elite attainment within the initial product or pilot;
- proof that GT School produces a positive program effect;
- replacing all cognitive testing (CogAT remains GT's most trusted single signal and a validation anchor — E-099);
- selecting primarily on motivation, grit, or conscientiousness (bounded Track B artifacts may supplement, not carry, the decision);
- solving gifted-education equity beyond what is necessary for credible selection and evaluation;
- operating a live production admissions system during the capstone (a GT-tunable screener model and validation harness intended for GT-side integration is in scope per D-015; live operation is not);
- **building a complete admissions application.** GT already operates its own applicant-facing portal and reviewer dashboard and asked for the screener to be integrated into it, not replaced (E-401). Family intake, application workflow, reviewer panels, admissions queues, and applicant correction surfaces are in scope only where the screener cannot be delivered, validated, tuned, embedded, or defended without them (D-400; scope boundary in `docs/governance/RESCOPE_ANALYSIS_2026-07-30.md` §8);
- **demonstrating a program effect within the capstone.** This remains a project aim but is not binding and is pursued through the screener (D-400). It is listed here so no plan treats it as a delivery obligation; the claim boundaries that govern it if it is ever attempted are unchanged and live in R4, R7, and R10.

---

## PRD decision filter

For every proposed feature or requirement, the team should answer:

1. Which required, conditionally-required, or high-leverage requirement does this serve?
2. What failure or uncertainty does it reduce?
3. What evidence would show that it works?
4. Is it necessary for the first credible test, or can it wait?
5. Could the screener be delivered, validated, tuned, embedded, or defended without it?

If the team cannot answer the first question, the item should not enter the PRD without a separate justification. If the answer to the fifth is yes, the item is out of scope under D-400 unless it serves R9 or R10.

## Minimum concept approval gate

A product concept should not move into PRD development unless the team can explain:

1. who is being selected and for what;
2. how capability and fit are defined without simply lowering the bar;
3. what causal claim the design can and cannot support, and what it must therefore refrain from saying;
4. whether the expected sample and timeline are viable;
5. how applicants are protected;
6. what evidence would cause the team to conclude that the screener does not work; and
7. which parts of the concept the screener could be delivered without.

If the concept makes a program-effect claim, it must additionally explain what counterfactual separates selection from program effect, what outcome can measure growth without ceiling out, and what evidence would cause the team to conclude that the program did not work. Those three questions are the conditionally-required tier restated as a gate; a concept that cannot answer them may still proceed, without the claim.
