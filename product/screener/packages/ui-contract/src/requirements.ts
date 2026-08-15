import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  bandRank,
  mergeRequirements,
  type CountedElement,
  type UiElement,
  type UiRequirement,
} from './capabilities';

/**
 * What each question type needs from a UI, DERIVED from its own bank rather than tabulated by hand.
 *
 * A hand-written table of 53 rows is wrong the first time a bank is regenerated and nobody notices for
 * a month. So the bank is the source of truth wherever it can be: an option list means the app needs a
 * choice list, a `paceMs` means it needs timed reveal, a grid means it needs addressable cells.
 *
 * WHAT CANNOT BE DERIVED, and is declared in {@link CHANNEL_OVERRIDES} instead: how many
 * distinguishable variants a type needs, and whether they have to read as ORDERED. Legacy content
 * hard-codes its own appearance (`{shape: 'star', color: 'teal'}`), so the number of channels it truly
 * requires is not recoverable from it. Once items carry the anonymous `variables` block from the design
 * plan, every one of these overrides disappears, because the item will say `x: {values: 3, order:
 * 'ordered'}` and this file will just read it. The overrides are migration scaffolding and should
 * shrink to nothing.
 */

const HERE = dirname(fileURLToPath(import.meta.url));

export const BANKS_DIR =
  process.env['GT_QBANK_BANKS'] ?? join(HERE, '..', '..', '..', '..', 'qbank-library', 'banks');

/** Content fields that say the response is paced or time-bounded rather than a settled choice. */
const PACED_FIELDS = new Set([
  'timeBudgetSec',
  'timeLimitSec',
  'paceMs',
  'responseWindowMs',
  'streamLength',
  'responseUntimed',
  'instructionSet',
  'exposureMs',
  'leadInMs',
  'flashDurationMs',
  'recallOpensAtMs',
  'presentationEndMs',
  'retentionDelayMs',
  'phaseMs',
  'planWindowMs',
  'encodeMsPerItem',
  'glowMs',
]);

/** Fields that only exist because something moves or is revealed in stages. */
const MOTION_FIELDS = new Set([
  'schedule',
  'flashDurationMs',
  'paceMs',
  'phaseMs',
  'transforms',
  'animation',
  'glowMs',
]);

const GRID_FIELDS = new Set(['grid', 'rows', 'cols', 'cells', 'gridSize', 'matrix', 'walls']);
const DEPTH_FIELDS = new Set(['net', 'faces', 'solid', 'slice', 'plane', 'blocks', 'views']);
/** Substantive prose, as distinct from the one-line `prompt` that nearly every type carries. */
const READING_FIELDS = new Set([
  'storyText',
  'storySentences',
  'sentenceFrame',
  'scenario',
  'conclusion',
  'words',
]);
const SEQUENCE_FIELDS = new Set(['expectedTapCount', 'autoSubmitAtTapCount', 'span', 'schedule']);
const PLACEMENT_FIELDS = new Set(['finalGrid', 'pieces', 'trayOrder', 'rackSize', 'livePreviewStrip']);

export interface TypeSignals {
  readonly typeCode: string;
  readonly items: number;
  readonly maxOptions: number;
  readonly fields: ReadonlySet<string>;
  readonly responseFormats: ReadonlySet<string>;
  readonly readingBand: string | null;
}

function collectFields(value: unknown, into: Set<string>, depth = 0): void {
  if (depth > 6) return;
  if (Array.isArray(value)) {
    for (const entry of value.slice(0, 8)) collectFields(entry, into, depth + 1);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      into.add(key);
      collectFields(nested, into, depth + 1);
    }
  }
}

/** Read one bank and reduce it to the signals that bear on UI needs. */
export function signalsFor(typeCode: string, sampleSize = 60): TypeSignals {
  const file = join(BANKS_DIR, `${typeCode}.jsonl`);
  const fields = new Set<string>();
  const responseFormats = new Set<string>();
  let maxOptions = 0;
  let items = 0;
  let readingBand: string | null = null;

  const text = readFileSync(file, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    items += 1;
    if (items > sampleSize) break;

    const content = (JSON.parse(trimmed) as { content?: Record<string, unknown> }).content ?? {};
    collectFields(content, fields);

    const options = content['options'];
    if (Array.isArray(options)) maxOptions = Math.max(maxOptions, options.length);

    const format = content['responseFormat'];
    if (typeof format === 'string') responseFormats.add(format);

    const load = content['readingLoad'];
    if (load !== null && typeof load === 'object') {
      const band = (load as { band?: unknown }).band;
      if (typeof band === 'string' && bandRank(band) > bandRank(readingBand)) readingBand = band;
    }
  }

  return { typeCode, items, maxOptions, fields, responseFormats, readingBand };
}

