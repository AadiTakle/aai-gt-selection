-- The database half of the scorer-input-hash divergence guard (R7, E-084).
--
-- Two implementations produce the value called `inputHash`: `app.exam_scorer_input_hash` here,
-- and `scorerInputFingerprint` in `packages/exam-scoring/src/lambda/scorer-input-hash.ts`. They
-- are the two ends of the recompute-and-compare gate the audit path rests on. They were once a
-- SHA-256 and a 32-bit FNV-1a, which meant a comparison between them could report agreement only
-- by never happening.
--
-- This file and `packages/exam-scoring/src/lambda/scorer-input-hash.test.ts` assert the SAME two
-- literals over the SAME trace, held in
-- `packages/exam-scoring/src/lambda/scorer-input-hash.vector.ts`. Move either implementation and
-- exactly one of the two suites fails; edit one suite's literal to make it pass and the other
-- fails. Both run in CI (`ci.yml`: `pnpm test` and `pnpm db:test`).
--
-- The rows are inserted directly rather than through `api.exam_submit_response`, because the
-- point is to pin the hash over a trace whose every byte is known and shared with the
-- TypeScript vector. Test 124 covers how a real trace gets written.
--
-- The fixture exercises what silently diverges: administration order that is not insertion
-- order, a fractional difficulty, partial credit, jsonb's length-then-bytes key ordering inside
-- `metrics`, and an empty `metrics` object.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(4);

-- --- Fixture: one owned session and three answered items ---------------------------
insert into app.exam_policy (policy_version, config)
values (
  'exam-syn-hash-parity',
  jsonb_build_object(
    'policyVersion', 'exam-syn-hash-parity',
    'domains', jsonb_build_array('fluid_reasoning', 'spatial', 'verbal'),
    'gradeStart', jsonb_build_object('K-1', 2.5, '2-3', 6, '4-5', 10, '6-8', 14),
    'hardItemCap', 50,
    'stepSize', 0.8,
    'areaWeights', jsonb_build_object('fluid_reasoning', 1, 'spatial', 1, 'verbal', 1),
    'syntheticOnly', true,
    'validated', false
  )
)
on conflict (policy_version) do nothing;

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values
  ('FLU-MATRIX-01', 'fluid_reasoning', 'Matrix Reasoning', 'FLU-MATRIX-01.html',
   array['M-ACC', 'M-RT']),
  ('SPA-FOLDNET-01', 'spatial', 'Fold The Net', 'SPA-FOLDNET-01.html', array['M-ACC', 'M-RT']),
  ('VER-CLOZE-01', 'verbal', 'Sentence Cloze', 'VER-CLOZE-01.html', array['M-ACC', 'M-RT'])
on conflict (type_code) do nothing;

insert into app.exam_item (item_id, type_code, domain, difficulty, age_bands, content)
values
  ('0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d', 'FLU-MATRIX-01', 'fluid_reasoning', 11, array['4-5'],
   '{}'::jsonb),
  ('3f1d0c9a-5b2e-4a71-9c33-0a1b2c3d4e5f', 'SPA-FOLDNET-01', 'spatial', 14.5, array['4-5'],
   '{}'::jsonb),
  ('c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f', 'VER-CLOZE-01', 'verbal', 9, array['4-5'],
   '{}'::jsonb)
on conflict (item_id) do nothing;

insert into app.exam_participant (participant_id, owner_user_id, pseudonym_code, age_band)
values (
  '00000000-0000-4000-8000-0000000d0001',
  '00000000-0000-4000-8000-0000000d0000',
  'PART-SYN-HASHPARITY',
  '4-5'
)
on conflict (participant_id) do nothing;

insert into app.exam_session (
  session_id, owner_user_id, participant_id, policy_version, grade_band, status
)
values (
  '00000000-0000-4000-8000-0000000d0002',
  '00000000-0000-4000-8000-0000000d0000',
  '00000000-0000-4000-8000-0000000d0001',
  'exam-syn-hash-parity',
  '4-5',
  'active'
)
on conflict (session_id) do nothing;

