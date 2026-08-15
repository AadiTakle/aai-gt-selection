/**
 * TURNING ABSTRACT VARIABLES INTO PICTURES, WITHOUT BREAKING THE QUESTION.
 *
 * WHAT HAS TO BE PRESERVED, and it is not what people assume. A question does not care that variable
 * `identity` had the value 3. It cares that the first two cells in a row shared an identity and the
 * third did not, and that `count` went up rather than down. The content of an item is its pattern of
 * sameness, difference and order. Absolute values are free.
 *
 * That is what makes re-theming possible at all, and it is also the thing a naive resolver destroys.
 * Hand out pictures by taking `bank[value % bank.length]` and two cells that must differ can collide
 * on the same picture, which does not make the item ugly, it makes it wrong: a matrix with a repeated
 * cell has two defensible answers. So this resolver never maps values independently. It chooses an
 * INJECTIVE map per variable — distinct values go to distinct pictures, always — and then checks the
 * bank can actually supply every combination that map implies.
 *
 * WHY IT NEEDS TO SEARCH. Bank entries carry their variables in bundles, so the maps interact. Ask a
 * Pokédex for three identities and three categories and it will happily give you three species and
 * three types, and then have no entry for eight of the nine crossings, because a species has one type.
 * There is no way to know that from the variables alone; you have to try the assignment and look. So
 * this backtracks over maps and fails honestly when nothing fits, which is the signal `coverage.ts`
 * turns into "this kit cannot serve figure matrices, and here is what would fix it".
 */

import type { Dimension, AbstractElement, Manifest } from '../uispec/abstract';
import { artFor, entriesMatching, fieldsFor, valuesFor, valuesOfField, type Entry, type Kit } from './kit';

/** One element, resolved: a picture from the bank plus whatever transforms sit on top of it. */
export interface Visual {
  readonly id: string;
  readonly entry?: Entry;
  readonly label: string;
  readonly art?: string;
  /** Draw the picture this many times. 1 unless a `repeat` variable said otherwise. */
  readonly repeat: number;
  /** Quarter turns, or whatever step count the kit declared. 0 unless rotated. */
  readonly turns: number;
  /** Relative size, 1 being the kit's default. */
  readonly size: number;
  readonly tint?: string;
  /** Literal text the item owns rather than the theme, passed through untouched. */
  readonly literal?: string | number;
  /** For debugging a theme: which abstract values produced this. */
  readonly vars: Readonly<Record<string, number>>;
}

export type Resolution =
  | {
      readonly ok: true;
      readonly visuals: readonly Visual[];
      /** Which entry field each variable ended up using, since a kit may offer several. */
      readonly using: Readonly<Partial<Record<Dimension, string>>>;
    }
  | { readonly ok: false; readonly why: string; readonly blame: readonly Dimension[] };

const DEFAULT_STEPS = 4;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Resolve a set of elements together.
 *
 * Together and not one at a time, because the constraint is between them: a cell is only "different"
 * relative to its neighbours, so an element resolved in isolation cannot know what it must avoid.
 */
