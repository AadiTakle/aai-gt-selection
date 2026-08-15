# Bramblebrook on the Question Platform — Implementation Plan

> **Historical implementation plan, completed.** The integrated game is deployed in the sandbox.
> Use [`../gt/testing-and-demos.md`](../gt/testing-and-demos.md) and
> [`../../screener/apps/sanctuary/PLATFORM.md`](../../screener/apps/sanctuary/PLATFORM.md)
> for current commands. Checkboxes and worktree paths below preserve execution history.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or
> superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Status:** Implemented and deployed; retained as historical execution detail.

**Goal:** Bramblebrook's question serving and ability scoring come from the question platform, with the
game's world, art and interaction untouched.

**Spec:** `product/docs/design/sanctuary-platform-integration.md`. Read §5 first — it contains a decision only the
owner can make, and Task 6 changes depending on the answer.

> **Superseded in part.** PR #68 landed ~2,900 lines of adaptive engine in `@gt/qbank` after this plan was
> written. **Read `product/docs/design/platform-qbank-reconciliation.md` first.** Task 1 below is replaced by that
> document's Tasks 0–6, and its own §2 numbers are stale — the current figures are 4,934 scorable across 36
> types. The rest of this plan, from Task 2 onward, stands.

**Workspace:** worktree `/Users/atakle/gt-sanctuary-platform`, branch `feat/sanctuary-platform`, upstream
tracking removed.

## Global constraints

- **No AWS calls.** DynamoDB Local on 8456. `cdk deploy` remains an owner action.
- **Do not modify** `game/world/`, `game/slimes/`, `game/vacpack/`, `game/economy/`, `game/audio/`, or the
  drawing half of `game/screener/`. Those are rendering, not measurement.
- **Do not change** the presentation contract: `content` in, `onPick(handed: string)` out. No component
  learns correctness.
- **Do not change** the exported `Sortie` interface from `shared/useSortie.ts`. `Game.tsx`,
  `Stations.tsx` and `Board.tsx` must need no edits. If they do, the seam was drawn wrong.
- **Never** expose a score, estimate, interval, or `correct` to any child-visible surface.
- Baselines that must stay green: sanctuary's 14 tests, `screener`'s suite, and the platform's 269.
- All commits on `feat/sanctuary-platform`. Never push to `origin/feat/sanctuary`.

## Measured starting state

Run in the worktree before starting, and record it:

| Suite | Command | Expected now |
|---|---|---|
| Platform | `cd platform && npx vitest run` | **8 failed, 261 passed** — all 8 in `@platform/catalog`; numeric keys plus the moved counts |
| Platform typecheck | `cd platform && npx tsc --noEmit` | **1 error** at `packages/catalog/src/compile.ts:251`, `string \| number` not assignable to `string` |
| Screener + sanctuary | `cd screener && npx vitest run` | passing |

Measured on `09a01d7` after merging current dev into this branch. That the 8 failures are still confined to
the catalog package — with the store, handlers, scoring, selection and infra all passing against Felipe's
rewritten engine — is the useful part of that number.

---

## Task 1 (SUPERSEDED): Teach the platform numeric answer keys

> Replaced by Tasks 0–6 of `docs/design/platform-qbank-reconciliation.md`, which cover this and more:
> the golden numbers moved from 4,534 to **4,934**, types-with-items from 32 to **36**, zero-scorable from
> 21 to **17**, and the exclusion reasons now include two retirement causes. `model_judge_deferred` is
> gone. Kept below because its analysis of *why* numeric keys matter to Bramblebrook is still the reason
> the work has to happen.

**This unblocks everything.** Two of Bramblebrook's seven verbs (`VER-SORTBOT-01`, `VER-RELPAIR-01`) carry
numeric keys, so without this its verbal battery cannot be served at all.

