-- Throwaway evidence probe: prove every registered per-type verifier is invocable and
-- returns a verdict object, i.e. that it EXECUTES rather than merely existing in the catalog.
-- Each verifier is called directly with a minimal item/response pair. A verifier that raised
-- or returned a non-object would be reported as FAIL.
do $$
declare
  r record;
  v_out jsonb;
  v_ok int := 0;
  v_fail int := 0;
  v_msg text;
begin
  for r in select type_code, verifier_fn from app.exam_verifier_registry order by verifier_fn loop
    begin
      execute format('select app.%I($1, $2)', r.verifier_fn)
        into v_out
        using jsonb_build_object(
                'itemId', 'probe', 'typeCode', r.type_code, 'domain', 'probe',
                'difficulty', 10, 'content', '{}'::jsonb, 'answer', '{}'::jsonb,
                'scoring', '{}'::jsonb, 'provenance', '{}'::jsonb),
              '{}'::jsonb;
      if v_out is null or jsonb_typeof(v_out) <> 'object' or not (v_out ? 'correct') then
        v_fail := v_fail + 1;
        raise notice 'FAIL(shape) % -> %', r.verifier_fn, v_out;
      else
        v_ok := v_ok + 1;
        raise notice 'OK % (%): correct=%', r.verifier_fn, r.type_code, v_out ->> 'correct';
      end if;
    exception when others then
      v_fail := v_fail + 1;
      v_msg := sqlerrm;
      raise notice 'FAIL(raise) % -> %', r.verifier_fn, v_msg;
    end;
  end loop;
  raise notice 'VERIFIER EXECUTION PROBE: ok=% fail=%', v_ok, v_fail;
end $$;
