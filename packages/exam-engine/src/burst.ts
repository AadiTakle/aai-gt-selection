/**
 * Back-to-back bursts of the same question type.
 *
 * THE PROBLEM. Every type opens with an instruction the child has to read before they can answer
 * anything. For a type whose response is a single tap, that fixed cost dominates: the child spends
 * most of the item reading how to answer rather than answering. Serving one such item and rotating
 * to a different type pays the instruction cost again on the very next item.
 *
 * THE FIX. Stay on the type for several consecutive items, reusing the instruction already read.
 *
 * WHAT THIS IS NOT. It is not a fixed mini-set. The engine's normal loop already re-targets every
 * selection at the area's live estimate, and `update` moves that estimate after every item, so
 * simply *not rotating the type* makes the second and later items of a burst adapt to how the
 * earlier ones went — the same bracketing staircase as the main loop, running inside one type.
 * There is no second targeting rule here and no second ability estimate; {@link burstLengthFor}
 * only decides HOW MANY consecutive items to take from the type that `nextType` already chose.
 *
 * WHICH TYPES QUALIFY. Derived, not hand-listed — see {@link classifyTypeSpeed}. This repository
 * holds no measured per-child response times for any type, so the classification runs off the
 * machine-readable structure of the items themselves plus the measurements a type declares.
 */
import { typeHasUnseenItem } from './coverage';
import { isDone } from './done';
import { nextType } from './selection';
import type { BankItem, Banks, BurstPolicy, QuestionType, SessionState, TypeCode } from './types';

/**
 * Item-content fields that bound or extend the RESPONSE rather than the stimulus: an explicit time
 * budget, an explicit refusal to time the response, a paced multi-step stream, or a program the
 * child assembles. Any of these means the response itself takes real time, so instruction reading
 * is not the dominant cost and the type is not a burst candidate.
 *
 * `exposureMs` is deliberately absent. It bounds how long the STIMULUS is visible, after which the
 * response is a single forced choice — that is evidence for a fast type, not against one.
 */
const SLOW_RESPONSE_CONTENT_FIELDS: readonly string[] = [
  'timeBudgetSec',
  'responseUntimed',
  'paceMs',
  'responseWindowMs',
  'streamLength',
  'instructionSet',
];

/**
 * Measurements only a multi-step manipulation can produce. A type declaring one of these is
 * reporting on a solution PROCESS with intermediate states, so its response is a sequence of moves
 * rather than a single choice.
 */
const PROCESS_METRIC_IDS: readonly string[] = ['M-PATH', 'M-EFF', 'M-PLANFUL', 'M-IDEAFLU'];

/** Why a type was or was not classified fast. Carried so the decision can be printed and audited. */
export interface TypeSpeedVerdict {
  readonly typeCode: TypeCode;
  readonly fast: boolean;
  /** Human-readable evidence for the verdict. */
  readonly reason: string;
  /** Largest option count seen across the type's items; `null` when no item offers options. */
  readonly maxOptions: number | null;
  /** Response-bounding content fields found, if any. */
  readonly slowFields: readonly string[];
  /** Process measurements declared, if any. */
  readonly processMetrics: readonly string[];
}

function optionCount(item: BankItem): number | null {
  const options = (item.content as { options?: unknown }).options;
  return Array.isArray(options) ? options.length : null;
}

/**
 * Classify one type as fast (instruction-bound) or not, from the structure of its own items.
 *
 * A type is fast when all three hold:
 *
 *  1. **Every** item is a bounded choice — it offers an `options` array, and no item offers more
 *     than `maxOptions` of them. A choice among a handful of visible candidates is answered with
 *     one tap; a construction, a free response, or a twenty-way choice is not.
 *  2. No item carries a field that bounds or extends the response
 *     ({@link SLOW_RESPONSE_CONTENT_FIELDS}).
 *  3. The type declares no process measurement that requires intermediate moves
 *     ({@link PROCESS_METRIC_IDS}).
 *
 * Requiring EVERY item to qualify is deliberate: a burst can land on any item in the pool, so a
 * type is only safe to burst if its whole bank is fast. One paced or constructed item disqualifies
 * the type.
 *
 * CLAIM BOUNDARY. This is a structural proxy for "instruction reading dominates this item", not a
 * measured response time. No per-child response-time distribution exists for any type here, so
 * nothing in this classification is calibrated; it is a design decision over a born-synthetic bank,
 * and the observed `M-RT` / `M-RTFIRST` split is the evidence that would confirm or refute it.
 */
