# Engine, Scoring, Traces, and Rescoring

## Which engine is live

The live adaptive path is `product/screener/packages/qbank/`.

`product/screener/packages/engine/` supplies the posterior, item-response, and
Fisher-information primitives used by qbank. The same package also contains an
older generator session and simulation harness. The generator path is preserved,
but it is not the deployed qbank session.

The platform does not implement a second measurement engine. Its adapter in
`product/platform/packages/scoring/src/qbank-adapter.ts` translates durable
records into qbank inputs. Live scoring and rescoring both call
`computeSheet()` in `product/platform/packages/scoring/src/sheet.ts`.

## Session provenance

Every session freezes:

- `sessionId`
- `appId`
- optional `personaId`
- catalogue `snapshotId`
- `engineVersion`
- `criteriaVersion`
- resolved app configuration
- random seed
- age band
- restricted type set
- lifecycle timestamps and status
- final stop reason and decision

Changing an app after a session starts does not change that session's recorded
rules.

## Response trace

A response row is written when an item is served and completed when it is
answered. Its fields are defined in
`product/platform/packages/domain/src/session.ts`.

Fields that identify the evidence:

- ordinal
- item id and item revision
- type and domain
- authored difficulty
- item parameters `(a, b, c)` in force at serve time
- option count
- raw response
- marked result: correct, incorrect, or unscorable

Fields used for reliability and audit:

- state: served, answered, or expired
- latency
- renderer metrics
- grading flags such as `rapid-guess`
- idempotency key
- served and answered timestamps
- selection reason, Fisher information at the threshold, candidate-pool size,
  randomesque width, and selection layer

A `correct: null` response remains in the trace but moves no posterior evidence.
This distinguishes an unscorable or unperceived response from an incorrect one.

## How a score is produced

For each scored response:

1. Reconstruct the item parameters recorded in the trace.
2. Update the composite posterior.
3. Update only the matching domain posterior.
4. Recompute probability above the app's ability threshold.
5. Check item floors and per-domain coverage.
6. Apply the asymmetric confidence stopping rules or item cap.
7. Determine the recommendation and whether it passed through the composite or a domain route.
8. Evaluate the separately versioned GT outreach criteria.

The stored score sheet contains:

- composite and per-domain means
- standard deviations
- central credible intervals
- probability above threshold
- scored and unscorable counts
- accumulated information
- stop state and reason
- recommendation and pass route
- GT-criteria result
- engine, criteria, and snapshot versions
- response count used
- any trace items the active pool could not account for

The trace is authoritative. `SHEET#CURRENT` is a materialized view for fast
reading; timestamped sheet rows preserve computation history.

## Two different decisions

An app's `recommendProbability` controls what its user sees. The platform's
versioned gifted criteria control the stronger operational decision that a
session meets GT's outreach criteria.

Current criteria are defined in
`product/platform/packages/domain/src/criteria.ts`. They target the stated
95th-percentile line, but the item scale has not been calibrated against
children. Do not interpret the probability as externally validated accuracy.

## Inspect an existing session

From `product/platform/`:

```bash
npm run show:sessions
npm run show:sheet -- <session-id>
npm run replay:session -- <session-id>
npm run audit:marking -- <session-id>
npm run what-if -- <session-id>
```

- `show:sheet` displays the current derived view.
- `replay:session` reconstructs the answer-by-answer path and when the result became decidable.
- `audit:marking` independently compares stored marking with the revisioned key.
- `what-if` reports how many changed outcomes would have altered the recommendation.

These are maintainer operations. They require access to the appropriate local or
AWS data stores and are not exposed to ordinary app keys.

## Rescore after a correction

The implemented item-revision path:

1. Revises the registry item.
2. Uses the item-to-session index to identify affected sessions.
3. Enqueues each session.
4. Rebuilds answered trace entries using current registry parameters.
5. Calls the same `computeSheet()` used by live scoring.
6. Writes a new timestamped sheet and updates the current materialized view.
7. Emits a deduplicated qualification event when appropriate.

The worker is
`product/platform/functions/rescore-worker/src/handler.ts`.

The original trace and prior sheets remain available. Rescoring must never
rewrite raw responses or erase a prior sheet.

## Re-evaluate after an engine or criteria change

Before changing measurement behavior:

1. Classify whether the change affects marking, item parameters, posterior
   updates, selection, stopping, recommendation, or GT criteria.
2. Bump `ENGINE_VERSION` for scoring or stopping behavior changes.
3. Create a new criteria version for policy-threshold changes.
4. Preserve the old implementation and criteria long enough to reproduce prior results.
5. Replay frozen traces under both old and proposed rules.
6. Report probability shifts, recommendation flips, GT-criteria flips, and unaccounted items.
7. Run fixed-seed cohort measurement and the real handler path.
8. Obtain the GT measurement owner's approval before updating current sheets.
9. Store the new result as another sheet version; never replace history silently.

The current repository stamps engine and criteria versions, but criteria are
defined in code and no bulk engine/criteria shadow-rescore tool or public
endpoint is implemented. A maintainer must build and review that process before
using changed engine or criteria rules on historical sessions. Any future
implementation should preserve the trace and append-only sheet model rather
than creating a second scoring path.

## Changes that do not require rescoring

- CSS, copy, layout, sound, or game-world changes that leave the item and response unchanged.
- Deployment-hosting changes that do not alter content, marking, selection, or configuration.
- Documentation changes.

When uncertain, treat the change as score-affecting until trace replay proves
otherwise.
