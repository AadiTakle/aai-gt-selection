# Overnight loop — 2026-07-29

Running log for the autonomous overnight session. Newest entries at the bottom of each item.

## Merge policy (safety rail)

- Clearly-safe items (docs, hygiene) → `feat/* → dev` after a local quality gate.
- Substantive product / compliance / infra changes → taken to a **green PR and left for review**;
  not merged unsupervised.
- No live data, no production, no destructive git, no promotion to `staging`/`main`.
- `dev` stays green throughout. One coherent commit per task.

## Queue & status

| # | Item | Card | Disposition | Status |
|---|---|---|---|---|
| 0 | Root README refresh | — | merged to dev (`78ac899`) | done |
| 1 | Repo hygiene: broken scripts + scripts typecheck | WOp2EFzo | deferred (needs a decision) | see notes |
| 2 | Two-phase section in the build plan | Gf5ZCYQC | merge to dev | in progress |
| 3 | Confidence range on the ability estimate | fw53TXn7 | green PR for review | pending |
| 4 | Wire Phase 2 into runner + honest results readout | — (D-030) | green PR for review | pending |
| 5 | BrainLift deep research (metric-evidence, test-evaluation) | — | research branches | pending |
| — | AWS Lambda scoring function | bFZ1PXaP | prep only (infra decision) | not started |

## Notes

### Item 1 — repo hygiene (deferred, needs a decision)

- Removed the stray `packages/cat-engine` directory locally — it was untracked (0 tracked files,
  only a leftover `node_modules` from when the package was deleted). No repo change.
- The 7 broken research scripts (`scripts/persona-sim/*`, `scripts/psychometric-sweep/*`) import
  cat-engine internals (`irt` 3PL, `theta` EAP/MLE, `persona-sim`, `psychometric-lab`, 3PL types).
  Those moved to a **different model** in `exam-engine`/`exam-scoring` (1PL / MAP), so this is a
  keep-vs-delete-vs-rewrite judgment, not a mechanical repoint. Their outputs are already recorded
  (E-073, `PSYCHOMETRIC_SWEEP_*`, `PERSONA_SIM_RESULTS`). Left for a human call. Bringing `scripts/`
  under a real typecheck needs a workspace-aware tsconfig and depends on that decision.

### Item 2 — two-phase build-plan section

- Added `§5.5 Two-phase structure` to `docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md`: Phase 1
  standing level, Phase 2 novel learning block, handover condition, the confound, one-area
  rationale, claim boundary (D-030/E-073/E-095), and current status.
