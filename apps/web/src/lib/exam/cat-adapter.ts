import type {
  IrtParameters as EngineIrtParameters,
  ItemParameters,
  RawResponse,
} from '@gt-selection/cat-engine';
import type { ExamItem, PersistedResponse } from '@gt-selection/contracts';
import type { BankItem as SpecBankItem } from '@gt-selection/item-bank';

import type { BankItem as DemoBankItem } from './item';
import type { ExamItemResult } from './types';

/**
 * Thin, pure mapping seam: contract-shaped exam data (the standardized item-bank
 * spec item, and the UI-local demo bank item) -> the portable
 * `@gt-selection/cat-engine` scoring inputs (`RawResponse` / `ItemParameters`).
 *
 * WIRING ONLY — this moves no scoring math. cat-engine still owns every formula
 * (theta EAP, effort/rapid-guess gate, fit index, replay fingerprint); this
 * layer only renames/reshapes fields so a contract response log + item set can be
 * handed to `runScoring` / `verifyReplay` unchanged. It exists because cat-engine
 * is a deliberately dependency-free Lambda payload that declares its own numeric
 * contracts instead of importing `@gt-selection/contracts`; the adapter is the
 * agreed seam between the two model families.
 *
 * Every external import is a TYPE import, so this module carries no runtime
 * dependency and cannot pull a package's runtime (e.g. item-bank's node:crypto)
 * into a bundle. The engine's runtime is exercised by callers/tests, not here —
 * see `cat-scoring.ts`, the runtime half of this seam, which is the only module
 * allowed to import cat-engine's functions.
 *
 * Born-synthetic end to end: the engine stamps `synthetic_only=true`,
 * `validated=false` on its output (D-006, R9); this layer asserts no new claim.
 */

/** Neutral provisional 2PL used when a contract item carries no pinned IRT. */
const DEFAULT_ENGINE_IRT: EngineIrtParameters = { a: 1, b: 0, c: 0, model: '2PL' };

export interface ItemParamsOptions {
  /** Per-item rapid-guess RT floor (ms); the engine discounts faster responses. */
  rapidGuessThresholdMs: number;
  /** IRT to use when a contract item has none (classical/rubric/…); default 2PL. */
  fallbackIrt?: EngineIrtParameters;
}

/** Contract 2PL/3PL IRT block -> engine IRT shape (models are a subset). */
function contractIrtToEngine(irt: NonNullable<ExamItem['irt']>): EngineIrtParameters {
  return { a: irt.a, b: irt.b, c: irt.c, model: irt.model };
}

/** item-bank spec IRT block -> engine IRT shape (`Rasch` collapses to `1PL`). */
function specIrtToEngine(irt: SpecBankItem['irt']): EngineIrtParameters {
  return { a: irt.a, b: irt.b, c: irt.c, model: irt.model === 'Rasch' ? '1PL' : irt.model };
}

/**
 * Map a DB-stored contract response (`persistedResponseSchema`) to a cat-engine
 * `RawResponse`. Correctness + engagement are carried through; the engine
 * re-derives the effort gate and normalized score from the pinned parameters.
 */
export function toRawResponse(response: PersistedResponse): RawResponse {
  return {
    itemId: response.itemId,
    order: response.orderNo,
    rtMs: response.rtMs,
    correct: response.correct,
    onTask: response.engaged,
  };
}

/** Map a contract `ExamItem` to pinned cat-engine `ItemParameters`. */
export function toItemParameters(item: ExamItem, options: ItemParamsOptions): ItemParameters {
  return {
    itemId: item.itemId,
    domain: item.domain,
    irt: item.irt !== null ? contractIrtToEngine(item.irt) : (options.fallbackIrt ?? DEFAULT_ENGINE_IRT),
    difficultyLevel: item.difficultyLevel ?? 0,
    rapidGuessThresholdMs: options.rapidGuessThresholdMs,
  };
}

/**
 * Map an item-bank spec `BankItem` (the richest superset item shape, spec §6.1)
 * to pinned cat-engine `ItemParameters`, so the standardized bank can feed the
 * same scoring engine without either package importing the other's runtime.
 */
export function specItemToItemParameters(
  item: SpecBankItem,
  options: ItemParamsOptions,
): ItemParameters {
  return {
    itemId: item.itemId,
    domain: item.domain,
    irt: specIrtToEngine(item.irt),
    difficultyLevel: item.difficultyLevel,
    rapidGuessThresholdMs: options.rapidGuessThresholdMs,
  };
}

