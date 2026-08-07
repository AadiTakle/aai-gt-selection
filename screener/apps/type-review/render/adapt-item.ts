/**
 * A raw bank record, reduced to a plan that can be drawn without knowing what type it is.
 *
 * WHAT THIS ADDS TO WHAT ALREADY EXISTS, which is deliberately very little. `headless/adapt.ts` already
 * knows how the archive's many content shapes collapse onto a handful of stems, and `uikit/resolve.ts`
 * already knows how to hand out pictures without breaking a question. Neither knows about the other:
 * the adapter speaks in the archive's own tokens (`shape: 'star'`) and the resolver speaks in abstract
 * ranks. The join between them is the whole of this file, and it is short because the adapter's `Facets`
 * bag happens to use exactly the property names `uispec/abstract.ts` maps onto dimensions.
 *
 * WHY THE STRUCTURE AND THE APPEARANCE COME FROM DIFFERENT PLACES. Where a cell sits is not something a
 * theme gets to change — a matrix is a matrix in every skin, and a series read bottom-to-top would be a
 * different question. So layout comes from the adapter and is fixed, and only what fills a cell comes
 * from the kit. That split is what lets one renderer serve every type: it is drawing a grid of things,
 * and it never learns what the things are.
 *
 * WHY WORDS DO NOT GO THROUGH THE KIT. `abstractElement` marks text as `literal`, described there as
 * "the item's material rather than its appearance", and `Visual.literal` carries it through the resolver
 * "untouched". A cloze sentence's missing word IS the question; there is no sprite that means "run". So
 * elements whose only variable is text are rendered as their own words and never offered to the kit,
 * which is not a substitution and cannot mislead. When a kit says out loud that it will not theme words,
 * that refusal is surfaced as a note rather than swallowed.
 *
 * WHY A FAILURE IS A RESULT AND NOT AN EXCEPTION. `resolve` fails honestly and explains itself, and the
 * explanation is the most useful thing on the screen when it happens: it names the kit's missing
 * variable or missing crossing. Throwing it away and drawing an approximation is the one outcome that
 * must never happen, because a near-miss picture leaves an item looking fine and unanswerable.
 */

import {
  UNPRESENTABLE,
  adapt,
  type Choice,
  type Facets,
  type StemKind,
} from '../../lab-system/shared/headless/adapt';
import type { Serve } from '../../lab-system/shared/types';
import type { Kit } from '../../lab-system/shared/uikit/kit';
import { resolve, type Visual } from '../../lab-system/shared/uikit/resolve';
import {
  abstractElement,
  buildManifest,
  type AbstractElement,
  type Dimension,
  type Manifest,
} from '../../lab-system/shared/uispec/abstract';

/**
 * The part of a bank line this renderer is allowed to know about.
 *
 * `answer`, `scoring` and `provenance` are real fields on the file and are deliberately absent here, so
 * that reaching for the key is a compile error rather than a code review. The app's own `BankItem`
 * carries them and is still accepted, since it is a superset of this.
 */
export interface BankItem {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain?: string;
  readonly difficulty?: number;
  readonly ageBands?: readonly string[];
  readonly content: Record<string, unknown>;
}

/** What ends up in one slot of the layout. */
export type Drawn =
  /** A picture the kit supplied, with the transforms the item asked for sitting on top of it. */
  | { readonly kind: 'picture'; readonly visual: Visual }
  /** The item's own word, passed through untouched because no theme owns what a word means. */
  | { readonly kind: 'word'; readonly text: string }
  /** Nothing drawable arrived for this slot. Rendered as an empty frame, never as a guess. */
  | { readonly kind: 'nothing' };

export interface Drawable {
  readonly ok: true;
  readonly itemId: string;
  readonly typeCode: string;
  /** The library's own wording for what to do. */
  readonly ask: string;
  readonly stem: StemKind;
  readonly choices: readonly Choice[];
  /** True when the stem's rows ARE the options, so they must not be drawn twice. */
  readonly choicesAreStemRows: boolean;
  /** Slot id to what fills it. Ids come from `cellId`, `choiceId` and `pairId`. */
  readonly parts: ReadonlyMap<string, Drawn>;
  /** Which entry field each variable was drawn from. Worth showing a reviewer; useless to a child. */
  readonly using: Readonly<Partial<Record<Dimension, string>>>;
  /** Degrees in one of `Visual.turns`, which depends on how many orientations the kit declared. */
  readonly degreesPerTurn: number;
  /** Things the reviewer should know that are true but not failures. */
  readonly notes: readonly string[];
}

export interface Undrawable {
  readonly ok: false;
  readonly typeCode: string;
  /** Plain enough to put on the screen as-is. This is the honest half of the contract. */
  readonly why: string;
}

export type Plan = Drawable | Undrawable;

export const cellId = (index: number): string => `cell-${String(index)}`;
export const choiceId = (index: number): string => `choice-${String(index)}`;
export const pairId = (row: number, side: 'left' | 'right'): string => `row-${String(row)}-${side}`;

