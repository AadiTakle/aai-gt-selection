# @gt-selection/web

Single Next.js App Router application for the synthetic GT admissions architecture shell.

> **Platform note (D-012):** Target platform is AWS (Aurora PostgreSQL, Cognito, S3, ECS
> Fargate; see `docs/ARCHITECTURE_PLAN.md`). The request-scoped Supabase clients described
> below are the **current** bindings; replacing them with `pg`/RDS Proxy + Cognito JWT
> verification (`lib/db/`, `lib/auth/`) is a tracked follow-up.

It contains role-gated placeholder surfaces, request-scoped Supabase clients (current bindings,
migrating to `pg`/RDS Proxy + Cognito per D-012), a synthetic-only environment guard,
health/session routes, component/unit tests, and Playwright smoke tests. It does not contain
admissions workflow or decision logic.
