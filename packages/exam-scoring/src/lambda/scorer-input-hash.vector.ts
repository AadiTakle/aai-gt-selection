/**
 * The one trace both scorer-input-hash implementations must agree on.
 *
 * `EXPECTED_CANONICAL` and `EXPECTED_HASH` were produced by PostgreSQL 17 running the function
 * bodies lifted verbatim out of
 * `supabase/migrations/20260725050000_exam_outcome_ownership.sql` over exactly these rows — they
 * are not what this package computes, so a TypeScript change cannot make them agree with itself.
 *
 * `supabase/tests/140_exam_scorer_input_hash_parity.test.sql` inserts the same rows through the
 * real schema and asserts the same two literals. Neither implementation can move without turning
 * one of the two suites red, and no edit to one suite can make the other pass.
 *
 * The trace is chosen to exercise what silently diverges: an administration order that differs
 * from insertion order, a fractional difficulty, partial credit, jsonb's length-then-bytes key
 * ordering inside `metrics`, and an empty `metrics` object.
 */
import type { ScoredItem } from './../types';

export const VECTOR_TRACE: readonly ScoredItem[] = [
  {
    itemId: '0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d',
    typeCode: 'FLU-MATRIX-01',
    domain: 'fluid_reasoning',
    difficulty: 11,
    correct: true,
    score: 1,
    metrics: { 'M-RT': 4200, 'M-ACC': 1, 'M-DIFFREACH': 11 },
  },
  {
    itemId: '3f1d0c9a-5b2e-4a71-9c33-0a1b2c3d4e5f',
    typeCode: 'SPA-FOLDNET-01',
    domain: 'spatial',
    difficulty: 14.5,
    correct: false,
    score: 0,
    metrics: { 'M-RT': 8210, 'M-ACC': 0, 'M-EFF': 0.25 },
  },
  {
    itemId: 'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
    typeCode: 'VER-CLOZE-01',
    domain: 'verbal',
    difficulty: 9,
    correct: true,
    score: 0.5,
    metrics: {},
  },
];

/** `app.exam_scorer_input_json(session)::text` for {@link VECTOR_TRACE}. */
export const EXPECTED_CANONICAL =
  '[{"score": 1, "domain": "fluid_reasoning", "itemId": "0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d", ' +
  '"correct": true, "metrics": {"M-RT": 4200, "M-ACC": 1, "M-DIFFREACH": 11}, ' +
  '"typeCode": "FLU-MATRIX-01", "difficulty": 11}, ' +
  '{"score": 0, "domain": "spatial", "itemId": "3f1d0c9a-5b2e-4a71-9c33-0a1b2c3d4e5f", ' +
  '"correct": false, "metrics": {"M-RT": 8210, "M-ACC": 0, "M-EFF": 0.25}, ' +
  '"typeCode": "SPA-FOLDNET-01", "difficulty": 14.5}, ' +
  '{"score": 0.5, "domain": "verbal", "itemId": "c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f", ' +
  '"correct": true, "metrics": {}, "typeCode": "VER-CLOZE-01", "difficulty": 9}]';

/** `app.exam_scorer_input_hash(session)` for {@link VECTOR_TRACE}. */
export const EXPECTED_HASH =
  'sha256:7b989318c347ea85ef94c9b7ff05aea984b3e5ad5a2e84e9ce96e857647299dd';
