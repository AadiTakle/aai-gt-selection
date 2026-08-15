# AWS Question Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally verify a serverless question-registry, ability-scoring, and
question-serving platform, synthesized to reviewable CloudFormation but never deployed.

**Architecture:** Five pure TypeScript packages carry all logic and test with zero AWS. Five thin
Lambda handlers wire them to DynamoDB. A CDK app describes the infrastructure. The existing
`screener/packages/*` are imported, never modified.

**Tech Stack:** TypeScript 5.7 strict, Node 20 (Lambda runtime target), vitest 2, AWS SDK v3,
AWS CDK v2, DynamoDB Local in Docker, esbuild via `NodejsFunction`.

**Spec:** `docs/design/aws-question-platform.md`. **Ledger:** `docs/plans/aws-question-platform-progress.md`.

## Global Constraints

- **No AWS API calls.** No credentials exist. `cdk synth` only; `cdk deploy` and `cdk bootstrap` are owner actions (spec §17).
- **No edits under `screener/`, `qbank-library/`, or `archive/`.** Import only. The 148 existing tests must still pass.
- **All commits on `feat/aws-question-platform`.** Never `dev`.
- **DynamoDB Local on port 8010.** Port 8000 is used by `qbank-library`'s static server.
- **Answer keys never enter the `serve` path.** No selection index, `ServedQuestion`, or response payload may contain `correctKey`.
- **Type records are write-once.** No update path may exist in any store method or handler.
- **Every response persists the item parameters in force at serve time** (`itemRevision`, `a`, `b`, `c`).
- Engine version string for this build: `engine-2026.08.10`.
- Node 20 is the Lambda target even though local Node is 25; do not use APIs newer than Node 20.

---

## File structure

| Path | Responsibility |
|---|---|
| `platform/package.json` | npm workspace root, scripts, shared devDeps |
| `platform/tsconfig.json` | strict TS, path aliases to `@platform/*` and `@gt/*` |
| `platform/vitest.config.ts` | test config, alias resolution |
| `platform/packages/domain/src/` | pure types and type-code arithmetic. Zero dependencies. |
| `platform/packages/scoring/src/` | `MultiPosterior`, `replay`, `computeSheet`, criteria evaluation |
| `platform/packages/selection/src/` | seeded RNG, selection index, the eight variety layers |
| `platform/packages/catalog/src/` | JSONL banks → type records, items, answer keys, selection index |
| `platform/packages/store/src/` | DynamoDB single-table repository, key builders, GSI queries |
| `platform/functions/*/src/handler.ts` | five thin Lambda handlers |
| `platform/infra/` | CDK app and stack |
| `platform/scripts/dynamodb-local.sh` | start/stop the test container on 8010 |

`domain` depends on nothing. `scoring` and `selection` depend on `domain` plus `@gt/engine`.
`catalog` depends on `domain`, `@gt/qbank`, `@gt/ui-contract`. `store` depends on `domain`.
Handlers depend on everything. Nothing depends on handlers.

`SelectionCandidate`, `AnswerKeyRecord`, `SnapshotRecord`, and `OutboxEvent` live in
`@platform/domain` (`candidate.ts`), not in `selection` or `catalog`, so that the compiler which
produces snapshots and the store which persists them need no dependency on the selection algorithm.
Tasks 3 through 6 are therefore mutually independent and may be built in parallel.

---

## Task 1: Workspace scaffolding

**Files:**
- Create: `platform/package.json`, `platform/tsconfig.json`, `platform/vitest.config.ts`, `platform/.gitignore`
- Create: `platform/scripts/dynamodb-local.sh`
- Create: `platform/README.md`

**Interfaces:**
- Produces: path aliases `@platform/domain`, `@platform/scoring`, `@platform/selection`, `@platform/catalog`, `@platform/store`, and re-exposed `@gt/engine`, `@gt/qbank`, `@gt/qbank/server`, `@gt/contracts`, `@gt/ui-contract` pointing into `../screener/packages/*/src/`.
- Produces: `npm test`, `npm run typecheck`, `npm run ddb:start`, `npm run ddb:stop`, `npm run synth`.

