# Stage 2 anti-leak comparison — four types, one attacker

**Status:** Measurement report. **Measurement only — no bank, generator, checker or Gate A artifact
was changed.** Three of the four banks live on unmerged branches and are read out of the git object
database; nothing in this branch writes to any working tree, so the Gate A runs already recorded
against these banks stay valid. Every defect below is reported with its location and a suggested
direction, and left for the type's owner.

**Requirements served:** R7 (auditable and falsifiable — every figure here is one command), R8, R10
(state the boundary of every conclusion), H1, H6, H10. R5/R6 indirectly: a bank whose answer key is
predictable from `content` cannot measure growth, it measures whether the client cheated.

**Evidence used:** E-074 (the bank/served-item contract), E-075 and E-076 (answer-key derivability
from served content), E-094 (key-position balance). **No new E or D ID is claimed here** — the four
types' governance units are separate and unmerged, and minting IDs across them would pre-empt the
merge in flight.

**In scope:** one attack engine, run against all four Stage 2 banks (five banks — `FLU-OPCHAIN-01`
is measured in both its `dev` and rebuild forms), scored against each type's own chance floor, per
difficulty slice and per item, under seven attack families with cross-validation and permutation
nulls. **Out of scope:** any change to any bank, generator, checker, renderer or Gate A report;
difficulty calibration; whether these types should ship at all.

**Claim boundary, before any number.** These are properties of *banks*, measured against
`syntheticOnly: true` / `validated: false` items. No figure here is evidence about a child. "A
client can score 60%" is a statement about an automated browser script, not about an eight-year-old,
and it does not belong in a responder model or a guessing floor. What it does mean is that a score
produced by an unproctored session on these banks cannot be assumed to measure the construct.

---

## 1. The finding, in one paragraph

The four published anti-leak figures were computed four different ways, on two different slicings,
against two different chance floors, and none of the four is the strongest attack available. Under
one common engine, **every published figure is an understatement**, by between 1.5 and 30.1
percentage points depending on the type and the slice. Worse, the per-item content attack the four
reports argue about is not the strongest thing a browser can do to these banks. Two families that
nobody has scored break them far more completely: **the hidden symbol system of every one of the
five banks is pinned exactly by intersecting the constraints from 4 to 12 served items, after which
the attacker scores 100% on every remaining item**, and **the answer slot of `VER-MORPHO-01` is
determined to one of two options by `content.direction` alone, giving exactly 50.0% against a 25.0%
floor with no computation at all.**

---

## 2. Why the published figures are not comparable

Each type measured itself with its own statistic, and no two agree.

| type | published | what the number actually is | slicing |
| --- | --- | --- | --- |
| `FLU-OPCHAIN-01` (dev) | 28.2% / 34.0% | max over the slice of three fixed strategy MEANS | fixed edges 1–5 / 5–10 / 10–15 / 15–20 |
| `QUANT-GLYPHNUM-01` | 27.4% / 28.6% | the same maximum — which is the `uniform` column in every slice | the same fixed edges |
| `SPA-XFORM-01` | 24.9% / 37.8% | the MODAL strategy mean alone; anti-modal was measured but not aggregated | equal-count quartiles |
| `VER-MORPHO-01` | 26.5% / 28.3% | mean of `max(votes)/sum(votes)` — a posterior SHARE, not a hit rate | equal-count quartiles |

All four reproduce exactly under the engine in this report, which is the check that the engine is
measuring the same thing before it is allowed to disagree. `VER-MORPHO-01`'s row reproduces straight
off the shipped bank's own `answer.relabelling.maxVoteShare` field: 25.0 / 25.6 / 28.3 / 27.1 by
quartile, 26.5% over the bank.

Two of these are not accuracies. `VER-MORPHO-01`'s is the posterior mass a uniform-prior Bayesian
puts on the most-backed option, which answers "how confident could a client be" rather than "how
often is a client right". It happens to coincide with the modal attack's hit rate over the whole
bank (26.5%) and to disagree with it per slice. `SPA-XFORM-01`'s is one tail of a two-tailed family:
its own validator computed the anti-modal figure and the report aggregated only the modal one.