export function resolve(
  elements: readonly AbstractElement[],
  manifest: Manifest,
  kit: Kit,
  seed = 1,
): Resolution {
  const rand = mulberry32(seed);

  // Which variables are actually in play. A manifest lists what the type can use; these elements may
  // use fewer, and asking a kit for variables this item never varies is how a coverage report ends up
  // rejecting a kit that would have worked.
  const used = new Set<Dimension>();
  for (const element of elements) {
    for (const [name, value] of Object.entries(element.vars)) {
      if (typeof value === 'number') used.add(name as Dimension);
    }
  }

  const bankDims: Dimension[] = [];
  const missing: Dimension[] = [];
  for (const dim of used) {
    const source = kit.dimensions[dim];
    if (!source || source.from === 'none') {
      missing.push(dim);
      continue;
    }
    if (source.from === 'bank') bankDims.push(dim);
  }

  if (missing.length > 0) {
    return {
      ok: false,
      why: `this kit has no way to show ${missing.join(' or ')}. The item varies ${missing.join(' and ')}, so a child would see identical pictures where the question needs different ones.`,
      blame: missing,
    };
  }

  // The distinct abstract values each bank-backed variable takes here, and the fields that could
  // carry it. A field is only a candidate if it has enough distinct values on its own.
  const demand = new Map<Dimension, number[]>();
  const candidates = new Map<Dimension, string[]>();
  for (const dim of bankDims) {
    const values = new Set<number>();
    for (const element of elements) {
      const v = element.vars[dim];
      if (typeof v === 'number') values.add(v);
    }
    const ranks = [...values].sort((a, b) => a - b);
    demand.set(dim, ranks);

    const ordering = manifest[dim]?.ordering ?? 'nominal';
    const source = kit.dimensions[dim];
    const viable = fieldsFor(source!).filter((field) => {
      const available = valuesOfField(kit, field, ordering);
      if (available.length < ranks.length) return false;
      // An ordered variable needs concrete values that carry an order of their own. Words do not.
      return ordering !== 'ordered' || available.every((v) => typeof v === 'number');
    });
    candidates.set(dim, viable);
  }

  for (const dim of bankDims) {
    if (candidates.get(dim)!.length > 0) continue;
    const need = demand.get(dim)!.length;
    const ordering = manifest[dim]?.ordering ?? 'nominal';
    const best = valuesFor(kit, dim, ordering).length;
    return {
      ok: false,
      why:
        best < need
          ? `${dim} needs ${need} things that differ and the best field has ${best}. Add ${need - best} more, or a variable the question needs will look the same in two places.`
          : `${dim} is ordered, and no field for it holds numbers, so its order would not be visible.`,
      blame: [dim],
    };
  }

  /**
   * Search for a field per variable AND an injective concrete value per abstract value, such that
   * every element's resulting combination exists in the bank.
   *
   * Two variables may not share a field: they would then be perfectly correlated, and a question that
   * varies one while holding the other would be impossible to draw.
   */
  const usingField = new Map<Dimension, string>();
  const chosen = new Map<Dimension, Map<number, string | number>>();
  const order = [...bankDims].sort((a, b) => candidates.get(a)!.length - candidates.get(b)!.length);

  let nodes = 0;
  const NODE_CAP = 40000;
  let stuckOn: Dimension[] = [];

  const wantedFor = (element: AbstractElement): Record<string, string | number> => {
    const wanted: Record<string, string | number> = {};
    for (const dim of bankDims) {
      const field = usingField.get(dim);
      const abstract = element.vars[dim];
      if (field === undefined || typeof abstract !== 'number') continue;
      const concrete = chosen.get(dim)?.get(abstract);
      if (concrete !== undefined) wanted[field] = concrete;
    }
    return wanted;
  };

  const combosExist = (): boolean => {
    for (const element of elements) {
      const wanted = wantedFor(element);
      if (Object.keys(wanted).length === 0) continue;
      if (entriesMatching(kit, wanted).length === 0) return false;
    }
    return true;
  };

  const walk = (depth: number): boolean => {
    if (++nodes > NODE_CAP) return false;
    if (depth === order.length) return combosExist();

    const dim = order[depth]!;
    const ranks = demand.get(dim)!;
    const ordering = manifest[dim]?.ordering ?? 'nominal';
    const taken = new Set(usingField.values());

    for (const field of candidates.get(dim)!) {
      if (taken.has(field)) continue;
      usingField.set(dim, field);
      const available = valuesOfField(kit, field, ordering);
      const ordered = ordering === 'ordered';
      const map = new Map<number, string | number>();
      chosen.set(dim, map);

      if (ordered) {
        // The only choice is which contiguous run to use, since the ranks must stay in order.
        for (let start = 0; start + ranks.length <= available.length; start += 1) {
          for (const [i, rank] of ranks.entries()) map.set(rank, available[start + i]!);
          if (walk(depth + 1)) return true;
        }
      } else {
        // Any injective selection will do, so shuffle to stop every session opening on Bulbasaur, then
        // try a few rotations before giving up: one unlucky draw that happens to demand a missing
        // crossing should not sink the item.
        const pool = shuffle(available, rand);
        for (let attempt = 0; attempt < Math.min(available.length, 16); attempt += 1) {
          const rotated = rotate(pool, attempt);
          for (const [i, rank] of ranks.entries()) map.set(rank, rotated[i]!);
          if (walk(depth + 1)) return true;
        }
      }

      chosen.delete(dim);
      usingField.delete(dim);
    }

    stuckOn = [dim];
    return false;
  };

  if (bankDims.length > 0 && !walk(0)) {
    const names = bankDims.map((d) => `${d} (${fieldsFor(kit.dimensions[d]!).join(' or ')})`);
    return {
      ok: false,
      why:
        nodes > NODE_CAP
          ? `gave up looking for pictures that fit after ${NODE_CAP} tries. The bank probably cannot cross ${names.join(' with ')}.`
          : `no bank entry exists for some combination this item needs. The bank does not cross ${names.join(' with ')} — check the crossings report and give one of them a field that does.`,
      blame: stuckOn.length > 0 ? stuckOn : bankDims,
    };
  }

  // Same combination means same picture, because two cells the question calls identical must look
  // identical. Different combinations get different entries, which injectivity already guarantees.
  const picked = new Map<string, Entry>();
  const visuals: Visual[] = [];

  for (const element of elements) {
    const wanted = wantedFor(element);

    const key = JSON.stringify(wanted);
    let entry = picked.get(key);
    if (!entry && Object.keys(wanted).length > 0) {
      const candidates = entriesMatching(kit, wanted);
      if (candidates.length === 0) {
        return { ok: false, why: `nothing in the bank matches ${key}.`, blame: bankDims };
      }
      entry = candidates[Math.floor(rand() * candidates.length)]!;
      picked.set(key, entry);
    }
    if (!entry && kit.bank.length > 0) {
      // No bank-backed variable in play: the item is transforms on a single picture, so any entry
      // does, but it must be the same one throughout or the transform is not what changed.
      entry = picked.get('*') ?? kit.bank[Math.floor(rand() * kit.bank.length)]!;
      picked.set('*', entry);
    }

    visuals.push({
      id: element.id,
      entry,
      label: entry?.label ?? String(element.literal ?? ''),
      art: entry ? artFor(kit, entry) : undefined,
      repeat: transform(element, manifest, kit, 'count', 1),
      turns: transform(element, manifest, kit, 'rotation', 0),
      size: transform(element, manifest, kit, 'scale', 1),
      tint: tintFor(element, kit),
      literal: element.literal,
      vars: element.vars,
    });
  }

  return { ok: true, visuals, using: Object.fromEntries(usingField) };
}