**Files:**
- Modify: `platform/packages/domain/src/candidate.ts` — `AnswerKeyRecord.correctKey`
- Modify: `platform/packages/catalog/src/compile.ts`
- Modify: `platform/functions/score/src/mark.ts`
- Modify: `platform/packages/catalog/src/catalog.test.ts` — the golden numbers
- Modify: `platform/packages/store/src/store.test.ts` if it asserts a string key

**Interfaces — changed:**

```ts
// candidate.ts
export interface AnswerKeyRecord {
  readonly itemId: string;
  readonly revision: number;
  /**
   * A letter for types whose options carry keys, and a 0-based option INDEX for the five verbal types
   * whose options are positional. Marked down separate paths; they must never be compared with each other.
   */
  readonly correctKey: string | number;
  readonly scoringMode: ScoringMode;
  readonly extra: Record<string, unknown>;
}

// mark.ts
export function markAgainstKey(correctKey: string | number, response: unknown): boolean | null;
```

- [ ] **Step 1: Update the golden numbers first, and watch them fail for the right reason.** In
  `catalog.test.ts` change `scorableCount` 4534 → **5034**, types-with-scorable 32 → **37**,
  zero-scorable 21 → **16**, and `excludedByMode` from `{computed_solver: 1774, 'no-key': 891,
  model_judge_deferred: 120}` to `{computed_solver: 1774, 'non-index-numeric-key': 391,
  model_judge_deferred: 120}`. Add an assertion that exactly these five types have numeric keys:
  `VER-CLOZE-01`, `VER-POLYSEME-01`, `VER-RELPAIR-01`, `VER-SEQUENCE-01`, `VER-SORTBOT-01`.
- [ ] **Step 2: Add a failing test for the marking paths.** In a new
  `platform/functions/score/src/mark.test.ts`: a numeric key marks against `selectedIndex` and against
  `index`; a numeric key against a letter response returns `null` rather than `false`; a letter key
  against `selectedIndex` returns `null`; a fractional numeric key returns `null`; Bramblebrook's exact
  payload `{ key: '2', selectedKey: '2', selectedIndex: 2 }` marks correct against numeric key `2` **and**
  against string key `'2'`.
- [ ] **Step 3: Run both.** `cd platform && npx vitest run packages/catalog functions/score`. Expected:
  fail.
- [ ] **Step 4: Widen the three types.** `AnswerKeyRecord.correctKey`, `markAgainstKey`'s parameter, and
  wherever `compile.ts` narrows a key to a string. Keep the compiler's `extra` behaviour identical.
- [ ] **Step 5: Run the whole platform suite.** Expected: **269 passed, 0 failed.**
- [ ] **Step 6: Commit.**

---

## Task 2: A local router that runs the platform's real handlers

**Files:**
- Create: `platform/local/src/router.ts` — event shaping and dispatch
- Create: `platform/local/src/dev-server.ts` — a standalone Express listener for the API
- Create: `platform/local/src/router.test.ts`
- Modify: `platform/package.json` — a `dev:local` script

**Interfaces — produces:**

```ts
export interface LocalRouterOptions {
  /** Resolved the way the authorizer would, not read from any request body. */
  readonly appId: string | null;
  readonly adminEnabled: boolean;
}
export interface LocalResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}
export function routeLocal(
  method: string,
  path: string,
  body: string | null,
  headers: Record<string, string>,
  options: LocalRouterOptions,
): Promise<LocalResponse>;
```

It must build the same API Gateway v2 payload the handlers already parse (`toApiRequest` in
`functions/shared/src/http.ts` is the contract), match the route table in `infra/lib/api-stack.ts`, and
hold **no** measurement logic of its own. Path parameters are extracted from the same templates
(`/v1/sessions/{sessionId}/next`).

- [ ] **Step 1: Write the failing test.** `router.test.ts`: `POST /v1/sessions` reaches the serve handler
  and returns 201; `GET /v1/sessions/{id}/next` extracts `sessionId` into `pathParameters`; an unknown path
  returns 404; a `/v1/admin/*` path returns 403 when `adminEnabled` is false; `appId` comes only from
  options, never from the body.
