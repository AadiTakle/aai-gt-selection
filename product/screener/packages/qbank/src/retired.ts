/**
 * Types withdrawn from service, and why.
 *
 * One list, two consumers. The loader refuses to serve anything here, and the review harness should hide it —
 * a reviewer being asked to comment again on a type that was killed on their own last pass is the clearest way
 * to waste the scarcest resource in this project.
 *
 * Kept as data rather than a deletion. Retiring a type is a judgement that may be revisited, and 240 items of
 * authored bank data with a reason attached is recoverable where a `git rm` is an archaeology exercise. Nothing
 * here deletes a `.jsonl`.
 */

export type RetirementCause = 'reviewer-kill' | 'validity-defect';

export interface Retirement {
  readonly cause: RetirementCause;
  /** Why, in enough detail that someone can disagree with it. */
  readonly note: string;
  /** When, so a stale entry is visible as stale. */
  readonly since: string;
}

export const RETIRED_TYPES: Readonly<Record<string, Retirement>> = {
  'CX-achieve-02': {
    cause: 'reviewer-kill',
    note:
      'Killed in the 10 Aug type review. Costs nothing servable — all 120 items were model_judge_deferred and ' +
      'excluded at load anyway — and it was the only type using that mode, so retiring it removes a whole ' +
      'scoring mode from 1b.6.',
    since: '2026-08-10',
  },
  'FLU-DEDUCE-01': {
    cause: 'reviewer-kill',
    note:
      'Killed in the 10 Aug type review: "clues arent super clear, because if you dont know what attributes are ' +
      'being measured". That is a validity objection rather than a taste one. Costs 120 servable items and no ' +
      'CogAT coverage, since it maps to none.',
    since: '2026-08-10',
  },
  'FLU-ODDPAIR-01': {
    cause: 'validity-defect',
    note:
      'Only 31 of 120 items are well-posed. The rows are pairs and the odd row is the one whose transition no ' +
      'other row shares; 89 items have several rows equally defensible and 49 have no matched pair at all, so ' +
      'there is no odd one out and the stored key is arbitrary. Serving these marks correct reasoning wrong and ' +
      'moves the estimate against the child. Measured by scripts/audit-item-validity.py. Restore when the ' +
      'generator guarantees exactly one unmatched transition per item.',
    since: '2026-08-10',
  },
};

export function isRetired(typeCode: string): boolean {
  return typeCode in RETIRED_TYPES;
}

/** For the review harness: the types a reviewer should not be shown again. */
export const RETIRED_TYPE_CODES: readonly string[] = Object.keys(RETIRED_TYPES).sort();
