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

## Overnight, 11–12 Aug: aiming at the target audience, and proving the cloud path

Artifacts in `docs/overnight/`, indexed by its README. Four things were asked and all four are answered there;
this section records only what changed in the code and what it cost.

**The cut moved to the 95th percentile.** `CRITERIA_V1.abilityThreshold` 1.0 → 1.645, which is GT's stated
CogAT bar rather than the prototype's roughly-84th-percentile value. The old 1.0 was a generous *screening*
instinct in the wrong place: leniency belongs on the recommendation probability, not on where the line is, and
having it in the threshold meant the instrument measured the 84th while everyone discussed the 95th.

**A bug the move exposed.** `domainBar` was 1.5, which against a 1.645 composite would have sat *below* it —
making the single-battery pass route the easier way in, silently. Now 2.0, with tests in two packages asserting
the ordering rather than trusting the numbers to stay ordered.

**Age-band filtering is off for Bramblebrook, deliberately.** The bands are difficulty tiers wearing grade
labels: grade-appropriate items top out at 0.64 logits against a 1.645 cut, and *zero* sit within half a logit
of it. Band-locking a grade 3-5 session makes a gifted decision unreachable in principle, not just imprecise —
every item is one the child passes, so the posterior never narrows where it matters. 100% of items served are
now above the grade-appropriate ceiling, which is what above-level testing is.

**Measured on Bramblebrook's real pool** (seven types, 800 items, ~120 informative at the new cut), 4,000
children: 12 questions median to a decision, 17 at p90, 92.9% deciding before the 24-item cap; accuracy 0.969,
sensitivity 0.774, specificity 0.979; 4,000 distinct sequences and 93 distinct openings against deterministic
selection's 12 and 1.

**The cloud path is verified against an emulator, and the report says so on every line.** 16 checks in
`scripts/verify-cloud-path.ts`, covering the published catalogue, key isolation, the authorizer failing closed,
selection restricted to the approved battery, no key on the wire, trace rows carrying the parameters in force
when served, the sheet reconciling against its own trace, both backfill indexes, exposure counters, and the
persona having no contact row. It also inspects the synthesised CDK bundle to confirm the deployed artifact
contains the same engine and variety layers, rather than assuming it.

### What this run got wrong before getting it right

- Reported sensitivity 0.722 from a 500-child cohort. At a 95th-percentile cut only 5% of a sample is positive,
  so that was 18 cases and ±0.21 — not a measurement. Re-ran at 4,000 for ±0.06. The cut's height changes how
  large a cohort has to be, and the earlier runs at lower cuts did not need this.
- Left two `as never` casts in the verification script reaching for store internals that were never used in the
  report. Deleted rather than fixed.
- Two tests asserted the old threshold as a fact about the product. One of them asserted the word
  "placeholder" in the criteria description. The bar is no longer a placeholder, but the probabilities are still
  uncalibrated, so that test now pins the caveat that is still true instead of the word that was not.

### Decisions left with the owner

- **`recommendProbability` 0.30 → 0.20.** Buys 6.3 points of sensitivity for no additional questions, at roughly
  3.8 more declined applications per additional gifted child found. Recommended on the asymmetric-loss argument
  already committed to in this codebase, and deliberately **not** applied: it is a values judgement. Every
  number in the artifacts is measured at 0.30.
- **Bramblebrook's copy.** A gifted third grader now meets sixth-to-eighth-grade material and will get a good
  share of it wrong, because the most informative question is one you might miss. A child who experiences
  fourteen questions as fourteen failures has been told something false. Psychometrically correct, and a
  framing problem the game has to carry.

## Outstanding, and none of it is silent

**Needs the owner:** an AWS account, credentials, `cdk bootstrap`, the first deploy — the only thing standing
between the verified emulated path and a real one. Calibrated item difficulties: `CRITERIA_V1` now carries GT's
stated bar, but the probabilities are computed over a rescale of an authoring judgement, so nothing here is
calibrated against children. Confirming guardian-email-only before any real family
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
