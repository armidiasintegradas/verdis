begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(4);

select ok(
  not has_function_privilege(
    'authenticated',
    'app_private.current_stock_quantity(uuid,uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated users cannot execute the privileged stock helper directly'
);

select is(
  (
    select count(*)::int
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'evidence_objects_delete'
  ),
  0,
  'authenticated evidence users cannot delete original storage objects'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(
  not app_private.has_permission(
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000001000',
    '00000000-0000-0000-0000-000000002002',
    '00000000-0000-0000-0000-000000003002',
    'sale.create'
  ),
  'an authenticated caller cannot impersonate another user in permission helpers'
);

select ok(
  not app_private.storage_path_authorized(
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000001000/00000000-0000-0000-0000-000000002002/evidence/file.pdf',
    'evidence.read'
  ),
  'an authenticated caller cannot impersonate another user in storage authorization'
);

reset role;
select * from finish();
rollback;