/**
 * Whether this stem can be drawn without lying, and if not, what to say instead.
 *
 * Two of these refuse a whole kind. The rest refuse a stem that came back EMPTY, which is the more
 * dangerous case and the one that is easy to miss: an empty stem still has options, so it still looks
 * exactly like a question, and a child will answer it. Checking that the stimulus actually survived is
 * the difference between a renderer that declines an item and a renderer that quietly manufactures a
 * coin toss and lets the engine read the result as ability.
 */
function refuseStem(stem: StemKind): string | undefined {
  switch (stem.kind) {
    case 'transform':
      return 'this item puts one figure through a chain of named operations, and a kit supplies pictures, not operations. Drawing the operation names would be showing the archive\u2019s own vocabulary rather than the question, so it is declined instead.';

    case 'target':
      return 'this item asks for something to be built or matched against a target rather than picked from a list, and this renderer only knows how to offer choices.';

    /**
     * `plain` means "nothing to show but the question itself", and it is also where the adapter lands
     * when it does not recognise the content's shape. In this bank it is always the second one: nets to
     * fold, function machines, Venn exemplars and morpheme trays all keep their stimulus somewhere the
     * adapter does not read, so what would be drawn is a prompt referring to something that is not on
     * the screen. A prompt with choices under it is drawn all the time here \u2014 that is what a one
     * sentence `passage` is \u2014 but it is only honest when the sentence is the whole question.
     */
    case 'plain':
      return 'nothing in this item was recognised as something to show, so the only things on screen would be the prompt and a row of options. If the question refers to a picture, a machine or a set of examples, it is not on screen, and the item would look answerable without being answerable.';

    case 'constraints':
      return stem.clues.length === 0
        ? 'this item is a set of rules to apply, and none of its rules survived being normalised \u2014 the clue list came back empty. The options would be shown with nothing to reason about.'
        : undefined;

    case 'passage':
      return stem.sentences.length === 0 && stem.question === '' && stem.title === ''
        ? 'this item is a piece of writing to read, and none of its text arrived. The options would be shown with nothing to read.'
        : undefined;

    case 'matrix':
      return stem.cells.every((cell) => cell === null)
        ? 'every cell of this item\u2019s grid came back empty, so there would be no pattern on screen to work the missing one out from.'
        : undefined;

    case 'pairs':
      return stem.rows.length === 0 ? 'this item is rows of pairs and none of its rows arrived.' : undefined;

    case 'compare':
      return undefined;

    default:
      return undefined;
  }
}

/**
 * Fields that must never reach a renderer, removed on the way in.
 *
 * The bank keeps the key beside the item rather than inside its content, so this copy is belt and
 * braces. It costs one pass over a small object and it means a future content shape that nests a
 * rationale cannot quietly put it in the DOM.
 */
const SECRET = ['answer', 'scoring', 'provenance', 'correctKey', 'correctIndex', 'distractorRationales'];

/** The item's content with everything answer-shaped taken out. */
export function askableContent(item: BankItem): Record<string, unknown> {
  const open: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item.content)) {
    if (!SECRET.includes(key)) open[key] = value;
  }
  return open;
}

/** The shape `adapt` wants. A bank line is a serve that nobody chose. */
function serveOf(item: BankItem): Serve {
  const difficulty = item.difficulty ?? 0;
  return {
    served: { itemId: item.itemId, typeCode: item.typeCode, difficulty, content: askableContent(item) },
    typeCode: item.typeCode,
    domain: item.domain ?? '',
    difficulty,
    informationAtThreshold: 0,
    selectionReason: 'review',
  };
}

/** A facet bag as a plain record, which is what `abstractElement` and `buildManifest` read. */
function bagOf(facets: Facets): Record<string, unknown> {
  return Object.fromEntries(Object.entries(facets));
}

/**
 * Every slot in the layout that could hold a picture, paired with the id the renderer will look it up
 * under. Stems made only of sentences contribute nothing here and resolve nothing, which is correct.
 */
function bagsOf(
  stem: StemKind,
  choices: readonly Choice[],
  choicesAreStemRows: boolean,
): { id: string; bag: Record<string, unknown> }[] {
  const out: { id: string; bag: Record<string, unknown> }[] = [];
  const push = (id: string, facets: Facets | null | undefined): void => {
    if (!facets) return;
    const bag = bagOf(facets);
    if (Object.keys(bag).length > 0) out.push({ id, bag });
  };

  switch (stem.kind) {
    case 'matrix':
      stem.cells.forEach((cell, i) => push(cellId(i), cell));
      break;
    case 'compare':
      push('left', stem.left);
      push('right', stem.right);
      break;
    case 'pairs':
      stem.rows.forEach((row, i) => {
        push(pairId(i, 'left'), row.left);
        push(pairId(i, 'right'), row.right);
      });
      break;
    default:
      break;
  }

  if (!choicesAreStemRows) choices.forEach((choice, i) => push(choiceId(i), choice.facets));
  return out;
}

