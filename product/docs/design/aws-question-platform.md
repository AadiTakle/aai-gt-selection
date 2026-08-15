# AWS Question Platform — Design

**Status:** Approved for implementation, 2026-08-10. Not deployed.
**Branch:** `feat/aws-question-platform`
**Supersedes nothing.** Additive to `docs/design/screener-library-design.md` and
`docs/design/ui-agnostic-assessment-system.md`, which state the principles this design implements.

---

## 1. What this is

Four capabilities, moved out of the local Express prototype and onto AWS so that any number of
apps — web screeners, Roblox experiences, embedded game front doors — can share one measurement
engine:

1. **A question-type and item registry.** Immutable, versioned, headless. Serves item content and
   the UI capabilities a renderer needs, never answer keys.
2. **An ability scoring engine.** Takes a session and one response, returns the updated score
   sheet: per-domain ability estimates with credible intervals, plus a composite.
3. **A question serving engine.** Takes a session, returns the next question chosen to reduce
   uncertainty fastest, restricted to what the calling app is approved to serve, and varied enough
   that two children do not sit the same test.
4. **Durable storage.** Append-only traces from which any score sheet can be reconstructed, so a
   corrected item difficulty can be propagated through every session that ever saw that item.

### Non-goals

- No UI. The platform emits item content and a declaration of what rendering it requires. Drawing
  it is the app's job.
- No score, percentile, or IQ estimate exposed to a family. The platform returns a decision and a
  probability with a band. This is a product constraint from
  `brainlifting/talent-screening-brainlift/brainlift-talent-screening.md` SPOV 2, not a technical one.
- No admissions decision. A recommendation to apply, or silence.
- **No COPPA consent flow in this phase.** See §12.

---

## 2. Constraints

| Constraint | Consequence |
|---|---|
| The archive App Runner service `gt-web` (us-east-1) is live and in use | New, separate AWS account. No shared IAM, VPC, database, or Supabase project. Zero references to archive resources in the CDK app. |
| `screener/` runs a working local demo with 148 passing tests | The platform **imports** from `screener/packages/*` and modifies nothing there. |
| Nothing is calibrated against real children | Item parameters are declared, not estimated. Every response record stores the parameters in force at serve time so recalibration can be replayed. |
| Contact information is limited to a guardian email | PII lives in its own table with its own KMS key and its own retention. The measurement trace holds only a pseudonymous persona ID. |
| Future question families (the 106 reviewed CogAT archetypes) will be added | The registry supports additions without migration. Type domain is an explicit field, not a prefix heuristic. |

---

## 3. What already exists

Grounding, so the plan does not rebuild working code.

| Capability | Where | Reuse |
|---|---|---|
| 3PL item response function, Fisher information | `screener/packages/engine/src/irf.ts` | Imported verbatim |
| Grid Bayesian posterior over θ ∈ [−4, 4], step 0.05 | `screener/packages/engine/src/posterior.ts` | Imported verbatim, composed per domain |
| Bank record schema, difficulty rescale, response scoring | `screener/packages/qbank/src/bank.ts` | Imported; `toLogits`, `scoreResponse`, `domainOf` |
| Answer-key stripping | `bank.ts` `toServed()` | Kept, and reinforced by an IAM boundary |
| Max-information-at-threshold selection, asymmetric stop rule | `screener/packages/qbank/src/session.ts` | Logic reused, selection replaced (§9) |
| UI capability derivation, 17-element vocabulary | `screener/packages/ui-contract/src/` | Imported; compiled into the registry |
| 53 type codes, 7,319 items, 4,534 scorable | `qbank-library/banks/*.jsonl` | Ingested at publish time |

Two facts that shape the design:

- **2,785 of 7,319 items cannot be scored.** 1,774 need a computed solver, 891 have no answer key,
  120 are deferred to model judgment. **Twenty-one of the fifty-three types have zero scorable
  items** — every `WM-*`, every `GB-*`, and `QUANT-GLYPHNUM-01` among them, the last because all 391
  of its items need a solver. The registry records scoring mode per item and the serving engine will
  not offer what it cannot mark. All of these counts are asserted against the real banks by the
  catalog compiler's test.
- **`b = (difficulty − 10.5) / 3` is a rescale, not a calibration.** Discrimination is fixed at 1.5
  and the guessing floor is pinned to 1/options. Fisher-information optimality is therefore optimal
  with respect to an assumption. §11 makes that assumption replaceable.

---

## 4. Architecture

