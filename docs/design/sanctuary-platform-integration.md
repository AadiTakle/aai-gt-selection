# Bramblebrook on the Question Platform — Design

**Status:** Proposal for review. Nothing implemented.
**Branch:** `feat/sanctuary-platform`, in an isolated worktree at `/Users/atakle/gt-sanctuary-platform`
**Merges:** `feat/sanctuary` (Bramblebrook) + `feat/aws-question-platform` (the platform). Merged clean, zero conflicts.
**Depends on:** `docs/design/aws-question-platform.md`

---

## 1. What this does

Bramblebrook already runs adaptive sorties on the real item banks. It does so by hand-rolling, inside a
Vite dev plugin, most of what the question platform now provides: per-keeper ability carried between
visits, an append-only attempt ledger, item exclusion so a returning child does not re-answer yesterday,
and a curated pool so the engine cannot serve a type the game cannot draw.

This replaces that hand-rolled half with the platform, and leaves the game — the world, the slimes, the
vacpack, the economy, and every 3D item presentation — untouched.

### Why it is worth doing

Bramblebrook's own comments name four limitations. Three of them are things the platform fixes outright.

| Bramblebrook says | Where | The platform's answer |
|---|---|---|
| "`QbankSessionConfig` has no allow-list for item types, so the only way to guarantee the engine never serves a type this app cannot draw is to constrain the pool the API loads" | `curate-banks.ts` | Per-app approved types are rows in the registry. The symlink curation goes away. |
| "the credible interval does not accumulate across chunks" | `server-plugin.ts` | One durable session per keeper. The trace accumulates, so the interval genuinely narrows. |
| "with the threshold tracking the estimate, pAbove sits near 0.5 and the confidence bars never fire" — `stopReason` reads `item-cap` every time | `SortieHarness.tsx` | See §5. This is a real fork, not a bug. |
| "the Vite plugin is not a production deploy story" | `server-plugin.ts` | The platform is the production story. Locally it runs the same handler code. |

And one thing neither has yet: Bramblebrook runs **one sortie per battery** to get per-battery numbers,
because the engine it calls keeps a single pooled posterior. The platform keeps four domain posteriors
plus a composite, so per-battery ability comes out of one session for free.

### Non-goals

- No change to the world, the slimes, the vacpack, the economy, or the audio engine.
- No change to the contract every 3D presentation is written against: `content` in, `onPick(handed)` out.
- No deployment. The platform still has no AWS account (`aws-question-platform.md` §17).
- No new question types, no new art.

---

## 2. The blocker, found by merging

`origin/dev` advanced 15 commits past the point the platform branched from, and one of those commits
changes how an answer is marked. **`scoreResponse` now accepts a numeric `correctKey` and marks it
against `selectedIndex`.** The commit explains why:

> A numeric key counts. Five verbal types — relation match, sentence completion, two meanings, sorting
> robot and story order — put a 0-based option index here because their options are positional and carry
> no letter. Requiring a string excluded all five from every pool, **which is why nothing verbal was ever
> served**, and they are two of the constructs the screener is for.

Measured on this branch against the platform's base:

| | platform base (`d7cbeff`) | this branch |
|---|---|---|
| Scorable items | 4,534 | **5,034** |
| Types with any scorable item | 32 | **37** |
| Types with none | 21 | **16** |
| Exclusions | `computed_solver` 1,774, `no-key` 891, `model_judge_deferred` 120 | `computed_solver` 1,774, `non-index-numeric-key` 391, `model_judge_deferred` 120 |

The 891 keyless records resolve into 500 newly scorable and 391 `QUANT-GLYPHNUM-01` records whose
"numeric key" is a placement ratio rather than an index.

**Two of Bramblebrook's seven active verbs are in that newly-scorable set** — `VER-SORTBOT-01` (the
sorting gate) and `VER-RELPAIR-01` (the kinship stone). So on the platform as written, Bramblebrook's
entire verbal battery is unservable. The platform types `AnswerKeyRecord.correctKey` as `string`, and its
`markAgainstKey` adapter takes a `string`.

Running the platform suite on this branch fails exactly 8 tests, all in `@platform/catalog`, all from this
one cause. The other 261 pass. Widening the key type is therefore Task 1 and it is well bounded.

---

## 3. What replaces what

