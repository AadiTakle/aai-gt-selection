# GT Development Handoff

This directory is the front door for the GT team. It describes the system that
exists now; older design and plan documents elsewhere under `product/docs/` are
preserved for history and may describe earlier states.

Read in this order:

1. [System and deployments](system-and-deployments.md)
2. [HTTP integration](http-integration.md)
3. [Question-library maintenance](question-library.md)
4. [Engine, scoring, traces, and rescoring](engine-scoring-and-rescoring.md)
5. [Operations and change control](operations-and-change-control.md)

Binding product constraints remain in
[`../interviews/2026-08-03-crystal-martel-call.md`](../interviews/2026-08-03-crystal-martel-call.md).
Measured limitations remain in [`../overnight/README.md`](../overnight/README.md).

## Source-of-truth rule

Use code and generated contracts as the source of truth:

- Routes: `product/platform/functions/shared/src/routes.ts`
- Bank wire contract: `product/screener/packages/qbank/src/wire.ts`
- OpenAPI: `product/docs/api/bank-engine.openapi.json`
- Trace fields: `product/platform/packages/domain/src/session.ts`
- Score-sheet fields: `product/platform/packages/domain/src/scoresheet.ts`
- Gifted criteria: `product/platform/packages/domain/src/criteria.ts`
- Engine behavior: `product/screener/packages/qbank/src/engine.ts`

Re-run verification commands instead of copying test counts into documentation.

## Research and reasoning

The complete `brainlifting/` directory remains unchanged at the repository root.
Those documents explain why major product and measurement choices were made.
They are first-class repository material and must be preserved when maintaining
or transferring this project.
