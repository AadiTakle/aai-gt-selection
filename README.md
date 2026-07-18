# GT Selection Capstone

Synthetic, critic-ready prototype for a GT School admissions pathway that preserves Track A,
adds a structured Track B eligibility route, and keeps future allocation/evaluation separate.

## Repository status

The monorepo scaffold is being introduced in two phases:

1. **Phase A:** reproducible root tooling and empty package shells.
2. **Phase B:** Next.js, shared contracts, local Supabase, and test internals after the
   architecture plan is accepted.

No live child data, hosted Supabase project, production credentials, allocation system, or
causal-analysis service is authorized.

## Prerequisites

- Node.js 24 LTS (`.nvmrc`)
- pnpm 10 (pinned through `packageManager`)
- Docker Desktop (required for local Supabase in Phase B)
- Git

## Workspace

```text
apps/web                         @gt-selection/web
packages/contracts               @gt-selection/contracts
packages/db-types                @gt-selection/db-types
packages/test-fixtures           @gt-selection/test-fixtures
supabase/                        local Supabase boundary
```

The package shells are provisional until `feat/architecture-plan` is reviewed. Package names
and root workspace files are owned by `feat/monorepo-scaffold` during that review window.

## Ownership and merge coordination

- Scaffold branch owns root package/config files, `pnpm-lock.yaml`, and package-shell
  `package.json` files.
- Architecture branch owns `docs/architecture/**`, ADRs, diagrams, and data-flow documents.
- One contributor owns root dependency changes and the lockfile per merge window.
- Architecture merges to `dev` before Phase B fills package internals.
- All work follows `feat/* -> dev -> staging -> main`; see `AGENTS.md`.

## Phase A commands

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Database scripts are intentionally added only when Supabase is initialized in Phase B; the
scaffold does not provide no-op commands that could be mistaken for successful database checks.

## CI/CD

`.github/workflows/ci.yml` runs the architecture-neutral monorepo checks for pull requests into
`dev`, `staging`, or `main`, and for pushes to those branches. It uses path filters so
documentation-only work does not start the application pipeline.

Current CI:

- frozen pnpm install with Node 24 and pnpm 10;
- formatting;
- lint;
- TypeScript configuration/workspace typechecks;
- workspace tests; and
- workspace builds.

After Phase B initializes the app and local database, CI expands with:

- local Supabase start/reset/lint and pgTAP;
- generated API-type drift checks;
- Vitest coverage;
- Playwright smoke testing;
- elevated-key/client-bundle scanning; and
- build artifacts for `staging` and `main`.

The repository has no authorized production deployment target. Until that changes through a
governance decision, CD means validated promotion through `feat/* -> dev -> staging -> main`;
it does not deploy live infrastructure. Configure branch protection in GitHub so the CI check
and review are required before each promotion.

## Canonical project guidance

Read `AGENTS.md`, `PROJECT_CHARTER.md`, the project requirements, development rubric,
traceability matrix, evidence register, and decision log before changing product behavior.