| Bramblebrook today | Platform equivalent |
|---|---|
| `curate-banks.ts` symlinks 10 banks into `GT_QBANK_BANKS` | `APP#bramblebrook / TYPE#<code>` approval rows |
| `keepers.jsonl` — one θ per keeper | Persona plus a durable session; four domain posteriors and a composite |
| `ledger.jsonl` — attempts, for a future replay | The response trace, which `replay()` already rebuilds from |
| `excludeItemIds` computed in the plugin | `personaRecentItemIds`, via `GSI2` |
| Sortbot pool gate excluding 10 of 37 items | Item-level data: `validated`, age bands, approval |
| A fresh API session per chunk | One session per keeper; a chunk becomes presentational (§4) |
| `precisionIndex` into `PRECISION_STEPS` | The app's own `precision` config |
| `delete raw.correct` in the client | The platform never sends `correct` at all |
| Sessions in API process memory, lost on restart | Durable rows |
| Threshold steered per chunk from stored θ | See §5 |

Bramblebrook's `server-plugin.ts` is 329 lines, most of which is this table's left column. What survives is
`GET /sanctuary/record`, the adult-only operator view, which becomes a read of the platform's score sheet.

---

## 4. The chunk becomes presentational

Bramblebrook plays in bursts: a child walks to a station, answers about four items, and goes back to
tending slimes. Today each burst is a **separate** engine session, with ability carried between them by
writing θ to `keepers.jsonl` and passing it back as the next session's threshold. That is why the interval
cannot narrow — each session starts from the prior again.

The platform models a session as a trace, and `next` simply serves the next item from it. So a burst
stops being a session and becomes a decision the *game* makes about when to stop asking. One session per
keeper spans every visit; the trace accumulates; per-domain intervals narrow as they should; and the stop
rule fires once for the whole screening rather than reading `item-cap` at the end of every burst.

Concretely: `maxItems` becomes the screening budget rather than the burst length, the game keeps its own
"about four" pacing, and `useSortie` gains no new responsibility — it just stops closing the session.

This is the single largest behavioural improvement in the integration, and it deletes code rather than
adding it.

---

## 5. The fork worth deciding: a decision, or an estimate

These two are not the same instrument, and Bramblebrook and the platform currently sit on opposite sides.

**The platform maximises Fisher information at the decision threshold.** That is a classification stance:
the question worth asking is the one that best separates above the line from below it. It produces
`confident-above` / `confident-below` and a `recommend` decision.

**Bramblebrook steers the threshold to track the child's running mean.** `useSortie` documents the
parameter as "where to concentrate information — the child's running per-battery mean, in logits." That is
an estimation stance: it pins down ability rather than deciding about it. Its own harness records the
consequence: "with the threshold tracking the estimate, pAbove sits near 0.5 and the confidence bars never
fire," so `stopReason` is `item-cap` every time and **no decision is ever produced.**

The product rule is emphatic on this: a fifteen-minute screener "may report a decision and must never
report a score" (`brainlifting/talent-screening-brainlift`, SPOV 2), and Bramblebrook honours the second
half scrupulously — `world/types.ts` says "NOTHING IN HERE IS A SCORE" and the overlay shows only
participation. But it currently delivers neither half, because an estimator that never stops on confidence
has no decision to report.

**Resolved, 2026-08-10: fixed threshold plus the disjunctive pass.** Bramblebrook produces a decision for
the first time, and Felipe's `passRouteFor` adds the option neither of my two original choices had — a
child who spikes on one battery passes on that battery when the composite rejects them. That is much
closer to what a three-station game actually produces than a single composite bar, since a keeper who
loves the tide ledge and ignores the log has a real profile rather than a mediocre average.

The child's experience does not change: they still see "N of about 4" and their slimes. What changes is
that a session can now conclude something, and that the sheet records **which route concluded it**.

Threshold steering is retired with `server-plugin.ts`'s θ bookkeeping. The harness keeps a way to pin a
threshold, because it legitimately measures rather than decides.

---

## 6. Architecture

Nothing here deploys. The platform's handlers are the same code either way; only what routes to them
changes.

```
  Bramblebrook (Vite, port 5230)
        │  fetch /v1/sessions, /v1/sessions/{id}/next, /v1/sessions/{id}/responses
        ▼
  platform-dev-router  ── a Vite plugin that invokes the platform's real Lambda handlers
        │                  in-process, with GT_DDB_ENDPOINT pointed at DynamoDB Local
        ▼
  DynamoDB Local (Docker, 8456)     +     the compiled snapshot on disk
```

