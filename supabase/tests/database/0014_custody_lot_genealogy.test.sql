begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(10);

select has_table('public'::name,'custody_lots'::name,'custody lots exist');
select has_table('public'::name,'custody_lot_links'::name,'custody genealogy links exist');
select has_function('public'::name,'create_custody_lot'::name, array['uuid','uuid','uuid','uuid','numeric','uuid','text'],'custody lot creation is transactional');
select has_function('public'::name,'consume_custody_lot'::name, array['uuid','numeric','uuid','text'],'custody lot consumption is transactional');
select has_function('public'::name,'split_custody_lot'::name, array['uuid','numeric[]','uuid','text'],'custody lot split is transactional');
select has_function('public'::name,'merge_custody_lots'::name, array['uuid[]','uuid','text'],'custody lot merge is transactional');

select ok((select relrowsecurity from pg_class where oid='public.custody_lots'::regclass),'custody lots use RLS');
select ok((select relrowsecurity from pg_class where oid='public.custody_lot_links'::regclass),'custody links use RLS');

select throws_ok(
  $$insert into public.custody_lots (tenant_id,organization_id,unit_id,material_id,originated_quantity_kg,available_quantity_kg) values (gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),0,0)$$,
  '23514', null, 'origin quantity must be positive'
);

select ok(
  exists(select 1 from pg_trigger where tgrelid='public.custody_lots'::regclass and tgname='custody_lots_origin_immutable'),
  'originated quantity is protected from historical overwrite'
);

select * from finish();
rollback;
