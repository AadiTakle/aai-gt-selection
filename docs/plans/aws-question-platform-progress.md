# Question Platform — Progress Ledger

**Branch:** `feat/sanctuary-platform`, worktree `/Users/atakle/gt-sanctuary-platform`, no remote configured.
**Nothing is deployed.** No AWS account exists, no credentials are on this machine, `cdk synth` only.

| Suite | Count |
|---|---|
| `platform` | 311 passing |
| `screener` including Bramblebrook | 504 passing |
| `cdk synth` | two templates, no credentials |

## Done

| # | Task | Commit |
|---|---|---|
| 1 | Build against current dev; stop inferring markability | `5b55389` |
| 2 | The engine decides, the platform records | `e22eae5` |
| 3 | Server-side session state (folded into 2 and 4) | `e22eae5`, `5f9d533` |
| 4 | Speak the bank contract; delete the served-item token | `5f9d533` |
| 5 | Item parameters from the engine, not a local guess | `9c96d9f` |
| 6 | The single-domain route needs evidence | `9f8b9e1` |
| 7 | Rapid guesses become unscorable | `cf97b1b` |
| 8 | Variety proposal for `@gt/qbank` | `86aa726` |
| — | Local router and dev server | `bce461e` |
| — | Seed script, and Bramblebrook on the platform | `86aa726` |

## Bugs found by building it, in rough order of how badly they would have bitten

1. **Cell-set items would have been marked wrong every time.** `markAgainstKey` was handed only the key, but
   `scoreResponse` dispatches on the type code — a cell-set answer is compared as a set first. All 140 newly
   servable Paper Folding items would have compared `'0,0|0,3'` against a tap, silently.
2. **818 of 4,934 items had the wrong guessing floor.** The compiler assumed four options where it could not
   tell. `CX-check-01` admits 64 or 256 answers, so its floor is 0.016 and not 0.25 — a fifteenfold
   overstatement of guessability that suppressed the information those items carry.
3. **The admin routes were public.** Wired to `HttpNoneAuthorizer` while the comment claimed IAM, which would
   have shipped an unauthenticated catalogue-publish endpoint.
4. **`piiPolicy: 'none'` blocked personas entirely**, which would have blocked Bramblebrook outright. A
   persona is pseudonymous; contact details are a separate row.
5. **`approveType` read the filesystem**, re-deriving UI requirements from bank files a Lambda does not have.
6. **The registry misreported 140 items' scoring mode**, and that misreport was what let them past a serving
   filter testing the same field.
7. **Domain interleaving silently stopped working** when the parameters were corrected — adjacency drifted to
   chance level, and only a re-run of the simulation caught it.
8. **Removing the token broke retry idempotency**, which the end-to-end test caught: a dropped connection
   would have cost a child their answer.
9. **The CDK and the dev router had two route tables, already disagreeing.**
10. Node 20 was already deprecated; `logRetention` likewise. `TableV2` with a CMK cannot render
    region-agnostic. Port 8010 was contested by an unrelated server that answered HTTP and failed DynamoDB.

## Claims I made and had to correct

- Said rapid-guess detection was working when only the field existed and `grade()` was never called.
- Said "same seed, same sequence"; exposure counters move between sessions, so reproducing a session needs the
  seed *and* the exposure snapshot.
- Read a 150-session run as sensitivity improving to 0.952; at 400 it was 0.833, unchanged.
- Wrote a comment for a stricter domain-floor rule than the code implemented; the looser one is correct.

## Outstanding, and none of it is silent

**Needs the owner:** an AWS account, credentials, `cdk bootstrap`, the first deploy. The real gifted-criteria
numbers — `CRITERIA_V1` is a documented placeholder. Confirming guardian-email-only before any real family
sees it.

**Needs code:**
- The sortbot pool gate. Ten of thirty-seven `VER-SORTBOT-01` items were excluded by the old dev plugin as
  unsuitable in the K-1 and 2-3 bands. Not reimplemented, because it belongs in data. Until it is, those items
  can be served.
- `/sanctuary/record` cannot report a number. `sessionsForPersona` exists in the store; no HTTP route exposes
  it. The view reports the gap rather than a stale figure.
- `GSI6` is declared and empty: `putSession` receives no client address, so the IP-linkage behaviour the spec
  describes does not exist.
- The notification queue has no consumer. Choosing an email provider and writing what a family receives is a
  product decision, and a queue retaining fourteen days is a safer place for those events to wait.
- 1,634 `computed_solver` items across fourteen types carry real keys behind comparison rules nobody has
  written — the largest recoverable pool available, deliberately deferred.
- `SortieHarness`'s threshold slider is inert: the platform is server-authoritative on measurement config.

## External effects

Nothing outside this repository has been mutated. No AWS resource created, read or modified. No package
published. `origin/dev` and `origin/feat/sanctuary` were read only. Network access: npm installs and the
`amazon/dynamodb-local` image pull.