/**
 * Channel demands, declared because legacy content cannot reveal them.
 *
 * `nominal` is how many mutually distinguishable variants the type needs. `ordered` is how many of
 * them must read as low-to-high, and it is the entry that actually rules apps out: a type whose rule
 * is "one more each time" is broken by an app that maps the variable onto unordered colours, and the
 * item will still look fine while being unanswerable.
 */
export interface ChannelOverride {
  readonly nominal?: number;
  readonly ordered?: number;
  readonly cyclic?: number;
  readonly why: string;
}

export const CHANNEL_OVERRIDES: Readonly<Record<string, ChannelOverride>> = {
  'FLU-MATRIX-01': { nominal: 4, ordered: 3, why: 'Matrix rules include progressions along a row' },
  'FLU-CARPET-01': { nominal: 4, ordered: 3, why: 'Row and column progressions' },
  'FLU-STACK-01': { nominal: 4, why: 'Panels combine; membership is nominal' },
  'FLU-ANALOGY-01': { nominal: 4, cyclic: 4, why: 'Transformations include rotation' },
  'FLU-ODDPAIR-01': { nominal: 4, cyclic: 4, why: 'Pairs differ by a transformation' },
  'FLU-OPCHAIN-01': { nominal: 6, cyclic: 4, why: 'Chained transforms over a symbol vocabulary' },
  'FLU-VENN-01': { nominal: 4, why: 'Two overlapping category rules' },
  'FLU-CONCEPT-01': { nominal: 4, why: 'Figures built from attribute combinations' },
  'FLU-DEDUCE-01': { nominal: 4, why: 'Elimination over attribute clues' },
  'FLU-GRIDCOPY-01': { nominal: 3, why: 'Cell states to copy' },
  'FLU-LADDER-01': { ordered: 5, why: 'The answer IS an ordering, so rank must be perceivable' },
  'QUANT-SERIES-01': { ordered: 5, why: 'A quantity series is meaningless without perceived order' },
  'QUANT-MATRIX-01': { ordered: 5, why: 'Quantity relations across a web' },
  'QUANT-FUNC-01': { ordered: 5, why: 'Input to output magnitude mapping' },
  'QUANT-BALANCE-01': { ordered: 5, why: 'Heavier and lighter must be visible' },
  'QUANT-MIX-01': { ordered: 4, why: 'Proportions have to read as more and less' },
  'QUANT-DOTS-01': { ordered: 2, why: 'More versus fewer' },
  'QUANT-GRAPH-01': { ordered: 4, why: 'A growing quantity' },
  'QUANT-GLYPHNUM-01': { nominal: 6, ordered: 5, why: 'Invented numerals with induced magnitudes' },
  'QUANT-WORD-01': { ordered: 4, why: 'Quantities in a story' },
  'SPA-XFORM-01': { nominal: 6, cyclic: 4, why: 'Transform badge vocabulary plus orientation' },
  'SPA-ROLL-01': { cyclic: 4, why: 'A cube tipping through orientations' },
  'SPA-SHADOW-01': { cyclic: 4, why: 'Orientation determines the shadow' },
  'SPA-VIEW-01': { cyclic: 4, why: 'Viewpoint is cyclic around the scene' },
  'SPA-SCENE-01': { cyclic: 4, why: 'Viewpoint ordering' },
  'VER-RELPAIR-01': { nominal: 4, why: 'Relations between word pairs' },
  'VER-SORTBOT-01': { nominal: 4, why: 'Category membership' },
  'VER-MORPHO-01': { nominal: 6, why: 'Invented morpheme vocabulary' },
  'VER-POLYSEME-01': { nominal: 4, why: 'Competing senses of one word' },
  'VER-SEQUENCE-01': { ordered: 4, why: 'Story order' },
  'VER-SENSE-01': { ordered: 5, why: 'Word order within a sentence' },
  'WM-corsi-01': { nominal: 9, why: 'Distinguishable cells to remember' },
  'WM-bind-01': { nominal: 6, why: 'Objects bound to locations' },
  'WM-bubble-01': { nominal: 6, why: 'Distinguishable items in the stream' },
};

/**
 * Interaction shapes the bank cannot reveal, declared for the same reason as the channel overrides.
 *
 * A bank row says what the item is, not how the child acts on it: the acting lives in the renderer.
 * So "tap every square that will have a hole" and "pick one of four" look identical in the JSON, and
 * without these the derivation falls back to value entry and quietly reports that nothing in the
 * library needs multi-select or reordering, which is false for eleven types.
 *
 * Like the channel overrides, these disappear once items carry a `method` field.
 */
