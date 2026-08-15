import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import { BANKS_DIR, CHANNEL_OVERRIDES, requirementFor } from './requirements';
import { isCounted, type CountedElement, type UiElement } from './capabilities';

/**
 * How much work a new context has to do before it can serve a type.
 *
 * This is the question a marketing or admissions team actually asks, and it has three very different
 * answers. Lumping them together is what makes "just re-skin it" sound cheap for types where it is not.
 *
 * The line that matters is between RE-VOICING and RE-AUTHORING:
 *
 *  - Re-voicing rewrites the instruction. "Which shape completes the pattern" becomes "Which gem
 *    finishes the spell". It happens once per type per theme, it is a sentence, and it cannot change
 *    what the item measures because the reasoning is in the structure rather than the words.
 *  - Re-authoring writes new MATERIAL, per item. A Sentence Completion item is its sentence, so a
 *    themed version is a new item and not a new coat of paint. That changes difficulty, which means the
 *    themed bank is a different instrument and needs its own review.
 *
 * So a team can theme a `legend-only` type in an afternoon and should expect a `reauthor` type to take
 * as long as writing the questions took in the first place, because that is what they are doing.
 */
export type ContextCost =
  /** A legend is enough. The item contains no words at all beyond its instruction. */
  | 'legend-only'
  /** A legend plus one instruction rewrite per type. Still no per-item work. */
  | 'revoice'
  /** New material per item, because the material IS the construct. Changes the instrument. */
  | 'reauthor';

export interface ContextProfile {
  readonly cost: ContextCost;
  readonly why: string;
  /** For `reauthor` types, what a context author has to supply per item. */
  readonly authorSupplies?: readonly string[];
}

/**
 * Per-type context cost.
 *
 * Declared rather than derived, because it is a judgement about where the construct lives and not a
 * fact about the JSON. It is kept honest by {@link lexicalSignals}: a test fails if a type carrying
 * natural-language content is declared cheaper than `reauthor`, so the declaration cannot quietly rot
 * when a bank is regenerated.
 */
