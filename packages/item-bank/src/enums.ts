import { z } from 'zod';

import { TYPE_CODES, VALID_DOMAINS } from './generated/type-registry.generated';
export type { QuestionTypeCode, Domain } from './generated/type-registry.generated';
export { TYPE_CODES, VALID_DOMAINS } from './generated/type-registry.generated';

/**
 * The four testable domains. Working memory / processing speed are cross-cutting
 * signals, not domains (see research/exam-question-types/CATEGORY_MAP.md); WM
 * types are folded under `spatial` via their `areas` field in master_types.jsonl.
 */
export const examDomainSchema = z.enum(VALID_DOMAINS);
export type ExamDomain = z.infer<typeof examDomainSchema>;

/**
 * Age bands. `K-8` is a wildcard band (spans all grades) used by a few
 * cross-grade types; the coverage report treats it as covering every real band.
 */
export const AGE_BANDS = ['K-1', '2-3', '4-5', '6-8', 'K-8'] as const;
export const REAL_AGE_BANDS = ['K-1', '2-3', '4-5', '6-8'] as const;
export const ageBandSchema = z.enum(AGE_BANDS);
export type AgeBand = z.infer<typeof ageBandSchema>;

/** The 66 question-type codes, derived from master_types.jsonl. */
export const questionTypeCodeSchema = z.enum(TYPE_CODES);

/** Measurement registry id, e.g. `M-ACC`, `M-RTFIRST` (measurements.json). */
export const measurementIdSchema = z.string().regex(/^M-[A-Z0-9_]+$/);
export type MeasurementId = z.infer<typeof measurementIdSchema>;

/**
 * Distractor lure taxonomy (§6.3). Every non-correct option is tagged so the
 * measurements that depend on it (M-ERRTYPE, M-LURETYPE, M-RULEID) are
 * computable. `correct` marks the keyed option.
 */
export const lureClassSchema = z.enum([
  'correct',
  'associate', // thematic/semantic associate (verbal)
  'surface_match', // shares surface features, wrong relation
  'reversed_relation', // relation applied backwards
  'local_fit', // fits locally but not globally (cloze)
  'global_mismatch',
  'rule_violation', // figural: violates exactly one named rule (M-RULEID)
  'near_order', // ordering tasks: off-by-one sequence
  'distractor_other',
]);
export type LureClass = z.infer<typeof lureClassSchema>;
