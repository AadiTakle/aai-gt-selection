# Frontend Enablement Report

## Purpose

This report explains what the backend-owned overnight changes make possible for the frontend
developer without requiring them to know private database tables or wait for the complete
admissions engine.

## Stable frontend dependencies

Frontend code should consume only:

- `@gt-selection/contracts` for request/response validation, roles, status projections,
  reason codes, API errors, and TypeScript types;
- `@gt-selection/db-types` for generated exposed-`api` schema types;
- `@gt-selection/test-fixtures` for visibly fictional UI states and stories;
- the three read RPCs and seven write RPCs named in `docs/ARCHITECTURE_PLAN.md`.

Frontend code must not import private SQL/migration code or infer workflow state from tables.

## What the existing scaffold already enables

- Build route shells independently using the shared role, status, pending, outcome, and error
  vocabularies.
- Render Track A, Track B invitation, review-pending, qualifying, and non-qualifying states
  from fictional fixtures.
- Keep “eligibility” distinct from admission, offer, waitlist, funding, or “not gifted.”
- Validate local-only Supabase configuration and keep elevated credentials out of browser code.
- Run unit/component/Playwright checks in the same CI pipeline as backend pgTAP tests.

## What each backend slice will unlock

### Contract freeze

- Typed Server Action/RPC wrappers
- Stable mock responses for every status and error
- Fewer merge conflicts because payload names stop changing

### Versioning and routing

- Application autosave/submit integration
- Synthetic CogAT entry and deterministic Track A/Track B status rendering
- Reason-code-driven applicant copy

### Review and pending workflow

- Reviewer queue and locked submission integration
- Family pending/correction screens
- Blind-third-review and narrative-review status states

### Decisions and replay

- Applicant-safe explanations
- Correction history
- Auditor replay and integrity displays

## Frontend ownership boundary

The frontend teammate may work concurrently in:

```text
apps/web/src/app/**
apps/web/src/components/**
apps/web/src/styles/**
```

The overnight loop will not edit those paths. Shared contract changes are published through the
draft PR and documented here before frontend integration.

## Current integration guidance

Until a backend RPC exists, use exported fictional fixtures rather than duplicating payload
objects in frontend files. Treat every new contract as provisional until its slice is marked
complete in `OVERNIGHT_BACKEND_BUILD_LOG.md` and draft-PR CI is green.

## Cycle 1 frontend handoff

`@gt-selection/contracts` now exports `saveApplicationDraftRequestSchema` and its inferred
TypeScript type. The family application branch can:

- construct autosave payloads with stable version/idempotency/correlation fields;
- validate them before invoking a future Server Action;
- reject unknown or private fields before they cross the frontend/backend boundary; and
- test autosave UI state without waiting for the database RPC implementation.

The contract deliberately contains no household-income, finance, allocation, or live applicant
fields.

## Cycle 2 frontend handoff

`@gt-selection/contracts` now exports `submitApplicationResponseSchema` and its inferred type.
`@gt-selection/test-fixtures` exports `submittedApplicationResponseFixture`.

The frontend teammate can now implement and test:

- successful application submission confirmation;
- transition from draft to `awaiting_assessment`;
- applicant-safe next-action copy driven by `AWAIT_ASSESSMENT`;
- idempotent response handling; and
- rejection of accidental admission/offer wording at the contract boundary.

This fixture is the canonical UI mock for the submitted state until the database RPC exists.

## Cycle 3 frontend handoff

`@gt-selection/contracts` now exports the `recordAssessmentVersionRequestSchema`,
`recordAssessmentVersionResponseSchema`, and inferred request/response types.
`@gt-selection/test-fixtures` now exports:

- `pendingAssessmentResponseFixture` for `assessment_needs_correction`; and
- `trackBInvitationResponseFixture` for `track_b_snapshot_required`.

The frontend teammate can use these without reproducing routing logic. Both are runtime-valid v1
envelopes with correlation/idempotency metadata, exact synthetic assessment versions, typed Track
A and Track B invitation results, ordered reasons, and applicant-safe status projections.

The pending fixture is a successful domain response, not an error response. The invitation fixture
means Snapshot submission is available; it does not mean Track B eligibility, admission, an offer,
or funding.
