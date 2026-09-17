begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

select has_column('public'::name,'audit_events'::name,'correlation_id'::name,'audit ledger exposes correlation id');
select has_column('public'::name,'audit_events'::name,'causation_event_id'::name,'audit ledger exposes causation event id');
select has_column('public'::name,'audit_events'::name,'justification'::name,'audit ledger exposes explicit justification');
select has_column('public'::name,'audit_events'::name,'unit_id'::name,'audit ledger can be scoped to unit when applicable');

select ok(exists(select 1 from public.permissions where code='audit.review'),'audit.review permission exists');
select ok(exists(select 1 from public.permissions where code='audit.assign'),'audit.assign permission exists');
select ok(exists(select 1 from public.permissions where code='audit.resolve'),'audit.resolve permission exists');
select ok(exists(select 1 from public.permissions where code='audit.manage'),'audit.manage permission exists');
select ok(exists(select 1 from public.permissions where code='traceability.read'),'traceability.read permission exists');
select ok(exists(select 1 from public.permissions where code='traceability.operate'),'traceability.operate permission exists');

insert into public.tenants (id,slug,name)
values ('25130000-0000-0000-0000-000000000001','audit-m1','Audit M1');
insert into public.organizations (id,tenant_id,legal_name,display_name)
values ('35130000-0000-0000-0000-000000000001','25130000-0000-0000-0000-000000000001','Audit M1 Org','Audit M1 Org');
insert into public.audit_events (
  id,tenant_id,organization_id,action,subject_type,subject_id,correlation_id,justification
) values (
  '95130000-0000-0000-0000-000000000001',
  '25130000-0000-0000-0000-000000000001',
  '35130000-0000-0000-0000-000000000001',
  'test.created','test','85130000-0000-0000-0000-000000000001',
  '75130000-0000-0000-0000-000000000001','fixture'
);

select throws_ok(
  $$update public.audit_events set action='tampered' where id='95130000-0000-0000-0000-000000000001'$$,
  'P0001', null, 'audit events reject updates'
);
select throws_ok(
  $$delete from public.audit_events where id='95130000-0000-0000-0000-000000000001'$$,
  'P0001', null, 'audit events reject deletes'
);

select ok(
  (select relrowsecurity from pg_class where oid='public.audit_events'::regclass),
  'audit events keeps row level security enabled'
);

select * from finish();
rollback;
