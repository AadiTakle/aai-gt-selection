# GT Selection Capstone

Synthetic, critic-ready prototype for a GT School admissions pathway. It preserves the existing
application route (Track A), adds a structured eligibility route (Track B), and builds a custom
**adaptive screening exam** that estimates a child's reasoning level and how quickly they learn —
while keeping future allocation and program-impact evaluation strictly separate.

All results are a screening signal only (`validated=false`), never an admission decision, and no
claim of program impact is made anywhere in the product.

> **Platform: AWS with PostgreSQL (D-012).** The target platform is AWS managed services —
> Amazon Aurora Serverless v2 (PostgreSQL), Amazon Cognito, Amazon S3, ECS Fargate, RDS Proxy,
> and Secrets Manager, provisioned with Terraform (`infra/`) — keeping PostgreSQL as the database
> engine (see `docs/governance/DECISION_LOG.md` D-012, which supersedes the prior Supabase choice
> in D-009, and `docs/architecture/ARCHITECTURE_PLAN.md`). A standalone scoring function on AWS
> Lambda is a tracked requirement (D-019). The **functional code migration** from the current
> Supabase dev stack to the AWS bindings is a tracked follow-up; the `supabase/` layout and
> `pnpm db:*` commands documented below still describe how the prototype runs **today**, until
> that migration lands.

## What's in here

Two product thrusts share one monorepo:

1. **Admissions & onboarding** — a family application wizard, dashboard, and reviewer/admissions
   surfaces (`apps/web`), with server-authoritative persistence and role boundaries against a
   synthetic Supabase backend.
2. **Adaptive screening exam** — a two-phase, variable-length reasoning test:
   - **Phase 1 (standing level):** per-reasoning-area two-sided bracketing that homes in on the
     child's level and stops when each area settles (`packages/exam-engine`).
   - **Phase 2 (learning rate):** a separate, stage-marked block of novel items in one area,
     scored by a MAP learning-curve estimator that reports an ordinal band — or `indeterminate`
     when the data cannot support a claim (`packages/exam-scoring`).

   Correctness is decided server-side (answer keys never reach the browser), and a session's score
   is recomputed from the database-verified trace so it is reproducible.

## Repository status

Synthetic prototype only. No live child data, production AWS account (or hosted Supabase project),
production credentials, allocation system, or causal-analysis service is authorized. Development
uses a dedicated dev AWS account and a local Supabase stack, with synthetic data only.

## Prerequisites

- Node.js 24 LTS (`.nvmrc`)
- pnpm 10 (pinned through `packageManager`)
- Docker Desktop or Colima (required for local Supabase, pgTAP, and Playwright)
- Git

## Workspace

```text
apps/web                         @gt-selection/web         Next.js app (family, review, admissions, exam)
packages/contracts               @gt-selection/contracts   Framework-neutral Zod schemas + types
packages/db-types                @gt-selection/db-types     Generated + hand-written database types
packages/test-fixtures           @gt-selection/test-fixtures  Shared synthetic fixtures
packages/exam-engine             @gt-selection/exam-engine  Adaptive selection, session state, Phase 1 + novel block
packages/exam-scoring            @gt-selection/exam-scoring  Ability estimate, derived metrics, learning-rate readout
supabase/                        local Supabase boundary (schema, RLS, pgTAP)
infra/                           Terraform for the AWS target
scripts/                         local tooling, demos, and research harnesses
docs/                            architecture, governance, research, and audit records
brainlifting/                    standalone BrainLift thinking documents (independent of the codebase)
research/                        item-bank and question-type research inputs
```

The accepted architecture is documented in `docs/architecture/ARCHITECTURE_PLAN.md`.
Framework-independent contracts and fixtures stay outside the Next.js package; app-only clients and
wrappers stay inside `apps/web`. Per-package READMEs describe each package in more detail.

## Ownership and merge coordination

- One contributor owns root dependency changes and the lockfile per merge window.
- `docs/architecture/**`, ADRs, diagrams, and data-flow documents are owned by architecture work.
- All work follows `feat/* -> dev -> staging -> main`; see `AGENTS.md`. Never commit directly to
  `main`, `staging`, or `dev` outside of merging a completed `feat/*` branch.

## Local commands

```bash
pnpm install
pnpm db:start          # start local Supabase (Docker)
pnpm db:reset          # apply migrations + seed
pnpm db:users          # create synthetic login-capable users
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test              # or: pnpm test:coverage
pnpm db:lint
pnpm db:test           # pgTAP
pnpm db:types:check    # generated API-type drift
pnpm build
pnpm security:scan     # elevated-key / public-env boundary scan
pnpm boundaries:check  # workspace dependency direction
pnpm --filter @gt-selection/web test:e2e   # Playwright (needs local Supabase)
pnpm db:stop
```

`pnpm db:users` reads local setup values directly from the running Supabase CLI. It creates only
fictional login-capable users and refuses non-loopback Supabase URLs.

Local Supabase runs on its own port, so it is a different origin from the dev server as far as the
browser is concerned. The app's Content-Security-Policy therefore names the configured Supabase
origin in `connect-src` (derived from `NEXT_PUBLIC_SUPABASE_URL`, so any port works) — without it
the browser blocks every sign-in request before it is sent. If sign-in fails locally with
"Guest access is unavailable right now" while a server-side `curl` password grant against the same
project returns 200, check the CSP header rather than the auth layer: that combination means the
request never left the browser. See `apps/web/src/lib/csp.ts`.

Use `pnpm verify` for the complete local sequence. It starts and resets Supabase, executes all
workspace/database/security/E2E checks, and stops the local project without preserving data.

Exam demos (no Docker required):

```bash
pnpm exam:phase1-demo  # standing-level bracketing, per area
pnpm exam:phase2-demo  # novel learning block + honest learning-rate readout
```

## CI/CD

`.github/workflows/ci.yml` runs the monorepo checks for pull requests into `dev`, `staging`, or
`main`, and for pushes to those branches. It uses path filters so documentation-only work does not
start the application pipeline.

CI is split into merge-blocking jobs:

- **Workspace quality:** frozen install, format, lint, typecheck, coverage, dependency direction,
  and build. Each check runs even if an earlier one fails, so a single run reports every problem
  rather than stopping at the first gate.
- **Database:** local Supabase start/reset/lint, pgTAP, and generated API-type drift.
- **Web smoke/security:** synthetic Auth users, authenticated integration tests, Next.js build,
  elevated-key scan, and Playwright.
- **Promotion artifact:** lockfile/checksum/build metadata on pushes to `staging` and `main`.

The repository has no authorized production deployment target. Until that changes through a
governance decision, CD means validated promotion through `feat/* -> dev -> staging -> main`;
it does not deploy live infrastructure. Configure branch protection in GitHub so the CI check
and review are required before each promotion.

## Canonical project guidance

Read `AGENTS.md`, `PROJECT_CHARTER.md`, the project requirements, development rubric,
traceability matrix, evidence register, and decision log before changing product behavior.
BrainLifts in `brainlifting/` are standalone thinking documents and deliberately do not reference
the codebase or governance.
