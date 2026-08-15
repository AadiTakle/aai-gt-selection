# Testing, Demos, Debug Views, and Live Sites

This is the practical map for opening every maintained surface and exercising
the engine, qbank, platform, and deployed websites.

## Fastest complete tour

1. Open the five live sandbox surfaces in [Live websites](#live-websites).
2. Run `npm run verify` from `product/screener/`.
3. Open the prototype at <http://127.0.0.1:5180> and run a **Question bank** session with its Debug tray open.
4. Open the standalone catalogue at <http://127.0.0.1:8000>.
5. Run Bramblebrook against the local platform and open <http://127.0.0.1:5230>.
6. Inspect a resulting platform session with `show:sheet`, `replay:session`, and `audit:marking`.

## Live websites

| Surface | URL | What it proves |
|---|---|---|
| Bramblebrook | <https://d14xlnxxtsczg9.cloudfront.net> | Platform-backed serving, marking, traces and scoring |
| Bramblebrook offline demo | <https://d14xlnxxtsczg9.cloudfront.net/?demo=1> | Adult demo with no network; contains answer keys |
| Platform dashboard | <https://d14n29hsrte7u8.cloudfront.net> | Live catalogue and app registrations |
| Question-type review | <https://d284xy6sbvs9mb.cloudfront.net> | Live type metadata, spectra and served items |
| CogAT prep explainer | <https://scunwsuf4i.us-east-1.awsapprunner.com/about-the-test> | Public explainer; not a screener |
| GT screener example | <https://kt49a2xvq5.us-east-1.awsapprunner.com/demo/exam?telemetry=1> | Separate adaptive engine with researcher telemetry |

The protected platform API is
`https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com`. This is a useful
unauthenticated health check:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com/v1/catalog/types
# expected: 401
```

The bare API root returns 404 because no root route exists.

## 1. Screener, qbank, generator library, practice and debug tray

```bash
cd product/screener
npm install
npm run dev
```

Open:

- Web: <http://127.0.0.1:5180>
- Prototype API: <http://127.0.0.1:5181>

In the web application:

1. Open **Screener**.
2. Select **Question bank** to exercise `packages/qbank/` over the fixed JSONL banks.
3. Start a session and open the **Debug** tray for the item-by-item probability and selection trace.
4. Select **Generators** to compare the older generator session.
5. Open **Practice**, **Question catalogue**, **Library studio**, and **Statistics** for the other package consumers.

The scripted click path is `product/screener/DEMO.md`.

### Screener verification

```bash
cd product/screener
npm run verify
npm run build
npx vite build --config vite.sanctuary.config.ts
```

`npm run verify` runs typechecking, the current tests, the older generator
simulation, and the end-to-end HTTP smoke suite.

## 2. Engine and qbank focused tests

The deployed adaptive behavior is in `product/screener/packages/qbank/`. The
posterior and item-response primitives are in `product/screener/packages/engine/`.

```bash
cd product/screener

# Live qbank engine, grading, stopping, CogAT alignment and contracts
npx vitest run packages/qbank/src

# Shared posterior, IRF and older generator session
npx vitest run packages/engine/src/engine.test.ts

# UI capability and CogAT mapping
npx vitest run packages/ui-contract/src

# Regenerate and verify the committed bank HTTP contract
npm run api:spec
npx vitest run packages/qbank/src/openapi.test.ts
```

`npm run sim` exercises the older generator session. For the deployed qbank
path, use the platform measurement tools described below.

## 3. Standalone question catalogue

```bash
cd product/qbank-library
python3 -m http.server 8000
```

Open <http://127.0.0.1:8000>.

Verify every renderer:

```bash
python3 verify.py
```

This renders all 52 standalone item pages in headless Chromium and checks their
presentation gates and telemetry chrome.

## 4. Bramblebrook against the real local handlers

Terminal 1:

```bash
cd product/platform
npm install
npm run ddb:start
npm run seed:bramblebrook
npm run dev:local
```

The seed command writes the plaintext local app key once to:

```text
product/screener/data/sanctuary/platform-app.json
```

Put the API URL and key in `product/screener/.env.local`:

```text
VITE_GT_PLATFORM_URL=/platform
VITE_GT_APP_KEY=gtk_...
```

Terminal 2:

```bash
cd product/screener
npm run sanctuary
```

Open <http://127.0.0.1:5230>.

Adult-only modes:

- `?demo=1` — browser-only session; touches no platform data and includes keys.
- `?reset=1` — clears Bramblebrook-owned local state once.
- `?perf=1` — performance probe.

Detailed setup: `product/screener/apps/sanctuary/PLATFORM.md`.

## 5. Platform tests and operator views

```bash
cd product/platform
npm run ddb:start
npm test
npm run typecheck
npm run synth
```

After seeding and playing a local session:

```bash
npm run show:sessions
npm run show:sheet -- <session-id>
npm run replay:session -- <session-id>
npm run audit:marking -- <session-id>
npm run what-if -- <session-id>
```

Measurement and selection tools:

```bash
npm run simulate -- 1000
npm run verify:cloud
npm run measure:live -- 16
npm run measure:bramblebrook
```

Despite its historical name, `verify:cloud` runs the real route table and
handlers against DynamoDB Local. `measure:bramblebrook` updates measurement
artifacts under `product/docs/overnight/`, so run it deliberately.

## 6. Internal bank and theme tools

```bash
cd product/screener
npm run review
# http://127.0.0.1:5191

npm run planner
# http://127.0.0.1:5190
```

- Bank review: type coverage, difficulty histograms, CogAT mapping and sample items.
- Theme planner: UI-capability requirements, asset plans and theme-pack validation.

## 7. Deployed static applications locally

### Platform dashboard

```bash
cd product/deployed-apps/platform-dashboard
cp dashboard-config.example.json dashboard-config.json
# Fill in the API base URL and an app key.
python3 -m http.server 8455
```

Open <http://127.0.0.1:8455>.

### Question-type review

```bash
cd product/deployed-apps/question-type-review
cp platform-config.example.json platform-config.json
# Fill in the API base URL and its app key.
python3 serve-review.py 8420
```

Open <http://127.0.0.1:8420/review.html>.

The real config files are gitignored because they contain live app keys.

## 8. GT screener example locally

The source remains in the archived pnpm workspace because moving that package
would change its workspace and Docker build.

```bash
cd archive
pnpm install
cd apps/web
npx next dev --hostname 127.0.0.1 -p 3100
```

Open:

- Deployed-equivalent public route:
  <http://127.0.0.1:3100/demo/exam?telemetry=1>
- Development preview:
  <http://127.0.0.1:3100/dev/family-preview/exam?telemetry=1>

`?debug=1` and `?telemetry=1` both enable the runner's debug dock. This app
still uses its own adaptive engine, not the deployed qbank platform.

Verify it:

```bash
cd archive
pnpm --filter @gt-selection/web typecheck
pnpm --filter @gt-selection/web test
pnpm --filter @gt-selection/web build
```

The archive declares Node 24. Use that version for its complete test suite.

## 9. CogAT prep explainer locally

The deployed source remains on `feat/cogat-prep-pivot`, documented at
`product/deployed-apps/cogat-prep/README.md`. If the corresponding worktree is
available:

```bash
cd /Users/atakle/gt-prep-demo
pnpm install
cd apps/web
npx next dev --hostname 127.0.0.1 -p 3101
```

Open <http://127.0.0.1:3101/about-the-test>.

Only the public explainer is expected to work with its placeholder Supabase
configuration.

## 10. Experimental lab apps

Source is preserved at:

- `product/screener/apps/lab-character/`
- `product/screener/apps/lab-system/`

Their original runbooks are:

- `product/docs/handoff/2026-08-06-character-led-apps.md`
- `product/docs/handoff/2026-08-06-system-led-apps.md`

The curated bank directories and runtime data were gitignored in their original
worktrees and are not present in a clean clone. The source builds and remains
tested as part of the screener suite, but reproducing the original interactive
lab demos requires reconstructing those documented data directories.

## Port map

| Port | Surface |
|---|---|
| 5180 | Prototype web |
| 5181 | Prototype Express API |
| 5190 | Theme planner |
| 5191 | Bank review |
| 5210 | Local platform, or lab-character when the platform is not running |
| 5220 | Lab-system |
| 5230 | Bramblebrook |
| 8000 | Standalone qbank catalogue |
| 8420 | Question-type review static server |
| 8455 | Platform dashboard static server |
| 8456 | DynamoDB Local |
| 3100 | GT screener Next.js dev server |
| 3101 | CogAT prep Next.js dev server |

## Deployment continuity after reorganization

The reorganization changes repository paths, not AWS resources:

- No GitHub workflow deploys on push.
- App Runner services use pinned ECR images and `autoDeploy: false`.
- S3 buckets, CloudFront distributions, API Gateway and DynamoDB resources are unchanged.
- `product/platform/` and `product/screener/` remain siblings, so the CDK web bundle path remains `../screener/dist-sanctuary`.

Build and synthesize the platform-backed deployment:

```bash
cd product/screener
npx vite build --config vite.sanctuary.config.ts

cd ../platform
npm run synth
```

Deployment remains manual:

```bash
ORIGINS="https://d14xlnxxtsczg9.cloudfront.net,http://localhost:5230,http://127.0.0.1:5230,http://localhost:8420,http://127.0.0.1:8420,http://localhost:3100,http://127.0.0.1:3100,https://d284xy6sbvs9mb.cloudfront.net,http://localhost:8455,http://127.0.0.1:8455,https://d14n29hsrte7u8.cloudfront.net"
AWS_PROFILE=sbsandbox npm run deploy -- \
  -c web=../screener/dist-sanctuary \
  -c "origins=$ORIGINS"
AWS_PROFILE=sbsandbox npm run provision:aws -- --region us-east-1 --prefix GtQuestionPlatform
```

The complete `ORIGINS` value is required. Omitting it resets the API to CDK's localhost-only
default and breaks Bramblebrook, the dashboard and question-type review in browsers.

Before deploying, inspect `cdk diff`. The static dashboard and review UI
retain their existing buckets and CloudFront distributions; do not blindly sync
their directories without the gitignored runtime config.
