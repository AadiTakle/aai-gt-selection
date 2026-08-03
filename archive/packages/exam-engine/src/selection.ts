import { AGE_BAND_BONUS } from './config';
import {
  availableTypesByArea,
  coverageGain,
  enforcedShortfallCount,
  underCoveredMetrics,
} from './coverage';
import { isDone } from './done';
import { NoAvailableItemError, UnknownTypeError } from './errors';
import {
  beliefFor,
  beliefMean,
  beliefSd,
  expectedPosteriorVariance,
  fisherInformation,
  modelOf,
} from './posterior';
import { hashUnit } from './rng';
import {
  AREAS,
  type Area,
  type AreaState,
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
 * Choose the next question type: an area first (see {@link pickArea}), then a type within it.
 *
 * A type's score is what it closes on under-covered core metrics, plus a bonus when its `ageBands`
 * include the child's grade band, plus a bonus when the area has not drawn from it before, less a
 * discount for having been served recently. The last two are the diversity terms: novelty widens
 * how many task formats an area's estimate rests on, recency spaces out the ones already met.
 * Neither can outrank an enforced coverage shortfall, which is the gap the stop rule is gated on.
 *
 * Returns `null` when the session is done or nothing is left to serve.
 */
export function nextType(state: SessionState, banks: Banks): TypeCode | null {
  if (isDone(state)) return null;

  const byArea = availableTypesByArea(state, banks);
  const areasWithItems = AREAS.filter((a) => (byArea.get(a)?.length ?? 0) > 0);
  if (areasWithItems.length === 0) return null;

  const area = pickArea(areasWithItems, state);
  const candidates = byArea.get(area) ?? [];
  const gaps = underCoveredMetrics(area, state);

  const areaState = state.areas[area];
  const trace = areaState.trace;
  const drawnFrom = new Set(trace.map((o) => o.typeCode));

  const scored: Array<{ type: QuestionType; score: number }> = [];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const type of candidates) {
    const gain = coverageGain(type, gaps, state.config);
    const ageBonus = type.ageBands.includes(state.gradeBand) ? AGE_BAND_BONUS : 0;
    const novelty = drawnFrom.has(type.typeCode) ? 0 : Math.max(0, state.config.typeNoveltyBonus);
    const score = gain + ageBonus + novelty - recencyPenalty(type.typeCode, trace, state);
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

/**
 * How far past the least-served area the area choice may reach.
 *
 * Clamped against `evenSpreadTolerance` rather than trusted as configured, because an area is only
 * ever served while it is within `slack` of the minimum and can therefore only ever finish
 * `slack + 1` ahead of it. Holding `slack + 1 <= evenSpreadTolerance` makes `coverageIsEven` — one
 * of the four gates the stop rule needs — unbreachable by this rule at any setting, so a
 * mis-configured knob cannot turn every battery into a run to the safety cap.
 */
function areaSlack(state: SessionState): number {
  // Under `staircase` there is no uncertainty to spend the slack ON, so spending it would only
  // unbalance the spread in favour of a coverage count or a jitter. Pinning it at 0 there keeps
  // that rule byte-identical to the strict rotation it shipped as.
  if (!usesBelief(state.config)) return 0;
  const configured = Math.max(0, Math.floor(state.config.areaSpreadSlack));
  return Math.min(configured, Math.max(0, state.config.evenSpreadTolerance - 1));
}

/**
 * Pick the area to serve next.
 *
 * Eligibility is still an item-count rule: an area qualifies while it is within `areaSpreadSlack`
 * of the least-served one. Among those, the next item goes to the area whose belief is WIDEST —
 * the one the session still knows least about — then to the neediest on enforced coverage, then to
 * a seeded jitter.
 *
 * The uncertainty term is what makes this more than a rotation. Two areas of equal length are not
 * equally well measured: an area whose early items were badly aimed carries a fraction of the
 * information an equally-long, well-aimed area does, and an item-count rule cannot see the
 * difference. Ranking on the belief's SD spends the next question where it buys the most.
 *
 * Under `staircase` there is no belief to rank on, so the strict rotation is kept and this reduces
 * to the previous rule exactly.
 */
function pickArea(areasWithItems: Area[], state: SessionState): Area {
  const slack = areaSlack(state);
  let fewest = Number.POSITIVE_INFINITY;
  for (const area of areasWithItems) {
    fewest = Math.min(fewest, state.areas[area].itemsSeen.size);
  }
  const eligible = areasWithItems.filter(
    (area) => state.areas[area].itemsSeen.size <= fewest + slack,
  );

  const uncertaintyOf = (area: Area): number =>
    usesBelief(state.config) ? beliefSd(beliefFor(state, area)) : 0;

  // Ranked WITHIN the eligible set, so item count decides who may be served and uncertainty
  // decides which of them is. Item count is deliberately absent from the comparison itself: with
  // it there, the least-served area would always win and the slack would never be spent.
  let best = eligible[0] as Area;
  let bestSd = uncertaintyOf(best);
  let bestNeed = enforcedShortfallCount(best, state);
  let bestJitter = hashUnit(state.config.seed, `area:${best}:${state.itemsServed}`);

  for (let i = 1; i < eligible.length; i++) {
    const area = eligible[i] as Area;
    const areaSd = uncertaintyOf(area);
    const need = enforcedShortfallCount(area, state);
    const jitter = hashUnit(state.config.seed, `area:${area}:${state.itemsServed}`);

    const wins =
      areaSd > bestSd ||
      (areaSd === bestSd && (need > bestNeed || (need === bestNeed && jitter < bestJitter)));

    if (wins) {
      best = area;
      bestSd = areaSd;
      bestNeed = need;
      bestJitter = jitter;
    }
  }

  return best;
}

/**
 * Choose the next unseen item of this type.
 *
 * Under `mepv` this is the item whose answer is expected to shrink the area's belief most,
 * whichever way it is answered — the formal version of "narrow the range as fast as possible".
 * Under `staircase` it is the item whose difficulty is closest to the area's running estimate.
 * Both are restricted to the `±difficultyWindow` around the current estimate and both prefer an
 * item whose age band matches the child's. Returns a `ServedItem` (server-only fields stripped).
 */
export function nextItem(state: SessionState, typeCode: TypeCode, banks: Banks): ServedItem {
  const type = banks.types.find((t) => t.typeCode === typeCode);
  if (!type) throw new UnknownTypeError(typeCode);

  const areaState = state.areas[type.domain];

  const unseen = banks.items.filter(
    (it) => it.typeCode === typeCode && !areaState.itemsSeen.has(it.itemId),
  );
  if (unseen.length === 0) throw new NoAvailableItemError(typeCode);

  const near = usesBelief(state.config)
    ? mostInformative(unseen, state, type.domain)
    : nearestToEstimate(withinWindow(unseen, areaState.difficulty, state), areaState, state);

  return toServedItem(pickSeeded(near, state, `item:${typeCode}:${state.itemsServed}`));
}

/** Whether the configured rule needs the live belief, as opposed to the staircase's point estimate. */
export function usesBelief(config: SessionState['config']): boolean {
  return config.selectionRule !== 'staircase';
}

/**
 * Candidates inside the selection window, falling back to the whole unseen pool when the window is
 * empty. Applied under both rules: it bounds how far off-target a thin bank can push an item, and
 * under `mepv` it also bounds how many candidates the expected-variance calculation runs over.
 */
function withinWindow(
  unseen: readonly BankItem[],
  target: number,
  state: SessionState,
): readonly BankItem[] {
  const within = unseen.filter(
    (it) => Math.abs(it.difficulty - target) <= state.config.difficultyWindow,
  );
  return within.length > 0 ? within : unseen;
}

/** The `staircase` rule: nearest difficulty to the running estimate, age band breaking ties. */
function nearestToEstimate(
  pool: readonly BankItem[],
  areaState: AreaState,
  state: SessionState,
): BankItem[] {
  const target = areaState.difficulty;

  let bestCost = Number.POSITIVE_INFINITY;
  for (const candidate of pool) {
    const cost = targetingCost(candidate, target, state);
    if (cost < bestCost) bestCost = cost;
  }

  // Randomesque, in scale points: any item within `itemSelectionTolerance` of the best-targeted one
  // is an acceptable substitute, so the same child does not always receive the single nearest item
  // and the bank is not funnelled through one item per difficulty point.
  const tolerance = Math.max(0, state.config.itemSelectionTolerance);
  return pool.filter((it) => targetingCost(it, target, state) <= bestCost + tolerance);
}

/**
 * The belief-driven rules: the items that would teach the most, by whichever criterion is
 * configured.
 *
 * Every criterion is expressed as a COST to be minimised, so one tolerance and one tie-break serve
 * all three:
 *
 *   `mfi`  — reciprocal Fisher information at the belief's mean, the cheap rule and the default.
 *   `mepv` — expected posterior variance after the answer, the expensive comparison arm.
 *   `cut`  — reciprocal Fisher information at the decision point, ignoring the child entirely.
 *
 * The age-band preference is applied as a filter INSIDE the tolerance band rather than as a
 * penalty added to the objective, which is the only way to keep D-025's bargain intact once the
 * objective stops being measured in difficulty points. D-025 priced the band at half a scale point
 * so it could decide between comparably-targeted items without ever buying a large targeting
 * error; here the band chooses only among items already within `mepvTolerance` of the best, so
 * what it can cost is bounded by that fraction and by nothing else.
 */
function mostInformative(unseen: readonly BankItem[], state: SessionState, area: Area): BankItem[] {
  const config = state.config;
  const model = modelOf(config);
  const belief = beliefFor(state, area);

  // `cut` aims at the decision point, so its window must be centred there too — a window around
  // the child would exclude the items the rule exists to serve for anyone far from the cut.
  const aimedAt =
    config.selectionRule === 'cut' ? (config.decisionCut ?? beliefMean(belief)) : null;
  const pool = withinWindow(unseen, aimedAt ?? state.areas[area].difficulty, state);

  const cost = (difficulty: number): number => {
    if (config.selectionRule === 'mepv') {
      return expectedPosteriorVariance(belief, difficulty, model);
    }
    const at = aimedAt ?? beliefMean(belief);
    const information = fisherInformation(at, difficulty, model);
    return information > 0 ? 1 / information : Number.POSITIVE_INFINITY;
  };

  let best = Number.POSITIVE_INFINITY;
  const costs = new Map<string, number>();
  for (const candidate of pool) {
    const value = cost(candidate.difficulty);
    costs.set(candidate.itemId, value);
    if (value < best) best = value;
  }

  const tolerance = Math.max(0, config.mepvTolerance);
  const admissible = pool.filter(
    (it) => (costs.get(it.itemId) as number) <= best * (1 + tolerance),
  );

  const bandMatched = admissible.filter((it) => it.ageBands.includes(state.gradeBand));
  return bandMatched.length > 0 ? bandMatched : admissible;
}

/**
 * Targeting cost of one candidate: distance from the estimate, plus `ageBandBias` scale points of
 * penalty when the item is not tagged for the child's grade band.
 */
function targetingCost(item: BankItem, target: number, state: SessionState): number {
  const penalty = item.ageBands.includes(state.gradeBand) ? 0 : state.config.ageBandBias;
  return Math.abs(item.difficulty - target) + penalty;
}