---

## 3. The threat model, and the line the attacks do not cross

`servedItemSchema` is `bankItemSchema.omit({answer, scoring, provenance})`
(`packages/contracts/src/assessment-exam-adaptive.ts`), and `toServedItem()`
(`apps/web/src/lib/exam/bank-loader.ts`) additionally drops `demoPath`. A browser therefore holds
exactly `{itemId, typeCode, domain, difficulty, ageBands, content, syntheticOnly, validated}`.
`content` ships whole — the security boundary is structural omission of three fields, not redaction
inside `content`.

Every attack in this report is handed that projection and nothing else. The answer key is passed on
a different argument, to the scorer, after the attack has committed. The projection is asserted to
carry none of the four omitted fields before it is used. An attack that reads a server-only field
proves nothing, so this is enforced by the shape of the code rather than by care.

Two of the families need more than one item. Those are labelled as such and their threat model is
stated where they appear: a client that has collected several served items, either by playing a
30–60 trial learning block or by scraping the item endpoint.

---

## 4. The attack families

| id | family | needs | new here |
| --- | --- | --- | --- |
| F0 | **determined** — brute force leaves exactly one option | one item | no |
| F1 | **uniform over survivors** — the naive elimination attack | one item | no |
| F2 | **vote-weighted** — modal and anti-modal, ties split | one item | no |
| F2b | **best rank tier** — all *k* vote ranks, not just the two ends | one item | **yes** |
| F3 | **sorted-vote-vector** — group by vote shape, play the best rank tier per shape | labelled items | no (the family this report was asked to generalise) |
| F4 | **positional-vote-vector** — group by the UNSORTED vote vector, play a tier or a slot | labelled items | **yes** |
| F5 | **covariate-vote** — F4 plus served covariates (chain depth, presentation direction) | labelled items | **yes** |
| F5c | **joint consistency** — `VER-MORPHO-01` picture→word only: discard mappings that make two option words correct | one item | **yes** |
| F7 | **no-brute-force slot** — condition on served covariates alone, name a slot | labelled items | **yes** |
| F7b | **difficulty-ordinal slot** — F7 plus the item's rank in the bank's difficulty order | bank scrape | **yes** |
| F6 | **cross-item system intersection** — intersect "the key was on that screen" across items | several items | **yes** |

**F3, F4, F5, F7 and F7b are fitted attackers.** "Play whichever tier is the key most often for this
shape" presupposes knowing which option was the key on the items used to fit. That is not free and
it is not impossible either: a learning block resolves the instance after the child commits, so a
scraper accumulates labelled items by playing. Both readings are reported for each:

- **in-sample** — fit and score on the same items. An upper bound, and the aggregation the published
  `FLU-OPCHAIN-01` figure uses, so it is the column that compares to what is on record.
- **cv** — seeded 5-fold cross-validation. What an attacker achieves after learning the pattern from
  labelled items it did not have to answer. This is the honest number.

**And a control, because a fitted attacker always scores something.** Refining a partition can only
raise an in-sample score, so "F4 beats F3 in sample" is true by construction. Each family therefore
also reports a 25-round label-permutation null — the same fit after pairing each item's vote vector
with another item's key, which preserves the vote shapes and the marginal key-slot distribution and
destroys only the association between them. The cross-validated null sits at the chance floor for
every family and every bank, which is what makes the `cv` columns directly readable against the
floor.

---

## 5. The comparison table

Whole bank, fixed difficulty edges. **Worst slice in parentheses.** Floors: 20.0% for the four
five-option banks, 25.0% for the four-option verbal bank.

