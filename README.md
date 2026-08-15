# GT Selection Platform

This repository contains the shared question library, adaptive measurement engine,
serverless question platform, and the applications deployed around them.

Start with:

1. [`product/docs/gt/README.md`](product/docs/gt/README.md) — the GT development-team handoff.
2. [`product/deployed-apps/README.md`](product/deployed-apps/README.md) — every live surface and where its source lives.
3. [`product/docs/handoff/2026-08-14-repo-orientation.md`](product/docs/handoff/2026-08-14-repo-orientation.md) — measured repository and deployment state.
4. [`product/docs/interviews/2026-08-03-crystal-martel-call.md`](product/docs/interviews/2026-08-03-crystal-martel-call.md) — GT's binding constraints.
5. [`product/docs/overnight/README.md`](product/docs/overnight/README.md) — what the current instrument actually measures and its limitations.

## Repository map

- `product/screener/` — Bramblebrook, prototype and internal apps, `qbank`, the
  measurement primitives, shared contracts, and UI contracts.
- `product/platform/` — the deployed API, trace store, scoring adapter, selection,
  Lambda handlers, operational scripts, and CDK.
- `product/qbank-library/` — the 53 JSONL banks and their standalone HTML renderers.
- `product/deployed-apps/` — the deployment inventory plus the dashboard and
  question-type review applications.
- `product/docs/` — active design, measurement, integration, operations, and handoff documentation.
- `brainlifting/` — the project's preserved evidence and reasoning layer. These
  documents are first-class repository material, not archived status notes.
- `archive/` — the pre-reset application and its historical governance and research.
- `shots/` — experiment screenshots retained as artifacts.

The live measurement path is `product/screener/packages/qbank/`. The package at
`product/screener/packages/engine/` also supplies the posterior and item-response
math used by qbank; its generator session and simulation are the older parallel path.

## Run the active system

```bash
cd product/platform
npm install
npm run ddb:start
npm run seed:bramblebrook
npm run dev:local

# In another terminal:
cd product/screener
npm install
npm run sanctuary
```

Repository-root shortcuts continue to target the screener:

```bash
npm run verify
npm run dev
npm run review
```

Platform verification runs separately:

```bash
cd product/platform
npm test
npm run synth
```

## Deployment

The sandbox deployments are manual. A git push does not deploy anything. Read
`product/deployed-apps/README.md` for the live inventory and
`product/screener/apps/sanctuary/PLATFORM.md` for the platform-backed game workflow.

## Historical project

The stopped pre-reset application remains intact under `archive/`. Start with
`archive/README.md` when investigating that system; do not use it as the status
source for the active platform.
