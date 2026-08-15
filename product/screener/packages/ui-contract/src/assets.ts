import { describe, isCounted, type UiElement } from './capabilities';
import { contextProfileFor, type ContextCost } from './context';
import { requirementFor } from './requirements';

/**
 * Turning a UI requirement into an art brief.
 *
 * `nominalChannel: 4` is precise and useless to an illustrator. "Four creatures a child can tell
 * apart at a glance, same silhouette weight so none looks like the answer" is the same fact in a form
 * somebody can draw. This module is that translation, and it is the reason the theme planner can
 * produce a task list rather than a specification.
 *
 * The briefs are TEMPLATES seeded with the theme's own words. They are meant to be edited, which is
 * why every one carries a stable id: the planner keeps the user's edits keyed by it.
 */

export interface AssetBrief {
  /** Stable across regenerations, so an edit survives changing the type selection. */
  readonly id: string;
  readonly element: UiElement;
  readonly title: string;
  readonly brief: string;
  /** How many distinct pieces of art or copy this implies. */
  readonly quantity: number;
  /** Types that need this, so dropping them is visibly what removes the work. */
  readonly neededBy: readonly string[];
  readonly kind: 'art' | 'motion' | 'copy' | 'interaction';
}

/** A noun the theme mentioned, used to seed a brief instead of saying "a thing". */
function subject(themeWords: readonly string[], index = 0): string {
  return themeWords[index] ?? themeWords[0] ?? 'object';
}

/**
 * The brief for one element, in the theme's language.
 *
 * The `quantity` is the number that matters for planning, and it comes from the requirement rather
 * than from a guess: a type needing five ordered variants needs five pieces of art, not "some".
 */
function briefFor(
  element: UiElement,
  count: number,
  words: readonly string[],
  neededBy: readonly string[],
): AssetBrief {
  const one = subject(words, 0);
  const two = subject(words, 1);

  const table: Partial<Record<UiElement, Omit<AssetBrief, 'id' | 'element' | 'neededBy'>>> = {
    nominalChannel: {
      title: `${String(count)} kinds of ${one}`,
      brief:
        `${String(count)} ${one} variants a child tells apart instantly. Give them equal visual ` +
        `weight: if one is bigger or brighter than the rest it will read as the answer.`,
      quantity: count,
      kind: 'art',
    },
    orderedChannel: {
      title: `${String(count)} steps of "more ${one}"`,
      brief:
        `${String(count)} states that obviously run from least to most, in even steps. Counting ` +
        `(one ${one}, two, three) is the safest; size works; colour does NOT, because a child ` +
        `cannot tell you which colour comes next.`,
      quantity: count,
      kind: 'art',
    },
    cyclicChannel: {
      title: `${String(count)} facings of one ${one}`,
      brief:
        `The same ${one} at ${String(count)} orientations, and it must be visibly asymmetric so a ` +
        `quarter turn is unmistakable. A radially symmetric shape makes the item unanswerable.`,
      quantity: count,
      kind: 'art',
    },
    coPresent: {
      title: `A layout holding ${String(count)} things at once`,
      brief:
        `${String(count)} elements on screen together, legible on a phone. This is the constraint ` +
        `most likely to force a redesign late, so check it at the smallest size you support first.`,
      quantity: 1,
      kind: 'art',
    },
    gridLayout: {
      title: 'A board frame with addressable cells',
      brief:
        `A 2x2 and a 3x3 frame in the ${one} world, with one cell able to read as empty or ` +
        `questioning without looking broken.`,
      quantity: 2,
      kind: 'art',
    },
    depthCue: {
      title: `${one} with depth`,
      brief:
        `An isometric or perspective treatment, because these items ask a child to picture a solid ` +
        `turning. Flat art makes them impossible rather than hard.`,
      quantity: 1,
      kind: 'art',
    },
    motion: {
      title: 'One transition animation',
      brief:
        `A short animation showing one state becoming another. Around 400 to 700ms: fast enough not ` +
        `to bore, slow enough to be read, and identical every time so the pacing is not a variable.`,
      quantity: 1,
      kind: 'motion',
    },
    timedReveal: {
      title: 'A show-then-hide sequence',
      brief:
        `Present something for a controlled duration and then remove it. The duration must be exact ` +
        `and unaffected by device speed, because it is part of the measurement rather than a flourish.`,
      quantity: 1,
      kind: 'interaction',
    },
    audioOut: {
      title: `${one} voice and sound set`,
      brief: `Spoken instructions and distinct sounds, for surfaces with no screen or non-readers.`,
      quantity: 1,
      kind: 'art',
    },
    richText: {
      title: 'A reading-level pass on all wording',
      brief:
        `Every sentence checked at the stated grade band. Vocabulary the child has to decode is ` +
        `reading difficulty pretending to be reasoning difficulty.`,
      quantity: 1,
      kind: 'copy',
    },
    choiceList: {
      title: `Answer choices as ${two}`,
      brief:
        `Several options a child picks one of. In a themed app this is rarely a button row: a fork ` +
        `in a path, three doors, or ${two} to choose between all read as play instead of a test.`,
      quantity: 1,
      kind: 'interaction',
    },
    multiSelect: {
      title: 'A pick-several interaction',
      brief:
        `Select several before confirming, with the selection visible and reversible. Needs a ` +
        `commit action, or a child who taps a fourth thing has silently changed their answer.`,
      quantity: 1,
      kind: 'interaction',
    },
    reorderable: {
      title: 'A drag-to-order interaction',
      brief: `Arrange things into a sequence. Must work by tapping as well as dragging, on a phone.`,
      quantity: 1,
      kind: 'interaction',
    },
    sequenceTap: {
      title: 'A repeat-the-sequence interaction',
      brief: `Reproduce an order that was just shown, with each tap acknowledged as it lands.`,
      quantity: 1,
      kind: 'interaction',
    },
    analogControl: {
      title: 'A slider, dial or aim',
      brief:
        `A continuous value inside bounds. Themed as aiming a throw or setting a dial rather than ` +
        `an input, and it needs a visible commit so a resting finger is not an answer.`,
      quantity: 1,
      kind: 'interaction',
    },
    valueEntry: {
      title: 'A produce-a-value interaction',
      brief: `Enter a number or short word. A themed keypad or tile rack beats a text field.`,
      quantity: 1,
      kind: 'interaction',
    },
    canvasPlacement: {
      title: 'A place-things interaction',
      brief: `Put elements into positions on a board, with snapping and an undo.`,
      quantity: 1,
      kind: 'interaction',
    },
  };

  const entry = table[element] ?? {
    title: element,
    brief: describe(element),
    quantity: 1,
    kind: 'art' as const,
  };

  return { id: `asset:${element}`, element, neededBy, ...entry };
}

