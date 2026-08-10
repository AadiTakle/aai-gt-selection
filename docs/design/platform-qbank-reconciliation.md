# The platform and Felipe's engine — reconciliation

**Status:** Proposal for review. One item needs an owner decision before any code moves.
**Trigger:** PR #68 merged into `origin/dev` at `09a01d7`, landing ~2,900 lines in `screener/packages/qbank/`.
**Affects:** `docs/design/aws-question-platform.md` and `docs/plans/sanctuary-platform-integration.md`.

---

## 1. What happened

The platform was designed and built on `d7cbeff`. Since then Felipe has landed, in `@gt/qbank`, a
complete adaptive measurement stack: a pure `engine.ts`, per-domain posteriors, a caller-held encrypted
session token, a compiler-checked wire contract, an OpenAPI document, a typed client, per-item guessing
floors, rapid-guess detection, CogAT pool alignment, and three type retirements.

Substantial parts of the platform now duplicate it. This document says which parts should be deleted and
which should stay, and surfaces one decision that is not mine to make.

`@gt/engine`'s public surface did not change. `Posterior` gained `clone()` and `fromSnapshot()`. All the
new work is in `@gt/qbank`, so the platform's dependency on the engine is unaffected and its dependency
on qbank is where everything moved.

---

## 2. The decision that needs an owner

Commit `b6988fb` says, in its first line:

> **Decided by Felipe: caller-held, not DynamoDB.** A Pokémon game or a family portal should not have to
> provision a table to ask two questions, and with `selectNext` and `grade` already pure this is the last
> thing between the engine and a stateless deployment.

That contradicts the datastore choice made for the platform last night, and it needs settling rather than
quietly working around. My read is that **both are right about different problems, and this is not an
either/or**:

**Felipe's argument holds for in-flight state.** A game asking four questions should not need a table, the
AES-GCM-over-signing reasoning is sharper than a signed token would have been, and the observation that a
*readable* token would tell a child whether they got each item right — defeating the one rule this product
never breaks — is a genuinely better argument than any I made for DynamoDB.

**A caller-held token cannot satisfy requirement 4.** The original ask was: "if a qbank item gets its
difficulty updated, we can query the database to find all sessions that had that item and update their
score sheets and check if any of them now meet the gifted criteria and perform actions accordingly," plus
storing persona contact details so a family can be reached. A transcript that lives only in the child's
browser is gone when they close the tab. There is no query that finds it, no sheet to recompute, and no
persona to contact. `GSI1` exists for precisely that query and has no equivalent in a sealed token.

Felipe's own commit concedes the matching limitation: preventing token replay "needs server-side memory of
what has been spent, which is the thing caller-held state was chosen to avoid."

**Proposed synthesis:** the sealed token is the *client's resume handle* for an in-flight session, and the
platform *also* appends the trace server-side. A consumer that only wants to ask two questions uses the
token and provisions nothing. A consumer that needs retroactive re-scoring or family outreach — which is
the GT screener itself — gets the durable trace as well. The token stays the source of truth for belief
during a session, since it replays bit-for-bit; the durable rows are what make the session findable later.

**Alternatives, if the owner disagrees:** (a) caller-held only, and requirement 4 is dropped, along with
gifted outreach; (b) durable only, and every consumer provisions a table; (c) the synthesis above. I
recommend (c) and the rest of this document assumes it, but Tasks 3 and 5 below change materially under
(a).

---

## 3. The catalog numbers moved again

Measured on `09a01d7` with `loadBanks()`, against the two earlier points:

| | platform base `d7cbeff` | before PR #68 | **current `09a01d7`** |
|---|---|---|---|
| Types | 53 | 53 | 53 |
| Records | 7,319 | 7,319 | 7,319 |
| **Scorable** | 4,534 | 5,034 | **4,934** |
| Types with any scorable item | 32 | 37 | **36** |
| Types with none | 21 | 16 | **17** |

Current exclusions, summing to 2,385:

| Reason | Count | Meaning |
|---|---:|---|
| `computed_solver` | 1,634 | Down from 1,774: `SPA-PUNCH-01`'s 140 cell-set items are now servable |
| `non-index-numeric-key` | 391 | `QUANT-GLYPHNUM-01`, whose numeric key is a placement ratio |
| `retired:reviewer-kill` | 240 | `CX-achieve-02`, `FLU-DEDUCE-01` |
| `retired:validity-defect` | 120 | `FLU-ODDPAIR-01` — 31 of 120 well-posed; 49 have no matched pair |
| `model_judge_deferred` | 0 | Its only type, `CX-achieve-02`, is now retired |

`FLU-ODDPAIR-01`'s retirement is worth reading rather than skimming: its stored key was arbitrary on
items with no matched pair, so the bank was **marking correct reasoning wrong**. That is the failure mode
the platform's own `unscorable` accounting was built to make visible, caught here by an audit instead.

**None of the three retired types is one of Bramblebrook's seven verbs**, so the sanctuary integration is
unaffected by the retirements.

`computed_solver` also turns out to have been misnamed rather than unmarkable: all 1,774 items carry a
fully-formed `correctKey`, and the mode really meant "the key is not a single option letter or index."
Only Paper Folding's cell-set comparison is implemented; fourteen other types have keys and no comparison
rule. That is 1,634 items sitting behind rules nobody has written, and it is a larger recoverable pool
than anything else on this list.

---

## 4. What the platform should delete and reuse

