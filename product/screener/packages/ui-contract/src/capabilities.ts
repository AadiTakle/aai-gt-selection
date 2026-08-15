/**
 * The vocabulary of UI elements a question type can require.
 *
 * WHY THIS EXISTS. An item says what it asks, what the choices are and how it is answered, and says
 * nothing about how any of that looks. That is only useful if an app can find out what it needs to be
 * able to DO before it commits to serving a type. This is that list, and it is deliberately short:
 * seventeen entries, split between how the child acts and what the app must be able to show.
 *
 * The test for whether something belongs here is whether an app could fail to have it. "A slider" is a
 * capability because a voice assistant does not have one. "Teal" is not, because it is a choice an app
 * makes rather than a thing it lacks.
 */

/** How the child acts. One per response method, plus the constructed-response cases. */
export const RESPONSE_ELEMENTS = {
  choiceList: 'Present several discrete options and let one be picked',
  multiSelect: 'Let several options be picked at once',
  reorderable: 'Let a set be arranged into an order',
  sequenceTap: 'Let a remembered sequence be reproduced in order',
  analogControl: 'A slider, dial or aim: any continuous value within bounds',
  valueEntry: 'Let a number, word or short construction be produced rather than chosen',
  canvasPlacement: 'Let elements be placed into addressable positions',
} as const;

/**
 * What the app must be able to show.
 *
 * The three CHANNEL entries are the load-bearing ones and they carry a count, because "can you show
 * four distinguishable things" and "can you show four things a child reads as ordered" are different
 * questions and most apps can do the first without the second.
 */
export const PRESENTATION_ELEMENTS = {
  nominalChannel: 'N variants that are merely different from each other',
  orderedChannel: 'N variants a child perceives as running low to high',
  cyclicChannel: 'N variants that wrap around, the way orientation does',
  gridLayout: 'A 2D arrangement with addressable cells',
  coPresent: 'N elements visible or audible at the same time',
  timedReveal: 'Control over when a stimulus appears and for how long',
  motion: 'Animation between two states',
  depthCue: 'Depth, perspective or a third dimension',
  richText: 'Sentences at a stated reading band',
  audioOut: 'Sound output',
} as const;

export type ResponseElement = keyof typeof RESPONSE_ELEMENTS;
export type PresentationElement = keyof typeof PRESENTATION_ELEMENTS;
export type UiElement = ResponseElement | PresentationElement;

export const ALL_RESPONSE_ELEMENTS = Object.keys(RESPONSE_ELEMENTS) as ResponseElement[];
export const ALL_PRESENTATION_ELEMENTS = Object.keys(
  PRESENTATION_ELEMENTS,
) as PresentationElement[];

/** Elements that mean nothing without a number attached. */
export const COUNTED_ELEMENTS = [
  'nominalChannel',
  'orderedChannel',
  'cyclicChannel',
  'coPresent',
] as const satisfies readonly PresentationElement[];

export type CountedElement = (typeof COUNTED_ELEMENTS)[number];

export function isCounted(element: UiElement): element is CountedElement {
  return (COUNTED_ELEMENTS as readonly string[]).includes(element);
}

export function describe(element: UiElement): string {
  return (
    (RESPONSE_ELEMENTS as Record<string, string>)[element] ??
    (PRESENTATION_ELEMENTS as Record<string, string>)[element] ??
    element
  );
}

/**
 * What a type needs, or what an app offers. The same shape for both, which is what makes the
 * comparison a subset test rather than a special case.
 *
 * `counts` is the minimum for a requirement and the maximum for a capability. So a type needing
 * `nominalChannel: 5` is servable by an app offering 6 and not by one offering 4.
 */
export interface UiRequirement {
  readonly elements: readonly UiElement[];
  readonly counts: Readonly<Partial<Record<CountedElement, number>>>;
  /** Highest reading band the type demands, or null when it needs no reading at all. */
  readonly readingBand: string | null;
}

export interface UiCapability {
  readonly name: string;
  readonly elements: readonly UiElement[];
  readonly counts: Readonly<Partial<Record<CountedElement, number>>>;
  readonly readingBand: string | null;
}

export const EMPTY_REQUIREMENT: UiRequirement = {
  elements: [],
  counts: {},
  readingBand: null,
};

/** Reading bands in increasing order, matching the banks' own labels. */
export const READING_BANDS = ['none', 'K-1', '2-3', '4-5', '6-8'] as const;

export function bandRank(band: string | null): number {
  if (band === null) return 0;
  const index = (READING_BANDS as readonly string[]).indexOf(band);
  return index < 0 ? 0 : index;
}

/** The union of several requirements: what an app needs to serve all of them. */
export function mergeRequirements(parts: readonly UiRequirement[]): UiRequirement {
  const elements = new Set<UiElement>();
  const counts: Partial<Record<CountedElement, number>> = {};
  let band: string | null = null;

  for (const part of parts) {
    for (const element of part.elements) elements.add(element);
    for (const [key, value] of Object.entries(part.counts) as [CountedElement, number][]) {
      counts[key] = Math.max(counts[key] ?? 0, value);
    }
    if (bandRank(part.readingBand) > bandRank(band)) band = part.readingBand;
  }

  return { elements: [...elements].sort(), counts, readingBand: band };
}