```
                       ┌───────────────────────────────────────────┐
   apps (web, Roblox)  │  API Gateway HTTP API + Lambda authorizer │
   ──────────────────► │  (resolves appId from hashed API key)     │
                       └───────────────┬───────────────────────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────────┐
        ▼              ▼               ▼               ▼                  ▼
   ┌─────────┐   ┌──────────┐    ┌─────────┐    ┌─────────┐      ┌───────────────┐
   │ catalog │   │  serve   │    │  score  │    │  admin  │      │rescore-worker │
   │ (read)  │   │(no key   │    │(only key│    │(publish,│      │ (SQS-driven)  │
   │         │   │ access)  │    │ reader) │    │ register)│     │               │
   └────┬────┘   └────┬─────┘    └────┬────┘    └────┬────┘      └───────┬───────┘
        │             │               │              │                   │
        │        ┌────▼───────────────▼──────────────▼───────────────────▼────┐
        └───────►│  DynamoDB  gt-platform  (single table, 6 GSIs)             │
                 └────┬───────────────────────────────────────────────────────┘
                      │            ┌──────────────────────────┐
                      │            │ gt-answer-keys           │◄── score, admin only
                      │            └──────────────────────────┘
                      │            ┌──────────────────────────┐
                      │            │ gt-personas (own KMS key)│◄── score, notifier, admin only
                      │            └──────────────────────────┘
                      │
                 ┌────▼─────────────────┐      ┌──────────────────────────────┐
                 │ S3 gt-catalog-        │      │ DynamoDB Streams → EventBridge│
                 │ snapshots/<id>.json.gz│      │ → SQS → notifier             │
                 └───────────────────────┘      └──────────────────────────────┘
```

### 4.1 Five functions, split by permission

Splitting by IAM profile rather than by convenience buys one guarantee the current prototype cannot
make: **`serve` has no IAM permission on the answer-key table**, so an answer key cannot leak
through the serving path even if the code is wrong. Today `toServed()` strips the key inside the
same process that holds it.

| Function | Reads | Writes | Notes |
|---|---|---|---|
| `catalog` | `gt-platform` types, apps, snapshots | — | Public read via app key |
| `serve` | `gt-platform`, S3 snapshots | session, response (`served` state), exposure counters | **No** answer-key access |
| `score` | `gt-platform`, `gt-answer-keys` | response (`answered`), score sheet, outbox | Only key reader on the request path |
| `admin` | everything | registry, apps, snapshots | Separate authorizer, IAM-signed |
| `rescore-worker` | `gt-platform`, `gt-answer-keys` | score sheets, outbox | SQS-driven, no public route |

### 4.2 Immutable published snapshots

The registry in DynamoDB is the mutable authoring surface. **Publishing compiles an immutable
snapshot**: a compact selection index written to `s3://gt-catalog-snapshots/<snapshotId>.json.gz`
containing only what selection needs — item ID, item revision, type code, domain, `b`, `a`, `c`,
option count, age bands, reading band, scoring mode. Measured against the real banks: **1.29 MB of
JSON, 134 KB gzipped, for 4,534 items.** So `serve` loads it once per execution environment and
caches it in module scope. Selection then runs in memory with zero database reads, and only the
chosen item's content is fetched.

Every session pins a `snapshotId`, so publishing cannot alter a session in flight. This is the
principle `docs/design/screener-library-design.md` already states — "authoring is mutable, serving
is immutable" — and `SessionRecord` already carries a `snapshotId` field.

**Rejected alternatives.** *Query-per-request from DynamoDB* costs several reads per question,
makes global exposure control awkward, and trades whole-pool optimality for latency and spend on the
hot path. *Precomputed ranked candidate lists* is faster still, but information depends on the
running per-domain posterior, so precomputation can only approximate.

### 4.3 Infrastructure as code

AWS CDK v2 in TypeScript. `NodejsFunction` bundles via esbuild, importing the existing `@gt/engine`,
`@gt/qbank`, and `@gt/ui-contract` workspace packages directly into the artifact. No package
publishing, no CodeArtifact, and no second copy of the psychometrics — the Lambda runs the same
`Posterior` and `information()` the existing 23 engine tests cover.

The stack is environment-agnostic and performs no context lookups, so `cdk synth` produces
reviewable CloudFormation with no AWS credentials. Terraform was rejected: a second toolchain, and
`archive/infra/*.tf` is documented as non-functional. Python Lambdas were rejected: two divergent
implementations of the same IRT model.

---

## 5. Type codes and versioning

### 5.1 Format

`AREA-FAMILY-VV`, e.g. `FLU-MATRIX-01`, `WM-corsi-01`, `CX-achieve-02`.

