import type { Ordering } from './spec';

/**
 * Turning the bank's concrete appearances into abstract variable assignments.
 *
 * THE PROBLEM THIS SOLVES. A bank item today says `{shape: 'star', color: 'teal', count: 1, rot: 0}`.
 * That is a finished picture, not a variable assignment: `shape` and `color` are UI decisions baked into
 * measurement data, so every theme inherits them and a theme with no colour channel cannot express
 * "teal" at all.
 *
 * What this produces instead is `{identity: 18, category: 4, count: 0, rotation: 0}` plus a manifest
 * saying identity is nominal with 27 possible values, count is ordered, rotation is cyclic mod 4. The
 * numbers mean nothing on their own. A theme decides what identity 18 looks like.
 *
 * WHY THE MANIFEST TRAVELS WITH THE SCAFFOLD. A theme cannot be trusted to know that `count` is ordered,
 * and if it maps an ordered dimension onto unordered sprites the item renders perfectly and cannot be
 * solved. So orderings and cardinalities are published by whoever owns the measurement and shipped
 * alongside the question, which is what `validate.ts` checks a theme against.
 *
 * THE PROOF THAT THIS IS LOSSLESS is `prove-roundtrip.ts`: abstract a real item, resolve it back through
 * the DEFAULT theme, and require the original appearance byte for byte. If the archive's own look can be
 * reproduced through the abstraction, the abstraction did not throw anything away.
 */

