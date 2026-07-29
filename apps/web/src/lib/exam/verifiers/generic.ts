import type { RawBankItem } from '../bank-loader';
import { num, type Verdict } from './types';

export type { Verdict } from './types';

/**
 * Option-key verifier — the child picked one of the item's options.
 * `correctKey` is a string option key (`"B"`) or a numeric option index.
 */
export function verifyKeyed(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const selectedKey = typeof response.selectedKey === 'string' ? response.selectedKey : null;
  const selectedIndex = num(response.selectedIndex);
  const correctKey = item.answer.correctKey;

  if (typeof correctKey === 'number') return { correct: selectedIndex === correctKey };
  if (typeof correctKey === 'string') {
    if (selectedKey !== null) return { correct: selectedKey === correctKey };
    // Some banks key by string while the demo reports an index (e.g. "3").
    if (selectedIndex !== null) return { correct: String(selectedIndex) === correctKey };
  }
  return { correct: false };
}

/**
 * Continuous-placement verifier (QUANT-NUMLINE-01, `scoring.rule =
 * 'placement_tolerance'`). Per the generator contract the child places a mark on
 * a bounded line and is correct iff the placement-absolute-error is within the
 * item's tolerance:
 *
 *     pae     = |placedRatio - answer.targetRatio|
 *     correct = pae <= answer.tolerance
 *
 * The tolerance band is server-only — the renderer never receives it, so it can
 * never show correctness. `M-PAE` is the continuous placement-error metric.
 */
export function verifyPlacementTolerance(
  item: RawBankItem,
  response: Record<string, unknown>,
): Verdict {
  const answer = item.answer as { targetRatio?: unknown; tolerance?: unknown };
  const placedRatio = num(response.placedRatio);
  const targetRatio = num(answer.targetRatio);
  const tolerance = num(answer.tolerance);
  if (placedRatio === null || targetRatio === null || tolerance === null) {
    return { correct: false };
  }
  const pae = Math.abs(placedRatio - targetRatio);
  return { correct: pae <= tolerance, metrics: { 'M-PAE': pae } };
}

/**
 * Constructed-value verifier (QUANT-BUILD-01, `scoring.rule =
 * 'constructed_value_equals_optimum'`). The child arranges cards; the response
 * carries the numeric value of the final arrangement, which must equal the
 * unique constrained optimum held server-side.
 */
export function verifyConstructedValue(
  item: RawBankItem,
  response: Record<string, unknown>,
): Verdict {
  const answer = item.answer as { optimalValue?: unknown };
  const value = num(response.value);
  const optimal = num(answer.optimalValue);
  if (value === null) return { correct: false };
  if (optimal !== null) return { correct: value === optimal };
  return { correct: String(value) === String(item.answer.correctKey) };
}