export const RESPONSE_OVERRIDES: Readonly<Record<string, readonly UiElement[]>> = {
  'SPA-PUNCH-01': ['multiSelect'], // tap every square that will have a hole
  'GB-EXPLORE-01': ['multiSelect'], // point to each hidden landmark
  'FLU-CONCEPT-01': ['multiSelect', 'canvasPlacement'], // build figures to test the gate rule
  'VER-EVIDENCE-01': ['choiceList', 'multiSelect'], // answer, then tap the supporting evidence
  'GB-FLAWFINDER-01': ['multiSelect'], // tap the claims the facts support
  'VER-SENSE-01': ['reorderable'], // arrange word cards into a sentence
  'SPA-SCENE-01': ['reorderable'], // order objects by what the robot sees first
  'SPA-TANGRAM-01': ['canvasPlacement'], // place pieces into the silhouette
  'FLU-GRIDCOPY-01': ['canvasPlacement'], // reproduce the transformed grid
  'SPA-MAZE-01': ['canvasPlacement'], // trace the route
  'SPA-PIPES-01': ['canvasPlacement'], // rotate tiles in place
  'GB-ROBOPATH-01': ['reorderable', 'valueEntry'], // assemble a program from commands
  'QUANT-MIX-01': ['analogControl'], // adjust each ingredient amount
  'SPA-HIDDENCUBE-01': ['valueEntry'], // say how many blocks
  'SPA-XPLANE-01': ['analogControl'], // position the cutting plane
  'SPA-XSCAN-01': ['analogControl', 'choiceList'], // scrub through cross-sections
  'GB-TRACK-01': ['multiSelect'], // tap the jars that still hold fireflies
  'CX-check-01': ['multiSelect'], // fix whichever ones are wrong
};

/** Every type with a bank on disk. */
export function allTypeCodes(): string[] {
  if (!existsSync(BANKS_DIR)) {
    throw new Error(
      `No bank directory at ${BANKS_DIR}. Set GT_QBANK_BANKS to point at qbank-library/banks.`,
    );
  }
  return readdirSync(BANKS_DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => f.slice(0, -'.jsonl'.length))
    .sort();
}

/** Turn one type's bank signals into the UI elements an app must have to serve it. */
export function requirementFor(typeCode: string): UiRequirement {
  const signals = signalsFor(typeCode);
  const elements = new Set<UiElement>();
  const counts: Partial<Record<CountedElement, number>> = {};
  const has = (field: string) => signals.fields.has(field);
  const hasAny = (fields: ReadonlySet<string>) => [...fields].some(has);

  // --- how the child answers -------------------------------------------------
  if (signals.maxOptions > 0) {
    elements.add('choiceList');
    // The options plus a little stem material have to be on screen together.
    counts.coPresent = Math.max(counts.coPresent ?? 0, signals.maxOptions + 2);
  }
  if (signals.responseFormats.has('continuous_placement')) elements.add('analogControl');
  if (hasAny(SEQUENCE_FIELDS)) elements.add('sequenceTap');
  if (hasAny(PLACEMENT_FIELDS)) elements.add('canvasPlacement');
  if (has('instructionSet') || has('optionKind')) elements.add('valueEntry');

  for (const declared of RESPONSE_OVERRIDES[typeCode] ?? []) elements.add(declared);

  // A type with no option list and no other declared way of acting has to be constructed somehow.
  // Value entry is the weakest assumption that still lets it be served.
  const RESPONDING: readonly UiElement[] = [
    'choiceList',
    'multiSelect',
    'reorderable',
    'sequenceTap',
    'analogControl',
    'canvasPlacement',
    'valueEntry',
  ];
  if (!RESPONDING.some((e) => elements.has(e))) elements.add('valueEntry');

  // --- what the app must show ------------------------------------------------
  if (hasAny(GRID_FIELDS)) elements.add('gridLayout');
  if (hasAny(DEPTH_FIELDS)) elements.add('depthCue');
  if (hasAny(PACED_FIELDS)) elements.add('timedReveal');
  if (hasAny(MOTION_FIELDS)) elements.add('motion');
  if (hasAny(READING_FIELDS) || signals.readingBand !== null) elements.add('richText');

  const channels = CHANNEL_OVERRIDES[typeCode];
  if (channels?.nominal) {
    elements.add('nominalChannel');
    counts.nominalChannel = channels.nominal;
  }
  if (channels?.ordered) {
    elements.add('orderedChannel');
    counts.orderedChannel = channels.ordered;
  }
  if (channels?.cyclic) {
    elements.add('cyclicChannel');
    counts.cyclicChannel = channels.cyclic;
  }

  // Anything with a grid needs enough co-present elements to fill it.
  if (has('gridSize') || has('cells')) {
    counts.coPresent = Math.max(counts.coPresent ?? 0, 9);
  }

  return {
    elements: [...elements].sort(),
    counts,
    readingBand: signals.readingBand ?? (elements.has('richText') ? '2-3' : null),
  };
}

/** Requirements for every type, keyed by type code. */
export function requirementsForAll(): Map<string, UiRequirement> {
  return new Map(allTypeCodes().map((code) => [code, requirementFor(code)]));
}

/** The union across a set of types: what one app needs to serve all of them. */
export function requirementForSet(typeCodes: readonly string[]): UiRequirement {
  return mergeRequirements(typeCodes.map(requirementFor));
}
