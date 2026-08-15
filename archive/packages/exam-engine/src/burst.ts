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
 * machine-readable structure of the items themselves.
 *
 * WHAT THIS FILE NO LONGER DOES, AND WHY. An earlier rule also disqualified any type that declared
 * `M-PATH`, `M-EFF`, `M-PLANFUL` or `M-IDEAFLU`, on the reasoning that a type reporting on a
 * solution process must have a multi-move response and therefore a slow one. That inference is
 * unsupported and the only observation bearing on it contradicts it: in the first live session, the
 * six types the engine actually served were `QUANT-MIX-01`, `SPA-XPLANE-01`, `GB-WORDFORGE-01`,
 * `CX-check-01`, `GB-EXPLORE-01` and `VER-SEQUENCE-01` — every one of them a declarer of a process
 * measurement — and the owner's report was that the questions felt *too instantaneous*. Declaring a
 * process measurement says the renderer logs intermediate states; it says nothing about how long a
 * child takes. The two properties were conflated, so the proxy is gone rather than merely widened.
 *
 * WHAT WOULD PUT A SPEED TERM BACK. The observed `M-RT` / `M-RTFIRST` split per type — total
 * response time against time to first interaction, which separates reading the instruction from
 * answering the question. Both are already emitted on every item by every wired renderer and
 * persisted per response, and neither has ever been collected: at the time of writing the response
 * table holds zero rows. `docs/product/EXAM_BURST_INSTRUCTION_COST.md` states the smallest
 * collection that would settle it.
 */
import { typeHasUnseenItem } from './coverage';
import { isDone } from './done';
import { itemOptionCount } from './item-format';
import { nextType } from './selection';
import {
  AREAS,
  type BankItem,
  type Banks,
  type BurstPolicy,
  type QuestionType,
  type SessionState,
  type TypeCode,
} from './types';

/**
 * Item-content fields that pace or time-bound the RESPONSE rather than the stimulus: an explicit
 * time budget, an explicit refusal to time the response, a paced multi-step stream, or a program the
 * child assembles before running it.
 *
 * These are not proxies for how fast a child answers. Each one is a direct statement that the item's
 * response is not a single self-contained choice — it runs on a clock, or arrives as a stream, or is
 * built up over several moves — and back-to-back serving is a different experience for such an item
 * than for a one-tap choice. That is what disqualifies them.
 *
 * `exposureMs` is deliberately absent. It bounds how long the STIMULUS is visible, after which the
 * response is a single forced choice, so it constrains presentation rather than response.
 */
const PACED_RESPONSE_CONTENT_FIELDS: readonly string[] = [
  'timeBudgetSec',
  'responseUntimed',
  'paceMs',
  'responseWindowMs',
  'streamLength',
  'instructionSet',
];

/** Why a type was or was not classified burstable. Carried so the decision can be printed and audited. */
export interface TypeSpeedVerdict {
  readonly typeCode: TypeCode;
  readonly fast: boolean;
  /** Human-readable evidence for the verdict. */
  readonly reason: string;
  /** Largest option count seen across the type's items; `null` when no item offers options. */
  readonly maxOptions: number | null;
  /** Response-pacing content fields found, if any. */
  readonly slowFields: readonly string[];
}

