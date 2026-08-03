# Gen-A vs Gen-B: Concern-by-Concern Comparison

**Gen-A** = `feat/repo-structure-audit` @ `5c2c2ab` (this branch; same tree as
`feat/test-structure-revamp`).
**Gen-B** = `feat/exam-integration` @ `699ddea`. **Note:** its true tip is
`feat/exam-integration-verify` @ `d7db7fb`, which strictly contains it — see
`BRANCH_CLEANUP_PLAN.md` §3.
**Date:** 2026-07-27.

**This document deliberately does not declare a winner.** It states, per
concern, which generation is further along and on what evidence, then flags the
places where the two made commitments that *cannot be merged, only chosen
between*. The choice is the owner's.

---

## 0. Scale of the divergence

```
$ git rev-list --count dev..feat/exam-integration      → 232      (8 behind dev)
$ git rev-list --count feat/exam-integration           → 404      (total)
$ git rev-list --count HEAD                            → 218
$ git merge-base HEAD feat/exam-integration            → b4855678…
$ git diff --shortstat HEAD feat/exam-integration
  620 files changed, 140537 insertions(+), 47664 deletions(-)
```

File-presence matrix (`git cat-file -e <rev>:<path>`):

| Path | Gen-A | Gen-B |
| --- | :-: | :-: |
| `packages/cat-engine/src/{irt,rng,theta,scoring}.ts` | ✅ | — |
| `packages/item-bank/src/bank-item.ts` | ✅ | — |
| `apps/web/src/lib/exam/{session,sequencer,two-stage-sequencer,harvest,item,scoring}.ts` | ✅ | — |
| `apps/web/src/lib/exam/cat-adapter.ts` | ✅ | — |
| `packages/contracts/src/assessment-exam.ts` | ✅ | — |
| `packages/db-types/src/exam.ts` | ✅ | — |
| `scripts/validation-harness/run_harness.py` | ✅ | — |
| `packages/exam-engine/src/index.ts` | — | ✅ |
| `apps/web/src/lib/exam/{adaptive,persistence,bank-loader,contract}.ts` | — | ✅ |
| `apps/web/src/lib/exam/verifiers/index.ts` | — | ✅ |
| `packages/contracts/src/assessment-exam-adaptive.ts` | — | ✅ |
| `packages/test-fixtures/src/index.ts` | ✅ | ✅ |

**Prior finding #1 is confirmed.** The only shared workspace package is
`test-fixtures`. `contracts` exists on both but has **forked**: Gen-A's
`assessment-exam.ts` and Gen-B's `assessment-exam-adaptive.ts` are different
files, not versions of one file.

---

## 1. Concern-by-concern

### 1.1 Item model

| | Gen-A | Gen-B |
| --- | --- | --- |
| Definition | 4 rival models (see `DUPLICATE_MODELS.md` §2) | `contracts/assessment-exam-adaptive.ts` + `lib/exam/contract.ts` |
| Live model | `lib/exam/item.ts` (`renderKind` union) | `lib/exam/contract.ts` + `bank-loader.ts` |
| Discriminator | `renderKind` (`single-select` \| `embedded-demo`) | type-code driven, registry-backed |

**More advanced: Gen-B.** Gen-A ships four incompatible item models with the
simplest one live; Gen-B has one item path with a generated registry
(`lib/exam/registry.generated.ts`) and a bank-conformance test in contracts
(`contracts/src/bank-conformance.test.ts`).

**Migration cost if Gen-A is kept:** medium — see `DUPLICATE_MODELS.md` §9;
the first seven consolidations are mechanical.
**If Gen-B is kept:** Gen-A's four models are discarded, not migrated. Low cost,
high discard.

### 1.2 Item bank / content — the largest single gap

