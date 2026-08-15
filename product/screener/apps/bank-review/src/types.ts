export interface TypeSummary {
  readonly typeCode: string;
  readonly domain: string;
  readonly items: number;
  readonly difficulty: {
    readonly min: number;
    readonly max: number;
    readonly mean: number;
    readonly median: number;
    readonly histogram: readonly number[];
    readonly emptyRungs: readonly number[];
  };
  readonly ageBands: readonly { band: string; items: number }[];
  readonly bandSpan: string;
  readonly cogat: { readonly subtest: string; readonly strength: 'direct' | 'loose' } | null;
  readonly contextCost: string;
  readonly readingBand: string | null;
  readonly uiElements: readonly string[];
  readonly samples: readonly {
    readonly itemId: string;
    readonly difficulty: number;
    readonly ageBands: readonly string[];
    readonly contentKeys: readonly string[];
    readonly preview: string;
  }[];
}

/** A reviewer's verdict on one type. Everything is optional so a partial review is still useful. */
export interface TypeReview {
  /** Keep, cut, or rework for the CogAT focus. */
  verdict?: 'keep' | 'cut' | 'rework';
  /** Corrected grade range, when the bank's own bands look wrong. */
  gradeFrom?: string;
  gradeTo?: string;
  /** Does the reviewer accept the CogAT mapping, or propose a different subtest? */
  cogatFits?: 'yes' | 'no' | 'different';
  cogatShouldBe?: string;
  /** Difficulty judgement. */
  difficultyVerdict?: 'well-tuned' | 'too-easy' | 'too-hard' | 'too-narrow' | 'uneven';
  note?: string;
  reviewedAt?: string;
}

export type ReviewSet = Record<string, TypeReview>;

export const GRADE_BANDS = ['K-1', '2-3', '4-5', '6-8'] as const;
