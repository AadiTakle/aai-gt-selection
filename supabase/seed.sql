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
