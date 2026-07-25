# Adaptive Exam — Session 1 Status & Resume Note

**Paused 2026-07-24 ~9:30pm.** Kickoff session of the overnight loop. All work lives on
**`feat/exam-integration`** (off dev `326c9fa`) and its child `feat/exam-*` worktrees.
Contract: `docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md`. Born-synthetic throughout
(`synthetic_only=true`, `validated=false`); D-017 remains **Proposed**.

## Done this session (all merged into `feat/exam-integration`, validation build green)

- **Contracts** (`packages/contracts/src/assessment-exam-adaptive.ts`) — BankItem/ServedItem/
  ItemResult/ScoredItem, telemetry, postMessage host↔demo union, SessionState/AreaState,
  ExamPolicy, Outcome, `BASIC_CORE_METRICS`. Difficulty = float 1–20. Typecheck + 47 tests green.
- **Engine** (`packages/exam-engine`) — pure `startState/nextType/nextItem/update/isDone`; per-area
  float difficulty, area-spread + metric-coverage + age-band selection, gradual ±update, variable-
  length stop rule. 25 tests; a simulated responder converges to true ability.
- **Scoring** (`packages/exam-scoring`) — 20 basic-core metrics (+43 tracked-inert) with
  `METRICS_BASIS.md`; deterministic scorer (accuracy → bracket, metrics → within-bracket θ on 1–20)
  + composite + profile, **no decision label**; tunable `ExamPolicy` defaults. 26 tests.
- **Backend** (`supabase/migrations/20260724130000_*` + `130100` + `130200` + pgTAP `120_*`) —
  8-table `app` schema (float difficulty, server-only keys, structured metrics, full telemetry
  trace, outcome), 7 `api.exam_*` SECURITY DEFINER RPCs, forced RLS, born-synthetic seed. **Not
  executed** (no `supabase start`), pgTAP unrun.
- **Banks + renderer demos — 28 of 66 types** (wave 1 = the 16 below; wave 3 added 12: fluid
  CARPET/LADDER/STACK, verbal BUILDIT/POLYSEME/WORDTRAIN, quant NUMLINE/DOTS/BUILD, spatial
  TANGRAM/PIPES/PICKFOLD) (≥5 items per ±1pt band across difficulty 1–20;
  deterministic keys re-verified; demos are pure postMessage renderers, no correct/incorrect shown):
  - fluid: FLU-MATRIX-01, FLU-ANALOGY-01, FLU-ODDPAIR-01, FLU-VENN-01
  - verbal: VER-RELPAIR-01, VER-CLOZE-01, VER-SEQUENCE-01, VER-SORTBOT-01
  - quant: QUANT-SERIES-01, QUANT-MATRIX-01, QUANT-FUNC-01, QUANT-BALANCE-01
  - spatial: SPA-FOLDNET-01, SPA-SHADOW-01, SPA-ROLL-01, SPA-MAZE-01
  Generators at `research/exam-question-types/generators/`, banks at `.../banks/`.
- **App wired to the real system** (`apps/web`) — runner uses `@gt-selection/exam-engine` +
  `@gt-selection/exam-scoring`; `/api/exam-items` serves key-free items, `/api/exam-submit` verifies
  server-side, `/api/exam-results` stores the full trace (in-memory). Grade-based start → adaptive
  variable-length loop → score + per-area profile. `pnpm --filter web build` green; keys verified
  absent from client bundles. Currently the **4 reference demos** are served from
  `public/exam-demos/`; the other 12 banked types have banks+renderer demos but are **not yet served/wired**.

## Remaining (overnight-loop backlog)

1. **Scale banks to the remaining 50 types** (same generator+bank+renderer pattern per domain).
2. **Wire the additional banked types into the app** (copy renderer demos to `public/exam-demos/`,
   include their banks in the served pool + submit verifier). Expand `EXAM_BANK`/served pool beyond 4.
3. **Execute Supabase** (`supabase start`, run migrations + pgTAP) and swap the in-memory results
   store for the real `api.exam_*` RPCs. Reconcile **one source of truth** for selection/scoring:
   in-DB (backend) vs `packages/exam-engine`+`exam-scoring` (currently used by the app).
4. **Open-ended / LLM-judged types** (Q2): track core metrics + participate in selection; defer full
   harvest/judge (M-ORIG/M-FLEX) — currently `model_judge_deferred` scores 0/inert.
5. **QA:** re-verify the FOLDNET renderer `locked`-state on the wired app (spatial-2 fixed this in its
   own demos; confirm FLU/VER/QUANT/SPA-FOLDNET all complete + emit results in-browser, ideally via
   Playwright — not installed this session).
6. **Deferred by decision:** engagement-gate enforcement, age-band battery adaptation, wiring the
   tunable `ExamPolicy` to an admin portal, and the **`feat/exam-integration → dev` merge** (hold
   until the teammate's in-flight deploy settles, then resolve conflicts).

## How to resume

- Base branch: `feat/exam-integration` (worktree `gt-selection-ex-integration`). Child worktrees
  `gt-selection-ex-*` are kept for continuation; clean them up only when the whole task is done.
- Run the app: `pnpm install` then `pnpm --filter web dev`; take the battery at `/dev/family-preview/exam`
  (or `/family/assessment`).
- Regenerate/extend a bank: `node research/exam-question-types/generators/<TYPE>.mjs`; validate with the
  matching `check-<TYPE>.mjs`.
