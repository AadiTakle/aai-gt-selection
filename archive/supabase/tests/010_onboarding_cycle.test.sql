begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);

select has_table('app', 'cycle', 'synthetic admissions cycle table exists');
select has_column('app', 'cycle', 'cycle_id', 'cycle has a stable identifier');
select has_column('app', 'cycle', 'cycle_code', 'cycle has a human-readable code');
select has_column('app', 'cycle', 'synthetic_only', 'cycle records its synthetic boundary');
select is(
  (
    select count(*)::integer
    from app.cycle
    where cycle_code = 'CYCLE-SYN-01'
      and synthetic_only
  ),
  1,
  'one visibly synthetic local cycle is seeded'
);

select * from finish();

rollback;
