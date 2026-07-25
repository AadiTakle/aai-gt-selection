# Adaptive Exam — Status & Resume Note

**Session 2 in progress (overnight loop resumed 2026-07-24 ~11:40pm).** All work lives on
**`feat/exam-integration`** and its child `feat/exam-*` worktrees.
Contract: `docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md`. Born-synthetic throughout
(`synthetic_only=true`, `validated=false`); D-017 remains **Proposed**.

## Session 2 — current state

- **Banks: 44 of 66 types, 5,080 items.** 22 types still unbanked; workers in flight.
- **`origin/dev` merged in** (teammate's guest-login / hosted-mode / CSP work). Clean merge,
  `web build` green.
- **Supabase executed at last.** Migrations applied without a destructive reset; pgTAP is
  **274/274 across 14 files**, including the previously-unrun 44 exam assertions and a new
  26-assertion answer-key firewall test that was validated against a deliberate leak.
- **`db:types:check` unbroken.** It was never real type drift: `packages/exam-engine` carried a
  stray `pnpm.onlyBuiltDependencies` block, which pnpm honours only at the workspace root, so it
  did nothing but print a WARN to stdout — and the drift check compares command stdout byte-for-byte
  against the committed file. Removed.

### Difficulty-coverage rule — stated once, precisely

The rule is a **sliding window two points wide**: for every point `x` in 1..20, the number of items
with `abs(difficulty - x) <= 1` must be **>= 5**. This is **not** "5 items per integer bucket" — an
integer bucket is one point wide and strictly harder to satisfy. Several banks sit at 2–3 per
integer bucket while comfortably passing the real rule. All 44 banks currently pass, worst case 5
(`SPA-MAZE-01`, at the top of its range). Use `research/exam-question-types/qa/audit_banks.mjs`.

### Open defects found this session

1. **ANSWER-KEY LEAK (security-critical, fix in flight on `feat/exam-leak-fix`).** Six verbal banks
   put a `lure` label on every option *inside `content`*, with the correct option labelled
   `"lure": "correct"`. Since `ServedItem = BankItem minus {answer, scoring, provenance}`, `content`
   ships to the browser, so the answer was readable by any client. Affected: `VER-RELPAIR-01`,
   `VER-BUILDIT-01`, `VER-POLYSEME-01`, `VER-SEQUENCE-01`, `VER-SORTBOT-01`, `VER-WORDTRAIN-01`.
   Their `answer.distractorRationales` is also a positional array containing `"correct"`, instead of
   the contract's keyed object. **Related gap:** `/api/exam-items` strips only *top-level*
   `answer`/`scoring`/`provenance` and does not sanitise inside `content` — add defence in depth at
   that boundary regardless of the bank fix.
2. **15 banked types have no independent checker** — every wave-1/wave-3 type predates the
   `check-<TYPE>.mjs` discipline, so their answer keys are only as trustworthy as the generator that
   wrote them: `QUANT-BALANCE-01`, `QUANT-FUNC-01`, `QUANT-MATRIX-01`, `QUANT-SERIES-01`,
   `SPA-FOLDNET-01`, `SPA-MAZE-01`, `SPA-ROLL-01`, `SPA-SHADOW-01`, `VER-BUILDIT-01`,
   `VER-CLOZE-01`, `VER-POLYSEME-01`, `VER-RELPAIR-01`, `VER-SEQUENCE-01`, `VER-SORTBOT-01`,
   `VER-WORDTRAIN-01`. The other 29 checkers all pass.
3. **The SQL stop rule is broken and is the wrong owner.** `abs(delta) <= stableDelta` with seeded
   `stepSize 0.8` > `stableDelta 0.5` makes convergence nearly unreachable, silently turning the
   REQUIRED variable-length battery into a fixed 8-items-per-area one. Note `packages/exam-engine`
   is *not* affected — it already keys off coverage and estimate stability per §3. Reconciliation in
   flight: the DB keeps keys/verification/trace, `packages/exam-scoring` owns final scoring.
4. **`QUANT-GRAPH-01` narrowed to tap-to-choose.** Its spec also describes dragging points and
   sliding an equality marker, which needs a partial-credit solver that does not exist yet. Expect
   the same gap on other constructive types.

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

1. ~~**Scale banks to the remaining 50 types**~~ — **done.** All 66 types have a bank.
2. ~~**Wire the additional banked types into the app**~~ — **done, partially.** `scripts/sync-exam-demos.mjs`
   (`pnpm exam:sync`) now generates `apps/web/src/lib/exam/registry.generated.ts` from the banks and
   demos on disk, and is the single source for the served pool, the submit dispatch, and the runner's
   metadata. **33 of 66 types are served** (fluid 8 · verbal 9 · quantitative 11 · spatial 5).
   Adding a bank plus a protocol-compliant demo and re-running the sync is all a new type needs.
3. **Write the 32 missing server verifiers — the one thing blocking full coverage.** The sync refuses
   to wire a type whose response no verifier can grade, because serving one would score every child 0
   and drag the adaptive difficulty estimate down. All 32 blocked types are blocked for exactly this
   reason; none is blocked on the postMessage protocol. They are constructed-response tasks (a maze
   path, a pipe-rotation state, a tangram placement set, an n-back tap stream) whose banks already
   ship a reference solution to validate a verifier against. Add them to
   `apps/web/src/lib/exam/verifiers/{fluid,verbal,quantitative,spatial}.ts`, keyed by `typeCode`.
   Where several solutions are valid, `correct` must mean "a valid solution" with efficiency in a
   metric — grading against the stored optimum would mark correct children wrong.
4. **Execute Supabase** (`supabase start`, run migrations + pgTAP) and swap the in-memory results
   store for the real `api.exam_*` RPCs. `apps/web` does not yet call the exam RPCs at all. One
   source of truth is settled by D-019: the DB stores and verifies, `packages/exam-scoring` scores.
5. **Open-ended / LLM-judged types** (Q2): track core metrics + participate in selection; defer full
   harvest/judge (M-ORIG/M-FLEX) — currently `model_judge_deferred` scores 0/inert. The invented
   norms behind M-ORIG/M-FLEX were removed; see E-072.
6. ~~**QA: the FOLDNET `locked`-state**~~ — **resolved, and it was live.** `startItem()` set
   `started=true` but never cleared the `locked` that `loadItem()` set, and both `choose()` and
   `submit()` early-return while locked, so every embedded FOLDNET item silently burned the runner's
   4-minute timeout and was force-skipped. Fixed at the source. A headless Chromium battery now runs
   end to end (16 items, 10 types, all 4 areas) with zero CSP violations.
7. **Coverage gap:** no wired spatial bank targets K-1, so the youngest children are always served
   spatial items off-band. Needs bank content; pinned by a test so no new gap appears silently.
8. **Deferred by decision:** engagement-gate enforcement, age-band battery adaptation, wiring the
   tunable `ExamPolicy` to an admin portal, and the **`feat/exam-integration → dev` merge** (hold
   until the teammate's in-flight deploy settles, then resolve conflicts).

## How to resume

- Base branch: `feat/exam-integration` (worktree `gt-selection-ex-integration`). Child worktrees
  `gt-selection-ex-*` are kept for continuation; clean them up only when the whole task is done.
- Run the app: `pnpm install` then `pnpm --filter web dev`; take the battery at `/dev/family-preview/exam`
  (or `/family/assessment`).
- Regenerate/extend a bank: `node research/exam-question-types/generators/<TYPE>.mjs`; validate with the
  matching `check-<TYPE>.mjs`.