export const CONTEXT_PROFILES: Readonly<Record<string, ContextProfile>> = {
  // ---- the construct is language, so a themed version is new writing --------
  'VER-CLOZE-01': {
    cost: 'reauthor',
    why: 'The sentence IS the item. A themed version is a new sentence, at a new difficulty',
    authorSupplies: ['sentence with one gap', 'the correct word', 'three near-miss words'],
  },
  'VER-POLYSEME-01': {
    cost: 'reauthor',
    why: 'Turns on one word having two senses, which is a fact about English and not about the theme',
    authorSupplies: ['a word with two senses', 'a sentence forcing one sense', 'both senses depicted'],
  },
  'VER-RELPAIR-01': {
    cost: 'reauthor',
    why: 'Word pairs and the relations between them have to be written',
    authorSupplies: ['a key pair', 'a pair sharing its relation', 'three pairs that do not'],
  },
  'VER-SENSE-01': {
    cost: 'reauthor',
    why: 'Word order inside a sentence, so the words are the material',
    authorSupplies: ['a sentence, split into word cards'],
  },
  'VER-EVIDENCE-01': {
    cost: 'reauthor',
    why: 'A short story plus a question its own text answers',
    authorSupplies: ['a short passage', 'a question', 'the sentence that supports the answer'],
  },
  'VER-SEQUENCE-01': {
    cost: 'reauthor',
    why: 'Story events, which have to be written in a themed world to be in one',
    authorSupplies: ['three or four story beats, in order'],
  },
  'QUANT-WORD-01': {
    cost: 'reauthor',
    why: 'A word problem. The quantities are reusable but the story around them is not',
    authorSupplies: ['a two or three sentence situation', 'the quantities in it'],
  },
  'GB-WORDLADDER-01': {
    cost: 'reauthor',
    why: 'Needs real words one letter apart, which is a lexicon and not a theme',
    authorSupplies: ['a start and end word', 'a valid ladder between them'],
  },
  'GB-WORDFORGE-01': {
    cost: 'reauthor',
    why: 'Scored against a real lexicon',
    authorSupplies: ['a letter set', 'the acceptable words from it'],
  },
  'GB-FLAWFINDER-01': {
    cost: 'reauthor',
    why: 'Claims and the facts that support them are written arguments',
    authorSupplies: ['two or three facts', 'a supported claim', 'unsupported claims'],
  },
  'CX-check-01': {
    cost: 'reauthor',
    why: 'Presents a sorted set with mistakes in it, and the set is themed content',
    authorSupplies: ['items to sort', 'the sorting rule', 'which ones arrive wrong'],
  },
  'CX-achieve-02': {
    cost: 'reauthor',
    why: 'Self-report style content, entirely language',
    authorSupplies: ['the statements'],
  },
  'VER-MORPHO-01': {
    cost: 'revoice',
    why: 'The morphemes are invented, so nothing real has to be written; only the framing is themed',
  },
  'VER-SORTBOT-01': {
    cost: 'reauthor',
    why: 'Category membership over real things, so a themed version needs themed members',
    authorSupplies: ['a category rule', 'members', 'non-members'],
  },

  // ---- structure only. A legend is the whole job ----------------------------
  'FLU-MATRIX-01': { cost: 'legend-only', why: 'A relation across a grid. No words in the item' },
  'FLU-CARPET-01': { cost: 'legend-only', why: 'Row and column progressions' },
  'FLU-STACK-01': { cost: 'legend-only', why: 'Panel combination' },
  'FLU-ANALOGY-01': { cost: 'legend-only', why: 'A transformation applied to a second pair' },
  'FLU-ODDPAIR-01': { cost: 'legend-only', why: 'Which pair transforms differently' },
  'FLU-VENN-01': { cost: 'legend-only', why: 'Membership of two attribute categories' },
  'FLU-OPCHAIN-01': { cost: 'legend-only', why: 'Chained transforms over an invented symbol set' },
  'FLU-GRIDCOPY-01': { cost: 'legend-only', why: 'Copy a demonstrated grid change' },
  'QUANT-SERIES-01': { cost: 'legend-only', why: 'A quantity progression. Any countable thing works' },
  'QUANT-MATRIX-01': { cost: 'legend-only', why: 'Quantity relation across a web' },
  'QUANT-FUNC-01': { cost: 'legend-only', why: 'Input to output rule' },
  'QUANT-BALANCE-01': { cost: 'legend-only', why: 'Two sides that must weigh the same' },
  'QUANT-GLYPHNUM-01': { cost: 'legend-only', why: 'Invented numerals, so nothing real is named' },
  'QUANT-DOTS-01': { cost: 'legend-only', why: 'More versus fewer' },
  'SPA-PUNCH-01': { cost: 'legend-only', why: 'Fold, punch, unfold. Pure geometry' },
  'SPA-PICKFOLD-01': { cost: 'legend-only', why: 'Which fold produced this' },
  'SPA-FOLDNET-01': { cost: 'legend-only', why: 'Net folded into a solid' },
  'SPA-ROLL-01': { cost: 'legend-only', why: 'A solid tipping through orientations' },
  'SPA-SHADOW-01': { cost: 'legend-only', why: 'Projection of a solid' },
  'SPA-XFORM-01': { cost: 'legend-only', why: 'Invented transform badges' },
  'SPA-XPLANE-01': { cost: 'legend-only', why: 'Where to cut for a target face' },
  'SPA-XSCAN-01': { cost: 'legend-only', why: 'Cross-sections of a solid' },
  'SPA-HIDDENCUBE-01': { cost: 'legend-only', why: 'Counting occluded blocks' },
  'SPA-TANGRAM-01': { cost: 'legend-only', why: 'Fitting shapes into an outline' },
  'WM-corsi-01': { cost: 'legend-only', why: 'A spatial span. Any distinguishable cells work' },
  'WM-bind-01': { cost: 'legend-only', why: 'Objects bound to places' },
  'WM-bubble-01': { cost: 'legend-only', why: 'An n-back over any distinguishable stream' },

  // ---- structural, but the framing is a scenario worth re-voicing -----------
  'FLU-CONCEPT-01': { cost: 'revoice', why: 'A gate rule to discover; the gate is framing' },
  'FLU-DEDUCE-01': { cost: 'revoice', why: 'Clue cards eliminate candidates; the clues are structural' },
  'FLU-LADDER-01': { cost: 'revoice', why: 'Comparisons to integrate; who is compared is framing' },
  'QUANT-MIX-01': { cost: 'revoice', why: 'A ratio held constant; the recipe is framing' },
  'QUANT-GRAPH-01': { cost: 'revoice', why: 'A growing quantity; what grows is framing' },
  'SPA-MAZE-01': { cost: 'revoice', why: 'Route finding; the maze dressing is framing' },
  'SPA-PIPES-01': { cost: 'revoice', why: 'Connect a path; what flows is framing' },
  'SPA-SCENE-01': { cost: 'revoice', why: 'Viewpoint ordering; the objects are framing' },
  'SPA-VIEW-01': { cost: 'revoice', why: 'Whose view; the character is framing' },
  'GB-EXPLORE-01': { cost: 'revoice', why: 'Search under uncertainty; the map is framing' },
  'GB-ROBOPATH-01': { cost: 'revoice', why: 'Program a route; the robot is framing' },
  'GB-TRACK-01': { cost: 'revoice', why: 'Track moving targets; the fireflies are framing' },
};