| | Gen-A | Gen-B |
| --- | --- | --- |
| Generated bank | `packages/item-bank/data/bank/items.bank.jsonl`, **257 items** | `research/exam-question-types/banks/*.jsonl`, **66 files / 7,900 item lines** |
| Live bank | `lib/exam/bank.ts` — **8 hardcoded items** | loaded via `bank-loader.ts` from the real banks |
| Playable demos | 30 files in `apps/web/public` | 65 files in `apps/web/public` |
| Generated bank reaches the UI? | **No** (see `REPO_REACHABILITY_MAP.md` §6b) | **Yes** |

```
$ wc -l packages/item-bank/data/bank/items.bank.jsonl        → 257     (Gen-A)
$ git ls-tree -r --name-only feat/exam-integration -- research/exam-question-types/banks | wc -l  → 66
$   … total non-empty lines across those 66 files                              → 7900   (Gen-B)
$ git ls-tree -r --name-only HEAD -- research/exam-question-types/banks | wc -l → 0
```

**More advanced: Gen-B, decisively — roughly 31× the item volume, and its bank
is actually wired to the renderer.** This is the single largest substantive
difference between the two stacks. Gen-A's more sophisticated *generator* has
produced far less *content*, and none of it is reachable.

**Migration cost:** Gen-B's banks live under `research/`, so they are portable
between stacks in principle — but they are shaped for Gen-B's loader and
verifiers. Porting content to Gen-A means re-deriving `answer`/`scoring`/
`provenance` envelopes for 7,900 items. **High.** Treat the content as
effectively coupled to Gen-B.

### 1.3 Selection / routing

| | Gen-A | Gen-B |
| --- | --- | --- |
| Mechanism | Pluggable `Sequencer` interface: `FixedSequencer`, `TwoStageSequencer` | `packages/exam-engine`: `startState → nextType → nextItem → update → isDone` |
| Ability model | Two-regime standing/effort (proposed, unapproved) + parked IRT theta in `cat-engine` | Per-area **difficulty score float 1..20**, moved ±0.4-1.0 per response |
| Stop rule | fixed order / stage plan | `isDone`: core-metric coverage + even area spread + estimate stability |
| Coverage logic | none | `exam-engine/src/coverage.ts` — fills under-covered core metrics |

**More advanced: Gen-B** on completeness (coverage-aware stop rule, age-band
bias, deterministic RNG). **Gen-A is more advanced on *structure-agnosticism*** —
its `Sequencer` seam is explicitly pluggable and its contracts carry
`deliveryStructure` as tunable config (`assessment-exam.ts:42`), so a linear,
adaptive, or two-stage form all validate against one schema. Gen-B's engine
commits to one adaptive strategy.

If structure-agnosticism is a live requirement, this is a point *for* Gen-A. If
it is a hedge no one intends to exercise, it is unused generality.

### 1.4 Correctness authority — **the incompatible commitment**

> **This is the fork that cannot be merged.** Everything else in this document
> is a cost comparison; this one is a genuine either/or.

**Gen-A computes correctness in the client module.**
`apps/web/src/lib/exam/scoring.ts:28` is a pure function taking the **bank item**
(which holds `answer.correctIndex`) plus the raw response. It is called from
`session.ts:52`, which is imported by `item-player.tsx` — a `'use client'`
component. The static import chain therefore places answer keys in the browser
bundle:

```
apps/web/src/app/dev/exam-shell/page.tsx
  -> components/exam/synthetic-exam.tsx        ← 'use client'
  -> lib/exam/sample-items.ts                  ← builds answer:{correctIndex} (line 51-53)
```

Gen-A is aware of the tension: `item.ts:234-238` claims `toServedItem` means the
solution "provably cannot reach the browser". That is true of what is
**rendered**, and false of what is **shipped** — the bank module containing the
keys is in the same client graph.

**Severity is bounded, and I want to be precise rather than alarming:**

- The key-bearing bank (`sample-items.ts`) is reachable only from
  `/dev/exam-shell`, which returns `notFound()` when
  `process.env.NODE_ENV === 'production'`
  (`apps/web/src/app/dev/exam-shell/page.tsx:11`).
