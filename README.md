# GT Selection Capstone

Synthetic, critic-ready prototype for a GT School admissions pathway that preserves Track A,
adds a structured Track B eligibility route, and keeps future allocation/evaluation separate.

## Repository status

The monorepo scaffold was introduced in two phases:

1. **Phase A:** reproducible root tooling and package shells.
2. **Phase B:** architecture-aligned Next.js, shared contracts, local Supabase, tests, and CI
   boundaries.

No live child data, hosted Supabase project, production credentials, allocation system, or
causal-analysis service is authorized.

## Prerequisites

- Node.js 24 LTS (`.nvmrc`)
- pnpm 10 (pinned through `packageManager`)
- Docker Desktop or Colima (required for local Supabase)
- Git

## Workspace

```text
apps/web                         @gt-selection/web
packages/contracts               @gt-selection/contracts
packages/db-types                @gt-selection/db-types
packages/test-fixtures           @gt-selection/test-fixtures
supabase/                        local Supabase boundary
```

The accepted architecture is documented in `docs/ARCHITECTURE_PLAN.md`. Framework-independent
contracts and fixtures remain outside the Next.js package; app-only clients and wrappers stay
inside `apps/web`.

## Ownership and merge coordination

- Scaffold branch owns root package/config files, `pnpm-lock.yaml`, and package-shell
  `package.json` files.
- Architecture branch owns `docs/architecture/**`, ADRs, diagrams, and data-flow documents.
- One contributor owns root dependency changes and the lockfile per merge window.
- Architecture merges to `dev` before Phase B fills package internals.
- All work follows `feat/* -> dev -> staging -> main`; see `AGENTS.md`.

## Local commands

```bash
pnpm install
pnpm db:start
pnpm db:reset
pnpm db:users
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm db:lint
pnpm db:test
pnpm db:types:check
pnpm build
pnpm security:scan
pnpm --filter @gt-selection/web test:e2e
pnpm db:stop
```

`pnpm db:users` reads local setup values directly from the running Supabase CLI. It creates only
fictional login-capable users and refuses non-loopback Supabase URLs.

Use `pnpm verify` for the complete local sequence. It starts and resets Supabase, executes all
workspace/database/security/E2E checks, and stops the local project without preserving data.

## CI/CD

`.github/workflows/ci.yml` runs the architecture-neutral monorepo checks for pull requests into
`dev`, `staging`, or `main`, and for pushes to those branches. It uses path filters so
documentation-only work does not start the application pipeline.

CI is split into merge-blocking jobs:

- **Workspace quality:** frozen install, format, lint, typecheck, coverage, dependency direction,
  and build.
- **Database:** local Supabase start/reset/lint, pgTAP, and generated API-type drift.
- **Web smoke/security:** local synthetic Auth users, Next.js build, elevated-key scan, and
  Playwright.
- **Promotion artifact:** lockfile/checksum/build metadata on pushes to `staging` and `main`.

The repository has no authorized production deployment target. Until that changes through a
governance decision, CD means validated promotion through `feat/* -> dev -> staging -> main`;
it does not deploy live infrastructure. Configure branch protection in GitHub so the CI check
and review are required before each promotion.

## Canonical project guidance

Read `AGENTS.md`, `PROJECT_CHARTER.md`, the project requirements, development rubric,
traceability matrix, evidence register, and decision log before changing product behavior.
