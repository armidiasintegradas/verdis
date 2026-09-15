create table public.permissions (
  code text primary key,
  description text not null
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  scope_kind text not null check (scope_kind in ('tenant','organization','unit')),
  built_in boolean not null default true
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role_id, permission_code)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  status public.membership_status not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index memberships_user_scope_idx on public.memberships (user_id, tenant_id, organization_id, unit_id);
create index memberships_scope_status_idx on public.memberships (tenant_id, organization_id, unit_id, status);

insert into public.permissions (code, description) values
  ('movement.create','Create operational movements'),
  ('movement.read','Read operational movements'),
  ('movement.correct','Correct movements through controlled flows'),
  ('evidence.upload','Upload evidence documents'),
  ('evidence.read','Read evidence documents'),
  ('evidence.validate','Validate evidence'),
  ('stock.read','Read stock projections'),
  ('sale.create','Create material sales'),
  ('audit.read','Read audit trail'),
  ('report.generate','Generate reports'),
  ('scope.manage','Manage organization scope');

insert into public.roles (code, name, scope_kind, built_in) values
  ('platform_admin','Platform administrator','tenant',true),
  ('verdis_analyst','Verdis analyst','organization',true),
  ('auditor','Auditor / validator','organization',true),
  ('cooperative_manager','Cooperative manager','organization',true),
  ('operator','Operator','organization',true),
  ('finance','Finance','organization',true),
  ('environmental_manager','Environmental manager','organization',true),
  ('executive_viewer','Executive viewer','organization',true),
  ('event_manager','Event manager','organization',true),
  ('field_operator','Field operator','unit',true),
  ('public_manager','Public manager','organization',true),
  ('inspector','Inspector','organization',true),
  ('contract_manager','Contract manager','organization',true);

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r cross join public.permissions p
where r.code = 'platform_admin';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values
  ('movement.create'),('movement.read'),('movement.correct'),
  ('evidence.upload'),('evidence.read'),('evidence.validate'),
  ('stock.read'),('sale.create'),('audit.read'),('report.generate'),('scope.manage')
) as x(permission_code)
where r.code = 'cooperative_manager';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values
  ('movement.create'),('movement.read'),('evidence.upload'),('evidence.read'),('stock.read'),('sale.create')
) as x(permission_code)
where r.code = 'operator';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values ('movement.read'),('stock.read'),('sale.create'),('report.generate')) as x(permission_code)
where r.code = 'finance';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values ('movement.read'),('evidence.read'),('evidence.validate'),('stock.read'),('audit.read'),('report.generate')) as x(permission_code)
where r.code in ('verdis_analyst','auditor');

insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values ('movement.create'),('movement.read'),('movement.correct'),('evidence.upload'),('evidence.read'),('evidence.validate'),('stock.read'),('report.generate'),('scope.manage')) as x(permission_code)
where r.code in ('environmental_manager','event_manager');

insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values ('movement.read'),('evidence.read'),('stock.read'),('report.generate')) as x(permission_code)
where r.code = 'executive_viewer';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values ('movement.create'),('movement.read'),('evidence.upload'),('evidence.read')) as x(permission_code)
where r.code = 'field_operator';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values ('movement.read'),('evidence.read'),('stock.read'),('audit.read'),('report.generate'),('scope.manage')) as x(permission_code)
where r.code = 'public_manager';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values ('movement.read'),('evidence.read'),('evidence.validate'),('audit.read'),('report.generate')) as x(permission_code)
where r.code = 'inspector';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values ('movement.read'),('evidence.read'),('report.generate'),('scope.manage')) as x(permission_code)
where r.code = 'contract_manager';

create or replace function app_private.ensure_membership_scope_consistency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  org_tenant uuid;
  unit_tenant uuid;
  unit_org uuid;
begin
  select tenant_id into org_tenant from public.organizations where id = new.organization_id;
  if org_tenant is null or org_tenant <> new.tenant_id then
    raise exception 'membership organization must belong to membership tenant';
  end if;

  if new.unit_id is not null then
    select tenant_id, organization_id into unit_tenant, unit_org from public.units where id = new.unit_id;
    if unit_tenant is null or unit_tenant <> new.tenant_id or unit_org <> new.organization_id then
      raise exception 'membership unit must belong to membership organization and tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger memberships_scope_consistency
before insert or update of tenant_id, organization_id, unit_id on public.memberships
for each row execute function app_private.ensure_membership_scope_consistency();

create or replace function app_private.has_active_membership(
  p_user_id uuid,
  p_tenant_id uuid,
  p_organization_id uuid default null,
  p_unit_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = p_user_id
      and m.tenant_id = p_tenant_id
      and m.status = 'active'
      and m.starts_at <= now()
      and (m.ends_at is null or m.ends_at > now())
      and (p_organization_id is null or m.organization_id = p_organization_id)
      and (p_unit_id is null or m.unit_id is null or m.unit_id = p_unit_id)
  );
$$;

create or replace function app_private.has_permission(
  p_user_id uuid,
  p_tenant_id uuid,
  p_organization_id uuid,
  p_unit_id uuid,
  p_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    where m.user_id = p_user_id
      and m.tenant_id = p_tenant_id
      and m.organization_id = p_organization_id
      and rp.permission_code = p_permission_code
      and m.status = 'active'
      and m.starts_at <= now()
      and (m.ends_at is null or m.ends_at > now())
      and (p_unit_id is null or m.unit_id is null or m.unit_id = p_unit_id)
  );
$$;

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.has_active_membership(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function app_private.has_permission(uuid,uuid,uuid,uuid,text) to authenticated;

alter table public.tenants enable row level security;
alter table public.organizations enable row level security;
alter table public.units enable row level security;
alter table public.user_profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;

create policy tenants_select_membership on public.tenants
for select to authenticated
using (app_private.has_active_membership(auth.uid(), id, null, null));

create policy organizations_select_membership on public.organizations
for select to authenticated
using (app_private.has_active_membership(auth.uid(), tenant_id, id, null));

create policy units_select_membership on public.units
for select to authenticated
using (app_private.has_active_membership(auth.uid(), tenant_id, organization_id, id));

create policy user_profiles_select_self on public.user_profiles
for select to authenticated
using (user_id = auth.uid());

create policy roles_select_authenticated on public.roles
for select to authenticated
using (auth.uid() is not null);

create policy permissions_select_authenticated on public.permissions
for select to authenticated
using (auth.uid() is not null);

create policy role_permissions_select_authenticated on public.role_permissions
for select to authenticated
using (auth.uid() is not null);

create policy memberships_select_scope on public.memberships
for select to authenticated
using (
  user_id = auth.uid()
  or app_private.has_permission(auth.uid(), tenant_id, organization_id, unit_id, 'scope.manage')
);