/** Fields whose presence means the item carries natural language as material. */
const LEXICAL_FIELDS = new Set([
  'sentenceFrame',
  'storyText',
  'storySentences',
  'scenario',
  'conclusion',
  'words',
  'wordPairs',
  'lexicon',
  'statements',
  'claims',
  'facts',
]);

/**
 * Word-like content found in a type's bank, used to keep {@link CONTEXT_PROFILES} honest.
 *
 * Deliberately ignores `prompt` and `question`, because every type has an instruction and an
 * instruction is re-voiced rather than re-authored. What this looks for is material: sentences, word
 * lists, stories.
 */
export function lexicalSignals(typeCode: string, sampleSize = 30): string[] {
  const found = new Set<string>();
  const text = readFileSync(join(BANKS_DIR, `${typeCode}.jsonl`), 'utf8');
  let seen = 0;

  const walk = (value: unknown, depth = 0): void => {
    if (depth > 6) return;
    if (Array.isArray(value)) {
      for (const entry of value.slice(0, 8)) walk(entry, depth + 1);
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value)) {
        if (LEXICAL_FIELDS.has(key)) found.add(key);
        walk(nested, depth + 1);
      }
    }
  };

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    seen += 1;
    if (seen > sampleSize) break;
    walk((JSON.parse(trimmed) as { content?: unknown }).content);
  }

  return [...found].sort();
}

export function contextProfileFor(typeCode: string): ContextProfile {
  return (
    CONTEXT_PROFILES[typeCode] ?? {
      cost: 'reauthor',
      why: 'Not yet classified, so assumed to be the expensive case rather than the cheap one',
    }
  );
}

/**
 * A theme pack: everything a marketing or admissions team fills in to put the library in their app.
 *
 * The point of the shape is that it is fillable without reading any code. `legend` says what the
 * abstract variables look like in this world. `voice` rewrites instructions per type. `material` is
 * only needed for the `reauthor` types and is the part that is real writing.
 */
export interface ThemePack {
  readonly theme: string;
  readonly describes: string;
  /** Which variable becomes what in this world. */
  readonly legend: Readonly<
    Record<
      string,
      {
        readonly label: string;
        readonly order: 'nominal' | 'ordered' | 'cyclic';
        /** The concrete things the values become, in order when the variable is ordered. */
        readonly values: readonly string[];
      }
    >
  >;
  /** Per-type instruction rewrites. Optional; a missing one falls back to the plain wording. */
  readonly voice?: Readonly<Record<string, { readonly prompt: string }>>;
  /** Per-type authored material, required for `reauthor` types. */
  readonly material?: Readonly<Record<string, readonly unknown[]>>;
}

