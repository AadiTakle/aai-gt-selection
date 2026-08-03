# Duplicate Domain Models

**Branch audited:** `feat/repo-structure-audit` @ `5c2c2ab`. **Date:** 2026-07-27.
**Status:** descriptive audit. Recommends owners; ratifies nothing.

Every claim below is either a file:line citation or the output of a probe that
loaded the **real schemas** and parsed **real payload shapes**. Where a
divergence exists but cannot currently fire, it is labelled **latent** rather
than reported as a live bug.

---

## 0. Summary table

| Concept | Definitions | Authoritative today | Worst divergence |
| --- | ---: | --- | --- |
| Domain enum | 4 | `contracts.examDomainSchema` | `cat-engine` re-declares independently |
| Item (bank side) | 4 | `apps/web/.../exam/item.ts` (only live one) | 3 rival "bankItem" shapes |
| Served item | 3 | `apps/web/.../exam/item.ts` | field sets differ |
| Answer key | 2 | `apps/web/.../exam/item.ts` | web copy lost a validation rule |
| Scoring contract | 2 | `apps/web/.../exam/item.ts` | web has 2 of 4 modes |
| Provenance | 2 | `apps/web/.../exam/item.ts` | web weakened enum → free string |
| IRT parameters | 3 | none — all parked or partial | model enums disagree |
| Metric / measurement map | 3 | web `types.ts` (live) | **proven incompatible** |
| Session | 3 | web `types.ts` (live) | different identity + fields |
| Scoring result | 3 | web `scoring.ts` (live) | different shape and semantics |
| Decision / band | 2 | `contracts.screenDecisionSchema` | **proven incompatible + governance issue** |
| Age band | 2 | `contracts.ageBandSchema` | `K-8` rejected by contracts (latent) |
| Lure class | 2 | tie — byte-identical | pure copy, must hand-sync |

---

## 1. Domain enum — the one prior consolidation that mostly held

A previous effort made `contracts.examDomainSchema` the single owner. **Verified:
it holds for two of three consumers, and not for the third.**

| Site | Line | Behaviour |
| --- | --- | --- |
| `packages/contracts/src/assessment-exam.ts` | 31 | **Owner.** `z.enum(['fluid_reasoning','verbal','quantitative','spatial'])` |
| `packages/item-bank/src/enums.ts` | 1, 17 | ✅ Re-exports the owner. Comment at 8-16 states the intent explicitly. |
| `apps/web/src/lib/exam/item.ts` | 1, 32 | ✅ Re-exports the owner. Comment at 27-31 states the intent. |
| `packages/cat-engine/src/types.ts` | 36 | ❌ **Independent re-declaration:** `SCORED_DOMAINS = ['fluid_reasoning','verbal','quantitative','spatial'] as const` |

`cat-engine`'s deviation is **deliberate and documented** — its header
(`types.ts:1-15`) explains the package must have zero dependencies to remain a
portable Lambda payload, so it "declares its own numeric contracts here instead
of importing `@gt-selection/contracts`". The four values are currently identical.

**Cost:** a fifth domain added to `contracts` would silently not appear in
`cat-engine`. Low probability, silent failure mode.

**Recommendation:** keep the owner; keep `cat-engine`'s copy but add a
conformance test in `contracts` asserting the two tuples are equal, so drift
fails loudly instead of silently. Small, cheap, preserves the zero-dependency
constraint.

**Verdict on the prior effort: substantially successful.** This is the one
concept in the repo with a real owner. It is the model for everything below.

---

## 2. Item — four models, and the live one is not the elaborate one

### 2a. The four definitions

