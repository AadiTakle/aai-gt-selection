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

00. **THE REPORTED SCORE IS NOT COMPUTED FROM THE VERIFIED TRACE (integrity-critical, fix in
   flight on `feat/exam-score-input`; E-084).** `/api/exam-results` scores `scoreExam(body.scoredItems)`
   — the trace the *client* posts — and never compares it to `app.exam_item_response`, which the
   server's own verifier wrote. On real session `3e03558f` the outcome claims spatial accuracy 0.651
   over 6 items while all 6 persisted spatial responses are `correct=false`; re-scoring the stored
   trace gives composite **3.737** against the recorded **7.468**. The `scorer_input_hash` matches on
   re-hash, which is the trap — it is computed from the database, so it certifies the trace has not
   drifted and says nothing about whether the score came from it. This voids the reproducibility
   claim stamped on every outcome row, and it is the cheating vector D-027 closed, one tier higher:
   a client posting `correct: true` at high difficulty is handed the score it asked for. New gate
   `pnpm exam:reconcile` re-verifies, re-hashes and re-scores a persisted session and exits non-zero
   on the mismatch. **Every composite recorded before this is fixed is unreproducible**, including
   the 7.434 in E-081 and the figures in `EXAM_PERSISTENCE_NOTES.md` §4. `/api/exam-submit` is not
   affected: it takes difficulty from the server bank item, the verdict from the server verifier, and
   spreads server metrics after `clientMetrics`, so the per-item trace is trustworthy.

0. **THE SCORE DOES NOT SEPARATE ABILITY (product-critical, option in flight on
   `feat/exam-score-ability`).** Now that the engine converges (D-023), a matched adaptive battery
   holds every child near the same accuracy by construction, so accuracy no longer carries the
   ability signal — difficulty reached does. The scorer still brackets on accuracy. Simulated over
   the real banks at true abilities 3→19, the composite spans only 2.26→11.04, never nears the top
   of the scale for a maximally able child, and separates true ability 11 from 15 by 0.26 points
   (6.33 vs 6.59). The engine's own per-area estimates track truth to within ~1.0 the whole way, so
   **the information is in the trace and the scorer is discarding it.** For a giftedness screener
   this is the product failing at its one job. The two-stage shape the owner specified (a bracket,
   then metric refinement inside it) is not the problem and is preserved by the proposed fix; only
   the bracketing statistic changes. Needs an owner decision because it alters a ratified contract
   and every reported number — being prepared as a non-default policy mode so nothing is ratified
   silently.

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
2. ~~**Wire the additional banked types into the app**~~ — **done.** `scripts/sync-exam-demos.mjs`
   (`pnpm exam:sync`) now generates `apps/web/src/lib/exam/registry.generated.ts` from the banks and
   demos on disk, and is the single source for the served pool, the submit dispatch, and the runner's
   metadata. **62 of 66 types are served** (fluid 12 · verbal 16 · quantitative 12 · spatial 22).
   Adding a bank plus a protocol-compliant demo and re-running the sync is all a new type needs.
3. ~~**Write the missing server verifiers**~~ — **done.** 30 per-type verifiers now live in
   `apps/web/src/lib/exam/verifiers/{fluid,verbal,quantitative,spatial}.ts`, keyed by `typeCode`.
   Where several solutions are valid, `correct` means "a valid solution" with efficiency carried in a
   metric, because grading against the stored optimum would mark correct children wrong.
   Two independent gates decide servability, and they must stay independent: a type is served only if
   it has a verifier **and** is absent from `research/exam-question-types/qa/NOT_SERVABLE.json`.
   Writing a verifier for a type makes it gradeable, not safe — conflating the two silently put the
   leaking `CX-achieve-02` into the served registry once (E-077).
   The remaining 4 are blocked deliberately: `CX-achieve-02` (proven leak, E-076), `CX-diverge-01`
   and `CX-figural-01` (no deterministic correctness; judge-deferred per E-072), and `SPA-VIEW-01`
   (bank carries two scoring rules, in progress).
