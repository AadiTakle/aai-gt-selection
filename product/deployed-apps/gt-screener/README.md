# GT screener (example assessment) — pointer

**Source:** `archive/apps/web` in this repository. A Next.js workspace package; moving it here would
break its build paths and workspace membership, so only this pointer lives in `demo/`.

**Deployed:** <https://kt49a2xvq5.us-east-1.awsapprunner.com/demo/exam?telemetry=1>

## What it runs, and what it does not

It is registered on the platform — app `app-b157b58d-32ec-4349-81e5-3036f981bb4f`, approved for all
36 servable types, which is every type it can draw (it ships 52 HTML demo renderers, and all 36 are
among them). What is missing is the wiring.

The app carries its own complete adaptive engine: `exam-runner.tsx` is 1,504 lines that load banks
locally, select the next item with their own estimator, mark through `/api/exam-submit`, and derive
the debug panel from their own trace. Deploying it as it stands would ship a screener that ignores
the deployed library, which is the opposite of the point. The agreed approach is a platform mode
alongside the local engine — a flag that swaps item source, marking and the debug panel to the
platform while leaving the working local path intact and comparable.

## Running it locally

```bash
cd archive/apps/web && npx next dev --hostname 127.0.0.1 -p 3100
```

Then <http://127.0.0.1:3100/dev/family-preview/exam?telemetry=1>. Use the `dev/family-preview` route:
the real `/family/exam` redirects to login, and the preview route 404s in a production build.
`?telemetry=1` opens the debug dock — ability estimate with a plausible range, per-domain bands, and
the per-item aimed/served/move table. `http://127.0.0.1:3100` is already in the API's CORS
allow-list for when the wiring lands.

## When it is deployed

It has a Dockerfile and `output: 'standalone'`, so it takes the same route the CogAT prep site took:
build for **linux/amd64** (App Runner is x86_64 only), push to ECR, run on App Runner with the
`gt-web-apprunner-ecr-access` role. Set `HOSTNAME=0.0.0.0` in the runtime environment — App Runner
injects its own `HOSTNAME`, which overrides the Dockerfile's and makes Next bind to a single name the
health check cannot reach.
