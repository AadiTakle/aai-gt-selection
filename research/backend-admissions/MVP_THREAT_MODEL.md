# Synthetic Supabase/PostgreSQL MVP Threat Model

## Scope

Protect synthetic workflow integrity, reviewer independence, replay, and role separation.

Out of scope:

- live child data;
- production deployment;
- real uploads;
- enterprise IAM/MFA;
- WAF/DDoS;
- SIEM/HA/DR;
- formal penetration testing;
- production key management.

If the prototype stops being local, synthetic, or fixture-only, this threat model is insufficient.

## Assets

- Policy/rubric versions and reasons
- Application/CogAT/evidence versions
- Reviewer assignments and ratings
- Eligibility results and manifests
- Append-only audit history
- Synthetic fixtures
- Local credentials and sessions
- Migrations, seed data, and lockfiles

## Trust Boundaries

1. Browser → Next.js
2. Next.js → Supabase API/Auth
3. JWT/API → PostgreSQL RLS
4. Exposed API → private schemas
5. Reviewer assignment → evidence/ratings
6. Eligibility → prohibited/private fields
7. Database audit → external checkpoint
8. Repository → dependency registries/images

## Priority Threats

### RLS Bypass / IDOR

Threat:

- Change UUIDs
- Direct PostgREST access
- Permissive view/RPC
- Cross-applicant updates

Controls:

- Enable and force RLS
- Non-owner/non-BYPASSRLS connections
- USING and WITH CHECK
- Assignment/ownership tables
- Security-invoker by default
- Narrow exposed API schema

Tests:

- Every role/table/operation allow/deny pair
- Wrong applicant/case/assignment IDs
- Anonymous/expired/wrong-role requests

### Service-Key Exposure

Threat:

- Key in browser bundle/log/commit/screenshot

Controls:

- No `NEXT_PUBLIC_*`
- Service role limited to local seed/reset administration
- Prohibited in ordinary request handlers and decision execution
- Prefer user JWT/dedicated non-bypass role/narrow RPCs
- Audit every privileged invocation
- Secret scan source/history/build output

### Reviewer Blindness

Threat:

- Read peer rating before submitting
- Infer prior classification from metadata

Controls:

- Assignment-based evidence access
- No peer submission visibility
- Locked submissions
- Majority in controlled function

Tests:

- Reviewer reads peer draft/locked vote
- Supervisor reads prior votes
- Concurrent vote submissions

### Evidence Access

Threat:

- Guess object ID
- Reuse signed URL
- Enumerate bucket

Controls:

- Fixed synthetic fixtures
- Private bucket/protected route
- Assignment check before short-lived URL
- No real uploads

### Audit Tampering

Threat:

- Alter result/policy/event/actor/time

Controls:

- Database-generated events
- Actor from auth session
- No application-role update/delete
- Canonical input/result hashes
- External digest before demo

Limit:

- Database owner is trusted; tampering is detectable, not prevented.

### Injection / XSS

Controls:

- Parameterized queries
- Strict schemas/enums
- Allowlisted sort/filter columns
- Narrative rendered as escaped text
- No rich HTML or remote executable content

### Concurrency

Threat:

- Duplicate submissions
- Multiple third reviewers
- Premature majority
- Correction/decision race

Controls:

- Unique case/slot and submission constraints
- Transactional state transitions/row locks
- Idempotency keys
- Atomic third assignment
- Immutable input versions

### Privilege / Prohibited Fields

Controls:

- Purpose-separated schemas
- Allowlisted eligibility manifest
- Decision function is sole result writer
- Locked policy immutability
- Audit privileged actions

Tests:

- Mutate prohibited fields
- Track B toggle
- Consent changes
- Direct result insert/policy rewrite

### Supply Chain

Controls:

- Commit lockfile
- Reproducible clean install
- Pin Supabase CLI/container used for demo
- Minimize packages
- Triage reachable high/critical advisories
- Secret scan before merge/demo

### Privacy Lifecycle

Threat:

- Indefinite append-only retention
- Soft deletion that preserves payloads
- Logs/backups/exports outliving primary records
- Hold used to expand access or purpose
- Exact replay claimed after inputs are gone

Controls:

- Field-purpose-retention registry
- Virtual-clock synthetic retention policies
- Content-free disposition receipts
- Restore-time deletion-ledger replay
- Hold expiry/review without expanded access
- `hash_verifiable_only` after input disposition

Tests:

- Expiry and deletion idempotency
- Backup restore before access
- Forbidden canary values absent from logs
- Hold pauses deletion but not RLS

### Synthetic-Data Provenance

Threat:

- Real or lightly modified child data mislabeled synthetic
- Generated data memorizes/reproduces source records
- Fixture media contains identifiers or metadata

Controls:

- Born-synthetic fixtures independent of real records
- Provenance/license/checksum manifest
- No upload endpoint or external model prompt
- Database/startup assertion rejects non-synthetic configuration
- Treat future real-data-trained synthesis as separate privacy-reviewed research

## Minimum Security Gate

1. Direct API role/table denial tests pass.
2. No service key in source/client output.
3. Cross-case and prior-rating access fail.
4. Audit/locked decisions reject mutation.
5. Every decision replays.
6. Prohibited-field and Track A invariance pass.
7. Concurrency yields one deterministic result.
8. Injection payloads remain inert.
9. Clean locked dependency install passes.
10. Demo clearly states local/synthetic/non-production.
11. Field registry, expiry, deletion, backup, and log-canary tests pass.
12. Fixture provenance proves no real child-derived inputs.
