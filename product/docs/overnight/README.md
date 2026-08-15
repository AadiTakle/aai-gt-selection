# Overnight run, 11–12 August 2026

Four questions were asked. All four are answered below, with the caveats where they belong.

## 1. Does Bramblebrook really use the engines and store its results?

**Yes. The overnight report used DynamoDB Local; the same platform was subsequently deployed and
verified in the sandbox.** → `01-cloud-path-verification.md`

The verification checks pass. The game's requests go through the platform's real route table, the real api-key
authorizer and the real handler modules; questions come from a published catalogue snapshot in storage rather
than off disk; scoring and selection are `@gt/qbank`'s; and every record a session should leave behind is read
back out of storage afterwards — trace rows with the item parameters in force when served, the score sheet, the
per-domain estimates, the item-to-sessions backfill index, the persona link and the exposure counters. The
synthesised CDK bundle was inspected to confirm it contains the same engine and the same variety layers, and
the template declares the same three tables and six indexes this ran against.

**Historical caveat:** this specific measurement run used DynamoDB Local. It did not test IAM,
organization policies, cold starts or CloudFormation behavior. A later real sandbox deployment did,
and surfaced defects emulation could not: region policy, an environment-variable mismatch and a
missing DynamoDB grant. Read `../gt/system-and-deployments.md` for current deployment status.

Re-run the local handler path: `cd product/platform && npm run verify:cloud`

## 2. Is it aimed at gifted third to fifth graders?

**Yes, now at the 95th percentile — and getting there surfaced something you need to decide.**
→ `02-the-gifted-cut-for-grades-3-5.md`

The cut is θ = 1.645, matching GT's stated "95th percentile CogAT, strictly applied", replacing a prototype
value of 1.0 that was really the 84th. Raising it also caught a bug: the single-battery pass bar sat *below*
the new composite, which would have made the one-battery route the easier way in.

**The finding: there is no grade-appropriate way to do this.** The bank's age bands are difficulty tiers wearing
grade labels. Grade-appropriate items top out at 0.64 logits, a full logit below the cut, and *zero* of them sit
near it. A child asked only grade-level questions answers them all and produces no evidence about the 95th
percentile at all. So the instrument does not filter by band, and **100% of questions served are above the
grade-appropriate ceiling** — median difficulty 1.42, opening question 1.41. That is standard above-level
testing and it is how talent searches work, but it means a gifted third grader will meet sixth-to-eighth-grade
material and get a fair amount of it wrong. **Bramblebrook's framing has to carry that**, and that is a copy
problem I have flagged rather than solved.

Measured over 4,000 children: accuracy 0.969, sensitivity 0.774, specificity 0.979.

**One decision left for you.** Sensitivity 0.774 means about a quarter of gifted children are missed. Dropping
`recommendProbability` from 0.30 to 0.20 buys 6.3 points of sensitivity for free — no extra questions — at the
cost of roughly 3.8 additional declined applications per additional child found. I recommend it, on the
asymmetric-loss argument the codebase already commits to, but **I did not make the change**: it is a values
judgement about families versus children, not a technical one. Everything here is measured at 0.30.

## 3. Are the questions semi-random across sessions?

**Yes, and it costs nothing.** → `03-are-the-questions-semi-random.md`

Over 4,000 children: 4,000 distinct question sequences, 93 distinct opening questions, no item shown to more
than 20% of children, and batteries interleaved (3.3% same-domain adjacency). The same cohort under plain
deterministic selection gets 12 distinct sequences and one opening question shown to every single child.
Decision accuracy is identical either way (0.969 against 0.968).

This needed measuring separately from the figures already in the design doc, because those were taken over the
whole 4,934-item catalogue and Bramblebrook is the hard case: seven types, 800 items, of which only about 120
are informative at the new cut. 119 of those 120 are in rotation, so the ceiling here is item supply near the
bar, not the selection logic.

## 4. How many questions, and how long?

**12 questions for the median child, 17 for nine in ten, 24 at the cap. About 8 minutes of play for the
median, and roughly three visits at the game's four-per-visit rhythm.** → `04-how-many-questions-and-how-long.md`

Question counts are measured. **Time is estimated and the document says exactly which parts are which**: settle
delay, walking speed, station distances and station-change frequency are measured from the game's own
constants; think-time (20–45 s) and walking-path inefficiency are assumed, and they are what the estimate rests
on. First-visit onboarding is not included at all.

92.9% of children decide before the cap. The median of 12 is exactly the `minItems` floor, so the floor rather
than the cap sets session length — lowering the cap to 16 does not shorten the median session and costs 6 points
of sensitivity.

Also recorded there: about a quarter of session time is walking, because interleaving batteries means changing
station on 97% of questions and Bramblebrook has one station per battery. A tunable exists; I left it alone.

## Corrected 12 Aug, after the owner played it

Two bugs that every measurement here missed, both found in five minutes of real play, and both of the same
kind: the simulations built their own inputs, so they tested the design and were silent about the deployment.

1. **Sessions never accumulated.** `createSession` always minted a new session, so the estimate restarted at
   every station and no interval ever narrowed. Twelve sessions held twenty-six answers.
2. **Sessions could never stop.** The stop rule was handed the whole catalogue, so it waited on spatial items
   Bramblebrook cannot serve. Every session ran to the 24-item cap; the "12 questions" figure below described
   a pool production did not use.

Both fixed, and both now covered by tests that drive the real routes. `npm run measure:live` measures question
counts a second way, through HTTP, and agrees with the simulation at a median of 12.

## Files

| file | what it is |
|---|---|
| `01-cloud-path-verification.md` | generated by `product/platform/scripts/verify-cloud-path.ts` |
| `02-the-gifted-cut-for-grades-3-5.md` | the cut, the above-level consequence, the sensitivity trade |
| `03-are-the-questions-semi-random.md` | variety measured on Bramblebrook's real pool |
| `04-how-many-questions-and-how-long.md` | question counts measured, time decomposed |
| `bramblebrook-measurements.json` | raw output, so any number above can be checked |

## What changed in the code

- `CRITERIA_V1`: threshold 1.0 → 1.645, `domainBar` 1.5 → 2.0, with a test asserting the ordering.
- `scripts/seed-bramblebrook.ts`: threshold 1.645, no age-band filter, both reasoned in comments.
- New `scripts/verify-cloud-path.ts` and `scripts/measure-bramblebrook.ts`, both runnable.
- One test aimed where the criteria judge rather than at the old threshold.