// --- Demo bank (UI-local `item.ts` model) -> engine inputs -------------------

/**
 * PROVISIONAL, UNCALIBRATED 2PL derived from an item's ordinal DESIGN RUNG.
 *
 * The demo bank carries `difficultyLevel` only — an ordinal authoring rung
 * (1..20, EXAM_ITEM_SCHEMA_SPEC §6.6), explicitly NOT calibrated IRT difficulty.
 * Nothing in this repo has been calibrated, so instead of hand-writing per-item
 * `a`/`b`/`c` numbers (which would look like calibration output), the rung is put
 * through one documented monotone transform with discrimination pinned at 1:
 *
 *   b = (rung - RUNG_CENTER) / RUNGS_PER_LOGIT,  a = 1,  c = 0
 *
 * The constants are arbitrary scale choices, not estimates: they only place the
 * bank's 1..20 rungs across a conventional theta range so the engine's EAP has a
 * defined input. Any theta produced from these parameters is a PROVISIONAL,
 * uncalibrated number (`validated=false`) — it is not an ability measure, not a
 * screening score, and never an admission decision (R10). Replace this function
 * with pinned, calibrated parameters before any theta is reported as a measure.
 */
export const PROVISIONAL_RUNG_CENTER = 10;
export const PROVISIONAL_RUNGS_PER_LOGIT = 4;

export function provisionalIrtFromRung(difficultyLevel: number): EngineIrtParameters {
  return {
    a: 1,
    b: (difficultyLevel - PROVISIONAL_RUNG_CENTER) / PROVISIONAL_RUNGS_PER_LOGIT,
    c: 0,
    model: '2PL',
  };
}

/**
 * Map a demo `BankItem` to engine `ItemParameters`. The demo bank has no pinned
 * IRT, so `options.fallbackIrt` (if given) or {@link provisionalIrtFromRung}
 * supplies it — never a calibrated value.
 */
export function demoItemToItemParameters(
  item: DemoBankItem,
  options: ItemParamsOptions,
): ItemParameters {
  return {
    itemId: item.itemId,
    domain: item.domain,
    irt: options.fallbackIrt ?? provisionalIrtFromRung(item.difficultyLevel),
    difficultyLevel: item.difficultyLevel,
    rapidGuessThresholdMs: options.rapidGuessThresholdMs,
  };
}

/**
 * Harvested accuracy at or above which a demo result is handed to the engine as
 * `correct`. The demo's self-scoring embedded items report a FRACTIONAL `M-ACC`
 * rather than a keyed right/wrong, so dichotomous IRT needs a legible cut. 0.5 =
 * "cleared at least half"; it reduces to exact 1/0 for keyed items. Mirrors the
 * same honest, uncalibrated cut the sequencer's bracket uses, but is a separate
 * constant: this value feeds SCORING only and must never influence sequencing.
 */
export const DEMO_CORRECT_THRESHOLD = 0.5;

export interface DemoResponseContext {
  /** Bank item the result came from (`ExamItemResult` stores `typeCode`, not id). */
  itemId: string;
  /** 1-based administration order across the session. */
  order: number;
}

/**
 * Map a stored demo `ExamItemResult` to a cat-engine `RawResponse`, or `null`
 * when the result is not scorable (skipped, or no harvested accuracy).
 *
 * An unknown response time is passed through as `0`, which the engine's RTE
 * floor classifies as a rapid guess and therefore excludes from theta. That is
 * deliberate: a missing latency is treated as unusable rather than replaced with
 * an invented one.
 */
export function demoResultToRawResponse(
  result: ExamItemResult,
  context: DemoResponseContext,
): RawResponse | null {
  if (result.skipped || result.accuracy == null) return null;
  return {
    itemId: context.itemId,
    order: context.order,
    rtMs: result.responseTimeMs ?? 0,
    correct: result.accuracy >= DEMO_CORRECT_THRESHOLD,
    onTask: true,
  };
}

/**
 * Convenience: map a whole contract response log + item set into the `{ log,
 * items }` subset of a cat-engine `ReplayInput`, ready to combine with a policy
 * + seed for `runScoring` / `verifyReplay`.
 */
export function toEngineInputs(
  responses: readonly PersistedResponse[],
  items: readonly ExamItem[],
  options: ItemParamsOptions,
): { log: RawResponse[]; items: ItemParameters[] } {
  return {
    log: responses.map(toRawResponse),
    items: items.map((item) => toItemParameters(item, options)),
  };
}