- The auth-gated family route `(embed)/family/exam` uses `bank.ts`, whose 8
  items are all `embedded-demo` with **no `answer` field** — those demos
  self-score in-frame.
- Every item involved is synthetic.
- **Unverified:** whether Next.js still emits the dev route's client chunk into
  a production build (making the keys fetchable by direct URL even though the
  page 404s). I did not run `next build`. A reviewer can settle it with
  `pnpm --filter @gt-selection/web build && rg -l "correctIndex" apps/web/.next/static`.

So Gen-A's exposure **today** is low. The architectural point stands regardless:
*a client-side scorer cannot become server-authoritative by adding validation
later — it has to be moved.*

**Gen-B enforces correctness in the database.** `app.exam_verify_response(uuid, jsonb)`
(`supabase/migrations/20260725170000_exam_verify_plpgsql.sql:361`) resolves the
verifier in three tiers: a per-type function from `app.exam_verifier_registry`,
then a generic function named by the item's server-only `scoring.rule`, then the
option-key default. **34 `app.exam_verify_*` functions** exist across four
migrations — 1 dispatcher, 3 generic (`keyed`, `placement_tolerance`,
`constructed_value`), and **30 per-type verifiers**. This matches the reported
"30 per-type verifiers" exactly.

```
$ git grep -hoE "create (or replace )?function app\.exam_verify_[a-z0-9_]+" \
      feat/exam-integration -- supabase/migrations | sed 's/.*function //' | sort -u | wc -l
34
```

Gen-B also mirrors each verifier in TypeScript
(`lib/exam/verifiers/{fluid,quantitative,spatial,verbal,generic}.ts`, 3,696 LOC)
and has a pgTAP suite asserting parity, plus an answer-key firewall test
(`supabase/tests/121_exam_answer_key_firewall.test.sql`, 26 assertions).

**More advanced: Gen-B, unambiguously.** Server-authoritative scoring with an
RLS-enforced key firewall is a structurally different guarantee, not a better
version of the same guarantee.

**Why these cannot be merged.** Gen-A's model *requires* the key client-side (a
pure function over the bank item); Gen-B's *forbids* it (keys live in the private
`app` schema and never leave the DB). You can port Gen-A's UI onto Gen-B's
authority, or keep Gen-A's client scorer, but there is no configuration in which
both hold. **Migration cost to move Gen-A onto DB authority: high** — it is the
work Gen-B already did (9 exam migrations, 30 verifiers, 261 exam pgTAP
assertions).

### 1.5 Scoring / psychometrics

| | Gen-A | Gen-B |
| --- | --- | --- |
| Model | IRT 2PL/3PL theta + SE, EAP prior, engagement gate, bootstrap decision confidence (`cat-engine`) | Difficulty-score movement 1..20 + accuracy/estimate windows |
| Live? | **No** — `cat-engine` is parked (0 LOC LIVE) | Yes |
| Live scoring in practice | accuracy from harvested `M-ACC` strings | DB-computed `correct`/`score` |
| Replay/determinism | `cat-engine/src/{replay,rng}.ts` + seeded bootstrap | `exam-engine/src/{replay,rng}.ts` |
| External validation | `scripts/validation-harness/` (Python, 8 modules + tests) | — |

**Split verdict.** Gen-A's *psychometric ambition* is higher (real IRT, effort
gating, decision confidence, a standalone Python validation harness). Gen-B's
*delivered scoring* is higher (it actually runs, end to end, server-side).

**This is the most important trade-off in the document.** Gen-A has the more
defensible measurement design and has not shipped it; Gen-B has shipped a
simpler design. Choosing Gen-B does not forfeit IRT permanently —
`packages/cat-engine` is a dependency-free package (its `package.json`
description: *"no web/DB dependencies"*) and could be re-adopted later. Choosing
Gen-A means building Gen-B's delivery layer.

**One defect to fix either way:** `cat-engine` still emits `admit`/`defer`, the
claim vocabulary this project retired. See `DUPLICATE_MODELS.md` §5. Cheap now,
expensive after wiring.

### 1.6 Persistence

