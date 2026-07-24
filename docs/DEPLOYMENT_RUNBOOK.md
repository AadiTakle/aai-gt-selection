# Deployment runbook — GT admissions family portal

This is the operational guide for taking the Next.js family portal live on the
**D-012** target (Amazon ECS Fargate + CloudFront + ALB) with **Supabase Cloud**
as the interim data/auth backend.

> **Governance note (D-012).** The ratified end-state rebinds data access to
> `pg`/Aurora and auth to Cognito. Running on **Supabase Cloud** is an
> **interim divergence** to get a working hosted deploy sooner; it is logged in
> `docs/governance/DECISION_LOG.md`. The app's fail-closed guards stay on by
> default — hosted mode is opt-in via `GT_DEPLOY_MODE=hosted` and must only be
> set in a real host's environment, never committed.

---

## 0. What "hosted mode" changes

Setting `GT_DEPLOY_MODE=hosted` in the runtime environment:
- allows an **https** `NEXT_PUBLIC_SUPABASE_URL` (cloud) instead of loopback;
- widens the CSP `connect-src` to the Supabase origin (auth + RPC + realtime);
- leaves every other guard intact — **service-role keys are still forbidden**
  in the app runtime (`assertNoElevatedRuntimeKeys`), and the local synthetic
  adapter path still refuses anything but loopback:65421.

Unset / any other value = the current local synthetic behavior (fail-closed).

---

## 1. Provision Supabase Cloud

1. Create a project at supabase.com. Note the **Project URL**
   (`https://<ref>.supabase.co`) and the **publishable (anon) key**.
2. Push the schema and policies (from repo root):
   ```bash
   supabase link --project-ref <ref>
   supabase db push            # applies supabase/migrations/*
   ```
3. Seed roles. The local `pnpm db:users` script is **loopback-only by design**;
   for cloud, create the operator/reviewer/family users in the Supabase
   dashboard (Authentication → Users) and set each user's
   `app_metadata.user_role` (and `app_metadata.synthetic_only` while data is
   still synthetic). Roles: see `packages/contracts/src/roles.ts`.
4. Configure Auth → URL settings:
   - **Site URL**: your deployed origin (e.g. `https://apply.gt.school`).
   - **Redirect URLs**: add `<origin>/auth/callback` (magic-link/PKCE return).
5. For magic links in production, configure SMTP under Auth → Email (local dev
   captures mail in Inbucket; cloud needs a real sender).

## 2. Build & push the image

```bash
# from repo root
docker build -f apps/web/Dockerfile -t gt-web .
# tag + push to your registry (ECR shown; the CI job automates this)
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
docker tag gt-web:latest <acct>.dkr.ecr.<region>.amazonaws.com/gt-web:latest
docker push <acct>.dkr.ecr.<region>.amazonaws.com/gt-web:latest
```

## 3. Runtime environment (host / task definition)

Set these on the ECS task (or any host). **Never** put a service-role/secret key
in a `NEXT_PUBLIC_*` var or in the app runtime at all.

| Variable | Value |
|---|---|
| `GT_DEPLOY_MODE` | `hosted` |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the anon/publishable key |
| `NEXT_PUBLIC_GT_RETURN_URL` | your GT marketing origin |
| `PORT` / `HOSTNAME` | `3000` / `0.0.0.0` (Dockerfile defaults) |

Do **not** set `GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED` in hosted mode.

## 4. Infrastructure (Terraform, `infra/`)

`infra/` is the reviewed skeleton for the ECS/ALB/CloudFront/Aurora/Cognito
target. Before `terraform apply` can succeed a real operator must supply: a state
backend (S3 + DynamoDB lock), real VPC subnets (the `subnets = []` placeholders),
the pushed image URI, ACM cert + DNS, and Secrets Manager entries. Until then:
```bash
cd infra && terraform init -backend=false && terraform validate
```

## 5. Deploy via CI

`.github/workflows/deploy.yml` builds the image, pushes to ECR, and forces a new
ECS deployment — but only when the required repo secrets exist
(`AWS_DEPLOY_ROLE_ARN`, `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE`,
`AWS_REGION`). With no secrets configured the job **no-ops** (it will not fail the
pipeline), so the deploy path is present but dormant until a real account is
wired. Trigger it manually from the Actions tab (`workflow_dispatch`) once
secrets are set.

## 6. Smoke-check after deploy

- `GET /api/health` → 200
- `/login` renders; sign in with a seeded user → lands on the role's home
- magic link email arrives and `/auth/callback` completes the session
- `GET /api/session` returns `{ authenticated: true, userRole }`

## Rollback

Re-deploy the previous image tag (ECS keeps prior task definition revisions), or
revert `GT_DEPLOY_MODE` to unset to force the app back to fail-closed local mode.
