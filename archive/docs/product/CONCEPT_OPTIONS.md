# Product Concept Options

## Status

D-008 ratifies a synthetic prototype that preserves Track A and adds a profile-aware Track B Talent Evidence Snapshot. The options below preserve the earlier design space and remain references rather than alternative approvals.

All concepts must be evaluated against `project-requirements.md` and `DEVELOPMENT_RUBRIC.md`.

## Shared problem

GT School needs a selection product that:

1. chooses students using a defensible capability standard;
2. reduces or exposes selection on privilege and other pre-existing advantages; and
3. supports a credible comparison between program participation and the counterfactual.

Better identification, fairer access, and causal program-effect estimation are related but distinct outcomes.

## Concept A — Selection-first

### Summary

Replace or supplement a narrow admissions screen with a transparent, multi-measure capability process. Use contextual information and compensatory decision rules to reduce false negatives.

### Primary value

- Directly improves who is identified as capable.
- Can broaden access without abandoning a capability bar.
- Can produce explainable, auditable selection decisions.

### Maximum defensible claim

The product may support claims about selection-process reliability, access, representation, predictive validity, or operational feasibility. Without a separate credible counterfactual, it cannot establish that GT School caused student growth.

### Main risks

- Added measures may create burden without adding valid information.
- Human review may reintroduce discretion or privilege.
- Better prediction may be mistaken for program impact.
- The process may remain inaccessible if tuition, outreach, or family advocacy still controls entry.

### Smallest four-week prototype

- Synthetic applicant portfolios
- Configurable compensatory selection rule
- Decision traces and boundary-case handling
- Comparison with a single-screen baseline
- Access, error, and gaming analysis

## Concept B — Evaluation-first

### Summary

Preserve a clear eligibility rule while creating the strongest feasible comparison among eligible applicants. Under genuine scarcity and ethical equipoise, this may include random assignment of offers or another valid identification strategy.

### Primary value

- Strongest focused route to separating program effect from unobserved applicant differences.
- Lower selection-policy scope than Concept C.
- Clear evaluation and audit boundary.

### Maximum defensible claim

With valid random assignment, the product may estimate the effect of assignment to an offer for the eligible applicant population. With a quasi-experimental design, claims must remain local to the population and assumptions the design actually identifies.

### Main risks

- Preserves false negatives or access barriers in the existing eligibility process.
- Results may apply only to a narrow, self-selected applicant pool.
- Scarcity, assignment authority, data access, power, or independent publication may not exist.
- Families may misunderstand random assignment or research participation.

### Smallest four-week prototype

- Synthetic eligible applicant pool
- Reproducible assignment or comparison simulation
- Audit and replay evidence
- Power and sensitivity scenarios
- Explicit claim boundaries and applicant notices

## Concept C — Integrated selection and evaluation

### Summary

Combine broader capability identification with a protected comparison or assignment mechanism and longitudinal outcome measurement.

### Primary value

- Addresses identification, access, and causal credibility together.
- Tests the central hypothesis that capable-but-underserved students may reveal program value hidden by current selection.
- Produces the most complete product story.

### Maximum defensible claim

Only the evaluation component can support a causal claim, and only for the population and assignment mechanism actually studied. The broader selection component separately supports selection and access claims.

### Main risks

- Highest operational, ethical, measurement, and implementation complexity.
- Simultaneously changing eligibility and allocation makes failure diagnosis harder.
- A four-week team can prototype the logic but cannot validate or launch the complete system.
- Weakness in either the capability gate or evaluation design can invalidate the combined claim.

### Smallest four-week prototype

- Synthetic multi-measure applicant intake
- Transparent capability rule
- Reproducible comparison or assignment simulation
- High-ceiling outcome and power simulation
- Applicant, operator, and evaluator views
- Multi-lens red-team evidence

## Concept comparison

| Dimension | Concept A | Concept B | Concept C |
|---|---|---|---|
| Improves identification | Strong | Limited | Strong |
| Improves access | Moderate to strong | Limited to moderate | Strong |
| Supports causal effect estimation | Weak unless separately added | Strongest focused option | Strong if both components validate |
| Four-week prototype feasibility | Highest | High | Moderate |
| Operational complexity | Lowest | Moderate | Highest |
| Main critic concern | No counterfactual | Narrow eligible pool | Too many coupled risks |

## Facts required before ratification

The team must validate:

- current GT eligibility and review rules;
- applicant volume, qualified demand, seats, yield, and calendar;
- tuition, aid, voucher, deposit, and ordinary admissions paths;
- authority and ethical basis for the proposed comparison mechanism;
- available applicant, baseline, outcome, and follow-up data;
- feasibility of an independent evaluator and null-result publication;
- suitable selection and high-ceiling outcome instruments;
- accessibility, consent, privacy, staffing, and operational constraints; and
- whether the proposed treatment can serve the selected range without harming current high performers.

## Ratification rule

A concept may be selected only when:

1. all applicable R1–R10 hard gates have a credible path to passing;
2. fatal validity or applicant-rights failures are absent;
3. open GT-specific assumptions are either verified or explicitly bounded;
4. the four-week deliverable is a prototype and evidence package, not a disguised production launch; and
5. the decision and rejected alternatives are recorded in `DECISION_LOG.md`.
