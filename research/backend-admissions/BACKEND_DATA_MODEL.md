# PostgreSQL Research Data Model

> **Platform (D-012):** PostgreSQL retained; platform moved Supabase→AWS (Aurora/Cognito/S3/RDS Proxy/Secrets Manager). RLS, definer RPCs, immutable versioning, hash-chained audit, and deterministic replay are unchanged; only bindings change. Canonical mapping: docs/DECISION_LOG.md D-012.

## Status

Logical schema and contracts only. No executable migration or live data.

## Schema Boundaries

```text
iam_private         auth-to-role and ownership
privacy_private     identity, contact, accessibility
admissions          pseudonymous applications and assessments
policy              immutable rules and rubric versions
evidence            Snapshot metadata and synthetic fixtures
review              blind reviewer workflow
decision            immutable runs and results
audit               minimized typed events and disposition receipts
consent_private     synthetic optional-choice sentinel only

future only:
finance_private
allocation_private
allocation_core
allocation_public
evaluation
synthetic_oracle

api                 narrow security-invoker views and RPCs
```

Eligibility can read only approved admissions, policy, evidence, and locked review data. It cannot read identity, accommodation, finance, consent, allocation, outcomes, or audit-only demographics.

## Field and Purpose Registry

```sql
field_registry(
  field_id, schema_name, object_name, field_name,
  purpose_code, data_class, synthetic_only,
  decision_use, export_rule, correction_rule,
  retention_policy_id, prohibited_uses,
  owner_role, lineage_ref, registry_version
)
```

Every stored field requires a registry entry. All MVP rows must be
born-synthetic and fail closed otherwise.

## Core Entities

### Application

```sql
cycle(cycle_id, cycle_code, data_class, opens_at, closes_at)
applicant(applicant_id, synthetic_identifier, created_at)
application(application_id, applicant_id, cycle_id, requested_grade, submitted_at)
application_version(
  application_version_id, application_id, version_no,
  supersedes_id, status, recorded_at, content_hash
)
```

Submitted versions are never edited. Corrections create successors.

### Assessment

```sql
assessment(assessment_id, application_id, instrument_code, administration_date)
assessment_version(
  assessment_version_id, assessment_id, version_no, supersedes_id,
  composite_score, verbal_score, quantitative_score, nonverbal_score,
  score_scale_version, norm_version, source_type,
  validity_status, recorded_at, content_hash
)
```

Preserve original, retest, correction, and decision-used versions separately.

### Policy

```sql
policy_document(policy_id, policy_key, policy_kind)
policy_version(
  policy_version_id, policy_id, version_no, status,
  schema_version, config_json, canonical_bytes, config_hash,
  created_at, locked_at, locked_by, valid_from, valid_to
)
policy_bundle(
  policy_bundle_id, cycle_id,
  track_a_version_id, invitation_version_id,
  rubric_version_id, eligibility_version_id,
  bundle_hash, locked_at
)
feature_permission(policy_version_id, feature_code, purpose, allowed)
reason_code(
  reason_code, decision_kind, message_catalog_version,
  applicant_message, internal_description, next_action_code
)
```

Every decision references one immutable bundle.

## Private Access and Language Routing

```sql
access_route_version(
  route_version_id, route_code, source_language, target_language,
  presentation_mode, response_mode, interpreter_protocol_version,
  construct_map_version, approval_status, review_due_at, content_hash
)
access_support_request(
  request_id, application_id, requested_support_code,
  requested_at, status, private_rationale, route_version_id
)
access_support_event(
  event_id, request_id, event_type,
  offered_at, delivered_at, failed_at, failure_reason,
  deadline_pause_start, deadline_pause_end, recorded_at
)
```

These synthetic private records support request/fulfillment/failure audits.
Eligibility and reviewers cannot read them.

## Snapshot Evidence

