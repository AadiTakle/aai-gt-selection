/**
 * Which of our types correspond to a CogAT subtest, and how directly.
 *
 * Audited against the banks rather than inferred from names. `direct` means the same item family as
 * the subtest; `loose` means a related construct in a different format. Everything absent from this
 * file has no CogAT analogue, which is 35 of the 53 types and is a fact about the library rather than
 * an oversight: the working-memory, executive-function and game-based types exist for reasons argued
 * elsewhere and are not pretending to be CogAT.
 *
 * The gap that matters: CogAT's own Screening Form is the analogies portion of each battery, namely
 * Verbal Analogies, Number Analogies and Figure Matrices. We have nothing for Verbal Analogies.
 */

export const COGAT_SUBTESTS = [
  'verbal-analogies',
  'sentence-completion',
  'verbal-classification',
  'number-analogies',
  'number-series',
  'number-puzzles',
  'figure-matrices',
  'paper-folding',
  'figure-classification',
] as const;

export type CogatSubtest = (typeof COGAT_SUBTESTS)[number];

/** The three subtests Riverside's own screening form is built from. */
export const SCREENING_FORM_SUBTESTS: readonly CogatSubtest[] = [
  'verbal-analogies',
  'number-analogies',
  'figure-matrices',
];

/**
 * Either a subtest this type corresponds to, or an explicit statement that none does.
 *
 * Before 2.2 an absent entry meant two different things — "deliberately not CogAT" for the working-memory and
 * game-based families, and "nobody has looked yet" for the rest — and nothing distinguished them. Every one of
 * the 53 types now has an entry, so absence is a bug rather than an ambiguity, and `2.3` can fail the build on
 * it.
 *
 * `needsAuthorReview` marks the calls that were made from the type catalogue and a sample item rather than
 * from authoring the bank. CogAT alignment is a measurement claim, so the ones that were genuinely arguable say
 * so instead of hiding inside a confident-looking table. Grep for it.
 */
export type CogatMapping =
  | {
      readonly subtest: CogatSubtest;
      /** `direct` is the same item family as the subtest; `loose` is a related construct in a different format. */
      readonly strength: 'direct' | 'loose';
      readonly note: string;
      readonly needsAuthorReview?: boolean;
    }
  | {
      readonly subtest: 'none';
      readonly note: string;
      readonly needsAuthorReview?: boolean;
    };

