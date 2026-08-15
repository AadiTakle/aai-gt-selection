# GT Question Platform

One measurement engine behind any number of front doors: a versioned headless question registry,
per-domain ability scoring, varied Fisher-optimal question serving, and an append-only trace that any
score sheet can be rebuilt from.

**Deployed in the Superbuilders sandbox account, `us-east-1`.** The protected API is
`https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com`. An unkeyed request to a protected route
returns 401. Deployment is manual; a git push does not deploy anything.

- **Current GT guide:** `../docs/gt/README.md`
- **Operations:** `../docs/gt/operations-and-change-control.md`
- **HTTP integration:** `../docs/gt/http-integration.md`
- **Trace and scoring:** `../docs/gt/engine-scoring-and-rescoring.md`
- **Historical design:** `../docs/design/aws-question-platform.md`
- **Progress and decisions:** `../docs/plans/aws-question-platform-progress.md`

## Getting started

```bash
cd product/platform
npm install
npm run ddb:start     # DynamoDB Local in Docker, on 8456
npm test
npm run typecheck
npm run synth         # CloudFormation, no credentials needed
```

`npm run ddb:start` proves readiness with a real DynamoDB `ListTables` call rather than any HTTP
response, because on at least one developer machine port 8010 was held by an unrelated server that
answered HTTP happily and then failed every DynamoDB request.

Run the complete local Bramblebrook path with:

```bash
cd product/platform
npm run ddb:start
npm run seed:bramblebrook
npm run dev:local     # platform handlers on 127.0.0.1:5210

# Another terminal
cd product/screener
npm run sanctuary     # game on 127.0.0.1:5230
```

## Layout

| Path | Responsibility | Depends on |
|---|---|---|
| `packages/domain` | Types, type-code arithmetic, defaults | nothing |
| `packages/scoring` | qbank adapter, trace replay, `computeSheet`, criteria | `domain`, `@gt/qbank`, `@gt/engine` |
| `packages/selection` | Seeded RNG, eligibility, the eight variety layers | `domain`, `@gt/engine` |
| `packages/catalog` | Banks to registry rows, answer keys, selection index | `domain`, `@gt/qbank`, `@gt/ui-contract` |
| `packages/store` | DynamoDB single-table repository, one key grammar | `domain` |
| `functions/*` | Six thin Lambda handlers | everything |
| `local/` | Development server over the production route table and handlers | functions |
| `scripts/` | Provisioning, inspection, replay, audit and measurement tools | platform packages |
| `infra/` | Data, API and optional web CDK stacks | `store` (for index definitions) |

The first four packages are pure and test with no AWS at all. `store` and the handlers test against
DynamoDB Local. Nothing depends on the handlers.

## Relationship to `product/screener/`

The platform imports `@gt/engine`, `@gt/qbank` and `@gt/ui-contract` from
`../screener/packages/*` through TypeScript path aliases and modifies nothing there.

`@gt/qbank` owns the live stop rule, pass route and posterior behavior.
`packages/scoring/qbank-adapter.ts` translates durable trace rows into that engine's inputs rather
than implementing a second measurement rule.

## Three properties worth knowing

**The trace is authoritative; the sheet is a view.** Both live scoring and item-revision rescoring call
the same `computeSheet()` path. Timestamped sheet rows preserve earlier computations.

**Answer keys are unreachable from the serving path.** They live in their own table, and the `serve`
function's IAM role has no statement naming it. `infra/infra.test.ts` walks every attached policy and
asserts this.

**Selection is varied deliberately.** Eight layers sit between eligibility and the final draw while
preserving Fisher information at the decision threshold. Run `npm run simulate -- 1000` to reproduce
the current comparison.

## Commands

| Command | Does |
|---|---|
| `npm test` | Everything. Integration suites skip with a message if DynamoDB Local is down. |
| `npm run test:unit` | The four pure packages only, no Docker needed |
| `npm run test:integration` | Store and handlers, needs DynamoDB Local |
| `npm run typecheck` | `tsc --noEmit` across packages, functions and infra |
| `npm run synth` | CloudFormation into `cdk.out/` |
| `npm run simulate -- 1000` | Price the variety layers against the real catalog |
| `npm run ddb:start` / `ddb:stop` | DynamoDB Local |
| `npm run dev:local` | Production route table and handlers on port 5210 |
| `npm run seed:bramblebrook` | Local tables, catalogue, app registration and key |
| `npm run show:sessions` / `show:sheet` | Inspect stored sessions and score sheets |
| `npm run replay:session -- <id>` | Replay a trace answer by answer |
| `npm run audit:marking -- <id>` | Compare stored marking with answer-key revisions |
| `npm run what-if -- <id>` | Counterfactual recommendation analysis |
| `npm run verify:cloud` | Full path through real handlers against DynamoDB Local |
| `npm run measure:bramblebrook` / `measure:live` | Simulated and handler-path measurement |
| `npm run provision:aws -- --region us-east-1 --prefix GtQuestionPlatform` | Populate an existing sandbox deployment |

See `../docs/gt/testing-and-demos.md` for every local, debug and deployed surface.
