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

export interface CogatMapping {
  readonly subtest: CogatSubtest;
  readonly strength: 'direct' | 'loose';
  readonly note: string;
}

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
};

/** Types with direct correspondence, which is what a CogAT-aligned instrument may draw from. */
export const COGAT_ALIGNED_TYPES: readonly string[] = Object.entries(COGAT_MAP)
  .filter(([, mapping]) => mapping.strength === 'direct')
  .map(([typeCode]) => typeCode)
  .sort();

/** Subtests with no direct analogue in the library. */
export function uncoveredSubtests(): CogatSubtest[] {
  const covered = new Set(
    Object.values(COGAT_MAP)
      .filter((m) => m.strength === 'direct')
      .map((m) => m.subtest),
  );
  return COGAT_SUBTESTS.filter((subtest) => !covered.has(subtest));
}

export function typesForSubtest(
  subtest: CogatSubtest,
  strength?: 'direct' | 'loose',
): string[] {
  return Object.entries(COGAT_MAP)
    .filter(([, m]) => m.subtest === subtest && (strength === undefined || m.strength === strength))
    .map(([typeCode]) => typeCode)
    .sort();
}
