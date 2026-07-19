# Minimum Synthetic MVP Data Contract

> **Platform (D-012):** PostgreSQL retained; platform moved Supabase→AWS (Aurora/Cognito/S3/RDS Proxy/Secrets Manager). RLS, definer RPCs, immutable versioning, hash-chained audit, and deterministic replay are unchanged; only bindings change. Canonical mapping: docs/DECISION_LOG.md D-012.

## Two-Week Implementation Cut

Implement only:

- application and assessment versions;
- one locked synthetic policy bundle;
- fixed Snapshot references;
- reviewer assignments and binary reviewer classifications;
- pending work items;
- immutable decision runs, ordered reasons, and rule trace;
- factual/procedural correction successors;
- minimized audit events; and
- narrow role-bound API/RPCs.

The field registry, synthetic-choice, retention/disposition, hold, export,
substantive appeal, re-entry, and evaluation contracts below are future design
references. They are not required for the two-week backend build.

## Shared Types

```text
ApplicationState = draft | submitted | superseded
AssessmentValidity = pending | valid | invalid
PolicyState = draft | locked | retired
SnapshotRoute = artifact | narrative
ReviewState =
  awaiting_assignments | in_review | awaiting_blind_third |
  ready_for_decision | pending_correction | completed
ReviewClassification = qualifies | does_not_currently_qualify
Pending =
  pending_assessment_correction |
  pending_evidence_correction |
  pending_additional_blind_review |
  pending_accessibility_route |
  pending_policy_configuration
DecisionKind = track_a_eligibility | track_b_invitation | track_b_eligibility
```

## Field Registry

```text
field_registry(
  field_id,
  schema_name,
  object_name,
  field_name,
  purpose_code,
  data_class,
  synthetic_only,
  decision_use,
  export_rule,
  correction_rule,
  retention_policy_id,
  prohibited_uses,
  owner_role,
  lineage_ref,
  registry_version
)
```

Every stored field requires a registry entry. `synthetic_only=true` is mandatory
for this MVP.

## Application

```text
application(
  application_id,
  synthetic_applicant_code,
  cycle_code,
  created_at
)

application_version(
  application_version_id,
  application_id,
  version_no,
  supersedes_id,
  state,
  age_at_cycle_start,
  current_grade,
  requested_grade,
  requested_entry_year,
  recorded_at,
  submitted_at,
  content_hash
)
```

Submitted versions are immutable. Corrections create successors.

## Assessment

```text
assessment(
  assessment_id,
  application_id,
  instrument_code,
  administration_date
)

assessment_version(
  assessment_version_id,
  assessment_id,
  version_no,
  supersedes_id,
  source_kind,
  composite_score,
  verbal_score,
  quantitative_score,
  nonverbal_score,
  score_scale_version,
  norm_version,
  validity,
  recorded_at,
  content_hash
)
```

Only valid, explicitly decision-used versions enter routing.

## Policy

```text
policy_document(policy_id, policy_key, kind)

policy_version(
  policy_version_id,
  policy_id,
  version_no,
  state,
  schema_version,
  synthetic_only,
  config,
  canonical_bytes,
  config_hash,
  created_at,
  locked_at,
  locked_by
)

policy_bundle(
  policy_bundle_id,
  cycle_code,
  track_a_version_id,
  invitation_version_id,
  rubric_version_id,
  eligibility_version_id,
  bundle_hash,
  locked_at
)
```

Config permits a typed rule AST only. No arbitrary SQL or prohibited fields.

## Synthetic Private Access Route

```text
access_route_version(
  route_version_id,
  route_code,
  source_language,
  target_language,
  presentation_mode,
  response_mode,
  construct_map_version,
  interpreter_protocol_version,
  approval_status,
  review_due_at,
  content_hash
)

access_support_request(
  request_id,
  application_id,
  requested_support_code,
  requested_at,
  status,
  private_rationale,
  route_version_id
)

access_support_event(
  event_id,
  request_id,
  event_type,
  offered_at,
  delivered_at,
  failed_at,
  failure_reason,
  deadline_pause_start,
  deadline_pause_end,
  recorded_at
)
```

These records are visibly synthetic and private. Eligibility/reviewer roles
cannot read them. They support request, fulfillment, failure, and pending-state
tests only.

## Snapshot

```text
snapshot(
  snapshot_id,
  application_id,
  route,
  selected_domain_codes,
  submitted_at
)

snapshot_item(
  snapshot_item_id,
  snapshot_id,
  domain_code,
  ordinal
)

snapshot_item_version(
  snapshot_item_version_id,
  snapshot_item_id,
  version_no,
  supersedes_id,
  synthetic_fixture_ref,
  artifact/context metadata,
  observer/provenance metadata,
  recorded_at,
  content_hash
)
```

- Artifact: one or two fixed fixtures.
- Narrative: one fixed fixture with observer/provenance metadata.
- No live media.
- Domain selects anchors but cannot earn prestige points.

## Review

