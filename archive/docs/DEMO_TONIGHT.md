# GT Family Portal — Demo Guide (2026-07-24)

Everything below is **live on the hosted deploy** and merged to `main`. This doc is the
"what works / what's unfinished" for tonight's demo with Aadi.

> **Update (post-demo prep, branch `local/finish-demo-items` — NOT deployed yet):**
> The unfinished items below have now been *implemented and staged locally*. Nothing has been
> pushed, no cloud DB or Auth config has been changed, and the live site is **unchanged** so
> Aadi's demo is unaffected. The live URL still runs the client-only preview described here.
> See **"Staged fixes (deploy later)"** near the bottom for what changed and the runbook to
> ship it when we're ready.

## Live URL

**https://azkxhfwkvm.us-east-1.awsapprunner.com**

- AWS App Runner (`gt-web`, us-east-1), backed by cloud Supabase.
- Runs in `GT_DEPLOY_MODE=hosted`.

## Demo script (the happy path)

1. Open the live URL → click through to **Sign in** (`/login`).
2. Click **"Continue as guest"** — one click, no email. You land in `/family` as a
   synthetic demo family (real `family` role JWT).
   - _Alternatively:_ email/password sign-in works too (e.g. `family@example.test` /
     `Synthetic-Only-2026!`), as does "New family? Create an account" (see caveats).
3. **Start your application** → fill the wizard (6 sections) → **Sign & submit application**.
   - This now completes cleanly and lands on the **dashboard** (draft → awaiting assessment).
4. From the dashboard → **assessment** → **exam** (adaptive screening portal) → results
   flow back to the dashboard.

That whole family journey works end to end on the live site.

## What's actually happening under the hood (important for Q&A)

The family application flow on the hosted site runs in **client-only demo mode**:

- The real onboarding backend (student profiles, applications, submit) is **deliberately
  locked to a local synthetic Supabase** — an env guard (`apps/web/src/lib/env.ts`) plus a
  DB check (`bind_local_synthetic_principal()` requires a locally-issued JWT). This is a
  **safety design**: it structurally prevents real applicant data from ever being written
  to a cloud database.
- So on `GT_DEPLOY_MODE=hosted`, `(embed)/family/*` renders the existing **client-only
  preview** components (apply wizard, dashboard, exam) — state lives in the browser
  (localStorage); the exam POSTs to an in-memory table. No server actions, no cloud writes.
- **Local dev** (`pnpm dev` against the local Supabase) still uses the **real** synthetic
  backend with full persistence, RPCs, and RLS tests.

Net for the demo: the UI and full flow are real and clickable; on the hosted site the data
just isn't persisted server-side (it's per-browser). That's intended, not a bug.

## Unfinished / known limitations (put here on purpose)

1. **Hosted family data is not persisted server-side.** _(Fixed locally — pending deploy.)_
   On the live site today it's still localStorage-per-browser. The real cloud-persistence path
   is now built on `local/finish-demo-items`: the env guard accepts hosted mode and the DB
   `bind_local_synthetic_principal()` accepts the cloud Supabase issuer — both still bounded to
   `synthetic_only=true` + a known role, so real (non-synthetic) principals are still rejected.
   Takes effect after the deploy-later runbook (migration apply + rebuild/redeploy).

2. **Self-service sign-up email confirmation is degraded.** The "Create account" flow works
   and the server-side family-role trigger is applied, but:
   - Seeded users use `@example.test` addresses, which Supabase's email validator rejects
     and which have no real mailbox.
   - **AWS SES is blocked** — org SCP denies `iam:CreateUser`, and SES SMTP needs an IAM
     user. Built-in Supabase email is heavily rate-limited (~a few/hr).
   - **For the demo, use "Continue as guest"** instead of sign-up. Sign-up + real email is
     the follow-up once SMTP is sorted (real deliverable address + configured SMTP).
   - _Prep staged:_ `scripts/configure-cloud-auth-email.mjs` (dry-run by default) applies either
     `MODE=autoconfirm` (sign-up with no email round-trip — token only) or `MODE=smtp` (real
     confirmation + magic link — needs SMTP creds from any provider you control). Deferred:
     needs a fresh `sbp_` management token and, for SMTP mode, provider credentials.

3. **Magic-link sign-in** is correctly configured (site URL + callback allow-listed) but
   only works with a real deliverable email + SMTP — same email limitation as above.