export interface ThemeIssue {
  readonly severity: 'error' | 'warning';
  readonly typeCode?: string;
  readonly message: string;
}

/**
 * Check a theme pack against the types it wants to serve.
 *
 * The error that matters most is the ordering one, because it is the one that produces an item which
 * looks fine and cannot be solved: a rule of "one more each time" mapped onto unordered values leaves
 * nothing for the child to see.
 */
export function validateTheme(pack: ThemePack, typeCodes: readonly string[]): ThemeIssue[] {
  const issues: ThemeIssue[] = [];

  for (const typeCode of typeCodes) {
    const requirement = requirementFor(typeCode);
    const channels = CHANNEL_OVERRIDES[typeCode];
    const profile = contextProfileFor(typeCode);

    // Enough legend entries of the right kind for the channels this type needs?
    const needed: [CountedElement, 'nominal' | 'ordered' | 'cyclic', number][] = [];
    if (channels?.nominal) needed.push(['nominalChannel', 'nominal', channels.nominal]);
    if (channels?.ordered) needed.push(['orderedChannel', 'ordered', channels.ordered]);
    if (channels?.cyclic) needed.push(['cyclicChannel', 'cyclic', channels.cyclic]);

    for (const [element, order, count] of needed) {
      const matching = Object.entries(pack.legend).filter(([, entry]) => entry.order === order);
      if (matching.length === 0) {
        const article = order === 'ordered' ? 'an' : 'a';
        issues.push({
          severity: 'error',
          typeCode,
          message:
            `needs ${article} ${order} variable (${element}) and the theme defines none. ` +
            (order === 'ordered'
              ? 'An ordered rule mapped onto unordered values gives the child nothing to see.'
              : ''),
        });
        continue;
      }
      const best = Math.max(...matching.map(([, entry]) => entry.values.length));
      if (best < count) {
        issues.push({
          severity: 'error',
          typeCode,
          message: `needs ${String(count)} ${order} values, theme's richest ${order} variable has ${String(best)}`,
        });
      }
    }

    if (profile.cost === 'reauthor' && !pack.material?.[typeCode]) {
      issues.push({
        severity: 'error',
        typeCode,
        message:
          `is a reauthor type, so the theme has to supply material: ` +
          `${(profile.authorSupplies ?? ['themed content']).join('; ')}`,
      });
    }

    if (profile.cost === 'revoice' && !pack.voice?.[typeCode]) {
      issues.push({
        severity: 'warning',
        typeCode,
        message: 'reads as a scenario, so it will feel off-theme without a voice entry',
      });
    }

    if (requirement.readingBand !== null && requirement.readingBand !== 'none') {
      const band = requirement.readingBand;
      if (profile.cost !== 'reauthor') {
        issues.push({
          severity: 'warning',
          typeCode,
          message: `carries reading at band ${band}, so themed wording should be checked at that level`,
        });
      }
    }
  }

  const unusedChannels = Object.entries(pack.legend).filter(([, entry]) => entry.values.length === 0);
  for (const [name] of unusedChannels) {
    issues.push({ severity: 'error', message: `legend variable "${name}" has no values` });
  }

  return issues;
}

/** Which UI elements a theme still has to be able to render, given the types it wants. */
export function themeUiGaps(typeCodes: readonly string[]): UiElement[] {
  const elements = new Set<UiElement>();
  for (const typeCode of typeCodes) {
    for (const element of requirementFor(typeCode).elements) {
      if (!isCounted(element)) elements.add(element);
    }
  }
  return [...elements].sort();
}

/** Group a set of types by what it costs a context to adopt them. */
export function costBreakdown(typeCodes: readonly string[]): Record<ContextCost, string[]> {
  const out: Record<ContextCost, string[]> = {
    'legend-only': [],
    revoice: [],
    reauthor: [],
  };
  for (const typeCode of typeCodes) out[contextProfileFor(typeCode).cost].push(typeCode);
  for (const list of Object.values(out)) list.sort();
  return out;
}