```text
review_case(
  review_case_id,
  application_id,
  snapshot_id,
  rubric_version_id,
  route,
  state
)

review_assignment(
  assignment_id,
  review_case_id,
  reviewer_id,
  slot,
  role,
  state,
  assigned_at
)

review_submission(
  review_submission_id,
  assignment_id,
  classification,
  submitted_at,
  locked_at,
  submission_hash
)

dimension_rating(
  review_submission_id,
  dimension_code,
  anchor_code,
  rating_code,
  uninterpretable,
  reason_code
)
```

Constraints:

- Unique reviewer and slot per case.
- Artifact slots 1–2; slot 3 only after disagreement.
- Narrative always slots 1–3.
- Reviewer cannot read peer submissions before own lock.
- Uninterpretable requires reason and cannot directly produce a negative result.

## Decision

```text
decision_run(
  decision_run_id,
  application_id,
  application_version_id,
  kind,
  policy_bundle_id,
  prior_decision_run_id,
  supersedes_run_id,
  code_version,
  engine_flags,
  input_manifest,
  canonical_input_bytes,
  input_hash,
  state,
  started_at,
  completed_at
)

decision_input_* references exact assessment, snapshot, review versions

decision_result(
  decision_run_id,
  outcome,
  decided_at,
  result_hash
)

reason_code(
  reason_code,
  decision_kind,
  message_catalog_version,
  applicant_message,
  internal_description,
  next_action_code
)

decision_reason(decision_run_id, ordinal, reason_code)

decision_trace(
  trace_id,
  decision_run_id,
  trace_schema_version,
  ordered_rule_steps,
  trace_hash,
  created_at
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

Eligibility terminal outputs never include admitted, offered, waitlisted, or funded.

## Explanation and Remedy

```text
remedy_case(
  remedy_case_id,
  application_id,
  target_decision_run_id,
  target_input_hash,
  target_policy_bundle_id,
  kind,
  normalized_ground,
  request_hash,
  state,
  submitted_at,
  owner_id,
  clock_policy_version,
  due_at,
  paused_at,
  resolved_at,
  resolved_by,
  resolution_code,
  successor_type,
  successor_id,
  rerun_decision_run_id
)

remedy_event(
  remedy_event_id,
  remedy_case_id,
  transition_version,
  event_type,
  actor_id,
  occurred_at,
  payload_hash
)
```

Kinds:

- `explanation`
- `factual_or_provenance_correction`
- `access_failure`
- `procedural_error`
- `rubric_appeal`
- `re_entry`

The MVP implements explanation and correction kinds. Rubric appeal remains
specified but disabled until the canonical scope conflict is resolved.

Applied correction requires a successor version and new decision run when
decision-used input changes. A prohibited/private-field correction changes no
decision result, ordered reason, or input hash.

## Synthetic Choice Firewall

```text
synthetic_choice_event(
  choice_event_id,
  application_id,
  purpose_code,
  event_type,
  notice_version,
  occurred_at,
  previous_event_id
)
```

This sentinel exists only to prove that grant, refusal, and withdrawal alter
zero admissions inputs/results. It is not legally effective consent management
and cannot authorize evaluation processing.

## Retention and Disposition

```text
retention_policy(
  policy_id,
  record_type,
  purpose_code,
  trigger_event,
  duration_code,
  disposition_action,
  backup_expiry_code,
  tombstone_policy_id,
  owner_role,
  approver_role,
  synthetic_only,
  version
)

retention_state(
  record_type,
  record_id,
  policy_id,
  state,
  due_at,
  transitioned_at
)

retention_hold(
  hold_id,
  synthetic_only,
  scope_type,
  scope_selector,
  authority_reference,
  reason_code,
  requested_by,
  approved_by,
  starts_at,
  review_at,
  ends_at,
  state
)

disposition_receipt(
  disposition_id,
  record_type,
  policy_version,
  result_code,
  actor_role,
  started_at,
  completed_at,
  backup_status
)
```

Synthetic duration codes use a virtual clock and cannot be promoted to
production. Disposition receipts contain no subject ID, payload hash, evidence,
or decision reason. Decisions whose inputs were disposed become
`not_replayable_inputs_disposed`; retained digests alone do not reconstruct or
verify absent payloads.

## Audit

```text
audit_event(
  event_id,
  sequence,
  aggregate_type,
  aggregate_id,
  event_type,
  actor_id,
  actor_role,
  purpose,
  object_class,
  operation_result,
  occurred_at,
  recorded_at,
  policy_version,
  previous_hash,
  event_hash,
  correlation_id,
  causation_id
)
```

No application role receives update/delete permission.
Narratives, scores, contact/access rationales, consent text, tokens, signed URLs,
secrets, and query strings are prohibited from audit records.

## API Boundaries

- Family: own draft/submission/status/explanation/remedy
- Admissions: synthetic assessment and routing
- Reviewer: assigned evidence and own ratings
- Supervisor: assigned third review
- Policy admin: draft/lock synthetic policy
- Decision service: run/replay
- Auditor: read/replay only

Forced RLS on exposed tables. No RLS-bypassing credential in the app runtime.

## Excluded

- Finance/aid
- Seat allocation/lottery/waitlist
- Legally effective consent management and evaluation processing
- Real identity/contact/accessibility records
- Outcomes/evaluation
- Evaluator exports
- Live artifacts/child data
- Production deployment
- Causal claims
