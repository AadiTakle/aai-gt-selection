# Gen-B Independent Verification — 2026-07-28

**Scope:** branch `feat/genb-verification` (identical tree to `feat/exam-integration`, 404 commits,
tip `699ddea`). Verified in an isolated worktree against a freshly reset local Supabase stack and
a locally built app. No other branch or worktree was touched, and no Gen-B source file was modified.

**Claim labels:** `[V]` measured in this session · `[I]` inference from measured evidence ·
`[A]` assumption not verified here.

---

## Verdict

**Gen-B passes today, and the two headline numbers are accurate rather than inflated.** The prior
report's "728 JS/TS tests passing" and "465 pgTAP assertions passing" both reproduce exactly:
`pnpm -r --if-present run test` reports **728 passed, 0 failed, 0 skipped** across 43 files, and
`supabase test db --local` reports **Files=20, Tests=465, Result: PASS** on top of **20 of 20
migrations applying cleanly**. The earlier audit's LOW-confidence rating of the 728 figure was
warranted on the evidence it had, but its suspicion was misplaced: the gap between ~462 static
declarations and 728 runtime tests is entirely ordinary parameterized expansion, and I traced it to
the specific file and fixture count responsible. `[V]`

The database-authority claim also holds, and holds more strongly than the prior report stated.
There are exactly **30 per-type verifiers registered in the live schema**, all 30 execute, and the
repo's own differential harness shows the plpgsql verifiers and the TypeScript verifiers agreeing on
**2268 of 2268 generated cases across all 63 served question types**. Answer keys are genuinely
firewalled: RLS is enabled *and* forced on all 18 `app` tables, `answer_key` exists in exactly one
table, the `app` schema has zero grants to any client role, PostgREST exposes only `api`, and a
recursive scan of all 7540 items served over HTTP found no answer-key field of any name. `[V]`

What does **not** hold up is the surrounding hygiene and governance. `pnpm verify` — the repo's own
aggregate gate — **fails at its first step**, because `format:check` fails on **32 tracked files,
every one of them Gen-B exam code**. `pnpm lint` fails with 17 errors, 16 of them in a file this
branch introduced. All nine of the decisions this architecture rests on (**D-020 … D-028**) are
recorded as **Proposed**; not one is ratified. And the exam workstream is effectively outside the
requirement system: across all exam source and the three dedicated exam architecture documents there
is **exactly one** R/H citation, and it points at **R7/R11 — where R11 does not exist**, since the
requirements define only R1–R10. No exam feature appears in `FEATURE_TO_REQUIREMENT_MAP.md` at all.
`[V]`

So: the engineering claims are real and measured; the process claims are the exposure.

---

## Claim-by-claim

| # | Claim | Claimed | Measured | Verdict |
|---|---|---|---|---|
| 1 | JS/TS test suite | 728 passing | **728 passed / 0 failed / 0 skipped**, 43 files, 6 projects | **CONFIRMED** |
| 1b | Static-vs-runtime gap | unexplained (audit counted 462) | 458 static → 728 runtime; fully attributed to `describe.each`/`it.each` | **CONFIRMED (explained)** |
| 1c | Integration tests | not claimed | **10 passed / 3 files**, separate command, not in `pnpm test` | **ADDITIONAL** |
| 2 | Migrations apply | implied | **20 of 20 applied cleanly**, no errors | **CONFIRMED** |
| 3 | pgTAP assertions | 465 passing | **Files=20, Tests=465, Result: PASS** | **CONFIRMED** |
| 4 | 30 per-type verifiers in the DB | 30 | **30 registry rows, 30 distinct functions** (34 `exam_verify*` total = 30 + dispatcher + 3 generic) | **CONFIRMED** |
| 5 | Verifiers execute | asserted | **30/30 invoked, 0 failures**; 2268/2268 differential cases agree with the TS tier | **CONFIRMED** |
| 6 | DB is the authority on correctness | asserted | `api.exam_submit_response` → `app.exam_verify_response`; `app.exam_scorer_input_json` reads the DB's own `correct`; results route scores the DB trace, not the request body | **CONFIRMED (with a caveat, below)** |
| 7 | Answer keys firewalled from the client | asserted | RLS forced 18/18; `answer_key` in 1 table; zero `app` grants to client roles; only `api` exposed; 0 key fields in 7540 HTTP-served items | **CONFIRMED** |
| 8 | Typecheck | implied clean | **PASS**, all 6 projects | **CONFIRMED** |
| 9 | Lint | implied clean | **FAIL — 17 errors** (16 in a file new on this branch, 1 inherited from `dev`) | **REFUTED** |
| 10 | Build | implied clean | **PASS**, 26 routes | **CONFIRMED** |
| 11 | App boots / e2e exam path | implied | **Boots**; health `databaseApi: ready`; live battery persisted 3 items with DB verdicts | **CONFIRMED** |
| 12 | `pnpm verify` aggregate gate | implied green | **FAILS at step 1** (`format:check`, 32 tracked Gen-B files) | **REFUTED** |
| 13 | D-020…D-028 absent from `dev` | 9 decisions | **CONFIRMED** — `dev` has D-001…D-019; all 9 are **Proposed**, none ratified | **CONFIRMED (worse than stated)** |
| 14 | Exam code cites no R/H IDs | asserted | **1 citation total**, and it cites the **non-existent R11**; 0 in the 3 exam architecture docs; 0 exam rows in the requirement map | **CONFIRMED (substantively)** |

Supporting gates not in the original claim set: `db:lint` **PASS**, `security:scan` **PASS**,
`boundaries:check` **PASS**, `format:check` **FAIL** (32 files), `db:types:check` **FAIL but for an
environmental reason only — see the note below**, Playwright e2e **2 passed / 4 failed, all 4
failures inherited from `dev`**.

---

## 1. The JS/TS suite: 728 is real, and here is where it comes from

`pnpm -r --if-present run test` — 728 passed, 0 failed, 0 skipped, ~292 s wall clock. `[V]`

| Project | Test files | Runtime tests | Static `it`/`test` declarations |
|---|---|---|---|
| `packages/contracts` | 8 | **184** | 47 |
| `packages/exam-engine` | 4 | **112** | 58 |
| `packages/exam-scoring` | 5 | **71** | 71 |
| `packages/test-fixtures` | 2 | **18** | 18 |
| `apps/web` | 24 | **343** | 264 |
| **Total** | **43** | **728** | **458** |

My static count is 458; the earlier audit's was 462. The small difference is regex convention, not
substance — either way the runtime total exceeds the static count by roughly 270 tests, and the
audit was right to refuse to assume the expansion was legitimate without seeing it. It is
legitimate. `[V]`

**The single biggest expander, exactly.** `packages/contracts/src/bank-conformance.test.ts` has
**5 static declarations and produces 137 runtime tests.** The mechanism is `describe.each` over every
question bank on disk:

```87:87:packages/contracts/src/bank-conformance.test.ts
  describe.each(banks.map((b) => [b.typeCode, b] as const))('%s', (_typeCode, bank) => {
```

`loadBanks()` reads every `.jsonl` file in `research/exam-question-types/banks`. There are **66** such
files, each contributing 2 tests, plus 1 standalone test and 4 from an `it.each` over the
server-only field list: 66 × 2 + 1 + 4 = **137**. That is an exact match, so the expansion is
accounted for down to the test. `[V]`

**Important caveat the raw number hides:** because the count is derived from fixtures on disk, **728
is data-dependent, not a fixed property of the code.** Add or remove bank files and the total moves
without a single line of test code changing. It is a real 728 today; it is not a stable contract.
`[I]`

**A separate suite exists that `pnpm test` does not run.** `apps/web/vitest.config.ts` excludes
`src/**/*.integration.test.ts`, which run only under `pnpm --filter @gt-selection/web
test:integration`. Against the live local stack these give **10 passed / 3 files**. They are the
most valuable tests in the repo for this decision, because they assert the security properties
end-to-end — including *"never lets the served side of the trace carry an answer key"*, *"scores the
database trace, not the trace the request body carries"*, and *"a forged `scoredItems` payload
cannot move the score"*. **Total executing JS/TS tests: 728 + 10 = 738.** `[V]`

---

## 2. The database layer applies and passes