export interface AssetPlan {
  readonly briefs: readonly AssetBrief[];
  /** Types grouped by what a context has to write for them. */
  readonly writing: Readonly<Record<ContextCost, readonly string[]>>;
  readonly totals: {
    readonly artPieces: number;
    readonly interactions: number;
    readonly promptsToRewrite: number;
    readonly typesNeedingNewItems: number;
  };
}

/** Words worth reusing in a brief, pulled out of whatever the user typed. */
export function themeWords(idea: string): string[] {
  const stop = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'for', 'with', 'about', 'that', 'this', 'they', 'them',
    'kids', 'kid', 'children', 'child', 'game', 'app', 'theme', 'where', 'which', 'their', 'like',
    'into', 'from', 'have', 'has', 'are', 'you', 'your', 'can', 'will', 'them', 'it', 'is', 'in',
    'on', 'to', 'be', 'as', 'by', 'at', 'so', 'if', 'then', 'than', 'but', 'not', 'all', 'some',
  ]);
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of idea.toLowerCase().split(/[^a-z']+/)) {
    const word = raw.replace(/'s$/, '');
    if (word.length < 3 || stop.has(word) || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }
  return words;
}

/** The whole plan for a theme across a set of types. */
export function planAssets(idea: string, typeCodes: readonly string[]): AssetPlan {
  const words = themeWords(idea);

  // Which types need each element, and the largest count any of them needs.
  const owners = new Map<UiElement, string[]>();
  const counts = new Map<UiElement, number>();
  for (const typeCode of typeCodes) {
    const requirement = requirementFor(typeCode);
    for (const element of requirement.elements) {
      owners.set(element, [...(owners.get(element) ?? []), typeCode]);
      if (isCounted(element)) {
        const needed = requirement.counts[element] ?? 0;
        counts.set(element, Math.max(counts.get(element) ?? 0, needed));
      }
    }
  }

  const briefs = [...owners.entries()]
    .map(([element, neededBy]) => briefFor(element, counts.get(element) ?? 1, words, neededBy.sort()))
    .sort((a, b) => b.neededBy.length - a.neededBy.length || a.element.localeCompare(b.element));

  const writing: Record<ContextCost, string[]> = { 'legend-only': [], revoice: [], reauthor: [] };
  for (const typeCode of typeCodes) writing[contextProfileFor(typeCode).cost].push(typeCode);
  for (const list of Object.values(writing)) list.sort();

  return {
    briefs,
    writing,
    totals: {
      artPieces: briefs.filter((b) => b.kind === 'art').reduce((sum, b) => sum + b.quantity, 0),
      interactions: briefs.filter((b) => b.kind === 'interaction').length,
      promptsToRewrite: writing.revoice.length,
      typesNeedingNewItems: writing.reauthor.length,
    },
  };
}
