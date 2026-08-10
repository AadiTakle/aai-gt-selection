import type { DomainName } from './domains.js';

/** How a record says it should be marked. Only the first can be scored without a solver. */
export type ScoringMode = 'deterministic_key' | 'computed_solver' | 'model_judge_deferred';

/**
 * Item parameters in the ability metric, stored rather than derived.
 *
 * The compiler currently fills these from a linear rescale of the authoring difficulty, which is
 * an assumption and not a calibration. Storing them per item and per revision is what makes the
 * assumption replaceable: once real responses exist, calibration writes new values here and every
 * affected session can be replayed against them.
 */
export interface ItemParameters {
  /** Difficulty, in logits. */
  readonly b: number;
  /** Discrimination. */
  readonly a: number;
  /** Lower asymptote, pinned to 1 / optionCount. */
  readonly c: number;
}

export interface RegistryItem {
  readonly itemId: string;
  readonly typeCode: string;
  readonly revision: number;
  readonly domain: DomainName;
  /** On the bank's own 1 to 20 authoring scale. `params.b` is the same quantity in logits. */
  readonly difficulty: number;
  readonly params: ItemParameters;
  readonly optionCount: number;
  readonly ageBands: readonly string[];
  readonly scoringMode: ScoringMode;
  /** Everything a renderer needs. Never an answer. */
  readonly content: Record<string, unknown>;
  readonly syntheticOnly: boolean;
  readonly validated: boolean;
  readonly calibrated: boolean;
}

/** What crosses to an app. No parameters, no revision, no scoring mode, and no key. */
export interface ServedQuestion {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: DomainName;
  readonly difficulty: number;
  readonly ageBands: readonly string[];
  readonly optionCount: number;
  readonly content: Record<string, unknown>;
}

/**
 * Keys that must never reach a client, scrubbed at any depth.
 *
 * The registry already excludes answers by construction, so this is a second net rather than the
 * primary control. It is here because the 53 bank types were authored independently and a single
 * one of them putting a key inside `content` would otherwise leak silently. If this ever removes a
 * field a renderer needed, that renderer breaks visibly, which is the failure mode to prefer.
 */
const FORBIDDEN_CONTENT_KEYS: readonly string[] = [
  'answer',
  'answerKey',
  'correctKey',
  'correct',
  'solution',
  'distractorRationales',
];

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_CONTENT_KEYS.includes(key)) continue;
    out[key] = scrub(inner);
  }
  return out;
}

export function scrubContent(content: Record<string, unknown>): Record<string, unknown> {
  return scrub(content) as Record<string, unknown>;
}

export function toServedQuestion(item: RegistryItem): ServedQuestion {
  return {
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain,
    difficulty: item.difficulty,
    ageBands: item.ageBands,
    optionCount: item.optionCount,
    content: scrubContent(item.content),
  };
}