| bank | n | floor | published | F0 det | F1 uniform | F2 best-of-three | F2b best rank | F3 sorted (in-sample) | F3 sorted (cv) | F5 covariate (cv) | F7b ordinal (cv) | F6 cross-item |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` dev 6/rung | 234 | 20.0% | 28.2% / 34.0% | **0** | 26.2% | 28.2% (34.0%) | 28.2% | **32.9%** (38.2%) | 30.8% (33.7%) | 27.2% (28.6%) | 68.4% (81.6%) | **100%** after 8 items |
| `FLU-OPCHAIN-01` rebuild 12/rung | 468 | 20.0% | 20.1% / 22.4% | **0** | 20.0% | 20.1% (22.4%) | 20.1% | **21.6%** (23.4%) | 21.6% (23.3%) | 13.8% (16.5%) | 60.0% (72.3%) | **100%** after 8 items |
| `SPA-XFORM-01` | 234 | 20.0% | 24.9% / 37.8% | **0** | 24.6% | 28.7% (**45.9%**) | 24.9% | **43.5%** (**57.0%**) | 33.8% (40.8%) | 32.0% (32.1%) | 34.6% (62.2%) | **100%** after 7 items |
| `QUANT-GLYPHNUM-01` | 468 | 20.0% | 27.4% / 28.6% | **0** | 27.4% | 27.4% (28.6%) | **32.4%** | **51.0%** (**58.7%**) | **47.4%** (57.2%) | **63.7%** (**83.9%**) | 40.2% (81.0%) | **100%** after 4 items |
| `VER-MORPHO-01` | 468 | 25.0% | 26.5% / 28.3% | **0** | 25.0% | 26.5% (28.8%) | 26.5% | 27.4% (30.5%) | 27.4% (30.3%) | **48.8%** (62.9%) | **84.0%** (91.6%) | **100%** after 12 items |

**F0 is clean everywhere.** Brute force leaves exactly one option on 0 of 1,872 items across all
five banks. That property was verified rather than assumed, and it holds. It is also, as the
rebuild's own report says, not the property that matters.

The per-slice tables under both slicings, the by-direction split for the verbal type, the
permutation nulls and the partition-purity diagnostics are all in the probe's stdout; §10 has the
command.

### 5.1 The same table with the equal-count quartiles the two quartile-sliced types published

Only the worst-slice cells move, and they move in the direction that matters for `SPA-XFORM-01`:

| bank | published worst slice | F2 best-of-three, worst quartile | F3 sorted, worst quartile |
| --- | --- | --- | --- |
| `SPA-XFORM-01` | 37.8% (Q1, modal) | **47.7%** (Q4, anti-modal) | **57.3%** (Q4) |
| `VER-MORPHO-01` | 28.3% (Q3) | 29.0% (Q3) | 30.7% (Q3) |

---

## 6. Which published figures were understated, and by how much

| bank | published | correct under the same three fixed strategies | correct under the sorted-vote family (in-sample, the published aggregation) | understatement |
| --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` dev | 28.2% / 34.0% | 28.2% / 34.0% ✓ | 32.9% / 38.2% | **+4.7 / +4.2** |
| `FLU-OPCHAIN-01` rebuild | 20.1% / 22.4% | 20.1% / 22.4% ✓ | 21.6% / 23.4% | **+1.5 / +1.0** |
| `SPA-XFORM-01` | 24.9% / 37.8% | **28.7% / 47.7%** | 43.5% / 57.3% | **+18.6 / +19.5** |
| `QUANT-GLYPHNUM-01` | 27.4% / 28.6% | 27.4% / 28.6% ✓ | 51.0% / 58.7% | **+23.6 / +30.1** |
| `VER-MORPHO-01` | 26.5% / 28.3% | 26.5% / 29.0% | 27.4% / 30.7% | **+0.9 / +2.4** |

Four separate readings, and they are not the same kind of error.

- **`FLU-OPCHAIN-01`'s understatement is the one already disclosed**, and this report reproduces it
  to the decimal on an independent implementation. The rebuild reduced the gap from 4.7 points to
  1.5.
