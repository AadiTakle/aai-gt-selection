import type {
  IrtParameters as EngineIrtParameters,
  ItemParameters,
  RawResponse,
} from '@gt-selection/cat-engine';
import type { ExamItem, PersistedResponse } from '@gt-selection/contracts';
import type { BankItem as SpecBankItem } from '@gt-selection/item-bank';

/**
 * Thin, pure mapping seam: contract-shaped exam data (and the standardized
 * item-bank spec item) -> the portable `@gt-selection/cat-engine` scoring inputs
 * (`RawResponse` / `ItemParameters`).
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
 * into a bundle. The engine's runtime is exercised by callers/tests, not here.
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
