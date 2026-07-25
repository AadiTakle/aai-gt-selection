begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);

select has_table('app', 'idempotency_record', 'shared idempotency registry exists');
select has_column('app', 'idempotency_record', 'actor_id', 'idempotency binds the actor');
select has_column('app', 'idempotency_record', 'rpc_name', 'idempotency binds the RPC');
select has_column('app', 'idempotency_record', 'idempotency_key', 'idempotency stores the client key');
select has_column('app', 'idempotency_record', 'request_hash', 'idempotency detects payload changes');
select ok(
  exists (
    select 1
    from pg_constraint constraint_record
    join pg_class table_record
      on table_record.oid = constraint_record.conrelid
    join pg_namespace schema_record
      on schema_record.oid = table_record.relnamespace
    where schema_record.nspname = 'app'
      and table_record.relname = 'idempotency_record'
      and constraint_record.contype = 'p'
      and pg_get_constraintdef(constraint_record.oid)
        = 'PRIMARY KEY (actor_id, rpc_name, idempotency_key)'
  ),
  'actor, RPC, and key form the idempotency boundary'
);

select * from finish();

rollback;
