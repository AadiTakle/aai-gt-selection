# Does Bramblebrook really use the engines and store its results?

Generated 2026-08-12T05:51:44.399Z by `platform/scripts/verify-cloud-path.ts`. Re-run with
`npm run verify:cloud` from `platform/`.

## The honest caveat, first

**This is emulation, not a deployment.** This project has no AWS account and no credentials on this machine,
so nothing here touched AWS. Storage is DynamoDB Local — Amazon's own emulator, speaking the real DynamoDB
API including conditional writes and sparse-index semantics — and the request path is the platform's real
route table and handlers rather than a mock of them.

What that does and does not buy: it establishes that the code is correct and that the data lands where it
should. It cannot establish that IAM policies behave as written, that a cold Lambda starts inside its timeout,
or that the tables provision. Those need the account.

## What was checked

| Confirmed | Aspect | Evidence |
|---|---|---|
| yes | The question bank is stored, not read from disk at serve time | snapshot snap-20260812-001, 4934 items and 4934 answer keys written to storage |
| yes | Every bank record is accounted for | 7319 records seen, 4934 servable, remainder itemised by reason |
| yes | Answer keys are in a separate table from the items | keys live in gt-verify-keys-324cb012; the serving function has no IAM statement naming it |
| yes | A request with no app key is refused before reaching a handler | the local router resolves an app the way the deployed authorizer does, and fails closed |
| yes | The selection engine chose the questions, restricted to the battery asked for | 14 questions served, all from the requested battery: QUANT-BALANCE-01, QUANT-SERIES-01, QUANT-FUNC-01 |
| yes | No answer key crossed the wire, at any depth, on any question | every served payload inspected as serialised JSON |
| yes | Every answered question is stored as a trace row | 14 response rows, each carrying the item revision and the (a, b, c) in force when it was served |
| yes | The score sheet is stored, and reconciles against its own trace | composite mean 2.518, 14 responses, engine engine-2026.08.10 |
| yes | Per-domain estimates are stored alongside the composite | domains with evidence: quantitative=14 |
| yes | The item-to-sessions index answers the backfill question | GSI1 for one served item returns 1 session/ordinal pair(s) |
| yes | The persona index links a keeper to their sessions | GSI2 for keeper-verify-324cb012 returns 1 session(s) |
| yes | Exposure counters were incremented per served item | 14 items counted against 1 session(s) for this app |
| yes | A pseudonymous persona exists with no contact details | the persona carries createdAt, locale and first-seen app; contact details are a separate row nothing wrote |
| yes | The deployment artifact contains the shared measurement engine | bundled handler of 110 KB contains the posterior and the stop rule from @gt/qbank |
| yes | The deployment artifact contains the variety layers | exposure damping and randomesque selection are present in the bundle |
| yes | The stack that would be deployed declares the same storage this ran against | 3 tables and 6 indexes (GSI1, GSI2, GSI3, GSI4, GSI5, GSI6) in the synthesised template |

## What each aspect means here

**The question banks.** Not read off disk at serve time. Publishing compiles the 53 banks into registry rows,
a separate answer-key table, and a compact selection index; a session pins the snapshot it ran against, so
publishing again cannot alter a session in flight.

**The scoring engine.** `@gt/qbank`'s `engine.ts` — four domain posteriors and a composite, its stop rule,
its pass route. The platform stores the verdict and does not compute one.

**The selection engine.** `@gt/qbank`'s Fisher-information objective at the decision threshold, with the
platform's variety layers composed over it. Both are present in the synthesised bundle.

**Data collection.** Every answered question leaves a trace row carrying the item revision and the exact item
parameters in force when it was served, which is what makes a later re-score meaningful rather than a
different calculation. The sheet, the per-domain estimates, the exposure counters and the persona link are all
read back out of storage above.

All checks passed.
