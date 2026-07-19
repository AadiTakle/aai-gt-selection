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
