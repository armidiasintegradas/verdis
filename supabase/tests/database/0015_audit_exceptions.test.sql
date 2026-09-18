begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

select has_table('public'::name,'audit_exceptions'::name,'audit exceptions exist');
select has_function('public'::name,'open_audit_exception'::name,array['uuid','uuid','uuid','text','uuid','uuid','text'],'exceptions can be opened transactionally');
select has_function('public'::name,'claim_audit_exception'::name,array['uuid','text'],'exceptions can be claimed');
select has_function('public'::name,'reassign_audit_exception'::name,array['uuid','uuid','text'],'exceptions can be reassigned');
select has_function('public'::name,'resolve_audit_exception'::name,array['uuid','text','text','uuid'],'exceptions can be resolved structurally');
select ok((select relrowsecurity from pg_class where oid='public.audit_exceptions'::regclass),'audit exceptions use RLS');
select col_is_null('public'::name,'audit_exceptions'::name,'assigned_to_user_id'::name,'exception may start unassigned');
select col_not_null('public'::name,'audit_exceptions'::name,'state'::name,'exception state is explicit');
select col_not_null('public'::name,'audit_exceptions'::name,'opened_by_user_id'::name,'exception opener is recorded');
select col_not_null('public'::name,'audit_exceptions'::name,'opened_at'::name,'exception opening time is recorded');
select ok(exists(select 1 from pg_constraint where conrelid='public.audit_exceptions'::regclass and pg_get_constraintdef(oid) like '%open%in_review%resolved%rejected%escalated%'),'states are constrained');
select ok(exists(select 1 from pg_constraint where conrelid='public.audit_exceptions'::regclass and pg_get_constraintdef(oid) like '%confirmed%corrected%justified%rejected%escalated%'),'resolution results are constrained');
select ok(exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='resolve_audit_exception' and prosecdef),'resolution command is security definer');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='audit_exceptions' and policyname='audit_exceptions_select'),'exception reads are permission-scoped');

select * from finish();
rollback;