`supabase db reset --local` applied **20 of 20 migrations** with no errors (two benign `NOTICE`
lines about an existing extension and an absent trigger). `supabase test db --local` then reported:

```
All tests successful.
Files=20, Tests=465,  1 wallclock secs
Result: PASS
```

The 465 figure is the sum of the `plan(n)` declarations across the 20 `.sql` test files, which I
computed independently as 465 before running anything — so the claimed number and the executed
number agree. `[V]`

Unlike Gen-A, **every one of these 20 files is a live `.test.sql` and executes**; none are
`.pending.sql`. Nine of the twenty (245 of the 465 assertions) are exam-specific. `[V]`

---

## 3. Thirty verifiers, in the database, executing — and agreeing with the TypeScript tier

The live schema contains **34** functions matching `app.exam_verify*`. That is not 34 per-type
verifiers: it is **30 per-type verifiers + 1 dispatcher (`exam_verify_response`) + 3 generic
fallbacks** (`exam_verify_keyed`, `exam_verify_placement_tolerance`,
`exam_verify_constructed_value`). The authoritative count is the dispatch table
`app.exam_verifier_registry`, which holds **exactly 30 rows mapping 30 distinct type codes to 30
distinct verifier functions, 1:1.** `[V]`

**They execute.** Invoking all 30 directly returned a well-formed verdict object from every one:
`ok=30 fail=0`. Every one failed *closed* (`correct=false`) on an empty response, which is the right
default but proves only executability. `[V]`

**They discriminate, and they match the app tier.** The repo's own differential harness
(`pnpm exam:verify:diff`) samples up to 12 real bank items per type and builds three responses each
(correct / wrong / skipped), then runs both the TypeScript verifier and `app.exam_verify_response`:

```
per-type verifiers ported: 30/30 served (30/31 including the blocked CX-achieve-02)
generic verifiers: 33 types, 1188/1188 cases agree, 396 of them scored correct on both sides
ported per-type: 1080/1080 cases agree, 360 of them scored correct on both sides
PENDING (database still falls back to the keyed default): 0/0 cases happen to agree
WHOLE RUN: 2268/2268 cases agree across all 63 served types
RESULT: every ported and generic type agrees.
```

This is the strongest single piece of evidence in Gen-B's favour: **756 of the 2268 cases were
graded *correct* by both implementations independently**, so this is genuine positive-path
discrimination across real bank content, not a suite of fail-closed assertions. `[V]`

### The database really is the authority — with one honest caveat

Confirmed chain: `api.exam_submit_response` calls `app.exam_verify_response` (line 117) and stores
its verdict in `app.exam_item_response.correct`; `app.exam_scorer_input_json` projects that same
`r.correct` column; and `/api/exam-results` scores that projection, with its own source comment
stating that the request body's `scoredItems` array *"is NOT scored. It used to be (E-084), which
made the composite [forgeable]"*. A forged payload therefore cannot move the score, and the
integration suite asserts exactly that. `[V]`

**The caveat:** correctness is implemented **twice**. `/api/exam-submit` computes its own verdict in
TypeScript via `verify()` from `@/lib/exam/verifiers` (line 132) and that verdict is what drives
in-battery adaptation — the next item and the difficulty step — while the database independently
computes and stores its own. D-026 is explicit that both are recorded, and the run I drove confirms
it: three `app_verdict` telemetry rows were written alongside the three DB verdicts. So the accurate
statement is: **the database is the authority for the persisted trace and the final composite; the
TypeScript tier remains the authority for what the child experiences during the battery.** The two
agree today on 2268/2268 cases, and a differential harness exists to keep them agreeing — but they
are two implementations that *can* diverge, not one. `[V]`

### Answer-key firewall

| Control | Measured |
|---|---|
| RLS on `app` tables | **18 of 18 enabled AND forced** (`relrowsecurity` and `relforcerowsecurity` both true) |
| Where `answer_key` lives | exactly **one** column, `app.exam_item.answer_key`, repo-wide |
| Client grants on schema `app` | **zero** table grants to `anon`/`authenticated`/`public`; only `api_executor` holds USAGE |
| PostgREST exposure | `schemas = ["api"]` only |
| `anon` reach | no USAGE on `api` at all — blocked before any function |
| `authenticated` reach | EXECUTE on all 18 `api` functions; **only** `exam_register_item` references `answer_key`, and it is INSERT-only and returns just `{itemId, typeCode, registered, alreadyPresent}` |
| Served projection | single chokepoint `app.exam_served_item_json` emits `itemId, typeCode, domain, difficulty, ageBands, content, demoPath, syntheticOnly, validated` — no `answer`, no `scoring` |
| Empirical DB check | 0 of 80 seeded items expose an `answer`/`answerKey`/`scoring` field, and 0 leak a key value into the projection |
| Empirical HTTP check | recursive scan of **all 7540 items** served by `/api/exam-items`: 519 distinct object keys, **no answer-key field of any name** (only structural `key` identifiers on bins/options) |

Attempts to read a key as a client role were refused: `permission denied for schema app` for both
`anon` and `authenticated`. `[V]`

### One real defect found in the seed data

Of the 4 question types the seed migration creates, **none is in the 30-verifier registry**, and
**20 of the 80 seeded items can never be graded correct.** The seed synthesizes
`QUANT-SERIES-01` items with `jsonb_build_object('solution', g.lvl * 5)` and mode `computed_solver`;
because that type is not registered and the items carry no `scoring.rule`, the dispatcher falls
through to `exam_verify_keyed`, which reads only `correctKey`. Result: 60 of 80 seeded items grade
correct with their real key, **20 never can**, and 0 of 80 accept a wrong answer. `[V]`

**Correctly scoped:** this is a defect in demo seed rows, not in the architecture or the served
path. The *bank's* `QUANT-SERIES-01` items use `{"correctKey": "C"}` with mode `deterministic_key`
and grade correctly, agreeing with the TS tier on 36/36 differential cases. `VER-ANALOGY-01` is a
seed-only legacy type with no bank at all. So the served experience is unaffected; a demo driven off
the seeded rows would silently score one type wrong. `[V]`

---

## 4. Typecheck, lint, build, and the other gates

| Gate | Result | Notes |
|---|---|---|
| `pnpm typecheck` | **PASS** | all 6 projects clean |
| `pnpm build` | **PASS** | 26 routes; one non-fatal Turbopack warning about a dynamic `process.cwd()` import in `bank-loader.ts` |
| `pnpm lint` | **FAIL — 17 errors** | see split below |
| `pnpm format:check` | **FAIL — 32 tracked files** | **all 32 are Gen-B exam code** |
| `pnpm db:lint` | **PASS** | `No schema errors found` across `app`, `api`, `public` |
| `pnpm security:scan` | **PASS** | elevated-key and public-env boundaries verified |
| `pnpm boundaries:check` | **PASS** | workspace dependency boundaries verified |
| `pnpm db:types:check` | **FAIL (environmental only)** | see note |
| `playwright test` | **2 passed / 4 failed** | all 4 failures inherited from `dev` |

**Lint, split by origin.** 16 of the 17 errors are in `scripts/sync-exam-demos.mjs`, which is
**new on this branch** (added in `d33ffdd`) — `no-undef` on `process`/`console` because the ESLint
config gives that file no Node globals, plus one unused variable. These are Gen-B's. The 1 remaining
error is in `apps/web/src/components/family/apply-wizard.tsx`, an `eslint-disable` for
`react-hooks/exhaustive-deps` whose plugin is not a dependency; the file and the comment both exist
on `dev` and `eslint-plugin-react-hooks` is absent from `dev`'s manifests too, so that one is
**inherited**. `[V]` for the file provenance and plugin absence; `[I]` that `dev` therefore also
fails this rule, since I did not execute ESLint on a `dev` checkout.