- **`SPA-XFORM-01` was understated inside its own methodology.** Its validator computed the
  anti-modal figure and its report aggregated only the modal one, so the published 37.8% "easiest
  quarter" is not this bank's worst slice: the worst is **47.7% in Q4 on the anti-modal attack**, on
  the hardest items, which is where the ceiling and the oldest band live. The modal attack falls
  from 37.8% at Q1 to 5.0% at Q4 and the anti-modal attack rises from 19.2% to 47.7% over the same
  span — a clean signature of a generator pushing the key away from modal at depth, which is exactly
  the over-correction `FLU-OPCHAIN-01`'s probe named as the reason anti-modal has to be scored.
- **`QUANT-GLYPHNUM-01` is understated by more than the whole distance from its floor to its
  published figure**, and 30.1 points in the worst slice. This is the type whose published anti-leak
  residual was described as "smaller, and in the slice that matters most materially smaller" than
  the reference type's. It is not; it is the largest of the four by a wide margin.
- **`VER-MORPHO-01`'s number is barely understated and almost beside the point.** 26.5% happens to
  be right as a modal hit rate. The type's actual exposure is not in this family at all — see §7.3.

---

## 7. Attacks stronger than the sorted-vote-vector family

Yes — four of them, and two are severe.

### 7.1 F6, cross-item system intersection: every bank is completely solved by 4 to 12 items

The served bank is the **consistent** arm: one hidden symbol→meaning system for every item in it,
drawn once at build time from a fixed `systemSeed` and baked into the shipped file. So "the key of
that item was one of the five figures on that screen" is a constraint on the *same unknown* every
time, and the constraints intersect.

Enumerate the bijections over the symbol tray. Keep the ones under which some on-screen option is
the derived output. Repeat on the next item with what survives.