The router is deliberately thin: it builds the same API Gateway v2 event shape the handlers already parse,
injects `appId` the way the authorizer would, and returns the handler's response. It is not a
reimplementation, and it holds no measurement logic. Deploying later replaces the router with the real
API and changes a base URL.

`useSortie` keeps its exported `Sortie` interface exactly as it is, so `Game.tsx`, `Stations.tsx` and
`Board.tsx` need no changes at all. Only the fetch bodies inside it change.

### What Bramblebrook declares as an app

| Field | Value | Why |
|---|---|---|
| `appId` | `app-bramblebrook` | |
| `surfaceKind` | `game` | Its own recommendation probability, per the surface argument |
| Approved types | the 7 in `VERBS` | Replaces the symlink curation |
| `uiCapabilities` | derived from what the 7 presentations can draw | Lets the platform refuse an eighth type the game cannot render |
| `ageBands` | as `batteries.ts` declares | |
| `perDomainMinimum` | 1 | Matches today's session config |
| `piiPolicy` | `none` initially | Bramblebrook collects no contact details today |
| `variety` | platform defaults | Its pool is thin (7 types), which is exactly the case the exposure exponent exists for |

The persona is the existing `keeperId` from `localStorage`, so a returning child keeps their history and
the platform's cross-session item avoidance replaces `excludeItemIds`.

---

## 7. What must not break

- The 14 existing sanctuary tests.
- The 3D presentation contract: `content` in, `onPick(handed: string)` out, and no component ever learns
  whether an answer was right.
- `toRef` and `handedFor` addressing, including the index path that the numeric-key fix makes real.
- The dual `{ key, selectedKey, selectedIndex }` answer payload. `useSortie` sends both paths on purpose,
  and the widened `markAgainstKey` must honour both.
- No score, estimate, interval or correctness anywhere a child can see.
- The platform's own 269 tests, and `screener`'s.

---

## 8. Isolation

The user's constraint is that this must not touch other branches. Concretely:

- Work happens in a separate git worktree, so the main checkout keeps its 42 uncommitted files.
- The branch's upstream tracking was **removed**, because `git worktree add` had set it to
  `origin/feat/sanctuary` and a stray push would have landed on Tiffany's branch.
- `feat/sanctuary` and `feat/aws-question-platform` are read from and never written to.
- The merge is one-way. Nothing merges back without a review and an explicit decision.
- Bramblebrook's own dev ports (5230, and the API on 5203) are unchanged; the platform's DynamoDB Local
  stays on 8456.

---

## 9. Questions, and where they stand

**Answered 2026-08-10:**

1. **§5, the fork** — fixed threshold plus the disjunctive pass. See §5.
2. **Session scope** — one session per keeper, across every visit and battery, as §4 assumes.
3. **`QUANT-GLYPHNUM-01`'s 391 placement-ratio items** — left excluded. Folded into the wider
   `computed_solver` question, which is now a separate effort: 1,634 items across 14 types, each needing
   its own comparison rule and its own validity check.

**Still open, and neither blocks implementation:**

4. **Does Bramblebrook ever collect a guardian email?** It stays `piiPolicy: 'none'` until someone says
   otherwise, which keeps the persona pseudonymous and needs no consent design. If a "tell my parents"
   moment is planned, this changes and a COPPA design becomes a prerequisite.
5. **The retired types in `curate-banks.ts`.** It still symlinks `FLU-OPCHAIN-01`, `SPA-XFORM-01` and
   `VER-SEQUENCE-01` to keep pool composition stable across milestones. Under the platform, approval is
   explicit and stability is automatic, so the default is to drop them from the app's approved list —
   they are not among the seven verbs either way. Note this is unrelated to Felipe's three *retirements*
   (`CX-achieve-02`, `FLU-DEDUCE-01`, `FLU-ODDPAIR-01`), none of which Bramblebrook uses.

**A new number to choose.** With one session per keeper, `maxItems` stops being the burst length and
becomes the whole screening budget. Bramblebrook's "about 4" stays a presentational choice. Felipe's
`PRECISION_STEPS` top out at 40 items at Thorough, which is a plausible ceiling for a game played across
many visits, but nobody has picked it. Recorded here rather than assumed.
