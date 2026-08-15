import {
  COUNTED_ELEMENTS,
  EMPTY_REQUIREMENT,
  requirementFor,
  type UiRequirement,
} from '@gt/ui-contract';
import type { UiRequirementSnapshot } from '@platform/domain';

/**
 * Freeze `@gt/ui-contract`'s live derivation into the registry.
 *
 * The contract computes a type's UI needs by reading its bank, so its answer moves whenever the
 * bank is regenerated. A type record must not: an app approved a type against the requirement it
 * was shown, and a session must remain interpretable against the rules in force when it ran. So
 * publish time is where the derivation stops being a computation and becomes a stored fact.
 *
 * The two shapes differ in one respect that matters. `UiRequirement.counts` is
 * `Partial<Record<CountedElement, number>>`, whose values are `number | undefined`, while the
 * snapshot's `counts` is a total `Record<string, number>`. Dropping the absent keys rather than
 * carrying `undefined` values is what makes the snapshot survive a JSON round trip unchanged, which
 * the gzipped selection index and the snapshot checksum both depend on.
 */

/** Emit counts in the contract's own declared order so the JSON encoding is byte-stable. */
export function toUiRequirementSnapshot(requirement: UiRequirement): UiRequirementSnapshot {
  const counts: Record<string, number> = {};
  for (const element of COUNTED_ELEMENTS) {
    const value = requirement.counts[element];
    if (typeof value === 'number') counts[element] = value;
  }
  return {
    // `requirementFor` already returns these sorted; copied so the snapshot owns its array.
    elements: [...requirement.elements],
    counts,
    readingBand: requirement.readingBand,
  };
}

/**
 * The snapshot for one type code, or the empty requirement when the contract cannot speak.
 *
 * `requirementFor` reads the bank from `@gt/ui-contract`'s own `BANKS_DIR`, which is the repository
 * default or `GT_QBANK_BANKS` — never the `bankDir` the compiler was handed. A type compiled from
 * some other directory therefore has no bank the contract can see, and it throws. Falling back to
 * the empty requirement records "nothing is known about this type's UI needs", which is the honest
 * statement and is safe because an app is matched against a requirement by subset test: an empty
 * requirement is satisfiable by every app, so a type in this state is servable rather than lost.
 *
 * That is a real hole. An empty requirement is indistinguishable from a genuinely undemanding type,
 * so it cannot be used to refuse a type. It does not arise for the 53 banks in this repository,
 * where the contract and the compiler read the same directory.
 */
export function uiRequirementFor(typeCode: string): UiRequirementSnapshot {
  try {
    return toUiRequirementSnapshot(requirementFor(typeCode));
  } catch {
    return toUiRequirementSnapshot(EMPTY_REQUIREMENT);
  }
}
