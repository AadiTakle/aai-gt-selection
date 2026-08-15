# Per-session hidden systems for Stage 2 — design, feasibility measurement, and a proof of concept

**Status:** Design note plus its supporting measurement and a working proof of concept for one type
(`FLU-OPCHAIN-01`). **Nothing is wired into the live learning block, no bank is changed, and no
generator, checker or Gate A artifact is touched.** The architecture change is recorded as
**D-208, Proposed** — it is the owner's to ratify, and §9 states plainly what it does and does not
buy.

**Requirements served:** R7 (auditable and falsifiable — every figure below is one command), R10
(state the boundary of every conclusion), R5/R6 indirectly (a bank whose answer key survives one
scrape cannot measure growth; it measures whether the client had the file), H1, H6.

**Evidence used:** E-074 (the bank/served-item contract), E-075 and E-076 (answer-key derivability
from served content), E-094 (key-position balance), E-095 (the recovery ladder the block length is
set against), E-200 (a misspecified floor inside a closed adaptive loop biases rather than adding
noise — the reason a drifting difficulty label is not a small problem).
`docs/product/STAGE2_ANTILEAK_COMPARISON.md` §7.1 for the defect. **One new evidence entry is
claimed: E-207**, the feasibility measurement in §3–§5 and §9.

**In scope:** whether the four shipped Stage 2 banks admit per-session re-keying at all, what it
costs, and a server-side proof of concept for `FLU-OPCHAIN-01`. **Out of scope:** converting the
other three types; changing any bank, generator or checker; wiring anything into the live block;
Gate A or Gate B; and the threat-model question of whether the residual in §9 is acceptable, which
is the owner's.

**Claim boundary, before any number.** Every figure here is a property of *banks*, measured against
`syntheticOnly: true` / `validated: false` items. None of it is evidence about a child. "A client
scores 91.3%" describes an automated script, not an eight-year-old, and it does not belong in a
responder model or a guessing floor.

---

## 1. The defect, and why it is not a distractor problem

`FLU-OPCHAIN-01` and its three siblings are built around a hidden system — a mapping from visible
badges, glyphs or affix forms to operations — that the child induces across ~30 trials that never
repeat. **That system is drawn once at build time and baked into the shipped bank file, one system
per bank.**

The measured consequence (`STAGE2_ANTILEAK_COMPARISON.md` §7.1): intersecting "the machine's output
was one of the figures on that screen" across served items constrains the *same unknown* every time,
so the constraints intersect and pin the system **exactly after 4 to 12 items**, after which the
attacker is right about everything. A block serves 30–60 trials, so this is available inside one
ordinary session. And because the system ships in the file, **one offline scrape breaks that bank
permanently, for every subsequent child.**

No distractor invariant can close this. The system must persist across trials or there is nothing to
learn — that persistence *is* the construct — and the same persistence is what makes it solvable
from a handful of examples. The generator's own `perTrial` control arm redraws the system every item
and is unservable for exactly that reason: it makes the task unlearnable by construction.

**The owner's decision.** Generate the hidden system per session, server-side. The client never
receives the mapping; answer keys are verified server-side; scraping one child's session tells an
attacker nothing about another child's.

---

## 2. The shape being tested, and the property that would make it work

The proposed shape: the bank ships **item structures** — input figure, badge chain, option set —
with **no key and no mapping**. At session start the server draws a mapping for that child. The key
of an item is whatever that mapping produces on it.

This is only possible because of a property the existing anti-leak invariant already asserts: **most
options in each item must be reachable under some relabelling of the hidden system.** `SPA-XFORM-01`
requires at least four of five; `FLU-OPCHAIN-01` requires at least one distractor besides the key;
`VER-MORPHO-01` asserts it across the whole bank. Change the mapping and a different option becomes
correct — which is exactly what lets one structure serve many mappings.

**That property is necessary and it is not sufficient, and the difference is the whole of this
note.** Four things have to hold, and they were measured rather than assumed:

| | question | answer | §  |
| --- | --- | --- | --- |
| Q1 | Do enough options admit re-keying? | **Yes for three of four types.** | §3 |
| Q2 | Does the calibrated difficulty survive? | **No.** Recomputable, but see Q4. | §4 |
| Q3 | Do the distractors stay meaningful? | **Mostly** — 78.1% keep all four. | §4.3 |
| Q4 | Is enough of the bank still servable? | **No. This is the blocking finding.** | §5 |

Reproduce every table below with one command; it needs the four Stage 2 branches fetched and touches
no working tree, because the banks are read out of the git object database by `<ref>:<path>`:

```
node research/exam-question-types/stage2-session-keying-feasibility.mjs
node research/exam-question-types/stage2-session-keying-feasibility.mjs --json
```

Its output is committed at `research/exam-question-types/stage2-session-keying-output.md`, so every
figure here can be checked without running anything. Runtime is about two seconds; everything is
seeded from the constant `STAGE2_SESSION_KEYING|v1` printed in the header.

**How the semantics were obtained.** The figure, lattice, numeral and picture algebras in the probe
are re-implemented from each type's specification rather than imported from its generator, for the
reason `STAGE2_ANTILEAK_COMPARISON.md` gives: importing a generator's own `applyOp` makes a
generator that is wrong about its own algebra agree with itself. Each adapter is checked by
re-deriving **every shipped key from the shipped mapping on every item of every bank** before any
number is computed; all 1,404 items pass. The difficulty model is the opposite case and *is* the
generator's own arithmetic, because Q2 asks whether the product's own rung survives.

---

## 3. Q1 — how many options a session mapping can make correct

For each item, enumerate every bijection over the tray, keep the ones whose derived output is on
screen, and count how many *distinct* options they key. That count is the size of the key space a
session draw can move within, and the modal share is what a client gets for brute-forcing the draw
and playing the most likely option.

**"Safely re-keyable" is set at the level `SPA-XFORM-01` already requires of itself: at least four
of five options reachable** (three of four for the four-option verbal type). One threshold is a
summary, so the full histogram is below it.

| bank | n | options | mappings | mean reachable | **≥ k−1 reachable** | all reachable | ≤ 1 reachable | mean modal share | worst item |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 234 | 5 | 720 | 4.13 | **78.2%** | 44.9% | 0.0% | 28.9% | 50.0% |
| `SPA-XFORM-01` | 234 | 5 | 720 | 4.09 | **100.0%** | 8.5% | 0.0% | 32.1% | 52.2% |
| `QUANT-GLYPHNUM-01` | 468 | 5 | 120 | 3.90 | **63.0%** | 32.3% | 0.0% | 36.1% | **82.4%** |
| `VER-MORPHO-01` | 468 | 4 | 720 | 3.99 | **99.4%** | 99.4% | 0.0% | 26.6% | 50.0% |

Items by number of reachable options:

| bank | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 0 | 0 | 23 | 28 | 78 | 105 |
| `SPA-XFORM-01` | 0 | 0 | 0 | 0 | 214 | 20 |
| `QUANT-GLYPHNUM-01` | 0 | 0 | 25 | 148 | 144 | 151 |
| `VER-MORPHO-01` | 0 | 0 | 3 | 0 | 465 | — |

**Four readings, and they are not the same result.**

- **No item anywhere is un-re-keyable.** Zero items across all 1,404 have one or fewer reachable
  options, which is the floor case that would make per-session keying pointless for that item. The
  existing invariant does deliver something.
- **`VER-MORPHO-01` and `SPA-XFORM-01` pass outright** — 99.4% and 100.0% at the four-option bar.
  `VER-MORPHO-01` is the strongest of the four: 465 of 468 items admit *all four* options.
- **`FLU-OPCHAIN-01` passes on 78.2%** and would have to drop or regenerate the other 21.8%. Its 23
  two-option items hand a client 50% against a 20% floor the moment they are re-keyed, which is
  worse than the 28.2% the shipped bank leaks today. **They must not be served under this design.**
