begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

select has_type('public'::name, 'tenant_status'::name);
select has_type('public'::name, 'membership_status'::name);
select has_type('public'::name, 'movement_type'::name);
select has_type('public'::name, 'movement_status'::name);
select has_type('public'::name, 'evidence_level'::name);
select has_type('public'::name, 'review_status'::name);

select * from finish();
rollback;