- **Family** is everything before the final hyphen: `FLU-MATRIX`, `WM-corsi`.
- **Version** is the final segment, zero-padded to two digits, parsed as an integer.
- The code is the primary key and is stored **verbatim**, never normalized, because these strings are
  filenames on disk and casing is inconsistent (`WM-corsi-01`, `CX-achieve-02`).
- Family comparison for "latest version of this family" is **case-insensitive**.

### 5.2 Rules

1. A type record is written once and never updated. There is no update path in the `admin` API.
2. A change to a type creates a new record at the next version in the family. `FLU-MATRIX-01` →
   `FLU-MATRIX-02`. Both exist forever. Sessions that used `-01` remain interpretable.
3. Lifecycle changes append a `LIFECYCLE#<timestamp>` record rather than mutating the type. Current
   status is the newest lifecycle event. Statuses: `active`, `deprecated`, `superseded`. Transitions
   are forward-only.
4. **Domain is an explicit field on the type record**, not derived from the prefix. The existing 53
   are seeded from `domainOf()`, but a future CogAT code such as `VA-01` would fall through that
   heuristic to `fluid` when it is verbal. Explicit beats clever.
5. Deletion does not exist. Nothing in the API can remove a type or an item.

### 5.3 Items are revisioned, not immutable

Your item-correction scenario requires mutable difficulty. So:

- `TYPE#<code> / ITEM#<itemId>` holds current parameters at `revision: N`.
- `TYPE#<code> / ITEMREV#<itemId>#<N>` preserves every prior state.
- **Every response records `(itemId, itemRevision, a, b, c)` as served.** Without that, a recompute
  cannot distinguish "this child got it wrong" from "we later decided the item was harder".

---

## 6. Data model

One table `gt-platform` with `PK`/`SK`, plus two separate tables for the isolation reasons in §4.1.
Billing is on-demand, so idle cost is storage only. Point-in-time recovery on.

### 6.1 Entities

| Entity | PK | SK | Mutability |
|---|---|---|---|
| Question type | `TYPE#<code>` | `META` | Write once |
| Type lifecycle event | `TYPE#<code>` | `LIFECYCLE#<iso>` | Append only |
| Bank item (current) | `TYPE#<code>` | `ITEM#<itemId>` | Revisioned in place |
| Bank item revision | `TYPE#<code>` | `ITEMREV#<itemId>#<rev>` | Write once |
| Item statistics | `TYPE#<code>` | `STAT#<itemId>` | Atomic counters |
| App config | `APP#<appId>` | `META` | Mutable |
| App approved type | `APP#<appId>` | `TYPE#<typeCode>` | Mutable, per row |
| App API key | `APP#<appId>` | `KEY#<sha256>` | Mutable, rotatable |
| Catalog snapshot | `SNAPSHOT#<snapshotId>` | `META` | Write once |
| Gifted criteria | `CRITERIA#<version>` | `META` | Write once |
| Session | `SESSION#<sessionId>` | `META` | Status transitions only |
| Response | `SESSION#<sessionId>` | `RESP#<ordinal:04>` | Written at serve, completed at answer |
| Score sheet (current) | `SESSION#<sessionId>` | `SHEET#CURRENT` | Overwritten |
| Score sheet (history) | `SESSION#<sessionId>` | `SHEET#<iso>` | Append only |
| Outbox event | `OUTBOX#<yyyy-mm-dd>` | `EVT#<ulid>` | Append only, TTL 30d |

### 6.2 Key attributes

**Question type** — `typeCode`, `family`, `version`, `domain`, `title`, `cogatAlignment`,
`uiRequirement` (elements, counts, readingBand, from `@gt/ui-contract`), `scoringModes` present,
`itemCount`, `scorableCount`, `difficultyRange`, `ageBands`, `createdAt`, `sourceRef`.

**Bank item** — `itemId`, `typeCode`, `revision`, `domain`, `difficulty` (1–20 authoring scale),
`b` (logits), `a`, `c`, `optionCount`, `ageBands`, `scoringMode`, `content` (no answer),
`syntheticOnly`, `validated`, `calibrated`, `provenance`, `updatedAt`, `updatedBy`, `changeReason`.

**App config** — `appId`, `name`, `surfaceKind`, `status`, `abilityThreshold`,
`recommendProbability`, `precision` (`confidenceAbove`, `confidenceBelow`, `minItems`, `maxItems`),
`perDomainMinimum`, `ageBands`, `uiCapabilities` (which of the 17 elements it can render),
`maxReadingBand`, `allowSyntheticItems`, `pinnedSnapshotId` (nullable — null means follow latest),
`varietyConfig` (§9.3), `piiPolicy` (`none` | `guardian_email`), `retentionDays`, `webhookUrl`,
`ownerContact`, `createdAt`.