export function classifyTypeSpeed(
  type: QuestionType,
  items: readonly BankItem[],
  policy: BurstPolicy,
): TypeSpeedVerdict {
  const slowFields = new Set<string>();
  let maxOptions: number | null = null;
  let itemsWithoutOptions = 0;

  for (const item of items) {
    for (const field of SLOW_RESPONSE_CONTENT_FIELDS) {
      if (field in item.content) slowFields.add(field);
    }
    const count = optionCount(item);
    if (count === null) itemsWithoutOptions += 1;
    else if (maxOptions === null || count > maxOptions) maxOptions = count;
  }

  const processMetrics = type.metrics.filter((m) => PROCESS_METRIC_IDS.includes(m));
  const base = {
    typeCode: type.typeCode,
    maxOptions,
    slowFields: [...slowFields].sort(),
    processMetrics,
  };

  if (items.length === 0) {
    return { ...base, fast: false, reason: 'no items in bank' };
  }
  if (itemsWithoutOptions > 0) {
    return {
      ...base,
      fast: false,
      reason: `${itemsWithoutOptions}/${items.length} items are not a bounded choice (no options array)`,
    };
  }
  if (maxOptions !== null && maxOptions > policy.maxOptions) {
    return {
      ...base,
      fast: false,
      reason: `up to ${maxOptions} options, above the ${policy.maxOptions}-option bound`,
    };
  }
  if (slowFields.size > 0) {
    return {
      ...base,
      fast: false,
      reason: `response is bounded or paced by ${base.slowFields.join(', ')}`,
    };
  }
  if (processMetrics.length > 0) {
    return {
      ...base,
      fast: false,
      reason: `declares process measurement(s) ${processMetrics.join(', ')}, so the response is a sequence of moves`,
    };
  }

  return {
    ...base,
    fast: true,
    reason: `every item is one choice of at most ${maxOptions ?? 0}, unpaced, no process measurement`,
  };
}

/** Classify every wired type in `banks`. Pure; the map is keyed by type code. */
export function classifyBankSpeed(
  banks: Banks,
  policy: BurstPolicy,
): Map<TypeCode, TypeSpeedVerdict> {
  const byType = new Map<TypeCode, BankItem[]>();
  for (const item of banks.items) {
    const list = byType.get(item.typeCode);
    if (list) list.push(item);
    else byType.set(item.typeCode, [item]);
  }

  const verdicts = new Map<TypeCode, TypeSpeedVerdict>();
  for (const type of banks.types) {
    verdicts.set(type.typeCode, classifyTypeSpeed(type, byType.get(type.typeCode) ?? [], policy));
  }
  return verdicts;
}

/** The set of type codes that qualify for bursting, for a given bank and policy. */
export function fastTypeCodes(banks: Banks, policy: BurstPolicy): Set<TypeCode> {
  const fast = new Set<TypeCode>();
  for (const [typeCode, verdict] of classifyBankSpeed(banks, policy)) {
    if (verdict.fast) fast.add(typeCode);
  }
  return fast;
}

/** Unseen items of `typeCode` remaining in its own area. */
function unseenCount(state: SessionState, typeCode: TypeCode, banks: Banks): number {
  const type = banks.types.find((t) => t.typeCode === typeCode);
  if (!type) return 0;
  const seen = state.areas[type.domain].itemsSeen;
  let count = 0;
  for (const item of banks.items) {
    if (item.typeCode === typeCode && !seen.has(item.itemId)) count += 1;
  }
  return count;
}

