# Provisional Two-Week Backend Contract

> **Platform (D-012):** PostgreSQL retained; platform moved Supabase→AWS (Aurora/Cognito/S3/RDS Proxy/Secrets Manager). RLS, definer RPCs, immutable versioning, hash-chained audit, and deterministic replay are unchanged; only bindings change. Canonical mapping: docs/DECISION_LOG.md D-012.

## Status

Design-only. Do not scaffold until the seven defaults in
`DAY_ZERO_DECISION_BRIEF.md` are ratified.

This is the executable cut, not the complete research architecture.

## Proposed Stack

- Node 24 LTS
- pnpm 10 with committed lockfile
- Next.js/TypeScript
- Amazon Aurora Serverless v2 (PostgreSQL-compatible), dev AWS account
- Pinned `pg` (node-postgres) via Amazon RDS Proxy, request-scoped, one
  transaction per request; Cognito JWT verified server-side before session GUCs
- Zod shared contracts
- Vitest for TypeScript tests
- pgTAP run against the dev Aurora/PostgreSQL instance
- Generated TypeScript types from the PostgreSQL schema

No ORM, non-dev/production AWS account, live uploads, production credentials, or
external AI.

## Public Outcome Types

```text
TrackAOutcome =
  eligible | not_eligible | pending

TrackBInvitationOutcome =
  invited | not_invited | not_applicable | pending

ReviewerClassification =
  qualifies | does_not_currently_qualify

TrackBEligibilityOutcome =
  qualifies | does_not_currently_qualify | pending

PendingReason =
  pending_assessment_correction |
  pending_evidence_correction |
  pending_additional_blind_review |
  pending_accessibility_route |
  pending_policy_configuration
```

`pending` is never a reviewer vote. With complete binary votes, a majority
always exists, so `pending_no_majority` is not part of v1.

## Schema Boundary

```sql
create schema app; -- private
create schema api; -- narrow RPCs only
```

Identity is owned by the Amazon Cognito user pool.

Human requests connect as the PostgreSQL `authenticated` login role. An
admin-controlled Cognito `custom:user_role` claim carries the coarse business
role. Identity is always the verified `sub`, bound as
`current_setting('app.user_id')::uuid`. User-editable Cognito attributes are
never an authorization source.

### Twelve private tables

1. `app.application`
   - owner, synthetic code, cycle, timestamps
2. `app.application_version`
   - immutable submitted versions and successor lineage
3. `app.assessment_version`
   - score/version/validity and correction lineage
4. `app.policy_bundle`
   - one locked `PB-SYN-01`/`RB-SYN-01` bundle
   - `synthetic_only=true`, `validated=false`
5. `app.snapshot_version`
   - route, domain codes, allowlisted fixture refs, provenance JSON
6. `app.review_case`
   - route, rubric version, workflow state, supervisor
7. `app.review_assignment`
   - unique case/slot/reviewer, assigned/completed/abstained/replaced
8. `app.review_submission`
   - binary classification, dimension-rating JSON, locked hash
9. `app.pending_item`
   - reason, owner, due date, route, open/escalated/resolved
10. `app.decision_run`
    - exact input refs, outcome, ordered reasons, trace, canonical profile/bytes,
      policy/code/environment manifests, and decision-root commitment
11. `app.audit_event`
    - minimized typed event metadata, no sensitive payload
12. `app.applicant_context`
    - coded synthetic access/support/choice sentinels only
    - inaccessible to reviewers and decision functions

## Core Database Invariants

- All rows/configuration are synthetic.
- Application ownership is bound to `current_setting('app.user_id')::uuid`.
- Submitted inputs are immutable.
- Corrections create one successor; successor chains cannot branch.
- Locked policy cannot change.
- Reviewer is unique per case.
- Reviewer classifications are binary.
- Abstention creates replacement work, not a vote.
- Artifact slot 3 exists only after conflicting slots 1–2.
- Narrative requires three locked classifications.
- One final decision per canonical input/policy/code tuple.
- Decision results, reasons, traces, and audit events are immutable.
- Pending deadline may escalate but never reject.
- Correction, access, choice, and remedy history are excluded from decision
  inputs.

## Seven Core RPCs

### 1. `api.save_application_draft`

Family-owned draft save using:

- idempotency key;
- expected version;
- allowlisted fields.

### 2. `api.submit_application`

Locks the submitted version. Returns the frontend status projection.

### 3. `api.record_assessment_version`

Admissions operator only.

Creates an assessment version and records:

- Track A result;
- Track B invitation result;
- ordered reasons;
- policy/input hashes.

Missing/invalid assessment returns domain-level pending, not HTTP failure.

### 4. `api.submit_snapshot_version`

Family only for an invited Track B application.

- Artifact: one or two allowlisted fixtures.
- Narrative: one fixture plus bounded provenance.
- Creates review case and initial assignments.
- No URL, media, or upload fields.

### 5. `api.submit_review`

Assigned reviewer only.

Atomically:

