# Onboarding Overhaul — Ticket Backlog

## Scope

Everything in the admissions pipeline **before CogAT**: the family creates,
saves, resumes, and submits the base application, and sees status advance to
`awaiting_assessment`. Maps to PRD "Base Application Information" and
`docs/FEATURE_TO_REQUIREMENT_MAP.md` features **F2.1, F2.2, F2.3, UI-01**
(family surface only).

### Explicitly out of scope (do not build in these tickets)

- CogAT/assessment recording, Track A/B routing (F7.x)
- Talent Evidence Snapshot, review, adjudication (F3–F5, F8)
- Decisions, explanations, correction, replay (F9, BE-07/08/10/11)
- Policy bundle / rubric versioning (not needed — no routing decision happens
  in this slice)
- Financial aid fields (deferred beyond MVP per PRD `B-08`)

This keeps the slice genuinely small: **create → save/resume → submit → see
status**, nothing else.

### Governance

- Requirements served: R1, R5, R8, R9, H2, H4, H7, H9, H10 (per F2.1–F2.3 in
  `FEATURE_TO_REQUIREMENT_MAP.md`)
- Current status per that map: F2.1/F2.3 = "Contract/fixture ready"; F2.2 =
  "Specified/researched"; UI-01 = "Scaffold only"
- Blockers to note, not solve, in these tickets: `B-01` (real Track A
  workflow), `B-02` (real ages/grades/services), `B-06` (privacy/consent/WCAG
  validation) — all rules/fields stay synthetic and versioned
- Backend platform: build against the current local dev stack (Supabase
  Postgres runtime). Per **D-012**, only the auth/DB-client binding layer
  changes when AWS lands later — the schema, RLS, and RPC bodies below are
  portable and will not need to be rewritten.

---

## Backend tickets

### B1 — Expand the application draft/version contract to the full PRD field set

**Status:** Complete (2026-07-20). The contract stores age rather than date of
birth and omits address until an operational need is confirmed, minimizing
synthetic child-data shape while `B-02` remains open. Identifiers, names,
school types, contact values, and referral codes are constrained to visibly
fictional patterns so `syntheticOnly=true` is not the sole privacy control.

**What:** `applicationDraftSchema` and `applicationVersionSchema` in
`packages/contracts/src/application.ts` currently only have
`currentGrade`/`requestedGrade`/`requestedEntryYear`. Add the rest of the PRD
"Base Application Information" fields: synthetic student identifier, date of
birth or age, educational background (current school/type, enrollment dates,
prior schools), parent/guardian info (relationship, prior-GT-relative Y/N,
contact info, address if required), required-step checklist, accuracy
acknowledgement, and referral source (operations-only, hidden from reviewers —
mark with a field-level comment, not a new RLS role yet).

**Explicitly excludes:** accommodation/language-route fields (those belong to
B12/F6 below, a separate private table) and all financial-aid fields (deferred).

**Files:** `packages/contracts/src/application.ts`,
`packages/contracts/src/contracts.test.ts`,
`packages/test-fixtures/src/index.ts`

**Acceptance criteria:**

- Every field from PRD § Base Application Information (excluding accessibility
  and financial aid) has a typed, `.strict()` Zod field with `syntheticOnly`
  literal where applicable
- Fixture + test added for the expanded schema
- `pnpm --filter @gt-selection/contracts test` passes

**Requirements:** R1, R5, R9, H2, H10
**Depends on:** none
**Size:** S–M

---

### B2 — Define the missing read-RPC and draft-save-response contracts

**Status:** Complete (2026-07-20).

**What:** No contract currently exists for `api.get_application_status`
(a read RPC named in `PROVISIONAL_IMPLEMENTATION_CONTRACT.md`) or for the
response shape of `save_application_draft`. Add
`saveApplicationDraftResponseSchema` (application version + content hash) and
`getApplicationStatusRequestSchema`/`getApplicationStatusResponseSchema`
(wrapping the existing `statusProjectionSchema`).

**Files:** `packages/contracts/src/application.ts` (or a new
`packages/contracts/src/status.ts`), `packages/contracts/src/index.ts`,
fixtures/tests

