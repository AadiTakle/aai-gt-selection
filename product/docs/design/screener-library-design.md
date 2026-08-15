# Design plan: the item library, the engine, and the screeners that use them

**What this is.** The design for a shared assessment library that other people at GT can add to, edit and
prune over time, plus the adaptive engine that runs on it. The public screener from
`../proposals/public-screener.md` is the first consumer of that library and deliberately not the product.

**The one thing this design is organised around.** A library that several people edit while live screeners
depend on it will break those screeners unless editing and serving are separated by a hard boundary. So
that boundary is the first decision, and everything else follows from it.

---

## 1. What has to be true

Six requirements, in the order they constrain the design.

1. **Several people author items.** Not engineers. So authoring cannot mean writing code inside the
   engine, and publishing needs validation that catches mistakes before they reach a candidate.
2. **Editing must never disturb a live screener.** A screener that is collecting real responses has to keep
   serving exactly what it was serving, whatever anyone does to the library that day.
3. **Removing an item type must also never disturb a live screener.** So deletion cannot be deletion.
4. **Statistics persist across sessions, versions and surfaces.** A statistic is worthless if we cannot say
   which version of which item produced it.
5. **The screener is one consumer among several.** Somebody should be able to build a different tool on the
   same library without touching the library.
6. **A decision must be reconstructible.** Given a session id we have to be able to say which items the
   candidate saw, in what order, why each was chosen, and how the recommendation fell out.

## 2. The boundary: authoring is mutable, serving is immutable

The pattern here is a package registry, and the analogy is worth holding onto because it already solves
this problem. Authors work on drafts freely. Publishing is append-only. Consumers pin.

**Item types are authored as generators, not as items.** A generator is a pure function from a seed and a
set of parameters to a rendered question plus its answer key. Thus one generator stands in for an unbounded
family of questions, and two candidates never have to see the same one.

**A published generator version is immutable.** Editing a published generator does not change it. Instead
it produces a new version, and the old version stays exactly where it was. Publishing is the only write,
and it only ever appends.

**A screener pins a bank snapshot.** A snapshot is a frozen list of `(generatorId, version)` pairs with an
id of its own. A live screener references a snapshot, so it is reading a fixed set of frozen versions.
Therefore nothing an author does can reach it.

**Removal is deprecation.** Marking a generator deprecated stops it being included in *new* snapshots and
leaves every existing snapshot untouched. So a live screener keeps working, and the next snapshot cut
simply won't contain the deprecated type.

That is the whole answer to requirement 2 and 3, and it costs one indirection.

### What this buys and what it costs

It buys safety, auditability and a real answer to "can I edit this while it's running." However, it costs
something honest: snapshots accumulate, and two screeners pinned to different snapshots are running
different instruments. So results across snapshots are not automatically comparable, and the design
records the snapshot id on every session precisely so that nobody accidentally pools them.

## 3. Layers

```
packages/
  contracts/      types and runtime schemas, no dependencies, imported by everything
  item-library/   the generator registry, versioning, snapshots, validation, authoring
  engine/         adaptive item selection, ability posterior, stopping rules. Pure.
  stats/          persistence-agnostic metric computation
apps/
  api/            persistence and snapshot serving
  web/            the prototype screener, plus the studio for authoring and statistics
```

The dependency direction only ever points left. `engine` knows nothing about screeners, surfaces or HTTP.
`item-library` knows nothing about the engine. Consequently a second tool built on this library imports
the same three packages and writes its own front end, which is requirement 5.

### Why the engine is pure and deterministic

Given a config, a snapshot and a seed, a session replays identically. That gets us three things at once:
the simulation harness needed to test the engine without children, reproducible bug reports, and
requirement 6, since a session is reconstructible from its seed rather than from a full event log.

## 4. The engine does classification, not measurement

This is the most consequential design choice and it comes straight out of what a screener is for.

A screener does not need to know a child's ability. It needs to know which side of a line they are on. That
is a different statistical problem and it is a much cheaper one. So the engine maintains a posterior over
ability and asks two questions after every item: what is the probability this candidate is above the
decision threshold, and is that probability confident enough to stop.

**Item selection maximises information at the threshold, not at the current estimate.** Selecting for
information at the running estimate is the right rule when you want a precise score. Since we want a
decision, the right rule is to ask the question that best separates "above the line" from "below it."

**Stopping is a confidence rule, not a length rule.** The session ends when the posterior probability of
being above the threshold passes the target confidence, or falls below its complement, or the item cap is
reached. Thus a clear case ends fast and an ambiguous one uses the full budget, which is exactly the
behaviour a fifteen-minute public tool needs.

