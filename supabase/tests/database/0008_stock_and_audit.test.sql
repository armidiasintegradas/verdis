begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(9);

select has_table('public'::name,'stock_ledger_entries'::name);
select has_table('public'::name,'audit_events'::name);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('14000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stock@verdis.local',now(),now(),now(),'{}'::jsonb,'{}'::jsonb);
insert into public.tenants (id,slug,name) values ('25000000-0000-0000-0000-000000000001','stock-a','Stock A');
insert into public.organizations (id,tenant_id,legal_name,display_name) values ('35000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','Stock Org','Stock Org');
insert into public.materials (id,tenant_id,code,name,category) values ('55000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','PAPELAO','Papelão','paper');

insert into public.movements (id,tenant_id,organization_id,movement_type,material_id,quantity_kg,occurred_at,created_by)
values ('65000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001','inbound','55000000-0000-0000-0000-000000000001',100,now(),'14000000-0000-0000-0000-000000000001');
update public.movements set status='posted' where id='65000000-0000-0000-0000-000000000001';
select is((select delta_kg from public.stock_ledger_entries where movement_id='65000000-0000-0000-0000-000000000001' and effect_kind='post'),100::numeric,'inbound creates positive ledger entry');

insert into public.movements (id,tenant_id,organization_id,movement_type,material_id,quantity_kg,occurred_at,created_by)
values ('65000000-0000-0000-0000-000000000002','25000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001','outbound','55000000-0000-0000-0000-000000000001',30,now(),'14000000-0000-0000-0000-000000000001');
update public.movements set status='posted' where id='65000000-0000-0000-0000-000000000002';
select is((select delta_kg from public.stock_ledger_entries where movement_id='65000000-0000-0000-0000-000000000002' and effect_kind='post'),(-30)::numeric,'outbound creates negative ledger entry');
select is((select quantity_kg from public.current_stock where organization_id='35000000-0000-0000-0000-000000000001' and material_id='55000000-0000-0000-0000-000000000001' and unit_id is null),70::numeric,'current stock equals 70 kg');

insert into public.movements (id,tenant_id,organization_id,movement_type,material_id,quantity_kg,occurred_at,created_by)
values ('65000000-0000-0000-0000-000000000003','25000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001','outbound','55000000-0000-0000-0000-000000000001',80,now(),'14000000-0000-0000-0000-000000000001');
select throws_ok($$update public.movements set status='posted' where id='65000000-0000-0000-0000-000000000003'$$,'P0001',null,'posting cannot overdraw stock');

update public.movements set status='voided' where id='65000000-0000-0000-0000-000000000002';
select is((select delta_kg from public.stock_ledger_entries where movement_id='65000000-0000-0000-0000-000000000002' and effect_kind='reversal'),30::numeric,'void creates inverse ledger entry');
select is((select quantity_kg from public.current_stock where organization_id='35000000-0000-0000-0000-000000000001' and material_id='55000000-0000-0000-0000-000000000001' and unit_id is null),100::numeric,'voided outbound restores stock');
select throws_ok($$update public.audit_events set action='tampered' where subject_id='65000000-0000-0000-0000-000000000001'$$,'P0001',null,'audit events cannot be updated');

select * from finish();
rollback;
