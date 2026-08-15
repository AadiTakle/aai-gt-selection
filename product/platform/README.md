# GT Question Platform

One measurement engine behind any number of front doors: a versioned headless question registry,
per-domain ability scoring, varied Fisher-optimal question serving, and an append-only trace that any
score sheet can be rebuilt from.

**Nothing here is deployed.** Everything up to the moment someone types `cdk deploy` is built, tested,
and synthesised locally. Deploying needs an AWS account that does not exist yet — see
`docs/design/aws-question-platform.md` §17.

- **Design:** `docs/design/aws-question-platform.md`
- **Plan:** `docs/plans/aws-question-platform-implementation.md`
- **Progress and decisions:** `docs/plans/aws-question-platform-progress.md`

## Getting started

```bash
cd platform
npm install
npm run ddb:start     # DynamoDB Local in Docker, on 8456
npm test              # 267 tests
npm run synth         # CloudFormation, no credentials needed
```

`npm run ddb:start` proves readiness with a real DynamoDB `ListTables` call rather than any HTTP
response, because on at least one developer machine port 8010 was held by an unrelated server that
answered HTTP happily and then failed every DynamoDB request.

## Layout

| Path | Responsibility | Depends on |
|---|---|---|
| `packages/domain` | Types, type-code arithmetic, defaults | nothing |
| `packages/scoring` | `MultiPosterior`, `replay`, `computeSheet`, criteria | `domain`, `@gt/engine` |
| `packages/selection` | Seeded RNG, eligibility, the eight variety layers | `domain`, `@gt/engine` |
| `packages/catalog` | Banks to registry rows, answer keys, selection index | `domain`, `@gt/qbank`, `@gt/ui-contract` |
| `packages/store` | DynamoDB single-table repository, one key grammar | `domain` |
| `functions/*` | Six thin Lambda handlers | everything |
| `infra/` | Two CDK stacks | `store` (for the index definitions) |

The first four packages are pure and test with no AWS at all. `store` and the handlers test against
DynamoDB Local. Nothing depends on the handlers.

## Relationship to `screener/`

The platform **imports** `@gt/engine`, `@gt/qbank` and `@gt/ui-contract` from `screener/packages/*`
through tsconfig path aliases, and modifies nothing there. The IRT model, the posterior grid and the UI
capability vocabulary are the ones the existing 148 screener tests already cover; a second copy of the
psychometrics is the thing most worth not having.

`MultiPosterior` composes five of the existing `Posterior` instances — four domains plus a composite fed
by every scored response — so the composite is bit-identical to the pooled posterior the prototype
already produces. A test asserts that to twelve decimal places.

## Three properties worth knowing

**The trace is authoritative; the sheet is a view.** `replay()` rebuilds belief from the response trace,
and both live scoring and a historical backfill call it. That is why correcting an item's difficulty and
re-scoring every session that saw it cannot drift from what production did — it is the same function.

**Answer keys are unreachable from the serving path.** They live in their own table, and the `serve`
function's IAM role has no statement naming it. `infra/infra.test.ts` walks every attached policy and
asserts this. In the prototype the process that serves an item holds its key and strips it on the way
out, which is one careless refactor away from a leak.

**Variety is close to free, and its absence is worse than it looks.** Measured against the real catalog
with 1,000 simulated children: the deterministic engine serves the entire cohort **16 distinct items out
of 4,534**, with one question type filling 60% of a session. The variety layers cost about 0.2 items per
decision and classify true ability exactly as well — 0.920 against 0.920. Run `npm run simulate` to
reproduce.

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
