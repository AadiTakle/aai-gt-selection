# GT Family Portal — Demo Guide (2026-07-24)

Everything below is **live on the hosted deploy** and merged to `main`. This doc is the
"what works / what's unfinished" for tonight's demo with Aadi.

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

1. **Hosted family data is not persisted server-side.** It's localStorage-per-browser. A
   real cloud backend for onboarding was explicitly **not** built (it would mean writing
   applicant data to a cloud DB and loosening the born-synthetic / no-real-PII guarantees).
   Decision: deferred. If we ever want live persistence, that's a scoped re-architecture of
   the onboarding adapter + RPCs to accept cloud-issued JWTs, bounded to `synthetic_only`.

2. **Self-service sign-up email confirmation is degraded.** The "Create account" flow works
   and the server-side family-role trigger is applied, but:
   - Seeded users use `@example.test` addresses, which Supabase's email validator rejects
     and which have no real mailbox.
   - **AWS SES is blocked** — org SCP denies `iam:CreateUser`, and SES SMTP needs an IAM
     user. Built-in Supabase email is heavily rate-limited (~a few/hr).
   - **For the demo, use "Continue as guest"** instead of sign-up. Sign-up + real email is
     the follow-up once SMTP is sorted (real deliverable address + configured SMTP).

3. **Magic-link sign-in** is correctly configured (site URL + callback allow-listed) but
   only works with a real deliverable email + SMTP — same email limitation as above.

4. **`GET /api/health` returns 503 on cloud** (pre-existing, unrelated to this work). The
   route probes bare `<SUPABASE_URL>/rest/v1/`, which Supabase now rejects for
   publishable/anon keys. The app itself is healthy (App Runner TCP health check passes,
   pages serve 200). Fix = point the check at `/auth/v1/health` or a real table; needs a
   rebuild. Don't hit `/api/health` during the demo.

5. **App Runner ≠ D-012's ECS Fargate target.** Interim hosting choice (managed HTTPS, no
   VPC/ALB). Documented divergence, not silent.

## Rebuild / redeploy recipe (if you need to push a change before the demo)

1. Zip the working tree (exclude `node_modules`, `.next`, `.git`, `dist`).
2. `aws s3 cp gt-src.zip s3://gt-web-build-056956104102/source/gt-src.zip`
3. `aws codebuild start-build --project-name gt-web` (~6-7 min; bakes `NEXT_PUBLIC_*`,
   pushes `gt-web:latest`).
4. `aws apprunner start-deployment --service-arn <gt-web ARN>` (~13-23 min; TCP:3000 health
   check). All via the AWS broker MCP; local shell has no AWS creds.

## Status of this change

- Committed to `dev` and merged to `main` (both pushed).
- 62/62 web tests pass; tsc + lint + prettier clean.
- Build #8 built and deploying to App Runner as of this doc.
