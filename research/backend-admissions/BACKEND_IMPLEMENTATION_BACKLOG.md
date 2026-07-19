# Two-Week Backend Implementation Backlog

> **Platform (D-012):** Target platform is AWS with PostgreSQL retained (Aurora/Cognito/S3/RDS Proxy/Secrets Manager; see `docs/DECISION_LOG.md` D-012). The security/replay design is unchanged; only bindings move. See the **AWS platform migration** items under "Follow-up work" below.

## Scope

Build a synthetic-only PostgreSQL backend for deterministic routing, blind review, pending states, immutable decisions, audit, replay, and RLS. (Currently on the local Supabase dev stack; migrating to the AWS Aurora dev boundary per D-012.)

Future causal, evaluator, allocation, aid, outcome, and ML infrastructure is excluded.

The broader research data/privacy contracts are design references, not the
two-week build. Field registries, retention/disposition engines, consent
management, full remedy/appeal, and production security are deferred.

Canonical provisional build references:

- `PROVISIONAL_IMPLEMENTATION_CONTRACT.md`
- `CRITICAL_TEST_MANIFEST.md`
- `RLS_AND_AUTH_BLUEPRINT.md`
- `CANONICALIZATION_AND_REPLAY_BLUEPRINT.md`

## Day 0 — Resolve Contract Conflicts

Before coding:

1. Replace the collapsed Track A/Track B causal claim with the BrainLift
   two-stage lottery-effect and service-fit/noninferiority design.
2. Quarantine Track-A-first aid/lottery as future research.
3. Clarify `domain` versus `domain prestige`.
4. Choose one pending/reviewer aggregation contract.
5. Confirm appeal is outside MVP or specify it consistently.
6. Omit finance persistence from the MVP.
7. Mark all rules/thresholds as synthetic fixtures.

## Week 1

### Day 1 — Freeze Contracts

**Owner:** Aadi  
**Files:** proposed `src/contracts/workflow.ts`, `review.ts`, `decision.ts`, `reason-codes.ts`

Define:

- workflow states;
- Track A/Track B response types;
- review classifications;
- pending reasons;
- applicant-safe messages;
- authoritative `user_role` claim vocabulary;
- synthetic-only startup/data assertion;
- API request/response fixtures.

Acceptance:

- every state has allowed transitions;
- every result includes policy version, reason codes, and next action;
- no response implies admission, “not gifted,” or program effect.

Blockers B-01–B-04 use explicit synthetic values.

### Days 1–2 — Initialize Local Supabase

**Owner:** Aadi  
**Files:** `supabase/config.toml`, migrations, local seeds

Scaffold the application/test runner and create:

- one private application schema for MVP tables;
- one exposed `api` schema with narrow RPCs/views;
- seeded synthetic users/roles;
- one reset/seed/demo command.

Acceptance:

- clean local reset;
- synthetic records only;
- no production project/credentials.

### Days 2–3 — Versioned Admissions and Policy

Implement:

- application/version;
- assessment/version;
- policy/version/bundle;
- reason codes;

Acceptance:

- submitted records immutable;
- corrections create successors;
- policies visibly `synthetic_fixture`, `validated=false`;
- B-01/B-03/B-04 attached.

### Days 3–4 — RLS and Field Firewall

Roles:

- family;
- admissions operator;
- reviewer;
- review supervisor;
- policy admin;
- auditor;
- privacy steward.

Acceptance:

- default-deny role/table matrix;
- `auth.uid()` ownership and assignment predicates;
- no authorization from `user_metadata`;
- hardened read/definer RPC catalog;
- reviewer assigned-case access only;
- prohibited-field mutations leave decisions unchanged;
- service credentials server-only.

### Days 4–5 — Deterministic Routing

Implement:

- Track A synthetic rule;
- Track A invariance when Track B enabled;
- Track B composite-band/battery-profile invitation;
- missing/invalid/pending handling;
- deterministic reasons.

Acceptance:

- boundary fixtures pass;
- invitation never implies eligibility;
- prohibited fields cannot affect routing.

## Week 2

### Days 6–7 — Independent Review

Artifact:

- two reviews;
- third only on disagreement.

Narrative:

- three reviews from start.

Acceptance:

- prior ratings hidden until own submission locks;
- exactly one third assignment under concurrency;
- narrative cannot finalize with fewer than three.

