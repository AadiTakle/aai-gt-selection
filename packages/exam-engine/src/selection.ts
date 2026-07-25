import { AGE_BAND_BONUS } from './config';
import {
  availableTypesByArea,
  enforcedShortfallCount,
  underCoveredWeights,
} from './coverage';
import { isDone } from './done';
import { NoAvailableItemError, UnknownTypeError } from './errors';
import { hashUnit } from './rng';
import {
  AREAS,
  type Area,
  type BankItem,
  type Banks,
  type QuestionType,
  type ServedItem,
  type SessionState,
  type TypeCode,
} from './types';

/** Strip the server-only fields to produce what the browser is allowed to receive. */
export function toServedItem(item: BankItem): ServedItem {
  return {
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain,
    difficulty: item.difficulty,
    ageBands: item.ageBands,
    content: item.content,
    syntheticOnly: item.syntheticOnly,
    validated: item.validated,
  };
}

/**
 * Choose the next question type. Keeps an even spread across the four areas (fewest-items-seen
 * area first), then within that area prefers types that fill under-covered core metrics and whose
 * `ageBands` include the current grade band. Returns `null` when the session is done or nothing is
 * left to serve.
 */
export function nextType(state: SessionState, banks: Banks): TypeCode | null {
  if (isDone(state)) return null;

  const byArea = availableTypesByArea(state, banks);
  const areasWithItems = AREAS.filter((a) => (byArea.get(a)?.length ?? 0) > 0);
  if (areasWithItems.length === 0) return null;

  const area = pickArea(areasWithItems, state);
  const candidates = byArea.get(area) ?? [];
  const weights = underCoveredWeights(area, state);

  let best: QuestionType | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const type of candidates) {
    let gain = 0;
    for (const metricId of type.metrics) gain += weights.get(metricId) ?? 0;
    const ageBonus = type.ageBands.includes(state.gradeBand) ? AGE_BAND_BONUS : 0;
    const jitter = hashUnit(state.config.seed, `type:${type.typeCode}:${state.itemsServed}`) * 0.1;
    const score = gain + ageBonus + jitter;

    if (
      best === null ||
      score > bestScore ||
      (score === bestScore && type.typeCode < best.typeCode)
    ) {
      best = type;
      bestScore = score;
    }
  }

  return best === null ? null : best.typeCode;
}

/** Pick the area to serve next: fewest items seen, then neediest, then area order, then jitter. */
function pickArea(areasWithItems: Area[], state: SessionState): Area {
  let best = areasWithItems[0] as Area;
  let bestSeen = state.areas[best].itemsSeen.size;
  let bestNeed = enforcedShortfallCount(best, state);
  let bestJitter = hashUnit(state.config.seed, `area:${best}:${state.itemsServed}`);

  for (let i = 1; i < areasWithItems.length; i++) {
    const area = areasWithItems[i] as Area;
    const seen = state.areas[area].itemsSeen.size;
    const need = enforcedShortfallCount(area, state);
    const jitter = hashUnit(state.config.seed, `area:${area}:${state.itemsServed}`);

    // Lower items-seen wins (even spread); then higher need; then jitter for a stable, seeded tie-break.
    if (
      seen < bestSeen ||
      (seen === bestSeen && need > bestNeed) ||
      (seen === bestSeen && need === bestNeed && jitter < bestJitter)
    ) {
      best = area;
      bestSeen = seen;
      bestNeed = need;
      bestJitter = jitter;
    }
  }

  return best;
}

/**
 * Choose the unseen bank item whose difficulty is closest to the student's current difficulty in
 * the type's area. Prefers items inside the `±difficultyWindow` and whose age band matches the
 * current grade band. Returns a `ServedItem` (server-only fields stripped).
 */
export function nextItem(state: SessionState, typeCode: TypeCode, banks: Banks): ServedItem {
  const type = banks.types.find((t) => t.typeCode === typeCode);
  if (!type) throw new UnknownTypeError(typeCode);

  const areaState = state.areas[type.domain];
  const target = areaState.difficulty;

  const unseen = banks.items.filter(
    (it) => it.typeCode === typeCode && !areaState.itemsSeen.has(it.itemId),
  );
  if (unseen.length === 0) throw new NoAvailableItemError(typeCode);

  const within = unseen.filter(
    (it) => Math.abs(it.difficulty - target) <= state.config.difficultyWindow,
  );
  const pool = within.length > 0 ? within : unseen;

  let best = pool[0] as BankItem;
  for (let i = 1; i < pool.length; i++) {
    const candidate = pool[i] as BankItem;
    if (itemIsBetter(candidate, best, target, state)) best = candidate;
  }

  return toServedItem(best);
}

/** Ordering for item selection: age-band match, then closeness to target, then seeded id tie-break. */
function itemIsBetter(a: BankItem, b: BankItem, target: number, state: SessionState): boolean {
  const aMatch = a.ageBands.includes(state.gradeBand) ? 0 : 1;
  const bMatch = b.ageBands.includes(state.gradeBand) ? 0 : 1;
  if (aMatch !== bMatch) return aMatch < bMatch;

  const aDist = Math.abs(a.difficulty - target);
  const bDist = Math.abs(b.difficulty - target);
  if (aDist !== bDist) return aDist < bDist;

  const aJit = hashUnit(state.config.seed, `item:${a.itemId}`);
  const bJit = hashUnit(state.config.seed, `item:${b.itemId}`);
  if (aJit !== bJit) return aJit < bJit;

  return a.itemId < b.itemId;
}
