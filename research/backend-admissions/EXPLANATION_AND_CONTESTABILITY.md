# Explanation, Correction, and Contestability

## Executive Position

Explanation is not contestability, a human label is not meaningful review, and a
nearest counterfactual is not causal recourse.

For the synthetic MVP:

- generate explanations directly from the executed rule trace;
- implement factual, provenance, access, and procedural correction;
- specify but disable substantive rubric appeal until GT authority and staffing
  are decided;
- treat genuinely new evidence as later-cycle re-entry; and
- prohibit feature-changing “how to qualify” advice.

This resolves the backend recommendation, not the canonical PRD/feature-map
scope conflict. That conflict requires an explicit team decision.

## Remedy Boundaries

### Explanation

Question: What happened and why?

- No new evidence.
- Versioned notice generated from the exact decision trace.
- Staff may clarify but cannot invent or alter reasons.

### Factual or Provenance Correction

Question: Was a recorded fact wrong or omitted?

Examples:

- score/date/version;
- authorship or substantive assistance;
- artifact context/provenance;
- submitted item omitted from review.

Remedy:

- verify fact;
- create immutable successor;
- rerun if decision-used;
- preserve original.

### Access Failure

Question: Did the required route fail, remain unavailable, or become
mistranslated/inaccessible?

Remedy:

- `pending_accessibility_route`;
- pause applicant clock;
- provide a provisionally approved route;
- resume and rerun without penalty.

Diagnosis is not required in the eligibility record.

### Procedural Error

Question: Was the wrong rule, rubric, review sequence, or required process used?

Examples:

- wrong policy version;
- omitted required review;
- reviewer-blindness breach;
- incorrect vote aggregation;
- unrecorded submitted evidence.

Remedy:

- conflict-cleared procedural reviewer;
- cure, rerun, or fresh panel;
- immutable successor trace.

### Substantive Rubric Appeal

Question: Were the facts and procedure correct, but was a rubric anchor
materially misapplied?

Research contract:

- same submitted evidence;
- same locked rubric;
- new trained reviewer;
- prior votes, identities, and outcome hidden;
- reviewer may uphold or remand, not replace a vote;
- remand creates a fresh regular panel.

Recommended MVP status: specified but disabled pending scope decision.

### Re-entry

Genuinely new evidence or changed circumstances create a later-cycle case. Prior
nonqualification and remedy history are excluded from eligibility inputs.

### Feature-Changing Recourse

Statements such as “raise score X,” “polish evidence Y,” or “buy enrichment Z”
are not correction or appeal. They can create:

- gaming;
- unequal family burden;
- construct contamination;
- false causal advice; and
- incentives to optimize evidence instead of capability.

Do not provide threshold distance or smallest-change-to-qualify guidance.

## Explanation Design

Human explanations are often contrastive and selective. Use layered notices:

1. **Outcome:** current status.
2. **Contrast:** why this status rather than the expected alternative.
3. **Decision-used evidence:** exact categories, not private fields.
4. **Rule/rubric version and ordered reasons.**
5. **What was not considered:** prohibited inputs.
6. **Correctable facts/processes.**
7. **Next action, deadline, owner, and access route.**
8. **Claim boundary:** what the decision does not establish.

Example:

> The Snapshot is pending rather than negatively classified because required
> provenance is incomplete. No negative eligibility decision has been made.
> You may correct that fact through the listed route.

For a negative result:

> The submitted evidence did not currently meet the listed pathway criteria
> under rubric version X. This does not mean the student is “not gifted” and is
> not an admission or seat decision.

## Fidelity Rules

Every public explanation clause maps to:

- an executed predicate;
- an input-version reference;
- a locked reviewer result;
- a workflow event; or
- an approved claim-boundary template.

Do not use:

- LIME or SHAP as the authoritative explanation;
- LLM-generated rationales not grounded in the trace;
- persuasive prose as evidence of fidelity;
- trust/satisfaction as proof of understanding; or
- explanation as a substitute for fairness audit.

## Immutable Notice and Trace Contract

```text
decision_trace(
  trace_id,
  decision_run_id,
  trace_schema_version,
  input_version_references,
  policy_bundle_id,
  code_version,
  canonical_input_hash,
  ordered_rule_steps[],
  outcome,
  ordered_reason_codes[],
  result_hash,
  created_at
)

rule_step(
  rule_node_id,
  input_reference,
  predicate_code,
  predicate_result,
  reason_code
)

decision_notice(
  notice_id,
  decision_run_id,
  message_catalog_version,
  locale,
  rendered_content_hash,
  delivery_channel,
  sent_at,
  delivered_at,
  delivery_failure_code
)
```

The applicant request window begins only after successful accessible delivery.

## Remedy State Machine

```text
submitted
  -> triage
  -> explanation_fulfilled
  -> correction_verification -> applied | denied
  -> protected_access_pending -> route_delivered -> resumed
  -> procedural_review -> upheld | cured | remanded
  -> rubric_screen -> upheld | remanded_to_fresh_panel
  -> resolved
  -> superseded
```

Deadlines are versioned synthetic configuration:

```text
RemedyClockPolicy(
  applicant_request_window,
  acknowledgement_sla,
  triage_sla,
  resolution_sla,
  business_calendar,
  timezone,
  pause_reasons,
  escalation_owner
)
```

SLA failure escalates and remains pending. It never creates rejection.

## Pseudocode