4. **`GET /api/health` returns 503 on cloud** _(Fixed locally — pending deploy.)_ The route
   now probes `<SUPABASE_URL>/auth/v1/health` (returns 200 with a plain apikey header) instead
   of bare `/rest/v1/` (which Supabase rejects for publishable/anon keys). Takes effect after a
   rebuild. Until then, don't hit `/api/health` during the demo.

5. **App Runner ≠ D-012's ECS Fargate target.** Interim hosting choice (managed HTTPS, no
   VPC/ALB). Documented divergence, not silent.

## Staged fixes (deploy later) — branch `local/finish-demo-items`

All local, nothing pushed, live site untouched. What changed:

- **`apps/web/src/lib/env.ts`** — `validateLocalSyntheticAdapterEnvironment` now has a hosted
  branch: in `GT_DEPLOY_MODE=hosted` it accepts the cloud https Supabase URL + `NODE_ENV=production`
  while still requiring the synthetic opt-in (`GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED=true`,
  `GT_LOCAL_SYNTHETIC_PROJECT_ID=gt-selection-capstone`) and still banning elevated keys. The
  loopback path is unchanged. +2 unit tests.
- **`supabase/migrations/20260724080000_hosted_synthetic_principal.sql`** — `CREATE OR REPLACE`
  of `app.bind_local_synthetic_principal()` widening the accepted JWT issuer from loopback-only to
  *also* a Supabase-hosted issuer (`https://<ref>.supabase.co/auth/v1`). Function body is otherwise
  byte-identical; `synthetic_only=true` + role checks are unchanged.
- **`apps/web/src/app/(embed)/family/{apply,dashboard}/page.tsx`** — reverted the hosted client-only
  preview branches back to the real backend (`<ApplyWizard />`, `<DashboardLoader />`).
  `.../family/exam/page.tsx` stays `<PreviewExam>` (the exam has no real backend).
- **`apps/web/Dockerfile`** — runner stage now sets `GT_DEPLOY_MODE=hosted` +
  `GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED=true` + `GT_LOCAL_SYNTHETIC_PROJECT_ID=gt-selection-capstone`
  (server-side only; not `NEXT_PUBLIC`) so the deployed image binds the cloud project.
- **`apps/web/src/app/api/health/route.ts`** — probes `/auth/v1/health` (see item #4).
- **`scripts/configure-cloud-auth-email.mjs`** — deferred email config helper (see items #2/#3).

Verified locally: web `tsc`/eslint/prettier clean, **64/64** web tests. The issuer regex was
verified with an accept/reject matrix. **Not** verified: full pgTAP against local Supabase — this
machine has no container runtime (Docker/podman/colima all absent), so the DB stack can't start.
Run `pnpm db:reset && pnpm db:test` once Docker is available, or exercise it during the cloud apply.

### Deploy-later runbook (when we choose to ship — this DOES touch cloud)

1. **Apply the migration to cloud** (the only new DB change):
   `supabase db push` against the cloud project, or run
   `supabase/migrations/20260724080000_hosted_synthetic_principal.sql` via the pooler
   (`create or replace` — safe to re-run; preserves grants).
2. **(Optional) email:** run `scripts/configure-cloud-auth-email.mjs` with a fresh `sbp_` token —
   `MODE=autoconfirm` (token only) or `MODE=smtp` (+ provider creds). Rotate the token after.
3. **Rebuild + redeploy** via the recipe below (the new pages + Dockerfile env are baked at build).
4. **Smoke test:** guest login → apply → **Sign & submit** persists (no "Server Components render"
   error) → dashboard shows the saved status; `GET /api/health` returns 200.

## Rebuild / redeploy recipe (if you need to push a change before the demo)

1. Zip the working tree (exclude `node_modules`, `.next`, `.git`, `dist`).
2. `aws s3 cp gt-src.zip s3://gt-web-build-056956104102/source/gt-src.zip`
3. `aws codebuild start-build --project-name gt-web` (~6-7 min; bakes `NEXT_PUBLIC_*`,
   pushes `gt-web:latest`).
4. `aws apprunner start-deployment --service-arn <gt-web ARN>` (~13-23 min; TCP:3000 health
   check). All via the AWS broker MCP; local shell has no AWS creds.

## Status of this change

- **Demo build:** committed to `dev`, merged to `main`, Build #8 live on App Runner (client-only).
- **Finish-items work:** staged on `local/finish-demo-items` only — **not pushed, not deployed**.
  Live site unchanged. 64/64 web tests; tsc + lint + prettier clean. Ship via the deploy-later
  runbook above when Aadi's demo is done.
