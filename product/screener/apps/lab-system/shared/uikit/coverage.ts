/**
 * WHAT A KIT CAN AND CANNOT SERVE, SAID BEFORE A CHILD SEES IT.
 *
 * A kit fails in two ways and only one of them is visible. The loud failure is a missing picture. The
 * quiet one is a kit that renders every item beautifully and has made some of them unanswerable —
 * two cells that had to differ drawn identically, an ordered variable mapped onto pictures with no
 * order, a matrix whose ninth cell had to be a grass Charizard so it got a grass Bulbasaur instead
 * and now two answers are defensible. Nobody notices. The item just quietly measures nothing.
 *
 * So coverage is checked against the published manifests up front, and the answer for a question type
 * is allowed to be no. A theme that cannot do Figure Matrices is a fine theme; a theme that does
 * Figure Matrices wrong is not.
 *
 * THE CROSSINGS REPORT is the part an author actually uses. When a type fails it is almost never
 * because the bank is too small — it is because two variables were mapped onto fields that reality
 * ties together. A Pokédex has 60 species and 15 types and cannot cross them, because a species has
 * one type; it crosses type with evolution stage perfectly, because every line evolves. The fix is
 * never "add more Pokémon", it is "map identity to type and category to stage". You cannot see that
 * from a failure message, so the report shows which pairs of fields are fully crossed and lets the
 * author re-map.
 */

import type { Dimension, Manifest } from '../uispec/abstract';
import type { Ordering } from '../uispec/spec';
import { fieldsFor, valuesOfField, type Kit } from './kit';

export interface DimensionVerdict {
  readonly dimension: Dimension;
  readonly ordering: Ordering;
  /** How many distinct values the type's items actually use. */
  readonly needs: number;
  readonly answeredBy: string;
  readonly has: number | 'unlimited';
  readonly ok: boolean;
  readonly says?: string;
}

export interface TypeVerdict {
  readonly typeCode: string;
  readonly ok: boolean;
  readonly dimensions: readonly DimensionVerdict[];
  readonly blockers: readonly string[];
}

/** Check one type's manifest against a kit. */
export function coverType(typeCode: string, manifest: Manifest, kit: Kit): TypeVerdict {
  const dimensions: DimensionVerdict[] = [];
  const blockers: string[] = [];

  for (const [name, dim] of Object.entries(manifest)) {
    const dimension = name as Dimension;
    const source = kit.dimensions[dimension];
    const needs = dim.values.length;

    if (!source || source.from === 'none') {
      const why = source?.from === 'none' && source.why ? ` (${source.why})` : '';
      dimensions.push({
        dimension,
        ordering: dim.ordering,
        needs,
        answeredBy: 'nothing',
        has: 0,
        ok: false,
        says: `this kit does not answer ${dimension}${why}, and items of this type vary it across ${needs} values.`,
      });
      blockers.push(`no ${dimension}`);
      continue;
    }

    if (source.from === 'bank') {
      // A variable may name several fields. It is covered if ANY of them both has enough distinct
      // values and, when the variable is ordered, holds numbers so that its order is visible.
      const fields = fieldsFor(source);
      const scored = fields.map((field) => {
        const values = valuesOfField(kit, field, dim.ordering);
        return {
          field,
          have: values.length,
          orderable: dim.ordering !== 'ordered' || values.every((v) => typeof v === 'number'),
        };
      });
      const winner = scored.find((s) => s.have >= needs && s.orderable);
      const widest = scored.reduce((a, b) => (b.have > a.have ? b : a), scored[0] ?? { field: '?', have: 0, orderable: true });
      const ok = winner !== undefined;

      dimensions.push({
        dimension,
        ordering: dim.ordering,
        needs,
        answeredBy: `bank.${winner?.field ?? fields.join('/')}`,
        has: winner?.have ?? widest.have,
        ok,
        says: ok
          ? undefined
          : widest.have < needs
            ? `needs ${needs} distinct values and the widest field ("${widest.field}") has ${widest.have}. Add ${needs - widest.have}.`
            : `${dimension} is ordered, but ${fields.map((f) => `"${f}"`).join(' and ')} hold words, which have no order a child can see. Use a number.`,
      });
      if (!ok) {
        blockers.push(widest.have < needs ? `${dimension} short by ${needs - widest.have}` : `${dimension} not orderable`);
      }
      continue;
    }

    // Transforms are unlimited in principle, but a cap is a cap: nine of something is a lot of
    // something, and a rotation kit with three orientations cannot show four.
    const cap =
      source.from === 'repeat' ? source.max ?? 12 : source.from === 'rotate' ? source.steps ?? 4 : undefined;
    const ok = cap === undefined || needsFitInto(dim, cap);
    dimensions.push({
      dimension,
      ordering: dim.ordering,
      needs,
      answeredBy: source.from,
      has: cap ?? 'unlimited',
      ok,
      says: ok ? undefined : `items go up to ${maxOf(dim)} but the kit caps ${source.from} at ${cap}.`,
    });
    if (!ok) blockers.push(`${dimension} over the ${source.from} cap`);
  }

  return { typeCode, ok: blockers.length === 0, dimensions, blockers };
}

