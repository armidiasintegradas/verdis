begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(5);
select has_table('public','materials');
select has_table('public','material_aliases');
select has_table('public','counterparties');
insert into public.tenants (id, slug, name) values
('21000000-0000-0000-0000-000000000001','materials-a','Materials A'),
('21000000-0000-0000-0000-000000000002','materials-b','Materials B');
insert into public.organizations (id, tenant_id, legal_name, display_name) values
('31000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','Org Materials A','Org Materials A'),
('31000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000002','Org Materials B','Org Materials B');
insert into public.materials (tenant_id, code, name, category) values
('21000000-0000-0000-0000-000000000001','PAPELAO','Papelão','paper');
select throws_ok(
  $$insert into public.materials (tenant_id, code, name, category) values ('21000000-0000-0000-0000-000000000001','PAPELAO','Papelão 2','paper')$$,
  '23505', null, 'material code is unique inside one tenant'
);
select lives_ok(
  $$insert into public.materials (tenant_id, code, name, category) values ('21000000-0000-0000-0000-000000000002','PAPELAO','Papelão','paper')$$,
  'same material code is allowed in another tenant'
);
select * from finish();
rollback;
