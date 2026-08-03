set role app_owner;

create table app.student_profile (
  profile_id uuid primary key,
  owner_user_id uuid not null,
  synthetic_student_code text not null
    check (synthetic_student_code ~ '^STUDENT-SYN-[A-Z0-9_-]+$'),
  synthetic_only boolean not null default true
    check (synthetic_only),
  created_at timestamptz not null default statement_timestamp(),
  unique (owner_user_id, synthetic_student_code)
);

create table app.student_profile_version (
  profile_version_id uuid primary key,
  profile_id uuid not null references app.student_profile(profile_id),
  version_no integer not null check (version_no > 0),
  supersedes_id uuid,
  content jsonb not null
    check (jsonb_typeof(content) = 'object')
    check (content @> '{"syntheticOnly": true}'::jsonb)
    check (
      content #>> '{purpose,code}' = 'SYN_PROFILE_ACCOUNT_SETUP'
      and content #>> '{purpose,version}' = 'PROFILE-PURPOSE-SYN-V1'
    ),
  content_hash text not null
    check (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  synthetic_only boolean not null default true
    check (synthetic_only),
  recorded_at timestamptz not null default statement_timestamp(),
  unique (profile_id, version_no),
  unique (profile_version_id, profile_id),
  unique (supersedes_id),
  foreign key (supersedes_id, profile_id)
    references app.student_profile_version(profile_version_id, profile_id)
);

create table app.school_directory_version (
  school_version_id uuid primary key,
  school_id uuid not null,
  version_no integer not null check (version_no > 0),
  supersedes_id uuid,
  directory_version text not null
    check (directory_version = 'SCHOOL-DIRECTORY-SYN-V1'),
  source_code text not null
    check (source_code = 'SYN_DIRECTORY_FIXTURE'),
  content jsonb not null
    check (jsonb_typeof(content) = 'object')
    check (content @> '{"syntheticOnly": true}'::jsonb),
  active_from date not null,
  active_to date,
  content_hash text not null
    check (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  synthetic_only boolean not null default true
    check (synthetic_only),
  recorded_at timestamptz not null default statement_timestamp(),
  unique (school_id, version_no),
  unique (school_version_id, school_id),
  unique (supersedes_id),
  foreign key (supersedes_id, school_id)
    references app.school_directory_version(school_version_id, school_id),
  check (active_to is null or active_to >= active_from)
);

alter table app.application
  add column student_profile_id uuid not null
    references app.student_profile(profile_id);

create table app.application_private_context_version (
  private_context_version_id uuid primary key,
  application_id uuid not null references app.application(application_id),
  version_no integer not null check (version_no > 0),
  supersedes_id uuid,
  content jsonb not null
    check (jsonb_typeof(content) = 'object')
    check (content @> '{"syntheticOnly": true}'::jsonb)
    check (
      content #>> '{purpose,code}' = 'SYN_PRIVATE_APPLICATION_CONTEXT'
      and content #>> '{purpose,version}' = 'PRIVATE-CONTEXT-SYN-V1'
    ),
  content_hash text not null
    check (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  synthetic_only boolean not null default true
    check (synthetic_only),
  recorded_at timestamptz not null default statement_timestamp(),
  unique (application_id, version_no),
  unique (private_context_version_id, application_id),
  unique (supersedes_id),
  foreign key (supersedes_id, application_id)
    references app.application_private_context_version(
      private_context_version_id,
      application_id
    )
);

alter table app.application_version
  add column student_profile_version_id uuid not null
    references app.student_profile_version(profile_version_id),
  add column private_context_version_id uuid not null,
  add column school_directory_version_id uuid
    references app.school_directory_version(school_version_id),
  add column school_snapshot jsonb,
  add column final_submission_snapshot jsonb,
  add column submitted_by_user_id uuid,
  add foreign key (private_context_version_id, application_id)
    references app.application_private_context_version(
      private_context_version_id,
      application_id
    ),
  add check (
    school_snapshot is null
    or (
      jsonb_typeof(school_snapshot) = 'object'
      and school_snapshot @> '{"syntheticOnly": true}'::jsonb
    )
  ),
  add check (
    final_submission_snapshot is null
    or jsonb_typeof(final_submission_snapshot) = 'object'
  ),
  add check (
    state <> 'submitted'
    or (
      final_submission_snapshot is not null
      and submitted_by_user_id is not null
    )
  );

alter table app.student_profile enable row level security;
alter table app.student_profile force row level security;
alter table app.student_profile_version enable row level security;
alter table app.student_profile_version force row level security;
alter table app.school_directory_version enable row level security;
alter table app.school_directory_version force row level security;
alter table app.application_private_context_version enable row level security;
alter table app.application_private_context_version force row level security;

revoke all on app.student_profile from public, anon, authenticated, service_role;
revoke all on app.student_profile_version from public, anon, authenticated, service_role;
revoke all on app.school_directory_version from public, anon, authenticated, service_role;
revoke all on app.application_private_context_version
from public, anon, authenticated, service_role;

create policy student_profile_family_read
on app.student_profile
for select
to api_executor
using (
  synthetic_only
  and app.current_user_role() = 'family'
  and owner_user_id = app.current_user_id()
);

create policy student_profile_family_insert
on app.student_profile
for insert
to api_executor
with check (
  synthetic_only
  and app.current_user_role() = 'family'
  and owner_user_id = app.current_user_id()
);

create policy student_profile_version_family_read
on app.student_profile_version
for select
to api_executor
using (
  synthetic_only
  and app.current_user_role() = 'family'
  and exists (
    select 1
    from app.student_profile profile
    where profile.profile_id = student_profile_version.profile_id
      and profile.owner_user_id = app.current_user_id()
      and profile.synthetic_only
  )
);

create policy student_profile_version_family_insert
on app.student_profile_version
for insert
to api_executor
with check (
  synthetic_only
  and app.current_user_role() = 'family'
  and exists (
    select 1
    from app.student_profile profile
    where profile.profile_id = student_profile_version.profile_id
      and profile.owner_user_id = app.current_user_id()
      and profile.synthetic_only
  )
);

create policy school_directory_family_read
on app.school_directory_version
for select
to api_executor
using (
  synthetic_only
  and app.current_user_role() = 'family'
  and app.current_user_id() is not null
);

create policy private_context_family_read
on app.application_private_context_version
for select
to api_executor
using (
  synthetic_only
  and app.current_user_role() = 'family'
  and exists (
    select 1
    from app.application application_record
    where application_record.application_id =
      application_private_context_version.application_id
      and application_record.owner_user_id = app.current_user_id()
      and application_record.synthetic_only
  )
);

create policy private_context_family_insert
on app.application_private_context_version
for insert
to api_executor
with check (
  synthetic_only
  and app.current_user_role() = 'family'
  and exists (
    select 1
    from app.application application_record
    where application_record.application_id =
      application_private_context_version.application_id
      and application_record.owner_user_id = app.current_user_id()
      and application_record.synthetic_only
  )
);

comment on table app.student_profile is
  'Guardian-owned reusable synthetic student root. One owner may hold multiple student profiles.';
comment on table app.student_profile_version is
  'Append-only synthetic identity, household, address, relative, and language profile content for account setup only; never an eligibility input.';
comment on table app.school_directory_version is
  'Append-only fictional school-directory fixtures. Source and vocabulary are placeholders pending E-063.';
comment on table app.application_private_context_version is
  'Append-only support/disclosure and financial-intake context for operations only; physically excluded from reviewer and decision projections.';
comment on column app.application_version.school_snapshot is
  'Name/type/address displayed to the family at save/sign time; later directory versions cannot rewrite it.';
comment on column app.application_version.final_submission_snapshot is
  'Versioned acknowledgement, referral, and exact signature statement signed by submitted_by_user_id.';

reset role;

grant select, insert on app.student_profile to api_executor;
grant select, insert on app.student_profile_version to api_executor;
grant select on app.school_directory_version to api_executor;
grant select, insert on app.application_private_context_version to api_executor;
