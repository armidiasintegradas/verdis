begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

select has_table('public','tenants');
select has_table('public','organizations');
select has_table('public','units');
select has_table('public','user_profiles');
select col_is_pk('public','tenants','id');
select col_is_fk('public','organizations','tenant_id');
select col_is_fk('public','units','organization_id');
select col_is_fk('public','user_profiles','user_id');
select has_function('app_private','ensure_unit_tenant_matches_organization', array[]::text[]);

select * from finish();
rollback;