| # | Location | Symbol | Shape |
| --- | --- | --- | --- |
| 1 | `packages/contracts/src/assessment-exam.ts:147` | `examItemSchema` | Flat, strict. `itemId` **uuid**, `difficultyLevel` nullable 1-20, `ageBands[]`, `scoringModel` enum(6), `irt` nullable, `demoPath`, `params` record, `syntheticOnly` |
| 2 | `packages/item-bank/src/bank-item.ts:21` | `bankItemSchema` | Rich. `itemId` **uuid**, `content` (typed per type), `answer`, `scoring`, `provenance`, `irt` **required**, `difficultyLevel` **non-nullable**, `validated: false` |
| 3 | `apps/web/src/lib/exam/item.ts:198` | `bankItemSchema` | **Discriminated union on `renderKind`** (`single-select` \| `embedded-demo`). `itemId` **plain string**, adds `title`/`blurb`/`stage`, drops `ageBands` |
| 4 | `packages/cat-engine/src/types.ts:85` | `ItemParameters` | Scoring-only. `itemId` string, `irt`, `difficultyLevel`, `answerKey?`, `maxScore?`, `rapidGuessThresholdMs` |

Plus row shapes in `packages/db-types/src/exam.ts:76` (`exam_item`), which
flattens IRT into four nullable columns (`irt_a/b/c/model`) and types every enum
as bare `text`.

### 2b. Which is authoritative

**#3, the web-local one — because it is the only one the running app uses.**
Per `REPO_REACHABILITY_MAP.md` §3, `item-bank` and `cat-engine` contribute 0 LOC
to LIVE. Consumers:

- **#3 (live):** 19 direct importers including `session.ts`, `bank.ts`,
  `sample-items.ts`, `item-player.tsx`. On 4 runtime chains.
- **#2 (parked):** `item-bank`'s own scripts/tests + `cat-adapter.ts` (test-only).
- **#1 (partly live):** `contracts` is LIVE, but `examItemSchema` specifically has
  no runtime consumer — only `assessment-exam-contract.test.ts`.
- **#4 (parked):** `cat-engine` internals + `cat-adapter.ts`.

> The most elaborate item model (`item-bank`, with typed content, validated
> provenance, and a 4-mode scoring contract) is the one **nothing renders**. The
> model that ships is the simplest.

### 2c. Structurally compatible vs genuinely divergent

**Genuinely divergent — cannot be unified by renaming:**

1. **`itemId` type.** `contracts` and `item-bank` require `z.uuid()`;
   `apps/web/.../item.ts:154` accepts `z.string().min(1)`. The live bank uses
   human codes like `FLU-MATRIX-01` (`bank.ts:41`), which are **not** UUIDs. Any
   migration toward `contracts` must renumber every live item or relax the
   contract. This is the single largest concrete migration cost.
2. **Discriminator.** Only #3 has `renderKind`. #1/#2 assume one rendering path
   (`demoPath`). Unifying means adding a discriminator to `contracts` or dropping
   native single-select rendering.
3. **`difficultyLevel` nullability.** Nullable in #1, required in #2 and #3.

**Structurally compatible — differ only in strictness:**

| Field | contracts | item-bank | web item.ts |
| --- | --- | --- | --- |
| `typeCode` | regex `^[A-Z]+-[A-Z0-9]+-\d+$` (:100) | `z.enum(TYPE_CODES)`, 66 values (`enums.ts:30`) | `z.string().min(1)` (:155) |
| `domain` | owner (:31) | re-export | re-export |
| `syntheticOnly` | `literal(true)` | `literal(true)` | `literal(true)` |

`typeCode` is a strict-superset chain: web ⊃ contracts ⊃ item-bank. Any
item-bank code satisfies all three; the reverse is not true.

---

## 3. The web/item-bank overlap is a near-complete fork

`apps/web/src/lib/exam/item.ts` re-implements **five** modules that already exist
in `packages/item-bank`. This is the highest hand-sync burden in the repo.

| Concept | item-bank | apps/web | Relationship |
| --- | --- | --- | --- |
| Lure class | `enums.ts:41-51` | `item.ts:36-46` | **Byte-identical**, 9 values (verified by `diff`) |
| Answer key | `answer.ts:11-28` | `item.ts:100-108` | Same 4 fields; **web dropped the `.refine`** |
| Scoring contract | `scoring.ts:11-44` | `item.ts:116-125` | **web has 2 of 4 modes** |
| Provenance | `provenance.ts:19-44` | `item.ts:130-148` | **web weakened + dropped 2 fields** |
| `toServedItem` | `bank-item.ts:109` | `item.ts:239` | Same name, different signature/output |

