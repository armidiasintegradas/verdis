insert into auth.users (
  id, instance_id, aud, role, email,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000000',
    'authenticated','authenticated','empresa.demo@verdis.local',
    now(),now(),now(),'{}'::jsonb,'{}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000000',
    'authenticated','authenticated','cooperativa.demo@verdis.local',
    now(),now(),now(),'{}'::jsonb,'{}'::jsonb
  )
on conflict (id) do nothing;

insert into public.user_profiles (user_id, display_name) values
  ('00000000-0000-0000-0000-000000000101','Gestor Empresa Demo'),
  ('00000000-0000-0000-0000-000000000102','Gestor Cooperativa Demo')
on conflict (user_id) do nothing;

insert into public.tenants (id, slug, name) values
  ('00000000-0000-0000-0000-000000001000','verdis-demo','Verdis Demo')
on conflict (id) do nothing;

insert into public.organizations (id, tenant_id, legal_name, display_name, tax_id) values
  (
    '00000000-0000-0000-0000-000000002001',
    '00000000-0000-0000-0000-000000001000',
    'Empresa Demo LTDA','Empresa Demo','00000000000100'
  ),
  (
    '00000000-0000-0000-0000-000000002002',
    '00000000-0000-0000-0000-000000001000',
    'Cooperativa Demo','Cooperativa Demo','00000000000200'
  )
on conflict (id) do nothing;

insert into public.units (id, tenant_id, organization_id, name, code) values
  (
    '00000000-0000-0000-0000-000000003001',
    '00000000-0000-0000-0000-000000001000',
    '00000000-0000-0000-0000-000000002001',
    'Recife Unidade 01','REC-01'
  ),
  (
    '00000000-0000-0000-0000-000000003002',
    '00000000-0000-0000-0000-000000001000',
    '00000000-0000-0000-0000-000000002002',
    'Galpão Principal','GALPAO-01'
  )
on conflict (id) do nothing;

insert into public.materials (id, tenant_id, code, name, category, default_unit) values
  (
    '00000000-0000-0000-0000-000000004001',
    '00000000-0000-0000-0000-000000001000',
    'PAPELAO','Papelão','paper','kg'
  ),
  (
    '00000000-0000-0000-0000-000000004002',
    '00000000-0000-0000-0000-000000001000',
    'PET','PET','plastic','kg'
  )
on conflict (id) do nothing;

insert into public.counterparties (
  id, tenant_id, organization_id, linked_organization_id, external_name
) values
  (
    '00000000-0000-0000-0000-000000005001',
    '00000000-0000-0000-0000-000000001000',
    '00000000-0000-0000-0000-000000002001',
    '00000000-0000-0000-0000-000000002002',
    null
  ),
  (
    '00000000-0000-0000-0000-000000005002',
    '00000000-0000-0000-0000-000000001000',
    '00000000-0000-0000-0000-000000002002',
    '00000000-0000-0000-0000-000000002001',
    null
  )
on conflict (id) do nothing;

insert into public.memberships (
  id, tenant_id, organization_id, unit_id, user_id, role_id, status
)
select
  '00000000-0000-0000-0000-000000006001',
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000002001',
  '00000000-0000-0000-0000-000000003001',
  '00000000-0000-0000-0000-000000000101',
  r.id,
  'active'
from public.roles r
where r.code = 'environmental_manager'
on conflict (id) do nothing;

insert into public.memberships (
  id, tenant_id, organization_id, unit_id, user_id, role_id, status
)
select
  '00000000-0000-0000-0000-000000006002',
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000002002',
  '00000000-0000-0000-0000-000000003002',
  '00000000-0000-0000-0000-000000000102',
  r.id,
  'cooperative_manager'
from public.roles r
where false;

insert into public.memberships (
  id, tenant_id, organization_id, unit_id, user_id, role_id, status
)
select
  '00000000-0000-0000-0000-000000006002',
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000002002',
  '00000000-0000-0000-0000-000000003002',
  '00000000-0000-0000-0000-000000000102',
  r.id,
  'active'
from public.roles r
where r.code = 'cooperative_manager'
on conflict (id) do nothing;
