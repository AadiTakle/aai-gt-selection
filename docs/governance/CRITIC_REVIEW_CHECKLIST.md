# Critic Review Checklist

## Purpose

Use this checklist before concept approval, before implementation, and before the final capstone presentation. A finding must be fixed, converted into an explicit limitation or stop condition, or accepted through a documented decision. It cannot be hidden in a generic risks section.

## Review outcome

- **Ready:** No unresolved critical or important findings for the claimed maturity level.
- **Ready with limitations:** Remaining findings are explicitly bounded and do not invalidate the claimed result.
- **Not ready:** A finding undermines the selection decision, causal claim, applicant protection, or feasibility.

## Methodologist lens

### Selection and estimand

- Who is in the target, applicant, eligible, selected, treated, comparison, and analyzed populations?
- Does the selection rule define the population so narrowly that the result cannot answer the project question?
- Is the estimand a real-world contrast, not a statistical method?
- Are eligibility, allocation, research consent, and evaluation separate decisions?

### Counterfactual and assignment

- Why are treatment and comparison groups comparable?
- Could motivation, family investment, prior opportunity, or ability still explain the result?
- If assignment uses chance, is it reproducible and protected from manipulation?
- If the design is quasi-experimental, are its local scope and identifying assumptions explicit?
- Are certainty groups or changing assignment probabilities handled correctly?

### Prospective analysis

- Were population, outcome, horizon, model, covariates, exclusions, subgroup hierarchy, and missing-data strategy fixed before results?
- Could baseline or outcome data influence protocol changes?
- Are balance checks descriptive rather than invitations to change the model?
- Are multiple outcomes and subgroup analyses protected from cherry-picking?

### Measurement and power

- Does the outcome have enough upper-range precision for gifted students?
- Are baseline, equating, practice effects, reliability, accommodations, and measurement invariance addressed?
- Can the expected sample distinguish an educationally meaningful effect from noise?
- Are attrition, noncompliance, clustering, and spillovers included in precision scenarios?
- Would an underpowered result be reported as imprecise rather than as no effect?

### Analysis and claims

- Does the primary analysis retain all units required by the estimand?
- Are missing outcomes, treatment crossover, and direct offer effects addressed?
- Are sensitivity or falsification tests appropriate to the design?
- Are exposure and fidelity measures kept descriptive unless causally identified?
- Is external validity limited to the population actually studied?
- Can null, harmful, and inconclusive results be reported independently?

## Applicant and family lens

### Access and burden

- Can families discover and complete the process across income, language, disability, technology, and geography differences?
- Are accommodations free, timely, and construct-equivalent?
- Are tuition, aid, deposits, technology, and indirect costs clear before families commit effort?
- Are burden and dropout reviewed at the median and the high-burden tail?

### Capability and fairness

- Does each decision-used measure have a valid, distinct purpose?
- Are ability to pay, parent advocacy, demographic identity, and broad self-reported motivation excluded as capability proxies?
- Are missing, invalid, accommodated, and boundary cases handled consistently?
- Are subgroup gaps, differential prediction, gaming, and coaching exposure examined?

### Explanation and contestability

- Can a family understand what evidence was used and how the rule applied?
- Can factual, accommodation, identity, and process errors be corrected?
- Are chance-based outcomes explained without stigmatizing labels?
- Is appeal review independent of the original error when needed?

### Consent and data rights

- Is research participation meaningfully separate from ordinary admissions?
- Can a child dissent and a family withdraw without hidden penalties?
- Are data access, correction, export, deletion, retention, secondary use, and exceptions explained?
- Are sensitive student records minimized and permissioned?

### Welfare

- Is there an accessible harm-reporting channel with anti-retaliation and response ownership?
- Could the design create stigma, lost educational options, financial harm, or avoidable delay?
- Do applicant rights take priority when research and operations conflict?

## GT operator lens

### Feasibility

- Are applicant volume, seats, yield, calendar, staffing, vendors, and data sources grounded in current GT facts?
- Does every queue have an owner, deadline, backup, and failure path?
- Can accommodations, corrections, and appeals complete before protected deadlines?
- Does the process preserve ordinary admissions and other-school options?

### Decision execution

- Are selection rules versioned, deterministic where intended, and protected from undocumented overrides?
- Are seat, offer, waitlist, capacity-change, and cancellation rules complete?
- Can operators handle late evidence, duplicates, unreachable families, and corrected records?
- Are financial and service exceptions logged rather than silently personalized?

### Systems and handoffs

- Is there a canonical source of truth for every field and event?
- Are identity matching, correction propagation, timestamps, and vendor reconciliation defined?
- Can evaluator exports be reproduced with checksums and lineage?
- Are manual data-collection burdens realistic?

### Security and resilience

- Are authentication, encryption, least privilege, logging, recovery, backups, and incident escalation proportionate to minors' records?
- Can the system recover without corrupting selection or comparison evidence?
- Are independent roles protected from conflicts of interest?

## Scope-drift lens

- Does every feature map to R1–R10 or H1–H10?
- Is a preferred solution being presented as a requirement?
- Has an unknown GT fact been silently filled in?
- Is production complexity being added before the four-week prototype needs it?
- Is the team claiming live readiness, psychometric validity, or program impact from synthetic evidence?
- Does the change require a scope exception or decision-log entry?

## Reusable adversarial tests

At minimum, test:

1. identical inputs produce identical deterministic decisions;
2. boundary scores and measurement error receive the locked treatment;
3. prohibited proxies cannot affect capability;
4. research refusal cannot affect ordinary selection;
5. assignment or comparison evidence can be replayed;
6. a missing or invalid outcome cannot be silently dropped;
7. an accommodation does not become an automatic rejection;
8. an operator cannot override selection without an audit record;
9. notices reject stigmatizing or causally overstated language;
10. subgroup, burden, attrition, and fastest-student guardrails calculate correctly;
11. null and inconclusive synthetic results produce appropriately limited claims; and
12. a critical assumption failure stops or narrows the product rather than being hidden.

## Finding template

- **Finding ID:**
- **Lens:** Methodologist / Family / Operator / Scope
- **Severity:** Critical / Important / Minor
- **Requirement affected:** R/H IDs
- **Evidence:**
- **Why it matters:**
- **Required resolution:**
- **Disposition:** Fixed / Limited claim / Stop condition / Accepted decision
- **Verification:**
- **Owner:**