> **Addendum, 2026-07-28, added on merge into `feat/test-structure-revamp` (not by the verifying
> author).** Both lint claims above reproduce exactly — 17 tracked-file errors, 16 in
> `scripts/sync-exam-demos.mjs` and 1 in `apply-wizard.tsx` — once the verifier's own leftover
> `tmp-verification/*.mjs` probes are excluded; with those included the raw count is 33 and
> `format:check` reports 35 files rather than 32. `[V]`
>
> The `[I]` above is now **settled, and the conclusion changes.** The identical config gap was hit
> and fixed on the Gen-A lineage earlier the same night (`764589d`): the root `eslint .` pass gives
> `scripts/**` no Node globals, and it also lints `apps/web` with a config that registers no React
> plugins, which is what makes the `apply-wizard.tsx` disable comment report as a missing rule.
> Copying that single config file into this worktree and re-running drops Gen-B's tracked-file lint
> errors from **17 to 1**. `[V]`
>
> So "lint FAIL" is accurate as a measurement but misleading as a judgement of Gen-B: **16 of the 17
> errors are a shared repo-level ESLint configuration gap that is already fixed on the other
> lineage, not Gen-B code quality.** Exactly one is a genuine defect in Gen-B's own new file —
> `sync-exam-demos.mjs:621:31`, `'html' is defined but never used`. The formatting failure below is
> unaffected by this and stands as written.

>>>>>>> origin/feat/genb-verification
**Formatting is the gate that actually blocks.** `pnpm verify` runs `format:check` **first**, so on
this branch the repo's own aggregate verification fails immediately. All 32 offending tracked files
are Gen-B's: 12 under `packages/exam-engine/src`, 2 under `packages/exam-scoring/src`, 15 under
`apps/web/src/lib/exam` and `apps/web/scripts`, plus `scripts/sync-exam-demos.mjs`. This is trivially
fixable (`pnpm format`) and I deliberately did not fix it — but as it stands, the branch does not
pass its own gate. `[V]`

**`db:types:check` is a false alarm, and I want to be precise about it.** It fails reproducibly, but
the generated types are **byte-identical** to the committed file (7970 bytes both; `cmp` reports no
difference). The script compares the committed file against the raw stdout of a nested
`pnpm exec supabase gen types`, and on this machine pnpm prepends
`WARN Unsupported engine: wanted {"node":"24.x"} (current {"node":"v25.9.0"})` **to that child's
stdout**, so the comparison fails on character 0. I confirmed this with an instrumented copy of the
script (the original was not modified): stdout length 8068 vs committed 7970, first difference at
index 0, and the extra 98 bytes are exactly the warning. **There is no schema drift.** This gate
would pass on the pinned Node 24.x in `.nvmrc`; my environment is Node v25.9.0. `[V]`

**E2E, split by origin.** The two passes are `exam-init-handshake.spec.ts` (**the exam spec this
branch adds — it passes**) and the Supabase-boundary readiness check. The four failures are stale
assertions in `shell.spec.ts` and `family-onboarding.spec.ts`: they expect a URL matching
`?auth=required` and the copy *"Synthetic prototype — not a real admissions decision"*, neither of
which exists in the app source any more (the app redirects to `/login?redirect=…`).
`git diff --stat dev -- apps/web/e2e/` shows **only** `exam-init-handshake.spec.ts` changed (+60
lines), so those two spec files are byte-identical to `dev` and the failures are inherited drift,
not Gen-B breakage. `[V]` for the diff and the missing contract; `[I]` that they fail identically on
`dev`, which I did not execute.

---

## 5. Runnable state

The app boots and there is a working end-to-end exam path. `[V]`

I ran it on port **3030** (avoiding 3010/3020) against the real local stack, with
`NEXT_PUBLIC_SUPABASE_URL` and a non-empty `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` supplied from
`supabase start` output. `proxy.ts` and `lib/env.ts` were **not modified**.

- `GET /api/health` → `{"application":"ready","databaseApi":"ready","status":"ready","syntheticOnly":true}`
- `GET /api/exam-items` → 200, **7540 items**, no answer keys
- `/dev/family-preview/exam`, `/dev/family-preview/assessment`, `/login` → 200; `/family/exam` → 307 (auth gate)
- `POST /api/exam-session` → 200, `{"persistence":"active"}`
- `POST /api/exam-submit` ×3 → 200, `"persisted":true`
- Cross-checked in SQL: all three rows landed in `app.exam_item_response` with the DB's own verdict, graded by `exam_verify_check_twice` — one of the 30 registry verifiers, executing in the real path
- Served bank items were auto-registered on demand per D-026 (`app.exam_item` grew 80 → 111), each with a server-only key
- Three `app_verdict` telemetry rows recorded the TypeScript verdict alongside

One note on the guard quality: an earlier run of the integration suite failed because a
`SUPABASE_SECRET_KEY` I had exported for a seeding script was still in the environment, and
`lib/env.ts` correctly refused to start — *"Elevated Supabase keys are forbidden in app runtime"*.
That was my error, not a defect; the guard did its job. With the variable cleared, all 10
integration tests passed. `[V]`

---

## 6. Governance exposure

**Both claims verified, and the decision-status finding is worse than reported.** `[V]`

`dev` (`2bc1fe8`) contains D-001 … D-019. This branch adds nine more, **none ratified**:

| ID | Title | Status |
|---|---|---|
| D-020 | Reconcile the question banks with the canonical item contract; lure taxonomy becomes two fields | **Proposed** |
| D-021 | `demoPath` is a required bank field and an optional contract field | **Proposed** |
| D-022 | Split the screener's core-metric registry into per-item observed and trace-derived metrics | **Proposed** (awaiting team-lead ratification) |
| D-023 | Replace the screener's fixed difficulty step with a reversal-indexed decaying step schedule | **Proposed** (awaiting team-lead ratification) |
| D-024 | Offer a difficulty-adjusted ability statistic as an alternative bracket driver; the accuracy default is unchanged | **Proposed** — "Nothing is switched on by this entry" |
| D-025 | Price the screener's age-band item preference in scale points instead of letting it override difficulty targeting | **Proposed** (awaiting team-lead ratification) |
| D-026 | Served bank items are registered into the database on demand, and the two per-item verdicts are both recorded | **Proposed** (awaiting team-lead ratification) |
| D-027 | The database is the single authority on per-item correctness: the per-type verifiers are ported to plpgsql | **Proposed** (awaiting team-lead ratification) |
| D-028 | The child-facing screener hides the per-child telemetry panel; `?telemetry=1` retains it for demonstration | **Proposed** (awaiting team-lead ratification) |

Adopting Gen-B therefore means adopting nine unratified decisions, including D-027 — the decision
that *defines* the database-authority architecture — and D-023/D-024/D-025, which by their own
recorded consequences **move every score**.

**R/H requirement citations — the claim is substantively correct.** Across
`packages/exam-engine/src`, `packages/exam-scoring/src`, `apps/web/src/lib/exam`, and all exam
migrations there is **exactly one** R/H citation:

```1:1:supabase/migrations/20260725160000_exam_item_registration.sql
-- Register a served bank item so a real session can be traced (serves R7/R11; BUILD_PLAN §6).
```

**R11 does not exist.** `docs/product/project-requirements.md` defines only R1–R10. So the single
citation in the entire exam workstream is half-invalid. Additionally:

<<<<<<< HEAD
> **Forward-pointer (2026-07-30):** accurate as written on 2026-07-28. R11 was stranded on unmerged
> branches, not invented; it was transcribed onto `dev` under D-032 — see
> `docs/governance/REQUIREMENT_ID_AUDIT.md`.


=======
- the three dedicated exam architecture documents — `EXAM_ADAPTIVE_BUILD_PLAN.md`,
  `EXAM_PERSISTENCE_NOTES.md`, `EXAM_VERIFIER_PORT_INVENTORY.md` — cite **zero** R/H IDs;
- `docs/product/FEATURE_TO_REQUIREMENT_MAP.md`, the repo's own development index, contains **no exam
  feature rows at all**, so no exam feature has a requirement mapping, status, or blocker recorded.

What the exam code *does* cite consistently is decisions and evidence: D-017, D-019, D-020, D-023 …
D-028 and E-072, E-075, E-076, E-081, E-084, E-090, E-091, E-092. All eight of those E IDs are
present in `docs/research/ASSUMPTIONS_AND_EVIDENCE.md`, so the evidence register is real and the
traceability that exists is decision-shaped rather than requirement-shaped. `[V]`

---

## What adopting this stack would and would not give you

Based only on what I measured.

**Would give you:**

- A test suite that genuinely passes today: **738 executing JS/TS tests** (728 + 10 integration) and
  **465 pgTAP assertions**, with **20 migrations that apply cleanly** from scratch.