| bank | hypothesis space | systems surviving after 1 item | pinned to exactly one after | accuracy thereafter |
| --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` dev | 720 | 192 | **8 items** | **100%** (234/234) |
| `FLU-OPCHAIN-01` rebuild | 720 | 120 | **8 items** | **100%** (468/468) |
| `SPA-XFORM-01` | 720 | 600 | **7 items** | **100%** (234/234) |
| `QUANT-GLYPHNUM-01` | 120 | 9 | **4 items** | **100%** (468/468) |
| `VER-MORPHO-01` | 720 | 192 | **12 items** | **100%** (468/468) |

Collection order is seeded and reproducible; the curve is printed per item for the first 60.

This is not a per-item property and no per-item invariant can bound it. It needs no answer keys, no
feedback and no labelled data — only several served items from the same bank. **A learning block
serves 30 to 60 trials from one bank, so this is available inside a single ordinary session, from
its first quarter onward.** And because the system is baked into the shipped file rather than drawn
per session, one offline scrape of a dozen items breaks the bank permanently, for every subsequent
child.

**Where a fix would go, for the owner to decide.** The symbol names are cosmetic: the tray is
canonical and the badges are arbitrary labels for operators. Re-labelling the tray with a fresh
per-session bijection at serve time would leave every answer key unchanged and would reduce the
exposure from "one scrape breaks it forever" to "each session must re-derive it from its own first
4–12 trials". It would not close it, because within-session pinning is the residue and closing that
means per-trial systems, which is the control arm and destroys the construct — learning the system
across trials is what this family of types measures. The honest framing may be the E-075 one: some
of this is a limit of unproctored administration rather than a bank defect, and mitigation belongs
in proctoring and process telemetry. But E-075's cases were unfixable because the stimulus *is* the
derivation; this one is at least partly fixable, and the difference is worth a decision rather than
an inherited precedent.

### 7.2 F7b, the difficulty-ordinal slot attack: the key-position cursor is recoverable

Every generator allocates the key's screen slot with a sequential round-robin cursor —
`keyPosition = n mod k`, where `n` is the emission index — and emits items rung by rung in
increasing difficulty. `difficulty` is served. So sorting the scraped bank by difficulty
approximately recovers `n`, and `n mod k` is the answer slot.

Measured directly, with ties broken on `itemId` (also served) rather than on position in the bank
file, which a client does not have:

| bank | key slot from difficulty rank mod *k* | floor |
| --- | --- | --- |
| `FLU-OPCHAIN-01` dev | **70.5%** | 20.0% |
| `FLU-OPCHAIN-01` rebuild | **60.7%** | 20.0% |
| `SPA-XFORM-01` | **38.5%** | 20.0% |
| `QUANT-GLYPHNUM-01` | **32.9%** | 20.0% |
| `VER-MORPHO-01` | **59.0%** | 25.0% |

Combined with the served covariates and cross-validated, F7b reaches 68.4% / 60.0% / 34.6% / 40.2% /
**84.0%**. No brute force, no mapping enumeration, no understanding of the item at all.

**Where a fix would go.** The cursor is the problem, not the balance it buys. Drawing the key slot
from a seeded hash of the item's own seed, and enforcing balance by shuffling a pre-allocated slot
multiset within each rung rather than by walking a global counter, keeps E-094's balance property
and removes the recoverable ordering.

### 7.3 The `VER-MORPHO-01` direction lock: 50.0% for free, deterministically

`buildBank()` advances two cursors once per item:

```js
keyPosition: keyCursor++ % OPTION_KEYS.length,          // % 4
direction: ['wordToPicture', 'pictureToWord'][directionCursor++ % 2],
```

Both start at zero and both increment on every item, so `keyPosition = n mod 4` and
`direction = n mod 2`, and `n mod 4` determines `n mod 2`. The consequence, in the shipped bank:

| direction (SERVED, in `content.direction`) | A | B | C | D |
| --- | --- | --- | --- | --- |
| `wordToPicture` (234 items) | **117** | 0 | **117** | 0 |
| `pictureToWord` (234 items) | 0 | **117** | 0 | **117** |

The answer is **never** in B or D on a word→picture item and **never** in A or C on a picture→word
item. Reading one served field and always tapping the same one of the two live slots scores exactly
**50.0%** on all 468 items against a 25.0% four-option floor. It requires no brute force, no
labelled data beyond noticing the pattern, and two lines of JavaScript.

This is precisely the failure `FLU-OPCHAIN-01`'s rebuild report warned about when it de-phased its
own two cursors — "incrementing both together would have made them equal on every item and handed a
client *the key's screen slot tells you its vote rank*: a leak assembled out of two separate
anti-leak measures". The sibling type made that mistake with `direction` in place of `voteRankTarget`.

**Where a fix would go.** `research/exam-question-types/generators/VER-MORPHO-01.mjs`, `buildBank()`
— the two cursors must be out of phase. Deriving the direction from `⌊n/4⌋ mod 2` rather than from
`n mod 2`, where `n` is the item index the slot cursor already uses, is the same device
`FLU-OPCHAIN-01` uses for `voteRankTarget`, and it walks all eight (slot, direction) combinations
every eight items while keeping both marginals balanced. Note this changes which items the bank
contains, so it needs a regeneration and a re-run of the type's Gate A — which is exactly why it is
reported here and not applied.

### 7.4 F2b, the best rank tier: two of five ranks were scored and the key sits in the third

Modal and anti-modal are the first and last of *k* vote ranks. A generator that keeps the key off
both ends has not kept it off rank 1. `QUANT-GLYPHNUM-01`'s key rank distribution over 468 items is
**253 at rank 0, 206 at rank 1, 9 at rank 2, none below** — and its published metric scores rank 0
(17.3%) and rank 4 (17.5%), both *below* the 20.0% floor, which is the tell. Playing rank 1 instead
scores **32.4%** bank-wide and **41.3%** in the 1–5 slice, with **111 of 468 items taken outright**.
That is a single fixed strategy with one fitted integer, no conditioning, and essentially no
capacity to overfit — and it beats the published figure by 5.0 points on its own.

`SPA-XFORM-01` shows the same signature more weakly: rank 1 is the best tier in both upper slices
(31.7% at 10–15, 36.8% at 15–20).

### 7.5 F5c: the picture→word half of `VER-MORPHO-01` is not leak-free by proof

That type's report states the picture→word direction is "leak-free by proof, not by measurement":
every option word is the same length and made of distinct forms, so each is the image of the same
number of mappings and all four vote counts are equal by construction. **That proof is correct about
the quantity it describes, and this report confirms it** — counting mappings per option marginally
gives four exactly equal counts on all 234 items.

But it is the wrong quantity. An item has one right answer, so under the *true* mapping exactly one
candidate word denotes the target. A mapping under which two of them do, or none, is not the true
mapping and the client can discard it. Counting only the mappings that survive that joint
consistency check breaks the symmetry the proof rests on:

| picture→word half, 234 items | marginal count (published reading) | joint-consistency count |
| --- | --- | --- |
| mean surviving options | 4.00 / 4 | 3.97 / 4 |
| uniform over survivors | 25.0% | 25.3% |
| modal | 25.0% | **35.9%** |
| items the modal attack takes outright | 0 | **33** |

10.9 points on half the bank, and 33 items are outright wins where the published claim is that none
can be.

Separately, the generator's own recorded `answer.relabelling.maxVoteShare` averages **26.8%** on that
half, not the 25.0% its own proof implies, because for picture→word items `optionVotes` is computed
over the option *denotations* — which needs the hidden mapping — rather than over the option words.
The report's proof and the field the report's table is built from are describing two different
things.

### 7.6 What was NOT stronger, which matters too

**Refining the sorted-vote partition is not automatically an improvement.** F4 (condition on the
unsorted vote vector, name a slot) dominates F3 in-sample by construction — 60.3% against 32.9% on
the `dev` bank — but its permutation null is 58.2%, so almost all of that is fitting capacity, and
under cross-validation F4 (23.6%) is *worse* than F3 (30.8%). The same holds on `SPA-XFORM-01`
(30.3% against 33.8%) and on the rebuild (13.0% against 21.6%).

F4 and F5 genuinely beat F3 on exactly two banks, and there the margin is large and survives both
controls: `QUANT-GLYPHNUM-01` (F5 cv **63.7%** against F3 cv 47.4%, cv-null 18.7%) and
`VER-MORPHO-01` (F5 cv **48.8%** against F3 cv 27.4%, cv-null 23.9%) — and in the verbal case the
lift is the §7.3 direction lock arriving through the covariate, not anything about votes.

So the sorted-vote-vector family is close to the best a *permutation-invariant per-item* attacker
can do on the two fluency/spatial banks, and is comfortably beaten on the other two. It is not the
ceiling anywhere, because §7.1 and §7.2 are not per-item attacks.

---

## 8. Per-item worst cases

A bank mean can sit at the floor while individual items are outright wins. Counts of items an
attacker takes with certainty:

| bank | n | F1 uniform | F2 modal | F2 anti-modal | F2b best rank | F3 sorted (cv) | F5 covariate (cv) | F7 no-brute (cv) | F6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` dev | 234 | 0 | 7 | 9 | 7 | 11 | 43 | 23 | **234** |
| `FLU-OPCHAIN-01` rebuild | 468 | 0 | **0** | **0** | **0** | **0** | 63 | 55 | **468** |
| `SPA-XFORM-01` | 234 | 0 | **26** | 24 | 26 | 35 | 51 | 37 | **234** |
| `QUANT-GLYPHNUM-01` | 468 | 0 | 3 | 2 | **111** | **100** | **263** | 49 | **468** |
| `VER-MORPHO-01` | 468 | 0 | **0** | **0** | **0** | **0** | 225 | 203 | **468** |

