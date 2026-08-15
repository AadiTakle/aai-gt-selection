/**
 * THE UI KIT FORMAT — what a question's abstract variables actually look like.
 *
 * The abstraction in `../uispec/abstract.ts` turns a bank item into variable assignments plus a
 * manifest: `{identity: 18, category: 4, count: 2}`, where identity is nominal with 27 values, count
 * is ordered. The numbers mean nothing on their own. A kit is the file that gives them a look.
 *
 * WHY A BANK AND NOT A LIST PER VARIABLE. The obvious design is one list of values per variable:
 * twelve identities, six categories, cross them freely. It is also wrong for every real visual
 * library. Pikachu is not an identity that happens to be wearing the electric category — Pikachu IS
 * electric, and is stage 2, and there is no water Pikachu to reach for. Entries in a real library
 * arrive as bundles, and the bundles constrain which combinations exist. A format that pretends
 * otherwise produces a kit that validates and then cannot render, because it promised a grass
 * Charizard.
 *
 * So the bank is a list of THINGS, each carrying the variables it happens to embody, and resolution
 * is a search for things whose differences match the differences the question needs.
 *
 * WHY SOME VARIABLES ARE NOT IN THE BANK. `count` is not a property of Pikachu. Three Pikachu is the
 * same entry drawn three times. Neither is rotation, or size. These are TRANSFORMS: they take
 * whatever the bank returned and do something to it, so they need no entries at all and cost the
 * author nothing. Splitting variables into bank-backed and transform-backed is what keeps the file
 * short — a Pokédex needs 60 entries and gets `count`, `rotation` and `scale` for free.
 *
 * WHAT A KIT DOES NOT GET TO DECIDE is which variables a question needs, what they are ordered by, or
 * how many distinct values it must supply. Those come from the manifest, published by whoever owns
 * the measurement. A kit that maps an ordered variable onto entries with no order renders a perfectly
 * pretty item that cannot be solved, so `coverage.ts` refuses it before a child ever sees it.
 */

import type { Dimension } from '../uispec/abstract';
import type { Ordering } from '../uispec/spec';

export const KIT_VERSION = 'gt.uikit/v1';

/**
 * How a kit answers one variable.
 *
 * `bank` means look it up: the variable is carried by entries, under `field`. `repeat`, `rotate`,
 * `scale` and `tint` mean transform whatever the lookup returned. `none` is an honest refusal, and is
 * better than a silent one — a kit with no way to shade things should say so and be told which
 * question types it therefore cannot serve.
 */
export type Source =
  /**
   * `field` may name several, best first. The resolver picks the first that has enough distinct values
   * AND crosses whatever else the item varies, which are different requirements and cannot both be
   * judged in advance: `stage` is the better look for a Pokédex but only has three values, so an item
   * needing four wants `line`, and an item needing three that also varies type wants `stage`, because
   * line and type do not cross. Naming both lets one kit serve both instead of failing at the narrower.
   */
  | { readonly from: 'bank'; readonly field: string | readonly string[]; readonly label?: string }
  | { readonly from: 'repeat'; readonly of?: string; readonly max?: number; readonly label?: string }
  | { readonly from: 'rotate'; readonly steps?: number; readonly label?: string }
  | { readonly from: 'scale'; readonly min?: number; readonly max?: number; readonly label?: string }
  | { readonly from: 'tint'; readonly values: readonly string[]; readonly label?: string }
  | { readonly from: 'none'; readonly why?: string };

/** One thing in the library: a picture, a name, and the variables it embodies. */
export interface Entry {
  readonly id: string;
  /** Shown when there is no art, and used by screen readers when there is. */
  readonly label: string;
  /**
   * Where the picture comes from. Left to the app to interpret, because the kit format has no
   * business knowing whether a theme ships sprites, SVG, emoji or nothing at all. If the kit
   * declares an `art` template, this can be omitted and built from the entry's own fields.
   */
  readonly art?: string;
  /** Everything else is the author's own vocabulary, referenced by `Source.field`. */
  readonly [field: string]: unknown;
}

/**
 * A template for building `art` out of entry fields, so 60 entries do not each carry a URL.
 * `{dex}` is replaced by the entry's `dex` field. Any field works.
 */
export interface ArtTemplate {
  readonly template: string;
  /** What to fall back on when a field the template needs is missing. */
  readonly missing?: string;
}

export interface Kit {
  readonly kit: typeof KIT_VERSION;
  readonly id: string;
  readonly name: string;
  readonly describes?: string;
  readonly art?: ArtTemplate;
  /** Which variables this kit can answer, and how. Keys are canonical dimensions. */
  readonly dimensions: Readonly<Partial<Record<Dimension, Source>>>;
  readonly bank: readonly Entry[];
}

export interface KitProblem {
  readonly where: string;
  readonly says: string;
}

/**
 * Read a kit and say what is wrong with it in the author's own terms.
 *
 * Deliberately not a schema validator with a schema validator's error messages. The audience is
 * someone hand-writing a Pokédex who wants to be told "the electric type only has 2 entries and a
 * matrix needs 3", not "expected string, received undefined at /bank/34/type".
 */