### Concrete costs, field by field

**Answer key — web silently accepts an invalid key.** `item-bank/src/answer.ts:22-27`
refines: an answer must specify `correctIndex`, `correctSet`, or
`canonicalSolution`. `apps/web/src/lib/exam/item.ts:100-108` has all four fields
**optional with no refine**, so `{}` parses successfully. An item with no answer
at all is representable in the live model. In practice `scoring.ts:32-34` guards
with `if (key == null) return NOT_SCORED`, so it degrades to unscored rather than
mis-scored — but the invariant is enforced by a downstream `if`, not the schema.

**Scoring contract — the live model cannot represent two of four modes.**
item-bank supports `deterministic_key`, `computed_solver`, `proxy_bank`,
`model_judge`; web supports only the first two (`item.ts:113-114` acknowledges
this: *"the full four-mode taxonomy … is out of scope"*). **Any generated bank
item using `proxy_bank` or `model_judge` cannot be parsed by the live app.** This
is a hard blocker on wiring the generated bank, not a style issue.

**Provenance — validator checks lost their vocabulary.** item-bank's
`validatorCheckSchema` (`provenance.ts:8-16`) is a closed enum of 7 named checks
(`unique_answer`, `bias_screen_ok`, …). The web copy types `check` as
`z.string().min(1)` (`item.ts:141`). Web also lacks `sourceDemo` and
`humanReview`, and makes `validator` default to `[]` where item-bank requires it.
**Net effect: the live model cannot record that an item passed a bias screen in
any machine-checkable way.** Given the governance posture around synthetic-item
auditability, this is the divergence with the most substantive consequence.

**Recommendation.** One owner: `packages/item-bank` for the *content/answer/
provenance* concepts, since it is the strict superset and already has the richer
validation. Smallest migration path:

1. Have `apps/web/src/lib/exam/item.ts` import `lureClassSchema`,
   `answerKeySchema`, `scoringContractSchema`, `provenanceSchema` from
   `@gt-selection/item-bank` instead of redeclaring (the dependency already
   exists in `apps/web/package.json:21`).
2. Keep the `renderKind` union web-local — it is a genuine UI concern with no
   item-bank equivalent.
3. Do **not** attempt the `itemId` UUID change in the same step.