`SPA-XFORM-01`'s 26 reproduces its report's own disclosed count exactly. The two numbers that are
new and load-bearing:

- **`QUANT-GLYPHNUM-01`: 111 of 468 items are outright wins for a single fixed strategy** that needs
  no conditioning, no labelled data and no fitting beyond one integer. Under the cross-validated
  covariate attacker, 263 of 468.
- **The rebuild and the verbal type are genuinely clean on the fixed strategies** — 0 certain items
  under all of F1, F2, F2b and cross-validated F3 — and both are then broken completely by the
  families in §7.1 to §7.3, which those invariants do not address.

---

## 9. Which type is weakest

**On per-item content attacks: `QUANT-GLYPHNUM-01`, by a wide margin.** 51.0% in-sample and 47.4%
cross-validated under the sorted-vote family against a published 27.4% and a 20.0% floor; 63.7%
cross-validated once served covariates are added; 83.9% in the 1–5 slice, which is the slice the
youngest served band gets; 111 items lost to a single fixed strategy and 263 to the cross-validated
one. Its published claim to a smaller residual than the reference type is inverted.

**On free attacks needing no brute force: `VER-MORPHO-01`.** 50.0% deterministically from one served
field, 84.0% cross-validated once the difficulty ordinal is added, against a 25.0% floor.

