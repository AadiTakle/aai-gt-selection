# AWS Question Platform — Overnight Progress Ledger

Durable record of what is done, so an interrupted run can reconcile instead of repeating work.
**Read this first after any failure.**

**Branch:** `feat/aws-question-platform` (off `dev`)
**Spec:** `docs/design/aws-question-platform.md`
**Plan:** `docs/plans/aws-question-platform-implementation.md`
**Code:** `platform/` — see `platform/README.md`

## Status: all nine phases complete. 267 platform tests passing, `screener` still at 148.

Nothing has been deployed. No AWS resource has been created, read, or modified. No AWS credentials
exist on this machine.

## Hard invariants that held for this run

1. **No AWS calls.** `cdk synth` only. Verified: the stacks are account-agnostic and perform no context
   lookups, and synth completed with no credentials present.
2. **No edits under `screener/`, `qbank-library/`, or `archive/`.** The platform imports from them.
   `screener` tests still pass at their baseline 148.
3. **No commits to `dev`.** Everything is on `feat/aws-question-platform`.
4. **DynamoDB Local on 8456** (see the port note below).

## Phase status

| # | Phase | Status | Commit | Tests |
|---|---|---|---|---|
| 0 | Spec, plan, ledger | done | `3e31d21` | — |
| 1 | `platform/` workspace scaffolding | done | `784cde0` | — |
| 2 | `@platform/domain` | done | `784cde0` | 23 |
| 3 | `@platform/scoring` | done | `99e2b4a` | 26 |
| 4 | `@platform/selection` | done | `7af60a4` | 55 |
| 5 | `@platform/catalog` | done | `68cca56` | 42 |
| 6 | `@platform/store` | done | `68cca56` | 50 |
| 7 | Handlers, shared layer, end-to-end | done | `898d4f7`, `3b150b7` | 17 + 29 |
| 8 | CDK stacks and synth | done | `22b5fa0` | 25 |
| 9 | Variety simulation against the real catalog | done | this commit | — |

## Bugs and wrong assumptions found by building it

Recorded because each one was a belief that survived review and died on contact with a test.

1. **Admin routes were public.** `api-stack.ts` wired the four `/v1/admin/*` routes to
   `HttpNoneAuthorizer` while the comment above them claimed IAM SigV4. That would have shipped an
   unauthenticated catalog-publish endpoint. Now `HttpIamAuthorizer`, asserted by a template test.
2. **`approveType` read the filesystem.** It re-derived UI requirements with `planFor`, which reads
   `qbank-library/banks/<typeCode>.jsonl` — a path a deployed Lambda does not have. It now reads the
   requirement frozen onto the registry row at publish time, which is also the more correct source.
3. **The scoring tests were wrong, not the engine.** Six failures came from expecting confidence from
   easy items answered correctly. P(correct) is near one on both sides of a high threshold, so the
   likelihood ratio is flat and the posterior barely moves. The engine was right to refuse the
   inference; a test now pins that behaviour.
4. **Proportional exposure damping is too weak.** Halving an over-exposed item's score still leaves it
   the best choice near the threshold. Measured 0.425 maximum exposure against a 0.20 target on a
   120-item pool. `exposureDampingExponent` was added, defaulting to 3.
5. **`openingJitterLogits: 0` did not disable the opening layer.** It fell through to a random draw over
   the whole pool, so "variety off" was still random. A control test now asserts that disabling every
   layer reproduces the deterministic argmax exactly.
6. **Tagging lived in the entry point.** `Tags.of(app)` in `bin/platform.ts` meant any other entry point
   — including the tests — produced untagged resources. Moved into the stacks.
7. **`TableV2` with a customer-managed key cannot render region-agnostic.** The region is now explicit,
   defaulting to `us-east-2` rather than `us-east-1`, which also settles spec §17.6 and adds one more
   layer of separation from the live archive.
8. **Node 20 was already deprecated.** Deprecated 2026-04-30, creation disabled from 2027-02-01, so the
   plan's own runtime guidance was stale. Now `nodejs24.x`. `logRetention` is likewise deprecated and
   was replaced with explicit log groups.
9. **Port 8010 was contested.** An ssh port-forward and a stray Python server were both bound to it, so
   a client connected happily and then got `{"detail":"Method Not Allowed"}` from the wrong process,
   surfacing as an unparseable SDK error. DynamoDB Local moved to 8456 and readiness is now proved with
   a real `ListTables` call.
10. **Two spec numbers were wrong.** The selection index is 1.29 MB of JSON / 134 KB gzipped, not the
    estimated 550 KB. And 21 types have no scorable items, not 20: `QUANT-GLYPHNUM-01` has 391 items and
    needs a solver for every one.

## Design decisions taken during implementation, beyond the spec

1. `SelectionCandidate`, `AnswerKeyRecord`, `SnapshotRecord`, `OutboxEvent` live in `@platform/domain`
   (`candidate.ts`), so the compiler and the store need no dependency on the selection algorithm. This
   made phases 3–6 mutually independent.
2. `evaluateCriteria` takes a `MultiPosterior`, not a finished `ScoreSheet`, because criteria carry their
   own ability threshold which need not be the session's.
3. `SheetInput` gained `threshold` and `domainsAvailable`. The second stops a domain with no scorable
   items holding the stop rule open forever.
4. Approved types are read live rather than frozen onto the session, while everything else in
   `resolvedConfig` is frozen. Revoking a broken type has to take effect on the next question.
5. `serve` writes the response row at serve time in `served` state. Abandonment becomes visible, and the
   conditional update on `state` gives idempotent scoring for free.
6. Exhaustion is discovered and recorded by `serve`, so `score` never reasons about it.
7. `toServedQuestion` deep-scrubs answer-shaped keys from item content, as a second net behind the
   registry's structural exclusion of answers.
8. Client-supplied precision overrides are not accepted. The app config owns the stop rule; letting a
   client weaken it would let a client decide how confident the platform has to be.
9. `randomesqueK` defaults to 6 rather than 3, measured (spec §9.2.1).

## Known open item

One test failed once during a full-suite run and did not reproduce across four subsequent full runs
(`242 passed` each time, then `267 passed` after the infra suite landed). The failure was not captured
before it cleared, so its cause is unknown. Most likely a first-run race between the store and handler
suites both creating tables in DynamoDB Local. Worth watching; if it recurs, capture the name and give
each suite its own container.

## External effects log

Nothing outside this repository has been mutated. No AWS resource has been created, read, or modified.
No package has been published. Network access was limited to npm installs and the `amazon/dynamodb-local`
Docker image pull. One read-only HTTP GET was made to the archive's live App Runner URL to confirm it is
in use, before any work began.
