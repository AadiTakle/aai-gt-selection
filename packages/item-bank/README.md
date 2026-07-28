# @gt-selection/item-bank

A standardized, **server-scored** item bank that implements
`docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md`.

> **Requirements:** R11 (scalable/tunable screener), R5 (defensible capability
> standard), H1/H4/H10. **Decisions inherited:** D-015, D-016.
> **Evidence/constraints:** RES-012 (no item empirically calibrated),
> RES-013 (born-synthetic). This is research/prototype content — **not** a
> decision to run a live test or score real children.

## Hard boundaries (enforced by the schema + tests)

- **Born-synthetic only.** Every bank item carries `syntheticOnly: true` and
  `validated: false`. `difficultyLevel` is an ordinal design rung; `irt` is
  **provisional** (`provisional: true`) until a real pilot calibrates it.
- **The answer key never reaches the browser.** `answer`, `scoring`, `irt`, and
  `provenance` live only on the bank (server) item. `toServedItem()` projects a
  bank item to a `servedItemV2` that contains only renderable content — option
  lure/tag classes and canonical solutions are stripped. A committed-file test
  asserts **zero** answer-bearing keys in the client-served JSONL.
- **Structure-agnostic.** This package defines item *primitives* only. It
  hard-codes **no** adaptive / two-stage sequencing; any sequencing structure
  can consume `servedItemV2` + the server-side scorers.

## Layout

```
src/
  enums.ts, irt.ts, answer.ts, scoring.ts, provenance.ts   # §6.3–6.6 schemas
  content/            # per-type typed content + renderable subset (§6.2)
  content/registry.ts # ITEM_CONTENT_REGISTRY (one entry per type) + unions
  bank-item.ts        # bankItemSchema, servedItemV2Schema, toServedItem, leak guard
  type-registry.ts    # the 66 item MODELS (from master_types.jsonl)
  generators.ts       # seeded, born-synthetic grammars (server-side keys)
  solvers.ts          # independent solvers/scorers (recompute the key)
  builder.ts          # buildBankItem() — validates key == solver, then emits
  generated/          # AUTO-GENERATED type registry (do not hand-edit)
scripts/
  gen-type-registry.ts  # derive the 66 codes/domains from master_types.jsonl
  build-bank.ts         # emit data/bank + data/served
  qa-report.ts          # emit data/COVERAGE_REPORT.md + coverage.json
data/
  bank/items.bank.jsonl      # SERVER ONLY — full items WITH answer keys
  served/items.served.jsonl  # CLIENT SAFE — NO answer keys
  COVERAGE_REPORT.md, coverage.json
```

## Regenerate (deterministic — safe to commit)

```
pnpm --filter @gt-selection/item-bank generate   # gen:registry → build:bank → qa
pnpm --filter @gt-selection/item-bank test
pnpm --filter @gt-selection/item-bank typecheck
```

## Coverage today

All 66 types are registered as typed item **models** (no untyped `params`).
**9** types across all four domains have a server-side grammar + solver and are
materialized into keyed items (verbal: RELPAIR/CLOZE/SENSE; quantitative:
SERIES/FUNC; fluid: MATRIX/ANALOGY; spatial: ROLL/MAZE). The remaining types are
model-only until a grammar/solver or asset pipeline is added — see
`data/COVERAGE_REPORT.md` (the spatial domain is the largest such gap).
The `VER-RELPAIR-01` grammar is lifted directly from its demo's answer table,
moving that key out of the browser and onto the server.
