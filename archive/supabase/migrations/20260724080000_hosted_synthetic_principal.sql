-- Hosted synthetic backend (D-012 interim): allow the family onboarding api.*
-- RPCs to bind a principal from a JWT issued by the cloud Supabase project, not
-- only the local loopback issuer. The safety boundary is UNCHANGED in substance:
-- the claim must still carry app_metadata.synthetic_only=true and an
-- admin-controlled user_role, so real (non-synthetic) principals are still
-- rejected with ROLE_FORBIDDEN. Only the accepted issuer set is widened from the
-- loopback dev project to also include a Supabase-hosted project issuer.
--
-- CREATE OR REPLACE preserves the existing grants/revokes (execute limited to
-- api_executor; revoked from public/anon/authenticated/service_role).
set role app_owner;

create or replace function app.bind_local_synthetic_principal()
returns void
language plpgsql
set search_path = pg_catalog
as $$
declare
  claims_text text;
  claims jsonb;
  claim_subject text;
  claim_role text;
  claim_issuer text;
begin
  if nullif(current_setting('app.user_id', true), '') is not null
    and nullif(current_setting('app.user_role', true), '') is not null
  then
    return;
  end if;

  claims_text := nullif(current_setting('request.jwt.claims', true), '');
  if claims_text is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;

  begin
    claims := claims_text::jsonb;
  exception
    when others then
      raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end;

  claim_subject := claims ->> 'sub';
  claim_role := claims #>> '{app_metadata,user_role}';
  claim_issuer := claims ->> 'iss';

  if claim_subject is null
    or claim_subject !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or claim_role is null
  then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;

  if claims #> '{app_metadata,synthetic_only}' is distinct from 'true'::jsonb
    or claim_issuer !~ '^(http://(127[.]0[.]0[.]1|localhost):65421|https://[a-z0-9-]+[.]supabase[.]co)/auth/v1$'
    or claim_role not in (
      'family',
      'admissions_operator',
      'reviewer',
      'review_supervisor',
      'decision_service',
      'auditor',
      'privacy_steward'
    )
  then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;

  perform set_config('app.user_id', claim_subject, true);
  perform set_config('app.user_role', claim_role, true);
end
$$;

comment on function app.bind_local_synthetic_principal() is
  'Binding: derives local identity and admin-controlled role from verified PostgREST JWT claims. Requires app_metadata.synthetic_only=true and a known role; accepts the local loopback issuer OR a Supabase-hosted project issuer (D-012 interim hosted mode). Existing trusted GUCs take precedence.';

reset role;
