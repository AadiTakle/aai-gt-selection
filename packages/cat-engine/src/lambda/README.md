# Scoring Lambda handler (D-019)

A thin, **pure, deterministic** AWS Lambda wrapper around the `@gt-selection/cat-engine`
scoring + deterministic-replay engine. It realizes decision **D-019** (exam
scoring + deterministic-replay Lambda) in-repo. It has **no** web, DB, network,
or AWS-SDK dependency and introduces no wall-clock or unseeded randomness, so the
exact same code path runs identically in local dev and (later) in Lambda — the
basis of the E-072 replay guarantee.

Everything produced is **born-synthetic**: `synthetic_only=true`, `validated=false`
(D-006, R9). A screening result is not an admission decision and is not evidence
of program impact (R10).

## Event contract

```ts
type ScoringLambdaEvent = {
  mode: 'score' | 'replay-verify' | 'replay-match';
  input: ReplayInput;              // { log, items, policy, seed, domains?, confidenceIterations? }
  expectedFingerprint?: string;    // required only for 'replay-match'
};
```

Response (discriminated on `ok` + `mode`):

- `mode:'score'` -> `{ ok: true, mode, result, fingerprint }`
- `mode:'replay-verify'` -> `{ ok: true, mode, verification, fingerprint }`
- `mode:'replay-match'` -> `{ ok: true, mode, matches }`
- any validation error / bad mode / engine throw -> `{ ok: false, error }` (deterministic string, no stack)

## Invoke locally

From the package directory (`packages/cat-engine`):

```bash
tsx src/lambda/invoke-local.ts src/lambda/sample-event.json
# or pipe an event on stdin:
cat src/lambda/sample-event.json | tsx src/lambda/invoke-local.ts
# or via the package script:
pnpm invoke:local src/lambda/sample-event.json
```

It prints the JSON response; a `mode:'score'` run yields an `ok:true` payload
with a 16-hex `fingerprint`. `sample-event.json` is a tiny born-synthetic example.

## Dormant deploy

This change is **only** the portable handler + local harness. The remaining
D-019 follow-ups — Terraform, IAM roles/policies, Lambda packaging/bundling, and
any cloud/network wiring — are intentionally **not built here** and remain
dormant. Nothing in this directory reaches the network or requires AWS
credentials to run or test.