- Per-item correctness decided in PostgreSQL by **30 registered per-type verifiers**, all executing,
  cross-checked against the TypeScript implementation on **2268/2268 generated cases across 63
  served types** — with a re-runnable harness (`pnpm exam:verify:diff`) to keep them honest.
- A real answer-key firewall, not an aspirational one: RLS forced on 18/18 tables, keys in a single
  column, no client grants to the `app` schema, one exposed schema, a single audited projection
  function, and **zero key fields across 7540 items served over HTTP**.
- A forgery-resistant scoring path: the composite is computed from the database's own stored
  verdicts, and the request body's `scoredItems` is ignored — with integration tests asserting it.
- A booting app with a working end-to-end exam path, on-demand item registration, and clean
  `db:lint`, `security:scan`, and `boundaries:check`.

**Would not give you:**

- **A green build.** `pnpm verify` fails at its first step. `format:check` fails on 32 tracked files
  and `lint` on 17 errors, 16 of them in a file this branch introduced.
- **A settled architecture.** Nine decisions (D-020…D-028) are Proposed and none ratified, including
  the one that defines the database-authority design.
- **Requirement traceability for the exam.** One citation exists and it references a requirement ID
  that does not exist; no exam feature appears in the requirement map.
- **A single implementation of correctness.** There are two — plpgsql and TypeScript — agreeing today
  and kept in step by a harness. That is a maintenance obligation, not a solved problem.
- **A test count you can quote as a contract.** 728 is partly a function of the 66 bank fixture files
  on disk; it moves when fixtures move.
- **Working demo seed data for every type.** 20 of 80 seeded items can never grade correct. The
  served bank path is unaffected.
- **Any validated measurement.** Every item is `syntheticOnly: true`, `validated: false`. Nothing
  here is evidence that the screener measures giftedness; it is evidence that the plumbing is sound.

---

## What I could not determine

1. **Whether the 4 Playwright failures and the 1 inherited lint error also fail on `dev` when
   executed there.** I established that the spec files are byte-identical to `dev`, that the asserted
   URL contract and copy are absent from the app source, and that `eslint-plugin-react-hooks` is
   absent from `dev`'s manifests — but I did not check out `dev` to run them, per the
   no-branch-switching constraint. Inherited-not-introduced is an `[I]` inference from strong
   evidence, not a `[V]` measurement.
2. **Whether `db:types:check` and the two engine warnings would behave identically on Node 24.x.**
   I ran on Node **v25.9.0**; `.nvmrc` pins **24**. I proved the type comparison fails only because
   pnpm's engine warning pollutes the child's stdout and that the types are byte-identical, so it
   should pass on 24 — `[I]`, not `[V]`. Every other gate emitted the same warning without failing.
3. **Whether the 30 verifiers agree with the TypeScript tier beyond the sampled cases.** The
   differential samples up to 12 items per type (2268 cases). It is not exhaustive over the ~7540
   bank items, and it generates the "correct" response from the answer key rather than from
   observed child behaviour. `[V]` for what it covers; `[A]` for whole-bank equivalence.
4. **Whether the 465 pgTAP assertions are well-chosen.** I verified they execute and pass; I did not
   audit whether they assert the right properties, nor measure schema coverage.
5. **Whether the composite scores mean anything.** Out of scope and not measurable here: D-024's own
   text records that the accuracy bracket is miscalibrated and the follow-up remains open. Nothing
   is validated against any outcome.
6. **Any comparison to Gen-A.** I measured only Gen-B, by design. Gen-A's figures in the brief were
   taken as given `[A]`.
7. **The 4 failing e2e tests' underlying functionality.** They fail on assertions, so I cannot say
   from this evidence whether the onboarding flows themselves are healthy — only that the tests no
   longer describe the app.

---

## Environment and teardown

- Node **v25.9.0** (`.nvmrc` pins 24), pnpm 10.34.5, Docker 29.5.2, Supabase CLI 2.109.1.
- Local stack on ports 65421–65429 (`project_id = gt-selection-capstone`); app on **3030**.
- **Everything I started is stopped.** `supabase stop --no-backup` completed and no
  `gt-selection-capstone` container remains; the dev server is killed and port 3030 is free.
- A pre-existing, unrelated `supabase_*_mvp` stack (up 9 days, ports 54321–54324) belongs to another
  worktree. **I did not start it and did not stop it.** To stop it, run
  `supabase stop --project-id mvp` from the worktree that owns it.
- Synthetic/local data only. The only credentials used were the local stack's printed dev keys and
  the synthetic `admissions@example.test` fixture. No real credential was requested or supplied, and
  nothing was deployed.

---

# Appendix — exact commands and output

All commands run from the worktree root
`gt-worktrees/genb-verification` unless noted. Sequence: `pnpm install` → `supabase start` →
`supabase db reset` → tests → gates → app → teardown.

## A.0 Branch identity

```
$ git status --short --branch && git log --oneline -1 && git rev-list --count HEAD
## feat/genb-verification
699ddea Record the verified full-stack state: 30/30 verifiers in the database, a complete browser battery reconciled
404
```

Working tree clean; tree identical to `feat/exam-integration`.

## A.1 Install

```
$ pnpm install --frozen-lockfile
Packages: +487
Progress: resolved 487, reused 487, downloaded 0, added 487, done
Done in 2.4s using pnpm v10.34.5
```

## A.2 JS/TS test suite

```
$ pnpm -r --if-present run test

packages/exam-scoring test:  Test Files  5 passed (5)
packages/exam-scoring test:       Tests  71 passed (71)
packages/contracts test:  Test Files  8 passed (8)
packages/contracts test:       Tests  184 passed (184)
packages/exam-engine test:  Test Files  4 passed (4)
packages/exam-engine test:       Tests  112 passed (112)
packages/test-fixtures test:  Test Files  2 passed (2)
packages/test-fixtures test:       Tests  18 passed (18)
apps/web test:  Test Files  24 passed (24)
apps/web test:       Tests  343 passed (343)
apps/web test:    Duration  284.01s
```

**71 + 184 + 112 + 18 + 343 = 728 passed, 0 failed, 0 skipped. 43 test files.**

### A.2b Static vs runtime, per file (contracts)

```
$ cd packages/contracts && pnpm exec vitest run --reporter=json --outputFile=/tmp/contracts.json

packages/contracts per-file RUNTIME test counts:
   137  bank-conformance.test.ts
    16  contracts.test.ts
    14  onboarding-contract.test.ts
     4  correction-contract.test.ts
     4  replay-contract.test.ts
     4  review-transition.test.ts
     3  review-pending.test.ts
     2  snapshot-contract.test.ts
  total runtime: 184

STATIC it/test declaration counts for the same files:
  5  bank-conformance.test.ts      <-- 5 static -> 137 runtime
  12 contracts.test.ts
  4  correction-contract.test.ts
  13 onboarding-contract.test.ts
  4  replay-contract.test.ts
  3  review-pending.test.ts
  4  review-transition.test.ts
  2  snapshot-contract.test.ts
```

```
$ ls research/exam-question-types/banks | wc -l
66
```

66 banks × 2 tests + 1 standalone + 4 from `it.each(SERVER_ONLY_FIELDS)` = **137**. Exact.

### A.2c Static declaration totals per project

```
$ rg -c --no-filename -e "^\s*(it|test)(\.each|\.skip|\.todo|\.only)?\s*[\(\`]" <project> \
    -g '!node_modules' -g '*.test.ts' -g '*.test.tsx' -g '*.spec.ts' | awk '{s+=$1} END {print s}'

packages/contracts     47      packages/exam-engine   58
packages/exam-scoring  71      packages/test-fixtures 18
apps/web              264      TOTAL                 458
```

### A.2d Integration suite (not run by `pnpm test`)

`apps/web/vitest.config.ts` excludes `src/**/*.integration.test.ts`.

