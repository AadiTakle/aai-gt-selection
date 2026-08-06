/**
 * THE TYPES WORTH SHOWING, and the ones deliberately kept out.
 *
 * The bank has 53 question types and they are not of equal worth. Some are the constructs a CogAT-style
 * screener is actually built on. Others were written earlier, for a different product, and survive only
 * because nothing had a reason to delete them: minigames that measure attention rather than reasoning,
 * arithmetic comparisons that a five-year-old answers by eye, and clue-hunting puzzles whose difficulty
 * is reading comprehension of the clue list.
 *
 * A demo that serves the whole bank shows the weakest thing in it roughly every third question, and the
 * weakest thing is what gets remembered. So this file is an allowlist, not a blocklist: a type appears
 * because someone placed it in one of the five families below, and anything unplaced stays out.
 *
 * WHY THE POOL AND NOT THE RENDERER. Filtering at the point of drawing means the engine still selects
 * these items, still spends them, and the app declines them one at a time — half the session becomes
 * round-trips for items nobody sees, and the ability estimate is built from unscorable attempts. The
 * restriction belongs where the pool is built, so the engine only ever chooses among items that will be
 * shown.
 */

/** The families, in the order they are worth presenting. */
export const SHOWCASE_FAMILIES = [
  'matrix',
  'spatial',
  'wordAssociation',
  'sentenceCompletion',
  'quantPattern',
] as const;

export type ShowcaseFamily = (typeof SHOWCASE_FAMILIES)[number];

export interface ShowcaseType {
  readonly typeCode: string;
  readonly title: string;
  readonly family: ShowcaseFamily;
}

/**
 * Matrices and figure analogies: a grid or a pair with a rule to infer and a hole to fill.
 * The CogAT Figure Matrices and Number Analogies constructs, and the strongest thing in the bank.
 */
const MATRIX: readonly ShowcaseType[] = [
  { typeCode: 'FLU-MATRIX-01', title: 'Machine Matrix', family: 'matrix' },
  { typeCode: 'FLU-CARPET-01', title: 'Pattern Carpet', family: 'matrix' },
  { typeCode: 'FLU-ANALOGY-01', title: 'Shape Morph', family: 'matrix' },
  { typeCode: 'QUANT-MATRIX-01', title: 'Number Web', family: 'matrix' },
];

/**
 * Spatial reasoning: fold it, turn it, slice it, light it, and say what results.
 * Paper Folding and figure rotation, and the part of the bank with the best renderers.
 */
const SPATIAL: readonly ShowcaseType[] = [
  { typeCode: 'SPA-PUNCH-01', title: 'Fold & Punch', family: 'spatial' },
  { typeCode: 'SPA-PICKFOLD-01', title: 'Which Fold Made It?', family: 'spatial' },
  { typeCode: 'SPA-FOLDNET-01', title: 'Fold-the-Net', family: 'spatial' },
  { typeCode: 'SPA-ROLL-01', title: 'Rolling Cube', family: 'spatial' },
  { typeCode: 'SPA-SHADOW-01', title: 'Shadow Play', family: 'spatial' },
  { typeCode: 'SPA-HIDDENCUBE-01', title: 'X-Ray Cubes', family: 'spatial' },
  { typeCode: 'SPA-XPLANE-01', title: 'Place the Slice', family: 'spatial' },
  { typeCode: 'SPA-XFORM-01', title: 'Transform Machine', family: 'spatial' },
  { typeCode: 'SPA-TANGRAM-01', title: 'Shape-Fill Form Board', family: 'spatial' },
  { typeCode: 'SPA-XSCAN-01', title: 'Scan Stacker', family: 'spatial' },
];

/** Word association: which word goes with which, and why. Verbal Analogies and Classification. */
const WORD_ASSOCIATION: readonly ShowcaseType[] = [
  { typeCode: 'VER-RELPAIR-01', title: 'Relation Match', family: 'wordAssociation' },
  { typeCode: 'VER-SORTBOT-01', title: 'Sorting Robot', family: 'wordAssociation' },
  { typeCode: 'VER-POLYSEME-01', title: 'Two Meanings', family: 'wordAssociation' },
];

