# The screener library

A shared assessment item library and adaptive engine, plus the tools built on them: a public
screener, a reasoning-practice tool, and the 52-item playable catalogue embedded and themed. The
library is the product. Any consumer could be replaced without touching it, which is the point.

Design rationale is in `../docs/design/screener-library-design.md`. The product argument is in
`../docs/proposals/public-screener.md`.

---

## Quick start

```bash
cd screener
npm install
npm run dev          # api on :5181, web on http://localhost:5180
```

`DEMO.md` has an eight-minute click path if you are showing this to somebody.

Other commands:

```bash
npm run verify       # typecheck, 111 unit tests, simulation, 50 end-to-end checks
npm test             # 111 unit tests
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

## The second idea: usage is declared per family

A shared bank has a problem a shared bank does not obviously have. Practising on an item family
inflates later performance on that family, by roughly a third of a standard deviation on a second
sitting and more in younger children, and the inflated score shifts toward memory and away from
reasoning. So a practice tool drawing from the screener's own families would be coaching
candidates on that screener.

Every family therefore declares `usage: 'assessment' | 'prep' | 'both'`, and the library filters
on it. The default is `assessment`, so nothing becomes teachable by accident. Of the 13 seed
families, 7 reach the practice tool and 11 reach the screener, and the gap is the partition doing
its job. Publish-validation also refuses a family marked teachable that carries no written
explanation, because that is what a practice tool is mostly made of.

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
│   └── web/            the screener, practice, the catalogue, the studio, the statistics
├── DEMO.md             an eight-minute click path
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

## The banks drive the engine

`qbank-library/banks/` holds 53 files and 7,319 records copied out of the archive. Each carries the
item's content, a difficulty on a 1 to 20 scale, and an answer. **4,534 of them declare a
deterministic key and a numeric difficulty and can therefore be marked here.** The remaining 2,785
need a solver or a human judge; they are counted and set aside rather than dropped, and the studio
lists the types involved with a zero in the markable column.

The loop, which is the one the catalogue pages were built for:

1. the host picks an item by information at the decision threshold
2. `toServed` strips `answer`, `scoring` and `provenance`
3. the host posts `{source:'gt-exam-host', type:'init', item}` to the frame, then `start`
4. the frame renders it, the child answers, and it posts a `result` carrying the response
5. the host marks that response against the key it kept

**The key never reaches the browser**, which is why marking is a round trip rather than a check in
the page. There is a smoke check asserting no served payload contains `answer`, `correctKey` or
`scoring`, and another asserting the screener's answer endpoint returns no key while practice's does.

Difficulty is mapped to logits as `(d − 10.5) / 3`. That is a rescaling of the bank's own scale and
not a calibration: most records are marked `syntheticOnly`, so an item's position is an assumption
inherited from whatever generated it and then linearly transformed by us. The engine, the API and the
debug tray all say so in those words.

### Test length is one slider

Five stops, from Taster to Thorough. Length is an outcome of the confidence you demand rather than an
independent input, so one control moves both, and the mapping is printed next to it. The two shortest
stops are labelled as demonstrations, because classification research brackets a two-category
decision at roughly 13 to 16 items and the paper asking the question directly advises at least 20.
The asymmetry holds at every stop: the engine stays reluctant to rule anybody out however short the
session, since a missed candidate costs more than a wasted application.

### The debug tray

Docked to the bottom of the page and in flow, so opening it pushes content up instead of covering the
question. Three panels: the run's parameters including the threshold in both scales, the per-item
history with the reason the engine chose each item and the posterior before and after, and the raw
payload. Nothing is summarised away.

## The playable catalogue, embedded and themed

The 52 existing question types live in `../qbank-library/` and are served from the API at
`/qbank/items/`, proxied through the web app so they arrive on the same origin. That is not a
convenience. A cross-origin frame is opaque to its host, so same-origin is the mechanism that makes
everything below possible.

Two properties those files already had, before any of this existed:

**They broadcast.** Every one posts `{source:'gt-exam-demo', type:'ready'|'telemetry'|'result'}` to
its parent window, so the **Question catalogue** tab observes a live session without any item being
modified. The result carries the response and its metrics: response time, first-action latency,
revisions, focus losses, and a rapid-guess flag.

**They declare their palette.** Every one sets CSS custom properties on `:root`, so the host
re-skins an embedded item by setting those properties on the frame's document element. Four presets
ship, every property is editable live, and a palette can be copied out as a new preset. No item file
is edited and clearing the properties restores the original.

Coverage is uneven and the table in that tab says so per property: `--ink` appears in all 52 items,
`--good` in 47, `--accent` in 39, `--card` in 38, the background stops in 35, the telemetry panel's
four in 31. So a theme re-skins most of the catalogue rather than all of it, and a few items carry
one-off colours no global theme reaches. Those counts are asserted against the files in
`packages/qbank/src/qbank.test.ts`, so they cannot drift silently.

**What this does not do.** The items deliberately never report whether an answer was correct. Their
own source says "NEUTRAL acknowledgment only — never correct/incorrect." So the host can read a
response and its metrics and cannot score it, and wiring these into the screener's scored flow needs
an answer key held here that does not exist yet. There is a test asserting no item leaks a
correctness flag, so this stays true.

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
7. **The bank's difficulties are not calibrated and most of its records are synthetic.** Every number
   the engine reasons with is inherited from whatever generated the bank, so the ability estimate is
   a demonstration of a mechanism rather than a measurement of a child. This is the single most
   important thing to fix and everything else is downstream of it.
8. **The 8-to-16-item budget is at the low end of what the evidence supports, and one source says it is
   below it.** Classification-oriented adaptive testing reaches roughly 95% correct two-category
   decisions in 12.7 to 16.3 items, which brackets this. However, the one paper that asks the question
   directly advises "at least 20 items to have acceptable decision quality at the group level, and at
   least 40 items if correct decisions on the individual level" are needed. That figure comes from
   fixed-form simulations rather than adaptive classification, which is the reconciliation, but it
   should not be waved away. Raising `maxItems` is a config change and worth trying.
9. **Some catalogue items still cannot be scored.** They are embedded, observed and themed, and the
   screener's own adaptive sessions still run on the generator library rather than on them, because
   2,785 of the 7,319 bank records need a solver or a human judge, so 15 of the 53 types contribute
   nothing markable. They play in the catalogue and sit out of a scored session.
10. **Shortening the test costs sensitivity almost exclusively, which is the error this tool least
   wants.** At a demanding cut, clearing a candidate is cheap and confirming one is expensive, because
   there is little item information above the threshold and the prior already sits against them. In one
   simulation at a 10% selection ratio, going from 40 items to 15 moved specificity from .97 to .96
   while sensitivity fell from .76 to .61. In an early adaptive study, confirming mastery at the highest
   level exhausted the entire item pool. The asymmetric stop rule is the mitigation and it is a partial
   one, so treat the reported sensitivity as the number to watch when the budget changes.

---

## Try the thing that would sink it

Deprecate `spatial.mirror` in the studio, then start a session on the original snapshot. It still
serves. Then cut a new snapshot and start another session, and it is gone. If that ever stops
being true, the boundary this whole design rests on has been broken.

Second, run `npm run sim` and compare the two cohorts. The self-selected pool needs more items
than the general population for the same decision, because a pool piled up against the threshold
is harder to classify. That is the density argument from the admission-cutoff BrainLift appearing
in the engine's own behaviour rather than in prose.
