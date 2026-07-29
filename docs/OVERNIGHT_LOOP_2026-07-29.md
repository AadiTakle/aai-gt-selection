# Overnight loop — 2026-07-29

Running log for the autonomous overnight session. Newest entries at the bottom of each item.

## Merge policy (safety rail)

- Clearly-safe items (docs, hygiene) → `feat/* → dev` after a local quality gate.
- Substantive product / compliance / infra changes → taken to a **green PR and left for review**;
  not merged unsupervised.
- No live data, no production, no destructive git, no promotion to `staging`/`main`.
- `dev` stays green throughout. One coherent commit per task.

## Queue & status — FINAL

Decisions were taken from the owner before the run (fluid reasoning; 30 trials, configurable;
indeterminate shown with a plain-English reason framed as a limit of the test; an interstitial that
says the block is meant to be hard; Phase 2 user-started and resumable across sittings). Merge
autonomy was limited to PR #4, so everything else is left as a PR.

| # | Item | Outcome |
|---|---|---|
| 0 | Root README refresh | merged to dev (`78ac899`) |
| 1 | Two-phase section in the build plan | merged to dev (`36b17a7`) |
| 2 | Confidence range on the ability estimate | **merged** to dev (PR #4, `8ade1ca`) |
| 3 | Phase 2 wiring — user-started, resumable learning block | PR #5 |
| 4 | Retire the broken research scripts + typecheck `scripts/` | PR #6 |
| 5 | Scoring as a standalone cloud function + Lambda infra | PR #7 |
| 6 | BrainLift knowledge trees (both scaffolds) | PR #8 |

## Morning review — what needs you

1. **PR #5 — Phase 2 wiring.** The flagship. Please click through it before merging; there was no
   browser here to verify the flow by hand.
2. **PR #6 — retired scripts.** Confirms the delete-with-a-note decision.
3. **PR #7 — Lambda.** `terraform validate` was not run (Terraform not installed here).
4. **PR #8 — BrainLifts.** DOK 3, DOK 4 and Experts are deliberately empty; those are yours.
5. **Promotion.** `dev` is green; `main` is still behind. Say the word for `dev → staging → main`.

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
