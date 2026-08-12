# How many questions, and how long, before a baseline decision

Written overnight 11–12 Aug 2026. Question counts measured over 4,000 simulated children with
`platform/scripts/measure-bramblebrook.ts`. Time is **estimated**, and this document is explicit about which
numbers are measured and which are assumed, because they are not the same kind of number.

## The answer

**12 questions for the median child. 17 for nine children in ten. 24 at the hard cap.**

At the pace a third to fifth grader plausibly plays Bramblebrook, 12 questions is about **8 minutes** of play,
in a range of roughly **6 to 12** depending on how long the child thinks. The 24-question worst case is about
**16 minutes**, range 11 to 23.

In the game's own rhythm of roughly four questions per visit, a baseline decision therefore takes **about three
visits**, not one.

## Questions: measured

Over 4,000 simulated children at the 95th-percentile cut, budget 24:

| | questions |
|---|---|
| median | **12** |
| 90th percentile | **17** |
| maximum | **24** |
| mean | 13.2 |

**92.9%** of children reach a confident decision before the cap. **7.1%** exhaust all 24 questions without
one — these are children sitting close to the cut, where separating above from below genuinely needs more
evidence than a game can ask for.

The median of 12 is not a coincidence: it is exactly `minItems`, the floor below which the stop rule refuses to
decide at all. For most children the instrument is confident as early as it is permitted to be, and the floor —
not the cap — is what sets session length. That is worth knowing before anyone tries to shorten the experience:
lowering the cap from 24 to 16 does not move the median at all (still 12) and costs 6 points of sensitivity.
Lowering the *floor* would shorten sessions, and would do it by deciding on thinner evidence.

## Time: two measured components and two assumed ones

I cannot measure gameplay time honestly. It depends on a child walking a 3D ranch, listening to Nan, and
thinking about hard puzzles, none of which I can observe without a real playthrough with real children. So
here is the decomposition instead, with each part labelled.

**Measured, from the game's own constants:**

| component | value | source |
|---|---|---|
| settle after each answer | 0.90 s | `settleMs` in `shared/useSortie.ts` |
| keeper walking speed | 4.2 m/s | `WALK` in `game/world/ladder.ts` |
| mean distance between stations | 20.6 m | the three station positions in `game/stations/sites.ts` |
| how often the child changes station | 96.7% of questions | measured same-domain adjacency of 3.3% |

**Assumed, and these are the load-bearing guesses:**

| component | assumed | why this range |
|---|---|---|
| think-and-answer time | 20–45 s, centre 30 s | CogAT allots roughly 30–50 s per item; these items are deliberately above grade level, so the upper half of that range is the honest place to sit |
| walking-path inefficiency | 1.5–2.5× straight line | a child does not take the geodesic, and `STATION_SOLIDS` plus the barn have to be walked around |

Which gives, per question:

| | think | settle | walk | **total** |
|---|---|---|---|---|
| brisk | 20 s | 0.9 s | 7.1 s | **28 s** |
| central | 30 s | 0.9 s | 9.5 s | **40 s** |
| unhurried | 45 s | 0.9 s | 11.8 s | **58 s** |

And per session:

| questions | brisk | central | unhurried |
|---|---|---|---|
| 12 (median) | 5.6 min | **8.1 min** | 11.5 min |
| 17 (p90) | 7.9 min | **11.4 min** | 16.4 min |
| 24 (cap) | 11.2 min | **16.2 min** | 23.1 min |

**Not included:** first-visit onboarding — the intro guide, learning to walk and look, Nan's opening. I have no
basis to measure it and would guess 2 to 5 minutes, once, on the first visit only. Treat it as additive and
unverified.

## A design finding worth your attention

**Roughly a quarter of session time is walking, and it is the psychometrics that put it there.** Interleaving
batteries is right — it keeps a child from grinding through one puzzle type and stops fatigue from loading onto
a single domain — but Bramblebrook has one station per battery, so interleaving means changing station on 97%
of questions. That is 9.5 of the central 40 seconds per question spent crossing the ranch.

The knob is `domainInterleaveTolerance` in `DEFAULT_VARIETY_CONFIG`. Allowing two or three consecutive
questions at the same station would cut walking substantially. The saving is real but modest — around a minute
off the median session — and it trades against the fatigue argument, so I have not touched it. Recording it
because it is not obvious from either the psychometrics or the level design alone, only from both together.

## What "a baseline decision" means here

The decision is what `computeSheet` returns once the stop rule fires: a composite ability estimate with an
interval, four per-domain estimates, and a recommend-or-not against the 95th-percentile cut. At the median 12
questions that decision is **77.4% sensitive** and **97.9% specific** — see
`02-the-gifted-cut-for-grades-3-5.md`, particularly the note that a quarter of gifted children are missed and
that the recommendation bar, not the question count, is the lever on that.

The count is also honest about what it is not: 12 questions is enough for this machinery to reach its own
confidence bar on this difficulty scale. Whether 12 questions is enough to identify a gifted child is a
question only real response data can answer, because the difficulties driving every number above are a linear
rescale of an authoring judgement rather than calibrated parameters.