```sql
snapshot(snapshot_id, application_id, route, submitted_at)
evidence_item(
  evidence_item_id, snapshot_id, domain_code,
  item_type, ordinal
)
evidence_item_version(
  evidence_version_id, evidence_item_id, version_no, supersedes_id,
  child_age_at_creation, artifact_date, original_context,
  time_spent, tools_materials, repeated_elsewhere,
  observer_relationship, observation_duration, frequency, setting,
  paid_relationship, opportunity_context, conflict_of_interest,
  synthetic_object_id, content_hash, recorded_at
)
substantive_assistance(
  evidence_version_id, assistance_type,
  sanitized_contribution_category, substantive_contribution
)
```

The prototype stores metadata and fixed synthetic fixture references, not real media.
Diagnosis, access-route, screen-reader, interpreter, and accommodation details
remain in the private access schema and are excluded from evidence/decision
manifests.

## Review

```sql
review_case(
  review_case_id, application_id, snapshot_id,
  rubric_version_id, route, state
)
review_assignment(
  assignment_id, review_case_id, reviewer_user_id,
  slot, assignment_role, assigned_at
)
review_submission(
  review_submission_id, assignment_id,
  classification, submitted_at, submission_hash
)
dimension_rating(
  review_submission_id, dimension_code,
  anchor_code, rating, uninterpretable, reason_code
)
```

RLS must prevent reviewers from reading another reviewer’s submission before their own submission is locked.

## Decisions

```sql
decision_run(
  decision_run_id, application_id, decision_kind,
  policy_bundle_id, code_version, engine_flags,
  input_manifest, canonical_input_bytes, input_hash,
  supersedes_run_id, started_at, completed_at, status
)
assessment_input(decision_run_id, assessment_version_id)
evidence_input(decision_run_id, evidence_version_id)
review_input(decision_run_id, review_submission_id)
decision_result(decision_run_id, outcome, decided_at, result_hash)
decision_reason(decision_run_id, ordinal, reason_code)
decision_trace(
  trace_id, decision_run_id, trace_schema_version,
  ordered_rule_steps, trace_hash, created_at
)
decision_notice(
  notice_id, decision_run_id, message_catalog_version, locale,
  rendered_content_hash, delivery_channel,
  sent_at, delivered_at, delivery_failure_code
)
```

Store complete input references rather than copying mutable current-state fields.

## Explanation and Remedy

```sql
remedy_case(
  remedy_case_id, application_id, target_decision_run_id,
  target_input_hash, target_policy_bundle_id,
  remedy_kind, normalized_ground, request_hash,
  state, owner_id, clock_policy_version,
  submitted_at, due_at, paused_at, resolved_at,
  resolution_code, successor_id, rerun_decision_run_id
)
remedy_event(
  remedy_event_id, remedy_case_id, transition_version,
  event_type, actor_id, occurred_at, payload_hash
)
```

Explanation and factual/provenance/access/procedural correction are implemented
first. Substantive rubric appeal is specified but disabled until the PRD/feature
map scope conflict is explicitly resolved. New evidence creates later-cycle
re-entry rather than correction.

## Append-Only Audit

```sql
audit_event(
  event_id, sequence,
  aggregate_type, aggregate_id, event_type,
  actor_id, actor_role, purpose, object_class, operation_result,
  occurred_at, recorded_at,
  policy_version, previous_hash, event_hash,
  correlation_id, causation_id
)
```

Application roles receive no update/delete grants on decision runs, ratings, assignments, consent events, or audit events.
Raw evidence, scores, contact/access rationales, consent text, tokens, signed
URLs, secrets, query strings, and generic payload blobs are prohibited in audit.

PostgreSQL cannot protect against its owner/superuser. External signed exports/checkpoints are required for tamper evidence.

## Synthetic Choice Firewall

```sql
synthetic_choice_event(
  choice_event_id, applicant_id, purpose_code,
  event_type, notice_version, occurred_at,
  previous_event_id
)
```

Admissions cannot query the choice store. Grant, refusal, and withdrawal alter
zero admissions inputs/results. This is not legally effective consent
management and cannot authorize evaluation.

## Retention and Disposition

```sql
retention_policy(
  policy_id, record_type, purpose_code, trigger_event,
  duration_code, disposition_action, backup_expiry_code,
  tombstone_policy_id, owner_role, approver_role,
  synthetic_only, version
)
retention_state(
  record_type, record_id, policy_id,
  state, due_at, transitioned_at
)
retention_hold(
  hold_id, synthetic_only, scope_type, scope_selector,
  authority_reference, reason_code,
  requested_by, approved_by,
  starts_at, review_at, ends_at, state
)
disposition_receipt(
  disposition_id, record_type, policy_version,
  result_code, actor_role, started_at, completed_at,
  backup_status
)
```

