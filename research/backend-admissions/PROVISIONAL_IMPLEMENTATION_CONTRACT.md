# Provisional Two-Week Backend Contract

## Status

Design-only. Do not scaffold until the seven defaults in
`DAY_ZERO_DECISION_BRIEF.md` are ratified.

This is the executable cut, not the complete research architecture.

## Proposed Stack

- Node 24 LTS
- pnpm 10 with committed lockfile
- Next.js/TypeScript
- Local Supabase/PostgreSQL
- Zod shared contracts
- Vitest for TypeScript tests
- pgTAP through `supabase test db`
- Generated Supabase TypeScript types

No ORM, remote Supabase project, live uploads, production credentials, or
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
create schema api; -- views and narrow RPCs only
```

`auth.users` remains Supabase-owned.

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
    - exact input refs, outcome, ordered reasons, trace, hashes, code version
11. `app.audit_event`
    - minimized typed event metadata, no sensitive payload
12. `app.applicant_context`
    - coded synthetic access/support/choice sentinels only
    - inaccessible to reviewers and decision functions

## Core Database Invariants

- All rows/configuration are synthetic.
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

## Seven RPCs

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
- leaves original replayable;
- proves private/prohibited corrections change no decision/hash.

Substantive appeal and new evidence return `FEATURE_DISABLED`.

### 7. `api.replay_decision`

Auditor or dedicated non-bypass decision service.

Verifies exact input, policy, code, outcome, ordered reasons, and hashes. Writes
one audit event without modifying the original decision.

## Read Views

- `api.application_status`
- `api.assigned_review_case`
- `api.decision_explanation`

No writable API tables.

## Request Contract

Every mutation includes:

- `idempotency_key`;
- `expected_version` when stateful;
- actor/role from JWT, never request fields;
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
- Decision service: dedicated non-`BYPASSRLS` JWT role
- Auditor: trace read and replay only
- Privacy steward: coded private context only, no eligibility mutation
- Anonymous/service role: denied for ordinary runtime

## Day Sequence

1. Contract freeze and scaffold
2. Local database, roles, deterministic seed/reset
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