- [ ] **Step 1:** Create `platform/package.json` with name `gt-platform`, `private: true`, `type: module`, devDeps `typescript@^5.7`, `vitest@^2`, `@types/node@^20`, `tsx@^4`, deps `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3`, `@aws-sdk/client-sqs`, `ulid`.
- [ ] **Step 2:** Create `platform/tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `module: ESNext`, `moduleResolution: bundler`, `target: ES2022`, `noEmit: true`, plus the path aliases above.
- [ ] **Step 3:** Create `platform/vitest.config.ts` mirroring those aliases so tests resolve `@gt/*` from the screener source tree.
- [ ] **Step 4:** Create `platform/scripts/dynamodb-local.sh` — `docker run -d --name gt-ddb-local -p 8010:8000 amazon/dynamodb-local`, idempotent, with a `stop` subcommand.
- [ ] **Step 5:** Run `npm install` in `platform/`, then `npx tsc --noEmit`. Expected: no errors (no source files yet).
- [ ] **Step 6:** Verify the guard: run `cd screener && npm test`. Expected: 148 passed. Commit.

---

## Task 2: `@platform/domain`

**Files:**
- Create: `platform/packages/domain/src/{ids,domains,item,type,app,criteria,session,scoresheet,index}.ts`
- Test: `platform/packages/domain/src/domain.test.ts`

**Interfaces — Produces (exact, other tasks depend on these names):**

```ts
// ids.ts
export interface ParsedTypeCode { readonly code: string; readonly family: string; readonly version: number; }
export function parseTypeCode(code: string): ParsedTypeCode;       // throws Error on malformed
export function tryParseTypeCode(code: string): ParsedTypeCode | null;
export function formatTypeCode(family: string, version: number): string;  // version zero-padded to 2
export function nextVersion(code: string): string;
export function sameFamily(a: string, b: string): boolean;         // case-insensitive on family

// domains.ts
export type DomainName = 'quantitative' | 'verbal' | 'spatial' | 'fluid';
export const DOMAIN_NAMES: readonly DomainName[];
export function domainFromTypeCode(code: string): DomainName;      // prefix heuristic; seeding only

// item.ts
export type ScoringMode = 'deterministic_key' | 'computed_solver' | 'model_judge_deferred';
export interface ItemParameters { readonly b: number; readonly a: number; readonly c: number; }
export interface RegistryItem {
  readonly itemId: string; readonly typeCode: string; readonly revision: number;
  readonly domain: DomainName; readonly difficulty: number; readonly params: ItemParameters;
  readonly optionCount: number; readonly ageBands: readonly string[];
  readonly scoringMode: ScoringMode; readonly content: Record<string, unknown>;
  readonly syntheticOnly: boolean; readonly validated: boolean; readonly calibrated: boolean;
}
export interface ServedQuestion {
  readonly itemId: string; readonly typeCode: string; readonly domain: DomainName;
  readonly difficulty: number; readonly ageBands: readonly string[];
  readonly optionCount: number; readonly content: Record<string, unknown>;
}
export function toServedQuestion(item: RegistryItem): ServedQuestion;

// type.ts
export type TypeStatus = 'active' | 'deprecated' | 'superseded';
export interface UiRequirementSnapshot {
  readonly elements: readonly string[];
  readonly counts: Readonly<Record<string, number>>;
  readonly readingBand: string | null;
}
export interface QuestionTypeRecord {
  readonly typeCode: string; readonly family: string; readonly version: number;
  readonly domain: DomainName; readonly title: string;
  readonly uiRequirement: UiRequirementSnapshot;
  readonly scoringModes: readonly ScoringMode[];
  readonly itemCount: number; readonly scorableCount: number;
  readonly difficultyRange: readonly [number, number] | null;
  readonly ageBands: readonly string[]; readonly createdAt: string; readonly sourceRef: string;
}

// app.ts
export interface PrecisionConfig {
  readonly confidenceAbove: number; readonly confidenceBelow: number;
  readonly minItems: number; readonly maxItems: number;
}
export interface VarietyConfig {
  readonly randomesqueK: number; readonly earlyKFraction: number; readonly earlyItemCount: number;
  readonly sameTypeDamping: boolean; readonly domainInterleaveTolerance: number;
  readonly targetExposureRate: number; readonly openingJitterLogits: number;
  readonly personaLookbackSessions: number;
}
export const DEFAULT_VARIETY_CONFIG: VarietyConfig;
export type PiiPolicy = 'none' | 'guardian_email';
export interface AppConfig {
  readonly appId: string; readonly name: string; readonly surfaceKind: string;
  readonly status: 'active' | 'disabled'; readonly abilityThreshold: number;
  readonly recommendProbability: number; readonly precision: PrecisionConfig;
  readonly perDomainMinimum: number; readonly ageBands: readonly string[];
  readonly uiCapabilities: readonly string[]; readonly maxReadingBand: string | null;
  readonly allowSyntheticItems: boolean; readonly pinnedSnapshotId: string | null;
  readonly variety: VarietyConfig; readonly piiPolicy: PiiPolicy;
  readonly retentionDays: number; readonly webhookUrl: string | null;
  readonly ownerContact: string; readonly createdAt: string;
}

// criteria.ts
export interface DomainRequirement { readonly minItemsScored: number; readonly requiredProbability: number; }
export interface GiftedCriteria {
  readonly version: string; readonly abilityThreshold: number;
  readonly requiredProbability: number; readonly minItemsScored: number;
  readonly perDomainRequirements: Readonly<Partial<Record<DomainName, DomainRequirement>>>;
  readonly description: string;
}
export const CRITERIA_V1: GiftedCriteria;

// scoresheet.ts
export type EstimateScope = DomainName | 'composite';
export type StopReason = 'confident-above' | 'confident-below' | 'item-cap' | 'bank-exhausted' | 'abandoned';
export type Decision = 'recommend' | 'no-recommendation';
export interface DomainEstimate {
  readonly scope: EstimateScope; readonly mean: number; readonly sd: number;
  readonly interval: readonly [number, number]; readonly pAboveThreshold: number;
  readonly itemsScored: number; readonly itemsUnscorable: number;
  readonly informationAccumulated: number;
}
export interface ScoreSheet {
  readonly sessionId: string; readonly engineVersion: string; readonly criteriaVersion: string;
  readonly snapshotId: string; readonly computedAt: string;
  readonly composite: DomainEstimate;
  readonly domains: Readonly<Record<DomainName, DomainEstimate>>;
  readonly itemsServed: number; readonly stopped: boolean;
  readonly stopReason: StopReason | null; readonly decision: Decision | null;
  readonly meetsCriteria: boolean; readonly derivedFromResponseCount: number;
}

// session.ts
export type ResponseState = 'served' | 'answered' | 'expired';
export interface SelectionTrace {
  readonly reason: string; readonly informationAtThreshold: number;
  readonly candidatePoolSize: number; readonly k: number; readonly layer: string;
}
export interface SessionRecord {
  readonly sessionId: string; readonly appId: string; readonly personaId: string | null;
  readonly snapshotId: string; readonly engineVersion: string; readonly criteriaVersion: string;
  readonly resolvedConfig: AppConfig; readonly rngSeed: string; readonly ageBand: string | null;
  readonly startedAt: string; readonly endedAt: string | null;
  readonly status: 'active' | 'stopped' | 'abandoned';
  readonly stopReason: StopReason | null; readonly decision: Decision | null;
}
export interface ResponseRecord {
  readonly sessionId: string; readonly ordinal: number; readonly state: ResponseState;
  readonly itemId: string; readonly itemRevision: number; readonly typeCode: string;
  readonly domain: DomainName; readonly difficulty: number; readonly params: ItemParameters;
  readonly optionCount: number; readonly rawResponse: unknown; readonly correct: boolean | null;
  readonly latencyMs: number | null; readonly metrics: Record<string, unknown> | null;
  readonly selection: SelectionTrace; readonly idempotencyKey: string | null;
  readonly servedAt: string; readonly answeredAt: string | null;
}
```

- [ ] **Step 1:** Write `domain.test.ts` covering: `parseTypeCode('FLU-MATRIX-01')` → family `FLU-MATRIX`, version 1; `parseTypeCode('WM-corsi-01')` preserves lowercase in `code` and `family`; `parseTypeCode('CX-achieve-02')` → version 2; `nextVersion('FLU-MATRIX-01')` → `'FLU-MATRIX-02'`; `nextVersion('CX-achieve-09')` → `'CX-achieve-10'`; `sameFamily('WM-corsi-01','WM-CORSI-02')` → true; `parseTypeCode('nope')` throws; `tryParseTypeCode('nope')` → null; `domainFromTypeCode` maps QUANT/VER/SPA and falls through to fluid; `toServedQuestion` output has no `answer`, `scoring`, or `correctKey` key at any depth.
- [ ] **Step 2:** Run `npx vitest run packages/domain`. Expected: FAIL, modules not found.
- [ ] **Step 3:** Implement all nine modules. `parseTypeCode` splits on the **last** hyphen and requires the tail to match `/^\d{1,3}$/`. `CRITERIA_V1` uses `abilityThreshold: 1.0`, `requiredProbability: 0.75`, `minItemsScored: 8`, empty `perDomainRequirements`, and a description naming it a placeholder pending the product decision in spec §17.4.
- [ ] **Step 4:** Run `npx vitest run packages/domain`. Expected: PASS.
- [ ] **Step 5:** Commit.

---

## Task 3: `@platform/scoring`

**Files:**
- Create: `platform/packages/scoring/src/{multi-posterior,replay,sheet,criteria,version,index}.ts`
- Test: `platform/packages/scoring/src/scoring.test.ts`

**Interfaces — Consumes:** all of `@platform/domain`; `Posterior`, `information`, `pCorrect`, `paramsFor`, `type ItemParams` from `@gt/engine`.

**Interfaces — Produces:**

```ts
export const ENGINE_VERSION: string;   // 'engine-2026.08.10'

export interface ScoredResponse {
  readonly domain: DomainName; readonly params: ItemParameters; readonly correct: boolean | null;
}

export class MultiPosterior {
  update(domain: DomainName, params: ItemParameters, correct: boolean | null): void;
  estimate(scope: EstimateScope, threshold: number): DomainEstimate;
  pAbove(scope: EstimateScope, threshold: number): number;
  itemsScored(scope: EstimateScope): number;
}
export function replay(responses: readonly ScoredResponse[]): MultiPosterior;

export interface SheetInput {
  readonly sessionId: string; readonly snapshotId: string;
  readonly criteria: GiftedCriteria; readonly responses: readonly ScoredResponse[];
  readonly precision: PrecisionConfig; readonly perDomainMinimum: number;
  readonly recommendProbability: number; readonly itemsServed: number;
  readonly poolExhausted: boolean; readonly abandoned: boolean;
  readonly computedAt?: string;
}
export function computeSheet(input: SheetInput): ScoreSheet;
export function evaluateCriteria(sheet: ScoreSheet, criteria: GiftedCriteria): boolean;
```

- [ ] **Step 1:** Write `scoring.test.ts`. The load-bearing test is **composite equivalence**: build a reference `Posterior` from `@gt/engine`, update it with the same sequence via `paramsFor(b, optionCount, 1.5)`, and assert `MultiPosterior.estimate('composite', t).mean` equals `reference.mean()` to 12 decimal places and `pAboveThreshold` equals `reference.probabilityAbove(t)`. Also: an unscorable (`correct: null`) response changes neither the posterior nor `itemsScored` but does increment `itemsUnscorable`; a domain that saw no items returns the prior (mean ≈ 0, `itemsScored: 0`); `pAbove` is monotonically non-decreasing across a run of correct answers on identical items; the 90% interval contains the mean; `computeSheet` is a pure function of its input (two calls with a fixed `computedAt` are deep-equal); `stopReason` is `item-cap` at `maxItems`, `confident-above` only once `minItems` and per-domain minimums are met, and `bank-exhausted` when `poolExhausted`.
- [ ] **Step 2:** Run `npx vitest run packages/scoring`. Expected: FAIL.
- [ ] **Step 3:** Implement. `MultiPosterior` holds five `Posterior` instances (four domains plus composite) and a per-scope tally of scored, unscorable, and accumulated `information(threshold, params)`. `update` with `correct === null` touches no posterior. `update` with a boolean updates **the item's domain and the composite**, and nothing else. Accumulated information is summed at the criteria threshold. `computeSheet` calls `replay`, derives all six estimates, applies the stop rule from spec §8.2, sets `decision` only when stopped, and sets `meetsCriteria` via `evaluateCriteria`.
- [ ] **Step 4:** Run `npx vitest run packages/scoring`. Expected: PASS, composite equivalence included.
- [ ] **Step 5:** Commit.

---

## Task 4: `@platform/selection`

**Files:**
- Create: `platform/packages/selection/src/{rng,index-model,eligibility,exposure,select,index}.ts`
- Test: `platform/packages/selection/src/selection.test.ts`, `platform/packages/selection/src/variety.test.ts`

**Interfaces — Consumes:** `@platform/domain`; `information` and `type ItemParams` from `@gt/engine`.

**Interfaces — Produces:**

```ts
// rng.ts — deterministic mulberry32 over a hashed (seed, ordinal) pair
export interface Rng {
  next(): number;                                             // [0, 1)
  int(maxExclusive: number): number;
  pick<T>(xs: readonly T[]): T;
  weighted<T>(xs: readonly T[], weights: readonly number[]): T;
  shuffled<T>(xs: readonly T[]): readonly T[];
}
export function rngFor(seed: string, ordinal: number): Rng;

// index-model.ts
export interface SelectionCandidate {
  readonly itemId: string; readonly itemRevision: number; readonly typeCode: string;
  readonly domain: DomainName; readonly params: ItemParameters; readonly difficulty: number;
  readonly optionCount: number; readonly ageBands: readonly string[];
  readonly scoringMode: ScoringMode; readonly readingBand: string | null;
  readonly syntheticOnly: boolean;
}
export interface SelectionIndex {
  readonly snapshotId: string; readonly items: readonly SelectionCandidate[];
  readonly byType: ReadonlyMap<string, readonly SelectionCandidate[]>;
}
export function buildIndex(snapshotId: string, items: readonly SelectionCandidate[]): SelectionIndex;

// exposure.ts
export interface ExposureSnapshot {
  readonly sessionCount: number; readonly servedCounts: ReadonlyMap<string, number>;
}
export function exposureDamping(itemId: string, exposure: ExposureSnapshot | null, target: number): number;

// select.ts
export interface SelectionRequest {
  readonly index: SelectionIndex; readonly threshold: number; readonly ordinal: number;
  readonly rngSeed: string; readonly approvedTypes: ReadonlySet<string>;
  readonly ageBand: string | null; readonly maxReadingBand: string | null;
  readonly allowSynthetic: boolean; readonly usedItemIds: ReadonlySet<string>;
  readonly personaRecentItemIds: ReadonlySet<string>;
  readonly typeServedCounts: ReadonlyMap<string, number>;
  readonly domainServedCounts: ReadonlyMap<DomainName, number>;
  readonly lastDomain: DomainName | null; readonly perDomainMinimum: number;
  readonly variety: VarietyConfig; readonly exposure: ExposureSnapshot | null;
}
export interface SelectionResult { readonly candidate: SelectionCandidate; readonly trace: SelectionTrace; }
export function eligible(req: SelectionRequest): readonly SelectionCandidate[];
export function selectNext(req: SelectionRequest): SelectionResult | null;   // null means exhausted
```

- [ ] **Step 1:** Write `selection.test.ts` for eligibility and determinism: each of the eight filters in spec §9.1 excludes what it should; `scoringMode !== 'deterministic_key'` is always excluded; `selectNext` with an identical request twice returns the identical item; changing only `rngSeed` changes the item for a pool of 100 equal-information candidates; an empty eligible pool returns `null`; a domain below `perDomainMinimum` is forced when candidates exist in it.
- [ ] **Step 2:** Write `variety.test.ts` as statistical tests over 1,000 simulated sessions with distinct seeds: the opening item is not the same in more than 5% of sessions; no item exceeds `targetExposureRate` by more than 25% relative; same-type damping keeps any single type under 40% of a 16-item session; consecutive same-domain pairs occur in under 40% of adjacent pairs; and every session's sequence replays exactly from its seed.
- [ ] **Step 3:** Run both. Expected: FAIL.
- [ ] **Step 4:** Implement the eight layers in spec §9.2. Order inside `selectNext`: compute `eligible`; if any domain is below `perDomainMinimum` and has candidates, restrict to those domains; score each candidate as `information(threshold, params) × sameTypeDamping × exposureDamping × domainInterleavePenalty`; for `ordinal === 1` instead restrict to `|b − threshold| ≤ openingJitterLogits` and weight by inverse exposure only; take top K where `K = ordinal <= earlyItemCount ? max(randomesqueK, ceil(earlyKFraction × eligible.length)) : randomesqueK`; sample proportional to score via `rng.weighted`. Record which layer decided in `trace.layer`.
- [ ] **Step 5:** Run both. Expected: PASS.
- [ ] **Step 6:** Commit.

---

## Task 5: `@platform/catalog`

**Files:**
- Create: `platform/packages/catalog/src/{compile,ui-requirement,serialize,index}.ts`
- Test: `platform/packages/catalog/src/catalog.test.ts`

**Interfaces — Consumes:** `@platform/domain`, `SelectionCandidate` from `@platform/selection`; `loadBanks`, `toLogits`, `domainOf`, `type BankRecord` from `@gt/qbank/server`; `requirementFor` from `@gt/ui-contract`.

**Interfaces — Produces:**

```ts
export interface AnswerKeyRecord {
  readonly itemId: string; readonly revision: number; readonly correctKey: string;
  readonly scoringMode: ScoringMode; readonly extra: Record<string, unknown>;
}
export interface CompileStats {
  readonly typeCount: number; readonly itemCount: number; readonly scorableCount: number;
  readonly excludedByMode: Readonly<Record<string, number>>;
}
export interface CompiledCatalog {
  readonly snapshotId: string; readonly types: readonly QuestionTypeRecord[];
  readonly items: readonly RegistryItem[]; readonly answerKeys: readonly AnswerKeyRecord[];
  readonly selectionIndex: readonly SelectionCandidate[]; readonly stats: CompileStats;
}
export interface CompileOptions {
  readonly bankDir?: string; readonly snapshotId: string; readonly discrimination?: number;
}
export function compileCatalog(opts: CompileOptions): CompiledCatalog;
export function serializeSelectionIndex(items: readonly SelectionCandidate[], snapshotId: string): Promise<Buffer>;
export function deserializeSelectionIndex(buf: Buffer): Promise<{ snapshotId: string; items: readonly SelectionCandidate[] }>;
```

- [ ] **Step 1:** Write `catalog.test.ts` as a golden test against the real banks: `compileCatalog({ snapshotId: 'snap-test-001' })` yields `typeCount === 53` and `scorableCount === 4534`; `excludedByMode` reports `computed_solver: 1774`, `no-key: 891`, `model_judge_deferred: 120`; **no answer key leaks** — `JSON.stringify(selectionIndex)` and `JSON.stringify(items)` both contain neither `correctKey` nor any value equal to a known key; every `selectionIndex` entry has `scoringMode === 'deterministic_key'`; `answerKeys.length === scorableCount`; `optionCount` derives from `content.options.length` and falls back to 4; `params.b` equals `toLogits(difficulty)`; a round trip through `serializeSelectionIndex`/`deserializeSelectionIndex` is deep-equal; compiling twice is deterministic.
- [ ] **Step 2:** Run `npx vitest run packages/catalog`. Expected: FAIL.
- [ ] **Step 3:** Implement. Items start at `revision: 1`. `domain` comes from `domainOf`, `uiRequirement` from `requirementFor(typeCode)` flattened into `UiRequirementSnapshot`. `params` is `{ b: toLogits(difficulty), a: discrimination ?? 1.5, c: 1 / optionCount }`, matching the existing `paramsFor(b, 4, 1.5)` call so behaviour is preserved. Serialization is gzipped JSON with a `{ snapshotId, version: 1, items }` envelope.
- [ ] **Step 4:** Run `npx vitest run packages/catalog`. Expected: PASS with the real counts.
- [ ] **Step 5:** Commit.

---

## Task 6: `@platform/store`

**Files:**
- Create: `platform/packages/store/src/{keys,client,types-repo,items-repo,apps-repo,sessions-repo,sheets-repo,snapshots-repo,exposure-repo,outbox-repo,answer-keys,personas,schema,index}.ts`
- Test: `platform/packages/store/src/store.test.ts` (integration, DynamoDB Local on 8010)

**Interfaces — Consumes:** all of `@platform/domain`; `SelectionCandidate` from `@platform/selection`; `AnswerKeyRecord` from `@platform/catalog`.

**Interfaces — Produces:** every key builder in `keys.ts` (single source of truth for key strings, matching spec §6.1 and §6.3 exactly), a `createTables(client)` helper used only by tests and the CDK schema test, and:

```ts
export interface StoreConfig {
  readonly tableName: string; readonly answerKeyTableName: string;
  readonly personaTableName: string; readonly endpoint?: string; readonly region?: string;
}
export class PlatformStore {
  constructor(cfg: StoreConfig);
  // types — no update method exists, by design
  putType(t: QuestionTypeRecord): Promise<void>;                       // conditional: attribute_not_exists
  getType(typeCode: string): Promise<QuestionTypeRecord | null>;
  listTypes(): Promise<readonly QuestionTypeRecord[]>;
  appendLifecycle(typeCode: string, status: TypeStatus, at: string, reason: string): Promise<void>;
  currentStatus(typeCode: string): Promise<TypeStatus>;
  // items
  putItem(i: RegistryItem): Promise<void>;
  getItem(typeCode: string, itemId: string): Promise<RegistryItem | null>;
  reviseItem(typeCode: string, itemId: string, patch: Partial<Pick<RegistryItem, 'difficulty' | 'params' | 'validated' | 'calibrated'>>, reason: string): Promise<RegistryItem>;
  listItemsForType(typeCode: string): Promise<readonly RegistryItem[]>;
  // apps
  putApp(a: AppConfig): Promise<void>;
  getApp(appId: string): Promise<AppConfig | null>;
  setApprovedType(appId: string, typeCode: string, enabled: boolean, by: string): Promise<void>;
  listApprovedTypes(appId: string): Promise<readonly string[]>;
  putApiKey(appId: string, keyHash: string, label: string): Promise<void>;
  resolveApiKey(keyHash: string): Promise<string | null>;              // → appId
  // snapshots
  putSnapshot(s: SnapshotRecord): Promise<void>;
  getSnapshot(id: string): Promise<SnapshotRecord | null>;
  latestSnapshot(): Promise<SnapshotRecord | null>;
  // sessions and responses
  putSession(s: SessionRecord): Promise<void>;
  getSession(id: string): Promise<SessionRecord | null>;
  finishSession(id: string, stopReason: StopReason, decision: Decision | null, at: string): Promise<void>;
  putServedResponse(r: ResponseRecord): Promise<void>;
  completeResponse(sessionId: string, ordinal: number, patch: { rawResponse: unknown; correct: boolean | null; latencyMs: number; metrics: Record<string, unknown> | null; idempotencyKey: string | null; answeredAt: string; }): Promise<'applied' | 'already-answered'>;
  listResponses(sessionId: string): Promise<readonly ResponseRecord[]>;
  // sheets, transactional with the outbox
  putSheet(sheet: ScoreSheet, events: readonly OutboxEvent[]): Promise<void>;
  getCurrentSheet(sessionId: string): Promise<ScoreSheet | null>;
  // index queries
  sessionsForItem(itemId: string): Promise<readonly { sessionId: string; ordinal: number }[]>;
  sessionsForPersona(personaId: string, limit?: number): Promise<readonly string[]>;
  sessionsForApp(appId: string, yyyymm: string, limit?: number): Promise<readonly string[]>;
  qualifiedSessions(criteriaVersion: string, since?: string): Promise<readonly string[]>;
  // counters
  incrementExposure(appId: string, itemId: string): Promise<void>;
  bumpAppSessionCount(appId: string): Promise<void>;
  exposureFor(appId: string, itemIds: readonly string[]): Promise<ExposureSnapshot>;
}
export class AnswerKeyStore {
  constructor(cfg: Pick<StoreConfig, 'answerKeyTableName' | 'endpoint' | 'region'>);
  get(itemId: string, revision: number): Promise<AnswerKeyRecord | null>;
  put(k: AnswerKeyRecord): Promise<void>;
}
export class PersonaStore {
  constructor(cfg: Pick<StoreConfig, 'personaTableName' | 'endpoint' | 'region'>);
  create(personaId: string, locale: string | null, firstSeenAppId: string): Promise<void>;
  putContact(personaId: string, guardianEmail: string, consentRef: string | null, ttlEpoch: number): Promise<void>;
  getContact(personaId: string): Promise<{ guardianEmail: string } | null>;
  deleteContact(personaId: string): Promise<void>;
}
export interface SnapshotRecord {
  readonly snapshotId: string; readonly createdAt: string; readonly itemCount: number;
  readonly typeCount: number; readonly s3Key: string; readonly checksum: string;
  readonly publishedBy: string; readonly notes: string;
}
export interface OutboxEvent {
  readonly eventId: string; readonly kind: 'session-qualified'; readonly sessionId: string;
  readonly criteriaVersion: string; readonly occurredAt: string; readonly payload: Record<string, unknown>;
}
```

- [ ] **Step 1:** Write `store.test.ts` against DynamoDB Local. Cover: `putType` twice for the same code rejects the second (write-once); `appendLifecycle` then `currentStatus` returns the newest; `reviseItem` increments `revision`, writes an `ITEMREV` row, and leaves the prior revision readable; `completeResponse` returns `'applied'` once then `'already-answered'` (the idempotency guarantee, spec §8.1); `sessionsForItem` finds every session that served an item across three sessions (the backfill query, spec §11.1); `sessionsForPersona` returns newest first; `qualifiedSessions` is sparse and returns only sessions written as qualified; `putSheet` writes sheet, history row, and outbox event atomically; `resolveApiKey` returns the right `appId`; `exposureFor` returns accurate counts after increments. Skip the suite with a clear message if port 8010 is unreachable.
- [ ] **Step 2:** Run `npm run ddb:start && npx vitest run packages/store`. Expected: FAIL.
- [ ] **Step 3:** Implement. Every key string comes from `keys.ts` — no inline template literals elsewhere. Ordinals are zero-padded to four digits everywhere they appear in a key or sort key. `putSheet` uses `TransactWriteItems` over the sheet row, the history row, the sparse `GSI4` attributes, and one outbox row per event.
- [ ] **Step 4:** Run the suite. Expected: PASS. Then `npm run ddb:stop`.
- [ ] **Step 5:** Commit.

---

## Task 7: Lambda handlers

**Files:**
- Create: `platform/functions/authorizer/src/handler.ts`
- Create: `platform/functions/catalog/src/handler.ts`
- Create: `platform/functions/serve/src/handler.ts`
- Create: `platform/functions/score/src/handler.ts`
- Create: `platform/functions/admin/src/handler.ts`
- Create: `platform/functions/rescore-worker/src/handler.ts`
- Create: `platform/functions/shared/src/{http,token,snapshot-cache,env}.ts`
- Test: `platform/functions/functions.test.ts` (integration, DynamoDB Local)

**Interfaces — Consumes:** every package above.

**Interfaces — Produces:**

```ts
// shared/token.ts — binds a response to the exact item served (spec §8.1)
export interface ServedTokenClaims {
  readonly sessionId: string; readonly ordinal: number;
  readonly itemId: string; readonly itemRevision: number; readonly expiresAt: number;
}
export function signServedToken(claims: ServedTokenClaims, secret: string): string;
export function verifyServedToken(token: string, secret: string, now?: number): ServedTokenClaims;  // throws

// shared/snapshot-cache.ts — module-scope cache, spec §4.2
export function loadSelectionIndex(snapshotId: string, s3Key: string): Promise<SelectionIndex>;
export function clearSnapshotCache(): void;   // tests only
```

Routes, exactly as spec §8.1 and §9:

| Method | Path | Function |
|---|---|---|
| `GET` | `/v1/catalog/types` | catalog |
| `GET` | `/v1/catalog/types/{typeCode}` | catalog |
| `GET` | `/v1/catalog/app` | catalog |
| `POST` | `/v1/sessions` | serve |
| `GET` | `/v1/sessions/{sessionId}/next` | serve |
| `POST` | `/v1/sessions/{sessionId}/responses` | score |
| `POST` | `/v1/sessions/{sessionId}/abandon` | score |
| `GET` | `/v1/sessions/{sessionId}/sheet` | score |
| `POST` | `/v1/admin/catalog/publish` | admin |
| `POST` | `/v1/admin/apps` | admin |
| `PUT` | `/v1/admin/apps/{appId}/types/{typeCode}` | admin |
| `POST` | `/v1/admin/items/{itemId}/revise` | admin |

- [ ] **Step 1:** Write `functions.test.ts`. The end-to-end test drives a full session: publish a catalog, register an app approving three types, `POST /v1/sessions`, then loop `next` → `responses` answering deterministically until stopped, and assert the sheet has five populated estimates, a `stopReason`, and `derivedFromResponseCount` equal to the answered count. Plus: `next` response JSON contains no `correctKey`; a replayed `responses` call returns the same sheet without moving the posterior; a `servedToken` from session A rejected on session B; an expired token rejected; an app requesting a type it has not approved never receives it; `revise` on an item difficulty enqueues exactly the sessions that served it.
- [ ] **Step 2:** Run `npx vitest run functions`. Expected: FAIL.
- [ ] **Step 3:** Implement the handlers as thin adapters. Every handler resolves `appId` from the authorizer context, never the body. `serve` writes the response row in `served` state before returning, and increments exposure. `score` verifies the token, reads the key from `AnswerKeyStore`, marks via `scoreResponse` from `@gt/qbank/server`, conditionally completes the row, recomputes the sheet from the full trace, and writes sheet plus any outbox event in one transaction.
- [ ] **Step 4:** Run `npx vitest run functions`. Expected: PASS.
- [ ] **Step 5:** Commit.

---

## Task 8: CDK infrastructure

**Files:**
- Create: `platform/infra/bin/platform.ts`, `platform/infra/lib/{data-stack,api-stack,events-stack}.ts`, `platform/infra/cdk.json`
- Test: `platform/infra/infra.test.ts`

**Interfaces — Consumes:** nothing from the packages at runtime; references handler entry paths for bundling.

- [ ] **Step 1:** Write `infra.test.ts` using `aws-cdk-lib/assertions`. The critical assertion is the **IAM boundary**: gather every policy attached to the `serve` function's role and assert no statement's resources include the answer-key table ARN. Plus: three tables exist with `PAY_PER_REQUEST` and point-in-time recovery; `gt-platform` declares six GSIs with the index names from spec §6.3; the persona table uses a customer-managed KMS key; every function sets reserved concurrency; the S3 snapshot bucket blocks public access and enforces SSL; no resource has a `RemovalPolicy` of `DESTROY` on data.
- [ ] **Step 2:** Run `npx vitest run infra`. Expected: FAIL.
- [ ] **Step 3:** Implement three stacks. Environment-agnostic, no `Vpc.fromLookup` or any context lookup, so synth needs no credentials. Every construct tagged `project=gt-question-platform`.
- [ ] **Step 4:** Run `npx vitest run infra`, then `npx cdk synth --app "npx tsx infra/bin/platform.ts"`. Expected: tests PASS and three templates written to `cdk.out/` with no credential error.
- [ ] **Step 5:** Commit.

---

## Task 9: Variety simulation and tuned defaults

**Files:**
- Create: `platform/scripts/simulate-variety.ts`
- Modify: `platform/packages/domain/src/app.ts` (`DEFAULT_VARIETY_CONFIG` values)
- Modify: `docs/design/aws-question-platform.md` (§9.3 measured numbers)

- [ ] **Step 1:** Write `simulate-variety.ts`: simulate N children at known θ drawn from a standard normal, run each through `selectNext` plus `computeSheet` under a given `VarietyConfig`, and report items-per-decision, decision agreement against the deterministic baseline, opening-item entropy, and maximum observed exposure rate.
- [ ] **Step 2:** Run it for the deterministic baseline and for three variety settings at 2,000 sessions each.
- [ ] **Step 3:** Choose `DEFAULT_VARIETY_CONFIG` as the setting whose decision agreement with the baseline stays above 0.97 while opening-item entropy is highest, and record the measured cost in items-per-decision.
- [ ] **Step 4:** Write the measured numbers into spec §9.3, replacing the guessed defaults.
- [ ] **Step 5:** Run the whole suite plus `cd screener && npm test`. Expected: platform green, screener still 148 passed. Commit.

---

## Self-review against the spec

| Spec section | Covered by |
|---|---|
| §4.1 five functions, IAM split | Tasks 7, 8 (the `serve` role assertion) |
| §4.2 snapshots, module-scope cache | Tasks 5, 7 |
| §4.3 CDK, env-agnostic synth | Task 8 |
| §5 type codes, versioning, write-once | Tasks 2, 6 |
| §5.3 item revisioning | Tasks 5, 6, 7 |
| §6 data model, six GSIs | Tasks 6, 8 |
| §7 score sheet, composite equivalence | Task 3 |
| §8 scoring contract, idempotency | Tasks 3, 6, 7 |
| §9 eligibility and eight variety layers | Tasks 4, 9 |
| §10 publish flow | Tasks 5, 7 |
| §11 backfill, criteria, outbox | Tasks 6, 7 |
| §12 persona and PII isolation | Tasks 6, 8 |
| §13 security controls | Tasks 7, 8 |
| §15 testing | Every task |

Not implemented in this plan, and deliberately: §14 observability beyond structured logging (needs a
deployed stack to tune alarms), the notifier itself (needs an email provider decision), and item
calibration from response data (needs real responses). Each is noted in the final report.
