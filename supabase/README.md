# Local Supabase boundary (migrating to AWS — D-012)

> **Platform note (D-012):** The project's target platform is AWS with PostgreSQL retained
> (Aurora/Cognito/S3/RDS Proxy/Secrets Manager; see `docs/DECISION_LOG.md` D-012 and
> `docs/ARCHITECTURE_PLAN.md`). This directory and the `db:*` commands still describe the
> **current** local Supabase dev boundary used until the functional code migration lands; the
> SQL migrations here (schemas, RLS, definer RPCs) are standard PostgreSQL and carry over to
> Aurora unchanged. Target layout after migration: `db/` (migrations, pgTAP) and
> `infra/terraform/`.

This directory contains the local-only Supabase project boundary.

The bootstrap migration creates only private `app` and exposed `api` schemas, non-bypass owner
roles, and pgTAP. It intentionally creates no admissions entities, policies, allocation,
evaluation, finance, or real-data structures.

Use the root `db:*` commands for start/reset/lint/test/type generation. Do not link this
repository to a hosted Supabase project or place production credentials here.