/** Sentence and paragraph completion: the missing word, the wrong sentence, the scrambled order. */
const SENTENCE_COMPLETION: readonly ShowcaseType[] = [
  { typeCode: 'VER-CLOZE-01', title: 'Fill the Gap', family: 'sentenceCompletion' },
  { typeCode: 'VER-SENSE-01', title: 'Sentence Sense', family: 'sentenceCompletion' },
];

/** Quantitative pattern and series: infer the rule that generated the numbers, then extend it. */
const QUANT_PATTERN: readonly ShowcaseType[] = [
  { typeCode: 'QUANT-SERIES-01', title: 'Pattern Steps', family: 'quantPattern' },
  { typeCode: 'QUANT-FUNC-01', title: 'Machine Rule', family: 'quantPattern' },
  { typeCode: 'QUANT-GLYPHNUM-01', title: 'Alien Numbers', family: 'quantPattern' },
];

export const SHOWCASE_TYPES: readonly ShowcaseType[] = [
  ...MATRIX,
  ...SPATIAL,
  ...WORD_ASSOCIATION,
  ...SENTENCE_COMPLETION,
  ...QUANT_PATTERN,
];

/** Just the codes, which is what a session start needs. */
export const SHOWCASE_TYPE_CODES: readonly string[] = SHOWCASE_TYPES.map((t) => t.typeCode);

/**
 * What is held back, and why, so the decision is arguable rather than mysterious.
 *
 * Kept as data because the next person will disagree with some of it, and disagreeing should mean
 * moving one line rather than re-deriving the reasoning.
 */
