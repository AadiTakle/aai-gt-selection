/**
 * The wire contract for the adaptive engine.
 *
 * **This file is the contract, and the types are the enforced half of it.** The server's handlers are annotated
 * with them, so a response that stops matching stops compiling. That is the guarantee worth having, because a
 * spec that can drift is worse than no spec — it is trusted.
 *
 * The OpenAPI document exists for adopters who are not writing TypeScript. It is emitted by
 * `openapi.ts` from schemas kept in this package and committed under `docs/api/`, with a test asserting the
 * committed copy matches what the generator produces. Be clear about what that does and does not buy: the
 * committed file cannot fall behind the generator, but the generator's schemas are maintained *beside* these
 * types rather than derived from them, so adding a field here and forgetting it there is still possible. A
 * real derivation needs a TS-to-JSON-Schema step and is worth doing if the spec ever becomes load-bearing for
 * an external consumer.
 *
 * Before this existed the contract lived in the Express handlers and was re-declared by hand in four client
 * files. They had already drifted: none of them knew about the per-domain bands (1a.4) or the pass route
 * (1a.7), so every client was silently discarding fields the engine had been returning for a day.
 *
 * ## Browser-safe on purpose
 *
 * Every import here is `import type`, so nothing in this module reaches `bank.ts` at runtime and nothing
 * pulls `node:fs` into a web bundle. That boundary is real and has been crossed before — `index.ts` carries
 * the scar. The route builders below are the only runtime values, and they are strings.
 *
 * ## Scope
 *
 * The `/api/bank/*` family: the two questions this workstream is about, plus the catalogue a caller needs to
 * ask them. The generator screener, the item library, snapshots and both practice modes are separate products
 * living in the same Express process and are deliberately not described here.
 */

import type { Domain, DomainBand, PassRoute, PrecisionSetting, QbankServe, QbankState, ServedItem } from './engine.js';

/** `Domain` is the type of `QbankServe.domain`, so a client reading a served item needs it. */
export type { Domain, DomainBand, PassRoute, PrecisionSetting, QbankServe, QbankState, ServedItem };

/** Age bands the banks declare. A session may ask for one or leave it open. */
export type AgeBand = 'K-1' | '2-3' | '4-5' | '6-8';
export const AGE_BANDS: readonly AgeBand[] = ['K-1', '2-3', '4-5', '6-8'];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * Every path, built rather than typed out at each call site.
 *
 * A hand-built URL is the one part of a contract a type cannot check, and it was already inconsistent across
 * the four clients. These are functions so an id cannot be forgotten.
 */
export const bankRoutes = {
  catalogue: () => '/api/bank',
  createSession: () => '/api/bank/sessions',
  next: (sessionId: string) => `/api/bank/sessions/${encodeURIComponent(sessionId)}/next`,
  answer: (sessionId: string) => `/api/bank/sessions/${encodeURIComponent(sessionId)}/answer`,
  debug: (sessionId: string) => `/api/bank/sessions/${encodeURIComponent(sessionId)}/debug`,
} as const;

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** Every non-2xx response in this family has this body and nothing else. */
export interface ErrorResponse {
  readonly error: string;
}

export function isErrorResponse(body: unknown): body is ErrorResponse {
  return typeof body === 'object' && body !== null && typeof (body as ErrorResponse).error === 'string';
}

/**
 * How the bank's 1-20 difficulty becomes logits.
 *
 * On the wire because a caller reading `difficulty` off a served item otherwise has no way to relate it to
 * the ability scale, and because the note is the part that matters: it is a rescaling, not a calibration.
 */
export interface DifficultyMapping {
  readonly midpoint: number;
  readonly divisor: number;
  readonly note: string;
}

// ---------------------------------------------------------------------------
// GET /api/bank
// ---------------------------------------------------------------------------

export interface BankTypeSummary {
  readonly typeCode: string;
  readonly domain: string;
  /** Items that can be marked host-side. The only figure that matters for what a session can serve. */
  readonly scorable: number;
  readonly total: number;
  /** Why the rest were held back, keyed by reason. `total - scorable` accounted for, never hidden. */
  readonly excluded: Readonly<Record<string, number>>;
  readonly difficultyRange: readonly [number, number];
  readonly ageBands: readonly string[];
}