| | Gen-A | Gen-B |
| --- | --- | --- |
| Live store | **Module-level array**, resets on restart (`api/exam-results/route.ts:23`) | Supabase, via `lib/exam/persistence.ts` + `api/exam-{session,submit,items}` routes |
| Migrations | 2 exam migrations, **held/unapplied** | 9 exam migrations, applied |
| Typed rows | `db-types/src/exam.ts` (hand-authored, "held for review") | generated |

Gen-A's own header is explicit: *"this route keeps a process-in-memory 'table' …
It RESETS whenever the server restarts — it is a stand-in, not durable storage."*

**More advanced: Gen-B, decisively.** Cost to bring Gen-A up: high (apply
migrations, write adapters, resolve the session-identity mismatch in
`DUPLICATE_MODELS.md` §7 — Gen-A's live session has no UUID and no participant
row).

### 1.7 Session UI

| | Gen-A | Gen-B |
| --- | --- | --- |
| Components | 10 under `components/exam/` incl. `item-player`, `two-stage-exam`, `synthetic-exam`, 2 renderers | 2: `exam-runner.tsx`, `preview-exam.tsx` |
| Demo routes | `/dev/exam-shell`, `/dev/exam-two-stage`, family preview | family preview only |
| Native item rendering | Yes (`single-select-renderer.tsx`) | iframe demos only |

**More advanced: Gen-A, clearly.** It has a pluggable player with two render
kinds, a two-stage demo surface, and per-renderer tests. Gen-B did not invest
here.

**Migration cost to port Gen-A's UI onto Gen-B: medium** and probably the
highest-value hybrid move — the UI is the layer least coupled to correctness
authority, provided the client scorer is dropped.

### 1.8 Telemetry

| | Gen-A | Gen-B |
| --- | --- | --- |
| Capture | DOM scraping of the demo's `#mlist` panel (`harvest.ts:29-37`) | `messaging.ts` + `telemetry-panel-gate` |
| Contract | `telemetryEventSchema` in `assessment-exam.ts`; `exam_telemetry_event` table typed in `db-types/exam.ts:314` | gated panel + DB |
| Live shape | strings + `_num` keys — **fails the contract** (`DUPLICATE_MODELS.md` §4) | DB-validated |

**More advanced: Gen-B.** Gen-A's harvest is a genuine engineering
achievement — it reads metrics from unmodified third-party demos — but it is a
scraper, and its output does not satisfy the project's own telemetry contract.

### 1.9 Test coverage — and its kind

Kind matters more than count here.

| | Gen-A | Gen-B |
| --- | ---: | ---: |
| JS/TS test files | 54 | 49 |
| JS tests **actually run** | **336 passing** (measured) | *not measured* |
| Static `it(`/`test(` declarations | 321 | 462 |
| pgTAP planned assertions | **248** | **465** |
| …of which exam-specific | **0** | **261** |
| Exam DB tests present but disabled | 2 files, `.pending.sql` suffix | — |
| Integration tests | 2 (`*.integration.test.ts`) | 1 exam persistence integration |
| E2E (Playwright) | 3 specs | (not enumerated) |

Gen-A measured directly:

```
$ pnpm -r --if-present run test
packages/cat-engine    10 files   75 passed
packages/contracts      8 files   60 passed
packages/test-fixtures  3 files   25 passed
packages/item-bank      5 files   53 passed
apps/web               24 files  123 passed
                       ─────────────────────
                       50 files  336 passed
```

Gen-B's pgTAP total of **465 is confirmed** by summing `plan(N)` across its 20
test files. **The reported "728 JS tests" is NOT confirmed.** I count 462 static
declarations. Gen-B uses `it.each`/`describe.each` in 9 files (including the
spatial/verbal verifier suites and `exam-engine/src/real-bank.test.ts`), which
plausibly expands 462 → ~728 at runtime, but I did not verify it: doing so
requires checking out Gen-B, which is outside this audit's read-only remit.
**Treat 728 as plausible-unverified; treat 465 as verified.**

