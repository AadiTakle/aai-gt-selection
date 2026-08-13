# Proposal: variety in `@gt/qbank`'s selection

**For:** Felipe, as the owner of `screener/packages/qbank/src/engine.ts`
**From:** the question-platform work on `feat/sanctuary-platform`
**Status:** Proposal. Nothing in `@gt/qbank` has been modified.

---

## The problem, measured

`selectNext` maximises Fisher information at the decision threshold and takes the first maximum it finds:

```ts
const info = information(threshold, paramsForRecord(entry.record, entry.b));
if (!best || info > best.info) best = { ... };
```

That is the right objective and a deterministic tie-break. The consequence is that two children with the same
ability trajectory are asked the same questions in the same order, and the stored `seed` is not consulted.

Simulating 400 children of known ability through the real catalogue — 4,934 scorable items across 36 types,
answering per the same 3PL the engine grades with:

| | `selectNext` as it stands |
|---|---|
| Distinct opening items across 400 sessions | **1** |
| Most common opening, as a share of sessions | **100%** |
| Highest exposure rate of any single item | **1.000** |
| **Distinct items the whole cohort touched, of 4,934** | **16** |
| Adjacent pairs repeating a domain | 37.7% |
| Largest share of one session taken by a single type | **50.3%** |

Four hundred children between them see sixteen questions. One item appears in every session. One question
type fills half of a session, which means that type rather than its domain is what the session measures.

Two consequences beyond the obvious one. **Item security**: an item in every session leaks. And
**calibration**: an item served three times can never accumulate the responses needed to estimate its
parameters from data, so a bank selected this way guarantees its own difficulties stay assumptions.

## What the platform built, and what it costs

Six layers between the information score and the choice. All are pure, all read only the state
`selectNext` already receives plus two counters, and each is individually disableable.

1. **Seeded RNG.** Every stochastic choice derives from `hash(seed, ordinal)`, so sessions differ and one
   session replays from its seed given the same exposure state.
2. **Randomesque.** Sample from the top K by information rather than taking the maximum. K widens early,
   where the information difference between the best candidate and the fiftieth is numerically trivial, and
   narrows once the posterior has tightened.
3. **Information-proportional sampling** within that band, so a marginally better item is not effectively
   guaranteed.
4. **Same-type damping**, multiplying information by `1 / (1 + timesTypeServed)`. This is as much a
   construct-validity control as a variety one: eight `FLU-MATRIX` items measure `FLU-MATRIX`, not fluid
   reasoning.
5. **Domain interleaving.** Prefer a different domain from the last when one is within a tolerance of the
   best available information.
6. **Exposure control.** Damp items above a target exposure rate, `(target / observed) ^ exponent`.

Measured against the same 400 children:

| | as it stands | with the layers |
|---|---|---|
| Mean items to a decision | 9.97 | 10.15 |
| **Accuracy against the child's true ability** | 0.932 | **0.945** |
| Sensitivity / specificity | 0.741 / 0.962 | **0.796** / **0.968** |
| Distinct openings | 1 | 285 |
| Highest exposure rate | 1.000 | 0.200 |
| Distinct items touched | 16 | 560 |
| Same-domain adjacency | 37.7% | 0.0% |
| Largest single-type share | 50.3% | 10.7% |

**It costs about 0.2 items per decision and classifies true ability slightly better**, because correcting
which items are informative — see below — made a number of items more informative than the old parameters
claimed, and an argmax fixating on sixteen never reaches them.

## Two findings that are yours regardless of this proposal

**`optionCountOf` is doing more work than its callers realise, and that is good.** The platform's compiler
originally counted `content.options` and assumed four when it could not tell. Measured against your loader,
that disagreed for **818 of 4,934 items**: `CX-check-01` is six or eight independent probes, so it admits 64
or 256 answers and its guessing floor is 0.016 rather than the 0.25 being asserted — a fifteenfold
overstatement that suppresses the information those items carry. A further 140 cell-set items are not
guessable at all. Anything deriving item parameters outside `paramsForRecord` will get this wrong.

**Domain interleaving is sensitive to the parameters in a way worth knowing.** At a 10% tolerance the layer
worked while every item was assumed to have four options. With real floors the information landscape spreads
out, off-domain alternatives stop landing within 10%, and same-domain adjacency drifted back to 24.8% —
chance level for four domains, meaning the layer had silently stopped doing anything. 0.30 restores it. If
you adopt interleaving, the tolerance is not a free parameter.

## What adopting this would involve

The layers live in `platform/packages/selection/` and are pure functions over a request record. Moving them
would mean:

- `SelectNextInput` gains the two counters the layers read: served counts per item for the calling app, and a
  session count as the exposure denominator. Both are things a caller already has or can keep.
- A `VarietyConfig` on `QbankSessionConfig`, defaulting to values that reproduce today's behaviour exactly, so
  adopting the code changes nothing until a caller opts in. The platform's control test asserts that
  disabling every layer reproduces the argmax baseline item for item.
- `selectNext` gains the seeded RNG it already stores a seed for.

**What it would not involve:** any change to the objective, the stop rule, the pass route, the posteriors, or
the wire contract. The layers decide *among* items; they do not re-score them.

The simulation harness that produced every figure here is `platform/scripts/simulate-variety.ts`. It drives
your `selectNext` and your `stateFor` directly, so it can measure a change to either without modification.

## What we are not asking for

We are not asking you to take this now, and the platform does not depend on you doing so — it composes the
layers over your pool and your objective, so both work today. The reason to raise it is that Bramblebrook and
the family portal are two consumers of one engine, and a variety fix that lives in only one of them is a fix
the other silently lacks.
