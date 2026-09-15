begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

select has_table('public'::name,'roles'::name);
select has_table('public'::name,'permissions'::name);
select has_table('public'::name,'memberships'::name);

insert into auth.users (
  id, instance_id, aud, role, email,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'operator@verdis.local',
  now(), now(), now(), '{}'::jsonb, '{}'::jsonb
);

insert into public.tenants (id, slug, name) values
  ('20000000-0000-0000-0000-000000000001', 'tenant-a', 'Tenant A'),
  ('20000000-0000-0000-0000-000000000002', 'tenant-b', 'Tenant B');

insert into public.organizations (id, tenant_id, legal_name, display_name) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Org A', 'Org A'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Org B', 'Org B');

insert into public.memberships (
  id, tenant_id, organization_id, user_id, role_id, status
)
select
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  r.id,
  'active'
from public.roles r where r.code = 'operator';

select ok(
  app_private.has_permission(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    null,
    'movement.read'
  ),
  'active operator receives movement.read in own organization'
);

select ok(
  not app_private.has_permission(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    null,
    'movement.read'
  ),
  'permission never crosses tenant boundary'
);

update public.memberships
set status = 'suspended'
where id = '40000000-0000-0000-0000-000000000001';

select ok(
  not app_private.has_permission(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    null,
    'movement.read'
  ),
  'suspended membership grants no permission'
);

select * from finish();
rollback;