```text
submit_remedy(actor, decision_run_id, kind, statement, idempotency_key):
  require actor owns application
  require accessible intake

  transaction:
    return existing case for duplicate idempotency key
    load locked decision
    create remedy case pinned to input/policy hashes
    append remedy_submitted audit event

triage(case):
  IF target superseded:
    close moot_superseded
    issue successor notice/new window
  ELSE IF factual_or_provenance:
    route data_steward
  ELSE IF access_failure:
    set pending_accessibility_route
    pause clock
    route access_steward
  ELSE IF procedural:
    route conflict-cleared procedure reviewer
  ELSE IF rubric_appeal and appeal_enabled:
    require same evidence
    route conflict-cleared appeal reviewer
  ELSE IF rubric_appeal:
    return appeal_deferred_in_mvp
  ELSE:
    route explanation or re-entry

apply_correction(case, verified_successor):
  lock application aggregate
  create immutable successor
  IF corrected field was decision-used:
    run successor decision from one complete manifest
  ELSE:
    assert decision, reasons, and input hash unchanged
  resolve case and append audit atomically
```

## Reviewer Pending Precedence

`pending` is a case/workflow state, not a third vote.

- Decision-critical invalidity, access failure, or evidence ambiguity moves the
  case to pending before aggregation.
- Reviewer conflict/competence abstention creates a replacement assignment.
- Only `qualifies` and `does_not_currently_qualify` enter majority aggregation.

This removes ambiguous `Q,Q,P` and `N,N,P` outcomes.

## Concurrency

- Serializable transition or aggregate row lock
- Idempotency keys
- Expected-state/version checks
- Unique transition, assignment, and remand-panel constraints
- Whole-transaction retry on serialization failure
- Correction supersedes active appeal rather than mixing manifests
- Exactly one terminal resolution
- Idempotent deadline/escalation jobs

## Synthetic Fixtures

| ID | Scenario | Expected |
|---|---|---|
| EX-01 | Explanation requested twice | Same versioned notice; no mutation |
| EX-02 | Notice reason | Every clause maps to trace |
| EX-03 | Contrast question | Correct outcome foil |
| MSG-01 | Negative notice | No “not gifted,” seat, or causal claim |
| MSG-02 | Notice delivery fails | Request clock not started |
| CR-01 | Score 89→90 | Successor/new run; original replays |
| CR-02 | Correct provenance | New evidence version and rerun |
| CR-03 | Correct prohibited field | Result/reasons/hash unchanged |
| CR-04 | Correction denied | Written reason; original preserved |
| AC-01 | Required route fails | Pending and clock pause |
| AC-02 | Route delivered | Clock resumes from remainder |
| PR-01 | Wrong rubric version | Cure and successor run |
| PR-02 | Submitted item omitted | Fresh review of pinned submission |
| PR-03 | Original reviewer assigned | Assignment denied |
| AP-01 | Appeal disabled | Clear deferred status; correction available |
| AP-02 | Appeal introduces new evidence | Route to re-entry |
| AP-03 | Material misapplication | Remand to fresh blind panel |
| NR-01 | Toggle remedy-history fields | Eligibility unchanged |
| NR-02 | Later-cycle re-entry | No prior-case penalty |
| RP-01 | Replay original/successor | Exact output/reasons/hashes |
| CC-01 | Duplicate remedy | One case |
| CC-02 | Correction races appeal | One complete successor |
| CC-03 | Duplicate remand creation | One panel |

## Human Testing

Test objective understanding, not only satisfaction:

- outcome;
- main reason;
- decision-used information;
- what was prohibited/not considered;
- correction versus appeal versus re-entry;
- next action and deadline;
- chance stage, if any; and
- what the decision does not establish.

Provisional design targets, not empirical constants:

- ≥90% identify outcome, main reason, and next action;
- 100% understand that nonqualification is not “not gifted” and eligibility is
  not guaranteed admission;
- any severe stigma, inaccessible route, or false causal understanding blocks
  release.

Report by outcome favorability, language, access route, and relevant family
groups. Trust and acceptance are diagnostic only.

## Open Decisions

- Is substantive rubric appeal in the four-week MVP?
- Who has authority to uphold/remand?
- What are request and service deadlines?
- What is the standard of review?
- Is same-cycle reconsideration available?
- Which details may be public without enabling gaming?

## Key Sources

- Miller (2019), explanation as contrastive/selective/social:
  https://doi.org/10.1016/j.artint.2018.07.007
- Rudin (2019), interpretable models in high stakes:
  https://doi.org/10.1038/s42256-019-0048-x
- Poursabzi-Sangdeh et al. (2021), interpretability experiment:
  https://doi.org/10.1145/3411764.3445315
- Lyons, Velloso, & Miller (2021), contestability:
  https://doi.org/10.1145/3449180
- Yurrita et al. (2023), explanation/contestability perceptions:
  https://doi.org/10.1145/3544548.3581161
- Lyons et al. (2022), appeal preferences:
  https://doi.org/10.1145/3491102.3517606
- Gilliland (1993), selection procedural justice:
  https://doi.org/10.5465/amr.1993.9402210155
- Colquitt (2001), justice dimensions:
  https://doi.org/10.1037/0021-9010.86.3.386
- Karimi, Schölkopf, & Valera (2021), recourse/causal intervention:
  https://doi.org/10.1145/3442188.3445899
- Barocas, Selbst, & Raghavan (2020), counterfactual assumptions:
  https://doi.org/10.1145/3351095.3372830
- Milli et al. (2019), strategic classification costs:
  https://doi.org/10.1145/3287560.3287576