**More advanced: Gen-B, and the *kind* gap is bigger than the count gap.**
Gen-A's 336 tests are almost entirely pure-unit tests of parked modules
(128 of them are `cat-engine` + `item-bank`, which nothing renders). Gen-A has
**zero executing exam database tests**. Gen-B's 261 exam pgTAP assertions test
the actual correctness authority, including an RLS answer-key firewall.

> Blunt version: Gen-A's test count is respectable but heavily weighted toward
> code no user can reach. Gen-B's tests cover the thing that would break.

### 1.10 Governance IDs and claim boundaries

```
$ git grep -hoE "(D-[0-9]{3}|R[0-9]{1,2}|H[0-9]{1,2}|AX-[0-9]{2}|RES-[0-9]{3})" \
      HEAD -- 'packages/cat-engine/*' 'packages/item-bank/*' 'apps/web/src/lib/exam/*'
  13 RES-013   13 D-006   12 D-019   11 R9   7 RES-012   6 R10
   3 R7   2 R5   2 R11   2 H4   2 H10   2 H1   1 D-016   1 D-015

$ … same for feat/exam-integration -- 'packages/exam-engine/*' 'apps/web/src/lib/exam/*'
   7 D-025   3 D-023   3 D-019   1 D-028   1 D-027   1 D-017
```

`syntheticOnly`/`synthetic_only` occurrences: **Gen-A 558, Gen-B 246.**

**More advanced: Gen-A on traceability, Gen-B on recency.** Gen-A's exam code
cites requirement IDs (R5/R7/R9/R10/R11, H1/H4/H10) and claim-boundary markers
(RES-012, RES-013, D-006) throughout; **Gen-B's exam code cites no R/H
requirement IDs at all** and carries less than half the synthetic-only marking.

**A governance fact the owner must not miss:** Gen-B's decision log contains
**D-020 through D-028 — nine decisions that do not exist on `dev`**.

```
$ grep -oE "D-0[0-9]{2}" docs/governance/DECISION_LOG.md | sort -u          # HEAD:  D-001..D-019
$ git show feat/exam-integration:docs/governance/DECISION_LOG.md | …        # Gen-B: D-001..D-028
```

Gen-B's engine cites D-023/D-025/D-027/D-028, i.e. **it is built on decisions
that have never been promoted to `dev`**. Adopting Gen-B means ratifying those
nine decisions. Rejecting Gen-B means deciding whether they were ever valid.
Either way this is a governance action, not a merge action.

---

## 2. Incompatible commitments — cannot be merged, only chosen

| # | Commitment | Gen-A | Gen-B | Why irreconcilable |
| --- | --- | --- | --- | --- |
| 1 | **Correctness authority** | Client/module pure function over a key-bearing bank item | DB function `app.exam_verify_response`, keys never leave the `app` schema | Gen-A needs the key client-side; Gen-B forbids it. No configuration satisfies both. |
| 2 | **Ability model** | IRT theta + SE on a latent scale (parked) | Ordinal difficulty score 1..20 moved by ±0.4-1.0 | Different measurement theories. Scores are not inter-convertible; any "both" is two parallel scorers. |
| 3 | **Structure-agnosticism** | First-class: pluggable `Sequencer`, `deliveryStructure` as tunable config | One adaptive strategy baked into `exam-engine` | Gen-B's engine cannot express a fixed form without being rewritten as a strategy. |
| 4 | **Persistence identity** | `sessionId: string` + `participantCode: PART-SYN-*`, in-memory | UUID session + participant rows, Supabase | A data-shape migration, not a type change. |
| 5 | **Contracts package** | `assessment-exam.ts` | `assessment-exam-adaptive.ts` | Both are `export *`-ed from `contracts/src/index.ts`. Merging both files yields duplicate export names — a compile error, not a conflict to resolve by hand. |
| 6 | **Item identity** | `z.string().min(1)`; live IDs are `FLU-MATRIX-01` | uuid | Adopting uuid requires renumbering every live item. |