**Acceptance criteria:**

- Both new response schemas exist, exported, and covered by fixtures
- Response shapes never include raw scores, reviewer data, or anything beyond
  `statusProjectionSchema`'s existing fields

**Requirements:** R7, R10, H9
**Depends on:** B1 (for the version shape it wraps)
**Size:** S

---

### B3 — Migration: `app.application` and `app.application_version` tables

**Status:** Complete (2026-07-20). Draft content is stored as validated JSONB
to preserve partial autosaves; identity, state, lineage, timestamps, and
commitments remain typed relational columns.

**What:** First real data migration. Add the two core tables from
`MVP_DATA_CONTRACT.md`: `app.application` (owner, synthetic code, cycle,
timestamps) and `app.application_version` (immutable submitted versions,
successor lineage, `content_hash`, `state` enum matching
`applicationStateSchema`). Columns should mirror the B1-expanded contract
fields (flattened or as one `content jsonb` column — pick one and document
why in the migration comment).

**Files:** new file in `supabase/migrations/`

**Acceptance criteria:**

- `pnpm db:reset` applies cleanly
- Submitted versions have no `UPDATE`/`DELETE` grant path for any role
  (immutability enforced at the grant level, not just app logic)
- `pnpm db:lint` passes

**Requirements:** R7, R9
**Depends on:** B1 (field list)
**Size:** M

---

### B4 — Migration: minimal synthetic `cycle` table + seed row

**Status:** Complete (2026-07-20).

**What:** Add the `cycle(cycle_id, cycle_code, data_class, opens_at,
closes_at)` table from `BACKEND_DATA_MODEL.md` (minimal columns only — no
policy bundle reference needed for this slice) and seed exactly one synthetic
cycle so local dev has something to attach applications to.

**Files:** new migration file, `supabase/seed.sql`

**Acceptance criteria:**

- One `synthetic_only=true` cycle row exists after `pnpm db:reset`
- Cycle code is clearly fictional (e.g., `CYCLE-SYN-01`)

**Requirements:** R8, R9
**Depends on:** none (can run before or parallel to B3)
**Size:** S

---

### B5 — Migration: idempotency-key table

**Status:** Complete (2026-07-20).

**What:** Add the shared idempotency dedupe table referenced by every write
RPC in the provisional contract (`(actor_id, rpc_name, idempotency_key)`
unique constraint, per `PROVISIONAL_IMPLEMENTATION_CONTRACT.md` request
contract). This is shared infrastructure other backend work will also need,
but only `save_application_draft`/`submit_application` will use it in this
slice.

**Files:** new migration file

**Acceptance criteria:**

- Unique constraint on `(actor_id, rpc_name, idempotency_key)`
- Reused key with a different payload hash is detectable (store a payload
  hash column for the RPC layer to check)

**Requirements:** R7
**Depends on:** none
**Size:** S

---

### B6 — RLS policies for `app.application` / `app.application_version`

**Status:** Complete (2026-07-20). Policies use the D-012 Cognito-to-GUC
principal contract (`app.user_id`, `app.user_role`).

**What:** Force RLS on both tables, revoke all direct grants from
`authenticated`, and add the ownership policy from
`RLS_AND_AUTH_BLUEPRINT.md`: `application.owner_user_id =
current_setting('app.user_id')::uuid`. No other role needs access in this
slice (admissions operator doesn't touch base applications yet — that starts
at assessment recording, which is out of scope).

**Files:** same migration as B3, or a follow-up migration

**Acceptance criteria:**

- `alter table ... force row level security` present for both tables
- `revoke all ... from public, authenticated` present before any grant
- No role except the family owner can select/insert their own rows even with
  direct table access (tested in B7)

**Requirements:** R7, R9
**Depends on:** B3
**Size:** S

---

### B7 — pgTAP tests: ownership isolation for application tables

**Status:** Complete (2026-07-20). Tests cover hard direct-table denial,
family-owner isolation, wrong-owner insert denial, and idempotency actor
isolation.