Because the app declares `uiCapabilities`, the platform can **validate** an approved type list
against `@gt/ui-contract`'s `servableBy()` rather than trusting it. Approving a type the app cannot
render is rejected at the `admin` boundary.

**Session** — `sessionId`, `appId`, `personaId` (nullable), `snapshotId`, `engineVersion`,
`criteriaVersion`, `resolvedConfig` (the app config as it was at start), `rngSeed`, `ageBand`,
`startedAt`, `endedAt`, `status` (`active` | `stopped` | `abandoned`), `stopReason`, `decision`.

Freezing `resolvedConfig` at start means an app config edit mid-session cannot change the rules a
child is being measured under.

**Response** — `sessionId`, `ordinal`, `state` (`served` | `answered` | `expired`), `itemId`,
`itemRevision`, `typeCode`, `domain`, `difficulty`, `bAtServe`, `aAtServe`, `cAtServe`,
`optionCount`, `rawResponse`, `correct` (`true` | `false` | `null`), `latencyMs`, `metrics`
(optional telemetry the catalogue renderers already emit: revisions, focus losses), `selection`
(reason, information at threshold, candidate pool size, K used), `idempotencyKey`, `servedAt`,
`answeredAt`.

Writing the record at **serve** time rather than answer time means abandonment is captured for free,
and exposure counting does not depend on the child finishing.

### 6.3 Indexes

| Index | PK | SK | Serves |
|---|---|---|---|
| `GSI1` | `ITEM#<itemId>` | `SESSION#<sessionId>#<ordinal:04>` | **Every session that saw an item.** The item-correction backfill. |
| `GSI2` | `PERSONA#<personaId>` | `<startedAt>#<sessionId>` | A persona's session history; cross-session item avoidance |
| `GSI3` | `APP#<appId>#<yyyy-mm>` | `<startedAt>#<sessionId>` | Per-app operations. Month-bucketed to avoid a hot partition |
| `GSI4` | `QUALIFIED#<criteriaVersion>` | `<decidedAt>#<sessionId>` | **Sparse.** Written only when a sheet crosses the bar, so "who newly qualified" never scans |
| `GSI5` | `SNAPSHOT#<snapshotId>` | `SESSION#<sessionId>` | Which sessions used a snapshot; blast radius of a bad publish |
| `GSI6` | `NETHINT#<sha256(ip+dailySalt)>` | `<startedAt>#<sessionId>` | Weak cross-session linkage hint. TTL 90d. Never an identity — see §12 |

### 6.4 The two separate tables

**`gt-answer-keys`** — `PK=ITEM#<itemId>`, `SK=REV#<revision>`. Holds `correctKey`,
`distractorRationales`, solver reference, and scoring-mode detail. Readable only by `score`,
`admin`, and `rescore-worker`. `serve` has no policy statement naming it.

**`gt-personas`** — own table, own KMS customer-managed key.
- `PERSONA#<personaId> / META` — pseudonymous: `createdAt`, `locale`, `firstSeenAppId`. No PII.
- `PERSONA#<personaId> / CONTACT` — `guardianEmail`, `collectedFrom` (`guardian`), `consentRef`,
  `collectedAt`, TTL from the app's `retentionDays`. Encrypted at rest under the dedicated key.
- Schema reserves `robloxUsername` and `childFirstName`, both feature-flagged off (§12).

Deleting `CONTACT` satisfies an erasure request while leaving the measurement trace whole, because
the trace references only `personaId`.

---

## 7. The score sheet

```ts
type DomainName = 'quantitative' | 'verbal' | 'spatial' | 'fluid';

interface DomainEstimate {
  readonly domain: DomainName | 'composite';
  readonly mean: number;              // posterior mean, logits
  readonly sd: number;
  readonly interval: readonly [number, number];   // 90% central credible interval
  readonly pAboveThreshold: number;
  readonly itemsScored: number;
  readonly itemsUnscorable: number;
  readonly informationAccumulated: number;
}

interface ScoreSheet {
  readonly sessionId: string;
  readonly engineVersion: string;      // pins the algorithm that produced this
  readonly criteriaVersion: string;
  readonly snapshotId: string;
  readonly computedAt: string;
  readonly composite: DomainEstimate;
  readonly domains: Readonly<Record<DomainName, DomainEstimate>>;
  readonly itemsServed: number;
  readonly stopped: boolean;
  readonly stopReason: StopReason | null;
  readonly decision: 'recommend' | 'no-recommendation' | null;
  readonly meetsCriteria: boolean;
  readonly derivedFromResponseCount: number;   // reconciles a sheet against its trace
}
```

