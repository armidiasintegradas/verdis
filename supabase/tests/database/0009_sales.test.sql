begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(5);

select has_table('public'::name,'sales'::name);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('15000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sales@verdis.local',now(),now(),now(),'{}'::jsonb,'{}'::jsonb);
insert into public.tenants (id,slug,name) values ('26000000-0000-0000-0000-000000000001','sales-a','Sales A');
insert into public.organizations (id,tenant_id,legal_name,display_name) values ('36000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','Sales Org','Sales Org');
insert into public.materials (id,tenant_id,code,name,category) values ('56000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','PET','PET','plastic');
insert into public.counterparties (id,tenant_id,organization_id,external_name,external_tax_id)
values ('57000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001','Recicladora Compradora','00000000000000');
insert into public.movements (id,tenant_id,organization_id,movement_type,material_id,quantity_kg,occurred_at,created_by)
values ('66000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001','sale','56000000-0000-0000-0000-000000000001',50,now(),'15000000-0000-0000-0000-000000000001');

select lives_ok($$
  insert into public.sales (id,tenant_id,organization_id,movement_id,buyer_counterparty_id,material_id,quantity_kg,unit_price,sold_at)
  values ('67000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001','66000000-0000-0000-0000-000000000001','57000000-0000-0000-0000-000000000001','56000000-0000-0000-0000-000000000001',50,3.10,now())
$$,'sale matching its movement is accepted');

select is((select total_amount from public.sales where id='67000000-0000-0000-0000-000000000001'),155.00::numeric,'total amount is derived from quantity and unit price');

select throws_ok($$
  insert into public.sales (tenant_id,organization_id,movement_id,buyer_counterparty_id,material_id,quantity_kg,unit_price,sold_at)
  values ('26000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001','66000000-0000-0000-0000-000000000001','57000000-0000-0000-0000-000000000001','56000000-0000-0000-0000-000000000001',50,3.10,now())
$$,'23505',null,'one movement can back only one sale');

insert into public.movements (id,tenant_id,organization_id,movement_type,material_id,quantity_kg,occurred_at,created_by)
values ('66000000-0000-0000-0000-000000000002','26000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001','sale','56000000-0000-0000-0000-000000000001',40,now(),'15000000-0000-0000-0000-000000000001');
select throws_ok($$
  insert into public.sales (tenant_id,organization_id,movement_id,buyer_counterparty_id,material_id,quantity_kg,unit_price,sold_at)
  values ('26000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001','66000000-0000-0000-0000-000000000002','57000000-0000-0000-0000-000000000001','56000000-0000-0000-0000-000000000001',39,3.10,now())
$$,'P0001',null,'sale quantity must match movement quantity');

select * from finish();
rollback;
