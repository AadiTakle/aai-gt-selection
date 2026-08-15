# Product

Everything needed to understand the active GT selection platform is grouped
here without changing the implementation boundaries.

## Find the code

- `screener/apps/sanctuary/` — Bramblebrook
- `screener/apps/web/` and `screener/apps/api/` — prototype web and Express surfaces
- `screener/apps/bank-review/` — internal bank-review tool
- `screener/packages/qbank/` — live adaptive bank engine and HTTP wire contract
- `screener/packages/engine/` — posterior/IRT primitives plus the older generator session
- `screener/packages/ui-contract/` — UI requirements and CogAT mapping
- `platform/` — deployed API, persistence, scoring, selection, operations, and CDK
- `qbank-library/` — question records and standalone HTML renderers
- `deployed-apps/` — live deployment inventory, dashboard, review UI, and external-source pointers

## Find the documentation

Start with [`docs/gt/README.md`](docs/gt/README.md).

The deeper design, implementation, measurement, and review record remains under
`docs/`. The repository-wide reasoning layer remains unchanged at
`../brainlifting/`.

## Run

```bash
cd product/screener
npm install
npm run verify

cd ../platform
npm install
npm test
npm run synth
```

See [`docs/gt/testing-and-demos.md`](docs/gt/testing-and-demos.md) for every
local, debug and deployed surface, and
[`docs/gt/access-and-ownership-transfer.md`](docs/gt/access-and-ownership-transfer.md)
for the secrets-safe resource handoff. See
[`docs/gt/operations-and-change-control.md`](docs/gt/operations-and-change-control.md)
for deployment and change control.