```
$ export NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:65421'
$ export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
$ export GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED=true GT_LOCAL_SYNTHETIC_PROJECT_ID=gt-selection-capstone
$ export GT_EXAM_PERSISTENCE_ENABLED=true
$ export GT_EXAM_PROCTOR_EMAIL='admissions@example.test' GT_EXAM_PROCTOR_PASSWORD='Synthetic-Only-2026!'
$ unset SUPABASE_SECRET_KEY          # required: lib/env.ts fails closed on elevated keys
$ pnpm --filter @gt-selection/web run test:integration

 Test Files  3 passed (3)
      Tests  10 passed (10)
   Duration  1.03s
```

Guard demonstration — with `SUPABASE_SECRET_KEY` still exported, the app refuses to start:

```
Error: Elevated Supabase keys are forbidden in app runtime: SUPABASE_SECRET_KEY
 ❯ assertNoElevatedRuntimeKeys src/lib/env.ts:72:11
```

## A.3 Database bring-up, migrations, pgTAP

```
$ pnpm exec supabase start
{ "API_URL": "http://127.0.0.1:65421",
  "DB_URL": "postgresql://postgres:postgres@127.0.0.1:65422/postgres",
  "PUBLISHABLE_KEY": "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH", ... }
```

```
$ pnpm exec supabase db reset --local
Resetting local database... Recreating database... Initialising schema...
Applying migration 20260718160000_bootstrap_schemas.sql...
Applying migration 20260720061000_onboarding_cycle.sql...
Applying migration 20260720062000_onboarding_idempotency.sql...
Applying migration 20260720063000_onboarding_application.sql...
Applying migration 20260720064000_save_application_draft.sql...
NOTICE (42710): extension "pgcrypto" already exists, skipping
Applying migration 20260720065000_submit_application.sql...
Applying migration 20260720066000_get_application_status.sql...
Applying migration 20260720067000_milestone_a_storage.sql...
Applying migration 20260720068000_profile_directory_api.sql...
Applying migration 20260720069000_expanded_application_api.sql...
Applying migration 20260724070000_family_self_signup_role.sql...
NOTICE (00000): trigger "assign_default_family_role_before_insert" ... does not exist, skipping
Applying migration 20260724130000_exam_adaptive_core.sql...
Applying migration 20260724130100_exam_adaptive_api.sql...
Applying migration 20260724130200_exam_adaptive_seed.sql...
Applying migration 20260725050000_exam_outcome_ownership.sql...
Applying migration 20260725160000_exam_item_registration.sql...
Applying migration 20260725170000_exam_verify_plpgsql.sql...
Applying migration 20260725174500_exam_verify_vbatch1.sql...
Applying migration 20260725181742_exam_verify_moderate_batch.sql...
Applying migration 20260725183000_exam_verify_awkward_batch.sql...
Seeding data from supabase/seed.sql... Restarting containers...
Finished supabase db reset on branch main.
```

**20 of 20 applied. No errors.**

```
$ pnpm exec supabase test db --local
.../000_scaffold.test.sql ........................ ok
.../010_onboarding_cycle.test.sql ................ ok
.../020_onboarding_idempotency.test.sql .......... ok
.../030_onboarding_application_schema.test.sql ... ok
.../040_onboarding_rls.test.sql .................. ok
.../050_save_application_draft.test.sql .......... ok
.../060_submit_application.test.sql .............. ok
.../070_get_application_status.test.sql .......... ok
.../080_milestone_a_schema_security.test.sql ..... ok
.../090_profile_directory_api.test.sql ........... ok
.../100_application_roundtrip_firewall.test.sql .. ok
.../110_idempotency_directory_expiry.test.sql .... ok
.../120_exam_adaptive_backend.test.sql ........... ok
.../121_exam_answer_key_firewall.test.sql ........ ok
.../122_exam_outcome_ownership.test.sql .......... ok
.../123_exam_verify_plpgsql.test.sql ............. ok
.../124_exam_scorer_input_ownership.test.sql ..... ok
.../124_exam_verify_awkward_batch.test.sql ....... ok
.../124_exam_verify_moderate_batch.test.sql ...... ok
.../130_exam_verify_vbatch1.test.sql ............. ok
All tests successful.
Files=20, Tests=465,  1 wallclock secs
Result: PASS
```

`plan(n)` per file, summed independently before running: 11+5+6+20+8+15+13+6+35+18+64+3+46+26+30+30
+10+43+40+36 = **465**. Matches the executed count. All 20 files are `.test.sql`; **no
`.pending.sql` files exist**.

## A.4 Verifier count and execution

Helper used throughout (`tmp-verification/psql.sh`):

```bash
exec docker exec -i supabase_db_gt-selection-capstone psql -U postgres -d postgres "$@"
```

```
$ ./tmp-verification/psql.sh -At -c "select count(*) from pg_proc p join pg_namespace n \
    on n.oid=p.pronamespace where n.nspname='app' and p.proname like 'exam_verify%';"
34
$ ./tmp-verification/psql.sh -At -c "select count(*) from app.exam_verifier_registry;"
30
$ ./tmp-verification/psql.sh -At -c "select count(distinct verifier_fn) from app.exam_verifier_registry;"
30
```

34 = 30 per-type + `exam_verify_response` (dispatcher) + 3 generic (`exam_verify_keyed`,
`exam_verify_placement_tolerance`, `exam_verify_constructed_value`).

```
$ ./tmp-verification/psql.sh -c "select verifier_fn, string_agg(type_code, ', ') \
    from app.exam_verifier_registry group by 1 order by 1;"
 exam_verify_bind         | WM-bind-01            exam_verify_pathforge    | GB-PATHFORGE-01
 exam_verify_bubble       | WM-bubble-01          exam_verify_pipes        | SPA-PIPES-01
 exam_verify_check_twice  | CX-check-01           exam_verify_punch        | SPA-PUNCH-01
 exam_verify_concept      | FLU-CONCEPT-01        exam_verify_quant_mix    | QUANT-MIX-01
 exam_verify_corsi        | WM-corsi-01           exam_verify_robopath     | GB-ROBOPATH-01
 exam_verify_curious      | CX-curious-02         exam_verify_scene        | SPA-SCENE-01
 exam_verify_debate       | GB-DEBATE-01          exam_verify_sense        | VER-SENSE-01
 exam_verify_evidence     | VER-EVIDENCE-01       exam_verify_shapefit     | GB-SHAPEFIT-01
 exam_verify_explore      | GB-EXPLORE-01         exam_verify_tangram      | SPA-TANGRAM-01
 exam_verify_filter       | GB-FILTER-01          exam_verify_track        | GB-TRACK-01
 exam_verify_gate         | WM-gate-01            exam_verify_view         | SPA-VIEW-01
 exam_verify_gridcopy     | FLU-GRIDCOPY-01       exam_verify_wordforge    | GB-WORDFORGE-01
 exam_verify_gridflash    | WM-gridflash-01       exam_verify_wordladder   | GB-WORDLADDER-01
 exam_verify_hiddencube   | SPA-HIDDENCUBE-01     exam_verify_xplane       | SPA-XPLANE-01
 exam_verify_matrix_build | FLU-MATRIXBUILD-01
 exam_verify_maze         | SPA-MAZE-01                                    (30 rows)
```

Execution probe (`tmp-verification/probe_verifiers.sql`) — calls all 30 and checks the verdict shape:

```
$ ./tmp-verification/psql.sh -f - < tmp-verification/probe_verifiers.sql
NOTICE:  OK exam_verify_bind (WM-bind-01): correct=false
... (30 lines) ...
NOTICE:  VERIFIER EXECUTION PROBE: ok=30 fail=0
```

## A.5 DB-vs-TypeScript differential (the strongest evidence)

```
$ pnpm run exam:verify:diff        # tsx apps/web/scripts/verifier-differential.ts
TypeScript verifier vs app.exam_verify_response
63 served types - up to 12 bank items each - 3 responses per item (correct / wrong / skipped)
...
FLU-MATRIX-01     fluid_reasoning keyed             exam_verify_keyed        ok 36 36 12 0
QUANT-SERIES-01   quantitative    keyed             exam_verify_keyed        ok 36 36 12 0
QUANT-MIX-01      quantitative    per_type          exam_verify_quant_mix    ok 36 36 12 0
SPA-FOLDNET-01    spatial         keyed             exam_verify_keyed        ok 36 36 12 0
... (63 rows, every one "ok") ...
--------------------------------------------------------------------------------------------
per-type verifiers ported: 30/30 served (30/31 including the blocked CX-achieve-02)
generic verifiers: 33 types, 1188/1188 cases agree, 396 of them scored correct on both sides
ported per-type: 1080/1080 cases agree, 360 of them scored correct on both sides
PENDING (database still falls back to the keyed default): 0/0 cases happen to agree
WHOLE RUN: 2268/2268 cases agree across all 63 served types
RESULT: every ported and generic type agrees.
$ echo $?
0
```