**The output is a probability with a band, never a score.** Consistent with the proposal, no percentile or
IQ estimate is ever produced for a family. The engine emits `P(above threshold)`, a decision, and the
reason it stopped.

## 5. Honesty encoded in the types

Two things the design refuses to let anyone forget.

**Every generator carries a difficulty estimate *and* where that estimate came from.** The field is
`{ b, se, source: 'assumed' | 'calibrated' }`. A newly authored generator is `assumed` until enough real
responses exist. A screener config can refuse to serve uncalibrated generators, or serve them and mark the
session, but it cannot silently treat a guess as a measurement.

**Generated siblings are not assumed to be equivalent.** The measurement literature on automatic item
generation is clear that items from one template vary in difficulty, so the design treats a generator's
difficulty as a family-level estimate with real within-family spread. Therefore the statistics layer tracks
difficulty *per generator version* and also the observed spread across seeds within that version, which is
the number that tells us whether a family is tight enough to trust.

## 6. Statistics, and what they are keyed by

Persistence is append-only event storage plus derived views. Two tables carry everything.

**Sessions.** One row per attempt: session id, screener config id and version, snapshot id, surface id,
seed, age band, start and end timestamps, items served, stop reason, final posterior, decision.

**Responses.** One row per item: session id, ordinal position, generator id, generator version, item seed,
the rendered item's key facts, whether the answer was correct, latency, the posterior before and after, and
why this generator was selected.

Keying responses by generator *version* and item *seed* is what makes the statistics meaningful later. So
when someone asks whether a change to an item type helped, the question is answerable.

### What the stats layer computes

- **Per generator version.** Response count, proportion correct, point-biserial against the session
  outcome, mean latency, exposure count and rate, and the observed difficulty spread across seeds.
- **Per screener config.** Item-count distribution, completion and abandonment rate by position, decision
  distribution, and stop-reason distribution.
- **Per surface.** All of the above, split, because the proposal establishes that two surfaces are two
  instruments.
- **Screener effectiveness, once outcomes exist.** Sensitivity, specificity, positive and negative
  predictive value, and the decision-analytic measures. These stay unpopulated until a real outcome is
  attached to a session, and the design should show them as unavailable rather than as zero.

## 7. Authoring workflow

The path a new item type walks, and each gate exists because a bad item is much more expensive after it
goes live.

1. **Draft.** An author defines a generator in the studio and previews rendered instances across seeds.
   Drafts are freely mutable and invisible to every screener.
2. **Validate.** Publishing runs automatic checks. Determinism, which means the same seed twice yields
   byte-identical output. Key validity, which means exactly one correct option and no duplicate
   distractors. Schema conformance. Answer-position balance across seeds, since a generator that always
   puts the key in slot B teaches candidates to guess. And a render smoke test across the declared age
   bands.
3. **Publish.** The version is frozen and becomes eligible for snapshots. It is not yet in any snapshot.
4. **Snapshot.** Somebody cuts a snapshot, which is the deliberate act that puts published content in front
   of candidates. This is the only step that changes what a candidate can see.
5. **Calibrate.** Real responses accumulate and difficulty moves from `assumed` to `calibrated`.
6. **Deprecate.** The type stops entering new snapshots. Nothing live changes.

Note that steps 3 and 4 are separate on purpose. Publishing is safe, and snapshotting is the consequential
act, so they should not be the same button.

## 8. What the prototype covers, and what it defers

The build tonight is a working slice rather than the finished system.

**In.** All four packages with real implementations. Roughly a dozen generators across quantitative,
verbal, spatial and fluid reasoning. Versioning, snapshots and deprecation working end to end. The
classification engine with threshold-targeted selection and a confidence stop rule. Persistent sessions and
responses. A runnable screener that produces a recommendation. A studio that lists the library, previews
generators across seeds, cuts snapshots, and shows the statistics. A simulation harness that runs synthetic
candidates so the engine can be tested without children.

**Out, deliberately.** Real calibration against real responses, since that needs real candidates. Item
exposure control beyond counting. Authentication and roles. The GT admissions-account integration from the
proposal. Any styling that implies a finished brand. Multi-surface rendering, though the surface id is
threaded through the data model so adding one later is not a migration.

**The known weakness to look at first.** Difficulty is `assumed` for every generator in the prototype,
because nothing has been calibrated. So the engine's posterior is only as good as a set of numbers we chose,
and the recommendation it produces is a demonstration of the mechanism and not a measurement of a child.
The statistics layer is built to make that visible rather than to paper over it.
