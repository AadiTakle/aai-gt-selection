# Supabase/PostgreSQL Research Data Model

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
audit               append-only events
consent_private     permission ledger and identity linkage

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
reason_code(reason_code, decision_kind, applicant_message, internal_description)
```

Every decision references one immutable bundle.

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
assistance(
  evidence_version_id, assistance_type,
  description, substantive_contribution
)
```

The prototype stores metadata and fixed synthetic fixture references, not real media.

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
```

Store complete input references rather than copying mutable current-state fields.

## Append-Only Audit

```sql
audit_event(
  event_id, sequence,
  aggregate_type, aggregate_id, event_type,
  actor_id, actor_role, purpose,
  occurred_at, recorded_at,
  payload, previous_hash, event_hash, correlation_id
)
```

Application roles receive no update/delete grants on decision runs, ratings, assignments, consent events, or audit events.

PostgreSQL cannot protect against its owner/superuser. External signed exports/checkpoints are required for tamper evidence.

## Consent Firewall

```sql
consent_event(
  consent_event_id, applicant_id, study_key,
  event_type, notice_version, occurred_at,
  actor_id, previous_event_id
)
research_identity_link(applicant_id, participant_id, created_at)
```

Admissions cannot query consent. Evaluation receives only approved pseudonymous participant IDs.

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
outcome_observation(
  outcome_id, participant_id, protocol_version_id,
  instrument_version_id, timepoint, observed_at,
  score, standard_error, ceiling_flag,
  missing_reason, source_hash
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
- trusted server `service_role`

Rules:

- Enable and force RLS on exposed tables.
- Application connections are non-owner, non-`BYPASSRLS`.
- Service key remains server-only.
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
- Every completed decision replays.
- Corrections create successor versions.
- Consent changes alter zero admissions inputs/results.
- Review-count and blind-third rules hold under concurrency.
- RLS denial tests pass for every role/table pair.
- Future allocation/evaluation schemas remain inaccessible in the MVP.

## Sources

- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- W3C PROV: https://www.w3.org/TR/prov-dm/
- RFC 8785: https://www.rfc-editor.org/rfc/rfc8785
- RFC 8493: https://www.rfc-editor.org/rfc/rfc8493
- NIST SP 800-53: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