Steps 1-2 are mechanical and remove ~90 duplicated lines. **Caveat:**
`cat-adapter.ts:23` warns that a client bundle "cannot pull a package's runtime
(e.g. item-bank's `node:crypto`)". Verify tree-shaking before importing
item-bank into a client component — this may force a types-only import or a
split entry point. Confidence that step 1 is safe as-is: **medium**.

---

## 4. Metric / measurement map — proven incompatible, live path affected

Three definitions:

| Location | Definition |
| --- | --- |
| `packages/contracts/src/assessment-exam.ts:112` | `measurementMapSchema = z.record(measurementIdSchema, z.number())`, key regex `^M-[A-Z]+$` (:109) |
| `packages/contracts/src/assessment-exam.ts:124` | `metricMapSchema = z.record(z.string(), z.number())` |
| `apps/web/src/lib/exam/types.ts:9` | `metricMapSchema = z.record(z.string(), z.union([z.string(), z.number()]))` |

`packages/item-bank/src/enums.ts:33` adds a fourth key regex, `^M-[A-Z0-9_]+$`.

**This is not latent — the live harvest path produces values the contract
rejects.** `apps/web/src/lib/exam/harvest.ts:29-37` reads each demo's on-screen
metric rows and writes **two** entries per metric: the raw string, plus a derived
`` `${id}_num` `` key.

Probe result (real schemas, real harvested shape):

```
[1] contracts.measurementMapSchema vs harvested map -> REJECTED
    { path: ["M-ACC"],      message: "Invalid input: expected number, received string" }
    { path: ["M-ACC_num"],  message: "Invalid key in record" }
    { path: ["M-DIFFREACH"],     message: "Invalid input: expected number, received string" }
    { path: ["M-DIFFREACH_num"], message: "Invalid key in record" }
[2] contracts.measurementMapSchema vs numeric-only `_num` keys -> REJECTED
    pattern /^M-[A-Z]+$/ does not match "M-ACC_num"
[3] contracts.measurementMapSchema vs canonical M-* keys -> ACCEPTED
```

So the live metric map fails the contract on **both** axes: string values and
underscore-suffixed keys. It works today only because the live persistence route
validates against the **web-local** schema, not the contract
(`apps/web/src/app/api/exam-results/route.ts:3` imports `examSessionInputSchema`
from `@/lib/exam/types`).

**Cost:** the moment anyone routes harvested metrics through `contracts` — which
is what adopting the DB-backed model implies — every session fails validation.
This is a real, quantified blocker rather than a tidiness concern.

**Recommendation.** `contracts` owns the concept; the harvest layer must
normalise before it crosses the boundary. Smallest path: keep raw strings inside
`harvest.ts`, and have it emit a separate `MeasurementMap` of parsed numbers
under canonical `M-[A-Z]+` keys (drop the `_num` suffix — the map is already
typed `number`). Confidence: **high** (probe-backed).

---

## 5. Decision / band — incompatible, and it crosses a governance line

Two definitions, in direct contradiction:

| Location | Values |
| --- | --- |
| `packages/contracts/src/assessment-exam.ts:88` | `screenDecisionSchema = z.enum(['advance','hold','retry'])` |
| `packages/cat-engine/src/types.ts:58` | `type ScreenDecision = 'admit' \| 'defer' \| 'retry'` |

The contracts file documents the rename at lines 81-87:

> *"Deliberately renamed from the salvaged `admit|defer|retry` to
> `advance|hold|retry` to avoid an admission-claim smell, consistent with the
> app-wide prohibition on admitted/offered/… public outcomes."*

**`cat-engine` still emits the retired vocabulary.** `cat-engine/src/scoring.ts:94-96`
returns `'admit'` / `'defer'` / `'retry'`, and `ScreeningResult.decision`
(`types.ts:175`) is the declared Lambda return payload.

This is **enforced in both directions by existing tests**, which is unusual and
worth noting: `contracts/src/assessment-exam-contract.test.ts:215` asserts
`decision: 'admit'` is *rejected*, while `cat-engine/src/scoring.test.ts:110-111`
asserts `decisionFromFit(...)` *returns* `'admit'`. Both suites pass. The repo
has two green test suites encoding opposite requirements.

Probe result:

```
[4] screeningOutcomeSchema decision='advance' -> accepted
[4] screeningOutcomeSchema decision='admit'   -> REJECTED (enum)
[4] screeningOutcomeSchema decision='defer'   -> REJECTED (enum)
[4] screeningOutcomeSchema decision='hold'    -> accepted
[4] screeningOutcomeSchema decision='retry'   -> accepted
```

Only 1 of `cat-engine`'s 3 values is representable in the contract. The DB
migration agrees with `contracts`
(`supabase/migrations/20260727120000_exam_data_model.sql:170`:
`check (decision in ('advance','hold','retry'))`), so `cat-engine` is the lone
dissenter.

**Two distinct problems, do not conflate them:**

1. *Technical:* `cat-engine` output cannot satisfy the contract without
   translation. The translator (`cat-adapter.ts`) is test-only, so no translation
   runs today.
2. *Governance:* `admit` is the exact claim vocabulary the project prohibits, and
   it is live in a package described as the production Lambda payload. **This is
   contained today only because nothing calls it.** It is not a latent style
   issue; it is a claim-boundary violation parked one wiring commit away from
   being reachable.

**Recommendation.** Rename in `cat-engine` to `advance|hold|retry` and update the
policy field names (`admitCut` → e.g. `advanceCut`, `types.ts:73`). It is a
mechanical rename across `types.ts`, `scoring.ts`, `result.ts` and their tests,
with **no live consumer to break**. Do this *before* any wiring work, regardless
of the Gen-A/Gen-B decision. Confidence: **high**. Priority: **highest in this
document** — it is cheap, and doing it after wiring is strictly worse.

---

## 6. Age band — latent incompatibility

| Location | Values |
| --- | --- |
| `packages/contracts/src/assessment-exam.ts:33` | `['K-1','2-3','4-5','6-8']` |
| `packages/item-bank/src/enums.ts:24-26` | `['K-1','2-3','4-5','6-8','K-8']` (wildcard, per comment at 20-23) |

```
[5] contracts.examItemSchema with item-bank's 'K-8' band -> REJECTED
    ageBands.0: Invalid option: expected one of "K-1"|"2-3"|"4-5"|"6-8"
```

**Latent, not live.** The generated bank does not currently use it:

```
$ grep -o '"K-8"' packages/item-bank/data/bank/items.bank.jsonl | wc -l
0
$ # distinct ageBands arrays across 257 items:
74 ('2-3',)   71 ('4-5',)   67 ('6-8',)   45 ('K-1',)
```

All 257 items use exactly one real band. So this fires only if a generator later
emits a cross-grade item. **Recommendation:** either add `K-8` to `contracts`, or
have `build-bank.ts` expand a wildcard into the four real bands at emit time.
Prefer the latter — it keeps the wire format simple. Confidence: **high**.

---

## 7. Session, response, and scoring result

### Session — three models, one live

| Location | Identity | Notes |
| --- | --- | --- |
| `packages/contracts/src/assessment-exam.ts` (`sessionSchema`, ~:340-364) | `sessionId` uuid + `participantId` uuid | Structure-agnostic; carries opaque `structureConfig`/`structureState` |
| `packages/db-types/src/exam.ts:155` | `exam_session` row | Mirrors a **held, unapplied** migration |
| `apps/web/src/lib/exam/types.ts:37` | `sessionId` plain string + `participantCode` `PART-SYN-*` + **`studentName`** | **The live one** |

The live model is the only one carrying `studentName` — a display field the other
two deliberately exclude. It is validated at
`apps/web/src/app/api/exam-results/route.ts:34` and stored in a module-level
array that "RESETS whenever the server restarts" (route header, lines 10-13).

**Cost:** the live session has no UUID identity and no participant row, so
adopting either of the other two models is a data-shape migration, not a
type-swap.

### Scoring result — three shapes

| Location | Shape |
| --- | --- |
| `apps/web/src/lib/exam/scoring.ts:19` | `{ accuracy: number\|null, correct: boolean\|null }` — **live** |
| `packages/contracts/src/assessment-exam.ts:190` | `itemResponseSchema`: `{ correct, score 0-1, rtMs, firstActionMs, revisions, engaged, measurements }` |
| `packages/cat-engine/src/types.ts:124` | `ScoredItem`: `{ correct, score, rtMs, rapidGuess, onTask, effortValid, irt, order, … }` |

Genuinely divergent, not just differently named. The live one has **no
engagement concept at all** — no `engaged`, `rapidGuess`, `onTask`, or
`effortValid`. Both parked models treat effort-validity as a gate on scoring
(`cat-engine/src/types.ts:138`: *"Gates theta + speed credit"*). Adopting either
means the live path must start capturing effort signals it does not capture
today. **This is a data-collection change, not a refactor** — the most
underestimated cost in this document.

### Session summary vs domain score

`apps/web/src/lib/exam/types.ts:50` (`examSummarySchema`: `overallAccuracy`,
`perDomainAccuracy`, `meanDifficultyReached`, counts) vs
`cat-engine/src/types.ts:143` (`DomainScore`: `theta`, `se`, `percentile`,
`learningRate`, `consistency`, …) vs `contracts`' `domainScoreSchema`. The live
summary is **accuracy-based**; both parked models are **theta/IRT-based**. These
are different measurement philosophies, not different encodings of one thing.

---

## 8. IRT parameters — three declarations

| Location | `model` values | Extra |
| --- | --- | --- |
| `packages/contracts/src/assessment-exam.ts:129` | `'2PL' \| '3PL'` | strict, `a` positive |
| `packages/item-bank/src/irt.ts:10` | `'Rasch' \| '1PL' \| '2PL' \| '3PL'` | **`provisional: boolean`** |
| `packages/cat-engine/src/types.ts:20` | `'1PL' \| '2PL' \| '3PL'` **optional** | plain interface, no validation |

No two agree. `item-bank`'s `provisional` flag exists to enforce a real
governance rule (`bank-item.ts:77-84`: `provisional` must stay `true` while
`validated === false`). **`contracts` cannot express that flag at all**, so
round-tripping an item-bank item through the contract *loses the guard that
prevents a provisional parameter being treated as calibrated*.

`cat-adapter.ts:45` already carries the mapping (`Rasch` collapses to `1PL`),
confirming the authors knew — but that adapter is test-only.

**Recommendation.** `contracts.irtParametersSchema` should gain `provisional`
and the `Rasch`/`1PL` values, making it a true superset. Then item-bank
re-exports it, and `cat-engine` keeps its dependency-free copy guarded by the
same equality test proposed in §1. Confidence: **medium** — this touches a
governance-relevant guard, so it warrants review rather than a mechanical edit.

---

## 9. Recommended owner per concept

| Concept | Proposed owner | Rationale | Cost |
| --- | --- | --- | --- |
| Domain enum | `contracts` (already) | Holds; add drift test for `cat-engine` | Trivial |
| Decision / band | `contracts` | Governance vocabulary; rename `cat-engine` | Small, **do first** |
| Age band | `contracts` | Expand wildcard in `build-bank.ts` | Small |
| Lure class | `item-bank` | Byte-identical; web imports it | Trivial |
| Answer key | `item-bank` | Strict superset (has the refine) | Small |
| Scoring contract | `item-bank` | Superset (4 modes vs 2) | Small |
| Provenance | `item-bank` | Superset + closed validator enum | Small |
| IRT parameters | `contracts` (extended) | Must be able to express `provisional` | Medium, needs review |
| Metric / measurement map | `contracts` | Normalise in `harvest.ts` at the boundary | Medium |
| Item (bank) | **Defer** | Blocked on the `itemId` UUID question and Gen-A/Gen-B | Large |
| Served item | **Defer** | Follows the item decision | Large |
| Session | **Defer** | Blocked on persistence choice (in-memory vs DB) | Large |
| Scoring result | **Defer** | Requires new effort-signal capture | Large |

**Sequencing.** The first seven rows are independently shippable now and do not
prejudge the Gen-A/Gen-B decision. The four `Defer` rows should not be attempted
until that decision is made — Gen-B deletes `item-bank` and `cat-engine`
entirely, which would waste any migration work done on them.

---

## 10. Reproducing the probes

The probe script is not committed (this audit adds no code). To recreate it,
place the following at `/tmp/probe.ts` and run
`pnpm --filter @gt-selection/contracts exec tsx /tmp/probe.ts`:

```ts
import { measurementMapSchema, screeningOutcomeSchema, examItemSchema }
  from '@gt-selection/contracts';

// shape produced by apps/web/src/lib/exam/harvest.ts:29-37
console.log(measurementMapSchema.safeParse({
  'M-ACC': '4/6  67%', 'M-ACC_num': 4,
  'M-DIFFREACH': 'L5 · 3 rules', 'M-DIFFREACH_num': 5,
}).success);                                   // -> false

for (const d of ['advance','admit','defer','hold','retry']) { /* see §5 */ }

console.log(examItemSchema.safeParse({ /* … */ ageBands: ['K-8'] /* … */ }).success);  // -> false
```

Non-probe checks:

```bash
diff <(sed -n '36,46p' apps/web/src/lib/exam/item.ts        | grep -o "'[a-z_]*'") \
     <(sed -n '41,51p' packages/item-bank/src/enums.ts      | grep -o "'[a-z_]*'")   # identical
rg -n "'advance'|'hold'|'retry'|'admit'|'defer'" apps packages supabase --glob '*.ts' --glob '*.sql'
grep -o '"K-8"' packages/item-bank/data/bank/items.bank.jsonl | wc -l                # 0
```