export interface BankCatalogueResponse {
  readonly types: readonly BankTypeSummary[];
  readonly typeCount: number;
  readonly scorable: number;
  readonly total: number;
  readonly precisionSteps: readonly PrecisionSetting[];
  readonly difficultyMapping: DifficultyMapping;
}

// ---------------------------------------------------------------------------
// POST /api/bank/sessions
// ---------------------------------------------------------------------------

/** Every field optional: the defaults are the prototype's configuration and are documented in the spec. */
export interface CreateSessionRequest {
  /** Index into `precisionSteps`, 0 to 4. Defaults to 2 (Standard). */
  readonly precisionIndex?: number;
  readonly ageBand?: AgeBand;
  readonly abilityThreshold?: number;
  readonly perDomainMinimum?: number;
  readonly recommendProbability?: number;
  /**
   * Restrict the pool to these type codes. An unknown code is a 400 rather than a silent narrowing, because
   * a typo would otherwise shrink the pool without anyone noticing.
   */
  readonly types?: readonly string[];
  /** Supply for a reproducible session. Omit and the server picks one. */
  readonly seed?: number;
}

/** What the server resolved the request into. Echoed so a caller can record what it actually got. */
export interface ResolvedSessionConfig {
  readonly abilityThreshold: number;
  readonly precision: PrecisionSetting;
  readonly ageBand?: string;
  readonly perDomainMinimum: number;
  readonly recommendProbability: number;
}

export interface CreateSessionResponse {
  readonly sessionId: string;
  readonly poolSize: number;
  readonly config: ResolvedSessionConfig;
  readonly state: QbankState;
}

// ---------------------------------------------------------------------------
// GET /api/bank/sessions/:id/next
// ---------------------------------------------------------------------------

/**
 * A served item, or the news that there is not one.
 *
 * Discriminated on `done` rather than on a nullable item, so a client cannot read `served` without having
 * established there is something to read. Note that the served fields are spread at the top level rather than
 * nested under a key — that is what the handler does, and the contract records it rather than quietly wishing
 * otherwise.
 */
export type NextResponse = ({ readonly done: false } & QbankServe & { readonly state: QbankState }) | { readonly done: true; readonly state: QbankState };

// ---------------------------------------------------------------------------
// POST /api/bank/sessions/:id/answer
// ---------------------------------------------------------------------------

export interface AnswerRequest {
  /**
   * Whatever the item's own UI produced. Deliberately unconstrained: the 38 servable types were written
   * independently and do not agree on where they put the answer, and the server accepts several shapes.
   */
  readonly response: unknown;
  /** Milliseconds from item shown to answer submitted. Stored now, used by 1b.3 and 1b.4 later. */
  readonly latencyMs?: number;
}

export interface AnswerResponse {
  readonly state: QbankState;
  /**
   * Whether it was right, or **null when the host could not mark it** — which is not the same as wrong and is
   * excluded from the estimate rather than counted against the candidate.
   *
   * A caller putting this in front of a child should think twice. Every item in the catalogue declines to
   * report correctness on purpose ("NEUTRAL acknowledgment only"), and the screener surfaces exist because
   * that decision was made deliberately.
   */
  readonly correct: boolean | null;
  readonly difficulty: number | null;
}

// ---------------------------------------------------------------------------
// GET /api/bank/sessions/:id/debug
// ---------------------------------------------------------------------------

/** The operator's view. Nothing here is hidden from whoever is running the session. */
export interface DebugResponse {
  readonly seed: number;
  readonly poolSize: number;
  readonly poolUsed: number;
  readonly threshold: number;
  readonly precision: PrecisionSetting;
  readonly perDomainMinimum: number;
  readonly recommendProbability: number;
  readonly posteriorMean: number;
  readonly posteriorSd: number;
  readonly interval: readonly [number, number];
  readonly difficultyMapping: string;
  readonly attempts: readonly unknown[];
  readonly state: QbankState;
  /** The threshold expressed back on the bank's own 1-20 scale, so an operator can compare it to an item. */
  readonly thresholdInBankScale: number;
}
