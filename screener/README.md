# The screener library

A shared assessment item library and adaptive engine. The public screener in here is one
consumer of that library and deliberately not the product, because the point is that GT can
build a second or third tool on the same foundation without touching it.

Design rationale is in `../docs/design/screener-library-design.md`. The product argument is in
`../docs/proposals/public-screener.md`.

---

## Quick start

```bash
cd screener
npm install
npm run dev          # api on :5181, web on http://localhost:5180
```

Other commands:

```bash
npm run verify       # typecheck, unit tests, simulation, end-to-end smoke test
npm test             # 77 unit tests
npm run sim          # run synthetic cohorts through the engine and print what it did
npm run smoke        # start the api, drive a real session over HTTP, assert the guarantees
npm run typecheck
npm run build
```

No database and no API keys. Sessions persist to an append-only JSON Lines file under
`screener/data/`, and `GT_SCREENER_DATA` moves that somewhere else.

---

## The one idea to understand first

Several people will add to and prune this library while screeners are collecting real
responses. That only works if editing and serving are separated by a hard boundary, so:

**Item types are generators, published versions are immutable, and a screener pins a
snapshot.** A generator is a pure function from a seed to a question, so one generator stands
in for an unbounded family and no two candidates need see the same item. Publishing only ever
appends. A snapshot is a frozen list of `(generatorId, version)` pairs, and a screener reads a
snapshot rather than the library, so nothing an author does can reach a session in flight.

Removal follows from the same rule. Deprecating a type stops it entering **new** snapshots and
leaves every existing one untouched, which is why there is no delete.

There is a test for exactly this guarantee, and it is the one to read first:
`packages/item-library/src/library.test.ts`, "keeps serving a deprecated generator to snapshots
cut before the deprecation".

---

## Layout

```
screener/
├── packages/
│   ├── contracts/      types and the two invariants above, no dependencies
│   ├── item-library/   generators, registry, snapshots, publish-time validation
│   │   ├── generators/ 13 item types across four domains
│   │   ├── registry.ts     ★ publish, deprecate, snapshot, resolve
│   │   └── validation.ts   ★ what an item type must pass before it can go live
│   ├── engine/         adaptive selection, ability posterior, stopping rules. Pure.
│   │   ├── session.ts      ★ the algorithm
│   │   ├── posterior.ts    belief over ability, held as a grid
│   │   ├── irf.ts          item response function and information
│   │   ├── configs.ts      the prototype screener and its surfaces
│   │   └── harness/        synthetic candidates, so the engine is testable without children
│   └── stats/          metrics over stored sessions
├── apps/
│   ├── api/            express, append-only persistence
│   └── web/            the screener, the library studio, and the statistics
└── scripts/smoke.sh    end-to-end check
```

Dependencies only point left. `engine` knows nothing about screeners, surfaces or HTTP, and
`item-library` knows nothing about the engine, so a second tool imports the same three packages
and writes its own front end.

---

## The engine classifies, it does not measure

A screener does not need to know a child's ability. It needs to know which side of a line they
are on, which is a cheaper problem.

**Selection maximises information at the decision threshold, not at the running estimate.**
Selecting for information where you currently think the candidate sits is right when you want a
precise score. Since we want a decision, the useful question is the one that best separates
"above the line" from "below it".

**Stopping is a confidence rule, and it is asymmetric.** The session ends when the posterior
probability of being above the threshold clears `confidenceAbove` (0.75), or falls below
`1 - confidenceBelow` (0.03), or the item cap is reached. The gap between those two numbers is
the proposal's asymmetric-loss argument expressed as code: a false positive costs one declined
application, a false negative costs a child nobody hears about, so the engine is eager to pass a
candidate through and reluctant to rule one out.

That asymmetry is not decoration. A symmetric rule fires "below" on the prior rather than on
evidence, because the prior probability of clearing a demanding threshold is already small.
There is a regression test for it.

**The output is a probability with a band, never a score.** No percentile and no IQ estimate is
ever produced for a family.

---

## What the app shows

**Screener.** Take it. Pick an age band and a surface, and switch on "show the engine's
internals" to watch the posterior move item by item. Two outcomes exist, apply or here-is-more,
and neither is a rejection.

**Library studio.** Every item type with its difficulty, its discrimination, and where that
number came from. Preview any generator across six consecutive seeds with its publish-check
report. Deprecate a type and watch it vanish from the next snapshot while staying in the last
one. Cut a snapshot, which is the only act that changes what a candidate can see.

**Statistics.** Sessions, item-type behaviour keyed by version, and screener effectiveness split
by surface. Effectiveness reads "not available" rather than zero until a real outcome is attached
to a session, because those are different statements.

---

## Honest limits

1. **Nothing is calibrated.** Every item type carries an assumed difficulty and an assumed
   discrimination, so the posterior is only as good as numbers we chose. The studio marks this on
   every row and the simulation prints it. Flipping `requireCalibratedItems` to true currently
   leaves nothing servable, which is the correct behaviour and a useful reminder.
2. **No real child has taken this.** The simulation generates candidates whose true ability the
   code invents and hides from the engine. It tests an algorithm, not children.
3. **Generated siblings are not equivalent.** Items from one template vary in difficulty, so a
   generator's difficulty is a family-level estimate. The statistics layer tracks distinct seeds
   per version so the spread is visible, and calibrating per family is real work still to do.
4. **The assumed discrimination of 1.5 is load-bearing.** At 1.0 a sixteen-item session leaves a
   posterior standard error near 0.54, which cannot resolve which side of the threshold anyone is
   on, so the stop rule never fires. Calibration should replace this number early.
5. **Surfaces are threaded through the data model but only one is rendered.** Adding a real second
   surface is not a migration, though it is also not free: two surfaces are two instruments and
   need separate calibration.
6. **The prototype covers four domains thinly.** Thirteen item types is enough to demonstrate the
   library and to run a genuine adaptive session. It is not an item bank.

---

## Try the thing that would sink it

Deprecate `spatial.mirror` in the studio, then start a session on the original snapshot. It still
serves. Then cut a new snapshot and start another session, and it is gone. If that ever stops
being true, the boundary this whole design rests on has been broken.

Second, run `npm run sim` and compare the two cohorts. The self-selected pool needs more items
than the general population for the same decision, because a pool piled up against the threshold
is harder to classify. That is the density argument from the admission-cutoff BrainLift appearing
in the engine's own behaviour rather than in prose.