- **`QUANT-GLYPHNUM-01` is the weak one, as it was in the anti-leak comparison.** 63.0% at the bar, a
  36.1% mean modal share, and a worst item at **82.4%** — an item where five of six admissible
  mappings key the same option, so re-keying it is nearly a no-op. Its hypothesis space is also the
  smallest of the four (120 rather than 720), which compounds everything in §9.

**The mean modal share is the honest headline for what per-session keying leaves per item: 26.6% to
36.1% against floors of 20% and 25%.** That is not a coincidence and it is not a regression — it is
almost exactly the per-item content-attack figure each type already publishes. Per-session keying
does not make an item harder to attack; it removes the *cross-item* attack and leaves the per-item
one where it already was.

---

## 4. Q2 — the calibrated difficulty does not survive, and why that was predictable

### 4.1 Every one of the four types prices a count that a relabelling scrambles

This is a structural finding and it is uniform across the four types, which is what makes it worth
stating as a fact about the design rather than as a defect in one generator. Each type splits its
operator vocabulary in two and prices **the count of one half**:

| type | difficulty levers | mapping-invariant | **moves with the mapping** |
| --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | depth, geom, similarity | chain length | `geom` — distinct *orientation* operators |
| `SPA-XFORM-01` | depth, turns, density, similarity | chain length, block count | `turns` — *orientation* operators |
| `QUANT-GLYPHNUM-01` | length, binds, distinct, nearness | expression length, distinct glyphs | `binds` — *digit-then-scale* pairings |
| `VER-MORPHO-01` | depth, scope, similarity | affix count | `scope` — *number* affixes |

The class a symbol belongs to is a property of the operator it maps to, not of the symbol. So a free
relabelling moves the priced lever:

| bank | priced lever | mappings that move it | mean drift | max |
| --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | `geom` | **48.3%** | 0.48 | 2.00 |
| `SPA-XFORM-01` | `turns` | **50.3%** | 0.53 | 2.00 |
| `QUANT-GLYPHNUM-01` | `binds` | **21.4%** | 0.24 | 2.00 |
| `VER-MORPHO-01` | `scope` | **42.9%** | 0.45 | 2.00 |

In the product's own units, for the type whose full model is on `dev`:

