# Are the questions semi-random across sessions?

Written overnight 11–12 Aug 2026. Numbers from `platform/scripts/measure-bramblebrook.ts` over 4,000
simulated children on Bramblebrook's actual approved pool.

## Short answer

Yes, and it costs nothing in accuracy. Over 4,000 children: **4,000 distinct question sequences**, **93
distinct opening questions**, and no single item shown to more than **20%** of children. The same cohort under
plain deterministic selection gets **12** distinct sequences and **one** opening question shown to **every
child**.

## Why this needed measuring again

The variety figures already in `docs/design/aws-question-platform.md` were taken over the whole catalogue —
4,934 items across 36 types. **Bramblebrook is the hard case**: seven types, 800 items. A thin pool has fewer
near-optimal items to choose between, so exposure concentrates and openings repeat, and quoting the
catalogue-wide numbers as though they described the game would have been quietly wrong.

It got harder still when the cut moved to the 95th percentile. Selection now concentrates near difficulty
1.645, and only about 200 of those 800 items sit at or above it — so the pool that variety actually has to work
with is roughly **120 items, not 800**. Every number below is against that real constraint.

## Measured, on the seven-type pool

| | with variety layers | deterministic argmax |
|---|---|---|
| distinct question sequences, 4,000 children | **4,000** | 12 |
| distinct opening questions | **93** | 1 |
| most common opening, share of children | **1.7%** | 100% |
| highest exposure of any single item | **20.4%** | 100% |
| distinct items used | **119** | 24 |
| consecutive questions from the same domain | **3.3%** | 75.3% |
| largest share held by one question type | **16.7%** | 35.0% |
| decision accuracy | **0.969** | 0.968 |

Reading these:

**No two children take the same screening.** 4,000 of 4,000 sequences distinct. Under deterministic selection
there are twelve, because the only thing separating children is which questions they get wrong.

**The opening is not fixed.** Deterministic argmax gives every child on earth the same first question — the
single most informative item at the threshold. That is the worst possible property for an item you want to keep
using: it is the one that leaks first and the one a child sees again on their second visit. 93 different
openings, with the most common at 1.7%, fixes that.

**No item carries the pool.** The most-shown item reaches 20.4% of children rather than 100%. 119 items in
rotation out of roughly 120 usable at this cut — so the variety layers are using essentially all of the pool
that is informative at the bar, and the ceiling here is item supply near the cut, not the selection logic.

**Batteries interleave.** Same-domain adjacency drops from 75.3% to 3.3%. Deterministic selection walks a
whole battery before moving on, because information at the threshold barely changes item to item; the child
experiences one long block of the same puzzle. 3.3% is below chance for three domains and reflects the
interleave rule actively alternating.

**Accuracy is unaffected.** 0.969 against 0.968. The variety layers spend the slack between near-equally
informative items, which is the entire design premise, and the measurement says the premise holds.

## One tuning note worth recording

Correcting the guessing floors earlier in this run — adopting `@gt/qbank`'s own `optionCountOf` rather than
assuming four options, which was wrong for 818 items — tightened the information curve enough that the domain
interleave tolerance of 0.10 stopped biting, and same-domain adjacency went from 0% to 24.8%, i.e. back to
chance. Raising the tolerance to 0.30 restored it. The lesson: the variety layers are expressed as tolerances
in information units, so anything that changes the information curve silently changes how much room they have.
They need re-measuring after any item-parameter change, which is why this script exists rather than a
one-off number in a document.

## What is not covered

Exposure counters are per app and advisory — they damp an item's selection probability by how often it has
already been served, and they are read as a snapshot at session start. Two sessions starting in the same
instant see the same snapshot, so exposure is a statistical property across a cohort, not a per-session
guarantee. Reproducing a specific child's sequence needs both their session seed and the exposure snapshot as
it stood, which is recorded in the trace.
