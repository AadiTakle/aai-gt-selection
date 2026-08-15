# System and Deployments

## Product boundary

The active system is the combination of:

- `product/screener/` — front ends and shared measurement packages.
- `product/platform/` — the HTTP platform, persistence, scoring adapter, and AWS infrastructure.
- `product/qbank-library/` — question content and standalone renderers.
- `product/deployed-apps/` — deployment inventory, dashboard, review UI, and pointers to the other deployed surfaces.

The pre-reset application remains under `archive/`. It is historical except where
the deployed GT screener explicitly points to `archive/apps/web`.

## Live sandbox surfaces

All resources below are in Superbuilders sandbox account `056956104102`, region
`us-east-1`.

- Bramblebrook: <https://d14xlnxxtsczg9.cloudfront.net>
  - Source: `product/screener/apps/sanctuary/`
  - Uses the platform for serving, marking, traces, and scoring.
- Backend dashboard: <https://d14n29hsrte7u8.cloudfront.net>
  - Source: `product/deployed-apps/platform-dashboard/`
  - Reads platform catalogue and app-registration data live.
- Question-type review: <https://d284xy6sbvs9mb.cloudfront.net>
  - Source: `product/deployed-apps/question-type-review/`
  - Reads types, spectra, and served items from the platform.
- CogAT prep explainer: <https://scunwsuf4i.us-east-1.awsapprunner.com/about-the-test>
  - Deployment record: `product/deployed-apps/cogat-prep/README.md`
  - Source remains on `feat/cogat-prep-pivot`; it is an explainer and does not screen through the platform.
- GT screener example: <https://kt49a2xvq5.us-east-1.awsapprunner.com/demo/exam?telemetry=1>
  - Source: `archive/apps/web/`
  - Public route: `archive/apps/web/src/app/(embed)/demo/exam/page.tsx`
  - It remains on its own engine; platform mode is documented but not implemented.

Platform API:
<https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com>

The self-contained Bramblebrook `?demo=1` mode is a mode of Bramblebrook, not a
separate application. It includes answer keys in the browser bundle and must not
be used for consequential screening.

## Deployment ownership

`product/platform/infra/` owns the question-platform CDK stacks and the
Bramblebrook web stack. The dashboard, review UI, and App Runner deployments were
created manually; their exact inventory is recorded under
`product/deployed-apps/`.

A git push does not deploy any surface. App Runner services use pinned ECR image
tags with automatic deployment disabled. Platform and Bramblebrook deployments
are manual CDK operations.

The live API currently contains CORS origins that were added directly in AWS for
the dashboard and review UI. The next API-stack deployment must include those
origins explicitly or it will revert the live configuration. See
`product/deployed-apps/README.md` for the current list.

## Code map

- Live adaptive engine: `product/screener/packages/qbank/`
- Posterior and item-response primitives: `product/screener/packages/engine/`
- UI capability and CogAT mapping: `product/screener/packages/ui-contract/`
- Platform scoring adapter: `product/platform/packages/scoring/`
- Platform selection: `product/platform/packages/selection/`
- Catalogue compiler: `product/platform/packages/catalog/`
- DynamoDB repository: `product/platform/packages/store/`
- Lambda handlers: `product/platform/functions/`
- Question banks: `product/qbank-library/banks/`
- HTML renderers: `product/qbank-library/items/`

The older generator session and item-library path remains under
`product/screener/packages/engine/` and
`product/screener/packages/item-library/`. Do not mistake its simulation for the
live qbank path.