| Platform code | Replace with | Why |
|---|---|---|
| `@platform/scoring` `MultiPosterior` | `Posteriors`, `posteriorsFrom`, `clonePosteriors`, `domainBandsFor` | Same four-plus-composite design, already tested, and `posteriorsFrom` replays from a transcript exactly as `replay()` does |
| `computeSheet`'s stop logic | `stopReasonFor`, `stateFor` | Identical rule; his is already the one the API and Bramblebrook run |
| My composite-only decision | `passRouteFor` and the disjunctive pass | Strictly better: a child who spikes on one domain can pass on it when the composite rejects. Directly relevant to Bramblebrook's per-battery framing |
| `c = 1 / optionCount` with a fallback of 4 | `optionCountOf` and `paramsForRecord` | Mine assumed four options when it could not tell. His derives counts for steppers, grids, probe sets and bin/token spaces, and uses `UNGUESSABLE = 0` when it genuinely cannot — which is honest where my 4 was a guess |
| `markAgainstKey` | `scoreResponse` directly | Already handles letters, numeric indices and cell sets |
| Platform-local request/response types | `wire.ts`, `client.ts`, `openapi.ts` | Compiler-checked, documented, and shared with every other consumer |
| Nothing yet reads CogAT alignment | `buildPool(..., { cogatAlignment })` | All 53 types now have an explicit alignment decision |

`@platform/scoring` largely dissolves into a thin adapter. That is the correct outcome: the psychometrics
should have one implementation, and his is now the more capable one.

Two behaviours the platform did not have and should adopt outright: **rapid-guess detection** (a response
too fast to be an attempt is unscorable, not wrong — which matters a great deal in a game where tapping is
cheap) and **the multiple-choice share quota**, which keeps a session from becoming all constructed-response.

---

## 5. What the platform should keep

None of this exists in `@gt/qbank`, and all of it was in the original ask.

- **The registry.** Versioned write-once type records, revisioned items with history, and the whole notion
  of an *app*. qbank has no app concept at all: no approved-type list, no per-app config, no API key.
- **Durable traces and `GSI1`.** The item-correction backfill, which §2 argues a token cannot do.
- **Personas, guardian contact, retention, and the qualification outbox.**
- **Answer-key isolation at the IAM layer.** qbank's `@gt/qbank` versus `@gt/qbank/server` split is a real
  boundary, but it is a module boundary. An IAM role with no statement naming the table is stronger, and
  the two compose.
- **The eight variety layers and exposure control.** Felipe's `selectNext` is a deterministic greedy
  argmax — the first max-information item in pool iteration order wins, and the stored `seed` is not used
  in selection. Measured against the real catalog, that serves a 1,000-child cohort **16 distinct items**.
  This is the platform's most valuable independent contribution and the strongest candidate to offer
  upstream, so both consumers get it rather than only mine.
- **The CDK infrastructure**, budget guardrails, and account isolation.

---

## 6. Revised task list

Replaces Task 1 of `docs/plans/sanctuary-platform-integration.md` and inserts before it.

- [ ] **Task 0 — settle §2.** Blocking. Nothing below is stable until caller-held versus durable versus
      both is decided.

- [ ] **Task 1 — make the platform build against current dev.** Already partly done: the platform's
      tsconfig and vitest config now alias `@gt/ui-contract/cogat`, which the qbank engine began importing.
      Remaining: widen `AnswerKeyRecord.correctKey` to `string | number`, fix the one `tsc` error at
      `packages/catalog/src/compile.ts:251`, and move the golden numbers to **4,934 / 36 / 17** with the
      exclusion reasons in §3. Expected result: 269 passing, 0 failing.

- [ ] **Task 2 — replace `@platform/scoring` with an adapter over `engine.ts`.** Keep `ScoreSheet` as the
      platform's stored shape, but derive it from `stateFor` and `domainBandsFor` rather than from a second
      posterior implementation. The composite-equivalence test becomes a test that the adapter agrees with
      `QbankState`, which is a stronger statement than the one it replaces.

- [ ] **Task 3 — decide where session state lives, then wire it.** Under the synthesis: `serve` issues a
      sealed token *and* appends the response row; `score` opens the token, grades with `grade()`, and
      completes the row. Under caller-held-only, the store shrinks to the registry and Tasks 5–7 of the
      sanctuary plan lose the persona path.

- [ ] **Task 4 — keep variety, over his pool.** Compose the eight layers on top of `buildPool` and
      `selectNext`'s objective rather than re-deriving information. Then open the question of contributing
      it to `@gt/qbank` so Bramblebrook and the family portal both benefit.

- [ ] **Task 5 — adopt the disjunctive pass in `GiftedCriteria`.** A composite-only bar cannot express
      "passed on quantitative alone," which is exactly the shape Bramblebrook's batteries produce.

- [ ] **Task 6 — adopt rapid-guess flags.** Carry `flags` onto the platform's response record, and count a
      rapid guess as unscorable rather than wrong.

- [ ] **Task 7 onwards — the sanctuary plan as written**, with its Task 1 struck and its numbers updated.

---

## 7. What this does not change

The sanctuary integration's shape survives intact. Bramblebrook still needs a per-app approved-type list
to replace its symlink curation, still needs a persona to carry a keeper between visits, and still gets
per-domain intervals it cannot currently obtain. Two of its plan's findings get *better*:

- The numeric-key blocker is real and unchanged — `VER-SORTBOT-01` and `VER-RELPAIR-01` still depend on it.
- The §5 decision-versus-estimate fork is partly answered upstream. Felipe's disjunctive pass exists so a
  spiky profile passes on a single domain, which is closer to what a per-battery game wants than either of
  the two options I posed. The fork is still live, but the third option is now the interesting one.

Ports, isolation, and the worktree are unchanged. `origin/feat/sanctuary` remains untouched.