**Composite semantics.** The composite is its own `Posterior` updated by *every* scored response,
which is exactly what the current pooled posterior is. Each domain gets a separate `Posterior`
updated only by its own items. The composite is therefore bit-identical to today's engine output:
per-domain estimates are purely additive, and the existing engine tests remain the guarantee.

**Stored, with the trace as truth.** The sheet is a materialized view. It is stored because a result
screen should be one read, because gifted-criteria queries need an indexable value, and because
"what did we tell this family, and when" must be auditable when a recompute changes a decision. The
trace remains authoritative: `SHEET#CURRENT` can always be rebuilt and `derivedFromResponseCount`
detects a stale one.

---

## 8. Scoring engine

**Session ID in, full sheet out.** A client-supplied score sheet is forgeable, and in a system where
crossing a threshold triggers real outreach to a real family, accepting a sheet from a Roblox client
means anyone can manufacture a gifted determination.

The function **rebuilds the posterior from the trace on every call.** Each response updates exactly
two posteriors — its own domain and the composite — so replaying a 40-item session over a 161-point
grid costs about 12,900 multiply-adds. Microseconds. The payoff is that live scoring and historical
recompute are *literally the same function*, so a backfill cannot drift from production behaviour.

### 8.1 Contract

```
POST /v1/sessions/{sessionId}/responses
  headers: x-api-key, idempotency-key
  body: { servedToken, response, latencyMs, metrics? }
  → 200 { sheet, next: { available: boolean }, stopped, stopReason?, decision? }
```

`servedToken` is an HMAC over `(sessionId, ordinal, itemId, itemRevision, expiry)`, issued by
`serve`. It binds a response to the exact item and revision served, so `score` never trusts a
client-supplied item ID.

**Idempotency.** The response record is written at serve time in `served` state. Scoring performs a
conditional update `state = 'served'`. A retry therefore fails the condition and returns the stored
result rather than double-counting evidence into the posterior. This is the difference between a
retry being harmless and a retry silently corrupting an ability estimate.

**Unscorable responses.** A response the platform cannot mark increments `itemsUnscorable` and does
not touch the posterior, matching current behaviour. Guessing would put invented evidence into the
estimate.

### 8.2 Stop rule

Unchanged from `QbankSession`: asymmetric confidence on the composite, gated on per-domain minimums,
capped by `maxItems`. Asymmetry is preserved at every precision setting because a missed candidate
costs more than a wasted application.

---

## 9. Serving engine

```
POST /v1/sessions            → { sessionId, snapshotId, engineVersion, sheet }
GET  /v1/sessions/{id}/next  → { item, typeCode, domain, difficulty, uiRequirement,
                                 servedToken, selection: { reason, informationAtThreshold,
                                 candidatePoolSize, k } }
```

`item` is a `ServedItem`: no answer, no scoring block, no provenance.

### 9.1 Eligibility, in order

1. Items in the session's pinned snapshot.
2. Types the app has approved **and** whose lifecycle status is `active`.
3. `scoringMode === 'deterministic_key'`. The platform does not serve what it cannot mark.
4. Age band overlaps the session's band.
5. Reading band within the app's `maxReadingBand`.
6. `syntheticOnly` excluded unless the app sets `allowSyntheticItems`.
7. Not already served in this session.
8. Not served in this persona's previous `N` sessions (default 2), via `GSI2`.

### 9.2 Variety, in eight layers

The current engine is deterministic argmax over a fixed pool, which is precisely why every session
looks alike.

1. **Seeded RNG.** Every stochastic choice derives from `hash(rngSeed, ordinal)`, so sessions differ
   from each other and a single selection is reproducible from its inputs.

   **Reproducing a whole session needs the seed and the exposure state it ran against**, not the seed
   alone. Exposure damping reads counters that earlier sessions moved, so the same seed replayed
   against a different cohort history legitimately yields a different sequence. This is stated
   precisely because an earlier draft of this design claimed the seed was sufficient, and a test
   written against that claim failed every time. Exact replay holds for pure selection given identical
   inputs, and for a whole cohort replayed from scratch.
2. **Randomesque.** Sample from the top-K by information rather than taking the max. K is wide early
   — when the posterior is broad, information differences between candidates are numerically
   trivial — and tapers to 3. Default `K = max(3, ceil(0.10 × eligible))` for the first three items,
   then 3.
3. **Information-proportional sampling** within the band, so a marginally better item is not
   effectively guaranteed.
4. **Same-type damping.** Multiply information by `1 / (1 + timesTypeServed)`. Eight `FLU-MATRIX`
   items in a row measures `FLU-MATRIX`, not fluid reasoning, so this serves construct validity as
   much as variety.