/** Canonical dimensions. The archive's many property names collapse onto these. */
export const DIMENSIONS = [
  'identity',
  'category',
  'count',
  'scale',
  'rotation',
  'fill',
  'tilt',
  'position',
  'border',
  'text',
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

/**
 * Which archive property feeds which dimension, and what ordering that dimension carries.
 *
 * The orderings are judgements about the construct and are the load-bearing part of this table.
 * `count` and `scale` are ordered because a rule can say "one more each time" about them. `category`
 * (colour) is nominal because nothing about teal comes after green. `rotation` is cyclic because a
 * quarter turn four times is where you started.
 */
const PROPERTY_MAP: Readonly<Record<string, { dimension: Dimension; ordering: Ordering }>> = {
  shape: { dimension: 'identity', ordering: 'nominal' },
  motif: { dimension: 'identity', ordering: 'nominal' },
  glyph: { dimension: 'identity', ordering: 'nominal' },
  sym: { dimension: 'identity', ordering: 'nominal' },
  icon: { dimension: 'identity', ordering: 'nominal' },
  kind: { dimension: 'identity', ordering: 'nominal' },
  color: { dimension: 'category', ordering: 'nominal' },
  colour: { dimension: 'category', ordering: 'nominal' },
  count: { dimension: 'count', ordering: 'ordered' },
  dots: { dimension: 'count', ordering: 'ordered' },
  sides: { dimension: 'count', ordering: 'ordered' },
  size: { dimension: 'scale', ordering: 'ordered' },
  rot: { dimension: 'rotation', ordering: 'cyclic' },
  rotDeg: { dimension: 'rotation', ordering: 'cyclic' },
  fill: { dimension: 'fill', ordering: 'nominal' },
  shade: { dimension: 'fill', ordering: 'nominal' },
  tilt: { dimension: 'tilt', ordering: 'nominal' },
  pos: { dimension: 'position', ordering: 'nominal' },
  border: { dimension: 'border', ordering: 'nominal' },
  text: { dimension: 'text', ordering: 'nominal' },
  value: { dimension: 'count', ordering: 'ordered' },
};

/**
 * The published vocabulary for one dimension.
 *
 * `values` is what the DEFAULT theme maps back onto, and is exactly the archive's own tokens in a stable
 * order. A custom theme ignores it and supplies its own; it is published so the default can be
 * reconstructed and so a theme author can see how many distinct things they need.
 */
export interface DimensionManifest {
  readonly dimension: Dimension;
  readonly ordering: Ordering;
  /** Concrete tokens, index-aligned with the abstract value. Sorted so the order is reproducible. */
  readonly values: readonly (string | number)[];
  /** Which archive properties fed this dimension, kept for auditing the migration. */
  readonly from: readonly string[];
}

export type Manifest = Readonly<Record<string, DimensionManifest>>;

/** An element with every appearance replaced by an index into the manifest. */
export interface AbstractElement {
  readonly id: string;
  /** Dimension name to abstract value. For ordered dimensions the value is a RANK, so order survives. */
  readonly vars: Readonly<Record<string, number>>;
  /** Literal content that is the item's material rather than its appearance. */
  readonly literal?: string | number;
}

/** Sort tokens into a stable, reproducible order. Numbers ascend so ordered dimensions rank correctly. */
function sortTokens(values: Iterable<string | number>): (string | number)[] {
  const all = [...values];
  const nums = all.filter((v): v is number => typeof v === 'number').sort((a, b) => a - b);
  const strs = all.filter((v): v is string => typeof v === 'string').sort();
  // Numbers first, so a numeric dimension's rank is its magnitude order. A dimension carrying both is a
  // data wart (`fill` holds 0, 1, 'hatch', 'outline', 'solid'); numbers-then-strings at least makes the
  // result deterministic.
  return [...nums, ...strs];
}

/**
 * Build the manifest for a set of items, which is what the backend would publish per type.
 *
 * Scoped to the items supplied rather than to the whole bank on purpose: a theme only has to supply
 * enough distinct values for what a given type actually uses, and 9 identities for one type is a very
 * different ask from 27 across all of them.
 */
export function buildManifest(contents: readonly Record<string, unknown>[]): Manifest {
  const collected = new Map<Dimension, { ordering: Ordering; values: Set<string | number>; from: Set<string> }>();

  const walk = (node: unknown, depth = 0): void => {
    if (depth > 6) return;
    if (Array.isArray(node)) {
      for (const entry of node.slice(0, 24)) walk(entry, depth + 1);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      const mapped = PROPERTY_MAP[key];
      if (mapped && (typeof value === 'string' || typeof value === 'number')) {
        const entry =
          collected.get(mapped.dimension) ??
          { ordering: mapped.ordering, values: new Set<string | number>(), from: new Set<string>() };
        entry.values.add(value);
        entry.from.add(key);
        collected.set(mapped.dimension, entry);
      }
      walk(value, depth + 1);
    }
  };

  for (const content of contents) walk(content);

  const manifest: Record<string, DimensionManifest> = {};
  for (const [dimension, entry] of collected) {
    manifest[dimension] = {
      dimension,
      ordering: entry.ordering,
      values: sortTokens(entry.values),
      from: [...entry.from].sort(),
    };
  }
  return manifest;
}

/** Replace one object's appearance properties with abstract indices. */
export function abstractElement(
  id: string,
  source: Record<string, unknown>,
  manifest: Manifest,
): AbstractElement {
  const vars: Record<string, number> = {};
  let literal: string | number | undefined;

  for (const [key, value] of Object.entries(source)) {
    const mapped = PROPERTY_MAP[key];
    if (!mapped) continue;
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const dim = manifest[mapped.dimension];
    if (!dim) continue;
    const index = dim.values.indexOf(value);
    if (index < 0) continue;
    vars[mapped.dimension] = index;
    if (mapped.dimension === 'text') literal = value;
  }

  return literal === undefined ? { id, vars } : { id, vars, literal };
}

/**
 * Resolve an abstract element back to concrete tokens through a manifest.
 *
 * This is what the DEFAULT theme does. A custom theme substitutes its own values for the same indices,
 * which is the whole mechanism: same indices, different vocabulary, identical measurement.
 */
export function concretise(
  element: AbstractElement,
  manifest: Manifest,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [dimension, index] of Object.entries(element.vars)) {
    const dim = manifest[dimension];
    if (!dim) continue;
    const value = dim.values[index];
    if (value === undefined) continue;
    // Reported under the dimension's canonical name, not the archive property, since several archive
    // names collapse onto one dimension and only the dimension is meaningful downstream.
    out[dimension] = value;
  }
  return out;
}

/** The demands a theme is validated against, derived from a manifest. */
export function demandsFrom(manifest: Manifest): {
  ordering: Record<string, Ordering>;
  cardinality: Record<string, number>;
} {
  const ordering: Record<string, Ordering> = {};
  const cardinality: Record<string, number> = {};
  for (const [name, dim] of Object.entries(manifest)) {
    ordering[name] = dim.ordering;
    cardinality[name] = dim.values.length;
  }
  return { ordering, cardinality };
}