## A.6 RLS and answer-key firewall

```
$ ./tmp-verification/psql.sh -c "select c.relname, c.relrowsecurity as rls_enabled, \
    c.relforcerowsecurity as rls_forced from pg_class c join pg_namespace n \
    on n.oid=c.relnamespace where n.nspname='app' and c.relkind='r' and c.relname like 'exam%';"
        relname         | rls_enabled | rls_forced
 exam_item              | t           | t
 exam_item_response     | t           | t
 exam_lexicon           | t           | t
 exam_participant       | t           | t
 exam_policy            | t           | t
 exam_question_type     | t           | t
 exam_session           | t           | t
 exam_session_outcome   | t           | t
 exam_telemetry_event   | t           | t
 exam_verifier_registry | t           | t

$ ./tmp-verification/psql.sh -At -c "select 'app tables=' || count(*) || ' rls_enabled=' || \
    count(*) filter (where relrowsecurity) || ' rls_forced=' || \
    count(*) filter (where relforcerowsecurity) from pg_class c join pg_namespace n \
    on n.oid=c.relnamespace where n.nspname='app' and c.relkind='r';"
app tables=18 rls_enabled=18 rls_forced=18
```

```
$ ./tmp-verification/psql.sh -c "select table_schema, table_name, column_name \
    from information_schema.columns where column_name ilike '%answer_key%';"
 table_schema | table_name | column_name
 app          | exam_item  | answer_key            (1 row -- the only one repo-wide)

$ ./tmp-verification/psql.sh -c "select grantee, privilege_type, count(*) \
    from information_schema.role_table_grants where table_schema='app' \
    and grantee in ('anon','authenticated','public','service_role') group by 1,2;"
 (0 rows)

$ ./tmp-verification/psql.sh -c "select nspname, nspacl from pg_namespace \
    where nspname in ('app','api');"
 api | api_executor=UC/api_executor | authenticated=U/api_executor
 app | app_owner=UC/app_owner | api_executor=U/app_owner

$ rg -n 'schemas' supabase/config.toml
13:schemas = ["api"]
```

Only `api` is exposed to PostgREST; `anon` has no USAGE on `api` at all; no client role can reach
`app`.

```
$ ./tmp-verification/psql.sh -At -c "select p.proname from pg_proc p join pg_namespace n \
    on n.oid=p.pronamespace where n.nspname='api' and p.prosrc ilike '%answer_key%';"
exam_register_item        # the only api function referencing the key; INSERT-only (D-026)
```

Its return payload carries no key:

```
  return jsonb_build_object(
    'apiVersion', 'v1', 'syntheticOnly', true,
    'data', jsonb_build_object('itemId', v_item_id, 'typeCode', v_type_code,
                              'registered', not v_already, 'alreadyPresent', v_already), ...
```

The single served-item projection (`app.exam_served_item_json`) — no `answer`, no `scoring`:

```
  select jsonb_build_object('itemId', i.item_id, 'typeCode', i.type_code, 'domain', i.domain,
    'difficulty', i.difficulty, 'ageBands', to_jsonb(i.age_bands), 'content', i.content,
    'demoPath', qt.demo_path, 'syntheticOnly', true, 'validated', false)
  from app.exam_item i join app.exam_question_type qt on qt.type_code = i.type_code
  where i.item_id = p_item_id
```

Role-based read attempts (`tmp-verification/probe_firewall.sql`):

```
NOTICE:  BLOCKED (anon app.exam_item): permission denied for schema app
NOTICE:  BLOCKED (anon api.exam_register_item): permission denied for schema api
NOTICE:  BLOCKED (authenticated app.exam_item): permission denied for schema app
```

Projection leak checks (`tmp-verification/probe_authority.sql`):

```
=== does the served projection leak any answer_key value? ===
 items_whose_served_json_contains_key_text
                                         0
=== does served json expose answer/answer_key/answerKey/scoring fields? ===
 items_with_answer_or_scoring_field
                                  0
```

HTTP-level recursive key scan of the live `/api/exam-items` payload
(`tmp-verification/scan-http-keys.mjs`, key *names* only so option text cannot false-positive):

```
$ node tmp-verification/scan-http-keys.mjs /tmp/genb-items.json
items scanned: 7540
distinct object keys anywhere in payload: 519
ANSWER-KEY-LIKE KEY NAMES FOUND: [["key",18976]]
note - structural "key" fields (bin/option identifiers): [["key",18976]]
```

The only match is the structural `key` on bins/options. No `answer`, `answerKey`, `answer_key`,
`correctKey`, `solution`, or `scoring` field name appears anywhere in 7540 items.

## A.7 Database as the authority

```
$ ./tmp-verification/psql.sh -At -c "select prosrc from pg_proc ... 'exam_submit_response';" | rg -n 'exam_verify_response'
117:  v_scored := app.exam_verify_response(p_item_id, p_raw_answer);
118:  v_correct := (v_scored ->> 'correct')::boolean;

$ ./tmp-verification/psql.sh -At -c "select prosrc from pg_proc ... 'exam_scorer_input_json';"
        'itemId', r.item_id, 'typeCode', r.type_code, 'domain', r.domain,
        'difficulty', r.difficulty, 'correct', r.correct, 'score', r.score, 'metrics', r.metrics
```

`apps/web/src/app/api/exam-results/route.ts`, lines 29-31:

```
 * from `app.exam_scorer_input_json` through `api.exam_get_scoring_inputs` and
 * that is what is scored, returned, and stored. The `scoredItems` array in the
 * request body is NOT scored. It used to be (E-084), which made the composite ...
```

The dual-verdict caveat — `apps/web/src/app/api/exam-submit/route.ts`:

```
  7: import { verify } from '@/lib/exam/verifiers';
132:  const verdict = parsed.data.skipped ? { correct: false } : verify(item, response);
162:          kind: 'app_verdict',
```

### Seed-data defect, scoped

```
$ ./tmp-verification/psql.sh -f - < tmp-verification/probe_authority2.sql
    type_code    | items | in_verifier_registry |        resolves_to
 FLU-MATRIX-01   |    20 | f                    | (falls through to generic)
 QUANT-SERIES-01 |    20 | f                    | (falls through to generic)
 SPA-FOLDNET-01  |    20 | f                    | (falls through to generic)
 VER-ANALOGY-01  |    20 | f                    | (falls through to generic)

NOTICE: NOT-GRADED-CORRECT item=03c8c00e... type=QUANT-SERIES-01 key={"solution": 70}
        verdict={"mode":"computed_solver","correct":false,"verifier":"exam_verify_keyed"}
NOTICE: TOTAL=80 correct_key_accepted=60 correct_key_REJECTED=20 wrong_answer_accepted=0
```

Cause and scope — the seed synthesizes a key shape the generic verifier cannot read, while the
*bank* items for the same type use `correctKey` and grade correctly:

```
$ rg -n 'solution' supabase/migrations/20260724130200_exam_adaptive_seed.sql
85:    when 'computed_solver' then jsonb_build_object('solution', g.lvl * 5)

$ head -1 research/exam-question-types/banks/QUANT-SERIES-01.jsonl   # the served path
answer:  {"correctKey":"C", ...}
scoring: {"mode":"deterministic_key"}

$ ls research/exam-question-types/banks | rg 'VER-ANALOGY'
(none -- seed-only legacy type)
```

## A.8 Gates

```
$ pnpm run typecheck
packages/contracts typecheck: Done      packages/db-types typecheck: Done
packages/exam-engine typecheck: Done    packages/exam-scoring typecheck: Done
packages/test-fixtures typecheck: Done  apps/web typecheck: Done          # PASS
```

