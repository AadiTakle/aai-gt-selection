# Infrastructure skeleton (Amazon ECS Fargate target — D-012)

This directory is a **non-functional Terraform skeleton** describing the approved
Milestone B deployment target from decision **D-012**: the Next.js family portal
running as a container on **Amazon ECS Fargate**, fronted by **CloudFront + ALB**,
with **Aurora Serverless v2 (PostgreSQL)** and **Amazon Cognito**.

It is intentionally **not wired to a live AWS account**. There is no state backend,
no credentials, and no `terraform apply` is expected to succeed as-is. Its purpose
is to make the target architecture concrete and reviewable alongside the app, and
to give the container image (`apps/web/Dockerfile`) a documented home.

## What is here now
- `main.tf` — providers + a guard that this is a skeleton.
- `variables.tf` / `outputs.tf` — the inputs/outputs a real deployment would need.
- `network.tf` — VPC, ALB, target group, security groups (placeholders).
- `ecs.tf` — Fargate cluster, task definition (references the built image), service.
- `cloudfront.tf` — distribution in front of the ALB.
- `aurora.tf` — Aurora PostgreSQL cluster placeholder.
- `cognito.tf` — Cognito user pool placeholder (the JWT `custom:user_role` claim).

You can `terraform init -backend=false` + `terraform validate` to parse it.

## Deferred — governance follow-ups before any real deploy (do NOT skip)
These are tracked under **D-012** and are **out of scope** for the current MVP UI work:

1. **Relax the fail-closed env guards.** *(Partially addressed — hosted mode
   added; see below.)* `apps/web/src/lib/env.ts` rejects any non-loopback
   Supabase URL by default. An explicit **`GT_DEPLOY_MODE=hosted`** now opts into
   an https cloud Supabase target, while the default and the local synthetic
   adapter path stay fail-closed and service-role keys remain forbidden in
   runtime. (CSP `connect-src` names the configured Supabase origin in both
   shapes and is not part of this opt-in.) Enabling hosted mode against a real project
   is still a **D-012-reviewed decision** (logged in the decision log as an
   interim Supabase-Cloud divergence) — see `docs/DEPLOYMENT_RUNBOOK.md`.
2. **Rebind data access** from Supabase (`createSupabaseServerClient` + the RPC
   adapter) to **`pg` via RDS Proxy / Aurora**. Unstarted.
3. **Rebind auth** from Supabase Auth to **Cognito** (`requireRole`,
   `parseUserRoleClaim`, the `app_metadata.synthetic_only` / `user_role` claims).
   Unstarted.
4. **Real hosting concerns:** DNS, TLS/ACM, a Terraform state backend (S3 + DynamoDB
   lock), secrets in Secrets Manager, and a CI deploy job. None exist yet.

Until 1–4 are addressed under governance, the container runs against the local
synthetic stack only.