- [ ] **Step 2: Run it.** Expected: fail.
- [ ] **Step 3: Implement.** Dispatch on the route table; no per-route logic.
- [ ] **Step 4: Run it.** Expected: pass.
- [ ] **Step 5: Commit.**

---

## Task 3: Seed Bramblebrook as an app

**Files:**
- Create: `platform/scripts/seed-bramblebrook.ts`
- Create: `platform/scripts/seed-bramblebrook.test.ts`

Publishes the catalog, registers the app, approves exactly the seven types, and prints the API key once.

Measured values to use — do not re-derive them by hand:

| Field | Value |
|---|---|
| `appId` | `app-bramblebrook` |
| `surfaceKind` | `game` |
| Approved types | `FLU-MATRIX-01`, `FLU-CARPET-01`, `QUANT-SERIES-01`, `QUANT-FUNC-01`, `QUANT-BALANCE-01`, `VER-SORTBOT-01`, `VER-RELPAIR-01` |
| `uiCapabilities` | `['choiceList', 'gridLayout', 'nominalChannel', 'orderedChannel']` |
| `maxReadingBand` | `'none'` — every one of the seven requires no reading, which is the property that makes the game usable by a child who cannot yet read |
| `perDomainMinimum` | `1` |
| `ageBands` | `[]` (unconstrained), matching today's session config which sends no `ageBand` |
| `piiPolicy` | `'none'` |
| `variety` | platform defaults |
| `abilityThreshold` / `recommendProbability` | see spec §5 — depends on the owner's answer |

**A trap to avoid, and it is silent.** `@gt/ui-contract`'s `requirementFor` reads the bank from its own
`BANKS_DIR` — the repo default or `GT_QBANK_BANKS` — **never the `bankDir` the compiler was handed.** For a
type code absent from *that* directory it throws, and `uiRequirementFor` falls back to
`EMPTY_REQUIREMENT`. An empty requirement is satisfied by every app, so the capability check passes
vacuously and cannot refuse anything. Two consequences for this task:

- **Do not pass a custom `bankDir` to the seed script** unless `GT_QBANK_BANKS` points at the same
  directory. Publishing the real catalog with the default on both sides is the safe configuration.
- Note that Bramblebrook today sets `GT_QBANK_BANKS` to the 10-type curated symlink directory. Seeding
  while that is exported would give the other 43 types empty requirements. Task 7 deletes the curation,
  which removes the hazard; until then, seed in a shell where it is unset.

- [ ] **Step 1: Write the failing test.** Seeding twice is idempotent; all seven types come back from
  `listApprovedTypes`; approving an eighth type the capabilities cannot render is refused with 422;
  `maxReadingBand: 'none'` still leaves all seven eligible (this is the test that proves the reading
  claim rather than asserting it). **Assert first that all seven have a non-empty
  `uiRequirement.elements`** — without that the 422 test can pass for the wrong reason, and the
  end-to-end test written for the platform did exactly that, because its fixture types were absent from
  the directory `requirementFor` reads.
- [ ] **Step 2: Run it.** Expected: fail.
- [ ] **Step 3: Implement**, reusing `publishCatalog` from `functions/admin/src/publish.ts` with a local
  object store rather than S3.
- [ ] **Step 4: Run it.** Expected: pass, and the eligible pool for the app is non-empty in all three
  batteries.
- [ ] **Step 5: Commit.**

---

## Task 4: Map the platform's wire shapes onto Bramblebrook's

**Files:**
- Create: `screener/apps/sanctuary/shared/platform-wire.ts`
- Create: `screener/apps/sanctuary/shared/platform-wire.test.ts`

Pure functions, no fetch. This is where the two vocabularies meet, and keeping it pure is what lets it be
tested without a server.