### Days 7–8 — Eligibility and Pending

Implement:

- `qualifies`;
- `does_not_currently_qualify`;
- explicit pending reason states;
- majority aggregation;
- no-majority handling.

Acceptance:

- Track B invitation and reviewer majority both required;
- invalid/uninterpretable evidence never produces negative result;
- pending has reason, owner, deadline, and route;
- no timeout-to-rejection.

### Day 8 — Immutable Decisions

Store:

- policy bundle;
- exact input versions;
- code version;
- outcome;
- ordered reasons;
- immutable rule trace and message-catalog version;
- canonical profile/bytes and code/environment manifests;
- decision-root commitment;
- notice delivery status;
- result hash;
- supersession.

Acceptance:

- no application-role update/delete;
- identical replay;
- missing artifact/disposed input refuses exact replay;
- corrections create successor run.
- every public explanation clause maps to a trace step/event;
- explanation/correction history cannot affect eligibility.

### Days 9–10 — Fixtures and Test Suite

Cover:

- Track A boundaries;
- Track B invitations;
- artifact/narrative review patterns;
- pending, explanations, and corrections;
- prohibited-field mutations;
- consent/accessibility invariance;
- service-key and synthetic-only startup tests;
- replay;
- concurrency;
- RLS.

Acceptance:

- fresh reset and all tests pass;
- one fixture per PRD backend acceptance check;
- no fixture labeled real GT policy.

### Day 10 — Frontend Handoff

Provide Tiffany:

- generated database types;
- stable API examples;
- reason-code/message catalog;
- synthetic test-case manifest.

Frontend uses API/RPCs only, not internal tables/server modules.

## Ownership Boundaries

Aadi:

- `supabase/**`
- `src/server/admissions/**`
- `tests/backend/**`
- backend contracts and reason codes
- agreed admissions API subtree

Tiffany:

- applicant UI/pages/components;
- accessibility/copy;
- application-field contract;
- presentation fixtures.

Shared:

- package/lockfile/root config: one editor per merge window;
- contracts first, backend second, frontend third;
- daily integration only.

## Follow-up work — AWS platform migration (D-012)

The documents now describe the AWS target; the **functional code migration** is not yet done. Tracked items:

- Replace `@supabase/ssr` / `@supabase/supabase-js` with a request-scoped `pg` (node-postgres) client via RDS Proxy (one transaction per request), connecting as the non-`BYPASSRLS` `authenticated` role.
- Replace Supabase Auth with Amazon Cognito: verify the JWT server-side (signature/issuer/audience/expiry against the user-pool JWKS), seed `custom:user_role` via a pre-token-generation trigger, and `SET LOCAL app.user_id`/`app.user_role` per request so RLS predicates read `current_setting(...)`.
- **Caveat — `getUser()` revocation semantics:** Supabase `getUser()` did a live server-side revocation check; the AWS equivalent needs an explicit Cognito admin lookup / token-revocation-state check on sensitive operations (not a free binding swap).
- **Caveat — RDS Proxy connection pinning:** GUC-based principal binding only holds within a transaction; ensure a pooled/multiplexed connection never carries `app.user_id`/`app.user_role` across requests (reset per transaction).
- Move object storage to Amazon S3 (private buckets, pre-signed URLs); replace the Supabase Storage path.
- Replace the Supabase CLI dev loop (`db:start/reset/lint/test/types`) with the Aurora dev-DB equivalents; keep pgTAP.
- Add Terraform for Aurora Serverless v2, Cognito, S3, ECS Fargate, RDS Proxy, Secrets Manager, and CloudFront.
- Re-scope the fail-closed guard (`LC-01`) from loopback-only to "designated dev AWS account + synthetic resource tags."
- Rename directories to the AWS layout (`lib/db/`, `lib/auth/`, `db/`, `infra/terraform/`).

## Explicitly Deferred

- Allocation/aid/lottery/waitlist
- Causal/RD/ANCOVA/CATE
- Evaluator exports/DP
- Outcome/fidelity/cost tables
- Live uploads/data
- Production deployment
- ML scoring
- Production retention/legal-consent management
- Field-purpose registry and retention/disposition engine
- Full rubric appeal/remand and re-entry workflow
- Evaluator/privacy release infrastructure
