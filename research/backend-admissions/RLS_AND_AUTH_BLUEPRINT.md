# Supabase Auth, RLS, and RPC Blueprint

## Status

Provisional technical blueprint for the local synthetic prototype. It does not
authorize scaffolding before Day-0 ratification and is not production security
certification.

## Principal Model

Human JWTs keep the top-level PostgreSQL role:

```text
role = authenticated
```

Business authorization uses a separate admin-controlled claim:

```text
user_role =
  family |
  admissions_operator |
  reviewer |
  review_supervisor |
  decision_service |
  auditor |
  privacy_steward
```

Rules:

- Identity is always `auth.uid()`.
- Never authorize from `user_metadata`/`raw_user_meta_data`; users can edit it.
- Seed `app_metadata.user_role` only through local Auth Admin.
- A custom access-token hook may copy the coarse role into `user_role`.
- Role claims contain no scores, access needs, applicant data, or permission
  arrays.
- Role changes require token refresh/re-authentication; stale-token behavior is
  explicitly tested.
- `policy_admin` has no runtime API in v1 because policy is migration-seeded.

## Next.js Auth Boundary

- Use request-scoped `@supabase/ssr` clients.
- Use `getClaims()` for server-side claim verification.
- Use `getUser()` when a sensitive operation requires current server-side
  account status/revocation confirmation.
- Never authorize from `getSession()` or decoded cookie contents alone.
- Do not cache authenticated pages with ISR.
- Propagate required cookie/cache headers when refreshing tokens.
- Pin `@supabase/ssr`; it remains version-sensitive/beta.

## Schema and Ownership

Only `api` is exposed through PostgREST.

```sql
create schema app;
create schema api;
```

Owners:

- `app_owner`: owns tables; `NOLOGIN`, `NOBYPASSRLS`, not superuser.
- `api_executor`: owns necessary definer RPCs; `NOLOGIN`, `NOBYPASSRLS`,
  narrowly granted.

Runtime human requests use PostgreSQL `authenticated`.

For every private table:

```sql
alter table app.<table> enable row level security;
alter table app.<table> force row level security;

revoke all on app.<table>
from public, anon, authenticated, service_role;
```

Do not grant `TRUNCATE` or `REFERENCES`.

## Role Helper

```sql
app.current_user_role() =
  auth.jwt() ->> 'user_role'
```

If the claim is nested under `app_metadata`, use one versioned helper and test
the exact shape. Request payloads can never supply actor ID or effective role.

## Ownership and Assignment Predicates

```text
OWNS(application_id):
  application.owner_user_id = auth.uid()
  AND application.synthetic_only

ASSIGNED(review_case_id):
  active assignment reviewer_user_id = auth.uid()
  AND assignment role matches current_user_role()
```

Every RPC verifies:

1. signed claim role;
2. `auth.uid()` exists;
3. ownership/assignment;
4. expected workflow version;
5. synthetic-only context; and
6. idempotency.

Wrong-owner resources return the same not-found response as absent resources.

## Table Access Matrix

### Family

- Own application/version and Snapshot through RPCs.
- Own status/explanation/correction projection through read RPCs.
- No direct private-table access.
- No raw assessment scores, reviewer identities/votes, applicant context, or
  audit log.

### Admissions operator

- Record assessment/version.
- Execute routing and deterministic assignment orchestration.
- Apply factual/procedural correction.
- No applicant context.
- No raw peer review submissions outside controlled aggregation.

### Reviewer

- Assigned fixture/rubric projection.
- Own assignment and locked submission only.
- No peer votes before or after submission.
- No applicant identity/context, policy thresholds, or unrelated cases.

### Review supervisor

- Active assigned slot-3 case only.
- No slot-1/2 votes or reviewer identities.

### Decision service

- Execute deterministic finalization/replay through a non-bypass principal.
- No applicant context.

### Auditor

- Trace/replay projection.
- No input mutation.

### Privacy steward

- Coded applicant-context sentinel only through a future/private setup path.
- No eligibility mutation or replay privilege.

## RPC Security Pattern

Default to `SECURITY INVOKER` when possible. A v1 RPC that must write private
tables without direct authenticated table grants may use `SECURITY DEFINER`
only when:

- owner is dedicated `api_executor`, not table owner/superuser;
- owner is `NOBYPASSRLS`;
- `search_path=''` or `pg_catalog` only;
- every object is schema-qualified;
- `PUBLIC`, `anon`, `authenticated`, and `service_role` execution is revoked by
  default;
- execution is then granted to `authenticated`;
- function internally checks `user_role`, `auth.uid()`, ownership/assignment,
  expected version, and synthetic context; and
