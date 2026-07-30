import { AGE_BAND_BONUS } from './config';
import {
  availableTypesByArea,
  coverageGain,
  enforcedShortfallCount,
  underCoveredMetrics,
} from './coverage';
import { isDone } from './done';
import { NoAvailableItemError, UnknownTypeError } from './errors';
import { hashUnit } from './rng';
import {
  AREAS,
  type Area,
  type BankItem,
  type Banks,
  type ItemObservation,
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
  const gaps = underCoveredMetrics(area, state);

  const trace = state.areas[area].trace;
  const scored: Array<{ type: QuestionType; score: number }> = [];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const type of candidates) {
    const gain = coverageGain(type, gaps, state.config);
    const ageBonus = type.ageBands.includes(state.gradeBand) ? AGE_BAND_BONUS : 0;
    const score = gain + ageBonus - recencyPenalty(type.typeCode, trace, state);
    scored.push({ type, score });
    if (score > bestScore) bestScore = score;
  }
  if (scored.length === 0) return null;

  // Randomesque exposure control (Kingsbury & Zara): choose among the near-optimal types rather
  // than always the argmax. The old rule added a +-0.1 jitter to the score, which could never
  // outweigh a metric weight (1 or 2) or the age bonus (1.5), so the highest-coverage type won
  // every rotation and every session saw the same type order.
  const tolerance = Math.max(0, state.config.typeSelectionTolerance);
  const pool = scored.filter((s) => s.score >= bestScore - tolerance).map((s) => s.type);

  return pickSeeded(pool, state, `type:${area}:${state.itemsServed}`).typeCode;
}

/**
 * How much to discount a type the child has just been given, so a session does not cycle the same
 * few games. Full price when it was the last item in this area, fading to nothing once
 * `typeRecencyWindow` other items have gone by.
 *
 * This is what stops WITHIN-session repetition. A per-session seed alone varies the order between
 * children but still lets one child meet the same type every rotation, which is the complaint that
 * prompted this: the same game reappearing every fourth question.
 */
function recencyPenalty(
  typeCode: TypeCode,
  trace: readonly ItemObservation[],
  state: SessionState,
): number {
  const window = state.config.typeRecencyWindow;
  if (window <= 0 || state.config.typeRecencyPenalty <= 0) return 0;

  // Only once the area has bracketed. Before the first reversal the child is walking monotonically
  // from their grade-band seed toward their real level, and every item spent on variety instead of
  // targeting lengthens that walk — measurably so for a child seeded far above their ability, which
  // is the case D-023's convergence budget is sized for. After a reversal the estimate is
  // straddling, extra targeting precision buys little, and the variety is free.
  if (!hasReversed(trace)) return 0;

  for (let back = 0; back < Math.min(window, trace.length); back++) {
    const seen = trace[trace.length - 1 - back];
    if (seen?.typeCode === typeCode) {
      return state.config.typeRecencyPenalty * (1 - back / window);
    }
  }
  return 0;
}

/** Whether this area has seen a change of correctness — the point homing gives way to bracketing. */
function hasReversed(trace: readonly ItemObservation[]): boolean {
  for (let i = 1; i < trace.length; i++) {
    if (trace[i]?.correct !== trace[i - 1]?.correct) return true;
  }
  return false;
}

/**
 * Pick one candidate from a near-optimal pool using the session seed.
 *
 * Seeded rather than random: a session replays identically from its own `config.seed`, which the
 * audit trail depends on, while different sessions draw different orders.
 */
function pickSeeded<T extends { readonly typeCode: TypeCode } | BankItem>(
  pool: T[],
  state: SessionState,
  key: string,
): T {
  const first = pool[0] as T;
  if (pool.length === 1) return first;

  const ordered = [...pool].sort((a, b) => idOf(a).localeCompare(idOf(b)));
  const draw = hashUnit(state.config.seed, key);
  const index = Math.min(ordered.length - 1, Math.floor(draw * ordered.length));
  return ordered[index] as T;
}

function idOf(candidate: { readonly typeCode: TypeCode } | BankItem): string {
  return 'itemId' in candidate ? candidate.itemId : candidate.typeCode;
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

  let bestCost = Number.POSITIVE_INFINITY;
  for (const candidate of pool) {
    const cost = targetingCost(candidate, target, state);
    if (cost < bestCost) bestCost = cost;
  }

  // Randomesque again, in scale points this time: any item within `itemSelectionTolerance` of the
  // best-targeted one is an acceptable substitute, so the same child does not always receive the
  // single nearest item and the bank is not funnelled through one item per difficulty point.
  const tolerance = Math.max(0, state.config.itemSelectionTolerance);
  const near = pool.filter((it) => targetingCost(it, target, state) <= bestCost + tolerance);

  return toServedItem(pickSeeded(near, state, `item:${typeCode}:${state.itemsServed}`));
}

/**
 * Targeting cost of one candidate: distance from the estimate, plus `ageBandBias` scale points of
 * penalty when the item is not tagged for the child's grade band.
 */
function targetingCost(item: BankItem, target: number, state: SessionState): number {
  const penalty = item.ageBands.includes(state.gradeBand) ? 0 : state.config.ageBandBias;
  return Math.abs(item.difficulty - target) + penalty;
}
