begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

select has_table('public'::name,'tenants'::name);
select has_table('public'::name,'organizations'::name);
select has_table('public'::name,'units'::name);
select has_table('public'::name,'user_profiles'::name);
select col_is_pk('public'::name,'tenants'::name,'id'::name);
select col_is_fk('public'::name,'organizations'::name,'tenant_id'::name);
select col_is_fk('public'::name,'units'::name,'organization_id'::name);
select col_is_fk('public'::name,'user_profiles'::name,'user_id'::name);
select has_function('app_private'::name,'ensure_unit_tenant_matches_organization'::name,array[]::name[]);

select * from finish();
rollback;