5. **Domain interleaving.** Avoid a consecutive same-domain item when an alternative sits within
   10% information.
6. **Exposure control.** Per-item served counters, damping items whose exposure rate exceeds a
   target. Exposure rate is `item.servedCount / app.sessionCount` for the app in question, both
   maintained as atomic counters; the default target is 0.20, meaning no item should appear in more
   than a fifth of an app's sessions. Damping multiplies information by
   `min(1, (target / observedRate) ^ exposureDampingExponent)`.

   The exponent is not decoration. Proportional damping — exponent 1, which is what an earlier draft
   of this design specified — halves the score of an item running at twice its target, and
   measurement over 1,000 simulated sessions showed that is far too weak: because information peaks
   sharply around the threshold, a handful of items remain the best available choice even at half
   weight, and observed maximum exposure settled at **0.425 against a 0.20 target**. Raising the
   ratio to a power converts a soft preference into an effective ceiling. Measured on a 120-item
   fixture: exponent 1 gives 0.425, exponent 2 gives 0.327, **exponent 3 gives 0.304** (the default),
   exponent 4 gives 0.278, exponent 6 gives 0.249.

   This spreads bank usage, which matters for item security, and means items accumulate enough
   responses to eventually be calibrated. An item served three times never will be.
7. **Randomized opening.** The first item is drawn from a difficulty band around the prior
   (`threshold ± 0.5` logits), weighted by inverse exposure, with a seeded domain rotation — rather
   than the single global argmax that currently makes every session start on the same question.
   Setting `openingJitterLogits` to zero disables this layer and falls through to ordinary
   selection, so that turning every setting off really does yield a deterministic engine. Coverage
   outranks this layer: a blueprint minimum the stop rule depends on is not negotiable for the sake
   of a livelier first question.
8. **No repeats** within a session, and none across a persona's recent sessions (§9.1).

### 9.2.1 What the layers are worth, measured

Against the **real compiled catalog** — 4,534 scorable items across the 32 types that have any — with
1,000 simulated children drawn from a standard normal, answering per the same 3PL the engine scores
with. `platform/scripts/simulate-variety.ts` produces this table.

Re-measured on 2026-08-10 after two corrections: the catalog now holds 4,934 scorable items, and item
parameters come from the engine's `paramsForRecord` rather than a local derivation that assumed four
options (which was wrong for 818 of them). 400 children.

| Property | Deterministic argmax | With variety (defaults) |
|---|---|---|
| Mean items to a decision | 9.97 | 10.15 |
| **Accuracy against the child's true ability** | 0.932 | **0.945** |
| Sensitivity / specificity | 0.741 / 0.962 | **0.796** / **0.968** |
| Distinct opening items across 400 sessions | **1** | 285 |
| Most common opening, as a share of sessions | **100%** | 1.5% |
| Highest exposure rate of any item | **1.000** | 0.200 |
| **Distinct items the whole cohort touched, of 4,934** | **16** | 560 |
| Adjacent pairs repeating a domain | **37.7%** | 0.0% |
| Largest share of a session taken by one type | **50.3%** | 10.7% |

**Variety is now better than free, not merely close to it.** With the guessing floors corrected it beats
the deterministic engine on accuracy against known ability, 0.945 against 0.932, and on sensitivity,
0.796 against 0.741. The reason is that correcting the floors made probe-set and cell-set items far more
informative than they had been claimed to be, and an argmax that fixates on sixteen items never reaches
them while a sampled band does.

The first column is the honest statement of the problem, and it is worse than "sessions look alike."
A thousand children between them see **sixteen questions**. One item appears in every session. One
question type fills three fifths of a session, which means that type — not the domain it belongs to —
is what the session measures.

**Variety is close to free.** It costs about 0.2 items per decision, and it classifies true ability
exactly as well as the deterministic engine: 0.920 against 0.920. Agreement between the two policies
is 0.948, but that is two policies being noisy in different directions near the threshold rather than
one being worse, which is why accuracy against known ability is the number reported and agreement is
reported beside it rather than instead of it.

**Two findings worth carrying elsewhere.**

*Sensitivity is the weak side.* Every policy sits near 0.80 sensitivity against 0.94 specificity: the
screener misses roughly one in five truly-above children. That is the asymmetry
`brainlifting/talent-screening-brainlift` SPOV 3 says is the first obligation to measure, and it is a
consequence of the recommendation probability and item budget rather than of the selection policy.
Raising sensitivity is a threshold and length decision, not a variety decision.

*Same-type damping costs a little accuracy and buys construct validity.* Switching it off measured
0.921 accuracy against 0.914 at the default, within sampling noise, while the largest share of a
session taken by one type jumped from 10.5% to 26.4%. It stays on: a session that is a quarter one
type is measuring that type.