```
$ pnpm run lint
apps/web/src/components/family/apply-wizard.tsx
  197:5  error  Definition for rule 'react-hooks/exhaustive-deps' was not found

scripts/sync-exam-demos.mjs
   43:15  error  'process' is not defined          no-undef
   44:18  error  'process' is not defined          no-undef
  594:7   error  'console' is not defined          no-undef
  595:7   error  'process' is not defined          no-undef
  597:5   error  'console' is not defined          no-undef
  610:5   error  'console' is not defined          no-undef
  618:5   error  'console' is not defined          no-undef
  621:31  error  'html' is defined but never used  @typescript-eslint/no-unused-vars
  632:3   error  'console' is not defined          no-undef
  634:5   error  'console' is not defined          no-undef
  642:3   error  'console' is not defined          no-undef
  643:28  error  'console' is not defined          no-undef
  647:3   error  'console' is not defined          no-undef
  650:5   error  'console' is not defined          no-undef
  657:3   error  'console' is not defined          no-undef
  658:3   error  'process' is not defined          no-undef

✖ 17 problems (17 errors, 0 warnings)
 ELIFECYCLE  Command failed with exit code 1          # FAIL
```

Provenance of the lint failures:

```
$ git cat-file -e dev:scripts/sync-exam-demos.mjs || echo "NEW on this branch"
NEW on this branch
$ git log --oneline --diff-filter=A -1 -- scripts/sync-exam-demos.mjs
d33ffdd feat(exam): generated type registry + repeatable demo sync

$ git cat-file -e dev:apps/web/src/components/family/apply-wizard.tsx && echo "EXISTS on dev"
EXISTS on dev
$ git show dev:apps/web/src/components/family/apply-wizard.tsx | sed -n '197p'
    // eslint-disable-next-line react-hooks/exhaustive-deps
$ git show dev:package.json | rg 'react-hooks' || echo "dev: plugin NOT present"
dev: plugin NOT present
```

```
$ pnpm run build
apps/web build: ✓ Compiled successfully in 1769ms
apps/web build:   Finished TypeScript in 2.0s
apps/web build: ✓ Generating static pages using 17 workers (10/10) in 86ms
apps/web build: Route (app)  -- 26 routes incl. /api/exam-items /api/exam-session
                                /api/exam-submit /api/exam-results /family/exam
apps/web build: Done                                                  # PASS
```

Non-fatal warning (dynamic `process.cwd()` import in `src/lib/exam/bank-loader.ts`) did not fail the
build.

```
$ pnpm run db:lint
Linting schema: app / api / public
No schema errors found                                                # PASS

$ pnpm run security:scan
Elevated-key and public-environment boundaries verified.              # PASS

$ pnpm run boundaries:check
Workspace dependency boundaries verified.                             # PASS
```

```
$ pnpm exec prettier --check .        # excluding my tmp-verification scratch files
32 tracked files fail, ALL Gen-B exam code:
  apps/web/scripts/exam-reconcile-session.ts        packages/exam-engine/src/config.ts
  apps/web/scripts/verifier-differential.ts        packages/exam-engine/src/coverage.ts
  apps/web/src/lib/exam/adaptive.test.ts           packages/exam-engine/src/derived.ts
  apps/web/src/lib/exam/demo-protocol.test.ts      packages/exam-engine/src/engine.test.ts
  apps/web/src/lib/exam/registry.generated.ts      packages/exam-engine/src/index.ts
  apps/web/src/lib/exam/served-boundary.test.ts    packages/exam-engine/src/real-bank.test.ts
  apps/web/src/lib/exam/telemetry-panel-gate.test.ts packages/exam-engine/src/selection.ts
  apps/web/src/lib/exam/verifiers/fluid-verifiers.test.ts packages/exam-engine/src/state.ts
  apps/web/src/lib/exam/verifiers/fluid.ts         packages/exam-engine/src/testing/real-bank.ts
  apps/web/src/lib/exam/verifiers/generic.ts       packages/exam-engine/src/testing/synthetic-bank.ts
  apps/web/src/lib/exam/verifiers/index.ts         packages/exam-engine/src/types.ts
  apps/web/src/lib/exam/verifiers/quantitative-verifiers.test.ts packages/exam-engine/src/update.ts
  apps/web/src/lib/exam/verifiers/quantitative.ts  packages/exam-scoring/src/derived-metrics.test.ts
  apps/web/src/lib/exam/verifiers/spatial-verifiers.test.ts packages/exam-scoring/src/derived-metrics.ts
  apps/web/src/lib/exam/verifiers/spatial.ts       scripts/sync-exam-demos.mjs
  apps/web/src/lib/exam/verifiers/verbal-verifiers.test.ts
  apps/web/src/lib/exam/verifiers/verbal.ts
 ELIFECYCLE  Command failed with exit code 1                          # FAIL
```

`scripts/verify.ts` runs `format:check` first, so `pnpm verify` fails at step 1:

```
56:run('pnpm', ['format:check']);   <-- fails here
57:run('pnpm', ['lint']);           <-- would also fail
58:run('pnpm', ['typecheck']);   59:run('pnpm', ['test']);  ...
```

### `db:types:check` — environmental false alarm, proven

```
$ pnpm run db:types:check
Error: Generated database types drifted. Run `pnpm db:types` and commit the result.   # FAIL

$ pnpm exec supabase gen types typescript --local --schema api > /tmp/fresh.ts
$ cmp packages/db-types/src/database.generated.ts /tmp/fresh.ts && echo "IDENTICAL bytes"
IDENTICAL bytes
$ wc -c packages/db-types/src/database.generated.ts /tmp/fresh.ts
7970  /  7970
```

Instrumented copy of the script (original untouched):

```
$ pnpm exec tsx tmp-verification/diagnose-types-check.ts
child status: 0
stdout length: 8068
stdout head: " WARN  Unsupported engine: wanted: {\"node\":\"24.x\"} (current: {\"node\":\"v25.9.0\"...
committed length: 7970
RESULT: DIFFERENT, first difference at index 0
```

The 98-byte difference is pnpm's engine warning written to the child's **stdout**, which the script
concatenates into its comparison. **No schema drift.** Node here is v25.9.0; `.nvmrc` pins 24.

### Playwright e2e

```
$ PLAYWRIGHT_BASE_URL='http://127.0.0.1:3030' pnpm exec playwright test --reporter=list
  ✓ 1 [chromium] › e2e/exam-init-handshake.spec.ts:25:1 › no served item waits for an init
                    the host already sent (22.7s)               <-- the exam spec Gen-B adds
  ✓ 4 [chromium] › e2e/shell.spec.ts:14:1 › reports the local Supabase boundary as ready (40ms)
  ✘ 3 [chromium] › e2e/family-onboarding.spec.ts:16:3 › gates the apply flow behind the session
  ✘ 2 [chromium] › e2e/shell.spec.ts:3:1 › renders the linked synthetic application shell
  ✘ 5 [chromium] › e2e/family-onboarding.spec.ts:26:3 › completes the application and reaches
                    the dashboard
  ✘ 6 [chromium] › e2e/shell.spec.ts:24:1 › keeps role surfaces behind the server-side session
                    boundary
  4 failed / 2 passed (23.2s)

  Error: expect(page).toHaveURL(expected) failed
    Expected pattern: /\?auth=required$/
    Received string:  "http://127.0.0.1:3030/login?redirect=%2Ffamily%2Fapply"

  Error: expect(locator).toBeVisible() failed
    waiting for getByText('Synthetic prototype — not a real admissions decision')
```

Both asserted contracts are absent from the app source, and the two failing spec files are identical
to `dev`:

```
$ rg -n 'auth=required' apps/web/src           -> NOT IMPLEMENTED in app source
$ rg -n 'Synthetic prototype — not a real admissions decision' apps/web/src -> NOT PRESENT
$ git diff --stat dev -- apps/web/e2e/
 apps/web/e2e/exam-init-handshake.spec.ts | 60 ++++++++++++++++++++
 1 file changed, 60 insertions(+)          # only the exam spec differs from dev
```

## A.9 App boot and live end-to-end battery

```
$ cd apps/web && pnpm exec next dev --hostname 127.0.0.1 --port 3030
  ▲ Next.js  -  Local: http://127.0.0.1:3030   Ready in ...
```