- locks the binary vote and ratings;
- handles abstention/replacement;
- creates at most one blind third artifact assignment;
- finalizes when required votes are complete;
- creates pending work for decision-critical evidence/access defects.

### 6. `api.apply_correction`

Data/admissions steward only.

- creates immutable successor;
- reruns only affected decisions from one complete manifest;
- leaves original exactly replayable while retained inputs/executable/environment
  remain available;
- proves private/prohibited corrections change no decision/hash.

Substantive appeal and new evidence return `FEATURE_DISABLED`.

### 7. `api.replay_decision`

Auditor or dedicated non-bypass decision service.

Verifies exact canonical input, policy, executable/environment artifact,
outcome, ordered reasons, trace, and decision-root commitment. Missing artifacts
or disposed inputs refuse exact replay. Writes one audit event without modifying
the original decision.

## Read RPCs

- `api.get_application_status`
- `api.get_assigned_review_case`
- `api.get_decision_explanation`

No writable API tables or owner-rights views.

## Request Contract

Every mutation includes:

- `idempotency_key`;
- `expected_version` when stateful;
- actor from the verified Cognito `sub` (`current_setting('app.user_id')::uuid`)
  and business role from the admin-controlled `custom:user_role` claim, never
  request fields or user-editable attributes;
- correlation ID; and
- database-enforced synthetic context.

Idempotency key reuse with a different payload returns
`IDEMPOTENCY_KEY_REUSED`.

## Error Contract

- `400 VALIDATION_FAILED`
- `401 AUTH_REQUIRED`
- `403 ROLE_FORBIDDEN`
- `404 RESOURCE_NOT_FOUND`
- `409 STALE_VERSION`
- `409 INVALID_STATE_TRANSITION`
- `409 SUBMISSION_LOCKED`
- `409 ASSIGNMENT_CONFLICT`
- `409 NOT_INVITED`
- `409 IDEMPOTENCY_KEY_REUSED`
- `412 INPUT_HASH_MISMATCH`
- `412 POLICY_HASH_MISMATCH`
- `412 CODE_VERSION_UNAVAILABLE`
- `422 FIXTURE_NOT_ALLOWLISTED`
- `422 NON_SYNTHETIC_INPUT`
- `422 FEATURE_DISABLED`
- `503 SERIALIZATION_RETRY_EXHAUSTED`

Pending is a successful domain result, not a 4xx error.

## Frontend Status Projection

```text
application_draft
awaiting_assessment
assessment_needs_correction
track_a_eligible
track_b_snapshot_required
snapshot_under_review
review_pending_family_action
review_pending_internal_action
track_b_eligible
track_b_does_not_currently_qualify
no_current_pathway
policy_configuration_pending
```

Projection contains:

- display-label code;
- phase;
- family-action-required flag;
- next-action code;
- deadline;
- pending reason;
- Track A result;
- Track B invitation result;
- Track B eligibility result; and
- `ELIGIBILITY_NOT_ADMISSION` claim boundary.

Never emit admitted, offered, waitlisted, funded, “not gifted,” fairness
validation, or program-effect language.

## Role Boundary

- Family: own application/status/explanation/correction request
- Admissions: pseudonymous assessment/routing/assignment/correction
- Reviewer: assigned case and own submission only
- Supervisor: assigned blind third review, no prior votes
- Decision service: dedicated non-`BYPASSRLS` role
- Auditor: trace read and replay only
- Privacy steward: coded private context only, no eligibility mutation
- Anonymous / RLS-bypassing credential: denied for ordinary runtime (no such
  credential exists in the app runtime)

## RPC Hardening

Default to invoker behavior. Any required `SECURITY DEFINER` RPC:

- is owned by dedicated `NOLOGIN NOBYPASSRLS` `api_executor`;
- uses fixed empty/`pg_catalog` search path and schema-qualified objects;
- has `PUBLIC` and `authenticated` execution revoked before explicit
  authenticated grant;
- validates `user_role`, `current_setting('app.user_id')::uuid`,
  ownership/assignment, expected version, idempotency, allowed JSON keys, and
  synthetic context; and
- writes only minimized idempotency/audit metadata.

See `RLS_AND_AUTH_BLUEPRINT.md`.

Canonical bytes, hash domains, replay statuses, and cold-replay gates are
defined in `CANONICALIZATION_AND_REPLAY_BLUEPRINT.md`.

## Day Sequence

1. Contract freeze and scaffold
2. Dev Aurora/PostgreSQL database, roles, deterministic seed/reset
3. Versioning, locked policy, generated types
4. RLS and field firewall
5. Routing plus frontend integration checkpoint
6. Blind review
7. Aggregation and pending
8. Decisions, correction, trace, replay
9. Critical 25-test hardening
10. Protected integration/demo buffer

## Hard Non-Goals

- Live or real-derived child data
- Production deployment/security/legal compliance
- Uploads/storage
- Finance, aid, allocation, offers, waitlists
- Substantive appeal/remand and full re-entry
- Retention/disposition engine
- Evaluator exports, outcomes, causal estimation
- ML scoring or empirical fairness validation
- Representing synthetic policy as GT policy