### 9.3 The cost of variety, and how it gets set

Every unit of variety costs measurement efficiency. Randomesque with a wide K measurably lengthens
sessions. So these are per-app `varietyConfig` values, and defaults are chosen by running the
existing `screener` simulation harness to measure items-per-decision and decision agreement against
the deterministic baseline — not by guessing.

```ts
interface VarietyConfig {
  readonly randomesqueK: number;              // 6, measured (§9.2.1)
  readonly earlyKFraction: number;            // 0.10
  readonly earlyItemCount: number;            // 3
  readonly sameTypeDamping: boolean;          // true
  readonly domainInterleaveTolerance: number; // 0.10
  readonly targetExposureRate: number;        // 0.20, zero disables
  readonly exposureDampingExponent: number;   // 3, see below
  readonly openingJitterLogits: number;       // 0.5, zero disables
  readonly personaLookbackSessions: number;   // 2
}
```

`randomesqueK` is 6 because 6 measured best: accuracy 0.920 at K=6 against 0.914 at K=3 and 0.913 at
K=10, with no difference in session length. All three sit within sampling noise of each other at
n=1,000, so this is choosing the best of several equivalent options rather than a strong result.

**The exposure exponent's justification is narrower than it first appeared, and this is worth being
straight about.** It was set to 3 after measuring a 120-item fixture, where proportional damping left
maximum exposure at 0.425 against a 0.20 target. Against the real 4,534-item catalog the exponent
barely matters: exponent 1 gives 0.213, exponent 3 gives 0.205, exponent 6 gives 0.202, all effectively
at target. The exponent therefore earns its keep only when the eligible pool is *thin* — which is not a
hypothetical, because eligibility is per app: an app that approves two question types has a pool closer
to the fixture than to the catalog. It stays at 3 as the setting that is safe in both cases rather than
tuned for one.

---

## 10. Publishing the catalog

`admin` → `POST /v1/admin/catalog/publish`:

1. Read the source banks (`qbank-library/banks/*.jsonl`) or an uploaded batch.
2. Derive each type's `uiRequirement` via `@gt/ui-contract`, and `domain` via `domainOf()` for the
   existing 53, or from the payload for new families.
3. Upsert type records for families not yet present. **Never** update an existing type record.
4. Upsert items, incrementing `revision` and writing an `ITEMREV` record when parameters change.
5. Write answer keys to `gt-answer-keys` at the matching revision.
6. Compile the selection index, gzip, write to S3, checksum.
7. Write the `SNAPSHOT#<id> / META` record. Snapshot IDs are monotonic: `snap-<yyyymmdd>-<nnn>`.
8. Apps with `pinnedSnapshotId === null` pick up the new snapshot on their next cold start; pinned
   apps stay put until explicitly moved.

Publishing is idempotent: re-running with unchanged input produces no new revisions and no new
snapshot.

---

## 11. Recompute, criteria, and notification

### 11.1 The backfill your item-correction scenario needs

1. `admin` updates an item's difficulty. A new `ITEMREV` is written; `revision` increments.
2. `GSI1` is queried for `ITEM#<itemId>` → every response that ever served it, with session IDs.
3. Affected session IDs are batched onto an SQS queue.
4. `rescore-worker` rebuilds each sheet from its trace using the **item parameters now current**,
   writes a new `SHEET#<iso>`, updates `SHEET#CURRENT`, and re-evaluates the criteria.
5. A session that newly meets the criteria gets a `GSI4` entry and an outbox event.

Because scoring rebuilds from the trace, step 4 runs the same function as live scoring.

### 11.2 Criteria as versioned config

```ts
interface GiftedCriteria {
  readonly version: string;
  readonly abilityThreshold: number;         // logits
  readonly requiredProbability: number;      // P(θ > threshold)
  readonly minItemsScored: number;
  readonly perDomainRequirements?: Readonly<Partial<Record<DomainName, {
    readonly minItemsScored: number;
    readonly requiredProbability: number;
  }>>>;
  readonly description: string;
}
```

Immutable and versioned, because a decision is only defensible if you can say which rule produced
it. Every sheet records `criteriaVersion`.

### 11.3 Transactional outbox

A mass rescore must not email the same family twice. Sheet write and outbox event write happen in
one `TransactWriteItems`. DynamoDB Streams delivers to EventBridge, then SQS, then a notifier. The
event carries a deterministic ID — `hash(sessionId, criteriaVersion, 'qualified')` — so redelivery
and re-rescoring both collapse to one notification.

---

## 12. Personas and PII

