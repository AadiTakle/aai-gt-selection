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
| 2 | Two-phase section in the build plan | Gf5ZCYQC | merged to dev (`36b17a7`) | done |
| 3 | Confidence range on the ability estimate | fw53TXn7 | PR #4 (green locally) for review | done → review |
| 4 | Wire Phase 2 into runner + honest results readout | — (D-030) | prep only — plan below, needs UX/compliance sign-off | planned |
| 5 | BrainLift deep research (metric-evidence, test-evaluation) | — | deferred (long; owner owns SPOV) | deferred |
| — | AWS Lambda scoring function | bFZ1PXaP | prep only (infra decision) | not started |

## Morning review — what needs you

1. **PR #4** (`feat/ability-confidence-se`): confidence-range SE on the ability estimate. Review + merge.
2. **Item 4 decisions** (below): the Phase 2 results-screen wiring is planned but not built, because it changes family-facing copy about learning rate. Sign off the four decisions and I'll implement it.
3. **Item 1**: keep-vs-delete the 7 broken research scripts (their outputs are already recorded), then a workspace-aware `scripts/` typecheck.
4. **Promotion**: `dev` is green; `main` is still behind. Say the word to promote `dev → staging → main`.

## Notes

### Item 1 — repo hygiene (RESOLVED 2026-07-29, owner chose "delete with a note")

**Retired** `scripts/persona-sim/` and `scripts/psychometric-sweep/` (10 files). They imported
`packages/cat-engine`, which was deleted when the platform consolidated; the functionality moved to
a **different psychometric model** (3PL/EAP → 1PL/MAP), so re-pointing them was a rewrite rather
than a fix. Everything they produced is already recorded as evidence — E-073, the psychometric-sweep
write-up, and the persona-sim results doc — so the findings survive the scripts.

Also removed their now-dead package scripts (`persona-sim`, `persona-sim:typecheck`,
`sweep:lambda`, `sweep:selection`, `sweep:engagement`, `sweep:typecheck`).

**Closed the gap that hid this:** `scripts/` sat outside every package, so nothing typechecked it.
Added `scripts/tsconfig.json` and a `typecheck:scripts` step wired into the root `typecheck`
(which also drops the vestigial `tsc --showConfig` that compiled nothing). Verified by adding a
deliberately broken import and confirming `error TS2307`, then removing it.

### Original assessment (kept for context)

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

### Item 3 — confidence range on the ability estimate (PR #4)

- `abilityStandardError` + `deriveAbilityFit` in `packages/exam-scoring/src/ability.ts` (Fisher
  information: `slope²·p·(1-p)` per item + prior precision); scorer threads a per-area
  `abilityStandardError` into `AreaScore` (additive, present only under ability bracketing).
  100 exam-scoring tests green locally. PR #4, left for review.
- **Remaining:** display the range on the results screen — folded into item 4 to avoid two
  branches editing the same component.

### Item 4 — Phase 2 wiring into the runner + honest results readout (PLAN — needs sign-off)

Prep-only because it changes the **family-facing** results screen (how learning rate is shown),
which is a claim-boundary/UX decision.

Current state: `apps/web/src/components/exam/exam-runner.tsx` runs only Phase 1
(`nextType`/`nextItem`/`isDone`) then `scoreExam`; the results "Learning rate · N%" line is fed by
`outcome.profile.learningRate` = the cross-area mean of the demoted `M-LEARNRATE`
(`deriveLearningRate` half-contrast) — the exact metric D-030 marks diagnostic-only. The novel-block
admin (`exam-engine/learning-block.ts`) and the honest estimator/readout
(`exam-scoring/learning-curve.ts`, `learning-rate-readout.ts`) exist but nothing in the app calls them.

Plan:
1. After Phase 1 `isDone`, pick the policy-fixed area (same for every child) and check
   `blockReadiness` (area settled + ≥30 unseen items); if not ready → readout `indeterminate`.
2. Administer ~30 novel items via `selectNextNovelItem`, stage-marked `'learning'`, through the
   existing iframe/postMessage + `/api/exam-submit` server-verify path, collected separately from
   the Phase 1 engine update.
3. Map the block's scored items to `LearningTrial[]` → `estimateLearningCurve` → `learningRateReadout`.
4. Results screen: replace "Learning rate · N%" with the honest band ("slower / typical / faster
   than a comparison group") or "Not enough to tell yet" + reason; stop showing the demoted metric
   as a headline; also show the ability range from PR #4.

Decisions needed before building:
- **Copy for `indeterminate`** — how to phrase "not enough to tell yet" without implying a deficiency.
- **Show-when-indeterminate** — display the section with an explanation, or hide it?
- **Which single area** is fixed for the block (fluid_reasoning?).
- **Block length vs time budget** — 30 items adds to session length.

Acceptance: 30 novel stage-marked items served; results show the honest readout (never the demoted
metric as a score) + ability range; `pnpm build` and web tests green; manual click-through verified.