export const HELD_BACK: readonly { readonly typeCode: string; readonly title: string; readonly why: string }[] = [
  // Quantitative comparison. Answerable by looking rather than by reasoning, which is the whole problem:
  // a child who cannot reason still gets these right, so they carry almost no information.
  { typeCode: 'QUANT-DOTS-01', title: 'More or Fewer', why: 'comparison answered by eye' },
  { typeCode: 'QUANT-BALANCE-01', title: 'Balance Lab', why: 'comparison answered by eye' },
  { typeCode: 'QUANT-MIX-01', title: 'Fair Share', why: 'arithmetic word problem, not a pattern' },
  { typeCode: 'QUANT-WORD-01', title: 'Story Model', why: 'arithmetic word problem, not a pattern' },
  { typeCode: 'QUANT-GRAPH-01', title: 'Story Graph', why: 'graph reading, not a pattern' },

  // Clue-hunting. The difficulty is holding a list of constraints in mind while reading, so it measures
  // reading and working memory and calls the result reasoning.
  { typeCode: 'FLU-DEDUCE-01', title: 'Clue Detective', why: 'clue-list puzzle, difficulty is the reading' },
  { typeCode: 'FLU-CONCEPT-01', title: 'Mystery Gate', why: 'clue-list puzzle, difficulty is the reading' },
  { typeCode: 'FLU-VENN-01', title: 'Double Match', why: 'clue-list puzzle, difficulty is the reading' },
  { typeCode: 'FLU-ODDPAIR-01', title: 'Odd Pair Out', why: 'clue-list puzzle, difficulty is the reading' },
  { typeCode: 'FLU-LADDER-01', title: 'Ranking Ladder', why: 'clue-list puzzle, difficulty is the reading' },
  { typeCode: 'FLU-GRIDCOPY-01', title: 'Copy the Change', why: 'copying task, no rule to infer' },
  // A sound matrix construct, but its cells are bitmasks standing for overlaid panels. A themed surface
  // has nothing honest to draw for "the number 11 as a 2x2 of lit squares", so it would show options
  // above an empty stem, which is worse than not showing it.
  { typeCode: 'FLU-STACK-01', title: 'Stack the Panel', why: 'cells are bitmask panels, nothing to draw' },
  { typeCode: 'FLU-OPCHAIN-01', title: 'Machine Chain', why: 'procedure following, not a rule to infer' },

  // Minigames built for a different product. They measure attention, memory span and motor timing.
  { typeCode: 'WM-bubble-01', title: 'Bubble Pop Memory', why: 'working-memory minigame, not reasoning' },
  { typeCode: 'WM-corsi-01', title: 'Firefly Trail', why: 'working-memory minigame, not reasoning' },
  { typeCode: 'WM-bind-01', title: 'Home Again', why: 'working-memory minigame, not reasoning' },
  { typeCode: 'GB-EXPLORE-01', title: "Explorer's Map", why: 'stage-2 minigame, built for another product' },
  { typeCode: 'GB-FLAWFINDER-01', title: 'Fib Finder', why: 'stage-2 minigame, built for another product' },
  { typeCode: 'GB-ROBOPATH-01', title: 'Path Coder', why: 'stage-2 minigame, built for another product' },
  { typeCode: 'GB-TRACK-01', title: 'Firefly Jars', why: 'stage-2 minigame, built for another product' },
  { typeCode: 'GB-WORDFORGE-01', title: 'Word Forge', why: 'stage-2 minigame, built for another product' },
  { typeCode: 'GB-WORDLADDER-01', title: 'Letter Climb', why: 'stage-2 minigame, built for another product' },
  { typeCode: 'CX-check-01', title: 'Check It Twice', why: 'self-report, not a question' },
  { typeCode: 'CX-achieve-02', title: 'Achievement check', why: 'self-report, not a question' },

  // Path planning rather than spatial reasoning: there is a route to find, not a figure to transform.
  { typeCode: 'SPA-MAZE-01', title: 'Plan-the-Path', why: 'route planning, not spatial transformation' },
  { typeCode: 'SPA-PIPES-01', title: 'Path Connect', why: 'route planning, not spatial transformation' },

  // Perspective taking. Sound constructs, but both renderers are weak and one cannot be presented
  // headlessly at all, so they would be the worst-looking thing on screen.
  { typeCode: 'SPA-VIEW-01', title: 'What Do They See', why: 'renderer too weak to present' },
  { typeCode: 'SPA-SCENE-01', title: 'What the Robot Sees', why: 'renderer too weak to present' },

  // Verbal types that do not fit the two verbal families being shown.
  { typeCode: 'VER-MORPHO-01', title: 'Word Machines', why: 'morphology, neither association nor completion' },
  // Its options are orderings — {order: [0,1,2]} — with no text of their own, so on a surface that draws
  // choices rather than a drag-to-reorder widget all three look identical. A good construct waiting on an
  // ordering interaction, not something to put in front of anyone yet.
  { typeCode: 'VER-SEQUENCE-01', title: 'Story Order', why: 'needs an ordering interaction, choices are indistinguishable' },
  { typeCode: 'VER-EVIDENCE-01', title: 'Proof Hunt', why: 'compound answer key the surfaces cannot submit' },
];

/** Which family a type belongs to, or undefined when it is held back. */
export function familyOf(typeCode: string): ShowcaseFamily | undefined {
  return SHOWCASE_TYPES.find((t) => t.typeCode === typeCode)?.family;
}

export function titleOf(typeCode: string): string | undefined {
  return (
    SHOWCASE_TYPES.find((t) => t.typeCode === typeCode)?.title ??
    HELD_BACK.find((t) => t.typeCode === typeCode)?.title
  );
}

export const FAMILY_LABELS: Readonly<Record<ShowcaseFamily, string>> = {
  matrix: 'Matrices and figure analogies',
  spatial: 'Spatial reasoning',
  wordAssociation: 'Word association',
  sentenceCompletion: 'Sentence and paragraph completion',
  quantPattern: 'Number patterns and series',
};