```ts
import type { Serve, SortieState } from './types.js';

/** The platform's `GET /v1/sessions/{id}/next` body, in the fields this app reads. */
export interface PlatformNext {
  readonly item: { itemId: string; typeCode: string; domain: string; difficulty: number;
                   optionCount: number; content: Record<string, unknown> };
  readonly typeCode: string;
  readonly domain: string;
  readonly difficulty: number;
  readonly ordinal: number;
  readonly servedToken: string;
  readonly selection: { reason: string; informationAtThreshold: number };
}
export function toServe(next: PlatformNext): Serve;

/** The platform's score sheet, in the fields this app reads. */
export interface PlatformSheet {
  readonly stopped: boolean;
  readonly stopReason: string | null;
  readonly itemsServed: number;
  readonly composite: { itemsUnscorable: number };
  readonly domains: Record<string, { itemsScored: number }>;
}
export function toSortieState(sheet: PlatformSheet): SortieState;
```

- [ ] **Step 1: Write the failing test.** `toServe` fills every field of `Serve`;
  `toSortieState` maps `composite.itemsUnscorable` to `unscorable` and per-domain `itemsScored` into
  `perDomain`; **neither output contains any estimate, interval, probability, decision, or `correct`
  field** — asserted by walking the object recursively, because this is the boundary the product rule
  lives on.
- [ ] **Step 2: Run it.** Expected: fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run it.** Expected: pass.
- [ ] **Step 5: Commit.**

---

## Task 5 (REDUCED): Point `useSortie` at the platform

Reduced from a rewrite to a deletion by the wire-contract decision. The platform now serves Felipe's
`/api/bank/*`, which `useSortie`'s unsteered path **already speaks** — it posts to `/api/bank/sessions` and
reads `/next` and `/answer` today. Tasks 4's mapping layer largely disappears with it: his `NextResponse`
and `AnswerResponse` are already the shapes this app reads.

**Files:**
- Modify: `screener/apps/sanctuary/shared/useSortie.ts` — delete the steered `/sanctuary/chunk` path
- Create: `screener/apps/sanctuary/shared/useSortie.test.ts`

**The exported `Sortie` interface does not change.** What changes: `open()` always posts
`/api/bank/sessions` (no chunk route), the base URL points at the platform, and the `threshold` option goes
away with threshold steering. There is no `servedToken` to hold — the server knows which item is pending.

`delete raw.correct` can go, since the platform never sends it. Replace it with a test asserting the
response body contains no `correct` field, so the guarantee becomes an assertion rather than a deletion.

- [ ] **Step 1: Write the failing test** against a stubbed `fetch`: `open` then `answer` drives the five
  `bankRoutes` in order; the answer body carries all three response addressings; the hook never reads a
  field the contract does not define; and no request carries a threshold.
- [ ] **Step 2: Run it.** Expected: fail.
- [ ] **Step 3: Implement**, using `bankRoutes` from `@gt/qbank` for the paths rather than string literals,
  so a contract change breaks the build instead of the game.
- [ ] **Step 4: Run it, then run sanctuary's tests.** Expected: all pass, and `Game.tsx`, `Stations.tsx`,
  `Board.tsx` are untouched — verify with `git diff --name-only`.
- [ ] **Step 5: Commit.**

---

## Task 6: One session per keeper

**Unblocked 2026-08-10.** Spec §5 resolved to a fixed threshold plus the disjunctive pass, and §9.2 to one
session per keeper across every visit and battery. One number is still unchosen — the screening budget that
`maxItems` now represents; see spec §9.

**Files:**
- Modify: `screener/apps/sanctuary/server-plugin.ts` — reduce to persona mapping and the operator route
- Modify: `screener/apps/sanctuary/shared/useSortie.ts` — stop closing the session per burst
- Create: `screener/apps/sanctuary/shared/keeper-session.ts` — resolve keeperId to a live session
- Delete: the θ-steering, `keepers.jsonl` and `ledger.jsonl` paths

