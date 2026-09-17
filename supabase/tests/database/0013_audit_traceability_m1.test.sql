begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

-- Task 1 RED contract: explicit evidentiary fields and authorization capabilities.
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

-- Existing immutable-ledger invariant must remain true for both mutation paths.
select throws_ok(
  $$update public.audit_events set action='tampered' where false$$,
  'P0001', null, 'audit events reject updates'
);
select throws_ok(
  $$delete from public.audit_events where false$$,
  'P0001', null, 'audit events reject deletes'
);

-- The M1 extension must keep RLS enabled on the ledger.
select ok(
  (select relrowsecurity from pg_class where oid='public.audit_events'::regclass),
  'audit events keeps row level security enabled'
);

select * from finish();
rollback;
