# @gt-selection/exam-engine

Pure, deterministic adaptive-selection engine for the K-8 cognitive screener.

Implements the engine contract in `docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md` (§1 flow, §3
engine, §4 core metrics): a per-area **difficulty score (float 1..20)** that item performance
adds to / subtracts from, with type/item selection that keeps an even spread across the four
reasoning areas, fills under-covered core metrics, and prefers age-band-matched items.

```text
gradeBand ─► startState ─► nextType ─► nextItem ─► ServedItem
                 ▲                                     │
                 └──────────── update ◄── ScoredItem ◄─┘   (loop until isDone)
```

## Exported functions

- `startState(gradeBand, overrides?)` — seed each area's difficulty from the grade band
  (`K-1≈3, 2-3≈7, 4-5≈11, 6-8≈15, above-level≈18`).
- `nextType(state, banks)` — pick the next question type for even area spread + core-metric
  coverage, preferring types whose `ageBands` include the current band. Returns `null` when done.
- `nextItem(state, typeCode, banks)` — choose the unseen bank item whose difficulty is closest to
  the current area difficulty (respects `±difficultyWindow`). An item outside the child's grade
  band pays an `ageBandBias` penalty in scale points, so the age band breaks ties between
  comparably targeted items but does not override targeting (D-025).
- `update(state, scored)` — move the area difficulty by `direction × magnitude` (gradual `±0.4..1.0`,
  `M-ERRTYPE` near-miss softens wrong answers), clamp `1..20`, update the accuracy/estimate windows
  and metric counts.
- `isDone(state)` — `true` when every enforced core metric has `≥ minSamples` per applicable area,
  area coverage is even, and each area estimate is stable (estimate-window SD below threshold). A
  hard item cap is the safety stop.

All functions are **pure** (no I/O) and **deterministic** (seeded, hash-based tie-breaks; a seedable
`mulberry32` PRNG is exported for callers that need one).

Born-synthetic: `syntheticOnly=true`, `validated=false`. Difficulty values are design-estimated and
provisional. Types here are **local** and mirror the BUILD_PLAN contract so this package does not
depend on `packages/contracts` being ready; they reconcile at the integration merge.

## Test

```bash
pnpm --filter @gt-selection/exam-engine test   # or, inside this package: npx vitest run
```