**On the cross-item attack: all five banks equally, and completely.** 100% after 4 to 12 items.

**The rebuild of `FLU-OPCHAIN-01` is the strongest of the five on everything a per-item invariant can
bound** — 20.0% elimination on every item, 21.6% under the sorted-vote family, zero certain items
under every fixed strategy — and it is broken by §7.1 and §7.2 exactly as completely as the others,
because those are not properties an item can have.

---

## 10. Reproducing this

The probe is `research/exam-question-types/gate-a/stage2-antileak-comparison.mjs`. It reads the five
banks out of the git object database by `<ref>:<path>`, so it needs the branches fetched but touches
no working tree:

```
node research/exam-question-types/gate-a/stage2-antileak-comparison.mjs
node research/exam-question-types/gate-a/stage2-antileak-comparison.mjs --json
```

Runtime is about four seconds. Everything is seeded from the constant `STAGE2_ANTILEAK_COMPARISON|v1`
printed in the header — fold assignment, the 25 permutation rounds and the collection order for F6 —
so two runs agree exactly.

Three properties of the code are worth knowing before trusting the numbers.

- **The operator semantics are re-implemented, not imported.** Importing each generator's own
  `applyOp` would make a generator that is wrong about its own algebra agree with itself, which is
  the one thing an audit exists to rule out. The re-implementation is checked by an assertion that
  the key is reachable under some relabelling on every item of every bank; it is, on all 1,872.
- **The published figures are reproduced before anything disagrees with them.** `FLU-OPCHAIN-01`'s
  full before/after table matches the rebuild report cell for cell, `QUANT-GLYPHNUM-01`'s four-slice
  table matches its report cell for cell, `SPA-XFORM-01`'s quartiles and its 26 uniquely-modal items
  match, and `VER-MORPHO-01`'s quartiles reproduce off the shipped bank's own field.
- **Fitted attackers are reported three ways** — in-sample, cross-validated, and against a
  label-permutation null in both readings. The cross-validated null sits at the chance floor on
  every bank and every family, which is what licenses reading the `cv` columns straight against the
  floor.

---

## 11. What this report does not claim

- **Not that any of these types should or should not ship.** That is a Gate A and Gate B question
  and both are owned elsewhere.
- **Not that any figure here is about children.** Every attack needs either 120–720 brute-forced
  mappings, a scraped bank, or a labelled sample. None is available to an eight-year-old and none
  belongs in a responder model or a guessing floor. What they do mean is that a score from an
  unproctored session on these banks is not safe to treat as a measurement.
- **Not that F6 is a bank defect rather than an administration limit.** It may be either; §7.1 gives
  the argument both ways and the decision is the owner's.
- **Not that the fits transfer to a regenerated bank.** F3, F4, F5, F7 and F7b are fitted to these
  specific banks. The cross-validated columns say the patterns generalise *within* a bank, which is
  what matters for an attacker holding this bank. A regenerated bank with a different seed would
  need re-measuring — and the point of §7.2 and §7.3 is that two of the patterns are properties of
  the *generator*, not of the draw, so they would survive.
- **Not that this list of families is complete.** It is the strongest set found in one pass. F6 in
  particular suggests the productive direction is attacks that combine items, and only one such
  attack was tried.
