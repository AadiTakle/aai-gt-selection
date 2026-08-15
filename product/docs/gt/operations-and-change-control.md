# Operations and Change Control

For the complete live/local/debug surface matrix, see
[Testing, demos, debug views, and live sites](testing-and-demos.md).

## Local setup

Install the two active Node projects independently:

```bash
cd product/screener
npm install

cd ../platform
npm install
```

Run the integrated local path:

```bash
cd product/platform
npm run ddb:start
npm run seed:bramblebrook
npm run dev:local
```

In another terminal:

```bash
cd product/screener
npm run sanctuary
```

The local platform runs the same route table and handlers used by the deployed
API. DynamoDB Local does not reproduce IAM, organization policies, or all
environment behavior, so successful emulation is necessary but not sufficient.

## Verification

Screener:

```bash
cd product/screener
npm run verify
npm run build
npx vite build --config vite.sanctuary.config.ts
```

Platform:

```bash
cd product/platform
npm test
npm run typecheck
npm run synth
```

The active root GitHub workflow remains `.github/workflows/verify.yml`. It runs
the screener verification and default web build. Platform and Sanctuary
verification must also be run before a handoff or deployment even where they are
not yet required GitHub checks.

## Sandbox deployment

AWS access uses the Superbuilders credential broker and the `sbsandbox` account.
The organization allows this platform in `us-east-1`.

Build Bramblebrook:

```bash
cd product/screener
npx vite build --config vite.sanctuary.config.ts
```

Deploy from the platform directory, preserving the existing stack names and
context:

```bash
cd product/platform
ORIGINS="https://d14xlnxxtsczg9.cloudfront.net,http://localhost:5230,http://127.0.0.1:5230,http://localhost:8420,http://127.0.0.1:8420,http://localhost:3100,http://127.0.0.1:3100,https://d284xy6sbvs9mb.cloudfront.net,http://localhost:8455,http://127.0.0.1:8455,https://d14n29hsrte7u8.cloudfront.net"
AWS_PROFILE=sbsandbox npm run deploy -- \
  -c web=../screener/dist-sanctuary \
  -c "origins=$ORIGINS"
AWS_PROFILE=sbsandbox npm run provision:aws -- --region us-east-1 --prefix GtQuestionPlatform
```

Do not omit `origins`. CDK otherwise uses its localhost-only default and the
next API deployment removes the live Bramblebrook, dashboard and review origins.

Before accepting a CloudFormation change:

- Inspect `cdk diff`.
- Reject unintended replacement of DynamoDB tables, answer-key storage, snapshot storage, KMS keys, queues, or API routes.
- Confirm the required CORS origins from `product/deployed-apps/README.md`.
- Verify an unkeyed protected route returns 401.
- Verify the keyed catalogue and one complete session.
- Verify each deployed static surface can reach the API.

No deployment is triggered by a git push.

## Change classes

- Documentation or organization: may change paths and prose, but not runtime behavior.
- Presentation: requires app build and visual verification.
- Question content: requires bank, renderer, compiler, and review checks.
- Marking or parameter: requires audit and affected-session rescoring.
- Engine or criteria: requires versioning, trace replay, cohort comparison, and GT approval.
- Infrastructure: requires synth, diff, sandbox deployment, and live smoke tests.

Keep each class in a separate pull request where practical so reviewers can tell
organizational changes from behavior changes.

## Repository-history policy

- Do not rewrite shared history to clean the tree.
- Use `git mv` for relocation.
- Preserve the pre-reset project under `archive/`.
- Preserve `brainlifting/` at the repository root without content edits.
- Tag a known-good state before a large reorganization or deployment.
- Perform high-risk work on an isolated branch or worktree.
- Do not force-push `main`.

For a path-only reorganization, verify that moved source blobs are identical and
that the diff contains only renames plus the explicitly approved path updates.

## Documentation freshness

Deployment status belongs in:

- `product/deployed-apps/README.md`
- `product/docs/gt/system-and-deployments.md`

Deep implementation history remains in the design and plan documents, but those
files may describe earlier states. Every route or schema claim in GT-facing
documentation should be checked against the current route registry and domain
types.

Avoid hardcoded test counts. Record commands and expected categories of checks,
then let the current test output report the count.

## Production promotion

The current resources are sandbox resources. Production promotion requires:

1. Approved `sbproduction` access.
2. A production bootstrap and deployment plan.
3. Environment-specific secrets, origins, app registrations, and snapshot pins.
4. Verified rollback for application assets and CloudFormation.
5. GT approval of measurement criteria and current calibration limitations.

Do not treat the sandbox deployment or its API keys as production configuration.