Synthetic virtual-clock durations cannot become production defaults. Deletion
removes payloads and leaves a content-free receipt. A disposed decision becomes
`not_replayable_inputs_disposed`; a retained digest can verify later-supplied
candidate bytes but cannot reconstruct deleted inputs.

## Future Evaluation

```sql
protocol_version(
  protocol_version_id, study_key, version_no, status,
  population, exposure, comparison, primary_outcome,
  horizon, analysis_plan, maximum_claim,
  protocol_hash, locked_at
)
participant(participant_id)
instrument_version(
  instrument_version_id, instrument_code, version,
  scale_definition, upper_range_evidence_ref
)
outcome_schedule(
  schedule_id, participant_id, protocol_version_id,
  instrument_version_id, timepoint, planned_window_start,
  planned_window_end, observation_status,
  missing_reason, withdrawal_type,
  followup_attempt_count, last_contact_at
)
outcome_observation(
  outcome_id, schedule_id, participant_id, protocol_version_id,
  instrument_version_id, timepoint, observed_at,
  score, standard_error, ceiling_flag,
  validity_status, source_hash
)
exposure_event(
  exposure_event_id, participant_id,
  treatment_package_version, exposure_type, occurred_at
)
analysis_snapshot(
  snapshot_id, protocol_version_id, data_hash,
  code_version, package_lock_hash, created_at
)
```

Primary missing-data plan for a future randomized study:

- retain every randomized participant-timepoint in `outcome_schedule`;
- use prespecified multiple imputation or likelihood-based endpoint analysis under the stated primary MAR assumption;
- include assignment, blocks, baseline outcomes, analysis covariates, prior waves, and missingness predictors;
- report arm-specific reasons;
- add delta/pattern-mixture MNAR sensitivity and bounded-outcome/Lee bounds where assumptions fit.

An absent outcome row is never allowed to erase the scheduled denominator.

## Roles

- `family`
- `admissions_operator`
- `reviewer`
- `review_supervisor`
- `policy_admin`
- `auditor`
- `privacy_steward`
- `finance_operator` — future only
- `allocation_operator` — future only
- `evaluator` — future only
- CI/operator IAM principal for seed/reset — never ordinary runtime; no
  RLS-bypassing credential in the app runtime

Rules:

- Enable and force RLS on exposed tables.
- Application connections are non-owner, non-`BYPASSRLS` (`authenticated`).
- No RLS-bypassing credential is present in request handlers or decision
  execution.
- Privileged seed/reset calls run only via the separate CI/operator IAM
  principal, are purpose-limited, and audited.
- Reviewer sees assigned synthetic evidence only.
- Identity, accommodation, finance, consent, and audit traits remain unavailable to eligibility.

## Replay

```text
replay(decision_run_id):
  load exact application/assessment/evidence/review versions
  verify all hashes
  load exact policy bundle and code version
  execute deterministic rule
  compare outcome, reasons, and hash
  record replay result without rewriting original
```

## Acceptance Queries

- Track B enablement changes zero Track A results.
- Prohibited-field mutations change zero decisions.
- Every completed decision replays exactly while its canonical inputs,
  executable artifact, and required environment remain retained.
- Corrections create successor versions.
- Every notice clause traces to an executed rule/event.
- Remedy-history mutations change zero eligibility results.
- Consent changes alter zero admissions inputs/results.
- Review-count and blind-third rules hold under concurrency.
- RLS denial tests pass for every role/table pair.
- Future allocation/evaluation schemas remain inaccessible in the MVP.

## Sources

- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Amazon Aurora PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraPostgreSQL.html
- W3C PROV: https://www.w3.org/TR/prov-dm/
- RFC 8785: https://www.rfc-editor.org/rfc/rfc8785
- RFC 8493: https://www.rfc-editor.org/rfc/rfc8493
- NIST SP 800-53: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