/**
 * How many consecutive items to serve from `typeCode`, starting now.
 *
 * `1` means no burst — the ordinary one-item-then-rotate behaviour, and what a non-fast type or a
 * disabled policy always gets. Bounded by four things, each a real constraint rather than a taste:
 *
 *  - the configured `maxLength`, so burst length is policy, not code;
 *  - the type's remaining unseen items, since the engine never repeats an item;
 *  - the items left before `hardItemCap`, so a burst can never overshoot the cap;
 *  - whether the type is fast at all.
 *
 * Note what is NOT bounded here: area balance. `nextType` always serves the area with the fewest
 * items seen, so a burst that puts one area ahead is immediately followed by bursts in the other
 * three until they catch up. Balance is therefore preserved at the granularity of a ROUND of bursts
 * rather than of a single item, and `coverageIsEven` — which the stop rule checks — is what holds
 * the session to it.
 */
export function burstLengthFor(state: SessionState, typeCode: TypeCode, banks: Banks): number {
  const policy = state.config.burst;
  if (policy.maxLength <= 1) return 1;

  const verdict = classifyBankSpeed(banks, policy).get(typeCode);
  if (!verdict?.fast) return 1;

  const capHeadroom = state.config.hardItemCap - state.itemsServed;
  if (capHeadroom <= 1) return 1;

  return Math.max(
    1,
    Math.min(
      typeBurstLength(verdict, policy),
      unseenCount(state, typeCode, banks),
      capHeadroom,
    ),
  );
}

/**
 * Shorten the burst for a type whose choice is wider.
 *
 * The reason to burst is that instruction reading, not answering, is the fixed cost. That argument
 * weakens as the option list grows: scanning six candidates is work of its own, so six of those
 * items in a row is a longer stretch of real effort than six two-option items. Length therefore
 * steps down one item per option above four, floored at `minLength`.
 *
 * PROVISIONAL. Option count is a structural stand-in for time-on-item, chosen because it is the only
 * per-item property in the bank that bears on answering effort. The measurement that would replace
 * it is the observed `M-RT` / `M-RTFIRST` split per type — total response time against time to first
 * interaction — which separates instruction reading from answering directly. No such distribution
 * exists for any type in this repository yet.
 */
function typeBurstLength(verdict: TypeSpeedVerdict, policy: BurstPolicy): number {
  const options = verdict.maxOptions ?? policy.maxOptions;
  const stepDown = Math.max(0, options - 4);
  return Math.max(policy.minLength, policy.maxLength - stepDown);
}

/** A burst in progress: which type, how long it is, and which item of it is being served. */
export interface BurstPlan {
  readonly typeCode: TypeCode;
  /** Total items this burst will take from the type. */
  readonly length: number;
  /** 1-based position of the item being served now. */
  readonly index: number;
}

/**
 * Decide what to serve next: continue the active burst, or ask `nextType` for a fresh selection.
 *
 * This is the whole loop-level contract, so every caller — a browser runner and a simulation
 * harness alike — advances identically and a trace replays the way it was collected. Returns `null`
 * when the session is over or nothing is left to serve, exactly as `nextType` does.
 *
 * A burst is abandoned the moment the stop rule fires or the type runs out of unseen items: an item
 * served past `isDone` is an item the child answered for nothing.
 */
export function planNextSelection(
  state: SessionState,
  banks: Banks,
  active: BurstPlan | null,
): BurstPlan | null {
  if (isDone(state)) return null;

  if (active !== null && active.index < active.length) {
    const type = banks.types.find((t) => t.typeCode === active.typeCode);
    if (type && typeHasUnseenItem(type, state, banks)) {
      return { typeCode: active.typeCode, length: active.length, index: active.index + 1 };
    }
  }

  const typeCode = nextType(state, banks);
  if (typeCode === null) return null;
  return { typeCode, length: burstLengthFor(state, typeCode, banks), index: 1 };
}
