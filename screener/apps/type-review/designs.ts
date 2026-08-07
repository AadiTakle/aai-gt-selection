/**
 * The three UI designs this tool can draw a question in.
 *
 * WHAT A "DESIGN" IS HERE. Every design is shown the SAME item, out of the same bank, at the same
 * difficulty. What differs is only how that item's variables are dressed. That is the point of the
 * dropdown: it makes re-skinning falsifiable, because a reviewer can hold the question fixed and watch
 * whether the reasoning survives being redrawn.
 *
 * WHY THE FIRST ONE IS AN IFRAME AND THE OTHER TWO ARE NOT. The archive shipped a hand-built HTML
 * renderer per type, and those are genuinely good — each one was tuned to its own question. They are
 * the reference, so the default design embeds them unchanged rather than reimplementing them, and any
 * themed design has to earn its place against them. The themed designs instead read the item's
 * abstract variables and draw them from a kit, which is the only way a single renderer can serve every
 * type without knowing what any of them are.
 */

export type DesignKind = 'archive' | 'kit';

export interface Design {
  readonly id: string;
  readonly label: string;
  readonly kind: DesignKind;
  /** For kit designs: which kit JSON to load. */
  readonly kit?: string;
  /** Shown under the demo so a reviewer knows what they are looking at and what to judge it against. */
  readonly note: string;
}

export const DESIGNS: readonly Design[] = [
  {
    id: 'archive',
    label: 'Default — shapes, colours, counts',
    kind: 'archive',
    note:
      'The catalogue\u2019s own renderer for this type, embedded unchanged. Shapes, colours and counts, one bespoke design per question. This is the reference the other two are judged against.',
  },
  {
    id: 'pokedex',
    label: 'Pok\u00e9dex — real Pok\u00e9mon sprites',
    kind: 'kit',
    kit: 'pokedex',
    note:
      'One generic renderer, dressed from a Pok\u00e9mon kit. Sprites are the real Pok\u00e9dex, served from the public PokeAPI sprite repository. Evolution line stands in for identity and evolution stage for category, because those two cross where species and type do not.',
  },
  {
    id: 'hatchling',
    label: 'Hatchling garden — flowers',
    kind: 'kit',
    kit: 'hatchling',
    note:
      'The same generic renderer, dressed from a garden kit drawn as inline vector art, following the Hatchling theme. Species stands in for identity and growth stage for category, and every species exists at every stage, so it can serve grids the Pok\u00e9dex cannot.',
  },
];

export const DEFAULT_DESIGN = DESIGNS[0]!.id;

export function designById(id: string): Design {
  return DESIGNS.find((d) => d.id === id) ?? DESIGNS[0]!;
}

const LS_KEY = 'gt-type-review-design';

/** Remembered across reloads, because a reviewer comparing designs reloads constantly. */
export function loadDesign(): string {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v && DESIGNS.some((d) => d.id === v) ? v : DEFAULT_DESIGN;
  } catch {
    return DEFAULT_DESIGN;
  }
}

export function saveDesign(id: string): void {
  try {
    localStorage.setItem(LS_KEY, id);
  } catch {
    // A browser with storage disabled still works; it just forgets the choice.
  }
}