/**
 * Read a transform variable off an element.
 *
 * The manifest's value is the real one wherever it exists: `count` rank 2 in a bank whose counts are
 * [1, 3, 5] means five, not three, and drawing three would quietly change the arithmetic the item is
 * testing.
 */
function transform(
  element: AbstractElement,
  manifest: Manifest,
  kit: Kit,
  dimension: Dimension,
  fallback: number,
): number {
  const rank = element.vars[dimension];
  if (typeof rank !== 'number') return fallback;
  const source = kit.dimensions[dimension];
  if (!source || source.from === 'bank' || source.from === 'none') return fallback;

  const concrete = manifest[dimension]?.values[rank];
  if (dimension === 'count') {
    const n = typeof concrete === 'number' ? concrete : rank + 1;
    const cap = source.from === 'repeat' ? source.max ?? 12 : 12;
    return Math.max(1, Math.min(cap, n));
  }
  if (dimension === 'rotation') {
    const steps = source.from === 'rotate' ? source.steps ?? DEFAULT_STEPS : DEFAULT_STEPS;
    if (typeof concrete === 'number') {
      // The archive stores rotation in degrees. Turn it into steps so a kit with three orientations
      // and a kit with eight both get a value they can draw.
      return Math.round((concrete / 360) * steps) % steps;
    }
    return rank % steps;
  }
  if (dimension === 'scale') {
    const lo = source.from === 'scale' ? source.min ?? 0.7 : 0.7;
    const hi = source.from === 'scale' ? source.max ?? 1.4 : 1.4;
    const total = manifest[dimension]?.values.length ?? 1;
    if (total <= 1) return 1;
    return lo + (rank / (total - 1)) * (hi - lo);
  }
  return fallback;
}

function tintFor(element: AbstractElement, kit: Kit): string | undefined {
  for (const dim of ['category', 'fill', 'border'] as const) {
    const source = kit.dimensions[dim];
    const rank = element.vars[dim];
    if (source?.from === 'tint' && typeof rank === 'number') {
      return source.values[rank % source.values.length];
    }
  }
  return undefined;
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function rotate<T>(items: readonly T[], by: number): T[] {
  if (items.length === 0) return [];
  const k = by % items.length;
  return [...items.slice(k), ...items.slice(0, k)];
}
