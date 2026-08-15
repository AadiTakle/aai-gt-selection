# CogAT prep site — pointer

**Deployed:** <https://scunwsuf4i.us-east-1.awsapprunner.com/about-the-test>

**Source:** `apps/web` of the `feat/cogat-prep-pivot` branch, checked out at
`/Users/atakle/gt-prep-demo` (detached at `247bac9`). It is a separate branch rather than a folder
here, which is why this is a pointer.

`dev` has moved 105 commits past their common ancestor, so bringing this forward is a merge, not a
copy.

## What is deployed

A container image on App Runner: service `gt-cogat-prep-2`, image
`056956104102.dkr.ecr.us-east-1.amazonaws.com/gt-cogat-prep:bind-fix`, 1 vCPU / 2 GB.

Only the public routes work. `/about-the-test` and `/` return 200; `/family/assessment` redirects to
login and `/api/health` returns 503, because Supabase is a placeholder. That is deliberate and
sufficient: the app's own env file records that the walkthrough "renders no child data and touches no
database", and the Supabase values exist only so the client can be constructed instead of throwing.
The service therefore uses a **TCP** health check rather than the image's HTTP one.

**It bills while it runs.** Unlike the S3 + CloudFront demos, App Runner charges for a provisioned
instance continuously. Pause the service when it is not being shown.

## Two things that cost time, so they are written down

- App Runner is **x86_64 only**. An arm64 image builds fine and then fails to deploy.
- App Runner injects `HOSTNAME`, overriding the Dockerfile's `ENV HOSTNAME=0.0.0.0`. Next then binds
  to that one name, the health check cannot reach it, and the deploy fails after twenty minutes while
  the application log shows a clean `✓ Ready in 0ms`. The `bind-fix` image layers a single line on
  top of the app image to force the bind at exec time.

## Rebuilding

```bash
cd /Users/atakle/gt-prep-demo
docker build --platform linux/amd64 -f apps/web/Dockerfile \
  -t 056956104102.dkr.ecr.us-east-1.amazonaws.com/gt-cogat-prep:latest \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://placeholder-synthetic.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_hosteddemo_000000000000000000 \
  --build-arg NEXT_PUBLIC_GT_RETURN_URL=https://example.invalid .
```
