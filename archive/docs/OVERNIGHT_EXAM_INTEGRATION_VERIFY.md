# Overnight Verification — `feat/exam-integration` (adaptive-exam backend)

> **Born-synthetic. Loopback-only. Verification-only. NOT merged.**
>
> Independent re-run of the branch's own claims against a clean local synthetic stack.
> No migrations, RPCs, tests, or product code were modified. No hosted/live target was
> ever contacted; `GT_DEPLOY_MODE=hosted` was never set. Executed in an isolated git
> worktree on branch `feat/exam-integration-verify` (based on `feat/exam-integration`,
> tip `699ddea`). This document is the only file added; it is not promoted to `dev`,
> `staging`, or `main`.

- **Date:** 2026-07-27
- **Branch under test:** `feat/exam-integration` @ `699ddea` ("Record the verified full-stack
  state: 30/30 verifiers in the database, a complete browser battery reconciled")
- **Report branch:** `feat/exam-integration-verify` (isolated worktree; no merge)
- **Requirements served:** R11 (adaptive screener). **Decisions referenced:** D-027
  (server-authoritative per-item correctness), D-028 (telemetry-panel gate — *frontend*),
  D-029 (score-ownership split), D-006/D-011/D-012 (synthetic-only, loopback dev scope).
  **Evidence:** E-081 (verifier port), E-092 (server-only child lexicon).

---

## Verdict

**Claims hold.** On a clean-room loopback synthetic stack the branch's headline claims verify
end-to-end: all 20 migrations apply cleanly; pgTAP is **465/465 assertions across 20 files
(PASS, 0 failures)**; the workspace JS/TS suites are **728/728 tests across 43 files (0
failures)**; and the **"30/30 per-type verifiers ported to plpgsql"** claim is confirmed three
independent ways, including a cross-tier differential of **2268/2268 cases agreeing** with the
app-tier verifiers. Two honest clarifications below (the "30/30" denominator, and D-028 being a
frontend gate) refine wording, not correctness.

---

## Environment

| Item | Value |
|---|---|
| OS | macOS (darwin 25.5.0) |
| Docker | 29.6.1 (server 29.5.2), daemon healthy |
| Supabase CLI | 2.109.1 (pinned repo devDependency; run via `pnpm exec`, not global) |
| Node / pnpm | Node v25.9.0, pnpm 10.34.5 (`package.json` wants Node 24.x → **non-fatal warning only**) |
| Local stack | **Already running** as shared project `gt-selection-capstone` on **loopback** — API `http://127.0.0.1:65421`, DB `postgresql://…@127.0.0.1:65422/postgres` |
| Isolation | Separate `mvp` Supabase project (ports 54321–54324) was present and **left untouched** |

**Did local Supabase come up?** Yes. A shared loopback stack (project `gt-selection-capstone`)
was already up when the run began. Per the task's instruction to apply this branch's migrations
and to leave the stack stopped, I used the repo's canonical `pnpm db:reset` to clean-apply this
branch's exact migration set to that loopback instance, then stopped it at the end. All access
was loopback (`127.0.0.1`); no service-role key was used in any app runtime (pgTAP and the
differential harness connect directly to the loopback DB, and the harness itself hard-refuses any
non-loopback host).

---

## Commands run (exact)

```bash
# Isolated worktree (new branch based on the flagship branch)
git worktree add -b feat/exam-integration-verify <path>/gt-worktrees/exam-integration-verify feat/exam-integration

# Tooling + stack (loopback synthetic only)
pnpm install --frozen-lockfile
pnpm exec supabase status                 # confirm loopback endpoints
pnpm db:reset                             # supabase db reset --local  (apply THIS branch's migrations + seed)
pnpm db:test                              # supabase test db --local   (pgTAP)
pnpm -r --if-present run test             # all workspace vitest suites
pnpm exam:verify:diff                     # cross-tier verifier differential (rolled-back, loopback-guarded)

# Static / dynamic introspection (read-only)
docker exec -i supabase_db_gt-selection-capstone psql -U postgres -d postgres -c "…"

# Teardown
pnpm db:stop                              # supabase stop --no-backup
```

---

## Results

### 1. Migrations apply cleanly (clean-room)

`pnpm db:reset` dropped and recreated the local DB and replayed **all 20 migrations from empty**,
then seeded — **no errors**. This is a stronger check than the branch's own record (which used a
surgical `migration up` to avoid resetting a shared instance): here the full set applies from
scratch. The four verifier migrations all applied:

```
20260725170000_exam_verify_plpgsql.sql
20260725174500_exam_verify_vbatch1.sql
20260725181742_exam_verify_moderate_batch.sql
20260725183000_exam_verify_awkward_batch.sql
```

### 2. pgTAP — `pnpm db:test`

```
Files=20, Tests=465,  Result: PASS   (All tests successful, 0 failures)
```

Per-file plan (from each suite's `select plan(N)`; sums to 465):

| Pre-existing (12 files = 204) | | Exam backend (8 files = 261) | |
|---|---|---|---|
| 000_scaffold | 11 | 120_exam_adaptive_backend | 46 |
| 010_onboarding_cycle | 5 | 121_exam_answer_key_firewall | 26 |
| 020_onboarding_idempotency | 6 | 122_exam_outcome_ownership | 30 |
| 030_onboarding_application_schema | 20 | 123_exam_verify_plpgsql | 30 |
| 040_onboarding_rls | 8 | 124_exam_scorer_input_ownership | 10 |
| 050_save_application_draft | 15 | 124_exam_verify_awkward_batch | 43 |
| 060_submit_application | 13 | 124_exam_verify_moderate_batch | 40 |
| 070_get_application_status | 6 | 130_exam_verify_vbatch1 | 36 |
| 080_milestone_a_schema_security | 35 | | |
| 090_profile_directory_api | 18 | | |
| 100_application_roundtrip_firewall | 64 | | |
| 110_idempotency_directory_expiry | 3 | | |

All named exam suites in the task (`120`, `121`, `122`, `123`, plus the verifier-batch tests)
are present and pass.

### 3. JS/TS — `pnpm -r --if-present run test` (exit 0)

| Package | Files | Tests |
|---|---|---|
| `packages/contracts` | 8 | 184 |
| `packages/exam-scoring` | 5 | 71 |
| `packages/exam-engine` | 4 | 112 |
| `packages/test-fixtures` | 2 | 18 |
| `apps/web` | 24 | 343 |
| **Total** | **43** | **728** |

`apps/web` (343 tests) includes the **D-028 telemetry-panel gate** test and the verifier
parity/lexicon tests; all pass.

### 4. The "30/30 per-type verifiers" claim — confirmed three ways

**(a) Static (SQL source).** 33 functions with signature `app.exam_verify_<x>(p_item jsonb,
p_response jsonb)` − 3 generic fallbacks (`exam_verify_keyed`, `exam_verify_placement_tolerance`,
`exam_verify_constructed_value`) = **30 per-type**, plus 1 dispatcher `exam_verify_response`.
Registry `INSERT`s across the four verifier migrations total **30 rows** (base 4 + vbatch1 9 +
moderate 9 + awkward 8).

**(b) Dynamic (live DB after reset).**

```
app.exam_verifier_registry row count ............ 30
per-type/generic exam_verify_*(jsonb,jsonb) fns .. 33  (= 30 per-type + 3 generic)
dispatcher app.exam_verify_response present ...... 1
registry fns reused by >1 type_code ............. 0   (30 unique type→fn mappings)
anon  can EXECUTE exam_verify_response ........... f
authd can EXECUTE exam_verify_response ........... f
```

**(c) Cross-tier differential — `pnpm exam:verify:diff`.** Every served bank type run through
BOTH the app-tier TypeScript `verify()` and the plpgsql `app.exam_verify_response()`:

```
per-type verifiers ported: 30/30 served (30/31 including the blocked CX-achieve-02)
generic verifiers: 33 types, 1188/1188 cases agree
ported per-type:            1080/1080 cases agree
PENDING:                    0/0
WHOLE RUN:                  2268/2268 cases agree across all 63 served types
RESULT: every ported and generic type agrees.   (0 metric-map disagreements)
```

### 5. Security posture (matches the claims)

| Claim | Evidence (live DB) |
|---|---|
| `SECURITY DEFINER` RPC API | 10/10 `api.exam_*` RPCs are `SECURITY DEFINER` with `search_path=pg_catalog, extensions` |
| Server-authoritative correctness (D-027) | Dispatcher `app.exam_verify_response` **revoked** from `anon` + `authenticated`; verdict never returns a key/solution |
| Answer-key firewall | `anon`/`authenticated` have **no** `app` schema usage and **no** `answer_key` column privilege |
| Per-child outcome ownership + **forced** RLS | All 10 `app.exam_*` tables have RLS **enabled and forced** (owner cannot bypass); suite `122` passes (30 assertions) |
| Item-registration handshake | `api.exam_register_item` present (SECURITY DEFINER); migration `20260725160000_exam_item_registration.sql` applied |
| Synthetic seed | 80 bank items / 4 placeholder type codes; append-only `app.exam_telemetry_event` present with forced RLS |

---

## Findings & clarifications (honest; none block the verdict)

1. **"30/30" means 30 of 30 *servable* types — correct and complete.** The app tier has **31**
   per-type verifiers; the 31st, `CX-achieve-02`, is deliberately **blocked from serving**
   (`research/exam-question-types/qa/NOT_SERVABLE.json`, E-076: its content leaks the answer) and
   is intentionally **not** ported or registered. So "30/30" is honest (all servable types), and
   "30/31" is the total-including-the-blocked-one. Confirmed by the differential harness line
   `30/30 served (30/31 including the blocked CX-achieve-02)`.

2. **D-028 is a *frontend* telemetry-panel gate, not a database gate.** Per
   `docs/governance/DECISION_LOG.md` D-028 ("the child-facing screener hides the per-child
   telemetry panel; `?telemetry=1` retains it for demonstration"), it lives in `apps/web` and the
   demo HTML and is covered by `apps/web/.../telemetry-panel-gate.test.ts` (in the passing 343).
   The *backend* telemetry is **persistence** — `app.exam_telemetry_event`, append-only,
   owner-scoped, forced RLS — which is present and tested, but is a different thing from the
   D-028 visibility gate. The task listed D-028 among backend claims; the precise picture is
   frontend-gate + backend-persistence.

3. **The seeded bank does not exercise the 30 per-type verifiers.** The 80-item seed uses 4
   placeholder type codes (`FLU-MATRIX-01`, `QUANT-SERIES-01`, `SPA-FOLDNET-01`,
   `VER-ANALOGY-01`) that route through the generic `keyed` fallback and have **zero** overlap
   with the 30 registry types. The 30 per-type verifiers are exercised instead by pgTAP
   `123`/`124`/`130` (inline synthetic items) and by `exam:verify:diff` (real research banks
   inserted in a rolled-back transaction). This matches the branch's own `EXAM_BACKEND_STATUS.md`
   §7.8 ("the bank is a synthetic ramp, not the real banks").

4. **Two of the branch's own status docs are checkpoints behind the tip (documentation drift,
   not code defects).** `supabase/EXAM_BACKEND_STATUS.md` §8.5 records "Files=15, Tests=306" (the
   D-029 checkpoint, before the verifier batches), and
   `docs/architecture/EXAM_VERIFIER_PORT_INVENTORY.md` §1 still shows "4 ported / 27 remaining"
   (the D-027 foundation snapshot). The live tip supersedes both: 20 files / 465 assertions and
   30/30 ported, as verified here.

5. **Not re-verified (out of scope / documented elsewhere):** `pnpm db:types:check` is recorded
   as failing due to a pnpm banner polluting stdout (STATUS §8.6), not type drift — not exercised
   in this run. `apps/web` wiring to these RPCs is a known open handoff (STATUS §8.8): the tested
   firewall is correct but not yet on the app's request path. Neither affects the backend claims
   checked here.

---

## Guardrail confirmations

- **Loopback + synthetic only.** All endpoints `127.0.0.1`; `synthetic_only=true`,
  `validated=false` throughout; no hosted target, no real data, no production account,
  `GT_DEPLOY_MODE=hosted` never set; no service-role key used in any app runtime.
- **Verification-only.** No migrations/RPCs/tests/product code changed. Findings above are
  reported, not fixed. The only file added is this report.
- **Worktree isolation.** Ran in a dedicated worktree on `feat/exam-integration-verify`.
- **Stack left stopped.** `pnpm db:stop` (`supabase stop --no-backup`) run on completion.
- **Not merged.** No promotion to `dev`/`staging`/`main`.

_Reproduction note: because the local Supabase project (`gt-selection-capstone`) is shared across
worktrees, `pnpm db:reset` clean-applied this branch's migrations to that loopback instance; the
data is fully synthetic and reproducible from migrations + seed._