**What:** Extend `supabase/tests/` with a new test file covering: anon denied,
one family cannot read/write another family's application, and the
`authenticated` role has zero direct table grants (must go through RPCs).
This is the `RLS-01`/`AUTH-01`/`IDOR-01` subset from
`CRITICAL_TEST_MANIFEST.md` scoped to just these two tables.

**Files:** new file in `supabase/tests/`

**Acceptance criteria:**

- `pnpm db:test` passes with the new file
- Test explicitly asserts cross-owner row access fails (not just "no rows
  returned" — check for a denial, not an empty result, per IDOR-01 intent)

**Requirements:** R7, R9, H7
**Depends on:** B6
**Size:** S–M

---

### B8 — Implement `api.save_application_draft`

**Status:** Complete (2026-07-20).

**What:** The first write RPC. `SECURITY DEFINER`, owned by `api_executor`,
re-verifies the Cognito-bound session GUC identity/role, ownership,
`expected_version`, idempotency key, and typed/allowlisted JSON content before
appending a new `application_version` row.
Returns the new version + content hash per B2's response schema.

**Files:** new migration (RPC function), integration test

**Acceptance criteria:**

- Matches the request/response contracts from B1/B2 exactly
- Stale `expected_version` returns `409 STALE_VERSION`
- Reused idempotency key with a different payload returns
  `409 IDEMPOTENCY_KEY_REUSED`
- Non-owner call returns the same not-found response as a missing application
  (per the blueprint's "wrong-owner = not-found" rule)

**Requirements:** R1, R7, R9, H9, H10
**Depends on:** B1, B2, B3, B5, B6
**Size:** M

---

### B9 — Implement `api.submit_application`

**Status:** Complete (2026-07-20).

**What:** Locks the current draft into a `submitted` state (immutable from
this point), and returns the frontend `statusProjection` with
`workflowStatus: awaiting_assessment`.

**Files:** same migration file as B8 or a follow-up, integration test

**Acceptance criteria:**

- Submitted version becomes immutable (verified in test: a later draft save
  or submission cannot alter or append to that application)
- Returned status projection matches `statusProjectionSchema` exactly,
  including `claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION'`
- Double-submit returns `409 SUBMISSION_LOCKED`

**Requirements:** R1, R7, R9, R10, H9
**Depends on:** B8
**Size:** M

---

### B10 — Implement `api.get_application_status` (read RPC)

**Status:** Complete (2026-07-20).

**What:** Family-only read RPC (or `security_invoker=true` view) returning the
current status projection for the caller's own application. For this slice,
the projection logic is a pure function of `application_version.state`
(draft → `application_draft`; submitted → `awaiting_assessment`) — no policy
bundle or routing engine needed.

**Files:** new migration (RPC/view), integration test

**Acceptance criteria:**

- Returns `application_draft` before submission, `awaiting_assessment` after
- Never exposes raw table columns beyond the projection fields
- Cross-owner read denied (same test pattern as B7)

**Requirements:** R7, R9, R10, H9
**Depends on:** B3, B6, B9
**Size:** S–M

---

### B11 — Regenerate and commit `packages/db-types`

**Status:** Complete (2026-07-20).

**What:** Run `pnpm db:types` after B3–B5 land so generated types reflect the
new tables, and fix `scripts/check-generated-types.ts` drift if any.

**Files:** `packages/db-types/src/database.generated.ts`

**Acceptance criteria:**

- `pnpm db:types:check` passes on a clean Node 24 run

**Requirements:** R7
**Depends on:** B3, B4, B5
**Size:** S (mechanical)

---

### B11A — Implement the Cognito/`pg` request adapter

**Status:** Pending. Required before the frontend uses live RPCs; intentionally
not part of the database-only overnight slice.

**What:** Add a server-only Next.js adapter that verifies the Cognito JWT,
extracts `sub` and the admin-controlled `custom:user_role`, opens one `pg`
transaction, sets `SET LOCAL app.user_id` and `app.user_role`, invokes the
three `api` functions, maps `PT4xx` SQLSTATEs to typed HTTP errors, and commits
or rolls back. This is the D-012 replacement for browser/PostgREST
`supabase.rpc(...)`; no database credential or role claim may enter browser
code.

**Files:** server-only database/auth modules and Server Actions or route
handlers under `apps/web/src/`; AWS client configuration owned by the AWS
binding workstream

**Acceptance criteria:**

- Forged, missing, or user-editable roles cannot set either PostgreSQL GUC
- Each request uses one transaction and clears identity automatically at its
  end
- The three actions parse requests/responses through `@gt-selection/contracts`
- `PT400/401/403/404/409` map to the documented typed error envelope
- Integration tests prove family ownership and cross-owner not-found behavior
  through the adapter, not only direct SQL
- No browser bundle or ordinary app runtime contains an RLS-bypassing
  credential

**Requirements:** R7, R8, R9, R10, H9
**Depends on:** B8–B11 and the D-012 AWS binding foundation
**Size:** M–L

---

### B12 — Stretch: private accommodation/language route request table

**What:** Add `access_support_request` (from `BACKEND_DATA_MODEL.md`) so F6
(frontend accessibility request UI) has somewhere to write. This is F2.2,
already marked "Specified/researched" with `B-06` still open — treat as
optional for this slice; the base application can ship without it and add
this in a follow-up ticket.

**Files:** new migration, RLS policy (family write-only, no read-back of
rationale field beyond their own request)

**Acceptance criteria:**

- Family can create a request; no role except the (future) access steward can
  read the private rationale field
- Explicitly does not affect `get_application_status`'s output

**Requirements:** R9, H4, H7, H10
**Depends on:** B3, B6
**Size:** M
**Recommendation:** defer to a phase-2 ticket unless accessibility routes are
a launch blocker for your teammate's UI work.

---

## Frontend tickets

### F1 — Typed RPC wrapper layer

**What:** `apps/web/src/lib/rpc/` — transport-neutral typed clients for
`saveApplicationDraft`, `submitApplication`, and `getApplicationStatus`.
Components call Server Actions, never `supabase.rpc(...)` or PostgreSQL
directly. The interface can be built and unit-tested against
`packages/test-fixtures` before B11A provides the live Cognito/`pg` adapter.

**Files:** new files under `apps/web/src/lib/rpc/`

**Acceptance criteria:**

- One wrapper per RPC (`saveApplicationDraft`, `submitApplication`,
  `getApplicationStatus`), each parsing the response with the matching Zod
  schema and throwing a typed error on parse failure
- Unit tests use fixtures, not a live database

**Requirements:** R7, R10
**Depends on:** B1, B2 for the fixture-backed interface; B11A for live calls
**Size:** S–M

---

### F2 — Family application form (multi-step)

**What:** Build the actual form UI at
`apps/web/src/app/(embed)/family/apply/`, replacing the current
`SurfacePlaceholder`. Fields driven directly by B1's expanded schema: student
info, educational background, parent/guardian info, final checklist +
accuracy acknowledgement, referral source (hidden input, not shown as a
form field to the reviewer-facing UI).

**Files:** `apps/web/src/app/(embed)/family/apply/page.tsx` and subcomponents

**Acceptance criteria:**

- Every B1 field has an input with client-side Zod validation
- Referral source field exists but is not visually presented as
  applicant-facing "for reviewers" copy (per PRD: operations-only)
- No accessibility/language or financial-aid fields present (out of scope)

**Requirements:** R1, R9, H10
**Depends on:** B1, F1 (or fixtures, to unblock in parallel)
**Size:** M–L

---

### F3 — Autosave and resume

**What:** Debounced autosave calling `saveApplicationDraft` on field change
(not a dedicated save button, per PRD), and restore-on-return by loading the
current draft when the family revisits `/family/apply`.

**Files:** `apps/web/src/app/(embed)/family/apply/` (hook/component),
`apps/web/src/lib/rpc/`

**Acceptance criteria:**

- Reloading the page mid-form restores all previously saved fields
- Concurrent-edit conflict (stale `expectedVersion`) shows a clear "someone
  else changed this" message, not a silent overwrite

**Requirements:** R9, H9, H10
**Depends on:** F1, F2, B8, B11A for live integration
**Size:** M

---

### F4 — Submission flow

**What:** Final review screen showing the required-step checklist and
accuracy acknowledgement, wired to `submitApplication`. Handles
`SUBMISSION_LOCKED`/`STALE_VERSION` error codes with applicant-safe messages.

**Files:** `apps/web/src/app/(embed)/family/apply/` (review step)

**Acceptance criteria:**

- Submission is blocked client-side until the checklist is complete
- Post-submit, user is redirected to `/family/status`
- Error codes map to the applicant-safe copy from the PRD's error contract,
  never a raw error code or stack trace

**Requirements:** R1, R9, R10, H9
**Depends on:** F3, B9, B11A
**Size:** M

---

### F5 — Family status page

**What:** Build `/family/status` to render only the `statusProjection` enum
fields — never raw scores, reviewer identity, or audit data (this is a hard
rule from the architecture plan). Shows the PRD's required post-submission
copy verbatim: *"Application received. This is not an eligibility or
admission decision..."*, CogAT as next step, deadline, and next-action code.

**Files:** `apps/web/src/app/(embed)/family/status/page.tsx`

**Acceptance criteria:**

- Displays `workflowStatus`, `nextActionCode`, `deadline`,
  `claimBoundaryCode` copy exactly as specified
- Renders correctly for both `application_draft` and `awaiting_assessment`
  states
- No component in this page can render a field outside
  `statusProjectionSchema`

**Requirements:** R9, R10, H9
**Depends on:** B10, B11A, F1
**Size:** S–M

---

### F6 — Stretch: accessibility/language route request UI

**What:** Frontend for B12's private request table — a small form (likely on
the application or a separate `/family/accessibility` route) letting a family
request an accommodation or translated/assisted route.

**Files:** new route/component

**Acceptance criteria:**

- Submits to the B12 table via a dedicated RPC (not yet specified — would
  need its own small contract + RPC ticket if you pick this up)
- Confirmation only; no immediate approval/denial shown (per PRD, this is a
  request/fulfillment workflow, not instant)

**Requirements:** R9, H4, H7, H10
**Depends on:** B12
**Size:** M
**Recommendation:** defer alongside B12.

---

### F7 — Shared error-code → message mapping

**What:** One shared module mapping API error codes (`VALIDATION_FAILED`,
`STALE_VERSION`, `SUBMISSION_LOCKED`, etc.) to applicant-safe copy, used by
F2/F3/F4 so error handling isn't duplicated per form.

**Files:** `apps/web/src/lib/errors.ts` (or similar)

**Acceptance criteria:**

- One function `mapErrorCode(code) => string` covering every code in the
  provisional contract's error list that's reachable from these RPCs
- Never leaks raw codes/messages to the UI

**Requirements:** R9, R10, H9
**Depends on:** none (can be built anytime, wired into F3/F4)
**Size:** S

---

### F8 — End-to-end test: full onboarding happy path

**What:** Playwright test: log in as `family@example.test`, fill the form,
reload mid-way to confirm autosave, submit, confirm status shows
`awaiting_assessment` with the correct copy.

**Files:** `apps/web/e2e/`

**Acceptance criteria:**

- Runs in CI via existing `pnpm test:e2e` / verify pipeline
- Covers autosave-then-reload explicitly (not just happy-path submit)

**Requirements:** R1, R7, R9
**Depends on:** F2, F3, F4, F5 all complete
**Size:** M

---

## Suggested order

```
Backend:  B1 → B2 ─┐
          B4, B5 ───┼─→ B3 → B6 → B7 → B8 → B9 → B10 → B11 → B11A
                     │                  (parallel with B6/B7)
Frontend: F1 (against fixtures, doesn't wait for backend)
          F2 (needs B1 only) → F3/F4/F5 live wiring (needs B11A)
          F7 anytime, wire into F3/F4
          F8 last
Stretch:  B12 → F6 (defer unless accessibility is a launch blocker)
```

Backend and frontend can run in parallel almost immediately: your teammate
can start **F2** the moment **B1** (contract) lands, using
`packages/test-fixtures` to mock RPC responses via **F1** until the database
RPCs (B8–B10) and request adapter (B11A) are both ready.

## Total: 13 backend tickets (12 required + 1 stretch), 8 frontend tickets (7 required + 1 stretch)
