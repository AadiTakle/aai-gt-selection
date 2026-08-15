# HTTP Integration

An application can run a complete platform-backed screening session without
importing repository code. The supported boundary is HTTPS plus an app key.
Applications must not read DynamoDB or answer-key storage directly.

## Provision an application

An AWS-authorized administrator:

1. Calls `POST /v1/admin/apps` using IAM SigV4.
2. Stores the returned app key; the plaintext key is shown once.
3. Approves question types with
   `PUT /v1/admin/apps/{appId}/types/{typeCode}`.
4. Supplies the API base URL and app key to the application through its deployment configuration.

Local and sandbox provisioning are also implemented by:

- `product/platform/scripts/seed-bramblebrook.ts`
- `product/platform/scripts/provision-aws.ts`

App keys are client credentials, not administrator credentials. Administrator
routes remain IAM-only.

## Runtime sequence

Set:

```bash
export GT_API_BASE="https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com"
export GT_APP_KEY="gtk_..."
```

### 1. Inspect the application catalogue

```bash
curl -sS \
  -H "x-api-key: $GT_APP_KEY" \
  "$GT_API_BASE/api/bank"
```

Additional catalogue queries:

```text
GET /v1/catalog/app
GET /v1/catalog/types
GET /v1/catalog/types?approved=true
GET /v1/catalog/types/{typeCode}
```

### 2. Create or resume a session

```bash
curl -sS -X POST \
  -H "content-type: application/json" \
  -H "x-api-key: $GT_APP_KEY" \
  -d '{"personaId":"external-persona-id","ageBand":"3-5"}' \
  "$GT_API_BASE/api/bank/sessions"
```

The platform resolves measurement settings from the registered app and freezes
them onto the session. A caller cannot override the server's gifted bar or
recommendation policy.

### 3. Request the next item

```text
GET /api/bank/sessions/{sessionId}/next
```

The response contains the item presentation, item metadata, and current state.
It never contains the answer key.

### 4. Submit an answer

```bash
curl -sS -X POST \
  -H "content-type: application/json" \
  -H "x-api-key: $GT_APP_KEY" \
  -H "idempotency-key: one-unique-value-per-answer" \
  -d '{"response":{"selectedKey":"A"},"latencyMs":1800}' \
  "$GT_API_BASE/api/bank/sessions/{sessionId}/answer"
```

Retry the same request with the same idempotency key after a network failure.
The platform conditionally completes a served response so evidence is not
counted twice.

### 5. Read the result

Continue `next` and `answer` until the state reports that the session has
stopped. The richer stored sheet is available at:

```text
GET /v1/sessions/{sessionId}/sheet
```

An application may explicitly abandon an active session:

```text
POST /v1/sessions/{sessionId}/abandon
```

## Contracts

- Route registry: `product/platform/functions/shared/src/routes.ts`
- Bank request/response types: `product/screener/packages/qbank/src/wire.ts`
- Generated bank OpenAPI:
  `product/docs/api/bank-engine.openapi.json`
- OpenAPI generator: `product/screener/packages/qbank/src/openapi.ts`

Regenerate the committed bank specification with:

```bash
cd product/screener
npm run api:spec
```

The `/v1/*` platform extensions are defined by the route registry and handlers;
they are not all represented in the bank OpenAPI document.

## Security boundaries

- Runtime routes require `x-api-key`.
- Administrator routes require AWS IAM SigV4.
- Session access is scoped to the app resolved by the authorizer.
- Answer keys are stored separately; the serving Lambda has no permission to read them.
- Raw posterior-debug routes are intentionally not exposed to client app keys.

## Operational queries not exposed over HTTP

Trace inspection, score-sheet history, marking audits, replay, and what-if
analysis currently use the scripts under `product/platform/scripts/` and the
store repository. They are maintainer operations, not client integration
requirements. See [Engine, scoring, traces, and rescoring](engine-scoring-and-rescoring.md).