export const COGAT_MAP: Readonly<Record<string, CogatMapping>> = {
  'VER-CLOZE-01': {
    subtest: 'sentence-completion',
    strength: 'direct',
    note: 'Cloze frames; the bank is tagged sentence_completion in the type catalogue',
  },
  'VER-POLYSEME-01': {
    subtest: 'sentence-completion',
    strength: 'loose',
    note: 'Disambiguates a homograph inside a sentence rather than completing one',
  },
  'VER-RELPAIR-01': {
    subtest: 'verbal-analogies',
    strength: 'loose',
    note: 'Matches a relationship between pairs; does NOT complete A:B::C:?, per its own catalogue entry',
  },
  'VER-SORTBOT-01': {
    subtest: 'verbal-classification',
    strength: 'direct',
    note: 'Infers a category rule and sorts new items by it',
  },
  'QUANT-MATRIX-01': {
    subtest: 'number-analogies',
    strength: 'direct',
    note: 'Quantity relation across a matrix, which is the CogAT format',
  },
  'QUANT-FUNC-01': {
    subtest: 'number-analogies',
    strength: 'loose',
    note: 'Input to output rule rather than a matrix',
  },
  'QUANT-SERIES-01': {
    subtest: 'number-series',
    strength: 'direct',
    note: 'Continue the quantity series',
  },
  'QUANT-BALANCE-01': {
    subtest: 'number-puzzles',
    strength: 'direct',
    note: 'Balance the scale, which is the trains-and-equations form',
  },
  'FLU-MATRIX-01': {
    subtest: 'figure-matrices',
    strength: 'direct',
    note: 'Figural matrix with a missing cell',
  },
  'FLU-CARPET-01': {
    subtest: 'figure-matrices',
    strength: 'direct',
    note: 'Row and column figural progression',
  },
  'FLU-STACK-01': {
    subtest: 'figure-matrices',
    strength: 'direct',
    note: 'Two panels combine into a third',
  },
  'FLU-VENN-01': {
    subtest: 'figure-classification',
    strength: 'direct',
    note: 'Figure belonging to two category rules at once',
  },
  'FLU-CONCEPT-01': {
    subtest: 'figure-classification',
    strength: 'loose',
    note: 'Induces a rule by testing figures rather than choosing among them',
  },
  'FLU-DEDUCE-01': {
    subtest: 'figure-classification',
    strength: 'loose',
    note: 'Elimination against clue cards',
  },
  'SPA-PUNCH-01': {
    subtest: 'paper-folding',
    strength: 'direct',
    note: 'Fold, punch, predict the unfolded sheet. The canonical form',
  },
  'SPA-PICKFOLD-01': {
    subtest: 'paper-folding',
    strength: 'loose',
    note: 'Works backwards from the holes to the fold',
  },
  'SPA-FOLDNET-01': {
    subtest: 'paper-folding',
    strength: 'loose',
    note: 'Folds a net into a solid, which is a different visualisation',
  },

  // -------------------------------------------------------------------------
  // Added by 2.2, 8 Aug 2026. Classified from the type catalogue
  // (archive/research/exam-question-types/CATEGORY_MAP.md) and a sample item each, not from names.
  //
  // The recurring reason for `none` is worth stating once: CogAT is nine subtests measuring reasoning by
  // analogy, series, classification and one spatial visualisation (paper folding). It has no subtest for
  // memory span, for reading comprehension, for path planning, for mental rotation, for cross-sections, or
  // for scientific method. Types measuring those are not deficient CogAT items; they are measuring something
  // CogAT does not.
  // -------------------------------------------------------------------------

  // Working memory (3). Span and binding tasks. CogAT measures reasoning, not capacity.
  'WM-bind-01': { subtest: 'none', note: 'Object-location binding span. No CogAT subtest measures memory capacity' },
  'WM-bubble-01': { subtest: 'none', note: 'N-back recognition. A memory task, not a reasoning one' },
  'WM-corsi-01': { subtest: 'none', note: 'Corsi spatial span. Capacity, not reasoning' },

  // Game-based (6).
  'GB-EXPLORE-01': { subtest: 'none', note: 'Map exploration and pointing. Navigation has no CogAT analogue' },
  'GB-FLAWFINDER-01': {
    subtest: 'none',
    note: 'Picks the claim facts best support. Evidence evaluation; CogAT has no inference-from-text subtest',
  },
  'GB-ROBOPATH-01': { subtest: 'none', note: 'Sequences commands to move a robot. Procedural planning, not CogAT' },
  'GB-TRACK-01': { subtest: 'none', note: 'Multiple-object tracking. Attention, not reasoning' },
  'GB-WORDFORGE-01': { subtest: 'none', note: 'Builds real words against the clock. Lexical production, not reasoning' },
  'GB-WORDLADDER-01': { subtest: 'none', note: 'One-letter-at-a-time word transformation. Search, not analogy' },

  // Context (2).
  'CX-achieve-02': {
    subtest: 'none',
    note: 'Designs trials against a budget and draws a conclusion. Scientific method; no CogAT analogue',
  },
  'CX-check-01': {
    subtest: 'none',
    note: 'Corrects a partly-wrong sort. Nearest CogAT idea is classification, but the task is to repair an assignment rather than to extend a category, and the response is a whole mapping',
    needsAuthorReview: true,
  },

  // Verbal (4). None of these is analogies, completion or classification, which is all CogAT verbal is.
  'VER-EVIDENCE-01': { subtest: 'none', note: 'Passage plus supporting-evidence selection. Reading comprehension' },
  'VER-MORPHO-01': { subtest: 'none', note: 'Builds a word from morphemes. Morphology and vocabulary, not verbal reasoning' },
  'VER-SENSE-01': { subtest: 'none', note: 'Orders word cards into a grammatical sentence. Syntax construction' },
  'VER-SEQUENCE-01': { subtest: 'none', note: 'Orders story parts by narrative time. Discourse sequencing' },

  // Spatial (11). CogAT's only spatial visualisation subtest is Paper Folding; rotation, cross-section,
  // perspective and path planning have no counterpart, which is the honest finding rather than a gap to fill.
  'SPA-HIDDENCUBE-01': { subtest: 'none', note: 'Counts occluded cubes in a stack. Spatial enumeration' },
  'SPA-MAZE-01': { subtest: 'none', note: 'Chooses the shortest of several routes. Path planning' },
  'SPA-PIPES-01': { subtest: 'none', note: 'Rotates tiles to connect a route. Connection planning' },
  'SPA-ROLL-01': { subtest: 'none', note: 'Tracks a face through a rolling cube. Mental rotation, which CogAT does not test' },
  'SPA-SCENE-01': { subtest: 'none', note: 'Orders a scene from another viewer angle. Perspective taking' },
  'SPA-SHADOW-01': { subtest: 'none', note: 'Predicts a cast shadow. Projection, not folding' },
  'SPA-TANGRAM-01': {
    subtest: 'none',
    note: 'Fills an outline from a tray with red herrings. Form-board assembly; adjacent to Paper Folding in materials but not in construct',
    needsAuthorReview: true,
  },
  'SPA-VIEW-01': { subtest: 'none', note: 'Picks the viewer given the view. Perspective taking, reversed' },
  'SPA-XFORM-01': {
    subtest: 'figure-matrices',
    strength: 'loose',
    note: 'Applies a declared chain of transformations to a figure. Same rule-application construct, presented as an operator chain rather than a matrix',
    needsAuthorReview: true,
  },
  'SPA-XPLANE-01': { subtest: 'none', note: 'Positions a cutting plane to produce a given face. Cross-section' },
  'SPA-XSCAN-01': { subtest: 'none', note: 'Identifies a solid from its slices. Cross-section' },

  // Quantitative (5).
  'QUANT-DOTS-01': { subtest: 'none', note: 'Non-symbolic magnitude comparison. Number sense, below the level CogAT tests' },
  'QUANT-GLYPHNUM-01': { subtest: 'none', note: 'Places a value on a number line to a tolerance. Estimation, and not currently servable (1b.6)' },
  'QUANT-GRAPH-01': { subtest: 'none', note: 'Matches a filling tank to its graph. Representational translation' },
  'QUANT-MIX-01': {
    subtest: 'number-puzzles',
    strength: 'loose',
    note: 'Matches a mixture by proportion. Equivalence reasoning like Number Puzzles, but continuous and manipulative rather than an equation',
    needsAuthorReview: true,
  },
  'QUANT-WORD-01': {
    subtest: 'none',
    note: 'Story problems. Deliberately excluded rather than mapped: CogAT\'s quantitative battery keeps reading load low on purpose, and a word problem measures reading alongside number',
  },

  // Fluid (5).
  'FLU-ANALOGY-01': {
    subtest: 'figure-matrices',
    strength: 'loose',
    note: 'Figure analogy by co-transform. Same construct as a 2x2 matrix; loose only because it is presented as a morph pair rather than a grid',
  },
  'FLU-GRIDCOPY-01': {
    subtest: 'figure-matrices',
    strength: 'loose',
    note: 'Applies an observed change to a second grid. Rule induction then application, in a different format',
    needsAuthorReview: true,
  },
  'FLU-LADDER-01': { subtest: 'none', note: 'Transitive inference from clues to a ranking. Deductive, not analogical' },
  'FLU-ODDPAIR-01': {
    subtest: 'figure-classification',
    strength: 'loose',
    note: 'Finds the pair not sharing the relation. Classification inverted: the odd one out rather than the one that belongs',
    needsAuthorReview: true,
  },
  'FLU-OPCHAIN-01': {
    subtest: 'figure-matrices',
    strength: 'loose',
    note: 'Applies an operator chain to an input. Shares its content shape with SPA-XFORM-01 and is the same construct',
    needsAuthorReview: true,
  },
};