export function checkKit(raw: unknown): { kit?: Kit; problems: KitProblem[] } {
  const problems: KitProblem[] = [];
  const push = (where: string, says: string) => problems.push({ where, says });

  if (raw === null || typeof raw !== 'object') {
    push('the file', 'is not an object.');
    return { problems };
  }
  const k = raw as Record<string, unknown>;

  if (k.kit !== KIT_VERSION) {
    push('kit', `should be "${KIT_VERSION}", not ${JSON.stringify(k.kit)}.`);
  }
  for (const field of ['id', 'name'] as const) {
    if (typeof k[field] !== 'string' || !(k[field] as string).trim()) {
      push(field, 'is missing. Every kit needs one.');
    }
  }

  const dims = k.dimensions;
  if (dims === null || typeof dims !== 'object') {
    push('dimensions', 'is missing. A kit has to say how it answers at least one variable.');
  }

  const bank = k.bank;
  if (!Array.isArray(bank)) {
    push('bank', 'is missing. Use [] if this kit is transforms only.');
  }

  if (problems.length > 0) return { problems };

  const dimensions = dims as Record<string, Source>;
  const entries = bank as Entry[];

  // Every bank-backed variable needs its field to actually exist on entries, or the lookup finds
  // nothing at render time and the item silently loses a variable.
  for (const [name, source] of Object.entries(dimensions)) {
    if (source === null || typeof source !== 'object' || typeof source.from !== 'string') {
      push(`dimensions.${name}`, 'needs a "from", one of bank, repeat, rotate, scale, tint, none.');
      continue;
    }
    if (source.from !== 'bank') continue;
    const fields = fieldsFor(source);
    if (fields.length === 0) {
      push(`dimensions.${name}`, 'is from the bank, so it needs a "field" naming which entry property carries it.');
      continue;
    }
    for (const field of fields) {
      const carrying = entries.filter((e) => e[field] !== undefined && e[field] !== null);
      if (carrying.length === 0) {
        push(
          `dimensions.${name}`,
          `reads "${field}" off bank entries, but no entry has a "${field}". Either add it or drop the variable.`,
        );
      } else if (carrying.length < entries.length) {
        const missing = entries.length - carrying.length;
        push(
          `dimensions.${name}`,
          `reads "${field}", but ${missing} of ${entries.length} entries do not have one. Those entries can never be picked when a question varies ${name}.`,
        );
      }
    }
  }

  const seen = new Set<string>();
  for (const [i, entry] of entries.entries()) {
    if (typeof entry?.id !== 'string' || !entry.id) {
      push(`bank[${i}]`, 'has no id.');
      continue;
    }
    if (seen.has(entry.id)) push(`bank[${i}]`, `repeats the id "${entry.id}".`);
    seen.add(entry.id);
    if (typeof entry.label !== 'string' || !entry.label) {
      push(`bank[${i}] (${entry.id})`, 'has no label. It is what a child hears and what shows when art fails to load.');
    }
  }

  if (problems.some((p) => !p.says.includes('can never be picked'))) return { problems };
  return { kit: raw as Kit, problems };
}

/** Build an entry's picture reference, from its own `art` or the kit's template. */
export function artFor(kit: Kit, entry: Entry): string | undefined {
  if (typeof entry.art === 'string') return entry.art;
  if (!kit.art) return undefined;
  let missing = false;
  const built = kit.art.template.replace(/\{(\w+)\}/g, (_, field: string) => {
    const value = entry[field];
    if (value === undefined || value === null) {
      missing = true;
      return '';
    }
    return String(value);
  });
  return missing ? kit.art.missing : built;
}

/** The fields a bank-backed variable may use, best first. Empty for transforms. */
export function fieldsFor(source: Source): readonly string[] {
  if (source.from !== 'bank') return [];
  return typeof source.field === 'string' ? [source.field] : source.field;
}

/** The distinct values one entry field takes, in a stable order. */
export function valuesOfField(kit: Kit, field: string, ordering: Ordering = 'nominal'): (string | number)[] {
  const found = new Set<string | number>();
  for (const entry of kit.bank) {
    const value = entry[field];
    if (typeof value === 'string' || typeof value === 'number') found.add(value);
  }
  const all = [...found];
  const nums = all.filter((v): v is number => typeof v === 'number').sort((a, b) => a - b);
  const strs = all.filter((v): v is string => typeof v === 'string').sort();
  // An ordered variable's values must come back in their order, since a question can say "one more
  // each time" about them and the rank is the whole content of the rule.
  if (ordering === 'ordered' && nums.length > 0 && strs.length === 0) return nums;
  return [...nums, ...strs];
}

/**
 * The distinct values a variable can take, across whichever of its fields has the most.
 *
 * Used for reporting how much a kit has available. What a given item ends up using is decided by the
 * resolver, which has to weigh reach against whether the field crosses the others.
 */
export function valuesFor(kit: Kit, dimension: Dimension, ordering: Ordering = 'nominal'): (string | number)[] {
  const source = kit.dimensions[dimension];
  if (!source || source.from !== 'bank') return [];
  let best: (string | number)[] = [];
  for (const field of fieldsFor(source)) {
    const values = valuesOfField(kit, field, ordering);
    if (values.length > best.length) best = values;
  }
  return best;
}

/** Entries whose fields match every one of the given concrete values. */
export function entriesMatching(
  kit: Kit,
  wanted: Readonly<Record<string, string | number>>,
): Entry[] {
  return kit.bank.filter((entry) =>
    Object.entries(wanted).every(([field, value]) => entry[field] === value),
  );
}