function maxOf(dim: { values: readonly (string | number)[] }): number {
  const nums = dim.values.filter((v): v is number => typeof v === 'number');
  return nums.length > 0 ? Math.max(...nums) : dim.values.length;
}

function needsFitInto(dim: { values: readonly (string | number)[] }, cap: number): boolean {
  return maxOf(dim) <= cap;
}

export interface Crossing {
  readonly a: string;
  readonly b: string;
  readonly valuesA: number;
  readonly valuesB: number;
  readonly present: number;
  readonly possible: number;
  /** 1 means every combination exists, which is what a matrix needs. */
  readonly fill: number;
}

/**
 * Which pairs of bank fields are fully crossed.
 *
 * Reported over every field on the entries, not only the ones the kit currently maps, because the
 * whole point is to show the author a better mapping than the one they chose.
 */
export function crossings(kit: Kit, minValues = 2): Crossing[] {
  const fields = new Map<string, Set<string | number>>();
  for (const entry of kit.bank) {
    for (const [field, value] of Object.entries(entry)) {
      if (field === 'id' || field === 'label' || field === 'art') continue;
      if (typeof value !== 'string' && typeof value !== 'number') continue;
      const set = fields.get(field) ?? new Set<string | number>();
      set.add(value);
      fields.set(field, set);
    }
  }

  const names = [...fields.keys()].filter((f) => (fields.get(f)?.size ?? 0) >= minValues).sort();
  const out: Crossing[] = [];

  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = names[i]!;
      const b = names[j]!;
      const seen = new Set<string>();
      for (const entry of kit.bank) {
        const va = entry[a];
        const vb = entry[b];
        if (va === undefined || vb === undefined) continue;
        seen.add(`${String(va)}\u0000${String(vb)}`);
      }
      const valuesA = fields.get(a)!.size;
      const valuesB = fields.get(b)!.size;
      const possible = valuesA * valuesB;
      out.push({
        a,
        b,
        valuesA,
        valuesB,
        present: seen.size,
        possible,
        fill: possible === 0 ? 0 : seen.size / possible,
      });
    }
  }

  return out.sort((x, y) => y.fill - x.fill || y.present - x.present);
}

/**
 * The largest fully-crossed rectangle a pair of fields can supply.
 *
 * A pair rarely crosses completely — a Pokédex has a few one-stage oddities that dent type × stage —
 * but a 3x3 matrix only needs three types that all have three stages. This finds the biggest such
 * block, which is the number the author actually needs, and it is usually much better than the fill
 * ratio suggests.
 */
export function largestBlock(kit: Kit, a: string, b: string): { rows: number; cols: number } {
  const byA = new Map<string | number, Set<string | number>>();
  for (const entry of kit.bank) {
    const va = entry[a];
    const vb = entry[b];
    if ((typeof va !== 'string' && typeof va !== 'number') || (typeof vb !== 'string' && typeof vb !== 'number')) {
      continue;
    }
    const set = byA.get(va) ?? new Set<string | number>();
    set.add(vb);
    byA.set(va, set);
  }

  let best = { rows: 0, cols: 0 };
  const allB = new Set<string | number>();
  for (const set of byA.values()) for (const v of set) allB.add(v);

  // Try every column count and keep the best rectangle. Rows are taken largest-first and intersected
  // as they are added, so the columns are values every chosen row genuinely has, rather than merely
  // the same count of values.
  const rowsSorted = [...byA.values()].sort((x, y) => y.size - x.size);
  for (let cols = 1; cols <= allB.size; cols += 1) {
    const eligible = rowsSorted.filter((set) => set.size >= cols);
    if (eligible.length === 0) continue;
    // Find how many rows share at least `cols` common values, greedily from the largest rows.
    let common: Set<string | number> | undefined;
    let rows = 0;
    for (const set of eligible) {
      const next = common ? new Set([...common].filter((v) => set.has(v))) : new Set(set);
      if (next.size < cols) break;
      common = next;
      rows += 1;
    }
    if (rows * cols > best.rows * best.cols) best = { rows, cols };
  }
  return best;
}

/** A one-line summary of a kit against a whole catalogue of manifests. */
export function summarise(
  manifests: Readonly<Record<string, Manifest>>,
  kit: Kit,
): { served: TypeVerdict[]; blocked: TypeVerdict[] } {
  const served: TypeVerdict[] = [];
  const blocked: TypeVerdict[] = [];
  for (const [typeCode, manifest] of Object.entries(manifests)) {
    const verdict = coverType(typeCode, manifest, kit);
    (verdict.ok ? served : blocked).push(verdict);
  }
  return { served, blocked };
}
