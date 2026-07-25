-- Family self-service sign-up: default role assignment.
--
-- Self-registrants who use email/password `signUp` arrive with GoTrue's default
-- raw_app_meta_data = {"provider":"email","providers":["email"]} and NO user_role.
-- Without a role claim they fail every requireRole(['family']) guard and bounce
-- back to /login. This trigger stamps user_role='family' + synthetic_only=true
-- ONLY when user_role is absent, so the admin-seeded staff users (created with a
-- role via auth.admin.createUser in scripts/create-local-auth-users.ts) are never
-- modified, and self-registrants can only ever be 'family' — never staff. Role
-- stays server/DB-controlled: signUp clients cannot set app_metadata.
--
-- NOTE: unlike the app.*/api.* migrations this does NOT `set role app_owner`, as
-- that role has no rights on the `auth` schema. The function lives in `public`
-- (the `auth` schema is owned by supabase_auth_admin and rejects new objects from
-- the migration/postgres role); only the trigger references auth.users. This is
-- the canonical Supabase "on auth.users" pattern. Idempotent (create-or-replace +
-- drop-if-exists), so it is safe to re-run.

create or replace function public.assign_default_family_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only assign when the caller did not already provide a role.
  -- nullif() also treats an empty-string role as absent.
  if nullif(new.raw_app_meta_data ->> 'user_role', '') is null then
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
           'user_role', 'family',
           'synthetic_only', true
         );
  end if;
  return new;
end
$$;

comment on function public.assign_default_family_role() is
  'Self-signup default: stamps user_role=family + synthetic_only=true into '
  'raw_app_meta_data when absent. Never overrides an admin-seeded role. Role is '
  'DB-controlled; signUp clients cannot set app_metadata.';

drop trigger if exists assign_default_family_role_before_insert on auth.users;

create trigger assign_default_family_role_before_insert
  before insert on auth.users
  for each row
  execute function public.assign_default_family_role();
