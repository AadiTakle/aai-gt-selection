# Overnight Backend Build Log

## Run contract

- **Branch:** `feat/backend-admissions-core`
- **Target:** draft PR into `dev`
- **Cadence:** one bounded TDD slice every 30 minutes
- **Owned paths:** `packages/contracts/**`, `packages/db-types/**`,
  `packages/test-fixtures/**`, `supabase/**`, backend scripts, this log, and
  `docs/FRONTEND_ENABLEMENT_REPORT.md`
- **Excluded:** frontend routes/components/styles, allocation, finance,
  evaluation, uploads, hosted Supabase, production deployment, and substantive appeals
- **Merge policy:** commit and push green slices; never merge overnight

## Public seams under test

1. Zod request/response schemas exported by `@gt-selection/contracts`
2. Explicit `api` RPC boundary and generated API-only database types
3. Deterministic synthetic fixtures exported by `@gt-selection/test-fixtures`
4. Database behavior through pgTAP and direct RPC/Auth tests
5. CI checks on the draft PR

## Mandatory TDD gate

Every implementation slice must record all four stages before it can be committed:

1. **Seam:** name the public contract, RPC, or database behavior being tested.
2. **Red:** add one focused acceptance test and run it before implementation; record the command
   and the expected failure.
3. **Green:** implement only enough behavior to satisfy that test; rerun the targeted test.
4. **Regression:** run the relevant package checks plus workspace lint, typecheck, and tests.

No implementation commit is allowed without observed red and green evidence. Documentation-only,
generated-file, or CI-maintenance changes must be labeled explicitly rather than presented as a
TDD implementation slice. Tests verify public behavior and may not assert private helpers,
duplicate implementation logic, or rely on snapshots that cannot independently fail.

## Ordered slices

- [ ] Shared write/read RPC schemas, workflow transitions, reasons, errors, and examples
- [ ] Immutable application, assessment, and synthetic policy versions
- [ ] Deterministic Track A and Track B invitation routing
- [ ] RLS ownership and role isolation
- [ ] Snapshot and blind reviewer workflow
- [ ] Pending items, final eligibility, and correction successors
- [ ] Canonical decision replay
- [ ] Critical-suite hardening and final adversarial review

## Cycle log

### Cycle 0 — Setup

- Created the dedicated backend branch.
- Confirmed accepted architecture and existing Phase B scaffold.
- Established path ownership and public test seams.
- Next slice: freeze the first write RPC contract (`save_application_draft`) through a failing
  contract test, then implement the minimum schema.

### Cycle 1 — Draft-save contract

- Added a strict `saveApplicationDraftRequestSchema` with application identity, expected
  version, idempotency key, correlation ID, and synthetic-only draft payload.
- Verified red first: the new contract test failed while the schema was absent.
- Verified green: 11 contract tests and contract typecheck pass.
- Confirmed unknown/private fields such as household income are rejected.
- Frontend enablement: the family application shell can now type and validate draft autosave
  payloads without importing Supabase or private database types.
- Next slice: freeze `submit_application` response/envelope and status projection examples,
  then continue through the remaining write/read RPC contracts.

### Cycle 2 — Submitted-application response

- **Seam:** `submit_application` public response envelope and frontend fixture.
- **Red:** contract test failed because `submitApplicationResponseSchema` was absent; fixture
  test failed because the submitted response example was absent.
- **Green:** added a strict v1 success envelope containing the immutable submitted application,
  applicant-safe `awaiting_assessment` projection, synthetic-only marker, and idempotency
  metadata; added the matching fictional frontend fixture.
- **Regression:** 12 contract tests, 6 fixture tests, and both package typechecks pass.
- Confirmed the response rejects prohibited workflow values such as `admitted`.
- Frontend enablement: the family portal can build submit-success and awaiting-assessment UI
  against one validated response object rather than maintaining a hand-written mock.
- Next slice: freeze assessment-recording/routing request and response contracts, including
  pending assessment outcomes and Track A/Track B reason ordering.

### Cycle 3 — Assessment recording and routing contracts

- **Seam:** `record_assessment_version` request/response, typed routing decisions, and canonical
  pending/invitation fixtures.
- **Red:** tests first exposed three absent or permissive boundaries: unversioned reasons were
  accepted, a Track A decision could carry a Track B outcome, and the assessment RPC
  request/response plus fixtures did not exist.
- **Green:** closed reasons to the versioned reason-code vocabulary; discriminated decision
  summaries by decision kind; added strict assessment input, immutable version, routing, and v1
  response schemas; added validated missing/invalid and dual-reason Track B fixtures.
- **Regression:** 15 contract tests, 8 fixture tests, and both package typechecks pass.
- Missing or invalid assessment data now resolves as a successful domain envelope with both
  routing decisions `pending`, never as an HTTP/transport failure or negative classification.
- The synthetic dual-reason fixture preserves canonical order:
  `TB_COMPOSITE_BAND`, then `TB_BATTERY_PROFILE`.
- Frontend enablement: admissions and family surfaces can independently implement assessment
  correction and Snapshot-invitation states against runtime-validated fixtures.
- Next slice: freeze `submit_snapshot_version` request/response contracts for artifact and
  narrative routes, including review-case creation and initial blind assignments.
