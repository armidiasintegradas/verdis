begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

select has_type('public', 'tenant_status');
select has_type('public', 'membership_status');
select has_type('public', 'movement_type');
select has_type('public', 'movement_status');
select has_type('public', 'evidence_level');
select has_type('public', 'review_status');

select * from finish();
rollback;
