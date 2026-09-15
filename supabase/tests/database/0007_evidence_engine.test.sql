begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

select has_table('public'::name,'evidences'::name);
select has_table('public'::name,'document_extractions'::name);
select has_table('public'::name,'validations'::name);
select has_table('public'::name,'reconciliations'::name);
select has_function('app_private'::name,'recalculate_movement_evidence_level'::name,array['uuid'::name]);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('13000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','evidence@verdis.local',now(),now(),now(),'{}'::jsonb,'{}'::jsonb);
insert into public.tenants (id,slug,name) values ('24000000-0000-0000-0000-000000000001','evidence-a','Evidence A');
insert into public.organizations (id,tenant_id,legal_name,display_name) values ('34000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','Evidence Org','Evidence Org');
insert into public.materials (id,tenant_id,code,name,category) values ('54000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','PAPELAO','Papelão','paper');
insert into public.movements (id,tenant_id,organization_id,movement_type,material_id,quantity_kg,occurred_at,created_by)
values ('64000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','34000000-0000-0000-0000-000000000001','inbound','54000000-0000-0000-0000-000000000001',100,now(),'13000000-0000-0000-0000-000000000001');

select throws_ok(
  $$insert into public.validations (movement_id,validation_type,status,automated,rule_code) values ('64000000-0000-0000-0000-000000000001','human_audit','accepted',true,'audit')$$,
  '23514', null, 'automated validation can never represent a human audit'
);

select throws_ok(
  $$insert into public.validations (movement_id,validation_type,status,automated,rule_code) values ('64000000-0000-0000-0000-000000000001','human_audit','accepted',false,'audit')$$,
  '23514', null, 'human audit requires an actor user'
);

select ok(
  (select count(*) = 0 from public.document_extractions),
  'extraction history starts append-only and empty'
);

select * from finish();
rollback;