- [ ] **Step 1:** Write the failing test: two consecutive bursts for one keeper share a session id, the
  trace accumulates across them, and the composite interval is narrower after the second than after the
  first. That last assertion is the whole point of the task — it is the limitation
  `server-plugin.ts` documents.
- [ ] **Step 2:** Run it. Expected: fail.
- [ ] **Step 3:** Implement. `keeperId` becomes `personaId`; a keeper with a live unstopped session resumes
  it; a keeper whose session has stopped starts a new one and the platform's cross-session avoidance keeps
  items fresh.
- [ ] **Step 4:** Run it. Expected: pass.
- [ ] **Step 5:** Commit.

---

## Task 7: Retire the curation and the ledger

**Files:**
- Delete: `screener/apps/sanctuary/curate-banks.ts`
- Modify: `screener/package.json` — drop `sanctuary:banks`
- Modify: `screener/vite.sanctuary.config.ts` — mount the platform router; drop the `/api` proxy to 5203
- Modify: `screener/apps/sanctuary/server-plugin.ts` — `/sanctuary/record` reads the platform's sheet

- [ ] **Step 1:** Write the failing test: `GET /sanctuary/record` returns the keeper's composite from the
  platform, still carrying its caveat string, and returns 404 for an unknown keeper.
- [ ] **Step 2:** Run it. Expected: fail.
- [ ] **Step 3:** Implement. The sortbot pool gate becomes item data rather than a hardcoded id list —
  record how, in the commit message.
- [ ] **Step 4:** Run it, plus a clean-clone check: `npm run sanctuary` works with no `data/sanctuary/banks`
  directory present, which is the bug `curate-banks.ts` was written to fix and which now cannot recur.
- [ ] **Step 5:** Commit.

---

## Task 8: A full screening, end to end

**Files:**
- Create: `screener/apps/sanctuary/integration.test.ts`

- [ ] **Step 1:** Write the failing test: seed the app, open a keeper session, and answer every item
  correctly through the platform until it stops. Assert: every served `typeCode` is one of the seven; all
  three batteries are represented; per-domain estimates are populated for the three domains the seven
  types cover; no served payload contains `correctKey`; `unscorable` is **0** across the whole run — which
  is the assertion Bramblebrook's own harness calls the thing that must stay zero, and the one that would
  have caught the verbal types being silently unservable.
- [ ] **Step 2:** Run it. Expected: fail.
- [ ] **Step 3:** Make it pass.
- [ ] **Step 4:** Run everything: platform 269+, screener including sanctuary's 14.
- [ ] **Step 5:** Commit.

---

## Task 9: Documentation and handover

- [ ] **Step 1:** Update `platform/README.md` with the local router and the seed script.
- [ ] **Step 2:** Write `screener/apps/sanctuary/PLATFORM.md`: how to run the game against the platform
  from a clean clone, in the order a person would actually do it.
- [ ] **Step 3:** Record in the spec which of §9's five open questions were answered, and how.
- [ ] **Step 4:** Commit.

---

## Self-review against the spec

| Spec section | Covered by |
|---|---|
| §2 numeric-key blocker | Task 1 |
| §3 replacement table | Tasks 3, 5, 6, 7 |
| §4 chunk becomes presentational | Task 6 |
| §5 the decision/estimate fork | Task 6, blocked on the owner |
| §6 architecture and app declaration | Tasks 2, 3 |
| §7 what must not break | Every task's final step, plus Task 4's recursive no-score assertion |
| §8 isolation | Already done: worktree, upstream removed |
| §9 open questions | Task 9 Step 3 |

**Deliberately not in this plan:** deploying anything; new question types or art; a consent flow (the app
is `piiPolicy: 'none'`); and a scoring rule for `QUANT-GLYPHNUM-01`'s 391 placement-ratio items, which
Bramblebrook does not use.
