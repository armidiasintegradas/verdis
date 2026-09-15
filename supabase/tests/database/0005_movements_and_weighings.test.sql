begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(10);

select has_table('public','movements');
select has_table('public','weighings');

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('11000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','movement@verdis.local',now(),now(),now(),'{}'::jsonb,'{}'::jsonb);

insert into public.tenants (id, slug, name) values
('22000000-0000-0000-0000-000000000001','movement-a','Movement A'),
('22000000-0000-0000-0000-000000000002','movement-b','Movement B');
insert into public.organizations (id, tenant_id, legal_name, display_name) values
('32000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','Movement Org A','Movement Org A'),
('32000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002','Movement Org B','Movement Org B');
insert into public.materials (id, tenant_id, code, name, category) values
('52000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','PET','PET','plastic'),
('52000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002','PET','PET','plastic');

select lives_ok($$insert into public.movements (id,tenant_id,organization_id,movement_type,material_id,quantity_kg,occurred_at,created_by) values ('62000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','inbound','52000000-0000-0000-0000-000000000001',100,now(),'11000000-0000-0000-0000-000000000001')$$,'positive inbound movement is accepted');
select throws_ok($$insert into public.movements (tenant_id,organization_id,movement_type,material_id,quantity_kg,occurred_at,created_by) values ('22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','inbound','52000000-0000-0000-0000-000000000001',-1,now(),'11000000-0000-0000-0000-000000000001')$$,'23514',null,'normal movement rejects negative quantity');
select lives_ok($$insert into public.movements (tenant_id,organization_id,movement_type,material_id,quantity_kg,adjustment_reason,occurred_at,created_by) values ('22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','adjustment','52000000-0000-0000-0000-000000000001',-10,'physical inventory correction',now(),'11000000-0000-0000-0000-000000000001')$$,'signed adjustment with reason is accepted');
select throws_ok($$insert into public.movements (tenant_id,organization_id,movement_type,material_id,quantity_kg,occurred_at,created_by) values ('22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','adjustment','52000000-0000-0000-0000-000000000001',-10,now(),'11000000-0000-0000-0000-000000000001')$$,'23514',null,'adjustment requires a reason');
select throws_ok($$insert into public.movements (tenant_id,organization_id,movement_type,material_id,quantity_kg,occurred_at,created_by) values ('22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','inbound','52000000-0000-0000-0000-000000000002',100,now(),'11000000-0000-0000-0000-000000000001')$$,'P0001',null,'movement cannot use another tenant material');
update public.movements set status='posted' where id='62000000-0000-0000-0000-000000000001';
select throws_ok($$update public.movements set quantity_kg=99 where id='62000000-0000-0000-0000-000000000001'$$,'P0001',null,'posted mass fields are immutable');
insert into public.weighings (movement_id,gross_weight_kg,tare_weight_kg,declared_weight_kg,weighed_at) values ('62000000-0000-0000-0000-000000000001',120,20,100,now());
select is((select net_weight_kg from public.weighings where movement_id='62000000-0000-0000-0000-000000000001'),100::numeric,'net weight is gross minus tare');
select throws_ok($$insert into public.weighings (movement_id,gross_weight_kg,tare_weight_kg,weighed_at) values ('62000000-0000-0000-0000-000000000001',10,20,now())$$,'23514',null,'negative net weighing is rejected');

select * from finish();
rollback;
