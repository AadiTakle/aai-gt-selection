import type { Choice, Facets } from './adapt';

/**
 * Guaranteeing that the choices in one question look different from each other.
 *
 * THIS IS NOT A POLISH CONCERN, IT IS CORRECTNESS. A skin maps abstract facet tokens onto its own
 * vocabulary, and any such mapping can collide: two candidates differing only on `fill` or `tilt` will
 * render identically if the skin only reads `shape` and `color`. The child is then asked to choose
 * between options they cannot tell apart, which makes a perfectly good item unanswerable. It happened
 * on the first real playthrough of the Minecraft app: four of seven choices drew as the same green
 * stack, and it was only visible by looking at a screenshot.
 *
 * So a skin should not map facets to visuals directly. It should ask for a VISUAL SLOT per choice, which
 * this allocates so that no two choices in the same question share one, and then decide what slot 0, 1,
 * 2 look like in its own world.
 *
 * Facets are still exposed, because a skin should use them where it can: a `count` of three really ought
 * to be three of something, and an ordered facet must keep its ordering. The slot is the fallback that
 * makes distinguishability guaranteed rather than hoped for.
 */

/** Facets that carry identity. Ordered by how reliably a skin can show them. */
const IDENTITY_FACETS = [
  'shape',
  'pos',
  'border',
  'glyph',
  'color',
  'fill',
  'tilt',
  'size',
  'text',
  'value',
  'rot',
  'count',
] as const;

/** A stable, order-independent signature of everything that distinguishes one facet bag. */
export function signatureOf(facets: Facets): string {
  const parts: string[] = [];
  for (const key of IDENTITY_FACETS) {
    const value = facets[key];
    if (value !== undefined) parts.push(`${key}=${String(value)}`);
  }
  if (facets.blocks) parts.push(`blocks=${facets.blocks.join('.')}`);
  if (facets.seq) parts.push(`seq=${facets.seq.join('.')}`);
  if (facets.series) parts.push(`series=${facets.series.join('.')}`);
  return parts.join('|') || 'empty';
}

export interface VisualChoice {
  readonly choice: Choice;
  readonly facets: Facets;
  /** 0-based, unique within this question. A skin maps it to its own distinct thing. */
  readonly slot: number;
  /**
   * Which facet actually differs across this question's choices, when exactly one does.
   *
   * Worth honouring where possible: if the only difference is `count`, a skin that varies count and
   * nothing else produces a question that reads the way the author intended.
   */
  readonly varyingFacet: keyof Facets | null;
  /** Every facet that differs across this question's choices. Skins use this to pick what to show. */
  readonly varyingFacets: readonly (keyof Facets)[];
}

/**
 * Allocate a distinct visual slot to every choice.
 *
 * Choices with identical signatures still get different slots, because the bank does occasionally carry
 * two options that are genuinely the same and the child must still be able to tap one of them.
 */
export function visualChoices(choices: readonly Choice[]): VisualChoice[] {
  // Which facets differ across the set?
  const present = new Set<keyof Facets>();
  for (const c of choices) {
    for (const k of Object.keys(c.facets) as (keyof Facets)[]) present.add(k);
  }
  const varying: (keyof Facets)[] = [];
  for (const key of present) {
    const values = new Set(choices.map((c) => String(c.facets[key] ?? '')));
    if (values.size > 1) varying.push(key);
  }
  const varyingFacet = varying.length === 1 ? (varying[0] ?? null) : null;

  const bySignature = new Map<string, number>();
  let next = 0;
  return choices.map((choice) => {
    const sig = signatureOf(choice.facets);
    let slot = bySignature.get(sig);
    if (slot === undefined) {
      slot = next++;
      bySignature.set(sig, slot);
    } else {
      // A repeat signature still needs its own slot, or two taps would look like one option.
      slot = next++;
    }
    return { choice, facets: choice.facets, slot, varyingFacet, varyingFacets: varying };
  });
}

/**
 * A development check a skin can assert in its own tests: did every choice really render differently?
 *
 * Takes whatever the skin considers its rendered identity (a block name, a sprite id, a label) and
 * reports duplicates.
 */
export function findCollisions(rendered: readonly string[]): string[] {
  const seen = new Map<string, number>();
  for (const r of rendered) seen.set(r, (seen.get(r) ?? 0) + 1);
  return [...seen].filter(([, n]) => n > 1).map(([r]) => r);
}