- unknown JSON keys are rejected.

Template:

```sql
create function api.submit_review(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform app.require_user_role(array['reviewer','review_supervisor']);
  perform app.reject_unknown_keys(p_request, ...);
  perform app.require_synthetic_context();
  -- lock assignment/case, verify auth.uid(), transition atomically
end;
$$;

revoke all on function api.submit_review(jsonb)
from public, anon, authenticated, service_role;
grant execute on function api.submit_review(jsonb) to authenticated;
```

## Read API

Use three hardened read RPCs instead of owner-rights views:

- `api.get_application_status`
- `api.get_assigned_review_case`
- `api.get_decision_explanation`

If a view is introduced, it must use `security_invoker=true`, receive only
explicit column grants, and pass forbidden-row/column tests.

## Peer-Vote Blindness

- Reviewer read RPC never joins peer submissions.
- Submission policy/function exposes only own assignment.
- Blindness persists after own submission.
- Supervisor sees no prior vote.
- Aggregation occurs inside a private routine.
- Reviewer response says only `accepted`.
- Family status does not reveal disagreement direction or vote count.
- Unique active `(case, slot)` plus case locking permits exactly one slot 3.
- Abstention is not a vote and creates one replacement attempt.

## Idempotency

Persist only:

- actor ID;
- RPC name;
- idempotency key;
- request hash;
- result reference.

Unique:

```text
(actor_id, rpc_name, idempotency_key)
```

Same key/hash returns the original result. Same key/different hash returns
`IDEMPOTENCY_KEY_REUSED`. Never store raw request/response payloads in audit.

## Concurrency

- Put each multi-row transition in one RPC transaction.
- Lock rows in a fixed order.
- Use database unique constraints as the final race guard.
- Use serializable isolation for assignment/finalization invariants only.
- Retry the complete transaction on SQLSTATE `40001`.
- Keep the same idempotency key across retries.

## Service/Secret Key Boundary

Modern secret keys and legacy `service_role` keys bypass RLS.

- Local seed/reset setup only.
- Never ordinary Next.js request handlers or decision execution.
- Never `NEXT_PUBLIC_*`, browser bundle, logs, screenshots, or test fixtures.
- Runtime construction of an elevated client fails the critical test.

RLS cannot make a service-role request safe; the control is architectural
exclusion.

## Test Strategy

### pgTAP

- RLS enabled/forced on every private table
- owner/runtime roles are non-bypass
- grant/default-privilege catalog assertions
- RPC owner/search-path/execute-grant assertions
- ownership/assignment allow-deny behavior
- immutability/unique constraints
- synthetic-only checks

### Direct Auth/PostgREST integration

- Create login-capable local users through Auth Admin.
- Sign in through publishable client.
- Verify issued `user_role`.
- Call read/mutation RPCs with real JWTs.
- Test stale role after role change and refresh.
- Test forged/expired/wrong-audience tokens.
- Run concurrency/idempotency tests.

Direct SQL-seeded `auth.users` rows are acceptable foreign-key placeholders but
cannot prove sign-in behavior.

## Merge-Blocking Security Gates

1. `AUTH-01`: Editing `user_metadata.role` changes no authorization.
2. `AUTH-02`: Forged/expired/wrong-issuer/audience/unsigned tokens fail.
3. `IDOR-01`: Every RPC rejects cross-owner/assignment IDs without leakage.
4. `GRANT-01`: No unexpected object/default privileges.
5. `DEF-01`: Every definer RPC has safe owner, fixed search path, and allowlisted
   execution.
6. `READ-01`: Read RPCs expose no forbidden row/column.
7. `RLS-01`: Actual JWT role × object × operation × ownership matrix passes.
8. `SR-01/02`: No elevated key in source/env/log/build; runtime construction
   fails.
9. `CC-02+`: Parallel vote/abstention/replacement/finalization produces one
   valid transition.
10. `NEW-OBJECT`: Any new table/view/function without declared RLS/grant/definer
    classification fails CI.

## Official Sources

- Supabase SSR:
  https://supabase.com/docs/guides/auth/server-side
- Supabase RBAC/custom claims:
  https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac
- Supabase Auth hooks:
  https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- Supabase RLS:
  https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API keys:
  https://supabase.com/docs/guides/getting-started/api-keys
- Supabase local testing:
  https://supabase.com/docs/guides/local-development/testing/overview
- PostgreSQL row security:
  https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL function security:
  https://www.postgresql.org/docs/current/sql-createfunction.html
- PostgreSQL serialization:
  https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html
- PostgREST transactions:
  https://docs.postgrest.org/en/stable/references/transactions.html