-- Inserted out of administration order on purpose: `app.exam_scorer_input_json` orders by
-- `order_no`, and a fingerprint that followed insertion order instead would still look stable.
insert into app.exam_item_response (
  response_id, session_id, owner_user_id, item_id, type_code, domain, order_no,
  difficulty, raw_answer, correct, score, metrics
)
values
  (
    '00000000-0000-4000-8000-0000000d0102',
    '00000000-0000-4000-8000-0000000d0002',
    '00000000-0000-4000-8000-0000000d0000',
    '3f1d0c9a-5b2e-4a71-9c33-0a1b2c3d4e5f', 'SPA-FOLDNET-01', 'spatial', 2,
    14.5, '{}'::jsonb, false, 0,
    '{"M-RT": 8210, "M-ACC": 0, "M-EFF": 0.25}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-0000000d0101',
    '00000000-0000-4000-8000-0000000d0002',
    '00000000-0000-4000-8000-0000000d0000',
    '0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d', 'FLU-MATRIX-01', 'fluid_reasoning', 1,
    11, '{}'::jsonb, true, 1,
    '{"M-RT": 4200, "M-ACC": 1, "M-DIFFREACH": 11}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-0000000d0103',
    '00000000-0000-4000-8000-0000000d0002',
    '00000000-0000-4000-8000-0000000d0000',
    'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f', 'VER-CLOZE-01', 'verbal', 3,
    9, '{}'::jsonb, true, 0.5,
    '{}'::jsonb
  );

-- --- 1. The canonical text both implementations must render ------------------------
select is(
  app.exam_scorer_input_json('00000000-0000-4000-8000-0000000d0002'::uuid)::text,
  '[{"score": 1, "domain": "fluid_reasoning", "itemId": "0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d", '
  '"correct": true, "metrics": {"M-RT": 4200, "M-ACC": 1, "M-DIFFREACH": 11}, '
  '"typeCode": "FLU-MATRIX-01", "difficulty": 11}, '
  '{"score": 0, "domain": "spatial", "itemId": "3f1d0c9a-5b2e-4a71-9c33-0a1b2c3d4e5f", '
  '"correct": false, "metrics": {"M-RT": 8210, "M-ACC": 0, "M-EFF": 0.25}, '
  '"typeCode": "SPA-FOLDNET-01", "difficulty": 14.5}, '
  '{"score": 0.5, "domain": "verbal", "itemId": "c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f", '
  '"correct": true, "metrics": {}, "typeCode": "VER-CLOZE-01", "difficulty": 9}]',
  'app.exam_scorer_input_json matches EXPECTED_CANONICAL in scorer-input-hash.vector.ts'
);                                                                                              -- 1

-- --- 2. The hash itself ------------------------------------------------------------
-- If this fails and assertion 1 passed, the SQL hash construction moved. If both fail, the
-- canonical input moved and the TypeScript side must be regenerated against a real Postgres,
-- not hand-edited to agree.
select is(
  app.exam_scorer_input_hash('00000000-0000-4000-8000-0000000d0002'::uuid),
  'sha256:7b989318c347ea85ef94c9b7ff05aea984b3e5ad5a2e84e9ce96e857647299dd',
  'app.exam_scorer_input_hash matches EXPECTED_HASH in scorer-input-hash.vector.ts'
);                                                                                              -- 2

-- --- 3. The shape the contract and the outcome column require ----------------------
select matches(
  app.exam_scorer_input_hash('00000000-0000-4000-8000-0000000d0002'::uuid),
  '^sha256:[0-9a-f]{64}$',
  'the hash keeps the shape packages/contracts application.ts and the CHECK constraint require'
);                                                                                              -- 3

-- --- 4. The fixture is not vacuous -------------------------------------------------
-- Assertions 1-3 would all pass over an empty trace ('[]' hashes to a stable value too), so
-- prove the rows this hashed are really there.
select is(
  (select count(*) from app.exam_item_response
   where session_id = '00000000-0000-4000-8000-0000000d0002'::uuid),
  3::bigint,
  'the hashed trace really contains the three fixture responses'
);                                                                                              -- 4

select * from finish();

rollback;
