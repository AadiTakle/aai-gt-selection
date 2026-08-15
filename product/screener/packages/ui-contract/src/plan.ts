import {
  bandRank,
  isCounted,
  type CountedElement,
  type UiCapability,
  type UiElement,
  type UiRequirement,
} from './capabilities';
import { allTypeCodes, requirementFor, requirementForSet } from './requirements';

/**
 * Matching types against apps, in both directions.
 *
 * Forward: given the types I want, what must my app be able to do? That is {@link planFor}.
 * Reverse: given what my app can do, which types can I serve? That is {@link servableBy}.
 *
 * The reverse direction is the one that gets used in practice, because an app usually exists before
 * anybody asks it to carry a screener.
 */

export interface Shortfall {
  readonly element: UiElement;
  /** Set when the element is present but its count is too low. */
  readonly needs?: number;
  readonly has?: number;
  readonly reason: string;
}

export interface MatchResult {
  readonly ok: boolean;
  readonly shortfalls: readonly Shortfall[];
}

/** Can this app serve a type with these requirements? */
export function satisfies(capability: UiCapability, requirement: UiRequirement): MatchResult {
  const offered = new Set(capability.elements);
  const shortfalls: Shortfall[] = [];

  for (const element of requirement.elements) {
    if (!offered.has(element)) {
      shortfalls.push({ element, reason: 'not offered at all' });
      continue;
    }
    if (isCounted(element)) {
      const needs = requirement.counts[element] ?? 0;
      const has = capability.counts[element] ?? 0;
      if (has < needs) {
        shortfalls.push({ element, needs, has, reason: 'offered but not enough of it' });
      }
    }
  }

  if (bandRank(requirement.readingBand) > bandRank(capability.readingBand)) {
    shortfalls.push({
      element: 'richText',
      reason: `needs reading band ${String(requirement.readingBand)}, app supports ${
        capability.readingBand ?? 'none'
      }`,
    });
  }

  return { ok: shortfalls.length === 0, shortfalls };
}

export interface TypePlan {
  readonly typeCode: string;
  readonly requirement: UiRequirement;
}

export interface Plan {
  readonly typeCodes: readonly string[];
  /** What one app must be able to do to serve every requested type. */
  readonly union: UiRequirement;
  readonly perType: readonly TypePlan[];
  /**
   * Elements needed by only ONE of the requested types.
   *
   * The useful column when trimming scope: an element on this list is being paid for by a single
   * type, so dropping that type removes a whole UI capability from the build.
   */
  readonly soleReasons: ReadonlyMap<UiElement, string>;
}

/** Forward direction: the types you want, and what they cost. */
export function planFor(typeCodes: readonly string[]): Plan {
  const perType = typeCodes.map((typeCode) => ({
    typeCode,
    requirement: requirementFor(typeCode),
  }));

  const owners = new Map<UiElement, string[]>();
  for (const { typeCode, requirement } of perType) {
    for (const element of requirement.elements) {
      owners.set(element, [...(owners.get(element) ?? []), typeCode]);
    }
  }

  const soleReasons = new Map<UiElement, string>();
  for (const [element, holders] of owners) {
    if (holders.length === 1) soleReasons.set(element, holders[0]!);
  }

  return {
    typeCodes,
    union: requirementForSet(typeCodes),
    perType,
    soleReasons,
  };
}

/** Reverse direction: what an app can do, and therefore what it may serve. */
export function servableBy(capability: UiCapability): {
  readonly servable: readonly string[];
  readonly blocked: readonly { typeCode: string; shortfalls: readonly Shortfall[] }[];
} {
  const servable: string[] = [];
  const blocked: { typeCode: string; shortfalls: readonly Shortfall[] }[] = [];

  for (const typeCode of allTypeCodes()) {
    const result = satisfies(capability, requirementFor(typeCode));
    if (result.ok) servable.push(typeCode);
    else blocked.push({ typeCode, shortfalls: result.shortfalls });
  }

  return { servable, blocked };
}

/**
 * The cheapest capability that serves every type, which is the answer to "what is the minimum to
 * implement all of them".
 */
export function minimumForEverything(): UiRequirement {
  return requirementForSet(allTypeCodes());
}

/**
 * How much of the library each additional element unlocks, most valuable first.
 *
 * This is the build-order question rather than the coverage question. An app cannot implement
 * seventeen elements in week one, so the useful thing to know is which single element buys the most
 * types, then which buys the most given the first, and so on.
 */
export function unlockOrder(): { element: UiElement; cumulativeTypes: number; adds: number }[] {
  const requirements = allTypeCodes().map((code) => requirementFor(code));
  const chosen: UiElement[] = [];
  const order: { element: UiElement; cumulativeTypes: number; adds: number }[] = [];

  const candidates = new Set<UiElement>();
  for (const requirement of requirements) {
    for (const element of requirement.elements) candidates.add(element);
  }

  // A type is covered when every element it needs has been chosen. Counts are ignored here on
  // purpose: this ranks which KINDS of element to build, not how much of each.
  const covered = (chosen_: readonly UiElement[]) => {
    const have = new Set(chosen_);
    return requirements.filter((r) => r.elements.every((e) => have.has(e))).length;
  };

  let current = covered(chosen);
  while (candidates.size > 0) {
    let best: UiElement | null = null;
    let bestCount = current;

    for (const candidate of candidates) {
      const count = covered([...chosen, candidate]);
      if (count > bestCount) {
        bestCount = count;
        best = candidate;
      }
    }

    // Nothing left unlocks another type on its own, so the rest are reported in a stable order.
    if (best === null) {
      for (const leftover of [...candidates].sort()) {
        order.push({ element: leftover, cumulativeTypes: current, adds: 0 });
      }
      break;
    }

    chosen.push(best);
    candidates.delete(best);
    order.push({ element: best, cumulativeTypes: bestCount, adds: bestCount - current });
    current = bestCount;
  }

  return order;
}

/** Counted elements a capability should declare, so a profile author knows what to fill in. */
export function countedElementsIn(requirement: UiRequirement): CountedElement[] {
  return requirement.elements.filter(isCounted);
}
