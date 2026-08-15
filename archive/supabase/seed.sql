-- No applicant, assessment, reviewer, or policy data is seeded. Login-capable fictional users
-- are created through scripts/create-local-auth-users.ts so password hashes and Auth internals
-- never enter SQL or version control.

insert into app.cycle (
  cycle_id,
  cycle_code,
  data_class,
  opens_at,
  closes_at,
  synthetic_only
)
values (
  '00000000-0000-4000-8000-000000000010',
  'CYCLE-SYN-01',
  'synthetic',
  '2026-08-01T00:00:00Z',
  '2027-06-30T23:59:59Z',
  true
)
on conflict (cycle_id) do nothing;

insert into app.school_directory_version (
  school_version_id,
  school_id,
  version_no,
  supersedes_id,
  directory_version,
  source_code,
  content,
  active_from,
  active_to,
  content_hash,
  synthetic_only
)
values
(
  '00000000-0000-4000-8000-000000000511',
  '00000000-0000-4000-8000-000000000501',
  1,
  null,
  'SCHOOL-DIRECTORY-SYN-V1',
  'SYN_DIRECTORY_FIXTURE',
  '{
    "name": "Synthetic Learning Academy",
    "typeCode": "SYN_SCHOOL_INDEPENDENT",
    "address": {
      "line1": "Synthetic 100 Example Way",
      "line2": null,
      "city": "Synthetic City",
      "regionCode": "SYN_REGION_TX",
      "postalCode": "00000",
      "countryCode": "US"
    },
    "syntheticOnly": true
  }'::jsonb,
  '2026-01-01',
  null,
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  true
),
(
  '00000000-0000-4000-8000-000000000512',
  '00000000-0000-4000-8000-000000000502',
  1,
  null,
  'SCHOOL-DIRECTORY-SYN-V1',
  'SYN_DIRECTORY_FIXTURE',
  '{
    "name": "Synthetic Community School",
    "typeCode": "SYN_SCHOOL_PUBLIC",
    "address": {
      "line1": "Synthetic 200 Fixture Avenue",
      "line2": null,
      "city": "Synthetic City",
      "regionCode": "SYN_REGION_TX",
      "postalCode": "00000",
      "countryCode": "US"
    },
    "syntheticOnly": true
  }'::jsonb,
  '2026-01-01',
  null,
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  true
)
on conflict (school_version_id) do nothing;
