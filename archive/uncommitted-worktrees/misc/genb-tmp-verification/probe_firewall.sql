-- Throwaway evidence probe: attempt to read an answer key as each client-facing role.
-- Every attempt is expected to fail (permission denied) or return zero rows.
\echo '--- as anon: direct table read ---'
set role anon;
select 'anon direct select' as probe;
do $$ begin
  begin
    perform 1 from app.exam_item limit 1;
    raise notice 'REACHABLE: anon read app.exam_item';
  exception when others then
    raise notice 'BLOCKED (anon app.exam_item): %', sqlerrm;
  end;
end $$;
do $$ begin
  begin
    perform api.exam_register_item('{}'::jsonb);
    raise notice 'REACHABLE: anon called api.exam_register_item';
  exception when others then
    raise notice 'BLOCKED (anon api.exam_register_item): %', sqlerrm;
  end;
end $$;
reset role;

\echo '--- as authenticated: direct table read ---'
set role authenticated;
do $$ begin
  begin
    perform 1 from app.exam_item limit 1;
    raise notice 'REACHABLE: authenticated read app.exam_item';
  exception when others then
    raise notice 'BLOCKED (authenticated app.exam_item): %', sqlerrm;
  end;
end $$;
reset role;

\echo '--- enumerate EVERY api function and whether its result type could carry a key ---'
select p.proname, pg_get_function_result(p.oid) as returns
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'api'
order by 1;

\echo '--- EXECUTE grants on api functions, by role ---'
select r.rolname as grantee, count(*) as api_functions_executable
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'api'
  and r.rolname in ('anon', 'authenticated', 'service_role', 'api_executor')
  and has_function_privilege(r.oid, p.oid, 'EXECUTE')
group by 1 order by 1;