/** Whether a kit has anything to say about this element, or whether it is words the item owns. */
function carriesAppearance(element: AbstractElement): boolean {
  return Object.keys(element.vars).some((dimension) => dimension !== 'text');
}

/**
 * How far one step of `Visual.turns` actually turns something.
 *
 * The resolver reports rotation as a step index against however many orientations the kit declared, so
 * assuming quarter turns would under-rotate a kit with eight and over-rotate one with three.
 */
export function degreesPerTurn(kit: Kit): number {
  const source = kit.dimensions.rotation;
  const steps = source && source.from === 'rotate' ? source.steps ?? 4 : 4;
  return 360 / Math.max(1, steps);
}

/** What the choices are made of, for a refusal message that tells the reader something. */
function shapeOfChoices(choices: readonly Choice[]): string {
  const keys = new Set<string>();
  for (const choice of choices) for (const key of Object.keys(choice.facets)) keys.add(key);
  return keys.size > 0 ? `carry only ${[...keys].sort().join(', ')}` : 'carry nothing at all';
}

export interface PlanInput {
  readonly item: BankItem;
  readonly kit: Kit;
  /** Same seed, same pictures. Vary it to see the item dressed differently. */
  readonly seed?: number;
  /**
   * A vocabulary wider than this one item's.
   *
   * Left out, the manifest is built from the item alone, which is the sharper choice for drawing: a
   * variable gets exactly as many distinct looks as this item varies it, so its differences are as
   * visible as they can be. A caller holding the whole bank may pass a bank-wide manifest instead when
   * it wants one type to look consistent across items.
   */
  readonly manifest?: Manifest;
}

/**
 * Turn a bank record into something drawable, or say plainly why it is not.
 */
export function planFor({ item, kit, seed = 1, manifest: given }: PlanInput): Plan {
  if (UNPRESENTABLE.includes(item.typeCode)) {
    return {
      ok: false,
      typeCode: item.typeCode,
      why: `${item.typeCode} is one of the types the headless adapter declines. Its answer is not "pick one of these" \u2014 it wants a route traced, a set of bins filled, or two taps rather than one \u2014 so offering it as a row of options would mark every child wrong no matter what they chose.`,
    };
  }

  const question = adapt(serveOf(item));
  if (!question) {
    return {
      ok: false,
      typeCode: item.typeCode,
      why: 'this item does not offer two things to choose between, so there is nothing here a child could answer.',
    };
  }

  const refusal = refuseStem(question.stem);
  if (refusal !== undefined) {
    return { ok: false, typeCode: item.typeCode, why: refusal };
  }

  const bags = bagsOf(question.stem, question.choices, question.choicesAreStemRows);
  const manifest = given ?? buildManifest(bags.map((entry) => entry.bag));
  const elements = bags.map(({ id, bag }) => abstractElement(id, bag, manifest));
  const themed = elements.filter(carriesAppearance);

  const parts = new Map<string, Drawn>();
  let using: Readonly<Partial<Record<Dimension, string>>> = {};

  if (themed.length > 0) {
    const drawn = resolve(themed, manifest, kit, seed);
    if (!drawn.ok) return { ok: false, typeCode: item.typeCode, why: drawn.why };
    for (const visual of drawn.visuals) parts.set(visual.id, { kind: 'picture', visual });
    using = drawn.using;
  }

  for (const element of elements) {
    if (parts.has(element.id)) continue;
    parts.set(
      element.id,
      element.literal === undefined ? { kind: 'nothing' } : { kind: 'word', text: String(element.literal) },
    );
  }

  // A row of buttons with nothing in them is not a question, however well the stem drew. This catches
  // the types whose choices are route lists or block coordinates, which the facet bag has no room for.
  if (!question.choicesAreStemRows) {
    const anyDrawable = question.choices.some((_, i) => {
      const part = parts.get(choiceId(i));
      return part !== undefined && part.kind !== 'nothing';
    });
    if (!anyDrawable) {
      return {
        ok: false,
        typeCode: item.typeCode,
        why: `the options in this item ${shapeOfChoices(question.choices)}, none of which is something a kit can draw or a word that can be read. They would render as identical empty buttons.`,
      };
    }
  }

  const notes: string[] = [];
  const wordy = [...parts.values()].some((part) => part.kind === 'word');
  const text = kit.dimensions.text;
  if (wordy) {
    notes.push(
      text?.from === 'none' && text.why !== undefined
        ? `${kit.name} does not theme words \u2014 ${text.why}. The item\u2019s own words are shown untouched.`
        : 'The words in this item are its own material, shown untouched rather than themed.',
    );
  }
  if (themed.length === 0) {
    notes.push(`Nothing on screen came from ${kit.name}: this item has no appearance for a kit to dress.`);
  }

  return {
    ok: true,
    itemId: item.itemId,
    typeCode: item.typeCode,
    ask: question.ask,
    stem: question.stem,
    choices: question.choices,
    choicesAreStemRows: question.choicesAreStemRows,
    parts,
    using,
    degreesPerTurn: degreesPerTurn(kit),
    notes,
  };
}