/** Types with direct correspondence, which is what a CogAT-aligned instrument may draw from. */
export const COGAT_ALIGNED_TYPES: readonly string[] = Object.entries(COGAT_MAP)
  .filter(([, mapping]) => mapping.subtest !== 'none' && mapping.strength === 'direct')
  .map(([typeCode]) => typeCode)
  .sort();

/** Subtests with no direct analogue in the library. */
export function uncoveredSubtests(): CogatSubtest[] {
  const covered = new Set(
    Object.values(COGAT_MAP)
      .filter((m) => m.subtest !== 'none' && m.strength === 'direct')
      .map((m) => m.subtest),
  );
  return COGAT_SUBTESTS.filter((subtest) => !covered.has(subtest));
}

export function typesForSubtest(
  subtest: CogatSubtest,
  strength?: 'direct' | 'loose',
): string[] {
  return Object.entries(COGAT_MAP)
    .filter(([, m]) => m.subtest === subtest && (strength === undefined || ('strength' in m && m.strength === strength)))
    .map(([typeCode]) => typeCode)
    .sort();
}

/**
 * Types whose CogAT call was made from the catalogue and a sample item rather than by the bank's author.
 *
 * CogAT alignment is a measurement claim, so the arguable ones are listed rather than left to look as settled
 * as the obvious ones. Anyone hardening requirement 2 should start here.
 */
export const COGAT_NEEDS_AUTHOR_REVIEW: readonly string[] = Object.entries(COGAT_MAP)
  .filter(([, m]) => m.needsAuthorReview === true)
  .map(([typeCode]) => typeCode)
  .sort();

/**
 * Types with no CogAT analogue, stated rather than implied.
 *
 * The distinction 2.2 existed to draw: this list is a decision, where an absent entry was previously either a
 * decision or an oversight and nothing said which.
 */
export const COGAT_NONE_TYPES: readonly string[] = Object.entries(COGAT_MAP)
  .filter(([, m]) => m.subtest === 'none')
  .map(([typeCode]) => typeCode)
  .sort();
