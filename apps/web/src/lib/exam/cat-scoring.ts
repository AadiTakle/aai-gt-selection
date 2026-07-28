import {
  estimateThetaEap,
  estimateThetaMle,
  scoreItems,
  type ItemParameters,
  type RawResponse,
  type ScoredItem,
  type ScoredResponse,
} from '@gt-selection/cat-engine';

import {
  demoItemToItemParameters,
  demoResultToRawResponse,
  type ItemParamsOptions,
} from './cat-adapter';
import type { BankItem, ExamDomain } from './item';
import type { ExamItemResult } from './types';

/**
 * The RUNTIME half of the cat-adapter seam: it hands a finished demo run to
 * `@gt-selection/cat-engine` and returns the engine's own EAP/MLE theta.
 *
 * WHY A SEPARATE MODULE: `cat-adapter.ts` is deliberately, documentedly TYPE-only
 * so it can never pull a package runtime into a bundle. Actually calling the
 * engine needs a value import, so that import lives here instead of eroding the
 * adapter's purity. cat-engine is safe to bundle for the browser (pure math, no
 * `node:` imports); `@gt-selection/item-bank` is NOT (its `rng.ts` imports
 * `node:crypto`), so item-bank stays type-only in the adapter and is not reached
 * from this module.
 *
 * ADDITIVE ONLY. This computes a NEW number; it moves no existing logic. The
 * sequencer still brackets on ordinal rungs and the session shell still reports
 * `summarize()`, both untouched — nothing here feeds back into item selection,
 * ordering, or the demo's existing summary values.
 *
 * CLAIM BOUNDARY: the IRT parameters behind this theta are PROVISIONAL and
 * UNCALIBRATED (derived from ordinal design rungs — see
 * `provisionalIrtFromRung`), and every item is born-synthetic
 * (`synthetic_only=true`, `validated=false`; D-006, R9). The result is a wiring
 * demonstration, not an ability measure, not a screening score, and never an
 * admission decision (R10). It is deliberately theta/SE only: `runScoring` also
 * emits a three-band `decision`, which must not appear on a demo surface.
 */

/** Point estimate + standard error; `null` when nothing effort-valid was scored. */
export interface EngineThetaEstimate {
  theta: number | null;
  se: number | null;
}

/** Per-domain engine estimate, alongside how many responses it could use. */
export interface EngineDomainTheta extends EngineThetaEstimate {
  domain: ExamDomain;
  itemsScored: number;
  itemsEffortValid: number;
}

export interface DemoEngineEstimate {
  /** Primary: cat-engine EAP over a normal prior (robust for short strings). */
  eap: EngineThetaEstimate;
  /** Secondary cross-check: cat-engine MLE (falls back to EAP when degenerate). */
  mle: EngineThetaEstimate;
  perDomain: EngineDomainTheta[];
  itemsScored: number;
  /** Responses that passed the engine's rapid-guess / on-task effort gate. */
  itemsEffortValid: number;
  /** Always true: the parameters feeding this theta are uncalibrated stand-ins. */
  provisionalIrt: true;
  syntheticOnly: true;
  validated: false;
}

export interface DemoEngineOptions {
  /** Per-item rapid-guess RT floor (ms) handed to the engine's effort gate. */
  rapidGuessThresholdMs?: number;
}

/**
 * Rapid-guess floor for the demo's embedded tasks. A placeholder consistent with
 * the adapter test's 400 ms, not a normative threshold estimated from RT data
 * (cat-engine exposes `normativeThreshold` for that once real RTs exist).
 */
export const DEMO_RAPID_GUESS_THRESHOLD_MS = 400;

const EMPTY: EngineThetaEstimate = { theta: null, se: null };

/**
 * Only STANDING-tagged items feed theta. Dichotomous IRT needs keyed
 * correctness; Phase-2 effort tasks report process/engagement telemetry where a
 * single right-or-wrong is not the signal, so scoring them as correct/incorrect
 * would misrepresent what they measure.
 */
function standingItemsByTypeCode(bank: readonly BankItem[]): Map<string, BankItem> {
  const byType = new Map<string, BankItem>();
  for (const item of bank) {
    if (item.stage !== 'standing') continue;
    if (!byType.has(item.typeCode)) byType.set(item.typeCode, item);
  }
  return byType;
}

/** Domains in bank order, so the engine panel lists them like the standing table. */
function standingDomains(bank: readonly BankItem[]): ExamDomain[] {
  const seen: ExamDomain[] = [];
  for (const item of bank) {
    if (item.stage !== 'standing') continue;
    if (!seen.includes(item.domain)) seen.push(item.domain);
  }
  return seen;
}

function toScoredResponses(items: readonly ScoredItem[]): ScoredResponse[] {
  return items.map((i) => ({ irt: i.irt, correct: i.correct }));
}

function eapOf(items: readonly ScoredItem[]): EngineThetaEstimate {
  if (items.length === 0) return EMPTY;
  return estimateThetaEap(toScoredResponses(items));
}

function mleOf(items: readonly ScoredItem[]): EngineThetaEstimate {
  if (items.length === 0) return EMPTY;
  return estimateThetaMle(toScoredResponses(items));
}

/**
 * Score a finished (or in-progress) demo run with cat-engine.
 *
 * Results carry `typeCode`, not `itemId` (see `planFromResults`), so items are
 * resolved by type code — unique in the two-stage bank. Unresolvable, skipped,
 * and unscored results are dropped rather than guessed at.
 */
export function estimateDemoTheta(
  bank: readonly BankItem[],
  results: readonly ExamItemResult[],
  options: DemoEngineOptions = {},
): DemoEngineEstimate {
  const paramOptions: ItemParamsOptions = {
    rapidGuessThresholdMs: options.rapidGuessThresholdMs ?? DEMO_RAPID_GUESS_THRESHOLD_MS,
  };
  const byType = standingItemsByTypeCode(bank);

  const log: RawResponse[] = [];
  const params = new Map<string, ItemParameters>();
  results.forEach((result, index) => {
    const item = byType.get(result.typeCode);
    if (!item) return;
    const raw = demoResultToRawResponse(result, { itemId: item.itemId, order: index + 1 });
    if (!raw) return;
    log.push(raw);
    params.set(item.itemId, demoItemToItemParameters(item, paramOptions));
  });

  const scored = scoreItems(log, params);
  const effortValid = scored.filter((i) => i.effortValid);

  const perDomain: EngineDomainTheta[] = standingDomains(bank).map((domain) => {
    const inDomain = scored.filter((i) => i.domain === domain);
    const valid = inDomain.filter((i) => i.effortValid);
    return {
      domain,
      ...eapOf(valid),
      itemsScored: inDomain.length,
      itemsEffortValid: valid.length,
    };
  });

  return {
    eap: eapOf(effortValid),
    mle: mleOf(effortValid),
    perDomain,
    itemsScored: scored.length,
    itemsEffortValid: effortValid.length,
    provisionalIrt: true,
    syntheticOnly: true,
    validated: false,
  };
}
