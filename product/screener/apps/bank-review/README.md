# Bank review

Work through the question types and settle three things about each: does its grade range make sense,
does its CogAT mapping hold, and is its difficulty usable.

```bash
npm run review        # from the repo root or from screener/
# http://127.0.0.1:5191
```

## What it shows

53 types, 7,319 items. Per type: the difficulty distribution across the 1 to 20 design scale, the age
bands the bank claims and how many items sit in each, the CogAT mapping and its strength, the reading
load, and four real items so you can see what the type actually asks.

**The histogram is the reason this is a UI rather than a spreadsheet.** A mean difficulty of 10.5 looks
healthy and can be produced by a bank with nothing at all between 8 and 13, which is exactly where an
adaptive engine spends most of its time. Empty buckets are drawn in red and counted, because a rung the
engine can target and find nothing at is a hole rather than a statistic.

## Filters, in the order they are useful

Not alphabetical, because that is not how this work goes.

- **CogAT direct** (10) and **CogAT loose** (7). The loose ones are the judgement calls.
- **No CogAT analogue** (36). What the new focus makes optional.
- **Thin banks** (2). Under 100 items, so a cohort sees repeats.
- **Gaps in difficulty** (4). Will fail an adaptive engine regardless of anything else.
- **Not yet reviewed**. Where you left off.

## Where the review goes

Autosaves to `docs/design/bank-review.json` about a second after you stop typing, so the result is data
the rest of the project can read rather than a conversation. Verdicts are `keep`, `rework` or `cut`, plus
an optional grade override, a CogAT judgement, a difficulty verdict and a note.

## A note on what leaves the server

`server-plugin.ts` reads the banks and returns aggregates. The browser never receives `answer`,
`scoring` or `provenance`, and the four sample items per type carry only their id, difficulty, bands,
content field names and a prompt preview. A reviewer judging difficulty has no need for answer keys, and
serving them would put every key in a browser cache.
