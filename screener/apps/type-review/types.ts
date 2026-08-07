/**
 * The data contract the original review harness used, restated as types.
 *
 * `ReviewType` mirrors an entry of `review-data.json` field for field. `BankItem` mirrors a line of
 * `banks/<TYPE>.jsonl`. Both are read-only here: this tool picks which existing item to look at and
 * never rewrites generated item data, which is the property that makes it safe to leave open all day.
 */

export interface ReviewMetric {
  readonly id: string;
  readonly name: string;
  readonly what: string;
  readonly how_to_collect: string;
}

export type Stage = 'S1' | 'DUAL' | 'S2';

export interface ReviewType {
  readonly type_id: string;
  readonly name: string;
  readonly domain: string;
  readonly stage: Stage;
  readonly stage_label: string;
  readonly works_well: string;
  readonly age_bands?: readonly string[];
  readonly content_range?: string;
  readonly difficulty_levers?: readonly string[] | string;
  readonly one_liner?: string;
  readonly interaction?: string;
  readonly self_teach?: string;
  readonly engagement_hook?: string;
  readonly tail_precision_rationale?: string;
  readonly construct_irrelevant_risks?: string;
  /** Path to the archive's prebuilt renderer, e.g. `demos/FLU-MATRIX-01.html`. Absent for 17 types. */
  readonly demo?: string;
  readonly metrics?: readonly ReviewMetric[];
}

export interface BankItem {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain?: string;
  readonly difficulty: number;
  readonly ageBands?: readonly string[];
  readonly content: Record<string, unknown>;
  /** Present in the bank and deliberately stripped before anything is shown to a renderer. */
  readonly answer?: Record<string, unknown>;
  readonly scoring?: Record<string, unknown>;
  readonly provenance?: Record<string, unknown>;
}

/** The five comment categories, in the original's order and wording. */
export interface CommentCategory {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
}

export const CATS: readonly CommentCategory[] = [
  { key: 'ui', label: '1 · UI / interaction', hint: 'layout, controls, clarity, engagement, self-teach' },
  { key: 'difficulty', label: '2 · Difficulty score & intended grade', hint: 'is the rung/age-band right? escalation? ceiling?' },
  { key: 'framing', label: '3 · Question framing & answer', hint: 'prompt wording, stimulus, correctness/answer key' },
  { key: 'general', label: '4 · General improvement', hint: 'anything else to perfect this type' },
  { key: 'metrics', label: '5 · Metrics & how they are calculated', hint: 'which signals, how collected, how they feed the score' },
];

export const BANDS = ['K-1', '2-3', '4-5', '6-8'] as const;

/**
 * One type's review state. Mutable on purpose: the store is edited in place as the reviewer types and
 * then serialised, which is what the original did and what keeps the save path a single assignment.
 */
export interface TypeComments {
  [category: string]: unknown;
  diffRange?: DiffRange;
}

export interface DiffRange {
  min: number | null;
  max: number | null;
}

export type Store = Record<string, TypeComments>;