4. ~~**Execute Supabase** and swap the in-memory results store for the real `api.exam_*` RPCs~~ —
   **done (D-026).** `/api/exam-session` opens the session (`exam_create_participant` +
   `exam_start_session`), `/api/exam-submit` writes each item (`exam_register_item` +
   `exam_submit_response`), `/api/exam-results` stores the `packages/exam-scoring` outcome verbatim
   (`exam_record_outcome`). Persistence is opt-in per environment and every write is best-effort, so
   an unreachable database degrades to the previous in-memory behaviour rather than failing a
   child's exam; the in-memory store stays as that fallback and as what the preview dashboard reads.
   One additive migration (`20260725160000_exam_item_registration.sql`) was required, because
   `app.exam_item` held only the seed migration's 80 placeholders, whose ids are disjoint from the
   served banks, so no real item could be recorded at all. **Open defect it exposed:** the
   database's key comparison and the app's 30 per-type verifiers grade the same response by
   different rules and disagreed on 15 of 22 items in the recorded round trip, so recomputing from
   `app.exam_scorer_input_json` yields 3.775 against a recorded composite of 7.434. Both verdicts
   are now in the trace, and re-running the scorer over the `app_verdict` telemetry reproduces the
   recorded score exactly; reconciling the two is a governance decision. See
   `docs/architecture/EXAM_PERSISTENCE_NOTES.md`.
4b. **Verifier port to plpgsql — PARTIAL, 4 of 31 done (D-027, `feat/exam-verify-plpgsql`).** The
   owner ratified closing 4's open defect by making the database the single authority on per-item
   correctness, on the anti-cheat grounds that a verifier inside a schema no client role can reach
   cannot leak a key or be bypassed. `app.exam_verify_response` now dispatches — registered
   per-type verifier, then the generic named by the item's server-only `scoring.rule`, then keyed —
   and `api.exam_submit_response` verifies through it; `app.exam_score_response` is demoted, not
   deleted. Landed: the dispatcher, **3 of 3** generic verifiers, and **4 of 31** per-type
   verifiers (`FLU-CONCEPT-01`, `VER-EVIDENCE-01`, `QUANT-MIX-01`, `SPA-XPLANE-01` — one per
   domain, each the awkward shape in its domain). Agreement with the app tier over 2,268 real cases
   rises from 1,659 to 1,989; every generic and every ported type agrees on every case, and all
   279 remaining disagreements are the 26 unported per-type verifiers. **Remaining work, inventory
   and difficulty ratings:** `docs/architecture/EXAM_VERIFIER_PORT_INVENTORY.md`, which also splits
   the 27 into batches for parallel workers. **Two are not straightforwardly portable:**
   `GB-WORDLADDER-01` judges a rung against a 4,000-word child lexicon read off disk, which is not
   a field of `app.exam_item` and needs an owner decision (inventory §6); `CX-achieve-02` must stay
   unported while its E-076 leak keeps it blocked. Coverage is reported by `pnpm exam:verify:diff`,
   which prints a per-type table and marks every unported type PENDING rather than passing it.
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
- Run it **with the backend connected** — persistence is off unless the environment says otherwise,
  and without it a battery leaves no trace:

```
supabase start && pnpm db:users
set -a && source apps/web/.env.local && set +a     # the integration configs do not read .env.local
export GT_EXAM_PERSISTENCE_ENABLED=true
export GT_EXAM_PROCTOR_EMAIL=admissions@example.test
export GT_EXAM_PROCTOR_PASSWORD='Synthetic-Only-2026!'   # the pnpm db:users fixture password
pnpm --filter @gt-selection/web dev --port 3400
```

  Verified live on 2026-07-25 against that setup: a battery driven through the browser UI at
  `/dev/family-preview/exam` served 8 items with **0 stuck** on the waiting placeholder (the D-027
  handshake fix holding outside the test harness), no failed `/api/exam-*` call, and persisted a
  session with 8 responses and 18 telemetry events whose recorded type codes match what the browser
  displayed. A full 22-item battery through the real route handlers persists 22 responses and 88
  telemetry events. What is NOT yet trustworthy on that run is the composite — see open defect 00.
- Check a persisted session: `pnpm exam:reconcile` (latest session), `pnpm exam:reconcile <uuid>`, or
  `--all`. It re-verifies every stored response against the database's own verifier, re-hashes the
  trace, and re-scores it through `packages/exam-scoring`, so it fails loudly when a recorded score
  cannot be derived from the evidence stored beside it.
- Regenerate/extend a bank: `node research/exam-question-types/generators/<TYPE>.mjs`; validate with the
  matching `check-<TYPE>.mjs`.