**This phase collects a guardian email and nothing else.** Not the child's name, not a Roblox
username, not anything gathered directly from a child. That choice is what keeps this phase outside
the COPPA consent machinery: the FTC position quoted in
`archive/research/backend-admissions/CHILD_DATA_PRIVACY_AND_RETENTION.md` is that COPPA "generally
does not apply to information collected online from a parent rather than directly from a child."

The schema reserves `robloxUsername` and `childFirstName` behind a feature flag that defaults off,
so expanding later is a config and legal exercise rather than a migration. **A full COPPA consent
design is explicitly out of scope for this phase** and is a blocking prerequisite for enabling those
fields.

### 12.1 IP linkage is a hint, not an identity

`GSI6` stores `sha256(ip + dailySalt)` with a 90-day TTL. It is deliberately weak:

- Shared school networks and carrier-grade NAT put unrelated children behind one address, so a
  match is evidence of a shared network, not a shared family.
- The daily salt rotation bounds how far back a hash can be correlated.
- A match surfaces to a human as a suggestion. Nothing automated acts on it.

---

## 13. Security

| Concern | Control |
|---|---|
| App authentication | Per-app API key, stored as `sha256` in `APP#<id> / KEY#<hash>`. Lambda authorizer resolves and caches `appId`. Keys rotate without changing app identity. |
| Admin authentication | Separate authorizer requiring IAM SigV4. No API key path to `admin`. |
| Answer-key exposure | `serve` has no IAM statement naming `gt-answer-keys`. |
| Response forgery | `servedToken` HMAC binds a response to the served item and revision. Signing key in Secrets Manager. |
| PII at rest | Dedicated KMS customer-managed key on `gt-personas`. |
| Cross-app data leakage | Every session read is filtered by `appId` from the authorizer, never from the request body. |
| Replay / double-count | Conditional update on `state = 'served'`. |
| Throttling | Per-route rate limits; per-app quota enforced in the authorizer. |
| Cost runaway | On-demand billing, budget alarm, per-app quotas, reserved concurrency on every function. |

---

## 14. Observability

Structured JSON logs with `sessionId`, `appId`, `snapshotId`, `engineVersion` on every line.
CloudWatch metrics: items served per app, selection latency, snapshot cache hit rate, unscorable
rate, exposure-rate distribution, decisions per criteria version. Alarms on unscorable rate,
selection latency p99, and any `serve` attempt that touches an answer key path (which should be
impossible and therefore worth alarming on).

---

## 15. Testing

| Layer | Approach |
|---|---|
| `domain`, `scoring`, `selection` | Pure unit tests, vitest. No AWS. Property tests on the posterior: monotonicity of P(θ>t) in correct answers, interval containment, composite equals the reference pooled posterior. |
| `catalog` compiler | Golden-file test against the real 53 banks; asserts 4,534 scorable and that no answer key appears in the selection index or any served payload. |
| `store` | Integration tests against **DynamoDB Local** in Docker on port 8010, with real GSI projections. |
| Handlers | Integration tests against DynamoDB Local; full serve → score → stop loop. |
| Variety | Statistical tests: 1,000 simulated sessions must not repeat an opening item more than chance allows, and exposure must stay under target. |
| Infrastructure | `cdk synth` plus `aws-cdk-lib/assertions` template assertions, including a test that the `serve` role has no `gt-answer-keys` permission. |
| Regression | The existing 148 `screener` tests must still pass, untouched. |

---

## 16. Repository layout

New top-level `platform/`, so nothing existing moves.

```
platform/
├── packages/
│   ├── domain/       pure types, type-code parsing, no dependencies
│   ├── scoring/      MultiPosterior, computeSheet, engine version
│   ├── selection/    seeded RNG, selection index, the eight variety layers
│   ├── catalog/      JSONL → registry rows + selection index
│   └── store/        DynamoDB single-table repository
├── functions/        catalog, serve, score, admin, rescore-worker
└── infra/            CDK app
```

Pure packages carry the logic and are testable with zero AWS. Handlers are thin. Infrastructure is
separate.

---

## 17. Owner actions this design cannot perform

1. **Create the new AWS account** and provide credentials.
2. **Run `cdk bootstrap`** once in the target account and region.
3. **Run the first `cdk deploy`.**
4. **Decide the gifted criteria numbers.** The design ships a versioned `criteria-v1` placeholder
   derived from the existing prototype defaults; the real thresholds are a product decision.
5. **Confirm guardian-email-only** with whoever owns legal risk before any real family sees it.
6. **Choose a region.** `us-east-1` is where the archive lives; a different region is one more layer
   of separation and costs nothing.