/**
 * Classify one type as burstable or not, from the structure of its own items.
 *
 * A type qualifies when both hold:
 *
 *  1. **Every** item is a bounded choice — it offers an `options` array, and no item offers more
 *     than `maxOptions` of them. A choice among a handful of visible candidates is one self-contained
 *     decision; a construction, a free response or a twenty-way choice is not.
 *  2. No item carries a field that paces or time-bounds the response
 *     ({@link PACED_RESPONSE_CONTENT_FIELDS}).
 *
 * Both conditions are per-item facts read off the bank, and both are about the SHAPE of the
 * response, not its duration. Together they say: a run of these items is one instruction followed by
 * several independent choices, with no clock and no cross-item stream. That is the property a burst
 * needs in order to be a coherent experience, and it is a property this repository can actually
 * check.
 *
 * Requiring EVERY item to qualify is deliberate: a burst can land on any item in the pool, so a
 * type is only safe to burst if its whole bank qualifies. One paced or constructed item disqualifies
 * the type. `type` is retained in the signature because a future speed term — see the file header —
 * would be per type rather than per item.
 *
 * CLAIM BOUNDARY. This says nothing about how long a child takes on one of these items, and it is
 * not calibrated against anything; no per-type response-time distribution exists in this repository.
 * What it claims is narrower and checkable: that consecutive items of this type are each a single
 * unpaced choice.
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
    for (const field of PACED_RESPONSE_CONTENT_FIELDS) {
      if (field in item.content) slowFields.add(field);
    }
    const count = itemOptionCount(item);
    if (count === null) itemsWithoutOptions += 1;
    else if (maxOptions === null || count > maxOptions) maxOptions = count;
  }

  const base = {
    typeCode: type.typeCode,
    maxOptions,
    slowFields: [...slowFields].sort(),
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
      reason: `response is paced or time-bounded by ${base.slowFields.join(', ')}`,
    };
  }

  return {
    ...base,
    fast: true,
    reason: `every item is one unpaced choice of at most ${String(maxOptions ?? 0)}`,
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
 * `1` means no burst — the ordinary one-item-then-rotate behaviour, and what a non-burstable type or
 * a disabled policy always gets. Bounded by four things, each a real constraint rather than a taste:
 *
 *  - the configured `maxLength`, so burst length is policy, not code;
 *  - the type's remaining unseen items, since the engine never repeats an item;
 *  - the items left before `hardItemCap`, so a burst can never overshoot the cap;
 *  - whether the type is burstable at all.
 *
 * The `hardItemCap` bound is applied twice over, and the second application is the one that keeps a
 * bursting battery finishable. `coverageIsEven` will not let the session end while the areas differ
 * by more than `evenSpreadTolerance` items, and `nextType` always serves the area with the fewest
 * items seen, so bursting round-robins the four areas and the session can only END on a whole round.
 * With a six-item ceiling that puts the exits at 24 items and then 48 — and 48 is past a 40-item cap,
 * so any battery needing more than one round ran to the safety net instead of the stop rule.
 *
 * So a burst is bounded by {@link roundHeadroom}: the share of the remaining budget that leaves room
 * both for the other three areas to match this one AND for a second, shorter round after it. The
 * second round's reserve is what makes the exits fine rather than coarse — bursts run 6, then 5, then
 * 2, then single items as the budget drains, so a session can stop within a couple of items of when
 * its evidence is actually adequate instead of at the next multiple of twenty-four.
 *
 * WHAT IS DELIBERATELY NOT BOUNDED HERE, having been tried and measured: how much the area still
 * needs. Refusing to burst into an area whose estimate has settled and whose metrics are covered
 * looks like the obvious way to stop a burst buying items that measure nothing, and it is backwards.
 * The items that land in a settled area are BALANCE items `coverageIsEven` is going to insist on
 * regardless; delivering six of them as a burst costs the child one instruction, and one at a time
 * costs six. Adding that bound measured out at one extra instruction screen per session for one item
 * saved, i.e. the wrong side of the trade.
 *
 * A burst also cannot outlive the stop rule: `planNextSelection` re-checks `isDone` before every
 * item, so the run is abandoned the moment there is adequate data to conclude a score.
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
      roundHeadroom(capHeadroom),
    ),
  );
}

/**
 * The longest burst the remaining item budget can afford, given that every burst commits the other
 * three areas to matching it.
 *
 * A burst of `n` costs the session `4n` items, because `coverageIsEven` will not conclude while the
 * areas are uneven. Dividing the headroom by `4` alone would therefore spend the budget exactly, and
 * a session that needs one item more than a whole number of rounds lands on the safety cap. Dividing
 * by `8` reserves a further round's worth, which is what lets the length taper — a long round, then a
 * shorter one, then single items — and lets the stop rule fire between rounds rather than only on
 * them.
 */
function roundHeadroom(capHeadroom: number): number {
  return Math.floor(capHeadroom / (2 * AREAS.length));
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
 * per-item property in the bank that bears on answering effort at all. It is the LAST remaining
 * speed proxy in this file, kept because the quantity it stands in for — how many candidates the
 * child must scan — is at least a property of the item rather than of the renderer's telemetry
 * declarations. The measurement that would replace it is the observed `M-RT` / `M-RTFIRST` split per
 * type. No such distribution exists for any type in this repository yet.
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