| | mean \|Δdifficulty\| | p95 | max | items moved off their 0.5-point rung |
| --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01`, free relabelling | **0.83** | 2.94 | 5.88 | **48.3%** |

**This is a blocking finding for the naive form of the design, and the size is what makes it one.**
The bank's own granularity is 0.5 points; `itemSelectionTolerance` is 0.25 (D-203); the whole ladder
is 19 points. A mean absolute drift of 0.83 with a p95 of 2.94 does not perturb the targeting, it
swamps it — and it is not random error. It correlates with which lever configurations the bank
serves at which rungs, which is the *structured* labelling error §1.1(d) says biases `lambda` rather
than merely attenuating it, inside the closed fit-aim-fit loop E-200 caught amplifying exactly this
class of misspecification.

### 4.2 The obvious fix works and does not save the design

The server knows the session mapping, so it can price the item under the mapping the child will
actually meet. **Recomputing removes the drift by definition** — the PoC does this, and a test pins
the recomputation against the generator on all 234 items. Two things then have to be checked rather
than assumed, and both were:

| | 0.5-rungs short of 5 items | served ladder span | serving it determines `geom` |
| --- | --- | --- | --- |
| bank as shipped | 0.0% | 1.02 – 19.98 | n/a (`geom` is fixed) |
| session subset, shipped rung | 87.8% | — | — |
| session subset, **recomputed rung** | **87.9%** | 1.07 – 17.20 | **45.3% of served items** |

Neither is good. **Recomputing does not restore the ladder** (§5 explains why: the ladder was already
gone before the rung was recomputed). And **it opens a channel**: `difficulty` is served, so on 45.3%
of items the served pair (chain length, recomputed difficulty) admits only one `geom` value, and the
client is handed how many of the chain's badges are orientation badges. That is a leak assembled out
of two separate correctness measures — precisely the failure `FLU-OPCHAIN-01`'s own rebuild report
named when it de-phased its two cursors, and precisely the one `VER-MORPHO-01` then walked into.

**A rounded or banded `difficulty` would blunt this and was not measured.** It is the obvious next
step and it trades targeting precision for the channel; nothing here says how much.

### 4.3 The distractors mostly survive, which was not obvious

Every non-key option is the output of a *named* partial rule of the chain — a reorder, an omission, a
double application, a substitution, first-step-only, or the identity — and that naming is what makes
each wrong answer classifiable (§4.6's strategy trace, and the ordinal fallback the Verdict-2 branch
depends on). Under a different mapping the chain is different, so its partial rules are different,
and the shipped figures need not be the output of any of them.

| | (item, mapping) pairs | all four still named | mean named, of 4 |
| --- | --- | --- | --- |
| `FLU-OPCHAIN-01`, free relabelling | 4,266 | **78.1%** | 3.64 |

**78.1% is better than expected and it is not 100%.** On 21.9% of re-keyings at least one on-screen
option is not the output of any partial rule of the session's chain, so `M-ERRTYPE` / `M-RULEID` are
uncomputable for that response and the error taxonomy has a hole. The hole is a per-session property,
which means it cannot be fixed by inspecting the bank once.

---

## 5. Q4 — the blocking finding: a draw takes most of the bank away

An item is servable in a session only if the session's mapping puts the machine's output on screen.
That is a much stronger condition than "some mapping does", and it collapses with chain depth:

| chain depth | items | difficulty span | relabellings landing on screen | mean reachable options |
| --- | --- | --- | --- | --- |
| 1 | 49 | 1.02 – 5.29 | **78.2%** | 4.69 |
| 2 | 60 | 4.06 – 11.11 | **25.7%** | 4.38 |
| 3 | 58 | 8.06 – 16.52 | **13.5%** | 3.93 |
| 4 | 67 | 12.06 – 19.98 | **13.8%** | 3.67 |

The arithmetic is not subtle. A depth-`d` chain has `P(6,d)` distinct operator readings — 6 at depth
1 and 360 at depth 4 — and only five places on screen to land. So a depth-1 item is keyable by most
mappings and a depth-4 item by almost none.

**Depth is what the ladder is made of**, so the thinning is not uniform. Over 40 seeded draws:

| | bank servable under one draw | 0.5-rungs short of 5 items | worst key slot | per-item ceiling |
| --- | --- | --- | --- | --- |
| free relabelling, 720 systems | **28.0%** (worst draw 16.2%) | **87.8%** (bank as shipped: 0.0%) | 29.4% | 28.9% |

**The bank is built so every 0.5-point rung carries at least five items, and a session pool leaves
87.8% of those rungs short.** §1.1(c) is explicit about what that costs: a child climbing at 0.10
points per trial ends a 30-trial block wanting items around `standing + 4`, and a pool that thins out
before then saturates, goes all-correct, and has its `lambda` pushed toward the bound with an
inflated standard error — truncating the distribution exactly where the interesting children are.
The mean served span stops at 17.20 rather than 19.98.

**One thing this buys, worth recording:** the key slot no longer comes from a round-robin cursor
walking the emission index, so F7b — the difficulty-ordinal slot attack that scores **70.5%** on this
bank — dies outright. The measured worst slot under a draw is 29.4% against a 20% floor, which is
worse balance than the cursor's 20.1% and enormously better than what the cursor leaks.

### 5.1 The alternative that preserves difficulty, measured and rejected

If a free relabelling breaks the difficulty because it moves the class count, the obvious repair is to
draw only from relabellings that keep each badge inside its operator class — the orbit of the shipped
mapping under the class-preserving subgroup. `geom` is then invariant by construction and the drift
is exactly zero.

**It was measured and it is much worse.** The family is 20× smaller (36 systems rather than 720 for
`FLU-OPCHAIN-01`, 12 for `QUANT-GLYPHNUM-01`), and the key space collapses with it:

| bank | systems | mean reachable | ≥ k−1 reachable | ≤ 1 reachable | mean modal share |
| --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 36 | 2.11 | **4.3%** | 26.1% | **57.5%** |
| `SPA-XFORM-01` | 48 | 2.16 | **4.7%** | 23.5% | **58.7%** |
| `QUANT-GLYPHNUM-01` | 12 | 1.61 | **0.2%** | 45.5% | **73.8%** |
| `VER-MORPHO-01` | 36 | 2.46 | **43.4%** | 17.9% | **50.1%** |

A client that knows the scheme brute-forces 36 hypotheses and scores **57.5%** against a 20% floor on
`FLU-OPCHAIN-01`, 73.8% on `QUANT-GLYPHNUM-01`. And on a quarter to a half of items the class-
preserving family reaches only one option, meaning the key does not move at all between sessions —
the design's whole purpose, defeated on those items.

**This is the trade in one sentence: the priced difficulty lever IS the operator class count, and the
key only moves when the class count moves.** There is no relabelling family that holds one and varies
the other, because they are the same quantity. Recording it here so it is not re-proposed.

---

## 6. What has to move server-side, and what that costs

Four things, all of which are precomputable today and none of which is under per-session keying.

| | today | under per-session keying | cost |
| --- | --- | --- | --- |
| **the mapping** | `answer.system.mapping`, in the bank file | drawn per session, held in the session record, never serialised toward a client | one new server-side secret per sitting, with the retention and audit questions that implies |
| **the key** | `answer.correctKey`, precomputed at build | derived per item per session from the mapping | keys cannot be precomputed, cached, or diffed against a fixture |
| **the verifier** | can compare against a stored key; `supabase/migrations/20260731120000_exam_verify_opchain.sql` does it in plpgsql | must be handed the session's mapping and re-derive | the figure algebra has to exist in the verifier's language — a second implementation of D4 next to the generator's |
| **the oracle** | one system per bank, so cumulative deducibility is computable offline once | recomputed per session, per trial | 720 hypotheses filtered per trial; measured at well under a millisecond, so this one is cheap |

**What breaks, concretely.**

1. **The demo cannot self-verify.** Several renderers fall back to fetching `../banks/<CODE>.jsonl`
   when opened standalone, and the standalone path is how a designer checks a renderer without the
   app. Under per-session keying there is no key in the file to fall back to, so the standalone path
   either loses correctness feedback or needs a dev-only mapping endpoint — which is a new
   key-shaped surface and should not be built casually.
2. **Offline scoring of a stored trace stops working** unless the session's mapping is stored beside
   the trace. That makes the mapping a durable record rather than an ephemeral one, which is a
   privacy and retention decision, not an implementation detail.
3. **`revealFor()` moves.** It reads `item.answer.correctKey` today; it would take the session system
   instead. The PoC returns the reveal from the verifier itself so no other code path can produce
   one.
4. **Item-level calibration weakens.** An item's difficulty is no longer a fixed property of the
   item, so a Gate B calibration attaches to the *lever tuple* rather than to the `itemId`. Gate B
   needs ~128 real children (§4.1.3); this decision changes what those children would be calibrating.
   **This is the largest downstream consequence and it is not reversible after data collection.**
5. **The selection index becomes per-session.** `getServedIndex()` builds one cached index of ~3k
   items for every sitting; under per-session keying the difficulty of a Stage 2 item is
   session-dependent, so the Stage 2 slice of that index has to be rebuilt per session.

**Latency.** The expensive step is deriving 234 keys and difficulties for one draw, which is 234
chain evaluations of at most four operations — microseconds. The oracle is 720 hypothesis filters per
trial. Neither is a latency concern at this bank size. **The cost is complexity and blast radius, not
milliseconds**, and it should be argued on that basis.

---

## 7. The proof of concept

`apps/web/src/lib/exam/stage2-session-keying.ts`, exercised by
`apps/web/src/lib/exam/stage2-session-keying.test.ts` (19 assertions). **Imported by that test and by
nothing else** — no route, loader, runner or verifier reaches it, and no child is served anything by
it.

It implements, for `FLU-OPCHAIN-01`: the figure algebra; `drawSessionSystem` (seeded from the
caller's per-sitting seed, so a session replays exactly, which is D-202's rule applied to a second
draw); `deriveKey`; `sessionPool` and `sessionLadder`; `difficultyFromLevers` recomputed per session;
`verifySessionAnswer`, which is the only thing that decides correctness and the only thing that emits
a reveal; `toSessionServedItem`; and `deducibility`, the cumulative learnability oracle.

**It derives structures from the shipped bank rather than introducing a new file format.** That is
deliberate: it demonstrates that the served projection plus one lever is all a session needs, without
touching a bank another workstream owns and without a migration whose value depends on a decision
nobody has taken.

What the tests establish, beyond that it runs:

- **the semantics are right** — all 234 shipped keys, all 234 shipped difficulties and all 234 `geom`
  counts are re-derived from the shipped mapping and match;
- **a served item carries no mapping and no key** — no `mapping`, `correctKey`, `system`, `levers` or
  `distractorSimilarity` in the payload, none of the six operator *names*, and the projection is
  built by naming its seven fields rather than by deleting four, so a field added upstream cannot
  reach a child by being forgotten;
- **the served item does not determine the key** — brute-forcing all 720 bijections against a slice
  of the session pool leaves more than one option standing on every item, and the true key is always
  among them;
- **the same item re-keys** — eight session mappings, all distinct, all bijections, each replaying
  exactly from its seed; more than half of comparable (item, mapping) pairs move the key; over half
  the bank's items reach four or more distinct keys across the 720; and the same tap that is correct
  under one session's mapping is judged **wrong** under another's, which is what makes one child's
  scraped answers worthless to the next;
- **the cost is pinned as a test, not just as a paragraph** — a session pool keeps between 10% and
  60% of the bank and leaves more than half the 0.5-point rungs short, asserted so a later attempt to
  wire this in cannot quietly skip it;
- **the oracle survives** — it is handed observations and a tray and nothing else (no bank constant,
  no build-time seed, no stored mapping), it never pins a badge to the wrong operator, and it pins
  monotonically more of the system as a block proceeds.

**One duplication is introduced and is a real cost:** the difficulty constants are transcribed from
`research/exam-question-types/generators/FLU-OPCHAIN-01.mjs` rather than imported, because the
generator is a research `.mjs` outside the app's build graph. The test that re-derives all 234
shipped difficulties is what keeps the two in step, and it fails loudly if the generator's weights
change.

---

## 8. What would have to change to make this shippable

Not done here, and listed so the size of the remaining work is visible rather than implied. **Items 1
and 2 are the blocking ones**; the rest are consequences.

1. **The bank must be regenerated so that items admit many mappings, not one distractor.** The
   binding invariant today is "at least one distractor is relabel-reachable". What per-session keying
   needs is "at least *N* of the `P(6,d)` relabellings land on screen", which is a different and much
   stronger requirement, and it is what would lift the 28.0% servable share. That is a generator
   change and it belongs to the type's owner.
2. **The ladder must be re-established under the draw**, either by the above or by building enough
   depth-3 and depth-4 items that 13.8% of them still fills a rung. On today's numbers the second
   route needs roughly seven times the deep-item count.
3. **Items with two or fewer reachable options must be excluded** (23 of 234 on `FLU-OPCHAIN-01`, 25
   of 468 on `QUANT-GLYPHNUM-01`) or they hand a re-keying client 50% against a 20% floor.
4. **`difficulty` needs a decision about banding**, because a session-recomputed rung determines
   `geom` on 45.3% of items.
5. **The verifier, the reveal, the offline scorer and the standalone demo path** each need the
   session mapping or need to stop needing a key (§6).
6. **The mapping's retention** has to be decided: it must persist for a session to be replayable or
   re-scored, and it is a per-child secret.

---

## 9. Whether this actually closes the attack — stated plainly

**It does not close it. It changes who it is available to.**

The measurement, on `FLU-OPCHAIN-01`, 40 seeded sessions of 30 trials each, with the session's own
mapping drawn from all 720:

| channel | sessions where the mapping is pinned exactly | median trial | client accuracy over the block |
| --- | --- | --- | --- |
| **on-screen only** (the published F6 procedure) | 0.0% | — | **48.0%** |
| **with the reveal** (what a learning block actually gives) | **100.0%** | **trial 6** | **91.3%** |

The reveal is not an oversight. A learning block has to show the child the machine finishing its
action or there is nothing to induce from (§1.5), and that reveal is one exact observation of the
hidden system per trial. Six of them pin it.

**So, precisely:**

- **What per-session generation fixes.** Bank-wide permanent compromise. One scrape of the file, or
  of one child's completed session, currently yields the mapping and therefore every answer in the
  bank for every subsequent child, forever. Under per-session keying it yields one child's mapping,
  which is worth nothing to the next child. It also kills the F7b difficulty-ordinal slot attack
  (70.5% on this bank) as a side effect, because the key slot stops being a function of the emission
  index.
- **What it does not fix.** A motivated child, or a script running in their browser, still solves
  their own block. The mapping is pinned by a median of six trials from the reveals the design must
  give them, after which they are right about everything. **Per-session keying converts a permanent,
  transferable compromise into a per-session, non-transferable one. It does not make a block
  unsolvable, and nothing that keeps the construct learnable can.**
- **The residual is bounded below by the construct itself.** Anything that stops within-session
  intersection stops within-session learning, because they are the same operation performed by
  different agents. That is not an argument for accepting the residual; it is the reason the residual
  cannot be engineered away and has to be handled somewhere else.

**Framing the question rather than answering it, because it is the owner's.** Whether the residual
matters depends on facts this project does not hold: whether Stage 2 is administered proctored or
unproctored; whether the readout it feeds is a reported band, a ranking, or an input to an admission
decision; and what the consequence of one inflated block is for one child and for the children they
are compared against. E-075 has already recorded that part of this class of exposure is a limit of
unproctored administration rather than a bank defect, and mitigation there belongs in proctoring and
process telemetry rather than in the item design. **The distinction this note adds is that E-075's
cases were unfixable because the stimulus *is* the derivation, whereas this one is partly fixable —
and the part that is fixable is the part that persists across children.** That is a different kind of
harm from a single child gaming a single sitting, and it is worth a decision rather than an inherited
precedent.

---

## 10. What this note does not claim

- **Not that `FLU-OPCHAIN-01` or any sibling should or should not ship.** That is Gate A and Gate B
  and both are owned elsewhere. Nothing here is evidence that any of these types measures learning.
- **Not that the proof of concept is production code.** It handles one type, is imported by its own
  test and nothing else, duplicates four constants, and would fail §8's list on contact with a
  session.
- **Not that 28.0% servable is a property of per-session keying.** It is a property of *these banks*
  under per-session keying. A bank generated against the invariant in §8.1 would measure differently,
  and how differently is not known.
- **Not that the other three types would behave like this one.** §3 measures re-keyability for all
  four and §4.1 measures the lever drift for all four; the ladder, servability and residual figures in
  §4.2, §5 and §9 are `FLU-OPCHAIN-01` only. `QUANT-GLYPHNUM-01`'s 120-system hypothesis space in
  particular will not behave like a 720-system one and has not been measured here.
- **Not that any figure here is about a child.** Every attack needs 120–720 brute-forced mappings and
  a script. None is available to an eight-year-old and none belongs in a responder model or a
  guessing floor.