```
$ for p in /api/health /dev/family-preview /dev/family-preview/exam \
           /dev/family-preview/assessment /family/exam /login /api/exam-items; do
    curl -s -o /dev/null -w '%{http_code}  '"$p"'\n' http://127.0.0.1:3030$p; done
200  /api/health
200  /dev/family-preview
200  /dev/family-preview/exam
200  /dev/family-preview/assessment
307  /family/exam                      # auth gate
200  /login
200  /api/exam-items

$ curl -s http://127.0.0.1:3030/api/health
{"application":"ready","databaseApi":"ready","status":"ready","syntheticOnly":true}
```

Live battery (`tmp-verification/e2e-probe.mjs`):

```
$ node tmp-verification/e2e-probe.mjs
1. POST /api/exam-session -> 200 {"ok":true,"examSessionId":"c66fca00-...","persistence":"active"}
2. GET  /api/exam-items   -> 200 items: 7540
3. POST /api/exam-submit x3 ->
   200 CX-check-01 {"ok":true,"correct":false,"score":0,"difficulty":1.08,
                    "metrics":{"M-ACC":0,"M-ERRTYPE":0.4},"persisted":true,
                    "syntheticOnly":true,"validated":false}
   200 CX-check-01 {... "persisted":true ...}
   200 CX-check-01 {... "persisted":true ...}
```

Database cross-check of that same session:

```
$ ./tmp-verification/psql.sh -c "select r.order_no, r.type_code, r.correct as db_correct, \
    r.score, r.metrics, (select verifier_fn from app.exam_verifier_registry g \
    where g.type_code=r.type_code) as db_verifier_used from app.exam_item_response r \
    where r.session_id='c66fca00-6375-4fed-9f1d-e7c9887744be' order by r.order_no;"
 order_no |  type_code  | db_correct | score |            metrics             |  db_verifier_used
        1 | CX-check-01 | f          |     0 | {"M-ACC": 0, "M-ERRTYPE": 0.4} | exam_verify_check_twice
        2 | CX-check-01 | f          |     0 | {"M-ACC": 0, "M-ERRTYPE": 0.4} | exam_verify_check_twice
        3 | CX-check-01 | f          |     0 | {"M-ACC": 0, "M-ERRTYPE": 0.4} | exam_verify_check_twice

$ ./tmp-verification/psql.sh -At -c "select count(*) from app.exam_item;"
111        # was 80 from seed -> served bank items registered on demand (D-026)

$ ./tmp-verification/psql.sh -c "select kind, count(*) from app.exam_telemetry_event \
    where session_id='c66fca00-...' group by 1;"
 app_verdict | 3        # the TypeScript verdict recorded alongside the DB's own
```

A registry verifier (`exam_verify_check_twice`) executed in the real request path, and the database
recorded its own verdict independently of the app tier.

## A.10 Governance

```
$ git show dev:docs/governance/DECISION_LOG.md | rg -o 'D-0[0-9][0-9]' | sort -u | tr '\n' ' '
D-001 D-002 D-003 D-004 D-005 D-006 D-007 D-008 D-009 D-010 D-011 D-012 D-013 D-014 D-015 D-016
D-017 D-018 D-019
$ git log --oneline -1 dev
2bc1fe8 Merge feat/governance-lambda-decision into dev (D-019 exam scoring/replay Lambda + E-072)

$ rg -o 'D-0[0-9][0-9]' docs/governance/DECISION_LOG.md | sort -u | tail -9 | tr '\n' ' '
D-020 D-021 D-022 D-023 D-024 D-025 D-026 D-027 D-028
```

Statuses (all nine):

```
### D-020 ... **Status:** Proposed
### D-021 ... **Status:** Proposed
### D-022 ... **Status:** Proposed (awaiting team-lead ratification)
### D-023 ... **Status:** Proposed (awaiting team-lead ratification)
### D-024 ... **Status:** Proposed (awaiting team-lead ratification). **Nothing is switched on ...**
### D-025 ... **Status:** Proposed (awaiting team-lead ratification)
### D-026 ... **Status:** Proposed (awaiting team-lead ratification)
### D-027 ... **Status:** Proposed (awaiting team-lead ratification)
### D-028 ... **Status:** Proposed (awaiting team-lead ratification)
```

R/H citations:

```
$ rg -l -e '\bR([1-9]|10)\b' -e '\bH([1-9]|10)\b' \
    packages/exam-engine/src packages/exam-scoring/src apps/web/src/lib/exam supabase/migrations
supabase/migrations/20260725160000_exam_item_registration.sql        # the only file

$ rg -n -e '\bR([1-9]|10)\b' supabase/migrations/20260725160000_exam_item_registration.sql
1:-- Register a served bank item so a real session can be traced (serves R7/R11; BUILD_PLAN §6).

$ rg -o '\bR([1-9]|1[0-9])\b' docs/product/project-requirements.md | sort -u | tr '\n' ' '
R1 R10 R2 R3 R4 R5 R6 R7 R8 R9         # R11 is NOT defined

$ for f in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md \
           docs/architecture/EXAM_PERSISTENCE_NOTES.md \
           docs/architecture/EXAM_VERIFIER_PORT_INVENTORY.md; do
    echo "$(rg -c -e '\bR([1-9]|10)\b' -e '\bH([1-9]|10)\b' $f || echo 0)  $f"; done
0  docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md
0  docs/architecture/EXAM_PERSISTENCE_NOTES.md
0  docs/architecture/EXAM_VERIFIER_PORT_INVENTORY.md

$ rg -n -i 'exam|screener|verifier' docs/product/FEATURE_TO_REQUIREMENT_MAP.md
(no exam feature rows)
```

Evidence IDs cited by exam code all exist in the register:

```
E-072 ✓  E-075 ✓  E-076 ✓  E-081 ✓  E-084 ✓  E-090 ✓  E-091 ✓  E-092 ✓
  (present in docs/research/ASSUMPTIONS_AND_EVIDENCE.md)
```

## A.11 Teardown

```
$ kill <dev-server-pid> && pkill -f 'next dev ... --port 3030'
$ lsof -nP -iTCP:3030 -sTCP:LISTEN            # (no output -- free)

$ pnpm exec supabase stop --no-backup
Stopping containers...
Stopped supabase local development setup.

$ docker ps --format '{{.Names}}' | grep gt-selection-capstone
(none -- clean)

$ docker ps --format '{{.Names}}\t{{.Status}}'
supabase_studio_mvp     Up 9 days (healthy)      # pre-existing, another worktree.
supabase_pg_meta_mvp    Up 9 days (healthy)      # NOT started and NOT stopped by me.
supabase_storage_mvp    Up 9 days (healthy)
supabase_rest_mvp       Up 9 days
supabase_realtime_mvp   Up 9 days (healthy)
supabase_inbucket_mvp   Up 9 days (healthy)
supabase_auth_mvp       Up 9 days (healthy)
supabase_kong_mvp       Up 9 days (healthy)
supabase_db_mvp         Up 9 days (healthy)
```

Nothing I started is still running. The `_mvp` stack predates this session by nine days and belongs
to a different worktree; stop it with `supabase stop --project-id mvp` from that worktree if desired.

## A.12 Scratch files

Eight probe scripts were written under `tmp-verification/` and **deliberately not committed** — the
directory is scratch, and every result above is reproducible either from a command pasted in this
appendix or from a gate the repo already ships (`pnpm exam:verify:diff`, `pnpm db:test`). They remain
untracked in the worktree if anyone wants to inspect them: `psql.sh` (the `docker exec … psql`
wrapper used by every SQL block above), `probe_verifiers.sql` (invokes all 30 registry verifiers and
checks the verdict shape), `probe_firewall.sql` (`set role anon` / `authenticated` read attempts),
`probe_authority.sql` and `probe_authority2.sql` (projection-leak and correct/wrong discrimination
over the seeded items), `scan-http-keys.mjs` (recursive object-key scan of the `/api/exam-items`
payload), `e2e-probe.mjs` (the live HTTP battery), and `diagnose-types-check.ts` (the instrumented
copy that isolated the `db:types:check` stdout pollution).

**Verification of read-only discipline:** `git diff --stat` against the branch tip is **empty** — no
Gen-B source, migration, test, config, or documentation file was modified. `proxy.ts` and
`lib/env.ts` were left untouched as instructed, and no failing test was repaired. The only tracked
addition is this document.