Items 1, 2, 3 and 5 are the true forks. Items 4 and 6 are expensive but
mechanical once 1 is decided.

---

## 3. Recommendation — framed as options, with costs

**I am not selecting one.** Three coherent options, with the trade-off stated
plainly. Anything that is not one of these three tends to produce a third
generation, which is how the repo reached this state.

### Option 1 — Adopt Gen-B as the exam stack; port Gen-A's UI

*Keep:* Gen-B correctness/persistence/bank/tests. *Port:* Gen-A's player,
renderers, two-stage demo. *Discard:* `cat-engine`, `item-bank`, `cat-adapter`,
`lib/exam/{session,sequencer,scoring,harvest,item}.ts`.

- **Gain:** 7,900 bank items already wired; server-authoritative scoring; 261
  exam pgTAP assertions; durable persistence.
- **Cost:** discard ~5,600 LOC of parked Gen-A work and its 128 tests; must
  ratify D-020..D-028; must re-add R/H traceability and synthetic-only marking
  to Gen-B code; lose structure-agnosticism unless re-introduced.
- **Effort:** UI port medium; governance reconciliation medium; content zero.

### Option 2 — Keep Gen-A; rebuild the backend

*Keep:* Gen-A entirely. *Build:* DB verification, real persistence, bank wiring.

- **Gain:** keeps IRT/psychometric design, structure-agnosticism, traceability,
  the validation harness, and the richer UI.
- **Cost:** rebuild essentially all of Gen-B — 9 migrations, 30 verifiers, the
  key firewall, and 7,900 items of content re-enveloped for `item-bank`'s
  schema. Discards 232 commits.
- **Effort:** **high**, and the content re-enveloping is the part most likely to
  be underestimated.

### Option 3 — Adopt Gen-B; re-adopt `cat-engine` later as a scoring service

Option 1, plus keeping `packages/cat-engine` archived-but-intact for a later
IRT/replay service once real response data exists.

- **Gain:** does not permanently forfeit the psychometric work; `cat-engine` is
  dependency-free by design, so it survives the stack change unchanged.
- **Cost:** carries ~1,200 LOC of unreachable code with an explicit "archived,
  not wired" label. Requires the discipline to actually leave it alone.
- **Effort:** Option 1 + a decision record. **This is the lowest-regret option
  if the IRT work is considered valuable but not urgent.**

### Cost summary per concern

| Concern | A→B | B→A |
| --- | --- | --- |
| Item model | Low (discard) | Medium |
| Bank content | **Zero** | **High** (7,900 items) |
| Selection | Low (discard) | Medium |
| Correctness authority | **Zero** | **High** (9 migrations, 30 verifiers) |
| Scoring | Medium (lose IRT) | Medium |
| Persistence | **Zero** | **High** |
| Session UI | **Medium** (port from A) | Zero |
| Telemetry | Low | Medium |
| Tests | Low | High |
| Governance | Medium (ratify D-020..028, re-add R/H) | Medium (retire 9 decisions) |

**The asymmetry is the finding.** Moving A→B is cheap in every column except
UI; moving B→A is expensive in four columns, two of them severely. That is not a
verdict — Option 2 may still be right if structure-agnosticism or IRT is a hard
requirement — but the owner should choose Option 2 knowing it is the expensive
direction.

---

## 4. What I could not determine

1. **Gen-B's actual JS test pass count.** 462 static declarations; 728 reported;
   not run. Requires checking out Gen-B.
2. **Whether Gen-B currently passes.** Its pgTAP suite needs a live Supabase
   instance. `465 planned assertions` is a static count of `plan(N)`, not a
   record of a green run.
3. **Whether Gen-B's 8-commit lag behind `dev`** conflicts with anything. Not
   test-merged (that would modify the worktree).
4. **Whether the dev-route client chunk is emitted in a production build**
   (§1.4). Needs `next build`.
5. **Uncommitted work in the other 25 worktrees.** Deliberately not inspected.
