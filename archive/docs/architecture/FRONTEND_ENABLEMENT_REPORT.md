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
- the eight implemented Milestone A family RPCs plus the later admissions RPC
  catalog named in `docs/architecture/ARCHITECTURE_PLAN.md`.

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

This historical foundation contract contains no household-income, finance,
allocation, or live applicant fields. D-013 now requires a separate synthetic
financial-intake contract; it does not add allocation, W-2, or live-data fields.

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

## Cycle 4 frontend handoff

`@gt-selection/contracts` now exports `submitSnapshotVersionRequestSchema`,
`submitSnapshotVersionResponseSchema`, and the inferred Snapshot, narrative-context, review-case,
and request/response types. `@gt-selection/test-fixtures` now exports:

- `artifactSnapshotSubmissionResponseFixture`; and
- `narrativeSnapshotSubmissionResponseFixture`.

The artifact contract accepts one or two synthetic fixture references and returns two blind initial
assignments. The narrative contract accepts exactly one synthetic fixture, requires its bounded
factual context, and returns three blind initial assignments with slot 3 designated supervisor.

The frontend must send fixture references, never URLs, media, file data, or upload metadata. The
response intentionally omits reviewer identities and all prior votes. Both fixtures project
`snapshot_under_review` with `AWAIT_REVIEW` and preserve the eligibility-not-admission boundary.

## Cycle 5 frontend handoff

`@gt-selection/contracts` now exports `submitReviewResponseSchema`, `reviewSubmissionSchema`,
`reviewTransitionSchema`, and their inferred types. `@gt-selection/test-fixtures` now exports:

- `artifactDisagreementReviewResponseFixture`; and
- `narrativeTwoVotesReviewResponseFixture`.

The artifact fixture demonstrates the internal pending state and the single opaque slot-3
supervisor assignment created after conflicting blind votes. The narrative fixture demonstrates
that two completed votes, even if they agree, remain `snapshot_under_review` until the required
third vote.

Frontend code must render the supplied status projection and must not derive an aggregate from
individual reviews. Responses intentionally expose `previousVotesExposed: false`, no reviewer
identity, and no admission, offer, funding, or program-effect statement.

## Cycle 6 frontend handoff

`@gt-selection/contracts` now exports the unified `submitReviewActionRequestSchema` and
`submitReviewActionResponseSchema`, plus typed abstention, blocking-issue, replacement-assignment,
and pending-item contracts. `@gt-selection/test-fixtures` now exports:

- `reviewAbstentionResponseFixture`;
- `evidencePendingReviewResponseFixture`; and
- `accessibilityPendingReviewResponseFixture`.

An abstention is a non-vote action and returns replacement work without a classification. Evidence
correction projects `review_pending_family_action` with `CORRECT_SNAPSHOT_EVIDENCE`; accessibility
failure projects `review_pending_internal_action` with `AWAIT_ACCESSIBILITY_ROUTE`. In both pending
fixtures, the displayed deadline exactly matches the owned pending item.

Frontend code must not infer a negative outcome from either pending state and must not collect
free-text issue descriptions; the contract exposes only the bounded synthetic reason vocabulary.

## Cycle 7 frontend handoff

`@gt-selection/contracts` now exports `applyCorrectionRequestSchema`,
`applyCorrectionResponseSchema`, `disabledCorrectionRequestSchema`, and the correction lineage/
impact types. `@gt-selection/test-fixtures` now exports:

- `assessmentCorrectionResponseFixture`;
- `invariantCorrectionResponseFixture`; and
- `disabledAppealResponseFixture`.

The assessment fixture demonstrates a preserved original, one immutable successor, a completed
decision rerun from a complete manifest, and the corrected applicant-safe status. The invariant
fixture demonstrates unchanged decision input/result hashes when corrected metadata is excluded
from decision use.

Substantive rubric appeal and genuinely new evidence are not correction payloads. Both receive
non-retryable `FEATURE_DISABLED`; new evidence belongs to manual later-cycle re-entry.

## Cycle 8 frontend handoff

`@gt-selection/contracts` now exports `replayDecisionRequestSchema`,
`replayDecisionResponseSchema`, replay mode/status schemas, component verification states, and
failure-code types. `@gt-selection/test-fixtures` now exports:

- `exactReplayResponseFixture`; and
- `disposedInputReplayResponseFixture`.

The audit UI may display `reexecuted_exact` only when `exactReplayClaimed` is true and every
component verifies. `record_reconstructed` and `digest_verified` are intentionally weaker modes.
Disposed input or a missing executable/environment artifact must display a refusal state, not a
successful replay.

No replay fixture uses network access. Integrity failures and execution mismatches remain separate
so the UI does not collapse tampering/corruption into nondeterministic execution.

## 2026-07-20 Milestone A onboarding backend handoff

The final D-013 contract now separates:

- reusable `studentProfileContentSchema` identity/household/language content;
- cycle `applicationDraftSchema` core and immutable school snapshot;
- private `supportDisclosureSchema` and `financialIntakeSchema` sections; and
- the exact versioned acknowledgement/signature statement.

The schemas reject essays, enrollment date, prior-school history, W-2/document
metadata, actor IDs, and role claims. Synthetic placeholder vocabularies remain
explicit because E-063–E-065 are unresolved.

`@gt-selection/test-fixtures` now provides two profiles, an active fictional
school list, full and partial drafts, an `other` school route, save/reload/review
responses, and a submitted `awaiting_assessment` response. Use these objects
instead of rebuilding payloads in components.

Frontend code can import these server actions from
`apps/web/src/lib/onboarding/actions.ts`:

- `saveStudentProfileAction`, `getStudentProfileAction`,
  `listStudentProfilesAction`;
- `listActiveSchoolsAction`;
- `saveApplicationDraftAction`, `getApplicationAction`,
  `submitApplicationAction`, and `getApplicationStatusAction`.

The actions validate both directions through `@gt-selection/contracts`. B11B
uses the current local Auth cookie only on the server, accepts no actor/role
input, requires an admin-controlled synthetic family claim, binds the verified
local principal transactionally in PostgreSQL, and fails outside the designated
loopback synthetic project. No elevated key or database credential is present
in browser code. Merge-blocking integration now imports `actions.ts` directly,
signs in through local Auth, lets the production server client restore the
session from Next-compatible request cookies, and executes all eight actions.
Next instrumentation rejects partial, remote, or production B11B configuration
at bootstrap; disabled ordinary builds remain unaffected.

The frontend may now build and locally connect F2–F5/F6 against these actions.
The form UI itself is still absent. B11A later replaces only the local
Supabase/PostgREST binding with Cognito, RDS Proxy, and Aurora; the action and
Zod contracts remain transport-neutral. This handoff does not authorize live
child data, real school values, aid decisions, proof documents, or a legal
compliance claim.
